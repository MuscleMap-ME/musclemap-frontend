/**
 * Migration: Leaderboard Materialized Views
 *
 * Creates materialized views for leaderboards to enable O(1) rank lookups
 * instead of O(n) OFFSET pagination.
 *
 * Key features:
 * - Pre-calculated ranks for all stat types (strength, endurance, dexterity, constitution, power, vitality)
 * - Global, country, state, and city scope rankings
 * - Unique indexes for CONCURRENTLY refresh
 * - Indexed by user_id for fast "my rank" lookups
 * - Keyset pagination support via rank column
 */

import { db } from '../client';
import { loggers } from '../../lib/logger';

const log = loggers.db;

export async function up(): Promise<void> {
  log.info('Running migration: 142_leaderboard_materialized_views');

  // ============================================
  // MATERIALIZED VIEW: Global Leaderboards
  // ============================================

  log.info('Creating mv_leaderboard_global materialized view');
  await db.execute(`
    CREATE MATERIALIZED VIEW IF NOT EXISTS mv_leaderboard_global AS
    SELECT
      cs.user_id,
      u.username,
      u.avatar_url,
      up.gender,
      up.country,
      up.country_code,
      up.state,
      up.city,
      cs.strength,
      cs.endurance,
      cs.dexterity,
      cs.constitution,
      cs.power,
      cs.vitality,
      DENSE_RANK() OVER (ORDER BY cs.strength DESC) as rank_strength,
      DENSE_RANK() OVER (ORDER BY cs.endurance DESC) as rank_endurance,
      DENSE_RANK() OVER (ORDER BY cs.dexterity DESC) as rank_dexterity,
      DENSE_RANK() OVER (ORDER BY cs.constitution DESC) as rank_constitution,
      DENSE_RANK() OVER (ORDER BY cs.power DESC) as rank_power,
      DENSE_RANK() OVER (ORDER BY cs.vitality DESC) as rank_vitality
    FROM character_stats cs
    JOIN users u ON u.id = cs.user_id
    LEFT JOIN user_profile_extended up ON up.user_id = cs.user_id
    LEFT JOIN user_privacy_settings ups ON ups.user_id = cs.user_id
    WHERE COALESCE(ups.show_on_leaderboards, true) = true
  `);

  // Unique index required for CONCURRENTLY refresh
  await db.execute(`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_leaderboard_global_user
    ON mv_leaderboard_global(user_id)
  `);

  // Indexes for each stat ranking (for pagination by rank)
  await db.execute(`CREATE INDEX IF NOT EXISTS idx_mv_leaderboard_global_strength ON mv_leaderboard_global(rank_strength, user_id)`);
  await db.execute(`CREATE INDEX IF NOT EXISTS idx_mv_leaderboard_global_endurance ON mv_leaderboard_global(rank_endurance, user_id)`);
  await db.execute(`CREATE INDEX IF NOT EXISTS idx_mv_leaderboard_global_dexterity ON mv_leaderboard_global(rank_dexterity, user_id)`);
  await db.execute(`CREATE INDEX IF NOT EXISTS idx_mv_leaderboard_global_constitution ON mv_leaderboard_global(rank_constitution, user_id)`);
  await db.execute(`CREATE INDEX IF NOT EXISTS idx_mv_leaderboard_global_power ON mv_leaderboard_global(rank_power, user_id)`);
  await db.execute(`CREATE INDEX IF NOT EXISTS idx_mv_leaderboard_global_vitality ON mv_leaderboard_global(rank_vitality, user_id)`);

  // ============================================
  // MATERIALIZED VIEW: Country Leaderboards
  // ============================================

  log.info('Creating mv_leaderboard_country materialized view');
  await db.execute(`
    CREATE MATERIALIZED VIEW IF NOT EXISTS mv_leaderboard_country AS
    SELECT
      cs.user_id,
      u.username,
      u.avatar_url,
      up.gender,
      up.country,
      up.country_code,
      up.state,
      up.city,
      cs.strength,
      cs.endurance,
      cs.dexterity,
      cs.constitution,
      cs.power,
      cs.vitality,
      DENSE_RANK() OVER (PARTITION BY up.country ORDER BY cs.strength DESC) as rank_strength,
      DENSE_RANK() OVER (PARTITION BY up.country ORDER BY cs.endurance DESC) as rank_endurance,
      DENSE_RANK() OVER (PARTITION BY up.country ORDER BY cs.dexterity DESC) as rank_dexterity,
      DENSE_RANK() OVER (PARTITION BY up.country ORDER BY cs.constitution DESC) as rank_constitution,
      DENSE_RANK() OVER (PARTITION BY up.country ORDER BY cs.power DESC) as rank_power,
      DENSE_RANK() OVER (PARTITION BY up.country ORDER BY cs.vitality DESC) as rank_vitality
    FROM character_stats cs
    JOIN users u ON u.id = cs.user_id
    LEFT JOIN user_profile_extended up ON up.user_id = cs.user_id
    LEFT JOIN user_privacy_settings ups ON ups.user_id = cs.user_id
    WHERE COALESCE(ups.show_on_leaderboards, true) = true
      AND up.country IS NOT NULL
  `);

  await db.execute(`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_leaderboard_country_user
    ON mv_leaderboard_country(user_id)
  `);

  // Composite indexes for country-scoped queries
  await db.execute(`CREATE INDEX IF NOT EXISTS idx_mv_leaderboard_country_strength ON mv_leaderboard_country(country, rank_strength, user_id)`);
  await db.execute(`CREATE INDEX IF NOT EXISTS idx_mv_leaderboard_country_vitality ON mv_leaderboard_country(country, rank_vitality, user_id)`);

  // ============================================
  // MATERIALIZED VIEW: State Leaderboards
  // ============================================

  log.info('Creating mv_leaderboard_state materialized view');
  await db.execute(`
    CREATE MATERIALIZED VIEW IF NOT EXISTS mv_leaderboard_state AS
    SELECT
      cs.user_id,
      u.username,
      u.avatar_url,
      up.gender,
      up.country,
      up.country_code,
      up.state,
      up.city,
      cs.strength,
      cs.endurance,
      cs.dexterity,
      cs.constitution,
      cs.power,
      cs.vitality,
      DENSE_RANK() OVER (PARTITION BY up.country, up.state ORDER BY cs.strength DESC) as rank_strength,
      DENSE_RANK() OVER (PARTITION BY up.country, up.state ORDER BY cs.endurance DESC) as rank_endurance,
      DENSE_RANK() OVER (PARTITION BY up.country, up.state ORDER BY cs.dexterity DESC) as rank_dexterity,
      DENSE_RANK() OVER (PARTITION BY up.country, up.state ORDER BY cs.constitution DESC) as rank_constitution,
      DENSE_RANK() OVER (PARTITION BY up.country, up.state ORDER BY cs.power DESC) as rank_power,
      DENSE_RANK() OVER (PARTITION BY up.country, up.state ORDER BY cs.vitality DESC) as rank_vitality
    FROM character_stats cs
    JOIN users u ON u.id = cs.user_id
    LEFT JOIN user_profile_extended up ON up.user_id = cs.user_id
    LEFT JOIN user_privacy_settings ups ON ups.user_id = cs.user_id
    WHERE COALESCE(ups.show_on_leaderboards, true) = true
      AND up.state IS NOT NULL
  `);

  await db.execute(`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_leaderboard_state_user
    ON mv_leaderboard_state(user_id)
  `);

  // Composite indexes for state-scoped queries
  await db.execute(`CREATE INDEX IF NOT EXISTS idx_mv_leaderboard_state_strength ON mv_leaderboard_state(country, state, rank_strength, user_id)`);
  await db.execute(`CREATE INDEX IF NOT EXISTS idx_mv_leaderboard_state_vitality ON mv_leaderboard_state(country, state, rank_vitality, user_id)`);

  // ============================================
  // MATERIALIZED VIEW: City Leaderboards
  // ============================================

  log.info('Creating mv_leaderboard_city materialized view');
  await db.execute(`
    CREATE MATERIALIZED VIEW IF NOT EXISTS mv_leaderboard_city AS
    SELECT
      cs.user_id,
      u.username,
      u.avatar_url,
      up.gender,
      up.country,
      up.country_code,
      up.state,
      up.city,
      cs.strength,
      cs.endurance,
      cs.dexterity,
      cs.constitution,
      cs.power,
      cs.vitality,
      DENSE_RANK() OVER (PARTITION BY up.country, up.state, up.city ORDER BY cs.strength DESC) as rank_strength,
      DENSE_RANK() OVER (PARTITION BY up.country, up.state, up.city ORDER BY cs.endurance DESC) as rank_endurance,
      DENSE_RANK() OVER (PARTITION BY up.country, up.state, up.city ORDER BY cs.dexterity DESC) as rank_dexterity,
      DENSE_RANK() OVER (PARTITION BY up.country, up.state, up.city ORDER BY cs.constitution DESC) as rank_constitution,
      DENSE_RANK() OVER (PARTITION BY up.country, up.state, up.city ORDER BY cs.power DESC) as rank_power,
      DENSE_RANK() OVER (PARTITION BY up.country, up.state, up.city ORDER BY cs.vitality DESC) as rank_vitality
    FROM character_stats cs
    JOIN users u ON u.id = cs.user_id
    LEFT JOIN user_profile_extended up ON up.user_id = cs.user_id
    LEFT JOIN user_privacy_settings ups ON ups.user_id = cs.user_id
    WHERE COALESCE(ups.show_on_leaderboards, true) = true
      AND up.city IS NOT NULL
  `);

  await db.execute(`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_leaderboard_city_user
    ON mv_leaderboard_city(user_id)
  `);

  // Composite indexes for city-scoped queries
  await db.execute(`CREATE INDEX IF NOT EXISTS idx_mv_leaderboard_city_strength ON mv_leaderboard_city(country, state, city, rank_strength, user_id)`);
  await db.execute(`CREATE INDEX IF NOT EXISTS idx_mv_leaderboard_city_vitality ON mv_leaderboard_city(country, state, city, rank_vitality, user_id)`);

  // ============================================
  // REFRESH TRACKING TABLE
  // ============================================

  log.info('Creating mv_refresh_log table');
  // Check if table exists first
  const tableExistsResult = await db.queryOne<{ exists: boolean }>(`
    SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'mv_refresh_log') as exists
  `);

  if (!tableExistsResult?.exists) {
    await db.execute(`
      CREATE TABLE mv_refresh_log (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        view_name VARCHAR(100) NOT NULL,
        started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        completed_at TIMESTAMPTZ,
        rows_affected INTEGER,
        duration_ms INTEGER,
        status VARCHAR(20) DEFAULT 'running',
        error_message TEXT
      )
    `);
    await db.execute(`CREATE INDEX idx_mv_refresh_log_view ON mv_refresh_log(view_name)`);
    await db.execute(`CREATE INDEX idx_mv_refresh_log_completed ON mv_refresh_log(completed_at)`);
  }

  // ============================================
  // REFRESH FUNCTION
  // ============================================

  log.info('Creating refresh_leaderboard_views function');
  await db.execute(`
    CREATE OR REPLACE FUNCTION refresh_leaderboard_views()
    RETURNS void AS $$
    DECLARE
      start_time TIMESTAMP;
      log_id UUID;
      view_names TEXT[] := ARRAY['mv_leaderboard_global', 'mv_leaderboard_country', 'mv_leaderboard_state', 'mv_leaderboard_city'];
      view_name TEXT;
    BEGIN
      FOREACH view_name IN ARRAY view_names LOOP
        start_time := clock_timestamp();

        -- Log start
        INSERT INTO mv_refresh_log (view_name, started_at, status)
        VALUES (view_name, start_time, 'running')
        RETURNING id INTO log_id;

        BEGIN
          -- Refresh the view concurrently (doesn't block reads)
          EXECUTE format('REFRESH MATERIALIZED VIEW CONCURRENTLY %I', view_name);

          -- Log completion
          UPDATE mv_refresh_log
          SET completed_at = clock_timestamp(),
              duration_ms = EXTRACT(EPOCH FROM (clock_timestamp() - start_time)) * 1000,
              status = 'completed',
              rows_affected = (SELECT reltuples::int FROM pg_class WHERE relname = view_name)
          WHERE id = log_id;

        EXCEPTION WHEN OTHERS THEN
          -- Log failure
          UPDATE mv_refresh_log
          SET completed_at = clock_timestamp(),
              duration_ms = EXTRACT(EPOCH FROM (clock_timestamp() - start_time)) * 1000,
              status = 'failed',
              error_message = SQLERRM
          WHERE id = log_id;
          RAISE;
        END;
      END LOOP;
    END;
    $$ LANGUAGE plpgsql
  `);

  // ============================================
  // AGGREGATE COUNTS TABLE (for total without counting)
  // ============================================

  log.info('Creating leaderboard_counts table');
  const countsTableExistsResult = await db.queryOne<{ exists: boolean }>(`
    SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'leaderboard_counts') as exists
  `);

  if (!countsTableExistsResult?.exists) {
    await db.execute(`
      CREATE TABLE leaderboard_counts (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        scope VARCHAR(20) NOT NULL,
        scope_value VARCHAR(100),
        user_count INTEGER NOT NULL DEFAULT 0,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE(scope, scope_value)
      )
    `);
    await db.execute(`CREATE INDEX idx_leaderboard_counts_scope ON leaderboard_counts(scope, scope_value)`);
  }

  // Function to update counts after refresh
  log.info('Creating update_leaderboard_counts function');
  await db.execute(`
    CREATE OR REPLACE FUNCTION update_leaderboard_counts()
    RETURNS void AS $$
    BEGIN
      -- Update global count
      INSERT INTO leaderboard_counts (scope, scope_value, user_count, updated_at)
      VALUES ('global', NULL, (SELECT COUNT(*) FROM mv_leaderboard_global), NOW())
      ON CONFLICT (scope, scope_value)
      DO UPDATE SET user_count = EXCLUDED.user_count, updated_at = NOW();

      -- Update country counts
      INSERT INTO leaderboard_counts (scope, scope_value, user_count, updated_at)
      SELECT 'country', country, COUNT(*), NOW()
      FROM mv_leaderboard_country
      WHERE country IS NOT NULL
      GROUP BY country
      ON CONFLICT (scope, scope_value)
      DO UPDATE SET user_count = EXCLUDED.user_count, updated_at = NOW();

      -- Update state counts
      INSERT INTO leaderboard_counts (scope, scope_value, user_count, updated_at)
      SELECT 'state', country || '::' || state, COUNT(*), NOW()
      FROM mv_leaderboard_state
      WHERE state IS NOT NULL
      GROUP BY country, state
      ON CONFLICT (scope, scope_value)
      DO UPDATE SET user_count = EXCLUDED.user_count, updated_at = NOW();

      -- Update city counts
      INSERT INTO leaderboard_counts (scope, scope_value, user_count, updated_at)
      SELECT 'city', country || '::' || state || '::' || city, COUNT(*), NOW()
      FROM mv_leaderboard_city
      WHERE city IS NOT NULL
      GROUP BY country, state, city
      ON CONFLICT (scope, scope_value)
      DO UPDATE SET user_count = EXCLUDED.user_count, updated_at = NOW();
    END;
    $$ LANGUAGE plpgsql
  `);

  // Initial population
  log.info('Refreshing materialized views with initial data');
  await db.execute('REFRESH MATERIALIZED VIEW mv_leaderboard_global');
  await db.execute('REFRESH MATERIALIZED VIEW mv_leaderboard_country');
  await db.execute('REFRESH MATERIALIZED VIEW mv_leaderboard_state');
  await db.execute('REFRESH MATERIALIZED VIEW mv_leaderboard_city');

  // Populate initial counts
  log.info('Populating leaderboard counts');
  await db.execute('SELECT update_leaderboard_counts()');

  log.info('Migration 142_leaderboard_materialized_views completed');
}

// DESTRUCTIVE: Rollback drops materialized views and helper tables/functions - safe as these are derived data structures
export async function down(): Promise<void> {
  log.info('Rolling back migration: 142_leaderboard_materialized_views');

  // Drop functions
  await db.execute('DROP FUNCTION IF EXISTS update_leaderboard_counts()');
  await db.execute('DROP FUNCTION IF EXISTS refresh_leaderboard_views()');

  // Drop tables
  await db.execute('DROP TABLE IF EXISTS leaderboard_counts');
  await db.execute('DROP TABLE IF EXISTS mv_refresh_log');

  // Drop materialized views
  await db.execute('DROP MATERIALIZED VIEW IF EXISTS mv_leaderboard_city');
  await db.execute('DROP MATERIALIZED VIEW IF EXISTS mv_leaderboard_state');
  await db.execute('DROP MATERIALIZED VIEW IF EXISTS mv_leaderboard_country');
  await db.execute('DROP MATERIALIZED VIEW IF EXISTS mv_leaderboard_global');

  log.info('Migration 142_leaderboard_materialized_views rolled back');
}
