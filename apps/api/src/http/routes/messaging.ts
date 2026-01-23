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
 * - Rate limiting with credit deduction
 * - Push notifications
 * - Content sharing (workouts, achievements, etc.)
 * - Conversation management (archive, star, mute)
 * - Disappearing messages
 */

import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import crypto from 'crypto';
import { authenticate, verifyToken } from './auth';
import { queryAll, queryOne, query } from '../../db/client';
import { publish, PUBSUB_CHANNELS } from '../../lib/pubsub';
import { getRedis, isRedisAvailable } from '../../lib/redis';
import { loggers } from '../../lib/logger';
import { creditService, CreditReason, RefType } from '../../modules/economy/credit.service';

const log = loggers.core;

// ============================================
// CONSTANTS
// ============================================

const RATE_LIMITS = {
  MESSAGES_PER_MINUTE: 60,
  CONVERSATIONS_PER_DAY: 20,
  MAX_GROUP_PARTICIPANTS: 50,
  MESSAGE_EDIT_WINDOW_MS: 15 * 60 * 1000, // 15 minutes
  MAX_EDITS_PER_MESSAGE: 5,
  TYPING_TTL_SECONDS: 5,
  PRESENCE_TTL_SECONDS: 60,
  PRESENCE_AWAY_THRESHOLD_MS: 5 * 60 * 1000, // 5 minutes
  MAX_PINNED_MESSAGES: 10,
  MESSAGE_COST_CREDITS: 0, // Free messaging for now
};

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
  contentType: z.enum(['text', 'image', 'file', 'voice', 'sticker', 'gif', 'system', 'shared']).default('text'),
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
  limit: z.coerce.number().min(1).max(100).default(20),
  offset: z.coerce.number().min(0).default(0),
});

const forwardSchema = z.object({
  toConversationIds: z.array(z.string()).min(1).max(10),
  addComment: z.string().max(1000).optional(),
});

const scheduleMessageSchema = z.object({
  conversationId: z.string(),
  content: z.string().min(1).max(4000),
  scheduledFor: z.string(),
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
  quietHoursStart: z.string().optional(),
  quietHoursEnd: z.string().optional(),
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
  ttlSeconds: z.number().nullable(),
});

// ============================================
// UTILITIES
// ============================================

function generateId(prefix: string): string {
  return `${prefix}_${crypto.randomBytes(12).toString('hex')}`;
}

function sanitizeContent(content: string): string {
  return content
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}

// ============================================
// SERVICE FUNCTIONS
// ============================================

/**
 * Atomically check and increment rate limit to prevent race conditions.
 * Returns whether the action is allowed (under limit).
 */
async function checkAndIncrementRateLimit(userId: string): Promise<{ allowed: boolean; remaining: number; resetAt: Date }> {
  const redis = getRedis();
  const now = new Date();
  const minuteStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours(), now.getMinutes());

  if (redis && isRedisAvailable()) {
    const key = `ratelimit:msg:${userId}:${minuteStart.getTime()}`;

    // Use atomic INCR - increment first, then check
    // This prevents race condition where two requests both pass check before either increments
    const newCount = await redis.incr(key);

    // Set expiry only on first increment (when count was 0 before)
    if (newCount === 1) {
      await redis.expire(key, 60);
    }

    const allowed = newCount <= RATE_LIMITS.MESSAGES_PER_MINUTE;

    // If not allowed, decrement to not count this failed attempt
    if (!allowed) {
      await redis.decr(key);
    }

    return {
      allowed,
      remaining: Math.max(0, RATE_LIMITS.MESSAGES_PER_MINUTE - (allowed ? newCount : newCount - 1)),
      resetAt: new Date(minuteStart.getTime() + 60000),
    };
  }

  // Without Redis, allow all (rely on other rate limiting mechanisms)
  return { allowed: true, remaining: RATE_LIMITS.MESSAGES_PER_MINUTE, resetAt: new Date(now.getTime() + 60000) };
}

async function incrementRateLimit(userId: string): Promise<void> {
  // Kept for backward compatibility - prefer checkAndIncrementRateLimit for atomic operations
  const redis = getRedis();

  if (redis && isRedisAvailable()) {
    const now = new Date();
    const minuteStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours(), now.getMinutes());
    const key = `ratelimit:msg:${userId}:${minuteStart.getTime()}`;

    await redis.incr(key);
    await redis.expire(key, 60);
  }
}

async function deductCredits(userId: string, amount: number, messageId?: string): Promise<boolean> {
  // Use the proper credit service for atomic transactions
  // This uses the credit_balances table and credit_ledger for proper tracking
  try {
    const result = await creditService.transact({
      userId,
      delta: -Math.round(amount * 100) / 100, // Ensure proper decimal handling
      reason: CreditReason.DM_SENT,
      refType: RefType.MESSAGE,
      refId: messageId,
      idempotencyKey: `msg:${userId}:${messageId || Date.now()}`,
    });

    return !result.wasDuplicate && result.newBalance >= 0;
  } catch (error) {
    // Log the error but don't throw - message sending should continue
    // if credit deduction fails (for better UX, we can charge later)
    log.warn({ userId, amount, error }, 'Credit deduction failed for message');
    return true; // Allow message to be sent even if credits fail
  }
}

async function setTypingStatus(conversationId: string, userId: string, isTyping: boolean): Promise<void> {
  const redis = getRedis();

  if (redis && isRedisAvailable()) {
    const key = `typing:${conversationId}:${userId}`;

    if (isTyping) {
      const user = await queryOne<{ username: string; avatar_url: string }>(
        `SELECT username, avatar_url FROM users WHERE id = $1`,
        [userId]
      );

      await redis.setex(key, RATE_LIMITS.TYPING_TTL_SECONDS, JSON.stringify({
        username: user?.username,
        avatarUrl: user?.avatar_url,
        startedAt: Date.now(),
      }));
    } else {
      await redis.del(key);
    }

    await publish(PUBSUB_CHANNELS.TYPING || 'pubsub:typing', {
      conversationId,
      userId,
      isTyping,
    });
  } else {
    if (isTyping) {
      await query(
        `INSERT INTO typing_indicators (conversation_id, user_id, started_at)
         VALUES ($1, $2, NOW())
         ON CONFLICT (conversation_id, user_id) DO UPDATE SET started_at = NOW()`,
        [conversationId, userId]
      );
    } else {
      await query(
        `DELETE FROM typing_indicators WHERE conversation_id = $1 AND user_id = $2`,
        [conversationId, userId]
      );
    }
  }
}

