/**
 * Atlas Filter Utilities
 *
 * Filtering and sorting logic for atlas data.
 */

import type { RouteAtlasManifest, RouteNode, RouteCategory, AtlasFilters } from '../atlasTypes';

/**
 * Filter routes by search query
 */
export function filterRoutesBySearch(
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
 * Filter routes by protection level
 */
export function filterRoutesByProtection(
  manifest: RouteAtlasManifest,
  protectionLevels: ('public' | 'protected' | 'admin')[]
): string[] {
  if (protectionLevels.length === 0) return getAllRouteIds(manifest);

  const matchedIds: string[] = [];

  manifest.categories.forEach((category) => {
    category.routes.forEach((route) => {
      if (protectionLevels.includes(route.protection)) {
        matchedIds.push(route.id);
      }
    });
  });

  return matchedIds;
}

/**
 * Filter routes by categories
 */
export function filterRoutesByCategories(
  manifest: RouteAtlasManifest,
  categoryIds: string[]
): string[] {
  if (categoryIds.length === 0) return getAllRouteIds(manifest);

  const matchedIds: string[] = [];

  manifest.categories.forEach((category) => {
    if (categoryIds.includes(category.id)) {
      category.routes.forEach((route) => {
        matchedIds.push(route.id);
      });
    }
  });

  return matchedIds;
}

/**
 * Apply all filters
 */
export function applyFilters(
  manifest: RouteAtlasManifest,
  filters: AtlasFilters
): string[] {
  let ids = getAllRouteIds(manifest);

  // Apply search filter
  if (filters.search.trim()) {
    const searchIds = filterRoutesBySearch(manifest, filters.search);
    ids = ids.filter((id) => searchIds.includes(id));
  }

  // Apply category filter
  if (filters.categories.length > 0) {
    const categoryIds = filterRoutesByCategories(manifest, filters.categories);
    ids = ids.filter((id) => categoryIds.includes(id));
  }

  // Apply protection filter
  if (filters.protection.length > 0) {
    const protectionIds = filterRoutesByProtection(manifest, filters.protection);
    ids = ids.filter((id) => protectionIds.includes(id));
  }

  // Filter hidden routes (admin routes) unless showHidden is true
  if (!filters.showHidden) {
    ids = ids.filter((id) => {
      const route = findRouteById(manifest, id);
      return route?.protection !== 'admin';
    });
  }

  return ids;
}

/**
 * Get all route IDs from manifest
 */
export function getAllRouteIds(manifest: RouteAtlasManifest): string[] {
  const ids: string[] = [];

  manifest.categories.forEach((category) => {
    category.routes.forEach((route) => {
      ids.push(route.id);
    });
  });

  return ids;
}

/**
 * Find route by ID
 */
export function findRouteById(
  manifest: RouteAtlasManifest,
  routeId: string
): RouteNode | null {
  for (const category of manifest.categories) {
    const route = category.routes.find((r) => r.id === routeId);
    if (route) return route;
  }
  return null;
}

/**
 * Find category containing a route
 */
export function findCategoryByRouteId(
  manifest: RouteAtlasManifest,
  routeId: string
): RouteCategory | null {
  for (const category of manifest.categories) {
    if (category.routes.some((r) => r.id === routeId)) {
      return category;
    }
  }
  return null;
}

/**
 * Get route by path
 */
export function findRouteByPath(
  manifest: RouteAtlasManifest,
  path: string
): RouteNode | null {
  for (const category of manifest.categories) {
    const route = category.routes.find((r) => r.path === path);
    if (route) return route;
  }
  return null;
}

/**
 * Sort routes by relevance to search query
 */
export function sortRoutesByRelevance(
  routes: RouteNode[],
  query: string
): RouteNode[] {
  if (!query.trim()) return routes;

  const lowerQuery = query.toLowerCase();

  return [...routes].sort((a, b) => {
    const aScore = getRelevanceScore(a, lowerQuery);
    const bScore = getRelevanceScore(b, lowerQuery);
    return bScore - aScore;
  });
}

function getRelevanceScore(route: RouteNode, query: string): number {
  let score = 0;

  // Exact label match
  if (route.label.toLowerCase() === query) {
    score += 100;
  }
  // Label starts with query
  else if (route.label.toLowerCase().startsWith(query)) {
    score += 80;
  }
  // Label contains query
  else if (route.label.toLowerCase().includes(query)) {
    score += 60;
  }

  // Path contains query
  if (route.path.toLowerCase().includes(query)) {
    score += 30;
  }

  // Description contains query
  if (route.description.toLowerCase().includes(query)) {
    score += 10;
  }

  return score;
}
