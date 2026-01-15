/**
 * usePageTransition - Hook for page transition control
 *
 * Provides access to transition state and navigation functions.
 * Works with TransitionProvider to enable smooth page transitions.
 *
 * Features:
 * - Detects navigation direction (forward/back/same)
 * - Tracks transition progress
 * - Provides navigation utilities
 * - Manages shared element registry
 * - Route preloading on hover
 *
 * @example
 * const {
 *   isTransitioning,    // Currently in a transition
 *   direction,          // 'forward' | 'back' | 'same'
 *   progress,           // 0-100 progress percentage
 *   transitionTo,       // Navigate with transition
 *   goBack,             // Navigate back
 *   goForward,          // Navigate forward
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
const DIRECTION_SAME = 'same';

// ============================================
// STANDALONE HOOK
// ============================================

/**
 * usePageTransition - Standalone hook for page transition control
 *
 * Can be used independently without TransitionProvider, though
 * some features (shared elements, progress bar) require the provider.
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

  // History tracking for direction detection
  const historyRef = useRef([]);
  const previousLocationRef = useRef(null);
  const transitionTimeoutRef = useRef(null);
  const progressIntervalRef = useRef(null);

  // Shared element registry (simplified without context)
  const sharedElementsRef = useRef(new Map());

  // Detect navigation direction based on history
  useEffect(() => {
    const history = historyRef.current;
    const previousPath = previousLocationRef.current;
    const currentPath = location.pathname;

    // Skip if same location
    if (previousPath === currentPath) {
      setDirection(DIRECTION_SAME);
      return;
    }

    if (navigationType === 'POP') {
      // Back/forward navigation
      const currentIndex = history.indexOf(currentPath);
      const previousIndex = history.indexOf(previousPath);

      if (currentIndex !== -1 && previousIndex !== -1) {
        setDirection(currentIndex < previousIndex ? DIRECTION_BACK : DIRECTION_FORWARD);
      } else {
        setDirection(DIRECTION_BACK);
      }
    } else {
      // Push or replace navigation
      setDirection(DIRECTION_FORWARD);

      if (navigationType === 'PUSH') {
        history.push(currentPath);
      } else if (navigationType === 'REPLACE' && history.length > 0) {
        history[history.length - 1] = currentPath;
      } else {
        history.push(currentPath);
      }
    }

    // Update previous location
    previousLocationRef.current = currentPath;

    // Start transition animation
    setIsTransitioning(true);
    setProgress(0);

    // Simulate progress
    progressIntervalRef.current = setInterval(() => {
      setProgress((prev) => {
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
  const transitionTo = useCallback(
    (to, navOptions = {}) => {
      navigate(to, navOptions);
    },
    [navigate]
  );

  // Go back with transition
  const goBack = useCallback(() => {
    navigate(-1);
  }, [navigate]);

  // Go forward with transition
  const goForward = useCallback(() => {
    navigate(1);
  }, [navigate]);

  // Navigate and replace
  const replaceWith = useCallback(
    (to, navOptions = {}) => {
      navigate(to, { ...navOptions, replace: true });
    },
    [navigate]
  );

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

  // Check if navigating deeper or shallower
  const isNavigatingDeeper = useMemo(() => {
    const prevDepth = previousPath?.split('/').filter(Boolean).length || 0;
    const currentDepth = currentPath.split('/').filter(Boolean).length;
    return currentDepth > prevDepth;
  }, [currentPath, previousPath]);

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
    replaceWith,

    // Path info
    currentPath,
    previousPath,
    isNavigatingDeeper,

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
 * @returns {'forward' | 'back' | 'same'}
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

/**
 * useRouteDirection - Determine if navigation is going forward or back
 * based on route depth
 *
 * @returns {Object} Direction info and utilities
 */
export function useRouteDirection() {
  const location = useLocation();
  const navigationType = useNavigationType();
  const previousDepthRef = useRef(0);
  const previousPathRef = useRef('');

  const currentDepth = location.pathname.split('/').filter(Boolean).length;

  const direction = useMemo(() => {
    const prevDepth = previousDepthRef.current;

    if (navigationType === 'POP') {
      return 'back';
    }

    if (currentDepth > prevDepth) {
      return 'forward';
    } else if (currentDepth < prevDepth) {
      return 'back';
    }

    return 'same';
  }, [currentDepth, navigationType]);

  useEffect(() => {
    previousDepthRef.current = currentDepth;
    previousPathRef.current = location.pathname;
  }, [currentDepth, location.pathname]);

  return {
    direction,
    depth: currentDepth,
    isNavigatingDeeper: direction === 'forward',
    isNavigatingShallower: direction === 'back',
  };
}

/**
 * useScrollRestoration - Restore scroll position on navigation
 *
 * @param {Object} options
 * @param {boolean} options.enabled - Enable scroll restoration
 * @param {string} options.behavior - Scroll behavior ('auto' | 'smooth')
 */
export function useScrollRestoration(options = {}) {
  const { enabled = true, behavior = 'auto' } = options;
  const location = useLocation();
  const scrollPositionsRef = useRef(new Map());

  // Save scroll position before navigation
  useEffect(() => {
    const currentPath = location.pathname;

    return () => {
      if (enabled) {
        scrollPositionsRef.current.set(currentPath, window.scrollY);
      }
    };
  }, [location.pathname, enabled]);

  // Restore scroll position after navigation
  useEffect(() => {
    if (!enabled) return;

    const currentPath = location.pathname;
    const savedPosition = scrollPositionsRef.current.get(currentPath);

    if (savedPosition !== undefined) {
      window.scrollTo({
        top: savedPosition,
        behavior,
      });
    } else {
      window.scrollTo({
        top: 0,
        behavior,
      });
    }
  }, [location.pathname, enabled, behavior]);
}

// ============================================
// EXPORTS
// ============================================

export default usePageTransition;
