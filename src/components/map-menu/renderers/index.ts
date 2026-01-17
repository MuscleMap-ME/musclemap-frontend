/**
 * Renderer Factory and Preloader
 *
 * Handles lazy loading of renderers and provides a factory function
 * to create the appropriate renderer based on view type and quality level.
 */

import type { MapRenderer, MapViewType, QualityLevel } from '../types';
import { LiteRenderer } from './LiteRenderer';

/**
 * Create a renderer based on view type and quality level
 */
export async function createRenderer(
  type: MapViewType,
  qualityLevel: QualityLevel
): Promise<MapRenderer> {
  // Always use LiteRenderer for lite quality
  if (qualityLevel === 'lite') {
    return new LiteRenderer();
  }

  // Lazy load 3D renderers based on view type
  switch (type) {
    case 'world': {
      const { World3DRenderer } = await import(
        /* webpackChunkName: "renderer-world3d" */
        './World3DRenderer'
      );
      return new World3DRenderer();
    }

    case 'constellation': {
      const { ConstellationRenderer } = await import(
        /* webpackChunkName: "renderer-constellation" */
        './ConstellationRenderer'
      );
      return new ConstellationRenderer();
    }

    case 'isometric': {
      const { IsometricRenderer } = await import(
        /* webpackChunkName: "renderer-isometric" */
        './IsometricRenderer'
      );
      return new IsometricRenderer();
    }

    default:
      return new LiteRenderer();
  }
}

/**
 * Preload a renderer to reduce delay when switching views
 */
export function preloadRenderer(type: MapViewType): void {
  switch (type) {
    case 'world':
      import(
        /* webpackChunkName: "renderer-world3d" */
        /* webpackPrefetch: true */
        './World3DRenderer'
      );
      break;

    case 'constellation':
      import(
        /* webpackChunkName: "renderer-constellation" */
        /* webpackPrefetch: true */
        './ConstellationRenderer'
      );
      break;

    case 'isometric':
      import(
        /* webpackChunkName: "renderer-isometric" */
        /* webpackPrefetch: true */
        './IsometricRenderer'
      );
      break;
  }
}

// Re-export LiteRenderer for direct use
export { LiteRenderer } from './LiteRenderer';
