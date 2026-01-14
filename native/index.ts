/**
 * Native Module Bindings
 *
 * Provides high-performance native implementations for:
 * - Geohash encoding/decoding
 * - Rate limiting
 *
 * Falls back to pure TypeScript implementations when native modules are unavailable.
 */

import { existsSync } from 'fs';
import { join } from 'path';

// ============================================
// FFI CONFIGURATION
// ============================================

// Detect platform-specific library extension
const LIB_EXT = process.platform === 'darwin' ? '.dylib' :
                process.platform === 'win32' ? '.dll' : '.so';

// Library paths
const LIB_DIR = join(__dirname, 'lib');
const GEO_LIB_PATH = join(LIB_DIR, `libgeo${LIB_EXT}`);
const RATELIMIT_LIB_PATH = join(LIB_DIR, `libratelimit${LIB_EXT}`);
const TU_LIB_PATH = join(LIB_DIR, `libtu${LIB_EXT}`);

// Track native availability
let nativeGeoAvailable = false;
let nativeRatelimitAvailable = false;
let nativeTUAvailable = false;
let ffiModule: any = null;
let refModule: any = null;

// Native library handles
let geoLib: any = null;
let ratelimitLib: any = null;
let tuLib: any = null;

// ============================================
// FFI INITIALIZATION
// ============================================

/**
 * Try to load FFI modules and native libraries
 */
function initializeNativeModules(): void {
  // Check if USE_NATIVE is explicitly disabled
  if (process.env.USE_NATIVE === 'false') {
    console.log('[native] Native modules disabled via USE_NATIVE=false');
    return;
  }

  // Try to load ffi-napi and ref-napi
  try {
    ffiModule = require('ffi-napi');
    refModule = require('ref-napi');
  } catch (err) {
    console.log('[native] FFI modules not available, using JS fallback');
    return;
  }

  // Try to load geohash library
  if (existsSync(GEO_LIB_PATH)) {
    try {
      const ref = refModule;
      const ffi = ffiModule;

      // Define the C function signatures
      geoLib = ffi.Library(GEO_LIB_PATH, {
        geohash_encode: ['int', ['double', 'double', 'int', 'pointer']],
        geohash_decode: ['int', ['string', 'pointer', 'pointer']],
        haversine_meters: ['double', ['double', 'double', 'double', 'double']],
        is_within_radius: ['int', ['double', 'double', 'double', 'double', 'double']],
        bounding_box: ['int', ['double', 'double', 'double', 'pointer', 'pointer', 'pointer', 'pointer']],
        optimal_precision: ['int', ['double']],
      });

      nativeGeoAvailable = true;
      console.log('[native] Loaded libgeo native module');
    } catch (err) {
      console.log('[native] Failed to load libgeo:', (err as Error).message);
    }
  }

  // Try to load rate limiter library
  if (existsSync(RATELIMIT_LIB_PATH)) {
    try {
      const ffi = ffiModule;

      ratelimitLib = ffi.Library(RATELIMIT_LIB_PATH, {
        ratelimiter_create: ['pointer', ['int', 'int']],
        ratelimiter_destroy: ['void', ['pointer']],
        ratelimiter_check: ['int', ['pointer', 'string', 'int']],
        ratelimiter_remaining: ['int', ['pointer', 'string']],
        ratelimiter_reset: ['void', ['pointer', 'string']],
        ratelimiter_clear: ['void', ['pointer']],
      });

      nativeRatelimitAvailable = true;
      console.log('[native] Loaded libratelimit native module');
    } catch (err) {
      console.log('[native] Failed to load libratelimit:', (err as Error).message);
    }
  }

  // Try to load TU calculator library
  if (existsSync(TU_LIB_PATH)) {
    try {
      const ffi = ffiModule;

      tuLib = ffi.Library(TU_LIB_PATH, {
        tu_init: ['int', []],
        tu_clear: ['void', []],
        tu_add_exercise: ['int', ['string', 'pointer', 'int']],
        tu_add_muscle: ['int', ['string', 'float']],
        tu_find_exercise: ['int', ['string']],
        tu_get_stats: ['void', ['pointer', 'pointer']],
        tu_calculate_simple: ['float', ['pointer', 'pointer', 'pointer', 'int', 'int']],
      });

      // Initialize the TU calculator cache
      tuLib.tu_init();
      nativeTUAvailable = true;
      console.log('[native] Loaded libtu native module');
    } catch (err) {
      console.log('[native] Failed to load libtu:', (err as Error).message);
    }
  }
}

