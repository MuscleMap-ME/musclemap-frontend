/**
 * Stats Service
 *
 * Computes and caches community-wide statistics.
 */

import { db } from '../../db/client';
import { loggers } from '../../lib/logger';
import { getActiveNowStats, getTopExercisesNow } from './presence.service';
import type { MetricRollup } from './types';

const log = loggers.core;

// Simple in-memory cache
const statsCache = new Map<
  string,
  { data: unknown; cachedAt: number; ttlMs: number }
>();

function getCached<T>(key: string): T | null {
  const entry = statsCache.get(key);
  if (entry && Date.now() - entry.cachedAt < entry.ttlMs) {
    return entry.data as T;
  }
  return null;
}

function setCache(key: string, data: unknown, ttlMs: number): void {
  statsCache.set(key, { data, cachedAt: Date.now(), ttlMs });
}

/**
 * Get overview statistics
 */
export async function getOverviewStats(window: '1h' | '24h' | '7d' = '24h') {
  const cacheKey = `overview:${window}`;
  const cached = getCached<ReturnType<typeof computeOverviewStats>>(cacheKey);
  if (cached) return cached;

  const stats = computeOverviewStats(window);
  setCache(cacheKey, stats, window === '1h' ? 60000 : 300000); // 1min or 5min cache
  return stats;
}

function computeOverviewStats(window: '1h' | '24h' | '7d') {
  const windowMap = {
    '1h': '-1 hour',
    '24h': '-24 hours',
    '7d': '-7 days',
  };
  const interval = windowMap[window];

  const userStats = db
    .prepare(
      `
    SELECT
      COUNT(*) as total_users,
      COUNT(CASE WHEN created_at > datetime('now', ?) THEN 1 END) as new_users
    FROM users
  `
    )
    .get(interval) as { total_users: number; new_users: number };

  const workoutStats = db
    .prepare(
      `
    SELECT
      COUNT(*) as workout_count,
      COALESCE(SUM(total_tu), 0) as total_tu
    FROM workouts
    WHERE created_at > datetime('now', ?)
  `
    )
    .get(interval) as { workout_count: number; total_tu: number };

  const creditStats = db
    .prepare(
      `
    SELECT
      COALESCE(SUM(balance), 0) as total_credits,
      COALESCE(AVG(balance), 0) as avg_credits
    FROM credit_balances
  `
    )
    .get() as { total_credits: number; avg_credits: number };

  return {
    window,
    users: {
      total: userStats.total_users,
      newInWindow: userStats.new_users,
    },
    workouts: {
      countInWindow: workoutStats.workout_count,
      totalTuInWindow: Math.round(workoutStats.total_tu * 100) / 100,
    },
    credits: {
      totalInCirculation: creditStats.total_credits,
      averagePerUser: Math.round(creditStats.avg_credits),
    },
  };
}

/**
 * Get archetype distribution
 */
export function getArchetypeDistribution() {
  const cacheKey = 'archetypes:distribution';
  const cached = getCached<ReturnType<typeof computeArchetypeDistribution>>(cacheKey);
  if (cached) return cached;

  const data = computeArchetypeDistribution();
  setCache(cacheKey, data, 300000); // 5 min cache
  return data;
}

function computeArchetypeDistribution() {
  const distribution = db
    .prepare(
      `
    SELECT
      a.id,
      a.name,
      COUNT(u.id) as user_count,
      AVG(u.current_level) as avg_level
    FROM archetypes a
    LEFT JOIN users u ON u.current_archetype_id = a.id
    GROUP BY a.id
    ORDER BY user_count DESC
  `
    )
    .all() as Array<{
    id: string;
    name: string;
    user_count: number;
    avg_level: number;
  }>;

  const total = distribution.reduce((sum, a) => sum + a.user_count, 0);

  return distribution.map((a) => ({
    archetypeId: a.id,
    name: a.name,
    userCount: a.user_count,
    percentage: total > 0 ? Math.round((a.user_count / total) * 1000) / 10 : 0,
    avgLevel: Math.round((a.avg_level || 1) * 10) / 10,
  }));
}

