/**
 * Daily Login Service
 *
 * Manages daily login rewards and streak tracking:
 * - Escalating daily rewards based on consecutive logins
 * - Streak freeze mechanics
 * - Mystery box rewards at milestones
 */

import { queryOne, queryAll, query } from '../../db/client';
import { creditService } from '../economy/credit.service';
import { xpService } from '../ranks/xp.service';
import { ValidationError, ConflictError } from '../../lib/errors';
import { loggers } from '../../lib/logger';

const log = loggers.economy;

// Reward schedule based on streak day
const DAILY_REWARDS: Record<number, { credits: number; xp: number; mysteryBoxTier?: string }> = {
  1: { credits: 10, xp: 25 },
  2: { credits: 15, xp: 35 },
  3: { credits: 20, xp: 50 },
  4: { credits: 25, xp: 65 },
  5: { credits: 35, xp: 85 },
  6: { credits: 50, xp: 100 },
  7: { credits: 100, xp: 150, mysteryBoxTier: 'common' },
  14: { credits: 150, xp: 200, mysteryBoxTier: 'uncommon' },
  21: { credits: 200, xp: 300, mysteryBoxTier: 'rare' },
  30: { credits: 300, xp: 500, mysteryBoxTier: 'epic' },
  60: { credits: 500, xp: 750, mysteryBoxTier: 'legendary' },
  90: { credits: 750, xp: 1000, mysteryBoxTier: 'mythic' },
  100: { credits: 1000, xp: 1500, mysteryBoxTier: 'divine' },
};

// Milestone days that get special rewards
const MILESTONE_DAYS = [7, 14, 21, 30, 60, 90, 100];

// Cost to purchase a streak freeze
export const STREAK_FREEZE_COST = 250;

// Grace period in hours (36 hours from midnight)
const _GRACE_PERIOD_HOURS = 36;

interface LoginStatus {
  currentStreak: number;
  longestStreak: number;
  lastLoginDate: string | null;
  streakFreezesOwned: number;
  totalLogins: number;
  todayReward: {
    credits: number;
    xp: number;
    mysteryBoxTier: string | null;
    isMilestone: boolean;
  } | null;
  canClaim: boolean;
  streakAtRisk: boolean;
  nextMilestone: { days: number; reward: typeof DAILY_REWARDS[number] } | null;
}

interface ClaimResult {
  credits: number;
  xp: number;
  newStreak: number;
  mysteryBoxId: string | null;
  isMilestone: boolean;
}

function getDateString(date: Date = new Date()): string {
  return date.toISOString().split('T')[0];
}

function getYesterdayString(): string {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  return getDateString(yesterday);
}

function getRewardForDay(day: number): { credits: number; xp: number; mysteryBoxTier: string | null } {
  // Check for exact milestone match first
  if (DAILY_REWARDS[day]) {
    return {
      credits: DAILY_REWARDS[day].credits,
      xp: DAILY_REWARDS[day].xp,
      mysteryBoxTier: DAILY_REWARDS[day].mysteryBoxTier || null,
    };
  }

  // For days past 100, use day 100 rewards
  if (day > 100) {
    return {
      credits: DAILY_REWARDS[100].credits,
      xp: DAILY_REWARDS[100].xp,
      mysteryBoxTier: null,
    };
  }

  // For non-milestone days, cycle through days 1-6 pattern
  const cycleDay = ((day - 1) % 7) + 1;
  if (cycleDay <= 6) {
    return {
      credits: DAILY_REWARDS[cycleDay].credits,
      xp: DAILY_REWARDS[cycleDay].xp,
      mysteryBoxTier: null,
    };
  }

  // Fallback
  return { credits: 10, xp: 25, mysteryBoxTier: null };
}

