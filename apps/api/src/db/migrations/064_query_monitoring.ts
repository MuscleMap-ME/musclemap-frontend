/**
 * Migration: Query Monitoring and Performance Views
 *
 * Creates monitoring infrastructure:
 * 1. Views for slow query identification
 * 2. Index usage monitoring
 * 3. Table bloat detection
 * 4. Database health dashboard view
 * 5. Helper functions for EXPLAIN ANALYZE
 *
 * Note: pg_stat_statements extension must be enabled by superuser.
 * If not available, some views will return empty results.
 *
 * See docs/DATABASE-OPTIMIZATION-PLAN.md for full optimization roadmap.
 */

import { db } from '../client';
import { loggers } from '../../lib/logger';

const log = loggers.db;

async function extensionExists(extName: string): Promise<boolean> {
  const result = await db.queryOne<{ count: string }>(
    `SELECT COUNT(*) as count FROM pg_extension WHERE extname = $1`,
    [extName]
  );
  return parseInt(result?.count || '0') > 0;
}

export async function up(): Promise<void> {
  log.info('Running migration: 064_query_monitoring');

  // ============================================
  // 1. TRY TO ENABLE PG_STAT_STATEMENTS
  // ============================================
  // This requires superuser privileges, so we catch the error if it fails
  try {
    await db.query('CREATE EXTENSION IF NOT EXISTS pg_stat_statements');
    log.info('pg_stat_statements extension enabled');
  } catch {
    log.warn('Could not enable pg_stat_statements - requires superuser. Slow query monitoring will be limited.');
  }

  // ============================================
  // 2. CREATE SLOW QUERIES VIEW
  // ============================================
  log.info('Creating slow_queries_view...');
  if (await extensionExists('pg_stat_statements')) {
    await db.query(`
      CREATE OR REPLACE VIEW slow_queries_view AS
      SELECT
        queryid,
        LEFT(query, 200) as query_preview,
        calls,
        ROUND((total_exec_time / 1000)::numeric, 2) as total_seconds,
        ROUND(mean_exec_time::numeric, 2) as avg_ms,
        ROUND(max_exec_time::numeric, 2) as max_ms,
        ROUND(stddev_exec_time::numeric, 2) as stddev_ms,
        rows,
        ROUND((shared_blks_hit::numeric / NULLIF(shared_blks_hit + shared_blks_read, 0) * 100), 2) as cache_hit_pct
      FROM pg_stat_statements
      WHERE mean_exec_time > 50  -- Queries averaging > 50ms
        AND calls > 10           -- Called at least 10 times
      ORDER BY total_exec_time DESC
      LIMIT 50
    `);
  } else {
    // Create a placeholder view that returns no results
    await db.query(`
      CREATE OR REPLACE VIEW slow_queries_view AS
      SELECT
        0::bigint as queryid,
        'pg_stat_statements not enabled'::text as query_preview,
        0::bigint as calls,
        0::numeric as total_seconds,
        0::numeric as avg_ms,
        0::numeric as max_ms,
        0::numeric as stddev_ms,
        0::bigint as rows,
        0::numeric as cache_hit_pct
      WHERE FALSE
    `);
  }

  // ============================================
  // 3. CREATE UNUSED INDEXES VIEW
  // ============================================
  log.info('Creating unused_indexes_view...');
  await db.query(`
    CREATE OR REPLACE VIEW unused_indexes_view AS
    SELECT
      schemaname || '.' || relname as table_name,
      indexrelname as index_name,
      pg_size_pretty(pg_relation_size(i.indexrelid)) as index_size,
      pg_relation_size(i.indexrelid) as index_size_bytes,
      idx_scan as total_scans,
      idx_tup_read as tuples_read,
      idx_tup_fetch as tuples_fetched
    FROM pg_stat_user_indexes ui
    JOIN pg_index i ON ui.indexrelid = i.indexrelid
    WHERE
      idx_scan < 100                           -- Fewer than 100 scans
      AND pg_relation_size(i.indexrelid) > 1024 * 1024  -- Larger than 1MB
      AND NOT indisunique                       -- Not a unique constraint
      AND NOT indisprimary                      -- Not a primary key
    ORDER BY pg_relation_size(i.indexrelid) DESC
  `);

  // ============================================
  // 4. CREATE INDEX USAGE SUMMARY VIEW
  // ============================================
  log.info('Creating index_usage_summary_view...');
  await db.query(`
    CREATE OR REPLACE VIEW index_usage_summary_view AS
    SELECT
      relname as table_name,
      indexrelname as index_name,
      idx_scan as scans,
      idx_tup_read as tuples_read,
      idx_tup_fetch as tuples_fetched,
      pg_size_pretty(pg_relation_size(indexrelid)) as size,
      CASE
        WHEN idx_scan = 0 THEN 'UNUSED'
        WHEN idx_scan < 100 THEN 'LOW_USE'
        WHEN idx_scan < 1000 THEN 'MODERATE'
        ELSE 'HIGH_USE'
      END as usage_category
    FROM pg_stat_user_indexes
    ORDER BY idx_scan DESC
  `);

  // ============================================
  // 5. CREATE TABLE STATS VIEW
  // ============================================
  log.info('Creating table_stats_view...');
  await db.query(`
    CREATE OR REPLACE VIEW table_stats_view AS
    SELECT
      schemaname,
      relname as table_name,
      pg_size_pretty(pg_total_relation_size(relid)) as total_size,
      pg_total_relation_size(relid) as total_size_bytes,
      pg_size_pretty(pg_relation_size(relid)) as table_size,
      pg_size_pretty(pg_indexes_size(relid)) as indexes_size,
      n_live_tup as live_rows,
      n_dead_tup as dead_rows,
      ROUND(100.0 * n_dead_tup / NULLIF(n_live_tup + n_dead_tup, 0), 2) as dead_row_pct,
      last_vacuum,
      last_autovacuum,
      last_analyze,
      last_autoanalyze,
      seq_scan,
      seq_tup_read,
      idx_scan,
      idx_tup_fetch
    FROM pg_stat_user_tables
    ORDER BY pg_total_relation_size(relid) DESC
  `);

  // ============================================
  // 6. CREATE SEQUENTIAL SCAN OFFENDERS VIEW
  // ============================================
  log.info('Creating sequential_scan_offenders_view...');
  await db.query(`
    CREATE OR REPLACE VIEW sequential_scan_offenders_view AS
    SELECT
      relname as table_name,
      seq_scan,
      seq_tup_read,
      idx_scan,
      CASE
        WHEN idx_scan = 0 THEN 100
        ELSE ROUND(100.0 * seq_scan / (seq_scan + idx_scan), 2)
      END as seq_scan_pct,
      pg_size_pretty(pg_relation_size(relid)) as table_size,
      n_live_tup as rows
    FROM pg_stat_user_tables
    WHERE seq_scan > 1000
      AND n_live_tup > 10000
    ORDER BY seq_scan DESC
  `);

  // ============================================
  // 7. CREATE DATABASE HEALTH DASHBOARD VIEW
  // ============================================
  log.info('Creating database_health_view...');
  await db.query(`
    CREATE OR REPLACE VIEW database_health_view AS
    SELECT
      -- Connection stats
      (SELECT count(*) FROM pg_stat_activity) as active_connections,
      (SELECT count(*) FROM pg_stat_activity WHERE state = 'active') as running_queries,
      (SELECT count(*) FROM pg_stat_activity WHERE state = 'idle in transaction') as idle_in_transaction,

      -- Cache stats
      (SELECT ROUND(100.0 * sum(heap_blks_hit) / NULLIF(sum(heap_blks_hit) + sum(heap_blks_read), 0), 2)
       FROM pg_statio_user_tables) as cache_hit_ratio,

      -- Database size
      pg_size_pretty(pg_database_size(current_database())) as database_size,
      pg_database_size(current_database()) as database_size_bytes,

      -- Table counts
      (SELECT count(*) FROM pg_stat_user_tables) as table_count,
      (SELECT count(*) FROM pg_stat_user_indexes) as index_count,

      -- Bloat indicators
      (SELECT count(*) FROM pg_stat_user_tables WHERE n_dead_tup > 10000) as tables_needing_vacuum,
      (SELECT SUM(n_dead_tup) FROM pg_stat_user_tables) as total_dead_tuples,

      -- Timestamp
      NOW() as snapshot_at
  `);

  // ============================================
  // 8. CREATE LOCK MONITORING VIEW
  // ============================================
  log.info('Creating lock_monitoring_view...');
  await db.query(`
    CREATE OR REPLACE VIEW lock_monitoring_view AS
    SELECT
      pg_locks.pid,
      pg_stat_activity.usename,
      pg_locks.locktype,
      pg_locks.mode,
      pg_locks.granted,
      pg_stat_activity.query_start,
      NOW() - pg_stat_activity.query_start as duration,
      LEFT(pg_stat_activity.query, 100) as query_preview
    FROM pg_locks
    JOIN pg_stat_activity ON pg_locks.pid = pg_stat_activity.pid
    WHERE pg_stat_activity.datname = current_database()
      AND pg_locks.granted = false
    ORDER BY pg_stat_activity.query_start
  `);

  // ============================================
  // 9. CREATE HELPER FUNCTION FOR QUERY ANALYSIS
  // ============================================
  log.info('Creating analyze_query_plan function...');
  await db.query(`
    CREATE OR REPLACE FUNCTION analyze_query_plan(p_query TEXT)
    RETURNS TABLE (
      plan_line TEXT
    ) AS $$
    BEGIN
      -- This function wraps EXPLAIN ANALYZE for safe execution
      -- Note: The query is executed, so use with caution on write queries
      RETURN QUERY EXECUTE 'EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT) ' || p_query;
    EXCEPTION WHEN OTHERS THEN
      plan_line := 'Error analyzing query: ' || SQLERRM;
      RETURN NEXT;
    END;
    $$ LANGUAGE plpgsql;
  `);

  // ============================================
  // 10. CREATE PERFORMANCE METRICS TABLE
  // ============================================
  log.info('Creating performance_snapshots table...');
  await db.query(`
    CREATE TABLE IF NOT EXISTS performance_snapshots (
      id SERIAL PRIMARY KEY,
      snapshot_at TIMESTAMPTZ DEFAULT NOW(),
      active_connections INTEGER,
      cache_hit_ratio NUMERIC(5,2),
      database_size_bytes BIGINT,
      total_dead_tuples BIGINT,
      tables_needing_vacuum INTEGER,
      slow_queries_count INTEGER
    )
  `);

  // Index for time-based queries
  await db.query(`
    CREATE INDEX IF NOT EXISTS idx_performance_snapshots_time
    ON performance_snapshots(snapshot_at DESC)
  `);

  // ============================================
  // 11. CREATE SNAPSHOT CAPTURE FUNCTION
  // ============================================
  log.info('Creating capture_performance_snapshot function...');
  await db.query(`
    CREATE OR REPLACE FUNCTION capture_performance_snapshot()
    RETURNS void AS $$
    BEGIN
      INSERT INTO performance_snapshots (
        active_connections,
        cache_hit_ratio,
        database_size_bytes,
        total_dead_tuples,
        tables_needing_vacuum,
        slow_queries_count
      )
      SELECT
        (SELECT count(*) FROM pg_stat_activity),
        (SELECT ROUND(100.0 * sum(heap_blks_hit) / NULLIF(sum(heap_blks_hit) + sum(heap_blks_read), 0), 2)
         FROM pg_statio_user_tables),
        pg_database_size(current_database()),
        (SELECT COALESCE(SUM(n_dead_tup), 0) FROM pg_stat_user_tables),
        (SELECT count(*) FROM pg_stat_user_tables WHERE n_dead_tup > 10000),
        COALESCE((SELECT count(*) FROM slow_queries_view), 0);

      -- Keep only last 7 days of snapshots
      DELETE FROM performance_snapshots
      WHERE snapshot_at < NOW() - INTERVAL '7 days';
    END;
    $$ LANGUAGE plpgsql;
  `);

  log.info('Migration 064_query_monitoring complete');
}

export async function down(): Promise<void> {
  log.info('Rolling back migration: 064_query_monitoring');

  // Drop functions
  await db.query('DROP FUNCTION IF EXISTS capture_performance_snapshot()');
  await db.query('DROP FUNCTION IF EXISTS analyze_query_plan(TEXT)');

  // Drop table
  await db.query('DROP TABLE IF EXISTS performance_snapshots CASCADE');

  // Drop views
  const views = [
    'lock_monitoring_view',
    'database_health_view',
    'sequential_scan_offenders_view',
    'table_stats_view',
    'index_usage_summary_view',
    'unused_indexes_view',
    'slow_queries_view',
  ];

  for (const view of views) {
    await db.query(`DROP VIEW IF EXISTS ${view}`);
  }

  log.info('Rollback 064_query_monitoring complete');
}

export const migrate = up;
