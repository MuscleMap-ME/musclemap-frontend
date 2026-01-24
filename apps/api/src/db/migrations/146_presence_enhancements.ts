/**
 * Migration 146: Presence System Enhancements
 *
 * Adds advanced features to the community presence system:
 * - Training partner streaks and bonus credits
 * - Quick status options (Looking for Spotter, etc.)
 * - Venue activity heatmap data endpoints
 * - Training partner compatibility scoring
 * - Scheduled recurring training sessions
 *
 * Builds on migration 143 (community_presence_system)
 *
 * DESTRUCTIVE: The down() function removes all enhancement tables.
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
     WHERE table_schema = 'public' AND table_name = $1 AND column_name = $2`,
    [tableName, columnName]
  );
  return parseInt(result?.count || '0') > 0;
}

async function enumExists(enumName: string): Promise<boolean> {
  const result = await db.queryOne<{ count: string }>(
    `SELECT COUNT(*) as count FROM pg_type WHERE typname = $1`,
    [enumName]
  );
  return parseInt(result?.count || '0') > 0;
}

export async function up(): Promise<void> {
  log.info('Running migration: 146_presence_enhancements');

  // ============================================
  // 1. QUICK STATUS TYPE ENUM
  // ============================================
  if (!(await enumExists('quick_status_type'))) {
    log.info('Creating quick_status_type enum...');
    await db.query(`
      CREATE TYPE quick_status_type AS ENUM (
        'looking_for_spotter',
        'open_to_train',
        'just_warming_up',
        'finishing_soon',
        'need_workout_buddy',
        'teaching_available',
        'in_the_zone'
      )
    `);
  }

  // Add quick_status column to user_presence
  if (!(await columnExists('user_presence', 'quick_status'))) {
    await db.query(`ALTER TABLE user_presence ADD COLUMN quick_status quick_status_type`);
    await db.query(`ALTER TABLE user_presence ADD COLUMN quick_status_set_at TIMESTAMPTZ`);
    await db.query(`ALTER TABLE user_presence ADD COLUMN quick_status_expires_at TIMESTAMPTZ`);
    await db.query(`CREATE INDEX idx_presence_quick_status ON user_presence(quick_status) WHERE quick_status IS NOT NULL`);
  }

  // ============================================
  // 2. TRAINING PARTNERSHIPS TABLE
  // ============================================
  if (!(await tableExists('training_partnerships'))) {
    log.info('Creating training_partnerships table...');
    await db.query(`
      CREATE TABLE training_partnerships (
        id TEXT PRIMARY KEY DEFAULT 'tp_' || replace(gen_random_uuid()::text, '-', ''),
        user_id_1 TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        user_id_2 TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,

        -- Streak tracking
        current_streak INTEGER DEFAULT 0,
        longest_streak INTEGER DEFAULT 0,
        total_sessions INTEGER DEFAULT 0,
        last_session_at TIMESTAMPTZ,
        streak_broken_at TIMESTAMPTZ,

        -- Bonus tracking
        total_bonus_credits_earned INTEGER DEFAULT 0,
        last_bonus_awarded_at TIMESTAMPTZ,

        -- Relationship metadata
        first_session_at TIMESTAMPTZ DEFAULT NOW(),
        favorite BOOLEAN DEFAULT FALSE,
        notes TEXT,

        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),

        CONSTRAINT unique_partnership UNIQUE (user_id_1, user_id_2),
        CONSTRAINT ordered_users CHECK (user_id_1 < user_id_2)
      )
    `);

    await db.query(`CREATE INDEX idx_partnerships_user1 ON training_partnerships(user_id_1)`);
    await db.query(`CREATE INDEX idx_partnerships_user2 ON training_partnerships(user_id_2)`);
    await db.query(`CREATE INDEX idx_partnerships_streak ON training_partnerships(current_streak DESC) WHERE current_streak > 0`);
    await db.query(`CREATE INDEX idx_partnerships_last_session ON training_partnerships(last_session_at DESC)`);
  }

  // ============================================
  // 3. PARTNERSHIP SESSIONS TABLE
  // ============================================
  if (!(await tableExists('partnership_sessions'))) {
    log.info('Creating partnership_sessions table...');
    await db.query(`
      CREATE TABLE partnership_sessions (
        id TEXT PRIMARY KEY DEFAULT 'ps_' || replace(gen_random_uuid()::text, '-', ''),
        partnership_id TEXT NOT NULL REFERENCES training_partnerships(id) ON DELETE CASCADE,
        training_session_id TEXT REFERENCES training_sessions(id) ON DELETE SET NULL,
        venue_id TEXT REFERENCES fitness_venues(id) ON DELETE SET NULL,

        -- Session details
        session_date DATE NOT NULL,
        workout_type TEXT,
        duration_minutes INTEGER,

        -- Credits/bonuses
        streak_day INTEGER DEFAULT 1,
        bonus_credits_awarded INTEGER DEFAULT 0,
        bonus_reason TEXT,

        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    await db.query(`CREATE INDEX idx_partnership_sessions_partnership ON partnership_sessions(partnership_id, session_date DESC)`);
    await db.query(`CREATE INDEX idx_partnership_sessions_date ON partnership_sessions(session_date DESC)`);
    await db.query(`CREATE UNIQUE INDEX idx_partnership_sessions_unique_day ON partnership_sessions(partnership_id, session_date)`);
  }

  // ============================================
  // 4. VENUE HOURLY ACTIVITY TABLE
  // ============================================
  if (!(await tableExists('venue_hourly_activity'))) {
    log.info('Creating venue_hourly_activity table...');
    await db.query(`
      CREATE TABLE venue_hourly_activity (
        id TEXT PRIMARY KEY DEFAULT 'vha_' || replace(gen_random_uuid()::text, '-', ''),
        venue_id TEXT NOT NULL REFERENCES fitness_venues(id) ON DELETE CASCADE,

        -- Time bucket
        hour_start TIMESTAMPTZ NOT NULL,
        day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
        hour_of_day INTEGER NOT NULL CHECK (hour_of_day BETWEEN 0 AND 23),

        -- Aggregated data
        total_checkins INTEGER DEFAULT 0,
        unique_users INTEGER DEFAULT 0,
        avg_session_minutes DECIMAL(5,1) DEFAULT 0,
        peak_concurrent_users INTEGER DEFAULT 0,
        open_to_train_count INTEGER DEFAULT 0,

        -- Workout type breakdown
        workout_types JSONB DEFAULT '{}',

        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),

        CONSTRAINT unique_venue_hour UNIQUE (venue_id, hour_start)
      )
    `);

    await db.query(`CREATE INDEX idx_venue_hourly_venue ON venue_hourly_activity(venue_id, hour_start DESC)`);
    await db.query(`CREATE INDEX idx_venue_hourly_dow ON venue_hourly_activity(venue_id, day_of_week, hour_of_day)`);
  }

  // ============================================
  // 5. VENUE WEEKLY PATTERNS TABLE
  // ============================================
  if (!(await tableExists('venue_weekly_patterns'))) {
    log.info('Creating venue_weekly_patterns table...');
    await db.query(`
      CREATE TABLE venue_weekly_patterns (
        id TEXT PRIMARY KEY DEFAULT 'vwp_' || replace(gen_random_uuid()::text, '-', ''),
        venue_id TEXT NOT NULL REFERENCES fitness_venues(id) ON DELETE CASCADE,

        -- Pattern data
        day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
        hour_of_day INTEGER NOT NULL CHECK (hour_of_day BETWEEN 0 AND 23),

        -- Predicted/average values
        avg_users DECIMAL(5,2) DEFAULT 0,
        avg_open_to_train DECIMAL(5,2) DEFAULT 0,
        activity_level TEXT CHECK (activity_level IN ('very_low', 'low', 'medium', 'high', 'very_high')),
        is_peak_hour BOOLEAN DEFAULT FALSE,

        -- Sample size
        data_points INTEGER DEFAULT 0,
        last_updated TIMESTAMPTZ DEFAULT NOW(),

        CONSTRAINT unique_venue_weekly_pattern UNIQUE (venue_id, day_of_week, hour_of_day)
      )
    `);

    await db.query(`CREATE INDEX idx_venue_weekly_venue ON venue_weekly_patterns(venue_id)`);
    await db.query(`CREATE INDEX idx_venue_weekly_peak ON venue_weekly_patterns(venue_id, is_peak_hour) WHERE is_peak_hour = TRUE`);
  }

  // ============================================
  // 6. USER TRAINING PREFERENCES TABLE
  // ============================================
  if (!(await tableExists('user_training_preferences'))) {
    log.info('Creating user_training_preferences table...');
    await db.query(`
      CREATE TABLE user_training_preferences (
        user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,

        -- Schedule preferences
        preferred_days JSONB DEFAULT '[]',
        preferred_times JSONB DEFAULT '[]',
        timezone TEXT DEFAULT 'America/New_York',

        -- Workout preferences
        preferred_workout_types JSONB DEFAULT '[]',
        experience_level TEXT CHECK (experience_level IN ('beginner', 'intermediate', 'advanced', 'expert')),
        intensity_preference TEXT CHECK (intensity_preference IN ('light', 'moderate', 'intense', 'extreme')),

        -- Partner preferences
        preferred_partner_experience JSONB DEFAULT '[]',
        preferred_partner_gender TEXT,
        min_partner_age INTEGER,
        max_partner_age INTEGER,
        preferred_group_size INTEGER DEFAULT 2,
        open_to_beginners BOOLEAN DEFAULT TRUE,
        willing_to_teach BOOLEAN DEFAULT FALSE,

        -- Social preferences
        communication_style TEXT CHECK (communication_style IN ('minimal', 'moderate', 'chatty')),
        music_preference TEXT,

        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
  }

  // ============================================
  // 7. PARTNER COMPATIBILITY CACHE TABLE
  // ============================================
  if (!(await tableExists('partner_compatibility_cache'))) {
    log.info('Creating partner_compatibility_cache table...');
    await db.query(`
      CREATE TABLE partner_compatibility_cache (
        id TEXT PRIMARY KEY DEFAULT 'pcc_' || replace(gen_random_uuid()::text, '-', ''),
        user_id_1 TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        user_id_2 TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,

        -- Compatibility scores (0-100)
        overall_score INTEGER NOT NULL CHECK (overall_score BETWEEN 0 AND 100),
        schedule_score INTEGER CHECK (schedule_score BETWEEN 0 AND 100),
        workout_score INTEGER CHECK (workout_score BETWEEN 0 AND 100),
        experience_score INTEGER CHECK (experience_score BETWEEN 0 AND 100),
        social_score INTEGER CHECK (social_score BETWEEN 0 AND 100),

        -- Compatibility factors
        matching_factors JSONB DEFAULT '[]',
        conflict_factors JSONB DEFAULT '[]',

        -- Cache metadata
        calculated_at TIMESTAMPTZ DEFAULT NOW(),
        expires_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '7 days',

        CONSTRAINT unique_compatibility_pair UNIQUE (user_id_1, user_id_2),
        CONSTRAINT ordered_compatibility_users CHECK (user_id_1 < user_id_2)
      )
    `);

    await db.query(`CREATE INDEX idx_compatibility_user1 ON partner_compatibility_cache(user_id_1, overall_score DESC)`);
    await db.query(`CREATE INDEX idx_compatibility_user2 ON partner_compatibility_cache(user_id_2, overall_score DESC)`);
    await db.query(`CREATE INDEX idx_compatibility_expires ON partner_compatibility_cache(expires_at)`);
  }

  // ============================================
  // 8. RECURRING TRAINING SCHEDULES TABLE
  // ============================================
  if (!(await tableExists('recurring_training_schedules'))) {
    log.info('Creating recurring_training_schedules table...');
    await db.query(`
      CREATE TABLE recurring_training_schedules (
        id TEXT PRIMARY KEY DEFAULT 'rts_' || replace(gen_random_uuid()::text, '-', ''),
        creator_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        venue_id TEXT NOT NULL REFERENCES fitness_venues(id) ON DELETE CASCADE,

        -- Schedule pattern
        name TEXT NOT NULL,
        description TEXT,
        recurrence_type TEXT NOT NULL CHECK (recurrence_type IN ('daily', 'weekly', 'biweekly', 'monthly')),
        days_of_week JSONB DEFAULT '[]',
        time_of_day TIME NOT NULL,
        timezone TEXT DEFAULT 'America/New_York',
        duration_minutes INTEGER DEFAULT 60,

        -- Workout details
        workout_type TEXT,
        target_muscles JSONB DEFAULT '[]',
        intensity_level TEXT,

        -- Capacity
        max_participants INTEGER DEFAULT 4,
        is_public BOOLEAN DEFAULT FALSE,
        requires_approval BOOLEAN DEFAULT FALSE,

        -- Status
        is_active BOOLEAN DEFAULT TRUE,
        next_occurrence TIMESTAMPTZ,
        last_occurrence TIMESTAMPTZ,
        total_occurrences INTEGER DEFAULT 0,

        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    await db.query(`CREATE INDEX idx_recurring_creator ON recurring_training_schedules(creator_id, is_active)`);
    await db.query(`CREATE INDEX idx_recurring_venue ON recurring_training_schedules(venue_id, is_active)`);
    await db.query(`CREATE INDEX idx_recurring_next ON recurring_training_schedules(next_occurrence) WHERE is_active = TRUE`);
    await db.query(`CREATE INDEX idx_recurring_public ON recurring_training_schedules(is_public, venue_id) WHERE is_active = TRUE AND is_public = TRUE`);
  }

  // ============================================
  // 9. RECURRING SCHEDULE MEMBERS TABLE
  // ============================================
  if (!(await tableExists('recurring_schedule_members'))) {
    log.info('Creating recurring_schedule_members table...');
    await db.query(`
      CREATE TABLE recurring_schedule_members (
        id TEXT PRIMARY KEY DEFAULT 'rsm_' || replace(gen_random_uuid()::text, '-', ''),
        schedule_id TEXT NOT NULL REFERENCES recurring_training_schedules(id) ON DELETE CASCADE,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,

        -- Membership status
        status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('pending', 'active', 'paused', 'left')),
        role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('creator', 'admin', 'member')),

        -- Notification preferences
        notify_before_minutes INTEGER DEFAULT 60,
        notify_on_changes BOOLEAN DEFAULT TRUE,

        -- Attendance tracking
        total_attended INTEGER DEFAULT 0,
        total_missed INTEGER DEFAULT 0,
        last_attended_at TIMESTAMPTZ,
        attendance_streak INTEGER DEFAULT 0,

        joined_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),

        CONSTRAINT unique_schedule_member UNIQUE (schedule_id, user_id)
      )
    `);

    await db.query(`CREATE INDEX idx_schedule_members_schedule ON recurring_schedule_members(schedule_id, status)`);
    await db.query(`CREATE INDEX idx_schedule_members_user ON recurring_schedule_members(user_id, status)`);
  }

  // ============================================
  // 10. STREAK BONUS FUNCTIONS
  // ============================================
  log.info('Creating streak bonus functions...');

  await db.query(`
    CREATE OR REPLACE FUNCTION calculate_streak_bonus(streak_days INTEGER)
    RETURNS INTEGER AS $$
    BEGIN
      -- Bonus credit tiers based on streak length
      IF streak_days >= 30 THEN RETURN 100;
      ELSIF streak_days >= 21 THEN RETURN 75;
      ELSIF streak_days >= 14 THEN RETURN 50;
      ELSIF streak_days >= 7 THEN RETURN 25;
      ELSIF streak_days >= 3 THEN RETURN 10;
      ELSE RETURN 0;
      END IF;
    END;
    $$ LANGUAGE plpgsql IMMUTABLE
  `);

  await db.query(`
    CREATE OR REPLACE FUNCTION update_partnership_streak()
    RETURNS TRIGGER AS $$
    DECLARE
      v_last_session DATE;
      v_days_since INTEGER;
    BEGIN
      -- Get the last session date for this partnership
      SELECT session_date INTO v_last_session
      FROM partnership_sessions
      WHERE partnership_id = NEW.partnership_id
        AND id != NEW.id
      ORDER BY session_date DESC
      LIMIT 1;

      -- Calculate days since last session
      IF v_last_session IS NOT NULL THEN
        v_days_since := NEW.session_date - v_last_session;

        IF v_days_since = 1 THEN
          -- Consecutive day - increment streak
          UPDATE training_partnerships
          SET current_streak = current_streak + 1,
              longest_streak = GREATEST(longest_streak, current_streak + 1),
              total_sessions = total_sessions + 1,
              last_session_at = NOW(),
              updated_at = NOW()
          WHERE id = NEW.partnership_id;

          -- Set streak day on the session
          NEW.streak_day := (SELECT current_streak + 1 FROM training_partnerships WHERE id = NEW.partnership_id);
        ELSIF v_days_since > 1 THEN
          -- Streak broken - reset
          UPDATE training_partnerships
          SET current_streak = 1,
              streak_broken_at = NOW(),
              total_sessions = total_sessions + 1,
              last_session_at = NOW(),
              updated_at = NOW()
          WHERE id = NEW.partnership_id;

          NEW.streak_day := 1;
        END IF;
      ELSE
        -- First session
        UPDATE training_partnerships
        SET current_streak = 1,
            total_sessions = 1,
            last_session_at = NOW(),
            first_session_at = NOW(),
            updated_at = NOW()
        WHERE id = NEW.partnership_id;

        NEW.streak_day := 1;
      END IF;

      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql
  `);

  await db.query(`
    DROP TRIGGER IF EXISTS tr_partnership_session_streak ON partnership_sessions;
    CREATE TRIGGER tr_partnership_session_streak
    BEFORE INSERT ON partnership_sessions
    FOR EACH ROW EXECUTE FUNCTION update_partnership_streak()
  `);

  // ============================================
  // 11. VENUE ACTIVITY AGGREGATION FUNCTION
  // ============================================
  log.info('Creating venue activity aggregation function...');

  await db.query(`
    CREATE OR REPLACE FUNCTION aggregate_venue_hourly_activity()
    RETURNS void AS $$
    DECLARE
      v_hour_start TIMESTAMPTZ;
    BEGIN
      -- Get the start of the current hour
      v_hour_start := date_trunc('hour', NOW());

      -- Aggregate check-ins from the previous hour
      INSERT INTO venue_hourly_activity (
        venue_id,
        hour_start,
        day_of_week,
        hour_of_day,
        total_checkins,
        unique_users,
        avg_session_minutes,
        peak_concurrent_users,
        open_to_train_count,
        workout_types
      )
      SELECT
        venue_id,
        v_hour_start - INTERVAL '1 hour',
        EXTRACT(DOW FROM v_hour_start - INTERVAL '1 hour')::INTEGER,
        EXTRACT(HOUR FROM v_hour_start - INTERVAL '1 hour')::INTEGER,
        COUNT(*),
        COUNT(DISTINCT user_id),
        COALESCE(AVG(
          EXTRACT(EPOCH FROM (COALESCE(checked_out_at, NOW()) - checked_in_at)) / 60
        ), 0),
        (
          SELECT MAX(concurrent)
          FROM (
            SELECT COUNT(*) as concurrent
            FROM venue_checkins vc2
            WHERE vc2.venue_id = venue_checkins.venue_id
              AND vc2.checked_in_at <= venue_checkins.checked_in_at
              AND (vc2.checked_out_at IS NULL OR vc2.checked_out_at > venue_checkins.checked_in_at)
            GROUP BY vc2.venue_id
          ) counts
        ),
        COUNT(*) FILTER (WHERE open_to_join = TRUE),
        COALESCE(
          jsonb_object_agg(
            COALESCE(workout_type, 'unspecified'),
            COUNT(*) FILTER (WHERE workout_type IS NOT NULL)
          ) FILTER (WHERE workout_type IS NOT NULL),
          '{}'::jsonb
        )
      FROM venue_checkins
      WHERE checked_in_at >= v_hour_start - INTERVAL '1 hour'
        AND checked_in_at < v_hour_start
      GROUP BY venue_id
      ON CONFLICT (venue_id, hour_start)
      DO UPDATE SET
        total_checkins = EXCLUDED.total_checkins,
        unique_users = EXCLUDED.unique_users,
        avg_session_minutes = EXCLUDED.avg_session_minutes,
        peak_concurrent_users = EXCLUDED.peak_concurrent_users,
        open_to_train_count = EXCLUDED.open_to_train_count,
        workout_types = EXCLUDED.workout_types,
        updated_at = NOW();
    END;
    $$ LANGUAGE plpgsql
  `);

  // ============================================
  // 12. WEEKLY PATTERN UPDATE FUNCTION
  // ============================================
  log.info('Creating weekly pattern update function...');

  await db.query(`
    CREATE OR REPLACE FUNCTION update_venue_weekly_patterns()
    RETURNS void AS $$
    BEGIN
      -- Update weekly patterns based on last 4 weeks of data
      INSERT INTO venue_weekly_patterns (
        venue_id,
        day_of_week,
        hour_of_day,
        avg_users,
        avg_open_to_train,
        activity_level,
        is_peak_hour,
        data_points,
        last_updated
      )
      SELECT
        venue_id,
        day_of_week,
        hour_of_day,
        AVG(unique_users),
        AVG(open_to_train_count),
        CASE
          WHEN AVG(unique_users) >= 10 THEN 'very_high'
          WHEN AVG(unique_users) >= 5 THEN 'high'
          WHEN AVG(unique_users) >= 2 THEN 'medium'
          WHEN AVG(unique_users) >= 1 THEN 'low'
          ELSE 'very_low'
        END,
        AVG(unique_users) >= (
          SELECT PERCENTILE_CONT(0.8) WITHIN GROUP (ORDER BY unique_users)
          FROM venue_hourly_activity vha2
          WHERE vha2.venue_id = venue_hourly_activity.venue_id
            AND vha2.hour_start >= NOW() - INTERVAL '4 weeks'
        ),
        COUNT(*),
        NOW()
      FROM venue_hourly_activity
      WHERE hour_start >= NOW() - INTERVAL '4 weeks'
      GROUP BY venue_id, day_of_week, hour_of_day
      ON CONFLICT (venue_id, day_of_week, hour_of_day)
      DO UPDATE SET
        avg_users = EXCLUDED.avg_users,
        avg_open_to_train = EXCLUDED.avg_open_to_train,
        activity_level = EXCLUDED.activity_level,
        is_peak_hour = EXCLUDED.is_peak_hour,
        data_points = EXCLUDED.data_points,
        last_updated = NOW();
    END;
    $$ LANGUAGE plpgsql
  `);

  // ============================================
  // 13. ADD STREAK EARNING RULES
  // ============================================
  log.info('Adding streak earning rules...');

  const streakEarningRules = [
    { code: 'presence_streak_3', name: 'Partner Streak 3', description: 'Train with same partner 3 days in a row', category: 'social', credits_base: 10, xp_base: 15, max_per_day: 5 },
    { code: 'presence_streak_7', name: 'Partner Streak 7', description: 'Train with same partner 7 days in a row', category: 'social', credits_base: 25, xp_base: 40, max_per_day: 3 },
    { code: 'presence_streak_14', name: 'Partner Streak 14', description: 'Train with same partner 14 days in a row', category: 'social', credits_base: 50, xp_base: 75, max_per_day: 2 },
    { code: 'presence_streak_21', name: 'Partner Streak 21', description: 'Train with same partner 21 days in a row', category: 'social', credits_base: 75, xp_base: 100, max_per_day: 1 },
    { code: 'presence_streak_30', name: 'Partner Streak 30', description: 'Train with same partner 30 days in a row', category: 'social', credits_base: 100, xp_base: 150, max_per_day: 1 },
    { code: 'presence_recurring_attend', name: 'Recurring Session', description: 'Attend a recurring training session', category: 'social', credits_base: 15, xp_base: 20, max_per_day: 3 },
    { code: 'presence_recurring_create', name: 'Create Recurring', description: 'Create a recurring training schedule', category: 'social', credits_base: 50, xp_base: 75, max_per_day: 1 },
  ];

  for (const rule of streakEarningRules) {
    await db.query(
      `INSERT INTO earning_rules (code, name, description, category, credits_base, xp_base, max_per_day, enabled)
       VALUES ($1, $2, $3, $4, $5, $6, $7, true)
       ON CONFLICT (code) DO UPDATE SET
         name = EXCLUDED.name,
         description = EXCLUDED.description,
         credits_base = EXCLUDED.credits_base,
         xp_base = EXCLUDED.xp_base,
         max_per_day = EXCLUDED.max_per_day`,
      [rule.code, rule.name, rule.description, rule.category, rule.credits_base, rule.xp_base, rule.max_per_day]
    );
  }

  // ============================================
  // 14. ADD STREAK ACHIEVEMENTS
  // ============================================
  log.info('Adding streak achievements...');

  const achievements = [
    { key: 'presence_duo_7', name: 'Dynamic Duo', description: 'Maintain a 7-day streak with a training partner', icon: '🤼', category: 'social', points: 150, rarity: 'uncommon', enabled: true },
    { key: 'presence_duo_14', name: 'Inseparable', description: 'Maintain a 14-day streak with a training partner', icon: '🔗', category: 'social', points: 250, rarity: 'rare', enabled: true },
    { key: 'presence_duo_30', name: 'Iron Bond', description: 'Maintain a 30-day streak with a training partner', icon: '⛓️', category: 'social', points: 400, rarity: 'epic', enabled: true },
    { key: 'presence_heatmap_explorer', name: 'Heatmap Explorer', description: 'Train at 5 different peak hours at your favorite venue', icon: '🌡️', category: 'special', points: 200, rarity: 'uncommon', enabled: true },
    { key: 'presence_schedule_master', name: 'Schedule Master', description: 'Create 3 recurring training schedules with active members', icon: '📅', category: 'social', points: 300, rarity: 'rare', enabled: true },
    { key: 'presence_compatibility_king', name: 'Perfect Match', description: 'Find a training partner with 90%+ compatibility', icon: '💯', category: 'social', points: 250, rarity: 'rare', enabled: true },
  ];

  for (const a of achievements) {
    await db.query(
      `INSERT INTO achievement_definitions (key, name, description, icon, category, points, rarity, enabled)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT (key) DO NOTHING`,
      [a.key, a.name, a.description, a.icon, a.category, a.points, a.rarity, a.enabled]
    );
  }

  log.info('Migration 146_presence_enhancements completed successfully');
}

export async function down(): Promise<void> {
  log.info('Rolling back migration: 146_presence_enhancements');

  // Remove earning rules
  await db.query(`
    DELETE FROM earning_rules WHERE code IN (
      'presence_streak_3', 'presence_streak_7', 'presence_streak_14',
      'presence_streak_21', 'presence_streak_30',
      'presence_recurring_attend', 'presence_recurring_create'
    )
  `);

  // Remove achievements
  await db.query(`
    DELETE FROM achievement_definitions WHERE key IN (
      'presence_duo_7', 'presence_duo_14', 'presence_duo_30',
      'presence_heatmap_explorer', 'presence_schedule_master', 'presence_compatibility_king'
    )
  `);

  // Drop functions
  await db.query(`DROP FUNCTION IF EXISTS update_venue_weekly_patterns()`);
  await db.query(`DROP FUNCTION IF EXISTS aggregate_venue_hourly_activity()`);
  await db.query(`DROP TRIGGER IF EXISTS tr_partnership_session_streak ON partnership_sessions`);
  await db.query(`DROP FUNCTION IF EXISTS update_partnership_streak()`);
  await db.query(`DROP FUNCTION IF EXISTS calculate_streak_bonus(INTEGER)`);

  // Drop tables in reverse dependency order
  await db.query(`DROP TABLE IF EXISTS recurring_schedule_members`);
  await db.query(`DROP TABLE IF EXISTS recurring_training_schedules`);
  await db.query(`DROP TABLE IF EXISTS partner_compatibility_cache`);
  await db.query(`DROP TABLE IF EXISTS user_training_preferences`);
  await db.query(`DROP TABLE IF EXISTS venue_weekly_patterns`);
  await db.query(`DROP TABLE IF EXISTS venue_hourly_activity`);
  await db.query(`DROP TABLE IF EXISTS partnership_sessions`);
  await db.query(`DROP TABLE IF EXISTS training_partnerships`);

  // Remove quick_status columns from user_presence
  await db.query(`ALTER TABLE user_presence DROP COLUMN IF EXISTS quick_status`);
  await db.query(`ALTER TABLE user_presence DROP COLUMN IF EXISTS quick_status_set_at`);
  await db.query(`ALTER TABLE user_presence DROP COLUMN IF EXISTS quick_status_expires_at`);

  // Drop enum
  await db.query(`DROP TYPE IF EXISTS quick_status_type`);

  log.info('Rollback of 146_presence_enhancements completed');
}

// For compatibility with migrate runner that expects migrate() function
export const migrate = up;
