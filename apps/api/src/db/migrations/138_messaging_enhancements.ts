/**
 * Migration: Messaging System Enhancements
 *
 * Adds comprehensive messaging features:
 * - Message receipts (delivery + read)
 * - Message reactions
 * - Message editing history
 * - Full-text search
 * - Voice messages support
 * - Link previews
 * - Stickers/GIFs
 * - Scheduled messages
 * - Disappearing messages
 * - Push notifications
 * - Notification preferences
 * - Message reporting
 * - Channels for crews
 * - Message analytics
 */

import { db } from '../client';
import { loggers } from '../../lib/logger';

const log = loggers.db;

async function tableExists(tableName: string): Promise<boolean> {
  const result = await db.queryOne<{ count: string }>(
    `SELECT COUNT(*) as count FROM information_schema.tables
     WHERE table_name = $1 AND table_schema = 'public'`,
    [tableName]
  );
  return parseInt(result?.count || '0') > 0;
}

async function columnExists(tableName: string, columnName: string): Promise<boolean> {
  const result = await db.queryOne<{ count: string }>(
    `SELECT COUNT(*) as count FROM information_schema.columns
     WHERE table_name = $1 AND column_name = $2 AND table_schema = 'public'`,
    [tableName, columnName]
  );
  return parseInt(result?.count || '0') > 0;
}

async function indexExists(indexName: string): Promise<boolean> {
  const result = await db.queryOne<{ count: string }>(
    `SELECT COUNT(*) as count FROM pg_indexes WHERE indexname = $1`,
    [indexName]
  );
  return parseInt(result?.count || '0') > 0;
}

