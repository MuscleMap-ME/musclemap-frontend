/**
 * Enhanced Messaging Routes (Fastify)
 *
 * Comprehensive messaging API with all advanced features:
 * - Core messaging (send, edit, delete)
 * - Typing indicators
 * - Presence system
 * - Delivery/read receipts
 * - Message reactions
 * - Message search
 * - Voice messages
 * - Link previews
 * - Scheduled messages
 * - Message forwarding and pinning
 * - Rate limiting
 * - Push notifications
 * - Content sharing
 * - Conversation management
 */

import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import crypto from 'crypto';
import { authenticate, verifyToken } from '../../http/routes/auth';
import { queryAll, queryOne, query } from '../../db/client';
import { loggers } from '../../lib/logger';
import * as messagingService from './messaging.service';

const log = loggers.core;

// ============================================
// SCHEMAS
// ============================================

const createConversationSchema = z.object({
  type: z.enum(['direct', 'group']).default('direct'),
  name: z.string().max(100).optional(),
  participantIds: z.array(z.string()).min(1).max(50),
});

const sendMessageSchema = z.object({
  content: z.string().min(1).max(4000),
  contentType: z.enum(['text', 'image', 'file', 'voice', 'sticker', 'gif', 'system']).default('text'),
  replyToId: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
});

const editMessageSchema = z.object({
  content: z.string().min(1).max(4000),
});

const reactionSchema = z.object({
  emoji: z.string().min(1).max(32),
});

const searchSchema = z.object({
  query: z.string().min(2).max(200),
  conversationId: z.string().optional(),
  fromUserId: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  limit: z.number().min(1).max(100).default(20),
  offset: z.number().min(0).default(0),
});

const forwardSchema = z.object({
  toConversationIds: z.array(z.string()).min(1).max(10),
  addComment: z.string().max(1000).optional(),
});

// Scheduled message schema (used by messaging.service.ts)
const _scheduleMessageSchema = z.object({
  content: z.string().min(1).max(4000),
  scheduledFor: z.string(), // ISO date string
  timezone: z.string().default('UTC'),
});

const templateSchema = z.object({
  name: z.string().min(1).max(50),
  content: z.string().min(1).max(4000),
  shortcut: z.string().max(20).optional(),
  category: z.string().max(50).optional(),
});

const pushSubscriptionSchema = z.object({
  endpoint: z.string().url(),
  keys: z.object({
    p256dh: z.string(),
    auth: z.string(),
  }),
  deviceType: z.enum(['web', 'mobile', 'desktop']).default('web'),
  deviceName: z.string().max(100).optional(),
});

const notificationPrefsSchema = z.object({
  messagingEnabled: z.boolean().optional(),
  messagingSound: z.boolean().optional(),
  messagingPreview: z.boolean().optional(),
  messagingVibrate: z.boolean().optional(),
  quietHoursEnabled: z.boolean().optional(),
  quietHoursStart: z.string().optional(), // HH:mm
  quietHoursEnd: z.string().optional(), // HH:mm
});

const shareContentSchema = z.object({
  contentType: z.enum(['workout', 'achievement', 'challenge', 'profile']),
  contentId: z.string(),
  previewData: z.record(z.unknown()).optional(),
});

const reportSchema = z.object({
  reason: z.enum(['spam', 'harassment', 'inappropriate', 'other']),
  details: z.string().max(1000).optional(),
});

const disappearingSchema = z.object({
  ttlSeconds: z.number().nullable(), // null to disable
});

function generateId(prefix: string): string {
  return `${prefix}_${crypto.randomBytes(12).toString('hex')}`;
}

// ============================================
// ROUTE REGISTRATION
// ============================================

