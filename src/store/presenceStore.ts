/**
 * Community Presence Store (Zustand)
 *
 * Manages real-time presence state for community features:
 * - User presence at venues
 * - Check-in/out status
 * - Training invites
 * - Nearby users discovery
 * - Privacy settings
 *
 * @example
 * // Subscribe to specific state slices to prevent unnecessary re-renders
 * const myPresence = usePresenceStore((s) => s.myPresence);
 *
 * // Use shorthand hooks for common operations
 * const { checkIn, checkOut, isCheckedIn } = useVenueCheckIn();
 * const { invites, acceptInvite, declineInvite } = useTrainingInvites();
 */

import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';

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
  venueName?: string;
  sessionStartedAt?: string;
  sessionPlannedDuration?: number;
  sessionWorkoutType?: string;
  sessionTargetMuscles?: string[];
  sessionOpenToJoin: boolean;
  sessionMaxParticipants: number;
  lastActiveAt: string;
}

export interface PresenceSettings {
  sharePresence: boolean;
  privacyPreset: PrivacyPreset;
  locationEnabled: boolean;
  locationPrecision: LocationPrecision;
  visibleToStrangers: boolean;
  visibleToFriends: boolean;
  visibleToFollowers: boolean;
  showActivityStatus: boolean;
  showWorkoutDetails: boolean;
  showTrainingStats: boolean;
  showEquipmentUsage: boolean;
  showTrainingHistory: boolean;
  allowDiscovery: boolean;
  allowTrainingInvites: boolean;
  allowMessageFromNearby: boolean;
  notifyOnNearbyFriend: boolean;
  notifyOnTrainingInvite: boolean;
  preferredTrainingTimes: string[];
  trainingInterests: string[];
  lookingForTrainingPartners: boolean;
  maxTrainingGroupSize: number;
}

export interface VenueCheckIn {
  id: string;
  venueId: string;
  venueName?: string;
  latitude: number;
  longitude: number;
  checkedInAt: string;
  plannedDuration?: number;
  workoutType?: string;
  openToJoin: boolean;
  gpsVerified: boolean;
  distanceMeters?: number;
}

export interface TrainingInvite {
  id: string;
  fromUserId: string;
  fromUsername?: string;
  fromAvatarUrl?: string;
  toUserId: string;
  venueId: string;
  venueName?: string;
  proposedTime: string;
  workoutType?: string;
  message?: string;
  isNow: boolean;
  status: 'pending' | 'accepted' | 'declined' | 'expired';
  expiresAt: string;
  createdAt: string;
}

export interface UserAtVenue {
  userId: string;
  username: string;
  avatarUrl?: string;
  state: PresenceState;
  sessionOpenToJoin: boolean;
  sessionWorkoutType?: string;
  isFriend: boolean;
  isFollowing: boolean;
  checkedInAt: string;
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
// STORE INTERFACE
// ============================================

interface PresenceStoreState {
  // Presence state
  myPresence: UserPresence | null;
  mySettings: PresenceSettings | null;
  activeCheckIn: VenueCheckIn | null;

  // Training invites
  pendingInvites: TrainingInvite[];
  sentInvites: TrainingInvite[];

  // Venue presence
  usersAtCurrentVenue: UserAtVenue[];
  nearbyVenues: NearbyVenue[];

  // UI State
  isLoadingPresence: boolean;
  isLoadingSettings: boolean;
  isCheckingIn: boolean;
  isCheckingOut: boolean;
  isSendingInvite: boolean;
  error: string | null;

  // Location state
  currentLocation: { latitude: number; longitude: number } | null;
  locationPermission: 'granted' | 'denied' | 'prompt' | null;

  // Actions - Presence
  setMyPresence: (presence: UserPresence | null) => void;
  updateMyPresence: (updates: Partial<UserPresence>) => void;
  goInvisible: () => void;

  // Actions - Settings
  setMySettings: (settings: PresenceSettings | null) => void;
  updateSettings: (updates: Partial<PresenceSettings>) => void;
  applyPreset: (preset: PrivacyPreset) => void;

