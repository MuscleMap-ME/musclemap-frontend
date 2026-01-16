/**
 * Character Stats Module
 *
 * D&D-style character stats system with 6 core attributes:
 * - Strength (STR): Heavy compound lifts, high weight
 * - Constitution (CON): Consistency, workout frequency
 * - Dexterity (DEX): Bodyweight exercises, agility
 * - Power (PWR): Explosive exercises (cleans, snatches)
 * - Endurance (END): High-rep sets, cardio, duration
 * - Vitality (VIT): Aggregate of all stats
 */

import crypto from 'crypto';
import { queryOne, queryAll, query, transaction } from '../../db/client';
import { loggers } from '../../lib/logger';
import cache, { CACHE_TTL, CACHE_PREFIX, CacheInvalidation } from '../../lib/cache.service';

const log = loggers.db;

// Stat type constants
export const STAT_TYPES = {
  STRENGTH: 'strength',
  CONSTITUTION: 'constitution',
  DEXTERITY: 'dexterity',
  POWER: 'power',
  ENDURANCE: 'endurance',
  VITALITY: 'vitality',
} as const;

export type StatType = (typeof STAT_TYPES)[keyof typeof STAT_TYPES];

// TypeScript interfaces
export interface CharacterStats {
  userId: string;
  strength: number;
  constitution: number;
  dexterity: number;
  power: number;
  endurance: number;
  vitality: number;
  lastCalculatedAt: Date;
  version: number;
}

export interface StatContributions {
  strength: number;
  constitution: number;
  dexterity: number;
  power: number;
  endurance: number;
}

export interface WorkoutExercise {
  exerciseId: string;
  sets: number;
  reps?: number;
  weight?: number;
  duration?: number;
}

export interface UserRanking {
  rank: number;
  total: number;
  percentile: number;
}

export interface RankingsByScope {
  global: UserRanking;
  country?: UserRanking;
  state?: UserRanking;
  city?: UserRanking;
}

export interface ExtendedProfile {
  userId: string;
  gender: string | null;
  city: string | null;
  county: string | null;
  state: string | null;
  country: string | null;
  countryCode: string | null;
  leaderboardOptIn: boolean;
  profileVisibility: string;
}

// Category to stat weight mappings
const CATEGORY_STAT_WEIGHTS: Record<string, Partial<StatContributions>> = {
  Push: { strength: 0.8, power: 0.3, dexterity: 0.1 },
  Pull: { strength: 0.7, dexterity: 0.4, power: 0.2 },
  Squat: { strength: 0.9, power: 0.4, endurance: 0.2 },
  Hinge: { strength: 0.9, power: 0.5, constitution: 0.2 },
  Core: { constitution: 0.6, dexterity: 0.5, endurance: 0.4 },
  Carry: { strength: 0.6, constitution: 0.7, endurance: 0.5 },
  Cardio: { endurance: 1.0, constitution: 0.5 },
  Olympic: { power: 1.0, strength: 0.6, dexterity: 0.4 },
  Plyo: { power: 0.9, dexterity: 0.6, endurance: 0.3 },
};

const DEFAULT_WEIGHTS: Partial<StatContributions> = { strength: 0.5, dexterity: 0.3, endurance: 0.2 };

/**
 * Infer exercise category from exercise ID or properties
 */
function inferExerciseCategory(exerciseId: string): string {
  if (exerciseId.includes('-PUSH-') || exerciseId.includes('PRESS') || exerciseId.includes('DIP')) return 'Push';
  if (exerciseId.includes('-PULL-') || exerciseId.includes('ROW') || exerciseId.includes('PULLUP')) return 'Pull';
  if (exerciseId.includes('-SQUAT-') || exerciseId.includes('SQUAT') || exerciseId.includes('LUNGE')) return 'Squat';
  if (exerciseId.includes('-HINGE-') || exerciseId.includes('DEADLIFT') || exerciseId.includes('HIP')) return 'Hinge';
  if (exerciseId.includes('-CORE-') || exerciseId.includes('PLANK') || exerciseId.includes('CRUNCH')) return 'Core';
  if (exerciseId.includes('-CARRY-') || exerciseId.includes('CARRY') || exerciseId.includes('WALK')) return 'Carry';
  if (exerciseId.includes('-CARDIO-') || exerciseId.includes('RUN') || exerciseId.includes('BIKE')) return 'Cardio';
  if (exerciseId.includes('-OLY-') || exerciseId.includes('CLEAN') || exerciseId.includes('SNATCH')) return 'Olympic';
  if (exerciseId.includes('-PLYO-') || exerciseId.includes('JUMP') || exerciseId.includes('BOX')) return 'Plyo';

  // Default based on prefix
  if (exerciseId.startsWith('BW-')) return 'Pull'; // Bodyweight tends to be pulling movements

  return 'Push'; // Default
}

