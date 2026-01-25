/**
 * Custom Hooks Index
 *
 * Central export for all custom React hooks.
 *
 * ⚠️ DEPRECATION WARNING:
 * Importing from this barrel file (@/hooks or ../hooks) prevents tree-shaking
 * and increases bundle size. For better performance, import directly from
 * the specific hook file instead.
 *
 * Example:
 *   ❌ import { useAuth, useToast, useDebounce } from '@/hooks';
 *   ✅ import { useAuth } from '@/store/authStore';
 *   ✅ import { useToast } from '@/store/uiStore';
 *   ✅ import { useDebounce } from '@/hooks/useDebounce';
 *
 * HOOK CATEGORIES:
 * ----------------
 * 1. State Management Hooks (from stores)
 *    - useAuth, useModal, useToast, useRestTimer, etc.
 *
 * 2. Context Hooks
 *    - useTheme, useLocale, useUser
 *
 * 3. Feature Hooks
 *    - useHelp - Inline help system
 *    - useContextualTips, useContextualTip - Contextual tips
 *    - useTour - Spotlight tour system
 *    - useFeatureDiscovery - Feature discovery tracking
 *    - useCommandPalette - Command palette control
 *    - useConfetti - Celebration animations
 *
 * 4. Data Fetching Hooks
 *    - useCommunityStats, useLiveCommunityStats
 *
 * 5. Utility Hooks
 *    - useWebSocket, useXR, useLongPress, useSwipeGesture
 *    - useRipple - Button ripple effects
 *
 * 6. Performance Hooks
 *    - useDebounce, useThrottle, useOptimistic
 *
 * @example
 * import { useAuth, useToast, useResponsive } from '@/hooks';
 * import { useHelp, useContextualTip, useTour, useFeatureDiscovery } from '@/hooks';
 * import { useCommandPalette, openCommandPalette, useConfetti } from '@/hooks';
 */

// ============================================
// STATE MANAGEMENT HOOKS (from Zustand stores)
// ============================================

// Auth hooks
export { useAuth, useAuthStore, getToken, getAuthHeader } from '../store/authStore';

// UI hooks
export {
  useUIStore,
  useModal,
  useToast,
  useConfirm,
  useResponsive,
} from '../store/uiStore';

// Workout session hooks
export {
  useWorkoutSessionStore,
  useRestTimer,
  useWorkoutMetrics,
  useCurrentExercise,
} from '../store/workoutSessionStore';

// Workout session persistence (recovery after refresh/crash)
export {
  useWorkoutSessionPersistence,
  useSessionRecoveryCheck,
} from './useWorkoutSessionPersistence';

// Workout session GraphQL (real-time logging with server sync)
export {
  useWorkoutSessionGraphQL,
} from './useWorkoutSessionGraphQL';
export type {
  LoggedSet,
  MuscleActivation,
  MuscleActivationSummary,
  SessionPR,
  WorkoutSession as GraphQLWorkoutSession,
  RecoverableSession,
  ExerciseSubstitution,
  ExerciseHistory,
  LogSetInput,
  SessionCompletionResult,
} from './useWorkoutSessionGraphQL';

// Muscle visualization hooks
export {
  useMuscleVisualizationStore,
  useMuscleHighlight,
  useMuscleIntensity,
  useCameraControls,
  MUSCLE_GROUPS,
  CAMERA_PRESETS,
} from '../store/muscleVisualizationStore';

// ============================================
// CONTEXT HOOKS
// ============================================

// Theme and locale
export { useTheme, THEMES } from '../contexts/ThemeContext';
export { useLocale, useTranslation, LOCALES } from '../contexts/LocaleContext';

// Legacy user context (prefer useAuth)
export { useUser } from '../contexts/UserContext';

// Motion context (for reduced motion / animation preferences)
export {
  useMotion,
  useMotionAllowed,
  useShouldReduceMotion,
  MOTION_PREFERENCES,
} from '../contexts/MotionContext';

// Motion variants for Framer Motion
export {
  safeVariants,
  safeTransition,
  safeSpring,
  transitionPresets,
  getMotionVariant,
  createSafeVariant,
  getInteractionVariants,
  staggerChildren,
  staggerItem,
  reverseStaggerChildren,
  fadeIn,
  fadeOut,
  slideInLeft,
  slideInRight,
  slideInUp,
  slideInDown,
  scaleIn,
  scaleOut,
  burst,
  bounceIn,
  spring,
  bounce,
  smooth,
} from '../utils/motionVariants';

