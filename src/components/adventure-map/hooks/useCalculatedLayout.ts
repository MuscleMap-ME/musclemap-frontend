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
 * Hook to get calculated positions for all map locations.
 * Uses D3 force simulation with collision detection on desktop.
 * Uses simple grid layout on mobile for better performance.
 * Results are memoized and cached globally.
 */
export function useCalculatedLayout(): Map<string, Position> {
  const locations = useMemo(() => Object.values(LOCATIONS), []);
  const cacheKeyRef = useRef<string>('');
  const [d3Loaded, setD3Loaded] = useState(false);

  // Preload D3 on mount (only on desktop, non-blocking)
  useEffect(() => {
    // Detect mobile - don't preload D3 on mobile
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) ||
                     (window.innerWidth < 768);

    if (!isMobile && !d3PreloadStarted) {
      d3PreloadStarted = true;
      preloadD3().then((loaded) => {
        if (loaded) {
          setD3Loaded(true);
        }
      });
    }
  }, []);

  const positions = useMemo(() => {
    // Include d3Loaded in cache key so we recalculate when D3 becomes available
    const cacheKey = `${getLayoutCacheKey(locations, REGIONS)}_d3:${d3Loaded}`;

    // Return cached if available
    if (layoutCache.has(cacheKey)) {
      return layoutCache.get(cacheKey)!;
    }

    // Calculate new layout
    // On mobile: uses grid layout
    // On desktop: uses D3 if loaded, otherwise grid
    let calculatedPositions: Map<string, Position>;

    try {
      calculatedPositions = calculateLayout(locations, REGIONS, PATH_CONNECTIONS);
    } catch (error) {
      // Fallback to grid layout if D3 fails
      console.warn('[useCalculatedLayout] Layout calculation failed, using grid fallback:', error);
      calculatedPositions = calculateGridLayout(locations, REGIONS);
    }

    layoutCache.set(cacheKey, calculatedPositions);
    cacheKeyRef.current = cacheKey;

    return calculatedPositions;
  }, [locations, d3Loaded]); // Re-calculate when D3 loads

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
    return Object.values(LOCATIONS).map((loc) => ({
      ...loc,
      position: layout.get(loc.id) ?? loc.position,
    }));
  }, [layout]);
}

/**
 * Clear the layout cache (useful for testing or when regions change)
 */
export function clearLayoutCache(): void {
  layoutCache.clear();
}
