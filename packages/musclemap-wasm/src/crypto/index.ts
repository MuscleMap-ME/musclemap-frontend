/**
 * Cryptographic Operations
 * SHA-256, HMAC, Ed25519 signatures, encoding utilities
 */

let wasmModule: any = null;

export async function initCrypto(): Promise<void> {
  if (wasmModule !== null) return;

  try {
    const mod = await import('../../pkg/musclemap_crypto/musclemap_crypto.js');
    await mod.default?.();
    wasmModule = mod;
  } catch (e) {
    console.warn('[crypto] WASM module not available, using JS fallback');
    wasmModule = false;
  }
}

export interface HashResult {
  hex: string;
  base64: string;
  bytes: Uint8Array;
}

export interface KeyPair {
  publicKey: string;
  privateKey: string;
  fingerprint: string;
}

export interface SignatureResult {
  signature: string;
  signatureHex: string;
  success: boolean;
}

export interface VerifyResult {
  valid: boolean;
  error?: string;
}

export interface HmacResult {
  hex: string;
  base64: string;
  success: boolean;
}

// ============================================================================
// SHA-256 Hashing
// ============================================================================

/**
 * Compute SHA-256 hash of a string
 */
export function sha256(data: string): HashResult {
  if (wasmModule?.sha256_hash) {
    const result = wasmModule.sha256_hash(data);
    return {
      hex: result.hex,
      base64: result.base64,
      bytes: new Uint8Array(result.bytes),
    };
  }

  return sha256JS(data);
}

/**
 * Compute SHA-256 hash of bytes
 */
export function sha256Bytes(data: Uint8Array): HashResult {
  if (wasmModule?.sha256_hash_bytes) {
    const result = wasmModule.sha256_hash_bytes(data);
    return {
      hex: result.hex,
      base64: result.base64,
      bytes: new Uint8Array(result.bytes),
    };
  }

  return sha256BytesJS(data);
}

/**
 * Compute SHA-256 hash and return hex string only
 */
export function sha256Hex(data: string): string {
  if (wasmModule?.sha256_hex) {
    return wasmModule.sha256_hex(data);
  }

  return sha256JS(data).hex;
}

/**
 * Compute multiple SHA-256 hashes in batch
 */
export function sha256Batch(data: string[]): string[] {
  if (wasmModule?.sha256_batch) {
    return Array.from(wasmModule.sha256_batch(data));
  }

  return data.map((d) => sha256JS(d).hex);
}

// ============================================================================
// HMAC-SHA256
// ============================================================================

/**
 * Generate HMAC-SHA256
 */
export function hmacSha256(key: string, message: string): HmacResult {
  if (wasmModule?.hmac_sha256) {
    const result = wasmModule.hmac_sha256(key, message);
    return {
      hex: result.hex,
      base64: result.base64,
      success: result.success,
    };
  }

  return hmacSha256JS(key, message);
}

/**
 * Verify HMAC-SHA256
 */
export function hmacVerify(
  key: string,
  message: string,
  expectedHex: string
): boolean {
  if (wasmModule?.hmac_verify) {
    return wasmModule.hmac_verify(key, message, expectedHex);
  }

  const computed = hmacSha256JS(key, message);
  return constantTimeCompare(computed.hex, expectedHex);
}

// ============================================================================
// Ed25519 Digital Signatures
// ============================================================================

/**
 * Generate a new Ed25519 key pair
 */
export function generateKeypair(): KeyPair {
  if (wasmModule?.generate_keypair) {
    const result = wasmModule.generate_keypair();
    return {
      publicKey: result.public_key,
      privateKey: result.private_key,
      fingerprint: result.fingerprint,
    };
  }

  throw new Error(
    'Ed25519 key generation requires WASM module (Web Crypto API fallback not implemented)'
  );
}

/**
 * Sign a message with Ed25519 private key
 */
