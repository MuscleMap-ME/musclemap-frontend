/**
 * Privacy Service
 *
 * Manages user privacy controls:
 * - Ghost mode (appear offline)
 * - Profile visibility
 * - Activity visibility
 * - Blocking and muting
 */

import { queryOne, queryAll, query } from '../../db/client';
import { ValidationError, NotFoundError } from '../../lib/errors';
import { loggers } from '../../lib/logger';

const log = loggers.core;

// Profile visibility levels
export type ProfileVisibility = 'public' | 'members_only' | 'connections_only' | 'private';

// Activity visibility levels
export type ActivityVisibility = 'public' | 'members_only' | 'connections_only' | 'private';

// Interfaces
export interface UserPrivacySettings {
  userId: string;
  ghostModeEnabled: boolean;
  ghostModeUntil?: Date;
  profileVisibility: ProfileVisibility;
  activityVisibility: ActivityVisibility;
  showInLeaderboards: boolean;
  showInMemberLists: boolean;
  allowDirectMessages: boolean;
  allowEventInvites: boolean;
  showWorkoutHistory: boolean;
  showAchievements: boolean;
  showStats: boolean;
  updatedAt: Date;
}

export interface BlockedUser {
  userId: string;
  blockedUserId: string;
  blockedUsername: string;
  blockedAt: Date;
}

export interface MutedEntity {
  userId: string;
  entityType: 'user' | 'community' | 'hangout';
  entityId: string | number;
  entityName: string;
  mutedAt: Date;
  muteUntil?: Date;
}

