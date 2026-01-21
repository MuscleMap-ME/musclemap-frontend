// DESTRUCTIVE: Schema modification for backup system - contains DROP/TRUNCATE operations
/**
 * Migration 108: Backup System
 *
 * Creates tables for backup management:
 * - backups: Track all database backups with metadata
 * - backup_schedule: Configure automated backup schedule
 */

import { query } from '../client';
import { loggers } from '../../lib/logger';

const log = loggers.db;

export async function up(): Promise<void> {
  log.info('Running migration: 108_backup_system');

  // ============================================
  // 1. Create backups table
  // ============================================
  log.info('Creating backups table...');

  await query(`
    CREATE TABLE IF NOT EXISTS backups (
      id TEXT PRIMARY KEY,
      filename TEXT NOT NULL,
      size_bytes BIGINT NOT NULL DEFAULT 0,
      type TEXT NOT NULL DEFAULT 'full' CHECK (type IN ('full', 'schema', 'data')),
      status TEXT NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed', 'failed', 'verified', 'corrupted')),
      description TEXT,
      error_message TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      completed_at TIMESTAMPTZ,
      verified_at TIMESTAMPTZ,
      created_by TEXT REFERENCES users(id) ON DELETE SET NULL,
      metadata JSONB NOT NULL DEFAULT '{}'
    )
  `);

  // ============================================
  // 2. Create backup indexes
  // ============================================
  log.info('Creating backup indexes...');

  await query(`
    CREATE INDEX IF NOT EXISTS idx_backups_status_created ON backups(status, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_backups_type_created ON backups(type, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_backups_keyset ON backups(created_at DESC, id DESC);
    CREATE INDEX IF NOT EXISTS idx_backups_created_by ON backups(created_by);
  `);

  // ============================================
  // 3. Create backup_schedule table
  // ============================================
  log.info('Creating backup_schedule table...');

  await query(`
    CREATE TABLE IF NOT EXISTS backup_schedule (
      id SERIAL PRIMARY KEY,
      enabled BOOLEAN NOT NULL DEFAULT FALSE,
      frequency TEXT NOT NULL DEFAULT 'daily' CHECK (frequency IN ('hourly', 'daily', 'weekly', 'monthly')),
      retention_days INTEGER NOT NULL DEFAULT 30 CHECK (retention_days BETWEEN 1 AND 365),
      hour INTEGER NOT NULL DEFAULT 3 CHECK (hour BETWEEN 0 AND 23),
      minute INTEGER NOT NULL DEFAULT 0 CHECK (minute BETWEEN 0 AND 59),
      day_of_week INTEGER CHECK (day_of_week BETWEEN 0 AND 6),
      day_of_month INTEGER CHECK (day_of_month BETWEEN 1 AND 28),
      last_run_at TIMESTAMPTZ,
      next_run_at TIMESTAMPTZ,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  // ============================================
  // 4. Insert default schedule
  // ============================================
  log.info('Inserting default backup schedule...');

  await query(`
    INSERT INTO backup_schedule (enabled, frequency, retention_days, hour, minute)
    VALUES (false, 'daily', 30, 3, 0)
    ON CONFLICT DO NOTHING
  `);

  log.info('Migration 108_backup_system completed successfully');
}

export async function down(): Promise<void> {
  log.info('Rolling back migration: 108_backup_system');

  await query(`DROP TABLE IF EXISTS backup_schedule`);
  await query(`DROP TABLE IF EXISTS backups`);

  log.info('Migration 108_backup_system rolled back successfully');
}
