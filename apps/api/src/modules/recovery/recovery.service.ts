/**
 * Recovery Service
 *
 * Calculates recovery scores based on:
 * - Sleep duration: 0-40 points (8 hours = max)
 * - Sleep quality: 0-30 points
 * - Rest days since last workout: 0-20 points
 * - Optional HRV bonus: 0-10 points
 *
 * The recovery score influences workout prescription intensity.
 */

import { queryOne, queryAll, execute } from '../../db/client';
import { loggers } from '../../lib/logger';
import * as sleepService from './sleep.service';
import type {
  RecoveryScore,
  RecoveryFactors,
  RecoveryClassification,
  WorkoutIntensity,
  RecoveryRecommendation,
  RecoveryStatus,
  RecoveryHistory,
} from './types';

const log = loggers.api;

// ============================================
// SCORE CONFIGURATION
// ============================================

const SCORE_CONFIG = {
  // Sleep duration scoring (max 40 points)
  sleepDuration: {
    maxPoints: 40,
    targetHours: 8,
    minHours: 4,
    // Points per hour above minimum (up to target)
    pointsPerHour: 10,
  },

  // Sleep quality scoring (max 30 points)
  sleepQuality: {
    maxPoints: 30,
    // Points per quality level (1-5)
    pointsPerLevel: 6,
  },

  // Rest days scoring (max 20 points)
  restDays: {
    maxPoints: 20,
    // Optimal rest is 1-2 days
    optimalRestDays: [1, 2],
    // Points deducted for overtraining (0 rest days)
    overtrainingPenalty: -10,
    // Points deducted for detraining (3+ days)
    detrainingPenaltyPerDay: 2,
  },

  // HRV bonus (max 10 points)
  hrv: {
    maxPoints: 10,
    // Points if HRV is above baseline
    aboveBaselineBonus: 10,
    // Points if HRV is at baseline
    atBaselinePoints: 5,
    // Penalty if HRV is significantly below baseline
    belowBaselinePenalty: -5,
  },

  // Consistency bonus (max 5 points)
  consistency: {
    maxPoints: 5,
    // Points for sleeping within 30 min of target time
    onScheduleBonus: 5,
  },
};

// Classification thresholds
const CLASSIFICATION_THRESHOLDS: [number, RecoveryClassification][] = [
  [90, 'excellent'],
  [75, 'good'],
  [60, 'moderate'],
  [40, 'fair'],
  [0, 'poor'],
];

// Intensity recommendations based on score
const INTENSITY_RECOMMENDATIONS: [number, WorkoutIntensity][] = [
  [85, 'high'],
  [70, 'normal'],
  [50, 'moderate'],
  [30, 'light'],
  [0, 'rest'],
];

// ============================================
// RECOVERY SCORE CALCULATION
// ============================================

/**
 * Calculate or retrieve the user's recovery score
 */
export async function getRecoveryScore(
  userId: string,
  options: { forceRecalculate?: boolean } = {}
): Promise<RecoveryScore | null> {
  // Check for existing valid score
  if (!options.forceRecalculate) {
    const existing = await queryOne<any>(
      `SELECT * FROM recovery_scores
       WHERE user_id = $1 AND expires_at > NOW()
       ORDER BY calculated_at DESC LIMIT 1`,
      [userId]
    );

    if (existing) {
      return mapRowToRecoveryScore(existing);
    }
  }

  // Calculate new score
  return calculateRecoveryScore(userId);
}

/**
 * Calculate a new recovery score for the user
 */
