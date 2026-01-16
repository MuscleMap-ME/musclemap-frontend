/**
 * Engagement Module
 *
 * Comprehensive engagement system for driving daily active usage:
 * - Daily login rewards with streak tracking
 * - Multiple streak types (workout, nutrition, sleep, social)
 * - Daily and weekly challenges
 * - Time-limited events
 * - Recovery tracking for rest days
 * - Push notifications
 */

export { dailyLoginService, STREAK_FREEZE_COST } from './daily-login.service';
export { streaksService, type StreakType } from './streaks.service';
export { challengesService, CHALLENGE_TYPES } from './challenges.service';
export { eventsService, type EventType } from './events.service';
export { recoveryService } from './recovery.service';
export { pushNotificationsService, type Platform, type NotificationType } from './push-notifications.service';
