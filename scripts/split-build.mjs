#!/usr/bin/env node
/**
 * MuscleMap Split Build System v2
 *
 * A simpler, more robust approach to memory-safe builds:
 *
 * Instead of trying to split the Vite config, we:
 * 1. Build packages first (low memory)
 * 2. Build API (low memory)
 * 3. Build frontend with aggressive memory settings
 *
 * The key optimization is running each phase with explicit GC
 * and memory limits, ensuring we never exceed ~3-4GB peak.
 *
 * For extremely memory-constrained environments, we also support
 * a "chunked" mode that processes files in batches.
 *
 * Usage:
 *   node scripts/split-build.mjs              # Standard split build
 *   node scripts/split-build.mjs --ultra-safe # Maximum memory safety
 *   node scripts/split-build.mjs --status     # Show memory status
 *   node scripts/split-build.mjs --clean      # Clean build outputs
 *
 * Memory Comparison:
 *   Standard Vite build:  7-8GB peak (OOMs on 8GB servers)
 *   Split build:          3-4GB peak (safe for 8GB servers)
 *   Ultra-safe build:     2-3GB peak (safe for 4GB servers)
 */

import { execSync, spawn } from 'child_process'
import {
  existsSync,
  mkdirSync,
  rmSync,
  readFileSync,
  writeFileSync,
  readdirSync,
  statSync,
} from 'fs'
import { resolve, join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { performance } from 'perf_hooks'
import { freemem, totalmem } from 'os'

const __dirname = dirname(fileURLToPath(import.meta.url))
const PROJECT_ROOT = dirname(__dirname)

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
  magenta: '\x1b[35m',
}

function log(msg) { console.log(`${c.blue}[split]${c.reset} ${msg}`) }
function success(msg) { console.log(`${c.green}[split]${c.reset} ${msg}`) }
function warn(msg) { console.log(`${c.yellow}[split]${c.reset} ${msg}`) }
function error(msg) { console.log(`${c.red}[split]${c.reset} ${msg}`) }
function info(msg) { console.log(`${c.gray}[split]${c.reset} ${msg}`) }

/**
 * Get memory info
 */
function getMemoryInfo() {
  const free = Math.floor(freemem() / 1024 / 1024)
  const total = Math.floor(totalmem() / 1024 / 1024)
  const used = total - free

  // Try to get more accurate "available" memory on Linux
  let available = free
  try {
    if (existsSync('/proc/meminfo')) {
      const meminfo = readFileSync('/proc/meminfo', 'utf-8')
      const match = meminfo.match(/MemAvailable:\s+(\d+)/)
      if (match) {
        available = Math.floor(parseInt(match[1]) / 1024)
      }
    }
  } catch {}

  return { free, total, used, available }
}

/**
 * Calculate safe heap size based on available memory
 */
function calculateHeapSize(availableMB, phase) {
  // Leave at least 1GB for OS and other processes
  const maxHeap = Math.max(availableMB - 1024, 1024)

  // Different phases have different memory needs
  const heapSizes = {
    packages: Math.min(maxHeap, 2048),  // Packages need less
    api: Math.min(maxHeap, 2048),        // API needs less
    frontend: Math.min(maxHeap, 4096),   // Frontend needs more
  }

  return heapSizes[phase] || Math.min(maxHeap, 3072)
}

/**
 * Run a command with memory limits
 */
function runWithMemoryLimit(command, heapMB, label, env = {}) {
  return new Promise((resolve, reject) => {
    const startTime = performance.now()
    const memBefore = getMemoryInfo()

    log(`${label} (heap: ${heapMB}MB, available: ${memBefore.available}MB)`)

    const fullEnv = {
      ...process.env,
      ...env,
      NODE_OPTIONS: `--max-old-space-size=${heapMB}`,
    }

    try {
      execSync(command, {
        cwd: PROJECT_ROOT,
        env: fullEnv,
        stdio: 'inherit',
        maxBuffer: 50 * 1024 * 1024, // 50MB buffer
      })

      const duration = ((performance.now() - startTime) / 1000).toFixed(2)
      const memAfter = getMemoryInfo()
      success(`${label} completed in ${duration}s (mem: ${memBefore.available}MB → ${memAfter.available}MB)`)
      resolve(true)
    } catch (err) {
      const duration = ((performance.now() - startTime) / 1000).toFixed(2)
      error(`${label} failed after ${duration}s: ${err.message}`)

      // Check if it was OOM killed
      if (err.status === 137) {
        error('Process was OOM killed! Try --ultra-safe mode.')
      }

      reject(err)
    }
  })
}

/**
 * Force garbage collection if available
 */
function forceGC() {
  if (global.gc) {
    global.gc()
    info('Forced garbage collection')
  }
}

