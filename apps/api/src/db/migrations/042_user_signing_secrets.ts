// DESTRUCTIVE: Schema modification for user signing secrets - contains DROP/TRUNCATE operations
/**
 * Migration: User Signing Secrets
 *
 * Adds support for request signing with per-user secrets.
 * Users can enable request signing for sensitive operations.
 */

import { db } from '../client';
import { loggers } from '../../lib/logger';

const log = loggers.db;

export async function migrate(): Promise<void> {
  log.info('Running migration: 042_user_signing_secrets');

  // Check if column already exists
  const columnCheck = await db.queryOne<{ count: string }>(`
    SELECT COUNT(*) as count FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'signing_secret'
  `);

  if (columnCheck && parseInt(columnCheck.count) === 0) {
    log.info('Adding signing_secret column to users table...');

    // Add signing_secret column
    await db.query(`
      ALTER TABLE users
      ADD COLUMN signing_secret TEXT,
      ADD COLUMN signing_enabled BOOLEAN DEFAULT FALSE,
      ADD COLUMN signing_enabled_at TIMESTAMPTZ
    `);

    // Create index for quick lookup (non-concurrent since we're in a transaction)
    await db.query(`
      CREATE INDEX IF NOT EXISTS idx_users_signing_enabled
      ON users (id) WHERE signing_enabled = TRUE
    `);

    log.info('User signing columns added');
  } else {
    log.info('signing_secret column already exists, skipping...');
  }

  log.info('Migration 042_user_signing_secrets complete');
}

export async function rollback(): Promise<void> {
  log.info('Rolling back migration: 042_user_signing_secrets');

  // Drop index first
  await db.query('DROP INDEX IF EXISTS idx_users_signing_enabled');

  // Drop columns
  const columnCheck = await db.queryOne<{ count: string }>(`
    SELECT COUNT(*) as count FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'signing_secret'
  `);

  if (columnCheck && parseInt(columnCheck.count) > 0) {
    await db.query(`
      ALTER TABLE users
      DROP COLUMN IF EXISTS signing_secret,
      DROP COLUMN IF EXISTS signing_enabled,
      DROP COLUMN IF EXISTS signing_enabled_at
    `);
  }

  log.info('Rollback 042_user_signing_secrets complete');
}
