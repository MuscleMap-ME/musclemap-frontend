/**
 * Progressive Overload Service
 *
 * Handles tracking and analysis of progressive overload:
 * - Personal records tracking
 * - Progression history analysis
 * - Smart recommendations for weight/rep increases
 * - Plateau detection and deload suggestions
 */

import { query, queryOne, transaction } from '../db/client';
import { loggers } from '../lib/logger';

const log = loggers.core.child({ service: 'progression' });

// ============================================
// Types
// ============================================

export type RecordType = 'weight_1rm' | 'weight_5rm' | 'weight_10rm' | 'max_reps' | 'max_volume' | 'max_duration';
export type ProgressionStatus = 'progressing' | 'maintaining' | 'plateaued' | 'regressing' | 'deloading';
export type TargetType = 'weight' | 'reps' | 'volume' | 'frequency';

export interface PersonalRecord {
  id: string;
  userId: string;
  exerciseId: string;
  exerciseName?: string;
  recordType: RecordType;
  value: number;
  reps?: number;
  bodyweight?: number;
  workoutId?: string;
  setNumber?: number;
  achievedAt: Date;
}

export interface ExerciseProgression {
  exerciseId: string;
  exerciseName?: string;
  periodStart: Date;
  periodEnd: Date;
  periodType: 'day' | 'week' | 'month';
  totalSets: number;
  totalReps: number;
  totalVolume: number;
  maxWeight?: number;
  avgWeight?: number;
  estimated1RM?: number;
  progressionStatus: ProgressionStatus;
}

export interface ProgressionTarget {
  id: string;
  userId: string;
  exerciseId?: string;
  exerciseName?: string;
  targetType: TargetType;
  currentValue: number;
  targetValue: number;
  incrementValue?: number;
  incrementFrequency?: string;
  isActive: boolean;
  achievedAt?: Date;
  targetDate?: Date;
  progressPercent: number;
}

export interface ProgressionRecommendation {
  exerciseId: string;
  exerciseName: string;
  currentWeight?: number;
  currentReps?: number;
  recommendedWeight?: number;
  recommendedReps?: number;
  recommendationType: 'increase_weight' | 'increase_reps' | 'deload' | 'maintain' | 'try_variation';
  reason: string;
  confidence: number; // 0-100
}

export interface ExerciseStats {
  exerciseId: string;
  exerciseName?: string;
  lastWorkoutDate?: Date;
  totalSessions: number;
  estimated1RM?: number;
  maxWeight?: number;
  maxReps?: number;
  averageRepsPerSet?: number;
  recentTrend: 'up' | 'stable' | 'down';
  weeklyVolume: number;
  records: PersonalRecord[];
}

// ============================================
// Constants
// ============================================

const PLATEAU_WEEKS = 3; // Consider plateau after 3 weeks of no progress
const MIN_SESSIONS_FOR_RECOMMENDATION = 3;
const WEIGHT_INCREMENT_PERCENT = 2.5; // 2.5% increase recommended
const MIN_WEIGHT_INCREMENT = 2.5; // Minimum 2.5 lbs/kg

// ============================================
// Progression Service
// ============================================

