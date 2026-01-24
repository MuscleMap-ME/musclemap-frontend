/**
 * AnimatePresenceLite - Lightweight CSS-based alternative to framer-motion's AnimatePresence
 *
 * For low-end devices and slow connections, this provides basic enter/exit
 * transitions using CSS instead of the full framer-motion library (~150KB).
 *
 * On capable devices, this is replaced with the full AnimatePresence via dynamic import.
 *
 * CRITICAL: iOS Lockdown Mode and restrictive browsers may block cloneElement/Children.toArray.
 * We now detect this and fall back to a simple passthrough.
 */

import React, { useEffect, useState, useRef, cloneElement, Children } from 'react';

/**
 * Detect if we're in a restrictive environment (iOS Lockdown Mode, Brave Shields, etc.)
 * that might break React's Children utilities or cloneElement
 */
function isRestrictiveEnvironment(): boolean {
  if (typeof window === 'undefined') return false;

  try {
    // iOS Lockdown Mode detection heuristics
    const ua = navigator.userAgent || '';
    const isIOS = /iPad|iPhone|iPod/.test(ua);
    const isBrave = !!(navigator as any).brave;

    // Test if cloneElement works properly
    const testElement = React.createElement('div', { key: 'test' }, 'test');
    const cloned = cloneElement(testElement, { 'data-test': 'true' });
    if (!cloned || !cloned.props) {
      console.log('[AnimatePresenceLite] cloneElement failed, using passthrough');
      return true;
    }

    // Test if Children.toArray works
    const arr = Children.toArray(testElement);
    if (!Array.isArray(arr)) {
      console.log('[AnimatePresenceLite] Children.toArray failed, using passthrough');
      return true;
    }

    // Extra caution for iOS + Brave combination
    if (isIOS && isBrave) {
      console.log('[AnimatePresenceLite] iOS + Brave detected, using passthrough for safety');
      return true;
    }

    return false;
  } catch (e) {
    console.log('[AnimatePresenceLite] Error in detection, using passthrough:', e);
    return true;
  }
}

// Cache the detection result
let _isRestrictive: boolean | null = null;
function getIsRestrictive(): boolean {
  if (_isRestrictive === null) {
    _isRestrictive = isRestrictiveEnvironment();
  }
  return _isRestrictive;
}

/**
 * CSS-only AnimatePresence replacement
 * Handles enter/exit animations with CSS transitions
 * Falls back to simple passthrough in restrictive environments
 */
export function AnimatePresenceLite({ children, mode = 'sync', initial = true }) {
  // Track mount for debugging
  useEffect(() => {
    console.log('[AnimatePresenceLite] Mounted, mode:', mode, 'initial:', initial);
    try {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', '/api/client-error', true);
      xhr.setRequestHeader('Content-Type', 'application/json');
      xhr.send(JSON.stringify({
        type: 'component_mount',
        message: `[AnimatePresenceLite] Mounted, mode: ${mode}, restrictive: ${getIsRestrictive()}`,
        source: 'AnimatePresenceLite.tsx',
        time: new Date().toISOString()
      }));
    } catch { /* ignore */ }
  }, [mode, initial]);

  // In restrictive environments, just render children directly - no fancy stuff
  if (getIsRestrictive()) {
    console.log('[AnimatePresenceLite] Restrictive mode - direct passthrough');
    return <>{children}</>;
  }

  // Normal mode with animation support
  return <AnimatePresenceLiteInternal mode={mode} initial={initial}>{children}</AnimatePresenceLiteInternal>;
}

/**
 * Internal implementation with full animation support
 */
