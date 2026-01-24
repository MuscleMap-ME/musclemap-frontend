/**
 * Community Presence Service
 *
 * Handles real-time user presence at fitness venues:
 * - Location sharing with privacy controls
 * - Check-in/out with GPS verification
 * - Training sessions and invites
 * - Nearby user discovery
 * - Presence history for heat maps
 *
 * Privacy-first design ensures users have full control over their visibility.
 */

import { queryAll, queryOne, query } from '../../db/client';
import { getRedis, isRedisAvailable } from '../../lib/redis';
import {
  publish,
  PUBSUB_CHANNELS,
  publishVenuePresence,
  publishNearbyPresence,
  publishTrainingInvite,
  publishTrainingSession,
} from '../../lib/pubsub';
import { loggers } from '../../lib/logger';
import { earningService } from '../economy/earning.service';

const log = loggers.core;

// ============================================
// TYPES
// ============================================

export type PresenceState = 'invisible' | 'location_only' | 'visible' | 'training_now' | 'open_to_train';
export type PrivacyPreset = 'social' | 'selective' | 'private';
export type LocationPrecision = 'exact' | 'approximate' | 'area_only';

export interface UserPresence {
  userId: string;
  state: PresenceState;
  latitude?: number;
  longitude?: number;
  locationPrecision: LocationPrecision;
  venueId?: string;
  sessionStartedAt?: Date;
  sessionPlannedDuration?: number;
  sessionWorkoutType?: string;
  sessionTargetMuscles?: string[];
  sessionOpenToJoin: boolean;
  sessionMaxParticipants: number;
  sessionNotes?: string;
  locationUpdatedAt?: Date;
  lastActiveAt: Date;
}

export interface PresenceSettings {
  userId: string;
  sharePresence: boolean;
  privacyPreset: PrivacyPreset;

  // Location
  locationEnabled: boolean;
  locationPrecision: LocationPrecision;
  locationOnlyWhenCheckedIn: boolean;
  locationAutoExpireMinutes: number;

  // Visibility
  visibleToEveryone: boolean;
  visibleToFollowers: boolean;
  visibleToMutualFollowers: boolean;

  // Profile visibility
  showRealName: boolean;
  showProfilePhoto: boolean;
  showTrainingStats: boolean;
  showCurrentWorkout: boolean;
  showTrainingHistory: boolean;

  // Contact
  allowDirectMessages: boolean;
  allowMessagesFromEveryone: boolean;
  allowMessagesFromFollowers: boolean;
  allowMessagesFromMutualOnly: boolean;
  allowTrainingInvites: boolean;

  // Nearby
  showInNearbyList: boolean;
  receiveNearbyNotifications: boolean;
  notifyWhenFriendsNearby: boolean;
  nearbyNotificationRadiusMeters: number;

  // Training preferences
  preferredTrainingTimes?: string[];
  preferredWorkoutTypes?: string[];
  lookingForTrainingPartners: boolean;
  maxTrainingGroupSize: number;
}

export interface VenueCheckIn {
  id: string;
  venueId: string;
  userId: string;
  latitude: number;
  longitude: number;
  distanceFromVenueMeters?: number;
  locationAccuracyMeters?: number;
  isActive: boolean;
  checkedInAt: Date;
  checkedOutAt?: Date;
  autoCheckout: boolean;
  workoutType?: string;
  openToJoin: boolean;
  visibleToOthers: boolean;
  plannedDuration?: number;
  sessionId?: string;
  verificationMethod: 'gps' | 'manual' | 'qr_code' | 'nfc';
  gpsVerified: boolean;
  workoutId?: string;
}

export interface TrainingInvite {
  id: string;
  fromUserId: string;
  toUserId: string;
  venueId: string;
  proposedTime: Date;
  workoutType?: string;
  message?: string;
  isNow: boolean;
  status: 'pending' | 'accepted' | 'declined' | 'expired' | 'cancelled';
  statusMessage?: string;
  respondedAt?: Date;
  expiresAt: Date;
  sessionId?: string;
  messageId?: string;
  conversationId?: string;
  createdAt: Date;
}

export interface TrainingSession {
  id: string;
  venueId: string;
  hostUserId: string;
  workoutType?: string;
  scheduledTime: Date;
  startedAt?: Date;
  endedAt?: Date;
  durationMinutes?: number;
  status: 'scheduled' | 'active' | 'completed' | 'cancelled';
  maxParticipants: number;
  participantCount: number;
  notes?: string;
  creditsAwardedPerParticipant: number;
  createdAt: Date;
}

export interface UserAtVenue {
  userId: string;
  displayName: string;
  username: string;
  avatarUrl?: string;
  checkedInAt: Date;
  workoutType?: string;
  openToJoin: boolean;
  canMessage: boolean;
  isFollowing: boolean;
  isFollower: boolean;
  isMutual: boolean;
  durationMinutes: number;
}

export interface NearbyVenue {
  venueId: string;
  name: string;
  latitude: number;
  longitude: number;
  distanceMeters: number;
  currentUserCount: number;
  openToTrainCount: number;
  hasFriendsHere: boolean;
  friendsHereCount: number;
}

// ============================================
// CONSTANTS
// ============================================

const MAX_CHECKIN_DISTANCE_METERS = 150;  // Max distance for GPS verification
const DEFAULT_CHECKIN_DURATION_MINUTES = 120;  // 2 hours default
const MAX_CHECKIN_DURATION_MINUTES = 480;  // 8 hours max
const PRESENCE_CACHE_TTL_SECONDS = 60;
const STALE_PRESENCE_CHECK_INTERVAL_MS = 60000;  // 1 minute

// Redis key prefixes
const REDIS_KEYS = {
  presence: (userId: string) => `presence:${userId}`,
  venueUsers: (venueId: string) => `venue:users:${venueId}`,
  nearbyUsers: (geohash: string) => `nearby:${geohash}`,
  presenceSettings: (userId: string) => `presence:settings:${userId}`,
};

// Earning rule codes for presence actions
const PRESENCE_EARNING_RULES = {
  CHECK_IN: 'presence_check_in',
  CHECK_IN_VERIFIED: 'presence_check_in_verified',
  TRAINING_PARTNER: 'presence_training_partner',
  FIRST_PARTNER: 'presence_first_partner',
  HOST_SESSION: 'presence_host_session',
  INVITE_ACCEPTED: 'presence_invite_accepted',
  LOCATION_REGULAR: 'presence_location_regular',
  STREAK_7: 'presence_streak_7',
  BRING_FRIEND: 'presence_bring_friend',
};