// Help system
export { useHelp } from '../components/help';

// Contextual tips
export {
  useContextualTips,
  useContextualTips as useContextualTip, // Alias for convenience
  useTipOnCondition,
} from '../components/tips/ContextualTipProvider';
export { TIP_TRIGGERS } from '../components/tips/tipDefinitions';

// Feature discovery
export { useFeatureDiscovery } from '../components/discovery';

// Spotlight tour hooks
export {
  useTour,
  useTourAutoStart,
  useTourStep,
} from '../components/tour';

// Command palette hooks
export {
  useCommandPalette,
  useCommandPaletteContext,
  openCommandPalette,
  closeCommandPalette,
  toggleCommandPalette,
} from '../components/command';

// ============================================
// DATA FETCHING HOOKS
// ============================================

export { default as useCommunityStats } from './useCommunityStats';
export { default as useLiveCommunityStats } from './useLiveCommunityStats';
export { default as useLiveActivity } from './useLiveActivity';

// ============================================
// UTILITY HOOKS
// ============================================

export { default as useWebSocket } from './useWebSocket';

// Button interaction hooks
export {
  useButtonFeedback,
  useReducedMotion,
  useSound,
  triggerHaptic,
  playClickSound,
  playSuccessSound,
} from '../components/glass/ButtonEffects';
export { useRipple } from './useRipple.jsx';
export { default as useXR, useXRButton, XR_STATE } from './useXR';
export { useLongPress } from './useLongPress';
export { useSwipeGesture } from './useSwipeGesture';
export { default as useScrollRestoration } from './useScrollRestoration';

// Celebration hooks
export {
  useConfetti,
  ConfettiProvider,
  CONFETTI_PRESETS,
} from '../components/celebrations/SuccessBurst';

// ============================================
// NETWORK STATUS HOOKS
// ============================================

export {
  useNetworkStatus,
  useImageQuality,
  useShouldLoadHeavyContent,
  useAnimationSettings,
} from './useNetworkStatus';

// ============================================
// ERROR HANDLING HOOKS
// ============================================

export { useCockatriceError } from './useCockatriceError';

// ============================================
// PERFORMANCE HOOKS
// ============================================

/**
 * Hook that returns a stable callback that doesn't trigger re-renders
 * when passed as a prop. Useful for event handlers in lists.
 *
 * @param {Function} callback - The callback function
 * @returns {Function} A memoized callback
 */
export function useStableCallback(callback) {
  const ref = React.useRef(callback);
  ref.current = callback;

  return React.useCallback((...args) => ref.current(...args), []);
}

/**
 * Hook for debouncing rapidly changing values
 *
 * @param {any} value - The value to debounce
 * @param {number} delay - Debounce delay in ms
 * @returns {any} The debounced value
 *
 * @example
 * const [search, setSearch] = useState('');
 * const debouncedSearch = useDebounce(search, 300);
 *
 * useEffect(() => {
 *   fetchResults(debouncedSearch);
 * }, [debouncedSearch]);
 */
export function useDebounce(value, delay = 300) {
  const [debouncedValue, setDebouncedValue] = React.useState(value);

  React.useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
}

/**
 * Hook for throttling frequent updates
 *
 * @param {any} value - The value to throttle
 * @param {number} interval - Throttle interval in ms
 * @returns {any} The throttled value
 */
export function useThrottle(value, interval = 100) {
  const [throttledValue, setThrottledValue] = React.useState(value);
  const lastUpdated = React.useRef(Date.now());

  React.useEffect(() => {
    const now = Date.now();
    if (now >= lastUpdated.current + interval) {
      lastUpdated.current = now;
      setThrottledValue(value);
    } else {
      const timer = setTimeout(() => {
        lastUpdated.current = Date.now();
        setThrottledValue(value);
      }, interval - (now - lastUpdated.current));
      return () => clearTimeout(timer);
    }
  }, [value, interval]);

  return throttledValue;
}

