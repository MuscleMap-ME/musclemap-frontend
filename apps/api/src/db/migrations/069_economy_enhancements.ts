/**
 * Migration: Economy Enhancements
 *
 * Comprehensive economy upgrade with:
 * 1. Geo-based hangouts with PostGIS support
 * 2. Credit packages for real money purchases
 * 3. Store categories and expanded items
 * 4. Credit earn events for real-time visibility
 * 5. Random bonus events (Lucky Rep, Golden Set, etc.)
 * 6. Hangout challenges with prize pools
 * 7. Enhanced profile customization
 * 8. Social spending features (tips, gifts, boosts)
 *
 * Core Equation: 1 penny = 1 credit = 1 Training Unit (TU)
 * Minimum Purchase: $1.00 = 100 credits
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

async function indexExists(indexName: string): Promise<boolean> {
  const result = await db.queryOne<{ count: string }>(
    `SELECT COUNT(*) as count FROM pg_indexes WHERE indexname = $1`,
    [indexName]
  );
  return parseInt(result?.count || '0') > 0;
}

async function extensionExists(extName: string): Promise<boolean> {
  const result = await db.queryOne<{ count: string }>(
    `SELECT COUNT(*) as count FROM pg_extension WHERE extname = $1`,
    [extName]
  );
  return parseInt(result?.count || '0') > 0;
}

export async function up(): Promise<void> {
  log.info('Running migration: 069_economy_enhancements');

  // ============================================
  // POSTGIS EXTENSION FOR GEO FEATURES
  // ============================================
  if (!(await extensionExists('postgis'))) {
    log.info('Creating PostGIS extension...');
    try {
      await db.query('CREATE EXTENSION IF NOT EXISTS postgis');
    } catch (e) {
      log.warn('PostGIS extension not available, using basic lat/lng calculations');
    }
  }

  // ============================================
  // USER LOCATIONS (for geo-based hangouts)
  // ============================================
  if (!(await tableExists('user_locations'))) {
    log.info('Creating user_locations table...');
    await db.query(`
      CREATE TABLE user_locations (
        user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,

        -- Location data
        latitude DECIMAL(10, 8),
        longitude DECIMAL(11, 8),
        accuracy_meters INTEGER,

        -- Derived location (for privacy)
        city VARCHAR(100),
        state_province VARCHAR(100),
        country VARCHAR(100),
        postal_code VARCHAR(20),
        timezone VARCHAR(50),

        -- Privacy settings
        share_exact BOOLEAN DEFAULT false,
        share_city BOOLEAN DEFAULT true,
        visible_in_hangout BOOLEAN DEFAULT true,

        -- Timestamps
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    await db.query('CREATE INDEX idx_user_locations_city ON user_locations(city, state_province)');
    await db.query('CREATE INDEX idx_user_locations_coords ON user_locations(latitude, longitude) WHERE latitude IS NOT NULL');
  }

  // ============================================
  // GEO HANGOUTS (location-based communities)
  // ============================================
  if (!(await tableExists('geo_hangouts'))) {
    log.info('Creating geo_hangouts table...');
    await db.query(`
      CREATE TABLE geo_hangouts (
        id TEXT PRIMARY KEY DEFAULT 'geo_' || replace(gen_random_uuid()::text, '-', ''),

        -- Location definition
        name VARCHAR(255) NOT NULL,
        center_latitude DECIMAL(10, 8) NOT NULL,
        center_longitude DECIMAL(11, 8) NOT NULL,
        radius_miles INTEGER NOT NULL DEFAULT 25,

        -- Location metadata
        city VARCHAR(100),
        state_province VARCHAR(100),
        country VARCHAR(100),

        -- Stats (denormalized for performance)
        member_count INTEGER DEFAULT 0,
        active_today INTEGER DEFAULT 0,
        active_this_week INTEGER DEFAULT 0,

        -- Settings
        auto_generated BOOLEAN DEFAULT true,
        enabled BOOLEAN DEFAULT true,

        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    await db.query('CREATE INDEX idx_geo_hangouts_coords ON geo_hangouts(center_latitude, center_longitude)');
    await db.query('CREATE INDEX idx_geo_hangouts_city ON geo_hangouts(city, state_province)');
  }

  // ============================================
  // USER HANGOUT MEMBERSHIPS
  // ============================================
  if (!(await tableExists('user_hangout_memberships'))) {
    log.info('Creating user_hangout_memberships table...');
    await db.query(`
      CREATE TABLE user_hangout_memberships (
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        hangout_id TEXT NOT NULL REFERENCES geo_hangouts(id) ON DELETE CASCADE,

        -- Membership type
        is_primary BOOLEAN DEFAULT false,
        joined_at TIMESTAMPTZ DEFAULT NOW(),

        -- Distance from user to hangout center (cached)
        distance_miles DECIMAL(8, 2),

        -- Activity
        last_active_at TIMESTAMPTZ,
        posts_count INTEGER DEFAULT 0,

        PRIMARY KEY (user_id, hangout_id)
      )
    `);

    await db.query('CREATE INDEX idx_user_hangout_primary ON user_hangout_memberships(user_id) WHERE is_primary = true');
    await db.query('CREATE INDEX idx_user_hangout_hangout ON user_hangout_memberships(hangout_id, distance_miles)');
  }

  // ============================================
  // CREDIT PACKAGES (for real money purchases)
  // ============================================
  if (!(await tableExists('credit_packages'))) {
    log.info('Creating credit_packages table...');
    await db.query(`
      CREATE TABLE credit_packages (
        id TEXT PRIMARY KEY DEFAULT 'pkg_' || replace(gen_random_uuid()::text, '-', ''),

        name VARCHAR(100) NOT NULL,
        description TEXT,
        price_cents INTEGER NOT NULL CHECK (price_cents >= 100),
        credits INTEGER NOT NULL CHECK (credits > 0),
        bonus_credits INTEGER DEFAULT 0,
        bonus_percent DECIMAL(5, 2) DEFAULT 0,

        -- Display
        popular BOOLEAN DEFAULT false,
        best_value BOOLEAN DEFAULT false,
        display_order INTEGER DEFAULT 0,
        icon VARCHAR(50),
        color VARCHAR(20),

        -- Availability
        enabled BOOLEAN DEFAULT true,
        min_purchase INTEGER DEFAULT 1,
        max_purchase INTEGER DEFAULT 10,

        -- Stripe product ID (for recurring)
        stripe_price_id VARCHAR(100),

        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    // Seed default packages (1 penny = 1 credit)
    log.info('Seeding credit packages...');
    const packages = [
      { name: 'Starter', price: 100, credits: 100, bonus: 0, percent: 0, order: 1, icon: 'coins', color: '#CD7F32' },
      { name: 'Basic', price: 500, credits: 500, bonus: 25, percent: 5, order: 2, icon: 'wallet', color: '#C0C0C0' },
      { name: 'Standard', price: 1000, credits: 1000, bonus: 100, percent: 10, order: 3, icon: 'credit-card', color: '#FFD700', popular: true },
      { name: 'Plus', price: 2500, credits: 2500, bonus: 375, percent: 15, order: 4, icon: 'zap', color: '#9966CC' },
      { name: 'Premium', price: 5000, credits: 5000, bonus: 1000, percent: 20, order: 5, icon: 'crown', color: '#E5E4E2', best_value: true },
      { name: 'Elite', price: 10000, credits: 10000, bonus: 2500, percent: 25, order: 6, icon: 'diamond', color: '#B9F2FF' },
      { name: 'Ultimate', price: 20000, credits: 20000, bonus: 6000, percent: 30, order: 7, icon: 'flame', color: '#0D0D0D' },
    ];

    for (const pkg of packages) {
      await db.query(
        `INSERT INTO credit_packages (name, price_cents, credits, bonus_credits, bonus_percent, display_order, icon, color, popular, best_value)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         ON CONFLICT DO NOTHING`,
        [pkg.name, pkg.price, pkg.credits, pkg.bonus, pkg.percent, pkg.order, pkg.icon, pkg.color, pkg.popular || false, pkg.best_value || false]
      );
    }
  }

  // ============================================
  // STORE CATEGORIES
  // ============================================
  if (!(await tableExists('store_categories'))) {
    log.info('Creating store_categories table...');
    await db.query(`
      CREATE TABLE store_categories (
        id TEXT PRIMARY KEY DEFAULT 'cat_' || replace(gen_random_uuid()::text, '-', ''),

        name VARCHAR(100) NOT NULL,
        slug VARCHAR(100) NOT NULL UNIQUE,
        description TEXT,
        icon VARCHAR(50),

        -- Hierarchy
        parent_id TEXT REFERENCES store_categories(id),

        -- Display
        display_order INTEGER DEFAULT 0,
        enabled BOOLEAN DEFAULT true,

        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    // Seed categories
    log.info('Seeding store categories...');
    const categories = [
      { name: 'Profile', slug: 'profile', description: 'Customize your profile appearance', icon: 'user', order: 1 },
      { name: 'Frames & Borders', slug: 'frames', description: 'Profile frame decorations', icon: 'frame', order: 2 },
      { name: 'Badges & Flair', slug: 'badges', description: 'Show off your achievements', icon: 'award', order: 3 },
      { name: 'Buddy Cosmetics', slug: 'buddy', description: 'Customize your training buddy', icon: 'heart', order: 4 },
      { name: 'Social Power', slug: 'social', description: 'Enhanced social interactions', icon: 'users', order: 5 },
      { name: 'Utilities', slug: 'utilities', description: 'Helpful tools and boosts', icon: 'tool', order: 6 },
      { name: 'Hangout Items', slug: 'hangout', description: 'Stand out in your hangout', icon: 'home', order: 7 },
      { name: 'Prestige', slug: 'prestige', description: 'Show your dedication', icon: 'crown', order: 8 },
    ];

    for (const cat of categories) {
      await db.query(
        `INSERT INTO store_categories (name, slug, description, icon, display_order)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (slug) DO NOTHING`,
        [cat.name, cat.slug, cat.description, cat.icon, cat.order]
      );
    }
  }

  // Add category_id to store_items if not exists
  if (await tableExists('store_items')) {
    if (!(await columnExists('store_items', 'category_id'))) {
      log.info('Adding category_id to store_items...');
      await db.query('ALTER TABLE store_items ADD COLUMN category_id TEXT REFERENCES store_categories(id)');
      await db.query('ALTER TABLE store_items ADD COLUMN preview_url VARCHAR(500)');
      await db.query('ALTER TABLE store_items ADD COLUMN animation_type VARCHAR(50)');
      await db.query('ALTER TABLE store_items ADD COLUMN duration_days INTEGER');
      await db.query('ALTER TABLE store_items ADD COLUMN stackable BOOLEAN DEFAULT false');
      await db.query('ALTER TABLE store_items ADD COLUMN max_quantity INTEGER DEFAULT 1');
      await db.query('ALTER TABLE store_items ADD COLUMN sale_price_credits INTEGER');
      await db.query('ALTER TABLE store_items ADD COLUMN sale_ends_at TIMESTAMPTZ');
    }
  }

  // ============================================
  // CREDIT EARN EVENTS (for real-time display)
  // ============================================
  if (!(await tableExists('credit_earn_events'))) {
    log.info('Creating credit_earn_events table...');
    await db.query(`
      CREATE TABLE credit_earn_events (
        id TEXT PRIMARY KEY DEFAULT 'evt_' || replace(gen_random_uuid()::text, '-', ''),
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,

        -- Event details
        amount INTEGER NOT NULL,
        source VARCHAR(100) NOT NULL,
        source_id TEXT,
        description VARCHAR(255),

        -- Display
        animation_type VARCHAR(50) DEFAULT 'normal',
        icon VARCHAR(50),
        color VARCHAR(20),

        -- Status
        shown BOOLEAN DEFAULT false,

        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    await db.query('CREATE INDEX idx_credit_earn_events_unseen ON credit_earn_events(user_id, created_at DESC) WHERE shown = false');
    await db.query('CREATE INDEX idx_credit_earn_events_cleanup ON credit_earn_events(created_at)');
  }

  // ============================================
  // BONUS EVENT TYPES (Lucky Rep, Golden Set, etc.)
  // ============================================
  if (!(await tableExists('bonus_event_types'))) {
    log.info('Creating bonus_event_types table...');
    await db.query(`
      CREATE TABLE bonus_event_types (
        id TEXT PRIMARY KEY DEFAULT 'bonus_' || replace(gen_random_uuid()::text, '-', ''),

        code VARCHAR(50) NOT NULL UNIQUE,
        name VARCHAR(100) NOT NULL,
        description TEXT,

        -- Probability (0-1)
        probability DECIMAL(10, 8) NOT NULL,

        -- Reward
        min_credits INTEGER NOT NULL,
        max_credits INTEGER NOT NULL,

        -- Conditions
        trigger_on VARCHAR(50) NOT NULL,

        -- Limits
        max_per_day INTEGER DEFAULT 1,
        max_per_week INTEGER DEFAULT 7,

        -- Display
        icon VARCHAR(50),
        color VARCHAR(20),
        animation VARCHAR(50),

        enabled BOOLEAN DEFAULT true,

        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    // Seed bonus events
    log.info('Seeding bonus event types...');
    const bonusEvents = [
      { code: 'lucky_rep', name: 'Lucky Rep', description: 'Random rep gives bonus credits', probability: 0.01, min: 5, max: 15, trigger: 'rep', maxDay: 3, icon: 'star', color: '#FFD700', animation: 'sparkle' },
      { code: 'golden_set', name: 'Golden Set', description: 'Random set gives bonus credits', probability: 0.02, min: 15, max: 35, trigger: 'set', maxDay: 2, icon: 'zap', color: '#FFD700', animation: 'glow' },
      { code: 'jackpot_workout', name: 'Jackpot Workout', description: 'Surprise workout bonus', probability: 0.01, min: 50, max: 150, trigger: 'workout', maxDay: 1, icon: 'gift', color: '#9966CC', animation: 'confetti' },
      { code: 'mystery_box', name: 'Mystery Box', description: 'Daily random reward', probability: 1.0, min: 5, max: 500, trigger: 'daily_login', maxDay: 1, icon: 'box', color: '#FF6B6B', animation: 'shake' },
      { code: 'early_bird', name: 'Early Bird', description: 'Workout before 6 AM', probability: 1.0, min: 15, max: 15, trigger: 'early_workout', maxDay: 1, icon: 'sunrise', color: '#FFA500', animation: 'rise' },
      { code: 'night_owl', name: 'Night Owl', description: 'Workout after 10 PM', probability: 1.0, min: 15, max: 15, trigger: 'late_workout', maxDay: 1, icon: 'moon', color: '#4169E1', animation: 'glow' },
      { code: 'weekend_warrior', name: 'Weekend Warrior', description: 'Weekend workout bonus', probability: 1.0, min: 10, max: 10, trigger: 'weekend_workout', maxDay: 2, icon: 'calendar', color: '#32CD32', animation: 'pulse' },
      { code: 'comeback_kid', name: 'Comeback Bonus', description: 'Return after 3+ days away', probability: 1.0, min: 50, max: 50, trigger: 'comeback', maxDay: 1, icon: 'refresh-cw', color: '#20B2AA', animation: 'bounce' },
    ];

    for (const evt of bonusEvents) {
      await db.query(
        `INSERT INTO bonus_event_types (code, name, description, probability, min_credits, max_credits, trigger_on, max_per_day, icon, color, animation)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
         ON CONFLICT (code) DO NOTHING`,
        [evt.code, evt.name, evt.description, evt.probability, evt.min, evt.max, evt.trigger, evt.maxDay, evt.icon, evt.color, evt.animation]
      );
    }
  }

  // ============================================
  // USER BONUS EVENTS HISTORY
  // ============================================
  if (!(await tableExists('user_bonus_events'))) {
    log.info('Creating user_bonus_events table...');
    await db.query(`
      CREATE TABLE user_bonus_events (
        id TEXT PRIMARY KEY DEFAULT 'ube_' || replace(gen_random_uuid()::text, '-', ''),
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        event_type_code VARCHAR(50) NOT NULL,

        credits_awarded INTEGER NOT NULL,
        trigger_source_id TEXT,

        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    await db.query('CREATE INDEX idx_user_bonus_events_user_date ON user_bonus_events(user_id, created_at DESC)');
    await db.query('CREATE INDEX idx_user_bonus_events_type ON user_bonus_events(event_type_code, created_at DESC)');
  }

  // ============================================
  // HANGOUT CHALLENGES WITH PRIZE POOLS
  // ============================================
  if (!(await tableExists('hangout_challenges'))) {
    log.info('Creating hangout_challenges table...');
    await db.query(`
      CREATE TABLE hangout_challenges (
        id TEXT PRIMARY KEY DEFAULT 'hc_' || replace(gen_random_uuid()::text, '-', ''),
        hangout_id TEXT REFERENCES geo_hangouts(id) ON DELETE CASCADE,

        name VARCHAR(255) NOT NULL,
        description TEXT,

        -- Type
        challenge_type VARCHAR(50) NOT NULL,
        metric_key VARCHAR(100),

        -- Duration
        starts_at TIMESTAMPTZ NOT NULL,
        ends_at TIMESTAMPTZ NOT NULL,

        -- Prize pool
        base_prize INTEGER DEFAULT 0,
        contributed_prize INTEGER DEFAULT 0,

        -- Entry
        entry_fee INTEGER DEFAULT 0,
        max_participants INTEGER,

        -- Status
        status VARCHAR(20) DEFAULT 'upcoming' CHECK (status IN ('upcoming', 'active', 'completed', 'cancelled')),

        -- Metadata
        rules JSONB DEFAULT '{}',

        created_by TEXT REFERENCES users(id),
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    await db.query('CREATE INDEX idx_hangout_challenges_hangout ON hangout_challenges(hangout_id, starts_at DESC)');
    await db.query('CREATE INDEX idx_hangout_challenges_active ON hangout_challenges(status, ends_at) WHERE status = \'active\'');
    await db.query('CREATE INDEX idx_hangout_challenges_upcoming ON hangout_challenges(starts_at) WHERE status = \'upcoming\'');
  }

  // ============================================
  // CHALLENGE PARTICIPANTS
  // ============================================
  if (!(await tableExists('hangout_challenge_participants'))) {
    log.info('Creating hangout_challenge_participants table...');
    await db.query(`
      CREATE TABLE hangout_challenge_participants (
        challenge_id TEXT NOT NULL REFERENCES hangout_challenges(id) ON DELETE CASCADE,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,

        -- Progress
        current_value DECIMAL(15, 2) DEFAULT 0,
        rank INTEGER,

        -- Payment
        entry_paid INTEGER DEFAULT 0,
        additional_contribution INTEGER DEFAULT 0,

        joined_at TIMESTAMPTZ DEFAULT NOW(),
        last_updated_at TIMESTAMPTZ DEFAULT NOW(),

        PRIMARY KEY (challenge_id, user_id)
      )
    `);

    await db.query('CREATE INDEX idx_challenge_participants_rank ON hangout_challenge_participants(challenge_id, current_value DESC)');
  }

  // ============================================
  // CHALLENGE PRIZES
  // ============================================
  if (!(await tableExists('hangout_challenge_prizes'))) {
    log.info('Creating hangout_challenge_prizes table...');
    await db.query(`
      CREATE TABLE hangout_challenge_prizes (
        challenge_id TEXT NOT NULL REFERENCES hangout_challenges(id) ON DELETE CASCADE,
        place INTEGER NOT NULL,

        prize_amount INTEGER NOT NULL,
        prize_percent DECIMAL(5, 2),

        winner_id TEXT REFERENCES users(id),
        paid_at TIMESTAMPTZ,

        PRIMARY KEY (challenge_id, place)
      )
    `);
  }

  // ============================================
  // HANGOUT BULLETIN BOARD
  // ============================================
  if (!(await tableExists('hangout_bulletin_posts'))) {
    log.info('Creating hangout_bulletin_posts table...');
    await db.query(`
      CREATE TABLE hangout_bulletin_posts (
        id TEXT PRIMARY KEY DEFAULT 'hbp_' || replace(gen_random_uuid()::text, '-', ''),
        hangout_id TEXT NOT NULL REFERENCES geo_hangouts(id) ON DELETE CASCADE,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,

        content TEXT NOT NULL,

        -- Pinning (costs credits)
        is_pinned BOOLEAN DEFAULT false,
        pinned_until TIMESTAMPTZ,
        pin_cost_paid INTEGER DEFAULT 0,

        -- Engagement
        likes_count INTEGER DEFAULT 0,
        comments_count INTEGER DEFAULT 0,

        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    await db.query('CREATE INDEX idx_bulletin_posts_hangout ON hangout_bulletin_posts(hangout_id, created_at DESC)');
    await db.query('CREATE INDEX idx_bulletin_posts_pinned ON hangout_bulletin_posts(hangout_id, pinned_until DESC) WHERE is_pinned = true');
  }

  // ============================================
  // HANGOUT EVENTS (meetups, group workouts)
  // ============================================
  if (!(await tableExists('hangout_events'))) {
    log.info('Creating hangout_events table...');
    await db.query(`
      CREATE TABLE hangout_events (
        id TEXT PRIMARY KEY DEFAULT 'he_' || replace(gen_random_uuid()::text, '-', ''),
        hangout_id TEXT NOT NULL REFERENCES geo_hangouts(id) ON DELETE CASCADE,
        created_by TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,

        title VARCHAR(255) NOT NULL,
        description TEXT,

        -- Schedule
        starts_at TIMESTAMPTZ NOT NULL,
        ends_at TIMESTAMPTZ,

        -- Location
        location_type VARCHAR(20) NOT NULL CHECK (location_type IN ('in_person', 'virtual', 'hybrid')),
        location_name VARCHAR(255),
        location_address TEXT,
        location_latitude DECIMAL(10, 8),
        location_longitude DECIMAL(11, 8),

        -- Capacity
        max_attendees INTEGER,
        attendees_count INTEGER DEFAULT 0,

        -- Featured (costs credits)
        is_featured BOOLEAN DEFAULT false,
        featured_until TIMESTAMPTZ,
        feature_cost_paid INTEGER DEFAULT 0,

        -- Status
        status VARCHAR(20) DEFAULT 'scheduled' CHECK (status IN ('draft', 'scheduled', 'in_progress', 'completed', 'cancelled')),

        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    await db.query('CREATE INDEX idx_hangout_events_hangout ON hangout_events(hangout_id, starts_at)');
    await db.query('CREATE INDEX idx_hangout_events_upcoming ON hangout_events(starts_at) WHERE status = \'scheduled\'');
  }

  // ============================================
  // HANGOUT EVENT ATTENDEES
  // ============================================
  if (!(await tableExists('hangout_event_attendees'))) {
    log.info('Creating hangout_event_attendees table...');
    await db.query(`
      CREATE TABLE hangout_event_attendees (
        event_id TEXT NOT NULL REFERENCES hangout_events(id) ON DELETE CASCADE,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,

        status VARCHAR(20) DEFAULT 'going' CHECK (status IN ('going', 'maybe', 'not_going')),

        joined_at TIMESTAMPTZ DEFAULT NOW(),

        PRIMARY KEY (event_id, user_id)
      )
    `);
  }

  // ============================================
  // SOCIAL SPENDING: TIPS
  // ============================================
  if (!(await tableExists('user_tips'))) {
    log.info('Creating user_tips table...');
    await db.query(`
      CREATE TABLE user_tips (
        id TEXT PRIMARY KEY DEFAULT 'tip_' || replace(gen_random_uuid()::text, '-', ''),
        sender_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        recipient_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,

        amount INTEGER NOT NULL CHECK (amount > 0),
        message VARCHAR(500),

        -- Source (what prompted the tip)
        source_type VARCHAR(50),
        source_id TEXT,

        -- Transaction references
        sender_ledger_id TEXT,
        recipient_ledger_id TEXT,

        created_at TIMESTAMPTZ DEFAULT NOW(),

        CHECK (sender_id != recipient_id)
      )
    `);

    await db.query('CREATE INDEX idx_user_tips_sender ON user_tips(sender_id, created_at DESC)');
    await db.query('CREATE INDEX idx_user_tips_recipient ON user_tips(recipient_id, created_at DESC)');
  }

  // ============================================
  // SOCIAL SPENDING: GIFTS
  // ============================================
  if (!(await tableExists('user_gifts'))) {
    log.info('Creating user_gifts table...');
    await db.query(`
      CREATE TABLE user_gifts (
        id TEXT PRIMARY KEY DEFAULT 'gift_' || replace(gen_random_uuid()::text, '-', ''),
        sender_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        recipient_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,

        item_sku TEXT NOT NULL REFERENCES store_items(sku),
        message VARCHAR(500),

        -- Cost (item price + 10% gift fee)
        total_cost INTEGER NOT NULL,

        -- Transaction reference
        ledger_id TEXT,

        -- Status
        status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'expired')),
        accepted_at TIMESTAMPTZ,

        created_at TIMESTAMPTZ DEFAULT NOW(),
        expires_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '7 days',

        CHECK (sender_id != recipient_id)
      )
    `);

    await db.query('CREATE INDEX idx_user_gifts_recipient_pending ON user_gifts(recipient_id, created_at DESC) WHERE status = \'pending\'');
  }

  // ============================================
  // SOCIAL SPENDING: SUPER HIGH FIVES
  // ============================================
  if (!(await tableExists('super_high_fives'))) {
    log.info('Creating super_high_fives table...');
    await db.query(`
      CREATE TABLE super_high_fives (
        id TEXT PRIMARY KEY DEFAULT 'shf_' || replace(gen_random_uuid()::text, '-', ''),
        sender_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        recipient_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,

        -- Type (determines cost and effect)
        type VARCHAR(20) NOT NULL CHECK (type IN ('super', 'mega', 'standing_ovation')),
        cost INTEGER NOT NULL,

        -- Source
        source_type VARCHAR(50),
        source_id TEXT,

        message VARCHAR(255),

        -- Transaction reference
        ledger_id TEXT,

        created_at TIMESTAMPTZ DEFAULT NOW(),

        CHECK (sender_id != recipient_id)
      )
    `);

    await db.query('CREATE INDEX idx_super_high_fives_recipient ON super_high_fives(recipient_id, created_at DESC)');
  }

  // ============================================
  // POST BOOSTS
  // ============================================
  if (!(await tableExists('post_boosts'))) {
    log.info('Creating post_boosts table...');
    await db.query(`
      CREATE TABLE post_boosts (
        id TEXT PRIMARY KEY DEFAULT 'boost_' || replace(gen_random_uuid()::text, '-', ''),
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,

        -- Target (feed post, workout, etc.)
        target_type VARCHAR(50) NOT NULL,
        target_id TEXT NOT NULL,

        -- Boost details
        cost INTEGER NOT NULL,
        boost_multiplier DECIMAL(3, 1) DEFAULT 2.0,

        -- Duration
        starts_at TIMESTAMPTZ DEFAULT NOW(),
        ends_at TIMESTAMPTZ NOT NULL,

        -- Stats
        impressions_gained INTEGER DEFAULT 0,

        -- Transaction reference
        ledger_id TEXT,

        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    await db.query('CREATE INDEX idx_post_boosts_active ON post_boosts(target_type, target_id, ends_at) WHERE ends_at > NOW()');
  }

  // ============================================
  // PROFILE CUSTOMIZATION
  // ============================================
  if (await tableExists('users')) {
    // Add profile customization columns if not exist
    if (!(await columnExists('users', 'profile_frame'))) {
      log.info('Adding profile customization columns to users...');
      await db.query('ALTER TABLE users ADD COLUMN profile_frame TEXT');
      await db.query('ALTER TABLE users ADD COLUMN profile_badge_effect TEXT');
      await db.query('ALTER TABLE users ADD COLUMN profile_theme TEXT');
      await db.query('ALTER TABLE users ADD COLUMN profile_banner_color VARCHAR(20)');
      await db.query('ALTER TABLE users ADD COLUMN profile_accent_color VARCHAR(20)');
      await db.query('ALTER TABLE users ADD COLUMN custom_title VARCHAR(100)');
      await db.query('ALTER TABLE users ADD COLUMN show_wealth_tier BOOLEAN DEFAULT true');
    }
  }

  // ============================================
  // ENHANCED PURCHASES TABLE
  // ============================================
  if (await tableExists('purchases')) {
    if (!(await columnExists('purchases', 'package_id'))) {
      log.info('Adding package_id to purchases...');
      await db.query('ALTER TABLE purchases ADD COLUMN package_id TEXT REFERENCES credit_packages(id)');
      await db.query('ALTER TABLE purchases ADD COLUMN payment_method VARCHAR(50)');
      await db.query('ALTER TABLE purchases ADD COLUMN payment_provider VARCHAR(50)');
      await db.query('ALTER TABLE purchases ADD COLUMN bonus_credits INTEGER DEFAULT 0');
    }
  }

  // ============================================
  // ADD NEW EARNING RULES
  // ============================================
  log.info('Adding new earning rules...');
  const newEarningRules = [
    // Per-rep/set earnings (micro-rewards)
    { code: 'rep_complete', name: 'Rep Completed', category: 'workout', credits: 0, xp: 0, description: 'Each rep completed (0.1 credit via aggregate)' },
    { code: 'set_complete', name: 'Set Completed', category: 'workout', credits: 1, xp: 2, description: 'Each set completed' },
    { code: 'new_exercise', name: 'New Exercise Tried', category: 'workout', credits: 5, xp: 10, maxDay: 5, description: 'Try a new exercise' },

    // Volume bonuses
    { code: 'volume_5000', name: 'Volume Bonus (5000 TU)', category: 'workout', credits: 25, xp: 50, maxDay: 1, description: 'Hit 5000+ TU in a workout' },
    { code: 'volume_10000', name: 'Volume Bonus (10000 TU)', category: 'workout', credits: 50, xp: 100, maxDay: 1, description: 'Hit 10000+ TU in a workout' },

    // Goal progress milestones
    { code: 'goal_25_percent', name: 'Goal 25% Progress', category: 'goal', credits: 25, xp: 50, description: 'Reach 25% of a goal' },
    { code: 'goal_50_percent', name: 'Goal 50% Progress', category: 'goal', credits: 50, xp: 100, description: 'Reach 50% of a goal' },
    { code: 'goal_75_percent', name: 'Goal 75% Progress', category: 'goal', credits: 75, xp: 150, description: 'Reach 75% of a goal' },

    // Social micro-rewards
    { code: 'high_five_give', name: 'Give High Five', category: 'social', credits: 1, xp: 2, maxDay: 50, description: 'Give someone a high five' },
    { code: 'high_five_receive', name: 'Receive High Five', category: 'social', credits: 2, xp: 4, description: 'Receive a high five' },
    { code: 'post_to_feed', name: 'Post to Feed', category: 'social', credits: 3, xp: 5, maxDay: 10, description: 'Share to activity feed' },
    { code: 'receive_comment', name: 'Receive Comment', category: 'social', credits: 2, xp: 4, description: 'Get a comment on your post' },
    { code: 'receive_like', name: 'Receive Like/Prop', category: 'social', credits: 1, xp: 2, description: 'Get a like or prop' },
    { code: 'answer_question', name: 'Answer Question', category: 'social', credits: 10, xp: 20, maxDay: 10, description: 'Answer a community question' },
    { code: 'helpful_answer', name: 'Helpful Answer', category: 'social', credits: 25, xp: 50, description: 'Answer marked as helpful' },

    // Hangout rewards
    { code: 'hangout_event_create', name: 'Create Hangout Event', category: 'social', credits: 25, xp: 50, maxDay: 2, description: 'Create a hangout event' },
    { code: 'hangout_event_host', name: 'Host Hangout Event', category: 'social', credits: 100, xp: 200, maxDay: 2, description: 'Successfully host an event' },
    { code: 'hangout_challenge_win', name: 'Win Hangout Challenge', category: 'leaderboard', credits: 200, xp: 400, description: 'Win a local challenge' },

    // Referral rewards
    { code: 'referral_signup', name: 'Referral Sign Up', category: 'special', credits: 500, xp: 1000, description: 'Referred user creates account' },
    { code: 'referral_level5', name: 'Referral Reaches Level 5', category: 'special', credits: 500, xp: 1000, description: 'Referred user hits level 5' },

    // Time-based bonuses
    { code: 'daily_login', name: 'Daily Login', category: 'special', credits: 5, xp: 10, maxDay: 1, description: 'First login of the day' },
    { code: 'early_bird_workout', name: 'Early Bird Workout', category: 'special', credits: 15, xp: 30, maxDay: 1, description: 'Workout before 6 AM' },
    { code: 'night_owl_workout', name: 'Night Owl Workout', category: 'special', credits: 15, xp: 30, maxDay: 1, description: 'Workout after 10 PM' },
    { code: 'weekend_workout', name: 'Weekend Workout', category: 'special', credits: 10, xp: 20, maxDay: 2, description: 'Workout on weekend' },
    { code: 'comeback_bonus', name: 'Comeback Bonus', category: 'special', credits: 50, xp: 100, maxDay: 1, cooldown: 4320, description: 'Return after 3+ days away' },

    // Archetype & journey
    { code: 'archetype_level_up', name: 'Archetype Level Up', category: 'goal', credits: 100, xp: 200, description: 'Advance archetype level' },
    { code: 'set_primary_goal', name: 'Set Primary Goal', category: 'goal', credits: 10, xp: 20, description: 'Set a new primary goal' },

    // Enhanced streaks
    { code: 'streak_60', name: '60-Day Streak', category: 'streak', credits: 1000, xp: 2000, description: 'Maintain 60-day streak' },
    { code: 'streak_180', name: '180-Day Streak', category: 'streak', credits: 3000, xp: 6000, description: 'Maintain 180-day streak' },
  ];

  for (const rule of newEarningRules) {
    await db.query(
      `INSERT INTO earning_rules (code, name, category, credits_base, xp_base, max_per_day, cooldown_minutes, description)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT (code) DO UPDATE SET
         credits_base = EXCLUDED.credits_base,
         xp_base = EXCLUDED.xp_base,
         max_per_day = EXCLUDED.max_per_day,
         cooldown_minutes = EXCLUDED.cooldown_minutes,
         description = EXCLUDED.description,
         updated_at = NOW()`,
      [rule.code, rule.name, rule.category, rule.credits, rule.xp, rule.maxDay || null, rule.cooldown || null, rule.description]
    );
  }

  // ============================================
  // ADD MORE STORE ITEMS
  // ============================================
  log.info('Adding new store items...');
  const newStoreItems = [
    // Profile Frames
    { sku: 'frame_animated_fire', name: 'Animated Fire Frame', category: 'cosmetic_frame', price: 1500, rarity: 'rare', description: 'Burning flame effect around your profile' },
    { sku: 'frame_animated_lightning', name: 'Animated Lightning Frame', category: 'cosmetic_frame', price: 1500, rarity: 'rare', description: 'Electric crackling effect' },
    { sku: 'frame_animated_water', name: 'Animated Water Frame', category: 'cosmetic_frame', price: 1500, rarity: 'rare', description: 'Flowing water effect' },
    { sku: 'frame_holographic', name: 'Holographic Frame', category: 'cosmetic_frame', price: 3000, rarity: 'epic', description: 'Rainbow shimmer effect' },
    { sku: 'frame_obsidian', name: 'Obsidian Frame', category: 'cosmetic_frame', price: 5000, rarity: 'legendary', description: 'Dark mysterious aura' },

    // Badges & Flair
    { sku: 'badge_verified_athlete', name: 'Verified Athlete', category: 'cosmetic_badge', price: 1000, rarity: 'rare', description: 'Blue checkmark for verified athletes' },
    { sku: 'badge_community_hero', name: 'Community Hero', category: 'cosmetic_badge', price: 1000, rarity: 'rare', description: 'For helping many users' },
    { sku: 'badge_streak_master', name: 'Streak Master', category: 'cosmetic_badge', price: 750, rarity: 'uncommon', description: 'For 100+ day streaks' },
    { sku: 'badge_volume_king', name: 'Volume King/Queen', category: 'cosmetic_badge', price: 1000, rarity: 'rare', description: 'Top 1% total volume' },
    { sku: 'badge_iron_will', name: 'Iron Will', category: 'cosmetic_badge', price: 500, rarity: 'uncommon', description: 'Never missed a Monday' },

    // Utility Items
    { sku: 'utility_streak_freeze', name: 'Streak Freeze', category: 'utility_support', price: 50, rarity: 'common', description: 'Protect your streak for 1 day' },
    { sku: 'utility_double_xp', name: 'Double XP Boost', category: 'utility_analytics', price: 100, rarity: 'uncommon', description: '2x buddy XP for 24 hours' },
    { sku: 'utility_credit_boost', name: 'Credit Boost', category: 'utility_analytics', price: 200, rarity: 'rare', description: '1.5x credit earnings for 24 hours' },
    { sku: 'utility_visibility_boost', name: 'Visibility Boost', category: 'utility_support', price: 150, rarity: 'uncommon', description: 'Appear higher in searches for 7 days' },

    // Social Power Items
    { sku: 'social_super_high_five', name: 'Super High Five', category: 'community_shoutout', price: 5, rarity: 'common', description: 'Larger animation, notifies user' },
    { sku: 'social_mega_high_five', name: 'Mega High Five', category: 'community_shoutout', price: 25, rarity: 'uncommon', description: 'Huge animation, public feed mention' },
    { sku: 'social_standing_ovation', name: 'Standing Ovation', category: 'community_shoutout', price: 100, rarity: 'rare', description: 'Spectacular effect, achievement' },
    { sku: 'social_golden_props', name: 'Golden Props', category: 'community_tip', price: 10, rarity: 'common', description: 'Special gold like icon' },
    { sku: 'social_fire_props', name: 'Fire Props', category: 'community_tip', price: 10, rarity: 'common', description: 'Fire effect on post' },
    { sku: 'social_post_boost_basic', name: 'Post Boost (24h)', category: 'community_boost', price: 100, rarity: 'uncommon', description: 'Promote post in feed for 24 hours' },
    { sku: 'social_post_boost_week', name: 'Post Boost (7 days)', category: 'community_boost', price: 500, rarity: 'rare', description: 'Promote post in feed for 7 days' },

    // Hangout Items
    { sku: 'hangout_pin_post_24h', name: 'Pin Post (24h)', category: 'community_shoutout', price: 50, rarity: 'common', description: 'Pin a bulletin post for 24 hours' },
    { sku: 'hangout_pin_post_week', name: 'Pin Post (7 days)', category: 'community_shoutout', price: 250, rarity: 'uncommon', description: 'Pin a bulletin post for 7 days' },
    { sku: 'hangout_feature_event', name: 'Feature Event', category: 'community_boost', price: 100, rarity: 'uncommon', description: 'Feature your event in hangout' },
    { sku: 'hangout_vip_badge', name: 'Hangout VIP Badge', category: 'cosmetic_badge', price: 750, rarity: 'rare', description: 'Stand out in member list' },

    // Prestige Items
    { sku: 'prestige_diamond_name', name: 'Diamond Name', category: 'prestige_title', price: 5000, rarity: 'legendary', description: 'Name sparkles in chat' },
    { sku: 'prestige_obsidian_aura', name: 'Obsidian Aura', category: 'prestige_title', price: 10000, rarity: 'legendary', description: 'Dark aura on profile' },
    { sku: 'prestige_crown_badge', name: 'Crown Badge', category: 'prestige_title', price: 25000, rarity: 'legendary', description: 'Crown icon by name' },
    { sku: 'prestige_legend_status', name: 'Legend Status', category: 'prestige_title', price: 50000, rarity: 'legendary', description: 'Legend title, unique perks' },
    { sku: 'prestige_custom_emoji', name: 'Custom Emoji', category: 'prestige_hall_of_fame', price: 50000, rarity: 'legendary', description: 'Personal emoji in hangouts' },
  ];

  for (const item of newStoreItems) {
    await db.query(
      `INSERT INTO store_items (sku, name, description, category, price_credits, rarity)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (sku) DO UPDATE SET
         name = EXCLUDED.name,
         description = EXCLUDED.description,
         price_credits = EXCLUDED.price_credits,
         rarity = EXCLUDED.rarity,
         updated_at = NOW()`,
      [item.sku, item.name, item.description || '', item.category, item.price, item.rarity]
    );
  }

  // ============================================
  // CREATE VIEWS FOR CONVENIENCE
  // ============================================
  log.info('Creating convenience views...');

  // User credit summary view
  await db.query(`
    CREATE OR REPLACE VIEW user_credit_summary AS
    SELECT
      u.id AS user_id,
      u.username,
      COALESCE(cb.balance, 0) AS balance,
      COALESCE(cb.lifetime_earned, 0) AS lifetime_earned,
      COALESCE(cb.lifetime_spent, 0) AS lifetime_spent,
      u.wealth_tier,
      COALESCE(today.earned_today, 0) AS earned_today,
      COALESCE(week.earned_this_week, 0) AS earned_this_week
    FROM users u
    LEFT JOIN credit_balances cb ON cb.user_id = u.id
    LEFT JOIN LATERAL (
      SELECT SUM(amount) AS earned_today
      FROM credit_ledger cl
      WHERE cl.user_id = u.id
        AND cl.amount > 0
        AND cl.created_at >= CURRENT_DATE
    ) today ON true
    LEFT JOIN LATERAL (
      SELECT SUM(amount) AS earned_this_week
      FROM credit_ledger cl
      WHERE cl.user_id = u.id
        AND cl.amount > 0
        AND cl.created_at >= DATE_TRUNC('week', CURRENT_DATE)
    ) week ON true
  `);

  // Hangout members with distance view
  await db.query(`
    CREATE OR REPLACE VIEW hangout_members_with_distance AS
    SELECT
      uhm.hangout_id,
      uhm.user_id,
      u.username,
      u.display_name,
      u.wealth_tier,
      ul.city,
      uhm.distance_miles,
      uhm.is_primary,
      CASE
        WHEN uhm.distance_miles < 5 THEN 'neighbor'
        WHEN uhm.distance_miles < 15 THEN 'local'
        WHEN uhm.distance_miles < 50 THEN 'regional'
        ELSE 'extended'
      END AS distance_tier
    FROM user_hangout_memberships uhm
    JOIN users u ON u.id = uhm.user_id
    LEFT JOIN user_locations ul ON ul.user_id = uhm.user_id
    ORDER BY uhm.distance_miles ASC
  `);

  // ============================================
  // ANALYZE NEW TABLES
  // ============================================
  log.info('Analyzing new tables...');
  const newTables = [
    'user_locations',
    'geo_hangouts',
    'user_hangout_memberships',
    'credit_packages',
    'store_categories',
    'credit_earn_events',
    'bonus_event_types',
    'user_bonus_events',
    'hangout_challenges',
    'hangout_challenge_participants',
    'hangout_challenge_prizes',
    'hangout_bulletin_posts',
    'hangout_events',
    'hangout_event_attendees',
    'user_tips',
    'user_gifts',
    'super_high_fives',
    'post_boosts',
  ];

  for (const table of newTables) {
    if (await tableExists(table)) {
      try {
        await db.query(`ANALYZE ${table}`);
      } catch {
        log.debug(`Could not analyze ${table}`);
      }
    }
  }

  log.info('Migration 069_economy_enhancements complete');
}

export async function down(): Promise<void> {
  log.info('Rolling back migration: 069_economy_enhancements');

  // Drop views
  await db.query('DROP VIEW IF EXISTS hangout_members_with_distance');
  await db.query('DROP VIEW IF EXISTS user_credit_summary');

  // Drop tables in reverse dependency order
  const tables = [
    'post_boosts',
    'super_high_fives',
    'user_gifts',
    'user_tips',
    'hangout_event_attendees',
    'hangout_events',
    'hangout_bulletin_posts',
    'hangout_challenge_prizes',
    'hangout_challenge_participants',
    'hangout_challenges',
    'user_bonus_events',
    'bonus_event_types',
    'credit_earn_events',
    'store_categories',
    'credit_packages',
    'user_hangout_memberships',
    'geo_hangouts',
    'user_locations',
  ];

  for (const table of tables) {
    await db.query(`DROP TABLE IF EXISTS ${table} CASCADE`);
  }

  // Remove columns added to existing tables
  if (await columnExists('users', 'profile_frame')) {
    await db.query('ALTER TABLE users DROP COLUMN IF EXISTS profile_frame');
    await db.query('ALTER TABLE users DROP COLUMN IF EXISTS profile_badge_effect');
    await db.query('ALTER TABLE users DROP COLUMN IF EXISTS profile_theme');
    await db.query('ALTER TABLE users DROP COLUMN IF EXISTS profile_banner_color');
    await db.query('ALTER TABLE users DROP COLUMN IF EXISTS profile_accent_color');
    await db.query('ALTER TABLE users DROP COLUMN IF EXISTS custom_title');
    await db.query('ALTER TABLE users DROP COLUMN IF EXISTS show_wealth_tier');
  }

  if (await columnExists('purchases', 'package_id')) {
    await db.query('ALTER TABLE purchases DROP COLUMN IF EXISTS package_id');
    await db.query('ALTER TABLE purchases DROP COLUMN IF EXISTS payment_method');
    await db.query('ALTER TABLE purchases DROP COLUMN IF EXISTS payment_provider');
    await db.query('ALTER TABLE purchases DROP COLUMN IF EXISTS bonus_credits');
  }

  if (await columnExists('store_items', 'category_id')) {
    await db.query('ALTER TABLE store_items DROP COLUMN IF EXISTS category_id');
    await db.query('ALTER TABLE store_items DROP COLUMN IF EXISTS preview_url');
    await db.query('ALTER TABLE store_items DROP COLUMN IF EXISTS animation_type');
    await db.query('ALTER TABLE store_items DROP COLUMN IF EXISTS duration_days');
    await db.query('ALTER TABLE store_items DROP COLUMN IF EXISTS stackable');
    await db.query('ALTER TABLE store_items DROP COLUMN IF EXISTS max_quantity');
    await db.query('ALTER TABLE store_items DROP COLUMN IF EXISTS sale_price_credits');
    await db.query('ALTER TABLE store_items DROP COLUMN IF EXISTS sale_ends_at');
  }

  // Delete new earning rules
  const newRuleCodes = [
    'rep_complete', 'set_complete', 'new_exercise',
    'volume_5000', 'volume_10000',
    'goal_25_percent', 'goal_50_percent', 'goal_75_percent',
    'high_five_give', 'high_five_receive', 'post_to_feed', 'receive_comment', 'receive_like',
    'answer_question', 'helpful_answer',
    'hangout_event_create', 'hangout_event_host', 'hangout_challenge_win',
    'referral_signup', 'referral_level5',
    'daily_login', 'early_bird_workout', 'night_owl_workout', 'weekend_workout', 'comeback_bonus',
    'archetype_level_up', 'set_primary_goal',
    'streak_60', 'streak_180',
  ];

  if (newRuleCodes.length > 0) {
    const placeholders = newRuleCodes.map((_, i) => `$${i + 1}`).join(',');
    await db.query(`DELETE FROM earning_rules WHERE code IN (${placeholders})`, newRuleCodes);
  }

  // Delete new store items
  const newItemSkus = [
    'frame_animated_fire', 'frame_animated_lightning', 'frame_animated_water', 'frame_holographic', 'frame_obsidian',
    'badge_verified_athlete', 'badge_community_hero', 'badge_streak_master', 'badge_volume_king', 'badge_iron_will',
    'utility_streak_freeze', 'utility_double_xp', 'utility_credit_boost', 'utility_visibility_boost',
    'social_super_high_five', 'social_mega_high_five', 'social_standing_ovation', 'social_golden_props', 'social_fire_props',
    'social_post_boost_basic', 'social_post_boost_week',
    'hangout_pin_post_24h', 'hangout_pin_post_week', 'hangout_feature_event', 'hangout_vip_badge',
    'prestige_diamond_name', 'prestige_obsidian_aura', 'prestige_crown_badge', 'prestige_legend_status', 'prestige_custom_emoji',
  ];

  if (newItemSkus.length > 0) {
    const placeholders = newItemSkus.map((_, i) => `$${i + 1}`).join(',');
    await db.query(`DELETE FROM store_items WHERE sku IN (${placeholders})`, newItemSkus);
  }

  log.info('Rollback 069_economy_enhancements complete');
}

export const migrate = up;
