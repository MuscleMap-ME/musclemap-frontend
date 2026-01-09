/**
 * Leaderboards Module
 *
 * Handles exercise-based leaderboards for hangouts:
 * - Process workout data into leaderboard entries
 * - Query leaderboards with cohort filtering (gender, age, adaptive)
 * - Calculate user rankings
 * - Support daily, weekly, monthly, and all-time periods
 */

import crypto from 'crypto';
import { queryOne, queryAll, query, transaction } from '../../db/client';
import { getRedis, isRedisAvailable } from '../../lib/redis';
import { loggers } from '../../lib/logger';
import { achievementService } from '../achievements';
import { earningService } from '../economy/earning.service';

const log = loggers.core;

// Cache settings
const LEADERBOARD_CACHE_TTL = 60; // 1 minute
const LEADERBOARD_CACHE_PREFIX = 'lb:';

// Period types
export const PERIOD_TYPES = {
  DAILY: 'daily',
  WEEKLY: 'weekly',
  MONTHLY: 'monthly',
  ALL_TIME: 'all_time',
} as const;

export type PeriodType = (typeof PERIOD_TYPES)[keyof typeof PERIOD_TYPES];

// Verification statuses
export const VERIFICATION_STATUS = {
  SELF_REPORTED: 'self_reported',
  PENDING_REVIEW: 'pending_review',
  VERIFIED: 'verified',
  REJECTED: 'rejected',
} as const;

export type VerificationStatus = (typeof VERIFICATION_STATUS)[keyof typeof VERIFICATION_STATUS];

// Types
export interface ExerciseMetricDefinition {
  id: string;
  exerciseId: string;
  metricKey: string;
  displayName: string;
  unit: string;
  direction: 'higher' | 'lower';
  calculationType: string;
  enabled: boolean;
}

export interface LeaderboardEntry {
  rank: number;
  userId: string;
  username: string;
  displayName?: string;
  avatarUrl?: string;
  value: number;
  verificationStatus: VerificationStatus;
  achievedAt: Date;
  genderCategory?: string;
  ageBand?: string;
  adaptiveCategory?: string;
}

export interface LeaderboardQuery {
  exerciseId: string;
  metricKey: string;
  periodType: PeriodType;
  periodStart?: Date;
  hangoutId?: number;
  virtualHangoutId?: number;
  genderCategory?: string;
  ageBand?: string;
  adaptiveCategory?: string;
  verificationStatus?: VerificationStatus | 'all';
  limit?: number;
  offset?: number;
}

export interface UserRankResult {
  rank: number;
  value: number;
  total: number;
  percentile: number;
}

export interface WorkoutSet {
  reps?: number;
  weight?: number;
  duration?: number;
  distance?: number;
}

export interface WorkoutExerciseData {
  exerciseId: string;
  sets: WorkoutSet[];
}

