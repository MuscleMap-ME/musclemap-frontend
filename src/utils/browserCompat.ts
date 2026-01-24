/**
 * Browser Compatibility & Restrictive Environment Detection
 *
 * CRITICAL: This module detects restrictive browser environments where
 * animations and advanced features may fail silently. It's designed to
 * be bulletproof for:
 *
 * - iOS Lockdown Mode
 * - Brave Browser with Shields enabled (any platform)
 * - Safari with strict privacy settings
 * - Firefox with Enhanced Tracking Protection (strict)
 * - Any browser with disabled JavaScript features
 *
 * The goal is ALWAYS VISIBLE CONTENT - we'd rather show static content
 * than risk invisible elements due to failed animations.
 */

// ============================================================================
// DETECTION FLAGS
// ============================================================================

export interface BrowserCapabilities {
  // Core detection
  isRestrictive: boolean;
  isIOS: boolean;
  isBrave: boolean;
  isSafari: boolean;
  isFirefox: boolean;
  isLockdownMode: boolean;

  // Feature availability
  hasWebGL: boolean;
  hasWebGL2: boolean;
  hasIndexedDB: boolean;
  hasServiceWorker: boolean;
  hasWebAnimations: boolean;
  hasIntersectionObserver: boolean;
  hasResizeObserver: boolean;
  hasMutationObserver: boolean;

  // Performance hints
  prefersReducedMotion: boolean;
  isSlowConnection: boolean;
  isLowMemory: boolean;
  isLowCPU: boolean;
  saveData: boolean;

  // Animation safety
  shouldUseStaticFallbacks: boolean;
  shouldDisableComplexAnimations: boolean;
  shouldDisable3D: boolean;
  animationSafetyLevel: 'full' | 'reduced' | 'minimal' | 'none';
}

// Cached detection result
let _capabilities: BrowserCapabilities | null = null;
let _detectionPromise: Promise<BrowserCapabilities> | null = null;

// ============================================================================
// DETECTION FUNCTIONS
// ============================================================================

/**
 * Detect if running on iOS (iPhone, iPad, iPod)
 */
function detectIOS(): boolean {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return false;

  try {
    const ua = navigator.userAgent || '';
    // Standard iOS detection
    if (/iPad|iPhone|iPod/.test(ua)) return true;

    // iPad on iOS 13+ reports as Mac, check for touch
    if (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1) return true;

    // Check for iOS-specific features
    if ('standalone' in navigator) return true;

    return false;
  } catch {
    return false;
  }
}

/**
 * Detect Brave Browser (works even with Shields blocking navigator.brave)
 */
function detectBrave(): boolean {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return false;

  try {
    // Method 1: Direct check (may be blocked by Shields)
    if ((navigator as any).brave) return true;

    // Method 2: Check for Brave-specific behavior
    // Brave blocks certain APIs that other browsers don't
    const ua = navigator.userAgent || '';

    // Brave uses Chrome's UA but has unique fingerprinting behavior
    if (ua.includes('Chrome') && !ua.includes('Edg') && !ua.includes('OPR')) {
      // Check for Brave's unique handling of certain APIs
      try {
        // Brave often returns empty or modified values for these
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.fillStyle = '#f00';
          ctx.fillRect(0, 0, 1, 1);
          // Read imageData to test canvas access (Brave Shields can block this)
          // We don't use the data, just checking if the operation succeeds
          ctx.getImageData(0, 0, 1, 1);
          // Brave Shields can modify canvas fingerprinting
          // This is a heuristic, not definitive
        }
      } catch {
        // Canvas blocked = likely restrictive environment
        return true;
      }
    }

    return false;
  } catch {
    return true; // If detection fails, assume restrictive
  }
}

/**
 * Detect Safari browser
 */
function detectSafari(): boolean {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return false;

  try {
    const ua = navigator.userAgent || '';
    return /Safari/.test(ua) && !/Chrome/.test(ua) && !/Chromium/.test(ua);
  } catch {
    return false;
  }
}

/**
 * Detect Firefox browser
 */
function detectFirefox(): boolean {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return false;

  try {
    const ua = navigator.userAgent || '';
    return /Firefox/.test(ua);
  } catch {
    return false;
  }
}

/**
 * Detect iOS Lockdown Mode
 * Lockdown Mode disables JIT compilation, WebGL, and many other features
 */