function AnimatePresenceLiteInternal({ children, mode = 'sync', initial = true }) {
  const [displayedChildren, setDisplayedChildren] = useState(() => {
    try {
      return initial ? Children.toArray(children) : [];
    } catch (e) {
      console.error('[AnimatePresenceLite] Error in initial state:', e);
      return [];
    }
  });
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [isAnimating, setIsAnimating] = useState(false);
  const previousChildrenRef = useRef<React.ReactNode[]>([]);

  // Initialize ref
  useEffect(() => {
    try {
      previousChildrenRef.current = Children.toArray(children);
    } catch (e) {
      console.error('[AnimatePresenceLite] Error setting ref:', e);
    }
  }, [children]);

  useEffect(() => {
    try {
      const currentChildren = Children.toArray(children);
      const prevChildren = previousChildrenRef.current;

      // Check if children changed (by key)
      const currentKeys = currentChildren.map((c: any) => c?.key);
      const prevKeys = prevChildren.map((c: any) => c?.key);
      const hasChanged = JSON.stringify(currentKeys) !== JSON.stringify(prevKeys);

      if (hasChanged) {
        if (mode === 'wait') {
          // Wait for exit animation before showing new children
          setIsAnimating(true);

          // First, start exit animation on old children
          setDisplayedChildren((prev) =>
            prev.map((child: any) => {
              try {
                return cloneElement(child, {
                  'data-animate-state': 'exit',
                });
              } catch {
                return child;
              }
            })
          );

          // After exit animation, show new children with enter animation
          const exitTimer = setTimeout(() => {
            setDisplayedChildren(
              currentChildren.map((child: any) => {
                try {
                  return cloneElement(child, {
                    'data-animate-state': 'enter',
                  });
                } catch {
                  return child;
                }
              })
            );

            // After enter animation completes, remove animation state
            const enterTimer = setTimeout(() => {
              setDisplayedChildren(currentChildren);
              setIsAnimating(false);
            }, 300);

            return () => clearTimeout(enterTimer);
          }, 200);

          return () => clearTimeout(exitTimer);
        } else {
          // Sync mode - just update immediately
          setDisplayedChildren(currentChildren);
        }
      }

      previousChildrenRef.current = currentChildren;
    } catch (e) {
      console.error('[AnimatePresenceLite] Error in effect:', e);
      // Fallback: just show children directly
      setDisplayedChildren([children]);
    }
  }, [children, mode]);

  // If no children, render nothing
  if (displayedChildren.length === 0) {
    // Safety: if we have children prop but displayedChildren is empty, render children directly
    if (children) {
      console.log('[AnimatePresenceLite] displayedChildren empty but children exists, rendering directly');
      return <>{children}</>;
    }
    return null;
  }

  return <>{displayedChildren}</>;
}

/**
 * CSS-based progress bar (lighter alternative to framer-motion version)
 */
export function ProgressBarLite({ isVisible, progress = 0 }) {
  const [show, setShow] = useState(isVisible);
  const [fadeOut, setFadeOut] = useState(false);

  useEffect(() => {
    if (isVisible) {
      setShow(true);
      setFadeOut(false);
    } else if (show) {
      setFadeOut(true);
      const timer = setTimeout(() => {
        setShow(false);
        setFadeOut(false);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [isVisible, show]);

  if (!show) return null;

  return (
    <div
      className={`fixed top-0 left-0 right-0 z-[9999] h-1 overflow-hidden transition-opacity duration-300 ${
        fadeOut ? 'opacity-0' : 'opacity-100'
      }`}
    >
      {/* Background track */}
      <div className="absolute inset-0 bg-black/10" />

      {/* Progress indicator */}
      <div
        className="h-full bg-gradient-to-r from-[var(--brand-blue-500)] via-[var(--brand-pulse-500)] to-[var(--brand-blue-400)] transition-[width] duration-200 ease-out"
        style={{
          width: `${progress < 100 ? Math.max(progress, 30) : 100}%`,
          boxShadow: '0 0 10px rgba(0, 102, 255, 0.5), 0 0 20px rgba(0, 102, 255, 0.3)',
        }}
      />

      {/* Shimmer effect (CSS animation) */}
      <div
        className="absolute top-0 h-full w-32 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer"
        style={{
          animation: 'shimmer 1.5s linear infinite',
        }}
      />

      <style>{`
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(400%); }
        }
      `}</style>
    </div>
  );
}

export default AnimatePresenceLite;
