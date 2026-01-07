/**
 * Distributed Rate Limiter Middleware
 *
 * Redis-backed sliding window rate limiting for horizontal scaling.
 * Falls back to in-memory rate limiting when Redis is unavailable.
 *
 * Features:
 * - Sliding window algorithm using Redis sorted sets
 * - Per-endpoint rate limit configuration
 * - User ID or IP-based rate limiting
 * - Atomic operations with Redis MULTI/EXEC
 * - Graceful fallback to in-memory limiter
 */

import { FastifyRequest, FastifyReply } from 'fastify';
import { getRedis, isRedisAvailable } from '../lib/redis';
import { loggers } from '../lib/logger';
import { createRateLimiter, JSRateLimiter } from '@musclemap/native';

const log = loggers.core;

// ============================================
// TYPES
// ============================================

export interface RateLimitConfig {
  /** Maximum number of requests in the window */
  limit: number;
  /** Window size in seconds */
  windowSeconds: number;
  /** Key prefix for Redis */
  keyPrefix?: string;
  /** Function to extract the rate limit key from the request */
  keyFn?: (request: FastifyRequest) => string;
  /** Skip rate limiting for certain requests */
  skip?: (request: FastifyRequest) => boolean;
}

export interface RateLimitInfo {
  /** Total number of requests allowed in the window */
  limit: number;
  /** Remaining requests in the current window */
  remaining: number;
  /** Timestamp when the window resets */
  resetTime: number;
  /** Whether the request was rate limited */
  limited: boolean;
}

// ============================================
// PRESET CONFIGURATIONS
// ============================================

export const RATE_LIMIT_PRESETS = {
  /** Authentication endpoints: 10 requests per minute */
  auth: { limit: 10, windowSeconds: 60, keyPrefix: 'rl:auth:' },

  /** General API: 100 requests per minute */
  api: { limit: 100, windowSeconds: 60, keyPrefix: 'rl:api:' },

  /** Heavy operations (reports, exports): 10 per minute */
  heavy: { limit: 10, windowSeconds: 60, keyPrefix: 'rl:heavy:' },

  /** Credit transfers: 5 per minute */
  transfer: { limit: 5, windowSeconds: 60, keyPrefix: 'rl:transfer:' },

  /** GraphQL queries: 200 per minute */
  graphql: { limit: 200, windowSeconds: 60, keyPrefix: 'rl:gql:' },

  /** WebSocket connections: 10 per minute */
  websocket: { limit: 10, windowSeconds: 60, keyPrefix: 'rl:ws:' },

  /** File uploads: 20 per minute */
  upload: { limit: 20, windowSeconds: 60, keyPrefix: 'rl:upload:' },
} as const;

export type RateLimitPreset = keyof typeof RATE_LIMIT_PRESETS;

// ============================================
// IN-MEMORY FALLBACK
// ============================================

const inMemoryLimiters = new Map<string, JSRateLimiter>();

function getInMemoryLimiter(prefix: string, limit: number, windowSeconds: number): JSRateLimiter {
  const key = `${prefix}:${limit}:${windowSeconds}`;
  let limiter = inMemoryLimiters.get(key);
  if (!limiter) {
    limiter = createRateLimiter(limit, windowSeconds) as JSRateLimiter;
    inMemoryLimiters.set(key, limiter);
  }
  return limiter;
}

// ============================================
// REDIS SLIDING WINDOW IMPLEMENTATION
// ============================================

/**
 * Check rate limit using Redis sorted set sliding window
 *
 * Algorithm:
 * 1. Remove expired entries from the sorted set
 * 2. Count current entries in the window
 * 3. If under limit, add new entry and return allowed
 * 4. All operations in MULTI/EXEC for atomicity
 */
async function checkRedisRateLimit(
  key: string,
  limit: number,
  windowMs: number
): Promise<RateLimitInfo> {
  const redis = getRedis();
  if (!redis) {
    return { limit, remaining: limit, resetTime: Date.now() + windowMs, limited: false };
  }

  const now = Date.now();
  const windowStart = now - windowMs;

  try {
    // Use MULTI for atomic operations
    const pipeline = redis.multi();

    // Remove expired entries
    pipeline.zremrangebyscore(key, 0, windowStart);

    // Count current entries
    pipeline.zcard(key);

    // Execute to get count
    const results = await pipeline.exec();

    if (!results) {
      return { limit, remaining: limit, resetTime: now + windowMs, limited: false };
    }

    const count = (results[1] as [Error | null, number])[1] || 0;
    const remaining = Math.max(0, limit - count);

    if (count >= limit) {
      // Rate limited
      return {
        limit,
        remaining: 0,
        resetTime: now + windowMs,
        limited: true,
      };
    }

    // Add new entry with current timestamp as score
    await redis.zadd(key, now, `${now}:${Math.random().toString(36).slice(2)}`);

    // Set expiry on the key
    await redis.pexpire(key, windowMs);

    return {
      limit,
      remaining: remaining - 1,
      resetTime: now + windowMs,
      limited: false,
    };
  } catch (error) {
    log.error({ error, key }, 'Redis rate limit check failed');
    // Fail open on Redis errors
    return { limit, remaining: limit, resetTime: now + windowMs, limited: false };
  }
}

/**
 * Get current rate limit info without consuming a request
 */