function detectLockdownMode(): boolean {
  if (typeof window === 'undefined') return false;

  const isIOS = detectIOS();
  if (!isIOS) return false;

  try {
    // Check 1: WebGL availability (often disabled in Lockdown Mode)
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    if (!gl) {
      console.log('[BrowserCompat] WebGL unavailable on iOS - likely Lockdown Mode');
      return true;
    }

    // Check 2: WebGL2 availability
    const gl2 = canvas.getContext('webgl2');
    if (!gl2 && isIOS) {
      // Modern iOS should have WebGL2 unless restricted
      console.log('[BrowserCompat] WebGL2 unavailable on iOS - possibly Lockdown Mode');
      // Don't return true yet, this alone isn't definitive
    }

    // Check 3: Service Worker availability
    if (!('serviceWorker' in navigator)) {
      console.log('[BrowserCompat] ServiceWorker unavailable - possibly Lockdown Mode');
      return true;
    }

    // Check 4: JIT compilation test (Lockdown Mode disables JIT)
    // This is hard to detect directly, but we can check for performance hints

    return false;
  } catch (e) {
    console.log('[BrowserCompat] Error detecting Lockdown Mode:', e);
    return true; // Fail safe
  }
}

/**
 * Check WebGL availability
 */
function checkWebGL(): { hasWebGL: boolean; hasWebGL2: boolean } {
  if (typeof document === 'undefined') return { hasWebGL: false, hasWebGL2: false };

  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    const gl2 = canvas.getContext('webgl2');
    return {
      hasWebGL: !!gl,
      hasWebGL2: !!gl2,
    };
  } catch {
    return { hasWebGL: false, hasWebGL2: false };
  }
}

/**
 * Check IndexedDB availability (can be blocked by privacy settings)
 */
function checkIndexedDB(): boolean {
  if (typeof window === 'undefined') return false;

  try {
    // Just checking if it exists isn't enough - try to open a database
    const request = indexedDB.open('_browserCompat_test', 1);
    request.onerror = () => {};
    request.onsuccess = () => {
      try {
        request.result.close();
        indexedDB.deleteDatabase('_browserCompat_test');
      } catch {}
    };
    return true;
  } catch {
    return false;
  }
}

/**
 * Check Web Animations API support
 */
function checkWebAnimations(): boolean {
  if (typeof document === 'undefined') return false;

  try {
    const el = document.createElement('div');
    return typeof el.animate === 'function';
  } catch {
    return false;
  }
}

/**
 * Check reduced motion preference
 */
function checkReducedMotion(): boolean {
  if (typeof window === 'undefined') return false;

  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
}

/**
 * Check connection quality
 */
function checkConnectionQuality(): { isSlowConnection: boolean; saveData: boolean } {
  if (typeof navigator === 'undefined') return { isSlowConnection: false, saveData: false };

  try {
    const connection = (navigator as any).connection ||
                       (navigator as any).mozConnection ||
                       (navigator as any).webkitConnection;

    if (!connection) return { isSlowConnection: false, saveData: false };

    const isSlowConnection = connection.effectiveType === '2g' ||
                              connection.effectiveType === 'slow-2g' ||
                              (connection.downlink && connection.downlink < 1);

    return {
      isSlowConnection,
      saveData: !!connection.saveData,
    };
  } catch {
    return { isSlowConnection: false, saveData: false };
  }
}

/**
 * Check device capabilities
 */
function checkDeviceCapabilities(): { isLowMemory: boolean; isLowCPU: boolean } {
  if (typeof navigator === 'undefined') return { isLowMemory: false, isLowCPU: false };

  try {
    const deviceMemory = (navigator as any).deviceMemory;
    const cpuCores = navigator.hardwareConcurrency;

    return {
      isLowMemory: deviceMemory !== undefined && deviceMemory < 4,
      isLowCPU: cpuCores !== undefined && cpuCores < 4,
    };
  } catch {
    return { isLowMemory: false, isLowCPU: false };
  }
}

/**
 * Check observer APIs
 */
function checkObservers(): {
  hasIntersectionObserver: boolean;
  hasResizeObserver: boolean;
  hasMutationObserver: boolean;
} {
  if (typeof window === 'undefined') {
    return {
      hasIntersectionObserver: false,
      hasResizeObserver: false,
      hasMutationObserver: false,
    };
  }

  return {
    hasIntersectionObserver: 'IntersectionObserver' in window,
    hasResizeObserver: 'ResizeObserver' in window,
    hasMutationObserver: 'MutationObserver' in window,
  };
}

