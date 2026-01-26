/* tslint:disable */
/* eslint-disable */

/**
 * Detailed TU calculation result with muscle breakdown
 */
export class DetailedTUResult {
    private constructor();
    free(): void;
    [Symbol.dispose](): void;
    duration_ms: number;
    exercise_count: number;
    muscle_count: number;
    native: boolean;
    total_tu: number;
}

/**
 * Exercise input for TU calculation
 */
export class ExerciseInput {
    free(): void;
    [Symbol.dispose](): void;
    constructor(exercise_id: string, sets: number, reps: number, weight_kg: number);
    exercise_id: string;
    reps: number;
    sets: number;
    weight_kg: number;
}

/**
 * Muscle activation data
 */
export class MuscleActivation {
    free(): void;
    [Symbol.dispose](): void;
    constructor(muscle_id: string, activation: number);
    /**
     * Activation percentage (0-100)
     */
    activation: number;
    muscle_id: string;
}

/**
 * Muscle breakdown in TU result
 */
export class MuscleTU {
    private constructor();
    free(): void;
    [Symbol.dispose](): void;
    muscle_id: string;
    tu: number;
    weighted_tu: number;
}

/**
 * TU Calculator with caching
 */
export class TUCalculator {
    free(): void;
    [Symbol.dispose](): void;
    /**
     * Add an exercise to the cache
     *
     * # Arguments
     * * `exercise_id` - Unique exercise identifier
     * * `muscle_ids` - Array of muscle IDs
     * * `activations` - Array of activation percentages (0-100)
     */
    add_exercise(exercise_id: string, muscle_ids: string[], activations: Float32Array): void;
    /**
     * Calculate TU for a workout using cached exercise data
     *
     * # Arguments
     * * `exercise_ids` - Array of exercise IDs
     * * `sets` - Array of set counts (corresponding to exercise_ids)
     */
    calculate_cached(exercise_ids: string[], sets: Uint32Array): TUResult;
    /**
     * Clear all cached data
     */
    clear(): void;
    /**
     * Get the number of cached exercises
     */
    exercise_count(): number;
    /**
     * Get the number of registered muscles
     */
    muscle_count(): number;
    /**
     * Create a new TU calculator
     */
    constructor();
    /**
     * Set bias weight for a muscle
     *
     * # Arguments
     * * `muscle_id` - Muscle identifier
     * * `bias_weight` - Weight multiplier (typically 1.0)
     */
    set_muscle_bias(muscle_id: string, bias_weight: number): void;
}

/**
 * Result of TU calculation
 */
export class TUResult {
    free(): void;
    [Symbol.dispose](): void;
    constructor(total_tu: number, duration_ms: number);
    /**
     * Time taken in milliseconds
     */
    duration_ms: number;
    /**
     * Whether native WASM was used
     */
    native: boolean;
    /**
     * Total Training Units
     */
    total_tu: number;
}

/**
 * Batch calculate TU for multiple workouts
 *
 * # Arguments
 * * `all_activations` - Concatenated activations for all workouts
 * * `all_sets` - Concatenated sets for all workouts
 * * `bias_weights` - Shared bias weights per muscle
 * * `workout_sizes` - Number of exercises in each workout
 * * `muscle_count` - Number of muscles
 *
 * # Returns
 * Array of TU values for each workout
 */
export function tu_calculate_batch(all_activations: Float32Array, all_sets: Int32Array, bias_weights: Float32Array, workout_sizes: Int32Array, muscle_count: number): Float32Array;

/**
 * Calculate TU with full breakdown per muscle
 *
 * # Arguments
 * * `activations` - Flat array of activations
 * * `sets` - Sets per exercise
 * * `bias_weights` - Bias weight per muscle
 * * `muscle_ids` - Array of muscle IDs
 * * `exercise_count` - Number of exercises
 *
 * # Returns
 * JSON string with detailed breakdown
 */
export function tu_calculate_detailed(activations: Float32Array, sets: Int32Array, bias_weights: Float32Array, muscle_ids: string[], exercise_count: number): any;

/**
 * Calculate TU directly without caching (simple interface)
 *
 * # Arguments
 * * `activations` - Flat array: [ex0_m0, ex0_m1, ..., ex1_m0, ...] (0-100 values)
 * * `sets` - Sets per exercise
 * * `bias_weights` - Bias weight per muscle
 * * `exercise_count` - Number of exercises
 * * `muscle_count` - Number of muscles
 *
 * # Returns
 * Total TU value
 */
export function tu_calculate_simple(activations: Float32Array, sets: Int32Array, bias_weights: Float32Array, exercise_count: number, muscle_count: number): number;

export type InitInput = RequestInfo | URL | Response | BufferSource | WebAssembly.Module;