/**
 * Calculate stat contributions from a single exercise
 */
async function calculateExerciseStatContribution(
  exerciseId: string,
  sets: number,
  reps: number = 10,
  weight: number = 0
): Promise<StatContributions> {
  const exercise = await queryOne<{ id: string; difficulty: number; is_compound: boolean }>(
    `SELECT id, difficulty, is_compound FROM exercises WHERE id = $1`,
    [exerciseId]
  );

  const category = inferExerciseCategory(exerciseId);
  const weights = CATEGORY_STAT_WEIGHTS[category] || DEFAULT_WEIGHTS;

  // Base score from volume
  const volumeScore = sets * reps;

  // Difficulty multiplier (1-5 scale)
  const difficultyMultiplier = 1 + ((exercise?.difficulty || 2) - 1) * 0.1;

  // Weight factor for strength/power
  const weightFactor = weight ? Math.log10(weight + 1) / 2 : 0.5;

  // Base contribution
  const baseContribution = volumeScore * difficultyMultiplier * 0.1; // Scale factor

  const contributions: StatContributions = {
    strength: 0,
    constitution: 0,
    dexterity: 0,
    power: 0,
    endurance: 0,
  };

  for (const [stat, statWeight] of Object.entries(weights)) {
    let contribution = baseContribution * (statWeight || 0);

    // Stat-specific adjustments
    switch (stat) {
      case 'strength':
        contribution *= 1 + weightFactor;
        break;
      case 'power':
        if (reps <= 5) contribution *= 1.3;
        break;
      case 'endurance':
        if (reps >= 15) contribution *= 1.5;
        else if (reps >= 10) contribution *= 1.2;
        break;
      case 'dexterity':
        if (exerciseId.startsWith('BW-')) contribution *= 1.4;
        if ((exercise?.difficulty || 2) >= 4) contribution *= 1.2;
        break;
    }

    contributions[stat as keyof StatContributions] = contribution;
  }

  return contributions;
}

/**
 * Update character stats after a workout
 */
