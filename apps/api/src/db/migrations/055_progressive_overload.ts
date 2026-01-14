/**
 * Migration: Progressive Overload Tracking System
 *
 * Adds tracking for progressive overload recommendations:
 * - Exercise personal records (PRs)
 * - Progression history per exercise
 * - Personalized volume/intensity targets
 * - Plateau detection flags
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

export async function up(): Promise<void> {
  log.info('Running migration: 055_progressive_overload');

  // ============================================
  // EXERCISE PERSONAL RECORDS TABLE
  // ============================================
  if (!(await tableExists('exercise_personal_records'))) {
    log.info('Creating exercise_personal_records table...');
    await db.query(`
      CREATE TABLE exercise_personal_records (
        id TEXT PRIMARY KEY DEFAULT 'pr_' || replace(gen_random_uuid()::text, '-', ''),
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        exercise_id TEXT NOT NULL,

        -- Record types
        record_type TEXT NOT NULL CHECK (record_type IN (
          'weight_1rm', 'weight_5rm', 'weight_10rm',
          'max_reps', 'max_volume', 'max_duration'
        )),

        -- Values
        value NUMERIC NOT NULL,
        reps INTEGER, -- For weight records, the rep count
        bodyweight NUMERIC, -- User's bodyweight at time of PR (for relative strength)

        -- Context
        workout_id TEXT,
        set_number INTEGER,

        -- Timestamps
        achieved_at TIMESTAMPTZ NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW(),

        CONSTRAINT unique_user_exercise_record UNIQUE (user_id, exercise_id, record_type)
      )
    `);

    await db.query('CREATE INDEX idx_prs_user ON exercise_personal_records(user_id)');
    await db.query('CREATE INDEX idx_prs_exercise ON exercise_personal_records(user_id, exercise_id)');
    await db.query('CREATE INDEX idx_prs_recent ON exercise_personal_records(achieved_at DESC)');

    log.info('exercise_personal_records table created');
  }

  // ============================================
  // EXERCISE PROGRESSION HISTORY TABLE
  // ============================================
  if (!(await tableExists('exercise_progression_history'))) {
    log.info('Creating exercise_progression_history table...');
    await db.query(`
      CREATE TABLE exercise_progression_history (
        id TEXT PRIMARY KEY DEFAULT 'eph_' || replace(gen_random_uuid()::text, '-', ''),
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        exercise_id TEXT NOT NULL,

        -- Aggregated metrics for period
        period_start DATE NOT NULL,
        period_end DATE NOT NULL,
        period_type TEXT DEFAULT 'week' CHECK (period_type IN ('day', 'week', 'month')),

        -- Volume metrics
        total_sets INTEGER DEFAULT 0,
        total_reps INTEGER DEFAULT 0,
        total_volume NUMERIC DEFAULT 0, -- weight * reps

        -- Intensity metrics
        max_weight NUMERIC,
        avg_weight NUMERIC,
        estimated_1rm NUMERIC, -- Calculated e1RM

        -- Progression status
        progression_status TEXT DEFAULT 'maintaining' CHECK (progression_status IN (
          'progressing', 'maintaining', 'plateaued', 'regressing', 'deloading'
        )),

        created_at TIMESTAMPTZ DEFAULT NOW(),

        CONSTRAINT unique_user_exercise_period UNIQUE (user_id, exercise_id, period_start, period_type)
      )
    `);

    await db.query('CREATE INDEX idx_progression_user ON exercise_progression_history(user_id)');
    await db.query('CREATE INDEX idx_progression_exercise ON exercise_progression_history(user_id, exercise_id)');
    await db.query('CREATE INDEX idx_progression_period ON exercise_progression_history(period_start DESC)');

    log.info('exercise_progression_history table created');
  }

  // ============================================
  // PROGRESSION TARGETS TABLE
  // ============================================
  if (!(await tableExists('progression_targets'))) {
    log.info('Creating progression_targets table...');
    await db.query(`
      CREATE TABLE progression_targets (
        id TEXT PRIMARY KEY DEFAULT 'pt_' || replace(gen_random_uuid()::text, '-', ''),
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        exercise_id TEXT, -- NULL means global target

        -- Target type
        target_type TEXT NOT NULL CHECK (target_type IN (
          'weight', 'reps', 'volume', 'frequency'
        )),

        -- Current and target values
        current_value NUMERIC NOT NULL,
        target_value NUMERIC NOT NULL,

        -- Progression strategy
        increment_value NUMERIC, -- How much to increase by
        increment_frequency TEXT DEFAULT 'session', -- session, week, milestone

        -- Status
        is_active BOOLEAN DEFAULT TRUE,
        achieved_at TIMESTAMPTZ,
        target_date DATE, -- Optional deadline

        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    await db.query('CREATE INDEX idx_targets_user ON progression_targets(user_id)');
    await db.query('CREATE INDEX idx_targets_exercise ON progression_targets(user_id, exercise_id)');
    await db.query('CREATE INDEX idx_targets_active ON progression_targets(user_id, is_active) WHERE is_active = TRUE');

    log.info('progression_targets table created');
  }

  log.info('Migration 055_progressive_overload completed');
}

export async function down(): Promise<void> {
  log.info('Rolling back migration: 055_progressive_overload');

  await db.query('DROP TABLE IF EXISTS progression_targets CASCADE');
  await db.query('DROP TABLE IF EXISTS exercise_progression_history CASCADE');
  await db.query('DROP TABLE IF EXISTS exercise_personal_records CASCADE');

  log.info('Rollback 055_progressive_overload completed');
}
