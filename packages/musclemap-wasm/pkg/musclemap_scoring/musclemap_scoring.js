/* @ts-self-types="./musclemap_scoring.d.ts" */

/**
 * Exercise data for scoring
 */
export class ExerciseData {
    static __unwrap(jsValue) {
        if (!(jsValue instanceof ExerciseData)) {
            return 0;
        }
        return jsValue.__destroy_into_raw();
    }
    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        ExerciseDataFinalization.unregister(this);
        return ptr;
    }
    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_exercisedata_free(ptr, 0);
    }
    /**
     * @param {string} id
     * @param {string} name
     * @param {number} primary_activation
     * @param {number} equipment_flags
     * @param {number} difficulty
     * @param {number} movement_pattern
     * @param {boolean} is_compound
     * @param {number} joint_stress
     * @param {number} setup_time
     * @param {number} archetype_id
     */
    constructor(id, name, primary_activation, equipment_flags, difficulty, movement_pattern, is_compound, joint_stress, setup_time, archetype_id) {
        const ptr0 = passStringToWasm0(id, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ptr1 = passStringToWasm0(name, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len1 = WASM_VECTOR_LEN;
        const ret = wasm.exercisedata_new(ptr0, len0, ptr1, len1, primary_activation, equipment_flags, difficulty, movement_pattern, is_compound, joint_stress, setup_time, archetype_id);
        this.__wbg_ptr = ret >>> 0;
        ExerciseDataFinalization.register(this, this.__wbg_ptr, this);
        return this;
    }
    /**
     * Target archetype ID
     * @returns {number}
     */
    get archetype_id() {
        const ret = wasm.__wbg_get_exercisedata_archetype_id(this.__wbg_ptr);
        return ret;
    }
    /**
     * Difficulty level (1-5)
     * @returns {number}
     */
    get difficulty() {
        const ret = wasm.__wbg_get_exercisedata_difficulty(this.__wbg_ptr);
        return ret;
    }
    /**
     * Equipment required (encoded as bitflags)
     * @returns {number}
     */
    get equipment_flags() {
        const ret = wasm.__wbg_get_exercisedata_equipment_flags(this.__wbg_ptr);
        return ret >>> 0;
    }
    /**
     * @returns {string}
     */
    get id() {
        let deferred1_0;
        let deferred1_1;
        try {
            const ret = wasm.__wbg_get_exercisedata_id(this.__wbg_ptr);
            deferred1_0 = ret[0];
            deferred1_1 = ret[1];
            return getStringFromWasm0(ret[0], ret[1]);
        } finally {
            wasm.__wbindgen_free(deferred1_0, deferred1_1, 1);
        }
    }
    /**
     * Is compound exercise
     * @returns {boolean}
     */
    get is_compound() {
        const ret = wasm.__wbg_get_exercisedata_is_compound(this.__wbg_ptr);
        return ret !== 0;
    }
    /**
     * Joint stress score (0-100)
     * @returns {number}
     */
    get joint_stress() {
        const ret = wasm.__wbg_get_exercisedata_joint_stress(this.__wbg_ptr);
        return ret;
    }
    /**
     * Movement pattern ID
     * @returns {number}
     */
    get movement_pattern() {
        const ret = wasm.__wbg_get_exercisedata_movement_pattern(this.__wbg_ptr);
        return ret;
    }
    /**
     * @returns {string}
     */
    get name() {
        let deferred1_0;
        let deferred1_1;
        try {
            const ret = wasm.__wbg_get_exercisedata_name(this.__wbg_ptr);
            deferred1_0 = ret[0];
            deferred1_1 = ret[1];
            return getStringFromWasm0(ret[0], ret[1]);
        } finally {
            wasm.__wbindgen_free(deferred1_0, deferred1_1, 1);
        }
    }
    /**
     * Primary muscle activation (0-100)
     * @returns {number}
     */
    get primary_activation() {
        const ret = wasm.__wbg_get_exercisedata_primary_activation(this.__wbg_ptr);
        return ret;
    }
    /**
     * Setup time in seconds
     * @returns {number}
     */
    get setup_time() {
        const ret = wasm.__wbg_get_exercisedata_setup_time(this.__wbg_ptr);
        return ret;
    }
    /**
     * Target archetype ID
     * @param {number} arg0
     */
    set archetype_id(arg0) {
        wasm.__wbg_set_exercisedata_archetype_id(this.__wbg_ptr, arg0);
    }
    /**
     * Difficulty level (1-5)
     * @param {number} arg0
     */
    set difficulty(arg0) {
        wasm.__wbg_set_exercisedata_difficulty(this.__wbg_ptr, arg0);
    }
    /**
     * Equipment required (encoded as bitflags)
     * @param {number} arg0
     */
    set equipment_flags(arg0) {
        wasm.__wbg_set_exercisedata_equipment_flags(this.__wbg_ptr, arg0);
    }
    /**
     * @param {string} arg0
     */
    set id(arg0) {
        const ptr0 = passStringToWasm0(arg0, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        wasm.__wbg_set_exercisedata_id(this.__wbg_ptr, ptr0, len0);
    }
    /**
     * Is compound exercise
     * @param {boolean} arg0
     */
    set is_compound(arg0) {
        wasm.__wbg_set_exercisedata_is_compound(this.__wbg_ptr, arg0);
    }
    /**
     * Joint stress score (0-100)
     * @param {number} arg0
     */
    set joint_stress(arg0) {
        wasm.__wbg_set_exercisedata_joint_stress(this.__wbg_ptr, arg0);
    }
    /**
     * Movement pattern ID
     * @param {number} arg0
     */
    set movement_pattern(arg0) {
        wasm.__wbg_set_exercisedata_movement_pattern(this.__wbg_ptr, arg0);
    }
    /**
     * @param {string} arg0
     */
    set name(arg0) {
        const ptr0 = passStringToWasm0(arg0, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        wasm.__wbg_set_exercisedata_name(this.__wbg_ptr, ptr0, len0);
    }
    /**
     * Primary muscle activation (0-100)
     * @param {number} arg0
     */
    set primary_activation(arg0) {
        wasm.__wbg_set_exercisedata_primary_activation(this.__wbg_ptr, arg0);
    }
    /**
     * Setup time in seconds
     * @param {number} arg0
     */
    set setup_time(arg0) {
        wasm.__wbg_set_exercisedata_setup_time(this.__wbg_ptr, arg0);
    }
}
if (Symbol.dispose) ExerciseData.prototype[Symbol.dispose] = ExerciseData.prototype.free;

/**
 * Individual factor score result
 */
export class FactorScore {
    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        FactorScoreFinalization.unregister(this);
        return ptr;
    }
    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_factorscore_free(ptr, 0);
    }
    /**
     * @returns {string}
     */
    get name() {
        let deferred1_0;
        let deferred1_1;
        try {
            const ret = wasm.__wbg_get_factorscore_name(this.__wbg_ptr);
            deferred1_0 = ret[0];
            deferred1_1 = ret[1];
            return getStringFromWasm0(ret[0], ret[1]);
        } finally {
            wasm.__wbindgen_free(deferred1_0, deferred1_1, 1);
        }
    }
    /**
     * @returns {number}
     */
    get raw_score() {
        const ret = wasm.__wbg_get_factorscore_raw_score(this.__wbg_ptr);
        return ret;
    }
    /**
     * @returns {number}
     */
    get weight() {
        const ret = wasm.__wbg_get_factorscore_weight(this.__wbg_ptr);
        return ret;
    }
    /**
     * @returns {number}
     */
    get weighted_score() {
        const ret = wasm.__wbg_get_factorscore_weighted_score(this.__wbg_ptr);
        return ret;
    }
    /**
     * @param {string} arg0
     */
    set name(arg0) {
        const ptr0 = passStringToWasm0(arg0, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        wasm.__wbg_set_exercisedata_id(this.__wbg_ptr, ptr0, len0);
    }
    /**
     * @param {number} arg0
     */
    set raw_score(arg0) {
        wasm.__wbg_set_factorscore_raw_score(this.__wbg_ptr, arg0);
    }
    /**
     * @param {number} arg0
     */
    set weight(arg0) {
        wasm.__wbg_set_factorscore_weight(this.__wbg_ptr, arg0);
    }
    /**
     * @param {number} arg0
     */
    set weighted_score(arg0) {
        wasm.__wbg_set_factorscore_weighted_score(this.__wbg_ptr, arg0);
    }
}
if (Symbol.dispose) FactorScore.prototype[Symbol.dispose] = FactorScore.prototype.free;

/**
 * Exercise Scoring Engine
 */
export class ScoringEngine {
    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        ScoringEngineFinalization.unregister(this);
        return ptr;
    }
    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_scoringengine_free(ptr, 0);
    }
    /**
     * Add an exercise to recent history (for novelty calculation)
     * @param {string} exercise_id
     */
    add_recent_exercise(exercise_id) {
        const ptr0 = passStringToWasm0(exercise_id, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        wasm.scoringengine_add_recent_exercise(this.__wbg_ptr, ptr0, len0);
    }
    /**
     * Clear all state
     */
    clear() {
        wasm.scoringengine_clear(this.__wbg_ptr);
    }
    /**
     * Get factor names
     * @returns {string[]}
     */
    static get_factor_names() {
        const ret = wasm.scoringengine_get_factor_names();
        var v1 = getArrayJsValueFromWasm0(ret[0], ret[1]).slice();
        wasm.__wbindgen_free(ret[0], ret[1] * 4, 4);
        return v1;
    }
    /**
     * Get current weights
     * @returns {Float32Array}
     */
    get_weights() {
        const ret = wasm.scoringengine_get_weights(this.__wbg_ptr);
        var v1 = getArrayF32FromWasm0(ret[0], ret[1]).slice();
        wasm.__wbindgen_free(ret[0], ret[1] * 4, 4);
        return v1;
    }
    /**
     * Create a new scoring engine with default weights
     */
    constructor() {
        const ret = wasm.scoringengine_new();
        this.__wbg_ptr = ret >>> 0;
        ScoringEngineFinalization.register(this, this.__wbg_ptr, this);
        return this;
    }
    /**
     * Set muscle imbalance score
     * @param {number} muscle_id
     * @param {number} imbalance
     */
    set_imbalance(muscle_id, imbalance) {
        wasm.scoringengine_set_imbalance(this.__wbg_ptr, muscle_id, imbalance);
    }
    /**
     * Set user preference for an exercise
     * @param {string} exercise_id
     * @param {number} preference
     */
    set_preference(exercise_id, preference) {
        const ptr0 = passStringToWasm0(exercise_id, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        wasm.scoringengine_set_preference(this.__wbg_ptr, ptr0, len0, preference);
    }
    /**
     * Set custom weights for factors
     * @param {Float32Array} weights
     */
    set_weights(weights) {
        const ptr0 = passArrayF32ToWasm0(weights, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.scoringengine_set_weights(this.__wbg_ptr, ptr0, len0);
        if (ret[1]) {
            throw takeFromExternrefTable0(ret[0]);
        }
    }
}
if (Symbol.dispose) ScoringEngine.prototype[Symbol.dispose] = ScoringEngine.prototype.free;

/**
 * Complete scoring result
 */
export class ScoringResult {
    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        ScoringResultFinalization.unregister(this);
        return ptr;
    }
    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_scoringresult_free(ptr, 0);
    }
    /**
     * @returns {number}
     */
    get duration_ms() {
        const ret = wasm.__wbg_get_scoringresult_duration_ms(this.__wbg_ptr);
        return ret;
    }
    /**
     * @returns {string}
     */
    get exercise_id() {
        let deferred1_0;
        let deferred1_1;
        try {
            const ret = wasm.__wbg_get_scoringresult_exercise_id(this.__wbg_ptr);
            deferred1_0 = ret[0];
            deferred1_1 = ret[1];
            return getStringFromWasm0(ret[0], ret[1]);
        } finally {
            wasm.__wbindgen_free(deferred1_0, deferred1_1, 1);
        }
    }
    /**
     * @returns {boolean}
     */
    get native() {
        const ret = wasm.__wbg_get_scoringresult_native(this.__wbg_ptr);
        return ret !== 0;
    }
    /**
     * @returns {number}
     */
    get total_score() {
        const ret = wasm.__wbg_get_exercisedata_primary_activation(this.__wbg_ptr);
        return ret;
    }
    /**
     * @param {string} exercise_id
     * @param {number} total_score
     * @param {number} duration_ms
     */
    constructor(exercise_id, total_score, duration_ms) {
        const ptr0 = passStringToWasm0(exercise_id, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.scoringresult_new(ptr0, len0, total_score, duration_ms);
        this.__wbg_ptr = ret >>> 0;
        ScoringResultFinalization.register(this, this.__wbg_ptr, this);
        return this;
    }
    /**
     * @param {number} arg0
     */
    set duration_ms(arg0) {
        wasm.__wbg_set_scoringresult_duration_ms(this.__wbg_ptr, arg0);
    }
    /**
     * @param {string} arg0
     */
    set exercise_id(arg0) {
        const ptr0 = passStringToWasm0(arg0, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        wasm.__wbg_set_scoringresult_exercise_id(this.__wbg_ptr, ptr0, len0);
    }
    /**
     * @param {boolean} arg0
     */
    set native(arg0) {
        wasm.__wbg_set_scoringresult_native(this.__wbg_ptr, arg0);
    }
    /**
     * @param {number} arg0
     */
    set total_score(arg0) {
        wasm.__wbg_set_exercisedata_primary_activation(this.__wbg_ptr, arg0);
    }
}
if (Symbol.dispose) ScoringResult.prototype[Symbol.dispose] = ScoringResult.prototype.free;

/**
 * User context for scoring
 */
export class UserContext {
    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        UserContextFinalization.unregister(this);
        return ptr;
    }
    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_usercontext_free(ptr, 0);
    }
    /**
     * User's archetype ID
     * @returns {number}
     */
    get archetype_id() {
        const ret = wasm.__wbg_get_usercontext_archetype_id(this.__wbg_ptr);
        return ret;
    }
    /**
     * Arm span to height ratio
     * @returns {number}
     */
    get arm_ratio() {
        const ret = wasm.__wbg_get_factorscore_raw_score(this.__wbg_ptr);
        return ret;
    }
    /**
     * Available equipment (bitflags)
     * @returns {number}
     */
    get equipment_flags() {
        const ret = wasm.__wbg_get_usercontext_equipment_flags(this.__wbg_ptr);
        return ret >>> 0;
    }
    /**
     * Experience level (1-5)
     * @returns {number}
     */
    get experience_level() {
        const ret = wasm.__wbg_get_usercontext_experience_level(this.__wbg_ptr);
        return ret;
    }
    /**
     * Femur to height ratio (for biomechanics)
     * @returns {number}
     */
    get femur_ratio() {
        const ret = wasm.__wbg_get_usercontext_femur_ratio(this.__wbg_ptr);
        return ret;
    }
    /**
     * Injured body parts (bitflags)
     * @returns {number}
     */
    get injury_flags() {
        const ret = wasm.__wbg_get_usercontext_injury_flags(this.__wbg_ptr);
        return ret >>> 0;
    }
    /**
     * Torso to leg ratio
     * @returns {number}
     */
    get torso_ratio() {
        const ret = wasm.__wbg_get_factorscore_weight(this.__wbg_ptr);
        return ret;
    }
    /**
     * User's archetype ID
     * @param {number} arg0
     */
    set archetype_id(arg0) {
        wasm.__wbg_set_usercontext_archetype_id(this.__wbg_ptr, arg0);
    }
    /**
     * Arm span to height ratio
     * @param {number} arg0
     */
    set arm_ratio(arg0) {
        wasm.__wbg_set_factorscore_raw_score(this.__wbg_ptr, arg0);
    }
    /**
     * Available equipment (bitflags)
     * @param {number} arg0
     */
    set equipment_flags(arg0) {
        wasm.__wbg_set_usercontext_equipment_flags(this.__wbg_ptr, arg0);
    }
    /**
     * Experience level (1-5)
     * @param {number} arg0
     */
    set experience_level(arg0) {
        wasm.__wbg_set_usercontext_experience_level(this.__wbg_ptr, arg0);
    }
    /**
     * Femur to height ratio (for biomechanics)
     * @param {number} arg0
     */
    set femur_ratio(arg0) {
        wasm.__wbg_set_usercontext_femur_ratio(this.__wbg_ptr, arg0);
    }
    /**
     * Injured body parts (bitflags)
     * @param {number} arg0
     */
    set injury_flags(arg0) {
        wasm.__wbg_set_usercontext_injury_flags(this.__wbg_ptr, arg0);
    }
    /**
     * Torso to leg ratio
     * @param {number} arg0
     */
    set torso_ratio(arg0) {
        wasm.__wbg_set_factorscore_weight(this.__wbg_ptr, arg0);
    }
    /**
     * @param {number} archetype_id
     * @param {number} experience_level
     * @param {number} equipment_flags
     * @param {number} injury_flags
     * @param {number} femur_ratio
     * @param {number} arm_ratio
     * @param {number} torso_ratio
     */
    constructor(archetype_id, experience_level, equipment_flags, injury_flags, femur_ratio, arm_ratio, torso_ratio) {
        const ret = wasm.usercontext_new(archetype_id, experience_level, equipment_flags, injury_flags, femur_ratio, arm_ratio, torso_ratio);
        this.__wbg_ptr = ret >>> 0;
        UserContextFinalization.register(this, this.__wbg_ptr, this);
        return this;
    }
}
if (Symbol.dispose) UserContext.prototype[Symbol.dispose] = UserContext.prototype.free;

/**
 * Workout context for scoring
 */
export class WorkoutContext {
    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        WorkoutContextFinalization.unregister(this);
        return ptr;
    }
    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_workoutcontext_free(ptr, 0);
    }
    /**
     * Total joint stress accumulated
     * @returns {number}
     */
    get accumulated_stress() {
        const ret = wasm.__wbg_get_workoutcontext_accumulated_stress(this.__wbg_ptr);
        return ret;
    }
    /**
     * Compound exercises already included
     * @returns {number}
     */
    get compound_count() {
        const ret = wasm.__wbg_get_workoutcontext_compound_count(this.__wbg_ptr);
        return ret;
    }
    /**
     * Isolation exercises already included
     * @returns {number}
     */
    get isolation_count() {
        const ret = wasm.__wbg_get_workoutcontext_isolation_count(this.__wbg_ptr);
        return ret;
    }
    /**
     * Target muscle ID
     * @returns {number}
     */
    get target_muscle() {
        const ret = wasm.__wbg_get_workoutcontext_target_muscle(this.__wbg_ptr);
        return ret;
    }
    /**
     * Time budget for workout (seconds)
     * @returns {number}
     */
    get time_budget() {
        const ret = wasm.__wbg_get_workoutcontext_time_budget(this.__wbg_ptr);
        return ret >>> 0;
    }
    /**
     * Time already spent in workout (seconds)
     * @returns {number}
     */
    get time_spent() {
        const ret = wasm.__wbg_get_workoutcontext_time_spent(this.__wbg_ptr);
        return ret >>> 0;
    }
    /**
     * Movement patterns already in workout (bitflags)
     * @returns {number}
     */
    get used_patterns() {
        const ret = wasm.__wbg_get_usercontext_equipment_flags(this.__wbg_ptr);
        return ret >>> 0;
    }
    /**
     * Total joint stress accumulated
     * @param {number} arg0
     */
    set accumulated_stress(arg0) {
        wasm.__wbg_set_workoutcontext_accumulated_stress(this.__wbg_ptr, arg0);
    }
    /**
     * Compound exercises already included
     * @param {number} arg0
     */
    set compound_count(arg0) {
        wasm.__wbg_set_workoutcontext_compound_count(this.__wbg_ptr, arg0);
    }
    /**
     * Isolation exercises already included
     * @param {number} arg0
     */
    set isolation_count(arg0) {
        wasm.__wbg_set_workoutcontext_isolation_count(this.__wbg_ptr, arg0);
    }
    /**
     * Target muscle ID
     * @param {number} arg0
     */
    set target_muscle(arg0) {
        wasm.__wbg_set_workoutcontext_target_muscle(this.__wbg_ptr, arg0);
    }
    /**
     * Time budget for workout (seconds)
     * @param {number} arg0
     */
    set time_budget(arg0) {
        wasm.__wbg_set_workoutcontext_time_budget(this.__wbg_ptr, arg0);
    }
    /**
     * Time already spent in workout (seconds)
     * @param {number} arg0
     */
    set time_spent(arg0) {
        wasm.__wbg_set_workoutcontext_time_spent(this.__wbg_ptr, arg0);
    }
    /**
     * Movement patterns already in workout (bitflags)
     * @param {number} arg0
     */
    set used_patterns(arg0) {
        wasm.__wbg_set_usercontext_equipment_flags(this.__wbg_ptr, arg0);
    }
    /**
     * @param {number} target_muscle
     * @param {number} used_patterns
     * @param {number} compound_count
     * @param {number} isolation_count
     * @param {number} accumulated_stress
     * @param {number} time_spent
     * @param {number} time_budget
     */
    constructor(target_muscle, used_patterns, compound_count, isolation_count, accumulated_stress, time_spent, time_budget) {
        const ret = wasm.workoutcontext_new(target_muscle, used_patterns, compound_count, isolation_count, accumulated_stress, time_spent, time_budget);
        this.__wbg_ptr = ret >>> 0;
        WorkoutContextFinalization.register(this, this.__wbg_ptr, this);
        return this;
    }
}
if (Symbol.dispose) WorkoutContext.prototype[Symbol.dispose] = WorkoutContext.prototype.free;

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
 * @param {ExerciseData[]} exercises
 * @param {UserContext} user
 * @param {WorkoutContext} workout
 * @param {number} limit
 * @returns {any}
 */
