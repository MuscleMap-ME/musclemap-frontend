// DESTRUCTIVE: Schema modification for rivalries system - contains DROP/TRUNCATE operations
/**
 * Migration: Rivalries System
 *
 * Adds tables for the rivalry/competition system:
 * - rivalries: One-on-one rivalry tracking
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
  log.info('Running migration: 057_rivalries_system');

  // ============================================
  // RIVALRIES TABLE
  // ============================================
  if (!(await tableExists('rivalries'))) {
    log.info('Creating rivalries table...');
    await db.query(`
      CREATE TABLE rivalries (
        id TEXT PRIMARY KEY,
        challenger_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        challenged_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'completed', 'declined', 'expired')),
        created_at TIMESTAMPTZ DEFAULT NOW(),
        started_at TIMESTAMPTZ,
        ended_at TIMESTAMPTZ,
        challenger_tu INTEGER DEFAULT 0,
        challenged_tu INTEGER DEFAULT 0,
        last_challenger_workout TIMESTAMPTZ,
        last_challenged_workout TIMESTAMPTZ,
        winner_id TEXT REFERENCES users(id) ON DELETE SET NULL,
        CONSTRAINT no_self_rivalry CHECK (challenger_id != challenged_id),
        CONSTRAINT unique_active_rivalry UNIQUE (challenger_id, challenged_id)
      )
    `);

    await db.query('CREATE INDEX idx_rivalries_challenger ON rivalries(challenger_id, status)');
    await db.query('CREATE INDEX idx_rivalries_challenged ON rivalries(challenged_id, status)');
    await db.query('CREATE INDEX idx_rivalries_status ON rivalries(status)');
    await db.query('CREATE INDEX idx_rivalries_active ON rivalries(challenger_id, challenged_id) WHERE status = \'active\'');

    log.info('rivalries table created');
  }

  log.info('Migration 057_rivalries_system completed');
}

export async function down(): Promise<void> {
  log.info('Rolling back migration: 057_rivalries_system');

  await db.query('DROP TABLE IF EXISTS rivalries CASCADE');

  log.info('Rollback 057_rivalries_system completed');
}