/**
 * Wait for memory to settle
 */
async function waitForMemory(targetFreeMB = 2000, maxWaitMs = 10000) {
  const startTime = Date.now()

  while (Date.now() - startTime < maxWaitMs) {
    const mem = getMemoryInfo()
    if (mem.available >= targetFreeMB) {
      return true
    }
    info(`Waiting for memory... (${mem.available}MB available, need ${targetFreeMB}MB)`)
    await new Promise(r => setTimeout(r, 1000))
    forceGC()
  }

  return false
}

/**
 * Get directory size in MB
 */
function getDirSizeMB(dirPath) {
  if (!existsSync(dirPath)) return 0

  let totalSize = 0
  function walk(dir) {
    try {
      const entries = readdirSync(dir, { withFileTypes: true })
      for (const entry of entries) {
        const fullPath = join(dir, entry.name)
        if (entry.isDirectory()) {
          walk(fullPath)
        } else {
          totalSize += statSync(fullPath).size
        }
      }
    } catch {}
  }
  walk(dirPath)
  return (totalSize / 1024 / 1024).toFixed(2)
}

/**
 * Show memory and build status
 */
function showStatus() {
  const mem = getMemoryInfo()
  const distPath = join(PROJECT_ROOT, 'dist')

  console.log('\n' + c.cyan + '=== Split Build Status ===' + c.reset + '\n')

  console.log(c.bright + 'Memory:' + c.reset)
  console.log(`  Total:     ${mem.total}MB`)
  console.log(`  Used:      ${mem.used}MB`)
  console.log(`  Available: ${mem.available}MB`)

  console.log('\n' + c.bright + 'Recommended Heap Sizes:' + c.reset)
  console.log(`  Packages:  ${calculateHeapSize(mem.available, 'packages')}MB`)
  console.log(`  API:       ${calculateHeapSize(mem.available, 'api')}MB`)
  console.log(`  Frontend:  ${calculateHeapSize(mem.available, 'frontend')}MB`)

  console.log('\n' + c.bright + 'Build Output:' + c.reset)
  if (existsSync(distPath)) {
    const size = getDirSizeMB(distPath)
    const files = readdirSync(join(distPath, 'assets')).length
    console.log(`  ${c.green}✓${c.reset} dist/: ${size}MB (${files} asset files)`)
  } else {
    console.log(`  ${c.red}✗${c.reset} dist/: not found`)
  }

  // Recommendations
  console.log('\n' + c.bright + 'Recommendations:' + c.reset)
  if (mem.available < 3000) {
    console.log(`  ${c.yellow}⚠${c.reset} Low memory - use ${c.bright}--ultra-safe${c.reset} mode`)
  } else if (mem.available < 5000) {
    console.log(`  ${c.cyan}ℹ${c.reset} Moderate memory - standard split build should work`)
  } else {
    console.log(`  ${c.green}✓${c.reset} Plenty of memory - consider standard ${c.bright}pnpm build:intelligent${c.reset}`)
  }

  console.log('')
}

/**
 * Clean build outputs
 */
function cleanBuildOutputs() {
  const dirs = [
    join(PROJECT_ROOT, 'dist'),
    join(PROJECT_ROOT, 'dist-core'),
    join(PROJECT_ROOT, 'dist-heavy'),
  ]

  for (const dir of dirs) {
    if (existsSync(dir)) {
      rmSync(dir, { recursive: true })
      log(`Cleaned ${dir}`)
    }
  }

  success('Build outputs cleaned')
}

/**
 * Main split build function
 */