export async function updateStatsFromWorkout(
  userId: string,
  exercises: WorkoutExercise[]
): Promise<CharacterStats> {
  // Calculate contributions from all exercises
  const totalContributions: StatContributions = {
    strength: 0,
    constitution: 0,
    dexterity: 0,
    power: 0,
    endurance: 0,
  };

  for (const ex of exercises) {
    const contribution = await calculateExerciseStatContribution(
      ex.exerciseId,
      ex.sets,
      ex.reps || 10,
      ex.weight || 0
    );

    for (const stat of Object.keys(totalContributions) as (keyof StatContributions)[]) {
      totalContributions[stat] += contribution[stat];
    }
  }

  // Cap contributions per workout (prevent gaming)
  const maxContributionPerWorkout = 5;
  for (const stat of Object.keys(totalContributions) as (keyof StatContributions)[]) {
    totalContributions[stat] = Math.min(totalContributions[stat], maxContributionPerWorkout);
  }

  // Constitution bonus for consistency
  const recentWorkouts = await queryOne<{ count: string }>(
    `SELECT COUNT(*) as count FROM workouts
     WHERE user_id = $1 AND date >= CURRENT_DATE - INTERVAL '7 days'`,
    [userId]
  );

  const consistencyBonus = Math.min(parseInt(recentWorkouts?.count || '0') * 0.2, 1.0);
  totalContributions.constitution += consistencyBonus;

  // Update or create stats record with optimistic locking
  const MAX_RETRIES = 3;
  let retryCount = 0;

  while (retryCount < MAX_RETRIES) {
    try {
      return await transaction(async (client) => {
        // Get existing stats with row lock
        const existing = await client.query<{
          user_id: string;
          strength: number;
          constitution: number;
          dexterity: number;
          power: number;
          endurance: number;
          vitality: number;
          version: number;
        }>(
          `SELECT * FROM character_stats WHERE user_id = $1 FOR UPDATE`,
          [userId]
        );

        if (existing.rows.length > 0) {
          const currentVersion = existing.rows[0].version;

          // Update existing stats with optimistic locking (version check)
          const updateResult = await client.query(
            `UPDATE character_stats SET
              strength = strength + $2,
              constitution = constitution + $3,
              dexterity = dexterity + $4,
              power = power + $5,
              endurance = endurance + $6,
              vitality = (strength + $2 + constitution + $3 + dexterity + $4 + power + $5 + endurance + $6) / 5,
              last_calculated_at = NOW(),
              version = version + 1,
              updated_at = NOW()
            WHERE user_id = $1 AND version = $7
            RETURNING user_id`,
            [
              userId,
              totalContributions.strength,
              totalContributions.constitution,
              totalContributions.dexterity,
              totalContributions.power,
              totalContributions.endurance,
              currentVersion,
            ]
          );

          // If no rows updated, version mismatch (concurrent update)
          if (updateResult.rows.length === 0) {
            const error = new Error('Version conflict - stats were updated by another request');
            (error as any).code = 'VERSION_CONFLICT';
            throw error;
          }
        } else {
          // Create new stats record with ON CONFLICT to handle race conditions
          const vitality =
            (totalContributions.strength +
              totalContributions.constitution +
              totalContributions.dexterity +
              totalContributions.power +
              totalContributions.endurance) /
            5;

          await client.query(
            `INSERT INTO character_stats (user_id, strength, constitution, dexterity, power, endurance, vitality, version)
             VALUES ($1, $2, $3, $4, $5, $6, $7, 1)
             ON CONFLICT (user_id) DO UPDATE SET
               strength = character_stats.strength + EXCLUDED.strength,
               constitution = character_stats.constitution + EXCLUDED.constitution,
               dexterity = character_stats.dexterity + EXCLUDED.dexterity,
               power = character_stats.power + EXCLUDED.power,
               endurance = character_stats.endurance + EXCLUDED.endurance,
               vitality = (character_stats.strength + EXCLUDED.strength + character_stats.constitution + EXCLUDED.constitution + character_stats.dexterity + EXCLUDED.dexterity + character_stats.power + EXCLUDED.power + character_stats.endurance + EXCLUDED.endurance) / 5,
               last_calculated_at = NOW(),
               version = character_stats.version + 1,
               updated_at = NOW()`,
            [
              userId,
              totalContributions.strength,
              totalContributions.constitution,
              totalContributions.dexterity,
              totalContributions.power,
              totalContributions.endurance,
              vitality,
            ]
          );
        }

        // Get updated stats
        const result = await client.query(
          `SELECT user_id as "userId", strength, constitution, dexterity, power, endurance, vitality,
                  last_calculated_at as "lastCalculatedAt", version
           FROM character_stats WHERE user_id = $1`,
          [userId]
        );

        // Invalidate user stats cache
        await CacheInvalidation.onUserStatsUpdated(userId);

        return result.rows[0] as CharacterStats;
      });
    } catch (error: any) {
      // Retry on version conflict
      if (error.code === 'VERSION_CONFLICT' && retryCount < MAX_RETRIES - 1) {
        retryCount++;
        log.warn({ userId, retryCount }, 'Stats version conflict, retrying...');
        // Small delay before retry to reduce contention
        await new Promise(resolve => setTimeout(resolve, 50 * retryCount));
        continue;
      }
      throw error;
    }
  }

  // This should never be reached, but TypeScript needs it
  throw new Error('Failed to update stats after max retries');
}

/**
 * Get user's current stats (cached)
 */
export async function getUserStats(userId: string): Promise<CharacterStats> {
  return cache.getOrSet(
    `${CACHE_PREFIX.USER_STATS}${userId}`,
    CACHE_TTL.USER_STATS,
    async () => {
      let stats = await queryOne<CharacterStats>(
        `SELECT user_id as "userId", strength, constitution, dexterity, power, endurance, vitality,
                last_calculated_at as "lastCalculatedAt", version
         FROM character_stats WHERE user_id = $1`,
        [userId]
      );

      if (!stats) {
        // Initialize empty stats for new user
        await query(
          `INSERT INTO character_stats (user_id, strength, constitution, dexterity, power, endurance, vitality)
           VALUES ($1, 0, 0, 0, 0, 0, 0)
           ON CONFLICT (user_id) DO NOTHING`,
          [userId]
        );

        stats = await queryOne<CharacterStats>(
          `SELECT user_id as "userId", strength, constitution, dexterity, power, endurance, vitality,
                  last_calculated_at as "lastCalculatedAt", version
           FROM character_stats WHERE user_id = $1`,
          [userId]
        );
      }

      return stats!;
    }
  );
}

