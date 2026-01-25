/**
 * Prescription Engine v3.0 - Caching Layer
 *
 * Multi-layer caching for prescription data:
 * - Memory cache (LRU) for hot paths
 * - Redis cache for persistence
 * - Cache invalidation on relevant events
 */

import { getRedis } from '../../lib/redis';
import type {
  UserContextV3,
  ExerciseMetadataV3,
  UserExercisePerformance,
  AdaptiveUserWeights,
  CachedUserContext,
  CachedExerciseMetadata,
} from './types';
import { loggers } from '../../lib/logger';

const log = loggers.prescription || loggers.api;

// ============================================
// LRU MEMORY CACHE
// ============================================

class LRUCache<K, V> {
  private cache = new Map<K, { value: V; expiry: number }>();
  private readonly maxSize: number;

  constructor(maxSize: number = 100) {
    this.maxSize = maxSize;
  }

  get(key: K): V | undefined {
    const entry = this.cache.get(key);
    if (!entry) return undefined;

    // Check expiry
    if (entry.expiry < Date.now()) {
      this.cache.delete(key);
      return undefined;
    }

    // Move to end (most recently used)
    this.cache.delete(key);
    this.cache.set(key, entry);

    return entry.value;
  }

  set(key: K, value: V, ttlMs: number): void {
    // Evict oldest if at capacity
    if (this.cache.size >= this.maxSize) {
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey !== undefined) {
        this.cache.delete(oldestKey);
      }
    }

    this.cache.set(key, {
      value,
      expiry: Date.now() + ttlMs,
    });
  }

  delete(key: K): boolean {
    return this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  size(): number {
    return this.cache.size;
  }
}

// ============================================
// CACHE CONFIGURATION
// ============================================

interface CacheConfig {
  ttlSeconds: number;
  memoryTtlMs: number;
  invalidateOn: string[];
}

const CACHE_CONFIG: Record<string, CacheConfig> = {
  userContext: {
    ttlSeconds: 86400, // 24 hours
    memoryTtlMs: 3600000, // 1 hour in memory
    invalidateOn: ['profile_update', 'injury_update', 'limitation_update', 'biomechanics_update'],
  },
  exerciseMetadata: {
    ttlSeconds: 604800, // 7 days
    memoryTtlMs: 86400000, // 24 hours in memory
    invalidateOn: ['exercise_update', 'admin_exercise_edit'],
  },
  userPerformance: {
    ttlSeconds: 3600, // 1 hour
    memoryTtlMs: 600000, // 10 minutes in memory
    invalidateOn: ['workout_complete', 'set_logged'],
  },
  muscleStats: {
    ttlSeconds: 3600, // 1 hour
    memoryTtlMs: 600000, // 10 minutes
    invalidateOn: ['workout_complete'],
  },
  userWeights: {
    ttlSeconds: 86400, // 24 hours
    memoryTtlMs: 3600000, // 1 hour
    invalidateOn: ['feedback_submitted', 'weight_update'],
  },
  recoveryScore: {
    ttlSeconds: 21600, // 6 hours
    memoryTtlMs: 1800000, // 30 minutes
    invalidateOn: ['sleep_logged', 'workout_complete'],
  },
};

// ============================================
// PRESCRIPTION CACHE
// ============================================

export class PrescriptionCache {
  private memoryCache: {
    userContext: LRUCache<string, UserContextV3>;
    exerciseMetadata: LRUCache<string, ExerciseMetadataV3[]>;
    userPerformance: LRUCache<string, Map<string, UserExercisePerformance>>;
    muscleStats: LRUCache<string, Record<string, number>>;
    userWeights: LRUCache<string, AdaptiveUserWeights>;
  };

  private cacheHits = 0;
  private cacheMisses = 0;

  constructor() {
    this.memoryCache = {
      userContext: new LRUCache(500),
      exerciseMetadata: new LRUCache(10), // Only a few exercise sets
      userPerformance: new LRUCache(500),
      muscleStats: new LRUCache(500),
      userWeights: new LRUCache(500),
    };
  }

