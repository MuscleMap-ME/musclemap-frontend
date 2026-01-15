/**
 * useReducedMotion - Enhanced reduced motion detection with user preference override
 *
 * Detects system preference via `prefers-reduced-motion: reduce` media query
 * and allows user override stored in localStorage.
 *
 * This hook is the foundation for accessible animations across MuscleMap.
 * All animation components should use this hook to respect user preferences.
 *
 * @example
 * const {
 *   prefersReducedMotion,  // Boolean from system media query
 *   motionAllowed,         // Combined with user preference (what you should use)
 *   userMotionPref,        // 'system' | 'reduced' | 'full'
 *   setUserMotionPref      // Override system preference
 * } = useReducedMotion();
 *
 * // In a component
 * if (!motionAllowed) {
 *   return <StaticVersion />;
 * }
 * return <AnimatedVersion />;
 */

import { useState, useEffect, useCallback, useMemo } from 'react';

// Storage key for persisting user preference
const MOTION_PREF_KEY = 'musclemap_motion_preference';

// Valid preference values
export const MOTION_PREFERENCES = {
  SYSTEM: 'system',
  REDUCED: 'reduced',
  FULL: 'full',
};

/**
 * Get stored motion preference from localStorage
 * @returns {'system' | 'reduced' | 'full'}
 */
function getStoredMotionPref() {
  if (typeof window === 'undefined') return MOTION_PREFERENCES.SYSTEM;

  try {
    const stored = localStorage.getItem(MOTION_PREF_KEY);
    if (stored && Object.values(MOTION_PREFERENCES).includes(stored)) {
      return stored;
    }
  } catch {
    // localStorage not available
  }
  return MOTION_PREFERENCES.SYSTEM;
}

/**
 * Store motion preference to localStorage
 * @param {string} pref - The preference to store
 */
function storeMotionPref(pref) {
  if (typeof window === 'undefined') return;

  try {
    localStorage.setItem(MOTION_PREF_KEY, pref);
  } catch {
    // localStorage not available
  }
}

/**
 * Detect system reduced motion preference
 * @returns {boolean}
 */
function getSystemReducedMotion() {
  if (typeof window === 'undefined') return false;
  return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
}

/**
 * useReducedMotion - Hook for detecting and managing motion preferences
 *
 * @returns {Object} Motion preference state and controls
 * @returns {boolean} returns.prefersReducedMotion - System preference (raw media query result)
 * @returns {boolean} returns.motionAllowed - Resolved preference (use this for animation decisions)
 * @returns {string} returns.userMotionPref - User's explicit choice ('system' | 'reduced' | 'full')
 * @returns {Function} returns.setUserMotionPref - Function to update user preference
 */
export function useReducedMotion() {
  // System preference from media query
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(getSystemReducedMotion);

  // User's explicit preference (persisted)
  const [userMotionPref, setUserMotionPrefState] = useState(getStoredMotionPref);

  // Listen for system preference changes
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');

    // Set initial value
    setPrefersReducedMotion(mediaQuery.matches);

    // Listen for changes
    const handler = (e) => setPrefersReducedMotion(e.matches);
    mediaQuery.addEventListener('change', handler);

    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

  // Update user preference with persistence
  const setUserMotionPref = useCallback((pref) => {
    if (Object.values(MOTION_PREFERENCES).includes(pref)) {
      setUserMotionPrefState(pref);
      storeMotionPref(pref);
    }
  }, []);

  // Resolve the final motion allowed state
  const motionAllowed = useMemo(() => {
    switch (userMotionPref) {
      case MOTION_PREFERENCES.REDUCED:
        return false; // User explicitly wants reduced motion
      case MOTION_PREFERENCES.FULL:
        return true; // User explicitly wants full motion
      case MOTION_PREFERENCES.SYSTEM:
      default:
        return !prefersReducedMotion; // Follow system setting
    }
  }, [userMotionPref, prefersReducedMotion]);

  return {
    prefersReducedMotion, // Raw system preference
    motionAllowed,        // Resolved preference (use this!)
    userMotionPref,       // User's explicit choice
    setUserMotionPref,    // Update user preference
  };
}

/**
 * Simple hook that just returns whether motion is allowed
 * For components that don't need the full API
 *
 * @returns {boolean} Whether motion/animations are allowed
 */
export function useMotionAllowed() {
  const { motionAllowed } = useReducedMotion();
  return motionAllowed;
}

/**
 * Legacy compatibility - returns true if reduced motion is preferred
 * Matches the existing useReducedMotion from ButtonEffects.jsx
 *
 * @returns {boolean} True if reduced motion is preferred
 * @deprecated Use useReducedMotion().motionAllowed instead
 */
export function useReducedMotionLegacy() {
  const { motionAllowed } = useReducedMotion();
  return !motionAllowed;
}

export default useReducedMotion;
