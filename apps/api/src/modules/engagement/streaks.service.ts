/**
 * Streaks Service
 *
 * Manages multiple streak types:
 * - workout: consecutive days with completed workouts
 * - nutrition: consecutive days logging food
 * - sleep: consecutive days logging sleep
 * - social: consecutive days with social interactions
 *
 * Each streak type has its own milestones and rewards.
 */

import { db, queryOne, queryAll, query } from '../../db/client';
import { creditService } from '../economy/credit.service';
import { ValidationError } from '../../lib/errors';
import { loggers } from '../../lib/logger';

const log = loggers.economy;

export type StreakType = 'workout' | 'nutrition' | 'sleep' | 'social' | 'login';

// Milestone rewards by streak type
const STREAK_MILESTONES: Record<StreakType, Record<number, { credits: number; xp: number; badge?: string }>> = {
  workout: {
    7: { credits: 100, xp: 200, badge: 'week_warrior' },
    14: { credits: 200, xp: 400, badge: 'two_week_terror' },
    30: { credits: 500, xp: 1000, badge: 'monthly_monster' },
    60: { credits: 1000, xp: 2000, badge: 'consistency_king' },
    90: { credits: 2000, xp: 4000, badge: 'quarter_master' },
    180: { credits: 5000, xp: 8000, badge: 'half_year_hero' },
    365: { credits: 10000, xp: 20000, badge: 'year_of_iron' },
  },
  nutrition: {
    7: { credits: 50, xp: 100, badge: 'nutrition_novice' },
    14: { credits: 100, xp: 200, badge: 'diet_dedicated' },
    30: { credits: 250, xp: 500, badge: 'macro_master' },
    60: { credits: 500, xp: 1000, badge: 'nutrition_ninja' },
    90: { credits: 1000, xp: 2000, badge: 'diet_deity' },
  },
  sleep: {
    7: { credits: 50, xp: 100, badge: 'sleep_starter' },
    14: { credits: 100, xp: 200, badge: 'rest_regular' },
    30: { credits: 250, xp: 500, badge: 'sleep_savant' },
    60: { credits: 500, xp: 1000, badge: 'dream_disciple' },
    90: { credits: 1000, xp: 2000, badge: 'slumber_sage' },
  },
  social: {
    7: { credits: 75, xp: 150, badge: 'social_starter' },
    14: { credits: 150, xp: 300, badge: 'community_connector' },
    30: { credits: 400, xp: 800, badge: 'social_butterfly' },
    60: { credits: 800, xp: 1600, badge: 'community_champion' },
    90: { credits: 1500, xp: 3000, badge: 'social_legend' },
  },
  login: {
    7: { credits: 100, xp: 150 },
    14: { credits: 150, xp: 200 },
    21: { credits: 200, xp: 300 },
    30: { credits: 300, xp: 500 },
    60: { credits: 500, xp: 750 },
    90: { credits: 750, xp: 1000 },
    100: { credits: 1000, xp: 1500 },
  },
};

interface StreakInfo {
  streakType: StreakType;
  currentStreak: number;
  longestStreak: number;
  lastActivityDate: string | null;
  milestonesClaimed: Record<string, boolean>;
  nextMilestone: { days: number; credits: number; xp: number; badge?: string } | null;
  unclaimedMilestones: Array<{ days: number; credits: number; xp: number; badge?: string }>;
}

interface AllStreaks {
  streaks: StreakInfo[];
  totalCurrentDays: number;
  totalLongestDays: number;
}

function getDateString(date: Date = new Date()): string {
  return date.toISOString().split('T')[0];
}

function getYesterdayString(): string {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  return getDateString(yesterday);
}

