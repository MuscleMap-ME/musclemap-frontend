/**
 * TransitionProvider - Context for managing page transitions and shared elements
 *
 * Provides:
 * - Navigation direction detection (forward/back)
 * - Shared element registry for morphing animations
 * - Page transition state management
 * - Progress bar visibility control
 *
 * @example
 * // Wrap your app with TransitionProvider
 * <TransitionProvider>
 *   <Routes />
 * </TransitionProvider>
 *
 * // Access transition state in components
 * const { direction, isTransitioning } = useTransitionContext();
 */

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useRef,
  useEffect,
  useMemo,
} from 'react';
import { useLocation, useNavigate, useNavigationType } from 'react-router-dom';
import { AdaptiveProgressBar } from './AdaptiveAnimatePresence';

// ============================================
// CONSTANTS
// ============================================

const TRANSITION_DURATION = 300; // Default transition duration in ms
const _PROGRESS_BAR_MIN_DURATION = 200; // Minimum time to show progress bar

// ============================================
// CONTEXT
// ============================================

const TransitionContext = createContext(null);

/**
 * Hook to access transition context
 * Returns null if not within a TransitionProvider (safe to use outside provider)
 * @returns {TransitionContextValue|null}
 */
export function useTransitionContext() {
  return useContext(TransitionContext);
}

// ============================================
// PROGRESS BAR COMPONENT
// ============================================

/**
 * NavigationProgressBar - Top progress bar during route transitions
 * Uses AdaptiveProgressBar which is CSS-only (saves ~150KB framer-motion)
 */
function NavigationProgressBar({ isVisible, progress = 0 }) {
  return <AdaptiveProgressBar isVisible={isVisible} progress={progress} />;
}

// ============================================
// SHARED ELEMENT REGISTRY
// ============================================

/**
 * Registry for tracking shared elements across pages
 * Used for smooth element morphing during transitions
 */
class SharedElementRegistry {
  constructor() {
    this.elements = new Map();
    this.listeners = new Set();
  }

  register(id, element, zIndex = 100) {
    this.elements.set(id, { element, zIndex, timestamp: Date.now() });
    this.notifyListeners();
  }

  unregister(id) {
    this.elements.delete(id);
    this.notifyListeners();
  }

  get(id) {
    return this.elements.get(id);
  }

  has(id) {
    return this.elements.has(id);
  }

  getAll() {
    return new Map(this.elements);
  }

  subscribe(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  notifyListeners() {
    this.listeners.forEach((listener) => listener(this.getAll()));
  }

  clear() {
    this.elements.clear();
    this.notifyListeners();
  }
}

// ============================================
// TRANSITION PROVIDER COMPONENT
// ============================================

/**
 * TransitionProvider - Wraps the app to provide transition context
 *
 * @param {Object} props
 * @param {React.ReactNode} props.children - Child components
 * @param {number} props.defaultDuration - Default transition duration in ms
 * @param {boolean} props.showProgressBar - Whether to show progress bar during transitions
 */
export function TransitionProvider({
  children,
  defaultDuration = TRANSITION_DURATION,
  showProgressBar = true,
}) {
  const location = useLocation();
  const navigate = useNavigate();
  const navigationType = useNavigationType();

  // State
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [direction, setDirection] = useState('forward');

  // Refs
  const historyStackRef = useRef([]);
  const registryRef = useRef(new SharedElementRegistry());
  const transitionTimeoutRef = useRef(null);
  const progressIntervalRef = useRef(null);

  // Track navigation history for direction detection
  useEffect(() => {
    const stack = historyStackRef.current;

    if (navigationType === 'POP') {
      // Browser back/forward
      const currentIndex = stack.findIndex((path) => path === location.pathname);
      if (currentIndex !== -1 && currentIndex < stack.length - 1) {
        setDirection('back');
      } else {
        setDirection('forward');
      }
      // Trim stack to current position
      historyStackRef.current = stack.slice(0, currentIndex + 1);
    } else if (navigationType === 'PUSH') {
      setDirection('forward');
      stack.push(location.pathname);
    } else if (navigationType === 'REPLACE') {
      setDirection('forward');
      if (stack.length > 0) {
        stack[stack.length - 1] = location.pathname;
      } else {
        stack.push(location.pathname);
      }
    }
  }, [location.pathname, navigationType]);

  // Handle transition start
  const startTransition = useCallback(() => {
    setIsTransitioning(true);
    setProgress(0);

    // Simulate progress
    progressIntervalRef.current = setInterval(() => {
      setProgress((prev) => {
        // Slow down as we approach 90%
        const increment = prev < 30 ? 15 : prev < 60 ? 10 : prev < 80 ? 5 : 2;
        return Math.min(prev + increment, 90);
      });
    }, 100);
  }, []);

  // Handle transition end
  const endTransition = useCallback(() => {
    // Clear progress interval
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
    }

    // Complete progress bar
    setProgress(100);

    // Wait for progress bar animation to complete
    transitionTimeoutRef.current = setTimeout(() => {
      setIsTransitioning(false);
      setProgress(0);
    }, 200);
  }, []);

  // Detect route changes and trigger transitions
  useEffect(() => {
    startTransition();

    // Simulate page load completion
    const timer = setTimeout(() => {
      endTransition();
    }, defaultDuration);

    return () => {
      clearTimeout(timer);
      if (transitionTimeoutRef.current) {
        clearTimeout(transitionTimeoutRef.current);
      }
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
    };
  }, [location.pathname, startTransition, endTransition, defaultDuration]);

  // Navigate with transition
  const transitionTo = useCallback(
    (to, options = {}) => {
      startTransition();
      navigate(to, options);
    },
    [navigate, startTransition]
  );

  // Shared element management
  const registerSharedElement = useCallback((id, element, zIndex) => {
    registryRef.current.register(id, element, zIndex);
  }, []);

  const unregisterSharedElement = useCallback((id) => {
    registryRef.current.unregister(id);
  }, []);

  const getSharedElement = useCallback((id) => {
    return registryRef.current.get(id);
  }, []);

  const hasSharedElement = useCallback((id) => {
    return registryRef.current.has(id);
  }, []);

  // Context value
  const contextValue = useMemo(
    () => ({
      // State
      isTransitioning,
      direction,
      progress,
      duration: defaultDuration,

      // Navigation
      transitionTo,

      // Shared elements
      registerSharedElement,
      unregisterSharedElement,
      getSharedElement,
      hasSharedElement,
      registry: registryRef.current,
    }),
    [
      isTransitioning,
      direction,
      progress,
      defaultDuration,
      transitionTo,
      registerSharedElement,
      unregisterSharedElement,
      getSharedElement,
      hasSharedElement,
    ]
  );

  return (
    <TransitionContext.Provider value={contextValue}>
      {showProgressBar && (
        <NavigationProgressBar isVisible={isTransitioning} progress={progress} />
      )}
      {children}
    </TransitionContext.Provider>
  );
}

export default TransitionProvider;
