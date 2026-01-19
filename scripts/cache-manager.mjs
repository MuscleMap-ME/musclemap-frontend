#!/usr/bin/env node
/**
 * MuscleMap Build Cache Manager
 *
 * Unified CLI for managing all build caches:
 * - .smart-cache/     - Smart build source hashes + dist backup
 * - .build-cache/     - Package build hashes (build-safe.sh)
 * - .vendor-cache/    - Pre-bundled vendor bundles
 * - node_modules/.vite/ - Vite's dependency pre-bundling
 *
 * Usage:
 *   node scripts/cache-manager.mjs          # Show cache status
 *   node scripts/cache-manager.mjs stats    # Detailed statistics
 *   node scripts/cache-manager.mjs clear    # Clear all caches
 *   node scripts/cache-manager.mjs warm     # Pre-warm caches
 *   node scripts/cache-manager.mjs analyze  # Analyze cache effectiveness
 *
 * @author MuscleMap Team
 */

import {
  existsSync,
  readdirSync,
  statSync,
  rmSync,
  readFileSync,
  mkdirSync,
} from 'fs';
import { resolve, join, relative } from 'path';
import { execSync } from 'child_process';
import { performance } from 'perf_hooks';

// Cache directories
const CACHES = {
  smart: {
    dir: '.smart-cache',
    name: 'Smart Build Cache',
    description: 'Source hashes + dist backup for instant no-change builds',
  },
  build: {
    dir: '.build-cache',
    name: 'Package Build Cache',
    description: 'Package hashes for incremental package builds',
  },
  vendor: {
    dir: '.vendor-cache',
    name: 'Vendor Pre-bundle Cache',
    description: 'Pre-bundled heavy dependencies (Three.js, D3, etc.)',
  },
  vite: {
    dir: 'node_modules/.vite',
    name: 'Vite Dep Cache',
    description: "Vite's dependency pre-bundling cache",
  },
};

// Colors
const c = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
};

/**
 * Get directory size in bytes
 */
function getDirSize(dir) {
  if (!existsSync(dir)) return 0;

  let size = 0;

  function walk(currentDir) {
    try {
      const entries = readdirSync(currentDir, { withFileTypes: true });
      for (const entry of entries) {
        const path = join(currentDir, entry.name);
        if (entry.isDirectory()) {
          walk(path);
        } else {
          size += statSync(path).size;
        }
      }
    } catch (e) {
      // Skip inaccessible directories
    }
  }

  walk(dir);
  return size;
}

/**
 * Format bytes to human-readable
 */
