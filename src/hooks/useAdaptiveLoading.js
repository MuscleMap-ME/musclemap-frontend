/**
 * Adaptive Loading Hooks
 *
 * Provides comprehensive hooks for adapting application behavior based on:
 * - Network conditions (connection type, bandwidth, latency)
 * - Device capabilities (memory, CPU cores, battery)
 * - User preferences (Save-Data, reduced motion)
 *
 * Used throughout the app to:
 * - Load appropriate image/video quality
 * - Enable/disable animations
 * - Adjust polling intervals
 * - Defer non-critical content
 */

import { useState, useEffect, useCallback, useMemo } from 'react';

// ============================================
// TYPES (JSDoc)
// ============================================

/**
 * @typedef {'fast' | 'medium' | 'slow' | 'offline'} ConnectionTier
 */

/**
 * @typedef {'high' | 'medium' | 'low'} DeviceTier
 */

/**
 * @typedef {Object} AdaptiveConfig
 * @property {ConnectionTier} connectionTier - Current connection quality tier
 * @property {DeviceTier} deviceTier - Current device capability tier
 * @property {boolean} isOnline - Whether the device is online
 * @property {boolean} shouldReduceData - Whether to reduce data usage
 * @property {boolean} shouldReduceMotion - Whether to reduce animations
 * @property {boolean} isLowPowerMode - Whether device is in low power mode
 * @property {number} pollingInterval - Recommended polling interval in ms
 * @property {'full' | 'static' | 'placeholder'} visualizationMode - 3D visualization mode
 * @property {'high' | 'medium' | 'low' | 'disabled'} animationLevel - Animation quality level
 * @property {'original' | 'compressed' | 'thumbnail'} imageQuality - Image quality to load
 * @property {boolean} prefetchEnabled - Whether to prefetch content
 * @property {boolean} autoplayEnabled - Whether to autoplay media
 */

// ============================================
// NETWORK DETECTION
// ============================================

/**
 * Get network connection object if available.
 * @returns {NetworkInformation | null}
 */
function getNetworkConnection() {
  if (typeof navigator === 'undefined') return null;
  return navigator.connection || navigator.mozConnection || navigator.webkitConnection || null;
}

/**
 * Determine connection tier from network info.
 * @param {NetworkInformation | null} connection
 * @returns {ConnectionTier}
 */
function getConnectionTier(connection) {
  if (typeof navigator === 'undefined' || !navigator.onLine) {
    return 'offline';
  }

  if (!connection) {
    // Assume fast if we can't detect
    return 'fast';
  }

  const { effectiveType, downlink, rtt, saveData } = connection;

  // If user has Save-Data enabled, treat as slow
  if (saveData) {
    return 'slow';
  }

  // Use effective connection type as primary indicator
  switch (effectiveType) {
    case '4g':
      // Even on 4g, check actual metrics
      if (downlink && downlink < 1) return 'medium';
      if (rtt && rtt > 200) return 'medium';
      return 'fast';

    case '3g':
      return 'medium';

    case '2g':
    case 'slow-2g':
      return 'slow';

    default:
      // Fall back to measuring actual values
      if (downlink && downlink >= 5) return 'fast';
      if (downlink && downlink >= 1) return 'medium';
      return 'slow';
  }
}

// ============================================
// DEVICE DETECTION
// ============================================

/**
 * Determine device tier from hardware capabilities.
 * @returns {DeviceTier}
 */
function getDeviceTier() {
  if (typeof navigator === 'undefined') {
    return 'high';
  }

  let score = 0;

  // CPU cores (most devices have 4+, high-end have 8+)
  const cores = navigator.hardwareConcurrency || 4;
  if (cores >= 8) score += 3;
  else if (cores >= 4) score += 2;
  else score += 1;

  // Device memory (if available)
  const memory = navigator.deviceMemory || 4;
  if (memory >= 8) score += 3;
  else if (memory >= 4) score += 2;
  else score += 1;

  // Check for mobile (generally lower performance)
  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
  if (isMobile) score -= 1;

  // Categorize
  if (score >= 5) return 'high';
  if (score >= 3) return 'medium';
  return 'low';
}

/**
 * Check if device is in low power mode.
 * Uses Battery API if available.
 * @returns {Promise<boolean>}
 */
async function checkLowPowerMode() {
  if (typeof navigator === 'undefined' || !navigator.getBattery) {
    return false;
  }

  try {
    const battery = await navigator.getBattery();
    // Consider low power if battery < 20% and not charging
    return battery.level < 0.2 && !battery.charging;
  } catch {
    return false;
  }
}

