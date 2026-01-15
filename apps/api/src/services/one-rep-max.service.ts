/**
 * One Rep Max (1RM) Service
 *
 * Handles 1RM calculation, tracking, and achievement checking:
 * - Multiple 1RM calculation formulas (Epley, Brzycki, etc.)
 * - 1RM history tracking and PR detection
 * - Compound total tracking (Squat + Bench + Deadlift)
 * - 1RM-based achievement unlocking
 */

import { query, queryOne, queryAll, transaction } from '../db/client';
import { loggers } from '../lib/logger';
import { achievementService } from '../modules/achievements';

const log = loggers.core.child({ service: 'one-rep-max' });

// ============================================
// Types
// ============================================

export type OneRMFormula = 'epley' | 'brzycki' | 'lombardi' | 'oconner' | 'actual';

export interface OneRMEntry {
  id: string;
  userId: string;
  exerciseId: string;
  exerciseName?: string;
  estimated1rm: number;
  actual1rm?: number;
  sourceWeight: number;
  sourceReps: number;
  sourceRpe?: number;
  formulaUsed: OneRMFormula;
  workoutId?: string;
  setId?: string;
  isPr: boolean;
  bodyweightKg?: number;
  relativeStrength?: number;
  recordedAt: Date;
}

export interface CompoundTotal {
  userId: string;
  bestSquat1rm?: number;
  bestBench1rm?: number;
  bestDeadlift1rm?: number;
  powerliftingTotal: number;
  squatPrDate?: Date;
  benchPrDate?: Date;
  deadliftPrDate?: Date;
  lastBodyweightKg?: number;
  wilksScore?: number;
  dotsScore?: number;
}

export interface OneRMProgression {
  exerciseId: string;
  exerciseName?: string;
  data: Array<{
    date: Date;
    best1rm: number;
    isPr: boolean;
  }>;
  currentPr?: number;
  firstRecorded?: number;
  improvement?: {
    absolute: number;
    percentage: number;
  };
}

// ============================================
// Constants
// ============================================

// Exercise IDs for the big three lifts
const SQUAT_EXERCISE_ID = 'BB-SQUAT-BACK-SQUAT';
const BENCH_EXERCISE_ID = 'BB-PUSH-BENCH-PRESS';
const DEADLIFT_EXERCISE_ID = 'BB-HINGE-DEADLIFT';

// Plate milestones (in lbs)
const LIFT_MILESTONES = {
  bench: [
    { threshold: 225, achievementKey: 'bench_225' },
    { threshold: 315, achievementKey: 'bench_315' },
    { threshold: 405, achievementKey: 'bench_405' },
  ],
  squat: [
    { threshold: 225, achievementKey: 'squat_225' },
    { threshold: 315, achievementKey: 'squat_315' },
    { threshold: 405, achievementKey: 'squat_405' },
    { threshold: 495, achievementKey: 'squat_495' },
  ],
  deadlift: [
    { threshold: 315, achievementKey: 'deadlift_315' },
    { threshold: 405, achievementKey: 'deadlift_405' },
    { threshold: 495, achievementKey: 'deadlift_495' },
    { threshold: 585, achievementKey: 'deadlift_585' },
  ],
};

// Powerlifting total milestones (in lbs)
const TOTAL_MILESTONES = [
  { threshold: 500, achievementKey: 'powerlifting_total_500' },
  { threshold: 1000, achievementKey: 'powerlifting_total_1000' },
  { threshold: 1200, achievementKey: 'powerlifting_total_1200' },
  { threshold: 1500, achievementKey: 'powerlifting_total_1500' },
];

// ============================================
// 1RM Calculation Formulas
// ============================================

/**
 * Calculate estimated 1RM using various formulas
 * All formulas are most accurate for reps < 10
 */
