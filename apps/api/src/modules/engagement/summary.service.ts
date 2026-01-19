/**
 * Engagement Summary Service
 *
 * Provides a unified dashboard view of all engagement systems:
 * - Daily login status and rewards
 * - All streak types and progress
 * - Daily and weekly challenges
 * - Active events
 * - Recovery score
 * - Unread notifications
 */

import { dailyLoginService } from './daily-login.service';
import { streaksService, type StreakType } from './streaks.service';
import { challengesService } from './challenges.service';
import { eventsService } from './events.service';
import { recoveryService } from './recovery.service';
import { queryOne, queryAll } from '../../db/client';
import { loggers } from '../../lib/logger';

const log = loggers.economy;

export interface EngagementSummary {
  // Daily Login
  dailyLogin: {
    canClaim: boolean;
    currentStreak: number;
    longestStreak: number;
    todayReward: {
      credits: number;
      xp: number;
      mysteryBoxTier: string | null;
      isMilestone: boolean;
    } | null;
    streakAtRisk: boolean;
    nextMilestone: { days: number; credits: number; xp: number } | null;
    streakFreezesOwned: number;
  };

  // Streaks
  streaks: {
    workout: { current: number; longest: number; isActive: boolean };
    nutrition: { current: number; longest: number; isActive: boolean };
    sleep: { current: number; longest: number; isActive: boolean };
    social: { current: number; longest: number; isActive: boolean };
    totalUnclaimedMilestones: number;
  };

  // Challenges
  challenges: {
    daily: {
      total: number;
      completed: number;
      claimable: number;
      totalCredits: number;
      totalXp: number;
    };
    weekly: {
      progress: number;
      target: number;
      isComplete: boolean;
      isClaimable: boolean;
      credits: number;
      xp: number;
    } | null;
  };

  // Events
  events: {
    active: number;
    upcoming: number;
    hasDoubleCredits: boolean;
    hasDoubleXp: boolean;
  };

  // Recovery
  recovery: {
    score: number;
    recommendation: string;
    optimalTrainingWindow: string;
  };

  // Overall Engagement Score
  engagementScore: number;
  engagementLevel: 'low' | 'medium' | 'high' | 'excellent';

  // Quick Actions
  quickActions: Array<{
    type: string;
    title: string;
    priority: number;
    action: string;
  }>;
}