// ============================================
// MAIN HOOK
// ============================================

/**
 * Main adaptive loading hook.
 * Provides all information needed to adapt application behavior.
 *
 * @returns {AdaptiveConfig}
 */
export function useAdaptiveLoading() {
  const [connectionTier, setConnectionTier] = useState(() => {
    const connection = getNetworkConnection();
    return getConnectionTier(connection);
  });

  const [deviceTier] = useState(() => getDeviceTier());

  const [isOnline, setIsOnline] = useState(() =>
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );

  const [isLowPowerMode, setIsLowPowerMode] = useState(false);

  const [shouldReduceMotion] = useState(() =>
    typeof window !== 'undefined'
      ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
      : false
  );

  // Update connection tier when network changes
  const updateConnectionTier = useCallback(() => {
    const connection = getNetworkConnection();
    setConnectionTier(getConnectionTier(connection));
  }, []);

  // Update online status
  const updateOnlineStatus = useCallback(() => {
    setIsOnline(navigator.onLine);
    updateConnectionTier();
  }, [updateConnectionTier]);

  useEffect(() => {
    // Listen for network changes
    window.addEventListener('online', updateOnlineStatus);
    window.addEventListener('offline', updateOnlineStatus);

    const connection = getNetworkConnection();
    if (connection) {
      connection.addEventListener('change', updateConnectionTier);
    }

    // Check for low power mode
    checkLowPowerMode().then(setIsLowPowerMode);

    // Monitor battery status
    if (navigator.getBattery) {
      navigator.getBattery().then((battery) => {
        const updateBattery = () => {
          setIsLowPowerMode(battery.level < 0.2 && !battery.charging);
        };
        battery.addEventListener('levelchange', updateBattery);
        battery.addEventListener('chargingchange', updateBattery);
      }).catch(() => {});
    }

    return () => {
      window.removeEventListener('online', updateOnlineStatus);
      window.removeEventListener('offline', updateOnlineStatus);

      if (connection) {
        connection.removeEventListener('change', updateConnectionTier);
      }
    };
  }, [updateConnectionTier, updateOnlineStatus]);

  // Compute derived values
  const config = useMemo(() => {
    const connection = getNetworkConnection();
    const saveData = connection?.saveData || false;

    // Should reduce data usage?
    const shouldReduceData =
      saveData ||
      connectionTier === 'slow' ||
      connectionTier === 'offline' ||
      isLowPowerMode;

    // Polling interval based on connection
    const pollingIntervalMap = {
      fast: 5000,      // 5 seconds
      medium: 15000,   // 15 seconds
      slow: 60000,     // 1 minute
      offline: 0,      // Disabled
    };
    const pollingInterval = pollingIntervalMap[connectionTier];

    // 3D visualization mode
    let visualizationMode = 'full';
    if (connectionTier === 'offline' || deviceTier === 'low') {
      visualizationMode = 'placeholder';
    } else if (connectionTier === 'slow' || deviceTier === 'medium' || shouldReduceData) {
      visualizationMode = 'static';
    }

    // Animation level
    let animationLevel = 'high';
    if (shouldReduceMotion) {
      animationLevel = 'disabled';
    } else if (isLowPowerMode || connectionTier === 'slow') {
      animationLevel = 'low';
    } else if (connectionTier === 'medium' || deviceTier === 'medium') {
      animationLevel = 'medium';
    }

    // Image quality
    let imageQuality = 'original';
    if (connectionTier === 'slow' || shouldReduceData) {
      imageQuality = 'thumbnail';
    } else if (connectionTier === 'medium') {
      imageQuality = 'compressed';
    }

    // Prefetch enabled only on fast connections
    const prefetchEnabled = connectionTier === 'fast' && !shouldReduceData;

    // Autoplay enabled only on fast connections and not in low power
    const autoplayEnabled =
      connectionTier === 'fast' && !shouldReduceData && !isLowPowerMode;

    return {
      connectionTier,
      deviceTier,
      isOnline,
      shouldReduceData,
      shouldReduceMotion,
      isLowPowerMode,
      pollingInterval,
      visualizationMode,
      animationLevel,
      imageQuality,
      prefetchEnabled,
      autoplayEnabled,
    };
  }, [connectionTier, deviceTier, isOnline, isLowPowerMode, shouldReduceMotion]);

  return config;
}

// ============================================
// SPECIALIZED HOOKS
// ============================================

/**
 * Hook for image loading with adaptive quality.
 * @param {string} originalSrc - Original image source
 * @returns {{ src: string, srcSet: string, loading: 'lazy' | 'eager' }}
 */
