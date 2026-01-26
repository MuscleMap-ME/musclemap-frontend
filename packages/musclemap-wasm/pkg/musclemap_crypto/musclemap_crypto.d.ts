/* tslint:disable */
/* eslint-disable */

/**
 * Result of a hash operation
 */
export class HashResult {
    private constructor();
    free(): void;
    [Symbol.dispose](): void;
    /**
     * Base64-encoded hash
     */
    base64: string;
    /**
     * Hex-encoded hash
     */
    hex: string;
    /**
     * Get the raw bytes
     */
    readonly bytes: Uint8Array;
}

/**
 * HMAC result
 */
export class HmacResult {
    private constructor();
    free(): void;
    [Symbol.dispose](): void;
    /**
     * Base64-encoded HMAC
     */
    base64: string;
    /**
     * Hex-encoded HMAC
     */
    hex: string;
    /**
     * Whether HMAC generation was successful
     */
    success: boolean;
}

/**
 * Ed25519 key pair
 */
export class KeyPair {
    private constructor();
    free(): void;
    [Symbol.dispose](): void;
    /**
     * Public key fingerprint (SHA-256 of public key, hex)
     */
    fingerprint: string;
    /**
     * Private key (Base64) - KEEP SECRET
     */
    private_key: string;
    /**
     * Public key (Base64)
     */
    public_key: string;
}

/**
 * Result of a signature operation
 */
export class SignatureResult {
    private constructor();
    free(): void;
    [Symbol.dispose](): void;
    /**
     * Hex-encoded signature
     */
    signature_hex: string;
    /**
     * Base64-encoded signature
     */
    signature: string;
    /**
     * Whether signing was successful
     */
    success: boolean;
}

/**
 * Result of signature verification
 */
export class VerifyResult {
    private constructor();
    free(): void;
    [Symbol.dispose](): void;
    /**
     * Error message if invalid
     */
    get error(): string | undefined;
    /**
     * Error message if invalid
     */
    set error(value: string | null | undefined);
    /**
     * Whether the signature is valid
     */
    valid: boolean;
}

/**
 * Decode Base64 to bytes
 *
 * # Arguments
 * * `encoded` - Base64-encoded string
 *
 * # Returns
 * Decoded bytes or empty array on error
 */
export function base64_decode(encoded: string): Uint8Array;

/**
 * Decode Base64 to string
 *
 * # Arguments
 * * `encoded` - Base64-encoded string
 *
 * # Returns
 * Decoded string or empty string on error
 */
export function base64_decode_string(encoded: string): string;

/**
 * Decode URL-safe Base64 to bytes
 *
 * # Arguments
 * * `encoded` - URL-safe Base64-encoded string
 *
 * # Returns
 * Decoded bytes or empty array on error
 */
export function base64_decode_url(encoded: string): Uint8Array;

/**
 * Encode bytes to Base64
 *
 * # Arguments
 * * `data` - Bytes to encode
 *
 * # Returns
 * Base64-encoded string
 */
export function base64_encode(data: Uint8Array): string;

/**
 * Encode string to Base64
 *
 * # Arguments
 * * `data` - String to encode
 *
 * # Returns
 * Base64-encoded string
 */
export function base64_encode_string(data: string): string;

/**
 * Encode bytes to URL-safe Base64
 *
 * # Arguments
 * * `data` - Bytes to encode
 *
 * # Returns
 * URL-safe Base64-encoded string (no padding)
 */
export function base64_encode_url(data: Uint8Array): string;

/**
 * Constant-time comparison of two strings
 *
 * # Arguments
 * * `a` - First string
 * * `b` - Second string
 *
 * # Returns
 * true if strings are equal
 */
export function constant_time_compare(a: string, b: string): boolean;

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
 */
export function derive_key_simple(password: string, salt: string, iterations: number): string;

/**
 * Generate a new Ed25519 key pair
 *
 * # Returns
 * KeyPair with public key, private key, and fingerprint
 */
export function generate_keypair(): KeyPair;