// ============================================
// CREDITS HELPER FUNCTIONS
// ============================================

/**
 * Award credits for a presence-related action
 */
async function awardPresenceCredits(
  userId: string,
  ruleCode: string,
  sourceType: string,
  sourceId: string,
  metadata?: Record<string, unknown>
): Promise<{ creditsAwarded: number; xpAwarded: number } | null> {
  try {
    const result = await earningService.processEarning({
      userId,
      ruleCode,
      sourceType,
      sourceId,
      metadata,
    });

    if (result.success) {
      return {
        creditsAwarded: result.creditsAwarded ?? 0,
        xpAwarded: result.xpAwarded ?? 0,
      };
    }
  } catch (err) {
    log.warn({ error: err, userId, ruleCode }, 'Failed to award presence credits');
  }
  return null;
}

// ============================================
// PRIVACY PRESETS
// ============================================

export const PRIVACY_PRESETS: Record<PrivacyPreset, Partial<PresenceSettings>> = {
  social: {
    sharePresence: true,
    locationEnabled: true,
    locationPrecision: 'exact',
    locationOnlyWhenCheckedIn: false,
    visibleToEveryone: true,
    visibleToFollowers: true,
    visibleToMutualFollowers: true,
    showRealName: true,
    showProfilePhoto: true,
    showCurrentWorkout: true,
    showTrainingStats: true,
    allowDirectMessages: true,
    allowMessagesFromEveryone: true,
    allowTrainingInvites: true,
    showInNearbyList: true,
    receiveNearbyNotifications: true,
    notifyWhenFriendsNearby: true,
  },
  selective: {
    sharePresence: true,
    locationEnabled: true,
    locationPrecision: 'approximate',
    locationOnlyWhenCheckedIn: true,
    visibleToEveryone: false,
    visibleToFollowers: true,
    visibleToMutualFollowers: true,
    showRealName: true,
    showProfilePhoto: true,
    showCurrentWorkout: true,
    showTrainingStats: false,
    allowDirectMessages: true,
    allowMessagesFromEveryone: false,
    allowMessagesFromFollowers: true,
    allowMessagesFromMutualOnly: true,
    allowTrainingInvites: true,
    showInNearbyList: true,
    receiveNearbyNotifications: true,
    notifyWhenFriendsNearby: true,
  },
  private: {
    sharePresence: false,
    locationEnabled: false,
    visibleToEveryone: false,
    visibleToFollowers: false,
    visibleToMutualFollowers: false,
    showRealName: false,
    showProfilePhoto: false,
    showCurrentWorkout: false,
    showTrainingStats: false,
    allowDirectMessages: false,
    allowMessagesFromEveryone: false,
    allowTrainingInvites: false,
    showInNearbyList: false,
    receiveNearbyNotifications: false,
    notifyWhenFriendsNearby: false,
  },
};

// ============================================
// PRESENCE SETTINGS FUNCTIONS
// ============================================

/**
 * Get user's presence settings
 */
export async function getPresenceSettings(userId: string): Promise<PresenceSettings | null> {
  // Check Redis cache first
  const redis = getRedis();
  if (redis && isRedisAvailable()) {
    try {
      const cached = await redis.get(REDIS_KEYS.presenceSettings(userId));
      if (cached) {
        return JSON.parse(cached);
      }
    } catch (err) {
      log.warn({ error: err }, 'Failed to read presence settings from Redis');
    }
  }

  const row = await queryOne<{
    user_id: string;
    share_presence: boolean;
    privacy_preset: PrivacyPreset;
    location_enabled: boolean;
    location_precision: LocationPrecision;
    location_only_when_checked_in: boolean;
    location_auto_expire_minutes: number;
    visible_to_everyone: boolean;
    visible_to_followers: boolean;
    visible_to_mutual_followers: boolean;
    show_real_name: boolean;
    show_profile_photo: boolean;
    show_training_stats: boolean;
    show_current_workout: boolean;
    show_training_history: boolean;
    allow_direct_messages: boolean;
    allow_messages_from_everyone: boolean;
    allow_messages_from_followers: boolean;
    allow_messages_from_mutual_only: boolean;
    allow_training_invites: boolean;
    show_in_nearby_list: boolean;
    receive_nearby_notifications: boolean;
    notify_when_friends_nearby: boolean;
    nearby_notification_radius_meters: number;
    preferred_training_times: string[] | null;
    preferred_workout_types: string[] | null;
    looking_for_training_partners: boolean;
    max_training_group_size: number;
  }>(
    `SELECT * FROM user_presence_settings WHERE user_id = $1`,
    [userId]
  );

  if (!row) {
    return null;
  }

  const settings: PresenceSettings = {
    userId: row.user_id,
    sharePresence: row.share_presence,
    privacyPreset: row.privacy_preset,
    locationEnabled: row.location_enabled,
    locationPrecision: row.location_precision,
    locationOnlyWhenCheckedIn: row.location_only_when_checked_in,
    locationAutoExpireMinutes: row.location_auto_expire_minutes,
    visibleToEveryone: row.visible_to_everyone,
    visibleToFollowers: row.visible_to_followers,
    visibleToMutualFollowers: row.visible_to_mutual_followers,
    showRealName: row.show_real_name,
    showProfilePhoto: row.show_profile_photo,
    showTrainingStats: row.show_training_stats,
    showCurrentWorkout: row.show_current_workout,
    showTrainingHistory: row.show_training_history,
    allowDirectMessages: row.allow_direct_messages,
    allowMessagesFromEveryone: row.allow_messages_from_everyone,
    allowMessagesFromFollowers: row.allow_messages_from_followers,
    allowMessagesFromMutualOnly: row.allow_messages_from_mutual_only,
    allowTrainingInvites: row.allow_training_invites,
    showInNearbyList: row.show_in_nearby_list,
    receiveNearbyNotifications: row.receive_nearby_notifications,
    notifyWhenFriendsNearby: row.notify_when_friends_nearby,
    nearbyNotificationRadiusMeters: row.nearby_notification_radius_meters,
    preferredTrainingTimes: row.preferred_training_times || undefined,
    preferredWorkoutTypes: row.preferred_workout_types || undefined,
    lookingForTrainingPartners: row.looking_for_training_partners,
    maxTrainingGroupSize: row.max_training_group_size,
  };

  // Cache in Redis
  if (redis && isRedisAvailable()) {
    try {
      await redis.set(
        REDIS_KEYS.presenceSettings(userId),
        JSON.stringify(settings),
        'EX',
        PRESENCE_CACHE_TTL_SECONDS
      );
    } catch (err) {
      log.warn({ error: err }, 'Failed to cache presence settings in Redis');
    }
  }

  return settings;
}