export function get_recommendations(exercises, user, workout, limit) {
    const ptr0 = passArrayJsValueToWasm0(exercises, wasm.__wbindgen_malloc);
    const len0 = WASM_VECTOR_LEN;
    _assertClass(user, UserContext);
    _assertClass(workout, WorkoutContext);
    const ret = wasm.get_recommendations(ptr0, len0, user.__wbg_ptr, workout.__wbg_ptr, limit);
    if (ret[2]) {
        throw takeFromExternrefTable0(ret[1]);
    }
    return takeFromExternrefTable0(ret[0]);
}

/**
 * Score exercise with full factor breakdown
 * @param {ExerciseData} exercise
 * @param {UserContext} user
 * @param {WorkoutContext} workout
 * @param {Float32Array | null} [weights]
 * @returns {any}
 */
export function score_exercise_detailed(exercise, user, workout, weights) {
    _assertClass(exercise, ExerciseData);
    _assertClass(user, UserContext);
    _assertClass(workout, WorkoutContext);
    var ptr0 = isLikeNone(weights) ? 0 : passArrayF32ToWasm0(weights, wasm.__wbindgen_malloc);
    var len0 = WASM_VECTOR_LEN;
    const ret = wasm.score_exercise_detailed(exercise.__wbg_ptr, user.__wbg_ptr, workout.__wbg_ptr, ptr0, len0);
    if (ret[2]) {
        throw takeFromExternrefTable0(ret[1]);
    }
    return takeFromExternrefTable0(ret[0]);
}

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
 * @param {ExerciseData} exercise
 * @param {UserContext} user
 * @param {WorkoutContext} workout
 * @param {Float32Array | null} [weights]
 * @returns {number}
 */
