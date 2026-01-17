/**
 * Path Connections & Pathfinding
 *
 * A* pathfinding algorithm for character movement between locations.
 */

import type { Position, LocationId } from '../types';
import { LOCATIONS, PATH_CONNECTIONS, getLocation } from './mapLayout';

// ============================================
// A* PATHFINDING
// ============================================

interface PathNode {
  id: LocationId;
  g: number; // Cost from start
  h: number; // Heuristic (estimated cost to end)
  f: number; // Total cost (g + h)
  parent: PathNode | null;
}

/**
 * Calculate distance between two positions
 */
export function getDistance(a: Position, b: Position): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Get connected location IDs from path connections
 */
function getConnectedLocationIds(locationId: LocationId): LocationId[] {
  const connected: Set<LocationId> = new Set();

  for (const path of PATH_CONNECTIONS) {
    if (path.from === locationId) {
      connected.add(path.to);
    } else if (path.to === locationId) {
      connected.add(path.from);
    }
  }

  return Array.from(connected);
}

/**
 * A* pathfinding between two locations
 * Returns array of location IDs from start to end
 */
export function findPath(
  startId: LocationId,
  endId: LocationId,
  maxIterations = 100
): LocationId[] {
  const startLocation = getLocation(startId);
  const endLocation = getLocation(endId);

  if (!startLocation || !endLocation) {
    return [];
  }

  // If same location, return single node path
  if (startId === endId) {
    return [startId];
  }

  const openSet: Map<LocationId, PathNode> = new Map();
  const closedSet: Set<LocationId> = new Set();

  // Create start node
  const startNode: PathNode = {
    id: startId,
    g: 0,
    h: getDistance(startLocation.position, endLocation.position),
    f: 0,
    parent: null,
  };
  startNode.f = startNode.g + startNode.h;
  openSet.set(startId, startNode);

  let iterations = 0;

  while (openSet.size > 0 && iterations < maxIterations) {
    iterations++;

    // Find node with lowest f score
    let current: PathNode | null = null;
    let lowestF = Infinity;

    for (const node of openSet.values()) {
      if (node.f < lowestF) {
        lowestF = node.f;
        current = node;
      }
    }

    if (!current) break;

    // Check if we reached the goal
    if (current.id === endId) {
      // Reconstruct path
      const path: LocationId[] = [];
      let node: PathNode | null = current;

      while (node) {
        path.unshift(node.id);
        node = node.parent;
      }

      return path;
    }

    // Move current from open to closed
    openSet.delete(current.id);
    closedSet.add(current.id);

    // Process neighbors
    const neighbors = getConnectedLocationIds(current.id);

    for (const neighborId of neighbors) {
      if (closedSet.has(neighborId)) continue;

      const neighborLocation = getLocation(neighborId);
      if (!neighborLocation) continue;

      const currentLocation = getLocation(current.id);
      if (!currentLocation) continue;

      // Calculate tentative g score
      const tentativeG =
        current.g + getDistance(currentLocation.position, neighborLocation.position);

      const existingNode = openSet.get(neighborId);

      if (!existingNode) {
        // New node
        const newNode: PathNode = {
          id: neighborId,
          g: tentativeG,
          h: getDistance(neighborLocation.position, endLocation.position),
          f: 0,
          parent: current,
        };
        newNode.f = newNode.g + newNode.h;
        openSet.set(neighborId, newNode);
      } else if (tentativeG < existingNode.g) {
        // Found better path
        existingNode.g = tentativeG;
        existingNode.f = existingNode.g + existingNode.h;
        existingNode.parent = current;
      }
    }
  }

  // No path found
  return [];
}

/**
 * Convert location path to position waypoints
 */
export function pathToPositions(locationPath: LocationId[]): Position[] {
  return locationPath
    .map((id) => {
      const location = getLocation(id);
      return location?.position;
    })
    .filter((pos): pos is Position => pos !== undefined);
}

/**
 * Find path and return positions
 */
export function findPathPositions(
  startId: LocationId,
  endId: LocationId,
  maxIterations = 100
): Position[] {
  const path = findPath(startId, endId, maxIterations);
  return pathToPositions(path);
}

/**
 * Interpolate between two positions
 */
export function interpolatePosition(
  from: Position,
  to: Position,
  t: number
): Position {
  return {
    x: from.x + (to.x - from.x) * t,
    y: from.y + (to.y - from.y) * t,
  };
}

/**
 * Get movement waypoints along a path with step size
 */
export function getMovementWaypoints(
  positions: Position[],
  stepSize = 10
): Position[] {
  if (positions.length < 2) return positions;

  const waypoints: Position[] = [positions[0]];

  for (let i = 0; i < positions.length - 1; i++) {
    const from = positions[i];
    const to = positions[i + 1];
    const distance = getDistance(from, to);
    const steps = Math.ceil(distance / stepSize);

    for (let step = 1; step <= steps; step++) {
      const t = step / steps;
      waypoints.push(interpolatePosition(from, to, t));
    }
  }

  return waypoints;
}

export default {
  findPath,
  findPathPositions,
  pathToPositions,
  getDistance,
  interpolatePosition,
  getMovementWaypoints,
};
