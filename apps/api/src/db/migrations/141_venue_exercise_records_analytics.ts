// DESTRUCTIVE: This migration creates new tables and columns. The down() function drops them.
/**
 * Migration 141: Venue Exercise Records & Community Analytics
 *
 * Extends the venue records system (migration 132) with:
 * - Per-exercise records at venues (linked to workout sessions)
 * - Auto-detection of PRs during workout completion
 * - Daily activity aggregates for community visualizations
 * - Cached leaderboards for fast access
 * - Privacy controls for location-based data sharing
 *
 * Key features:
 * - Users set records (max weight, max reps, fastest time, max 1RM, max distance) at venues
 * - Top 3 positions require verification (video or witness)
 * - Users opt-in to share their records/activity publicly
 * - Aggregate charts show community activity patterns at venues
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

export async function up(): Promise<void> {
  log.info('Running migration: 141_venue_exercise_records_analytics');

  // ============================================
  // 1. USER PRIVACY COLUMNS FOR LOCATION RECORDS
  // ============================================
  log.info('Adding privacy columns to users table...');

  if (!(await columnExists('users', 'share_location_records'))) {
    await db.query(`ALTER TABLE users ADD COLUMN share_location_records BOOLEAN DEFAULT false`);
  }

  if (!(await columnExists('users', 'share_venue_activity'))) {
    await db.query(`ALTER TABLE users ADD COLUMN share_venue_activity BOOLEAN DEFAULT false`);
  }

  // ============================================
  // 2. VENUE EXERCISE RECORDS TABLE
  // Per-exercise records at specific venues
  // ============================================
  if (!(await tableExists('venue_exercise_records'))) {
    log.info('Creating venue_exercise_records table...');
    await db.query(`
      CREATE TABLE venue_exercise_records (
        id TEXT PRIMARY KEY DEFAULT 'ver_' || replace(gen_random_uuid()::text, '-', ''),

        -- Foreign keys
        venue_id TEXT NOT NULL,
        exercise_id TEXT NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,

        -- Record type and value
        record_type TEXT NOT NULL CHECK (
          record_type IN ('max_weight', 'max_reps', 'fastest_time', 'max_distance', 'max_1rm')
        ),
        record_value DECIMAL(12, 3) NOT NULL,
        record_unit TEXT NOT NULL CHECK (
          record_unit IN ('kg', 'lbs', 'reps', 'seconds', 'meters', '1rm_kg', '1rm_lbs')
        ),

        -- Context from workout
        workout_session_id TEXT,
        set_id TEXT,
        reps_at_weight INTEGER,
        weight_at_reps DECIMAL(8, 2),

        -- Verification (top 3 require verification)
        verification_status TEXT DEFAULT 'unverified' CHECK (
          verification_status IN ('unverified', 'self_verified', 'witness_verified', 'video_verified', 'pending_verification')
        ),
        video_url TEXT,
        video_thumbnail_url TEXT,
        witness_count INTEGER DEFAULT 0,
        verification_deadline TIMESTAMPTZ,

        -- Timestamps
        achieved_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        verified_at TIMESTAMPTZ,

        -- Metadata
        conditions JSONB DEFAULT '{}',
        notes TEXT,
        device_info JSONB DEFAULT '{}',

        -- Tracking
        previous_record_value DECIMAL(12, 3),
        previous_record_holder_id TEXT REFERENCES users(id) ON DELETE SET NULL,

        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),

        -- One record per type per exercise per user per venue
        CONSTRAINT venue_exercise_records_unique
          UNIQUE(venue_id, exercise_id, user_id, record_type)
      )
    `);

    // Indexes for performance
    await db.query(`CREATE INDEX idx_ver_venue_exercise ON venue_exercise_records(venue_id, exercise_id)`);
    await db.query(`CREATE INDEX idx_ver_user ON venue_exercise_records(user_id)`);
    await db.query(`CREATE INDEX idx_ver_exercise_type_value ON venue_exercise_records(exercise_id, record_type, record_value DESC)`);
    await db.query(`CREATE INDEX idx_ver_achieved_at ON venue_exercise_records(achieved_at DESC)`);
    await db.query(`CREATE INDEX idx_ver_keyset ON venue_exercise_records(venue_id, achieved_at DESC, id DESC)`);
    await db.query(`CREATE INDEX idx_ver_verification ON venue_exercise_records(verification_status, verification_deadline) WHERE verification_status = 'pending_verification'`);
    await db.query(`CREATE INDEX idx_ver_user_venue ON venue_exercise_records(user_id, venue_id)`);

    // Covering index for leaderboard queries
    await db.query(`
      CREATE INDEX idx_ver_leaderboard
      ON venue_exercise_records(venue_id, exercise_id, record_type, record_value DESC)
      INCLUDE (user_id, achieved_at, verification_status)
    `);
  }

  // ============================================
  // 3. VENUE EXERCISE RECORD WITNESSES TABLE
  // ============================================
  if (!(await tableExists('venue_record_witnesses'))) {
    log.info('Creating venue_record_witnesses table...');
    await db.query(`
      CREATE TABLE venue_record_witnesses (
        id TEXT PRIMARY KEY DEFAULT 'vrw_' || replace(gen_random_uuid()::text, '-', ''),
        record_id TEXT NOT NULL REFERENCES venue_exercise_records(id) ON DELETE CASCADE,
        witness_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,

        -- Witness location verification
        witness_latitude DECIMAL(10, 7),
        witness_longitude DECIMAL(10, 7),
        distance_from_venue_meters DECIMAL(10, 2),

        -- Attestation
        attestation TEXT,
        witnessed_at TIMESTAMPTZ DEFAULT NOW(),

        -- Validity
        is_valid BOOLEAN DEFAULT true,
        invalidation_reason TEXT,

        created_at TIMESTAMPTZ DEFAULT NOW(),

        -- One witness per user per record
        CONSTRAINT venue_record_witnesses_unique UNIQUE(record_id, witness_user_id)
      )
    `);

    await db.query(`CREATE INDEX idx_vrw_record ON venue_record_witnesses(record_id)`);
    await db.query(`CREATE INDEX idx_vrw_witness ON venue_record_witnesses(witness_user_id)`);
  }

  // ============================================
  // 4. VENUE ACTIVITY DAILY AGGREGATES TABLE
  // Pre-computed for fast visualization queries
  // ============================================
  if (!(await tableExists('venue_activity_daily'))) {
    log.info('Creating venue_activity_daily table...');
    await db.query(`
      CREATE TABLE venue_activity_daily (
        id TEXT PRIMARY KEY DEFAULT 'vad_' || replace(gen_random_uuid()::text, '-', ''),
        venue_id TEXT NOT NULL,
        activity_date DATE NOT NULL,

        -- User counts (privacy-aware)
        total_users INTEGER DEFAULT 0,
        public_users INTEGER DEFAULT 0,

        -- Workout aggregates
        total_workouts INTEGER DEFAULT 0,
        total_sets INTEGER DEFAULT 0,
        total_reps BIGINT DEFAULT 0,
        total_volume_kg DECIMAL(14, 2) DEFAULT 0,
        total_tu DECIMAL(12, 2) DEFAULT 0,

        -- Exercise breakdown for pie charts
        -- Format: { "bench_press": 45, "pull_up": 32, ... }
        exercises_breakdown JSONB DEFAULT '{}',

        -- Muscle activation for heatmaps
        -- Format: { "pectoralis_major": 1250.5, "latissimus_dorsi": 980.3, ... }
        muscle_activations JSONB DEFAULT '{}',

        -- Hourly distribution for bar charts (24 values, 0-23)
        hourly_activity JSONB DEFAULT '[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]',

        -- Records set that day
        records_set INTEGER DEFAULT 0,
        new_personal_records INTEGER DEFAULT 0,
        venue_records_broken INTEGER DEFAULT 0,

        -- Peak metrics
        peak_concurrent_users INTEGER DEFAULT 0,
        busiest_hour INTEGER,

        -- Aggregation metadata
        last_aggregated_at TIMESTAMPTZ DEFAULT NOW(),
        aggregation_version INTEGER DEFAULT 1,

        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),

        CONSTRAINT venue_activity_daily_unique UNIQUE(venue_id, activity_date)
      )
    `);

    await db.query(`CREATE INDEX idx_vad_venue_date ON venue_activity_daily(venue_id, activity_date DESC)`);
    await db.query(`CREATE INDEX idx_vad_date ON venue_activity_daily(activity_date DESC)`);
    await db.query(`CREATE INDEX idx_vad_aggregate ON venue_activity_daily(last_aggregated_at)`);
  }

  // ============================================
  // 5. VENUE LEADERBOARDS CACHE TABLE
  // Materialized rankings for fast access
  // ============================================
  if (!(await tableExists('venue_leaderboards'))) {
    log.info('Creating venue_leaderboards table...');
    await db.query(`
      CREATE TABLE venue_leaderboards (
        id TEXT PRIMARY KEY DEFAULT 'vl_' || replace(gen_random_uuid()::text, '-', ''),
        venue_id TEXT NOT NULL,
        exercise_id TEXT NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,
        record_type TEXT NOT NULL CHECK (
          record_type IN ('max_weight', 'max_reps', 'fastest_time', 'max_distance', 'max_1rm')
        ),

        -- Cached top 100 rankings
        -- Format: [{ "rank": 1, "user_id": "...", "username": "...", "value": 135.5, ... }, ...]
        rankings JSONB NOT NULL DEFAULT '[]',

        -- Metadata
        total_participants INTEGER DEFAULT 0,
        verified_participants INTEGER DEFAULT 0,

        -- Cache management
        last_updated_at TIMESTAMPTZ DEFAULT NOW(),
        cache_version INTEGER DEFAULT 1,
        stale_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '5 minutes',

        CONSTRAINT venue_leaderboards_unique UNIQUE(venue_id, exercise_id, record_type)
      )
    `);

    await db.query(`CREATE INDEX idx_vl_venue ON venue_leaderboards(venue_id)`);
    await db.query(`CREATE INDEX idx_vl_exercise ON venue_leaderboards(exercise_id)`);
    // Note: Removed partial index with WHERE stale_at < NOW() - NOW() is not immutable
    await db.query(`CREATE INDEX idx_vl_stale ON venue_leaderboards(stale_at)`);
  }

  // ============================================
  // 6. GLOBAL EXERCISE LEADERBOARDS TABLE
  // Cross-venue rankings per exercise
  // ============================================
  if (!(await tableExists('global_exercise_leaderboards'))) {
    log.info('Creating global_exercise_leaderboards table...');
    await db.query(`
      CREATE TABLE global_exercise_leaderboards (
        id TEXT PRIMARY KEY DEFAULT 'gel_' || replace(gen_random_uuid()::text, '-', ''),
        exercise_id TEXT NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,
        record_type TEXT NOT NULL CHECK (
          record_type IN ('max_weight', 'max_reps', 'fastest_time', 'max_distance', 'max_1rm')
        ),

        -- Cached top 100 rankings
        rankings JSONB NOT NULL DEFAULT '[]',

        -- Metadata
        total_participants INTEGER DEFAULT 0,
        venues_with_records INTEGER DEFAULT 0,

        -- Cache management
        last_updated_at TIMESTAMPTZ DEFAULT NOW(),
        cache_version INTEGER DEFAULT 1,
        stale_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '5 minutes',

        CONSTRAINT global_exercise_leaderboards_unique UNIQUE(exercise_id, record_type)
      )
    `);

    await db.query(`CREATE INDEX idx_gel_exercise ON global_exercise_leaderboards(exercise_id)`);
    // Note: Removed partial index with WHERE stale_at < NOW() - NOW() is not immutable
    await db.query(`CREATE INDEX idx_gel_stale ON global_exercise_leaderboards(stale_at)`);
  }

  // ============================================
  // 7. VENUE ACTIVITY LOG TABLE
  // Real-time activity tracking for aggregation
  // ============================================
  if (!(await tableExists('venue_activity_log'))) {
    log.info('Creating venue_activity_log table...');
    await db.query(`
      CREATE TABLE venue_activity_log (
        id TEXT PRIMARY KEY DEFAULT 'val_' || replace(gen_random_uuid()::text, '-', ''),
        venue_id TEXT NOT NULL,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        workout_session_id TEXT,

        -- Activity type
        activity_type TEXT NOT NULL CHECK (
          activity_type IN ('checkin', 'checkout', 'workout_start', 'workout_end', 'set_logged', 'record_claimed')
        ),

        -- Privacy flag (from user settings at time of activity)
        is_public BOOLEAN DEFAULT false,

        -- Metrics for this activity
        sets_count INTEGER DEFAULT 0,
        reps_count INTEGER DEFAULT 0,
        volume_kg DECIMAL(10, 2) DEFAULT 0,
        tu_earned DECIMAL(8, 2) DEFAULT 0,
        exercise_id TEXT,

        -- Muscle activations for this set/workout
        muscle_activations JSONB DEFAULT '{}',

        -- Timestamp
        activity_at TIMESTAMPTZ DEFAULT NOW(),

        -- For time-series partitioning (computed on insert, not generated columns)
        -- Using regular columns instead of GENERATED columns because ::date cast isn't immutable
        activity_date DATE,
        activity_hour INTEGER
      )
    `);

    // Create a trigger to compute activity_date and activity_hour on insert
    await db.query(`
      CREATE OR REPLACE FUNCTION compute_activity_date_hour()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.activity_date := (NEW.activity_at AT TIME ZONE 'UTC')::date;
        NEW.activity_hour := EXTRACT(HOUR FROM NEW.activity_at AT TIME ZONE 'UTC')::integer;
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);

    await db.query(`
      CREATE TRIGGER trg_compute_activity_date_hour
      BEFORE INSERT OR UPDATE ON venue_activity_log
      FOR EACH ROW
      EXECUTE FUNCTION compute_activity_date_hour();
    `);

    // Indexes for aggregation queries
    await db.query(`CREATE INDEX idx_val_venue_date ON venue_activity_log(venue_id, activity_date, activity_hour)`);
    await db.query(`CREATE INDEX idx_val_aggregation ON venue_activity_log(activity_date, venue_id)`);
    await db.query(`CREATE INDEX idx_val_user ON venue_activity_log(user_id, activity_at DESC)`);

    // Partial index for public activities only
    await db.query(`CREATE INDEX idx_val_public ON venue_activity_log(venue_id, activity_date) WHERE is_public = true`);
  }

  // ============================================
  // 8. ADD VENUE_ID TO WORKOUT_SESSIONS
  // Link workouts to venues for auto-PR detection
  // ============================================
  if (!(await columnExists('workout_sessions', 'venue_id'))) {
    log.info('Adding venue_id to workout_sessions...');
    await db.query(`ALTER TABLE workout_sessions ADD COLUMN venue_id TEXT`);
    await db.query(`CREATE INDEX idx_workout_sessions_venue ON workout_sessions(venue_id) WHERE venue_id IS NOT NULL`);
  }

  if (!(await columnExists('workout_sessions', 'venue_checkin_id'))) {
    await db.query(`ALTER TABLE workout_sessions ADD COLUMN venue_checkin_id TEXT`);
  }

  // ============================================
  // 9. ADD VENUE_ID TO WORKOUTS TABLE
  // ============================================
  if (!(await columnExists('workouts', 'venue_id'))) {
    log.info('Adding venue_id to workouts...');
    await db.query(`ALTER TABLE workouts ADD COLUMN venue_id TEXT`);
    await db.query(`CREATE INDEX idx_workouts_venue ON workouts(venue_id) WHERE venue_id IS NOT NULL`);
  }

  // ============================================
  // 10. LOCATION-BASED ACHIEVEMENT DEFINITIONS
  // ============================================
  log.info('Adding location-based achievements...');

  const achievements = [
    {
      key: 'first_venue_exercise_record',
      name: 'Local Hero',
      description: 'Set your first exercise record at a venue',
      icon: '🏆',
      category: 'milestone',
      points: 50,
      rarity: 'common',
      enabled: true
    },
    {
      key: 'venue_regular_10',
      name: 'Venue Regular',
      description: 'Set 10 records at the same venue',
      icon: '🏠',
      category: 'milestone',
      points: 200,
      rarity: 'uncommon',
      enabled: true
    },
    {
      key: 'multi_venue_champion_5',
      name: 'Territory Expander',
      description: 'Hold records at 5 different venues',
      icon: '🗺️',
      category: 'milestone',
      points: 300,
      rarity: 'rare',
      enabled: true
    },
    {
      key: 'record_breaker_venue',
      name: 'Record Breaker',
      description: 'Break someone else\'s venue record',
      icon: '💥',
      category: 'record',
      points: 150,
      rarity: 'uncommon',
      enabled: true
    },
    {
      key: 'uncontested_30_days',
      name: 'Uncontested Champion',
      description: 'Hold a venue record for 30 days without being beaten',
      icon: '👑',
      category: 'top_rank',
      points: 500,
      rarity: 'epic',
      enabled: true
    },
    {
      key: 'witnessed_record',
      name: 'Verified Performer',
      description: 'Have a record verified by witnesses',
      icon: '✅',
      category: 'social',
      points: 100,
      rarity: 'common',
      enabled: true
    },
    {
      key: 'venue_dominator',
      name: 'Venue Dominator',
      description: 'Hold the #1 spot for 5 different exercises at the same venue',
      icon: '🔥',
      category: 'top_rank',
      points: 750,
      rarity: 'legendary',
      enabled: true
    },
    {
      key: 'global_top_10',
      name: 'Global Competitor',
      description: 'Rank in the top 10 globally for an exercise',
      icon: '🌍',
      category: 'top_rank',
      points: 1000,
      rarity: 'legendary',
      enabled: true
    },
    {
      key: 'community_contributor',
      name: 'Community Contributor',
      description: 'Opt-in to share your activity data with the community',
      icon: '🤝',
      category: 'social',
      points: 50,
      rarity: 'common',
      enabled: true
    },
    {
      key: 'reliable_witness',
      name: 'Reliable Witness',
      description: 'Witness 10 verified records at venues',
      icon: '👁️',
      category: 'social',
      points: 200,
      rarity: 'uncommon',
      enabled: true
    }
  ];

  for (const a of achievements) {
    await db.query(
      `INSERT INTO achievement_definitions (key, name, description, icon, category, points, rarity, enabled)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT (key) DO UPDATE SET
         name = EXCLUDED.name,
         description = EXCLUDED.description,
         icon = EXCLUDED.icon,
         points = EXCLUDED.points,
         rarity = EXCLUDED.rarity`,
      [a.key, a.name, a.description, a.icon, a.category, a.points, a.rarity, a.enabled]
    );
  }

  // ============================================
  // 11. TRIGGERS FOR UPDATED_AT
  // ============================================
  log.info('Creating triggers...');

  await db.query(`
    CREATE OR REPLACE FUNCTION update_venue_records_analytics_timestamp()
    RETURNS TRIGGER AS $$
    BEGIN
      NEW.updated_at = NOW();
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql
  `);

  await db.query(`
    DROP TRIGGER IF EXISTS tr_venue_exercise_records_updated ON venue_exercise_records;
    CREATE TRIGGER tr_venue_exercise_records_updated
    BEFORE UPDATE ON venue_exercise_records
    FOR EACH ROW EXECUTE FUNCTION update_venue_records_analytics_timestamp()
  `);

  await db.query(`
    DROP TRIGGER IF EXISTS tr_venue_activity_daily_updated ON venue_activity_daily;
    CREATE TRIGGER tr_venue_activity_daily_updated
    BEFORE UPDATE ON venue_activity_daily
    FOR EACH ROW EXECUTE FUNCTION update_venue_records_analytics_timestamp()
  `);

  // ============================================
  // 12. FUNCTION TO AUTO-DETECT PRS AT VENUES
  // ============================================
  log.info('Creating auto-PR detection function...');

  await db.query(`
    CREATE OR REPLACE FUNCTION check_venue_exercise_record(
      p_venue_id TEXT,
      p_exercise_id TEXT,
      p_user_id TEXT,
      p_record_type TEXT,
      p_value DECIMAL,
      p_unit TEXT,
      p_workout_session_id TEXT DEFAULT NULL,
      p_set_id TEXT DEFAULT NULL,
      p_reps_at_weight INTEGER DEFAULT NULL,
      p_weight_at_reps DECIMAL DEFAULT NULL
    )
    RETURNS TABLE (
      is_new_record BOOLEAN,
      is_venue_best BOOLEAN,
      previous_value DECIMAL,
      previous_holder_id TEXT,
      rank_at_venue INTEGER
    ) AS $$
    DECLARE
      v_existing_record RECORD;
      v_venue_best RECORD;
      v_rank INTEGER;
      v_is_new_record BOOLEAN := FALSE;
      v_is_venue_best BOOLEAN := FALSE;
    BEGIN
      -- Check user's existing record at this venue for this exercise/type
      SELECT ver.record_value, ver.id INTO v_existing_record
      FROM venue_exercise_records ver
      WHERE ver.venue_id = p_venue_id
        AND ver.exercise_id = p_exercise_id
        AND ver.user_id = p_user_id
        AND ver.record_type = p_record_type
      LIMIT 1;

      -- Check if this beats the user's existing record
      IF v_existing_record.id IS NULL THEN
        v_is_new_record := TRUE;
      ELSIF (p_record_type IN ('max_weight', 'max_reps', 'max_1rm', 'max_distance') AND p_value > v_existing_record.record_value) OR
            (p_record_type = 'fastest_time' AND p_value < v_existing_record.record_value) THEN
        v_is_new_record := TRUE;
      END IF;

      -- Check venue best
      SELECT ver.record_value, ver.user_id INTO v_venue_best
      FROM venue_exercise_records ver
      WHERE ver.venue_id = p_venue_id
        AND ver.exercise_id = p_exercise_id
        AND ver.record_type = p_record_type
      ORDER BY CASE WHEN p_record_type = 'fastest_time' THEN ver.record_value ELSE -ver.record_value END
      LIMIT 1;

      IF v_venue_best.record_value IS NULL THEN
        v_is_venue_best := TRUE;
      ELSIF (p_record_type IN ('max_weight', 'max_reps', 'max_1rm', 'max_distance') AND p_value > v_venue_best.record_value) OR
            (p_record_type = 'fastest_time' AND p_value < v_venue_best.record_value) THEN
        v_is_venue_best := TRUE;
      END IF;

      -- Calculate rank at venue
      SELECT COUNT(*) + 1 INTO v_rank
      FROM venue_exercise_records ver
      WHERE ver.venue_id = p_venue_id
        AND ver.exercise_id = p_exercise_id
        AND ver.record_type = p_record_type
        AND (
          (p_record_type IN ('max_weight', 'max_reps', 'max_1rm', 'max_distance') AND ver.record_value > p_value) OR
          (p_record_type = 'fastest_time' AND ver.record_value < p_value)
        );

      RETURN QUERY SELECT
        v_is_new_record,
        v_is_venue_best,
        COALESCE(v_existing_record.record_value, v_venue_best.record_value),
        v_venue_best.user_id,
        v_rank;
    END;
    $$ LANGUAGE plpgsql
  `);

  log.info('Migration 141_venue_exercise_records_analytics completed successfully');
}

export async function down(): Promise<void> {
  log.info('Rolling back migration: 141_venue_exercise_records_analytics');

  // Drop function
  await db.query(`DROP FUNCTION IF EXISTS check_venue_exercise_record`);

  // Drop triggers for venue_activity_log
  await db.query(`DROP TRIGGER IF EXISTS trg_compute_activity_date_hour ON venue_activity_log`);
  await db.query(`DROP FUNCTION IF EXISTS compute_activity_date_hour`);

  // Drop triggers
  await db.query(`DROP TRIGGER IF EXISTS tr_venue_exercise_records_updated ON venue_exercise_records`);
  await db.query(`DROP TRIGGER IF EXISTS tr_venue_activity_daily_updated ON venue_activity_daily`);
  await db.query(`DROP FUNCTION IF EXISTS update_venue_records_analytics_timestamp`);

  // Remove achievements
  await db.query(`
    DELETE FROM achievement_definitions WHERE key IN (
      'first_venue_exercise_record', 'venue_regular_10', 'multi_venue_champion_5',
      'record_breaker_venue', 'uncontested_30_days', 'witnessed_record',
      'venue_dominator', 'global_top_10', 'community_contributor', 'reliable_witness'
    )
  `);

  // Remove columns from workout tables
  await db.query(`ALTER TABLE workout_sessions DROP COLUMN IF EXISTS venue_id`);
  await db.query(`ALTER TABLE workout_sessions DROP COLUMN IF EXISTS venue_checkin_id`);
  await db.query(`ALTER TABLE workouts DROP COLUMN IF EXISTS venue_id`);

  // Drop tables in reverse order
  await db.query(`DROP TABLE IF EXISTS venue_activity_log`);
  await db.query(`DROP TABLE IF EXISTS global_exercise_leaderboards`);
  await db.query(`DROP TABLE IF EXISTS venue_leaderboards`);
  await db.query(`DROP TABLE IF EXISTS venue_activity_daily`);
  await db.query(`DROP TABLE IF EXISTS venue_record_witnesses`);
  await db.query(`DROP TABLE IF EXISTS venue_exercise_records`);

  // Remove privacy columns
  await db.query(`ALTER TABLE users DROP COLUMN IF EXISTS share_location_records`);
  await db.query(`ALTER TABLE users DROP COLUMN IF EXISTS share_venue_activity`);

  log.info('Rollback of 141_venue_exercise_records_analytics completed');
}