export async function migrate(): Promise<void> {
  log.info('Running migration: 138_messaging_enhancements');

  // ============================================
  // PHASE 1: CORE ENHANCEMENTS
  // ============================================

  // 1. Message Receipts - Track delivery and read status per user
  if (!(await tableExists('message_receipts'))) {
    log.info('Creating message_receipts table...');
    await db.query(`
      CREATE TABLE message_receipts (
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
        message_id TEXT NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        delivered_at TIMESTAMP WITH TIME ZONE,
        read_at TIMESTAMP WITH TIME ZONE,
        UNIQUE(message_id, user_id)
      )
    `);
    await db.query(`CREATE INDEX idx_msg_receipts_message ON message_receipts(message_id)`);
    await db.query(`CREATE INDEX idx_msg_receipts_user ON message_receipts(user_id)`);
    await db.query(`CREATE INDEX idx_msg_receipts_unread ON message_receipts(user_id, message_id) WHERE read_at IS NULL`);
    log.info('message_receipts table created');
  }

  // 2. Push Subscriptions - Web Push and mobile notifications
  if (!(await tableExists('push_subscriptions'))) {
    log.info('Creating push_subscriptions table...');
    await db.query(`
      CREATE TABLE push_subscriptions (
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        endpoint TEXT NOT NULL,
        keys_p256dh TEXT NOT NULL,
        keys_auth TEXT NOT NULL,
        device_type TEXT DEFAULT 'web',
        device_name TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        last_used_at TIMESTAMP WITH TIME ZONE,
        UNIQUE(user_id, endpoint)
      )
    `);
    await db.query(`CREATE INDEX idx_push_subs_user ON push_subscriptions(user_id)`);
    log.info('push_subscriptions table created');
  }

  // 3. Notification Preferences
  if (!(await tableExists('notification_preferences'))) {
    log.info('Creating notification_preferences table...');
    await db.query(`
      CREATE TABLE notification_preferences (
        user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
        messaging_enabled BOOLEAN DEFAULT true,
        messaging_sound BOOLEAN DEFAULT true,
        messaging_preview BOOLEAN DEFAULT true,
        messaging_vibrate BOOLEAN DEFAULT true,
        quiet_hours_enabled BOOLEAN DEFAULT false,
        quiet_hours_start TIME,
        quiet_hours_end TIME,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);
    log.info('notification_preferences table created');
  }

  // 4. Add columns to messages table for editing
  if (!(await columnExists('messages', 'original_content'))) {
    log.info('Adding editing columns to messages...');
    await db.query(`ALTER TABLE messages ADD COLUMN original_content TEXT`);
    await db.query(`ALTER TABLE messages ADD COLUMN edit_count INTEGER DEFAULT 0`);
    log.info('Added editing columns to messages');
  }

  // 5. Add full-text search to messages
  if (!(await columnExists('messages', 'search_vector'))) {
    log.info('Adding full-text search to messages...');
    await db.query(`ALTER TABLE messages ADD COLUMN search_vector tsvector`);

    // Create GIN index for fast search
    if (!(await indexExists('idx_messages_search'))) {
      await db.query(`CREATE INDEX idx_messages_search ON messages USING GIN(search_vector)`);
    }

    // Create trigger to auto-update search vector
    await db.query(`
      CREATE OR REPLACE FUNCTION messages_search_update() RETURNS trigger AS $$
      BEGIN
        NEW.search_vector := to_tsvector('english', COALESCE(NEW.content, ''));
        RETURN NEW;
      END
      $$ LANGUAGE plpgsql
    `);

    await db.query(`
      DROP TRIGGER IF EXISTS messages_search_trigger ON messages
    `);
    await db.query(`
      CREATE TRIGGER messages_search_trigger
        BEFORE INSERT OR UPDATE OF content ON messages
        FOR EACH ROW EXECUTE FUNCTION messages_search_update()
    `);

    // Backfill existing messages
    await db.query(`
      UPDATE messages SET search_vector = to_tsvector('english', COALESCE(content, ''))
      WHERE search_vector IS NULL
    `);
    log.info('Added full-text search to messages');
  }

  // 6. Add pinning support to messages
  if (!(await columnExists('messages', 'pinned_at'))) {
    log.info('Adding pinning columns to messages...');
    await db.query(`ALTER TABLE messages ADD COLUMN pinned_at TIMESTAMP WITH TIME ZONE`);
    await db.query(`ALTER TABLE messages ADD COLUMN pinned_by TEXT REFERENCES users(id)`);

    if (!(await indexExists('idx_messages_pinned'))) {
      await db.query(`
        CREATE INDEX idx_messages_pinned ON messages(conversation_id, pinned_at)
        WHERE pinned_at IS NOT NULL
      `);
    }
    log.info('Added pinning columns to messages');
  }

  // 7. Add disappearing messages support to conversations
  if (!(await columnExists('conversations', 'disappearing_ttl'))) {
    log.info('Adding disappearing messages to conversations...');
    await db.query(`ALTER TABLE conversations ADD COLUMN disappearing_ttl INTEGER`);
    log.info('Added disappearing_ttl to conversations');
  }

  // 8. Add expires_at to messages for disappearing messages
  if (!(await columnExists('messages', 'expires_at'))) {
    log.info('Adding expires_at to messages...');
    await db.query(`ALTER TABLE messages ADD COLUMN expires_at TIMESTAMP WITH TIME ZONE`);

    if (!(await indexExists('idx_messages_expires'))) {
      await db.query(`
        CREATE INDEX idx_messages_expires ON messages(expires_at)
        WHERE expires_at IS NOT NULL
      `);
    }
    log.info('Added expires_at to messages');
  }

  // 9. Add archived and starred to conversations
  if (!(await columnExists('conversations', 'archived_at'))) {
    log.info('Adding archived/starred to conversations...');
    await db.query(`ALTER TABLE conversations ADD COLUMN archived_at TIMESTAMP WITH TIME ZONE`);
  }
  if (!(await columnExists('conversation_participants', 'starred'))) {
    await db.query(`ALTER TABLE conversation_participants ADD COLUMN starred BOOLEAN DEFAULT false`);
    log.info('Added archived/starred to conversations');
  }

  // 10. Add presence visibility to users
  if (!(await columnExists('users', 'presence_visible'))) {
    log.info('Adding presence columns to users...');
    await db.query(`ALTER TABLE users ADD COLUMN presence_visible BOOLEAN DEFAULT true`);
  }
  if (!(await columnExists('users', 'last_active_at'))) {
    await db.query(`ALTER TABLE users ADD COLUMN last_active_at TIMESTAMP WITH TIME ZONE`);
    log.info('Added presence columns to users');
  }

  // ============================================
  // PHASE 2: RICH MESSAGING
  // ============================================

  // 11. Message Reactions
  if (!(await tableExists('message_reactions'))) {
    log.info('Creating message_reactions table...');
    await db.query(`
      CREATE TABLE message_reactions (
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
        message_id TEXT NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        emoji TEXT NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        UNIQUE(message_id, user_id, emoji)
      )
    `);
    await db.query(`CREATE INDEX idx_reactions_message ON message_reactions(message_id)`);
    await db.query(`CREATE INDEX idx_reactions_user ON message_reactions(user_id)`);
    await db.query(`CREATE INDEX idx_reactions_emoji ON message_reactions(message_id, emoji)`);
    log.info('message_reactions table created');
  }

  // 12. Link Previews Cache
  if (!(await tableExists('link_previews'))) {
    log.info('Creating link_previews table...');
    await db.query(`
      CREATE TABLE link_previews (
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
        url TEXT NOT NULL UNIQUE,
        title TEXT,
        description TEXT,
        image_url TEXT,
        site_name TEXT,
        favicon_url TEXT,
        fetched_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        expires_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() + INTERVAL '7 days'
      )
    `);
    await db.query(`CREATE INDEX idx_link_previews_url ON link_previews(url)`);
    await db.query(`CREATE INDEX idx_link_previews_expires ON link_previews(expires_at)`);
    log.info('link_previews table created');
  }

  // 13. Voice message support - extend attachments
  if (!(await columnExists('message_attachments', 'duration_seconds'))) {
    log.info('Adding voice message columns to attachments...');
    await db.query(`ALTER TABLE message_attachments ADD COLUMN duration_seconds INTEGER`);
    await db.query(`ALTER TABLE message_attachments ADD COLUMN waveform JSONB`);
    await db.query(`ALTER TABLE message_attachments ADD COLUMN transcription TEXT`);
    log.info('Added voice message columns to attachments');
  }

  // 14. Sticker Packs
  if (!(await tableExists('sticker_packs'))) {
    log.info('Creating sticker tables...');
    await db.query(`
      CREATE TABLE sticker_packs (
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
        name TEXT NOT NULL,
        description TEXT,
        creator_id TEXT REFERENCES users(id),
        cover_image_url TEXT,
        is_official BOOLEAN DEFAULT false,
        is_public BOOLEAN DEFAULT false,
        is_animated BOOLEAN DEFAULT false,
        price_credits INTEGER DEFAULT 0,
        download_count INTEGER DEFAULT 0,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);

    await db.query(`
      CREATE TABLE stickers (
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
        pack_id TEXT NOT NULL REFERENCES sticker_packs(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        image_url TEXT NOT NULL,
        emoji_shortcode TEXT,
        width INTEGER,
        height INTEGER,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);

    await db.query(`
      CREATE TABLE user_sticker_packs (
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        pack_id TEXT NOT NULL REFERENCES sticker_packs(id) ON DELETE CASCADE,
        added_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        PRIMARY KEY(user_id, pack_id)
      )
    `);

    await db.query(`CREATE INDEX idx_stickers_pack ON stickers(pack_id)`);
    await db.query(`CREATE INDEX idx_stickers_emoji ON stickers(emoji_shortcode) WHERE emoji_shortcode IS NOT NULL`);
    await db.query(`CREATE INDEX idx_user_sticker_packs_user ON user_sticker_packs(user_id)`);
    log.info('Sticker tables created');
  }

  // 15. Message forwarding metadata
  if (!(await columnExists('messages', 'forwarded_from_id'))) {
    log.info('Adding forwarding columns to messages...');
    await db.query(`ALTER TABLE messages ADD COLUMN forwarded_from_id TEXT REFERENCES messages(id)`);
    await db.query(`ALTER TABLE messages ADD COLUMN forwarded_from_conversation_id TEXT`);
    log.info('Added forwarding columns to messages');
  }

  // ============================================
  // PHASE 3: SOCIAL FEATURES
  // ============================================

  // 16. Shared content in messages (workouts, achievements, etc.)
  if (!(await tableExists('message_shared_content'))) {
    log.info('Creating message_shared_content table...');
    await db.query(`
      CREATE TABLE message_shared_content (
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
        message_id TEXT NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
        content_type TEXT NOT NULL,
        content_id TEXT NOT NULL,
        preview_data JSONB,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);
    await db.query(`CREATE INDEX idx_shared_content_message ON message_shared_content(message_id)`);
    await db.query(`CREATE INDEX idx_shared_content_type ON message_shared_content(content_type, content_id)`);
    log.info('message_shared_content table created');
  }

  // ============================================
  // PHASE 4: ADVANCED FEATURES
  // ============================================

  // 17. Scheduled Messages
  if (!(await tableExists('scheduled_messages'))) {
    log.info('Creating scheduled_messages table...');
    await db.query(`
      CREATE TABLE scheduled_messages (
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
        conversation_id TEXT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
        sender_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        content TEXT NOT NULL,
        content_type TEXT DEFAULT 'text',
        scheduled_for TIMESTAMP WITH TIME ZONE NOT NULL,
        timezone TEXT DEFAULT 'UTC',
        status TEXT DEFAULT 'pending',
        sent_message_id TEXT REFERENCES messages(id),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);
    await db.query(`
      CREATE INDEX idx_scheduled_pending ON scheduled_messages(scheduled_for, status)
      WHERE status = 'pending'
    `);
    await db.query(`CREATE INDEX idx_scheduled_user ON scheduled_messages(sender_id)`);
    log.info('scheduled_messages table created');
  }

  // 18. Message Templates
  if (!(await tableExists('message_templates'))) {
    log.info('Creating message_templates table...');
    await db.query(`
      CREATE TABLE message_templates (
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        content TEXT NOT NULL,
        shortcut TEXT,
        category TEXT,
        use_count INTEGER DEFAULT 0,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);
    await db.query(`CREATE INDEX idx_templates_user ON message_templates(user_id)`);
    await db.query(`CREATE UNIQUE INDEX idx_templates_shortcut ON message_templates(user_id, shortcut) WHERE shortcut IS NOT NULL`);
    log.info('message_templates table created');
  }

  // 19. Message Translation Cache
  if (!(await tableExists('message_translations'))) {
    log.info('Creating message_translations table...');
    await db.query(`
      CREATE TABLE message_translations (
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
        message_id TEXT NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
        source_language TEXT NOT NULL,
        target_language TEXT NOT NULL,
        translated_content TEXT NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        UNIQUE(message_id, target_language)
      )
    `);
    await db.query(`CREATE INDEX idx_translations_message ON message_translations(message_id)`);
    log.info('message_translations table created');
  }

  // ============================================
  // PHASE 5: ENTERPRISE FEATURES
  // ============================================

  // 20. Channels for Crews
  if (!(await tableExists('channels'))) {
    log.info('Creating channels table...');
    await db.query(`
      CREATE TABLE channels (
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
        crew_id TEXT,
        name TEXT NOT NULL,
        description TEXT,
        topic TEXT,
        is_private BOOLEAN DEFAULT false,
        is_announcement BOOLEAN DEFAULT false,
        is_default BOOLEAN DEFAULT false,
        created_by TEXT REFERENCES users(id),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);

    await db.query(`
      CREATE TABLE channel_members (
        channel_id TEXT NOT NULL REFERENCES channels(id) ON DELETE CASCADE,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        role TEXT DEFAULT 'member',
        notifications TEXT DEFAULT 'all',
        last_read_at TIMESTAMP WITH TIME ZONE,
        joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        PRIMARY KEY(channel_id, user_id)
      )
    `);

    await db.query(`
      CREATE TABLE channel_messages (
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
        channel_id TEXT NOT NULL REFERENCES channels(id) ON DELETE CASCADE,
        sender_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        content TEXT,
        content_type TEXT DEFAULT 'text',
        thread_id TEXT,
        reply_count INTEGER DEFAULT 0,
        edited_at TIMESTAMP WITH TIME ZONE,
        deleted_at TIMESTAMP WITH TIME ZONE,
        pinned_at TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        metadata JSONB
      )
    `);

    await db.query(`CREATE INDEX idx_channels_crew ON channels(crew_id) WHERE crew_id IS NOT NULL`);
    await db.query(`CREATE INDEX idx_channel_members_user ON channel_members(user_id)`);
    await db.query(`CREATE INDEX idx_channel_messages_channel ON channel_messages(channel_id, created_at DESC)`);
    await db.query(`CREATE INDEX idx_channel_messages_thread ON channel_messages(thread_id) WHERE thread_id IS NOT NULL`);
    log.info('Channel tables created');
  }

  // 21. Message Reports
  if (!(await tableExists('message_reports'))) {
    log.info('Creating message_reports table...');
    await db.query(`
      CREATE TABLE message_reports (
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
        message_id TEXT NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
        reporter_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        reason TEXT NOT NULL,
        details TEXT,
        status TEXT DEFAULT 'pending',
        reviewed_by TEXT REFERENCES users(id),
        reviewed_at TIMESTAMP WITH TIME ZONE,
        action_taken TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);
    await db.query(`CREATE INDEX idx_reports_message ON message_reports(message_id)`);
    await db.query(`CREATE INDEX idx_reports_status ON message_reports(status) WHERE status = 'pending'`);
    log.info('message_reports table created');
  }

  // 22. Message Analytics
  if (!(await tableExists('message_analytics'))) {
    log.info('Creating message_analytics table...');
    await db.query(`
      CREATE TABLE message_analytics (
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        date DATE NOT NULL,
        messages_sent INTEGER DEFAULT 0,
        messages_received INTEGER DEFAULT 0,
        conversations_started INTEGER DEFAULT 0,
        avg_response_time_seconds INTEGER,
        most_active_hour INTEGER,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        UNIQUE(user_id, date)
      )
    `);
    await db.query(`CREATE INDEX idx_analytics_user_date ON message_analytics(user_id, date DESC)`);
    log.info('message_analytics table created');
  }

  // 23. Encryption keys for E2EE (optional)
  if (!(await tableExists('user_encryption_keys'))) {
    log.info('Creating user_encryption_keys table...');
    await db.query(`
      CREATE TABLE user_encryption_keys (
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        device_id TEXT NOT NULL,
        identity_key TEXT NOT NULL,
        signed_prekey TEXT NOT NULL,
        signed_prekey_signature TEXT NOT NULL,
        prekey_bundle JSONB,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        UNIQUE(user_id, device_id)
      )
    `);
    await db.query(`CREATE INDEX idx_encryption_keys_user ON user_encryption_keys(user_id)`);
    log.info('user_encryption_keys table created');
  }

  // 24. Rate limiting table for messages
  if (!(await tableExists('message_rate_limits'))) {
    log.info('Creating message_rate_limits table...');
    await db.query(`
      CREATE TABLE message_rate_limits (
        user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
        messages_sent_today INTEGER DEFAULT 0,
        conversations_created_today INTEGER DEFAULT 0,
        last_message_at TIMESTAMP WITH TIME ZONE,
        last_reset_at DATE DEFAULT CURRENT_DATE
      )
    `);
    log.info('message_rate_limits table created');
  }

  // 25. Add thread support for message replies
  if (!(await columnExists('messages', 'thread_root_id'))) {
    log.info('Adding thread support to messages...');
    await db.query(`ALTER TABLE messages ADD COLUMN thread_root_id TEXT REFERENCES messages(id)`);
    await db.query(`ALTER TABLE messages ADD COLUMN reply_count INTEGER DEFAULT 0`);

    if (!(await indexExists('idx_messages_thread'))) {
      await db.query(`CREATE INDEX idx_messages_thread ON messages(thread_root_id) WHERE thread_root_id IS NOT NULL`);
    }
    log.info('Added thread support to messages');
  }

  // 26. Add keyset pagination index for messages
  if (!(await indexExists('idx_messages_keyset'))) {
    log.info('Adding keyset pagination index to messages...');
    await db.query(`
      CREATE INDEX idx_messages_keyset ON messages(conversation_id, created_at DESC, id DESC)
    `);
    log.info('Added keyset pagination index');
  }

  // 27. Add typing indicator metadata (stored in Redis, but reference table for cleanup)
  if (!(await tableExists('typing_indicators'))) {
    log.info('Creating typing_indicators reference table...');
    await db.query(`
      CREATE TABLE typing_indicators (
        conversation_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        PRIMARY KEY(conversation_id, user_id)
      )
    `);
    log.info('typing_indicators table created');
  }

  log.info('Migration 138_messaging_enhancements complete');
}
