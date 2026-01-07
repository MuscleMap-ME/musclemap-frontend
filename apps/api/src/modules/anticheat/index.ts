/**
 * Anti-Cheat Module
 *
 * Prevents gaming of leaderboards through:
 * - Rate limiting (max submissions per day)
 * - Outlier detection (extreme jumps from previous values)
 * - Impossible value detection
 * - Suspicious pattern detection
 * - Geo-verification mismatches
 */

import crypto from 'crypto';
import { queryOne, queryAll, query, transaction } from '../../db/client';
import { loggers } from '../../lib/logger';

const log = loggers.core;

// Configuration
const MAX_SUBMISSIONS_PER_DAY = 100;
const OUTLIER_THRESHOLD_MULTIPLIER = 3; // 3x previous best is suspicious
const MIN_DATA_POINTS_FOR_OUTLIER = 3; // Need at least 3 data points to detect outliers

// Flag types
export const FLAG_TYPES = {
  RAPID_SUBMISSIONS: 'rapid_submissions',
  EXTREME_JUMP: 'extreme_jump',
  IMPOSSIBLE_VALUE: 'impossible_value',
  SUSPICIOUS_PATTERN: 'suspicious_pattern',
  GEO_MISMATCH: 'geo_mismatch',
  TIME_ANOMALY: 'time_anomaly',
} as const;

export type FlagType = (typeof FLAG_TYPES)[keyof typeof FLAG_TYPES];

// Severity levels
export const SEVERITY_LEVELS = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  CRITICAL: 'critical',
} as const;

export type Severity = (typeof SEVERITY_LEVELS)[keyof typeof SEVERITY_LEVELS];

// Flag statuses
export const FLAG_STATUS = {
  PENDING: 'pending',
  REVIEWED: 'reviewed',
  DISMISSED: 'dismissed',
  CONFIRMED: 'confirmed',
} as const;

export type FlagStatus = (typeof FLAG_STATUS)[keyof typeof FLAG_STATUS];

// Types
export interface SuspiciousFlag {
  id: string;
  userId: string;
  leaderboardEntryId?: string;
  workoutId?: string;
  flagType: FlagType;
  severity: Severity;
  details: Record<string, unknown>;
  status: FlagStatus;
  reviewedBy?: string;
  reviewedAt?: Date;
  createdAt: Date;
}

export interface RateLimitStatus {
  submissionsToday: number;
  maxSubmissions: number;
  isLimited: boolean;
  resetsAt: Date;
}

// Known physical limits for exercises (for impossible value detection)
const PHYSICAL_LIMITS: Record<string, { max: number; unit: string }> = {
  // Strength exercises (in kg)
  'max_weight:BB-PUSH-BENCH-PRESS': { max: 500, unit: 'kg' }, // World record ~350kg
  'max_weight:BB-SQUAT-BACK-SQUAT': { max: 600, unit: 'kg' }, // World record ~500kg
  'max_weight:BB-HINGE-DEADLIFT': { max: 600, unit: 'kg' }, // World record ~500kg
  // Rep-based exercises
  'max_reps:BW-PULL-PULL-UP': { max: 100, unit: 'reps' }, // Single set max
  'max_reps:BW-PUSH-PUSH-UP': { max: 200, unit: 'reps' }, // Single set max
  // Volume (total per day)
  'total_volume:BB-PUSH-BENCH-PRESS': { max: 50000, unit: 'kg' },
  'total_reps:BW-PULL-PULL-UP': { max: 500, unit: 'reps' },
};