// Initialize on module load
initializeNativeModules();

// ============================================
// GEOHASH MODULE
// ============================================

const BASE32 = '0123456789bcdefghjkmnpqrstuvwxyz';

const BASE32_DECODE: Record<string, number> = {};
for (let i = 0; i < BASE32.length; i++) {
  BASE32_DECODE[BASE32[i]] = i;
}

/**
 * Pure TypeScript geohash encoder
 */
function jsGeohashEncode(lat: number, lng: number, precision: number = 9): string {
  if (precision < 1) precision = 1;
  if (precision > 12) precision = 12;
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    throw new Error('Invalid coordinates');
  }

  let latRange = [-90, 90];
  let lngRange = [-180, 180];
  let isLng = true;
  let bit = 0;
  let ch = 0;
  let result = '';

  while (result.length < precision) {
    const range = isLng ? lngRange : latRange;
    const val = isLng ? lng : lat;
    const mid = (range[0] + range[1]) / 2;

    if (val >= mid) {
      ch |= 1 << (4 - bit);
      range[0] = mid;
    } else {
      range[1] = mid;
    }

    isLng = !isLng;

    if (++bit === 5) {
      result += BASE32[ch];
      bit = 0;
      ch = 0;
    }
  }

  return result;
}

/**
 * Native geohash encoder using FFI
 */
function nativeGeohashEncode(lat: number, lng: number, precision: number = 9): string {
  if (!geoLib || !refModule) {
    return jsGeohashEncode(lat, lng, precision);
  }

  const ref = refModule;
  const buffer = Buffer.alloc(13);
  const result = geoLib.geohash_encode(lat, lng, precision, buffer);

  if (result < 0) {
    throw new Error('Invalid coordinates');
  }

  // Find null terminator
  let end = 0;
  while (end < 13 && buffer[end] !== 0) end++;
  return buffer.slice(0, end).toString('ascii');
}

/**
 * Pure TypeScript geohash decoder
 */
function jsGeohashDecode(hash: string): { lat: number; lng: number } {
  if (!hash || hash.length < 1 || hash.length > 12) {
    throw new Error('Invalid geohash');
  }

  let latRange = [-90, 90];
  let lngRange = [-180, 180];
  let isLng = true;

  for (const c of hash.toLowerCase()) {
    const val = BASE32_DECODE[c];
    if (val === undefined) {
      throw new Error(`Invalid geohash character: ${c}`);
    }

    for (let bit = 4; bit >= 0; bit--) {
      const range = isLng ? lngRange : latRange;
      const mid = (range[0] + range[1]) / 2;

      if (val & (1 << bit)) {
        range[0] = mid;
      } else {
        range[1] = mid;
      }

      isLng = !isLng;
    }
  }

  return {
    lat: (latRange[0] + latRange[1]) / 2,
    lng: (lngRange[0] + lngRange[1]) / 2,
  };
}

/**
 * Native geohash decoder using FFI
 */
function nativeGeohashDecode(hash: string): { lat: number; lng: number } {
  if (!geoLib || !refModule) {
    return jsGeohashDecode(hash);
  }

  const ref = refModule;
  const latPtr = ref.alloc('double');
  const lngPtr = ref.alloc('double');

  const result = geoLib.geohash_decode(hash, latPtr, lngPtr);

  if (result < 0) {
    throw new Error('Invalid geohash');
  }

  return {
    lat: ref.deref(latPtr) as number,
    lng: ref.deref(lngPtr) as number,
  };
}

/**
 * Pure TypeScript haversine distance calculation
 */
function jsHaversineMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000; // Earth's radius in meters
  const DEG2RAD = Math.PI / 180;

  const phi1 = lat1 * DEG2RAD;
  const phi2 = lat2 * DEG2RAD;
  const dphi = (lat2 - lat1) * DEG2RAD;
  const dlam = (lng2 - lng1) * DEG2RAD;

  const sinDphi = Math.sin(dphi / 2);
  const sinDlam = Math.sin(dlam / 2);

  const a = sinDphi * sinDphi + Math.cos(phi1) * Math.cos(phi2) * sinDlam * sinDlam;

  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Native haversine using FFI
 */
function nativeHaversineMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
  if (!geoLib) {
    return jsHaversineMeters(lat1, lng1, lat2, lng2);
  }
  return geoLib.haversine_meters(lat1, lng1, lat2, lng2);
}

/**
 * Get neighboring geohashes
 */
function jsGeohashNeighbors(hash: string): string[] {
  const { lat, lng } = jsGeohashDecode(hash);
  const precision = hash.length;

  // Error margins for each precision level
  const LAT_ERR = [23, 23, 2.8, 2.8, 0.35, 0.35, 0.044, 0.044, 0.0055, 0.0055, 0.00068, 0.00068];
  const LNG_ERR = [23, 5.6, 5.6, 0.7, 0.7, 0.087, 0.087, 0.011, 0.011, 0.0014, 0.0014, 0.00017];

  const latErr = LAT_ERR[precision - 1];
  const lngErr = LNG_ERR[precision - 1];

  // Directions: N, NE, E, SE, S, SW, W, NW
  const offsets = [
    [1, 0],
    [1, 1],
    [0, 1],
    [-1, 1],
    [-1, 0],
    [-1, -1],
    [0, -1],
    [1, -1],
  ];

  return offsets.map(([dLat, dLng]) => {
    let nLat = lat + dLat * latErr * 2;
    let nLng = lng + dLng * lngErr * 2;

    // Wrap longitude
    while (nLng > 180) nLng -= 360;
    while (nLng < -180) nLng += 360;

    // Clamp latitude
    nLat = Math.max(-90, Math.min(90, nLat));

    return jsGeohashEncode(nLat, nLng, precision);
  });
}

// ============================================
// RATE LIMITER MODULE
// ============================================

interface RateLimiterBucket {
  counts: number[];
  lastMs: number;
}

/**
 * Pure TypeScript sliding window rate limiter
 */
class JSRateLimiter {
  private buckets: Map<string, RateLimiterBucket> = new Map();
  private readonly windowMs: number;
  private readonly bucketCount: number;
  private readonly limit: number;

  constructor(limit: number, windowSeconds: number = 60) {
    this.limit = limit;
    this.windowMs = windowSeconds * 1000;
    this.bucketCount = windowSeconds;
  }

  check(userId: string, count: number = 1): boolean {
    const now = Date.now();
    const currentBucket = Math.floor(now / 1000) % this.bucketCount;

    let bucket = this.buckets.get(userId);
    if (!bucket) {
      bucket = { counts: new Array(this.bucketCount).fill(0), lastMs: now };
      this.buckets.set(userId, bucket);
    }

    // Clear old buckets if window has wrapped
    if (now - bucket.lastMs > this.windowMs) {
      bucket.counts.fill(0);
    }
    bucket.lastMs = now;

    // Calculate total
    const total = bucket.counts.reduce((sum, c) => sum + c, 0);

    if (total + count > this.limit) {
      return false;
    }

    bucket.counts[currentBucket] += count;
    return true;
  }

  remaining(userId: string): number {
    const bucket = this.buckets.get(userId);
    if (!bucket) return this.limit;

    const total = bucket.counts.reduce((sum, c) => sum + c, 0);
    return Math.max(0, this.limit - total);
  }

  reset(userId: string): void {
    this.buckets.delete(userId);
  }

  clear(): void {
    this.buckets.clear();
  }
}

/**
 * Native rate limiter using FFI
 */
class NativeRateLimiter {
  private handle: any;
  private readonly limit: number;
  private readonly windowSeconds: number;

  constructor(limit: number, windowSeconds: number = 60) {
    this.limit = limit;
    this.windowSeconds = windowSeconds;

    if (ratelimitLib) {
      this.handle = ratelimitLib.ratelimiter_create(limit, windowSeconds);
    }
  }

  check(userId: string, count: number = 1): boolean {
    if (!this.handle || !ratelimitLib) {
      return true; // Fail open if native not available
    }
    return ratelimitLib.ratelimiter_check(this.handle, userId, count) !== 0;
  }

  remaining(userId: string): number {
    if (!this.handle || !ratelimitLib) {
      return this.limit;
    }
    return ratelimitLib.ratelimiter_remaining(this.handle, userId);
  }

  reset(userId: string): void {
    if (this.handle && ratelimitLib) {
      ratelimitLib.ratelimiter_reset(this.handle, userId);
    }
  }

  clear(): void {
    if (this.handle && ratelimitLib) {
      ratelimitLib.ratelimiter_clear(this.handle);
    }
  }

