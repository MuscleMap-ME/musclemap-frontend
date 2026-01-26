#!/usr/bin/env bun
/**
 * Parallel Bun Package Builder
 *
 * Builds all workspace packages in parallel, respecting dependency order.
 * Uses topological sorting to determine build order.
 *
 * Usage:
 *   bun scripts/bun-build-packages-parallel.ts
 *   bun scripts/bun-build-packages-parallel.ts --force
 *
 * Build Order (respecting dependencies):
 *   Layer 1: shared (no deps)
 *   Layer 2: core (→ shared)
 *   Layer 3: plugin-sdk, client, ui (→ core, parallel)
 */

import { $ } from 'bun';
import { performance } from 'perf_hooks';

// Colors for output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  red: '\x1b[31m',
  dim: '\x1b[2m',
};

function log(msg: string) {
  console.log(`${colors.blue}[parallel-build]${colors.reset} ${msg}`);
}

function success(msg: string) {
  console.log(`${colors.green}[parallel-build]${colors.reset} ${msg}`);
}

function warn(msg: string) {
  console.log(`${colors.yellow}[parallel-build]${colors.reset} ${msg}`);
}

function error(msg: string) {
  console.error(`${colors.red}[parallel-build]${colors.reset} ${msg}`);
}

interface Package {
  name: string;
  path: string;
  dependencies: string[];
  buildCmd: string;
}

// Package definitions with dependency graph
const packages: Package[] = [
  {
    name: 'shared',
    path: 'packages/shared',
    dependencies: [],
    buildCmd: 'bun run ../../scripts/bun-build-package.ts .',
  },
  {
    name: 'core',
    path: 'packages/core',
    dependencies: ['shared'],
    buildCmd: 'bun run ../../scripts/bun-build-package.ts .',
  },
  {
    name: 'plugin-sdk',
    path: 'packages/plugin-sdk',
    dependencies: ['shared', 'core'],
    buildCmd: 'bun run ../../scripts/bun-build-package.ts .',
  },
  {
    name: 'client',
    path: 'packages/client',
    dependencies: ['shared', 'core'],
    buildCmd: 'pnpm build', // Uses tsup
  },
  {
    name: 'ui',
    path: 'packages/ui',
    dependencies: ['shared', 'core'],
    buildCmd: 'pnpm build', // Uses tsup
  },
];

// Topological sort to get build layers
function getBuildLayers(pkgs: Package[]): Package[][] {
  const layers: Package[][] = [];
  const built = new Set<string>();
  const remaining = [...pkgs];

  while (remaining.length > 0) {
    const layer: Package[] = [];

    for (let i = remaining.length - 1; i >= 0; i--) {
      const pkg = remaining[i];
      const depsBuilt = pkg.dependencies.every(dep => built.has(dep));

      if (depsBuilt) {
        layer.push(pkg);
        remaining.splice(i, 1);
      }
    }

    if (layer.length === 0 && remaining.length > 0) {
      error('Circular dependency detected!');
      process.exit(1);
    }

    layers.push(layer);
    layer.forEach(pkg => built.add(pkg.name));
  }

  return layers;
}

async function buildPackage(pkg: Package): Promise<{ name: string; duration: number; success: boolean }> {
  const start = performance.now();

  try {
    log(`Building ${colors.cyan}${pkg.name}${colors.reset}...`);

    const result = await $`cd ${pkg.path} && ${pkg.buildCmd.split(' ')}`.quiet().nothrow();

    const duration = Math.round(performance.now() - start);

    if (result.exitCode !== 0) {
      error(`${pkg.name} failed (${duration}ms)`);
      console.error(result.stderr.toString());
      return { name: pkg.name, duration, success: false };
    }

    success(`${pkg.name} built in ${duration}ms`);
    return { name: pkg.name, duration, success: true };
  } catch (err) {
    const duration = Math.round(performance.now() - start);
    error(`${pkg.name} error: ${err}`);
    return { name: pkg.name, duration, success: false };
  }
}

async function main() {
  const totalStart = performance.now();

  log('Starting parallel package build...');
  console.log();

  const layers = getBuildLayers(packages);

  log(`Build plan: ${layers.length} layers`);
  layers.forEach((layer, i) => {
    const pkgNames = layer.map(p => p.name).join(', ');
    console.log(`  Layer ${i + 1}: ${colors.cyan}${pkgNames}${colors.reset}`);
  });
  console.log();

  const results: { name: string; duration: number; success: boolean }[] = [];
  let hasFailure = false;

  for (let i = 0; i < layers.length; i++) {
    const layer = layers[i];
    log(`\n${colors.dim}─── Layer ${i + 1}/${layers.length} ───${colors.reset}`);

    // Build all packages in this layer in parallel
    const layerResults = await Promise.all(layer.map(pkg => buildPackage(pkg)));

    results.push(...layerResults);

    // Check for failures
    const failures = layerResults.filter(r => !r.success);
    if (failures.length > 0) {
      hasFailure = true;
      error(`Layer ${i + 1} had failures: ${failures.map(f => f.name).join(', ')}`);
      // Continue building other layers (dependent builds will likely fail but we'll see full picture)
    }
  }

  const totalDuration = Math.round(performance.now() - totalStart);

  console.log();
  log(`${colors.dim}─── Summary ───${colors.reset}`);
  console.log();

  // Print results table
  const maxNameLen = Math.max(...results.map(r => r.name.length));
  for (const result of results) {
    const status = result.success
      ? `${colors.green}✓${colors.reset}`
      : `${colors.red}✗${colors.reset}`;
    const name = result.name.padEnd(maxNameLen);
    const duration = `${result.duration}ms`.padStart(8);
    console.log(`  ${status} ${name}  ${colors.dim}${duration}${colors.reset}`);
  }

  console.log();

  if (hasFailure) {
    error(`Build completed with failures in ${totalDuration}ms`);
    process.exit(1);
  }

  success(`All packages built in ${totalDuration}ms`);

  // Show improvement estimate
  const sequentialTime = results.reduce((sum, r) => sum + r.duration, 0);
  if (sequentialTime > totalDuration) {
    const saved = sequentialTime - totalDuration;
    console.log(`  ${colors.dim}(Parallelization saved ~${saved}ms)${colors.reset}`);
  }
}

main().catch(err => {
  error(`Fatal error: ${err}`);
  process.exit(1);
});
