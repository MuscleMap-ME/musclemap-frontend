/**
 * Engagement Metrics Service
 *
 * Provides analytics and metrics for the engagement system:
 * - User retention metrics
 * - Streak statistics
 * - Challenge completion rates
 * - Notification effectiveness
 * - Daily/weekly active users
 */

import { db, queryOne, queryAll, query } from '../../db/client';
import { loggers } from '../../lib/logger';

const log = loggers.economy;

interface StreakStats {
  streakType: string;
  totalUsers: number;
  avgCurrentStreak: number;
  maxCurrentStreak: number;
  avgLongestStreak: number;
  maxLongestStreak: number;
  usersWithActiveStreak: number;
  milestonesClaimedToday: number;
}

interface ChallengeStats {
  totalChallengesGenerated: number;
  totalChallengesCompleted: number;
  completionRate: number;
  avgCompletionsByDifficulty: {
    easy: number;
    medium: number;
    hard: number;
  };
  creditsAwarded: number;
  xpAwarded: number;
}

interface DailyEngagementMetrics {
  date: string;
  dailyActiveUsers: number;
  newUsers: number;
  returningUsers: number;
  workoutsCompleted: number;
  challengesCompleted: number;
  challengesClaimed: number;
  loginRewardsClaimed: number;
  streakFreezesPurchased: number;
  totalCreditsEarned: number;
  totalXpEarned: number;
  avgSessionDuration: number | null;
}

interface RetentionMetrics {
  day1: number;
  day7: number;
  day14: number;
  day30: number;
  day60: number;
  day90: number;
}

interface NotificationEffectiveness {
  notificationType: string;
  sent: number;
  opened: number;
  actionTaken: number;
  openRate: number;
  conversionRate: number;
}

interface UserEngagementScore {
  userId: string;
  username: string;
  totalScore: number;
  components: {
    loginStreak: number;
    workoutStreak: number;
    challengeCompletion: number;
    socialActivity: number;
    consistencyBonus: number;
  };
  tier: 'inactive' | 'casual' | 'engaged' | 'power' | 'champion';
}

