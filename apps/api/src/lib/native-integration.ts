/**
 * Native Module Integration for API Services
 *
 * Provides high-level wrappers around native modules for use in API services.
 * Automatically falls back to JavaScript implementations when native modules
 * are unavailable.
 *
 * Phase 5 of MASTER-IMPLEMENTATION-PLAN
 */

import { loggers } from './logger';

const log = loggers.api;

// ============================================
// NATIVE MODULE IMPORTS
// ============================================

// Import native modules with graceful fallback
let nativeModules: {
  tu_calculate: (input: TUInput) => TUResult;
  rank_calculate: (input: RankInput) => RankCalculationResult;
  rank_find: (sortedScores: number[], targetScore: number) => number;
  geohash: {
    encode: (lat: number, lng: number, precision?: number) => string;
    decode: (hash: string) => { lat: number; lng: number };
    neighbors: (hash: string) => string[];
  };
  distance: {
    haversine: (lat1: number, lng1: number, lat2: number, lng2: number) => number;
    isWithinRadius: (lat1: number, lng1: number, lat2: number, lng2: number, radius: number) => boolean;
    boundingBox: (lat: number, lng: number, radius: number) => {
      minLat: number;
      maxLat: number;
      minLng: number;
      maxLng: number;
    };
  };
  createRateLimiter: (limit: number, windowSeconds?: number) => RateLimiter;
  isNative: {
    geo: boolean;
    ratelimit: boolean;
    tu: boolean;
    rank: boolean;
    any: boolean;
  };
  getNativeStatus: () => NativeStatus;
} | null = null;

// WASM module references (loaded asynchronously)
let wasmModules: {
  tu: typeof import('@musclemap.me/wasm').tu | null;
  geo: typeof import('@musclemap.me/wasm').geo | null;
  rank: typeof import('@musclemap.me/wasm').rank | null;
  ratelimit: typeof import('@musclemap.me/wasm').ratelimit | null;
  scoring: typeof import('@musclemap.me/wasm').scoring | null;
  load: typeof import('@musclemap.me/wasm').load | null;
  crypto: typeof import('@musclemap.me/wasm').crypto | null;
} = {
  tu: null,
  geo: null,
  rank: null,
  ratelimit: null,
  scoring: null,
  load: null,
  crypto: null,
};

let wasmInitialized = false;

/**
 * Initialize WASM modules (call once at startup)
 */
export async function initWasmModules(): Promise<void> {
  if (wasmInitialized) return;

  try {
    const wasm = await import('@musclemap.me/wasm');

    // Initialize all WASM modules in parallel
    await wasm.initializeAll();

    // Store module references
    wasmModules.tu = wasm.tu;
    wasmModules.geo = wasm.geo;
    wasmModules.rank = wasm.rank;
    wasmModules.ratelimit = wasm.ratelimit;
    wasmModules.scoring = wasm.scoring;
    wasmModules.load = wasm.load;
    wasmModules.crypto = wasm.crypto;

    wasmInitialized = true;
    log.info({ modules: wasm.MODULES }, 'WASM modules initialized');
  } catch (err) {
    log.warn({ error: (err as Error).message }, 'WASM modules not available, using JS fallback');
  }
}

// Try to load native FFI modules (C bindings)
try {
  // Dynamic import to handle module resolution
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const native = require('@musclemap/native');
  nativeModules = {
    tu_calculate: native.tu_calculate,
    rank_calculate: native.rank_calculate,
    rank_find: native.rank_find,
    geohash: native.geohash,
    distance: native.distance,
    createRateLimiter: native.createRateLimiter,
    isNative: native.isNative,
    getNativeStatus: native.getNativeStatus,
  };
  log.info({ status: native.getNativeStatus() }, 'Native FFI modules loaded');
} catch (err) {
  log.warn({ error: (err as Error).message }, 'Native FFI modules not available, trying WASM...');
  // Try to initialize WASM modules as fallback
  initWasmModules().catch(() => {
    log.warn('Both native FFI and WASM modules unavailable, using pure JS fallback');
  });
}

// ============================================
// TYPES
// ============================================

export interface TUInput {
  activations: number[];
  sets: number[];
  biasWeights: number[];
  exerciseCount: number;
  muscleCount: number;
}

export interface TUResult {
  totalTU: number;
  muscleActivations: number[];
  durationMs: number;
  native: boolean;
}

export interface RankInput {
  userIds: string[];
  scores: number[];
}

export interface RankResult {
  userId: string;
  score: number;
  rank: number;
  percentile: number;
}

export interface RankCalculationResult {
  results: RankResult[];
  durationMs: number;
  native: boolean;
}

