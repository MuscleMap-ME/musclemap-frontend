/**
 * Adventure Map Store (Zustand)
 *
 * Manages state for the RPG-style adventure map navigation system.
 * Handles character position, visited locations, and map view state.
 *
 * @example
 * // Only re-renders when character position changes
 * const position = useAdventureMapStore((s) => s.characterPosition);
 *
 * // Use shorthand hooks for common operations
 * const { position, moveTo, teleportTo } = useCharacterPosition();
 */

import { create } from 'zustand';
import { subscribeWithSelector, persist, createJSONStorage } from 'zustand/middleware';
import type { Position, LocationId, RegionId, CharacterState } from '../components/adventure-map/types';
import { resilientStorage } from '../lib/zustand-storage';
import { getStartingLocation, getLocation, getClosestLocation } from '../components/adventure-map/data/mapLayout';
import { getRegionAtPosition } from '../components/adventure-map/data/regions';
import { findPathPositions } from '../components/adventure-map/data/pathConnections';

// ============================================
// STORE INTERFACE
// ============================================

interface AdventureMapState {
  // Character position and movement
  characterPosition: Position;
  characterState: CharacterState;
  movementPath: Position[];
  currentPathIndex: number;
  currentRegion: RegionId;
  targetLocation: LocationId | null;

  // Map view
  mapZoom: number;
  mapPan: Position;
  selectedLocation: LocationId | null;
  hoveredLocation: LocationId | null;

  // Progression tracking
  visitedLocations: string[];
  lastVisitedLocation: LocationId | null;
  totalVisits: number;

  // UI state
  isMapOpen: boolean;
  isFullscreen: boolean;
  showMinimap: boolean;
  hudExpanded: boolean;

  // Actions - Character
  setCharacterPosition: (position: Position) => void;
  setCharacterState: (state: CharacterState) => void;
  startMovement: (targetLocationId: LocationId) => void;
  advanceMovement: () => boolean; // Returns true if movement complete
  cancelMovement: () => void;
  teleportTo: (locationId: LocationId) => void;

  // Actions - Map View
  setMapZoom: (zoom: number) => void;
  zoomIn: () => void;
  zoomOut: () => void;
  setMapPan: (pan: Position) => void;
  panBy: (delta: Position) => void;
  centerOnCharacter: () => void;
  resetView: () => void;

  // Actions - Selection
  setSelectedLocation: (locationId: LocationId | null) => void;
  setHoveredLocation: (locationId: LocationId | null) => void;

  // Actions - Progression
  visitLocation: (locationId: LocationId) => void;
  hasVisited: (locationId: LocationId) => boolean;

  // Actions - UI
  openMap: () => void;
  closeMap: () => void;
  toggleFullscreen: () => void;
  toggleMinimap: () => void;
  toggleHudExpanded: () => void;
}

// ============================================
// INITIAL VALUES
// ============================================

const startLocation = getStartingLocation();

const initialState = {
  // Character
  characterPosition: startLocation.position,
  characterState: 'idle' as CharacterState,
  movementPath: [],
  currentPathIndex: 0,
  currentRegion: 'central-hub' as RegionId,
  targetLocation: null,

  // Map view
  mapZoom: 1,
  mapPan: { x: 0, y: 0 },
  selectedLocation: null,
  hoveredLocation: null,

  // Progression
  visitedLocations: ['dashboard'],
  lastVisitedLocation: 'dashboard' as LocationId,
  totalVisits: 1,

  // UI
  isMapOpen: false,
  isFullscreen: false,
  showMinimap: true,
  hudExpanded: false,
};

// ============================================
// STORE CREATION
// ============================================

