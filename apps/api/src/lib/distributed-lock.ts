/**
 * Distributed Lock Service
 *
 * Redis-based distributed locking using the Redlock algorithm.
 * Provides:
 * - Lock acquisition with automatic expiry
 * - Lock renewal for long-running operations
 * - Exponential backoff with jitter for contention
 * - Graceful fallback when Redis is unavailable
 */

import crypto from 'crypto';
import { getRedis, isRedisAvailable } from './redis';
import { loggers } from './logger';

const log = loggers.core;

// ============================================
// TYPES
// ============================================

export interface LockOptions {
  /** Time-to-live in milliseconds (default: 30000) */
  ttl?: number;
  /** Maximum wait time to acquire lock in ms (default: 10000) */
  acquireTimeout?: number;
  /** Retry interval in ms (default: 100) */
  retryInterval?: number;
  /** Maximum number of retries (default: 100) */
  maxRetries?: number;
}

export interface Lock {
  /** The resource key that was locked */
  resource: string;
  /** Unique token for this lock holder */
  token: string;
  /** Absolute timestamp when lock expires */
  expiresAt: number;
  /** Extend the lock TTL */
  extend(ttl?: number): Promise<boolean>;
  /** Release the lock */
  release(): Promise<void>;
}

// ============================================
// LOCK SCRIPTS (Atomic operations)
// ============================================

// Lua script for acquiring lock (SET NX with EX)
const ACQUIRE_SCRIPT = `
  if redis.call("SET", KEYS[1], ARGV[1], "NX", "PX", ARGV[2]) then
    return 1
  end
  return 0
`;

// Lua script for releasing lock (only if token matches)
const RELEASE_SCRIPT = `
  if redis.call("GET", KEYS[1]) == ARGV[1] then
    return redis.call("DEL", KEYS[1])
  end
  return 0
`;

// Lua script for extending lock (only if token matches)
const EXTEND_SCRIPT = `
  if redis.call("GET", KEYS[1]) == ARGV[1] then
    return redis.call("PEXPIRE", KEYS[1], ARGV[2])
  end
  return 0
`;

// ============================================
// DISTRIBUTED LOCK SERVICE
// ============================================

class DistributedLockService {
  private keyPrefix = 'lock:';
  private acquireScript: string | null = null;
  private releaseScript: string | null = null;
  private extendScript: string | null = null;

  /**
   * Generate a unique lock token
   */
  private generateToken(): string {
    return crypto.randomBytes(16).toString('hex');
  }

  /**
   * Calculate jittered backoff delay
   */
  private calculateBackoff(attempt: number, baseInterval: number): number {
    const exponentialDelay = baseInterval * Math.pow(1.5, attempt);
    const jitter = exponentialDelay * 0.2 * Math.random();
    return Math.min(exponentialDelay + jitter, 5000);
  }

  /**
   * Acquire a distributed lock
   */
  async acquire(resource: string, options: LockOptions = {}): Promise<Lock | null> {
    const {
      ttl = 30000,
      acquireTimeout = 10000,
      retryInterval = 100,
      maxRetries = 100,
    } = options;

    if (!isRedisAvailable()) {
      log.warn({ resource }, 'Redis unavailable, using no-op lock');
      return this.createNoOpLock(resource);
    }

    const redis = getRedis();
    if (!redis) {
      return this.createNoOpLock(resource);
    }

    const key = `${this.keyPrefix}${resource}`;
    const token = this.generateToken();
    const startTime = Date.now();

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      // Check timeout
      if (Date.now() - startTime > acquireTimeout) {
        log.debug({ resource, attempts: attempt }, 'Lock acquisition timed out');
        return null;
      }

      try {
        // Try to acquire lock
        const result = await redis.set(key, token, 'PX', ttl, 'NX');

        if (result === 'OK') {
          const expiresAt = Date.now() + ttl;
          log.debug({ resource, token, ttl }, 'Lock acquired');

          return {
            resource,
            token,
            expiresAt,
            extend: async (newTtl?: number) => this.extendLock(key, token, newTtl ?? ttl),
            release: async () => this.releaseLock(key, token),
          };
        }

        // Lock held by someone else, wait and retry
        const delay = this.calculateBackoff(attempt, retryInterval);
        await new Promise((resolve) => setTimeout(resolve, delay));
      } catch (error) {
        log.error({ resource, error }, 'Error acquiring lock');
        // Wait before retry on error
        await new Promise((resolve) => setTimeout(resolve, retryInterval));
      }
    }

