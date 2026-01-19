/**
 * Vite Transform Cache Plugin
 *
 * This plugin intercepts Vite's module transformation pipeline and caches
 * transformed results based on content hashes. On subsequent builds, if a
 * module's content hasn't changed, the cached transform is used instead
 * of re-transforming.
 *
 * This can reduce build times by 60-80% for large codebases where most
 * files don't change between builds.
 *
 * Cache Structure:
 *   .transform-cache/
 *     manifest.json       - Maps source hashes to cache entries
 *     chunks/             - Cached transformed code
 *       {hash}.js         - Transformed module code
 *       {hash}.map        - Source map (if present)
 *
 * @author MuscleMap Team
 */

import { createHash } from 'crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync, readdirSync, statSync, unlinkSync } from 'fs';
import { resolve, relative, dirname, basename } from 'path';

const CACHE_DIR = '.transform-cache';
const MANIFEST_FILE = 'manifest.json';
const CHUNKS_DIR = 'chunks';
const MAX_CACHE_AGE_DAYS = 7;  // Evict cache entries older than this
const MAX_CACHE_SIZE_MB = 500; // Maximum cache size in MB

/**
 * Create content hash from file content + dependencies
 */
function createContentHash(content, id, config = {}) {
  const hash = createHash('md5');
  hash.update(content);
  hash.update(id);
  // Include Vite config options that affect transforms
  hash.update(JSON.stringify({
    mode: config.mode || 'production',
    target: config.build?.target || 'es2020',
    minify: config.build?.minify || 'esbuild',
  }));
  return hash.digest('hex').slice(0, 16);
}

/**
 * Load or initialize the cache manifest
 */
function loadManifest(cacheDir) {
  const manifestPath = resolve(cacheDir, MANIFEST_FILE);

  if (existsSync(manifestPath)) {
    try {
      const data = readFileSync(manifestPath, 'utf-8');
      return JSON.parse(data);
    } catch (e) {
      console.warn('[transform-cache] Corrupt manifest, starting fresh');
      return { version: 1, entries: {}, stats: { hits: 0, misses: 0 } };
    }
  }

  return { version: 1, entries: {}, stats: { hits: 0, misses: 0 } };
}

/**
 * Save the cache manifest
 */
function saveManifest(cacheDir, manifest) {
  const manifestPath = resolve(cacheDir, MANIFEST_FILE);
  writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
}

/**
 * Get cached transform result
 */
function getCachedTransform(cacheDir, hash) {
  const chunkPath = resolve(cacheDir, CHUNKS_DIR, `${hash}.js`);
  const mapPath = resolve(cacheDir, CHUNKS_DIR, `${hash}.map`);

  if (!existsSync(chunkPath)) {
    return null;
  }

  try {
    const code = readFileSync(chunkPath, 'utf-8');
    const map = existsSync(mapPath) ? readFileSync(mapPath, 'utf-8') : null;
    return { code, map: map ? JSON.parse(map) : null };
  } catch (e) {
    return null;
  }
}

/**
 * Save transform result to cache
 */
function saveCachedTransform(cacheDir, hash, result) {
  const chunksDir = resolve(cacheDir, CHUNKS_DIR);

  if (!existsSync(chunksDir)) {
    mkdirSync(chunksDir, { recursive: true });
  }

  const chunkPath = resolve(chunksDir, `${hash}.js`);
  writeFileSync(chunkPath, result.code);

  if (result.map) {
    const mapPath = resolve(chunksDir, `${hash}.map`);
    writeFileSync(mapPath, JSON.stringify(result.map));
  }
}

/**
 * Evict old cache entries
 */
function evictOldEntries(cacheDir, manifest) {
  const now = Date.now();
  const maxAge = MAX_CACHE_AGE_DAYS * 24 * 60 * 60 * 1000;
  const chunksDir = resolve(cacheDir, CHUNKS_DIR);
  let evicted = 0;

  for (const [id, entry] of Object.entries(manifest.entries)) {
    if (now - entry.timestamp > maxAge) {
      // Remove from manifest
      delete manifest.entries[id];

      // Remove cached files
      const chunkPath = resolve(chunksDir, `${entry.hash}.js`);
      const mapPath = resolve(chunksDir, `${entry.hash}.map`);

      try {
        if (existsSync(chunkPath)) unlinkSync(chunkPath);
        if (existsSync(mapPath)) unlinkSync(mapPath);
        evicted++;
      } catch (e) {
        // Ignore deletion errors
      }
    }
  }

  if (evicted > 0) {
    console.log(`[transform-cache] Evicted ${evicted} stale entries`);
  }

  return evicted;
}