async function getTypingUsers(conversationId: string): Promise<Array<{ userId: string; username: string; avatarUrl?: string }>> {
  const redis = getRedis();

  if (redis && isRedisAvailable()) {
    // Use SCAN instead of KEYS to avoid blocking Redis in production
    // KEYS is O(n) and blocks the single-threaded Redis server
    const indicators: Array<{ userId: string; username: string; avatarUrl?: string }> = [];
    const pattern = `typing:${conversationId}:*`;
    let cursor = '0';

    do {
      const [nextCursor, keys] = await redis.scan(cursor, 'MATCH', pattern, 'COUNT', 100);
      cursor = nextCursor;

      if (keys.length > 0) {
        // Batch fetch all keys at once using MGET
        const values = await redis.mget(...keys);

        for (let i = 0; i < keys.length; i++) {
          const data = values[i];
          if (data) {
            try {
              const parsed = JSON.parse(data);
              const userId = keys[i].split(':')[2];
              indicators.push({
                userId,
                username: parsed.username,
                avatarUrl: parsed.avatarUrl,
              });
            } catch {
              // Skip malformed data
            }
          }
        }
      }
    } while (cursor !== '0');

    return indicators;
  }

  const results = await queryAll<{ user_id: string; username: string; avatar_url: string }>(
    `SELECT ti.user_id, u.username, u.avatar_url
     FROM typing_indicators ti
     JOIN users u ON ti.user_id = u.id
     WHERE ti.conversation_id = $1 AND ti.started_at > NOW() - INTERVAL '5 seconds'`,
    [conversationId]
  );

  return results.map((r) => ({
    userId: r.user_id,
    username: r.username,
    avatarUrl: r.avatar_url,
  }));
}

async function updatePresence(userId: string, status: 'online' | 'away' | 'offline', device?: string): Promise<void> {
  const redis = getRedis();
  const now = new Date();

  await query(`UPDATE users SET last_active_at = $1 WHERE id = $2`, [now.toISOString(), userId]);

  if (redis && isRedisAvailable()) {
    const key = `presence:${userId}`;

    if (status === 'offline') {
      await redis.del(key);
    } else {
      await redis.setex(key, RATE_LIMITS.PRESENCE_TTL_SECONDS, JSON.stringify({
        status,
        lastSeen: now.toISOString(),
        device: device || 'web',
      }));
    }

    await publish(PUBSUB_CHANNELS.PRESENCE || 'pubsub:presence', {
      userId,
      status,
      lastSeen: now.toISOString(),
    });
  }
}

async function getPresence(userId: string): Promise<{ status: 'online' | 'away' | 'offline'; lastSeen?: Date }> {
  const redis = getRedis();

  if (redis && isRedisAvailable()) {
    const key = `presence:${userId}`;
    const data = await redis.get(key);

    if (data) {
      const parsed = JSON.parse(data);
      return {
        status: parsed.status,
        lastSeen: new Date(parsed.lastSeen),
      };
    }
  }

  const user = await queryOne<{ last_active_at: Date; presence_visible: boolean }>(
    `SELECT last_active_at, COALESCE(presence_visible, true) as presence_visible FROM users WHERE id = $1`,
    [userId]
  );

  if (!user || !user.presence_visible || !user.last_active_at) {
    return { status: 'offline' };
  }

  const timeSinceActive = Date.now() - new Date(user.last_active_at).getTime();

  if (timeSinceActive < RATE_LIMITS.PRESENCE_AWAY_THRESHOLD_MS) {
    return { status: 'online', lastSeen: user.last_active_at };
  } else if (timeSinceActive < RATE_LIMITS.PRESENCE_TTL_SECONDS * 1000) {
    return { status: 'away', lastSeen: user.last_active_at };
  }

  return { status: 'offline', lastSeen: user.last_active_at };
}

// ============================================
// ROUTE REGISTRATION
// ============================================

