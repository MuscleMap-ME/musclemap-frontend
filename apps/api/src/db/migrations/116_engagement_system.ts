// DESTRUCTIVE: Schema modification for engagement system - contains DROP/TRUNCATE operations
/**
 * Migration 116: Engagement System
 *
 * Creates tables for:
 * - Daily login rewards & streaks
 * - Unified streak tracking (workout, nutrition, sleep, social)
 * - Daily & weekly challenges
 * - Daily prescriptions
 * - Time-limited events
 * - Recovery tracking
 * - Push notifications
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
  log.info('Running migration: 116_engagement_system');

  // ========================================
  // LOGIN STREAKS & DAILY REWARDS
  // ========================================

  if (!(await tableExists('login_streaks'))) {
    log.info('Creating login_streaks table...');
    await db.query(`
      CREATE TABLE login_streaks (
        user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
        current_streak INTEGER NOT NULL DEFAULT 0,
        longest_streak INTEGER NOT NULL DEFAULT 0,
        last_login_date DATE,
        streak_freezes_owned INTEGER NOT NULL DEFAULT 0,
        total_logins INTEGER NOT NULL DEFAULT 0,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await db.query('CREATE INDEX idx_login_streaks_last_login ON login_streaks(last_login_date)');
    log.info('login_streaks table created');
  }

  if (!(await tableExists('daily_login_rewards'))) {
    log.info('Creating daily_login_rewards table...');
    await db.query(`
      CREATE TABLE daily_login_rewards (
        id TEXT PRIMARY KEY DEFAULT 'dlr_' || replace(gen_random_uuid()::text, '-', ''),
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        login_date DATE NOT NULL,
        day_number INTEGER NOT NULL,
        credits_awarded INTEGER NOT NULL,
        xp_awarded INTEGER NOT NULL,
        mystery_box_id TEXT,
        streak_freeze_used BOOLEAN NOT NULL DEFAULT FALSE,
        claimed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE(user_id, login_date)
      )
    `);
    await db.query('CREATE INDEX idx_daily_login_rewards_user_date ON daily_login_rewards(user_id, login_date DESC)');
    log.info('daily_login_rewards table created');
  }

  // ========================================
  // UNIFIED STREAK SYSTEM
  // ========================================

  if (!(await tableExists('user_streaks'))) {
    log.info('Creating user_streaks table...');
    await db.query(`
      CREATE TABLE user_streaks (
        id TEXT PRIMARY KEY DEFAULT 'us_' || replace(gen_random_uuid()::text, '-', ''),
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        streak_type TEXT NOT NULL CHECK (streak_type IN ('login', 'workout', 'nutrition', 'sleep', 'social')),
        current_streak INTEGER NOT NULL DEFAULT 0,
        longest_streak INTEGER NOT NULL DEFAULT 0,
        last_activity_date DATE,
        milestones_claimed JSONB NOT NULL DEFAULT '{}',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE(user_id, streak_type)
      )
    `);
    await db.query('CREATE INDEX idx_user_streaks_user ON user_streaks(user_id)');
    await db.query('CREATE INDEX idx_user_streaks_type ON user_streaks(streak_type)');
    log.info('user_streaks table created');
  }

  if (!(await tableExists('streak_milestones'))) {
    log.info('Creating streak_milestones table...');
    await db.query(`
      CREATE TABLE streak_milestones (
        id TEXT PRIMARY KEY DEFAULT 'sm_' || replace(gen_random_uuid()::text, '-', ''),
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        streak_type TEXT NOT NULL,
        milestone_days INTEGER NOT NULL,
        credits_awarded INTEGER NOT NULL,
        xp_awarded INTEGER NOT NULL,
        badge_id TEXT,
        claimed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE(user_id, streak_type, milestone_days)
      )
    `);
    log.info('streak_milestones table created');
  }

  // ========================================
  // DAILY CHALLENGES
  // ========================================

  if (!(await tableExists('daily_challenges'))) {
    log.info('Creating daily_challenges table...');
    await db.query(`
      CREATE TABLE daily_challenges (
        id TEXT PRIMARY KEY DEFAULT 'dc_' || replace(gen_random_uuid()::text, '-', ''),
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        challenge_date DATE NOT NULL,
        challenge_type TEXT NOT NULL,
        difficulty TEXT NOT NULL CHECK (difficulty IN ('easy', 'medium', 'hard')),
        target_value INTEGER NOT NULL,
        current_progress INTEGER NOT NULL DEFAULT 0,
        is_complete BOOLEAN NOT NULL DEFAULT FALSE,
        is_claimed BOOLEAN NOT NULL DEFAULT FALSE,
        xp_reward INTEGER NOT NULL,
        credit_reward INTEGER NOT NULL,
        expires_at TIMESTAMPTZ NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        claimed_at TIMESTAMPTZ,
        UNIQUE(user_id, challenge_date, difficulty)
      )
    `);
    await db.query('CREATE INDEX idx_daily_challenges_user_date ON daily_challenges(user_id, challenge_date DESC)');
    await db.query('CREATE INDEX idx_daily_challenges_expires ON daily_challenges(expires_at) WHERE NOT is_claimed');
    log.info('daily_challenges table created');
  }

  if (!(await tableExists('weekly_challenges'))) {
    log.info('Creating weekly_challenges table...');
    await db.query(`
      CREATE TABLE weekly_challenges (
        id TEXT PRIMARY KEY DEFAULT 'wc_' || replace(gen_random_uuid()::text, '-', ''),
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        week_start DATE NOT NULL,
        challenge_type TEXT NOT NULL,
        target_value INTEGER NOT NULL,
        current_progress INTEGER NOT NULL DEFAULT 0,
        is_complete BOOLEAN NOT NULL DEFAULT FALSE,
        is_claimed BOOLEAN NOT NULL DEFAULT FALSE,
        xp_reward INTEGER NOT NULL,
        credit_reward INTEGER NOT NULL,
        expires_at TIMESTAMPTZ NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        claimed_at TIMESTAMPTZ,
        UNIQUE(user_id, week_start)
      )
    `);
    await db.query('CREATE INDEX idx_weekly_challenges_user ON weekly_challenges(user_id, week_start DESC)');
    log.info('weekly_challenges table created');
  }

  // ========================================
  // DAILY PRESCRIPTIONS
  // ========================================

  if (!(await tableExists('daily_prescriptions'))) {
    log.info('Creating daily_prescriptions table...');
    await db.query(`
      CREATE TABLE daily_prescriptions (
        id TEXT PRIMARY KEY DEFAULT 'dp_' || replace(gen_random_uuid()::text, '-', ''),
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        prescription_date DATE NOT NULL,
        prescription_data JSONB NOT NULL,
        generation_count INTEGER NOT NULL DEFAULT 1,
        was_completed BOOLEAN NOT NULL DEFAULT FALSE,
        was_started BOOLEAN NOT NULL DEFAULT FALSE,
        expires_at TIMESTAMPTZ NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        started_at TIMESTAMPTZ,
        completed_at TIMESTAMPTZ,
        UNIQUE(user_id, prescription_date)
      )
    `);
    await db.query('CREATE INDEX idx_daily_prescriptions_user_date ON daily_prescriptions(user_id, prescription_date DESC)');
    log.info('daily_prescriptions table created');
  }

  // ========================================
  // EVENTS SYSTEM
  // ========================================

  if (!(await tableExists('engagement_events'))) {
    log.info('Creating engagement_events table...');
    await db.query(`
      CREATE TABLE engagement_events (
        id TEXT PRIMARY KEY DEFAULT 'ee_' || replace(gen_random_uuid()::text, '-', ''),
        event_type TEXT NOT NULL CHECK (event_type IN ('flash_sale', 'double_credits', 'challenge_bonus', 'seasonal', 'community_goal')),
        name TEXT NOT NULL,
        description TEXT,
        config JSONB NOT NULL,
        starts_at TIMESTAMPTZ NOT NULL,
        ends_at TIMESTAMPTZ NOT NULL,
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await db.query('CREATE INDEX idx_engagement_events_active ON engagement_events(starts_at, ends_at) WHERE is_active = TRUE');
    log.info('engagement_events table created');
  }

  if (!(await tableExists('event_participation'))) {
    log.info('Creating event_participation table...');
    await db.query(`
      CREATE TABLE event_participation (
        id TEXT PRIMARY KEY DEFAULT 'ep_' || replace(gen_random_uuid()::text, '-', ''),
        event_id TEXT NOT NULL REFERENCES engagement_events(id) ON DELETE CASCADE,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        progress JSONB NOT NULL DEFAULT '{}',
        rewards_claimed JSONB NOT NULL DEFAULT '{}',
        joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE(event_id, user_id)
      )
    `);
    await db.query('CREATE INDEX idx_event_participation_user ON event_participation(user_id)');
    log.info('event_participation table created');
  }

  // ========================================
  // RECOVERY TRACKING
  // ========================================

  if (!(await tableExists('recovery_scores'))) {
    log.info('Creating recovery_scores table...');
    await db.query(`
      CREATE TABLE recovery_scores (
        id TEXT PRIMARY KEY DEFAULT 'rs_' || replace(gen_random_uuid()::text, '-', ''),
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        score_date DATE NOT NULL,
        overall_score INTEGER NOT NULL CHECK (overall_score >= 0 AND overall_score <= 100),
        muscle_scores JSONB NOT NULL,
        factors JSONB NOT NULL,
        recommendation TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE(user_id, score_date)
      )
    `);
    await db.query('CREATE INDEX idx_recovery_scores_user_date ON recovery_scores(user_id, score_date DESC)');
    log.info('recovery_scores table created');
  }

  if (!(await tableExists('rest_day_activities'))) {
    log.info('Creating rest_day_activities table...');
    await db.query(`
      CREATE TABLE rest_day_activities (
        id TEXT PRIMARY KEY DEFAULT 'rda_' || replace(gen_random_uuid()::text, '-', ''),
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        activity_date DATE NOT NULL,
        activity_type TEXT NOT NULL CHECK (activity_type IN ('log_sleep', 'log_nutrition', 'mobility', 'education', 'social_engagement', 'recovery_session')),
        credits_earned INTEGER NOT NULL,
        metadata JSONB NOT NULL DEFAULT '{}',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await db.query('CREATE INDEX idx_rest_day_activities_user_date ON rest_day_activities(user_id, activity_date DESC)');
    log.info('rest_day_activities table created');
  }

  // ========================================
  // PUSH NOTIFICATIONS
  // ========================================

  if (!(await tableExists('push_notification_tokens'))) {
    log.info('Creating push_notification_tokens table...');
    await db.query(`
      CREATE TABLE push_notification_tokens (
        id TEXT PRIMARY KEY DEFAULT 'pnt_' || replace(gen_random_uuid()::text, '-', ''),
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        token TEXT NOT NULL,
        platform TEXT NOT NULL CHECK (platform IN ('ios', 'android', 'web')),
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        last_used_at TIMESTAMPTZ,
        UNIQUE(user_id, token)
      )
    `);
    await db.query('CREATE INDEX idx_push_tokens_user ON push_notification_tokens(user_id) WHERE is_active = TRUE');
    log.info('push_notification_tokens table created');
  }

  if (!(await tableExists('notification_schedule'))) {
    log.info('Creating notification_schedule table...');
    await db.query(`
      CREATE TABLE notification_schedule (
        id TEXT PRIMARY KEY DEFAULT 'ns_' || replace(gen_random_uuid()::text, '-', ''),
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        notification_type TEXT NOT NULL,
        scheduled_for TIMESTAMPTZ NOT NULL,
        payload JSONB NOT NULL,
        is_sent BOOLEAN NOT NULL DEFAULT FALSE,
        sent_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await db.query('CREATE INDEX idx_notification_schedule_pending ON notification_schedule(scheduled_for) WHERE NOT is_sent');
    log.info('notification_schedule table created');
  }

  // ========================================
  // SOCIAL TRIGGERS
  // ========================================

  if (!(await tableExists('social_triggers'))) {
    log.info('Creating social_triggers table...');
    await db.query(`
      CREATE TABLE social_triggers (
        id TEXT PRIMARY KEY DEFAULT 'st_' || replace(gen_random_uuid()::text, '-', ''),
        trigger_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        target_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        trigger_type TEXT NOT NULL CHECK (trigger_type IN ('rival_workout', 'rival_pr', 'crew_workout', 'friend_milestone', 'challenge_complete')),
        trigger_data JSONB NOT NULL,
        is_notified BOOLEAN NOT NULL DEFAULT FALSE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await db.query('CREATE INDEX idx_social_triggers_target ON social_triggers(target_user_id, is_notified)');
    log.info('social_triggers table created');
  }

  // ========================================
  // ADD CREDIT REASONS FOR ENGAGEMENT
  // ========================================

  if (await tableExists('credit_actions')) {
    log.info('Adding engagement credit actions...');
    await db.query(`
      INSERT INTO credit_actions (id, name, default_cost, enabled)
      VALUES
        ('daily_login', 'Daily Login Reward', 0, true),
        ('streak_milestone', 'Streak Milestone', 0, true),
        ('challenge_complete', 'Challenge Complete', 0, true),
        ('rest_day_activity', 'Rest Day Activity', 0, true),
        ('event_reward', 'Event Reward', 0, true),
        ('streak_freeze_purchase', 'Streak Freeze Purchase', 250, true)
      ON CONFLICT (id) DO NOTHING
    `);
    log.info('Engagement credit actions added');
  }

  log.info('Migration 116_engagement_system completed');
}

export async function down(): Promise<void> {
  log.info('Rolling back migration: 116_engagement_system');

  await db.query('DROP TABLE IF EXISTS social_triggers CASCADE');
  await db.query('DROP TABLE IF EXISTS notification_schedule CASCADE');
  await db.query('DROP TABLE IF EXISTS push_notification_tokens CASCADE');
  await db.query('DROP TABLE IF EXISTS rest_day_activities CASCADE');
  await db.query('DROP TABLE IF EXISTS recovery_scores CASCADE');
  await db.query('DROP TABLE IF EXISTS event_participation CASCADE');
  await db.query('DROP TABLE IF EXISTS engagement_events CASCADE');
  await db.query('DROP TABLE IF EXISTS daily_prescriptions CASCADE');
  await db.query('DROP TABLE IF EXISTS weekly_challenges CASCADE');
  await db.query('DROP TABLE IF EXISTS daily_challenges CASCADE');
  await db.query('DROP TABLE IF EXISTS streak_milestones CASCADE');
  await db.query('DROP TABLE IF EXISTS user_streaks CASCADE');
  await db.query('DROP TABLE IF EXISTS daily_login_rewards CASCADE');
  await db.query('DROP TABLE IF EXISTS login_streaks CASCADE');

  if (await tableExists('credit_actions')) {
    await db.query(`
      DELETE FROM credit_actions
      WHERE id IN ('daily_login', 'streak_milestone', 'challenge_complete', 'rest_day_activity', 'event_reward', 'streak_freeze_purchase')
    `);
  }

  log.info('Rollback 116_engagement_system completed');
}
