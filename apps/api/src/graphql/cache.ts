/**
 * GraphQL Response Cache
 *
 * Redis-backed caching for GraphQL queries with:
 * - Per-type TTL configuration
 * - Automatic cache invalidation
 * - Cache key generation from queries
 * - Bypass for mutations and subscriptions
 */

import type { Redis, Cluster } from 'ioredis';
import { getRedisClient, isRedisHealthy } from '../lib/redis-cluster';
import { loggers } from '../lib/logger';

const log = loggers.core;

// ============================================
// TYPES
// ============================================

export interface CacheConfig {
  /**
   * Enable/disable caching.
   */
  enabled: boolean;

  /**
   * Default TTL in seconds.
   */
  defaultTtl: number;

  /**
   * Per-type TTL overrides in seconds.
   */
  typeTtl: Record<string, number>;

  /**
   * Types that should never be cached.
   */
  neverCache: string[];

  /**
   * Max cache size per entry in bytes.
   */
  maxEntrySize: number;
}

export interface CacheEntry {
  data: unknown;
  cachedAt: number;
  ttl: number;
  hash: string;
}

export interface CacheStats {
  hits: number;
  misses: number;
  size: number;
  evictions: number;
}

// ============================================
// DEFAULT CONFIG
// ============================================

const DEFAULT_CONFIG: CacheConfig = {
  enabled: true,
  defaultTtl: 120, // 2 minutes (was 1 minute)
  typeTtl: {
    // Static/reference data - cache aggressively
    Exercise: 900,       // 15 minutes (was 5)
    Muscle: 900,         // 15 minutes (was 5)
    Archetype: 1800,     // 30 minutes (was 10)
    PricingTier: 3600,   // 1 hour (unchanged)
    Achievement: 600,    // 10 minutes (new)
    Skill: 600,          // 10 minutes (new)
    Equipment: 900,      // 15 minutes (new)

    // Semi-dynamic data - moderate caching
    Leaderboard: 120,    // 2 minutes (was 1)
    User: 60,            // 1 minute (was 30s)
    Workout: 120,        // 2 minutes (was 1)
    WorkoutPrescription: 300, // 5 minutes (new)
    Community: 180,      // 3 minutes (new)
    Feed: 60,            // 1 minute (new)

    // Dynamic data - short cache but not zero
    CreditBalance: 15,   // 15 seconds (was 10)
    Presence: 10,        // 10 seconds (was 5)
    Stats: 60,           // 1 minute (new)
  },
  neverCache: [
    'Mutation',
    'Subscription',
    'CreditTransaction', // Financial data should be fresh
    'Message',           // Real-time messages
  ],
  maxEntrySize: 1024 * 100, // 100KB
};

// ============================================
// CACHE MANAGER
// ============================================

class GraphQLCacheManager {
  private config: CacheConfig;
  private stats: CacheStats = { hits: 0, misses: 0, size: 0, evictions: 0 };
  private keyPrefix = 'gql:cache:';

