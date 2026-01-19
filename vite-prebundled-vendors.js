/**
 * Vite Plugin: Pre-bundled Vendors
 *
 * This plugin redirects imports of heavy vendor packages to use pre-bundled
 * ESM files created by scripts/prebundle-vendors.mjs. This dramatically
 * reduces the number of modules Vite needs to transform during builds.
 *
 * How it works:
 * 1. Intercepts import resolution for specified packages
 * 2. Redirects to pre-bundled .mjs files in .vendor-cache/
 * 3. Falls back to node_modules if pre-bundled file doesn't exist
 *
 * Usage:
 *   import prebundledVendors from './vite-prebundled-vendors.js';
 *
 *   plugins: [
 *     prebundledVendors(),
 *   ]
 *
 * Expected impact:
 * - Reduces transform count from ~10k to ~5k modules
 * - Speeds up builds by 40-50%
 */

import { existsSync } from 'fs';
import { resolve } from 'path';

const CACHE_DIR = '.vendor-cache';

// Map of package names to their pre-bundled file
// Note: Only packages that export everything from main entry point
// Packages with complex subpath exports (like @apollo/client) need special handling
const VENDOR_MAP = {
  'three': 'three-bundle.mjs',
  'd3': 'd3-bundle.mjs',
  'graphql': 'graphql-bundle.mjs',
  // Recharts excluded - has subpath imports for chart components
  // Apollo excluded - has many subpath exports (@apollo/client/link/*, etc.)
};

// D3 subpackages that should use the d3 bundle
const D3_SUBPACKAGES = [
  'd3-array', 'd3-axis', 'd3-brush', 'd3-chord', 'd3-color',
  'd3-contour', 'd3-delaunay', 'd3-dispatch', 'd3-drag', 'd3-dsv',
  'd3-ease', 'd3-fetch', 'd3-force', 'd3-format', 'd3-geo',
  'd3-hierarchy', 'd3-interpolate', 'd3-path', 'd3-polygon',
  'd3-quadtree', 'd3-random', 'd3-scale', 'd3-scale-chromatic',
  'd3-selection', 'd3-shape', 'd3-time', 'd3-time-format',
  'd3-timer', 'd3-transition', 'd3-zoom',
];

export default function prebundledVendors(options = {}) {
  const {
    enabled = process.env.USE_PREBUNDLED !== 'false',
    cacheDir = CACHE_DIR,
  } = options;

  const projectRoot = process.cwd();
  const cachePath = resolve(projectRoot, cacheDir);
  let resolvedCount = 0;
  let fallbackCount = 0;

  // Check if cache exists
  const cacheExists = existsSync(cachePath);

  if (!cacheExists && enabled) {
    console.log('[prebundled] Cache not found, run: node scripts/prebundle-vendors.mjs');
  }

  return {
    name: 'prebundled-vendors',
    enforce: 'pre',

    buildStart() {
      if (enabled && cacheExists) {
        console.log(`[prebundled] Using pre-bundled vendors from ${cacheDir}/`);
      }
    },

    resolveId(source, importer, options) {
      if (!enabled || !cacheExists) return null;

      // Check for exact package match
      if (VENDOR_MAP[source]) {
        const bundlePath = resolve(cachePath, VENDOR_MAP[source]);
        if (existsSync(bundlePath)) {
          resolvedCount++;
          return bundlePath;
        }
      }

      // Check for d3 subpackages
      if (D3_SUBPACKAGES.includes(source) && VENDOR_MAP['d3']) {
        const bundlePath = resolve(cachePath, VENDOR_MAP['d3']);
        if (existsSync(bundlePath)) {
          resolvedCount++;
          return bundlePath;
        }
      }

      // Check for three subpath imports (three/src/*, three/examples/*, etc.)
      if (source.startsWith('three/') && VENDOR_MAP['three']) {
        const bundlePath = resolve(cachePath, VENDOR_MAP['three']);
        if (existsSync(bundlePath)) {
          resolvedCount++;
          return bundlePath;
        }
      }

      return null;
    },

    buildEnd() {
      if (enabled && (resolvedCount > 0 || fallbackCount > 0)) {
        console.log(`[prebundled] Resolved ${resolvedCount} imports from cache`);
        if (fallbackCount > 0) {
          console.log(`[prebundled] Fallback to node_modules: ${fallbackCount}`);
        }
      }
    },
  };
}