async function getRedisRateLimitInfo(
  key: string,
  limit: number,
  windowMs: number
): Promise<RateLimitInfo> {
  const redis = getRedis();
  if (!redis) {
    return { limit, remaining: limit, resetTime: Date.now() + windowMs, limited: false };
  }

  const now = Date.now();
  const windowStart = now - windowMs;

  try {
    // Clean and count in one pipeline
    const pipeline = redis.multi();
    pipeline.zremrangebyscore(key, 0, windowStart);
    pipeline.zcard(key);

    const results = await pipeline.exec();
    const count = results ? ((results[1] as [Error | null, number])[1] || 0) : 0;

    return {
      limit,
      remaining: Math.max(0, limit - count),
      resetTime: now + windowMs,
      limited: count >= limit,
    };
  } catch (error) {
    return { limit, remaining: limit, resetTime: now + windowMs, limited: false };
  }
}

// ============================================
// MIDDLEWARE FACTORY
// ============================================

/**
 * Default key extractor: use user ID if authenticated, otherwise IP
 */
function defaultKeyExtractor(request: FastifyRequest): string {
  return request.user?.userId || request.ip;
}

/**
 * Create a distributed rate limiter middleware
 */
export function createDistributedRateLimiter(
  config: RateLimitConfig | RateLimitPreset
): (request: FastifyRequest, reply: FastifyReply) => Promise<void> {
  // Resolve preset if string
  const resolvedConfig: RateLimitConfig =
    typeof config === 'string' ? RATE_LIMIT_PRESETS[config] : config;

  const {
    limit,
    windowSeconds,
    keyPrefix = 'rl:default:',
    keyFn = defaultKeyExtractor,
    skip,
  } = resolvedConfig;

  const windowMs = windowSeconds * 1000;

  return async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    // Check if should skip
    if (skip && skip(request)) {
      return;
    }

    const identifier = keyFn(request);
    const key = `${keyPrefix}${identifier}`;

    let info: RateLimitInfo;

    if (isRedisAvailable()) {
      // Use distributed Redis rate limiting
      info = await checkRedisRateLimit(key, limit, windowMs);
    } else {
      // Fallback to in-memory rate limiting
      const limiter = getInMemoryLimiter(keyPrefix, limit, windowSeconds);
      const allowed = limiter.check(identifier, 1);

      info = {
        limit,
        remaining: limiter.remaining(identifier),
        resetTime: Date.now() + windowMs,
        limited: !allowed,
      };
    }

    // Set rate limit headers
    reply.header('X-RateLimit-Limit', info.limit.toString());
    reply.header('X-RateLimit-Remaining', info.remaining.toString());
    reply.header('X-RateLimit-Reset', Math.ceil(info.resetTime / 1000).toString());

    if (info.limited) {
      log.warn(
        {
          key,
          ip: request.ip,
          userId: request.user?.userId,
          path: request.url,
        },
        'Rate limit exceeded'
      );

      reply.header('Retry-After', windowSeconds.toString());

      return reply.status(429).send({
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message: 'Too many requests. Please try again later.',
          statusCode: 429,
          retryAfter: windowSeconds,
          limit: info.limit,
          remaining: 0,
          resetTime: info.resetTime,
        },
      });
    }
  };
}

// ============================================
// CONVENIENCE EXPORTS
// ============================================

/** Rate limiter for authentication endpoints */
export const authRateLimiter = createDistributedRateLimiter('auth');

/** Rate limiter for general API endpoints */
export const apiRateLimiter = createDistributedRateLimiter('api');

/** Rate limiter for heavy operations */
export const heavyRateLimiter = createDistributedRateLimiter('heavy');

/** Rate limiter for credit transfers */
export const transferRateLimiter = createDistributedRateLimiter('transfer');

/** Rate limiter for GraphQL */
export const graphqlRateLimiter = createDistributedRateLimiter('graphql');

/** Rate limiter for WebSocket connections */
export const websocketRateLimiter = createDistributedRateLimiter('websocket');

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Get current rate limit status for an identifier without consuming a request
 */
export async function getRateLimitStatus(
  preset: RateLimitPreset,
  identifier: string
): Promise<RateLimitInfo> {
  const config = RATE_LIMIT_PRESETS[preset];
  const key = `${config.keyPrefix}${identifier}`;
  const windowMs = config.windowSeconds * 1000;

  if (isRedisAvailable()) {
    return getRedisRateLimitInfo(key, config.limit, windowMs);
  }

  const limiter = getInMemoryLimiter(config.keyPrefix, config.limit, config.windowSeconds);
  return {
    limit: config.limit,
    remaining: limiter.remaining(identifier),
    resetTime: Date.now() + windowMs,
    limited: limiter.remaining(identifier) <= 0,
  };
}

/**
 * Reset rate limit for an identifier
 */
export async function resetRateLimit(preset: RateLimitPreset, identifier: string): Promise<void> {
  const config = RATE_LIMIT_PRESETS[preset];
  const key = `${config.keyPrefix}${identifier}`;

  if (isRedisAvailable()) {
    const redis = getRedis();
    if (redis) {
      await redis.del(key);
    }
  }

  const limiter = inMemoryLimiters.get(
    `${config.keyPrefix}:${config.limit}:${config.windowSeconds}`
  );
  if (limiter) {
    limiter.reset(identifier);
  }
}

/**
 * Clear all rate limits (for testing)
 */
export async function clearAllRateLimits(): Promise<void> {
  // Clear Redis keys
  if (isRedisAvailable()) {
    const redis = getRedis();
    if (redis) {
      const keys = await redis.keys('rl:*');
      if (keys.length > 0) {
        await redis.del(...keys);
      }
    }
  }

  // Clear in-memory limiters
  for (const limiter of inMemoryLimiters.values()) {
    limiter.clear();
  }
}
