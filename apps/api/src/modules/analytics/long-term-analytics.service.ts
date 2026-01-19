/**
 * Long-Term Analytics Service
 *
 * Provides comprehensive analytics for tracking yearly TU (Training Units),
 * trends, and progress over time:
 *
 * - getYearlyStats(userId, year) - Get stats for a specific year
 * - getMonthlyTrends(userId, months) - Get monthly trend data
 * - getProgressVelocity(userId) - Calculate rate of progress
 * - getProjectedMilestones(userId) - Predict when milestones will be reached
 * - getYearInReview(userId, year) - Comprehensive year summary
 * - aggregateUserStats(userId) - Recalculate all aggregates
 */

import { queryOne, queryAll, query, transaction } from '../../db/client';
import { loggers } from '../../lib/logger';
import cache, { CACHE_TTL, CACHE_PREFIX } from '../../lib/cache.service';

const log = loggers.db;

// ============================================
// TYPES
// ============================================

export interface YearlyStats {
  userId: string;
  year: number;
  totalTu: number;
  avgTuPerWorkout: number;
  maxTuSingleWorkout: number;
  tuTrendPercent: number | null;
  totalWorkouts: number;
  totalExercises: number;
  totalSets: number;
  totalReps: number;
  totalDurationMinutes: number;
  totalVolumeLbs: number;
  avgWorkoutDurationMinutes: number;
  avgSetsPerWorkout: number;
  avgRepsPerSet: number;
  activeDays: number;
  workoutDays: number;
  longestStreak: number;
  avgWorkoutsPerWeek: number;
  consistencyScore: number;
  strengthGained: number;
  constitutionGained: number;
  dexterityGained: number;
  powerGained: number;
  enduranceGained: number;
  vitalityGained: number;
  creditsEarned: number;
  creditsSpent: number;
  xpEarned: number;
  levelsGained: number;
  highFivesSent: number;
  highFivesReceived: number;
  competitionsEntered: number;
  competitionsWon: number;
  prsSet: number;
  topExercises: Array<{ exerciseId: string; name: string; count: number }>;
  topMuscleGroups: Array<{ muscleGroup: string; volume: number }>;
  monthlyBreakdown: Array<{ month: number; tu: number; workouts: number }>;
  achievementsUnlocked: number;
  milestonesCompleted: number;
  calculatedAt: Date;
  isComplete: boolean;
}

export interface MonthlyStats {
  userId: string;
  year: number;
  month: number;
  totalTu: number;
  avgTuPerWorkout: number;
  tuChangeFromPrevMonth: number | null;
  totalWorkouts: number;
  totalExercises: number;
  totalSets: number;
  totalReps: number;
  totalDurationMinutes: number;
  totalVolumeLbs: number;
  avgWorkoutDurationMinutes: number;
  activeDays: number;
  workoutDays: number;
  currentStreak: number;
  consistencyScore: number;
  strengthDelta: number;
  constitutionDelta: number;
  dexterityDelta: number;
  powerDelta: number;
  enduranceDelta: number;
  vitalityDelta: number;
  creditsEarned: number;
  creditsSpent: number;
  xpEarned: number;
  highFivesSent: number;
  highFivesReceived: number;
  prsSet: number;
  topExercises: Array<{ exerciseId: string; name: string; count: number }>;
  weeklyBreakdown: Array<{ week: number; tu: number; workouts: number }>;
  calculatedAt: Date;
  isComplete: boolean;
}

export interface ProgressTrends {
  userId: string;
  tuVelocity: number;
  workoutVelocity: number;
  volumeVelocity: number;
  xpVelocity: number;
  strengthVelocity: number;
  tuAcceleration: number;
  workoutAcceleration: number;
  strengthAcceleration: number;
  tuTrend: 'accelerating' | 'steady' | 'decelerating' | 'stagnant' | 'new';
  workoutTrend: 'accelerating' | 'steady' | 'decelerating' | 'stagnant' | 'new';
  overallTrend: 'excellent' | 'good' | 'stable' | 'declining' | 'at_risk' | 'new';
  projectedMilestones: Array<{
    name: string;
    targetValue: number;
    currentValue: number;
    projectedDate: string | null;
    daysRemaining: number | null;
  }>;
  projectedTuNextMonth: number | null;
  projectedTuNextQuarter: number | null;
  projectedTuNextYear: number | null;
  projectedWorkoutsNextMonth: number | null;
  projectedLevelUpDate: string | null;
  tuVsPrevMonthPct: number | null;
  tuVsPrevQuarterPct: number | null;
  tuVsPrevYearPct: number | null;
  workoutsVsPrevMonthPct: number | null;
  bestMonth: { year: number; month: number; tu: number } | null;
  bestQuarter: { year: number; quarter: number; tu: number } | null;
  bestYear: { year: number; tu: number } | null;
  projectionConfidence: number;
  currentStreak: number;
  longestStreak: number;
  streakHealth: 'strong' | 'healthy' | 'at_risk' | 'broken' | 'new';
  daysUntilStreakMilestone: number | null;
  dataPointsCount: number;
  earliestDataDate: string | null;
  latestDataDate: string | null;
  calculatedAt: Date;
}

export interface YearInReview {
  year: number;
  summary: {
    totalTu: number;
    totalWorkouts: number;
    totalVolumeLbs: number;
    activeDays: number;
    longestStreak: number;
    prsSet: number;
    creditsEarned: number;
    xpEarned: number;
  } | null;
  comparison: {
    tuChange: number | null;
    workoutsChange: number | null;
    volumeChange: number | null;
  } | null;
  monthlyBreakdown: Array<{
    month: number;
    tu: number;
    workouts: number;
    volume: number;
  }>;
  topExercises: Array<{ exerciseId: string; name: string; count: number }>;
  topMuscleGroups: Array<{ muscleGroup: string; volume: number }>;
  highlights: {
    bestMonth: { month: number; tu: number } | null;
    biggestPr: { exerciseId: string; name: string; weight: number } | null;
    totalHighFives: number;
    achievementsUnlocked: number;
  };
  ranking: {
    tuRank: number | null;
    percentile: number | null;
    totalUsers: number;
  };
}

