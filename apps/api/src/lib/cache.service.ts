/**
 * Comprehensive Redis Cache Service
 *
 * Provides unified caching for all data types with:
 * - Per-type TTL configuration
 * - Automatic cache invalidation
 * - Cache warming
 * - Statistics tracking
 * - Graceful fallback when Redis unavailable
 */

import type { Redis, Cluster } from 'ioredis';
import { getRedisClient, isRedisHealthy } from './redis-cluster';
import { loggers } from './logger';

const log = loggers.core;

// ============================================
// TTL CONFIGURATION (in seconds)
// ============================================

export const CACHE_TTL = {
  // Static reference data - rarely changes
  EQUIPMENT_TYPES: 3600,           // 1 hour
  EQUIPMENT_CATEGORIES: 3600,      // 1 hour
  EXERCISES: 3600,                 // 1 hour
  MUSCLES: 3600,                   // 1 hour
  MUSCLE_ACTIVATIONS: 3600,        // 1 hour
  SKILL_TREES: 3600,               // 1 hour
  SKILL_NODES: 3600,               // 1 hour
  ACHIEVEMENT_DEFINITIONS: 3600,   // 1 hour
  ARCHETYPE_DEFINITIONS: 3600,     // 1 hour
  PRICING_TIERS: 3600,             // 1 hour
  HANGOUT_TYPES: 3600,             // 1 hour
  LANGUAGES: 3600,                 // 1 hour

  // Semi-static data - changes occasionally
  COMMUNITY_LIST: 900,             // 15 minutes
  COMMUNITY_METADATA: 900,         // 15 minutes
  COMMUNITY_RULES: 1800,           // 30 minutes
  HANGOUT_METADATA: 900,           // 15 minutes
  VIRTUAL_HANGOUT_METADATA: 900,   // 15 minutes

  // User-specific data - moderate TTL
  USER_STATS: 300,                 // 5 minutes
  USER_ACHIEVEMENTS: 300,          // 5 minutes
  USER_SKILL_PROGRESS: 300,        // 5 minutes
  USER_EQUIPMENT: 600,             // 10 minutes
  USER_PROFILE: 300,               // 5 minutes

  // Aggregated data
  // CACHE-004 FIX: Increase leaderboard TTL from 1 to 5 minutes to reduce recalculations
  LEADERBOARD: 300,                // 5 minutes (was 1 minute)
  MEMBER_COUNTS: 300,              // 5 minutes
  GEO_STATS: 300,                  // 5 minutes
  NEARBY_HANGOUTS: 300,            // 5 minutes

  // Translations
  TRANSLATION: 3600,               // 1 hour

  // Short-lived data
  DATALOADER_L2: 60,               // 1 minute (cross-request cache)
} as const;

// ============================================
// CACHE KEY PREFIXES
// ============================================

export const CACHE_PREFIX = {
  // Reference data
  EQUIPMENT_TYPES: 'cache:equipment:types',
  EQUIPMENT_CATEGORIES: 'cache:equipment:categories',
  EXERCISES: 'cache:exercises',
  EXERCISE_BY_ID: 'cache:exercise:',
  MUSCLES: 'cache:muscles',
  MUSCLE_BY_ID: 'cache:muscle:',
  MUSCLE_ACTIVATIONS: 'cache:muscle_activations:',
  SKILL_TREES: 'cache:skill_trees',
  SKILL_TREE: 'cache:skill_tree:',
  SKILL_NODE: 'cache:skill_node:',
  ACHIEVEMENT_DEFS: 'cache:achievement_defs',
  ACHIEVEMENT_DEF: 'cache:achievement_def:',
  ARCHETYPES: 'cache:archetypes',
  ARCHETYPE: 'cache:archetype:',
  PRICING_TIERS: 'cache:pricing_tiers',
  HANGOUT_TYPES: 'cache:hangout_types',
  LANGUAGES: 'cache:languages',

  // Community/Hangout data
  COMMUNITY_LIST: 'cache:communities:list',
  COMMUNITY: 'cache:community:',
  COMMUNITY_RULES: 'cache:community:rules:',
  COMMUNITY_MEMBER_COUNT: 'cache:community:members:',
  HANGOUT: 'cache:hangout:',
  VIRTUAL_HANGOUT: 'cache:virtual_hangout:',

  // User-specific data
  USER_STATS: 'cache:user:stats:',
  USER_ACHIEVEMENTS: 'cache:user:achievements:',
  USER_SKILL_PROGRESS: 'cache:user:skills:',
  USER_EQUIPMENT: 'cache:user:equipment:',
  USER_PROFILE: 'cache:user:profile:',
  USER_EXTENDED_PROFILE: 'cache:user:ext_profile:',

  // Aggregated data
  LEADERBOARD: 'cache:leaderboard:',
  GEO_STATS: 'cache:geo:stats:',
  NEARBY_HANGOUTS: 'cache:nearby:',

  // Translations
  TRANSLATION: 'cache:i18n:',

  // DataLoader L2 cache
  DATALOADER_USER: 'cache:dl:user:',
  DATALOADER_EXERCISE: 'cache:dl:exercise:',
  DATALOADER_MUSCLE: 'cache:dl:muscle:',
} as const;