  // Actions - Check-in
  setActiveCheckIn: (checkIn: VenueCheckIn | null) => void;
  checkIn: (venueId: string, options?: {
    workoutType?: string;
    plannedDuration?: number;
    openToJoin?: boolean;
  }) => Promise<VenueCheckIn | null>;
  checkOut: () => Promise<boolean>;

  // Actions - Training Invites
  setPendingInvites: (invites: TrainingInvite[]) => void;
  setSentInvites: (invites: TrainingInvite[]) => void;
  addInvite: (invite: TrainingInvite) => void;
  updateInvite: (inviteId: string, updates: Partial<TrainingInvite>) => void;
  removeInvite: (inviteId: string) => void;
  sendInvite: (toUserId: string, venueId: string, options?: {
    proposedTime?: string;
    workoutType?: string;
    message?: string;
  }) => Promise<TrainingInvite | null>;
  acceptInvite: (inviteId: string) => Promise<boolean>;
  declineInvite: (inviteId: string, message?: string) => Promise<boolean>;

  // Actions - Venue Users
  setUsersAtCurrentVenue: (users: UserAtVenue[]) => void;
  addUserAtVenue: (user: UserAtVenue) => void;
  removeUserFromVenue: (userId: string) => void;
  updateUserAtVenue: (userId: string, updates: Partial<UserAtVenue>) => void;

  // Actions - Nearby
  setNearbyVenues: (venues: NearbyVenue[]) => void;
  updateNearbyVenue: (venueId: string, updates: Partial<NearbyVenue>) => void;

  // Actions - Location
  setCurrentLocation: (location: { latitude: number; longitude: number } | null) => void;
  setLocationPermission: (permission: 'granted' | 'denied' | 'prompt') => void;
  requestLocationPermission: () => Promise<boolean>;

  // Actions - Loading & Error
  setLoading: (key: 'presence' | 'settings' | 'checkIn' | 'checkOut' | 'invite', loading: boolean) => void;
  setError: (error: string | null) => void;
  clearError: () => void;

