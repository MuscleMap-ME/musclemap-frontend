/**
 * One Rep Max (1RM) Service
 *
 * Handles 1RM calculation, tracking, and achievement checking:
 * - Multiple 1RM calculation formulas (Epley, Brzycki, etc.)
 * - 1RM history tracking and PR detection
 * - Compound total tracking (Squat + Bench + Deadlift)
 * - 1RM-based achievement unlocking
 */

import { query, queryOne, queryAll } from '../db/client';
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
 * One Rep Max (1RM) Estimation Formulas
 *
 * All formulas estimate the maximum weight a person can lift for a single repetition
 * based on the weight lifted and number of reps performed.
 *
 * ACCURACY NOTES:
 * - Most accurate for 1-10 reps (r² > 0.95)
 * - Accuracy decreases significantly above 10 reps
 * - Individual variation can cause 5-10% error
 * - Use "average" formula for best general accuracy
 *
 * FORMULA RECOMMENDATIONS:
 * - Epley: Best for 6-10 rep ranges
 * - Brzycki: Best for 1-6 rep ranges (more conservative)
 * - Lombardi: Simple, good for quick mental math
 * - O'Conner: Good for general fitness (slightly conservative)
 */
export const OneRMFormulas = {
  /**
   * Epley Formula: 1RM = weight × (1 + reps/30)
   *
   * Developed by Boyd Epley, former strength coach at University of Nebraska.
   * One of the most widely used formulas in strength training.
   *
   * Characteristics:
   * - Linear relationship with reps
   * - Tends to overestimate at high rep ranges (>12)
   * - Best accuracy in 6-10 rep range
   *
   * @example 200 lbs × 5 reps = 200 × (1 + 5/30) = 200 × 1.167 = 233.3 lbs
   */
  epley(weight: number, reps: number): number {
    if (reps === 1) return weight;
    return weight * (1 + reps / 30);
  },

  /**
   * Brzycki Formula: 1RM = weight × (36 / (37 - reps))
   *
   * Developed by Matt Brzycki, coordinator of fitness at Princeton University.
   * More conservative than Epley, especially for higher rep ranges.
   *
   * Characteristics:
   * - Non-linear (exponential increase as reps approach 37)
   * - More conservative estimates
   * - Best accuracy in 1-6 rep range
   * - Cannot calculate for reps >= 37 (mathematical constraint)
   *
   * @example 200 lbs × 5 reps = 200 × (36 / (37-5)) = 200 × 1.125 = 225 lbs
   */
  brzycki(weight: number, reps: number): number {
    if (reps === 1) return weight;
    if (reps >= 37) return weight * 36; // Prevent division by zero
    return weight * 36 / (37 - reps);
  },

  /**
   * Lombardi Formula: 1RM = weight × reps^0.10
   *
   * Developed by Vincent Lombardi. Uses a power relationship.
   *
   * Characteristics:
   * - Simple power function
   * - Easy to calculate mentally (reps to the 0.1 power ≈ 1.0-1.3)
   * - Tends to underestimate compared to other formulas
   * - Consistent across all rep ranges
   *
   * @example 200 lbs × 5 reps = 200 × 5^0.10 = 200 × 1.175 = 235 lbs
   */
  lombardi(weight: number, reps: number): number {
    if (reps === 1) return weight;
    return weight * Math.pow(reps, 0.10);
  },

  /**
   * O'Conner Formula: 1RM = weight × (1 + reps/40)
   *
   * A more conservative version of the Epley formula.
   * Divides reps by 40 instead of 30.
   *
   * Characteristics:
   * - Linear relationship like Epley
   * - More conservative (lower estimates)
   * - Good for general fitness populations
   * - Less likely to overestimate
   *
   * @example 200 lbs × 5 reps = 200 × (1 + 5/40) = 200 × 1.125 = 225 lbs
   */
  oconner(weight: number, reps: number): number {
    if (reps === 1) return weight;
    return weight * (1 + reps / 40);
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
   * Research shows averaging multiple formulas provides the most reliable estimate.
   */
  average(weight: number, reps: number): number {
    if (reps === 1) return weight;
    const formulas: OneRMFormula[] = ['epley', 'brzycki', 'lombardi', 'oconner'];
    const estimates = formulas.map(f => this.calculate(weight, reps, f));
    return estimates.reduce((a, b) => a + b, 0) / estimates.length;
  },

  /**
   * Calculate all formulas and return detailed breakdown
   */
  calculateAll(weight: number, reps: number): {
    epley: number;
    brzycki: number;
    lombardi: number;
    oconner: number;
    average: number;
    min: number;
    max: number;
    range: number;
  } {
    if (reps === 1) {
      return {
        epley: weight,
        brzycki: weight,
        lombardi: weight,
        oconner: weight,
        average: weight,
        min: weight,
        max: weight,
        range: 0,
      };
    }

    const results = {
      epley: this.epley(weight, reps),
      brzycki: this.brzycki(weight, reps),
      lombardi: this.lombardi(weight, reps),
      oconner: this.oconner(weight, reps),
    };

    const values = Object.values(results);
    const min = Math.min(...values);
    const max = Math.max(...values);

    return {
      ...results,
      average: values.reduce((a, b) => a + b, 0) / values.length,
      min,
      max,
      range: max - min,
    };
  },

  /**
   * Reverse calculation: Get weight for target 1RM at given reps
   * Useful for programming: "What weight should I use for 5 reps to hit 80% of my 1RM?"
   *
   * @param target1rm - Target 1RM value
   * @param reps - Number of reps to perform
   * @param formula - Formula to use for calculation
   * @returns Weight to use
   */
  getWeightForReps(target1rm: number, reps: number, formula: OneRMFormula = 'epley'): number {
    if (reps === 1) return target1rm;
    if (target1rm <= 0 || reps < 1) return 0;

    switch (formula) {
      case 'epley':
        // weight = 1RM / (1 + reps/30)
        return target1rm / (1 + reps / 30);
      case 'brzycki':
        // weight = 1RM × (37 - reps) / 36
        if (reps >= 37) return target1rm / 36;
        return target1rm * (37 - reps) / 36;
      case 'lombardi':
        // weight = 1RM / reps^0.10
        return target1rm / Math.pow(reps, 0.10);
      case 'oconner':
        // weight = 1RM / (1 + reps/40)
        return target1rm / (1 + reps / 40);
      default:
        return target1rm / (1 + reps / 30);
    }
  },

  /**
   * Calculate percentage of 1RM for given weight and reps
   * Useful for tracking intensity relative to max
   *
   * @param weight - Weight lifted
   * @param reps - Reps performed
   * @param known1rm - User's known 1RM for the exercise
   * @returns Percentage of 1RM (e.g., 0.85 for 85%)
   */
  getPercentageOf1rm(weight: number, reps: number, known1rm: number): number {
    if (known1rm <= 0) return 0;
    const estimated = this.average(weight, reps);
    return estimated / known1rm;
  },

  /**
   * Generate a rep-max table for training programming
   * Shows estimated weights for different rep ranges based on 1RM
   *
   * @param oneRepMax - The user's 1RM
   * @param formula - Formula to use
   * @returns Array of rep ranges with corresponding weights and percentages
   */
  generateRepMaxTable(oneRepMax: number, formula: OneRMFormula = 'epley'): Array<{
    reps: number;
    weight: number;
    percentage: number;
  }> {
    const repRanges = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 12, 15, 20];
    return repRanges.map(reps => {
      const weight = this.getWeightForReps(oneRepMax, reps, formula);
      return {
        reps,
        weight: Math.round(weight * 100) / 100,
        percentage: Math.round((weight / oneRepMax) * 10000) / 100,
      };
    });
  },
};

