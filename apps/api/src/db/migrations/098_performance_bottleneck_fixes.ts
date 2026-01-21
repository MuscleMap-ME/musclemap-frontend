// DESTRUCTIVE: Schema modification for performance bottleneck fixes - contains DROP/TRUNCATE operations
// SQL-SAFE: Template literals contain static SQL only, no external input
/**
 * Migration: Performance Bottleneck Fixes
 *
 * Addresses 5 critical performance issues:
 *
 * PERF-001: GET /api/leaderboard (~500ms → <100ms)
 * - Covering index for leaderboard entries with INCLUDE clause
 * - Index for keyset pagination on leaderboard_entries
 * - Materialized view for frequently accessed leaderboards
 *
 * PERF-002: GET /api/community/feed (~800ms → <200ms)
 * - Optimized composite index for activity_events feed queries
 * - Index for privacy mode filtering (NOT EXISTS optimization)
 *
 * PERF-003: POST /api/workout (~300ms → <150ms)
 * - Index for exercise_activations lookup (batch optimization)
 * - Index for muscles bias_weight lookup
 *
 * PERF-004: GET /api/stats/history (~1s → <200ms)
 * - BRIN index on character_stats_history.snapshot_date
 * - Covering index for stats history queries
 *
 * PERF-005: tu_calculate (JavaScript ~20ms → <2ms)
 * - TU calculation cache table for repeated calculations
 *
 * See docs/DATABASE-OPTIMIZATION-PLAN.md for full details.
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

async function materializedViewExists(viewName: string): Promise<boolean> {
  const result = await db.queryOne<{ count: string }>(
    `SELECT COUNT(*) as count FROM pg_matviews WHERE matviewname = $1`,
    [viewName]
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
  log.info('Running migration: 097_performance_bottleneck_fixes');

  // ============================================
  // PERF-001: LEADERBOARD OPTIMIZATION
  // ============================================
  log.info('PERF-001: Creating leaderboard indexes...');

  if (await tableExists('leaderboard_entries')) {
    // Covering index for main leaderboard queries
    // Includes user_id, username from join to avoid heap lookups
    await createIndexIfNotExists(
      'idx_leaderboard_entries_covering',
      `CREATE INDEX idx_leaderboard_entries_covering
       ON leaderboard_entries (exercise_id, metric_key, period_type, period_start, value DESC)
       INCLUDE (user_id, verification_status, updated_at, hangout_id, virtual_hangout_id)`
    );

    // Keyset pagination index for leaderboards
    await createIndexIfNotExists(
      'idx_leaderboard_entries_keyset',
      `CREATE INDEX idx_leaderboard_entries_keyset
       ON leaderboard_entries (exercise_id, metric_key, period_type, period_start, value DESC, user_id)`
    );

    // Index for user's own rank lookup
    await createIndexIfNotExists(
      'idx_leaderboard_entries_user_lookup',
      `CREATE INDEX idx_leaderboard_entries_user_lookup
       ON leaderboard_entries (user_id, exercise_id, metric_key, period_type, period_start)`
    );

    // Partial index for global leaderboards (no hangout filter)
    await createIndexIfNotExists(
      'idx_leaderboard_entries_global',
      `CREATE INDEX idx_leaderboard_entries_global
       ON leaderboard_entries (exercise_id, metric_key, period_type, period_start, value DESC)
       WHERE hangout_id IS NULL AND virtual_hangout_id IS NULL`
    );
  }

  // Materialized view for top 100 global leaderboard entries (most common query)
  if (await tableExists('leaderboard_entries') && !(await materializedViewExists('mv_leaderboard_top100'))) {
    log.info('Creating mv_leaderboard_top100 materialized view...');
    await db.query(`
      CREATE MATERIALIZED VIEW mv_leaderboard_top100 AS
      WITH ranked AS (
        SELECT
          le.id,
          le.user_id,
          le.exercise_id,
          le.metric_key,
          le.period_type,
          le.period_start,
          le.value,
          le.verification_status,
          le.updated_at,
          u.username,
          u.display_name,
          u.avatar_url,
          ROW_NUMBER() OVER (
            PARTITION BY le.exercise_id, le.metric_key, le.period_type
            ORDER BY le.value DESC
          ) as rank
        FROM leaderboard_entries le
        JOIN users u ON u.id = le.user_id
        WHERE le.hangout_id IS NULL
          AND le.virtual_hangout_id IS NULL
          AND le.period_type = 'all_time'
      )
      SELECT * FROM ranked WHERE rank <= 100
    `);

    // Unique index required for CONCURRENTLY refresh
    await createIndexIfNotExists(
      'idx_mv_leaderboard_top100_unique',
      `CREATE UNIQUE INDEX idx_mv_leaderboard_top100_unique
       ON mv_leaderboard_top100 (exercise_id, metric_key, period_type, user_id)`
    );

    // Index for querying by exercise/metric
    await createIndexIfNotExists(
      'idx_mv_leaderboard_top100_lookup',
      `CREATE INDEX idx_mv_leaderboard_top100_lookup
       ON mv_leaderboard_top100 (exercise_id, metric_key, period_type, rank)`
    );
  }

  // ============================================
  // PERF-002: COMMUNITY FEED OPTIMIZATION
  // ============================================
  log.info('PERF-002: Creating community feed indexes...');

  if (await tableExists('activity_events')) {
    // Covering index for feed queries with keyset pagination
    await createIndexIfNotExists(
      'idx_activity_events_feed_covering',
      `CREATE INDEX idx_activity_events_feed_covering
       ON activity_events (created_at DESC, id DESC)
       INCLUDE (user_id, event_type, payload, visibility_scope, geo_bucket)
       WHERE visibility_scope IN ('public_anon', 'public_profile')`
    );

    // Index for privacy mode filtering (used in NOT EXISTS subquery)
    await createIndexIfNotExists(
      'idx_activity_events_user_created',
      `CREATE INDEX idx_activity_events_user_created
       ON activity_events (user_id, created_at DESC)`
    );
  }

  if (await tableExists('user_privacy_mode')) {
    // Index for privacy mode lookup (optimizes NOT EXISTS subquery)
    await createIndexIfNotExists(
      'idx_user_privacy_mode_feed_filter',
      `CREATE INDEX idx_user_privacy_mode_feed_filter
       ON user_privacy_mode (user_id)
       WHERE minimalist_mode = true OR opt_out_community_feed = true OR exclude_from_activity_feed = true`
    );
  }

  // ============================================
  // PERF-003: WORKOUT CREATION OPTIMIZATION
  // ============================================
  log.info('PERF-003: Creating workout batch query indexes...');

  if (await tableExists('exercise_activations')) {
    // Covering index for batch exercise activation lookup
    await createIndexIfNotExists(
      'idx_exercise_activations_batch_covering',
      `CREATE INDEX idx_exercise_activations_batch_covering
       ON exercise_activations (exercise_id)
       INCLUDE (muscle_id, activation)`
    );
  }

  if (await tableExists('muscles')) {
    // Index for bias weight lookup
    await createIndexIfNotExists(
      'idx_muscles_bias_covering',
      `CREATE INDEX idx_muscles_bias_covering
       ON muscles (id)
       INCLUDE (bias_weight, name)`
    );
  }

  if (await tableExists('exercises')) {
    // Index for exercise existence check in batch
    await createIndexIfNotExists(
      'idx_exercises_id_covering',
      `CREATE INDEX idx_exercises_id_covering
       ON exercises (id)
       INCLUDE (name, difficulty, is_compound)`
    );
  }

  // ============================================
  // PERF-004: STATS HISTORY OPTIMIZATION
  // ============================================
  log.info('PERF-004: Creating stats history indexes...');

  if (await tableExists('character_stats_history')) {
    // BRIN index for time-series data (much smaller than B-tree)
    await createIndexIfNotExists(
      'idx_character_stats_history_date_brin',
      `CREATE INDEX idx_character_stats_history_date_brin
       ON character_stats_history USING BRIN (snapshot_date)`
    );

    // Covering index for user stats history queries
    await createIndexIfNotExists(
      'idx_character_stats_history_user_covering',
      `CREATE INDEX idx_character_stats_history_user_covering
       ON character_stats_history (user_id, snapshot_date DESC)
       INCLUDE (strength, constitution, dexterity, power, endurance, vitality)`
    );
  }

  // ============================================
  // PERF-005: TU CALCULATION CACHE
  // ============================================
  log.info('PERF-005: Creating TU calculation cache table...');

  if (!(await tableExists('tu_calculation_cache'))) {
    await db.query(`
      CREATE TABLE tu_calculation_cache (
        cache_key TEXT PRIMARY KEY,
        total_tu NUMERIC(10, 2) NOT NULL,
        muscle_activations JSONB NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        expires_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '1 hour'
      )
    `);

    // Index for cache expiration cleanup
    await createIndexIfNotExists(
      'idx_tu_calculation_cache_expires',
      `CREATE INDEX idx_tu_calculation_cache_expires
       ON tu_calculation_cache (expires_at)`
    );
  }

  // ============================================
  // ADDITIONAL INDEXES FOR JOIN OPTIMIZATION
  // ============================================
  log.info('Creating additional join optimization indexes...');

  if (await tableExists('user_cohort_preferences')) {
    // Index for leaderboard cohort filtering
    await createIndexIfNotExists(
      'idx_user_cohort_preferences_leaderboard',
      `CREATE INDEX idx_user_cohort_preferences_leaderboard
       ON user_cohort_preferences (user_id)
       INCLUDE (gender_category, age_band, adaptive_category, gender_visible, age_visible, adaptive_visible, show_on_leaderboards)
       WHERE show_on_leaderboards IS NULL OR show_on_leaderboards = TRUE`
    );
  }

  // ============================================
  // CREATE REFRESH FUNCTION FOR MATERIALIZED VIEW
  // ============================================
  log.info('Creating materialized view refresh function...');
  await db.query(`
    CREATE OR REPLACE FUNCTION refresh_leaderboard_top100()
    RETURNS void AS $$
    BEGIN
      REFRESH MATERIALIZED VIEW CONCURRENTLY mv_leaderboard_top100;
    END;
    $$ LANGUAGE plpgsql;
  `);

  // ============================================
  // ANALYZE TABLES FOR QUERY PLANNER
  // ============================================
  log.info('Analyzing tables...');
  const tables = [
    'leaderboard_entries',
    'activity_events',
    'user_privacy_mode',
    'exercise_activations',
    'muscles',
    'exercises',
    'character_stats_history',
    'user_cohort_preferences',
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

  // Refresh materialized view
  if (await materializedViewExists('mv_leaderboard_top100')) {
    try {
      await db.query('REFRESH MATERIALIZED VIEW mv_leaderboard_top100');
      log.info('Refreshed mv_leaderboard_top100');
    } catch (_e) {
      log.warn('Could not refresh mv_leaderboard_top100 - may need data first');
    }
  }

  log.info('Migration 097_performance_bottleneck_fixes complete');
}

export async function down(): Promise<void> {
  log.info('Rolling back migration: 097_performance_bottleneck_fixes');

  // Drop function
  await db.query('DROP FUNCTION IF EXISTS refresh_leaderboard_top100()');

  // Drop materialized view
  await db.query('DROP MATERIALIZED VIEW IF EXISTS mv_leaderboard_top100 CASCADE');

  // Drop cache table
  await db.query('DROP TABLE IF EXISTS tu_calculation_cache CASCADE');

  // Drop indexes
  const indexes = [
    // PERF-001
    'idx_leaderboard_entries_covering',
    'idx_leaderboard_entries_keyset',
    'idx_leaderboard_entries_user_lookup',
    'idx_leaderboard_entries_global',
    'idx_mv_leaderboard_top100_unique',
    'idx_mv_leaderboard_top100_lookup',
    // PERF-002
    'idx_activity_events_feed_covering',
    'idx_activity_events_user_created',
    'idx_user_privacy_mode_feed_filter',
    // PERF-003
    'idx_exercise_activations_batch_covering',
    'idx_muscles_bias_covering',
    'idx_exercises_id_covering',
    // PERF-004
    'idx_character_stats_history_date_brin',
    'idx_character_stats_history_user_covering',
    // PERF-005
    'idx_tu_calculation_cache_expires',
    // Additional
    'idx_user_cohort_preferences_leaderboard',
  ];

  for (const idx of indexes) {
    await db.query(`DROP INDEX IF EXISTS ${idx}`);
  }

  log.info('Rollback 097_performance_bottleneck_fixes complete');
}

export const migrate = up;
