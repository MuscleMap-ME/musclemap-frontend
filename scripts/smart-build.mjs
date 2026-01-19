#!/usr/bin/env node
/**
 * MuscleMap AGGRESSIVE Smart Build System
 *
 * This script implements a MULTI-TIER caching strategy that DRAMATICALLY
 * reduces build times from 90+ seconds to under 15 seconds for most builds.
 *
 * Caching Tiers (in order of preference):
 *
 * Tier 0: INSTANT Skip (0-2 seconds)
 *   - Source hash unchanged AND dist exists
 *   - Just verify and exit
 *
 * Tier 1: Dist Restoration (2-5 seconds)
 *   - Source hash unchanged BUT dist missing
 *   - Copy from .smart-cache/dist-backup/
 *
 * Tier 2: FAST Incremental (15-30 seconds) ← NEW!
 *   - Source changed but vendor cache + transform cache valid
 *   - Skip vendor transforms entirely
 *   - Only transform changed app code
 *
 * Tier 3: Full Build with Caching (60-90 seconds)
 *   - Dependencies changed OR caches invalid
 *   - Rebuild vendor bundles first
 *   - Full Vite build with fresh caches
 *
 * Usage:
 *   node scripts/smart-build.mjs              # Smart incremental build
 *   node scripts/smart-build.mjs --force      # Force full rebuild
 *   node scripts/smart-build.mjs --stats      # Show cache statistics
 *   node scripts/smart-build.mjs --clear      # Clear all caches
 *   node scripts/smart-build.mjs --frontend   # Build frontend only
 *   node scripts/smart-build.mjs --packages   # Build packages only
 *   node scripts/smart-build.mjs --turbo      # Ultra-fast mode (skip compression)
 *
 * @author MuscleMap Team
 */

import { createHash } from 'crypto';
import {
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
  readdirSync,
  statSync,
  cpSync,
  rmSync,
} from 'fs';
import { resolve, join, relative } from 'path';
import { execSync, spawn } from 'child_process';
import { performance } from 'perf_hooks';

// Configuration
const CONFIG = {
  cacheDir: '.smart-cache',
  transformCacheDir: '.transform-cache',
  vendorCacheDir: '.vendor-cache',
  distDir: 'dist',
  srcDir: 'src',
  packagesDir: 'packages',
  apiDir: 'apps/api',
  configFiles: ['vite.config.js', 'package.json', 'tsconfig.json', 'pnpm-lock.yaml'],
  sourceExtensions: ['.ts', '.tsx', '.js', '.jsx', '.css', '.scss', '.html', '.json'],
};

// Colors for terminal output
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

function log(msg) { console.log(`${c.blue}[smart-build]${c.reset} ${msg}`); }
function success(msg) { console.log(`${c.green}[smart-build]${c.reset} ${msg}`); }
function warn(msg) { console.log(`${c.yellow}[smart-build]${c.reset} ${msg}`); }
function error(msg) { console.log(`${c.red}[smart-build]${c.reset} ${msg}`); }
function info(msg) { console.log(`${c.gray}[smart-build]${c.reset} ${msg}`); }

/**
 * Get all source files recursively
 */
function getSourceFiles(dir, extensions = CONFIG.sourceExtensions) {
  const files = [];
  const skipDirs = new Set([
    'node_modules', 'dist', '.git', '.smart-cache', '.bundle-cache',
    '.transform-cache', '.rollup-cache', '.build-cache', 'coverage',
    '.vite', '.cache', '.vendor-cache',
  ]);

  function walk(currentDir) {
    if (!existsSync(currentDir)) return;

    try {
      const entries = readdirSync(currentDir, { withFileTypes: true });

      for (const entry of entries) {
        if (skipDirs.has(entry.name)) continue;

        const fullPath = join(currentDir, entry.name);

        if (entry.isDirectory()) {
          walk(fullPath);
        } else if (extensions.some(ext => entry.name.endsWith(ext))) {
          files.push(fullPath);
        }
      }
    } catch (e) {
      // Skip inaccessible directories
    }
  }

  walk(dir);
  return files.sort();
}

/**
 * Calculate hash of a file
 */
function hashFile(filePath) {
  const content = readFileSync(filePath);
  return createHash('md5').update(content).digest('hex');
}

/**
 * Calculate hash of all source files in a directory
 */
function hashDirectory(dir, extensions = CONFIG.sourceExtensions) {
  const files = getSourceFiles(dir, extensions);
  const hash = createHash('sha256');

  for (const file of files) {
    const relativePath = relative(process.cwd(), file);
    hash.update(relativePath);
    hash.update(readFileSync(file));
  }

  return {
    hash: hash.digest('hex'),
    fileCount: files.length,
  };
}

