/**
 * useAtlasData - Hook for fetching and caching atlas manifest data
 */

import { useState, useEffect, useCallback } from 'react';
import type { RouteAtlasManifest, DocsAtlasManifest, RoadmapAtlasManifest } from '../atlasTypes';

interface AtlasDataState {
  routeAtlas: RouteAtlasManifest | null;
  docsAtlas: DocsAtlasManifest | null;
  roadmapAtlas: RoadmapAtlasManifest | null;
  loading: boolean;
  error: Error | null;
}

// Simple in-memory cache
const cache: {
  routeAtlas?: RouteAtlasManifest;
  docsAtlas?: DocsAtlasManifest;
  roadmapAtlas?: RoadmapAtlasManifest;
  timestamp?: number;
} = {};

const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export function useAtlasData() {
  const [state, setState] = useState<AtlasDataState>({
    routeAtlas: cache.routeAtlas || null,
    docsAtlas: cache.docsAtlas || null,
    roadmapAtlas: cache.roadmapAtlas || null,
    loading: !cache.routeAtlas,
    error: null,
  });

  const fetchData = useCallback(async (force = false) => {
    // Check cache validity
    const now = Date.now();
    if (!force && cache.timestamp && now - cache.timestamp < CACHE_TTL && cache.routeAtlas) {
      setState({
        routeAtlas: cache.routeAtlas,
        docsAtlas: cache.docsAtlas || null,
        roadmapAtlas: cache.roadmapAtlas || null,
        loading: false,
        error: null,
      });
      return;
    }

    setState((prev) => ({ ...prev, loading: true, error: null }));

    try {
      // Fetch all manifests in parallel
      const [routeRes, docsRes, roadmapRes] = await Promise.allSettled([
        fetch('/atlases/route-atlas.json'),
        fetch('/atlases/docs-atlas.json'),
        fetch('/atlases/roadmap-atlas.json'),
      ]);

      let routeAtlas: RouteAtlasManifest | null = null;
      let docsAtlas: DocsAtlasManifest | null = null;
      let roadmapAtlas: RoadmapAtlasManifest | null = null;

      if (routeRes.status === 'fulfilled' && routeRes.value.ok) {
        routeAtlas = await routeRes.value.json();
        cache.routeAtlas = routeAtlas!;
      }

      if (docsRes.status === 'fulfilled' && docsRes.value.ok) {
        docsAtlas = await docsRes.value.json();
        cache.docsAtlas = docsAtlas!;
      }

      if (roadmapRes.status === 'fulfilled' && roadmapRes.value.ok) {
        roadmapAtlas = await roadmapRes.value.json();
        cache.roadmapAtlas = roadmapAtlas!;
      }

      cache.timestamp = now;

      setState({
        routeAtlas,
        docsAtlas,
        roadmapAtlas,
        loading: false,
        error: null,
      });
    } catch (err) {
      setState((prev) => ({
        ...prev,
        loading: false,
        error: err instanceof Error ? err : new Error('Failed to fetch atlas data'),
      }));
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const refresh = useCallback(() => fetchData(true), [fetchData]);

  return {
    ...state,
    refresh,
  };
}