export async function calculateRecoveryScore(userId: string): Promise<RecoveryScore> {
  const id = `rs_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const dataSources: string[] = [];

  // Get last night's sleep
  const lastSleep = await sleepService.getLastSleep(userId);
  let sleepDurationScore = 0;
  let sleepQualityScore = 0;
  let sleepDetails: RecoveryFactors['sleepDetails'] | undefined;

  if (lastSleep) {
    dataSources.push('sleep_logs');

    // Calculate sleep duration score
    const hoursSlept = lastSleep.sleepDurationMinutes / 60;
    const targetHours = SCORE_CONFIG.sleepDuration.targetHours;

    if (hoursSlept >= targetHours) {
      sleepDurationScore = SCORE_CONFIG.sleepDuration.maxPoints;
    } else if (hoursSlept >= SCORE_CONFIG.sleepDuration.minHours) {
      const hoursAboveMin = hoursSlept - SCORE_CONFIG.sleepDuration.minHours;
      sleepDurationScore = Math.min(
        SCORE_CONFIG.sleepDuration.maxPoints,
        hoursAboveMin * SCORE_CONFIG.sleepDuration.pointsPerHour
      );
    }

    // Calculate sleep quality score
    sleepQualityScore = lastSleep.quality * SCORE_CONFIG.sleepQuality.pointsPerLevel;

    sleepDetails = {
      hoursSlept,
      targetHours,
      qualityRating: lastSleep.quality,
    };
  } else {
    // No sleep data - use default moderate values
    sleepDurationScore = SCORE_CONFIG.sleepDuration.maxPoints * 0.5;
    sleepQualityScore = SCORE_CONFIG.sleepQuality.maxPoints * 0.5;
  }

  // Get workout history for rest day calculation
  const workoutData = await queryOne<{
    days_since_last: string | null;
    workouts_this_week: string;
    avg_tu: string | null;
  }>(
    `SELECT
      EXTRACT(DAY FROM NOW() - MAX(created_at))::int as days_since_last,
      COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '7 days') as workouts_this_week,
      AVG(total_tu) FILTER (WHERE created_at >= NOW() - INTERVAL '7 days') as avg_tu
     FROM workouts
     WHERE user_id = $1`,
    [userId]
  );

  dataSources.push('workouts');

  const daysSinceLastWorkout = parseInt(workoutData?.days_since_last || '0') || 0;
  const workoutsThisWeek = parseInt(workoutData?.workouts_this_week || '0');
  const avgIntensity = parseFloat(workoutData?.avg_tu || '0');

  // Calculate rest days score
  let restDaysScore = 0;
  let strainPenalty = 0;

  if (daysSinceLastWorkout === 0 && workoutsThisWeek > 0) {
    // Worked out today - check if overtraining
    if (workoutsThisWeek >= 6) {
      strainPenalty = SCORE_CONFIG.restDays.overtrainingPenalty;
    } else {
      restDaysScore = SCORE_CONFIG.restDays.maxPoints * 0.5;
    }
  } else if (SCORE_CONFIG.restDays.optimalRestDays.includes(daysSinceLastWorkout)) {
    // Optimal rest
    restDaysScore = SCORE_CONFIG.restDays.maxPoints;
  } else if (daysSinceLastWorkout > 2) {
    // Detraining penalty
    const daysOverOptimal = daysSinceLastWorkout - 2;
    restDaysScore = Math.max(
      0,
      SCORE_CONFIG.restDays.maxPoints - (daysOverOptimal * SCORE_CONFIG.restDays.detrainingPenaltyPerDay)
    );
  }

  const restDetails = {
    daysSinceLastWorkout,
    workoutsThisWeek,
    averageIntensity: avgIntensity,
  };

  // Try to get HRV data from wearables (optional)
  let hrvBonus = 0;
  let hrvDetails: RecoveryFactors['hrvDetails'] | undefined;

  const hrvData = await queryOne<{
    current_hrv: string | null;
    baseline_hrv: string | null;
  }>(
    `SELECT
      (SELECT bpm FROM health_heart_rate WHERE user_id = $1 ORDER BY timestamp DESC LIMIT 1) as current_hrv,
      (SELECT AVG(bpm) FROM health_heart_rate WHERE user_id = $1 AND timestamp >= NOW() - INTERVAL '30 days' AND bpm < 80) as baseline_hrv`,
    [userId]
  );

  if (hrvData?.current_hrv && hrvData?.baseline_hrv) {
    dataSources.push('health_heart_rate');
    const currentHrv = parseFloat(hrvData.current_hrv);
    const baselineHrv = parseFloat(hrvData.baseline_hrv);

    if (baselineHrv > 0) {
      const percentOfBaseline = (currentHrv / baselineHrv) * 100;

      if (percentOfBaseline >= 105) {
        hrvBonus = SCORE_CONFIG.hrv.aboveBaselineBonus;
      } else if (percentOfBaseline >= 95) {
        hrvBonus = SCORE_CONFIG.hrv.atBaselinePoints;
      } else if (percentOfBaseline < 85) {
        hrvBonus = SCORE_CONFIG.hrv.belowBaselinePenalty;
      }

      hrvDetails = {
        currentHrv,
        baselineHrv,
        percentOfBaseline: Math.round(percentOfBaseline),
      };
    }
  }

  // Calculate consistency bonus
  let consistencyBonus = 0;
  const sleepGoal = await sleepService.getActiveSleepGoal(userId);

  if (sleepGoal?.targetBedTime && lastSleep) {
    // Compare actual bed time to target
    const targetTime = sleepGoal.targetBedTime;
    const actualTime = new Date(lastSleep.bedTime).toTimeString().slice(0, 5);

    // Simple time difference check (within 30 minutes)
    const targetMinutes = parseTimeToMinutes(targetTime);
    const actualMinutes = parseTimeToMinutes(actualTime);
    const difference = Math.abs(targetMinutes - actualMinutes);

    if (difference <= 30) {
      consistencyBonus = SCORE_CONFIG.consistency.maxPoints;
    } else if (difference <= 60) {
      consistencyBonus = SCORE_CONFIG.consistency.maxPoints * 0.5;
    }
  }

  // Calculate total score
  const factors: RecoveryFactors = {
    sleepDurationScore: Math.round(sleepDurationScore),
    sleepQualityScore: Math.round(sleepQualityScore),
    restDaysScore: Math.round(restDaysScore),
    hrvBonus: hrvBonus || undefined,
    strainPenalty: strainPenalty || undefined,
    consistencyBonus: consistencyBonus || undefined,
    sleepDetails,
    restDetails,
    hrvDetails,
  };

  const totalScore = Math.max(0, Math.min(100,
    sleepDurationScore +
    sleepQualityScore +
    restDaysScore +
    hrvBonus +
    strainPenalty +
    consistencyBonus
  ));

  // Determine classification
  const classification = getClassification(totalScore);

  // Determine recommended intensity
  const recommendedIntensity = getRecommendedIntensity(totalScore);

  // Determine recommended workout types
  const recommendedWorkoutTypes = getRecommendedWorkoutTypes(totalScore, factors);

  // Calculate trend
  const trend = await calculateTrend(userId);

  // Store the score
  await execute(
    `INSERT INTO recovery_scores (
      id, user_id, score, classification, factors,
      recommended_intensity, recommended_workout_types,
      trend, trend_confidence, data_sources, expires_at
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW() + INTERVAL '24 hours')`,
    [
      id,
      userId,
      Math.round(totalScore),
      classification,
      JSON.stringify(factors),
      recommendedIntensity,
      recommendedWorkoutTypes,
      trend?.trend || null,
      trend?.confidence || null,
      dataSources,
    ]
  );

  // Update user's cached recovery score
  await execute(
    `UPDATE users SET last_recovery_score = $1, recovery_score_updated_at = NOW() WHERE id = $2`,
    [Math.round(totalScore), userId]
  );

  log.info({
    userId,
    score: Math.round(totalScore),
    classification,
    recommendedIntensity,
  }, 'Recovery score calculated');

  return {
    id,
    userId,
    score: Math.round(totalScore),
    classification,
    factors,
    recommendedIntensity,
    recommendedWorkoutTypes,
    trend: trend?.trend,
    trendConfidence: trend?.confidence,
    calculatedAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    dataSources,
  };
}

// ============================================
// RECOVERY RECOMMENDATIONS
// ============================================

/**
 * Generate recovery recommendations based on score
 */
export async function generateRecommendations(userId: string): Promise<RecoveryRecommendation[]> {
  const score = await getRecoveryScore(userId);
  if (!score) return [];

  const recommendations: Omit<RecoveryRecommendation, 'id' | 'createdAt' | 'expiresAt'>[] = [];

  // Sleep recommendations
  if (score.factors.sleepDurationScore < 30) {
    recommendations.push({
      userId,
      recoveryScoreId: score.id,
      type: 'sleep',
      priority: 1,
      title: 'Improve Sleep Duration',
      description: `You're getting less than optimal sleep. Aim for at least 7-8 hours tonight.`,
      actionItems: [
        { action: 'Set a bedtime alarm 8 hours before your wake time', completed: false },
        { action: 'Avoid screens 30 minutes before bed', completed: false },
        { action: 'Create a relaxing bedtime routine', completed: false },
      ],
      relatedExerciseIds: [],
      relatedTipIds: [],
    });
  }

  if (score.factors.sleepQualityScore < 18) {
    recommendations.push({
      userId,
      recoveryScoreId: score.id,
      type: 'sleep',
      priority: 2,
      title: 'Improve Sleep Quality',
      description: 'Your sleep quality could be better. Try these tips for deeper, more restorative sleep.',
      actionItems: [
        { action: 'Keep your bedroom cool (65-68F / 18-20C)', completed: false },
        { action: 'Block out light with blackout curtains or an eye mask', completed: false },
        { action: 'Avoid caffeine after 2 PM', completed: false },
      ],
      relatedExerciseIds: [],
      relatedTipIds: [],
    });
  }

  // Rest recommendations
  if (score.factors.strainPenalty && score.factors.strainPenalty < 0) {
    recommendations.push({
      userId,
      recoveryScoreId: score.id,
      type: 'rest',
      priority: 1,
      title: 'Take a Rest Day',
      description: 'You may be overtraining. Consider taking a complete rest day or doing light active recovery.',
      actionItems: [
        { action: 'Take a full rest day from training', completed: false },
        { action: 'Focus on stretching and mobility work', completed: false },
        { action: 'Prioritize sleep and nutrition', completed: false },
      ],
      relatedExerciseIds: [],
      relatedTipIds: [],
    });
  }

  // Workout recommendations
  if (score.score >= 80) {
    recommendations.push({
      userId,
      recoveryScoreId: score.id,
      type: 'workout',
      priority: 3,
      title: 'Great Recovery - Push Hard Today',
      description: 'Your recovery score is excellent. This is a great day for a challenging workout.',
      actionItems: [
        { action: 'Try increasing weights by 5-10%', completed: false },
        { action: 'Add an extra set to your main lifts', completed: false },
      ],
      relatedExerciseIds: [],
      relatedTipIds: [],
    });
  } else if (score.score < 50) {
    recommendations.push({
      userId,
      recoveryScoreId: score.id,
      type: 'workout',
      priority: 2,
      title: 'Low Recovery - Go Easy Today',
      description: 'Your recovery score suggests you should take it easy. Consider a lighter workout or active recovery.',
      actionItems: [
        { action: 'Reduce weights by 20-30%', completed: false },
        { action: 'Focus on technique over intensity', completed: false },
        { action: 'Include extra mobility work', completed: false },
      ],
      relatedExerciseIds: [],
      relatedTipIds: [],
    });
  }

  // Store recommendations
  const storedRecommendations: RecoveryRecommendation[] = [];

  for (const rec of recommendations) {
    const id = `rr_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const now = new Date().toISOString();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

    await execute(
      `INSERT INTO recovery_recommendations (
        id, user_id, recovery_score_id, type, priority, title, description,
        action_items, related_exercise_ids, related_tip_ids, expires_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
      [
        id,
        rec.userId,
        rec.recoveryScoreId || null,
        rec.type,
        rec.priority,
        rec.title,
        rec.description,
        JSON.stringify(rec.actionItems),
        rec.relatedExerciseIds,
        rec.relatedTipIds,
        expiresAt,
      ]
    );

    storedRecommendations.push({
      ...rec,
      id,
      createdAt: now,
      expiresAt,
    });
  }

  return storedRecommendations;
}