export function score_exercise_simple(exercise, user, workout, weights) {
    _assertClass(exercise, ExerciseData);
    _assertClass(user, UserContext);
    _assertClass(workout, WorkoutContext);
    var ptr0 = isLikeNone(weights) ? 0 : passArrayF32ToWasm0(weights, wasm.__wbindgen_malloc);
    var len0 = WASM_VECTOR_LEN;
    const ret = wasm.score_exercise_simple(exercise.__wbg_ptr, user.__wbg_ptr, workout.__wbg_ptr, ptr0, len0);
    return ret;
}

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
 * @param {ExerciseData[]} exercises
 * @param {UserContext} user
 * @param {WorkoutContext} workout
 * @returns {any}
 */
export function score_exercises_batch(exercises, user, workout) {
    const ptr0 = passArrayJsValueToWasm0(exercises, wasm.__wbindgen_malloc);
    const len0 = WASM_VECTOR_LEN;
    _assertClass(user, UserContext);
    _assertClass(workout, WorkoutContext);
    const ret = wasm.score_exercises_batch(ptr0, len0, user.__wbg_ptr, workout.__wbg_ptr);
    if (ret[2]) {
        throw takeFromExternrefTable0(ret[1]);
    }
    return takeFromExternrefTable0(ret[0]);
}

