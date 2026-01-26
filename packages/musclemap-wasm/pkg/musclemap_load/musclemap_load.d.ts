/* tslint:disable */
/* eslint-disable */

/**
 * Experience levels
 */
export enum ExperienceLevel {
    Beginner = 1,
    Novice = 2,
    Intermediate = 3,
    Advanced = 4,
    Elite = 5,
}

/**
 * Load prescription result
 */
export class LoadPrescription {
    free(): void;
    [Symbol.dispose](): void;
    constructor(weight_kg: number, reps: number, rpe: number, percentage: number, tempo: string, rest_seconds: number, sets: number);
    /**
     * Percentage of 1RM
     */
    percentage: number;
    /**
     * Target reps
     */
    reps: number;
    /**
     * Rest period in seconds
     */
    rest_seconds: number;
    /**
     * Target RPE
     */
    rpe: number;
    /**
     * Number of sets
     */
    sets: number;
    /**
     * Tempo string (e.g., "3-1-2-0")
     */
    tempo: string;
    /**
     * Recommended weight in kg
     */
    weight_kg: number;
}

/**
 * 1RM estimation result
 */
export class OneRMResult {
    free(): void;
    [Symbol.dispose](): void;
    constructor(estimated_1rm: number, confidence: number, formula: string);
    /**
     * Confidence level (0-100)
     */
    confidence: number;
    /**
     * Estimated 1RM in kg
     */
    estimated_1rm: number;
    /**
     * Formula used
     */
    formula: string;
}

/**
 * Training phases
 */
export enum TrainingPhase {
    Hypertrophy = 0,
    Strength = 1,
    Power = 2,
    Peaking = 3,
    Deload = 4,
}

/**
 * Calculate recommended load for a training session
 *
 * # Arguments
 * * `e1rm` - Estimated 1RM in kg
 * * `target_reps` - Target rep range (e.g., 8)
 * * `target_rpe` - Target RPE (e.g., 8.0)
 * * `phase` - Training phase
 * * `experience` - Experience level
 *
 * # Returns
 * Load prescription
 */
export function calculate_load(e1rm: number, target_reps: number, target_rpe: number, phase: TrainingPhase, experience: ExperienceLevel): LoadPrescription;

/**
 * Batch calculate loads for multiple exercises
 */
export function calculate_loads_batch(e1rms: Float32Array, target_reps: Uint8Array, target_rpes: Float32Array, phase: TrainingPhase, experience: ExperienceLevel): any;

/**
 * Estimate 1RM from a lift
 *
 * # Arguments
 * * `weight` - Weight lifted in kg
 * * `reps` - Number of reps performed
 * * `rpe` - Optional RPE (if known)
 *
 * # Returns
 * Estimated 1RM result
 */
export function estimate_1rm(weight: number, reps: number, rpe?: number | null): OneRMResult;

/**
 * Get recommended rep ranges for a training phase
 */
export function get_phase_rep_range(phase: TrainingPhase): Uint8Array;

/**
 * Get recommended RPE range for a training phase
 */
export function get_phase_rpe_range(phase: TrainingPhase): Float32Array;

/**
 * Parse tempo string to total time under tension
 *
 * # Arguments
 * * `tempo` - Tempo string (e.g., "3-1-2-0")
 *
 * # Returns
 * Total seconds per rep, or None if invalid format
 */
export function parse_tempo(tempo: string): number | undefined;

/**
 * Get RPE for given percentage and reps
 *
 * # Arguments
 * * `percentage` - Percentage of 1RM (0.0-1.0)
 * * `reps` - Number of reps (1-12)
 *
 * # Returns
 * Estimated RPE (6.0-10.0)
 */
export function percentage_to_rpe(percentage: number, reps: number): number;

/**
 * Calculate progressive overload recommendation
 *
 * # Arguments
 * * `current_weight` - Current working weight in kg
 * * `last_rpe` - RPE from last session
 * * `target_rpe` - Target RPE for this session
 * * `min_increment` - Minimum weight increment (e.g., 2.5)
 *
 * # Returns
 * Recommended weight for next session
 */
