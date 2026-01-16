/**
 * useDeviceCapabilities - Adaptive quality settings based on device/network
 *
 * Provides configuration for:
 * - 3D model quality (full, static, placeholder)
 * - Animation enable/disable
 * - Image quality levels
 * - List page sizes
 * - Prefetch behavior
 *
 * Uses the existing useAdaptiveLoading hook and adds app-specific settings.
 */

import { useMemo, useEffect, useState } from 'react';
import { useAdaptiveLoading } from './useAdaptiveLoading';

/**
 * Quality presets for different device tiers
 */
const QUALITY_PRESETS = {
  'high-end': {
    modelQuality: 'full',
    enableAnimations: true,
    enableParticles: true,
    imageQuality: 'high',
    pageSize: 25,
    enablePrefetch: true,
    enableBackgroundSync: true,
    maxCachedItems: 200,
    transitionDuration: 300,
    enableBlur: true,
    enable3D: true,
  },
  'mid-tier': {
    modelQuality: 'reduced',
    enableAnimations: true,
    enableParticles: false,
    imageQuality: 'medium',
    pageSize: 20,
    enablePrefetch: true,
    enableBackgroundSync: true,
    maxCachedItems: 100,
    transitionDuration: 200,
    enableBlur: true,
    enable3D: true,
  },
  'low-end': {
    modelQuality: 'static',
    enableAnimations: false,
    enableParticles: false,
    imageQuality: 'low',
    pageSize: 10,
    enablePrefetch: false,
    enableBackgroundSync: false,
    maxCachedItems: 50,
    transitionDuration: 0,
    enableBlur: false,
    enable3D: false,
  },
};

/**
 * Network-based quality adjustments
 */
const NETWORK_ADJUSTMENTS = {
  '4g': {
    imageQuality: 'high',
    enablePrefetch: true,
    pageSize: 0, // No adjustment
  },
  '3g': {
    imageQuality: 'medium',
    enablePrefetch: false,
    pageSize: -5, // Reduce by 5
  },
  '2g': {
    imageQuality: 'low',
    enablePrefetch: false,
    pageSize: -10, // Reduce by 10
  },
  'slow-2g': {
    imageQuality: 'minimal',
    enablePrefetch: false,
    pageSize: -15, // Reduce by 15
  },
  offline: {
    imageQuality: 'cached',
    enablePrefetch: false,
    pageSize: -10,
  },
};

/**
 * useDeviceCapabilities - Returns adaptive quality settings
 *
 * @returns {Object} Quality settings object
 */
