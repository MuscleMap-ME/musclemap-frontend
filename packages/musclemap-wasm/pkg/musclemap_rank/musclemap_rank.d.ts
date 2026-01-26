/* tslint:disable */
/* eslint-disable */

/**
 * Individual rank result
 */
export class RankEntry {
    free(): void;
    [Symbol.dispose](): void;
    constructor(index: number, score: number, rank: number, percentile: number);
    /**
     * Original index in the input array
     */
    index: number;
    /**
     * Percentile (100 = top, 0 = bottom)
     */
    percentile: number;
    /**
     * Rank (1 = highest score)
     */
    rank: number;
    /**
     * Original score
     */
    score: number;
}

/**
 * Result of ranking calculation
 */
export class RankResult {
    free(): void;
    [Symbol.dispose](): void;
    constructor(count: number, duration_ms: number);
    /**
     * Total number of entries
     */
    count: number;
    /**
     * Time taken in milliseconds
     */
    duration_ms: number;
    /**
     * Whether native WASM was used
     */
    native: boolean;
}

/**
 * Calculate ranks and percentiles for a list of scores
 *
 * # Arguments
 * * `scores` - Array of scores (higher = better)
 *
 * # Returns
 * Array of ranks (1-based, same order as input)
 */
export function rank_calculate(scores: Float64Array): Uint32Array;

/**
 * Calculate both ranks and percentiles
 *
 * # Arguments
 * * `scores` - Array of scores
 *
 * # Returns
 * Tuple of (ranks, percentiles) as JsValue
 */
export function rank_calculate_full(scores: Float64Array): any;

/**
 * Calculate competition rank (standard 1, 2, 2, 4 for ties)
 *
 * This is the same as rank_calculate but explicitly named for clarity.
 */
export function rank_competition(scores: Float64Array): Uint32Array;

/**
 * Calculate dense rank (no gaps in ranking)
 *
 * # Arguments
 * * `scores` - Array of scores
 *
 * # Returns
 * Array of dense ranks (1, 2, 3, ... with no gaps for ties)
 */
export function rank_dense(scores: Float64Array): Uint32Array;

/**
 * Find the rank of a specific score using binary search
 *
 * # Arguments
 * * `sorted_scores` - Scores sorted in descending order
 * * `target_score` - Score to find rank for
 *
 * # Returns
 * Rank (1-based), or 0 if not applicable
 */
export function rank_find(sorted_scores: Float64Array, target_score: number): number;

/**
 * Calculate percentiles for a list of scores
 *
 * # Arguments
 * * `scores` - Array of scores (higher = better)
 *
 * # Returns
 * Array of percentiles (0-100, same order as input)
 */
export function rank_percentiles(scores: Float64Array): Float64Array;

/**
 * Sort scores in descending order and return indices
 *
 * # Arguments
 * * `scores` - Array of scores
 *
 * # Returns
 * Array of original indices in sorted order
 */
export function rank_sort_indices(scores: Float64Array): Uint32Array;

/**
 * Get statistics about the score distribution
 *
 * # Arguments
 * * `scores` - Array of scores
 *
 * # Returns
 * Statistics object with min, max, mean, median
 */
export function rank_stats(scores: Float64Array): any;

/**
 * Get top N entries with their ranks
 *
 * # Arguments
 * * `scores` - Array of scores
 * * `n` - Number of top entries to return
 *
 * # Returns
 * Array of (original_index, score, rank) tuples as JsValue
 */
export function rank_top_n(scores: Float64Array, n: number): any;

export type InitInput = RequestInfo | URL | Response | BufferSource | WebAssembly.Module;

export interface InitOutput {
    readonly memory: WebAssembly.Memory;
    readonly __wbg_get_rankentry_index: (a: number) => number;
    readonly __wbg_get_rankentry_percentile: (a: number) => number;
    readonly __wbg_get_rankentry_rank: (a: number) => number;
    readonly __wbg_get_rankentry_score: (a: number) => number;
    readonly __wbg_get_rankresult_count: (a: number) => number;
    readonly __wbg_get_rankresult_native: (a: number) => number;
    readonly __wbg_rankentry_free: (a: number, b: number) => void;
    readonly __wbg_rankresult_free: (a: number, b: number) => void;
    readonly __wbg_set_rankentry_index: (a: number, b: number) => void;
    readonly __wbg_set_rankentry_percentile: (a: number, b: number) => void;
    readonly __wbg_set_rankentry_rank: (a: number, b: number) => void;
    readonly __wbg_set_rankentry_score: (a: number, b: number) => void;
    readonly __wbg_set_rankresult_count: (a: number, b: number) => void;
    readonly __wbg_set_rankresult_native: (a: number, b: number) => void;
    readonly rank_calculate: (a: number, b: number) => [number, number];
    readonly rank_calculate_full: (a: number, b: number) => [number, number, number];
    readonly rank_competition: (a: number, b: number) => [number, number];
    readonly rank_dense: (a: number, b: number) => [number, number];
    readonly rank_find: (a: number, b: number, c: number) => number;
    readonly rank_percentiles: (a: number, b: number) => [number, number];
    readonly rank_sort_indices: (a: number, b: number) => [number, number];
    readonly rank_stats: (a: number, b: number) => [number, number, number];
    readonly rank_top_n: (a: number, b: number, c: number) => [number, number, number];
    readonly rankentry_new: (a: number, b: number, c: number, d: number) => number;
    readonly rankresult_new: (a: number, b: number) => number;
    readonly __wbg_set_rankresult_duration_ms: (a: number, b: number) => void;
    readonly __wbg_get_rankresult_duration_ms: (a: number) => number;
    readonly __wbindgen_malloc: (a: number, b: number) => number;
    readonly __wbindgen_realloc: (a: number, b: number, c: number, d: number) => number;
    readonly __wbindgen_externrefs: WebAssembly.Table;
    readonly __wbindgen_free: (a: number, b: number, c: number) => void;
    readonly __externref_table_dealloc: (a: number) => void;
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
