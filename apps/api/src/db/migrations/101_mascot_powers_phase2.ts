/**
 * Migration 101: Mascot Powers Phase 2 - Credit & Economy Assistance
 *
 * Implements:
 * - Credit Guardian: Warns users about low balance
 * - Streak Saver: Protects valuable streaks
 * - Bonus Multiplier: Increases TU earnings
 * - Mascot Energy System: Resource for using abilities
 */

import { query } from '../client';
import { loggers } from '../../lib/logger';

const log = loggers.db;

export async function up(): Promise<void> {
  log.info('Running migration: 101_mascot_powers_phase2');

  // =====================================================
  // CREDIT GUARDIAN SYSTEM
  // =====================================================
  log.info('Creating credit guardian tables...');

  await query(`
    CREATE TABLE IF NOT EXISTS mascot_credit_alerts (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      alert_type VARCHAR(50) NOT NULL,
      threshold_amount INTEGER,
      current_balance INTEGER,
      workout_cost INTEGER,
      message TEXT,
      dismissed BOOLEAN DEFAULT FALSE,
      dismissed_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      CONSTRAINT valid_alert_type CHECK (alert_type IN (
        'low_balance_warning',
        'insufficient_funds',
        'approaching_zero',
        'negative_balance_risk',
        'coupon_available',
        'loan_available'
      ))
    )
  `);

  await query(`
    CREATE INDEX IF NOT EXISTS idx_credit_alerts_user_active
    ON mascot_credit_alerts(user_id, created_at DESC)
    WHERE dismissed = FALSE
  `);

  // Credit guardian configuration per stage
  await query(`
    CREATE TABLE IF NOT EXISTS mascot_credit_guardian_config (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      min_companion_stage INTEGER NOT NULL,
      feature_name VARCHAR(50) NOT NULL,
      enabled BOOLEAN DEFAULT TRUE,
      config JSONB DEFAULT '{}',
      created_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(min_companion_stage, feature_name)
    )
  `);

  // Seed credit guardian features by stage
  await query(`
    INSERT INTO mascot_credit_guardian_config (min_companion_stage, feature_name, config) VALUES
    (1, 'balance_warning', '{"threshold_multiplier": 1.5}'),
    (2, 'earn_suggestions', '{"show_daily_bonus": true, "show_streaks": true}'),
    (3, 'auto_apply_coupons', '{"enabled": true}'),
    (4, 'negotiated_rate', '{"discount_percent": 10}'),
    (5, 'credit_loan', '{"max_loan_amount": 500, "interest_rate": 0}'),
    (6, 'emergency_grant', '{"daily_limit": 100, "occasions": ["streak_save", "workout_completion"]}')
    ON CONFLICT (min_companion_stage, feature_name) DO NOTHING
  `);

  // =====================================================
  // STREAK SAVER SYSTEM
  // =====================================================
  log.info('Creating streak saver tables...');

  await query(`
    CREATE TABLE IF NOT EXISTS mascot_streak_saves (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      streak_type VARCHAR(50) NOT NULL,
      streak_value INTEGER NOT NULL,
      credits_spent INTEGER DEFAULT 0,
      mascot_energy_used INTEGER DEFAULT 0,
      companion_stage INTEGER NOT NULL,
      saved_at TIMESTAMPTZ DEFAULT NOW(),
      expires_at TIMESTAMPTZ,
      CONSTRAINT valid_streak_type CHECK (streak_type IN (
        'workout_streak',
        'login_streak',
        'goal_streak',
        'challenge_streak'
      ))
    )
  `);

  await query(`
    CREATE INDEX IF NOT EXISTS idx_streak_saves_user_date
    ON mascot_streak_saves(user_id, saved_at DESC)
  `);

  // Streak saver configuration per stage
  await query(`
    CREATE TABLE IF NOT EXISTS mascot_streak_saver_config (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      min_companion_stage INTEGER NOT NULL UNIQUE,
      weekly_saves INTEGER NOT NULL DEFAULT 0,
      credit_cost INTEGER NOT NULL DEFAULT 50,
      energy_cost INTEGER NOT NULL DEFAULT 10,
      can_save_any_streak BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  // Seed streak saver config by stage
  await query(`
    INSERT INTO mascot_streak_saver_config (min_companion_stage, weekly_saves, credit_cost, energy_cost, can_save_any_streak) VALUES
    (1, 0, 100, 20, FALSE),
    (2, 0, 75, 15, FALSE),
    (3, 1, 50, 10, FALSE),
    (4, 2, 40, 8, FALSE),
    (5, 3, 25, 5, TRUE),
    (6, 999, 0, 0, TRUE)
    ON CONFLICT (min_companion_stage) DO NOTHING
  `);

  // Track weekly streak save usage
  await query(`
    CREATE TABLE IF NOT EXISTS user_streak_save_usage (
      user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      saves_used_this_week INTEGER DEFAULT 0,
      week_start DATE NOT NULL DEFAULT DATE_TRUNC('week', CURRENT_DATE),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  // =====================================================
  // BONUS MULTIPLIER SYSTEM
  // =====================================================
  log.info('Creating bonus multiplier tables...');

  await query(`
    CREATE TABLE IF NOT EXISTS mascot_bonus_log (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      workout_id UUID REFERENCES workouts(id) ON DELETE SET NULL,
      bonus_type VARCHAR(50) NOT NULL,
      base_tu INTEGER NOT NULL,
      multiplier DECIMAL(4,2) NOT NULL,
      bonus_tu INTEGER NOT NULL,
      companion_stage INTEGER NOT NULL,
      consecutive_days INTEGER DEFAULT 0,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      CONSTRAINT valid_bonus_type CHECK (bonus_type IN (
        'first_workout_of_day',
        'consecutive_day_bonus',
        'streak_multiplier',
        'perfect_week',
        'mascot_boost',
        'special_event'
      ))
    )
  `);

  await query(`
    CREATE INDEX IF NOT EXISTS idx_bonus_log_user_date
    ON mascot_bonus_log(user_id, created_at DESC)
  `);

  // Bonus multiplier configuration per stage
  await query(`
    CREATE TABLE IF NOT EXISTS mascot_bonus_config (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      min_companion_stage INTEGER NOT NULL UNIQUE,
      first_workout_bonus DECIMAL(4,2) NOT NULL DEFAULT 1.00,
      consecutive_day_bonus DECIMAL(4,2) NOT NULL DEFAULT 0.00,
      max_consecutive_bonus DECIMAL(4,2) NOT NULL DEFAULT 0.00,
      rare_item_chance DECIMAL(4,3) NOT NULL DEFAULT 0.000,
      guaranteed_daily_item BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  // Seed bonus config by stage
  await query(`
    INSERT INTO mascot_bonus_config
    (min_companion_stage, first_workout_bonus, consecutive_day_bonus, max_consecutive_bonus, rare_item_chance, guaranteed_daily_item) VALUES
    (1, 1.05, 0.00, 0.00, 0.000, FALSE),
    (2, 1.10, 0.00, 0.00, 0.000, FALSE),
    (3, 1.10, 0.05, 0.15, 0.000, FALSE),
    (4, 1.15, 0.10, 0.30, 0.000, FALSE),
    (5, 1.20, 0.15, 0.45, 0.010, FALSE),
    (6, 1.25, 0.20, 0.60, 0.050, TRUE)
    ON CONFLICT (min_companion_stage) DO NOTHING
  `);

  // Track user's consecutive workout days
  await query(`
    CREATE TABLE IF NOT EXISTS user_workout_streak_state (
      user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      consecutive_days INTEGER DEFAULT 0,
      last_workout_date DATE,
      current_multiplier DECIMAL(4,2) DEFAULT 1.00,
      items_earned_today INTEGER DEFAULT 0,
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  // =====================================================
  // MASCOT ENERGY SYSTEM
  // =====================================================
  log.info('Creating mascot energy system...');

  // Add energy columns to companion state
  await query(`
    ALTER TABLE user_companion_state
    ADD COLUMN IF NOT EXISTS energy INTEGER DEFAULT 100,
    ADD COLUMN IF NOT EXISTS max_energy INTEGER DEFAULT 100,
    ADD COLUMN IF NOT EXISTS energy_regen_rate INTEGER DEFAULT 10,
    ADD COLUMN IF NOT EXISTS last_energy_update TIMESTAMPTZ DEFAULT NOW()
  `);

  // Energy regeneration per stage
  await query(`
    CREATE TABLE IF NOT EXISTS mascot_energy_config (
      min_companion_stage INTEGER PRIMARY KEY,
      max_energy INTEGER NOT NULL DEFAULT 100,
      regen_per_hour INTEGER NOT NULL DEFAULT 10,
      regen_on_workout INTEGER NOT NULL DEFAULT 20
    )
  `);

  await query(`
    INSERT INTO mascot_energy_config (min_companion_stage, max_energy, regen_per_hour, regen_on_workout) VALUES
    (1, 100, 10, 20),
    (2, 120, 12, 25),
    (3, 150, 15, 30),
    (4, 200, 20, 40),
    (5, 300, 30, 50),
    (6, 999, 100, 100)
    ON CONFLICT (min_companion_stage) DO NOTHING
  `);

  // =====================================================
  // HELPER FUNCTIONS
  // =====================================================
  log.info('Creating helper functions...');

  // Function to get current bonus multiplier for user
  await query(`
    CREATE OR REPLACE FUNCTION get_user_bonus_multiplier(p_user_id TEXT)
    RETURNS TABLE(
      total_multiplier DECIMAL(4,2),
      first_workout_bonus DECIMAL(4,2),
      consecutive_bonus DECIMAL(4,2),
      consecutive_days INTEGER,
      companion_stage INTEGER
    ) AS $$
    DECLARE
      v_stage INTEGER;
      v_consecutive INTEGER;
      v_last_workout DATE;
      v_config RECORD;
      v_first_bonus DECIMAL(4,2);
      v_consec_bonus DECIMAL(4,2);
    BEGIN
      SELECT COALESCE(stage, 1) INTO v_stage
      FROM user_companion_state WHERE user_id = p_user_id;

      IF v_stage IS NULL THEN v_stage := 1; END IF;

      SELECT COALESCE(uws.consecutive_days, 0), uws.last_workout_date
      INTO v_consecutive, v_last_workout
      FROM user_workout_streak_state uws WHERE user_id = p_user_id;

      IF v_consecutive IS NULL THEN v_consecutive := 0; END IF;

      IF v_last_workout IS NOT NULL AND v_last_workout < CURRENT_DATE - INTERVAL '1 day' THEN
        v_consecutive := 0;
      END IF;

      SELECT * INTO v_config
      FROM mascot_bonus_config
      WHERE min_companion_stage <= v_stage
      ORDER BY min_companion_stage DESC
      LIMIT 1;

      IF v_config IS NULL THEN
        v_first_bonus := 1.00;
        v_consec_bonus := 0.00;
      ELSE
        v_first_bonus := v_config.first_workout_bonus;
        v_consec_bonus := LEAST(
          v_consecutive * v_config.consecutive_day_bonus,
          v_config.max_consecutive_bonus
        );
      END IF;

      RETURN QUERY SELECT
        (v_first_bonus + v_consec_bonus)::DECIMAL(4,2),
        v_first_bonus,
        v_consec_bonus,
        v_consecutive,
        v_stage;
    END;
    $$ LANGUAGE plpgsql
  `);

  // Function to regenerate mascot energy
  await query(`
    CREATE OR REPLACE FUNCTION regenerate_mascot_energy(p_user_id TEXT)
    RETURNS INTEGER AS $$
    DECLARE
      v_state RECORD;
      v_config RECORD;
      v_hours_elapsed DECIMAL;
      v_energy_to_add INTEGER;
      v_new_energy INTEGER;
    BEGIN
      SELECT energy, max_energy, last_energy_update, stage
      INTO v_state
      FROM user_companion_state
      WHERE user_id = p_user_id;

      IF v_state IS NULL THEN
        RETURN 100;
      END IF;

      SELECT * INTO v_config
      FROM mascot_energy_config
      WHERE min_companion_stage <= COALESCE(v_state.stage, 1)
      ORDER BY min_companion_stage DESC
      LIMIT 1;

      IF v_config IS NULL THEN
        v_config.max_energy := 100;
        v_config.regen_per_hour := 10;
      END IF;

      v_hours_elapsed := EXTRACT(EPOCH FROM (NOW() - v_state.last_energy_update)) / 3600;
      v_energy_to_add := FLOOR(v_hours_elapsed * v_config.regen_per_hour);

      IF v_energy_to_add > 0 THEN
        v_new_energy := LEAST(v_state.energy + v_energy_to_add, v_config.max_energy);

        UPDATE user_companion_state
        SET energy = v_new_energy,
            max_energy = v_config.max_energy,
            last_energy_update = NOW()
        WHERE user_id = p_user_id;

        RETURN v_new_energy;
      END IF;

      RETURN v_state.energy;
    END;
    $$ LANGUAGE plpgsql
  `);

  // Function to reset weekly streak save usage
  await query(`
    CREATE OR REPLACE FUNCTION reset_weekly_streak_saves()
    RETURNS INTEGER AS $$
    DECLARE
      v_updated INTEGER;
    BEGIN
      UPDATE user_streak_save_usage
      SET saves_used_this_week = 0,
          week_start = DATE_TRUNC('week', CURRENT_DATE),
          updated_at = NOW()
      WHERE week_start < DATE_TRUNC('week', CURRENT_DATE);

      GET DIAGNOSTICS v_updated = ROW_COUNT;
      RETURN v_updated;
    END;
    $$ LANGUAGE plpgsql
  `);

  // =====================================================
  // INDEXES FOR PERFORMANCE
  // =====================================================
  log.info('Creating performance indexes...');

  await query(`
    CREATE INDEX IF NOT EXISTS idx_bonus_log_workout
    ON mascot_bonus_log(workout_id)
    WHERE workout_id IS NOT NULL
  `);

  await query(`
    CREATE INDEX IF NOT EXISTS idx_streak_saves_week
    ON mascot_streak_saves(user_id, saved_at)
    WHERE saved_at > CURRENT_DATE - INTERVAL '7 days'
  `);

  log.info('Migration 101_mascot_powers_phase2 complete');
}

export async function down(): Promise<void> {
  log.info('Rolling back migration: 101_mascot_powers_phase2');

  await query(`DROP FUNCTION IF EXISTS reset_weekly_streak_saves()`);
  await query(`DROP FUNCTION IF EXISTS regenerate_mascot_energy(TEXT)`);
  await query(`DROP FUNCTION IF EXISTS get_user_bonus_multiplier(TEXT)`);

  await query(`DROP TABLE IF EXISTS mascot_energy_config`);
  await query(`DROP TABLE IF EXISTS user_workout_streak_state`);
  await query(`DROP TABLE IF EXISTS mascot_bonus_config`);
  await query(`DROP TABLE IF EXISTS mascot_bonus_log`);
  await query(`DROP TABLE IF EXISTS user_streak_save_usage`);
  await query(`DROP TABLE IF EXISTS mascot_streak_saver_config`);
  await query(`DROP TABLE IF EXISTS mascot_streak_saves`);
  await query(`DROP TABLE IF EXISTS mascot_credit_guardian_config`);
  await query(`DROP TABLE IF EXISTS mascot_credit_alerts`);

  await query(`
    ALTER TABLE user_companion_state
    DROP COLUMN IF EXISTS energy,
    DROP COLUMN IF EXISTS max_energy,
    DROP COLUMN IF EXISTS energy_regen_rate,
    DROP COLUMN IF EXISTS last_energy_update
  `);

  log.info('Rollback 101_mascot_powers_phase2 complete');
}
