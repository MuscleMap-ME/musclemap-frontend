/**
 * Layout Calculator
 *
 * Uses D3 force simulation to automatically position map locations
 * with collision detection and region constraints.
 *
 * NOTE: D3 is dynamically imported to avoid issues on iOS Safari where
 * static imports of large ESM bundles can fail silently.
 */

import type { MapLocation, Region, Position, RegionId } from '../types';

// D3 types (used for TypeScript, actual module is dynamically imported)
interface LayoutNode {
  id: string;
  region: RegionId;
  tier: string;
  x: number;
  y: number;
  fx?: number | null;
  fy?: number | null;
  vx?: number;
  vy?: number;
  index?: number;
}

interface LayoutLink {
  source: string | LayoutNode;
  target: string | LayoutNode;
}

// Detect mobile devices - they should use grid layout for better performance
const isMobileDevice = (): boolean => {
  if (typeof window === 'undefined') return false;
  return /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) ||
         (window.innerWidth < 768);
};

interface LayoutConfig {
  nodeRadius: number;
  labelHeight: number;
  regionPadding: number;
  linkDistance: number;
  chargeStrength: number;
  collisionStrength: number;
  iterations: number;
}

const DEFAULT_CONFIG: LayoutConfig = {
  nodeRadius: 45,
  labelHeight: 55,
  regionPadding: 60,
  linkDistance: 120,
  chargeStrength: -500,
  collisionStrength: 1,
  iterations: 400,
};

// Tier-based size multipliers
const TIER_MULTIPLIERS: Record<string, number> = {
  common: 1.0,
  uncommon: 1.1,
  rare: 1.2,
  epic: 1.3,
  legendary: 1.4,
};

/**
 * Calculate optimized positions for all locations using D3 force simulation.
 * On mobile devices, falls back to grid layout for better performance.
 *
 * NOTE: This function dynamically imports D3 to avoid iOS Safari issues.
 * If D3 fails to load, it automatically falls back to grid layout.
 */
export function calculateLayout(
  locations: MapLocation[],
  regions: Record<RegionId, Region>,
  pathConnections: { from: string; to: string }[],
  config: Partial<LayoutConfig> = {}
): Map<string, Position> {
  // On mobile, skip D3 entirely and use grid layout for better performance
  // This also avoids iOS Safari module loading issues
  if (isMobileDevice()) {
    console.log('[layoutCalculator] Mobile device detected, using grid layout');
    return calculateGridLayout(locations, regions);
  }

  // Try to use D3 force simulation (will be dynamically imported)
  try {
    return calculateLayoutWithD3(locations, regions, pathConnections, config);
  } catch (error) {
    console.warn('[layoutCalculator] D3 layout failed, using grid fallback:', error);
    return calculateGridLayout(locations, regions);
  }
}

/**
 * Internal: Calculate layout using D3 force simulation.
 * This is separated so we can catch errors and fallback gracefully.
 */
