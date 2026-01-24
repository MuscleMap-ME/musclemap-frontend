/**
 * Community Presence GraphQL Resolvers
 *
 * Handles all presence-related queries, mutations, and subscriptions:
 * - User presence state and location
 * - Check-in/out at venues
 * - Training invites and sessions
 * - Privacy settings
 * - Nearby users and venues
 */

import { GraphQLError } from 'graphql';
import {
  getPresenceSettings,
  upsertPresenceSettings,
  applyPrivacyPreset,
  getUserPresence,
  updatePresence,
  setInvisible,
  checkIn,
  checkOut,
  getActiveCheckIn,
  getUsersAtVenue,
  getActiveVenuesNearby,
  sendTrainingInvite,
  acceptTrainingInvite,
  declineTrainingInvite,
  getPendingInvites,
  getTrainingInvite,
  getTrainingSession,
  expireStalePresence,
  PRIVACY_PRESETS,
  type PresenceState,
  type PrivacyPreset,
  type LocationPrecision,
  // Enhanced presence features
  QUICK_STATUS_OPTIONS,
  setQuickStatus,
  getUsersWithQuickStatus,
  getUserPartnerships,
  recordPartnershipSession,
  getVenueHourlyActivity,
  getVenueWeeklyPatterns,
  getVenueBestTimes,
  getTrainingPreferences,
  upsertTrainingPreferences,
  calculateCompatibility,
  getSuggestedPartners,
  createRecurringSchedule,
  getRecurringSchedule,
  getUserRecurringSchedules,
  joinRecurringSchedule,
  leaveRecurringSchedule,
  type QuickStatusType,
} from '../modules/presence';
import {
  subscribe,
  PUBSUB_CHANNELS,
  subscribeForVenue,
  subscribeForTrainingInvites,
  type VenuePresenceEvent,
  type NearbyPresenceEvent,
  type TrainingInviteEvent,
} from '../lib/pubsub';
import { loggers } from '../lib/logger';
import type { GraphQLContext } from './server';

const log = loggers.core;

// ============================================
// TYPES
// ============================================

function requireAuth(context: GraphQLContext): string {
  if (!context.user?.userId) {
    throw new GraphQLError('Authentication required', {
      extensions: { code: 'UNAUTHENTICATED' },
    });
  }
  return context.user.userId;
}

// ============================================
// QUERIES
// ============================================

