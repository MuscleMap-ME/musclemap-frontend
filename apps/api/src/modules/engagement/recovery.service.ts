/**
 * Recovery Service
 *
 * Manages recovery tracking and rest day engagement:
 * - Overall recovery score calculation
 * - Per-muscle recovery tracking
 * - Rest day activities and rewards
 */

import { queryOne, queryAll, query } from '../../db/client';
import { creditService } from '../economy/credit.service';
import { ValidationError } from '../../lib/errors';
import { loggers } from '../../lib/logger';

const log = loggers.economy;

// Rest day activity rewards
const REST_DAY_ACTIVITIES: Record<string, { name: string; credits: number; dailyLimit: number }> = {
  log_sleep: { name: 'Log Sleep', credits: 5, dailyLimit: 1 },
  log_nutrition: { name: 'Log Nutrition', credits: 5, dailyLimit: 3 },
  mobility_routine: { name: 'Mobility Routine', credits: 10, dailyLimit: 1 },
  read_education: { name: 'Read Educational Content', credits: 3, dailyLimit: 5 },
  set_goals: { name: 'Set Workout Goals', credits: 5, dailyLimit: 1 },
  review_progress: { name: 'Review Progress', credits: 2, dailyLimit: 1 },
  stretching: { name: 'Stretching Session', credits: 8, dailyLimit: 2 },
  foam_rolling: { name: 'Foam Rolling', credits: 7, dailyLimit: 2 },
  meditation: { name: 'Meditation', credits: 5, dailyLimit: 1 },
  hydration_check: { name: 'Log Hydration', credits: 2, dailyLimit: 3 },
};

// Muscle groups and their base recovery time in hours
const MUSCLE_RECOVERY_HOURS: Record<string, number> = {
  chest: 48,
  back: 72,
  shoulders: 48,
  biceps: 48,
  triceps: 48,
  forearms: 48,
  abs: 24,
  quads: 72,
  hamstrings: 72,
  glutes: 72,
  calves: 48,
  traps: 48,
  lats: 72,
};

interface RecoveryScore {
  overallScore: number;
  muscleScores: Record<string, number>;
  factors: {
    sleep: number;
    nutrition: number;
    hydration: number;
    stress: number;
    lastWorkout: number;
  };
  recommendation: string;
  optimalTrainingWindow: string;
}

interface MuscleRecovery {
  muscle: string;
  recoveryPercent: number;
  hoursSinceTraining: number | null;
  lastTrainedAt: Date | null;
  isFullyRecovered: boolean;
}

function getDateString(date: Date = new Date()): string {
  return date.toISOString().split('T')[0];
}