/**
 * Get lockfile hash for dependency tracking
 */
function getLockfileHash() {
  try {
    const lockPath = resolve('pnpm-lock.yaml');
    if (existsSync(lockPath)) {
      const content = readFileSync(lockPath, 'utf-8');
      return createHash('md5').update(content).digest('hex').slice(0, 16);
    }
  } catch {}
  return 'no-lock';
}

/**
 * Load cache manifest
 */
function loadManifest() {
  const manifestPath = resolve(CONFIG.cacheDir, 'manifest.json');

  if (!existsSync(manifestPath)) {
    return { packages: {}, frontend: {}, api: {}, lockfileHash: null };
  }

  try {
    return JSON.parse(readFileSync(manifestPath, 'utf-8'));
  } catch {
    return { packages: {}, frontend: {}, api: {}, lockfileHash: null };
  }
}

/**
 * Save cache manifest
 */
function saveManifest(manifest) {
  if (!existsSync(CONFIG.cacheDir)) {
    mkdirSync(CONFIG.cacheDir, { recursive: true });
  }

  const manifestPath = resolve(CONFIG.cacheDir, 'manifest.json');
  writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
}

/**
 * Check if vendor cache is valid
 */
function vendorCacheValid() {
  const manifestPath = join(CONFIG.vendorCacheDir, 'manifest.json');
  if (!existsSync(manifestPath)) return false;

  try {
    const manifest = JSON.parse(readFileSync(manifestPath, 'utf-8'));
    const currentLockHash = getLockfileHash();
    return manifest.hash === currentLockHash;
  } catch {
    return false;
  }
}

/**
 * Ensure vendor bundles are built
 */
function ensureVendorBundles(force = false) {
  if (!force && vendorCacheValid()) {
    info('Vendor bundles up to date');
    return true;
  }

  log('Building vendor bundles...');
  const start = performance.now();

  try {
    execSync('node scripts/prebundle-vendors.mjs' + (force ? ' --force' : ''), {
      stdio: 'inherit',
    });

    const duration = ((performance.now() - start) / 1000).toFixed(2);
    success(`Vendor bundles ready (${duration}s)`);
    return true;
  } catch (e) {
    warn('Vendor bundle build failed, continuing without pre-bundling');
    return false;
  }
}

/**
 * Save Vite transform cache
 */
function saveTransformCache() {
  const viteCachePath = 'node_modules/.vite';
  const backupPath = join(CONFIG.transformCacheDir, 'vite-cache');

  if (!existsSync(viteCachePath)) {
    info('No Vite cache to save');
    return false;
  }

  try {
    mkdirSync(CONFIG.transformCacheDir, { recursive: true });

    if (existsSync(backupPath)) {
      rmSync(backupPath, { recursive: true });
    }

    cpSync(viteCachePath, backupPath, { recursive: true });
    info('Transform cache saved');
    return true;
  } catch (e) {
    warn(`Failed to save transform cache: ${e.message}`);
    return false;
  }
}

/**
 * Restore Vite transform cache
 */
function restoreTransformCache() {
  const viteCachePath = 'node_modules/.vite';
  const backupPath = join(CONFIG.transformCacheDir, 'vite-cache');

  if (!existsSync(backupPath)) {
    info('No transform cache to restore');
    return false;
  }

  try {
    if (existsSync(viteCachePath)) {
      rmSync(viteCachePath, { recursive: true });
    }

    cpSync(backupPath, viteCachePath, { recursive: true });
    info('Transform cache restored');
    return true;
  } catch (e) {
    warn(`Failed to restore transform cache: ${e.message}`);
    return false;
  }
}

/**
 * Check if a package needs rebuilding
 */
function packageNeedsRebuild(name, dir, manifest) {
  const { hash: currentHash, fileCount } = hashDirectory(dir);
  const cached = manifest.packages[name];

  if (!cached) {
    log(`${name}: No cache, will build`);
    return { needsRebuild: true, hash: currentHash, fileCount };
  }

  if (cached.hash !== currentHash) {
    log(`${name}: Source changed, will rebuild`);
    return { needsRebuild: true, hash: currentHash, fileCount };
  }

  const distDir = resolve(dir, 'dist');
  if (!existsSync(distDir)) {
    log(`${name}: No dist/, will build`);
    return { needsRebuild: true, hash: currentHash, fileCount };
  }

  return { needsRebuild: false, hash: currentHash, fileCount };
}