export const useAdventureMapStore = create<AdventureMapState>()(
  subscribeWithSelector(
    persist(
      (set, get) => ({
        ...initialState,

        // ============================================
        // CHARACTER ACTIONS
        // ============================================

        setCharacterPosition: (position) => {
          const region = getRegionAtPosition(position);
          set({
            characterPosition: position,
            currentRegion: region?.id || get().currentRegion,
          });
        },

        setCharacterState: (state) => set({ characterState: state }),

        startMovement: (targetLocationId) => {
          const { characterPosition, visitedLocations: _visitedLocations } = get();

          // Find closest location to current position
          const currentLocation = getClosestLocation(characterPosition);
          if (!currentLocation) return;

          // Get target location
          const targetLocation = getLocation(targetLocationId);
          if (!targetLocation) return;

          // Calculate path
          const path = findPathPositions(currentLocation.id, targetLocationId, 5);

          if (path.length > 0) {
            set({
              movementPath: path,
              currentPathIndex: 0,
              characterState: 'walking',
              targetLocation: targetLocationId,
            });
          }
        },

        advanceMovement: () => {
          const { movementPath, currentPathIndex, targetLocation } = get();

          if (currentPathIndex >= movementPath.length - 1) {
            // Movement complete
            const finalPosition = movementPath[movementPath.length - 1];
            const region = getRegionAtPosition(finalPosition);

            set({
              characterPosition: finalPosition,
              characterState: 'idle',
              movementPath: [],
              currentPathIndex: 0,
              currentRegion: region?.id || get().currentRegion,
            });

            // Mark location as visited
            if (targetLocation) {
              get().visitLocation(targetLocation);
            }

            return true;
          }

          // Move to next waypoint
          const nextIndex = currentPathIndex + 1;
          const nextPosition = movementPath[nextIndex];
          const region = getRegionAtPosition(nextPosition);

          set({
            currentPathIndex: nextIndex,
            characterPosition: nextPosition,
            currentRegion: region?.id || get().currentRegion,
          });

          return false;
        },

        cancelMovement: () => {
          set({
            characterState: 'idle',
            movementPath: [],
            currentPathIndex: 0,
            targetLocation: null,
          });
        },

        teleportTo: (locationId) => {
          const location = getLocation(locationId);
          if (!location) return;

          const region = getRegionAtPosition(location.position);

          set({
            characterState: 'teleporting',
            targetLocation: locationId,
          });

          // After teleport animation, update position
          setTimeout(() => {
            set({
              characterPosition: location.position,
              characterState: 'idle',
              currentRegion: region?.id || 'central-hub',
              movementPath: [],
              currentPathIndex: 0,
              targetLocation: null,
            });
            get().visitLocation(locationId);
          }, 500);
        },

        // ============================================
        // MAP VIEW ACTIONS
        // ============================================

        setMapZoom: (zoom) => set({ mapZoom: Math.max(0.5, Math.min(2, zoom)) }),

        zoomIn: () => set((s) => ({ mapZoom: Math.min(2, s.mapZoom + 0.1) })),

        zoomOut: () => set((s) => ({ mapZoom: Math.max(0.5, s.mapZoom - 0.1) })),

        setMapPan: (pan) => set({ mapPan: pan }),

        panBy: (delta) =>
          set((s) => ({
            mapPan: {
              x: s.mapPan.x + delta.x,
              y: s.mapPan.y + delta.y,
            },
          })),

        centerOnCharacter: () => {
          const { characterPosition } = get();
          set({
            mapPan: {
              x: -characterPosition.x + 500, // Center in 1000px viewport
              y: -characterPosition.y + 400, // Center in 800px viewport
            },
          });
        },

        resetView: () =>
          set({
            mapZoom: 1,
            mapPan: { x: 0, y: 0 },
          }),

        // ============================================
        // SELECTION ACTIONS
        // ============================================

        setSelectedLocation: (locationId) => set({ selectedLocation: locationId }),

        setHoveredLocation: (locationId) => set({ hoveredLocation: locationId }),

        // ============================================
        // PROGRESSION ACTIONS
        // ============================================

        visitLocation: (locationId) => {
          const { visitedLocations, totalVisits } = get();

          if (!visitedLocations.includes(locationId)) {
            set({
              visitedLocations: [...visitedLocations, locationId],
              lastVisitedLocation: locationId,
              totalVisits: totalVisits + 1,
            });
          } else {
            set({
              lastVisitedLocation: locationId,
              totalVisits: totalVisits + 1,
            });
          }
        },

        hasVisited: (locationId) => get().visitedLocations.includes(locationId),

        // ============================================
        // UI ACTIONS
        // ============================================

        openMap: () => set({ isMapOpen: true }),

        closeMap: () => set({ isMapOpen: false, isFullscreen: false }),

        toggleFullscreen: () => set((s) => ({ isFullscreen: !s.isFullscreen })),

        toggleMinimap: () => set((s) => ({ showMinimap: !s.showMinimap })),

        toggleHudExpanded: () => set((s) => ({ hudExpanded: !s.hudExpanded })),
      }),
      {
        name: 'musclemap-adventure-map',
        storage: createJSONStorage(() => resilientStorage),
        partialize: (state) => ({
          // Only persist essential state
          characterPosition: state.characterPosition,
          currentRegion: state.currentRegion,
          visitedLocations: state.visitedLocations,
          lastVisitedLocation: state.lastVisitedLocation,
          totalVisits: state.totalVisits,
          showMinimap: state.showMinimap,
        }),
      }
    )
  )
);