export const dailyLoginService = {
  /**
   * Get user's login status and today's potential reward
   */
  async getStatus(userId: string): Promise<LoginStatus> {
    const today = getDateString();
    const yesterday = getYesterdayString();

    // Get or create login streak record
    let streak = await queryOne<{
      current_streak: number;
      longest_streak: number;
      last_login_date: string | null;
      streak_freezes_owned: number;
      total_logins: number;
    }>('SELECT * FROM login_streaks WHERE user_id = $1', [userId]);

    if (!streak) {
      // Initialize streak for new user
      await query(
        `INSERT INTO login_streaks (user_id, current_streak, longest_streak, streak_freezes_owned, total_logins)
         VALUES ($1, 0, 0, 0, 0)
         ON CONFLICT (user_id) DO NOTHING`,
        [userId]
      );
      streak = {
        current_streak: 0,
        longest_streak: 0,
        last_login_date: null,
        streak_freezes_owned: 0,
        total_logins: 0,
      };
    }

    // Check if already claimed today
    const todayClaim = await queryOne<{ id: string }>(
      'SELECT id FROM daily_login_rewards WHERE user_id = $1 AND login_date = $2',
      [userId, today]
    );

    const canClaim = !todayClaim;
    const lastLogin = streak.last_login_date;

    // Determine if streak continues or breaks
    let effectiveStreak = streak.current_streak;
    let streakAtRisk = false;

    if (lastLogin) {
      if (lastLogin === today) {
        // Already logged in today, streak is safe
        effectiveStreak = streak.current_streak;
      } else if (lastLogin === yesterday) {
        // Logged in yesterday, streak continues
        effectiveStreak = streak.current_streak;
      } else {
        // Streak would break without freeze
        streakAtRisk = true;
        effectiveStreak = 0; // Will start fresh unless freeze is used
      }
    }

    // Calculate today's reward (next day in streak)
    const nextDay = canClaim ? effectiveStreak + 1 : effectiveStreak;
    const todayRewardData = canClaim ? getRewardForDay(nextDay) : null;

    // Find next milestone
    let nextMilestone: { days: number; reward: typeof DAILY_REWARDS[number] } | null = null;
    for (const milestoneDay of MILESTONE_DAYS) {
      if (milestoneDay > effectiveStreak) {
        nextMilestone = { days: milestoneDay, reward: DAILY_REWARDS[milestoneDay] };
        break;
      }
    }

    return {
      currentStreak: effectiveStreak,
      longestStreak: streak.longest_streak,
      lastLoginDate: streak.last_login_date,
      streakFreezesOwned: streak.streak_freezes_owned,
      totalLogins: streak.total_logins,
      todayReward: todayRewardData
        ? {
            credits: todayRewardData.credits,
            xp: todayRewardData.xp,
            mysteryBoxTier: todayRewardData.mysteryBoxTier,
            isMilestone: MILESTONE_DAYS.includes(nextDay),
          }
        : null,
      canClaim,
      streakAtRisk,
      nextMilestone,
    };
  },

  /**
   * Claim today's daily login reward
   */
  async claimReward(userId: string, useFreeze: boolean = false): Promise<ClaimResult> {
    const today = getDateString();
    const yesterday = getYesterdayString();

    // Check if already claimed
    const existing = await queryOne<{ id: string }>(
      'SELECT id FROM daily_login_rewards WHERE user_id = $1 AND login_date = $2',
      [userId, today]
    );

    if (existing) {
      throw new ConflictError('Daily reward already claimed today');
    }

    // Get current streak
    let streak = await queryOne<{
      current_streak: number;
      longest_streak: number;
      last_login_date: string | null;
      streak_freezes_owned: number;
      total_logins: number;
    }>('SELECT * FROM login_streaks WHERE user_id = $1', [userId]);

    if (!streak) {
      // Initialize
      await query(
        `INSERT INTO login_streaks (user_id, current_streak, longest_streak, streak_freezes_owned, total_logins)
         VALUES ($1, 0, 0, 0, 0)`,
        [userId]
      );
      streak = {
        current_streak: 0,
        longest_streak: 0,
        last_login_date: null,
        streak_freezes_owned: 0,
        total_logins: 0,
      };
    }

    let newStreak: number;
    let usedFreeze = false;
    const lastLogin = streak.last_login_date;

    if (!lastLogin || lastLogin === yesterday) {
      // Continue streak
      newStreak = streak.current_streak + 1;
    } else if (lastLogin === today) {
      // Already claimed (shouldn't happen due to check above)
      throw new ConflictError('Already claimed today');
    } else {
      // Streak broken
      if (useFreeze && streak.streak_freezes_owned > 0) {
        // Use freeze to save streak
        newStreak = streak.current_streak + 1;
        usedFreeze = true;
      } else if (useFreeze && streak.streak_freezes_owned === 0) {
        throw new ValidationError('No streak freezes available');
      } else {
        // Start fresh
        newStreak = 1;
      }
    }

    // Calculate reward
    const reward = getRewardForDay(newStreak);
    const isMilestone = MILESTONE_DAYS.includes(newStreak);

    // Award credits
    const idempotencyKey = `daily-login:${userId}:${today}`;
    await creditService.addCredits(userId, reward.credits, 'daily_login', { day: newStreak }, idempotencyKey);

    // Award XP
    await xpService.awardXp({
      userId,
      amount: reward.xp,
      sourceType: 'streak',
      sourceId: `daily-login:${today}`,
      reason: `Daily login day ${newStreak}`,
      metadata: { day: newStreak, credits: reward.credits },
    });

    // Create mystery box if milestone
    let mysteryBoxId: string | null = null;
    if (reward.mysteryBoxTier) {
      // Check if mystery_boxes table exists and create box
      const hasMysteryBoxes = await queryOne<{ exists: boolean }>(
        `SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'mystery_boxes')`
      );

      if (hasMysteryBoxes?.exists) {
        const boxResult = await queryOne<{ id: string }>(
          `INSERT INTO mystery_boxes (user_id, tier, source, expires_at)
           VALUES ($1, $2, 'daily_login', NOW() + INTERVAL '30 days')
           RETURNING id`,
          [userId, reward.mysteryBoxTier]
        );
        mysteryBoxId = boxResult?.id || null;
      }
    }

    // Update streak record
    const newLongestStreak = Math.max(streak.longest_streak, newStreak);
    await query(
      `UPDATE login_streaks SET
         current_streak = $1,
         longest_streak = $2,
         last_login_date = $3,
         streak_freezes_owned = streak_freezes_owned - $4,
         total_logins = total_logins + 1,
         updated_at = NOW()
       WHERE user_id = $5`,
      [newStreak, newLongestStreak, today, usedFreeze ? 1 : 0, userId]
    );

    // Record the reward claim
    await query(
      `INSERT INTO daily_login_rewards (user_id, login_date, day_number, credits_awarded, xp_awarded, mystery_box_id, streak_freeze_used)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [userId, today, newStreak, reward.credits, reward.xp, mysteryBoxId, usedFreeze]
    );

    log.info({ userId, day: newStreak, credits: reward.credits, usedFreeze }, 'Daily login reward claimed');

    return {
      credits: reward.credits,
      xp: reward.xp,
      newStreak,
      mysteryBoxId,
      isMilestone,
    };
  },

  /**
   * Use a streak freeze to protect streak
   */
  async useStreakFreeze(userId: string): Promise<{ success: boolean; freezesRemaining: number }> {
    const streak = await queryOne<{ streak_freezes_owned: number }>(
      'SELECT streak_freezes_owned FROM login_streaks WHERE user_id = $1',
      [userId]
    );

    if (!streak || streak.streak_freezes_owned <= 0) {
      throw new ValidationError('No streak freezes available');
    }

    await query(
      `UPDATE login_streaks SET streak_freezes_owned = streak_freezes_owned - 1, updated_at = NOW()
       WHERE user_id = $1`,
      [userId]
    );

    return {
      success: true,
      freezesRemaining: streak.streak_freezes_owned - 1,
    };
  },

  /**
   * Purchase a streak freeze
   */
  async purchaseStreakFreeze(userId: string): Promise<{ success: boolean; freezesOwned: number }> {
    // Charge credits
    const idempotencyKey = `streak-freeze-purchase:${userId}:${Date.now()}`;
    const chargeResult = await creditService.charge({
      userId,
      action: 'streak_freeze_purchase',
      amount: STREAK_FREEZE_COST,
      idempotencyKey,
    });

    if (!chargeResult.success) {
      throw new ValidationError(chargeResult.error || 'Failed to purchase streak freeze');
    }

    // Add freeze
    const result = await queryOne<{ streak_freezes_owned: number }>(
      `UPDATE login_streaks SET streak_freezes_owned = streak_freezes_owned + 1, updated_at = NOW()
       WHERE user_id = $1
       RETURNING streak_freezes_owned`,
      [userId]
    );

    // Initialize if needed
    if (!result) {
      await query(
        `INSERT INTO login_streaks (user_id, current_streak, longest_streak, streak_freezes_owned, total_logins)
         VALUES ($1, 0, 0, 1, 0)
         ON CONFLICT (user_id) DO UPDATE SET streak_freezes_owned = login_streaks.streak_freezes_owned + 1`,
        [userId]
      );
      return { success: true, freezesOwned: 1 };
    }

    return { success: true, freezesOwned: result.streak_freezes_owned };
  },

  /**
   * Get login calendar (last 30 days)
   */
  async getCalendar(userId: string, days: number = 30): Promise<Array<{
    date: string;
    claimed: boolean;
    dayNumber: number;
    credits: number;
    xp: number;
  }>> {
    // Validate days parameter to prevent SQL injection
    const validatedDays = Math.max(1, Math.min(365, Math.floor(Number(days) || 30)));

    const rewards = await queryAll<{
      login_date: string;
      day_number: number;
      credits_awarded: number;
      xp_awarded: number;
    }>(
      `SELECT login_date, day_number, credits_awarded, xp_awarded
       FROM daily_login_rewards
       WHERE user_id = $1 AND login_date >= CURRENT_DATE - INTERVAL '1 day' * $2
       ORDER BY login_date DESC`,
      [userId, validatedDays]
    );

    const rewardMap = new Map(rewards.map((r) => [r.login_date, r]));
    const calendar: Array<{
      date: string;
      claimed: boolean;
      dayNumber: number;
      credits: number;
      xp: number;
    }> = [];

    for (let i = 0; i < validatedDays; i++) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = getDateString(date);
      const reward = rewardMap.get(dateStr);

      calendar.push({
        date: dateStr,
        claimed: !!reward,
        dayNumber: reward?.day_number || 0,
        credits: reward?.credits_awarded || 0,
        xp: reward?.xp_awarded || 0,
      });
    }

    return calendar;
  },

  /**
   * Get reward schedule preview
   */
  getRewardSchedule(): Array<{
    day: number;
    credits: number;
    xp: number;
    mysteryBoxTier: string | null;
    isMilestone: boolean;
  }> {
    return Object.entries(DAILY_REWARDS).map(([day, reward]) => ({
      day: parseInt(day, 10),
      credits: reward.credits,
      xp: reward.xp,
      mysteryBoxTier: reward.mysteryBoxTier || null,
      isMilestone: MILESTONE_DAYS.includes(parseInt(day, 10)),
    }));
  },
};