/**
 * Get exercise popularity ranking
 */
export function getExerciseRanking(limit = 20, window: '7d' | '30d' = '7d') {
  const cacheKey = `exercises:ranking:${window}`;
  const cached = getCached<ReturnType<typeof computeExerciseRanking>>(cacheKey);
  if (cached) return cached;

  const data = computeExerciseRanking(limit, window);
  setCache(cacheKey, data, 600000); // 10 min cache
  return data;
}

function computeExerciseRanking(limit: number, window: '7d' | '30d') {
  const interval = window === '7d' ? '-7 days' : '-30 days';

  // Count exercises from activity_events
  const ranking = db
    .prepare(
      `
    SELECT
      json_extract(payload, '$.exerciseId') as exercise_id,
      COUNT(*) as usage_count
    FROM activity_events
    WHERE event_type = 'exercise.selected'
      AND created_at > datetime('now', ?)
      AND json_extract(payload, '$.exerciseId') IS NOT NULL
    GROUP BY exercise_id
    ORDER BY usage_count DESC
    LIMIT ?
  `
    )
    .all(interval, limit) as Array<{ exercise_id: string; usage_count: number }>;

  // Fetch exercise names
  const exerciseIds = ranking.map((r) => r.exercise_id);
  if (exerciseIds.length === 0) return [];

  const placeholders = exerciseIds.map(() => '?').join(',');
  const exercises = db
    .prepare(`SELECT id, name FROM exercises WHERE id IN (${placeholders})`)
    .all(...exerciseIds) as Array<{ id: string; name: string }>;

  const nameMap = new Map(exercises.map((e) => [e.id, e.name]));

  return ranking.map((r, i) => ({
    rank: i + 1,
    exerciseId: r.exercise_id,
    name: nameMap.get(r.exercise_id) || 'Unknown',
    usageCount: r.usage_count,
  }));
}

/**
 * Get user journey funnel
 */
export function getFunnelStats() {
  const cacheKey = 'funnel:stats';
  const cached = getCached<ReturnType<typeof computeFunnelStats>>(cacheKey);
  if (cached) return cached;

  const data = computeFunnelStats();
  setCache(cacheKey, data, 600000); // 10 min cache
  return data;
}

function computeFunnelStats() {
  const totalUsers = db
    .prepare('SELECT COUNT(*) as count FROM users')
    .get() as { count: number };

  const withWorkouts = db
    .prepare(
      `
    SELECT COUNT(DISTINCT user_id) as count
    FROM workouts
  `
    )
    .get() as { count: number };

  const weeklyActive = db
    .prepare(
      `
    SELECT COUNT(DISTINCT user_id) as count
    FROM workouts
    WHERE created_at > datetime('now', '-7 days')
  `
    )
    .get() as { count: number };

  const levelMilestones = db
    .prepare(
      `
    SELECT
      SUM(CASE WHEN current_level >= 5 THEN 1 ELSE 0 END) as level_5,
      SUM(CASE WHEN current_level >= 10 THEN 1 ELSE 0 END) as level_10,
      SUM(CASE WHEN current_level >= 20 THEN 1 ELSE 0 END) as level_20,
      SUM(CASE WHEN current_level >= 50 THEN 1 ELSE 0 END) as level_50
    FROM users
  `
    )
    .get() as {
    level_5: number;
    level_10: number;
    level_20: number;
    level_50: number;
  };

  const subscribers = db
    .prepare(
      `
    SELECT COUNT(*) as count
    FROM subscriptions
    WHERE status = 'active'
  `
    )
    .get() as { count: number };

  const total = totalUsers.count || 1; // Avoid division by zero

  return {
    stages: [
      {
        name: 'Registered',
        count: totalUsers.count,
        percentage: 100,
      },
      {
        name: 'First Workout',
        count: withWorkouts.count,
        percentage: Math.round((withWorkouts.count / total) * 100),
      },
      {
        name: 'Weekly Active',
        count: weeklyActive.count,
        percentage: Math.round((weeklyActive.count / total) * 100),
      },
      {
        name: 'Level 5+',
        count: levelMilestones.level_5 || 0,
        percentage: Math.round(((levelMilestones.level_5 || 0) / total) * 100),
      },
      {
        name: 'Level 10+',
        count: levelMilestones.level_10 || 0,
        percentage: Math.round(((levelMilestones.level_10 || 0) / total) * 100),
      },
      {
        name: 'Subscribed',
        count: subscribers.count,
        percentage: Math.round((subscribers.count / total) * 100),
      },
    ],
  };
}

