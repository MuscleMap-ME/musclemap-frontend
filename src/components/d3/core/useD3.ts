/**
 * useD3 Hook - Core D3 integration for React
 *
 * Provides a clean interface for D3 visualizations with:
 * - Automatic resize handling
 * - Cleanup on unmount
 * - Performance optimization
 */

import { useRef, useEffect, useCallback, useState } from 'react';
import * as d3 from 'd3';

export interface D3Dimensions {
  width: number;
  height: number;
  margin: { top: number; right: number; bottom: number; left: number };
  innerWidth: number;
  innerHeight: number;
}

export interface UseD3Options {
  margin?: { top: number; right: number; bottom: number; left: number };
  responsive?: boolean;
  aspectRatio?: number;
  minHeight?: number;
  maxHeight?: number;
}

const DEFAULT_MARGIN = { top: 20, right: 20, bottom: 20, left: 20 };

/**
 * Debounce utility
 */
export function debounce<T extends (...args: unknown[]) => unknown>(fn: T, delay: number): T {
  let timeoutId: ReturnType<typeof setTimeout>;
  return ((...args: unknown[]) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delay);
  }) as T;
}

export function useD3<T extends SVGSVGElement | HTMLCanvasElement>(
  renderFn: (container: d3.Selection<T, unknown, null, undefined>, dimensions: D3Dimensions) => void | (() => void),
  deps: React.DependencyList = [],
  options: UseD3Options = {}
) {
  const ref = useRef<T>(null);
  const cleanupRef = useRef<(() => void) | null>(null);
  const [dimensions, setDimensions] = useState<D3Dimensions | null>(null);

  const {
    margin = DEFAULT_MARGIN,
    responsive = true,
    aspectRatio,
    minHeight = 200,
    maxHeight = 800,
  } = options;

  const updateDimensions = useCallback(() => {
    if (!ref.current) return null;

    const container = ref.current.parentElement;
    if (!container) return null;

    let width = container.clientWidth;
    let height = container.clientHeight;

    if (aspectRatio) {
      height = Math.min(Math.max(width / aspectRatio, minHeight), maxHeight);
    }

    const dims: D3Dimensions = {
      width,
      height,
      margin,
      innerWidth: width - margin.left - margin.right,
      innerHeight: height - margin.top - margin.bottom,
    };

    setDimensions(dims);
    return dims;
  }, [margin, aspectRatio, minHeight, maxHeight]);

  useEffect(() => {
    if (!ref.current) return;

    // Cleanup previous render
    if (cleanupRef.current) {
      cleanupRef.current();
      cleanupRef.current = null;
    }

    const dims = updateDimensions();
    if (!dims) return;

    const selection = d3.select(ref.current) as d3.Selection<T, unknown, null, undefined>;

    // Set dimensions on SVG
    if (ref.current instanceof SVGSVGElement) {
      selection
        .attr('width', dims.width)
        .attr('height', dims.height)
        .attr('viewBox', `0 0 ${dims.width} ${dims.height}`);
    }

    // Execute render function
    const cleanup = renderFn(selection, dims);
    if (cleanup) {
      cleanupRef.current = cleanup;
    }
  }, [renderFn, updateDimensions, ...deps]);

  // Handle resize
  useEffect(() => {
    if (!responsive) return;

    const handleResize = debounce(() => {
      updateDimensions();
    }, 100);

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [responsive, updateDimensions]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (cleanupRef.current) {
        cleanupRef.current();
      }
    };
  }, []);

  return { ref, dimensions };
}