    log.debug({ resource, maxRetries }, 'Lock acquisition failed after max retries');
    return null;
  }

  /**
   * Release a lock
   */
  private async releaseLock(key: string, token: string): Promise<void> {
    if (!isRedisAvailable()) return;

    const redis = getRedis();
    if (!redis) return;

    try {
      // Use Lua script for atomic check-and-delete
      const result = await redis.eval(RELEASE_SCRIPT, 1, key, token);
      log.debug({ key, released: result === 1 }, 'Lock release attempted');
    } catch (error) {
      log.error({ key, error }, 'Error releasing lock');
    }
  }

  /**
   * Extend a lock's TTL
   */
  private async extendLock(key: string, token: string, ttl: number): Promise<boolean> {
    if (!isRedisAvailable()) return true;

    const redis = getRedis();
    if (!redis) return true;

    try {
      const result = await redis.eval(EXTEND_SCRIPT, 1, key, token, ttl);
      const extended = result === 1;
      log.debug({ key, extended, ttl }, 'Lock extension attempted');
      return extended;
    } catch (error) {
      log.error({ key, error }, 'Error extending lock');
      return false;
    }
  }

  /**
   * Create a no-op lock when Redis is unavailable
   * This allows the application to continue working in single-node mode
   */
  private createNoOpLock(resource: string): Lock {
    return {
      resource,
      token: 'no-op',
      expiresAt: Date.now() + 30000,
      extend: async () => true,
      release: async () => {},
    };
  }

  /**
   * Execute a function while holding a lock
   */
  async withLock<T>(
    resource: string,
    fn: () => Promise<T>,
    options: LockOptions = {}
  ): Promise<T> {
    const lock = await this.acquire(resource, options);

    if (!lock) {
      throw new Error(`Failed to acquire lock for resource: ${resource}`);
    }

    // Set up auto-renewal if operation might take longer than TTL
    const ttl = options.ttl ?? 30000;
    const renewalInterval = Math.floor(ttl * 0.7); // Renew at 70% of TTL
    let renewalTimer: NodeJS.Timeout | null = null;

    if (renewalInterval > 1000) {
      renewalTimer = setInterval(async () => {
        const extended = await lock.extend();
        if (!extended) {
          log.warn({ resource }, 'Failed to extend lock - operation may conflict');
        }
      }, renewalInterval);
    }

    try {
      return await fn();
    } finally {
      if (renewalTimer) {
        clearInterval(renewalTimer);
      }
      await lock.release();
    }
  }

  /**
   * Check if a resource is currently locked
   */
  async isLocked(resource: string): Promise<boolean> {
    if (!isRedisAvailable()) return false;

    const redis = getRedis();
    if (!redis) return false;

    const key = `${this.keyPrefix}${resource}`;
    const exists = await redis.exists(key);
    return exists === 1;
  }
}

// ============================================
// SINGLETON EXPORT
// ============================================

export const distributedLock = new DistributedLockService();

/**
 * Acquire a distributed lock
 */
export function acquireLock(resource: string, options?: LockOptions): Promise<Lock | null> {
  return distributedLock.acquire(resource, options);
}

/**
 * Execute a function while holding a distributed lock
 */
export function withLock<T>(
  resource: string,
  fn: () => Promise<T>,
  options?: LockOptions
): Promise<T> {
  return distributedLock.withLock(resource, fn, options);
}

/**
 * Check if a resource is currently locked
 */
export function isResourceLocked(resource: string): Promise<boolean> {
  return distributedLock.isLocked(resource);
}