/**
 * Get active recommendations for user
 */
export async function getActiveRecommendations(userId: string): Promise<RecoveryRecommendation[]> {
  const rows = await queryAll<any>(
    `SELECT * FROM recovery_recommendations
     WHERE user_id = $1
       AND expires_at > NOW()
       AND acknowledged_at IS NULL
     ORDER BY priority ASC, created_at DESC
     LIMIT 10`,
    [userId]
  );

  return rows.map(mapRowToRecommendation);
}

/**
 * Acknowledge a recommendation
 */
export async function acknowledgeRecommendation(
  userId: string,
  recommendationId: string,
  followed?: boolean,
  feedback?: string
): Promise<void> {
  await execute(
    `UPDATE recovery_recommendations
     SET acknowledged_at = NOW(), followed = $3, feedback = $4
     WHERE id = $1 AND user_id = $2`,
    [recommendationId, userId, followed || null, feedback || null]
  );
}

// ============================================
// RECOVERY STATUS (COMBINED VIEW)
// ============================================

/**
 * Get comprehensive recovery status
 */
export async function getRecoveryStatus(userId: string): Promise<RecoveryStatus> {
  const [currentScore, lastSleep, sleepStats, recommendations, sleepGoal] = await Promise.all([
    getRecoveryScore(userId),
    sleepService.getLastSleep(userId),
    sleepService.getSleepStats(userId, 'week'),
    getActiveRecommendations(userId),
    sleepService.getActiveSleepGoal(userId),
  ]);

  // Determine next workout suggestion
  let nextWorkoutSuggestion: RecoveryStatus['nextWorkoutSuggestion'];

  if (currentScore) {
    nextWorkoutSuggestion = {
      intensity: currentScore.recommendedIntensity,
      types: currentScore.recommendedWorkoutTypes,
      reason: getIntensityReason(currentScore),
    };
  } else {
    nextWorkoutSuggestion = {
      intensity: 'moderate',
      types: ['strength', 'hypertrophy'],
      reason: 'No recovery data available - starting with moderate intensity',
    };
  }

  return {
    currentScore: currentScore || undefined,
    lastSleep: lastSleep || undefined,
    sleepStats,
    recommendations,
    sleepGoal: sleepGoal || undefined,
    nextWorkoutSuggestion,
  };
}