  destroy(): void {
    if (this.handle && ratelimitLib) {
      ratelimitLib.ratelimiter_destroy(this.handle);
      this.handle = null;
    }
  }
}

// ============================================
// EXPORTS
// ============================================

// Choose native or JS implementation based on availability
export const geohash = {
  encode: nativeGeoAvailable ? nativeGeohashEncode : jsGeohashEncode,
  decode: nativeGeoAvailable ? nativeGeohashDecode : jsGeohashDecode,
  neighbors: jsGeohashNeighbors, // Use JS for neighbors (complex string handling)
};

export const distance = {
  haversine: nativeGeoAvailable ? nativeHaversineMeters : jsHaversineMeters,
  isWithinRadius: (lat1: number, lng1: number, lat2: number, lng2: number, radiusMeters: number): boolean => {
    if (nativeGeoAvailable && geoLib) {
      return geoLib.is_within_radius(lat1, lng1, lat2, lng2, radiusMeters) !== 0;
    }
    return jsHaversineMeters(lat1, lng1, lat2, lng2) <= radiusMeters;
  },
  boundingBox: (
    lat: number,
    lng: number,
    radiusMeters: number
  ): { minLat: number; maxLat: number; minLng: number; maxLng: number } => {
    if (nativeGeoAvailable && geoLib && refModule) {
      const ref = refModule;
      const minLatPtr = ref.alloc('double');
      const maxLatPtr = ref.alloc('double');
      const minLngPtr = ref.alloc('double');
      const maxLngPtr = ref.alloc('double');

      geoLib.bounding_box(lat, lng, radiusMeters, minLatPtr, maxLatPtr, minLngPtr, maxLngPtr);

      return {
        minLat: ref.deref(minLatPtr) as number,
        maxLat: ref.deref(maxLatPtr) as number,
        minLng: ref.deref(minLngPtr) as number,
        maxLng: ref.deref(maxLngPtr) as number,
      };
    }

    // JS fallback
    const R = 6371000;
    const DEG2RAD = Math.PI / 180;
    const RAD2DEG = 180 / Math.PI;

    const latDelta = (radiusMeters / R) * RAD2DEG;
    const lngDelta = (radiusMeters / (R * Math.cos(lat * DEG2RAD))) * RAD2DEG;

    return {
      minLat: Math.max(-90, lat - latDelta),
      maxLat: Math.min(90, lat + latDelta),
      minLng: lng - lngDelta,
      maxLng: lng + lngDelta,
    };
  },
};

/**
 * Create a rate limiter
 * Returns native implementation if available, JS otherwise
 */
export function createRateLimiter(limit: number, windowSeconds: number = 60): JSRateLimiter | NativeRateLimiter {
  if (nativeRatelimitAvailable) {
    return new NativeRateLimiter(limit, windowSeconds);
  }
  return new JSRateLimiter(limit, windowSeconds);
}

// Re-export JS implementation for direct use
export { JSRateLimiter };

// Check native module availability
export const isNative = {
  geo: nativeGeoAvailable,
  ratelimit: nativeRatelimitAvailable,
  tu: nativeTUAvailable,
  any: nativeGeoAvailable || nativeRatelimitAvailable || nativeTUAvailable,
};

// Legacy exports for backward compatibility
export const isNativeGeo = nativeGeoAvailable;
export const isNativeRatelimit = nativeRatelimitAvailable;
export const isNativeTU = nativeTUAvailable;

/**
 * Get native module status
 */
export function getNativeStatus(): {
  geo: boolean;
  ratelimit: boolean;
  tu: boolean;
  ffi: boolean;
} {
  return {
    geo: nativeGeoAvailable,
    ratelimit: nativeRatelimitAvailable,
    tu: nativeTUAvailable,
    ffi: ffiModule !== null,
  };
}

// ============================================
// TU CALCULATOR MODULE
// ============================================

export interface TUInput {
  /** Activation percentages per muscle (0-100) for each exercise. Flat array: [ex0_m0, ex0_m1, ..., ex1_m0, ex1_m1, ...] */
  activations: number[];
  /** Number of sets per exercise */
  sets: number[];
  /** Bias weight per muscle (typically 1.0) */
  biasWeights: number[];
  /** Number of exercises */
  exerciseCount: number;
  /** Number of muscles */
  muscleCount: number;
}

