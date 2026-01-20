/**
 * Adventure Map Regions
 *
 * Defines the 7 themed regions of the adventure map.
 * Each region has bounds, theme colors, and connected locations.
 */

import type { Region, RegionId, Position } from '../types';

// ============================================
// REGION DEFINITIONS
// ============================================

export const REGIONS: Record<RegionId, Region> = {
  'central-hub': {
    id: 'central-hub',
    name: 'Central Hub',
    description: 'The heart of your fitness journey. Start here.',
    icon: '🏰',
    theme: {
      primary: '#3B82F6', // Blue
      secondary: '#1E40AF',
      accent: '#60A5FA',
      glow: 'rgba(59, 130, 246, 0.3)',
    },
    bounds: {
      x: 700,
      y: 550,
      width: 400,
      height: 300,
    },
    connections: ['warrior-arena', 'progress-path', 'guild-hall', 'market-district', 'wellness-springs', 'scholars-tower'],
  },
  'warrior-arena': {
    id: 'warrior-arena',
    name: 'Warrior Arena',
    description: 'Train hard. Battle your limits. Become stronger.',
    icon: '⚔️',
    theme: {
      primary: '#EF4444', // Red
      secondary: '#B91C1C',
      accent: '#F87171',
      glow: 'rgba(239, 68, 68, 0.3)',
    },
    bounds: {
      x: 80,
      y: 450,
      width: 400,
      height: 350,
    },
    connections: ['central-hub', 'progress-path'],
  },
  'progress-path': {
    id: 'progress-path',
    name: 'Progress Path',
    description: 'Track your journey. Celebrate every milestone.',
    icon: '📈',
    theme: {
      primary: '#8B5CF6', // Purple
      secondary: '#6D28D9',
      accent: '#A78BFA',
      glow: 'rgba(139, 92, 246, 0.3)',
    },
    bounds: {
      x: 350,
      y: 1000,
      width: 450,
      height: 320,
    },
    connections: ['central-hub', 'warrior-arena', 'scholars-tower'],
  },
  'guild-hall': {
    id: 'guild-hall',
    name: 'Guild Hall',
    description: 'Connect with fellow warriors. Compete together.',
    icon: '🏛️',
    theme: {
      primary: '#10B981', // Green
      secondary: '#047857',
      accent: '#34D399',
      glow: 'rgba(16, 185, 129, 0.3)',
    },
    bounds: {
      x: 1300,
      y: 250,
      width: 420,
      height: 400,
    },
    connections: ['central-hub', 'market-district'],
  },
  'market-district': {
    id: 'market-district',
    name: 'Market District',
    description: 'Trade treasures. Customize your experience.',
    icon: '🪙',
    theme: {
      primary: '#F59E0B', // Gold/Amber
      secondary: '#D97706',
      accent: '#FBBF24',
      glow: 'rgba(245, 158, 11, 0.3)',
    },
    bounds: {
      x: 1300,
      y: 700,
      width: 420,
      height: 350,
    },
    connections: ['central-hub', 'guild-hall', 'summit-peak'],
  },
  'wellness-springs': {
    id: 'wellness-springs',
    name: 'Wellness Springs',
    description: 'Rest and recover. Balance body and mind.',
    icon: '💧',
    theme: {
      primary: '#06B6D4', // Cyan
      secondary: '#0891B2',
      accent: '#22D3EE',
      glow: 'rgba(6, 182, 212, 0.3)',
    },
    bounds: {
      x: 80,
      y: 80,
      width: 400,
      height: 320,
    },
    connections: ['central-hub', 'summit-peak'],
  },
  'scholars-tower': {
    id: 'scholars-tower',
    name: "Scholar's Tower",
    description: 'Learn new techniques. Master your craft.',
    icon: '📚',
    theme: {
      primary: '#EC4899', // Pink
      secondary: '#BE185D',
      accent: '#F472B6',
      glow: 'rgba(236, 72, 153, 0.3)',
    },
    bounds: {
      x: 1000,
      y: 1000,
      width: 420,
      height: 320,
    },
    connections: ['central-hub', 'progress-path'],
  },
  'summit-peak': {
    id: 'summit-peak',
    name: 'Summit Peak',
    description: 'The pinnacle of achievement. Admin realm.',
    icon: '👑',
    theme: {
      primary: '#FFD700', // Gold
      secondary: '#B8860B',
      accent: '#FFE55C',
      glow: 'rgba(255, 215, 0, 0.4)',
    },
    bounds: {
      x: 650,
      y: 80,
      width: 500,
      height: 280,
    },
    connections: ['wellness-springs', 'market-district'],
  },
};

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Get all regions as an array
 */
export function getAllRegions(): Region[] {
  return Object.values(REGIONS);
}

/**
 * Get a specific region by ID
 */
export function getRegion(id: RegionId): Region | undefined {
  return REGIONS[id];
}

/**
 * Check if a position is within a region's bounds
 */
export function isPositionInRegion(position: Position, region: Region): boolean {
  const { bounds } = region;
  return (
    position.x >= bounds.x &&
    position.x <= bounds.x + bounds.width &&
    position.y >= bounds.y &&
    position.y <= bounds.y + bounds.height
  );
}

/**
 * Get the region at a given position
 */
export function getRegionAtPosition(position: Position): Region | undefined {
  return Object.values(REGIONS).find((region) => isPositionInRegion(position, region));
}

/**
 * Get the center position of a region
 */
export function getRegionCenter(region: Region): Position {
  return {
    x: region.bounds.x + region.bounds.width / 2,
    y: region.bounds.y + region.bounds.height / 2,
  };
}

/**
 * Get connected regions for a given region
 */
export function getConnectedRegions(regionId: RegionId): Region[] {
  const region = REGIONS[regionId];
  if (!region) return [];

  return region.connections
    .map((id) => REGIONS[id as RegionId])
    .filter((r): r is Region => r !== undefined);
}

export default REGIONS;
