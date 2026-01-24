/**
 * Store Index
 *
 * Central export for all Zustand stores and their associated hooks.
 * This is the primary entry point for state management in MuscleMap.
 *
 * ⚠️ DEPRECATION WARNING:
 * Importing from this barrel file (@/store or ../store) prevents tree-shaking
 * and increases bundle size. For better performance, import directly from
 * the specific store file instead.
 *
 * Example:
 *   ❌ import { useAuth, useToast } from '@/store';
 *   ✅ import { useAuth } from '@/store/authStore';
 *   ✅ import { useToast } from '@/store/uiStore';
 *
 * ARCHITECTURE OVERVIEW:
 * ----------------------
 * MuscleMap uses a hybrid state management approach:
 *
 * 1. ZUSTAND STORES (for client-side state that changes frequently)
 *    - uiStore: Modals, sidebars, toasts, loading states
 *    - workoutSessionStore: Active workout tracking, rest timer, sets
 *    - muscleVisualizationStore: 3D model state, highlighting, intensity
 *    - authStore: Authentication (with persistence)
 *
 * 2. REACT CONTEXT (for infrequently changing data)
 *    - ThemeContext: Dark/light mode
 *    - LocaleContext: i18n/language settings
 *
 * 3. APOLLO CLIENT (for server state)
 *    - User data, workouts, achievements - everything from the database
 *
 * WHY THIS APPROACH:
 * ------------------
 * - Zustand: Selector-based subscriptions minimize re-renders
 * - Context: Simple API for static/rarely-changing data
 * - Apollo: Handles caching, deduplication, optimistic updates for server data
 *
 * PERFORMANCE TIPS:
 * -----------------
 * - Always use selectors with Zustand stores:
 *   ✅ const sidebar = useUIStore((s) => s.sidebarOpen)
 *   ❌ const { sidebarOpen } = useUIStore() // subscribes to ALL changes
 *
 * - For multiple values, use a single selector returning an object:
 *   ✅ const { a, b } = useUIStore((s) => ({ a: s.a, b: s.b }))
 */

// ============================================
// AUTH STORE
// ============================================
export {
  useAuthStore,
  useAuth,
  getToken,
  getAuthHeader,
  default as authStore,
} from './authStore';

// ============================================
// UI STORE
// ============================================
export {
  useUIStore,
  useModal,
  useToast,
  useConfirm,
  useResponsive,
  default as uiStore,
} from './uiStore';

// ============================================
// WORKOUT SESSION STORE
// ============================================
export {
  useWorkoutSessionStore,
  useRestTimer,
  useWorkoutMetrics,
  useCurrentExercise,
  useSessionPRs,
  use1RM,
  useSetLogging,
  useCelebrationCallbacks,
  useWorkoutCompletion,
  useWorkoutCelebrationState,
  calculate1RM,
  get1RMPercentage,
  SET_TAGS,
  REST_PRESETS,
  default as workoutSessionStore,
} from './workoutSessionStore';

// ============================================
// MUSCLE VISUALIZATION STORE
// ============================================
export {
  useMuscleVisualizationStore,
  useMuscleHighlight,
  useMuscleIntensity,
  useCameraControls,
  MUSCLE_GROUPS,
  CAMERA_PRESETS,
  default as muscleVisualizationStore,
} from './muscleVisualizationStore';

// ============================================
// NUTRITION STORE
// ============================================
export {
  useNutritionStore,
  useNutritionEnabled,
  useNutritionPreferences,
  useNutritionGoals,
  useTodaysSummary,
  useTodaysMeals,
  useNutritionStreaks,
  useArchetypeProfile,
  useNutritionLoading,
  useNutritionError,
  useQuickLogOpen,
  useQuickLogMealType,
  useSearchResults,
  useRecentFoods,
  useFrequentFoods,
  useRemainingMacros,
  useMacroProgress,
  default as nutritionStore,
} from './nutritionStore';

// ============================================
// FEEDBACK STORE
// ============================================
export {
  useFeedbackStore,
  useFeedbackModal,
  useFeedbackForm,
  useFaq,
  useFeatureVoting,
  useMyFeedback,
  FEEDBACK_TYPES,
  FEEDBACK_LABELS,
  FEEDBACK_ICONS,
  FEEDBACK_DESCRIPTIONS,
  PRIORITY_OPTIONS,
  default as feedbackStore,
} from './feedbackStore';

