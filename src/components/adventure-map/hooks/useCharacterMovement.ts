/**
 * useCharacterMovement
 *
 * Hook for controlling character movement on the adventure map.
 * Supports keyboard (Arrow/WASD), mouse click-to-move, and touch drag.
 */

import { useCallback, useEffect, useRef } from 'react';
import { useAdventureMapStore } from '../../../store/adventureMapStore';
import { getClosestLocation, getAdjacentLocations, LOCATIONS } from '../data/mapLayout';
import type { Position, LocationId } from '../types';

interface UseCharacterMovementOptions {
  enabled?: boolean;
  movementSpeed?: number; // milliseconds per waypoint
  onLocationReached?: (locationId: LocationId, route: string) => void;
  reducedMotion?: boolean;
}

interface UseCharacterMovementReturn {
  // State
  position: Position;
  isMoving: boolean;
  isTeleporting: boolean;
  currentRegion: string;

  // Actions
  moveToLocation: (locationId: LocationId) => void;
  teleportToLocation: (locationId: LocationId) => void;
  moveInDirection: (direction: 'north' | 'south' | 'east' | 'west') => void;
  cancelMovement: () => void;

  // Event handlers (attach to SVG container)
  handleKeyDown: (e: KeyboardEvent) => void;
  handleMapClick: (position: Position) => void;
}

// Direction vectors for isometric movement
const DIRECTION_VECTORS: Record<string, Position> = {
  north: { x: 0, y: -1 },
  south: { x: 0, y: 1 },
  east: { x: 1, y: 0 },
  west: { x: -1, y: 0 },
};

// Key to direction mapping
const KEY_DIRECTIONS: Record<string, string> = {
  ArrowUp: 'north',
  ArrowDown: 'south',
  ArrowLeft: 'west',
  ArrowRight: 'east',
  w: 'north',
  W: 'north',
  s: 'south',
  S: 'south',
  a: 'west',
  A: 'west',
  d: 'east',
  D: 'east',
};

export function useCharacterMovement(
  options: UseCharacterMovementOptions = {}
): UseCharacterMovementReturn {
  const {
    enabled = true,
    movementSpeed = 50,
    onLocationReached,
    reducedMotion = false,
  } = options;

  // Store selectors
  const position = useAdventureMapStore((s) => s.characterPosition);
  const characterState = useAdventureMapStore((s) => s.characterState);
  const currentRegion = useAdventureMapStore((s) => s.currentRegion);
  const movementPath = useAdventureMapStore((s) => s.movementPath);
  const targetLocation = useAdventureMapStore((s) => s.targetLocation);

  const startMovement = useAdventureMapStore((s) => s.startMovement);
  const advanceMovement = useAdventureMapStore((s) => s.advanceMovement);
  const cancelMovementStore = useAdventureMapStore((s) => s.cancelMovement);
  const teleportTo = useAdventureMapStore((s) => s.teleportTo);
  const setSelectedLocation = useAdventureMapStore((s) => s.setSelectedLocation);

  // Movement animation frame ref
  const animationRef = useRef<number | null>(null);
  const lastMoveTime = useRef<number>(0);

  // Animate movement along path
  useEffect(() => {
    if (characterState !== 'walking' || movementPath.length === 0) {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
      return;
    }

    const animate = (timestamp: number) => {
      if (timestamp - lastMoveTime.current >= movementSpeed) {
        lastMoveTime.current = timestamp;

        const isComplete = advanceMovement();

        if (isComplete && targetLocation && onLocationReached) {
          const location = LOCATIONS[targetLocation as keyof typeof LOCATIONS];
          if (location) {
            onLocationReached(targetLocation, location.route);
          }
        }
      }

      if (characterState === 'walking') {
        animationRef.current = requestAnimationFrame(animate);
      }
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [characterState, movementPath, movementSpeed, advanceMovement, targetLocation, onLocationReached]);

  // Move to a specific location
  const moveToLocation = useCallback(
    (locationId: LocationId) => {
      if (!enabled) return;

      // If reduced motion, teleport instead
      if (reducedMotion) {
        teleportTo(locationId);
        return;
      }

      startMovement(locationId);
      setSelectedLocation(locationId);
    },
    [enabled, reducedMotion, startMovement, teleportTo, setSelectedLocation]
  );

  // Teleport instantly to location
  const teleportToLocation = useCallback(
    (locationId: LocationId) => {
      if (!enabled) return;
      teleportTo(locationId);
      setSelectedLocation(locationId);
    },
    [enabled, teleportTo, setSelectedLocation]
  );

  // Move in a cardinal direction
  const moveInDirection = useCallback(
    (direction: 'north' | 'south' | 'east' | 'west') => {
      if (!enabled || characterState === 'walking') return;

      // Find current location
      const currentLocation = getClosestLocation(position);
      if (!currentLocation) return;

      // Get adjacent locations
      const adjacentLocations = getAdjacentLocations(currentLocation.id);
      if (adjacentLocations.length === 0) return;

      // Find location in the desired direction
      const vector = DIRECTION_VECTORS[direction];
      let bestLocation = adjacentLocations[0];
      let bestScore = -Infinity;

      for (const loc of adjacentLocations) {
        const dx = loc.position.x - position.x;
        const dy = loc.position.y - position.y;
        const score = dx * vector.x + dy * vector.y;

        if (score > bestScore) {
          bestScore = score;
          bestLocation = loc;
        }
      }

      if (bestLocation && bestScore > 0) {
        moveToLocation(bestLocation.id);
      }
    },
    [enabled, characterState, position, moveToLocation]
  );

  // Cancel current movement
  const cancelMovement = useCallback(() => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }
    cancelMovementStore();
  }, [cancelMovementStore]);

  // Keyboard handler
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!enabled) return;

      // Movement keys
      const direction = KEY_DIRECTIONS[e.key];
      if (direction) {
        e.preventDefault();
        moveInDirection(direction as 'north' | 'south' | 'east' | 'west');
        return;
      }

      // Enter to confirm location entry
      if (e.key === 'Enter') {
        const currentLocation = getClosestLocation(position, 30);
        if (currentLocation && onLocationReached) {
          e.preventDefault();
          onLocationReached(currentLocation.id, currentLocation.route);
        }
        return;
      }

      // Escape to cancel movement
      if (e.key === 'Escape') {
        e.preventDefault();
        cancelMovement();
        return;
      }
    },
    [enabled, position, moveInDirection, cancelMovement, onLocationReached]
  );

  // Map click handler
  const handleMapClick = useCallback(
    (clickPosition: Position) => {
      if (!enabled) return;

      // Find closest location to click
      const clickedLocation = getClosestLocation(clickPosition, 40);
      if (clickedLocation) {
        moveToLocation(clickedLocation.id);
      }
    },
    [enabled, moveToLocation]
  );

  return {
    position,
    isMoving: characterState === 'walking',
    isTeleporting: characterState === 'teleporting',
    currentRegion,
    moveToLocation,
    teleportToLocation,
    moveInDirection,
    cancelMovement,
    handleKeyDown,
    handleMapClick,
  };
}

export default useCharacterMovement;
