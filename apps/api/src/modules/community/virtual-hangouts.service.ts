/**
 * Virtual Hangouts Service
 *
 * Manages themed virtual spaces tied to archetypes (not geo-located):
 * - Warrior's Cave: For powerlifters and strength athletes
 * - Hunter's Den: For tracking and outdoor fitness
 * - Runner's Camp: For runners and cardio enthusiasts
 * - Police Academy: For law enforcement fitness
 * - Fire Station: For firefighters
 * - Military Barracks: For military/veterans
 * - Yoga Garden: For flexibility and mindfulness
 * - CrossFit Box: For functional fitness
 */

import crypto from 'crypto';
import { queryOne, queryAll, query } from '../../db/client';
import { ValidationError, NotFoundError, ForbiddenError } from '../../lib/errors';
import { loggers } from '../../lib/logger';

const log = loggers.core;

// Membership role levels
export enum HangoutMemberRole {
  MEMBER = 0,
  MODERATOR = 1,
  ADMIN = 2,
}

// Theme slugs
export const HANGOUT_THEMES = {
  WARRIORS_CAVE: 'warriors-cave',
  HUNTERS_DEN: 'hunters-den',
  RUNNERS_CAMP: 'runners-camp',
  POLICE_ACADEMY: 'police-academy',
  FIRE_STATION: 'fire-station',
  MILITARY_BARRACKS: 'military-barracks',
  YOGA_GARDEN: 'yoga-garden',
  CROSSFIT_BOX: 'crossfit-box',
  SWIMMERS_COVE: 'swimmers-cove',
  CLIMBERS_PEAK: 'climbers-peak',
} as const;

export type HangoutThemeSlug = (typeof HANGOUT_THEMES)[keyof typeof HANGOUT_THEMES];

// Interfaces
export interface VirtualHangoutTheme {
  id: string;
  name: string;
  tagline?: string;
  description?: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  backgroundImageUrl?: string;
  iconUrl?: string;
  bannerUrl?: string;
  archetypeCategoryId?: string;
  goalTypes: string[];
  targetAudiences: string[];
  isActive: boolean;
}

export interface VirtualHangout {
  id: number;
  themeId: string;
  themeName: string;
  customName?: string;
  customDescription?: string;
  customBannerUrl?: string;
  primaryColor: string;
  accentColor: string;
  memberCount: number;
  activeMemberCount: number;
  postCount: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  // User-specific fields
  isMember?: boolean;
  userRole?: HangoutMemberRole;
  lastVisitedAt?: Date;
}

export interface HangoutMembership {
  userId: string;
  username: string;
  displayName?: string;
  avatarUrl?: string;
  role: HangoutMemberRole;
  joinedAt: Date;
  lastActiveAt?: Date;
  showInMemberList: boolean;
  receiveNotifications: boolean;
}

export interface HangoutActivity {
  id: string;
  hangoutId: number;
  userId?: string;
  username?: string;
  activityType: 'join' | 'leave' | 'post' | 'workout_shared' | 'achievement' | 'milestone';
  activityData: Record<string, any>;
  createdAt: Date;
}

