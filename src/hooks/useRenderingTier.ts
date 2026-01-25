/**
 * useRenderingTier - Detect and manage rendering capability
 *
 * Implements the 4-tier rendering system from the Knuth-inspired master plan:
 * - FULL: All effects, animations, glassmorphism
 * - REDUCED: Styling but no animations (prefers-reduced-motion, iOS+Brave, save-data)
 * - MINIMAL: Basic CSS, no effects (old browsers, low-end devices)
 * - TEXT_ONLY: Pure semantic HTML (screen readers, Lynx, no CSS)
 *
 * The Troika: Maximum Flexibility, Maximum User Choice, Maximum Performance
 */

import { useState, useEffect } from 'react';

export type RenderingTier = 'full' | 'reduced' | 'minimal' | 'text-only';

// Enum-like object for use in comparisons
export const RenderingTier = {
  FULL: 'full' as const,
  REDUCED: 'reduced' as const,
  MINIMAL: 'minimal' as const,
  TEXT_ONLY: 'text-only' as const,
} as const;

export interface RenderingCapabilities {
  tier: RenderingTier;
  supportsBlur: boolean;
  supportsAnimations: boolean;
  supports3D: boolean;
  supportsContainerQueries: boolean;
  supportsSubgrid: boolean;
  isRestrictiveEnvironment: boolean;
  isLowEndDevice: boolean;
  prefersReducedMotion: boolean;
  prefersReducedData: boolean;
  prefersHighContrast: boolean;
  isScreenReader: boolean;
  connectionType: 'fast' | 'slow' | 'offline' | 'unknown';
  deviceMemory: number | null;
  hardwareConcurrency: number | null;
}

interface UseRenderingTierOptions {
  /**
   * Force a specific tier (useful for testing or user override)
   */
  forceTier?: RenderingTier;
  /**
   * Callback when tier changes
   */
  onTierChange?: (tier: RenderingTier, capabilities: RenderingCapabilities) => void;
}

/**
 * Detect if running in a restrictive environment (iOS Lockdown + Brave Shields)
 */
function detectRestrictiveEnvironment(): boolean {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return true; // SSR - assume restrictive
  }

  try {
    const ua = navigator.userAgent || '';
    const isIOS = /iPad|iPhone|iPod/.test(ua);
    // @ts-expect-error - Brave-specific property
    const isBrave = Boolean(navigator.brave);

    // Check for common indicators of restrictive environments
    const hasLimitedStorage = (() => {
      try {
        const testKey = '__mm_test__';
        localStorage.setItem(testKey, '1');
        localStorage.removeItem(testKey);
        return false;
      } catch {
        return true;
      }
    })();

    // iOS + Brave combination is known to be problematic for animations
    if (isIOS && isBrave) {
      return true;
    }

    // Limited storage often indicates lockdown/private mode
    if (hasLimitedStorage) {
      return true;
    }

    return false;
  } catch {
    return true; // Error accessing navigator - assume restrictive
  }
}

/**
 * Detect CSS feature support
 */
function detectCSSSupport(): {
  supportsBlur: boolean;
  supportsContainerQueries: boolean;
  supportsSubgrid: boolean;
} {
  if (typeof window === 'undefined' || typeof CSS === 'undefined') {
    return {
      supportsBlur: false,
      supportsContainerQueries: false,
      supportsSubgrid: false,
    };
  }

  return {
    supportsBlur: CSS.supports('backdrop-filter', 'blur(1px)'),
    supportsContainerQueries: CSS.supports('container-type', 'inline-size'),
    supportsSubgrid: CSS.supports('grid-template-columns', 'subgrid'),
  };
}

/**
 * Detect device capabilities
 */
function detectDeviceCapabilities(): {
  isLowEndDevice: boolean;
  deviceMemory: number | null;
  hardwareConcurrency: number | null;
} {
  if (typeof navigator === 'undefined') {
    return {
      isLowEndDevice: false,
      deviceMemory: null,
      hardwareConcurrency: null,
    };
  }

  // @ts-expect-error - deviceMemory is not in standard Navigator type
  const deviceMemory = navigator.deviceMemory ?? null;
  const hardwareConcurrency = navigator.hardwareConcurrency ?? null;

  // Consider low-end if:
  // - Less than 4GB RAM (deviceMemory is in GB)
  // - Fewer than 4 CPU cores
  const isLowEndDevice =
    (deviceMemory !== null && deviceMemory < 4) ||
    (hardwareConcurrency !== null && hardwareConcurrency < 4);

  return {
    isLowEndDevice,
    deviceMemory,
    hardwareConcurrency,
  };
}

/**
 * Detect connection type
 */
