/**
 * Achievements Module
 *
 * Handles achievement tracking, earning, and display:
 * - Personal records (PR)
 * - Hangout records
 * - Global records
 * - Streak achievements
 * - Milestone achievements (workout count, etc.)
 * - Social achievements (hangout memberships)
 * - Top rank achievements
 */

import crypto from 'crypto';
import { queryOne, queryAll, query, transaction } from '../../db/client';
import { ValidationError, NotFoundError } from '../../lib/errors';
import { loggers } from '../../lib/logger';
import { earningService } from '../economy/earning.service';

const log = loggers.core;

// Achievement categories
export const ACHIEVEMENT_CATEGORIES = {
  RECORD: 'record',
  STREAK: 'streak',
  FIRST_TIME: 'first_time',
  TOP_RANK: 'top_rank',
  MILESTONE: 'milestone',
  SOCIAL: 'social',
  SPECIAL: 'special',
} as const;

export type AchievementCategory = (typeof ACHIEVEMENT_CATEGORIES)[keyof typeof ACHIEVEMENT_CATEGORIES];

// Achievement rarities
export const ACHIEVEMENT_RARITIES = {
  COMMON: 'common',
  UNCOMMON: 'uncommon',
  RARE: 'rare',
  EPIC: 'epic',
  LEGENDARY: 'legendary',
} as const;

export type AchievementRarity = (typeof ACHIEVEMENT_RARITIES)[keyof typeof ACHIEVEMENT_RARITIES];

// Types
export interface AchievementDefinition {
  id: string;
  key: string;
  name: string;
  description?: string;
  icon?: string;
  category: AchievementCategory;
  points: number;
  rarity: AchievementRarity;
  enabled: boolean;
}

export interface AchievementEvent {
  id: string;
  userId: string;
  achievementId: string;
  achievementKey: string;
  achievementName: string;
  achievementDescription?: string;
  achievementIcon?: string;
  category: AchievementCategory;
  points: number;
  rarity: AchievementRarity;
  hangoutId?: number;
  virtualHangoutId?: number;
  exerciseId?: string;
  metricKey?: string;
  value?: number;
  showInHangoutFeed: boolean;
  showOnProfile: boolean;
  earnedAt: Date;
}

export interface UserAchievementSummary {
  totalPoints: number;
  totalAchievements: number;
  byCategory: Record<AchievementCategory, number>;
  byRarity: Record<AchievementRarity, number>;
  recentAchievements: AchievementEvent[];
}

