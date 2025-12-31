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
export function createConversation(
  creatorId: string,
  request: CreateConversationRequest
): ConversationWithParticipants {
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
    const existing = findDirectConversation(creatorId, participantIds[0]);
    if (existing) {
      return getConversationWithDetails(existing.id, creatorId)!;
    }
  }

  // Check for blocked users
  const allParticipants = [creatorId, ...participantIds];
  for (const participantId of participantIds) {
    if (isBlocked(creatorId, participantId) || isBlocked(participantId, creatorId)) {
      throw new ValidationError('Cannot create conversation with blocked user');
    }
  }

  const conversationId = generateId('conv');
  const now = new Date().toISOString();

  db.prepare(`
    INSERT INTO conversations (id, type, name, created_by, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(conversationId, type, name || null, creatorId, now, now);

  // Add all participants
  const insertParticipant = db.prepare(`
    INSERT INTO conversation_participants (conversation_id, user_id, joined_at, role)
    VALUES (?, ?, ?, ?)
  `);

  // Creator is owner
  insertParticipant.run(conversationId, creatorId, now, 'owner');

  // Other participants are members
  for (const participantId of participantIds) {
    insertParticipant.run(conversationId, participantId, now, 'member');
  }

  log.info({ conversationId, type, participantCount: allParticipants.length }, 'Conversation created');

  return getConversationWithDetails(conversationId, creatorId)!;
}

/**
 * Find existing direct conversation between two users
 */
function findDirectConversation(userId1: string, userId2: string): Conversation | null {
  const result = db.prepare(`
    SELECT c.*
    FROM conversations c
    JOIN conversation_participants cp1 ON c.id = cp1.conversation_id AND cp1.user_id = ?
    JOIN conversation_participants cp2 ON c.id = cp2.conversation_id AND cp2.user_id = ?
    WHERE c.type = 'direct'
    LIMIT 1
  `).get(userId1, userId2) as any;

  return result ? rowToConversation(result) : null;
}

/**
 * Get conversation with participants and metadata
 */
export function getConversationWithDetails(
  conversationId: string,
  userId: string
): ConversationWithParticipants | null {
  // Check participant access
  const participant = db.prepare(`
    SELECT * FROM conversation_participants
    WHERE conversation_id = ? AND user_id = ?
  `).get(conversationId, userId);

  if (!participant) {
    return null;
  }

  const conversation = db.prepare(`
    SELECT * FROM conversations WHERE id = ?
  `).get(conversationId) as any;

  if (!conversation) {
    return null;
  }

  const participants = db.prepare(`
    SELECT cp.*, u.username, u.display_name, u.avatar_url
    FROM conversation_participants cp
    JOIN users u ON cp.user_id = u.id
    WHERE cp.conversation_id = ?
  `).all(conversationId) as any[];

  // Get last message
  const lastMessage = db.prepare(`
    SELECT * FROM messages
    WHERE conversation_id = ? AND deleted_at IS NULL
    ORDER BY created_at DESC
    LIMIT 1
  `).get(conversationId) as any;

  // Count unread messages
  const lastReadAt = (participant as any).last_read_at;
  let unreadCount = 0;
  if (lastReadAt) {
    unreadCount = (db.prepare(`
      SELECT COUNT(*) as count FROM messages
      WHERE conversation_id = ?
        AND created_at > ?
        AND sender_id != ?
        AND deleted_at IS NULL
    `).get(conversationId, lastReadAt, userId) as any).count;
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
export function getUserConversations(userId: string): ConversationWithParticipants[] {
  const conversationIds = db.prepare(`
    SELECT conversation_id FROM conversation_participants
    WHERE user_id = ?
  `).all(userId) as { conversation_id: string }[];

  return conversationIds
    .map(row => getConversationWithDetails(row.conversation_id, userId))
    .filter((c): c is ConversationWithParticipants => c !== null)
    .sort((a, b) => {
      const aTime = a.lastMessageAt || a.createdAt;
      const bTime = b.lastMessageAt || b.createdAt;
      return new Date(bTime).getTime() - new Date(aTime).getTime();
    });
}

/**
 * Send a message in a conversation
 */
export function sendMessage(
  conversationId: string,
  senderId: string,
  request: SendMessageRequest
): MessageWithSender {
  // Verify sender is a participant
  const participant = db.prepare(`
    SELECT * FROM conversation_participants
    WHERE conversation_id = ? AND user_id = ?
  `).get(conversationId, senderId);

  if (!participant) {
    throw new AuthorizationError('Not a participant in this conversation');
  }

  const { content, contentType = 'text', replyToId } = request;

  if (!content && contentType === 'text') {
    throw new ValidationError('Message content is required');
  }

  // Validate reply target exists
  if (replyToId) {
    const replyTarget = db.prepare(`
      SELECT id FROM messages WHERE id = ? AND conversation_id = ?
    `).get(replyToId, conversationId);

    if (!replyTarget) {
      throw new ValidationError('Reply target message not found');
    }
  }

  const messageId = generateId('msg');
  const now = new Date().toISOString();

  db.prepare(`
    INSERT INTO messages (id, conversation_id, sender_id, content, content_type, reply_to_id, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(messageId, conversationId, senderId, content || null, contentType, replyToId || null, now);

  // Update conversation's last_message_at
  db.prepare(`
    UPDATE conversations SET last_message_at = ?, updated_at = ? WHERE id = ?
  `).run(now, now, conversationId);

  log.info({ messageId, conversationId, senderId, contentType }, 'Message sent');

  return getMessageWithSender(messageId)!;
}

/**
 * Get message with sender info
 */
export function getMessageWithSender(messageId: string): MessageWithSender | null {
  const message = db.prepare(`
    SELECT m.*, u.username, u.display_name, u.avatar_url
    FROM messages m
    JOIN users u ON m.sender_id = u.id
    WHERE m.id = ?
  `).get(messageId) as any;

  if (!message) {
    return null;
  }

  // Get attachments
  const attachments = db.prepare(`
    SELECT * FROM message_attachments WHERE message_id = ?
  `).all(messageId) as any[];

  // Get reply target if exists
  let replyTo: Message | undefined;
  if (message.reply_to_id) {
    const replyMessage = db.prepare(`
      SELECT * FROM messages WHERE id = ?
    `).get(message.reply_to_id) as any;
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
export function getConversationMessages(
  conversationId: string,
  userId: string,
  options: { limit?: number; before?: string } = {}
): MessageWithSender[] {
  // Verify user is a participant
  const participant = db.prepare(`
    SELECT * FROM conversation_participants
    WHERE conversation_id = ? AND user_id = ?
  `).get(conversationId, userId);

  if (!participant) {
    throw new AuthorizationError('Not a participant in this conversation');
  }

  const { limit = 50, before } = options;

  let query = `
    SELECT m.*, u.username, u.display_name, u.avatar_url
    FROM messages m
    JOIN users u ON m.sender_id = u.id
    WHERE m.conversation_id = ? AND m.deleted_at IS NULL
  `;
  const params: any[] = [conversationId];

  if (before) {
    query += ` AND m.created_at < ?`;
    params.push(before);
  }

  query += ` ORDER BY m.created_at DESC LIMIT ?`;
  params.push(limit);

  const messages = db.prepare(query).all(...params) as any[];

  return messages.map(message => {
    const attachments = db.prepare(`
      SELECT * FROM message_attachments WHERE message_id = ?
    `).all(message.id) as any[];

    return {
      ...rowToMessage(message),
      sender: {
        id: message.sender_id,
        username: message.username,
        displayName: message.display_name,
        avatarUrl: message.avatar_url,
      },
      attachments: attachments.map(rowToAttachment),
    };
  }).reverse(); // Return in chronological order
}

/**
 * Mark messages as read
 */
export function markAsRead(conversationId: string, userId: string): void {
  const now = new Date().toISOString();

  db.prepare(`
    UPDATE conversation_participants
    SET last_read_at = ?
    WHERE conversation_id = ? AND user_id = ?
  `).run(now, conversationId, userId);
}

/**
 * Delete a message (soft delete)
 */
export function deleteMessage(messageId: string, userId: string): void {
  const message = db.prepare(`
    SELECT * FROM messages WHERE id = ?
  `).get(messageId) as any;

  if (!message) {
    throw new NotFoundError('Message');
  }

  if (message.sender_id !== userId) {
    throw new AuthorizationError('Can only delete your own messages');
  }

  const now = new Date().toISOString();

  db.prepare(`
    UPDATE messages SET deleted_at = ? WHERE id = ?
  `).run(now, messageId);

  log.info({ messageId, userId }, 'Message deleted');
}

/**
 * Edit a message
 */
export function editMessage(messageId: string, userId: string, newContent: string): MessageWithSender {
  const message = db.prepare(`
    SELECT * FROM messages WHERE id = ?
  `).get(messageId) as any;

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

  db.prepare(`
    UPDATE messages SET content = ?, edited_at = ? WHERE id = ?
  `).run(newContent, now, messageId);

  log.info({ messageId, userId }, 'Message edited');

  return getMessageWithSender(messageId)!;
}

/**
 * Block a user
 */
export function blockUser(blockerId: string, blockedId: string): void {
  db.prepare(`
    INSERT OR IGNORE INTO user_blocks (blocker_id, blocked_id, created_at)
    VALUES (?, ?, datetime('now'))
  `).run(blockerId, blockedId);

  log.info({ blockerId, blockedId }, 'User blocked');
}

/**
 * Unblock a user
 */
export function unblockUser(blockerId: string, blockedId: string): void {
  db.prepare(`
    DELETE FROM user_blocks WHERE blocker_id = ? AND blocked_id = ?
  `).run(blockerId, blockedId);

  log.info({ blockerId, blockedId }, 'User unblocked');
}

/**
 * Check if a user is blocked
 */
export function isBlocked(blockerId: string, blockedId: string): boolean {
  const result = db.prepare(`
    SELECT 1 FROM user_blocks WHERE blocker_id = ? AND blocked_id = ?
  `).get(blockerId, blockedId);

  return !!result;
}

/**
 * Get blocked users list
 */
export function getBlockedUsers(userId: string): string[] {
  const rows = db.prepare(`
    SELECT blocked_id FROM user_blocks WHERE blocker_id = ?
  `).all(userId) as { blocked_id: string }[];

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