export const engagementMetricsService = {
  /**
   * Get streak statistics across all users
   */
  async getStreakStats(streakType?: string): Promise<StreakStats[]> {
    const whereClause = streakType ? 'WHERE streak_type = $1' : '';
    const params = streakType ? [streakType] : [];

    const rows = await queryAll<{
      streak_type: string;
      total_users: string;
      avg_current: string;
      max_current: string;
      avg_longest: string;
      max_longest: string;
      active_users: string;
      milestones_today: string;
    }>(
      `SELECT
        us.streak_type,
        COUNT(DISTINCT us.user_id) as total_users,
        ROUND(AVG(us.current_streak)::numeric, 2) as avg_current,
        MAX(us.current_streak) as max_current,
        ROUND(AVG(us.longest_streak)::numeric, 2) as avg_longest,
        MAX(us.longest_streak) as max_longest,
        COUNT(DISTINCT CASE WHEN us.last_activity_date >= CURRENT_DATE - INTERVAL '1 day' THEN us.user_id END) as active_users,
        (SELECT COUNT(*) FROM streak_milestones sm WHERE sm.streak_type = us.streak_type AND sm.claimed_at::date = CURRENT_DATE) as milestones_today
       FROM user_streaks us
       ${whereClause}
       GROUP BY us.streak_type`,
      params
    );

    return rows.map((r) => ({
      streakType: r.streak_type,
      totalUsers: parseInt(r.total_users),
      avgCurrentStreak: parseFloat(r.avg_current) || 0,
      maxCurrentStreak: parseInt(r.max_current) || 0,
      avgLongestStreak: parseFloat(r.avg_longest) || 0,
      maxLongestStreak: parseInt(r.max_longest) || 0,
      usersWithActiveStreak: parseInt(r.active_users),
      milestonesClaimedToday: parseInt(r.milestones_today),
    }));
  },

  /**
   * Get challenge statistics for a date range
   */
  async getChallengeStats(daysBack: number = 7): Promise<ChallengeStats> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysBack);

    const stats = await queryOne<{
      total_generated: string;
      total_completed: string;
      easy_completed: string;
      medium_completed: string;
      hard_completed: string;
      credits_awarded: string;
      xp_awarded: string;
    }>(
      `SELECT
        COUNT(*) as total_generated,
        COUNT(*) FILTER (WHERE is_complete) as total_completed,
        COUNT(*) FILTER (WHERE is_complete AND difficulty = 'easy') as easy_completed,
        COUNT(*) FILTER (WHERE is_complete AND difficulty = 'medium') as medium_completed,
        COUNT(*) FILTER (WHERE is_complete AND difficulty = 'hard') as hard_completed,
        COALESCE(SUM(credit_reward) FILTER (WHERE is_claimed), 0) as credits_awarded,
        COALESCE(SUM(xp_reward) FILTER (WHERE is_claimed), 0) as xp_awarded
       FROM daily_challenges
       WHERE challenge_date >= $1`,
      [startDate.toISOString().split('T')[0]]
    );

    const totalGenerated = parseInt(stats?.total_generated || '0');
    const totalCompleted = parseInt(stats?.total_completed || '0');
    const easyCompleted = parseInt(stats?.easy_completed || '0');
    const mediumCompleted = parseInt(stats?.medium_completed || '0');
    const hardCompleted = parseInt(stats?.hard_completed || '0');

    // Calculate per-day averages (3 challenges per user per day)
    const daysInRange = daysBack;
    const easyPerDay = totalGenerated > 0 ? (easyCompleted / daysInRange) : 0;
    const mediumPerDay = totalGenerated > 0 ? (mediumCompleted / daysInRange) : 0;
    const hardPerDay = totalGenerated > 0 ? (hardCompleted / daysInRange) : 0;

    return {
      totalChallengesGenerated: totalGenerated,
      totalChallengesCompleted: totalCompleted,
      completionRate: totalGenerated > 0 ? Math.round((totalCompleted / totalGenerated) * 100) : 0,
      avgCompletionsByDifficulty: {
        easy: Math.round(easyPerDay * 10) / 10,
        medium: Math.round(mediumPerDay * 10) / 10,
        hard: Math.round(hardPerDay * 10) / 10,
      },
      creditsAwarded: parseInt(stats?.credits_awarded || '0'),
      xpAwarded: parseInt(stats?.xp_awarded || '0'),
    };
  },

  /**
   * Get daily engagement metrics
   */
  async getDailyMetrics(date: Date = new Date()): Promise<DailyEngagementMetrics> {
    const dateStr = date.toISOString().split('T')[0];
    const prevDate = new Date(date);
    prevDate.setDate(prevDate.getDate() - 1);

    const metrics = await queryOne<{
      dau: string;
      new_users: string;
      workouts_completed: string;
      challenges_completed: string;
      challenges_claimed: string;
      login_rewards: string;
      streak_freezes: string;
    }>(
      `SELECT
        (SELECT COUNT(DISTINCT user_id) FROM user_activity_log WHERE activity_date = $1) as dau,
        (SELECT COUNT(*) FROM users WHERE created_at::date = $1) as new_users,
        (SELECT COUNT(*) FROM workouts WHERE created_at::date = $1 AND status = 'completed') as workouts_completed,
        (SELECT COUNT(*) FROM daily_challenges WHERE challenge_date = $1 AND is_complete = TRUE) as challenges_completed,
        (SELECT COUNT(*) FROM daily_challenges WHERE challenge_date = $1 AND is_claimed = TRUE) as challenges_claimed,
        (SELECT COUNT(*) FROM daily_login_rewards WHERE login_date = $1) as login_rewards,
        (SELECT COUNT(*) FROM credit_transactions WHERE created_at::date = $1 AND reason = 'streak_freeze_purchase') as streak_freezes`,
      [dateStr]
    );

    // Calculate credits and XP earned today
    const earnings = await queryOne<{ total_credits: string; total_xp: string }>(
      `SELECT
        COALESCE(SUM(amount), 0) as total_credits,
        (SELECT COALESCE(SUM(amount), 0) FROM xp_transactions WHERE created_at::date = $1) as total_xp
       FROM credit_transactions
       WHERE created_at::date = $1 AND amount > 0`,
      [dateStr]
    );

    // Calculate returning users (active today and before today)
    const returning = await queryOne<{ count: string }>(
      `SELECT COUNT(DISTINCT user_id) as count
       FROM user_activity_log
       WHERE activity_date = $1
         AND user_id IN (
           SELECT user_id FROM user_activity_log WHERE activity_date < $1
         )`,
      [dateStr]
    );

    const dau = parseInt(metrics?.dau || '0');
    const newUsers = parseInt(metrics?.new_users || '0');
    const returningUsers = parseInt(returning?.count || '0');

    return {
      date: dateStr,
      dailyActiveUsers: dau,
      newUsers,
      returningUsers,
      workoutsCompleted: parseInt(metrics?.workouts_completed || '0'),
      challengesCompleted: parseInt(metrics?.challenges_completed || '0'),
      challengesClaimed: parseInt(metrics?.challenges_claimed || '0'),
      loginRewardsClaimed: parseInt(metrics?.login_rewards || '0'),
      streakFreezesPurchased: parseInt(metrics?.streak_freezes || '0'),
      totalCreditsEarned: parseInt(earnings?.total_credits || '0'),
      totalXpEarned: parseInt(earnings?.total_xp || '0'),
      avgSessionDuration: null, // Would need session tracking to calculate
    };
  },

  /**
   * Get retention metrics (cohort-based)
   */
  async getRetentionMetrics(cohortDate: Date): Promise<RetentionMetrics> {
    const dateStr = cohortDate.toISOString().split('T')[0];

    // Get users who signed up on cohort date
    const cohortSize = await queryOne<{ count: string }>(
      `SELECT COUNT(*) as count FROM users WHERE created_at::date = $1`,
      [dateStr]
    );

    const totalUsers = parseInt(cohortSize?.count || '0');
    if (totalUsers === 0) {
      return { day1: 0, day7: 0, day14: 0, day30: 0, day60: 0, day90: 0 };
    }

    // Calculate retention for each period
    const retentionQuery = async (days: number): Promise<number> => {
      const targetDate = new Date(cohortDate);
      targetDate.setDate(targetDate.getDate() + days);

      if (targetDate > new Date()) return 0;

      const retained = await queryOne<{ count: string }>(
        `SELECT COUNT(DISTINCT u.id) as count
         FROM users u
         WHERE u.created_at::date = $1
           AND EXISTS (
             SELECT 1 FROM user_activity_log ual
             WHERE ual.user_id = u.id AND ual.activity_date = $2
           )`,
        [dateStr, targetDate.toISOString().split('T')[0]]
      );

      return Math.round((parseInt(retained?.count || '0') / totalUsers) * 100);
    };

    return {
      day1: await retentionQuery(1),
      day7: await retentionQuery(7),
      day14: await retentionQuery(14),
      day30: await retentionQuery(30),
      day60: await retentionQuery(60),
      day90: await retentionQuery(90),
    };
  },

  /**
   * Get notification effectiveness metrics
   */
  async getNotificationEffectiveness(daysBack: number = 30): Promise<NotificationEffectiveness[]> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysBack);

    const rows = await queryAll<{
      notification_type: string;
      sent: string;
      opened: string;
      action_taken: string;
    }>(
      `SELECT
        notification_type,
        COUNT(*) as sent,
        COUNT(*) FILTER (WHERE is_sent = TRUE) as opened,
        COUNT(*) FILTER (WHERE is_sent = TRUE AND (payload->>'actionTaken')::boolean = TRUE) as action_taken
       FROM notification_schedule
       WHERE created_at >= $1
       GROUP BY notification_type`,
      [startDate]
    );

    return rows.map((r) => {
      const sent = parseInt(r.sent);
      const opened = parseInt(r.opened);
      const actionTaken = parseInt(r.action_taken);

      return {
        notificationType: r.notification_type,
        sent,
        opened,
        actionTaken,
        openRate: sent > 0 ? Math.round((opened / sent) * 100) : 0,
        conversionRate: opened > 0 ? Math.round((actionTaken / opened) * 100) : 0,
      };
    });
  },

  /**
   * Calculate user engagement score
   */
  async getUserEngagementScore(userId: string): Promise<UserEngagementScore | null> {
    const user = await queryOne<{ id: string; username: string }>(
      'SELECT id, username FROM users WHERE id = $1',
      [userId]
    );

    if (!user) return null;

    // Get streak scores
    const streaks = await queryAll<{ streak_type: string; current_streak: number }>(
      `SELECT streak_type, current_streak
       FROM user_streaks WHERE user_id = $1`,
      [userId]
    );

    const loginStreak = streaks.find((s) => s.streak_type === 'login')?.current_streak || 0;
    const workoutStreak = streaks.find((s) => s.streak_type === 'workout')?.current_streak || 0;

    // Get challenge completion rate (last 30 days)
    const challengeStats = await queryOne<{ total: string; completed: string }>(
      `SELECT COUNT(*) as total, COUNT(*) FILTER (WHERE is_complete) as completed
       FROM daily_challenges
       WHERE user_id = $1 AND challenge_date >= CURRENT_DATE - INTERVAL '30 days'`,
      [userId]
    );

    const challengeTotal = parseInt(challengeStats?.total || '0');
    const challengeCompleted = parseInt(challengeStats?.completed || '0');
    const challengeRate = challengeTotal > 0 ? challengeCompleted / challengeTotal : 0;

    // Get social activity (last 30 days)
    const socialStats = await queryOne<{ high_fives: string; interactions: string }>(
      `SELECT
        (SELECT COUNT(*) FROM high_fives WHERE sender_id = $1 AND created_at >= CURRENT_DATE - INTERVAL '30 days') as high_fives,
        (SELECT COUNT(*) FROM social_interactions WHERE user_id = $1 AND created_at >= CURRENT_DATE - INTERVAL '30 days') as interactions`,
      [userId]
    );

    const socialActivity = parseInt(socialStats?.high_fives || '0') + parseInt(socialStats?.interactions || '0');

    // Calculate component scores (0-100 each)
    const loginScore = Math.min(100, loginStreak * 3.33); // 30-day streak = 100
    const workoutScore = Math.min(100, workoutStreak * 5); // 20-day streak = 100
    const challengeScore = Math.round(challengeRate * 100);
    const socialScore = Math.min(100, socialActivity * 2); // 50 interactions = 100
    const consistencyBonus = (loginScore + workoutScore) >= 100 ? 20 : 0;

    // Total score with weights
    const totalScore = Math.round(
      loginScore * 0.2 +
      workoutScore * 0.35 +
      challengeScore * 0.25 +
      socialScore * 0.1 +
      consistencyBonus * 0.1
    );

    // Determine tier
    let tier: UserEngagementScore['tier'];
    if (totalScore < 10) tier = 'inactive';
    else if (totalScore < 30) tier = 'casual';
    else if (totalScore < 60) tier = 'engaged';
    else if (totalScore < 85) tier = 'power';
    else tier = 'champion';

    return {
      userId: user.id,
      username: user.username,
      totalScore,
      components: {
        loginStreak: Math.round(loginScore),
        workoutStreak: Math.round(workoutScore),
        challengeCompletion: challengeScore,
        socialActivity: Math.round(socialScore),
        consistencyBonus,
      },
      tier,
    };
  },

  /**
   * Get aggregated metrics summary for dashboard
   */
  async getDashboardSummary(): Promise<{
    today: DailyEngagementMetrics;
    weeklyTrend: {
      dau: number[];
      challenges: number[];
      workouts: number[];
    };
    topStreakTypes: StreakStats[];
    challengeStats: ChallengeStats;
    engagementTiers: Record<string, number>;
  }> {
    const today = await this.getDailyMetrics();

    // Get weekly trend (last 7 days)
    const weeklyTrend = {
      dau: [] as number[],
      challenges: [] as number[],
      workouts: [] as number[],
    };

    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const metrics = await this.getDailyMetrics(date);
      weeklyTrend.dau.push(metrics.dailyActiveUsers);
      weeklyTrend.challenges.push(metrics.challengesCompleted);
      weeklyTrend.workouts.push(metrics.workoutsCompleted);
    }

    const topStreakTypes = await this.getStreakStats();
    const challengeStats = await this.getChallengeStats(7);

    // Get engagement tier distribution
    const tierCounts = await queryOne<{
      inactive: string;
      casual: string;
      engaged: string;
      power: string;
      champion: string;
    }>(
      `WITH user_scores AS (
        SELECT u.id,
          COALESCE((SELECT current_streak FROM user_streaks WHERE user_id = u.id AND streak_type = 'login'), 0) * 0.2 +
          COALESCE((SELECT current_streak FROM user_streaks WHERE user_id = u.id AND streak_type = 'workout'), 0) * 0.35 as score
        FROM users u
        WHERE u.last_active_at >= NOW() - INTERVAL '30 days'
      )
      SELECT
        COUNT(*) FILTER (WHERE score < 10) as inactive,
        COUNT(*) FILTER (WHERE score >= 10 AND score < 30) as casual,
        COUNT(*) FILTER (WHERE score >= 30 AND score < 60) as engaged,
        COUNT(*) FILTER (WHERE score >= 60 AND score < 85) as power,
        COUNT(*) FILTER (WHERE score >= 85) as champion
      FROM user_scores`
    );

    return {
      today,
      weeklyTrend,
      topStreakTypes,
      challengeStats,
      engagementTiers: {
        inactive: parseInt(tierCounts?.inactive || '0'),
        casual: parseInt(tierCounts?.casual || '0'),
        engaged: parseInt(tierCounts?.engaged || '0'),
        power: parseInt(tierCounts?.power || '0'),
        champion: parseInt(tierCounts?.champion || '0'),
      },
    };
  },
};

export default engagementMetricsService;