function detectConnectionType(): 'fast' | 'slow' | 'offline' | 'unknown' {
  if (typeof navigator === 'undefined') {
    return 'unknown';
  }

  if (!navigator.onLine) {
    return 'offline';
  }

  // @ts-expect-error - connection is not in standard Navigator type
  const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;

  if (!connection) {
    return 'unknown';
  }

  // effectiveType can be: 'slow-2g', '2g', '3g', '4g'
  const effectiveType = connection.effectiveType;
  const saveData = connection.saveData;

  if (saveData) {
    return 'slow'; // User explicitly wants reduced data
  }

  if (effectiveType === 'slow-2g' || effectiveType === '2g') {
    return 'slow';
  }

  if (effectiveType === '3g' || effectiveType === '4g') {
    return 'fast';
  }

  return 'unknown';
}

/**
 * Detect if screen reader is likely being used
 */
function detectScreenReader(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }

  // Check for common screen reader indicators
  // Note: This is imperfect - screen readers try to be invisible
  const indicators = [
    // ARIA live regions being observed
    document.querySelector('[aria-live]') !== null,
    // User has enabled reduced motion (common with screen readers)
    window.matchMedia?.('(prefers-reduced-motion: reduce)').matches,
    // Check for common accessibility settings
    document.documentElement.hasAttribute('data-screen-reader'),
  ];

  // If multiple indicators are true, likely a screen reader
  return indicators.filter(Boolean).length >= 2;
}

/**
 * Determine rendering tier based on all capabilities
 */
function determineTier(capabilities: Omit<RenderingCapabilities, 'tier'>): RenderingTier {
  // TEXT_ONLY: Screen reader or explicitly disabled CSS
  if (capabilities.isScreenReader) {
    return 'text-only';
  }

  // MINIMAL: Very old browsers or low-end devices with slow connection
  if (
    !capabilities.supportsBlur &&
    !capabilities.supportsContainerQueries &&
    capabilities.isLowEndDevice
  ) {
    return 'minimal';
  }

  // REDUCED: Motion disabled, restrictive environment, save-data, or slow connection
  if (
    capabilities.prefersReducedMotion ||
    capabilities.prefersReducedData ||
    capabilities.isRestrictiveEnvironment ||
    capabilities.connectionType === 'slow'
  ) {
    return 'reduced';
  }

  // FULL: Modern browser with good connection and hardware
  return 'full';
}

/**
 * Apply rendering tier to DOM
 */
function applyTierToDOM(tier: RenderingTier, capabilities: RenderingCapabilities): void {
  if (typeof document === 'undefined') return;

  const root = document.documentElement;

  // Set tier attribute for CSS selectors
  root.setAttribute('data-rendering-tier', tier);

  // Set capability flags as CSS custom properties
  root.style.setProperty('--supports-blur', capabilities.supportsBlur ? '1' : '0');
  root.style.setProperty('--supports-animations', capabilities.supportsAnimations ? '1' : '0');
  root.style.setProperty('--supports-3d', capabilities.supports3D ? '1' : '0');
  root.style.setProperty('--rendering-tier', `'${tier}'`);
}

/**
 * Main hook for rendering tier detection and management
 */