/**
 * Create or update user's presence settings
 */
export async function upsertPresenceSettings(
  userId: string,
  settings: Partial<PresenceSettings>
): Promise<PresenceSettings> {
  const existing = await getPresenceSettings(userId);

  if (existing) {
    // Update existing
    await query(
      `UPDATE user_presence_settings SET
        share_presence = COALESCE($2, share_presence),
        privacy_preset = COALESCE($3, privacy_preset),
        location_enabled = COALESCE($4, location_enabled),
        location_precision = COALESCE($5, location_precision),
        location_only_when_checked_in = COALESCE($6, location_only_when_checked_in),
        location_auto_expire_minutes = COALESCE($7, location_auto_expire_minutes),
        visible_to_everyone = COALESCE($8, visible_to_everyone),
        visible_to_followers = COALESCE($9, visible_to_followers),
        visible_to_mutual_followers = COALESCE($10, visible_to_mutual_followers),
        show_real_name = COALESCE($11, show_real_name),
        show_profile_photo = COALESCE($12, show_profile_photo),
        show_training_stats = COALESCE($13, show_training_stats),
        show_current_workout = COALESCE($14, show_current_workout),
        show_training_history = COALESCE($15, show_training_history),
        allow_direct_messages = COALESCE($16, allow_direct_messages),
        allow_messages_from_everyone = COALESCE($17, allow_messages_from_everyone),
        allow_messages_from_followers = COALESCE($18, allow_messages_from_followers),
        allow_messages_from_mutual_only = COALESCE($19, allow_messages_from_mutual_only),
        allow_training_invites = COALESCE($20, allow_training_invites),
        show_in_nearby_list = COALESCE($21, show_in_nearby_list),
        receive_nearby_notifications = COALESCE($22, receive_nearby_notifications),
        notify_when_friends_nearby = COALESCE($23, notify_when_friends_nearby),
        nearby_notification_radius_meters = COALESCE($24, nearby_notification_radius_meters),
        preferred_training_times = COALESCE($25, preferred_training_times),
        preferred_workout_types = COALESCE($26, preferred_workout_types),
        looking_for_training_partners = COALESCE($27, looking_for_training_partners),
        max_training_group_size = COALESCE($28, max_training_group_size),
        updated_at = NOW()
      WHERE user_id = $1`,
      [
        userId,
        settings.sharePresence,
        settings.privacyPreset,
        settings.locationEnabled,
        settings.locationPrecision,
        settings.locationOnlyWhenCheckedIn,
        settings.locationAutoExpireMinutes,
        settings.visibleToEveryone,
        settings.visibleToFollowers,
        settings.visibleToMutualFollowers,
        settings.showRealName,
        settings.showProfilePhoto,
        settings.showTrainingStats,
        settings.showCurrentWorkout,
        settings.showTrainingHistory,
        settings.allowDirectMessages,
        settings.allowMessagesFromEveryone,
        settings.allowMessagesFromFollowers,
        settings.allowMessagesFromMutualOnly,
        settings.allowTrainingInvites,
        settings.showInNearbyList,
        settings.receiveNearbyNotifications,
        settings.notifyWhenFriendsNearby,
        settings.nearbyNotificationRadiusMeters,
        settings.preferredTrainingTimes ? JSON.stringify(settings.preferredTrainingTimes) : null,
        settings.preferredWorkoutTypes ? JSON.stringify(settings.preferredWorkoutTypes) : null,
        settings.lookingForTrainingPartners,
        settings.maxTrainingGroupSize,
      ]
    );
  } else {
    // Insert new with defaults
    const preset = settings.privacyPreset || 'selective';
    const defaults = PRIVACY_PRESETS[preset];
    const merged = { ...defaults, ...settings };

    await query(
      `INSERT INTO user_presence_settings (
        user_id, share_presence, privacy_preset, location_enabled, location_precision,
        location_only_when_checked_in, location_auto_expire_minutes,
        visible_to_everyone, visible_to_followers, visible_to_mutual_followers,
        show_real_name, show_profile_photo, show_training_stats, show_current_workout, show_training_history,
        allow_direct_messages, allow_messages_from_everyone, allow_messages_from_followers, allow_messages_from_mutual_only,
        allow_training_invites, show_in_nearby_list, receive_nearby_notifications, notify_when_friends_nearby,
        nearby_notification_radius_meters, preferred_training_times, preferred_workout_types,
        looking_for_training_partners, max_training_group_size
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28
      )`,
      [
        userId,
        merged.sharePresence ?? false,
        preset,
        merged.locationEnabled ?? false,
        merged.locationPrecision ?? 'approximate',
        merged.locationOnlyWhenCheckedIn ?? true,
        merged.locationAutoExpireMinutes ?? 120,
        merged.visibleToEveryone ?? false,
        merged.visibleToFollowers ?? true,
        merged.visibleToMutualFollowers ?? true,
        merged.showRealName ?? true,
        merged.showProfilePhoto ?? true,
        merged.showTrainingStats ?? false,
        merged.showCurrentWorkout ?? true,
        merged.showTrainingHistory ?? false,
        merged.allowDirectMessages ?? true,
        merged.allowMessagesFromEveryone ?? false,
        merged.allowMessagesFromFollowers ?? true,
        merged.allowMessagesFromMutualOnly ?? true,
        merged.allowTrainingInvites ?? true,
        merged.showInNearbyList ?? true,
        merged.receiveNearbyNotifications ?? true,
        merged.notifyWhenFriendsNearby ?? true,
        merged.nearbyNotificationRadiusMeters ?? 500,
        merged.preferredTrainingTimes ? JSON.stringify(merged.preferredTrainingTimes) : null,
        merged.preferredWorkoutTypes ? JSON.stringify(merged.preferredWorkoutTypes) : null,
        merged.lookingForTrainingPartners ?? false,
        merged.maxTrainingGroupSize ?? 4,
      ]
    );
  }

  // Invalidate cache
  const redis = getRedis();
  if (redis && isRedisAvailable()) {
    await redis.del(REDIS_KEYS.presenceSettings(userId));
  }

  return (await getPresenceSettings(userId))!;
}