// Service
export const achievementService = {
  /**
   * Get all achievement definitions
   */
  async getDefinitions(options: { category?: AchievementCategory; enabledOnly?: boolean } = {}): Promise<AchievementDefinition[]> {
    const { category, enabledOnly = true } = options;

    let whereClause = enabledOnly ? 'enabled = TRUE' : '1=1';
    const params: unknown[] = [];

    if (category) {
      whereClause += ` AND category = $${params.length + 1}`;
      params.push(category);
    }

    const rows = await queryAll<{
      id: string;
      key: string;
      name: string;
      description: string | null;
      icon: string | null;
      category: string;
      points: number;
      rarity: string;
      enabled: boolean;
    }>(`SELECT * FROM achievement_definitions WHERE ${whereClause} ORDER BY category, points DESC`, params);

    return rows.map((r) => ({
      id: r.id,
      key: r.key,
      name: r.name,
      description: r.description ?? undefined,
      icon: r.icon ?? undefined,
      category: r.category as AchievementCategory,
      points: r.points,
      rarity: r.rarity as AchievementRarity,
      enabled: r.enabled,
    }));
  },

  /**
   * Get a specific achievement definition by key
   */
  async getDefinitionByKey(key: string): Promise<AchievementDefinition | null> {
    const row = await queryOne<{
      id: string;
      key: string;
      name: string;
      description: string | null;
      icon: string | null;
      category: string;
      points: number;
      rarity: string;
      enabled: boolean;
    }>('SELECT * FROM achievement_definitions WHERE key = $1', [key]);

    if (!row) return null;

    return {
      id: row.id,
      key: row.key,
      name: row.name,
      description: row.description ?? undefined,
      icon: row.icon ?? undefined,
      category: row.category as AchievementCategory,
      points: row.points,
      rarity: row.rarity as AchievementRarity,
      enabled: row.enabled,
    };
  },

  /**
   * Grant an achievement to a user
   */
  async grant(params: {
    userId: string;
    achievementKey: string;
    hangoutId?: number;
    virtualHangoutId?: number;
    exerciseId?: string;
    metricKey?: string;
    value?: number;
    showInHangoutFeed?: boolean;
    showOnProfile?: boolean;
  }): Promise<AchievementEvent | null> {
    const {
      userId,
      achievementKey,
      hangoutId,
      virtualHangoutId,
      exerciseId,
      metricKey,
      value,
      showInHangoutFeed = true,
      showOnProfile = true,
    } = params;

    // Get achievement definition
    const definition = await this.getDefinitionByKey(achievementKey);
    if (!definition || !definition.enabled) {
      log.warn({ achievementKey }, 'Attempted to grant non-existent or disabled achievement');
      return null;
    }

    // Check if user already has this achievement (with same context)
    const existing = await queryOne<{ id: string }>(
      `SELECT id FROM achievement_events
       WHERE user_id = $1 AND achievement_id = $2
         AND COALESCE(hangout_id::text, 'null') = COALESCE($3::text, 'null')
         AND COALESCE(virtual_hangout_id::text, 'null') = COALESCE($4::text, 'null')
         AND COALESCE(exercise_id, 'null') = COALESCE($5, 'null')`,
      [userId, definition.id, hangoutId, virtualHangoutId, exerciseId]
    );

    if (existing) {
      log.debug({ userId, achievementKey }, 'User already has this achievement');
      return null;
    }

    // Grant the achievement
    const eventId = `ae_${crypto.randomBytes(12).toString('hex')}`;

    await transaction(async (client) => {
      // Insert achievement event
      await client.query(
        `INSERT INTO achievement_events
         (id, user_id, achievement_id, hangout_id, virtual_hangout_id, exercise_id, metric_key, value, show_in_hangout_feed, show_on_profile)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [eventId, userId, definition.id, hangoutId, virtualHangoutId, exerciseId, metricKey, value, showInHangoutFeed, showOnProfile]
      );

      // Update user's total points
      await client.query(
        `UPDATE users SET achievement_points = COALESCE(achievement_points, 0) + $1 WHERE id = $2`,
        [definition.points, userId]
      );
    });

    log.info({ userId, achievementKey, points: definition.points }, 'Achievement granted');

    // Award credits for achievement (non-blocking)
    try {
      await earningService.processEarning({
        userId,
        ruleCode: 'achievement_unlock',
        sourceType: 'achievement',
        sourceId: definition.key,
        metadata: {
          achievementKey: definition.key,
          category: definition.category,
          rarity: definition.rarity,
          points: definition.points,
        },
      });
    } catch (earningError) {
      log.error({ earningError, userId, achievementKey }, 'Failed to process achievement earning');
    }

    return {
      id: eventId,
      userId,
      achievementId: definition.id,
      achievementKey: definition.key,
      achievementName: definition.name,
      achievementDescription: definition.description,
      achievementIcon: definition.icon,
      category: definition.category,
      points: definition.points,
      rarity: definition.rarity,
      hangoutId,
      virtualHangoutId,
      exerciseId,
      metricKey,
      value,
      showInHangoutFeed,
      showOnProfile,
      earnedAt: new Date(),
    };
  },

  /**
   * Check and grant streak achievements
   */
  async checkStreakAchievements(userId: string): Promise<AchievementEvent[]> {
    const granted: AchievementEvent[] = [];

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
      { days: 7, key: 'streak_7' },
      { days: 30, key: 'streak_30' },
      { days: 100, key: 'streak_100' },
    ];

    for (const milestone of streakMilestones) {
      if (currentStreak >= milestone.days) {
        const event = await this.grant({
          userId,
          achievementKey: milestone.key,
          value: currentStreak,
        });
        if (event) granted.push(event);
      }
    }

    return granted;
  },

  /**
   * Check and grant workout milestone achievements
   */
  async checkWorkoutMilestones(userId: string): Promise<AchievementEvent[]> {
    const granted: AchievementEvent[] = [];

    const countResult = await queryOne<{ count: string }>(
      'SELECT COUNT(*) as count FROM workouts WHERE user_id = $1',
      [userId]
    );
    const workoutCount = parseInt(countResult?.count || '0');

    const milestones = [
      { count: 10, key: 'workouts_10' },
      { count: 100, key: 'workouts_100' },
      { count: 500, key: 'workouts_500' },
      { count: 1000, key: 'workouts_1000' },
    ];

    for (const milestone of milestones) {
      if (workoutCount >= milestone.count) {
        const event = await this.grant({
          userId,
          achievementKey: milestone.key,
          value: workoutCount,
        });
        if (event) granted.push(event);
      }
    }

    return granted;
  },

  /**
   * Check and grant social achievements (hangout memberships)
   */
  async checkSocialAchievements(userId: string): Promise<AchievementEvent[]> {
    const granted: AchievementEvent[] = [];

    // Count hangout memberships
    const hangoutCount = await queryOne<{ count: string }>(
      `SELECT COUNT(*) as count FROM hangout_memberships WHERE user_id = $1`,
      [userId]
    );

    const virtualCount = await queryOne<{ count: string }>(
      `SELECT COUNT(*) as count FROM virtual_hangout_memberships WHERE user_id = $1`,
      [userId]
    );

    const totalMemberships = parseInt(hangoutCount?.count || '0') + parseInt(virtualCount?.count || '0');

    // First hangout join
    if (totalMemberships >= 1) {
      const event = await this.grant({ userId, achievementKey: 'first_hangout_join' });
      if (event) granted.push(event);
    }

    // Social milestones
    const milestones = [
      { count: 5, key: 'hangouts_5' },
      { count: 10, key: 'hangouts_10' },
    ];

    for (const milestone of milestones) {
      if (totalMemberships >= milestone.count) {
        const event = await this.grant({
          userId,
          achievementKey: milestone.key,
          value: totalMemberships,
        });
        if (event) granted.push(event);
      }
    }

    return granted;
  },

  /**
   * Check and grant top rank achievements
   */
  async checkTopRankAchievements(
    userId: string,
    rank: number,
    hangoutId?: number,
    virtualHangoutId?: number,
    exerciseId?: string,
    metricKey?: string
  ): Promise<AchievementEvent[]> {
    const granted: AchievementEvent[] = [];

    if (rank === 1) {
      const event = await this.grant({
        userId,
        achievementKey: 'number_one',
        hangoutId,
        virtualHangoutId,
        exerciseId,
        metricKey,
        value: rank,
      });
      if (event) granted.push(event);
    }

    if (rank <= 3) {
      const event = await this.grant({
        userId,
        achievementKey: 'top_3_entry',
        hangoutId,
        virtualHangoutId,
        exerciseId,
        metricKey,
        value: rank,
      });
      if (event) granted.push(event);
    }

    if (rank <= 10) {
      const event = await this.grant({
        userId,
        achievementKey: 'top_10_entry',
        hangoutId,
        virtualHangoutId,
        exerciseId,
        metricKey,
        value: rank,
      });
      if (event) granted.push(event);
    }

    return granted;
  },

  /**
   * Check and grant record achievements
   */
  async checkRecordAchievements(
    userId: string,
    isPersonalRecord: boolean,
    isHangoutRecord: boolean,
    isGlobalRecord: boolean,
    hangoutId?: number,
    virtualHangoutId?: number,
    exerciseId?: string,
    metricKey?: string,
    value?: number
  ): Promise<AchievementEvent[]> {
    const granted: AchievementEvent[] = [];

    if (isPersonalRecord) {
      const event = await this.grant({
        userId,
        achievementKey: 'personal_record',
        hangoutId,
        virtualHangoutId,
        exerciseId,
        metricKey,
        value,
      });
      if (event) granted.push(event);
    }

    if (isHangoutRecord && (hangoutId || virtualHangoutId)) {
      const event = await this.grant({
        userId,
        achievementKey: 'hangout_record',
        hangoutId,
        virtualHangoutId,
        exerciseId,
        metricKey,
        value,
      });
      if (event) granted.push(event);
    }

    if (isGlobalRecord) {
      const event = await this.grant({
        userId,
        achievementKey: 'global_record',
        exerciseId,
        metricKey,
        value,
      });
      if (event) granted.push(event);
    }

    return granted;
  },

  /**
   * Get user's achievements
   */
  async getUserAchievements(
    userId: string,
    options: { limit?: number; offset?: number; category?: AchievementCategory } = {}
  ): Promise<{ achievements: AchievementEvent[]; total: number }> {
    const { limit = 50, offset = 0, category } = options;

    let whereClause = 'ae.user_id = $1';
    const params: unknown[] = [userId];

    if (category) {
      whereClause += ` AND ad.category = $${params.length + 1}`;
      params.push(category);
    }

    const rows = await queryAll<{
      id: string;
      user_id: string;
      achievement_id: string;
      key: string;
      name: string;
      description: string | null;
      icon: string | null;
      category: string;
      points: number;
      rarity: string;
      hangout_id: number | null;
      virtual_hangout_id: number | null;
      exercise_id: string | null;
      metric_key: string | null;
      value: string | null;
      show_in_hangout_feed: boolean;
      show_on_profile: boolean;
      earned_at: Date;
    }>(
      `SELECT ae.*, ad.key, ad.name, ad.description, ad.icon, ad.category, ad.points, ad.rarity
       FROM achievement_events ae
       JOIN achievement_definitions ad ON ad.id = ae.achievement_id
       WHERE ${whereClause}
       ORDER BY ae.earned_at DESC
       LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, limit, offset]
    );

    const countResult = await queryOne<{ count: string }>(
      `SELECT COUNT(*) as count FROM achievement_events ae
       JOIN achievement_definitions ad ON ad.id = ae.achievement_id
       WHERE ${whereClause}`,
      params
    );

    return {
      achievements: rows.map((r) => ({
        id: r.id,
        userId: r.user_id,
        achievementId: r.achievement_id,
        achievementKey: r.key,
        achievementName: r.name,
        achievementDescription: r.description ?? undefined,
        achievementIcon: r.icon ?? undefined,
        category: r.category as AchievementCategory,
        points: r.points,
        rarity: r.rarity as AchievementRarity,
        hangoutId: r.hangout_id ?? undefined,
        virtualHangoutId: r.virtual_hangout_id ?? undefined,
        exerciseId: r.exercise_id ?? undefined,
        metricKey: r.metric_key ?? undefined,
        value: r.value ? parseFloat(r.value) : undefined,
        showInHangoutFeed: r.show_in_hangout_feed,
        showOnProfile: r.show_on_profile,
        earnedAt: r.earned_at,
      })),
      total: parseInt(countResult?.count || '0'),
    };
  },

  /**
   * Get user's achievement summary
   */
  async getUserSummary(userId: string): Promise<UserAchievementSummary> {
    // Get total points
    const pointsResult = await queryOne<{ points: string }>(
      'SELECT COALESCE(achievement_points, 0) as points FROM users WHERE id = $1',
      [userId]
    );

    // Get counts by category and rarity
    const stats = await queryAll<{
      category: string;
      rarity: string;
      count: string;
    }>(
      `SELECT ad.category, ad.rarity, COUNT(*) as count
       FROM achievement_events ae
       JOIN achievement_definitions ad ON ad.id = ae.achievement_id
       WHERE ae.user_id = $1
       GROUP BY ad.category, ad.rarity`,
      [userId]
    );

    // Initialize counts
    const byCategory: Record<AchievementCategory, number> = {
      record: 0,
      streak: 0,
      first_time: 0,
      top_rank: 0,
      milestone: 0,
      social: 0,
      special: 0,
    };

    const byRarity: Record<AchievementRarity, number> = {
      common: 0,
      uncommon: 0,
      rare: 0,
      epic: 0,
      legendary: 0,
    };

    let totalAchievements = 0;

    for (const stat of stats) {
      const count = parseInt(stat.count);
      totalAchievements += count;

      if (stat.category in byCategory) {
        byCategory[stat.category as AchievementCategory] += count;
      }
      if (stat.rarity in byRarity) {
        byRarity[stat.rarity as AchievementRarity] += count;
      }
    }

    // Get recent achievements
    const { achievements: recentAchievements } = await this.getUserAchievements(userId, { limit: 5 });

    return {
      totalPoints: parseInt(pointsResult?.points || '0'),
      totalAchievements,
      byCategory,
      byRarity,
      recentAchievements,
    };
  },

  /**
   * Get achievement feed for a hangout
   */
  async getHangoutFeed(
    hangoutId: number,
    options: { limit?: number; offset?: number } = {}
  ): Promise<{ achievements: AchievementEvent[]; total: number }> {
    const { limit = 20, offset = 0 } = options;

    const rows = await queryAll<{
      id: string;
      user_id: string;
      username: string;
      achievement_id: string;
      key: string;
      name: string;
      description: string | null;
      icon: string | null;
      category: string;
      points: number;
      rarity: string;
      hangout_id: number | null;
      virtual_hangout_id: number | null;
      exercise_id: string | null;
      metric_key: string | null;
      value: string | null;
      show_in_hangout_feed: boolean;
      show_on_profile: boolean;
      earned_at: Date;
    }>(
      `SELECT ae.*, ad.key, ad.name, ad.description, ad.icon, ad.category, ad.points, ad.rarity, u.username
       FROM achievement_events ae
       JOIN achievement_definitions ad ON ad.id = ae.achievement_id
       JOIN users u ON u.id = ae.user_id
       WHERE ae.hangout_id = $1 AND ae.show_in_hangout_feed = TRUE
       ORDER BY ae.earned_at DESC
       LIMIT $2 OFFSET $3`,
      [hangoutId, limit, offset]
    );

    const countResult = await queryOne<{ count: string }>(
      `SELECT COUNT(*) as count FROM achievement_events
       WHERE hangout_id = $1 AND show_in_hangout_feed = TRUE`,
      [hangoutId]
    );

    return {
      achievements: rows.map((r) => ({
        id: r.id,
        userId: r.user_id,
        achievementId: r.achievement_id,
        achievementKey: r.key,
        achievementName: r.name,
        achievementDescription: r.description ?? undefined,
        achievementIcon: r.icon ?? undefined,
        category: r.category as AchievementCategory,
        points: r.points,
        rarity: r.rarity as AchievementRarity,
        hangoutId: r.hangout_id ?? undefined,
        virtualHangoutId: r.virtual_hangout_id ?? undefined,
        exerciseId: r.exercise_id ?? undefined,
        metricKey: r.metric_key ?? undefined,
        value: r.value ? parseFloat(r.value) : undefined,
        showInHangoutFeed: r.show_in_hangout_feed,
        showOnProfile: r.show_on_profile,
        earnedAt: r.earned_at,
      })),
      total: parseInt(countResult?.count || '0'),
    };
  },

  /**
   * Run all achievement checks after a workout
   */
  async checkAllAfterWorkout(userId: string): Promise<AchievementEvent[]> {
    const granted: AchievementEvent[] = [];

    // Check streak achievements
    const streakAchievements = await this.checkStreakAchievements(userId);
    granted.push(...streakAchievements);

    // Check workout milestones
    const milestoneAchievements = await this.checkWorkoutMilestones(userId);
    granted.push(...milestoneAchievements);

    return granted;
  },
};

export default achievementService;
