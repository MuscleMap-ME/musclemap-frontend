/**
 * Layout Algorithms for Atlas Visualization
 *
 * Generates node positions for React Flow based on category grouping.
 */

import type { Node, Edge } from 'reactflow';
import type { RouteAtlasManifest, RouteCategory, RouteNode, RouteNodeData } from '../atlasTypes';

const CATEGORY_SPACING = 300; // Horizontal spacing between categories
const NODE_SPACING_X = 180;   // Horizontal spacing within category
const NODE_SPACING_Y = 80;    // Vertical spacing between rows
const MAX_NODES_PER_ROW = 3;  // Maximum nodes per row in a category

/**
 * Generate nodes and edges from route atlas manifest
 */
export function generateRouteLayout(
  manifest: RouteAtlasManifest,
  currentPath: string,
  highlightedIds: string[],
  onNavigate: (path: string) => void
): { nodes: Node<RouteNodeData>[]; edges: Edge[] } {
  const nodes: Node<RouteNodeData>[] = [];
  const edges: Edge[] = [];

  let categoryX = 0;

  manifest.categories.forEach((category, categoryIndex) => {
    const categoryWidth = Math.min(category.routes.length, MAX_NODES_PER_ROW) * NODE_SPACING_X;

    // Add category header node
    nodes.push({
      id: `category-${category.id}`,
      type: 'default',
      position: { x: categoryX + categoryWidth / 2 - 60, y: -50 },
      data: { label: category.label },
      style: {
        background: `${category.color}20`,
        border: `1px solid ${category.color}40`,
        borderRadius: '8px',
        padding: '8px 16px',
        fontSize: '14px',
        fontWeight: 600,
        color: category.color,
      },
      draggable: false,
      selectable: false,
    });

    // Add route nodes
    category.routes.forEach((route, routeIndex) => {
      const row = Math.floor(routeIndex / MAX_NODES_PER_ROW);
      const col = routeIndex % MAX_NODES_PER_ROW;

      const x = categoryX + col * NODE_SPACING_X;
      const y = row * NODE_SPACING_Y + 30;

      nodes.push({
        id: route.id,
        type: 'routeNode',
        position: { x, y },
        data: {
          route,
          category,
          isHighlighted: highlightedIds.includes(route.id),
          isCurrentRoute: route.path === currentPath,
          onNavigate,
        },
      });

      // Connect to related routes
      if (route.relatedRoutes) {
        route.relatedRoutes.forEach((relatedId) => {
          edges.push({
            id: `${route.id}-${relatedId}`,
            source: route.id,
            target: relatedId,
            style: { stroke: 'rgba(255,255,255,0.1)' },
            animated: false,
          });
        });
      }
    });

    categoryX += categoryWidth + CATEGORY_SPACING;
  });

  return { nodes, edges };
}

/**
 * Filter routes by search query
 */
export function filterRoutes(
  manifest: RouteAtlasManifest,
  query: string
): string[] {
  if (!query.trim()) return [];

  const lowerQuery = query.toLowerCase();
  const matchedIds: string[] = [];

  manifest.categories.forEach((category) => {
    category.routes.forEach((route) => {
      if (
        route.label.toLowerCase().includes(lowerQuery) ||
        route.path.toLowerCase().includes(lowerQuery) ||
        route.description.toLowerCase().includes(lowerQuery)
      ) {
        matchedIds.push(route.id);
      }
    });
  });

  return matchedIds;
}

/**
 * Get all route IDs for a set of categories
 */
export function getRoutesByCategories(
  manifest: RouteAtlasManifest,
  categoryIds: string[]
): string[] {
  const routeIds: string[] = [];

  manifest.categories.forEach((category) => {
    if (categoryIds.includes(category.id)) {
      category.routes.forEach((route) => {
        routeIds.push(route.id);
      });
    }
  });

  return routeIds;
}