export function signMessage(
  privateKeyBase64: string,
  message: string
): SignatureResult {
  if (wasmModule?.sign_message) {
    const result = wasmModule.sign_message(privateKeyBase64, message);
    return {
      signature: result.signature,
      signatureHex: result.signature_hex,
      success: result.success,
    };
  }

  throw new Error(
    'Ed25519 signing requires WASM module (Web Crypto API fallback not implemented)'
  );
}

/**
 * Verify an Ed25519 signature
 */
export function verifySignature(
  publicKeyBase64: string,
  message: string,
  signatureBase64: string
): VerifyResult {
  if (wasmModule?.verify_signature) {
    const result = wasmModule.verify_signature(
      publicKeyBase64,
      message,
      signatureBase64
    );
    return {
      valid: result.valid,
      error: result.error || undefined,
    };
  }

  throw new Error(
    'Ed25519 verification requires WASM module (Web Crypto API fallback not implemented)'
  );
}

/**
 * Get the fingerprint (SHA-256 hash) of a public key
 */
export function getKeyFingerprint(publicKeyBase64: string): string {
  if (wasmModule?.get_key_fingerprint) {
    return wasmModule.get_key_fingerprint(publicKeyBase64);
  }

  return sha256Hex(publicKeyBase64);
}

// ============================================================================
// Base64 Encoding/Decoding
// ============================================================================

/**
 * Encode bytes to Base64
 */
export function base64Encode(data: Uint8Array): string {
  if (wasmModule?.base64_encode) {
    return wasmModule.base64_encode(data);
  }

  return btoa(String.fromCharCode(...data));
}

/**
 * Encode string to Base64
 */
export function base64EncodeString(data: string): string {
  if (wasmModule?.base64_encode_string) {
    return wasmModule.base64_encode_string(data);
  }

  return btoa(data);
}

/**
 * Decode Base64 to bytes
 */
export function base64Decode(encoded: string): Uint8Array {
  if (wasmModule?.base64_decode) {
    return new Uint8Array(wasmModule.base64_decode(encoded));
  }

  try {
    const decoded = atob(encoded);
    const bytes = new Uint8Array(decoded.length);
    for (let i = 0; i < decoded.length; i++) {
      bytes[i] = decoded.charCodeAt(i);
    }
    return bytes;
  } catch {
    return new Uint8Array(0);
  }
}

/**
 * Decode Base64 to string
 */
export function base64DecodeString(encoded: string): string {
  if (wasmModule?.base64_decode_string) {
    return wasmModule.base64_decode_string(encoded);
  }

  try {
    return atob(encoded);
  } catch {
    return '';
  }
}

/**
 * Encode bytes to URL-safe Base64 (no padding)
 */
