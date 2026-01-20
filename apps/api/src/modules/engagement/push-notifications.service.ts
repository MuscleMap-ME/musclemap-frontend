/**
 * Push Notifications Service
 *
 * Manages push notification tokens and scheduling:
 * - Token registration/unregistration
 * - Notification scheduling
 * - Smart notification timing
 * - Re-engagement campaigns
 */

import { queryOne, queryAll, query } from '../../db/client';
import { ValidationError } from '../../lib/errors';
import { loggers } from '../../lib/logger';

const log = loggers.http;

export type Platform = 'ios' | 'android' | 'web';
export type NotificationType =
  | 'streak_at_risk'
  | 'challenge_expiring'
  | 'rival_activity'
  | 'daily_reward'
  | 'event_starting'
  | 'workout_reminder'
  | 'weekly_digest'
  | 're_engagement';

interface PushToken {
  id: string;
  userId: string;
  token: string;
  platform: Platform;
  isActive: boolean;
  createdAt: Date;
  lastUsedAt: Date | null;
}

interface ScheduledNotification {
  id: string;
  userId: string;
  notificationType: NotificationType;
  scheduledFor: Date;
  payload: Record<string, unknown>;
  isSent: boolean;
  sentAt: Date | null;
}

// Notification priorities (higher = more important)
const _NOTIFICATION_PRIORITIES: Record<NotificationType, number> = {
  streak_at_risk: 10,
  challenge_expiring: 8,
  event_starting: 7,
  daily_reward: 6,
  rival_activity: 5,
  workout_reminder: 4,
  weekly_digest: 3,
  re_engagement: 2,
};

// Default quiet hours (in user's timezone)
const DEFAULT_QUIET_HOURS = {
  start: '22:00',
  end: '08:00',
};

// Rate limiting
const MAX_NOTIFICATIONS_PER_HOUR = 2;
const MAX_NOTIFICATIONS_PER_DAY = 8;
const MIN_INTERVAL_MINUTES = 30;

