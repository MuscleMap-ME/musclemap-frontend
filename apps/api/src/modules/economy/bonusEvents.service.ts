/**
 * Bonus Events Service
 *
 * Handles random/conditional credit bonuses:
 * - Lucky Rep (1% chance per rep)
 * - Golden Set (2% chance per set)
 * - Jackpot Workout (1% chance per workout)
 * - Mystery Box (daily random reward)
 * - Time-based bonuses (early bird, night owl, weekend)
 * - Comeback bonus (returning after absence)
 *
 * These create excitement and keep users engaged!
 */

import crypto from 'crypto';
import { queryOne, queryAll, query } from '../../db/client';
import { loggers } from '../../lib/logger';
import { creditService } from './credit.service';
import { earnEventsService } from './earnEvents.service';

const log = loggers.economy;

export interface BonusEventType {
  id: string;
  code: string;
  name: string;
  description?: string;
  probability: number;
  minCredits: number;
  maxCredits: number;
  triggerOn: string;
  maxPerDay: number;
  maxPerWeek: number;
  icon?: string;
  color?: string;
  animation?: string;
  enabled: boolean;
}

export interface BonusEventResult {
  triggered: boolean;
  eventType?: string;
  creditsAwarded?: number;
  eventId?: string;
  message?: string;
}

