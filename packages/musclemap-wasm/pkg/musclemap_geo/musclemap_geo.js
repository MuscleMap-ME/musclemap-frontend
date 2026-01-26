/* @ts-self-types="./musclemap_geo.d.ts" */

/**
 * Bounding box result
 */
export class BoundingBox {
    static __wrap(ptr) {
        ptr = ptr >>> 0;
        const obj = Object.create(BoundingBox.prototype);
        obj.__wbg_ptr = ptr;
        BoundingBoxFinalization.register(obj, obj.__wbg_ptr, obj);
        return obj;
    }
    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        BoundingBoxFinalization.unregister(this);
        return ptr;
    }
    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_boundingbox_free(ptr, 0);
    }
    /**
     * Check if a point is within this bounding box
     * @param {number} lat
     * @param {number} lng
     * @returns {boolean}
     */
    contains(lat, lng) {
        const ret = wasm.boundingbox_contains(this.__wbg_ptr, lat, lng);
        return ret !== 0;
    }
    /**
     * @param {number} min_lat
     * @param {number} max_lat
     * @param {number} min_lng
     * @param {number} max_lng
     */
    constructor(min_lat, max_lat, min_lng, max_lng) {
        const ret = wasm.boundingbox_new(min_lat, max_lat, min_lng, max_lng);
        this.__wbg_ptr = ret >>> 0;
        BoundingBoxFinalization.register(this, this.__wbg_ptr, this);
        return this;
    }
    /**
     * @returns {number}
     */
    get max_lat() {
        const ret = wasm.__wbg_get_boundingbox_max_lat(this.__wbg_ptr);
        return ret;
    }
    /**
     * @returns {number}
     */
    get max_lng() {
        const ret = wasm.__wbg_get_boundingbox_max_lng(this.__wbg_ptr);
        return ret;
    }
    /**
     * @returns {number}
     */
    get min_lat() {
        const ret = wasm.__wbg_get_boundingbox_min_lat(this.__wbg_ptr);
        return ret;
    }
    /**
     * @returns {number}
     */
    get min_lng() {
        const ret = wasm.__wbg_get_boundingbox_min_lng(this.__wbg_ptr);
        return ret;
    }
    /**
     * @param {number} arg0
     */
    set max_lat(arg0) {
        wasm.__wbg_set_boundingbox_max_lat(this.__wbg_ptr, arg0);
    }
    /**
     * @param {number} arg0
     */
    set max_lng(arg0) {
        wasm.__wbg_set_boundingbox_max_lng(this.__wbg_ptr, arg0);
    }
    /**
     * @param {number} arg0
     */
    set min_lat(arg0) {
        wasm.__wbg_set_boundingbox_min_lat(this.__wbg_ptr, arg0);
    }
    /**
     * @param {number} arg0
     */
    set min_lng(arg0) {
        wasm.__wbg_set_boundingbox_min_lng(this.__wbg_ptr, arg0);
    }
}
if (Symbol.dispose) BoundingBox.prototype[Symbol.dispose] = BoundingBox.prototype.free;

/**
 * Decoded coordinates result
 */
export class DecodedCoords {
    static __wrap(ptr) {
        ptr = ptr >>> 0;
        const obj = Object.create(DecodedCoords.prototype);
        obj.__wbg_ptr = ptr;
        DecodedCoordsFinalization.register(obj, obj.__wbg_ptr, obj);
        return obj;
    }
    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        DecodedCoordsFinalization.unregister(this);
        return ptr;
    }
    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_decodedcoords_free(ptr, 0);
    }
    /**
     * @param {number} lat
     * @param {number} lng
     */
    constructor(lat, lng) {
        const ret = wasm.decodedcoords_new(lat, lng);
        this.__wbg_ptr = ret >>> 0;
        DecodedCoordsFinalization.register(this, this.__wbg_ptr, this);
        return this;
    }
    /**
     * @returns {number}
     */
    get lat() {
        const ret = wasm.__wbg_get_boundingbox_min_lat(this.__wbg_ptr);
        return ret;
    }
    /**
     * @returns {number}
     */
    get lng() {
        const ret = wasm.__wbg_get_boundingbox_max_lat(this.__wbg_ptr);
        return ret;
    }
    /**
     * @param {number} arg0
     */
    set lat(arg0) {
        wasm.__wbg_set_boundingbox_min_lat(this.__wbg_ptr, arg0);
    }
    /**
     * @param {number} arg0
     */
    set lng(arg0) {
        wasm.__wbg_set_boundingbox_max_lat(this.__wbg_ptr, arg0);
    }
}
if (Symbol.dispose) DecodedCoords.prototype[Symbol.dispose] = DecodedCoords.prototype.free;

