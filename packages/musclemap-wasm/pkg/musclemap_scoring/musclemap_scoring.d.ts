/* tslint:disable */
/* eslint-disable */

/**
 * Exercise data for scoring
 */
export class ExerciseData {
    free(): void;
    [Symbol.dispose](): void;
    constructor(id: string, name: string, primary_activation: number, equipment_flags: number, difficulty: number, movement_pattern: number, is_compound: boolean, joint_stress: number, setup_time: number, archetype_id: number);
    /**
     * Target archetype ID
     */
    archetype_id: number;
    /**
     * Difficulty level (1-5)
     */
    difficulty: number;
    /**
     * Equipment required (encoded as bitflags)
     */
    equipment_flags: number;
    id: string;
    /**
     * Is compound exercise
     */
    is_compound: boolean;
    /**
     * Joint stress score (0-100)
     */
    joint_stress: number;
    /**
     * Movement pattern ID
     */
    movement_pattern: number;
    name: string;
    /**
     * Primary muscle activation (0-100)
     */
    primary_activation: number;
    /**
     * Setup time in seconds
     */
    setup_time: number;
}

/**
 * Individual factor score result
 */
export class FactorScore {
    private constructor();
    free(): void;
    [Symbol.dispose](): void;
    name: string;
    raw_score: number;
    weight: number;
    weighted_score: number;
}

/**
 * Exercise Scoring Engine
 */
export class ScoringEngine {
    free(): void;
    [Symbol.dispose](): void;
    /**
     * Add an exercise to recent history (for novelty calculation)
     */
    add_recent_exercise(exercise_id: string): void;
    /**
     * Clear all state
     */
    clear(): void;
    /**
     * Get factor names
     */
    static get_factor_names(): string[];
    /**
     * Get current weights
     */
    get_weights(): Float32Array;
    /**
     * Create a new scoring engine with default weights
     */
    constructor();
    /**
     * Set muscle imbalance score
     */
    set_imbalance(muscle_id: number, imbalance: number): void;
    /**
     * Set user preference for an exercise
     */
    set_preference(exercise_id: string, preference: number): void;
    /**
     * Set custom weights for factors
     */
    set_weights(weights: Float32Array): void;
}

/**
 * Complete scoring result
 */
export class ScoringResult {
    free(): void;
    [Symbol.dispose](): void;
    constructor(exercise_id: string, total_score: number, duration_ms: number);
    duration_ms: number;
    exercise_id: string;
    native: boolean;
    total_score: number;
}

/**
 * User context for scoring
 */
export class UserContext {
    free(): void;
    [Symbol.dispose](): void;
    constructor(archetype_id: number, experience_level: number, equipment_flags: number, injury_flags: number, femur_ratio: number, arm_ratio: number, torso_ratio: number);
    /**
     * User's archetype ID
     */
    archetype_id: number;
    /**
     * Arm span to height ratio
     */
    arm_ratio: number;
    /**
     * Available equipment (bitflags)
     */
    equipment_flags: number;
    /**
     * Experience level (1-5)
     */
    experience_level: number;
    /**
     * Femur to height ratio (for biomechanics)
     */
    femur_ratio: number;
    /**
     * Injured body parts (bitflags)
     */
    injury_flags: number;
    /**
     * Torso to leg ratio
     */
    torso_ratio: number;
}

/**
 * Workout context for scoring
 */
export class WorkoutContext {
    free(): void;
    [Symbol.dispose](): void;
    constructor(target_muscle: number, used_patterns: number, compound_count: number, isolation_count: number, accumulated_stress: number, time_spent: number, time_budget: number);
    /**
     * Total joint stress accumulated
     */
    accumulated_stress: number;
    /**
     * Compound exercises already included
     */
    compound_count: number;
    /**
     * Isolation exercises already included
     */
    isolation_count: number;
    /**
     * Target muscle ID
     */
    target_muscle: number;
    /**
     * Time budget for workout (seconds)
     */
    time_budget: number;
    /**
     * Time already spent in workout (seconds)
     */
    time_spent: number;
    /**
     * Movement patterns already in workout (bitflags)
     */
    used_patterns: number;
}

/**
 * Get recommended exercises for a target muscle
 *
 * # Arguments
 * * `exercises` - All available exercises
 * * `user` - User context
 * * `workout` - Current workout context
 * * `limit` - Maximum number to return
 *
 * # Returns
 * Top N exercises by score
 */
export function get_recommendations(exercises: ExerciseData[], user: UserContext, workout: WorkoutContext, limit: number): any;

