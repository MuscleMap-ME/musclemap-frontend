/**
 * XP Service
 *
 * Handles XP (experience point) management for the ranking system:
 * - Award XP for various activities
 * - Track XP history for auditing
 * - Calculate rank from total XP
 * - Check and process rank-ups
 *
 * XP Sources and Amounts:
 * - Workout complete: 25 base + duration bonus
 * - Goal complete: 50 base
 * - Archetype level up: 100
 * - Daily streak: 10 per day
 * - Achievements: 25-500 based on rarity
 * - First workout: 100 (one-time)
 *
 * Velocity Limits (anti-cheat):
 * - Max 500 XP per day
 * - Max 200 XP per hour
 * - Max 100 XP per single workout
 * - 5-minute cooldown between same-source awards
 */

import crypto from 'crypto';
import { queryOne, queryAll, query } from '../../db/client';
import { loggers } from '../../lib/logger';
import { rankService } from './index';

// Import challenge progress tracker (lazy to avoid circular deps)
let challengeProgressMiddleware: any = null;
const getChallengeProgress = async () => {
  if (!challengeProgressMiddleware) {
    try {
      const module = await import('../engagement/challenge-progress.middleware');
      challengeProgressMiddleware = module.challengeProgressMiddleware;
    } catch {
      // Engagement module may not be initialized yet
    }
  }
  return challengeProgressMiddleware;
};

const log = loggers.economy;

// XP source amounts
export const XP_AMOUNTS = {
  WORKOUT_BASE: 25,
  WORKOUT_DURATION_PER_10MIN: 5,
  GOAL_COMPLETE: 50,
  ARCHETYPE_LEVEL_UP: 100,
  ARCHETYPE_COMPLETE: 500,
  STREAK_DAILY: 10,
  STREAK_7_DAY_BONUS: 50,
  STREAK_30_DAY_BONUS: 200,
  STREAK_100_DAY_BONUS: 500,
  ACHIEVEMENT_COMMON: 25,
  ACHIEVEMENT_UNCOMMON: 50,
  ACHIEVEMENT_RARE: 100,
  ACHIEVEMENT_EPIC: 200,
  ACHIEVEMENT_LEGENDARY: 500,
  FIRST_WORKOUT: 100,
} as const;

// Velocity limits - generous limits to avoid frustrating legitimate users
// The primary purpose is to prevent automated abuse, not limit normal activity
export const XP_LIMITS = {
  MAX_PER_DAY: 2000,      // Allow heavy training days (was 500)
  MAX_PER_HOUR: 500,      // Allow multiple workouts per hour (was 200)
  MAX_PER_WORKOUT: 200,   // Allow longer/more intense workouts (was 100)
  COOLDOWN_MINUTES: 1,    // Reduced cooldown for same-source awards (was 5)
} as const;

export type XpSourceType =
  | 'workout'
  | 'goal'
  | 'archetype'
  | 'streak'
  | 'achievement'
  | 'special'
  | 'backfill'
  | 'admin';

export interface XpAwardParams {
  userId: string;
  amount: number;
  sourceType: XpSourceType;
  sourceId?: string;
  reason: string;
  metadata?: Record<string, unknown>;
  bypassLimits?: boolean; // For backfill/admin operations
}

export interface XpAwardResult {
  success: boolean;
  xpAwarded: number;
  newTotalXp: number;
  rankUp: boolean;
  previousRank?: string;
  newRank: string;
  error?: string;
}

export interface XpHistoryEntry {
  id: string;
  amount: number;
  sourceType: XpSourceType;
  sourceId?: string;
  reason: string;
  metadata: Record<string, unknown>;
  createdAt: Date;
}

