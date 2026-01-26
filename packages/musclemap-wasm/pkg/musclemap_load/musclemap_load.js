/* @ts-self-types="./musclemap_load.d.ts" */

/**
 * Experience levels
 * @enum {1 | 2 | 3 | 4 | 5}
 */
export const ExperienceLevel = Object.freeze({
    Beginner: 1, "1": "Beginner",
    Novice: 2, "2": "Novice",
    Intermediate: 3, "3": "Intermediate",
    Advanced: 4, "4": "Advanced",
    Elite: 5, "5": "Elite",
});

/**
 * Load prescription result
 */
export class LoadPrescription {
    static __wrap(ptr) {
        ptr = ptr >>> 0;
        const obj = Object.create(LoadPrescription.prototype);
        obj.__wbg_ptr = ptr;
        LoadPrescriptionFinalization.register(obj, obj.__wbg_ptr, obj);
        return obj;
    }
    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        LoadPrescriptionFinalization.unregister(this);
        return ptr;
    }
    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_loadprescription_free(ptr, 0);
    }
    /**
     * Percentage of 1RM
     * @returns {number}
     */
    get percentage() {
        const ret = wasm.__wbg_get_loadprescription_percentage(this.__wbg_ptr);
        return ret;
    }
    /**
     * Target reps
     * @returns {number}
     */
    get reps() {
        const ret = wasm.__wbg_get_loadprescription_reps(this.__wbg_ptr);
        return ret;
    }
    /**
     * Rest period in seconds
     * @returns {number}
     */
    get rest_seconds() {
        const ret = wasm.__wbg_get_loadprescription_rest_seconds(this.__wbg_ptr);
        return ret;
    }
    /**
     * Target RPE
     * @returns {number}
     */
    get rpe() {
        const ret = wasm.__wbg_get_loadprescription_rpe(this.__wbg_ptr);
        return ret;
    }
    /**
     * Number of sets
     * @returns {number}
     */
    get sets() {
        const ret = wasm.__wbg_get_loadprescription_sets(this.__wbg_ptr);
        return ret;
    }
    /**
     * Tempo string (e.g., "3-1-2-0")
     * @returns {string}
     */
    get tempo() {
        let deferred1_0;
        let deferred1_1;
        try {
            const ret = wasm.__wbg_get_loadprescription_tempo(this.__wbg_ptr);
            deferred1_0 = ret[0];
            deferred1_1 = ret[1];
            return getStringFromWasm0(ret[0], ret[1]);
        } finally {
            wasm.__wbindgen_free(deferred1_0, deferred1_1, 1);
        }
    }
    /**
     * Recommended weight in kg
     * @returns {number}
     */
    get weight_kg() {
        const ret = wasm.__wbg_get_loadprescription_weight_kg(this.__wbg_ptr);
        return ret;
    }
    /**
     * @param {number} weight_kg
     * @param {number} reps
     * @param {number} rpe
     * @param {number} percentage
     * @param {string} tempo
     * @param {number} rest_seconds
     * @param {number} sets
     */
    constructor(weight_kg, reps, rpe, percentage, tempo, rest_seconds, sets) {
        const ptr0 = passStringToWasm0(tempo, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.loadprescription_new(weight_kg, reps, rpe, percentage, ptr0, len0, rest_seconds, sets);
        this.__wbg_ptr = ret >>> 0;
        LoadPrescriptionFinalization.register(this, this.__wbg_ptr, this);
        return this;
    }
    /**
     * Percentage of 1RM
     * @param {number} arg0
     */
    set percentage(arg0) {
        wasm.__wbg_set_loadprescription_percentage(this.__wbg_ptr, arg0);
    }
    /**
     * Target reps
     * @param {number} arg0
     */
    set reps(arg0) {
        wasm.__wbg_set_loadprescription_reps(this.__wbg_ptr, arg0);
    }
    /**
     * Rest period in seconds
     * @param {number} arg0
     */
    set rest_seconds(arg0) {
        wasm.__wbg_set_loadprescription_rest_seconds(this.__wbg_ptr, arg0);
    }
    /**
     * Target RPE
     * @param {number} arg0
     */
    set rpe(arg0) {
        wasm.__wbg_set_loadprescription_rpe(this.__wbg_ptr, arg0);
    }
    /**
     * Number of sets
     * @param {number} arg0
     */
    set sets(arg0) {
        wasm.__wbg_set_loadprescription_sets(this.__wbg_ptr, arg0);
    }
    /**
     * Tempo string (e.g., "3-1-2-0")
     * @param {string} arg0
     */
    set tempo(arg0) {
        const ptr0 = passStringToWasm0(arg0, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        wasm.__wbg_set_loadprescription_tempo(this.__wbg_ptr, ptr0, len0);
    }
    /**
     * Recommended weight in kg
     * @param {number} arg0
     */
    set weight_kg(arg0) {
        wasm.__wbg_set_loadprescription_weight_kg(this.__wbg_ptr, arg0);
    }
}
if (Symbol.dispose) LoadPrescription.prototype[Symbol.dispose] = LoadPrescription.prototype.free;

/**
 * 1RM estimation result
 */
export class OneRMResult {
    static __wrap(ptr) {
        ptr = ptr >>> 0;
        const obj = Object.create(OneRMResult.prototype);
        obj.__wbg_ptr = ptr;
        OneRMResultFinalization.register(obj, obj.__wbg_ptr, obj);
        return obj;
    }
    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        OneRMResultFinalization.unregister(this);
        return ptr;
    }
    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_onermresult_free(ptr, 0);
    }
    /**
     * Confidence level (0-100)
     * @returns {number}
     */
    get confidence() {
        const ret = wasm.__wbg_get_loadprescription_rpe(this.__wbg_ptr);
        return ret;
    }
    /**
     * Estimated 1RM in kg
     * @returns {number}
     */
    get estimated_1rm() {
        const ret = wasm.__wbg_get_loadprescription_weight_kg(this.__wbg_ptr);
        return ret;
    }
    /**
     * Formula used
     * @returns {string}
     */
    get formula() {
        let deferred1_0;
        let deferred1_1;
        try {
            const ret = wasm.__wbg_get_onermresult_formula(this.__wbg_ptr);
            deferred1_0 = ret[0];
            deferred1_1 = ret[1];
            return getStringFromWasm0(ret[0], ret[1]);
        } finally {
            wasm.__wbindgen_free(deferred1_0, deferred1_1, 1);
        }
    }
    /**
     * @param {number} estimated_1rm
     * @param {number} confidence
     * @param {string} formula
     */
    constructor(estimated_1rm, confidence, formula) {
        const ptr0 = passStringToWasm0(formula, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.onermresult_new(estimated_1rm, confidence, ptr0, len0);
        this.__wbg_ptr = ret >>> 0;
        OneRMResultFinalization.register(this, this.__wbg_ptr, this);
        return this;
    }
    /**
     * Confidence level (0-100)
     * @param {number} arg0
     */
    set confidence(arg0) {
        wasm.__wbg_set_loadprescription_rpe(this.__wbg_ptr, arg0);
    }
    /**
     * Estimated 1RM in kg
     * @param {number} arg0
     */
    set estimated_1rm(arg0) {
        wasm.__wbg_set_loadprescription_weight_kg(this.__wbg_ptr, arg0);
    }
    /**
     * Formula used
     * @param {string} arg0
     */
    set formula(arg0) {
        const ptr0 = passStringToWasm0(arg0, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        wasm.__wbg_set_loadprescription_tempo(this.__wbg_ptr, ptr0, len0);
    }
}
if (Symbol.dispose) OneRMResult.prototype[Symbol.dispose] = OneRMResult.prototype.free;

/**
 * Training phases
 * @enum {0 | 1 | 2 | 3 | 4}
 */
export const TrainingPhase = Object.freeze({
    Hypertrophy: 0, "0": "Hypertrophy",
    Strength: 1, "1": "Strength",
    Power: 2, "2": "Power",
    Peaking: 3, "3": "Peaking",
    Deload: 4, "4": "Deload",
});

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
 * @param {number} e1rm
 * @param {number} target_reps
 * @param {number} target_rpe
 * @param {TrainingPhase} phase
 * @param {ExperienceLevel} experience
 * @returns {LoadPrescription}
 */
export function calculate_load(e1rm, target_reps, target_rpe, phase, experience) {
    const ret = wasm.calculate_load(e1rm, target_reps, target_rpe, phase, experience);
    return LoadPrescription.__wrap(ret);
}

/**
 * Batch calculate loads for multiple exercises
 * @param {Float32Array} e1rms
 * @param {Uint8Array} target_reps
 * @param {Float32Array} target_rpes
 * @param {TrainingPhase} phase
 * @param {ExperienceLevel} experience
 * @returns {any}
 */
export function calculate_loads_batch(e1rms, target_reps, target_rpes, phase, experience) {
    const ptr0 = passArrayF32ToWasm0(e1rms, wasm.__wbindgen_malloc);
    const len0 = WASM_VECTOR_LEN;
    const ptr1 = passArray8ToWasm0(target_reps, wasm.__wbindgen_malloc);
    const len1 = WASM_VECTOR_LEN;
    const ptr2 = passArrayF32ToWasm0(target_rpes, wasm.__wbindgen_malloc);
    const len2 = WASM_VECTOR_LEN;
    const ret = wasm.calculate_loads_batch(ptr0, len0, ptr1, len1, ptr2, len2, phase, experience);
    if (ret[2]) {
        throw takeFromExternrefTable0(ret[1]);
    }
    return takeFromExternrefTable0(ret[0]);
}

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
 * @param {number} weight
 * @param {number} reps
 * @param {number | null} [rpe]
 * @returns {OneRMResult}
 */
export function estimate_1rm(weight, reps, rpe) {
    const ret = wasm.estimate_1rm(weight, reps, isLikeNone(rpe) ? 0x100000001 : Math.fround(rpe));
    return OneRMResult.__wrap(ret);
}

/**
 * Get recommended rep ranges for a training phase
 * @param {TrainingPhase} phase
 * @returns {Uint8Array}
 */
export function get_phase_rep_range(phase) {
    const ret = wasm.get_phase_rep_range(phase);
    var v1 = getArrayU8FromWasm0(ret[0], ret[1]).slice();
    wasm.__wbindgen_free(ret[0], ret[1] * 1, 1);
    return v1;
}

/**
 * Get recommended RPE range for a training phase
 * @param {TrainingPhase} phase
 * @returns {Float32Array}
 */
export function get_phase_rpe_range(phase) {
    const ret = wasm.get_phase_rpe_range(phase);
    var v1 = getArrayF32FromWasm0(ret[0], ret[1]).slice();
    wasm.__wbindgen_free(ret[0], ret[1] * 4, 4);
    return v1;
}

/**
 * Parse tempo string to total time under tension
 *
 * # Arguments
 * * `tempo` - Tempo string (e.g., "3-1-2-0")
 *
 * # Returns
 * Total seconds per rep, or None if invalid format
 * @param {string} tempo
 * @returns {number | undefined}
 */
export function parse_tempo(tempo) {
    const ptr0 = passStringToWasm0(tempo, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
    const len0 = WASM_VECTOR_LEN;
    const ret = wasm.parse_tempo(ptr0, len0);
    return ret === 0xFFFFFF ? undefined : ret;
}

/**
 * Get RPE for given percentage and reps
 *
 * # Arguments
 * * `percentage` - Percentage of 1RM (0.0-1.0)
 * * `reps` - Number of reps (1-12)
 *
 * # Returns
 * Estimated RPE (6.0-10.0)
 * @param {number} percentage
 * @param {number} reps
 * @returns {number}
 */
export function percentage_to_rpe(percentage, reps) {
    const ret = wasm.percentage_to_rpe(percentage, reps);
    return ret;
}

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
 * @param {number} current_weight
 * @param {number} last_rpe
 * @param {number} target_rpe
 * @param {number} min_increment
 * @returns {number}
 */
export function progressive_overload(current_weight, last_rpe, target_rpe, min_increment) {
    const ret = wasm.progressive_overload(current_weight, last_rpe, target_rpe, min_increment);
    return ret;
}

/**
 * Get percentage of 1RM for given reps and RPE
 *
 * # Arguments
 * * `reps` - Number of reps (1-12)
 * * `rpe` - Rate of perceived exertion (6.0-10.0)
 *
 * # Returns
 * Percentage of 1RM (0.0-1.0)
 * @param {number} reps
 * @param {number} rpe
 * @returns {number}
 */
export function rpe_to_percentage(reps, rpe) {
    const ret = wasm.rpe_to_percentage(reps, rpe);
    return ret;
}

/**
 * Calculate time under tension for a set
 *
 * # Arguments
 * * `tempo` - Tempo string
 * * `reps` - Number of reps
 *
 * # Returns
 * Total seconds of tension, or 0 if invalid
 * @param {string} tempo
 * @param {number} reps
 * @returns {number}
 */
export function time_under_tension(tempo, reps) {
    const ptr0 = passStringToWasm0(tempo, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
    const len0 = WASM_VECTOR_LEN;
    const ret = wasm.time_under_tension(ptr0, len0, reps);
    return ret >>> 0;
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
        "./musclemap_load_bg.js": import0,
    };
}

const LoadPrescriptionFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_loadprescription_free(ptr >>> 0, 1));
const OneRMResultFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_onermresult_free(ptr >>> 0, 1));