// ============================================
// Powerlifting Score Calculations (Wilks & DOTS)
// ============================================

/**
 * Wilks and DOTS score calculators for comparing lifts across different bodyweights.
 * These are standard formulas used in competitive powerlifting.
 */
export const PowerliftingScores = {
  /**
   * Wilks Coefficient Formula
   * Used to compare powerlifting totals across different bodyweight classes.
   *
   * Wilks = Total × Coefficient
   * where Coefficient = 500 / (a + b×bw + c×bw² + d×bw³ + e×bw⁴ + f×bw⁵)
   *
   * @param totalKg - Total weight lifted (sum of squat, bench, deadlift) in kg
   * @param bodyweightKg - Bodyweight in kg
   * @param isMale - True for male coefficients, false for female
   * @returns Wilks score
   */
  calculateWilks(totalKg: number, bodyweightKg: number, isMale: boolean = true): number {
    if (totalKg <= 0 || bodyweightKg <= 0) return 0;

    // Clamp bodyweight to reasonable range
    const bw = Math.max(40, Math.min(bodyweightKg, 200));

    // Male coefficients (IPF official)
    const maleCoeffs = {
      a: -216.0475144,
      b: 16.2606339,
      c: -0.002388645,
      d: -0.00113732,
      e: 0.00000701863,
      f: -0.00000001291,
    };

    // Female coefficients (IPF official)
    const femaleCoeffs = {
      a: 594.31747775582,
      b: -27.23842536447,
      c: 0.82112226871,
      d: -0.00930733913,
      e: 0.00004731582,
      f: -0.00000009054,
    };

    const coeffs = isMale ? maleCoeffs : femaleCoeffs;

    const denominator =
      coeffs.a +
      coeffs.b * bw +
      coeffs.c * Math.pow(bw, 2) +
      coeffs.d * Math.pow(bw, 3) +
      coeffs.e * Math.pow(bw, 4) +
      coeffs.f * Math.pow(bw, 5);

    if (denominator === 0) return 0;

    const coefficient = 500 / denominator;
    return Math.round(totalKg * coefficient * 100) / 100;
  },

  /**
   * DOTS (Dynamic Objective Team Scoring) Formula
   * A newer formula that replaces Wilks in some federations.
   * Better accuracy across a wider range of bodyweights.
   *
   * @param totalKg - Total weight lifted (sum of squat, bench, deadlift) in kg
   * @param bodyweightKg - Bodyweight in kg
   * @param isMale - True for male coefficients, false for female
   * @returns DOTS score
   */
  calculateDots(totalKg: number, bodyweightKg: number, isMale: boolean = true): number {
    if (totalKg <= 0 || bodyweightKg <= 0) return 0;

    // Clamp bodyweight to reasonable range
    const bw = Math.max(40, Math.min(bodyweightKg, 200));

    // Male DOTS coefficients
    const maleCoeffs = {
      a: -307.75076,
      b: 24.0900756,
      c: -0.1918759221,
      d: 0.0007391293,
      e: -0.000001093,
    };

    // Female DOTS coefficients
    const femaleCoeffs = {
      a: -57.96288,
      b: 13.6175032,
      c: -0.1126655495,
      d: 0.0005158568,
      e: -0.0000010706,
    };

    const coeffs = isMale ? maleCoeffs : femaleCoeffs;

    const denominator =
      coeffs.a +
      coeffs.b * bw +
      coeffs.c * Math.pow(bw, 2) +
      coeffs.d * Math.pow(bw, 3) +
      coeffs.e * Math.pow(bw, 4);

    if (denominator === 0) return 0;

    const dotsScore = (500 / denominator) * totalKg;
    return Math.round(dotsScore * 100) / 100;
  },

  /**
   * Convert pounds to kilograms
   */
  lbsToKg(lbs: number): number {
    return lbs * 0.453592;
  },

  /**
   * Convert kilograms to pounds
   */
  kgToLbs(kg: number): number {
    return kg * 2.20462;
  },
};

