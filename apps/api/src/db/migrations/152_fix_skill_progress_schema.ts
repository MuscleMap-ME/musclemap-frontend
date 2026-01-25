// DESTRUCTIVE: Alters user_skill_progress table structure to align with skill service
// SQL-SAFE: No user input in template literals
/**
 * Migration: Fix Skill Progress Schema
 *
 * Fixes the schema mismatch between skill_nodes (from migration 043)
 * and user_skill_progress (modified by migration 088).
 *
 * The skill service expects user_skill_progress to reference skill_nodes
 * via skill_node_id, but migration 088 created it with skill_progression_id.
 *
 * This migration:
 * 1. Adds skill_node_id column to user_skill_progress
 * 2. Creates the missing skill_practice_logs table
 * 3. Updates constraints and indexes
 */

import { db } from '../client';
import { loggers } from '../../lib/logger';

const log = loggers.db;

async function columnExists(tableName: string, columnName: string): Promise<boolean> {
  const result = await db.queryOne<{ count: string }>(
    `SELECT COUNT(*) as count FROM information_schema.columns
     WHERE table_name = $1 AND column_name = $2`,
    [tableName, columnName]
  );
  return parseInt(result?.count || '0') > 0;
}

async function tableExists(tableName: string): Promise<boolean> {
  const result = await db.queryOne<{ count: string }>(
    `SELECT COUNT(*) as count FROM information_schema.tables
     WHERE table_schema = 'public' AND table_name = $1`,
    [tableName]
  );
  return parseInt(result?.count || '0') > 0;
}

export async function up(): Promise<void> {
  log.info('Running migration: 152_fix_skill_progress_schema');

  // ============================================
  // 1. ADD skill_node_id TO user_skill_progress
  // ============================================
  if (!(await columnExists('user_skill_progress', 'skill_node_id'))) {
    log.info('Adding skill_node_id column to user_skill_progress...');

    // Add the column
    await db.query(`
      ALTER TABLE user_skill_progress
      ADD COLUMN skill_node_id TEXT REFERENCES skill_nodes(id) ON DELETE CASCADE
    `);

    // Add the unique constraint for skill_node_id
    await db.query(`
      ALTER TABLE user_skill_progress
      ADD CONSTRAINT user_skill_progress_user_skill_node_unique
      UNIQUE (user_id, skill_node_id)
    `);

    // Create index for the new column
    await db.query(`
      CREATE INDEX IF NOT EXISTS idx_user_skill_progress_skill_node
      ON user_skill_progress(skill_node_id)
    `);

    log.info('skill_node_id column added to user_skill_progress');
  }

  // ============================================
  // 2. ADD MISSING COLUMNS TO user_skill_progress
  // ============================================

  // Add practice_minutes column if missing
  if (!(await columnExists('user_skill_progress', 'practice_minutes'))) {
    log.info('Adding practice_minutes column...');
    await db.query(`
      ALTER TABLE user_skill_progress
      ADD COLUMN practice_minutes INT DEFAULT 0
    `);
  }

  // Add attempt_count column if missing
  if (!(await columnExists('user_skill_progress', 'attempt_count'))) {
    log.info('Adding attempt_count column...');
    await db.query(`
      ALTER TABLE user_skill_progress
      ADD COLUMN attempt_count INT DEFAULT 0
    `);
  }

  // Add verified column if missing
  if (!(await columnExists('user_skill_progress', 'verified'))) {
    log.info('Adding verified column...');
    await db.query(`
      ALTER TABLE user_skill_progress
      ADD COLUMN verified BOOLEAN DEFAULT FALSE
    `);
  }

  // Add verification_video_url column if missing
  if (!(await columnExists('user_skill_progress', 'verification_video_url'))) {
    log.info('Adding verification_video_url column...');
    await db.query(`
      ALTER TABLE user_skill_progress
      ADD COLUMN verification_video_url TEXT
    `);
  }

  // Add achieved_at column if missing (different from first_achieved_at)
  if (!(await columnExists('user_skill_progress', 'achieved_at'))) {
    log.info('Adding achieved_at column...');
    await db.query(`
      ALTER TABLE user_skill_progress
      ADD COLUMN achieved_at TIMESTAMPTZ
    `);

    // Copy data from first_achieved_at if it exists
    if (await columnExists('user_skill_progress', 'first_achieved_at')) {
      await db.query(`
        UPDATE user_skill_progress
        SET achieved_at = first_achieved_at
        WHERE first_achieved_at IS NOT NULL
      `);
    }
  }

  // Update status check constraint to include 'locked' and 'available'
  log.info('Updating status check constraint...');
  try {
    await db.query(`
      ALTER TABLE user_skill_progress
      DROP CONSTRAINT IF EXISTS user_skill_progress_status_check
    `);
    await db.query(`
      ALTER TABLE user_skill_progress
      ADD CONSTRAINT user_skill_progress_status_check
      CHECK (status IN ('locked', 'available', 'in_progress', 'achieved', 'not_started'))
    `);
  } catch (e) {
    log.warn('Could not update status constraint - may already be correct');
  }

  // ============================================
  // 3. CREATE skill_practice_logs TABLE
  // ============================================
  if (!(await tableExists('skill_practice_logs'))) {
    log.info('Creating skill_practice_logs table...');

    await db.query(`
      CREATE TABLE skill_practice_logs (
        id TEXT PRIMARY KEY DEFAULT 'spl_' || replace(gen_random_uuid()::text, '-', ''),
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        skill_node_id TEXT NOT NULL REFERENCES skill_nodes(id) ON DELETE CASCADE,

        practice_date DATE NOT NULL DEFAULT CURRENT_DATE,
        duration_minutes INT NOT NULL,
        value_achieved INT,
        notes TEXT,

        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    await db.query(`
      CREATE INDEX idx_skill_practice_logs_user ON skill_practice_logs(user_id)
    `);
    await db.query(`
      CREATE INDEX idx_skill_practice_logs_skill ON skill_practice_logs(skill_node_id)
    `);
    await db.query(`
      CREATE INDEX idx_skill_practice_logs_date ON skill_practice_logs(practice_date)
    `);
    await db.query(`
      CREATE INDEX idx_skill_practice_logs_user_date ON skill_practice_logs(user_id, practice_date DESC)
    `);

    log.info('skill_practice_logs table created');
  }

  log.info('Migration 152_fix_skill_progress_schema completed');
}

export async function down(): Promise<void> {
  log.info('Rolling back migration: 152_fix_skill_progress_schema');

  // Drop the practice logs table
  await db.query('DROP TABLE IF EXISTS skill_practice_logs CASCADE');

  // Remove the added columns from user_skill_progress
  await db.query(`
    ALTER TABLE user_skill_progress
    DROP COLUMN IF EXISTS skill_node_id CASCADE
  `);
  await db.query(`
    ALTER TABLE user_skill_progress
    DROP COLUMN IF EXISTS practice_minutes
  `);
  await db.query(`
    ALTER TABLE user_skill_progress
    DROP COLUMN IF EXISTS attempt_count
  `);
  await db.query(`
    ALTER TABLE user_skill_progress
    DROP COLUMN IF EXISTS verified
  `);
  await db.query(`
    ALTER TABLE user_skill_progress
    DROP COLUMN IF EXISTS verification_video_url
  `);
  await db.query(`
    ALTER TABLE user_skill_progress
    DROP COLUMN IF EXISTS achieved_at
  `);

  log.info('Migration 152_fix_skill_progress_schema rolled back');
}
