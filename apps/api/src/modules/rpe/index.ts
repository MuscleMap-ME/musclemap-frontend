/**
 * RPE/RIR Analysis Module
 *
 * Provides intelligent workout intensity tracking and recommendations:
 * - RPE (Rate of Perceived Exertion) trend analysis
 * - RIR (Reps in Reserve) tracking
 * - Fatigue detection
 * - Auto-regulation recommendations
 * - Load adjustment suggestions
 */

import { queryAll, queryOne, query } from '../../db/client';
import cache, { CACHE_TTL, CACHE_PREFIX } from '../../lib/cache.service';
import { loggers } from '../../lib/logger';

const log = loggers.db.child({ module: 'rpe' });

// ============================================
// RPE Scale Descriptions
// ============================================
export const RPE_SCALE = {
  10: { description: 'Maximum effort - could not do more reps', intensity: 'maximal' },
  9.5: { description: 'Could maybe do 1 more rep', intensity: 'near-maximal' },
  9: { description: 'Could definitely do 1 more rep', intensity: 'very hard' },
  8.5: { description: 'Could do 1-2 more reps', intensity: 'very hard' },
  8: { description: 'Could do 2 more reps', intensity: 'hard' },
  7.5: { description: 'Could do 2-3 more reps', intensity: 'hard' },
  7: { description: 'Could do 3 more reps', intensity: 'moderate-hard' },
  6.5: { description: 'Could do 3-4 more reps', intensity: 'moderate' },
  6: { description: 'Could do 4+ more reps', intensity: 'moderate' },
  5: { description: 'Warm-up / light work', intensity: 'light' },
} as const;

// RIR to RPE mapping (approximate)
export const RIR_TO_RPE: Record<number, number> = {
  0: 10,
  1: 9,
  2: 8,
  3: 7,
  4: 6,
  5: 5,
};

export const RPE_TO_RIR: Record<number, number> = {
  10: 0,
  9: 1,
  8: 2,
  7: 3,
  6: 4,
  5: 5,
};

// ============================================
// Types
// ============================================
export interface RPETrend {
  exerciseId: string;
  exerciseName?: string;
  date: Date;
  avgRpe: number;
  avgRir: number | null;
  setCount: number;
  avgWeight: number;
  maxWeight: number;
  avgReps: number;
}

export interface WeeklyRPETrend {
  exerciseId: string;
  weekStart: Date;
  avgRpe: number;
  avgRir: number | null;
  totalSets: number;
  rpeVariance: number;
  minRpe: number;
  maxRpe: number;
  avgWeight: number;
  totalVolume: number;
}

export interface FatigueAnalysis {
  userId: string;
  fatigueScore: number; // 0-100 (0 = fully recovered, 100 = very fatigued)
  classification: 'recovered' | 'fresh' | 'moderate' | 'elevated' | 'high';
  indicators: string[];
  recommendation: string;
  suggestedIntensity: 'light' | 'moderate' | 'hard' | 'maximal';
  recentRpeTrend: 'increasing' | 'stable' | 'decreasing';
}

export interface AutoRegulationSuggestion {
  exerciseId: string;
  exerciseName?: string;
  currentWeight?: number;
  suggestedWeight: number;
  suggestedReps: number;
  targetRpe: number;
  reasoning: string;
  adjustmentPercent: number;
  confidence: 'high' | 'medium' | 'low';
}

export interface RPESnapshot {
  userId: string;
  snapshotDate: Date;
  avgRpe: number;
  avgRir: number | null;
  totalSets: number;
  fatigueScore: number;
  recoveryRecommendation: string;
}

// ============================================
// Service Functions
// ============================================

/**
 * Get RPE trends for a specific exercise over time
 */