/**
 * Score exercise with full factor breakdown
 */
export function score_exercise_detailed(exercise: ExerciseData, user: UserContext, workout: WorkoutContext, weights?: Float32Array | null): any;

/**
 * Score a single exercise (simple interface)
 *
 * # Arguments
 * * `exercise` - Exercise to score
 * * `user` - User context
 * * `workout` - Current workout context
 * * `weights` - Optional custom weights (uses defaults if empty)
 *
 * # Returns
 * Total score (0-100)
 */
export function score_exercise_simple(exercise: ExerciseData, user: UserContext, workout: WorkoutContext, weights?: Float32Array | null): number;

/**
 * Score multiple exercises and return sorted results
 *
 * # Arguments
 * * `exercises` - Array of exercises to score
 * * `user` - User context
 * * `workout` - Current workout context
 *
 * # Returns
 * Array of (exercise_id, score) tuples, sorted by score descending
 */
export function score_exercises_batch(exercises: ExerciseData[], user: UserContext, workout: WorkoutContext): any;

export type InitInput = RequestInfo | URL | Response | BufferSource | WebAssembly.Module;

export interface InitOutput {
    readonly memory: WebAssembly.Memory;
    readonly __wbg_exercisedata_free: (a: number, b: number) => void;
    readonly __wbg_factorscore_free: (a: number, b: number) => void;
    readonly __wbg_get_exercisedata_archetype_id: (a: number) => number;
    readonly __wbg_get_exercisedata_difficulty: (a: number) => number;
    readonly __wbg_get_exercisedata_equipment_flags: (a: number) => number;
    readonly __wbg_get_exercisedata_id: (a: number) => [number, number];
    readonly __wbg_get_exercisedata_is_compound: (a: number) => number;
    readonly __wbg_get_exercisedata_joint_stress: (a: number) => number;
    readonly __wbg_get_exercisedata_movement_pattern: (a: number) => number;
    readonly __wbg_get_exercisedata_name: (a: number) => [number, number];
    readonly __wbg_get_exercisedata_primary_activation: (a: number) => number;
    readonly __wbg_get_exercisedata_setup_time: (a: number) => number;
    readonly __wbg_get_factorscore_raw_score: (a: number) => number;
    readonly __wbg_get_factorscore_weight: (a: number) => number;
    readonly __wbg_get_factorscore_weighted_score: (a: number) => number;
    readonly __wbg_get_scoringresult_duration_ms: (a: number) => number;
    readonly __wbg_get_scoringresult_native: (a: number) => number;
    readonly __wbg_get_usercontext_archetype_id: (a: number) => number;
    readonly __wbg_get_usercontext_equipment_flags: (a: number) => number;
    readonly __wbg_get_usercontext_experience_level: (a: number) => number;
    readonly __wbg_get_usercontext_femur_ratio: (a: number) => number;
    readonly __wbg_get_usercontext_injury_flags: (a: number) => number;
    readonly __wbg_get_workoutcontext_accumulated_stress: (a: number) => number;
    readonly __wbg_get_workoutcontext_compound_count: (a: number) => number;
    readonly __wbg_get_workoutcontext_isolation_count: (a: number) => number;
    readonly __wbg_get_workoutcontext_target_muscle: (a: number) => number;
    readonly __wbg_get_workoutcontext_time_budget: (a: number) => number;
    readonly __wbg_get_workoutcontext_time_spent: (a: number) => number;
    readonly __wbg_scoringengine_free: (a: number, b: number) => void;
    readonly __wbg_scoringresult_free: (a: number, b: number) => void;
    readonly __wbg_set_exercisedata_archetype_id: (a: number, b: number) => void;
    readonly __wbg_set_exercisedata_difficulty: (a: number, b: number) => void;
    readonly __wbg_set_exercisedata_equipment_flags: (a: number, b: number) => void;
    readonly __wbg_set_exercisedata_id: (a: number, b: number, c: number) => void;
    readonly __wbg_set_exercisedata_is_compound: (a: number, b: number) => void;
    readonly __wbg_set_exercisedata_joint_stress: (a: number, b: number) => void;
    readonly __wbg_set_exercisedata_movement_pattern: (a: number, b: number) => void;
    readonly __wbg_set_exercisedata_name: (a: number, b: number, c: number) => void;
    readonly __wbg_set_exercisedata_primary_activation: (a: number, b: number) => void;
    readonly __wbg_set_exercisedata_setup_time: (a: number, b: number) => void;
    readonly __wbg_set_factorscore_raw_score: (a: number, b: number) => void;
    readonly __wbg_set_factorscore_weight: (a: number, b: number) => void;
    readonly __wbg_set_factorscore_weighted_score: (a: number, b: number) => void;
    readonly __wbg_set_scoringresult_duration_ms: (a: number, b: number) => void;
    readonly __wbg_set_scoringresult_exercise_id: (a: number, b: number, c: number) => void;
    readonly __wbg_set_scoringresult_native: (a: number, b: number) => void;
    readonly __wbg_set_usercontext_archetype_id: (a: number, b: number) => void;
    readonly __wbg_set_usercontext_equipment_flags: (a: number, b: number) => void;
    readonly __wbg_set_usercontext_experience_level: (a: number, b: number) => void;
    readonly __wbg_set_usercontext_femur_ratio: (a: number, b: number) => void;
    readonly __wbg_set_usercontext_injury_flags: (a: number, b: number) => void;
    readonly __wbg_set_workoutcontext_accumulated_stress: (a: number, b: number) => void;
    readonly __wbg_set_workoutcontext_compound_count: (a: number, b: number) => void;
    readonly __wbg_set_workoutcontext_isolation_count: (a: number, b: number) => void;
    readonly __wbg_set_workoutcontext_target_muscle: (a: number, b: number) => void;
    readonly __wbg_set_workoutcontext_time_budget: (a: number, b: number) => void;
    readonly __wbg_set_workoutcontext_time_spent: (a: number, b: number) => void;
    readonly __wbg_usercontext_free: (a: number, b: number) => void;
    readonly __wbg_workoutcontext_free: (a: number, b: number) => void;
    readonly exercisedata_new: (a: number, b: number, c: number, d: number, e: number, f: number, g: number, h: number, i: number, j: number, k: number, l: number) => number;
    readonly get_recommendations: (a: number, b: number, c: number, d: number, e: number) => [number, number, number];
    readonly score_exercise_detailed: (a: number, b: number, c: number, d: number, e: number) => [number, number, number];
    readonly score_exercise_simple: (a: number, b: number, c: number, d: number, e: number) => number;
    readonly score_exercises_batch: (a: number, b: number, c: number, d: number) => [number, number, number];
    readonly scoringengine_add_recent_exercise: (a: number, b: number, c: number) => void;
    readonly scoringengine_clear: (a: number) => void;
    readonly scoringengine_get_factor_names: () => [number, number];
    readonly scoringengine_get_weights: (a: number) => [number, number];
    readonly scoringengine_new: () => number;
    readonly scoringengine_set_imbalance: (a: number, b: number, c: number) => void;
    readonly scoringengine_set_preference: (a: number, b: number, c: number, d: number) => void;
    readonly scoringengine_set_weights: (a: number, b: number, c: number) => [number, number];
    readonly scoringresult_new: (a: number, b: number, c: number, d: number) => number;
    readonly usercontext_new: (a: number, b: number, c: number, d: number, e: number, f: number, g: number) => number;
    readonly workoutcontext_new: (a: number, b: number, c: number, d: number, e: number, f: number, g: number) => number;
    readonly __wbg_set_factorscore_name: (a: number, b: number, c: number) => void;
    readonly __wbg_set_scoringresult_total_score: (a: number, b: number) => void;
    readonly __wbg_set_usercontext_arm_ratio: (a: number, b: number) => void;
    readonly __wbg_set_usercontext_torso_ratio: (a: number, b: number) => void;
    readonly __wbg_set_workoutcontext_used_patterns: (a: number, b: number) => void;
    readonly __wbg_get_factorscore_name: (a: number) => [number, number];
    readonly __wbg_get_scoringresult_exercise_id: (a: number) => [number, number];
    readonly __wbg_get_scoringresult_total_score: (a: number) => number;
    readonly __wbg_get_usercontext_arm_ratio: (a: number) => number;
    readonly __wbg_get_usercontext_torso_ratio: (a: number) => number;
    readonly __wbg_get_workoutcontext_used_patterns: (a: number) => number;
    readonly __wbindgen_malloc: (a: number, b: number) => number;
    readonly __wbindgen_realloc: (a: number, b: number, c: number, d: number) => number;
    readonly __wbindgen_externrefs: WebAssembly.Table;
    readonly __externref_table_alloc: () => number;
    readonly __externref_table_dealloc: (a: number) => void;
    readonly __wbindgen_free: (a: number, b: number, c: number) => void;
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
