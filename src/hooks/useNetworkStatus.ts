import { useState, useEffect, useCallback } from 'react';

/**
 * Network connection types
 * @typedef {'slow-2g' | '2g' | '3g' | '4g' | '5g' | 'unknown'} EffectiveType
 */

/**
 * Network status information
 * @typedef {Object} NetworkStatus
 * @property {boolean} isOnline - Whether the device is online
 * @property {EffectiveType} effectiveType - Effective connection type
 * @property {number|null} downlink - Downlink speed in Mbps
 * @property {number|null} rtt - Round trip time in ms
 * @property {boolean} saveData - Whether Save-Data is enabled
 * @property {boolean} shouldReduceData - Whether to reduce data usage
 * @property {boolean} shouldReduceMotion - Whether to reduce animations
 * @property {boolean} isSlowConnection - Whether connection is slow (2g or slower)
 * @property {boolean} isFastConnection - Whether connection is fast (4g or better)
 */

/**
 * Hook to monitor network status and provide data-saving recommendations
 * @returns {NetworkStatus}
 */
export function useNetworkStatus() {
  const [networkStatus, setNetworkStatus] = useState(() => getInitialNetworkStatus());

  const updateNetworkStatus = useCallback(() => {
    setNetworkStatus(getNetworkStatus());
  }, []);

  useEffect(() => {
    // Listen for online/offline events
    window.addEventListener('online', updateNetworkStatus);
    window.addEventListener('offline', updateNetworkStatus);

    // Listen for connection changes if available
    const connection = getNetworkConnection();
    if (connection) {
      connection.addEventListener('change', updateNetworkStatus);
    }

    // Initial update
    updateNetworkStatus();

    return () => {
      window.removeEventListener('online', updateNetworkStatus);
      window.removeEventListener('offline', updateNetworkStatus);

      if (connection) {
        connection.removeEventListener('change', updateNetworkStatus);
      }
    };
  }, [updateNetworkStatus]);

  return networkStatus;
}

/**
 * Get the Network Information API connection object
 */
function getNetworkConnection() {
  if (typeof navigator === 'undefined') return null;
  return navigator.connection || navigator.mozConnection || navigator.webkitConnection || null;
}

/**
 * Get initial network status (for SSR safety)
 */
function getInitialNetworkStatus() {
  if (typeof window === 'undefined') {
    return {
      isOnline: true,
      effectiveType: 'unknown',
      downlink: null,
      rtt: null,
      saveData: false,
      shouldReduceData: false,
      shouldReduceMotion: false,
      isSlowConnection: false,
      isFastConnection: true,
    };
  }
  return getNetworkStatus();
}

/**
 * Get current network status
 */
function getNetworkStatus() {
  const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
  const connection = getNetworkConnection();

  const effectiveType = connection?.effectiveType || 'unknown';
  const downlink = connection?.downlink || null;
  const rtt = connection?.rtt || null;
  const saveData = connection?.saveData || false;

  // Determine if we should reduce data usage
  const isSlowConnection = ['slow-2g', '2g'].includes(effectiveType);
  const isFastConnection = ['4g', '5g'].includes(effectiveType) || effectiveType === 'unknown';

  // Reduce data if:
  // - User has Save-Data enabled
  // - Connection is slow (2G or worse)
  // - RTT is very high (> 500ms)
  // - Downlink is very low (< 0.5 Mbps)
  const shouldReduceData =
    saveData ||
    isSlowConnection ||
    (rtt !== null && rtt > 500) ||
    (downlink !== null && downlink < 0.5);

  // Check for reduced motion preference
  const shouldReduceMotion =
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  return {
    isOnline,
    effectiveType,
    downlink,
    rtt,
    saveData,
    shouldReduceData,
    shouldReduceMotion,
    isSlowConnection,
    isFastConnection,
  };
}

/**
 * Hook to get image quality based on network status
 * @returns {{ quality: 'low' | 'medium' | 'high', suffix: string }}
 */
export function useImageQuality() {
  const { shouldReduceData, isSlowConnection, isFastConnection } = useNetworkStatus();

  if (shouldReduceData || isSlowConnection) {
    return { quality: 'low', suffix: '-low' };
  }

  if (isFastConnection) {
    return { quality: 'high', suffix: '' };
  }

  return { quality: 'medium', suffix: '-med' };
}

/**
 * Hook to determine if heavy content should be loaded
 * @returns {boolean}
 */
export function useShouldLoadHeavyContent() {
  const { shouldReduceData, isOnline } = useNetworkStatus();
  return isOnline && !shouldReduceData;
}

/**
 * Hook to get animation settings based on network and preferences
 * @returns {{ enabled: boolean, duration: number, reducedMotion: boolean }}
 */
export function useAnimationSettings() {
  const { shouldReduceData, shouldReduceMotion, isSlowConnection } = useNetworkStatus();

  // Disable or reduce animations if:
  // - User prefers reduced motion
  // - Connection is slow
  // - Data saving mode is on
  const enabled = !shouldReduceMotion && !isSlowConnection && !shouldReduceData;

  // Reduce duration for medium connections
  const duration = shouldReduceData ? 0 : shouldReduceMotion ? 0 : 1;

  return {
    enabled,
    duration,
    reducedMotion: shouldReduceMotion,
  };
}

export default useNetworkStatus;
