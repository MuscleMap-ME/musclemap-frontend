/**
 * Migration 102: Mascot Powers Phase 3 - Journey & Progress Assistance
 *
 * Implements:
 * - Smart Scheduler: Recovery-aware workout suggestions
 * - Form Finder: Exercise alternatives and progressions
 * - Progress Tracker: Milestone predictions and weakness identification
 */

import { query } from '../client';
import { loggers } from '../../lib/logger';

const log = loggers.db;

export async function up(): Promise<void> {
  log.info('Running migration: 102_mascot_powers_phase3');

  // =====================================================
  // SMART SCHEDULER SYSTEM
  // =====================================================
  log.info('Creating smart scheduler tables...');

  // User preferences for scheduling
  await query(`
    CREATE TABLE IF NOT EXISTS mascot_scheduler_prefs (
      user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      preferred_workout_times JSONB DEFAULT '[]',
      preferred_days JSONB DEFAULT '["monday","tuesday","wednesday","thursday","friday"]',
      excluded_muscle_groups JSONB DEFAULT '[]',
      equipment_available JSONB DEFAULT '[]',
      workout_duration_minutes INTEGER DEFAULT 60,
      goal_priority VARCHAR(50) DEFAULT 'balanced',
      auto_schedule_enabled BOOLEAN DEFAULT FALSE,
      notification_hours_before INTEGER DEFAULT 2,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW(),
      CONSTRAINT valid_goal_priority CHECK (goal_priority IN (
        'strength', 'hypertrophy', 'endurance', 'fat_loss', 'balanced', 'rehabilitation'
      ))
    )
  `);

  // Muscle recovery tracking
  await query(`
    CREATE TABLE IF NOT EXISTS user_muscle_recovery (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      muscle_group VARCHAR(50) NOT NULL,
      last_trained_at TIMESTAMPTZ NOT NULL,
      volume_last_session INTEGER DEFAULT 0,
      intensity_level INTEGER DEFAULT 5,
      estimated_recovery_hours INTEGER DEFAULT 48,
      recovery_complete_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(user_id, muscle_group)
    )
  `);

  await query(`
    CREATE INDEX IF NOT EXISTS idx_muscle_recovery_user
    ON user_muscle_recovery(user_id, recovery_complete_at)
  `);

  // Scheduled workout suggestions
  await query(`
    CREATE TABLE IF NOT EXISTS mascot_workout_suggestions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      suggested_for DATE NOT NULL,
      suggestion_type VARCHAR(50) NOT NULL,
      focus_muscle_groups JSONB DEFAULT '[]',
      recommended_exercises JSONB DEFAULT '[]',
      estimated_duration_minutes INTEGER,
      reason TEXT,
      companion_stage INTEGER NOT NULL,
      accepted BOOLEAN,
      accepted_at TIMESTAMPTZ,
      dismissed BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      CONSTRAINT valid_suggestion_type CHECK (suggestion_type IN (
        'recovery_based', 'goal_aligned', 'periodization', 'muscle_balance', 'time_optimal'
      ))
    )
  `);

  await query(`
    CREATE INDEX IF NOT EXISTS idx_suggestions_user_date
    ON mascot_workout_suggestions(user_id, suggested_for)
    WHERE dismissed = FALSE
  `);

  // Smart scheduler config per stage
  await query(`
    CREATE TABLE IF NOT EXISTS mascot_scheduler_config (
      min_companion_stage INTEGER PRIMARY KEY,
      feature_level VARCHAR(20) NOT NULL,
      can_suggest_timing BOOLEAN DEFAULT FALSE,
      can_suggest_muscle_rotation BOOLEAN DEFAULT FALSE,
      can_use_recovery_data BOOLEAN DEFAULT FALSE,
      can_align_with_goals BOOLEAN DEFAULT FALSE,
      can_do_periodization BOOLEAN DEFAULT FALSE,
      can_manage_programs BOOLEAN DEFAULT FALSE
    )
  `);

  await query(`
    INSERT INTO mascot_scheduler_config VALUES
    (1, 'basic', TRUE, FALSE, FALSE, FALSE, FALSE, FALSE),
    (2, 'rotation', TRUE, TRUE, FALSE, FALSE, FALSE, FALSE),
    (3, 'recovery', TRUE, TRUE, TRUE, FALSE, FALSE, FALSE),
    (4, 'goals', TRUE, TRUE, TRUE, TRUE, FALSE, FALSE),
    (5, 'periodization', TRUE, TRUE, TRUE, TRUE, TRUE, FALSE),
    (6, 'full', TRUE, TRUE, TRUE, TRUE, TRUE, TRUE)
    ON CONFLICT (min_companion_stage) DO NOTHING
  `);

  // =====================================================
  // FORM FINDER SYSTEM
  // =====================================================
  log.info('Creating form finder tables...');

  // User exercise preferences (what they like/avoid)
  await query(`
    CREATE TABLE IF NOT EXISTS user_exercise_preferences (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      exercise_id UUID NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,
      preference_type VARCHAR(20) NOT NULL,
      reason VARCHAR(100),
      created_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(user_id, exercise_id),
      CONSTRAINT valid_preference CHECK (preference_type IN (
        'favorite', 'avoid', 'injured', 'no_equipment', 'too_difficult', 'too_easy'
      ))
    )
  `);

  await query(`
    CREATE INDEX IF NOT EXISTS idx_exercise_prefs_user
    ON user_exercise_preferences(user_id, preference_type)
  `);

  // Exercise alternative suggestions log
  await query(`
    CREATE TABLE IF NOT EXISTS mascot_exercise_suggestions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      original_exercise_id UUID NOT NULL REFERENCES exercises(id),
      suggested_exercise_id UUID NOT NULL REFERENCES exercises(id),
      suggestion_reason VARCHAR(50) NOT NULL,
      companion_stage INTEGER NOT NULL,
      accepted BOOLEAN,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      CONSTRAINT valid_reason CHECK (suggestion_reason IN (
        'similar_activation', 'easier_variation', 'harder_variation',
        'equipment_available', 'user_preference', 'recovery_friendly'
      ))
    )
  `);

  // Form finder config per stage
  await query(`
    CREATE TABLE IF NOT EXISTS mascot_form_finder_config (
      min_companion_stage INTEGER PRIMARY KEY,
      can_suggest_alternatives BOOLEAN DEFAULT FALSE,
      can_suggest_progressions BOOLEAN DEFAULT FALSE,
      can_remember_equipment BOOLEAN DEFAULT FALSE,
      can_track_avoidances BOOLEAN DEFAULT FALSE,
      can_build_routines BOOLEAN DEFAULT FALSE,
      can_adapt_realtime BOOLEAN DEFAULT FALSE
    )
  `);

  await query(`
    INSERT INTO mascot_form_finder_config VALUES
    (1, TRUE, FALSE, FALSE, FALSE, FALSE, FALSE),
    (2, TRUE, TRUE, FALSE, FALSE, FALSE, FALSE),
    (3, TRUE, TRUE, TRUE, FALSE, FALSE, FALSE),
    (4, TRUE, TRUE, TRUE, TRUE, FALSE, FALSE),
    (5, TRUE, TRUE, TRUE, TRUE, TRUE, FALSE),
    (6, TRUE, TRUE, TRUE, TRUE, TRUE, TRUE)
    ON CONFLICT (min_companion_stage) DO NOTHING
  `);

  // =====================================================
  // PROGRESS TRACKER SYSTEM
  // =====================================================
  log.info('Creating progress tracker tables...');

  // Milestone predictions
  await query(`
    CREATE TABLE IF NOT EXISTS mascot_milestone_predictions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      milestone_type VARCHAR(50) NOT NULL,
      milestone_name VARCHAR(100) NOT NULL,
      current_value DECIMAL(10,2),
      target_value DECIMAL(10,2) NOT NULL,
      estimated_completion DATE,
      confidence_percent INTEGER DEFAULT 50,
      factors JSONB DEFAULT '{}',
      companion_stage INTEGER NOT NULL,
      achieved BOOLEAN DEFAULT FALSE,
      achieved_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW(),
      CONSTRAINT valid_milestone_type CHECK (milestone_type IN (
        'rank_up', 'achievement', 'pr_1rm', 'volume_goal', 'streak',
        'weight_goal', 'body_composition', 'skill_unlock'
      ))
    )
  `);

  await query(`
    CREATE INDEX IF NOT EXISTS idx_milestones_user_active
    ON mascot_milestone_predictions(user_id, estimated_completion)
    WHERE achieved = FALSE
  `);

  // Weakness identification
  await query(`
    CREATE TABLE IF NOT EXISTS mascot_weakness_analysis (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      weakness_type VARCHAR(50) NOT NULL,
      area VARCHAR(100) NOT NULL,
      severity INTEGER DEFAULT 1,
      recommendation TEXT,
      exercises_to_focus JSONB DEFAULT '[]',
      companion_stage INTEGER NOT NULL,
      addressed BOOLEAN DEFAULT FALSE,
      addressed_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      CONSTRAINT valid_weakness_type CHECK (weakness_type IN (
        'muscle_imbalance', 'movement_pattern', 'volume_deficit',
        'frequency_gap', 'progression_stall', 'recovery_issue'
      )),
      CONSTRAINT valid_severity CHECK (severity BETWEEN 1 AND 5)
    )
  `);

  await query(`
    CREATE INDEX IF NOT EXISTS idx_weakness_user
    ON mascot_weakness_analysis(user_id, addressed)
    WHERE addressed = FALSE
  `);

  // Progress celebrations log
  await query(`
    CREATE TABLE IF NOT EXISTS mascot_celebrations (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      celebration_type VARCHAR(50) NOT NULL,
      title VARCHAR(200) NOT NULL,
      description TEXT,
      value_achieved DECIMAL(10,2),
      previous_value DECIMAL(10,2),
      companion_stage INTEGER NOT NULL,
      shown_to_user BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      CONSTRAINT valid_celebration CHECK (celebration_type IN (
        'new_pr', 'rank_up', 'achievement_unlocked', 'streak_milestone',
        'volume_record', 'consistency_award', 'goal_reached'
      ))
    )
  `);

  // Progress tracker config per stage
  await query(`
    CREATE TABLE IF NOT EXISTS mascot_progress_config (
      min_companion_stage INTEGER PRIMARY KEY,
      can_celebrate_prs BOOLEAN DEFAULT FALSE,
      can_show_weekly_summary BOOLEAN DEFAULT FALSE,
      can_predict_milestones BOOLEAN DEFAULT FALSE,
      can_compare_similar_users BOOLEAN DEFAULT FALSE,
      can_identify_weaknesses BOOLEAN DEFAULT FALSE,
      can_full_analytics BOOLEAN DEFAULT FALSE
    )
  `);

  await query(`
    INSERT INTO mascot_progress_config VALUES
    (1, TRUE, FALSE, FALSE, FALSE, FALSE, FALSE),
    (2, TRUE, TRUE, FALSE, FALSE, FALSE, FALSE),
    (3, TRUE, TRUE, TRUE, FALSE, FALSE, FALSE),
    (4, TRUE, TRUE, TRUE, TRUE, FALSE, FALSE),
    (5, TRUE, TRUE, TRUE, TRUE, TRUE, FALSE),
    (6, TRUE, TRUE, TRUE, TRUE, TRUE, TRUE)
    ON CONFLICT (min_companion_stage) DO NOTHING
  `);

  // =====================================================
  // HELPER FUNCTIONS
  // =====================================================
  log.info('Creating helper functions...');

  // Function to get suggested workout for today
  await query(`
    CREATE OR REPLACE FUNCTION get_mascot_workout_suggestion(p_user_id UUID)
    RETURNS TABLE(
      suggestion_id UUID,
      suggested_for DATE,
      focus_muscles JSONB,
      exercises JSONB,
      duration_minutes INTEGER,
      reason TEXT
    ) AS $$
    BEGIN
      RETURN QUERY
      SELECT
        s.id,
        s.suggested_for,
        s.focus_muscle_groups,
        s.recommended_exercises,
        s.estimated_duration_minutes,
        s.reason
      FROM mascot_workout_suggestions s
      WHERE s.user_id = p_user_id
        AND s.suggested_for = CURRENT_DATE
        AND s.dismissed = FALSE
        AND s.accepted IS NULL
      ORDER BY s.created_at DESC
      LIMIT 1;
    END;
    $$ LANGUAGE plpgsql
  `);

  // Function to update muscle recovery after workout
  await query(`
    CREATE OR REPLACE FUNCTION update_muscle_recovery(
      p_user_id UUID,
      p_muscle_group VARCHAR(50),
      p_volume INTEGER,
      p_intensity INTEGER
    ) RETURNS VOID AS $$
    DECLARE
      v_recovery_hours INTEGER;
    BEGIN
      v_recovery_hours := CASE
        WHEN p_intensity >= 8 THEN 72
        WHEN p_intensity >= 6 THEN 48
        ELSE 24
      END;

      INSERT INTO user_muscle_recovery
        (user_id, muscle_group, last_trained_at, volume_last_session, intensity_level, estimated_recovery_hours, recovery_complete_at)
      VALUES
        (p_user_id, p_muscle_group, NOW(), p_volume, p_intensity, v_recovery_hours, NOW() + (v_recovery_hours || ' hours')::INTERVAL)
      ON CONFLICT (user_id, muscle_group) DO UPDATE SET
        last_trained_at = NOW(),
        volume_last_session = p_volume,
        intensity_level = p_intensity,
        estimated_recovery_hours = v_recovery_hours,
        recovery_complete_at = NOW() + (v_recovery_hours || ' hours')::INTERVAL;
    END;
    $$ LANGUAGE plpgsql
  `);

  // Function to get recovered muscle groups
  await query(`
    CREATE OR REPLACE FUNCTION get_recovered_muscles(p_user_id UUID)
    RETURNS TABLE(muscle_group VARCHAR(50), hours_since_recovery DECIMAL) AS $$
    BEGIN
      RETURN QUERY
      SELECT
        r.muscle_group,
        EXTRACT(EPOCH FROM (NOW() - r.recovery_complete_at)) / 3600 AS hours_since_recovery
      FROM user_muscle_recovery r
      WHERE r.user_id = p_user_id
        AND r.recovery_complete_at <= NOW()
      ORDER BY hours_since_recovery DESC;
    END;
    $$ LANGUAGE plpgsql
  `);

  log.info('Migration 102_mascot_powers_phase3 complete');
}

