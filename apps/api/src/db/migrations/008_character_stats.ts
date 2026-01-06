/**
 * Migration: Add D&D-Style Character Stats System
 *
 * This migration creates tables for:
 * 1. character_stats - Current stat values per user (STR, CON, DEX, PWR, END, VIT)
 * 2. character_stats_history - Historical snapshots for progress charts
 * 3. exercise_stat_mappings - Maps exercises to stat contributions
 * 4. user_profile_extended - Gender and location data for leaderboards
 * 5. leaderboard_cache - Pre-computed rankings for performance
 */

import { db } from '../client';
import { loggers } from '../../lib/logger';

const log = loggers.db;

export async function up(): Promise<void> {
  log.info('Running migration: 007_character_stats');

  // 1. Create character_stats table
  const hasCharacterStats = await db.queryOne<{ count: string }>(
    `SELECT COUNT(*) as count FROM information_schema.tables
     WHERE table_name = 'character_stats'`
  );

  if (parseInt(hasCharacterStats?.count || '0') === 0) {
    log.info('Creating character_stats table...');

    await db.query(`
      CREATE TABLE character_stats (
        user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
        strength NUMERIC NOT NULL DEFAULT 0,
        constitution NUMERIC NOT NULL DEFAULT 0,
        dexterity NUMERIC NOT NULL DEFAULT 0,
        power NUMERIC NOT NULL DEFAULT 0,
        endurance NUMERIC NOT NULL DEFAULT 0,
        vitality NUMERIC NOT NULL DEFAULT 0,
        last_calculated_at TIMESTAMP DEFAULT NOW(),
        version INTEGER NOT NULL DEFAULT 1,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    log.info('character_stats table created');
  } else {
    log.info('character_stats table already exists, skipping...');
  }

  // 2. Create character_stats_history table
  const hasStatsHistory = await db.queryOne<{ count: string }>(
    `SELECT COUNT(*) as count FROM information_schema.tables
     WHERE table_name = 'character_stats_history'`
  );

  if (parseInt(hasStatsHistory?.count || '0') === 0) {
    log.info('Creating character_stats_history table...');

    await db.query(`
      CREATE TABLE character_stats_history (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        snapshot_date DATE NOT NULL,
        snapshot_type TEXT NOT NULL DEFAULT 'daily',
        strength NUMERIC NOT NULL,
        constitution NUMERIC NOT NULL,
        dexterity NUMERIC NOT NULL,
        power NUMERIC NOT NULL,
        endurance NUMERIC NOT NULL,
        vitality NUMERIC NOT NULL,
        created_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(user_id, snapshot_date, snapshot_type)
      )
    `);

    await db.query(`CREATE INDEX idx_stats_history_user ON character_stats_history(user_id, snapshot_date DESC)`);

    log.info('character_stats_history table created');
  } else {
    log.info('character_stats_history table already exists, skipping...');
  }

  // 3. Create exercise_stat_mappings table
  const hasStatMappings = await db.queryOne<{ count: string }>(
    `SELECT COUNT(*) as count FROM information_schema.tables
     WHERE table_name = 'exercise_stat_mappings'`
  );

  if (parseInt(hasStatMappings?.count || '0') === 0) {
    log.info('Creating exercise_stat_mappings table...');

    await db.query(`
      CREATE TABLE exercise_stat_mappings (
        id TEXT PRIMARY KEY,
        exercise_id TEXT NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,
        stat_type TEXT NOT NULL,
        contribution_weight NUMERIC NOT NULL DEFAULT 1.0,
        created_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(exercise_id, stat_type)
      )
    `);

    await db.query(`CREATE INDEX idx_exercise_stat_mappings ON exercise_stat_mappings(exercise_id)`);

    log.info('exercise_stat_mappings table created');
  } else {
    log.info('exercise_stat_mappings table already exists, skipping...');
  }

  // 4. Create user_profile_extended table
  const hasExtendedProfile = await db.queryOne<{ count: string }>(
    `SELECT COUNT(*) as count FROM information_schema.tables
     WHERE table_name = 'user_profile_extended'`
  );

  if (parseInt(hasExtendedProfile?.count || '0') === 0) {
    log.info('Creating user_profile_extended table...');

    await db.query(`
      CREATE TABLE user_profile_extended (
        user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
        gender TEXT,
        city TEXT,
        county TEXT,
        state TEXT,
        country TEXT,
        country_code TEXT,
        leaderboard_opt_in BOOLEAN DEFAULT TRUE,
        profile_visibility TEXT DEFAULT 'public',
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await db.query(`CREATE INDEX idx_extended_profile_location ON user_profile_extended(country, state, city)`);

    log.info('user_profile_extended table created');
  } else {
    log.info('user_profile_extended table already exists, skipping...');
  }

  // 5. Create leaderboard_cache table
  const hasLeaderboardCache = await db.queryOne<{ count: string }>(
    `SELECT COUNT(*) as count FROM information_schema.tables
     WHERE table_name = 'leaderboard_cache'`
  );

  if (parseInt(hasLeaderboardCache?.count || '0') === 0) {
    log.info('Creating leaderboard_cache table...');

    await db.query(`
      CREATE TABLE leaderboard_cache (
        id TEXT PRIMARY KEY,
        scope_type TEXT NOT NULL,
        scope_value TEXT,
        gender_filter TEXT,
        stat_type TEXT NOT NULL,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        stat_value NUMERIC NOT NULL,
        rank INTEGER NOT NULL,
        percentile NUMERIC NOT NULL,
        cached_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await db.query(`CREATE INDEX idx_leaderboard_scope ON leaderboard_cache(scope_type, scope_value, stat_type, rank)`);
    await db.query(`CREATE INDEX idx_leaderboard_user ON leaderboard_cache(user_id, stat_type)`);
    await db.query(`CREATE INDEX idx_leaderboard_cached ON leaderboard_cache(cached_at)`);

    log.info('leaderboard_cache table created');
  } else {
    log.info('leaderboard_cache table already exists, skipping...');
  }

  log.info('Migration 007_character_stats complete');
}