export interface ProjectedMilestone {
  name: string;
  description: string;
  targetValue: number;
  currentValue: number;
  projectedDate: string | null;
  daysRemaining: number | null;
  confidence: number;
  category: 'tu' | 'workouts' | 'volume' | 'streak' | 'level' | 'custom';
}

// ============================================
// HELPER FUNCTIONS
// ============================================

function determineOverallTrend(
  tuTrend: string,
  workoutTrend: string,
  streakHealth: string
): 'excellent' | 'good' | 'stable' | 'declining' | 'at_risk' | 'new' {
  if (tuTrend === 'new' || workoutTrend === 'new') return 'new';

  const scores: Record<string, number> = {
    accelerating: 3,
    steady: 2,
    decelerating: 1,
    stagnant: 0,
  };

  const streakScores: Record<string, number> = {
    strong: 3,
    healthy: 2,
    at_risk: 1,
    broken: 0,
    new: 2,
  };

  const avgScore =
    (scores[tuTrend] + scores[workoutTrend] + streakScores[streakHealth]) / 3;

  if (avgScore >= 2.5) return 'excellent';
  if (avgScore >= 2) return 'good';
  if (avgScore >= 1.5) return 'stable';
  if (avgScore >= 1) return 'declining';
  return 'at_risk';
}

function determineTrend(
  velocity: number,
  acceleration: number
): 'accelerating' | 'steady' | 'decelerating' | 'stagnant' | 'new' {
  if (velocity === 0 && acceleration === 0) return 'stagnant';
  if (acceleration > 0.1) return 'accelerating';
  if (acceleration < -0.1) return 'decelerating';
  if (Math.abs(velocity) < 0.5) return 'stagnant';
  return 'steady';
}

function determineStreakHealth(
  currentStreak: number,
  longestStreak: number,
  daysSinceLastWorkout: number
): 'strong' | 'healthy' | 'at_risk' | 'broken' | 'new' {
  if (currentStreak === 0 && longestStreak === 0) return 'new';
  if (daysSinceLastWorkout > 7) return 'broken';
  if (daysSinceLastWorkout > 3) return 'at_risk';
  if (currentStreak >= longestStreak * 0.8 && currentStreak >= 7) return 'strong';
  return 'healthy';
}

// ============================================
// SERVICE
// ============================================