// Service
export const antiCheatService = {
  /**
   * Check if user is rate limited
   */
  async checkRateLimit(userId: string): Promise<RateLimitStatus> {
    const today = new Date().toISOString().split('T')[0];
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);

    // Get or create rate limit record
    let record = await queryOne<{
      submissions_today: number;
      daily_reset_at: string;
    }>(
      'SELECT submissions_today, daily_reset_at FROM submission_rate_limits WHERE user_id = $1',
      [userId]
    );

    if (!record) {
      // Create new record
      await query(
        `INSERT INTO submission_rate_limits (user_id, submissions_today, daily_reset_at)
         VALUES ($1, 0, $2)
         ON CONFLICT (user_id) DO UPDATE SET submissions_today = 0, daily_reset_at = $2`,
        [userId, today]
      );
      record = { submissions_today: 0, daily_reset_at: today };
    }

    // Check if we need to reset the counter
    if (record.daily_reset_at !== today) {
      await query(
        'UPDATE submission_rate_limits SET submissions_today = 0, daily_reset_at = $2 WHERE user_id = $1',
        [userId, today]
      );
      record.submissions_today = 0;
    }

    return {
      submissionsToday: record.submissions_today,
      maxSubmissions: MAX_SUBMISSIONS_PER_DAY,
      isLimited: record.submissions_today >= MAX_SUBMISSIONS_PER_DAY,
      resetsAt: tomorrow,
    };
  },

  /**
   * Increment submission count
   */
  async incrementSubmissionCount(userId: string): Promise<void> {
    const today = new Date().toISOString().split('T')[0];

    await query(
      `INSERT INTO submission_rate_limits (user_id, submissions_today, last_submission_at, daily_reset_at)
       VALUES ($1, 1, NOW(), $2)
       ON CONFLICT (user_id) DO UPDATE SET
         submissions_today = CASE
           WHEN submission_rate_limits.daily_reset_at = $2 THEN submission_rate_limits.submissions_today + 1
           ELSE 1
         END,
         last_submission_at = NOW(),
         daily_reset_at = $2`,
      [userId, today]
    );
  },

  /**
   * Detect if a value is an outlier compared to user's history
   */
  async detectOutlier(
    userId: string,
    exerciseId: string,
    metricKey: string,
    value: number,
    direction: 'higher' | 'lower' = 'higher'
  ): Promise<{ isOutlier: boolean; previousBest?: number; jumpRatio?: number }> {
    // Get user's historical values
    const history = await queryAll<{ value: string }>(
      `SELECT value FROM leaderboard_entries
       WHERE user_id = $1 AND exercise_id = $2 AND metric_key = $3
       ORDER BY updated_at DESC
       LIMIT 10`,
      [userId, exerciseId, metricKey]
    );

    if (history.length < MIN_DATA_POINTS_FOR_OUTLIER) {
      return { isOutlier: false };
    }

    const values = history.map((h) => parseFloat(h.value));
    const previousBest = direction === 'higher' ? Math.max(...values) : Math.min(...values);

    if (previousBest === 0) {
      return { isOutlier: false, previousBest };
    }

    const jumpRatio = direction === 'higher' ? value / previousBest : previousBest / value;

    const isOutlier = jumpRatio > OUTLIER_THRESHOLD_MULTIPLIER;

    return { isOutlier, previousBest, jumpRatio };
  },

  /**
   * Check if a value is physically impossible
   */
  isImpossibleValue(exerciseId: string, metricKey: string, value: number): { isImpossible: boolean; limit?: number } {
    const key = `${metricKey}:${exerciseId}`;
    const limit = PHYSICAL_LIMITS[key];

    if (!limit) {
      return { isImpossible: false };
    }

    return {
      isImpossible: value > limit.max,
      limit: limit.max,
    };
  },

  /**
   * Flag a submission as suspicious
   */
  async flagSuspicious(params: {
    userId: string;
    flagType: FlagType;
    severity?: Severity;
    leaderboardEntryId?: string;
    workoutId?: string;
    details?: Record<string, unknown>;
  }): Promise<SuspiciousFlag> {
    const {
      userId,
      flagType,
      severity = 'low',
      leaderboardEntryId,
      workoutId,
      details = {},
    } = params;

    const flagId = `sf_${crypto.randomBytes(12).toString('hex')}`;

    await query(
      `INSERT INTO suspicious_flags (id, user_id, leaderboard_entry_id, workout_id, flag_type, severity, details)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [flagId, userId, leaderboardEntryId, workoutId, flagType, severity, JSON.stringify(details)]
    );

    log.warn({ userId, flagType, severity, details }, 'Suspicious activity flagged');

    return {
      id: flagId,
      userId,
      leaderboardEntryId,
      workoutId,
      flagType,
      severity,
      details,
      status: 'pending',
      createdAt: new Date(),
    };
  },

  /**
   * Validate a workout submission
   * Returns null if valid, or a SuspiciousFlag if suspicious
   */
  async validateWorkoutSubmission(params: {
    userId: string;
    workoutId: string;
    exerciseId: string;
    metricKey: string;
    value: number;
    direction?: 'higher' | 'lower';
  }): Promise<SuspiciousFlag | null> {
    const { userId, workoutId, exerciseId, metricKey, value, direction = 'higher' } = params;

    // Check rate limit
    const rateLimit = await this.checkRateLimit(userId);
    if (rateLimit.isLimited) {
      return this.flagSuspicious({
        userId,
        flagType: FLAG_TYPES.RAPID_SUBMISSIONS,
        severity: 'medium',
        workoutId,
        details: {
          submissionsToday: rateLimit.submissionsToday,
          limit: rateLimit.maxSubmissions,
        },
      });
    }

    // Check for impossible value
    const impossibleCheck = this.isImpossibleValue(exerciseId, metricKey, value);
    if (impossibleCheck.isImpossible) {
      return this.flagSuspicious({
        userId,
        flagType: FLAG_TYPES.IMPOSSIBLE_VALUE,
        severity: 'critical',
        workoutId,
        details: {
          exerciseId,
          metricKey,
          value,
          limit: impossibleCheck.limit,
        },
      });
    }

    // Check for outlier
    const outlierCheck = await this.detectOutlier(userId, exerciseId, metricKey, value, direction);
    if (outlierCheck.isOutlier) {
      return this.flagSuspicious({
        userId,
        flagType: FLAG_TYPES.EXTREME_JUMP,
        severity: outlierCheck.jumpRatio && outlierCheck.jumpRatio > 5 ? 'high' : 'medium',
        workoutId,
        details: {
          exerciseId,
          metricKey,
          value,
          previousBest: outlierCheck.previousBest,
          jumpRatio: outlierCheck.jumpRatio,
        },
      });
    }

    // Increment submission count
    await this.incrementSubmissionCount(userId);

    return null;
  },

  /**
   * Get pending flags for review
   */
  async getPendingFlags(options: {
    limit?: number;
    offset?: number;
    severity?: Severity;
  } = {}): Promise<{ flags: SuspiciousFlag[]; total: number }> {
    const { limit = 50, offset = 0, severity } = options;

    let whereClause = "status = 'pending'";
    const params: unknown[] = [];

    if (severity) {
      whereClause += ` AND severity = $${params.length + 1}`;
      params.push(severity);
    }

    params.push(limit, offset);

    const rows = await queryAll<{
      id: string;
      user_id: string;
      leaderboard_entry_id: string | null;
      workout_id: string | null;
      flag_type: string;
      severity: string;
      details: string;
      status: string;
      reviewed_by: string | null;
      reviewed_at: Date | null;
      created_at: Date;
    }>(
      `SELECT * FROM suspicious_flags
       WHERE ${whereClause}
       ORDER BY
         CASE severity WHEN 'critical' THEN 1 WHEN 'high' THEN 2 WHEN 'medium' THEN 3 ELSE 4 END,
         created_at DESC
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    );

    const countResult = await queryOne<{ count: string }>(
      `SELECT COUNT(*) as count FROM suspicious_flags WHERE ${whereClause}`,
      severity ? [severity] : []
    );

    return {
      flags: rows.map((r) => ({
        id: r.id,
        userId: r.user_id,
        leaderboardEntryId: r.leaderboard_entry_id ?? undefined,
        workoutId: r.workout_id ?? undefined,
        flagType: r.flag_type as FlagType,
        severity: r.severity as Severity,
        details: JSON.parse(r.details || '{}'),
        status: r.status as FlagStatus,
        reviewedBy: r.reviewed_by ?? undefined,
        reviewedAt: r.reviewed_at ?? undefined,
        createdAt: r.created_at,
      })),
      total: parseInt(countResult?.count || '0'),
    };
  },

  /**
   * Review a flag
   */
  async reviewFlag(
    flagId: string,
    reviewerId: string,
    decision: 'dismissed' | 'confirmed'
  ): Promise<void> {
    await query(
      `UPDATE suspicious_flags
       SET status = $2, reviewed_by = $3, reviewed_at = NOW()
       WHERE id = $1`,
      [flagId, decision, reviewerId]
    );

    log.info({ flagId, reviewerId, decision }, 'Flag reviewed');
  },

  /**
   * Get user's flag history
   */
  async getUserFlags(userId: string): Promise<SuspiciousFlag[]> {
    const rows = await queryAll<{
      id: string;
      user_id: string;
      leaderboard_entry_id: string | null;
      workout_id: string | null;
      flag_type: string;
      severity: string;
      details: string;
      status: string;
      reviewed_by: string | null;
      reviewed_at: Date | null;
      created_at: Date;
    }>(
      'SELECT * FROM suspicious_flags WHERE user_id = $1 ORDER BY created_at DESC',
      [userId]
    );

    return rows.map((r) => ({
      id: r.id,
      userId: r.user_id,
      leaderboardEntryId: r.leaderboard_entry_id ?? undefined,
      workoutId: r.workout_id ?? undefined,
      flagType: r.flag_type as FlagType,
      severity: r.severity as Severity,
      details: JSON.parse(r.details || '{}'),
      status: r.status as FlagStatus,
      reviewedBy: r.reviewed_by ?? undefined,
      reviewedAt: r.reviewed_at ?? undefined,
      createdAt: r.created_at,
    }));
  },

  /**
   * Check if user has too many confirmed flags (potential ban candidate)
   */
  async getUserFlagSummary(userId: string): Promise<{
    totalFlags: number;
    confirmedFlags: number;
    recentFlags: number;
    isHighRisk: boolean;
  }> {
    const summary = await queryOne<{
      total: string;
      confirmed: string;
      recent: string;
    }>(
      `SELECT
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE status = 'confirmed') as confirmed,
        COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '30 days') as recent
       FROM suspicious_flags
       WHERE user_id = $1`,
      [userId]
    );

    const totalFlags = parseInt(summary?.total || '0');
    const confirmedFlags = parseInt(summary?.confirmed || '0');
    const recentFlags = parseInt(summary?.recent || '0');

    // High risk if: 3+ confirmed flags OR 5+ recent flags
    const isHighRisk = confirmedFlags >= 3 || recentFlags >= 5;

    return { totalFlags, confirmedFlags, recentFlags, isHighRisk };
  },
};

export default antiCheatService;
