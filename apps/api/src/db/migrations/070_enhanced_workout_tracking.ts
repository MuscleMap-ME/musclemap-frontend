/**
 * Migration 070: Enhanced Workout Tracking
 *
 * Adds support for:
 * - Individual workout sets table (instead of JSONB in workouts)
 * - Set tags (warmup, working, failure, drop, cluster, amrap)
 * - RPE (Rate of Perceived Exertion) and RIR (Reps in Reserve)
 * - Estimated 1RM per set
 * - Progress photos
 * - Body measurements
 * - Per-exercise rest timer defaults
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

async function indexExists(indexName: string): Promise<boolean> {
  const result = await db.queryOne<{ count: string }>(
    `SELECT COUNT(*) as count FROM pg_indexes WHERE indexname = $1`,
    [indexName]
  );
  return parseInt(result?.count || '0') > 0;
}

export async function migrate(): Promise<void> {
  log.info('Running migration: 070_enhanced_workout_tracking');

  // ============================================
  // WORKOUT SETS TABLE (Normalized set storage)
  // ============================================
  if (!(await tableExists('workout_sets'))) {
    log.info('Creating workout_sets table...');
    await db.query(`
      CREATE TABLE workout_sets (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        workout_id UUID NOT NULL REFERENCES workouts(id) ON DELETE CASCADE,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        exercise_id TEXT NOT NULL,
        set_number INTEGER NOT NULL,
        weight DECIMAL(10, 2),
        reps INTEGER NOT NULL,
        duration_seconds INTEGER,
        distance_meters DECIMAL(10, 2),
        tag TEXT DEFAULT 'working',
        rpe INTEGER CHECK (rpe >= 1 AND rpe <= 10),
        rir INTEGER CHECK (rir >= 0 AND rir <= 10),
        estimated_1rm DECIMAL(10, 2),
        tempo TEXT,
        notes TEXT,
        is_pr_weight BOOLEAN DEFAULT false,
        is_pr_reps BOOLEAN DEFAULT false,
        is_pr_volume BOOLEAN DEFAULT false,
        is_pr_1rm BOOLEAN DEFAULT false,
        performed_at TIMESTAMP DEFAULT NOW(),
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Indexes for common queries
    if (!(await indexExists('idx_workout_sets_workout_order'))) {
      await db.query(`CREATE INDEX idx_workout_sets_workout_order ON workout_sets(workout_id, set_number)`);
    }
    if (!(await indexExists('idx_workout_sets_user_exercise_time'))) {
      await db.query(`CREATE INDEX idx_workout_sets_user_exercise_time ON workout_sets(user_id, exercise_id, performed_at)`);
    }
    if (!(await indexExists('idx_workout_sets_user_time'))) {
      await db.query(`CREATE INDEX idx_workout_sets_user_time ON workout_sets(user_id, performed_at)`);
    }
    if (!(await indexExists('idx_workout_sets_exercise_weight'))) {
      await db.query(`CREATE INDEX idx_workout_sets_exercise_weight ON workout_sets(exercise_id, weight)`);
    }
    if (!(await indexExists('idx_workout_sets_user_pr_weight'))) {
      await db.query(`CREATE INDEX idx_workout_sets_user_pr_weight ON workout_sets(user_id, is_pr_weight)`);
    }

    log.info('workout_sets table created');
  }

  // ============================================
  // PROGRESS PHOTOS TABLE
  // ============================================
  if (!(await tableExists('progress_photos'))) {
    log.info('Creating progress_photos table...');
    await db.query(`
      CREATE TABLE progress_photos (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        storage_path TEXT NOT NULL,
        thumbnail_path TEXT,
        photo_type TEXT NOT NULL,
        pose TEXT,
        is_private BOOLEAN DEFAULT true,
        weight_kg DECIMAL(5, 2),
        body_fat_percentage DECIMAL(4, 1),
        notes TEXT,
        photo_date DATE NOT NULL,
        created_at TIMESTAMP DEFAULT NOW(),
        deleted_at TIMESTAMP
      )
    `);

    if (!(await indexExists('idx_progress_photos_user_date'))) {
      await db.query(`CREATE INDEX idx_progress_photos_user_date ON progress_photos(user_id, photo_date)`);
    }
    if (!(await indexExists('idx_progress_photos_user_type_date'))) {
      await db.query(`CREATE INDEX idx_progress_photos_user_type_date ON progress_photos(user_id, photo_type, photo_date)`);
    }

    log.info('progress_photos table created');
  }

  // ============================================
  // BODY MEASUREMENTS TABLE
  // ============================================
  if (!(await tableExists('body_measurements'))) {
    log.info('Creating body_measurements table...');
    await db.query(`
      CREATE TABLE body_measurements (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        weight_kg DECIMAL(5, 2),
        body_fat_percentage DECIMAL(4, 1),
        lean_mass_kg DECIMAL(5, 2),
        neck_cm DECIMAL(4, 1),
        shoulders_cm DECIMAL(5, 1),
        chest_cm DECIMAL(5, 1),
        waist_cm DECIMAL(5, 1),
        hips_cm DECIMAL(5, 1),
        left_bicep_cm DECIMAL(4, 1),
        right_bicep_cm DECIMAL(4, 1),
        left_forearm_cm DECIMAL(4, 1),
        right_forearm_cm DECIMAL(4, 1),
        left_thigh_cm DECIMAL(5, 1),
        right_thigh_cm DECIMAL(5, 1),
        left_calf_cm DECIMAL(4, 1),
        right_calf_cm DECIMAL(4, 1),
        measurement_source TEXT DEFAULT 'manual',
        notes TEXT,
        measurement_date DATE NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    if (!(await indexExists('idx_body_measurements_user_date'))) {
      await db.query(`CREATE INDEX idx_body_measurements_user_date ON body_measurements(user_id, measurement_date)`);
    }

    log.info('body_measurements table created');
  }

  // ============================================
  // USER REST TIMER PREFERENCES
  // ============================================
  if (!(await tableExists('user_rest_preferences'))) {
    log.info('Creating user_rest_preferences table...');
    await db.query(`
      CREATE TABLE user_rest_preferences (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE UNIQUE,
        default_rest_seconds INTEGER DEFAULT 90,
        exercise_rest_defaults JSONB DEFAULT '{}',
        auto_start_timer BOOLEAN DEFAULT true,
        timer_sound_enabled BOOLEAN DEFAULT true,
        timer_vibration_enabled BOOLEAN DEFAULT true,
        timer_sound TEXT DEFAULT 'default',
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    log.info('user_rest_preferences table created');
  }

  // ============================================
  // ENHANCE EXERCISE_PERSONAL_RECORDS TABLE
  // ============================================
  if (await tableExists('exercise_personal_records')) {
    if (!(await columnExists('exercise_personal_records', 'best_set_volume'))) {
      log.info('Adding volume columns to exercise_personal_records...');
      await db.query(`ALTER TABLE exercise_personal_records ADD COLUMN best_set_volume DECIMAL(12, 2)`);
    }
    if (!(await columnExists('exercise_personal_records', 'best_workout_volume'))) {
      await db.query(`ALTER TABLE exercise_personal_records ADD COLUMN best_workout_volume DECIMAL(12, 2)`);
    }
    if (!(await columnExists('exercise_personal_records', 'best_reps_at_weight'))) {
      await db.query(`ALTER TABLE exercise_personal_records ADD COLUMN best_reps_at_weight INTEGER`);
    }
    if (!(await columnExists('exercise_personal_records', 'weight_for_best_reps'))) {
      await db.query(`ALTER TABLE exercise_personal_records ADD COLUMN weight_for_best_reps DECIMAL(10, 2)`);
    }
  }

  // ============================================
  // ADD VOLUME TRACKING TO WORKOUTS
  // ============================================
  if (await tableExists('workouts')) {
    if (!(await columnExists('workouts', 'total_sets'))) {
      log.info('Adding volume columns to workouts table...');
      await db.query(`ALTER TABLE workouts ADD COLUMN total_sets INTEGER DEFAULT 0`);
    }
    if (!(await columnExists('workouts', 'total_reps'))) {
      await db.query(`ALTER TABLE workouts ADD COLUMN total_reps INTEGER DEFAULT 0`);
    }
    if (!(await columnExists('workouts', 'total_volume'))) {
      await db.query(`ALTER TABLE workouts ADD COLUMN total_volume DECIMAL(14, 2) DEFAULT 0`);
    }
    if (!(await columnExists('workouts', 'duration_seconds'))) {
      await db.query(`ALTER TABLE workouts ADD COLUMN duration_seconds INTEGER`);
    }
    if (!(await columnExists('workouts', 'pr_count'))) {
      await db.query(`ALTER TABLE workouts ADD COLUMN pr_count INTEGER DEFAULT 0`);
    }
    if (!(await columnExists('workouts', 'muscle_volume'))) {
      await db.query(`ALTER TABLE workouts ADD COLUMN muscle_volume JSONB DEFAULT '{}'`);
    }
  }

  // ============================================
  // CREATE VOLUME HISTORY VIEWS FOR CHARTS
  // ============================================
  log.info('Creating/updating volume views...');

  await db.query(`
    CREATE OR REPLACE VIEW v_weekly_volume AS
    SELECT
      user_id,
      DATE_TRUNC('week', created_at) as week_start,
      exercise_id,
      COALESCE(SUM(weight * reps), 0) as total_volume,
      COALESCE(SUM(reps), 0) as total_reps,
      COUNT(*) as total_sets,
      MAX(weight) as max_weight,
      MAX(estimated_1rm) as best_1rm
    FROM workout_sets
    WHERE tag != 'warmup'
    GROUP BY user_id, DATE_TRUNC('week', created_at), exercise_id
    ORDER BY week_start DESC
  `);

  await db.query(`
    CREATE OR REPLACE VIEW v_daily_volume AS
    SELECT
      user_id,
      DATE(performed_at) as workout_date,
      COALESCE(SUM(weight * reps), 0) as total_volume,
      COALESCE(SUM(reps), 0) as total_reps,
      COUNT(*) as total_sets,
      COUNT(DISTINCT exercise_id) as exercises_count
    FROM workout_sets
    WHERE tag != 'warmup'
    GROUP BY user_id, DATE(performed_at)
    ORDER BY workout_date DESC
  `);

  await db.query(`
    CREATE OR REPLACE VIEW v_muscle_volume_weekly AS
    SELECT
      ws.user_id,
      DATE_TRUNC('week', ws.performed_at) as week_start,
      e.primary_muscle as muscle_group,
      COALESCE(SUM(ws.weight * ws.reps), 0) as total_volume,
      COUNT(*) as total_sets
    FROM workout_sets ws
    JOIN exercises e ON ws.exercise_id = e.id
    WHERE ws.tag != 'warmup'
    GROUP BY ws.user_id, DATE_TRUNC('week', ws.performed_at), e.primary_muscle
    ORDER BY week_start DESC
  `);

  log.info('Migration 070_enhanced_workout_tracking complete');
}
