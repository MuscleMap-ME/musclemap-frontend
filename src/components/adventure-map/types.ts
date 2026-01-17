/**
 * Adventure Map Types
 *
 * Type definitions for the RPG-style adventure map navigation system.
 */

// ============================================
// POSITION & COORDINATES
// ============================================

export interface Position {
  x: number;
  y: number;
}

export interface MapBounds {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}

// ============================================
// REGIONS
// ============================================

export type RegionId =
  | 'central-hub'
  | 'warrior-arena'
  | 'progress-path'
  | 'guild-hall'
  | 'market-district'
  | 'wellness-springs'
  | 'scholars-tower'
  | 'summit-peak';

export interface RegionBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Region {
  id: RegionId;
  name: string;
  description: string;
  icon: string;
  theme: {
    primary: string;
    secondary: string;
    accent: string;
    glow: string;
  };
  bounds: RegionBounds;
  connections: string[];
  isAdminOnly?: boolean;
}

// ============================================
// LOCATIONS
// ============================================

export type LocationId = string;

export type LocationTier = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';

export interface MapLocation {
  id: LocationId;
  name: string;
  description: string;
  route: string;
  region: RegionId;
  position: Position;
  icon: string;
  tier: LocationTier;
  isStarting?: boolean;
  isLocked?: boolean;
  requiredLevel?: number;
  requiredRole?: string;
}

// ============================================
// PATHS (ROADS)
// ============================================

export interface MapPath {
  id: string;
  from: LocationId;
  to: LocationId;
  waypoints?: Position[];
  style?: 'road' | 'trail' | 'bridge' | 'portal';
}

// ============================================
// CHARACTER
// ============================================

export type CharacterState = 'idle' | 'walking' | 'teleporting';

export interface CharacterData {
  position: Position;
  state: CharacterState;
  targetPosition: Position | null;
  movementPath: Position[];
  currentRegion: RegionId;
}

// ============================================
// MAP STATE
// ============================================

export interface MapViewState {
  zoom: number;
  pan: Position;
  selectedLocation: LocationId | null;
  hoveredLocation: LocationId | null;
}

export interface MapProgressState {
  visitedLocations: Set<LocationId>;
  lastVisitedLocation: LocationId | null;
  totalVisits: number;
}

// ============================================
// HUD
// ============================================

export interface HUDStats {
  level: number;
  xp: number;
  xpToNextLevel: number;
  credits: number;
  wealthTier: number;
  characterStats: {
    strength: number;
    dexterity: number;
    endurance: number;
    constitution: number;
    power: number;
    vitality: number;
  };
}

export interface CompanionData {
  stage: number;
  name: string;
  equipped: {
    aura?: string;
    wings?: string;
    armor?: string;
    tools?: string;
    badge?: string;
  };
}

// ============================================
// EVENTS
// ============================================

export type MapEvent =
  | { type: 'character_move'; position: Position }
  | { type: 'location_enter'; locationId: LocationId }
  | { type: 'location_exit'; locationId: LocationId }
  | { type: 'teleport'; from: Position; to: Position }
  | { type: 'region_change'; from: RegionId; to: RegionId };

export type MapEventHandler = (event: MapEvent) => void;

// ============================================
// COMPONENT PROPS
// ============================================

export interface AdventureMapCanvasProps {
  className?: string;
  initialPosition?: Position;
  onLocationEnter?: (locationId: LocationId, route: string) => void;
  onCharacterMove?: (position: Position) => void;
  showHUD?: boolean;
  isFullscreen?: boolean;
  reducedMotion?: boolean;
}

export interface LocationNodeProps {
  location: MapLocation;
  isSelected?: boolean;
  isHovered?: boolean;
  isVisited?: boolean;
  isCharacterNearby?: boolean;
  onClick?: () => void;
  onHover?: (hovering: boolean) => void;
}

export interface MapRegionProps {
  region: Region;
  isActive?: boolean;
  children?: React.ReactNode;
}

export interface MapCharacterProps {
  position: Position;
  state: CharacterState;
  companionData: CompanionData;
  reducedMotion?: boolean;
}

export interface AdventureHUDProps {
  stats: HUDStats;
  companionData: CompanionData;
  currentLocation: MapLocation | null;
  onMinimapClick?: () => void;
  onMenuClick?: () => void;
  isMobile?: boolean;
  isExpanded?: boolean;
  onToggleExpand?: () => void;
}

export interface AdventureMapWidgetProps {
  className?: string;
  onExpand?: () => void;
}
