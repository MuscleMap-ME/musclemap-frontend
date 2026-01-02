/**
 * Message Service
 *
 * Handles CRUD operations for messages and conversations.
 */

import crypto from 'crypto';
import { db } from '../../db/client';
import { loggers } from '../../lib/logger';
import { NotFoundError, AuthorizationError, ValidationError } from '../../lib/errors';
import {
  Conversation,
  ConversationParticipant,
  Message,
  MessageWithSender,
  ConversationWithParticipants,
  CreateConversationRequest,
  SendMessageRequest,
  ConversationType,
} from './types';

const log = loggers.core;

function generateId(prefix: string): string {
  return `${prefix}_${crypto.randomBytes(12).toString('hex')}`;
}

/**
 * Create a new conversation
 */
export async function createConversation(
  creatorId: string,
  request: CreateConversationRequest
): Promise<ConversationWithParticipants> {
  const { type = 'direct', name, participantIds } = request;

  // Validate participants
  if (!participantIds || participantIds.length === 0) {
    throw new ValidationError('At least one participant is required');
  }

  // For direct messages, exactly 2 participants
  if (type === 'direct' && participantIds.length !== 1) {
    throw new ValidationError('Direct conversations require exactly one other participant');
  }

  // Check if direct conversation already exists between these users
  if (type === 'direct') {
    const existing = await findDirectConversation(creatorId, participantIds[0]);
    if (existing) {
      return (await getConversationWithDetails(existing.id, creatorId))!;
    }
  }

  // Check for blocked users
  const allParticipants = [creatorId, ...participantIds];
  for (const participantId of participantIds) {
    if (await isBlocked(creatorId, participantId) || await isBlocked(participantId, creatorId)) {
      throw new ValidationError('Cannot create conversation with blocked user');
    }
  }

  const conversationId = generateId('conv');
  const now = new Date().toISOString();

  await db.query(`
    INSERT INTO conversations (id, type, name, created_by, created_at, updated_at)
    VALUES ($1, $2, $3, $4, $5, $6)
  `, [conversationId, type, name || null, creatorId, now, now]);

  // Add all participants - Creator is owner
  await db.query(`
    INSERT INTO conversation_participants (conversation_id, user_id, joined_at, role)
    VALUES ($1, $2, $3, $4)
  `, [conversationId, creatorId, now, 'owner']);

  // Other participants are members
  for (const participantId of participantIds) {
    await db.query(`
      INSERT INTO conversation_participants (conversation_id, user_id, joined_at, role)
      VALUES ($1, $2, $3, $4)
    `, [conversationId, participantId, now, 'member']);
  }

  log.info({ conversationId, type, participantCount: allParticipants.length }, 'Conversation created');

  return (await getConversationWithDetails(conversationId, creatorId))!;
}

/**
 * Find existing direct conversation between two users
 */
async function findDirectConversation(userId1: string, userId2: string): Promise<Conversation | null> {
  const result = await db.queryOne<any>(`
    SELECT c.*
    FROM conversations c
    JOIN conversation_participants cp1 ON c.id = cp1.conversation_id AND cp1.user_id = $1
    JOIN conversation_participants cp2 ON c.id = cp2.conversation_id AND cp2.user_id = $2
    WHERE c.type = 'direct'
    LIMIT 1
  `, [userId1, userId2]);

  return result ? rowToConversation(result) : null;
}

/**
 * Get conversation with participants and metadata
 */
export async function getConversationWithDetails(
  conversationId: string,
  userId: string
): Promise<ConversationWithParticipants | null> {
  // Check participant access
  const participant = await db.queryOne<any>(`
    SELECT * FROM conversation_participants
    WHERE conversation_id = $1 AND user_id = $2
  `, [conversationId, userId]);

  if (!participant) {
    return null;
  }

  const conversation = await db.queryOne<any>(`
    SELECT * FROM conversations WHERE id = $1
  `, [conversationId]);

  if (!conversation) {
    return null;
  }

  const participants = await db.queryAll<any>(`
    SELECT cp.*, u.username, u.display_name, u.avatar_url
    FROM conversation_participants cp
    JOIN users u ON cp.user_id = u.id
    WHERE cp.conversation_id = $1
  `, [conversationId]);

  // Get last message
  const lastMessage = await db.queryOne<any>(`
    SELECT * FROM messages
    WHERE conversation_id = $1 AND deleted_at IS NULL
    ORDER BY created_at DESC
    LIMIT 1
  `, [conversationId]);

  // Count unread messages
  const lastReadAt = participant.last_read_at;
  let unreadCount = 0;
  if (lastReadAt) {
    const unreadResult = await db.queryOne<{ count: number }>(`
      SELECT COUNT(*) as count FROM messages
      WHERE conversation_id = $1
        AND created_at > $2
        AND sender_id != $3
        AND deleted_at IS NULL
    `, [conversationId, lastReadAt, userId]);
    unreadCount = Number(unreadResult?.count ?? 0);
  }

  return {
    ...rowToConversation(conversation),
    participants: participants.map(rowToParticipant),
    unreadCount,
    lastMessage: lastMessage ? rowToMessage(lastMessage) : undefined,
  };
}

