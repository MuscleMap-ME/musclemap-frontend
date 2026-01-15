/**
 * Migration 105: Mascot Powers Phase 6 - Advanced AI Abilities
 *
 * Implements:
 * - Workout Generator: AI-powered workout plan creation
 * - Injury Prevention: Overtraining monitoring and warnings
 * - Nutrition Hints: Light nutrition guidance
 * - Master Mascot Powers: Top-tier abilities for stage 6 companions
 */

import { query } from '../client';
import { loggers } from '../../lib/logger';

const log = loggers.db;

export async function up(): Promise<void> {
  log.info('Running migration: 105_mascot_powers_phase6');

  // =====================================================
  // WORKOUT GENERATOR SYSTEM
  // =====================================================
  log.info('Creating workout generator tables...');

  // Generated workout programs
  await query(`
    CREATE TABLE IF NOT EXISTS mascot_generated_programs (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      program_name VARCHAR(200) NOT NULL,
      program_type VARCHAR(50) NOT NULL,
      duration_weeks INTEGER DEFAULT 4,
      days_per_week INTEGER DEFAULT 4,
      goal VARCHAR(50) NOT NULL,
      difficulty_level INTEGER DEFAULT 5,
      schedule JSONB DEFAULT '{}',
      workouts JSONB DEFAULT '[]',
      progression_rules JSONB DEFAULT '{}',
      deload_week_number INTEGER,
      equipment_required JSONB DEFAULT '[]',
      generation_params JSONB DEFAULT '{}',
      companion_stage INTEGER NOT NULL,
      credit_cost INTEGER DEFAULT 0,
      status VARCHAR(20) DEFAULT 'active',
      started_at TIMESTAMPTZ,
      completed_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      CONSTRAINT valid_program_type CHECK (program_type IN (
        'strength', 'hypertrophy', 'powerbuilding', 'athletic', 'rehabilitation', 'custom'
      )),
      CONSTRAINT valid_goal CHECK (goal IN (
        'build_muscle', 'increase_strength', 'lose_fat', 'improve_endurance',
        'general_fitness', 'sport_specific', 'rehabilitation'
      )),
      CONSTRAINT valid_status CHECK (status IN ('draft', 'active', 'paused', 'completed', 'abandoned'))
    )
  `);

  await query(`
    CREATE INDEX IF NOT EXISTS idx_programs_user_active
    ON mascot_generated_programs(user_id, status)
    WHERE status = 'active'
  `);

  // Daily workout templates within programs
  await query(`
    CREATE TABLE IF NOT EXISTS mascot_program_workouts (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      program_id UUID NOT NULL REFERENCES mascot_generated_programs(id) ON DELETE CASCADE,
      week_number INTEGER NOT NULL,
      day_number INTEGER NOT NULL,
      workout_name VARCHAR(100),
      focus_areas JSONB DEFAULT '[]',
      exercises JSONB DEFAULT '[]',
      target_duration_minutes INTEGER,
      notes TEXT,
      is_deload BOOLEAN DEFAULT FALSE,
      completed_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  await query(`
    CREATE INDEX IF NOT EXISTS idx_program_workouts_program
    ON mascot_program_workouts(program_id, week_number, day_number)
  `);

  // Workout generator config
  await query(`
    CREATE TABLE IF NOT EXISTS mascot_generator_config (
      min_companion_stage INTEGER PRIMARY KEY,
      can_suggest_single_workout BOOLEAN DEFAULT FALSE,
      can_generate_week_plan BOOLEAN DEFAULT FALSE,
      can_generate_program BOOLEAN DEFAULT FALSE,
      can_auto_periodize BOOLEAN DEFAULT FALSE,
      can_adapt_realtime BOOLEAN DEFAULT FALSE,
      max_program_weeks INTEGER DEFAULT 0,
      credit_cost_per_workout INTEGER DEFAULT 0,
      credit_cost_per_program INTEGER DEFAULT 0
    )
  `);

  await query(`
    INSERT INTO mascot_generator_config VALUES
    (1, FALSE, FALSE, FALSE, FALSE, FALSE, 0, 0, 0),
    (2, FALSE, FALSE, FALSE, FALSE, FALSE, 0, 0, 0),
    (3, FALSE, FALSE, FALSE, FALSE, FALSE, 0, 0, 0),
    (4, FALSE, FALSE, FALSE, FALSE, FALSE, 0, 0, 0),
    (5, TRUE, TRUE, FALSE, FALSE, FALSE, 1, 100, 500),
    (6, TRUE, TRUE, TRUE, TRUE, TRUE, 16, 25, 100)
    ON CONFLICT (min_companion_stage) DO NOTHING
  `);

  // =====================================================
  // INJURY PREVENTION SYSTEM
  // =====================================================
  log.info('Creating injury prevention tables...');

  // Volume tracking per muscle group over time
  await query(`
    CREATE TABLE IF NOT EXISTS mascot_volume_tracking (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      muscle_group VARCHAR(50) NOT NULL,
      week_start DATE NOT NULL,
      total_sets INTEGER DEFAULT 0,
      total_reps INTEGER DEFAULT 0,
      total_volume INTEGER DEFAULT 0,
      average_intensity DECIMAL(4,2),
      frequency INTEGER DEFAULT 0,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(user_id, muscle_group, week_start)
    )
  `);

  await query(`
    CREATE INDEX IF NOT EXISTS idx_volume_tracking_user_week
    ON mascot_volume_tracking(user_id, week_start DESC)
  `);

  // Overtraining warnings
  await query(`
    CREATE TABLE IF NOT EXISTS mascot_overtraining_alerts (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      alert_type VARCHAR(50) NOT NULL,
      affected_area VARCHAR(100),
      risk_level VARCHAR(20) DEFAULT 'low',
      current_volume INTEGER,
      recommended_volume INTEGER,
      recommendation TEXT,
      companion_stage INTEGER NOT NULL,
      acknowledged BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      CONSTRAINT valid_alert_type CHECK (alert_type IN (
        'high_volume', 'imbalance', 'insufficient_recovery', 'progressive_overload_stall',
        'mobility_concern', 'deload_recommended'
      )),
      CONSTRAINT valid_risk_level CHECK (risk_level IN ('low', 'medium', 'high', 'critical'))
    )
  `);

  await query(`
    CREATE INDEX IF NOT EXISTS idx_overtraining_user_active
    ON mascot_overtraining_alerts(user_id, created_at DESC)
    WHERE acknowledged = FALSE
  `);

  // Recovery day recommendations
  await query(`
    CREATE TABLE IF NOT EXISTS mascot_recovery_recs (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      recommendation_type VARCHAR(50) NOT NULL,
      suggested_date DATE,
      reason TEXT,
      activities_suggested JSONB DEFAULT '[]',
      companion_stage INTEGER NOT NULL,
      followed BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      CONSTRAINT valid_rec_type CHECK (recommendation_type IN (
        'rest_day', 'active_recovery', 'deload_week', 'mobility_focus', 'sleep_focus'
      ))
    )
  `);

  // Injury prevention config per stage
  await query(`
    CREATE TABLE IF NOT EXISTS mascot_injury_prevention_config (
      min_companion_stage INTEGER PRIMARY KEY,
      can_track_volume BOOLEAN DEFAULT FALSE,
      can_warn_imbalance BOOLEAN DEFAULT FALSE,
      can_suggest_recovery BOOLEAN DEFAULT FALSE,
      can_recommend_mobility BOOLEAN DEFAULT FALSE,
      can_full_monitoring BOOLEAN DEFAULT FALSE
    )
  `);

  await query(`
    INSERT INTO mascot_injury_prevention_config VALUES
    (1, FALSE, FALSE, FALSE, FALSE, FALSE),
    (2, FALSE, FALSE, FALSE, FALSE, FALSE),
    (3, FALSE, FALSE, FALSE, FALSE, FALSE),
    (4, TRUE, TRUE, FALSE, FALSE, FALSE),
    (5, TRUE, TRUE, TRUE, TRUE, FALSE),
    (6, TRUE, TRUE, TRUE, TRUE, TRUE)
    ON CONFLICT (min_companion_stage) DO NOTHING
  `);

  // =====================================================
  // NUTRITION HINTS SYSTEM
  // =====================================================
  log.info('Creating nutrition hints tables...');

  // Nutrition hints (light guidance, not full meal planning)
  await query(`
    CREATE TABLE IF NOT EXISTS mascot_nutrition_hints (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      hint_type VARCHAR(50) NOT NULL,
      timing VARCHAR(50),
      message TEXT NOT NULL,
      context_workout_id UUID REFERENCES workouts(id),
      companion_stage INTEGER NOT NULL,
      shown BOOLEAN DEFAULT FALSE,
      helpful_rating INTEGER,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      CONSTRAINT valid_hint_type CHECK (hint_type IN (
        'protein_timing', 'hydration', 'pre_workout', 'post_workout',
        'recovery_nutrition', 'caloric_adjustment', 'general_tip'
      )),
      CONSTRAINT valid_timing CHECK (timing IN (
        'before_workout', 'during_workout', 'after_workout', 'morning', 'evening', 'anytime'
      ))
    )
  `);

  // Nutrition hint templates
  await query(`
    CREATE TABLE IF NOT EXISTS mascot_nutrition_templates (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      hint_type VARCHAR(50) NOT NULL,
      timing VARCHAR(50),
      template TEXT NOT NULL,
      variables JSONB DEFAULT '[]',
      min_companion_stage INTEGER DEFAULT 3,
      enabled BOOLEAN DEFAULT TRUE
    )
  `);

  // Seed nutrition hint templates
  await query(`
    INSERT INTO mascot_nutrition_templates (hint_type, timing, template, variables, min_companion_stage) VALUES
    ('protein_timing', 'after_workout', 'Great workout! Try to get {protein_grams}g of protein within the next hour.', '["protein_grams"]', 3),
    ('hydration', 'before_workout', 'Remember to hydrate! Aim for at least 500ml of water before your workout.', '[]', 3),
    ('pre_workout', 'before_workout', 'A small carb-rich snack 30-60 minutes before can boost your performance.', '[]', 3),
    ('post_workout', 'after_workout', 'Your muscles are primed for growth! Combine protein with carbs for optimal recovery.', '[]', 3),
    ('recovery_nutrition', 'evening', 'You trained {muscle_groups} today. Quality sleep and protein support recovery.', '["muscle_groups"]', 4),
    ('caloric_adjustment', 'anytime', 'Based on your {goal} goal, you might benefit from {adjustment} calories.', '["goal", "adjustment"]', 5),
    ('general_tip', 'anytime', 'Consistency beats perfection. Keep up the great work!', '[]', 3)
    ON CONFLICT DO NOTHING
  `);

  // Nutrition hints config per stage
  await query(`
    CREATE TABLE IF NOT EXISTS mascot_nutrition_config (
      min_companion_stage INTEGER PRIMARY KEY,
      can_hint_protein BOOLEAN DEFAULT FALSE,
      can_hint_hydration BOOLEAN DEFAULT FALSE,
      can_hint_timing BOOLEAN DEFAULT FALSE,
      can_suggest_adjustments BOOLEAN DEFAULT FALSE,
      can_full_guidance BOOLEAN DEFAULT FALSE
    )
  `);

  await query(`
    INSERT INTO mascot_nutrition_config VALUES
    (1, FALSE, FALSE, FALSE, FALSE, FALSE),
    (2, FALSE, FALSE, FALSE, FALSE, FALSE),
    (3, TRUE, TRUE, FALSE, FALSE, FALSE),
    (4, TRUE, TRUE, TRUE, FALSE, FALSE),
    (5, TRUE, TRUE, TRUE, TRUE, FALSE),
    (6, TRUE, TRUE, TRUE, TRUE, TRUE)
    ON CONFLICT (min_companion_stage) DO NOTHING
  `);

  // =====================================================
  // MASTER MASCOT POWERS (Stage 6 Only)
  // =====================================================
  log.info('Creating master mascot powers tables...');

  // Master ability unlocks
  await query(`
    CREATE TABLE IF NOT EXISTS mascot_master_abilities (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      ability_key VARCHAR(100) NOT NULL UNIQUE,
      ability_name VARCHAR(200) NOT NULL,
      description TEXT,
      category VARCHAR(50) NOT NULL,
      unlock_requirements JSONB DEFAULT '{}',
      credit_cost INTEGER DEFAULT 0,
      enabled BOOLEAN DEFAULT TRUE,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      CONSTRAINT valid_category CHECK (category IN (
        'workout', 'social', 'economy', 'analytics', 'customization'
      ))
    )
  `);

  // Seed master abilities
  await query(`
    INSERT INTO mascot_master_abilities (ability_key, ability_name, description, category, unlock_requirements, credit_cost) VALUES
    ('unlimited_assist', 'Unlimited Exercise Assist', 'Your companion can assist with unlimited exercises per workout', 'workout', '{"companion_stage": 6}', 0),
    ('instant_energy', 'Instant Energy Regeneration', 'Mascot energy regenerates instantly after use', 'workout', '{"companion_stage": 6}', 0),
    ('full_program_gen', 'Full Program Generation', 'Generate complete 16-week periodized training programs', 'workout', '{"companion_stage": 6}', 100),
    ('auto_social_manager', 'Auto Social Manager', 'Mascot handles all social interactions optimally', 'social', '{"companion_stage": 6}', 0),
    ('unlimited_streak_save', 'Unlimited Streak Saves', 'Never lose a streak - mascot protects them all', 'economy', '{"companion_stage": 6}', 0),
    ('max_bonus_multiplier', 'Maximum Bonus Multiplier', '25% base bonus + 60% max consecutive bonus on all workouts', 'economy', '{"companion_stage": 6}', 0),
    ('full_analytics', 'Full Performance Analytics', 'Complete analysis with AI-powered recommendations', 'analytics', '{"companion_stage": 6}', 0),
    ('custom_mascot_persona', 'Custom Mascot Persona', 'Fully customize your companion''s personality and responses', 'customization', '{"companion_stage": 6}', 500)
    ON CONFLICT (ability_key) DO NOTHING
  `);

  // User master ability unlocks
  await query(`
    CREATE TABLE IF NOT EXISTS user_master_abilities (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      ability_id UUID NOT NULL REFERENCES mascot_master_abilities(id),
      unlocked_at TIMESTAMPTZ DEFAULT NOW(),
      credits_spent INTEGER DEFAULT 0,
      UNIQUE(user_id, ability_id)
    )
  `);

  await query(`
    CREATE INDEX IF NOT EXISTS idx_user_master_abilities
    ON user_master_abilities(user_id)
  `);

  // =====================================================
  // UNIFIED MASCOT POWER SUMMARY VIEW
  // =====================================================
  log.info('Creating unified power summary view...');

  await query(`
    CREATE OR REPLACE VIEW mascot_power_summary AS
    SELECT
      ucs.user_id,
      ucs.stage AS companion_stage,
      ucs.energy,
      ucs.max_energy,

      -- Phase 1: Assist
      (SELECT ability_name FROM mascot_assist_abilities maa
       WHERE maa.min_companion_stage <= ucs.stage
       ORDER BY min_companion_stage DESC LIMIT 1) AS current_assist_ability,

      -- Phase 2: Economy
      (SELECT first_workout_bonus FROM mascot_bonus_config
       WHERE min_companion_stage <= ucs.stage
       ORDER BY min_companion_stage DESC LIMIT 1) AS bonus_multiplier,
      (SELECT weekly_saves FROM mascot_streak_saver_config
       WHERE min_companion_stage <= ucs.stage
       ORDER BY min_companion_stage DESC LIMIT 1) AS weekly_streak_saves,

      -- Phase 3: Journey
      (SELECT feature_level FROM mascot_scheduler_config
       WHERE min_companion_stage <= ucs.stage
       ORDER BY min_companion_stage DESC LIMIT 1) AS scheduler_level,

      -- Phase 4: Social
      (SELECT can_auto_highfive FROM mascot_highfive_config
       WHERE min_companion_stage <= ucs.stage
       ORDER BY min_companion_stage DESC LIMIT 1) AS can_auto_highfive,
      (SELECT can_trash_talk FROM mascot_rivalry_config
       WHERE min_companion_stage <= ucs.stage
       ORDER BY min_companion_stage DESC LIMIT 1) AS can_trash_talk,

      -- Phase 5: Meta
      (SELECT can_detect_anomalies FROM mascot_data_guardian_config
       WHERE min_companion_stage <= ucs.stage
       ORDER BY min_companion_stage DESC LIMIT 1) AS data_protection_level,

      -- Phase 6: Advanced
      (SELECT can_generate_program FROM mascot_generator_config
       WHERE min_companion_stage <= ucs.stage
       ORDER BY min_companion_stage DESC LIMIT 1) AS can_generate_programs,
      (SELECT can_full_monitoring FROM mascot_injury_prevention_config
       WHERE min_companion_stage <= ucs.stage
       ORDER BY min_companion_stage DESC LIMIT 1) AS has_injury_prevention,

      -- Master abilities count
      (SELECT COUNT(*) FROM user_master_abilities uma
       WHERE uma.user_id = ucs.user_id) AS master_abilities_unlocked

    FROM user_companion_state ucs
  `);

  // =====================================================
  // HELPER FUNCTIONS
  // =====================================================
  log.info('Creating helper functions...');

  // Get all mascot powers for a user
  await query(`
    CREATE OR REPLACE FUNCTION get_all_mascot_powers(p_user_id TEXT)
    RETURNS JSONB AS $$
    DECLARE
      v_result JSONB;
      v_stage INTEGER;
    BEGIN
      SELECT COALESCE(stage, 1) INTO v_stage
      FROM user_companion_state WHERE user_id = p_user_id;

      SELECT jsonb_build_object(
        'companion_stage', v_stage,
        'phase1_assist', (SELECT row_to_json(t) FROM (
          SELECT * FROM mascot_assist_abilities WHERE min_companion_stage <= v_stage
          ORDER BY min_companion_stage DESC LIMIT 1
        ) t),
        'phase2_economy', jsonb_build_object(
          'bonus_config', (SELECT row_to_json(t) FROM (
            SELECT * FROM mascot_bonus_config WHERE min_companion_stage <= v_stage
            ORDER BY min_companion_stage DESC LIMIT 1
          ) t),
          'streak_saver', (SELECT row_to_json(t) FROM (
            SELECT * FROM mascot_streak_saver_config WHERE min_companion_stage <= v_stage
            ORDER BY min_companion_stage DESC LIMIT 1
          ) t)
        ),
        'phase3_journey', jsonb_build_object(
          'scheduler', (SELECT row_to_json(t) FROM (
            SELECT * FROM mascot_scheduler_config WHERE min_companion_stage <= v_stage
            ORDER BY min_companion_stage DESC LIMIT 1
          ) t),
          'form_finder', (SELECT row_to_json(t) FROM (
            SELECT * FROM mascot_form_finder_config WHERE min_companion_stage <= v_stage
            ORDER BY min_companion_stage DESC LIMIT 1
          ) t),
          'progress', (SELECT row_to_json(t) FROM (
            SELECT * FROM mascot_progress_config WHERE min_companion_stage <= v_stage
            ORDER BY min_companion_stage DESC LIMIT 1
          ) t)
        ),
        'phase4_social', jsonb_build_object(
          'crew_helper', (SELECT row_to_json(t) FROM (
            SELECT * FROM mascot_crew_helper_config WHERE min_companion_stage <= v_stage
            ORDER BY min_companion_stage DESC LIMIT 1
          ) t),
          'rivalry', (SELECT row_to_json(t) FROM (
            SELECT * FROM mascot_rivalry_config WHERE min_companion_stage <= v_stage
            ORDER BY min_companion_stage DESC LIMIT 1
          ) t),
          'highfive', (SELECT row_to_json(t) FROM (
            SELECT * FROM mascot_highfive_config WHERE min_companion_stage <= v_stage
            ORDER BY min_companion_stage DESC LIMIT 1
          ) t)
        ),
        'phase5_meta', jsonb_build_object(
          'settings', (SELECT row_to_json(t) FROM (
            SELECT * FROM mascot_settings_config WHERE min_companion_stage <= v_stage
            ORDER BY min_companion_stage DESC LIMIT 1
          ) t),
          'data_guardian', (SELECT row_to_json(t) FROM (
            SELECT * FROM mascot_data_guardian_config WHERE min_companion_stage <= v_stage
            ORDER BY min_companion_stage DESC LIMIT 1
          ) t),
          'subscription', (SELECT row_to_json(t) FROM (
            SELECT * FROM mascot_subscription_config WHERE min_companion_stage <= v_stage
            ORDER BY min_companion_stage DESC LIMIT 1
          ) t)
        ),
        'phase6_advanced', jsonb_build_object(
          'generator', (SELECT row_to_json(t) FROM (
            SELECT * FROM mascot_generator_config WHERE min_companion_stage <= v_stage
            ORDER BY min_companion_stage DESC LIMIT 1
          ) t),
          'injury_prevention', (SELECT row_to_json(t) FROM (
            SELECT * FROM mascot_injury_prevention_config WHERE min_companion_stage <= v_stage
            ORDER BY min_companion_stage DESC LIMIT 1
          ) t),
          'nutrition', (SELECT row_to_json(t) FROM (
            SELECT * FROM mascot_nutrition_config WHERE min_companion_stage <= v_stage
            ORDER BY min_companion_stage DESC LIMIT 1
          ) t)
        ),
        'master_abilities', (
          SELECT COALESCE(jsonb_agg(mma.ability_key), '[]'::jsonb)
          FROM user_master_abilities uma
          JOIN mascot_master_abilities mma ON mma.id = uma.ability_id
          WHERE uma.user_id = p_user_id
        )
      ) INTO v_result;

      RETURN v_result;
    END;
    $$ LANGUAGE plpgsql
  `);

  log.info('Migration 105_mascot_powers_phase6 complete');
}

export async function down(): Promise<void> {
  log.info('Rolling back migration: 105_mascot_powers_phase6');

  await query(`DROP FUNCTION IF EXISTS get_all_mascot_powers(TEXT)`);
  await query(`DROP VIEW IF EXISTS mascot_power_summary`);

  await query(`DROP TABLE IF EXISTS user_master_abilities`);
  await query(`DROP TABLE IF EXISTS mascot_master_abilities`);
  await query(`DROP TABLE IF EXISTS mascot_nutrition_config`);
  await query(`DROP TABLE IF EXISTS mascot_nutrition_templates`);
  await query(`DROP TABLE IF EXISTS mascot_nutrition_hints`);
  await query(`DROP TABLE IF EXISTS mascot_injury_prevention_config`);
  await query(`DROP TABLE IF EXISTS mascot_recovery_recs`);
  await query(`DROP TABLE IF EXISTS mascot_overtraining_alerts`);
  await query(`DROP TABLE IF EXISTS mascot_volume_tracking`);
  await query(`DROP TABLE IF EXISTS mascot_generator_config`);
  await query(`DROP TABLE IF EXISTS mascot_program_workouts`);
  await query(`DROP TABLE IF EXISTS mascot_generated_programs`);

  log.info('Rollback 105_mascot_powers_phase6 complete');
}
