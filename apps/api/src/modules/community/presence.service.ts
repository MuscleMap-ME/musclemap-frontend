/**
 * Presence Service
 *
 * Manages real-time presence tracking using Redis:
 * - Sorted set for active users (score = last seen timestamp)
 * - Hash maps for presence metadata (geoBucket, stageId, etc.)
 */

import { getRedis, isRedisAvailable, REDIS_KEYS, TTL, getLastNMinuteKeys } from '../../lib/redis';
import { db } from '../../db/client';
import { loggers } from '../../lib/logger';
import type { ActiveNowStats, PresenceMeta } from './types';

const log = loggers.core;

// Fallback when Redis is not available
const inMemoryPresence = new Map<string, PresenceMeta>();

/**
 * Get active user count from the last N seconds
 */
export async function getActiveUserCount(windowSeconds = 120): Promise<number> {
  const redis = getRedis();

  if (!redis) {
    // Fallback: count in-memory presence entries
    const cutoff = Date.now() - windowSeconds * 1000;
    let count = 0;
    for (const meta of inMemoryPresence.values()) {
      if (meta.ts > cutoff) count++;
    }
    return count;
  }

  const cutoff = Date.now() - windowSeconds * 1000;

  try {
    // Count users with score > cutoff
    const count = await redis.zcount(REDIS_KEYS.PRESENCE_ZSET, cutoff, '+inf');
    return count;
  } catch (err) {
    log.error({ error: err }, 'Failed to get active user count');
    return 0;
  }
}

/**
 * Get list of active user IDs
 */
export async function getActiveUserIds(windowSeconds = 120): Promise<string[]> {
  const redis = getRedis();

  if (!redis) {
    const cutoff = Date.now() - windowSeconds * 1000;
    const ids: string[] = [];
    for (const [userId, meta] of inMemoryPresence.entries()) {
      if (meta.ts > cutoff) ids.push(userId);
    }
    return ids;
  }

  const cutoff = Date.now() - windowSeconds * 1000;

  try {
    const userIds = await redis.zrangebyscore(
      REDIS_KEYS.PRESENCE_ZSET,
      cutoff,
      '+inf'
    );
    return userIds;
  } catch (err) {
    log.error({ error: err }, 'Failed to get active user IDs');
    return [];
  }
}

/**
 * Get presence metadata for multiple users
 */
export async function getPresenceMetaBatch(
  userIds: string[]
): Promise<Map<string, PresenceMeta>> {
  const result = new Map<string, PresenceMeta>();
  const redis = getRedis();

  if (!redis) {
    for (const userId of userIds) {
      const meta = inMemoryPresence.get(userId);
      if (meta) result.set(userId, meta);
    }
    return result;
  }

  if (userIds.length === 0) return result;

  try {
    const pipeline = redis.pipeline();
    for (const userId of userIds) {
      pipeline.get(REDIS_KEYS.PRESENCE_META(userId));
    }

    const responses = await pipeline.exec();
    if (!responses) return result;

    for (let i = 0; i < userIds.length; i++) {
      const [err, data] = responses[i] || [];
      if (!err && data) {
        try {
          const meta = JSON.parse(data as string) as PresenceMeta;
          result.set(userIds[i], meta);
        } catch {}
      }
    }
  } catch (err) {
    log.error({ error: err }, 'Failed to get presence metadata batch');
  }

  return result;
}

/**
 * Get aggregated "active now" statistics
 */
export async function getActiveNowStats(
  windowSeconds = 120
): Promise<ActiveNowStats> {
  const userIds = await getActiveUserIds(windowSeconds);
  const metas = await getPresenceMetaBatch(userIds);

  const byGeoBucket: Record<string, number> = {};
  const byStage: Record<string, number> = {};

  for (const meta of metas.values()) {
    if (meta.geoBucket) {
      byGeoBucket[meta.geoBucket] = (byGeoBucket[meta.geoBucket] || 0) + 1;
    }
    if (meta.stageId) {
      byStage[meta.stageId] = (byStage[meta.stageId] || 0) + 1;
    }
  }

  return {
    total: userIds.length,
    byGeoBucket,
    byStage,
  };
}

/**
 * Get top exercises from the last N minutes
 */
export async function getTopExercisesNow(
  minutes = 15,
  limit = 10
): Promise<Array<{ exerciseId: string; name: string; count: number }>> {
  const redis = getRedis();

  if (!redis) {
    // Fallback: return empty array
    return [];
  }

  const minuteKeys = getLastNMinuteKeys(minutes);
  const counts: Record<string, number> = {};

  try {
    const pipeline = redis.pipeline();
    for (const key of minuteKeys) {
      pipeline.hgetall(REDIS_KEYS.NOW_EXERCISE(key));
    }

    const responses = await pipeline.exec();
    if (!responses) return [];

    for (const [err, data] of responses) {
      if (!err && data && typeof data === 'object') {
        for (const [exerciseId, countStr] of Object.entries(
          data as Record<string, string>
        )) {
          counts[exerciseId] = (counts[exerciseId] || 0) + parseInt(countStr, 10);
        }
      }
    }

    // Sort by count descending
    const sorted = Object.entries(counts)
      .map(([exerciseId, count]) => ({ exerciseId, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);

    // Fetch exercise names from PostgreSQL
    const exerciseIds = sorted.map((e) => e.exerciseId);
    if (exerciseIds.length === 0) return [];

    const placeholders = exerciseIds.map((_, i) => `$${i + 1}`).join(',');
    const exercises = await db.queryAll<{ id: string; name: string }>(
      `SELECT id, name FROM exercises WHERE id IN (${placeholders})`,
      exerciseIds
    );

    const nameMap = new Map(exercises.map((e) => [e.id, e.name]));

    return sorted.map((e) => ({
      exerciseId: e.exerciseId,
      name: nameMap.get(e.exerciseId) || 'Unknown',
      count: e.count,
    }));
  } catch (err) {
    log.error({ error: err }, 'Failed to get top exercises');
    return [];
  }
}

/**
 * Update in-memory presence (fallback when Redis unavailable)
 */
export function updateInMemoryPresence(
  userId: string,
  meta: PresenceMeta
): void {
  inMemoryPresence.set(userId, meta);

  // Prune old entries (older than 2 minutes)
  const cutoff = Date.now() - TTL.PRESENCE * 1000;
  for (const [id, m] of inMemoryPresence.entries()) {
    if (m.ts < cutoff) {
      inMemoryPresence.delete(id);
    }
  }
}

/**
 * Clean up stale presence entries in Redis
 * (Should be called periodically)
 */
export async function cleanupStalePresence(): Promise<number> {
  const redis = getRedis();
  if (!redis) return 0;

  const cutoff = Date.now() - TTL.PRESENCE * 1000;

  try {
    // Remove users from sorted set with old scores
    const removed = await redis.zremrangebyscore(
      REDIS_KEYS.PRESENCE_ZSET,
      '-inf',
      cutoff
    );
    return removed;
  } catch (err) {
    log.error({ error: err }, 'Failed to cleanup stale presence');
    return 0;
  }
}

/**
 * Get presence counts by geo bucket for map view
 */
export async function getPresenceByGeoBucket(): Promise<
  Array<{ geoBucket: string; count: number }>
> {
  const stats = await getActiveNowStats();
  return Object.entries(stats.byGeoBucket)
    .map(([geoBucket, count]) => ({ geoBucket, count }))
    .sort((a, b) => b.count - a.count);
}
