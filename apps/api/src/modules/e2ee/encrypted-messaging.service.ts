/**
 * Encrypted Messaging Service
 *
 * Handles server-side operations for E2EE messages:
 * - Storing encrypted messages (server cannot read content)
 * - Message delivery and receipts
 * - Session tracking
 * - Conversation E2EE upgrades
 *
 * IMPORTANT: The server NEVER sees plaintext message content.
 * All encryption/decryption happens client-side.
 */

import crypto from 'crypto';
import type { PoolClient } from 'pg';
import { queryOne, queryAll, query, transaction } from '../../db/client';
import { loggers } from '../../lib/logger';
import { publish, PUBSUB_CHANNELS } from '../../lib/pubsub';
import { keyManagementService } from './key-management.service';
import {
  CRYPTO_CONSTANTS,
  validateEncryptedPayload,
  generateRandomId,
  type EncryptedPayload,
} from './crypto';

const log = loggers.api.child({ module: 'e2ee-messaging' });

// ============================================
// TYPES
// ============================================

export interface SendEncryptedMessageInput {
  conversationId: string;
  senderId: string;
  senderDeviceId: string;
  senderFingerprint: string;

  // Key exchange (for initial messages)
  keyExchangeEphemeral?: string;
  keyExchangeOnetimeId?: number;

  // Ratchet header
  ratchetPublicKey: string;
  messageNumber: number;
  previousChainLength: number;

  // Encrypted content
  nonce: string;
  ciphertext: string;

  // Metadata
  hasFileAttachment?: boolean;
  contentType?: string;
  nsfwScore?: number;
  nsfwCategory?: string;
  userMarkedAdult?: boolean;

  // Disappearing message
  disappearingTtl?: number;
}

/**
 * Simplified input for GraphQL resolver
 * The encrypted payload is a JSON string containing the full Signal Protocol message
 */
export interface SendEncryptedMessageSimpleInput {
  conversationId: string;
  senderId: string;
  encryptedPayload: string; // JSON stringified EncryptedPayload
  messageType?: string;
  replyToId?: string;
  fileIds?: string[];
}

export interface EncryptedMessage {
  id: string;
  conversationId: string;
  senderId: string;
  senderFingerprint: string;
  senderDeviceId: string;
  protocolVersion: number;

  keyExchangeEphemeral?: string;
  keyExchangeOnetimeId?: number;

  ratchetPublicKey: string;
  messageNumber: number;
  previousChainLength: number;

  nonce: string;
  ciphertext: string;

  hasFileAttachment: boolean;
  contentType: string;
  nsfwScore: number;
  userMarkedAdult: boolean;

  createdAt: Date;
  editedAt?: Date;
  expiresAt?: Date;

  deliveredCount: number;
  readCount: number;
}

export interface EncryptedMessageWithReceipts extends EncryptedMessage {
  deliveredAt?: Date;
  readAt?: Date;
}

// ============================================
// SERVICE
// ============================================

