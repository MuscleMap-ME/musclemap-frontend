/**
 * DragonflyDB State Backend
 *
 * High-performance Redis-compatible state backend using DragonflyDB.
 * DragonflyDB is 25x faster than Redis with 80% less memory usage.
 *
 * Uses the ioredis client (DragonflyDB is wire-compatible with Redis).
 */

import type { Lock, StateBackend, StateCapabilities } from '../types/index.js';

// Dynamic import for optional dependency
let Redis: typeof import('ioredis').default | undefined;

try {
  const ioredis = await import('ioredis');
  Redis = ioredis.default;
} catch {
  // ioredis not installed
}

export interface DragonflyConfig {
  url: string;
  prefix?: string;
  connect_timeout_ms?: number;
}

export class DragonflyBackend implements StateBackend {
  readonly name = 'dragonfly';
  readonly capabilities: StateCapabilities = {
    multiNode: true,
    persistent: true,
    distributedLocks: true,
    pubSub: true,
  };

  private client: InstanceType<typeof import('ioredis').default> | null = null;
  private subscriber: InstanceType<typeof import('ioredis').default> | null = null;
  private config: DragonflyConfig;
  private prefix: string;
  private subscriptions = new Map<string, Set<(message: string) => void>>();

  constructor(config: DragonflyConfig) {
    if (!Redis) {
      throw new Error('ioredis is required for DragonflyDB backend. Install with: npm i ioredis');
    }
    this.config = config;
    this.prefix = config.prefix ?? 'buildnet:';
  }

  private prefixKey(key: string): string {
    return `${this.prefix}${key}`;
  }

