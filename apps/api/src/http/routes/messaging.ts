/**
 * Messaging Routes (Fastify)
 *
 * Handles conversations and direct messaging.
 */

import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import crypto from 'crypto';
import { authenticate, verifyToken } from './auth';
import { queryAll, queryOne, query } from '../../db/client';
import { loggers } from '../../lib/logger';

const log = loggers.core;

// Schemas
const createConversationSchema = z.object({
  type: z.enum(['direct', 'group']).default('direct'),
  name: z.string().optional(),
  participantIds: z.array(z.string()).min(1),
});

const sendMessageSchema = z.object({
  content: z.string().min(1).max(4000),
  contentType: z.enum(['text', 'image', 'file', 'system']).default('text'),
  replyToId: z.string().optional(),
});

function generateId(prefix: string): string {
  return `${prefix}_${crypto.randomBytes(12).toString('hex')}`;
}

export async function registerMessagingRoutes(app: FastifyInstance) {
  // Get user's conversations
  // Optimized: Single query with JOINs instead of N+1 pattern
  app.get('/messaging/conversations', { preHandler: authenticate }, async (request, reply) => {
    const userId = request.user!.userId;

    // Single optimized query that fetches conversations with:
    // - All participants (as JSON array)
    // - Last message info
    // - Unread count
    // - User's participant info (for read tracking)
    const conversations = await queryAll<{
      id: string;
      type: string;
      name: string;
      created_at: Date;
      last_message_at: Date;
      participants: Array<{
        user_id: string;
        username: string;
        display_name: string;
        avatar_url: string;
        role: string;
      }>;
      last_message_content: string | null;
      last_message_sender_id: string | null;
      last_message_created_at: Date | null;
      user_last_read_at: Date | null;
      user_joined_at: Date;
      unread_count: number;
    }>(
      `WITH user_conversations AS (
        -- Get all conversations the user is part of
        SELECT c.id, c.type, c.name, c.created_at, c.last_message_at,
               cp_user.last_read_at as user_last_read_at,
               cp_user.joined_at as user_joined_at
        FROM conversations c
        JOIN conversation_participants cp_user ON c.id = cp_user.conversation_id AND cp_user.user_id = $1
      ),
      conversation_participants_agg AS (
        -- Aggregate all participants per conversation
        SELECT cp.conversation_id,
               json_agg(json_build_object(
                 'user_id', cp.user_id,
                 'username', u.username,
                 'display_name', u.display_name,
                 'avatar_url', u.avatar_url,
                 'role', cp.role
               )) as participants
        FROM conversation_participants cp
        JOIN users u ON cp.user_id = u.id
        WHERE cp.conversation_id IN (SELECT id FROM user_conversations)
        GROUP BY cp.conversation_id
      ),
      last_messages AS (
        -- Get the last message for each conversation using DISTINCT ON
        SELECT DISTINCT ON (m.conversation_id)
               m.conversation_id,
               m.content as last_message_content,
               m.sender_id as last_message_sender_id,
               m.created_at as last_message_created_at
        FROM messages m
        WHERE m.conversation_id IN (SELECT id FROM user_conversations)
          AND m.deleted_at IS NULL
        ORDER BY m.conversation_id, m.created_at DESC
      ),
      unread_counts AS (
        -- Calculate unread count per conversation
        SELECT uc.id as conversation_id,
               COUNT(m.id)::int as unread_count
        FROM user_conversations uc
        LEFT JOIN messages m ON m.conversation_id = uc.id
          AND m.sender_id != $1
          AND m.deleted_at IS NULL
          AND m.created_at > COALESCE(uc.user_last_read_at, uc.user_joined_at)
        GROUP BY uc.id
      )
      SELECT
        uc.id, uc.type, uc.name, uc.created_at, uc.last_message_at,
        uc.user_last_read_at, uc.user_joined_at,
        COALESCE(cpa.participants, '[]'::json) as participants,
        lm.last_message_content,
        lm.last_message_sender_id,
        lm.last_message_created_at,
        COALESCE(urc.unread_count, 0) as unread_count
      FROM user_conversations uc
      LEFT JOIN conversation_participants_agg cpa ON uc.id = cpa.conversation_id
      LEFT JOIN last_messages lm ON uc.id = lm.conversation_id
      LEFT JOIN unread_counts urc ON uc.id = urc.conversation_id
      ORDER BY COALESCE(uc.last_message_at, uc.created_at) DESC`,
      [userId]
    );

    // Transform the result into the expected format
    const result = conversations.map((conv) => ({
      id: conv.id,
      type: conv.type,
      name: conv.name,
      createdAt: conv.created_at,
      lastMessageAt: conv.last_message_at,
      participants: (conv.participants || []).map((p: any) => ({
        userId: p.user_id,
        username: p.username,
        displayName: p.display_name,
        avatarUrl: p.avatar_url,
        role: p.role,
      })),
      lastMessage: conv.last_message_content
        ? {
            content: conv.last_message_content,
            senderId: conv.last_message_sender_id,
            createdAt: conv.last_message_created_at,
          }
        : null,
      unreadCount: conv.unread_count,
    }));

    return reply.send({ data: result });
  });

  // Create conversation
  app.post('/messaging/conversations', { preHandler: authenticate }, async (request, reply) => {
    const data = createConversationSchema.parse(request.body);
    const creatorId = request.user!.userId;

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
      // Check block status (bidirectional)
      const blocked = await queryOne(
        `SELECT 1 FROM user_blocks
         WHERE (blocker_id = $1 AND blocked_id = $2) OR (blocker_id = $2 AND blocked_id = $1)`,
        [creatorId, participantId]
      );
      if (blocked) {
        return reply.status(400).send({
          error: { code: 'BLOCKED', message: 'Cannot create conversation with blocked user', statusCode: 400 },
        });
      }

      // Check if the participant has disabled messaging
      const privacySettings = await queryOne<{ opt_out_messaging: boolean }>(
        `SELECT opt_out_messaging FROM user_privacy_mode WHERE user_id = $1`,
        [participantId]
      );
      if (privacySettings?.opt_out_messaging) {
        return reply.status(400).send({
          error: { code: 'MESSAGING_DISABLED', message: 'This user has disabled messaging', statusCode: 400 },
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

    log.info({ conversationId, type: data.type }, 'Conversation created');

    return reply.status(201).send({ data: { id: conversationId } });
  });

  // Get messages in conversation
  app.get('/messaging/conversations/:id/messages', { preHandler: authenticate }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const params = request.query as { limit?: string; before?: string };
    const limit = Math.min(parseInt(params.limit || '50'), 100);
    const userId = request.user!.userId;

    // Verify user is participant
    const participant = await queryOne(
      `SELECT 1 FROM conversation_participants WHERE conversation_id = $1 AND user_id = $2`,
      [id, userId]
    );

    if (!participant) {
      return reply.status(403).send({
        error: { code: 'FORBIDDEN', message: 'Not a participant in this conversation', statusCode: 403 },
      });
    }

    let sql = `
      SELECT m.*, u.username, u.display_name, u.avatar_url
      FROM messages m
      JOIN users u ON m.sender_id = u.id
      WHERE m.conversation_id = $1 AND m.deleted_at IS NULL
    `;
    const queryParams: any[] = [id];

    if (params.before) {
      sql += ` AND m.created_at < $${queryParams.length + 1}`;
      queryParams.push(params.before);
    }

    sql += ` ORDER BY m.created_at DESC LIMIT $${queryParams.length + 1}`;
    queryParams.push(limit);

    const messages = await queryAll(sql, queryParams);

    return reply.send({
      data: messages.reverse().map((m: any) => ({
        id: m.id,
        conversationId: m.conversation_id,
        content: m.content,
        contentType: m.content_type,
        replyToId: m.reply_to_id,
        editedAt: m.edited_at,
        createdAt: m.created_at,
        sender: {
          id: m.sender_id,
          username: m.username,
          displayName: m.display_name,
          avatarUrl: m.avatar_url,
        },
      })),
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
        error: { code: 'FORBIDDEN', message: 'Not a participant in this conversation', statusCode: 403 },
      });
    }

    // Get other participants to check their privacy settings and block status
    const otherParticipants = await queryAll<{ user_id: string }>(
      `SELECT user_id FROM conversation_participants WHERE conversation_id = $1 AND user_id != $2`,
      [id, senderId]
    );

    // Check if any recipient has blocked the sender or has messaging disabled
    for (const other of otherParticipants) {
      // Check block status
      const blocked = await queryOne(
        `SELECT 1 FROM user_blocks WHERE blocker_id = $1 AND blocked_id = $2`,
        [other.user_id, senderId]
      );
      if (blocked) {
        return reply.status(403).send({
          error: { code: 'BLOCKED', message: 'You cannot send messages to this user', statusCode: 403 },
        });
      }

      // Check if recipient has disabled messaging
      const privacySettings = await queryOne<{ opt_out_messaging: boolean }>(
        `SELECT opt_out_messaging FROM user_privacy_mode WHERE user_id = $1`,
        [other.user_id]
      );
      if (privacySettings?.opt_out_messaging) {
        return reply.status(403).send({
          error: { code: 'MESSAGING_DISABLED', message: 'This user has disabled messaging', statusCode: 403 },
        });
      }
    }

    // Validate reply target
    if (data.replyToId) {
      const replyTarget = await queryOne(
        `SELECT id FROM messages WHERE id = $1 AND conversation_id = $2`,
        [data.replyToId, id]
      );
      if (!replyTarget) {
        return reply.status(400).send({
          error: { code: 'VALIDATION', message: 'Reply target message not found', statusCode: 400 },
        });
      }
    }

    const messageId = generateId('msg');
    const now = new Date().toISOString();

    await query(
      `INSERT INTO messages (id, conversation_id, sender_id, content, content_type, reply_to_id, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [messageId, id, senderId, data.content, data.contentType, data.replyToId || null, now]
    );

    // Update conversation
    await query(
      `UPDATE conversations SET last_message_at = $1, updated_at = $1 WHERE id = $2`,
      [now, id]
    );

    log.info({ messageId, conversationId: id, senderId }, 'Message sent');

    // Get sender info
    const sender = await queryOne<{ username: string; display_name: string; avatar_url: string }>(
      `SELECT username, display_name, avatar_url FROM users WHERE id = $1`,
      [senderId]
    );

    return reply.status(201).send({
      data: {
        id: messageId,
        conversationId: id,
        content: data.content,
        contentType: data.contentType,
        replyToId: data.replyToId,
        createdAt: now,
        sender: {
          id: senderId,
          username: sender?.username,
          displayName: sender?.display_name,
          avatarUrl: sender?.avatar_url,
        },
      },
    });
  });

  // Get total unread message count across all conversations
  app.get('/messaging/unread-count', { preHandler: authenticate }, async (request, reply) => {
    const userId = request.user!.userId;

    // Count unread messages across all conversations the user is part of
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

  // Mark as read
  app.post('/messaging/conversations/:id/read', { preHandler: authenticate }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const userId = request.user!.userId;

    await query(
      `UPDATE conversation_participants SET last_read_at = NOW() WHERE conversation_id = $1 AND user_id = $2`,
      [id, userId]
    );

    return reply.send({ data: { acknowledged: true } });
  });

  // Delete message
  app.delete('/messaging/messages/:id', { preHandler: authenticate }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const userId = request.user!.userId;

    const message = await queryOne<{ sender_id: string }>(
      `SELECT sender_id FROM messages WHERE id = $1`,
      [id]
    );

    if (!message) {
      return reply.status(404).send({
        error: { code: 'NOT_FOUND', message: 'Message not found', statusCode: 404 },
      });
    }

    if (message.sender_id !== userId) {
      return reply.status(403).send({
        error: { code: 'FORBIDDEN', message: 'Can only delete your own messages', statusCode: 403 },
      });
    }

    await query(`UPDATE messages SET deleted_at = NOW() WHERE id = $1`, [id]);

    log.info({ messageId: id, userId }, 'Message deleted');

    return reply.send({ data: { deleted: true } });
  });

  // Block user
  app.post('/messaging/block/:userId', { preHandler: authenticate }, async (request, reply) => {
    const { userId: blockedId } = request.params as { userId: string };
    const blockerId = request.user!.userId;

    await query(
      `INSERT INTO user_blocks (blocker_id, blocked_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
      [blockerId, blockedId]
    );

    log.info({ blockerId, blockedId }, 'User blocked');

    return reply.send({ data: { blocked: true } });
  });

  // Unblock user
  app.delete('/messaging/block/:userId', { preHandler: authenticate }, async (request, reply) => {
    const { userId: blockedId } = request.params as { userId: string };
    const blockerId = request.user!.userId;

    await query(
      `DELETE FROM user_blocks WHERE blocker_id = $1 AND blocked_id = $2`,
      [blockerId, blockedId]
    );

    log.info({ blockerId, blockedId }, 'User unblocked');

    return reply.send({ data: { unblocked: true } });
  });

  // Get list of blocked users
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
      data: blockedUsers.map(b => ({
        userId: b.blocked_id,
        username: b.username,
        displayName: b.display_name,
        avatarUrl: b.avatar_url,
        blockedAt: b.created_at,
      })),
    });
  });

  // Check if a specific user is blocked
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
        isBlocked: !!blocked,      // Current user has blocked target
        isBlockedBy: !!blockedBy,  // Target has blocked current user
      },
    });
  });

  // Get messaging privacy settings
  app.get('/messaging/privacy', { preHandler: authenticate }, async (request, reply) => {
    const userId = request.user!.userId;

    const settings = await queryOne<{ opt_out_messaging: boolean }>(
      `SELECT opt_out_messaging FROM user_privacy_mode WHERE user_id = $1`,
      [userId]
    );

    return reply.send({
      data: {
        messagingEnabled: !settings?.opt_out_messaging,
      },
    });
  });

  // Update messaging privacy settings
  app.put('/messaging/privacy', { preHandler: authenticate }, async (request, reply) => {
    const userId = request.user!.userId;
    const { enabled } = request.body as { enabled: boolean };

    await query(
      `INSERT INTO user_privacy_mode (user_id, opt_out_messaging, updated_at)
       VALUES ($1, $2, NOW())
       ON CONFLICT (user_id) DO UPDATE SET opt_out_messaging = $2, updated_at = NOW()`,
      [userId, !enabled]
    );

    log.info({ userId, messagingEnabled: enabled }, 'Messaging privacy updated');

    return reply.send({
      data: { messagingEnabled: enabled },
    });
  });

  // WebSocket for messaging
  app.get('/messaging/ws', { websocket: true }, (socket, request) => {
    const token = (request.query as { token?: string }).token;

    if (!token) {
      socket.close(1008, 'Missing token');
      return;
    }

    try {
      const user = verifyToken(token);

      log.info({ userId: user.userId }, 'Messaging WebSocket connected');

      socket.on('message', (data) => {
        try {
          const message = JSON.parse(data.toString());
          if (message.type === 'ping') {
            socket.send(JSON.stringify({ type: 'pong' }));
          }
        } catch (err) {
          log.warn({ error: err }, 'Invalid WebSocket message format');
        }
      });

      socket.on('close', () => {
        log.info({ userId: user.userId }, 'Messaging WebSocket disconnected');
      });
    } catch {
      socket.close(1008, 'Invalid token');
    }
  });
}