export const presenceQueries = {
  /**
   * Get current user's presence state
   */
  myPresence: async (_: unknown, __: unknown, context: GraphQLContext) => {
    const userId = requireAuth(context);
    const presence = await getUserPresence(userId);

    if (!presence) {
      // Return default invisible state
      return {
        userId,
        state: 'invisible',
        locationPrecision: 'exact',
        sessionOpenToJoin: false,
        sessionMaxParticipants: 3,
        lastActiveAt: new Date(),
      };
    }

    return presence;
  },

  /**
   * Get current user's presence settings
   */
  myPresenceSettings: async (_: unknown, __: unknown, context: GraphQLContext) => {
    const userId = requireAuth(context);
    const settings = await getPresenceSettings(userId);

    if (!settings) {
      // Return defaults
      return {
        userId,
        sharePresence: false,
        privacyPreset: 'selective',
        locationEnabled: false,
        locationPrecision: 'approximate',
        locationOnlyWhenCheckedIn: true,
        locationAutoExpireMinutes: 120,
        visibleToEveryone: false,
        visibleToFollowers: true,
        visibleToMutualFollowers: true,
        showRealName: true,
        showProfilePhoto: true,
        showTrainingStats: false,
        showCurrentWorkout: true,
        showTrainingHistory: false,
        allowDirectMessages: true,
        allowMessagesFromEveryone: false,
        allowMessagesFromFollowers: true,
        allowMessagesFromMutualOnly: true,
        allowTrainingInvites: true,
        showInNearbyList: true,
        receiveNearbyNotifications: true,
        notifyWhenFriendsNearby: true,
        nearbyNotificationRadiusMeters: 500,
        lookingForTrainingPartners: false,
        maxTrainingGroupSize: 4,
      };
    }

    return settings;
  },

  /**
   * Get privacy preset options
   */
  privacyPresets: async () => {
    return [
      {
        id: 'social',
        name: 'Social',
        description: 'Most open - share your location and training, discover partners easily',
        settings: PRIVACY_PRESETS.social,
      },
      {
        id: 'selective',
        name: 'Selective',
        description: 'Balanced - visible to followers, messages from mutual followers',
        settings: PRIVACY_PRESETS.selective,
      },
      {
        id: 'private',
        name: 'Private',
        description: 'Minimal exposure - use app features without social visibility',
        settings: PRIVACY_PRESETS.private,
      },
    ];
  },

  /**
   * Get current user's active check-in
   */
  myActiveCheckIn: async (_: unknown, __: unknown, context: GraphQLContext) => {
    const userId = requireAuth(context);
    return getActiveCheckIn(userId);
  },

  /**
   * Get users currently at a specific venue
   */
  usersAtVenue: async (
    _: unknown,
    { venueId }: { venueId: string },
    context: GraphQLContext
  ) => {
    const userId = requireAuth(context);
    return getUsersAtVenue(venueId, userId);
  },

  /**
   * Get active venues nearby with user counts
   */
  activeVenuesNearby: async (
    _: unknown,
    { latitude, longitude, radiusMeters }: { latitude: number; longitude: number; radiusMeters?: number },
    context: GraphQLContext
  ) => {
    const userId = requireAuth(context);
    return getActiveVenuesNearby(latitude, longitude, radiusMeters || 2000, userId);
  },

  /**
   * Get pending training invites for current user
   */
  myTrainingInvites: async (_: unknown, __: unknown, context: GraphQLContext) => {
    const userId = requireAuth(context);
    return getPendingInvites(userId);
  },

  /**
   * Get a specific training invite
   */
  trainingInvite: async (
    _: unknown,
    { id }: { id: string },
    context: GraphQLContext
  ) => {
    requireAuth(context);
    return getTrainingInvite(id);
  },

  /**
   * Get a specific training session
   */
  trainingSession: async (
    _: unknown,
    { id }: { id: string },
    context: GraphQLContext
  ) => {
    requireAuth(context);
    return getTrainingSession(id);
  },

  // ============================================
  // ENHANCED PRESENCE QUERIES
  // ============================================

  /**
   * Get quick status options
   */
  quickStatusOptions: async () => {
    return Object.entries(QUICK_STATUS_OPTIONS).map(([id, config]) => ({
      id,
      label: config.label,
      icon: config.icon,
      defaultDurationMinutes: config.defaultDuration,
    }));
  },

  /**
   * Get users with a specific quick status at a venue
   */
  usersWithQuickStatus: async (
    _: unknown,
    { status, venueId }: { status: QuickStatusType; venueId?: string },
    context: GraphQLContext
  ) => {
    requireAuth(context);
    return getUsersWithQuickStatus(status, venueId);
  },

  /**
   * Get current user's training partnerships
   */
  myTrainingPartnerships: async (_: unknown, __: unknown, context: GraphQLContext) => {
    const userId = requireAuth(context);
    return getUserPartnerships(userId);
  },

  /**
   * Get venue activity heatmap data
   */
  venueHourlyActivity: async (
    _: unknown,
    { venueId, startDate, endDate }: { venueId: string; startDate: string; endDate: string },
    context: GraphQLContext
  ) => {
    requireAuth(context);
    return getVenueHourlyActivity(venueId, new Date(startDate), new Date(endDate));
  },

  /**
   * Get venue weekly patterns (predicted activity)
   */
  venueWeeklyPatterns: async (
    _: unknown,
    { venueId }: { venueId: string },
    context: GraphQLContext
  ) => {
    requireAuth(context);
    return getVenueWeeklyPatterns(venueId);
  },

  /**
   * Get best times to visit a venue
   */
  venueBestTimes: async (
    _: unknown,
    { venueId, preference }: { venueId: string; preference: 'busy' | 'quiet' | 'social' },
    context: GraphQLContext
  ) => {
    requireAuth(context);
    return getVenueBestTimes(venueId, preference);
  },

  /**
   * Get current user's training preferences
   */
  myTrainingPreferences: async (_: unknown, __: unknown, context: GraphQLContext) => {
    const userId = requireAuth(context);
    return getTrainingPreferences(userId);
  },

  /**
   * Calculate compatibility with another user
   */
  partnerCompatibility: async (
    _: unknown,
    { userId }: { userId: string },
    context: GraphQLContext
  ) => {
    const currentUserId = requireAuth(context);
    return calculateCompatibility(currentUserId, userId);
  },

  /**
   * Get suggested training partners
   */
  suggestedTrainingPartners: async (
    _: unknown,
    { venueId, limit }: { venueId?: string; limit?: number },
    context: GraphQLContext
  ) => {
    const userId = requireAuth(context);
    return getSuggestedPartners(userId, venueId, limit);
  },

  /**
   * Get current user's recurring training schedules
   */
  myRecurringSchedules: async (_: unknown, __: unknown, context: GraphQLContext) => {
    const userId = requireAuth(context);
    return getUserRecurringSchedules(userId);
  },

  /**
   * Get a specific recurring schedule
   */
  recurringSchedule: async (
    _: unknown,
    { id }: { id: string },
    context: GraphQLContext
  ) => {
    requireAuth(context);
    return getRecurringSchedule(id);
  },
};

// ============================================
// MUTATIONS
// ============================================