/**
 * Get recovery history for trend analysis
 */
export async function getRecoveryHistory(
  userId: string,
  days: number = 30
): Promise<RecoveryHistory> {
  // Validate days parameter to prevent SQL injection
  const validatedDays = Math.max(1, Math.min(365, Math.floor(Number(days) || 30)));

  const rows = await queryAll<any>(
    `SELECT * FROM recovery_scores
     WHERE user_id = $1
       AND calculated_at >= NOW() - INTERVAL '1 day' * $2
     ORDER BY calculated_at DESC`,
    [userId, validatedDays]
  );

  const scores = rows.map(mapRowToRecoveryScore);

  if (scores.length === 0) {
    return {
      scores: [],
      averageScore: 0,
      trend: 'stable',
      bestScore: 0,
      worstScore: 0,
      daysTracked: 0,
    };
  }

  const scoreValues = scores.map(s => s.score);
  const averageScore = Math.round(scoreValues.reduce((a, b) => a + b, 0) / scoreValues.length);
  const bestScore = Math.max(...scoreValues);
  const worstScore = Math.min(...scoreValues);

  // Calculate trend from recent vs older scores
  const recentScores = scoreValues.slice(0, Math.ceil(scoreValues.length / 3));
  const olderScores = scoreValues.slice(-Math.ceil(scoreValues.length / 3));

  const recentAvg = recentScores.reduce((a, b) => a + b, 0) / recentScores.length;
  const olderAvg = olderScores.reduce((a, b) => a + b, 0) / olderScores.length;

  let trend: 'improving' | 'stable' | 'declining';
  if (recentAvg > olderAvg + 5) {
    trend = 'improving';
  } else if (recentAvg < olderAvg - 5) {
    trend = 'declining';
  } else {
    trend = 'stable';
  }

  return {
    scores,
    averageScore,
    trend,
    bestScore,
    worstScore,
    daysTracked: scores.length,
  };
}

