/* tslint:disable */
/* eslint-disable */

/**
 * Bounding box result
 */
export class BoundingBox {
    free(): void;
    [Symbol.dispose](): void;
    /**
     * Check if a point is within this bounding box
     */
    contains(lat: number, lng: number): boolean;
    constructor(min_lat: number, max_lat: number, min_lng: number, max_lng: number);
    max_lat: number;
    max_lng: number;
    min_lat: number;
    min_lng: number;
}

/**
 * Decoded coordinates result
 */
export class DecodedCoords {
    free(): void;
    [Symbol.dispose](): void;
    constructor(lat: number, lng: number);
    lat: number;
    lng: number;
}

/**
 * Calculate bounding box for a point and radius
 *
 * # Arguments
 * * `lat`, `lng` - Center point
 * * `radius_meters` - Radius in meters
 *
 * # Returns
 * BoundingBox with min/max lat/lng
 */
export function bounding_box(lat: number, lng: number, radius_meters: number): BoundingBox;

/**
 * Filter points within radius (returns indices)
 *
 * # Arguments
 * * `origin_lat`, `origin_lng` - Origin point
 * * `targets` - Flat array of [lat1, lng1, lat2, lng2, ...]
 * * `radius_meters` - Maximum distance
 *
 * # Returns
 * Array of indices of points within radius
 */
export function filter_within_radius(origin_lat: number, origin_lng: number, targets: Float64Array, radius_meters: number): Uint32Array;

/**
 * Decode geohash string to latitude/longitude
 *
 * # Arguments
 * * `hash` - Geohash string (1-12 characters)
 *
 * # Returns
 * DecodedCoords with lat/lng or error
 */
export function geohash_decode(hash: string): DecodedCoords;

/**
 * Encode latitude/longitude to geohash string
 *
 * # Arguments
 * * `lat` - Latitude (-90 to 90)
 * * `lng` - Longitude (-180 to 180)
 * * `precision` - Number of characters (1-12, default 9)
 *
 * # Returns
 * Geohash string or error
 */
export function geohash_encode(lat: number, lng: number, precision: number): string;

/**
 * Batch encode multiple coordinates to geohashes
 *
 * # Arguments
 * * `coords` - Flat array of [lat1, lng1, lat2, lng2, ...]
 * * `precision` - Geohash precision
 *
 * # Returns
 * Array of geohash strings
 */
export function geohash_encode_batch(coords: Float64Array, precision: number): string[];

/**
 * Get neighboring geohashes (8 directions)
 *
 * # Arguments
 * * `hash` - Center geohash
 *
 * # Returns
 * Array of 8 neighbor hashes [N, NE, E, SE, S, SW, W, NW]
 */
export function geohash_neighbors(hash: string): string[];

/**
 * Batch calculate distances from one point to many points
 *
 * # Arguments
 * * `origin_lat`, `origin_lng` - Origin point
 * * `targets` - Flat array of [lat1, lng1, lat2, lng2, ...]
 *
 * # Returns
 * Array of distances in meters
 */
export function haversine_batch(origin_lat: number, origin_lng: number, targets: Float64Array): Float64Array;

/**
 * Calculate distance between two points using Haversine formula
 *
 * # Arguments
 * * `lat1`, `lng1` - First point coordinates
 * * `lat2`, `lng2` - Second point coordinates
 *
 * # Returns
 * Distance in meters
 */
export function haversine_meters(lat1: number, lng1: number, lat2: number, lng2: number): number;

/**
 * Check if a point is within a given radius of another point
 *
 * # Arguments
 * * `lat1`, `lng1` - Center point
 * * `lat2`, `lng2` - Point to check
 * * `radius_meters` - Maximum distance
 *
 * # Returns
 * true if within radius
 */
export function is_within_radius(lat1: number, lng1: number, lat2: number, lng2: number, radius_meters: number): boolean;