export const OneRMFormulas = {
  /**
   * Epley Formula: 1RM = weight * (1 + reps/30)
   * Most commonly used, good for higher rep ranges
   */
  epley(weight: number, reps: number): number {
    if (reps === 1) return weight;
    return weight * (1 + reps / 30);
  },

  /**
   * Brzycki Formula: 1RM = weight * 36 / (37 - reps)
   * More conservative, good for lower rep ranges
   */
  brzycki(weight: number, reps: number): number {
    if (reps === 1) return weight;
    if (reps >= 37) return weight * 36; // Prevent division by zero
    return weight * 36 / (37 - reps);
  },

  /**
   * Lombardi Formula: 1RM = weight * reps^0.10
   * Simple and easy to calculate
   */
  lombardi(weight: number, reps: number): number {
    if (reps === 1) return weight;
    return weight * Math.pow(reps, 0.10);
  },

  /**
   * O'Conner Formula: 1RM = weight * (1 + 0.025 * reps)
   * Good for general fitness
   */
  oconner(weight: number, reps: number): number {
    if (reps === 1) return weight;
    return weight * (1 + 0.025 * reps);
  },

  /**
   * Calculate 1RM using specified formula
   */
  calculate(weight: number, reps: number, formula: OneRMFormula = 'epley'): number {
    if (reps < 1 || weight <= 0) return 0;

    switch (formula) {
      case 'epley':
        return this.epley(weight, reps);
      case 'brzycki':
        return this.brzycki(weight, reps);
      case 'lombardi':
        return this.lombardi(weight, reps);
      case 'oconner':
        return this.oconner(weight, reps);
      case 'actual':
        return reps === 1 ? weight : this.epley(weight, reps);
      default:
        return this.epley(weight, reps);
    }
  },

  /**
   * Calculate average of all formulas (more accurate for most people)
   */
  average(weight: number, reps: number): number {
    if (reps === 1) return weight;
    const formulas: OneRMFormula[] = ['epley', 'brzycki', 'lombardi', 'oconner'];
    const estimates = formulas.map(f => this.calculate(weight, reps, f));
    return estimates.reduce((a, b) => a + b, 0) / estimates.length;
  },
};

// ============================================
// 1RM Service
// ============================================

