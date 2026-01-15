/**
 * TransitionLink - Enhanced Link with prefetch and transition support
 *
 * An enhanced version of React Router's Link that:
 * - Prefetches the destination route on hover/focus
 * - Triggers exit animations before navigation
 * - Passes transition context to the destination
 * - Respects reduced motion preferences
 *
 * Features:
 * - Route prefetching on hover/focus for faster navigation
 * - Customizable transition type (fade, slide, morph)
 * - Direction-aware animations
 * - Integration with TransitionProvider for shared element morphing
 * - Keyboard accessible with focus prefetching
 *
 * @example
 * // Basic usage
 * <TransitionLink to="/profile">View Profile</TransitionLink>
 *
 * // With custom transition
 * <TransitionLink to="/workout" transition="slideUp">
 *   Start Workout
 * </TransitionLink>
 *
 * // With prefetch disabled
 * <TransitionLink to="/settings" prefetch={false}>
 *   Settings
 * </TransitionLink>
 *
 * // As NavLink for active state styling
 * <TransitionNavLink to="/dashboard" className={({ isActive }) => isActive ? 'active' : ''}>
 *   Dashboard
 * </TransitionNavLink>
 */

import React, { useCallback, useRef, forwardRef } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useMotionAllowed } from '../../contexts/MotionContext';
import { prefetchRoute } from '../PrefetchLink';

// Try to import TransitionProvider context
let useTransitionContext;
try {
  useTransitionContext = require('./TransitionProvider').useTransitionContext;
} catch {
  useTransitionContext = () => null;
}

// ============================================
// CONSTANTS
// ============================================

/**
 * Transition types supported by TransitionLink
 */
export const TRANSITION_TYPES = {
  FADE: 'fade',
  SLIDE: 'slide',
  SLIDE_LEFT: 'slideLeft',
  SLIDE_RIGHT: 'slideRight',
  SLIDE_UP: 'slideUp',
  SLIDE_DOWN: 'slideDown',
  SCALE: 'scale',
  MORPH: 'morph',
  NONE: 'none',
};

/**
 * Default prefetch delay (ms before prefetch on hover)
 */
const PREFETCH_DELAY = 50;

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Normalize a path for comparison and prefetching
 */
function normalizePath(path) {
  if (!path) return '/';
  // Handle object paths (from NavLink)
  if (typeof path === 'object' && path.pathname) {
    return path.pathname;
  }
  // Remove trailing slash except for root
  return path === '/' ? '/' : path.replace(/\/$/, '');
}

// ============================================
// TRANSITION LINK COMPONENT
// ============================================

/**
 * TransitionLink - Link with prefetch and transition animation support
 *
 * @param {Object} props
 * @param {string} props.to - Destination path
 * @param {boolean} props.prefetch - Whether to prefetch on hover (default: true)
 * @param {'fade' | 'slide' | 'slideLeft' | 'slideRight' | 'slideUp' | 'slideDown' | 'scale' | 'morph' | 'none'} props.transition - Transition type
 * @param {React.ReactNode} props.children - Link content
 * @param {string} props.className - CSS class names
 * @param {Object} props.state - Navigation state to pass
 * @param {boolean} props.replace - Whether to replace history entry
 * @param {Function} props.onClick - Click handler
 * @param {Function} props.onTransitionStart - Called when transition starts
 * @param {Function} props.onPrefetch - Called when prefetch is triggered
 * @param {number} props.prefetchDelay - Delay before prefetch (ms)
 */
