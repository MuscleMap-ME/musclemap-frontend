/**
 * Atlas Components - Visual Architecture Maps for MuscleMap
 *
 * Interactive site navigation and architecture visualization.
 */

// Types
export * from './atlasTypes';

// Provider
export { AtlasProvider, useAtlas, useAtlasOptional } from './providers/AtlasProvider';

// Views
export { RouteAtlas } from './views/RouteAtlas';
export { DashboardAtlas } from './views/DashboardAtlas';
export { DocsAtlas } from './views/DocsAtlas';
export { RoadmapAtlas } from './views/RoadmapAtlas';
export { ArchitectureAtlas } from './views/ArchitectureAtlas';

// Core components
export { AtlasCanvas } from './core/AtlasCanvas';
export { AtlasControls } from './core/AtlasControls';
export { AtlasLegend } from './core/AtlasLegend';
export { AtlasTooltip } from './core/AtlasTooltip';
export { AtlasSearch } from './core/AtlasSearch';

// Node components
export { RouteNode } from './nodes/RouteNode';

// Hooks
export { useAtlasData } from './hooks/useAtlasData';
export { useAtlasNavigation } from './hooks/useAtlasNavigation';
export { useAtlasSearch } from './hooks/useAtlasSearch';

// Utils
export * from './utils/layoutAlgorithms';
export * from './utils/atlasColors';
export * from './utils/atlasFilters';
