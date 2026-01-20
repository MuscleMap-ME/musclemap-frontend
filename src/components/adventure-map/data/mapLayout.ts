/**
 * Map Layout
 *
 * Defines all location markers, their positions, and routes.
 * 40+ locations across 7 themed regions.
 */

import type { MapLocation, LocationId, Position, RegionId } from '../types';

// ============================================
// LOCATION DEFINITIONS
// ============================================

export const LOCATIONS: Record<LocationId, MapLocation> = {
  // ==========================================
  // CENTRAL HUB - Dashboard & Core
  // ==========================================
  dashboard: {
    id: 'dashboard',
    name: 'Command Center',
    description: 'Your fitness dashboard - the heart of your journey',
    icon: '🏠',
    route: '/dashboard',
    region: 'central-hub',
    position: { x: 500, y: 400 },
    tier: 'common',
    isStarting: true,
  },
  profile: {
    id: 'profile',
    name: 'Hero Profile',
    description: 'View and customize your warrior profile',
    icon: '👤',
    route: '/profile',
    region: 'central-hub',
    position: { x: 450, y: 450 },
    tier: 'common',
  },
  settings: {
    id: 'settings',
    name: 'Settings Keep',
    description: 'Configure your preferences',
    icon: '⚙️',
    route: '/settings',
    region: 'central-hub',
    position: { x: 550, y: 450 },
    tier: 'common',
  },

  // ==========================================
  // WARRIOR ARENA - Workouts & Training
  // ==========================================
  workout: {
    id: 'workout',
    name: 'Training Grounds',
    description: 'Start a new workout session',
    icon: '💪',
    route: '/workout',
    region: 'warrior-arena',
    position: { x: 200, y: 350 },
    tier: 'common',
  },
  exercises: {
    id: 'exercises',
    name: 'Exercise Library',
    description: 'Browse all available exercises',
    icon: '📖',
    route: '/exercises',
    region: 'warrior-arena',
    position: { x: 150, y: 400 },
    tier: 'common',
  },
  journey: {
    id: 'journey',
    name: 'Hero Journey',
    description: 'Your personalized training path',
    icon: '🗺️',
    route: '/journey',
    region: 'warrior-arena',
    position: { x: 250, y: 400 },
    tier: 'uncommon',
  },
  'pt-tests': {
    id: 'pt-tests',
    name: 'PT Test Arena',
    description: 'Physical fitness test preparation',
    icon: '🎖️',
    route: '/pt-tests',
    region: 'warrior-arena',
    position: { x: 200, y: 450 },
    tier: 'uncommon',
  },
  archetypes: {
    id: 'archetypes',
    name: 'Archetype Selection',
    description: 'Choose your warrior class',
    icon: '🛡️',
    route: '/archetypes',
    region: 'warrior-arena',
    position: { x: 120, y: 350 },
    tier: 'rare',
  },

  // ==========================================
  // PROGRESS PATH - Stats & Achievements
  // ==========================================
  progression: {
    id: 'progression',
    name: 'Progress Peaks',
    description: 'Track your overall progression',
    icon: '📈',
    route: '/progression',
    region: 'progress-path',
    position: { x: 300, y: 550 },
    tier: 'common',
  },
  stats: {
    id: 'stats',
    name: 'Stats Shrine',
    description: 'Detailed workout statistics',
    icon: '📊',
    route: '/stats',
    region: 'progress-path',
    position: { x: 250, y: 580 },
    tier: 'common',
  },
  achievements: {
    id: 'achievements',
    name: 'Trophy Hall',
    description: 'Your earned achievements',
    icon: '🏆',
    route: '/achievements',
    region: 'progress-path',
    position: { x: 350, y: 580 },
    tier: 'uncommon',
  },
  'personal-records': {
    id: 'personal-records',
    name: 'Records Monument',
    description: 'Your personal bests',
    icon: '🥇',
    route: '/personal-records',
    region: 'progress-path',
    position: { x: 300, y: 620 },
    tier: 'uncommon',
  },
  history: {
    id: 'history',
    name: 'History Archives',
    description: 'Past workout history',
    icon: '📜',
    route: '/history',
    region: 'progress-path',
    position: { x: 220, y: 530 },
    tier: 'common',
  },

  // ==========================================
  // GUILD HALL - Community & Social
  // ==========================================
  community: {
    id: 'community',
    name: 'Community Square',
    description: 'Connect with other warriors',
    icon: '👥',
    route: '/community',
    region: 'guild-hall',
    position: { x: 700, y: 350 },
    tier: 'common',
  },
  crews: {
    id: 'crews',
    name: 'Crew Quarters',
    description: 'Join or manage your crew',
    icon: '⚔️',
    route: '/crews',
    region: 'guild-hall',
    position: { x: 650, y: 400 },
    tier: 'uncommon',
  },
  rivals: {
    id: 'rivals',
    name: 'Rivals Arena',
    description: 'Challenge your rivals',
    icon: '🤺',
    route: '/rivals',
    region: 'guild-hall',
    position: { x: 750, y: 400 },
    tier: 'uncommon',
  },
  competitions: {
    id: 'competitions',
    name: 'Competition Colosseum',
    description: 'Join fitness competitions',
    icon: '🏅',
    route: '/competitions',
    region: 'guild-hall',
    position: { x: 700, y: 450 },
    tier: 'rare',
  },
  messages: {
    id: 'messages',
    name: 'Message Tower',
    description: 'Your conversations',
    icon: '💬',
    route: '/messages',
    region: 'guild-hall',
    position: { x: 680, y: 320 },
    tier: 'common',
  },
  leaderboard: {
    id: 'leaderboard',
    name: 'Hall of Champions',
    description: 'Top performers leaderboard',
    icon: '🏆',
    route: '/leaderboard',
    region: 'guild-hall',
    position: { x: 750, y: 350 },
    tier: 'uncommon',
  },

  // ==========================================
  // MARKET DISTRICT - Economy & Trading
  // ==========================================
  marketplace: {
    id: 'marketplace',
    name: 'Grand Bazaar',
    description: 'Buy and sell items',
    icon: '🛒',
    route: '/marketplace',
    region: 'market-district',
    position: { x: 800, y: 500 },
    tier: 'common',
  },
  wallet: {
    id: 'wallet',
    name: 'Treasury',
    description: 'Your credits and transactions',
    icon: '💰',
    route: '/wallet',
    region: 'market-district',
    position: { x: 750, y: 530 },
    tier: 'common',
  },
  skins: {
    id: 'skins',
    name: 'Cosmetics Emporium',
    description: 'Customize your appearance',
    icon: '🎨',
    route: '/skins',
    region: 'market-district',
    position: { x: 850, y: 530 },
    tier: 'uncommon',
  },
  trading: {
    id: 'trading',
    name: 'Trading Post',
    description: 'Trade with other users',
    icon: '🤝',
    route: '/trading',
    region: 'market-district',
    position: { x: 800, y: 560 },
    tier: 'rare',
  },
  collection: {
    id: 'collection',
    name: 'Collection Vault',
    description: 'Your collected items',
    icon: '🗃️',
    route: '/collection',
    region: 'market-district',
    position: { x: 780, y: 480 },
    tier: 'uncommon',
  },

  // ==========================================
  // WELLNESS SPRINGS - Health & Recovery
  // ==========================================
  health: {
    id: 'wellness',
    name: 'Wellness Sanctuary',
    description: 'Track your wellness metrics',
    icon: '❤️',
    route: '/wellness',
    region: 'wellness-springs',
    position: { x: 200, y: 150 },
    tier: 'common',
  },
  recovery: {
    id: 'recovery',
    name: 'Recovery Pool',
    description: 'Recovery and rest tracking',
    icon: '🛁',
    route: '/recovery',
    region: 'wellness-springs',
    position: { x: 150, y: 180 },
    tier: 'uncommon',
  },
  goals: {
    id: 'goals',
    name: 'Goals Garden',
    description: 'Set and track fitness goals',
    icon: '🎯',
    route: '/goals',
    region: 'wellness-springs',
    position: { x: 250, y: 180 },
    tier: 'common',
  },
  nutrition: {
    id: 'nutrition',
    name: 'Nutrition Kitchen',
    description: 'Track your nutrition',
    icon: '🥗',
    route: '/nutrition',
    region: 'wellness-springs',
    position: { x: 200, y: 210 },
    tier: 'uncommon',
  },
  sleep: {
    id: 'sleep',
    name: 'Rest Haven',
    description: 'Sleep tracking and analysis',
    icon: '😴',
    route: '/sleep',
    region: 'wellness-springs',
    position: { x: 180, y: 130 },
    tier: 'uncommon',
  },

  // ==========================================
  // SCHOLAR'S TOWER - Skills & Learning
  // ==========================================
  skills: {
    id: 'skills',
    name: 'Skills Academy',
    description: 'Learn new fitness skills',
    icon: '📚',
    route: '/skills',
    region: 'scholars-tower',
    position: { x: 700, y: 550 },
    tier: 'common',
  },
  'martial-arts': {
    id: 'martial-arts',
    name: 'Martial Arts Dojo',
    description: 'Combat sports training',
    icon: '🥋',
    route: '/martial-arts',
    region: 'scholars-tower',
    position: { x: 650, y: 580 },
    tier: 'uncommon',
  },
  trainers: {
    id: 'trainers',
    name: 'Trainers Guild',
    description: 'Find certified trainers',
    icon: '👨‍🏫',
    route: '/trainers',
    region: 'scholars-tower',
    position: { x: 750, y: 580 },
    tier: 'rare',
  },
  docs: {
    id: 'docs',
    name: 'Knowledge Library',
    description: 'Fitness guides and documentation',
    icon: '📖',
    route: '/docs',
    region: 'scholars-tower',
    position: { x: 700, y: 610 },
    tier: 'common',
  },
  tutorials: {
    id: 'tutorials',
    name: 'Tutorial Chamber',
    description: 'Learn the basics',
    icon: '🎓',
    route: '/tutorials',
    region: 'scholars-tower',
    position: { x: 680, y: 530 },
    tier: 'common',
  },

  // ==========================================
  // SUMMIT PEAK - Admin & Special
  // ==========================================
  empire: {
    id: 'empire',
    name: 'Empire Control',
    description: 'Admin control center',
    icon: '👑',
    route: '/empire',
    region: 'summit-peak',
    position: { x: 500, y: 100 },
    tier: 'legendary',
    requiredRole: 'admin',
  },
  'admin-control': {
    id: 'admin-control',
    name: 'Admin Tower',
    description: 'System administration',
    icon: '🏛️',
    route: '/admin-control',
    region: 'summit-peak',
    position: { x: 550, y: 120 },
    tier: 'legendary',
    requiredRole: 'admin',
  },
  analytics: {
    id: 'analytics',
    name: 'Analytics Spire',
    description: 'Platform analytics',
    icon: '📊',
    route: '/analytics',
    region: 'summit-peak',
    position: { x: 450, y: 120 },
    tier: 'epic',
    requiredRole: 'admin',
  },
};