// ============================================
// SHORTHAND HOOKS
// ============================================

/**
 * Hook for character position and movement
 */
export const useCharacterPosition = () => {
  const position = useAdventureMapStore((s) => s.characterPosition);
  const state = useAdventureMapStore((s) => s.characterState);
  const region = useAdventureMapStore((s) => s.currentRegion);
  const startMovement = useAdventureMapStore((s) => s.startMovement);
  const teleportTo = useAdventureMapStore((s) => s.teleportTo);
  const cancelMovement = useAdventureMapStore((s) => s.cancelMovement);

  return {
    position,
    state,
    region,
    moveTo: startMovement,
    teleportTo,
    cancel: cancelMovement,
    isMoving: state === 'walking',
    isTeleporting: state === 'teleporting',
  };
};

/**
 * Hook for map view controls
 */
export const useMapView = () => {
  const zoom = useAdventureMapStore((s) => s.mapZoom);
  const pan = useAdventureMapStore((s) => s.mapPan);
  const setZoom = useAdventureMapStore((s) => s.setMapZoom);
  const zoomIn = useAdventureMapStore((s) => s.zoomIn);
  const zoomOut = useAdventureMapStore((s) => s.zoomOut);
  const setPan = useAdventureMapStore((s) => s.setMapPan);
  const panBy = useAdventureMapStore((s) => s.panBy);
  const center = useAdventureMapStore((s) => s.centerOnCharacter);
  const reset = useAdventureMapStore((s) => s.resetView);

  return { zoom, pan, setZoom, zoomIn, zoomOut, setPan, panBy, center, reset };
};

/**
 * Hook for location selection
 */
export const useLocationSelection = () => {
  const selected = useAdventureMapStore((s) => s.selectedLocation);
  const hovered = useAdventureMapStore((s) => s.hoveredLocation);
  const setSelected = useAdventureMapStore((s) => s.setSelectedLocation);
  const setHovered = useAdventureMapStore((s) => s.setHoveredLocation);

  return { selected, hovered, setSelected, setHovered };
};

/**
 * Hook for progression tracking
 */
export const useMapProgress = () => {
  const visited = useAdventureMapStore((s) => s.visitedLocations);
  const lastVisited = useAdventureMapStore((s) => s.lastVisitedLocation);
  const totalVisits = useAdventureMapStore((s) => s.totalVisits);
  const hasVisited = useAdventureMapStore((s) => s.hasVisited);

  return {
    visited,
    lastVisited,
    totalVisits,
    hasVisited,
    visitedCount: visited.length,
  };
};

/**
 * Hook for map UI state
 */
export const useMapUI = () => {
  const isOpen = useAdventureMapStore((s) => s.isMapOpen);
  const isFullscreen = useAdventureMapStore((s) => s.isFullscreen);
  const showMinimap = useAdventureMapStore((s) => s.showMinimap);
  const hudExpanded = useAdventureMapStore((s) => s.hudExpanded);
  const openMap = useAdventureMapStore((s) => s.openMap);
  const closeMap = useAdventureMapStore((s) => s.closeMap);
  const toggleFullscreen = useAdventureMapStore((s) => s.toggleFullscreen);
  const toggleMinimap = useAdventureMapStore((s) => s.toggleMinimap);
  const toggleHud = useAdventureMapStore((s) => s.toggleHudExpanded);

  return {
    isOpen,
    isFullscreen,
    showMinimap,
    hudExpanded,
    open: openMap,
    close: closeMap,
    toggleFullscreen,
    toggleMinimap,
    toggleHud,
  };
};

export default useAdventureMapStore;
