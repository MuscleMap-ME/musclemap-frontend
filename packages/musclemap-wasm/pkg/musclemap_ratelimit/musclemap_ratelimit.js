/* @ts-self-types="./musclemap_ratelimit.d.ts" */

/**
 * Fixed window rate limiter (simpler, less accurate)
 */
export class FixedWindowLimiter {
    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        FixedWindowLimiterFinalization.unregister(this);
        return ptr;
    }
    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_fixedwindowlimiter_free(ptr, 0);
    }
    /**
     * @param {string} user_id
     * @param {number} count
     * @returns {boolean}
     */
    check(user_id, count) {
        const ptr0 = passStringToWasm0(user_id, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.fixedwindowlimiter_check(this.__wbg_ptr, ptr0, len0, count);
        return ret !== 0;
    }
    clear() {
        wasm.fixedwindowlimiter_clear(this.__wbg_ptr);
    }
    /**
     * @param {number} limit
     * @param {number} window_seconds
     */
    constructor(limit, window_seconds) {
        const ret = wasm.fixedwindowlimiter_new(limit, window_seconds);
        this.__wbg_ptr = ret >>> 0;
        FixedWindowLimiterFinalization.register(this, this.__wbg_ptr, this);
        return this;
    }
}
if (Symbol.dispose) FixedWindowLimiter.prototype[Symbol.dispose] = FixedWindowLimiter.prototype.free;

/**
 * Rate limit check result
 */
export class RateLimitResult {
    static __wrap(ptr) {
        ptr = ptr >>> 0;
        const obj = Object.create(RateLimitResult.prototype);
        obj.__wbg_ptr = ptr;
        RateLimitResultFinalization.register(obj, obj.__wbg_ptr, obj);
        return obj;
    }
    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        RateLimitResultFinalization.unregister(this);
        return ptr;
    }
    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_ratelimitresult_free(ptr, 0);
    }
    /**
     * Whether the request is allowed
     * @returns {boolean}
     */
    get allowed() {
        const ret = wasm.__wbg_get_ratelimitresult_allowed(this.__wbg_ptr);
        return ret !== 0;
    }
    /**
     * Total requests in current window
     * @returns {number}
     */
    get current() {
        const ret = wasm.__wbg_get_ratelimitresult_current(this.__wbg_ptr);
        return ret >>> 0;
    }
    /**
     * The configured limit
     * @returns {number}
     */
    get limit() {
        const ret = wasm.__wbg_get_ratelimitresult_limit(this.__wbg_ptr);
        return ret >>> 0;
    }
    /**
     * Number of requests remaining in the window
     * @returns {number}
     */
    get remaining() {
        const ret = wasm.__wbg_get_ratelimitresult_remaining(this.__wbg_ptr);
        return ret >>> 0;
    }
    /**
     * Seconds until the window resets
     * @returns {number}
     */
    get reset_seconds() {
        const ret = wasm.__wbg_get_ratelimitresult_reset_seconds(this.__wbg_ptr);
        return ret >>> 0;
    }
    /**
     * @param {boolean} allowed
     * @param {number} remaining
     * @param {number} reset_seconds
     * @param {number} current
     * @param {number} limit
     */
    constructor(allowed, remaining, reset_seconds, current, limit) {
        const ret = wasm.ratelimitresult_new(allowed, remaining, reset_seconds, current, limit);
        this.__wbg_ptr = ret >>> 0;
        RateLimitResultFinalization.register(this, this.__wbg_ptr, this);
        return this;
    }
    /**
     * Whether the request is allowed
     * @param {boolean} arg0
     */
    set allowed(arg0) {
        wasm.__wbg_set_ratelimitresult_allowed(this.__wbg_ptr, arg0);
    }
    /**
     * Total requests in current window
     * @param {number} arg0
     */
    set current(arg0) {
        wasm.__wbg_set_ratelimitresult_current(this.__wbg_ptr, arg0);
    }
    /**
     * The configured limit
     * @param {number} arg0
     */
    set limit(arg0) {
        wasm.__wbg_set_ratelimitresult_limit(this.__wbg_ptr, arg0);
    }
    /**
     * Number of requests remaining in the window
     * @param {number} arg0
     */
    set remaining(arg0) {
        wasm.__wbg_set_ratelimitresult_remaining(this.__wbg_ptr, arg0);
    }
    /**
     * Seconds until the window resets
     * @param {number} arg0
     */
    set reset_seconds(arg0) {
        wasm.__wbg_set_ratelimitresult_reset_seconds(this.__wbg_ptr, arg0);
    }
}
if (Symbol.dispose) RateLimitResult.prototype[Symbol.dispose] = RateLimitResult.prototype.free;

