/**
 * useAtlasNavigation - Hook for atlas navigation state and actions
 */

import { useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

export function useAtlasNavigation() {
  const navigate = useNavigate();
  const location = useLocation();

  const navigateToRoute = useCallback((path: string) => {
    navigate(path);
  }, [navigate]);

  const navigateToDoc = useCallback((docId: string, anchor?: string) => {
    const path = anchor ? `/docs/${docId}#${anchor}` : `/docs/${docId}`;
    navigate(path);
  }, [navigate]);

  const navigateToRoadmapItem = useCallback((itemId: string) => {
    navigate(`/roadmap#${itemId}`);
  }, [navigate]);

  const isCurrentRoute = useCallback((path: string) => {
    // Handle exact match
    if (location.pathname === path) return true;

    // Handle root path
    if (path === '/' && location.pathname === '/') return true;

    // Handle nested routes (e.g., /docs/getting-started matches /docs)
    if (path !== '/' && location.pathname.startsWith(path + '/')) return true;

    return false;
  }, [location.pathname]);

  return {
    currentPath: location.pathname,
    navigateToRoute,
    navigateToDoc,
    navigateToRoadmapItem,
    isCurrentRoute,
  };
}
