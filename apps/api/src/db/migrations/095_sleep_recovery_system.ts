/**
 * Migration: Sleep & Recovery Scoring System
 *
 * Creates tables for:
 * - Sleep logs (manual sleep tracking)
 * - Recovery scores (calculated based on sleep, rest days, HRV)
 * - Recovery recommendations (AI-generated suggestions)
 *
 * The recovery score integrates with the workout prescription system
 * to recommend workout intensity based on user's recovery state.
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
     WHERE table_schema = 'public' AND table_name = $1 AND column_name = $2`,
    [tableName, columnName]
  );
  return parseInt(result?.count || '0') > 0;
}

export async function up(): Promise<void> {
  log.info('Running migration: 092_sleep_recovery_system');

  // ============================================
  // SLEEP LOGS TABLE
  // ============================================
  if (!(await tableExists('sleep_logs'))) {
    log.info('Creating sleep_logs table...');
    await db.query(`
      CREATE TABLE sleep_logs (
        id TEXT PRIMARY KEY DEFAULT 'sl_' || replace(gen_random_uuid()::text, '-', ''),
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,

        -- Sleep timing
        bed_time TIMESTAMPTZ NOT NULL,
        wake_time TIMESTAMPTZ NOT NULL,
        sleep_duration_minutes INTEGER GENERATED ALWAYS AS (
          EXTRACT(EPOCH FROM (wake_time - bed_time)) / 60
        ) STORED,

        -- Quality (1-5 scale: 1=terrible, 2=poor, 3=fair, 4=good, 5=excellent)
        quality INTEGER NOT NULL CHECK (quality >= 1 AND quality <= 5),

        -- Sleep environment factors
        sleep_environment JSONB DEFAULT '{}',
        -- Example: { "dark": true, "quiet": true, "temperature": "cool", "screen_before_bed": false }

        -- Optional detailed tracking
        time_to_fall_asleep_minutes INTEGER,
        wake_count INTEGER DEFAULT 0,
        notes TEXT,

        -- Source tracking (manual vs wearable sync)
        source TEXT NOT NULL DEFAULT 'manual' CHECK (source IN ('manual', 'apple_health', 'fitbit', 'garmin', 'google_fit', 'whoop', 'oura')),
        external_id TEXT, -- ID from wearable if synced

        -- Timestamps
        logged_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

        -- Prevent duplicate logs for same night
        UNIQUE(user_id, bed_time)
      )
    `);

    // Indexes for efficient querying
    await db.query('CREATE INDEX idx_sleep_logs_user_date ON sleep_logs(user_id, bed_time DESC)');
    await db.query('CREATE INDEX idx_sleep_logs_logged_at ON sleep_logs(user_id, logged_at DESC)');
    await db.query('CREATE INDEX idx_sleep_logs_quality ON sleep_logs(user_id, quality)');

    log.info('sleep_logs table created');
  }

  // ============================================
  // RECOVERY SCORES TABLE
  // ============================================
  if (!(await tableExists('recovery_scores'))) {
    log.info('Creating recovery_scores table...');
    await db.query(`
      CREATE TABLE recovery_scores (
        id TEXT PRIMARY KEY DEFAULT 'rs_' || replace(gen_random_uuid()::text, '-', ''),
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,

        -- Overall score (0-100)
        score INTEGER NOT NULL CHECK (score >= 0 AND score <= 100),

        -- Score classification
        classification TEXT NOT NULL CHECK (classification IN ('poor', 'fair', 'moderate', 'good', 'excellent')),

        -- Component scores breakdown
        factors JSONB NOT NULL DEFAULT '{}',
        /*
         * Example factors:
         * {
         *   "sleep_duration_score": 35,     -- max 40 points (8+ hours = max)
         *   "sleep_quality_score": 25,      -- max 30 points
         *   "rest_days_score": 15,          -- max 20 points
         *   "hrv_bonus": 5,                 -- max 10 points (optional)
         *   "strain_penalty": -10,          -- negative if overtraining
         *   "consistency_bonus": 5          -- bonus for consistent sleep schedule
         * }
         */

        -- Workout recommendation based on score
        recommended_intensity TEXT NOT NULL CHECK (recommended_intensity IN ('rest', 'light', 'moderate', 'normal', 'high')),
        recommended_workout_types TEXT[] DEFAULT '{}',

        -- Recovery trends
        trend TEXT CHECK (trend IN ('improving', 'stable', 'declining')),
        trend_confidence NUMERIC(3,2),

        -- Calculation metadata
        calculated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '24 hours'),

        -- Data sources used for calculation
        data_sources TEXT[] NOT NULL DEFAULT '{}'
      )
    `);

    // Indexes for efficient querying
    await db.query('CREATE INDEX idx_recovery_scores_user_date ON recovery_scores(user_id, calculated_at DESC)');
    // Note: Cannot use partial index with NOW() - use standard index instead
    await db.query('CREATE INDEX idx_recovery_scores_expires ON recovery_scores(user_id, expires_at DESC)');
    await db.query('CREATE INDEX idx_recovery_scores_classification ON recovery_scores(user_id, classification)');

    log.info('recovery_scores table created');
  }

  // ============================================
  // RECOVERY RECOMMENDATIONS TABLE
  // ============================================
  if (!(await tableExists('recovery_recommendations'))) {
    log.info('Creating recovery_recommendations table...');
    await db.query(`
      CREATE TABLE recovery_recommendations (
        id TEXT PRIMARY KEY DEFAULT 'rr_' || replace(gen_random_uuid()::text, '-', ''),
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        recovery_score_id TEXT REFERENCES recovery_scores(id) ON DELETE SET NULL,

        -- Recommendation type
        type TEXT NOT NULL CHECK (type IN ('workout', 'sleep', 'nutrition', 'lifestyle', 'rest')),
        priority INTEGER NOT NULL DEFAULT 1 CHECK (priority >= 1 AND priority <= 5),

        -- Recommendation content
        title TEXT NOT NULL,
        description TEXT NOT NULL,
        action_items JSONB DEFAULT '[]',
        /*
         * Example action_items:
         * [
         *   { "action": "Go to bed 30 minutes earlier tonight", "completed": false },
         *   { "action": "Avoid caffeine after 2 PM", "completed": false }
         * ]
         */

        -- Associated resources
        related_exercise_ids TEXT[] DEFAULT '{}',
        related_tip_ids TEXT[] DEFAULT '{}',

        -- Effectiveness tracking
        acknowledged_at TIMESTAMPTZ,
        followed BOOLEAN,
        feedback TEXT,

        -- Timestamps
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '7 days')
      )
    `);

    await db.query('CREATE INDEX idx_recovery_recommendations_user ON recovery_recommendations(user_id, created_at DESC)');
    // Partial index on acknowledged_at IS NULL (valid - not using NOW())
    await db.query('CREATE INDEX idx_recovery_recommendations_active ON recovery_recommendations(user_id, expires_at DESC) WHERE acknowledged_at IS NULL');
    await db.query('CREATE INDEX idx_recovery_recommendations_score ON recovery_recommendations(recovery_score_id)');

    log.info('recovery_recommendations table created');
  }

  // ============================================
  // SLEEP GOALS TABLE
  // ============================================
  if (!(await tableExists('sleep_goals'))) {
    log.info('Creating sleep_goals table...');
    await db.query(`
      CREATE TABLE sleep_goals (
        id TEXT PRIMARY KEY DEFAULT 'sg_' || replace(gen_random_uuid()::text, '-', ''),
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,

        -- Target sleep duration in hours (e.g., 8.0)
        target_hours NUMERIC(3,1) NOT NULL DEFAULT 8.0 CHECK (target_hours >= 4 AND target_hours <= 12),

        -- Target bed time (stored as time)
        target_bed_time TIME,

        -- Target wake time
        target_wake_time TIME,

        -- Quality goal (1-5)
        target_quality INTEGER DEFAULT 4 CHECK (target_quality IS NULL OR (target_quality >= 1 AND target_quality <= 5)),

        -- Weekly consistency goal (how many nights to hit target)
        consistency_target INTEGER DEFAULT 5 CHECK (consistency_target >= 1 AND consistency_target <= 7),

        -- Active goal (only one active per user)
        is_active BOOLEAN NOT NULL DEFAULT TRUE,

        -- Timestamps
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

        UNIQUE(user_id, is_active) -- Only one active goal per user
      )
    `);

    await db.query('CREATE INDEX idx_sleep_goals_user ON sleep_goals(user_id) WHERE is_active = TRUE');

    log.info('sleep_goals table created');
  }

  // ============================================
  // ADD RECOVERY INTEGRATION TO USERS
  // ============================================
  if (!(await columnExists('users', 'last_recovery_score'))) {
    await db.query(`ALTER TABLE users ADD COLUMN last_recovery_score INTEGER`);
    log.info('Added last_recovery_score column to users');
  }

  if (!(await columnExists('users', 'recovery_score_updated_at'))) {
    await db.query(`ALTER TABLE users ADD COLUMN recovery_score_updated_at TIMESTAMPTZ`);
    log.info('Added recovery_score_updated_at column to users');
  }

  // ============================================
  // CREATE MATERIALIZED VIEW FOR SLEEP STATS
  // ============================================
  // Check if materialized view exists
  const mvExists = await db.queryOne<{ count: string }>(
    `SELECT COUNT(*) as count FROM pg_matviews WHERE schemaname = 'public' AND matviewname = 'mv_sleep_stats'`
  );

  if (parseInt(mvExists?.count || '0') === 0) {
    log.info('Creating mv_sleep_stats materialized view...');
    await db.query(`
      CREATE MATERIALIZED VIEW mv_sleep_stats AS
      SELECT
        user_id,
        DATE_TRUNC('week', bed_time) AS week_start,
        COUNT(*) AS nights_logged,
        ROUND(AVG(sleep_duration_minutes)::numeric, 1) AS avg_duration_minutes,
        ROUND(AVG(quality)::numeric, 2) AS avg_quality,
        MIN(sleep_duration_minutes) AS min_duration_minutes,
        MAX(sleep_duration_minutes) AS max_duration_minutes,
        ROUND(STDDEV(sleep_duration_minutes)::numeric, 1) AS stddev_duration
      FROM sleep_logs
      WHERE bed_time >= NOW() - INTERVAL '90 days'
      GROUP BY user_id, DATE_TRUNC('week', bed_time)
    `);

    await db.query('CREATE UNIQUE INDEX idx_mv_sleep_stats_user_week ON mv_sleep_stats(user_id, week_start)');

    log.info('mv_sleep_stats materialized view created');
  }

  log.info('Migration 092_sleep_recovery_system completed');
}

export async function down(): Promise<void> {
  log.info('Rolling back migration: 092_sleep_recovery_system');

  // Drop materialized view
  await db.query('DROP MATERIALIZED VIEW IF EXISTS mv_sleep_stats CASCADE');

  // Remove columns from users
  await db.query('ALTER TABLE users DROP COLUMN IF EXISTS last_recovery_score');
  await db.query('ALTER TABLE users DROP COLUMN IF EXISTS recovery_score_updated_at');

  // Drop tables in reverse dependency order
  await db.query('DROP TABLE IF EXISTS recovery_recommendations CASCADE');
  await db.query('DROP TABLE IF EXISTS recovery_scores CASCADE');
  await db.query('DROP TABLE IF EXISTS sleep_goals CASCADE');
  await db.query('DROP TABLE IF EXISTS sleep_logs CASCADE');

  log.info('Rollback 092_sleep_recovery_system completed');
}