function __wbg_get_imports() {
    const import0 = {
        __proto__: null,
        __wbg_Error_8c4e43fe74559d73: function(arg0, arg1) {
            const ret = Error(getStringFromWasm0(arg0, arg1));
            return ret;
        },
        __wbg_String_8f0eb39a4a4c2f66: function(arg0, arg1) {
            const ret = String(arg1);
            const ptr1 = passStringToWasm0(ret, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
            const len1 = WASM_VECTOR_LEN;
            getDataViewMemory0().setInt32(arg0 + 4 * 1, len1, true);
            getDataViewMemory0().setInt32(arg0 + 4 * 0, ptr1, true);
        },
        __wbg___wbindgen_throw_be289d5034ed271b: function(arg0, arg1) {
            throw new Error(getStringFromWasm0(arg0, arg1));
        },
        __wbg_exercisedata_unwrap: function(arg0) {
            const ret = ExerciseData.__unwrap(arg0);
            return ret;
        },
        __wbg_new_361308b2356cecd0: function() {
            const ret = new Object();
            return ret;
        },
        __wbg_new_3eb36ae241fe6f44: function() {
            const ret = new Array();
            return ret;
        },
        __wbg_now_a3af9a2f4bbaa4d1: function() {
            const ret = Date.now();
            return ret;
        },
        __wbg_set_3f1d0b984ed272ed: function(arg0, arg1, arg2) {
            arg0[arg1] = arg2;
        },
        __wbg_set_f43e577aea94465b: function(arg0, arg1, arg2) {
            arg0[arg1 >>> 0] = arg2;
        },
        __wbindgen_cast_0000000000000001: function(arg0) {
            // Cast intrinsic for `F64 -> Externref`.
            const ret = arg0;
            return ret;
        },
        __wbindgen_cast_0000000000000002: function(arg0, arg1) {
            // Cast intrinsic for `Ref(String) -> Externref`.
            const ret = getStringFromWasm0(arg0, arg1);
            return ret;
        },
        __wbindgen_cast_0000000000000003: function(arg0) {
            // Cast intrinsic for `U64 -> Externref`.
            const ret = BigInt.asUintN(64, arg0);
            return ret;
        },
        __wbindgen_init_externref_table: function() {
            const table = wasm.__wbindgen_externrefs;
            const offset = table.grow(4);
            table.set(0, undefined);
            table.set(offset + 0, undefined);
            table.set(offset + 1, null);
            table.set(offset + 2, true);
            table.set(offset + 3, false);
        },
    };
    return {
        __proto__: null,
        "./musclemap_scoring_bg.js": import0,
    };
}

const ExerciseDataFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_exercisedata_free(ptr >>> 0, 1));
const FactorScoreFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_factorscore_free(ptr >>> 0, 1));
const ScoringEngineFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_scoringengine_free(ptr >>> 0, 1));
const ScoringResultFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_scoringresult_free(ptr >>> 0, 1));
const UserContextFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_usercontext_free(ptr >>> 0, 1));
const WorkoutContextFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_workoutcontext_free(ptr >>> 0, 1));