export const engagementSummaryService = {
  /**
   * Get comprehensive engagement summary for dashboard
   */
  async getSummary(userId: string): Promise<EngagementSummary> {
    const [loginStatus, allStreaks, dailyChallenges, weeklyChallenge, activeEvents, upcomingEvents, recoveryScore] =
      await Promise.all([
        dailyLoginService.getStatus(userId),
        streaksService.getAllStreaks(userId),
        challengesService.getDailyChallenges(userId),
        challengesService.getWeeklyChallenge(userId),
        eventsService.getActiveEvents(),
        eventsService.getUpcomingEvents(5),
        recoveryService.getRecoveryScore(userId),
      ]);

    // Process streaks
    const streakMap: Record<StreakType, { current: number; longest: number; isActive: boolean }> = {
      workout: { current: 0, longest: 0, isActive: false },
      nutrition: { current: 0, longest: 0, isActive: false },
      sleep: { current: 0, longest: 0, isActive: false },
      social: { current: 0, longest: 0, isActive: false },
      login: { current: 0, longest: 0, isActive: false },
    };

    let totalUnclaimedMilestones = 0;
    for (const streak of allStreaks.streaks) {
      streakMap[streak.streakType] = {
        current: streak.currentStreak,
        longest: streak.longestStreak,
        isActive: streak.currentStreak > 0,
      };
      totalUnclaimedMilestones += streak.unclaimedMilestones.length;
    }

    // Process daily challenges
    const completedChallenges = dailyChallenges.filter((c) => c.isComplete);
    const claimableChallenges = dailyChallenges.filter((c) => c.isComplete && !c.isClaimed);
    const totalDailyCredits = dailyChallenges.reduce((sum, c) => sum + c.creditReward, 0);
    const totalDailyXp = dailyChallenges.reduce((sum, c) => sum + c.xpReward, 0);

    // Check event bonuses
    const hasDoubleCredits = activeEvents.some((e) => (e.config.creditMultiplier ?? 1) >= 2);
    const hasDoubleXp = activeEvents.some((e) => (e.config.xpMultiplier ?? 1) >= 2);

    // Calculate engagement score (0-100)
    let engagementScore = 0;

    // Login streak (up to 25 points)
    engagementScore += Math.min(25, loginStatus.currentStreak);

    // Workout streak (up to 20 points)
    engagementScore += Math.min(20, streakMap.workout.current * 2);

    // Daily challenges (up to 20 points)
    engagementScore += (completedChallenges.length / Math.max(1, dailyChallenges.length)) * 20;

    // Weekly challenge progress (up to 15 points)
    if (weeklyChallenge) {
      engagementScore += (weeklyChallenge.currentProgress / Math.max(1, weeklyChallenge.targetValue)) * 15;
    }

    // Recovery score (up to 10 points)
    engagementScore += (recoveryScore.overallScore / 100) * 10;

    // Other streaks (up to 10 points)
    const activeStreakCount = Object.values(streakMap).filter((s) => s.current > 0).length;
    engagementScore += Math.min(10, activeStreakCount * 2);

    engagementScore = Math.min(100, Math.round(engagementScore));

    // Determine engagement level
    let engagementLevel: 'low' | 'medium' | 'high' | 'excellent';
    if (engagementScore >= 80) {
      engagementLevel = 'excellent';
    } else if (engagementScore >= 60) {
      engagementLevel = 'high';
    } else if (engagementScore >= 40) {
      engagementLevel = 'medium';
    } else {
      engagementLevel = 'low';
    }

    // Generate quick actions (prioritized to-do list)
    const quickActions: EngagementSummary['quickActions'] = [];

    if (loginStatus.canClaim) {
      quickActions.push({
        type: 'daily_login',
        title: `Claim ${loginStatus.todayReward?.credits ?? 0} credits for logging in`,
        priority: 1,
        action: 'claim_daily_login',
      });
    }

    if (claimableChallenges.length > 0) {
      quickActions.push({
        type: 'challenge',
        title: `Claim ${claimableChallenges.length} completed challenge(s)`,
        priority: 2,
        action: 'claim_challenges',
      });
    }

    if (totalUnclaimedMilestones > 0) {
      quickActions.push({
        type: 'streak_milestone',
        title: `Claim ${totalUnclaimedMilestones} streak milestone reward(s)`,
        priority: 3,
        action: 'claim_milestones',
      });
    }

    if (weeklyChallenge?.isComplete && !weeklyChallenge?.isClaimed) {
      quickActions.push({
        type: 'weekly_challenge',
        title: `Claim weekly challenge: ${weeklyChallenge.creditReward} credits`,
        priority: 4,
        action: 'claim_weekly',
      });
    }

    if (loginStatus.streakAtRisk) {
      quickActions.push({
        type: 'streak_risk',
        title: 'Your login streak is at risk! Log a workout today.',
        priority: 5,
        action: 'log_workout',
      });
    }

    if (activeEvents.length > 0 && hasDoubleCredits) {
      quickActions.push({
        type: 'event',
        title: 'Double credits event active! Work out now for bonus rewards.',
        priority: 6,
        action: 'view_events',
      });
    }

    // Sort by priority
    quickActions.sort((a, b) => a.priority - b.priority);

    return {
      dailyLogin: {
        canClaim: loginStatus.canClaim,
        currentStreak: loginStatus.currentStreak,
        longestStreak: loginStatus.longestStreak,
        todayReward: loginStatus.todayReward,
        streakAtRisk: loginStatus.streakAtRisk,
        nextMilestone: loginStatus.nextMilestone
          ? {
              days: loginStatus.nextMilestone.days,
              credits: loginStatus.nextMilestone.reward.credits,
              xp: loginStatus.nextMilestone.reward.xp,
            }
          : null,
        streakFreezesOwned: loginStatus.streakFreezesOwned,
      },
      streaks: {
        workout: streakMap.workout,
        nutrition: streakMap.nutrition,
        sleep: streakMap.sleep,
        social: streakMap.social,
        totalUnclaimedMilestones,
      },
      challenges: {
        daily: {
          total: dailyChallenges.length,
          completed: completedChallenges.length,
          claimable: claimableChallenges.length,
          totalCredits: totalDailyCredits,
          totalXp: totalDailyXp,
        },
        weekly: weeklyChallenge
          ? {
              progress: weeklyChallenge.currentProgress,
              target: weeklyChallenge.targetValue,
              isComplete: weeklyChallenge.isComplete,
              isClaimable: weeklyChallenge.isComplete && !weeklyChallenge.isClaimed,
              credits: weeklyChallenge.creditReward,
              xp: weeklyChallenge.xpReward,
            }
          : null,
      },
      events: {
        active: activeEvents.length,
        upcoming: upcomingEvents.length,
        hasDoubleCredits,
        hasDoubleXp,
      },
      recovery: {
        score: recoveryScore.overallScore,
        recommendation: recoveryScore.recommendation,
        optimalTrainingWindow: recoveryScore.optimalTrainingWindow,
      },
      engagementScore,
      engagementLevel,
      quickActions,
    };
  },

  /**
   * Get engagement statistics for admin dashboard
   */
  async getEngagementStats(): Promise<{
    dailyActiveUsers: number;
    weeklyActiveUsers: number;
    monthlyActiveUsers: number;
    averageLoginStreak: number;
    averageEngagementScore: number;
    challengeCompletionRate: number;
    activeEvents: number;
  }> {
    const [dauResult, wauResult, mauResult, streakResult, challengeResult] = await Promise.all([
      queryOne<{ count: string }>(
        `SELECT COUNT(DISTINCT user_id) as count
         FROM daily_login_rewards
         WHERE login_date = CURRENT_DATE`
      ),
      queryOne<{ count: string }>(
        `SELECT COUNT(DISTINCT user_id) as count
         FROM daily_login_rewards
         WHERE login_date >= CURRENT_DATE - INTERVAL '7 days'`
      ),
      queryOne<{ count: string }>(
        `SELECT COUNT(DISTINCT user_id) as count
         FROM daily_login_rewards
         WHERE login_date >= CURRENT_DATE - INTERVAL '30 days'`
      ),
      queryOne<{ avg: string }>(
        `SELECT AVG(current_streak)::numeric(10,2) as avg
         FROM login_streaks
         WHERE last_login_date >= CURRENT_DATE - INTERVAL '7 days'`
      ),
      queryOne<{ completion_rate: string }>(
        `SELECT
           ROUND(
             COUNT(CASE WHEN is_complete THEN 1 END)::numeric /
             NULLIF(COUNT(*)::numeric, 0) * 100,
             2
           ) as completion_rate
         FROM daily_challenges
         WHERE challenge_date >= CURRENT_DATE - INTERVAL '7 days'`
      ),
    ]);

    const activeEventsResult = await eventsService.getActiveEvents();

    return {
      dailyActiveUsers: parseInt(dauResult?.count || '0', 10),
      weeklyActiveUsers: parseInt(wauResult?.count || '0', 10),
      monthlyActiveUsers: parseInt(mauResult?.count || '0', 10),
      averageLoginStreak: parseFloat(streakResult?.avg || '0'),
      averageEngagementScore: 0, // Would require calculating for all active users
      challengeCompletionRate: parseFloat(challengeResult?.completion_rate || '0'),
      activeEvents: activeEventsResult.length,
    };
  },

  /**
   * Seed sample engagement events for testing
   */
  async seedSampleEvents(): Promise<number> {
    const now = new Date();
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const nextMonth = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    const sampleEvents = [
      {
        eventType: 'double_credits',
        name: 'Double Credits Weekend',
        description: 'Earn 2x credits on all workouts this weekend!',
        config: { creditMultiplier: 2 },
        startsAt: now,
        endsAt: new Date(now.getTime() + 48 * 60 * 60 * 1000),
      },
      {
        eventType: 'challenge_bonus',
        name: 'Challenge Bonus Week',
        description: 'Complete daily challenges for bonus XP!',
        config: { xpMultiplier: 1.5, challengeMultiplier: 1.5 },
        startsAt: tomorrow,
        endsAt: new Date(tomorrow.getTime() + 7 * 24 * 60 * 60 * 1000),
      },
      {
        eventType: 'community_goal',
        name: 'Community Workout Goal',
        description: 'Help the community reach 10,000 workouts for a bonus reward!',
        config: {
          communityTarget: 10000,
          rewards: [
            { threshold: 2500, credits: 50, xp: 100 },
            { threshold: 5000, credits: 100, xp: 200 },
            { threshold: 7500, credits: 150, xp: 300 },
            { threshold: 10000, credits: 500, xp: 500 },
          ],
        },
        startsAt: nextWeek,
        endsAt: new Date(nextWeek.getTime() + 14 * 24 * 60 * 60 * 1000),
      },
      {
        eventType: 'seasonal',
        name: 'New Year Challenge',
        description: 'Start the year strong with bonus rewards!',
        config: { creditMultiplier: 1.5, xpMultiplier: 2 },
        startsAt: nextMonth,
        endsAt: new Date(nextMonth.getTime() + 7 * 24 * 60 * 60 * 1000),
      },
    ];

    let created = 0;
    for (const event of sampleEvents) {
      try {
        await eventsService.createEvent({
          eventType: event.eventType as any,
          name: event.name,
          description: event.description,
          config: event.config,
          startsAt: event.startsAt,
          endsAt: event.endsAt,
        });
        created++;
        log.info({ eventName: event.name }, 'Sample event created');
      } catch (error) {
        // Event may already exist
        log.debug({ eventName: event.name, error }, 'Failed to create sample event (may already exist)');
      }
    }

    return created;
  },
};

export default engagementSummaryService;
