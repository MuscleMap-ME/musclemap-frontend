/**
 * Moderation Module
 *
 * Handles hangout moderation actions:
 * - Ban/unban users from hangouts
 * - Remove leaderboard records
 * - Approve/reject membership requests
 * - Warn and mute users
 * - Audit logging of all actions
 */

import crypto from 'crypto';
import { queryOne, queryAll, query } from '../../db/client';
import { ValidationError, NotFoundError, ForbiddenError } from '../../lib/errors';
import { loggers } from '../../lib/logger';

const log = loggers.core;

// Action types
export const ACTION_TYPES = {
  REMOVE_RECORD: 'remove_record',
  FLAG_SUSPICIOUS: 'flag_suspicious',
  BAN_USER: 'ban_user',
  UNBAN_USER: 'unban_user',
  APPROVE_MEMBERSHIP: 'approve_membership',
  REJECT_MEMBERSHIP: 'reject_membership',
  PIN_ACHIEVEMENT: 'pin_achievement',
  UNPIN_ACHIEVEMENT: 'unpin_achievement',
  WARN_USER: 'warn_user',
  MUTE_USER: 'mute_user',
  UNMUTE_USER: 'unmute_user',
} as const;

export type ActionType = (typeof ACTION_TYPES)[keyof typeof ACTION_TYPES];

// Minimum roles required for each action
const ACTION_PERMISSIONS: Record<ActionType, number> = {
  remove_record: 1, // Moderator+
  flag_suspicious: 1, // Moderator+
  ban_user: 2, // Admin+
  unban_user: 2, // Admin+
  approve_membership: 1, // Moderator+
  reject_membership: 1, // Moderator+
  pin_achievement: 1, // Moderator+
  unpin_achievement: 1, // Moderator+
  warn_user: 1, // Moderator+
  mute_user: 1, // Moderator+
  unmute_user: 1, // Moderator+
};

// Types
export interface ModerationAction {
  id: string;
  hangoutId?: number;
  virtualHangoutId?: number;
  moderatorId: string;
  moderatorUsername?: string;
  targetUserId?: string;
  targetUsername?: string;
  targetEntryId?: string;
  actionType: ActionType;
  reason?: string;
  metadata: Record<string, unknown>;
  createdAt: Date;
}

export interface UserModerationStatus {
  userId: string;
  isBanned: boolean;
  isMuted: boolean;
  mutedUntil?: Date;
  warningCount: number;
  lastWarningAt?: Date;
}

