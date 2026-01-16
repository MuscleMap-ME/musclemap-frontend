/**
 * Health Multiplier Service
 *
 * Calculates and applies earning multipliers based on healthy behaviors:
 * - Workout streaks
 * - Sleep quality
 * - Nutrition goals
 * - Recovery metrics
 *
 * These multipliers incentivize users to maintain consistent healthy habits
 * by boosting their credit earnings from various activities.
 */

import { queryOne, queryAll, query } from '../../db/client';

// =====================================================
// TYPES
// =====================================================

export interface HealthMultiplier {
  userId: string;
  baseMultiplier: number;
  workoutBonus: number;
  sleepBonus: number;
  nutritionBonus: number;
  streakBonus: number;
  totalMultiplier: number;
  tier: 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond';
  validUntil: Date;
}

export interface DailyHealthMetrics {
  userId: string;
  date: string;
  workoutCompleted: boolean;
  workoutIntensity?: 'low' | 'medium' | 'high';
  sleepHours?: number;
  sleepQuality?: number;
  nutritionScore?: number;
  hydrationLiters?: number;
  stepsCount?: number;
  activeMinutes?: number;
}

export interface HealthTierInfo {
  tier: 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond';
  multiplier: number;
  streakDays: number;
  nextTier?: string;
  daysToNextTier?: number;
}

// =====================================================
// CONSTANTS
// =====================================================

// Multiplier bonuses by category
const WORKOUT_MULTIPLIERS = {
  completed: 0.1, // +10% for completing any workout
  high_intensity: 0.05, // +5% for high intensity
  medium_intensity: 0.025, // +2.5% for medium intensity
};

const SLEEP_MULTIPLIERS = {
  excellent: 0.15, // 8+ hours, quality 80%+
  good: 0.1, // 7-8 hours, quality 60%+
  fair: 0.05, // 6-7 hours, quality 40%+
};

const NUTRITION_MULTIPLIERS = {
  excellent: 0.15, // 90%+ score
  good: 0.1, // 70-90% score
  fair: 0.05, // 50-70% score
};

const STREAK_TIERS = {
  bronze: { minDays: 3, multiplier: 1.1 },
  silver: { minDays: 7, multiplier: 1.2 },
  gold: { minDays: 14, multiplier: 1.35 },
  platinum: { minDays: 30, multiplier: 1.5 },
  diamond: { minDays: 60, multiplier: 1.75 },
};

// =====================================================
// SERVICE
// =====================================================

