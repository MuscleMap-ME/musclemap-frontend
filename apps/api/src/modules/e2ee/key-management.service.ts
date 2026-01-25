/**
 * E2EE Key Management Service
 *
 * Handles server-side key operations:
 * - Storing and retrieving public key bundles
 * - Managing one-time prekeys
 * - Key rotation and cleanup
 * - Multi-device support
 *
 * IMPORTANT: Private keys NEVER touch the server.
 * All private key operations happen client-side.
 */

import crypto from 'crypto';
import { queryOne, queryAll, query, transaction } from '../../db/client';
import { loggers } from '../../lib/logger';
import {
  CRYPTO_CONSTANTS,
  validateKeyBundle,
  validatePreKey,
  generateIdentityFingerprint,
  verifySignedPreKey,
  type KeyBundle,
  type OneTimePreKey,
} from './crypto';

const log = loggers.api.child({ module: 'e2ee-key-management' });

// ============================================
// TYPES
// ============================================

export interface RegisterKeysInput {
  userId: string;
  deviceId: string;
  deviceName?: string;
  deviceType?: string;
  identityKeyPublic: string;
  signedPreKeyPublic: string;
  signedPreKeySignature: string;
  signedPreKeyId: number;
  oneTimePreKeys?: Array<{ id: number; publicKey: string }>;
}

export interface KeyBundleWithPreKeys extends KeyBundle {
  oneTimePreKeys: OneTimePreKey[];
}

export interface DeviceInfo {
  deviceId: string;
  deviceName?: string;
  deviceType?: string;
  lastActiveAt: Date;
  createdAt: Date;
}

// ============================================
// SERVICE
// ============================================

