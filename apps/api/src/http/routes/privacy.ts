/**
 * Privacy Mode Routes (Fastify)
 *
 * Manages user privacy preferences and minimalist mode settings.
 * Allows users to opt out of community features and data collection.
 *
 * Philosophy:
 * - Users should be able to use MuscleMap as a pure personal fitness tool
 * - All community/social features should be optional
 * - User data should be excluded from comparison when they opt out
 * - The UI should respect these preferences and strip down accordingly
 */

import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { authenticate } from './auth';
import { db } from '../../db/client';
import { loggers } from '../../lib/logger';

const log = loggers.core;

// Privacy settings schema for validation
const privacySettingsSchema = z.object({
  // Master toggle
  minimalistMode: z.boolean().optional(),

  // Community feature opt-outs
  optOutLeaderboards: z.boolean().optional(),
  optOutCommunityFeed: z.boolean().optional(),
  optOutCrews: z.boolean().optional(),
  optOutRivals: z.boolean().optional(),
  optOutHangouts: z.boolean().optional(),
  optOutMessaging: z.boolean().optional(),
  optOutHighFives: z.boolean().optional(),

  // Data collection opt-outs
  excludeFromStatsComparison: z.boolean().optional(),
  excludeFromLocationFeatures: z.boolean().optional(),
  excludeFromActivityFeed: z.boolean().optional(),

  // UI preferences
  hideGamification: z.boolean().optional(),
  hideAchievements: z.boolean().optional(),
  hideTips: z.boolean().optional(),
  hideSocialNotifications: z.boolean().optional(),
  hideProgressComparisons: z.boolean().optional(),

  // Presence & activity
  disablePresenceTracking: z.boolean().optional(),
  disableWorkoutSharing: z.boolean().optional(),

  // Profile
  profileCompletelyPrivate: z.boolean().optional(),
});

export type PrivacySettings = z.infer<typeof privacySettingsSchema>;

// Full privacy settings response type
export interface PrivacySettingsResponse {
  minimalistMode: boolean;
  optOutLeaderboards: boolean;
  optOutCommunityFeed: boolean;
  optOutCrews: boolean;
  optOutRivals: boolean;
  optOutHangouts: boolean;
  optOutMessaging: boolean;
  optOutHighFives: boolean;
  excludeFromStatsComparison: boolean;
  excludeFromLocationFeatures: boolean;
  excludeFromActivityFeed: boolean;
  hideGamification: boolean;
  hideAchievements: boolean;
  hideTips: boolean;
  hideSocialNotifications: boolean;
  hideProgressComparisons: boolean;
  disablePresenceTracking: boolean;
  disableWorkoutSharing: boolean;
  profileCompletelyPrivate: boolean;
}

// Default privacy settings (all features enabled by default)
const DEFAULT_PRIVACY_SETTINGS: PrivacySettingsResponse = {
  minimalistMode: false,
  optOutLeaderboards: false,
  optOutCommunityFeed: false,
  optOutCrews: false,
  optOutRivals: false,
  optOutHangouts: false,
  optOutMessaging: false,
  optOutHighFives: false,
  excludeFromStatsComparison: false,
  excludeFromLocationFeatures: false,
  excludeFromActivityFeed: false,
  hideGamification: false,
  hideAchievements: false,
  hideTips: false,
  hideSocialNotifications: false,
  hideProgressComparisons: false,
  disablePresenceTracking: false,
  disableWorkoutSharing: false,
  profileCompletelyPrivate: false,
};

/**
 * Get user's privacy settings from database
 */
