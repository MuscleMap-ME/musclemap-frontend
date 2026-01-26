/* @ts-self-types="./musclemap_crypto.d.ts" */

/**
 * Result of a hash operation
 */
export class HashResult {
    static __wrap(ptr) {
        ptr = ptr >>> 0;
        const obj = Object.create(HashResult.prototype);
        obj.__wbg_ptr = ptr;
        HashResultFinalization.register(obj, obj.__wbg_ptr, obj);
        return obj;
    }
    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        HashResultFinalization.unregister(this);
        return ptr;
    }
    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_hashresult_free(ptr, 0);
    }
    /**
     * Base64-encoded hash
     * @returns {string}
     */
    get base64() {
        let deferred1_0;
        let deferred1_1;
        try {
            const ret = wasm.__wbg_get_hashresult_base64(this.__wbg_ptr);
            deferred1_0 = ret[0];
            deferred1_1 = ret[1];
            return getStringFromWasm0(ret[0], ret[1]);
        } finally {
            wasm.__wbindgen_free(deferred1_0, deferred1_1, 1);
        }
    }
    /**
     * Hex-encoded hash
     * @returns {string}
     */
    get hex() {
        let deferred1_0;
        let deferred1_1;
        try {
            const ret = wasm.__wbg_get_hashresult_hex(this.__wbg_ptr);
            deferred1_0 = ret[0];
            deferred1_1 = ret[1];
            return getStringFromWasm0(ret[0], ret[1]);
        } finally {
            wasm.__wbindgen_free(deferred1_0, deferred1_1, 1);
        }
    }
    /**
     * Get the raw bytes
     * @returns {Uint8Array}
     */
    get bytes() {
        const ret = wasm.hashresult_bytes(this.__wbg_ptr);
        var v1 = getArrayU8FromWasm0(ret[0], ret[1]).slice();
        wasm.__wbindgen_free(ret[0], ret[1] * 1, 1);
        return v1;
    }
    /**
     * Base64-encoded hash
     * @param {string} arg0
     */
    set base64(arg0) {
        const ptr0 = passStringToWasm0(arg0, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        wasm.__wbg_set_hashresult_base64(this.__wbg_ptr, ptr0, len0);
    }
    /**
     * Hex-encoded hash
     * @param {string} arg0
     */
    set hex(arg0) {
        const ptr0 = passStringToWasm0(arg0, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        wasm.__wbg_set_hashresult_hex(this.__wbg_ptr, ptr0, len0);
    }
}
if (Symbol.dispose) HashResult.prototype[Symbol.dispose] = HashResult.prototype.free;

/**
 * HMAC result
 */
export class HmacResult {
    static __wrap(ptr) {
        ptr = ptr >>> 0;
        const obj = Object.create(HmacResult.prototype);
        obj.__wbg_ptr = ptr;
        HmacResultFinalization.register(obj, obj.__wbg_ptr, obj);
        return obj;
    }
    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        HmacResultFinalization.unregister(this);
        return ptr;
    }
    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_hmacresult_free(ptr, 0);
    }
    /**
     * Base64-encoded HMAC
     * @returns {string}
     */
    get base64() {
        let deferred1_0;
        let deferred1_1;
        try {
            const ret = wasm.__wbg_get_hmacresult_base64(this.__wbg_ptr);
            deferred1_0 = ret[0];
            deferred1_1 = ret[1];
            return getStringFromWasm0(ret[0], ret[1]);
        } finally {
            wasm.__wbindgen_free(deferred1_0, deferred1_1, 1);
        }
    }
    /**
     * Hex-encoded HMAC
     * @returns {string}
     */
    get hex() {
        let deferred1_0;
        let deferred1_1;
        try {
            const ret = wasm.__wbg_get_hmacresult_hex(this.__wbg_ptr);
            deferred1_0 = ret[0];
            deferred1_1 = ret[1];
            return getStringFromWasm0(ret[0], ret[1]);
        } finally {
            wasm.__wbindgen_free(deferred1_0, deferred1_1, 1);
        }
    }
    /**
     * Whether HMAC generation was successful
     * @returns {boolean}
     */
    get success() {
        const ret = wasm.__wbg_get_hmacresult_success(this.__wbg_ptr);
        return ret !== 0;
    }
    /**
     * Base64-encoded HMAC
     * @param {string} arg0
     */
    set base64(arg0) {
        const ptr0 = passStringToWasm0(arg0, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        wasm.__wbg_set_hashresult_base64(this.__wbg_ptr, ptr0, len0);
    }
    /**
     * Hex-encoded HMAC
     * @param {string} arg0
     */
    set hex(arg0) {
        const ptr0 = passStringToWasm0(arg0, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        wasm.__wbg_set_hashresult_hex(this.__wbg_ptr, ptr0, len0);
    }
    /**
     * Whether HMAC generation was successful
     * @param {boolean} arg0
     */
    set success(arg0) {
        wasm.__wbg_set_hmacresult_success(this.__wbg_ptr, arg0);
    }
}
if (Symbol.dispose) HmacResult.prototype[Symbol.dispose] = HmacResult.prototype.free;

/**
 * Ed25519 key pair
 */
export class KeyPair {
    static __wrap(ptr) {
        ptr = ptr >>> 0;
        const obj = Object.create(KeyPair.prototype);
        obj.__wbg_ptr = ptr;
        KeyPairFinalization.register(obj, obj.__wbg_ptr, obj);
        return obj;
    }
    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        KeyPairFinalization.unregister(this);
        return ptr;
    }
    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_keypair_free(ptr, 0);
    }
    /**
     * Public key fingerprint (SHA-256 of public key, hex)
     * @returns {string}
     */
    get fingerprint() {
        let deferred1_0;
        let deferred1_1;
        try {
            const ret = wasm.__wbg_get_keypair_fingerprint(this.__wbg_ptr);
            deferred1_0 = ret[0];
            deferred1_1 = ret[1];
            return getStringFromWasm0(ret[0], ret[1]);
        } finally {
            wasm.__wbindgen_free(deferred1_0, deferred1_1, 1);
        }
    }
    /**
     * Private key (Base64) - KEEP SECRET
     * @returns {string}
     */
    get private_key() {
        let deferred1_0;
        let deferred1_1;
        try {
            const ret = wasm.__wbg_get_keypair_private_key(this.__wbg_ptr);
            deferred1_0 = ret[0];
            deferred1_1 = ret[1];
            return getStringFromWasm0(ret[0], ret[1]);
        } finally {
            wasm.__wbindgen_free(deferred1_0, deferred1_1, 1);
        }
    }
    /**
     * Public key (Base64)
     * @returns {string}
     */
    get public_key() {
        let deferred1_0;
        let deferred1_1;
        try {
            const ret = wasm.__wbg_get_keypair_public_key(this.__wbg_ptr);
            deferred1_0 = ret[0];
            deferred1_1 = ret[1];
            return getStringFromWasm0(ret[0], ret[1]);
        } finally {
            wasm.__wbindgen_free(deferred1_0, deferred1_1, 1);
        }
    }
    /**
     * Public key fingerprint (SHA-256 of public key, hex)
     * @param {string} arg0
     */
    set fingerprint(arg0) {
        const ptr0 = passStringToWasm0(arg0, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        wasm.__wbg_set_keypair_fingerprint(this.__wbg_ptr, ptr0, len0);
    }
    /**
     * Private key (Base64) - KEEP SECRET
     * @param {string} arg0
     */
    set private_key(arg0) {
        const ptr0 = passStringToWasm0(arg0, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        wasm.__wbg_set_hashresult_base64(this.__wbg_ptr, ptr0, len0);
    }
    /**
     * Public key (Base64)
     * @param {string} arg0
     */
    set public_key(arg0) {
        const ptr0 = passStringToWasm0(arg0, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        wasm.__wbg_set_hashresult_hex(this.__wbg_ptr, ptr0, len0);
    }
}
if (Symbol.dispose) KeyPair.prototype[Symbol.dispose] = KeyPair.prototype.free;

/**
 * Result of a signature operation
 */
export class SignatureResult {
    static __wrap(ptr) {
        ptr = ptr >>> 0;
        const obj = Object.create(SignatureResult.prototype);
        obj.__wbg_ptr = ptr;
        SignatureResultFinalization.register(obj, obj.__wbg_ptr, obj);
        return obj;
    }
    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        SignatureResultFinalization.unregister(this);
        return ptr;
    }
    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_signatureresult_free(ptr, 0);
    }
    /**
     * Hex-encoded signature
     * @returns {string}
     */
    get signature_hex() {
        let deferred1_0;
        let deferred1_1;
        try {
            const ret = wasm.__wbg_get_signatureresult_signature_hex(this.__wbg_ptr);
            deferred1_0 = ret[0];
            deferred1_1 = ret[1];
            return getStringFromWasm0(ret[0], ret[1]);
        } finally {
            wasm.__wbindgen_free(deferred1_0, deferred1_1, 1);
        }
    }
    /**
     * Base64-encoded signature
     * @returns {string}
     */
    get signature() {
        let deferred1_0;
        let deferred1_1;
        try {
            const ret = wasm.__wbg_get_signatureresult_signature(this.__wbg_ptr);
            deferred1_0 = ret[0];
            deferred1_1 = ret[1];
            return getStringFromWasm0(ret[0], ret[1]);
        } finally {
            wasm.__wbindgen_free(deferred1_0, deferred1_1, 1);
        }
    }
    /**
     * Whether signing was successful
     * @returns {boolean}
     */
    get success() {
        const ret = wasm.__wbg_get_hmacresult_success(this.__wbg_ptr);
        return ret !== 0;
    }
    /**
     * Hex-encoded signature
     * @param {string} arg0
     */
    set signature_hex(arg0) {
        const ptr0 = passStringToWasm0(arg0, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        wasm.__wbg_set_hashresult_base64(this.__wbg_ptr, ptr0, len0);
    }
    /**
     * Base64-encoded signature
     * @param {string} arg0
     */
    set signature(arg0) {
        const ptr0 = passStringToWasm0(arg0, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        wasm.__wbg_set_hashresult_hex(this.__wbg_ptr, ptr0, len0);
    }
    /**
     * Whether signing was successful
     * @param {boolean} arg0
     */
    set success(arg0) {
        wasm.__wbg_set_hmacresult_success(this.__wbg_ptr, arg0);
    }
}
if (Symbol.dispose) SignatureResult.prototype[Symbol.dispose] = SignatureResult.prototype.free;

/**
 * Result of signature verification
 */
export class VerifyResult {
    static __wrap(ptr) {
        ptr = ptr >>> 0;
        const obj = Object.create(VerifyResult.prototype);
        obj.__wbg_ptr = ptr;
        VerifyResultFinalization.register(obj, obj.__wbg_ptr, obj);
        return obj;
    }
    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        VerifyResultFinalization.unregister(this);
        return ptr;
    }
    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_verifyresult_free(ptr, 0);
    }
    /**
     * Error message if invalid
     * @returns {string | undefined}
     */
    get error() {
        const ret = wasm.__wbg_get_verifyresult_error(this.__wbg_ptr);
        let v1;
        if (ret[0] !== 0) {
            v1 = getStringFromWasm0(ret[0], ret[1]).slice();
            wasm.__wbindgen_free(ret[0], ret[1] * 1, 1);
        }
        return v1;
    }
    /**
     * Whether the signature is valid
     * @returns {boolean}
     */
    get valid() {
        const ret = wasm.__wbg_get_verifyresult_valid(this.__wbg_ptr);
        return ret !== 0;
    }
    /**
     * Error message if invalid
     * @param {string | null} [arg0]
     */
    set error(arg0) {
        var ptr0 = isLikeNone(arg0) ? 0 : passStringToWasm0(arg0, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        var len0 = WASM_VECTOR_LEN;
        wasm.__wbg_set_verifyresult_error(this.__wbg_ptr, ptr0, len0);
    }
    /**
     * Whether the signature is valid
     * @param {boolean} arg0
     */
    set valid(arg0) {
        wasm.__wbg_set_verifyresult_valid(this.__wbg_ptr, arg0);
    }
}
if (Symbol.dispose) VerifyResult.prototype[Symbol.dispose] = VerifyResult.prototype.free;

/**
 * Decode Base64 to bytes
 *
 * # Arguments
 * * `encoded` - Base64-encoded string
 *
 * # Returns
 * Decoded bytes or empty array on error
 * @param {string} encoded
 * @returns {Uint8Array}
 */
export function base64_decode(encoded) {
    const ptr0 = passStringToWasm0(encoded, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
    const len0 = WASM_VECTOR_LEN;
    const ret = wasm.base64_decode(ptr0, len0);
    var v2 = getArrayU8FromWasm0(ret[0], ret[1]).slice();
    wasm.__wbindgen_free(ret[0], ret[1] * 1, 1);
    return v2;
}

/**
 * Decode Base64 to string
 *
 * # Arguments
 * * `encoded` - Base64-encoded string
 *
 * # Returns
 * Decoded string or empty string on error
 * @param {string} encoded
 * @returns {string}
 */
export function base64_decode_string(encoded) {
    let deferred2_0;
    let deferred2_1;
    try {
        const ptr0 = passStringToWasm0(encoded, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.base64_decode_string(ptr0, len0);
        deferred2_0 = ret[0];
        deferred2_1 = ret[1];
        return getStringFromWasm0(ret[0], ret[1]);
    } finally {
        wasm.__wbindgen_free(deferred2_0, deferred2_1, 1);
    }
}

/**
 * Decode URL-safe Base64 to bytes
 *
 * # Arguments
 * * `encoded` - URL-safe Base64-encoded string
 *
 * # Returns
 * Decoded bytes or empty array on error
 * @param {string} encoded
 * @returns {Uint8Array}
 */
export function base64_decode_url(encoded) {
    const ptr0 = passStringToWasm0(encoded, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
    const len0 = WASM_VECTOR_LEN;
    const ret = wasm.base64_decode_url(ptr0, len0);
    var v2 = getArrayU8FromWasm0(ret[0], ret[1]).slice();
    wasm.__wbindgen_free(ret[0], ret[1] * 1, 1);
    return v2;
}

/**
 * Encode bytes to Base64
 *
 * # Arguments
 * * `data` - Bytes to encode
 *
 * # Returns
 * Base64-encoded string
 * @param {Uint8Array} data
 * @returns {string}
 */
export function base64_encode(data) {
    let deferred2_0;
    let deferred2_1;
    try {
        const ptr0 = passArray8ToWasm0(data, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.base64_encode(ptr0, len0);
        deferred2_0 = ret[0];
        deferred2_1 = ret[1];
        return getStringFromWasm0(ret[0], ret[1]);
    } finally {
        wasm.__wbindgen_free(deferred2_0, deferred2_1, 1);
    }
}

/**
 * Encode string to Base64
 *
 * # Arguments
 * * `data` - String to encode
 *
 * # Returns
 * Base64-encoded string
 * @param {string} data
 * @returns {string}
 */
export function base64_encode_string(data) {
    let deferred2_0;
    let deferred2_1;
    try {
        const ptr0 = passStringToWasm0(data, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.base64_encode_string(ptr0, len0);
        deferred2_0 = ret[0];
        deferred2_1 = ret[1];
        return getStringFromWasm0(ret[0], ret[1]);
    } finally {
        wasm.__wbindgen_free(deferred2_0, deferred2_1, 1);
    }
}

/**
 * Encode bytes to URL-safe Base64
 *
 * # Arguments
 * * `data` - Bytes to encode
 *
 * # Returns
 * URL-safe Base64-encoded string (no padding)
 * @param {Uint8Array} data
 * @returns {string}
 */
export function base64_encode_url(data) {
    let deferred2_0;
    let deferred2_1;
    try {
        const ptr0 = passArray8ToWasm0(data, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.base64_encode_url(ptr0, len0);
        deferred2_0 = ret[0];
        deferred2_1 = ret[1];
        return getStringFromWasm0(ret[0], ret[1]);
    } finally {
        wasm.__wbindgen_free(deferred2_0, deferred2_1, 1);
    }
}

/**
 * Constant-time comparison of two strings
 *
 * # Arguments
 * * `a` - First string
 * * `b` - Second string
 *
 * # Returns
 * true if strings are equal
 * @param {string} a
 * @param {string} b
 * @returns {boolean}
 */
export function constant_time_compare(a, b) {
    const ptr0 = passStringToWasm0(a, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
    const len0 = WASM_VECTOR_LEN;
    const ptr1 = passStringToWasm0(b, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
    const len1 = WASM_VECTOR_LEN;
    const ret = wasm.constant_time_compare(ptr0, len0, ptr1, len1);
    return ret !== 0;
}

/**
 * Derive a key from password using simple PBKDF2-like iteration
 * Note: For production, use a proper PBKDF2 or Argon2 library
 *
 * # Arguments
 * * `password` - Password to derive key from
 * * `salt` - Salt value
 * * `iterations` - Number of iterations
 *
 * # Returns
 * Derived key as hex string
 * @param {string} password
 * @param {string} salt
 * @param {number} iterations
 * @returns {string}
 */
export function derive_key_simple(password, salt, iterations) {
    let deferred3_0;
    let deferred3_1;
    try {
        const ptr0 = passStringToWasm0(password, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ptr1 = passStringToWasm0(salt, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len1 = WASM_VECTOR_LEN;
        const ret = wasm.derive_key_simple(ptr0, len0, ptr1, len1, iterations);
        deferred3_0 = ret[0];
        deferred3_1 = ret[1];
        return getStringFromWasm0(ret[0], ret[1]);
    } finally {
        wasm.__wbindgen_free(deferred3_0, deferred3_1, 1);
    }
}

/**
 * Generate a new Ed25519 key pair
 *
 * # Returns
 * KeyPair with public key, private key, and fingerprint
 * @returns {KeyPair}
 */
export function generate_keypair() {
    const ret = wasm.generate_keypair();
    return KeyPair.__wrap(ret);
}

/**
 * Get the fingerprint (SHA-256 hash) of a public key
 *
 * # Arguments
 * * `public_key_base64` - Base64-encoded public key
 *
 * # Returns
 * Hex-encoded fingerprint or empty string on error
 * @param {string} public_key_base64
 * @returns {string}
 */
export function get_key_fingerprint(public_key_base64) {
    let deferred2_0;
    let deferred2_1;
    try {
        const ptr0 = passStringToWasm0(public_key_base64, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.get_key_fingerprint(ptr0, len0);
        deferred2_0 = ret[0];
        deferred2_1 = ret[1];
        return getStringFromWasm0(ret[0], ret[1]);
    } finally {
        wasm.__wbindgen_free(deferred2_0, deferred2_1, 1);
    }
}

/**
 * Decode hex string to bytes
 *
 * # Arguments
 * * `encoded` - Hex-encoded string
 *
 * # Returns
 * Decoded bytes or empty array on error
 * @param {string} encoded
 * @returns {Uint8Array}
 */
export function hex_decode(encoded) {
    const ptr0 = passStringToWasm0(encoded, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
    const len0 = WASM_VECTOR_LEN;
    const ret = wasm.hex_decode(ptr0, len0);
    var v2 = getArrayU8FromWasm0(ret[0], ret[1]).slice();
    wasm.__wbindgen_free(ret[0], ret[1] * 1, 1);
    return v2;
}

/**
 * Encode bytes to hex string
 *
 * # Arguments
 * * `data` - Bytes to encode
 *
 * # Returns
 * Hex-encoded string
 * @param {Uint8Array} data
 * @returns {string}
 */
export function hex_encode(data) {
    let deferred2_0;
    let deferred2_1;
    try {
        const ptr0 = passArray8ToWasm0(data, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.hex_encode(ptr0, len0);
        deferred2_0 = ret[0];
        deferred2_1 = ret[1];
        return getStringFromWasm0(ret[0], ret[1]);
    } finally {
        wasm.__wbindgen_free(deferred2_0, deferred2_1, 1);
    }
}

/**
 * Generate HMAC-SHA256
 *
 * # Arguments
 * * `key` - Secret key
 * * `message` - Message to authenticate
 *
 * # Returns
 * HmacResult with hex and base64 encodings
 * @param {string} key
 * @param {string} message
 * @returns {HmacResult}
 */
export function hmac_sha256(key, message) {
    const ptr0 = passStringToWasm0(key, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
    const len0 = WASM_VECTOR_LEN;
    const ptr1 = passStringToWasm0(message, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
    const len1 = WASM_VECTOR_LEN;
    const ret = wasm.hmac_sha256(ptr0, len0, ptr1, len1);
    return HmacResult.__wrap(ret);
}

/**
 * Verify HMAC-SHA256
 *
 * # Arguments
 * * `key` - Secret key
 * * `message` - Original message
 * * `expected_hex` - Expected HMAC in hex
 *
 * # Returns
 * true if HMAC matches
 * @param {string} key
 * @param {string} message
 * @param {string} expected_hex
 * @returns {boolean}
 */
export function hmac_verify(key, message, expected_hex) {
    const ptr0 = passStringToWasm0(key, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
    const len0 = WASM_VECTOR_LEN;
    const ptr1 = passStringToWasm0(message, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
    const len1 = WASM_VECTOR_LEN;
    const ptr2 = passStringToWasm0(expected_hex, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
    const len2 = WASM_VECTOR_LEN;
    const ret = wasm.hmac_verify(ptr0, len0, ptr1, len1, ptr2, len2);
    return ret !== 0;
}

/**
 * Generate a random Base64 token
 *
 * # Arguments
 * * `byte_length` - Number of random bytes
 *
 * # Returns
 * Random URL-safe Base64 string
 * @param {number} byte_length
 * @returns {string}
 */
export function random_base64_token(byte_length) {
    let deferred1_0;
    let deferred1_1;
    try {
        const ret = wasm.random_base64_token(byte_length);
        deferred1_0 = ret[0];
        deferred1_1 = ret[1];
        return getStringFromWasm0(ret[0], ret[1]);
    } finally {
        wasm.__wbindgen_free(deferred1_0, deferred1_1, 1);
    }
}

/**
 * Generate random bytes
 *
 * # Arguments
 * * `length` - Number of random bytes to generate
 *
 * # Returns
 * Random bytes
 * @param {number} length
 * @returns {Uint8Array}
 */
export function random_bytes(length) {
    const ret = wasm.random_bytes(length);
    var v1 = getArrayU8FromWasm0(ret[0], ret[1]).slice();
    wasm.__wbindgen_free(ret[0], ret[1] * 1, 1);
    return v1;
}

/**
 * Generate a random hex token
 *
 * # Arguments
 * * `byte_length` - Number of random bytes (output will be 2x this in hex)
 *
 * # Returns
 * Random hex string
 * @param {number} byte_length
 * @returns {string}
 */
export function random_hex_token(byte_length) {
    let deferred1_0;
    let deferred1_1;
    try {
        const ret = wasm.random_hex_token(byte_length);
        deferred1_0 = ret[0];
        deferred1_1 = ret[1];
        return getStringFromWasm0(ret[0], ret[1]);
    } finally {
        wasm.__wbindgen_free(deferred1_0, deferred1_1, 1);
    }
}

/**
 * Compute multiple SHA-256 hashes in batch
 *
 * # Arguments
 * * `data_array` - Array of strings to hash
 *
 * # Returns
 * Array of hex-encoded hashes
 * @param {string[]} data_array
 * @returns {string[]}
 */
export function sha256_batch(data_array) {
    const ptr0 = passArrayJsValueToWasm0(data_array, wasm.__wbindgen_malloc);
    const len0 = WASM_VECTOR_LEN;
    const ret = wasm.sha256_batch(ptr0, len0);
    var v2 = getArrayJsValueFromWasm0(ret[0], ret[1]).slice();
    wasm.__wbindgen_free(ret[0], ret[1] * 4, 4);
    return v2;
}

/**
 * Compute SHA-256 hash of a string
 *
 * # Arguments
 * * `data` - String to hash
 *
 * # Returns
 * HashResult with hex and base64 encodings
 * @param {string} data
 * @returns {HashResult}
 */
export function sha256_hash(data) {
    const ptr0 = passStringToWasm0(data, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
    const len0 = WASM_VECTOR_LEN;
    const ret = wasm.sha256_hash(ptr0, len0);
    return HashResult.__wrap(ret);
}

/**
 * Compute SHA-256 hash of raw bytes
 *
 * # Arguments
 * * `data` - Bytes to hash
 *
 * # Returns
 * HashResult with hex and base64 encodings
 * @param {Uint8Array} data
 * @returns {HashResult}
 */
export function sha256_hash_bytes(data) {
    const ptr0 = passArray8ToWasm0(data, wasm.__wbindgen_malloc);
    const len0 = WASM_VECTOR_LEN;
    const ret = wasm.sha256_hash_bytes(ptr0, len0);
    return HashResult.__wrap(ret);
}

/**
 * Compute SHA-256 hash and return only hex string
 *
 * # Arguments
 * * `data` - String to hash
 *
 * # Returns
 * Hex-encoded hash string
 * @param {string} data
 * @returns {string}
 */
export function sha256_hex(data) {
    let deferred2_0;
    let deferred2_1;
    try {
        const ptr0 = passStringToWasm0(data, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.sha256_hex(ptr0, len0);
        deferred2_0 = ret[0];
        deferred2_1 = ret[1];
        return getStringFromWasm0(ret[0], ret[1]);
    } finally {
        wasm.__wbindgen_free(deferred2_0, deferred2_1, 1);
    }
}

/**
 * Sign a message with Ed25519 private key
 *
 * # Arguments
 * * `private_key_base64` - Base64-encoded private key
 * * `message` - Message to sign
 *
 * # Returns
 * SignatureResult with signature
 * @param {string} private_key_base64
 * @param {string} message
 * @returns {SignatureResult}
 */
export function sign_message(private_key_base64, message) {
    const ptr0 = passStringToWasm0(private_key_base64, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
    const len0 = WASM_VECTOR_LEN;
    const ptr1 = passStringToWasm0(message, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
    const len1 = WASM_VECTOR_LEN;
    const ret = wasm.sign_message(ptr0, len0, ptr1, len1);
    return SignatureResult.__wrap(ret);
}

/**
 * Verify an Ed25519 signature
 *
 * # Arguments
 * * `public_key_base64` - Base64-encoded public key
 * * `message` - Original message
 * * `signature_base64` - Base64-encoded signature
 *
 * # Returns
 * VerifyResult indicating if signature is valid
 * @param {string} public_key_base64
 * @param {string} message
 * @param {string} signature_base64
 * @returns {VerifyResult}
 */
export function verify_signature(public_key_base64, message, signature_base64) {
    const ptr0 = passStringToWasm0(public_key_base64, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
    const len0 = WASM_VECTOR_LEN;
    const ptr1 = passStringToWasm0(message, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
    const len1 = WASM_VECTOR_LEN;
    const ptr2 = passStringToWasm0(signature_base64, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
    const len2 = WASM_VECTOR_LEN;
    const ret = wasm.verify_signature(ptr0, len0, ptr1, len1, ptr2, len2);
    return VerifyResult.__wrap(ret);
}

function __wbg_get_imports() {
    const import0 = {
        __proto__: null,
        __wbg___wbindgen_is_function_0095a73b8b156f76: function(arg0) {
            const ret = typeof(arg0) === 'function';
            return ret;
        },
        __wbg___wbindgen_is_object_5ae8e5880f2c1fbd: function(arg0) {
            const val = arg0;
            const ret = typeof(val) === 'object' && val !== null;
            return ret;
        },
        __wbg___wbindgen_is_string_cd444516edc5b180: function(arg0) {
            const ret = typeof(arg0) === 'string';
            return ret;
        },
        __wbg___wbindgen_is_undefined_9e4d92534c42d778: function(arg0) {
            const ret = arg0 === undefined;
            return ret;
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
        __wbg_call_389efe28435a9388: function() { return handleError(function (arg0, arg1) {
            const ret = arg0.call(arg1);
            return ret;
        }, arguments); },
        __wbg_call_4708e0c13bdc8e95: function() { return handleError(function (arg0, arg1, arg2) {
            const ret = arg0.call(arg1, arg2);
            return ret;
        }, arguments); },
        __wbg_crypto_86f2631e91b51511: function(arg0) {
            const ret = arg0.crypto;
            return ret;
        },
        __wbg_getRandomValues_b3f15fcbfabb0f8b: function() { return handleError(function (arg0, arg1) {
            arg0.getRandomValues(arg1);
        }, arguments); },
        __wbg_length_32ed9a279acd054c: function(arg0) {
            const ret = arg0.length;
            return ret;
        },
        __wbg_msCrypto_d562bbe83e0d4b91: function(arg0) {
            const ret = arg0.msCrypto;
            return ret;
        },
        __wbg_new_no_args_1c7c842f08d00ebb: function(arg0, arg1) {
            const ret = new Function(getStringFromWasm0(arg0, arg1));
            return ret;
        },
        __wbg_new_with_length_a2c39cbe88fd8ff1: function(arg0) {
            const ret = new Uint8Array(arg0 >>> 0);
            return ret;
        },
        __wbg_node_e1f24f89a7336c2e: function(arg0) {
            const ret = arg0.node;
            return ret;
        },
        __wbg_process_3975fd6c72f520aa: function(arg0) {
            const ret = arg0.process;
            return ret;
        },
        __wbg_prototypesetcall_bdcdcc5842e4d77d: function(arg0, arg1, arg2) {
            Uint8Array.prototype.set.call(getArrayU8FromWasm0(arg0, arg1), arg2);
        },
        __wbg_randomFillSync_f8c153b79f285817: function() { return handleError(function (arg0, arg1) {
            arg0.randomFillSync(arg1);
        }, arguments); },
        __wbg_require_b74f47fc2d022fd6: function() { return handleError(function () {
            const ret = module.require;
            return ret;
        }, arguments); },
        __wbg_static_accessor_GLOBAL_12837167ad935116: function() {
            const ret = typeof global === 'undefined' ? null : global;
            return isLikeNone(ret) ? 0 : addToExternrefTable0(ret);
        },
        __wbg_static_accessor_GLOBAL_THIS_e628e89ab3b1c95f: function() {
            const ret = typeof globalThis === 'undefined' ? null : globalThis;
            return isLikeNone(ret) ? 0 : addToExternrefTable0(ret);
        },
        __wbg_static_accessor_SELF_a621d3dfbb60d0ce: function() {
            const ret = typeof self === 'undefined' ? null : self;
            return isLikeNone(ret) ? 0 : addToExternrefTable0(ret);
        },
        __wbg_static_accessor_WINDOW_f8727f0cf888e0bd: function() {
            const ret = typeof window === 'undefined' ? null : window;
            return isLikeNone(ret) ? 0 : addToExternrefTable0(ret);
        },
        __wbg_subarray_a96e1fef17ed23cb: function(arg0, arg1, arg2) {
            const ret = arg0.subarray(arg1 >>> 0, arg2 >>> 0);
            return ret;
        },
        __wbg_versions_4e31226f5e8dc909: function(arg0) {
            const ret = arg0.versions;
            return ret;
        },
        __wbindgen_cast_0000000000000001: function(arg0, arg1) {
            // Cast intrinsic for `Ref(Slice(U8)) -> NamedExternref("Uint8Array")`.
            const ret = getArrayU8FromWasm0(arg0, arg1);
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
        "./musclemap_crypto_bg.js": import0,
    };
}

const HashResultFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_hashresult_free(ptr >>> 0, 1));
const HmacResultFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_hmacresult_free(ptr >>> 0, 1));
const KeyPairFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_keypair_free(ptr >>> 0, 1));
const SignatureResultFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_signatureresult_free(ptr >>> 0, 1));
const VerifyResultFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_verifyresult_free(ptr >>> 0, 1));

function addToExternrefTable0(obj) {
    const idx = wasm.__externref_table_alloc();
    wasm.__wbindgen_externrefs.set(idx, obj);
    return idx;
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

function handleError(f, args) {
    try {
        return f.apply(this, args);
    } catch (e) {
        const idx = addToExternrefTable0(e);
        wasm.__wbindgen_exn_store(idx);
    }
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
        module_or_path = new URL('musclemap_crypto_bg.wasm', import.meta.url);
    }
    const imports = __wbg_get_imports();

    if (typeof module_or_path === 'string' || (typeof Request === 'function' && module_or_path instanceof Request) || (typeof URL === 'function' && module_or_path instanceof URL)) {
        module_or_path = fetch(module_or_path);
    }

    const { instance, module } = await __wbg_load(await module_or_path, imports);

    return __wbg_finalize_init(instance, module);
}

export { initSync, __wbg_init as default };
