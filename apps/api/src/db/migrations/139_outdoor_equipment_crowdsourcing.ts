/**
 * Migration 139: Outdoor Equipment Crowdsourcing System
 *
 * Extends the existing fitness_venues system with:
 * - NYC Open Data integration fields
 * - OpenStreetMap integration fields
 * - Crowdsourced location submissions with approval workflow
 * - Equipment condition tracking
 * - Location verification/contributions tracking
 * - Photo contributions
 * - User contribution credits/rewards
 *
 * Builds on migration 132_venue_records_system which already has:
 * - fitness_venues table with equipment JSONB
 * - venue_checkins for user presence tracking
 * - venue_memberships for user-venue relationships
 *
 * DESTRUCTIVE: The down() function removes crowdsourcing tables and columns.
 * This is intentional for clean rollback of the feature.
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
  log.info('Running migration: 139_outdoor_equipment_crowdsourcing');

  // ============================================
  // 1. EXTEND FITNESS_VENUES WITH DATA SOURCE TRACKING
  // ============================================
  log.info('Adding data source columns to fitness_venues...');

  // Add data source tracking
  if (!(await columnExists('fitness_venues', 'data_source'))) {
    await db.query(`
      ALTER TABLE fitness_venues
      ADD COLUMN data_source TEXT DEFAULT 'manual' CHECK (
        data_source IN ('manual', 'nyc_open_data', 'openstreetmap', 'crowdsourced', 'scraped')
      )
    `);
  }

  if (!(await columnExists('fitness_venues', 'external_id'))) {
    await db.query(`ALTER TABLE fitness_venues ADD COLUMN external_id TEXT`);
  }

  if (!(await columnExists('fitness_venues', 'external_source_url'))) {
    await db.query(`ALTER TABLE fitness_venues ADD COLUMN external_source_url TEXT`);
  }

  if (!(await columnExists('fitness_venues', 'osm_id'))) {
    await db.query(`ALTER TABLE fitness_venues ADD COLUMN osm_id BIGINT`);
  }

  if (!(await columnExists('fitness_venues', 'osm_tags'))) {
    await db.query(`ALTER TABLE fitness_venues ADD COLUMN osm_tags JSONB DEFAULT '{}'`);
  }

  if (!(await columnExists('fitness_venues', 'nyc_park_id'))) {
    await db.query(`ALTER TABLE fitness_venues ADD COLUMN nyc_park_id TEXT`);
  }

  if (!(await columnExists('fitness_venues', 'last_synced_at'))) {
    await db.query(`ALTER TABLE fitness_venues ADD COLUMN last_synced_at TIMESTAMPTZ`);
  }

  // Add more detailed location info
  if (!(await columnExists('fitness_venues', 'borough'))) {
    await db.query(`ALTER TABLE fitness_venues ADD COLUMN borough TEXT`);
  }

  if (!(await columnExists('fitness_venues', 'neighborhood'))) {
    await db.query(`ALTER TABLE fitness_venues ADD COLUMN neighborhood TEXT`);
  }

  // Add accessibility info
  if (!(await columnExists('fitness_venues', 'accessibility_info'))) {
    await db.query(`ALTER TABLE fitness_venues ADD COLUMN accessibility_info JSONB DEFAULT '{}'`);
  }

  // Add seasonal/hours details
  if (!(await columnExists('fitness_venues', 'seasonal_availability'))) {
    await db.query(`ALTER TABLE fitness_venues ADD COLUMN seasonal_availability TEXT DEFAULT 'year_round' CHECK (
      seasonal_availability IN ('year_round', 'seasonal', 'weather_dependent')
    )`);
  }

  // Add data quality score
  if (!(await columnExists('fitness_venues', 'data_quality_score'))) {
    await db.query(`ALTER TABLE fitness_venues ADD COLUMN data_quality_score DECIMAL(3, 2) DEFAULT 0.5`);
  }

  // Add contribution counts (denormalized for performance)
  if (!(await columnExists('fitness_venues', 'verification_count'))) {
    await db.query(`ALTER TABLE fitness_venues ADD COLUMN verification_count INTEGER DEFAULT 0`);
  }

  if (!(await columnExists('fitness_venues', 'photo_count'))) {
    await db.query(`ALTER TABLE fitness_venues ADD COLUMN photo_count INTEGER DEFAULT 0`);
  }

  if (!(await columnExists('fitness_venues', 'report_count'))) {
    await db.query(`ALTER TABLE fitness_venues ADD COLUMN report_count INTEGER DEFAULT 0`);
  }

  // Create indexes for data source queries
  await db.query(`CREATE INDEX IF NOT EXISTS idx_venues_data_source ON fitness_venues(data_source) WHERE is_active = TRUE`);
  await db.query(`CREATE INDEX IF NOT EXISTS idx_venues_osm_id ON fitness_venues(osm_id) WHERE osm_id IS NOT NULL`);
  await db.query(`CREATE INDEX IF NOT EXISTS idx_venues_external_id ON fitness_venues(external_id, data_source) WHERE external_id IS NOT NULL`);
  await db.query(`CREATE INDEX IF NOT EXISTS idx_venues_borough ON fitness_venues(borough) WHERE borough IS NOT NULL AND is_active = TRUE`);
  await db.query(`CREATE INDEX IF NOT EXISTS idx_venues_nyc_park ON fitness_venues(nyc_park_id) WHERE nyc_park_id IS NOT NULL`);

  // ============================================
  // 2. EQUIPMENT ITEMS TABLE (Detailed Equipment Tracking)
  // ============================================
  if (!(await tableExists('venue_equipment_items'))) {
    log.info('Creating venue_equipment_items table...');
    await db.query(`
      CREATE TABLE venue_equipment_items (
        id TEXT PRIMARY KEY DEFAULT 'vei_' || replace(gen_random_uuid()::text, '-', ''),
        venue_id TEXT NOT NULL REFERENCES fitness_venues(id) ON DELETE CASCADE,

        -- Equipment details
        equipment_type TEXT NOT NULL CHECK (
          equipment_type IN (
            -- Calisthenics/Street Workout
            'pull_up_bar', 'parallel_bars', 'horizontal_bar', 'monkey_bars',
            'rings', 'climbing_rope', 'pegboard', 'swedish_wall', 'dip_station',

            -- Strength stations
            'ab_bench', 'back_extension', 'leg_press', 'chest_press',
            'lat_pull', 'shoulder_press', 'cable_machine',

            -- Cardio equipment
            'elliptical_outdoor', 'stationary_bike_outdoor', 'rowing_machine_outdoor', 'stepper_outdoor',

            -- Multi-purpose
            'multi_station', 'balance_beam', 'agility_ladder', 'box_jump_platform',

            -- Recreation center equipment
            'weight_room', 'cardio_room', 'pool', 'basketball_court', 'tennis_court', 'track',

            -- Bars with heights
            'low_bar', 'medium_bar', 'high_bar',

            -- Weight equipment
            'bench_press', 'squat_rack', 'barbell', 'dumbbells', 'weight_belt', 'kettlebells',

            -- Other
            'climbing_boulder', 'vertical_pole', 'incline_bench', 'decline_bench', 'smith_machine',
            'leg_curl', 'leg_extension', 'calf_raise', 'hip_abductor', 'hip_adductor', 'pec_deck',
            'treadmill', 'stair_climber', 'assault_bike', 'ski_erg', 'concept2_rower', 'battle_ropes',
            'slam_balls', 'medicine_balls', 'plyo_boxes', 'resistance_bands', 'trx_station',
            'gymnastics_rings', 'rope_climb_station', 'salmon_ladder', 'lache_bars',
            'other'
          )
        ),
        quantity INTEGER DEFAULT 1 CHECK (quantity >= 0),

        -- Condition tracking
        condition TEXT DEFAULT 'unknown' CHECK (
          condition IN ('excellent', 'good', 'fair', 'poor', 'broken', 'unknown')
        ),
        condition_notes TEXT,
        last_condition_check TIMESTAMPTZ,
        condition_reported_by TEXT REFERENCES users(id) ON DELETE SET NULL,

        -- For bars: height variants
        height_variant TEXT CHECK (height_variant IN ('low', 'medium', 'high') OR height_variant IS NULL),

        -- Accessibility
        wheelchair_accessible BOOLEAN DEFAULT NULL,

        -- Verification
        is_verified BOOLEAN DEFAULT FALSE,
        verified_by TEXT REFERENCES users(id) ON DELETE SET NULL,
        verified_at TIMESTAMPTZ,

        -- Source tracking
        added_by TEXT REFERENCES users(id) ON DELETE SET NULL,
        data_source TEXT DEFAULT 'manual' CHECK (
          data_source IN ('manual', 'nyc_open_data', 'openstreetmap', 'crowdsourced', 'scraped', 'inferred')
        ),

        -- Timestamps
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    await db.query(`CREATE INDEX IF NOT EXISTS idx_equipment_venue ON venue_equipment_items(venue_id)`);
    await db.query(`CREATE INDEX IF NOT EXISTS idx_equipment_type ON venue_equipment_items(equipment_type)`);
    await db.query(`CREATE INDEX IF NOT EXISTS idx_equipment_condition ON venue_equipment_items(venue_id, condition)`);
    await db.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_equipment_unique
      ON venue_equipment_items(venue_id, equipment_type, COALESCE(height_variant, ''))
    `);
  }

  // ============================================
  // 3. LOCATION SUBMISSIONS TABLE (Crowdsourced New Locations)
  // ============================================
  if (!(await tableExists('venue_submissions'))) {
    log.info('Creating venue_submissions table...');
    await db.query(`
      CREATE TABLE venue_submissions (
        id TEXT PRIMARY KEY DEFAULT 'vs_' || replace(gen_random_uuid()::text, '-', ''),
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,

        -- Submission status
        status TEXT DEFAULT 'pending' CHECK (
          status IN ('pending', 'under_review', 'approved', 'rejected', 'merged', 'duplicate')
        ),

        -- Location data (proposed)
        proposed_name TEXT NOT NULL,
        proposed_venue_type TEXT NOT NULL CHECK (
          proposed_venue_type IN ('park', 'recreation_center', 'outdoor_gym', 'calisthenics_park', 'public_gym', 'track', 'beach', 'playground', 'custom')
        ),
        latitude DECIMAL(10, 7) NOT NULL,
        longitude DECIMAL(10, 7) NOT NULL,
        proposed_address TEXT,
        proposed_city TEXT DEFAULT 'New York',
        proposed_borough TEXT CHECK (
          proposed_borough IN ('Manhattan', 'Brooklyn', 'Queens', 'Bronx', 'Staten Island') OR proposed_borough IS NULL
        ),
        proposed_postal_code TEXT,

        -- Equipment data (proposed)
        proposed_equipment JSONB DEFAULT '[]',

        -- Hours
        proposed_hours JSONB DEFAULT '{}',
        proposed_is_free BOOLEAN DEFAULT TRUE,
        proposed_is_24_hour BOOLEAN DEFAULT FALSE,

        -- Media
        photo_urls JSONB DEFAULT '[]',

        -- User notes
        notes TEXT,
        how_discovered TEXT, -- 'regular_visitor', 'stumbled_upon', 'friend_told_me', 'google_maps', 'other'

        -- Location accuracy
        location_accuracy_meters DECIMAL(10, 2),
        device_info JSONB DEFAULT '{}',

        -- Admin review
        reviewed_by TEXT REFERENCES users(id) ON DELETE SET NULL,
        reviewer_notes TEXT,
        rejection_reason TEXT,

        -- If approved, link to created venue
        created_venue_id TEXT REFERENCES fitness_venues(id) ON DELETE SET NULL,

        -- If merged, link to existing venue
        merged_into_venue_id TEXT REFERENCES fitness_venues(id) ON DELETE SET NULL,

        -- Duplicate detection
        detected_duplicate_venue_id TEXT REFERENCES fitness_venues(id) ON DELETE SET NULL,
        duplicate_distance_meters DECIMAL(10, 2),

        -- Credits
        credits_awarded INTEGER DEFAULT 0,
        credit_transaction_id TEXT,

        -- Timestamps
        submitted_at TIMESTAMPTZ DEFAULT NOW(),
        reviewed_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    await db.query(`CREATE INDEX IF NOT EXISTS idx_submissions_user ON venue_submissions(user_id, status)`);
    await db.query(`CREATE INDEX IF NOT EXISTS idx_submissions_status ON venue_submissions(status, submitted_at DESC)`);
    await db.query(`CREATE INDEX IF NOT EXISTS idx_submissions_location ON venue_submissions(latitude, longitude) WHERE status = 'pending'`);
    await db.query(`CREATE INDEX IF NOT EXISTS idx_submissions_pending ON venue_submissions(status, submitted_at ASC) WHERE status IN ('pending', 'under_review')`);
  }

  // ============================================
  // 4. VENUE CONTRIBUTIONS TABLE (User Contributions/Verifications)
  // ============================================
  if (!(await tableExists('venue_contributions'))) {
    log.info('Creating venue_contributions table...');
    await db.query(`
      CREATE TABLE venue_contributions (
        id TEXT PRIMARY KEY DEFAULT 'vcon_' || replace(gen_random_uuid()::text, '-', ''),
        venue_id TEXT NOT NULL REFERENCES fitness_venues(id) ON DELETE CASCADE,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,

        -- Contribution type
        contribution_type TEXT NOT NULL CHECK (
          contribution_type IN (
            'verify_exists',          -- Confirmed location exists
            'verify_equipment',       -- Confirmed equipment is accurate
            'update_condition',       -- Updated equipment condition
            'add_photo',              -- Added a photo
            'update_hours',           -- Updated operating hours
            'report_issue',           -- Reported a problem
            'add_equipment',          -- Reported new equipment
            'remove_equipment',       -- Reported equipment removed
            'update_accessibility',   -- Updated accessibility info
            'add_notes',              -- Added helpful notes
            'first_verification',     -- First person to verify a new location
            'quality_improvement'     -- General quality improvement
          )
        ),

        -- Contribution details
        details JSONB DEFAULT '{}',
        notes TEXT,

        -- Photo contribution
        photo_url TEXT,
        photo_asset_id TEXT,

        -- Location verification (was user physically there?)
        verification_latitude DECIMAL(10, 7),
        verification_longitude DECIMAL(10, 7),
        distance_from_venue_meters DECIMAL(10, 2),
        location_verified BOOLEAN DEFAULT FALSE,

        -- Equipment condition update
        equipment_item_id TEXT REFERENCES venue_equipment_items(id) ON DELETE SET NULL,
        old_condition TEXT,
        new_condition TEXT,

        -- Credits
        credits_awarded INTEGER DEFAULT 0,
        credit_transaction_id TEXT,

        -- Review (for flagged contributions)
        is_flagged BOOLEAN DEFAULT FALSE,
        flag_reason TEXT,
        reviewed_by TEXT REFERENCES users(id) ON DELETE SET NULL,
        review_status TEXT DEFAULT 'approved' CHECK (
          review_status IN ('pending', 'approved', 'rejected')
        ),

        -- Timestamps
        contributed_at TIMESTAMPTZ DEFAULT NOW(),
        reviewed_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    await db.query(`CREATE INDEX IF NOT EXISTS idx_contributions_venue ON venue_contributions(venue_id, contribution_type)`);
    await db.query(`CREATE INDEX IF NOT EXISTS idx_contributions_user ON venue_contributions(user_id, contributed_at DESC)`);
    await db.query(`CREATE INDEX IF NOT EXISTS idx_contributions_type ON venue_contributions(contribution_type, contributed_at DESC)`);
    await db.query(`CREATE INDEX IF NOT EXISTS idx_contributions_review ON venue_contributions(is_flagged, review_status) WHERE is_flagged = TRUE`);

    // Daily contribution limit per user per venue
    // Use date_trunc instead of DATE() for index compatibility
    await db.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_contributions_daily_verify
      ON venue_contributions(venue_id, user_id, (contributed_at::date), contribution_type)
      WHERE contribution_type IN ('verify_exists', 'verify_equipment')
    `);
  }

  // ============================================
  // 5. VENUE PHOTOS TABLE
  // ============================================
  if (!(await tableExists('venue_photos'))) {
    log.info('Creating venue_photos table...');
    await db.query(`
      CREATE TABLE venue_photos (
        id TEXT PRIMARY KEY DEFAULT 'vp_' || replace(gen_random_uuid()::text, '-', ''),
        venue_id TEXT NOT NULL REFERENCES fitness_venues(id) ON DELETE CASCADE,
        user_id TEXT REFERENCES users(id) ON DELETE SET NULL,

        -- Photo details
        url TEXT NOT NULL,
        thumbnail_url TEXT,
        asset_id TEXT,
        caption TEXT,

        -- Photo metadata
        width INTEGER,
        height INTEGER,
        file_size_bytes INTEGER,
        mime_type TEXT DEFAULT 'image/jpeg',

        -- What does the photo show?
        photo_type TEXT DEFAULT 'general' CHECK (
          photo_type IN ('general', 'equipment', 'entrance', 'surroundings', 'hours_sign', 'accessibility', 'condition_report')
        ),
        equipment_shown JSONB DEFAULT '[]', -- Array of equipment types visible

        -- Location verification
        photo_latitude DECIMAL(10, 7),
        photo_longitude DECIMAL(10, 7),
        taken_at TIMESTAMPTZ,

        -- Moderation
        is_approved BOOLEAN DEFAULT TRUE,
        is_primary BOOLEAN DEFAULT FALSE, -- Cover photo
        is_flagged BOOLEAN DEFAULT FALSE,
        flag_reason TEXT,
        moderated_by TEXT REFERENCES users(id) ON DELETE SET NULL,
        moderated_at TIMESTAMPTZ,

        -- Data source
        data_source TEXT DEFAULT 'user_upload' CHECK (
          data_source IN ('user_upload', 'nyc_open_data', 'google_places', 'scraped', 'admin_upload')
        ),

        -- Timestamps
        uploaded_at TIMESTAMPTZ DEFAULT NOW(),
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    await db.query(`CREATE INDEX IF NOT EXISTS idx_photos_venue ON venue_photos(venue_id, is_approved, uploaded_at DESC)`);
    await db.query(`CREATE INDEX IF NOT EXISTS idx_photos_user ON venue_photos(user_id, uploaded_at DESC)`);
    await db.query(`CREATE INDEX IF NOT EXISTS idx_photos_primary ON venue_photos(venue_id, is_primary) WHERE is_primary = TRUE`);
    await db.query(`CREATE INDEX IF NOT EXISTS idx_photos_flagged ON venue_photos(is_flagged, is_approved) WHERE is_flagged = TRUE`);
  }

  // ============================================
  // 6. VENUE REPORTS TABLE (Issue Reporting)
  // ============================================
  if (!(await tableExists('venue_reports'))) {
    log.info('Creating venue_reports table...');
    await db.query(`
      CREATE TABLE venue_reports (
        id TEXT PRIMARY KEY DEFAULT 'vrep_' || replace(gen_random_uuid()::text, '-', ''),
        venue_id TEXT NOT NULL REFERENCES fitness_venues(id) ON DELETE CASCADE,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,

        -- Report type
        report_type TEXT NOT NULL CHECK (
          report_type IN (
            'incorrect_location',     -- Location is wrong
            'equipment_missing',      -- Equipment no longer exists
            'equipment_broken',       -- Equipment is damaged/unsafe
            'venue_closed',           -- Venue is permanently closed
            'temporarily_closed',     -- Venue is temporarily closed
            'unsafe',                 -- Safety concern
            'incorrect_hours',        -- Hours are wrong
            'incorrect_info',         -- Other info is wrong
            'duplicate',              -- This is a duplicate of another venue
            'spam',                   -- This listing is spam/fake
            'other'                   -- Other issue
          )
        ),

        -- Report details
        description TEXT NOT NULL,
        severity TEXT DEFAULT 'medium' CHECK (
          severity IN ('low', 'medium', 'high', 'critical')
        ),

        -- Supporting evidence
        photo_urls JSONB DEFAULT '[]',
        duplicate_venue_id TEXT REFERENCES fitness_venues(id) ON DELETE SET NULL,

        -- Location when reporting
        report_latitude DECIMAL(10, 7),
        report_longitude DECIMAL(10, 7),

        -- Resolution
        status TEXT DEFAULT 'pending' CHECK (
          status IN ('pending', 'investigating', 'resolved_fixed', 'resolved_closed', 'dismissed')
        ),
        resolution_notes TEXT,
        resolved_by TEXT REFERENCES users(id) ON DELETE SET NULL,
        resolved_at TIMESTAMPTZ,

        -- Action taken
        action_taken TEXT CHECK (
          action_taken IN ('updated_info', 'marked_closed', 'removed_equipment', 'merged_duplicate', 'no_action_needed', 'venue_removed') OR action_taken IS NULL
        ),

        -- Credits (for valid reports)
        credits_awarded INTEGER DEFAULT 0,

        -- Timestamps
        reported_at TIMESTAMPTZ DEFAULT NOW(),
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    await db.query(`CREATE INDEX IF NOT EXISTS idx_reports_venue ON venue_reports(venue_id, status)`);
    await db.query(`CREATE INDEX IF NOT EXISTS idx_reports_status ON venue_reports(status, severity DESC, reported_at ASC)`);
    await db.query(`CREATE INDEX IF NOT EXISTS idx_reports_user ON venue_reports(user_id, reported_at DESC)`);
  }

  // ============================================
  // 7. DATA SYNC LOG TABLE (For ingestion tracking)
  // ============================================
  if (!(await tableExists('venue_data_sync_log'))) {
    log.info('Creating venue_data_sync_log table...');
    await db.query(`
      CREATE TABLE venue_data_sync_log (
        id TEXT PRIMARY KEY DEFAULT 'vdsl_' || replace(gen_random_uuid()::text, '-', ''),

        -- Source info
        data_source TEXT NOT NULL CHECK (
          data_source IN ('nyc_open_data', 'openstreetmap', 'scraper', 'manual_import')
        ),
        source_dataset TEXT, -- e.g., 'recreation_centers', 'fitness_equipment', 'parks'

        -- Sync details
        sync_type TEXT NOT NULL CHECK (
          sync_type IN ('full', 'incremental', 'manual')
        ),
        status TEXT DEFAULT 'running' CHECK (
          status IN ('running', 'completed', 'failed', 'partial')
        ),

        -- Statistics
        records_fetched INTEGER DEFAULT 0,
        records_created INTEGER DEFAULT 0,
        records_updated INTEGER DEFAULT 0,
        records_skipped INTEGER DEFAULT 0,
        records_failed INTEGER DEFAULT 0,

        -- Details
        error_message TEXT,
        error_details JSONB,
        sync_log JSONB DEFAULT '[]',

        -- Timestamps
        started_at TIMESTAMPTZ DEFAULT NOW(),
        completed_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    await db.query(`CREATE INDEX IF NOT EXISTS idx_sync_log_source ON venue_data_sync_log(data_source, started_at DESC)`);
    await db.query(`CREATE INDEX IF NOT EXISTS idx_sync_log_status ON venue_data_sync_log(status, started_at DESC)`);
  }

  // ============================================
  // 8. USER CONTRIBUTION STATS (Gamification)
  // ============================================
  if (!(await tableExists('user_venue_contribution_stats'))) {
    log.info('Creating user_venue_contribution_stats table...');
    await db.query(`
      CREATE TABLE user_venue_contribution_stats (
        user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,

        -- Contribution counts
        venues_submitted INTEGER DEFAULT 0,
        venues_approved INTEGER DEFAULT 0,
        verifications_count INTEGER DEFAULT 0,
        photos_uploaded INTEGER DEFAULT 0,
        reports_submitted INTEGER DEFAULT 0,
        reports_resolved INTEGER DEFAULT 0,
        equipment_updates INTEGER DEFAULT 0,

        -- Quality metrics
        approval_rate DECIMAL(5, 4) DEFAULT 0,
        helpful_votes_received INTEGER DEFAULT 0,

        -- Streaks
        current_contribution_streak INTEGER DEFAULT 0,
        longest_contribution_streak INTEGER DEFAULT 0,
        last_contribution_date DATE,

        -- Credits earned
        total_credits_earned INTEGER DEFAULT 0,

        -- Rank/Level
        contributor_level INTEGER DEFAULT 1,
        contributor_title TEXT DEFAULT 'Explorer',

        -- Timestamps
        first_contribution_at TIMESTAMPTZ,
        last_contribution_at TIMESTAMPTZ,
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    await db.query(`CREATE INDEX IF NOT EXISTS idx_contributor_stats_level ON user_venue_contribution_stats(contributor_level DESC, verifications_count DESC)`);
  }

  // ============================================
  // 9. UPDATE TRIGGERS
  // ============================================
  log.info('Creating update triggers...');

  await db.query(`
    CREATE OR REPLACE FUNCTION update_venue_equipment_timestamp()
    RETURNS TRIGGER AS $$
    BEGIN
      NEW.updated_at = NOW();
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql
  `);

  await db.query(`
    DROP TRIGGER IF EXISTS tr_venue_equipment_updated ON venue_equipment_items;
    CREATE TRIGGER tr_venue_equipment_updated
    BEFORE UPDATE ON venue_equipment_items
    FOR EACH ROW EXECUTE FUNCTION update_venue_equipment_timestamp()
  `);

  await db.query(`
    DROP TRIGGER IF EXISTS tr_venue_submissions_updated ON venue_submissions;
    CREATE TRIGGER tr_venue_submissions_updated
    BEFORE UPDATE ON venue_submissions
    FOR EACH ROW EXECUTE FUNCTION update_venue_equipment_timestamp()
  `);

  // ============================================
  // 10. ADD CREDIT EARNING RULES
  // ============================================
  log.info('Adding venue contribution earning rules...');

  // First, update the category check constraint to allow 'venue'
  await db.query(`
    ALTER TABLE earning_rules DROP CONSTRAINT IF EXISTS earning_rules_category_check;
    ALTER TABLE earning_rules ADD CONSTRAINT earning_rules_category_check
      CHECK (category = ANY (ARRAY['workout', 'streak', 'pr', 'goal', 'leaderboard', 'trainer', 'social', 'special', 'venue']));
  `);

  // Earning rules matching actual schema: code, name, description, category, credits_base, xp_base, max_per_day
  const earningRules = [
    { code: 'venue_submit_new', name: 'Submit Venue', description: 'Submit a new venue location (approved)', category: 'venue', credits_base: 50, xp_base: 50, max_per_day: 5 },
    { code: 'venue_submit_with_photo', name: 'Submit Venue w/ Photo', description: 'Submit venue with photo (approved)', category: 'venue', credits_base: 75, xp_base: 75, max_per_day: 5 },
    { code: 'venue_verify_exists', name: 'Verify Venue', description: 'Verify a venue exists', category: 'venue', credits_base: 10, xp_base: 5, max_per_day: 10 },
    { code: 'venue_verify_equipment', name: 'Verify Equipment', description: 'Verify equipment accuracy', category: 'venue', credits_base: 15, xp_base: 8, max_per_day: 10 },
    { code: 'venue_add_photo', name: 'Add Venue Photo', description: 'Add photo to existing venue', category: 'venue', credits_base: 25, xp_base: 25, max_per_day: 5 },
    { code: 'venue_report_valid', name: 'Valid Report', description: 'Submit valid issue report', category: 'venue', credits_base: 15, xp_base: 8, max_per_day: 5 },
    { code: 'venue_first_verification', name: 'First Verifier', description: 'First to verify a new location', category: 'venue', credits_base: 25, xp_base: 25, max_per_day: 3 },
    { code: 'venue_update_condition', name: 'Update Condition', description: 'Update equipment condition', category: 'venue', credits_base: 10, xp_base: 5, max_per_day: 10 },
    { code: 'venue_weekly_contributor', name: 'Weekly Contributor', description: 'Make 5+ contributions in a week', category: 'venue', credits_base: 100, xp_base: 200, max_per_day: 1 },
    { code: 'venue_local_expert', name: 'Local Expert', description: 'Verify 10+ venues in same borough', category: 'venue', credits_base: 200, xp_base: 300, max_per_day: 1 },
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
  // 11. ADD VENUE CONTRIBUTION ACHIEVEMENTS
  // ============================================
  log.info('Adding venue contribution achievements...');

  const achievements = [
    { key: 'venue_first_submit', name: 'Trailblazer', description: 'Submit your first approved venue', icon: '🗺️', category: 'milestone', points: 100, rarity: 'common', enabled: true },
    { key: 'venue_photographer', name: 'Gym Paparazzi', description: 'Upload 10 approved venue photos', icon: '📸', category: 'milestone', points: 150, rarity: 'uncommon', enabled: true },
    { key: 'venue_verifier_10', name: 'Quality Controller', description: 'Verify 10 venues', icon: '✅', category: 'milestone', points: 100, rarity: 'common', enabled: true },
    { key: 'venue_verifier_50', name: 'Trusted Verifier', description: 'Verify 50 venues', icon: '🔍', category: 'milestone', points: 300, rarity: 'rare', enabled: true },
    { key: 'venue_submitter_5', name: 'Map Maker', description: 'Submit 5 approved venues', icon: '📍', category: 'milestone', points: 250, rarity: 'uncommon', enabled: true },
    { key: 'venue_submitter_25', name: 'Cartographer', description: 'Submit 25 approved venues', icon: '🌍', category: 'milestone', points: 750, rarity: 'epic', enabled: true },
    { key: 'venue_borough_expert', name: 'Borough Expert', description: 'Verify venues in all 5 NYC boroughs', icon: '🏙️', category: 'special', points: 500, rarity: 'rare', enabled: true },
    { key: 'venue_equipment_hunter', name: 'Equipment Hunter', description: 'Find and verify 10 different equipment types', icon: '🏋️', category: 'special', points: 300, rarity: 'rare', enabled: true },
    { key: 'venue_reporter', name: 'Watchdog', description: 'Submit 5 valid issue reports', icon: '🐕', category: 'milestone', points: 200, rarity: 'uncommon', enabled: true },
    { key: 'venue_streak_7', name: 'Dedicated Contributor', description: 'Contribute for 7 days in a row', icon: '🔥', category: 'streak', points: 150, rarity: 'uncommon', enabled: true },
    { key: 'venue_streak_30', name: 'Community Pillar', description: 'Contribute for 30 days in a row', icon: '🏆', category: 'streak', points: 500, rarity: 'epic', enabled: true },
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
  // 12. UPDATE EXISTING NYC VENUES WITH BOROUGH
  // ============================================
  log.info('Updating existing NYC venues with borough...');

  // Manhattan venues
  await db.query(`
    UPDATE fitness_venues SET borough = 'Manhattan'
    WHERE city = 'New York' AND (
      address ILIKE '%manhattan%' OR
      slug IN ('tompkins-square-park-nyc', 'central-park-north-meadow', 'riverside-park-72nd',
               'john-jay-park', 'east-river-esplanade', 'asser-levy-rec')
    )
  `);

  // Brooklyn venues
  await db.query(`
    UPDATE fitness_venues SET borough = 'Brooklyn'
    WHERE city = 'Brooklyn' OR slug IN (
      'mccarren-park-brooklyn', 'dumbo-fitness-brooklyn', 'sunset-park-rec',
      'prospect-park-parade', 'red-hook-rec', 'st-johns-rec-brooklyn'
    )
  `);

  // Queens venues
  await db.query(`
    UPDATE fitness_venues SET borough = 'Queens'
    WHERE city = 'Queens' OR slug IN ('astoria-park', 'flushing-meadows', 'juniper-valley')
  `);

  // Bronx venues
  await db.query(`
    UPDATE fitness_venues SET borough = 'Bronx'
    WHERE city = 'Bronx' OR slug IN ('st-marys-park-bronx', 'crotona-park')
  `);

  log.info('Migration 139_outdoor_equipment_crowdsourcing completed successfully');
}

export async function down(): Promise<void> {
  log.info('Rolling back migration: 139_outdoor_equipment_crowdsourcing');

  // Remove earning rules
  await db.query(`
    DELETE FROM earning_rules WHERE key IN (
      'venue_submit_new', 'venue_submit_with_photo', 'venue_verify_exists', 'venue_verify_equipment',
      'venue_add_photo', 'venue_report_valid', 'venue_first_verification', 'venue_update_condition',
      'venue_weekly_contributor', 'venue_local_expert'
    )
  `);

  // Remove achievements
  await db.query(`
    DELETE FROM achievement_definitions WHERE key IN (
      'venue_first_submit', 'venue_photographer', 'venue_verifier_10', 'venue_verifier_50',
      'venue_submitter_5', 'venue_submitter_25', 'venue_borough_expert', 'venue_equipment_hunter',
      'venue_reporter', 'venue_streak_7', 'venue_streak_30'
    )
  `);

  // Drop triggers
  await db.query(`DROP TRIGGER IF EXISTS tr_venue_equipment_updated ON venue_equipment_items`);
  await db.query(`DROP TRIGGER IF EXISTS tr_venue_submissions_updated ON venue_submissions`);

  // Drop tables in reverse order
  await db.query(`DROP TABLE IF EXISTS user_venue_contribution_stats`);
  await db.query(`DROP TABLE IF EXISTS venue_data_sync_log`);
  await db.query(`DROP TABLE IF EXISTS venue_reports`);
  await db.query(`DROP TABLE IF EXISTS venue_photos`);
  await db.query(`DROP TABLE IF EXISTS venue_contributions`);
  await db.query(`DROP TABLE IF EXISTS venue_submissions`);
  await db.query(`DROP TABLE IF EXISTS venue_equipment_items`);

  // Remove columns from fitness_venues (keep data_source for potential future use)
  await db.query(`ALTER TABLE fitness_venues DROP COLUMN IF EXISTS external_id`);
  await db.query(`ALTER TABLE fitness_venues DROP COLUMN IF EXISTS external_source_url`);
  await db.query(`ALTER TABLE fitness_venues DROP COLUMN IF EXISTS osm_id`);
  await db.query(`ALTER TABLE fitness_venues DROP COLUMN IF EXISTS osm_tags`);
  await db.query(`ALTER TABLE fitness_venues DROP COLUMN IF EXISTS nyc_park_id`);
  await db.query(`ALTER TABLE fitness_venues DROP COLUMN IF EXISTS last_synced_at`);
  await db.query(`ALTER TABLE fitness_venues DROP COLUMN IF EXISTS borough`);
  await db.query(`ALTER TABLE fitness_venues DROP COLUMN IF EXISTS neighborhood`);
  await db.query(`ALTER TABLE fitness_venues DROP COLUMN IF EXISTS accessibility_info`);
  await db.query(`ALTER TABLE fitness_venues DROP COLUMN IF EXISTS seasonal_availability`);
  await db.query(`ALTER TABLE fitness_venues DROP COLUMN IF EXISTS data_quality_score`);
  await db.query(`ALTER TABLE fitness_venues DROP COLUMN IF EXISTS verification_count`);
  await db.query(`ALTER TABLE fitness_venues DROP COLUMN IF EXISTS photo_count`);
  await db.query(`ALTER TABLE fitness_venues DROP COLUMN IF EXISTS report_count`);
  await db.query(`ALTER TABLE fitness_venues DROP COLUMN IF EXISTS data_source`);

  log.info('Rollback of 139_outdoor_equipment_crowdsourcing completed');
}