async function getUserPrivacySettings(userId: string): Promise<PrivacySettingsResponse> {
  const row = await db.queryOne<{
    minimalist_mode: boolean;
    opt_out_leaderboards: boolean;
    opt_out_community_feed: boolean;
    opt_out_crews: boolean;
    opt_out_rivals: boolean;
    opt_out_hangouts: boolean;
    opt_out_messaging: boolean;
    opt_out_high_fives: boolean;
    exclude_from_stats_comparison: boolean;
    exclude_from_location_features: boolean;
    exclude_from_activity_feed: boolean;
    hide_gamification: boolean;
    hide_achievements: boolean;
    hide_tips: boolean;
    hide_social_notifications: boolean;
    hide_progress_comparisons: boolean;
    disable_presence_tracking: boolean;
    disable_workout_sharing: boolean;
    profile_completely_private: boolean;
  }>(
    `SELECT * FROM user_privacy_mode WHERE user_id = $1`,
    [userId]
  );

  if (!row) {
    return DEFAULT_PRIVACY_SETTINGS;
  }

  return {
    minimalistMode: row.minimalist_mode ?? false,
    optOutLeaderboards: row.opt_out_leaderboards ?? false,
    optOutCommunityFeed: row.opt_out_community_feed ?? false,
    optOutCrews: row.opt_out_crews ?? false,
    optOutRivals: row.opt_out_rivals ?? false,
    optOutHangouts: row.opt_out_hangouts ?? false,
    optOutMessaging: row.opt_out_messaging ?? false,
    optOutHighFives: row.opt_out_high_fives ?? false,
    excludeFromStatsComparison: row.exclude_from_stats_comparison ?? false,
    excludeFromLocationFeatures: row.exclude_from_location_features ?? false,
    excludeFromActivityFeed: row.exclude_from_activity_feed ?? false,
    hideGamification: row.hide_gamification ?? false,
    hideAchievements: row.hide_achievements ?? false,
    hideTips: row.hide_tips ?? false,
    hideSocialNotifications: row.hide_social_notifications ?? false,
    hideProgressComparisons: row.hide_progress_comparisons ?? false,
    disablePresenceTracking: row.disable_presence_tracking ?? false,
    disableWorkoutSharing: row.disable_workout_sharing ?? false,
    profileCompletelyPrivate: row.profile_completely_private ?? false,
  };
}

/**
 * Check if a user has opted out of a specific feature
 */
export async function hasOptedOut(
  userId: string,
  feature: keyof PrivacySettingsResponse
): Promise<boolean> {
  const settings = await getUserPrivacySettings(userId);

  // If minimalist mode is on, most community features are considered opted out
  if (settings.minimalistMode) {
    const communityFeatures: (keyof PrivacySettingsResponse)[] = [
      'optOutLeaderboards',
      'optOutCommunityFeed',
      'optOutCrews',
      'optOutRivals',
      'optOutHangouts',
      'optOutMessaging',
      'optOutHighFives',
      'excludeFromStatsComparison',
      'excludeFromActivityFeed',
      'disablePresenceTracking',
    ];

    if (communityFeatures.includes(feature)) {
      return true;
    }
  }

  return settings[feature] ?? false;
}

/**
 * Check if a user should be excluded from leaderboards/comparisons
 */
export async function shouldExcludeFromComparisons(userId: string): Promise<boolean> {
  const settings = await getUserPrivacySettings(userId);
  return (
    settings.minimalistMode ||
    settings.excludeFromStatsComparison ||
    settings.optOutLeaderboards
  );
}