  constructor(config?: Partial<CacheConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Generate a cache key from operation details.
   */
  generateKey(
    operationName: string | undefined,
    query: string,
    variables: Record<string, unknown> | undefined,
    userId?: string
  ): string {
    // Create a deterministic hash of the query + variables
    const content = JSON.stringify({
      op: operationName,
      q: this.normalizeQuery(query),
      v: variables || {},
      u: userId, // Include user for personalized data
    });

    // Simple hash function
    const hash = this.hashString(content);
    return `${this.keyPrefix}${hash}`;
  }

  /**
   * Normalize query by removing whitespace and comments.
   */
  private normalizeQuery(query: string): string {
    return query
      .replace(/#.*/g, '') // Remove comments
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim();
  }

  /**
   * Simple string hash (FNV-1a).
   */
  private hashString(str: string): string {
    let hash = 2166136261;
    for (let i = 0; i < str.length; i++) {
      hash ^= str.charCodeAt(i);
      hash = (hash * 16777619) >>> 0;
    }
    return hash.toString(36);
  }

  /**
   * Get a cached response.
   */
  async get(key: string): Promise<unknown | null> {
    if (!this.config.enabled || !isRedisHealthy()) {
      return null;
    }

    try {
      const redis = getRedisClient();
      const data = await redis.get(key);

      if (!data) {
        this.stats.misses++;
        return null;
      }

      const entry: CacheEntry = JSON.parse(data);

      // Check if entry has expired (shouldn't happen with Redis TTL, but just in case)
      if (Date.now() - entry.cachedAt > entry.ttl * 1000) {
        this.stats.misses++;
        await redis.del(key);
        return null;
      }

      this.stats.hits++;
      return entry.data;
    } catch (error) {
      log.warn({ error, key }, 'Cache get failed');
      this.stats.misses++;
      return null;
    }
  }

  /**
   * Cache a response.
   */
  async set(
    key: string,
    data: unknown,
    typeName?: string
  ): Promise<void> {
    if (!this.config.enabled || !isRedisHealthy()) {
      return;
    }

    // Check if type should never be cached
    if (typeName && this.config.neverCache.includes(typeName)) {
      return;
    }

    try {
      const serialized = JSON.stringify(data);

      // Check size limit
      if (serialized.length > this.config.maxEntrySize) {
        log.debug({ key, size: serialized.length }, 'Cache entry too large, skipping');
        return;
      }

      const ttl = typeName ? (this.config.typeTtl[typeName] ?? this.config.defaultTtl) : this.config.defaultTtl;

      const entry: CacheEntry = {
        data,
        cachedAt: Date.now(),
        ttl,
        hash: this.hashString(serialized),
      };

      const redis = getRedisClient();
      await redis.setex(key, ttl, JSON.stringify(entry));

      this.stats.size++;
    } catch (error) {
      log.warn({ error, key }, 'Cache set failed');
    }
  }

  /**
   * Invalidate cache entries by pattern.
   */
  async invalidate(pattern: string): Promise<number> {
    if (!isRedisHealthy()) {
      return 0;
    }

    try {
      const redis = getRedisClient();
      const keys = await this.scanKeys(redis, `${this.keyPrefix}${pattern}*`);

      if (keys.length === 0) {
        return 0;
      }

      const pipeline = redis.pipeline();
      keys.forEach((key) => pipeline.del(key));
      await pipeline.exec();

      this.stats.evictions += keys.length;
      this.stats.size = Math.max(0, this.stats.size - keys.length);

      log.debug({ pattern, count: keys.length }, 'Cache invalidated');
      return keys.length;
    } catch (error) {
      log.warn({ error, pattern }, 'Cache invalidation failed');
      return 0;
    }
  }

  /**
   * Scan for keys matching a pattern.
   */
  private async scanKeys(redis: Redis | Cluster, pattern: string): Promise<string[]> {
    const keys: string[] = [];
    let cursor = '0';

    do {
      const [nextCursor, foundKeys] = await redis.scan(cursor, 'MATCH', pattern, 'COUNT', 100);
      cursor = nextCursor;
      keys.push(...foundKeys);
    } while (cursor !== '0');

    return keys;
  }

  /**
   * Clear all cache entries.
   */
  async clear(): Promise<void> {
    await this.invalidate('');
    this.stats = { hits: 0, misses: 0, size: 0, evictions: 0 };
  }

  /**
   * Get cache statistics.
   */
  getStats(): CacheStats & { hitRate: number } {
    const total = this.stats.hits + this.stats.misses;
    const hitRate = total > 0 ? this.stats.hits / total : 0;
    return { ...this.stats, hitRate };
  }

  /**
   * Update configuration.
   */
  updateConfig(config: Partial<CacheConfig>): void {
    this.config = { ...this.config, ...config };
  }
}

// ============================================
// CACHE INVALIDATION HELPERS
// ============================================

/**
 * Invalidation topics for common operations.
 */
export const CacheInvalidation = {
  /**
   * Invalidate user-related caches.
   */
  async onUserUpdate(userId: string): Promise<void> {
    await cacheManager.invalidate(`*u:${userId}*`);
  },

  /**
   * Invalidate workout-related caches.
   */
  async onWorkoutCreated(userId: string): Promise<void> {
    await Promise.all([
      cacheManager.invalidate(`*u:${userId}*`),
      cacheManager.invalidate('*Leaderboard*'),
    ]);
  },

  /**
   * Invalidate credit-related caches.
   */
  async onCreditsChanged(userId: string): Promise<void> {
    await cacheManager.invalidate(`*u:${userId}*CreditBalance*`);
  },

  /**
   * Invalidate exercise catalog cache.
   */
  async onExercisesUpdated(): Promise<void> {
    await cacheManager.invalidate('*Exercise*');
  },
};

// ============================================
// SINGLETON INSTANCE
// ============================================

export const cacheManager = new GraphQLCacheManager();

/**
 * Get cache manager instance.
 */
export function getGraphQLCache(): GraphQLCacheManager {
  return cacheManager;
}