export const presenceMutations = {
  /**
   * Update presence settings
   */
  updatePresenceSettings: async (
    _: unknown,
    { input }: { input: Partial<{
      sharePresence: boolean;
      privacyPreset: PrivacyPreset;
      locationEnabled: boolean;
      locationPrecision: LocationPrecision;
      locationOnlyWhenCheckedIn: boolean;
      locationAutoExpireMinutes: number;
      visibleToEveryone: boolean;
      visibleToFollowers: boolean;
      visibleToMutualFollowers: boolean;
      showRealName: boolean;
      showProfilePhoto: boolean;
      showTrainingStats: boolean;
      showCurrentWorkout: boolean;
      showTrainingHistory: boolean;
      allowDirectMessages: boolean;
      allowMessagesFromEveryone: boolean;
      allowMessagesFromFollowers: boolean;
      allowMessagesFromMutualOnly: boolean;
      allowTrainingInvites: boolean;
      showInNearbyList: boolean;
      receiveNearbyNotifications: boolean;
      notifyWhenFriendsNearby: boolean;
      nearbyNotificationRadiusMeters: number;
      preferredTrainingTimes: string[];
      preferredWorkoutTypes: string[];
      lookingForTrainingPartners: boolean;
      maxTrainingGroupSize: number;
    }> },
    context: GraphQLContext
  ) => {
    const userId = requireAuth(context);
    return upsertPresenceSettings(userId, input);
  },

  /**
   * Apply a privacy preset
   */
  applyPresencePreset: async (
    _: unknown,
    { preset }: { preset: PrivacyPreset },
    context: GraphQLContext
  ) => {
    const userId = requireAuth(context);
    return applyPrivacyPreset(userId, preset);
  },

  /**
   * Update current presence state
   */
  updateMyPresence: async (
    _: unknown,
    { input }: { input: {
      state?: PresenceState;
      latitude?: number;
      longitude?: number;
      venueId?: string;
      sessionWorkoutType?: string;
      sessionTargetMuscles?: string[];
      sessionOpenToJoin?: boolean;
      sessionMaxParticipants?: number;
      sessionNotes?: string;
    } },
    context: GraphQLContext
  ) => {
    const userId = requireAuth(context);
    return updatePresence(userId, input);
  },

  /**
   * Set current user as invisible
   */
  goInvisible: async (_: unknown, __: unknown, context: GraphQLContext) => {
    const userId = requireAuth(context);
    await setInvisible(userId);
    return { success: true };
  },

  /**
   * Check in to a venue
   */
  venueCheckIn: async (
    _: unknown,
    { input }: { input: {
      venueId: string;
      latitude: number;
      longitude: number;
      locationAccuracy?: number;
      workoutType?: string;
      plannedDuration?: number;
      openToJoin?: boolean;
      visible?: boolean;
    } },
    context: GraphQLContext
  ) => {
    const userId = requireAuth(context);

    try {
      const result = await checkIn(userId, input.venueId, {
        latitude: input.latitude,
        longitude: input.longitude,
        locationAccuracy: input.locationAccuracy,
        workoutType: input.workoutType,
        plannedDuration: input.plannedDuration,
        openToJoin: input.openToJoin,
        visible: input.visible,
      });

      return {
        success: true,
        checkIn: result.checkIn,
        gpsVerified: result.gpsVerified,
        distanceMeters: result.distanceMeters,
        othersAtVenue: result.othersAtVenue,
        creditsAwarded: result.creditsAwarded,
      };
    } catch (error) {
      log.error({ error }, 'Failed to check in');
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to check in',
      };
    }
  },

  /**
   * Check out from current venue
   */
  venueCheckOut: async (_: unknown, __: unknown, context: GraphQLContext) => {
    const userId = requireAuth(context);

    const checkInRecord = await checkOut(userId);

    if (!checkInRecord) {
      return {
        success: false,
        error: 'No active check-in found',
      };
    }

    return {
      success: true,
      checkIn: checkInRecord,
    };
  },

  /**
   * Send a training invite
   */
  sendTrainingInvite: async (
    _: unknown,
    { input }: { input: {
      toUserId: string;
      venueId: string;
      proposedTime?: string;
      workoutType?: string;
      message?: string;
    } },
    context: GraphQLContext
  ) => {
    const userId = requireAuth(context);

    try {
      const invite = await sendTrainingInvite(userId, input.toUserId, input.venueId, {
        proposedTime: input.proposedTime ? new Date(input.proposedTime) : undefined,
        workoutType: input.workoutType,
        message: input.message,
      });

      return {
        success: true,
        invite,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to send invite',
      };
    }
  },

  /**
   * Accept a training invite
   */
  acceptTrainingInvite: async (
    _: unknown,
    { inviteId }: { inviteId: string },
    context: GraphQLContext
  ) => {
    const userId = requireAuth(context);

    try {
      const result = await acceptTrainingInvite(inviteId, userId);

      return {
        success: true,
        invite: result.invite,
        session: result.session,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to accept invite',
      };
    }
  },

  /**
   * Decline a training invite
   */
  declineTrainingInvite: async (
    _: unknown,
    { inviteId, message }: { inviteId: string; message?: string },
    context: GraphQLContext
  ) => {
    const userId = requireAuth(context);

    try {
      const invite = await declineTrainingInvite(inviteId, userId, message);

      return {
        success: true,
        invite,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to decline invite',
      };
    }
  },

  /**
   * Admin: Expire stale presence records
   */
  expireStalePresence: async (_: unknown, __: unknown, context: GraphQLContext) => {
    requireAuth(context);
    // TODO: Add admin check
    await expireStalePresence();
    return { success: true };
  },

  // ============================================
  // ENHANCED PRESENCE MUTATIONS
  // ============================================

  /**
   * Set quick status
   */
  setQuickStatus: async (
    _: unknown,
    { status, message, durationMinutes }: { status: QuickStatusType; message?: string; durationMinutes?: number },
    context: GraphQLContext
  ) => {
    const userId = requireAuth(context);
    try {
      await setQuickStatus(userId, status, message, durationMinutes);
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to set quick status',
      };
    }
  },

  /**
   * Record a training session with a partner (for streak tracking)
   */
  recordPartnerSession: async (
    _: unknown,
    { partnerId, venueId, sessionId, workoutType, durationMinutes }: {
      partnerId: string;
      venueId?: string;
      sessionId?: string;
      workoutType?: string;
      durationMinutes?: number;
    },
    context: GraphQLContext
  ) => {
    const userId = requireAuth(context);
    try {
      const result = await recordPartnershipSession(userId, partnerId, {
        venueId,
        sessionId,
        workoutType,
        durationMinutes,
      });
      return {
        success: true,
        partnership: result.partnership,
        streakMilestoneReached: result.streakMilestoneReached,
        bonusCredits: result.bonusCredits,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to record partner session',
      };
    }
  },

  /**
   * Update training preferences
   */
  updateTrainingPreferences: async (
    _: unknown,
    { input }: { input: {
      preferredExercises?: string[];
      preferredMuscleGroups?: string[];
      preferredWorkoutTypes?: string[];
      typicalWorkoutDurationMinutes?: number;
      experienceLevel?: string;
      goals?: string[];
      preferredDays?: number[];
      preferredHours?: number[];
      timezone?: string;
      preferredGroupSize?: number;
      openToBeginners?: boolean;
      willingToTeach?: boolean;
      lookingForMentor?: boolean;
      communicationStyle?: string;
      intensityPreference?: string;
      favoriteVenueIds?: string[];
      maxTravelDistanceKm?: number;
    } },
    context: GraphQLContext
  ) => {
    const userId = requireAuth(context);
    return upsertTrainingPreferences(userId, input);
  },

  /**
   * Create a recurring training schedule
   */
  createRecurringSchedule: async (
    _: unknown,
    { input }: { input: {
      venueId?: string;
      title: string;
      description?: string;
      workoutType?: string;
      targetMuscles?: string[];
      durationMinutes: number;
      recurrenceType: 'daily' | 'weekly' | 'biweekly' | 'monthly';
      daysOfWeek: number[];
      startTime: string;
      timezone?: string;
      maxParticipants?: number;
      requireApproval?: boolean;
      allowGuests?: boolean;
      startDate: string;
      endDate?: string;
    } },
    context: GraphQLContext
  ) => {
    const userId = requireAuth(context);
    try {
      const schedule = await createRecurringSchedule(userId, {
        creatorId: userId,
        venueId: input.venueId || null,
        title: input.title,
        description: input.description || null,
        workoutType: input.workoutType || null,
        targetMuscles: input.targetMuscles || [],
        durationMinutes: input.durationMinutes,
        recurrenceType: input.recurrenceType,
        daysOfWeek: input.daysOfWeek,
        startTime: input.startTime,
        timezone: input.timezone || 'America/New_York',
        maxParticipants: input.maxParticipants || 4,
        requireApproval: input.requireApproval || false,
        allowGuests: input.allowGuests || false,
        isActive: true,
        startDate: new Date(input.startDate),
        endDate: input.endDate ? new Date(input.endDate) : null,
      });
      return { success: true, schedule };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create schedule',
      };
    }
  },

  /**
   * Join a recurring schedule
   */
  joinRecurringSchedule: async (
    _: unknown,
    { scheduleId }: { scheduleId: string },
    context: GraphQLContext
  ) => {
    const userId = requireAuth(context);
    try {
      const member = await joinRecurringSchedule(scheduleId, userId);
      return { success: true, member };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to join schedule',
      };
    }
  },

  /**
   * Leave a recurring schedule
   */
  leaveRecurringSchedule: async (
    _: unknown,
    { scheduleId }: { scheduleId: string },
    context: GraphQLContext
  ) => {
    const userId = requireAuth(context);
    try {
      await leaveRecurringSchedule(scheduleId, userId);
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to leave schedule',
      };
    }
  },
};

