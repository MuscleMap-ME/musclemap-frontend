/**
 * E2EE Cryptography Utilities
 *
 * Server-side crypto operations for key validation and verification.
 * IMPORTANT: Private keys are NEVER on the server - all encryption/decryption
 * happens client-side. This module only handles:
 * - Key format validation
 * - Signature verification
 * - Fingerprint generation
 * - Content hashing
 */

import crypto from 'crypto';
import { promisify } from 'util';

const randomBytes = promisify(crypto.randomBytes);

// ============================================
// CONSTANTS
// ============================================

export const CRYPTO_CONSTANTS = {
  // Key sizes (bytes)
  ED25519_PUBLIC_KEY_SIZE: 32,
  ED25519_SIGNATURE_SIZE: 64,
  X25519_PUBLIC_KEY_SIZE: 32,
  XCHACHA20_NONCE_SIZE: 24,
  XCHACHA20_KEY_SIZE: 32,
  POLY1305_TAG_SIZE: 16,

  // Encoding
  ENCODING: 'base64' as const,

  // Protocol version
  CURRENT_PROTOCOL_VERSION: 1,

  // Prekey limits
  MIN_ONETIME_PREKEYS: 20,
  MAX_ONETIME_PREKEYS: 100,
  DEFAULT_ONETIME_PREKEYS: 50,

  // Signed prekey rotation (30 days)
  SIGNED_PREKEY_ROTATION_MS: 30 * 24 * 60 * 60 * 1000,
};

// ============================================
// TYPES
// ============================================

export interface KeyBundle {
  userId: string;
  deviceId: string;
  identityKeyPublic: string;  // Base64 Ed25519 public key
  identityKeyFingerprint: string;  // SHA-256 fingerprint
  signedPreKeyPublic: string;  // Base64 X25519 public key
  signedPreKeySignature: string;  // Base64 Ed25519 signature
  signedPreKeyId: number;
}

export interface OneTimePreKey {
  id: number;
  publicKey: string;  // Base64 X25519 public key
}

export interface EncryptedPayload {
  version: number;
  senderFingerprint: string;
  keyExchange?: {
    ephemeralKey: string;
    usedOneTimePreKeyId?: number;
  };
  header: {
    ratchetPublicKey: string;
    messageNumber: number;
    previousChainLength: number;
  };
  nonce: string;
  ciphertext: string;
}

// ============================================
// KEY VALIDATION
// ============================================

/**
 * Validate a base64-encoded public key
 */
export function validatePublicKey(
  key: string,
  expectedSize: number,
  keyType: string
): { valid: boolean; error?: string } {
  try {
    const decoded = Buffer.from(key, 'base64');

    if (decoded.length !== expectedSize) {
      return {
        valid: false,
        error: `Invalid ${keyType} key size: expected ${expectedSize}, got ${decoded.length}`,
      };
    }

    return { valid: true };
  } catch (error) {
    return {
      valid: false,
      error: `Invalid ${keyType} key encoding: not valid base64`,
    };
  }
}

/**
 * Validate an Ed25519 identity public key
 */
export function validateIdentityKey(key: string): { valid: boolean; error?: string } {
  return validatePublicKey(key, CRYPTO_CONSTANTS.ED25519_PUBLIC_KEY_SIZE, 'Ed25519 identity');
}

/**
 * Validate an X25519 prekey
 */
export function validatePreKey(key: string): { valid: boolean; error?: string } {
  return validatePublicKey(key, CRYPTO_CONSTANTS.X25519_PUBLIC_KEY_SIZE, 'X25519 prekey');
}

/**
 * Validate an Ed25519 signature
 */
export function validateSignature(signature: string): { valid: boolean; error?: string } {
  try {
    const decoded = Buffer.from(signature, 'base64');

    if (decoded.length !== CRYPTO_CONSTANTS.ED25519_SIGNATURE_SIZE) {
      return {
        valid: false,
        error: `Invalid signature size: expected ${CRYPTO_CONSTANTS.ED25519_SIGNATURE_SIZE}, got ${decoded.length}`,
      };
    }

    return { valid: true };
  } catch (error) {
    return {
      valid: false,
      error: 'Invalid signature encoding: not valid base64',
    };
  }
}

/**
 * Validate a nonce
 */
export function validateNonce(nonce: string): { valid: boolean; error?: string } {
  try {
    const decoded = Buffer.from(nonce, 'base64');

    if (decoded.length !== CRYPTO_CONSTANTS.XCHACHA20_NONCE_SIZE) {
      return {
        valid: false,
        error: `Invalid nonce size: expected ${CRYPTO_CONSTANTS.XCHACHA20_NONCE_SIZE}, got ${decoded.length}`,
      };
    }

    return { valid: true };
  } catch (error) {
    return {
      valid: false,
      error: 'Invalid nonce encoding: not valid base64',
    };
  }
}

/**
 * Validate an entire key bundle
 */