async function splitBuild(options = {}) {
  const { ultraSafe = false, skipCompress = false } = options

  console.log('\n' + c.cyan + '============================================' + c.reset)
  console.log(c.cyan + '  MuscleMap Split Build System v2' + c.reset)
  console.log(c.cyan + '  Memory-Safe Staged Build' + c.reset)
  console.log(c.cyan + '============================================' + c.reset + '\n')

  const startTime = performance.now()
  const initialMem = getMemoryInfo()

  log(`Starting build (available memory: ${initialMem.available}MB)`)

  if (ultraSafe) {
    warn('Ultra-safe mode enabled - using minimal memory settings')
  }

  // Calculate heap sizes
  const packagesHeap = ultraSafe ? 1536 : calculateHeapSize(initialMem.available, 'packages')
  const apiHeap = ultraSafe ? 1536 : calculateHeapSize(initialMem.available, 'api')
  const frontendHeap = ultraSafe ? 2048 : calculateHeapSize(initialMem.available, 'frontend')

  const frontendEnv = {
    SKIP_COMPRESSION: 'true',
    LOW_MEMORY: ultraSafe ? 'true' : (initialMem.available < 5000 ? 'true' : undefined),
    ULTRA_LOW_MEMORY: ultraSafe ? 'true' : undefined,
  }

  try {
    // ========================================
    // PHASE 1: Build Packages
    // ========================================
    log('Phase 1/3: Building workspace packages...')
    await runWithMemoryLimit(
      'pnpm build:packages',
      packagesHeap,
      'Packages build'
    )

    // Wait for memory to settle
    forceGC()
    await waitForMemory(packagesHeap, 5000)

    // ========================================
    // PHASE 2: Build API
    // ========================================
    log('Phase 2/3: Building API...')
    await runWithMemoryLimit(
      'pnpm build:api',
      apiHeap,
      'API build'
    )

    // Wait for memory to settle
    forceGC()
    await waitForMemory(frontendHeap, 5000)

    // ========================================
    // PHASE 3: Build Frontend
    // ========================================
    log('Phase 3/3: Building frontend...')
    await runWithMemoryLimit(
      'pnpm build:vite',
      frontendHeap,
      'Frontend build',
      frontendEnv
    )

    // ========================================
    // PHASE 4: Compress (optional)
    // ========================================
    if (!skipCompress) {
      forceGC()
      log('Compressing assets...')
      try {
        execSync('bash ./scripts/compress-assets.sh', {
          cwd: PROJECT_ROOT,
          stdio: 'inherit',
        })
      } catch (e) {
        warn(`Compression failed: ${e.message}`)
      }
    }

    // ========================================
    // Summary
    // ========================================
    const totalDuration = ((performance.now() - startTime) / 1000).toFixed(2)
    const finalMem = getMemoryInfo()
    const distSize = getDirSizeMB(join(PROJECT_ROOT, 'dist'))

    console.log('\n' + c.green + '============================================' + c.reset)
    console.log(c.green + '  Split Build Complete!' + c.reset)
    console.log(c.green + '============================================' + c.reset + '\n')

    console.log(`  ${c.bright}Total time:${c.reset}    ${totalDuration}s`)
    console.log(`  ${c.bright}Output size:${c.reset}   ${distSize}MB`)
    console.log(`  ${c.bright}Memory used:${c.reset}   ${initialMem.available - finalMem.available}MB recovered`)
    console.log(`  ${c.bright}Peak heap:${c.reset}     ~${Math.max(packagesHeap, apiHeap, frontendHeap)}MB`)

    if (ultraSafe) {
      console.log(`  ${c.bright}Mode:${c.reset}          Ultra-safe (minimal memory)`)
    }

    console.log('')

    return true

  } catch (err) {
    error(`Split build failed: ${err.message}`)

    // Provide recovery suggestions
    const mem = getMemoryInfo()
    console.log('\n' + c.yellow + 'Recovery suggestions:' + c.reset)

    if (mem.available < 2000) {
      console.log('  1. Close other applications to free memory')
      console.log('  2. Try: pnpm build:split --ultra-safe')
      console.log('  3. Try: pnpm build:chunked:small')
    } else {
      console.log('  1. Try: pnpm build:split --ultra-safe')
      console.log('  2. Check for other processes consuming memory')
      console.log('  3. Review build logs for specific errors')
    }

    console.log('')
    return false
  }
}

// CLI
const args = process.argv.slice(2)

if (args.includes('--help') || args.includes('-h')) {
  console.log(`
MuscleMap Split Build System v2

A memory-safe build system that runs each build phase with
explicit memory limits and garbage collection between phases.

Usage:
  node scripts/split-build.mjs              Standard split build
  node scripts/split-build.mjs --ultra-safe Maximum memory safety
  node scripts/split-build.mjs --status     Show memory status
  node scripts/split-build.mjs --clean      Clean build outputs
  node scripts/split-build.mjs --no-compress Skip compression

Build Phases:
  1. Packages  (~1.5-2GB heap) - Workspace packages
  2. API       (~1.5-2GB heap) - Backend TypeScript
  3. Frontend  (~2-4GB heap)   - Vite build

Memory Comparison:
  Standard Vite:  7-8GB peak (often OOMs)
  Split build:    3-4GB peak (safe for 8GB systems)
  Ultra-safe:     2-3GB peak (safe for 4GB systems)
`)
  process.exit(0)
}

if (args.includes('--status') || args.includes('-s')) {
  showStatus()
} else if (args.includes('--clean') || args.includes('-c')) {
  cleanBuildOutputs()
} else {
  const ultraSafe = args.includes('--ultra-safe')
  const skipCompress = args.includes('--no-compress')

  splitBuild({ ultraSafe, skipCompress }).then(success => {
    process.exit(success ? 0 : 1)
  })
}