// ============================================
// CACHE STATISTICS
// ============================================

interface CacheStats {
  hits: number;
  misses: number;
  sets: number;
  deletes: number;
  errors: number;
  hitsByPrefix: Record<string, number>;
  missesByPrefix: Record<string, number>;
}

const stats: CacheStats = {
  hits: 0,
  misses: 0,
  sets: 0,
  deletes: 0,
  errors: 0,
  hitsByPrefix: {},
  missesByPrefix: {},
};

function trackHit(key: string): void {
  stats.hits++;
  const prefix = key.split(':').slice(0, 3).join(':');
  stats.hitsByPrefix[prefix] = (stats.hitsByPrefix[prefix] || 0) + 1;
}

function trackMiss(key: string): void {
  stats.misses++;
  const prefix = key.split(':').slice(0, 3).join(':');
  stats.missesByPrefix[prefix] = (stats.missesByPrefix[prefix] || 0) + 1;
}

// ============================================
// CORE CACHE OPERATIONS
// ============================================

/**
 * Get a value from cache
 */
export async function cacheGet<T>(key: string): Promise<T | null> {
  if (!isRedisHealthy()) {
    return null;
  }

  try {
    const redis = getRedisClient();
    const data = await redis.get(key);

    if (data === null) {
      trackMiss(key);
      return null;
    }

    trackHit(key);
    return JSON.parse(data) as T;
  } catch (error) {
    stats.errors++;
    log.warn({ error, key }, 'Cache get failed');
    return null;
  }
}

/**
 * Set a value in cache with TTL
 */
export async function cacheSet<T>(key: string, value: T, ttl: number): Promise<boolean> {
  if (!isRedisHealthy()) {
    return false;
  }

  try {
    const redis = getRedisClient();
    await redis.setex(key, ttl, JSON.stringify(value));
    stats.sets++;
    return true;
  } catch (error) {
    stats.errors++;
    log.warn({ error, key }, 'Cache set failed');
    return false;
  }
}

/**
 * Delete a key from cache
 */
export async function cacheDel(key: string): Promise<boolean> {
  if (!isRedisHealthy()) {
    return false;
  }

  try {
    const redis = getRedisClient();
    await redis.del(key);
    stats.deletes++;
    return true;
  } catch (error) {
    stats.errors++;
    log.warn({ error, key }, 'Cache delete failed');
    return false;
  }
}

/**
 * Delete all keys matching a pattern
 */
export async function cacheDelPattern(pattern: string): Promise<number> {
  if (!isRedisHealthy()) {
    return 0;
  }

  try {
    const redis = getRedisClient();
    const keys = await scanKeys(redis, pattern);

    if (keys.length === 0) {
      return 0;
    }

    const pipeline = redis.pipeline();
    keys.forEach((key) => pipeline.del(key));
    await pipeline.exec();

    stats.deletes += keys.length;
    log.debug({ pattern, count: keys.length }, 'Cache pattern deleted');
    return keys.length;
  } catch (error) {
    stats.errors++;
    log.warn({ error, pattern }, 'Cache pattern delete failed');
    return 0;
  }
}

/**
 * Get multiple values from cache
 */
export async function cacheGetMany<T>(keys: string[]): Promise<(T | null)[]> {
  if (!isRedisHealthy() || keys.length === 0) {
    return keys.map(() => null);
  }

  try {
    const redis = getRedisClient();
    const results = await redis.mget(...keys);

    return results.map((data, i) => {
      if (data === null) {
        trackMiss(keys[i]);
        return null;
      }
      trackHit(keys[i]);
      try {
        return JSON.parse(data) as T;
      } catch {
        return null;
      }
    });
  } catch (error) {
    stats.errors++;
    log.warn({ error }, 'Cache mget failed');
    return keys.map(() => null);
  }
}