export async function down(): Promise<void> {
  log.info('Rolling back migration: 102_mascot_powers_phase3');

  await query(`DROP FUNCTION IF EXISTS get_recovered_muscles(UUID)`);
  await query(`DROP FUNCTION IF EXISTS update_muscle_recovery(UUID, VARCHAR, INTEGER, INTEGER)`);
  await query(`DROP FUNCTION IF EXISTS get_mascot_workout_suggestion(UUID)`);

  await query(`DROP TABLE IF EXISTS mascot_progress_config`);
  await query(`DROP TABLE IF EXISTS mascot_celebrations`);
  await query(`DROP TABLE IF EXISTS mascot_weakness_analysis`);
  await query(`DROP TABLE IF EXISTS mascot_milestone_predictions`);
  await query(`DROP TABLE IF EXISTS mascot_form_finder_config`);
  await query(`DROP TABLE IF EXISTS mascot_exercise_suggestions`);
  await query(`DROP TABLE IF EXISTS user_exercise_preferences`);
  await query(`DROP TABLE IF EXISTS mascot_scheduler_config`);
  await query(`DROP TABLE IF EXISTS mascot_workout_suggestions`);
  await query(`DROP TABLE IF EXISTS user_muscle_recovery`);
  await query(`DROP TABLE IF EXISTS mascot_scheduler_prefs`);

  log.info('Rollback 102_mascot_powers_phase3 complete');
}
