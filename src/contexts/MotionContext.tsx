/**
 * Motion Context (React Context)
 *
 * Provides motion preference settings throughout the app.
 * Uses React Context because motion preference changes are infrequent.
 *
 * This context wraps the useReducedMotion hook to provide app-wide access
 * without prop drilling. Components can easily check if motion is allowed
 * and update user preferences.
 *
 * WHEN TO USE THIS:
 * - Any component with animations that should respect user preferences
 * - Settings pages that need to show/update motion preference
 * - Components that conditionally render based on motion preference
 *
 * @example
 * // In a component
 * const { motionAllowed, setUserMotionPref } = useMotion();
 *
 * if (!motionAllowed) {
 *   return <StaticVersion />;
 * }
 * return <AnimatedVersion />;
 *
 * // In settings
 * <select value={userMotionPref} onChange={(e) => setUserMotionPref(e.target.value)}>
 *   <option value="system">Use system setting</option>
 *   <option value="reduced">Reduce motion</option>
 *   <option value="full">Full animations</option>
 * </select>
 */

import React, { createContext, useContext, useMemo } from 'react';
import { useReducedMotion, MOTION_PREFERENCES } from '../hooks/useReducedMotion';

// Create context with null default (will throw if used outside provider)
const MotionContext = createContext(null);

/**
 * Motion Provider Component
 *
 * Wraps the app to provide motion settings to all descendants.
 * Should be placed near the root of the app, alongside ThemeProvider.
 *
 * @param {Object} props
 * @param {React.ReactNode} props.children - Child components
 */
export function MotionProvider({ children }) {
  const {
    prefersReducedMotion,
    motionAllowed,
    userMotionPref,
    setUserMotionPref,
  } = useReducedMotion();

  // Memoize context value to prevent unnecessary re-renders
  const value = useMemo(
    () => ({
      // Raw system preference (from media query)
      prefersReducedMotion,

      // Resolved preference considering user override (USE THIS)
      motionAllowed,

      // Alias for motionAllowed (requested in requirements)
      shouldAnimate: motionAllowed,

      // Boolean for reduced motion state
      reducedMotion: !motionAllowed,

      // User's explicit choice ('system' | 'reduced' | 'full')
      userMotionPref,

      // Function to update user preference (alias: setReducedMotion)
      setUserMotionPref,
      setReducedMotion: (reduce) => {
        setUserMotionPref(reduce ? MOTION_PREFERENCES.REDUCED : MOTION_PREFERENCES.FULL);
      },

      // Convenience: opposite of motionAllowed for common pattern
      shouldReduceMotion: !motionAllowed,

      // Available preference options (for settings UI)
      motionOptions: MOTION_PREFERENCES,
    }),
    [prefersReducedMotion, motionAllowed, userMotionPref, setUserMotionPref]
  );

  return (
    <MotionContext.Provider value={value}>
      {children}
    </MotionContext.Provider>
  );
}

/**
 * Hook to access motion context
 *
 * @returns {Object} Motion context value
 * @throws {Error} If used outside of MotionProvider
 *
 * @example
 * const { motionAllowed, setUserMotionPref, motionOptions } = useMotion();
 */
export function useMotion() {
  const context = useContext(MotionContext);
  // Always call the hook unconditionally to comply with Rules of Hooks
  const fallback = useReducedMotion();

  // If context is available, use it
  if (context) {
    return context;
  }

  // Fallback: Return a compatible object using the standalone hook
  // This prevents crashes when MotionProvider is missing or hasn't mounted yet
  return {
    prefersReducedMotion: fallback.prefersReducedMotion,
    motionAllowed: fallback.motionAllowed,
    shouldAnimate: fallback.motionAllowed,
    reducedMotion: !fallback.motionAllowed,
    userMotionPref: fallback.userMotionPref,
    setUserMotionPref: fallback.setUserMotionPref,
    setReducedMotion: (reduce: boolean) => {
      fallback.setUserMotionPref(reduce ? MOTION_PREFERENCES.REDUCED : MOTION_PREFERENCES.FULL);
    },
    shouldReduceMotion: !fallback.motionAllowed,
    motionOptions: MOTION_PREFERENCES,
  };
}

/**
 * Hook to just check if motion is allowed (simpler API)
 *
 * Falls back to standalone hook if not in provider (for backwards compatibility)
 *
 * @returns {boolean} Whether motion/animations are allowed
 */
export function useMotionAllowed() {
  const context = useContext(MotionContext);
  // Always call the hook unconditionally to comply with Rules of Hooks
  const fallback = useReducedMotion();

  // If in provider, use context value
  if (context) {
    return context.motionAllowed;
  }

  // Fallback to standalone hook for backwards compatibility
  return fallback.motionAllowed;
}

/**
 * Hook to check if motion should be reduced (inverse of motionAllowed)
 *
 * @returns {boolean} Whether motion should be reduced
 */
export function useShouldReduceMotion() {
  const context = useContext(MotionContext);
  // Always call the hook unconditionally to comply with Rules of Hooks
  const fallback = useReducedMotion();

  if (context) {
    return context.shouldReduceMotion;
  }

  return !fallback.motionAllowed;
}

// Export motion preferences for external use
export { MOTION_PREFERENCES };

export default MotionContext;