/**
 * Get stats history for progress charts
 *
 * PERF-004: Optimized from ~1s to <200ms using:
 * - BRIN index on snapshot_date (efficient for time-series data)
 * - Covering index with INCLUDE clause (avoids heap lookups)
 * - Parameterized date filter (uses index properly)
 * - Caching for repeated queries within short timeframe
 */
export async function getStatsHistory(
  userId: string,
  days: number = 30
): Promise<
  Array<{
    snapshotDate: string;
    strength: number;
    constitution: number;
    dexterity: number;
    power: number;
    endurance: number;
    vitality: number;
  }>
> {
  // Use cache for repeated queries (same user, same days)
  const cacheKey = `${CACHE_PREFIX.USER_STATS}history:${userId}:${days}`;

  return cache.getOrSet(cacheKey, 60, async () => { // 60 second cache
    // Calculate the cutoff date in the application to use parameterized query
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    const cutoffDateStr = cutoffDate.toISOString().split('T')[0];

    const history = await queryAll<{
      snapshot_date: string;
      strength: number;
      constitution: number;
      dexterity: number;
      power: number;
      endurance: number;
      vitality: number;
    }>(
      `SELECT snapshot_date, strength, constitution, dexterity, power, endurance, vitality
       FROM character_stats_history
       WHERE user_id = $1 AND snapshot_date >= $2
       ORDER BY snapshot_date ASC`,
      [userId, cutoffDateStr]
    );

    return history.map((h) => ({
      snapshotDate: h.snapshot_date,
      strength: Number(h.strength),
      constitution: Number(h.constitution),
      dexterity: Number(h.dexterity),
      power: Number(h.power),
      endurance: Number(h.endurance),
      vitality: Number(h.vitality),
    }));
  });
}

/**
 * Create daily snapshot of user's stats
 */
export async function createDailySnapshot(userId: string): Promise<void> {
  const stats = await getUserStats(userId);
  const today = new Date().toISOString().split('T')[0];
  const snapshotId = `snapshot_${crypto.randomBytes(12).toString('hex')}`;

  try {
    await query(
      `INSERT INTO character_stats_history
       (id, user_id, snapshot_date, snapshot_type, strength, constitution, dexterity, power, endurance, vitality)
       VALUES ($1, $2, $3, 'daily', $4, $5, $6, $7, $8, $9)
       ON CONFLICT (user_id, snapshot_date, snapshot_type) DO UPDATE SET
         strength = EXCLUDED.strength,
         constitution = EXCLUDED.constitution,
         dexterity = EXCLUDED.dexterity,
         power = EXCLUDED.power,
         endurance = EXCLUDED.endurance,
         vitality = EXCLUDED.vitality`,
      [
        snapshotId,
        userId,
        today,
        stats.strength,
        stats.constitution,
        stats.dexterity,
        stats.power,
        stats.endurance,
        stats.vitality,
      ]
    );
  } catch (error) {
    log.warn({ userId, error }, 'Failed to create daily snapshot');
  }
}

/**
 * Get extended profile (gender, location)
 */
export async function getExtendedProfile(userId: string): Promise<ExtendedProfile> {
  let profile = await queryOne<ExtendedProfile>(
    `SELECT user_id as "userId", gender, city, county, state, country,
            country_code as "countryCode", leaderboard_opt_in as "leaderboardOptIn",
            profile_visibility as "profileVisibility"
     FROM user_profile_extended WHERE user_id = $1`,
    [userId]
  );

  if (!profile) {
    await query(
      `INSERT INTO user_profile_extended (user_id, leaderboard_opt_in, profile_visibility)
       VALUES ($1, true, 'public')
       ON CONFLICT (user_id) DO NOTHING`,
      [userId]
    );

    profile = await queryOne<ExtendedProfile>(
      `SELECT user_id as "userId", gender, city, county, state, country,
              country_code as "countryCode", leaderboard_opt_in as "leaderboardOptIn",
              profile_visibility as "profileVisibility"
       FROM user_profile_extended WHERE user_id = $1`,
      [userId]
    );
  }

  return profile!;
}

/**
 * Update extended profile
 */