export async function registerPrivacyRoutes(app: FastifyInstance) {
  /**
   * GET /privacy
   * Get current user's privacy settings
   */
  app.get('/privacy', { preHandler: authenticate }, async (request, reply) => {
    const userId = request.user!.userId;

    const settings = await getUserPrivacySettings(userId);

    return reply.send({
      data: settings,
    });
  });

  /**
   * PUT /privacy
   * Update user's privacy settings
   */
  app.put('/privacy', { preHandler: authenticate }, async (request, reply) => {
    const userId = request.user!.userId;
    const parsed = privacySettingsSchema.safeParse(request.body);

    if (!parsed.success) {
      return reply.status(400).send({
        error: {
          code: 'VALIDATION',
          message: 'Invalid privacy settings',
          details: parsed.error.errors,
          statusCode: 400,
        },
      });
    }

    const updates = parsed.data;

    // Build dynamic update query
    const setClauses: string[] = [];
    const values: unknown[] = [userId];
    let paramIndex = 2;

    const fieldMappings: Record<keyof PrivacySettings, string> = {
      minimalistMode: 'minimalist_mode',
      optOutLeaderboards: 'opt_out_leaderboards',
      optOutCommunityFeed: 'opt_out_community_feed',
      optOutCrews: 'opt_out_crews',
      optOutRivals: 'opt_out_rivals',
      optOutHangouts: 'opt_out_hangouts',
      optOutMessaging: 'opt_out_messaging',
      optOutHighFives: 'opt_out_high_fives',
      excludeFromStatsComparison: 'exclude_from_stats_comparison',
      excludeFromLocationFeatures: 'exclude_from_location_features',
      excludeFromActivityFeed: 'exclude_from_activity_feed',
      hideGamification: 'hide_gamification',
      hideAchievements: 'hide_achievements',
      hideTips: 'hide_tips',
      hideSocialNotifications: 'hide_social_notifications',
      hideProgressComparisons: 'hide_progress_comparisons',
      disablePresenceTracking: 'disable_presence_tracking',
      disableWorkoutSharing: 'disable_workout_sharing',
      profileCompletelyPrivate: 'profile_completely_private',
    };

    for (const [key, dbColumn] of Object.entries(fieldMappings)) {
      const value = updates[key as keyof PrivacySettings];
      if (value !== undefined) {
        setClauses.push(`${dbColumn} = $${paramIndex}`);
        values.push(value);
        paramIndex++;
      }
    }

    if (setClauses.length === 0) {
      // No updates, just return current settings
      const settings = await getUserPrivacySettings(userId);
      return reply.send({ data: settings });
    }

    // Upsert privacy settings
    const insertColumns = Object.values(fieldMappings).filter((_, i) =>
      Object.keys(fieldMappings)[i] in updates
    );
    const insertValues = Object.entries(fieldMappings)
      .filter(([key]) => key in updates)
      .map(([key]) => updates[key as keyof PrivacySettings]);

    await db.query(
      `INSERT INTO user_privacy_mode (user_id, ${setClauses.map(c => c.split(' = ')[0]).join(', ')}, updated_at)
       VALUES ($1, ${values.slice(1).map((_, i) => `$${i + 2}`).join(', ')}, NOW())
       ON CONFLICT (user_id)
       DO UPDATE SET ${setClauses.join(', ')}, updated_at = NOW()`,
      values
    );

    log.info({ userId, updates }, 'User updated privacy settings');

    // If minimalist mode was enabled, also update related settings
    if (updates.minimalistMode === true) {
      // Update user_profile_extended to opt out of leaderboards
      await db.query(
        `INSERT INTO user_profile_extended (user_id, leaderboard_opt_in, profile_visibility, updated_at)
         VALUES ($1, FALSE, 'private', NOW())
         ON CONFLICT (user_id)
         DO UPDATE SET leaderboard_opt_in = FALSE, profile_visibility = 'private', updated_at = NOW()`,
        [userId]
      );

      // Update user_privacy_settings to hide from feed/map
      await db.query(
        `INSERT INTO user_privacy_settings (user_id, show_in_feed, show_on_map, minimalist_mode, updated_at)
         VALUES ($1, FALSE, FALSE, TRUE, NOW())
         ON CONFLICT (user_id)
         DO UPDATE SET show_in_feed = FALSE, show_on_map = FALSE, minimalist_mode = TRUE, updated_at = NOW()`,
        [userId]
      );

      log.info({ userId }, 'Minimalist mode enabled - updated all related privacy settings');
    }

    // Return updated settings
    const settings = await getUserPrivacySettings(userId);

    return reply.send({
      data: settings,
      message: 'Privacy settings updated successfully',
    });
  });

  /**
   * POST /privacy/enable-minimalist
   * Quick action to enable full minimalist mode
   */
  app.post('/privacy/enable-minimalist', { preHandler: authenticate }, async (request, reply) => {
    const userId = request.user!.userId;

    // Enable all privacy options at once
    await db.query(
      `INSERT INTO user_privacy_mode (
         user_id,
         minimalist_mode,
         opt_out_leaderboards,
         opt_out_community_feed,
         opt_out_crews,
         opt_out_rivals,
         opt_out_hangouts,
         opt_out_messaging,
         opt_out_high_fives,
         exclude_from_stats_comparison,
         exclude_from_location_features,
         exclude_from_activity_feed,
         hide_gamification,
         hide_achievements,
         hide_tips,
         hide_social_notifications,
         hide_progress_comparisons,
         disable_presence_tracking,
         disable_workout_sharing,
         profile_completely_private,
         updated_at
       )
       VALUES ($1, TRUE, TRUE, TRUE, TRUE, TRUE, TRUE, TRUE, TRUE, TRUE, TRUE, TRUE, TRUE, TRUE, TRUE, TRUE, TRUE, TRUE, TRUE, TRUE, NOW())
       ON CONFLICT (user_id)
       DO UPDATE SET
         minimalist_mode = TRUE,
         opt_out_leaderboards = TRUE,
         opt_out_community_feed = TRUE,
         opt_out_crews = TRUE,
         opt_out_rivals = TRUE,
         opt_out_hangouts = TRUE,
         opt_out_messaging = TRUE,
         opt_out_high_fives = TRUE,
         exclude_from_stats_comparison = TRUE,
         exclude_from_location_features = TRUE,
         exclude_from_activity_feed = TRUE,
         hide_gamification = TRUE,
         hide_achievements = TRUE,
         hide_tips = TRUE,
         hide_social_notifications = TRUE,
         hide_progress_comparisons = TRUE,
         disable_presence_tracking = TRUE,
         disable_workout_sharing = TRUE,
         profile_completely_private = TRUE,
         updated_at = NOW()`,
      [userId]
    );

    // Also update related tables
    await db.query(
      `INSERT INTO user_profile_extended (user_id, leaderboard_opt_in, profile_visibility, updated_at)
       VALUES ($1, FALSE, 'private', NOW())
       ON CONFLICT (user_id)
       DO UPDATE SET leaderboard_opt_in = FALSE, profile_visibility = 'private', updated_at = NOW()`,
      [userId]
    );

    await db.query(
      `INSERT INTO user_privacy_settings (user_id, show_in_feed, show_on_map, share_location, minimalist_mode, updated_at)
       VALUES ($1, FALSE, FALSE, FALSE, TRUE, NOW())
       ON CONFLICT (user_id)
       DO UPDATE SET show_in_feed = FALSE, show_on_map = FALSE, share_location = FALSE, minimalist_mode = TRUE, updated_at = NOW()`,
      [userId]
    );

    log.info({ userId }, 'Full minimalist mode enabled');

    return reply.send({
      data: {
        minimalistMode: true,
        message: 'Minimalist mode enabled. All community features disabled. Your data is excluded from all comparisons and public features.',
      },
    });
  });

  /**
   * POST /privacy/disable-minimalist
   * Quick action to restore default settings
   */
  app.post('/privacy/disable-minimalist', { preHandler: authenticate }, async (request, reply) => {
    const userId = request.user!.userId;

    // Reset all privacy options to defaults
    await db.query(
      `UPDATE user_privacy_mode SET
         minimalist_mode = FALSE,
         opt_out_leaderboards = FALSE,
         opt_out_community_feed = FALSE,
         opt_out_crews = FALSE,
         opt_out_rivals = FALSE,
         opt_out_hangouts = FALSE,
         opt_out_messaging = FALSE,
         opt_out_high_fives = FALSE,
         exclude_from_stats_comparison = FALSE,
         exclude_from_location_features = FALSE,
         exclude_from_activity_feed = FALSE,
         hide_gamification = FALSE,
         hide_achievements = FALSE,
         hide_tips = FALSE,
         hide_social_notifications = FALSE,
         hide_progress_comparisons = FALSE,
         disable_presence_tracking = FALSE,
         disable_workout_sharing = FALSE,
         profile_completely_private = FALSE,
         updated_at = NOW()
       WHERE user_id = $1`,
      [userId]
    );

    // Also update related tables
    await db.query(
      `UPDATE user_profile_extended SET
         leaderboard_opt_in = TRUE,
         profile_visibility = 'public',
         updated_at = NOW()
       WHERE user_id = $1`,
      [userId]
    );

    await db.query(
      `UPDATE user_privacy_settings SET
         show_in_feed = TRUE,
         show_on_map = TRUE,
         minimalist_mode = FALSE,
         updated_at = NOW()
       WHERE user_id = $1`,
      [userId]
    );

    log.info({ userId }, 'Minimalist mode disabled - restored default settings');

    return reply.send({
      data: {
        minimalistMode: false,
        message: 'Default settings restored. Community features are now enabled.',
      },
    });
  });

  /**
   * GET /privacy/summary
   * Get a user-friendly summary of what features are enabled/disabled
   */
  app.get('/privacy/summary', { preHandler: authenticate }, async (request, reply) => {
    const userId = request.user!.userId;
    const settings = await getUserPrivacySettings(userId);

    const enabledFeatures: string[] = [];
    const disabledFeatures: string[] = [];

    // Check each feature category
    if (!settings.minimalistMode) {
      if (!settings.optOutLeaderboards) enabledFeatures.push('Leaderboards');
      else disabledFeatures.push('Leaderboards');

      if (!settings.optOutCommunityFeed) enabledFeatures.push('Community Feed');
      else disabledFeatures.push('Community Feed');

      if (!settings.optOutCrews) enabledFeatures.push('Crews');
      else disabledFeatures.push('Crews');

      if (!settings.optOutRivals) enabledFeatures.push('Rivals');
      else disabledFeatures.push('Rivals');

      if (!settings.optOutHangouts) enabledFeatures.push('Hangouts');
      else disabledFeatures.push('Hangouts');

      if (!settings.optOutMessaging) enabledFeatures.push('Messaging');
      else disabledFeatures.push('Messaging');

      if (!settings.optOutHighFives) enabledFeatures.push('High Fives');
      else disabledFeatures.push('High Fives');

      if (!settings.hideGamification) enabledFeatures.push('Gamification');
      else disabledFeatures.push('Gamification');

      if (!settings.hideAchievements) enabledFeatures.push('Achievements');
      else disabledFeatures.push('Achievements');

      if (!settings.hideTips) enabledFeatures.push('Tips & Insights');
      else disabledFeatures.push('Tips & Insights');
    } else {
      disabledFeatures.push(
        'Leaderboards',
        'Community Feed',
        'Crews',
        'Rivals',
        'Hangouts',
        'Messaging',
        'High Fives',
        'Gamification',
        'Achievements',
        'Tips & Insights'
      );
    }

    return reply.send({
      data: {
        mode: settings.minimalistMode ? 'minimalist' : 'standard',
        summary: settings.minimalistMode
          ? 'You are in minimalist mode. All community and social features are disabled. Your data is private and excluded from all comparisons.'
          : disabledFeatures.length > 0
            ? `You have ${disabledFeatures.length} feature(s) disabled: ${disabledFeatures.join(', ')}`
            : 'All features are enabled.',
        enabledFeatures,
        disabledFeatures,
        dataPrivacy: {
          excludedFromComparisons: settings.excludeFromStatsComparison || settings.minimalistMode,
          excludedFromActivityFeed: settings.excludeFromActivityFeed || settings.minimalistMode,
          locationHidden: settings.excludeFromLocationFeatures || settings.minimalistMode,
          presenceHidden: settings.disablePresenceTracking || settings.minimalistMode,
          profilePrivate: settings.profileCompletelyPrivate || settings.minimalistMode,
        },
      },
    });
  });
}