export function useRenderingTier(options: UseRenderingTierOptions = {}): RenderingCapabilities {
  const { forceTier, onTierChange } = options;

  // Detect all capabilities
  const [capabilities, setCapabilities] = useState<RenderingCapabilities>(() => {
    const cssSupport = detectCSSSupport();
    const deviceCaps = detectDeviceCapabilities();
    const connectionType = detectConnectionType();
    const isRestrictive = detectRestrictiveEnvironment();
    const isScreenReader = detectScreenReader();

    // Media query values
    const prefersReducedMotion =
      typeof window !== 'undefined'
        ? window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false
        : false;
    const prefersReducedData =
      typeof window !== 'undefined'
        ? window.matchMedia?.('(prefers-reduced-data: reduce)').matches ?? false
        : false;
    const prefersHighContrast =
      typeof window !== 'undefined'
        ? window.matchMedia?.('(prefers-contrast: more)').matches ?? false
        : false;

    const caps: Omit<RenderingCapabilities, 'tier'> = {
      supportsBlur: cssSupport.supportsBlur && !isRestrictive,
      supportsAnimations: !prefersReducedMotion && !isRestrictive,
      supports3D: cssSupport.supportsBlur && !deviceCaps.isLowEndDevice,
      supportsContainerQueries: cssSupport.supportsContainerQueries,
      supportsSubgrid: cssSupport.supportsSubgrid,
      isRestrictiveEnvironment: isRestrictive,
      isLowEndDevice: deviceCaps.isLowEndDevice,
      prefersReducedMotion,
      prefersReducedData,
      prefersHighContrast,
      isScreenReader,
      connectionType,
      deviceMemory: deviceCaps.deviceMemory,
      hardwareConcurrency: deviceCaps.hardwareConcurrency,
    };

    const tier = forceTier ?? determineTier(caps);

    return { ...caps, tier };
  });

  // Listen for media query changes
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const mediaQueries = [
      window.matchMedia('(prefers-reduced-motion: reduce)'),
      window.matchMedia('(prefers-reduced-data: reduce)'),
      window.matchMedia('(prefers-contrast: more)'),
    ];

    const handleChange = () => {
      setCapabilities((prev) => {
        const newPrefersReducedMotion = mediaQueries[0].matches;
        const newPrefersReducedData = mediaQueries[1].matches;
        const newPrefersHighContrast = mediaQueries[2].matches;

        const newCaps: Omit<RenderingCapabilities, 'tier'> = {
          ...prev,
          prefersReducedMotion: newPrefersReducedMotion,
          prefersReducedData: newPrefersReducedData,
          prefersHighContrast: newPrefersHighContrast,
          supportsAnimations: !newPrefersReducedMotion && !prev.isRestrictiveEnvironment,
        };

        const tier = forceTier ?? determineTier(newCaps);
        return { ...newCaps, tier };
      });
    };

    mediaQueries.forEach((mq) => {
      mq.addEventListener('change', handleChange);
    });

    // Listen for connection changes
    // @ts-expect-error - connection is not in standard Navigator type
    const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    if (connection) {
      connection.addEventListener('change', () => {
        setCapabilities((prev) => {
          const newConnectionType = detectConnectionType();
          const newCaps: Omit<RenderingCapabilities, 'tier'> = {
            ...prev,
            connectionType: newConnectionType,
          };
          const tier = forceTier ?? determineTier(newCaps);
          return { ...newCaps, tier };
        });
      });
    }

    return () => {
      mediaQueries.forEach((mq) => {
        mq.removeEventListener('change', handleChange);
      });
    };
  }, [forceTier]);

  // Apply tier to DOM when it changes
  useEffect(() => {
    applyTierToDOM(capabilities.tier, capabilities);
    onTierChange?.(capabilities.tier, capabilities);
  }, [capabilities, onTierChange]);

  return capabilities;
}

/**
 * Simplified hook that just returns the tier
 */
export function useCurrentTier(forceTier?: RenderingTier): RenderingTier {
  const { tier } = useRenderingTier({ forceTier });
  return tier;
}

/**
 * Hook to check if animations should be used
 */
export function useShouldAnimate(): boolean {
  const { supportsAnimations, tier } = useRenderingTier();
  return supportsAnimations && tier === 'full';
}

/**
 * Hook to check if glassmorphism effects should be used
 */
export function useShouldUseGlass(): boolean {
  const { supportsBlur, tier } = useRenderingTier();
  return supportsBlur && (tier === 'full' || tier === 'reduced');
}

/**
 * Hook to check if 3D features should be used
 */
export function useShouldUse3D(): boolean {
  const { supports3D, tier, connectionType } = useRenderingTier();
  return supports3D && tier === 'full' && connectionType !== 'slow';
}

/**
 * Get tier as a static value (for SSR or one-time detection)
 */
export function getTierStatic(): RenderingTier {
  if (typeof window === 'undefined') {
    return 'reduced'; // SSR default
  }

  const cssSupport = detectCSSSupport();
  const deviceCaps = detectDeviceCapabilities();
  const connectionType = detectConnectionType();
  const isRestrictive = detectRestrictiveEnvironment();
  const isScreenReader = detectScreenReader();
  const prefersReducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
  const prefersReducedData = window.matchMedia?.('(prefers-reduced-data: reduce)').matches ?? false;
  const prefersHighContrast = window.matchMedia?.('(prefers-contrast: more)').matches ?? false;

  const caps: Omit<RenderingCapabilities, 'tier'> = {
    supportsBlur: cssSupport.supportsBlur && !isRestrictive,
    supportsAnimations: !prefersReducedMotion && !isRestrictive,
    supports3D: cssSupport.supportsBlur && !deviceCaps.isLowEndDevice,
    supportsContainerQueries: cssSupport.supportsContainerQueries,
    supportsSubgrid: cssSupport.supportsSubgrid,
    isRestrictiveEnvironment: isRestrictive,
    isLowEndDevice: deviceCaps.isLowEndDevice,
    prefersReducedMotion,
    prefersReducedData,
    prefersHighContrast,
    isScreenReader,
    connectionType,
    deviceMemory: deviceCaps.deviceMemory,
    hardwareConcurrency: deviceCaps.hardwareConcurrency,
  };

  return determineTier(caps);
}

export default useRenderingTier;