// ============================================
// PATH CONNECTIONS
// ============================================

export interface PathConnection {
  from: LocationId;
  to: LocationId;
  style?: 'road' | 'trail' | 'bridge' | 'portal';
}

export const PATH_CONNECTIONS: PathConnection[] = [
  // Central Hub connections
  { from: 'dashboard', to: 'profile', style: 'road' },
  { from: 'dashboard', to: 'settings', style: 'road' },
  { from: 'dashboard', to: 'workout', style: 'road' },
  { from: 'dashboard', to: 'progression', style: 'road' },
  { from: 'dashboard', to: 'community', style: 'road' },
  { from: 'dashboard', to: 'marketplace', style: 'road' },
  { from: 'dashboard', to: 'health', style: 'bridge' },
  { from: 'dashboard', to: 'skills', style: 'road' },

  // Warrior Arena internal
  { from: 'workout', to: 'exercises', style: 'trail' },
  { from: 'workout', to: 'journey', style: 'trail' },
  { from: 'workout', to: 'pt-tests', style: 'trail' },
  { from: 'workout', to: 'archetypes', style: 'trail' },
  { from: 'exercises', to: 'archetypes', style: 'trail' },

  // Progress Path internal
  { from: 'progression', to: 'stats', style: 'trail' },
  { from: 'progression', to: 'achievements', style: 'trail' },
  { from: 'progression', to: 'personal-records', style: 'trail' },
  { from: 'progression', to: 'history', style: 'trail' },
  { from: 'stats', to: 'history', style: 'trail' },

  // Guild Hall internal
  { from: 'community', to: 'crews', style: 'trail' },
  { from: 'community', to: 'rivals', style: 'trail' },
  { from: 'community', to: 'competitions', style: 'trail' },
  { from: 'community', to: 'messages', style: 'trail' },
  { from: 'community', to: 'leaderboard', style: 'trail' },
  { from: 'crews', to: 'competitions', style: 'trail' },

  // Market District internal
  { from: 'marketplace', to: 'wallet', style: 'trail' },
  { from: 'marketplace', to: 'skins', style: 'trail' },
  { from: 'marketplace', to: 'trading', style: 'trail' },
  { from: 'marketplace', to: 'collection', style: 'trail' },
  { from: 'wallet', to: 'trading', style: 'trail' },

  // Wellness Springs internal
  { from: 'health', to: 'recovery', style: 'trail' },
  { from: 'health', to: 'goals', style: 'trail' },
  { from: 'health', to: 'nutrition', style: 'trail' },
  { from: 'health', to: 'sleep', style: 'trail' },
  { from: 'recovery', to: 'sleep', style: 'trail' },

  // Scholar's Tower internal
  { from: 'skills', to: 'martial-arts', style: 'trail' },
  { from: 'skills', to: 'trainers', style: 'trail' },
  { from: 'skills', to: 'docs', style: 'trail' },
  { from: 'skills', to: 'tutorials', style: 'trail' },
  { from: 'tutorials', to: 'docs', style: 'trail' },

  // Summit Peak internal
  { from: 'empire', to: 'admin-control', style: 'portal' },
  { from: 'empire', to: 'analytics', style: 'portal' },

  // Cross-region connections
  { from: 'health', to: 'empire', style: 'bridge' },
  { from: 'marketplace', to: 'empire', style: 'bridge' },
  { from: 'workout', to: 'progression', style: 'road' },
  { from: 'progression', to: 'skills', style: 'road' },
  { from: 'community', to: 'marketplace', style: 'road' },
];