export async function registerMessagingRoutes(app: FastifyInstance) {
  // ============================================
  // CONVERSATIONS
  // ============================================

  // Get user's conversations (optimized with typing indicators and presence)
  app.get('/messaging/conversations', { preHandler: authenticate }, async (request, reply) => {
    const userId = request.user!.userId;
    const params = request.query as { tab?: string; limit?: string };
    const tab = params.tab || 'inbox';
    const limit = Math.min(parseInt(params.limit || '50'), 100);

    let tabFilter = '';
    if (tab === 'starred') {
      tabFilter = ` WHERE cp_user.starred = true`;
    } else if (tab === 'archived') {
      tabFilter = ` WHERE c.archived_at IS NOT NULL`;
    } else {
      tabFilter = ` WHERE c.archived_at IS NULL`;
    }

    const sql = `
      WITH user_conversations AS (
        SELECT c.id, c.type, c.name, c.created_at, c.last_message_at,
               c.disappearing_ttl,
               cp_user.last_read_at as user_last_read_at,
               cp_user.joined_at as user_joined_at,
               COALESCE(cp_user.starred, false) as starred,
               COALESCE(cp_user.muted, false) as muted
        FROM conversations c
        JOIN conversation_participants cp_user ON c.id = cp_user.conversation_id AND cp_user.user_id = $1
        ${tabFilter}
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
      )
      SELECT
        uc.id, uc.type, uc.name, uc.created_at, uc.last_message_at,
        uc.user_last_read_at, uc.user_joined_at, uc.starred, uc.muted,
        uc.disappearing_ttl,
        COALESCE(cpa.participants, '[]'::json) as participants,
        lm.last_message_id,
        lm.last_message_content,
        lm.last_message_type,
        lm.last_message_sender_id,
        lm.last_message_created_at,
        COALESCE(urc.unread_count, 0) as unread_count
      FROM user_conversations uc
      LEFT JOIN conversation_participants_agg cpa ON uc.id = cpa.conversation_id
      LEFT JOIN last_messages lm ON uc.id = lm.conversation_id
      LEFT JOIN unread_counts urc ON uc.id = urc.conversation_id
      ORDER BY COALESCE(uc.last_message_at, uc.created_at) DESC
      LIMIT $2
    `;

    const conversations = await queryAll(sql, [userId, limit]);

    // Batch fetch typing users for all conversations to avoid N+1 queries
    const conversationIds = conversations.map((c: any) => c.id);
    const typingByConversation: Record<string, Array<{ userId: string; username: string; avatarUrl?: string }>> = {};

    const redis = getRedis();
    if (redis && isRedisAvailable() && conversationIds.length > 0) {
      // Batch scan for all typing indicators across conversations
      for (const convId of conversationIds) {
        typingByConversation[convId] = [];
        const pattern = `typing:${convId}:*`;
        let cursor = '0';

        do {
          const [nextCursor, keys] = await redis.scan(cursor, 'MATCH', pattern, 'COUNT', 50);
          cursor = nextCursor;

          if (keys.length > 0) {
            const values = await redis.mget(...keys);
            for (let i = 0; i < keys.length; i++) {
              const data = values[i];
              if (data) {
                try {
                  const parsed = JSON.parse(data);
                  const typingUserId = keys[i].split(':')[2];
                  if (typingUserId !== userId) {
                    typingByConversation[convId].push({
                      userId: typingUserId,
                      username: parsed.username,
                      avatarUrl: parsed.avatarUrl,
                    });
                  }
                } catch {
                  // Skip malformed data
                }
              }
            }
          }
        } while (cursor !== '0');
      }
    } else if (conversationIds.length > 0) {
      // Fallback: batch query from database
      const typingResults = await queryAll<{ conversation_id: string; user_id: string; username: string; avatar_url: string }>(
        `SELECT ti.conversation_id, ti.user_id, u.username, u.avatar_url
         FROM typing_indicators ti
         JOIN users u ON ti.user_id = u.id
         WHERE ti.conversation_id = ANY($1) AND ti.started_at > NOW() - INTERVAL '5 seconds' AND ti.user_id != $2`,
        [conversationIds, userId]
      );

      for (const convId of conversationIds) {
        typingByConversation[convId] = [];
      }
      for (const t of typingResults) {
        if (typingByConversation[t.conversation_id]) {
          typingByConversation[t.conversation_id].push({
            userId: t.user_id,
            username: t.username,
            avatarUrl: t.avatar_url,
          });
        }
      }
    }

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
        typingUsers: typingByConversation[conv.id] || [],
      };
    });

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

    await query(
      `INSERT INTO conversation_participants (conversation_id, user_id, joined_at, role)
       VALUES ($1, $2, $3, 'owner')`,
      [conversationId, creatorId, now]
    );

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

  // Archive/unarchive conversation
  app.post('/messaging/conversations/:id/archive', { preHandler: authenticate }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const userId = request.user!.userId;

    await query(
      `UPDATE conversations SET archived_at = NOW() WHERE id = $1
       AND EXISTS (SELECT 1 FROM conversation_participants WHERE conversation_id = $1 AND user_id = $2)`,
      [id, userId]
    );
    return reply.send({ data: { archived: true } });
  });

  app.delete('/messaging/conversations/:id/archive', { preHandler: authenticate }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const userId = request.user!.userId;

    await query(
      `UPDATE conversations SET archived_at = NULL WHERE id = $1
       AND EXISTS (SELECT 1 FROM conversation_participants WHERE conversation_id = $1 AND user_id = $2)`,
      [id, userId]
    );
    return reply.send({ data: { archived: false } });
  });

  // Star/unstar conversation
  app.post('/messaging/conversations/:id/star', { preHandler: authenticate }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const userId = request.user!.userId;

    await query(
      `UPDATE conversation_participants SET starred = true WHERE conversation_id = $1 AND user_id = $2`,
      [id, userId]
    );
    return reply.send({ data: { starred: true } });
  });

  app.delete('/messaging/conversations/:id/star', { preHandler: authenticate }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const userId = request.user!.userId;

    await query(
      `UPDATE conversation_participants SET starred = false WHERE conversation_id = $1 AND user_id = $2`,
      [id, userId]
    );
    return reply.send({ data: { starred: false } });
  });

  // Set disappearing messages
  app.put('/messaging/conversations/:id/disappearing', { preHandler: authenticate }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const userId = request.user!.userId;
    const { ttlSeconds } = disappearingSchema.parse(request.body);

    const participant = await queryOne<{ role: string }>(
      `SELECT role FROM conversation_participants WHERE conversation_id = $1 AND user_id = $2`,
      [id, userId]
    );

    if (!participant || !['owner', 'moderator'].includes(participant.role)) {
      return reply.status(403).send({
        error: { code: 'FORBIDDEN', message: 'Only owners and moderators can set disappearing messages' },
      });
    }

    await query(`UPDATE conversations SET disappearing_ttl = $1, updated_at = NOW() WHERE id = $2`, [ttlSeconds, id]);
    return reply.send({ data: { ttlSeconds } });
  });

  // ============================================
  // MESSAGES
  // ============================================

  // Get messages in conversation
  app.get('/messaging/conversations/:id/messages', { preHandler: authenticate }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const params = request.query as { limit?: string; before?: string; beforeId?: string };
    const limit = Math.min(parseInt(params.limit || '50'), 100);
    const userId = request.user!.userId;

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

  // Send message (with rate limiting and credit deduction)
  app.post('/messaging/conversations/:id/messages', { preHandler: authenticate }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const data = sendMessageSchema.parse(request.body);
    const senderId = request.user!.userId;

    const participant = await queryOne(
      `SELECT 1 FROM conversation_participants WHERE conversation_id = $1 AND user_id = $2`,
      [id, senderId]
    );

    if (!participant) {
      return reply.status(403).send({
        error: { code: 'FORBIDDEN', message: 'Not a participant in this conversation', statusCode: 403 },
      });
    }

    // Check and atomically increment rate limit (prevents race condition)
    const rateLimit = await checkAndIncrementRateLimit(senderId);
    if (!rateLimit.allowed) {
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
    const cost = parseInt(recipientCount?.count || '0', 10) * RATE_LIMITS.MESSAGE_COST_CREDITS;

    if (cost > 0) {
      const hasCredits = await deductCredits(senderId, cost);
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

    // Check blocks and privacy - batch queries to avoid N+1
    const otherParticipants = await queryAll<{ user_id: string }>(
      `SELECT user_id FROM conversation_participants WHERE conversation_id = $1 AND user_id != $2`,
      [id, senderId]
    );

    if (otherParticipants.length > 0) {
      const otherUserIds = otherParticipants.map((p) => p.user_id);

      // Batch check if any participant has blocked the sender
      const blockedBy = await queryOne<{ blocker_id: string }>(
        `SELECT blocker_id FROM user_blocks WHERE blocker_id = ANY($1) AND blocked_id = $2 LIMIT 1`,
        [otherUserIds, senderId]
      );
      if (blockedBy) {
        return reply.status(403).send({
          error: { code: 'BLOCKED', message: 'You cannot send messages to this user', statusCode: 403 },
        });
      }

      // Batch check privacy settings
      const privacyOptOut = await queryOne<{ user_id: string }>(
        `SELECT user_id FROM user_privacy_mode WHERE user_id = ANY($1) AND opt_out_messaging = true LIMIT 1`,
        [otherUserIds]
      );
      if (privacyOptOut) {
        return reply.status(403).send({
          error: { code: 'MESSAGING_DISABLED', message: 'This user has disabled messaging', statusCode: 403 },
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
          error: { code: 'VALIDATION', message: 'Reply target message not found', statusCode: 400 },
        });
      }
    }

    // Get conversation for disappearing messages
    const conversation = await queryOne<{ disappearing_ttl: number | null }>(
      `SELECT disappearing_ttl FROM conversations WHERE id = $1`,
      [id]
    );

    const messageId = generateId('msg');
    const now = new Date();
    let expiresAt: Date | null = null;

    if (conversation?.disappearing_ttl) {
      expiresAt = new Date(now.getTime() + conversation.disappearing_ttl * 1000);
    }

    await query(
      `INSERT INTO messages (
        id, conversation_id, sender_id, content, content_type,
        reply_to_id, expires_at, created_at, metadata
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        messageId,
        id,
        senderId,
        sanitizeContent(data.content),
        data.contentType,
        data.replyToId || null,
        expiresAt?.toISOString() || null,
        now.toISOString(),
        data.metadata ? JSON.stringify(data.metadata) : null,
      ]
    );

    // Update conversation
    await query(
      `UPDATE conversations SET last_message_at = $1, updated_at = $1 WHERE id = $2`,
      [now.toISOString(), id]
    );

    // Update reply count if applicable
    if (data.replyToId) {
      await query(`UPDATE messages SET reply_count = COALESCE(reply_count, 0) + 1 WHERE id = $1`, [data.replyToId]);
    }

    // Create delivery receipts
    for (const participant of otherParticipants) {
      await query(
        `INSERT INTO message_receipts (message_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
        [messageId, participant.user_id]
      );
    }

    await incrementRateLimit(senderId);

    // Clear typing indicator
    await setTypingStatus(id, senderId, false);

    // Publish message event
    await publish(PUBSUB_CHANNELS.MESSAGE_RECEIVED, {
      id: messageId,
      conversationId: id,
      senderId,
      content: sanitizeContent(data.content),
      contentType: data.contentType,
      replyToId: data.replyToId,
      createdAt: now.toISOString(),
    });

    // Get sender info
    const sender = await queryOne<{ username: string; display_name: string; avatar_url: string }>(
      `SELECT username, display_name, avatar_url FROM users WHERE id = $1`,
      [senderId]
    );

    log.info({ messageId, conversationId: id, senderId }, 'Message sent');

    return reply.status(201).send({
      data: {
        id: messageId,
        conversationId: id,
        content: sanitizeContent(data.content),
        contentType: data.contentType,
        replyToId: data.replyToId,
        expiresAt,
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

  // Edit message
  app.put('/messaging/messages/:id', { preHandler: authenticate }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const { content } = editMessageSchema.parse(request.body);
    const userId = request.user!.userId;

    const message = await queryOne<{
      sender_id: string;
      content: string;
      original_content: string | null;
      edit_count: number;
      created_at: Date;
      conversation_id: string;
    }>(`SELECT * FROM messages WHERE id = $1 AND deleted_at IS NULL`, [id]);

    if (!message) {
      return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'Message not found' } });
    }

    if (message.sender_id !== userId) {
      return reply.status(403).send({ error: { code: 'FORBIDDEN', message: 'Can only edit your own messages' } });
    }

    const messageAge = Date.now() - new Date(message.created_at).getTime();
    if (messageAge > RATE_LIMITS.MESSAGE_EDIT_WINDOW_MS) {
      return reply.status(400).send({ error: { code: 'EXPIRED', message: 'Edit window has expired (15 minutes)' } });
    }

    if ((message.edit_count || 0) >= RATE_LIMITS.MAX_EDITS_PER_MESSAGE) {
      return reply.status(400).send({ error: { code: 'MAX_EDITS', message: `Maximum edits (${RATE_LIMITS.MAX_EDITS_PER_MESSAGE}) reached` } });
    }

    const now = new Date();
    const originalContent = message.original_content || message.content;

    await query(
      `UPDATE messages
       SET content = $1, original_content = $2, edit_count = COALESCE(edit_count, 0) + 1, edited_at = $3
       WHERE id = $4`,
      [sanitizeContent(content), originalContent, now.toISOString(), id]
    );

    await publish(PUBSUB_CHANNELS.MESSAGE_RECEIVED, {
      id,
      conversationId: message.conversation_id,
      senderId: userId,
      content: sanitizeContent(content),
      edited: true,
      editedAt: now.toISOString(),
    });

    return reply.send({
      data: {
        id,
        conversationId: message.conversation_id,
        content: sanitizeContent(content),
        editedAt: now,
        editCount: (message.edit_count || 0) + 1,
      },
    });
  });

  // Delete message
  app.delete('/messaging/messages/:id', { preHandler: authenticate }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const userId = request.user!.userId;

    const message = await queryOne<{ sender_id: string; conversation_id: string }>(
      `SELECT sender_id, conversation_id FROM messages WHERE id = $1`,
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

    await publish(PUBSUB_CHANNELS.MESSAGE_RECEIVED, {
      id,
      conversationId: message.conversation_id,
      deleted: true,
    });

    log.info({ messageId: id, userId }, 'Message deleted');

    return reply.send({ data: { deleted: true } });
  });

  // Forward message
  app.post('/messaging/messages/:id/forward', { preHandler: authenticate }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const { toConversationIds, addComment } = forwardSchema.parse(request.body);
    const userId = request.user!.userId;

    const originalMessage = await queryOne<{ content: string; content_type: string; conversation_id: string }>(
      `SELECT content, content_type, conversation_id FROM messages WHERE id = $1 AND deleted_at IS NULL`,
      [id]
    );

    if (!originalMessage) {
      return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'Message not found' } });
    }

    const hasAccess = await queryOne(
      `SELECT 1 FROM conversation_participants WHERE conversation_id = $1 AND user_id = $2`,
      [originalMessage.conversation_id, userId]
    );

    if (!hasAccess) {
      return reply.status(403).send({ error: { code: 'FORBIDDEN', message: 'No access to original message' } });
    }

    const forwardedMessages = [];

    for (const convId of toConversationIds) {
      const isParticipant = await queryOne(
        `SELECT 1 FROM conversation_participants WHERE conversation_id = $1 AND user_id = $2`,
        [convId, userId]
      );

      if (!isParticipant) continue;

      const now = new Date();

      // Send comment first if provided
      if (addComment) {
        const commentId = generateId('msg');
        await query(
          `INSERT INTO messages (id, conversation_id, sender_id, content, content_type, created_at)
           VALUES ($1, $2, $3, $4, 'text', $5)`,
          [commentId, convId, userId, sanitizeContent(addComment), now.toISOString()]
        );
      }

      // Send forwarded message
      const messageId = generateId('msg');
      await query(
        `INSERT INTO messages (id, conversation_id, sender_id, content, content_type, forwarded_from_id, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [messageId, convId, userId, originalMessage.content, originalMessage.content_type, id, now.toISOString()]
      );

      await query(`UPDATE conversations SET last_message_at = $1, updated_at = $1 WHERE id = $2`, [now.toISOString(), convId]);

      forwardedMessages.push({ id: messageId, conversationId: convId });
    }

    return reply.status(201).send({ data: forwardedMessages });
  });

  // Pin/unpin message
  app.post('/messaging/messages/:id/pin', { preHandler: authenticate }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const userId = request.user!.userId;

    // Use an atomic UPDATE with conditional check to prevent race conditions
    // This ensures only one concurrent request can successfully pin when at the limit
    const result = await query(
      `WITH msg AS (
         SELECT m.conversation_id, m.pinned_at, cp.role
         FROM messages m
         LEFT JOIN conversation_participants cp ON m.conversation_id = cp.conversation_id AND cp.user_id = $2
         WHERE m.id = $1
       ),
       pin_count AS (
         SELECT COUNT(*) as cnt FROM messages
         WHERE conversation_id = (SELECT conversation_id FROM msg)
           AND pinned_at IS NOT NULL
       )
       UPDATE messages
       SET pinned_at = NOW(), pinned_by = $2
       WHERE id = $1
         AND pinned_at IS NULL
         AND EXISTS (SELECT 1 FROM msg WHERE role IN ('owner', 'moderator'))
         AND (SELECT cnt FROM pin_count) < $3
       RETURNING id, conversation_id`,
      [id, userId, RATE_LIMITS.MAX_PINNED_MESSAGES]
    );

    if ((result as any).rowCount === 0) {
      // Determine the specific error
      const message = await queryOne<{ conversation_id: string; pinned_at: Date | null }>(
        `SELECT conversation_id, pinned_at FROM messages WHERE id = $1`,
        [id]
      );

      if (!message) {
        return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'Message not found' } });
      }

      if (message.pinned_at) {
        return reply.status(400).send({ error: { code: 'ALREADY_PINNED', message: 'Message is already pinned' } });
      }

      const participant = await queryOne<{ role: string }>(
        `SELECT role FROM conversation_participants WHERE conversation_id = $1 AND user_id = $2`,
        [message.conversation_id, userId]
      );

      if (!participant || !['owner', 'moderator'].includes(participant.role)) {
        return reply.status(403).send({ error: { code: 'FORBIDDEN', message: 'Only owners and moderators can pin messages' } });
      }

      // Must be at max pins
      return reply.status(400).send({ error: { code: 'MAX_PINS', message: `Maximum ${RATE_LIMITS.MAX_PINNED_MESSAGES} pinned messages reached` } });
    }

    return reply.send({ data: { pinned: true } });
  });

  app.delete('/messaging/messages/:id/pin', { preHandler: authenticate }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const userId = request.user!.userId;

    const message = await queryOne<{ conversation_id: string }>(
      `SELECT conversation_id FROM messages WHERE id = $1`,
      [id]
    );

    if (!message) {
      return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'Message not found' } });
    }

    const participant = await queryOne<{ role: string }>(
      `SELECT role FROM conversation_participants WHERE conversation_id = $1 AND user_id = $2`,
      [message.conversation_id, userId]
    );

    if (!participant || !['owner', 'moderator'].includes(participant.role)) {
      return reply.status(403).send({ error: { code: 'FORBIDDEN', message: 'Only owners and moderators can unpin messages' } });
    }

    await query(`UPDATE messages SET pinned_at = NULL, pinned_by = NULL WHERE id = $1`, [id]);

    return reply.send({ data: { unpinned: true } });
  });

  // Get pinned messages
  app.get('/messaging/conversations/:id/pinned', { preHandler: authenticate }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const userId = request.user!.userId;

    const participant = await queryOne(
      `SELECT 1 FROM conversation_participants WHERE conversation_id = $1 AND user_id = $2`,
      [id, userId]
    );

    if (!participant) {
      return reply.status(403).send({ error: { code: 'FORBIDDEN', message: 'Not a participant' } });
    }

    const pinned = await queryAll(
      `SELECT m.*, u.username as sender_username, u.display_name as sender_display_name
       FROM messages m
       JOIN users u ON m.sender_id = u.id
       WHERE m.conversation_id = $1 AND m.pinned_at IS NOT NULL AND m.deleted_at IS NULL
       ORDER BY m.pinned_at DESC`,
      [id]
    );

    return reply.send({
      data: pinned.map((m: any) => ({
        id: m.id,
        content: m.content,
        contentType: m.content_type,
        pinnedAt: m.pinned_at,
        pinnedBy: m.pinned_by,
        createdAt: m.created_at,
        sender: {
          id: m.sender_id,
          username: m.sender_username,
          displayName: m.sender_display_name,
        },
      })),
    });
  });

  // Report message
  app.post('/messaging/messages/:id/report', { preHandler: authenticate }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const { reason, details } = reportSchema.parse(request.body);
    const userId = request.user!.userId;

    const reportId = generateId('rpt');

    await query(
      `INSERT INTO message_reports (id, message_id, reporter_id, reason, details) VALUES ($1, $2, $3, $4, $5)`,
      [reportId, id, userId, reason, details]
    );

    log.info({ reportId, messageId: id, userId, reason }, 'Message reported');

    return reply.send({ data: { reported: true } });
  });

  // ============================================
  // REACTIONS
  // ============================================

  app.post('/messaging/messages/:id/reactions', { preHandler: authenticate }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const { emoji } = reactionSchema.parse(request.body);
    const userId = request.user!.userId;

    const reactionId = generateId('rxn');

    await query(
      `INSERT INTO message_reactions (id, message_id, user_id, emoji)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (message_id, user_id, emoji) DO NOTHING`,
      [reactionId, id, userId, emoji]
    );

    const message = await queryOne<{ conversation_id: string }>(
      `SELECT conversation_id FROM messages WHERE id = $1`,
      [id]
    );

    await publish(PUBSUB_CHANNELS.REACTION || 'pubsub:reaction', {
      messageId: id,
      conversationId: message?.conversation_id,
      userId,
      emoji,
      action: 'add',
    });

    return reply.status(201).send({ data: { id: reactionId, emoji } });
  });

  app.delete('/messaging/messages/:id/reactions/:emoji', { preHandler: authenticate }, async (request, reply) => {
    const { id, emoji } = request.params as { id: string; emoji: string };
    const userId = request.user!.userId;

    await query(
      `DELETE FROM message_reactions WHERE message_id = $1 AND user_id = $2 AND emoji = $3`,
      [id, userId, decodeURIComponent(emoji)]
    );

    const message = await queryOne<{ conversation_id: string }>(
      `SELECT conversation_id FROM messages WHERE id = $1`,
      [id]
    );

    await publish(PUBSUB_CHANNELS.REACTION || 'pubsub:reaction', {
      messageId: id,
      conversationId: message?.conversation_id,
      userId,
      emoji: decodeURIComponent(emoji),
      action: 'remove',
    });

    return reply.send({ data: { removed: true } });
  });

  app.get('/messaging/messages/:id/reactions', { preHandler: authenticate }, async (request, reply) => {
    const { id } = request.params as { id: string };

    const reactions = await queryAll<{ emoji: string; user_ids: string[] }>(
      `SELECT emoji, array_agg(user_id) as user_ids
       FROM message_reactions
       WHERE message_id = $1
       GROUP BY emoji
       ORDER BY MIN(created_at)`,
      [id]
    );

    return reply.send({
      data: reactions.map((r) => ({
        emoji: r.emoji,
        count: r.user_ids.length,
        users: r.user_ids,
      })),
    });
  });

  // ============================================
  // TYPING INDICATORS
  // ============================================

  app.post('/messaging/conversations/:id/typing', { preHandler: authenticate }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const { isTyping } = request.body as { isTyping: boolean };
    const userId = request.user!.userId;

    await setTypingStatus(id, userId, isTyping);
    return reply.send({ data: { acknowledged: true } });
  });

  app.get('/messaging/conversations/:id/typing', { preHandler: authenticate }, async (request, reply) => {
    const { id } = request.params as { id: string };

    const typing = await getTypingUsers(id);
    return reply.send({ data: typing });
  });

  // ============================================
  // PRESENCE
  // ============================================

  app.post('/messaging/presence', { preHandler: authenticate }, async (request, reply) => {
    const { status, device } = request.body as { status: 'online' | 'away' | 'offline'; device?: string };
    const userId = request.user!.userId;

    await updatePresence(userId, status, device);
    return reply.send({ data: { acknowledged: true } });
  });

  app.get('/messaging/presence/:userId', { preHandler: authenticate }, async (request, reply) => {
    const { userId } = request.params as { userId: string };

    const presence = await getPresence(userId);
    return reply.send({ data: { userId, ...presence } });
  });

  app.post('/messaging/presence/bulk', { preHandler: authenticate }, async (request, reply) => {
    const { userIds } = request.body as { userIds: string[] };
    const limitedIds = userIds.slice(0, 100);

    // Batch fetch presence to avoid N+1 queries
    const redis = getRedis();
    const presences: Record<string, any> = {};

    if (redis && isRedisAvailable()) {
      // Batch fetch from Redis using MGET
      const keys = limitedIds.map((id) => `presence:${id}`);
      const values = await redis.mget(...keys);

      for (let i = 0; i < limitedIds.length; i++) {
        const userId = limitedIds[i];
        const data = values[i];

        if (data) {
          try {
            const parsed = JSON.parse(data);
            presences[userId] = {
              status: parsed.status,
              lastSeen: new Date(parsed.lastSeen),
            };
          } catch {
            presences[userId] = { status: 'offline' };
          }
        } else {
          presences[userId] = { status: 'offline' };
        }
      }
    } else {
      // Batch fetch from database
      const users = await queryAll<{ id: string; last_active_at: Date; presence_visible: boolean }>(
        `SELECT id, last_active_at, COALESCE(presence_visible, true) as presence_visible
         FROM users WHERE id = ANY($1)`,
        [limitedIds]
      );

      const userMap = new Map(users.map((u: any) => [u.id, u]));

      for (const userId of limitedIds) {
        const user = userMap.get(userId);
        if (!user || !user.presence_visible || !user.last_active_at) {
          presences[userId] = { status: 'offline' };
        } else {
          const timeSinceActive = Date.now() - new Date(user.last_active_at).getTime();
          if (timeSinceActive < RATE_LIMITS.PRESENCE_AWAY_THRESHOLD_MS) {
            presences[userId] = { status: 'online', lastSeen: user.last_active_at };
          } else if (timeSinceActive < RATE_LIMITS.PRESENCE_TTL_SECONDS * 1000) {
            presences[userId] = { status: 'away', lastSeen: user.last_active_at };
          } else {
            presences[userId] = { status: 'offline', lastSeen: user.last_active_at };
          }
        }
      }
    }

    return reply.send({ data: presences });
  });

  // ============================================
  // READ RECEIPTS
  // ============================================

  app.post('/messaging/conversations/:id/read', { preHandler: authenticate }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const userId = request.user!.userId;

    const now = new Date();

    await query(
      `UPDATE conversation_participants SET last_read_at = $1 WHERE conversation_id = $2 AND user_id = $3`,
      [now.toISOString(), id, userId]
    );

    await query(
      `UPDATE message_receipts mr
       SET read_at = $1
       FROM messages m
       WHERE mr.message_id = m.id
         AND m.conversation_id = $2
         AND mr.user_id = $3
         AND mr.read_at IS NULL`,
      [now.toISOString(), id, userId]
    );

    await publish(PUBSUB_CHANNELS.READ || 'pubsub:read', {
      conversationId: id,
      userId,
      readAt: now.toISOString(),
    });

    return reply.send({ data: { acknowledged: true } });
  });

  app.post('/messaging/messages/:id/delivered', { preHandler: authenticate }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const userId = request.user!.userId;

    await query(
      `UPDATE message_receipts SET delivered_at = NOW()
       WHERE message_id = $1 AND user_id = $2 AND delivered_at IS NULL`,
      [id, userId]
    );

    const message = await queryOne<{ conversation_id: string; sender_id: string }>(
      `SELECT conversation_id, sender_id FROM messages WHERE id = $1`,
      [id]
    );

    if (message) {
      await publish(PUBSUB_CHANNELS.DELIVERY || 'pubsub:delivery', {
        messageId: id,
        conversationId: message.conversation_id,
        senderId: message.sender_id,
        userId,
        deliveredAt: new Date().toISOString(),
      });
    }

    return reply.send({ data: { acknowledged: true } });
  });

  app.get('/messaging/messages/:id/receipts', { preHandler: authenticate }, async (request, reply) => {
    const { id } = request.params as { id: string };

    const receipts = await queryAll<{ user_id: string; delivered_at: Date | null; read_at: Date | null }>(
      `SELECT mr.user_id, mr.delivered_at, mr.read_at, u.username, u.avatar_url
       FROM message_receipts mr
       JOIN users u ON mr.user_id = u.id
       WHERE mr.message_id = $1`,
      [id]
    );

    return reply.send({
      data: receipts.map((r: any) => ({
        userId: r.user_id,
        username: r.username,
        avatarUrl: r.avatar_url,
        deliveredAt: r.delivered_at,
        readAt: r.read_at,
      })),
    });
  });

  // ============================================
  // SEARCH
  // ============================================

  app.get('/messaging/search', { preHandler: authenticate }, async (request, reply) => {
    const params = searchSchema.parse(request.query);
    const userId = request.user!.userId;

    let sql = `
      SELECT m.*, u.username as sender_username,
             ts_headline('english', m.content, plainto_tsquery('english', $1), 'MaxWords=50, MinWords=20') as highlight,
             ts_rank(m.search_vector, plainto_tsquery('english', $1)) as rank,
             c.name as conversation_name
      FROM messages m
      JOIN conversation_participants cp ON m.conversation_id = cp.conversation_id AND cp.user_id = $2
      JOIN users u ON m.sender_id = u.id
      JOIN conversations c ON m.conversation_id = c.id
      WHERE m.search_vector @@ plainto_tsquery('english', $1)
        AND m.deleted_at IS NULL
    `;
    const queryParams: (string | Date | number)[] = [params.query, userId];

    if (params.conversationId) {
      queryParams.push(params.conversationId);
      sql += ` AND m.conversation_id = $${queryParams.length}`;
    }

    if (params.fromUserId) {
      queryParams.push(params.fromUserId);
      sql += ` AND m.sender_id = $${queryParams.length}`;
    }

    if (params.startDate) {
      queryParams.push(params.startDate);
      sql += ` AND m.created_at >= $${queryParams.length}`;
    }

    if (params.endDate) {
      queryParams.push(params.endDate);
      sql += ` AND m.created_at <= $${queryParams.length}`;
    }

    // Count total
    const countSql = sql.replace(/SELECT m\.\*, u\.username.*rank,\s*c\.name as conversation_name/, 'SELECT COUNT(*) as total');
    const countResult = await queryOne<{ total: string }>(countSql, queryParams);
    const total = parseInt(countResult?.total || '0', 10);

    // Get paginated results
    sql += ` ORDER BY rank DESC, m.created_at DESC`;
    queryParams.push(params.limit, params.offset);
    sql += ` LIMIT $${queryParams.length - 1} OFFSET $${queryParams.length}`;

    const results = await queryAll(sql, queryParams);

    return reply.send({
      data: results.map((r: any) => ({
        id: r.id,
        conversationId: r.conversation_id,
        conversationName: r.conversation_name,
        content: r.content,
        highlight: r.highlight,
        senderUsername: r.sender_username,
        createdAt: r.created_at,
      })),
      total,
      hasMore: params.offset + results.length < total,
    });
  });

  // ============================================
  // SCHEDULED MESSAGES
  // ============================================

  app.post('/messaging/scheduled', { preHandler: authenticate }, async (request, reply) => {
    const data = scheduleMessageSchema.parse(request.body);
    const userId = request.user!.userId;

    const participant = await queryOne(
      `SELECT 1 FROM conversation_participants WHERE conversation_id = $1 AND user_id = $2`,
      [data.conversationId, userId]
    );

    if (!participant) {
      return reply.status(403).send({ error: { code: 'FORBIDDEN', message: 'Not a participant' } });
    }

    const id = generateId('sched');

    await query(
      `INSERT INTO scheduled_messages (id, conversation_id, sender_id, content, scheduled_for, timezone)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [id, data.conversationId, userId, sanitizeContent(data.content), data.scheduledFor, data.timezone]
    );

    return reply.status(201).send({
      data: {
        id,
        conversationId: data.conversationId,
        content: sanitizeContent(data.content),
        scheduledFor: data.scheduledFor,
        timezone: data.timezone,
        status: 'pending',
      },
    });
  });

  app.get('/messaging/scheduled', { preHandler: authenticate }, async (request, reply) => {
    const userId = request.user!.userId;

    const scheduled = await queryAll(
      `SELECT * FROM scheduled_messages WHERE sender_id = $1 AND status = 'pending' ORDER BY scheduled_for ASC`,
      [userId]
    );

    return reply.send({
      data: scheduled.map((s: any) => ({
        id: s.id,
        conversationId: s.conversation_id,
        content: s.content,
        scheduledFor: s.scheduled_for,
        timezone: s.timezone,
        status: s.status,
      })),
    });
  });

  app.delete('/messaging/scheduled/:id', { preHandler: authenticate }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const userId = request.user!.userId;

    await query(
      `UPDATE scheduled_messages SET status = 'cancelled', updated_at = NOW()
       WHERE id = $1 AND sender_id = $2 AND status = 'pending'`,
      [id, userId]
    );

    return reply.send({ data: { cancelled: true } });
  });

  // ============================================
  // TEMPLATES
  // ============================================

  app.post('/messaging/templates', { preHandler: authenticate }, async (request, reply) => {
    const data = templateSchema.parse(request.body);
    const userId = request.user!.userId;

    const id = generateId('tmpl');

    await query(
      `INSERT INTO message_templates (id, user_id, name, content, shortcut, category)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [id, userId, data.name, data.content, data.shortcut, data.category]
    );

    return reply.status(201).send({
      data: { id, name: data.name, content: data.content, shortcut: data.shortcut, category: data.category, useCount: 0 },
    });
  });

  app.get('/messaging/templates', { preHandler: authenticate }, async (request, reply) => {
    const userId = request.user!.userId;

    const templates = await queryAll(
      `SELECT * FROM message_templates WHERE user_id = $1 ORDER BY use_count DESC, name ASC`,
      [userId]
    );

    return reply.send({
      data: templates.map((t: any) => ({
        id: t.id,
        name: t.name,
        content: t.content,
        shortcut: t.shortcut,
        category: t.category,
        useCount: t.use_count,
      })),
    });
  });

  app.post('/messaging/templates/:id/use', { preHandler: authenticate }, async (request, reply) => {
    const { id } = request.params as { id: string };

    const template = await queryOne<{ content: string }>(
      `UPDATE message_templates SET use_count = use_count + 1, updated_at = NOW()
       WHERE id = $1 RETURNING content`,
      [id]
    );

    if (!template) {
      return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'Template not found' } });
    }

    return reply.send({ data: { content: template.content } });
  });

  app.delete('/messaging/templates/:id', { preHandler: authenticate }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const userId = request.user!.userId;

    await query(`DELETE FROM message_templates WHERE id = $1 AND user_id = $2`, [id, userId]);

    return reply.send({ data: { deleted: true } });
  });

  // ============================================
  // CONTENT SHARING
  // ============================================

  app.post('/messaging/conversations/:id/share', { preHandler: authenticate }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const { contentType, contentId, previewData } = shareContentSchema.parse(request.body);
    const userId = request.user!.userId;

    const participant = await queryOne(
      `SELECT 1 FROM conversation_participants WHERE conversation_id = $1 AND user_id = $2`,
      [id, userId]
    );

    if (!participant) {
      return reply.status(403).send({ error: { code: 'FORBIDDEN', message: 'Not a participant' } });
    }

    const messageId = generateId('msg');
    const sharedContentId = generateId('shared');
    const now = new Date();

    await query(
      `INSERT INTO messages (id, conversation_id, sender_id, content, content_type, created_at)
       VALUES ($1, $2, $3, $4, 'shared', $5)`,
      [messageId, id, userId, `Shared ${contentType}`, now.toISOString()]
    );

    await query(
      `INSERT INTO message_shared_content (id, message_id, content_type, content_id, preview_data)
       VALUES ($1, $2, $3, $4, $5)`,
      [sharedContentId, messageId, contentType, contentId, previewData ? JSON.stringify(previewData) : null]
    );

    await query(`UPDATE conversations SET last_message_at = $1, updated_at = $1 WHERE id = $2`, [now.toISOString(), id]);

    return reply.status(201).send({
      data: {
        id: messageId,
        conversationId: id,
        content: `Shared ${contentType}`,
        contentType: 'shared',
        sharedContent: { contentType, contentId, previewData },
        createdAt: now,
      },
    });
  });

  // ============================================
  // PUSH NOTIFICATIONS
  // ============================================

  app.post('/messaging/push/subscribe', { preHandler: authenticate }, async (request, reply) => {
    const data = pushSubscriptionSchema.parse(request.body);
    const userId = request.user!.userId;

    await query(
      `INSERT INTO push_subscriptions (user_id, endpoint, keys_p256dh, keys_auth, device_type, device_name)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (user_id, endpoint) DO UPDATE SET
         keys_p256dh = $3, keys_auth = $4, device_type = $5, device_name = $6, last_used_at = NOW()`,
      [userId, data.endpoint, data.keys.p256dh, data.keys.auth, data.deviceType, data.deviceName]
    );

    return reply.send({ data: { subscribed: true } });
  });

  app.delete('/messaging/push/subscribe', { preHandler: authenticate }, async (request, reply) => {
    const { endpoint } = request.body as { endpoint: string };
    const userId = request.user!.userId;

    await query(`DELETE FROM push_subscriptions WHERE user_id = $1 AND endpoint = $2`, [userId, endpoint]);

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
      data: {
        messagingEnabled: prefs?.messaging_enabled ?? true,
        messagingSound: prefs?.messaging_sound ?? true,
        messagingPreview: prefs?.messaging_preview ?? true,
        messagingVibrate: prefs?.messaging_vibrate ?? true,
        quietHoursEnabled: prefs?.quiet_hours_enabled ?? false,
        quietHoursStart: prefs?.quiet_hours_start ?? null,
        quietHoursEnd: prefs?.quiet_hours_end ?? null,
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

    const startDate = params.startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const endDate = params.endDate || new Date().toISOString().split('T')[0];

    const stats = await queryAll<{
      date: Date;
      messages_sent: number;
      messages_received: number;
    }>(
      `SELECT * FROM message_analytics WHERE user_id = $1 AND date >= $2 AND date <= $3 ORDER BY date ASC`,
      [userId, startDate, endDate]
    );

    let totalSent = 0;
    let totalReceived = 0;

    const dailyStats = stats.map((s) => {
      totalSent += s.messages_sent;
      totalReceived += s.messages_received;
      return {
        date: s.date,
        sent: s.messages_sent,
        received: s.messages_received,
      };
    });

    return reply.send({
      data: {
        totalSent,
        totalReceived,
        dailyStats,
      },
    });
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
  // BLOCKS
  // ============================================

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

  app.delete('/messaging/block/:userId', { preHandler: authenticate }, async (request, reply) => {
    const { userId: blockedId } = request.params as { userId: string };
    const blockerId = request.user!.userId;

    await query(`DELETE FROM user_blocks WHERE blocker_id = $1 AND blocked_id = $2`, [blockerId, blockedId]);

    log.info({ blockerId, blockedId }, 'User unblocked');

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
  // PRIVACY
  // ============================================

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

      // Update presence
      updatePresence(userId, 'online', 'web');

      // Heartbeat tracking
      let lastHeartbeat = Date.now();
      const heartbeatInterval = setInterval(() => {
        if (Date.now() - lastHeartbeat > 60000) {
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
                await setTypingStatus(message.conversationId, userId, message.isTyping);
              }
              break;

            case 'presence':
              await updatePresence(userId, message.status || 'online', message.device);
              break;

            case 'delivered':
              if (message.messageId) {
                await query(
                  `UPDATE message_receipts SET delivered_at = NOW()
                   WHERE message_id = $1 AND user_id = $2 AND delivered_at IS NULL`,
                  [message.messageId, userId]
                );
              }
              break;

            case 'read':
              if (message.conversationId) {
                await query(
                  `UPDATE conversation_participants SET last_read_at = NOW()
                   WHERE conversation_id = $1 AND user_id = $2`,
                  [message.conversationId, userId]
                );
              }
              break;
          }
        } catch (err) {
          log.warn({ error: err }, 'Invalid WebSocket message format');
        }
      });

      socket.on('close', () => {
        clearInterval(heartbeatInterval);
        updatePresence(userId, 'offline');
        log.info({ userId }, 'Messaging WebSocket disconnected');
      });
    } catch {
      socket.close(1008, 'Invalid token');
    }
  });

  log.info('Enhanced messaging routes registered');
}
