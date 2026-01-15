/**
 * Migration 103: Mascot Powers Phase 4 - Social & Community Assistance
 *
 * Implements:
 * - Crew Helper: Coordinate team workouts and find crews
 * - Rivalry Manager: Competitive assistance
 * - High-Five Helper: Automate positive social engagement
 */

import { query } from '../client';
import { loggers } from '../../lib/logger';

const log = loggers.db;

export async function up(): Promise<void> {
  log.info('Running migration: 103_mascot_powers_phase4');

  // =====================================================
  // CREW HELPER SYSTEM
  // =====================================================
  log.info('Creating crew helper tables...');

  // Crew workout coordination
  await query(`
    CREATE TABLE IF NOT EXISTS mascot_crew_coordination (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      crew_id UUID NOT NULL,
      coordination_type VARCHAR(50) NOT NULL,
      proposed_time TIMESTAMPTZ,
      workout_type VARCHAR(50),
      participants JSONB DEFAULT '[]',
      status VARCHAR(20) DEFAULT 'proposed',
      companion_stage INTEGER NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      resolved_at TIMESTAMPTZ,
      CONSTRAINT valid_coordination_type CHECK (coordination_type IN (
        'workout_reminder', 'time_suggestion', 'group_workout', 'challenge_invite'
      )),
      CONSTRAINT valid_status CHECK (status IN (
        'proposed', 'accepted', 'declined', 'expired', 'completed'
      ))
    )
  `);

  await query(`
    CREATE INDEX IF NOT EXISTS idx_crew_coord_user
    ON mascot_crew_coordination(user_id, status)
    WHERE status = 'proposed'
  `);

  // Crew suggestions for users without crews
  await query(`
    CREATE TABLE IF NOT EXISTS mascot_crew_suggestions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      crew_id UUID NOT NULL,
      crew_name VARCHAR(100),
      match_score INTEGER DEFAULT 0,
      match_reasons JSONB DEFAULT '[]',
      companion_stage INTEGER NOT NULL,
      viewed BOOLEAN DEFAULT FALSE,
      joined BOOLEAN DEFAULT FALSE,
      dismissed BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  await query(`
    CREATE INDEX IF NOT EXISTS idx_crew_suggestions_user
    ON mascot_crew_suggestions(user_id, created_at DESC)
    WHERE dismissed = FALSE AND joined = FALSE
  `);

  // Crew helper config per stage
  await query(`
    CREATE TABLE IF NOT EXISTS mascot_crew_helper_config (
      min_companion_stage INTEGER PRIMARY KEY,
      can_remind_workouts BOOLEAN DEFAULT FALSE,
      can_suggest_crews BOOLEAN DEFAULT FALSE,
      can_coordinate_times BOOLEAN DEFAULT FALSE,
      can_analyze_performance BOOLEAN DEFAULT FALSE,
      can_find_optimal_compositions BOOLEAN DEFAULT FALSE,
      can_be_virtual_coach BOOLEAN DEFAULT FALSE
    )
  `);

  await query(`
    INSERT INTO mascot_crew_helper_config VALUES
    (1, TRUE, FALSE, FALSE, FALSE, FALSE, FALSE),
    (2, TRUE, TRUE, FALSE, FALSE, FALSE, FALSE),
    (3, TRUE, TRUE, TRUE, FALSE, FALSE, FALSE),
    (4, TRUE, TRUE, TRUE, TRUE, FALSE, FALSE),
    (5, TRUE, TRUE, TRUE, TRUE, TRUE, FALSE),
    (6, TRUE, TRUE, TRUE, TRUE, TRUE, TRUE)
    ON CONFLICT (min_companion_stage) DO NOTHING
  `);

  // =====================================================
  // RIVALRY MANAGER SYSTEM
  // =====================================================
  log.info('Creating rivalry manager tables...');

  // Rivalry notifications and tracking
  await query(`
    CREATE TABLE IF NOT EXISTS mascot_rivalry_alerts (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      rivalry_id UUID NOT NULL,
      rival_user_id TEXT NOT NULL REFERENCES users(id),
      alert_type VARCHAR(50) NOT NULL,
      rival_action TEXT,
      your_standing TEXT,
      suggestion TEXT,
      companion_stage INTEGER NOT NULL,
      seen BOOLEAN DEFAULT FALSE,
      acted_upon BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      CONSTRAINT valid_alert_type CHECK (alert_type IN (
        'rival_workout', 'rival_pr', 'losing_ground', 'gaining_lead',
        'challenge_opportunity', 'streak_comparison'
      ))
    )
  `);

  await query(`
    CREATE INDEX IF NOT EXISTS idx_rivalry_alerts_user
    ON mascot_rivalry_alerts(user_id, created_at DESC)
    WHERE seen = FALSE
  `);

  // Rivalry strategy suggestions
  await query(`
    CREATE TABLE IF NOT EXISTS mascot_rivalry_strategies (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      rivalry_id UUID NOT NULL,
      strategy_type VARCHAR(50) NOT NULL,
      analysis JSONB DEFAULT '{}',
      recommended_actions JSONB DEFAULT '[]',
      confidence_percent INTEGER DEFAULT 50,
      companion_stage INTEGER NOT NULL,
      followed BOOLEAN DEFAULT FALSE,
      outcome VARCHAR(20),
      created_at TIMESTAMPTZ DEFAULT NOW(),
      CONSTRAINT valid_strategy_type CHECK (strategy_type IN (
        'catch_up', 'maintain_lead', 'exploit_weakness', 'counter_strategy'
      ))
    )
  `);

  // Trash talk templates (fun, friendly)
  await query(`
    CREATE TABLE IF NOT EXISTS mascot_trash_talk (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      context VARCHAR(50) NOT NULL,
      message_template TEXT NOT NULL,
      tone VARCHAR(20) DEFAULT 'friendly',
      min_companion_stage INTEGER DEFAULT 3,
      enabled BOOLEAN DEFAULT TRUE,
      CONSTRAINT valid_context CHECK (context IN (
        'you_ahead', 'you_behind', 'close_race', 'big_pr', 'streak_longer'
      )),
      CONSTRAINT valid_tone CHECK (tone IN ('friendly', 'motivational', 'playful', 'competitive'))
    )
  `);

  // Seed trash talk templates
  await query(`
    INSERT INTO mascot_trash_talk (context, message_template, tone, min_companion_stage) VALUES
    ('you_ahead', 'Keep it up! {rival} is {points} points behind. Don''t let them catch you!', 'motivational', 3),
    ('you_behind', '{rival} just got ahead by {points} points. Time for a comeback workout!', 'competitive', 3),
    ('close_race', 'It''s neck and neck with {rival}! One more workout could make the difference.', 'friendly', 3),
    ('big_pr', 'Nice PR! {rival} might be worried now...', 'playful', 3),
    ('streak_longer', 'Your {streak_days}-day streak beats {rival}''s {rival_streak}. Legendary!', 'friendly', 3),
    ('you_ahead', '{rival} is gaining! They''re only {points} points away now.', 'competitive', 4),
    ('you_behind', 'Don''t worry, comebacks are your specialty. {rival} won''t know what hit them!', 'motivational', 4)
    ON CONFLICT DO NOTHING
  `);

  // Rivalry manager config per stage
  await query(`
    CREATE TABLE IF NOT EXISTS mascot_rivalry_config (
      min_companion_stage INTEGER PRIMARY KEY,
      can_notify_rival_activity BOOLEAN DEFAULT FALSE,
      can_suggest_workouts BOOLEAN DEFAULT FALSE,
      can_trash_talk BOOLEAN DEFAULT FALSE,
      can_analyze_patterns BOOLEAN DEFAULT FALSE,
      can_coordinate_teams BOOLEAN DEFAULT FALSE,
      can_manage_tournaments BOOLEAN DEFAULT FALSE
    )
  `);

  await query(`
    INSERT INTO mascot_rivalry_config VALUES
    (1, TRUE, FALSE, FALSE, FALSE, FALSE, FALSE),
    (2, TRUE, TRUE, FALSE, FALSE, FALSE, FALSE),
    (3, TRUE, TRUE, TRUE, FALSE, FALSE, FALSE),
    (4, TRUE, TRUE, TRUE, TRUE, FALSE, FALSE),
    (5, TRUE, TRUE, TRUE, TRUE, TRUE, FALSE),
    (6, TRUE, TRUE, TRUE, TRUE, TRUE, TRUE)
    ON CONFLICT (min_companion_stage) DO NOTHING
  `);

  // =====================================================
  // HIGH-FIVE HELPER SYSTEM
  // =====================================================
  log.info('Creating high-five helper tables...');

  // Auto high-five preferences
  await query(`
    CREATE TABLE IF NOT EXISTS mascot_highfive_prefs (
      user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      auto_highfive_enabled BOOLEAN DEFAULT FALSE,
      auto_highfive_close_friends BOOLEAN DEFAULT TRUE,
      auto_highfive_crew BOOLEAN DEFAULT TRUE,
      auto_highfive_all_following BOOLEAN DEFAULT FALSE,
      daily_limit INTEGER DEFAULT 50,
      companion_stage_required INTEGER DEFAULT 2,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  // Auto high-five log
  await query(`
    CREATE TABLE IF NOT EXISTS mascot_auto_highfives (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      target_user_id TEXT NOT NULL REFERENCES users(id),
      target_workout_id UUID,
      trigger_type VARCHAR(50) NOT NULL,
      message TEXT,
      companion_stage INTEGER NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      CONSTRAINT valid_trigger CHECK (trigger_type IN (
        'workout_complete', 'pr_achieved', 'streak_milestone', 'achievement_unlocked',
        'rank_up', 'goal_reached'
      ))
    )
  `);

  await query(`
    CREATE INDEX IF NOT EXISTS idx_auto_highfives_user_date
    ON mascot_auto_highfives(user_id, created_at)
    WHERE created_at > CURRENT_DATE - INTERVAL '1 day'
  `);

  // Friends who need motivation (identified by mascot)
  await query(`
    CREATE TABLE IF NOT EXISTS mascot_motivation_targets (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      target_user_id TEXT NOT NULL REFERENCES users(id),
      reason VARCHAR(50) NOT NULL,
      days_inactive INTEGER,
      streak_at_risk BOOLEAN DEFAULT FALSE,
      suggested_message TEXT,
      companion_stage INTEGER NOT NULL,
      message_sent BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      CONSTRAINT valid_reason CHECK (reason IN (
        'inactive', 'streak_at_risk', 'goal_struggle', 'new_user', 'comeback'
      ))
    )
  `);

  // High-five helper config per stage
  await query(`
    CREATE TABLE IF NOT EXISTS mascot_highfive_config (
      min_companion_stage INTEGER PRIMARY KEY,
      can_prompt_highfives BOOLEAN DEFAULT FALSE,
      can_auto_highfive BOOLEAN DEFAULT FALSE,
      can_craft_messages BOOLEAN DEFAULT FALSE,
      can_identify_needs_motivation BOOLEAN DEFAULT FALSE,
      can_coordinate_challenges BOOLEAN DEFAULT FALSE,
      can_full_social_manager BOOLEAN DEFAULT FALSE
    )
  `);

  await query(`
    INSERT INTO mascot_highfive_config VALUES
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

  // Get pending social actions for mascot to perform
  await query(`
    CREATE OR REPLACE FUNCTION get_mascot_social_actions(p_user_id TEXT)
    RETURNS TABLE(
      action_type VARCHAR(50),
      target_user_id TEXT,
      target_username VARCHAR(100),
      action_data JSONB,
      priority INTEGER
    ) AS $$
    BEGIN
      RETURN QUERY
      WITH highfive_targets AS (
        SELECT
          'auto_highfive'::VARCHAR(50) AS action_type,
          mt.target_user_id,
          u.username AS target_username,
          jsonb_build_object(
            'reason', mt.reason,
            'suggested_message', mt.suggested_message
          ) AS action_data,
          CASE mt.reason
            WHEN 'streak_at_risk' THEN 1
            WHEN 'inactive' THEN 2
            ELSE 3
          END AS priority
        FROM mascot_motivation_targets mt
        JOIN users u ON u.id = mt.target_user_id
        WHERE mt.user_id = p_user_id
          AND mt.message_sent = FALSE
          AND mt.created_at > CURRENT_DATE - INTERVAL '1 day'
      ),
      rivalry_actions AS (
        SELECT
          'rivalry_response'::VARCHAR(50) AS action_type,
          ra.rival_user_id AS target_user_id,
          u.username AS target_username,
          jsonb_build_object(
            'alert_type', ra.alert_type,
            'suggestion', ra.suggestion
          ) AS action_data,
          1 AS priority
        FROM mascot_rivalry_alerts ra
        JOIN users u ON u.id = ra.rival_user_id
        WHERE ra.user_id = p_user_id
          AND ra.seen = FALSE
        LIMIT 3
      )
      SELECT * FROM highfive_targets
      UNION ALL
      SELECT * FROM rivalry_actions
      ORDER BY priority ASC
      LIMIT 10;
    END;
    $$ LANGUAGE plpgsql
  `);

  // Count auto high-fives sent today
  await query(`
    CREATE OR REPLACE FUNCTION count_auto_highfives_today(p_user_id TEXT)
    RETURNS INTEGER AS $$
    DECLARE
      v_count INTEGER;
    BEGIN
      SELECT COUNT(*) INTO v_count
      FROM mascot_auto_highfives
      WHERE user_id = p_user_id
        AND created_at >= CURRENT_DATE;
      RETURN COALESCE(v_count, 0);
    END;
    $$ LANGUAGE plpgsql
  `);

  log.info('Migration 103_mascot_powers_phase4 complete');
}

export async function down(): Promise<void> {
  log.info('Rolling back migration: 103_mascot_powers_phase4');

  await query(`DROP FUNCTION IF EXISTS count_auto_highfives_today(TEXT)`);
  await query(`DROP FUNCTION IF EXISTS get_mascot_social_actions(TEXT)`);

  await query(`DROP TABLE IF EXISTS mascot_highfive_config`);
  await query(`DROP TABLE IF EXISTS mascot_motivation_targets`);
  await query(`DROP TABLE IF EXISTS mascot_auto_highfives`);
  await query(`DROP TABLE IF EXISTS mascot_highfive_prefs`);
  await query(`DROP TABLE IF EXISTS mascot_rivalry_config`);
  await query(`DROP TABLE IF EXISTS mascot_trash_talk`);
  await query(`DROP TABLE IF EXISTS mascot_rivalry_strategies`);
  await query(`DROP TABLE IF EXISTS mascot_rivalry_alerts`);
  await query(`DROP TABLE IF EXISTS mascot_crew_helper_config`);
  await query(`DROP TABLE IF EXISTS mascot_crew_suggestions`);
  await query(`DROP TABLE IF EXISTS mascot_crew_coordination`);

  log.info('Rollback 103_mascot_powers_phase4 complete');
}
