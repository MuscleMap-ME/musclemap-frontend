#!/usr/bin/env node
/**
 * MuscleMap AGGRESSIVE Vendor Pre-bundler
 *
 * This script pre-bundles ALL heavy vendor packages using esbuild to
 * DRAMATICALLY reduce the "transforming" phase. We're talking 10,000 modules
 * down to under 1,000.
 *
 * Strategy:
 * 1. Bundle entire vendor trees into single ESM files
 * 2. Use esbuild (native speed) instead of letting Vite re-transform
 * 3. Cache bundles by lockfile hash - only rebuild on dependency changes
 * 4. Split into logical chunks that match our Vite manualChunks
 *
 * Expected impact:
 * - Transform count: 10,000 → ~800 modules (92% reduction)
 * - Build time: 90s → 15-30s
 *
 * Usage:
 *   node scripts/prebundle-vendors.mjs           # Build if needed
 *   node scripts/prebundle-vendors.mjs --force   # Force rebuild
 *   node scripts/prebundle-vendors.mjs --clean   # Remove cache
 *   node scripts/prebundle-vendors.mjs --status  # Show cache status
 */

import { build } from 'esbuild';
import { createHash } from 'crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync, rmSync, readdirSync, statSync } from 'fs';
import { dirname, join, resolve } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = dirname(__dirname);
const CACHE_DIR = join(PROJECT_ROOT, '.vendor-cache');
const HASH_FILE = join(CACHE_DIR, 'lockfile-hash');
const MANIFEST_FILE = join(CACHE_DIR, 'manifest.json');

/**
 * AGGRESSIVE VENDOR BUNDLE LIST
 *
 * We're bundling EVERYTHING that takes significant transform time.
 * Each bundle corresponds to a logical chunk in our app.
 */
