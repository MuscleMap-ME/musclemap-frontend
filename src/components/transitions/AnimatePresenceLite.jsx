/**
 * AnimatePresenceLite - Lightweight CSS-based alternative to framer-motion's AnimatePresence
 *
 * For low-end devices and slow connections, this provides basic enter/exit
 * transitions using CSS instead of the full framer-motion library (~150KB).
 *
 * On capable devices, this is replaced with the full AnimatePresence via dynamic import.
 */

import React, { useEffect, useState, useRef, cloneElement, Children } from 'react';

/**
 * CSS-only AnimatePresence replacement
 * Handles enter/exit animations with CSS transitions
 */
export function AnimatePresenceLite({ children, mode = 'sync', initial = true }) {
  const [displayedChildren, setDisplayedChildren] = useState(
    initial ? Children.toArray(children) : []
  );
  const [isAnimating, setIsAnimating] = useState(false);
  const previousChildrenRef = useRef(Children.toArray(children));

  useEffect(() => {
    const currentChildren = Children.toArray(children);
    const prevChildren = previousChildrenRef.current;

    // Check if children changed (by key)
    const currentKeys = currentChildren.map((c) => c?.key);
    const prevKeys = prevChildren.map((c) => c?.key);
    const hasChanged = JSON.stringify(currentKeys) !== JSON.stringify(prevKeys);

    if (hasChanged) {
      if (mode === 'wait') {
        // Wait for exit animation before showing new children
        setIsAnimating(true);

        // First, start exit animation on old children
        setDisplayedChildren((prev) =>
          prev.map((child) =>
            cloneElement(child, {
              'data-animate-state': 'exit',
            })
          )
        );

        // After exit animation, show new children with enter animation
        const exitTimer = setTimeout(() => {
          setDisplayedChildren(
            currentChildren.map((child) =>
              cloneElement(child, {
                'data-animate-state': 'enter',
              })
            )
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
  }, [children, mode]);

  // If no children, render nothing
  if (displayedChildren.length === 0) {
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
