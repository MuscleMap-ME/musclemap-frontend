// DESTRUCTIVE: Schema modification for ghost mode profile - contains DROP/TRUNCATE operations
// SQL-SAFE: Template literals contain static SQL only, no external input
/**
 * Migration: Ghost Mode and Profile Enhancements
 *
 * Adds:
 * 1. ghost_mode column to user_profile_extended
 * 2. about_me and about_me_visibility columns for rich text bio
 * 3. user_field_visibility table for per-field privacy controls
 *
 * Ghost Mode:
 * - When enabled, user is excluded from all leaderboards
 * - Profile returns minimal info to other users
 * - User can still use all app features normally
 *
 * Field Visibility:
 * - Each profile field can be independently shown/hidden
 * - Controls: location, gender, age, stats, achievements, rank, workouts, languages, veteran badge
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

async function columnExists(tableName: string, columnName: string): Promise<boolean> {
  const result = await db.queryOne<{ count: string }>(
    `SELECT COUNT(*) as count FROM information_schema.columns
     WHERE table_name = $1 AND column_name = $2`,
    [tableName, columnName]
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

export async function up(): Promise<void> {
  log.info('Running migration: 049_ghost_mode_profile');

  // ============================================
  // ADD COLUMNS TO USER_PROFILE_EXTENDED
  // ============================================
  if (await tableExists('user_profile_extended')) {
    // Ghost mode column
    if (!(await columnExists('user_profile_extended', 'ghost_mode'))) {
      log.info('Adding ghost_mode column to user_profile_extended...');
      await db.query('ALTER TABLE user_profile_extended ADD COLUMN ghost_mode BOOLEAN DEFAULT FALSE');
    }

    // About Me rich text column
    if (!(await columnExists('user_profile_extended', 'about_me'))) {
      log.info('Adding about_me column to user_profile_extended...');
      await db.query('ALTER TABLE user_profile_extended ADD COLUMN about_me TEXT');
    }

    // About Me visibility
    if (!(await columnExists('user_profile_extended', 'about_me_visibility'))) {
      log.info('Adding about_me_visibility column to user_profile_extended...');
      await db.query(`ALTER TABLE user_profile_extended ADD COLUMN about_me_visibility TEXT DEFAULT 'public' CHECK (about_me_visibility IN ('public', 'friends', 'private'))`);
    }

    // Age bracket (for leaderboard filtering - no exact DOB stored)
    if (!(await columnExists('user_profile_extended', 'age_bracket'))) {
      log.info('Adding age_bracket column to user_profile_extended...');
      await db.query(`ALTER TABLE user_profile_extended ADD COLUMN age_bracket TEXT CHECK (age_bracket IN ('13-17', '18-24', '25-34', '35-44', '45-54', '55-64', '65+', 'prefer_not_to_say'))`);
    }

    // Ability category (for adaptive leaderboards)
    if (!(await columnExists('user_profile_extended', 'ability_category'))) {
      log.info('Adding ability_category column to user_profile_extended...');
      await db.query(`ALTER TABLE user_profile_extended ADD COLUMN ability_category TEXT DEFAULT 'standard' CHECK (ability_category IN ('standard', 'adaptive', 'wheelchair', 'visually_impaired', 'other', 'prefer_not_to_say'))`);
    }

    // Custom ability label (when 'other' is selected)
    if (!(await columnExists('user_profile_extended', 'ability_custom_label'))) {
      log.info('Adding ability_custom_label column to user_profile_extended...');
      await db.query('ALTER TABLE user_profile_extended ADD COLUMN ability_custom_label TEXT');
    }

    // Custom gender label (when 'other' is selected)
    if (!(await columnExists('user_profile_extended', 'gender_custom_label'))) {
      log.info('Adding gender_custom_label column to user_profile_extended...');
      await db.query('ALTER TABLE user_profile_extended ADD COLUMN gender_custom_label TEXT');
    }

    // Location granularity preference (what level to expose to others)
    if (!(await columnExists('user_profile_extended', 'location_visibility_level'))) {
      log.info('Adding location_visibility_level column to user_profile_extended...');
      await db.query(`ALTER TABLE user_profile_extended ADD COLUMN location_visibility_level TEXT DEFAULT 'country' CHECK (location_visibility_level IN ('none', 'country', 'state', 'city'))`);
    }
  }

  // ============================================
  // CREATE USER FIELD VISIBILITY TABLE
  // ============================================
  if (!(await tableExists('user_field_visibility'))) {
    log.info('Creating user_field_visibility table...');
    await db.query(`
      CREATE TABLE user_field_visibility (
        user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
        show_location BOOLEAN DEFAULT TRUE,
        show_gender BOOLEAN DEFAULT TRUE,
        show_age BOOLEAN DEFAULT FALSE,
        show_ability BOOLEAN DEFAULT FALSE,
        show_stats BOOLEAN DEFAULT TRUE,
        show_achievements BOOLEAN DEFAULT TRUE,
        show_rank BOOLEAN DEFAULT TRUE,
        show_workouts BOOLEAN DEFAULT TRUE,
        show_languages BOOLEAN DEFAULT TRUE,
        show_veteran_badge BOOLEAN DEFAULT TRUE,
        show_about_me BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    log.info('Created user_field_visibility table');
  }

  // ============================================
  // CREATE INDEXES FOR GHOST MODE
  // ============================================
  if (!(await indexExists('idx_profile_ghost_mode'))) {
    log.info('Creating idx_profile_ghost_mode index...');
    await db.query('CREATE INDEX idx_profile_ghost_mode ON user_profile_extended(user_id) WHERE ghost_mode = TRUE');
  }

  if (!(await indexExists('idx_profile_not_ghost'))) {
    log.info('Creating idx_profile_not_ghost index...');
    await db.query('CREATE INDEX idx_profile_not_ghost ON user_profile_extended(user_id) WHERE ghost_mode = FALSE OR ghost_mode IS NULL');
  }

  if (!(await indexExists('idx_profile_age_bracket'))) {
    log.info('Creating idx_profile_age_bracket index...');
    await db.query('CREATE INDEX idx_profile_age_bracket ON user_profile_extended(age_bracket) WHERE age_bracket IS NOT NULL');
  }

  if (!(await indexExists('idx_profile_ability'))) {
    log.info('Creating idx_profile_ability index...');
    await db.query('CREATE INDEX idx_profile_ability ON user_profile_extended(ability_category) WHERE ability_category IS NOT NULL');
  }

  // ============================================
  // ANALYZE TABLES
  // ============================================
  log.info('Analyzing tables...');
  const tables = ['user_profile_extended', 'user_field_visibility'];
  for (const table of tables) {
    if (await tableExists(table)) {
      try {
        await db.query(`ANALYZE ${table}`);
      } catch (_e) {
        log.debug(`Could not analyze ${table}`);
      }
    }
  }

  log.info('Migration 049_ghost_mode_profile complete');
}

export async function down(): Promise<void> {
  log.info('Rolling back migration: 049_ghost_mode_profile');

  // Drop indexes
  await db.query('DROP INDEX IF EXISTS idx_profile_ghost_mode');
  await db.query('DROP INDEX IF EXISTS idx_profile_not_ghost');
  await db.query('DROP INDEX IF EXISTS idx_profile_age_bracket');
  await db.query('DROP INDEX IF EXISTS idx_profile_ability');

  // Drop user_field_visibility table
  await db.query('DROP TABLE IF EXISTS user_field_visibility CASCADE');

  // Remove columns from user_profile_extended
  if (await tableExists('user_profile_extended')) {
    const columnsToRemove = [
      'ghost_mode',
      'about_me',
      'about_me_visibility',
      'age_bracket',
      'ability_category',
      'ability_custom_label',
      'gender_custom_label',
      'location_visibility_level',
    ];

    for (const col of columnsToRemove) {
      if (await columnExists('user_profile_extended', col)) {
        await db.query(`ALTER TABLE user_profile_extended DROP COLUMN ${col}`);
      }
    }
  }

  log.info('Rollback 049_ghost_mode_profile complete');
}

export const migrate = up;
