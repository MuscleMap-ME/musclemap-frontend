/**
 * AtlasProvider - Context provider for Visual Architecture Maps
 *
 * Manages atlas data, user context, and interaction state.
 */

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, ReactNode } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import type {
  RouteAtlasManifest,
  DocsAtlasManifest,
  RoadmapAtlasManifest,
  ArchitectureAtlasManifest,
  UserAtlasContext,
  AtlasFilters,
} from '../atlasTypes';

interface AtlasContextValue {
  // Data
  routeAtlas: RouteAtlasManifest | null;
  docsAtlas: DocsAtlasManifest | null;
  roadmapAtlas: RoadmapAtlasManifest | null;
  architectureAtlas: ArchitectureAtlasManifest | null;
  userContext: UserAtlasContext | null;

  // State
  loading: boolean;
  error: Error | null;

  // Interactions
  selectedNodeId: string | null;
  setSelectedNodeId: (id: string | null) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  activeFilters: AtlasFilters;
  setActiveFilters: (filters: AtlasFilters) => void;

  // Navigation
  currentPath: string;
  navigateToRoute: (path: string) => void;
  navigateToDoc: (docId: string, anchor?: string) => void;

  // Data loading
  refreshData: () => Promise<void>;
}

const defaultFilters: AtlasFilters = {
  search: '',
  categories: [],
  protection: [],
  showHidden: false,
};

const AtlasContext = createContext<AtlasContextValue | null>(null);

interface AtlasProviderProps {
  children: ReactNode;
}

export function AtlasProvider({ children }: AtlasProviderProps) {
  const location = useLocation();
  const navigate = useNavigate();

  // Data state
  const [routeAtlas, setRouteAtlas] = useState<RouteAtlasManifest | null>(null);
  const [docsAtlas, setDocsAtlas] = useState<DocsAtlasManifest | null>(null);
  const [roadmapAtlas, setRoadmapAtlas] = useState<RoadmapAtlasManifest | null>(null);
  const [architectureAtlas, _setArchitectureAtlas] = useState<ArchitectureAtlasManifest | null>(null);
  const [userContext, setUserContext] = useState<UserAtlasContext | null>(null);

  // Loading state
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Interaction state
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilters, setActiveFilters] = useState<AtlasFilters>(defaultFilters);

  // Load atlas data
  const loadAtlasData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // Load route atlas
      const routeResponse = await fetch('/atlases/route-atlas.json');
      if (routeResponse.ok) {
        const routeData = await routeResponse.json();
        setRouteAtlas(routeData);
      }

      // Load docs atlas (if exists)
      try {
        const docsResponse = await fetch('/atlases/docs-atlas.json');
        if (docsResponse.ok) {
          const docsData = await docsResponse.json();
          setDocsAtlas(docsData);
        }
      } catch {
        // Docs atlas is optional
      }

      // Load roadmap atlas (if exists)
      try {
        const roadmapResponse = await fetch('/atlases/roadmap-atlas.json');
        if (roadmapResponse.ok) {
          const roadmapData = await roadmapResponse.json();
          setRoadmapAtlas(roadmapData);
        }
      } catch {
        // Roadmap atlas is optional
      }

      // Load user context (if authenticated)
      try {
        const token = localStorage.getItem('token');
        if (token) {
          const userResponse = await fetch('/api/atlas/user-context', {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (userResponse.ok) {
            const userData = await userResponse.json();
            setUserContext(userData.data || userData);
          }
        }
      } catch {
        // User context is optional
      }
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to load atlas data'));
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    loadAtlasData();
  }, [loadAtlasData]);

  // Navigation handlers
  const navigateToRoute = useCallback((path: string) => {
    navigate(path);
  }, [navigate]);

  const navigateToDoc = useCallback((docId: string, anchor?: string) => {
    const path = anchor ? `/docs/${docId}#${anchor}` : `/docs/${docId}`;
    navigate(path);
  }, [navigate]);

  // Context value
  const value = useMemo<AtlasContextValue>(() => ({
    // Data
    routeAtlas,
    docsAtlas,
    roadmapAtlas,
    architectureAtlas,
    userContext,

    // State
    loading,
    error,

    // Interactions
    selectedNodeId,
    setSelectedNodeId,
    searchQuery,
    setSearchQuery,
    activeFilters,
    setActiveFilters,

    // Navigation
    currentPath: location.pathname,
    navigateToRoute,
    navigateToDoc,

    // Data loading
    refreshData: loadAtlasData,
  }), [
    routeAtlas,
    docsAtlas,
    roadmapAtlas,
    architectureAtlas,
    userContext,
    loading,
    error,
    selectedNodeId,
    searchQuery,
    activeFilters,
    location.pathname,
    navigateToRoute,
    navigateToDoc,
    loadAtlasData,
  ]);

  return (
    <AtlasContext.Provider value={value}>
      {children}
    </AtlasContext.Provider>
  );
}

export function useAtlas() {
  const context = useContext(AtlasContext);
  if (!context) {
    throw new Error('useAtlas must be used within an AtlasProvider');
  }
  return context;
}

export function useAtlasOptional() {
  return useContext(AtlasContext);
}