export const keyManagementService = {
  // ==========================================
  // KEY REGISTRATION
  // ==========================================

  /**
   * Register or update encryption keys for a device
   */
  async registerKeys(input: RegisterKeysInput): Promise<KeyBundle> {
    const {
      userId,
      deviceId,
      deviceName,
      deviceType,
      identityKeyPublic,
      signedPreKeyPublic,
      signedPreKeySignature,
      signedPreKeyId,
      oneTimePreKeys,
    } = input;

    // Validate key bundle
    const validation = validateKeyBundle({
      identityKeyPublic,
      signedPreKeyPublic,
      signedPreKeySignature,
      signedPreKeyId,
    });

    if (!validation.valid) {
      throw new Error(`Invalid key bundle: ${validation.errors.join(', ')}`);
    }

    // Verify signed prekey signature
    if (!verifySignedPreKey(signedPreKeyPublic, signedPreKeySignature, identityKeyPublic)) {
      throw new Error('Invalid signed prekey signature');
    }

    // Generate fingerprint
    const fingerprint = generateIdentityFingerprint(identityKeyPublic);

    return await transaction(async (client) => {
      // Upsert key bundle
      const result = await client.query(
        `INSERT INTO user_encryption_keys (
          user_id, device_id, device_name, device_type,
          identity_key_public, identity_key_fingerprint,
          signed_prekey_public, signed_prekey_signature, signed_prekey_id,
          last_active_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
        ON CONFLICT (user_id, device_id) DO UPDATE SET
          identity_key_public = EXCLUDED.identity_key_public,
          identity_key_fingerprint = EXCLUDED.identity_key_fingerprint,
          signed_prekey_public = EXCLUDED.signed_prekey_public,
          signed_prekey_signature = EXCLUDED.signed_prekey_signature,
          signed_prekey_id = EXCLUDED.signed_prekey_id,
          signed_prekey_created_at = NOW(),
          device_name = COALESCE(EXCLUDED.device_name, user_encryption_keys.device_name),
          device_type = COALESCE(EXCLUDED.device_type, user_encryption_keys.device_type),
          last_active_at = NOW(),
          updated_at = NOW()
        RETURNING id, identity_key_fingerprint, created_at`,
        [
          userId,
          deviceId,
          deviceName,
          deviceType,
          identityKeyPublic,
          fingerprint,
          signedPreKeyPublic,
          signedPreKeySignature,
          signedPreKeyId,
        ]
      );

      // Upload one-time prekeys if provided
      if (oneTimePreKeys?.length) {
        await this.uploadOneTimePreKeysInternal(client, userId, deviceId, oneTimePreKeys);
      }

      // Update user's E2EE status
      await client.query(
        `UPDATE users SET e2ee_enabled = TRUE, e2ee_setup_at = COALESCE(e2ee_setup_at, NOW())
         WHERE id = $1`,
        [userId]
      );

      log.info(
        { userId, deviceId, fingerprint: fingerprint.slice(0, 20) },
        'Encryption keys registered'
      );

      return {
        userId,
        deviceId,
        identityKeyPublic,
        identityKeyFingerprint: result.rows[0].identity_key_fingerprint,
        signedPreKeyPublic,
        signedPreKeySignature,
        signedPreKeyId,
      };
    });
  },

  /**
   * Upload additional one-time prekeys
   */
  async uploadOneTimePreKeys(
    userId: string,
    deviceId: string,
    keys: Array<{ id: number; publicKey: string }>
  ): Promise<number> {
    // Validate all keys
    for (const key of keys) {
      const result = validatePreKey(key.publicKey);
      if (!result.valid) {
        throw new Error(`Invalid prekey ${key.id}: ${result.error}`);
      }
    }

    return await transaction(async (client) => {
      return await this.uploadOneTimePreKeysInternal(client, userId, deviceId, keys);
    });
  },

  /**
   * Internal: Upload prekeys within a transaction
   */
  async uploadOneTimePreKeysInternal(
    client: any,
    userId: string,
    deviceId: string,
    keys: Array<{ id: number; publicKey: string }>
  ): Promise<number> {
    // Check current count
    const countResult = await client.query(
      `SELECT COUNT(*) as count FROM user_onetime_prekeys
       WHERE user_id = $1 AND device_id = $2 AND used = FALSE`,
      [userId, deviceId]
    );

    const currentCount = parseInt(countResult.rows[0]?.count || '0');
    const maxToUpload = CRYPTO_CONSTANTS.MAX_ONETIME_PREKEYS - currentCount;

    if (maxToUpload <= 0) {
      return 0;
    }

    const keysToUpload = keys.slice(0, maxToUpload);

    // Insert prekeys
    for (const key of keysToUpload) {
      await client.query(
        `INSERT INTO user_onetime_prekeys (user_id, device_id, prekey_id, prekey_public)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (user_id, device_id, prekey_id) DO UPDATE SET
           prekey_public = EXCLUDED.prekey_public,
           used = FALSE,
           used_at = NULL,
           used_by_user_id = NULL`,
        [userId, deviceId, key.id, key.publicKey]
      );
    }

    log.debug(
      { userId, deviceId, count: keysToUpload.length },
      'One-time prekeys uploaded'
    );

    return keysToUpload.length;
  },

  // ==========================================
  // KEY RETRIEVAL
  // ==========================================

  /**
   * Get a user's key bundle for initiating encrypted communication
   */
  async getKeyBundle(targetUserId: string, requestingUserId?: string): Promise<KeyBundleWithPreKeys | null> {
    // Get the most recently active device
    const keyBundle = await queryOne<{
      user_id: string;
      device_id: string;
      identity_key_public: string;
      identity_key_fingerprint: string;
      signed_prekey_public: string;
      signed_prekey_signature: string;
      signed_prekey_id: number;
    }>(
      `SELECT user_id, device_id, identity_key_public, identity_key_fingerprint,
              signed_prekey_public, signed_prekey_signature, signed_prekey_id
       FROM user_encryption_keys
       WHERE user_id = $1
       ORDER BY last_active_at DESC
       LIMIT 1`,
      [targetUserId]
    );

    if (!keyBundle) {
      return null;
    }

    // Get available one-time prekeys
    const prekeys = await this.getAndConsumeOneTimePreKey(
      targetUserId,
      keyBundle.device_id,
      requestingUserId
    );

    return {
      userId: keyBundle.user_id,
      deviceId: keyBundle.device_id,
      identityKeyPublic: keyBundle.identity_key_public,
      identityKeyFingerprint: keyBundle.identity_key_fingerprint,
      signedPreKeyPublic: keyBundle.signed_prekey_public,
      signedPreKeySignature: keyBundle.signed_prekey_signature,
      signedPreKeyId: keyBundle.signed_prekey_id,
      oneTimePreKeys: prekeys ? [prekeys] : [],
    };
  },

  /**
   * Get key bundles for all devices of a user
   */
  async getAllDeviceKeyBundles(targetUserId: string): Promise<KeyBundle[]> {
    const bundles = await queryAll<{
      user_id: string;
      device_id: string;
      identity_key_public: string;
      identity_key_fingerprint: string;
      signed_prekey_public: string;
      signed_prekey_signature: string;
      signed_prekey_id: number;
    }>(
      `SELECT user_id, device_id, identity_key_public, identity_key_fingerprint,
              signed_prekey_public, signed_prekey_signature, signed_prekey_id
       FROM user_encryption_keys
       WHERE user_id = $1
       ORDER BY last_active_at DESC`,
      [targetUserId]
    );

    return bundles.map((b) => ({
      userId: b.user_id,
      deviceId: b.device_id,
      identityKeyPublic: b.identity_key_public,
      identityKeyFingerprint: b.identity_key_fingerprint,
      signedPreKeyPublic: b.signed_prekey_public,
      signedPreKeySignature: b.signed_prekey_signature,
      signedPreKeyId: b.signed_prekey_id,
    }));
  },

  /**
   * Get and consume a one-time prekey (atomic operation)
   */
  async getAndConsumeOneTimePreKey(
    userId: string,
    deviceId: string,
    consumingUserId?: string
  ): Promise<OneTimePreKey | null> {
    const result = await queryOne<{
      prekey_id: number;
      prekey_public: string;
    }>(
      `UPDATE user_onetime_prekeys
       SET used = TRUE, used_at = NOW(), used_by_user_id = $3
       WHERE id = (
         SELECT id FROM user_onetime_prekeys
         WHERE user_id = $1 AND device_id = $2 AND used = FALSE
         ORDER BY prekey_id ASC
         LIMIT 1
         FOR UPDATE SKIP LOCKED
       )
       RETURNING prekey_id, prekey_public`,
      [userId, deviceId, consumingUserId]
    );

    if (!result) {
      log.warn({ userId, deviceId }, 'No one-time prekeys available');
      return null;
    }

    // Check remaining count and warn if low
    const remaining = await queryOne<{ count: string }>(
      `SELECT COUNT(*) as count FROM user_onetime_prekeys
       WHERE user_id = $1 AND device_id = $2 AND used = FALSE`,
      [userId, deviceId]
    );

    const count = parseInt(remaining?.count || '0');
    if (count < CRYPTO_CONSTANTS.MIN_ONETIME_PREKEYS) {
      log.warn(
        { userId, deviceId, remaining: count },
        'One-time prekeys running low'
      );
    }

    return {
      id: result.prekey_id,
      publicKey: result.prekey_public,
    };
  },

  /**
   * Get available prekey count for a device
   */
  async getAvailablePreKeyCount(userId: string, deviceId: string): Promise<number> {
    const result = await queryOne<{ count: string }>(
      `SELECT COUNT(*) as count FROM user_onetime_prekeys
       WHERE user_id = $1 AND device_id = $2 AND used = FALSE`,
      [userId, deviceId]
    );

    return parseInt(result?.count || '0');
  },

  // ==========================================
  // DEVICE MANAGEMENT
  // ==========================================

  /**
   * Get all devices for a user
   */
  async getUserDevices(userId: string): Promise<DeviceInfo[]> {
    const devices = await queryAll<{
      device_id: string;
      device_name: string | null;
      device_type: string | null;
      last_active_at: Date;
      created_at: Date;
    }>(
      `SELECT device_id, device_name, device_type, last_active_at, created_at
       FROM user_encryption_keys
       WHERE user_id = $1
       ORDER BY last_active_at DESC`,
      [userId]
    );

    return devices.map((d) => ({
      deviceId: d.device_id,
      deviceName: d.device_name || undefined,
      deviceType: d.device_type || undefined,
      lastActiveAt: d.last_active_at,
      createdAt: d.created_at,
    }));
  },

  /**
   * Remove a device (and all its keys)
   */
  async removeDevice(userId: string, deviceId: string): Promise<void> {
    await transaction(async (client) => {
      // Delete one-time prekeys
      await client.query(
        `DELETE FROM user_onetime_prekeys WHERE user_id = $1 AND device_id = $2`,
        [userId, deviceId]
      );

      // Delete key bundle
      await client.query(
        `DELETE FROM user_encryption_keys WHERE user_id = $1 AND device_id = $2`,
        [userId, deviceId]
      );

      // Delete sessions
      await client.query(
        `DELETE FROM e2ee_sessions WHERE user_id = $1 AND device_id = $2`,
        [userId, deviceId]
      );

      // Check if user has any remaining devices
      const remaining = await client.query(
        `SELECT COUNT(*) as count FROM user_encryption_keys WHERE user_id = $1`,
        [userId]
      );

      if (parseInt(remaining.rows[0]?.count || '0') === 0) {
        // Disable E2EE for user if no devices left
        await client.query(
          `UPDATE users SET e2ee_enabled = FALSE WHERE id = $1`,
          [userId]
        );
      }

      log.info({ userId, deviceId }, 'Device removed');
    });
  },

  /**
   * Update device activity timestamp
   */
  async updateDeviceActivity(userId: string, deviceId: string): Promise<void> {
    await query(
      `UPDATE user_encryption_keys SET last_active_at = NOW()
       WHERE user_id = $1 AND device_id = $2`,
      [userId, deviceId]
    );
  },

  // ==========================================
  // KEY VERIFICATION
  // ==========================================

  /**
   * Verify a key fingerprint matches what we have stored
   */
  async verifyKeyFingerprint(
    userId: string,
    deviceId: string,
    fingerprint: string
  ): Promise<boolean> {
    const result = await queryOne<{ identity_key_fingerprint: string }>(
      `SELECT identity_key_fingerprint FROM user_encryption_keys
       WHERE user_id = $1 AND device_id = $2`,
      [userId, deviceId]
    );

    if (!result) return false;

    // Constant-time comparison
    try {
      return crypto.timingSafeEqual(
        Buffer.from(result.identity_key_fingerprint, 'utf-8'),
        Buffer.from(fingerprint, 'utf-8')
      );
    } catch {
      return false;
    }
  },

  /**
   * Check if user has E2EE enabled
   */
  async isE2EEEnabled(userId: string): Promise<boolean> {
    const result = await queryOne<{ e2ee_enabled: boolean }>(
      `SELECT e2ee_enabled FROM users WHERE id = $1`,
      [userId]
    );

    return result?.e2ee_enabled || false;
  },

  // ==========================================
  // CLEANUP & MAINTENANCE
  // ==========================================

  /**
   * Clean up old used one-time prekeys (keep for 30 days for debugging)
   */
  async cleanupUsedPreKeys(): Promise<number> {
    const result = await query(
      `DELETE FROM user_onetime_prekeys
       WHERE used = TRUE AND used_at < NOW() - INTERVAL '30 days'`
    );

    const deletedCount = result.rowCount || 0;
    if (deletedCount > 0) {
      log.info({ count: deletedCount }, 'Cleaned up used one-time prekeys');
    }

    return deletedCount;
  },

  /**
   * Clean up inactive devices (no activity in 90 days)
   */
  async cleanupInactiveDevices(): Promise<number> {
    const result = await query(
      `WITH deleted_devices AS (
        DELETE FROM user_encryption_keys
        WHERE last_active_at < NOW() - INTERVAL '90 days'
        RETURNING user_id, device_id
      )
      SELECT COUNT(*) as count FROM deleted_devices`
    );

    const deletedCount = parseInt(String(result.rows[0]?.count ?? '0'));
    if (deletedCount > 0) {
      log.info({ count: deletedCount }, 'Cleaned up inactive devices');
    }

    return deletedCount;
  },

  /**
   * Check if signed prekey needs rotation
   */
  async checkSignedPreKeyRotation(userId: string, deviceId: string): Promise<boolean> {
    const result = await queryOne<{ signed_prekey_created_at: Date }>(
      `SELECT signed_prekey_created_at FROM user_encryption_keys
       WHERE user_id = $1 AND device_id = $2`,
      [userId, deviceId]
    );

    if (!result) return false;

    const age = Date.now() - result.signed_prekey_created_at.getTime();
    return age > CRYPTO_CONSTANTS.SIGNED_PREKEY_ROTATION_MS;
  },

  /**
   * Get users who need to replenish one-time prekeys
   */
  async getUsersWithLowPreKeys(): Promise<Array<{ userId: string; deviceId: string; count: number }>> {
    const results = await queryAll<{
      user_id: string;
      device_id: string;
      count: string;
    }>(
      `SELECT user_id, device_id, COUNT(*) as count
       FROM user_onetime_prekeys
       WHERE used = FALSE
       GROUP BY user_id, device_id
       HAVING COUNT(*) < $1`,
      [CRYPTO_CONSTANTS.MIN_ONETIME_PREKEYS]
    );

    return results.map((r) => ({
      userId: r.user_id,
      deviceId: r.device_id,
      count: parseInt(r.count),
    }));
  },
};

export default keyManagementService;