/**
 * Get credit distribution histogram
 */
export function getCreditDistribution() {
  const cacheKey = 'credits:distribution';
  const cached = getCached<ReturnType<typeof computeCreditDistribution>>(cacheKey);
  if (cached) return cached;

  const data = computeCreditDistribution();
  setCache(cacheKey, data, 600000); // 10 min cache
  return data;
}

function computeCreditDistribution() {
  // Get distribution in buckets
  const buckets = db
    .prepare(
      `
    SELECT
      CASE
        WHEN balance < 0 THEN 'negative'
        WHEN balance = 0 THEN '0'
        WHEN balance <= 100 THEN '1-100'
        WHEN balance <= 500 THEN '101-500'
        WHEN balance <= 1000 THEN '501-1000'
        WHEN balance <= 5000 THEN '1001-5000'
        ELSE '5000+'
      END as bucket,
      COUNT(*) as count
    FROM credit_balances
    GROUP BY bucket
  `
    )
    .all() as Array<{ bucket: string; count: number }>;

  const stats = db
    .prepare(
      `
    SELECT
      MIN(balance) as min_balance,
      MAX(balance) as max_balance,
      AVG(balance) as avg_balance,
      SUM(balance) as total_balance
    FROM credit_balances
  `
    )
    .get() as {
    min_balance: number;
    max_balance: number;
    avg_balance: number;
    total_balance: number;
  };

  return {
    buckets,
    stats: {
      min: stats.min_balance || 0,
      max: stats.max_balance || 0,
      average: Math.round(stats.avg_balance || 0),
      total: stats.total_balance || 0,
    },
  };
}

/**
 * Get geographic distribution (from user_locations)
 */
export function getGeographicDistribution() {
  const cacheKey = 'geo:distribution';
  const cached = getCached<ReturnType<typeof computeGeographicDistribution>>(cacheKey);
  if (cached) return cached;

  const data = computeGeographicDistribution();
  setCache(cacheKey, data, 600000); // 10 min cache
  return data;
}

function computeGeographicDistribution() {
  const byCountry = db
    .prepare(
      `
    SELECT
      country_code,
      country,
      COUNT(*) as user_count
    FROM user_locations
    WHERE country_code IS NOT NULL
    GROUP BY country_code
    ORDER BY user_count DESC
    LIMIT 20
  `
    )
    .all() as Array<{
    country_code: string;
    country: string;
    user_count: number;
  }>;

  const byCity = db
    .prepare(
      `
    SELECT
      city,
      country_code,
      COUNT(*) as user_count
    FROM user_locations
    WHERE city IS NOT NULL
    GROUP BY city, country_code
    ORDER BY user_count DESC
    LIMIT 10
  `
    )
    .all() as Array<{ city: string; country_code: string; user_count: number }>;

  const totalLocations = db
    .prepare('SELECT COUNT(*) as count FROM user_locations')
    .get() as { count: number };

  return {
    totalWithLocation: totalLocations.count,
    byCountry,
    byCity,
  };
}

/**
 * Get community summary for dashboard snapshot
 */
export async function getCommunitySummary() {
  const [activeNow, topExercises, overview] = await Promise.all([
    getActiveNowStats(),
    getTopExercisesNow(15, 5),
    getOverviewStats('24h'),
  ]);

  return {
    activeNow,
    topExercises,
    overview,
    generatedAt: new Date().toISOString(),
  };
}

/**
 * Clear stats cache (for testing or manual refresh)
 */
export function clearStatsCache(): void {
  statsCache.clear();
}
