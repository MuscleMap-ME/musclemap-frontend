/**
 * Notification Service
 *
 * Centralized service for creating and managing in-app notifications.
 * Supports different notification types and delivery channels.
 */

import { query, queryOne } from '../db/client';
import { loggers } from '../lib/logger';

const log = loggers.core.child({ service: 'notification' });

// ============================================
// Types
// ============================================

export type NotificationType =
  // Achievement verification
  | 'VERIFICATION_WITNESS_REQUEST'
  | 'VERIFICATION_CONFIRMED'
  | 'VERIFICATION_REJECTED'
  | 'VERIFICATION_EXPIRED'
  // Social
  | 'HIGH_FIVE_RECEIVED'
  | 'FOLLOW_RECEIVED'
  | 'MENTION'
  // Competition
  | 'COMPETITION_INVITE'
  | 'COMPETITION_STARTED'
  | 'COMPETITION_ENDED'
  | 'COMPETITION_RANK_CHANGE'
  // Messaging
  | 'NEW_MESSAGE'
  | 'GROUP_INVITE'
  // Achievements
  | 'ACHIEVEMENT_UNLOCKED'
  | 'BADGE_EARNED'
  // System
  | 'SYSTEM_ANNOUNCEMENT'
  | 'FEATURE_RELEASED'
  | 'ACCOUNT_ALERT';

export type NotificationCategory =
  | 'verification'
  | 'social'
  | 'competition'
  | 'messaging'
  | 'achievements'
  | 'system';

export interface CreateNotificationInput {
  userId: string;
  type: NotificationType;
  category: NotificationCategory;
  title: string;
  body?: string;
  icon?: string;
  imageUrl?: string;
  actionUrl?: string;
  actionLabel?: string;
  relatedUserId?: string;
  relatedEntityType?: string;
  relatedEntityId?: string;
  metadata?: Record<string, unknown>;
  expiresAt?: Date;
}

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  category: NotificationCategory;
  title: string;
  body?: string;
  icon?: string;
  imageUrl?: string;
  actionUrl?: string;
  actionLabel?: string;
  relatedUserId?: string;
  relatedUser?: {
    username: string;
    displayName?: string;
    avatarUrl?: string;
  };
  relatedEntityType?: string;
  relatedEntityId?: string;
  metadata?: Record<string, unknown>;
  isRead: boolean;
  readAt?: Date;
  pushSent: boolean;
  pushSentAt?: Date;
  expiresAt?: Date;
  createdAt: Date;
}

export interface NotificationPreferences {
  category: NotificationCategory;
  inAppEnabled: boolean;
  pushEnabled: boolean;
  emailEnabled: boolean;
  quietHoursStart?: string;
  quietHoursEnd?: string;
}

// ============================================
// Notification Service
// ============================================

