/**
 * E2EE (End-to-End Encryption) GraphQL Resolvers
 *
 * Resolvers for secure messaging with Signal Protocol compatible encryption.
 *
 * Security Model:
 * - Server NEVER sees plaintext messages (zero-knowledge)
 * - Keys are stored encrypted at rest
 * - File attachments go directly to R2 (not stored on server)
 * - Age verification required for adult content
 * - Trust scoring prevents abuse
 */

import { GraphQLError } from 'graphql';
import { queryOne, queryAll, query } from '../db/client';
import {
  keyManagementService,
  encryptedMessagingService,
  fileStorageService,
  contentPreferencesService,
} from '../modules/e2ee';
import { PUBSUB_CHANNELS, publish } from '../lib/pubsub';
import { loggers } from '../lib/logger';

const log = loggers.api.child({ module: 'e2ee-resolvers' });

// ============================================
// HELPER FUNCTIONS
// ============================================

interface Context {
  user?: { id: string; username?: string };
}

function requireAuth(context: Context): { userId: string } {
  if (!context.user?.id) {
    throw new GraphQLError('Authentication required', {
      extensions: { code: 'UNAUTHENTICATED' },
    });
  }
  return { userId: context.user.id };
}

// ============================================
// QUERY RESOLVERS
// ============================================

export const e2eeQueries = {
  // Key Management
  myKeyBundle: async (_: unknown, __: unknown, context: Context) => {
    const { userId } = requireAuth(context);
    const bundle = await keyManagementService.getKeyBundle(userId);
    if (!bundle) return null;

    // Get device info
    const devices = await keyManagementService.getUserDevices(userId);
    const currentDevice = devices.find((d) => d.deviceId === bundle.deviceId);

    return {
      ...bundle,
      deviceName: currentDevice?.deviceName,
      deviceType: currentDevice?.deviceType,
      prekeyCount: bundle.oneTimePreKeys?.length ?? 0,
    };
  },

  userKeyBundle: async (
    _: unknown,
    { userId }: { userId: string },
    context: Context
  ) => {
    requireAuth(context);
    const bundle = await keyManagementService.getKeyBundle(userId);
    if (!bundle) return null;

    // Don't expose device details to other users
    return {
      userId: bundle.userId,
      identityKey: bundle.identityKeyPublic,
      signedPreKey: bundle.signedPreKeyPublic,
      signedPreKeySignature: bundle.signedPreKeySignature,
      hasOneTimePreKey: (bundle.oneTimePreKeys?.length ?? 0) > 0,
    };
  },

  myDevices: async (_: unknown, __: unknown, context: Context) => {
    const { userId } = requireAuth(context);
    return keyManagementService.getUserDevices(userId);
  },

  // Encrypted Messages
  encryptedMessages: async (
    _: unknown,
    args: {
      conversationId: string;
      limit?: number;
      cursor?: { createdAt: string; id: string };
    },
    context: Context
  ) => {
    const { userId } = requireAuth(context);

    // Verify user is participant in conversation
    const participant = await queryOne(
      `SELECT 1 FROM conversation_participants WHERE conversation_id = $1 AND user_id = $2`,
      [args.conversationId, userId]
    );

    if (!participant) {
      throw new GraphQLError('Not a participant in this conversation', {
        extensions: { code: 'FORBIDDEN' },
      });
    }

    const messages = await encryptedMessagingService.getMessages(
      args.conversationId,
      userId,
      {
        limit: args.limit ?? 50,
        cursor: args.cursor ? { createdAt: new Date(args.cursor.createdAt), id: args.cursor.id } : undefined,
      }
    );

    return {
      messages,
      hasMore: messages.length === (args.limit ?? 50),
      cursor:
        messages.length > 0
          ? {
              createdAt: messages[messages.length - 1].createdAt,
              id: messages[messages.length - 1].id,
            }
          : null,
    };
  },

  // Privacy & Content Settings
  myContentPreferences: async (_: unknown, __: unknown, context: Context) => {
    const { userId } = requireAuth(context);
    return contentPreferencesService.getContentPreferences(userId);
  },

  myMessagingPrivacy: async (_: unknown, __: unknown, context: Context) => {
    const { userId } = requireAuth(context);
    return contentPreferencesService.getMessagingPrivacy(userId);
  },

  myTrustScore: async (_: unknown, __: unknown, context: Context) => {
    const { userId } = requireAuth(context);
    return contentPreferencesService.getTrustScore(userId);
  },

  // Check if can message a user
  canMessageUser: async (
    _: unknown,
    { targetUserId }: { targetUserId: string },
    context: Context
  ) => {
    const { userId } = requireAuth(context);
    return contentPreferencesService.canMessageUser(userId, targetUserId);
  },

  // Check if conversation can upgrade to E2EE
  canUpgradeToE2EE: async (
    _: unknown,
    { conversationId }: { conversationId: string },
    context: Context
  ) => {
    const { userId } = requireAuth(context);

    // Verify user is participant
    const participant = await queryOne(
      `SELECT 1 FROM conversation_participants WHERE conversation_id = $1 AND user_id = $2`,
      [conversationId, userId]
    );

    if (!participant) {
      throw new GraphQLError('Not a participant in this conversation', {
        extensions: { code: 'FORBIDDEN' },
      });
    }

    return encryptedMessagingService.canUpgradeToE2EE(conversationId);
  },

  // File metadata (encrypted, so only recipient can decrypt)
  encryptedFileMetadata: async (
    _: unknown,
    { fileId }: { fileId: string },
    context: Context
  ) => {
    const { userId } = requireAuth(context);

    const file = await queryOne(
      `SELECT * FROM encrypted_file_metadata WHERE id = $1`,
      [fileId]
    );

    if (!file) {
      throw new GraphQLError('File not found', {
        extensions: { code: 'NOT_FOUND' },
      });
    }

    // Check if user can access (sender or recipient)
    if (file.uploader_id !== userId) {
      // Check if user is recipient of a message with this file
      const hasAccess = await queryOne(
        `SELECT 1 FROM encrypted_messages em
         JOIN conversation_participants cp ON cp.conversation_id = em.conversation_id
         WHERE em.encrypted_payload::text LIKE $1
         AND cp.user_id = $2`,
        [`%${fileId}%`, userId]
      );

      if (!hasAccess) {
        throw new GraphQLError('Access denied', {
          extensions: { code: 'FORBIDDEN' },
        });
      }
    }

    return file;
  },

  // Message requests (from non-friends/followers)
  messageRequests: async (
    _: unknown,
    { status }: { status?: string },
    context: Context
  ) => {
    const { userId } = requireAuth(context);

    const requests = await queryAll(
      `SELECT mr.*, u.username, u.display_name, u.avatar_url
       FROM message_requests mr
       JOIN users u ON u.id = mr.sender_id
       WHERE mr.recipient_id = $1
       ${status ? `AND mr.status = $2` : ''}
       ORDER BY mr.created_at DESC
       LIMIT 100`,
      status ? [userId, status] : [userId]
    );

    return requests.map((r) => ({
      id: r.id,
      senderId: r.sender_id,
      senderUsername: r.username,
      senderDisplayName: r.display_name,
      senderAvatarUrl: r.avatar_url,
      message: r.initial_message,
      status: r.status,
      createdAt: r.created_at,
      respondedAt: r.responded_at,
    }));
  },
};

