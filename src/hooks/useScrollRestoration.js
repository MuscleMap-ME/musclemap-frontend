/**
 * useScrollRestoration - Preserves scroll position on browser back/forward
 *
 * Part of MuscleMap's SPA UX improvements.
 * Saves scroll position before navigation and restores it when returning
 * via browser back/forward buttons.
 */

import { useEffect, useRef, useCallback } from 'react';
import { useLocation, useNavigationType } from 'react-router-dom';

// Session storage key prefix
const SCROLL_KEY_PREFIX = 'musclemap_scroll_';

/**
 * Hook to restore scroll position on browser back/forward navigation
 */
export function useScrollRestoration() {
  const location = useLocation();
  const navigationType = useNavigationType();
  const prevLocationKey = useRef(null);

  // Save scroll position before leaving
  const saveScrollPosition = useCallback((key) => {
    if (key) {
      const scrollY = window.scrollY;
      sessionStorage.setItem(`${SCROLL_KEY_PREFIX}${key}`, scrollY.toString());
    }
  }, []);

  // Restore scroll position if returning via back/forward
  const restoreScrollPosition = useCallback((key) => {
    const savedPosition = sessionStorage.getItem(`${SCROLL_KEY_PREFIX}${key}`);
    if (savedPosition !== null) {
      const scrollY = parseInt(savedPosition, 10);
      // Use requestAnimationFrame to ensure DOM is ready
      requestAnimationFrame(() => {
        window.scrollTo(0, scrollY);
      });
    }
  }, []);

  useEffect(() => {
    // Save scroll position of previous page
    if (prevLocationKey.current && prevLocationKey.current !== location.key) {
      saveScrollPosition(prevLocationKey.current);
    }

    // Handle scroll restoration based on navigation type
    if (navigationType === 'POP') {
      // Browser back/forward - restore position
      restoreScrollPosition(location.key);
    } else if (navigationType === 'PUSH') {
      // New navigation - scroll to top
      window.scrollTo(0, 0);
    }
    // For REPLACE, we don't modify scroll position

    // Update ref for next navigation
    prevLocationKey.current = location.key;
  }, [location.key, navigationType, saveScrollPosition, restoreScrollPosition]);

  // Save scroll position before page unload (for session restore)
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (location.key) {
        saveScrollPosition(location.key);
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [location.key, saveScrollPosition]);

  // Clean up old scroll entries (keep last 50)
  useEffect(() => {
    const keys = Object.keys(sessionStorage)
      .filter(k => k.startsWith(SCROLL_KEY_PREFIX))
      .sort();

    if (keys.length > 50) {
      keys.slice(0, keys.length - 50).forEach(k => sessionStorage.removeItem(k));
    }
  }, [location.key]);
}

/**
 * Hook to scroll to top on new navigation (simpler alternative)
 */
export function useScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0; // Safari fallback
  }, [pathname]);
}

export default useScrollRestoration;
