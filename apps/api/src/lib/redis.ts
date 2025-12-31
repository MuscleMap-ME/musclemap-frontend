/**
 * Redis Client
 *
 * Provides Redis connectivity for:
 * - Pub/Sub for realtime fanout
 * - Presence tracking with TTL keys
 * - "Now" stats aggregation
 */

import Redis from 'ioredis';
import { config } from '../config';
import { loggers } from './logger';

const log = loggers.core;

// Singleton Redis instances
let redis: Redis | null = null;
let subscriber: Redis | null = null;
let publisher: Redis | null = null;

// Track connection state
let isConnected = false;

/**
 * Get or create the main Redis client
 */
export function getRedis(): Redis | null {
  if (!config.REDIS_ENABLED) {
    return null;
  }

  if (!redis) {
    redis = createRedisClient('main');
  }

  return redis;
}

/**
 * Get or create the subscriber client (dedicated for Pub/Sub)
 */
export function getSubscriber(): Redis | null {
  if (!config.REDIS_ENABLED) {
    return null;
  }

  if (!subscriber) {
    subscriber = createRedisClient('subscriber');
  }

  return subscriber;
}

/**
 * Get or create the publisher client
 */
export function getPublisher(): Redis | null {
  if (!config.REDIS_ENABLED) {
    return null;
  }

  if (!publisher) {
    publisher = createRedisClient('publisher');
  }

  return publisher;
}

/**
 * Create a new Redis client with standard options
 */
function createRedisClient(name: string): Redis {
  const client = new Redis(config.REDIS_URL, {
    maxRetriesPerRequest: 3,
    retryStrategy(times) {
      const delay = Math.min(times * 50, 2000);
      return delay;
    },
    enableReadyCheck: true,
    lazyConnect: false,
  });

  client.on('connect', () => {
    log.info({ client: name }, 'Redis client connecting');
  });

  client.on('ready', () => {
    isConnected = true;
    log.info({ client: name }, 'Redis client ready');
  });

  client.on('error', (err) => {
    log.error({ client: name, error: err.message }, 'Redis client error');
  });

  client.on('close', () => {
    isConnected = false;
    log.info({ client: name }, 'Redis client closed');
  });

  return client;
}

/**
 * Check if Redis is available
 */
export function isRedisAvailable(): boolean {
  return config.REDIS_ENABLED && isConnected;
}

/**
 * Redis key prefixes for consistency
 */
export const REDIS_KEYS = {
  // Presence tracking
  PRESENCE_ZSET: 'presence:zset',
  PRESENCE_META: (userId: string) => `presence:meta:${userId}`,

  // Pub/Sub channels
  CHANNEL_COMMUNITY: 'rt:community',
  CHANNEL_MONITOR: 'rt:monitor',

  // "Now" stats buckets (minute-granularity)
  NOW_EXERCISE: (minuteKey: string) => `now:exercise:selected:${minuteKey}`,
  NOW_STAGE: (minuteKey: string) => `now:stage:entered:${minuteKey}`,

  // Bucket counters
  PRESENCE_BUCKET: (geoBucket: string) => `presence:bucket:${geoBucket}`,
} as const;

/**
 * Get current minute key for time-bucketed stats
 */
export function getMinuteKey(date: Date = new Date()): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  const hour = String(date.getUTCHours()).padStart(2, '0');
  const minute = String(date.getUTCMinutes()).padStart(2, '0');
  return `${year}${month}${day}${hour}${minute}`;
}

/**
 * Get minute keys for the last N minutes (for aggregation)
 */
export function getLastNMinuteKeys(n: number, from: Date = new Date()): string[] {
  const keys: string[] = [];
  for (let i = 0; i < n; i++) {
    const d = new Date(from.getTime() - i * 60 * 1000);
    keys.push(getMinuteKey(d));
  }
  return keys;
}

/**
 * TTL values in seconds
 */
export const TTL = {
  PRESENCE: 120, // 2 minutes for presence
  NOW_BUCKET: 1800, // 30 minutes for "now" stats buckets
} as const;

/**
 * Gracefully close all Redis connections
 */
export async function closeRedis(): Promise<void> {
  const clients = [redis, subscriber, publisher].filter(Boolean) as Redis[];

  await Promise.all(
    clients.map((client) =>
      client.quit().catch((err) => {
        log.error({ error: err.message }, 'Error closing Redis client');
      })
    )
  );

  redis = null;
  subscriber = null;
  publisher = null;
  isConnected = false;

  log.info('All Redis connections closed');
}
