/**
 * useAtlasSearch - Hook for search state and filtering logic
 */

import { useState, useMemo, useCallback } from 'react';
import type { RouteAtlasManifest, RouteNode, RouteCategory } from '../atlasTypes';

interface SearchResult {
  id: string;
  type: 'route' | 'category';
  route?: RouteNode;
  category?: RouteCategory;
  matchType: 'label' | 'path' | 'description' | 'category';
  score: number;
}

export function useAtlasSearch(manifest: RouteAtlasManifest | null) {
  const [query, setQuery] = useState('');

  // Compute search results
  const results = useMemo<SearchResult[]>(() => {
    if (!manifest || !query.trim()) return [];

    const lowerQuery = query.toLowerCase().trim();
    const searchResults: SearchResult[] = [];

    manifest.categories.forEach((category) => {
      // Search category name
      if (category.label.toLowerCase().includes(lowerQuery)) {
        searchResults.push({
          id: `category-${category.id}`,
          type: 'category',
          category,
          matchType: 'category',
          score: category.label.toLowerCase().startsWith(lowerQuery) ? 100 : 80,
        });
      }

      // Search routes
      category.routes.forEach((route) => {
        let score = 0;
        let matchType: SearchResult['matchType'] = 'label';

        // Check label (highest priority)
        if (route.label.toLowerCase().includes(lowerQuery)) {
          score = route.label.toLowerCase().startsWith(lowerQuery) ? 95 : 85;
          matchType = 'label';
        }
        // Check path
        else if (route.path.toLowerCase().includes(lowerQuery)) {
          score = 70;
          matchType = 'path';
        }
        // Check description
        else if (route.description.toLowerCase().includes(lowerQuery)) {
          score = 50;
          matchType = 'description';
        }

        if (score > 0) {
          searchResults.push({
            id: route.id,
            type: 'route',
            route,
            category,
            matchType,
            score,
          });
        }
      });
    });

    // Sort by score
    return searchResults.sort((a, b) => b.score - a.score);
  }, [manifest, query]);

  // Get highlighted route IDs
  const highlightedIds = useMemo(() => {
    return results
      .filter((r) => r.type === 'route')
      .map((r) => r.id);
  }, [results]);

  // Get highlighted category IDs
  const highlightedCategoryIds = useMemo(() => {
    const ids = new Set<string>();

    results.forEach((r) => {
      if (r.type === 'category' && r.category) {
        ids.add(r.category.id);
      }
      if (r.type === 'route' && r.category) {
        ids.add(r.category.id);
      }
    });

    return Array.from(ids);
  }, [results]);

  // Clear search
  const clearSearch = useCallback(() => {
    setQuery('');
  }, []);

  return {
    query,
    setQuery,
    results,
    highlightedIds,
    highlightedCategoryIds,
    resultCount: results.filter((r) => r.type === 'route').length,
    hasResults: results.length > 0,
    clearSearch,
  };
}