// ============================================
// OFFLINE STORE
// ============================================
export {
  useOfflineStore,
  useOnlineStatus,
  useSyncStatus,
  usePendingOperations,
  useConflicts,
  useExerciseCache,
  useOffline,
  SYNC_STATUS,
  CONFLICT_RESOLUTION,
  OPERATION_TYPES,
  default as offlineStore,
} from './offlineStore';

// ============================================
// ENGAGEMENT STORE
// ============================================
export {
  useEngagementStore,
  useDailyLogin,
  useStreaks,
  useChallenges,
  useEvents,
  useRecovery,
  useEngagementModals,
  useMultipliers,
  default as engagementStore,
} from './engagementStore';

// ============================================
// ADVENTURE MAP STORE
// ============================================
export {
  useAdventureMapStore,
  useCharacterPosition,
  useMapView,
  useLocationSelection,
  useMapProgress,
  useMapUI,
  default as adventureMapStore,
} from './adventureMapStore';

// ============================================
// PRESENCE STORE
// ============================================
export {
  usePresenceStore,
  useVenueCheckIn,
  useTrainingInvites,
  usePresenceSettings,
  useNearbyVenues,
  useUsersAtVenue,
  useMyPresence,
  useLocation,
  default as presenceStore,
} from './presenceStore';

export type {
  PresenceState,
  PrivacyPreset,
  LocationPrecision,
  UserPresence,
  PresenceSettings,
  VenueCheckIn,
  TrainingInvite,
  UserAtVenue,
  NearbyVenue,
} from './presenceStore';

// ============================================
// PREFERENCES STORE
// ============================================
export {
  usePreferencesStore,
  useCoachingSettings,
  useGuidanceLevel,
  useDashboardSettings,
  useNotificationSettings,
  useHydrationSettingsFromPrefs,
  useSoundSettings,
  useWorkoutSettings,
  useDisplaySettings,
  usePrivacySettings,
  useMusicSettings,
  usePreferenceProfiles,
  useEffectivePreferences,
  usePreferencesState,
  default as preferencesStore,
} from './preferencesStore';

// ============================================
// DASHBOARD STORE
// ============================================
export {
  useDashboardStore,
  useDashboardLayout,
  useWidgetManager,
  useDashboardState,
  default as dashboardStore,
} from './dashboardStore';

// ============================================
// HYDRATION STORE
// ============================================
export {
  useHydrationStore,
  useHydrationTracker,
  useHydrationReminders,
  useHydrationSettings,
  useHydrationWorkoutMode,
  default as hydrationStore,
} from './hydrationStore';

// ============================================
// MUSIC STORE
// ============================================
export {
  useMusicStore,
  useMusicPlayback,
  useMusicConnections,
  useMusicPlaylists,
  useMusicWorkoutIntegration,
  useMusicUI,
  initializeSpotifyPlayer,
  disconnectSpotifyPlayer,
  default as musicStore,
} from './musicStore';

export type { MusicProvider, Track, Playlist, MusicConnection } from './musicStore';

// ============================================
// STORE UTILITIES
// ============================================

// Import stores directly for tree-shaking (avoid dynamic require())
import { useUIStore } from './uiStore';
import { useWorkoutSessionStore } from './workoutSessionStore';
import { useMuscleVisualizationStore } from './muscleVisualizationStore';

/**
 * Reset all stores to initial state
 * Useful for logout or testing
 *
 * NOTE: Using static imports instead of require() for tree-shaking.
 * Dynamic require() prevents bundlers from analyzing dependencies.
 */
export function resetAllStores() {
  // Clear UI state
  useUIStore.setState({
    sidebarOpen: false,
    mobileMenuOpen: false,
    activeModal: null,
    modalData: null,
    toasts: [],
    selectedItems: [],
    selectionMode: false,
  });

  // End any active workout
  const workoutState = useWorkoutSessionStore.getState();
  if (workoutState.isActive) {
    workoutState.endSession();
  }

  // Reset visualization
  useMuscleVisualizationStore.setState({
    highlightedMuscles: [],
    hoverMuscle: null,
    selectedMuscle: null,
    muscleIntensity: {},
  });

  // Don't reset auth here - use authStore.logout() instead
}

/**
 * Subscribe to specific store changes
 * @param {Object} store - The Zustand store
 * @param {Function} selector - Selector function
 * @param {Function} callback - Callback when value changes
 * @returns {Function} Unsubscribe function
 */
export function subscribeToStore(store, selector, callback) {
  return store.subscribe(
    (state) => selector(state),
    (value, previousValue) => {
      if (value !== previousValue) {
        callback(value, previousValue);
      }
    }
  );
}