/**
 * Apply a privacy preset to user's settings
 */
export async function applyPrivacyPreset(
  userId: string,
  preset: PrivacyPreset
): Promise<PresenceSettings> {
  const presetSettings = PRIVACY_PRESETS[preset];
  return upsertPresenceSettings(userId, { ...presetSettings, privacyPreset: preset });
}

// ============================================
// USER PRESENCE FUNCTIONS
// ============================================

/**
 * Get user's current presence
 */
export async function getUserPresence(userId: string): Promise<UserPresence | null> {
  const row = await queryOne<{
    user_id: string;
    state: PresenceState;
    latitude: number | null;
    longitude: number | null;
    location_precision: LocationPrecision;
    venue_id: string | null;
    session_started_at: Date | null;
    session_planned_duration: number | null;
    session_workout_type: string | null;
    session_target_muscles: string[] | null;
    session_open_to_join: boolean;
    session_max_participants: number;
    session_notes: string | null;
    location_updated_at: Date | null;
    last_active_at: Date;
  }>(
    `SELECT * FROM user_presence WHERE user_id = $1`,
    [userId]
  );

  if (!row) {
    return null;
  }

  return {
    userId: row.user_id,
    state: row.state,
    latitude: row.latitude || undefined,
    longitude: row.longitude || undefined,
    locationPrecision: row.location_precision,
    venueId: row.venue_id || undefined,
    sessionStartedAt: row.session_started_at || undefined,
    sessionPlannedDuration: row.session_planned_duration || undefined,
    sessionWorkoutType: row.session_workout_type || undefined,
    sessionTargetMuscles: row.session_target_muscles || undefined,
    sessionOpenToJoin: row.session_open_to_join,
    sessionMaxParticipants: row.session_max_participants,
    sessionNotes: row.session_notes || undefined,
    locationUpdatedAt: row.location_updated_at || undefined,
    lastActiveAt: row.last_active_at,
  };
}

/**
 * Update user's presence state and optionally location
 */
export async function updatePresence(
  userId: string,
  update: {
    state?: PresenceState;
    latitude?: number;
    longitude?: number;
    venueId?: string | null;
    sessionWorkoutType?: string;
    sessionTargetMuscles?: string[];
    sessionOpenToJoin?: boolean;
    sessionMaxParticipants?: number;
    sessionNotes?: string;
  }
): Promise<UserPresence> {
  // Check privacy settings first
  const settings = await getPresenceSettings(userId);

  // If user doesn't have settings yet, create with defaults
  if (!settings) {
    await upsertPresenceSettings(userId, {});
  }

  // Get current presence or create default
  const current = await getUserPresence(userId);

  if (current) {
    // Update
    await query(
      `UPDATE user_presence SET
        state = COALESCE($2, state),
        latitude = COALESCE($3, latitude),
        longitude = COALESCE($4, longitude),
        venue_id = COALESCE($5, venue_id),
        session_workout_type = COALESCE($6, session_workout_type),
        session_target_muscles = COALESCE($7, session_target_muscles),
        session_open_to_join = COALESCE($8, session_open_to_join),
        session_max_participants = COALESCE($9, session_max_participants),
        session_notes = COALESCE($10, session_notes),
        location_updated_at = CASE WHEN $3 IS NOT NULL OR $4 IS NOT NULL THEN NOW() ELSE location_updated_at END,
        session_started_at = CASE WHEN $2 IN ('training_now', 'open_to_train') AND state NOT IN ('training_now', 'open_to_train') THEN NOW() ELSE session_started_at END
      WHERE user_id = $1`,
      [
        userId,
        update.state,
        update.latitude,
        update.longitude,
        update.venueId,
        update.sessionWorkoutType,
        update.sessionTargetMuscles ? JSON.stringify(update.sessionTargetMuscles) : null,
        update.sessionOpenToJoin,
        update.sessionMaxParticipants,
        update.sessionNotes,
      ]
    );
  } else {
    // Insert
    await query(
      `INSERT INTO user_presence (
        user_id, state, latitude, longitude, venue_id,
        session_workout_type, session_target_muscles, session_open_to_join,
        session_max_participants, session_notes, location_updated_at,
        session_started_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
        CASE WHEN $3 IS NOT NULL THEN NOW() ELSE NULL END,
        CASE WHEN $2 IN ('training_now', 'open_to_train') THEN NOW() ELSE NULL END
      )`,
      [
        userId,
        update.state || 'invisible',
        update.latitude,
        update.longitude,
        update.venueId,
        update.sessionWorkoutType,
        update.sessionTargetMuscles ? JSON.stringify(update.sessionTargetMuscles) : null,
        update.sessionOpenToJoin ?? false,
        update.sessionMaxParticipants ?? 3,
        update.sessionNotes,
      ]
    );
  }

  // Publish presence update
  const presence = await getUserPresence(userId);
  if (presence && presence.state !== 'invisible') {
    await publishPresenceUpdate(userId, presence);
  }

  return presence!;
}

/**
 * Set user as invisible (clear presence)
 */
export async function setInvisible(userId: string): Promise<void> {
  await query(
    `UPDATE user_presence SET
      state = 'invisible',
      session_started_at = NULL,
      session_workout_type = NULL,
      session_target_muscles = NULL,
      session_open_to_join = FALSE,
      session_notes = NULL
    WHERE user_id = $1`,
    [userId]
  );

  // Publish that user went offline
  await publish(PUBSUB_CHANNELS.PRESENCE, {
    userId,
    state: 'invisible',
    timestamp: new Date().toISOString(),
  });
}

// ============================================
// CHECK-IN FUNCTIONS
// ============================================

/**
 * Check in to a venue
 */
