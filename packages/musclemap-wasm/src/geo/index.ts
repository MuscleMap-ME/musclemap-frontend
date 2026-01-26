/**
 * Geospatial operations - geohash, haversine, bounding box
 * Compiled from Rust to WASM for ~10x performance vs JS
 */

// WASM module will be loaded dynamically
let wasmModule: any = null;

/**
 * Initialize the geo WASM module
 */
export async function initGeo(): Promise<void> {
  if (wasmModule !== null) return;

  try {
    // Dynamic import of wasm-bindgen generated module
    const mod = await import('../../pkg/musclemap_geo/musclemap_geo.js');
    await mod.default?.();
    // Test that it works before accepting
    mod.geohash_encode(0, 0, 1);
    wasmModule = mod;
  } catch (e) {
    console.warn('[geo] WASM module not available, using JS fallback');
    wasmModule = false; // Mark as unavailable
  }
}

/**
 * Encode latitude/longitude to geohash
 */
export function geohashEncode(lat: number, lng: number, precision: number = 9): string {
  if (wasmModule && wasmModule.geohash_encode) {
    return wasmModule.geohash_encode(lat, lng, precision);
  }
  return geohashEncodeJS(lat, lng, precision);
}

/**
 * Decode geohash to latitude/longitude
 */
export function geohashDecode(hash: string): { lat: number; lng: number } {
  if (wasmModule?.geohash_decode) {
    const result = wasmModule.geohash_decode(hash);
    return { lat: result.lat, lng: result.lng };
  }
  return geohashDecodeJS(hash);
}

/**
 * Get all 8 neighbors of a geohash
 */
export function geohashNeighbors(hash: string): string[] {
  if (wasmModule?.geohash_neighbors) {
    return wasmModule.geohash_neighbors(hash);
  }
  return geohashNeighborsJS(hash);
}

/**
 * Calculate haversine distance in meters
 */
export function haversineMeters(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  if (wasmModule?.haversine_meters) {
    return wasmModule.haversine_meters(lat1, lng1, lat2, lng2);
  }
  return haversineJS(lat1, lng1, lat2, lng2);
}

/**
 * Check if point is within radius of center
 */
export function isWithinRadius(
  centerLat: number,
  centerLng: number,
  pointLat: number,
  pointLng: number,
  radiusMeters: number
): boolean {
  if (wasmModule?.is_within_radius) {
    return wasmModule.is_within_radius(
      centerLat,
      centerLng,
      pointLat,
      pointLng,
      radiusMeters
    );
  }
  return haversineJS(centerLat, centerLng, pointLat, pointLng) <= radiusMeters;
}

/**
 * Calculate bounding box for a center point and radius
 */
export function boundingBox(
  lat: number,
  lng: number,
  radiusMeters: number
): { minLat: number; maxLat: number; minLng: number; maxLng: number } {
  if (wasmModule?.bounding_box) {
    const result = wasmModule.bounding_box(lat, lng, radiusMeters);
    return {
      minLat: result.min_lat,
      maxLat: result.max_lat,
      minLng: result.min_lng,
      maxLng: result.max_lng,
    };
  }
  return boundingBoxJS(lat, lng, radiusMeters);
}

/**
 * Batch encode multiple coordinates to geohashes
 */
export function geohashEncodeBatch(
  coords: Array<{ lat: number; lng: number }>,
  precision: number = 9
): string[] {
  if (wasmModule?.geohash_encode_batch) {
    const lats = coords.map((c) => c.lat);
    const lngs = coords.map((c) => c.lng);
    return wasmModule.geohash_encode_batch(lats, lngs, precision);
  }
  return coords.map((c) => geohashEncodeJS(c.lat, c.lng, precision));
}

/**
 * Filter coordinates within radius
 */