// ============================================
// MUTATION RESOLVERS
// ============================================

export const e2eeMutations = {
  // Key Management
  registerEncryptionKeys: async (
    _: unknown,
    {
      input,
    }: {
      input: {
        deviceId: string;
        deviceName?: string;
        deviceType?: string;
        identityKey: string;
        signedPreKey: string;
        signedPreKeyId: number;
        signedPreKeySignature: string;
        oneTimePreKeys?: Array<{ id: number; key: string }>;
      };
    },
    context: Context
  ) => {
    const { userId } = requireAuth(context);

    await keyManagementService.registerKeys({
      userId,
      deviceId: input.deviceId,
      deviceName: input.deviceName,
      deviceType: input.deviceType,
      identityKeyPublic: input.identityKey,
      signedPreKeyPublic: input.signedPreKey,
      signedPreKeyId: input.signedPreKeyId,
      signedPreKeySignature: input.signedPreKeySignature,
      oneTimePreKeys: input.oneTimePreKeys?.map(k => ({ id: k.id, publicKey: k.key })),
    });

    return { success: true };
  },

  uploadOneTimePreKeys: async (
    _: unknown,
    {
      input,
    }: {
      input: {
        deviceId: string;
        preKeys: Array<{ id: number; key: string }>;
      };
    },
    context: Context
  ) => {
    const { userId } = requireAuth(context);

    await keyManagementService.uploadOneTimePreKeys(
      userId,
      input.deviceId,
      input.preKeys.map(k => ({ id: k.id, publicKey: k.key }))
    );

    return { success: true, count: input.preKeys.length };
  },

  rotateSignedPreKey: async (
    _: unknown,
    {
      input,
    }: {
      input: {
        deviceId: string;
        signedPreKey: string;
        signedPreKeyId: number;
        signedPreKeySignature: string;
      };
    },
    context: Context
  ) => {
    const { userId } = requireAuth(context);

    // Update signed prekey
    await query(
      `UPDATE user_encryption_keys
       SET signed_prekey = $1,
           signed_prekey_id = $2,
           signed_prekey_signature = $3,
           signed_prekey_rotated_at = NOW(),
           updated_at = NOW()
       WHERE user_id = $4 AND device_id = $5`,
      [
        input.signedPreKey,
        input.signedPreKeyId,
        input.signedPreKeySignature,
        userId,
        input.deviceId,
      ]
    );

    return { success: true };
  },

  removeDevice: async (
    _: unknown,
    { deviceId }: { deviceId: string },
    context: Context
  ) => {
    const { userId } = requireAuth(context);
    await keyManagementService.removeDevice(userId, deviceId);
    return { success: true };
  },

  // Encrypted Messaging
  sendEncryptedMessage: async (
    _: unknown,
    {
      input,
    }: {
      input: {
        conversationId: string;
        encryptedPayload: string;
        messageType?: string;
        replyToId?: string;
        fileIds?: string[];
      };
    },
    context: Context
  ) => {
    const { userId } = requireAuth(context);

    // Verify user can send to this conversation
    const participant = await queryOne(
      `SELECT 1 FROM conversation_participants WHERE conversation_id = $1 AND user_id = $2`,
      [input.conversationId, userId]
    );

    if (!participant) {
      throw new GraphQLError('Not a participant in this conversation', {
        extensions: { code: 'FORBIDDEN' },
      });
    }

    const message = await encryptedMessagingService.sendEncryptedMessageSimple({
      conversationId: input.conversationId,
      senderId: userId,
      encryptedPayload: input.encryptedPayload,
      messageType: input.messageType,
      replyToId: input.replyToId,
      fileIds: input.fileIds,
    });

    // Publish to message channel for real-time delivery
    await publish(PUBSUB_CHANNELS.MESSAGE_RECEIVED, {
      conversationId: input.conversationId,
      messageId: message.id,
      senderId: userId,
      timestamp: message.createdAt,
      isEncrypted: true,
    });

    return message;
  },

  markEncryptedMessageDelivered: async (
    _: unknown,
    { messageId }: { messageId: string },
    context: Context
  ) => {
    const { userId } = requireAuth(context);
    await encryptedMessagingService.markDelivered(messageId, userId);
    return { success: true };
  },

  markEncryptedMessageRead: async (
    _: unknown,
    { messageId }: { messageId: string },
    context: Context
  ) => {
    const { userId } = requireAuth(context);
    await encryptedMessagingService.markRead(messageId, userId);
    return { success: true };
  },

  deleteEncryptedMessage: async (
    _: unknown,
    { messageId }: { messageId: string },
    context: Context
  ) => {
    const { userId } = requireAuth(context);
    await encryptedMessagingService.deleteMessage(messageId, userId);
    return { success: true };
  },

  // File Uploads (returns presigned URL)
  requestFileUpload: async (
    _: unknown,
    {
      input,
    }: {
      input: {
        fileName: string;
        fileSize: number;
        mimeType: string;
        encryptedMetadata: string;
        nsfwClassification?: string;
      };
    },
    context: Context
  ) => {
    const { userId } = requireAuth(context);

    const result = await fileStorageService.requestUploadUrl(userId, {
      fileName: input.fileName,
      fileSize: input.fileSize,
      mimeType: input.mimeType,
      encryptedMetadata: input.encryptedMetadata,
      nsfwClassification: input.nsfwClassification,
    });

    return result;
  },

  confirmFileUpload: async (
    _: unknown,
    {
      input,
    }: {
      input: {
        uploadToken: string;
        encryptedKey: string;
        contentHash: string;
      };
    },
    context: Context
  ) => {
    const { userId } = requireAuth(context);

    const file = await fileStorageService.confirmUpload(
      userId,
      input.uploadToken,
      input.encryptedKey,
      input.contentHash
    );

    return file;
  },

  getFileDownloadUrl: async (
    _: unknown,
    { fileId }: { fileId: string },
    context: Context
  ) => {
    const { userId } = requireAuth(context);
    const url = await fileStorageService.getDownloadUrl(fileId, userId);
    return { url };
  },

  // Content Preferences
  updateContentPreferences: async (
    _: unknown,
    {
      input,
    }: {
      input: {
        adultContentEnabled?: boolean;
        nsfwWarningsEnabled?: boolean;
        autoBlurNsfw?: boolean;
      };
    },
    context: Context
  ) => {
    const { userId } = requireAuth(context);

    // Check age verification before enabling adult content
    if (input.adultContentEnabled) {
      const prefs = await contentPreferencesService.getContentPreferences(userId);
      if (!prefs || (prefs as any).ageVerificationLevel === 'none') {
        throw new GraphQLError(
          'Age verification required to enable adult content',
          { extensions: { code: 'FORBIDDEN' } }
        );
      }
    }

    await query(
      `UPDATE user_content_preferences
       SET adult_content_enabled = COALESCE($1, adult_content_enabled),
           nsfw_warnings_enabled = COALESCE($2, nsfw_warnings_enabled),
           auto_blur_nsfw = COALESCE($3, auto_blur_nsfw),
           updated_at = NOW()
       WHERE user_id = $4`,
      [
        input.adultContentEnabled,
        input.nsfwWarningsEnabled,
        input.autoBlurNsfw,
        userId,
      ]
    );

    return contentPreferencesService.getContentPreferences(userId);
  },

  verifyAge: async (
    _: unknown,
    {
      input,
    }: {
      input: {
        birthDate: string;
        consentToTerms: boolean;
      };
    },
    context: Context
  ) => {
    const { userId } = requireAuth(context);

    const result = await contentPreferencesService.verifyAgeSelfDeclaration(
      userId,
      new Date(input.birthDate)
    );

    return result;
  },

  // Messaging Privacy
  updateMessagingPrivacy: async (
    _: unknown,
    {
      input,
    }: {
      input: {
        allowMessagesFrom?: string;
        allowFileAttachments?: string;
        allowVoiceMessages?: string;
        readReceiptsEnabled?: boolean;
        typingIndicatorsEnabled?: boolean;
        onlineStatusVisible?: boolean;
        lastSeenVisible?: boolean;
      };
    },
    context: Context
  ) => {
    const { userId } = requireAuth(context);

    await query(
      `INSERT INTO user_messaging_privacy (
         user_id, allow_messages_from, allow_file_attachments,
         allow_voice_messages, read_receipts_enabled,
         typing_indicators_enabled, online_status_visible,
         last_seen_visible
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT (user_id) DO UPDATE SET
         allow_messages_from = COALESCE($2, user_messaging_privacy.allow_messages_from),
         allow_file_attachments = COALESCE($3, user_messaging_privacy.allow_file_attachments),
         allow_voice_messages = COALESCE($4, user_messaging_privacy.allow_voice_messages),
         read_receipts_enabled = COALESCE($5, user_messaging_privacy.read_receipts_enabled),
         typing_indicators_enabled = COALESCE($6, user_messaging_privacy.typing_indicators_enabled),
         online_status_visible = COALESCE($7, user_messaging_privacy.online_status_visible),
         last_seen_visible = COALESCE($8, user_messaging_privacy.last_seen_visible),
         updated_at = NOW()`,
      [
        userId,
        input.allowMessagesFrom,
        input.allowFileAttachments,
        input.allowVoiceMessages,
        input.readReceiptsEnabled,
        input.typingIndicatorsEnabled,
        input.onlineStatusVisible,
        input.lastSeenVisible,
      ]
    );

    return contentPreferencesService.getMessagingPrivacy(userId);
  },

  // Message Requests
  respondToMessageRequest: async (
    _: unknown,
    {
      requestId,
      accept,
    }: {
      requestId: string;
      accept: boolean;
    },
    context: Context
  ) => {
    const { userId } = requireAuth(context);

    const request = await queryOne(
      `UPDATE message_requests
       SET status = $1, responded_at = NOW()
       WHERE id = $2 AND recipient_id = $3
       RETURNING *`,
      [accept ? 'accepted' : 'declined', requestId, userId]
    );

    if (!request) {
      throw new GraphQLError('Message request not found', {
        extensions: { code: 'NOT_FOUND' },
      });
    }

    // If accepted, create conversation
    if (accept) {
      const conversation = await queryOne(
        `INSERT INTO conversations (type, created_by)
         VALUES ('direct', $1)
         RETURNING id`,
        [request.sender_id]
      );

      if (conversation) {
        await query(
          `INSERT INTO conversation_participants (conversation_id, user_id)
           VALUES ($1, $2), ($1, $3)`,
          [conversation.id, request.sender_id, userId]
        );

        return { success: true, conversationId: conversation.id };
      }
    }

    return { success: true };
  },

  // Report encrypted content
  reportEncryptedContent: async (
    _: unknown,
    {
      input,
    }: {
      input: {
        messageId?: string;
        fileId?: string;
        reportType: string;
        description?: string;
        decryptedEvidence?: string;
      };
    },
    context: Context
  ) => {
    const { userId } = requireAuth(context);

    if (!input.messageId && !input.fileId) {
      throw new GraphQLError('Must provide messageId or fileId', {
        extensions: { code: 'BAD_USER_INPUT' },
      });
    }

    const report = await queryOne(
      `INSERT INTO encrypted_content_reports (
         reporter_id, message_id, file_id, report_type,
         description, decrypted_evidence
       ) VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id`,
      [
        userId,
        input.messageId,
        input.fileId,
        input.reportType,
        input.description,
        input.decryptedEvidence,
      ]
    );

    if (report) {
      log.info('E2EE content reported', {
        reportId: report.id,
        reporterId: userId,
        reportType: input.reportType,
      });

      return { success: true, reportId: report.id };
    }

    return { success: false };
  },

  // Upgrade conversation to E2EE
  upgradeToE2EE: async (
    _: unknown,
    { conversationId }: { conversationId: string },
    context: Context
  ) => {
    const { userId } = requireAuth(context);

    // Verify participant
    const participant = await queryOne(
      `SELECT 1 FROM conversation_participants WHERE conversation_id = $1 AND user_id = $2`,
      [conversationId, userId]
    );

    if (!participant) {
      throw new GraphQLError('Not a participant in this conversation', {
        extensions: { code: 'FORBIDDEN' },
      });
    }

    // Check all participants have E2EE keys
    const canUpgrade = await encryptedMessagingService.canUpgradeToE2EE(conversationId);
    if (!canUpgrade.canUpgrade) {
      throw new GraphQLError(
        `Cannot upgrade: ${canUpgrade.participantsWithoutE2EE?.length ?? 0} users missing encryption keys`,
        { extensions: { code: 'BAD_USER_INPUT' } }
      );
    }

    // Mark conversation as E2EE enabled
    await query(
      `UPDATE conversations SET e2ee_enabled = true, updated_at = NOW() WHERE id = $1`,
      [conversationId]
    );

    // Notify participants
    await publish(PUBSUB_CHANNELS.CONVERSATION_UPDATED, {
      conversationId,
      type: 'e2ee_enabled',
      enabledBy: userId,
    });

    return { success: true };
  },
};