export const encryptedMessagingService = {
  // ==========================================
  // SEND MESSAGE
  // ==========================================

  /**
   * Store an encrypted message
   */
  async sendEncryptedMessage(input: SendEncryptedMessageInput): Promise<EncryptedMessage> {
    const {
      conversationId,
      senderId,
      senderDeviceId,
      senderFingerprint,
      keyExchangeEphemeral,
      keyExchangeOnetimeId,
      ratchetPublicKey,
      messageNumber,
      previousChainLength,
      nonce,
      ciphertext,
      hasFileAttachment = false,
      contentType = 'text',
      nsfwScore = 0,
      nsfwCategory,
      userMarkedAdult = false,
      disappearingTtl,
    } = input;

    // Validate encrypted payload structure
    const validation = validateEncryptedPayload({
      version: CRYPTO_CONSTANTS.CURRENT_PROTOCOL_VERSION,
      senderFingerprint,
      keyExchange: keyExchangeEphemeral
        ? { ephemeralKey: keyExchangeEphemeral, usedOneTimePreKeyId: keyExchangeOnetimeId }
        : undefined,
      header: { ratchetPublicKey, messageNumber, previousChainLength },
      nonce,
      ciphertext,
    });

    if (!validation.valid) {
      throw new Error(`Invalid encrypted message: ${validation.errors.join(', ')}`);
    }

    // Verify sender is participant in conversation
    const isParticipant = await queryOne<{ user_id: string }>(
      `SELECT user_id FROM conversation_participants
       WHERE conversation_id = $1 AND user_id = $2`,
      [conversationId, senderId]
    );

    if (!isParticipant) {
      throw new Error('Not a participant in this conversation');
    }

    // Verify sender fingerprint matches registered key
    const fingerprintValid = await keyManagementService.verifyKeyFingerprint(
      senderId,
      senderDeviceId,
      senderFingerprint
    );

    if (!fingerprintValid) {
      throw new Error('Sender fingerprint does not match registered keys');
    }

    return await transaction(async (client) => {
      const messageId = await generateRandomId('emsg');

      // Calculate expiration if disappearing message
      const expiresAt = disappearingTtl
        ? new Date(Date.now() + disappearingTtl * 1000)
        : null;

      // Insert encrypted message
      const result = await client.query(
        `INSERT INTO encrypted_messages (
          id, conversation_id, sender_id, sender_device_id, sender_fingerprint,
          protocol_version, key_exchange_ephemeral, key_exchange_onetime_id,
          ratchet_public_key, message_number, previous_chain_length,
          nonce, ciphertext,
          has_file_attachment, content_type, nsfw_score, nsfw_category, user_marked_adult,
          expires_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
        RETURNING id, created_at`,
        [
          messageId,
          conversationId,
          senderId,
          senderDeviceId,
          senderFingerprint,
          CRYPTO_CONSTANTS.CURRENT_PROTOCOL_VERSION,
          keyExchangeEphemeral,
          keyExchangeOnetimeId,
          ratchetPublicKey,
          messageNumber,
          previousChainLength,
          nonce,
          ciphertext,
          hasFileAttachment,
          contentType,
          nsfwScore,
          nsfwCategory,
          userMarkedAdult,
          expiresAt,
        ]
      );

      // Update conversation
      await client.query(
        `UPDATE conversations
         SET last_message_at = NOW(), is_e2ee = TRUE, e2ee_version = $2, updated_at = NOW()
         WHERE id = $1`,
        [conversationId, CRYPTO_CONSTANTS.CURRENT_PROTOCOL_VERSION]
      );

      // Create delivery receipts for all participants (except sender)
      await client.query(
        `INSERT INTO encrypted_message_receipts (message_id, user_id)
         SELECT $1, user_id FROM conversation_participants
         WHERE conversation_id = $2 AND user_id != $3`,
        [messageId, conversationId, senderId]
      );

      // Update session tracking
      await this.updateSessionOnMessageSent(
        client,
        conversationId,
        senderId,
        senderDeviceId
      );

      // Update device activity
      await client.query(
        `UPDATE user_encryption_keys SET last_active_at = NOW()
         WHERE user_id = $1 AND device_id = $2`,
        [senderId, senderDeviceId]
      );

      const message: EncryptedMessage = {
        id: messageId,
        conversationId,
        senderId,
        senderFingerprint,
        senderDeviceId,
        protocolVersion: CRYPTO_CONSTANTS.CURRENT_PROTOCOL_VERSION,
        keyExchangeEphemeral,
        keyExchangeOnetimeId,
        ratchetPublicKey,
        messageNumber,
        previousChainLength,
        nonce,
        ciphertext,
        hasFileAttachment,
        contentType,
        nsfwScore,
        userMarkedAdult,
        createdAt: result.rows[0].created_at,
        expiresAt: expiresAt || undefined,
        deliveredCount: 0,
        readCount: 0,
      };

      // Publish to pubsub for real-time delivery
      await publish(PUBSUB_CHANNELS.MESSAGE_RECEIVED, {
        conversationId,
        messageId: message.id,
        senderId,
        timestamp: message.createdAt,
        isEncrypted: true,
      });

      log.debug(
        { messageId, conversationId, senderId: senderId.slice(0, 8) },
        'Encrypted message stored'
      );

      return message;
    });
  },

  /**
   * Simplified send function for GraphQL resolver
   * Parses the encrypted payload JSON and calls the full function
   */
  async sendEncryptedMessageSimple(input: SendEncryptedMessageSimpleInput): Promise<EncryptedMessage> {
    const { conversationId, senderId, encryptedPayload, messageType, replyToId, fileIds } = input;

    // Parse the encrypted payload
    let payload: EncryptedPayload;
    try {
      payload = JSON.parse(encryptedPayload);
    } catch (e) {
      throw new Error('Invalid encrypted payload: must be valid JSON');
    }

    // Get sender's device info
    const senderKeys = await keyManagementService.getKeyBundle(senderId);
    if (!senderKeys) {
      throw new Error('Sender has no registered encryption keys');
    }

    // Call the full send function with parsed payload
    return this.sendEncryptedMessage({
      conversationId,
      senderId,
      senderDeviceId: senderKeys.deviceId,
      senderFingerprint: payload.senderFingerprint,
      keyExchangeEphemeral: payload.keyExchange?.ephemeralKey,
      keyExchangeOnetimeId: payload.keyExchange?.usedOneTimePreKeyId,
      ratchetPublicKey: payload.header.ratchetPublicKey,
      messageNumber: payload.header.messageNumber,
      previousChainLength: payload.header.previousChainLength,
      nonce: payload.nonce,
      ciphertext: payload.ciphertext,
      hasFileAttachment: (fileIds?.length ?? 0) > 0,
      contentType: messageType || 'text',
    });
  },

  /**
   * Update session tracking when message is sent
   */
  async updateSessionOnMessageSent(
    client: any,
    conversationId: string,
    userId: string,
    deviceId: string
  ): Promise<void> {
    // Get all peer participants
    const peers = await client.query(
      `SELECT user_id FROM conversation_participants
       WHERE conversation_id = $1 AND user_id != $2`,
      [conversationId, userId]
    );

    for (const peer of peers.rows) {
      // Get peer's devices
      const peerDevices = await client.query(
        `SELECT device_id FROM user_encryption_keys WHERE user_id = $1`,
        [peer.user_id]
      );

      for (const peerDevice of peerDevices.rows) {
        await client.query(
          `INSERT INTO e2ee_sessions (
            conversation_id, user_id, device_id, peer_user_id, peer_device_id
          ) VALUES ($1, $2, $3, $4, $5)
          ON CONFLICT (conversation_id, user_id, device_id, peer_user_id, peer_device_id)
          DO UPDATE SET
            last_message_at = NOW(),
            messages_sent = e2ee_sessions.messages_sent + 1,
            last_ratchet_at = NOW(),
            ratchet_count = e2ee_sessions.ratchet_count + 1,
            updated_at = NOW()`,
          [conversationId, userId, deviceId, peer.user_id, peerDevice.device_id]
        );
      }
    }
  },

  // ==========================================
  // RECEIVE MESSAGES
  // ==========================================

  /**
   * Get encrypted messages in a conversation
   */
  async getMessages(
    conversationId: string,
    userId: string,
    options: {
      cursor?: { createdAt: Date; id: string };
      limit?: number;
      includeDeleted?: boolean;
    } = {}
  ): Promise<EncryptedMessageWithReceipts[]> {
    const { cursor, limit = 50, includeDeleted = false } = options;

    // Verify participant
    const isParticipant = await queryOne<{ user_id: string }>(
      `SELECT user_id FROM conversation_participants
       WHERE conversation_id = $1 AND user_id = $2`,
      [conversationId, userId]
    );

    if (!isParticipant) {
      throw new Error('Not a participant in this conversation');
    }

    let whereClause = 'em.conversation_id = $1';
    const params: any[] = [conversationId, userId, limit];

    if (!includeDeleted) {
      whereClause += ' AND em.deleted_at IS NULL';
    }

    if (cursor) {
      whereClause += ` AND (em.created_at, em.id) < ($${params.length + 1}, $${params.length + 2})`;
      params.push(cursor.createdAt, cursor.id);
    }

    const messages = await queryAll<{
      id: string;
      conversation_id: string;
      sender_id: string;
      sender_fingerprint: string;
      sender_device_id: string;
      protocol_version: number;
      key_exchange_ephemeral: string | null;
      key_exchange_onetime_id: number | null;
      ratchet_public_key: string;
      message_number: number;
      previous_chain_length: number;
      nonce: string;
      ciphertext: string;
      has_file_attachment: boolean;
      content_type: string;
      nsfw_score: number;
      user_marked_adult: boolean;
      created_at: Date;
      edited_at: Date | null;
      expires_at: Date | null;
      delivered_count: number;
      read_count: number;
      delivered_at: Date | null;
      read_at: Date | null;
    }>(
      `SELECT em.*,
              emr.delivered_at,
              emr.read_at
       FROM encrypted_messages em
       LEFT JOIN encrypted_message_receipts emr
         ON emr.message_id = em.id AND emr.user_id = $2
       WHERE ${whereClause}
       ORDER BY em.created_at DESC, em.id DESC
       LIMIT $3`,
      params
    );

    return messages.map((m) => ({
      id: m.id,
      conversationId: m.conversation_id,
      senderId: m.sender_id,
      senderFingerprint: m.sender_fingerprint,
      senderDeviceId: m.sender_device_id,
      protocolVersion: m.protocol_version,
      keyExchangeEphemeral: m.key_exchange_ephemeral || undefined,
      keyExchangeOnetimeId: m.key_exchange_onetime_id || undefined,
      ratchetPublicKey: m.ratchet_public_key,
      messageNumber: m.message_number,
      previousChainLength: m.previous_chain_length,
      nonce: m.nonce,
      ciphertext: m.ciphertext,
      hasFileAttachment: m.has_file_attachment,
      contentType: m.content_type,
      nsfwScore: m.nsfw_score,
      userMarkedAdult: m.user_marked_adult,
      createdAt: m.created_at,
      editedAt: m.edited_at || undefined,
      expiresAt: m.expires_at || undefined,
      deliveredCount: m.delivered_count,
      readCount: m.read_count,
      deliveredAt: m.delivered_at || undefined,
      readAt: m.read_at || undefined,
    }));
  },

  /**
   * Get a single encrypted message by ID
   */
  async getMessage(messageId: string, userId: string): Promise<EncryptedMessage | null> {
    const message = await queryOne<{
      id: string;
      conversation_id: string;
      sender_id: string;
      sender_fingerprint: string;
      sender_device_id: string;
      protocol_version: number;
      key_exchange_ephemeral: string | null;
      key_exchange_onetime_id: number | null;
      ratchet_public_key: string;
      message_number: number;
      previous_chain_length: number;
      nonce: string;
      ciphertext: string;
      has_file_attachment: boolean;
      content_type: string;
      nsfw_score: number;
      user_marked_adult: boolean;
      created_at: Date;
      edited_at: Date | null;
      expires_at: Date | null;
      delivered_count: number;
      read_count: number;
    }>(
      `SELECT em.* FROM encrypted_messages em
       JOIN conversation_participants cp ON cp.conversation_id = em.conversation_id
       WHERE em.id = $1 AND cp.user_id = $2 AND em.deleted_at IS NULL`,
      [messageId, userId]
    );

    if (!message) return null;

    return {
      id: message.id,
      conversationId: message.conversation_id,
      senderId: message.sender_id,
      senderFingerprint: message.sender_fingerprint,
      senderDeviceId: message.sender_device_id,
      protocolVersion: message.protocol_version,
      keyExchangeEphemeral: message.key_exchange_ephemeral || undefined,
      keyExchangeOnetimeId: message.key_exchange_onetime_id || undefined,
      ratchetPublicKey: message.ratchet_public_key,
      messageNumber: message.message_number,
      previousChainLength: message.previous_chain_length,
      nonce: message.nonce,
      ciphertext: message.ciphertext,
      hasFileAttachment: message.has_file_attachment,
      contentType: message.content_type,
      nsfwScore: message.nsfw_score,
      userMarkedAdult: message.user_marked_adult,
      createdAt: message.created_at,
      editedAt: message.edited_at || undefined,
      expiresAt: message.expires_at || undefined,
      deliveredCount: message.delivered_count,
      readCount: message.read_count,
    };
  },

  // ==========================================
  // DELIVERY & READ RECEIPTS
  // ==========================================

  /**
   * Mark message as delivered
   */
  async markDelivered(
    messageId: string,
    userId: string,
    deviceId?: string
  ): Promise<void> {
    await transaction(async (client) => {
      // Update receipt
      await client.query(
        `UPDATE encrypted_message_receipts
         SET delivered_at = COALESCE(delivered_at, NOW()), device_id = COALESCE(device_id, $3)
         WHERE message_id = $1 AND user_id = $2`,
        [messageId, userId, deviceId]
      );

      // Update message delivered count
      await client.query(
        `UPDATE encrypted_messages em
         SET delivered_count = (
           SELECT COUNT(*) FROM encrypted_message_receipts
           WHERE message_id = em.id AND delivered_at IS NOT NULL
         )
         WHERE id = $1`,
        [messageId]
      );

      // Publish delivery event
      const message = await client.query(
        `SELECT conversation_id, sender_id FROM encrypted_messages WHERE id = $1`,
        [messageId]
      );

      if (message.rows[0]) {
        await publish(PUBSUB_CHANNELS.DELIVERY, {
          messageId,
          conversationId: message.rows[0].conversation_id,
          deliveredTo: userId,
          deliveredAt: new Date(),
        });
      }
    });
  },

  /**
   * Mark message as read
   */
  async markRead(messageId: string, userId: string): Promise<void> {
    await transaction(async (client) => {
      // Update receipt
      await client.query(
        `UPDATE encrypted_message_receipts
         SET read_at = COALESCE(read_at, NOW()),
             delivered_at = COALESCE(delivered_at, NOW())
         WHERE message_id = $1 AND user_id = $2`,
        [messageId, userId]
      );

      // Update message read count
      await client.query(
        `UPDATE encrypted_messages em
         SET read_count = (
           SELECT COUNT(*) FROM encrypted_message_receipts
           WHERE message_id = em.id AND read_at IS NOT NULL
         )
         WHERE id = $1`,
        [messageId]
      );

      // Publish read event
      const messageResult = await client.query(
        `SELECT conversation_id, sender_id FROM encrypted_messages WHERE id = $1`,
        [messageId]
      );

      if (messageResult.rows[0]) {
        await publish(PUBSUB_CHANNELS.READ, {
          messageId,
          conversationId: messageResult.rows[0].conversation_id,
          readBy: userId,
          readAt: new Date(),
        });
      }
    });
  },

  /**
   * Mark all messages in conversation as read
   */
  async markConversationRead(conversationId: string, userId: string): Promise<number> {
    const result = await query(
      `UPDATE encrypted_message_receipts emr
       SET read_at = COALESCE(read_at, NOW()),
           delivered_at = COALESCE(delivered_at, NOW())
       FROM encrypted_messages em
       WHERE emr.message_id = em.id
         AND em.conversation_id = $1
         AND emr.user_id = $2
         AND emr.read_at IS NULL`,
      [conversationId, userId]
    );

    // Update read counts for all affected messages
    await query(
      `UPDATE encrypted_messages em
       SET read_count = (
         SELECT COUNT(*) FROM encrypted_message_receipts
         WHERE message_id = em.id AND read_at IS NOT NULL
       )
       WHERE conversation_id = $1`,
      [conversationId]
    );

    return result.rowCount || 0;
  },

  // ==========================================
  // MESSAGE OPERATIONS
  // ==========================================

  /**
   * Delete an encrypted message (soft delete)
   */
  async deleteMessage(messageId: string, userId: string): Promise<void> {
    const result = await query(
      `UPDATE encrypted_messages
       SET deleted_at = NOW()
       WHERE id = $1 AND sender_id = $2 AND deleted_at IS NULL
       RETURNING conversation_id`,
      [messageId, userId]
    );

    if (result.rowCount === 0) {
      throw new Error('Message not found or already deleted');
    }

    // Publish deletion event
    await publish(PUBSUB_CHANNELS.MESSAGE_RECEIVED, {
      conversationId: result.rows[0]?.conversation_id,
      messageId,
      type: 'deleted',
      deletedBy: userId,
      deletedAt: new Date(),
    });

    log.debug({ messageId, userId }, 'Encrypted message deleted');
  },

  /**
   * Get unread message count for a user
   */
  async getUnreadCount(userId: string): Promise<number> {
    const result = await queryOne<{ count: string }>(
      `SELECT COUNT(*) as count
       FROM encrypted_message_receipts emr
       JOIN encrypted_messages em ON em.id = emr.message_id
       WHERE emr.user_id = $1
         AND emr.read_at IS NULL
         AND em.deleted_at IS NULL
         AND em.sender_id != $1`,
      [userId]
    );

    return parseInt(result?.count || '0');
  },

  /**
   * Get unread count per conversation
   */
  async getUnreadCountsByConversation(userId: string): Promise<Map<string, number>> {
    const results = await queryAll<{ conversation_id: string; count: string }>(
      `SELECT em.conversation_id, COUNT(*) as count
       FROM encrypted_message_receipts emr
       JOIN encrypted_messages em ON em.id = emr.message_id
       WHERE emr.user_id = $1
         AND emr.read_at IS NULL
         AND em.deleted_at IS NULL
         AND em.sender_id != $1
       GROUP BY em.conversation_id`,
      [userId]
    );

    const counts = new Map<string, number>();
    for (const r of results) {
      counts.set(r.conversation_id, parseInt(r.count));
    }

    return counts;
  },

  // ==========================================
  // CONVERSATION E2EE MANAGEMENT
  // ==========================================

  /**
   * Check if a conversation is E2EE enabled
   */
  async isConversationE2EE(conversationId: string): Promise<boolean> {
    const result = await queryOne<{ is_e2ee: boolean }>(
      `SELECT is_e2ee FROM conversations WHERE id = $1`,
      [conversationId]
    );

    return result?.is_e2ee || false;
  },

  /**
   * Check if all participants have E2EE enabled
   */
  async canUpgradeToE2EE(conversationId: string): Promise<{
    canUpgrade: boolean;
    participantsWithoutE2EE: string[];
  }> {
    const participants = await queryAll<{ user_id: string; e2ee_enabled: boolean }>(
      `SELECT u.id as user_id, u.e2ee_enabled
       FROM conversation_participants cp
       JOIN users u ON u.id = cp.user_id
       WHERE cp.conversation_id = $1`,
      [conversationId]
    );

    const withoutE2EE = participants
      .filter((p) => !p.e2ee_enabled)
      .map((p) => p.user_id);

    return {
      canUpgrade: withoutE2EE.length === 0,
      participantsWithoutE2EE: withoutE2EE,
    };
  },

  /**
   * Upgrade conversation to E2EE
   */
  async upgradeConversationToE2EE(conversationId: string): Promise<void> {
    const { canUpgrade, participantsWithoutE2EE } = await this.canUpgradeToE2EE(conversationId);

    if (!canUpgrade) {
      throw new Error(
        `Cannot upgrade: ${participantsWithoutE2EE.length} participant(s) don't have E2EE enabled`
      );
    }

    await query(
      `UPDATE conversations
       SET is_e2ee = TRUE,
           e2ee_version = $2,
           e2ee_established_at = NOW(),
           updated_at = NOW()
       WHERE id = $1`,
      [conversationId, CRYPTO_CONSTANTS.CURRENT_PROTOCOL_VERSION]
    );

    log.info({ conversationId }, 'Conversation upgraded to E2EE');
  },

  // ==========================================
  // CLEANUP
  // ==========================================

  /**
   * Delete expired messages
   */
  async cleanupExpiredMessages(): Promise<number> {
    const result = await query(
      `DELETE FROM encrypted_messages
       WHERE expires_at IS NOT NULL AND expires_at < NOW()`
    );

    const deletedCount = result.rowCount || 0;
    if (deletedCount > 0) {
      log.info({ count: deletedCount }, 'Cleaned up expired encrypted messages');
    }

    return deletedCount;
  },

  /**
   * Clean up old deleted messages (hard delete after 30 days)
   */
  async cleanupDeletedMessages(): Promise<number> {
    const result = await query(
      `DELETE FROM encrypted_messages
       WHERE deleted_at IS NOT NULL AND deleted_at < NOW() - INTERVAL '30 days'`
    );

    const deletedCount = result.rowCount || 0;
    if (deletedCount > 0) {
      log.info({ count: deletedCount }, 'Hard deleted old encrypted messages');
    }

    return deletedCount;
  },
};

export default encryptedMessagingService;
