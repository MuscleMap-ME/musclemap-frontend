// DESTRUCTIVE: Schema modification for exercise groups - contains DROP/TRUNCATE operations
/**
 * Migration 097: Exercise Groups (Supersets, Circuits, Giant Sets)
 *
 * Adds support for grouping exercises together:
 * - exercise_groups table for storing group definitions
 * - Supports supersets (2 exercises), giant sets (3+ exercises), circuits, and drop sets
 * - Each group has configurable rest times (between exercises, after completing group)
 * - Groups maintain exercise order and can be reordered within workouts
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

async function columnExists(tableName: string, columnName: string): Promise<boolean> {
  const result = await db.queryOne<{ count: string }>(
    `SELECT COUNT(*) as count FROM information_schema.columns
     WHERE table_name = $1 AND column_name = $2`,
    [tableName, columnName]
  );
  return parseInt(result?.count || '0') > 0;
}

export async function up(): Promise<void> {
  log.info('Running migration: 097_exercise_groups');

  // ============================================
  // EXERCISE GROUPS TABLE
  // ============================================
  if (!(await tableExists('exercise_groups'))) {
    log.info('Creating exercise_groups table...');
    await db.query(`
      CREATE TABLE exercise_groups (
        id TEXT PRIMARY KEY DEFAULT 'eg_' || replace(gen_random_uuid()::text, '-', ''),

        -- Ownership (can be tied to workout, template, or program)
        workout_id TEXT REFERENCES workouts(id) ON DELETE CASCADE,
        template_id TEXT REFERENCES workout_templates(id) ON DELETE CASCADE,
        program_day_id TEXT, -- For future program integration
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,

        -- Group type
        group_type TEXT NOT NULL CHECK (group_type IN ('superset', 'giant_set', 'circuit', 'drop_set', 'cluster')),

        -- Exercises in the group (ordered array of exercise configurations)
        -- Format: [{ exerciseId, order, sets?, reps?, weight?, duration?, notes? }]
        exercises JSONB NOT NULL DEFAULT '[]',

        -- Rest configuration (in seconds)
        rest_between_exercises INTEGER DEFAULT 0, -- Rest between exercises in group (0 for supersets)
        rest_after_group INTEGER DEFAULT 90, -- Rest after completing full round

        -- Circuit-specific settings
        circuit_rounds INTEGER DEFAULT 1, -- Number of rounds for circuits
        circuit_timed BOOLEAN DEFAULT false, -- Timed rotation mode
        circuit_time_per_exercise INTEGER DEFAULT 30, -- Seconds per exercise in timed mode
        circuit_transition_time INTEGER DEFAULT 10, -- Seconds to transition between exercises

        -- Display settings
        name TEXT, -- Optional custom name (e.g., "Chest Finisher")
        color TEXT DEFAULT '#0066FF', -- Accent color for visual grouping
        position INTEGER DEFAULT 0, -- Order within the workout

        -- Timestamps
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),

        -- Ensure at least one parent reference
        CONSTRAINT exercise_group_parent CHECK (
          workout_id IS NOT NULL OR template_id IS NOT NULL OR program_day_id IS NOT NULL
        )
      )
    `);

    // Indexes for efficient queries
    if (!(await indexExists('idx_exercise_groups_workout'))) {
      await db.query('CREATE INDEX idx_exercise_groups_workout ON exercise_groups(workout_id) WHERE workout_id IS NOT NULL');
    }
    if (!(await indexExists('idx_exercise_groups_template'))) {
      await db.query('CREATE INDEX idx_exercise_groups_template ON exercise_groups(template_id) WHERE template_id IS NOT NULL');
    }
    if (!(await indexExists('idx_exercise_groups_user'))) {
      await db.query('CREATE INDEX idx_exercise_groups_user ON exercise_groups(user_id)');
    }
    if (!(await indexExists('idx_exercise_groups_position'))) {
      await db.query('CREATE INDEX idx_exercise_groups_position ON exercise_groups(workout_id, position) WHERE workout_id IS NOT NULL');
    }
    // GIN index for searching exercises within groups
    if (!(await indexExists('idx_exercise_groups_exercises_gin'))) {
      await db.query('CREATE INDEX idx_exercise_groups_exercises_gin ON exercise_groups USING GIN(exercises jsonb_path_ops)');
    }

    // Trigger for updated_at
    await db.query(`
      CREATE OR REPLACE FUNCTION update_exercise_group_timestamp()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = NOW();
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql
    `);

    await db.query(`
      DROP TRIGGER IF EXISTS trg_exercise_group_updated ON exercise_groups
    `);

    await db.query(`
      CREATE TRIGGER trg_exercise_group_updated
      BEFORE UPDATE ON exercise_groups
      FOR EACH ROW EXECUTE FUNCTION update_exercise_group_timestamp()
    `);

    log.info('exercise_groups table created');
  }

  // ============================================
  // EXERCISE GROUP SET LOGS (For tracking sets within groups)
  // ============================================
  if (!(await tableExists('exercise_group_sets'))) {
    log.info('Creating exercise_group_sets table...');
    await db.query(`
      CREATE TABLE exercise_group_sets (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        group_id TEXT NOT NULL REFERENCES exercise_groups(id) ON DELETE CASCADE,
        workout_id TEXT NOT NULL REFERENCES workouts(id) ON DELETE CASCADE,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,

        -- Set details
        round_number INTEGER NOT NULL DEFAULT 1, -- Which round of the group
        exercise_index INTEGER NOT NULL DEFAULT 0, -- Position in group's exercise array
        exercise_id TEXT NOT NULL,

        -- Performance data
        weight DECIMAL(10, 2),
        reps INTEGER NOT NULL,
        duration_seconds INTEGER,
        rpe INTEGER CHECK (rpe >= 1 AND rpe <= 10),
        rir INTEGER CHECK (rir >= 0 AND rir <= 10),

        -- Notes and metadata
        notes TEXT,
        skipped BOOLEAN DEFAULT false,

        -- Timestamps
        performed_at TIMESTAMPTZ DEFAULT NOW(),
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    if (!(await indexExists('idx_exercise_group_sets_group'))) {
      await db.query('CREATE INDEX idx_exercise_group_sets_group ON exercise_group_sets(group_id)');
    }
    if (!(await indexExists('idx_exercise_group_sets_workout'))) {
      await db.query('CREATE INDEX idx_exercise_group_sets_workout ON exercise_group_sets(workout_id)');
    }
    if (!(await indexExists('idx_exercise_group_sets_user_time'))) {
      await db.query('CREATE INDEX idx_exercise_group_sets_user_time ON exercise_group_sets(user_id, performed_at DESC)');
    }

    log.info('exercise_group_sets table created');
  }

  // ============================================
  // USER EXERCISE GROUP PRESETS (Saved group configurations)
  // ============================================
  if (!(await tableExists('exercise_group_presets'))) {
    log.info('Creating exercise_group_presets table...');
    await db.query(`
      CREATE TABLE exercise_group_presets (
        id TEXT PRIMARY KEY DEFAULT 'egp_' || replace(gen_random_uuid()::text, '-', ''),
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,

        -- Preset details
        name TEXT NOT NULL,
        group_type TEXT NOT NULL CHECK (group_type IN ('superset', 'giant_set', 'circuit', 'drop_set', 'cluster')),
        exercises JSONB NOT NULL DEFAULT '[]',

        -- Rest configuration
        rest_between_exercises INTEGER DEFAULT 0,
        rest_after_group INTEGER DEFAULT 90,

        -- Circuit-specific
        circuit_rounds INTEGER DEFAULT 1,
        circuit_timed BOOLEAN DEFAULT false,
        circuit_time_per_exercise INTEGER DEFAULT 30,

        -- Display
        color TEXT DEFAULT '#0066FF',

        -- Usage tracking
        times_used INTEGER DEFAULT 0,
        last_used_at TIMESTAMPTZ,

        -- Timestamps
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    if (!(await indexExists('idx_exercise_group_presets_user'))) {
      await db.query('CREATE INDEX idx_exercise_group_presets_user ON exercise_group_presets(user_id)');
    }
    if (!(await indexExists('idx_exercise_group_presets_popular'))) {
      await db.query('CREATE INDEX idx_exercise_group_presets_popular ON exercise_group_presets(user_id, times_used DESC)');
    }

    log.info('exercise_group_presets table created');
  }

  // ============================================
  // ADD GROUP REFERENCE TO WORKOUT_SETS
  // ============================================
  if (await tableExists('workout_sets')) {
    if (!(await columnExists('workout_sets', 'group_id'))) {
      log.info('Adding group_id to workout_sets...');
      await db.query(`ALTER TABLE workout_sets ADD COLUMN group_id TEXT REFERENCES exercise_groups(id) ON DELETE SET NULL`);
    }
    if (!(await columnExists('workout_sets', 'group_round'))) {
      await db.query(`ALTER TABLE workout_sets ADD COLUMN group_round INTEGER`);
    }
    if (!(await columnExists('workout_sets', 'group_exercise_index'))) {
      await db.query(`ALTER TABLE workout_sets ADD COLUMN group_exercise_index INTEGER`);
    }
    if (!(await indexExists('idx_workout_sets_group'))) {
      await db.query('CREATE INDEX idx_workout_sets_group ON workout_sets(group_id) WHERE group_id IS NOT NULL');
    }
  }

  // ============================================
  // ADD GROUP SUPPORT TO WORKOUT TEMPLATES
  // ============================================
  if (await tableExists('workout_templates')) {
    if (!(await columnExists('workout_templates', 'exercise_groups'))) {
      log.info('Adding exercise_groups to workout_templates...');
      await db.query(`ALTER TABLE workout_templates ADD COLUMN exercise_groups JSONB DEFAULT '[]'`);
    }
  }

  log.info('Migration 097_exercise_groups completed');
}

export async function down(): Promise<void> {
  log.info('Rolling back migration: 097_exercise_groups');

  // Remove columns from workout_sets
  await db.query('ALTER TABLE workout_sets DROP COLUMN IF EXISTS group_id');
  await db.query('ALTER TABLE workout_sets DROP COLUMN IF EXISTS group_round');
  await db.query('ALTER TABLE workout_sets DROP COLUMN IF EXISTS group_exercise_index');

  // Remove columns from workout_templates
  await db.query('ALTER TABLE workout_templates DROP COLUMN IF EXISTS exercise_groups');

  // Drop tables
  await db.query('DROP TABLE IF EXISTS exercise_group_presets CASCADE');
  await db.query('DROP TABLE IF EXISTS exercise_group_sets CASCADE');
  await db.query('DROP TABLE IF EXISTS exercise_groups CASCADE');

  // Drop functions and triggers
  await db.query('DROP TRIGGER IF EXISTS trg_exercise_group_updated ON exercise_groups');
  await db.query('DROP FUNCTION IF EXISTS update_exercise_group_timestamp()');

  log.info('Rollback 097_exercise_groups completed');
}