/**
 * Calculate bounding box for a point and radius
 *
 * # Arguments
 * * `lat`, `lng` - Center point
 * * `radius_meters` - Radius in meters
 *
 * # Returns
 * BoundingBox with min/max lat/lng
 * @param {number} lat
 * @param {number} lng
 * @param {number} radius_meters
 * @returns {BoundingBox}
 */
export function bounding_box(lat, lng, radius_meters) {
    const ret = wasm.bounding_box(lat, lng, radius_meters);
    return BoundingBox.__wrap(ret);
}

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
 * @param {number} origin_lat
 * @param {number} origin_lng
 * @param {Float64Array} targets
 * @param {number} radius_meters
 * @returns {Uint32Array}
 */
export function filter_within_radius(origin_lat, origin_lng, targets, radius_meters) {
    const ptr0 = passArrayF64ToWasm0(targets, wasm.__wbindgen_malloc);
    const len0 = WASM_VECTOR_LEN;
    const ret = wasm.filter_within_radius(origin_lat, origin_lng, ptr0, len0, radius_meters);
    if (ret[3]) {
        throw takeFromExternrefTable0(ret[2]);
    }
    var v2 = getArrayU32FromWasm0(ret[0], ret[1]).slice();
    wasm.__wbindgen_free(ret[0], ret[1] * 4, 4);
    return v2;
}

/**
 * Decode geohash string to latitude/longitude
 *
 * # Arguments
 * * `hash` - Geohash string (1-12 characters)
 *
 * # Returns
 * DecodedCoords with lat/lng or error
 * @param {string} hash
 * @returns {DecodedCoords}
 */