  async connect(): Promise<void> {
    if (!Redis) {
      throw new Error('ioredis not available');
    }

    const connectTimeout = this.config.connect_timeout_ms ?? 5000;

    this.client = new Redis(this.config.url, {
      connectTimeout,
      maxRetriesPerRequest: 3,
      retryStrategy: (times) => {
        if (times > 3) return null;
        return Math.min(times * 200, 2000);
      },
      lazyConnect: true,
    });

    // Create separate connection for pub/sub
    this.subscriber = new Redis(this.config.url, {
      connectTimeout,
      maxRetriesPerRequest: 3,
      lazyConnect: true,
    });

    // Connect with timeout
    await Promise.race([
      Promise.all([this.client.connect(), this.subscriber.connect()]),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('DragonflyDB connection timeout')), connectTimeout)
      ),
    ]);

    // Set up message handler for pub/sub
    this.subscriber.on('message', (channel: string, message: string) => {
      const handlers = this.subscriptions.get(channel);
      if (handlers) {
        for (const handler of handlers) {
          try {
            handler(message);
          } catch (error) {
            console.error(`[DragonflyBackend] Subscription handler error for ${channel}:`, error);
          }
        }
      }
    });
  }

  async disconnect(): Promise<void> {
    if (this.subscriber) {
      this.subscriber.disconnect();
      this.subscriber = null;
    }
    if (this.client) {
      this.client.disconnect();
      this.client = null;
    }
    this.subscriptions.clear();
  }

  isConnected(): boolean {
    return this.client?.status === 'ready';
  }

  async get(key: string): Promise<string | null> {
    if (!this.client) throw new Error('Not connected');
    return this.client.get(this.prefixKey(key));
  }

  async set(key: string, value: string, ttlMs?: number): Promise<void> {
    if (!this.client) throw new Error('Not connected');

    const prefixedKey = this.prefixKey(key);

    if (ttlMs !== undefined && ttlMs > 0) {
      await this.client.set(prefixedKey, value, 'PX', ttlMs);
    } else {
      await this.client.set(prefixedKey, value);
    }
  }

  async del(key: string): Promise<void> {
    if (!this.client) throw new Error('Not connected');
    await this.client.del(this.prefixKey(key));
  }

  async keys(pattern: string): Promise<string[]> {
    if (!this.client) throw new Error('Not connected');

    const prefixedPattern = this.prefixKey(pattern);
    const keys = await this.client.keys(prefixedPattern);

    // Remove prefix from returned keys
    return keys.map((k) => k.slice(this.prefix.length));
  }

  /**
   * Acquire a distributed lock using Redlock algorithm.
   * DragonflyDB supports the same SET NX PX pattern as Redis.
   */
  async acquireLock(resource: string, ttlMs: number): Promise<Lock | null> {
    if (!this.client) throw new Error('Not connected');

    const lockKey = this.prefixKey(`lock:${resource}`);
    const token = crypto.randomUUID();
    const expires = Date.now() + ttlMs;

    // Use SET with NX (only set if not exists) and PX (expiry in ms)
    const result = await this.client.set(lockKey, token, 'PX', ttlMs, 'NX');

    if (result === 'OK') {
      return { resource, token, expires };
    }

    return null;
  }

  async releaseLock(lock: Lock): Promise<void> {
    if (!this.client) throw new Error('Not connected');

    const lockKey = this.prefixKey(`lock:${lock.resource}`);

    // Use Lua script to atomically check token and delete
    const script = `
      if redis.call("get", KEYS[1]) == ARGV[1] then
        return redis.call("del", KEYS[1])
      else
        return 0
      end
    `;

    await this.client.eval(script, 1, lockKey, lock.token);
  }

  async extendLock(lock: Lock, ttlMs: number): Promise<boolean> {
    if (!this.client) throw new Error('Not connected');

    const lockKey = this.prefixKey(`lock:${lock.resource}`);

    // Use Lua script to atomically check token and extend TTL
    const script = `
      if redis.call("get", KEYS[1]) == ARGV[1] then
        return redis.call("pexpire", KEYS[1], ARGV[2])
      else
        return 0
      end
    `;

    const result = await this.client.eval(script, 1, lockKey, lock.token, ttlMs);
    return result === 1;
  }

  subscribe(channel: string, callback: (message: string) => void): void {
    if (!this.subscriber) throw new Error('Not connected');

    const prefixedChannel = this.prefixKey(`channel:${channel}`);

    let handlers = this.subscriptions.get(prefixedChannel);
    if (!handlers) {
      handlers = new Set();
      this.subscriptions.set(prefixedChannel, handlers);
      this.subscriber.subscribe(prefixedChannel).catch((error) => {
        console.error(`[DragonflyBackend] Failed to subscribe to ${channel}:`, error);
      });
    }

    handlers.add(callback);
  }

  async publish(channel: string, message: string): Promise<void> {
    if (!this.client) throw new Error('Not connected');

    const prefixedChannel = this.prefixKey(`channel:${channel}`);
    await this.client.publish(prefixedChannel, message);
  }

  // ============================================================================
  // DragonflyDB-specific features
  // ============================================================================

  /**
   * Get DragonflyDB server info including memory usage and performance stats.
   */
  async getServerInfo(): Promise<Record<string, string>> {
    if (!this.client) throw new Error('Not connected');

    const info = await this.client.info();
    const result: Record<string, string> = {};

    for (const line of info.split('\n')) {
      const [key, value] = line.split(':');
      if (key && value) {
        result[key.trim()] = value.trim();
      }
    }

    return result;
  }

  /**
   * Get memory stats from DragonflyDB.
   */
  async getMemoryStats(): Promise<{
    used_memory: number;
    used_memory_peak: number;
    used_memory_human: string;
  }> {
    const info = await this.getServerInfo();
    return {
      used_memory: Number.parseInt(info.used_memory ?? '0', 10),
      used_memory_peak: Number.parseInt(info.used_memory_peak ?? '0', 10),
      used_memory_human: info.used_memory_human ?? '0B',
    };
  }

  /**
   * Batch get multiple keys at once (MGET).
   */
  async mget(keys: string[]): Promise<(string | null)[]> {
    if (!this.client) throw new Error('Not connected');

    const prefixedKeys = keys.map((k) => this.prefixKey(k));
    return this.client.mget(...prefixedKeys);
  }

  /**
   * Batch set multiple keys at once (MSET).
   */
  async mset(entries: Record<string, string>): Promise<void> {
    if (!this.client) throw new Error('Not connected');

    const prefixedEntries: string[] = [];
    for (const [key, value] of Object.entries(entries)) {
      prefixedEntries.push(this.prefixKey(key), value);
    }

    await this.client.mset(prefixedEntries);
  }

  /**
   * Increment a counter atomically.
   */
  async incr(key: string): Promise<number> {
    if (!this.client) throw new Error('Not connected');
    return this.client.incr(this.prefixKey(key));
  }

  /**
   * Add to a sorted set (useful for leaderboards, queues).
   */
  async zadd(key: string, score: number, member: string): Promise<number> {
    if (!this.client) throw new Error('Not connected');
    return this.client.zadd(this.prefixKey(key), score, member);
  }

  /**
   * Get range from sorted set.
   */
  async zrange(key: string, start: number, stop: number): Promise<string[]> {
    if (!this.client) throw new Error('Not connected');
    return this.client.zrange(this.prefixKey(key), start, stop);
  }

  /**
   * Hash operations (useful for storing structured data).
   */
  async hset(key: string, field: string, value: string): Promise<number> {
    if (!this.client) throw new Error('Not connected');
    return this.client.hset(this.prefixKey(key), field, value);
  }

  async hget(key: string, field: string): Promise<string | null> {
    if (!this.client) throw new Error('Not connected');
    return this.client.hget(this.prefixKey(key), field);
  }

  async hgetall(key: string): Promise<Record<string, string>> {
    if (!this.client) throw new Error('Not connected');
    return this.client.hgetall(this.prefixKey(key));
  }
}