export interface TUResult {
  totalTU: number;
  muscleActivations: number[];
  durationMs: number;
  native: boolean;
}

/**
 * Pure TypeScript TU calculation (fallback)
 */
function jsCalculateTU(input: TUInput): TUResult {
  const start = performance.now();
  const { activations, sets, biasWeights, exerciseCount, muscleCount } = input;

  const muscleTotals = new Array(muscleCount).fill(0);

  // Accumulate activations
  for (let e = 0; e < exerciseCount; e++) {
    const s = sets[e] > 0 ? sets[e] : 1;
    for (let m = 0; m < muscleCount; m++) {
      const activation = activations[e * muscleCount + m];
      if (activation > 0) {
        muscleTotals[m] += (activation / 100) * s;
      }
    }
  }

  // Apply bias weights
  let total = 0;
  for (let m = 0; m < muscleCount; m++) {
    if (muscleTotals[m] > 0) {
      total += muscleTotals[m] * biasWeights[m];
    }
  }

  const durationMs = performance.now() - start;
  return {
    totalTU: Math.round(total * 100) / 100,
    muscleActivations: muscleTotals,
    durationMs,
    native: false,
  };
}

/**
 * Native TU calculation using FFI
 */
function nativeCalculateTU(input: TUInput): TUResult {
  const start = performance.now();
  const { activations, sets, biasWeights, exerciseCount, muscleCount } = input;

  if (!tuLib || !refModule) {
    return jsCalculateTU(input);
  }

  try {
    const ref = refModule;

    // Create typed arrays for C interop
    const activationsBuffer = Buffer.alloc(exerciseCount * muscleCount * 4); // float = 4 bytes
    const setsBuffer = Buffer.alloc(exerciseCount * 4); // int32 = 4 bytes
    const biasBuffer = Buffer.alloc(muscleCount * 4); // float = 4 bytes

    // Fill buffers
    for (let i = 0; i < activations.length; i++) {
      activationsBuffer.writeFloatLE(activations[i], i * 4);
    }
    for (let i = 0; i < sets.length; i++) {
      setsBuffer.writeInt32LE(sets[i], i * 4);
    }
    for (let i = 0; i < biasWeights.length; i++) {
      biasBuffer.writeFloatLE(biasWeights[i], i * 4);
    }

    const totalTU = tuLib.tu_calculate_simple(
      activationsBuffer,
      setsBuffer,
      biasBuffer,
      exerciseCount,
      muscleCount
    );

    // Calculate muscle totals in JS (native returns only total)
    const muscleTotals = new Array(muscleCount).fill(0);
    for (let e = 0; e < exerciseCount; e++) {
      const s = sets[e] > 0 ? sets[e] : 1;
      for (let m = 0; m < muscleCount; m++) {
        const activation = activations[e * muscleCount + m];
        if (activation > 0) {
          muscleTotals[m] += (activation / 100) * s;
        }
      }
    }

    const durationMs = performance.now() - start;
    return {
      totalTU,
      muscleActivations: muscleTotals,
      durationMs,
      native: true,
    };
  } catch (err) {
    console.error('[native] TU calculation failed, falling back to JS:', (err as Error).message);
    return jsCalculateTU(input);
  }
}

/**
 * Calculate Training Units for a workout
 * Uses native implementation if available, falls back to JavaScript
 */
export function tu_calculate(input: TUInput): TUResult {
  if (nativeTUAvailable) {
    return nativeCalculateTU(input);
  }
  return jsCalculateTU(input);
}

/**
 * Calculate TU for a batch of workouts
 */
export function tu_calculate_batch(inputs: TUInput[]): TUResult[] {
  return inputs.map(tu_calculate);
}

/**
 * Get TU calculator status
 */
export function getTUStatus(): { native: boolean; exercisesCached: number; musclesCached: number } {
  if (!nativeTUAvailable || !tuLib || !refModule) {
    return { native: false, exercisesCached: 0, musclesCached: 0 };
  }

  const ref = refModule;
  const exerciseCountPtr = ref.alloc('int');
  const muscleCountPtr = ref.alloc('int');

  tuLib.tu_get_stats(exerciseCountPtr, muscleCountPtr);

  return {
    native: true,
    exercisesCached: ref.deref(exerciseCountPtr) as number,
    musclesCached: ref.deref(muscleCountPtr) as number,
  };
}
