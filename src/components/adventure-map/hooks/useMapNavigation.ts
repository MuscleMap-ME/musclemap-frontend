/**
 * useMapNavigation
 *
 * Hook for handling navigation from adventure map locations to app routes.
 */

import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAdventureMapStore } from '../../../store/adventureMapStore';
import { getLocation } from '../data/mapLayout';
import type { LocationId } from '../types';

interface UseMapNavigationOptions {
  onBeforeNavigate?: (locationId: LocationId, route: string) => boolean | void;
  onAfterNavigate?: (locationId: LocationId, route: string) => void;
  closeMapOnNavigate?: boolean;
}

interface UseMapNavigationReturn {
  navigateToLocation: (locationId: LocationId) => void;
  canNavigate: (locationId: LocationId) => boolean;
  getLocationRoute: (locationId: LocationId) => string | null;
}

export function useMapNavigation(
  options: UseMapNavigationOptions = {}
): UseMapNavigationReturn {
  const { onBeforeNavigate, onAfterNavigate, closeMapOnNavigate = true } = options;

  const navigate = useNavigate();
  const visitLocation = useAdventureMapStore((s) => s.visitLocation);
  const closeMap = useAdventureMapStore((s) => s.closeMap);

  // Check if navigation is allowed for a location
  const canNavigate = useCallback((locationId: LocationId): boolean => {
    const location = getLocation(locationId);
    if (!location) return false;

    // Check if locked
    if (location.isLocked) return false;

    // Admin-only check would go here (need to integrate with auth)
    // For now, allow all non-locked locations

    return true;
  }, []);

  // Get route for a location
  const getLocationRoute = useCallback((locationId: LocationId): string | null => {
    const location = getLocation(locationId);
    return location?.route || null;
  }, []);

  // Navigate to a location's route
  const navigateToLocation = useCallback(
    (locationId: LocationId) => {
      const location = getLocation(locationId);
      if (!location) {
        console.warn(`Location not found: ${locationId}`);
        return;
      }

      if (!canNavigate(locationId)) {
        console.warn(`Cannot navigate to locked location: ${locationId}`);
        return;
      }

      // Call before hook
      if (onBeforeNavigate) {
        const shouldProceed = onBeforeNavigate(locationId, location.route);
        if (shouldProceed === false) return;
      }

      // Mark as visited
      visitLocation(locationId);

      // Close map if configured
      if (closeMapOnNavigate) {
        closeMap();
      }

      // Navigate to route
      navigate(location.route);

      // Call after hook
      if (onAfterNavigate) {
        onAfterNavigate(locationId, location.route);
      }
    },
    [canNavigate, onBeforeNavigate, onAfterNavigate, closeMapOnNavigate, visitLocation, closeMap, navigate]
  );

  return {
    navigateToLocation,
    canNavigate,
    getLocationRoute,
  };
}

export default useMapNavigation;