// ============================================
// HELPER FUNCTIONS
// ============================================

function getClassification(score: number): RecoveryClassification {
  for (const [threshold, classification] of CLASSIFICATION_THRESHOLDS) {
    if (score >= threshold) {
      return classification;
    }
  }
  return 'poor';
}

function getRecommendedIntensity(score: number): WorkoutIntensity {
  for (const [threshold, intensity] of INTENSITY_RECOMMENDATIONS) {
    if (score >= threshold) {
      return intensity;
    }
  }
  return 'rest';
}

function getRecommendedWorkoutTypes(score: number, factors: RecoveryFactors): string[] {
  const types: string[] = [];

  if (score >= 80) {
    types.push('strength', 'powerlifting', 'hiit');
  } else if (score >= 60) {
    types.push('hypertrophy', 'strength', 'cardio');
  } else if (score >= 40) {
    types.push('light_cardio', 'mobility', 'technique');
  } else {
    types.push('stretching', 'yoga', 'walking');
  }

  // Add recovery-specific recommendations
  if (factors.strainPenalty && factors.strainPenalty < 0) {
    types.unshift('active_recovery', 'mobility');
  }

  return types;
}

async function calculateTrend(
  userId: string
): Promise<{ trend: 'improving' | 'stable' | 'declining'; confidence: number } | null> {
  const recentScores = await queryAll<{ score: number; calculated_at: string }>(
    `SELECT score, calculated_at FROM recovery_scores
     WHERE user_id = $1 AND calculated_at >= NOW() - INTERVAL '7 days'
     ORDER BY calculated_at DESC`,
    [userId]
  );

  if (recentScores.length < 3) {
    return null;
  }

  const scores = recentScores.map(s => s.score);
  const recentAvg = scores.slice(0, Math.ceil(scores.length / 2)).reduce((a, b) => a + b, 0) / Math.ceil(scores.length / 2);
  const olderAvg = scores.slice(-Math.ceil(scores.length / 2)).reduce((a, b) => a + b, 0) / Math.ceil(scores.length / 2);

  const difference = recentAvg - olderAvg;
  const confidence = Math.min(0.9, scores.length * 0.1);

  if (difference > 5) {
    return { trend: 'improving', confidence };
  } else if (difference < -5) {
    return { trend: 'declining', confidence };
  }
  return { trend: 'stable', confidence };
}

