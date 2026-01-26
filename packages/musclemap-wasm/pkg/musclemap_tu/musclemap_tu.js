/* @ts-self-types="./musclemap_tu.d.ts" */

/**
 * Detailed TU calculation result with muscle breakdown
 */
export class DetailedTUResult {
    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        DetailedTUResultFinalization.unregister(this);
        return ptr;
    }
    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_detailedturesult_free(ptr, 0);
    }
    /**
     * @returns {number}
     */
    get duration_ms() {
        const ret = wasm.__wbg_get_detailedturesult_duration_ms(this.__wbg_ptr);
        return ret;
    }
    /**
     * @returns {number}
     */
    get exercise_count() {
        const ret = wasm.__wbg_get_detailedturesult_exercise_count(this.__wbg_ptr);
        return ret >>> 0;
    }
    /**
     * @returns {number}
     */
    get muscle_count() {
        const ret = wasm.__wbg_get_detailedturesult_muscle_count(this.__wbg_ptr);
        return ret >>> 0;
    }
    /**
     * @returns {boolean}
     */
    get native() {
        const ret = wasm.__wbg_get_detailedturesult_native(this.__wbg_ptr);
        return ret !== 0;
    }
    /**
     * @returns {number}
     */
    get total_tu() {
        const ret = wasm.__wbg_get_detailedturesult_total_tu(this.__wbg_ptr);
        return ret;
    }
    /**
     * @param {number} arg0
     */
    set duration_ms(arg0) {
        wasm.__wbg_set_detailedturesult_duration_ms(this.__wbg_ptr, arg0);
    }
    /**
     * @param {number} arg0
     */
    set exercise_count(arg0) {
        wasm.__wbg_set_detailedturesult_exercise_count(this.__wbg_ptr, arg0);
    }
    /**
     * @param {number} arg0
     */
    set muscle_count(arg0) {
        wasm.__wbg_set_detailedturesult_muscle_count(this.__wbg_ptr, arg0);
    }
    /**
     * @param {boolean} arg0
     */
    set native(arg0) {
        wasm.__wbg_set_detailedturesult_native(this.__wbg_ptr, arg0);
    }
    /**
     * @param {number} arg0
     */
    set total_tu(arg0) {
        wasm.__wbg_set_detailedturesult_total_tu(this.__wbg_ptr, arg0);
    }
}
if (Symbol.dispose) DetailedTUResult.prototype[Symbol.dispose] = DetailedTUResult.prototype.free;

/**
 * Exercise input for TU calculation
 */
