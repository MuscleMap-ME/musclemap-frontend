// DESTRUCTIVE: Schema modification for user mutes - contains DROP/TRUNCATE operations
/**
 * Migration: User Mutes System
 *
 * Adds table for muting users, communities, and other entities.
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
  log.info('Running migration: 058_user_mutes');

  // ============================================
  // USER MUTES TABLE
  // ============================================
  if (!(await tableExists('user_mutes'))) {
    log.info('Creating user_mutes table...');
    await db.query(`
      CREATE TABLE user_mutes (
        id TEXT PRIMARY KEY DEFAULT 'mute_' || replace(gen_random_uuid()::text, '-', ''),
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        entity_type TEXT NOT NULL CHECK (entity_type IN ('user', 'community', 'thread', 'channel')),
        entity_id TEXT NOT NULL,
        mute_until TIMESTAMPTZ, -- NULL = permanent
        reason TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        CONSTRAINT unique_user_mute UNIQUE (user_id, entity_type, entity_id)
      )
    `);

    await db.query('CREATE INDEX idx_user_mutes_user ON user_mutes(user_id)');
    await db.query('CREATE INDEX idx_user_mutes_entity ON user_mutes(entity_type, entity_id)');
    await db.query('CREATE INDEX idx_user_mutes_expiry ON user_mutes(mute_until) WHERE mute_until IS NOT NULL');

    log.info('user_mutes table created');
  }

  log.info('Migration 058_user_mutes completed');
}

export async function down(): Promise<void> {
  log.info('Rolling back migration: 058_user_mutes');

  await db.query('DROP TABLE IF EXISTS user_mutes CASCADE');

  log.info('Rollback 058_user_mutes completed');
}
