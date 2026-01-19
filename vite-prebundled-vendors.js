/**
 * Vite Plugin: Pre-bundled Vendors
 *
 * This plugin redirects imports of heavy vendor packages to use pre-bundled
 * ESM files created by scripts/prebundle-vendors.mjs. This DRAMATICALLY
 * reduces the number of modules Vite needs to transform during builds.
 *
 * Impact: Reduces transform time by skipping heavy vendor packages
 *
 * How it works:
 * 1. Intercepts import resolution for heavy packages
 * 2. Redirects to pre-bundled .mjs files in .vendor-cache/
 * 3. Falls back to node_modules if pre-bundled file doesn't exist
 */

import { existsSync, readFileSync } from 'fs';
import { resolve, join } from 'path';

const CACHE_DIR = '.vendor-cache';
const MANIFEST_FILE = 'manifest.json';

/**
 * VENDOR MAPPING
 * Maps package names to their pre-bundled files.
 * This must match the bundles created by prebundle-vendors.mjs
 */
const VENDOR_MAP = {
  // Three.js 3D engine
  'three': 'three-bundle.mjs',

  // D3.js charts
  'd3': 'd3-bundle.mjs',

  // GraphQL core
  'graphql': 'graphql-bundle.mjs',

  // Framer Motion animation
  'framer-motion': 'framer-motion-bundle.mjs',

  // Recharts
  'recharts': 'recharts-bundle.mjs',

  // Date utilities
  'date-fns': 'date-fns-bundle.mjs',

  // Icons
  'lucide-react': 'lucide-bundle.mjs',

  // State management
  'zustand': 'zustand-bundle.mjs',

  // Class utilities
  'clsx': 'clsx-bundle.mjs',

  // Flow diagrams
  'reactflow': 'reactflow-bundle.mjs',
};

/**
 * D3 subpackages that should use the d3 bundle
 */
const D3_SUBPACKAGES = new Set([
  'd3-array', 'd3-axis', 'd3-brush', 'd3-chord', 'd3-color',
  'd3-contour', 'd3-delaunay', 'd3-dispatch', 'd3-drag', 'd3-dsv',
  'd3-ease', 'd3-fetch', 'd3-force', 'd3-format', 'd3-geo',
  'd3-hierarchy', 'd3-interpolate', 'd3-path', 'd3-polygon',
  'd3-quadtree', 'd3-random', 'd3-scale', 'd3-scale-chromatic',
  'd3-selection', 'd3-shape', 'd3-time', 'd3-time-format',
  'd3-timer', 'd3-transition', 'd3-zoom',
]);

/**
 * Packages that have subpath exports which should use the parent bundle
 *
 * NOTE: zustand is NOT included here because zustand/middleware has separate
 * exports (persist, createJSONStorage) that aren't in the main zustand bundle.
 * Let Vite resolve zustand subpaths normally through node_modules.
 */
const SUBPATH_BUNDLES = {
  'three/': 'three-bundle.mjs',
  'date-fns/': 'date-fns-bundle.mjs',
  'framer-motion/': 'framer-motion-bundle.mjs',
  'recharts/': 'recharts-bundle.mjs',
  'graphql/': 'graphql-bundle.mjs',
  // zustand/ excluded - middleware subpath has separate exports
};

export default function prebundledVendors(options = {}) {
  const {
    enabled = process.env.USE_PREBUNDLED !== 'false',
    cacheDir = CACHE_DIR,
    verbose = process.env.VERBOSE_PREBUNDLE === 'true',
  } = options;

  const projectRoot = process.cwd();
  const cachePath = resolve(projectRoot, cacheDir);
  const manifestPath = join(cachePath, MANIFEST_FILE);

  // Track stats
  let resolvedCount = 0;
  let fallbackCount = 0;
  const resolvedPackages = new Set();
  const fallbackPackages = new Set();

  // Check if cache exists and load manifest
  const cacheExists = existsSync(cachePath);
  let manifest = null;
  let availableBundles = new Set();

  if (cacheExists && existsSync(manifestPath)) {
    try {
      manifest = JSON.parse(readFileSync(manifestPath, 'utf-8'));
      // Build set of available bundles
      if (manifest.bundles) {
        for (const [name, result] of Object.entries(manifest.bundles)) {
          if (result.success) {
            availableBundles.add(`${name}.mjs`);
          }
        }
      }
    } catch (e) {
      // Ignore manifest read errors
    }
  }

  if (!cacheExists && enabled) {
    console.log('[prebundled] \x1b[33mNo cache found\x1b[0m - run: node scripts/prebundle-vendors.mjs');
  }

  return {
    name: 'prebundled-vendors',
    enforce: 'pre',

    buildStart() {
      if (enabled && cacheExists) {
        const bundleCount = availableBundles.size;
        console.log(`[prebundled] Using ${bundleCount} pre-bundled vendor bundles from ${cacheDir}/`);
      }
    },

    resolveId(source, importer, options) {
      if (!enabled || !cacheExists) return null;

      // Check for exact package match
      if (VENDOR_MAP[source]) {
        const bundleFile = VENDOR_MAP[source];
        if (availableBundles.has(bundleFile)) {
          const bundlePath = resolve(cachePath, bundleFile);
          if (existsSync(bundlePath)) {
            resolvedCount++;
            resolvedPackages.add(source);
            if (verbose) {
              console.log(`[prebundled] ${source} → ${bundleFile}`);
            }
            return bundlePath;
          }
        }
        fallbackCount++;
        fallbackPackages.add(source);
        return null;
      }

      // Check for D3 subpackages
      if (D3_SUBPACKAGES.has(source)) {
        const bundleFile = 'd3-bundle.mjs';
        if (availableBundles.has(bundleFile)) {
          const bundlePath = resolve(cachePath, bundleFile);
          if (existsSync(bundlePath)) {
            resolvedCount++;
            resolvedPackages.add(source);
            return bundlePath;
          }
        }
        return null;
      }

      // Check for subpath imports
      for (const [prefix, bundleFile] of Object.entries(SUBPATH_BUNDLES)) {
        if (source.startsWith(prefix)) {
          if (availableBundles.has(bundleFile)) {
            const bundlePath = resolve(cachePath, bundleFile);
            if (existsSync(bundlePath)) {
              resolvedCount++;
              resolvedPackages.add(source.split('/').slice(0, 2).join('/'));
              return bundlePath;
            }
          }
          break;
        }
      }

      return null;
    },

    buildEnd() {
      if (enabled && (resolvedCount > 0 || fallbackCount > 0)) {
        console.log(`[prebundled] \x1b[32mResolved ${resolvedCount} imports\x1b[0m from ${resolvedPackages.size} packages`);
        if (fallbackCount > 0) {
          console.log(`[prebundled] \x1b[33mFallback: ${fallbackCount}\x1b[0m (${[...fallbackPackages].join(', ')})`);
        }
      }
    },
  };
}