export async function getRPETrends(
  userId: string,
  exerciseId: string,
  days: number = 30
): Promise<RPETrend[]> {
  const cacheKey = `${CACHE_PREFIX.USER_STATS}rpe:${userId}:${exerciseId}:${days}`;

  return cache.getOrSet(cacheKey, CACHE_TTL.USER_STATS, async () => {
    const trends = await queryAll<{
      exercise_id: string;
      exercise_name: string | null;
      workout_date: Date;
      avg_rpe: string;
      avg_rir: string | null;
      set_count: string;
      avg_weight: string;
      max_weight: string;
      avg_reps: string;
    }>(
      `SELECT
        v.exercise_id,
        e.name as exercise_name,
        v.workout_date,
        v.avg_rpe,
        v.avg_rir,
        v.set_count,
        v.avg_weight,
        v.max_weight,
        v.avg_reps
      FROM v_rpe_daily_trends v
      LEFT JOIN exercises e ON e.id = v.exercise_id
      WHERE v.user_id = $1
        AND v.exercise_id = $2
        AND v.workout_date >= CURRENT_DATE - INTERVAL '${days} days'
      ORDER BY v.workout_date DESC`,
      [userId, exerciseId]
    );

    return trends.map((t) => ({
      exerciseId: t.exercise_id,
      exerciseName: t.exercise_name || undefined,
      date: t.workout_date,
      avgRpe: parseFloat(t.avg_rpe),
      avgRir: t.avg_rir ? parseFloat(t.avg_rir) : null,
      setCount: parseInt(t.set_count),
      avgWeight: parseFloat(t.avg_weight),
      maxWeight: parseFloat(t.max_weight),
      avgReps: parseFloat(t.avg_reps),
    }));
  });
}

/**
 * Get weekly RPE trends for an exercise (for long-term analysis)
 */
export async function getWeeklyRPETrends(
  userId: string,
  exerciseId: string,
  weeks: number = 12
): Promise<WeeklyRPETrend[]> {
  const trends = await queryAll<{
    exercise_id: string;
    week_start: Date;
    avg_rpe: string;
    avg_rir: string | null;
    total_sets: string;
    rpe_variance: string | null;
    min_rpe: string;
    max_rpe: string;
    avg_weight: string;
    total_volume: string;
  }>(
    `SELECT *
     FROM v_rpe_weekly_trends
     WHERE user_id = $1
       AND exercise_id = $2
       AND week_start >= CURRENT_DATE - INTERVAL '${weeks} weeks'
     ORDER BY week_start DESC`,
    [userId, exerciseId]
  );

  return trends.map((t) => ({
    exerciseId: t.exercise_id,
    weekStart: t.week_start,
    avgRpe: parseFloat(t.avg_rpe),
    avgRir: t.avg_rir ? parseFloat(t.avg_rir) : null,
    totalSets: parseInt(t.total_sets),
    rpeVariance: t.rpe_variance ? parseFloat(t.rpe_variance) : 0,
    minRpe: parseFloat(t.min_rpe),
    maxRpe: parseFloat(t.max_rpe),
    avgWeight: parseFloat(t.avg_weight),
    totalVolume: parseFloat(t.total_volume),
  }));
}

/**
 * Analyze user's current fatigue level based on recent RPE data
 */
