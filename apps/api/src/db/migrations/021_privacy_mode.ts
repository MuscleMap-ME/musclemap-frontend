/**
 * Migration: Privacy Mode & Minimalist Experience Settings
 *
 * This migration creates/updates tables for:
 * 1. user_privacy_mode - Master privacy/minimalist mode settings
 *
 * Privacy Philosophy:
 * - Users can opt out of ALL community features entirely
 * - Users can selectively disable specific community features
 * - Users data should be excluded from collection/comparison when opted out
 * - UI can be stripped down to bare essentials if that's what users want
 */

import { db } from '../client';
import { loggers } from '../../lib/logger';

const log = loggers.db;

async function tableExists(tableName: string): Promise<boolean> {
  const result = await db.queryOne<{ count: string }>(
    `SELECT COUNT(*) as count FROM information_schema.tables
     WHERE table_name = $1`,
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

export async function up(): Promise<void> {
  log.info('Running migration: 021_privacy_mode');

  // Create comprehensive privacy mode table
  if (!(await tableExists('user_privacy_mode'))) {
    log.info('Creating user_privacy_mode table...');

    await db.query(`
      CREATE TABLE user_privacy_mode (
        user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,

        -- Master Toggle: Minimalist Mode
        -- When TRUE: Hides all community features, strips UI to essentials
        minimalist_mode BOOLEAN DEFAULT FALSE,

        -- Community Feature Opt-Outs (granular controls)
        -- These are respected even when minimalist_mode is FALSE
        opt_out_leaderboards BOOLEAN DEFAULT FALSE,
        opt_out_community_feed BOOLEAN DEFAULT FALSE,
        opt_out_crews BOOLEAN DEFAULT FALSE,
        opt_out_rivals BOOLEAN DEFAULT FALSE,
        opt_out_hangouts BOOLEAN DEFAULT FALSE,
        opt_out_messaging BOOLEAN DEFAULT FALSE,
        opt_out_high_fives BOOLEAN DEFAULT FALSE,

        -- Data Collection Opt-Outs
        -- When TRUE: User data is excluded from aggregated statistics
        exclude_from_stats_comparison BOOLEAN DEFAULT FALSE,
        exclude_from_location_features BOOLEAN DEFAULT FALSE,
        exclude_from_activity_feed BOOLEAN DEFAULT FALSE,

        -- UI Preferences
        hide_gamification BOOLEAN DEFAULT FALSE,
        hide_achievements BOOLEAN DEFAULT FALSE,
        hide_tips BOOLEAN DEFAULT FALSE,
        hide_social_notifications BOOLEAN DEFAULT FALSE,
        hide_progress_comparisons BOOLEAN DEFAULT FALSE,

        -- Presence & Activity Tracking
        disable_presence_tracking BOOLEAN DEFAULT FALSE,
        disable_workout_sharing BOOLEAN DEFAULT FALSE,

        -- Profile Visibility (extends existing settings)
        profile_completely_private BOOLEAN DEFAULT FALSE,

        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    log.info('user_privacy_mode table created');
  } else {
    log.info('user_privacy_mode table already exists, checking for new columns...');
  }

  // Add minimalist_mode column to user_privacy_settings if it doesn't exist
  // This maintains backwards compatibility
  if (await tableExists('user_privacy_settings')) {
    if (!(await columnExists('user_privacy_settings', 'minimalist_mode'))) {
      log.info('Adding minimalist_mode column to user_privacy_settings...');
      await db.query(`
        ALTER TABLE user_privacy_settings
        ADD COLUMN minimalist_mode BOOLEAN DEFAULT FALSE
      `);
    }
  }

  // Create index for efficient lookup of users who have opted out
  await db.query(`
    CREATE INDEX IF NOT EXISTS idx_privacy_mode_minimalist
    ON user_privacy_mode(minimalist_mode) WHERE minimalist_mode = TRUE
  `);

  await db.query(`
    CREATE INDEX IF NOT EXISTS idx_privacy_mode_exclude_stats
    ON user_privacy_mode(exclude_from_stats_comparison) WHERE exclude_from_stats_comparison = TRUE
  `);

  log.info('Migration 021_privacy_mode complete');
}

export async function down(): Promise<void> {
  log.info('Rolling back migration: 021_privacy_mode');

  await db.query(`DROP TABLE IF EXISTS user_privacy_mode`);

  if (await columnExists('user_privacy_settings', 'minimalist_mode')) {
    await db.query(`ALTER TABLE user_privacy_settings DROP COLUMN minimalist_mode`);
  }

  log.info('Rollback 021_privacy_mode complete');
}

// For compatibility with migrate runner that expects migrate() function
export const migrate = up;