export interface RateLimiter {
  check: (userId: string, count?: number) => boolean;
  remaining: (userId: string) => number;
  reset: (userId: string) => void;
  clear: () => void;
}

export interface NativeStatus {
  geo: boolean;
  ratelimit: boolean;
  tu: boolean;
  rank: boolean;
  ffi: boolean;
}

// ============================================
// TU CALCULATION
// ============================================

/**
 * JavaScript fallback for TU calculation
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
 * Calculate Training Units for a workout
 * Uses native FFI > WASM > JS fallback (10x+ faster for large workouts)
 */
export function calculateTU(input: TUInput): TUResult {
  // Try native FFI first (fastest)
  if (nativeModules?.tu_calculate) {
    return nativeModules.tu_calculate(input);
  }

  // Try WASM (10x faster than JS)
  if (wasmModules.tu) {
    try {
      const start = performance.now();
      const { activations, sets, biasWeights, exerciseCount, muscleCount } = input;

      const result = wasmModules.tu.tuCalculateSimple(
        Array.from(activations),
        Array.from(sets),
        Array.from(biasWeights),
        exerciseCount,
        muscleCount
      );

      return {
        totalTU: result,
        muscleActivations: [], // WASM simple doesn't return per-muscle
        durationMs: performance.now() - start,
        native: true, // WASM counts as native performance
      };
    } catch (err) {
      log.warn({ error: (err as Error).message }, 'WASM TU calculation failed, using JS');
    }
  }

  return jsCalculateTU(input);
}

/**
 * Calculate TU for multiple workouts in batch
 */
export function calculateTUBatch(inputs: TUInput[]): TUResult[] {
  return inputs.map(calculateTU);
}

// ============================================
// RANKING
// ============================================

/**
 * JavaScript fallback for ranking calculation
 */
function jsCalculateRanks(input: RankInput): RankCalculationResult {
  const start = performance.now();
  const { userIds, scores } = input;

  if (userIds.length !== scores.length || userIds.length === 0) {
    return { results: [], durationMs: 0, native: false };
  }

  // Create indexed array for sorting
  const indexed = userIds.map((userId, i) => ({
    userId,
    score: scores[i],
    originalIndex: i,
  }));

  // Sort by score descending
  indexed.sort((a, b) => b.score - a.score);

  // Calculate ranks with tie handling
  const results: RankResult[] = new Array(userIds.length);
  let currentRank = 1;

  for (let i = 0; i < indexed.length; i++) {
    const item = indexed[i];
    let rank: number;

    // Handle ties
    if (i > 0 && item.score === indexed[i - 1].score) {
      rank = results[indexed[i - 1].originalIndex].rank;
    } else {
      rank = currentRank;
    }

    // Calculate percentile (higher = better)
    const percentile = Math.round(((indexed.length - rank + 1) / indexed.length) * 10000) / 100;

    results[item.originalIndex] = {
      userId: item.userId,
      score: item.score,
      rank,
      percentile,
    };

    currentRank++;
  }

  const durationMs = performance.now() - start;
  return { results, durationMs, native: false };
}

/**
 * Calculate ranks and percentiles for a list of users
 * Uses native FFI > WASM > JS (optimized introsort)
 */
export function calculateRanks(input: RankInput): RankCalculationResult {
  // Try native FFI first
  if (nativeModules?.rank_calculate) {
    return nativeModules.rank_calculate(input);
  }

  // Try WASM
  if (wasmModules.rank) {
    try {
      const start = performance.now();
      const { userIds, scores } = input;

      const rankings = wasmModules.rank.rankCalculate(scores);
      const stats = wasmModules.rank.rankStats(scores);

      const results: RankResult[] = userIds.map((userId, i) => ({
        userId,
        score: scores[i],
        rank: rankings[i],
        percentile: Math.round(((scores.length - rankings[i] + 1) / scores.length) * 10000) / 100,
      }));

      return {
        results,
        durationMs: performance.now() - start,
        native: true,
      };
    } catch (err) {
      log.warn({ error: (err as Error).message }, 'WASM rank calculation failed, using JS');
    }
  }

  return jsCalculateRanks(input);
}

/**
 * Find the rank of a specific score in a sorted score array
 * Uses binary search for O(log n) performance
 */
export function findRank(sortedScores: number[], targetScore: number): number {
  if (nativeModules?.rank_find) {
    return nativeModules.rank_find(sortedScores, targetScore);
  }

  // JavaScript fallback using binary search
  if (sortedScores.length === 0) return -1;

  let lo = 0;
  let hi = sortedScores.length;

  while (lo < hi) {
    const mid = Math.floor(lo + (hi - lo) / 2);
    if (sortedScores[mid] > targetScore) {
      lo = mid + 1;
    } else {
      hi = mid;
    }
  }

  // Handle ties - find first occurrence
  while (lo > 0 && sortedScores[lo - 1] === targetScore) {
    lo--;
  }

  return lo + 1; // 1-based rank
}