export async function registerEnhancedMessagingRoutes(app: FastifyInstance) {
  // ============================================
  // CONVERSATIONS
  // ============================================

  // Get user's conversations (optimized)
  app.get('/messaging/conversations', { preHandler: authenticate }, async (request, reply) => {
    const userId = request.user!.userId;
    const params = request.query as { tab?: string; limit?: string; cursor?: string };
    const tab = params.tab || 'inbox';
    const limit = Math.min(parseInt(params.limit || '50'), 100);

    let sql = `
      WITH user_conversations AS (
        SELECT c.id, c.type, c.name, c.created_at, c.last_message_at,
               c.archived_at, c.disappearing_ttl,
               cp_user.last_read_at as user_last_read_at,
               cp_user.joined_at as user_joined_at,
               cp_user.starred as starred,
               cp_user.muted as muted
        FROM conversations c
        JOIN conversation_participants cp_user ON c.id = cp_user.conversation_id AND cp_user.user_id = $1
    `;

    // Filter by tab
    if (tab === 'starred') {
      sql += ` WHERE cp_user.starred = true`;
    } else if (tab === 'archived') {
      sql += ` WHERE c.archived_at IS NOT NULL`;
    } else {
      sql += ` WHERE c.archived_at IS NULL`;
    }

    sql += `
      ),
      conversation_participants_agg AS (
        SELECT cp.conversation_id,
               json_agg(json_build_object(
                 'user_id', cp.user_id,
                 'username', u.username,
                 'display_name', u.display_name,
                 'avatar_url', u.avatar_url,
                 'role', cp.role,
                 'last_active_at', u.last_active_at
               )) as participants
        FROM conversation_participants cp
        JOIN users u ON cp.user_id = u.id
        WHERE cp.conversation_id IN (SELECT id FROM user_conversations)
        GROUP BY cp.conversation_id
      ),
      last_messages AS (
        SELECT DISTINCT ON (m.conversation_id)
               m.conversation_id,
               m.id as last_message_id,
               m.content as last_message_content,
               m.content_type as last_message_type,
               m.sender_id as last_message_sender_id,
               m.created_at as last_message_created_at
        FROM messages m
        WHERE m.conversation_id IN (SELECT id FROM user_conversations)
          AND m.deleted_at IS NULL
        ORDER BY m.conversation_id, m.created_at DESC
      ),
      unread_counts AS (
        SELECT uc.id as conversation_id,
               COUNT(m.id)::int as unread_count
        FROM user_conversations uc
        LEFT JOIN messages m ON m.conversation_id = uc.id
          AND m.sender_id != $1
          AND m.deleted_at IS NULL
          AND m.created_at > COALESCE(uc.user_last_read_at, uc.user_joined_at)
        GROUP BY uc.id
      ),
      typing_users AS (
        SELECT ti.conversation_id,
               json_agg(json_build_object(
                 'user_id', ti.user_id,
                 'username', u.username
               )) as typing
        FROM typing_indicators ti
        JOIN users u ON ti.user_id = u.id
        WHERE ti.conversation_id IN (SELECT id FROM user_conversations)
          AND ti.started_at > NOW() - INTERVAL '5 seconds'
          AND ti.user_id != $1
        GROUP BY ti.conversation_id
      )
      SELECT
        uc.id, uc.type, uc.name, uc.created_at, uc.last_message_at,
        uc.user_last_read_at, uc.user_joined_at, uc.starred, uc.muted,
        uc.archived_at, uc.disappearing_ttl,
        COALESCE(cpa.participants, '[]'::json) as participants,
        lm.last_message_id,
        lm.last_message_content,
        lm.last_message_type,
        lm.last_message_sender_id,
        lm.last_message_created_at,
        COALESCE(urc.unread_count, 0) as unread_count,
        COALESCE(tu.typing, '[]'::json) as typing_users
      FROM user_conversations uc
      LEFT JOIN conversation_participants_agg cpa ON uc.id = cpa.conversation_id
      LEFT JOIN last_messages lm ON uc.id = lm.conversation_id
      LEFT JOIN unread_counts urc ON uc.id = urc.conversation_id
      LEFT JOIN typing_users tu ON uc.id = tu.conversation_id
      ORDER BY COALESCE(uc.last_message_at, uc.created_at) DESC
      LIMIT $2
    `;

    const conversations = await queryAll(sql, [userId, limit]);

    const result = conversations.map((conv: any) => {
      const participants = (conv.participants || []).filter((p: any) => p.user_id !== userId);

      return {
        id: conv.id,
        type: conv.type,
        name: conv.name || (conv.type === 'direct' ? participants[0]?.display_name || participants[0]?.username : null),
        createdAt: conv.created_at,
        lastMessageAt: conv.last_message_at,
        starred: conv.starred,
        muted: conv.muted,
        archived: !!conv.archived_at,
        disappearingTtl: conv.disappearing_ttl,
        participants: conv.participants.map((p: any) => ({
          userId: p.user_id,
          username: p.username,
          displayName: p.display_name,
          avatarUrl: p.avatar_url,
          role: p.role,
          isOnline: p.last_active_at && new Date(p.last_active_at) > new Date(Date.now() - 5 * 60 * 1000),
        })),
        lastMessage: conv.last_message_content
          ? {
              id: conv.last_message_id,
              content: conv.last_message_content,
              type: conv.last_message_type,
              senderId: conv.last_message_sender_id,
              createdAt: conv.last_message_created_at,
            }
          : null,
        unreadCount: conv.unread_count,
        typingUsers: conv.typing_users,
      };
    });

    return reply.send({ data: result });
  });

  // Create conversation
  app.post('/messaging/conversations', { preHandler: authenticate }, async (request, reply) => {
    const data = createConversationSchema.parse(request.body);
    const creatorId = request.user!.userId;

    // Check rate limit
    const rateLimit = await messagingService.checkRateLimit(creatorId);
    if (rateLimit.conversationsRemaining <= 0) {
      return reply.status(429).send({
        error: {
          code: 'RATE_LIMIT',
          message: 'Too many conversations created today',
          resetAt: rateLimit.resetAt,
        },
      });
    }

    // For direct messages, check if conversation already exists
    if (data.type === 'direct' && data.participantIds.length === 1) {
      const existing = await queryOne<{ id: string }>(
        `SELECT c.id
         FROM conversations c
         JOIN conversation_participants cp1 ON c.id = cp1.conversation_id AND cp1.user_id = $1
         JOIN conversation_participants cp2 ON c.id = cp2.conversation_id AND cp2.user_id = $2
         WHERE c.type = 'direct'
         LIMIT 1`,
        [creatorId, data.participantIds[0]]
      );

      if (existing) {
        return reply.send({ data: { id: existing.id, existing: true } });
      }
    }

    // Check for blocked users and privacy settings
    for (const participantId of data.participantIds) {
      const blocked = await queryOne(
        `SELECT 1 FROM user_blocks
         WHERE (blocker_id = $1 AND blocked_id = $2) OR (blocker_id = $2 AND blocked_id = $1)`,
        [creatorId, participantId]
      );
      if (blocked) {
        return reply.status(400).send({
          error: { code: 'BLOCKED', message: 'Cannot create conversation with blocked user' },
        });
      }

      const privacySettings = await queryOne<{ opt_out_messaging: boolean }>(
        `SELECT opt_out_messaging FROM user_privacy_mode WHERE user_id = $1`,
        [participantId]
      );
      if (privacySettings?.opt_out_messaging) {
        return reply.status(400).send({
          error: { code: 'MESSAGING_DISABLED', message: 'This user has disabled messaging' },
        });
      }
    }

    const conversationId = generateId('conv');
    const now = new Date().toISOString();

    await query(
      `INSERT INTO conversations (id, type, name, created_by, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [conversationId, data.type, data.name || null, creatorId, now, now]
    );

    // Add creator as owner
    await query(
      `INSERT INTO conversation_participants (conversation_id, user_id, joined_at, role)
       VALUES ($1, $2, $3, 'owner')`,
      [conversationId, creatorId, now]
    );

    // Add other participants
    for (const participantId of data.participantIds) {
      await query(
        `INSERT INTO conversation_participants (conversation_id, user_id, joined_at, role)
         VALUES ($1, $2, $3, 'member')`,
        [conversationId, participantId, now]
      );
    }

    await messagingService.incrementRateLimit(creatorId, 'conversation');

    log.info({ conversationId, type: data.type }, 'Conversation created');

    return reply.status(201).send({ data: { id: conversationId } });
  });

  // Archive/unarchive conversation
  app.post('/messaging/conversations/:id/archive', { preHandler: authenticate }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const userId = request.user!.userId;

    await messagingService.archiveConversation(id, userId);
    return reply.send({ data: { archived: true } });
  });

  app.delete('/messaging/conversations/:id/archive', { preHandler: authenticate }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const userId = request.user!.userId;

    await messagingService.unarchiveConversation(id, userId);
    return reply.send({ data: { archived: false } });
  });

  // Star/unstar conversation
  app.post('/messaging/conversations/:id/star', { preHandler: authenticate }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const userId = request.user!.userId;

    await messagingService.starConversation(id, userId);
    return reply.send({ data: { starred: true } });
  });

  app.delete('/messaging/conversations/:id/star', { preHandler: authenticate }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const userId = request.user!.userId;

    await messagingService.unstarConversation(id, userId);
    return reply.send({ data: { starred: false } });
  });

  // Set disappearing messages
  app.put('/messaging/conversations/:id/disappearing', { preHandler: authenticate }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const userId = request.user!.userId;
    const { ttlSeconds } = disappearingSchema.parse(request.body);

    await messagingService.setDisappearingMessages(id, userId, ttlSeconds);
    return reply.send({ data: { ttlSeconds } });
  });

  // ============================================
  // MESSAGES
  // ============================================

  // Get messages in conversation (with keyset pagination)
  app.get('/messaging/conversations/:id/messages', { preHandler: authenticate }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const params = request.query as { limit?: string; before?: string; beforeId?: string };
    const limit = Math.min(parseInt(params.limit || '50'), 100);
    const userId = request.user!.userId;

    // Verify user is participant
    const participant = await queryOne(
      `SELECT 1 FROM conversation_participants WHERE conversation_id = $1 AND user_id = $2`,
      [id, userId]
    );

    if (!participant) {
      return reply.status(403).send({
        error: { code: 'FORBIDDEN', message: 'Not a participant in this conversation' },
      });
    }

    let sql = `
      SELECT m.*,
             u.username as sender_username,
             u.display_name as sender_display_name,
             u.avatar_url as sender_avatar_url,
             COALESCE(
               (SELECT json_agg(json_build_object('emoji', emoji, 'count', count, 'users', users))
                FROM (
                  SELECT emoji, COUNT(*)::int as count, array_agg(user_id) as users
                  FROM message_reactions
                  WHERE message_id = m.id
                  GROUP BY emoji
                ) r
               ), '[]'::json
             ) as reactions,
             (SELECT json_build_object(
               'id', rm.id,
               'content', rm.content,
               'sender_id', rm.sender_id,
               'sender_username', ru.username
             )
             FROM messages rm
             JOIN users ru ON rm.sender_id = ru.id
             WHERE rm.id = m.reply_to_id
             ) as reply_to,
             (SELECT json_build_object(
               'content_type', msc.content_type,
               'content_id', msc.content_id,
               'preview_data', msc.preview_data
             )
             FROM message_shared_content msc
             WHERE msc.message_id = m.id
             LIMIT 1
             ) as shared_content
      FROM messages m
      JOIN users u ON m.sender_id = u.id
      WHERE m.conversation_id = $1 AND m.deleted_at IS NULL
    `;
    const queryParams: any[] = [id];

    // Keyset pagination
    if (params.before && params.beforeId) {
      sql += ` AND (m.created_at, m.id) < ($${queryParams.length + 1}, $${queryParams.length + 2})`;
      queryParams.push(params.before, params.beforeId);
    } else if (params.before) {
      sql += ` AND m.created_at < $${queryParams.length + 1}`;
      queryParams.push(params.before);
    }

    sql += ` ORDER BY m.created_at DESC, m.id DESC LIMIT $${queryParams.length + 1}`;
    queryParams.push(limit);

    const messages = await queryAll(sql, queryParams);

    return reply.send({
      data: messages.reverse().map((m: any) => ({
        id: m.id,
        conversationId: m.conversation_id,
        content: m.content,
        contentType: m.content_type,
        replyToId: m.reply_to_id,
        replyTo: m.reply_to,
        threadRootId: m.thread_root_id,
        replyCount: m.reply_count,
        forwardedFromId: m.forwarded_from_id,
        editedAt: m.edited_at,
        editCount: m.edit_count,
        pinnedAt: m.pinned_at,
        pinnedBy: m.pinned_by,
        expiresAt: m.expires_at,
        createdAt: m.created_at,
        reactions: m.reactions,
        sharedContent: m.shared_content,
        sender: {
          id: m.sender_id,
          username: m.sender_username,
          displayName: m.sender_display_name,
          avatarUrl: m.sender_avatar_url,
        },
      })),
      cursor: messages.length > 0
        ? { before: messages[0].created_at, beforeId: messages[0].id }
        : null,
    });
  });

  // Send message
  app.post('/messaging/conversations/:id/messages', { preHandler: authenticate }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const data = sendMessageSchema.parse(request.body);
    const senderId = request.user!.userId;

    // Verify user is participant
    const participant = await queryOne(
      `SELECT 1 FROM conversation_participants WHERE conversation_id = $1 AND user_id = $2`,
      [id, senderId]
    );

    if (!participant) {
      return reply.status(403).send({
        error: { code: 'FORBIDDEN', message: 'Not a participant in this conversation' },
      });
    }

    // Check rate limit
    const rateLimit = await messagingService.checkRateLimit(senderId);
    if (rateLimit.messagesRemaining <= 0) {
      return reply.status(429).send({
        error: {
          code: 'RATE_LIMIT',
          message: 'Too many messages sent, please slow down',
          resetAt: rateLimit.resetAt,
        },
      });
    }

    // Get recipient count and check credits
    const recipientCount = await queryOne<{ count: string }>(
      `SELECT COUNT(*) as count FROM conversation_participants WHERE conversation_id = $1 AND user_id != $2`,
      [id, senderId]
    );
    const cost = parseInt(recipientCount?.count || '0', 10) * 0.1;

    if (cost > 0) {
      const hasCredits = await messagingService.deductCredits(senderId, cost);
      if (!hasCredits) {
        return reply.status(402).send({
          error: {
            code: 'INSUFFICIENT_CREDITS',
            message: `Insufficient credits. Need ${cost.toFixed(1)} credits.`,
            required: cost,
          },
        });
      }
    }

    // Check blocks and privacy
    const otherParticipants = await queryAll<{ user_id: string }>(
      `SELECT user_id FROM conversation_participants WHERE conversation_id = $1 AND user_id != $2`,
      [id, senderId]
    );

    for (const other of otherParticipants) {
      const blocked = await queryOne(
        `SELECT 1 FROM user_blocks WHERE blocker_id = $1 AND blocked_id = $2`,
        [other.user_id, senderId]
      );
      if (blocked) {
        return reply.status(403).send({
          error: { code: 'BLOCKED', message: 'You cannot send messages to this user' },
        });
      }
    }

    // Validate reply target
    if (data.replyToId) {
      const replyTarget = await queryOne(
        `SELECT id FROM messages WHERE id = $1 AND conversation_id = $2 AND deleted_at IS NULL`,
        [data.replyToId, id]
      );
      if (!replyTarget) {
        return reply.status(400).send({
          error: { code: 'VALIDATION', message: 'Reply target message not found' },
        });
      }
    }

    // Send message
    const message = await messagingService.sendMessage(id, senderId, data.content, {
      contentType: data.contentType,
      replyToId: data.replyToId,
      metadata: data.metadata,
    });

    await messagingService.incrementRateLimit(senderId, 'message');

    // Clear typing indicator
    await messagingService.setTypingStatus(id, senderId, false);

    // Get sender info
    const sender = await queryOne<{ username: string; display_name: string; avatar_url: string }>(
      `SELECT username, display_name, avatar_url FROM users WHERE id = $1`,
      [senderId]
    );

    return reply.status(201).send({
      data: {
        id: message.id,
        conversationId: message.conversationId,
        content: message.content,
        contentType: message.contentType,
        replyToId: message.replyToId,
        expiresAt: message.expiresAt,
        createdAt: message.createdAt,
        sender: {
          id: senderId,
          username: sender?.username,
          displayName: sender?.display_name,
          avatarUrl: sender?.avatar_url,
        },
      },
    });
  });

  // Edit message
  app.put('/messaging/messages/:id', { preHandler: authenticate }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const { content } = editMessageSchema.parse(request.body);
    const userId = request.user!.userId;

    try {
      const message = await messagingService.editMessage(id, userId, content);
      return reply.send({ data: message });
    } catch (error: any) {
      return reply.status(400).send({
        error: { code: 'EDIT_FAILED', message: error.message },
      });
    }
  });

  // Delete message
  app.delete('/messaging/messages/:id', { preHandler: authenticate }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const userId = request.user!.userId;

    try {
      await messagingService.deleteMessage(id, userId);
      return reply.send({ data: { deleted: true } });
    } catch (error: any) {
      return reply.status(400).send({
        error: { code: 'DELETE_FAILED', message: error.message },
      });
    }
  });

  // Forward message
  app.post('/messaging/messages/:id/forward', { preHandler: authenticate }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const { toConversationIds, addComment } = forwardSchema.parse(request.body);
    const userId = request.user!.userId;

    try {
      const messages = await messagingService.forwardMessage(id, userId, toConversationIds, addComment);
      return reply.status(201).send({ data: messages });
    } catch (error: any) {
      return reply.status(400).send({
        error: { code: 'FORWARD_FAILED', message: error.message },
      });
    }
  });

  // Pin message
  app.post('/messaging/messages/:id/pin', { preHandler: authenticate }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const userId = request.user!.userId;

    try {
      const message = await messagingService.pinMessage(id, userId);
      return reply.send({ data: message });
    } catch (error: any) {
      return reply.status(400).send({
        error: { code: 'PIN_FAILED', message: error.message },
      });
    }
  });

  app.delete('/messaging/messages/:id/pin', { preHandler: authenticate }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const userId = request.user!.userId;

    try {
      await messagingService.unpinMessage(id, userId);
      return reply.send({ data: { unpinned: true } });
    } catch (error: any) {
      return reply.status(400).send({
        error: { code: 'UNPIN_FAILED', message: error.message },
      });
    }
  });

  // Get pinned messages
  app.get('/messaging/conversations/:id/pinned', { preHandler: authenticate }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const userId = request.user!.userId;

    // Verify participant
    const participant = await queryOne(
      `SELECT 1 FROM conversation_participants WHERE conversation_id = $1 AND user_id = $2`,
      [id, userId]
    );

    if (!participant) {
      return reply.status(403).send({
        error: { code: 'FORBIDDEN', message: 'Not a participant' },
      });
    }

    const pinned = await messagingService.getPinnedMessages(id);
    return reply.send({ data: pinned });
  });

  // Report message
  app.post('/messaging/messages/:id/report', { preHandler: authenticate }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const { reason, details } = reportSchema.parse(request.body);
    const userId = request.user!.userId;

    await messagingService.reportMessage(id, userId, reason, details);
    return reply.send({ data: { reported: true } });
  });

  // ============================================
  // REACTIONS
  // ============================================

  app.post('/messaging/messages/:id/reactions', { preHandler: authenticate }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const { emoji } = reactionSchema.parse(request.body);
    const userId = request.user!.userId;

    const reaction = await messagingService.addReaction(id, userId, emoji);
    return reply.status(201).send({ data: reaction });
  });

  app.delete('/messaging/messages/:id/reactions/:emoji', { preHandler: authenticate }, async (request, reply) => {
    const { id, emoji } = request.params as { id: string; emoji: string };
    const userId = request.user!.userId;

    await messagingService.removeReaction(id, userId, decodeURIComponent(emoji));
    return reply.send({ data: { removed: true } });
  });

  app.get('/messaging/messages/:id/reactions', { preHandler: authenticate }, async (request, reply) => {
    const { id } = request.params as { id: string };

    const reactions = await messagingService.getReactions(id);
    return reply.send({ data: reactions });
  });

  // ============================================
  // TYPING INDICATORS
  // ============================================

  app.post('/messaging/conversations/:id/typing', { preHandler: authenticate }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const { isTyping } = request.body as { isTyping: boolean };
    const userId = request.user!.userId;

    await messagingService.setTypingStatus(id, userId, isTyping);
    return reply.send({ data: { acknowledged: true } });
  });

  app.get('/messaging/conversations/:id/typing', { preHandler: authenticate }, async (request, reply) => {
    const { id } = request.params as { id: string };

    const typing = await messagingService.getTypingUsers(id);
    return reply.send({ data: typing });
  });

  // ============================================
  // PRESENCE
  // ============================================

  app.post('/messaging/presence', { preHandler: authenticate }, async (request, reply) => {
    const { status, device } = request.body as { status: 'online' | 'away' | 'offline'; device?: string };
    const userId = request.user!.userId;

    await messagingService.updatePresence(userId, status, device);
    return reply.send({ data: { acknowledged: true } });
  });

  app.get('/messaging/presence/:userId', { preHandler: authenticate }, async (request, reply) => {
    const { userId } = request.params as { userId: string };

    const presence = await messagingService.getPresence(userId);
    return reply.send({ data: presence });
  });

  app.post('/messaging/presence/bulk', { preHandler: authenticate }, async (request, reply) => {
    const { userIds } = request.body as { userIds: string[] };

    const presenceMap = await messagingService.getBulkPresence(userIds);
    return reply.send({
      data: Object.fromEntries(presenceMap),
    });
  });

  // ============================================
  // READ RECEIPTS
  // ============================================

  app.post('/messaging/conversations/:id/read', { preHandler: authenticate }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const userId = request.user!.userId;

    await messagingService.markRead(id, userId);
    return reply.send({ data: { acknowledged: true } });
  });

  app.post('/messaging/messages/:id/delivered', { preHandler: authenticate }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const userId = request.user!.userId;

    await messagingService.markDelivered(id, userId);
    return reply.send({ data: { acknowledged: true } });
  });

  app.get('/messaging/messages/:id/receipts', { preHandler: authenticate }, async (request, reply) => {
    const { id } = request.params as { id: string };

    const receipts = await messagingService.getMessageReceipts(id);
    return reply.send({ data: receipts });
  });

  // ============================================
  // SEARCH
  // ============================================

  app.get('/messaging/search', { preHandler: authenticate }, async (request, reply) => {
    const params = searchSchema.parse(request.query);
    const userId = request.user!.userId;

    const results = await messagingService.searchMessages(userId, params.query, {
      conversationId: params.conversationId,
      fromUserId: params.fromUserId,
      startDate: params.startDate ? new Date(params.startDate) : undefined,
      endDate: params.endDate ? new Date(params.endDate) : undefined,
      limit: params.limit,
      offset: params.offset,
    });

    return reply.send({
      data: results.messages,
      total: results.total,
      hasMore: params.offset + results.messages.length < results.total,
    });
  });

  // ============================================
  // SCHEDULED MESSAGES
  // ============================================

  app.post('/messaging/scheduled', { preHandler: authenticate }, async (request, reply) => {
    const { conversationId, content, scheduledFor, timezone } = request.body as any;
    const userId = request.user!.userId;

    // Verify participant
    const participant = await queryOne(
      `SELECT 1 FROM conversation_participants WHERE conversation_id = $1 AND user_id = $2`,
      [conversationId, userId]
    );

    if (!participant) {
      return reply.status(403).send({
        error: { code: 'FORBIDDEN', message: 'Not a participant' },
      });
    }

    const scheduled = await messagingService.scheduleMessage(
      conversationId,
      userId,
      content,
      new Date(scheduledFor),
      timezone
    );

    return reply.status(201).send({ data: scheduled });
  });

  app.get('/messaging/scheduled', { preHandler: authenticate }, async (request, reply) => {
    const userId = request.user!.userId;

    const scheduled = await messagingService.getScheduledMessages(userId);
    return reply.send({ data: scheduled });
  });

  app.delete('/messaging/scheduled/:id', { preHandler: authenticate }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const userId = request.user!.userId;

    const cancelled = await messagingService.cancelScheduledMessage(id, userId);
    return reply.send({ data: { cancelled } });
  });

  // ============================================
  // TEMPLATES
  // ============================================

  app.post('/messaging/templates', { preHandler: authenticate }, async (request, reply) => {
    const data = templateSchema.parse(request.body);
    const userId = request.user!.userId;

    const template = await messagingService.createTemplate(userId, data.name, data.content, {
      shortcut: data.shortcut,
      category: data.category,
    });

    return reply.status(201).send({ data: template });
  });

  app.get('/messaging/templates', { preHandler: authenticate }, async (request, reply) => {
    const userId = request.user!.userId;

    const templates = await messagingService.getTemplates(userId);
    return reply.send({ data: templates });
  });

  app.post('/messaging/templates/:id/use', { preHandler: authenticate }, async (request, reply) => {
    const { id } = request.params as { id: string };

    const content = await messagingService.useTemplate(id);
    return reply.send({ data: { content } });
  });

  // ============================================
  // CONTENT SHARING
  // ============================================

  app.post('/messaging/conversations/:id/share', { preHandler: authenticate }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const { contentType, contentId, previewData } = shareContentSchema.parse(request.body);
    const userId = request.user!.userId;

    // Verify participant
    const participant = await queryOne(
      `SELECT 1 FROM conversation_participants WHERE conversation_id = $1 AND user_id = $2`,
      [id, userId]
    );

    if (!participant) {
      return reply.status(403).send({
        error: { code: 'FORBIDDEN', message: 'Not a participant' },
      });
    }

    const message = await messagingService.shareContent(id, userId, contentType, contentId, previewData);
    return reply.status(201).send({ data: message });
  });

  // ============================================
  // PUSH NOTIFICATIONS
  // ============================================

  app.post('/messaging/push/subscribe', { preHandler: authenticate }, async (request, reply) => {
    const data = pushSubscriptionSchema.parse(request.body);
    const userId = request.user!.userId;

    await messagingService.registerPushSubscription(userId, data.endpoint, data.keys, data.deviceType, data.deviceName);
    return reply.send({ data: { subscribed: true } });
  });

  app.delete('/messaging/push/subscribe', { preHandler: authenticate }, async (request, reply) => {
    const { endpoint } = request.body as { endpoint: string };
    const userId = request.user!.userId;

    await messagingService.unregisterPushSubscription(userId, endpoint);
    return reply.send({ data: { unsubscribed: true } });
  });

  // ============================================
  // NOTIFICATION PREFERENCES
  // ============================================

  app.get('/messaging/notifications/preferences', { preHandler: authenticate }, async (request, reply) => {
    const userId = request.user!.userId;

    const prefs = await queryOne<{
      messaging_enabled: boolean;
      messaging_sound: boolean;
      messaging_preview: boolean;
      messaging_vibrate: boolean;
      quiet_hours_enabled: boolean;
      quiet_hours_start: string;
      quiet_hours_end: string;
    }>(`SELECT * FROM notification_preferences WHERE user_id = $1`, [userId]);

    return reply.send({
      data: prefs || {
        messagingEnabled: true,
        messagingSound: true,
        messagingPreview: true,
        messagingVibrate: true,
        quietHoursEnabled: false,
        quietHoursStart: null,
        quietHoursEnd: null,
      },
    });
  });

  app.put('/messaging/notifications/preferences', { preHandler: authenticate }, async (request, reply) => {
    const data = notificationPrefsSchema.parse(request.body);
    const userId = request.user!.userId;

    await query(
      `INSERT INTO notification_preferences (
        user_id, messaging_enabled, messaging_sound, messaging_preview,
        messaging_vibrate, quiet_hours_enabled, quiet_hours_start, quiet_hours_end
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      ON CONFLICT (user_id) DO UPDATE SET
        messaging_enabled = COALESCE($2, notification_preferences.messaging_enabled),
        messaging_sound = COALESCE($3, notification_preferences.messaging_sound),
        messaging_preview = COALESCE($4, notification_preferences.messaging_preview),
        messaging_vibrate = COALESCE($5, notification_preferences.messaging_vibrate),
        quiet_hours_enabled = COALESCE($6, notification_preferences.quiet_hours_enabled),
        quiet_hours_start = COALESCE($7, notification_preferences.quiet_hours_start),
        quiet_hours_end = COALESCE($8, notification_preferences.quiet_hours_end),
        updated_at = NOW()`,
      [
        userId,
        data.messagingEnabled,
        data.messagingSound,
        data.messagingPreview,
        data.messagingVibrate,
        data.quietHoursEnabled,
        data.quietHoursStart,
        data.quietHoursEnd,
      ]
    );

    return reply.send({ data: { updated: true } });
  });

  // ============================================
  // ANALYTICS
  // ============================================

  app.get('/messaging/analytics', { preHandler: authenticate }, async (request, reply) => {
    const userId = request.user!.userId;
    const params = request.query as { startDate?: string; endDate?: string };

    const startDate = params.startDate ? new Date(params.startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const endDate = params.endDate ? new Date(params.endDate) : new Date();

    const analytics = await messagingService.getMessageAnalytics(userId, startDate, endDate);
    return reply.send({ data: analytics });
  });

  // ============================================
  // UNREAD COUNT
  // ============================================

  app.get('/messaging/unread-count', { preHandler: authenticate }, async (request, reply) => {
    const userId = request.user!.userId;

    const result = await queryOne<{ count: string }>(
      `SELECT COALESCE(SUM(
        (SELECT COUNT(*)
         FROM messages m
         WHERE m.conversation_id = cp.conversation_id
           AND m.sender_id != cp.user_id
           AND m.deleted_at IS NULL
           AND m.created_at > COALESCE(cp.last_read_at, cp.joined_at))
      ), 0)::int as count
      FROM conversation_participants cp
      WHERE cp.user_id = $1`,
      [userId]
    );

    return reply.send({ data: { unreadCount: parseInt(result?.count || '0', 10) } });
  });

  // ============================================
  // BLOCKS (retained from original)
  // ============================================

  app.post('/messaging/block/:userId', { preHandler: authenticate }, async (request, reply) => {
    const { userId: blockedId } = request.params as { userId: string };
    const blockerId = request.user!.userId;

    await query(
      `INSERT INTO user_blocks (blocker_id, blocked_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
      [blockerId, blockedId]
    );

    return reply.send({ data: { blocked: true } });
  });

  app.delete('/messaging/block/:userId', { preHandler: authenticate }, async (request, reply) => {
    const { userId: blockedId } = request.params as { userId: string };
    const blockerId = request.user!.userId;

    await query(`DELETE FROM user_blocks WHERE blocker_id = $1 AND blocked_id = $2`, [blockerId, blockedId]);
    return reply.send({ data: { unblocked: true } });
  });

  app.get('/messaging/blocked', { preHandler: authenticate }, async (request, reply) => {
    const userId = request.user!.userId;

    const blockedUsers = await queryAll<{
      blocked_id: string;
      username: string;
      display_name: string;
      avatar_url: string;
      created_at: Date;
    }>(
      `SELECT ub.blocked_id, u.username, u.display_name, u.avatar_url, ub.created_at
       FROM user_blocks ub
       JOIN users u ON ub.blocked_id = u.id
       WHERE ub.blocker_id = $1
       ORDER BY ub.created_at DESC`,
      [userId]
    );

    return reply.send({
      data: blockedUsers.map((b) => ({
        userId: b.blocked_id,
        username: b.username,
        displayName: b.display_name,
        avatarUrl: b.avatar_url,
        blockedAt: b.created_at,
      })),
    });
  });

  app.get('/messaging/block/:userId', { preHandler: authenticate }, async (request, reply) => {
    const { userId: targetId } = request.params as { userId: string };
    const userId = request.user!.userId;

    const blocked = await queryOne(
      `SELECT 1 FROM user_blocks WHERE blocker_id = $1 AND blocked_id = $2`,
      [userId, targetId]
    );

    const blockedBy = await queryOne(
      `SELECT 1 FROM user_blocks WHERE blocker_id = $1 AND blocked_id = $2`,
      [targetId, userId]
    );

    return reply.send({
      data: {
        isBlocked: !!blocked,
        isBlockedBy: !!blockedBy,
      },
    });
  });

  // ============================================
  // WEBSOCKET
  // ============================================

  app.get('/messaging/ws', { websocket: true }, (socket, request) => {
    const token = (request.query as { token?: string }).token;

    if (!token) {
      socket.close(1008, 'Missing token');
      return;
    }

    try {
      const user = verifyToken(token);
      const userId = user.userId;

      log.info({ userId }, 'Messaging WebSocket connected');

      // Update presence to online
      messagingService.updatePresence(userId, 'online', 'web');

      // Set up heartbeat
      let lastHeartbeat = Date.now();
      const heartbeatInterval = setInterval(() => {
        if (Date.now() - lastHeartbeat > 60000) {
          // No heartbeat for 60s
          socket.close(1000, 'Heartbeat timeout');
        }
      }, 30000);

      socket.on('message', async (data) => {
        try {
          const message = JSON.parse(data.toString());

          switch (message.type) {
            case 'ping':
              lastHeartbeat = Date.now();
              socket.send(JSON.stringify({ type: 'pong' }));
              break;

            case 'typing':
              if (message.conversationId) {
                await messagingService.setTypingStatus(message.conversationId, userId, message.isTyping);
              }
              break;

            case 'presence':
              await messagingService.updatePresence(userId, message.status || 'online', message.device);
              break;

            case 'delivered':
              if (message.messageId) {
                await messagingService.markDelivered(message.messageId, userId);
              }
              break;

            case 'read':
              if (message.conversationId) {
                await messagingService.markRead(message.conversationId, userId);
              }
              break;
          }
        } catch (err) {
          log.warn({ error: err }, 'Invalid WebSocket message format');
        }
      });

      socket.on('close', () => {
        clearInterval(heartbeatInterval);
        messagingService.updatePresence(userId, 'offline');
        log.info({ userId }, 'Messaging WebSocket disconnected');
      });
    } catch {
      socket.close(1008, 'Invalid token');
    }
  });

  log.info('Enhanced messaging routes registered');
}