// Service implementation
export const privacyService = {
  /**
   * Get user's privacy settings
   */
  async getSettings(userId: string): Promise<UserPrivacySettings> {
    const row = await queryOne<{
      user_id: string;
      ghost_mode_enabled: boolean;
      ghost_mode_until: Date | null;
      profile_visibility: string;
      activity_visibility: string;
      show_in_leaderboards: boolean;
      show_in_member_lists: boolean;
      allow_direct_messages: boolean;
      allow_event_invites: boolean;
      show_workout_history: boolean;
      show_achievements: boolean;
      show_stats: boolean;
      updated_at: Date;
    }>(
      `SELECT
        user_id, ghost_mode_enabled, ghost_mode_until,
        profile_visibility, activity_visibility,
        show_in_leaderboards, show_in_member_lists,
        allow_direct_messages, allow_event_invites,
        show_workout_history, show_achievements, show_stats,
        updated_at
       FROM user_privacy_settings
       WHERE user_id = $1`,
      [userId]
    );

    if (!row) {
      // Create default settings
      await query(
        `INSERT INTO user_privacy_settings (user_id)
         VALUES ($1)
         ON CONFLICT (user_id) DO NOTHING`,
        [userId]
      );

      return {
        userId,
        ghostModeEnabled: false,
        profileVisibility: 'public',
        activityVisibility: 'public',
        showInLeaderboards: true,
        showInMemberLists: true,
        allowDirectMessages: true,
        allowEventInvites: true,
        showWorkoutHistory: true,
        showAchievements: true,
        showStats: true,
        updatedAt: new Date(),
      };
    }

    return {
      userId: row.user_id,
      ghostModeEnabled: row.ghost_mode_enabled,
      ghostModeUntil: row.ghost_mode_until ?? undefined,
      profileVisibility: row.profile_visibility as ProfileVisibility,
      activityVisibility: row.activity_visibility as ActivityVisibility,
      showInLeaderboards: row.show_in_leaderboards,
      showInMemberLists: row.show_in_member_lists,
      allowDirectMessages: row.allow_direct_messages,
      allowEventInvites: row.allow_event_invites,
      showWorkoutHistory: row.show_workout_history,
      showAchievements: row.show_achievements,
      showStats: row.show_stats,
      updatedAt: row.updated_at,
    };
  },

  /**
   * Update privacy settings
   */
  async updateSettings(
    userId: string,
    settings: Partial<Omit<UserPrivacySettings, 'userId' | 'updatedAt'>>
  ): Promise<UserPrivacySettings> {
    const updates: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    const fieldMapping: Record<string, string> = {
      ghostModeEnabled: 'ghost_mode_enabled',
      ghostModeUntil: 'ghost_mode_until',
      profileVisibility: 'profile_visibility',
      activityVisibility: 'activity_visibility',
      showInLeaderboards: 'show_in_leaderboards',
      showInMemberLists: 'show_in_member_lists',
      allowDirectMessages: 'allow_direct_messages',
      allowEventInvites: 'allow_event_invites',
      showWorkoutHistory: 'show_workout_history',
      showAchievements: 'show_achievements',
      showStats: 'show_stats',
    };

    for (const [key, value] of Object.entries(settings)) {
      if (value !== undefined && fieldMapping[key]) {
        updates.push(`${fieldMapping[key]} = $${paramIndex++}`);
        params.push(value);
      }
    }

    if (updates.length === 0) {
      return this.getSettings(userId);
    }

    updates.push('updated_at = NOW()');
    params.push(userId);

    await query(
      `INSERT INTO user_privacy_settings (user_id)
       VALUES ($${paramIndex})
       ON CONFLICT (user_id) DO UPDATE SET ${updates.join(', ')}`,
      params
    );

    log.info({ userId, updates: Object.keys(settings) }, 'Privacy settings updated');

    return this.getSettings(userId);
  },

  /**
   * Enable ghost mode (appear offline)
   */
  async enableGhostMode(userId: string, durationHours?: number): Promise<void> {
    const ghostModeUntil = durationHours
      ? new Date(Date.now() + durationHours * 60 * 60 * 1000)
      : null;

    await query(
      `INSERT INTO user_privacy_settings (user_id, ghost_mode_enabled, ghost_mode_until)
       VALUES ($1, TRUE, $2)
       ON CONFLICT (user_id) DO UPDATE SET
         ghost_mode_enabled = TRUE,
         ghost_mode_until = $2,
         updated_at = NOW()`,
      [userId, ghostModeUntil]
    );

    log.info({ userId, durationHours }, 'Ghost mode enabled');
  },

  /**
   * Disable ghost mode
   */
  async disableGhostMode(userId: string): Promise<void> {
    await query(
      `UPDATE user_privacy_settings SET
         ghost_mode_enabled = FALSE,
         ghost_mode_until = NULL,
         updated_at = NOW()
       WHERE user_id = $1`,
      [userId]
    );

    log.info({ userId }, 'Ghost mode disabled');
  },

  /**
   * Check if user is in ghost mode
   */
  async isGhostMode(userId: string): Promise<boolean> {
    const row = await queryOne<{ ghost_mode_enabled: boolean; ghost_mode_until: Date | null }>(
      'SELECT ghost_mode_enabled, ghost_mode_until FROM user_privacy_settings WHERE user_id = $1',
      [userId]
    );

    if (!row || !row.ghost_mode_enabled) {
      return false;
    }

    // Check if ghost mode has expired
    if (row.ghost_mode_until && new Date(row.ghost_mode_until) < new Date()) {
      await this.disableGhostMode(userId);
      return false;
    }

    return true;
  },

  /**
   * Block a user
   */
  async blockUser(userId: string, blockedUserId: string): Promise<void> {
    if (userId === blockedUserId) {
      throw new ValidationError('Cannot block yourself');
    }

    // Verify blocked user exists
    const blockedUser = await queryOne<{ id: string }>(
      'SELECT id FROM users WHERE id = $1',
      [blockedUserId]
    );

    if (!blockedUser) {
      throw new NotFoundError('User not found');
    }

    await query(
      `INSERT INTO user_blocks (user_id, blocked_user_id)
       VALUES ($1, $2)
       ON CONFLICT DO NOTHING`,
      [userId, blockedUserId]
    );

    log.info({ userId, blockedUserId }, 'User blocked');
  },

  /**
   * Unblock a user
   */
  async unblockUser(userId: string, blockedUserId: string): Promise<void> {
    await query(
      'DELETE FROM user_blocks WHERE user_id = $1 AND blocked_user_id = $2',
      [userId, blockedUserId]
    );

    log.info({ userId, blockedUserId }, 'User unblocked');
  },

  /**
   * Get blocked users
   */
  async getBlockedUsers(userId: string): Promise<BlockedUser[]> {
    const rows = await queryAll<{
      user_id: string;
      blocked_user_id: string;
      username: string;
      blocked_at: Date;
    }>(
      `SELECT ub.user_id, ub.blocked_user_id, u.username, ub.blocked_at
       FROM user_blocks ub
       JOIN users u ON u.id = ub.blocked_user_id
       WHERE ub.user_id = $1
       ORDER BY ub.blocked_at DESC`,
      [userId]
    );

    return rows.map(r => ({
      userId: r.user_id,
      blockedUserId: r.blocked_user_id,
      blockedUsername: r.username,
      blockedAt: r.blocked_at,
    }));
  },

  /**
   * Check if user is blocked
   */
  async isBlocked(userId: string, otherUserId: string): Promise<boolean> {
    const row = await queryOne<{ blocked_user_id: string }>(
      'SELECT blocked_user_id FROM user_blocks WHERE user_id = $1 AND blocked_user_id = $2',
      [userId, otherUserId]
    );

    return !!row;
  },

  /**
   * Mute a user, community, or hangout
   */
  async mute(
    userId: string,
    entityType: MutedEntity['entityType'],
    entityId: string | number,
    durationHours?: number
  ): Promise<void> {
    const muteUntil = durationHours
      ? new Date(Date.now() + durationHours * 60 * 60 * 1000)
      : null;

    await query(
      `INSERT INTO user_mutes (user_id, entity_type, entity_id, mute_until)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (user_id, entity_type, entity_id) DO UPDATE SET
         mute_until = $4,
         created_at = NOW()`,
      [userId, entityType, String(entityId), muteUntil]
    );

    log.info({ userId, entityType, entityId, durationHours }, 'Entity muted');
  },

  /**
   * Unmute an entity
   */
  async unmute(
    userId: string,
    entityType: MutedEntity['entityType'],
    entityId: string | number
  ): Promise<void> {
    await query(
      'DELETE FROM user_mutes WHERE user_id = $1 AND entity_type = $2 AND entity_id = $3',
      [userId, entityType, String(entityId)]
    );

    log.info({ userId, entityType, entityId }, 'Entity unmuted');
  },

  /**
   * Get muted entities
   */
  async getMutedEntities(userId: string): Promise<MutedEntity[]> {
    const rows = await queryAll<{
      user_id: string;
      entity_type: string;
      entity_id: string;
      mute_until: Date | null;
      created_at: Date;
    }>(
      `SELECT user_id, entity_type, entity_id, mute_until, created_at
       FROM user_mutes
       WHERE user_id = $1
       ORDER BY created_at DESC`,
      [userId]
    );

    // Get entity names
    const mutes: MutedEntity[] = [];
    for (const row of rows) {
      let entityName = 'Unknown';

      if (row.entity_type === 'user') {
        const user = await queryOne<{ username: string }>(
          'SELECT username FROM users WHERE id = $1',
          [row.entity_id]
        );
        entityName = user?.username || 'Unknown User';
      } else if (row.entity_type === 'community') {
        const community = await queryOne<{ name: string }>(
          'SELECT name FROM communities WHERE id = $1',
          [parseInt(row.entity_id)]
        );
        entityName = community?.name || 'Unknown Community';
      } else if (row.entity_type === 'hangout') {
        const hangout = await queryOne<{ name: string }>(
          'SELECT name FROM virtual_hangouts WHERE id = $1',
          [parseInt(row.entity_id)]
        );
        entityName = hangout?.name || 'Unknown Hangout';
      }

      mutes.push({
        userId: row.user_id,
        entityType: row.entity_type as MutedEntity['entityType'],
        entityId: row.entity_type === 'user' ? row.entity_id : parseInt(row.entity_id),
        entityName,
        mutedAt: row.created_at,
        muteUntil: row.mute_until ?? undefined,
      });
    }

    return mutes;
  },

  /**
   * Check if entity is muted
   */
  async isMuted(
    userId: string,
    entityType: MutedEntity['entityType'],
    entityId: string | number
  ): Promise<boolean> {
    const row = await queryOne<{ mute_until: Date | null }>(
      'SELECT mute_until FROM user_mutes WHERE user_id = $1 AND entity_type = $2 AND entity_id = $3',
      [userId, entityType, String(entityId)]
    );

    if (!row) {
      return false;
    }

    // Check if mute has expired
    if (row.mute_until && new Date(row.mute_until) < new Date()) {
      await this.unmute(userId, entityType, entityId);
      return false;
    }

    return true;
  },

  /**
   * Check if user can view another user's profile
   */
  async canViewProfile(viewerId: string | undefined, targetUserId: string): Promise<boolean> {
    // Get target's privacy settings
    const settings = await this.getSettings(targetUserId);

    switch (settings.profileVisibility) {
      case 'public':
        return true;

      case 'members_only':
        // Check if viewer is authenticated
        return !!viewerId;

      case 'connections_only':
        if (!viewerId) return false;
        // Check if they're connected (mutual followers, crew members, etc.)
        const isConnected = await queryOne<{ connected: boolean }>(
          `SELECT EXISTS(
            SELECT 1 FROM user_connections
            WHERE (user_id = $1 AND connected_user_id = $2)
               OR (user_id = $2 AND connected_user_id = $1)
          ) as connected`,
          [viewerId, targetUserId]
        );
        return isConnected?.connected ?? false;

      case 'private':
        // Only the user themselves can view
        return viewerId === targetUserId;

      default:
        return true;
    }
  },

  /**
   * Check if user can view another user's activity
   */
  async canViewActivity(viewerId: string | undefined, targetUserId: string): Promise<boolean> {
    const settings = await this.getSettings(targetUserId);

    switch (settings.activityVisibility) {
      case 'public':
        return true;

      case 'members_only':
        return !!viewerId;

      case 'connections_only':
        if (!viewerId) return false;
        const isConnected = await queryOne<{ connected: boolean }>(
          `SELECT EXISTS(
            SELECT 1 FROM user_connections
            WHERE (user_id = $1 AND connected_user_id = $2)
               OR (user_id = $2 AND connected_user_id = $1)
          ) as connected`,
          [viewerId, targetUserId]
        );
        return isConnected?.connected ?? false;

      case 'private':
        return viewerId === targetUserId;

      default:
        return true;
    }
  },
};