  // ============================================
  // USER CONTEXT
  // ============================================

  async getUserContext(userId: string): Promise<UserContextV3 | null> {
    const cacheKey = `prescription:user_context:${userId}`;

    // Check memory cache
    const memCached = this.memoryCache.userContext.get(userId);
    if (memCached) {
      this.cacheHits++;
      return memCached;
    }

    // Check Redis
    try {
      const redis = getRedis();
      if (redis) {
        const cached = await redis.get(cacheKey);
        if (cached) {
          const parsed = JSON.parse(cached);
          this.memoryCache.userContext.set(
            userId,
            parsed,
            CACHE_CONFIG.userContext.memoryTtlMs
          );
          this.cacheHits++;
          return parsed;
        }
      }
    } catch (err) {
      log.warn({ err }, 'Redis cache read failed for user context');
    }

    this.cacheMisses++;
    return null;
  }

  async setUserContext(userId: string, context: UserContextV3): Promise<void> {
    const cacheKey = `prescription:user_context:${userId}`;

    // Set in memory
    this.memoryCache.userContext.set(
      userId,
      context,
      CACHE_CONFIG.userContext.memoryTtlMs
    );

    // Set in Redis
    try {
      const redis = getRedis();
      if (redis) {
        await redis.setex(
          cacheKey,
          CACHE_CONFIG.userContext.ttlSeconds,
          JSON.stringify(context)
        );
      }
    } catch (err) {
      log.warn({ err }, 'Redis cache write failed for user context');
    }
  }

  // ============================================
  // EXERCISE METADATA
  // ============================================

  async getExerciseMetadata(): Promise<ExerciseMetadataV3[] | null> {
    const cacheKey = 'prescription:exercise_metadata:all';

    // Check memory cache
    const memCached = this.memoryCache.exerciseMetadata.get('all');
    if (memCached) {
      this.cacheHits++;
      return memCached;
    }

    // Check Redis
    try {
      const redis = getRedis();
      if (redis) {
        const cached = await redis.get(cacheKey);
        if (cached) {
          const parsed = JSON.parse(cached);
          this.memoryCache.exerciseMetadata.set(
            'all',
            parsed,
            CACHE_CONFIG.exerciseMetadata.memoryTtlMs
          );
          this.cacheHits++;
          return parsed;
        }
      }
    } catch (err) {
      log.warn({ err }, 'Redis cache read failed for exercise metadata');
    }

    this.cacheMisses++;
    return null;
  }

  async setExerciseMetadata(exercises: ExerciseMetadataV3[]): Promise<void> {
    const cacheKey = 'prescription:exercise_metadata:all';

    // Set in memory
    this.memoryCache.exerciseMetadata.set(
      'all',
      exercises,
      CACHE_CONFIG.exerciseMetadata.memoryTtlMs
    );

    // Set in Redis
    try {
      const redis = getRedis();
      if (redis) {
        await redis.setex(
          cacheKey,
          CACHE_CONFIG.exerciseMetadata.ttlSeconds,
          JSON.stringify(exercises)
        );
      }
    } catch (err) {
      log.warn({ err }, 'Redis cache write failed for exercise metadata');
    }
  }

  // ============================================
  // USER PERFORMANCE
  // ============================================

  async getUserPerformance(userId: string): Promise<Map<string, UserExercisePerformance> | null> {
    const cacheKey = `prescription:user_performance:${userId}`;

    // Check memory cache
    const memCached = this.memoryCache.userPerformance.get(userId);
    if (memCached) {
      this.cacheHits++;
      return memCached;
    }

    // Check Redis
    try {
      const redis = getRedis();
      if (redis) {
        const cached = await redis.get(cacheKey);
        if (cached) {
          const parsed: [string, UserExercisePerformance][] = JSON.parse(cached);
          const map = new Map(parsed);
          this.memoryCache.userPerformance.set(
            userId,
            map,
            CACHE_CONFIG.userPerformance.memoryTtlMs
          );
          this.cacheHits++;
          return map;
        }
      }
    } catch (err) {
      log.warn({ err }, 'Redis cache read failed for user performance');
    }

    this.cacheMisses++;
    return null;
  }

