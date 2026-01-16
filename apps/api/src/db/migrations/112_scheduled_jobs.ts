/**
 * Migration 112: Scheduled Jobs System
 *
 * Creates tables for the admin scheduler feature:
 * - scheduled_jobs: Stores cron job definitions
 * - scheduled_job_history: Stores execution history
 *
 * Features:
 * - node-cron format cron expressions
 * - Job enable/disable capability
 * - Execution history with output and error tracking
 * - Keyset pagination indexes
 */

import { db } from '../client';
import { loggers } from '../../lib/logger';

const log = loggers.db;

export async function up(): Promise<void> {
  log.info('Creating scheduled_jobs table...');

  // ============================================
  // scheduled_jobs table
  // ============================================
  await db.query(`
    CREATE TABLE IF NOT EXISTS scheduled_jobs (
      id VARCHAR(36) PRIMARY KEY,
      name VARCHAR(100) NOT NULL UNIQUE,
      description TEXT,
      cron_expression VARCHAR(50) NOT NULL,
      command TEXT NOT NULL,
      enabled BOOLEAN NOT NULL DEFAULT true,
      last_run TIMESTAMPTZ,
      next_run TIMESTAMPTZ,
      metadata JSONB DEFAULT '{}'::jsonb,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  // Index for listing jobs with pagination
  await db.query(`
    CREATE INDEX IF NOT EXISTS idx_scheduled_jobs_keyset
    ON scheduled_jobs(created_at DESC, id DESC)
  `);

  // Index for enabled jobs lookup
  await db.query(`
    CREATE INDEX IF NOT EXISTS idx_scheduled_jobs_enabled
    ON scheduled_jobs(enabled)
    WHERE enabled = true
  `);

  // Index for finding jobs due to run
  await db.query(`
    CREATE INDEX IF NOT EXISTS idx_scheduled_jobs_next_run
    ON scheduled_jobs(next_run)
    WHERE enabled = true AND next_run IS NOT NULL
  `);

  log.info('Creating scheduled_job_history table...');

  // ============================================
  // scheduled_job_history table
  // ============================================
  await db.query(`
    CREATE TABLE IF NOT EXISTS scheduled_job_history (
      id VARCHAR(36) PRIMARY KEY,
      job_id VARCHAR(36) NOT NULL REFERENCES scheduled_jobs(id) ON DELETE CASCADE,
      status VARCHAR(20) NOT NULL CHECK (status IN ('success', 'failure', 'running', 'skipped')),
      started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      completed_at TIMESTAMPTZ,
      duration_ms INTEGER,
      output TEXT,
      error TEXT,
      triggered_by VARCHAR(20) NOT NULL DEFAULT 'cron' CHECK (triggered_by IN ('cron', 'manual')),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  // Index for listing history by job
  await db.query(`
    CREATE INDEX IF NOT EXISTS idx_scheduled_job_history_job_id
    ON scheduled_job_history(job_id, started_at DESC)
  `);

  // Keyset pagination index for history
  await db.query(`
    CREATE INDEX IF NOT EXISTS idx_scheduled_job_history_keyset
    ON scheduled_job_history(started_at DESC, id DESC)
  `);

  // Index for filtering by status
  await db.query(`
    CREATE INDEX IF NOT EXISTS idx_scheduled_job_history_status
    ON scheduled_job_history(status)
  `);

  // Partial index for recent history queries
  await db.query(`
    CREATE INDEX IF NOT EXISTS idx_scheduled_job_history_recent
    ON scheduled_job_history(started_at DESC)
    WHERE started_at > NOW() - INTERVAL '7 days'
  `);

  log.info('Creating updated_at trigger...');

  // ============================================
  // updated_at trigger
  // ============================================
  await db.query(`
    CREATE OR REPLACE FUNCTION update_scheduled_jobs_updated_at()
    RETURNS TRIGGER AS $$
    BEGIN
      NEW.updated_at = NOW();
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql
  `);

  await db.query(`
    DROP TRIGGER IF EXISTS trigger_scheduled_jobs_updated_at ON scheduled_jobs
  `);

  await db.query(`
    CREATE TRIGGER trigger_scheduled_jobs_updated_at
      BEFORE UPDATE ON scheduled_jobs
      FOR EACH ROW
      EXECUTE FUNCTION update_scheduled_jobs_updated_at()
  `);

  log.info('Seeding default scheduled jobs...');

  // ============================================
  // Seed some default scheduled jobs
  // ============================================
  await db.query(`
    INSERT INTO scheduled_jobs (id, name, description, cron_expression, command, enabled, metadata)
    VALUES
      ('job_refresh_leaderboards', 'refresh-leaderboards', 'Refresh materialized views for leaderboards', '*/5 * * * *', 'REFRESH MATERIALIZED VIEW CONCURRENTLY mv_leaderboard', true, '{"category": "performance"}'::jsonb),
      ('job_cleanup_expired_tokens', 'cleanup-expired-tokens', 'Remove expired auth tokens and sessions', '0 2 * * *', 'DELETE FROM sessions WHERE expires_at < NOW()', true, '{"category": "maintenance"}'::jsonb),
      ('job_archive_old_logs', 'archive-old-logs', 'Archive logs older than 30 days', '0 3 * * 0', 'SELECT archive_old_logs(30)', false, '{"category": "maintenance"}'::jsonb),
      ('job_calculate_daily_stats', 'calculate-daily-stats', 'Calculate and cache daily statistics', '0 0 * * *', 'SELECT calculate_daily_stats()', true, '{"category": "analytics"}'::jsonb),
      ('job_send_digest_emails', 'send-digest-emails', 'Send weekly digest emails to users', '0 9 * * 1', 'SELECT send_weekly_digest_emails()', true, '{"category": "notifications"}'::jsonb)
    ON CONFLICT (name) DO NOTHING
  `);

  // Add comment for documentation
  await db.query(`
    COMMENT ON TABLE scheduled_jobs IS 'Stores cron job definitions for the admin scheduler'
  `);

  await db.query(`
    COMMENT ON TABLE scheduled_job_history IS 'Stores execution history for scheduled jobs'
  `);

  await db.query(`
    COMMENT ON COLUMN scheduled_jobs.cron_expression IS 'node-cron format: minute hour day-of-month month day-of-week (second optional)'
  `);

  log.info('Migration 112_scheduled_jobs completed successfully');
}

export async function down(): Promise<void> {
  await db.query('DROP TRIGGER IF EXISTS trigger_scheduled_jobs_updated_at ON scheduled_jobs');
  await db.query('DROP FUNCTION IF EXISTS update_scheduled_jobs_updated_at()');
  await db.query('DROP TABLE IF EXISTS scheduled_job_history');
  await db.query('DROP TABLE IF EXISTS scheduled_jobs');
}