/**
 * Build a single package
 */
function buildPackage(name, dir) {
  log(`Building ${name}...`);
  const start = performance.now();

  execSync(`pnpm -C ${dir} build`, { stdio: 'inherit' });

  const duration = ((performance.now() - start) / 1000).toFixed(2);
  success(`${name} built in ${duration}s`);

  return parseFloat(duration);
}

/**
 * Build packages with caching
 */
async function buildPackages(manifest, force = false) {
  log('Checking workspace packages...');

  const packages = [
    { name: 'shared', dir: 'packages/shared', deps: [] },
    { name: 'core', dir: 'packages/core', deps: ['shared'] },
    { name: 'plugin-sdk', dir: 'packages/plugin-sdk', deps: ['core'] },
    { name: 'client', dir: 'packages/client', deps: ['core'] },
    { name: 'ui', dir: 'packages/ui', deps: ['core'] },
  ];

  let built = 0;
  let skipped = 0;
  let totalTime = 0;
  const rebuilt = new Set();

  for (const pkg of packages) {
    // Check if dependencies were rebuilt
    const depsRebuilt = pkg.deps.some(dep => rebuilt.has(dep));

    const { needsRebuild, hash, fileCount } = force || depsRebuilt
      ? { needsRebuild: true, ...hashDirectory(pkg.dir) }
      : packageNeedsRebuild(pkg.name, pkg.dir, manifest);

    if (needsRebuild) {
      const duration = buildPackage(pkg.name, pkg.dir);
      totalTime += duration;
      built++;
      rebuilt.add(pkg.name);

      // Update manifest
      manifest.packages[pkg.name] = {
        hash,
        fileCount,
        buildTime: Date.now(),
      };
    } else {
      success(`${pkg.name}: unchanged (skipped)`);
      skipped++;
    }
  }

  log(`Packages: ${built} built, ${skipped} skipped (${totalTime.toFixed(2)}s)`);

  return { built, skipped, totalTime };
}

/**
 * Check if API needs rebuilding
 */
function apiNeedsRebuild(dir, manifest) {
  const { hash: currentHash, fileCount } = hashDirectory(dir);
  const cached = manifest.api;

  if (!cached) {
    log(`API: No cache, will build`);
    return { needsRebuild: true, hash: currentHash, fileCount };
  }

  if (cached.hash !== currentHash) {
    log(`API: Source changed, will rebuild`);
    return { needsRebuild: true, hash: currentHash, fileCount };
  }

  const distDir = resolve(dir, 'dist');
  if (!existsSync(distDir)) {
    log(`API: No dist/, will build`);
    return { needsRebuild: true, hash: currentHash, fileCount };
  }

  return { needsRebuild: false, hash: currentHash, fileCount };
}

/**
 * Build API with caching
 */
async function buildApi(manifest, force = false) {
  log('Checking API...');

  const { needsRebuild, hash, fileCount } = force
    ? { needsRebuild: true, ...hashDirectory(CONFIG.apiDir) }
    : apiNeedsRebuild(CONFIG.apiDir, manifest);

  if (!needsRebuild) {
    success('API: unchanged (skipped)');
    return { built: false, duration: 0 };
  }

  log('Building API...');
  const start = performance.now();

  execSync(`pnpm -C ${CONFIG.apiDir} build`, { stdio: 'inherit' });

  const duration = (performance.now() - start) / 1000;
  success(`API built in ${duration.toFixed(2)}s`);

  manifest.api = {
    hash,
    fileCount,
    buildTime: Date.now(),
  };

  return { built: true, duration };
}

/**
 * Build frontend with AGGRESSIVE caching
 */