  async setUserPerformance(
    userId: string,
    performance: Map<string, UserExercisePerformance>
  ): Promise<void> {
    const cacheKey = `prescription:user_performance:${userId}`;

    // Set in memory
    this.memoryCache.userPerformance.set(
      userId,
      performance,
      CACHE_CONFIG.userPerformance.memoryTtlMs
    );

    // Set in Redis (Map as array of entries)
    try {
      const redis = getRedis();
      if (redis) {
        await redis.setex(
          cacheKey,
          CACHE_CONFIG.userPerformance.ttlSeconds,
          JSON.stringify(Array.from(performance.entries()))
        );
      }
    } catch (err) {
      log.warn({ err }, 'Redis cache write failed for user performance');
    }
  }

  // ============================================
  // MUSCLE STATS
  // ============================================

  async getMuscleStats(userId: string): Promise<Record<string, number> | null> {
    const cacheKey = `prescription:muscle_stats:${userId}`;

    // Check memory cache
    const memCached = this.memoryCache.muscleStats.get(userId);
    if (memCached) {
      this.cacheHits++;
      return memCached;
    }

    // Check Redis
    try {
      const redis = getRedis();
      if (redis) {
        const cached = await redis.get(cacheKey);
        if (cached) {
          const parsed = JSON.parse(cached);
          this.memoryCache.muscleStats.set(
            userId,
            parsed,
            CACHE_CONFIG.muscleStats.memoryTtlMs
          );
          this.cacheHits++;
          return parsed;
        }
      }
    } catch (err) {
      log.warn({ err }, 'Redis cache read failed for muscle stats');
    }

    this.cacheMisses++;
    return null;
  }

  async setMuscleStats(userId: string, stats: Record<string, number>): Promise<void> {
    const cacheKey = `prescription:muscle_stats:${userId}`;

    this.memoryCache.muscleStats.set(userId, stats, CACHE_CONFIG.muscleStats.memoryTtlMs);

    try {
      const redis = getRedis();
      if (redis) {
        await redis.setex(
          cacheKey,
          CACHE_CONFIG.muscleStats.ttlSeconds,
          JSON.stringify(stats)
        );
      }
    } catch (err) {
      log.warn({ err }, 'Redis cache write failed for muscle stats');
    }
  }

  // ============================================
  // USER WEIGHTS
  // ============================================

  async getUserWeights(userId: string): Promise<AdaptiveUserWeights | null> {
    const cacheKey = `prescription:user_weights:${userId}`;

    const memCached = this.memoryCache.userWeights.get(userId);
    if (memCached) {
      this.cacheHits++;
      return memCached;
    }

    try {
      const redis = getRedis();
      if (redis) {
        const cached = await redis.get(cacheKey);
        if (cached) {
          const parsed = JSON.parse(cached);
          this.memoryCache.userWeights.set(
            userId,
            parsed,
            CACHE_CONFIG.userWeights.memoryTtlMs
          );
          this.cacheHits++;
          return parsed;
        }
      }
    } catch (err) {
      log.warn({ err }, 'Redis cache read failed for user weights');
    }

    this.cacheMisses++;
    return null;
  }

  async setUserWeights(userId: string, weights: AdaptiveUserWeights): Promise<void> {
    const cacheKey = `prescription:user_weights:${userId}`;

    this.memoryCache.userWeights.set(userId, weights, CACHE_CONFIG.userWeights.memoryTtlMs);

    try {
      const redis = getRedis();
      if (redis) {
        await redis.setex(
          cacheKey,
          CACHE_CONFIG.userWeights.ttlSeconds,
          JSON.stringify(weights)
        );
      }
    } catch (err) {
      log.warn({ err }, 'Redis cache write failed for user weights');
    }
  }