export async function analyzeFatigue(userId: string): Promise<FatigueAnalysis> {
  // Get recent RPE data (last 7 days)
  const recentData = await queryAll<{
    workout_date: Date;
    avg_rpe: string;
    set_count: string;
    max_rpe: string;
  }>(
    `SELECT
      DATE(performed_at) as workout_date,
      ROUND(AVG(rpe), 1) as avg_rpe,
      COUNT(*) as set_count,
      MAX(rpe) as max_rpe
    FROM workout_sets
    WHERE user_id = $1
      AND performed_at >= CURRENT_DATE - INTERVAL '7 days'
      AND rpe IS NOT NULL
      AND tag != 'warmup'
    GROUP BY DATE(performed_at)
    ORDER BY workout_date DESC`,
    [userId]
  );

  const indicators: string[] = [];
  let fatigueScore = 0;

  // No recent data - assume fresh
  if (recentData.length === 0) {
    return {
      userId,
      fatigueScore: 0,
      classification: 'fresh',
      indicators: ['No recent workout data with RPE'],
      recommendation: 'You are ready for any intensity level',
      suggestedIntensity: 'hard',
      recentRpeTrend: 'stable',
    };
  }

  // Calculate average RPE over the period
  const avgRpeOverall =
    recentData.reduce((sum, d) => sum + parseFloat(d.avg_rpe), 0) / recentData.length;

  // Check for consistently high RPE (fatigue indicator)
  if (avgRpeOverall >= 9) {
    fatigueScore += 40;
    indicators.push('Consistently very high RPE (9+) - possible accumulated fatigue');
  } else if (avgRpeOverall >= 8) {
    fatigueScore += 25;
    indicators.push('High average RPE (8+) - moderate fatigue accumulation');
  } else if (avgRpeOverall >= 7) {
    fatigueScore += 10;
    indicators.push('Moderate average RPE');
  }

  // Check for increasing RPE trend (same weight feeling harder)
  if (recentData.length >= 3) {
    const recent3 = recentData.slice(0, 3);
    const oldest = parseFloat(recent3[recent3.length - 1].avg_rpe);
    const newest = parseFloat(recent3[0].avg_rpe);
    const trendDiff = newest - oldest;

    if (trendDiff > 1.5) {
      fatigueScore += 30;
      indicators.push('RPE increasing significantly - fatigue accumulating');
    } else if (trendDiff > 0.5) {
      fatigueScore += 15;
      indicators.push('RPE trending upward');
    } else if (trendDiff < -0.5) {
      fatigueScore -= 10;
      indicators.push('RPE trending downward - adapting well');
    }
  }

  // Check training frequency
  if (recentData.length >= 6) {
    fatigueScore += 20;
    indicators.push('High training frequency (6+ days in 7 days)');
  } else if (recentData.length >= 4) {
    fatigueScore += 10;
    indicators.push('Moderate-high training frequency');
  }

  // Check for max effort sets (RPE 10)
  const maxEffortDays = recentData.filter((d) => parseFloat(d.max_rpe) >= 10).length;
  if (maxEffortDays >= 3) {
    fatigueScore += 15;
    indicators.push('Multiple max effort sessions recently');
  }

  // Normalize score
  fatigueScore = Math.max(0, Math.min(100, fatigueScore));

  // Determine classification and recommendation
  let classification: FatigueAnalysis['classification'];
  let recommendation: string;
  let suggestedIntensity: FatigueAnalysis['suggestedIntensity'];

  if (fatigueScore <= 15) {
    classification = 'recovered';
    recommendation = 'Fully recovered - push hard if desired';
    suggestedIntensity = 'maximal';
  } else if (fatigueScore <= 30) {
    classification = 'fresh';
    recommendation = 'Well recovered - normal training intensity recommended';
    suggestedIntensity = 'hard';
  } else if (fatigueScore <= 50) {
    classification = 'moderate';
    recommendation = 'Some fatigue present - consider reducing intensity by 5-10%';
    suggestedIntensity = 'moderate';
  } else if (fatigueScore <= 70) {
    classification = 'elevated';
    recommendation = 'Elevated fatigue - reduce volume/intensity or take a light day';
    suggestedIntensity = 'light';
  } else {
    classification = 'high';
    recommendation = 'High fatigue detected - consider a deload or rest day';
    suggestedIntensity = 'light';
  }

  // Determine trend direction
  let recentRpeTrend: FatigueAnalysis['recentRpeTrend'] = 'stable';
  if (recentData.length >= 2) {
    const diff = parseFloat(recentData[0].avg_rpe) - parseFloat(recentData[1].avg_rpe);
    if (diff > 0.5) recentRpeTrend = 'increasing';
    else if (diff < -0.5) recentRpeTrend = 'decreasing';
  }

  log.info({ userId, fatigueScore, classification }, 'Fatigue analysis completed');

  return {
    userId,
    fatigueScore,
    classification,
    indicators,
    recommendation,
    suggestedIntensity,
    recentRpeTrend,
  };
}

/**
 * Get auto-regulation recommendations for a workout
 * Adjusts weights based on current fatigue and recent performance
 */
