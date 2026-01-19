#!/usr/bin/env node
/**
 * Smart Build - Intelligent Incremental Build System for MuscleMap
 *
 * This script implements a multi-tier caching strategy to dramatically
 * reduce build times:
 *
 * Tier 1: Full Build Skip (fastest)
 *   - If no source files changed, copy cached dist/ directly
 *   - Typical time: 1-2 seconds
 *
 * Tier 2: Partial Rebuild
 *   - If only specific packages changed, rebuild only those
 *   - Reuse cached workspace packages
 *   - Typical time: 30-60 seconds
 *
 * Tier 3: Full Rebuild with Transform Cache
 *   - If many files changed, do full Vite build
 *   - But leverage esbuild's internal cache
 *   - Typical time: 2-3 minutes (vs 5+ without cache)
 *
 * Usage:
 *   node scripts/smart-build.mjs              # Smart incremental build
 *   node scripts/smart-build.mjs --force      # Force full rebuild
 *   node scripts/smart-build.mjs --stats      # Show cache statistics
 *   node scripts/smart-build.mjs --clear      # Clear all caches
 *   node scripts/smart-build.mjs --frontend   # Build frontend only
 *   node scripts/smart-build.mjs --packages   # Build packages only
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
  distDir: 'dist',
  srcDir: 'src',
  packagesDir: 'packages',
  apiDir: 'apps/api',
  configFiles: ['vite.config.js', 'package.json', 'tsconfig.json', 'pnpm-lock.yaml'],
  sourceExtensions: ['.ts', '.tsx', '.js', '.jsx', '.css', '.scss', '.html', '.json'],
};

// Colors for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(msg) { console.log(`${colors.blue}[smart-build]${colors.reset} ${msg}`); }
function success(msg) { console.log(`${colors.green}[smart-build]${colors.reset} ${msg}`); }
function warn(msg) { console.log(`${colors.yellow}[smart-build]${colors.reset} ${msg}`); }
function error(msg) { console.log(`${colors.red}[smart-build]${colors.reset} ${msg}`); }

/**
 * Get all source files recursively
 */