  // Actions - Reset
  reset: () => void;
}

// ============================================
// INITIAL STATE
// ============================================

const initialState = {
  // Presence
  myPresence: null,
  mySettings: null,
  activeCheckIn: null,

  // Invites
  pendingInvites: [],
  sentInvites: [],

  // Venue
  usersAtCurrentVenue: [],
  nearbyVenues: [],

  // UI
  isLoadingPresence: false,
  isLoadingSettings: false,
  isCheckingIn: false,
  isCheckingOut: false,
  isSendingInvite: false,
  error: null,

  // Location
  currentLocation: null,
  locationPermission: null,
};

// ============================================
// STORE IMPLEMENTATION
// ============================================

export const usePresenceStore = create<PresenceStoreState>()(
  subscribeWithSelector((set, get) => ({
    ...initialState,

    // ========== PRESENCE ACTIONS ==========

    setMyPresence: (presence) => set({ myPresence: presence }),

    updateMyPresence: (updates) => set((state) => ({
      myPresence: state.myPresence ? { ...state.myPresence, ...updates } : null,
    })),

    goInvisible: () => set((state) => ({
      myPresence: state.myPresence
        ? { ...state.myPresence, state: 'invisible' as PresenceState }
        : null,
    })),

    // ========== SETTINGS ACTIONS ==========

    setMySettings: (settings) => set({ mySettings: settings }),

    updateSettings: (updates) => set((state) => ({
      mySettings: state.mySettings ? { ...state.mySettings, ...updates } : null,
    })),

    applyPreset: (preset) => {
      // Presets update multiple settings at once
      const presetSettings: Partial<PresenceSettings> = {
        social: {
          sharePresence: true,
          locationEnabled: true,
          locationPrecision: 'exact' as LocationPrecision,
          visibleToStrangers: true,
          visibleToFriends: true,
          visibleToFollowers: true,
          showActivityStatus: true,
          showWorkoutDetails: true,
          allowDiscovery: true,
          allowTrainingInvites: true,
          allowMessageFromNearby: true,
          notifyOnNearbyFriend: true,
          notifyOnTrainingInvite: true,
        },
        selective: {
          sharePresence: true,
          locationEnabled: true,
          locationPrecision: 'approximate' as LocationPrecision,
          visibleToStrangers: false,
          visibleToFriends: true,
          visibleToFollowers: false,
          showActivityStatus: true,
          showWorkoutDetails: false,
          allowDiscovery: false,
          allowTrainingInvites: true,
          allowMessageFromNearby: false,
          notifyOnNearbyFriend: true,
          notifyOnTrainingInvite: true,
        },
        private: {
          sharePresence: false,
          locationEnabled: false,
          visibleToStrangers: false,
          visibleToFriends: false,
          visibleToFollowers: false,
          showActivityStatus: false,
          showWorkoutDetails: false,
          allowDiscovery: false,
          allowTrainingInvites: false,
          allowMessageFromNearby: false,
          notifyOnNearbyFriend: false,
          notifyOnTrainingInvite: false,
        },
      }[preset];

      set((state) => ({
        mySettings: state.mySettings
          ? { ...state.mySettings, ...presetSettings, privacyPreset: preset }
          : null,
      }));
    },

    // ========== CHECK-IN ACTIONS ==========

    setActiveCheckIn: (checkIn) => set({ activeCheckIn: checkIn }),

    checkIn: async (venueId, options = {}) => {
      const { currentLocation } = get();

      if (!currentLocation) {
        set({ error: 'Location not available' });
        return null;
      }

      set({ isCheckingIn: true, error: null });

      try {
        // This would call the GraphQL mutation
        // For now, return a mock check-in
        const checkIn: VenueCheckIn = {
          id: `checkin-${Date.now()}`,
          venueId,
          latitude: currentLocation.latitude,
          longitude: currentLocation.longitude,
          checkedInAt: new Date().toISOString(),
          plannedDuration: options.plannedDuration,
          workoutType: options.workoutType,
          openToJoin: options.openToJoin ?? false,
          gpsVerified: true,
        };

        set({
          activeCheckIn: checkIn,
          isCheckingIn: false,
          myPresence: get().myPresence
            ? { ...get().myPresence!, state: options.openToJoin ? 'open_to_train' : 'visible', venueId }
            : null,
        });

        return checkIn;
      } catch (error) {
        set({ error: (error as Error).message, isCheckingIn: false });
        return null;
      }
    },

    checkOut: async () => {
      set({ isCheckingOut: true, error: null });

      try {
        // This would call the GraphQL mutation
        set({
          activeCheckIn: null,
          isCheckingOut: false,
          usersAtCurrentVenue: [],
          myPresence: get().myPresence
            ? { ...get().myPresence!, state: 'invisible', venueId: undefined }
            : null,
        });
        return true;
      } catch (error) {
        set({ error: (error as Error).message, isCheckingOut: false });
        return false;
      }
    },

    // ========== TRAINING INVITES ACTIONS ==========

    setPendingInvites: (invites) => set({ pendingInvites: invites }),
    setSentInvites: (invites) => set({ sentInvites: invites }),

    addInvite: (invite) => set((state) => {
      if (invite.toUserId === state.myPresence?.userId) {
        return { pendingInvites: [...state.pendingInvites, invite] };
      }
      return { sentInvites: [...state.sentInvites, invite] };
    }),

    updateInvite: (inviteId, updates) => set((state) => ({
      pendingInvites: state.pendingInvites.map((i) =>
        i.id === inviteId ? { ...i, ...updates } : i
      ),
      sentInvites: state.sentInvites.map((i) =>
        i.id === inviteId ? { ...i, ...updates } : i
      ),
    })),

    removeInvite: (inviteId) => set((state) => ({
      pendingInvites: state.pendingInvites.filter((i) => i.id !== inviteId),
      sentInvites: state.sentInvites.filter((i) => i.id !== inviteId),
    })),

    sendInvite: async (toUserId, venueId, options = {}) => {
      set({ isSendingInvite: true, error: null });

      try {
        // This would call the GraphQL mutation
        const invite: TrainingInvite = {
          id: `invite-${Date.now()}`,
          fromUserId: get().myPresence?.userId ?? '',
          toUserId,
          venueId,
          proposedTime: options.proposedTime ?? new Date().toISOString(),
          workoutType: options.workoutType,
          message: options.message,
          isNow: !options.proposedTime,
          status: 'pending',
          expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
          createdAt: new Date().toISOString(),
        };

        set((state) => ({
          sentInvites: [...state.sentInvites, invite],
          isSendingInvite: false,
        }));

        return invite;
      } catch (error) {
        set({ error: (error as Error).message, isSendingInvite: false });
        return null;
      }
    },

    acceptInvite: async (inviteId) => {
      try {
        // This would call the GraphQL mutation
        set((state) => ({
          pendingInvites: state.pendingInvites.map((i) =>
            i.id === inviteId ? { ...i, status: 'accepted' as const } : i
          ),
        }));
        return true;
      } catch (error) {
        set({ error: (error as Error).message });
        return false;
      }
    },

    declineInvite: async (inviteId, _message) => {
      try {
        // This would call the GraphQL mutation
        set((state) => ({
          pendingInvites: state.pendingInvites.filter((i) => i.id !== inviteId),
        }));
        return true;
      } catch (error) {
        set({ error: (error as Error).message });
        return false;
      }
    },

    // ========== VENUE USERS ACTIONS ==========

    setUsersAtCurrentVenue: (users) => set({ usersAtCurrentVenue: users }),

    addUserAtVenue: (user) => set((state) => ({
      usersAtCurrentVenue: [...state.usersAtCurrentVenue.filter((u) => u.userId !== user.userId), user],
    })),

    removeUserFromVenue: (userId) => set((state) => ({
      usersAtCurrentVenue: state.usersAtCurrentVenue.filter((u) => u.userId !== userId),
    })),

    updateUserAtVenue: (userId, updates) => set((state) => ({
      usersAtCurrentVenue: state.usersAtCurrentVenue.map((u) =>
        u.userId === userId ? { ...u, ...updates } : u
      ),
    })),

    // ========== NEARBY VENUES ACTIONS ==========

    setNearbyVenues: (venues) => set({ nearbyVenues: venues }),

    updateNearbyVenue: (venueId, updates) => set((state) => ({
      nearbyVenues: state.nearbyVenues.map((v) =>
        v.venueId === venueId ? { ...v, ...updates } : v
      ),
    })),

    // ========== LOCATION ACTIONS ==========

    setCurrentLocation: (location) => set({ currentLocation: location }),

    setLocationPermission: (permission) => set({ locationPermission: permission }),

    requestLocationPermission: async () => {
      if (!navigator.geolocation) {
        set({ locationPermission: 'denied', error: 'Geolocation not supported' });
        return false;
      }

      return new Promise((resolve) => {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            set({
              locationPermission: 'granted',
              currentLocation: {
                latitude: position.coords.latitude,
                longitude: position.coords.longitude,
              },
            });
            resolve(true);
          },
          () => {
            set({ locationPermission: 'denied' });
            resolve(false);
          },
          { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
        );
      });
    },

    // ========== LOADING & ERROR ACTIONS ==========

    setLoading: (key, loading) => {
      const loadingKeys: Record<string, keyof PresenceStoreState> = {
        presence: 'isLoadingPresence',
        settings: 'isLoadingSettings',
        checkIn: 'isCheckingIn',
        checkOut: 'isCheckingOut',
        invite: 'isSendingInvite',
      };
      set({ [loadingKeys[key]]: loading } as Partial<PresenceStoreState>);
    },

    setError: (error) => set({ error }),
    clearError: () => set({ error: null }),

    // ========== RESET ==========

    reset: () => set(initialState),
  }))
);