// ============================================
// Strength Standards (for comparison)
// ============================================

/**
 * Strength standards based on bodyweight ratios
 * These are approximate guidelines for classification
 */
export const StrengthStandards = {
  // Multipliers of bodyweight for each level (male)
  male: {
    squat: {
      beginner: 0.75,
      novice: 1.0,
      intermediate: 1.5,
      advanced: 2.0,
      elite: 2.5,
    },
    bench: {
      beginner: 0.5,
      novice: 0.75,
      intermediate: 1.0,
      advanced: 1.5,
      elite: 2.0,
    },
    deadlift: {
      beginner: 1.0,
      novice: 1.25,
      intermediate: 1.75,
      advanced: 2.25,
      elite: 3.0,
    },
  },
  // Multipliers of bodyweight for each level (female)
  female: {
    squat: {
      beginner: 0.5,
      novice: 0.75,
      intermediate: 1.0,
      advanced: 1.5,
      elite: 2.0,
    },
    bench: {
      beginner: 0.25,
      novice: 0.5,
      intermediate: 0.75,
      advanced: 1.0,
      elite: 1.5,
    },
    deadlift: {
      beginner: 0.75,
      novice: 1.0,
      intermediate: 1.25,
      advanced: 1.75,
      elite: 2.25,
    },
  },

  /**
   * Classify a lift based on bodyweight ratio
   * @param lift1rm - The 1RM weight
   * @param bodyweight - User's bodyweight (same units as lift1rm)
   * @param liftType - Type of lift (squat, bench, deadlift)
   * @param isMale - True for male standards
   * @returns Classification level
   */
  classify(
    lift1rm: number,
    bodyweight: number,
    liftType: 'squat' | 'bench' | 'deadlift',
    isMale: boolean = true
  ): {
    level: 'untrained' | 'beginner' | 'novice' | 'intermediate' | 'advanced' | 'elite';
    ratio: number;
    nextLevel?: string;
    nextLevelWeight?: number;
  } {
    if (bodyweight <= 0 || lift1rm <= 0) {
      return { level: 'untrained', ratio: 0 };
    }

    const ratio = lift1rm / bodyweight;
    const standards = isMale ? this.male[liftType] : this.female[liftType];

    let level: 'untrained' | 'beginner' | 'novice' | 'intermediate' | 'advanced' | 'elite';
    let nextLevel: string | undefined;
    let nextLevelWeight: number | undefined;

    if (ratio >= standards.elite) {
      level = 'elite';
    } else if (ratio >= standards.advanced) {
      level = 'advanced';
      nextLevel = 'elite';
      nextLevelWeight = bodyweight * standards.elite;
    } else if (ratio >= standards.intermediate) {
      level = 'intermediate';
      nextLevel = 'advanced';
      nextLevelWeight = bodyweight * standards.advanced;
    } else if (ratio >= standards.novice) {
      level = 'novice';
      nextLevel = 'intermediate';
      nextLevelWeight = bodyweight * standards.intermediate;
    } else if (ratio >= standards.beginner) {
      level = 'beginner';
      nextLevel = 'novice';
      nextLevelWeight = bodyweight * standards.novice;
    } else {
      level = 'untrained';
      nextLevel = 'beginner';
      nextLevelWeight = bodyweight * standards.beginner;
    }

    return {
      level,
      ratio: Math.round(ratio * 100) / 100,
      nextLevel,
      nextLevelWeight: nextLevelWeight ? Math.round(nextLevelWeight * 10) / 10 : undefined,
    };
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

    // Validate days parameter to prevent SQL injection
    const validatedDays = Math.max(1, Math.min(3650, Math.floor(Number(days) || 365)));

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
         AND h.recorded_at >= CURRENT_DATE - INTERVAL '1 day' * $3
       ORDER BY h.recorded_at DESC
       LIMIT $4`,
      [userId, exerciseId, validatedDays, limit]
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

    // Validate days parameter to prevent SQL injection
    const validatedDays = Math.max(1, Math.min(3650, Math.floor(Number(days) || 180)));

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
         AND recorded_at >= CURRENT_DATE - INTERVAL '1 day' * $3
       GROUP BY ${dateFunc}
       ORDER BY ${dateFunc} ASC`,
      [userId, exerciseId, validatedDays]
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
   * Delete a 1RM entry
   * Note: Can only delete entries that are not PRs or if there are newer PRs
   */
  async deleteEntry(userId: string, entryId: string): Promise<{ deleted: boolean; message: string }> {
    // First check if entry exists and belongs to user
    const entry = await queryOne<{
      id: string;
      exercise_id: string;
      is_pr: boolean;
      estimated_1rm: string;
    }>(
      'SELECT id, exercise_id, is_pr, estimated_1rm FROM exercise_1rm_history WHERE id = $1 AND user_id = $2',
      [entryId, userId]
    );

    if (!entry) {
      return { deleted: false, message: 'Entry not found or not owned by user' };
    }

    // If it's a PR, check if there's a newer PR
    if (entry.is_pr) {
      const newerPr = await queryOne<{ id: string }>(
        `SELECT id FROM exercise_1rm_history
         WHERE user_id = $1 AND exercise_id = $2 AND id != $3 AND is_pr = TRUE
         AND estimated_1rm >= $4`,
        [userId, entry.exercise_id, entryId, parseFloat(entry.estimated_1rm)]
      );

      if (!newerPr) {
        // Find the next best entry and promote it to PR
        const nextBest = await queryOne<{ id: string }>(
          `SELECT id FROM exercise_1rm_history
           WHERE user_id = $1 AND exercise_id = $2 AND id != $3
           ORDER BY estimated_1rm DESC LIMIT 1`,
          [userId, entry.exercise_id, entryId]
        );

        if (nextBest) {
          await query('UPDATE exercise_1rm_history SET is_pr = TRUE WHERE id = $1', [nextBest.id]);
        }
      }
    }

    // Delete the entry
    await query('DELETE FROM exercise_1rm_history WHERE id = $1', [entryId]);

    return { deleted: true, message: 'Entry deleted successfully' };
  },

  /**
   * Get user's PR for a specific exercise
   */
  async getExercisePR(userId: string, exerciseId: string): Promise<OneRMEntry | null> {
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
      exercise_name: string | null;
    }>(
      `SELECT h.*, e.name as exercise_name
       FROM exercise_1rm_history h
       LEFT JOIN exercises e ON e.id = h.exercise_id
       WHERE h.user_id = $1 AND h.exercise_id = $2
       ORDER BY h.estimated_1rm DESC
       LIMIT 1`,
      [userId, exerciseId]
    );

    return row ? this.mapEntry(row) : null;
  },

  /**
   * Calculate and update Wilks/DOTS scores for a user
   */
  async updatePowerliftingScores(userId: string, bodyweightKg: number, isMale: boolean = true): Promise<{
    wilks: number | null;
    dots: number | null;
    total: number;
  }> {
    const total = await this.getCompoundTotal(userId);

    if (!total || total.powerliftingTotal === 0) {
      return { wilks: null, dots: null, total: 0 };
    }

    // Convert total from lbs to kg
    const totalKg = PowerliftingScores.lbsToKg(total.powerliftingTotal);

    const wilks = PowerliftingScores.calculateWilks(totalKg, bodyweightKg, isMale);
    const dots = PowerliftingScores.calculateDots(totalKg, bodyweightKg, isMale);

    // Update the database
    await query(
      `UPDATE user_compound_totals
       SET wilks_score = $1, dots_score = $2, last_bodyweight_kg = $3, updated_at = NOW()
       WHERE user_id = $4`,
      [wilks, dots, bodyweightKg, userId]
    );

    return {
      wilks,
      dots,
      total: total.powerliftingTotal,
    };
  },

  /**
   * Compare user's lifts against strength standards
   */
  async getStrengthClassification(
    userId: string,
    bodyweightLbs: number,
    isMale: boolean = true
  ): Promise<{
    squat?: { level: string; ratio: number; nextLevel?: string; nextLevelWeight?: number };
    bench?: { level: string; ratio: number; nextLevel?: string; nextLevelWeight?: number };
    deadlift?: { level: string; ratio: number; nextLevel?: string; nextLevelWeight?: number };
    overall?: string;
  }> {
    const total = await this.getCompoundTotal(userId);

    if (!total) {
      return {};
    }

    const result: {
      squat?: { level: string; ratio: number; nextLevel?: string; nextLevelWeight?: number };
      bench?: { level: string; ratio: number; nextLevel?: string; nextLevelWeight?: number };
      deadlift?: { level: string; ratio: number; nextLevel?: string; nextLevelWeight?: number };
      overall?: string;
    } = {};

    if (total.bestSquat1rm) {
      result.squat = StrengthStandards.classify(total.bestSquat1rm, bodyweightLbs, 'squat', isMale);
    }
    if (total.bestBench1rm) {
      result.bench = StrengthStandards.classify(total.bestBench1rm, bodyweightLbs, 'bench', isMale);
    }
    if (total.bestDeadlift1rm) {
      result.deadlift = StrengthStandards.classify(total.bestDeadlift1rm, bodyweightLbs, 'deadlift', isMale);
    }

    // Calculate overall classification (lowest of the three)
    const levels = ['untrained', 'beginner', 'novice', 'intermediate', 'advanced', 'elite'];
    const classifications = [result.squat?.level, result.bench?.level, result.deadlift?.level].filter(Boolean) as string[];

    if (classifications.length > 0) {
      const minLevelIndex = Math.min(...classifications.map(c => levels.indexOf(c)));
      result.overall = levels[minLevelIndex];
    }

    return result;
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