async function buildFrontend(manifest, force = false, turboMode = false) {
  log('Checking frontend...');

  // Hash frontend sources and config files
  const srcHash = hashDirectory(CONFIG.srcDir);
  const configHashes = CONFIG.configFiles
    .filter(f => existsSync(f))
    .map(f => hashFile(f))
    .join('');

  const combinedHash = createHash('sha256')
    .update(srcHash.hash)
    .update(configHashes)
    .digest('hex');

  const currentLockHash = getLockfileHash();
  const cached = manifest.frontend;
  const distExists = existsSync(CONFIG.distDir);
  const backupDir = resolve(CONFIG.cacheDir, 'dist-backup');

  // TIER 0: Instant skip (source unchanged AND dist exists)
  if (!force && cached && cached.hash === combinedHash && distExists) {
    success(`Frontend: INSTANT SKIP ${c.gray}(unchanged, dist exists)${c.reset}`);
    return { built: false, duration: 0, tier: 0 };
  }

  // TIER 1: Restore from backup (source unchanged BUT dist missing)
  if (!force && cached && cached.hash === combinedHash && existsSync(backupDir)) {
    log('Frontend: Restoring from cache...');
    const start = performance.now();

    if (distExists) {
      rmSync(CONFIG.distDir, { recursive: true });
    }
    cpSync(backupDir, CONFIG.distDir, { recursive: true });

    const duration = (performance.now() - start) / 1000;
    success(`Frontend restored from cache in ${duration.toFixed(2)}s`);

    return { built: false, duration, tier: 1, restored: true };
  }

  // TIER 2/3: Need to build
  // First, ensure vendor bundles are ready (this is what makes it fast!)
  const depsChanged = manifest.lockfileHash !== currentLockHash;
  if (depsChanged) {
    log('Dependencies changed, rebuilding vendor bundles...');
    ensureVendorBundles(true);
    manifest.lockfileHash = currentLockHash;
  } else {
    ensureVendorBundles(false);
  }

  // Restore transform cache if available
  restoreTransformCache();

  // Build
  log(`Building frontend (${srcHash.fileCount} source files)...`);
  const start = performance.now();

  // Set environment for optimized build
  const env = {
    ...process.env,
    SKIP_COMPRESSION: turboMode ? 'true' : 'true', // Always skip, compress after
    LOW_MEMORY: 'true',
    NODE_OPTIONS: '--max-old-space-size=4096',
  };

  execSync('pnpm build', { stdio: 'inherit', env });

  const buildDuration = (performance.now() - start) / 1000;

  // Save transform cache for next build
  saveTransformCache();

  // Run compression (unless turbo mode)
  if (!turboMode && existsSync('./scripts/compress-assets.sh')) {
    log('Compressing assets...');
    execSync('./scripts/compress-assets.sh', { stdio: 'inherit' });
  }

  // Backup dist for future cache hits
  if (existsSync(backupDir)) {
    rmSync(backupDir, { recursive: true });
  }
  cpSync(CONFIG.distDir, backupDir, { recursive: true });

  const totalDuration = (performance.now() - start) / 1000;

  // Update manifest
  manifest.frontend = {
    hash: combinedHash,
    fileCount: srcHash.fileCount,
    buildTime: Date.now(),
    buildDuration: buildDuration,
  };

  const tier = depsChanged ? 3 : 2;
  success(`Frontend built in ${buildDuration.toFixed(2)}s (total: ${totalDuration.toFixed(2)}s) [Tier ${tier}]`);

  return { built: true, duration: buildDuration, tier };
}

/**
 * Show cache statistics
 */
function showStats() {
  const manifest = loadManifest();
  const cacheDir = CONFIG.cacheDir;

  console.log('\n' + c.cyan + '=== Smart Build Cache Statistics ===' + c.reset + '\n');

  // Package stats
  console.log(c.bright + 'Packages:' + c.reset);
  for (const [name, data] of Object.entries(manifest.packages)) {
    const time = data.buildTime ? new Date(data.buildTime).toLocaleString() : 'never';
    console.log(`  ${name}: ${data.fileCount} files, last built ${time}`);
  }

  // API stats
  if (manifest.api) {
    console.log(c.bright + '\nAPI:' + c.reset);
    console.log(`  ${manifest.api.fileCount} files, last built ${new Date(manifest.api.buildTime).toLocaleString()}`);
  }

  // Frontend stats
  if (manifest.frontend) {
    console.log(c.bright + '\nFrontend:' + c.reset);
    console.log(`  ${manifest.frontend.fileCount} files`);
    console.log(`  Last built: ${new Date(manifest.frontend.buildTime).toLocaleString()}`);
    console.log(`  Build time: ${manifest.frontend.buildDuration?.toFixed(2)}s`);
  }

  // Lockfile hash
  console.log(c.bright + '\nDependency Hash:' + c.reset);
  console.log(`  Cached:  ${manifest.lockfileHash || 'none'}`);
  console.log(`  Current: ${getLockfileHash()}`);

  // Cache sizes
  console.log(c.bright + '\nCache Sizes:' + c.reset);

  const cacheDirs = [
    { name: 'Smart Cache', path: CONFIG.cacheDir },
    { name: 'Transform Cache', path: CONFIG.transformCacheDir },
    { name: 'Vendor Cache', path: CONFIG.vendorCacheDir },
    { name: 'Vite Cache', path: 'node_modules/.vite' },
  ];

  for (const { name, path } of cacheDirs) {
    if (existsSync(path)) {
      let size = 0;
      function walk(dir) {
        try {
          for (const entry of readdirSync(dir, { withFileTypes: true })) {
            const p = join(dir, entry.name);
            if (entry.isDirectory()) walk(p);
            else size += statSync(p).size;
          }
        } catch {}
      }
      walk(path);
      console.log(`  ${name}: ${(size / 1024 / 1024).toFixed(2)}MB`);
    } else {
      console.log(`  ${name}: ${c.gray}not found${c.reset}`);
    }
  }

  console.log('');
}