export const longTermAnalyticsService = {
  /**
   * Get yearly stats for a specific year
   */
  async getYearlyStats(userId: string, year: number): Promise<YearlyStats | null> {
    const cacheKey = `${CACHE_PREFIX.USER_STATS}yearly:${userId}:${year}`;

    return cache.getOrSet(cacheKey, CACHE_TTL.USER_STATS, async () => {
      const row = await queryOne<{
        id: string;
        user_id: string;
        year: number;
        total_tu: string;
        avg_tu_per_workout: string;
        max_tu_single_workout: string;
        tu_trend_percent: string | null;
        total_workouts: number;
        total_exercises: number;
        total_sets: number;
        total_reps: number;
        total_duration_minutes: number;
        total_volume_lbs: string;
        avg_workout_duration_minutes: string;
        avg_sets_per_workout: string;
        avg_reps_per_set: string;
        active_days: number;
        workout_days: number;
        longest_streak: number;
        avg_workouts_per_week: string;
        consistency_score: number;
        strength_gained: string;
        constitution_gained: string;
        dexterity_gained: string;
        power_gained: string;
        endurance_gained: string;
        vitality_gained: string;
        credits_earned: number;
        credits_spent: number;
        xp_earned: number;
        levels_gained: number;
        high_fives_sent: number;
        high_fives_received: number;
        competitions_entered: number;
        competitions_won: number;
        prs_set: number;
        top_exercises: any;
        top_muscle_groups: any;
        monthly_breakdown: any;
        achievements_unlocked: number;
        milestones_completed: number;
        calculated_at: Date;
        is_complete: boolean;
      }>(
        `SELECT * FROM user_yearly_stats WHERE user_id = $1 AND year = $2`,
        [userId, year]
      );

      if (!row) return null;

      return {
        userId: row.user_id,
        year: row.year,
        totalTu: parseFloat(row.total_tu),
        avgTuPerWorkout: parseFloat(row.avg_tu_per_workout),
        maxTuSingleWorkout: parseFloat(row.max_tu_single_workout),
        tuTrendPercent: row.tu_trend_percent ? parseFloat(row.tu_trend_percent) : null,
        totalWorkouts: row.total_workouts,
        totalExercises: row.total_exercises,
        totalSets: row.total_sets,
        totalReps: row.total_reps,
        totalDurationMinutes: row.total_duration_minutes,
        totalVolumeLbs: parseFloat(row.total_volume_lbs),
        avgWorkoutDurationMinutes: parseFloat(row.avg_workout_duration_minutes),
        avgSetsPerWorkout: parseFloat(row.avg_sets_per_workout),
        avgRepsPerSet: parseFloat(row.avg_reps_per_set),
        activeDays: row.active_days,
        workoutDays: row.workout_days,
        longestStreak: row.longest_streak,
        avgWorkoutsPerWeek: parseFloat(row.avg_workouts_per_week),
        consistencyScore: row.consistency_score,
        strengthGained: parseFloat(row.strength_gained),
        constitutionGained: parseFloat(row.constitution_gained),
        dexterityGained: parseFloat(row.dexterity_gained),
        powerGained: parseFloat(row.power_gained),
        enduranceGained: parseFloat(row.endurance_gained),
        vitalityGained: parseFloat(row.vitality_gained),
        creditsEarned: row.credits_earned,
        creditsSpent: row.credits_spent,
        xpEarned: row.xp_earned,
        levelsGained: row.levels_gained,
        highFivesSent: row.high_fives_sent,
        highFivesReceived: row.high_fives_received,
        competitionsEntered: row.competitions_entered,
        competitionsWon: row.competitions_won,
        prsSet: row.prs_set,
        topExercises: row.top_exercises || [],
        topMuscleGroups: row.top_muscle_groups || [],
        monthlyBreakdown: row.monthly_breakdown || [],
        achievementsUnlocked: row.achievements_unlocked,
        milestonesCompleted: row.milestones_completed,
        calculatedAt: row.calculated_at,
        isComplete: row.is_complete,
      };
    });
  },

  /**
   * Get all years with stats for a user
   */
  async getYearsList(userId: string): Promise<number[]> {
    const rows = await queryAll<{ year: number }>(
      `SELECT DISTINCT year FROM user_yearly_stats WHERE user_id = $1 ORDER BY year DESC`,
      [userId]
    );
    return rows.map((r) => r.year);
  },

  /**
   * Get monthly trends for the last N months
   */
  async getMonthlyTrends(
    userId: string,
    months: number = 12
  ): Promise<MonthlyStats[]> {
    const cacheKey = `${CACHE_PREFIX.USER_STATS}monthly:${userId}:${months}`;

    return cache.getOrSet(cacheKey, 300, async () => {
      const rows = await queryAll<{
        id: string;
        user_id: string;
        year: number;
        month: number;
        total_tu: string;
        avg_tu_per_workout: string;
        tu_change_from_prev_month: string | null;
        total_workouts: number;
        total_exercises: number;
        total_sets: number;
        total_reps: number;
        total_duration_minutes: number;
        total_volume_lbs: string;
        avg_workout_duration_minutes: string;
        active_days: number;
        workout_days: number;
        current_streak: number;
        consistency_score: number;
        strength_delta: string;
        constitution_delta: string;
        dexterity_delta: string;
        power_delta: string;
        endurance_delta: string;
        vitality_delta: string;
        credits_earned: number;
        credits_spent: number;
        xp_earned: number;
        high_fives_sent: number;
        high_fives_received: number;
        prs_set: number;
        top_exercises: any;
        weekly_breakdown: any;
        calculated_at: Date;
        is_complete: boolean;
      }>(
        `SELECT * FROM user_monthly_stats
         WHERE user_id = $1
         ORDER BY year DESC, month DESC
         LIMIT $2`,
        [userId, months]
      );

      return rows.map((row) => ({
        userId: row.user_id,
        year: row.year,
        month: row.month,
        totalTu: parseFloat(row.total_tu),
        avgTuPerWorkout: parseFloat(row.avg_tu_per_workout),
        tuChangeFromPrevMonth: row.tu_change_from_prev_month
          ? parseFloat(row.tu_change_from_prev_month)
          : null,
        totalWorkouts: row.total_workouts,
        totalExercises: row.total_exercises,
        totalSets: row.total_sets,
        totalReps: row.total_reps,
        totalDurationMinutes: row.total_duration_minutes,
        totalVolumeLbs: parseFloat(row.total_volume_lbs),
        avgWorkoutDurationMinutes: parseFloat(row.avg_workout_duration_minutes),
        activeDays: row.active_days,
        workoutDays: row.workout_days,
        currentStreak: row.current_streak,
        consistencyScore: row.consistency_score,
        strengthDelta: parseFloat(row.strength_delta),
        constitutionDelta: parseFloat(row.constitution_delta),
        dexterityDelta: parseFloat(row.dexterity_delta),
        powerDelta: parseFloat(row.power_delta),
        enduranceDelta: parseFloat(row.endurance_delta),
        vitalityDelta: parseFloat(row.vitality_delta),
        creditsEarned: row.credits_earned,
        creditsSpent: row.credits_spent,
        xpEarned: row.xp_earned,
        highFivesSent: row.high_fives_sent,
        highFivesReceived: row.high_fives_received,
        prsSet: row.prs_set,
        topExercises: row.top_exercises || [],
        weeklyBreakdown: row.weekly_breakdown || [],
        calculatedAt: row.calculated_at,
        isComplete: row.is_complete,
      }));
    });
  },

  /**
   * Get progress velocity and trends
   */
  async getProgressVelocity(userId: string): Promise<ProgressTrends | null> {
    const cacheKey = `${CACHE_PREFIX.USER_STATS}velocity:${userId}`;

    return cache.getOrSet(cacheKey, 300, async () => {
      const row = await queryOne<{
        user_id: string;
        tu_velocity: string;
        workout_velocity: string;
        volume_velocity: string;
        xp_velocity: string;
        strength_velocity: string;
        tu_acceleration: string;
        workout_acceleration: string;
        strength_acceleration: string;
        tu_trend: string | null;
        workout_trend: string | null;
        overall_trend: string | null;
        projected_milestones: any;
        projected_tu_next_month: string | null;
        projected_tu_next_quarter: string | null;
        projected_tu_next_year: string | null;
        projected_workouts_next_month: number | null;
        projected_level_up_date: string | null;
        tu_vs_prev_month_pct: string | null;
        tu_vs_prev_quarter_pct: string | null;
        tu_vs_prev_year_pct: string | null;
        workouts_vs_prev_month_pct: string | null;
        best_month: any;
        best_quarter: any;
        best_year: any;
        regression_coefficients: any;
        projection_confidence: number;
        current_streak: number;
        longest_streak: number;
        streak_health: string | null;
        days_until_streak_milestone: number | null;
        data_points_count: number;
        earliest_data_date: string | null;
        latest_data_date: string | null;
        calculated_at: Date;
      }>(
        `SELECT * FROM user_progress_trends WHERE user_id = $1`,
        [userId]
      );

      if (!row) return null;

      return {
        userId: row.user_id,
        tuVelocity: parseFloat(row.tu_velocity),
        workoutVelocity: parseFloat(row.workout_velocity),
        volumeVelocity: parseFloat(row.volume_velocity),
        xpVelocity: parseFloat(row.xp_velocity),
        strengthVelocity: parseFloat(row.strength_velocity),
        tuAcceleration: parseFloat(row.tu_acceleration),
        workoutAcceleration: parseFloat(row.workout_acceleration),
        strengthAcceleration: parseFloat(row.strength_acceleration),
        tuTrend: (row.tu_trend as any) || 'new',
        workoutTrend: (row.workout_trend as any) || 'new',
        overallTrend: (row.overall_trend as any) || 'new',
        projectedMilestones: row.projected_milestones || [],
        projectedTuNextMonth: row.projected_tu_next_month
          ? parseFloat(row.projected_tu_next_month)
          : null,
        projectedTuNextQuarter: row.projected_tu_next_quarter
          ? parseFloat(row.projected_tu_next_quarter)
          : null,
        projectedTuNextYear: row.projected_tu_next_year
          ? parseFloat(row.projected_tu_next_year)
          : null,
        projectedWorkoutsNextMonth: row.projected_workouts_next_month,
        projectedLevelUpDate: row.projected_level_up_date,
        tuVsPrevMonthPct: row.tu_vs_prev_month_pct
          ? parseFloat(row.tu_vs_prev_month_pct)
          : null,
        tuVsPrevQuarterPct: row.tu_vs_prev_quarter_pct
          ? parseFloat(row.tu_vs_prev_quarter_pct)
          : null,
        tuVsPrevYearPct: row.tu_vs_prev_year_pct
          ? parseFloat(row.tu_vs_prev_year_pct)
          : null,
        workoutsVsPrevMonthPct: row.workouts_vs_prev_month_pct
          ? parseFloat(row.workouts_vs_prev_month_pct)
          : null,
        bestMonth: row.best_month,
        bestQuarter: row.best_quarter,
        bestYear: row.best_year,
        projectionConfidence: row.projection_confidence,
        currentStreak: row.current_streak,
        longestStreak: row.longest_streak,
        streakHealth: (row.streak_health as any) || 'new',
        daysUntilStreakMilestone: row.days_until_streak_milestone,
        dataPointsCount: row.data_points_count,
        earliestDataDate: row.earliest_data_date,
        latestDataDate: row.latest_data_date,
        calculatedAt: row.calculated_at,
      };
    });
  },

  /**
   * Get projected milestones
   */
  async getProjectedMilestones(userId: string): Promise<ProjectedMilestone[]> {
    const trends = await this.getProgressVelocity(userId);
    if (!trends) return [];

    // Get current totals
    const currentYear = new Date().getFullYear();
    const yearlyStats = await this.getYearlyStats(userId, currentYear);

    // Get user's current level
    const userLevel = await queryOne<{ level: number; xp: number }>(
      `SELECT level, xp FROM users WHERE id = $1`,
      [userId]
    );

    const currentTu = yearlyStats?.totalTu || 0;
    const currentWorkouts = yearlyStats?.totalWorkouts || 0;
    const currentLevel = userLevel?.level || 1;

    const milestones: ProjectedMilestone[] = [];

    // TU Milestones
    const tuMilestones = [100, 500, 1000, 2500, 5000, 10000, 25000, 50000, 100000];
    for (const target of tuMilestones) {
      if (currentTu < target && trends.tuVelocity > 0) {
        const remaining = target - currentTu;
        const monthsToTarget = remaining / trends.tuVelocity;
        const projectedDate =
          monthsToTarget <= 120
            ? new Date(Date.now() + monthsToTarget * 30 * 24 * 60 * 60 * 1000)
                .toISOString()
                .split('T')[0]
            : null;

        milestones.push({
          name: `${target.toLocaleString()} TU`,
          description: `Reach ${target.toLocaleString()} total Training Units`,
          targetValue: target,
          currentValue: currentTu,
          projectedDate,
          daysRemaining: projectedDate
            ? Math.round(monthsToTarget * 30)
            : null,
          confidence: Math.min(
            trends.projectionConfidence,
            Math.round(100 - (monthsToTarget / 12) * 10)
          ),
          category: 'tu',
        });
        break; // Only show next milestone
      }
    }

    // Workout Milestones
    const workoutMilestones = [50, 100, 250, 500, 1000, 2500, 5000];
    for (const target of workoutMilestones) {
      if (currentWorkouts < target && trends.workoutVelocity > 0) {
        const remaining = target - currentWorkouts;
        const monthsToTarget = remaining / trends.workoutVelocity;
        const projectedDate =
          monthsToTarget <= 120
            ? new Date(Date.now() + monthsToTarget * 30 * 24 * 60 * 60 * 1000)
                .toISOString()
                .split('T')[0]
            : null;

        milestones.push({
          name: `${target} Workouts`,
          description: `Complete ${target} total workouts`,
          targetValue: target,
          currentValue: currentWorkouts,
          projectedDate,
          daysRemaining: projectedDate
            ? Math.round(monthsToTarget * 30)
            : null,
          confidence: Math.min(
            trends.projectionConfidence,
            Math.round(100 - (monthsToTarget / 12) * 10)
          ),
          category: 'workouts',
        });
        break;
      }
    }

    // Streak Milestones
    const streakMilestones = [7, 14, 30, 60, 90, 180, 365];
    for (const target of streakMilestones) {
      if (trends.currentStreak < target) {
        const daysRemaining = target - trends.currentStreak;
        milestones.push({
          name: `${target}-Day Streak`,
          description: `Maintain a ${target}-day workout streak`,
          targetValue: target,
          currentValue: trends.currentStreak,
          projectedDate: new Date(Date.now() + daysRemaining * 24 * 60 * 60 * 1000)
            .toISOString()
            .split('T')[0],
          daysRemaining,
          confidence:
            trends.streakHealth === 'strong'
              ? 80
              : trends.streakHealth === 'healthy'
              ? 60
              : 30,
          category: 'streak',
        });
        break;
      }
    }

    // Level Milestones
    const levelMilestones = [5, 10, 25, 50, 100];
    for (const target of levelMilestones) {
      if (currentLevel < target && trends.xpVelocity > 0) {
        // Assuming ~1000 XP per level on average
        const xpNeeded = (target - currentLevel) * 1000;
        const monthsToTarget = xpNeeded / trends.xpVelocity;
        const projectedDate =
          monthsToTarget <= 120
            ? new Date(Date.now() + monthsToTarget * 30 * 24 * 60 * 60 * 1000)
                .toISOString()
                .split('T')[0]
            : null;

        milestones.push({
          name: `Level ${target}`,
          description: `Reach level ${target}`,
          targetValue: target,
          currentValue: currentLevel,
          projectedDate,
          daysRemaining: projectedDate
            ? Math.round(monthsToTarget * 30)
            : null,
          confidence: Math.min(
            trends.projectionConfidence,
            Math.round(100 - (monthsToTarget / 24) * 10)
          ),
          category: 'level',
        });
        break;
      }
    }

    // Sort by projected date (soonest first)
    return milestones.sort((a, b) => {
      if (!a.projectedDate) return 1;
      if (!b.projectedDate) return -1;
      return a.projectedDate.localeCompare(b.projectedDate);
    });
  },

  /**
   * Get comprehensive year-in-review
   */
  async getYearInReview(userId: string, year: number): Promise<YearInReview> {
    // Try using the database function first
    const dbResult = await queryOne<{ result: any }>(
      `SELECT get_year_in_review($1, $2) as result`,
      [userId, year]
    );

    if (dbResult?.result) {
      const r = dbResult.result;

      // Get ranking data
      const ranking = await queryOne<{
        rank: string;
        total: string;
      }>(
        `SELECT
          rank,
          (SELECT COUNT(*) FROM mv_all_time_tu_leaderboard) as total
         FROM mv_all_time_tu_leaderboard
         WHERE user_id = $1`,
        [userId]
      );

      const totalUsers = parseInt(ranking?.total || '0');
      const userRank = ranking ? parseInt(ranking.rank) : null;

      // Get highlights
      const yearlyStats = await this.getYearlyStats(userId, year);
      const monthlyStats = await this.getMonthlyTrends(userId, 12);
      const yearMonths = monthlyStats.filter((m) => m.year === year);

      let bestMonth: { month: number; tu: number } | null = null;
      if (yearMonths.length > 0) {
        const best = yearMonths.reduce((a, b) =>
          a.totalTu > b.totalTu ? a : b
        );
        bestMonth = { month: best.month, tu: best.totalTu };
      }

      return {
        year,
        summary: r.summary,
        comparison: r.comparison,
        monthlyBreakdown: r.monthlyBreakdown || [],
        topExercises: r.topExercises || [],
        topMuscleGroups: r.topMuscleGroups || [],
        highlights: {
          bestMonth,
          biggestPr: null, // Would need to query PRs table
          totalHighFives:
            (yearlyStats?.highFivesSent || 0) +
            (yearlyStats?.highFivesReceived || 0),
          achievementsUnlocked: yearlyStats?.achievementsUnlocked || 0,
        },
        ranking: {
          tuRank: userRank,
          percentile:
            totalUsers > 0 && userRank
              ? Math.round(((totalUsers - userRank) / totalUsers) * 100)
              : null,
          totalUsers,
        },
      };
    }

    // Fallback if no data
    return {
      year,
      summary: null,
      comparison: null,
      monthlyBreakdown: [],
      topExercises: [],
      topMuscleGroups: [],
      highlights: {
        bestMonth: null,
        biggestPr: null,
        totalHighFives: 0,
        achievementsUnlocked: 0,
      },
      ranking: {
        tuRank: null,
        percentile: null,
        totalUsers: 0,
      },
    };
  },

  /**
   * Recalculate all user stats (run as background job)
   */
  async aggregateUserStats(userId: string): Promise<void> {
    log.info({ userId }, 'Starting stats aggregation');

    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth() + 1;

    await transaction(async (client) => {
      // Calculate monthly stats for current and previous months
      for (let i = 0; i < 3; i++) {
        let targetMonth = currentMonth - i;
        let targetYear = currentYear;
        if (targetMonth <= 0) {
          targetMonth += 12;
          targetYear -= 1;
        }

        await this.calculateMonthlyStats(userId, targetYear, targetMonth, client);
      }

      // Calculate yearly stats for current year
      await this.calculateYearlyStats(userId, currentYear, client);

      // Update progress trends
      await this.updateProgressTrends(userId, client);
    });

    log.info({ userId }, 'Stats aggregation completed');
  },

  /**
   * Calculate monthly stats for a specific month
   */
  async calculateMonthlyStats(
    userId: string,
    year: number,
    month: number,
    client?: any
  ): Promise<void> {
    const runQuery = client ? client.query.bind(client) : query;

    const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
    const endDate = new Date(year, month, 0).toISOString().split('T')[0]; // Last day of month

    // Get workout data for the month
    const workoutStats = await queryOne<{
      total_workouts: string;
      total_exercises: string;
      total_sets: string;
      total_reps: string;
      total_duration: string;
      total_volume: string;
      workout_days: string;
    }>(
      `SELECT
        COUNT(DISTINCT id) as total_workouts,
        COALESCE(SUM((COALESCE(metrics->>'exercise_count', '0'))::INTEGER), 0) as total_exercises,
        COALESCE(SUM((COALESCE(metrics->>'total_sets', '0'))::INTEGER), 0) as total_sets,
        COALESCE(SUM((COALESCE(metrics->>'total_reps', '0'))::INTEGER), 0) as total_reps,
        COALESCE(SUM(EXTRACT(EPOCH FROM (ended_at - started_at))/60), 0) as total_duration,
        COALESCE(SUM((COALESCE(metrics->>'total_volume', '0'))::NUMERIC), 0) as total_volume,
        COUNT(DISTINCT DATE(started_at)) as workout_days
       FROM workout_logs
       WHERE user_id = $1
         AND started_at >= $2
         AND started_at < ($3::date + INTERVAL '1 day')`,
      [userId, startDate, endDate]
    );

    const totalWorkouts = parseInt(workoutStats?.total_workouts || '0');
    const totalSets = parseInt(workoutStats?.total_sets || '0');
    const totalReps = parseInt(workoutStats?.total_reps || '0');
    const totalVolume = parseFloat(workoutStats?.total_volume || '0');

    // Calculate TU
    const totalTu = totalSets > 0
      ? (totalSets * (totalReps / totalSets) * Math.log10(totalVolume + 1)) / 100
      : 0;

    // Get previous month for comparison
    let prevMonth = month - 1;
    let prevYear = year;
    if (prevMonth <= 0) {
      prevMonth = 12;
      prevYear -= 1;
    }

    const prevStats = await queryOne<{ total_tu: string }>(
      `SELECT total_tu FROM user_monthly_stats WHERE user_id = $1 AND year = $2 AND month = $3`,
      [userId, prevYear, prevMonth]
    );

    const prevTu = prevStats ? parseFloat(prevStats.total_tu) : null;
    const tuChange = prevTu !== null && prevTu > 0
      ? ((totalTu - prevTu) / prevTu) * 100
      : null;

    // Insert or update monthly stats
    await runQuery(
      `INSERT INTO user_monthly_stats (
        user_id, year, month,
        total_tu, avg_tu_per_workout, tu_change_from_prev_month,
        total_workouts, total_exercises, total_sets, total_reps,
        total_duration_minutes, total_volume_lbs,
        avg_workout_duration_minutes,
        workout_days,
        calculated_at, is_complete
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, NOW(), $15)
      ON CONFLICT (user_id, year, month) DO UPDATE SET
        total_tu = EXCLUDED.total_tu,
        avg_tu_per_workout = EXCLUDED.avg_tu_per_workout,
        tu_change_from_prev_month = EXCLUDED.tu_change_from_prev_month,
        total_workouts = EXCLUDED.total_workouts,
        total_exercises = EXCLUDED.total_exercises,
        total_sets = EXCLUDED.total_sets,
        total_reps = EXCLUDED.total_reps,
        total_duration_minutes = EXCLUDED.total_duration_minutes,
        total_volume_lbs = EXCLUDED.total_volume_lbs,
        avg_workout_duration_minutes = EXCLUDED.avg_workout_duration_minutes,
        workout_days = EXCLUDED.workout_days,
        calculated_at = NOW(),
        is_complete = EXCLUDED.is_complete,
        updated_at = NOW()`,
      [
        userId,
        year,
        month,
        totalTu.toFixed(2),
        totalWorkouts > 0 ? (totalTu / totalWorkouts).toFixed(2) : 0,
        tuChange?.toFixed(2) || null,
        totalWorkouts,
        parseInt(workoutStats?.total_exercises || '0'),
        totalSets,
        totalReps,
        parseInt(workoutStats?.total_duration || '0'),
        totalVolume,
        totalWorkouts > 0
          ? (parseInt(workoutStats?.total_duration || '0') / totalWorkouts).toFixed(2)
          : 0,
        parseInt(workoutStats?.workout_days || '0'),
        month < new Date().getMonth() + 1 || year < new Date().getFullYear(),
      ]
    );
  },

  /**
   * Calculate yearly stats
   */
  async calculateYearlyStats(
    userId: string,
    year: number,
    client?: any
  ): Promise<void> {
    const runQuery = client ? client.query.bind(client) : query;

    // Aggregate from monthly stats
    const monthlyAgg = await queryOne<{
      total_tu: string;
      total_workouts: string;
      total_exercises: string;
      total_sets: string;
      total_reps: string;
      total_duration: string;
      total_volume: string;
      workout_days: string;
      max_tu: string;
    }>(
      `SELECT
        COALESCE(SUM(total_tu), 0) as total_tu,
        COALESCE(SUM(total_workouts), 0) as total_workouts,
        COALESCE(SUM(total_exercises), 0) as total_exercises,
        COALESCE(SUM(total_sets), 0) as total_sets,
        COALESCE(SUM(total_reps), 0) as total_reps,
        COALESCE(SUM(total_duration_minutes), 0) as total_duration,
        COALESCE(SUM(total_volume_lbs), 0) as total_volume,
        COALESCE(SUM(workout_days), 0) as workout_days,
        COALESCE(MAX(total_tu), 0) as max_tu
       FROM user_monthly_stats
       WHERE user_id = $1 AND year = $2`,
      [userId, year]
    );

    const totalWorkouts = parseInt(monthlyAgg?.total_workouts || '0');
    const totalTu = parseFloat(monthlyAgg?.total_tu || '0');

    // Get previous year for trend
    const prevYearStats = await queryOne<{ total_tu: string }>(
      `SELECT total_tu FROM user_yearly_stats WHERE user_id = $1 AND year = $2`,
      [userId, year - 1]
    );

    const prevTu = prevYearStats ? parseFloat(prevYearStats.total_tu) : null;
    const tuTrend =
      prevTu !== null && prevTu > 0 ? ((totalTu - prevTu) / prevTu) * 100 : null;

    // Insert or update yearly stats
    await runQuery(
      `INSERT INTO user_yearly_stats (
        user_id, year,
        total_tu, avg_tu_per_workout, max_tu_single_workout, tu_trend_percent,
        total_workouts, total_exercises, total_sets, total_reps,
        total_duration_minutes, total_volume_lbs,
        avg_workout_duration_minutes, avg_sets_per_workout, avg_reps_per_set,
        workout_days, avg_workouts_per_week,
        calculated_at, is_complete
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, NOW(), $18)
      ON CONFLICT (user_id, year) DO UPDATE SET
        total_tu = EXCLUDED.total_tu,
        avg_tu_per_workout = EXCLUDED.avg_tu_per_workout,
        max_tu_single_workout = EXCLUDED.max_tu_single_workout,
        tu_trend_percent = EXCLUDED.tu_trend_percent,
        total_workouts = EXCLUDED.total_workouts,
        total_exercises = EXCLUDED.total_exercises,
        total_sets = EXCLUDED.total_sets,
        total_reps = EXCLUDED.total_reps,
        total_duration_minutes = EXCLUDED.total_duration_minutes,
        total_volume_lbs = EXCLUDED.total_volume_lbs,
        avg_workout_duration_minutes = EXCLUDED.avg_workout_duration_minutes,
        avg_sets_per_workout = EXCLUDED.avg_sets_per_workout,
        avg_reps_per_set = EXCLUDED.avg_reps_per_set,
        workout_days = EXCLUDED.workout_days,
        avg_workouts_per_week = EXCLUDED.avg_workouts_per_week,
        calculated_at = NOW(),
        is_complete = EXCLUDED.is_complete,
        updated_at = NOW()`,
      [
        userId,
        year,
        totalTu.toFixed(2),
        totalWorkouts > 0 ? (totalTu / totalWorkouts).toFixed(2) : 0,
        parseFloat(monthlyAgg?.max_tu || '0').toFixed(2),
        tuTrend?.toFixed(2) || null,
        totalWorkouts,
        parseInt(monthlyAgg?.total_exercises || '0'),
        parseInt(monthlyAgg?.total_sets || '0'),
        parseInt(monthlyAgg?.total_reps || '0'),
        parseInt(monthlyAgg?.total_duration || '0'),
        parseFloat(monthlyAgg?.total_volume || '0'),
        totalWorkouts > 0
          ? (parseInt(monthlyAgg?.total_duration || '0') / totalWorkouts).toFixed(2)
          : 0,
        totalWorkouts > 0
          ? (parseInt(monthlyAgg?.total_sets || '0') / totalWorkouts).toFixed(2)
          : 0,
        parseInt(monthlyAgg?.total_sets || '0') > 0
          ? (
              parseInt(monthlyAgg?.total_reps || '0') /
              parseInt(monthlyAgg?.total_sets || '1')
            ).toFixed(2)
          : 0,
        parseInt(monthlyAgg?.workout_days || '0'),
        (totalWorkouts / 52).toFixed(2),
        year < new Date().getFullYear(),
      ]
    );
  },

  /**
   * Update progress trends for a user
   */
  async updateProgressTrends(userId: string, client?: any): Promise<void> {
    const runQuery = client ? client.query.bind(client) : query;

    // Get recent monthly data for velocity calculation
    const recentMonths = await queryAll<{
      year: number;
      month: number;
      total_tu: string;
      total_workouts: number;
      total_volume_lbs: string;
      xp_earned: number;
      strength_delta: string;
    }>(
      `SELECT year, month, total_tu, total_workouts, total_volume_lbs, xp_earned, strength_delta
       FROM user_monthly_stats
       WHERE user_id = $1
       ORDER BY year DESC, month DESC
       LIMIT 6`,
      [userId]
    );

    if (recentMonths.length < 2) {
      // Not enough data for trends - insert placeholder
      await runQuery(
        `INSERT INTO user_progress_trends (user_id, tu_trend, workout_trend, overall_trend, streak_health, calculated_at)
         VALUES ($1, 'new', 'new', 'new', 'new', NOW())
         ON CONFLICT (user_id) DO UPDATE SET
           tu_trend = 'new',
           workout_trend = 'new',
           overall_trend = 'new',
           streak_health = 'new',
           calculated_at = NOW(),
           updated_at = NOW()`,
        [userId]
      );
      return;
    }

    // Calculate velocities (change per month)
    const tuValues = recentMonths.map((m) => parseFloat(m.total_tu));
    const workoutValues = recentMonths.map((m) => m.total_workouts);

    const tuVelocity = (tuValues[0] - tuValues[tuValues.length - 1]) / (tuValues.length - 1);
    const workoutVelocity =
      (workoutValues[0] - workoutValues[workoutValues.length - 1]) /
      (workoutValues.length - 1);

    // Calculate acceleration (change in velocity)
    let tuAcceleration = 0;
    let workoutAcceleration = 0;
    if (recentMonths.length >= 3) {
      const recentVelocity = tuValues[0] - tuValues[1];
      const olderVelocity = tuValues[1] - tuValues[2];
      tuAcceleration = recentVelocity - olderVelocity;

      const recentWV = workoutValues[0] - workoutValues[1];
      const olderWV = workoutValues[1] - workoutValues[2];
      workoutAcceleration = recentWV - olderWV;
    }

    // Determine trends
    const tuTrend = determineTrend(tuVelocity, tuAcceleration);
    const workoutTrend = determineTrend(workoutVelocity, workoutAcceleration);

    // Get streak info
    const streakInfo = await queryOne<{
      current_streak: number;
      longest_streak: number;
    }>(
      `SELECT current_streak, longest_streak FROM user_streaks
       WHERE user_id = $1 AND streak_type = 'workout'`,
      [userId]
    );

    const currentStreak = streakInfo?.current_streak || 0;
    const longestStreak = streakInfo?.longest_streak || 0;

    // Get days since last workout
    const lastWorkout = await queryOne<{ days_ago: string }>(
      `SELECT EXTRACT(DAY FROM NOW() - MAX(started_at))::INTEGER as days_ago
       FROM workout_logs WHERE user_id = $1`,
      [userId]
    );
    const daysSinceLastWorkout = parseInt(lastWorkout?.days_ago || '999');

    const streakHealth = determineStreakHealth(
      currentStreak,
      longestStreak,
      daysSinceLastWorkout
    );
    const overallTrend = determineOverallTrend(tuTrend, workoutTrend, streakHealth);

    // Calculate projections
    const currentTu = tuValues[0];
    const projectedTuNextMonth = currentTu + tuVelocity;
    const projectedTuNextQuarter = currentTu + tuVelocity * 3;
    const projectedTuNextYear = currentTu + tuVelocity * 12;

    // Calculate confidence based on data consistency
    const dataPointsCount = recentMonths.length;
    const projectionConfidence = Math.min(
      100,
      Math.round(dataPointsCount * 15 + (tuVelocity > 0 ? 20 : 0))
    );

    // Insert or update trends
    await runQuery(
      `INSERT INTO user_progress_trends (
        user_id,
        tu_velocity, workout_velocity,
        tu_acceleration, workout_acceleration,
        tu_trend, workout_trend, overall_trend,
        projected_tu_next_month, projected_tu_next_quarter, projected_tu_next_year,
        projected_workouts_next_month,
        current_streak, longest_streak, streak_health,
        projection_confidence, data_points_count,
        calculated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, NOW())
      ON CONFLICT (user_id) DO UPDATE SET
        tu_velocity = EXCLUDED.tu_velocity,
        workout_velocity = EXCLUDED.workout_velocity,
        tu_acceleration = EXCLUDED.tu_acceleration,
        workout_acceleration = EXCLUDED.workout_acceleration,
        tu_trend = EXCLUDED.tu_trend,
        workout_trend = EXCLUDED.workout_trend,
        overall_trend = EXCLUDED.overall_trend,
        projected_tu_next_month = EXCLUDED.projected_tu_next_month,
        projected_tu_next_quarter = EXCLUDED.projected_tu_next_quarter,
        projected_tu_next_year = EXCLUDED.projected_tu_next_year,
        projected_workouts_next_month = EXCLUDED.projected_workouts_next_month,
        current_streak = EXCLUDED.current_streak,
        longest_streak = EXCLUDED.longest_streak,
        streak_health = EXCLUDED.streak_health,
        projection_confidence = EXCLUDED.projection_confidence,
        data_points_count = EXCLUDED.data_points_count,
        calculated_at = NOW(),
        updated_at = NOW()`,
      [
        userId,
        tuVelocity.toFixed(2),
        workoutVelocity.toFixed(2),
        tuAcceleration.toFixed(4),
        workoutAcceleration.toFixed(4),
        tuTrend,
        workoutTrend,
        overallTrend,
        projectedTuNextMonth.toFixed(2),
        projectedTuNextQuarter.toFixed(2),
        projectedTuNextYear.toFixed(2),
        Math.round(workoutValues[0] + workoutVelocity),
        currentStreak,
        longestStreak,
        streakHealth,
        projectionConfidence,
        dataPointsCount,
      ]
    );
  },

  /**
   * Get all-time TU leaderboard
   */
  async getAllTimeTuLeaderboard(
    limit: number = 100,
    offset: number = 0
  ): Promise<
    Array<{
      userId: string;
      username: string;
      avatarUrl: string | null;
      lifetimeTu: number;
      lifetimeWorkouts: number;
      lifetimeVolumeLbs: number;
      lifetimePrs: number;
      activeYears: number;
      rank: number;
    }>
  > {
    const rows = await queryAll<{
      user_id: string;
      username: string;
      avatar_url: string | null;
      lifetime_tu: string;
      lifetime_workouts: string;
      lifetime_volume_lbs: string;
      lifetime_prs: string;
      active_years: string;
      rank: string;
    }>(
      `SELECT * FROM mv_all_time_tu_leaderboard
       ORDER BY rank
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    );

    return rows.map((r) => ({
      userId: r.user_id,
      username: r.username,
      avatarUrl: r.avatar_url,
      lifetimeTu: parseFloat(r.lifetime_tu),
      lifetimeWorkouts: parseInt(r.lifetime_workouts),
      lifetimeVolumeLbs: parseFloat(r.lifetime_volume_lbs),
      lifetimePrs: parseInt(r.lifetime_prs),
      activeYears: parseInt(r.active_years),
      rank: parseInt(r.rank),
    }));
  },

  /**
   * Refresh materialized views
   */
  async refreshMaterializedViews(): Promise<void> {
    log.info('Refreshing long-term analytics materialized views');
    await query(`SELECT refresh_long_term_analytics_mvs()`);
    log.info('Materialized views refreshed');
  },
};

export default longTermAnalyticsService;