// ============================================
// POSITION OVERRIDE SYSTEM
// ============================================

// Stores calculated positions from D3 force simulation
let calculatedPositions: Map<string, Position> | null = null;

/**
 * Set calculated positions (called by useCalculatedLayout hook)
 * These positions override the hardcoded positions in LOCATIONS
 */
export function setCalculatedPositions(positions: Map<string, Position>): void {
  calculatedPositions = positions;
}

/**
 * Get calculated positions map (for debugging)
 */
export function getCalculatedPositions(): Map<string, Position> | null {
  return calculatedPositions;
}

/**
 * Clear calculated positions (useful for testing)
 */
export function clearCalculatedPositions(): void {
  calculatedPositions = null;
}

/**
 * Get a location's position (uses calculated if available)
 */
function getPositionForLocation(location: MapLocation): Position {
  return calculatedPositions?.get(location.id) ?? location.position;
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Get all locations as an array (with calculated positions applied)
 */
export function getAllLocations(): MapLocation[] {
  return Object.values(LOCATIONS).map((loc) => ({
    ...loc,
    position: getPositionForLocation(loc),
  }));
}

/**
 * Get a specific location by ID (with calculated position applied)
 */
export function getLocation(id: LocationId): MapLocation | undefined {
  const loc = LOCATIONS[id];
  if (!loc) return undefined;
  return {
    ...loc,
    position: getPositionForLocation(loc),
  };
}

/**
 * Get the starting location (with calculated position)
 */
export function getStartingLocation(): MapLocation {
  const starting = Object.values(LOCATIONS).find((loc) => loc.isStarting);
  const loc = starting || LOCATIONS.dashboard;
  return {
    ...loc,
    position: getPositionForLocation(loc),
  };
}

/**
 * Get locations in a specific region (with calculated positions)
 */
export function getLocationsByRegion(regionId: RegionId): MapLocation[] {
  return Object.values(LOCATIONS)
    .filter((loc) => loc.region === regionId)
    .map((loc) => ({
      ...loc,
      position: getPositionForLocation(loc),
    }));
}

/**
 * Get adjacent locations (connected by paths, with calculated positions)
 */
export function getAdjacentLocations(locationId: LocationId): MapLocation[] {
  const adjacent: Set<LocationId> = new Set();

  for (const path of PATH_CONNECTIONS) {
    if (path.from === locationId) {
      adjacent.add(path.to);
    } else if (path.to === locationId) {
      adjacent.add(path.from);
    }
  }

  return Array.from(adjacent)
    .map((id) => LOCATIONS[id])
    .filter((loc): loc is MapLocation => loc !== undefined)
    .map((loc) => ({
      ...loc,
      position: getPositionForLocation(loc),
    }));
}

/**
 * Get the closest location to a position (using calculated positions)
 */
export function getClosestLocation(position: Position, maxDistance?: number): MapLocation | undefined {
  let closest: MapLocation | undefined;
  let minDistance = Infinity;

  for (const location of Object.values(LOCATIONS)) {
    const locPosition = getPositionForLocation(location);
    const dx = locPosition.x - position.x;
    const dy = locPosition.y - position.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance < minDistance) {
      minDistance = distance;
      closest = {
        ...location,
        position: locPosition,
      };
    }
  }

  // If maxDistance specified, only return if within range
  if (maxDistance !== undefined && minDistance > maxDistance) {
    return undefined;
  }

  return closest;
}

/**
 * Check if character is near a location (within radius, using calculated position)
 */
export function isNearLocation(position: Position, location: MapLocation, radius = 30): boolean {
  const locPosition = getPositionForLocation(location);
  const dx = locPosition.x - position.x;
  const dy = locPosition.y - position.y;
  return Math.sqrt(dx * dx + dy * dy) <= radius;
}

/**
 * Get paths connected to a location
 */
export function getPathsForLocation(locationId: LocationId): PathConnection[] {
  return PATH_CONNECTIONS.filter(
    (path) => path.from === locationId || path.to === locationId
  );
}

export default LOCATIONS;