export const ProgressionService = {
  // ============================================
  // Personal Records
  // ============================================

  /**
   * Get user's personal records for an exercise
   */
  async getExerciseRecords(userId: string, exerciseId: string): Promise<PersonalRecord[]> {
    const result = await query<{
      id: string;
      user_id: string;
      exercise_id: string;
      record_type: string;
      value: string;
      reps: number | null;
      bodyweight: string | null;
      workout_id: string | null;
      set_number: number | null;
      achieved_at: Date;
    }>(
      `SELECT pr.*, e.name as exercise_name
       FROM exercise_personal_records pr
       LEFT JOIN exercises e ON e.id = pr.exercise_id
       WHERE pr.user_id = $1 AND pr.exercise_id = $2
       ORDER BY pr.achieved_at DESC`,
      [userId, exerciseId]
    );

    return result.rows.map((row) => this.mapRecord(row));
  },

  /**
   * Get all of user's personal records
   */
  async getAllRecords(
    userId: string,
    options: { limit?: number; recordType?: RecordType } = {}
  ): Promise<PersonalRecord[]> {
    const { limit = 50, recordType } = options;

    let whereClause = 'WHERE pr.user_id = $1';
    const params: unknown[] = [userId];

    if (recordType) {
      whereClause += ' AND pr.record_type = $2';
      params.push(recordType);
    }

    params.push(limit);

    const result = await query<{
      id: string;
      user_id: string;
      exercise_id: string;
      record_type: string;
      value: string;
      reps: number | null;
      bodyweight: string | null;
      workout_id: string | null;
      set_number: number | null;
      achieved_at: Date;
      exercise_name: string | null;
    }>(
      `SELECT pr.*, e.name as exercise_name
       FROM exercise_personal_records pr
       LEFT JOIN exercises e ON e.id = pr.exercise_id
       ${whereClause}
       ORDER BY pr.achieved_at DESC
       LIMIT $${params.length}`,
      params
    );

    return result.rows.map((row) => this.mapRecord(row));
  },

  /**
   * Record a new personal record (called after workout logging)
   */
  async checkAndRecordPR(
    userId: string,
    exerciseId: string,
    weight: number,
    reps: number,
    workoutId?: string,
    setNumber?: number,
    bodyweight?: number
  ): Promise<PersonalRecord | null> {
    // Calculate estimated 1RM using Brzycki formula
    const estimated1RM = reps === 1 ? weight : weight * (36 / (37 - reps));

    // Determine record type based on reps
    let recordType: RecordType;
    if (reps === 1) recordType = 'weight_1rm';
    else if (reps <= 5) recordType = 'weight_5rm';
    else recordType = 'weight_10rm';

    // Check existing record
    const existing = await queryOne<{ value: string }>(
      `SELECT value FROM exercise_personal_records
       WHERE user_id = $1 AND exercise_id = $2 AND record_type = $3`,
      [userId, exerciseId, recordType]
    );

    const valueToCompare = recordType === 'weight_1rm' ? weight : estimated1RM;

    if (!existing || parseFloat(existing.value) < valueToCompare) {
      // New PR!
      const row = await queryOne<{
        id: string;
        user_id: string;
        exercise_id: string;
        record_type: string;
        value: string;
        reps: number | null;
        bodyweight: string | null;
        workout_id: string | null;
        set_number: number | null;
        achieved_at: Date;
      }>(
        `INSERT INTO exercise_personal_records
          (user_id, exercise_id, record_type, value, reps, bodyweight, workout_id, set_number, achieved_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
         ON CONFLICT (user_id, exercise_id, record_type)
         DO UPDATE SET value = $4, reps = $5, bodyweight = $6, workout_id = $7, set_number = $8, achieved_at = NOW()
         RETURNING *`,
        [userId, exerciseId, recordType, valueToCompare, reps, bodyweight ?? null, workoutId ?? null, setNumber ?? null]
      );

      if (row) {
        log.info(`New PR for user ${userId}: ${exerciseId} ${recordType} = ${valueToCompare}`);
        return this.mapRecord(row);
      }
    }

    return null;
  },

  // ============================================
  // Progression Analysis
  // ============================================

  /**
   * Get exercise stats and recent history
   */
  async getExerciseStats(userId: string, exerciseId: string): Promise<ExerciseStats | null> {
    // Get exercise info
    const exercise = await queryOne<{ id: string; name: string }>(
      'SELECT id, name FROM exercises WHERE id = $1',
      [exerciseId]
    );

    if (!exercise) return null;

    // Get workout history for this exercise (last 90 days)
    const historyResult = await query<{
      workout_date: Date;
      weight: string;
      reps: number;
      sets: number;
    }>(
      `SELECT
         w.created_at as workout_date,
         (jsonb_array_elements(w.exercise_data)->>'weight')::numeric as weight,
         (jsonb_array_elements(w.exercise_data)->>'reps')::int as reps,
         (jsonb_array_elements(w.exercise_data)->>'sets')::int as sets
       FROM workouts w,
            jsonb_array_elements(w.exercise_data) as ex
       WHERE w.user_id = $1
         AND ex->>'exerciseId' = $2
         AND w.created_at > NOW() - INTERVAL '90 days'
       ORDER BY w.created_at DESC`,
      [userId, exerciseId]
    );

    if (historyResult.rows.length === 0) {
      return {
        exerciseId,
        exerciseName: exercise.name,
        totalSessions: 0,
        recentTrend: 'stable',
        weeklyVolume: 0,
        records: [],
      };
    }

    // Calculate stats
    const sessions = historyResult.rows;
    const totalSessions = new Set(sessions.map((s) => s.workout_date.toDateString())).size;

    let maxWeight = 0;
    let maxReps = 0;
    let totalReps = 0;
    let totalSets = 0;
    let weightedSum = 0;

    for (const session of sessions) {
      const weight = parseFloat(session.weight) || 0;
      const reps = session.reps || 0;
      const sets = session.sets || 1;

      if (weight > maxWeight) maxWeight = weight;
      if (reps > maxReps) maxReps = reps;
      totalReps += reps * sets;
      totalSets += sets;
      weightedSum += weight * reps * sets;
    }

    const avgRepsPerSet = totalSets > 0 ? totalReps / totalSets : 0;

    // Calculate estimated 1RM from best set
    const bestSet = sessions.reduce((best, curr) => {
      const currWeight = parseFloat(curr.weight) || 0;
      const bestWeight = parseFloat(best.weight) || 0;
      const curr1RM = curr.reps === 1 ? currWeight : currWeight * (36 / (37 - curr.reps));
      const best1RM = best.reps === 1 ? bestWeight : bestWeight * (36 / (37 - best.reps));
      return curr1RM > best1RM ? curr : best;
    }, sessions[0]);

    const bestWeight = parseFloat(bestSet.weight) || 0;
    const estimated1RM = bestSet.reps === 1 ? bestWeight : bestWeight * (36 / (37 - bestSet.reps));

    // Calculate weekly volume (last 7 days)
    const lastWeekSessions = sessions.filter((s) => {
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      return s.workout_date >= weekAgo;
    });

    const weeklyVolume = lastWeekSessions.reduce((sum, s) => {
      return sum + (parseFloat(s.weight) || 0) * (s.reps || 0) * (s.sets || 1);
    }, 0);

    // Determine trend (compare first half to second half of data)
    const midpoint = Math.floor(sessions.length / 2);
    const recentHalf = sessions.slice(0, midpoint);
    const olderHalf = sessions.slice(midpoint);

    const recentAvgWeight =
      recentHalf.length > 0
        ? recentHalf.reduce((sum, s) => sum + (parseFloat(s.weight) || 0), 0) / recentHalf.length
        : 0;
    const olderAvgWeight =
      olderHalf.length > 0
        ? olderHalf.reduce((sum, s) => sum + (parseFloat(s.weight) || 0), 0) / olderHalf.length
        : 0;

    let recentTrend: 'up' | 'stable' | 'down' = 'stable';
    if (olderAvgWeight > 0) {
      const change = (recentAvgWeight - olderAvgWeight) / olderAvgWeight;
      if (change > 0.05) recentTrend = 'up';
      else if (change < -0.05) recentTrend = 'down';
    }

    // Get personal records
    const records = await this.getExerciseRecords(userId, exerciseId);

    return {
      exerciseId,
      exerciseName: exercise.name,
      lastWorkoutDate: sessions[0]?.workout_date,
      totalSessions,
      estimated1RM: Math.round(estimated1RM * 10) / 10,
      maxWeight,
      maxReps,
      averageRepsPerSet: Math.round(avgRepsPerSet * 10) / 10,
      recentTrend,
      weeklyVolume: Math.round(weeklyVolume),
      records,
    };
  },

  /**
   * Get progression recommendations for an exercise
   */
  async getRecommendations(userId: string, exerciseId: string): Promise<ProgressionRecommendation | null> {
    const stats = await this.getExerciseStats(userId, exerciseId);

    if (!stats || stats.totalSessions < MIN_SESSIONS_FOR_RECOMMENDATION) {
      return null;
    }

    const exercise = await queryOne<{ name: string }>(
      'SELECT name FROM exercises WHERE id = $1',
      [exerciseId]
    );

    const exerciseName = exercise?.name || exerciseId;

    // Base recommendation on trend and recent performance
    let recommendation: ProgressionRecommendation;

    if (stats.recentTrend === 'up') {
      // Progressing well - suggest small weight increase
      const newWeight = stats.maxWeight
        ? Math.max(stats.maxWeight * (1 + WEIGHT_INCREMENT_PERCENT / 100), stats.maxWeight + MIN_WEIGHT_INCREMENT)
        : undefined;

      recommendation = {
        exerciseId,
        exerciseName,
        currentWeight: stats.maxWeight,
        recommendedWeight: newWeight ? Math.round(newWeight * 10) / 10 : undefined,
        recommendationType: 'increase_weight',
        reason: `You've been making steady progress. Try increasing the weight by ${WEIGHT_INCREMENT_PERCENT}% (${MIN_WEIGHT_INCREMENT} lbs/kg minimum).`,
        confidence: 85,
      };
    } else if (stats.recentTrend === 'down') {
      // Regressing - suggest deload
      recommendation = {
        exerciseId,
        exerciseName,
        currentWeight: stats.maxWeight,
        recommendedWeight: stats.maxWeight ? Math.round(stats.maxWeight * 0.9 * 10) / 10 : undefined,
        recommendationType: 'deload',
        reason: 'Your performance has been declining. Consider a deload week with 10% reduced weight to recover.',
        confidence: 75,
      };
    } else {
      // Stable/plateaued
      if (stats.averageRepsPerSet && stats.averageRepsPerSet < 8) {
        // Low reps - increase reps first
        recommendation = {
          exerciseId,
          exerciseName,
          currentReps: Math.round(stats.averageRepsPerSet),
          recommendedReps: Math.min(Math.round(stats.averageRepsPerSet) + 2, 12),
          recommendationType: 'increase_reps',
          reason: 'Try adding more reps per set before increasing weight. Aim for 8-12 reps.',
          confidence: 70,
        };
      } else if (stats.maxWeight) {
        // Already doing higher reps - try weight increase
        recommendation = {
          exerciseId,
          exerciseName,
          currentWeight: stats.maxWeight,
          recommendedWeight: Math.round((stats.maxWeight + MIN_WEIGHT_INCREMENT) * 10) / 10,
          recommendationType: 'increase_weight',
          reason: "You're ready for more weight. Try a small increase and adjust reps as needed.",
          confidence: 65,
        };
      } else {
        recommendation = {
          exerciseId,
          exerciseName,
          recommendationType: 'maintain',
          reason: 'Continue your current routine. Focus on form and consistency.',
          confidence: 60,
        };
      }
    }

    return recommendation;
  },

  /**
   * Get recommendations for all recently trained exercises
   */
  async getAllRecommendations(userId: string, limit: number = 10): Promise<ProgressionRecommendation[]> {
    // Get recently trained exercises
    const recentExercises = await query<{ exercise_id: string }>(
      `SELECT DISTINCT jsonb_array_elements(exercise_data)->>'exerciseId' as exercise_id
       FROM workouts
       WHERE user_id = $1 AND created_at > NOW() - INTERVAL '30 days'
       LIMIT $2`,
      [userId, limit * 2] // Fetch extra to account for exercises without enough data
    );

    const recommendations: ProgressionRecommendation[] = [];

    for (const row of recentExercises.rows) {
      if (recommendations.length >= limit) break;

      const rec = await this.getRecommendations(userId, row.exercise_id);
      if (rec) {
        recommendations.push(rec);
      }
    }

    // Sort by confidence
    recommendations.sort((a, b) => b.confidence - a.confidence);

    return recommendations;
  },

  // ============================================
  // Progression Targets
  // ============================================

  /**
   * Create a progression target
   */
  async createTarget(
    userId: string,
    input: {
      exerciseId?: string;
      targetType: TargetType;
      currentValue: number;
      targetValue: number;
      incrementValue?: number;
      incrementFrequency?: string;
      targetDate?: Date;
    }
  ): Promise<ProgressionTarget> {
    const row = await queryOne<{
      id: string;
      user_id: string;
      exercise_id: string | null;
      target_type: string;
      current_value: string;
      target_value: string;
      increment_value: string | null;
      increment_frequency: string | null;
      is_active: boolean;
      achieved_at: Date | null;
      target_date: Date | null;
      created_at: Date;
    }>(
      `INSERT INTO progression_targets
        (user_id, exercise_id, target_type, current_value, target_value, increment_value, increment_frequency, target_date)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [
        userId,
        input.exerciseId ?? null,
        input.targetType,
        input.currentValue,
        input.targetValue,
        input.incrementValue ?? null,
        input.incrementFrequency ?? 'session',
        input.targetDate ?? null,
      ]
    );

    if (!row) {
      throw new Error('Failed to create target');
    }

    return this.mapTarget(row);
  },

  /**
   * Get user's progression targets
   */
  async getTargets(
    userId: string,
    options: { exerciseId?: string; activeOnly?: boolean } = {}
  ): Promise<ProgressionTarget[]> {
    const { exerciseId, activeOnly = true } = options;

    let whereClause = 'WHERE pt.user_id = $1';
    const params: unknown[] = [userId];
    let paramIndex = 2;

    if (exerciseId) {
      whereClause += ` AND pt.exercise_id = $${paramIndex++}`;
      params.push(exerciseId);
    }

    if (activeOnly) {
      whereClause += ' AND pt.is_active = TRUE';
    }

    const result = await query<{
      id: string;
      user_id: string;
      exercise_id: string | null;
      target_type: string;
      current_value: string;
      target_value: string;
      increment_value: string | null;
      increment_frequency: string | null;
      is_active: boolean;
      achieved_at: Date | null;
      target_date: Date | null;
      created_at: Date;
      exercise_name: string | null;
    }>(
      `SELECT pt.*, e.name as exercise_name
       FROM progression_targets pt
       LEFT JOIN exercises e ON e.id = pt.exercise_id
       ${whereClause}
       ORDER BY pt.created_at DESC`,
      params
    );

    return result.rows.map((row) => this.mapTarget(row));
  },

  /**
   * Update target progress
   */
  async updateTargetProgress(targetId: string, userId: string, newCurrentValue: number): Promise<ProgressionTarget> {
    const existing = await queryOne<{ user_id: string; target_value: string }>(
      'SELECT user_id, target_value FROM progression_targets WHERE id = $1',
      [targetId]
    );

    if (!existing || existing.user_id !== userId) {
      throw new Error('Target not found');
    }

    const isAchieved = newCurrentValue >= parseFloat(existing.target_value);

    const row = await queryOne<{
      id: string;
      user_id: string;
      exercise_id: string | null;
      target_type: string;
      current_value: string;
      target_value: string;
      increment_value: string | null;
      increment_frequency: string | null;
      is_active: boolean;
      achieved_at: Date | null;
      target_date: Date | null;
      created_at: Date;
    }>(
      `UPDATE progression_targets
       SET current_value = $1, is_active = $2, achieved_at = $3, updated_at = NOW()
       WHERE id = $4
       RETURNING *`,
      [newCurrentValue, !isAchieved, isAchieved ? new Date() : null, targetId]
    );

    if (!row) {
      throw new Error('Failed to update target');
    }

    return this.mapTarget(row);
  },

  // ============================================
  // Helpers
  // ============================================

  mapRecord(row: {
    id: string;
    user_id: string;
    exercise_id: string;
    record_type: string;
    value: string;
    reps: number | null;
    bodyweight: string | null;
    workout_id: string | null;
    set_number: number | null;
    achieved_at: Date;
    exercise_name?: string | null;
  }): PersonalRecord {
    return {
      id: row.id,
      userId: row.user_id,
      exerciseId: row.exercise_id,
      exerciseName: row.exercise_name ?? undefined,
      recordType: row.record_type as RecordType,
      value: parseFloat(row.value),
      reps: row.reps ?? undefined,
      bodyweight: row.bodyweight ? parseFloat(row.bodyweight) : undefined,
      workoutId: row.workout_id ?? undefined,
      setNumber: row.set_number ?? undefined,
      achievedAt: row.achieved_at,
    };
  },

  mapTarget(row: {
    id: string;
    user_id: string;
    exercise_id: string | null;
    target_type: string;
    current_value: string;
    target_value: string;
    increment_value: string | null;
    increment_frequency: string | null;
    is_active: boolean;
    achieved_at: Date | null;
    target_date: Date | null;
    created_at: Date;
    exercise_name?: string | null;
  }): ProgressionTarget {
    const current = parseFloat(row.current_value);
    const target = parseFloat(row.target_value);
    const progressPercent = target > 0 ? Math.min(100, (current / target) * 100) : 0;

    return {
      id: row.id,
      userId: row.user_id,
      exerciseId: row.exercise_id ?? undefined,
      exerciseName: row.exercise_name ?? undefined,
      targetType: row.target_type as TargetType,
      currentValue: current,
      targetValue: target,
      incrementValue: row.increment_value ? parseFloat(row.increment_value) : undefined,
      incrementFrequency: row.increment_frequency ?? undefined,
      isActive: row.is_active,
      achievedAt: row.achieved_at ?? undefined,
      targetDate: row.target_date ?? undefined,
      progressPercent: Math.round(progressPercent * 10) / 10,
    };
  },
};

export default ProgressionService;