export class ExerciseInput {
    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        ExerciseInputFinalization.unregister(this);
        return ptr;
    }
    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_exerciseinput_free(ptr, 0);
    }
    /**
     * @param {string} exercise_id
     * @param {number} sets
     * @param {number} reps
     * @param {number} weight_kg
     */
    constructor(exercise_id, sets, reps, weight_kg) {
        const ptr0 = passStringToWasm0(exercise_id, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.exerciseinput_new(ptr0, len0, sets, reps, weight_kg);
        this.__wbg_ptr = ret >>> 0;
        ExerciseInputFinalization.register(this, this.__wbg_ptr, this);
        return this;
    }
    /**
     * @returns {string}
     */
    get exercise_id() {
        let deferred1_0;
        let deferred1_1;
        try {
            const ret = wasm.__wbg_get_exerciseinput_exercise_id(this.__wbg_ptr);
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
    get reps() {
        const ret = wasm.__wbg_get_detailedturesult_muscle_count(this.__wbg_ptr);
        return ret >>> 0;
    }
    /**
     * @returns {number}
     */
    get sets() {
        const ret = wasm.__wbg_get_exerciseinput_sets(this.__wbg_ptr);
        return ret >>> 0;
    }
    /**
     * @returns {number}
     */
    get weight_kg() {
        const ret = wasm.__wbg_get_exerciseinput_weight_kg(this.__wbg_ptr);
        return ret;
    }
    /**
     * @param {string} arg0
     */
    set exercise_id(arg0) {
        const ptr0 = passStringToWasm0(arg0, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        wasm.__wbg_set_exerciseinput_exercise_id(this.__wbg_ptr, ptr0, len0);
    }
    /**
     * @param {number} arg0
     */
    set reps(arg0) {
        wasm.__wbg_set_detailedturesult_muscle_count(this.__wbg_ptr, arg0);
    }
    /**
     * @param {number} arg0
     */
    set sets(arg0) {
        wasm.__wbg_set_exerciseinput_sets(this.__wbg_ptr, arg0);
    }
    /**
     * @param {number} arg0
     */
    set weight_kg(arg0) {
        wasm.__wbg_set_exerciseinput_weight_kg(this.__wbg_ptr, arg0);
    }
}
if (Symbol.dispose) ExerciseInput.prototype[Symbol.dispose] = ExerciseInput.prototype.free;

/**
 * Muscle activation data
 */
export class MuscleActivation {
    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        MuscleActivationFinalization.unregister(this);
        return ptr;
    }
    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_muscleactivation_free(ptr, 0);
    }
    /**
     * Activation percentage (0-100)
     * @returns {number}
     */
    get activation() {
        const ret = wasm.__wbg_get_muscleactivation_activation(this.__wbg_ptr);
        return ret;
    }
    /**
     * @returns {string}
     */
    get muscle_id() {
        let deferred1_0;
        let deferred1_1;
        try {
            const ret = wasm.__wbg_get_muscleactivation_muscle_id(this.__wbg_ptr);
            deferred1_0 = ret[0];
            deferred1_1 = ret[1];
            return getStringFromWasm0(ret[0], ret[1]);
        } finally {
            wasm.__wbindgen_free(deferred1_0, deferred1_1, 1);
        }
    }
    /**
     * @param {string} muscle_id
     * @param {number} activation
     */
    constructor(muscle_id, activation) {
        const ptr0 = passStringToWasm0(muscle_id, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.muscleactivation_new(ptr0, len0, activation);
        this.__wbg_ptr = ret >>> 0;
        MuscleActivationFinalization.register(this, this.__wbg_ptr, this);
        return this;
    }
    /**
     * Activation percentage (0-100)
     * @param {number} arg0
     */
    set activation(arg0) {
        wasm.__wbg_set_muscleactivation_activation(this.__wbg_ptr, arg0);
    }
    /**
     * @param {string} arg0
     */
    set muscle_id(arg0) {
        const ptr0 = passStringToWasm0(arg0, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        wasm.__wbg_set_exerciseinput_exercise_id(this.__wbg_ptr, ptr0, len0);
    }
}
if (Symbol.dispose) MuscleActivation.prototype[Symbol.dispose] = MuscleActivation.prototype.free;

/**
 * Muscle breakdown in TU result
 */
export class MuscleTU {
    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        MuscleTUFinalization.unregister(this);
        return ptr;
    }
    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_muscletu_free(ptr, 0);
    }
    /**
     * @returns {string}
     */
    get muscle_id() {
        let deferred1_0;
        let deferred1_1;
        try {
            const ret = wasm.__wbg_get_muscletu_muscle_id(this.__wbg_ptr);
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
    get tu() {
        const ret = wasm.__wbg_get_muscleactivation_activation(this.__wbg_ptr);
        return ret;
    }
    /**
     * @returns {number}
     */
    get weighted_tu() {
        const ret = wasm.__wbg_get_muscletu_weighted_tu(this.__wbg_ptr);
        return ret;
    }
    /**
     * @param {string} arg0
     */
    set muscle_id(arg0) {
        const ptr0 = passStringToWasm0(arg0, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        wasm.__wbg_set_exerciseinput_exercise_id(this.__wbg_ptr, ptr0, len0);
    }
    /**
     * @param {number} arg0
     */
    set tu(arg0) {
        wasm.__wbg_set_muscleactivation_activation(this.__wbg_ptr, arg0);
    }
    /**
     * @param {number} arg0
     */
    set weighted_tu(arg0) {
        wasm.__wbg_set_muscletu_weighted_tu(this.__wbg_ptr, arg0);
    }
}
if (Symbol.dispose) MuscleTU.prototype[Symbol.dispose] = MuscleTU.prototype.free;

/**
 * TU Calculator with caching
 */
export class TUCalculator {
    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        TUCalculatorFinalization.unregister(this);
        return ptr;
    }
    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_tucalculator_free(ptr, 0);
    }
    /**
     * Add an exercise to the cache
     *
     * # Arguments
     * * `exercise_id` - Unique exercise identifier
     * * `muscle_ids` - Array of muscle IDs
     * * `activations` - Array of activation percentages (0-100)
     * @param {string} exercise_id
     * @param {string[]} muscle_ids
     * @param {Float32Array} activations
     */
    add_exercise(exercise_id, muscle_ids, activations) {
        const ptr0 = passStringToWasm0(exercise_id, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ptr1 = passArrayJsValueToWasm0(muscle_ids, wasm.__wbindgen_malloc);
        const len1 = WASM_VECTOR_LEN;
        const ptr2 = passArrayF32ToWasm0(activations, wasm.__wbindgen_malloc);
        const len2 = WASM_VECTOR_LEN;
        const ret = wasm.tucalculator_add_exercise(this.__wbg_ptr, ptr0, len0, ptr1, len1, ptr2, len2);
        if (ret[1]) {
            throw takeFromExternrefTable0(ret[0]);
        }
    }
    /**
     * Calculate TU for a workout using cached exercise data
     *
     * # Arguments
     * * `exercise_ids` - Array of exercise IDs
     * * `sets` - Array of set counts (corresponding to exercise_ids)
     * @param {string[]} exercise_ids
     * @param {Uint32Array} sets
     * @returns {TUResult}
     */
    calculate_cached(exercise_ids, sets) {
        const ptr0 = passArrayJsValueToWasm0(exercise_ids, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        const ptr1 = passArray32ToWasm0(sets, wasm.__wbindgen_malloc);
        const len1 = WASM_VECTOR_LEN;
        const ret = wasm.tucalculator_calculate_cached(this.__wbg_ptr, ptr0, len0, ptr1, len1);
        if (ret[2]) {
            throw takeFromExternrefTable0(ret[1]);
        }
        return TUResult.__wrap(ret[0]);
    }
    /**
     * Clear all cached data
     */
    clear() {
        wasm.tucalculator_clear(this.__wbg_ptr);
    }
    /**
     * Get the number of cached exercises
     * @returns {number}
     */
    exercise_count() {
        const ret = wasm.tucalculator_exercise_count(this.__wbg_ptr);
        return ret >>> 0;
    }
    /**
     * Get the number of registered muscles
     * @returns {number}
     */
    muscle_count() {
        const ret = wasm.tucalculator_muscle_count(this.__wbg_ptr);
        return ret >>> 0;
    }
    /**
     * Create a new TU calculator
     */
    constructor() {
        const ret = wasm.tucalculator_new();
        this.__wbg_ptr = ret >>> 0;
        TUCalculatorFinalization.register(this, this.__wbg_ptr, this);
        return this;
    }
    /**
     * Set bias weight for a muscle
     *
     * # Arguments
     * * `muscle_id` - Muscle identifier
     * * `bias_weight` - Weight multiplier (typically 1.0)
     * @param {string} muscle_id
     * @param {number} bias_weight
     */
    set_muscle_bias(muscle_id, bias_weight) {
        const ptr0 = passStringToWasm0(muscle_id, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        wasm.tucalculator_set_muscle_bias(this.__wbg_ptr, ptr0, len0, bias_weight);
    }
}
if (Symbol.dispose) TUCalculator.prototype[Symbol.dispose] = TUCalculator.prototype.free;

/**
 * Result of TU calculation
 */
export class TUResult {
    static __wrap(ptr) {
        ptr = ptr >>> 0;
        const obj = Object.create(TUResult.prototype);
        obj.__wbg_ptr = ptr;
        TUResultFinalization.register(obj, obj.__wbg_ptr, obj);
        return obj;
    }
    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        TUResultFinalization.unregister(this);
        return ptr;
    }
    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_turesult_free(ptr, 0);
    }
    /**
     * Time taken in milliseconds
     * @returns {number}
     */
    get duration_ms() {
        const ret = wasm.__wbg_get_detailedturesult_duration_ms(this.__wbg_ptr);
        return ret;
    }
    /**
     * Whether native WASM was used
     * @returns {boolean}
     */
    get native() {
        const ret = wasm.__wbg_get_turesult_native(this.__wbg_ptr);
        return ret !== 0;
    }
    /**
     * Total Training Units
     * @returns {number}
     */
    get total_tu() {
        const ret = wasm.__wbg_get_detailedturesult_total_tu(this.__wbg_ptr);
        return ret;
    }
    /**
     * Time taken in milliseconds
     * @param {number} arg0
     */
    set duration_ms(arg0) {
        wasm.__wbg_set_detailedturesult_duration_ms(this.__wbg_ptr, arg0);
    }
    /**
     * Whether native WASM was used
     * @param {boolean} arg0
     */
    set native(arg0) {
        wasm.__wbg_set_turesult_native(this.__wbg_ptr, arg0);
    }
    /**
     * Total Training Units
     * @param {number} arg0
     */
    set total_tu(arg0) {
        wasm.__wbg_set_detailedturesult_total_tu(this.__wbg_ptr, arg0);
    }
    /**
     * @param {number} total_tu
     * @param {number} duration_ms
     */
    constructor(total_tu, duration_ms) {
        const ret = wasm.turesult_new(total_tu, duration_ms);
        this.__wbg_ptr = ret >>> 0;
        TUResultFinalization.register(this, this.__wbg_ptr, this);
        return this;
    }
}
if (Symbol.dispose) TUResult.prototype[Symbol.dispose] = TUResult.prototype.free;

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
 * @param {Float32Array} all_activations
 * @param {Int32Array} all_sets
 * @param {Float32Array} bias_weights
 * @param {Int32Array} workout_sizes
 * @param {number} muscle_count
 * @returns {Float32Array}
 */
export function tu_calculate_batch(all_activations, all_sets, bias_weights, workout_sizes, muscle_count) {
    const ptr0 = passArrayF32ToWasm0(all_activations, wasm.__wbindgen_malloc);
    const len0 = WASM_VECTOR_LEN;
    const ptr1 = passArray32ToWasm0(all_sets, wasm.__wbindgen_malloc);
    const len1 = WASM_VECTOR_LEN;
    const ptr2 = passArrayF32ToWasm0(bias_weights, wasm.__wbindgen_malloc);
    const len2 = WASM_VECTOR_LEN;
    const ptr3 = passArray32ToWasm0(workout_sizes, wasm.__wbindgen_malloc);
    const len3 = WASM_VECTOR_LEN;
    const ret = wasm.tu_calculate_batch(ptr0, len0, ptr1, len1, ptr2, len2, ptr3, len3, muscle_count);
    var v5 = getArrayF32FromWasm0(ret[0], ret[1]).slice();
    wasm.__wbindgen_free(ret[0], ret[1] * 4, 4);
    return v5;
}

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
 * @param {Float32Array} activations
 * @param {Int32Array} sets
 * @param {Float32Array} bias_weights
 * @param {string[]} muscle_ids
 * @param {number} exercise_count
 * @returns {any}
 */
export function tu_calculate_detailed(activations, sets, bias_weights, muscle_ids, exercise_count) {
    const ptr0 = passArrayF32ToWasm0(activations, wasm.__wbindgen_malloc);
    const len0 = WASM_VECTOR_LEN;
    const ptr1 = passArray32ToWasm0(sets, wasm.__wbindgen_malloc);
    const len1 = WASM_VECTOR_LEN;
    const ptr2 = passArrayF32ToWasm0(bias_weights, wasm.__wbindgen_malloc);
    const len2 = WASM_VECTOR_LEN;
    const ptr3 = passArrayJsValueToWasm0(muscle_ids, wasm.__wbindgen_malloc);
    const len3 = WASM_VECTOR_LEN;
    const ret = wasm.tu_calculate_detailed(ptr0, len0, ptr1, len1, ptr2, len2, ptr3, len3, exercise_count);
    if (ret[2]) {
        throw takeFromExternrefTable0(ret[1]);
    }
    return takeFromExternrefTable0(ret[0]);
}

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
 * @param {Float32Array} activations
 * @param {Int32Array} sets
 * @param {Float32Array} bias_weights
 * @param {number} exercise_count
 * @param {number} muscle_count
 * @returns {number}
 */
export function tu_calculate_simple(activations, sets, bias_weights, exercise_count, muscle_count) {
    const ptr0 = passArrayF32ToWasm0(activations, wasm.__wbindgen_malloc);
    const len0 = WASM_VECTOR_LEN;
    const ptr1 = passArray32ToWasm0(sets, wasm.__wbindgen_malloc);
    const len1 = WASM_VECTOR_LEN;
    const ptr2 = passArrayF32ToWasm0(bias_weights, wasm.__wbindgen_malloc);
    const len2 = WASM_VECTOR_LEN;
    const ret = wasm.tu_calculate_simple(ptr0, len0, ptr1, len1, ptr2, len2, exercise_count, muscle_count);
    return ret;
}

function __wbg_get_imports() {
    const import0 = {
        __proto__: null,
        __wbg_String_8f0eb39a4a4c2f66: function(arg0, arg1) {
            const ret = String(arg1);
            const ptr1 = passStringToWasm0(ret, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
            const len1 = WASM_VECTOR_LEN;
            getDataViewMemory0().setInt32(arg0 + 4 * 1, len1, true);
            getDataViewMemory0().setInt32(arg0 + 4 * 0, ptr1, true);
        },
        __wbg___wbindgen_string_get_72fb696202c56729: function(arg0, arg1) {
            const obj = arg1;
            const ret = typeof(obj) === 'string' ? obj : undefined;
            var ptr1 = isLikeNone(ret) ? 0 : passStringToWasm0(ret, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
            var len1 = WASM_VECTOR_LEN;
            getDataViewMemory0().setInt32(arg0 + 4 * 1, len1, true);
            getDataViewMemory0().setInt32(arg0 + 4 * 0, ptr1, true);
        },
        __wbg___wbindgen_throw_be289d5034ed271b: function(arg0, arg1) {
            throw new Error(getStringFromWasm0(arg0, arg1));
        },
        __wbg_new_361308b2356cecd0: function() {
            const ret = new Object();
            return ret;
        },
        __wbg_now_a3af9a2f4bbaa4d1: function() {
            const ret = Date.now();
            return ret;
        },
        __wbg_set_3f1d0b984ed272ed: function(arg0, arg1, arg2) {
            arg0[arg1] = arg2;
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
        "./musclemap_tu_bg.js": import0,
    };
}

const DetailedTUResultFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_detailedturesult_free(ptr >>> 0, 1));
const ExerciseInputFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_exerciseinput_free(ptr >>> 0, 1));
const MuscleActivationFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_muscleactivation_free(ptr >>> 0, 1));
const MuscleTUFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_muscletu_free(ptr >>> 0, 1));
const TUCalculatorFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_tucalculator_free(ptr >>> 0, 1));
const TUResultFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_turesult_free(ptr >>> 0, 1));