const VENDOR_BUNDLES = [
  // === CORE (Always loaded) ===
  {
    name: 'react-core-bundle',
    entries: ['react', 'react-dom', 'react-dom/client', 'scheduler'],
    description: 'Core React runtime (~165KB)',
    external: [],
  },
  {
    name: 'react-router-bundle',
    entries: ['react-router-dom', 'react-router', '@remix-run/router'],
    description: 'React Router (~45KB)',
    external: ['react', 'react-dom'],
  },

  // === STATE MANAGEMENT ===
  {
    name: 'zustand-bundle',
    entries: ['zustand', 'zustand/middleware', 'zustand/shallow'],
    description: 'Zustand state management (~8KB)',
    external: ['react'],
  },

  // === GRAPHQL ===
  {
    name: 'graphql-bundle',
    entries: ['graphql', 'graphql/language', 'graphql/execution'],
    description: 'GraphQL core (~180KB)',
    external: [],
  },
  {
    name: 'apollo-bundle',
    entries: [
      '@apollo/client',
      '@apollo/client/core',
      '@apollo/client/cache',
      '@apollo/client/link/context',
      '@apollo/client/link/error',
      '@apollo/client/link/http',
      '@apollo/client/react',
      '@apollo/client/react/hooks',
    ],
    description: 'Apollo Client (~170KB)',
    external: ['react', 'react-dom', 'graphql'],
  },

  // === 3D RENDERING ===
  {
    name: 'three-bundle',
    entries: ['three'],
    description: 'Three.js 3D engine (~800KB)',
    external: [],
  },
  {
    name: 'react-three-bundle',
    entries: ['@react-three/fiber', '@react-three/drei'],
    description: 'React Three Fiber + Drei (~300KB)',
    external: ['react', 'react-dom', 'three'],
  },

  // === CHARTS & VISUALIZATION ===
  {
    name: 'd3-bundle',
    entries: ['d3'],
    description: 'D3.js charts (~280KB)',
    external: [],
  },
  {
    name: 'recharts-bundle',
    entries: ['recharts'],
    description: 'Recharts (~350KB)',
    external: ['react', 'react-dom', 'd3-scale', 'd3-shape', 'd3-interpolate'],
  },

  // === ANIMATION ===
  {
    name: 'framer-motion-bundle',
    entries: ['framer-motion'],
    description: 'Framer Motion (~125KB)',
    external: ['react', 'react-dom'],
  },

  // === UI LIBRARIES ===
  {
    name: 'emotion-bundle',
    entries: ['@emotion/react', '@emotion/styled', '@emotion/cache'],
    description: 'Emotion CSS-in-JS (~50KB)',
    external: ['react'],
  },
  {
    name: 'mui-system-bundle',
    entries: ['@mui/system', '@mui/styled-engine'],
    description: 'MUI System (~80KB)',
    external: ['react', 'react-dom', '@emotion/react', '@emotion/styled'],
  },
  {
    name: 'mui-material-bundle',
    entries: ['@mui/material'],
    description: 'MUI Material (~400KB)',
    external: ['react', 'react-dom', '@emotion/react', '@emotion/styled', '@mui/system'],
  },

  // === UTILITIES ===
  {
    name: 'date-fns-bundle',
    entries: ['date-fns'],
    description: 'Date-fns utilities (~75KB tree-shaken)',
    external: [],
  },
  {
    name: 'lodash-bundle',
    entries: ['lodash-es'],
    description: 'Lodash ES (~80KB tree-shaken)',
    external: [],
  },
  {
    name: 'clsx-bundle',
    entries: ['clsx', 'tailwind-merge'],
    description: 'Class utilities (~5KB)',
    external: [],
  },

  // === MARKDOWN ===
  {
    name: 'markdown-bundle',
    entries: ['react-markdown', 'remark-gfm', 'rehype-highlight'],
    description: 'Markdown rendering (~150KB)',
    external: ['react'],
  },

  // === ICONS ===
  {
    name: 'lucide-bundle',
    entries: ['lucide-react'],
    description: 'Lucide icons (~200KB but tree-shaken)',
    external: ['react'],
  },

  // === MAPS ===
  {
    name: 'leaflet-bundle',
    entries: ['leaflet', 'react-leaflet'],
    description: 'Leaflet maps (~150KB)',
    external: ['react', 'react-dom'],
  },

  // === MISC HEAVY DEPS ===
  {
    name: 'dicebear-bundle',
    entries: ['@dicebear/core', '@dicebear/collection'],
    description: 'DiceBear avatars (~100KB)',
    external: [],
  },
  {
    name: 'reactflow-bundle',
    entries: ['reactflow', '@reactflow/core', '@reactflow/controls', '@reactflow/minimap'],
    description: 'React Flow diagrams (~200KB)',
    external: ['react', 'react-dom', 'd3-selection', 'd3-zoom', 'd3-drag'],
  },
];

// Colors for console output
const c = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m',
};

function log(msg) { console.log(`${c.blue}[VENDOR]${c.reset} ${msg}`); }
function success(msg) { console.log(`${c.green}[OK]${c.reset} ${msg}`); }
function warn(msg) { console.log(`${c.yellow}[WARN]${c.reset} ${msg}`); }
function error(msg) { console.log(`${c.red}[ERROR]${c.reset} ${msg}`); }

