/**
 * MapMenu Types
 *
 * Type definitions for the interactive MapMenu navigation system.
 * Supports three visualization styles: World/3D Globe, Constellation/Stars, Isometric/Rooms
 */

// ============================================
// MAP DATA TYPES
// ============================================

export interface Position2D {
  x: number;
  y: number;
}

export interface Position3D extends Position2D {
  z: number;
}

export interface MapNode {
  id: string;
  label: string;
  shortLabel?: string;
  category: string;
  subcategory?: string;
  route: string;
  position: Position2D | Position3D;
  metadata?: {
    description?: string;
    thumbnail?: string;
    icon?: string;
    color?: string;
    nodeCount?: number;
  };
  lod?: {
    low?: string;
    medium?: string;
    high?: string;
  };
  connections?: string[];
}

export interface MapCategory {
  id: string;
  label: string;
  color: string;
  icon: string;
  nodeCount: number;
}

export interface MapEdge {
  from: string;
  to: string;
  weight?: number;
}

export interface MapData {
  nodes: MapNode[];
  categories: MapCategory[];
  edges?: MapEdge[];
  metadata: {
    version: string;
    lastUpdated: string;
  };
}

// ============================================
// RENDERER INTERFACE
// ============================================

export interface MapRenderer {
  /**
   * Initialize the renderer in the given container
   */
  initialize(container: HTMLElement, data: MapData): Promise<void>;

  /**
   * Set the currently active (selected) node
   */
  setActiveNode(nodeId: string | null): void;

  /**
   * Highlight nodes of a specific category
   */
  setHighlightedCategory(categoryId: string | null): void;

  /**
   * Filter nodes by search query
   */
  setSearchFilter(query: string): void;

  /**
   * Handle container resize
   */
  resize(width: number, height: number): void;

  /**
   * Set rendering quality level
   */
  setQualityLevel(level: QualityLevel): void;

  /**
   * Clean up resources
   */
  dispose(): void;

  /**
   * Register node click handler
   */
  onNodeClick(callback: (node: MapNode) => void): void;

  /**
   * Register node hover handler
   */
  onNodeHover(callback: (node: MapNode | null) => void): void;

  /**
   * Get current frames per second
   */
  getFPS(): number;
}

// ============================================
// VIEW & MODE TYPES
// ============================================

export type MapViewType = 'world' | 'constellation' | 'isometric';

export type MapMode = 'compact' | 'full';

export type QualityLevel = 'lite' | 'medium' | 'high';

// ============================================
// PERFORMANCE TYPES
// ============================================

export interface DeviceCapabilities {
  memory: number | null;
  cores: number;
  dpr: number;
  effectiveType: string | null;
  prefersReducedMotion: boolean;
  prefersHighContrast: boolean;
  supportsWebGL2: boolean;
  supportsOffscreenCanvas: boolean;
}

export interface PerformanceMetrics {
  loadTime: number;
  rendererInitTime: number;
  fps: number;
  qualityLevel: QualityLevel;
  fallbackTriggered: boolean;
}

// ============================================
// COMPONENT PROPS
// ============================================

export interface MapMenuProps {
  mode: MapMode;
  initialView?: MapViewType;
  currentRoute?: string;
  onNavigate?: (route: string) => void;
  className?: string;
}

export interface ViewSelectorProps {
  currentView: MapViewType;
  onViewChange: (view: MapViewType) => void;
  onViewHover?: (view: MapViewType) => void;
  disabled?: boolean;
}

export interface SearchOverlayProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export interface LegendProps {
  categories: MapCategory[];
  selectedCategory: string | null;
  onCategorySelect: (categoryId: string | null) => void;
}

export interface NodeTooltipProps {
  node: MapNode;
}

export interface QualityIndicatorProps {
  level: QualityLevel;
  fps: number;
  onToggle: () => void;
}

export interface MapMenuSkeletonProps {
  mode: MapMode;
}

// ============================================
// STORE TYPES
// ============================================

export interface MapMenuState {
  // View state
  currentView: MapViewType;
  mode: MapMode;
  isLoading: boolean;
  isExpanded: boolean;

  // Selection state
  activeNodeId: string | null;
  hoveredNodeId: string | null;
  selectedCategory: string | null;
  searchQuery: string;

  // Quality state
  qualityLevel: QualityLevel;
  fps: number;

  // UI state
  showOnboarding: boolean;
  showLegend: boolean;
  showSearch: boolean;

  // Actions
  setView: (view: MapViewType) => void;
  setMode: (mode: MapMode) => void;
  setLoading: (loading: boolean) => void;
  setExpanded: (expanded: boolean) => void;
  setActiveNode: (nodeId: string | null) => void;
  setHoveredNode: (nodeId: string | null) => void;
  setSelectedCategory: (categoryId: string | null) => void;
  setSearchQuery: (query: string) => void;
  setQualityLevel: (level: QualityLevel) => void;
  setFPS: (fps: number) => void;
  dismissOnboarding: () => void;
  toggleLegend: () => void;
  toggleSearch: () => void;
  reset: () => void;
}
