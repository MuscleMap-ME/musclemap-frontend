/**
 * Migration: Performance Optimization Phase 1
 *
 * Quick wins for immediate performance improvement:
 * 1. Automated materialized view refresh scheduling
 * 2. Activity events composite index for user + event_type queries
 * 3. Conversation participant lookup index
 * 4. Exercise activation reverse lookup index (muscle -> exercises)
 *
 * See docs/DATABASE-OPTIMIZATION-PLAN.md for full optimization roadmap.
 */

import { db } from '../client';
import { loggers } from '../../lib/logger';

const log = loggers.db;

async function indexExists(indexName: string): Promise<boolean> {
  const result = await db.queryOne<{ count: string }>(
    `SELECT COUNT(*) as count FROM pg_indexes WHERE indexname = $1`,
    [indexName]
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

async function _functionExists(funcName: string): Promise<boolean> {
  const result = await db.queryOne<{ count: string }>(
    `SELECT COUNT(*) as count FROM pg_proc WHERE proname = $1`,
    [funcName]
  );
  return parseInt(result?.count || '0') > 0;
}

async function createIndexIfNotExists(
  indexName: string,
  createStatement: string
): Promise<void> {
  if (await indexExists(indexName)) {
    log.debug(`Index ${indexName} already exists, skipping`);
    return;
  }
  log.info(`Creating index: ${indexName}`);
  await db.query(createStatement);
}

export async function up(): Promise<void> {
  log.info('Running migration: 059_performance_optimization_phase1');

  // ============================================
  // 1. ACTIVITY EVENTS COMPOSITE INDEX
  // ============================================
  // Optimizes queries for: user + event_type + time (common activity feed filter)
  if (await tableExists('activity_events')) {
    await createIndexIfNotExists(
      'idx_activity_events_user_type_keyset',
      `CREATE INDEX idx_activity_events_user_type_keyset
       ON activity_events(user_id, event_type, created_at DESC, id DESC)`
    );

    // Partial index for public events only (feed queries)
    await createIndexIfNotExists(
      'idx_activity_events_public_feed',
      `CREATE INDEX idx_activity_events_public_feed
       ON activity_events(created_at DESC, id DESC)
       WHERE visibility_scope IN ('public_anon', 'public_profile')`
    );
  }

  // ============================================
  // 2. CONVERSATION PARTICIPANT LOOKUP INDEX
  // ============================================
  // Optimizes: "Get all conversations for user" inbox queries
  if (await tableExists('conversation_participants')) {
    await createIndexIfNotExists(
      'idx_conversation_participants_user_unread',
      `CREATE INDEX idx_conversation_participants_user_unread
       ON conversation_participants(user_id, last_read_at)
       INCLUDE (conversation_id, muted)`
    );

    // Index for unread message count queries
    await createIndexIfNotExists(
      'idx_conversation_participants_unread_filter',
      `CREATE INDEX idx_conversation_participants_unread_filter
       ON conversation_participants(user_id, conversation_id)
       WHERE muted = FALSE`
    );
  }

  // ============================================
  // 3. EXERCISE ACTIVATION REVERSE LOOKUP
  // ============================================
  // Optimizes: "Which exercises work this muscle?" (prescription engine)
  if (await tableExists('exercise_activations')) {
    await createIndexIfNotExists(
      'idx_exercise_activations_muscle_reverse',
      `CREATE INDEX idx_exercise_activations_muscle_reverse
       ON exercise_activations(muscle_id, activation DESC)
       INCLUDE (exercise_id)`
    );
  }

  // Also check exercise_muscles table (alternate name)
  if (await tableExists('exercise_muscles')) {
    await createIndexIfNotExists(
      'idx_exercise_muscles_muscle_reverse',
      `CREATE INDEX idx_exercise_muscles_muscle_reverse
       ON exercise_muscles(muscle_id, activation DESC)
       INCLUDE (exercise_id)`
    );
  }

  // ============================================
  // 4. MATERIALIZED VIEW REFRESH TRACKING
  // ============================================
  // Create a table to track last refresh times for monitoring
  if (!(await tableExists('matview_refresh_log'))) {
    log.info('Creating matview_refresh_log table...');
    await db.query(`
      CREATE TABLE matview_refresh_log (
        view_name TEXT PRIMARY KEY,
        last_refresh_at TIMESTAMPTZ DEFAULT NOW(),
        refresh_duration_ms INTEGER,
        rows_count INTEGER,
        error_message TEXT
      )
    `);
  }

  // ============================================
  // 5. UPDATE REFRESH FUNCTION WITH LOGGING
  // ============================================
  log.info('Creating enhanced refresh_xp_rankings_with_log function...');
  await db.query(`
    CREATE OR REPLACE FUNCTION refresh_xp_rankings_with_log()
    RETURNS void AS $$
    DECLARE
      start_time TIMESTAMPTZ;
      duration_ms INTEGER;
      row_count INTEGER;
    BEGIN
      start_time := clock_timestamp();

      -- Refresh the materialized view
      REFRESH MATERIALIZED VIEW CONCURRENTLY mv_xp_rankings;

      -- Calculate duration
      duration_ms := EXTRACT(MILLISECONDS FROM (clock_timestamp() - start_time))::INTEGER;

      -- Get row count
      SELECT COUNT(*) INTO row_count FROM mv_xp_rankings;

      -- Log the refresh
      INSERT INTO matview_refresh_log (view_name, last_refresh_at, refresh_duration_ms, rows_count)
      VALUES ('mv_xp_rankings', NOW(), duration_ms, row_count)
      ON CONFLICT (view_name)
      DO UPDATE SET
        last_refresh_at = EXCLUDED.last_refresh_at,
        refresh_duration_ms = EXCLUDED.refresh_duration_ms,
        rows_count = EXCLUDED.rows_count,
        error_message = NULL;

    EXCEPTION WHEN OTHERS THEN
      -- Log the error
      INSERT INTO matview_refresh_log (view_name, last_refresh_at, error_message)
      VALUES ('mv_xp_rankings', NOW(), SQLERRM)
      ON CONFLICT (view_name)
      DO UPDATE SET
        last_refresh_at = EXCLUDED.last_refresh_at,
        error_message = EXCLUDED.error_message;
      RAISE;
    END;
    $$ LANGUAGE plpgsql;
  `);

  // ============================================
  // 6. CREATE HELPER FUNCTION FOR MATVIEW STATUS
  // ============================================
  log.info('Creating get_matview_status function...');
  await db.query(`
    CREATE OR REPLACE FUNCTION get_matview_status(p_view_name TEXT)
    RETURNS TABLE (
      view_name TEXT,
      last_refresh_at TIMESTAMPTZ,
      seconds_since_refresh NUMERIC,
      is_stale BOOLEAN,
      refresh_duration_ms INTEGER,
      rows_count INTEGER,
      error_message TEXT
    ) AS $$
    BEGIN
      RETURN QUERY
      SELECT
        mrl.view_name,
        mrl.last_refresh_at,
        EXTRACT(EPOCH FROM (NOW() - mrl.last_refresh_at))::NUMERIC as seconds_since_refresh,
        (NOW() - mrl.last_refresh_at) > INTERVAL '5 minutes' as is_stale,
        mrl.refresh_duration_ms,
        mrl.rows_count,
        mrl.error_message
      FROM matview_refresh_log mrl
      WHERE mrl.view_name = p_view_name;
    END;
    $$ LANGUAGE plpgsql;
  `);

  // ============================================
  // ANALYZE TABLES
  // ============================================
  log.info('Analyzing tables...');
  const tables = [
    'activity_events',
    'conversation_participants',
    'exercise_activations',
    'exercise_muscles',
  ];

  for (const table of tables) {
    if (await tableExists(table)) {
      try {
        await db.query(`ANALYZE ${table}`);
        log.debug(`Analyzed table: ${table}`);
      } catch {
        log.debug(`Could not analyze ${table}`);
      }
    }
  }

  log.info('Migration 059_performance_optimization_phase1 complete');
}

export async function down(): Promise<void> {
  log.info('Rolling back migration: 059_performance_optimization_phase1');

  // Drop functions
  await db.query('DROP FUNCTION IF EXISTS get_matview_status(TEXT)');
  await db.query('DROP FUNCTION IF EXISTS refresh_xp_rankings_with_log()');

  // Drop tracking table
  await db.query('DROP TABLE IF EXISTS matview_refresh_log CASCADE');

  // Drop indexes
  const indexes = [
    'idx_activity_events_user_type_keyset',
    'idx_activity_events_public_feed',
    'idx_conversation_participants_user_unread',
    'idx_conversation_participants_unread_filter',
    'idx_exercise_activations_muscle_reverse',
    'idx_exercise_muscles_muscle_reverse',
  ];

  for (const idx of indexes) {
    await db.query(`DROP INDEX IF EXISTS ${idx}`);
  }

  log.info('Rollback 059_performance_optimization_phase1 complete');
}

export const migrate = up;