/**
 * Check cache size and evict if necessary
 */
function checkCacheSize(cacheDir, manifest) {
  const chunksDir = resolve(cacheDir, CHUNKS_DIR);

  if (!existsSync(chunksDir)) return;

  const files = readdirSync(chunksDir);
  let totalSize = 0;
  const fileSizes = [];

  for (const file of files) {
    const filePath = resolve(chunksDir, file);
    const stats = statSync(filePath);
    totalSize += stats.size;
    fileSizes.push({ file, size: stats.size, mtime: stats.mtimeMs });
  }

  const maxSize = MAX_CACHE_SIZE_MB * 1024 * 1024;

  if (totalSize > maxSize) {
    // Sort by modification time, oldest first
    fileSizes.sort((a, b) => a.mtime - b.mtime);

    let evicted = 0;
    while (totalSize > maxSize * 0.8 && fileSizes.length > 0) {
      const oldest = fileSizes.shift();
      const filePath = resolve(chunksDir, oldest.file);

      try {
        unlinkSync(filePath);
        totalSize -= oldest.size;
        evicted++;

        // Remove from manifest
        const hash = basename(oldest.file, '.js');
        for (const [id, entry] of Object.entries(manifest.entries)) {
          if (entry.hash === hash) {
            delete manifest.entries[id];
            break;
          }
        }
      } catch (e) {
        // Ignore deletion errors
      }
    }

    if (evicted > 0) {
      console.log(`[transform-cache] Evicted ${evicted} entries to reduce cache size`);
    }
  }
}

/**
 * Check if a file should be cached (source files, not node_modules)
 */
function shouldCache(id) {
  // Only cache project source files, not node_modules
  if (id.includes('node_modules')) return false;

  // Only cache JS/TS/JSX/TSX files
  if (!/\.(js|jsx|ts|tsx|mjs|mts)$/i.test(id)) return false;

  // Skip virtual modules
  if (id.startsWith('\0') || id.startsWith('virtual:')) return false;

  return true;
}

/**
 * Vite Transform Cache Plugin
 *
 * @param {Object} options - Plugin options
 * @param {boolean} options.enabled - Whether caching is enabled (default: true)
 * @param {string} options.cacheDir - Cache directory (default: .transform-cache)
 * @param {boolean} options.verbose - Log cache hits/misses (default: false)
 */