export const streaksService = {
  /**
   * Get all streaks for a user
   */
  async getAllStreaks(userId: string): Promise<AllStreaks> {
    const streakTypes: StreakType[] = ['workout', 'nutrition', 'sleep', 'social'];
    const streaks: StreakInfo[] = [];
    let totalCurrentDays = 0;
    let totalLongestDays = 0;

    for (const streakType of streakTypes) {
      const streak = await this.getStreak(userId, streakType);
      streaks.push(streak);
      totalCurrentDays += streak.currentStreak;
      totalLongestDays += streak.longestStreak;
    }

    return { streaks, totalCurrentDays, totalLongestDays };
  },

  /**
   * Get a specific streak type
   */
  async getStreak(userId: string, streakType: StreakType): Promise<StreakInfo> {
    const today = getDateString();
    const yesterday = getYesterdayString();

    let streak = await queryOne<{
      current_streak: number;
      longest_streak: number;
      last_activity_date: string | null;
      milestones_claimed: Record<string, boolean>;
    }>(
      'SELECT current_streak, longest_streak, last_activity_date, milestones_claimed FROM user_streaks WHERE user_id = $1 AND streak_type = $2',
      [userId, streakType]
    );

    if (!streak) {
      // Return default values for non-existent streak
      const milestones = STREAK_MILESTONES[streakType] || {};
      const firstMilestone = Object.entries(milestones)[0];

      return {
        streakType,
        currentStreak: 0,
        longestStreak: 0,
        lastActivityDate: null,
        milestonesClaimed: {},
        nextMilestone: firstMilestone
          ? {
              days: parseInt(firstMilestone[0], 10),
              credits: firstMilestone[1].credits,
              xp: firstMilestone[1].xp,
              badge: firstMilestone[1].badge,
            }
          : null,
        unclaimedMilestones: [],
      };
    }

    // Check if streak is still valid
    let effectiveStreak = streak.current_streak;
    if (streak.last_activity_date && streak.last_activity_date !== today && streak.last_activity_date !== yesterday) {
      // Streak has broken
      effectiveStreak = 0;
    }

    // Find next milestone and unclaimed milestones
    const milestones = STREAK_MILESTONES[streakType] || {};
    let nextMilestone: StreakInfo['nextMilestone'] = null;
    const unclaimedMilestones: StreakInfo['unclaimedMilestones'] = [];

    for (const [dayStr, reward] of Object.entries(milestones)) {
      const day = parseInt(dayStr, 10);
      const isClaimed = streak.milestones_claimed?.[dayStr] === true;

      if (day <= effectiveStreak && !isClaimed) {
        unclaimedMilestones.push({
          days: day,
          credits: reward.credits,
          xp: reward.xp,
          badge: reward.badge,
        });
      }

      if (day > effectiveStreak && !nextMilestone) {
        nextMilestone = {
          days: day,
          credits: reward.credits,
          xp: reward.xp,
          badge: reward.badge,
        };
      }
    }

    return {
      streakType,
      currentStreak: effectiveStreak,
      longestStreak: streak.longest_streak,
      lastActivityDate: streak.last_activity_date,
      milestonesClaimed: streak.milestones_claimed || {},
      nextMilestone,
      unclaimedMilestones,
    };
  },

  /**
   * Record activity for a streak type
   * Call this when user completes relevant action (workout, logs food, etc.)
   */
  async recordActivity(userId: string, streakType: StreakType): Promise<{
    newStreak: number;
    isNewRecord: boolean;
    unlockedMilestones: Array<{ days: number; credits: number; xp: number }>;
  }> {
    const today = getDateString();
    const yesterday = getYesterdayString();

    // Get or create streak
    let streak = await queryOne<{
      current_streak: number;
      longest_streak: number;
      last_activity_date: string | null;
      milestones_claimed: Record<string, boolean>;
    }>(
      'SELECT current_streak, longest_streak, last_activity_date, milestones_claimed FROM user_streaks WHERE user_id = $1 AND streak_type = $2',
      [userId, streakType]
    );

    let newStreak: number;
    let isNewRecord = false;

    if (!streak) {
      // First activity ever
      newStreak = 1;
      isNewRecord = true;
      await query(
        `INSERT INTO user_streaks (user_id, streak_type, current_streak, longest_streak, last_activity_date, milestones_claimed)
         VALUES ($1, $2, 1, 1, $3, '{}')`,
        [userId, streakType, today]
      );
    } else {
      const lastActivity = streak.last_activity_date;

      if (lastActivity === today) {
        // Already recorded today
        return {
          newStreak: streak.current_streak,
          isNewRecord: false,
          unlockedMilestones: [],
        };
      } else if (lastActivity === yesterday) {
        // Continue streak
        newStreak = streak.current_streak + 1;
      } else {
        // Streak broken, start fresh
        newStreak = 1;
      }

      isNewRecord = newStreak > streak.longest_streak;

      await query(
        `UPDATE user_streaks SET
           current_streak = $1,
           longest_streak = GREATEST(longest_streak, $1),
           last_activity_date = $2,
           updated_at = NOW()
         WHERE user_id = $3 AND streak_type = $4`,
        [newStreak, today, userId, streakType]
      );
    }

    // Check for newly unlocked milestones
    const milestones = STREAK_MILESTONES[streakType] || {};
    const claimed = streak?.milestones_claimed || {};
    const unlockedMilestones: Array<{ days: number; credits: number; xp: number }> = [];

    for (const [dayStr, reward] of Object.entries(milestones)) {
      const day = parseInt(dayStr, 10);
      if (day <= newStreak && !claimed[dayStr]) {
        unlockedMilestones.push({
          days: day,
          credits: reward.credits,
          xp: reward.xp,
        });
      }
    }

    log.info({ userId, streakType, newStreak, isNewRecord, unlockedMilestones: unlockedMilestones.length }, 'Streak activity recorded');

    return { newStreak, isNewRecord, unlockedMilestones };
  },

  /**
   * Claim a milestone reward
   */
  async claimMilestone(
    userId: string,
    streakType: StreakType,
    milestoneDays: number
  ): Promise<{ credits: number; xp: number; badge?: string }> {
    const streak = await queryOne<{
      current_streak: number;
      milestones_claimed: Record<string, boolean>;
    }>(
      'SELECT current_streak, milestones_claimed FROM user_streaks WHERE user_id = $1 AND streak_type = $2',
      [userId, streakType]
    );

    if (!streak) {
      throw new ValidationError('No streak found for this type');
    }

    const milestones = STREAK_MILESTONES[streakType];
    const reward = milestones?.[milestoneDays];

    if (!reward) {
      throw new ValidationError('Invalid milestone');
    }

    if (streak.current_streak < milestoneDays) {
      throw new ValidationError(`Streak not long enough. Need ${milestoneDays} days, have ${streak.current_streak}`);
    }

    const claimed = streak.milestones_claimed || {};
    if (claimed[milestoneDays.toString()]) {
      throw new ValidationError('Milestone already claimed');
    }

    // Award credits
    const idempotencyKey = `streak-milestone:${userId}:${streakType}:${milestoneDays}`;
    await creditService.addCredits(
      userId,
      reward.credits,
      'streak_milestone',
      { streakType, milestoneDays },
      idempotencyKey
    );

    // Mark as claimed
    claimed[milestoneDays.toString()] = true;
    await query(
      `UPDATE user_streaks SET milestones_claimed = $1, updated_at = NOW()
       WHERE user_id = $2 AND streak_type = $3`,
      [JSON.stringify(claimed), userId, streakType]
    );

    // Record in milestones table
    await query(
      `INSERT INTO streak_milestones (user_id, streak_type, milestone_days, credits_awarded, xp_awarded)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (user_id, streak_type, milestone_days) DO NOTHING`,
      [userId, streakType, milestoneDays, reward.credits, reward.xp]
    );

    log.info({ userId, streakType, milestoneDays, credits: reward.credits }, 'Streak milestone claimed');

    return {
      credits: reward.credits,
      xp: reward.xp,
      badge: reward.badge,
    };
  },

  /**
   * Get streak leaderboard
   */
  async getLeaderboard(
    streakType: StreakType,
    limit: number = 50
  ): Promise<Array<{
    userId: string;
    username: string;
    avatarUrl: string | null;
    currentStreak: number;
    longestStreak: number;
  }>> {
    const rows = await queryAll<{
      user_id: string;
      username: string;
      avatar_url: string | null;
      current_streak: number;
      longest_streak: number;
    }>(
      `SELECT us.user_id, u.username, u.avatar_url, us.current_streak, us.longest_streak
       FROM user_streaks us
       JOIN users u ON u.id = us.user_id
       WHERE us.streak_type = $1
         AND us.last_activity_date >= CURRENT_DATE - INTERVAL '1 day'
       ORDER BY us.current_streak DESC, us.longest_streak DESC
       LIMIT $2`,
      [streakType, limit]
    );

    return rows.map((r) => ({
      userId: r.user_id,
      username: r.username,
      avatarUrl: r.avatar_url,
      currentStreak: r.current_streak,
      longestStreak: r.longest_streak,
    }));
  },

  /**
   * Get milestone definitions
   */
  getMilestoneDefinitions(streakType: StreakType): Array<{
    days: number;
    credits: number;
    xp: number;
    badge?: string;
  }> {
    const milestones = STREAK_MILESTONES[streakType] || {};
    return Object.entries(milestones).map(([day, reward]) => ({
      days: parseInt(day, 10),
      credits: reward.credits,
      xp: reward.xp,
      badge: reward.badge,
    }));
  },
};