/**
 * Sliding window rate limiter
 */
export class RateLimiter {
    static __wrap(ptr) {
        ptr = ptr >>> 0;
        const obj = Object.create(RateLimiter.prototype);
        obj.__wbg_ptr = ptr;
        RateLimiterFinalization.register(obj, obj.__wbg_ptr, obj);
        return obj;
    }
    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        RateLimiterFinalization.unregister(this);
        return ptr;
    }
    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_ratelimiter_free(ptr, 0);
    }
    /**
     * Check if a request is allowed (and count it if allowed)
     *
     * # Arguments
     * * `user_id` - User identifier string
     * * `count` - Number of requests to count (default 1)
     *
     * # Returns
     * RateLimitResult with allowed status and metadata
     * @param {string} user_id
     * @param {number} count
     * @returns {RateLimitResult}
     */
    check(user_id, count) {
        const ptr0 = passStringToWasm0(user_id, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.ratelimiter_check(this.__wbg_ptr, ptr0, len0, count);
        return RateLimitResult.__wrap(ret);
    }
    /**
     * Check without incrementing (peek)
     * @param {string} user_id
     * @returns {RateLimitResult}
     */
    check_only(user_id) {
        const ptr0 = passStringToWasm0(user_id, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.ratelimiter_check_only(this.__wbg_ptr, ptr0, len0);
        return RateLimitResult.__wrap(ret);
    }
    /**
     * Clear all rate limit data
     */
    clear() {
        wasm.ratelimiter_clear(this.__wbg_ptr);
    }
    /**
     * Get the configured limit
     * @returns {number}
     */
    get_limit() {
        const ret = wasm.ratelimiter_get_limit(this.__wbg_ptr);
        return ret >>> 0;
    }
    /**
     * Get the window size in seconds
     * @returns {number}
     */
    get_window_seconds() {
        const ret = wasm.ratelimiter_get_window_seconds(this.__wbg_ptr);
        return ret >>> 0;
    }
    /**
     * Create a new rate limiter
     *
     * # Arguments
     * * `limit` - Maximum requests allowed per window
     * * `window_seconds` - Window size in seconds (1-3600)
     * @param {number} limit
     * @param {number} window_seconds
     */
    constructor(limit, window_seconds) {
        const ret = wasm.ratelimiter_new(limit, window_seconds);
        this.__wbg_ptr = ret >>> 0;
        RateLimiterFinalization.register(this, this.__wbg_ptr, this);
        return this;
    }
    /**
     * Get remaining requests for a user
     * @param {string} user_id
     * @returns {number}
     */
    remaining(user_id) {
        const ptr0 = passStringToWasm0(user_id, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.ratelimiter_remaining(this.__wbg_ptr, ptr0, len0);
        return ret >>> 0;
    }
    /**
     * Reset rate limit for a specific user
     * @param {string} user_id
     */
    reset_user(user_id) {
        const ptr0 = passStringToWasm0(user_id, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        wasm.ratelimiter_reset_user(this.__wbg_ptr, ptr0, len0);
    }
    /**
     * Update the limit (affects future checks)
     * @param {number} limit
     */
    set_limit(limit) {
        wasm.ratelimiter_set_limit(this.__wbg_ptr, limit);
    }
    /**
     * Get the number of tracked users
     * @returns {number}
     */
    user_count() {
        const ret = wasm.ratelimiter_user_count(this.__wbg_ptr);
        return ret >>> 0;
    }
    /**
     * Create a rate limiter with custom capacity
     * @param {number} limit
     * @param {number} window_seconds
     * @param {number} capacity
     * @returns {RateLimiter}
     */
    static with_capacity(limit, window_seconds, capacity) {
        const ret = wasm.ratelimiter_with_capacity(limit, window_seconds, capacity);
        return RateLimiter.__wrap(ret);
    }
}
if (Symbol.dispose) RateLimiter.prototype[Symbol.dispose] = RateLimiter.prototype.free;

/**
 * Simple token bucket rate limiter (alternative algorithm)
 */
export class TokenBucket {
    static __wrap(ptr) {
        ptr = ptr >>> 0;
        const obj = Object.create(TokenBucket.prototype);
        obj.__wbg_ptr = ptr;
        TokenBucketFinalization.register(obj, obj.__wbg_ptr, obj);
        return obj;
    }
    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        TokenBucketFinalization.unregister(this);
        return ptr;
    }
    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_tokenbucket_free(ptr, 0);
    }
    /**
     * Try to consume tokens
     *
     * # Arguments
     * * `count` - Number of tokens to consume
     *
     * # Returns
     * true if tokens were consumed, false if not enough tokens
     * @param {number} count
     * @returns {boolean}
     */
    consume(count) {
        const ret = wasm.tokenbucket_consume(this.__wbg_ptr, count);
        return ret !== 0;
    }
    /**
     * Get current token count
     * @returns {number}
     */
    get_tokens() {
        const ret = wasm.tokenbucket_get_tokens(this.__wbg_ptr);
        return ret;
    }
    /**
     * Create a new token bucket
     *
     * # Arguments
     * * `rate` - Tokens per second to add
     * * `capacity` - Maximum tokens in bucket
     * @param {number} rate
     * @param {number} capacity
     */
    constructor(rate, capacity) {
        const ret = wasm.create_token_bucket(rate, capacity);
        this.__wbg_ptr = ret >>> 0;
        TokenBucketFinalization.register(this, this.__wbg_ptr, this);
        return this;
    }
    /**
     * Reset to full capacity
     */
    reset() {
        wasm.tokenbucket_reset(this.__wbg_ptr);
    }
}
if (Symbol.dispose) TokenBucket.prototype[Symbol.dispose] = TokenBucket.prototype.free;

/**
 * Create a rate limiter (factory function for simpler API)
 * @param {number} limit
 * @param {number} window_seconds
 * @returns {RateLimiter}
 */
export function create_rate_limiter(limit, window_seconds) {
    const ret = wasm.create_rate_limiter(limit, window_seconds);
    return RateLimiter.__wrap(ret);
}

/**
 * Create a token bucket (factory function)
 * @param {number} rate
 * @param {number} capacity
 * @returns {TokenBucket}
 */
export function create_token_bucket(rate, capacity) {
    const ret = wasm.create_token_bucket(rate, capacity);
    return TokenBucket.__wrap(ret);
}

function __wbg_get_imports() {
    const import0 = {
        __proto__: null,
        __wbg___wbindgen_throw_be289d5034ed271b: function(arg0, arg1) {
            throw new Error(getStringFromWasm0(arg0, arg1));
        },
        __wbg_now_a3af9a2f4bbaa4d1: function() {
            const ret = Date.now();
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
        "./musclemap_ratelimit_bg.js": import0,
    };
}

const FixedWindowLimiterFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_fixedwindowlimiter_free(ptr >>> 0, 1));
const RateLimitResultFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_ratelimitresult_free(ptr >>> 0, 1));
const RateLimiterFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_ratelimiter_free(ptr >>> 0, 1));
const TokenBucketFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_tokenbucket_free(ptr >>> 0, 1));

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
        module_or_path = new URL('musclemap_ratelimit_bg.wasm', import.meta.url);
    }
    const imports = __wbg_get_imports();

    if (typeof module_or_path === 'string' || (typeof Request === 'function' && module_or_path instanceof Request) || (typeof URL === 'function' && module_or_path instanceof URL)) {
        module_or_path = fetch(module_or_path);
    }

    const { instance, module } = await __wbg_load(await module_or_path, imports);

    return __wbg_finalize_init(instance, module);
}

export { initSync, __wbg_init as default };
