/* @ts-self-types="./musclemap_rank.d.ts" */

/**
 * Individual rank result
 */
export class RankEntry {
    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        RankEntryFinalization.unregister(this);
        return ptr;
    }
    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_rankentry_free(ptr, 0);
    }
    /**
     * Original index in the input array
     * @returns {number}
     */
    get index() {
        const ret = wasm.__wbg_get_rankentry_index(this.__wbg_ptr);
        return ret >>> 0;
    }
    /**
     * Percentile (100 = top, 0 = bottom)
     * @returns {number}
     */
    get percentile() {
        const ret = wasm.__wbg_get_rankentry_percentile(this.__wbg_ptr);
        return ret;
    }
    /**
     * Rank (1 = highest score)
     * @returns {number}
     */
    get rank() {
        const ret = wasm.__wbg_get_rankentry_rank(this.__wbg_ptr);
        return ret >>> 0;
    }
    /**
     * Original score
     * @returns {number}
     */
    get score() {
        const ret = wasm.__wbg_get_rankentry_score(this.__wbg_ptr);
        return ret;
    }
    /**
     * @param {number} index
     * @param {number} score
     * @param {number} rank
     * @param {number} percentile
     */
    constructor(index, score, rank, percentile) {
        const ret = wasm.rankentry_new(index, score, rank, percentile);
        this.__wbg_ptr = ret >>> 0;
        RankEntryFinalization.register(this, this.__wbg_ptr, this);
        return this;
    }
    /**
     * Original index in the input array
     * @param {number} arg0
     */
    set index(arg0) {
        wasm.__wbg_set_rankentry_index(this.__wbg_ptr, arg0);
    }
    /**
     * Percentile (100 = top, 0 = bottom)
     * @param {number} arg0
     */
    set percentile(arg0) {
        wasm.__wbg_set_rankentry_percentile(this.__wbg_ptr, arg0);
    }
    /**
     * Rank (1 = highest score)
     * @param {number} arg0
     */
    set rank(arg0) {
        wasm.__wbg_set_rankentry_rank(this.__wbg_ptr, arg0);
    }
    /**
     * Original score
     * @param {number} arg0
     */
    set score(arg0) {
        wasm.__wbg_set_rankentry_score(this.__wbg_ptr, arg0);
    }
}
if (Symbol.dispose) RankEntry.prototype[Symbol.dispose] = RankEntry.prototype.free;

/**
 * Result of ranking calculation
 */
export class RankResult {
    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        RankResultFinalization.unregister(this);
        return ptr;
    }
    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_rankresult_free(ptr, 0);
    }
    /**
     * Total number of entries
     * @returns {number}
     */
    get count() {
        const ret = wasm.__wbg_get_rankresult_count(this.__wbg_ptr);
        return ret >>> 0;
    }
    /**
     * Time taken in milliseconds
     * @returns {number}
     */
    get duration_ms() {
        const ret = wasm.__wbg_get_rankentry_score(this.__wbg_ptr);
        return ret;
    }
    /**
     * Whether native WASM was used
     * @returns {boolean}
     */
    get native() {
        const ret = wasm.__wbg_get_rankresult_native(this.__wbg_ptr);
        return ret !== 0;
    }
    /**
     * @param {number} count
     * @param {number} duration_ms
     */
    constructor(count, duration_ms) {
        const ret = wasm.rankresult_new(count, duration_ms);
        this.__wbg_ptr = ret >>> 0;
        RankResultFinalization.register(this, this.__wbg_ptr, this);
        return this;
    }
    /**
     * Total number of entries
     * @param {number} arg0
     */
    set count(arg0) {
        wasm.__wbg_set_rankresult_count(this.__wbg_ptr, arg0);
    }
    /**
     * Time taken in milliseconds
     * @param {number} arg0
     */
    set duration_ms(arg0) {
        wasm.__wbg_set_rankentry_score(this.__wbg_ptr, arg0);
    }
    /**
     * Whether native WASM was used
     * @param {boolean} arg0
     */
    set native(arg0) {
        wasm.__wbg_set_rankresult_native(this.__wbg_ptr, arg0);
    }
}
if (Symbol.dispose) RankResult.prototype[Symbol.dispose] = RankResult.prototype.free;

