// DESTRUCTIVE: Schema modification for rpe rir tracking - contains DROP/TRUNCATE operations
/**
 * Migration 097: RPE/RIR Tracking Enhancements
 *
 * Adds support for:
 * - Default RPE targets for user exercise preferences
 * - RPE trend tracking view
 * - Indexes for efficient RPE analysis queries
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
  log.info('Running migration: 097_rpe_rir_tracking');

  // ============================================
  // ADD DEFAULT_RPE_TARGET TO USER_EXERCISE_PREFERENCES
  // ============================================
  if (await tableExists('user_exercise_preferences')) {
    if (!(await columnExists('user_exercise_preferences', 'default_rpe_target'))) {
      log.info('Adding default_rpe_target column...');
      await db.query(`
        ALTER TABLE user_exercise_preferences
        ADD COLUMN default_rpe_target SMALLINT CHECK (default_rpe_target >= 1 AND default_rpe_target <= 10)
      `);
    }
    if (!(await columnExists('user_exercise_preferences', 'default_rir_target'))) {
      log.info('Adding default_rir_target column...');
      await db.query(`
        ALTER TABLE user_exercise_preferences
        ADD COLUMN default_rir_target SMALLINT CHECK (default_rir_target >= 0 AND default_rir_target <= 10)
      `);
    }
  }

  // ============================================
  // ADD INDEXES FOR RPE ANALYSIS QUERIES
  // ============================================
  if (await tableExists('workout_sets')) {
    // Index for RPE trend queries (user + exercise + time + RPE)
    if (!(await indexExists('idx_workout_sets_rpe_trend'))) {
      log.info('Creating RPE trend index...');
      await db.query(`
        CREATE INDEX idx_workout_sets_rpe_trend
        ON workout_sets(user_id, exercise_id, performed_at DESC)
        WHERE rpe IS NOT NULL
      `);
    }

    // Index for fatigue detection (user + date + RPE)
    if (!(await indexExists('idx_workout_sets_fatigue'))) {
      log.info('Creating fatigue analysis index...');
      await db.query(`
        CREATE INDEX idx_workout_sets_fatigue
        ON workout_sets(user_id, DATE(performed_at), rpe)
        WHERE tag != 'warmup'
      `);
    }
  }

  // ============================================
  // CREATE RPE TREND VIEW FOR EFFICIENT ANALYSIS
  // ============================================
  log.info('Creating RPE trend views...');

  // Daily RPE averages per exercise
  await db.query(`
    CREATE OR REPLACE VIEW v_rpe_daily_trends AS
    SELECT
      user_id,
      exercise_id,
      DATE(performed_at) as workout_date,
      ROUND(AVG(rpe), 1) as avg_rpe,
      ROUND(AVG(rir), 1) as avg_rir,
      COUNT(*) as set_count,
      ROUND(AVG(weight), 1) as avg_weight,
      MAX(weight) as max_weight,
      ROUND(AVG(reps), 1) as avg_reps
    FROM workout_sets
    WHERE rpe IS NOT NULL AND tag != 'warmup'
    GROUP BY user_id, exercise_id, DATE(performed_at)
    ORDER BY workout_date DESC
  `);

  // Weekly RPE trends for fatigue detection
  await db.query(`
    CREATE OR REPLACE VIEW v_rpe_weekly_trends AS
    SELECT
      user_id,
      exercise_id,
      DATE_TRUNC('week', performed_at) as week_start,
      ROUND(AVG(rpe), 2) as avg_rpe,
      ROUND(AVG(rir), 2) as avg_rir,
      COUNT(*) as total_sets,
      ROUND(STDDEV(rpe), 2) as rpe_variance,
      MIN(rpe) as min_rpe,
      MAX(rpe) as max_rpe,
      ROUND(AVG(weight), 1) as avg_weight,
      ROUND(SUM(weight * reps), 0) as total_volume
    FROM workout_sets
    WHERE rpe IS NOT NULL AND tag != 'warmup'
    GROUP BY user_id, exercise_id, DATE_TRUNC('week', performed_at)
    ORDER BY week_start DESC
  `);

  // User's overall RPE pattern by time of day
  await db.query(`
    CREATE OR REPLACE VIEW v_rpe_time_patterns AS
    SELECT
      user_id,
      EXTRACT(HOUR FROM performed_at) as hour_of_day,
      ROUND(AVG(rpe), 2) as avg_rpe,
      COUNT(*) as set_count
    FROM workout_sets
    WHERE rpe IS NOT NULL AND tag != 'warmup'
    GROUP BY user_id, EXTRACT(HOUR FROM performed_at)
    ORDER BY hour_of_day
  `);

  // ============================================
  // CREATE RPE HISTORY TABLE FOR TRACKING
  // ============================================
  if (!(await tableExists('rpe_snapshots'))) {
    log.info('Creating rpe_snapshots table...');
    await db.query(`
      CREATE TABLE rpe_snapshots (
        id TEXT PRIMARY KEY DEFAULT 'rpe_' || replace(gen_random_uuid()::text, '-', ''),
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        snapshot_date DATE NOT NULL,
        avg_rpe NUMERIC(3, 1),
        avg_rir NUMERIC(3, 1),
        total_sets INT,
        fatigue_score INT CHECK (fatigue_score >= 0 AND fatigue_score <= 100),
        recovery_recommendation TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(user_id, snapshot_date)
      )
    `);

    await db.query('CREATE INDEX idx_rpe_snapshots_user_date ON rpe_snapshots(user_id, snapshot_date DESC)');
    log.info('rpe_snapshots table created');
  }

  log.info('Migration 097_rpe_rir_tracking complete');
}

// Alias for migration runner
export const migrate = up;

export async function down(): Promise<void> {
  log.info('Rolling back migration: 097_rpe_rir_tracking');

  await db.query('DROP TABLE IF EXISTS rpe_snapshots CASCADE');
  await db.query('DROP VIEW IF EXISTS v_rpe_time_patterns CASCADE');
  await db.query('DROP VIEW IF EXISTS v_rpe_weekly_trends CASCADE');
  await db.query('DROP VIEW IF EXISTS v_rpe_daily_trends CASCADE');
  await db.query('DROP INDEX IF EXISTS idx_workout_sets_fatigue');
  await db.query('DROP INDEX IF EXISTS idx_workout_sets_rpe_trend');

  if (await tableExists('user_exercise_preferences')) {
    if (await columnExists('user_exercise_preferences', 'default_rpe_target')) {
      await db.query('ALTER TABLE user_exercise_preferences DROP COLUMN default_rpe_target');
    }
    if (await columnExists('user_exercise_preferences', 'default_rir_target')) {
      await db.query('ALTER TABLE user_exercise_preferences DROP COLUMN default_rir_target');
    }
  }

  log.info('Rollback complete');
}