/**
 * Get all conversations for a user
 */
export async function getUserConversations(userId: string): Promise<ConversationWithParticipants[]> {
  const conversationIds = await db.queryAll<{ conversation_id: string }>(`
    SELECT conversation_id FROM conversation_participants
    WHERE user_id = $1
  `, [userId]);

  const conversations: ConversationWithParticipants[] = [];
  for (const row of conversationIds) {
    const conv = await getConversationWithDetails(row.conversation_id, userId);
    if (conv) conversations.push(conv);
  }

  return conversations.sort((a, b) => {
    const aTime = a.lastMessageAt || a.createdAt;
    const bTime = b.lastMessageAt || b.createdAt;
    return new Date(bTime).getTime() - new Date(aTime).getTime();
  });
}

/**
 * Send a message in a conversation
 */
export async function sendMessage(
  conversationId: string,
  senderId: string,
  request: SendMessageRequest
): Promise<MessageWithSender> {
  // Verify sender is a participant
  const participant = await db.queryOne<any>(`
    SELECT * FROM conversation_participants
    WHERE conversation_id = $1 AND user_id = $2
  `, [conversationId, senderId]);

  if (!participant) {
    throw new AuthorizationError('Not a participant in this conversation');
  }

  const { content, contentType = 'text', replyToId } = request;

  if (!content && contentType === 'text') {
    throw new ValidationError('Message content is required');
  }

  // Validate reply target exists
  if (replyToId) {
    const replyTarget = await db.queryOne<any>(`
      SELECT id FROM messages WHERE id = $1 AND conversation_id = $2
    `, [replyToId, conversationId]);

    if (!replyTarget) {
      throw new ValidationError('Reply target message not found');
    }
  }

  const messageId = generateId('msg');
  const now = new Date().toISOString();

  await db.query(`
    INSERT INTO messages (id, conversation_id, sender_id, content, content_type, reply_to_id, created_at)
    VALUES ($1, $2, $3, $4, $5, $6, $7)
  `, [messageId, conversationId, senderId, content || null, contentType, replyToId || null, now]);

  // Update conversation's last_message_at
  await db.query(`
    UPDATE conversations SET last_message_at = $1, updated_at = $2 WHERE id = $3
  `, [now, now, conversationId]);

  log.info({ messageId, conversationId, senderId, contentType }, 'Message sent');

  return (await getMessageWithSender(messageId))!;
}

/**
 * Get message with sender info
 */
export async function getMessageWithSender(messageId: string): Promise<MessageWithSender | null> {
  const message = await db.queryOne<any>(`
    SELECT m.*, u.username, u.display_name, u.avatar_url
    FROM messages m
    JOIN users u ON m.sender_id = u.id
    WHERE m.id = $1
  `, [messageId]);

  if (!message) {
    return null;
  }

  // Get attachments
  const attachments = await db.queryAll<any>(`
    SELECT * FROM message_attachments WHERE message_id = $1
  `, [messageId]);

  // Get reply target if exists
  let replyTo: Message | undefined;
  if (message.reply_to_id) {
    const replyMessage = await db.queryOne<any>(`
      SELECT * FROM messages WHERE id = $1
    `, [message.reply_to_id]);
    if (replyMessage) {
      replyTo = rowToMessage(replyMessage);
    }
  }

  return {
    ...rowToMessage(message),
    sender: {
      id: message.sender_id,
      username: message.username,
      displayName: message.display_name,
      avatarUrl: message.avatar_url,
    },
    attachments: attachments.map(rowToAttachment),
    replyTo,
  };
}

/**
 * Get messages in a conversation (paginated)
 */
export async function getConversationMessages(
  conversationId: string,
  userId: string,
  options: { limit?: number; before?: string } = {}
): Promise<MessageWithSender[]> {
  // Verify user is a participant
  const participant = await db.queryOne<any>(`
    SELECT * FROM conversation_participants
    WHERE conversation_id = $1 AND user_id = $2
  `, [conversationId, userId]);

  if (!participant) {
    throw new AuthorizationError('Not a participant in this conversation');
  }

  const { limit = 50, before } = options;

  let query = `
    SELECT m.*, u.username, u.display_name, u.avatar_url
    FROM messages m
    JOIN users u ON m.sender_id = u.id
    WHERE m.conversation_id = $1 AND m.deleted_at IS NULL
  `;
  const params: any[] = [conversationId];
  let paramIndex = 2;

  if (before) {
    query += ` AND m.created_at < $${paramIndex++}`;
    params.push(before);
  }

  query += ` ORDER BY m.created_at DESC LIMIT $${paramIndex}`;
  params.push(limit);

  const messages = await db.queryAll<any>(query, params);

  const result: MessageWithSender[] = [];
  for (const message of messages) {
    const attachments = await db.queryAll<any>(`
      SELECT * FROM message_attachments WHERE message_id = $1
    `, [message.id]);

    result.push({
      ...rowToMessage(message),
      sender: {
        id: message.sender_id,
        username: message.username,
        displayName: message.display_name,
        avatarUrl: message.avatar_url,
      },
      attachments: attachments.map(rowToAttachment),
    });
  }

  return result.reverse(); // Return in chronological order
}