export function validateKeyBundle(bundle: Partial<KeyBundle>): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!bundle.identityKeyPublic) {
    errors.push('Missing identity key');
  } else {
    const result = validateIdentityKey(bundle.identityKeyPublic);
    if (!result.valid) errors.push(result.error!);
  }

  if (!bundle.signedPreKeyPublic) {
    errors.push('Missing signed prekey');
  } else {
    const result = validatePreKey(bundle.signedPreKeyPublic);
    if (!result.valid) errors.push(result.error!);
  }

  if (!bundle.signedPreKeySignature) {
    errors.push('Missing signed prekey signature');
  } else {
    const result = validateSignature(bundle.signedPreKeySignature);
    if (!result.valid) errors.push(result.error!);
  }

  if (bundle.signedPreKeyId === undefined || bundle.signedPreKeyId < 0) {
    errors.push('Invalid signed prekey ID');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

// ============================================
// FINGERPRINT GENERATION
// ============================================

/**
 * Generate a fingerprint for a public key
 * Used for key verification and display
 */
export function generateFingerprint(publicKey: string): string {
  const keyBuffer = Buffer.from(publicKey, 'base64');
  const hash = crypto.createHash('sha256').update(keyBuffer).digest();

  // Format as groups of 4 hex chars for readability
  // e.g., "1234 5678 9abc def0 ..."
  const hex = hash.toString('hex').toUpperCase();
  const groups: string[] = [];

  for (let i = 0; i < hex.length; i += 4) {
    groups.push(hex.slice(i, i + 4));
  }

  return groups.join(' ');
}

/**
 * Generate a short fingerprint (first 8 chars)
 * Used for display in UI
 */
export function generateShortFingerprint(publicKey: string): string {
  const keyBuffer = Buffer.from(publicKey, 'base64');
  const hash = crypto.createHash('sha256').update(keyBuffer).digest('hex');
  return hash.slice(0, 8).toUpperCase();
}

/**
 * Generate fingerprint for identity key verification
 */
export function generateIdentityFingerprint(identityKey: string): string {
  return generateFingerprint(identityKey);
}

// ============================================
// CONTENT HASHING
// ============================================

/**
 * Hash content for verification (without revealing content)
 * Used in content reports to verify claims
 */
export function hashContent(content: Buffer | string): string {
  const buffer = typeof content === 'string' ? Buffer.from(content, 'utf-8') : content;
  return crypto.createHash('sha256').update(buffer).digest('base64');
}

/**
 * Hash file content for CID-like identification
 */
export function hashFile(fileBuffer: Buffer): string {
  return crypto.createHash('sha256').update(fileBuffer).digest('base64url');
}

/**
 * Verify content matches a hash
 */
export function verifyContentHash(content: Buffer | string, expectedHash: string): boolean {
  const actualHash = hashContent(content);
  return crypto.timingSafeEqual(
    Buffer.from(actualHash, 'base64'),
    Buffer.from(expectedHash, 'base64')
  );
}

// ============================================
// RANDOM GENERATION
// ============================================

/**
 * Generate a secure random token
 */
export async function generateSecureToken(bytes: number = 32): Promise<string> {
  const buffer = await randomBytes(bytes);
  return buffer.toString('base64url');
}

/**
 * Generate a random ID with prefix
 */
export async function generateRandomId(prefix: string): Promise<string> {
  const buffer = await randomBytes(12);
  return `${prefix}_${buffer.toString('hex')}`;
}

/**
 * Generate a prekey ID (sequential within device)
 */
export function generatePreKeyId(lastId: number = 0): number {
  // Wrap around at 2^24 to prevent overflow
  return (lastId + 1) % 16777216;
}

// ============================================
// SIGNATURE VERIFICATION (Server-side)
// ============================================

/**
 * Verify Ed25519 signature using Node.js crypto
 * Note: Ed25519 is supported in Node.js 12+
 */
export function verifyEd25519Signature(
  message: Buffer,
  signature: string,
  publicKey: string
): boolean {
  try {
    const signatureBuffer = Buffer.from(signature, 'base64');
    const keyBuffer = Buffer.from(publicKey, 'base64');

    // Create public key object
    const key = crypto.createPublicKey({
      key: Buffer.concat([
        // Ed25519 public key DER prefix
        Buffer.from('302a300506032b6570032100', 'hex'),
        keyBuffer,
      ]),
      format: 'der',
      type: 'spki',
    });

    return crypto.verify(null, message, key, signatureBuffer);
  } catch (error) {
    return false;
  }
}

/**
 * Verify signed prekey signature
 * The signature is over the signed prekey public key bytes
 */
export function verifySignedPreKey(
  signedPreKeyPublic: string,
  signature: string,
  identityKeyPublic: string
): boolean {
  const message = Buffer.from(signedPreKeyPublic, 'base64');
  return verifyEd25519Signature(message, signature, identityKeyPublic);
}

// ============================================
// ENCRYPTED PAYLOAD VALIDATION
// ============================================

/**
 * Validate encrypted message payload structure
 */
export function validateEncryptedPayload(payload: Partial<EncryptedPayload>): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (payload.version !== CRYPTO_CONSTANTS.CURRENT_PROTOCOL_VERSION) {
    errors.push(`Unsupported protocol version: ${payload.version}`);
  }

  if (!payload.senderFingerprint) {
    errors.push('Missing sender fingerprint');
  }

  if (!payload.header) {
    errors.push('Missing message header');
  } else {
    if (!payload.header.ratchetPublicKey) {
      errors.push('Missing ratchet public key');
    } else {
      const result = validatePreKey(payload.header.ratchetPublicKey);
      if (!result.valid) errors.push(result.error!);
    }

    if (typeof payload.header.messageNumber !== 'number' || payload.header.messageNumber < 0) {
      errors.push('Invalid message number');
    }

    if (typeof payload.header.previousChainLength !== 'number' || payload.header.previousChainLength < 0) {
      errors.push('Invalid previous chain length');
    }
  }

  if (!payload.nonce) {
    errors.push('Missing nonce');
  } else {
    const result = validateNonce(payload.nonce);
    if (!result.valid) errors.push(result.error!);
  }

  if (!payload.ciphertext) {
    errors.push('Missing ciphertext');
  } else {
    try {
      const decoded = Buffer.from(payload.ciphertext, 'base64');
      if (decoded.length < CRYPTO_CONSTANTS.POLY1305_TAG_SIZE) {
        errors.push('Ciphertext too short (missing auth tag)');
      }
    } catch (error) {
      errors.push('Invalid ciphertext encoding');
    }
  }

  // Validate key exchange if present
  if (payload.keyExchange) {
    if (!payload.keyExchange.ephemeralKey) {
      errors.push('Key exchange missing ephemeral key');
    } else {
      const result = validatePreKey(payload.keyExchange.ephemeralKey);
      if (!result.valid) errors.push(result.error!);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

// ============================================
// FILE METADATA VALIDATION
// ============================================

export const ALLOWED_MIME_TYPES = {
  images: ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif', 'image/gif'],
  videos: ['video/mp4', 'video/webm', 'video/quicktime', 'video/x-m4v'],
  audio: ['audio/mpeg', 'audio/mp4', 'audio/ogg', 'audio/wav', 'audio/webm'],
  documents: [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain',
    'text/csv',
  ],
};

export const FILE_LIMITS = {
  MAX_FILE_SIZE_BYTES: 50 * 1024 * 1024, // 50MB
  MAX_IMAGE_SIZE_BYTES: 25 * 1024 * 1024, // 25MB
  MAX_VIDEO_SIZE_BYTES: 50 * 1024 * 1024, // 50MB
  MAX_DOCUMENT_SIZE_BYTES: 10 * 1024 * 1024, // 10MB
  MAX_THUMBNAIL_SIZE_BYTES: 100 * 1024, // 100KB
};

/**
 * Get file category from MIME type
 */
export function getFileCategory(mimeType: string): 'images' | 'videos' | 'audio' | 'documents' | null {
  if (ALLOWED_MIME_TYPES.images.includes(mimeType)) return 'images';
  if (ALLOWED_MIME_TYPES.videos.includes(mimeType)) return 'videos';
  if (ALLOWED_MIME_TYPES.audio.includes(mimeType)) return 'audio';
  if (ALLOWED_MIME_TYPES.documents.includes(mimeType)) return 'documents';
  return null;
}

/**
 * Validate file metadata
 */
export function validateFileMetadata(
  mimeType: string,
  sizeBytes: number,
  allowedTypes: { images: boolean; videos: boolean; audio: boolean; documents: boolean }
): { valid: boolean; error?: string } {
  const category = getFileCategory(mimeType);

  if (!category) {
    return { valid: false, error: `File type not allowed: ${mimeType}` };
  }

  if (!allowedTypes[category]) {
    return { valid: false, error: `${category} files are not allowed by recipient` };
  }

  const maxSize = category === 'videos' ? FILE_LIMITS.MAX_VIDEO_SIZE_BYTES
    : category === 'images' ? FILE_LIMITS.MAX_IMAGE_SIZE_BYTES
    : category === 'documents' ? FILE_LIMITS.MAX_DOCUMENT_SIZE_BYTES
    : FILE_LIMITS.MAX_FILE_SIZE_BYTES;

  if (sizeBytes > maxSize) {
    return {
      valid: false,
      error: `File too large: ${Math.round(sizeBytes / 1024 / 1024)}MB exceeds ${Math.round(maxSize / 1024 / 1024)}MB limit`,
    };
  }

  return { valid: true };
}

export default {
  CRYPTO_CONSTANTS,
  validateIdentityKey,
  validatePreKey,
  validateSignature,
  validateNonce,
  validateKeyBundle,
  generateFingerprint,
  generateShortFingerprint,
  generateIdentityFingerprint,
  hashContent,
  hashFile,
  verifyContentHash,
  generateSecureToken,
  generateRandomId,
  generatePreKeyId,
  verifyEd25519Signature,
  verifySignedPreKey,
  validateEncryptedPayload,
  getFileCategory,
  validateFileMetadata,
  ALLOWED_MIME_TYPES,
  FILE_LIMITS,
};