const TransitionLink = forwardRef(function TransitionLink(
  {
    to,
    prefetch = true,
    transition = 'fade',
    children,
    className = '',
    state,
    replace = false,
    onClick,
    onTransitionStart,
    onPrefetch,
    prefetchDelay = PREFETCH_DELAY,
    ...rest
  },
  ref
) {
  const navigate = useNavigate();
  const motionAllowed = useMotionAllowed();
  const prefetchTimeoutRef = useRef(null);
  const hasPrefetchedRef = useRef(false);

  // Try to get transition context
  let context = null;
  try {
    context = useTransitionContext();
  } catch {
    // Context not available
  }

  // Normalize the destination path
  const normalizedPath = normalizePath(to);

  // Handle prefetch on hover/focus
  const handlePrefetch = useCallback(() => {
    if (!prefetch || hasPrefetchedRef.current) return;

    // Clear any existing timeout
    if (prefetchTimeoutRef.current) {
      clearTimeout(prefetchTimeoutRef.current);
    }

    // Delay prefetch slightly to avoid unnecessary loads on quick hovers
    prefetchTimeoutRef.current = setTimeout(() => {
      hasPrefetchedRef.current = true;
      prefetchRoute(normalizedPath);
      onPrefetch?.(normalizedPath);
    }, prefetchDelay);
  }, [prefetch, normalizedPath, onPrefetch, prefetchDelay]);

  // Cancel prefetch on mouse leave
  const handleMouseLeave = useCallback(() => {
    if (prefetchTimeoutRef.current) {
      clearTimeout(prefetchTimeoutRef.current);
    }
  }, []);

  // Handle click with transition
  const handleClick = useCallback(
    (event) => {
      // Call user's onClick handler first
      onClick?.(event);

      // If default was prevented, don't navigate
      if (event.defaultPrevented) return;

      // For morph transitions, let the default Link behavior handle it
      // as SharedElement will handle the morphing
      if (transition === 'morph') {
        return; // Let default behavior proceed
      }

      // If we have a transition context and motion is allowed,
      // trigger the transition before navigation
      if (context && motionAllowed && transition !== 'none') {
        event.preventDefault();
        onTransitionStart?.(normalizedPath, transition);
        context.transitionTo(normalizedPath, {
          state: { ...state, _transition: transition },
          replace,
        });
      }
    },
    [
      onClick,
      context,
      motionAllowed,
      transition,
      normalizedPath,
      state,
      replace,
      onTransitionStart,
    ]
  );

  return (
    <Link
      ref={ref}
      to={to}
      className={`transition-link ${className}`.trim()}
      state={{ ...state, _transition: transition }}
      replace={replace}
      onClick={handleClick}
      onMouseEnter={handlePrefetch}
      onFocus={handlePrefetch}
      onMouseLeave={handleMouseLeave}
      onTouchStart={handlePrefetch}
      {...rest}
    >
      {children}
    </Link>
  );
});

// ============================================
// TRANSITION NAV LINK COMPONENT
// ============================================

/**
 * TransitionNavLink - NavLink with prefetch and transition support
 * Supports active state styling like React Router's NavLink
 *
 * @example
 * <TransitionNavLink
 *   to="/dashboard"
 *   className={({ isActive }) => isActive ? 'nav-active' : 'nav-link'}
 * >
 *   Dashboard
 * </TransitionNavLink>
 */
const TransitionNavLink = forwardRef(function TransitionNavLink(
  {
    to,
    prefetch = true,
    transition = 'fade',
    children,
    className,
    state,
    replace = false,
    onClick,
    onTransitionStart,
    onPrefetch,
    prefetchDelay = PREFETCH_DELAY,
    end,
    caseSensitive,
    ...rest
  },
  ref
) {
  const navigate = useNavigate();
  const motionAllowed = useMotionAllowed();
  const prefetchTimeoutRef = useRef(null);
  const hasPrefetchedRef = useRef(false);

  // Try to get transition context
  let context = null;
  try {
    context = useTransitionContext();
  } catch {
    // Context not available
  }

  const normalizedPath = normalizePath(to);

  const handlePrefetch = useCallback(() => {
    if (!prefetch || hasPrefetchedRef.current) return;

    if (prefetchTimeoutRef.current) {
      clearTimeout(prefetchTimeoutRef.current);
    }

    prefetchTimeoutRef.current = setTimeout(() => {
      hasPrefetchedRef.current = true;
      prefetchRoute(normalizedPath);
      onPrefetch?.(normalizedPath);
    }, prefetchDelay);
  }, [prefetch, normalizedPath, onPrefetch, prefetchDelay]);

  const handleMouseLeave = useCallback(() => {
    if (prefetchTimeoutRef.current) {
      clearTimeout(prefetchTimeoutRef.current);
    }
  }, []);

  const handleClick = useCallback(
    (event) => {
      onClick?.(event);

      if (event.defaultPrevented) return;

      if (transition === 'morph') {
        return;
      }

      if (context && motionAllowed && transition !== 'none') {
        event.preventDefault();
        onTransitionStart?.(normalizedPath, transition);
        context.transitionTo(normalizedPath, {
          state: { ...state, _transition: transition },
          replace,
        });
      }
    },
    [
      onClick,
      context,
      motionAllowed,
      transition,
      normalizedPath,
      state,
      replace,
      onTransitionStart,
    ]
  );

  return (
    <NavLink
      ref={ref}
      to={to}
      className={
        typeof className === 'function'
          ? (props) => `transition-link ${className(props)}`.trim()
          : `transition-link ${className || ''}`.trim()
      }
      state={{ ...state, _transition: transition }}
      replace={replace}
      onClick={handleClick}
      onMouseEnter={handlePrefetch}
      onFocus={handlePrefetch}
      onMouseLeave={handleMouseLeave}
      onTouchStart={handlePrefetch}
      end={end}
      caseSensitive={caseSensitive}
      {...rest}
    >
      {children}
    </NavLink>
  );
});