/**
 * Mark messages as read
 */
export async function markAsRead(conversationId: string, userId: string): Promise<void> {
  const now = new Date().toISOString();

  await db.query(`
    UPDATE conversation_participants
    SET last_read_at = $1
    WHERE conversation_id = $2 AND user_id = $3
  `, [now, conversationId, userId]);
}

/**
 * Delete a message (soft delete)
 */
export async function deleteMessage(messageId: string, userId: string): Promise<void> {
  const message = await db.queryOne<any>(`
    SELECT * FROM messages WHERE id = $1
  `, [messageId]);

  if (!message) {
    throw new NotFoundError('Message');
  }

  if (message.sender_id !== userId) {
    throw new AuthorizationError('Can only delete your own messages');
  }

  const now = new Date().toISOString();

  await db.query(`
    UPDATE messages SET deleted_at = $1 WHERE id = $2
  `, [now, messageId]);

  log.info({ messageId, userId }, 'Message deleted');
}

/**
 * Edit a message
 */
export async function editMessage(messageId: string, userId: string, newContent: string): Promise<MessageWithSender> {
  const message = await db.queryOne<any>(`
    SELECT * FROM messages WHERE id = $1
  `, [messageId]);

  if (!message) {
    throw new NotFoundError('Message');
  }

  if (message.sender_id !== userId) {
    throw new AuthorizationError('Can only edit your own messages');
  }

  if (message.deleted_at) {
    throw new ValidationError('Cannot edit a deleted message');
  }

  const now = new Date().toISOString();

  await db.query(`
    UPDATE messages SET content = $1, edited_at = $2 WHERE id = $3
  `, [newContent, now, messageId]);

  log.info({ messageId, userId }, 'Message edited');

  return (await getMessageWithSender(messageId))!;
}

/**
 * Block a user
 */
export async function blockUser(blockerId: string, blockedId: string): Promise<void> {
  await db.query(`
    INSERT INTO user_blocks (blocker_id, blocked_id, created_at)
    VALUES ($1, $2, NOW())
    ON CONFLICT DO NOTHING
  `, [blockerId, blockedId]);

  log.info({ blockerId, blockedId }, 'User blocked');
}

/**
 * Unblock a user
 */
export async function unblockUser(blockerId: string, blockedId: string): Promise<void> {
  await db.query(`
    DELETE FROM user_blocks WHERE blocker_id = $1 AND blocked_id = $2
  `, [blockerId, blockedId]);

  log.info({ blockerId, blockedId }, 'User unblocked');
}

/**
 * Check if a user is blocked
 */
export async function isBlocked(blockerId: string, blockedId: string): Promise<boolean> {
  const result = await db.queryOne<any>(`
    SELECT 1 FROM user_blocks WHERE blocker_id = $1 AND blocked_id = $2
  `, [blockerId, blockedId]);

  return !!result;
}

/**
 * Get blocked users list
 */
export async function getBlockedUsers(userId: string): Promise<string[]> {
  const rows = await db.queryAll<{ blocked_id: string }>(`
    SELECT blocked_id FROM user_blocks WHERE blocker_id = $1
  `, [userId]);

  return rows.map(r => r.blocked_id);
}

// Row to object converters
function rowToConversation(row: any): Conversation {
  return {
    id: row.id,
    type: row.type,
    name: row.name,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    lastMessageAt: row.last_message_at,
    metadata: row.metadata ? JSON.parse(row.metadata) : undefined,
  };
}

function rowToParticipant(row: any): ConversationParticipant & { username: string; displayName?: string; avatarUrl?: string } {
  return {
    conversationId: row.conversation_id,
    userId: row.user_id,
    joinedAt: row.joined_at,
    lastReadAt: row.last_read_at,
    muted: !!row.muted,
    role: row.role,
    username: row.username,
    displayName: row.display_name,
    avatarUrl: row.avatar_url,
  };
}

function rowToMessage(row: any): Message {
  return {
    id: row.id,
    conversationId: row.conversation_id,
    senderId: row.sender_id,
    content: row.content,
    contentType: row.content_type,
    replyToId: row.reply_to_id,
    editedAt: row.edited_at,
    deletedAt: row.deleted_at,
    createdAt: row.created_at,
    metadata: row.metadata ? JSON.parse(row.metadata) : undefined,
  };
}

function rowToAttachment(row: any): any {
  return {
    id: row.id,
    messageId: row.message_id,
    fileName: row.file_name,
    fileType: row.file_type,
    fileSize: row.file_size,
    storagePath: row.storage_path,
    thumbnailPath: row.thumbnail_path,
    moderationStatus: row.moderation_status,
    moderationResult: row.moderation_result,
    moderationScores: row.moderation_scores ? JSON.parse(row.moderation_scores) : undefined,
    moderatedAt: row.moderated_at,
    createdAt: row.created_at,
  };
}
