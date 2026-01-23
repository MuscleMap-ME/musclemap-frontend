/**
 * Messaging Service
 *
 * Comprehensive messaging service handling all messaging features:
 * - Core messaging (send, edit, delete)
 * - Typing indicators
 * - Presence (online/offline/away)
 * - Delivery and read receipts
 * - Message reactions
 * - Message search
 * - Voice messages
 * - Link previews
 * - Scheduled messages
 * - Message forwarding and pinning
 * - Rate limiting
 * - Push notifications
 */

import crypto from 'crypto';
import { queryAll, queryOne, query } from '../../db/client';
import { getRedis, isRedisAvailable } from '../../lib/redis';
import { publish, PUBSUB_CHANNELS } from '../../lib/pubsub';
import { loggers } from '../../lib/logger';

const log = loggers.core;

// ============================================
// TYPES
// ============================================

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  content: string;
  contentType: string;
  replyToId?: string;
  threadRootId?: string;
  forwardedFromId?: string;
  editedAt?: Date;
  pinnedAt?: Date;
  pinnedBy?: string;
  expiresAt?: Date;
  createdAt: Date;
  metadata?: Record<string, unknown>;
}

export interface Conversation {
  id: string;
  type: 'direct' | 'group';
  name?: string;
  createdBy: string;
  disappearingTtl?: number;
  createdAt: Date;
  updatedAt: Date;
  lastMessageAt?: Date;
}

export interface MessageReceipt {
  messageId: string;
  userId: string;
  deliveredAt?: Date;
  readAt?: Date;
}

export interface Reaction {
  id: string;
  messageId: string;
  userId: string;
  emoji: string;
  createdAt: Date;
}

export interface TypingIndicator {
  conversationId: string;
  userId: string;
  username: string;
  avatarUrl?: string;
  isTyping: boolean;
}

export interface UserPresence {
  userId: string;
  status: 'online' | 'away' | 'offline';
  lastSeen?: Date;
  device?: string;
}

export interface LinkPreview {
  url: string;
  title?: string;
  description?: string;
  imageUrl?: string;
  siteName?: string;
  faviconUrl?: string;
}

export interface ScheduledMessage {
  id: string;
  conversationId: string;
  senderId: string;
  content: string;
  contentType: string;
  scheduledFor: Date;
  timezone: string;
  status: 'pending' | 'sent' | 'cancelled';
}

export interface MessageTemplate {
  id: string;
  userId: string;
  name: string;
  content: string;
  shortcut?: string;
  category?: string;
  useCount: number;
}

export interface RateLimitInfo {
  messagesRemaining: number;
  conversationsRemaining: number;
  resetAt: Date;
}

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
  MESSAGE_COST_CREDITS: 0.1,
};

const REDIS_KEYS_MESSAGING = {
  TYPING: (convId: string, userId: string) => `typing:${convId}:${userId}`,
  TYPING_CONV: (convId: string) => `typing:${convId}:*`,
  PRESENCE: (userId: string) => `presence:${userId}`,
  RATE_LIMIT: (userId: string) => `ratelimit:msg:${userId}`,
  LINK_PREVIEW: (url: string) => `linkpreview:${Buffer.from(url).toString('base64').slice(0, 50)}`,
};

// ============================================
// UTILITY FUNCTIONS
// ============================================

function generateId(prefix: string): string {
  return `${prefix}_${crypto.randomBytes(12).toString('hex')}`;
}

function sanitizeContent(content: string): string {
  // Basic XSS prevention
  return content
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}