function getIntensityReason(score: RecoveryScore): string {
  if (score.score >= 85) {
    return 'Excellent recovery - push yourself today!';
  } else if (score.score >= 70) {
    return 'Good recovery - normal training intensity recommended';
  } else if (score.score >= 50) {
    return 'Moderate recovery - consider reducing intensity slightly';
  } else if (score.score >= 30) {
    return 'Low recovery - lighter workout recommended';
  }
  return 'Very low recovery - consider rest or active recovery only';
}

function parseTimeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

function mapRowToRecoveryScore(row: any): RecoveryScore {
  let factors: RecoveryFactors;
  try {
    factors = typeof row.factors === 'string' ? JSON.parse(row.factors) : row.factors;
  } catch {
    factors = {
      sleepDurationScore: 0,
      sleepQualityScore: 0,
      restDaysScore: 0,
    };
  }

  return {
    id: row.id,
    userId: row.user_id,
    score: row.score,
    classification: row.classification,
    factors,
    recommendedIntensity: row.recommended_intensity,
    recommendedWorkoutTypes: row.recommended_workout_types || [],
    trend: row.trend || undefined,
    trendConfidence: row.trend_confidence ? parseFloat(row.trend_confidence) : undefined,
    calculatedAt: row.calculated_at,
    expiresAt: row.expires_at,
    dataSources: row.data_sources || [],
  };
}

function mapRowToRecommendation(row: any): RecoveryRecommendation {
  let actionItems = [];
  try {
    actionItems = typeof row.action_items === 'string' ? JSON.parse(row.action_items) : row.action_items;
  } catch {
    actionItems = [];
  }

  return {
    id: row.id,
    userId: row.user_id,
    recoveryScoreId: row.recovery_score_id || undefined,
    type: row.type,
    priority: row.priority,
    title: row.title,
    description: row.description,
    actionItems,
    relatedExerciseIds: row.related_exercise_ids || [],
    relatedTipIds: row.related_tip_ids || [],
    acknowledgedAt: row.acknowledged_at || undefined,
    followed: row.followed,
    feedback: row.feedback || undefined,
    createdAt: row.created_at,
    expiresAt: row.expires_at,
  };
}
