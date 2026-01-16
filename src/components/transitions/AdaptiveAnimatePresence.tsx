/**
 * AdaptiveAnimatePresence - Conditionally loads framer-motion based on device capability
 *
 * Strategy:
 * 1. Start with CSS-only transitions (AnimatePresenceLite) - 0KB
 * 2. On high-end devices, lazy load framer-motion's AnimatePresence
 * 3. On low-end devices or reduced motion preference, stick with CSS version
 *
 * This saves ~150KB on initial load for most users and improves
 * performance on low-end devices.
 */

import React, { Suspense, lazy, useState, useEffect } from 'react';
import { AnimatePresenceLite, ProgressBarLite } from './AnimatePresenceLite';

// Lazy load framer-motion only when needed
const FramerAnimatePresence = lazy(() =>
  import('framer-motion').then((mod) => ({
    default: mod.AnimatePresence,
  }))
);

// Detection for when to use full animations
function shouldUseFullAnimations() {
  // Check for reduced motion preference
  if (typeof window !== 'undefined') {
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) {
      return false;
    }

    // Check for slow connection (2G, slow-2g)
    const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    if (connection) {
      if (connection.effectiveType === '2g' || connection.effectiveType === 'slow-2g') {
        return false;
      }
      if (connection.saveData) {
        return false;
      }
    }

    // Check for low device memory (< 4GB)
    if (navigator.deviceMemory && navigator.deviceMemory < 4) {
      return false;
    }

    // Check for low CPU cores
    if (navigator.hardwareConcurrency && navigator.hardwareConcurrency < 4) {
      return false;
    }
  }

  return true;
}

// Cache the decision
let _shouldUseFullAnimations = null;

function getAnimationPreference() {
  if (_shouldUseFullAnimations === null) {
    _shouldUseFullAnimations = shouldUseFullAnimations();
  }
  return _shouldUseFullAnimations;
}

/**
 * AdaptiveAnimatePresence - Uses CSS transitions by default,
 * upgrades to framer-motion on capable devices
 */
export function AdaptiveAnimatePresence({ children, mode = 'wait', initial = true }) {
  const [useFullAnimations, setUseFullAnimations] = useState(false);

  useEffect(() => {
    // Defer the check to avoid blocking initial render
    const timer = setTimeout(() => {
      setUseFullAnimations(getAnimationPreference());
    }, 100);

    return () => clearTimeout(timer);
  }, []);

  // Always start with lite version for fastest initial render
  // Then optionally upgrade to full version
  if (!useFullAnimations) {
    return (
      <AnimatePresenceLite mode={mode} initial={initial}>
        {children}
      </AnimatePresenceLite>
    );
  }

  // For capable devices, lazy load framer-motion
  return (
    <Suspense
      fallback={
        <AnimatePresenceLite mode={mode} initial={initial}>
          {children}
        </AnimatePresenceLite>
      }
    >
      <FramerAnimatePresence mode={mode} initial={initial}>
        {children}
      </FramerAnimatePresence>
    </Suspense>
  );
}

/**
 * AdaptiveProgressBar - CSS progress bar that works without framer-motion
 */
export function AdaptiveProgressBar({ isVisible, progress = 0 }) {
  return <ProgressBarLite isVisible={isVisible} progress={progress} />;
}

export default AdaptiveAnimatePresence;
