/**
 * Atlas Type Definitions
 *
 * TypeScript interfaces for the Visual Architecture Maps system.
 */

// ============ Route Atlas ============

export interface RouteAtlasManifest {
  version: string;
  generated: string;
  categories: RouteCategory[];
}

export interface RouteCategory {
  id: string;
  label: string;
  color: string;
  icon: string;
  routes: RouteNode[];
}

export interface RouteNode {
  id: string;
  path: string;
  label: string;
  description: string;
  protection: 'public' | 'protected' | 'admin';
  icon?: string;
  badge?: string;
  children?: RouteNode[];
  relatedRoutes?: string[];
  position?: { x: number; y: number };
  external?: boolean; // Opens in new tab (for static files like /docs-plain)
}

// ============ Docs Atlas ============

export interface DocsAtlasManifest {
  version: string;
  generated: string;
  rootPath: string;
  documents: DocNode[];
}

export interface DocNode {
  id: string;
  path: string;
  title: string;
  description?: string;
  category?: string;
  icon?: string;
  children?: DocNode[];
  anchors?: DocAnchor[];
  relatedDocs?: string[];
}

export interface DocAnchor {
  id: string;
  title: string;
  level: number;
}

// ============ Roadmap Atlas ============

export interface RoadmapAtlasManifest {
  version: string;
  generated: string;
  phases: RoadmapPhase[];
}

export interface RoadmapPhase {
  id: string;
  number: number;
  label: string;
  description?: string;
  clusters: FeatureCluster[];
}

export interface FeatureCluster {
  id: string;
  label: string;
  description: string;
  status: 'completed' | 'in-progress' | 'planned';
  size: 'small' | 'medium' | 'large';
  icon?: string;
  relatedRoutes?: string[];
  relatedDocs?: string[];
  dependencies?: string[];
  highlights?: string[];
}

// ============ Architecture Atlas ============

export interface ArchitectureAtlasManifest {
  version: string;
  diagrams: ArchitectureDiagram[];
}

export interface ArchitectureDiagram {
  id: string;
  title: string;
  description: string;
  category: 'frontend' | 'backend' | 'data' | 'realtime' | 'flow';
  type: 'flowchart' | 'erd' | 'sequence' | 'component';
  source: string;
  interactiveNodes?: InteractiveNode[];
}

export interface InteractiveNode {
  nodeId: string;
  link?: string;
  tooltip?: string;
  highlight?: boolean;
}

// ============ User Context ============

export interface UserAtlasContext {
  currentRoute: string;
  userId: string;
  progress: {
    journeyStep: number;
    journeyTotal: number;
    skillTreesStarted: string[];
    skillTreesCompleted: string[];
    martialArtsRank?: string;
    creditsBalance: number;
  };
  recommendations: RecommendedNode[];
  recentlyVisited: string[];
}

export interface RecommendedNode {
  routeId: string;
  reason: string;
  priority: number;
}

// ============ Atlas Filters ============

export interface AtlasFilters {
  search: string;
  categories: string[];
  protection: ('public' | 'protected' | 'admin')[];
  showHidden: boolean;
}

// ============ React Flow Node Data ============

export interface RouteNodeData {
  route: RouteNode;
  category: RouteCategory;
  isHighlighted: boolean;
  isCurrentRoute: boolean;
  onNavigate: (path: string) => void;
}
