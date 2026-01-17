/**
 * MapMenu - Interactive Navigation System
 *
 * A visual navigation system for MuscleMap with three view modes:
 * - World (3D Globe)
 * - Constellation (Star map)
 * - Isometric (Room-based building view)
 *
 * Supports compact widget mode and full-page mode.
 * Automatically adapts quality based on device capabilities.
 */

// Main component
export { MapMenu } from './MapMenu';
export { default } from './MapMenu';

// UI Components
export {
  ViewSelector,
  SearchOverlay,
  Legend,
  NodeTooltip,
  QualityIndicator,
  MapMenuSkeleton,
} from './components';

// Data utilities
export {
  getMapData,
  getCompactMapData,
  findNodeById,
  findNodeByRoute,
  findNodesByCategory,
  getConnectedNodes,
  MAP_CATEGORIES,
} from './data/mapData';

// Performance utilities
export {
  detectCapabilities,
  determineQualityLevel,
  probeFPS,
  perfLogger,
  throttle,
  debounce,
  getOptimalPixelRatio,
} from './utils/performance';

// Renderer factory
export { createRenderer, preloadRenderer } from './renderers';

// Types
export type {
  MapNode,
  MapCategory,
  MapData,
  MapEdge,
  MapRenderer,
  MapViewType,
  MapMode,
  QualityLevel,
  Position2D,
  Position3D,
  DeviceCapabilities,
  PerformanceMetrics,
  MapMenuProps,
  MapMenuState,
  ViewSelectorProps,
  SearchOverlayProps,
  LegendProps,
  NodeTooltipProps,
  QualityIndicatorProps,
  MapMenuSkeletonProps,
} from './types';