export function geohash_decode(hash) {
    const ptr0 = passStringToWasm0(hash, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
    const len0 = WASM_VECTOR_LEN;
    const ret = wasm.geohash_decode(ptr0, len0);
    if (ret[2]) {
        throw takeFromExternrefTable0(ret[1]);
    }
    return DecodedCoords.__wrap(ret[0]);
}

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
 * @param {number} lat
 * @param {number} lng
 * @param {number} precision
 * @returns {string}
 */
export function geohash_encode(lat, lng, precision) {
    let deferred2_0;
    let deferred2_1;
    try {
        const ret = wasm.geohash_encode(lat, lng, precision);
        var ptr1 = ret[0];
        var len1 = ret[1];
        if (ret[3]) {
            ptr1 = 0; len1 = 0;
            throw takeFromExternrefTable0(ret[2]);
        }
        deferred2_0 = ptr1;
        deferred2_1 = len1;
        return getStringFromWasm0(ptr1, len1);
    } finally {
        wasm.__wbindgen_free(deferred2_0, deferred2_1, 1);
    }
}

/**
 * Batch encode multiple coordinates to geohashes
 *
 * # Arguments
 * * `coords` - Flat array of [lat1, lng1, lat2, lng2, ...]
 * * `precision` - Geohash precision
 *
 * # Returns
 * Array of geohash strings
 * @param {Float64Array} coords
 * @param {number} precision
 * @returns {string[]}
 */
export function geohash_encode_batch(coords, precision) {
    const ptr0 = passArrayF64ToWasm0(coords, wasm.__wbindgen_malloc);
    const len0 = WASM_VECTOR_LEN;
    const ret = wasm.geohash_encode_batch(ptr0, len0, precision);
    if (ret[3]) {
        throw takeFromExternrefTable0(ret[2]);
    }
    var v2 = getArrayJsValueFromWasm0(ret[0], ret[1]).slice();
    wasm.__wbindgen_free(ret[0], ret[1] * 4, 4);
    return v2;
}

/**
 * Get neighboring geohashes (8 directions)
 *
 * # Arguments
 * * `hash` - Center geohash
 *
 * # Returns
 * Array of 8 neighbor hashes [N, NE, E, SE, S, SW, W, NW]
 * @param {string} hash
 * @returns {string[]}
 */
export function geohash_neighbors(hash) {
    const ptr0 = passStringToWasm0(hash, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
    const len0 = WASM_VECTOR_LEN;
    const ret = wasm.geohash_neighbors(ptr0, len0);
    if (ret[3]) {
        throw takeFromExternrefTable0(ret[2]);
    }
    var v2 = getArrayJsValueFromWasm0(ret[0], ret[1]).slice();
    wasm.__wbindgen_free(ret[0], ret[1] * 4, 4);
    return v2;
}

/**
 * Batch calculate distances from one point to many points
 *
 * # Arguments
 * * `origin_lat`, `origin_lng` - Origin point
 * * `targets` - Flat array of [lat1, lng1, lat2, lng2, ...]
 *
 * # Returns
 * Array of distances in meters
 * @param {number} origin_lat
 * @param {number} origin_lng
 * @param {Float64Array} targets
 * @returns {Float64Array}
 */
export function haversine_batch(origin_lat, origin_lng, targets) {
    const ptr0 = passArrayF64ToWasm0(targets, wasm.__wbindgen_malloc);
    const len0 = WASM_VECTOR_LEN;
    const ret = wasm.haversine_batch(origin_lat, origin_lng, ptr0, len0);
    if (ret[3]) {
        throw takeFromExternrefTable0(ret[2]);
    }
    var v2 = getArrayF64FromWasm0(ret[0], ret[1]).slice();
    wasm.__wbindgen_free(ret[0], ret[1] * 8, 8);
    return v2;
}

/**
 * Calculate distance between two points using Haversine formula
 *
 * # Arguments
 * * `lat1`, `lng1` - First point coordinates
 * * `lat2`, `lng2` - Second point coordinates
 *
 * # Returns
 * Distance in meters
 * @param {number} lat1
 * @param {number} lng1
 * @param {number} lat2
 * @param {number} lng2
 * @returns {number}
 */
export function haversine_meters(lat1, lng1, lat2, lng2) {
    const ret = wasm.haversine_meters(lat1, lng1, lat2, lng2);
    return ret;
}

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
 * @param {number} lat1
 * @param {number} lng1
 * @param {number} lat2
 * @param {number} lng2
 * @param {number} radius_meters
 * @returns {boolean}
 */
export function is_within_radius(lat1, lng1, lat2, lng2, radius_meters) {
    const ret = wasm.is_within_radius(lat1, lng1, lat2, lng2, radius_meters);
    return ret !== 0;
}

/**
 * Get optimal geohash precision for a given radius
 *
 * # Arguments
 * * `radius_meters` - Search radius in meters
 *
 * # Returns
 * Recommended precision (1-12)
 * @param {number} radius_meters
 * @returns {number}
 */
export function optimal_precision(radius_meters) {
    const ret = wasm.optimal_precision(radius_meters);
    return ret;
}

function __wbg_get_imports() {
    const import0 = {
        __proto__: null,
        __wbg___wbindgen_throw_be289d5034ed271b: function(arg0, arg1) {
            throw new Error(getStringFromWasm0(arg0, arg1));
        },
        __wbindgen_cast_0000000000000001: function(arg0, arg1) {
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
        "./musclemap_geo_bg.js": import0,
    };
}

const BoundingBoxFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_boundingbox_free(ptr >>> 0, 1));
const DecodedCoordsFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_decodedcoords_free(ptr >>> 0, 1));

function getArrayF64FromWasm0(ptr, len) {
    ptr = ptr >>> 0;
    return getFloat64ArrayMemory0().subarray(ptr / 8, ptr / 8 + len);
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
        module_or_path = new URL('musclemap_geo_bg.wasm', import.meta.url);
    }
    const imports = __wbg_get_imports();

    if (typeof module_or_path === 'string' || (typeof Request === 'function' && module_or_path instanceof Request) || (typeof URL === 'function' && module_or_path instanceof URL)) {
        module_or_path = fetch(module_or_path);
    }

    const { instance, module } = await __wbg_load(await module_or_path, imports);

    return __wbg_finalize_init(instance, module);
}

export { initSync, __wbg_init as default };
