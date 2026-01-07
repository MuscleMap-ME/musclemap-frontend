/**
 * Migration: Hangouts Leaderboards & Achievements System
 *
 * This migration extends the existing hangouts system with:
 *
 * 1. Feature flags for gradual rollout (hangouts, leaderboards, achievements, cohort_filters, verification)
 * 2. User cohort preferences (opt-in gender, age band, adaptive categories for leaderboard filtering)
 * 3. Exercise metric definitions (defines what metrics can be tracked per exercise type)
 * 4. Leaderboard entries (partitioned by period_type for performance)
 * 5. Hangout check-ins (geo-verified presence at physical hangouts)
 * 6. Achievement definitions and events
 * 7. Moderation and anti-cheat tables
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

async function columnExists(tableName: string, columnName: string): Promise<boolean> {
  const result = await db.queryOne<{ count: string }>(
    `SELECT COUNT(*) as count FROM information_schema.columns
     WHERE table_name = $1 AND column_name = $2`,
    [tableName, columnName]
  );
  return parseInt(result?.count || '0') > 0;
}

async function functionExists(functionName: string): Promise<boolean> {
  const result = await db.queryOne<{ count: string }>(
    `SELECT COUNT(*) as count FROM pg_proc WHERE proname = $1`,
    [functionName]
  );
  return parseInt(result?.count || '0') > 0;
}

export async function up(): Promise<void> {
  log.info('Running migration: 030_hangouts_leaderboards_achievements');

  // ============================================
  // FEATURE FLAGS FOR NEW FEATURES
  // ============================================
  if (await tableExists('feature_flags')) {
    log.info('Adding feature flags for hangouts/leaderboards/achievements...');
    const flags = [
      { id: 'hangouts', name: 'Hangouts', description: 'Location-based and virtual hangout communities' },
      { id: 'leaderboards', name: 'Leaderboards', description: 'Exercise-based leaderboards within hangouts' },
      { id: 'achievements', name: 'Achievements', description: 'Achievement and badge system' },
      { id: 'cohort_filters', name: 'Cohort Filters', description: 'Gender/age/adaptive category leaderboard filtering' },
      { id: 'verification', name: 'Verification', description: 'Video/photo verification for leaderboard entries' },
    ];

    for (const flag of flags) {
      await db.query(
        `INSERT INTO feature_flags (id, name, description, enabled, rollout_percentage)
         VALUES ($1, $2, $3, false, 0)
         ON CONFLICT (id) DO NOTHING`,
        [flag.id, flag.name, flag.description]
      );
    }
  }

  // ============================================
  // USER COHORT PREFERENCES (opt-in demographics for leaderboard filtering)
  // ============================================
  if (!(await tableExists('user_cohort_preferences'))) {
    log.info('Creating user_cohort_preferences table...');
    await db.query(`
      CREATE TABLE user_cohort_preferences (
        user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,

        -- Gender category (opt-in, self-declared)
        gender_category TEXT CHECK (gender_category IN (
          'open', 'women', 'men', 'non_binary', 'trans_women', 'trans_men', 'prefer_not_to_say'
        )),
        gender_visible BOOLEAN DEFAULT FALSE,

        -- Age band (opt-in, self-declared)
        age_band TEXT CHECK (age_band IN (
          'open', 'under_18', '18_29', '30_39', '40_49', '50_59', '60_69', '70_plus'
        )),
        age_visible BOOLEAN DEFAULT FALSE,

        -- Adaptive category (opt-in)
        adaptive_category TEXT CHECK (adaptive_category IN (
          'open', 'adaptive', 'para', 'special_olympics'
        )),
        adaptive_visible BOOLEAN DEFAULT FALSE,

        -- Global leaderboard opt-in
        show_on_leaderboards BOOLEAN DEFAULT TRUE,
        show_achievements_on_profile BOOLEAN DEFAULT TRUE,

        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    await db.query('CREATE INDEX idx_cohort_prefs_leaderboard ON user_cohort_preferences(user_id) WHERE show_on_leaderboards = TRUE');
  }

  // ============================================
  // EXERCISE METRIC DEFINITIONS
  // ============================================
  if (!(await tableExists('exercise_metric_definitions'))) {
    log.info('Creating exercise_metric_definitions table...');
    await db.query(`
      CREATE TABLE exercise_metric_definitions (
        id TEXT PRIMARY KEY DEFAULT 'emd_' || replace(gen_random_uuid()::text, '-', ''),
        exercise_id TEXT NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,
        metric_key TEXT NOT NULL,
        display_name TEXT NOT NULL,
        unit TEXT NOT NULL,
        direction TEXT NOT NULL CHECK (direction IN ('higher', 'lower')),
        calculation_type TEXT NOT NULL CHECK (calculation_type IN (
          'max_single', 'sum_day', 'min_single', 'avg_session', 'total_volume'
        )),
        enabled BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(exercise_id, metric_key)
      )
    `);

    await db.query('CREATE INDEX idx_metric_defs_exercise ON exercise_metric_definitions(exercise_id) WHERE enabled = TRUE');

    // Seed common metric definitions for popular exercises
    log.info('Seeding exercise metric definitions...');
    const metricSeeds = [
      // Bench Press metrics
      { exerciseId: 'BB-PUSH-BENCH-PRESS', metricKey: 'max_weight', displayName: 'Max Weight', unit: 'kg', direction: 'higher', calculationType: 'max_single' },
      { exerciseId: 'BB-PUSH-BENCH-PRESS', metricKey: 'total_volume', displayName: 'Total Volume', unit: 'kg', direction: 'higher', calculationType: 'sum_day' },
      // Squat metrics
      { exerciseId: 'BB-SQUAT-BACK-SQUAT', metricKey: 'max_weight', displayName: 'Max Weight', unit: 'kg', direction: 'higher', calculationType: 'max_single' },
      { exerciseId: 'BB-SQUAT-BACK-SQUAT', metricKey: 'total_volume', displayName: 'Total Volume', unit: 'kg', direction: 'higher', calculationType: 'sum_day' },
      // Deadlift metrics
      { exerciseId: 'BB-HINGE-DEADLIFT', metricKey: 'max_weight', displayName: 'Max Weight', unit: 'kg', direction: 'higher', calculationType: 'max_single' },
      { exerciseId: 'BB-HINGE-DEADLIFT', metricKey: 'total_volume', displayName: 'Total Volume', unit: 'kg', direction: 'higher', calculationType: 'sum_day' },
      // Pull-up metrics
      { exerciseId: 'BW-PULL-PULL-UP', metricKey: 'max_reps', displayName: 'Max Reps', unit: 'reps', direction: 'higher', calculationType: 'max_single' },
      { exerciseId: 'BW-PULL-PULL-UP', metricKey: 'total_reps', displayName: 'Total Reps', unit: 'reps', direction: 'higher', calculationType: 'sum_day' },
      // Push-up metrics
      { exerciseId: 'BW-PUSH-PUSH-UP', metricKey: 'max_reps', displayName: 'Max Reps', unit: 'reps', direction: 'higher', calculationType: 'max_single' },
      { exerciseId: 'BW-PUSH-PUSH-UP', metricKey: 'total_reps', displayName: 'Total Reps', unit: 'reps', direction: 'higher', calculationType: 'sum_day' },
    ];

    for (const metric of metricSeeds) {
      // Check if exercise exists before inserting
      const exerciseExists = await db.queryOne<{ count: string }>(
        'SELECT COUNT(*) as count FROM exercises WHERE id = $1',
        [metric.exerciseId]
      );
      if (parseInt(exerciseExists?.count || '0') > 0) {
        await db.query(
          `INSERT INTO exercise_metric_definitions (exercise_id, metric_key, display_name, unit, direction, calculation_type)
           VALUES ($1, $2, $3, $4, $5, $6)
           ON CONFLICT (exercise_id, metric_key) DO NOTHING`,
          [metric.exerciseId, metric.metricKey, metric.displayName, metric.unit, metric.direction, metric.calculationType]
        );
      }
    }
  }

  // ============================================
  // LEADERBOARD ENTRIES (partitioned by period_type)
  // ============================================
  if (!(await tableExists('leaderboard_entries'))) {
    log.info('Creating leaderboard_entries partitioned table...');
    await db.query(`
      CREATE TABLE leaderboard_entries (
        id TEXT DEFAULT 'le_' || replace(gen_random_uuid()::text, '-', ''),
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        exercise_id TEXT NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,
        metric_key TEXT NOT NULL,
        hangout_id BIGINT REFERENCES hangouts(id) ON DELETE CASCADE,
        virtual_hangout_id BIGINT REFERENCES virtual_hangouts(id) ON DELETE CASCADE,

        period_type TEXT NOT NULL CHECK (period_type IN ('daily', 'weekly', 'monthly', 'all_time')),
        period_start DATE NOT NULL,

        value NUMERIC(15, 4) NOT NULL,
        rank INTEGER,

        verification_status TEXT DEFAULT 'self_reported' CHECK (verification_status IN (
          'self_reported', 'pending_review', 'verified', 'rejected'
        )),
        source_workout_id TEXT REFERENCES workouts(id) ON DELETE SET NULL,

        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),

        PRIMARY KEY (id, period_type)
      ) PARTITION BY LIST (period_type)
    `);

    // Create partitions
    await db.query(`CREATE TABLE leaderboard_entries_daily PARTITION OF leaderboard_entries FOR VALUES IN ('daily')`);
    await db.query(`CREATE TABLE leaderboard_entries_weekly PARTITION OF leaderboard_entries FOR VALUES IN ('weekly')`);
    await db.query(`CREATE TABLE leaderboard_entries_monthly PARTITION OF leaderboard_entries FOR VALUES IN ('monthly')`);
    await db.query(`CREATE TABLE leaderboard_entries_all_time PARTITION OF leaderboard_entries FOR VALUES IN ('all_time')`);

    // Unique constraint to prevent duplicate entries per user/exercise/metric/period
    await db.query(`
      CREATE UNIQUE INDEX idx_leaderboard_unique ON leaderboard_entries(
        user_id, exercise_id, metric_key,
        COALESCE(hangout_id::text, 'null'),
        COALESCE(virtual_hangout_id::text, 'null'),
        period_type, period_start
      )
    `);

    // Query indexes
    await db.query(`
      CREATE INDEX idx_leaderboard_hangout_query ON leaderboard_entries(
        hangout_id, exercise_id, metric_key, period_type, period_start, value DESC
      ) WHERE hangout_id IS NOT NULL
    `);

    await db.query(`
      CREATE INDEX idx_leaderboard_virtual_hangout_query ON leaderboard_entries(
        virtual_hangout_id, exercise_id, metric_key, period_type, period_start, value DESC
      ) WHERE virtual_hangout_id IS NOT NULL
    `);

    await db.query(`
      CREATE INDEX idx_leaderboard_global_query ON leaderboard_entries(
        exercise_id, metric_key, period_type, period_start, value DESC
      ) WHERE hangout_id IS NULL AND virtual_hangout_id IS NULL
    `);

    await db.query('CREATE INDEX idx_leaderboard_user ON leaderboard_entries(user_id, period_type)');
  }

  // ============================================
  // HANGOUT CHECK-INS (geo-verified presence)
  // ============================================
  if (!(await tableExists('hangout_checkins'))) {
    log.info('Creating hangout_checkins table...');
    await db.query(`
      CREATE TABLE hangout_checkins (
        id TEXT PRIMARY KEY DEFAULT 'hc_' || replace(gen_random_uuid()::text, '-', ''),
        hangout_id BIGINT NOT NULL REFERENCES hangouts(id) ON DELETE CASCADE,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        checked_in_at TIMESTAMPTZ DEFAULT NOW(),
        checked_out_at TIMESTAMPTZ,

        -- Coarse location only (privacy - rounded to ~100m)
        approx_lat NUMERIC(8, 5),
        approx_lng NUMERIC(8, 5),

        -- Session tracking
        workout_id TEXT REFERENCES workouts(id) ON DELETE SET NULL,

        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    await db.query('CREATE INDEX idx_checkins_hangout_time ON hangout_checkins(hangout_id, checked_in_at DESC)');
    await db.query('CREATE INDEX idx_checkins_user_time ON hangout_checkins(user_id, checked_in_at DESC)');
    await db.query('CREATE INDEX idx_checkins_active ON hangout_checkins(hangout_id, user_id) WHERE checked_out_at IS NULL');

    // Trigger to update hangout checkin_count
    if (await columnExists('hangouts', 'checkin_count')) {
      await db.query(`
        CREATE OR REPLACE FUNCTION update_hangout_checkin_count()
        RETURNS TRIGGER AS $$
        BEGIN
          IF TG_OP = 'INSERT' THEN
            UPDATE hangouts SET checkin_count = COALESCE(checkin_count, 0) + 1, updated_at = NOW() WHERE id = NEW.hangout_id;
          ELSIF TG_OP = 'DELETE' THEN
            UPDATE hangouts SET checkin_count = GREATEST(COALESCE(checkin_count, 0) - 1, 0), updated_at = NOW() WHERE id = OLD.hangout_id;
          END IF;
          RETURN COALESCE(NEW, OLD);
        END;
        $$ LANGUAGE plpgsql
      `);

      await db.query(`
        CREATE TRIGGER trg_hangout_checkin_count
        AFTER INSERT OR DELETE ON hangout_checkins
        FOR EACH ROW EXECUTE FUNCTION update_hangout_checkin_count()
      `);
    }
  }

  // Add checkin_count column to hangouts if it doesn't exist
  if (await tableExists('hangouts') && !(await columnExists('hangouts', 'checkin_count'))) {
    log.info('Adding checkin_count column to hangouts...');
    await db.query('ALTER TABLE hangouts ADD COLUMN checkin_count INTEGER DEFAULT 0');
  }

  // ============================================
  // ACHIEVEMENT DEFINITIONS
  // ============================================
  if (!(await tableExists('achievement_definitions'))) {
    log.info('Creating achievement_definitions table...');
    await db.query(`
      CREATE TABLE achievement_definitions (
        id TEXT PRIMARY KEY DEFAULT 'ach_' || replace(gen_random_uuid()::text, '-', ''),
        key TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL,
        description TEXT,
        icon TEXT,
        category TEXT NOT NULL CHECK (category IN (
          'record', 'streak', 'first_time', 'top_rank', 'milestone', 'social', 'special'
        )),
        points INTEGER DEFAULT 0,
        rarity TEXT DEFAULT 'common' CHECK (rarity IN ('common', 'uncommon', 'rare', 'epic', 'legendary')),
        enabled BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    await db.query('CREATE INDEX idx_achievement_defs_category ON achievement_definitions(category) WHERE enabled = TRUE');
    await db.query('CREATE INDEX idx_achievement_defs_key ON achievement_definitions(key)');

    // Seed achievement definitions
    log.info('Seeding achievement definitions...');
    const achievements = [
      // Record achievements
      { key: 'hangout_record', name: 'Hangout Record', description: 'Set a new record at a hangout', category: 'record', points: 100, rarity: 'rare' },
      { key: 'global_record', name: 'Global Record', description: 'Set a new global record', category: 'record', points: 500, rarity: 'legendary' },
      { key: 'personal_record', name: 'Personal Best', description: 'Beat your personal record', category: 'record', points: 50, rarity: 'common' },
      // Streak achievements
      { key: 'streak_7', name: '7-Day Streak', description: 'Logged exercises 7 days in a row', category: 'streak', points: 70, rarity: 'common' },
      { key: 'streak_30', name: '30-Day Streak', description: 'Logged exercises 30 days in a row', category: 'streak', points: 300, rarity: 'rare' },
      { key: 'streak_100', name: 'Century Streak', description: 'Logged exercises 100 days in a row', category: 'streak', points: 1000, rarity: 'legendary' },
      // First-time achievements
      { key: 'first_pullup', name: 'First Pull-up', description: 'Completed your first pull-up', category: 'first_time', points: 50, rarity: 'common' },
      { key: 'first_5k', name: 'First 5K', description: 'Completed your first 5K run', category: 'first_time', points: 100, rarity: 'uncommon' },
      { key: 'first_hangout_join', name: 'Community Member', description: 'Joined your first hangout', category: 'first_time', points: 25, rarity: 'common' },
      { key: 'first_checkin', name: 'Checked In', description: 'Checked into a hangout for the first time', category: 'first_time', points: 25, rarity: 'common' },
      // Top rank achievements
      { key: 'top_10_entry', name: 'Top 10', description: 'Entered a hangout top 10 leaderboard', category: 'top_rank', points: 75, rarity: 'uncommon' },
      { key: 'top_3_entry', name: 'Podium Finish', description: 'Entered a hangout top 3', category: 'top_rank', points: 150, rarity: 'rare' },
      { key: 'number_one', name: 'Number One', description: 'Reached #1 on a hangout leaderboard', category: 'top_rank', points: 250, rarity: 'epic' },
      // Milestone achievements
      { key: 'workouts_10', name: 'Getting Started', description: 'Completed 10 workouts', category: 'milestone', points: 50, rarity: 'common' },
      { key: 'workouts_100', name: 'Dedicated', description: 'Completed 100 workouts', category: 'milestone', points: 200, rarity: 'uncommon' },
      { key: 'workouts_500', name: 'Iron Will', description: 'Completed 500 workouts', category: 'milestone', points: 500, rarity: 'rare' },
      { key: 'workouts_1000', name: 'Legendary', description: 'Completed 1000 workouts', category: 'milestone', points: 1000, rarity: 'legendary' },
      // Social achievements
      { key: 'hangouts_5', name: 'Social Butterfly', description: 'Member of 5 different hangouts', category: 'social', points: 100, rarity: 'uncommon' },
      { key: 'hangouts_10', name: 'Community Leader', description: 'Member of 10 different hangouts', category: 'social', points: 250, rarity: 'rare' },
    ];

    for (const ach of achievements) {
      await db.query(
        `INSERT INTO achievement_definitions (key, name, description, category, points, rarity)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (key) DO NOTHING`,
        [ach.key, ach.name, ach.description, ach.category, ach.points, ach.rarity]
      );
    }
  }

  // ============================================
  // ACHIEVEMENT EVENTS (user's earned achievements)
  // ============================================
  if (!(await tableExists('achievement_events'))) {
    log.info('Creating achievement_events table...');
    await db.query(`
      CREATE TABLE achievement_events (
        id TEXT PRIMARY KEY DEFAULT 'ae_' || replace(gen_random_uuid()::text, '-', ''),
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        achievement_id TEXT NOT NULL REFERENCES achievement_definitions(id) ON DELETE CASCADE,
        hangout_id BIGINT REFERENCES hangouts(id) ON DELETE SET NULL,
        virtual_hangout_id BIGINT REFERENCES virtual_hangouts(id) ON DELETE SET NULL,
        exercise_id TEXT REFERENCES exercises(id) ON DELETE SET NULL,
        metric_key TEXT,
        value NUMERIC(15, 4),
        show_in_hangout_feed BOOLEAN DEFAULT TRUE,
        show_on_profile BOOLEAN DEFAULT TRUE,
        earned_at TIMESTAMPTZ DEFAULT NOW(),

        -- Prevent duplicate achievements of the same type
        UNIQUE(user_id, achievement_id, hangout_id, virtual_hangout_id, exercise_id)
      )
    `);

    await db.query('CREATE INDEX idx_achievements_user ON achievement_events(user_id, earned_at DESC)');
    await db.query('CREATE INDEX idx_achievements_hangout ON achievement_events(hangout_id, earned_at DESC) WHERE hangout_id IS NOT NULL');
    await db.query('CREATE INDEX idx_achievements_virtual_hangout ON achievement_events(virtual_hangout_id, earned_at DESC) WHERE virtual_hangout_id IS NOT NULL');
    await db.query('CREATE INDEX idx_achievements_feed ON achievement_events(earned_at DESC) WHERE show_in_hangout_feed = TRUE');
  }

  // ============================================
  // MODERATION ACTIONS
  // ============================================
  if (!(await tableExists('moderation_actions'))) {
    log.info('Creating moderation_actions table...');
    await db.query(`
      CREATE TABLE moderation_actions (
        id TEXT PRIMARY KEY DEFAULT 'ma_' || replace(gen_random_uuid()::text, '-', ''),
        hangout_id BIGINT REFERENCES hangouts(id) ON DELETE CASCADE,
        virtual_hangout_id BIGINT REFERENCES virtual_hangouts(id) ON DELETE CASCADE,
        moderator_id TEXT NOT NULL REFERENCES users(id) ON DELETE SET NULL,
        target_user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
        target_entry_id TEXT,
        action_type TEXT NOT NULL CHECK (action_type IN (
          'remove_record', 'flag_suspicious', 'ban_user', 'unban_user',
          'approve_membership', 'reject_membership', 'pin_achievement', 'unpin_achievement',
          'warn_user', 'mute_user', 'unmute_user'
        )),
        reason TEXT,
        metadata JSONB DEFAULT '{}',
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    await db.query('CREATE INDEX idx_mod_actions_hangout ON moderation_actions(hangout_id, created_at DESC) WHERE hangout_id IS NOT NULL');
    await db.query('CREATE INDEX idx_mod_actions_virtual_hangout ON moderation_actions(virtual_hangout_id, created_at DESC) WHERE virtual_hangout_id IS NOT NULL');
    await db.query('CREATE INDEX idx_mod_actions_target ON moderation_actions(target_user_id, created_at DESC)');
  }

  // ============================================
  // SUSPICIOUS FLAGS (anti-cheat)
  // ============================================
  if (!(await tableExists('suspicious_flags'))) {
    log.info('Creating suspicious_flags table...');
    await db.query(`
      CREATE TABLE suspicious_flags (
        id TEXT PRIMARY KEY DEFAULT 'sf_' || replace(gen_random_uuid()::text, '-', ''),
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        leaderboard_entry_id TEXT,
        workout_id TEXT REFERENCES workouts(id) ON DELETE CASCADE,
        flag_type TEXT NOT NULL CHECK (flag_type IN (
          'rapid_submissions', 'extreme_jump', 'impossible_value', 'suspicious_pattern',
          'geo_mismatch', 'time_anomaly'
        )),
        severity TEXT DEFAULT 'low' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
        details JSONB DEFAULT '{}',
        status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'dismissed', 'confirmed')),
        reviewed_by TEXT REFERENCES users(id) ON DELETE SET NULL,
        reviewed_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    await db.query(`CREATE INDEX idx_flags_pending ON suspicious_flags(status, created_at) WHERE status = 'pending'`);
    await db.query('CREATE INDEX idx_flags_user ON suspicious_flags(user_id, created_at DESC)');
  }

  // ============================================
  // SUBMISSION RATE LIMITS (anti-cheat)
  // ============================================
  if (!(await tableExists('submission_rate_limits'))) {
    log.info('Creating submission_rate_limits table...');
    await db.query(`
      CREATE TABLE submission_rate_limits (
        user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
        submissions_today INTEGER DEFAULT 0,
        last_submission_at TIMESTAMPTZ,
        daily_reset_at DATE DEFAULT CURRENT_DATE
      )
    `);
  }

  // ============================================
  // USER ACHIEVEMENT POINTS (cached total)
  // ============================================
  if (await tableExists('users') && !(await columnExists('users', 'achievement_points'))) {
    log.info('Adding achievement_points column to users...');
    await db.query('ALTER TABLE users ADD COLUMN achievement_points INTEGER DEFAULT 0');
  }

  // ============================================
  // ANALYZE NEW TABLES
  // ============================================
  log.info('Analyzing new tables...');
  const newTables = [
    'user_cohort_preferences',
    'exercise_metric_definitions',
    'leaderboard_entries',
    'hangout_checkins',
    'achievement_definitions',
    'achievement_events',
    'moderation_actions',
    'suspicious_flags',
    'submission_rate_limits',
  ];

  for (const table of newTables) {
    if (await tableExists(table)) {
      try {
        await db.query(`ANALYZE ${table}`);
      } catch (e) {
        log.debug(`Could not analyze ${table}`);
      }
    }
  }

  log.info('Migration 030_hangouts_leaderboards_achievements complete');
}

export async function down(): Promise<void> {
  log.info('Rolling back migration: 030_hangouts_leaderboards_achievements');

  // Drop tables in reverse order
  const tables = [
    'submission_rate_limits',
    'suspicious_flags',
    'moderation_actions',
    'achievement_events',
    'achievement_definitions',
    'hangout_checkins',
    'leaderboard_entries_daily',
    'leaderboard_entries_weekly',
    'leaderboard_entries_monthly',
    'leaderboard_entries_all_time',
    'leaderboard_entries',
    'exercise_metric_definitions',
    'user_cohort_preferences',
  ];

  for (const table of tables) {
    await db.query(`DROP TABLE IF EXISTS ${table} CASCADE`);
  }

  // Drop functions
  if (await functionExists('update_hangout_checkin_count')) {
    await db.query('DROP FUNCTION IF EXISTS update_hangout_checkin_count CASCADE');
  }

  // Remove columns
  if (await columnExists('hangouts', 'checkin_count')) {
    await db.query('ALTER TABLE hangouts DROP COLUMN checkin_count');
  }

  if (await columnExists('users', 'achievement_points')) {
    await db.query('ALTER TABLE users DROP COLUMN achievement_points');
  }

  // Remove feature flags
  if (await tableExists('feature_flags')) {
    await db.query(`DELETE FROM feature_flags WHERE id IN ('hangouts', 'leaderboards', 'achievements', 'cohort_filters', 'verification')`);
  }

  log.info('Rollback 030_hangouts_leaderboards_achievements complete');
}

export const migrate = up;