// ============================================
// TYPE RESOLVERS
// ============================================

export const e2eeTypeResolvers = {
  EncryptedMessage: {
    sender: async (parent: { senderId: string }) => {
      return queryOne(
        `SELECT id, username, display_name, avatar_url FROM users WHERE id = $1`,
        [parent.senderId]
      );
    },
    receipts: async (parent: { id: string }) => {
      return queryAll(
        `SELECT * FROM encrypted_message_receipts WHERE message_id = $1`,
        [parent.id]
      );
    },
    files: async (parent: { fileIds?: string[] }) => {
      if (!parent.fileIds?.length) return [];
      return queryAll(
        `SELECT * FROM encrypted_file_metadata WHERE id = ANY($1)`,
        [parent.fileIds]
      );
    },
  },

  EncryptedFileMetadata: {
    uploader: async (parent: { uploaderId: string }) => {
      return queryOne(
        `SELECT id, username, display_name, avatar_url FROM users WHERE id = $1`,
        [parent.uploaderId]
      );
    },
  },

  ContentPreferences: {
    // Resolve verification details if needed
    lastVerifiedAt: (parent: { ageVerifiedAt?: Date }) => parent.ageVerifiedAt,
  },

  TrustScore: {
    // Compute trust level from score
    trustLevel: (parent: { score: number }) => {
      if (parent.score >= 90) return 'excellent';
      if (parent.score >= 70) return 'good';
      if (parent.score >= 50) return 'fair';
      if (parent.score >= 30) return 'poor';
      return 'untrusted';
    },
  },
};

// ============================================
// SUBSCRIPTION RESOLVERS
// ============================================

export const e2eeSubscriptions = {
  encryptedMessageReceived: {
    subscribe: (_: unknown, { conversationId }: { conversationId: string }, context: Context) => {
      if (!context.user?.id) {
        throw new GraphQLError('Authentication required', {
          extensions: { code: 'UNAUTHENTICATED' },
        });
      }

      // Note: Actual subscription implementation depends on your pubsub setup
      // This is a placeholder for the subscription resolver
      return {
        [Symbol.asyncIterator]() {
          return this;
        },
        next() {
          return Promise.resolve({ done: true, value: undefined });
        },
      };
    },
  },
};