export const pushNotificationsService = {
  /**
   * Register a push notification token
   */
  async registerToken(
    userId: string,
    token: string,
    platform: Platform
  ): Promise<PushToken> {
    // Validate platform
    if (!['ios', 'android', 'web'].includes(platform)) {
      throw new ValidationError('Invalid platform');
    }

    // Upsert token
    const result = await queryOne<{
      id: string;
      user_id: string;
      token: string;
      platform: string;
      is_active: boolean;
      created_at: Date;
      last_used_at: Date | null;
    }>(
      `INSERT INTO push_notification_tokens (user_id, token, platform, is_active)
       VALUES ($1, $2, $3, TRUE)
       ON CONFLICT (user_id, token) DO UPDATE SET
         is_active = TRUE,
         last_used_at = NOW()
       RETURNING *`,
      [userId, token, platform]
    );

    log.info({ userId, platform }, 'Push token registered');

    return {
      id: result!.id,
      userId: result!.user_id,
      token: result!.token,
      platform: result!.platform as Platform,
      isActive: result!.is_active,
      createdAt: result!.created_at,
      lastUsedAt: result!.last_used_at,
    };
  },

  /**
   * Unregister a push notification token
   */
  async unregisterToken(userId: string, token: string): Promise<void> {
    await query(
      `UPDATE push_notification_tokens
       SET is_active = FALSE
       WHERE user_id = $1 AND token = $2`,
      [userId, token]
    );

    log.info({ userId }, 'Push token unregistered');
  },

  /**
   * Get active tokens for a user
   */
  async getActiveTokens(userId: string): Promise<PushToken[]> {
    const rows = await queryAll<{
      id: string;
      user_id: string;
      token: string;
      platform: string;
      is_active: boolean;
      created_at: Date;
      last_used_at: Date | null;
    }>(
      `SELECT * FROM push_notification_tokens
       WHERE user_id = $1 AND is_active = TRUE`,
      [userId]
    );

    return rows.map((r) => ({
      id: r.id,
      userId: r.user_id,
      token: r.token,
      platform: r.platform as Platform,
      isActive: r.is_active,
      createdAt: r.created_at,
      lastUsedAt: r.last_used_at,
    }));
  },

  /**
   * Schedule a notification
   */
  async scheduleNotification(
    userId: string,
    notificationType: NotificationType,
    scheduledFor: Date,
    payload: Record<string, unknown>
  ): Promise<ScheduledNotification> {
    // Check if user has active tokens
    const tokens = await this.getActiveTokens(userId);
    if (tokens.length === 0) {
      log.warn({ userId }, 'No active push tokens for user');
    }

    // Check rate limits
    const canSend = await this.checkRateLimits(userId, scheduledFor);
    if (!canSend) {
      log.warn({ userId, notificationType }, 'Rate limit reached, notification not scheduled');
      throw new ValidationError('Notification rate limit reached');
    }

    // Check quiet hours
    const adjustedTime = await this.adjustForQuietHours(userId, scheduledFor);

    const result = await queryOne<{
      id: string;
      user_id: string;
      notification_type: string;
      scheduled_for: Date;
      payload: Record<string, unknown>;
      is_sent: boolean;
      sent_at: Date | null;
    }>(
      `INSERT INTO notification_schedule (user_id, notification_type, scheduled_for, payload)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [userId, notificationType, adjustedTime, JSON.stringify(payload)]
    );

    log.info({ userId, notificationType, scheduledFor: adjustedTime }, 'Notification scheduled');

    return {
      id: result!.id,
      userId: result!.user_id,
      notificationType: result!.notification_type as NotificationType,
      scheduledFor: result!.scheduled_for,
      payload: result!.payload,
      isSent: result!.is_sent,
      sentAt: result!.sent_at,
    };
  },

  /**
   * Get pending notifications ready to send
   */
  async getPendingNotifications(limit: number = 100): Promise<ScheduledNotification[]> {
    const rows = await queryAll<{
      id: string;
      user_id: string;
      notification_type: string;
      scheduled_for: Date;
      payload: Record<string, unknown>;
      is_sent: boolean;
      sent_at: Date | null;
    }>(
      `SELECT * FROM notification_schedule
       WHERE is_sent = FALSE AND scheduled_for <= NOW()
       ORDER BY scheduled_for ASC
       LIMIT $1`,
      [limit]
    );

    return rows.map((r) => ({
      id: r.id,
      userId: r.user_id,
      notificationType: r.notification_type as NotificationType,
      scheduledFor: r.scheduled_for,
      payload: r.payload,
      isSent: r.is_sent,
      sentAt: r.sent_at,
    }));
  },

  /**
   * Mark notification as sent
   */
  async markAsSent(notificationId: string): Promise<void> {
    await query(
      `UPDATE notification_schedule
       SET is_sent = TRUE, sent_at = NOW()
       WHERE id = $1`,
      [notificationId]
    );
  },

  /**
   * Cancel a scheduled notification
   */
  async cancelNotification(notificationId: string): Promise<void> {
    await query(
      `DELETE FROM notification_schedule WHERE id = $1 AND is_sent = FALSE`,
      [notificationId]
    );
  },

  /**
   * Schedule streak at risk notification
   */
  async scheduleStreakAtRiskNotification(
    userId: string,
    streakType: string,
    currentStreak: number
  ): Promise<void> {
    // Schedule for 8 PM local time
    const scheduledFor = new Date();
    scheduledFor.setHours(20, 0, 0, 0);

    // If it's already past 8 PM, don't schedule
    if (scheduledFor < new Date()) {
      return;
    }

    // Check if already scheduled today
    const existing = await queryOne<{ id: string }>(
      `SELECT id FROM notification_schedule
       WHERE user_id = $1
         AND notification_type = 'streak_at_risk'
         AND scheduled_for::date = CURRENT_DATE
         AND is_sent = FALSE`,
      [userId]
    );

    if (existing) {
      return; // Already scheduled
    }

    await this.scheduleNotification(userId, 'streak_at_risk', scheduledFor, {
      streakType,
      currentStreak,
      title: `Your ${currentStreak}-day streak is at risk!`,
      body: `Open MuscleMap now to keep your ${streakType} streak alive.`,
    });
  },

  /**
   * Schedule challenge expiring notification
   */
  async scheduleChallengeExpiringNotification(
    userId: string,
    challengeId: string,
    challengeName: string,
    expiresAt: Date
  ): Promise<void> {
    // Schedule 2 hours before expiration
    const scheduledFor = new Date(expiresAt.getTime() - 2 * 60 * 60 * 1000);

    if (scheduledFor < new Date()) {
      return; // Already past notification time
    }

    await this.scheduleNotification(userId, 'challenge_expiring', scheduledFor, {
      challengeId,
      challengeName,
      title: 'Challenge expiring soon!',
      body: `"${challengeName}" expires in 2 hours. Complete it now!`,
    });
  },

  /**
   * Schedule daily reward reminder
   */
  async scheduleDailyRewardReminder(userId: string): Promise<void> {
    const scheduledFor = new Date();
    scheduledFor.setHours(9, 0, 0, 0);

    // If past 9 AM, schedule for tomorrow
    if (scheduledFor < new Date()) {
      scheduledFor.setDate(scheduledFor.getDate() + 1);
    }

    await this.scheduleNotification(userId, 'daily_reward', scheduledFor, {
      title: 'Daily reward ready!',
      body: 'Claim your daily login reward and keep your streak going!',
    });
  },

  /**
   * Schedule re-engagement notification for inactive user
   */
  async scheduleReEngagement(
    userId: string,
    daysSinceLastActivity: number
  ): Promise<void> {
    const templates: Record<number, { title: string; body: string; bonusCredits?: number }> = {
      1: {
        title: 'Your streak is at risk!',
        body: 'Open now to keep your progress alive.',
      },
      3: {
        title: 'Your crew misses you!',
        body: 'Come back and see what your friends have been up to.',
      },
      7: {
        title: 'Come back for 100 bonus credits!',
        body: 'We saved your progress. Claim your welcome back reward!',
        bonusCredits: 100,
      },
      14: {
        title: 'Your personal records are still there!',
        body: 'Ready to beat them? 200 bonus credits waiting for you.',
        bonusCredits: 200,
      },
      30: {
        title: "It's never too late to start again",
        body: 'Start fresh with 500 bonus credits. Your journey awaits!',
        bonusCredits: 500,
      },
    };

    const template = templates[daysSinceLastActivity];
    if (!template) return;

    const scheduledFor = new Date();
    scheduledFor.setHours(10, 0, 0, 0);

    await this.scheduleNotification(userId, 're_engagement', scheduledFor, {
      ...template,
      daysSinceLastActivity,
    });
  },

  /**
   * Check if notification can be sent (rate limits)
   */
  async checkRateLimits(userId: string, scheduledFor: Date): Promise<boolean> {
    // Check hourly limit
    const hourStart = new Date(scheduledFor);
    hourStart.setMinutes(0, 0, 0);
    const hourEnd = new Date(hourStart.getTime() + 60 * 60 * 1000);

    const hourlyCount = await queryOne<{ count: string }>(
      `SELECT COUNT(*) as count FROM notification_schedule
       WHERE user_id = $1
         AND scheduled_for >= $2 AND scheduled_for < $3`,
      [userId, hourStart, hourEnd]
    );

    if (parseInt(hourlyCount?.count || '0', 10) >= MAX_NOTIFICATIONS_PER_HOUR) {
      return false;
    }

    // Check daily limit
    const dayStart = new Date(scheduledFor);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);

    const dailyCount = await queryOne<{ count: string }>(
      `SELECT COUNT(*) as count FROM notification_schedule
       WHERE user_id = $1
         AND scheduled_for >= $2 AND scheduled_for < $3`,
      [userId, dayStart, dayEnd]
    );

    if (parseInt(dailyCount?.count || '0', 10) >= MAX_NOTIFICATIONS_PER_DAY) {
      return false;
    }

    // Check minimum interval
    const minInterval = new Date(scheduledFor.getTime() - MIN_INTERVAL_MINUTES * 60 * 1000);

    const recentCount = await queryOne<{ count: string }>(
      `SELECT COUNT(*) as count FROM notification_schedule
       WHERE user_id = $1
         AND scheduled_for > $2 AND scheduled_for <= $3`,
      [userId, minInterval, scheduledFor]
    );

    if (parseInt(recentCount?.count || '0', 10) > 0) {
      return false;
    }

    return true;
  },

  /**
   * Adjust notification time for quiet hours
   */
  async adjustForQuietHours(userId: string, scheduledFor: Date): Promise<Date> {
    // Get user's quiet hours preference (or use defaults)
    const prefs = await queryOne<{
      quiet_hours_start: string;
      quiet_hours_end: string;
    }>(
      `SELECT quiet_hours_start, quiet_hours_end FROM notification_preferences
       WHERE user_id = $1`,
      [userId]
    );

    const quietStart = prefs?.quiet_hours_start || DEFAULT_QUIET_HOURS.start;
    const quietEnd = prefs?.quiet_hours_end || DEFAULT_QUIET_HOURS.end;

    const [startHour, startMin] = quietStart.split(':').map(Number);
    const [endHour, endMin] = quietEnd.split(':').map(Number);

    const hour = scheduledFor.getHours();
    const minute = scheduledFor.getMinutes();
    const currentTime = hour * 60 + minute;
    const quietStartTime = startHour * 60 + startMin;
    const quietEndTime = endHour * 60 + endMin;

    // Check if scheduled time is in quiet hours
    const isInQuietHours =
      quietStartTime > quietEndTime
        ? currentTime >= quietStartTime || currentTime < quietEndTime // Overnight quiet hours
        : currentTime >= quietStartTime && currentTime < quietEndTime; // Same-day quiet hours

    if (isInQuietHours) {
      // Move to end of quiet hours
      const adjusted = new Date(scheduledFor);
      adjusted.setHours(endHour, endMin, 0, 0);

      // If overnight and we're in the "before midnight" part, move to next day
      if (quietStartTime > quietEndTime && currentTime >= quietStartTime) {
        adjusted.setDate(adjusted.getDate() + 1);
      }

      return adjusted;
    }

    return scheduledFor;
  },

  /**
   * Get notification history for user
   */
  async getNotificationHistory(
    userId: string,
    limit: number = 50
  ): Promise<ScheduledNotification[]> {
    const rows = await queryAll<{
      id: string;
      user_id: string;
      notification_type: string;
      scheduled_for: Date;
      payload: Record<string, unknown>;
      is_sent: boolean;
      sent_at: Date | null;
    }>(
      `SELECT * FROM notification_schedule
       WHERE user_id = $1
       ORDER BY scheduled_for DESC
       LIMIT $2`,
      [userId, limit]
    );

    return rows.map((r) => ({
      id: r.id,
      userId: r.user_id,
      notificationType: r.notification_type as NotificationType,
      scheduledFor: r.scheduled_for,
      payload: r.payload,
      isSent: r.is_sent,
      sentAt: r.sent_at,
    }));
  },
};