function formatSize(bytes) {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)}KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)}MB`;
}

function calculateLockHash() {
  try {
    const lockfile = readFileSync(join(PROJECT_ROOT, 'pnpm-lock.yaml'), 'utf-8');
    return createHash('md5').update(lockfile).digest('hex').slice(0, 16);
  } catch {
    return 'no-lock';
  }
}

function loadManifest() {
  if (!existsSync(MANIFEST_FILE)) {
    return { bundles: {}, hash: null, totalSize: 0, buildTime: null };
  }
  try {
    return JSON.parse(readFileSync(MANIFEST_FILE, 'utf-8'));
  } catch {
    return { bundles: {}, hash: null, totalSize: 0, buildTime: null };
  }
}

function saveManifest(manifest) {
  writeFileSync(MANIFEST_FILE, JSON.stringify(manifest, null, 2));
}

/**
 * Check if a package exists in node_modules
 */
function packageExists(pkg) {
  // Handle scoped packages
  const parts = pkg.split('/');
  let checkPath;

  if (pkg.startsWith('@')) {
    // @scope/package or @scope/package/subpath
    checkPath = join(PROJECT_ROOT, 'node_modules', parts[0], parts[1]);
  } else {
    // package or package/subpath
    checkPath = join(PROJECT_ROOT, 'node_modules', parts[0]);
  }

  return existsSync(checkPath);
}

/**
 * Bundle a single vendor
 */
async function prebundleVendor(vendor, outDir) {
  const outFile = join(outDir, `${vendor.name}.mjs`);

  // Check if all entries exist
  const missingEntries = vendor.entries.filter(e => !packageExists(e));
  if (missingEntries.length > 0) {
    warn(`${vendor.name}: Skipping (missing: ${missingEntries.join(', ')})`);
    return { success: false, reason: 'missing' };
  }

  log(`Building ${vendor.name}... ${c.gray}(${vendor.description})${c.reset}`);
  const startTime = Date.now();

  try {
    // Create entry point content that re-exports everything
    const entryContent = vendor.entries.map(e => `export * from '${e}';`).join('\n');
    const entryFile = join(outDir, `${vendor.name}-entry.js`);
    writeFileSync(entryFile, entryContent);

    const result = await build({
      entryPoints: [entryFile],
      bundle: true,
      format: 'esm',
      outfile: outFile,
      external: vendor.external,
      minify: true,
      treeShaking: true,
      target: 'es2020',
      platform: 'browser',
      mainFields: ['module', 'main', 'browser'],
      conditions: ['module', 'import', 'browser', 'default'],
      logLevel: 'error',
      metafile: true,
      // Important: Don't bundle peer deps
      packages: 'external',
      // But do bundle these specific entries
      plugins: [{
        name: 'bundle-entries',
        setup(build) {
          // Mark our entry packages as bundleable
          const entrySet = new Set(vendor.entries.map(e => e.split('/')[0]));
          build.onResolve({ filter: /.*/ }, args => {
            // Bundle the entry packages
            if (entrySet.has(args.path) || entrySet.has(args.path.split('/')[0])) {
              return null; // Let esbuild bundle it
            }
            // External everything else
            if (args.kind === 'import-statement' && !args.path.startsWith('.')) {
              // Check if it's in external list
              if (vendor.external.some(ext => args.path === ext || args.path.startsWith(ext + '/'))) {
                return { path: args.path, external: true };
              }
            }
            return null;
          });
        },
      }],
    });

    // Clean up entry file
    rmSync(entryFile, { force: true });

    const duration = Date.now() - startTime;
    const size = existsSync(outFile) ? statSync(outFile).size : 0;

    success(`${vendor.name} ${c.gray}(${formatSize(size)}, ${duration}ms)${c.reset}`);

    return {
      success: true,
      size,
      duration,
      entries: vendor.entries.length,
    };
  } catch (e) {
    // Clean up on error
    const entryFile = join(outDir, `${vendor.name}-entry.js`);
    rmSync(entryFile, { force: true });

    warn(`${vendor.name}: Build failed - ${e.message.split('\n')[0]}`);
    return { success: false, reason: 'build-error', error: e.message };
  }
}

/**
 * Build all vendor bundles
 */
async function buildAll(force = false) {
  const currentHash = calculateLockHash();
  const manifest = loadManifest();

  // Check if we need to rebuild
  if (!force && manifest.hash === currentHash) {
    const bundleCount = Object.keys(manifest.bundles).filter(k => manifest.bundles[k].success).length;
    success(`Vendor cache up to date (${bundleCount} bundles, ${formatSize(manifest.totalSize)})`);
    return;
  }

  if (manifest.hash && manifest.hash !== currentHash) {
    log(`Dependencies changed, rebuilding all bundles...`);
  }

  // Create cache directory
  mkdirSync(CACHE_DIR, { recursive: true });

  console.log('');
  console.log(c.cyan + '================================================' + c.reset);
  console.log(c.cyan + '  AGGRESSIVE Vendor Pre-bundler' + c.reset);
  console.log(c.cyan + '  Reducing 10,000 modules to ~800' + c.reset);
  console.log(c.cyan + '================================================' + c.reset);
  console.log('');

  const startTime = Date.now();
  let successCount = 0;
  let skipCount = 0;
  let failCount = 0;
  let totalSize = 0;
  const bundleResults = {};

  for (const vendor of VENDOR_BUNDLES) {
    const result = await prebundleVendor(vendor, CACHE_DIR);
    bundleResults[vendor.name] = result;

    if (result.success) {
      successCount++;
      totalSize += result.size || 0;
    } else if (result.reason === 'missing') {
      skipCount++;
    } else {
      failCount++;
    }
  }

  const totalTime = ((Date.now() - startTime) / 1000).toFixed(1);

  // Save hash and manifest
  writeFileSync(HASH_FILE, currentHash);
  saveManifest({
    hash: currentHash,
    bundles: bundleResults,
    totalSize,
    buildTime: new Date().toISOString(),
    stats: {
      success: successCount,
      skipped: skipCount,
      failed: failCount,
      duration: parseFloat(totalTime),
    },
  });

  console.log('');
  console.log(c.green + '================================================' + c.reset);
  console.log(c.green + '  Pre-bundling Complete!' + c.reset);
  console.log(c.green + '================================================' + c.reset);
  console.log('');
  console.log(`  ${c.green}Success:${c.reset} ${successCount} bundles`);
  console.log(`  ${c.yellow}Skipped:${c.reset} ${skipCount} (missing deps)`);
  console.log(`  ${c.red}Failed:${c.reset}  ${failCount}`);
  console.log(`  ${c.bright}Size:${c.reset}    ${formatSize(totalSize)}`);
  console.log(`  ${c.bright}Time:${c.reset}    ${totalTime}s`);
  console.log('');
  log('Cache location: .vendor-cache/');
  console.log('');
}

/**
 * Show cache status
 */
function showStatus() {
  console.log('\n' + c.cyan + '=== Vendor Cache Status ===' + c.reset + '\n');

  const manifest = loadManifest();
  const currentHash = calculateLockHash();

  // Hash comparison
  const hashMatch = manifest.hash === currentHash;
  console.log(c.bright + 'Lock Hash:' + c.reset);
  console.log(`  Cached:  ${manifest.hash || 'none'}`);
  console.log(`  Current: ${currentHash}`);
  console.log(`  Status:  ${hashMatch ? c.green + 'VALID' : c.yellow + 'STALE'}${c.reset}`);

  // Bundle status
  if (manifest.bundles && Object.keys(manifest.bundles).length > 0) {
    console.log('\n' + c.bright + 'Bundles:' + c.reset);
    for (const [name, result] of Object.entries(manifest.bundles)) {
      if (result.success) {
        console.log(`  ${c.green}✓${c.reset} ${name} (${formatSize(result.size)})`);
      } else {
        console.log(`  ${c.red}✗${c.reset} ${name} (${result.reason})`);
      }
    }
  }

  // Stats
  if (manifest.stats) {
    console.log('\n' + c.bright + 'Stats:' + c.reset);
    console.log(`  Total Size: ${formatSize(manifest.totalSize)}`);
    console.log(`  Build Time: ${manifest.stats.duration}s`);
    console.log(`  Last Built: ${manifest.buildTime || 'never'}`);
  }

  console.log('');
}

/**
 * Clean cache
 */
function cleanCache() {
  if (existsSync(CACHE_DIR)) {
    rmSync(CACHE_DIR, { recursive: true });
    success('Vendor cache cleaned');
  } else {
    log('No cache to clean');
  }
}

// Main
const args = process.argv.slice(2);

if (args.includes('--clean') || args.includes('-c')) {
  cleanCache();
} else if (args.includes('--status') || args.includes('-s')) {
  showStatus();
} else {
  const force = args.includes('--force') || args.includes('-f');
  buildAll(force).catch(console.error);
}