/**
 * Get optimal geohash precision for a given radius
 *
 * # Arguments
 * * `radius_meters` - Search radius in meters
 *
 * # Returns
 * Recommended precision (1-12)
 */
export function optimal_precision(radius_meters: number): number;

export type InitInput = RequestInfo | URL | Response | BufferSource | WebAssembly.Module;

export interface InitOutput {
    readonly memory: WebAssembly.Memory;
    readonly __wbg_boundingbox_free: (a: number, b: number) => void;
    readonly __wbg_decodedcoords_free: (a: number, b: number) => void;
    readonly __wbg_get_boundingbox_max_lat: (a: number) => number;
    readonly __wbg_get_boundingbox_max_lng: (a: number) => number;
    readonly __wbg_get_boundingbox_min_lat: (a: number) => number;
    readonly __wbg_get_boundingbox_min_lng: (a: number) => number;
    readonly __wbg_set_boundingbox_max_lat: (a: number, b: number) => void;
    readonly __wbg_set_boundingbox_max_lng: (a: number, b: number) => void;
    readonly __wbg_set_boundingbox_min_lat: (a: number, b: number) => void;
    readonly __wbg_set_boundingbox_min_lng: (a: number, b: number) => void;
    readonly bounding_box: (a: number, b: number, c: number) => number;
    readonly boundingbox_contains: (a: number, b: number, c: number) => number;
    readonly boundingbox_new: (a: number, b: number, c: number, d: number) => number;
    readonly filter_within_radius: (a: number, b: number, c: number, d: number, e: number) => [number, number, number, number];
    readonly geohash_decode: (a: number, b: number) => [number, number, number];
    readonly geohash_encode: (a: number, b: number, c: number) => [number, number, number, number];
    readonly geohash_encode_batch: (a: number, b: number, c: number) => [number, number, number, number];
    readonly geohash_neighbors: (a: number, b: number) => [number, number, number, number];
    readonly haversine_batch: (a: number, b: number, c: number, d: number) => [number, number, number, number];
    readonly is_within_radius: (a: number, b: number, c: number, d: number, e: number) => number;
    readonly optimal_precision: (a: number) => number;
    readonly __wbg_set_decodedcoords_lat: (a: number, b: number) => void;
    readonly __wbg_set_decodedcoords_lng: (a: number, b: number) => void;
    readonly haversine_meters: (a: number, b: number, c: number, d: number) => number;
    readonly decodedcoords_new: (a: number, b: number) => number;
    readonly __wbg_get_decodedcoords_lat: (a: number) => number;
    readonly __wbg_get_decodedcoords_lng: (a: number) => number;
    readonly __wbindgen_externrefs: WebAssembly.Table;
    readonly __wbindgen_malloc: (a: number, b: number) => number;
    readonly __externref_table_dealloc: (a: number) => void;
    readonly __wbindgen_free: (a: number, b: number, c: number) => void;
    readonly __wbindgen_realloc: (a: number, b: number, c: number, d: number) => number;
    readonly __externref_drop_slice: (a: number, b: number) => void;
    readonly __wbindgen_start: () => void;
}

export type SyncInitInput = BufferSource | WebAssembly.Module;

/**
 * Instantiates the given `module`, which can either be bytes or
 * a precompiled `WebAssembly.Module`.
 *
 * @param {{ module: SyncInitInput }} module - Passing `SyncInitInput` directly is deprecated.
 *
 * @returns {InitOutput}
 */
export function initSync(module: { module: SyncInitInput } | SyncInitInput): InitOutput;

/**
 * If `module_or_path` is {RequestInfo} or {URL}, makes a request and
 * for everything else, calls `WebAssembly.instantiate` directly.
 *
 * @param {{ module_or_path: InitInput | Promise<InitInput> }} module_or_path - Passing `InitInput` directly is deprecated.
 *
 * @returns {Promise<InitOutput>}
 */
export default function __wbg_init (module_or_path?: { module_or_path: InitInput | Promise<InitInput> } | InitInput | Promise<InitInput>): Promise<InitOutput>;