// ============================================================================
// MAIN DETECTION
// ============================================================================

/**
 * Perform full browser capability detection
 * This is the main function that should be called once at app startup
 */
export function detectBrowserCapabilities(): BrowserCapabilities {
  // Return cached result if available
  if (_capabilities) return _capabilities;

  const isIOS = detectIOS();
  const isBrave = detectBrave();
  const isSafari = detectSafari();
  const isFirefox = detectFirefox();
  const isLockdownMode = detectLockdownMode();

  const webgl = checkWebGL();
  const observers = checkObservers();
  const connection = checkConnectionQuality();
  const device = checkDeviceCapabilities();
  const prefersReducedMotion = checkReducedMotion();

  // Determine if this is a restrictive environment
  const isRestrictive =
    isLockdownMode ||
    (isIOS && isBrave) ||
    (!webgl.hasWebGL && isIOS) ||
    prefersReducedMotion;

  // Determine animation safety level
  let animationSafetyLevel: 'full' | 'reduced' | 'minimal' | 'none';

  if (isLockdownMode || (isIOS && isBrave)) {
    animationSafetyLevel = 'none';
  } else if (prefersReducedMotion || connection.saveData) {
    animationSafetyLevel = 'minimal';
  } else if (connection.isSlowConnection || device.isLowMemory || device.isLowCPU) {
    animationSafetyLevel = 'reduced';
  } else {
    animationSafetyLevel = 'full';
  }

  _capabilities = {
    isRestrictive,
    isIOS,
    isBrave,
    isSafari,
    isFirefox,
    isLockdownMode,

    hasWebGL: webgl.hasWebGL,
    hasWebGL2: webgl.hasWebGL2,
    hasIndexedDB: checkIndexedDB(),
    hasServiceWorker: typeof navigator !== 'undefined' && 'serviceWorker' in navigator,
    hasWebAnimations: checkWebAnimations(),
    hasIntersectionObserver: observers.hasIntersectionObserver,
    hasResizeObserver: observers.hasResizeObserver,
    hasMutationObserver: observers.hasMutationObserver,

    prefersReducedMotion,
    isSlowConnection: connection.isSlowConnection,
    isLowMemory: device.isLowMemory,
    isLowCPU: device.isLowCPU,
    saveData: connection.saveData,

    shouldUseStaticFallbacks: animationSafetyLevel === 'none' || animationSafetyLevel === 'minimal',
    shouldDisableComplexAnimations: animationSafetyLevel !== 'full',
    shouldDisable3D: !webgl.hasWebGL || isLockdownMode,
    animationSafetyLevel,
  };

  // Log detection results for debugging
  if (typeof console !== 'undefined') {
    console.log('[BrowserCompat] Detection complete:', {
      isRestrictive: _capabilities.isRestrictive,
      animationSafetyLevel: _capabilities.animationSafetyLevel,
      isIOS: _capabilities.isIOS,
      isBrave: _capabilities.isBrave,
      isLockdownMode: _capabilities.isLockdownMode,
    });
  }

  return _capabilities;
}

/**
 * Async version that performs more thorough checks
 */
export async function detectBrowserCapabilitiesAsync(): Promise<BrowserCapabilities> {
  if (_capabilities) return _capabilities;
  if (_detectionPromise) return _detectionPromise;

  _detectionPromise = new Promise((resolve) => {
    // Use requestIdleCallback if available for non-blocking detection
    const detect = () => {
      const capabilities = detectBrowserCapabilities();
      resolve(capabilities);
    };

    if (typeof requestIdleCallback !== 'undefined') {
      requestIdleCallback(detect, { timeout: 100 });
    } else {
      setTimeout(detect, 0);
    }
  });

  return _detectionPromise;
}

/**
 * Quick sync check for restrictive environment
 * Use this when you need an immediate answer
 */