export function useAdaptiveImage(originalSrc) {
  const { imageQuality, prefetchEnabled } = useAdaptiveLoading();

  return useMemo(() => {
    if (!originalSrc) {
      return { src: '', srcSet: '', loading: 'lazy' };
    }

    // For external URLs, just return original
    if (originalSrc.startsWith('http') && !originalSrc.includes('musclemap.me')) {
      return {
        src: originalSrc,
        srcSet: '',
        loading: prefetchEnabled ? 'eager' : 'lazy',
      };
    }

    // Generate responsive srcSet based on quality
    const basePath = originalSrc.replace(/\.(jpg|png|webp)$/i, '');
    const ext = originalSrc.match(/\.(jpg|png|webp)$/i)?.[0] || '.webp';

    let src = originalSrc;
    let srcSet = '';

    switch (imageQuality) {
      case 'thumbnail':
        src = `${basePath}-thumb${ext}`;
        srcSet = `${basePath}-thumb${ext} 200w, ${basePath}-small${ext} 400w`;
        break;

      case 'compressed':
        src = `${basePath}-small${ext}`;
        srcSet = `${basePath}-small${ext} 400w, ${basePath}-medium${ext} 800w`;
        break;

      default:
        srcSet = `${basePath}-small${ext} 400w, ${basePath}-medium${ext} 800w, ${originalSrc} 1200w`;
    }

    return {
      src,
      srcSet,
      loading: prefetchEnabled ? 'eager' : 'lazy',
    };
  }, [originalSrc, imageQuality, prefetchEnabled]);
}

/**
 * Hook for 3D visualization settings.
 * @returns {{ mode: 'full' | 'static' | 'placeholder', quality: 'high' | 'medium' | 'low' }}
 */
export function useVisualizationSettings() {
  const { visualizationMode, deviceTier, isLowPowerMode } = useAdaptiveLoading();

  return useMemo(() => {
    let quality = 'high';
    if (deviceTier === 'low' || isLowPowerMode) {
      quality = 'low';
    } else if (deviceTier === 'medium') {
      quality = 'medium';
    }

    return {
      mode: visualizationMode,
      quality,
    };
  }, [visualizationMode, deviceTier, isLowPowerMode]);
}

/**
 * Hook for animation configuration.
 * @returns {{ enabled: boolean, duration: number, spring: object }}
 */
export function useAnimationConfig() {
  const { animationLevel, shouldReduceMotion } = useAdaptiveLoading();

  return useMemo(() => {
    if (animationLevel === 'disabled' || shouldReduceMotion) {
      return {
        enabled: false,
        duration: 0,
        spring: { type: 'tween', duration: 0 },
      };
    }

    const durationMap = {
      high: 0.3,
      medium: 0.2,
      low: 0.1,
    };

    const springMap = {
      high: { type: 'spring', stiffness: 300, damping: 30 },
      medium: { type: 'spring', stiffness: 400, damping: 35 },
      low: { type: 'tween', duration: 0.1 },
    };

    return {
      enabled: true,
      duration: durationMap[animationLevel],
      spring: springMap[animationLevel],
    };
  }, [animationLevel, shouldReduceMotion]);
}

/**
 * Hook for polling interval that adapts to network.
 * @param {number} baseDuration - Base polling interval in ms
 * @returns {number} Adapted polling interval
 */
export function useAdaptivePollingInterval(baseDuration = 5000) {
  const { connectionTier, isOnline } = useAdaptiveLoading();

  return useMemo(() => {
    if (!isOnline) return 0;

    const multiplierMap = {
      fast: 1,
      medium: 3,
      slow: 12,
      offline: 0,
    };

    return baseDuration * multiplierMap[connectionTier];
  }, [baseDuration, connectionTier, isOnline]);
}

/**
 * Hook for lazy loading with intersection observer.
 * @param {object} options - Intersection observer options
 * @returns {{ ref: function, isVisible: boolean }}
 */
export function useLazyLoad(options = {}) {
  const [isVisible, setIsVisible] = useState(false);
  const [element, setElement] = useState(null);

  const { prefetchEnabled } = useAdaptiveLoading();

  useEffect(() => {
    if (!element) return;

    // If prefetch is enabled and we want to load immediately
    if (prefetchEnabled && options.eager) {
      setIsVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      {
        rootMargin: prefetchEnabled ? '200px' : '50px',
        ...options,
      }
    );

    observer.observe(element);

    return () => observer.disconnect();
  }, [element, prefetchEnabled, options]);

  return {
    ref: setElement,
    isVisible,
  };
}

export default useAdaptiveLoading;
