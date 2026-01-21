// DESTRUCTIVE: Schema modification for error tracking system - contains DROP/TRUNCATE operations
/**
 * Migration 117: Error Tracking System
 *
 * Creates tables for tracking frontend errors, auto-healing workflows,
 * and error pattern analysis. This powers the Cockatrice error reporting
 * system and enables proactive issue resolution.
 *
 * Tables:
 * - frontend_errors: Individual error reports from the UI
 * - error_patterns: Detected patterns and recurring issues
 * - auto_healing_actions: Actions taken to fix issues automatically
 * - error_resolutions: How errors were resolved (for learning)
 * - auto_healing_executions: Execution log for auto-healing actions
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
  log.info('Running migration: 117_error_tracking_system');

  // ============================================
  // AUTO-HEALING ACTIONS TABLE (must exist before patterns)
  // ============================================

  if (!(await tableExists('auto_healing_actions'))) {
    log.info('Creating auto_healing_actions table...');
    await db.query(`
      CREATE TABLE auto_healing_actions (
        id TEXT PRIMARY KEY DEFAULT 'aha_' || replace(gen_random_uuid()::text, '-', ''),
        name VARCHAR(255) NOT NULL,
        description TEXT,
        action_type VARCHAR(50) NOT NULL,
        trigger_error_type VARCHAR(50),
        trigger_pattern TEXT,
        trigger_threshold INTEGER DEFAULT 1,
        config JSONB DEFAULT '{}',
        is_enabled BOOLEAN DEFAULT TRUE,
        requires_approval BOOLEAN DEFAULT FALSE,
        execution_count INTEGER DEFAULT 0,
        success_count INTEGER DEFAULT 0,
        last_executed_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    await db.query('CREATE INDEX idx_auto_healing_actions_type ON auto_healing_actions(action_type)');
    await db.query('CREATE INDEX idx_auto_healing_actions_enabled ON auto_healing_actions(is_enabled)');
    await db.query('CREATE INDEX idx_auto_healing_actions_trigger ON auto_healing_actions(trigger_error_type, is_enabled)');

    log.info('auto_healing_actions table created');

    // Seed default auto-healing actions
    log.info('Seeding default auto-healing actions...');
    await db.query(`
      INSERT INTO auto_healing_actions (name, description, action_type, trigger_error_type, trigger_threshold, config, is_enabled)
      VALUES
        ('Clear Client Cache', 'Suggests users clear their browser cache when chunk errors persist', 'cache_clear', 'chunk', 3, '{"message": "Try clearing your browser cache and refreshing", "auto_suggest": true}', TRUE),
        ('Notify On-Call', 'Sends alert to on-call engineer for critical errors', 'notify', NULL, 10, '{"channel": "slack", "severity_threshold": "critical"}', TRUE),
        ('Retry Request', 'Automatically retries failed network requests', 'retry', 'network', 1, '{"max_retries": 3, "backoff_ms": 1000}', TRUE),
        ('Session Refresh', 'Prompts user to re-authenticate on auth errors', 'session_refresh', 'auth', 1, '{"redirect_to": "/login", "preserve_url": true}', TRUE)
    `);
    log.info('Auto-healing actions seeded');
  }

  // ============================================
  // ERROR PATTERNS TABLE
  // ============================================

  if (!(await tableExists('error_patterns'))) {
    log.info('Creating error_patterns table...');
    await db.query(`
      CREATE TABLE error_patterns (
        id TEXT PRIMARY KEY DEFAULT 'ep_' || replace(gen_random_uuid()::text, '-', ''),
        name VARCHAR(255) NOT NULL,
        description TEXT,
        error_type VARCHAR(50) NOT NULL,
        message_pattern TEXT NOT NULL,
        component_pattern VARCHAR(255),
        occurrence_count INTEGER DEFAULT 0,
        affected_users INTEGER DEFAULT 0,
        first_seen TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        last_seen TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        severity VARCHAR(20) DEFAULT 'medium',
        impact_score DECIMAL(5, 2) DEFAULT 0,
        status VARCHAR(30) DEFAULT 'active',
        resolution TEXT,
        auto_healing_action_id TEXT REFERENCES auto_healing_actions(id) ON DELETE SET NULL,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    await db.query('CREATE INDEX idx_error_patterns_type ON error_patterns(error_type)');
    await db.query('CREATE INDEX idx_error_patterns_status ON error_patterns(status)');
    await db.query('CREATE INDEX idx_error_patterns_impact ON error_patterns(impact_score)');
    await db.query('CREATE INDEX idx_error_patterns_type_status ON error_patterns(error_type, status)');

    log.info('error_patterns table created');
  }

  // ============================================
  // FRONTEND ERRORS TABLE
  // ============================================

  if (!(await tableExists('frontend_errors'))) {
    log.info('Creating frontend_errors table...');
    await db.query(`
      CREATE TABLE frontend_errors (
        id TEXT PRIMARY KEY DEFAULT 'fe_' || replace(gen_random_uuid()::text, '-', ''),
        user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
        error_type VARCHAR(50) NOT NULL,
        message TEXT NOT NULL,
        stack TEXT,
        component_name VARCHAR(255),
        http_status INTEGER,
        url TEXT NOT NULL,
        user_agent TEXT,
        context JSONB DEFAULT '{}',
        severity VARCHAR(20) DEFAULT 'medium',
        pattern_id TEXT REFERENCES error_patterns(id) ON DELETE SET NULL,
        is_known_issue BOOLEAN DEFAULT FALSE,
        status VARCHAR(30) DEFAULT 'new',
        resolution_notes TEXT,
        error_at TIMESTAMPTZ NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        resolved_at TIMESTAMPTZ
      )
    `);

    await db.query('CREATE INDEX idx_frontend_errors_type ON frontend_errors(error_type)');
    await db.query('CREATE INDEX idx_frontend_errors_status ON frontend_errors(status)');
    await db.query('CREATE INDEX idx_frontend_errors_user ON frontend_errors(user_id)');
    await db.query('CREATE INDEX idx_frontend_errors_at ON frontend_errors(error_at)');
    await db.query('CREATE INDEX idx_frontend_errors_type_status ON frontend_errors(error_type, status)');
    await db.query('CREATE INDEX idx_frontend_errors_keyset ON frontend_errors(created_at DESC, id DESC)');

    log.info('frontend_errors table created');
  }

  // ============================================
  // ERROR RESOLUTIONS TABLE
  // ============================================

  if (!(await tableExists('error_resolutions'))) {
    log.info('Creating error_resolutions table...');
    await db.query(`
      CREATE TABLE error_resolutions (
        id TEXT PRIMARY KEY DEFAULT 'er_' || replace(gen_random_uuid()::text, '-', ''),
        error_id TEXT NOT NULL REFERENCES frontend_errors(id) ON DELETE CASCADE,
        pattern_id TEXT REFERENCES error_patterns(id) ON DELETE SET NULL,
        resolution_type VARCHAR(50) NOT NULL,
        description TEXT,
        action_id TEXT REFERENCES auto_healing_actions(id) ON DELETE SET NULL,
        was_successful BOOLEAN DEFAULT TRUE,
        time_to_resolve_ms INTEGER,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    await db.query('CREATE INDEX idx_error_resolutions_error ON error_resolutions(error_id)');
    await db.query('CREATE INDEX idx_error_resolutions_pattern ON error_resolutions(pattern_id)');
    await db.query('CREATE INDEX idx_error_resolutions_type ON error_resolutions(resolution_type)');

    log.info('error_resolutions table created');
  }

  // ============================================
  // AUTO-HEALING EXECUTIONS LOG
  // ============================================

  if (!(await tableExists('auto_healing_executions'))) {
    log.info('Creating auto_healing_executions table...');
    await db.query(`
      CREATE TABLE auto_healing_executions (
        id TEXT PRIMARY KEY DEFAULT 'ahe_' || replace(gen_random_uuid()::text, '-', ''),
        action_id TEXT NOT NULL REFERENCES auto_healing_actions(id) ON DELETE CASCADE,
        triggered_by_error_id TEXT REFERENCES frontend_errors(id) ON DELETE SET NULL,
        triggered_by_pattern_id TEXT REFERENCES error_patterns(id) ON DELETE SET NULL,
        status VARCHAR(30) NOT NULL,
        output TEXT,
        error_message TEXT,
        started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        completed_at TIMESTAMPTZ,
        duration_ms INTEGER
      )
    `);

    await db.query('CREATE INDEX idx_auto_healing_exec_action ON auto_healing_executions(action_id)');
    await db.query('CREATE INDEX idx_auto_healing_exec_status ON auto_healing_executions(status)');
    await db.query('CREATE INDEX idx_auto_healing_exec_started ON auto_healing_executions(started_at)');

    log.info('auto_healing_executions table created');
  }

  // ============================================
  // MATERIALIZED VIEW FOR STATS
  // ============================================

  const mvExists = await db.queryOne<{ count: string }>(
    `SELECT COUNT(*) as count FROM pg_matviews WHERE matviewname = 'mv_error_stats'`,
    []
  );

  if (parseInt(mvExists?.count || '0') === 0) {
    log.info('Creating mv_error_stats materialized view...');
    await db.query(`
      CREATE MATERIALIZED VIEW mv_error_stats AS
      SELECT
        error_type,
        DATE_TRUNC('hour', error_at) as hour,
        COUNT(*) as error_count,
        COUNT(DISTINCT user_id) as affected_users,
        COUNT(*) FILTER (WHERE status = 'resolved') as resolved_count
      FROM frontend_errors
      WHERE error_at > NOW() - INTERVAL '7 days'
      GROUP BY error_type, DATE_TRUNC('hour', error_at)
      ORDER BY hour DESC
    `);

    await db.query(`
      CREATE UNIQUE INDEX idx_mv_error_stats_unique
      ON mv_error_stats(error_type, hour)
    `);

    log.info('mv_error_stats materialized view created');
  }

  // ============================================
  // REFRESH FUNCTION
  // ============================================

  await db.query(`
    CREATE OR REPLACE FUNCTION refresh_error_stats()
    RETURNS void AS $$
    BEGIN
      REFRESH MATERIALIZED VIEW CONCURRENTLY mv_error_stats;
    END;
    $$ LANGUAGE plpgsql
  `);

  log.info('Migration 117_error_tracking_system completed successfully');
}

export async function down(): Promise<void> {
  log.info('Rolling back migration: 117_error_tracking_system');

  await db.query('DROP FUNCTION IF EXISTS refresh_error_stats()');
  await db.query('DROP MATERIALIZED VIEW IF EXISTS mv_error_stats');
  await db.query('DROP TABLE IF EXISTS auto_healing_executions CASCADE');
  await db.query('DROP TABLE IF EXISTS error_resolutions CASCADE');
  await db.query('DROP TABLE IF EXISTS frontend_errors CASCADE');
  await db.query('DROP TABLE IF EXISTS error_patterns CASCADE');
  await db.query('DROP TABLE IF EXISTS auto_healing_actions CASCADE');

  log.info('Migration 117_error_tracking_system rolled back');
}