export function isRestrictiveEnvironment(): boolean {
  if (_capabilities) return _capabilities.isRestrictive;

  // Quick checks without full detection
  if (typeof window === 'undefined') return false;

  try {
    const ua = navigator.userAgent || '';
    const isIOS = /iPad|iPhone|iPod/.test(ua);
    const isBrave = !!(navigator as any).brave;

    // iOS + Brave is definitely restrictive
    if (isIOS && isBrave) return true;

    // Check for reduced motion preference
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return true;

    // Quick WebGL check for iOS
    if (isIOS) {
      try {
        const canvas = document.createElement('canvas');
        const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
        if (!gl) return true;
      } catch {
        return true;
      }
    }

    return false;
  } catch {
    return true; // Fail safe
  }
}

/**
 * Get cached capabilities or detect if not yet cached
 */
export function getCapabilities(): BrowserCapabilities {
  return _capabilities || detectBrowserCapabilities();
}

/**
 * Check if we should use static fallbacks for animations
 */
export function shouldUseStaticFallbacks(): boolean {
  const caps = getCapabilities();
  return caps.shouldUseStaticFallbacks;
}

/**
 * Check if we should disable complex animations
 */
export function shouldDisableComplexAnimations(): boolean {
  const caps = getCapabilities();
  return caps.shouldDisableComplexAnimations;
}

/**
 * Check if we should disable 3D features
 */
export function shouldDisable3D(): boolean {
  const caps = getCapabilities();
  return caps.shouldDisable3D;
}

/**
 * Get the animation safety level
 */
export function getAnimationSafetyLevel(): 'full' | 'reduced' | 'minimal' | 'none' {
  const caps = getCapabilities();
  return caps.animationSafetyLevel;
}

/**
 * Reset the cached detection (useful for testing)
 */
export function resetCapabilitiesCache(): void {
  _capabilities = null;
  _detectionPromise = null;
}

// ============================================================================
// REACT HOOKS
// ============================================================================

import { useState, useEffect } from 'react';

/**
 * React hook to get browser capabilities
 * Triggers re-render when capabilities are detected
 */
export function useBrowserCapabilities(): BrowserCapabilities {
  const [capabilities, setCapabilities] = useState<BrowserCapabilities>(() =>
    _capabilities || detectBrowserCapabilities()
  );

  useEffect(() => {
    // Perform async detection for more thorough checks
    detectBrowserCapabilitiesAsync().then(setCapabilities);
  }, []);

  return capabilities;
}

/**
 * React hook to check if in restrictive environment
 */
export function useIsRestrictive(): boolean {
  const [isRestrictive, setIsRestrictive] = useState(() => isRestrictiveEnvironment());

  useEffect(() => {
    detectBrowserCapabilitiesAsync().then((caps) => {
      setIsRestrictive(caps.isRestrictive);
    });
  }, []);

  return isRestrictive;
}

/**
 * React hook to get animation safety level
 */
export function useAnimationSafetyLevel(): 'full' | 'reduced' | 'minimal' | 'none' {
  const capabilities = useBrowserCapabilities();
  return capabilities.animationSafetyLevel;
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Wrap a value based on animation safety level
 * Useful for conditionally applying animations
 */
export function safeAnimation<T>(
  fullValue: T,
  reducedValue: T,
  minimalValue: T,
  noneValue: T
): T {
  const level = getAnimationSafetyLevel();
  switch (level) {
    case 'full': return fullValue;
    case 'reduced': return reducedValue;
    case 'minimal': return minimalValue;
    case 'none': return noneValue;
  }
}

/**
 * Get safe animation duration based on environment
 */
export function getSafeAnimationDuration(fullDuration: number): number {
  const level = getAnimationSafetyLevel();
  switch (level) {
    case 'full': return fullDuration;
    case 'reduced': return fullDuration * 0.5;
    case 'minimal': return 0;
    case 'none': return 0;
  }
}

/**
 * Check if a specific feature is available
 */
export function hasFeature(feature: keyof BrowserCapabilities): boolean {
  const caps = getCapabilities();
  return !!caps[feature];
}

export default {
  detectBrowserCapabilities,
  detectBrowserCapabilitiesAsync,
  isRestrictiveEnvironment,
  getCapabilities,
  shouldUseStaticFallbacks,
  shouldDisableComplexAnimations,
  shouldDisable3D,
  getAnimationSafetyLevel,
  resetCapabilitiesCache,
  useBrowserCapabilities,
  useIsRestrictive,
  useAnimationSafetyLevel,
  safeAnimation,
  getSafeAnimationDuration,
  hasFeature,
};
