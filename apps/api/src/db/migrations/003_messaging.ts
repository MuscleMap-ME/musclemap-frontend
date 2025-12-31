/**
 * Migration: Messaging System
 *
 * Creates tables for:
 * 1. conversations - Chat threads (1:1 or group)
 * 2. conversation_participants - Users in each conversation
 * 3. messages - Individual messages with optional attachments
 * 4. message_attachments - File attachments with moderation status
 */

import { db } from '../client';
import { loggers } from '../../lib/logger';

const log = loggers.db;

export function migrate(): void {
  log.info('Running migration: 003_messaging');

  // Conversations table
  const hasConversations = db.prepare(
    "SELECT name FROM sqlite_master WHERE type='table' AND name='conversations'"
  ).get();

  if (!hasConversations) {
    log.info('Creating conversations table...');
    db.exec(`
      CREATE TABLE conversations (
        id TEXT PRIMARY KEY,
        type TEXT NOT NULL DEFAULT 'direct',
        name TEXT,
        created_by TEXT NOT NULL,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now')),
        last_message_at TEXT,
        metadata TEXT
      );

      CREATE INDEX idx_conversations_created_by ON conversations(created_by);
      CREATE INDEX idx_conversations_last_message ON conversations(last_message_at);
    `);
    log.info('conversations table created');
  }

  // Conversation participants
  const hasParticipants = db.prepare(
    "SELECT name FROM sqlite_master WHERE type='table' AND name='conversation_participants'"
  ).get();

  if (!hasParticipants) {
    log.info('Creating conversation_participants table...');
    db.exec(`
      CREATE TABLE conversation_participants (
        conversation_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        joined_at TEXT DEFAULT (datetime('now')),
        last_read_at TEXT,
        muted INTEGER DEFAULT 0,
        role TEXT DEFAULT 'member',
        PRIMARY KEY (conversation_id, user_id)
      );

      CREATE INDEX idx_participants_user ON conversation_participants(user_id);
      CREATE INDEX idx_participants_conversation ON conversation_participants(conversation_id);
    `);
    log.info('conversation_participants table created');
  }

  // Messages table
  const hasMessages = db.prepare(
    "SELECT name FROM sqlite_master WHERE type='table' AND name='messages'"
  ).get();

  if (!hasMessages) {
    log.info('Creating messages table...');
    db.exec(`
      CREATE TABLE messages (
        id TEXT PRIMARY KEY,
        conversation_id TEXT NOT NULL,
        sender_id TEXT NOT NULL,
        content TEXT,
        content_type TEXT DEFAULT 'text',
        reply_to_id TEXT,
        edited_at TEXT,
        deleted_at TEXT,
        created_at TEXT DEFAULT (datetime('now')),
        metadata TEXT
      );

      CREATE INDEX idx_messages_conversation ON messages(conversation_id, created_at);
      CREATE INDEX idx_messages_sender ON messages(sender_id);
      CREATE INDEX idx_messages_reply ON messages(reply_to_id);
    `);
    log.info('messages table created');
  }

  // Message attachments with moderation
  const hasAttachments = db.prepare(
    "SELECT name FROM sqlite_master WHERE type='table' AND name='message_attachments'"
  ).get();

  if (!hasAttachments) {
    log.info('Creating message_attachments table...');
    db.exec(`
      CREATE TABLE message_attachments (
        id TEXT PRIMARY KEY,
        message_id TEXT NOT NULL,
        file_name TEXT NOT NULL,
        file_type TEXT NOT NULL,
        file_size INTEGER NOT NULL,
        storage_path TEXT NOT NULL,
        thumbnail_path TEXT,
        moderation_status TEXT DEFAULT 'pending',
        moderation_result TEXT,
        moderation_scores TEXT,
        moderated_at TEXT,
        created_at TEXT DEFAULT (datetime('now'))
      );

      CREATE INDEX idx_attachments_message ON message_attachments(message_id);
      CREATE INDEX idx_attachments_moderation ON message_attachments(moderation_status);
    `);
    log.info('message_attachments table created');
  }

  // User blocks table
  const hasBlocks = db.prepare(
    "SELECT name FROM sqlite_master WHERE type='table' AND name='user_blocks'"
  ).get();

  if (!hasBlocks) {
    log.info('Creating user_blocks table...');
    db.exec(`
      CREATE TABLE user_blocks (
        blocker_id TEXT NOT NULL,
        blocked_id TEXT NOT NULL,
        created_at TEXT DEFAULT (datetime('now')),
        PRIMARY KEY (blocker_id, blocked_id)
      );

      CREATE INDEX idx_blocks_blocker ON user_blocks(blocker_id);
      CREATE INDEX idx_blocks_blocked ON user_blocks(blocked_id);
    `);
    log.info('user_blocks table created');
  }

  log.info('Migration 003_messaging complete');
}
