/**
 * Notification Triggers Service
 *
 * Automatically schedules notifications based on user activity:
 * - Streak at risk (no activity by 8pm)
 * - Challenge expiring (2 hours before midnight)
 * - Daily reward ready (9am daily)
 * - Re-engagement (1, 3, 7, 14, 30 days inactive)
 * - Rival activity (immediate on significant events)
 */

import { queryAll, query } from '../../db/client';
import { pushNotificationsService } from './push-notifications.service';
import { loggers } from '../../lib/logger';

const log = loggers.http;

interface UserWithStreak {
  user_id: string;
  streak_type: string;
  current_streak: number;
  last_activity_date: string;
}

interface UserWithChallenge {
  user_id: string;
  challenge_id: string;
  challenge_type: string;
  expires_at: Date;
  is_complete: boolean;
}

interface InactiveUser {
  user_id: string;
  days_inactive: number;
  last_activity: Date;
}

export const notificationTriggersService = {
  /**
   * Check and schedule streak-at-risk notifications
   * Should run at ~6-7pm daily to catch users before 8pm deadline
   */
  async scheduleStreakAtRiskNotifications(): Promise<number> {
    const today = new Date().toISOString().split('T')[0];

    // Find users with active streaks who haven't logged in today
    const usersAtRisk = await queryAll<UserWithStreak>(
      `SELECT DISTINCT us.user_id, us.streak_type, us.current_streak, us.last_activity_date::text
       FROM user_streaks us
       WHERE us.current_streak > 0
         AND us.last_activity_date IS NOT NULL
         AND us.last_activity_date < $1
         AND EXISTS (
           SELECT 1 FROM push_notification_tokens pnt
           WHERE pnt.user_id = us.user_id AND pnt.is_active = TRUE
         )
       ORDER BY us.current_streak DESC`,
      [today]
    );

    let scheduled = 0;

    for (const user of usersAtRisk) {
      try {
        // Skip if streak is only 1 day (not much to lose)
        if (user.current_streak < 2) continue;

        await pushNotificationsService.scheduleStreakAtRiskNotification(
          user.user_id,
          user.streak_type,
          user.current_streak
        );
        scheduled++;
      } catch (error) {
        log.warn({ userId: user.user_id, error }, 'Failed to schedule streak-at-risk notification');
      }
    }

    log.info({ scheduled, total: usersAtRisk.length }, 'Scheduled streak-at-risk notifications');
    return scheduled;
  },

  /**
   * Check and schedule challenge-expiring notifications
   * Should run hourly to catch challenges expiring in ~2 hours
   */
  async scheduleChallengeExpiringNotifications(): Promise<number> {
    const now = new Date();
    const twoHoursFromNow = new Date(now.getTime() + 2 * 60 * 60 * 1000);
    const threeHoursFromNow = new Date(now.getTime() + 3 * 60 * 60 * 1000);

    // Find challenges expiring in 2-3 hours that aren't complete or claimed
    const expiringChallenges = await queryAll<UserWithChallenge>(
      `SELECT dc.user_id, dc.id as challenge_id, dc.challenge_type, dc.expires_at, dc.is_complete
       FROM daily_challenges dc
       WHERE dc.expires_at > $1
         AND dc.expires_at <= $2
         AND dc.is_complete = FALSE
         AND dc.is_claimed = FALSE
         AND EXISTS (
           SELECT 1 FROM push_notification_tokens pnt
           WHERE pnt.user_id = dc.user_id AND pnt.is_active = TRUE
         )`,
      [twoHoursFromNow, threeHoursFromNow]
    );

    let scheduled = 0;

    for (const challenge of expiringChallenges) {
      try {
        await pushNotificationsService.scheduleChallengeExpiringNotification(
          challenge.user_id,
          challenge.challenge_id,
          challenge.challenge_type,
          challenge.expires_at
        );
        scheduled++;
      } catch (error) {
        log.warn({ userId: challenge.user_id, error }, 'Failed to schedule challenge-expiring notification');
      }
    }

    log.info({ scheduled, total: expiringChallenges.length }, 'Scheduled challenge-expiring notifications');
    return scheduled;
  },

  /**
   * Check and schedule daily reward reminders
   * Should run at ~8am to notify users about their daily reward
   */
  async scheduleDailyRewardReminders(): Promise<number> {
    const today = new Date().toISOString().split('T')[0];

    // Find users who haven't claimed today's reward
    const usersWithUnclaimedReward = await queryAll<{ user_id: string }>(
      `SELECT u.id as user_id
       FROM users u
       WHERE u.last_active_at >= NOW() - INTERVAL '30 days'
         AND NOT EXISTS (
           SELECT 1 FROM daily_login_rewards dlr
           WHERE dlr.user_id = u.id AND dlr.login_date = $1
         )
         AND EXISTS (
           SELECT 1 FROM push_notification_tokens pnt
           WHERE pnt.user_id = u.id AND pnt.is_active = TRUE
         )
       LIMIT 1000`,
      [today]
    );

    let scheduled = 0;

    for (const user of usersWithUnclaimedReward) {
      try {
        await pushNotificationsService.scheduleDailyRewardReminder(user.user_id);
        scheduled++;
      } catch (error) {
        log.warn({ userId: user.user_id, error }, 'Failed to schedule daily reward reminder');
      }
    }

    log.info({ scheduled, total: usersWithUnclaimedReward.length }, 'Scheduled daily reward reminders');
    return scheduled;
  },

  /**
   * Check and schedule re-engagement notifications
   * Should run daily to catch inactive users at different intervals
   */
  async scheduleReEngagementNotifications(): Promise<number> {
    // Find users inactive for 1, 3, 7, 14, or 30 days
    const inactiveUsers = await queryAll<InactiveUser>(
      `SELECT u.id as user_id,
              EXTRACT(DAY FROM NOW() - u.last_active_at)::int as days_inactive,
              u.last_active_at as last_activity
       FROM users u
       WHERE u.last_active_at IS NOT NULL
         AND EXTRACT(DAY FROM NOW() - u.last_active_at)::int IN (1, 3, 7, 14, 30)
         AND EXISTS (
           SELECT 1 FROM push_notification_tokens pnt
           WHERE pnt.user_id = u.id AND pnt.is_active = TRUE
         )
         AND NOT EXISTS (
           SELECT 1 FROM notification_schedule ns
           WHERE ns.user_id = u.id
             AND ns.notification_type = 're_engagement'
             AND ns.scheduled_for > NOW() - INTERVAL '1 day'
         )
       LIMIT 500`
    );

    let scheduled = 0;

    for (const user of inactiveUsers) {
      try {
        await pushNotificationsService.scheduleReEngagement(user.user_id, user.days_inactive);
        scheduled++;
      } catch (error) {
        log.warn({ userId: user.user_id, error }, 'Failed to schedule re-engagement notification');
      }
    }

    log.info({ scheduled, total: inactiveUsers.length }, 'Scheduled re-engagement notifications');
    return scheduled;
  },

  /**
   * Trigger rival activity notification (called immediately on significant events)
   */
  async triggerRivalActivityNotification(
    rivalUserId: string,
    activityType: 'workout' | 'pr' | 'milestone',
    activityData: Record<string, unknown>
  ): Promise<void> {
    // Find users who have this user as a rival
    const usersWithRival = await queryAll<{ user_id: string }>(
      `SELECT user_id FROM rivalries
       WHERE rival_id = $1 AND status = 'active'`,
      [rivalUserId]
    );

    for (const user of usersWithRival) {
      try {
        // Create a social trigger record
        await query(
          `INSERT INTO social_triggers (trigger_user_id, target_user_id, trigger_type, trigger_data)
           VALUES ($1, $2, $3, $4)`,
          [
            rivalUserId,
            user.user_id,
            `rival_${activityType}`,
            JSON.stringify(activityData),
          ]
        );

        // Schedule immediate notification
        const titles: Record<string, string> = {
          workout: 'Your rival just worked out!',
          pr: 'Your rival set a new PR!',
          milestone: 'Your rival hit a milestone!',
        };

        await pushNotificationsService.scheduleNotification(
          user.user_id,
          'rival_activity',
          new Date(),
          {
            rivalUserId,
            activityType,
            title: titles[activityType],
            body: activityData.message || `Time to step up your game!`,
            ...activityData,
          }
        );
      } catch (error) {
        log.warn({ userId: user.user_id, rivalUserId, error }, 'Failed to trigger rival notification');
      }
    }

    log.info({ rivalUserId, activityType, recipientCount: usersWithRival.length }, 'Triggered rival activity notifications');
  },

  /**
   * Process and send all pending notifications
   * Should run every minute or so
   */
  async processPendingNotifications(): Promise<number> {
    const pending = await pushNotificationsService.getPendingNotifications(100);
    let sent = 0;

    for (const notification of pending) {
      try {
        // Get user's push tokens
        const tokens = await pushNotificationsService.getActiveTokens(notification.userId);

        if (tokens.length === 0) {
          // Mark as sent even if no tokens (to prevent retry loop)
          await pushNotificationsService.markAsSent(notification.id);
          continue;
        }

        // In production, this would call Firebase/APNS/web push
        // For now, we just mark as sent and log
        log.info(
          {
            notificationId: notification.id,
            userId: notification.userId,
            type: notification.notificationType,
            tokenCount: tokens.length,
          },
          'Would send push notification'
        );

        await pushNotificationsService.markAsSent(notification.id);
        sent++;
      } catch (error) {
        log.error({ notificationId: notification.id, error }, 'Failed to process notification');
      }
    }

    if (sent > 0) {
      log.info({ sent, pending: pending.length }, 'Processed pending notifications');
    }

    return sent;
  },

  /**
   * Run all scheduled triggers (for cron job)
   */
  async runAllTriggers(): Promise<{
    streakAtRisk: number;
    challengeExpiring: number;
    dailyReward: number;
    reEngagement: number;
    processed: number;
  }> {
    const now = new Date();
    const hour = now.getHours();

    let streakAtRisk = 0;
    let challengeExpiring = 0;
    let dailyReward = 0;
    let reEngagement = 0;

    // Streak at risk: run between 6-8pm
    if (hour >= 18 && hour < 20) {
      streakAtRisk = await this.scheduleStreakAtRiskNotifications();
    }

    // Challenge expiring: run every hour
    challengeExpiring = await this.scheduleChallengeExpiringNotifications();

    // Daily reward: run between 8-10am
    if (hour >= 8 && hour < 10) {
      dailyReward = await this.scheduleDailyRewardReminders();
    }

    // Re-engagement: run between 9-11am
    if (hour >= 9 && hour < 11) {
      reEngagement = await this.scheduleReEngagementNotifications();
    }

    // Always process pending notifications
    const processed = await this.processPendingNotifications();

    return { streakAtRisk, challengeExpiring, dailyReward, reEngagement, processed };
  },
};

export default notificationTriggersService;