export async function checkIn(
  userId: string,
  venueId: string,
  options: {
    latitude: number;
    longitude: number;
    locationAccuracy?: number;
    workoutType?: string;
    plannedDuration?: number;
    openToJoin?: boolean;
    visible?: boolean;
  }
): Promise<{
  checkIn: VenueCheckIn;
  gpsVerified: boolean;
  distanceMeters: number;
  othersAtVenue: UserAtVenue[];
  creditsAwarded: number;
}> {
  // Get venue location
  const venue = await queryOne<{
    id: string;
    latitude: number;
    longitude: number;
    radius_meters: number;
  }>(
    `SELECT id, latitude, longitude, radius_meters FROM fitness_venues WHERE id = $1 AND is_active = TRUE`,
    [venueId]
  );

  if (!venue) {
    throw new Error('Venue not found');
  }

  // Calculate distance from venue
  const distanceMeters = calculateDistance(
    options.latitude,
    options.longitude,
    Number(venue.latitude),
    Number(venue.longitude)
  );

  const gpsVerified = distanceMeters <= (venue.radius_meters || MAX_CHECKIN_DISTANCE_METERS);

  // Check for existing active check-in and close it
  await query(
    `UPDATE venue_checkins
     SET is_active = FALSE, checked_out_at = NOW()
     WHERE user_id = $1 AND is_active = TRUE`,
    [userId]
  );

  // Create check-in
  const result = await queryOne<{ id: string }>(
    `INSERT INTO venue_checkins (
      venue_id, user_id, latitude, longitude,
      distance_from_venue_meters, location_accuracy_meters,
      workout_type, planned_duration, open_to_join, visible_to_others,
      verification_method, gps_verified
    ) VALUES (
      $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'gps', $11
    ) RETURNING id`,
    [
      venueId,
      userId,
      options.latitude,
      options.longitude,
      distanceMeters,
      options.locationAccuracy,
      options.workoutType,
      options.plannedDuration || DEFAULT_CHECKIN_DURATION_MINUTES,
      options.openToJoin ?? false,
      options.visible ?? true,
      gpsVerified,
    ]
  );

  // Update user presence
  await updatePresence(userId, {
    state: options.openToJoin ? 'open_to_train' : 'visible',
    latitude: options.latitude,
    longitude: options.longitude,
    venueId,
    sessionWorkoutType: options.workoutType,
    sessionOpenToJoin: options.openToJoin,
  });

  // Get the check-in record
  const checkIn = await getCheckIn(result!.id);

  // Get others at venue (respecting privacy)
  const othersAtVenue = await getUsersAtVenue(venueId, userId);

  // Award credits for check-in
  const ruleCode = gpsVerified
    ? PRESENCE_EARNING_RULES.CHECK_IN_VERIFIED
    : PRESENCE_EARNING_RULES.CHECK_IN;

  const creditResult = await awardPresenceCredits(
    userId,
    ruleCode,
    'check_in',
    result!.id,
    {
      venueId,
      gpsVerified,
      distanceMeters,
      workoutType: options.workoutType,
    }
  );

  const creditsAwarded = creditResult?.creditsAwarded ?? 0;

  // Refresh materialized view asynchronously
  refreshVenueActivityView().catch(err => {
    log.warn({ error: err }, 'Failed to refresh venue activity view');
  });

  // Publish venue presence event
  publishVenuePresence({
    venueId,
    userId,
    state: options.openToJoin ? 'open_to_train' : 'visible',
    latitude: options.latitude,
    longitude: options.longitude,
    sessionOpenToJoin: options.openToJoin,
    sessionWorkoutType: options.workoutType,
    action: 'joined',
    timestamp: new Date().toISOString(),
  }).catch(err => {
    log.warn({ error: err }, 'Failed to publish venue presence event');
  });

  // Publish nearby presence event
  publishNearbyPresence({
    userId,
    state: options.openToJoin ? 'open_to_train' : 'visible',
    venueId,
    latitude: options.latitude,
    longitude: options.longitude,
    sessionOpenToJoin: options.openToJoin,
    sessionWorkoutType: options.workoutType,
    timestamp: new Date().toISOString(),
  }).catch(err => {
    log.warn({ error: err }, 'Failed to publish nearby presence event');
  });

  return {
    checkIn: checkIn!,
    gpsVerified,
    distanceMeters,
    othersAtVenue,
    creditsAwarded,
  };
}

/**
 * Check out from current venue
 */
export async function checkOut(userId: string): Promise<VenueCheckIn | null> {
  const result = await queryOne<{ id: string }>(
    `UPDATE venue_checkins
     SET is_active = FALSE, checked_out_at = NOW()
     WHERE user_id = $1 AND is_active = TRUE
     RETURNING id`,
    [userId]
  );

  if (!result) {
    return null;
  }

  // Update user presence
  await updatePresence(userId, {
    state: 'invisible',
    venueId: null,
  });

  // Create presence history record
  const checkIn = await getCheckIn(result.id);
  if (checkIn) {
    const durationMinutes = Math.floor(
      (new Date().getTime() - checkIn.checkedInAt.getTime()) / 60000
    );

    await query(
      `INSERT INTO presence_history (
        user_id, venue_id, check_in_at, check_out_at, duration_minutes,
        workout_type, workout_logged, latitude, longitude
      ) VALUES ($1, $2, $3, NOW(), $4, $5, $6, $7, $8)`,
      [
        userId,
        checkIn.venueId,
        checkIn.checkedInAt,
        durationMinutes,
        checkIn.workoutType,
        checkIn.workoutId != null,
        checkIn.latitude,
        checkIn.longitude,
      ]
    );
  }

  // Refresh materialized view asynchronously
  refreshVenueActivityView().catch(err => {
    log.warn({ error: err }, 'Failed to refresh venue activity view');
  });

  // Publish venue presence event if we have check-in info
  if (checkIn) {
    publishVenuePresence({
      venueId: checkIn.venueId,
      userId,
      state: 'invisible',
      action: 'left',
      timestamp: new Date().toISOString(),
    }).catch(err => {
      log.warn({ error: err }, 'Failed to publish venue presence event');
    });

    publishNearbyPresence({
      userId,
      state: 'invisible',
      timestamp: new Date().toISOString(),
    }).catch(err => {
      log.warn({ error: err }, 'Failed to publish nearby presence event');
    });
  }

  return checkIn;
}

/**
 * Get a specific check-in by ID
 */
