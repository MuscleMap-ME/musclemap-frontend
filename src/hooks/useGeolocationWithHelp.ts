/**
 * useGeolocationWithHelp Hook
 *
 * Enhanced geolocation hook that provides:
 * - Position acquisition with loading/error states
 * - Platform-aware help system for permission issues
 * - Retry functionality after following help steps
 * - Caching of successful positions
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { detectPlatform, getInstructionKey, type PlatformInfo } from '@/utils/platformDetector';

export interface GeolocationPosition {
  latitude: number;
  longitude: number;
  accuracy: number;
  timestamp: number;
}

export interface GeolocationError {
  code: number;
  message: string;
  type: 'permission_denied' | 'position_unavailable' | 'timeout' | 'not_supported' | 'unknown';
}

export interface GeolocationOptions {
  enableHighAccuracy?: boolean;
  timeout?: number;
  maximumAge?: number;
  cachePosition?: boolean;
  cacheDuration?: number; // ms, default 60000 (1 minute)
}

export interface UseGeolocationWithHelpResult {
  // Current state
  position: GeolocationPosition | null;
  error: GeolocationError | null;
  loading: boolean;

  // Help system
  showHelp: boolean;
  platformInfo: PlatformInfo;
  instructionKey: string;

  // Actions
  requestLocation: () => void;
  dismissHelp: () => void;
  openHelp: () => void;
  retryLocation: () => void;
  clearError: () => void;

  // Status
  isSupported: boolean;
  hasPermission: boolean | null; // null = unknown
  attemptCount: number;
}

const DEFAULT_OPTIONS: GeolocationOptions = {
  enableHighAccuracy: true,
  timeout: 15000,
  maximumAge: 60000,
  cachePosition: true,
  cacheDuration: 60000,
};

// Cache for position across component instances
let cachedPosition: GeolocationPosition | null = null;
let cacheTimestamp = 0;

/**
 * Convert GeolocationPositionError code to our error type
 */
function getErrorType(code: number): GeolocationError['type'] {
  switch (code) {
    case 1: // PERMISSION_DENIED
      return 'permission_denied';
    case 2: // POSITION_UNAVAILABLE
      return 'position_unavailable';
    case 3: // TIMEOUT
      return 'timeout';
    default:
      return 'unknown';
  }
}

/**
 * Get user-friendly error message based on error type and platform
 */
function getErrorMessage(type: GeolocationError['type'], platform: PlatformInfo): string {
  const browserName = platform.browser === 'brave' ? 'Brave' :
                      platform.browser === 'safari' ? 'Safari' :
                      platform.browser === 'chrome' ? 'Chrome' :
                      platform.browser === 'firefox' ? 'Firefox' :
                      'your browser';

  switch (type) {
    case 'permission_denied':
      if (platform.os === 'ios') {
        return `Location access was denied. You need to enable location in both iOS Settings and ${browserName}.`;
      }
      return `Location access was denied. Please enable location permissions in ${browserName}.`;

    case 'position_unavailable':
      if (platform.isMobile) {
        return 'Unable to determine your location. Try moving to an area with better GPS signal or check if Location Services is enabled.';
      }
      return 'Unable to determine your location. This may happen if you\'re using a VPN or your device doesn\'t have GPS.';

    case 'timeout':
      return 'Location request timed out. Please try again or move to an area with better signal.';

    case 'not_supported':
      return 'Your browser doesn\'t support location services. Try using a different browser.';

    default:
      return 'An error occurred while getting your location. Please try again.';
  }
}

export function useGeolocationWithHelp(
  options: GeolocationOptions = {}
): UseGeolocationWithHelpResult {
  const mergedOptions = { ...DEFAULT_OPTIONS, ...options };

  const [position, setPosition] = useState<GeolocationPosition | null>(null);
  const [error, setError] = useState<GeolocationError | null>(null);
  const [loading, setLoading] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [attemptCount, setAttemptCount] = useState(0);

  const platformInfo = useRef(detectPlatform()).current;
  const instructionKey = useRef(getInstructionKey(platformInfo)).current;
  const watchIdRef = useRef<number | null>(null);

  const isSupported = typeof navigator !== 'undefined' && 'geolocation' in navigator;

  // Check cached position on mount
  useEffect(() => {
    if (
      mergedOptions.cachePosition &&
      cachedPosition &&
      Date.now() - cacheTimestamp < (mergedOptions.cacheDuration || 60000)
    ) {
      setPosition(cachedPosition);
    }
  }, [mergedOptions.cachePosition, mergedOptions.cacheDuration]);

  // Check permission status on mount (if supported)
  useEffect(() => {
    if (navigator.permissions) {
      navigator.permissions.query({ name: 'geolocation' }).then((result) => {
        setHasPermission(result.state === 'granted');
        result.addEventListener('change', () => {
          setHasPermission(result.state === 'granted');
        });
      }).catch(() => {
        // Permissions API not supported for geolocation
      });
    }
  }, []);

  // Cleanup watch on unmount
  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, []);

  const handleSuccess = useCallback((pos: GeolocationPosition) => {
    const newPosition: GeolocationPosition = {
      latitude: pos.latitude,
      longitude: pos.longitude,
      accuracy: pos.accuracy,
      timestamp: pos.timestamp,
    };

    setPosition(newPosition);
    setError(null);
    setLoading(false);
    setShowHelp(false);
    setHasPermission(true);

    // Update cache
    if (mergedOptions.cachePosition) {
      cachedPosition = newPosition;
      cacheTimestamp = Date.now();
    }
  }, [mergedOptions.cachePosition]);

  const handleError = useCallback((err: GeolocationPositionError) => {
    const errorType = getErrorType(err.code);
    const geoError: GeolocationError = {
      code: err.code,
      message: getErrorMessage(errorType, platformInfo),
      type: errorType,
    };

    setError(geoError);
    setLoading(false);

    if (errorType === 'permission_denied') {
      setHasPermission(false);
    }
  }, [platformInfo]);

  const requestLocation = useCallback(() => {
    if (!isSupported) {
      setError({
        code: 0,
        message: getErrorMessage('not_supported', platformInfo),
        type: 'not_supported',
      });
      return;
    }

    setLoading(true);
    setError(null);
    setAttemptCount((prev) => prev + 1);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        handleSuccess({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
          timestamp: pos.timestamp,
        });
      },
      handleError,
      {
        enableHighAccuracy: mergedOptions.enableHighAccuracy,
        timeout: mergedOptions.timeout,
        maximumAge: mergedOptions.maximumAge,
      }
    );
  }, [isSupported, handleSuccess, handleError, mergedOptions, platformInfo]);

  const retryLocation = useCallback(() => {
    setShowHelp(false);
    requestLocation();
  }, [requestLocation]);

  const dismissHelp = useCallback(() => {
    setShowHelp(false);
  }, []);

  const openHelp = useCallback(() => {
    setShowHelp(true);
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    position,
    error,
    loading,
    showHelp,
    platformInfo,
    instructionKey,
    requestLocation,
    dismissHelp,
    openHelp,
    retryLocation,
    clearError,
    isSupported,
    hasPermission,
    attemptCount,
  };
}

export default useGeolocationWithHelp;