export const NotificationService = {
  /**
   * Create a new notification
   */
  async create(input: CreateNotificationInput): Promise<Notification> {
    // Check user preferences
    const prefs = await this.getPreferences(input.userId, input.category);

    if (!prefs.inAppEnabled) {
      log.debug(`In-app notifications disabled for user ${input.userId}, category ${input.category}`);
      // Still create but mark as read
      input.metadata = { ...input.metadata, autoRead: true };
    }

    const row = await queryOne<{
      id: string;
      user_id: string;
      type: string;
      category: string;
      title: string;
      body: string | null;
      icon: string | null;
      image_url: string | null;
      action_url: string | null;
      action_label: string | null;
      related_user_id: string | null;
      related_entity_type: string | null;
      related_entity_id: string | null;
      metadata: Record<string, unknown>;
      is_read: boolean;
      read_at: Date | null;
      push_sent: boolean;
      push_sent_at: Date | null;
      expires_at: Date | null;
      created_at: Date;
    }>(
      `INSERT INTO notifications (
        user_id, type, category, title, body, icon, image_url,
        action_url, action_label, related_user_id, related_entity_type,
        related_entity_id, metadata, expires_at, is_read
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
      RETURNING *`,
      [
        input.userId,
        input.type,
        input.category,
        input.title,
        input.body ?? null,
        input.icon ?? null,
        input.imageUrl ?? null,
        input.actionUrl ?? null,
        input.actionLabel ?? null,
        input.relatedUserId ?? null,
        input.relatedEntityType ?? null,
        input.relatedEntityId ?? null,
        JSON.stringify(input.metadata ?? {}),
        input.expiresAt ?? null,
        !prefs.inAppEnabled, // Mark as read if in-app disabled
      ]
    );

    if (!row) {
      throw new Error('Failed to create notification');
    }

    log.info(`Created notification ${row.id} of type ${input.type} for user ${input.userId}`);

    return this.mapNotification(row);
  },

  /**
   * Get notifications for a user
   */
  async getForUser(
    userId: string,
    options: {
      limit?: number;
      offset?: number;
      category?: NotificationCategory;
      unreadOnly?: boolean;
    } = {}
  ): Promise<{ notifications: Notification[]; total: number; unreadCount: number }> {
    const { limit = 50, offset = 0, category, unreadOnly = false } = options;

    let whereClause = 'WHERE n.user_id = $1';
    const params: (string | number | boolean)[] = [userId];
    let paramIndex = 2;

    if (category) {
      whereClause += ` AND n.category = $${paramIndex++}`;
      params.push(category);
    }

    if (unreadOnly) {
      whereClause += ' AND n.is_read = FALSE';
    }

    // Exclude expired
    whereClause += ' AND (n.expires_at IS NULL OR n.expires_at > NOW())';

    const result = await query<{
      id: string;
      user_id: string;
      type: string;
      category: string;
      title: string;
      body: string | null;
      icon: string | null;
      image_url: string | null;
      action_url: string | null;
      action_label: string | null;
      related_user_id: string | null;
      related_entity_type: string | null;
      related_entity_id: string | null;
      metadata: Record<string, unknown>;
      is_read: boolean;
      read_at: Date | null;
      push_sent: boolean;
      push_sent_at: Date | null;
      expires_at: Date | null;
      created_at: Date;
      // Related user fields
      related_username: string | null;
      related_display_name: string | null;
      related_avatar_url: string | null;
    }>(
      `SELECT n.*,
              ru.username as related_username,
              ru.display_name as related_display_name,
              ru.avatar_url as related_avatar_url
       FROM notifications n
       LEFT JOIN users ru ON ru.id = n.related_user_id
       ${whereClause}
       ORDER BY n.created_at DESC
       LIMIT $${paramIndex++} OFFSET $${paramIndex++}`,
      [...params, limit, offset]
    );

    // Get counts
    const countResult = await queryOne<{ total: string; unread: string }>(
      `SELECT
         COUNT(*) FILTER (WHERE expires_at IS NULL OR expires_at > NOW()) as total,
         COUNT(*) FILTER (WHERE is_read = FALSE AND (expires_at IS NULL OR expires_at > NOW())) as unread
       FROM notifications
       WHERE user_id = $1`,
      [userId]
    );

    return {
      notifications: result.rows.map((row) => this.mapNotificationWithUser(row)),
      total: parseInt(countResult?.total || '0'),
      unreadCount: parseInt(countResult?.unread || '0'),
    };
  },

  /**
   * Mark notifications as read
   */
  async markAsRead(userId: string, notificationIds: string[]): Promise<number> {
    if (notificationIds.length === 0) return 0;

    const result = await query<{ id: string }>(
      `UPDATE notifications
       SET is_read = TRUE, read_at = NOW()
       WHERE user_id = $1 AND id = ANY($2) AND is_read = FALSE
       RETURNING id`,
      [userId, notificationIds]
    );

    log.debug(`Marked ${result.rows.length} notifications as read for user ${userId}`);

    return result.rows.length;
  },

  /**
   * Mark all notifications as read
   */
  async markAllAsRead(userId: string, category?: NotificationCategory): Promise<number> {
    let sql = `UPDATE notifications SET is_read = TRUE, read_at = NOW()
               WHERE user_id = $1 AND is_read = FALSE`;
    const params: string[] = [userId];

    if (category) {
      sql += ' AND category = $2';
      params.push(category);
    }

    sql += ' RETURNING id';

    const result = await query<{ id: string }>(sql, params);

    log.debug(`Marked all ${result.rows.length} notifications as read for user ${userId}`);

    return result.rows.length;
  },

  /**
   * Delete a notification
   */
  async delete(userId: string, notificationId: string): Promise<boolean> {
    const result = await query<{ id: string }>(
      'DELETE FROM notifications WHERE user_id = $1 AND id = $2 RETURNING id',
      [userId, notificationId]
    );

    return result.rows.length > 0;
  },

  /**
   * Get notification preferences for a user
   */
  async getPreferences(userId: string, category: NotificationCategory): Promise<NotificationPreferences> {
    const row = await queryOne<{
      category: string;
      in_app_enabled: boolean;
      push_enabled: boolean;
      email_enabled: boolean;
      quiet_hours_start: string | null;
      quiet_hours_end: string | null;
    }>(
      `SELECT * FROM notification_preferences WHERE user_id = $1 AND category = $2`,
      [userId, category]
    );

    if (!row) {
      // Return defaults
      return {
        category,
        inAppEnabled: true,
        pushEnabled: true,
        emailEnabled: false,
      };
    }

    return {
      category: row.category as NotificationCategory,
      inAppEnabled: row.in_app_enabled,
      pushEnabled: row.push_enabled,
      emailEnabled: row.email_enabled,
      quietHoursStart: row.quiet_hours_start ?? undefined,
      quietHoursEnd: row.quiet_hours_end ?? undefined,
    };
  },

  /**
   * Update notification preferences
   */
  async updatePreferences(
    userId: string,
    category: NotificationCategory,
    preferences: Partial<Omit<NotificationPreferences, 'category'>>
  ): Promise<NotificationPreferences> {
    const row = await queryOne<{
      category: string;
      in_app_enabled: boolean;
      push_enabled: boolean;
      email_enabled: boolean;
      quiet_hours_start: string | null;
      quiet_hours_end: string | null;
    }>(
      `INSERT INTO notification_preferences (user_id, category, in_app_enabled, push_enabled, email_enabled, quiet_hours_start, quiet_hours_end)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (user_id, category) DO UPDATE SET
         in_app_enabled = COALESCE($3, notification_preferences.in_app_enabled),
         push_enabled = COALESCE($4, notification_preferences.push_enabled),
         email_enabled = COALESCE($5, notification_preferences.email_enabled),
         quiet_hours_start = COALESCE($6, notification_preferences.quiet_hours_start),
         quiet_hours_end = COALESCE($7, notification_preferences.quiet_hours_end),
         updated_at = NOW()
       RETURNING *`,
      [
        userId,
        category,
        preferences.inAppEnabled ?? true,
        preferences.pushEnabled ?? true,
        preferences.emailEnabled ?? false,
        preferences.quietHoursStart ?? null,
        preferences.quietHoursEnd ?? null,
      ]
    );

    if (!row) {
      throw new Error('Failed to update preferences');
    }

    return {
      category: row.category as NotificationCategory,
      inAppEnabled: row.in_app_enabled,
      pushEnabled: row.push_enabled,
      emailEnabled: row.email_enabled,
      quietHoursStart: row.quiet_hours_start ?? undefined,
      quietHoursEnd: row.quiet_hours_end ?? undefined,
    };
  },

  /**
   * Get unread count for a user
   */
  async getUnreadCount(userId: string): Promise<number> {
    const result = await queryOne<{ count: string }>(
      `SELECT COUNT(*) as count FROM notifications
       WHERE user_id = $1 AND is_read = FALSE
       AND (expires_at IS NULL OR expires_at > NOW())`,
      [userId]
    );

    return parseInt(result?.count || '0');
  },

  // ============================================
  // Helper methods for specific notification types
  // ============================================

  /**
   * Send verification witness request notification
   */
  async sendVerificationWitnessRequest(
    witnessUserId: string,
    requesterUserId: string,
    verificationId: string,
    achievementName: string
  ): Promise<Notification> {
    const requester = await queryOne<{ username: string; display_name: string | null }>(
      'SELECT username, display_name FROM users WHERE id = $1',
      [requesterUserId]
    );

    const displayName = requester?.display_name || requester?.username || 'Someone';

    return this.create({
      userId: witnessUserId,
      type: 'VERIFICATION_WITNESS_REQUEST',
      category: 'verification',
      title: 'Witness Request',
      body: `${displayName} is asking you to verify their "${achievementName}" achievement`,
      icon: 'shield-check',
      actionUrl: `/achievements/verify/${verificationId}`,
      actionLabel: 'Review',
      relatedUserId: requesterUserId,
      relatedEntityType: 'verification',
      relatedEntityId: verificationId,
      metadata: { achievementName },
    });
  },

  /**
   * Send verification confirmed notification
   */
  async sendVerificationConfirmed(
    userId: string,
    witnessUserId: string,
    verificationId: string,
    achievementName: string
  ): Promise<Notification> {
    const witness = await queryOne<{ username: string; display_name: string | null }>(
      'SELECT username, display_name FROM users WHERE id = $1',
      [witnessUserId]
    );

    const witnessName = witness?.display_name || witness?.username || 'Your witness';

    return this.create({
      userId,
      type: 'VERIFICATION_CONFIRMED',
      category: 'verification',
      title: 'Achievement Verified!',
      body: `${witnessName} has confirmed your "${achievementName}" achievement. Congratulations!`,
      icon: 'badge-check',
      actionUrl: `/achievements`,
      actionLabel: 'View',
      relatedUserId: witnessUserId,
      relatedEntityType: 'verification',
      relatedEntityId: verificationId,
      metadata: { achievementName },
    });
  },

  /**
   * Send verification rejected notification
   */
  async sendVerificationRejected(
    userId: string,
    witnessUserId: string,
    verificationId: string,
    achievementName: string,
    reason?: string
  ): Promise<Notification> {
    const witness = await queryOne<{ username: string; display_name: string | null }>(
      'SELECT username, display_name FROM users WHERE id = $1',
      [witnessUserId]
    );

    const witnessName = witness?.display_name || witness?.username || 'Your witness';

    return this.create({
      userId,
      type: 'VERIFICATION_REJECTED',
      category: 'verification',
      title: 'Verification Declined',
      body: `${witnessName} could not verify your "${achievementName}" achievement.${reason ? ` Reason: ${reason}` : ''}`,
      icon: 'x-circle',
      actionUrl: `/achievements`,
      actionLabel: 'View',
      relatedUserId: witnessUserId,
      relatedEntityType: 'verification',
      relatedEntityId: verificationId,
      metadata: { achievementName, reason },
    });
  },

  // ============================================
  // Private helpers
  // ============================================

  mapNotification(row: {
    id: string;
    user_id: string;
    type: string;
    category: string;
    title: string;
    body: string | null;
    icon: string | null;
    image_url: string | null;
    action_url: string | null;
    action_label: string | null;
    related_user_id: string | null;
    related_entity_type: string | null;
    related_entity_id: string | null;
    metadata: Record<string, unknown>;
    is_read: boolean;
    read_at: Date | null;
    push_sent: boolean;
    push_sent_at: Date | null;
    expires_at: Date | null;
    created_at: Date;
  }): Notification {
    return {
      id: row.id,
      userId: row.user_id,
      type: row.type as NotificationType,
      category: row.category as NotificationCategory,
      title: row.title,
      body: row.body ?? undefined,
      icon: row.icon ?? undefined,
      imageUrl: row.image_url ?? undefined,
      actionUrl: row.action_url ?? undefined,
      actionLabel: row.action_label ?? undefined,
      relatedUserId: row.related_user_id ?? undefined,
      relatedEntityType: row.related_entity_type ?? undefined,
      relatedEntityId: row.related_entity_id ?? undefined,
      metadata: row.metadata,
      isRead: row.is_read,
      readAt: row.read_at ?? undefined,
      pushSent: row.push_sent,
      pushSentAt: row.push_sent_at ?? undefined,
      expiresAt: row.expires_at ?? undefined,
      createdAt: row.created_at,
    };
  },

  mapNotificationWithUser(row: {
    id: string;
    user_id: string;
    type: string;
    category: string;
    title: string;
    body: string | null;
    icon: string | null;
    image_url: string | null;
    action_url: string | null;
    action_label: string | null;
    related_user_id: string | null;
    related_entity_type: string | null;
    related_entity_id: string | null;
    metadata: Record<string, unknown>;
    is_read: boolean;
    read_at: Date | null;
    push_sent: boolean;
    push_sent_at: Date | null;
    expires_at: Date | null;
    created_at: Date;
    related_username: string | null;
    related_display_name: string | null;
    related_avatar_url: string | null;
  }): Notification {
    const notification = this.mapNotification(row);

    if (row.related_username) {
      notification.relatedUser = {
        username: row.related_username,
        displayName: row.related_display_name ?? undefined,
        avatarUrl: row.related_avatar_url ?? undefined,
      };
    }

    return notification;
  },
};

export default NotificationService;
