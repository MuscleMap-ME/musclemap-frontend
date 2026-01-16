/**
 * use3DMemoryManager - Memory management for 3D content
 *
 * Handles:
 * - Unloading 3D content when not visible (IntersectionObserver)
 * - Memory pressure detection
 * - Automatic quality degradation when memory is low
 * - Cleanup on unmount
 *
 * Use this to wrap any heavy 3D component to prevent crashes
 * on low-memory devices (1-2GB RAM).
 */

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useDeviceCapabilities } from './useDeviceCapabilities';

// Memory thresholds (in bytes)
const MEMORY_WARNING_THRESHOLD = 0.7; // 70% of available memory
const MEMORY_CRITICAL_THRESHOLD = 0.85; // 85% of available memory

// Visibility threshold for unloading (how far offscreen before unload)
const VISIBILITY_ROOT_MARGIN = '100px';

/**
 * Get current memory usage if Performance API is available
 */
function getMemoryInfo() {
  if (typeof performance === 'undefined') return null;

  // Chrome/Edge memory API
  if (performance.memory) {
    const { usedJSHeapSize, jsHeapSizeLimit, totalJSHeapSize } = performance.memory;
    return {
      used: usedJSHeapSize,
      total: totalJSHeapSize,
      limit: jsHeapSizeLimit,
      percentUsed: usedJSHeapSize / jsHeapSizeLimit,
    };
  }

  return null;
}

/**
 * Check if device is under memory pressure
 */
function isMemoryPressure() {
  const memInfo = getMemoryInfo();
  if (!memInfo) return false;

  return memInfo.percentUsed > MEMORY_WARNING_THRESHOLD;
}

/**
 * Check if device is in critical memory state
 */
function isCriticalMemory() {
  const memInfo = getMemoryInfo();
  if (!memInfo) return false;

  return memInfo.percentUsed > MEMORY_CRITICAL_THRESHOLD;
}

/**
 * use3DVisibility - Track visibility of a 3D container
 *
 * @param {Object} options
 * @param {boolean} options.enabled - Whether to track visibility
 * @param {string} options.rootMargin - IntersectionObserver root margin
 * @returns {Object} { ref, isVisible }
 */
export function use3DVisibility({
  enabled = true,
  rootMargin = VISIBILITY_ROOT_MARGIN,
} = {}) {
  const ref = useRef(null);
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    if (!enabled || typeof IntersectionObserver === 'undefined') {
      setIsVisible(true);
      return;
    }

    const element = ref.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsVisible(entry.isIntersecting);
      },
      {
        rootMargin,
        threshold: 0,
      }
    );

    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, [enabled, rootMargin]);

  return { ref, isVisible };
}

/**
 * useMemoryPressure - Monitor memory pressure
 *
 * @returns {Object} { isWarning, isCritical, memoryInfo }
 */
export function useMemoryPressure() {
  const [memoryState, setMemoryState] = useState({
    isWarning: false,
    isCritical: false,
    memoryInfo: null,
  });

  useEffect(() => {
    // Initial check
    const checkMemory = () => {
      const info = getMemoryInfo();
      setMemoryState({
        isWarning: isMemoryPressure(),
        isCritical: isCriticalMemory(),
        memoryInfo: info,
      });
    };

    checkMemory();

    // Check periodically
    const interval = setInterval(checkMemory, 5000);

    // Also check on memory pressure event (Chrome)
    if (typeof window !== 'undefined' && 'memory' in window) {
      // Not a standard event, but some browsers support it
      window.addEventListener('memorypressure', checkMemory);
    }

    return () => {
      clearInterval(interval);
      if (typeof window !== 'undefined' && 'memory' in window) {
        window.removeEventListener('memorypressure', checkMemory);
      }
    };
  }, []);

  return memoryState;
}

/**
 * use3DMemoryManager - Complete memory management for 3D content
 *
 * @param {Object} options
 * @param {boolean} options.enabled - Whether the component should be enabled at all
 * @param {boolean} options.unloadWhenHidden - Unload when scrolled out of view
 * @param {boolean} options.respectMemoryPressure - Disable when memory is low
 * @returns {Object} { containerRef, shouldRender, quality, forceUnload }
 */
export function use3DMemoryManager({
  enabled = true,
  unloadWhenHidden = true,
  respectMemoryPressure = true,
} = {}) {
  const { enable3D, modelQuality, deviceTier } = useDeviceCapabilities();
  const { ref: containerRef, isVisible } = use3DVisibility({ enabled: unloadWhenHidden });
  const { isWarning, isCritical } = useMemoryPressure();
  const [forceUnloaded, setForceUnloaded] = useState(false);

  // Manual force unload
  const forceUnload = useCallback(() => {
    setForceUnloaded(true);
  }, []);

  // Manual force reload
  const forceReload = useCallback(() => {
    setForceUnloaded(false);
  }, []);

  // Determine if 3D should render
  const shouldRender = useMemo(() => {
    // User/API disabled
    if (!enabled) return false;

    // Device not capable
    if (!enable3D) return false;

    // Force unloaded
    if (forceUnloaded) return false;

    // Hidden from viewport
    if (unloadWhenHidden && !isVisible) return false;

    // Critical memory - always disable
    if (respectMemoryPressure && isCritical) return false;

    return true;
  }, [enabled, enable3D, forceUnloaded, unloadWhenHidden, isVisible, respectMemoryPressure, isCritical]);

  // Determine quality level
  const quality = useMemo(() => {
    if (!shouldRender) return 'none';

    // Memory pressure - reduce quality
    if (respectMemoryPressure && isWarning) {
      if (modelQuality === 'full') return 'reduced';
      if (modelQuality === 'reduced') return 'static';
      return 'static';
    }

    return modelQuality;
  }, [shouldRender, respectMemoryPressure, isWarning, modelQuality]);

  // Auto-unload on critical memory
  useEffect(() => {
    if (respectMemoryPressure && isCritical && !forceUnloaded) {
      console.warn('[3D Memory] Critical memory pressure - unloading 3D content');
      setForceUnloaded(true);
    }
  }, [isCritical, respectMemoryPressure, forceUnloaded]);

  return {
    containerRef,
    shouldRender,
    quality,
    isVisible,
    isMemoryWarning: isWarning,
    isMemoryCritical: isCritical,
    deviceTier,
    forceUnload,
    forceReload,
  };
}

/**
 * useThreeJSCleanup - Cleanup Three.js resources on unmount
 *
 * Call this in any component using Three.js directly.
 * Pass an array of disposable objects (geometries, materials, textures).
 *
 * @param {Array} disposables - Array of Three.js objects to dispose
 */
export function useThreeJSCleanup(disposables = []) {
  const disposablesRef = useRef(disposables);
  disposablesRef.current = disposables;

  useEffect(() => {
    return () => {
      // Cleanup on unmount
      disposablesRef.current.forEach((obj) => {
        if (obj && typeof obj.dispose === 'function') {
          try {
            obj.dispose();
          } catch (e) {
            console.warn('[3D Cleanup] Failed to dispose:', e);
          }
        }
      });
    };
  }, []);
}

export default use3DMemoryManager;