// ============================================
// SUBSCRIPTIONS
// ============================================

export const presenceSubscriptions = {
  /**
   * Subscribe to presence updates at a venue
   */
  venuePresenceUpdated: {
    subscribe: (_: unknown, { venueId }: { venueId: string }, context: GraphQLContext) => {
      requireAuth(context);

      return subscribeForVenue<VenuePresenceEvent>(
        PUBSUB_CHANNELS.VENUE_PRESENCE,
        venueId
      );
    },
    resolve: (payload: VenuePresenceEvent) => ({
      userId: payload.userId,
      state: payload.state,
      venueId: payload.venueId,
      latitude: payload.latitude,
      longitude: payload.longitude,
      sessionOpenToJoin: payload.sessionOpenToJoin,
      sessionWorkoutType: payload.sessionWorkoutType,
      timestamp: payload.timestamp,
    }),
  },

  /**
   * Subscribe to nearby presence updates
   */
  nearbyPresenceUpdated: {
    subscribe: (_: unknown, __: unknown, context: GraphQLContext) => {
      requireAuth(context);

      return subscribe<NearbyPresenceEvent>(PUBSUB_CHANNELS.NEARBY_PRESENCE);
    },
    resolve: (payload: NearbyPresenceEvent) => ({
      userId: payload.userId,
      state: payload.state,
      venueId: payload.venueId,
      latitude: payload.latitude,
      longitude: payload.longitude,
      sessionOpenToJoin: payload.sessionOpenToJoin,
      sessionWorkoutType: payload.sessionWorkoutType,
      timestamp: payload.timestamp,
    }),
  },

  /**
   * Subscribe to training invite updates
   */
  trainingInviteReceived: {
    subscribe: (_: unknown, __: unknown, context: GraphQLContext) => {
      const userId = requireAuth(context);

      return subscribeForTrainingInvites<TrainingInviteEvent>(
        PUBSUB_CHANNELS.TRAINING_INVITE,
        userId
      );
    },
    resolve: (payload: TrainingInviteEvent) => ({
      id: payload.inviteId,
      fromUserId: payload.fromUserId,
      toUserId: payload.toUserId,
      venueId: payload.venueId,
      proposedTime: payload.proposedTime,
      workoutType: payload.workoutType,
      message: payload.message,
      status: payload.status,
      createdAt: payload.timestamp,
    }),
  },
};