// ============================================
// SHORTHAND HOOKS
// ============================================

/**
 * Hook for venue check-in/out operations
 */
export function useVenueCheckIn() {
  const activeCheckIn = usePresenceStore((s) => s.activeCheckIn);
  const isCheckingIn = usePresenceStore((s) => s.isCheckingIn);
  const isCheckingOut = usePresenceStore((s) => s.isCheckingOut);
  const checkIn = usePresenceStore((s) => s.checkIn);
  const checkOut = usePresenceStore((s) => s.checkOut);
  const currentLocation = usePresenceStore((s) => s.currentLocation);

  return {
    activeCheckIn,
    isCheckedIn: !!activeCheckIn,
    isCheckingIn,
    isCheckingOut,
    checkIn,
    checkOut,
    currentLocation,
  };
}

/**
 * Hook for training invites
 */
export function useTrainingInvites() {
  const pendingInvites = usePresenceStore((s) => s.pendingInvites);
  const sentInvites = usePresenceStore((s) => s.sentInvites);
  const sendInvite = usePresenceStore((s) => s.sendInvite);
  const acceptInvite = usePresenceStore((s) => s.acceptInvite);
  const declineInvite = usePresenceStore((s) => s.declineInvite);
  const isSendingInvite = usePresenceStore((s) => s.isSendingInvite);

  return {
    pendingInvites,
    sentInvites,
    pendingCount: pendingInvites.length,
    sendInvite,
    acceptInvite,
    declineInvite,
    isSendingInvite,
  };
}

