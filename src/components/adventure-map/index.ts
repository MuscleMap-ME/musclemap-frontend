/**
 * Adventure Map - RPG-style navigation system for MuscleMap
 *
 * Exports all components, hooks, and utilities for the adventure map feature.
 */

// Main components
export { default as AdventureMapCanvas } from './AdventureMapCanvas';
export { default as MapRegion } from './MapRegion';
export { default as LocationNode } from './LocationNode';
export { default as MapPath } from './MapPath';
export { default as MapCharacter } from './MapCharacter';

// HUD components
export { default as AdventureHUD } from './hud/AdventureHUD';
export { default as CompanionWidget } from './hud/CompanionWidget';
export { default as StatsBar } from './hud/StatsBar';
export { default as CreditsWidget } from './hud/CreditsWidget';
export { default as MinimapWidget } from './hud/MinimapWidget';

// View components
export { default as AdventureMapWidget } from './views/AdventureMapWidget';
export { default as AdventureMapFullscreen } from './views/AdventureMapFullscreen';

// Hooks
export { useCharacterMovement } from './hooks/useCharacterMovement';
export { useMapNavigation } from './hooks/useMapNavigation';
export { useMapPersistence } from './hooks/useMapPersistence';

// Data
export { REGIONS, getAllRegions, getRegion, getRegionAtPosition } from './data/regions';
export {
  LOCATIONS,
  PATH_CONNECTIONS,
  getLocation,
  getLocationsByRegion,
  getAdjacentLocations,
  getClosestLocation,
  getStartingLocation,
  getAllLocations,
  isNearLocation,
  getPathsForLocation,
} from './data/mapLayout';
export {
  findPath,
  findPathPositions,
  pathToPositions,
  getDistance,
  interpolatePosition,
  getMovementWaypoints,
} from './data/pathConnections';

// Types
export type {
  Position,
  MapBounds,
  RegionId,
  Region,
  LocationId,
  MapLocation,
  MapPath as MapPathType,
  CharacterState,
  CharacterData,
  MapViewState,
  MapProgressState,
  HUDStats,
  CompanionData,
  MapEvent,
  MapEventHandler,
  AdventureMapCanvasProps,
  LocationNodeProps,
  MapRegionProps,
  MapCharacterProps,
  AdventureHUDProps,
  AdventureMapWidgetProps,
} from './types';