function addToExternrefTable0(obj) {
    const idx = wasm.__externref_table_alloc();
    wasm.__wbindgen_externrefs.set(idx, obj);
    return idx;
}

function _assertClass(instance, klass) {
    if (!(instance instanceof klass)) {
        throw new Error(`expected instance of ${klass.name}`);
    }
}

function getArrayF32FromWasm0(ptr, len) {
    ptr = ptr >>> 0;
    return getFloat32ArrayMemory0().subarray(ptr / 4, ptr / 4 + len);
}

function getArrayJsValueFromWasm0(ptr, len) {
    ptr = ptr >>> 0;
    const mem = getDataViewMemory0();
    const result = [];
    for (let i = ptr; i < ptr + 4 * len; i += 4) {
        result.push(wasm.__wbindgen_externrefs.get(mem.getUint32(i, true)));
    }
    wasm.__externref_drop_slice(ptr, len);
    return result;
}

let cachedDataViewMemory0 = null;
function getDataViewMemory0() {
    if (cachedDataViewMemory0 === null || cachedDataViewMemory0.buffer.detached === true || (cachedDataViewMemory0.buffer.detached === undefined && cachedDataViewMemory0.buffer !== wasm.memory.buffer)) {
        cachedDataViewMemory0 = new DataView(wasm.memory.buffer);
    }
    return cachedDataViewMemory0;
}