async function getCheckIn(checkInId: string): Promise<VenueCheckIn | null> {
  const row = await queryOne<{
    id: string;
    venue_id: string;
    user_id: string;
    latitude: number;
    longitude: number;
    distance_from_venue_meters: number | null;
    location_accuracy_meters: number | null;
    is_active: boolean;
    checked_in_at: Date;
    checked_out_at: Date | null;
    auto_checkout: boolean;
    workout_type: string | null;
    open_to_join: boolean;
    visible_to_others: boolean;
    planned_duration: number | null;
    session_id: string | null;
    verification_method: 'gps' | 'manual' | 'qr_code' | 'nfc';
    gps_verified: boolean;
    workout_id: string | null;
  }>(
    `SELECT * FROM venue_checkins WHERE id = $1`,
    [checkInId]
  );

  if (!row) return null;

  return {
    id: row.id,
    venueId: row.venue_id,
    userId: row.user_id,
    latitude: Number(row.latitude),
    longitude: Number(row.longitude),
    distanceFromVenueMeters: row.distance_from_venue_meters ? Number(row.distance_from_venue_meters) : undefined,
    locationAccuracyMeters: row.location_accuracy_meters ? Number(row.location_accuracy_meters) : undefined,
    isActive: row.is_active,
    checkedInAt: row.checked_in_at,
    checkedOutAt: row.checked_out_at || undefined,
    autoCheckout: row.auto_checkout,
    workoutType: row.workout_type || undefined,
    openToJoin: row.open_to_join,
    visibleToOthers: row.visible_to_others,
    plannedDuration: row.planned_duration || undefined,
    sessionId: row.session_id || undefined,
    verificationMethod: row.verification_method,
    gpsVerified: row.gps_verified,
    workoutId: row.workout_id || undefined,
  };
}

/**
 * Get user's active check-in
 */
export async function getActiveCheckIn(userId: string): Promise<VenueCheckIn | null> {
  const row = await queryOne<{ id: string }>(
    `SELECT id FROM venue_checkins WHERE user_id = $1 AND is_active = TRUE`,
    [userId]
  );

  if (!row) return null;
  return getCheckIn(row.id);
}

// ============================================
// VENUE PRESENCE QUERIES
// ============================================

/**
 * Get users currently at a venue (respecting privacy settings)
 */
export async function getUsersAtVenue(
  venueId: string,
  requestingUserId: string
): Promise<UserAtVenue[]> {
  // Get all active check-ins at venue
  const checkIns = await queryAll<{
    user_id: string;
    checked_in_at: Date;
    workout_type: string | null;
    open_to_join: boolean;
    visible_to_others: boolean;
    username: string;
    display_name: string | null;
    avatar_url: string | null;
  }>(
    `SELECT
      vc.user_id,
      vc.checked_in_at,
      vc.workout_type,
      vc.open_to_join,
      vc.visible_to_others,
      u.username,
      u.display_name,
      u.avatar_url
    FROM venue_checkins vc
    JOIN users u ON vc.user_id = u.id
    WHERE vc.venue_id = $1
      AND vc.is_active = TRUE
      AND vc.user_id != $2
      AND vc.visible_to_others = TRUE`,
    [venueId, requestingUserId]
  );

  if (checkIns.length === 0) {
    return [];
  }

  // Get privacy settings for all users
  const userIds = checkIns.map(c => c.user_id);
  const privacySettings = await queryAll<{
    user_id: string;
    visible_to_everyone: boolean;
    visible_to_followers: boolean;
    visible_to_mutual_followers: boolean;
    show_real_name: boolean;
    show_profile_photo: boolean;
    show_current_workout: boolean;
    allow_direct_messages: boolean;
    allow_messages_from_everyone: boolean;
    allow_messages_from_followers: boolean;
    allow_messages_from_mutual_only: boolean;
  }>(
    `SELECT * FROM user_presence_settings WHERE user_id = ANY($1)`,
    [userIds]
  );

  // Get follow relationships
  const followRelations = await queryAll<{
    follower_id: string;
    following_id: string;
  }>(
    `SELECT follower_id, following_id FROM user_follows
     WHERE (follower_id = $1 AND following_id = ANY($2))
        OR (following_id = $1 AND follower_id = ANY($2))`,
    [requestingUserId, userIds]
  );

  // Get blocked users
  const blocks = await queryAll<{ blocked_id: string }>(
    `SELECT blocked_id FROM user_blocks WHERE blocker_id = $1 AND blocked_id = ANY($2)
     UNION
     SELECT blocker_id FROM user_blocks WHERE blocked_id = $1 AND blocker_id = ANY($2)`,
    [requestingUserId, userIds]
  );
  const blockedIds = new Set(blocks.map(b => b.blocked_id));

  // Build privacy and relationship maps
  const privacyMap = new Map(privacySettings.map(p => [p.user_id, p]));
  const followingSet = new Set(
    followRelations.filter(f => f.follower_id === requestingUserId).map(f => f.following_id)
  );
  const followerSet = new Set(
    followRelations.filter(f => f.following_id === requestingUserId).map(f => f.follower_id)
  );

  // Filter users based on privacy and visibility
  const result: UserAtVenue[] = [];

  for (const checkIn of checkIns) {
    // Skip blocked users
    if (blockedIds.has(checkIn.user_id)) continue;

    const privacy = privacyMap.get(checkIn.user_id);
    const isFollowing = followingSet.has(checkIn.user_id);
    const isFollower = followerSet.has(checkIn.user_id);
    const isMutual = isFollowing && isFollower;

    // Check visibility permission
    let canSee = false;
    if (privacy) {
      if (privacy.visible_to_everyone) canSee = true;
      else if (privacy.visible_to_mutual_followers && isMutual) canSee = true;
      else if (privacy.visible_to_followers && isFollower) canSee = true;
    } else {
      // Default: visible to followers
      canSee = isFollower;
    }

    if (!canSee) continue;

    // Determine what info to show
    const showRealName = privacy?.show_real_name ?? true;
    const showPhoto = privacy?.show_profile_photo ?? true;
    const showWorkout = privacy?.show_current_workout ?? true;

    // Check if messaging is allowed
    let canMessage = false;
    if (privacy) {
      if (privacy.allow_messages_from_everyone) canMessage = true;
      else if (privacy.allow_messages_from_mutual_only && isMutual) canMessage = true;
      else if (privacy.allow_messages_from_followers && isFollower) canMessage = true;
    } else {
      canMessage = isMutual;
    }

    const durationMinutes = Math.floor(
      (Date.now() - checkIn.checked_in_at.getTime()) / 60000
    );

    result.push({
      userId: checkIn.user_id,
      displayName: showRealName && checkIn.display_name ? checkIn.display_name : checkIn.username,
      username: checkIn.username,
      avatarUrl: showPhoto ? checkIn.avatar_url || undefined : undefined,
      checkedInAt: checkIn.checked_in_at,
      workoutType: showWorkout ? checkIn.workout_type || undefined : undefined,
      openToJoin: checkIn.open_to_join,
      canMessage,
      isFollowing,
      isFollower,
      isMutual,
      durationMinutes,
    });
  }

  return result;
}

/**
 * Get active venues nearby with user counts
 */
