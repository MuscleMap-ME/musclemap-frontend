/**
 * Credit Earn Events Service
 *
 * Handles real-time credit earning visibility:
 * - Creates earn events for UI display/animation
 * - Supports different animation types based on amount
 * - Provides streaming endpoint for real-time updates
 * - Manages event cleanup for old events
 *
 * Every credit earn should feel like a reward!
 */

import crypto from 'crypto';
import { queryOne, queryAll, query } from '../../db/client';
import { loggers } from '../../lib/logger';
import { getRedis } from '../../lib/redis';

const log = loggers.economy;

// Animation thresholds
const ANIMATION_THRESHOLDS = {
  small: { max: 10, type: 'small', icon: 'coins', color: '#FFD700' },
  medium: { max: 50, type: 'medium', icon: 'wallet', color: '#FFA500' },
  large: { max: 100, type: 'large', icon: 'zap', color: '#9966CC' },
  huge: { max: Infinity, type: 'celebration', icon: 'trophy', color: '#B9F2FF' },
};

// Source display names and icons
const SOURCE_DISPLAY: Record<string, { name: string; icon: string; color: string }> = {
  'workout_complete': { name: 'Workout Complete', icon: 'dumbbell', color: '#22C55E' },
  'rep_complete': { name: 'Reps', icon: 'repeat', color: '#3B82F6' },
  'set_complete': { name: 'Set Complete', icon: 'check-circle', color: '#3B82F6' },
  'pr_set': { name: 'New PR!', icon: 'trophy', color: '#FFD700' },
  'streak_3': { name: '3-Day Streak', icon: 'flame', color: '#F97316' },
  'streak_7': { name: '7-Day Streak', icon: 'flame', color: '#EF4444' },
  'streak_14': { name: '14-Day Streak', icon: 'flame', color: '#DC2626' },
  'streak_30': { name: '30-Day Streak', icon: 'flame', color: '#B91C1C' },
  'streak_60': { name: '60-Day Streak', icon: 'flame', color: '#991B1B' },
  'streak_100': { name: '100-Day Streak', icon: 'award', color: '#9966CC' },
  'streak_180': { name: '180-Day Streak', icon: 'award', color: '#6366F1' },
  'streak_365': { name: '365-Day Streak', icon: 'crown', color: '#B9F2FF' },
  'goal_25_percent': { name: '25% Goal Progress', icon: 'target', color: '#22C55E' },
  'goal_50_percent': { name: '50% Goal Progress', icon: 'target', color: '#16A34A' },
  'goal_75_percent': { name: '75% Goal Progress', icon: 'target', color: '#15803D' },
  'goal_complete_easy': { name: 'Goal Complete', icon: 'check-circle', color: '#22C55E' },
  'goal_complete_medium': { name: 'Goal Complete', icon: 'check-circle', color: '#16A34A' },
  'goal_complete_hard': { name: 'Goal Complete', icon: 'trophy', color: '#15803D' },
  'leaderboard_1st': { name: '1st Place!', icon: 'medal', color: '#FFD700' },
  'leaderboard_2nd': { name: '2nd Place', icon: 'medal', color: '#C0C0C0' },
  'leaderboard_3rd': { name: '3rd Place', icon: 'medal', color: '#CD7F32' },
  'leaderboard_top10': { name: 'Top 10', icon: 'trending-up', color: '#3B82F6' },
  'high_five_receive': { name: 'High Five Received', icon: 'hand', color: '#F97316' },
  'daily_login': { name: 'Daily Login', icon: 'calendar', color: '#3B82F6' },
  'early_bird_workout': { name: 'Early Bird', icon: 'sunrise', color: '#FFA500' },
  'night_owl_workout': { name: 'Night Owl', icon: 'moon', color: '#4169E1' },
  'weekend_workout': { name: 'Weekend Warrior', icon: 'calendar', color: '#32CD32' },
  'comeback_bonus': { name: 'Welcome Back!', icon: 'refresh-cw', color: '#20B2AA' },
  'lucky_rep': { name: 'Lucky Rep!', icon: 'star', color: '#FFD700' },
  'golden_set': { name: 'Golden Set!', icon: 'zap', color: '#FFD700' },
  'jackpot_workout': { name: 'Jackpot!', icon: 'gift', color: '#9966CC' },
  'mystery_box': { name: 'Mystery Box', icon: 'box', color: '#FF6B6B' },
  'referral_signup': { name: 'Referral Bonus', icon: 'users', color: '#22C55E' },
  'volume_5000': { name: 'Volume Bonus', icon: 'trending-up', color: '#3B82F6' },
  'volume_10000': { name: 'Volume Bonus', icon: 'trending-up', color: '#6366F1' },
  'purchase': { name: 'Credits Purchased', icon: 'credit-card', color: '#22C55E' },
  'tip_received': { name: 'Tip Received', icon: 'heart', color: '#EC4899' },
  'gift_received': { name: 'Gift Received', icon: 'gift', color: '#EC4899' },
};