// ============================================
// HOOKS
// ============================================

/**
 * useTransitionNavigate - Hook for programmatic navigation with transitions
 *
 * @returns {Function} Navigate function with transition support
 *
 * @example
 * const navigateWithTransition = useTransitionNavigate();
 *
 * // Navigate with fade transition
 * navigateWithTransition('/profile', { transition: 'fade' });
 *
 * // Navigate with slide up
 * navigateWithTransition('/workout', { transition: 'slideUp', state: { from: 'home' } });
 */
export function useTransitionNavigate() {
  const navigate = useNavigate();
  const motionAllowed = useMotionAllowed();

  let context = null;
  try {
    context = useTransitionContext();
  } catch {
    // Context not available
  }

  return useCallback(
    (to, options = {}) => {
      const { transition = 'fade', state, replace = false, ...navOptions } = options;

      // If we have context and motion is allowed, use transition navigation
      if (context && motionAllowed && transition !== 'none') {
        context.transitionTo(to, {
          state: { ...state, _transition: transition },
          replace,
          ...navOptions,
        });
      } else {
        // Fallback to regular navigation
        navigate(to, {
          state: { ...state, _transition: transition },
          replace,
          ...navOptions,
        });
      }
    },
    [navigate, context, motionAllowed]
  );
}

/**
 * usePrefetchLink - Hook to add prefetch behavior to any element
 *
 * @param {string} path - Path to prefetch
 * @param {Object} options - Options
 * @returns {Object} Event handlers for the element
 *
 * @example
 * const prefetchHandlers = usePrefetchLink('/profile');
 * <button {...prefetchHandlers} onClick={() => navigate('/profile')}>
 *   Go to Profile
 * </button>
 */
export function usePrefetchLink(path, options = {}) {
  const { delay = PREFETCH_DELAY, onPrefetch } = options;
  const prefetchTimeoutRef = useRef(null);
  const hasPrefetchedRef = useRef(false);

  const handlePrefetch = useCallback(() => {
    if (hasPrefetchedRef.current) return;

    if (prefetchTimeoutRef.current) {
      clearTimeout(prefetchTimeoutRef.current);
    }

    prefetchTimeoutRef.current = setTimeout(() => {
      hasPrefetchedRef.current = true;
      prefetchRoute(path);
      onPrefetch?.(path);
    }, delay);
  }, [path, delay, onPrefetch]);

  const handleMouseLeave = useCallback(() => {
    if (prefetchTimeoutRef.current) {
      clearTimeout(prefetchTimeoutRef.current);
    }
  }, []);

  return {
    onMouseEnter: handlePrefetch,
    onFocus: handlePrefetch,
    onMouseLeave: handleMouseLeave,
    onTouchStart: handlePrefetch,
  };
}

/**
 * useTransitionState - Hook to read transition state from navigation
 *
 * @returns {Object} Transition state { transition, from }
 *
 * @example
 * const { transition, from } = useTransitionState();
 * // transition: 'slideUp'
 * // from: '/previous-page'
 */
export function useTransitionState() {
  const { state } = require('react-router-dom').useLocation();

  return {
    transition: state?._transition || 'fade',
    from: state?._from || null,
  };
}

// ============================================
// EXPORTS
// ============================================

export { TransitionNavLink };
export default TransitionLink;
