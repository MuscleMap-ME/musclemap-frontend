/**
 * @musclemap.me/wasm
 *
 * High-performance WebAssembly modules for MuscleMap.
 * All modules are compiled from Rust for maximum performance.
 *
 * @example
 * ```typescript
 * import { geo, crypto, scoring } from '@musclemap.me/wasm';
 *
 * // Geohash operations
 * const hash = geo.geohashEncode(37.7749, -122.4194, 9);
 *
 * // Cryptographic operations
 * const hashResult = crypto.sha256('hello');
 *
 * // Exercise scoring
 * const score = scoring.scoreExercise(exerciseData, userContext);
 * ```
 */

// Re-export all modules
export * as geo from './geo/index.js';
export * as tu from './tu/index.js';
export * as rank from './rank/index.js';
export * as ratelimit from './ratelimit/index.js';
export * as scoring from './scoring/index.js';
export * as load from './load/index.js';
export * as crypto from './crypto/index.js';

// Export version info
export const VERSION = '0.1.0';
export const MODULES = [
  'geo',
  'tu',
  'rank',
  'ratelimit',
  'scoring',
  'load',
  'crypto',
] as const;

/**
 * Check if WASM modules are available
 */
export async function isWasmAvailable(): Promise<boolean> {
  try {
    // Check if WebAssembly is supported
    if (typeof WebAssembly === 'undefined') {
      return false;
    }

    // Try to instantiate a minimal module
    const bytes = new Uint8Array([
      0x00, 0x61, 0x73, 0x6d, // WASM magic number
      0x01, 0x00, 0x00, 0x00, // Version 1
    ]);
    await WebAssembly.instantiate(bytes);
    return true;
  } catch {
    return false;
  }
}

/**
 * Initialize all WASM modules
 * Call this once at application startup for best performance
 */
export async function initializeAll(): Promise<void> {
  const { initGeo } = await import('./geo/index.js');
  const { initTU } = await import('./tu/index.js');
  const { initRank } = await import('./rank/index.js');
  const { initRatelimit } = await import('./ratelimit/index.js');
  const { initScoring } = await import('./scoring/index.js');
  const { initLoad } = await import('./load/index.js');
  const { initCrypto } = await import('./crypto/index.js');

  await Promise.all([
    initGeo(),
    initTU(),
    initRank(),
    initRatelimit(),
    initScoring(),
    initLoad(),
    initCrypto(),
  ]);
}
