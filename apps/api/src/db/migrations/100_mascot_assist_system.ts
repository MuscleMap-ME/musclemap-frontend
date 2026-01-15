/**
 * Migration: Mascot Assist System
 *
 * Enables the mascot/companion to assist users by completing exercises on their behalf.
 * This is an early-game feature that helps new users maintain workout completion streaks
 * and earn full credit even when they can't complete all exercises.
 *
 * Key features:
 * - Mascot can complete one exercise per workout for low-level users
 * - Daily charge system (mascot gets tired, regenerates daily)
 * - Power grows with user rank and companion stage
 * - Tracks usage history for analytics
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
  log.info('Running migration: 100_mascot_assist_system');

  // =====================================================
  // MASCOT ASSIST ABILITIES (defines what mascot can do at each level)
  // =====================================================

  if (!(await tableExists('mascot_assist_abilities'))) {
    log.info('Creating mascot_assist_abilities table...');
    await db.query(`
      CREATE TABLE mascot_assist_abilities (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT NOT NULL,
        min_companion_stage INTEGER NOT NULL DEFAULT 1,
        max_user_rank_tier INTEGER, -- null = no max (available at all ranks)
        max_exercises_per_workout INTEGER NOT NULL DEFAULT 1,
        daily_charges INTEGER NOT NULL DEFAULT 1,
        cooldown_hours INTEGER DEFAULT 0,
        enabled BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    await db.query(`CREATE INDEX idx_mascot_abilities_stage ON mascot_assist_abilities(min_companion_stage)`);
    await db.query(`CREATE INDEX idx_mascot_abilities_enabled ON mascot_assist_abilities(enabled) WHERE enabled = TRUE`);

    // Seed initial abilities that scale with progression
    log.info('Seeding mascot assist abilities...');
    await db.query(`
      INSERT INTO mascot_assist_abilities (id, name, description, min_companion_stage, max_user_rank_tier, max_exercises_per_workout, daily_charges, cooldown_hours) VALUES
        -- Stage 1: Basic assist for new users only
        ('assist_novice', 'Helping Paw', 'Your companion helps you complete one exercise when you''re too tired', 1, 3, 1, 1, 24),
        -- Stage 2: Slightly better, still for beginners
        ('assist_trainee', 'Training Partner', 'Your companion can complete exercises alongside you', 2, 4, 1, 2, 12),
        -- Stage 3: More charges
        ('assist_apprentice', 'Dedicated Spotter', 'Your companion provides dedicated assistance', 3, 5, 2, 3, 8),
        -- Stage 4: Even more powerful
        ('assist_practitioner', 'Power Boost', 'Your companion channels energy to help you finish strong', 4, 6, 2, 4, 6),
        -- Stage 5: Advanced
        ('assist_expert', 'Elite Support', 'Your companion has mastered the art of assistance', 5, NULL, 3, 5, 4),
        -- Stage 6: Max level
        ('assist_master', 'Perfect Synergy', 'You and your companion work as one', 6, NULL, 3, 6, 0)
      ON CONFLICT (id) DO NOTHING
    `);
  }

  // =====================================================
  // USER MASCOT ASSIST STATE (tracks daily charges per user)
  // =====================================================

  if (!(await tableExists('user_mascot_assist_state'))) {
    log.info('Creating user_mascot_assist_state table...');
    await db.query(`
      CREATE TABLE user_mascot_assist_state (
        user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
        charges_remaining INTEGER NOT NULL DEFAULT 1,
        charges_max INTEGER NOT NULL DEFAULT 1,
        last_charge_reset TIMESTAMPTZ DEFAULT NOW(),
        last_assist_used TIMESTAMPTZ,
        total_assists_used INTEGER DEFAULT 0,
        exercises_assisted_today INTEGER DEFAULT 0,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    await db.query(`CREATE INDEX idx_mascot_assist_state_reset ON user_mascot_assist_state(last_charge_reset)`);
  }

  // =====================================================
  // MASCOT ASSIST LOG (history of assists used)
  // =====================================================

  if (!(await tableExists('mascot_assist_log'))) {
    log.info('Creating mascot_assist_log table...');
    await db.query(`
      CREATE TABLE mascot_assist_log (
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        workout_id TEXT REFERENCES workouts(id) ON DELETE SET NULL,
        exercise_id TEXT NOT NULL,
        exercise_name TEXT,
        ability_id TEXT NOT NULL REFERENCES mascot_assist_abilities(id),
        companion_stage INTEGER NOT NULL,
        user_rank_tier INTEGER NOT NULL,
        sets_completed INTEGER NOT NULL DEFAULT 1,
        reps_completed INTEGER DEFAULT 0,
        weight_used DECIMAL(10,2) DEFAULT 0,
        tu_awarded DECIMAL(10,2) DEFAULT 0,
        reason TEXT, -- 'tired', 'injury_recovery', 'time_constraint', etc.
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    await db.query(`CREATE INDEX idx_mascot_assist_log_user ON mascot_assist_log(user_id, created_at DESC)`);
    await db.query(`CREATE INDEX idx_mascot_assist_log_workout ON mascot_assist_log(workout_id)`);
    await db.query(`CREATE INDEX idx_mascot_assist_log_keyset ON mascot_assist_log(user_id, created_at DESC, id DESC)`);
  }

  // =====================================================
  // ADD COLUMNS TO EXISTING TABLES
  // =====================================================

  // Add mascot_assisted flag to workout exercises (stored in exercise_data JSON)
  // We'll track this in the workout table itself
  if (!(await columnExists('workouts', 'mascot_assisted_exercises'))) {
    log.info('Adding mascot_assisted_exercises column to workouts...');
    await db.query(`
      ALTER TABLE workouts
      ADD COLUMN mascot_assisted_exercises TEXT[] DEFAULT '{}'
    `);
    await db.query(`CREATE INDEX idx_workouts_mascot_assisted ON workouts(id) WHERE array_length(mascot_assisted_exercises, 1) > 0`);
  }

  // Add ability_unlocked_at to user_companion_state for tracking when abilities unlock
  if (!(await columnExists('user_companion_state', 'assist_ability_id'))) {
    log.info('Adding assist_ability_id to user_companion_state...');
    await db.query(`
      ALTER TABLE user_companion_state
      ADD COLUMN assist_ability_id TEXT REFERENCES mascot_assist_abilities(id)
    `);
  }

  // =====================================================
  // FUNCTION: Get current mascot assist ability for user
  // =====================================================

  log.info('Creating get_mascot_assist_ability function...');
  await db.query(`
    CREATE OR REPLACE FUNCTION get_mascot_assist_ability(p_user_id TEXT)
    RETURNS TABLE (
      ability_id TEXT,
      ability_name TEXT,
      max_exercises INTEGER,
      daily_charges INTEGER,
      cooldown_hours INTEGER
    ) AS $$
    DECLARE
      v_companion_stage INTEGER;
      v_user_rank_tier INTEGER;
    BEGIN
      -- Get user's companion stage
      SELECT stage INTO v_companion_stage
      FROM user_companion_state
      WHERE user_id = p_user_id;

      -- Default to stage 1 if no companion state
      v_companion_stage := COALESCE(v_companion_stage, 1);

      -- Get user's rank tier (default to 1 = Novice)
      SELECT COALESCE(
        (SELECT r.tier FROM rank_definitions r
         WHERE r.name = u.current_rank),
        1
      ) INTO v_user_rank_tier
      FROM users u
      WHERE u.id = p_user_id;

      v_user_rank_tier := COALESCE(v_user_rank_tier, 1);

      -- Find the best ability the user qualifies for
      RETURN QUERY
      SELECT
        a.id,
        a.name,
        a.max_exercises_per_workout,
        a.daily_charges,
        a.cooldown_hours
      FROM mascot_assist_abilities a
      WHERE a.enabled = TRUE
        AND a.min_companion_stage <= v_companion_stage
        AND (a.max_user_rank_tier IS NULL OR v_user_rank_tier <= a.max_user_rank_tier)
      ORDER BY a.min_companion_stage DESC
      LIMIT 1;
    END;
    $$ LANGUAGE plpgsql STABLE;
  `);

  // =====================================================
  // FUNCTION: Reset daily mascot charges (called by cron)
  // =====================================================

  log.info('Creating reset_mascot_daily_charges function...');
  await db.query(`
    CREATE OR REPLACE FUNCTION reset_mascot_daily_charges()
    RETURNS INTEGER AS $$
    DECLARE
      v_updated INTEGER := 0;
    BEGIN
      -- Reset charges for users whose last reset was more than 24 hours ago
      WITH ability_lookup AS (
        SELECT
          umas.user_id,
          COALESCE(
            (SELECT a.daily_charges
             FROM mascot_assist_abilities a
             JOIN user_companion_state ucs ON ucs.user_id = umas.user_id
             WHERE a.enabled = TRUE
               AND a.min_companion_stage <= ucs.stage
             ORDER BY a.min_companion_stage DESC
             LIMIT 1),
            1
          ) as max_charges
        FROM user_mascot_assist_state umas
        WHERE umas.last_charge_reset < NOW() - INTERVAL '24 hours'
      )
      UPDATE user_mascot_assist_state umas
      SET
        charges_remaining = al.max_charges,
        charges_max = al.max_charges,
        exercises_assisted_today = 0,
        last_charge_reset = NOW(),
        updated_at = NOW()
      FROM ability_lookup al
      WHERE umas.user_id = al.user_id;

      GET DIAGNOSTICS v_updated = ROW_COUNT;
      RETURN v_updated;
    END;
    $$ LANGUAGE plpgsql;
  `);

  // =====================================================
  // TRIGGER: Auto-create mascot assist state for new users
  // =====================================================

  log.info('Creating mascot assist state trigger...');
  await db.query(`
    CREATE OR REPLACE FUNCTION create_mascot_assist_state()
    RETURNS TRIGGER AS $$
    BEGIN
      INSERT INTO user_mascot_assist_state (user_id, charges_remaining, charges_max)
      VALUES (NEW.user_id, 1, 1)
      ON CONFLICT (user_id) DO NOTHING;
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;
  `);

  // Drop trigger if exists, then create
  await db.query(`DROP TRIGGER IF EXISTS trg_create_mascot_assist_state ON user_companion_state`);
  await db.query(`
    CREATE TRIGGER trg_create_mascot_assist_state
    AFTER INSERT ON user_companion_state
    FOR EACH ROW
    EXECUTE FUNCTION create_mascot_assist_state()
  `);

  log.info('Migration 100_mascot_assist_system complete');
}

export async function down(): Promise<void> {
  log.info('Rolling back migration: 100_mascot_assist_system');

  // Drop triggers
  await db.query(`DROP TRIGGER IF EXISTS trg_create_mascot_assist_state ON user_companion_state`);

  // Drop functions
  await db.query(`DROP FUNCTION IF EXISTS create_mascot_assist_state()`);
  await db.query(`DROP FUNCTION IF EXISTS reset_mascot_daily_charges()`);
  await db.query(`DROP FUNCTION IF EXISTS get_mascot_assist_ability(TEXT)`);

  // Drop columns
  await db.query(`ALTER TABLE user_companion_state DROP COLUMN IF EXISTS assist_ability_id`);
  await db.query(`ALTER TABLE workouts DROP COLUMN IF EXISTS mascot_assisted_exercises`);

  // Drop tables in reverse dependency order
  await db.query(`DROP TABLE IF EXISTS mascot_assist_log`);
  await db.query(`DROP TABLE IF EXISTS user_mascot_assist_state`);
  await db.query(`DROP TABLE IF EXISTS mascot_assist_abilities`);

  log.info('Rollback 100_mascot_assist_system complete');
}

export const migrate = up;