// ============================================
// TYPE RESOLVERS
// ============================================

export const presenceTypeResolvers = {
  UserPresence: {
    venue: async (presence: { venueId?: string }) => {
      if (!presence.venueId) return null;
      // TODO: Use DataLoader
      const { queryOne } = await import('../db/client');
      return queryOne(
        `SELECT * FROM fitness_venues WHERE id = $1`,
        [presence.venueId]
      );
    },
  },

  VenueCheckIn: {
    venue: async (checkIn: { venueId: string }) => {
      const { queryOne } = await import('../db/client');
      return queryOne(
        `SELECT * FROM fitness_venues WHERE id = $1`,
        [checkIn.venueId]
      );
    },
    user: async (checkIn: { userId: string }) => {
      const { queryOne } = await import('../db/client');
      return queryOne(
        `SELECT * FROM users WHERE id = $1`,
        [checkIn.userId]
      );
    },
  },

  TrainingInvite: {
    fromUser: async (invite: { fromUserId: string }) => {
      const { queryOne } = await import('../db/client');
      return queryOne(
        `SELECT * FROM users WHERE id = $1`,
        [invite.fromUserId]
      );
    },
    toUser: async (invite: { toUserId: string }) => {
      const { queryOne } = await import('../db/client');
      return queryOne(
        `SELECT * FROM users WHERE id = $1`,
        [invite.toUserId]
      );
    },
    venue: async (invite: { venueId: string }) => {
      const { queryOne } = await import('../db/client');
      return queryOne(
        `SELECT * FROM fitness_venues WHERE id = $1`,
        [invite.venueId]
      );
    },
    session: async (invite: { sessionId?: string }) => {
      if (!invite.sessionId) return null;
      return getTrainingSession(invite.sessionId);
    },
  },

  TrainingSession: {
    host: async (session: { hostUserId: string }) => {
      const { queryOne } = await import('../db/client');
      return queryOne(
        `SELECT * FROM users WHERE id = $1`,
        [session.hostUserId]
      );
    },
    venue: async (session: { venueId: string }) => {
      const { queryOne } = await import('../db/client');
      return queryOne(
        `SELECT * FROM fitness_venues WHERE id = $1`,
        [session.venueId]
      );
    },
    participants: async (session: { id: string }) => {
      const { queryAll } = await import('../db/client');
      return queryAll(
        `SELECT u.* FROM users u
         JOIN training_session_participants tsp ON u.id = tsp.user_id
         WHERE tsp.session_id = $1 AND tsp.status = 'joined'`,
        [session.id]
      );
    },
  },

  UserAtVenue: {
    user: async (userAtVenue: { userId: string }) => {
      const { queryOne } = await import('../db/client');
      return queryOne(
        `SELECT * FROM users WHERE id = $1`,
        [userAtVenue.userId]
      );
    },
  },

  NearbyVenue: {
    venue: async (nearbyVenue: { venueId: string }) => {
      const { queryOne } = await import('../db/client');
      return queryOne(
        `SELECT * FROM fitness_venues WHERE id = $1`,
        [nearbyVenue.venueId]
      );
    },
  },
};

// ============================================
// SCHEMA TYPES (to be added to schema.ts)
// ============================================