let cachedFloat32ArrayMemory0 = null;
function getFloat32ArrayMemory0() {
    if (cachedFloat32ArrayMemory0 === null || cachedFloat32ArrayMemory0.byteLength === 0) {
        cachedFloat32ArrayMemory0 = new Float32Array(wasm.memory.buffer);
    }
    return cachedFloat32ArrayMemory0;
}

function getStringFromWasm0(ptr, len) {
    ptr = ptr >>> 0;
    return decodeText(ptr, len);
}

let cachedUint8ArrayMemory0 = null;
function getUint8ArrayMemory0() {
    if (cachedUint8ArrayMemory0 === null || cachedUint8ArrayMemory0.byteLength === 0) {
        cachedUint8ArrayMemory0 = new Uint8Array(wasm.memory.buffer);
    }
    return cachedUint8ArrayMemory0;
}

function isLikeNone(x) {
    return x === undefined || x === null;
}

function passArrayF32ToWasm0(arg, malloc) {
    const ptr = malloc(arg.length * 4, 4) >>> 0;
    getFloat32ArrayMemory0().set(arg, ptr / 4);
    WASM_VECTOR_LEN = arg.length;
    return ptr;
}

function passArrayJsValueToWasm0(array, malloc) {
    const ptr = malloc(array.length * 4, 4) >>> 0;
    for (let i = 0; i < array.length; i++) {
        const add = addToExternrefTable0(array[i]);
        getDataViewMemory0().setUint32(ptr + 4 * i, add, true);
    }
    WASM_VECTOR_LEN = array.length;
    return ptr;
}