class HealthMultiplierService {
  /**
   * Log daily health metrics for a user
   */
  async logDailyMetrics(
    userId: string,
    metrics: Omit<DailyHealthMetrics, 'userId' | 'date'>
  ): Promise<DailyHealthMetrics> {
    const today = new Date().toISOString().split('T')[0];

    // Check if metrics already exist for today
    const existing = await queryOne<{ id: string }>(
      `SELECT id FROM daily_health_metrics
       WHERE user_id = $1 AND date = $2`,
      [userId, today]
    );

    if (existing) {
      // Update existing
      await query(
        `UPDATE daily_health_metrics SET
          workout_completed = COALESCE($3, workout_completed),
          workout_intensity = COALESCE($4, workout_intensity),
          sleep_hours = COALESCE($5, sleep_hours),
          sleep_quality = COALESCE($6, sleep_quality),
          nutrition_score = COALESCE($7, nutrition_score),
          hydration_liters = COALESCE($8, hydration_liters),
          steps_count = COALESCE($9, steps_count),
          active_minutes = COALESCE($10, active_minutes),
          updated_at = NOW()
        WHERE user_id = $1 AND date = $2`,
        [
          userId,
          today,
          metrics.workoutCompleted,
          metrics.workoutIntensity,
          metrics.sleepHours,
          metrics.sleepQuality,
          metrics.nutritionScore,
          metrics.hydrationLiters,
          metrics.stepsCount,
          metrics.activeMinutes,
        ]
      );
    } else {
      // Insert new
      await query(
        `INSERT INTO daily_health_metrics (
          user_id, date, workout_completed, workout_intensity,
          sleep_hours, sleep_quality, nutrition_score,
          hydration_liters, steps_count, active_minutes
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [
          userId,
          today,
          metrics.workoutCompleted ?? false,
          metrics.workoutIntensity,
          metrics.sleepHours,
          metrics.sleepQuality,
          metrics.nutritionScore,
          metrics.hydrationLiters,
          metrics.stepsCount,
          metrics.activeMinutes,
        ]
      );
    }

    // Update the user's health tier after logging metrics
    await this.updateUserHealthTier(userId);

    return {
      userId,
      date: today,
      ...metrics,
    };
  }

  /**
   * Get today's health metrics for a user
   */
  async getTodayMetrics(userId: string): Promise<DailyHealthMetrics | null> {
    const today = new Date().toISOString().split('T')[0];

    const row = await queryOne<{
      user_id: string;
      date: string;
      workout_completed: boolean;
      workout_intensity: string | null;
      sleep_hours: number | null;
      sleep_quality: number | null;
      nutrition_score: number | null;
      hydration_liters: number | null;
      steps_count: number | null;
      active_minutes: number | null;
    }>(
      `SELECT * FROM daily_health_metrics
       WHERE user_id = $1 AND date = $2`,
      [userId, today]
    );

    if (!row) return null;

    return {
      userId: row.user_id,
      date: row.date,
      workoutCompleted: row.workout_completed,
      workoutIntensity: row.workout_intensity as 'low' | 'medium' | 'high' | undefined,
      sleepHours: row.sleep_hours ?? undefined,
      sleepQuality: row.sleep_quality ?? undefined,
      nutritionScore: row.nutrition_score ?? undefined,
      hydrationLiters: row.hydration_liters ?? undefined,
      stepsCount: row.steps_count ?? undefined,
      activeMinutes: row.active_minutes ?? undefined,
    };
  }

  /**
   * Get health metrics history for a user
   */
  async getMetricsHistory(
    userId: string,
    days: number = 30
  ): Promise<DailyHealthMetrics[]> {
    const rows = await queryAll<{
      user_id: string;
      date: string;
      workout_completed: boolean;
      workout_intensity: string | null;
      sleep_hours: number | null;
      sleep_quality: number | null;
      nutrition_score: number | null;
      hydration_liters: number | null;
      steps_count: number | null;
      active_minutes: number | null;
    }>(
      `SELECT * FROM daily_health_metrics
       WHERE user_id = $1 AND date >= CURRENT_DATE - $2::interval
       ORDER BY date DESC`,
      [userId, `${days} days`]
    );

    return rows.map(row => ({
      userId: row.user_id,
      date: row.date,
      workoutCompleted: row.workout_completed,
      workoutIntensity: row.workout_intensity as 'low' | 'medium' | 'high' | undefined,
      sleepHours: row.sleep_hours ?? undefined,
      sleepQuality: row.sleep_quality ?? undefined,
      nutritionScore: row.nutrition_score ?? undefined,
      hydrationLiters: row.hydration_liters ?? undefined,
      stepsCount: row.steps_count ?? undefined,
      activeMinutes: row.active_minutes ?? undefined,
    }));
  }

  /**
   * Calculate current workout streak
   */
  async calculateWorkoutStreak(userId: string): Promise<number> {
    // Get consecutive days with workouts completed, starting from yesterday
    const result = await queryOne<{ streak: number }>(
      `WITH consecutive_days AS (
        SELECT date,
          date - ROW_NUMBER() OVER (ORDER BY date DESC)::int AS grp
        FROM daily_health_metrics
        WHERE user_id = $1 AND workout_completed = true
        ORDER BY date DESC
      )
      SELECT COUNT(*) as streak
      FROM consecutive_days
      WHERE grp = (SELECT grp FROM consecutive_days LIMIT 1)`,
      [userId]
    );

    return result?.streak || 0;
  }

  /**
   * Get the health tier based on streak
   */
  getStreakTier(streakDays: number): HealthTierInfo {
    let tier: 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond' = 'bronze';
    let multiplier = 1.0;

    if (streakDays >= STREAK_TIERS.diamond.minDays) {
      tier = 'diamond';
      multiplier = STREAK_TIERS.diamond.multiplier;
    } else if (streakDays >= STREAK_TIERS.platinum.minDays) {
      tier = 'platinum';
      multiplier = STREAK_TIERS.platinum.multiplier;
    } else if (streakDays >= STREAK_TIERS.gold.minDays) {
      tier = 'gold';
      multiplier = STREAK_TIERS.gold.multiplier;
    } else if (streakDays >= STREAK_TIERS.silver.minDays) {
      tier = 'silver';
      multiplier = STREAK_TIERS.silver.multiplier;
    } else if (streakDays >= STREAK_TIERS.bronze.minDays) {
      tier = 'bronze';
      multiplier = STREAK_TIERS.bronze.multiplier;
    }

    // Calculate next tier info
    let nextTier: string | undefined;
    let daysToNextTier: number | undefined;

    const tiers = ['bronze', 'silver', 'gold', 'platinum', 'diamond'] as const;
    const currentIndex = tiers.indexOf(tier);
    if (currentIndex < tiers.length - 1) {
      nextTier = tiers[currentIndex + 1];
      const nextTierInfo = STREAK_TIERS[tiers[currentIndex + 1]];
      daysToNextTier = nextTierInfo.minDays - streakDays;
    }

    return {
      tier,
      multiplier,
      streakDays,
      nextTier,
      daysToNextTier,
    };
  }

  /**
   * Update user's health tier in the database
   */
  async updateUserHealthTier(userId: string): Promise<void> {
    const streak = await this.calculateWorkoutStreak(userId);
    const tierInfo = this.getStreakTier(streak);
    const multiplier = await this.calculateFullMultiplier(userId);

    // Upsert the health tier
    await query(
      `INSERT INTO user_health_tier (
        user_id, tier, streak_days, current_multiplier,
        workout_bonus, sleep_bonus, nutrition_bonus, streak_bonus,
        last_workout_date, tier_progress
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CURRENT_DATE, $9)
      ON CONFLICT (user_id) DO UPDATE SET
        tier = $2,
        streak_days = $3,
        current_multiplier = $4,
        workout_bonus = $5,
        sleep_bonus = $6,
        nutrition_bonus = $7,
        streak_bonus = $8,
        last_workout_date = CURRENT_DATE,
        tier_progress = $9,
        updated_at = NOW()`,
      [
        userId,
        tierInfo.tier,
        streak,
        multiplier.totalMultiplier,
        multiplier.workoutBonus,
        multiplier.sleepBonus,
        multiplier.nutritionBonus,
        multiplier.streakBonus,
        tierInfo.daysToNextTier
          ? ((STREAK_TIERS[tierInfo.nextTier as keyof typeof STREAK_TIERS]?.minDays - tierInfo.daysToNextTier) /
              STREAK_TIERS[tierInfo.nextTier as keyof typeof STREAK_TIERS]?.minDays) *
            100
          : 100,
      ]
    );
  }

  /**
   * Calculate full multiplier including all bonuses
   */
  async calculateFullMultiplier(userId: string): Promise<HealthMultiplier> {
    const todayMetrics = await this.getTodayMetrics(userId);
    const streak = await this.calculateWorkoutStreak(userId);
    const tierInfo = this.getStreakTier(streak);

    let workoutBonus = 0;
    let sleepBonus = 0;
    let nutritionBonus = 0;
    let streakBonus = tierInfo.multiplier - 1; // Convert from 1.1 to 0.1

    if (todayMetrics) {
      // Workout bonus
      if (todayMetrics.workoutCompleted) {
        workoutBonus = WORKOUT_MULTIPLIERS.completed;
        if (todayMetrics.workoutIntensity === 'high') {
          workoutBonus += WORKOUT_MULTIPLIERS.high_intensity;
        } else if (todayMetrics.workoutIntensity === 'medium') {
          workoutBonus += WORKOUT_MULTIPLIERS.medium_intensity;
        }
      }

      // Sleep bonus
      if (todayMetrics.sleepHours !== undefined && todayMetrics.sleepQuality !== undefined) {
        if (todayMetrics.sleepHours >= 8 && todayMetrics.sleepQuality >= 80) {
          sleepBonus = SLEEP_MULTIPLIERS.excellent;
        } else if (todayMetrics.sleepHours >= 7 && todayMetrics.sleepQuality >= 60) {
          sleepBonus = SLEEP_MULTIPLIERS.good;
        } else if (todayMetrics.sleepHours >= 6 && todayMetrics.sleepQuality >= 40) {
          sleepBonus = SLEEP_MULTIPLIERS.fair;
        }
      }

      // Nutrition bonus
      if (todayMetrics.nutritionScore !== undefined) {
        if (todayMetrics.nutritionScore >= 90) {
          nutritionBonus = NUTRITION_MULTIPLIERS.excellent;
        } else if (todayMetrics.nutritionScore >= 70) {
          nutritionBonus = NUTRITION_MULTIPLIERS.good;
        } else if (todayMetrics.nutritionScore >= 50) {
          nutritionBonus = NUTRITION_MULTIPLIERS.fair;
        }
      }
    }

    const totalMultiplier = 1 + workoutBonus + sleepBonus + nutritionBonus + streakBonus;

    // Calculate valid until (end of today)
    const validUntil = new Date();
    validUntil.setHours(23, 59, 59, 999);

    return {
      userId,
      baseMultiplier: 1.0,
      workoutBonus,
      sleepBonus,
      nutritionBonus,
      streakBonus,
      totalMultiplier: Math.round(totalMultiplier * 100) / 100, // Round to 2 decimal places
      tier: tierInfo.tier,
      validUntil,
    };
  }

  /**
   * Get user's current multiplier (cached version from database)
   */
  async getUserMultiplier(userId: string): Promise<HealthMultiplier | null> {
    const row = await queryOne<{
      user_id: string;
      tier: string;
      streak_days: number;
      current_multiplier: number;
      workout_bonus: number;
      sleep_bonus: number;
      nutrition_bonus: number;
      streak_bonus: number;
      last_workout_date: string;
    }>(
      `SELECT * FROM user_health_tier WHERE user_id = $1`,
      [userId]
    );

    if (!row) {
      // If no tier exists, create one
      await this.updateUserHealthTier(userId);
      return this.calculateFullMultiplier(userId);
    }

    const validUntil = new Date();
    validUntil.setHours(23, 59, 59, 999);

    return {
      userId: row.user_id,
      baseMultiplier: 1.0,
      workoutBonus: row.workout_bonus,
      sleepBonus: row.sleep_bonus,
      nutritionBonus: row.nutrition_bonus,
      streakBonus: row.streak_bonus,
      totalMultiplier: row.current_multiplier,
      tier: row.tier as 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond',
      validUntil,
    };
  }

  /**
   * Apply multiplier to a credit amount
   */
  async applyMultiplier(userId: string, baseAmount: number): Promise<{
    baseAmount: number;
    multiplier: number;
    bonusAmount: number;
    totalAmount: number;
  }> {
    const multiplierInfo = await this.getUserMultiplier(userId);
    const multiplier = multiplierInfo?.totalMultiplier || 1.0;

    const totalAmount = Math.floor(baseAmount * multiplier);
    const bonusAmount = totalAmount - baseAmount;

    return {
      baseAmount,
      multiplier,
      bonusAmount,
      totalAmount,
    };
  }

  /**
   * Get health stats summary for a user
   */
  async getHealthStatsSummary(userId: string): Promise<{
    currentStreak: number;
    longestStreak: number;
    totalWorkouts: number;
    avgSleepHours: number;
    avgNutritionScore: number;
    currentTier: HealthTierInfo;
    weeklyProgress: {
      workoutsCompleted: number;
      workoutsGoal: number;
      sleepGoalMet: number;
      nutritionGoalMet: number;
    };
  }> {
    // Get current streak
    const currentStreak = await this.calculateWorkoutStreak(userId);
    const currentTier = this.getStreakTier(currentStreak);

    // Get longest streak (from user_health_tier or calculate)
    const longestResult = await queryOne<{ longest: number }>(
      `SELECT COALESCE(MAX(streak_days), 0) as longest FROM user_health_tier WHERE user_id = $1`,
      [userId]
    );

    // Get total workouts
    const totalResult = await queryOne<{ total: number }>(
      `SELECT COUNT(*) as total FROM daily_health_metrics
       WHERE user_id = $1 AND workout_completed = true`,
      [userId]
    );

    // Get averages for last 30 days
    const avgResult = await queryOne<{
      avg_sleep: number;
      avg_nutrition: number;
    }>(
      `SELECT
        AVG(sleep_hours) as avg_sleep,
        AVG(nutrition_score) as avg_nutrition
       FROM daily_health_metrics
       WHERE user_id = $1 AND date >= CURRENT_DATE - INTERVAL '30 days'`,
      [userId]
    );

    // Get weekly progress
    const weeklyResult = await queryOne<{
      workouts: number;
      sleep_met: number;
      nutrition_met: number;
    }>(
      `SELECT
        COUNT(*) FILTER (WHERE workout_completed = true) as workouts,
        COUNT(*) FILTER (WHERE sleep_hours >= 7) as sleep_met,
        COUNT(*) FILTER (WHERE nutrition_score >= 70) as nutrition_met
       FROM daily_health_metrics
       WHERE user_id = $1 AND date >= CURRENT_DATE - INTERVAL '7 days'`,
      [userId]
    );

    return {
      currentStreak,
      longestStreak: Math.max(longestResult?.longest || 0, currentStreak),
      totalWorkouts: totalResult?.total || 0,
      avgSleepHours: Math.round((avgResult?.avg_sleep || 0) * 10) / 10,
      avgNutritionScore: Math.round(avgResult?.avg_nutrition || 0),
      currentTier,
      weeklyProgress: {
        workoutsCompleted: weeklyResult?.workouts || 0,
        workoutsGoal: 5, // 5 workouts per week goal
        sleepGoalMet: weeklyResult?.sleep_met || 0,
        nutritionGoalMet: weeklyResult?.nutrition_met || 0,
      },
    };
  }

  /**
   * Get leaderboard by streak
   */
  async getStreakLeaderboard(limit: number = 50): Promise<Array<{
    userId: string;
    username: string;
    streakDays: number;
    tier: string;
    multiplier: number;
  }>> {
    const rows = await queryAll<{
      user_id: string;
      username: string;
      streak_days: number;
      tier: string;
      current_multiplier: number;
    }>(
      `SELECT h.user_id, u.username, h.streak_days, h.tier, h.current_multiplier
       FROM user_health_tier h
       JOIN users u ON h.user_id = u.id
       WHERE h.streak_days > 0
       ORDER BY h.streak_days DESC, h.current_multiplier DESC
       LIMIT $1`,
      [limit]
    );

    return rows.map(row => ({
      userId: row.user_id,
      username: row.username,
      streakDays: row.streak_days,
      tier: row.tier,
      multiplier: row.current_multiplier,
    }));
  }

  /**
   * Automatically log workout completion (called by workout service)
   */
  async onWorkoutCompleted(
    userId: string,
    intensity: 'low' | 'medium' | 'high'
  ): Promise<void> {
    await this.logDailyMetrics(userId, {
      workoutCompleted: true,
      workoutIntensity: intensity,
    });
  }

  /**
   * Sync sleep data from wearables (called by wearables module)
   */
  async onSleepDataReceived(
    userId: string,
    sleepHours: number,
    sleepQuality: number
  ): Promise<void> {
    await this.logDailyMetrics(userId, {
      sleepHours,
      sleepQuality,
    });
  }

  /**
   * Update nutrition score (called by nutrition module)
   */
  async onNutritionScoreUpdated(
    userId: string,
    nutritionScore: number
  ): Promise<void> {
    await this.logDailyMetrics(userId, {
      nutritionScore,
    });
  }
}

export const healthMultiplierService = new HealthMultiplierService();
