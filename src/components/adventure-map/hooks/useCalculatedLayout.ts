/**
 * useCalculatedLayout Hook
 *
 * Memoized hook that calculates and caches optimal map node positions
 * using D3 force simulation with collision detection.
 */

import { useMemo, useRef, useEffect } from 'react';
import { calculateLayout, getLayoutCacheKey, calculateGridLayout } from '../data/layoutCalculator';
import { REGIONS } from '../data/regions';
import { LOCATIONS, PATH_CONNECTIONS, setCalculatedPositions } from '../data/mapLayout';
import type { Position, MapLocation } from '../types';

// Global cache to persist across component remounts
const layoutCache = new Map<string, Map<string, Position>>();

/**
 * Hook to get calculated positions for all map locations.
 * Uses D3 force simulation with collision detection.
 * Results are memoized and cached globally.
 */
export function useCalculatedLayout(): Map<string, Position> {
  const locations = useMemo(() => Object.values(LOCATIONS), []);
  const cacheKeyRef = useRef<string>('');

  const positions = useMemo(() => {
    const cacheKey = getLayoutCacheKey(locations, REGIONS);

    // Return cached if available
    if (layoutCache.has(cacheKey)) {
      return layoutCache.get(cacheKey)!;
    }

    // Calculate new layout using D3 force simulation
    let calculatedPositions: Map<string, Position>;

    try {
      calculatedPositions = calculateLayout(locations, REGIONS, PATH_CONNECTIONS);
    } catch (error) {
      // Fallback to grid layout if D3 fails
      console.warn('D3 layout failed, using grid fallback:', error);
      calculatedPositions = calculateGridLayout(locations, REGIONS);
    }

    layoutCache.set(cacheKey, calculatedPositions);
    cacheKeyRef.current = cacheKey;

    return calculatedPositions;
  }, [locations]);

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
