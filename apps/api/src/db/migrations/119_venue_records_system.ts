/**
 * Migration 119: Venue Records System
 *
 * Creates the infrastructure for location-based achievement records:
 * - fitness_venues: Physical locations (parks, gyms, rec centers)
 * - venue_record_types: Record categories (pull-ups, bench press, etc.)
 * - venue_records: Record claims with verification
 * - venue_record_history: Audit trail of past records
 * - venue_memberships: Users following venues
 * - venue_checkins: Active presence tracking
 * - venue_record_disputes: Dispute resolution
 *
 * Also seeds NYC calisthenics parks and common record types.
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
  log.info('Running migration: 119_venue_records_system');

  // ============================================
  // 1. FITNESS VENUES TABLE
  // ============================================
  if (!(await tableExists('fitness_venues'))) {
    log.info('Creating fitness_venues table...');
    await db.query(`
      CREATE TABLE fitness_venues (
        id TEXT PRIMARY KEY DEFAULT 'fv_' || replace(gen_random_uuid()::text, '-', ''),

        -- Basic info
        name TEXT NOT NULL,
        slug TEXT UNIQUE NOT NULL,
        description TEXT,
        venue_type TEXT NOT NULL CHECK (
          venue_type IN ('park', 'recreation_center', 'outdoor_gym', 'calisthenics_park', 'public_gym', 'track', 'beach', 'playground', 'custom')
        ),

        -- Location (precise for geofencing)
        latitude DECIMAL(10, 7) NOT NULL,
        longitude DECIMAL(10, 7) NOT NULL,
        address TEXT,
        city TEXT NOT NULL,
        state_province TEXT,
        country TEXT NOT NULL DEFAULT 'USA',
        postal_code TEXT,

        -- Geofencing
        radius_meters INTEGER DEFAULT 100,
        boundary_polygon JSONB,

        -- Equipment inventory
        equipment JSONB DEFAULT '[]',

        -- Features
        has_free_weights BOOLEAN DEFAULT FALSE,
        has_calisthenics_equipment BOOLEAN DEFAULT FALSE,
        has_cardio_equipment BOOLEAN DEFAULT FALSE,
        has_parkour_features BOOLEAN DEFAULT FALSE,
        is_indoor BOOLEAN DEFAULT FALSE,
        is_24_hour BOOLEAN DEFAULT FALSE,
        is_free BOOLEAN DEFAULT TRUE,

        -- Media
        photos JSONB DEFAULT '[]',
        cover_photo_url TEXT,

        -- Stats (denormalized for performance)
        member_count INTEGER DEFAULT 0,
        active_record_count INTEGER DEFAULT 0,
        total_record_claims INTEGER DEFAULT 0,
        checkin_count_today INTEGER DEFAULT 0,
        checkin_count_total INTEGER DEFAULT 0,

        -- Verification
        is_verified BOOLEAN DEFAULT FALSE,
        verified_by TEXT REFERENCES users(id) ON DELETE SET NULL,
        verified_at TIMESTAMPTZ,

        -- Moderation
        is_active BOOLEAN DEFAULT TRUE,
        is_flagged BOOLEAN DEFAULT FALSE,
        flag_reason TEXT,

        -- Metadata
        hours_of_operation JSONB,
        amenities JSONB DEFAULT '[]',
        external_links JSONB DEFAULT '{}',

        -- Ownership
        created_by TEXT REFERENCES users(id) ON DELETE SET NULL,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    // Indexes for venues
    await db.query(`CREATE INDEX IF NOT EXISTS idx_venues_city ON fitness_venues(city, is_active)`);
    await db.query(`CREATE INDEX IF NOT EXISTS idx_venues_type ON fitness_venues(venue_type, is_active)`);
    await db.query(`CREATE INDEX IF NOT EXISTS idx_venues_slug ON fitness_venues(slug)`);
    await db.query(`CREATE INDEX IF NOT EXISTS idx_venues_active ON fitness_venues(is_active, member_count DESC)`);
    await db.query(`CREATE INDEX IF NOT EXISTS idx_venues_location ON fitness_venues(latitude, longitude) WHERE is_active = TRUE`);
  }

  // ============================================
  // 2. VENUE RECORD TYPES TABLE
  // ============================================
  if (!(await tableExists('venue_record_types'))) {
    log.info('Creating venue_record_types table...');
    await db.query(`
      CREATE TABLE venue_record_types (
        id TEXT PRIMARY KEY DEFAULT 'vrt_' || replace(gen_random_uuid()::text, '-', ''),

        -- Basic info
        name TEXT NOT NULL,
        key TEXT UNIQUE NOT NULL,
        description TEXT,
        icon TEXT,

        -- Category
        category TEXT NOT NULL CHECK (
          category IN ('calisthenics_reps', 'calisthenics_hold', 'weight_lift', 'gymnastics_skill', 'parkour_move', 'endurance', 'bodyweight_weighted')
        ),

        -- Measurement
        metric_type TEXT NOT NULL CHECK (
          metric_type IN ('count', 'weight_kg', 'weight_lbs', 'time_seconds', 'distance_meters', 'boolean')
        ),
        unit TEXT NOT NULL,
        direction TEXT NOT NULL DEFAULT 'higher' CHECK (direction IN ('higher', 'lower')),

        -- Verification requirements
        requires_video BOOLEAN DEFAULT TRUE,
        requires_witness BOOLEAN DEFAULT TRUE,
        requires_location_verification BOOLEAN DEFAULT TRUE,
        min_video_duration_seconds INTEGER DEFAULT 5,
        max_video_duration_seconds INTEGER DEFAULT 120,

        -- Linked exercise
        exercise_id TEXT REFERENCES exercises(id) ON DELETE SET NULL,

        -- Equipment required
        required_equipment JSONB DEFAULT '[]',

        -- Display
        display_order INTEGER DEFAULT 0,
        is_active BOOLEAN DEFAULT TRUE,
        is_featured BOOLEAN DEFAULT FALSE,

        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    await db.query(`CREATE INDEX IF NOT EXISTS idx_record_types_category ON venue_record_types(category, is_active)`);
    await db.query(`CREATE INDEX IF NOT EXISTS idx_record_types_active ON venue_record_types(is_active, display_order)`);
  }

  // ============================================
  // 3. VENUE RECORDS TABLE
  // ============================================
  if (!(await tableExists('venue_records'))) {
    log.info('Creating venue_records table...');
    await db.query(`
      CREATE TABLE venue_records (
        id TEXT PRIMARY KEY DEFAULT 'vr_' || replace(gen_random_uuid()::text, '-', ''),

        -- Foreign keys
        venue_id TEXT NOT NULL REFERENCES fitness_venues(id) ON DELETE CASCADE,
        record_type_id TEXT NOT NULL REFERENCES venue_record_types(id) ON DELETE CASCADE,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,

        -- Record value
        value DECIMAL(15, 4) NOT NULL,
        previous_record_value DECIMAL(15, 4),
        previous_record_holder_id TEXT REFERENCES users(id) ON DELETE SET NULL,

        -- Video proof
        video_url TEXT,
        video_asset_id TEXT,
        thumbnail_url TEXT,
        video_duration_seconds INTEGER,

        -- Location verification
        claim_latitude DECIMAL(10, 7) NOT NULL,
        claim_longitude DECIMAL(10, 7) NOT NULL,
        distance_from_venue_meters DECIMAL(10, 2),
        location_verified BOOLEAN DEFAULT FALSE,
        location_verification_method TEXT CHECK (
          location_verification_method IN ('gps', 'wifi', 'cell_tower', 'manual_override') OR location_verification_method IS NULL
        ),

        -- Witness verification
        witness_user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
        witness_verified BOOLEAN DEFAULT FALSE,
        witness_attestation TEXT,
        witness_location_latitude DECIMAL(10, 7),
        witness_location_longitude DECIMAL(10, 7),
        witness_distance_meters DECIMAL(10, 2),
        witness_verified_at TIMESTAMPTZ,

        -- Status
        status TEXT DEFAULT 'pending_witness' CHECK (
          status IN ('pending_witness', 'pending_review', 'verified', 'rejected', 'disputed', 'expired', 'superseded')
        ),

        -- Economy
        claim_fee_credits INTEGER DEFAULT 15,
        fee_refunded BOOLEAN DEFAULT FALSE,
        credit_ledger_id TEXT,

        -- Timestamps
        claimed_at TIMESTAMPTZ DEFAULT NOW(),
        witness_requested_at TIMESTAMPTZ,
        verified_at TIMESTAMPTZ,
        expires_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '7 days',

        -- Additional evidence
        additional_photos JSONB DEFAULT '[]',
        notes TEXT,
        rejection_reason TEXT,

        -- Anti-cheat
        device_fingerprint TEXT,
        ip_address INET,
        suspicious_flags JSONB DEFAULT '[]',

        -- Metadata
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    // Indexes for records
    await db.query(`CREATE INDEX IF NOT EXISTS idx_venue_records_venue ON venue_records(venue_id, record_type_id, status)`);
    await db.query(`CREATE INDEX IF NOT EXISTS idx_venue_records_user ON venue_records(user_id, status)`);
    await db.query(`CREATE INDEX IF NOT EXISTS idx_venue_records_pending ON venue_records(status, expires_at) WHERE status = 'pending_witness'`);
    await db.query(`CREATE INDEX IF NOT EXISTS idx_venue_records_current ON venue_records(venue_id, record_type_id, value DESC) WHERE status = 'verified'`);
    await db.query(`CREATE INDEX IF NOT EXISTS idx_venue_records_witness ON venue_records(witness_user_id, status) WHERE witness_user_id IS NOT NULL`);
    await db.query(`CREATE INDEX IF NOT EXISTS idx_venue_records_leaderboard ON venue_records(venue_id, record_type_id, value DESC, verified_at DESC) WHERE status = 'verified'`);

    // Unique constraint - only one pending/verified record per user/venue/type
    await db.query(`
      CREATE UNIQUE INDEX idx_venue_records_unique_active
      ON venue_records(venue_id, record_type_id, user_id)
      WHERE status IN ('pending_witness', 'pending_review', 'verified')
    `);
  }

  // ============================================
  // 4. VENUE RECORD HISTORY TABLE
  // ============================================
  if (!(await tableExists('venue_record_history'))) {
    log.info('Creating venue_record_history table...');
    await db.query(`
      CREATE TABLE venue_record_history (
        id TEXT PRIMARY KEY DEFAULT 'vrh_' || replace(gen_random_uuid()::text, '-', ''),
        venue_id TEXT NOT NULL REFERENCES fitness_venues(id) ON DELETE CASCADE,
        record_type_id TEXT NOT NULL REFERENCES venue_record_types(id) ON DELETE CASCADE,
        record_id TEXT NOT NULL REFERENCES venue_records(id) ON DELETE CASCADE,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        value DECIMAL(15, 4) NOT NULL,
        rank_at_time INTEGER,
        held_from TIMESTAMPTZ NOT NULL,
        held_until TIMESTAMPTZ,
        superseded_by_record_id TEXT REFERENCES venue_records(id) ON DELETE SET NULL,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    await db.query(`CREATE INDEX IF NOT EXISTS idx_record_history_venue ON venue_record_history(venue_id, record_type_id, held_until DESC NULLS FIRST)`);
    await db.query(`CREATE INDEX IF NOT EXISTS idx_record_history_user ON venue_record_history(user_id, held_until DESC NULLS FIRST)`);
  }

  // ============================================
  // 5. VENUE MEMBERSHIPS TABLE
  // ============================================
  if (!(await tableExists('venue_memberships'))) {
    log.info('Creating venue_memberships table...');
    await db.query(`
      CREATE TABLE venue_memberships (
        venue_id TEXT NOT NULL REFERENCES fitness_venues(id) ON DELETE CASCADE,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        PRIMARY KEY (venue_id, user_id),

        role TEXT DEFAULT 'member' CHECK (role IN ('member', 'regular', 'moderator', 'admin')),

        -- Stats
        record_count INTEGER DEFAULT 0,
        current_records_held INTEGER DEFAULT 0,
        checkin_count INTEGER DEFAULT 0,
        last_checkin_at TIMESTAMPTZ,
        last_record_claim_at TIMESTAMPTZ,

        -- Preferences
        notifications_enabled BOOLEAN DEFAULT TRUE,
        show_in_members_list BOOLEAN DEFAULT TRUE,

        joined_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    await db.query(`CREATE INDEX IF NOT EXISTS idx_venue_members_user ON venue_memberships(user_id)`);
    await db.query(`CREATE INDEX IF NOT EXISTS idx_venue_members_active ON venue_memberships(venue_id, last_checkin_at DESC)`);
  }

  // ============================================
  // 6. VENUE CHECKINS TABLE
  // ============================================
  if (!(await tableExists('venue_checkins'))) {
    log.info('Creating venue_checkins table...');
    await db.query(`
      CREATE TABLE venue_checkins (
        id TEXT PRIMARY KEY DEFAULT 'vc_' || replace(gen_random_uuid()::text, '-', ''),
        venue_id TEXT NOT NULL REFERENCES fitness_venues(id) ON DELETE CASCADE,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,

        -- Location
        latitude DECIMAL(10, 7) NOT NULL,
        longitude DECIMAL(10, 7) NOT NULL,
        distance_from_venue_meters DECIMAL(10, 2),
        location_accuracy_meters DECIMAL(10, 2),

        -- Status
        is_active BOOLEAN DEFAULT TRUE,
        checked_in_at TIMESTAMPTZ DEFAULT NOW(),
        checked_out_at TIMESTAMPTZ,
        auto_checkout BOOLEAN DEFAULT FALSE,

        -- Associated workout
        workout_id TEXT REFERENCES workouts(id) ON DELETE SET NULL,

        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    await db.query(`CREATE INDEX IF NOT EXISTS idx_venue_checkins_venue ON venue_checkins(venue_id, checked_in_at DESC)`);
    await db.query(`CREATE INDEX IF NOT EXISTS idx_venue_checkins_active ON venue_checkins(venue_id, user_id) WHERE is_active = TRUE`);
    await db.query(`CREATE INDEX IF NOT EXISTS idx_venue_checkins_user ON venue_checkins(user_id, checked_in_at DESC)`);
  }

  // ============================================
  // 7. VENUE RECORD DISPUTES TABLE
  // ============================================
  if (!(await tableExists('venue_record_disputes'))) {
    log.info('Creating venue_record_disputes table...');
    await db.query(`
      CREATE TABLE venue_record_disputes (
        id TEXT PRIMARY KEY DEFAULT 'vrd_' || replace(gen_random_uuid()::text, '-', ''),
        record_id TEXT NOT NULL REFERENCES venue_records(id) ON DELETE CASCADE,
        filed_by_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,

        -- Dispute details
        reason TEXT NOT NULL CHECK (
          reason IN ('video_manipulation', 'form_violation', 'equipment_assistance', 'false_count', 'location_mismatch', 'witness_collusion', 'other')
        ),
        description TEXT NOT NULL,
        evidence_urls JSONB DEFAULT '[]',

        -- Status
        status TEXT DEFAULT 'pending' CHECK (
          status IN ('pending', 'under_review', 'resolved_upheld', 'resolved_revoked', 'dismissed')
        ),

        -- Admin review
        reviewed_by TEXT REFERENCES users(id) ON DELETE SET NULL,
        admin_notes TEXT,
        resolution TEXT,

        -- Timestamps
        filed_at TIMESTAMPTZ DEFAULT NOW(),
        reviewed_at TIMESTAMPTZ,
        resolved_at TIMESTAMPTZ,
        appeal_deadline TIMESTAMPTZ
      )
    `);

    await db.query(`CREATE INDEX IF NOT EXISTS idx_disputes_record ON venue_record_disputes(record_id)`);
    await db.query(`CREATE INDEX IF NOT EXISTS idx_disputes_status ON venue_record_disputes(status, filed_at DESC)`);
    await db.query(`CREATE INDEX IF NOT EXISTS idx_disputes_filer ON venue_record_disputes(filed_by_user_id)`);
  }

  // ============================================
  // 8. UPDATE TRIGGERS
  // ============================================
  log.info('Creating triggers...');
  await db.query(`
    CREATE OR REPLACE FUNCTION update_venue_records_timestamp()
    RETURNS TRIGGER AS $$
    BEGIN
      NEW.updated_at = NOW();
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql
  `);

  await db.query(`
    DROP TRIGGER IF EXISTS tr_venue_records_updated ON venue_records;
    CREATE TRIGGER tr_venue_records_updated
    BEFORE UPDATE ON venue_records
    FOR EACH ROW EXECUTE FUNCTION update_venue_records_timestamp()
  `);

  await db.query(`
    DROP TRIGGER IF EXISTS tr_fitness_venues_updated ON fitness_venues;
    CREATE TRIGGER tr_fitness_venues_updated
    BEFORE UPDATE ON fitness_venues
    FOR EACH ROW EXECUTE FUNCTION update_venue_records_timestamp()
  `);

  // ============================================
  // 9. SEED RECORD TYPES
  // ============================================
  log.info('Seeding venue record types...');
  const recordTypes = [
    // Calisthenics Reps
    { key: 'consecutive_pull_ups', name: 'Consecutive Pull-Ups', category: 'calisthenics_reps', metric_type: 'count', unit: 'reps', direction: 'higher', required_equipment: '["pull_up_bar"]', icon: '💪', display_order: 1 },
    { key: 'consecutive_muscle_ups', name: 'Consecutive Muscle-Ups', category: 'calisthenics_reps', metric_type: 'count', unit: 'reps', direction: 'higher', required_equipment: '["pull_up_bar"]', icon: '🔥', display_order: 2 },
    { key: 'consecutive_push_ups', name: 'Consecutive Push-Ups', category: 'calisthenics_reps', metric_type: 'count', unit: 'reps', direction: 'higher', required_equipment: '[]', icon: '✊', display_order: 3 },
    { key: 'consecutive_dips', name: 'Consecutive Dips', category: 'calisthenics_reps', metric_type: 'count', unit: 'reps', direction: 'higher', required_equipment: '["dip_bars"]', icon: '💎', display_order: 4 },
    { key: 'consecutive_chin_ups', name: 'Consecutive Chin-Ups', category: 'calisthenics_reps', metric_type: 'count', unit: 'reps', direction: 'higher', required_equipment: '["pull_up_bar"]', icon: '🎯', display_order: 5 },
    // Static Holds
    { key: 'front_lever_hold', name: 'Front Lever Hold', category: 'calisthenics_hold', metric_type: 'time_seconds', unit: 'seconds', direction: 'higher', required_equipment: '["pull_up_bar"]', icon: '⏱️', display_order: 10 },
    { key: 'back_lever_hold', name: 'Back Lever Hold', category: 'calisthenics_hold', metric_type: 'time_seconds', unit: 'seconds', direction: 'higher', required_equipment: '["pull_up_bar"]', icon: '⏱️', display_order: 11 },
    { key: 'planche_hold', name: 'Planche Hold', category: 'calisthenics_hold', metric_type: 'time_seconds', unit: 'seconds', direction: 'higher', required_equipment: '["parallel_bars"]', icon: '🏆', display_order: 12 },
    { key: 'human_flag_hold', name: 'Human Flag Hold', category: 'calisthenics_hold', metric_type: 'time_seconds', unit: 'seconds', direction: 'higher', required_equipment: '["vertical_pole"]', icon: '🚩', display_order: 13 },
    { key: 'handstand_hold', name: 'Freestanding Handstand', category: 'calisthenics_hold', metric_type: 'time_seconds', unit: 'seconds', direction: 'higher', required_equipment: '[]', icon: '🤸', display_order: 14 },
    { key: 'l_sit_hold', name: 'L-Sit Hold', category: 'calisthenics_hold', metric_type: 'time_seconds', unit: 'seconds', direction: 'higher', required_equipment: '["parallel_bars"]', icon: '🪑', display_order: 15 },
    // Weight Lifting
    { key: 'max_bench_press', name: 'Max Bench Press', category: 'weight_lift', metric_type: 'weight_lbs', unit: 'lbs', direction: 'higher', required_equipment: '["bench_press","barbell"]', icon: '🏋️', display_order: 20 },
    { key: 'max_squat', name: 'Max Squat', category: 'weight_lift', metric_type: 'weight_lbs', unit: 'lbs', direction: 'higher', required_equipment: '["squat_rack","barbell"]', icon: '🦵', display_order: 21 },
    { key: 'max_deadlift', name: 'Max Deadlift', category: 'weight_lift', metric_type: 'weight_lbs', unit: 'lbs', direction: 'higher', required_equipment: '["barbell"]', icon: '🔱', display_order: 22 },
    { key: 'max_overhead_press', name: 'Max Overhead Press', category: 'weight_lift', metric_type: 'weight_lbs', unit: 'lbs', direction: 'higher', required_equipment: '["barbell"]', icon: '⬆️', display_order: 23 },
    // Weighted Bodyweight
    { key: 'weighted_pull_up', name: 'Max Weighted Pull-Up', category: 'bodyweight_weighted', metric_type: 'weight_lbs', unit: 'lbs added', direction: 'higher', required_equipment: '["pull_up_bar","weight_belt"]', icon: '⚖️', display_order: 30 },
    { key: 'weighted_dip', name: 'Max Weighted Dip', category: 'bodyweight_weighted', metric_type: 'weight_lbs', unit: 'lbs added', direction: 'higher', required_equipment: '["dip_bars","weight_belt"]', icon: '⚖️', display_order: 31 },
    // Gymnastics Skills
    { key: 'strict_muscle_up', name: 'Strict Muscle-Up', category: 'gymnastics_skill', metric_type: 'boolean', unit: 'verified', direction: 'higher', required_equipment: '["pull_up_bar"]', icon: '✅', display_order: 40 },
    { key: 'one_arm_pull_up', name: 'One-Arm Pull-Up', category: 'gymnastics_skill', metric_type: 'boolean', unit: 'verified', direction: 'higher', required_equipment: '["pull_up_bar"]', icon: '☝️', display_order: 41 },
    { key: '360_pull_up', name: '360° Pull-Up', category: 'gymnastics_skill', metric_type: 'boolean', unit: 'verified', direction: 'higher', required_equipment: '["pull_up_bar"]', icon: '🔄', display_order: 42 },
  ];

  for (const rt of recordTypes) {
    await db.query(
      `INSERT INTO venue_record_types (key, name, category, metric_type, unit, direction, required_equipment, icon, display_order)
       VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8, $9)
       ON CONFLICT (key) DO NOTHING`,
      [rt.key, rt.name, rt.category, rt.metric_type, rt.unit, rt.direction, rt.required_equipment, rt.icon, rt.display_order]
    );
  }

  // ============================================
  // 10. SEED NYC VENUES
  // ============================================
  log.info('Seeding NYC venues...');
  const nycVenues = [
    // Manhattan
    { name: 'Tompkins Square Park Fitness Area', slug: 'tompkins-square-park-nyc', description: 'Popular calisthenics park in the East Village with pull-up bars, dip bars, and parallel bars.', venue_type: 'calisthenics_park', latitude: 40.7265, longitude: -73.9818, address: 'Avenue A & E 7th St', city: 'New York', state_province: 'NY', postal_code: '10009', radius_meters: 75, equipment: '["pull_up_bar","dip_bars","parallel_bars","monkey_bars"]', has_calisthenics_equipment: true, is_free: true, is_verified: true },
    { name: 'Central Park North Meadow Recreation Center', slug: 'central-park-north-meadow', description: 'Large outdoor fitness area in Central Park with various equipment.', venue_type: 'recreation_center', latitude: 40.7969, longitude: -73.9539, address: 'North Meadow, Central Park', city: 'New York', state_province: 'NY', postal_code: '10029', radius_meters: 150, equipment: '["pull_up_bar","dip_bars","parallel_bars"]', has_calisthenics_equipment: true, is_free: true, is_verified: true },
    { name: 'Riverside Park 72nd St Outdoor Gym', slug: 'riverside-park-72nd', description: 'Outdoor fitness area along the Hudson River with great views.', venue_type: 'outdoor_gym', latitude: 40.7815, longitude: -73.9883, address: 'Riverside Park at 72nd St', city: 'New York', state_province: 'NY', postal_code: '10023', radius_meters: 100, equipment: '["pull_up_bar","dip_bars","parallel_bars"]', has_calisthenics_equipment: true, is_free: true, is_verified: true },
    { name: 'John Jay Park Fitness Area', slug: 'john-jay-park', description: 'Upper East Side park with calisthenics equipment and basketball courts.', venue_type: 'calisthenics_park', latitude: 40.7698, longitude: -73.9457, address: '77th St & Cherokee Pl', city: 'New York', state_province: 'NY', postal_code: '10075', radius_meters: 75, equipment: '["pull_up_bar","dip_bars"]', has_calisthenics_equipment: true, is_free: true, is_verified: true },
    { name: 'East River Esplanade Fitness', slug: 'east-river-esplanade', description: 'Fitness stations along the East River with pull-up bars and dip stations.', venue_type: 'outdoor_gym', latitude: 40.7131, longitude: -73.9762, address: 'East River Esplanade', city: 'New York', state_province: 'NY', postal_code: '10002', radius_meters: 100, equipment: '["pull_up_bar","dip_bars","parallel_bars"]', has_calisthenics_equipment: true, is_free: true, is_verified: true },
    // Brooklyn
    { name: 'McCarren Park Fitness Area', slug: 'mccarren-park-brooklyn', description: 'Williamsburg calisthenics park popular with the street workout community.', venue_type: 'calisthenics_park', latitude: 40.72, longitude: -73.9512, address: 'McCarren Park, Williamsburg', city: 'Brooklyn', state_province: 'NY', postal_code: '11222', radius_meters: 100, equipment: '["pull_up_bar","dip_bars","monkey_bars","parallel_bars"]', has_calisthenics_equipment: true, is_free: true, is_verified: true },
    { name: 'DUMBO Boulder/Fitness Area', slug: 'dumbo-fitness-brooklyn', description: 'Under the Manhattan Bridge with climbing boulders and calisthenics equipment.', venue_type: 'outdoor_gym', latitude: 40.7033, longitude: -73.9894, address: 'Main St & Plymouth St', city: 'Brooklyn', state_province: 'NY', postal_code: '11201', radius_meters: 75, equipment: '["pull_up_bar","climbing_boulder"]', has_calisthenics_equipment: true, has_parkour_features: true, is_free: true, is_verified: true },
    { name: 'Sunset Park Recreation Center', slug: 'sunset-park-rec', description: 'NYC Parks recreation center with indoor and outdoor fitness facilities.', venue_type: 'recreation_center', latitude: 40.6452, longitude: -74.0068, address: '7th Ave & 43rd St', city: 'Brooklyn', state_province: 'NY', postal_code: '11232', radius_meters: 100, equipment: '["pull_up_bar","dip_bars","bench_press","squat_rack","barbell","dumbbells"]', has_calisthenics_equipment: true, has_free_weights: true, is_indoor: true, is_free: true, is_verified: true },
    { name: 'Prospect Park Parade Ground', slug: 'prospect-park-parade', description: 'Outdoor fitness area in Prospect Park with calisthenics equipment.', venue_type: 'park', latitude: 40.6484, longitude: -73.9679, address: 'Parade Ground, Prospect Park', city: 'Brooklyn', state_province: 'NY', postal_code: '11218', radius_meters: 150, equipment: '["pull_up_bar","dip_bars","parallel_bars"]', has_calisthenics_equipment: true, is_free: true, is_verified: true },
    { name: 'Red Hook Recreation Center', slug: 'red-hook-rec', description: 'Full recreation center with pool, gym, and outdoor fitness area.', venue_type: 'recreation_center', latitude: 40.6732, longitude: -74.008, address: '155 Bay St', city: 'Brooklyn', state_province: 'NY', postal_code: '11231', radius_meters: 100, equipment: '["pull_up_bar","dip_bars","bench_press","squat_rack","barbell","dumbbells"]', has_calisthenics_equipment: true, has_free_weights: true, has_cardio_equipment: true, is_indoor: true, is_free: true, is_verified: true },
    // Queens
    { name: 'Astoria Park Pull-Up Bars', slug: 'astoria-park', description: 'Popular calisthenics spot near the Triborough Bridge with multiple stations.', venue_type: 'calisthenics_park', latitude: 40.7784, longitude: -73.9227, address: 'Astoria Park', city: 'Queens', state_province: 'NY', postal_code: '11102', radius_meters: 100, equipment: '["pull_up_bar","dip_bars","parallel_bars","monkey_bars"]', has_calisthenics_equipment: true, is_free: true, is_verified: true },
    { name: 'Flushing Meadows Corona Park', slug: 'flushing-meadows', description: 'Large park with multiple fitness stations throughout.', venue_type: 'park', latitude: 40.7396, longitude: -73.8407, address: 'Flushing Meadows Corona Park', city: 'Queens', state_province: 'NY', postal_code: '11368', radius_meters: 200, equipment: '["pull_up_bar","dip_bars","parallel_bars"]', has_calisthenics_equipment: true, is_free: true, is_verified: true },
    { name: 'Juniper Valley Park Fitness Area', slug: 'juniper-valley', description: 'Middle Village park with dedicated calisthenics area.', venue_type: 'calisthenics_park', latitude: 40.7202, longitude: -73.8776, address: 'Juniper Valley Park', city: 'Queens', state_province: 'NY', postal_code: '11379', radius_meters: 100, equipment: '["pull_up_bar","dip_bars","parallel_bars"]', has_calisthenics_equipment: true, is_free: true, is_verified: true },
    // Bronx
    { name: "St. Mary's Park Fitness Area", slug: 'st-marys-park-bronx', description: 'South Bronx park with outdoor calisthenics equipment.', venue_type: 'calisthenics_park', latitude: 40.8088, longitude: -73.9183, address: "St. Mary's Park", city: 'Bronx', state_province: 'NY', postal_code: '10454', radius_meters: 100, equipment: '["pull_up_bar","dip_bars","parallel_bars"]', has_calisthenics_equipment: true, is_free: true, is_verified: true },
    { name: 'Crotona Park Calisthenics Area', slug: 'crotona-park', description: 'Large Bronx park with dedicated street workout area.', venue_type: 'calisthenics_park', latitude: 40.8396, longitude: -73.8954, address: 'Crotona Park', city: 'Bronx', state_province: 'NY', postal_code: '10460', radius_meters: 100, equipment: '["pull_up_bar","dip_bars","parallel_bars","monkey_bars"]', has_calisthenics_equipment: true, is_free: true, is_verified: true },
    // Free Recreation Centers
    { name: 'Asser Levy Recreation Center', slug: 'asser-levy-rec', description: 'Historic NYC Parks recreation center with gym facilities.', venue_type: 'recreation_center', latitude: 40.7346, longitude: -73.9765, address: '23rd St & Asser Levy Pl', city: 'New York', state_province: 'NY', postal_code: '10010', radius_meters: 75, equipment: '["bench_press","squat_rack","barbell","dumbbells","cable_machine"]', has_free_weights: true, has_cardio_equipment: true, is_indoor: true, is_free: true, is_verified: true },
    { name: "St. John's Recreation Center", slug: 'st-johns-rec-brooklyn', description: 'Brooklyn recreation center with free gym access.', venue_type: 'recreation_center', latitude: 40.6788, longitude: -73.9409, address: '1251 Prospect Pl', city: 'Brooklyn', state_province: 'NY', postal_code: '11213', radius_meters: 75, equipment: '["bench_press","squat_rack","barbell","dumbbells"]', has_free_weights: true, has_cardio_equipment: true, is_indoor: true, is_free: true, is_verified: true },
  ];

  for (const v of nycVenues) {
    await db.query(
      `INSERT INTO fitness_venues (
        name, slug, description, venue_type, latitude, longitude, address, city, state_province, postal_code,
        radius_meters, equipment, has_calisthenics_equipment, has_free_weights, has_cardio_equipment,
        has_parkour_features, is_indoor, is_free, is_verified
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12::jsonb, $13, $14, $15, $16, $17, $18, $19)
       ON CONFLICT (slug) DO NOTHING`,
      [
        v.name, v.slug, v.description, v.venue_type, v.latitude, v.longitude, v.address, v.city, v.state_province, v.postal_code,
        v.radius_meters, v.equipment, v.has_calisthenics_equipment || false, v.has_free_weights || false, v.has_cardio_equipment || false,
        v.has_parkour_features || false, v.is_indoor || false, v.is_free, v.is_verified
      ]
    );
  }

  // ============================================
  // 11. ADD VENUE RECORD ACHIEVEMENTS
  // ============================================
  log.info('Seeding venue record achievements...');
  const achievements = [
    { key: 'first_venue_record', name: 'First Blood', description: 'Claim your first verified venue record', icon: '🩸', category: 'milestone', points: 100, rarity: 'common', enabled: true },
    { key: 'local_legend', name: 'Local Legend', description: 'Hold 3+ current records at the same venue', icon: '👑', category: 'top_rank', points: 500, rarity: 'rare', enabled: true },
    { key: 'record_breaker', name: 'Record Breaker', description: 'Break an existing venue record', icon: '💥', category: 'record', points: 250, rarity: 'uncommon', enabled: true },
    { key: 'trusted_witness', name: 'Trusted Witness', description: 'Witness 10 verified venue records', icon: '👁️', category: 'social', points: 200, rarity: 'uncommon', enabled: true },
    { key: 'venue_explorer', name: 'Venue Explorer', description: 'Claim verified records at 5 different venues', icon: '🗺️', category: 'milestone', points: 300, rarity: 'rare', enabled: true },
    { key: 'iron_throne', name: 'Iron Throne', description: 'Hold the #1 record at a venue for 30+ days', icon: '🪑', category: 'top_rank', points: 750, rarity: 'epic', enabled: true },
    { key: 'park_champion', name: 'Park Champion', description: 'Hold all available calisthenics records at a single venue', icon: '🏅', category: 'special', points: 1000, rarity: 'legendary', enabled: true },
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
  // 12. EXTEND BULLETIN POSTS FOR VENUES
  // ============================================
  log.info('Adding venue columns to bulletin_posts...');

  // Check if columns exist
  const hasVenueIdColumn = await db.queryOne<{ count: string }>(
    `SELECT COUNT(*) as count FROM information_schema.columns
     WHERE table_name = 'bulletin_posts' AND column_name = 'venue_id'`
  );

  if (parseInt(hasVenueIdColumn?.count || '0') === 0) {
    await db.query(`ALTER TABLE bulletin_posts ADD COLUMN venue_id TEXT REFERENCES fitness_venues(id) ON DELETE CASCADE`);
    await db.query(`ALTER TABLE bulletin_posts ADD COLUMN linked_venue_record_id TEXT REFERENCES venue_records(id) ON DELETE SET NULL`);
    await db.query(`CREATE INDEX IF NOT EXISTS idx_bulletin_posts_venue ON bulletin_posts(venue_id) WHERE venue_id IS NOT NULL`);
  }

  log.info('Migration 119_venue_records_system completed successfully');
}

export async function down(): Promise<void> {
  log.info('Rolling back migration: 119_venue_records_system');

  // Remove bulletin post columns
  const hasVenueIdColumn = await db.queryOne<{ count: string }>(
    `SELECT COUNT(*) as count FROM information_schema.columns
     WHERE table_name = 'bulletin_posts' AND column_name = 'venue_id'`
  );

  if (parseInt(hasVenueIdColumn?.count || '0') > 0) {
    await db.query(`ALTER TABLE bulletin_posts DROP COLUMN IF EXISTS linked_venue_record_id`);
    await db.query(`ALTER TABLE bulletin_posts DROP COLUMN IF EXISTS venue_id`);
  }

  // Remove achievements
  await db.query(
    `DELETE FROM achievement_definitions WHERE key IN (
      'first_venue_record', 'local_legend', 'record_breaker', 'trusted_witness',
      'venue_explorer', 'iron_throne', 'park_champion'
    )`
  );

  // Drop triggers
  await db.query(`DROP TRIGGER IF EXISTS tr_venue_records_updated ON venue_records`);
  await db.query(`DROP TRIGGER IF EXISTS tr_fitness_venues_updated ON fitness_venues`);
  await db.query(`DROP FUNCTION IF EXISTS update_venue_records_timestamp`);

  // Drop tables in reverse order
  await db.query(`DROP TABLE IF EXISTS venue_record_disputes`);
  await db.query(`DROP TABLE IF EXISTS venue_checkins`);
  await db.query(`DROP TABLE IF EXISTS venue_memberships`);
  await db.query(`DROP TABLE IF EXISTS venue_record_history`);
  await db.query(`DROP TABLE IF EXISTS venue_records`);
  await db.query(`DROP TABLE IF EXISTS venue_record_types`);
  await db.query(`DROP TABLE IF EXISTS fitness_venues`);

  log.info('Rollback of 119_venue_records_system completed');
}