export async function updateExtendedProfile(
  userId: string,
  updates: Partial<{
    gender: string;
    city: string;
    county: string;
    state: string;
    country: string;
    countryCode: string;
    leaderboardOptIn: boolean;
    profileVisibility: string;
  }>
): Promise<ExtendedProfile> {
  // Ensure profile exists
  await getExtendedProfile(userId);

  const fieldMappings: Record<string, string> = {
    gender: 'gender',
    city: 'city',
    county: 'county',
    state: 'state',
    country: 'country',
    countryCode: 'country_code',
    leaderboardOptIn: 'leaderboard_opt_in',
    profileVisibility: 'profile_visibility',
  };

  const setClauses: string[] = ['updated_at = NOW()'];
  const values: unknown[] = [];
  let paramIndex = 1;

  for (const [key, value] of Object.entries(updates)) {
    const dbField = fieldMappings[key];
    if (dbField && value !== undefined) {
      setClauses.push(`${dbField} = $${paramIndex}`);
      values.push(value);
      paramIndex++;
    }
  }

  if (values.length > 0) {
    values.push(userId);
    await query(
      `UPDATE user_profile_extended SET ${setClauses.join(', ')} WHERE user_id = $${paramIndex}`,
      values
    );
  }

  return getExtendedProfile(userId);
}

/**
 * Get leaderboard rankings (cached)
 *
 * PERF-001: Optimized using:
 * - Covering index on character_stats
 * - Keyset pagination support via cursor
 * - Short TTL caching for frequently accessed data
 */
export async function getLeaderboard(options: {
  statType?: StatType;
  scope?: 'global' | 'country' | 'state' | 'city';
  scopeValue?: string;
  gender?: string;
  limit?: number;
  offset?: number;
  cursor?: string; // Format: "statValue:userId" for keyset pagination
}): Promise<
  Array<{
    userId: string;
    username: string;
    avatarUrl: string | null;
    statValue: number;
    rank: number;
    gender?: string;
    country?: string;
    state?: string;
    city?: string;
  }>
> {
  const {
    statType = 'vitality',
    scope = 'global',
    scopeValue,
    gender,
    limit = 50,
    offset = 0,
    cursor,
  } = options;

  // Generate cache key based on query parameters
  const cacheKey = `${CACHE_PREFIX.LEADERBOARD}${cache.hashKey({ statType, scope, scopeValue, gender, limit, offset, cursor })}`;

  return cache.getOrSet(cacheKey, CACHE_TTL.LEADERBOARD, async () => {

  const whereConditions = ['1=1'];
  const params: unknown[] = [];
  let paramIndex = 1;

  // Only show users who opted in to leaderboards
  whereConditions.push('(up.leaderboard_opt_in = true OR up.leaderboard_opt_in IS NULL)');

  // Exclude users who have opted out via privacy mode (minimalist mode or explicit opt-out)
  whereConditions.push(`NOT EXISTS (
    SELECT 1 FROM user_privacy_mode pm
    WHERE pm.user_id = cs.user_id
    AND (pm.minimalist_mode = true OR pm.opt_out_leaderboards = true OR pm.exclude_from_stats_comparison = true)
  )`);

  // Gender filter
  if (gender) {
    whereConditions.push(`up.gender = $${paramIndex}`);
    params.push(gender);
    paramIndex++;
  }

  // Scope filter
  if (scope !== 'global' && scopeValue) {
    switch (scope) {
      case 'country':
        whereConditions.push(`up.country = $${paramIndex}`);
        break;
      case 'state':
        whereConditions.push(`up.state = $${paramIndex}`);
        break;
      case 'city':
        whereConditions.push(`up.city = $${paramIndex}`);
        break;
    }
    params.push(scopeValue);
    paramIndex++;
  }

  // Keyset pagination (O(1) performance vs O(n) for OFFSET)
  let startRank = offset + 1;
  if (cursor) {
    const [cursorValueStr, cursorUserId] = cursor.split(':');
    const cursorValue = parseFloat(cursorValueStr);
    if (!isNaN(cursorValue) && cursorUserId) {
      whereConditions.push(`(cs.${statType}, cs.user_id) < ($${paramIndex}, $${paramIndex + 1})`);
      params.push(cursorValue, cursorUserId);
      paramIndex += 2;
    }
  }

  params.push(limit);

  const results = await queryAll<{
    user_id: string;
    username: string;
    avatar_url: string | null;
    stat_value: number;
    gender: string | null;
    city: string | null;
    state: string | null;
    country: string | null;
  }>(
    `SELECT
      u.id as user_id,
      u.username,
      u.avatar_url,
      cs.${statType}::float as stat_value,
      up.gender,
      up.city,
      up.state,
      up.country
    FROM character_stats cs
    JOIN users u ON cs.user_id = u.id
    LEFT JOIN user_profile_extended up ON u.id = up.user_id
    WHERE ${whereConditions.join(' AND ')}
    ORDER BY cs.${statType} DESC, cs.user_id DESC
    LIMIT $${paramIndex}`,
    params
  );

  return results.map((r, i) => ({
    userId: r.user_id,
    username: r.username,
    avatarUrl: r.avatar_url,
    statValue: Number(r.stat_value),
    rank: startRank + i,
    gender: r.gender || undefined,
    country: r.country || undefined,
    state: r.state || undefined,
    city: r.city || undefined,
  }));
  });
}

