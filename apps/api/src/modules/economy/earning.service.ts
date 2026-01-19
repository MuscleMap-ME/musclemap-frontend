/**
 * Earning Service
 *
 * Handles credit and XP awards based on configurable rules:
 * - Workout completion (duration/volume bonuses)
 * - Streak milestones
 * - Personal records
 * - Goal completion
 * - Leaderboard placements
 * - Trainer wages
 * - Social actions
 */

import crypto from 'crypto';
import { queryOne, queryAll, query } from '../../db/client';
import { loggers } from '../../lib/logger';
import { creditService } from './credit.service';
import { xpService, type XpSourceType } from '../ranks/xp.service';
import { streaksService } from '../engagement/streaks.service';
import { challengesService } from '../engagement/challenges.service';

const log = loggers.economy;

export interface EarningRule {
  code: string;
  name: string;
  description?: string;
  category: string;
  creditsBase: number;
  creditsFormula?: string;
  xpBase: number;
  xpFormula?: string;
  maxPerDay?: number;
  maxPerWeek?: number;
  cooldownMinutes?: number;
  enabled: boolean;
}

// Default caps for earning rules when not specified in database
// This prevents abuse from unlimited earning triggers
const DEFAULT_MAX_PER_DAY: Record<string, number> = {
  // Workouts - reasonable daily limits
  'workout_complete': 5,
  'workout_volume_bonus': 3,

  // Streaks - 1 per milestone level per day
  'streak_3': 1,
  'streak_7': 1,
  'streak_14': 1,
  'streak_30': 1,
  'streak_100': 1,
  'streak_365': 1,

  // Personal records - limited to prevent rapid fire PR claims
  'pr_set': 10,

  // Goals - reasonable daily completions
  'goal_complete_easy': 5,
  'goal_complete_medium': 3,
  'goal_complete_hard': 2,

  // Leaderboard - once per placement per day
  'leaderboard_1st': 1,
  'leaderboard_2nd': 1,
  'leaderboard_3rd': 1,
  'leaderboard_top10': 1,

  // Trainer wages - multiple classes possible
  'trainer_class_wage': 10,

  // Social actions
  'high_five_sent': 20,
  'high_five_received': 50,

  // Referrals
  'referral_signup': 10,
  'referral_first_workout': 10,
};

// Fallback default if rule code not in map
const FALLBACK_MAX_PER_DAY = 20;

// Absolute upper bound for all earning - prevents abuse even if rule is misconfigured
// No single rule can exceed this limit per day under any circumstances
const ABSOLUTE_MAX_PER_DAY = 100;

// Maximum credits/XP per award to prevent misconfigured rules from causing issues
const MAX_CREDITS_PER_AWARD = 10000;
const MAX_XP_PER_AWARD = 5000;

export interface EarningContext {
  userId: string;
  ruleCode: string;
  sourceType: string;
  sourceId: string;
  metadata?: Record<string, unknown>;

  // Optional context for dynamic calculations
  durationMinutes?: number;
  totalVolume?: number;
  currentStreak?: number;
  goalDifficulty?: 'easy' | 'medium' | 'hard';
  leaderboardRank?: number;
  attendeeCount?: number;
  wagePerStudent?: number;
}

export interface EarningResult {
  success: boolean;
  alreadyAwarded?: boolean;
  creditsAwarded?: number;
  xpAwarded?: number;
  awardId?: string;
  error?: string;
}