// Exported for use by link preview feature
export function extractUrls(text: string): string[] {
  const urlRegex = /https?:\/\/[^\s<>"\[\]{}|\\^`]+/gi;
  return text.match(urlRegex) || [];
}

// ============================================
// CORE MESSAGING
// ============================================

export async function sendMessage(
  conversationId: string,
  senderId: string,
  content: string,
  options: {
    contentType?: string;
    replyToId?: string;
    forwardedFromId?: string;
    metadata?: Record<string, unknown>;
  } = {}
): Promise<Message> {
  const now = new Date();
  const messageId = generateId('msg');

  // Get conversation to check for disappearing messages
  const conversation = await queryOne<{ disappearing_ttl: number | null }>(
    `SELECT disappearing_ttl FROM conversations WHERE id = $1`,
    [conversationId]
  );

  let expiresAt: Date | null = null;
  if (conversation?.disappearing_ttl) {
    expiresAt = new Date(now.getTime() + conversation.disappearing_ttl * 1000);
  }

  // Insert message
  await query(
    `INSERT INTO messages (
      id, conversation_id, sender_id, content, content_type,
      reply_to_id, forwarded_from_id, expires_at, created_at, metadata
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
    [
      messageId,
      conversationId,
      senderId,
      sanitizeContent(content),
      options.contentType || 'text',
      options.replyToId || null,
      options.forwardedFromId || null,
      expiresAt,
      now.toISOString(),
      options.metadata ? JSON.stringify(options.metadata) : null,
    ]
  );

  // Update conversation last_message_at
  await query(
    `UPDATE conversations SET last_message_at = $1, updated_at = $1 WHERE id = $2`,
    [now.toISOString(), conversationId]
  );

  // Update reply count if this is a thread reply
  if (options.replyToId) {
    await query(
      `UPDATE messages SET reply_count = reply_count + 1 WHERE id = $1`,
      [options.replyToId]
    );
  }

  // Get participants for receipts and notifications
  const participants = await queryAll<{ user_id: string }>(
    `SELECT user_id FROM conversation_participants WHERE conversation_id = $1 AND user_id != $2`,
    [conversationId, senderId]
  );

  // Create delivery receipts for all participants
  for (const participant of participants) {
    await query(
      `INSERT INTO message_receipts (message_id, user_id)
       VALUES ($1, $2)
       ON CONFLICT (message_id, user_id) DO NOTHING`,
      [messageId, participant.user_id]
    );
  }

  // Update analytics
  await updateMessageAnalytics(senderId, 'sent');

  // Publish message event
  await publish(PUBSUB_CHANNELS.MESSAGE_RECEIVED, {
    id: messageId,
    conversationId,
    senderId,
    content: sanitizeContent(content),
    contentType: options.contentType || 'text',
    replyToId: options.replyToId,
    createdAt: now.toISOString(),
  });

  // Publish conversation update
  await publish(PUBSUB_CHANNELS.CONVERSATION_UPDATED, {
    id: conversationId,
    participantIds: [senderId, ...participants.map((p) => p.user_id)],
    lastMessageId: messageId,
    updatedAt: now.toISOString(),
  });

  // Queue push notifications for offline users
  await queuePushNotifications(conversationId, senderId, content, participants.map((p) => p.user_id));

  return {
    id: messageId,
    conversationId,
    senderId,
    content: sanitizeContent(content),
    contentType: options.contentType || 'text',
    replyToId: options.replyToId,
    forwardedFromId: options.forwardedFromId,
    expiresAt: expiresAt || undefined,
    createdAt: now,
  };
}

export async function editMessage(
  messageId: string,
  userId: string,
  newContent: string
): Promise<Message> {
  // Get existing message
  const message = await queryOne<{
    id: string;
    sender_id: string;
    content: string;
    original_content: string | null;
    edit_count: number;
    created_at: Date;
    conversation_id: string;
  }>(`SELECT * FROM messages WHERE id = $1 AND deleted_at IS NULL`, [messageId]);

  if (!message) {
    throw new Error('Message not found');
  }

  if (message.sender_id !== userId) {
    throw new Error('Can only edit your own messages');
  }

  // Check edit window
  const messageAge = Date.now() - new Date(message.created_at).getTime();
  if (messageAge > RATE_LIMITS.MESSAGE_EDIT_WINDOW_MS) {
    throw new Error('Edit window has expired (15 minutes)');
  }

  // Check edit count
  if (message.edit_count >= RATE_LIMITS.MAX_EDITS_PER_MESSAGE) {
    throw new Error(`Maximum edits (${RATE_LIMITS.MAX_EDITS_PER_MESSAGE}) reached`);
  }

  const now = new Date();
  const originalContent = message.original_content || message.content;

  await query(
    `UPDATE messages
     SET content = $1, original_content = $2, edit_count = edit_count + 1, edited_at = $3
     WHERE id = $4`,
    [sanitizeContent(newContent), originalContent, now.toISOString(), messageId]
  );

  // Publish edit event
  await publish(PUBSUB_CHANNELS.MESSAGE_RECEIVED, {
    id: messageId,
    conversationId: message.conversation_id,
    senderId: userId,
    content: sanitizeContent(newContent),
    edited: true,
    editedAt: now.toISOString(),
  });

  return {
    id: messageId,
    conversationId: message.conversation_id,
    senderId: userId,
    content: sanitizeContent(newContent),
    contentType: 'text',
    editedAt: now,
    createdAt: message.created_at,
  };
}

export async function deleteMessage(messageId: string, userId: string): Promise<boolean> {
  const message = await queryOne<{ sender_id: string; conversation_id: string }>(
    `SELECT sender_id, conversation_id FROM messages WHERE id = $1`,
    [messageId]
  );

  if (!message) {
    throw new Error('Message not found');
  }

  if (message.sender_id !== userId) {
    throw new Error('Can only delete your own messages');
  }

  await query(`UPDATE messages SET deleted_at = NOW() WHERE id = $1`, [messageId]);

  // Publish deletion event
  await publish(PUBSUB_CHANNELS.MESSAGE_RECEIVED, {
    id: messageId,
    conversationId: message.conversation_id,
    deleted: true,
  });

  return true;
}

// ============================================
// TYPING INDICATORS
// ============================================

export async function setTypingStatus(
  conversationId: string,
  userId: string,
  isTyping: boolean
): Promise<void> {
  const redis = getRedis();

  if (redis && isRedisAvailable()) {
    const key = REDIS_KEYS_MESSAGING.TYPING(conversationId, userId);

    if (isTyping) {
      // Get user info for the indicator
      const user = await queryOne<{ username: string; avatar_url: string }>(
        `SELECT username, avatar_url FROM users WHERE id = $1`,
        [userId]
      );

      await redis.setex(
        key,
        RATE_LIMITS.TYPING_TTL_SECONDS,
        JSON.stringify({
          username: user?.username,
          avatarUrl: user?.avatar_url,
          startedAt: Date.now(),
        })
      );
    } else {
      await redis.del(key);
    }

    // Publish typing event
    await publish('pubsub:typing', {
      conversationId,
      userId,
      isTyping,
    });
  } else {
    // Fallback: store in database (less efficient but functional)
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

export async function getTypingUsers(conversationId: string): Promise<TypingIndicator[]> {
  const redis = getRedis();

  if (redis && isRedisAvailable()) {
    // Use SCAN instead of KEYS to avoid blocking Redis in production
    // KEYS is O(n) and blocks the single-threaded Redis server
    const indicators: TypingIndicator[] = [];
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
                conversationId,
                userId,
                username: parsed.username,
                avatarUrl: parsed.avatarUrl,
                isTyping: true,
              });
            } catch {
              // Skip malformed data
            }
          }
        }
      }
    } while (cursor !== '0');

    return indicators;
  } else {
    // Fallback: query database
    const results = await queryAll<{
      user_id: string;
      username: string;
      avatar_url: string;
    }>(
      `SELECT ti.user_id, u.username, u.avatar_url
       FROM typing_indicators ti
       JOIN users u ON ti.user_id = u.id
       WHERE ti.conversation_id = $1
         AND ti.started_at > NOW() - INTERVAL '5 seconds'`,
      [conversationId]
    );

    return results.map((r) => ({
      conversationId,
      userId: r.user_id,
      username: r.username,
      avatarUrl: r.avatar_url,
      isTyping: true,
    }));
  }
}

// ============================================
// PRESENCE SYSTEM
// ============================================

export async function updatePresence(
  userId: string,
  status: 'online' | 'away' | 'offline',
  device?: string
): Promise<void> {
  const redis = getRedis();
  const now = new Date();

  // Update database
  await query(`UPDATE users SET last_active_at = $1 WHERE id = $2`, [now.toISOString(), userId]);

  if (redis && isRedisAvailable()) {
    const key = REDIS_KEYS_MESSAGING.PRESENCE(userId);

    if (status === 'offline') {
      await redis.del(key);
    } else {
      await redis.setex(
        key,
        RATE_LIMITS.PRESENCE_TTL_SECONDS,
        JSON.stringify({
          status,
          lastSeen: now.toISOString(),
          device: device || 'web',
        })
      );
    }

    // Publish presence event
    await publish('pubsub:presence', {
      userId,
      status,
      lastSeen: now.toISOString(),
    });
  }
}

export async function getPresence(userId: string): Promise<UserPresence> {
  const redis = getRedis();

  if (redis && isRedisAvailable()) {
    const key = REDIS_KEYS_MESSAGING.PRESENCE(userId);
    const data = await redis.get(key);

    if (data) {
      const parsed = JSON.parse(data);
      return {
        userId,
        status: parsed.status,
        lastSeen: new Date(parsed.lastSeen),
        device: parsed.device,
      };
    }
  }

  // Fallback: check database
  const user = await queryOne<{ last_active_at: Date; presence_visible: boolean }>(
    `SELECT last_active_at, presence_visible FROM users WHERE id = $1`,
    [userId]
  );

  if (!user || !user.presence_visible) {
    return { userId, status: 'offline' };
  }

  if (!user.last_active_at) {
    return { userId, status: 'offline' };
  }

  const timeSinceActive = Date.now() - new Date(user.last_active_at).getTime();

  if (timeSinceActive < RATE_LIMITS.PRESENCE_AWAY_THRESHOLD_MS) {
    return { userId, status: 'online', lastSeen: user.last_active_at };
  } else if (timeSinceActive < RATE_LIMITS.PRESENCE_TTL_SECONDS * 1000) {
    return { userId, status: 'away', lastSeen: user.last_active_at };
  }

  return { userId, status: 'offline', lastSeen: user.last_active_at };
}

export async function getBulkPresence(userIds: string[]): Promise<Map<string, UserPresence>> {
  const presenceMap = new Map<string, UserPresence>();

  if (userIds.length === 0) {
    return presenceMap;
  }

  const redis = getRedis();

  if (redis && isRedisAvailable()) {
    // Batch fetch from Redis using MGET
    const keys = userIds.map((id) => REDIS_KEYS_MESSAGING.PRESENCE(id));
    const values = await redis.mget(...keys);

    for (let i = 0; i < userIds.length; i++) {
      const userId = userIds[i];
      const data = values[i];

      if (data) {
        try {
          const parsed = JSON.parse(data);
          presenceMap.set(userId, {
            userId,
            status: parsed.status,
            lastSeen: new Date(parsed.lastSeen),
            device: parsed.device,
          });
        } catch {
          presenceMap.set(userId, { userId, status: 'offline' });
        }
      } else {
        presenceMap.set(userId, { userId, status: 'offline' });
      }
    }
  } else {
    // Batch fetch from database
    const users = await queryAll<{ id: string; last_active_at: Date; presence_visible: boolean }>(
      `SELECT id, last_active_at, COALESCE(presence_visible, true) as presence_visible
       FROM users WHERE id = ANY($1)`,
      [userIds]
    );

    const userMap = new Map(users.map((u: any) => [u.id, u]));

    for (const userId of userIds) {
      const user = userMap.get(userId);
      if (!user || !user.presence_visible || !user.last_active_at) {
        presenceMap.set(userId, { userId, status: 'offline' });
      } else {
        const timeSinceActive = Date.now() - new Date(user.last_active_at).getTime();
        if (timeSinceActive < RATE_LIMITS.PRESENCE_AWAY_THRESHOLD_MS) {
          presenceMap.set(userId, { userId, status: 'online', lastSeen: user.last_active_at });
        } else if (timeSinceActive < RATE_LIMITS.PRESENCE_TTL_SECONDS * 1000) {
          presenceMap.set(userId, { userId, status: 'away', lastSeen: user.last_active_at });
        } else {
          presenceMap.set(userId, { userId, status: 'offline', lastSeen: user.last_active_at });
        }
      }
    }
  }

  return presenceMap;
}

// ============================================
// DELIVERY & READ RECEIPTS
// ============================================

export async function markDelivered(messageId: string, userId: string): Promise<void> {
  await query(
    `UPDATE message_receipts SET delivered_at = NOW()
     WHERE message_id = $1 AND user_id = $2 AND delivered_at IS NULL`,
    [messageId, userId]
  );

  // Publish delivery event
  const message = await queryOne<{ conversation_id: string; sender_id: string }>(
    `SELECT conversation_id, sender_id FROM messages WHERE id = $1`,
    [messageId]
  );

  if (message) {
    await publish('pubsub:delivery', {
      messageId,
      conversationId: message.conversation_id,
      senderId: message.sender_id,
      userId,
      deliveredAt: new Date().toISOString(),
    });
  }
}

export async function markRead(conversationId: string, userId: string): Promise<void> {
  const now = new Date();

  // Update conversation participant's last_read_at
  await query(
    `UPDATE conversation_participants SET last_read_at = $1
     WHERE conversation_id = $2 AND user_id = $3`,
    [now.toISOString(), conversationId, userId]
  );

  // Update all unread message receipts
  await query(
    `UPDATE message_receipts mr
     SET read_at = $1
     FROM messages m
     WHERE mr.message_id = m.id
       AND m.conversation_id = $2
       AND mr.user_id = $3
       AND mr.read_at IS NULL`,
    [now.toISOString(), conversationId, userId]
  );

  // Update analytics
  await updateMessageAnalytics(userId, 'received');

  // Publish read event
  await publish('pubsub:read', {
    conversationId,
    userId,
    readAt: now.toISOString(),
  });
}

export async function getMessageReceipts(messageId: string): Promise<MessageReceipt[]> {
  const receipts = await queryAll<{
    message_id: string;
    user_id: string;
    delivered_at: Date | null;
    read_at: Date | null;
  }>(`SELECT * FROM message_receipts WHERE message_id = $1`, [messageId]);

  return receipts.map((r) => ({
    messageId: r.message_id,
    userId: r.user_id,
    deliveredAt: r.delivered_at || undefined,
    readAt: r.read_at || undefined,
  }));
}

// ============================================
// MESSAGE REACTIONS
// ============================================

export async function addReaction(
  messageId: string,
  userId: string,
  emoji: string
): Promise<Reaction> {
  const id = generateId('rxn');

  await query(
    `INSERT INTO message_reactions (id, message_id, user_id, emoji)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (message_id, user_id, emoji) DO NOTHING`,
    [id, messageId, userId, emoji]
  );

  const message = await queryOne<{ conversation_id: string }>(
    `SELECT conversation_id FROM messages WHERE id = $1`,
    [messageId]
  );

  // Publish reaction event
  await publish('pubsub:reaction', {
    messageId,
    conversationId: message?.conversation_id,
    userId,
    emoji,
    action: 'add',
  });

  return {
    id,
    messageId,
    userId,
    emoji,
    createdAt: new Date(),
  };
}

export async function removeReaction(
  messageId: string,
  userId: string,
  emoji: string
): Promise<boolean> {
  await query(
    `DELETE FROM message_reactions WHERE message_id = $1 AND user_id = $2 AND emoji = $3`,
    [messageId, userId, emoji]
  );

  const message = await queryOne<{ conversation_id: string }>(
    `SELECT conversation_id FROM messages WHERE id = $1`,
    [messageId]
  );

  // Publish reaction event
  await publish('pubsub:reaction', {
    messageId,
    conversationId: message?.conversation_id,
    userId,
    emoji,
    action: 'remove',
  });

  return true;
}

export async function getReactions(
  messageId: string
): Promise<{ emoji: string; count: number; users: string[]; hasReacted?: boolean }[]> {
  const reactions = await queryAll<{
    emoji: string;
    user_ids: string[];
  }>(
    `SELECT emoji, array_agg(user_id) as user_ids
     FROM message_reactions
     WHERE message_id = $1
     GROUP BY emoji
     ORDER BY MIN(created_at)`,
    [messageId]
  );

  return reactions.map((r) => ({
    emoji: r.emoji,
    count: r.user_ids.length,
    users: r.user_ids,
  }));
}

// ============================================
// MESSAGE SEARCH
// ============================================

export async function searchMessages(
  userId: string,
  query: string,
  options: {
    conversationId?: string;
    fromUserId?: string;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
    offset?: number;
  } = {}
): Promise<{ messages: Message[]; total: number }> {
  const limit = Math.min(options.limit || 20, 100);
  const offset = options.offset || 0;

  let sql = `
    SELECT m.*, u.username as sender_username,
           ts_headline('english', m.content, plainto_tsquery('english', $1), 'MaxWords=50, MinWords=20') as highlight,
           ts_rank(m.search_vector, plainto_tsquery('english', $1)) as rank
    FROM messages m
    JOIN conversation_participants cp ON m.conversation_id = cp.conversation_id AND cp.user_id = $2
    JOIN users u ON m.sender_id = u.id
    WHERE m.search_vector @@ plainto_tsquery('english', $1)
      AND m.deleted_at IS NULL
  `;
  const params: (string | Date | number)[] = [query, userId];

  if (options.conversationId) {
    params.push(options.conversationId);
    sql += ` AND m.conversation_id = $${params.length}`;
  }

  if (options.fromUserId) {
    params.push(options.fromUserId);
    sql += ` AND m.sender_id = $${params.length}`;
  }

  if (options.startDate) {
    params.push(options.startDate);
    sql += ` AND m.created_at >= $${params.length}`;
  }

  if (options.endDate) {
    params.push(options.endDate);
    sql += ` AND m.created_at <= $${params.length}`;
  }

  sql += ` ORDER BY rank DESC, m.created_at DESC`;

  // Get total count
  const countSql = sql.replace(
    /SELECT m\.\*, u\.username.*rank/,
    'SELECT COUNT(*) as total'
  );
  const countResult = await queryOne<{ total: string }>(countSql, params);
  const total = parseInt(countResult?.total || '0', 10);

  // Get paginated results
  params.push(limit, offset);
  sql += ` LIMIT $${params.length - 1} OFFSET $${params.length}`;

  const results = await queryAll<{
    id: string;
    conversation_id: string;
    sender_id: string;
    content: string;
    content_type: string;
    created_at: Date;
    highlight: string;
    sender_username: string;
  }>(sql, params);

  return {
    messages: results.map((r) => ({
      id: r.id,
      conversationId: r.conversation_id,
      senderId: r.sender_id,
      content: r.content,
      contentType: r.content_type,
      createdAt: r.created_at,
      metadata: { highlight: r.highlight, senderUsername: r.sender_username },
    })),
    total,
  };
}

// ============================================
// LINK PREVIEWS
// ============================================

export async function getLinkPreview(url: string): Promise<LinkPreview | null> {
  // Check cache first
  const redis = getRedis();
  if (redis && isRedisAvailable()) {
    const cached = await redis.get(REDIS_KEYS_MESSAGING.LINK_PREVIEW(url));
    if (cached) {
      return JSON.parse(cached);
    }
  }

  // Check database cache
  const dbCached = await queryOne<{
    title: string;
    description: string;
    image_url: string;
    site_name: string;
    favicon_url: string;
    expires_at: Date;
  }>(`SELECT * FROM link_previews WHERE url = $1 AND expires_at > NOW()`, [url]);

  if (dbCached) {
    const preview: LinkPreview = {
      url,
      title: dbCached.title,
      description: dbCached.description,
      imageUrl: dbCached.image_url,
      siteName: dbCached.site_name,
      faviconUrl: dbCached.favicon_url,
    };

    // Cache in Redis
    if (redis && isRedisAvailable()) {
      await redis.setex(REDIS_KEYS_MESSAGING.LINK_PREVIEW(url), 3600, JSON.stringify(preview));
    }

    return preview;
  }

  return null;
}

export async function saveLinkPreview(preview: LinkPreview): Promise<void> {
  await query(
    `INSERT INTO link_previews (url, title, description, image_url, site_name, favicon_url, fetched_at, expires_at)
     VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW() + INTERVAL '7 days')
     ON CONFLICT (url) DO UPDATE SET
       title = $2, description = $3, image_url = $4, site_name = $5, favicon_url = $6,
       fetched_at = NOW(), expires_at = NOW() + INTERVAL '7 days'`,
    [
      preview.url,
      preview.title,
      preview.description,
      preview.imageUrl,
      preview.siteName,
      preview.faviconUrl,
    ]
  );

  // Cache in Redis
  const redis = getRedis();
  if (redis && isRedisAvailable()) {
    await redis.setex(REDIS_KEYS_MESSAGING.LINK_PREVIEW(preview.url), 3600, JSON.stringify(preview));
  }
}

// ============================================
// MESSAGE FORWARDING
// ============================================

export async function forwardMessage(
  messageId: string,
  userId: string,
  toConversationIds: string[],
  addComment?: string
): Promise<Message[]> {
  const originalMessage = await queryOne<{
    id: string;
    content: string;
    content_type: string;
    conversation_id: string;
  }>(`SELECT * FROM messages WHERE id = $1 AND deleted_at IS NULL`, [messageId]);

  if (!originalMessage) {
    throw new Error('Message not found');
  }

  // Verify user has access to original message
  const hasAccess = await queryOne(
    `SELECT 1 FROM conversation_participants WHERE conversation_id = $1 AND user_id = $2`,
    [originalMessage.conversation_id, userId]
  );

  if (!hasAccess) {
    throw new Error('No access to original message');
  }

  const forwardedMessages: Message[] = [];

  for (const convId of toConversationIds) {
    // Verify user is participant in destination
    const isParticipant = await queryOne(
      `SELECT 1 FROM conversation_participants WHERE conversation_id = $1 AND user_id = $2`,
      [convId, userId]
    );

    if (!isParticipant) {
      continue;
    }

    // Send optional comment first
    if (addComment) {
      await sendMessage(convId, userId, addComment);
    }

    // Send forwarded message
    const forwarded = await sendMessage(convId, userId, originalMessage.content, {
      contentType: originalMessage.content_type,
      forwardedFromId: messageId,
    });

    forwardedMessages.push(forwarded);
  }

  return forwardedMessages;
}

// ============================================
// MESSAGE PINNING
// ============================================

export async function pinMessage(
  messageId: string,
  userId: string
): Promise<Message> {
  const message = await queryOne<{
    conversation_id: string;
    pinned_at: Date | null;
  }>(`SELECT conversation_id, pinned_at FROM messages WHERE id = $1`, [messageId]);

  if (!message) {
    throw new Error('Message not found');
  }

  if (message.pinned_at) {
    throw new Error('Message is already pinned');
  }

  // Check user has permission (owner or moderator)
  const participant = await queryOne<{ role: string }>(
    `SELECT role FROM conversation_participants WHERE conversation_id = $1 AND user_id = $2`,
    [message.conversation_id, userId]
  );

  if (!participant || !['owner', 'moderator'].includes(participant.role)) {
    throw new Error('Only owners and moderators can pin messages');
  }

  // Check pin limit
  const pinnedCount = await queryOne<{ count: string }>(
    `SELECT COUNT(*) as count FROM messages WHERE conversation_id = $1 AND pinned_at IS NOT NULL`,
    [message.conversation_id]
  );

  if (parseInt(pinnedCount?.count || '0', 10) >= RATE_LIMITS.MAX_PINNED_MESSAGES) {
    throw new Error(`Maximum ${RATE_LIMITS.MAX_PINNED_MESSAGES} pinned messages reached`);
  }

  await query(
    `UPDATE messages SET pinned_at = NOW(), pinned_by = $1 WHERE id = $2`,
    [userId, messageId]
  );

  const updated = await queryOne<Message>(`SELECT * FROM messages WHERE id = $1`, [messageId]);
  return updated!;
}

export async function unpinMessage(messageId: string, userId: string): Promise<boolean> {
  const message = await queryOne<{ conversation_id: string }>(
    `SELECT conversation_id FROM messages WHERE id = $1`,
    [messageId]
  );

  if (!message) {
    throw new Error('Message not found');
  }

  // Check permission
  const participant = await queryOne<{ role: string }>(
    `SELECT role FROM conversation_participants WHERE conversation_id = $1 AND user_id = $2`,
    [message.conversation_id, userId]
  );

  if (!participant || !['owner', 'moderator'].includes(participant.role)) {
    throw new Error('Only owners and moderators can unpin messages');
  }

  await query(`UPDATE messages SET pinned_at = NULL, pinned_by = NULL WHERE id = $1`, [messageId]);
  return true;
}

export async function getPinnedMessages(conversationId: string): Promise<Message[]> {
  const messages = await queryAll<{
    id: string;
    conversation_id: string;
    sender_id: string;
    content: string;
    content_type: string;
    pinned_at: Date;
    pinned_by: string;
    created_at: Date;
  }>(
    `SELECT * FROM messages
     WHERE conversation_id = $1 AND pinned_at IS NOT NULL AND deleted_at IS NULL
     ORDER BY pinned_at DESC`,
    [conversationId]
  );

  return messages.map((m) => ({
    id: m.id,
    conversationId: m.conversation_id,
    senderId: m.sender_id,
    content: m.content,
    contentType: m.content_type,
    pinnedAt: m.pinned_at,
    pinnedBy: m.pinned_by,
    createdAt: m.created_at,
  }));
}

// ============================================
// SCHEDULED MESSAGES
// ============================================

export async function scheduleMessage(
  conversationId: string,
  senderId: string,
  content: string,
  scheduledFor: Date,
  timezone: string = 'UTC'
): Promise<ScheduledMessage> {
  const id = generateId('sched');

  await query(
    `INSERT INTO scheduled_messages (id, conversation_id, sender_id, content, scheduled_for, timezone)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [id, conversationId, senderId, sanitizeContent(content), scheduledFor.toISOString(), timezone]
  );

  return {
    id,
    conversationId,
    senderId,
    content: sanitizeContent(content),
    contentType: 'text',
    scheduledFor,
    timezone,
    status: 'pending',
  };
}