/**
 * Calculate ranks and percentiles for a list of scores
 *
 * # Arguments
 * * `scores` - Array of scores (higher = better)
 *
 * # Returns
 * Array of ranks (1-based, same order as input)
 * @param {Float64Array} scores
 * @returns {Uint32Array}
 */
export function rank_calculate(scores) {
    const ptr0 = passArrayF64ToWasm0(scores, wasm.__wbindgen_malloc);
    const len0 = WASM_VECTOR_LEN;
    const ret = wasm.rank_calculate(ptr0, len0);
    var v2 = getArrayU32FromWasm0(ret[0], ret[1]).slice();
    wasm.__wbindgen_free(ret[0], ret[1] * 4, 4);
    return v2;
}

/**
 * Calculate both ranks and percentiles
 *
 * # Arguments
 * * `scores` - Array of scores
 *
 * # Returns
 * Tuple of (ranks, percentiles) as JsValue
 * @param {Float64Array} scores
 * @returns {any}
 */
export function rank_calculate_full(scores) {
    const ptr0 = passArrayF64ToWasm0(scores, wasm.__wbindgen_malloc);
    const len0 = WASM_VECTOR_LEN;
    const ret = wasm.rank_calculate_full(ptr0, len0);
    if (ret[2]) {
        throw takeFromExternrefTable0(ret[1]);
    }
    return takeFromExternrefTable0(ret[0]);
}

/**
 * Calculate competition rank (standard 1, 2, 2, 4 for ties)
 *
 * This is the same as rank_calculate but explicitly named for clarity.
 * @param {Float64Array} scores
 * @returns {Uint32Array}
 */
export function rank_competition(scores) {
    const ptr0 = passArrayF64ToWasm0(scores, wasm.__wbindgen_malloc);
    const len0 = WASM_VECTOR_LEN;
    const ret = wasm.rank_competition(ptr0, len0);
    var v2 = getArrayU32FromWasm0(ret[0], ret[1]).slice();
    wasm.__wbindgen_free(ret[0], ret[1] * 4, 4);
    return v2;
}

/**
 * Calculate dense rank (no gaps in ranking)
 *
 * # Arguments
 * * `scores` - Array of scores
 *
 * # Returns
 * Array of dense ranks (1, 2, 3, ... with no gaps for ties)
 * @param {Float64Array} scores
 * @returns {Uint32Array}
 */
export function rank_dense(scores) {
    const ptr0 = passArrayF64ToWasm0(scores, wasm.__wbindgen_malloc);
    const len0 = WASM_VECTOR_LEN;
    const ret = wasm.rank_dense(ptr0, len0);
    var v2 = getArrayU32FromWasm0(ret[0], ret[1]).slice();
    wasm.__wbindgen_free(ret[0], ret[1] * 4, 4);
    return v2;
}

/**
 * Find the rank of a specific score using binary search
 *
 * # Arguments
 * * `sorted_scores` - Scores sorted in descending order
 * * `target_score` - Score to find rank for
 *
 * # Returns
 * Rank (1-based), or 0 if not applicable
 * @param {Float64Array} sorted_scores
 * @param {number} target_score
 * @returns {number}
 */
export function rank_find(sorted_scores, target_score) {
    const ptr0 = passArrayF64ToWasm0(sorted_scores, wasm.__wbindgen_malloc);
    const len0 = WASM_VECTOR_LEN;
    const ret = wasm.rank_find(ptr0, len0, target_score);
    return ret >>> 0;
}

/**
 * Calculate percentiles for a list of scores
 *
 * # Arguments
 * * `scores` - Array of scores (higher = better)
 *
 * # Returns
 * Array of percentiles (0-100, same order as input)
 * @param {Float64Array} scores
 * @returns {Float64Array}
 */
export function rank_percentiles(scores) {
    const ptr0 = passArrayF64ToWasm0(scores, wasm.__wbindgen_malloc);
    const len0 = WASM_VECTOR_LEN;
    const ret = wasm.rank_percentiles(ptr0, len0);
    var v2 = getArrayF64FromWasm0(ret[0], ret[1]).slice();
    wasm.__wbindgen_free(ret[0], ret[1] * 8, 8);
    return v2;
}

