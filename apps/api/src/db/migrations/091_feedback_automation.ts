/**
 * Migration: Feedback Automation System
 *
 * Adds columns for:
 * - Bug confirmation tracking (for auto-fix queue)
 * - Auto-fix attempt tracking
 * - Resolution notification tracking
 * - Email digest tracking
 * - Agent job tracking
 */

import { db } from '../client';
import { loggers } from '../../lib/logger';

const log = loggers.db;

async function columnExists(tableName: string, columnName: string): Promise<boolean> {
  const result = await db.queryOne<{ count: string }>(
    `SELECT COUNT(*) as count FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = $1 AND column_name = $2`,
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
  log.info('Running migration: 091_feedback_automation');

  // ============================================
  // ADD COLUMNS TO USER_FEEDBACK
  // ============================================

  // Add 'confirmed' to status check constraint
  await db.query(`
    ALTER TABLE user_feedback
    DROP CONSTRAINT IF EXISTS user_feedback_status_check
  `);
  await db.query(`
    ALTER TABLE user_feedback
    ADD CONSTRAINT user_feedback_status_check
    CHECK (status IN ('open', 'in_progress', 'confirmed', 'resolved', 'closed', 'wont_fix'))
  `);

  // Bug confirmation tracking
  if (!(await columnExists('user_feedback', 'confirmed_at'))) {
    await db.query(`ALTER TABLE user_feedback ADD COLUMN confirmed_at TIMESTAMPTZ`);
    log.info('Added confirmed_at column');
  }

  if (!(await columnExists('user_feedback', 'confirmed_by'))) {
    await db.query(`ALTER TABLE user_feedback ADD COLUMN confirmed_by TEXT REFERENCES users(id) ON DELETE SET NULL`);
    log.info('Added confirmed_by column');
  }

  // Auto-fix tracking
  if (!(await columnExists('user_feedback', 'auto_fix_status'))) {
    await db.query(`
      ALTER TABLE user_feedback ADD COLUMN auto_fix_status TEXT
      CHECK (auto_fix_status IN ('pending', 'in_progress', 'completed', 'failed', 'cancelled'))
    `);
    log.info('Added auto_fix_status column');
  }

  if (!(await columnExists('user_feedback', 'auto_fix_started_at'))) {
    await db.query(`ALTER TABLE user_feedback ADD COLUMN auto_fix_started_at TIMESTAMPTZ`);
    log.info('Added auto_fix_started_at column');
  }

  if (!(await columnExists('user_feedback', 'auto_fix_completed_at'))) {
    await db.query(`ALTER TABLE user_feedback ADD COLUMN auto_fix_completed_at TIMESTAMPTZ`);
    log.info('Added auto_fix_completed_at column');
  }

  if (!(await columnExists('user_feedback', 'auto_fix_result'))) {
    await db.query(`ALTER TABLE user_feedback ADD COLUMN auto_fix_result JSONB`);
    log.info('Added auto_fix_result column');
  }

  if (!(await columnExists('user_feedback', 'auto_fix_job_id'))) {
    await db.query(`ALTER TABLE user_feedback ADD COLUMN auto_fix_job_id TEXT`);
    log.info('Added auto_fix_job_id column');
  }

  // Resolution notification tracking
  if (!(await columnExists('user_feedback', 'resolution_notified_at'))) {
    await db.query(`ALTER TABLE user_feedback ADD COLUMN resolution_notified_at TIMESTAMPTZ`);
    log.info('Added resolution_notified_at column');
  }

  // Email digest tracking
  if (!(await columnExists('user_feedback', 'digest_included_at'))) {
    await db.query(`ALTER TABLE user_feedback ADD COLUMN digest_included_at TIMESTAMPTZ`);
    log.info('Added digest_included_at column');
  }

  // ============================================
  // FEEDBACK AGENT JOBS TABLE
  // ============================================
  if (!(await tableExists('feedback_agent_jobs'))) {
    log.info('Creating feedback_agent_jobs table...');
    await db.query(`
      CREATE TABLE feedback_agent_jobs (
        id TEXT PRIMARY KEY DEFAULT 'faj_' || replace(gen_random_uuid()::text, '-', ''),
        feedback_id TEXT NOT NULL REFERENCES user_feedback(id) ON DELETE CASCADE,

        -- Job status
        status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed', 'cancelled')),

        -- Agent execution details
        started_at TIMESTAMPTZ,
        completed_at TIMESTAMPTZ,

        -- Output from the agent
        agent_output TEXT,
        error_message TEXT,

        -- What the agent did
        files_modified JSONB DEFAULT '[]',
        tests_passed BOOLEAN,
        deployed BOOLEAN DEFAULT FALSE,
        deploy_commit TEXT,

        -- Metadata
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    await db.query('CREATE INDEX idx_feedback_agent_jobs_feedback ON feedback_agent_jobs(feedback_id)');
    await db.query('CREATE INDEX idx_feedback_agent_jobs_status ON feedback_agent_jobs(status, created_at DESC)');

    log.info('feedback_agent_jobs table created');
  }

  // ============================================
  // EMAIL DIGEST TRACKING TABLE
  // ============================================
  if (!(await tableExists('feedback_email_digests'))) {
    log.info('Creating feedback_email_digests table...');
    await db.query(`
      CREATE TABLE feedback_email_digests (
        id TEXT PRIMARY KEY DEFAULT 'fed_' || replace(gen_random_uuid()::text, '-', ''),

        -- When the digest was sent
        sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

        -- Recipient
        recipient_email TEXT NOT NULL,

        -- What was included
        feedback_ids TEXT[] NOT NULL,
        feedback_count INTEGER NOT NULL,

        -- Email details
        email_id TEXT, -- From Resend

        -- Stats by type
        bug_count INTEGER DEFAULT 0,
        feature_count INTEGER DEFAULT 0,
        question_count INTEGER DEFAULT 0,
        general_count INTEGER DEFAULT 0,

        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    await db.query('CREATE INDEX idx_feedback_email_digests_sent ON feedback_email_digests(sent_at DESC)');

    log.info('feedback_email_digests table created');
  }

  // ============================================
  // ADD INDEX FOR CONFIRMED BUGS
  // ============================================
  await db.query(`
    CREATE INDEX IF NOT EXISTS idx_user_feedback_confirmed
    ON user_feedback(status, confirmed_at DESC)
    WHERE status = 'confirmed' AND type = 'bug_report'
  `);

  // ============================================
  // ADD INDEX FOR DIGEST QUERY
  // ============================================
  await db.query(`
    CREATE INDEX IF NOT EXISTS idx_user_feedback_digest
    ON user_feedback(created_at DESC)
    WHERE digest_included_at IS NULL AND type != 'bug_report'
  `);

  log.info('Migration 091_feedback_automation completed');
}

export async function down(): Promise<void> {
  log.info('Rolling back migration: 091_feedback_automation');

  // Drop tables
  await db.query('DROP TABLE IF EXISTS feedback_email_digests CASCADE');
  await db.query('DROP TABLE IF EXISTS feedback_agent_jobs CASCADE');

  // Drop indexes
  await db.query('DROP INDEX IF EXISTS idx_user_feedback_confirmed');
  await db.query('DROP INDEX IF EXISTS idx_user_feedback_digest');

  // Remove columns from user_feedback
  await db.query('ALTER TABLE user_feedback DROP COLUMN IF EXISTS confirmed_at');
  await db.query('ALTER TABLE user_feedback DROP COLUMN IF EXISTS confirmed_by');
  await db.query('ALTER TABLE user_feedback DROP COLUMN IF EXISTS auto_fix_status');
  await db.query('ALTER TABLE user_feedback DROP COLUMN IF EXISTS auto_fix_started_at');
  await db.query('ALTER TABLE user_feedback DROP COLUMN IF EXISTS auto_fix_completed_at');
  await db.query('ALTER TABLE user_feedback DROP COLUMN IF EXISTS auto_fix_result');
  await db.query('ALTER TABLE user_feedback DROP COLUMN IF EXISTS auto_fix_job_id');
  await db.query('ALTER TABLE user_feedback DROP COLUMN IF EXISTS resolution_notified_at');
  await db.query('ALTER TABLE user_feedback DROP COLUMN IF EXISTS digest_included_at');

  // Restore original status constraint
  await db.query(`
    ALTER TABLE user_feedback
    DROP CONSTRAINT IF EXISTS user_feedback_status_check
  `);
  await db.query(`
    ALTER TABLE user_feedback
    ADD CONSTRAINT user_feedback_status_check
    CHECK (status IN ('open', 'in_progress', 'resolved', 'closed', 'wont_fix'))
  `);

  log.info('Rollback 091_feedback_automation completed');
}