/**
 * Set multiple values in cache
 */
export async function cacheSetMany<T>(
  entries: Array<{ key: string; value: T; ttl: number }>
): Promise<boolean> {
  if (!isRedisHealthy() || entries.length === 0) {
    return false;
  }

  try {
    const redis = getRedisClient();
    const pipeline = redis.pipeline();

    for (const entry of entries) {
      pipeline.setex(entry.key, entry.ttl, JSON.stringify(entry.value));
    }

    await pipeline.exec();
    stats.sets += entries.length;
    return true;
  } catch (error) {
    stats.errors++;
    log.warn({ error }, 'Cache mset failed');
    return false;
  }
}

/**
 * Get or set pattern - fetch from cache or execute function and cache result
 */
export async function cacheGetOrSet<T>(
  key: string,
  ttl: number,
  fetchFn: () => Promise<T>
): Promise<T> {
  // Try cache first
  const cached = await cacheGet<T>(key);
  if (cached !== null) {
    return cached;
  }

  // Fetch from source
  const value = await fetchFn();

  // Cache the result (non-blocking)
  cacheSet(key, value, ttl).catch(() => {});

  return value;
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Scan for keys matching a pattern
 */
async function scanKeys(redis: Redis | Cluster, pattern: string): Promise<string[]> {
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
 * Generate hash for cache key
 */
export function hashKey(obj: unknown): string {
  const str = JSON.stringify(obj);
  let hash = 2166136261;
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash = (hash * 16777619) >>> 0;
  }
  return hash.toString(36);
}

// ============================================
// CACHE STATISTICS
// ============================================

/**
 * Get cache statistics
 */
export function getCacheStats(): CacheStats & { hitRate: number } {
  const total = stats.hits + stats.misses;
  const hitRate = total > 0 ? stats.hits / total : 0;
  return { ...stats, hitRate };
}

/**
 * Reset cache statistics
 */
export function resetCacheStats(): void {
  stats.hits = 0;
  stats.misses = 0;
  stats.sets = 0;
  stats.deletes = 0;
  stats.errors = 0;
  stats.hitsByPrefix = {};
  stats.missesByPrefix = {};
}

// ============================================
// CACHE INVALIDATION HELPERS
// ============================================

export const CacheInvalidation = {
  // Reference data invalidation
  async onEquipmentUpdated(): Promise<void> {
    await cacheDelPattern(`${CACHE_PREFIX.EQUIPMENT_TYPES}*`);
    await cacheDelPattern(`${CACHE_PREFIX.EQUIPMENT_CATEGORIES}*`);
  },

  async onExercisesUpdated(): Promise<void> {
    await cacheDelPattern(`${CACHE_PREFIX.EXERCISES}*`);
    await cacheDelPattern(`${CACHE_PREFIX.EXERCISE_BY_ID}*`);
    await cacheDelPattern(`${CACHE_PREFIX.MUSCLE_ACTIVATIONS}*`);
    await cacheDelPattern(`${CACHE_PREFIX.DATALOADER_EXERCISE}*`);
  },

  async onMusclesUpdated(): Promise<void> {
    await cacheDelPattern(`${CACHE_PREFIX.MUSCLES}*`);
    await cacheDelPattern(`${CACHE_PREFIX.MUSCLE_BY_ID}*`);
    await cacheDelPattern(`${CACHE_PREFIX.MUSCLE_ACTIVATIONS}*`);
    await cacheDelPattern(`${CACHE_PREFIX.DATALOADER_MUSCLE}*`);
  },

  async onSkillsUpdated(): Promise<void> {
    await cacheDelPattern(`${CACHE_PREFIX.SKILL_TREES}*`);
    await cacheDelPattern(`${CACHE_PREFIX.SKILL_TREE}*`);
    await cacheDelPattern(`${CACHE_PREFIX.SKILL_NODE}*`);
  },

  async onAchievementsUpdated(): Promise<void> {
    await cacheDelPattern(`${CACHE_PREFIX.ACHIEVEMENT_DEFS}*`);
    await cacheDelPattern(`${CACHE_PREFIX.ACHIEVEMENT_DEF}*`);
  },

  async onArchetypesUpdated(): Promise<void> {
    await cacheDelPattern(`${CACHE_PREFIX.ARCHETYPES}*`);
    await cacheDelPattern(`${CACHE_PREFIX.ARCHETYPE}*`);
  },

  async onPricingUpdated(): Promise<void> {
    await cacheDelPattern(`${CACHE_PREFIX.PRICING_TIERS}*`);
  },

  // User-specific invalidation
  async onUserUpdated(userId: string): Promise<void> {
    await cacheDelPattern(`${CACHE_PREFIX.USER_PROFILE}${userId}*`);
    await cacheDelPattern(`${CACHE_PREFIX.USER_EXTENDED_PROFILE}${userId}*`);
    await cacheDelPattern(`${CACHE_PREFIX.DATALOADER_USER}${userId}*`);
  },

  async onUserStatsUpdated(userId: string): Promise<void> {
    await cacheDelPattern(`${CACHE_PREFIX.USER_STATS}${userId}*`);
    await cacheDelPattern(`${CACHE_PREFIX.LEADERBOARD}*`);
  },

  async onUserAchievementsUpdated(userId: string): Promise<void> {
    await cacheDelPattern(`${CACHE_PREFIX.USER_ACHIEVEMENTS}${userId}*`);
  },

  async onUserSkillsUpdated(userId: string): Promise<void> {
    await cacheDelPattern(`${CACHE_PREFIX.USER_SKILL_PROGRESS}${userId}*`);
  },

  async onUserEquipmentUpdated(userId: string): Promise<void> {
    await cacheDelPattern(`${CACHE_PREFIX.USER_EQUIPMENT}${userId}*`);
  },

  // Community/Hangout invalidation
  async onCommunityUpdated(communityId: string): Promise<void> {
    await cacheDelPattern(`${CACHE_PREFIX.COMMUNITY}${communityId}*`);
    await cacheDelPattern(`${CACHE_PREFIX.COMMUNITY_RULES}${communityId}*`);
    await cacheDelPattern(`${CACHE_PREFIX.COMMUNITY_MEMBER_COUNT}${communityId}*`);
    await cacheDelPattern(`${CACHE_PREFIX.COMMUNITY_LIST}*`);
  },

  async onHangoutUpdated(hangoutId: number): Promise<void> {
    await cacheDelPattern(`${CACHE_PREFIX.HANGOUT}${hangoutId}*`);
    await cacheDelPattern(`${CACHE_PREFIX.NEARBY_HANGOUTS}*`);
    await cacheDelPattern(`${CACHE_PREFIX.GEO_STATS}*`);
  },

  async onVirtualHangoutUpdated(virtualHangoutId: string): Promise<void> {
    await cacheDelPattern(`${CACHE_PREFIX.VIRTUAL_HANGOUT}${virtualHangoutId}*`);
  },

  // Translations
  async onTranslationsUpdated(contentType?: string, contentId?: string): Promise<void> {
    if (contentType && contentId) {
      await cacheDelPattern(`${CACHE_PREFIX.TRANSLATION}${contentType}:${contentId}:*`);
    } else if (contentType) {
      await cacheDelPattern(`${CACHE_PREFIX.TRANSLATION}${contentType}:*`);
    } else {
      await cacheDelPattern(`${CACHE_PREFIX.TRANSLATION}*`);
    }
  },

  // Bulk invalidation
  async invalidateAll(): Promise<void> {
    await cacheDelPattern('cache:*');
    log.info('All caches invalidated');
  },
};

// ============================================
// CACHE WARMING
// ============================================

/**
 * Warm critical caches on startup
 */
export async function warmCaches(warmFunctions: Array<() => Promise<void>>): Promise<void> {
  if (!isRedisHealthy()) {
    log.warn('Redis not available, skipping cache warming');
    return;
  }

  log.info('Starting cache warming...');
  const startTime = Date.now();

  for (const warmFn of warmFunctions) {
    try {
      await warmFn();
    } catch (error) {
      log.warn({ error }, 'Cache warming function failed');
    }
  }

  const duration = Date.now() - startTime;
  log.info({ duration }, 'Cache warming completed');
}

export default {
  get: cacheGet,
  set: cacheSet,
  del: cacheDel,
  delPattern: cacheDelPattern,
  getMany: cacheGetMany,
  setMany: cacheSetMany,
  getOrSet: cacheGetOrSet,
  getStats: getCacheStats,
  resetStats: resetCacheStats,
  invalidate: CacheInvalidation,
  warm: warmCaches,
  TTL: CACHE_TTL,
  PREFIX: CACHE_PREFIX,
  hashKey,
};