export const bonusEventsService = {
  /**
   * Get all bonus event types
   */
  async getEventTypes(enabledOnly: boolean = true): Promise<BonusEventType[]> {
    const rows = await queryAll<{
      id: string;
      code: string;
      name: string;
      description: string | null;
      probability: string;
      min_credits: number;
      max_credits: number;
      trigger_on: string;
      max_per_day: number | null;
      max_per_week: number | null;
      icon: string | null;
      color: string | null;
      animation: string | null;
      enabled: boolean;
    }>(
      enabledOnly
        ? 'SELECT * FROM bonus_event_types WHERE enabled = true ORDER BY code'
        : 'SELECT * FROM bonus_event_types ORDER BY code',
      []
    );

    return rows.map(r => ({
      id: r.id,
      code: r.code,
      name: r.name,
      description: r.description || undefined,
      probability: parseFloat(r.probability),
      minCredits: r.min_credits,
      maxCredits: r.max_credits,
      triggerOn: r.trigger_on,
      maxPerDay: r.max_per_day || 1,
      maxPerWeek: r.max_per_week || 7,
      icon: r.icon || undefined,
      color: r.color || undefined,
      animation: r.animation || undefined,
      enabled: r.enabled,
    }));
  },

  /**
   * Get a specific bonus event type
   */
  async getEventType(code: string): Promise<BonusEventType | null> {
    const row = await queryOne<{
      id: string;
      code: string;
      name: string;
      description: string | null;
      probability: string;
      min_credits: number;
      max_credits: number;
      trigger_on: string;
      max_per_day: number | null;
      max_per_week: number | null;
      icon: string | null;
      color: string | null;
      animation: string | null;
      enabled: boolean;
    }>('SELECT * FROM bonus_event_types WHERE code = $1', [code]);

    if (!row) return null;

    return {
      id: row.id,
      code: row.code,
      name: row.name,
      description: row.description || undefined,
      probability: parseFloat(row.probability),
      minCredits: row.min_credits,
      maxCredits: row.max_credits,
      triggerOn: row.trigger_on,
      maxPerDay: row.max_per_day || 1,
      maxPerWeek: row.max_per_week || 7,
      icon: row.icon || undefined,
      color: row.color || undefined,
      animation: row.animation || undefined,
      enabled: row.enabled,
    };
  },

  /**
   * Check and potentially trigger a bonus event
   */
  async checkAndTrigger(
    userId: string,
    trigger: string,
    sourceId?: string
  ): Promise<BonusEventResult> {
    // Get all enabled event types for this trigger
    const eventTypes = await this.getEventTypes(true);
    const matchingTypes = eventTypes.filter(et => et.triggerOn === trigger);

    if (matchingTypes.length === 0) {
      return { triggered: false };
    }

    // Check each event type
    for (const eventType of matchingTypes) {
      // Check daily limit
      const todayCount = await this.getTodayCount(userId, eventType.code);
      if (todayCount >= eventType.maxPerDay) {
        continue;
      }

      // Check probability (skip for probability = 1.0 events like daily login)
      if (eventType.probability < 1.0) {
        const roll = Math.random();
        if (roll > eventType.probability) {
          continue;
        }
      }

      // Triggered! Calculate reward
      const credits = this.calculateReward(eventType.minCredits, eventType.maxCredits);

      // Award credits
      const idempotencyKey = `bonus-${eventType.code}-${userId}-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;

      const creditResult = await creditService.addCredits(
        userId,
        credits,
        `bonus.${eventType.code}`,
        { sourceId, eventType: eventType.code },
        idempotencyKey
      );

      if (!creditResult.success) {
        log.error({ userId, eventType: eventType.code, error: creditResult.error }, 'Failed to award bonus credits');
        continue;
      }

      // Record the bonus event
      const eventId = `ube_${crypto.randomBytes(12).toString('hex')}`;
      await query(
        `INSERT INTO user_bonus_events (id, user_id, event_type_code, credits_awarded, trigger_source_id)
         VALUES ($1, $2, $3, $4, $5)`,
        [eventId, userId, eventType.code, credits, sourceId || null]
      );

      // Create earn event for UI display
      await earnEventsService.createEvent({
        userId,
        amount: credits,
        source: eventType.code,
        sourceId,
        description: eventType.name,
        forceAnimationType: eventType.animation || 'celebration',
        forceIcon: eventType.icon,
        forceColor: eventType.color,
      });

      log.info({
        userId,
        eventType: eventType.code,
        credits,
        trigger,
        sourceId,
      }, 'Bonus event triggered');

      return {
        triggered: true,
        eventType: eventType.code,
        creditsAwarded: credits,
        eventId,
        message: `${eventType.name}! +${credits} credits`,
      };
    }

    return { triggered: false };
  },

  /**
   * Check for rep bonus (called per rep)
   */
  async checkRepBonus(userId: string, workoutId: string, repNumber: number): Promise<BonusEventResult> {
    return this.checkAndTrigger(userId, 'rep', `${workoutId}:rep:${repNumber}`);
  },

  /**
   * Check for set bonus (called per set)
   */
  async checkSetBonus(userId: string, workoutId: string, setNumber: number): Promise<BonusEventResult> {
    return this.checkAndTrigger(userId, 'set', `${workoutId}:set:${setNumber}`);
  },

  /**
   * Check for workout bonus (called on workout complete)
   */
  async checkWorkoutBonus(userId: string, workoutId: string): Promise<BonusEventResult> {
    return this.checkAndTrigger(userId, 'workout', workoutId);
  },

  /**
   * Check for daily login bonus
   */
  async checkDailyLoginBonus(userId: string): Promise<BonusEventResult> {
    return this.checkAndTrigger(userId, 'daily_login', `login-${new Date().toISOString().split('T')[0]}`);
  },

  /**
   * Check for early bird workout bonus (before 6 AM)
   */
  async checkEarlyBirdBonus(userId: string, workoutId: string): Promise<BonusEventResult> {
    const hour = new Date().getHours();
    if (hour >= 6) return { triggered: false };
    return this.checkAndTrigger(userId, 'early_workout', workoutId);
  },

  /**
   * Check for night owl workout bonus (after 10 PM)
   */
  async checkNightOwlBonus(userId: string, workoutId: string): Promise<BonusEventResult> {
    const hour = new Date().getHours();
    if (hour < 22) return { triggered: false };
    return this.checkAndTrigger(userId, 'late_workout', workoutId);
  },

  /**
   * Check for weekend workout bonus
   */
  async checkWeekendBonus(userId: string, workoutId: string): Promise<BonusEventResult> {
    const day = new Date().getDay();
    if (day !== 0 && day !== 6) return { triggered: false };
    return this.checkAndTrigger(userId, 'weekend_workout', workoutId);
  },

  /**
   * Check for comeback bonus (returning after 3+ days)
   */
  async checkComebackBonus(userId: string): Promise<BonusEventResult> {
    // Check last activity
    const lastActivity = await queryOne<{ last_active_at: Date }>(
      `SELECT GREATEST(
         (SELECT MAX(created_at) FROM workouts WHERE user_id = $1),
         (SELECT MAX(created_at) FROM credit_ledger WHERE user_id = $1)
       ) as last_active_at`,
      [userId]
    );

    if (!lastActivity?.last_active_at) {
      return { triggered: false };
    }

    const daysSinceActive = (Date.now() - lastActivity.last_active_at.getTime()) / (1000 * 60 * 60 * 24);
    if (daysSinceActive < 3) {
      return { triggered: false };
    }

    return this.checkAndTrigger(userId, 'comeback', `comeback-${new Date().toISOString().split('T')[0]}`);
  },

  /**
   * Get today's bonus event count for a user
   */
  async getTodayCount(userId: string, eventTypeCode: string): Promise<number> {
    const result = await queryOne<{ count: string }>(
      `SELECT COUNT(*) as count FROM user_bonus_events
       WHERE user_id = $1 AND event_type_code = $2 AND created_at >= CURRENT_DATE`,
      [userId, eventTypeCode]
    );
    return parseInt(result?.count || '0');
  },

  /**
   * Get user's bonus event history
   */
  async getUserBonusHistory(
    userId: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<{
    id: string;
    eventType: string;
    creditsAwarded: number;
    createdAt: Date;
  }[]> {
    const rows = await queryAll<{
      id: string;
      event_type_code: string;
      credits_awarded: number;
      created_at: Date;
    }>(
      `SELECT id, event_type_code, credits_awarded, created_at
       FROM user_bonus_events
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT $2 OFFSET $3`,
      [userId, limit, offset]
    );

    return rows.map(r => ({
      id: r.id,
      eventType: r.event_type_code,
      creditsAwarded: r.credits_awarded,
      createdAt: r.created_at,
    }));
  },

  /**
   * Calculate random reward between min and max
   * Uses weighted distribution favoring lower values
   */
  calculateReward(min: number, max: number): number {
    if (min === max) return min;

    // Use exponential distribution for more low rewards, fewer high rewards
    const range = max - min;
    const random = Math.random();

    // 70% chance of lower half, 25% middle, 5% top
    let reward: number;
    if (random < 0.7) {
      reward = min + Math.floor(range * 0.5 * Math.random());
    } else if (random < 0.95) {
      reward = min + Math.floor(range * 0.5) + Math.floor(range * 0.3 * Math.random());
    } else {
      reward = min + Math.floor(range * 0.8) + Math.floor(range * 0.2 * Math.random());
    }

    return Math.max(min, Math.min(max, reward));
  },

  /**
   * Process all workout-related bonuses
   */
  async processWorkoutBonuses(
    userId: string,
    workoutId: string,
    _totalReps: number,
    _totalSets: number
  ): Promise<BonusEventResult[]> {
    const results: BonusEventResult[] = [];

    // Check workout jackpot (once per workout)
    const workoutBonus = await this.checkWorkoutBonus(userId, workoutId);
    if (workoutBonus.triggered) {
      results.push(workoutBonus);
    }

    // Check time-based bonuses
    const earlyBird = await this.checkEarlyBirdBonus(userId, workoutId);
    if (earlyBird.triggered) {
      results.push(earlyBird);
    }

    const nightOwl = await this.checkNightOwlBonus(userId, workoutId);
    if (nightOwl.triggered) {
      results.push(nightOwl);
    }

    const weekend = await this.checkWeekendBonus(userId, workoutId);
    if (weekend.triggered) {
      results.push(weekend);
    }

    return results;
  },
};

export default bonusEventsService;
