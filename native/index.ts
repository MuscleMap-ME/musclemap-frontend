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

// ============================================
// EXPORTS
// ============================================

export const geohash = {
  encode: jsGeohashEncode,
  decode: jsGeohashDecode,
  neighbors: jsGeohashNeighbors,
};

export const distance = {
  haversine: jsHaversineMeters,
  isWithinRadius: (lat1: number, lng1: number, lat2: number, lng2: number, radiusMeters: number): boolean => {
    return jsHaversineMeters(lat1, lng1, lat2, lng2) <= radiusMeters;
  },
  boundingBox: (
    lat: number,
    lng: number,
    radiusMeters: number
  ): { minLat: number; maxLat: number; minLng: number; maxLng: number } => {
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

export function createRateLimiter(limit: number, windowSeconds: number = 60): JSRateLimiter {
  return new JSRateLimiter(limit, windowSeconds);
}

// Check if native modules are available
let nativeAvailable = false;
const libDir = join(__dirname, 'lib');
if (existsSync(libDir)) {
  // Could add FFI bindings here for native performance
  // For now, we use pure TypeScript
  nativeAvailable = false;
}

export const isNative = nativeAvailable;
