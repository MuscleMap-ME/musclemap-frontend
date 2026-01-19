/**
 * Preferences Store (Zustand)
 *
 * Manages user preferences state including:
 * - Coaching visibility (Max, mascot)
 * - Guidance level (handholding)
 * - Dashboard customization
 * - Notification settings
 * - Hydration reminders
 * - Sound settings
 * - Workout preferences
 * - Display settings
 * - Privacy settings
 * - Music integration settings
 *
 * Uses selector-based subscriptions for optimal performance.
 *
 * @example
 * // Only re-renders when coaching settings change
 * const coaching = usePreferences((s) => s.preferences.coaching);
 *
 * // Use shorthand hooks for common patterns
 * const { maxCoachVisible, toggleMaxCoach } = useCoachingSettings();
 */

import { create } from 'zustand';
import { subscribeWithSelector, persist } from 'zustand/middleware';
import {
  UserPreferences,
  PreferenceProfile,
  DEFAULT_PREFERENCES,
  mergeWithDefaults,
  applyProfileOverrides,
  GuidanceLevel,
} from '@musclemap/shared';

// ============================================
// TYPES
// ============================================

interface PreferencesState {
  // Core state
  preferences: UserPreferences;
  activeProfileId: string | null;
  profiles: PreferenceProfile[];
  version: number;

  // Loading states
  isLoading: boolean;
  isSaving: boolean;
  error: string | null;

  // Sync state
  lastSyncAt: string | null;
  deviceId: string | null;

  // Actions
  loadPreferences: () => Promise<void>;
  updatePreferences: (partial: Partial<UserPreferences>) => Promise<void>;
  resetPreferences: () => Promise<void>;

  // Profile actions
  loadProfiles: () => Promise<void>;
  createProfile: (name: string, description?: string, overrides?: Partial<UserPreferences>) => Promise<PreferenceProfile | null>;
  updateProfile: (profileId: string, updates: Partial<PreferenceProfile>) => Promise<void>;
  deleteProfile: (profileId: string) => Promise<void>;
  activateProfile: (profileId: string) => Promise<void>;
  deactivateProfile: () => Promise<void>;

  // Computed
  getEffectivePreferences: () => UserPreferences;

  // Quick updates for common settings
  setGuidanceLevel: (level: GuidanceLevel) => Promise<void>;
  toggleMaxCoach: () => Promise<void>;
  toggleMascot: () => Promise<void>;
  toggleMetronome: () => Promise<void>;
  setMetronomeBpm: (bpm: number) => Promise<void>;
  toggleHydrationReminders: () => Promise<void>;
  setHydrationInterval: (minutes: number) => Promise<void>;

  // Internal
  _setPreferences: (prefs: Partial<UserPreferences>) => void;
  _setProfiles: (profiles: PreferenceProfile[]) => void;
  _setLoading: (loading: boolean) => void;
  _setError: (error: string | null) => void;
}

// ============================================
// API HELPERS
// ============================================

const getToken = () => localStorage.getItem('musclemap_token');

