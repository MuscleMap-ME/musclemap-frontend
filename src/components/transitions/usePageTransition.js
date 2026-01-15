/**
 * usePageTransition - Hook for page transition control
 *
 * Provides access to transition state and navigation functions.
 * Works with TransitionProvider to enable smooth page transitions.
 *
 * @example
 * const {
 *   isTransitioning,    // Currently in a transition
 *   direction,          // 'forward' | 'back'
 *   transitionTo,       // Navigate with transition
 *   registerSharedElement,
 *   unregisterSharedElement,
 * } = usePageTransition();
 *
 * // Navigate with transition
 * transitionTo('/profile');
 *
 * // Navigate with options
 * transitionTo('/workout', { state: { from: 'dashboard' } });
 */

import { useCallback, useEffect, useMemo, useState, useRef } from 'react';
import { useNavigate, useLocation, useNavigationType } from 'react-router-dom';

// ============================================
// CONSTANTS
// ============================================

const DEFAULT_TRANSITION_DURATION = 300;
const DIRECTION_FORWARD = 'forward';
const DIRECTION_BACK = 'back';

// ============================================
// STANDALONE HOOK
// ============================================

/**
 * usePageTransition - Standalone hook for page transition control
 *
 * Can be used independently without TransitionProvider, though
 * some features (shared elements) require the provider.
 *
 * @param {Object} options
 * @param {number} options.duration - Transition duration in ms
 * @returns {PageTransitionHookResult}
 */
export function usePageTransition(options = {}) {
  const { duration = DEFAULT_TRANSITION_DURATION } = options;

  const navigate = useNavigate();
  const location = useLocation();
  const navigationType = useNavigationType();

  // State
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [direction, setDirection] = useState(DIRECTION_FORWARD);
  const [progress, setProgress] = useState(0);

  // History tracking
  const historyRef = useRef([]);
  const transitionTimeoutRef = useRef(null);
  const progressIntervalRef = useRef(null);

  // Shared element registry (simplified without context)
  const sharedElementsRef = useRef(new Map());

  // Detect navigation direction
  useEffect(() => {
    const history = historyRef.current;

    if (navigationType === 'POP') {
      // Back/forward navigation
      const currentIndex = history.indexOf(location.pathname);
      setDirection(currentIndex !== -1 && currentIndex < history.length - 1
        ? DIRECTION_BACK
        : DIRECTION_FORWARD
      );
    } else {
      // Push or replace
      setDirection(DIRECTION_FORWARD);
      if (navigationType === 'PUSH') {
        history.push(location.pathname);
      } else if (navigationType === 'REPLACE' && history.length > 0) {
        history[history.length - 1] = location.pathname;
      } else {
        history.push(location.pathname);
      }
    }

    // Start transition animation
    setIsTransitioning(true);
    setProgress(0);

    // Simulate progress
    progressIntervalRef.current = setInterval(() => {
      setProgress(prev => {
        const increment = prev < 30 ? 20 : prev < 60 ? 10 : prev < 80 ? 5 : 2;
        return Math.min(prev + increment, 90);
      });
    }, 50);

    // End transition after duration
    transitionTimeoutRef.current = setTimeout(() => {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
      setProgress(100);
      setTimeout(() => {
        setIsTransitioning(false);
        setProgress(0);
      }, 100);
    }, duration);

    return () => {
      if (transitionTimeoutRef.current) {
        clearTimeout(transitionTimeoutRef.current);
      }
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
    };
  }, [location.pathname, navigationType, duration]);

  // Navigate with transition
  const transitionTo = useCallback((to, navOptions = {}) => {
    navigate(to, navOptions);
  }, [navigate]);

  // Go back with transition
  const goBack = useCallback(() => {
    navigate(-1);
  }, [navigate]);

  // Go forward with transition
  const goForward = useCallback(() => {
    navigate(1);
  }, [navigate]);

  // Shared element management (simplified)
  const registerSharedElement = useCallback((id, element, zIndex = 100) => {
    sharedElementsRef.current.set(id, { element, zIndex, timestamp: Date.now() });
  }, []);

  const unregisterSharedElement = useCallback((id) => {
    sharedElementsRef.current.delete(id);
  }, []);

  const getSharedElement = useCallback((id) => {
    return sharedElementsRef.current.get(id);
  }, []);

  const hasSharedElement = useCallback((id) => {
    return sharedElementsRef.current.has(id);
  }, []);

  // Current path info
  const currentPath = location.pathname;
  const previousPath = useMemo(() => {
    const history = historyRef.current;
    return history.length > 1 ? history[history.length - 2] : null;
  }, [location.pathname]);

  return {
    // State
    isTransitioning,
    direction,
    progress,
    duration,

    // Navigation
    transitionTo,
    goBack,
    goForward,

    // Path info
    currentPath,
    previousPath,

    // Shared elements
    registerSharedElement,
    unregisterSharedElement,
    getSharedElement,
    hasSharedElement,
  };
}

// ============================================
// HELPER HOOKS
// ============================================

/**
 * useTransitionDirection - Get current transition direction
 * @returns {'forward' | 'back'}
 */
export function useTransitionDirection() {
  const { direction } = usePageTransition();
  return direction;
}

/**
 * useIsTransitioning - Check if currently transitioning
 * @returns {boolean}
 */
export function useIsTransitioning() {
  const { isTransitioning } = usePageTransition();
  return isTransitioning;
}

/**
 * useTransitionProgress - Get current transition progress
 * @returns {number} Progress percentage (0-100)
 */
export function useTransitionProgress() {
  const { progress } = usePageTransition();
  return progress;
}

/**
 * useNavigateWithTransition - Get navigation function only
 * @returns {Function} Navigate function with transition support
 */
export function useNavigateWithTransition() {
  const { transitionTo } = usePageTransition();
  return transitionTo;
}

/**
 * useTransitionCallback - Run callback after transition completes
 *
 * @param {Function} callback - Function to run after transition
 * @param {Array} deps - Dependency array
 */
export function useTransitionCallback(callback, deps = []) {
  const { isTransitioning } = usePageTransition();
  const wasTransitioningRef = useRef(false);

  useEffect(() => {
    // Detect transition end
    if (wasTransitioningRef.current && !isTransitioning) {
      callback();
    }
    wasTransitioningRef.current = isTransitioning;
  }, [isTransitioning, ...deps]);
}

/**
 * usePreloadOnHover - Preload route when user hovers over a link
 *
 * @param {Function} preloadFn - Function to call for preloading
 * @returns {Object} Event handlers for the link element
 *
 * @example
 * const preloadHandlers = usePreloadOnHover(() => import('./Profile'));
 * <Link to="/profile" {...preloadHandlers}>Profile</Link>
 */
export function usePreloadOnHover(preloadFn) {
  const hasPreloadedRef = useRef(false);

  const handleMouseEnter = useCallback(() => {
    if (!hasPreloadedRef.current && preloadFn) {
      hasPreloadedRef.current = true;
      preloadFn();
    }
  }, [preloadFn]);

  const handleFocus = useCallback(() => {
    if (!hasPreloadedRef.current && preloadFn) {
      hasPreloadedRef.current = true;
      preloadFn();
    }
  }, [preloadFn]);

  return {
    onMouseEnter: handleMouseEnter,
    onFocus: handleFocus,
  };
}

// ============================================
// EXPORTS
// ============================================

export default usePageTransition;
