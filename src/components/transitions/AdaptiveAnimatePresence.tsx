/**
 * AdaptiveAnimatePresence - Conditionally loads framer-motion based on device capability
 *
 * Strategy:
 * 1. Start with CSS-only transitions (AnimatePresenceLite) - 0KB
 * 2. On high-end devices, lazy load framer-motion's AnimatePresence
 * 3. On low-end devices or reduced motion preference, stick with CSS version
 * 4. In restrictive environments (iOS Lockdown Mode), bypass all animation wrappers
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

/**
 * Detect iOS Lockdown Mode or other restrictive environments
 */
function isRestrictiveEnvironment(): boolean {
  if (typeof window === 'undefined') return false;

  try {
    const ua = navigator.userAgent || '';
    const isIOS = /iPad|iPhone|iPod/.test(ua);
    const isBrave = !!(navigator as any).brave;

    // iOS + Brave is often problematic with Shields
    if (isIOS && isBrave) {
      return true;
    }

    // Check for Lockdown Mode indicators (limited APIs)
    // Lockdown Mode disables JIT, which makes complex JS slower
    // It also blocks certain APIs
    if (isIOS) {
      // Try to detect restricted environment
      try {
        // WebGL is often restricted in Lockdown Mode
        const canvas = document.createElement('canvas');
        const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
        if (!gl) {
          console.log('[AdaptiveAnimatePresence] WebGL unavailable, likely Lockdown Mode');
          return true;
        }
      } catch {
        return true;
      }
    }

    return false;
  } catch {
    return true;
  }
}

// Detection for when to use full animations
function shouldUseFullAnimations() {
  // Check for reduced motion preference
  if (typeof window !== 'undefined') {
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) {
      return false;
    }

    // Check for slow connection (2G, slow-2g)
    const connection = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;
    if (connection) {
      if (connection.effectiveType === '2g' || connection.effectiveType === 'slow-2g') {
        return false;
      }
      if (connection.saveData) {
        return false;
      }
    }

    // Check for low device memory (< 4GB)
    if ((navigator as any).deviceMemory && (navigator as any).deviceMemory < 4) {
      return false;
    }

    // Check for low CPU cores
    if (navigator.hardwareConcurrency && navigator.hardwareConcurrency < 4) {
      return false;
    }
  }

  return true;
}

// Cache the decisions
let _shouldUseFullAnimations: boolean | null = null;
let _isRestrictive: boolean | null = null;

function getAnimationPreference(): boolean {
  if (_shouldUseFullAnimations === null) {
    _shouldUseFullAnimations = shouldUseFullAnimations();
  }
  return _shouldUseFullAnimations;
}

function getIsRestrictive(): boolean {
  if (_isRestrictive === null) {
    _isRestrictive = isRestrictiveEnvironment();
  }
  return _isRestrictive;
}

/**
 * AdaptiveAnimatePresence - Uses CSS transitions by default,
 * upgrades to framer-motion on capable devices,
 * or bypasses entirely in restrictive environments
 */
export function AdaptiveAnimatePresence({ children, mode = 'wait', initial = true }) {
  const [useFullAnimations, setUseFullAnimations] = useState(false);
  const [isRestrictive, setIsRestrictive] = useState(false);

  useEffect(() => {
    console.log('[AdaptiveAnimatePresence] Mounted');

    // Check restrictive environment immediately
    const restrictive = getIsRestrictive();
    setIsRestrictive(restrictive);

    // Log for debugging
    try {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', '/api/client-error', true);
      xhr.setRequestHeader('Content-Type', 'application/json');
      xhr.send(JSON.stringify({
        type: 'component_mount',
        message: `[AdaptiveAnimatePresence] Mounted, restrictive: ${restrictive}`,
        source: 'AdaptiveAnimatePresence.tsx',
        time: new Date().toISOString()
      }));
    } catch { /* ignore */ }

    if (restrictive) {
      console.log('[AdaptiveAnimatePresence] Restrictive environment detected, using direct passthrough');
      return;
    }

    // Defer the animation preference check to avoid blocking initial render
    const timer = setTimeout(() => {
      setUseFullAnimations(getAnimationPreference());
    }, 100);

    return () => clearTimeout(timer);
  }, []);

  // In restrictive environments, bypass all animation wrappers entirely
  if (isRestrictive) {
    console.log('[AdaptiveAnimatePresence] Rendering children directly (restrictive mode)');
    return <>{children}</>;
  }

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