export async function cancelScheduledMessage(
  scheduledId: string,
  userId: string
): Promise<boolean> {
  const result = await query(
    `UPDATE scheduled_messages SET status = 'cancelled', updated_at = NOW()
     WHERE id = $1 AND sender_id = $2 AND status = 'pending'`,
    [scheduledId, userId]
  );

  return (result as any).rowCount > 0;
}

export async function getScheduledMessages(userId: string): Promise<ScheduledMessage[]> {
  const messages = await queryAll<{
    id: string;
    conversation_id: string;
    sender_id: string;
    content: string;
    content_type: string;
    scheduled_for: Date;
    timezone: string;
    status: string;
  }>(
    `SELECT * FROM scheduled_messages
     WHERE sender_id = $1 AND status = 'pending'
     ORDER BY scheduled_for ASC`,
    [userId]
  );

  return messages.map((m) => ({
    id: m.id,
    conversationId: m.conversation_id,
    senderId: m.sender_id,
    content: m.content,
    contentType: m.content_type,
    scheduledFor: m.scheduled_for,
    timezone: m.timezone,
    status: m.status as 'pending',
  }));
}

export async function processScheduledMessages(): Promise<number> {
  const now = new Date();

  const pending = await queryAll<{
    id: string;
    conversation_id: string;
    sender_id: string;
    content: string;
    content_type: string;
  }>(
    `SELECT * FROM scheduled_messages
     WHERE scheduled_for <= $1 AND status = 'pending'
     ORDER BY scheduled_for ASC
     LIMIT 100`,
    [now.toISOString()]
  );

  let processed = 0;

  for (const scheduled of pending) {
    try {
      const message = await sendMessage(scheduled.conversation_id, scheduled.sender_id, scheduled.content, {
        contentType: scheduled.content_type,
      });

      await query(
        `UPDATE scheduled_messages SET status = 'sent', sent_message_id = $1, updated_at = NOW()
         WHERE id = $2`,
        [message.id, scheduled.id]
      );

      processed++;
    } catch (error) {
      log.error({ scheduledId: scheduled.id, error }, 'Failed to send scheduled message');
    }
  }

  return processed;
}