// Service
export const leaderboardService = {
  /**
   * Get metric definitions for an exercise
   */
  async getMetricDefinitions(exerciseId: string): Promise<ExerciseMetricDefinition[]> {
    const rows = await queryAll<{
      id: string;
      exercise_id: string;
      metric_key: string;
      display_name: string;
      unit: string;
      direction: string;
      calculation_type: string;
      enabled: boolean;
    }>(
      `SELECT * FROM exercise_metric_definitions
       WHERE exercise_id = $1 AND enabled = TRUE`,
      [exerciseId]
    );

    return rows.map((r) => ({
      id: r.id,
      exerciseId: r.exercise_id,
      metricKey: r.metric_key,
      displayName: r.display_name,
      unit: r.unit,
      direction: r.direction as 'higher' | 'lower',
      calculationType: r.calculation_type,
      enabled: r.enabled,
    }));
  },

  /**
   * Calculate metric value from workout sets
   */
  calculateMetricValue(sets: WorkoutSet[], calculationType: string, metricKey: string): number | null {
    if (!sets || sets.length === 0) return null;

    switch (calculationType) {
      case 'max_single':
        if (metricKey.includes('reps')) {
          const maxReps = Math.max(...sets.map((s) => s.reps || 0));
          return maxReps > 0 ? maxReps : null;
        }
        if (metricKey.includes('weight')) {
          const maxWeight = Math.max(...sets.map((s) => s.weight || 0));
          return maxWeight > 0 ? maxWeight : null;
        }
        if (metricKey.includes('duration') || metricKey.includes('time')) {
          const maxDuration = Math.max(...sets.map((s) => s.duration || 0));
          return maxDuration > 0 ? maxDuration : null;
        }
        return null;

      case 'sum_day':
      case 'total_volume':
        if (metricKey.includes('reps')) {
          const totalReps = sets.reduce((sum, s) => sum + (s.reps || 0), 0);
          return totalReps > 0 ? totalReps : null;
        }
        if (metricKey.includes('volume')) {
          const totalVolume = sets.reduce((sum, s) => sum + ((s.reps || 0) * (s.weight || 0)), 0);
          return totalVolume > 0 ? totalVolume : null;
        }
        return null;

      case 'min_single':
        if (metricKey.includes('time') || metricKey.includes('duration')) {
          const times = sets.map((s) => s.duration || 0).filter((t) => t > 0);
          return times.length > 0 ? Math.min(...times) : null;
        }
        return null;

      case 'avg_session':
        if (metricKey.includes('weight')) {
          const weights = sets.map((s) => s.weight || 0).filter((w) => w > 0);
          return weights.length > 0 ? weights.reduce((a, b) => a + b, 0) / weights.length : null;
        }
        return null;

      default:
        return null;
    }
  },

  /**
   * Get period start date for a given period type
   */
  getPeriodStart(periodType: PeriodType, date: Date = new Date()): Date {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);

    switch (periodType) {
      case 'daily':
        return d;
      case 'weekly':
        d.setDate(d.getDate() - d.getDay()); // Start of week (Sunday)
        return d;
      case 'monthly':
        d.setDate(1); // First of month
        return d;
      case 'all_time':
        return new Date('2020-01-01');
      default:
        return d;
    }
  },

  /**
   * Process a workout and update leaderboard entries
   */
  async processWorkout(
    userId: string,
    workoutId: string,
    exercises: WorkoutExerciseData[],
    hangoutId?: number,
    virtualHangoutId?: number
  ): Promise<void> {
    const now = new Date();

    for (const exercise of exercises) {
      // Get metric definitions for this exercise
      const metrics = await this.getMetricDefinitions(exercise.exerciseId);

      for (const metric of metrics) {
        const value = this.calculateMetricValue(exercise.sets, metric.calculationType, metric.metricKey);
        if (value === null) continue;

        // Update entries for all period types
        for (const periodType of Object.values(PERIOD_TYPES)) {
          await this.upsertEntry({
            userId,
            exerciseId: exercise.exerciseId,
            metricKey: metric.metricKey,
            hangoutId,
            virtualHangoutId,
            periodType,
            periodStart: this.getPeriodStart(periodType, now),
            value,
            direction: metric.direction,
            sourceWorkoutId: workoutId,
          });
        }
      }
    }

    // Invalidate relevant caches
    await this.invalidateCaches(hangoutId, virtualHangoutId, exercises.map((e) => e.exerciseId));
  },

  /**
   * Upsert a leaderboard entry
   */
  async upsertEntry(params: {
    userId: string;
    exerciseId: string;
    metricKey: string;
    hangoutId?: number;
    virtualHangoutId?: number;
    periodType: PeriodType;
    periodStart: Date;
    value: number;
    direction: 'higher' | 'lower';
    sourceWorkoutId?: string;
  }): Promise<{ isNewRecord: boolean; isPersonalBest: boolean; previousValue?: number }> {
    const {
      userId,
      exerciseId,
      metricKey,
      hangoutId,
      virtualHangoutId,
      periodType,
      periodStart,
      value,
      direction,
      sourceWorkoutId,
    } = params;

    // Check existing entry
    const existing = await queryOne<{ id: string; value: string }>(
      `SELECT id, value FROM leaderboard_entries
       WHERE user_id = $1 AND exercise_id = $2 AND metric_key = $3
         AND COALESCE(hangout_id::text, 'null') = COALESCE($4::text, 'null')
         AND COALESCE(virtual_hangout_id::text, 'null') = COALESCE($5::text, 'null')
         AND period_type = $6 AND period_start = $7`,
      [userId, exerciseId, metricKey, hangoutId, virtualHangoutId, periodType, periodStart.toISOString().split('T')[0]]
    );

    const previousValue = existing ? parseFloat(existing.value) : undefined;
    const shouldUpdate =
      !existing ||
      (direction === 'higher' ? value > parseFloat(existing.value) : value < parseFloat(existing.value));

    if (shouldUpdate) {
      const entryId = existing?.id || `le_${crypto.randomBytes(12).toString('hex')}`;

      await query(
        `INSERT INTO leaderboard_entries
         (id, user_id, exercise_id, metric_key, hangout_id, virtual_hangout_id, period_type, period_start, value, source_workout_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         ON CONFLICT (user_id, exercise_id, metric_key, COALESCE(hangout_id::text, 'null'), COALESCE(virtual_hangout_id::text, 'null'), period_type, period_start)
         DO UPDATE SET value = $9, source_workout_id = $10, updated_at = NOW()`,
        [entryId, userId, exerciseId, metricKey, hangoutId, virtualHangoutId, periodType, periodStart.toISOString().split('T')[0], value, sourceWorkoutId]
      );

      // Check for records and achievements if this is an all-time entry
      if (periodType === 'all_time' && (direction === 'higher' ? value > (previousValue || 0) : value < (previousValue || Infinity))) {
        const isPersonalBest = !previousValue || (direction === 'higher' ? value > previousValue : value < previousValue);

        // Check if this is a hangout or global record
        const { isHangoutRecord, isGlobalRecord } = await this.checkForRecords(
          userId,
          exerciseId,
          metricKey,
          value,
          direction,
          hangoutId,
          virtualHangoutId
        );

        // Grant achievements
        await achievementService.checkRecordAchievements(
          userId,
          isPersonalBest,
          isHangoutRecord,
          isGlobalRecord,
          hangoutId,
          virtualHangoutId,
          exerciseId,
          metricKey,
          value
        );

        // Award credits for personal record (non-blocking)
        if (isPersonalBest) {
          try {
            await earningService.onPersonalRecord({
              userId,
              exerciseId,
              metricKey,
              value,
              previousValue,
            });
          } catch (earningError) {
            log.error({ earningError, userId, exerciseId }, 'Failed to process personal record earning');
          }
        }

        // Check rank achievements
        const rank = await this.getUserRank(userId, {
          exerciseId,
          metricKey,
          periodType: 'all_time',
          hangoutId,
          virtualHangoutId,
        });
        if (rank) {
          await achievementService.checkTopRankAchievements(
            userId,
            rank.rank,
            hangoutId,
            virtualHangoutId,
            exerciseId,
            metricKey
          );

          // Award credits for leaderboard placement (non-blocking)
          try {
            await earningService.onLeaderboardPlacement({
              userId,
              leaderboardId: `${exerciseId}-${metricKey}-${hangoutId || virtualHangoutId || 'global'}`,
              rank: rank.rank,
              periodType: 'all_time',
            });
          } catch (earningError) {
            log.error({ earningError, userId, rank: rank.rank }, 'Failed to process leaderboard earning');
          }
        }

        return { isNewRecord: isHangoutRecord || isGlobalRecord, isPersonalBest, previousValue };
      }
    }

    return { isNewRecord: false, isPersonalBest: false, previousValue };
  },

  /**
   * Check if a value is a hangout or global record
   */
  async checkForRecords(
    userId: string,
    exerciseId: string,
    metricKey: string,
    value: number,
    direction: 'higher' | 'lower',
    hangoutId?: number,
    virtualHangoutId?: number
  ): Promise<{ isHangoutRecord: boolean; isGlobalRecord: boolean }> {
    let isHangoutRecord = false;
    let isGlobalRecord = false;

    const orderDirection = direction === 'higher' ? 'DESC' : 'ASC';

    // Check hangout record
    if (hangoutId || virtualHangoutId) {
      const topHangout = await queryOne<{ value: string; user_id: string }>(
        `SELECT value, user_id FROM leaderboard_entries
         WHERE exercise_id = $1 AND metric_key = $2 AND period_type = 'all_time'
           AND COALESCE(hangout_id::text, 'null') = COALESCE($3::text, 'null')
           AND COALESCE(virtual_hangout_id::text, 'null') = COALESCE($4::text, 'null')
         ORDER BY value ${orderDirection}
         LIMIT 1`,
        [exerciseId, metricKey, hangoutId, virtualHangoutId]
      );

      if (!topHangout || (direction === 'higher' ? value > parseFloat(topHangout.value) : value < parseFloat(topHangout.value))) {
        isHangoutRecord = true;
      }
    }

    // Check global record
    const topGlobal = await queryOne<{ value: string; user_id: string }>(
      `SELECT value, user_id FROM leaderboard_entries
       WHERE exercise_id = $1 AND metric_key = $2 AND period_type = 'all_time'
         AND hangout_id IS NULL AND virtual_hangout_id IS NULL
       ORDER BY value ${orderDirection}
       LIMIT 1`,
      [exerciseId, metricKey]
    );

    if (!topGlobal || (direction === 'higher' ? value > parseFloat(topGlobal.value) : value < parseFloat(topGlobal.value))) {
      isGlobalRecord = true;
    }

    return { isHangoutRecord, isGlobalRecord };
  },

  /**
   * Get leaderboard entries
   */
  async getLeaderboard(queryParams: LeaderboardQuery): Promise<{ entries: LeaderboardEntry[]; total: number }> {
    const {
      exerciseId,
      metricKey,
      periodType,
      periodStart = this.getPeriodStart(periodType),
      hangoutId,
      virtualHangoutId,
      genderCategory,
      ageBand,
      adaptiveCategory,
      verificationStatus = 'all',
      limit = 50,
      offset = 0,
    } = queryParams;

    // Try cache first
    const cacheKey = this.getCacheKey(queryParams);
    if (isRedisAvailable()) {
      const redis = getRedis();
      if (redis) {
        const cached = await redis.get(cacheKey);
        if (cached) {
          try {
            return JSON.parse(cached);
          } catch {
            // Invalid cache
          }
        }
      }
    }

    // Get metric direction
    const metric = await queryOne<{ direction: string }>(
      'SELECT direction FROM exercise_metric_definitions WHERE exercise_id = $1 AND metric_key = $2',
      [exerciseId, metricKey]
    );
    const direction = metric?.direction || 'higher';
    const orderDirection = direction === 'higher' ? 'DESC' : 'ASC';

    // Build query
    let whereClause = `le.exercise_id = $1 AND le.metric_key = $2 AND le.period_type = $3 AND le.period_start = $4`;
    const params: unknown[] = [exerciseId, metricKey, periodType, periodStart.toISOString().split('T')[0]];
    let paramIndex = 5;

    // Hangout filter
    if (hangoutId) {
      whereClause += ` AND le.hangout_id = $${paramIndex++}`;
      params.push(hangoutId);
    } else if (virtualHangoutId) {
      whereClause += ` AND le.virtual_hangout_id = $${paramIndex++}`;
      params.push(virtualHangoutId);
    } else {
      whereClause += ' AND le.hangout_id IS NULL AND le.virtual_hangout_id IS NULL';
    }

    // Cohort filters
    if (genderCategory && genderCategory !== 'open') {
      whereClause += ` AND ucp.gender_category = $${paramIndex++} AND ucp.gender_visible = TRUE`;
      params.push(genderCategory);
    }
    if (ageBand && ageBand !== 'open') {
      whereClause += ` AND ucp.age_band = $${paramIndex++} AND ucp.age_visible = TRUE`;
      params.push(ageBand);
    }
    if (adaptiveCategory && adaptiveCategory !== 'open') {
      whereClause += ` AND ucp.adaptive_category = $${paramIndex++} AND ucp.adaptive_visible = TRUE`;
      params.push(adaptiveCategory);
    }

    // Verification filter
    if (verificationStatus !== 'all') {
      whereClause += ` AND le.verification_status = $${paramIndex++}`;
      params.push(verificationStatus);
    }

    // Leaderboard opt-in check
    whereClause += ` AND (ucp.show_on_leaderboards IS NULL OR ucp.show_on_leaderboards = TRUE)`;

    params.push(limit, offset);

    const rows = await queryAll<{
      id: string;
      user_id: string;
      username: string;
      display_name: string | null;
      avatar_url: string | null;
      value: string;
      verification_status: string;
      updated_at: Date;
      gender_category: string | null;
      age_band: string | null;
      adaptive_category: string | null;
    }>(
      `SELECT le.id, le.user_id, u.username, u.display_name, u.avatar_url,
              le.value, le.verification_status, le.updated_at,
              ucp.gender_category, ucp.age_band, ucp.adaptive_category
       FROM leaderboard_entries le
       JOIN users u ON u.id = le.user_id
       LEFT JOIN user_cohort_preferences ucp ON ucp.user_id = le.user_id
       WHERE ${whereClause}
       ORDER BY le.value ${orderDirection}
       LIMIT $${paramIndex++} OFFSET $${paramIndex++}`,
      params
    );

    // Get total count
    const countParams = params.slice(0, -2); // Remove limit/offset
    const countResult = await queryOne<{ count: string }>(
      `SELECT COUNT(*) as count
       FROM leaderboard_entries le
       JOIN users u ON u.id = le.user_id
       LEFT JOIN user_cohort_preferences ucp ON ucp.user_id = le.user_id
       WHERE ${whereClause}`,
      countParams
    );

    const result = {
      entries: rows.map((r, i) => ({
        rank: offset + i + 1,
        userId: r.user_id,
        username: r.username,
        displayName: r.display_name ?? undefined,
        avatarUrl: r.avatar_url ?? undefined,
        value: parseFloat(r.value),
        verificationStatus: r.verification_status as VerificationStatus,
        achievedAt: r.updated_at,
        genderCategory: r.gender_category ?? undefined,
        ageBand: r.age_band ?? undefined,
        adaptiveCategory: r.adaptive_category ?? undefined,
      })),
      total: parseInt(countResult?.count || '0'),
    };

    // Cache result
    if (isRedisAvailable()) {
      const redis = getRedis();
      if (redis) {
        await redis.set(cacheKey, JSON.stringify(result), 'EX', LEADERBOARD_CACHE_TTL);
      }
    }

    return result;
  },

  /**
   * Get user's rank on a leaderboard
   */
  async getUserRank(
    userId: string,
    queryParams: Omit<LeaderboardQuery, 'limit' | 'offset'>
  ): Promise<UserRankResult | null> {
    const {
      exerciseId,
      metricKey,
      periodType,
      periodStart = this.getPeriodStart(periodType),
      hangoutId,
      virtualHangoutId,
      genderCategory,
      ageBand,
      adaptiveCategory,
    } = queryParams;

    // Get metric direction
    const metric = await queryOne<{ direction: string }>(
      'SELECT direction FROM exercise_metric_definitions WHERE exercise_id = $1 AND metric_key = $2',
      [exerciseId, metricKey]
    );
    const direction = metric?.direction || 'higher';

    // Get user's entry
    const userEntry = await queryOne<{ value: string }>(
      `SELECT value FROM leaderboard_entries
       WHERE user_id = $1 AND exercise_id = $2 AND metric_key = $3
         AND period_type = $4 AND period_start = $5
         AND COALESCE(hangout_id::text, 'null') = COALESCE($6::text, 'null')
         AND COALESCE(virtual_hangout_id::text, 'null') = COALESCE($7::text, 'null')`,
      [userId, exerciseId, metricKey, periodType, periodStart.toISOString().split('T')[0], hangoutId, virtualHangoutId]
    );

    if (!userEntry) return null;

    const userValue = parseFloat(userEntry.value);
    const comparison = direction === 'higher' ? '>' : '<';

    // Build where clause for cohort filters
    let cohortWhere = '';
    const cohortParams: unknown[] = [];
    let paramIndex = 1;

    if (genderCategory && genderCategory !== 'open') {
      cohortWhere += ` AND ucp.gender_category = $${paramIndex++} AND ucp.gender_visible = TRUE`;
      cohortParams.push(genderCategory);
    }
    if (ageBand && ageBand !== 'open') {
      cohortWhere += ` AND ucp.age_band = $${paramIndex++} AND ucp.age_visible = TRUE`;
      cohortParams.push(ageBand);
    }
    if (adaptiveCategory && adaptiveCategory !== 'open') {
      cohortWhere += ` AND ucp.adaptive_category = $${paramIndex++} AND ucp.adaptive_visible = TRUE`;
      cohortParams.push(adaptiveCategory);
    }

    // Count users with better score
    const betterCount = await queryOne<{ count: string }>(
      `SELECT COUNT(*) as count
       FROM leaderboard_entries le
       LEFT JOIN user_cohort_preferences ucp ON ucp.user_id = le.user_id
       WHERE le.exercise_id = $${paramIndex++} AND le.metric_key = $${paramIndex++}
         AND le.period_type = $${paramIndex++} AND le.period_start = $${paramIndex++}
         AND COALESCE(le.hangout_id::text, 'null') = COALESCE($${paramIndex++}::text, 'null')
         AND COALESCE(le.virtual_hangout_id::text, 'null') = COALESCE($${paramIndex++}::text, 'null')
         AND le.value ${comparison} $${paramIndex++}
         AND (ucp.show_on_leaderboards IS NULL OR ucp.show_on_leaderboards = TRUE)
         ${cohortWhere}`,
      [...cohortParams, exerciseId, metricKey, periodType, periodStart.toISOString().split('T')[0], hangoutId, virtualHangoutId, userValue]
    );

    // Count total users
    const totalCount = await queryOne<{ count: string }>(
      `SELECT COUNT(*) as count
       FROM leaderboard_entries le
       LEFT JOIN user_cohort_preferences ucp ON ucp.user_id = le.user_id
       WHERE le.exercise_id = $${paramIndex++} AND le.metric_key = $${paramIndex++}
         AND le.period_type = $${paramIndex++} AND le.period_start = $${paramIndex++}
         AND COALESCE(le.hangout_id::text, 'null') = COALESCE($${paramIndex++}::text, 'null')
         AND COALESCE(le.virtual_hangout_id::text, 'null') = COALESCE($${paramIndex++}::text, 'null')
         AND (ucp.show_on_leaderboards IS NULL OR ucp.show_on_leaderboards = TRUE)
         ${cohortWhere}`,
      [...cohortParams, exerciseId, metricKey, periodType, periodStart.toISOString().split('T')[0], hangoutId, virtualHangoutId]
    );

    const rank = parseInt(betterCount?.count || '0') + 1;
    const total = parseInt(totalCount?.count || '0');
    const percentile = total > 0 ? Math.round(((total - rank + 1) / total) * 100 * 10) / 10 : 100;

    return { rank, value: userValue, total, percentile };
  },

  /**
   * Get cache key for a leaderboard query
   */
  getCacheKey(query: LeaderboardQuery): string {
    return `${LEADERBOARD_CACHE_PREFIX}${query.hangoutId || 'global'}:${query.virtualHangoutId || 'null'}:${query.exerciseId}:${query.metricKey}:${query.periodType}:${query.genderCategory || 'open'}:${query.ageBand || 'open'}:${query.adaptiveCategory || 'open'}`;
  },

  /**
   * Invalidate caches for specific hangouts and exercises
   */
  async invalidateCaches(hangoutId?: number, virtualHangoutId?: number, exerciseIds?: string[]): Promise<void> {
    if (!isRedisAvailable()) return;

    const redis = getRedis();
    if (!redis) return;

    const patterns: string[] = [];

    if (hangoutId) {
      patterns.push(`${LEADERBOARD_CACHE_PREFIX}${hangoutId}:*`);
    }
    if (virtualHangoutId) {
      patterns.push(`${LEADERBOARD_CACHE_PREFIX}global:${virtualHangoutId}:*`);
    }
    patterns.push(`${LEADERBOARD_CACHE_PREFIX}global:null:*`);

    for (const pattern of patterns) {
      try {
        const keys = await redis.keys(pattern);
        if (keys.length > 0) {
          await redis.del(...keys);
        }
      } catch (error) {
        log.warn({ pattern, error }, 'Failed to invalidate leaderboard cache');
      }
    }
  },

  /**
   * Get available exercises with metrics for a hangout
   */
  async getAvailableMetrics(hangoutId?: number, virtualHangoutId?: number): Promise<Array<{
    exerciseId: string;
    exerciseName: string;
    metrics: ExerciseMetricDefinition[];
  }>> {
    // Get exercises that have entries in this hangout
    const exercises = await queryAll<{
      exercise_id: string;
      exercise_name: string;
    }>(
      `SELECT DISTINCT le.exercise_id, e.name as exercise_name
       FROM leaderboard_entries le
       JOIN exercises e ON e.id = le.exercise_id
       WHERE COALESCE(le.hangout_id::text, 'null') = COALESCE($1::text, 'null')
         AND COALESCE(le.virtual_hangout_id::text, 'null') = COALESCE($2::text, 'null')
       ORDER BY e.name`,
      [hangoutId, virtualHangoutId]
    );

    const result: Array<{
      exerciseId: string;
      exerciseName: string;
      metrics: ExerciseMetricDefinition[];
    }> = [];

    for (const exercise of exercises) {
      const metrics = await this.getMetricDefinitions(exercise.exercise_id);
      if (metrics.length > 0) {
        result.push({
          exerciseId: exercise.exercise_id,
          exerciseName: exercise.exercise_name,
          metrics,
        });
      }
    }

    return result;
  },
};

export default leaderboardService;
