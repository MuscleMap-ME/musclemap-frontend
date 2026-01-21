// DESTRUCTIVE: Schema modification for auto discovered bugs - contains DROP/TRUNCATE operations
// SQL-SAFE: Template literals contain static SQL only, no external input
/**
 * Migration: Auto-Discovered Bugs System
 *
 * Enhances feedback system to support:
 * - System-discovered bugs (no user_id required)
 * - Bug hunter integration
 * - Full bug lifecycle tracking
 * - Resolution history
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
  log.info('Running migration: 120_auto_discovered_bugs');

  // ============================================
  // MAKE USER_ID NULLABLE FOR SYSTEM-DISCOVERED BUGS
  // ============================================

  // Check if constraint needs modification
  const constraint = await db.queryOne<{ conname: string }>(`
    SELECT conname FROM pg_constraint
    WHERE conname = 'user_feedback_user_id_fkey'
  `);

  if (constraint) {
    // Drop the NOT NULL constraint if it exists
    await db.query(`
      ALTER TABLE user_feedback
      ALTER COLUMN user_id DROP NOT NULL
    `);
    log.info('Made user_id nullable for system-discovered bugs');
  }

  // ============================================
  // ADD SOURCE TRACKING
  // ============================================
  if (!(await columnExists('user_feedback', 'source'))) {
    await db.query(`
      ALTER TABLE user_feedback ADD COLUMN source TEXT DEFAULT 'user'
      CHECK (source IN ('user', 'bug_hunter', 'system', 'api_test', 'e2e_test'))
    `);
    log.info('Added source column');
  }

  // ============================================
  // ADD BUG HUNTER SPECIFIC FIELDS
  // ============================================
  if (!(await columnExists('user_feedback', 'bug_hunter_id'))) {
    await db.query(`ALTER TABLE user_feedback ADD COLUMN bug_hunter_id TEXT`);
    log.info('Added bug_hunter_id column');
  }

  if (!(await columnExists('user_feedback', 'bug_hunter_hash'))) {
    await db.query(`ALTER TABLE user_feedback ADD COLUMN bug_hunter_hash TEXT`);
    log.info('Added bug_hunter_hash column');
  }

  if (!(await columnExists('user_feedback', 'page_url'))) {
    await db.query(`ALTER TABLE user_feedback ADD COLUMN page_url TEXT`);
    log.info('Added page_url column');
  }

  if (!(await columnExists('user_feedback', 'error_category'))) {
    await db.query(`
      ALTER TABLE user_feedback ADD COLUMN error_category TEXT
      CHECK (error_category IN ('crash', 'error', 'ui', 'network', 'performance', 'accessibility', 'security'))
    `);
    log.info('Added error_category column');
  }

  if (!(await columnExists('user_feedback', 'root_cause_type'))) {
    await db.query(`
      ALTER TABLE user_feedback ADD COLUMN root_cause_type TEXT
      CHECK (root_cause_type IN ('frontend', 'backend', 'database', 'integration', 'unknown'))
    `);
    log.info('Added root_cause_type column');
  }

  if (!(await columnExists('user_feedback', 'root_cause_file'))) {
    await db.query(`ALTER TABLE user_feedback ADD COLUMN root_cause_file TEXT`);
    log.info('Added root_cause_file column');
  }

  if (!(await columnExists('user_feedback', 'root_cause_hypothesis'))) {
    await db.query(`ALTER TABLE user_feedback ADD COLUMN root_cause_hypothesis TEXT`);
    log.info('Added root_cause_hypothesis column');
  }

  if (!(await columnExists('user_feedback', 'suggested_fix'))) {
    await db.query(`ALTER TABLE user_feedback ADD COLUMN suggested_fix JSONB`);
    log.info('Added suggested_fix column');
  }

  if (!(await columnExists('user_feedback', 'console_errors'))) {
    await db.query(`ALTER TABLE user_feedback ADD COLUMN console_errors JSONB DEFAULT '[]'`);
    log.info('Added console_errors column');
  }

  if (!(await columnExists('user_feedback', 'network_errors'))) {
    await db.query(`ALTER TABLE user_feedback ADD COLUMN network_errors JSONB DEFAULT '[]'`);
    log.info('Added network_errors column');
  }

  // ============================================
  // ADD RESOLUTION TRACKING FIELDS
  // ============================================
  if (!(await columnExists('user_feedback', 'resolved_by'))) {
    await db.query(`ALTER TABLE user_feedback ADD COLUMN resolved_by TEXT REFERENCES users(id) ON DELETE SET NULL`);
    log.info('Added resolved_by column');
  }

  if (!(await columnExists('user_feedback', 'resolution_type'))) {
    await db.query(`
      ALTER TABLE user_feedback ADD COLUMN resolution_type TEXT
      CHECK (resolution_type IN ('auto_fix', 'manual_fix', 'duplicate', 'not_a_bug', 'wont_fix', 'cannot_reproduce'))
    `);
    log.info('Added resolution_type column');
  }

  if (!(await columnExists('user_feedback', 'resolution_notes'))) {
    await db.query(`ALTER TABLE user_feedback ADD COLUMN resolution_notes TEXT`);
    log.info('Added resolution_notes column');
  }

  if (!(await columnExists('user_feedback', 'fix_commit'))) {
    await db.query(`ALTER TABLE user_feedback ADD COLUMN fix_commit TEXT`);
    log.info('Added fix_commit column');
  }

  if (!(await columnExists('user_feedback', 'fix_pr_url'))) {
    await db.query(`ALTER TABLE user_feedback ADD COLUMN fix_pr_url TEXT`);
    log.info('Added fix_pr_url column');
  }

  if (!(await columnExists('user_feedback', 'files_changed'))) {
    await db.query(`ALTER TABLE user_feedback ADD COLUMN files_changed JSONB DEFAULT '[]'`);
    log.info('Added files_changed column');
  }

  if (!(await columnExists('user_feedback', 'verified_fixed_at'))) {
    await db.query(`ALTER TABLE user_feedback ADD COLUMN verified_fixed_at TIMESTAMPTZ`);
    log.info('Added verified_fixed_at column');
  }

  if (!(await columnExists('user_feedback', 'verified_fixed_by'))) {
    await db.query(`ALTER TABLE user_feedback ADD COLUMN verified_fixed_by TEXT REFERENCES users(id) ON DELETE SET NULL`);
    log.info('Added verified_fixed_by column');
  }

  // ============================================
  // ADD DUPLICATE TRACKING
  // ============================================
  if (!(await columnExists('user_feedback', 'duplicate_of'))) {
    await db.query(`ALTER TABLE user_feedback ADD COLUMN duplicate_of TEXT REFERENCES user_feedback(id) ON DELETE SET NULL`);
    log.info('Added duplicate_of column');
  }

  // ============================================
  // BUG HISTORY TABLE (for tracking all changes)
  // ============================================
  if (!(await tableExists('bug_history'))) {
    log.info('Creating bug_history table...');
    await db.query(`
      CREATE TABLE bug_history (
        id TEXT PRIMARY KEY DEFAULT 'bh_' || replace(gen_random_uuid()::text, '-', ''),
        feedback_id TEXT NOT NULL REFERENCES user_feedback(id) ON DELETE CASCADE,

        -- Who made the change (NULL for system)
        actor_id TEXT REFERENCES users(id) ON DELETE SET NULL,
        actor_type TEXT NOT NULL CHECK (actor_type IN ('user', 'admin', 'system', 'bug_hunter', 'auto_fix')),

        -- What changed
        action TEXT NOT NULL CHECK (action IN (
          'created', 'status_changed', 'priority_changed', 'assigned',
          'commented', 'auto_fix_started', 'auto_fix_completed', 'auto_fix_failed',
          'resolved', 'reopened', 'marked_duplicate', 'verified'
        )),

        -- Previous and new values for changes
        previous_value TEXT,
        new_value TEXT,

        -- Additional context
        details JSONB,

        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    await db.query('CREATE INDEX idx_bug_history_feedback ON bug_history(feedback_id, created_at DESC)');
    await db.query('CREATE INDEX idx_bug_history_actor ON bug_history(actor_id, created_at DESC)');
    await db.query('CREATE INDEX idx_bug_history_action ON bug_history(action, created_at DESC)');

    log.info('bug_history table created');
  }

  // ============================================
  // BUG METRICS MATERIALIZED VIEW
  // ============================================
  await db.query(`DROP MATERIALIZED VIEW IF EXISTS mv_bug_metrics`);
  await db.query(`
    CREATE MATERIALIZED VIEW mv_bug_metrics AS
    SELECT
      DATE_TRUNC('day', created_at) as date,
      source,
      COUNT(*) as total_bugs,
      COUNT(*) FILTER (WHERE status IN ('resolved', 'closed')) as resolved_bugs,
      COUNT(*) FILTER (WHERE status NOT IN ('resolved', 'closed', 'wont_fix')) as open_bugs,
      COUNT(*) FILTER (WHERE priority = 'critical') as critical_bugs,
      COUNT(*) FILTER (WHERE priority = 'high') as high_bugs,
      COUNT(*) FILTER (WHERE auto_fix_status = 'completed') as auto_fixed,
      AVG(EXTRACT(EPOCH FROM (resolved_at - created_at))/3600) FILTER (WHERE resolved_at IS NOT NULL) as avg_resolution_hours
    FROM user_feedback
    WHERE type = 'bug_report'
    GROUP BY DATE_TRUNC('day', created_at), source
    ORDER BY date DESC
  `);

  await db.query('CREATE UNIQUE INDEX idx_mv_bug_metrics_pk ON mv_bug_metrics(date, source)');

  log.info('mv_bug_metrics materialized view created');

  // ============================================
  // ADD INDEXES FOR BUG HUNTER QUERIES
  // ============================================
  await db.query(`CREATE INDEX IF NOT EXISTS idx_user_feedback_source ON user_feedback(source, created_at DESC)`);
  await db.query(`CREATE INDEX IF NOT EXISTS idx_user_feedback_bug_hunter_id ON user_feedback(bug_hunter_id) WHERE bug_hunter_id IS NOT NULL`);
  await db.query(`CREATE INDEX IF NOT EXISTS idx_user_feedback_bug_hunter_hash ON user_feedback(bug_hunter_hash) WHERE bug_hunter_hash IS NOT NULL`);
  await db.query(`CREATE INDEX IF NOT EXISTS idx_user_feedback_page_url ON user_feedback(page_url) WHERE page_url IS NOT NULL`);
  await db.query(`CREATE INDEX IF NOT EXISTS idx_user_feedback_resolved ON user_feedback(resolved_at DESC) WHERE resolved_at IS NOT NULL`);

  log.info('Migration 120_auto_discovered_bugs completed');
}

export async function down(): Promise<void> {
  log.info('Rolling back migration: 120_auto_discovered_bugs');

  // Drop materialized view
  await db.query('DROP MATERIALIZED VIEW IF EXISTS mv_bug_metrics');

  // Drop bug_history table
  await db.query('DROP TABLE IF EXISTS bug_history CASCADE');

  // Drop indexes
  await db.query('DROP INDEX IF EXISTS idx_user_feedback_source');
  await db.query('DROP INDEX IF EXISTS idx_user_feedback_bug_hunter_id');
  await db.query('DROP INDEX IF EXISTS idx_user_feedback_bug_hunter_hash');
  await db.query('DROP INDEX IF EXISTS idx_user_feedback_page_url');
  await db.query('DROP INDEX IF EXISTS idx_user_feedback_resolved');

  // Remove columns
  const columns = [
    'source', 'bug_hunter_id', 'bug_hunter_hash', 'page_url',
    'error_category', 'root_cause_type', 'root_cause_file', 'root_cause_hypothesis',
    'suggested_fix', 'console_errors', 'network_errors',
    'resolved_by', 'resolution_type', 'resolution_notes', 'fix_commit', 'fix_pr_url',
    'files_changed', 'verified_fixed_at', 'verified_fixed_by', 'duplicate_of'
  ];

  for (const col of columns) {
    await db.query(`ALTER TABLE user_feedback DROP COLUMN IF EXISTS ${col}`);
  }

  log.info('Rollback 120_auto_discovered_bugs completed');
}