// ============================================
// MESSAGE TEMPLATES
// ============================================

export async function createTemplate(
  userId: string,
  name: string,
  content: string,
  options: { shortcut?: string; category?: string } = {}
): Promise<MessageTemplate> {
  const id = generateId('tmpl');

  await query(
    `INSERT INTO message_templates (id, user_id, name, content, shortcut, category)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [id, userId, name, content, options.shortcut, options.category]
  );

  return {
    id,
    userId,
    name,
    content,
    shortcut: options.shortcut,
    category: options.category,
    useCount: 0,
  };
}

export async function getTemplates(userId: string): Promise<MessageTemplate[]> {
  const templates = await queryAll<{
    id: string;
    user_id: string;
    name: string;
    content: string;
    shortcut: string | null;
    category: string | null;
    use_count: number;
  }>(`SELECT * FROM message_templates WHERE user_id = $1 ORDER BY use_count DESC, name ASC`, [
    userId,
  ]);

  return templates.map((t) => ({
    id: t.id,
    userId: t.user_id,
    name: t.name,
    content: t.content,
    shortcut: t.shortcut || undefined,
    category: t.category || undefined,
    useCount: t.use_count,
  }));
}

export async function useTemplate(templateId: string): Promise<string> {
  const template = await queryOne<{ content: string }>(
    `UPDATE message_templates SET use_count = use_count + 1, updated_at = NOW()
     WHERE id = $1 RETURNING content`,
    [templateId]
  );

  if (!template) {
    throw new Error('Template not found');
  }

  return template.content;
}

// ============================================
// RATE LIMITING
// ============================================

export async function checkRateLimit(userId: string): Promise<RateLimitInfo> {
  const redis = getRedis();
  const now = new Date();
  const minuteStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours(), now.getMinutes());

  if (redis && isRedisAvailable()) {
    const key = `${REDIS_KEYS_MESSAGING.RATE_LIMIT(userId)}:${minuteStart.getTime()}`;
    const count = await redis.get(key);
    const messagesSent = parseInt(count || '0', 10);

    return {
      messagesRemaining: Math.max(0, RATE_LIMITS.MESSAGES_PER_MINUTE - messagesSent),
      conversationsRemaining: RATE_LIMITS.CONVERSATIONS_PER_DAY, // Simplified
      resetAt: new Date(minuteStart.getTime() + 60000),
    };
  }

  // Fallback: use database
  const limits = await queryOne<{
    messages_sent_today: number;
    conversations_created_today: number;
    last_reset_at: Date;
  }>(`SELECT * FROM message_rate_limits WHERE user_id = $1`, [userId]);

  const today = new Date().toISOString().split('T')[0];

  if (!limits || limits.last_reset_at.toISOString().split('T')[0] !== today) {
    // Reset daily limits
    await query(
      `INSERT INTO message_rate_limits (user_id, messages_sent_today, conversations_created_today, last_reset_at)
       VALUES ($1, 0, 0, CURRENT_DATE)
       ON CONFLICT (user_id) DO UPDATE SET
         messages_sent_today = 0, conversations_created_today = 0, last_reset_at = CURRENT_DATE`,
      [userId]
    );

    return {
      messagesRemaining: RATE_LIMITS.MESSAGES_PER_MINUTE,
      conversationsRemaining: RATE_LIMITS.CONVERSATIONS_PER_DAY,
      resetAt: new Date(now.getTime() + 60000),
    };
  }

  return {
    messagesRemaining: RATE_LIMITS.MESSAGES_PER_MINUTE, // Per minute, simplified
    conversationsRemaining: RATE_LIMITS.CONVERSATIONS_PER_DAY - limits.conversations_created_today,
    resetAt: new Date(now.getTime() + 60000),
  };
}

export async function incrementRateLimit(
  userId: string,
  type: 'message' | 'conversation'
): Promise<void> {
  const redis = getRedis();

  if (redis && isRedisAvailable()) {
    const now = new Date();
    const minuteStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours(), now.getMinutes());
    const key = `${REDIS_KEYS_MESSAGING.RATE_LIMIT(userId)}:${minuteStart.getTime()}`;

    await redis.incr(key);
    await redis.expire(key, 60);
  } else {
    // Fallback: use database
    if (type === 'message') {
      await query(
        `UPDATE message_rate_limits SET messages_sent_today = messages_sent_today + 1, last_message_at = NOW()
         WHERE user_id = $1`,
        [userId]
      );
    } else {
      await query(
        `UPDATE message_rate_limits SET conversations_created_today = conversations_created_today + 1
         WHERE user_id = $1`,
        [userId]
      );
    }
  }
}

export async function deductCredits(userId: string, amount: number): Promise<boolean> {
  const result = await query(
    `UPDATE users SET credit_balance = credit_balance - $1
     WHERE id = $2 AND credit_balance >= $1
     RETURNING credit_balance`,
    [amount, userId]
  );

  if ((result as any).rowCount === 0) {
    return false;
  }

  // Log transaction
  await query(
    `INSERT INTO credit_transactions (id, user_id, amount, type, description, created_at)
     VALUES ($1, $2, $3, 'message_send', 'Message sending cost', NOW())`,
    [generateId('txn'), userId, -amount]
  );

  return true;
}

// ============================================
// PUSH NOTIFICATIONS
// ============================================

export async function registerPushSubscription(
  userId: string,
  endpoint: string,
  keys: { p256dh: string; auth: string },
  deviceType: string = 'web',
  deviceName?: string
): Promise<void> {
  await query(
    `INSERT INTO push_subscriptions (user_id, endpoint, keys_p256dh, keys_auth, device_type, device_name)
     VALUES ($1, $2, $3, $4, $5, $6)
     ON CONFLICT (user_id, endpoint) DO UPDATE SET
       keys_p256dh = $3, keys_auth = $4, device_type = $5, device_name = $6, last_used_at = NOW()`,
    [userId, endpoint, keys.p256dh, keys.auth, deviceType, deviceName]
  );
}

export async function unregisterPushSubscription(userId: string, endpoint: string): Promise<void> {
  await query(`DELETE FROM push_subscriptions WHERE user_id = $1 AND endpoint = $2`, [
    userId,
    endpoint,
  ]);
}

async function queuePushNotifications(
  conversationId: string,
  senderId: string,
  content: string,
  recipientIds: string[]
): Promise<void> {
  // Get sender info
  const sender = await queryOne<{ username: string; display_name: string }>(
    `SELECT username, display_name FROM users WHERE id = $1`,
    [senderId]
  );

  // Get notification preferences and push subscriptions
  for (const recipientId of recipientIds) {
    const prefs = await queryOne<{ messaging_enabled: boolean; messaging_preview: boolean }>(
      `SELECT messaging_enabled, messaging_preview FROM notification_preferences WHERE user_id = $1`,
      [recipientId]
    );

    // Default to enabled if no preferences set
    if (prefs && !prefs.messaging_enabled) {
      continue;
    }

    // Check if user is online (skip push if online)
    const presence = await getPresence(recipientId);
    if (presence.status === 'online') {
      continue;
    }

    // Get push subscriptions
    const subscriptions = await queryAll<{
      endpoint: string;
      keys_p256dh: string;
      keys_auth: string;
    }>(`SELECT endpoint, keys_p256dh, keys_auth FROM push_subscriptions WHERE user_id = $1`, [
      recipientId,
    ]);

    // In production, you would send to a push notification service here
    // For now, just log that we would send
    for (const sub of subscriptions) {
      log.debug(
        {
          recipientId,
          endpoint: sub.endpoint.slice(0, 50),
          sender: sender?.display_name || sender?.username,
        },
        'Would send push notification'
      );
    }
  }
}

// ============================================
// ANALYTICS
// ============================================

async function updateMessageAnalytics(userId: string, type: 'sent' | 'received'): Promise<void> {
  const today = new Date().toISOString().split('T')[0];

  if (type === 'sent') {
    await query(
      `INSERT INTO message_analytics (user_id, date, messages_sent)
       VALUES ($1, $2, 1)
       ON CONFLICT (user_id, date) DO UPDATE SET messages_sent = message_analytics.messages_sent + 1`,
      [userId, today]
    );
  } else {
    await query(
      `INSERT INTO message_analytics (user_id, date, messages_received)
       VALUES ($1, $2, 1)
       ON CONFLICT (user_id, date) DO UPDATE SET messages_received = message_analytics.messages_received + 1`,
      [userId, today]
    );
  }
}

export async function getMessageAnalytics(
  userId: string,
  startDate: Date,
  endDate: Date
): Promise<{
  totalSent: number;
  totalReceived: number;
  avgResponseTime?: number;
  dailyStats: Array<{ date: string; sent: number; received: number }>;
}> {
  const stats = await queryAll<{
    date: Date;
    messages_sent: number;
    messages_received: number;
    avg_response_time_seconds: number | null;
  }>(
    `SELECT * FROM message_analytics
     WHERE user_id = $1 AND date >= $2 AND date <= $3
     ORDER BY date ASC`,
    [userId, startDate.toISOString().split('T')[0], endDate.toISOString().split('T')[0]]
  );

  let totalSent = 0;
  let totalReceived = 0;
  let totalResponseTime = 0;
  let responseTimeCount = 0;

  const dailyStats = stats.map((s) => {
    totalSent += s.messages_sent;
    totalReceived += s.messages_received;
    if (s.avg_response_time_seconds) {
      totalResponseTime += s.avg_response_time_seconds;
      responseTimeCount++;
    }

    return {
      date: s.date.toISOString().split('T')[0],
      sent: s.messages_sent,
      received: s.messages_received,
    };
  });

  return {
    totalSent,
    totalReceived,
    avgResponseTime: responseTimeCount > 0 ? totalResponseTime / responseTimeCount : undefined,
    dailyStats,
  };
}

// ============================================
// DISAPPEARING MESSAGES
// ============================================

export async function setDisappearingMessages(
  conversationId: string,
  userId: string,
  ttlSeconds: number | null
): Promise<void> {
  // Verify user is owner or moderator
  const participant = await queryOne<{ role: string }>(
    `SELECT role FROM conversation_participants WHERE conversation_id = $1 AND user_id = $2`,
    [conversationId, userId]
  );

  if (!participant || !['owner', 'moderator'].includes(participant.role)) {
    throw new Error('Only owners and moderators can set disappearing messages');
  }

  await query(`UPDATE conversations SET disappearing_ttl = $1, updated_at = NOW() WHERE id = $2`, [
    ttlSeconds,
    conversationId,
  ]);
}

export async function cleanupExpiredMessages(): Promise<number> {
  const result = await query(`DELETE FROM messages WHERE expires_at IS NOT NULL AND expires_at < NOW()`);
  return (result as any).rowCount || 0;
}

// ============================================
// CONVERSATION MANAGEMENT
// ============================================

export async function archiveConversation(conversationId: string, userId: string): Promise<void> {
  await query(
    `UPDATE conversations SET archived_at = NOW() WHERE id = $1
     AND EXISTS (SELECT 1 FROM conversation_participants WHERE conversation_id = $1 AND user_id = $2)`,
    [conversationId, userId]
  );
}

export async function unarchiveConversation(conversationId: string, userId: string): Promise<void> {
  await query(
    `UPDATE conversations SET archived_at = NULL WHERE id = $1
     AND EXISTS (SELECT 1 FROM conversation_participants WHERE conversation_id = $1 AND user_id = $2)`,
    [conversationId, userId]
  );
}

export async function starConversation(conversationId: string, userId: string): Promise<void> {
  await query(
    `UPDATE conversation_participants SET starred = true
     WHERE conversation_id = $1 AND user_id = $2`,
    [conversationId, userId]
  );
}

export async function unstarConversation(conversationId: string, userId: string): Promise<void> {
  await query(
    `UPDATE conversation_participants SET starred = false
     WHERE conversation_id = $1 AND user_id = $2`,
    [conversationId, userId]
  );
}

// ============================================
// CONTENT SHARING
// ============================================

export async function shareContent(
  conversationId: string,
  senderId: string,
  contentType: 'workout' | 'achievement' | 'challenge' | 'profile',
  contentId: string,
  previewData?: Record<string, unknown>
): Promise<Message> {
  const messageId = generateId('msg');
  const sharedContentId = generateId('shared');
  const now = new Date();

  // Create the message
  await query(
    `INSERT INTO messages (id, conversation_id, sender_id, content, content_type, created_at)
     VALUES ($1, $2, $3, $4, 'shared', $5)`,
    [messageId, conversationId, senderId, `Shared ${contentType}`, now.toISOString()]
  );

  // Create shared content reference
  await query(
    `INSERT INTO message_shared_content (id, message_id, content_type, content_id, preview_data)
     VALUES ($1, $2, $3, $4, $5)`,
    [sharedContentId, messageId, contentType, contentId, previewData ? JSON.stringify(previewData) : null]
  );

  // Update conversation
  await query(
    `UPDATE conversations SET last_message_at = $1, updated_at = $1 WHERE id = $2`,
    [now.toISOString(), conversationId]
  );

  return {
    id: messageId,
    conversationId,
    senderId,
    content: `Shared ${contentType}`,
    contentType: 'shared',
    createdAt: now,
    metadata: { sharedContentType: contentType, sharedContentId: contentId, preview: previewData },
  };
}

// ============================================
// REPORT MESSAGE
// ============================================

export async function reportMessage(
  messageId: string,
  reporterId: string,
  reason: string,
  details?: string
): Promise<void> {
  const id = generateId('rpt');

  await query(
    `INSERT INTO message_reports (id, message_id, reporter_id, reason, details)
     VALUES ($1, $2, $3, $4, $5)`,
    [id, messageId, reporterId, reason, details]
  );

  log.info({ reportId: id, messageId, reporterId, reason }, 'Message reported');
}
