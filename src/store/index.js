/**
 * Store Index
 *
 * Central export for all Zustand stores and their associated hooks.
 * This is the primary entry point for state management in MuscleMap.
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
// STORE UTILITIES
// ============================================

/**
 * Reset all stores to initial state
 * Useful for logout or testing
 */
export function resetAllStores() {
  const { useUIStore } = require('./uiStore');
  const { useWorkoutSessionStore } = require('./workoutSessionStore');
  const { useMuscleVisualizationStore } = require('./muscleVisualizationStore');
  const { useAuthStore: _useAuthStore } = require('./authStore');

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