function passStringToWasm0(arg, malloc, realloc) {
    if (realloc === undefined) {
        const buf = cachedTextEncoder.encode(arg);
        const ptr = malloc(buf.length, 1) >>> 0;
        getUint8ArrayMemory0().subarray(ptr, ptr + buf.length).set(buf);
        WASM_VECTOR_LEN = buf.length;
        return ptr;
    }

    let len = arg.length;
    let ptr = malloc(len, 1) >>> 0;

    const mem = getUint8ArrayMemory0();

    let offset = 0;

    for (; offset < len; offset++) {
        const code = arg.charCodeAt(offset);
        if (code > 0x7F) break;
        mem[ptr + offset] = code;
    }
    if (offset !== len) {
        if (offset !== 0) {
            arg = arg.slice(offset);
        }
        ptr = realloc(ptr, len, len = offset + arg.length * 3, 1) >>> 0;
        const view = getUint8ArrayMemory0().subarray(ptr + offset, ptr + len);
        const ret = cachedTextEncoder.encodeInto(arg, view);

        offset += ret.written;
        ptr = realloc(ptr, len, offset, 1) >>> 0;
    }

    WASM_VECTOR_LEN = offset;
    return ptr;
}

function takeFromExternrefTable0(idx) {
    const value = wasm.__wbindgen_externrefs.get(idx);
    wasm.__externref_table_dealloc(idx);
    return value;
}