/**
 * Get user's rankings across different scopes
 */
export async function getUserRankings(
  userId: string
): Promise<Record<StatType, RankingsByScope>> {
  const _stats = await getUserStats(userId);
  const profile = await getExtendedProfile(userId);

  const rankings: Record<StatType, RankingsByScope> = {} as any;

  for (const stat of Object.values(STAT_TYPES)) {
    // Global ranking
    const globalRank = await queryOne<{ rank: string }>(
      `SELECT COUNT(*) + 1 as rank FROM character_stats
       WHERE ${stat} > (SELECT ${stat} FROM character_stats WHERE user_id = $1)`,
      [userId]
    );

    const totalUsers = await queryOne<{ count: string }>(
      `SELECT COUNT(*) as count FROM character_stats`
    );

    const total = parseInt(totalUsers?.count || '0');
    const rank = parseInt(globalRank?.rank || '1');

    rankings[stat] = {
      global: {
        rank,
        total,
        // CORRECT: percentile = ((total - rank) / total) * 100
        percentile: total > 0 ? Math.round(((total - rank) / total) * 100 * 10) / 10 : 100,
      },
    };

    // Country ranking
    if (profile.country) {
      const countryRank = await queryOne<{ rank: string }>(
        `SELECT COUNT(*) + 1 as rank FROM character_stats cs
         JOIN user_profile_extended up ON cs.user_id = up.user_id
         WHERE up.country = $1 AND cs.${stat} > (SELECT ${stat} FROM character_stats WHERE user_id = $2)`,
        [profile.country, userId]
      );

      const countryTotal = await queryOne<{ count: string }>(
        `SELECT COUNT(*) as count FROM character_stats cs
         JOIN user_profile_extended up ON cs.user_id = up.user_id
         WHERE up.country = $1`,
        [profile.country]
      );

      const cTotal = parseInt(countryTotal?.count || '0');
      const cRank = parseInt(countryRank?.rank || '1');

      rankings[stat].country = {
        rank: cRank,
        total: cTotal,
        // CORRECT: percentile = ((total - rank) / total) * 100
        percentile: cTotal > 0 ? Math.round(((cTotal - cRank) / cTotal) * 100 * 10) / 10 : 100,
      };
    }
  }

  return rankings;
}

/**
 * Recalculate all stats from workout history
 */
export async function recalculateAllStats(userId: string): Promise<CharacterStats> {
  // Reset stats
  await query(
    `UPDATE character_stats SET
      strength = 0, constitution = 0, dexterity = 0, power = 0, endurance = 0, vitality = 0,
      updated_at = NOW()
     WHERE user_id = $1`,
    [userId]
  );

  // Get all workouts
  const workouts = await queryAll<{ exercise_data: WorkoutExercise[] | null }>(
    `SELECT exercise_data FROM workouts WHERE user_id = $1 ORDER BY date ASC`,
    [userId]
  );

  // Recalculate from each workout
  for (const workout of workouts) {
    // JSONB columns return JavaScript objects, not strings
    const exercises = (workout.exercise_data || []) as WorkoutExercise[];
    if (exercises.length > 0) {
      await updateStatsFromWorkout(userId, exercises);
    }
  }

  return getUserStats(userId);
}

// Export the service
export const statsService = {
  STAT_TYPES,
  updateStatsFromWorkout,
  getUserStats,
  getStatsHistory,
  createDailySnapshot,
  getExtendedProfile,
  updateExtendedProfile,
  getLeaderboard,
  getUserRankings,
  recalculateAllStats,
};

export default statsService;