// Service implementation
export const virtualHangoutsService = {
  /**
   * Get all hangout themes
   */
  async getThemes(): Promise<VirtualHangoutTheme[]> {
    const rows = await queryAll<{
      id: string;
      name: string;
      tagline: string | null;
      description: string | null;
      primary_color: string;
      secondary_color: string;
      accent_color: string;
      background_image_url: string | null;
      icon_url: string | null;
      banner_url: string | null;
      archetype_category_id: string | null;
      goal_types: string | null;
      target_audiences: string | null;
      is_active: boolean;
    }>(
      `SELECT id, name, tagline, description, primary_color, secondary_color, accent_color,
              background_image_url, icon_url, banner_url, archetype_category_id,
              goal_types, target_audiences, is_active
       FROM virtual_hangout_themes
       WHERE is_active = TRUE
       ORDER BY display_order, name`
    );

    return rows.map(r => ({
      id: r.id,
      name: r.name,
      tagline: r.tagline ?? undefined,
      description: r.description ?? undefined,
      primaryColor: r.primary_color,
      secondaryColor: r.secondary_color,
      accentColor: r.accent_color,
      backgroundImageUrl: r.background_image_url ?? undefined,
      iconUrl: r.icon_url ?? undefined,
      bannerUrl: r.banner_url ?? undefined,
      archetypeCategoryId: r.archetype_category_id ?? undefined,
      goalTypes: r.goal_types ? JSON.parse(r.goal_types) : [],
      targetAudiences: r.target_audiences ? JSON.parse(r.target_audiences) : [],
      isActive: r.is_active,
    }));
  },

  /**
   * Get all virtual hangouts (optionally filtered by theme)
   */
  async getHangouts(
    userId?: string,
    options: { themeId?: number; limit?: number; offset?: number } = {}
  ): Promise<{ hangouts: VirtualHangout[]; total: number }> {
    const { themeId, limit = 50, offset = 0 } = options;

    let whereClause = 'vh.is_active = TRUE';
    const params: any[] = [];
    let paramIndex = 1;

    if (themeId) {
      whereClause += ` AND vh.theme_id = $${paramIndex++}`;
      params.push(String(themeId));
    }

    // User membership join if user is authenticated
    const userJoin = userId
      ? `LEFT JOIN virtual_hangout_memberships vhm ON vhm.hangout_id = vh.id AND vhm.user_id = '${userId}'`
      : '';
    const userSelect = userId
      ? ', vhm.role as user_role, (vhm.user_id IS NOT NULL) as is_member, vhm.last_active_at as last_visited_at'
      : ', NULL as user_role, NULL as is_member, NULL as last_visited_at';

    const rows = await queryAll<{
      id: number;
      theme_id: string;
      theme_name: string;
      custom_name: string | null;
      custom_description: string | null;
      custom_banner_url: string | null;
      primary_color: string;
      accent_color: string;
      member_count: number;
      active_member_count: number;
      post_count: number;
      is_active: boolean;
      created_at: Date;
      updated_at: Date;
      user_role: number | null;
      is_member: boolean | null;
      last_visited_at: Date | null;
    }>(
      `SELECT
        vh.id, vh.theme_id, vht.name as theme_name,
        vh.custom_name, vh.custom_description, vh.custom_banner_url,
        vht.primary_color, vht.accent_color,
        vh.member_count, vh.active_member_count, vh.post_count,
        vh.is_active, vh.created_at, vh.updated_at
        ${userSelect}
       FROM virtual_hangouts vh
       JOIN virtual_hangout_themes vht ON vht.id = vh.theme_id
       ${userJoin}
       WHERE ${whereClause}
       ORDER BY vh.member_count DESC
       LIMIT $${paramIndex++} OFFSET $${paramIndex++}`,
      [...params, limit, offset]
    );

    const countResult = await queryOne<{ count: string }>(
      `SELECT COUNT(*) as count FROM virtual_hangouts vh WHERE ${whereClause}`,
      params
    );

    return {
      hangouts: rows.map(r => ({
        id: r.id,
        themeId: r.theme_id,
        themeName: r.theme_name,
        customName: r.custom_name ?? undefined,
        customDescription: r.custom_description ?? undefined,
        customBannerUrl: r.custom_banner_url ?? undefined,
        primaryColor: r.primary_color,
        accentColor: r.accent_color,
        memberCount: r.member_count,
        activeMemberCount: r.active_member_count,
        postCount: r.post_count,
        isActive: r.is_active,
        createdAt: r.created_at,
        updatedAt: r.updated_at,
        isMember: r.is_member ?? undefined,
        userRole: r.user_role as HangoutMemberRole | undefined,
        lastVisitedAt: r.last_visited_at ?? undefined,
      })),
      total: parseInt(countResult?.count || '0', 10),
    };
  },

  /**
   * Get a single hangout by ID
   */
  async getHangoutById(hangoutId: number, userId?: string): Promise<VirtualHangout | null> {
    const userJoin = userId
      ? `LEFT JOIN virtual_hangout_memberships vhm ON vhm.hangout_id = vh.id AND vhm.user_id = '${userId}'`
      : '';
    const userSelect = userId
      ? ', vhm.role as user_role, (vhm.user_id IS NOT NULL) as is_member, vhm.last_active_at as last_visited_at'
      : ', NULL as user_role, NULL as is_member, NULL as last_visited_at';

    const row = await queryOne<{
      id: number;
      theme_id: string;
      theme_name: string;
      custom_name: string | null;
      custom_description: string | null;
      custom_banner_url: string | null;
      primary_color: string;
      accent_color: string;
      member_count: number;
      active_member_count: number;
      post_count: number;
      is_active: boolean;
      created_at: Date;
      updated_at: Date;
      user_role: number | null;
      is_member: boolean | null;
      last_visited_at: Date | null;
    }>(
      `SELECT
        vh.id, vh.theme_id, vht.name as theme_name,
        vh.custom_name, vh.custom_description, vh.custom_banner_url,
        vht.primary_color, vht.accent_color,
        vh.member_count, vh.active_member_count, vh.post_count,
        vh.is_active, vh.created_at, vh.updated_at
        ${userSelect}
       FROM virtual_hangouts vh
       JOIN virtual_hangout_themes vht ON vht.id = vh.theme_id
       ${userJoin}
       WHERE vh.id = $1`,
      [hangoutId]
    );

    if (!row) return null;

    return {
      id: row.id,
      themeId: row.theme_id,
      themeName: row.theme_name,
      customName: row.custom_name ?? undefined,
      customDescription: row.custom_description ?? undefined,
      customBannerUrl: row.custom_banner_url ?? undefined,
      primaryColor: row.primary_color,
      accentColor: row.accent_color,
      memberCount: row.member_count,
      activeMemberCount: row.active_member_count,
      postCount: row.post_count,
      isActive: row.is_active,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      isMember: row.is_member ?? undefined,
      userRole: row.user_role as HangoutMemberRole | undefined,
      lastVisitedAt: row.last_visited_at ?? undefined,
    };
  },

  /**
   * Get hangouts for user's archetype/goals (recommended hangouts)
   */
  async getRecommendedHangouts(
    userId: string,
    options: { limit?: number } = {}
  ): Promise<VirtualHangout[]> {
    const { limit = 5 } = options;

    // Get user's archetype and goals
    const userProfile = await queryOne<{
      archetype_id: string | null;
      primary_goal: string | null;
    }>(
      'SELECT archetype_id, primary_goal FROM user_profiles WHERE user_id = $1',
      [userId]
    );

    if (!userProfile?.archetype_id && !userProfile?.primary_goal) {
      // No profile, return popular hangouts
      const { hangouts } = await this.getHangouts(userId, { limit });
      return hangouts;
    }

    // Find themes matching user's archetype/goals
    const themes = await queryAll<{ id: string }>(
      `SELECT id FROM virtual_hangout_themes
       WHERE is_active = TRUE
         AND (
           archetype_category_id = $1
           OR (goal_types::jsonb ? $2::text)
         )
       ORDER BY display_order
       LIMIT 10`,
      [userProfile.archetype_id || '', userProfile.primary_goal || '']
    );

    const themeIds = themes.map(t => t.id);

    if (themeIds.length === 0) {
      const { hangouts } = await this.getHangouts(userId, { limit });
      return hangouts;
    }

    // Get hangouts from matching themes that user hasn't joined
    const rows = await queryAll<{
      id: number;
      theme_id: string;
      theme_name: string;
      custom_name: string | null;
      custom_description: string | null;
      custom_banner_url: string | null;
      primary_color: string;
      accent_color: string;
      member_count: number;
      active_member_count: number;
      post_count: number;
      is_active: boolean;
      created_at: Date;
      updated_at: Date;
    }>(
      `SELECT
        vh.id, vh.theme_id, vht.name as theme_name,
        vh.custom_name, vh.custom_description, vh.custom_banner_url,
        vht.primary_color, vht.accent_color,
        vh.member_count, vh.active_member_count, vh.post_count,
        vh.is_active, vh.created_at, vh.updated_at
       FROM virtual_hangouts vh
       JOIN virtual_hangout_themes vht ON vht.id = vh.theme_id
       LEFT JOIN virtual_hangout_memberships vhm ON vhm.hangout_id = vh.id AND vhm.user_id = $1
       WHERE vh.theme_id = ANY($2) AND vh.is_active = TRUE AND vhm.user_id IS NULL
       ORDER BY vh.member_count DESC
       LIMIT $3`,
      [userId, themeIds, limit]
    );

    return rows.map(r => ({
      id: r.id,
      themeId: r.theme_id,
      themeName: r.theme_name,
      customName: r.custom_name ?? undefined,
      customDescription: r.custom_description ?? undefined,
      customBannerUrl: r.custom_banner_url ?? undefined,
      primaryColor: r.primary_color,
      accentColor: r.accent_color,
      memberCount: r.member_count,
      activeMemberCount: r.active_member_count,
      postCount: r.post_count,
      isActive: r.is_active,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
      isMember: false,
    }));
  },

  /**
   * Join a virtual hangout
   */
  async joinHangout(
    hangoutId: number,
    userId: string,
    options: { showInMemberList?: boolean; receiveNotifications?: boolean } = {}
  ): Promise<void> {
    const { showInMemberList = true, receiveNotifications = true } = options;

    // Check hangout exists and is active
    const hangout = await queryOne<{ id: number; is_active: boolean }>(
      'SELECT id, is_active FROM virtual_hangouts WHERE id = $1',
      [hangoutId]
    );

    if (!hangout) {
      throw new NotFoundError('Hangout not found');
    }

    if (!hangout.is_active) {
      throw new ValidationError('This hangout is not currently active');
    }

    // Check if already a member
    const existing = await queryOne<{ user_id: string }>(
      'SELECT user_id FROM virtual_hangout_memberships WHERE hangout_id = $1 AND user_id = $2',
      [hangoutId, userId]
    );

    if (existing) {
      throw new ValidationError('Already a member of this hangout');
    }

    // Join the hangout
    await query(
      `INSERT INTO virtual_hangout_memberships
       (hangout_id, user_id, role, show_in_member_list, receive_notifications, last_active_at)
       VALUES ($1, $2, $3, $4, $5, NOW())`,
      [hangoutId, userId, HangoutMemberRole.MEMBER, showInMemberList, receiveNotifications]
    );

    // Log activity
    await this.logActivity(hangoutId, userId, 'join', {});

    log.info({ hangoutId, userId }, 'User joined virtual hangout');
  },

  /**
   * Leave a virtual hangout
   */
  async leaveHangout(hangoutId: number, userId: string): Promise<void> {
    const membership = await queryOne<{ role: number }>(
      'SELECT role FROM virtual_hangout_memberships WHERE hangout_id = $1 AND user_id = $2',
      [hangoutId, userId]
    );

    if (!membership) {
      throw new NotFoundError('Not a member of this hangout');
    }

    await query(
      'DELETE FROM virtual_hangout_memberships WHERE hangout_id = $1 AND user_id = $2',
      [hangoutId, userId]
    );

    // Log activity
    await this.logActivity(hangoutId, userId, 'leave', {});

    log.info({ hangoutId, userId }, 'User left virtual hangout');
  },

  /**
   * Update membership settings
   */
  async updateMembershipSettings(
    hangoutId: number,
    userId: string,
    settings: { showInMemberList?: boolean; receiveNotifications?: boolean }
  ): Promise<void> {
    const updates: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    if (settings.showInMemberList !== undefined) {
      updates.push(`show_in_member_list = $${paramIndex++}`);
      params.push(settings.showInMemberList);
    }

    if (settings.receiveNotifications !== undefined) {
      updates.push(`receive_notifications = $${paramIndex++}`);
      params.push(settings.receiveNotifications);
    }

    if (updates.length === 0) return;

    params.push(hangoutId, userId);
    await query(
      `UPDATE virtual_hangout_memberships SET ${updates.join(', ')}
       WHERE hangout_id = $${paramIndex++} AND user_id = $${paramIndex++}`,
      params
    );
  },

  /**
   * Get hangout members
   */
  async getMembers(
    hangoutId: number,
    options: { limit?: number; offset?: number; visibleOnly?: boolean } = {}
  ): Promise<{ members: HangoutMembership[]; total: number }> {
    const { limit = 50, offset = 0, visibleOnly = true } = options;

    let whereClause = 'vhm.hangout_id = $1';
    if (visibleOnly) {
      whereClause += ' AND vhm.show_in_member_list = TRUE';
    }

    const rows = await queryAll<{
      user_id: string;
      username: string;
      display_name: string | null;
      avatar_url: string | null;
      role: number;
      joined_at: Date;
      last_active_at: Date | null;
      show_in_member_list: boolean;
      receive_notifications: boolean;
    }>(
      `SELECT
        vhm.user_id, u.username, u.display_name, u.avatar_url,
        vhm.role, vhm.joined_at, vhm.last_active_at,
        vhm.show_in_member_list, vhm.receive_notifications
       FROM virtual_hangout_memberships vhm
       JOIN users u ON u.id = vhm.user_id
       WHERE ${whereClause}
       ORDER BY vhm.role DESC, vhm.last_active_at DESC NULLS LAST
       LIMIT $2 OFFSET $3`,
      [hangoutId, limit, offset]
    );

    const countResult = await queryOne<{ count: string }>(
      `SELECT COUNT(*) as count FROM virtual_hangout_memberships vhm WHERE ${whereClause}`,
      [hangoutId]
    );

    return {
      members: rows.map(r => ({
        userId: r.user_id,
        username: r.username,
        displayName: r.display_name ?? undefined,
        avatarUrl: r.avatar_url ?? undefined,
        role: r.role as HangoutMemberRole,
        joinedAt: r.joined_at,
        lastActiveAt: r.last_active_at ?? undefined,
        showInMemberList: r.show_in_member_list,
        receiveNotifications: r.receive_notifications,
      })),
      total: parseInt(countResult?.count || '0', 10),
    };
  },

  /**
   * Get user's hangout memberships
   */
  async getUserHangouts(
    userId: string,
    options: { limit?: number; offset?: number } = {}
  ): Promise<{ hangouts: VirtualHangout[]; total: number }> {
    const { limit = 50, offset = 0 } = options;

    const rows = await queryAll<{
      id: number;
      theme_id: string;
      theme_name: string;
      custom_name: string | null;
      custom_description: string | null;
      custom_banner_url: string | null;
      primary_color: string;
      accent_color: string;
      member_count: number;
      active_member_count: number;
      post_count: number;
      is_active: boolean;
      created_at: Date;
      updated_at: Date;
      user_role: number;
      last_visited_at: Date | null;
    }>(
      `SELECT
        vh.id, vh.theme_id, vht.name as theme_name,
        vh.custom_name, vh.custom_description, vh.custom_banner_url,
        vht.primary_color, vht.accent_color,
        vh.member_count, vh.active_member_count, vh.post_count,
        vh.is_active, vh.created_at, vh.updated_at,
        vhm.role as user_role, vhm.last_active_at as last_visited_at
       FROM virtual_hangout_memberships vhm
       JOIN virtual_hangouts vh ON vh.id = vhm.hangout_id
       JOIN virtual_hangout_themes vht ON vht.id = vh.theme_id
       WHERE vhm.user_id = $1 AND vh.is_active = TRUE
       ORDER BY vhm.last_active_at DESC NULLS LAST
       LIMIT $2 OFFSET $3`,
      [userId, limit, offset]
    );

    const countResult = await queryOne<{ count: string }>(
      `SELECT COUNT(*) as count FROM virtual_hangout_memberships vhm
       JOIN virtual_hangouts vh ON vh.id = vhm.hangout_id
       WHERE vhm.user_id = $1 AND vh.is_active = TRUE`,
      [userId]
    );

    return {
      hangouts: rows.map(r => ({
        id: r.id,
        themeId: r.theme_id,
        themeName: r.theme_name,
        customName: r.custom_name ?? undefined,
        customDescription: r.custom_description ?? undefined,
        customBannerUrl: r.custom_banner_url ?? undefined,
        primaryColor: r.primary_color,
        accentColor: r.accent_color,
        memberCount: r.member_count,
        activeMemberCount: r.active_member_count,
        postCount: r.post_count,
        isActive: r.is_active,
        createdAt: r.created_at,
        updatedAt: r.updated_at,
        isMember: true,
        userRole: r.user_role as HangoutMemberRole,
        lastVisitedAt: r.last_visited_at ?? undefined,
      })),
      total: parseInt(countResult?.count || '0', 10),
    };
  },

  /**
   * Update user's last active time in a hangout
   */
  async updateLastActive(hangoutId: number, userId: string): Promise<void> {
    await query(
      'UPDATE virtual_hangout_memberships SET last_active_at = NOW() WHERE hangout_id = $1 AND user_id = $2',
      [hangoutId, userId]
    );
  },

  /**
   * Get recent activity in a hangout
   */
  async getActivity(
    hangoutId: number,
    options: { limit?: number; offset?: number } = {}
  ): Promise<HangoutActivity[]> {
    const { limit = 50, offset = 0 } = options;

    const rows = await queryAll<{
      id: string;
      hangout_id: number;
      user_id: string | null;
      username: string | null;
      activity_type: string;
      activity_data: string;
      created_at: Date;
    }>(
      `SELECT
        vha.id, vha.hangout_id, vha.user_id, u.username,
        vha.activity_type, vha.activity_data, vha.created_at
       FROM virtual_hangout_activity vha
       LEFT JOIN users u ON u.id = vha.user_id
       WHERE vha.hangout_id = $1
       ORDER BY vha.created_at DESC
       LIMIT $2 OFFSET $3`,
      [hangoutId, limit, offset]
    );

    return rows.map(r => ({
      id: r.id,
      hangoutId: r.hangout_id,
      userId: r.user_id ?? undefined,
      username: r.username ?? undefined,
      activityType: r.activity_type as HangoutActivity['activityType'],
      activityData: r.activity_data ? JSON.parse(r.activity_data) : {},
      createdAt: r.created_at,
    }));
  },

  /**
   * Log activity in a hangout
   */
  async logActivity(
    hangoutId: number,
    userId: string | null,
    activityType: HangoutActivity['activityType'],
    activityData: Record<string, any>
  ): Promise<void> {
    const activityId = `vha_${crypto.randomBytes(12).toString('hex')}`;

    await query(
      `INSERT INTO virtual_hangout_activity (id, hangout_id, user_id, activity_type, activity_data)
       VALUES ($1, $2, $3, $4, $5)`,
      [activityId, hangoutId, userId, activityType, JSON.stringify(activityData)]
    );
  },

  /**
   * Share a workout to a hangout
   */
  async shareWorkout(
    hangoutId: number,
    userId: string,
    workoutId: string,
    message?: string
  ): Promise<void> {
    // Verify membership
    const membership = await queryOne<{ user_id: string }>(
      'SELECT user_id FROM virtual_hangout_memberships WHERE hangout_id = $1 AND user_id = $2',
      [hangoutId, userId]
    );

    if (!membership) {
      throw new ForbiddenError('Must be a member to share workouts');
    }

    // Verify workout exists and belongs to user
    const workout = await queryOne<{ id: string; name: string }>(
      'SELECT id, name FROM workouts WHERE id = $1 AND user_id = $2',
      [workoutId, userId]
    );

    if (!workout) {
      throw new NotFoundError('Workout not found');
    }

    // Log the share as activity
    await this.logActivity(hangoutId, userId, 'workout_shared', {
      workoutId,
      workoutName: workout.name,
      message,
    });

    log.info({ hangoutId, userId, workoutId }, 'Workout shared to hangout');
  },
};