export const earningService = {
  /**
   * Get all earning rules
   */
  async getRules(options: { category?: string; enabledOnly?: boolean } = {}): Promise<EarningRule[]> {
    const { category, enabledOnly = true } = options;

    let whereClause = enabledOnly ? 'enabled = TRUE' : '1=1';
    const params: unknown[] = [];

    if (category) {
      whereClause += ` AND category = $${params.length + 1}`;
      params.push(category);
    }

    const rows = await queryAll<{
      code: string;
      name: string;
      description: string | null;
      category: string;
      credits_base: number;
      credits_formula: string | null;
      xp_base: number;
      xp_formula: string | null;
      max_per_day: number | null;
      max_per_week: number | null;
      cooldown_minutes: number | null;
      enabled: boolean;
    }>(`SELECT * FROM earning_rules WHERE ${whereClause} ORDER BY category, code`, params);

    return rows.map((r) => ({
      code: r.code,
      name: r.name,
      description: r.description ?? undefined,
      category: r.category,
      creditsBase: r.credits_base,
      creditsFormula: r.credits_formula ?? undefined,
      xpBase: r.xp_base,
      xpFormula: r.xp_formula ?? undefined,
      maxPerDay: r.max_per_day ?? undefined,
      maxPerWeek: r.max_per_week ?? undefined,
      cooldownMinutes: r.cooldown_minutes ?? undefined,
      enabled: r.enabled,
    }));
  },

  /**
   * Get a specific earning rule
   */
  async getRule(code: string): Promise<EarningRule | null> {
    const row = await queryOne<{
      code: string;
      name: string;
      description: string | null;
      category: string;
      credits_base: number;
      credits_formula: string | null;
      xp_base: number;
      xp_formula: string | null;
      max_per_day: number | null;
      max_per_week: number | null;
      cooldown_minutes: number | null;
      enabled: boolean;
    }>('SELECT * FROM earning_rules WHERE code = $1', [code]);

    if (!row) return null;

    return {
      code: row.code,
      name: row.name,
      description: row.description ?? undefined,
      category: row.category,
      creditsBase: row.credits_base,
      creditsFormula: row.credits_formula ?? undefined,
      xpBase: row.xp_base,
      xpFormula: row.xp_formula ?? undefined,
      maxPerDay: row.max_per_day ?? undefined,
      maxPerWeek: row.max_per_week ?? undefined,
      cooldownMinutes: row.cooldown_minutes ?? undefined,
      enabled: row.enabled,
    };
  },

  /**
   * Process an earning event and award credits/XP
   */
  async processEarning(context: EarningContext): Promise<EarningResult> {
    const { userId, ruleCode, sourceType, sourceId, metadata } = context;

    // Generate idempotency key
    const idempotencyKey = `${ruleCode}:${sourceType}:${sourceId}`;

    // Check if already awarded
    const existing = await queryOne<{ id: string }>(
      'SELECT id FROM earning_awards WHERE idempotency_key = $1',
      [idempotencyKey]
    );

    if (existing) {
      log.debug({ userId, ruleCode, sourceId }, 'Already awarded');
      return { success: true, alreadyAwarded: true, awardId: existing.id };
    }

    // Get the rule
    const rule = await this.getRule(ruleCode);
    if (!rule) {
      log.warn({ ruleCode }, 'Unknown earning rule');
      return { success: false, error: 'Unknown earning rule' };
    }

    if (!rule.enabled) {
      log.debug({ ruleCode }, 'Earning rule disabled');
      return { success: false, error: 'Earning rule disabled' };
    }

    // Check daily/weekly limits
    // Use rule's maxPerDay if set, otherwise use default cap to prevent abuse
    // Apply absolute upper bound to prevent misconfigured rules from causing unlimited earning
    const configuredMaxPerDay = rule.maxPerDay ?? DEFAULT_MAX_PER_DAY[ruleCode] ?? FALLBACK_MAX_PER_DAY;
    const effectiveMaxPerDay = Math.min(configuredMaxPerDay, ABSOLUTE_MAX_PER_DAY);

    // Log if rule's configured limit exceeds absolute limit (indicates misconfiguration)
    if (configuredMaxPerDay > ABSOLUTE_MAX_PER_DAY) {
      log.warn({ ruleCode, configuredMaxPerDay, effectiveMaxPerDay }, 'Earning rule maxPerDay exceeds absolute limit');
    }

    const todayCount = await this.getTodayCount(userId, ruleCode);
    if (todayCount >= effectiveMaxPerDay) {
      log.debug({ userId, ruleCode, todayCount, maxPerDay: effectiveMaxPerDay }, 'Daily limit reached');
      return { success: false, error: 'Daily limit reached' };
    }

    if (rule.maxPerWeek) {
      const weekCount = await this.getWeekCount(userId, ruleCode);
      if (weekCount >= rule.maxPerWeek) {
        log.debug({ userId, ruleCode, weekCount, maxPerWeek: rule.maxPerWeek }, 'Weekly limit reached');
        return { success: false, error: 'Weekly limit reached' };
      }
    }

    // Check cooldown
    if (rule.cooldownMinutes) {
      const lastAward = await queryOne<{ created_at: Date }>(
        'SELECT created_at FROM earning_awards WHERE user_id = $1 AND rule_code = $2 ORDER BY created_at DESC LIMIT 1',
        [userId, ruleCode]
      );

      if (lastAward) {
        const cooldownMs = rule.cooldownMinutes * 60 * 1000;
        const timeSince = Date.now() - lastAward.created_at.getTime();
        if (timeSince < cooldownMs) {
          const remainingMinutes = Math.ceil((cooldownMs - timeSince) / 60000);
          log.debug({ userId, ruleCode, remainingMinutes }, 'Cooldown active');
          return { success: false, error: `Cooldown active: ${remainingMinutes} minutes remaining` };
        }
      }
    }

    // Calculate credits and XP
    let credits = this.calculateCredits(rule, context);
    let xp = this.calculateXp(rule, context);

    // Enforce absolute upper bounds on award amounts to prevent abuse
    if (credits > MAX_CREDITS_PER_AWARD) {
      log.warn({ userId, ruleCode, calculatedCredits: credits, maxAllowed: MAX_CREDITS_PER_AWARD }, 'Credits exceed max per award');
      credits = MAX_CREDITS_PER_AWARD;
    }
    if (xp > MAX_XP_PER_AWARD) {
      log.warn({ userId, ruleCode, calculatedXp: xp, maxAllowed: MAX_XP_PER_AWARD }, 'XP exceeds max per award');
      xp = MAX_XP_PER_AWARD;
    }

    if (credits <= 0 && xp <= 0) {
      log.debug({ userId, ruleCode }, 'No credits or XP to award');
      return { success: true, creditsAwarded: 0, xpAwarded: 0 };
    }

    const awardId = `award_${crypto.randomBytes(12).toString('hex')}`;
    let ledgerEntryId: string | undefined;

    try {
      // Award credits
      if (credits > 0) {
        const creditResult = await creditService.addCredits(
          userId,
          credits,
          `earn.${ruleCode}`,
          { ...metadata, awardId, xpAwarded: xp },
          `credit-${idempotencyKey}`
        );

        if (!creditResult.success) {
          log.error({ userId, ruleCode, credits, error: creditResult.error }, 'Failed to award credits');
          return { success: false, error: creditResult.error };
        }

        ledgerEntryId = creditResult.ledgerEntryId;
      }

      // Award XP (to buddy and user ranking system)
      if (xp > 0) {
        await this.awardXp(userId, xp, sourceType, sourceId, `${ruleCode}: ${rule.name}`);
      }

      // Record the award
      await query(
        `INSERT INTO earning_awards (id, user_id, rule_code, source_type, source_id, credits_awarded, xp_awarded, ledger_entry_id, idempotency_key, metadata)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [awardId, userId, ruleCode, sourceType, sourceId, credits, xp, ledgerEntryId, idempotencyKey, metadata ? JSON.stringify(metadata) : '{}']
      );

      log.info({
        awardId,
        userId,
        ruleCode,
        sourceType,
        sourceId,
        creditsAwarded: credits,
        xpAwarded: xp,
      }, 'Earning awarded');

      return {
        success: true,
        creditsAwarded: credits,
        xpAwarded: xp,
        awardId,
      };
    } catch (error: any) {
      // Handle idempotency - if insert fails due to unique constraint, the award already exists
      if (error.code === '23505' && error.constraint?.includes('idempotency')) {
        const existingAward = await queryOne<{ id: string; credits_awarded: number; xp_awarded: number }>(
          'SELECT id, credits_awarded, xp_awarded FROM earning_awards WHERE idempotency_key = $1',
          [idempotencyKey]
        );

        if (existingAward) {
          return {
            success: true,
            alreadyAwarded: true,
            creditsAwarded: existingAward.credits_awarded,
            xpAwarded: existingAward.xp_awarded,
            awardId: existingAward.id,
          };
        }
      }

      log.error({ userId, ruleCode, error }, 'Failed to process earning');
      throw error;
    }
  },

  /**
   * Calculate credits based on rule and context
   */
  calculateCredits(rule: EarningRule, context: EarningContext): number {
    let credits = rule.creditsBase;

    // Dynamic calculations based on context
    switch (rule.code) {
      case 'workout_complete':
        // Base + duration bonus (5 credits per 10 minutes)
        if (context.durationMinutes) {
          credits = Math.floor(context.durationMinutes / 10) * 5;
          credits = Math.max(credits, rule.creditsBase);
        }
        break;

      case 'workout_volume_bonus':
        // Bonus based on volume threshold
        if (context.totalVolume) {
          if (context.totalVolume >= 20000) {
            credits = 50;
          } else if (context.totalVolume >= 10000) {
            credits = 25;
          } else if (context.totalVolume >= 5000) {
            credits = 10;
          }
        }
        break;

      case 'goal_complete_easy':
      case 'goal_complete_medium':
      case 'goal_complete_hard':
        // Credits based on difficulty
        if (context.goalDifficulty) {
          switch (context.goalDifficulty) {
            case 'easy': credits = 50; break;
            case 'medium': credits = 100; break;
            case 'hard': credits = 200; break;
          }
        }
        break;

      case 'trainer_class_wage':
        // Credits per attendee
        if (context.attendeeCount && context.wagePerStudent) {
          credits = context.attendeeCount * context.wagePerStudent;
        }
        break;

      case 'leaderboard_1st':
      case 'leaderboard_2nd':
      case 'leaderboard_3rd':
      case 'leaderboard_top10':
        // Credits based on rank
        if (context.leaderboardRank !== undefined) {
          if (context.leaderboardRank === 1) credits = 500;
          else if (context.leaderboardRank === 2) credits = 300;
          else if (context.leaderboardRank === 3) credits = 200;
          else if (context.leaderboardRank <= 10) credits = 100;
        }
        break;
    }

    return Math.max(0, Math.floor(credits));
  },

  /**
   * Calculate XP based on rule and context
   */
  calculateXp(rule: EarningRule, context: EarningContext): number {
    let xp = rule.xpBase;

    // Dynamic XP calculations
    switch (rule.code) {
      case 'workout_complete':
        // XP based on duration
        if (context.durationMinutes) {
          xp = context.durationMinutes;
          xp = Math.max(xp, rule.xpBase);
        }
        break;

      case 'trainer_class_wage':
        // XP per attendee
        if (context.attendeeCount) {
          xp = context.attendeeCount * 10;
        }
        break;
    }

    return Math.max(0, Math.floor(xp));
  },

  /**
   * Award XP to user's buddy and user's ranking XP
   */
  async awardXp(userId: string, xp: number, sourceType?: string, sourceId?: string, reason?: string): Promise<void> {
    // Award XP to training buddy (if exists)
    const buddy = await queryOne<{ user_id: string; xp: number; level: number }>(
      'SELECT user_id, xp, level FROM training_buddies WHERE user_id = $1',
      [userId]
    );

    if (buddy) {
      // Update buddy XP (level-up logic handled separately)
      await query(
        `UPDATE training_buddies
         SET xp = xp + $1, total_xp_earned = COALESCE(total_xp_earned, 0) + $1, updated_at = NOW()
         WHERE user_id = $2`,
        [xp, userId]
      );
    }

    // Also track on user (legacy field)
    await query(
      `UPDATE users SET buddy_xp_total = COALESCE(buddy_xp_total, 0) + $1 WHERE id = $2`,
      [xp, userId]
    );

    // Award XP to user's ranking system
    try {
      await xpService.awardXp({
        userId,
        amount: xp,
        sourceType: (sourceType as XpSourceType) || 'workout',
        sourceId,
        reason: reason || 'Earning reward',
        bypassLimits: false, // Respect velocity limits
      });
    } catch (error) {
      log.warn({ userId, xp, error }, 'Failed to award ranking XP (non-fatal)');
    }
  },

  /**
   * Get count of awards today for a rule
   */
  async getTodayCount(userId: string, ruleCode: string): Promise<number> {
    const result = await queryOne<{ count: string }>(
      `SELECT COUNT(*) as count FROM earning_awards
       WHERE user_id = $1 AND rule_code = $2 AND created_at >= CURRENT_DATE`,
      [userId, ruleCode]
    );
    return parseInt(result?.count || '0', 10);
  },

  /**
   * Get count of awards this week for a rule
   */
  async getWeekCount(userId: string, ruleCode: string): Promise<number> {
    const result = await queryOne<{ count: string }>(
      `SELECT COUNT(*) as count FROM earning_awards
       WHERE user_id = $1 AND rule_code = $2 AND created_at >= CURRENT_DATE - INTERVAL '7 days'`,
      [userId, ruleCode]
    );
    return parseInt(result?.count || '0', 10);
  },

  /**
   * Get earning history for a user
   */
  async getHistory(userId: string, options: {
    limit?: number;
    offset?: number;
    category?: string;
  } = {}): Promise<{
    awards: Array<{
      id: string;
      ruleCode: string;
      ruleName: string;
      category: string;
      sourceType: string;
      sourceId: string;
      creditsAwarded: number;
      xpAwarded: number;
      createdAt: Date;
    }>;
    total: number;
  }> {
    const { limit = 50, offset = 0, category } = options;

    let whereClause = 'ea.user_id = $1';
    const params: unknown[] = [userId];
    let paramIndex = 2;

    if (category) {
      whereClause += ` AND er.category = $${paramIndex++}`;
      params.push(category);
    }

    params.push(limit, offset);

    const rows = await queryAll<{
      id: string;
      rule_code: string;
      rule_name: string;
      category: string;
      source_type: string;
      source_id: string;
      credits_awarded: number;
      xp_awarded: number;
      created_at: Date;
    }>(
      `SELECT ea.id, ea.rule_code, er.name as rule_name, er.category,
              ea.source_type, ea.source_id, ea.credits_awarded, ea.xp_awarded, ea.created_at
       FROM earning_awards ea
       JOIN earning_rules er ON er.code = ea.rule_code
       WHERE ${whereClause}
       ORDER BY ea.created_at DESC
       LIMIT $${paramIndex++} OFFSET $${paramIndex++}`,
      params
    );

    const countResult = await queryOne<{ count: string }>(
      `SELECT COUNT(*) as count FROM earning_awards ea
       JOIN earning_rules er ON er.code = ea.rule_code
       WHERE ${whereClause}`,
      params.slice(0, -2)
    );

    return {
      awards: rows.map((r) => ({
        id: r.id,
        ruleCode: r.rule_code,
        ruleName: r.rule_name,
        category: r.category,
        sourceType: r.source_type,
        sourceId: r.source_id,
        creditsAwarded: r.credits_awarded,
        xpAwarded: r.xp_awarded,
        createdAt: r.created_at,
      })),
      total: parseInt(countResult?.count || '0', 10),
    };
  },

  // ============================================
  // CONVENIENCE METHODS FOR SPECIFIC EARNING EVENTS
  // ============================================

  /**
   * Award credits for completing a workout
   */
  async onWorkoutComplete(params: {
    userId: string;
    workoutId: string;
    durationMinutes: number;
    totalVolume?: number;
    exerciseCount: number;
    muscleGroupsHit?: string[];
    newExercisesTried?: number;
    prsSet?: number;
  }): Promise<EarningResult[]> {
    const results: EarningResult[] = [];

    // Base workout completion award
    const workoutResult = await this.processEarning({
      userId: params.userId,
      ruleCode: 'workout_complete',
      sourceType: 'workout',
      sourceId: params.workoutId,
      durationMinutes: params.durationMinutes,
      metadata: { exerciseCount: params.exerciseCount, totalVolume: params.totalVolume },
    });
    results.push(workoutResult);

    // Volume bonus if applicable
    if (params.totalVolume && params.totalVolume >= 5000) {
      const volumeResult = await this.processEarning({
        userId: params.userId,
        ruleCode: 'workout_volume_bonus',
        sourceType: 'workout',
        sourceId: params.workoutId,
        totalVolume: params.totalVolume,
      });
      results.push(volumeResult);
    }

    // Check and award streak achievements
    await this.checkStreakAwards(params.userId);

    // ==========================================
    // ENGAGEMENT SYSTEM INTEGRATION
    // ==========================================

    // Record workout streak activity
    try {
      await streaksService.recordActivity(params.userId, 'workout');
      log.debug({ userId: params.userId }, 'Workout streak activity recorded');
    } catch (streakError) {
      log.warn({ userId: params.userId, error: streakError }, 'Failed to record workout streak');
    }

    // Update challenge progress for various tracking keys
    try {
      // Workouts completed challenge
      await challengesService.updateProgress(params.userId, 'workoutsCompleted', 1);

      // Sets logged challenge (using exercise count as proxy)
      if (params.exerciseCount) {
        await challengesService.updateProgress(params.userId, 'setsLogged', params.exerciseCount);
      }

      // Muscle groups hit challenge
      if (params.muscleGroupsHit && params.muscleGroupsHit.length > 0) {
        await challengesService.updateProgress(params.userId, 'muscleGroupsHit', params.muscleGroupsHit.length);
      }

      // Total volume challenge
      if (params.totalVolume) {
        await challengesService.updateProgress(params.userId, 'totalVolume', params.totalVolume);
      }

      // New exercises tried challenge
      if (params.newExercisesTried && params.newExercisesTried > 0) {
        await challengesService.updateProgress(params.userId, 'newExercisesTried', params.newExercisesTried);
      }

      // PRs set challenge
      if (params.prsSet && params.prsSet > 0) {
        await challengesService.updateProgress(params.userId, 'prsSet', params.prsSet);
      }

      log.debug({ userId: params.userId }, 'Challenge progress updated from workout');
    } catch (challengeError) {
      log.warn({ userId: params.userId, error: challengeError }, 'Failed to update challenge progress');
    }

    return results;
  },

  /**
   * Check and award streak milestones
   */
  async checkStreakAwards(userId: string): Promise<EarningResult[]> {
    const results: EarningResult[] = [];

    // Calculate current streak
    const streakResult = await queryOne<{ streak: string }>(
      `WITH daily_workouts AS (
        SELECT DISTINCT DATE(date) as workout_date
        FROM workouts
        WHERE user_id = $1 AND date >= CURRENT_DATE - INTERVAL '365 days'
        ORDER BY workout_date DESC
      ),
      streak_calc AS (
        SELECT workout_date,
               workout_date - (ROW_NUMBER() OVER (ORDER BY workout_date DESC))::int as streak_group
        FROM daily_workouts
      )
      SELECT COUNT(*) as streak
      FROM streak_calc
      WHERE streak_group = (
        SELECT streak_group FROM streak_calc WHERE workout_date = CURRENT_DATE
        UNION
        SELECT streak_group FROM streak_calc WHERE workout_date = CURRENT_DATE - 1
        LIMIT 1
      )`,
      [userId]
    );

    const currentStreak = parseInt(streakResult?.streak || '0');

    // Check streak milestones
    const streakMilestones = [
      { days: 3, code: 'streak_3' },
      { days: 7, code: 'streak_7' },
      { days: 14, code: 'streak_14' },
      { days: 30, code: 'streak_30' },
      { days: 100, code: 'streak_100' },
      { days: 365, code: 'streak_365' },
    ];

    for (const milestone of streakMilestones) {
      if (currentStreak >= milestone.days) {
        const result = await this.processEarning({
          userId,
          ruleCode: milestone.code,
          sourceType: 'streak',
          sourceId: `streak-${milestone.days}-${new Date().toISOString().split('T')[0]}`,
          currentStreak,
        });

        if (result.success && !result.alreadyAwarded) {
          results.push(result);
        }
      }
    }

    return results;
  },

  /**
   * Award credits for setting a personal record
   */
  async onPersonalRecord(params: {
    userId: string;
    exerciseId: string;
    metricKey: string;
    value: number;
    previousValue?: number;
  }): Promise<EarningResult> {
    return this.processEarning({
      userId: params.userId,
      ruleCode: 'pr_set',
      sourceType: 'pr',
      sourceId: `${params.exerciseId}-${params.metricKey}-${Date.now()}`,
      metadata: { exerciseId: params.exerciseId, metricKey: params.metricKey, value: params.value, previousValue: params.previousValue },
    });
  },

  /**
   * Award credits for completing a goal
   */
  async onGoalComplete(params: {
    userId: string;
    goalId: string;
    difficulty: 'easy' | 'medium' | 'hard';
  }): Promise<EarningResult> {
    const ruleCode = `goal_complete_${params.difficulty}`;
    return this.processEarning({
      userId: params.userId,
      ruleCode,
      sourceType: 'goal',
      sourceId: params.goalId,
      goalDifficulty: params.difficulty,
    });
  },

  /**
   * Award credits for leaderboard placement
   */
  async onLeaderboardPlacement(params: {
    userId: string;
    leaderboardId: string;
    rank: number;
    periodType: string;
  }): Promise<EarningResult> {
    let ruleCode: string;
    if (params.rank === 1) {
      ruleCode = 'leaderboard_1st';
    } else if (params.rank === 2) {
      ruleCode = 'leaderboard_2nd';
    } else if (params.rank === 3) {
      ruleCode = 'leaderboard_3rd';
    } else if (params.rank <= 10) {
      ruleCode = 'leaderboard_top10';
    } else {
      return { success: false, error: 'Rank not eligible for award' };
    }

    return this.processEarning({
      userId: params.userId,
      ruleCode,
      sourceType: 'leaderboard',
      sourceId: `${params.leaderboardId}-${params.periodType}`,
      leaderboardRank: params.rank,
      metadata: { leaderboardId: params.leaderboardId, periodType: params.periodType, rank: params.rank },
    });
  },

  /**
   * Award trainer wage for class attendance
   */
  async onClassAttendance(params: {
    trainerId: string;
    classId: string;
    attendeeCount: number;
    wagePerStudent: number;
  }): Promise<EarningResult> {
    return this.processEarning({
      userId: params.trainerId,
      ruleCode: 'trainer_class_wage',
      sourceType: 'class',
      sourceId: params.classId,
      attendeeCount: params.attendeeCount,
      wagePerStudent: params.wagePerStudent,
      metadata: { classId: params.classId, attendeeCount: params.attendeeCount, wagePerStudent: params.wagePerStudent },
    });
  },
};

export default earningService;
