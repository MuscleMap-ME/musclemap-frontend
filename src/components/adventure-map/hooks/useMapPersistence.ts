/**
 * useMapPersistence
 *
 * Hook for persisting and restoring adventure map state.
 * Position is automatically persisted via Zustand persist middleware.
 * This hook provides additional utilities for state management.
 */

import { useCallback } from 'react';
import { useAdventureMapStore } from '../../../store/adventureMapStore';
import { getStartingLocation } from '../data/mapLayout';
import type { Position, LocationId } from '../types';

interface MapPersistenceState {
  characterPosition: Position;
  visitedLocations: string[];
  lastVisitedLocation: LocationId | null;
  totalVisits: number;
}

interface UseMapPersistenceReturn {
  // State
  isHydrated: boolean;
  visitedCount: number;
  totalVisits: number;
  lastVisited: LocationId | null;

  // Actions
  resetProgress: () => void;
  restoreDefaultPosition: () => void;
  exportState: () => MapPersistenceState;
  importState: (state: Partial<MapPersistenceState>) => void;
}

export function useMapPersistence(): UseMapPersistenceReturn {
  // Store selectors
  const characterPosition = useAdventureMapStore((s) => s.characterPosition);
  const visitedLocations = useAdventureMapStore((s) => s.visitedLocations);
  const lastVisitedLocation = useAdventureMapStore((s) => s.lastVisitedLocation);
  const totalVisits = useAdventureMapStore((s) => s.totalVisits);

  const setCharacterPosition = useAdventureMapStore((s) => s.setCharacterPosition);

  // Check if store is hydrated (loaded from localStorage)
  // Zustand persist handles this automatically, but we can track it
  const isHydrated = visitedLocations.length > 0;

  // Reset all progress
  const resetProgress = useCallback(() => {
    // Clear persisted state by setting to initial values
    const startLocation = getStartingLocation();
    setCharacterPosition(startLocation.position);

    // Note: To fully reset, we'd need to clear localStorage
    // For now, just reset position
    localStorage.removeItem('musclemap-adventure-map');
    window.location.reload(); // Force reload to reset Zustand
  }, [setCharacterPosition]);

  // Restore to default starting position
  const restoreDefaultPosition = useCallback(() => {
    const startLocation = getStartingLocation();
    setCharacterPosition(startLocation.position);
  }, [setCharacterPosition]);

  // Export current state for backup/sync
  const exportState = useCallback((): MapPersistenceState => {
    return {
      characterPosition,
      visitedLocations,
      lastVisitedLocation,
      totalVisits,
    };
  }, [characterPosition, visitedLocations, lastVisitedLocation, totalVisits]);

  // Import state (useful for syncing from server)
  const importState = useCallback(
    (state: Partial<MapPersistenceState>) => {
      if (state.characterPosition) {
        setCharacterPosition(state.characterPosition);
      }
      // Note: Other state would need additional store actions to import
      // For now, position is the main thing we can import
    },
    [setCharacterPosition]
  );

  return {
    isHydrated,
    visitedCount: visitedLocations.length,
    totalVisits,
    lastVisited: lastVisitedLocation,
    resetProgress,
    restoreDefaultPosition,
    exportState,
    importState,
  };
}

export default useMapPersistence;
