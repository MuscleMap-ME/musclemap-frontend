/**
 * Migration: Enhanced Leaderboard Indexes and Materialized View
 *
 * Adds:
 * 1. Composite indexes for optimized leaderboard queries
 * 2. Materialized view for fast XP rankings (mv_xp_rankings)
 * 3. Indexes for language-based filtering
 *
 * Performance Optimizations:
 * - Pre-computed global rankings via materialized view
 * - Composite indexes for location + privacy filters
 * - Partial indexes to exclude ghost mode users
 *
 * The materialized view should be refreshed periodically (every 5 minutes)
 * via a background job or cron.
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

async function indexExists(indexName: string): Promise<boolean> {
  const result = await db.queryOne<{ count: string }>(
    `SELECT COUNT(*) as count FROM pg_indexes WHERE indexname = $1`,
    [indexName]
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

export async function up(): Promise<void> {
  log.info('Running migration: 050_leaderboard_indexes');

  // ============================================
  // CREATE COMPOSITE INDEXES FOR LOCATION FILTERING
  // ============================================
  if (!(await indexExists('idx_profile_location_leaderboard'))) {
    log.info('Creating idx_profile_location_leaderboard index...');
    await db.query(`
      CREATE INDEX idx_profile_location_leaderboard
      ON user_profile_extended(country, state, city)
      WHERE leaderboard_opt_in = TRUE AND (ghost_mode = FALSE OR ghost_mode IS NULL)
    `);
  }

  if (!(await indexExists('idx_profile_country_leaderboard'))) {
    log.info('Creating idx_profile_country_leaderboard index...');
    await db.query(`
      CREATE INDEX idx_profile_country_leaderboard
      ON user_profile_extended(country)
      WHERE leaderboard_opt_in = TRUE AND (ghost_mode = FALSE OR ghost_mode IS NULL)
    `);
  }

  // ============================================
  // CREATE INDEXES FOR COHORT FILTERING
  // ============================================
  if (!(await indexExists('idx_profile_gender_leaderboard'))) {
    log.info('Creating idx_profile_gender_leaderboard index...');
    await db.query(`
      CREATE INDEX idx_profile_gender_leaderboard
      ON user_profile_extended(gender)
      WHERE leaderboard_opt_in = TRUE AND (ghost_mode = FALSE OR ghost_mode IS NULL) AND gender IS NOT NULL
    `);
  }

  // ============================================
  // CREATE INDEX FOR LANGUAGE FILTERING
  // ============================================
  if (!(await indexExists('idx_user_languages_leaderboard'))) {
    log.info('Creating idx_user_languages_leaderboard index...');
    await db.query(`
      CREATE INDEX idx_user_languages_leaderboard
      ON user_languages(language_code, user_id)
    `);
  }

  // ============================================
  // CREATE MATERIALIZED VIEW FOR XP RANKINGS
  // ============================================
  if (!(await materializedViewExists('mv_xp_rankings'))) {
    log.info('Creating mv_xp_rankings materialized view...');
    await db.query(`
      CREATE MATERIALIZED VIEW mv_xp_rankings AS
      SELECT
        u.id as user_id,
        u.username,
        u.display_name,
        u.avatar_url,
        u.total_xp,
        u.current_rank,
        u.veteran_tier,
        u.created_at as member_since,
        up.country,
        up.country_code,
        up.state,
        up.city,
        up.gender,
        up.age_bracket,
        up.ability_category,
        up.ghost_mode,
        up.leaderboard_opt_in,
        up.location_visibility_level,
        RANK() OVER (ORDER BY u.total_xp DESC) as global_xp_rank,
        PERCENT_RANK() OVER (ORDER BY u.total_xp DESC) * 100 as global_xp_percentile
      FROM users u
      LEFT JOIN user_profile_extended up ON up.user_id = u.id
      WHERE
        (up.ghost_mode = FALSE OR up.ghost_mode IS NULL)
        AND (up.leaderboard_opt_in = TRUE OR up.leaderboard_opt_in IS NULL)
        AND u.total_xp > 0
    `);

    log.info('Created mv_xp_rankings materialized view');
  }

  // Create unique index on materialized view (required for concurrent refresh)
  if (!(await indexExists('idx_mv_xp_rankings_user'))) {
    log.info('Creating idx_mv_xp_rankings_user index...');
    await db.query('CREATE UNIQUE INDEX idx_mv_xp_rankings_user ON mv_xp_rankings(user_id)');
  }

  // Additional indexes on materialized view for filtering
  if (!(await indexExists('idx_mv_xp_rankings_rank'))) {
    log.info('Creating idx_mv_xp_rankings_rank index...');
    await db.query('CREATE INDEX idx_mv_xp_rankings_rank ON mv_xp_rankings(global_xp_rank)');
  }

  if (!(await indexExists('idx_mv_xp_rankings_country'))) {
    log.info('Creating idx_mv_xp_rankings_country index...');
    await db.query('CREATE INDEX idx_mv_xp_rankings_country ON mv_xp_rankings(country) WHERE country IS NOT NULL');
  }

  if (!(await indexExists('idx_mv_xp_rankings_country_state'))) {
    log.info('Creating idx_mv_xp_rankings_country_state index...');
    await db.query('CREATE INDEX idx_mv_xp_rankings_country_state ON mv_xp_rankings(country, state) WHERE state IS NOT NULL');
  }

  // ============================================
  // CREATE FUNCTION TO REFRESH MATERIALIZED VIEW
  // ============================================
  log.info('Creating refresh_xp_rankings function...');
  await db.query(`
    CREATE OR REPLACE FUNCTION refresh_xp_rankings()
    RETURNS void AS $$
    BEGIN
      REFRESH MATERIALIZED VIEW CONCURRENTLY mv_xp_rankings;
    END;
    $$ LANGUAGE plpgsql;
  `);

  // ============================================
  // CREATE LEADERBOARD SETTINGS TABLE
  // ============================================
  if (!(await tableExists('leaderboard_settings'))) {
    log.info('Creating leaderboard_settings table...');
    await db.query(`
      CREATE TABLE leaderboard_settings (
        key TEXT PRIMARY KEY,
        value JSONB NOT NULL,
        description TEXT,
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    // Seed default settings
    const settings = [
      { key: 'refresh_interval_minutes', value: 5, desc: 'How often to refresh the materialized view' },
      { key: 'max_results_per_page', value: 100, desc: 'Maximum leaderboard results per page' },
      { key: 'min_xp_for_ranking', value: 1, desc: 'Minimum XP required to appear on leaderboards' },
      { key: 'cache_ttl_seconds', value: 300, desc: 'TTL for cached leaderboard queries' },
    ];

    for (const s of settings) {
      await db.query(
        `INSERT INTO leaderboard_settings (key, value, description)
         VALUES ($1, $2, $3)
         ON CONFLICT (key) DO NOTHING`,
        [s.key, JSON.stringify(s.value), s.desc]
      );
    }
  }

  // ============================================
  // ANALYZE TABLES
  // ============================================
  log.info('Analyzing tables and refreshing view...');

  // Initial refresh of materialized view
  try {
    await db.query('REFRESH MATERIALIZED VIEW mv_xp_rankings');
    log.info('Refreshed mv_xp_rankings');
  } catch (e) {
    log.warn('Could not refresh mv_xp_rankings - may need data first');
  }

  const tables = ['user_profile_extended', 'user_languages', 'leaderboard_settings'];
  for (const table of tables) {
    if (await tableExists(table)) {
      try {
        await db.query(`ANALYZE ${table}`);
      } catch (e) {
        log.debug(`Could not analyze ${table}`);
      }
    }
  }

  log.info('Migration 050_leaderboard_indexes complete');
}

export async function down(): Promise<void> {
  log.info('Rolling back migration: 050_leaderboard_indexes');

  // Drop function
  await db.query('DROP FUNCTION IF EXISTS refresh_xp_rankings()');

  // Drop materialized view
  await db.query('DROP MATERIALIZED VIEW IF EXISTS mv_xp_rankings CASCADE');

  // Drop leaderboard_settings table
  await db.query('DROP TABLE IF EXISTS leaderboard_settings CASCADE');

  // Drop indexes
  const indexes = [
    'idx_profile_location_leaderboard',
    'idx_profile_country_leaderboard',
    'idx_profile_gender_leaderboard',
    'idx_user_languages_leaderboard',
    'idx_mv_xp_rankings_user',
    'idx_mv_xp_rankings_rank',
    'idx_mv_xp_rankings_country',
    'idx_mv_xp_rankings_country_state',
  ];

  for (const idx of indexes) {
    await db.query(`DROP INDEX IF EXISTS ${idx}`);
  }

  log.info('Rollback 050_leaderboard_indexes complete');
}

export const migrate = up;