function formatSize(bytes) {
  if (bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return (bytes / Math.pow(1024, i)).toFixed(2) + ' ' + units[i];
}

/**
 * Get file count in directory
 */
function getFileCount(dir) {
  if (!existsSync(dir)) return 0;

  let count = 0;

  function walk(currentDir) {
    try {
      const entries = readdirSync(currentDir, { withFileTypes: true });
      for (const entry of entries) {
        const path = join(currentDir, entry.name);
        if (entry.isDirectory()) {
          walk(path);
        } else {
          count++;
        }
      }
    } catch (e) {
      // Skip
    }
  }

  walk(dir);
  return count;
}

/**
 * Get cache info
 */
function getCacheInfo(cache) {
  const exists = existsSync(cache.dir);
  const size = exists ? getDirSize(cache.dir) : 0;
  const fileCount = exists ? getFileCount(cache.dir) : 0;
  let lastModified = null;

  if (exists) {
    try {
      const stat = statSync(cache.dir);
      lastModified = stat.mtime;
    } catch (e) {
      // Skip
    }
  }

  return {
    ...cache,
    exists,
    size,
    sizeFormatted: formatSize(size),
    fileCount,
    lastModified,
  };
}

/**
 * Show cache status (quick overview)
 */
function showStatus() {
  console.log(`\n${c.cyan}${c.bright}MuscleMap Build Caches${c.reset}\n`);

  let totalSize = 0;

  for (const [key, cache] of Object.entries(CACHES)) {
    const info = getCacheInfo(cache);
    totalSize += info.size;

    const status = info.exists
      ? `${c.green}ACTIVE${c.reset}`
      : `${c.dim}empty${c.reset}`;

    const sizeStr = info.exists
      ? `${c.white}${info.sizeFormatted}${c.reset}`
      : `${c.dim}0 B${c.reset}`;

    console.log(`  ${status.padEnd(20)} ${info.name.padEnd(25)} ${sizeStr}`);
  }

  console.log(`\n  ${c.bright}Total cache size: ${formatSize(totalSize)}${c.reset}\n`);
}

/**
 * Show detailed statistics
 */
function showStats() {
  console.log(`\n${c.cyan}${c.bright}=== Build Cache Statistics ===${c.reset}\n`);

  for (const [key, cache] of Object.entries(CACHES)) {
    const info = getCacheInfo(cache);

    console.log(`${c.bright}${info.name}${c.reset}`);
    console.log(`  ${c.dim}${info.description}${c.reset}`);
    console.log(`  Directory: ${info.dir}`);
    console.log(`  Status: ${info.exists ? c.green + 'Active' + c.reset : c.dim + 'Empty' + c.reset}`);

    if (info.exists) {
      console.log(`  Size: ${info.sizeFormatted}`);
      console.log(`  Files: ${info.fileCount}`);
      console.log(`  Last modified: ${info.lastModified?.toLocaleString() || 'unknown'}`);

      // Cache-specific details
      if (key === 'smart') {
        const manifestPath = join(info.dir, 'manifest.json');
        if (existsSync(manifestPath)) {
          try {
            const manifest = JSON.parse(readFileSync(manifestPath, 'utf-8'));
            if (manifest.frontend?.buildDuration) {
              console.log(`  Last build time: ${manifest.frontend.buildDuration.toFixed(2)}s`);
            }
            if (manifest.frontend?.fileCount) {
              console.log(`  Source files tracked: ${manifest.frontend.fileCount}`);
            }
          } catch (e) {
            // Skip
          }
        }
      }

      if (key === 'vendor') {
        // List vendor bundles
        try {
          const files = readdirSync(info.dir).filter(f => f.endsWith('.mjs'));
          if (files.length > 0) {
            console.log(`  Bundles: ${files.join(', ')}`);
          }
        } catch (e) {
          // Skip
        }
      }

      if (key === 'build') {
        // List cached package hashes
        try {
          const files = readdirSync(info.dir).filter(f => f.endsWith('.hash'));
          if (files.length > 0) {
            console.log(`  Packages cached: ${files.map(f => f.replace('.hash', '')).join(', ')}`);
          }
        } catch (e) {
          // Skip
        }
      }
    }

    console.log('');
  }
}

/**
 * Clear all caches
 */
function clearAll() {
  console.log(`\n${c.yellow}Clearing all caches...${c.reset}\n`);

  let totalCleared = 0;

  for (const [key, cache] of Object.entries(CACHES)) {
    if (existsSync(cache.dir)) {
      const size = getDirSize(cache.dir);
      rmSync(cache.dir, { recursive: true });
      totalCleared += size;
      console.log(`  ${c.green}Cleared${c.reset} ${cache.name} (${formatSize(size)})`);
    } else {
      console.log(`  ${c.dim}Skipped${c.reset} ${cache.name} (empty)`);
    }
  }

  console.log(`\n${c.green}Total cleared: ${formatSize(totalCleared)}${c.reset}\n`);
}

/**
 * Pre-warm caches
 */
async function warmCaches() {
  console.log(`\n${c.cyan}Pre-warming caches...${c.reset}\n`);

  // 1. Pre-bundle vendors
  console.log(`${c.bright}1. Pre-bundling vendors...${c.reset}`);
  try {
    if (existsSync('scripts/prebundle-vendors.mjs')) {
      execSync('node scripts/prebundle-vendors.mjs', { stdio: 'inherit' });
    } else {
      console.log(`  ${c.dim}No prebundle script found${c.reset}`);
    }
  } catch (e) {
    console.log(`  ${c.red}Failed: ${e.message}${c.reset}`);
  }

  // 2. Initialize Vite deps
  console.log(`\n${c.bright}2. Pre-bundling Vite dependencies...${c.reset}`);
  try {
    // Run Vite in optimize mode
    execSync('npx vite optimize', { stdio: 'inherit' });
  } catch (e) {
    console.log(`  ${c.dim}Vite optimize failed (normal for some setups)${c.reset}`);
  }

  // 3. Build packages to warm build-cache
  console.log(`\n${c.bright}3. Building packages (warming build cache)...${c.reset}`);
  try {
    execSync('pnpm build:packages', { stdio: 'inherit' });
  } catch (e) {
    console.log(`  ${c.red}Failed: ${e.message}${c.reset}`);
  }

  console.log(`\n${c.green}Cache warming complete!${c.reset}\n`);
}

/**
 * Analyze cache effectiveness
 */
function analyze() {
  console.log(`\n${c.cyan}${c.bright}=== Cache Effectiveness Analysis ===${c.reset}\n`);

  // Check smart cache
  const smartManifest = join(CACHES.smart.dir, 'manifest.json');
  if (existsSync(smartManifest)) {
    try {
      const manifest = JSON.parse(readFileSync(smartManifest, 'utf-8'));

      console.log(`${c.bright}Smart Build Cache:${c.reset}`);

      // Calculate potential time savings
      const avgBuildTime = manifest.frontend?.buildDuration || 300; // Default 5 min
      const potentialSavings = avgBuildTime - 2; // Assuming 2s for cache hit

      console.log(`  Average build time: ${avgBuildTime.toFixed(1)}s`);
      console.log(`  Cache hit time: ~2s`);
      console.log(`  ${c.green}Potential savings per no-change build: ${potentialSavings.toFixed(1)}s (${((potentialSavings / avgBuildTime) * 100).toFixed(0)}%)${c.reset}`);

      if (manifest.packages) {
        const pkgCount = Object.keys(manifest.packages).length;
        console.log(`  Packages tracked: ${pkgCount}`);
      }
    } catch (e) {
      console.log(`  ${c.dim}Unable to analyze (no data)${c.reset}`);
    }
  } else {
    console.log(`${c.dim}Smart cache not initialized. Run 'pnpm build:smart' first.${c.reset}`);
  }

  // Check vendor cache
  console.log(`\n${c.bright}Vendor Pre-bundle Cache:${c.reset}`);
  const vendorDir = CACHES.vendor.dir;
  if (existsSync(vendorDir)) {
    const bundles = readdirSync(vendorDir).filter(f => f.endsWith('.mjs'));
    let totalVendorSize = 0;

    for (const bundle of bundles) {
      const size = statSync(join(vendorDir, bundle)).size;
      totalVendorSize += size;
      console.log(`  ${bundle}: ${formatSize(size)}`);
    }

    console.log(`  ${c.green}Total vendor bundles: ${formatSize(totalVendorSize)}${c.reset}`);
    console.log(`  ${c.dim}These are pre-built and skip Vite transformation${c.reset}`);
  } else {
    console.log(`  ${c.dim}No vendor bundles. Run 'node scripts/prebundle-vendors.mjs'${c.reset}`);
  }

  // Source file statistics
  console.log(`\n${c.bright}Source File Analysis:${c.reset}`);

  function countFiles(dir, exts) {
    let count = 0;
    function walk(d) {
      if (!existsSync(d)) return;
      try {
        for (const entry of readdirSync(d, { withFileTypes: true })) {
          if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue;
          const path = join(d, entry.name);
          if (entry.isDirectory()) walk(path);
          else if (exts.some(e => entry.name.endsWith(e))) count++;
        }
      } catch (e) {
        // Skip
      }
    }
    walk(dir);
    return count;
  }

  const srcFiles = countFiles('src', ['.js', '.jsx', '.ts', '.tsx']);
  const pkgFiles = countFiles('packages', ['.ts', '.tsx']);
  const apiFiles = countFiles('apps/api', ['.ts']);

  console.log(`  Frontend src: ${srcFiles} files`);
  console.log(`  Packages: ${pkgFiles} files`);
  console.log(`  API: ${apiFiles} files`);
  console.log(`  ${c.bright}Total: ${srcFiles + pkgFiles + apiFiles} files${c.reset}`);

  // Recommendations
  console.log(`\n${c.cyan}${c.bright}Recommendations:${c.reset}`);

  const smartExists = existsSync(CACHES.smart.dir);
  const vendorExists = existsSync(CACHES.vendor.dir);

  if (!smartExists) {
    console.log(`  ${c.yellow}1. Run 'pnpm build:smart' to initialize smart caching${c.reset}`);
  }

  if (!vendorExists) {
    console.log(`  ${c.yellow}2. Run 'node scripts/prebundle-vendors.mjs' to pre-bundle vendors${c.reset}`);
  }

  if (srcFiles > 1000) {
    console.log(`  ${c.yellow}3. Consider code-splitting more aggressively (${srcFiles} files is substantial)${c.reset}`);
  }

  if (smartExists && vendorExists) {
    console.log(`  ${c.green}All caches are active. Subsequent builds should be fast!${c.reset}`);
  }

  console.log('');
}

/**
 * Show help
 */
function showHelp() {
  console.log(`
${c.cyan}${c.bright}MuscleMap Build Cache Manager${c.reset}

${c.bright}Usage:${c.reset}
  node scripts/cache-manager.mjs [command]

${c.bright}Commands:${c.reset}
  ${c.white}(none)${c.reset}    Show quick cache status
  ${c.white}stats${c.reset}     Show detailed statistics
  ${c.white}clear${c.reset}     Clear all caches
  ${c.white}warm${c.reset}      Pre-warm all caches
  ${c.white}analyze${c.reset}   Analyze cache effectiveness
  ${c.white}help${c.reset}      Show this help

${c.bright}Build Commands:${c.reset}
  ${c.white}pnpm build:smart${c.reset}        Incremental build with caching
  ${c.white}pnpm build:smart:force${c.reset}  Force full rebuild
  ${c.white}pnpm build:smart:stats${c.reset}  Show build cache stats
  ${c.white}pnpm build:cache:clear${c.reset}  Clear all caches
`);
}

// CLI
const command = process.argv[2] || 'status';

switch (command) {
  case 'status':
    showStatus();
    break;
  case 'stats':
    showStats();
    break;
  case 'clear':
    clearAll();
    break;
  case 'warm':
    warmCaches();
    break;
  case 'analyze':
    analyze();
    break;
  case 'help':
  case '--help':
  case '-h':
    showHelp();
    break;
  default:
    console.log(`Unknown command: ${command}`);
    showHelp();
}
