/**
 * useCalculatedLayout Hook
 *
 * Memoized hook that calculates and caches optimal map node positions
 * using D3 force simulation with collision detection.
 *
 * On mobile devices, uses a simpler grid layout for better performance
 * and to avoid iOS Safari module loading issues.
 */

import { useMemo, useRef, useEffect, useState } from 'react';
import { calculateLayout, getLayoutCacheKey, calculateGridLayout, preloadD3 } from '../data/layoutCalculator';
import { REGIONS } from '../data/regions';
import { LOCATIONS, PATH_CONNECTIONS, setCalculatedPositions } from '../data/mapLayout';
import type { Position, MapLocation } from '../types';

// Global cache to persist across component remounts
const layoutCache = new Map<string, Map<string, Position>>();

// Track if D3 has been preloaded
let d3PreloadStarted = false;

/**
 * Robust mobile detection that handles edge cases on iOS Safari
 */
function isMobileDevice(): boolean {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return true; // Default to mobile (safer/simpler layout) for SSR
  }

  // Check user agent for mobile devices
  const userAgent = navigator.userAgent || '';
  const isMobileUA = /iPhone|iPad|iPod|Android|webOS|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);

  // Check for touch capability (most mobile devices)
  const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

  // Check viewport width (common mobile breakpoint)
  const isNarrowViewport = window.innerWidth < 768;

  // Check for iOS specifically (sometimes user agent is spoofed)
  const isIOS = /iPad|iPhone|iPod/.test(userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1); // iPad with desktop UA

  // Be conservative: if any strong mobile indicator, use simple layout
  return isMobileUA || isIOS || (hasTouch && isNarrowViewport);
}

/**
 * Hook to get calculated positions for all map locations.
 * Uses D3 force simulation with collision detection on desktop.
 * Uses simple grid layout on mobile for better performance.
 * Results are memoized and cached globally.
 */
export function useCalculatedLayout(): Map<string, Position> {
  const [isMobile, setIsMobile] = useState(() => {
    // Initial check - default to mobile for safety on first render
    if (typeof window === 'undefined') return true;
    return isMobileDevice();
  });

  const locations = useMemo(() => {
    try {
      const locs = Object.values(LOCATIONS);
      if (!locs || locs.length === 0) {
        console.error('[useCalculatedLayout] No locations found!');
        return [];
      }
      return locs;
    } catch (error) {
      console.error('[useCalculatedLayout] Error getting locations:', error);
      return [];
    }
  }, []);
  const cacheKeyRef = useRef<string>('');
  const [d3Loaded, setD3Loaded] = useState(false);

  // Re-check mobile status on mount and window resize
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(isMobileDevice());
    };

    // Check on mount
    checkMobile();

    // Listen for resize events (orientation change, etc.)
    window.addEventListener('resize', checkMobile);
    window.addEventListener('orientationchange', checkMobile);

    return () => {
      window.removeEventListener('resize', checkMobile);
      window.removeEventListener('orientationchange', checkMobile);
    };
  }, []);

  // Preload D3 on mount (only on desktop, non-blocking)
  useEffect(() => {
    try {
      if (!isMobile && !d3PreloadStarted) {
        d3PreloadStarted = true;
        preloadD3().then((loaded) => {
          if (loaded) {
            setD3Loaded(true);
          }
        }).catch((error) => {
          console.warn('[useCalculatedLayout] D3 preload failed:', error);
        });
      }
    } catch (error) {
      console.warn('[useCalculatedLayout] D3 preload setup failed:', error);
    }
  }, [isMobile]);

  const positions = useMemo(() => {
    // Handle empty locations gracefully
    if (!locations || locations.length === 0) {
      console.warn('[useCalculatedLayout] No locations to calculate positions for');
      return new Map<string, Position>();
    }

    // Include d3Loaded and isMobile in cache key
    const cacheKey = `${getLayoutCacheKey(locations, REGIONS)}_d3:${d3Loaded}_mobile:${isMobile}`;

    // Return cached if available
    if (layoutCache.has(cacheKey)) {
      const cached = layoutCache.get(cacheKey)!;
      // Validate cache has positions
      if (cached.size > 0) {
        return cached;
      }
    }

    // Calculate new layout
    // On mobile: always use grid layout for reliability
    // On desktop: uses D3 if loaded, otherwise grid
    let calculatedPositions: Map<string, Position>;

    try {
      if (isMobile) {
        // On mobile, always use grid layout - more reliable
        console.log('[useCalculatedLayout] Using grid layout for mobile device');
        calculatedPositions = calculateGridLayout(locations, REGIONS);
      } else {
        calculatedPositions = calculateLayout(locations, REGIONS, PATH_CONNECTIONS);
      }
    } catch (error) {
      // Fallback to grid layout if D3 fails
      console.warn('[useCalculatedLayout] Layout calculation failed, using grid fallback:', error);
      calculatedPositions = calculateGridLayout(locations, REGIONS);
    }

    // Validate we got positions
    if (calculatedPositions.size === 0) {
      console.error('[useCalculatedLayout] No positions calculated! Using fallback positions.');
      // Create fallback positions from original location data
      calculatedPositions = new Map();
      for (const loc of locations) {
        calculatedPositions.set(loc.id, loc.position);
      }
    }

    layoutCache.set(cacheKey, calculatedPositions);
    cacheKeyRef.current = cacheKey;

    return calculatedPositions;
  }, [locations, d3Loaded, isMobile]); // Re-calculate when D3 loads or device type changes

  // Update the global position override so all helper functions use calculated positions
  useEffect(() => {
    setCalculatedPositions(positions);
  }, [positions]);

  return positions;
}

/**
 * Get position for a specific location, with calculated position override.
 */
export function useLocationPosition(locationId: string): Position {
  const layout = useCalculatedLayout();
  const location = LOCATIONS[locationId as keyof typeof LOCATIONS];

  return layout.get(locationId) ?? location?.position ?? { x: 0, y: 0 };
}

/**
 * Get all locations with their calculated positions applied.
 */
export function useLocationsWithCalculatedPositions(): MapLocation[] {
  const layout = useCalculatedLayout();

  return useMemo(() => {
    try {
      return Object.values(LOCATIONS).map((loc) => ({
        ...loc,
        position: layout.get(loc.id) ?? loc.position,
      }));
    } catch (error) {
      console.error('[useLocationsWithCalculatedPositions] Error:', error);
      // Return locations with their original positions as fallback
      return Object.values(LOCATIONS);
    }
  }, [layout]);
}

/**
 * Clear the layout cache (useful for testing or when regions change)
 */
export function clearLayoutCache(): void {
  layoutCache.clear();
}
