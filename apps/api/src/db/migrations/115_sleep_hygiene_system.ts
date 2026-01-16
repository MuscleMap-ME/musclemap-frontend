/**
 * Migration: Sleep Hygiene System
 *
 * Extends the existing sleep/recovery system with:
 * - Sleep hygiene preferences (enable/disable)
 * - Sleep hygiene tips library
 * - Sleep hygiene assessments (daily/weekly checklists)
 * - Sleep streaks with credit rewards
 * - Personalized sleep hygiene recommendations
 *
 * Users can earn credits for:
 * - Logging sleep consistently (streak bonuses)
 * - Meeting sleep duration targets
 * - Maintaining good sleep quality
 * - Following sleep hygiene recommendations
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
  log.info('Running migration: 114_sleep_hygiene_system');

  // ============================================
  // SLEEP HYGIENE PREFERENCES TABLE
  // ============================================
  if (!(await tableExists('sleep_hygiene_preferences'))) {
    log.info('Creating sleep_hygiene_preferences table...');
    await db.query(`
      CREATE TABLE sleep_hygiene_preferences (
        id TEXT PRIMARY KEY DEFAULT 'shp_' || replace(gen_random_uuid()::text, '-', ''),
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,

        -- Enable/disable feature
        enabled BOOLEAN NOT NULL DEFAULT FALSE,

        -- Display preferences
        show_on_dashboard BOOLEAN NOT NULL DEFAULT TRUE,
        show_tips BOOLEAN NOT NULL DEFAULT TRUE,
        show_assessments BOOLEAN NOT NULL DEFAULT TRUE,

        -- Notification preferences
        bedtime_reminder_enabled BOOLEAN NOT NULL DEFAULT FALSE,
        bedtime_reminder_minutes_before INTEGER DEFAULT 30,
        morning_check_in_enabled BOOLEAN NOT NULL DEFAULT FALSE,
        weekly_report_enabled BOOLEAN NOT NULL DEFAULT TRUE,

        -- Credit earning preferences
        earn_credits_enabled BOOLEAN NOT NULL DEFAULT TRUE,

        -- Timestamps
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

        UNIQUE(user_id)
      )
    `);

    await db.query('CREATE INDEX idx_sleep_hygiene_prefs_user ON sleep_hygiene_preferences(user_id)');
    log.info('sleep_hygiene_preferences table created');
  }

  // ============================================
  // SLEEP HYGIENE TIPS LIBRARY
  // ============================================
  if (!(await tableExists('sleep_hygiene_tips'))) {
    log.info('Creating sleep_hygiene_tips table...');
    await db.query(`
      CREATE TABLE sleep_hygiene_tips (
        id TEXT PRIMARY KEY DEFAULT 'sht_' || replace(gen_random_uuid()::text, '-', ''),

        -- Tip categorization
        category TEXT NOT NULL CHECK (category IN (
          'environment', 'routine', 'nutrition', 'activity',
          'mental', 'technology', 'timing', 'general'
        )),
        priority INTEGER NOT NULL DEFAULT 5 CHECK (priority >= 1 AND priority <= 10),

        -- Content
        title TEXT NOT NULL,
        description TEXT NOT NULL,
        detailed_explanation TEXT,
        icon TEXT DEFAULT 'moon',

        -- Scientific backing
        evidence_level TEXT CHECK (evidence_level IN ('strong', 'moderate', 'emerging', 'anecdotal')),
        source_references TEXT[],

        -- Targeting
        applicable_to_archetypes TEXT[] DEFAULT '{}',
        applicable_to_issues TEXT[] DEFAULT '{}', -- e.g., ['insomnia', 'sleep_latency', 'night_waking']

        -- Display
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        display_order INTEGER DEFAULT 0,

        -- Timestamps
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    await db.query('CREATE INDEX idx_sleep_hygiene_tips_category ON sleep_hygiene_tips(category) WHERE is_active = TRUE');
    await db.query('CREATE INDEX idx_sleep_hygiene_tips_priority ON sleep_hygiene_tips(priority DESC) WHERE is_active = TRUE');
    log.info('sleep_hygiene_tips table created');

    // Seed initial tips
    log.info('Seeding sleep hygiene tips...');
    await db.query(`
      INSERT INTO sleep_hygiene_tips (category, priority, title, description, detailed_explanation, icon, evidence_level, applicable_to_issues)
      VALUES
        -- Environment tips
        ('environment', 9, 'Keep Your Bedroom Cool', 'Maintain bedroom temperature between 65-68°F (18-20°C)', 'Your body temperature naturally drops during sleep. A cooler room supports this process and helps you fall asleep faster. Too warm of a room can cause restlessness and disrupted sleep cycles.', 'thermometer', 'strong', ARRAY['sleep_latency', 'night_waking']),
        ('environment', 9, 'Make It Dark', 'Use blackout curtains or an eye mask', 'Light exposure suppresses melatonin production. Even small amounts of light from electronics or street lamps can disrupt your circadian rhythm and reduce sleep quality.', 'moon', 'strong', ARRAY['sleep_latency', 'early_waking']),
        ('environment', 8, 'Minimize Noise', 'Use earplugs or white noise if needed', 'Sudden noises can pull you out of deep sleep. Consistent background noise can mask disruptive sounds and create a more stable sleep environment.', 'volume-x', 'moderate', ARRAY['night_waking', 'light_sleep']),
        ('environment', 7, 'Reserve Your Bed for Sleep', 'Avoid working, eating, or watching TV in bed', 'Your brain creates associations between environments and activities. Using your bed only for sleep strengthens the mental connection between your bed and rest.', 'bed', 'moderate', ARRAY['insomnia', 'sleep_latency']),

        -- Routine tips
        ('routine', 10, 'Consistent Sleep Schedule', 'Go to bed and wake up at the same time daily', 'Your circadian rhythm thrives on consistency. Irregular sleep schedules confuse your internal clock and can lead to chronic sleep issues similar to jet lag.', 'clock', 'strong', ARRAY['insomnia', 'irregular_sleep']),
        ('routine', 8, 'Create a Wind-Down Routine', 'Start relaxing 30-60 minutes before bed', 'A consistent pre-sleep routine signals to your body that it''s time to transition to sleep. This could include reading, gentle stretching, or meditation.', 'sunset', 'strong', ARRAY['sleep_latency', 'racing_thoughts']),
        ('routine', 7, 'Morning Sunlight Exposure', 'Get 10-30 minutes of bright light after waking', 'Morning light exposure helps reset your circadian rhythm and improves alertness during the day while promoting better sleep at night.', 'sun', 'strong', ARRAY['delayed_sleep', 'daytime_fatigue']),

        -- Nutrition tips
        ('nutrition', 8, 'Limit Caffeine After Noon', 'Avoid coffee and caffeinated drinks after 2 PM', 'Caffeine has a half-life of 5-6 hours. Even afternoon coffee can interfere with falling asleep and reduce deep sleep quality hours later.', 'coffee', 'strong', ARRAY['sleep_latency', 'light_sleep']),
        ('nutrition', 8, 'Avoid Heavy Meals Before Bed', 'Finish eating 2-3 hours before sleep', 'Digesting large meals diverts blood flow and energy, making it harder to fall asleep. Late eating is also associated with acid reflux and disrupted sleep.', 'utensils', 'moderate', ARRAY['sleep_latency', 'night_waking']),
        ('nutrition', 7, 'Limit Alcohol', 'Avoid alcohol within 3 hours of bedtime', 'While alcohol may help you fall asleep initially, it fragments sleep later in the night and suppresses REM sleep, leaving you less rested.', 'wine', 'strong', ARRAY['night_waking', 'light_sleep', 'early_waking']),
        ('nutrition', 6, 'Stay Hydrated (But Not Too Much)', 'Balance hydration to avoid nighttime bathroom trips', 'Dehydration can cause discomfort, but drinking too much before bed leads to sleep-disrupting bathroom visits.', 'droplet', 'moderate', ARRAY['night_waking']),

        -- Activity tips
        ('activity', 8, 'Regular Exercise', 'Exercise regularly, but not within 3 hours of bedtime', 'Regular physical activity improves sleep quality and helps you fall asleep faster. However, intense exercise too close to bedtime can be stimulating.', 'dumbbell', 'strong', ARRAY['insomnia', 'sleep_latency']),
        ('activity', 6, 'Gentle Stretching Before Bed', 'Try 5-10 minutes of relaxing stretches', 'Light stretching releases muscle tension accumulated during the day and activates the parasympathetic nervous system, promoting relaxation.', 'stretch', 'moderate', ARRAY['muscle_tension', 'restlessness']),

        -- Mental tips
        ('mental', 8, 'Practice Relaxation Techniques', 'Try deep breathing, meditation, or progressive muscle relaxation', 'These techniques activate the parasympathetic nervous system, reducing stress hormones and preparing your body for sleep.', 'brain', 'strong', ARRAY['racing_thoughts', 'anxiety', 'sleep_latency']),
        ('mental', 7, 'Write Down Tomorrow''s Tasks', 'Keep a notepad by your bed for thoughts', 'Getting pending tasks out of your head and onto paper reduces mental load and worry about forgetting important things.', 'clipboard-list', 'moderate', ARRAY['racing_thoughts', 'anxiety']),
        ('mental', 6, 'Avoid Stressful Activities Before Bed', 'Save difficult conversations and work for earlier', 'Engaging with stressful content activates your fight-or-flight response, releasing cortisol and adrenaline that oppose sleep.', 'shield', 'moderate', ARRAY['racing_thoughts', 'anxiety', 'sleep_latency']),

        -- Technology tips
        ('technology', 9, 'Limit Screen Time Before Bed', 'Stop using screens 1 hour before sleep', 'Blue light from devices suppresses melatonin. The engaging content also keeps your mind active when it should be winding down.', 'smartphone', 'strong', ARRAY['sleep_latency', 'melatonin_suppression']),
        ('technology', 7, 'Use Night Mode', 'Enable blue light filters on devices', 'If you must use screens, blue light filters can reduce (but not eliminate) the sleep-disrupting effects of device use.', 'monitor', 'moderate', ARRAY['melatonin_suppression']),
        ('technology', 6, 'Keep Devices Out of Reach', 'Charge your phone across the room', 'This removes the temptation to check notifications and helps you resist scrolling when you should be sleeping.', 'phone-off', 'emerging', ARRAY['sleep_latency', 'night_waking']),

        -- Timing tips
        ('timing', 8, 'Nap Wisely', 'Keep naps to 20-30 minutes, before 3 PM', 'Long or late naps can interfere with nighttime sleep by reducing sleep pressure. Short power naps, however, can boost alertness without disrupting night sleep.', 'alarm-clock', 'strong', ARRAY['insomnia', 'sleep_latency']),
        ('timing', 7, 'Track Your Sleep', 'Monitor patterns to identify issues', 'Keeping a sleep diary helps identify factors affecting your sleep and track the effectiveness of changes you make.', 'bar-chart', 'moderate', ARRAY['general'])
    `);
    log.info('Sleep hygiene tips seeded');
  }

  // ============================================
  // SLEEP HYGIENE ASSESSMENTS TABLE
  // ============================================
  if (!(await tableExists('sleep_hygiene_assessments'))) {
    log.info('Creating sleep_hygiene_assessments table...');
    await db.query(`
      CREATE TABLE sleep_hygiene_assessments (
        id TEXT PRIMARY KEY DEFAULT 'sha_' || replace(gen_random_uuid()::text, '-', ''),
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,

        -- Assessment date (one per day)
        assessment_date DATE NOT NULL,

        -- Pre-sleep checklist (evening)
        pre_sleep_checklist JSONB DEFAULT '{}',
        /*
         * Example:
         * {
         *   "avoided_caffeine": true,
         *   "avoided_alcohol": true,
         *   "avoided_screens_1hr": true,
         *   "cool_room": true,
         *   "dark_room": true,
         *   "wind_down_routine": true,
         *   "consistent_bedtime": true
         * }
         */

        -- Post-sleep checklist (morning)
        post_sleep_checklist JSONB DEFAULT '{}',
        /*
         * Example:
         * {
         *   "fell_asleep_easily": true,
         *   "stayed_asleep": true,
         *   "woke_refreshed": true,
         *   "no_grogginess": true
         * }
         */

        -- Scores (0-100)
        pre_sleep_score INTEGER CHECK (pre_sleep_score IS NULL OR (pre_sleep_score >= 0 AND pre_sleep_score <= 100)),
        post_sleep_score INTEGER CHECK (post_sleep_score IS NULL OR (post_sleep_score >= 0 AND post_sleep_score <= 100)),
        overall_score INTEGER CHECK (overall_score IS NULL OR (overall_score >= 0 AND overall_score <= 100)),

        -- Credits awarded for this assessment
        credits_awarded INTEGER DEFAULT 0,

        -- Notes
        notes TEXT,

        -- Timestamps
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

        UNIQUE(user_id, assessment_date)
      )
    `);

    await db.query('CREATE INDEX idx_sleep_hygiene_assessments_user_date ON sleep_hygiene_assessments(user_id, assessment_date DESC)');
    await db.query('CREATE INDEX idx_sleep_hygiene_assessments_score ON sleep_hygiene_assessments(user_id, overall_score DESC)');
    log.info('sleep_hygiene_assessments table created');
  }

  // ============================================
  // SLEEP HYGIENE STREAKS TABLE
  // ============================================
  if (!(await tableExists('sleep_hygiene_streaks'))) {
    log.info('Creating sleep_hygiene_streaks table...');
    await db.query(`
      CREATE TABLE sleep_hygiene_streaks (
        id TEXT PRIMARY KEY DEFAULT 'shs_' || replace(gen_random_uuid()::text, '-', ''),
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,

        -- Streak type
        streak_type TEXT NOT NULL CHECK (streak_type IN (
          'sleep_logged',           -- Consecutive days logging sleep
          'target_duration_met',    -- Consecutive days meeting sleep target
          'good_quality',           -- Consecutive days with quality >= 4
          'excellent_quality',      -- Consecutive days with quality = 5
          'hygiene_checklist',      -- Consecutive days completing hygiene checklist
          'perfect_hygiene',        -- Consecutive days with 100% hygiene score
          'consistent_bedtime',     -- Consecutive days within 30min of target
          'no_screens'             -- Consecutive days avoiding screens before bed
        )),

        -- Current streak
        current_streak INTEGER NOT NULL DEFAULT 0,
        current_streak_start DATE,

        -- Best streak
        best_streak INTEGER NOT NULL DEFAULT 0,
        best_streak_start DATE,
        best_streak_end DATE,

        -- Last activity
        last_activity_date DATE,

        -- Total credits earned from this streak type
        total_credits_earned INTEGER NOT NULL DEFAULT 0,

        -- Timestamps
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

        UNIQUE(user_id, streak_type)
      )
    `);

    await db.query('CREATE INDEX idx_sleep_hygiene_streaks_user ON sleep_hygiene_streaks(user_id)');
    await db.query('CREATE INDEX idx_sleep_hygiene_streaks_current ON sleep_hygiene_streaks(current_streak DESC)');
    log.info('sleep_hygiene_streaks table created');
  }

  // ============================================
  // SLEEP CREDIT AWARDS TABLE
  // ============================================
  if (!(await tableExists('sleep_credit_awards'))) {
    log.info('Creating sleep_credit_awards table...');
    await db.query(`
      CREATE TABLE sleep_credit_awards (
        id TEXT PRIMARY KEY DEFAULT 'sca_' || replace(gen_random_uuid()::text, '-', ''),
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,

        -- Award date
        award_date DATE NOT NULL,

        -- Award type
        award_type TEXT NOT NULL CHECK (award_type IN (
          'daily_log',              -- Credits for logging sleep (5 credits)
          'target_met',             -- Credits for meeting duration target (10 credits)
          'good_quality',           -- Credits for good quality sleep (5 credits)
          'excellent_quality',      -- Bonus for excellent quality (10 credits)
          'hygiene_checklist',      -- Credits for completing checklist (5 credits)
          'perfect_hygiene',        -- Bonus for 100% hygiene score (15 credits)
          'streak_milestone_7',     -- 7-day streak bonus (25 credits)
          'streak_milestone_14',    -- 14-day streak bonus (50 credits)
          'streak_milestone_30',    -- 30-day streak bonus (100 credits)
          'streak_milestone_60',    -- 60-day streak bonus (200 credits)
          'streak_milestone_90',    -- 90-day streak bonus (350 credits)
          'weekly_consistency'      -- Weekly consistency bonus (20 credits)
        )),

        -- Credits awarded
        credits INTEGER NOT NULL,

        -- Reference to related records
        sleep_log_id TEXT REFERENCES sleep_logs(id) ON DELETE SET NULL,
        assessment_id TEXT REFERENCES sleep_hygiene_assessments(id) ON DELETE SET NULL,
        streak_id TEXT REFERENCES sleep_hygiene_streaks(id) ON DELETE SET NULL,

        -- Metadata
        metadata JSONB DEFAULT '{}',

        -- Credit ledger entry ID for reference
        ledger_entry_id TEXT,

        -- Timestamps
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

        -- Prevent duplicate awards for same type on same day
        UNIQUE(user_id, award_date, award_type)
      )
    `);

    await db.query('CREATE INDEX idx_sleep_credit_awards_user_date ON sleep_credit_awards(user_id, award_date DESC)');
    await db.query('CREATE INDEX idx_sleep_credit_awards_type ON sleep_credit_awards(award_type, award_date DESC)');
    log.info('sleep_credit_awards table created');
  }

  // ============================================
  // USER TIP INTERACTIONS TABLE
  // ============================================
  if (!(await tableExists('sleep_hygiene_tip_interactions'))) {
    log.info('Creating sleep_hygiene_tip_interactions table...');
    await db.query(`
      CREATE TABLE sleep_hygiene_tip_interactions (
        id TEXT PRIMARY KEY DEFAULT 'shti_' || replace(gen_random_uuid()::text, '-', ''),
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        tip_id TEXT NOT NULL REFERENCES sleep_hygiene_tips(id) ON DELETE CASCADE,

        -- Interaction state
        is_bookmarked BOOLEAN NOT NULL DEFAULT FALSE,
        is_dismissed BOOLEAN NOT NULL DEFAULT FALSE,
        is_following BOOLEAN NOT NULL DEFAULT FALSE,

        -- Effectiveness tracking
        times_shown INTEGER NOT NULL DEFAULT 0,
        times_helpful INTEGER NOT NULL DEFAULT 0,
        times_not_helpful INTEGER NOT NULL DEFAULT 0,

        -- Timestamps
        first_shown_at TIMESTAMPTZ,
        last_shown_at TIMESTAMPTZ,
        bookmarked_at TIMESTAMPTZ,
        following_since TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

        UNIQUE(user_id, tip_id)
      )
    `);

    await db.query('CREATE INDEX idx_sleep_tip_interactions_user ON sleep_hygiene_tip_interactions(user_id)');
    await db.query('CREATE INDEX idx_sleep_tip_interactions_following ON sleep_hygiene_tip_interactions(user_id) WHERE is_following = TRUE');
    log.info('sleep_hygiene_tip_interactions table created');
  }

  log.info('Migration 114_sleep_hygiene_system completed');
}

export async function down(): Promise<void> {
  log.info('Rolling back migration: 114_sleep_hygiene_system');

  await db.query('DROP TABLE IF EXISTS sleep_hygiene_tip_interactions CASCADE');
  await db.query('DROP TABLE IF EXISTS sleep_credit_awards CASCADE');
  await db.query('DROP TABLE IF EXISTS sleep_hygiene_streaks CASCADE');
  await db.query('DROP TABLE IF EXISTS sleep_hygiene_assessments CASCADE');
  await db.query('DROP TABLE IF EXISTS sleep_hygiene_tips CASCADE');
  await db.query('DROP TABLE IF EXISTS sleep_hygiene_preferences CASCADE');

  log.info('Rollback 114_sleep_hygiene_system completed');
}