/**
 * Sort scores in descending order and return indices
 *
 * # Arguments
 * * `scores` - Array of scores
 *
 * # Returns
 * Array of original indices in sorted order
 * @param {Float64Array} scores
 * @returns {Uint32Array}
 */
export function rank_sort_indices(scores) {
    const ptr0 = passArrayF64ToWasm0(scores, wasm.__wbindgen_malloc);
    const len0 = WASM_VECTOR_LEN;
    const ret = wasm.rank_sort_indices(ptr0, len0);
    var v2 = getArrayU32FromWasm0(ret[0], ret[1]).slice();
    wasm.__wbindgen_free(ret[0], ret[1] * 4, 4);
    return v2;
}

/**
 * Get statistics about the score distribution
 *
 * # Arguments
 * * `scores` - Array of scores
 *
 * # Returns
 * Statistics object with min, max, mean, median
 * @param {Float64Array} scores
 * @returns {any}
 */
export function rank_stats(scores) {
    const ptr0 = passArrayF64ToWasm0(scores, wasm.__wbindgen_malloc);
    const len0 = WASM_VECTOR_LEN;
    const ret = wasm.rank_stats(ptr0, len0);
    if (ret[2]) {
        throw takeFromExternrefTable0(ret[1]);
    }
    return takeFromExternrefTable0(ret[0]);
}

/**
 * Get top N entries with their ranks
 *
 * # Arguments
 * * `scores` - Array of scores
 * * `n` - Number of top entries to return
 *
 * # Returns
 * Array of (original_index, score, rank) tuples as JsValue
 * @param {Float64Array} scores
 * @param {number} n
 * @returns {any}
 */
export function rank_top_n(scores, n) {
    const ptr0 = passArrayF64ToWasm0(scores, wasm.__wbindgen_malloc);
    const len0 = WASM_VECTOR_LEN;
    const ret = wasm.rank_top_n(ptr0, len0, n);
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
        "./musclemap_rank_bg.js": import0,
    };
}

const RankEntryFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_rankentry_free(ptr >>> 0, 1));
const RankResultFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_rankresult_free(ptr >>> 0, 1));

function getArrayF64FromWasm0(ptr, len) {
    ptr = ptr >>> 0;
    return getFloat64ArrayMemory0().subarray(ptr / 8, ptr / 8 + len);
}

function getArrayU32FromWasm0(ptr, len) {
    ptr = ptr >>> 0;
    return getUint32ArrayMemory0().subarray(ptr / 4, ptr / 4 + len);
}

let cachedDataViewMemory0 = null;
function getDataViewMemory0() {
    if (cachedDataViewMemory0 === null || cachedDataViewMemory0.buffer.detached === true || (cachedDataViewMemory0.buffer.detached === undefined && cachedDataViewMemory0.buffer !== wasm.memory.buffer)) {
        cachedDataViewMemory0 = new DataView(wasm.memory.buffer);
    }
    return cachedDataViewMemory0;
}

let cachedFloat64ArrayMemory0 = null;
function getFloat64ArrayMemory0() {
    if (cachedFloat64ArrayMemory0 === null || cachedFloat64ArrayMemory0.byteLength === 0) {
        cachedFloat64ArrayMemory0 = new Float64Array(wasm.memory.buffer);
    }
    return cachedFloat64ArrayMemory0;
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

function passArrayF64ToWasm0(arg, malloc) {
    const ptr = malloc(arg.length * 8, 8) >>> 0;
    getFloat64ArrayMemory0().set(arg, ptr / 8);
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
    cachedFloat64ArrayMemory0 = null;
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
        module_or_path = new URL('musclemap_rank_bg.wasm', import.meta.url);
    }
    const imports = __wbg_get_imports();

    if (typeof module_or_path === 'string' || (typeof Request === 'function' && module_or_path instanceof Request) || (typeof URL === 'function' && module_or_path instanceof URL)) {
        module_or_path = fetch(module_or_path);
    }

    const { instance, module } = await __wbg_load(await module_or_path, imports);

    return __wbg_finalize_init(instance, module);
}

export { initSync, __wbg_init as default };