/**
 * Get the fingerprint (SHA-256 hash) of a public key
 *
 * # Arguments
 * * `public_key_base64` - Base64-encoded public key
 *
 * # Returns
 * Hex-encoded fingerprint or empty string on error
 */
export function get_key_fingerprint(public_key_base64: string): string;

/**
 * Decode hex string to bytes
 *
 * # Arguments
 * * `encoded` - Hex-encoded string
 *
 * # Returns
 * Decoded bytes or empty array on error
 */
export function hex_decode(encoded: string): Uint8Array;

/**
 * Encode bytes to hex string
 *
 * # Arguments
 * * `data` - Bytes to encode
 *
 * # Returns
 * Hex-encoded string
 */
export function hex_encode(data: Uint8Array): string;

/**
 * Generate HMAC-SHA256
 *
 * # Arguments
 * * `key` - Secret key
 * * `message` - Message to authenticate
 *
 * # Returns
 * HmacResult with hex and base64 encodings
 */
export function hmac_sha256(key: string, message: string): HmacResult;

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
 */
export function hmac_verify(key: string, message: string, expected_hex: string): boolean;

/**
 * Generate a random Base64 token
 *
 * # Arguments
 * * `byte_length` - Number of random bytes
 *
 * # Returns
 * Random URL-safe Base64 string
 */
export function random_base64_token(byte_length: number): string;

/**
 * Generate random bytes
 *
 * # Arguments
 * * `length` - Number of random bytes to generate
 *
 * # Returns
 * Random bytes
 */
export function random_bytes(length: number): Uint8Array;

/**
 * Generate a random hex token
 *
 * # Arguments
 * * `byte_length` - Number of random bytes (output will be 2x this in hex)
 *
 * # Returns
 * Random hex string
 */
export function random_hex_token(byte_length: number): string;

/**
 * Compute multiple SHA-256 hashes in batch
 *
 * # Arguments
 * * `data_array` - Array of strings to hash
 *
 * # Returns
 * Array of hex-encoded hashes
 */
export function sha256_batch(data_array: string[]): string[];

/**
 * Compute SHA-256 hash of a string
 *
 * # Arguments
 * * `data` - String to hash
 *
 * # Returns
 * HashResult with hex and base64 encodings
 */
export function sha256_hash(data: string): HashResult;

/**
 * Compute SHA-256 hash of raw bytes
 *
 * # Arguments
 * * `data` - Bytes to hash
 *
 * # Returns
 * HashResult with hex and base64 encodings
 */
export function sha256_hash_bytes(data: Uint8Array): HashResult;

/**
 * Compute SHA-256 hash and return only hex string
 *
 * # Arguments
 * * `data` - String to hash
 *
 * # Returns
 * Hex-encoded hash string
 */
export function sha256_hex(data: string): string;

/**
 * Sign a message with Ed25519 private key
 *
 * # Arguments
 * * `private_key_base64` - Base64-encoded private key
 * * `message` - Message to sign
 *
 * # Returns
 * SignatureResult with signature
 */
export function sign_message(private_key_base64: string, message: string): SignatureResult;

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
 */
export function verify_signature(public_key_base64: string, message: string, signature_base64: string): VerifyResult;

export type InitInput = RequestInfo | URL | Response | BufferSource | WebAssembly.Module;