export const recoveryService = {
  /**
   * Get today's recovery score
   */
  async getRecoveryScore(userId: string): Promise<RecoveryScore> {
    const today = getDateString();

    // Check for cached score
    const cached = await queryOne<{
      overall_score: number;
      muscle_scores: Record<string, number>;
      factors: Record<string, number>;
      recommendation: string;
    }>(
      `SELECT overall_score, muscle_scores, factors, recommendation
       FROM recovery_scores
       WHERE user_id = $1 AND score_date = $2`,
      [userId, today]
    );

    if (cached) {
      return {
        overallScore: cached.overall_score,
        muscleScores: cached.muscle_scores,
        factors: cached.factors as RecoveryScore['factors'],
        recommendation: cached.recommendation,
        optimalTrainingWindow: this.getOptimalWindow(cached.overall_score),
      };
    }

    // Calculate fresh score
    const score = await this.calculateRecoveryScore(userId);

    // Cache it
    await query(
      `INSERT INTO recovery_scores (user_id, score_date, overall_score, muscle_scores, factors, recommendation)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (user_id, score_date) DO UPDATE SET
         overall_score = $3,
         muscle_scores = $4,
         factors = $5,
         recommendation = $6`,
      [
        userId,
        today,
        score.overallScore,
        JSON.stringify(score.muscleScores),
        JSON.stringify(score.factors),
        score.recommendation,
      ]
    );

    return score;
  },

  /**
   * Calculate recovery score from various factors
   */
  async calculateRecoveryScore(userId: string): Promise<RecoveryScore> {
    // Get muscle recovery levels
    const muscleScores = await this.getMuscleRecoveryMap(userId);

    // Get recent sleep data
    const sleepScore = await this.getSleepFactor(userId);

    // Get nutrition factor
    const nutritionScore = await this.getNutritionFactor(userId);

    // Get last workout timing
    const lastWorkoutScore = await this.getLastWorkoutFactor(userId);

    // Calculate overall score
    const muscleAvg = Object.values(muscleScores).reduce((a, b) => a + b, 0) / Object.keys(muscleScores).length || 100;

    const factors = {
      sleep: sleepScore,
      nutrition: nutritionScore,
      hydration: 75, // Default, could be tracked separately
      stress: 70, // Default, could be tracked separately
      lastWorkout: lastWorkoutScore,
    };

    // Weighted average
    const overallScore = Math.round(
      muscleAvg * 0.4 +
      factors.sleep * 0.2 +
      factors.nutrition * 0.15 +
      factors.lastWorkout * 0.15 +
      factors.hydration * 0.05 +
      factors.stress * 0.05
    );

    // Generate recommendation
    const recommendation = this.generateRecommendation(overallScore, muscleScores, factors);

    return {
      overallScore,
      muscleScores,
      factors,
      recommendation,
      optimalTrainingWindow: this.getOptimalWindow(overallScore),
    };
  },

  /**
   * Get per-muscle recovery percentages
   */
  async getMuscleRecoveryMap(userId: string): Promise<Record<string, number>> {
    // Get recent workout muscle activations
    const recentWorkouts = await queryAll<{
      muscle_group: string;
      completed_at: Date;
    }>(
      `SELECT DISTINCT muscle_group, MAX(completed_at) as completed_at
       FROM workout_sets ws
       JOIN exercises e ON e.id = ws.exercise_id
       WHERE ws.user_id = $1
         AND ws.completed_at > NOW() - INTERVAL '7 days'
       GROUP BY muscle_group`,
      [userId]
    );

    const muscleScores: Record<string, number> = {};
    const now = new Date();

    for (const muscle of Object.keys(MUSCLE_RECOVERY_HOURS)) {
      const workout = recentWorkouts.find((w) => w.muscle_group?.toLowerCase() === muscle);

      if (!workout) {
        // Not trained recently, fully recovered
        muscleScores[muscle] = 100;
      } else {
        const hoursSince = (now.getTime() - workout.completed_at.getTime()) / (1000 * 60 * 60);
        const recoveryHours = MUSCLE_RECOVERY_HOURS[muscle];
        const recoveryPercent = Math.min(100, Math.round((hoursSince / recoveryHours) * 100));
        muscleScores[muscle] = recoveryPercent;
      }
    }

    return muscleScores;
  },

  /**
   * Get detailed muscle recovery info
   */
  async getMuscleRecoveryDetails(userId: string): Promise<MuscleRecovery[]> {
    const scores = await this.getMuscleRecoveryMap(userId);

    // Get last trained dates
    const lastTrained = await queryAll<{
      muscle_group: string;
      last_trained: Date;
    }>(
      `SELECT muscle_group, MAX(completed_at) as last_trained
       FROM workout_sets ws
       JOIN exercises e ON e.id = ws.exercise_id
       WHERE ws.user_id = $1
       GROUP BY muscle_group`,
      [userId]
    );

    const trainedMap = new Map(lastTrained.map((r) => [r.muscle_group?.toLowerCase(), r.last_trained]));
    const now = new Date();

    return Object.entries(scores).map(([muscle, score]) => {
      const lastTrainedAt = trainedMap.get(muscle) || null;
      const hoursSince = lastTrainedAt
        ? (now.getTime() - lastTrainedAt.getTime()) / (1000 * 60 * 60)
        : null;

      return {
        muscle,
        recoveryPercent: score,
        hoursSinceTraining: hoursSince ? Math.round(hoursSince) : null,
        lastTrainedAt,
        isFullyRecovered: score >= 95,
      };
    });
  },

  /**
   * Log a rest day activity
   */
  async logRestDayActivity(
    userId: string,
    activityType: string,
    metadata?: Record<string, unknown>
  ): Promise<{ credits: number; dailyCount: number; dailyLimit: number }> {
    const activity = REST_DAY_ACTIVITIES[activityType];

    if (!activity) {
      throw new ValidationError(`Invalid activity type: ${activityType}`);
    }

    const today = getDateString();

    // Check daily limit
    const todayCount = await queryOne<{ count: string }>(
      `SELECT COUNT(*) as count FROM rest_day_activities
       WHERE user_id = $1 AND activity_date = $2 AND activity_type = $3`,
      [userId, today, activityType]
    );

    const currentCount = parseInt(todayCount?.count || '0', 10);

    if (currentCount >= activity.dailyLimit) {
      throw new ValidationError(`Daily limit reached for ${activity.name} (${activity.dailyLimit} per day)`);
    }

    // Log the activity
    await query(
      `INSERT INTO rest_day_activities (user_id, activity_date, activity_type, credits_earned, metadata)
       VALUES ($1, $2, $3, $4, $5)`,
      [userId, today, activityType, activity.credits, JSON.stringify(metadata || {})]
    );

    // Award credits
    const idempotencyKey = `rest-activity:${userId}:${today}:${activityType}:${currentCount + 1}`;
    await creditService.addCredits(
      userId,
      activity.credits,
      'rest_day_activity',
      { activityType, metadata },
      idempotencyKey
    );

    log.info({ userId, activityType, credits: activity.credits }, 'Rest day activity logged');

    return {
      credits: activity.credits,
      dailyCount: currentCount + 1,
      dailyLimit: activity.dailyLimit,
    };
  },

  /**
   * Get today's rest day activity summary
   */
  async getRestDayActivities(userId: string): Promise<{
    activities: Array<{
      type: string;
      name: string;
      count: number;
      limit: number;
      creditsEarned: number;
      creditsRemaining: number;
    }>;
    totalCreditsEarned: number;
    totalCreditsAvailable: number;
  }> {
    const today = getDateString();

    // Get today's logged activities
    const logged = await queryAll<{
      activity_type: string;
      count: string;
      total_credits: string;
    }>(
      `SELECT activity_type, COUNT(*) as count, SUM(credits_earned) as total_credits
       FROM rest_day_activities
       WHERE user_id = $1 AND activity_date = $2
       GROUP BY activity_type`,
      [userId, today]
    );

    const loggedMap = new Map(logged.map((r) => [r.activity_type, { count: parseInt(r.count, 10), credits: parseInt(r.total_credits, 10) }]));

    const activities = Object.entries(REST_DAY_ACTIVITIES).map(([type, def]) => {
      const logged = loggedMap.get(type) || { count: 0, credits: 0 };
      const remaining = Math.max(0, def.dailyLimit - logged.count);

      return {
        type,
        name: def.name,
        count: logged.count,
        limit: def.dailyLimit,
        creditsEarned: logged.credits,
        creditsRemaining: remaining * def.credits,
      };
    });

    const totalCreditsEarned = activities.reduce((sum, a) => sum + a.creditsEarned, 0);
    const totalCreditsAvailable = activities.reduce((sum, a) => sum + a.creditsRemaining, 0);

    return {
      activities,
      totalCreditsEarned,
      totalCreditsAvailable,
    };
  },

  /**
   * Get available rest day activities
   */
  getActivityDefinitions(): Array<{ type: string; name: string; credits: number; dailyLimit: number }> {
    return Object.entries(REST_DAY_ACTIVITIES).map(([type, def]) => ({
      type,
      name: def.name,
      credits: def.credits,
      dailyLimit: def.dailyLimit,
    }));
  },

  // Helper methods
  async getSleepFactor(userId: string): Promise<number> {
    // Check sleep hygiene data if available
    const sleep = await queryOne<{ quality_score: number }>(
      `SELECT quality_score FROM sleep_logs
       WHERE user_id = $1
       ORDER BY logged_at DESC
       LIMIT 1`,
      [userId]
    );

    return sleep?.quality_score || 70; // Default to 70 if no data
  },

  async getNutritionFactor(userId: string): Promise<number> {
    // Check nutrition logs
    const nutrition = await queryOne<{ count: string }>(
      `SELECT COUNT(*) as count FROM nutrition_logs
       WHERE user_id = $1 AND logged_at > NOW() - INTERVAL '24 hours'`,
      [userId]
    );

    const logCount = parseInt(nutrition?.count || '0', 10);
    // More logs = better nutrition tracking
    return Math.min(100, 50 + logCount * 15);
  },

  async getLastWorkoutFactor(userId: string): Promise<number> {
    const lastWorkout = await queryOne<{ completed_at: Date }>(
      `SELECT completed_at FROM workouts
       WHERE user_id = $1 AND status = 'completed'
       ORDER BY completed_at DESC
       LIMIT 1`,
      [userId]
    );

    if (!lastWorkout) return 100; // No workout = fully rested

    const hoursSince = (Date.now() - lastWorkout.completed_at.getTime()) / (1000 * 60 * 60);

    if (hoursSince < 12) return 30; // Just worked out
    if (hoursSince < 24) return 50;
    if (hoursSince < 48) return 70;
    if (hoursSince < 72) return 85;
    return 100; // 3+ days rest
  },

  generateRecommendation(overall: number, muscles: Record<string, number>, _factors: Record<string, number>): string {
    if (overall >= 90) {
      return 'Excellent recovery! You\'re ready for an intense workout.';
    }
    if (overall >= 75) {
      return 'Good recovery. Consider a moderate intensity workout today.';
    }
    if (overall >= 60) {
      const lowMuscles = Object.entries(muscles)
        .filter(([_, score]) => score < 60)
        .map(([muscle]) => muscle);

      if (lowMuscles.length > 0) {
        return `Partial recovery. Avoid training ${lowMuscles.slice(0, 2).join(', ')} today.`;
      }
      return 'Moderate recovery. Light training or active recovery recommended.';
    }
    return 'Low recovery score. Consider a rest day with stretching and mobility work.';
  },

  getOptimalWindow(score: number): string {
    if (score >= 85) return 'Now';
    if (score >= 70) return 'Today (light)';
    if (score >= 50) return 'Tomorrow';
    return 'In 2-3 days';
  },

  /**
   * Get recovery score history
   */
  async getRecoveryHistory(
    userId: string,
    days: number = 14
  ): Promise<Array<{ date: string; score: number }>> {
    const rows = await queryAll<{
      score_date: string;
      overall_score: number;
    }>(
      `SELECT score_date, overall_score
       FROM recovery_scores
       WHERE user_id = $1
       ORDER BY score_date DESC
       LIMIT $2`,
      [userId, days]
    );

    return rows.map((r) => ({
      date: r.score_date,
      score: r.overall_score,
    }));
  },
};