export const presenceTypeDefs = `
  # ============================================
  # COMMUNITY PRESENCE TYPES
  # ============================================

  enum PresenceState {
    invisible
    location_only
    visible
    training_now
    open_to_train
  }

  enum QuickStatusType {
    none
    looking_for_spotter
    need_workout_buddy
    open_to_teach
    want_to_learn
    warming_up
    cooling_down
    taking_a_break
    last_set
  }

  enum PrivacyPreset {
    social
    selective
    private
  }

  enum LocationPrecision {
    exact
    approximate
    area_only
  }

  type UserPresence {
    userId: ID!
    state: PresenceState!
    latitude: Float
    longitude: Float
    locationPrecision: LocationPrecision!
    venueId: ID
    venue: OutdoorVenue
    sessionStartedAt: DateTime
    sessionPlannedDuration: Int
    sessionWorkoutType: String
    sessionTargetMuscles: [String!]
    sessionOpenToJoin: Boolean!
    sessionMaxParticipants: Int!
    sessionNotes: String
    locationUpdatedAt: DateTime
    lastActiveAt: DateTime!
  }

  type PresenceSettings {
    userId: ID!
    sharePresence: Boolean!
    privacyPreset: PrivacyPreset!

    # Location
    locationEnabled: Boolean!
    locationPrecision: LocationPrecision!
    locationOnlyWhenCheckedIn: Boolean!
    locationAutoExpireMinutes: Int!

    # Visibility
    visibleToEveryone: Boolean!
    visibleToFollowers: Boolean!
    visibleToMutualFollowers: Boolean!

    # Profile
    showRealName: Boolean!
    showProfilePhoto: Boolean!
    showTrainingStats: Boolean!
    showCurrentWorkout: Boolean!
    showTrainingHistory: Boolean!

    # Contact
    allowDirectMessages: Boolean!
    allowMessagesFromEveryone: Boolean!
    allowMessagesFromFollowers: Boolean!
    allowMessagesFromMutualOnly: Boolean!
    allowTrainingInvites: Boolean!

    # Nearby
    showInNearbyList: Boolean!
    receiveNearbyNotifications: Boolean!
    notifyWhenFriendsNearby: Boolean!
    nearbyNotificationRadiusMeters: Int!

    # Training
    preferredTrainingTimes: [String!]
    preferredWorkoutTypes: [String!]
    lookingForTrainingPartners: Boolean!
    maxTrainingGroupSize: Int!
  }

  type PrivacyPresetOption {
    id: ID!
    name: String!
    description: String!
    settings: PresenceSettings
  }

  type VenueCheckIn {
    id: ID!
    venueId: ID!
    venue: OutdoorVenue!
    userId: ID!
    user: User
    latitude: Float!
    longitude: Float!
    distanceFromVenueMeters: Float
    locationAccuracyMeters: Float
    isActive: Boolean!
    checkedInAt: DateTime!
    checkedOutAt: DateTime
    autoCheckout: Boolean!
    workoutType: String
    openToJoin: Boolean!
    visibleToOthers: Boolean!
    plannedDuration: Int
    sessionId: ID
    verificationMethod: String!
    gpsVerified: Boolean!
    workoutId: ID
  }

  type UserAtVenue {
    userId: ID!
    user: User
    displayName: String!
    username: String!
    avatarUrl: String
    checkedInAt: DateTime!
    workoutType: String
    openToJoin: Boolean!
    canMessage: Boolean!
    isFollowing: Boolean!
    isFollower: Boolean!
    isMutual: Boolean!
    durationMinutes: Int!
  }

  type NearbyVenue {
    venueId: ID!
    venue: OutdoorVenue
    name: String!
    latitude: Float!
    longitude: Float!
    distanceMeters: Int!
    currentUserCount: Int!
    openToTrainCount: Int!
    hasFriendsHere: Boolean!
    friendsHereCount: Int!
  }

  type TrainingInvite {
    id: ID!
    fromUserId: ID!
    fromUser: User
    toUserId: ID!
    toUser: User
    venueId: ID!
    venue: OutdoorVenue
    proposedTime: DateTime!
    workoutType: String
    message: String
    isNow: Boolean!
    status: String!
    statusMessage: String
    respondedAt: DateTime
    expiresAt: DateTime!
    sessionId: ID
    session: TrainingSession
    messageId: ID
    conversationId: ID
    createdAt: DateTime!
  }

  type TrainingSession {
    id: ID!
    venueId: ID!
    venue: OutdoorVenue
    hostUserId: ID!
    host: User
    workoutType: String
    scheduledTime: DateTime!
    startedAt: DateTime
    endedAt: DateTime
    durationMinutes: Int
    status: String!
    maxParticipants: Int!
    participantCount: Int!
    participants: [User!]
    notes: String
    creditsAwardedPerParticipant: Int!
    createdAt: DateTime!
  }

  # Check-in result
  type CheckInResult {
    success: Boolean!
    checkIn: VenueCheckIn
    gpsVerified: Boolean
    distanceMeters: Float
    othersAtVenue: [UserAtVenue!]
    creditsAwarded: Int
    error: String
  }

  type CheckOutResult {
    success: Boolean!
    checkIn: VenueCheckIn
    error: String
  }

  type TrainingInviteResult {
    success: Boolean!
    invite: TrainingInvite
    session: TrainingSession
    error: String
  }

  # Generic mutation result for simple success/error responses
  type PresenceMutationResult {
    success: Boolean!
    message: String
    error: String
  }

  # Inputs
  input PresenceSettingsInput {
    sharePresence: Boolean
    privacyPreset: PrivacyPreset
    locationEnabled: Boolean
    locationPrecision: LocationPrecision
    locationOnlyWhenCheckedIn: Boolean
    locationAutoExpireMinutes: Int
    visibleToEveryone: Boolean
    visibleToFollowers: Boolean
    visibleToMutualFollowers: Boolean
    showRealName: Boolean
    showProfilePhoto: Boolean
    showTrainingStats: Boolean
    showCurrentWorkout: Boolean
    showTrainingHistory: Boolean
    allowDirectMessages: Boolean
    allowMessagesFromEveryone: Boolean
    allowMessagesFromFollowers: Boolean
    allowMessagesFromMutualOnly: Boolean
    allowTrainingInvites: Boolean
    showInNearbyList: Boolean
    receiveNearbyNotifications: Boolean
    notifyWhenFriendsNearby: Boolean
    nearbyNotificationRadiusMeters: Int
    preferredTrainingTimes: [String!]
    preferredWorkoutTypes: [String!]
    lookingForTrainingPartners: Boolean
    maxTrainingGroupSize: Int
  }

  input PresenceUpdateInput {
    state: PresenceState
    latitude: Float
    longitude: Float
    venueId: ID
    sessionWorkoutType: String
    sessionTargetMuscles: [String!]
    sessionOpenToJoin: Boolean
    sessionMaxParticipants: Int
    sessionNotes: String
  }

  input VenueCheckInInput {
    venueId: ID!
    latitude: Float!
    longitude: Float!
    locationAccuracy: Float
    workoutType: String
    plannedDuration: Int
    openToJoin: Boolean
    visible: Boolean
  }

  input TrainingInviteInput {
    toUserId: ID!
    venueId: ID!
    proposedTime: DateTime
    workoutType: String
    message: String
  }

  # Subscription payloads
  type PresenceUpdate {
    userId: ID!
    state: PresenceState!
    venueId: ID
    latitude: Float
    longitude: Float
    sessionOpenToJoin: Boolean
    sessionWorkoutType: String
    timestamp: DateTime!
  }

  # ============================================
  # ENHANCED PRESENCE TYPES
  # ============================================

  type QuickStatusOption {
    id: ID!
    label: String!
    icon: String!
    defaultDurationMinutes: Int!
  }

  type UserWithQuickStatus {
    userId: ID!
    username: String!
    displayName: String
    avatarUrl: String
    quickStatusMessage: String
    checkedInAt: DateTime
  }

  type TrainingPartnership {
    id: ID!
    userId1: ID!
    userId2: ID!
    partnerUserId: ID!
    partnerUsername: String!
    totalSessions: Int!
    currentStreak: Int!
    longestStreak: Int!
    lastSessionDate: String
    totalCreditsEarned: Int!
    favoriteVenues: [String!]!
    favoriteWorkoutTypes: [String!]!
    firstSessionAt: DateTime
    createdAt: DateTime!
  }

  type PartnerSessionResult {
    success: Boolean!
    partnership: TrainingPartnership
    streakMilestoneReached: Int
    bonusCredits: Int
    error: String
  }

  type VenueHourlyActivity {
    venueId: ID!
    activityDate: String!
    hourOfDay: Int!
    dayOfWeek: Int!
    checkInCount: Int!
    uniqueUserCount: Int!
    peakConcurrentUsers: Int!
    avgSessionDurationMinutes: Int!
    openToTrainCount: Int!
    trainingSessionsCount: Int!
  }

  type VenueWeeklyPattern {
    venueId: ID!
    dayOfWeek: Int!
    hourOfDay: Int!
    avgCheckInCount: Float!
    avgUniqueUsers: Float!
    avgOpenToTrain: Float!
    activityLevel: String!
    sampleSize: Int!
  }

  type VenueBestTime {
    dayOfWeek: Int!
    hourOfDay: Int!
    score: Float!
  }

  type UserTrainingPreferences {
    userId: ID!
    preferredExercises: [String!]!
    preferredMuscleGroups: [String!]!
    preferredWorkoutTypes: [String!]!
    typicalWorkoutDurationMinutes: Int!
    experienceLevel: String
    goals: [String!]!
    preferredDays: [Int!]!
    preferredHours: [Int!]!
    timezone: String!
    preferredGroupSize: Int!
    openToBeginners: Boolean!
    willingToTeach: Boolean!
    lookingForMentor: Boolean!
    communicationStyle: String
    intensityPreference: String
    favoriteVenueIds: [String!]!
    maxTravelDistanceKm: Int!
  }

  type PartnerCompatibility {
    userId1: ID!
    userId2: ID!
    username: String
    avatarUrl: String
    overallScore: Float!
    scheduleCompatibility: Float!
    workoutCompatibility: Float!
    experienceCompatibility: Float!
    socialCompatibility: Float!
    commonExercises: [String!]!
    commonTimes: [String!]!
  }

  type RecurringTrainingSchedule {
    id: ID!
    creatorId: ID!
    creator: User
    venueId: ID
    venue: OutdoorVenue
    title: String!
    description: String
    workoutType: String
    targetMuscles: [String!]!
    durationMinutes: Int!
    recurrenceType: String!
    daysOfWeek: [Int!]!
    startTime: String!
    timezone: String!
    maxParticipants: Int!
    requireApproval: Boolean!
    allowGuests: Boolean!
    isActive: Boolean!
    startDate: String!
    endDate: String
    createdAt: DateTime!
  }

  type RecurringScheduleMember {
    id: ID!
    scheduleId: ID!
    userId: ID!
    user: User
    role: String!
    status: String!
    notifyBeforeSession: Boolean!
    notifyMinutesBefore: Int!
    joinedAt: DateTime!
  }

  type RecurringScheduleResult {
    success: Boolean!
    schedule: RecurringTrainingSchedule
    error: String
  }

  type RecurringScheduleMemberResult {
    success: Boolean!
    member: RecurringScheduleMember
    error: String
  }

  # Input types for enhanced features
  input TrainingPreferencesInput {
    preferredExercises: [String!]
    preferredMuscleGroups: [String!]
    preferredWorkoutTypes: [String!]
    typicalWorkoutDurationMinutes: Int
    experienceLevel: String
    goals: [String!]
    preferredDays: [Int!]
    preferredHours: [Int!]
    timezone: String
    preferredGroupSize: Int
    openToBeginners: Boolean
    willingToTeach: Boolean
    lookingForMentor: Boolean
    communicationStyle: String
    intensityPreference: String
    favoriteVenueIds: [String!]
    maxTravelDistanceKm: Int
  }

  input RecurringScheduleInput {
    venueId: ID
    title: String!
    description: String
    workoutType: String
    targetMuscles: [String!]
    durationMinutes: Int!
    recurrenceType: String!
    daysOfWeek: [Int!]!
    startTime: String!
    timezone: String
    maxParticipants: Int
    requireApproval: Boolean
    allowGuests: Boolean
    startDate: String!
    endDate: String
  }

  # Extend Query
  extend type Query {
    # Presence
    myPresence: UserPresence!
    myPresenceSettings: PresenceSettings!
    privacyPresets: [PrivacyPresetOption!]!

    # Check-ins
    myActiveCheckIn: VenueCheckIn

    # Venue activity
    usersAtVenue(venueId: ID!): [UserAtVenue!]!
    activeVenuesNearby(latitude: Float!, longitude: Float!, radiusMeters: Int): [NearbyVenue!]!

    # Training
    myTrainingInvites: [TrainingInvite!]!
    trainingInvite(id: ID!): TrainingInvite
    trainingSession(id: ID!): TrainingSession

    # Enhanced: Quick Status
    quickStatusOptions: [QuickStatusOption!]!
    usersWithQuickStatus(status: QuickStatusType!, venueId: ID): [UserWithQuickStatus!]!

    # Enhanced: Training Partnerships & Streaks
    myTrainingPartnerships: [TrainingPartnership!]!

    # Enhanced: Venue Heatmaps
    venueHourlyActivity(venueId: ID!, startDate: String!, endDate: String!): [VenueHourlyActivity!]!
    venueWeeklyPatterns(venueId: ID!): [VenueWeeklyPattern!]!
    venueBestTimes(venueId: ID!, preference: String!): [VenueBestTime!]!

    # Enhanced: Partner Compatibility
    myTrainingPreferences: UserTrainingPreferences
    partnerCompatibility(userId: ID!): PartnerCompatibility!
    suggestedTrainingPartners(venueId: ID, limit: Int): [PartnerCompatibility!]!

    # Enhanced: Recurring Schedules
    myRecurringSchedules: [RecurringTrainingSchedule!]!
    recurringSchedule(id: ID!): RecurringTrainingSchedule
  }

  # Extend Mutation
  extend type Mutation {
    # Settings
    updatePresenceSettings(input: PresenceSettingsInput!): PresenceSettings!
    applyPresencePreset(preset: PrivacyPreset!): PresenceSettings!

    # Presence
    updateMyPresence(input: PresenceUpdateInput!): UserPresence!
    goInvisible: PresenceMutationResult!

    # Check-in
    venueCheckIn(input: VenueCheckInInput!): CheckInResult!
    venueCheckOut: CheckOutResult!

    # Training invites
    sendTrainingInvite(input: TrainingInviteInput!): TrainingInviteResult!
    acceptTrainingInvite(inviteId: ID!): TrainingInviteResult!
    declineTrainingInvite(inviteId: ID!, message: String): TrainingInviteResult!

    # Admin
    expireStalePresence: PresenceMutationResult!

    # Enhanced: Quick Status
    setQuickStatus(status: QuickStatusType!, message: String, durationMinutes: Int): PresenceMutationResult!

    # Enhanced: Partner Sessions & Streaks
    recordPartnerSession(
      partnerId: ID!
      venueId: ID
      sessionId: ID
      workoutType: String
      durationMinutes: Int
    ): PartnerSessionResult!

    # Enhanced: Training Preferences
    updateTrainingPreferences(input: TrainingPreferencesInput!): UserTrainingPreferences!

    # Enhanced: Recurring Schedules
    createRecurringSchedule(input: RecurringScheduleInput!): RecurringScheduleResult!
    joinRecurringSchedule(scheduleId: ID!): RecurringScheduleMemberResult!
    leaveRecurringSchedule(scheduleId: ID!): PresenceMutationResult!
  }

  # Extend Subscription
  extend type Subscription {
    venuePresenceUpdated(venueId: ID!): PresenceUpdate!
    nearbyPresenceUpdated: PresenceUpdate!
    trainingInviteReceived: TrainingInvite!
  }
`;