export async function getActiveVenuesNearby(
  latitude: number,
  longitude: number,
  radiusMeters: number,
  requestingUserId: string
): Promise<NearbyVenue[]> {
  // Get venues within radius using simple distance calculation
  // For production at scale, use PostGIS or geohashing
  const venues = await queryAll<{
    venue_id: string;
    name: string;
    latitude: number;
    longitude: number;
    current_user_count: number;
    open_to_train_count: number;
    active_users: unknown;
  }>(
    `SELECT * FROM venue_activity_live
     WHERE current_user_count > 0`,
    []
  );

  // Get user's friends
  const friends = await queryAll<{ following_id: string }>(
    `SELECT following_id FROM user_follows WHERE follower_id = $1`,
    [requestingUserId]
  );
  const friendIds = new Set(friends.map(f => f.following_id));

  // Filter and calculate distances
  const result: NearbyVenue[] = [];

  for (const venue of venues) {
    const distance = calculateDistance(
      latitude,
      longitude,
      Number(venue.latitude),
      Number(venue.longitude)
    );

    if (distance <= radiusMeters) {
      // Count friends at this venue
      const activeUsers = venue.active_users as Array<{ user_id: string }>;
      const friendsHere = activeUsers.filter(u => friendIds.has(u.user_id));

      result.push({
        venueId: venue.venue_id,
        name: venue.name,
        latitude: Number(venue.latitude),
        longitude: Number(venue.longitude),
        distanceMeters: Math.round(distance),
        currentUserCount: Number(venue.current_user_count),
        openToTrainCount: Number(venue.open_to_train_count),
        hasFriendsHere: friendsHere.length > 0,
        friendsHereCount: friendsHere.length,
      });
    }
  }

  // Sort by distance
  result.sort((a, b) => a.distanceMeters - b.distanceMeters);

  return result;
}

// ============================================
// TRAINING INVITES
// ============================================

/**
 * Send a training invite
 */
export async function sendTrainingInvite(
  fromUserId: string,
  toUserId: string,
  venueId: string,
  options?: {
    proposedTime?: Date;
    workoutType?: string;
    message?: string;
  }
): Promise<TrainingInvite> {
  // Check if target user accepts training invites
  const targetSettings = await getPresenceSettings(toUserId);
  if (targetSettings && !targetSettings.allowTrainingInvites) {
    throw new Error('User does not accept training invites');
  }

  // Check if blocked
  const block = await queryOne<{ blocker_id: string }>(
    `SELECT blocker_id FROM user_blocks
     WHERE (blocker_id = $1 AND blocked_id = $2) OR (blocker_id = $2 AND blocked_id = $1)`,
    [fromUserId, toUserId]
  );
  if (block) {
    throw new Error('Cannot send invite to this user');
  }

  const proposedTime = options?.proposedTime || new Date();
  const isNow = !options?.proposedTime || proposedTime.getTime() - Date.now() < 60000;

  // Calculate expiry
  const expiresAt = new Date(
    isNow
      ? Date.now() + 30 * 60000  // 30 minutes for "now" invites
      : proposedTime.getTime() + 60 * 60000  // 1 hour after proposed time
  );

  const result = await queryOne<{ id: string }>(
    `INSERT INTO training_invites (
      from_user_id, to_user_id, venue_id, proposed_time,
      workout_type, message, is_now, expires_at
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    RETURNING id`,
    [
      fromUserId,
      toUserId,
      venueId,
      proposedTime,
      options?.workoutType,
      options?.message,
      isNow,
      expiresAt,
    ]
  );

  const invite = await getTrainingInvite(result!.id);

  // Publish training invite event
  publishTrainingInvite({
    inviteId: invite!.id,
    fromUserId,
    toUserId,
    venueId,
    proposedTime: proposedTime.toISOString(),
    workoutType: options?.workoutType,
    message: options?.message,
    status: 'pending',
    timestamp: new Date().toISOString(),
  }).catch(err => {
    log.warn({ error: err }, 'Failed to publish training invite event');
  });

  return invite!;
}

/**
 * Get a training invite by ID
 */
export async function getTrainingInvite(inviteId: string): Promise<TrainingInvite | null> {
  const row = await queryOne<{
    id: string;
    from_user_id: string;
    to_user_id: string;
    venue_id: string;
    proposed_time: Date;
    workout_type: string | null;
    message: string | null;
    is_now: boolean;
    status: TrainingInvite['status'];
    status_message: string | null;
    responded_at: Date | null;
    expires_at: Date;
    session_id: string | null;
    message_id: string | null;
    conversation_id: string | null;
    created_at: Date;
  }>(
    `SELECT * FROM training_invites WHERE id = $1`,
    [inviteId]
  );

  if (!row) return null;

  return {
    id: row.id,
    fromUserId: row.from_user_id,
    toUserId: row.to_user_id,
    venueId: row.venue_id,
    proposedTime: row.proposed_time,
    workoutType: row.workout_type || undefined,
    message: row.message || undefined,
    isNow: row.is_now,
    status: row.status,
    statusMessage: row.status_message || undefined,
    respondedAt: row.responded_at || undefined,
    expiresAt: row.expires_at,
    sessionId: row.session_id || undefined,
    messageId: row.message_id || undefined,
    conversationId: row.conversation_id || undefined,
    createdAt: row.created_at,
  };
}

/**
 * Accept a training invite
 */