/**
 * Hook for presence settings
 */
export function usePresenceSettings() {
  const settings = usePresenceStore((s) => s.mySettings);
  const updateSettings = usePresenceStore((s) => s.updateSettings);
  const applyPreset = usePresenceStore((s) => s.applyPreset);
  const isLoading = usePresenceStore((s) => s.isLoadingSettings);

  return {
    settings,
    updateSettings,
    applyPreset,
    isLoading,
    privacyPreset: settings?.privacyPreset ?? 'selective',
    isShareEnabled: settings?.sharePresence ?? false,
    isLocationEnabled: settings?.locationEnabled ?? false,
  };
}

/**
 * Hook for nearby venues
 */
export function useNearbyVenues() {
  const venues = usePresenceStore((s) => s.nearbyVenues);
  const setVenues = usePresenceStore((s) => s.setNearbyVenues);
  const updateVenue = usePresenceStore((s) => s.updateNearbyVenue);

  return {
    venues,
    setVenues,
    updateVenue,
    hasNearbyActivity: venues.some((v) => v.currentUserCount > 0),
    nearbyFriendCount: venues.reduce((sum, v) => sum + v.friendsHereCount, 0),
  };
}

/**
 * Hook for users at current venue
 */
export function useUsersAtVenue() {
  const users = usePresenceStore((s) => s.usersAtCurrentVenue);
  const addUser = usePresenceStore((s) => s.addUserAtVenue);
  const removeUser = usePresenceStore((s) => s.removeUserFromVenue);
  const updateUser = usePresenceStore((s) => s.updateUserAtVenue);

  return {
    users,
    userCount: users.length,
    friendsHere: users.filter((u) => u.isFriend),
    openToTrain: users.filter((u) => u.sessionOpenToJoin),
    addUser,
    removeUser,
    updateUser,
  };
}

/**
 * Hook for my presence state
 */
export function useMyPresence() {
  const presence = usePresenceStore((s) => s.myPresence);
  const updatePresence = usePresenceStore((s) => s.updateMyPresence);
  const goInvisible = usePresenceStore((s) => s.goInvisible);
  const isLoading = usePresenceStore((s) => s.isLoadingPresence);

  return {
    presence,
    state: presence?.state ?? 'invisible',
    isVisible: presence?.state !== 'invisible',
    isOpenToTrain: presence?.state === 'open_to_train',
    updatePresence,
    goInvisible,
    isLoading,
  };
}

/**
 * Hook for location permissions and current location
 */
export function useLocation() {
  const currentLocation = usePresenceStore((s) => s.currentLocation);
  const permission = usePresenceStore((s) => s.locationPermission);
  const requestPermission = usePresenceStore((s) => s.requestLocationPermission);
  const setLocation = usePresenceStore((s) => s.setCurrentLocation);

  return {
    location: currentLocation,
    permission,
    hasPermission: permission === 'granted',
    requestPermission,
    setLocation,
  };
}

export default usePresenceStore;