export interface InitOutput {
    readonly memory: WebAssembly.Memory;
    readonly __wbg_get_hashresult_base64: (a: number) => [number, number];
    readonly __wbg_get_hashresult_hex: (a: number) => [number, number];
    readonly __wbg_get_hmacresult_success: (a: number) => number;
    readonly __wbg_get_keypair_fingerprint: (a: number) => [number, number];
    readonly __wbg_get_verifyresult_error: (a: number) => [number, number];
    readonly __wbg_get_verifyresult_valid: (a: number) => number;
    readonly __wbg_hashresult_free: (a: number, b: number) => void;
    readonly __wbg_hmacresult_free: (a: number, b: number) => void;
    readonly __wbg_keypair_free: (a: number, b: number) => void;
    readonly __wbg_set_hashresult_base64: (a: number, b: number, c: number) => void;
    readonly __wbg_set_hashresult_hex: (a: number, b: number, c: number) => void;
    readonly __wbg_set_hmacresult_success: (a: number, b: number) => void;
    readonly __wbg_set_keypair_fingerprint: (a: number, b: number, c: number) => void;
    readonly __wbg_set_verifyresult_error: (a: number, b: number, c: number) => void;
    readonly __wbg_set_verifyresult_valid: (a: number, b: number) => void;
    readonly __wbg_verifyresult_free: (a: number, b: number) => void;
    readonly base64_decode: (a: number, b: number) => [number, number];
    readonly base64_decode_string: (a: number, b: number) => [number, number];
    readonly base64_decode_url: (a: number, b: number) => [number, number];
    readonly base64_encode: (a: number, b: number) => [number, number];
    readonly base64_encode_string: (a: number, b: number) => [number, number];
    readonly base64_encode_url: (a: number, b: number) => [number, number];
    readonly constant_time_compare: (a: number, b: number, c: number, d: number) => number;
    readonly derive_key_simple: (a: number, b: number, c: number, d: number, e: number) => [number, number];
    readonly generate_keypair: () => number;
    readonly get_key_fingerprint: (a: number, b: number) => [number, number];
    readonly hashresult_bytes: (a: number) => [number, number];
    readonly hex_decode: (a: number, b: number) => [number, number];
    readonly hex_encode: (a: number, b: number) => [number, number];
    readonly hmac_sha256: (a: number, b: number, c: number, d: number) => number;
    readonly hmac_verify: (a: number, b: number, c: number, d: number, e: number, f: number) => number;
    readonly random_base64_token: (a: number) => [number, number];
    readonly random_bytes: (a: number) => [number, number];
    readonly random_hex_token: (a: number) => [number, number];
    readonly sha256_batch: (a: number, b: number) => [number, number];
    readonly sha256_hash: (a: number, b: number) => number;
    readonly sha256_hash_bytes: (a: number, b: number) => number;
    readonly sign_message: (a: number, b: number, c: number, d: number) => number;
    readonly verify_signature: (a: number, b: number, c: number, d: number, e: number, f: number) => number;
    readonly __wbg_set_signatureresult_success: (a: number, b: number) => void;
    readonly __wbg_set_hmacresult_base64: (a: number, b: number, c: number) => void;
    readonly __wbg_set_hmacresult_hex: (a: number, b: number, c: number) => void;
    readonly __wbg_set_keypair_private_key: (a: number, b: number, c: number) => void;
    readonly __wbg_set_keypair_public_key: (a: number, b: number, c: number) => void;
    readonly __wbg_set_signatureresult_signature: (a: number, b: number, c: number) => void;
    readonly __wbg_set_signatureresult_signature_hex: (a: number, b: number, c: number) => void;
    readonly sha256_hex: (a: number, b: number) => [number, number];
    readonly __wbg_get_signatureresult_success: (a: number) => number;
    readonly __wbg_get_hmacresult_base64: (a: number) => [number, number];
    readonly __wbg_get_hmacresult_hex: (a: number) => [number, number];
    readonly __wbg_get_keypair_private_key: (a: number) => [number, number];
    readonly __wbg_get_keypair_public_key: (a: number) => [number, number];
    readonly __wbg_get_signatureresult_signature: (a: number) => [number, number];
    readonly __wbg_get_signatureresult_signature_hex: (a: number) => [number, number];
    readonly __wbg_signatureresult_free: (a: number, b: number) => void;
    readonly __wbindgen_malloc: (a: number, b: number) => number;
    readonly __wbindgen_realloc: (a: number, b: number, c: number, d: number) => number;
    readonly __wbindgen_exn_store: (a: number) => void;
    readonly __externref_table_alloc: () => number;
    readonly __wbindgen_externrefs: WebAssembly.Table;
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
