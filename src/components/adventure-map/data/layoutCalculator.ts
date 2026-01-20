/**
 * Layout Calculator
 *
 * Uses D3 force simulation to automatically position map locations
 * with collision detection and region constraints.
 */

import * as d3 from 'd3';
import type { MapLocation, Region, Position, RegionId, RegionBounds } from '../types';

interface LayoutNode extends d3.SimulationNodeDatum {
  id: string;
  region: RegionId;
  tier: string;
  x: number;
  y: number;
  fx?: number | null;
  fy?: number | null;
}

interface LayoutLink extends d3.SimulationLinkDatum<LayoutNode> {
  source: string | LayoutNode;
  target: string | LayoutNode;
}

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
 * Calculate optimized positions for all locations using D3 force simulation
 */
export function calculateLayout(
  locations: MapLocation[],
  regions: Record<RegionId, Region>,
  pathConnections: { from: string; to: string }[],
  config: Partial<LayoutConfig> = {}
): Map<string, Position> {
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
    const jitterX = (Math.random() - 0.5) * Math.min(100, region.bounds.width * 0.3);
    const jitterY = (Math.random() - 0.5) * Math.min(100, region.bounds.height * 0.3);

    return {
      id: loc.id,
      region: loc.region,
      tier: loc.tier,
      x: regionCenter.x + jitterX,
      y: regionCenter.y + jitterY,
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
        .forceLink<LayoutNode, LayoutLink>(links)
        .id((d) => d.id)
        .distance(cfg.linkDistance)
        .strength(0.3)
    )
    // Push all nodes apart (negative = repulsion)
    .force(
      'charge',
      d3.forceManyBody<LayoutNode>().strength(cfg.chargeStrength)
    )
    // Prevent node overlap (collision detection)
    .force(
      'collision',
      d3
        .forceCollide<LayoutNode>()
        .radius((d) => {
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