/**
 * Hook to detect if component is mounted (avoid state updates after unmount)
 *
 * @returns {React.RefObject<boolean>} Ref that's true while mounted
 */
export function useIsMounted() {
  const isMounted = React.useRef(false);

  React.useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  return isMounted;
}

/**
 * Hook to get previous value (useful for comparisons)
 *
 * @param {any} value - The current value
 * @returns {any} The previous value
 */
export function usePrevious(value) {
  const ref = React.useRef();

  React.useEffect(() => {
    ref.current = value;
  }, [value]);

  return ref.current;
}

/**
 * Hook for optimistic updates with automatic rollback
 *
 * @param {any} serverValue - The confirmed server value
 * @returns {[any, Function, Function]} [currentValue, setOptimistic, rollback]
 *
 * @example
 * const [likes, setOptimisticLikes, rollbackLikes] = useOptimistic(serverLikes);
 *
 * const handleLike = async () => {
 *   setOptimisticLikes(likes + 1);
 *   try {
 *     await api.like(postId);
 *   } catch {
 *     rollbackLikes();
 *   }
 * };
 */
export function useOptimistic(serverValue) {
  const [optimisticValue, setOptimisticValue] = React.useState(serverValue);
  const previousValue = React.useRef(serverValue);

  // Sync with server when it changes
  React.useEffect(() => {
    setOptimisticValue(serverValue);
    previousValue.current = serverValue;
  }, [serverValue]);

  const setOptimistic = React.useCallback((value) => {
    previousValue.current = optimisticValue;
    setOptimisticValue(value);
  }, [optimisticValue]);

  const rollback = React.useCallback(() => {
    setOptimisticValue(previousValue.current);
  }, []);

  return [optimisticValue, setOptimistic, rollback];
}

// Import React for hooks
import React from 'react';

// ============================================
// ADAPTIVE LOADING & DEVICE CAPABILITIES
// ============================================

export {
  useAdaptiveLoading,
  useAdaptiveImage,
  useAdaptivePollingInterval,
  useLazyLoad,
} from './useAdaptiveLoading';

export {
  useDeviceCapabilities,
  useVisualizationQuality,
  useAnimationConfig,
} from './useDeviceCapabilities';

// ============================================
// VIRTUAL LIST COMPONENTS
// ============================================

export {
  VirtualList,
  VirtualListItem,
  useVirtualListScroll,
} from '../components/virtual';

// ============================================
// 3D MEMORY MANAGEMENT
// ============================================

export {
  use3DMemoryManager,
  use3DVisibility,
  useMemoryPressure,
  useThreeJSCleanup,
} from './use3DMemoryManager';

export {
  Managed3DContainer,
  Lazy3DLoader,
} from '../components/virtual';

// ============================================
// KNUTH-INSPIRED DESIGN SYSTEM (Rendering Tiers & Preferences)
// ============================================

/**
 * Rendering tier detection for the 4-tier progressive enhancement system:
 * - full: All effects, animations, glassmorphism
 * - reduced: Styling but no animations (prefers-reduced-motion, iOS+Brave, save-data)
 * - minimal: Basic CSS, no effects (old browsers, low-end devices)
 * - text-only: Pure semantic HTML (screen readers, Lynx, no CSS)
 *
 * The Troika: Maximum Flexibility, Maximum User Choice, Maximum Performance
 */
export {
  useRenderingTier,
  useCurrentTier,
  useShouldAnimate,
  useShouldUseGlass,
  useShouldUse3D,
  getTierStatic,
  RenderingTier, // Export the constant object for comparisons
} from './useRenderingTier';
export type {
  RenderingTier as RenderingTierType, // Type export for type annotations
  RenderingCapabilities,
} from './useRenderingTier';

/**
 * User preferences management for the parametric design system.
 * Handles display, locale (26 languages), measurement units, and accessibility settings.
 * Persists to localStorage and applies to DOM as CSS custom properties.
 */
export {
  useUserPreferences,
} from './useUserPreferences';
export type {
  UserPreferences,
  DisplayPreferences,
  LocalePreferences,
  MeasurementPreferences,
  AccessibilityPreferences,
  SupportedLocale,
  WeightUnit,
  DistanceUnit,
  TemperatureUnit,
  TimeFormat,
  DateFormat,
  WritingDirection,
} from '../types/userPreferences';