export function useDeviceCapabilities() {
  const { deviceTier, connectionTier, shouldReduceData, isOnline } = useAdaptiveLoading();
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  // Check for reduced motion preference
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);

    const handler = (e) => setPrefersReducedMotion(e.matches);
    mediaQuery.addEventListener('change', handler);

    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

  // Compute final settings
  const settings = useMemo(() => {
    // Start with device tier preset
    const baseSettings = { ...QUALITY_PRESETS[deviceTier] || QUALITY_PRESETS['mid-tier'] };

    // Apply network adjustments
    const networkAdjustment = NETWORK_ADJUSTMENTS[connectionTier] || {};
    if (networkAdjustment.imageQuality) {
      // Only downgrade, never upgrade
      const qualityOrder = ['high', 'medium', 'low', 'minimal', 'cached'];
      const baseIndex = qualityOrder.indexOf(baseSettings.imageQuality);
      const adjustedIndex = qualityOrder.indexOf(networkAdjustment.imageQuality);
      if (adjustedIndex > baseIndex) {
        baseSettings.imageQuality = networkAdjustment.imageQuality;
      }
    }

    if (networkAdjustment.pageSize) {
      baseSettings.pageSize = Math.max(5, baseSettings.pageSize + networkAdjustment.pageSize);
    }

    if (networkAdjustment.enablePrefetch === false) {
      baseSettings.enablePrefetch = false;
    }

    // Apply data saver mode
    if (shouldReduceData) {
      baseSettings.imageQuality = 'low';
      baseSettings.enablePrefetch = false;
      baseSettings.enable3D = false;
      baseSettings.enableParticles = false;
    }

    // Apply reduced motion preference
    if (prefersReducedMotion) {
      baseSettings.enableAnimations = false;
      baseSettings.transitionDuration = 0;
      baseSettings.enableParticles = false;
    }

    // Offline adjustments
    if (!isOnline) {
      baseSettings.enablePrefetch = false;
      baseSettings.enableBackgroundSync = false;
      baseSettings.imageQuality = 'cached';
    }

    return baseSettings;
  }, [deviceTier, connectionTier, shouldReduceData, prefersReducedMotion, isOnline]);

  return {
    ...settings,
    // Additional computed values
    deviceTier,
    connectionTier,
    isOnline,
    prefersReducedMotion,
    shouldReduceData,

    // Helper methods
    getImageSize: (baseSize) => {
      const multipliers = {
        high: 1,
        medium: 0.75,
        low: 0.5,
        minimal: 0.25,
        cached: 0.5,
      };
      return Math.round(baseSize * (multipliers[settings.imageQuality] || 1));
    },

    // Should show a feature based on quality?
    shouldShow: (feature) => {
      switch (feature) {
        case '3d':
        case 'model':
          return settings.enable3D;
        case 'particles':
          return settings.enableParticles;
        case 'animations':
          return settings.enableAnimations;
        case 'blur':
          return settings.enableBlur;
        case 'prefetch':
          return settings.enablePrefetch;
        default:
          return true;
      }
    },
  };
}

/**
 * useVisualizationQuality - Specific settings for 3D visualizations
 */
export function useVisualizationQuality() {
  const { modelQuality, enable3D, enableAnimations, deviceTier: _deviceTier } = useDeviceCapabilities();

  return useMemo(() => {
    if (!enable3D) {
      return {
        mode: 'placeholder',
        polyCount: 0,
        textureSize: 0,
        enableShadows: false,
        enableReflections: false,
        enablePostProcessing: false,
        frameRate: 0,
      };
    }

    switch (modelQuality) {
      case 'full':
        return {
          mode: 'full',
          polyCount: 50000,
          textureSize: 2048,
          enableShadows: true,
          enableReflections: true,
          enablePostProcessing: true,
          frameRate: 60,
        };
      case 'reduced':
        return {
          mode: 'reduced',
          polyCount: 25000,
          textureSize: 1024,
          enableShadows: true,
          enableReflections: false,
          enablePostProcessing: false,
          frameRate: 30,
        };
      case 'static':
      default:
        return {
          mode: 'static',
          polyCount: 10000,
          textureSize: 512,
          enableShadows: false,
          enableReflections: false,
          enablePostProcessing: false,
          frameRate: enableAnimations ? 15 : 0,
        };
    }
  }, [modelQuality, enable3D, enableAnimations]);
}

/**
 * useAnimationConfig - Settings for framer-motion and CSS animations
 */
export function useAnimationConfig() {
  const { enableAnimations, transitionDuration, prefersReducedMotion } = useDeviceCapabilities();

  return useMemo(() => {
    if (!enableAnimations || prefersReducedMotion) {
      return {
        enabled: false,
        duration: 0,
        spring: { type: 'tween', duration: 0 },
        variants: {
          initial: {},
          animate: {},
          exit: {},
        },
      };
    }

    const durationSec = transitionDuration / 1000;

    return {
      enabled: true,
      duration: transitionDuration,
      spring: {
        type: 'spring',
        stiffness: 300,
        damping: 30,
      },
      tween: {
        type: 'tween',
        duration: durationSec,
        ease: 'easeInOut',
      },
      variants: {
        initial: { opacity: 0, y: 20 },
        animate: { opacity: 1, y: 0 },
        exit: { opacity: 0, y: -20 },
      },
    };
  }, [enableAnimations, transitionDuration, prefersReducedMotion]);
}

export default useDeviceCapabilities;
