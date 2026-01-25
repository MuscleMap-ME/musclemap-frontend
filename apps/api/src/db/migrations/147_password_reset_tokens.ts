/**
 * Migration 147: Password Reset Tokens
 *
 * Creates a table for secure password reset token storage.
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
  log.info('Running migration: 147_password_reset_tokens');

  // Create password reset tokens table
  if (!(await tableExists('password_reset_tokens'))) {
    await db.query(`
      CREATE TABLE password_reset_tokens (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        token VARCHAR(64) NOT NULL UNIQUE,
        expires_at TIMESTAMPTZ NOT NULL,
        used_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    // Index for fast token lookup
    await db.query(`CREATE INDEX idx_password_reset_tokens_token ON password_reset_tokens(token)`);

    // Index for cleanup of expired tokens
    await db.query(`CREATE INDEX idx_password_reset_tokens_expires_at ON password_reset_tokens(expires_at)`);

    log.info('Created password_reset_tokens table with indexes');
  }
}

// DESTRUCTIVE: Drops password reset tokens table - this is intentional for rollback
export async function down(): Promise<void> {
  log.info('Rolling back migration: 147_password_reset_tokens');
  await db.query(`DROP TABLE IF EXISTS password_reset_tokens CASCADE`);
}