// Service
export const moderationService = {
  /**
   * Check if a user has permission to perform a moderation action
   */
  async checkPermission(
    moderatorId: string,
    hangoutId?: number,
    virtualHangoutId?: number,
    action?: ActionType
  ): Promise<{ hasPermission: boolean; role: number }> {
    let role = 0;

    if (hangoutId) {
      const membership = await queryOne<{ role: number }>(
        'SELECT role FROM hangout_memberships WHERE hangout_id = $1 AND user_id = $2',
        [hangoutId, moderatorId]
      );
      role = membership?.role || 0;
    } else if (virtualHangoutId) {
      const membership = await queryOne<{ role: number }>(
        'SELECT role FROM virtual_hangout_memberships WHERE hangout_id = $1 AND user_id = $2',
        [virtualHangoutId, moderatorId]
      );
      role = membership?.role || 0;
    }

    const requiredRole = action ? ACTION_PERMISSIONS[action] || 1 : 1;

    return {
      hasPermission: role >= requiredRole,
      role,
    };
  },

  /**
   * Log a moderation action
   */
  async logAction(params: {
    hangoutId?: number;
    virtualHangoutId?: number;
    moderatorId: string;
    targetUserId?: string;
    targetEntryId?: string;
    actionType: ActionType;
    reason?: string;
    metadata?: Record<string, unknown>;
  }): Promise<ModerationAction> {
    const {
      hangoutId,
      virtualHangoutId,
      moderatorId,
      targetUserId,
      targetEntryId,
      actionType,
      reason,
      metadata = {},
    } = params;

    const actionId = `ma_${crypto.randomBytes(12).toString('hex')}`;

    await query(
      `INSERT INTO moderation_actions
       (id, hangout_id, virtual_hangout_id, moderator_id, target_user_id, target_entry_id, action_type, reason, metadata)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [actionId, hangoutId, virtualHangoutId, moderatorId, targetUserId, targetEntryId, actionType, reason, JSON.stringify(metadata)]
    );

    log.info({ actionId, actionType, moderatorId, targetUserId, hangoutId, virtualHangoutId }, 'Moderation action logged');

    return {
      id: actionId,
      hangoutId,
      virtualHangoutId,
      moderatorId,
      targetUserId,
      targetEntryId,
      actionType,
      reason,
      metadata,
      createdAt: new Date(),
    };
  },

  /**
   * Ban a user from a hangout
   */
  async banUser(params: {
    hangoutId?: number;
    virtualHangoutId?: number;
    moderatorId: string;
    targetUserId: string;
    reason?: string;
  }): Promise<ModerationAction> {
    const { hangoutId, virtualHangoutId, moderatorId, targetUserId, reason } = params;

    // Check permission
    const { hasPermission } = await this.checkPermission(moderatorId, hangoutId, virtualHangoutId, 'ban_user');
    if (!hasPermission) {
      throw new ForbiddenError('Insufficient permissions to ban users');
    }

    // Cannot ban yourself
    if (moderatorId === targetUserId) {
      throw new ValidationError('Cannot ban yourself');
    }

    // Check if target has higher role
    const { role: moderatorRole } = await this.checkPermission(moderatorId, hangoutId, virtualHangoutId);
    const { role: targetRole } = await this.checkPermission(targetUserId, hangoutId, virtualHangoutId);

    if (targetRole >= moderatorRole) {
      throw new ForbiddenError('Cannot ban a user with equal or higher role');
    }

    // Update membership status to banned
    if (hangoutId) {
      await query(
        `UPDATE hangout_memberships SET role = -1 WHERE hangout_id = $1 AND user_id = $2`,
        [hangoutId, targetUserId]
      );
    } else if (virtualHangoutId) {
      await query(
        `UPDATE virtual_hangout_memberships SET role = -1 WHERE hangout_id = $1 AND user_id = $2`,
        [virtualHangoutId, targetUserId]
      );
    }

    // Log action
    return this.logAction({
      hangoutId,
      virtualHangoutId,
      moderatorId,
      targetUserId,
      actionType: 'ban_user',
      reason,
    });
  },

  /**
   * Unban a user from a hangout
   */
  async unbanUser(params: {
    hangoutId?: number;
    virtualHangoutId?: number;
    moderatorId: string;
    targetUserId: string;
    reason?: string;
  }): Promise<ModerationAction> {
    const { hangoutId, virtualHangoutId, moderatorId, targetUserId, reason } = params;

    // Check permission
    const { hasPermission } = await this.checkPermission(moderatorId, hangoutId, virtualHangoutId, 'unban_user');
    if (!hasPermission) {
      throw new ForbiddenError('Insufficient permissions to unban users');
    }

    // Update membership status to member
    if (hangoutId) {
      await query(
        `UPDATE hangout_memberships SET role = 0 WHERE hangout_id = $1 AND user_id = $2 AND role = -1`,
        [hangoutId, targetUserId]
      );
    } else if (virtualHangoutId) {
      await query(
        `UPDATE virtual_hangout_memberships SET role = 0 WHERE hangout_id = $1 AND user_id = $2 AND role = -1`,
        [virtualHangoutId, targetUserId]
      );
    }

    // Log action
    return this.logAction({
      hangoutId,
      virtualHangoutId,
      moderatorId,
      targetUserId,
      actionType: 'unban_user',
      reason,
    });
  },

  /**
   * Remove a leaderboard record
   */
  async removeRecord(params: {
    hangoutId?: number;
    virtualHangoutId?: number;
    moderatorId: string;
    entryId: string;
    reason?: string;
  }): Promise<ModerationAction> {
    const { hangoutId, virtualHangoutId, moderatorId, entryId, reason } = params;

    // Check permission
    const { hasPermission } = await this.checkPermission(moderatorId, hangoutId, virtualHangoutId, 'remove_record');
    if (!hasPermission) {
      throw new ForbiddenError('Insufficient permissions to remove records');
    }

    // Get the entry to record who it belonged to
    const entry = await queryOne<{ user_id: string; value: string }>(
      'SELECT user_id, value FROM leaderboard_entries WHERE id = $1',
      [entryId]
    );

    if (!entry) {
      throw new NotFoundError('Leaderboard entry not found');
    }

    // Mark entry as rejected
    await query(
      `UPDATE leaderboard_entries SET verification_status = 'rejected' WHERE id = $1`,
      [entryId]
    );

    // Log action
    return this.logAction({
      hangoutId,
      virtualHangoutId,
      moderatorId,
      targetUserId: entry.user_id,
      targetEntryId: entryId,
      actionType: 'remove_record',
      reason,
      metadata: { previousValue: entry.value },
    });
  },

  /**
   * Warn a user
   */
  async warnUser(params: {
    hangoutId?: number;
    virtualHangoutId?: number;
    moderatorId: string;
    targetUserId: string;
    reason: string;
  }): Promise<ModerationAction> {
    const { hangoutId, virtualHangoutId, moderatorId, targetUserId, reason } = params;

    // Check permission
    const { hasPermission } = await this.checkPermission(moderatorId, hangoutId, virtualHangoutId, 'warn_user');
    if (!hasPermission) {
      throw new ForbiddenError('Insufficient permissions to warn users');
    }

    if (!reason) {
      throw new ValidationError('Reason is required for warnings');
    }

    // Log action
    return this.logAction({
      hangoutId,
      virtualHangoutId,
      moderatorId,
      targetUserId,
      actionType: 'warn_user',
      reason,
    });
  },

  /**
   * Mute a user with optional duration
   */
  async muteUser(params: {
    hangoutId?: number;
    virtualHangoutId?: number;
    moderatorId: string;
    targetUserId: string;
    reason: string;
    durationMinutes?: number; // null = permanent
  }): Promise<ModerationAction> {
    const { hangoutId, virtualHangoutId, moderatorId, targetUserId, reason, durationMinutes } = params;

    // Check permission
    const { hasPermission } = await this.checkPermission(moderatorId, hangoutId, virtualHangoutId, 'mute_user');
    if (!hasPermission) {
      throw new ForbiddenError('Insufficient permissions to mute users');
    }

    if (!reason) {
      throw new ValidationError('Reason is required for muting');
    }

    // Calculate mute expiry
    const muteUntil = durationMinutes
      ? new Date(Date.now() + durationMinutes * 60 * 1000)
      : null;

    // Log action with expiry in metadata
    return this.logAction({
      hangoutId,
      virtualHangoutId,
      moderatorId,
      targetUserId,
      actionType: 'mute_user',
      reason,
      metadata: {
        durationMinutes,
        muteUntil: muteUntil?.toISOString() ?? null,
      },
    });
  },

  /**
   * Unmute a user
   */
  async unmuteUser(params: {
    hangoutId?: number;
    virtualHangoutId?: number;
    moderatorId: string;
    targetUserId: string;
    reason?: string;
  }): Promise<ModerationAction> {
    const { hangoutId, virtualHangoutId, moderatorId, targetUserId, reason } = params;

    // Check permission
    const { hasPermission } = await this.checkPermission(moderatorId, hangoutId, virtualHangoutId, 'unmute_user');
    if (!hasPermission) {
      throw new ForbiddenError('Insufficient permissions to unmute users');
    }

    // Log action
    return this.logAction({
      hangoutId,
      virtualHangoutId,
      moderatorId,
      targetUserId,
      actionType: 'unmute_user',
      reason,
    });
  },

  /**
   * Get moderation action history for a hangout
   */
  async getHangoutActions(
    hangoutId?: number,
    virtualHangoutId?: number,
    options: { limit?: number; offset?: number; actionType?: ActionType } = {}
  ): Promise<{ actions: ModerationAction[]; total: number }> {
    const { limit = 50, offset = 0, actionType } = options;

    let whereClause: string;
    const params: unknown[] = [];
    let paramIndex = 1;

    if (hangoutId) {
      whereClause = `ma.hangout_id = $${paramIndex++}`;
      params.push(hangoutId);
    } else if (virtualHangoutId) {
      whereClause = `ma.virtual_hangout_id = $${paramIndex++}`;
      params.push(virtualHangoutId);
    } else {
      throw new ValidationError('Either hangoutId or virtualHangoutId is required');
    }

    if (actionType) {
      whereClause += ` AND ma.action_type = $${paramIndex++}`;
      params.push(actionType);
    }

    params.push(limit, offset);

    const rows = await queryAll<{
      id: string;
      hangout_id: number | null;
      virtual_hangout_id: number | null;
      moderator_id: string;
      moderator_username: string;
      target_user_id: string | null;
      target_username: string | null;
      target_entry_id: string | null;
      action_type: string;
      reason: string | null;
      metadata: Record<string, unknown>; // JSONB returns object, not string
      created_at: Date;
    }>(
      `SELECT ma.*, m.username as moderator_username, t.username as target_username
       FROM moderation_actions ma
       JOIN users m ON m.id = ma.moderator_id
       LEFT JOIN users t ON t.id = ma.target_user_id
       WHERE ${whereClause}
       ORDER BY ma.created_at DESC
       LIMIT $${paramIndex++} OFFSET $${paramIndex++}`,
      params
    );

    const countResult = await queryOne<{ count: string }>(
      `SELECT COUNT(*) as count FROM moderation_actions ma WHERE ${whereClause}`,
      params.slice(0, actionType ? 2 : 1)
    );

    return {
      actions: rows.map((r) => ({
        id: r.id,
        hangoutId: r.hangout_id ?? undefined,
        virtualHangoutId: r.virtual_hangout_id ?? undefined,
        moderatorId: r.moderator_id,
        moderatorUsername: r.moderator_username,
        targetUserId: r.target_user_id ?? undefined,
        targetUsername: r.target_username ?? undefined,
        targetEntryId: r.target_entry_id ?? undefined,
        actionType: r.action_type as ActionType,
        reason: r.reason ?? undefined,
        // JSONB columns return JavaScript objects, not strings
        metadata: r.metadata || {},
        createdAt: r.created_at,
      })),
      total: parseInt(countResult?.count || '0'),
    };
  },

  /**
   * Get moderation actions against a user
   */
  async getUserActions(
    targetUserId: string,
    options: { limit?: number; offset?: number } = {}
  ): Promise<{ actions: ModerationAction[]; total: number }> {
    const { limit = 50, offset = 0 } = options;

    const rows = await queryAll<{
      id: string;
      hangout_id: number | null;
      virtual_hangout_id: number | null;
      moderator_id: string;
      moderator_username: string;
      target_user_id: string | null;
      target_entry_id: string | null;
      action_type: string;
      reason: string | null;
      metadata: Record<string, unknown>; // JSONB returns object, not string
      created_at: Date;
    }>(
      `SELECT ma.*, m.username as moderator_username
       FROM moderation_actions ma
       JOIN users m ON m.id = ma.moderator_id
       WHERE ma.target_user_id = $1
       ORDER BY ma.created_at DESC
       LIMIT $2 OFFSET $3`,
      [targetUserId, limit, offset]
    );

    const countResult = await queryOne<{ count: string }>(
      'SELECT COUNT(*) as count FROM moderation_actions WHERE target_user_id = $1',
      [targetUserId]
    );

    return {
      actions: rows.map((r) => ({
        id: r.id,
        hangoutId: r.hangout_id ?? undefined,
        virtualHangoutId: r.virtual_hangout_id ?? undefined,
        moderatorId: r.moderator_id,
        moderatorUsername: r.moderator_username,
        targetUserId: r.target_user_id ?? undefined,
        targetEntryId: r.target_entry_id ?? undefined,
        actionType: r.action_type as ActionType,
        reason: r.reason ?? undefined,
        // JSONB columns return JavaScript objects, not strings
        metadata: r.metadata || {},
        createdAt: r.created_at,
      })),
      total: parseInt(countResult?.count || '0'),
    };
  },

  /**
   * Get user's moderation status in a hangout
   */
  async getUserModerationStatus(
    userId: string,
    hangoutId?: number,
    virtualHangoutId?: number
  ): Promise<UserModerationStatus> {
    // Check if banned
    let isBanned = false;
    if (hangoutId) {
      const membership = await queryOne<{ role: number }>(
        'SELECT role FROM hangout_memberships WHERE hangout_id = $1 AND user_id = $2',
        [hangoutId, userId]
      );
      isBanned = membership?.role === -1;
    } else if (virtualHangoutId) {
      const membership = await queryOne<{ role: number }>(
        'SELECT role FROM virtual_hangout_memberships WHERE hangout_id = $1 AND user_id = $2',
        [virtualHangoutId, userId]
      );
      isBanned = membership?.role === -1;
    }

    // Count warnings
    const warnings = await queryOne<{ count: string; last_warning: Date | null }>(
      `SELECT COUNT(*) as count, MAX(created_at) as last_warning
       FROM moderation_actions
       WHERE target_user_id = $1 AND action_type = 'warn_user'
         AND (hangout_id = $2 OR virtual_hangout_id = $3)`,
      [userId, hangoutId, virtualHangoutId]
    );

    // Check for active mute (most recent mute_user action not followed by unmute_user)
    // and verify mute hasn't expired
    const lastMuteAction = await queryOne<{
      action_type: string;
      metadata: Record<string, unknown>; // JSONB returns object, not string
      created_at: Date;
    }>(
      `SELECT action_type, metadata, created_at
       FROM moderation_actions
       WHERE target_user_id = $1
         AND action_type IN ('mute_user', 'unmute_user')
         AND (hangout_id = $2 OR virtual_hangout_id = $3)
       ORDER BY created_at DESC
       LIMIT 1`,
      [userId, hangoutId, virtualHangoutId]
    );

    let isMuted = false;
    let mutedUntil: Date | undefined;

    if (lastMuteAction && lastMuteAction.action_type === 'mute_user') {
      // JSONB columns return JavaScript objects, not strings
      const metadata = lastMuteAction.metadata || {};
      if (metadata.muteUntil && typeof metadata.muteUntil === 'string') {
        const expiry = new Date(metadata.muteUntil);
        if (expiry > new Date()) {
          // Mute is still active
          isMuted = true;
          mutedUntil = expiry;
        }
      } else {
        // Permanent mute (no expiry)
        isMuted = true;
      }
    }

    return {
      userId,
      isBanned,
      isMuted,
      mutedUntil,
      warningCount: parseInt(warnings?.count || '0'),
      lastWarningAt: warnings?.last_warning ?? undefined,
    };
  },

  /**
   * Get banned users in a hangout
   */
  async getBannedUsers(
    hangoutId?: number,
    virtualHangoutId?: number
  ): Promise<Array<{ userId: string; username: string; bannedAt?: Date }>> {
    if (hangoutId) {
      const rows = await queryAll<{ user_id: string; username: string; joined_at: Date }>(
        `SELECT hm.user_id, u.username, hm.joined_at
         FROM hangout_memberships hm
         JOIN users u ON u.id = hm.user_id
         WHERE hm.hangout_id = $1 AND hm.role = -1`,
        [hangoutId]
      );
      return rows.map((r) => ({ userId: r.user_id, username: r.username, bannedAt: r.joined_at }));
    } else if (virtualHangoutId) {
      const rows = await queryAll<{ user_id: string; username: string; joined_at: Date }>(
        `SELECT vhm.user_id, u.username, vhm.joined_at
         FROM virtual_hangout_memberships vhm
         JOIN users u ON u.id = vhm.user_id
         WHERE vhm.hangout_id = $1 AND vhm.role = -1`,
        [virtualHangoutId]
      );
      return rows.map((r) => ({ userId: r.user_id, username: r.username, bannedAt: r.joined_at }));
    }

    return [];
  },
};

export default moderationService;
