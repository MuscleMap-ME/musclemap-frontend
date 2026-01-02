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

async function tableExists(tableName: string): Promise<boolean> {
  const result = await db.queryOne<{ count: string }>(
    `SELECT COUNT(*) as count FROM information_schema.tables
     WHERE table_name = $1`,
    [tableName]
  );
  return parseInt(result?.count || '0') > 0;
}

export async function migrate(): Promise<void> {
  log.info('Running migration: 003_messaging');

  // Conversations table
  if (!(await tableExists('conversations'))) {
    log.info('Creating conversations table...');
    await db.query(`
      CREATE TABLE conversations (
        id TEXT PRIMARY KEY,
        type TEXT NOT NULL DEFAULT 'direct',
        name TEXT,
        created_by TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        last_message_at TIMESTAMP,
        metadata JSONB
      )
    `);

    await db.query(`CREATE INDEX idx_conversations_created_by ON conversations(created_by)`);
    await db.query(`CREATE INDEX idx_conversations_last_message ON conversations(last_message_at)`);
    log.info('conversations table created');
  }

  // Conversation participants
  if (!(await tableExists('conversation_participants'))) {
    log.info('Creating conversation_participants table...');
    await db.query(`
      CREATE TABLE conversation_participants (
        conversation_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        joined_at TIMESTAMP DEFAULT NOW(),
        last_read_at TIMESTAMP,
        muted BOOLEAN DEFAULT FALSE,
        role TEXT DEFAULT 'member',
        PRIMARY KEY (conversation_id, user_id)
      )
    `);

    await db.query(`CREATE INDEX idx_participants_user ON conversation_participants(user_id)`);
    await db.query(`CREATE INDEX idx_participants_conversation ON conversation_participants(conversation_id)`);
    log.info('conversation_participants table created');
  }

  // Messages table
  if (!(await tableExists('messages'))) {
    log.info('Creating messages table...');
    await db.query(`
      CREATE TABLE messages (
        id TEXT PRIMARY KEY,
        conversation_id TEXT NOT NULL,
        sender_id TEXT NOT NULL,
        content TEXT,
        content_type TEXT DEFAULT 'text',
        reply_to_id TEXT,
        edited_at TIMESTAMP,
        deleted_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW(),
        metadata JSONB
      )
    `);

    await db.query(`CREATE INDEX idx_messages_conversation ON messages(conversation_id, created_at)`);
    await db.query(`CREATE INDEX idx_messages_sender ON messages(sender_id)`);
    await db.query(`CREATE INDEX idx_messages_reply ON messages(reply_to_id)`);
    log.info('messages table created');
  }

  // Message attachments with moderation
  if (!(await tableExists('message_attachments'))) {
    log.info('Creating message_attachments table...');
    await db.query(`
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
        moderation_scores JSONB,
        moderated_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await db.query(`CREATE INDEX idx_attachments_message ON message_attachments(message_id)`);
    await db.query(`CREATE INDEX idx_attachments_moderation ON message_attachments(moderation_status)`);
    log.info('message_attachments table created');
  }

  // User blocks table
  if (!(await tableExists('user_blocks'))) {
    log.info('Creating user_blocks table...');
    await db.query(`
      CREATE TABLE user_blocks (
        blocker_id TEXT NOT NULL,
        blocked_id TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT NOW(),
        PRIMARY KEY (blocker_id, blocked_id)
      )
    `);

    await db.query(`CREATE INDEX idx_blocks_blocker ON user_blocks(blocker_id)`);
    await db.query(`CREATE INDEX idx_blocks_blocked ON user_blocks(blocked_id)`);
    log.info('user_blocks table created');
  }

  log.info('Migration 003_messaging complete');
}
