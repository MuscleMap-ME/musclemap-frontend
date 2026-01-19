#!/usr/bin/env node
/**
 * MuscleMap Vendor Pre-bundler
 *
 * This script pre-bundles heavy vendor packages using esbuild, which is
 * significantly faster than Rollup. The pre-bundled files are placed in
 * .vendor-cache/ and can be referenced by the main Vite build.
 *
 * How it works:
 * 1. Uses esbuild to bundle heavy packages into single ESM files
 * 2. Stores bundles in .vendor-cache/ with a lockfile hash
 * 3. Main build references these bundles via resolve aliases
 *
 * This can reduce the "transforming" phase by 60-70% because esbuild
 * doesn't need to re-process thousands of vendor modules.
 *
 * Usage:
 *   node scripts/prebundle-vendors.mjs           # Build if needed
 *   node scripts/prebundle-vendors.mjs --force   # Force rebuild
 *   node scripts/prebundle-vendors.mjs --clean   # Remove cache
 */

import { build } from 'esbuild';
import { createHash } from 'crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync, rmSync } from 'fs';
import { dirname, join, resolve } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = dirname(__dirname);
const CACHE_DIR = join(PROJECT_ROOT, '.vendor-cache');
const HASH_FILE = join(CACHE_DIR, 'lockfile-hash');

// Heavy packages to pre-bundle (the ones that take longest to transform)
// Only packages that export everything from main entry point
// Packages with complex subpath exports need standard bundling
const VENDOR_BUNDLES = [
  {
    name: 'three-bundle',
    entry: 'three',
    // Don't externalize anything - bundle completely
    external: [],
  },
  {
    name: 'd3-bundle',
    entry: 'd3',
    external: [],
  },
  {
    name: 'graphql-bundle',
    entry: 'graphql',
    external: [],
  },
  // Note: Recharts and Apollo excluded because they have complex subpath exports
  // that aren't all re-exported from main entry point
];

// Colors for console output
const colors = {
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  reset: '\x1b[0m',
};

function log(msg) {
  console.log(`${colors.blue}[VENDOR]${colors.reset} ${msg}`);
}

function success(msg) {
  console.log(`${colors.green}[OK]${colors.reset} ${msg}`);
}

function warn(msg) {
  console.log(`${colors.yellow}[WARN]${colors.reset} ${msg}`);
}

function calculateLockHash() {
  try {
    const lockfile = readFileSync(join(PROJECT_ROOT, 'pnpm-lock.yaml'), 'utf-8');
    const hash = createHash('md5').update(lockfile).digest('hex').slice(0, 12);
    return hash;
  } catch {
    return 'no-lock';
  }
}

async function prebundleVendor(vendor, outDir) {
  const outFile = join(outDir, `${vendor.name}.mjs`);

  log(`Building ${vendor.name}...`);
  const startTime = Date.now();

  try {
    await build({
      entryPoints: [vendor.entry],
      bundle: true,
      format: 'esm',
      outfile: outFile,
      external: vendor.external,
      minify: true,
      treeShaking: true,
      target: 'es2020',
      platform: 'browser',
      mainFields: ['module', 'main'],
      conditions: ['module', 'import', 'default'],
      logLevel: 'error',
      // Metafile for size analysis
      metafile: true,
    });

    const duration = Date.now() - startTime;
    const stats = existsSync(outFile)
      ? `${(readFileSync(outFile).length / 1024).toFixed(0)}KB`
      : 'unknown size';

    success(`${vendor.name} (${stats}) in ${duration}ms`);
    return true;
  } catch (error) {
    warn(`Failed to bundle ${vendor.name}: ${error.message}`);
    return false;
  }
}

async function main() {
  const args = process.argv.slice(2);
  const forceRebuild = args.includes('--force') || args.includes('-f');
  const cleanCache = args.includes('--clean') || args.includes('-c');

  process.chdir(PROJECT_ROOT);

  // Handle --clean
  if (cleanCache) {
    if (existsSync(CACHE_DIR)) {
      rmSync(CACHE_DIR, { recursive: true });
      success('Vendor cache cleaned');
    } else {
      log('No cache to clean');
    }
    return;
  }

  // Check if we need to rebuild
  const currentHash = calculateLockHash();

  if (!forceRebuild && existsSync(HASH_FILE)) {
    const cachedHash = readFileSync(HASH_FILE, 'utf-8').trim();
    if (cachedHash === currentHash) {
      success(`Vendor cache up to date (hash: ${currentHash})`);
      return;
    }
    log(`Dependencies changed (${cachedHash} -> ${currentHash}), rebuilding...`);
  }

  // Create cache directory
  mkdirSync(CACHE_DIR, { recursive: true });

  console.log('');
  console.log('============================================');
  console.log('  Pre-bundling Heavy Vendors');
  console.log('============================================');
  console.log('');

  const startTime = Date.now();
  let successCount = 0;

  for (const vendor of VENDOR_BUNDLES) {
    const ok = await prebundleVendor(vendor, CACHE_DIR);
    if (ok) successCount++;
  }

  const totalTime = ((Date.now() - startTime) / 1000).toFixed(1);

  // Save hash
  writeFileSync(HASH_FILE, currentHash);

  console.log('');
  success(`Pre-bundled ${successCount}/${VENDOR_BUNDLES.length} vendors in ${totalTime}s`);
  console.log('');
  log('Cache location: .vendor-cache/');
  log('To use with Vite, add resolve aliases in vite.config.js');
}

main().catch(console.error);