function getSourceFiles(dir, extensions = CONFIG.sourceExtensions) {
  const files = [];
  const skipDirs = new Set([
    'node_modules', 'dist', '.git', '.smart-cache', '.bundle-cache',
    '.transform-cache', '.rollup-cache', '.build-cache', 'coverage',
    '.vite', '.cache',
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
 * Load cache manifest
 */
function loadManifest() {
  const manifestPath = resolve(CONFIG.cacheDir, 'manifest.json');

  if (!existsSync(manifestPath)) {
    return { packages: {}, frontend: {}, api: {} };
  }

  try {
    return JSON.parse(readFileSync(manifestPath, 'utf-8'));
  } catch {
    return { packages: {}, frontend: {}, api: {} };
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
 * Build API with caching
 */
async function buildApi(manifest, force = false) {
  log('Checking API...');

  const { needsRebuild, hash, fileCount } = force
    ? { needsRebuild: true, ...hashDirectory(CONFIG.apiDir) }
    : packageNeedsRebuild('api', CONFIG.apiDir, manifest);

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
 * Build frontend with caching
 */
async function buildFrontend(manifest, force = false) {
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

  const cached = manifest.frontend;
  const distExists = existsSync(CONFIG.distDir);
  const backupDir = resolve(CONFIG.cacheDir, 'dist-backup');

  // Check if we can skip entirely
  if (!force && cached && cached.hash === combinedHash && distExists) {
    success('Frontend: unchanged (skipped)');
    return { built: false, duration: 0, skipped: true };
  }

  // Check if we can restore from backup
  if (!force && cached && cached.hash === combinedHash && existsSync(backupDir)) {
    log('Frontend: unchanged, restoring from cache...');
    const start = performance.now();

    if (distExists) {
      rmSync(CONFIG.distDir, { recursive: true });
    }
    cpSync(backupDir, CONFIG.distDir, { recursive: true });

    const duration = (performance.now() - start) / 1000;
    success(`Frontend restored from cache in ${duration.toFixed(2)}s`);

    return { built: false, duration, restored: true };
  }

  // Need to build
  log(`Building frontend (${srcHash.fileCount} source files)...`);
  const start = performance.now();

  // Set environment for optimized build
  const env = {
    ...process.env,
    SKIP_COMPRESSION: 'true',  // Compress post-build
    LOW_MEMORY: 'true',        // Conservative memory usage
    NODE_OPTIONS: '--max-old-space-size=4096',
  };

  execSync('pnpm build', { stdio: 'inherit', env });

  const buildDuration = (performance.now() - start) / 1000;

  // Run compression
  if (existsSync('./scripts/compress-assets.sh')) {
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

  success(`Frontend built in ${buildDuration.toFixed(2)}s (total: ${totalDuration.toFixed(2)}s)`);

  return { built: true, duration: buildDuration };
}

/**
 * Show cache statistics
 */
function showStats() {
  const manifest = loadManifest();
  const cacheDir = CONFIG.cacheDir;

  console.log('\n' + colors.cyan + '=== Smart Build Cache Statistics ===' + colors.reset + '\n');

  // Package stats
  console.log(colors.bright + 'Packages:' + colors.reset);
  for (const [name, data] of Object.entries(manifest.packages)) {
    const time = data.buildTime ? new Date(data.buildTime).toLocaleString() : 'never';
    console.log(`  ${name}: ${data.fileCount} files, last built ${time}`);
  }

  // API stats
  if (manifest.api) {
    console.log(colors.bright + '\nAPI:' + colors.reset);
    console.log(`  ${manifest.api.fileCount} files, last built ${new Date(manifest.api.buildTime).toLocaleString()}`);
  }

  // Frontend stats
  if (manifest.frontend) {
    console.log(colors.bright + '\nFrontend:' + colors.reset);
    console.log(`  ${manifest.frontend.fileCount} files`);
    console.log(`  Last built: ${new Date(manifest.frontend.buildTime).toLocaleString()}`);
    console.log(`  Build time: ${manifest.frontend.buildDuration?.toFixed(2)}s`);
  }

  // Cache size
  const backupDir = resolve(cacheDir, 'dist-backup');
  if (existsSync(backupDir)) {
    let size = 0;
    function walk(dir) {
      for (const entry of readdirSync(dir, { withFileTypes: true })) {
        const path = join(dir, entry.name);
        if (entry.isDirectory()) walk(path);
        else size += statSync(path).size;
      }
    }
    walk(backupDir);
    console.log(colors.bright + '\nCache size:' + colors.reset + ` ${(size / 1024 / 1024).toFixed(2)}MB`);
  }

  console.log('');
}

/**
 * Clear all caches
 */
function clearCaches() {
  const dirs = [
    CONFIG.cacheDir,
    '.bundle-cache',
    '.transform-cache',
    '.rollup-cache',
    '.build-cache',
  ];

  for (const dir of dirs) {
    if (existsSync(dir)) {
      rmSync(dir, { recursive: true });
      log(`Cleared ${dir}`);
    }
  }

  // Also clear Vite's cache
  const viteCache = 'node_modules/.vite';
  if (existsSync(viteCache)) {
    rmSync(viteCache, { recursive: true });
    log('Cleared node_modules/.vite');
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

  if (clear) {
    clearCaches();
    return;
  }

  if (statsOnly) {
    showStats();
    return;
  }

  console.log('\n' + colors.cyan + '============================================' + colors.reset);
  console.log(colors.cyan + '  MuscleMap Smart Build System' + colors.reset);
  console.log(colors.cyan + '============================================' + colors.reset + '\n');

  const totalStart = performance.now();
  const manifest = loadManifest();

  let packageResult = { built: 0, skipped: 0, totalTime: 0 };
  let apiResult = { built: false, duration: 0 };
  let frontendResult = { built: false, duration: 0 };

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
      frontendResult = await buildFrontend(manifest, force);
    }

    // Save manifest
    saveManifest(manifest);

    // Summary
    const totalDuration = (performance.now() - totalStart) / 1000;

    console.log('\n' + colors.green + '============================================' + colors.reset);
    console.log(colors.green + '  Build Complete!' + colors.reset);
    console.log(colors.green + '============================================' + colors.reset + '\n');

    console.log(`  Packages: ${packageResult.built} built, ${packageResult.skipped} skipped`);

    if (apiResult.built) {
      console.log(`  API: rebuilt in ${apiResult.duration.toFixed(2)}s`);
    } else {
      console.log('  API: skipped (unchanged)');
    }

    if (frontendResult.restored) {
      console.log(`  Frontend: restored from cache in ${frontendResult.duration.toFixed(2)}s`);
    } else if (frontendResult.skipped) {
      console.log('  Frontend: skipped (unchanged)');
    } else if (frontendResult.built) {
      console.log(`  Frontend: rebuilt in ${frontendResult.duration.toFixed(2)}s`);
    }

    console.log(`\n  ${colors.bright}Total time: ${totalDuration.toFixed(2)}s${colors.reset}\n`);

  } catch (err) {
    error(`Build failed: ${err.message}`);
    process.exit(1);
  }
}

main().catch(err => {
  error(err.message);
  process.exit(1);
});