function calculateLayoutWithD3(
  locations: MapLocation[],
  regions: Record<RegionId, Region>,
  pathConnections: { from: string; to: string }[],
  config: Partial<LayoutConfig> = {}
): Map<string, Position> {
  // D3 is imported dynamically at the top of the file
  // If D3 isn't available, this will throw and we'll use grid layout
  const d3 = getD3();
  if (!d3) {
    throw new Error('D3 not available');
  }

  const cfg = { ...DEFAULT_CONFIG, ...config };

  // Create nodes from locations
  const nodes: LayoutNode[] = locations.map((loc) => {
    const region = regions[loc.region];
    if (!region) {
      return {
        id: loc.id,
        region: loc.region,
        tier: loc.tier,
        x: loc.position.x,
        y: loc.position.y,
      };
    }

    const regionCenter = {
      x: region.bounds.x + region.bounds.width / 2,
      y: region.bounds.y + region.bounds.height / 2,
    };

    // Initialize near region center with slight randomization
    // Use a seeded random for consistent layouts
    const seed = loc.id.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
    const pseudoRandom = (seed % 100) / 100;
    const jitterX = (pseudoRandom - 0.5) * Math.min(100, region.bounds.width * 0.3);
    const jitterY = ((seed * 7) % 100) / 100 - 0.5;
    const jitterYScaled = jitterY * Math.min(100, region.bounds.height * 0.3);

    return {
      id: loc.id,
      region: loc.region,
      tier: loc.tier,
      x: regionCenter.x + jitterX,
      y: regionCenter.y + jitterYScaled,
      // Fix dashboard at center hub center
      ...(loc.isStarting ? { fx: regionCenter.x, fy: regionCenter.y } : {}),
    };
  });

  // Create links from path connections
  const links: LayoutLink[] = pathConnections.map((p) => ({
    source: p.from,
    target: p.to,
  }));

  // Custom force to keep nodes within their region bounds
  const forceRegionBounds = () => {
    for (const node of nodes) {
      const region = regions[node.region];
      if (!region || node.fx !== undefined) continue;

      const { x, y, width, height } = region.bounds;
      const padding = cfg.regionPadding;
      const tierMult = TIER_MULTIPLIERS[node.tier] || 1;
      const effectivePadding = padding * tierMult;

      const minX = x + effectivePadding;
      const maxX = x + width - effectivePadding;
      const minY = y + effectivePadding;
      const maxY = y + height - effectivePadding;

      // Clamp position to region bounds with some elasticity
      if (node.x < minX) node.x = minX + (minX - node.x) * 0.1;
      if (node.x > maxX) node.x = maxX - (node.x - maxX) * 0.1;
      if (node.y < minY) node.y = minY + (minY - node.y) * 0.1;
      if (node.y > maxY) node.y = maxY - (node.y - maxY) * 0.1;

      // Hard clamp
      node.x = Math.max(minX, Math.min(maxX, node.x));
      node.y = Math.max(minY, Math.min(maxY, node.y));
    }
  };

  // Build simulation
  const simulation = d3
    .forceSimulation(nodes)
    // Pull connected nodes together (but not too close)
    .force(
      'link',
      d3
        .forceLink(links)
        .id((d: LayoutNode) => d.id)
        .distance(cfg.linkDistance)
        .strength(0.3)
    )
    // Push all nodes apart (negative = repulsion)
    .force(
      'charge',
      d3.forceManyBody().strength(cfg.chargeStrength)
    )
    // Prevent node overlap (collision detection)
    .force(
      'collision',
      d3
        .forceCollide()
        .radius((d: LayoutNode) => {
          const tierMult = TIER_MULTIPLIERS[d.tier] || 1;
          return (cfg.nodeRadius + cfg.labelHeight / 2) * tierMult;
        })
        .strength(cfg.collisionStrength)
    )
    .stop();

  // Run simulation synchronously
  for (let i = 0; i < cfg.iterations; i++) {
    simulation.tick();
    // Apply region bounds constraint after each tick
    forceRegionBounds();
  }

  // Extract final positions
  const positions = new Map<string, Position>();
  for (const node of nodes) {
    positions.set(node.id, {
      x: Math.round(node.x),
      y: Math.round(node.y),
    });
  }

  return positions;
}

// Cached D3 module reference
let d3Module: typeof import('d3') | null = null;
let d3LoadAttempted = false;

/**
 * Get D3 module synchronously (for use in calculateLayout).
 * Returns null if D3 hasn't been loaded yet.
 */
function getD3(): typeof import('d3') | null {
  return d3Module;
}

/**
 * Preload D3 module asynchronously.
 * Call this early to ensure D3 is ready when needed.
 */
export async function preloadD3(): Promise<boolean> {
  if (d3Module) return true;
  if (d3LoadAttempted) return d3Module !== null;

  d3LoadAttempted = true;

  try {
    // Dynamic import of D3 - this is what avoids the iOS Safari issue
    d3Module = await import('d3');
    console.log('[layoutCalculator] D3 loaded successfully');
    return true;
  } catch (error) {
    console.warn('[layoutCalculator] Failed to load D3:', error);
    d3Module = null;
    return false;
  }
}

/**
 * Generate a cache key for memoization based on locations and regions
 */
export function getLayoutCacheKey(
  locations: MapLocation[],
  regions: Record<RegionId, Region>
): string {
  const locationIds = locations.map((l) => l.id).sort().join(',');
  const regionBounds = Object.values(regions)
    .map((r) => `${r.id}:${r.bounds.x},${r.bounds.y},${r.bounds.width},${r.bounds.height}`)
    .join('|');
  return `${locationIds}__${regionBounds}`;
}

/**
 * Calculate grid-based positions as a fallback (simpler, guaranteed no overlap)
 */
export function calculateGridLayout(
  locations: MapLocation[],
  regions: Record<RegionId, Region>
): Map<string, Position> {
  const positions = new Map<string, Position>();

  // Group locations by region
  const locationsByRegion = new Map<RegionId, MapLocation[]>();
  for (const loc of locations) {
    const regionLocs = locationsByRegion.get(loc.region) || [];
    regionLocs.push(loc);
    locationsByRegion.set(loc.region, regionLocs);
  }

  // Calculate grid positions within each region
  for (const [regionId, regionLocs] of locationsByRegion) {
    const region = regions[regionId];
    if (!region) continue;

    const { bounds } = region;
    const count = regionLocs.length;
    const cols = Math.ceil(Math.sqrt(count));
    const rows = Math.ceil(count / cols);

    const cellWidth = (bounds.width - 120) / Math.max(cols, 1);
    const cellHeight = (bounds.height - 120) / Math.max(rows, 1);

    regionLocs.forEach((loc, index) => {
      const col = index % cols;
      const row = Math.floor(index / cols);

      positions.set(loc.id, {
        x: Math.round(bounds.x + 60 + col * cellWidth + cellWidth / 2),
        y: Math.round(bounds.y + 60 + row * cellHeight + cellHeight / 2),
      });
    });
  }

  return positions;
}