export interface EarnEvent {
  id: string;
  userId: string;
  amount: number;
  source: string;
  sourceId?: string;
  description?: string;
  animationType: string;
  icon: string;
  color: string;
  shown: boolean;
  createdAt: Date;
}

export interface CreateEarnEventParams {
  userId: string;
  amount: number;
  source: string;
  sourceId?: string;
  description?: string;
  // Override automatic animation selection
  forceAnimationType?: string;
  forceIcon?: string;
  forceColor?: string;
}

export const earnEventsService = {
  /**
   * Create a credit earn event for real-time display
   */
  async createEvent(params: CreateEarnEventParams): Promise<EarnEvent> {
    const { userId, amount, source, sourceId, description } = params;

    // Determine animation type based on amount
    let animationType = 'normal';
    let icon = 'coins';
    let color = '#FFD700';

    if (params.forceAnimationType) {
      animationType = params.forceAnimationType;
    } else {
      for (const [_, threshold] of Object.entries(ANIMATION_THRESHOLDS)) {
        if (amount <= threshold.max) {
          animationType = threshold.type;
          icon = threshold.icon;
          color = threshold.color;
          break;
        }
      }
    }

    // Override with source-specific display if available
    const sourceDisplay = SOURCE_DISPLAY[source];
    if (sourceDisplay) {
      icon = params.forceIcon || sourceDisplay.icon;
      color = params.forceColor || sourceDisplay.color;
    }

    const id = `evt_${crypto.randomBytes(12).toString('hex')}`;

    await query(
      `INSERT INTO credit_earn_events (id, user_id, amount, source, source_id, description, animation_type, icon, color)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [id, userId, amount, source, sourceId || null, description || null, animationType, icon, color]
    );

    const event: EarnEvent = {
      id,
      userId,
      amount,
      source,
      sourceId,
      description,
      animationType,
      icon,
      color,
      shown: false,
      createdAt: new Date(),
    };

    // Publish to Redis for real-time streaming
    const redis = getRedis();
    if (redis) {
      try {
        await redis.publish(`earn-events:${userId}`, JSON.stringify(event));
      } catch (e) {
        log.debug({ error: e }, 'Failed to publish earn event to Redis');
      }
    }

    log.debug({ id, userId, amount, source }, 'Earn event created');

    return event;
  },

  /**
   * Get unseen earn events for a user
   */
  async getUnseenEvents(userId: string, limit: number = 50): Promise<EarnEvent[]> {
    const rows = await queryAll<{
      id: string;
      user_id: string;
      amount: number;
      source: string;
      source_id: string | null;
      description: string | null;
      animation_type: string;
      icon: string | null;
      color: string | null;
      shown: boolean;
      created_at: Date;
    }>(
      `SELECT * FROM credit_earn_events
       WHERE user_id = $1 AND shown = false
       ORDER BY created_at DESC
       LIMIT $2`,
      [userId, limit]
    );

    return rows.map(r => ({
      id: r.id,
      userId: r.user_id,
      amount: r.amount,
      source: r.source,
      sourceId: r.source_id || undefined,
      description: r.description || undefined,
      animationType: r.animation_type,
      icon: r.icon || 'coins',
      color: r.color || '#FFD700',
      shown: r.shown,
      createdAt: r.created_at,
    }));
  },

  /**
   * Get recent earn events (including seen)
   */
  async getRecentEvents(userId: string, limit: number = 20): Promise<EarnEvent[]> {
    const rows = await queryAll<{
      id: string;
      user_id: string;
      amount: number;
      source: string;
      source_id: string | null;
      description: string | null;
      animation_type: string;
      icon: string | null;
      color: string | null;
      shown: boolean;
      created_at: Date;
    }>(
      `SELECT * FROM credit_earn_events
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT $2`,
      [userId, limit]
    );

    return rows.map(r => ({
      id: r.id,
      userId: r.user_id,
      amount: r.amount,
      source: r.source,
      sourceId: r.source_id || undefined,
      description: r.description || undefined,
      animationType: r.animation_type,
      icon: r.icon || 'coins',
      color: r.color || '#FFD700',
      shown: r.shown,
      createdAt: r.created_at,
    }));
  },

  /**
   * Mark events as seen
   */
  async markEventsSeen(userId: string, eventIds?: string[]): Promise<number> {
    if (eventIds && eventIds.length > 0) {
      const result = await query(
        `UPDATE credit_earn_events SET shown = true
         WHERE user_id = $1 AND id = ANY($2) AND shown = false`,
        [userId, eventIds]
      );
      return result.rowCount || 0;
    } else {
      // Mark all unseen events as seen
      const result = await query(
        `UPDATE credit_earn_events SET shown = true
         WHERE user_id = $1 AND shown = false`,
        [userId]
      );
      return result.rowCount || 0;
    }
  },

  /**
   * Get today's earning summary for a user
   */
  async getTodaySummary(userId: string): Promise<{
    totalEarned: number;
    eventCount: number;
    bySource: Record<string, { amount: number; count: number }>;
  }> {
    const rows = await queryAll<{
      source: string;
      total_amount: string;
      event_count: string;
    }>(
      `SELECT source, SUM(amount) as total_amount, COUNT(*) as event_count
       FROM credit_earn_events
       WHERE user_id = $1 AND created_at >= CURRENT_DATE
       GROUP BY source`,
      [userId]
    );

    const bySource: Record<string, { amount: number; count: number }> = {};
    let totalEarned = 0;
    let eventCount = 0;

    for (const row of rows) {
      const amount = parseInt(row.total_amount);
      const count = parseInt(row.event_count);
      bySource[row.source] = { amount, count };
      totalEarned += amount;
      eventCount += count;
    }

    return { totalEarned, eventCount, bySource };
  },

  /**
   * Get this week's earning summary
   */
  async getWeekSummary(userId: string): Promise<{
    totalEarned: number;
    eventCount: number;
    dailyTotals: { date: string; amount: number }[];
  }> {
    const rows = await queryAll<{
      date: Date;
      total_amount: string;
    }>(
      `SELECT DATE(created_at) as date, SUM(amount) as total_amount
       FROM credit_earn_events
       WHERE user_id = $1 AND created_at >= DATE_TRUNC('week', CURRENT_DATE)
       GROUP BY DATE(created_at)
       ORDER BY date`,
      [userId]
    );

    const dailyTotals = rows.map(r => ({
      date: r.date.toISOString().split('T')[0],
      amount: parseInt(r.total_amount),
    }));

    const totalEarned = dailyTotals.reduce((sum, d) => sum + d.amount, 0);

    const eventCountResult = await queryOne<{ count: string }>(
      `SELECT COUNT(*) as count FROM credit_earn_events
       WHERE user_id = $1 AND created_at >= DATE_TRUNC('week', CURRENT_DATE)`,
      [userId]
    );

    return {
      totalEarned,
      eventCount: parseInt(eventCountResult?.count || '0'),
      dailyTotals,
    };
  },

  /**
   * Cleanup old events (for scheduled job)
   * Events older than 7 days are deleted
   */
  async cleanupOldEvents(): Promise<number> {
    const result = await query(
      `DELETE FROM credit_earn_events
       WHERE created_at < NOW() - INTERVAL '7 days'`
    );
    const count = result.rowCount || 0;
    if (count > 0) {
      log.info({ count }, 'Cleaned up old earn events');
    }
    return count;
  },

  /**
   * Get source display info
   */
  getSourceDisplay(source: string): { name: string; icon: string; color: string } {
    return SOURCE_DISPLAY[source] || { name: source, icon: 'coins', color: '#FFD700' };
  },
};

export default earnEventsService;