function addToExternrefTable0(obj) {
    const idx = wasm.__externref_table_alloc();
    wasm.__wbindgen_externrefs.set(idx, obj);
    return idx;
}

function getArrayF32FromWasm0(ptr, len) {
    ptr = ptr >>> 0;
    return getFloat32ArrayMemory0().subarray(ptr / 4, ptr / 4 + len);
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

let cachedUint32ArrayMemory0 = null;
function getUint32ArrayMemory0() {
    if (cachedUint32ArrayMemory0 === null || cachedUint32ArrayMemory0.byteLength === 0) {
        cachedUint32ArrayMemory0 = new Uint32Array(wasm.memory.buffer);
    }
    return cachedUint32ArrayMemory0;
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

function passArray32ToWasm0(arg, malloc) {
    const ptr = malloc(arg.length * 4, 4) >>> 0;
    getUint32ArrayMemory0().set(arg, ptr / 4);
    WASM_VECTOR_LEN = arg.length;
    return ptr;
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
    cachedUint32ArrayMemory0 = null;
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
        module_or_path = new URL('musclemap_tu_bg.wasm', import.meta.url);
    }
    const imports = __wbg_get_imports();

    if (typeof module_or_path === 'string' || (typeof Request === 'function' && module_or_path instanceof Request) || (typeof URL === 'function' && module_or_path instanceof URL)) {
        module_or_path = fetch(module_or_path);
    }

    const { instance, module } = await __wbg_load(await module_or_path, imports);

    return __wbg_finalize_init(instance, module);
}

export { initSync, __wbg_init as default };
