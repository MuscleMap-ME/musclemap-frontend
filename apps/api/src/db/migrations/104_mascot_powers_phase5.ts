/**
 * Migration 104: Mascot Powers Phase 5 - Account & Meta Assistance
 *
 * Implements:
 * - Settings Optimizer: Tutorial guidance and UI preferences
 * - Data Guardian: Data integrity and backup monitoring
 * - Subscription Assistant: Premium feature recommendations
 */

import { query } from '../client';
import { loggers } from '../../lib/logger';

const log = loggers.db;

export async function up(): Promise<void> {
  log.info('Running migration: 104_mascot_powers_phase5');

  // =====================================================
  // SETTINGS OPTIMIZER SYSTEM
  // =====================================================
  log.info('Creating settings optimizer tables...');

  // Tutorial progress tracking
  await query(`
    CREATE TABLE IF NOT EXISTS mascot_tutorial_progress (
      user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      onboarding_complete BOOLEAN DEFAULT FALSE,
      completed_steps JSONB DEFAULT '[]',
      current_step VARCHAR(50),
      hints_shown JSONB DEFAULT '[]',
      companion_interactions INTEGER DEFAULT 0,
      last_hint_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  // Setting suggestions from mascot
  await query(`
    CREATE TABLE IF NOT EXISTS mascot_setting_suggestions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      setting_category VARCHAR(50) NOT NULL,
      setting_key VARCHAR(100) NOT NULL,
      current_value TEXT,
      suggested_value TEXT,
      reason TEXT,
      companion_stage INTEGER NOT NULL,
      applied BOOLEAN DEFAULT FALSE,
      dismissed BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      CONSTRAINT valid_category CHECK (setting_category IN (
        'notifications', 'privacy', 'display', 'workout', 'social', 'performance'
      ))
    )
  `);

  await query(`
    CREATE INDEX IF NOT EXISTS idx_setting_suggestions_user
    ON mascot_setting_suggestions(user_id, setting_category)
    WHERE applied = FALSE AND dismissed = FALSE
  `);

  // UI preference learning
  await query(`
    CREATE TABLE IF NOT EXISTS mascot_ui_learning (
      user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      preferred_theme VARCHAR(20) DEFAULT 'system',
      preferred_density VARCHAR(20) DEFAULT 'comfortable',
      preferred_animations BOOLEAN DEFAULT TRUE,
      frequently_used_features JSONB DEFAULT '[]',
      rarely_used_features JSONB DEFAULT '[]',
      interaction_patterns JSONB DEFAULT '{}',
      companion_stage INTEGER DEFAULT 1,
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  // Settings optimizer config per stage
  await query(`
    CREATE TABLE IF NOT EXISTS mascot_settings_config (
      min_companion_stage INTEGER PRIMARY KEY,
      can_provide_tutorials BOOLEAN DEFAULT FALSE,
      can_suggest_notifications BOOLEAN DEFAULT FALSE,
      can_review_privacy BOOLEAN DEFAULT FALSE,
      can_optimize_performance BOOLEAN DEFAULT FALSE,
      can_ab_test_ui BOOLEAN DEFAULT FALSE,
      can_full_personalization BOOLEAN DEFAULT FALSE
    )
  `);

  await query(`
    INSERT INTO mascot_settings_config VALUES
    (1, TRUE, FALSE, FALSE, FALSE, FALSE, FALSE),
    (2, TRUE, TRUE, FALSE, FALSE, FALSE, FALSE),
    (3, TRUE, TRUE, TRUE, FALSE, FALSE, FALSE),
    (4, TRUE, TRUE, TRUE, TRUE, FALSE, FALSE),
    (5, TRUE, TRUE, TRUE, TRUE, TRUE, FALSE),
    (6, TRUE, TRUE, TRUE, TRUE, TRUE, TRUE)
    ON CONFLICT (min_companion_stage) DO NOTHING
  `);

  // =====================================================
  // DATA GUARDIAN SYSTEM
  // =====================================================
  log.info('Creating data guardian tables...');

  // Data integrity alerts
  await query(`
    CREATE TABLE IF NOT EXISTS mascot_data_alerts (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      alert_type VARCHAR(50) NOT NULL,
      severity VARCHAR(20) DEFAULT 'info',
      title VARCHAR(200) NOT NULL,
      description TEXT,
      affected_data TEXT,
      suggested_action TEXT,
      companion_stage INTEGER NOT NULL,
      resolved BOOLEAN DEFAULT FALSE,
      resolved_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      CONSTRAINT valid_alert_type CHECK (alert_type IN (
        'backup_reminder', 'unusual_activity', 'data_inconsistency',
        'sync_issue', 'export_available', 'storage_warning'
      )),
      CONSTRAINT valid_severity CHECK (severity IN ('info', 'warning', 'critical'))
    )
  `);

  await query(`
    CREATE INDEX IF NOT EXISTS idx_data_alerts_user_active
    ON mascot_data_alerts(user_id, created_at DESC)
    WHERE resolved = FALSE
  `);

  // Data export history
  await query(`
    CREATE TABLE IF NOT EXISTS mascot_data_exports (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      export_type VARCHAR(50) NOT NULL,
      data_included JSONB DEFAULT '[]',
      file_size_bytes BIGINT,
      export_format VARCHAR(20) DEFAULT 'json',
      download_url TEXT,
      expires_at TIMESTAMPTZ,
      initiated_by VARCHAR(20) DEFAULT 'user',
      companion_stage INTEGER,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      CONSTRAINT valid_export_type CHECK (export_type IN (
        'full_backup', 'workouts_only', 'stats_only', 'social_only', 'settings_only'
      )),
      CONSTRAINT valid_initiated_by CHECK (initiated_by IN ('user', 'mascot', 'system'))
    )
  `);

  // Activity anomaly detection
  await query(`
    CREATE TABLE IF NOT EXISTS mascot_activity_anomalies (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      anomaly_type VARCHAR(50) NOT NULL,
      detected_pattern TEXT,
      baseline_pattern TEXT,
      deviation_percent INTEGER,
      risk_level VARCHAR(20) DEFAULT 'low',
      companion_stage INTEGER NOT NULL,
      acknowledged BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      CONSTRAINT valid_anomaly_type CHECK (anomaly_type IN (
        'unusual_login', 'unusual_workout_time', 'unusual_volume',
        'data_access_spike', 'setting_changes', 'social_behavior'
      )),
      CONSTRAINT valid_risk_level CHECK (risk_level IN ('low', 'medium', 'high'))
    )
  `);

  // Data guardian config per stage
  await query(`
    CREATE TABLE IF NOT EXISTS mascot_data_guardian_config (
      min_companion_stage INTEGER PRIMARY KEY,
      can_remind_exports BOOLEAN DEFAULT FALSE,
      can_detect_anomalies BOOLEAN DEFAULT FALSE,
      can_alert_issues BOOLEAN DEFAULT FALSE,
      can_remind_backups BOOLEAN DEFAULT FALSE,
      can_sync_assist BOOLEAN DEFAULT FALSE,
      can_full_monitoring BOOLEAN DEFAULT FALSE
    )
  `);

  await query(`
    INSERT INTO mascot_data_guardian_config VALUES
    (1, TRUE, FALSE, FALSE, FALSE, FALSE, FALSE),
    (2, TRUE, TRUE, FALSE, FALSE, FALSE, FALSE),
    (3, TRUE, TRUE, TRUE, FALSE, FALSE, FALSE),
    (4, TRUE, TRUE, TRUE, TRUE, FALSE, FALSE),
    (5, TRUE, TRUE, TRUE, TRUE, TRUE, FALSE),
    (6, TRUE, TRUE, TRUE, TRUE, TRUE, TRUE)
    ON CONFLICT (min_companion_stage) DO NOTHING
  `);

  // =====================================================
  // SUBSCRIPTION ASSISTANT SYSTEM
  // =====================================================
  log.info('Creating subscription assistant tables...');

  // Premium feature usage tracking
  await query(`
    CREATE TABLE IF NOT EXISTS mascot_feature_tracking (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      feature_key VARCHAR(100) NOT NULL,
      is_premium BOOLEAN DEFAULT FALSE,
      usage_count INTEGER DEFAULT 0,
      blocked_count INTEGER DEFAULT 0,
      last_used_at TIMESTAMPTZ,
      last_blocked_at TIMESTAMPTZ,
      would_benefit BOOLEAN DEFAULT FALSE,
      estimated_value_score INTEGER DEFAULT 0,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(user_id, feature_key)
    )
  `);

  await query(`
    CREATE INDEX IF NOT EXISTS idx_feature_tracking_user
    ON mascot_feature_tracking(user_id, is_premium, blocked_count DESC)
  `);

  // Subscription recommendations
  await query(`
    CREATE TABLE IF NOT EXISTS mascot_subscription_recs (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      recommendation_type VARCHAR(50) NOT NULL,
      tier_recommended VARCHAR(50),
      features_highlighted JSONB DEFAULT '[]',
      estimated_roi TEXT,
      personalized_reason TEXT,
      companion_stage INTEGER NOT NULL,
      shown_to_user BOOLEAN DEFAULT FALSE,
      converted BOOLEAN DEFAULT FALSE,
      dismissed BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      CONSTRAINT valid_rec_type CHECK (recommendation_type IN (
        'tier_upgrade', 'feature_unlock', 'optimal_timing', 'discount_available'
      ))
    )
  `);

  // Subscription assistant config per stage
  await query(`
    CREATE TABLE IF NOT EXISTS mascot_subscription_config (
      min_companion_stage INTEGER PRIMARY KEY,
      can_explain_features BOOLEAN DEFAULT FALSE,
      can_track_usage BOOLEAN DEFAULT FALSE,
      can_suggest_timing BOOLEAN DEFAULT FALSE,
      can_apply_discounts BOOLEAN DEFAULT FALSE,
      can_predict_roi BOOLEAN DEFAULT FALSE,
      can_personalize_recs BOOLEAN DEFAULT FALSE
    )
  `);

  await query(`
    INSERT INTO mascot_subscription_config VALUES
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

  // Get user's tutorial progress
  await query(`
    CREATE OR REPLACE FUNCTION get_tutorial_status(p_user_id UUID)
    RETURNS TABLE(
      onboarding_complete BOOLEAN,
      current_step VARCHAR(50),
      completed_count INTEGER,
      next_hint TEXT
    ) AS $$
    BEGIN
      RETURN QUERY
      SELECT
        tp.onboarding_complete,
        tp.current_step,
        jsonb_array_length(tp.completed_steps),
        CASE
          WHEN NOT tp.onboarding_complete THEN 'Complete your profile to unlock more features!'
          WHEN jsonb_array_length(tp.completed_steps) < 5 THEN 'Try logging your first workout!'
          ELSE NULL
        END
      FROM mascot_tutorial_progress tp
      WHERE tp.user_id = p_user_id;

      IF NOT FOUND THEN
        RETURN QUERY SELECT FALSE, 'welcome'::VARCHAR(50), 0, 'Welcome! Let''s get started.';
      END IF;
    END;
    $$ LANGUAGE plpgsql
  `);

  // Check if user should get backup reminder
  await query(`
    CREATE OR REPLACE FUNCTION should_remind_backup(p_user_id UUID)
    RETURNS BOOLEAN AS $$
    DECLARE
      v_last_export TIMESTAMPTZ;
      v_workout_count INTEGER;
    BEGIN
      SELECT MAX(created_at) INTO v_last_export
      FROM mascot_data_exports
      WHERE user_id = p_user_id AND export_type = 'full_backup';

      SELECT COUNT(*) INTO v_workout_count
      FROM workouts
      WHERE user_id = p_user_id
        AND created_at > COALESCE(v_last_export, '1970-01-01'::TIMESTAMPTZ);

      RETURN v_workout_count >= 10 OR v_last_export IS NULL OR v_last_export < NOW() - INTERVAL '30 days';
    END;
    $$ LANGUAGE plpgsql
  `);

  log.info('Migration 104_mascot_powers_phase5 complete');
}

export async function down(): Promise<void> {
  log.info('Rolling back migration: 104_mascot_powers_phase5');

  await query(`DROP FUNCTION IF EXISTS should_remind_backup(UUID)`);
  await query(`DROP FUNCTION IF EXISTS get_tutorial_status(UUID)`);

  await query(`DROP TABLE IF EXISTS mascot_subscription_config`);
  await query(`DROP TABLE IF EXISTS mascot_subscription_recs`);
  await query(`DROP TABLE IF EXISTS mascot_feature_tracking`);
  await query(`DROP TABLE IF EXISTS mascot_data_guardian_config`);
  await query(`DROP TABLE IF EXISTS mascot_activity_anomalies`);
  await query(`DROP TABLE IF EXISTS mascot_data_exports`);
  await query(`DROP TABLE IF EXISTS mascot_data_alerts`);
  await query(`DROP TABLE IF EXISTS mascot_settings_config`);
  await query(`DROP TABLE IF EXISTS mascot_ui_learning`);
  await query(`DROP TABLE IF EXISTS mascot_setting_suggestions`);
  await query(`DROP TABLE IF EXISTS mascot_tutorial_progress`);

  log.info('Rollback 104_mascot_powers_phase5 complete');
}