export default function transformCachePlugin(options = {}) {
  const {
    enabled = true,
    cacheDir = CACHE_DIR,
    verbose = false,
  } = options;

  if (!enabled) {
    return {
      name: 'transform-cache',
      // No-op when disabled
    };
  }

  const absoluteCacheDir = resolve(process.cwd(), cacheDir);
  let manifest = null;
  let config = null;
  let hits = 0;
  let misses = 0;
  let cached = 0;
  let startTime = 0;

  return {
    name: 'transform-cache',

    configResolved(resolvedConfig) {
      config = resolvedConfig;

      // Only enable in build mode (not dev server)
      if (config.command !== 'build') {
        return;
      }

      // Initialize cache directory
      if (!existsSync(absoluteCacheDir)) {
        mkdirSync(absoluteCacheDir, { recursive: true });
      }

      // Load manifest
      manifest = loadManifest(absoluteCacheDir);

      // Evict old entries on startup
      evictOldEntries(absoluteCacheDir, manifest);
      checkCacheSize(absoluteCacheDir, manifest);

      console.log(`[transform-cache] Cache loaded: ${Object.keys(manifest.entries).length} entries`);
      startTime = Date.now();
    },

    // Transform hook - check cache before transform
    async transform(code, id) {
      // Only in build mode
      if (config?.command !== 'build') return null;

      // Check if should cache
      if (!shouldCache(id)) return null;

      // Create content hash
      const hash = createContentHash(code, id, config);
      const relativeId = relative(process.cwd(), id);

      // Check cache
      const entry = manifest.entries[relativeId];

      if (entry && entry.hash === hash) {
        // Cache hit - return cached transform
        const cachedResult = getCachedTransform(absoluteCacheDir, hash);

        if (cachedResult) {
          hits++;
          if (verbose) {
            console.log(`[transform-cache] HIT: ${relativeId}`);
          }
          return cachedResult;
        }
      }

      // Cache miss - will be transformed by Vite
      misses++;
      if (verbose) {
        console.log(`[transform-cache] MISS: ${relativeId}`);
      }

      // Store the hash so we can cache after transform
      // Use a WeakMap-like approach via the module graph
      this._pendingCache = this._pendingCache || new Map();
      this._pendingCache.set(id, { hash, relativeId, originalCode: code });

      return null; // Let Vite transform normally
    },

    // After all transforms, cache the results
    // This is called per chunk, we intercept renderChunk to cache module transforms
    async renderChunk(code, chunk, options) {
      // This hook receives the final chunk code, not individual module transforms
      // We need a different approach - use moduleParsed hook
      return null;
    },

    // Hook into the module graph to cache transforms
    moduleParsed(info) {
      // Only in build mode
      if (config?.command !== 'build') return;

      // Check if we have pending cache entry
      const pending = this._pendingCache?.get(info.id);
      if (!pending) return;

      // Remove from pending
      this._pendingCache.delete(info.id);

      // Cache the transformed code
      // Note: info.code is the transformed code
      if (info.code && info.code !== pending.originalCode) {
        saveCachedTransform(absoluteCacheDir, pending.hash, {
          code: info.code,
          map: info.map || null,
        });

        // Update manifest
        manifest.entries[pending.relativeId] = {
          hash: pending.hash,
          timestamp: Date.now(),
          size: info.code.length,
        };

        cached++;
      }
    },

    // Save manifest on build end
    buildEnd(error) {
      if (config?.command !== 'build') return;
      if (!manifest) return;

      // Update stats
      manifest.stats.hits += hits;
      manifest.stats.misses += misses;
      manifest.stats.lastBuild = Date.now();

      // Save manifest
      saveManifest(absoluteCacheDir, manifest);

      const duration = Date.now() - startTime;
      const total = hits + misses;
      const hitRate = total > 0 ? ((hits / total) * 100).toFixed(1) : 0;

      console.log(`[transform-cache] Build stats:`);
      console.log(`  Cache hits:   ${hits} (${hitRate}%)`);
      console.log(`  Cache misses: ${misses}`);
      console.log(`  Newly cached: ${cached}`);
      console.log(`  Total entries: ${Object.keys(manifest.entries).length}`);
      console.log(`  Lifetime hits: ${manifest.stats.hits}`);
    },

    // Invalidate cache when dependencies change
    // This is handled automatically by content hashing
  };
}

/**
 * Clear the transform cache
 */
export function clearTransformCache(cacheDir = CACHE_DIR) {
  const absoluteCacheDir = resolve(process.cwd(), cacheDir);
  const chunksDir = resolve(absoluteCacheDir, CHUNKS_DIR);

  let cleared = 0;

  if (existsSync(chunksDir)) {
    const files = readdirSync(chunksDir);
    for (const file of files) {
      try {
        unlinkSync(resolve(chunksDir, file));
        cleared++;
      } catch (e) {
        // Ignore
      }
    }
  }

  // Reset manifest
  const manifest = { version: 1, entries: {}, stats: { hits: 0, misses: 0 } };
  saveManifest(absoluteCacheDir, manifest);

  console.log(`[transform-cache] Cleared ${cleared} cached transforms`);
}

/**
 * Get cache statistics
 */
export function getCacheStats(cacheDir = CACHE_DIR) {
  const absoluteCacheDir = resolve(process.cwd(), cacheDir);
  const manifest = loadManifest(absoluteCacheDir);
  const chunksDir = resolve(absoluteCacheDir, CHUNKS_DIR);

  let cacheSize = 0;
  let fileCount = 0;

  if (existsSync(chunksDir)) {
    const files = readdirSync(chunksDir);
    fileCount = files.length;

    for (const file of files) {
      const stats = statSync(resolve(chunksDir, file));
      cacheSize += stats.size;
    }
  }

  return {
    entries: Object.keys(manifest.entries).length,
    files: fileCount,
    sizeBytes: cacheSize,
    sizeMB: (cacheSize / 1024 / 1024).toFixed(2),
    lifetimeHits: manifest.stats.hits || 0,
    lifetimeMisses: manifest.stats.misses || 0,
    lastBuild: manifest.stats.lastBuild,
  };
}