async function fetchWithAuth(url: string, options: RequestInit = {}): Promise<Response> {
  const token = getToken();
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  if (token) {
    (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
  }

  return fetch(url, { ...options, headers });
}

// ============================================
// STORE
// ============================================

export const usePreferencesStore = create<PreferencesState>()(
  subscribeWithSelector(
    persist(
      (set, get) => ({
        // Initial state
        preferences: DEFAULT_PREFERENCES,
        activeProfileId: null,
        profiles: [],
        version: 0,
        isLoading: false,
        isSaving: false,
        error: null,
        lastSyncAt: null,
        deviceId: null,

        // ============================================
        // CORE ACTIONS
        // ============================================

        loadPreferences: async () => {
          const token = getToken();
          if (!token) {
            set({ isLoading: false });
            return;
          }

          set({ isLoading: true, error: null });

          try {
            const res = await fetchWithAuth('/api/me/preferences');
            if (!res.ok) throw new Error('Failed to load preferences');

            const data = await res.json();
            if (data.success && data.data) {
              const merged = mergeWithDefaults(data.data.preferences || {});
              set({
                preferences: merged,
                activeProfileId: data.data.activeProfileId || null,
                version: data.data.version || 1,
                isLoading: false,
                lastSyncAt: new Date().toISOString(),
              });
            }
          } catch (err) {
            set({
              error: err instanceof Error ? err.message : 'Failed to load preferences',
              isLoading: false,
            });
          }
        },

        updatePreferences: async (partial) => {
          set({ isSaving: true, error: null });

          // Optimistic update
          const prev = get().preferences;
          const merged: UserPreferences = {
            coaching: { ...prev.coaching, ...partial.coaching },
            guidanceLevel: partial.guidanceLevel ?? prev.guidanceLevel,
            dashboard: { ...prev.dashboard, ...partial.dashboard },
            notifications: { ...prev.notifications, ...partial.notifications },
            hydration: { ...prev.hydration, ...partial.hydration },
            sounds: { ...prev.sounds, ...partial.sounds },
            workout: { ...prev.workout, ...partial.workout },
            display: { ...prev.display, ...partial.display },
            units: { ...prev.units, ...partial.units },
            privacy: { ...prev.privacy, ...partial.privacy },
            music: { ...prev.music, ...partial.music },
          };

          set({ preferences: merged });

          try {
            const res = await fetchWithAuth('/api/me/preferences', {
              method: 'PATCH',
              body: JSON.stringify(partial),
            });

            if (!res.ok) throw new Error('Failed to save preferences');

            const data = await res.json();
            if (data.success && data.data) {
              set({
                preferences: mergeWithDefaults(data.data.preferences),
                version: data.data.version,
                isSaving: false,
              });
            }
          } catch (err) {
            // Rollback on error
            set({
              preferences: prev,
              error: err instanceof Error ? err.message : 'Failed to save preferences',
              isSaving: false,
            });
          }
        },

        resetPreferences: async () => {
          set({ isSaving: true, error: null });

          try {
            const res = await fetchWithAuth('/api/me/preferences/reset', {
              method: 'PUT',
            });

            if (!res.ok) throw new Error('Failed to reset preferences');

            set({
              preferences: DEFAULT_PREFERENCES,
              isSaving: false,
            });
          } catch (err) {
            set({
              error: err instanceof Error ? err.message : 'Failed to reset preferences',
              isSaving: false,
            });
          }
        },

        // ============================================
        // PROFILE ACTIONS
        // ============================================

        loadProfiles: async () => {
          try {
            const res = await fetchWithAuth('/api/me/preferences/profiles');
            if (!res.ok) throw new Error('Failed to load profiles');

            const data = await res.json();
            if (data.success && data.data) {
              set({ profiles: data.data.profiles || [] });
            }
          } catch (err) {
            set({
              error: err instanceof Error ? err.message : 'Failed to load profiles',
            });
          }
        },

        createProfile: async (name, description, overrides) => {
          try {
            const res = await fetchWithAuth('/api/me/preferences/profiles', {
              method: 'POST',
              body: JSON.stringify({
                name,
                description,
                preferencesOverride: overrides,
              }),
            });

            if (!res.ok) throw new Error('Failed to create profile');

            const data = await res.json();
            if (data.success && data.data?.profile) {
              set((s) => ({
                profiles: [...s.profiles, data.data.profile],
              }));
              return data.data.profile;
            }
            return null;
          } catch (err) {
            set({
              error: err instanceof Error ? err.message : 'Failed to create profile',
            });
            return null;
          }
        },

        updateProfile: async (profileId, updates) => {
          try {
            const res = await fetchWithAuth(`/api/me/preferences/profiles/${profileId}`, {
              method: 'PATCH',
              body: JSON.stringify(updates),
            });

            if (!res.ok) throw new Error('Failed to update profile');

            const data = await res.json();
            if (data.success && data.data?.profile) {
              set((s) => ({
                profiles: s.profiles.map((p) =>
                  p.id === profileId ? data.data.profile : p
                ),
              }));
            }
          } catch (err) {
            set({
              error: err instanceof Error ? err.message : 'Failed to update profile',
            });
          }
        },

        deleteProfile: async (profileId) => {
          try {
            const res = await fetchWithAuth(`/api/me/preferences/profiles/${profileId}`, {
              method: 'DELETE',
            });

            if (!res.ok) throw new Error('Failed to delete profile');

            set((s) => ({
              profiles: s.profiles.filter((p) => p.id !== profileId),
              activeProfileId: s.activeProfileId === profileId ? null : s.activeProfileId,
            }));
          } catch (err) {
            set({
              error: err instanceof Error ? err.message : 'Failed to delete profile',
            });
          }
        },

        activateProfile: async (profileId) => {
          try {
            const res = await fetchWithAuth(`/api/me/preferences/profiles/${profileId}/activate`, {
              method: 'POST',
            });

            if (!res.ok) throw new Error('Failed to activate profile');

            set({ activeProfileId: profileId });
          } catch (err) {
            set({
              error: err instanceof Error ? err.message : 'Failed to activate profile',
            });
          }
        },

        deactivateProfile: async () => {
          try {
            const res = await fetchWithAuth('/api/me/preferences/profiles/deactivate', {
              method: 'POST',
            });

            if (!res.ok) throw new Error('Failed to deactivate profile');

            set({ activeProfileId: null });
          } catch (err) {
            set({
              error: err instanceof Error ? err.message : 'Failed to deactivate profile',
            });
          }
        },

        // ============================================
        // COMPUTED
        // ============================================

        getEffectivePreferences: () => {
          const { preferences, activeProfileId, profiles } = get();

          if (!activeProfileId) {
            return preferences;
          }

          const activeProfile = profiles.find((p) => p.id === activeProfileId);
          if (!activeProfile) {
            return preferences;
          }

          return applyProfileOverrides(preferences, activeProfile.preferencesOverride);
        },

        // ============================================
        // QUICK UPDATES
        // ============================================

        setGuidanceLevel: async (level) => {
          await get().updatePreferences({ guidanceLevel: level });
        },

        toggleMaxCoach: async () => {
          const current = get().preferences.coaching.maxCoachVisible;
          await get().updatePreferences({
            coaching: { ...get().preferences.coaching, maxCoachVisible: !current },
          });
        },

        toggleMascot: async () => {
          const current = get().preferences.coaching.mascotVisible;
          await get().updatePreferences({
            coaching: { ...get().preferences.coaching, mascotVisible: !current },
          });
        },

        toggleMetronome: async () => {
          const current = get().preferences.sounds.metronomeEnabled;
          await get().updatePreferences({
            sounds: { ...get().preferences.sounds, metronomeEnabled: !current },
          });
        },

        setMetronomeBpm: async (bpm) => {
          await get().updatePreferences({
            sounds: { ...get().preferences.sounds, metronomeBpm: bpm },
          });
        },

        toggleHydrationReminders: async () => {
          const current = get().preferences.hydration.enabled;
          await get().updatePreferences({
            hydration: { ...get().preferences.hydration, enabled: !current },
          });
        },

        setHydrationInterval: async (minutes) => {
          await get().updatePreferences({
            hydration: { ...get().preferences.hydration, intervalMinutes: minutes },
          });
        },

        // ============================================
        // INTERNAL
        // ============================================

        _setPreferences: (prefs) => {
          set((s) => ({
            preferences: { ...s.preferences, ...prefs },
          }));
        },

        _setProfiles: (profiles) => set({ profiles }),
        _setLoading: (isLoading) => set({ isLoading }),
        _setError: (error) => set({ error }),
      }),
      {
        name: 'musclemap-preferences',
        partialize: (state) => ({
          // Only persist preferences locally for offline support
          preferences: state.preferences,
          activeProfileId: state.activeProfileId,
          profiles: state.profiles,
          version: state.version,
          lastSyncAt: state.lastSyncAt,
          deviceId: state.deviceId,
        }),
      }
    )
  )
);

// ============================================
// SHORTHAND HOOKS
// ============================================

/**
 * Hook for coaching visibility settings (Max, mascot, tips)
 */
export const useCoachingSettings = () => {
  const coaching = usePreferencesStore((s) => s.preferences.coaching);
  const toggleMaxCoach = usePreferencesStore((s) => s.toggleMaxCoach);
  const toggleMascot = usePreferencesStore((s) => s.toggleMascot);
  const updatePreferences = usePreferencesStore((s) => s.updatePreferences);

  return {
    ...coaching,
    toggleMaxCoach,
    toggleMascot,
    toggleTips: () => updatePreferences({
      coaching: { ...coaching, coachTipsEnabled: !coaching.coachTipsEnabled },
    }),
    toggleMotivationalQuotes: () => updatePreferences({
      coaching: { ...coaching, motivationalQuotes: !coaching.motivationalQuotes },
    }),
    toggleFormCues: () => updatePreferences({
      coaching: { ...coaching, formCuesEnabled: !coaching.formCuesEnabled },
    }),
  };
};

/**
 * Hook for guidance/handholding level
 */
export const useGuidanceLevel = () => {
  const guidanceLevel = usePreferencesStore((s) => s.preferences.guidanceLevel);
  const setGuidanceLevel = usePreferencesStore((s) => s.setGuidanceLevel);

  return {
    level: guidanceLevel,
    setLevel: setGuidanceLevel,
    isBeginner: guidanceLevel === 'beginner',
    isIntermediate: guidanceLevel === 'intermediate',
    isAdvanced: guidanceLevel === 'advanced',
    isExpert: guidanceLevel === 'expert',
    // Helper to check if tips should be shown at current level
    shouldShowTips: guidanceLevel !== 'expert',
    shouldShowDetailedHelp: guidanceLevel === 'beginner',
    shouldShowFormCues: guidanceLevel === 'beginner' || guidanceLevel === 'intermediate',
  };
};

/**
 * Hook for dashboard visibility settings
 */
export const useDashboardSettings = () => {
  const dashboard = usePreferencesStore((s) => s.preferences.dashboard);
  const updatePreferences = usePreferencesStore((s) => s.updatePreferences);

  const toggle = (key: keyof typeof dashboard) => {
    if (typeof dashboard[key] === 'boolean') {
      updatePreferences({
        dashboard: { ...dashboard, [key]: !dashboard[key] },
      });
    }
  };

  return {
    ...dashboard,
    toggle,
    setLayout: (layout: typeof dashboard.layout) =>
      updatePreferences({ dashboard: { ...dashboard, layout } }),
  };
};

/**
 * Hook for notification settings
 */
export const useNotificationSettings = () => {
  const notifications = usePreferencesStore((s) => s.preferences.notifications);
  const updatePreferences = usePreferencesStore((s) => s.updatePreferences);

  const toggle = (key: keyof typeof notifications) => {
    if (typeof notifications[key] === 'boolean') {
      updatePreferences({
        notifications: { ...notifications, [key]: !notifications[key] },
      });
    }
  };

  return {
    ...notifications,
    toggle,
    setQuietHours: (start: string, end: string) =>
      updatePreferences({
        notifications: { ...notifications, quietHoursStart: start, quietHoursEnd: end },
      }),
  };
};

/**
 * Hook for hydration reminder settings
 */
export const useHydrationSettings = () => {
  const hydration = usePreferencesStore((s) => s.preferences.hydration);
  const toggleHydrationReminders = usePreferencesStore((s) => s.toggleHydrationReminders);
  const setHydrationInterval = usePreferencesStore((s) => s.setHydrationInterval);
  const updatePreferences = usePreferencesStore((s) => s.updatePreferences);

  return {
    ...hydration,
    toggle: toggleHydrationReminders,
    setInterval: setHydrationInterval,
    setDailyGoal: (oz: number) =>
      updatePreferences({ hydration: { ...hydration, dailyGoalOz: oz } }),
  };
};

/**
 * Hook for sound and metronome settings
 */
export const useSoundSettings = () => {
  const sounds = usePreferencesStore((s) => s.preferences.sounds);
  const toggleMetronome = usePreferencesStore((s) => s.toggleMetronome);
  const setMetronomeBpm = usePreferencesStore((s) => s.setMetronomeBpm);
  const updatePreferences = usePreferencesStore((s) => s.updatePreferences);

  return {
    ...sounds,
    toggleMetronome,
    setMetronomeBpm,
    setMasterVolume: (volume: number) =>
      updatePreferences({ sounds: { ...sounds, masterVolume: volume } }),
    toggleTimerSound: () =>
      updatePreferences({ sounds: { ...sounds, timerSoundEnabled: !sounds.timerSoundEnabled } }),
    setSoundType: (type: typeof sounds.timerSoundType) =>
      updatePreferences({ sounds: { ...sounds, timerSoundType: type } }),
    setMetronomeAccent: (accent: number) =>
      updatePreferences({ sounds: { ...sounds, metronomeAccent: accent } }),
  };
};

/**
 * Hook for workout settings
 */
export const useWorkoutSettings = () => {
  const workout = usePreferencesStore((s) => s.preferences.workout);
  const updatePreferences = usePreferencesStore((s) => s.updatePreferences);

  return {
    ...workout,
    setDefaultRest: (seconds: number) =>
      updatePreferences({ workout: { ...workout, defaultRestSeconds: seconds } }),
    toggleAutoStartTimer: () =>
      updatePreferences({ workout: { ...workout, autoStartTimer: !workout.autoStartTimer } }),
    toggleFloatingTimer: () =>
      updatePreferences({ workout: { ...workout, showFloatingTimer: !workout.showFloatingTimer } }),
  };
};

/**
 * Hook for display/accessibility settings
 */
export const useDisplaySettings = () => {
  const display = usePreferencesStore((s) => s.preferences.display);
  const updatePreferences = usePreferencesStore((s) => s.updatePreferences);

  return {
    ...display,
    setTheme: (theme: string) =>
      updatePreferences({ display: { ...display, theme } }),
    toggleReducedMotion: () =>
      updatePreferences({ display: { ...display, reducedMotion: !display.reducedMotion } }),
    toggleHighContrast: () =>
      updatePreferences({ display: { ...display, highContrast: !display.highContrast } }),
    setTextSize: (size: typeof display.textSize) =>
      updatePreferences({ display: { ...display, textSize: size } }),
    setColorBlindMode: (mode: typeof display.colorBlindMode) =>
      updatePreferences({ display: { ...display, colorBlindMode: mode } }),
  };
};

/**
 * Hook for privacy settings
 */
export const usePrivacySettings = () => {
  const privacy = usePreferencesStore((s) => s.preferences.privacy);
  const updatePreferences = usePreferencesStore((s) => s.updatePreferences);

  const toggle = (key: keyof typeof privacy) => {
    updatePreferences({
      privacy: { ...privacy, [key]: !privacy[key] },
    });
  };

  return {
    ...privacy,
    toggle,
  };
};

/**
 * Hook for music integration settings
 */
export const useMusicSettings = () => {
  const music = usePreferencesStore((s) => s.preferences.music);
  const updatePreferences = usePreferencesStore((s) => s.updatePreferences);

  return {
    ...music,
    toggleAutoPlay: () =>
      updatePreferences({ music: { ...music, autoPlayOnWorkout: !music.autoPlayOnWorkout } }),
    toggleBpmMatching: () =>
      updatePreferences({ music: { ...music, bpmMatchingEnabled: !music.bpmMatchingEnabled } }),
    toggleFadeOnRest: () =>
      updatePreferences({ music: { ...music, fadeOnRest: !music.fadeOnRest } }),
    setDefaultProvider: (provider: typeof music.defaultProvider) =>
      updatePreferences({ music: { ...music, defaultProvider: provider } }),
  };
};

/**
 * Hook for configuration profiles
 */
export const usePreferenceProfiles = () => {
  const profiles = usePreferencesStore((s) => s.profiles);
  const activeProfileId = usePreferencesStore((s) => s.activeProfileId);
  const loadProfiles = usePreferencesStore((s) => s.loadProfiles);
  const createProfile = usePreferencesStore((s) => s.createProfile);
  const updateProfile = usePreferencesStore((s) => s.updateProfile);
  const deleteProfile = usePreferencesStore((s) => s.deleteProfile);
  const activateProfile = usePreferencesStore((s) => s.activateProfile);
  const deactivateProfile = usePreferencesStore((s) => s.deactivateProfile);

  const activeProfile = profiles.find((p) => p.id === activeProfileId);

  return {
    profiles,
    activeProfileId,
    activeProfile,
    hasActiveProfile: !!activeProfileId,
    load: loadProfiles,
    create: createProfile,
    update: updateProfile,
    remove: deleteProfile,
    activate: activateProfile,
    deactivate: deactivateProfile,
  };
};

/**
 * Hook for getting effective preferences (with profile overrides applied)
 */
export const useEffectivePreferences = () => {
  const getEffectivePreferences = usePreferencesStore((s) => s.getEffectivePreferences);
  return getEffectivePreferences();
};

/**
 * Hook for preferences loading/saving state
 */
export const usePreferencesState = () => {
  const isLoading = usePreferencesStore((s) => s.isLoading);
  const isSaving = usePreferencesStore((s) => s.isSaving);
  const error = usePreferencesStore((s) => s.error);
  const loadPreferences = usePreferencesStore((s) => s.loadPreferences);
  const resetPreferences = usePreferencesStore((s) => s.resetPreferences);

  return {
    isLoading,
    isSaving,
    error,
    load: loadPreferences,
    reset: resetPreferences,
  };
};

export default usePreferencesStore;
