// DESTRUCTIVE: Schema modification for notifications system - contains DROP/TRUNCATE operations
/**
 * Migration: Notifications System
 *
 * Adds a centralized notifications table for all in-app notifications:
 * - Achievement verification requests
 * - Achievement verification results
 * - Social interactions (high fives, follows, etc.)
 * - System announcements
 */

import { db } from '../client';
import { loggers } from '../../lib/logger';

const log = loggers.db;

async function tableExists(tableName: string): Promise<boolean> {
  const result = await db.queryOne<{ count: string }>(
    `SELECT COUNT(*) as count FROM information_schema.tables
     WHERE table_schema = 'public' AND table_name = $1`,
    [tableName]
  );
  return parseInt(result?.count || '0') > 0;
}

export async function up(): Promise<void> {
  log.info('Running migration: 053_notifications_system');

  // ============================================
  // NOTIFICATIONS TABLE
  // ============================================
  if (!(await tableExists('notifications'))) {
    log.info('Creating notifications table...');
    await db.query(`
      CREATE TABLE notifications (
        id TEXT PRIMARY KEY DEFAULT 'notif_' || replace(gen_random_uuid()::text, '-', ''),
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,

        -- Notification type and category
        type TEXT NOT NULL,
        category TEXT NOT NULL DEFAULT 'general',

        -- Content
        title TEXT NOT NULL,
        body TEXT,
        icon TEXT,
        image_url TEXT,

        -- Action link
        action_url TEXT,
        action_label TEXT,

        -- Related entities
        related_user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
        related_entity_type TEXT,
        related_entity_id TEXT,

        -- Metadata (JSON for extensibility)
        metadata JSONB DEFAULT '{}',

        -- Status
        is_read BOOLEAN DEFAULT FALSE,
        read_at TIMESTAMPTZ,

        -- Push notification status
        push_sent BOOLEAN DEFAULT FALSE,
        push_sent_at TIMESTAMPTZ,

        -- Expiration (optional)
        expires_at TIMESTAMPTZ,

        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    // Indexes
    await db.query('CREATE INDEX idx_notifications_user ON notifications(user_id, created_at DESC)');
    await db.query('CREATE INDEX idx_notifications_unread ON notifications(user_id, is_read) WHERE is_read = FALSE');
    await db.query('CREATE INDEX idx_notifications_type ON notifications(type)');
    await db.query('CREATE INDEX idx_notifications_category ON notifications(user_id, category)');
    await db.query('CREATE INDEX idx_notifications_related ON notifications(related_entity_type, related_entity_id)');
    await db.query(`
      CREATE INDEX idx_notifications_push_pending ON notifications(push_sent, created_at)
      WHERE push_sent = FALSE
    `);

    log.info('notifications table created');
  }

  // ============================================
  // NOTIFICATION PREFERENCES TABLE
  // ============================================
  if (!(await tableExists('notification_preferences'))) {
    log.info('Creating notification_preferences table...');
    await db.query(`
      CREATE TABLE notification_preferences (
        id TEXT PRIMARY KEY DEFAULT 'np_' || replace(gen_random_uuid()::text, '-', ''),
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,

        -- Category-level preferences
        category TEXT NOT NULL,

        -- Delivery channels
        in_app_enabled BOOLEAN DEFAULT TRUE,
        push_enabled BOOLEAN DEFAULT TRUE,
        email_enabled BOOLEAN DEFAULT FALSE,

        -- Quiet hours (in user's timezone)
        quiet_hours_start TIME,
        quiet_hours_end TIME,

        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),

        CONSTRAINT unique_user_notification_pref UNIQUE (user_id, category)
      )
    `);

    await db.query('CREATE INDEX idx_notification_prefs_user ON notification_preferences(user_id)');

    log.info('notification_preferences table created');
  }

  log.info('Migration 053_notifications_system completed');
}

export async function down(): Promise<void> {
  log.info('Rolling back migration: 053_notifications_system');

  await db.query('DROP TABLE IF EXISTS notification_preferences CASCADE');
  await db.query('DROP TABLE IF EXISTS notifications CASCADE');

  log.info('Rollback 053_notifications_system completed');
}