/**
 * Get current state from any store (for use outside React)
 * @param {Object} store - The Zustand store
 * @param {Function} selector - Optional selector function
 */
export function getStoreState(store, selector = (s) => s) {
  return selector(store.getState());
}

// ============================================
// COMMON SELECTOR PATTERNS
// ============================================

/**
 * Create a selector that only triggers re-render when selected values change
 * Uses shallow comparison by default
 *
 * @example
 * const selector = createSelector((s) => ({ a: s.a, b: s.b }));
 * const { a, b } = useUIStore(selector);
 */
export function createSelector(selectorFn) {
  return selectorFn;
}

/**
 * Selector helpers for common patterns
 * Use these with any Zustand store to minimize re-renders
 */
export const selectors = {
  // UI Store selectors
  ui: {
    sidebar: (s) => s.sidebarOpen,
    modal: (s) => ({ activeModal: s.activeModal, modalData: s.modalData }),
    loading: (s) => ({ globalLoading: s.globalLoading, loadingMessage: s.loadingMessage }),
    toasts: (s) => s.toasts,
    responsive: (s) => ({ isMobile: s.isMobile, isTablet: s.isTablet, isDesktop: s.isDesktop }),
  },

  // Auth Store selectors
  auth: {
    user: (s) => s.user,
    isAuthenticated: (s) => s.isAuthenticated,
    token: (s) => s.token,
    session: (s) => ({ user: s.user, isAuthenticated: s.isAuthenticated, loading: s.loading }),
  },

  // Workout Session selectors
  workout: {
    isActive: (s) => s.isActive,
    currentExercise: (s) => s.currentExercise,
    restTimer: (s) => ({ time: s.restTimer, isActive: s.restTimerActive }),
    metrics: (s) => ({
      totalVolume: s.totalVolume,
      totalReps: s.totalReps,
      estimatedCalories: s.estimatedCalories,
      musclesWorked: s.musclesWorked,
    }),
    progress: (s) => ({
      currentExerciseIndex: s.currentExerciseIndex,
      totalExercises: s.exercises.length,
      setsCompleted: s.sets.length,
    }),
    prs: (s) => s.sessionPRs,
    celebration: (s) => ({
      hasPRs: s.sessionPRs.length > 0,
      prCount: s.sessionPRs.length,
      latestPR: s.sessionPRs[s.sessionPRs.length - 1] || null,
    }),
  },

  // Muscle Visualization selectors
  muscle: {
    highlighted: (s) => s.highlightedMuscles,
    selected: (s) => s.selectedMuscle,
    intensity: (s) => s.muscleIntensity,
    camera: (s) => ({ rotation: s.cameraRotation, zoom: s.cameraZoom, preset: s.cameraPreset }),
  },

  // Offline Store selectors
  offline: {
    isOnline: (s) => s.isOnline,
    syncStatus: (s) => s.syncStatus,
    pendingCount: (s) => s.pendingCount,
    conflictCount: (s) => s.conflictCount,
    combined: (s) => ({
      isOnline: s.isOnline,
      syncStatus: s.syncStatus,
      pendingCount: s.pendingCount,
      conflictCount: s.conflictCount,
      hasIssues: s.pendingCount > 0 || s.conflictCount > 0,
    }),
  },
};

// ============================================
// CELEBRATION EVENT TYPES
// ============================================

/**
 * Event types for workout celebrations
 * Use these constants when registering callbacks
 */
export const CELEBRATION_EVENTS = {
  WORKOUT_COMPLETE: 'workout_complete',
  PR_ACHIEVED: 'pr_achieved',
  LEVEL_UP: 'level_up',
  STREAK_MILESTONE: 'streak_milestone',
  ACHIEVEMENT_UNLOCKED: 'achievement_unlocked',
};

/**
 * Helper to create celebration callback config
 * @param {Object} handlers - Object with event handlers
 * @returns {Object} Config object for registerCelebrationCallbacks
 *
 * @example
 * const callbacks = createCelebrationConfig({
 *   onWorkoutComplete: (data) => triggerConfetti(),
 *   onPR: (data) => showPRBurst(data.prs[0]),
 *   onLevelUp: (data) => showLevelUp(data.newLevel),
 * });
 * register(callbacks);
 */
export function createCelebrationConfig(handlers) {
  return {
    onComplete: handlers.onWorkoutComplete || null,
    onPR: handlers.onPR || null,
    onLevelUp: handlers.onLevelUp || null,
  };
}
