// DESTRUCTIVE: Schema modification for data retention policies - contains DROP/TRUNCATE operations
/**
 * Migration: Data Retention Policies and Cleanup Functions
 *
 * Implements data lifecycle management:
 * 1. Cleanup function for tracked_errors (30 days for resolved)
 * 2. Cleanup function for request_logs (7 days)
 * 3. Cleanup function for old notifications (90 days for read)
 * 4. Cleanup function for expired sessions/tokens
 * 5. Master cleanup function that runs all policies
 * 6. Retention policy tracking table
 *
 * See docs/DATABASE-OPTIMIZATION-PLAN.md for full optimization roadmap.
 */

import { db } from '../client';
import { loggers } from '../../lib/logger';

const log = loggers.db;

async function _tableExists(tableName: string): Promise<boolean> {
  const result = await db.queryOne<{ count: string }>(
    `SELECT COUNT(*) as count FROM information_schema.tables
     WHERE table_schema = 'public' AND table_name = $1`,
    [tableName]
  );
  return parseInt(result?.count || '0') > 0;
}

export async function up(): Promise<void> {
  log.info('Running migration: 062_data_retention_policies');

  // ============================================
  // 1. CREATE RETENTION POLICY TRACKING TABLE
  // ============================================
  log.info('Creating data_retention_policies table...');
  await db.query(`
    CREATE TABLE IF NOT EXISTS data_retention_policies (
      id SERIAL PRIMARY KEY,
      policy_name TEXT UNIQUE NOT NULL,
      target_table TEXT NOT NULL,
      retention_days INTEGER NOT NULL,
      condition_sql TEXT,
      enabled BOOLEAN DEFAULT TRUE,
      last_run_at TIMESTAMPTZ,
      last_deleted_count INTEGER DEFAULT 0,
      description TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  // Seed default policies
  const policies = [
    {
      name: 'tracked_errors_resolved',
      table: 'tracked_errors',
      days: 30,
      condition: "resolved = TRUE",
      desc: 'Delete resolved errors after 30 days'
    },
    {
      name: 'tracked_errors_all',
      table: 'tracked_errors',
      days: 90,
      condition: null,
      desc: 'Delete all errors after 90 days regardless of status'
    },
    {
      name: 'request_logs',
      table: 'request_logs',
      days: 7,
      condition: null,
      desc: 'Delete request logs after 7 days'
    },
    {
      name: 'notifications_read',
      table: 'notifications',
      days: 90,
      condition: "read_at IS NOT NULL",
      desc: 'Delete read notifications after 90 days'
    },
    {
      name: 'notifications_all',
      table: 'notifications',
      days: 180,
      condition: null,
      desc: 'Delete all notifications after 180 days'
    },
    {
      name: 'activity_events_old',
      table: 'activity_events',
      days: 365,
      condition: null,
      desc: 'Delete activity events older than 1 year'
    },
    {
      name: 'xp_history_old',
      table: 'xp_history',
      days: 365,
      condition: null,
      desc: 'Delete XP history older than 1 year (keep ledger, remove audit trail)'
    },
  ];

  for (const p of policies) {
    await db.query(
      `INSERT INTO data_retention_policies (policy_name, target_table, retention_days, condition_sql, description)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (policy_name) DO NOTHING`,
      [p.name, p.table, p.days, p.condition, p.desc]
    );
  }

  // ============================================
  // 2. CREATE CLEANUP EXECUTION LOG TABLE
  // ============================================
  log.info('Creating cleanup_execution_log table...');
  await db.query(`
    CREATE TABLE IF NOT EXISTS cleanup_execution_log (
      id SERIAL PRIMARY KEY,
      policy_name TEXT NOT NULL,
      started_at TIMESTAMPTZ DEFAULT NOW(),
      completed_at TIMESTAMPTZ,
      deleted_count INTEGER DEFAULT 0,
      error_message TEXT,
      duration_ms INTEGER
    )
  `);

  // Index for querying recent executions
  await db.query(`
    CREATE INDEX IF NOT EXISTS idx_cleanup_log_started
    ON cleanup_execution_log(started_at DESC)
  `);

  // ============================================
  // 3. CREATE CLEANUP FUNCTION FOR SINGLE POLICY
  // ============================================
  log.info('Creating execute_retention_policy function...');
  await db.query(`
    CREATE OR REPLACE FUNCTION execute_retention_policy(p_policy_name TEXT)
    RETURNS INTEGER AS $$
    DECLARE
      v_table TEXT;
      v_days INTEGER;
      v_condition TEXT;
      v_sql TEXT;
      v_deleted INTEGER;
      v_start TIMESTAMPTZ;
      v_duration INTEGER;
    BEGIN
      v_start := clock_timestamp();

      -- Get policy details
      SELECT target_table, retention_days, condition_sql
      INTO v_table, v_days, v_condition
      FROM data_retention_policies
      WHERE policy_name = p_policy_name AND enabled = TRUE;

      IF v_table IS NULL THEN
        RAISE NOTICE 'Policy % not found or disabled', p_policy_name;
        RETURN 0;
      END IF;

      -- Build and execute DELETE statement
      v_sql := format(
        'DELETE FROM %I WHERE created_at < NOW() - INTERVAL ''%s days''',
        v_table, v_days
      );

      IF v_condition IS NOT NULL THEN
        v_sql := v_sql || ' AND ' || v_condition;
      END IF;

      EXECUTE v_sql;
      GET DIAGNOSTICS v_deleted = ROW_COUNT;

      v_duration := EXTRACT(MILLISECONDS FROM (clock_timestamp() - v_start))::INTEGER;

      -- Log execution
      INSERT INTO cleanup_execution_log (policy_name, completed_at, deleted_count, duration_ms)
      VALUES (p_policy_name, NOW(), v_deleted, v_duration);

      -- Update policy last run
      UPDATE data_retention_policies
      SET last_run_at = NOW(), last_deleted_count = v_deleted
      WHERE policy_name = p_policy_name;

      RETURN v_deleted;

    EXCEPTION WHEN OTHERS THEN
      -- Log error
      INSERT INTO cleanup_execution_log (policy_name, completed_at, error_message)
      VALUES (p_policy_name, NOW(), SQLERRM);
      RAISE NOTICE 'Error executing policy %: %', p_policy_name, SQLERRM;
      RETURN -1;
    END;
    $$ LANGUAGE plpgsql;
  `);

  // ============================================
  // 4. CREATE MASTER CLEANUP FUNCTION
  // ============================================
  log.info('Creating run_all_retention_policies function...');
  await db.query(`
    CREATE OR REPLACE FUNCTION run_all_retention_policies()
    RETURNS TABLE (
      policy_name TEXT,
      deleted_count INTEGER,
      success BOOLEAN
    ) AS $$
    DECLARE
      v_policy RECORD;
      v_deleted INTEGER;
    BEGIN
      FOR v_policy IN
        SELECT drp.policy_name
        FROM data_retention_policies drp
        WHERE drp.enabled = TRUE
        ORDER BY drp.policy_name
      LOOP
        BEGIN
          v_deleted := execute_retention_policy(v_policy.policy_name);
          policy_name := v_policy.policy_name;
          deleted_count := v_deleted;
          success := v_deleted >= 0;
          RETURN NEXT;
        EXCEPTION WHEN OTHERS THEN
          policy_name := v_policy.policy_name;
          deleted_count := -1;
          success := FALSE;
          RETURN NEXT;
        END;
      END LOOP;
    END;
    $$ LANGUAGE plpgsql;
  `);

  // ============================================
  // 5. CREATE HELPER FUNCTION FOR STATUS
  // ============================================
  log.info('Creating get_retention_status function...');
  await db.query(`
    CREATE OR REPLACE FUNCTION get_retention_status()
    RETURNS TABLE (
      policy_name TEXT,
      target_table TEXT,
      retention_days INTEGER,
      enabled BOOLEAN,
      last_run_at TIMESTAMPTZ,
      hours_since_last_run NUMERIC,
      last_deleted_count INTEGER,
      estimated_deletable BIGINT
    ) AS $$
    BEGIN
      RETURN QUERY
      SELECT
        drp.policy_name,
        drp.target_table,
        drp.retention_days,
        drp.enabled,
        drp.last_run_at,
        EXTRACT(EPOCH FROM (NOW() - drp.last_run_at)) / 3600 as hours_since_last_run,
        drp.last_deleted_count,
        0::BIGINT as estimated_deletable  -- Placeholder, expensive to calculate
      FROM data_retention_policies drp
      ORDER BY drp.policy_name;
    END;
    $$ LANGUAGE plpgsql;
  `);

  // ============================================
  // 6. CREATE VACUUM HELPER FUNCTION
  // ============================================
  log.info('Creating vacuum_after_cleanup function...');
  await db.query(`
    CREATE OR REPLACE FUNCTION vacuum_after_cleanup(p_table TEXT)
    RETURNS void AS $$
    BEGIN
      -- Note: VACUUM cannot run inside a transaction block
      -- This function is meant to be called separately after cleanup
      EXECUTE format('ANALYZE %I', p_table);
    END;
    $$ LANGUAGE plpgsql;
  `);

  // ============================================
  // 7. CREATE CLEANUP LOG RETENTION (META CLEANUP)
  // ============================================
  log.info('Creating cleanup_old_execution_logs function...');
  await db.query(`
    CREATE OR REPLACE FUNCTION cleanup_old_execution_logs()
    RETURNS INTEGER AS $$
    DECLARE
      v_deleted INTEGER;
    BEGIN
      -- Keep execution logs for 30 days
      DELETE FROM cleanup_execution_log
      WHERE started_at < NOW() - INTERVAL '30 days';

      GET DIAGNOSTICS v_deleted = ROW_COUNT;
      RETURN v_deleted;
    END;
    $$ LANGUAGE plpgsql;
  `);

  log.info('Migration 062_data_retention_policies complete');
}

export async function down(): Promise<void> {
  log.info('Rolling back migration: 062_data_retention_policies');

  // Drop functions
  await db.query('DROP FUNCTION IF EXISTS cleanup_old_execution_logs()');
  await db.query('DROP FUNCTION IF EXISTS vacuum_after_cleanup(TEXT)');
  await db.query('DROP FUNCTION IF EXISTS get_retention_status()');
  await db.query('DROP FUNCTION IF EXISTS run_all_retention_policies()');
  await db.query('DROP FUNCTION IF EXISTS execute_retention_policy(TEXT)');

  // Drop tables
  await db.query('DROP TABLE IF EXISTS cleanup_execution_log CASCADE');
  await db.query('DROP TABLE IF EXISTS data_retention_policies CASCADE');

  log.info('Rollback 062_data_retention_policies complete');
}

export const migrate = up;