export const xpService = {
  /**
   * Award XP to a user
   */
  async awardXp(params: XpAwardParams): Promise<XpAwardResult> {
    const { userId, amount, sourceType, sourceId, reason, metadata, bypassLimits } = params;

    if (amount <= 0) {
      return {
        success: false,
        xpAwarded: 0,
        newTotalXp: 0,
        rankUp: false,
        newRank: 'novice',
        error: 'Amount must be positive',
      };
    }

    // Check velocity limits unless bypassed
    if (!bypassLimits) {
      const limitCheck = await this.checkVelocityLimits(userId, amount, sourceType, sourceId);
      if (!limitCheck.allowed) {
        log.debug({ userId, amount, reason: limitCheck.reason }, 'XP award blocked by velocity limit');
        return {
          success: false,
          xpAwarded: 0,
          newTotalXp: 0,
          rankUp: false,
          newRank: 'novice',
          error: limitCheck.reason,
        };
      }
    }

    // Get current user XP and rank
    const currentUser = await queryOne<{ total_xp: number; current_rank: string }>(
      'SELECT total_xp, current_rank FROM users WHERE id = $1',
      [userId]
    );

    if (!currentUser) {
      return {
        success: false,
        xpAwarded: 0,
        newTotalXp: 0,
        rankUp: false,
        newRank: 'novice',
        error: 'User not found',
      };
    }

    const previousRank = currentUser.current_rank;
    const newTotalXp = currentUser.total_xp + amount;

    // Calculate new rank
    const newRankDef = await rankService.getRankForXp(newTotalXp);
    const newRank = newRankDef?.name || 'novice';
    const rankUp = newRank !== previousRank;

    // Record XP in history
    const xpId = `xp_${crypto.randomBytes(12).toString('hex')}`;
    await query(
      `INSERT INTO xp_history (id, user_id, amount, source_type, source_id, reason, metadata)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [xpId, userId, amount, sourceType, sourceId || null, reason, metadata ? JSON.stringify(metadata) : '{}']
    );

    // Update user's total XP and rank
    await query(
      `UPDATE users
       SET total_xp = $1,
           current_rank = $2,
           rank_updated_at = CASE WHEN current_rank != $2 THEN NOW() ELSE rank_updated_at END
       WHERE id = $3`,
      [newTotalXp, newRank, userId]
    );

    log.info({
      userId,
      xpAwarded: amount,
      newTotalXp,
      previousRank,
      newRank,
      rankUp,
      sourceType,
      reason,
    }, 'XP awarded');

    // Track XP earned for challenge progress
    try {
      const progressTracker = await getChallengeProgress();
      if (progressTracker) {
        await progressTracker.trackXpEarned(userId, amount);
      }
    } catch (error) {
      log.debug({ error }, 'Failed to track XP for challenges (non-critical)');
    }

    return {
      success: true,
      xpAwarded: amount,
      newTotalXp,
      rankUp,
      previousRank: rankUp ? previousRank : undefined,
      newRank,
    };
  },

  /**
   * Check velocity limits for XP award
   * Note: Owner accounts bypass all velocity limits for testing purposes
   */
  async checkVelocityLimits(
    userId: string,
    amount: number,
    sourceType: XpSourceType,
    sourceId?: string
  ): Promise<{ allowed: boolean; reason?: string }> {
    // Check if user is owner - owners bypass all velocity limits
    const user = await queryOne<{ roles: string[] }>(
      'SELECT roles FROM users WHERE id = $1',
      [userId]
    );

    if (user?.roles?.includes('owner')) {
      return { allowed: true };
    }

    // Check daily limit
    const dailyResult = await queryOne<{ total: string }>(
      `SELECT COALESCE(SUM(amount), 0) as total
       FROM xp_history
       WHERE user_id = $1 AND created_at >= CURRENT_DATE`,
      [userId]
    );
    const dailyTotal = parseInt(dailyResult?.total || '0');

    if (dailyTotal + amount > XP_LIMITS.MAX_PER_DAY) {
      return { allowed: false, reason: `Daily XP limit reached (${XP_LIMITS.MAX_PER_DAY})` };
    }

    // Check hourly limit
    const hourlyResult = await queryOne<{ total: string }>(
      `SELECT COALESCE(SUM(amount), 0) as total
       FROM xp_history
       WHERE user_id = $1 AND created_at >= NOW() - INTERVAL '1 hour'`,
      [userId]
    );
    const hourlyTotal = parseInt(hourlyResult?.total || '0');

    if (hourlyTotal + amount > XP_LIMITS.MAX_PER_HOUR) {
      return { allowed: false, reason: `Hourly XP limit reached (${XP_LIMITS.MAX_PER_HOUR})` };
    }

    // Check cooldown for same source
    if (sourceId) {
      const recentSame = await queryOne<{ created_at: Date }>(
        `SELECT created_at FROM xp_history
         WHERE user_id = $1 AND source_type = $2 AND source_id = $3
         ORDER BY created_at DESC LIMIT 1`,
        [userId, sourceType, sourceId]
      );

      if (recentSame) {
        const cooldownMs = XP_LIMITS.COOLDOWN_MINUTES * 60 * 1000;
        const timeSince = Date.now() - recentSame.created_at.getTime();
        if (timeSince < cooldownMs) {
          return { allowed: false, reason: `Cooldown active (${Math.ceil((cooldownMs - timeSince) / 60000)} min remaining)` };
        }
      }
    }

    return { allowed: true };
  },

  /**
   * Get XP history for a user
   */
  async getHistory(
    userId: string,
    options: { limit?: number; offset?: number; sourceType?: XpSourceType } = {}
  ): Promise<{ entries: XpHistoryEntry[]; total: number }> {
    const { limit = 50, offset = 0, sourceType } = options;

    let whereClause = 'user_id = $1';
    const params: unknown[] = [userId];
    let paramIndex = 2;

    if (sourceType) {
      whereClause += ` AND source_type = $${paramIndex++}`;
      params.push(sourceType);
    }

    const rows = await queryAll<{
      id: string;
      amount: number;
      source_type: string;
      source_id: string | null;
      reason: string;
      metadata: Record<string, unknown>;
      created_at: Date;
    }>(
      `SELECT id, amount, source_type, source_id, reason, metadata, created_at
       FROM xp_history
       WHERE ${whereClause}
       ORDER BY created_at DESC
       LIMIT $${paramIndex++} OFFSET $${paramIndex++}`,
      [...params, limit, offset]
    );

    const countResult = await queryOne<{ count: string }>(
      `SELECT COUNT(*) as count FROM xp_history WHERE ${whereClause}`,
      params
    );

    return {
      entries: rows.map((r) => ({
        id: r.id,
        amount: r.amount,
        sourceType: r.source_type as XpSourceType,
        sourceId: r.source_id || undefined,
        reason: r.reason,
        metadata: r.metadata || {},
        createdAt: r.created_at,
      })),
      total: parseInt(countResult?.count || '0'),
    };
  },

  /**
   * Get daily XP earned
   */
  async getDailyXp(userId: string): Promise<number> {
    const result = await queryOne<{ total: string }>(
      `SELECT COALESCE(SUM(amount), 0) as total
       FROM xp_history
       WHERE user_id = $1 AND created_at >= CURRENT_DATE`,
      [userId]
    );
    return parseInt(result?.total || '0');
  },

  /**
   * Get weekly XP earned
   */
  async getWeeklyXp(userId: string): Promise<number> {
    const result = await queryOne<{ total: string }>(
      `SELECT COALESCE(SUM(amount), 0) as total
       FROM xp_history
       WHERE user_id = $1 AND created_at >= CURRENT_DATE - INTERVAL '7 days'`,
      [userId]
    );
    return parseInt(result?.total || '0');
  },

  // ============================================
  // CONVENIENCE METHODS FOR SPECIFIC XP EVENTS
  // ============================================

  /**
   * Award XP for workout completion
   */
  async onWorkoutComplete(params: {
    userId: string;
    workoutId: string;
    durationMinutes: number;
  }): Promise<XpAwardResult> {
    // Calculate XP: base + duration bonus (capped at MAX_PER_WORKOUT)
    const baseXp = XP_AMOUNTS.WORKOUT_BASE;
    const durationBonus = Math.floor(params.durationMinutes / 10) * XP_AMOUNTS.WORKOUT_DURATION_PER_10MIN;
    const xp = Math.min(baseXp + durationBonus, XP_LIMITS.MAX_PER_WORKOUT);

    return this.awardXp({
      userId: params.userId,
      amount: xp,
      sourceType: 'workout',
      sourceId: params.workoutId,
      reason: `Workout completed (${params.durationMinutes} min)`,
      metadata: { durationMinutes: params.durationMinutes },
    });
  },

  /**
   * Award XP for goal completion
   */
  async onGoalComplete(params: {
    userId: string;
    goalId: string;
    goalName?: string;
  }): Promise<XpAwardResult> {
    return this.awardXp({
      userId: params.userId,
      amount: XP_AMOUNTS.GOAL_COMPLETE,
      sourceType: 'goal',
      sourceId: params.goalId,
      reason: params.goalName ? `Goal completed: ${params.goalName}` : 'Goal completed',
      metadata: { goalId: params.goalId },
    });
  },

  /**
   * Award XP for archetype level up
   */
  async onArchetypeLevelUp(params: {
    userId: string;
    archetypeId: string;
    archetypeName: string;
    newLevel: number;
  }): Promise<XpAwardResult> {
    return this.awardXp({
      userId: params.userId,
      amount: XP_AMOUNTS.ARCHETYPE_LEVEL_UP,
      sourceType: 'archetype',
      sourceId: `${params.archetypeId}-level-${params.newLevel}`,
      reason: `${params.archetypeName} level ${params.newLevel}`,
      metadata: { archetypeId: params.archetypeId, newLevel: params.newLevel },
    });
  },

  /**
   * Award XP for streak milestone
   */
  async onStreakMilestone(params: {
    userId: string;
    streakDays: number;
  }): Promise<XpAwardResult | null> {
    let amount: number;
    let reason: string;

    if (params.streakDays === 7) {
      amount = XP_AMOUNTS.STREAK_7_DAY_BONUS;
      reason = '7-day streak milestone';
    } else if (params.streakDays === 30) {
      amount = XP_AMOUNTS.STREAK_30_DAY_BONUS;
      reason = '30-day streak milestone';
    } else if (params.streakDays === 100) {
      amount = XP_AMOUNTS.STREAK_100_DAY_BONUS;
      reason = '100-day streak milestone';
    } else {
      return null;
    }

    return this.awardXp({
      userId: params.userId,
      amount,
      sourceType: 'streak',
      sourceId: `streak-${params.streakDays}-${new Date().toISOString().split('T')[0]}`,
      reason,
      metadata: { streakDays: params.streakDays },
    });
  },

  /**
   * Award XP for achievement unlock
   */
  async onAchievementUnlock(params: {
    userId: string;
    achievementId: string;
    achievementName: string;
    rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
  }): Promise<XpAwardResult> {
    const rarityMap = {
      common: XP_AMOUNTS.ACHIEVEMENT_COMMON,
      uncommon: XP_AMOUNTS.ACHIEVEMENT_UNCOMMON,
      rare: XP_AMOUNTS.ACHIEVEMENT_RARE,
      epic: XP_AMOUNTS.ACHIEVEMENT_EPIC,
      legendary: XP_AMOUNTS.ACHIEVEMENT_LEGENDARY,
    };

    return this.awardXp({
      userId: params.userId,
      amount: rarityMap[params.rarity],
      sourceType: 'achievement',
      sourceId: params.achievementId,
      reason: `Achievement: ${params.achievementName}`,
      metadata: { achievementId: params.achievementId, rarity: params.rarity },
    });
  },

  /**
   * Award first workout bonus (one-time)
   */
  async onFirstWorkout(params: {
    userId: string;
    workoutId: string;
  }): Promise<XpAwardResult> {
    // Check if already awarded
    const existing = await queryOne<{ id: string }>(
      `SELECT id FROM xp_history
       WHERE user_id = $1 AND source_type = 'special' AND reason = 'First workout completed'`,
      [params.userId]
    );

    if (existing) {
      return {
        success: true,
        xpAwarded: 0,
        newTotalXp: 0,
        rankUp: false,
        newRank: 'novice',
        error: 'Already awarded',
      };
    }

    return this.awardXp({
      userId: params.userId,
      amount: XP_AMOUNTS.FIRST_WORKOUT,
      sourceType: 'special',
      sourceId: params.workoutId,
      reason: 'First workout completed',
      metadata: { workoutId: params.workoutId },
    });
  },
};

export default xpService;