export async function getAutoRegulationSuggestions(
  userId: string,
  exerciseIds: string[],
  targetRpe: number = 8
): Promise<AutoRegulationSuggestion[]> {
  const fatigue = await analyzeFatigue(userId);
  const suggestions: AutoRegulationSuggestion[] = [];

  // Fatigue-based adjustment multiplier
  const fatigueMultiplier =
    fatigue.classification === 'recovered'
      ? 1.05
      : fatigue.classification === 'fresh'
        ? 1.0
        : fatigue.classification === 'moderate'
          ? 0.95
          : fatigue.classification === 'elevated'
            ? 0.9
            : 0.85;

  for (const exerciseId of exerciseIds) {
    // Get recent performance for this exercise
    const recentPerformance = await queryOne<{
      avg_weight: string;
      avg_reps: string;
      avg_rpe: string;
      last_weight: string;
      last_reps: string;
      last_rpe: string;
    }>(
      `SELECT
        ROUND(AVG(weight), 1) as avg_weight,
        ROUND(AVG(reps), 0) as avg_reps,
        ROUND(AVG(rpe), 1) as avg_rpe,
        (SELECT weight FROM workout_sets
         WHERE user_id = $1 AND exercise_id = $2 AND tag != 'warmup' AND weight > 0
         ORDER BY performed_at DESC LIMIT 1) as last_weight,
        (SELECT reps FROM workout_sets
         WHERE user_id = $1 AND exercise_id = $2 AND tag != 'warmup' AND weight > 0
         ORDER BY performed_at DESC LIMIT 1) as last_reps,
        (SELECT rpe FROM workout_sets
         WHERE user_id = $1 AND exercise_id = $2 AND tag != 'warmup' AND rpe IS NOT NULL
         ORDER BY performed_at DESC LIMIT 1) as last_rpe
      FROM workout_sets
      WHERE user_id = $1
        AND exercise_id = $2
        AND tag != 'warmup'
        AND weight > 0
        AND performed_at >= CURRENT_DATE - INTERVAL '14 days'`,
      [userId, exerciseId]
    );

    // Get exercise name
    const exercise = await queryOne<{ name: string }>('SELECT name FROM exercises WHERE id = $1', [
      exerciseId,
    ]);

    // Skip if no data
    if (!recentPerformance?.avg_weight) {
      suggestions.push({
        exerciseId,
        exerciseName: exercise?.name,
        suggestedWeight: 0,
        suggestedReps: 10,
        targetRpe,
        reasoning: 'No recent data - start light and build up',
        adjustmentPercent: 0,
        confidence: 'low',
      });
      continue;
    }

    const avgWeight = parseFloat(recentPerformance.avg_weight);
    const avgReps = parseInt(recentPerformance.avg_reps);
    const avgRpe = recentPerformance.avg_rpe ? parseFloat(recentPerformance.avg_rpe) : null;
    const lastWeight = recentPerformance.last_weight
      ? parseFloat(recentPerformance.last_weight)
      : avgWeight;
    const _lastRpe = recentPerformance.last_rpe ? parseFloat(recentPerformance.last_rpe) : null;

    // Calculate RPE-based adjustment
    let rpeAdjustment = 1.0;
    if (avgRpe && avgRpe !== targetRpe) {
      // Each RPE point is roughly 2-3% of 1RM
      const rpeDiff = targetRpe - avgRpe;
      rpeAdjustment = 1 + rpeDiff * 0.025;
    }

    // Apply both adjustments
    const totalMultiplier = fatigueMultiplier * rpeAdjustment;
    const suggestedWeight = Math.round((lastWeight * totalMultiplier) / 2.5) * 2.5; // Round to nearest 2.5

    // Determine confidence
    let confidence: AutoRegulationSuggestion['confidence'] = 'high';
    if (!avgRpe) confidence = 'medium';
    if (fatigue.fatigueScore > 50) confidence = 'medium';
    if (!recentPerformance.last_rpe) confidence = 'low';

    // Build reasoning
    const reasons: string[] = [];
    if (fatigueMultiplier !== 1.0) {
      reasons.push(
        `${fatigue.classification} fatigue level (${Math.round((fatigueMultiplier - 1) * 100)}% adjustment)`
      );
    }
    if (rpeAdjustment !== 1.0) {
      reasons.push(
        `Targeting RPE ${targetRpe} vs recent average ${avgRpe?.toFixed(1) || 'N/A'}`
      );
    }
    if (reasons.length === 0) {
      reasons.push('Based on recent performance');
    }

    const adjustmentPercent = Math.round((totalMultiplier - 1) * 100);

    suggestions.push({
      exerciseId,
      exerciseName: exercise?.name,
      currentWeight: lastWeight,
      suggestedWeight,
      suggestedReps: avgReps || 8,
      targetRpe,
      reasoning: reasons.join('; '),
      adjustmentPercent,
      confidence,
    });
  }

  return suggestions;
}

/**
 * Get user's default RPE/RIR targets for an exercise
 */
export async function getExerciseRPETarget(
  userId: string,
  exerciseId: string
): Promise<{ rpe: number | null; rir: number | null }> {
  const pref = await queryOne<{
    default_rpe_target: number | null;
    default_rir_target: number | null;
  }>(
    `SELECT default_rpe_target, default_rir_target
     FROM user_exercise_preferences
     WHERE user_id = $1 AND exercise_id = $2`,
    [userId, exerciseId]
  );

  return {
    rpe: pref?.default_rpe_target || null,
    rir: pref?.default_rir_target || null,
  };
}

