/**
 * Migration 143: Community Presence & Social Training System
 *
 * Transforms MuscleMap from a solo fitness tool into a community formation platform
 * where users can organically discover, connect with, and train alongside other athletes
 * at real-world exercise locations.
 *
 * Creates infrastructure for:
 * - Real-time user presence at equipment locations
 * - Privacy-first presence sharing with granular controls
 * - Check-in enhancements for training context
 * - Training invites and shared sessions
 * - Presence history for activity heat maps
 * - Credits integration for community participation
 *
 * Builds on existing infrastructure:
 * - venue_checkins (migration 132) - Basic check-in/out
 * - user_privacy_mode (migration 021) - Privacy framework
 * - fitness_venues (migration 132) - Equipment locations
 * - messaging (migration 138) - Direct messaging
 * - credits (migration 129) - Economy system
 *
 * DESTRUCTIVE: The down() function removes all community presence tables.
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
  log.info('Running migration: 143_community_presence_system');

  // ============================================
  // 1. USER PRESENCE TABLE (Real-time State)
  // ============================================
  if (!(await tableExists('user_presence'))) {
    log.info('Creating user_presence table...');
    await db.query(`
      CREATE TABLE user_presence (
        user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,

        -- Presence state
        state TEXT NOT NULL DEFAULT 'invisible' CHECK (
          state IN ('invisible', 'location_only', 'visible', 'training_now', 'open_to_train')
        ),

        -- Location data
        latitude DECIMAL(10, 8),
        longitude DECIMAL(11, 8),
        location_precision TEXT DEFAULT 'exact' CHECK (
          location_precision IN ('exact', 'area', 'neighborhood', 'borough')
        ),
        venue_id TEXT REFERENCES fitness_venues(id) ON DELETE SET NULL,

        -- Training session context
        session_started_at TIMESTAMPTZ,
        session_planned_duration INTEGER,  -- minutes
        session_workout_type TEXT,
        session_target_muscles JSONB DEFAULT '[]',
        session_open_to_join BOOLEAN DEFAULT FALSE,
        session_max_participants INTEGER DEFAULT 3,
        session_notes TEXT,

        -- Timestamps
        location_updated_at TIMESTAMPTZ,
        last_active_at TIMESTAMPTZ DEFAULT NOW(),
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    // PostGIS-style index for efficient geo queries
    // Using B-tree on lat/lng for simplicity (PostGIS extension not required)
    await db.query(`CREATE INDEX idx_presence_location ON user_presence(latitude, longitude) WHERE state != 'invisible'`);
    await db.query(`CREATE INDEX idx_presence_venue ON user_presence(venue_id) WHERE venue_id IS NOT NULL`);
    await db.query(`CREATE INDEX idx_presence_state ON user_presence(state) WHERE state != 'invisible'`);
    await db.query(`CREATE INDEX idx_presence_open_to_train ON user_presence(session_open_to_join, venue_id) WHERE session_open_to_join = TRUE`);
    await db.query(`CREATE INDEX idx_presence_last_active ON user_presence(last_active_at DESC)`);

    log.info('user_presence table created');
  }

  // ============================================
  // 2. USER PRESENCE SETTINGS TABLE (Privacy Controls)
  // ============================================
  if (!(await tableExists('user_presence_settings'))) {
    log.info('Creating user_presence_settings table...');
    await db.query(`
      CREATE TABLE user_presence_settings (
        user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,

        -- Master toggle
        share_presence BOOLEAN DEFAULT FALSE,
        privacy_preset TEXT DEFAULT 'selective' CHECK (
          privacy_preset IN ('social', 'selective', 'private')
        ),

        -- Location sharing controls
        location_enabled BOOLEAN DEFAULT FALSE,
        location_precision TEXT DEFAULT 'approximate' CHECK (
          location_precision IN ('exact', 'approximate', 'area_only')
        ),
        location_only_when_checked_in BOOLEAN DEFAULT TRUE,
        location_auto_expire_minutes INTEGER DEFAULT 120,

        -- Visibility: who can see me
        visible_to_everyone BOOLEAN DEFAULT FALSE,
        visible_to_followers BOOLEAN DEFAULT TRUE,
        visible_to_mutual_followers BOOLEAN DEFAULT TRUE,

        -- Profile visibility when present
        show_real_name BOOLEAN DEFAULT TRUE,
        show_profile_photo BOOLEAN DEFAULT TRUE,
        show_training_stats BOOLEAN DEFAULT FALSE,
        show_current_workout BOOLEAN DEFAULT TRUE,
        show_training_history BOOLEAN DEFAULT FALSE,

        -- Contact preferences
        allow_direct_messages BOOLEAN DEFAULT TRUE,
        allow_messages_from_everyone BOOLEAN DEFAULT FALSE,
        allow_messages_from_followers BOOLEAN DEFAULT TRUE,
        allow_messages_from_mutual_only BOOLEAN DEFAULT TRUE,
        allow_training_invites BOOLEAN DEFAULT TRUE,

        -- Nearby features
        show_in_nearby_list BOOLEAN DEFAULT TRUE,
        receive_nearby_notifications BOOLEAN DEFAULT TRUE,
        notify_when_friends_nearby BOOLEAN DEFAULT TRUE,
        nearby_notification_radius_meters INTEGER DEFAULT 500,

        -- Training preferences
        preferred_training_times JSONB DEFAULT '[]',
        preferred_workout_types JSONB DEFAULT '[]',
        looking_for_training_partners BOOLEAN DEFAULT FALSE,
        max_training_group_size INTEGER DEFAULT 4,

        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    await db.query(`CREATE INDEX idx_presence_settings_preset ON user_presence_settings(privacy_preset)`);
    await db.query(`CREATE INDEX idx_presence_settings_looking ON user_presence_settings(looking_for_training_partners) WHERE looking_for_training_partners = TRUE`);

    log.info('user_presence_settings table created');
  }

  // ============================================
  // 3. PRESENCE HISTORY TABLE (For Heat Maps & Analytics)
  // ============================================
  if (!(await tableExists('presence_history'))) {
    log.info('Creating presence_history table...');
    await db.query(`
      CREATE TABLE presence_history (
        id TEXT PRIMARY KEY DEFAULT 'ph_' || replace(gen_random_uuid()::text, '-', ''),
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        venue_id TEXT REFERENCES fitness_venues(id) ON DELETE SET NULL,

        -- Time range
        check_in_at TIMESTAMPTZ NOT NULL,
        check_out_at TIMESTAMPTZ,
        duration_minutes INTEGER,

        -- Context
        workout_type TEXT,
        workout_logged BOOLEAN DEFAULT FALSE,
        workout_id TEXT REFERENCES workouts(id) ON DELETE SET NULL,

        -- Training partners
        training_partner_ids JSONB DEFAULT '[]',
        session_id TEXT,

        -- Location (for non-venue presence)
        latitude DECIMAL(10, 8),
        longitude DECIMAL(11, 8),
        neighborhood TEXT,
        borough TEXT,

        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    // Indexes for heat map queries
    await db.query(`CREATE INDEX idx_presence_history_venue ON presence_history(venue_id, check_in_at DESC)`);
    await db.query(`CREATE INDEX idx_presence_history_user ON presence_history(user_id, check_in_at DESC)`);
    await db.query(`CREATE INDEX idx_presence_history_time ON presence_history(check_in_at DESC)`);
    await db.query(`CREATE INDEX idx_presence_history_borough ON presence_history(borough, check_in_at DESC) WHERE borough IS NOT NULL`);

    // Partition hint: For large datasets, consider partitioning by month
    // CREATE TABLE presence_history_2025_01 PARTITION OF presence_history FOR VALUES FROM ('2025-01-01') TO ('2025-02-01');

    log.info('presence_history table created');
  }

  // ============================================
  // 4. TRAINING INVITES TABLE
  // ============================================
  if (!(await tableExists('training_invites'))) {
    log.info('Creating training_invites table...');
    await db.query(`
      CREATE TABLE training_invites (
        id TEXT PRIMARY KEY DEFAULT 'ti_' || replace(gen_random_uuid()::text, '-', ''),
        from_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        to_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        venue_id TEXT NOT NULL REFERENCES fitness_venues(id) ON DELETE CASCADE,

        -- Invite details
        proposed_time TIMESTAMPTZ NOT NULL,
        workout_type TEXT,
        message TEXT,
        is_now BOOLEAN DEFAULT FALSE,  -- Invite to join current session

        -- Status
        status TEXT NOT NULL DEFAULT 'pending' CHECK (
          status IN ('pending', 'accepted', 'declined', 'expired', 'cancelled')
        ),
        status_message TEXT,

        -- Response tracking
        responded_at TIMESTAMPTZ,
        expires_at TIMESTAMPTZ NOT NULL,

        -- If accepted, create a shared session
        session_id TEXT,

        -- Associated message (in messaging system)
        message_id TEXT,
        conversation_id TEXT REFERENCES conversations(id) ON DELETE SET NULL,

        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    await db.query(`CREATE INDEX idx_training_invites_to ON training_invites(to_user_id, status, created_at DESC)`);
    await db.query(`CREATE INDEX idx_training_invites_from ON training_invites(from_user_id, status, created_at DESC)`);
    await db.query(`CREATE INDEX idx_training_invites_venue ON training_invites(venue_id, proposed_time)`);
    await db.query(`CREATE INDEX idx_training_invites_pending ON training_invites(status, expires_at) WHERE status = 'pending'`);

    // Prevent duplicate pending invites
    await db.query(`
      CREATE UNIQUE INDEX idx_training_invites_unique_pending
      ON training_invites(from_user_id, to_user_id, venue_id, (date_trunc('day', proposed_time)))
      WHERE status = 'pending'
    `);

    log.info('training_invites table created');
  }

  // ============================================
  // 5. TRAINING SESSIONS TABLE (Shared Workouts)
  // ============================================
  if (!(await tableExists('training_sessions'))) {
    log.info('Creating training_sessions table...');
    await db.query(`
      CREATE TABLE training_sessions (
        id TEXT PRIMARY KEY DEFAULT 'ts_' || replace(gen_random_uuid()::text, '-', ''),
        venue_id TEXT NOT NULL REFERENCES fitness_venues(id) ON DELETE CASCADE,
        host_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,

        -- Session details
        workout_type TEXT,
        scheduled_time TIMESTAMPTZ NOT NULL,
        started_at TIMESTAMPTZ,
        ended_at TIMESTAMPTZ,
        duration_minutes INTEGER,

        -- Status
        status TEXT NOT NULL DEFAULT 'scheduled' CHECK (
          status IN ('scheduled', 'active', 'completed', 'cancelled')
        ),

        -- Participants
        max_participants INTEGER DEFAULT 4,
        participant_count INTEGER DEFAULT 1,

        -- Notes
        notes TEXT,

        -- Credits awarded to participants
        credits_awarded_per_participant INTEGER DEFAULT 0,

        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    await db.query(`CREATE INDEX idx_training_sessions_venue ON training_sessions(venue_id, scheduled_time DESC)`);
    await db.query(`CREATE INDEX idx_training_sessions_host ON training_sessions(host_user_id, status)`);
    await db.query(`CREATE INDEX idx_training_sessions_active ON training_sessions(status, scheduled_time) WHERE status IN ('scheduled', 'active')`);

    log.info('training_sessions table created');
  }

  // ============================================
  // 6. TRAINING SESSION PARTICIPANTS TABLE
  // ============================================
  if (!(await tableExists('training_session_participants'))) {
    log.info('Creating training_session_participants table...');
    await db.query(`
      CREATE TABLE training_session_participants (
        id TEXT PRIMARY KEY DEFAULT 'tsp_' || replace(gen_random_uuid()::text, '-', ''),
        session_id TEXT NOT NULL REFERENCES training_sessions(id) ON DELETE CASCADE,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,

        -- Role
        role TEXT NOT NULL DEFAULT 'participant' CHECK (
          role IN ('host', 'participant')
        ),

        -- Timing
        joined_at TIMESTAMPTZ DEFAULT NOW(),
        left_at TIMESTAMPTZ,
        invite_id TEXT REFERENCES training_invites(id) ON DELETE SET NULL,

        -- Workout linkage
        workout_id TEXT REFERENCES workouts(id) ON DELETE SET NULL,

        -- Status
        status TEXT NOT NULL DEFAULT 'joined' CHECK (
          status IN ('invited', 'joined', 'left', 'removed')
        ),

        -- Credits
        credits_awarded INTEGER DEFAULT 0,
        credit_transaction_id TEXT,

        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    await db.query(`CREATE UNIQUE INDEX idx_session_participants_unique ON training_session_participants(session_id, user_id)`);
    await db.query(`CREATE INDEX idx_session_participants_user ON training_session_participants(user_id, status)`);
    await db.query(`CREATE INDEX idx_session_participants_session ON training_session_participants(session_id, status)`);

    log.info('training_session_participants table created');
  }

  // ============================================
  // 7. EXTEND VENUE_CHECKINS WITH SOCIAL FEATURES
  // ============================================
  log.info('Extending venue_checkins with social features...');

  if (!(await columnExists('venue_checkins', 'workout_type'))) {
    await db.query(`ALTER TABLE venue_checkins ADD COLUMN workout_type TEXT`);
  }

  if (!(await columnExists('venue_checkins', 'open_to_join'))) {
    await db.query(`ALTER TABLE venue_checkins ADD COLUMN open_to_join BOOLEAN DEFAULT FALSE`);
  }

  if (!(await columnExists('venue_checkins', 'visible_to_others'))) {
    await db.query(`ALTER TABLE venue_checkins ADD COLUMN visible_to_others BOOLEAN DEFAULT TRUE`);
  }

  if (!(await columnExists('venue_checkins', 'planned_duration'))) {
    await db.query(`ALTER TABLE venue_checkins ADD COLUMN planned_duration INTEGER`);  // minutes
  }

  if (!(await columnExists('venue_checkins', 'session_id'))) {
    await db.query(`ALTER TABLE venue_checkins ADD COLUMN session_id TEXT REFERENCES training_sessions(id) ON DELETE SET NULL`);
  }

  if (!(await columnExists('venue_checkins', 'verification_method'))) {
    await db.query(`
      ALTER TABLE venue_checkins ADD COLUMN verification_method TEXT DEFAULT 'gps' CHECK (
        verification_method IN ('gps', 'manual', 'qr_code', 'nfc')
      )
    `);
  }

  if (!(await columnExists('venue_checkins', 'gps_verified'))) {
    await db.query(`ALTER TABLE venue_checkins ADD COLUMN gps_verified BOOLEAN DEFAULT FALSE`);
  }

  // Index for finding users open to training at a location
  await db.query(`CREATE INDEX IF NOT EXISTS idx_checkins_open_to_join ON venue_checkins(venue_id, open_to_join) WHERE is_active = TRUE AND open_to_join = TRUE`);

  // ============================================
  // 8. NEARBY USERS MATERIALIZED VIEW (Performance)
  // ============================================
  log.info('Creating venue_activity_live materialized view...');

  // Drop if exists to ensure clean recreation
  await db.query(`DROP MATERIALIZED VIEW IF EXISTS venue_activity_live`);

  await db.query(`
    CREATE MATERIALIZED VIEW venue_activity_live AS
    SELECT
      fv.id AS venue_id,
      fv.name AS venue_name,
      fv.latitude,
      fv.longitude,
      fv.borough,
      COUNT(DISTINCT vc.user_id) AS current_user_count,
      COUNT(DISTINCT CASE WHEN vc.open_to_join THEN vc.user_id END) AS open_to_train_count,
      COALESCE(
        JSON_AGG(
          DISTINCT JSONB_BUILD_OBJECT(
            'user_id', vc.user_id,
            'checked_in_at', vc.checked_in_at,
            'workout_type', vc.workout_type,
            'open_to_join', vc.open_to_join
          )
        ) FILTER (WHERE vc.user_id IS NOT NULL),
        '[]'::json
      ) AS active_users,
      MAX(vc.checked_in_at) AS last_activity_at
    FROM fitness_venues fv
    LEFT JOIN venue_checkins vc ON fv.id = vc.venue_id AND vc.is_active = TRUE
    WHERE fv.is_active = TRUE
    GROUP BY fv.id, fv.name, fv.latitude, fv.longitude, fv.borough
    HAVING COUNT(DISTINCT vc.user_id) > 0
  `);

  await db.query(`CREATE UNIQUE INDEX idx_venue_activity_live_venue ON venue_activity_live(venue_id)`);
  await db.query(`CREATE INDEX idx_venue_activity_live_count ON venue_activity_live(current_user_count DESC)`);
  await db.query(`CREATE INDEX idx_venue_activity_live_location ON venue_activity_live(latitude, longitude)`);

  // ============================================
  // 9. UPDATE TRIGGERS
  // ============================================
  log.info('Creating update triggers...');

  await db.query(`
    CREATE OR REPLACE FUNCTION update_presence_timestamp()
    RETURNS TRIGGER AS $$
    BEGIN
      NEW.updated_at = NOW();
      NEW.last_active_at = NOW();
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql
  `);

  await db.query(`
    DROP TRIGGER IF EXISTS tr_user_presence_updated ON user_presence;
    CREATE TRIGGER tr_user_presence_updated
    BEFORE UPDATE ON user_presence
    FOR EACH ROW EXECUTE FUNCTION update_presence_timestamp()
  `);

  await db.query(`
    DROP TRIGGER IF EXISTS tr_presence_settings_updated ON user_presence_settings;
    CREATE TRIGGER tr_presence_settings_updated
    BEFORE UPDATE ON user_presence_settings
    FOR EACH ROW EXECUTE FUNCTION update_presence_timestamp()
  `);

  await db.query(`
    DROP TRIGGER IF EXISTS tr_training_invites_updated ON training_invites;
    CREATE TRIGGER tr_training_invites_updated
    BEFORE UPDATE ON training_invites
    FOR EACH ROW EXECUTE FUNCTION update_presence_timestamp()
  `);

  await db.query(`
    DROP TRIGGER IF EXISTS tr_training_sessions_updated ON training_sessions;
    CREATE TRIGGER tr_training_sessions_updated
    BEFORE UPDATE ON training_sessions
    FOR EACH ROW EXECUTE FUNCTION update_presence_timestamp()
  `);

  // ============================================
  // 10. AUTO-EXPIRE STALE PRESENCE FUNCTION
  // ============================================
  log.info('Creating auto-expire stale presence function...');

  await db.query(`
    CREATE OR REPLACE FUNCTION expire_stale_presence()
    RETURNS void AS $$
    BEGIN
      -- Set users to invisible if no activity in their configured time
      UPDATE user_presence up
      SET state = 'invisible',
          session_started_at = NULL,
          session_workout_type = NULL,
          session_open_to_join = FALSE
      FROM user_presence_settings ups
      WHERE up.user_id = ups.user_id
        AND up.state != 'invisible'
        AND up.last_active_at < NOW() - (ups.location_auto_expire_minutes || ' minutes')::interval;

      -- Auto-checkout stale venue checkins (4 hours max)
      UPDATE venue_checkins
      SET is_active = FALSE,
          checked_out_at = NOW(),
          auto_checkout = TRUE
      WHERE is_active = TRUE
        AND checked_in_at < NOW() - interval '4 hours';

      -- Expire pending training invites
      UPDATE training_invites
      SET status = 'expired'
      WHERE status = 'pending'
        AND expires_at < NOW();
    END;
    $$ LANGUAGE plpgsql
  `);

  // ============================================
  // 11. ADD COMMUNITY EARNING RULES
  // ============================================
  log.info('Adding community presence earning rules...');

  const earningRules = [
    { code: 'presence_check_in', name: 'Check In', description: 'Check in to a fitness location', category: 'social', credits_base: 5, xp_base: 5, max_per_day: 5 },
    { code: 'presence_check_in_verified', name: 'Verified Check In', description: 'GPS-verified check in', category: 'social', credits_base: 10, xp_base: 10, max_per_day: 5 },
    { code: 'presence_training_partner', name: 'Training Partner', description: 'Complete workout with training partner', category: 'social', credits_base: 25, xp_base: 30, max_per_day: 3 },
    { code: 'presence_first_partner', name: 'First Partner', description: 'Train with someone new for the first time', category: 'social', credits_base: 100, xp_base: 100, max_per_day: 1 },
    { code: 'presence_host_session', name: 'Host Session', description: 'Host a group training session (3+ people)', category: 'social', credits_base: 50, xp_base: 75, max_per_day: 2 },
    { code: 'presence_invite_accepted', name: 'Invite Accepted', description: 'Someone accepted your training invite', category: 'social', credits_base: 15, xp_base: 10, max_per_day: 5 },
    { code: 'presence_location_regular', name: 'Location Regular', description: 'Check in 10+ times at the same location', category: 'social', credits_base: 75, xp_base: 100, max_per_day: 1 },
    { code: 'presence_streak_7', name: 'Social Streak 7', description: 'Train with partners 7 days in a row', category: 'social', credits_base: 150, xp_base: 200, max_per_day: 1 },
    { code: 'presence_bring_friend', name: 'Bring a Friend', description: 'Referral completes first workout at location', category: 'social', credits_base: 200, xp_base: 250, max_per_day: 3 },
  ];

  for (const rule of earningRules) {
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
  // 12. ADD COMMUNITY ACHIEVEMENTS
  // ============================================
  log.info('Adding community presence achievements...');

  const achievements = [
    { key: 'presence_social_butterfly', name: 'Social Butterfly', description: 'Train with 10 different people', icon: '🦋', category: 'social', points: 200, rarity: 'uncommon', enabled: true },
    { key: 'presence_pack_leader', name: 'Pack Leader', description: 'Host 10 group training sessions', icon: '👑', category: 'social', points: 300, rarity: 'rare', enabled: true },
    { key: 'presence_local_legend', name: 'Local Legend', description: 'Check in 50 times at the same location', icon: '🏠', category: 'social', points: 250, rarity: 'rare', enabled: true },
    { key: 'presence_connector', name: 'Connector', description: 'Introduce 5 users who then trained together', icon: '🤝', category: 'social', points: 400, rarity: 'epic', enabled: true },
    { key: 'presence_explorer', name: 'Explorer', description: 'Check in at 25 different locations', icon: '🗺️', category: 'social', points: 300, rarity: 'rare', enabled: true },
    { key: 'presence_open_door', name: 'Open Door', description: 'Have 50 people join your training sessions', icon: '🚪', category: 'social', points: 500, rarity: 'epic', enabled: true },
    { key: 'presence_five_boroughs', name: 'Five Boroughs', description: 'Train at locations in all 5 NYC boroughs', icon: '🏙️', category: 'special', points: 350, rarity: 'rare', enabled: true },
    { key: 'presence_early_bird', name: 'Early Bird', description: 'Check in before 6am 10 times', icon: '🌅', category: 'streak', points: 150, rarity: 'uncommon', enabled: true },
    { key: 'presence_night_owl', name: 'Night Owl', description: 'Check in after 10pm 10 times', icon: '🦉', category: 'streak', points: 150, rarity: 'uncommon', enabled: true },
    { key: 'presence_consistent', name: 'Consistency King', description: 'Train with same partner 10 times', icon: '👯', category: 'social', points: 200, rarity: 'uncommon', enabled: true },
  ];

  for (const a of achievements) {
    await db.query(
      `INSERT INTO achievement_definitions (key, name, description, icon, category, points, rarity, enabled)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT (key) DO NOTHING`,
      [a.key, a.name, a.description, a.icon, a.category, a.points, a.rarity, a.enabled]
    );
  }

  // ============================================
  // 13. FUNCTION TO REFRESH VENUE ACTIVITY VIEW
  // ============================================
  await db.query(`
    CREATE OR REPLACE FUNCTION refresh_venue_activity_live()
    RETURNS void AS $$
    BEGIN
      REFRESH MATERIALIZED VIEW CONCURRENTLY venue_activity_live;
    END;
    $$ LANGUAGE plpgsql
  `);

  log.info('Migration 143_community_presence_system completed successfully');
}

export async function down(): Promise<void> {
  log.info('Rolling back migration: 143_community_presence_system');

  // Remove earning rules
  await db.query(`
    DELETE FROM earning_rules WHERE code IN (
      'presence_check_in', 'presence_check_in_verified', 'presence_training_partner',
      'presence_first_partner', 'presence_host_session', 'presence_invite_accepted',
      'presence_location_regular', 'presence_streak_7', 'presence_bring_friend'
    )
  `);

  // Remove achievements
  await db.query(`
    DELETE FROM achievement_definitions WHERE key IN (
      'presence_social_butterfly', 'presence_pack_leader', 'presence_local_legend',
      'presence_connector', 'presence_explorer', 'presence_open_door',
      'presence_five_boroughs', 'presence_early_bird', 'presence_night_owl', 'presence_consistent'
    )
  `);

  // Drop functions
  await db.query(`DROP FUNCTION IF EXISTS refresh_venue_activity_live()`);
  await db.query(`DROP FUNCTION IF EXISTS expire_stale_presence()`);

  // Drop triggers
  await db.query(`DROP TRIGGER IF EXISTS tr_user_presence_updated ON user_presence`);
  await db.query(`DROP TRIGGER IF EXISTS tr_presence_settings_updated ON user_presence_settings`);
  await db.query(`DROP TRIGGER IF EXISTS tr_training_invites_updated ON training_invites`);
  await db.query(`DROP TRIGGER IF EXISTS tr_training_sessions_updated ON training_sessions`);

  // Drop materialized view
  await db.query(`DROP MATERIALIZED VIEW IF EXISTS venue_activity_live`);

  // Remove venue_checkins extensions
  await db.query(`ALTER TABLE venue_checkins DROP COLUMN IF EXISTS workout_type`);
  await db.query(`ALTER TABLE venue_checkins DROP COLUMN IF EXISTS open_to_join`);
  await db.query(`ALTER TABLE venue_checkins DROP COLUMN IF EXISTS visible_to_others`);
  await db.query(`ALTER TABLE venue_checkins DROP COLUMN IF EXISTS planned_duration`);
  await db.query(`ALTER TABLE venue_checkins DROP COLUMN IF EXISTS session_id`);
  await db.query(`ALTER TABLE venue_checkins DROP COLUMN IF EXISTS verification_method`);
  await db.query(`ALTER TABLE venue_checkins DROP COLUMN IF EXISTS gps_verified`);

  // Drop tables in reverse dependency order
  await db.query(`DROP TABLE IF EXISTS training_session_participants`);
  await db.query(`DROP TABLE IF EXISTS training_sessions`);
  await db.query(`DROP TABLE IF EXISTS training_invites`);
  await db.query(`DROP TABLE IF EXISTS presence_history`);
  await db.query(`DROP TABLE IF EXISTS user_presence_settings`);
  await db.query(`DROP TABLE IF EXISTS user_presence`);

  log.info('Rollback of 143_community_presence_system completed');
}

// For compatibility with migrate runner that expects migrate() function
export const migrate = up;
