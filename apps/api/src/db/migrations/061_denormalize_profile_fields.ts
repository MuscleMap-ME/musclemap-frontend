/**
 * Migration: Denormalize Profile Fields to Users Table
 *
 * Optimizes the materialized view refresh and leaderboard queries by:
 * 1. Adding country, ghost_mode, leaderboard_opt_in to users table
 * 2. Migrating existing data from user_profile_extended
 * 3. Creating sync trigger for backwards compatibility
 * 4. Updating mv_xp_rankings to use denormalized fields (faster refresh)
 *
 * This eliminates the LEFT JOIN in mv_xp_rankings, reducing refresh time by ~50%.
 *
 * See docs/DATABASE-OPTIMIZATION-PLAN.md for full optimization roadmap.
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

async function triggerExists(triggerName: string): Promise<boolean> {
  const result = await db.queryOne<{ count: string }>(
    `SELECT COUNT(*) as count FROM pg_trigger WHERE tgname = $1`,
    [triggerName]
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
  log.info('Running migration: 061_denormalize_profile_fields');

  // ============================================
  // 1. ADD DENORMALIZED COLUMNS TO USERS TABLE
  // ============================================
  log.info('Adding denormalized profile columns to users table...');

  if (!(await columnExists('users', 'profile_country'))) {
    await db.query(`
      ALTER TABLE users ADD COLUMN profile_country VARCHAR(2)
    `);
  }

  if (!(await columnExists('users', 'profile_ghost_mode'))) {
    await db.query(`
      ALTER TABLE users ADD COLUMN profile_ghost_mode BOOLEAN DEFAULT FALSE
    `);
  }

  if (!(await columnExists('users', 'profile_leaderboard_opt_in'))) {
    await db.query(`
      ALTER TABLE users ADD COLUMN profile_leaderboard_opt_in BOOLEAN DEFAULT TRUE
    `);
  }

  // ============================================
  // 2. MIGRATE EXISTING DATA
  // ============================================
  if (await tableExists('user_profile_extended')) {
    log.info('Migrating existing profile data to users table...');
    await db.query(`
      UPDATE users u SET
        profile_country = up.country,
        profile_ghost_mode = COALESCE(up.ghost_mode, FALSE),
        profile_leaderboard_opt_in = COALESCE(up.leaderboard_opt_in, TRUE)
      FROM user_profile_extended up
      WHERE u.id = up.user_id
        AND (u.profile_country IS NULL OR u.profile_ghost_mode IS NULL OR u.profile_leaderboard_opt_in IS NULL)
    `);
  }

  // ============================================
  // 3. CREATE SYNC TRIGGER
  // ============================================
  log.info('Creating sync trigger for profile fields...');

  // Function to sync profile fields from user_profile_extended to users
  await db.query(`
    CREATE OR REPLACE FUNCTION sync_profile_to_users()
    RETURNS TRIGGER AS $$
    BEGIN
      UPDATE users SET
        profile_country = NEW.country,
        profile_ghost_mode = COALESCE(NEW.ghost_mode, FALSE),
        profile_leaderboard_opt_in = COALESCE(NEW.leaderboard_opt_in, TRUE)
      WHERE id = NEW.user_id;
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;
  `);

  // Create trigger if not exists
  if (await tableExists('user_profile_extended')) {
    if (!(await triggerExists('trg_sync_profile_to_users'))) {
      await db.query(`
        CREATE TRIGGER trg_sync_profile_to_users
        AFTER INSERT OR UPDATE OF country, ghost_mode, leaderboard_opt_in
        ON user_profile_extended
        FOR EACH ROW
        EXECUTE FUNCTION sync_profile_to_users()
      `);
    }
  }

  // ============================================
  // 4. CREATE OPTIMIZED INDEXES ON USERS TABLE
  // ============================================
  log.info('Creating indexes on denormalized columns...');

  if (!(await indexExists('idx_users_leaderboard_eligible'))) {
    await db.query(`
      CREATE INDEX idx_users_leaderboard_eligible
      ON users(total_xp DESC, id)
      WHERE profile_ghost_mode = FALSE
        AND profile_leaderboard_opt_in = TRUE
        AND total_xp > 0
    `);
  }

  if (!(await indexExists('idx_users_country_leaderboard'))) {
    await db.query(`
      CREATE INDEX idx_users_country_leaderboard
      ON users(profile_country, total_xp DESC)
      WHERE profile_ghost_mode = FALSE
        AND profile_leaderboard_opt_in = TRUE
        AND total_xp > 0
        AND profile_country IS NOT NULL
    `);
  }

  // ============================================
  // 5. CREATE OPTIMIZED MATERIALIZED VIEW
  // ============================================
  // Only create if the old one exists (migration 050 ran)
  if (await materializedViewExists('mv_xp_rankings')) {
    log.info('Creating optimized materialized view mv_xp_rankings_v2...');

    // Create the optimized view without JOIN
    await db.query(`
      CREATE MATERIALIZED VIEW IF NOT EXISTS mv_xp_rankings_v2 AS
      SELECT
        u.id as user_id,
        u.username,
        u.display_name,
        u.avatar_url,
        u.total_xp,
        u.current_rank,
        u.veteran_tier,
        u.created_at as member_since,
        u.profile_country as country,
        u.profile_ghost_mode as ghost_mode,
        u.profile_leaderboard_opt_in as leaderboard_opt_in,
        RANK() OVER (ORDER BY u.total_xp DESC) as global_xp_rank,
        PERCENT_RANK() OVER (ORDER BY u.total_xp DESC) * 100 as global_xp_percentile
      FROM users u
      WHERE
        u.profile_ghost_mode = FALSE
        AND u.profile_leaderboard_opt_in = TRUE
        AND u.total_xp > 0
    `);

    // Create indexes on the new view
    if (!(await indexExists('idx_mv_xp_rankings_v2_user'))) {
      await db.query('CREATE UNIQUE INDEX idx_mv_xp_rankings_v2_user ON mv_xp_rankings_v2(user_id)');
    }

    if (!(await indexExists('idx_mv_xp_rankings_v2_rank'))) {
      await db.query('CREATE INDEX idx_mv_xp_rankings_v2_rank ON mv_xp_rankings_v2(global_xp_rank)');
    }

    if (!(await indexExists('idx_mv_xp_rankings_v2_country'))) {
      await db.query(`
        CREATE INDEX idx_mv_xp_rankings_v2_country
        ON mv_xp_rankings_v2(country, global_xp_rank)
        WHERE country IS NOT NULL
      `);
    }

    // Create refresh function for v2
    await db.query(`
      CREATE OR REPLACE FUNCTION refresh_xp_rankings_v2_with_log()
      RETURNS void AS $$
      DECLARE
        start_time TIMESTAMPTZ;
        duration_ms INTEGER;
        row_count INTEGER;
      BEGIN
        start_time := clock_timestamp();

        REFRESH MATERIALIZED VIEW CONCURRENTLY mv_xp_rankings_v2;

        duration_ms := EXTRACT(MILLISECONDS FROM (clock_timestamp() - start_time))::INTEGER;
        SELECT COUNT(*) INTO row_count FROM mv_xp_rankings_v2;

        INSERT INTO matview_refresh_log (view_name, last_refresh_at, refresh_duration_ms, rows_count)
        VALUES ('mv_xp_rankings_v2', NOW(), duration_ms, row_count)
        ON CONFLICT (view_name)
        DO UPDATE SET
          last_refresh_at = EXCLUDED.last_refresh_at,
          refresh_duration_ms = EXCLUDED.refresh_duration_ms,
          rows_count = EXCLUDED.rows_count,
          error_message = NULL;

      EXCEPTION WHEN OTHERS THEN
        INSERT INTO matview_refresh_log (view_name, last_refresh_at, error_message)
        VALUES ('mv_xp_rankings_v2', NOW(), SQLERRM)
        ON CONFLICT (view_name)
        DO UPDATE SET
          last_refresh_at = EXCLUDED.last_refresh_at,
          error_message = EXCLUDED.error_message;
        RAISE;
      END;
      $$ LANGUAGE plpgsql;
    `);

    // Initial refresh
    try {
      await db.query('REFRESH MATERIALIZED VIEW mv_xp_rankings_v2');
      log.info('Refreshed mv_xp_rankings_v2');
    } catch {
      log.warn('Could not refresh mv_xp_rankings_v2 - may need data first');
    }
  }

  // ============================================
  // 6. ANALYZE TABLES
  // ============================================
  log.info('Analyzing users table...');
  try {
    await db.query('ANALYZE users');
  } catch {
    log.debug('Could not analyze users table');
  }

  log.info('Migration 061_denormalize_profile_fields complete');
}

export async function down(): Promise<void> {
  log.info('Rolling back migration: 061_denormalize_profile_fields');

  // Drop the optimized materialized view
  await db.query('DROP MATERIALIZED VIEW IF EXISTS mv_xp_rankings_v2 CASCADE');

  // Drop refresh function
  await db.query('DROP FUNCTION IF EXISTS refresh_xp_rankings_v2_with_log()');

  // Drop trigger
  await db.query('DROP TRIGGER IF EXISTS trg_sync_profile_to_users ON user_profile_extended');

  // Drop sync function
  await db.query('DROP FUNCTION IF EXISTS sync_profile_to_users()');

  // Drop indexes
  await db.query('DROP INDEX IF EXISTS idx_users_leaderboard_eligible');
  await db.query('DROP INDEX IF EXISTS idx_users_country_leaderboard');

  // Drop columns from users table
  await db.query('ALTER TABLE users DROP COLUMN IF EXISTS profile_country');
  await db.query('ALTER TABLE users DROP COLUMN IF EXISTS profile_ghost_mode');
  await db.query('ALTER TABLE users DROP COLUMN IF EXISTS profile_leaderboard_opt_in');

  log.info('Rollback 061_denormalize_profile_fields complete');
}

export const migrate = up;