export async function acceptTrainingInvite(
  inviteId: string,
  userId: string
): Promise<{ invite: TrainingInvite; session: TrainingSession }> {
  const invite = await getTrainingInvite(inviteId);

  if (!invite) {
    throw new Error('Invite not found');
  }

  if (invite.toUserId !== userId) {
    throw new Error('Not authorized to accept this invite');
  }

  if (invite.status !== 'pending') {
    throw new Error(`Invite has already been ${invite.status}`);
  }

  if (invite.expiresAt < new Date()) {
    await query(
      `UPDATE training_invites SET status = 'expired' WHERE id = $1`,
      [inviteId]
    );
    throw new Error('Invite has expired');
  }

  // Create training session
  const sessionResult = await queryOne<{ id: string }>(
    `INSERT INTO training_sessions (
      venue_id, host_user_id, workout_type, scheduled_time, status
    ) VALUES ($1, $2, $3, $4, $5)
    RETURNING id`,
    [
      invite.venueId,
      invite.fromUserId,
      invite.workoutType,
      invite.proposedTime,
      invite.isNow ? 'active' : 'scheduled',
    ]
  );

  // Add both users as participants
  await query(
    `INSERT INTO training_session_participants (session_id, user_id, role)
     VALUES ($1, $2, 'host'), ($1, $3, 'participant')`,
    [sessionResult!.id, invite.fromUserId, userId]
  );

  // Update invite
  await query(
    `UPDATE training_invites
     SET status = 'accepted', responded_at = NOW(), session_id = $2
     WHERE id = $1`,
    [inviteId, sessionResult!.id]
  );

  // Update participant count
  await query(
    `UPDATE training_sessions SET participant_count = 2 WHERE id = $1`,
    [sessionResult!.id]
  );

  const updatedInvite = await getTrainingInvite(inviteId);
  const session = await getTrainingSession(sessionResult!.id);

  // Award credits to invite sender (invite_accepted)
  awardPresenceCredits(
    invite.fromUserId,
    PRESENCE_EARNING_RULES.INVITE_ACCEPTED,
    'training_invite',
    inviteId,
    {
      toUserId: userId,
      venueId: invite.venueId,
      sessionId: sessionResult!.id,
    }
  ).catch(err => {
    log.warn({ error: err }, 'Failed to award invite accepted credits');
  });

  // Award credits to both for training partnership
  Promise.all([
    awardPresenceCredits(
      invite.fromUserId,
      PRESENCE_EARNING_RULES.TRAINING_PARTNER,
      'training_session',
      sessionResult!.id,
      { partnerId: userId, venueId: invite.venueId }
    ),
    awardPresenceCredits(
      userId,
      PRESENCE_EARNING_RULES.TRAINING_PARTNER,
      'training_session',
      sessionResult!.id,
      { partnerId: invite.fromUserId, venueId: invite.venueId }
    ),
  ]).catch(err => {
    log.warn({ error: err }, 'Failed to award training partner credits');
  });

  // Award credits to host for hosting session
  awardPresenceCredits(
    invite.fromUserId,
    PRESENCE_EARNING_RULES.HOST_SESSION,
    'training_session',
    sessionResult!.id,
    { venueId: invite.venueId }
  ).catch(err => {
    log.warn({ error: err }, 'Failed to award host session credits');
  });

  // Publish training invite accepted event
  publishTrainingInvite({
    inviteId,
    fromUserId: invite.fromUserId,
    toUserId: userId,
    venueId: invite.venueId,
    status: 'accepted',
    timestamp: new Date().toISOString(),
  }).catch(err => {
    log.warn({ error: err }, 'Failed to publish training invite accepted event');
  });

  // Publish training session created event
  publishTrainingSession({
    sessionId: session!.id,
    venueId: invite.venueId,
    status: session!.status,
    participantCount: 2,
    maxParticipants: session!.maxParticipants,
    workoutType: invite.workoutType,
    action: 'created',
    timestamp: new Date().toISOString(),
  }).catch(err => {
    log.warn({ error: err }, 'Failed to publish training session created event');
  });

  return { invite: updatedInvite!, session: session! };
}

/**
 * Decline a training invite
 */
export async function declineTrainingInvite(
  inviteId: string,
  userId: string,
  message?: string
): Promise<TrainingInvite> {
  const invite = await getTrainingInvite(inviteId);

  if (!invite) {
    throw new Error('Invite not found');
  }

  if (invite.toUserId !== userId) {
    throw new Error('Not authorized to decline this invite');
  }

  await query(
    `UPDATE training_invites
     SET status = 'declined', responded_at = NOW(), status_message = $2
     WHERE id = $1`,
    [inviteId, message]
  );

  return (await getTrainingInvite(inviteId))!;
}

/**
 * Get pending invites for a user
 */
export async function getPendingInvites(userId: string): Promise<TrainingInvite[]> {
  const rows = await queryAll<{ id: string }>(
    `SELECT id FROM training_invites
     WHERE to_user_id = $1 AND status = 'pending' AND expires_at > NOW()
     ORDER BY proposed_time ASC`,
    [userId]
  );

  return Promise.all(rows.map(r => getTrainingInvite(r.id).then(i => i!)));
}

// ============================================
// TRAINING SESSIONS
// ============================================

/**
 * Get a training session by ID
 */
export async function getTrainingSession(sessionId: string): Promise<TrainingSession | null> {
  const row = await queryOne<{
    id: string;
    venue_id: string;
    host_user_id: string;
    workout_type: string | null;
    scheduled_time: Date;
    started_at: Date | null;
    ended_at: Date | null;
    duration_minutes: number | null;
    status: TrainingSession['status'];
    max_participants: number;
    participant_count: number;
    notes: string | null;
    credits_awarded_per_participant: number;
    created_at: Date;
  }>(
    `SELECT * FROM training_sessions WHERE id = $1`,
    [sessionId]
  );

  if (!row) return null;

  return {
    id: row.id,
    venueId: row.venue_id,
    hostUserId: row.host_user_id,
    workoutType: row.workout_type || undefined,
    scheduledTime: row.scheduled_time,
    startedAt: row.started_at || undefined,
    endedAt: row.ended_at || undefined,
    durationMinutes: row.duration_minutes || undefined,
    status: row.status,
    maxParticipants: row.max_participants,
    participantCount: row.participant_count,
    notes: row.notes || undefined,
    creditsAwardedPerParticipant: row.credits_awarded_per_participant,
    createdAt: row.created_at,
  };
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Calculate distance between two points using Haversine formula
 */
function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371000; // Earth's radius in meters
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(deg: number): number {
  return deg * (Math.PI / 180);
}

/**
 * Publish presence update to subscribers
 */
async function publishPresenceUpdate(userId: string, presence: UserPresence): Promise<void> {
  await publish(PUBSUB_CHANNELS.PRESENCE, {
    userId,
    state: presence.state,
    venueId: presence.venueId,
    latitude: presence.latitude,
    longitude: presence.longitude,
    sessionOpenToJoin: presence.sessionOpenToJoin,
    sessionWorkoutType: presence.sessionWorkoutType,
    timestamp: new Date().toISOString(),
  });
}

/**
 * Refresh the venue activity materialized view
 */
async function refreshVenueActivityView(): Promise<void> {
  await query(`SELECT refresh_venue_activity_live()`);
}

/**
 * Expire stale presence and check-ins (call periodically)
 */
export async function expireStalePresence(): Promise<void> {
  await query(`SELECT expire_stale_presence()`);
}