export function filterWithinRadius(
  centerLat: number,
  centerLng: number,
  points: Array<{ lat: number; lng: number; id: string }>,
  radiusMeters: number
): Array<{ lat: number; lng: number; id: string; distance: number }> {
  if (wasmModule?.filter_within_radius) {
    const lats = points.map((p) => p.lat);
    const lngs = points.map((p) => p.lng);
    const ids = points.map((p) => p.id);
    const result = wasmModule.filter_within_radius(
      centerLat,
      centerLng,
      lats,
      lngs,
      ids,
      radiusMeters
    );
    return result;
  }

  // JS fallback
  return points
    .map((p) => ({
      ...p,
      distance: haversineJS(centerLat, centerLng, p.lat, p.lng),
    }))
    .filter((p) => p.distance <= radiusMeters);
}

// ============================================================================
// JavaScript Fallbacks
// ============================================================================

const BASE32 = '0123456789bcdefghjkmnpqrstuvwxyz';

function geohashEncodeJS(lat: number, lng: number, precision: number): string {
  let minLat = -90,
    maxLat = 90;
  let minLng = -180,
    maxLng = 180;
  let hash = '';
  let bit = 0;
  let ch = 0;
  let isLng = true;

  while (hash.length < precision) {
    if (isLng) {
      const mid = (minLng + maxLng) / 2;
      if (lng >= mid) {
        ch |= 1 << (4 - bit);
        minLng = mid;
      } else {
        maxLng = mid;
      }
    } else {
      const mid = (minLat + maxLat) / 2;
      if (lat >= mid) {
        ch |= 1 << (4 - bit);
        minLat = mid;
      } else {
        maxLat = mid;
      }
    }

    isLng = !isLng;
    bit++;

    if (bit === 5) {
      hash += BASE32[ch];
      bit = 0;
      ch = 0;
    }
  }

  return hash;
}

function geohashDecodeJS(hash: string): { lat: number; lng: number } {
  let minLat = -90,
    maxLat = 90;
  let minLng = -180,
    maxLng = 180;
  let isLng = true;

  for (const c of hash.toLowerCase()) {
    const idx = BASE32.indexOf(c);
    if (idx === -1) continue;

    for (let bit = 4; bit >= 0; bit--) {
      if (isLng) {
        const mid = (minLng + maxLng) / 2;
        if ((idx >> bit) & 1) {
          minLng = mid;
        } else {
          maxLng = mid;
        }
      } else {
        const mid = (minLat + maxLat) / 2;
        if ((idx >> bit) & 1) {
          minLat = mid;
        } else {
          maxLat = mid;
        }
      }
      isLng = !isLng;
    }
  }

  return {
    lat: (minLat + maxLat) / 2,
    lng: (minLng + maxLng) / 2,
  };
}

function geohashNeighborsJS(hash: string): string[] {
  const { lat, lng } = geohashDecodeJS(hash);
  const precision = hash.length;

  // Calculate approximate cell size
  const latErr = 90 / Math.pow(2, Math.ceil((precision * 5) / 2));
  const lngErr = 180 / Math.pow(2, Math.floor((precision * 5) / 2));

  const offsets = [
    [-1, -1],
    [-1, 0],
    [-1, 1],
    [0, -1],
    [0, 1],
    [1, -1],
    [1, 0],
    [1, 1],
  ];

  return offsets.map(([dLat, dLng]) =>
    geohashEncodeJS(lat + dLat * latErr * 2, lng + dLng * lngErr * 2, precision)
  );
}

function haversineJS(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371000; // Earth radius in meters
  const toRad = (deg: number) => (deg * Math.PI) / 180;

  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;

  return R * 2 * Math.asin(Math.sqrt(a));
}

function boundingBoxJS(
  lat: number,
  lng: number,
  radiusMeters: number
): { minLat: number; maxLat: number; minLng: number; maxLng: number } {
  const R = 6371000;
  const latDelta = (radiusMeters / R) * (180 / Math.PI);
  const lngDelta =
    (radiusMeters / (R * Math.cos((lat * Math.PI) / 180))) * (180 / Math.PI);

  return {
    minLat: lat - latDelta,
    maxLat: lat + latDelta,
    minLng: lng - lngDelta,
    maxLng: lng + lngDelta,
  };
}
