/**
 * Migration 108: Deployments Table
 *
 * Creates infrastructure for tracking deployment history:
 * 1. Deployments table to store all deployment records
 * 2. Indexes for efficient querying of deployment history
 * 3. View for deployment statistics
 *
 * Used by the admin dashboard for deployment pipeline management.
 */

import { query } from '../client';
import { loggers } from '../../lib/logger';

const log = loggers.db;

export async function up(): Promise<void> {
  log.info('Running migration: 108_deployments_table');

  // ============================================
  // 1. Create deployments table
  // ============================================
  log.info('Creating deployments table...');

  await query(`
    CREATE TABLE IF NOT EXISTS deployments (
      id TEXT PRIMARY KEY,
      git_commit TEXT NOT NULL,
      git_commit_short TEXT NOT NULL,
      git_branch TEXT NOT NULL DEFAULT 'main',
      git_message TEXT,
      status TEXT NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'in_progress', 'success', 'failed', 'rolled_back', 'cancelled')),
      started_at TIMESTAMPTZ DEFAULT NOW(),
      completed_at TIMESTAMPTZ,
      triggered_by TEXT NOT NULL REFERENCES users(id) ON DELETE SET NULL,
      output TEXT,
      error_message TEXT,
      rollback_of TEXT REFERENCES deployments(id) ON DELETE SET NULL,
      rolled_back_by TEXT REFERENCES users(id) ON DELETE SET NULL,
      notes TEXT,
      duration_ms INTEGER,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    COMMENT ON TABLE deployments IS 'Records of all deployment attempts and their outcomes';
    COMMENT ON COLUMN deployments.id IS 'Unique deployment identifier (deploy_timestamp_random)';
    COMMENT ON COLUMN deployments.git_commit IS 'Full git commit hash that was deployed';
    COMMENT ON COLUMN deployments.git_commit_short IS 'Short git commit hash (7 chars)';
    COMMENT ON COLUMN deployments.git_branch IS 'Git branch that was deployed';
    COMMENT ON COLUMN deployments.git_message IS 'Git commit message';
    COMMENT ON COLUMN deployments.status IS 'Deployment status: pending, in_progress, success, failed, rolled_back, cancelled';
    COMMENT ON COLUMN deployments.started_at IS 'When the deployment was initiated';
    COMMENT ON COLUMN deployments.completed_at IS 'When the deployment finished (success or failure)';
    COMMENT ON COLUMN deployments.triggered_by IS 'User ID who triggered the deployment';
    COMMENT ON COLUMN deployments.output IS 'Full deployment output/logs';
    COMMENT ON COLUMN deployments.error_message IS 'Error message if deployment failed';
    COMMENT ON COLUMN deployments.rollback_of IS 'If this is a rollback, the target deployment ID';
    COMMENT ON COLUMN deployments.rolled_back_by IS 'User ID who triggered the rollback';
    COMMENT ON COLUMN deployments.notes IS 'Optional notes about the deployment';
    COMMENT ON COLUMN deployments.duration_ms IS 'Total deployment duration in milliseconds';
  `);

  // ============================================
  // 2. Create indexes for efficient querying
  // ============================================
  log.info('Creating indexes for deployments table...');

  await query(`
    -- Index for listing deployments by status
    CREATE INDEX IF NOT EXISTS idx_deployments_status
    ON deployments(status, started_at DESC);

    -- Index for listing deployments by branch
    CREATE INDEX IF NOT EXISTS idx_deployments_branch
    ON deployments(git_branch, started_at DESC);

    -- Index for finding latest successful deployment
    CREATE INDEX IF NOT EXISTS idx_deployments_success_latest
    ON deployments(completed_at DESC)
    WHERE status = 'success';

    -- Index for finding active deployments
    CREATE INDEX IF NOT EXISTS idx_deployments_active
    ON deployments(started_at DESC)
    WHERE status IN ('pending', 'in_progress');

    -- Keyset pagination index
    CREATE INDEX IF NOT EXISTS idx_deployments_keyset
    ON deployments(started_at DESC, id DESC);

    -- Index for finding deployments by user
    CREATE INDEX IF NOT EXISTS idx_deployments_user
    ON deployments(triggered_by, started_at DESC);

    -- Index for rollback lookups
    CREATE INDEX IF NOT EXISTS idx_deployments_rollback
    ON deployments(rollback_of)
    WHERE rollback_of IS NOT NULL;
  `);

  // ============================================
  // 3. Create deployment statistics view
  // ============================================
  log.info('Creating deployment statistics view...');

  await query(`
    CREATE OR REPLACE VIEW v_deployment_stats AS
    SELECT
      COUNT(*) as total_deployments,
      COUNT(*) FILTER (WHERE status = 'success') as successful_deployments,
      COUNT(*) FILTER (WHERE status = 'failed') as failed_deployments,
      COUNT(*) FILTER (WHERE status = 'rolled_back') as rolled_back_deployments,
      COUNT(*) FILTER (WHERE status = 'cancelled') as cancelled_deployments,
      ROUND(
        COUNT(*) FILTER (WHERE status = 'success')::numeric /
        NULLIF(COUNT(*) FILTER (WHERE status IN ('success', 'failed')), 0) * 100,
        2
      ) as success_rate_percent,
      AVG(duration_ms) FILTER (WHERE status = 'success') as avg_success_duration_ms,
      AVG(duration_ms) FILTER (WHERE status = 'failed') as avg_failure_duration_ms,
      MAX(completed_at) FILTER (WHERE status = 'success') as last_successful_deploy,
      MIN(started_at) as first_deployment,
      COUNT(DISTINCT triggered_by) as unique_deployers,
      COUNT(DISTINCT git_branch) as branches_deployed
    FROM deployments;

    COMMENT ON VIEW v_deployment_stats IS 'Aggregate statistics about deployment history';
  `);

  // ============================================
  // 4. Create daily deployment stats view
  // ============================================
  log.info('Creating daily deployment stats view...');

  await query(`
    CREATE OR REPLACE VIEW v_deployment_daily_stats AS
    SELECT
      DATE(started_at) as deploy_date,
      COUNT(*) as total_deployments,
      COUNT(*) FILTER (WHERE status = 'success') as successful,
      COUNT(*) FILTER (WHERE status = 'failed') as failed,
      COUNT(*) FILTER (WHERE status = 'rolled_back') as rolled_back,
      AVG(duration_ms) FILTER (WHERE status IN ('success', 'failed')) as avg_duration_ms
    FROM deployments
    WHERE started_at >= NOW() - INTERVAL '30 days'
    GROUP BY DATE(started_at)
    ORDER BY deploy_date DESC;

    COMMENT ON VIEW v_deployment_daily_stats IS 'Daily deployment statistics for the last 30 days';
  `);

  // ============================================
  // 5. Create function to clean old deployment logs
  // ============================================
  log.info('Creating deployment cleanup function...');

  await query(`
    CREATE OR REPLACE FUNCTION cleanup_old_deployment_logs(days_to_keep INTEGER DEFAULT 90)
    RETURNS INTEGER AS $$
    DECLARE
      deleted_count INTEGER;
    BEGIN
      -- Truncate output field for old deployments to save space
      UPDATE deployments
      SET output = LEFT(output, 1000) || '... [truncated]'
      WHERE completed_at < NOW() - (days_to_keep || ' days')::INTERVAL
      AND output IS NOT NULL
      AND LENGTH(output) > 1000;

      GET DIAGNOSTICS deleted_count = ROW_COUNT;
      RETURN deleted_count;
    END;
    $$ LANGUAGE plpgsql;

    COMMENT ON FUNCTION cleanup_old_deployment_logs IS 'Truncates deployment output logs older than specified days';
  `);

  log.info('Migration 108_deployments_table completed successfully');
}

export async function down(): Promise<void> {
  log.info('Rolling back migration: 108_deployments_table');

  // Drop function
  await query(`DROP FUNCTION IF EXISTS cleanup_old_deployment_logs CASCADE`);

  // Drop views
  await query(`DROP VIEW IF EXISTS v_deployment_daily_stats CASCADE`);
  await query(`DROP VIEW IF EXISTS v_deployment_stats CASCADE`);

  // Drop indexes
  await query(`DROP INDEX IF EXISTS idx_deployments_rollback`);
  await query(`DROP INDEX IF EXISTS idx_deployments_user`);
  await query(`DROP INDEX IF EXISTS idx_deployments_keyset`);
  await query(`DROP INDEX IF EXISTS idx_deployments_active`);
  await query(`DROP INDEX IF EXISTS idx_deployments_success_latest`);
  await query(`DROP INDEX IF EXISTS idx_deployments_branch`);
  await query(`DROP INDEX IF EXISTS idx_deployments_status`);

  // Drop table
  await query(`DROP TABLE IF EXISTS deployments CASCADE`);

  log.info('Rollback of 108_deployments_table completed');
}