export const OneRepMaxService = {
  /**
   * Record a new 1RM entry and check for PRs
   */
  async record(params: {
    userId: string;
    exerciseId: string;
    weight: number;
    reps: number;
    rpe?: number;
    workoutId?: string;
    setId?: string;
    bodyweightKg?: number;
    formula?: OneRMFormula;
  }): Promise<{ entry: OneRMEntry; isPr: boolean; previousPr?: number; achievements: string[] }> {
    const {
      userId,
      exerciseId,
      weight,
      reps,
      rpe,
      workoutId,
      setId,
      bodyweightKg,
      formula = 'epley',
    } = params;

    // Calculate estimated 1RM
    const estimated1rm = OneRMFormulas.calculate(weight, reps, formula);
    const roundedEstimate = Math.round(estimated1rm * 100) / 100;

    // Calculate relative strength if bodyweight provided
    const relativeStrength = bodyweightKg ? Math.round((roundedEstimate / bodyweightKg) * 100) / 100 : undefined;

    // Check if this is a PR
    const currentPr = await queryOne<{ best_1rm: string }>(
      `SELECT MAX(estimated_1rm) as best_1rm
       FROM exercise_1rm_history
       WHERE user_id = $1 AND exercise_id = $2`,
      [userId, exerciseId]
    );

    const previousPr = currentPr?.best_1rm ? parseFloat(currentPr.best_1rm) : undefined;
    const isPr = !previousPr || roundedEstimate > previousPr;

    // Insert the 1RM entry
    const row = await queryOne<{
      id: string;
      user_id: string;
      exercise_id: string;
      estimated_1rm: string;
      actual_1rm: string | null;
      source_weight: string;
      source_reps: number;
      source_rpe: number | null;
      formula_used: string;
      workout_id: string | null;
      set_id: string | null;
      is_pr: boolean;
      bodyweight_kg: string | null;
      relative_strength: string | null;
      recorded_at: Date;
    }>(
      `INSERT INTO exercise_1rm_history
        (user_id, exercise_id, estimated_1rm, source_weight, source_reps, source_rpe,
         formula_used, workout_id, set_id, is_pr, bodyweight_kg, relative_strength)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
       RETURNING *`,
      [
        userId,
        exerciseId,
        roundedEstimate,
        weight,
        reps,
        rpe ?? null,
        formula,
        workoutId ?? null,
        setId ?? null,
        isPr,
        bodyweightKg ?? null,
        relativeStrength ?? null,
      ]
    );

    if (!row) {
      throw new Error('Failed to record 1RM entry');
    }

    const entry = this.mapEntry(row);

    // If this is a PR, update exercise_personal_records
    if (isPr) {
      await query(
        `INSERT INTO exercise_personal_records (user_id, exercise_id, record_type, value, reps, achieved_at, best_estimated_1rm, best_1rm_date, best_1rm_source_weight, best_1rm_source_reps)
         VALUES ($1, $2, 'weight_1rm', $3, $4, NOW(), $3, NOW(), $5, $4)
         ON CONFLICT (user_id, exercise_id, record_type)
         DO UPDATE SET
           value = GREATEST(exercise_personal_records.value, $3),
           best_estimated_1rm = GREATEST(COALESCE(exercise_personal_records.best_estimated_1rm, 0), $3),
           best_1rm_date = CASE WHEN $3 > COALESCE(exercise_personal_records.best_estimated_1rm, 0) THEN NOW() ELSE exercise_personal_records.best_1rm_date END,
           best_1rm_source_weight = CASE WHEN $3 > COALESCE(exercise_personal_records.best_estimated_1rm, 0) THEN $5 ELSE exercise_personal_records.best_1rm_source_weight END,
           best_1rm_source_reps = CASE WHEN $3 > COALESCE(exercise_personal_records.best_estimated_1rm, 0) THEN $4 ELSE exercise_personal_records.best_1rm_source_reps END`,
        [userId, exerciseId, roundedEstimate, reps, weight]
      );

      log.info({ userId, exerciseId, estimate: roundedEstimate, previous: previousPr }, 'New 1RM PR recorded');
    }

    // Check for achievements
    const achievements = await this.checkAchievements(userId, exerciseId, roundedEstimate, bodyweightKg, isPr);

    return { entry, isPr, previousPr, achievements };
  },

  /**
   * Get 1RM history for a specific exercise
   */
  async getExerciseHistory(
    userId: string,
    exerciseId: string,
    options: { limit?: number; days?: number } = {}
  ): Promise<OneRMEntry[]> {
    const { limit = 100, days = 365 } = options;

    const rows = await queryAll<{
      id: string;
      user_id: string;
      exercise_id: string;
      estimated_1rm: string;
      actual_1rm: string | null;
      source_weight: string;
      source_reps: number;
      source_rpe: number | null;
      formula_used: string;
      workout_id: string | null;
      set_id: string | null;
      is_pr: boolean;
      bodyweight_kg: string | null;
      relative_strength: string | null;
      recorded_at: Date;
      exercise_name: string | null;
    }>(
      `SELECT h.*, e.name as exercise_name
       FROM exercise_1rm_history h
       LEFT JOIN exercises e ON e.id = h.exercise_id
       WHERE h.user_id = $1 AND h.exercise_id = $2
         AND h.recorded_at >= CURRENT_DATE - INTERVAL '${days} days'
       ORDER BY h.recorded_at DESC
       LIMIT $3`,
      [userId, exerciseId, limit]
    );

    return rows.map(r => this.mapEntry(r));
  },

  /**
   * Get 1RM progression data for charts
   */
  async getProgression(
    userId: string,
    exerciseId: string,
    options: { period?: 'daily' | 'weekly' | 'monthly'; days?: number } = {}
  ): Promise<OneRMProgression> {
    const { period = 'daily', days = 180 } = options;

    const dateFunc = period === 'monthly'
      ? "DATE_TRUNC('month', recorded_at)"
      : period === 'weekly'
        ? "DATE_TRUNC('week', recorded_at)"
        : 'DATE(recorded_at)';

    const rows = await queryAll<{
      period_date: Date;
      best_1rm: string;
      is_pr: boolean;
    }>(
      `SELECT
         ${dateFunc} as period_date,
         MAX(estimated_1rm) as best_1rm,
         BOOL_OR(is_pr) as is_pr
       FROM exercise_1rm_history
       WHERE user_id = $1 AND exercise_id = $2
         AND recorded_at >= CURRENT_DATE - INTERVAL '${days} days'
       GROUP BY ${dateFunc}
       ORDER BY ${dateFunc} ASC`,
      [userId, exerciseId]
    );

    const exercise = await queryOne<{ name: string }>(
      'SELECT name FROM exercises WHERE id = $1',
      [exerciseId]
    );

    const data = rows.map(r => ({
      date: r.period_date,
      best1rm: parseFloat(r.best_1rm),
      isPr: r.is_pr,
    }));

    // Calculate improvement
    let improvement: { absolute: number; percentage: number } | undefined;
    if (data.length >= 2) {
      const first = data[0].best1rm;
      const last = data[data.length - 1].best1rm;
      improvement = {
        absolute: Math.round((last - first) * 100) / 100,
        percentage: Math.round(((last - first) / first) * 10000) / 100,
      };
    }

    return {
      exerciseId,
      exerciseName: exercise?.name,
      data,
      currentPr: data.length > 0 ? Math.max(...data.map(d => d.best1rm)) : undefined,
      firstRecorded: data.length > 0 ? data[0].best1rm : undefined,
      improvement,
    };
  },

  /**
   * Get user's compound total (Squat + Bench + Deadlift)
   */
  async getCompoundTotal(userId: string): Promise<CompoundTotal | null> {
    const row = await queryOne<{
      user_id: string;
      best_squat_1rm: string | null;
      best_bench_1rm: string | null;
      best_deadlift_1rm: string | null;
      powerlifting_total: string | null;
      squat_pr_date: Date | null;
      bench_pr_date: Date | null;
      deadlift_pr_date: Date | null;
      last_bodyweight_kg: string | null;
      wilks_score: string | null;
      dots_score: string | null;
    }>(
      'SELECT * FROM user_compound_totals WHERE user_id = $1',
      [userId]
    );

    if (!row) return null;

    return {
      userId: row.user_id,
      bestSquat1rm: row.best_squat_1rm ? parseFloat(row.best_squat_1rm) : undefined,
      bestBench1rm: row.best_bench_1rm ? parseFloat(row.best_bench_1rm) : undefined,
      bestDeadlift1rm: row.best_deadlift_1rm ? parseFloat(row.best_deadlift_1rm) : undefined,
      powerliftingTotal: row.powerlifting_total ? parseFloat(row.powerlifting_total) : 0,
      squatPrDate: row.squat_pr_date ?? undefined,
      benchPrDate: row.bench_pr_date ?? undefined,
      deadliftPrDate: row.deadlift_pr_date ?? undefined,
      lastBodyweightKg: row.last_bodyweight_kg ? parseFloat(row.last_bodyweight_kg) : undefined,
      wilksScore: row.wilks_score ? parseFloat(row.wilks_score) : undefined,
      dotsScore: row.dots_score ? parseFloat(row.dots_score) : undefined,
    };
  },

  /**
   * Get user's best 1RM for all exercises
   */
  async getAllBestLifts(userId: string): Promise<Array<{
    exerciseId: string;
    exerciseName: string;
    best1rm: number;
    recordedAt: Date;
  }>> {
    const rows = await queryAll<{
      exercise_id: string;
      exercise_name: string;
      best_1rm: string;
      recorded_at: Date;
    }>(
      `SELECT DISTINCT ON (h.exercise_id)
         h.exercise_id,
         e.name as exercise_name,
         h.estimated_1rm as best_1rm,
         h.recorded_at
       FROM exercise_1rm_history h
       JOIN exercises e ON e.id = h.exercise_id
       WHERE h.user_id = $1
       ORDER BY h.exercise_id, h.estimated_1rm DESC`,
      [userId]
    );

    return rows.map(r => ({
      exerciseId: r.exercise_id,
      exerciseName: r.exercise_name,
      best1rm: parseFloat(r.best_1rm),
      recordedAt: r.recorded_at,
    }));
  },

  /**
   * Get 1RM leaderboard for an exercise
   */
  async getLeaderboard(
    exerciseId: string,
    options: { limit?: number; offset?: number } = {}
  ): Promise<Array<{
    rank: number;
    userId: string;
    username: string;
    best1rm: number;
    relativeStrength?: number;
    recordedAt: Date;
  }>> {
    const { limit = 50, offset = 0 } = options;

    const rows = await queryAll<{
      user_id: string;
      username: string;
      best_1rm: string;
      relative_strength: string | null;
      recorded_at: Date;
    }>(
      `SELECT DISTINCT ON (h.user_id)
         h.user_id,
         u.username,
         h.estimated_1rm as best_1rm,
         h.relative_strength,
         h.recorded_at
       FROM exercise_1rm_history h
       JOIN users u ON u.id = h.user_id
       JOIN user_cohort_preferences cp ON cp.user_id = h.user_id AND cp.show_on_leaderboards = TRUE
       WHERE h.exercise_id = $1
       ORDER BY h.user_id, h.estimated_1rm DESC`,
      [exerciseId]
    );

    // Sort by best_1rm and add rank
    const sorted = rows
      .map(r => ({
        userId: r.user_id,
        username: r.username,
        best1rm: parseFloat(r.best_1rm),
        relativeStrength: r.relative_strength ? parseFloat(r.relative_strength) : undefined,
        recordedAt: r.recorded_at,
      }))
      .sort((a, b) => b.best1rm - a.best1rm)
      .slice(offset, offset + limit)
      .map((entry, index) => ({
        rank: offset + index + 1,
        ...entry,
      }));

    return sorted;
  },

  /**
   * Check and grant 1RM-based achievements
   */
  async checkAchievements(
    userId: string,
    exerciseId: string,
    estimated1rm: number,
    bodyweightKg?: number,
    isPr: boolean = false
  ): Promise<string[]> {
    const grantedAchievements: string[] = [];

    // Convert to lbs for threshold checking (assumes input is in lbs)
    const lbs1rm = estimated1rm;

    // Check individual lift milestones
    if (exerciseId === BENCH_EXERCISE_ID) {
      for (const milestone of LIFT_MILESTONES.bench) {
        if (lbs1rm >= milestone.threshold) {
          const granted = await achievementService.grant({
            userId,
            achievementKey: milestone.achievementKey,
            exerciseId,
            value: lbs1rm,
          });
          if (granted) grantedAchievements.push(milestone.achievementKey);
        }
      }
    } else if (exerciseId === SQUAT_EXERCISE_ID) {
      for (const milestone of LIFT_MILESTONES.squat) {
        if (lbs1rm >= milestone.threshold) {
          const granted = await achievementService.grant({
            userId,
            achievementKey: milestone.achievementKey,
            exerciseId,
            value: lbs1rm,
          });
          if (granted) grantedAchievements.push(milestone.achievementKey);
        }
      }
    } else if (exerciseId === DEADLIFT_EXERCISE_ID) {
      for (const milestone of LIFT_MILESTONES.deadlift) {
        if (lbs1rm >= milestone.threshold) {
          const granted = await achievementService.grant({
            userId,
            achievementKey: milestone.achievementKey,
            exerciseId,
            value: lbs1rm,
          });
          if (granted) grantedAchievements.push(milestone.achievementKey);
        }
      }
    }

    // Check powerlifting total milestones
    if ([BENCH_EXERCISE_ID, SQUAT_EXERCISE_ID, DEADLIFT_EXERCISE_ID].includes(exerciseId)) {
      const total = await this.getCompoundTotal(userId);
      if (total && total.powerliftingTotal > 0) {
        for (const milestone of TOTAL_MILESTONES) {
          if (total.powerliftingTotal >= milestone.threshold) {
            const granted = await achievementService.grant({
              userId,
              achievementKey: milestone.achievementKey,
              value: total.powerliftingTotal,
            });
            if (granted) grantedAchievements.push(milestone.achievementKey);
          }
        }
      }
    }

    // Check relative strength achievements
    if (bodyweightKg && bodyweightKg > 0) {
      const relativeStrength = lbs1rm / (bodyweightKg * 2.205); // Convert kg to lbs for comparison

      if (exerciseId === BENCH_EXERCISE_ID && relativeStrength >= 1) {
        const granted = await achievementService.grant({
          userId,
          achievementKey: 'bodyweight_bench',
          exerciseId,
          value: relativeStrength,
        });
        if (granted) grantedAchievements.push('bodyweight_bench');
      }

      if (exerciseId === SQUAT_EXERCISE_ID && relativeStrength >= 2) {
        const granted = await achievementService.grant({
          userId,
          achievementKey: 'double_bodyweight_squat',
          exerciseId,
          value: relativeStrength,
        });
        if (granted) grantedAchievements.push('double_bodyweight_squat');
      }

      if (exerciseId === DEADLIFT_EXERCISE_ID) {
        if (relativeStrength >= 2) {
          const granted = await achievementService.grant({
            userId,
            achievementKey: 'double_bodyweight_deadlift',
            exerciseId,
            value: relativeStrength,
          });
          if (granted) grantedAchievements.push('double_bodyweight_deadlift');
        }
        if (relativeStrength >= 3) {
          const granted = await achievementService.grant({
            userId,
            achievementKey: 'triple_bodyweight_deadlift',
            exerciseId,
            value: relativeStrength,
          });
          if (granted) grantedAchievements.push('triple_bodyweight_deadlift');
        }
      }
    }

    // Check first PR achievement
    if (isPr) {
      const prCount = await queryOne<{ count: string }>(
        `SELECT COUNT(DISTINCT exercise_id) as count
         FROM exercise_1rm_history
         WHERE user_id = $1 AND is_pr = TRUE`,
        [userId]
      );
      const totalPrs = parseInt(prCount?.count || '0');

      if (totalPrs === 1) {
        const granted = await achievementService.grant({
          userId,
          achievementKey: 'first_1rm_pr',
        });
        if (granted) grantedAchievements.push('first_1rm_pr');
      } else if (totalPrs >= 5) {
        const granted = await achievementService.grant({
          userId,
          achievementKey: '1rm_pr_streak_5',
          value: totalPrs,
        });
        if (granted) grantedAchievements.push('1rm_pr_streak_5');
      } else if (totalPrs >= 10) {
        const granted = await achievementService.grant({
          userId,
          achievementKey: '1rm_pr_streak_10',
          value: totalPrs,
        });
        if (granted) grantedAchievements.push('1rm_pr_streak_10');
      }
    }

    return grantedAchievements;
  },

  /**
   * Map database row to OneRMEntry
   */
  mapEntry(row: {
    id: string;
    user_id: string;
    exercise_id: string;
    estimated_1rm: string;
    actual_1rm: string | null;
    source_weight: string;
    source_reps: number;
    source_rpe: number | null;
    formula_used: string;
    workout_id: string | null;
    set_id: string | null;
    is_pr: boolean;
    bodyweight_kg: string | null;
    relative_strength: string | null;
    recorded_at: Date;
    exercise_name?: string | null;
  }): OneRMEntry {
    return {
      id: row.id,
      userId: row.user_id,
      exerciseId: row.exercise_id,
      exerciseName: row.exercise_name ?? undefined,
      estimated1rm: parseFloat(row.estimated_1rm),
      actual1rm: row.actual_1rm ? parseFloat(row.actual_1rm) : undefined,
      sourceWeight: parseFloat(row.source_weight),
      sourceReps: row.source_reps,
      sourceRpe: row.source_rpe ?? undefined,
      formulaUsed: row.formula_used as OneRMFormula,
      workoutId: row.workout_id ?? undefined,
      setId: row.set_id ?? undefined,
      isPr: row.is_pr,
      bodyweightKg: row.bodyweight_kg ? parseFloat(row.bodyweight_kg) : undefined,
      relativeStrength: row.relative_strength ? parseFloat(row.relative_strength) : undefined,
      recordedAt: row.recorded_at,
    };
  },
};

export default OneRepMaxService;