export function progressive_overload(current_weight: number, last_rpe: number, target_rpe: number, min_increment: number): number;

/**
 * Get percentage of 1RM for given reps and RPE
 *
 * # Arguments
 * * `reps` - Number of reps (1-12)
 * * `rpe` - Rate of perceived exertion (6.0-10.0)
 *
 * # Returns
 * Percentage of 1RM (0.0-1.0)
 */
export function rpe_to_percentage(reps: number, rpe: number): number;

/**
 * Calculate time under tension for a set
 *
 * # Arguments
 * * `tempo` - Tempo string
 * * `reps` - Number of reps
 *
 * # Returns
 * Total seconds of tension, or 0 if invalid
 */
export function time_under_tension(tempo: string, reps: number): number;

export type InitInput = RequestInfo | URL | Response | BufferSource | WebAssembly.Module;

export interface InitOutput {
    readonly memory: WebAssembly.Memory;
    readonly __wbg_get_loadprescription_percentage: (a: number) => number;
    readonly __wbg_get_loadprescription_reps: (a: number) => number;
    readonly __wbg_get_loadprescription_rest_seconds: (a: number) => number;
    readonly __wbg_get_loadprescription_rpe: (a: number) => number;
    readonly __wbg_get_loadprescription_sets: (a: number) => number;
    readonly __wbg_get_loadprescription_tempo: (a: number) => [number, number];
    readonly __wbg_get_loadprescription_weight_kg: (a: number) => number;
    readonly __wbg_loadprescription_free: (a: number, b: number) => void;
    readonly __wbg_onermresult_free: (a: number, b: number) => void;
    readonly __wbg_set_loadprescription_percentage: (a: number, b: number) => void;
    readonly __wbg_set_loadprescription_reps: (a: number, b: number) => void;
    readonly __wbg_set_loadprescription_rest_seconds: (a: number, b: number) => void;
    readonly __wbg_set_loadprescription_rpe: (a: number, b: number) => void;
    readonly __wbg_set_loadprescription_sets: (a: number, b: number) => void;
    readonly __wbg_set_loadprescription_tempo: (a: number, b: number, c: number) => void;
    readonly __wbg_set_loadprescription_weight_kg: (a: number, b: number) => void;
    readonly calculate_load: (a: number, b: number, c: number, d: number, e: number) => number;
    readonly calculate_loads_batch: (a: number, b: number, c: number, d: number, e: number, f: number, g: number, h: number) => [number, number, number];
    readonly estimate_1rm: (a: number, b: number, c: number) => number;
    readonly get_phase_rep_range: (a: number) => [number, number];
    readonly get_phase_rpe_range: (a: number) => [number, number];
    readonly loadprescription_new: (a: number, b: number, c: number, d: number, e: number, f: number, g: number, h: number) => number;
    readonly onermresult_new: (a: number, b: number, c: number, d: number) => number;
    readonly parse_tempo: (a: number, b: number) => number;
    readonly percentage_to_rpe: (a: number, b: number) => number;
    readonly progressive_overload: (a: number, b: number, c: number, d: number) => number;
    readonly rpe_to_percentage: (a: number, b: number) => number;
    readonly time_under_tension: (a: number, b: number, c: number) => number;
    readonly __wbg_set_onermresult_formula: (a: number, b: number, c: number) => void;
    readonly __wbg_set_onermresult_confidence: (a: number, b: number) => void;
    readonly __wbg_set_onermresult_estimated_1rm: (a: number, b: number) => void;
    readonly __wbg_get_onermresult_formula: (a: number) => [number, number];
    readonly __wbg_get_onermresult_confidence: (a: number) => number;
    readonly __wbg_get_onermresult_estimated_1rm: (a: number) => number;
    readonly __wbindgen_malloc: (a: number, b: number) => number;
    readonly __wbindgen_realloc: (a: number, b: number, c: number, d: number) => number;
    readonly __wbindgen_externrefs: WebAssembly.Table;
    readonly __externref_table_dealloc: (a: number) => void;
    readonly __wbindgen_free: (a: number, b: number, c: number) => void;
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