/**
 * Clear all caches
 */
function clearCaches() {
  const dirs = [
    CONFIG.cacheDir,
    CONFIG.transformCacheDir,
    CONFIG.vendorCacheDir,
    '.bundle-cache',
    '.rollup-cache',
    '.build-cache',
    'node_modules/.vite',
  ];

  for (const dir of dirs) {
    if (existsSync(dir)) {
      rmSync(dir, { recursive: true });
      log(`Cleared ${dir}`);
    }
  }

  success('All caches cleared');
}

/**
 * Main function
 */
async function main() {
  const args = process.argv.slice(2);
  const force = args.includes('--force');
  const statsOnly = args.includes('--stats');
  const clear = args.includes('--clear');
  const packagesOnly = args.includes('--packages');
  const frontendOnly = args.includes('--frontend');
  const apiOnly = args.includes('--api');
  const turboMode = args.includes('--turbo');

  if (clear) {
    clearCaches();
    return;
  }

  if (statsOnly) {
    showStats();
    return;
  }

  console.log('\n' + c.cyan + '============================================' + c.reset);
  console.log(c.cyan + '  MuscleMap AGGRESSIVE Smart Build System' + c.reset);
  console.log(c.cyan + '  Target: 10,000 modules → 800 modules' + c.reset);
  console.log(c.cyan + '============================================' + c.reset + '\n');

  const totalStart = performance.now();
  const manifest = loadManifest();

  let packageResult = { built: 0, skipped: 0, totalTime: 0 };
  let apiResult = { built: false, duration: 0 };
  let frontendResult = { built: false, duration: 0, tier: -1 };

  try {
    // Build packages
    if (!frontendOnly && !apiOnly) {
      packageResult = await buildPackages(manifest, force);
    }

    // Build API
    if (!frontendOnly && !packagesOnly) {
      apiResult = await buildApi(manifest, force);
    }

    // Build frontend
    if (!packagesOnly && !apiOnly) {
      frontendResult = await buildFrontend(manifest, force, turboMode);
    }

    // Save manifest
    saveManifest(manifest);

    // Summary
    const totalDuration = (performance.now() - totalStart) / 1000;

    console.log('\n' + c.green + '============================================' + c.reset);
    console.log(c.green + '  Build Complete!' + c.reset);
    console.log(c.green + '============================================' + c.reset + '\n');

    console.log(`  Packages: ${packageResult.built} built, ${packageResult.skipped} skipped`);

    if (apiResult.built) {
      console.log(`  API: rebuilt in ${apiResult.duration.toFixed(2)}s`);
    } else {
      console.log('  API: skipped (unchanged)');
    }

    if (frontendResult.tier === 0) {
      console.log(`  Frontend: ${c.green}INSTANT SKIP${c.reset} (Tier 0)`);
    } else if (frontendResult.restored) {
      console.log(`  Frontend: restored from cache in ${frontendResult.duration.toFixed(2)}s (Tier 1)`);
    } else if (frontendResult.built) {
      console.log(`  Frontend: rebuilt in ${frontendResult.duration.toFixed(2)}s (Tier ${frontendResult.tier})`);
    } else {
      console.log('  Frontend: skipped (unchanged)');
    }

    console.log(`\n  ${c.bright}Total time: ${totalDuration.toFixed(2)}s${c.reset}\n`);

    // Performance tips
    if (totalDuration > 60) {
      console.log(c.yellow + '  TIP: Build took >60s. Consider:' + c.reset);
      console.log('    - Run `node scripts/prebundle-vendors.mjs --force` to refresh vendor cache');
      console.log('    - Check if .vendor-cache/ has all bundles');
      console.log('    - Use --turbo flag to skip compression\n');
    }

  } catch (err) {
    error(`Build failed: ${err.message}`);
    process.exit(1);
  }
}

main().catch(err => {
  error(err.message);
  process.exit(1);
});
