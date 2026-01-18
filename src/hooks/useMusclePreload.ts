/**
 * useMusclePreload Hook
 *
 * Preloads 3D muscle model assets based on route predictions.
 * Uses intersection observer and route change detection to
 * anticipate which muscle visualizations will be needed.
 */

import { useEffect, useCallback, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { useGLTF } from '@react-three/drei';
import { anatomyRegistry } from '../lib/anatomy/registry';
import { useAdaptiveVisualization } from './useAdaptiveVisualization';
import type { LODLevel } from '../lib/anatomy/types';

// Track what's already been preloaded
const preloadedAssets = new Set<string>();

/**
 * Routes that use muscle visualization
 */
const MUSCLE_ROUTES = [
  '/exercises',
  '/workout',
  '/stats',
  '/profile',
  '/personal-records',
  '/progression',
  '/journey',
  '/goals',
  '/wellness',
  '/recovery',
  '/crews',
  '/rivals',
  '/leaderboard',
];

/**
 * Routes that benefit from high LOD
 */
const HIGH_LOD_ROUTES = [
  '/stats',
  '/profile',
  '/personal-records',
];

/**
 * Preload a specific anatomy asset
 */
function preloadAsset(assetKey: string, lod: LODLevel): void {
  const cacheKey = `${assetKey}:${lod}`;
  if (preloadedAssets.has(cacheKey)) return;

  const asset = anatomyRegistry.getAsset(assetKey);
  if (!asset) return;

  const filePath = anatomyRegistry.getFilePath(asset, lod);
  if (!filePath) return;

  try {
    useGLTF.preload(filePath);
    preloadedAssets.add(cacheKey);
  } catch (error) {
    console.warn(`Failed to preload ${cacheKey}:`, error);
  }
}

/**
 * Hook for preloading muscle model on route transitions
 *
 * @example
 * // In App.tsx or layout component
 * function Layout() {
 *   useMusclePreload();
 *   return <Outlet />;
 * }
 */
export function useMusclePreload(): void {
  const location = useLocation();
  const { use3D, lod } = useAdaptiveVisualization();

  useEffect(() => {
    // Don't preload if we're using 2D
    if (!use3D) return;

    // Check if current route uses muscles
    const currentPath = location.pathname;
    const usesMuscles = MUSCLE_ROUTES.some(route =>
      currentPath === route || currentPath.startsWith(`${route}/`)
    );

    if (!usesMuscles) return;

    // Determine LOD to preload
    const needsHighLod = HIGH_LOD_ROUTES.some(route =>
      currentPath === route || currentPath.startsWith(`${route}/`)
    );

    const targetLod = needsHighLod ? 'high' : lod;

    // Preload the main muscle model
    preloadAsset('male_muscles', targetLod);

    // Also preload the next lower LOD as fallback
    if (targetLod === 'high') {
      preloadAsset('male_muscles', 'medium');
    }
  }, [location.pathname, use3D, lod]);
}

/**
 * Hook for preloading when hovering over links
 *
 * @example
 * // On a link component
 * const { onMouseEnter } = useMusclePreloadOnHover('/exercises');
 * <Link to="/exercises" onMouseEnter={onMouseEnter}>Exercises</Link>
 */
export function useMusclePreloadOnHover(targetRoute: string): {
  onMouseEnter: () => void;
  onFocus: () => void;
} {
  const { use3D, lod } = useAdaptiveVisualization();
  const preloadTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const triggerPreload = useCallback(() => {
    if (!use3D) return;

    // Debounce to avoid preloading on quick hover-throughs
    if (preloadTimeoutRef.current) {
      clearTimeout(preloadTimeoutRef.current);
    }

    preloadTimeoutRef.current = setTimeout(() => {
      const usesMuscles = MUSCLE_ROUTES.some(route =>
        targetRoute === route || targetRoute.startsWith(`${route}/`)
      );

      if (usesMuscles) {
        const needsHighLod = HIGH_LOD_ROUTES.some(route =>
          targetRoute === route || targetRoute.startsWith(`${route}/`)
        );

        preloadAsset('male_muscles', needsHighLod ? 'high' : lod);
      }
    }, 150);
  }, [use3D, lod, targetRoute]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (preloadTimeoutRef.current) {
        clearTimeout(preloadTimeoutRef.current);
      }
    };
  }, []);

  return {
    onMouseEnter: triggerPreload,
    onFocus: triggerPreload,
  };
}

/**
 * Hook for preloading based on element visibility
 *
 * @example
 * // Preload when a section becomes visible
 * const { ref } = useMusclePreloadOnVisible();
 * <section ref={ref}>...</section>
 */
export function useMusclePreloadOnVisible(): {
  ref: (node: HTMLElement | null) => void;
} {
  const { use3D, lod } = useAdaptiveVisualization();
  const observerRef = useRef<IntersectionObserver | null>(null);
  const hasPreloadedRef = useRef(false);

  const setRef = useCallback((node: HTMLElement | null) => {
    // Cleanup previous observer
    if (observerRef.current) {
      observerRef.current.disconnect();
    }

    if (!node || !use3D || hasPreloadedRef.current) return;

    observerRef.current = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry && entry.isIntersecting && !hasPreloadedRef.current) {
          hasPreloadedRef.current = true;
          preloadAsset('male_muscles', lod);
          observerRef.current?.disconnect();
        }
      },
      {
        rootMargin: '200px', // Start loading before element is visible
        threshold: 0,
      }
    );

    observerRef.current.observe(node);
  }, [use3D, lod]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, []);

  return { ref: setRef };
}

/**
 * Manually preload muscle assets
 */
export function preloadMuscleModel(lod: LODLevel = 'medium'): void {
  preloadAsset('male_muscles', lod);
}

/**
 * Get preload stats for debugging
 */
export function getPreloadStats(): { count: number; assets: string[] } {
  return {
    count: preloadedAssets.size,
    assets: Array.from(preloadedAssets),
  };
}

export default useMusclePreload;