function getArrayF32FromWasm0(ptr, len) {
    ptr = ptr >>> 0;
    return getFloat32ArrayMemory0().subarray(ptr / 4, ptr / 4 + len);
}

function getArrayU8FromWasm0(ptr, len) {
    ptr = ptr >>> 0;
    return getUint8ArrayMemory0().subarray(ptr / 1, ptr / 1 + len);
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

function passArray8ToWasm0(arg, malloc) {
    const ptr = malloc(arg.length * 1, 1) >>> 0;
    getUint8ArrayMemory0().set(arg, ptr / 1);
    WASM_VECTOR_LEN = arg.length;
    return ptr;
}

function passArrayF32ToWasm0(arg, malloc) {
    const ptr = malloc(arg.length * 4, 4) >>> 0;
    getFloat32ArrayMemory0().set(arg, ptr / 4);
    WASM_VECTOR_LEN = arg.length;
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
        module_or_path = new URL('musclemap_load_bg.wasm', import.meta.url);
    }
    const imports = __wbg_get_imports();

    if (typeof module_or_path === 'string' || (typeof Request === 'function' && module_or_path instanceof Request) || (typeof URL === 'function' && module_or_path instanceof URL)) {
        module_or_path = fetch(module_or_path);
    }

    const { instance, module } = await __wbg_load(await module_or_path, imports);

    return __wbg_finalize_init(instance, module);
}

export { initSync, __wbg_init as default };