// ============================================
// GEOLOCATION
// ============================================

const BASE32 = '0123456789bcdefghjkmnpqrstuvwxyz';
const BASE32_DECODE: Record<string, number> = {};
for (let i = 0; i < BASE32.length; i++) {
  BASE32_DECODE[BASE32[i]] = i;
}

/**
 * JavaScript fallback for geohash encoding
 */
function jsGeohashEncode(lat: number, lng: number, precision: number = 9): string {
  if (precision < 1) precision = 1;
  if (precision > 12) precision = 12;

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
 * JavaScript fallback for geohash decoding
 */
function jsGeohashDecode(hash: string): { lat: number; lng: number } {
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
 * JavaScript fallback for haversine distance
 */
function jsHaversine(lat1: number, lng1: number, lat2: number, lng2: number): number {
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
 * Geohash utilities
 */
export const geohash = {
  encode: (lat: number, lng: number, precision: number = 9): string => {
    // Try native FFI first
    if (nativeModules?.geohash?.encode) {
      return nativeModules.geohash.encode(lat, lng, precision);
    }
    // Try WASM
    if (wasmModules.geo) {
      try {
        return wasmModules.geo.geohashEncode(lat, lng, precision);
      } catch {
        // Fall through to JS
      }
    }
    return jsGeohashEncode(lat, lng, precision);
  },

  decode: (hash: string): { lat: number; lng: number } => {
    // Try native FFI first
    if (nativeModules?.geohash?.decode) {
      return nativeModules.geohash.decode(hash);
    }
    // Try WASM
    if (wasmModules.geo) {
      try {
        const result = wasmModules.geo.geohashDecode(hash);
        return { lat: result.lat, lng: result.lng };
      } catch {
        // Fall through to JS
      }
    }
    return jsGeohashDecode(hash);
  },

  neighbors: (hash: string): string[] => {
    if (nativeModules?.geohash?.neighbors) {
      return nativeModules.geohash.neighbors(hash);
    }
    // Use JS implementation from native module
    const { lat, lng } = jsGeohashDecode(hash);
    const precision = hash.length;
    const LAT_ERR = [23, 23, 2.8, 2.8, 0.35, 0.35, 0.044, 0.044, 0.0055, 0.0055, 0.00068, 0.00068];
    const LNG_ERR = [23, 5.6, 5.6, 0.7, 0.7, 0.087, 0.087, 0.011, 0.011, 0.0014, 0.0014, 0.00017];
    const latErr = LAT_ERR[precision - 1];
    const lngErr = LNG_ERR[precision - 1];
    const offsets = [[1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1], [0, -1], [1, -1]];
    return offsets.map(([dLat, dLng]) => {
      let nLat = lat + dLat * latErr * 2;
      let nLng = lng + dLng * lngErr * 2;
      while (nLng > 180) nLng -= 360;
      while (nLng < -180) nLng += 360;
      nLat = Math.max(-90, Math.min(90, nLat));
      return jsGeohashEncode(nLat, nLng, precision);
    });
  },
};

/**
 * Distance calculation utilities
 */
export const distance = {
  haversine: (lat1: number, lng1: number, lat2: number, lng2: number): number => {
    // Try native FFI first
    if (nativeModules?.distance?.haversine) {
      return nativeModules.distance.haversine(lat1, lng1, lat2, lng2);
    }
    // Try WASM
    if (wasmModules.geo) {
      try {
        return wasmModules.geo.haversineMeters(lat1, lng1, lat2, lng2);
      } catch {
        // Fall through to JS
      }
    }
    return jsHaversine(lat1, lng1, lat2, lng2);
  },

  isWithinRadius: (lat1: number, lng1: number, lat2: number, lng2: number, radiusMeters: number): boolean => {
    // Try native FFI first
    if (nativeModules?.distance?.isWithinRadius) {
      return nativeModules.distance.isWithinRadius(lat1, lng1, lat2, lng2, radiusMeters);
    }
    // Try WASM or JS
    return distance.haversine(lat1, lng1, lat2, lng2) <= radiusMeters;
  },

  boundingBox: (lat: number, lng: number, radiusMeters: number): {
    minLat: number;
    maxLat: number;
    minLng: number;
    maxLng: number;
  } => {
    // Try native FFI first
    if (nativeModules?.distance?.boundingBox) {
      return nativeModules.distance.boundingBox(lat, lng, radiusMeters);
    }
    // Try WASM
    if (wasmModules.geo) {
      try {
        const result = wasmModules.geo.boundingBox(lat, lng, radiusMeters);
        return {
          minLat: result.minLat,
          maxLat: result.maxLat,
          minLng: result.minLng,
          maxLng: result.maxLng,
        };
      } catch {
        // Fall through to JS
      }
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

// ============================================
// RATE LIMITING
// ============================================

/**
 * JavaScript sliding window rate limiter
 */
class JSRateLimiter implements RateLimiter {
  private buckets: Map<string, { counts: number[]; lastMs: number }> = new Map();
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

    if (now - bucket.lastMs > this.windowMs) {
      bucket.counts.fill(0);
    }
    bucket.lastMs = now;

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

// WASM-based rate limiter wrapper
class WasmRateLimiter implements RateLimiter {
  private limiter: InstanceType<typeof import('@musclemap.me/wasm').ratelimit.RateLimiter> | null = null;
  private readonly limit: number;
  private readonly windowSeconds: number;

  constructor(limit: number, windowSeconds: number) {
    this.limit = limit;
    this.windowSeconds = windowSeconds;
    if (wasmModules.ratelimit) {
      try {
        // Use the RateLimiter class from the WASM module
        this.limiter = new wasmModules.ratelimit.RateLimiter({
          maxRequests: limit,
          windowSeconds: windowSeconds,
        });
      } catch {
        this.limiter = null;
      }
    }
  }

  check(userId: string, _count: number = 1): boolean {
    if (this.limiter) {
      try {
        const result = this.limiter.check(userId);
        return result.allowed;
      } catch {
        // Fall through to JS logic
      }
    }
    // Fallback - always allow but log warning
    return true;
  }

  remaining(userId: string): number {
    if (this.limiter) {
      try {
        const result = this.limiter.peek(userId);
        return result.remaining;
      } catch {
        // Fall through
      }
    }
    return this.limit;
  }

  reset(userId: string): void {
    if (this.limiter) {
      try {
        this.limiter.reset(userId);
      } catch {
        // Ignore
      }
    }
  }

  clear(): void {
    if (this.limiter) {
      try {
        this.limiter.clear();
      } catch {
        // Ignore
      }
    }
  }
}

/**
 * Create a rate limiter
 * Uses native FFI > WASM > JS fallback for best performance
 */
export function createRateLimiter(limit: number, windowSeconds: number = 60): RateLimiter {
  // Try native FFI first (fastest)
  if (nativeModules?.createRateLimiter) {
    return nativeModules.createRateLimiter(limit, windowSeconds);
  }
  // Try WASM
  if (wasmModules.ratelimit) {
    return new WasmRateLimiter(limit, windowSeconds);
  }
  // JS fallback
  return new JSRateLimiter(limit, windowSeconds);
}

// ============================================
// STATUS AND MONITORING
// ============================================

/**
 * Check which native modules are available (FFI + WASM)
 */
export function getNativeStatus(): NativeStatus & { wasm: boolean } {
  const ffiStatus = nativeModules?.getNativeStatus?.() ?? {
    geo: false,
    ratelimit: false,
    tu: false,
    rank: false,
    ffi: false,
  };

  return {
    geo: ffiStatus.geo || !!wasmModules.geo,
    ratelimit: ffiStatus.ratelimit || !!wasmModules.ratelimit,
    tu: ffiStatus.tu || !!wasmModules.tu,
    rank: ffiStatus.rank || !!wasmModules.rank,
    ffi: ffiStatus.ffi,
    wasm: wasmInitialized,
  };
}

/**
 * Check if any native modules are available (FFI or WASM)
 */
export function hasNativeModules(): boolean {
  return (nativeModules?.isNative?.any ?? false) || wasmInitialized;
}

/**
 * Check specific native module availability (FFI or WASM)
 */
export const isNative = {
  get geo() { return (nativeModules?.isNative?.geo ?? false) || !!wasmModules.geo; },
  get ratelimit() { return (nativeModules?.isNative?.ratelimit ?? false) || !!wasmModules.ratelimit; },
  get tu() { return (nativeModules?.isNative?.tu ?? false) || !!wasmModules.tu; },
  get rank() { return (nativeModules?.isNative?.rank ?? false) || !!wasmModules.rank; },
  get any() { return (nativeModules?.isNative?.any ?? false) || wasmInitialized; },
  get wasm() { return wasmInitialized; },
  get ffi() { return nativeModules?.isNative?.any ?? false; },
};

// Export default namespace
export default {
  calculateTU,
  calculateTUBatch,
  calculateRanks,
  findRank,
  geohash,
  distance,
  createRateLimiter,
  getNativeStatus,
  hasNativeModules,
  isNative,
};