export interface InitOutput {
    readonly memory: WebAssembly.Memory;
    readonly __wbg_detailedturesult_free: (a: number, b: number) => void;
    readonly __wbg_exerciseinput_free: (a: number, b: number) => void;
    readonly __wbg_get_detailedturesult_duration_ms: (a: number) => number;
    readonly __wbg_get_detailedturesult_exercise_count: (a: number) => number;
    readonly __wbg_get_detailedturesult_muscle_count: (a: number) => number;
    readonly __wbg_get_detailedturesult_native: (a: number) => number;
    readonly __wbg_get_detailedturesult_total_tu: (a: number) => number;
    readonly __wbg_get_exerciseinput_exercise_id: (a: number) => [number, number];
    readonly __wbg_get_exerciseinput_sets: (a: number) => number;
    readonly __wbg_get_exerciseinput_weight_kg: (a: number) => number;
    readonly __wbg_get_muscleactivation_activation: (a: number) => number;
    readonly __wbg_get_muscletu_weighted_tu: (a: number) => number;
    readonly __wbg_get_turesult_native: (a: number) => number;
    readonly __wbg_muscleactivation_free: (a: number, b: number) => void;
    readonly __wbg_muscletu_free: (a: number, b: number) => void;
    readonly __wbg_set_detailedturesult_duration_ms: (a: number, b: number) => void;
    readonly __wbg_set_detailedturesult_exercise_count: (a: number, b: number) => void;
    readonly __wbg_set_detailedturesult_muscle_count: (a: number, b: number) => void;
    readonly __wbg_set_detailedturesult_native: (a: number, b: number) => void;
    readonly __wbg_set_detailedturesult_total_tu: (a: number, b: number) => void;
    readonly __wbg_set_exerciseinput_exercise_id: (a: number, b: number, c: number) => void;
    readonly __wbg_set_exerciseinput_sets: (a: number, b: number) => void;
    readonly __wbg_set_exerciseinput_weight_kg: (a: number, b: number) => void;
    readonly __wbg_set_muscleactivation_activation: (a: number, b: number) => void;
    readonly __wbg_set_muscletu_weighted_tu: (a: number, b: number) => void;
    readonly __wbg_set_turesult_native: (a: number, b: number) => void;
    readonly __wbg_tucalculator_free: (a: number, b: number) => void;
    readonly __wbg_turesult_free: (a: number, b: number) => void;
    readonly exerciseinput_new: (a: number, b: number, c: number, d: number, e: number) => number;
    readonly muscleactivation_new: (a: number, b: number, c: number) => number;
    readonly tu_calculate_batch: (a: number, b: number, c: number, d: number, e: number, f: number, g: number, h: number, i: number) => [number, number];
    readonly tu_calculate_detailed: (a: number, b: number, c: number, d: number, e: number, f: number, g: number, h: number, i: number) => [number, number, number];
    readonly tu_calculate_simple: (a: number, b: number, c: number, d: number, e: number, f: number, g: number, h: number) => number;
    readonly tucalculator_add_exercise: (a: number, b: number, c: number, d: number, e: number, f: number, g: number) => [number, number];
    readonly tucalculator_calculate_cached: (a: number, b: number, c: number, d: number, e: number) => [number, number, number];
    readonly tucalculator_clear: (a: number) => void;
    readonly tucalculator_exercise_count: (a: number) => number;
    readonly tucalculator_muscle_count: (a: number) => number;
    readonly tucalculator_new: () => number;
    readonly tucalculator_set_muscle_bias: (a: number, b: number, c: number, d: number) => void;
    readonly turesult_new: (a: number, b: number) => number;
    readonly __wbg_set_muscleactivation_muscle_id: (a: number, b: number, c: number) => void;
    readonly __wbg_set_muscletu_muscle_id: (a: number, b: number, c: number) => void;
    readonly __wbg_set_exerciseinput_reps: (a: number, b: number) => void;
    readonly __wbg_set_muscletu_tu: (a: number, b: number) => void;
    readonly __wbg_set_turesult_duration_ms: (a: number, b: number) => void;
    readonly __wbg_set_turesult_total_tu: (a: number, b: number) => void;
    readonly __wbg_get_muscleactivation_muscle_id: (a: number) => [number, number];
    readonly __wbg_get_muscletu_muscle_id: (a: number) => [number, number];
    readonly __wbg_get_exerciseinput_reps: (a: number) => number;
    readonly __wbg_get_muscletu_tu: (a: number) => number;
    readonly __wbg_get_turesult_duration_ms: (a: number) => number;
    readonly __wbg_get_turesult_total_tu: (a: number) => number;
    readonly __wbindgen_malloc: (a: number, b: number) => number;
    readonly __wbindgen_realloc: (a: number, b: number, c: number, d: number) => number;
    readonly __wbindgen_externrefs: WebAssembly.Table;
    readonly __wbindgen_free: (a: number, b: number, c: number) => void;
    readonly __externref_table_alloc: () => number;
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