let cachedTextDecoder = new TextDecoder('utf-8', { ignoreBOM: true, fatal: true });
cachedTextDecoder.decode();
const MAX_SAFARI_DECODE_BYTES = 2146435072;
let numBytesDecoded = 0;
function decodeText(ptr, len) {
    numBytesDecoded += len;
    if (numBytesDecoded >= MAX_SAFARI_DECODE_BYTES) {
        cachedTextDecoder = new TextDecoder('utf-8', { ignoreBOM: true, fatal: true });
        cachedTextDecoder.decode();
        numBytesDecoded = len;
    }
    return cachedTextDecoder.decode(getUint8ArrayMemory0().subarray(ptr, ptr + len));
}

const cachedTextEncoder = new TextEncoder();

if (!('encodeInto' in cachedTextEncoder)) {
    cachedTextEncoder.encodeInto = function (arg, view) {
        const buf = cachedTextEncoder.encode(arg);
        view.set(buf);
        return {
            read: arg.length,
            written: buf.length
        };
    };
}

let WASM_VECTOR_LEN = 0;

let wasmModule, wasm;
function __wbg_finalize_init(instance, module) {
    wasm = instance.exports;
    wasmModule = module;
    cachedDataViewMemory0 = null;
    cachedFloat32ArrayMemory0 = null;
    cachedUint8ArrayMemory0 = null;
    wasm.__wbindgen_start();
    return wasm;
}

async function __wbg_load(module, imports) {
    if (typeof Response === 'function' && module instanceof Response) {
        if (typeof WebAssembly.instantiateStreaming === 'function') {
            try {
                return await WebAssembly.instantiateStreaming(module, imports);
            } catch (e) {
                const validResponse = module.ok && expectedResponseType(module.type);

                if (validResponse && module.headers.get('Content-Type') !== 'application/wasm') {
                    console.warn("`WebAssembly.instantiateStreaming` failed because your server does not serve Wasm with `application/wasm` MIME type. Falling back to `WebAssembly.instantiate` which is slower. Original error:\n", e);

                } else { throw e; }
            }
        }

        const bytes = await module.arrayBuffer();
        return await WebAssembly.instantiate(bytes, imports);
    } else {
        const instance = await WebAssembly.instantiate(module, imports);

        if (instance instanceof WebAssembly.Instance) {
            return { instance, module };
        } else {
            return instance;
        }
    }

    function expectedResponseType(type) {
        switch (type) {
            case 'basic': case 'cors': case 'default': return true;
        }
        return false;
    }
}

function initSync(module) {
    if (wasm !== undefined) return wasm;


    if (module !== undefined) {
        if (Object.getPrototypeOf(module) === Object.prototype) {
            ({module} = module)
        } else {
            console.warn('using deprecated parameters for `initSync()`; pass a single object instead')
        }
    }

    const imports = __wbg_get_imports();
    if (!(module instanceof WebAssembly.Module)) {
        module = new WebAssembly.Module(module);
    }
    const instance = new WebAssembly.Instance(module, imports);
    return __wbg_finalize_init(instance, module);
}

async function __wbg_init(module_or_path) {
    if (wasm !== undefined) return wasm;


    if (module_or_path !== undefined) {
        if (Object.getPrototypeOf(module_or_path) === Object.prototype) {
            ({module_or_path} = module_or_path)
        } else {
            console.warn('using deprecated parameters for the initialization function; pass a single object instead')
        }
    }

    if (module_or_path === undefined) {
        module_or_path = new URL('musclemap_scoring_bg.wasm', import.meta.url);
    }
    const imports = __wbg_get_imports();

    if (typeof module_or_path === 'string' || (typeof Request === 'function' && module_or_path instanceof Request) || (typeof URL === 'function' && module_or_path instanceof URL)) {
        module_or_path = fetch(module_or_path);
    }

    const { instance, module } = await __wbg_load(await module_or_path, imports);

    return __wbg_finalize_init(instance, module);
}

export { initSync, __wbg_init as default };