/**
 * Set user's default RPE/RIR targets for an exercise
 */
export async function setExerciseRPETarget(
  userId: string,
  exerciseId: string,
  rpe: number | null,
  rir: number | null
): Promise<void> {
  await query(
    `INSERT INTO user_exercise_preferences (user_id, exercise_id, default_rpe_target, default_rir_target)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (user_id, exercise_id) DO UPDATE SET
       default_rpe_target = EXCLUDED.default_rpe_target,
       default_rir_target = EXCLUDED.default_rir_target,
       updated_at = NOW()`,
    [userId, exerciseId, rpe, rir]
  );

  log.info({ userId, exerciseId, rpe, rir }, 'Updated exercise RPE target');
}

/**
 * Get RPE info/scale reference
 */
export function getRPEScaleInfo(): typeof RPE_SCALE {
  return RPE_SCALE;
}

/**
 * Create daily RPE snapshot for a user
 */
export async function createRPESnapshot(userId: string): Promise<RPESnapshot | null> {
  const today = new Date().toISOString().split('T')[0];

  // Get today's data
  const todayData = await queryOne<{
    avg_rpe: string;
    avg_rir: string | null;
    set_count: string;
  }>(
    `SELECT
      ROUND(AVG(rpe), 1) as avg_rpe,
      ROUND(AVG(rir), 1) as avg_rir,
      COUNT(*) as set_count
    FROM workout_sets
    WHERE user_id = $1
      AND DATE(performed_at) = CURRENT_DATE
      AND rpe IS NOT NULL
      AND tag != 'warmup'`,
    [userId]
  );

  if (!todayData?.avg_rpe) {
    return null;
  }

  const fatigue = await analyzeFatigue(userId);

  await query(
    `INSERT INTO rpe_snapshots (user_id, snapshot_date, avg_rpe, avg_rir, total_sets, fatigue_score, recovery_recommendation)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     ON CONFLICT (user_id, snapshot_date) DO UPDATE SET
       avg_rpe = EXCLUDED.avg_rpe,
       avg_rir = EXCLUDED.avg_rir,
       total_sets = EXCLUDED.total_sets,
       fatigue_score = EXCLUDED.fatigue_score,
       recovery_recommendation = EXCLUDED.recovery_recommendation`,
    [
      userId,
      today,
      todayData.avg_rpe,
      todayData.avg_rir,
      todayData.set_count,
      fatigue.fatigueScore,
      fatigue.recommendation,
    ]
  );

  return {
    userId,
    snapshotDate: new Date(today),
    avgRpe: parseFloat(todayData.avg_rpe),
    avgRir: todayData.avg_rir ? parseFloat(todayData.avg_rir) : null,
    totalSets: parseInt(todayData.set_count),
    fatigueScore: fatigue.fatigueScore,
    recoveryRecommendation: fatigue.recommendation,
  };
}

/**
 * Get historical RPE snapshots
 */
export async function getRPESnapshots(
  userId: string,
  days: number = 30
): Promise<RPESnapshot[]> {
  const snapshots = await queryAll<{
    user_id: string;
    snapshot_date: Date;
    avg_rpe: string;
    avg_rir: string | null;
    total_sets: string;
    fatigue_score: string;
    recovery_recommendation: string;
  }>(
    `SELECT *
     FROM rpe_snapshots
     WHERE user_id = $1
       AND snapshot_date >= CURRENT_DATE - INTERVAL '${days} days'
     ORDER BY snapshot_date DESC`,
    [userId]
  );

  return snapshots.map((s) => ({
    userId: s.user_id,
    snapshotDate: s.snapshot_date,
    avgRpe: parseFloat(s.avg_rpe),
    avgRir: s.avg_rir ? parseFloat(s.avg_rir) : null,
    totalSets: parseInt(s.total_sets),
    fatigueScore: parseInt(s.fatigue_score),
    recoveryRecommendation: s.recovery_recommendation,
  }));
}

// Export service
export const rpeService = {
  RPE_SCALE,
  RIR_TO_RPE,
  RPE_TO_RIR,
  getRPETrends,
  getWeeklyRPETrends,
  analyzeFatigue,
  getAutoRegulationSuggestions,
  getExerciseRPETarget,
  setExerciseRPETarget,
  getRPEScaleInfo,
  createRPESnapshot,
  getRPESnapshots,
};

export default rpeService;