  // ============================================
  // INVALIDATION
  // ============================================

  /**
   * Invalidate cache on specific events
   */
  async invalidateOn(event: string, userId?: string): Promise<void> {
    const affectedCaches = Object.entries(CACHE_CONFIG)
      .filter(([, config]) => config.invalidateOn.includes(event))
      .map(([key]) => key);

    log.debug({ event, userId, affectedCaches }, 'Invalidating caches');

    for (const cacheType of affectedCaches) {
      await this.invalidateCache(cacheType, userId);
    }
  }

  /**
   * Invalidate specific cache type
   */
  async invalidateCache(cacheType: string, userId?: string): Promise<void> {
    // Clear memory cache
    switch (cacheType) {
      case 'userContext':
        if (userId) {
          this.memoryCache.userContext.delete(userId);
        }
        break;
      case 'exerciseMetadata':
        this.memoryCache.exerciseMetadata.clear();
        break;
      case 'userPerformance':
        if (userId) {
          this.memoryCache.userPerformance.delete(userId);
        }
        break;
      case 'muscleStats':
        if (userId) {
          this.memoryCache.muscleStats.delete(userId);
        }
        break;
      case 'userWeights':
        if (userId) {
          this.memoryCache.userWeights.delete(userId);
        }
        break;
    }

    // Clear Redis cache
    try {
      const redis = getRedis();
      if (redis) {
        if (userId) {
          const key = `prescription:${cacheType}:${userId}`;
          await redis.del(key);
        } else {
          // Clear all keys of this type (use scan for safety)
          const pattern = `prescription:${cacheType}:*`;
          let cursor = '0';
          do {
            const [newCursor, keys] = await redis.scan(cursor, 'MATCH', pattern, 'COUNT', 100);
            cursor = newCursor;
            if (keys.length > 0) {
              await redis.del(...keys);
            }
          } while (cursor !== '0');
        }
      }
    } catch (err) {
      log.warn({ err, cacheType, userId }, 'Redis cache invalidation failed');
    }
  }

  /**
   * Invalidate all caches for a user
   */
  async invalidateUserCaches(userId: string): Promise<void> {
    this.memoryCache.userContext.delete(userId);
    this.memoryCache.userPerformance.delete(userId);
    this.memoryCache.muscleStats.delete(userId);
    this.memoryCache.userWeights.delete(userId);

    try {
      const redis = getRedis();
      if (redis) {
        const keys = [
          `prescription:user_context:${userId}`,
          `prescription:user_performance:${userId}`,
          `prescription:muscle_stats:${userId}`,
          `prescription:user_weights:${userId}`,
        ];
        await redis.del(...keys);
      }
    } catch (err) {
      log.warn({ err, userId }, 'Redis cache invalidation failed for user');
    }
  }

  // ============================================
  // METRICS
  // ============================================

  getMetrics(): { hits: number; misses: number; hitRate: number; sizes: Record<string, number> } {
    const total = this.cacheHits + this.cacheMisses;
    return {
      hits: this.cacheHits,
      misses: this.cacheMisses,
      hitRate: total > 0 ? this.cacheHits / total : 0,
      sizes: {
        userContext: this.memoryCache.userContext.size(),
        exerciseMetadata: this.memoryCache.exerciseMetadata.size(),
        userPerformance: this.memoryCache.userPerformance.size(),
        muscleStats: this.memoryCache.muscleStats.size(),
        userWeights: this.memoryCache.userWeights.size(),
      },
    };
  }

  resetMetrics(): void {
    this.cacheHits = 0;
    this.cacheMisses = 0;
  }
}

// Export singleton
export const prescriptionCache = new PrescriptionCache();