export function base64EncodeUrl(data: Uint8Array): string {
  if (wasmModule?.base64_encode_url) {
    return wasmModule.base64_encode_url(data);
  }

  const base64 = btoa(String.fromCharCode(...data));
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/**
 * Decode URL-safe Base64 to bytes
 */
export function base64DecodeUrl(encoded: string): Uint8Array {
  if (wasmModule?.base64_decode_url) {
    return new Uint8Array(wasmModule.base64_decode_url(encoded));
  }

  try {
    const base64 = encoded.replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
    const decoded = atob(padded);
    const bytes = new Uint8Array(decoded.length);
    for (let i = 0; i < decoded.length; i++) {
      bytes[i] = decoded.charCodeAt(i);
    }
    return bytes;
  } catch {
    return new Uint8Array(0);
  }
}

// ============================================================================
// Hex Encoding/Decoding
// ============================================================================

/**
 * Encode bytes to hex string
 */
export function hexEncode(data: Uint8Array): string {
  if (wasmModule?.hex_encode) {
    return wasmModule.hex_encode(data);
  }

  return Array.from(data)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Decode hex string to bytes
 */
export function hexDecode(encoded: string): Uint8Array {
  if (wasmModule?.hex_decode) {
    return new Uint8Array(wasmModule.hex_decode(encoded));
  }

  const bytes = new Uint8Array(encoded.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(encoded.slice(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Generate random bytes
 */
export function randomBytes(length: number): Uint8Array {
  if (wasmModule?.random_bytes) {
    return new Uint8Array(wasmModule.random_bytes(length));
  }

  const bytes = new Uint8Array(length);
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(bytes);
  } else {
    // Fallback (less secure)
    for (let i = 0; i < length; i++) {
      bytes[i] = Math.floor(Math.random() * 256);
    }
  }
  return bytes;
}

/**
 * Generate a random hex token
 */
export function randomHexToken(byteLength: number): string {
  if (wasmModule?.random_hex_token) {
    return wasmModule.random_hex_token(byteLength);
  }

  return hexEncode(randomBytes(byteLength));
}

/**
 * Generate a random Base64 token (URL-safe)
 */
export function randomBase64Token(byteLength: number): string {
  if (wasmModule?.random_base64_token) {
    return wasmModule.random_base64_token(byteLength);
  }

  return base64EncodeUrl(randomBytes(byteLength));
}

/**
 * Constant-time comparison of two strings
 */
export function constantTimeCompare(a: string, b: string): boolean {
  if (wasmModule?.constant_time_compare) {
    return wasmModule.constant_time_compare(a, b);
  }

  if (a.length !== b.length) return false;

  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

/**
 * Derive a key from password using simple PBKDF2-like iteration
 */
export function deriveKeySimple(
  password: string,
  salt: string,
  iterations: number
): string {
  if (wasmModule?.derive_key_simple) {
    return wasmModule.derive_key_simple(password, salt, iterations);
  }

  let key = sha256Hex(password + salt);
  for (let i = 0; i < iterations; i++) {
    key = sha256Hex(key + salt);
  }
  return key;
}

// ============================================================================
// JavaScript Fallbacks
// ============================================================================

function sha256JS(data: string): HashResult {
  // Simple SHA-256 implementation for fallback
  // In production, use Web Crypto API
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    // This would be async, so we'll use a sync fallback
  }

  // Very basic fallback - in real use, WASM should be available
  const encoder = new TextEncoder();
  const bytes = encoder.encode(data);
  return sha256BytesJS(bytes);
}

function sha256BytesJS(data: Uint8Array): HashResult {
  // Constants
  const K = new Uint32Array([
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1,
    0x923f82a4, 0xab1c5ed5, 0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3,
    0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174, 0xe49b69c1, 0xefbe4786,
    0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147,
    0x06ca6351, 0x14292967, 0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13,
    0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85, 0xa2bfe8a1, 0xa81a664b,
    0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a,
    0x5b9cca4f, 0x682e6ff3, 0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208,
    0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
  ]);

  // Initial hash values
  let h0 = 0x6a09e667;
  let h1 = 0xbb67ae85;
  let h2 = 0x3c6ef372;
  let h3 = 0xa54ff53a;
  let h4 = 0x510e527f;
  let h5 = 0x9b05688c;
  let h6 = 0x1f83d9ab;
  let h7 = 0x5be0cd19;

  // Pre-processing
  const msgLen = data.length;
  const bitLen = msgLen * 8;
  const padLen = ((msgLen + 8) % 64 < 56 ? 56 : 120) - ((msgLen + 8) % 64);
  const paddedLen = msgLen + 1 + padLen + 8;
  const padded = new Uint8Array(paddedLen);
  padded.set(data);
  padded[msgLen] = 0x80;

  // Append length in bits (big-endian)
  const view = new DataView(padded.buffer);
  view.setUint32(paddedLen - 4, bitLen, false);

  // Process chunks
  const w = new Uint32Array(64);
  for (let offset = 0; offset < paddedLen; offset += 64) {
    // Create message schedule
    for (let i = 0; i < 16; i++) {
      w[i] = view.getUint32(offset + i * 4, false);
    }

    for (let i = 16; i < 64; i++) {
      const s0 =
        (((w[i - 15] >>> 7) | (w[i - 15] << 25)) ^
          ((w[i - 15] >>> 18) | (w[i - 15] << 14)) ^
          (w[i - 15] >>> 3)) >>>
        0;
      const s1 =
        (((w[i - 2] >>> 17) | (w[i - 2] << 15)) ^
          ((w[i - 2] >>> 19) | (w[i - 2] << 13)) ^
          (w[i - 2] >>> 10)) >>>
        0;
      w[i] = (w[i - 16] + s0 + w[i - 7] + s1) >>> 0;
    }

    // Initialize working variables
    let a = h0,
      b = h1,
      c = h2,
      d = h3,
      e = h4,
      f = h5,
      g = h6,
      h = h7;

    // Compression function
    for (let i = 0; i < 64; i++) {
      const S1 =
        (((e >>> 6) | (e << 26)) ^
          ((e >>> 11) | (e << 21)) ^
          ((e >>> 25) | (e << 7))) >>>
        0;
      const ch = ((e & f) ^ (~e & g)) >>> 0;
      const temp1 = (h + S1 + ch + K[i] + w[i]) >>> 0;
      const S0 =
        (((a >>> 2) | (a << 30)) ^
          ((a >>> 13) | (a << 19)) ^
          ((a >>> 22) | (a << 10))) >>>
        0;
      const maj = ((a & b) ^ (a & c) ^ (b & c)) >>> 0;
      const temp2 = (S0 + maj) >>> 0;

      h = g;
      g = f;
      f = e;
      e = (d + temp1) >>> 0;
      d = c;
      c = b;
      b = a;
      a = (temp1 + temp2) >>> 0;
    }

    h0 = (h0 + a) >>> 0;
    h1 = (h1 + b) >>> 0;
    h2 = (h2 + c) >>> 0;
    h3 = (h3 + d) >>> 0;
    h4 = (h4 + e) >>> 0;
    h5 = (h5 + f) >>> 0;
    h6 = (h6 + g) >>> 0;
    h7 = (h7 + h) >>> 0;
  }

  // Produce final hash
  const hash = new Uint8Array(32);
  const hashView = new DataView(hash.buffer);
  hashView.setUint32(0, h0, false);
  hashView.setUint32(4, h1, false);
  hashView.setUint32(8, h2, false);
  hashView.setUint32(12, h3, false);
  hashView.setUint32(16, h4, false);
  hashView.setUint32(20, h5, false);
  hashView.setUint32(24, h6, false);
  hashView.setUint32(28, h7, false);

  return {
    hex: hexEncode(hash),
    base64: base64Encode(hash),
    bytes: hash,
  };
}

function hmacSha256JS(key: string, message: string): HmacResult {
  const encoder = new TextEncoder();
  let keyBytes = encoder.encode(key);

  // If key is longer than 64 bytes, hash it
  if (keyBytes.length > 64) {
    keyBytes = new Uint8Array(sha256JS(key).bytes);
  }

  // Pad key to 64 bytes
  const paddedKey = new Uint8Array(64);
  paddedKey.set(keyBytes);

  // Create inner and outer padding
  const ipad = new Uint8Array(64);
  const opad = new Uint8Array(64);
  for (let i = 0; i < 64; i++) {
    ipad[i] = paddedKey[i] ^ 0x36;
    opad[i] = paddedKey[i] ^ 0x5c;
  }

  // Inner hash: H(K XOR ipad || message)
  const messageBytes = encoder.encode(message);
  const innerData = new Uint8Array(64 + messageBytes.length);
  innerData.set(ipad);
  innerData.set(messageBytes, 64);
  const innerHash = sha256BytesJS(innerData);

  // Outer hash: H(K XOR opad || inner_hash)
  const outerData = new Uint8Array(64 + 32);
  outerData.set(opad);
  outerData.set(innerHash.bytes, 64);
  const outerHash = sha256BytesJS(outerData);

  return {
    hex: outerHash.hex,
    base64: outerHash.base64,
    success: true,
  };
}
