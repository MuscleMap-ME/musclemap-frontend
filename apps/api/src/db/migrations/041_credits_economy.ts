/**
 * Migration: Credits Economy System
 *
 * Comprehensive credits economy with:
 * 1. Enhanced wallet with P2P transfers
 * 2. Training Buddy/Companion system with evolution
 * 3. Store items with cosmetics and upgrades
 * 4. User inventory
 * 5. Trainer profiles and classes
 * 6. Class enrollments and attendance
 * 7. Earning rules and award history
 * 8. Anti-abuse controls (rate limits, fraud flags, admin audit)
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

export async function up(): Promise<void> {
  log.info('Running migration: 041_credits_economy');

  // ============================================
  // ENHANCED CREDIT BALANCES (add transfer tracking)
  // ============================================
  if (await tableExists('credit_balances')) {
    if (!(await columnExists('credit_balances', 'total_transferred_out'))) {
      log.info('Adding transfer tracking columns to credit_balances...');
      await db.query('ALTER TABLE credit_balances ADD COLUMN total_transferred_out INTEGER DEFAULT 0');
      await db.query('ALTER TABLE credit_balances ADD COLUMN total_transferred_in INTEGER DEFAULT 0');
      await db.query('ALTER TABLE credit_balances ADD COLUMN status TEXT DEFAULT \'active\' CHECK (status IN (\'active\', \'frozen\', \'suspended\'))');
      await db.query('ALTER TABLE credit_balances ADD COLUMN frozen_at TIMESTAMPTZ');
      await db.query('ALTER TABLE credit_balances ADD COLUMN frozen_reason TEXT');
    }
  }

  // ============================================
  // CREDIT TRANSFERS (P2P transfers)
  // ============================================
  if (!(await tableExists('credit_transfers'))) {
    log.info('Creating credit_transfers table...');
    await db.query(`
      CREATE TABLE credit_transfers (
        id TEXT PRIMARY KEY DEFAULT 'xfer_' || replace(gen_random_uuid()::text, '-', ''),
        sender_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        recipient_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        amount INTEGER NOT NULL CHECK (amount > 0),
        note TEXT,
        sender_ledger_id TEXT,
        recipient_ledger_id TEXT,
        status TEXT DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'reversed', 'failed')),
        reversed_at TIMESTAMPTZ,
        reversed_by TEXT REFERENCES users(id),
        reverse_reason TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        CHECK (sender_id != recipient_id)
      )
    `);

    await db.query('CREATE INDEX idx_transfers_sender ON credit_transfers(sender_id, created_at DESC)');
    await db.query('CREATE INDEX idx_transfers_recipient ON credit_transfers(recipient_id, created_at DESC)');
    await db.query('CREATE INDEX idx_transfers_status ON credit_transfers(status, created_at DESC)');
  }

  // ============================================
  // EARNING RULES (configurable credit awards)
  // ============================================
  if (!(await tableExists('earning_rules'))) {
    log.info('Creating earning_rules table...');
    await db.query(`
      CREATE TABLE earning_rules (
        code TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        category TEXT NOT NULL CHECK (category IN ('workout', 'streak', 'pr', 'goal', 'leaderboard', 'trainer', 'social', 'special')),
        credits_base INTEGER NOT NULL DEFAULT 0,
        credits_formula TEXT,
        xp_base INTEGER NOT NULL DEFAULT 0,
        xp_formula TEXT,
        max_per_day INTEGER,
        max_per_week INTEGER,
        cooldown_minutes INTEGER,
        enabled BOOLEAN DEFAULT TRUE,
        metadata JSONB DEFAULT '{}',
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    // Seed earning rules
    log.info('Seeding earning rules...');
    const earningRules = [
      // Workout earnings
      { code: 'workout_complete', name: 'Workout Complete', category: 'workout', credits_base: 5, xp_base: 10, max_per_day: 10, description: 'Complete a workout (base + duration bonus)' },
      { code: 'workout_volume_bonus', name: 'Volume Bonus', category: 'workout', credits_base: 10, xp_base: 20, max_per_day: 5, description: 'Hit 5000+ total volume in a workout' },
      // Streak earnings
      { code: 'streak_3', name: '3-Day Streak', category: 'streak', credits_base: 15, xp_base: 30 },
      { code: 'streak_7', name: '7-Day Streak', category: 'streak', credits_base: 50, xp_base: 100 },
      { code: 'streak_14', name: '14-Day Streak', category: 'streak', credits_base: 100, xp_base: 200 },
      { code: 'streak_30', name: '30-Day Streak', category: 'streak', credits_base: 250, xp_base: 500 },
      { code: 'streak_100', name: '100-Day Streak', category: 'streak', credits_base: 1000, xp_base: 2000 },
      { code: 'streak_365', name: '365-Day Streak', category: 'streak', credits_base: 5000, xp_base: 10000 },
      // PR earnings
      { code: 'pr_set', name: 'Personal Record', category: 'pr', credits_base: 50, xp_base: 100, cooldown_minutes: 1440, description: 'Set a new personal record' },
      // Goal earnings
      { code: 'goal_complete_easy', name: 'Easy Goal Complete', category: 'goal', credits_base: 50, xp_base: 100 },
      { code: 'goal_complete_medium', name: 'Medium Goal Complete', category: 'goal', credits_base: 100, xp_base: 200 },
      { code: 'goal_complete_hard', name: 'Hard Goal Complete', category: 'goal', credits_base: 200, xp_base: 400 },
      // Leaderboard earnings
      { code: 'leaderboard_1st', name: 'Leaderboard 1st', category: 'leaderboard', credits_base: 500, xp_base: 1000 },
      { code: 'leaderboard_2nd', name: 'Leaderboard 2nd', category: 'leaderboard', credits_base: 300, xp_base: 600 },
      { code: 'leaderboard_3rd', name: 'Leaderboard 3rd', category: 'leaderboard', credits_base: 200, xp_base: 400 },
      { code: 'leaderboard_top10', name: 'Leaderboard Top 10', category: 'leaderboard', credits_base: 100, xp_base: 200 },
      // Trainer earnings
      { code: 'trainer_class_wage', name: 'Class Wage', category: 'trainer', credits_base: 0, xp_base: 50, description: 'Credits per attendee (configurable)' },
      // Social earnings
      { code: 'first_hangout_join', name: 'First Hangout', category: 'social', credits_base: 25, xp_base: 50 },
      { code: 'referral_bonus', name: 'Referral Bonus', category: 'social', credits_base: 100, xp_base: 100 },
    ];

    for (const rule of earningRules) {
      await db.query(
        `INSERT INTO earning_rules (code, name, category, credits_base, xp_base, max_per_day, max_per_week, cooldown_minutes, description)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         ON CONFLICT (code) DO NOTHING`,
        [rule.code, rule.name, rule.category, rule.credits_base, rule.xp_base, rule.max_per_day || null, null, rule.cooldown_minutes || null, rule.description || null]
      );
    }
  }

  // ============================================
  // EARNING AWARDS (history of credit awards)
  // ============================================
  if (!(await tableExists('earning_awards'))) {
    log.info('Creating earning_awards table...');
    await db.query(`
      CREATE TABLE earning_awards (
        id TEXT PRIMARY KEY DEFAULT 'award_' || replace(gen_random_uuid()::text, '-', ''),
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        rule_code TEXT NOT NULL REFERENCES earning_rules(code),
        source_type TEXT NOT NULL,
        source_id TEXT NOT NULL,
        credits_awarded INTEGER NOT NULL DEFAULT 0,
        xp_awarded INTEGER NOT NULL DEFAULT 0,
        ledger_entry_id TEXT,
        idempotency_key TEXT UNIQUE NOT NULL,
        metadata JSONB DEFAULT '{}',
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    await db.query('CREATE INDEX idx_awards_user ON earning_awards(user_id, created_at DESC)');
    await db.query('CREATE INDEX idx_awards_rule ON earning_awards(rule_code, created_at DESC)');
    await db.query('CREATE INDEX idx_awards_source ON earning_awards(source_type, source_id)');
  }

  // ============================================
  // TRAINING BUDDY / COMPANION
  // ============================================
  if (!(await tableExists('training_buddies'))) {
    log.info('Creating training_buddies table...');
    await db.query(`
      CREATE TABLE training_buddies (
        user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
        species TEXT NOT NULL DEFAULT 'wolf' CHECK (species IN (
          'wolf', 'bear', 'eagle', 'phoenix', 'dragon', 'tiger', 'ox', 'shark'
        )),
        nickname TEXT,
        level INTEGER NOT NULL DEFAULT 1 CHECK (level >= 1 AND level <= 100),
        xp INTEGER NOT NULL DEFAULT 0,
        xp_to_next_level INTEGER NOT NULL DEFAULT 100,
        stage INTEGER NOT NULL DEFAULT 1 CHECK (stage >= 1 AND stage <= 6),

        -- Equipped cosmetics
        equipped_aura TEXT,
        equipped_armor TEXT,
        equipped_wings TEXT,
        equipped_tool TEXT,
        equipped_skin TEXT,
        equipped_emote_pack TEXT,
        equipped_voice_pack TEXT,

        -- Unlocked abilities
        unlocked_abilities JSONB DEFAULT '[]',

        -- Display settings
        visible BOOLEAN DEFAULT TRUE,
        show_on_profile BOOLEAN DEFAULT TRUE,
        show_in_workouts BOOLEAN DEFAULT TRUE,

        -- Stats
        total_xp_earned INTEGER DEFAULT 0,
        workouts_together INTEGER DEFAULT 0,
        streaks_witnessed INTEGER DEFAULT 0,
        prs_celebrated INTEGER DEFAULT 0,

        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    await db.query('CREATE INDEX idx_buddies_species ON training_buddies(species)');
    await db.query('CREATE INDEX idx_buddies_level ON training_buddies(level DESC)');
  }

  // ============================================
  // BUDDY EVOLUTION THRESHOLDS
  // ============================================
  if (!(await tableExists('buddy_evolution_thresholds'))) {
    log.info('Creating buddy_evolution_thresholds table...');
    await db.query(`
      CREATE TABLE buddy_evolution_thresholds (
        species TEXT NOT NULL,
        stage INTEGER NOT NULL CHECK (stage >= 1 AND stage <= 6),
        min_level INTEGER NOT NULL,
        stage_name TEXT NOT NULL,
        description TEXT,
        unlocked_features JSONB DEFAULT '[]',
        PRIMARY KEY (species, stage)
      )
    `);

    // Seed evolution thresholds
    const species = ['wolf', 'bear', 'eagle', 'phoenix', 'dragon', 'tiger', 'ox', 'shark'];
    const stages = [
      { stage: 1, min_level: 1, name_suffix: 'Pup', description: 'Your journey begins' },
      { stage: 2, min_level: 10, name_suffix: 'Youth', description: 'Growing stronger' },
      { stage: 3, min_level: 25, name_suffix: 'Adult', description: 'Coming into power' },
      { stage: 4, min_level: 50, name_suffix: 'Veteran', description: 'Battle-tested' },
      { stage: 5, min_level: 75, name_suffix: 'Elite', description: 'Among the best' },
      { stage: 6, min_level: 100, name_suffix: 'Legendary', description: 'Mythical status' },
    ];

    for (const s of species) {
      for (const stage of stages) {
        const stageName = `${s.charAt(0).toUpperCase() + s.slice(1)} ${stage.name_suffix}`;
        await db.query(
          `INSERT INTO buddy_evolution_thresholds (species, stage, min_level, stage_name, description)
           VALUES ($1, $2, $3, $4, $5)
           ON CONFLICT (species, stage) DO NOTHING`,
          [s, stage.stage, stage.min_level, stageName, stage.description]
        );
      }
    }
  }

  // ============================================
  // STORE ITEMS
  // ============================================
  if (!(await tableExists('store_items'))) {
    log.info('Creating store_items table...');
    await db.query(`
      CREATE TABLE store_items (
        sku TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        category TEXT NOT NULL CHECK (category IN (
          'buddy_species', 'buddy_aura', 'buddy_armor', 'buddy_wings', 'buddy_tool',
          'buddy_emote', 'buddy_voice', 'buddy_ability', 'buddy_skin',
          'cosmetic_frame', 'cosmetic_badge', 'cosmetic_theme', 'cosmetic_trail', 'cosmetic_card', 'cosmetic_flair',
          'community_tip', 'community_bounty', 'community_challenge', 'community_boost', 'community_shoutout', 'community_gift',
          'utility_analytics', 'utility_export', 'utility_support', 'utility_beta',
          'trainer_promotion', 'trainer_verification',
          'prestige_hall_of_fame', 'prestige_title'
        )),
        subcategory TEXT,
        price_credits INTEGER NOT NULL CHECK (price_credits >= 0),
        rarity TEXT DEFAULT 'common' CHECK (rarity IN ('common', 'uncommon', 'rare', 'epic', 'legendary')),
        limited_quantity INTEGER,
        sold_count INTEGER DEFAULT 0,
        requires_level INTEGER DEFAULT 1,
        requires_items JSONB DEFAULT '[]',
        metadata JSONB DEFAULT '{}',
        enabled BOOLEAN DEFAULT TRUE,
        featured BOOLEAN DEFAULT FALSE,
        sort_order INTEGER DEFAULT 0,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    await db.query('CREATE INDEX idx_store_category ON store_items(category, enabled) WHERE enabled = TRUE');
    await db.query('CREATE INDEX idx_store_featured ON store_items(featured, sort_order) WHERE featured = TRUE AND enabled = TRUE');
    await db.query('CREATE INDEX idx_store_rarity ON store_items(rarity)');

    // Seed store items (30 spending opportunities)
    log.info('Seeding store items...');
    const storeItems = [
      // TRAINING BUDDY / COMPANION (10)
      { sku: 'buddy_species_wolf', name: 'Wolf Companion', category: 'buddy_species', price: 50, rarity: 'common', description: 'A loyal wolf to train with you' },
      { sku: 'buddy_species_bear', name: 'Bear Companion', category: 'buddy_species', price: 100, rarity: 'uncommon', description: 'A powerful bear companion' },
      { sku: 'buddy_species_eagle', name: 'Eagle Companion', category: 'buddy_species', price: 150, rarity: 'uncommon', description: 'A majestic eagle companion' },
      { sku: 'buddy_species_phoenix', name: 'Phoenix Companion', category: 'buddy_species', price: 300, rarity: 'rare', description: 'A mythical phoenix companion' },
      { sku: 'buddy_species_dragon', name: 'Dragon Companion', category: 'buddy_species', price: 500, rarity: 'epic', description: 'A legendary dragon companion' },
      { sku: 'buddy_species_tiger', name: 'Tiger Companion', category: 'buddy_species', price: 200, rarity: 'rare', description: 'A fierce tiger companion' },
      { sku: 'buddy_species_ox', name: 'Ox Companion', category: 'buddy_species', price: 150, rarity: 'uncommon', description: 'A steadfast ox companion' },
      { sku: 'buddy_species_shark', name: 'Shark Companion', category: 'buddy_species', price: 250, rarity: 'rare', description: 'A powerful shark companion' },

      // Evolution/Auras
      { sku: 'buddy_aura_golden', name: 'Golden Glow', category: 'buddy_aura', price: 100, rarity: 'uncommon', description: 'A warm golden aura effect' },
      { sku: 'buddy_aura_ember', name: 'Ember Trail', category: 'buddy_aura', price: 150, rarity: 'rare', description: 'Fiery ember particles follow your buddy' },
      { sku: 'buddy_aura_frost', name: 'Frost Mist', category: 'buddy_aura', price: 150, rarity: 'rare', description: 'Icy mist surrounds your buddy' },
      { sku: 'buddy_aura_shadow', name: 'Shadow Veil', category: 'buddy_aura', price: 200, rarity: 'epic', description: 'Mysterious shadow effects' },
      { sku: 'buddy_aura_electric', name: 'Electric Surge', category: 'buddy_aura', price: 250, rarity: 'epic', description: 'Lightning crackles around your buddy' },

      // Armor Sets
      { sku: 'buddy_armor_training', name: 'Training Vest', category: 'buddy_armor', price: 100, rarity: 'common', description: 'Basic training gear for your buddy' },
      { sku: 'buddy_armor_plate', name: 'Plate Armor', category: 'buddy_armor', price: 300, rarity: 'uncommon', description: 'Sturdy plate armor' },
      { sku: 'buddy_armor_crystal', name: 'Crystal Armor', category: 'buddy_armor', price: 800, rarity: 'rare', description: 'Gleaming crystal armor set' },
      { sku: 'buddy_armor_mythic', name: 'Mythic Aegis', category: 'buddy_armor', price: 1500, rarity: 'legendary', description: 'Legendary protective armor' },

      // Wings
      { sku: 'buddy_wings_fledgling', name: 'Fledgling Wings', category: 'buddy_wings', price: 200, rarity: 'uncommon', description: 'Small decorative wings' },
      { sku: 'buddy_wings_seraphim', name: 'Seraphim Wings', category: 'buddy_wings', price: 800, rarity: 'rare', description: 'Angelic white wings' },
      { sku: 'buddy_wings_dragon', name: 'Dragon Wings', category: 'buddy_wings', price: 1500, rarity: 'epic', description: 'Mighty dragon wings' },
      { sku: 'buddy_wings_cosmic', name: 'Cosmic Wings', category: 'buddy_wings', price: 2000, rarity: 'legendary', description: 'Wings of starlight and nebulae' },

      // Tools
      { sku: 'buddy_tool_clipboard', name: 'Clipboard', category: 'buddy_tool', price: 150, rarity: 'common', description: 'Your buddy carries a workout clipboard' },
      { sku: 'buddy_tool_stopwatch', name: 'Stopwatch', category: 'buddy_tool', price: 200, rarity: 'uncommon', description: 'A fancy stopwatch accessory' },
      { sku: 'buddy_tool_trophy', name: 'Trophy Case', category: 'buddy_tool', price: 300, rarity: 'rare', description: 'Display your achievements' },
      { sku: 'buddy_tool_orb', name: 'Focus Orb', category: 'buddy_tool', price: 400, rarity: 'epic', description: 'A mystical focus-enhancing orb' },

      // Emotes
      { sku: 'buddy_emote_victory', name: 'Victory Dances', category: 'buddy_emote', price: 75, rarity: 'common', description: 'Celebration dance moves' },
      { sku: 'buddy_emote_fistbump', name: 'Fist Bumps', category: 'buddy_emote', price: 100, rarity: 'common', description: 'Friendly fist bump animations' },
      { sku: 'buddy_emote_flex', name: 'Flex Pack', category: 'buddy_emote', price: 150, rarity: 'uncommon', description: 'Impressive flexing poses' },
      { sku: 'buddy_emote_salute', name: 'Military Salutes', category: 'buddy_emote', price: 200, rarity: 'rare', description: 'Respectful military-style salutes' },

      // Voice Lines
      { sku: 'buddy_voice_motivational', name: 'Motivational Callouts', category: 'buddy_voice', price: 100, rarity: 'common', description: 'Encouraging voice lines' },
      { sku: 'buddy_voice_celebration', name: 'PR Celebrations', category: 'buddy_voice', price: 150, rarity: 'uncommon', description: 'Special celebration audio for PRs' },
      { sku: 'buddy_voice_drill', name: 'Drill Instructor', category: 'buddy_voice', price: 250, rarity: 'rare', description: 'Intense drill instructor callouts' },

      // Abilities
      { sku: 'buddy_ability_tips', name: 'Coach Tips', category: 'buddy_ability', price: 300, rarity: 'uncommon', description: 'Your buddy offers exercise tips' },
      { sku: 'buddy_ability_recovery', name: 'Recovery Insights', category: 'buddy_ability', price: 400, rarity: 'rare', description: 'Recovery and rest recommendations' },
      { sku: 'buddy_ability_analytics', name: 'Deep Analytics', category: 'buddy_ability', price: 500, rarity: 'epic', description: 'Advanced workout analytics' },

      // Legendary Skins
      { sku: 'buddy_skin_military', name: 'Military Camo', category: 'buddy_skin', price: 2000, rarity: 'legendary', description: 'Military-themed buddy skin' },
      { sku: 'buddy_skin_firefighter', name: 'First Responder', category: 'buddy_skin', price: 2500, rarity: 'legendary', description: 'Firefighter/EMT themed skin' },
      { sku: 'buddy_skin_union', name: 'Union Pride', category: 'buddy_skin', price: 2000, rarity: 'legendary', description: 'Blue-collar union themed skin' },
      { sku: 'buddy_skin_champion', name: 'Championship Gold', category: 'buddy_skin', price: 5000, rarity: 'legendary', description: 'Gold championship skin' },

      // APP COSMETICS (6)
      { sku: 'cosmetic_frame_bronze', name: 'Bronze Frame', category: 'cosmetic_frame', price: 100, rarity: 'common', description: 'Bronze profile frame' },
      { sku: 'cosmetic_frame_silver', name: 'Silver Frame', category: 'cosmetic_frame', price: 200, rarity: 'uncommon', description: 'Silver profile frame' },
      { sku: 'cosmetic_frame_gold', name: 'Gold Frame', category: 'cosmetic_frame', price: 350, rarity: 'rare', description: 'Gold profile frame' },
      { sku: 'cosmetic_frame_platinum', name: 'Platinum Frame', category: 'cosmetic_frame', price: 500, rarity: 'epic', description: 'Platinum profile frame' },
      { sku: 'cosmetic_frame_diamond', name: 'Diamond Frame', category: 'cosmetic_frame', price: 800, rarity: 'legendary', description: 'Diamond profile frame' },

      { sku: 'cosmetic_badge_glow', name: 'Badge Glow Effect', category: 'cosmetic_badge', price: 50, rarity: 'common', description: 'Animated glow on achievement badges' },
      { sku: 'cosmetic_badge_pulse', name: 'Badge Pulse Effect', category: 'cosmetic_badge', price: 100, rarity: 'uncommon', description: 'Pulsing animation on badges' },
      { sku: 'cosmetic_badge_sparkle', name: 'Badge Sparkle', category: 'cosmetic_badge', price: 200, rarity: 'rare', description: 'Sparkle effects on badges' },

      { sku: 'cosmetic_theme_military', name: 'Military OD Theme', category: 'cosmetic_theme', price: 200, rarity: 'uncommon', description: 'Olive drab military theme' },
      { sku: 'cosmetic_theme_fire', name: 'Fire Dept Red', category: 'cosmetic_theme', price: 200, rarity: 'uncommon', description: 'Fire department red theme' },
      { sku: 'cosmetic_theme_construction', name: 'Construction Orange', category: 'cosmetic_theme', price: 200, rarity: 'uncommon', description: 'Construction orange theme' },
      { sku: 'cosmetic_theme_neon', name: 'Neon Gym', category: 'cosmetic_theme', price: 400, rarity: 'rare', description: 'Neon cyberpunk gym theme' },

      { sku: 'cosmetic_trail_flame', name: 'Flame Trail', category: 'cosmetic_trail', price: 100, rarity: 'uncommon', description: 'Flame effects on map trails' },
      { sku: 'cosmetic_trail_lightning', name: 'Lightning Trail', category: 'cosmetic_trail', price: 200, rarity: 'rare', description: 'Lightning bolt trail effects' },
      { sku: 'cosmetic_trail_rainbow', name: 'Rainbow Trail', category: 'cosmetic_trail', price: 300, rarity: 'epic', description: 'Rainbow trail effects' },

      { sku: 'cosmetic_card_basic', name: 'Custom Card Skin', category: 'cosmetic_card', price: 75, rarity: 'common', description: 'Custom workout card background' },
      { sku: 'cosmetic_card_premium', name: 'Premium Card Skin', category: 'cosmetic_card', price: 250, rarity: 'rare', description: 'Premium animated card background' },

      { sku: 'cosmetic_flair_animated', name: 'Animated Rank Badge', category: 'cosmetic_flair', price: 200, rarity: 'uncommon', description: 'Animated leaderboard flair' },
      { sku: 'cosmetic_flair_legendary', name: 'Legendary Flair', category: 'cosmetic_flair', price: 600, rarity: 'legendary', description: 'Special legendary rank effects' },

      // COMMUNITY ACTIONS (6)
      { sku: 'community_tip_small', name: 'Small Tip (10)', category: 'community_tip', price: 10, rarity: 'common', description: 'Tip a trainer 10 credits' },
      { sku: 'community_tip_medium', name: 'Medium Tip (50)', category: 'community_tip', price: 50, rarity: 'common', description: 'Tip a trainer 50 credits' },
      { sku: 'community_tip_large', name: 'Large Tip (100)', category: 'community_tip', price: 100, rarity: 'uncommon', description: 'Tip a trainer 100 credits' },
      { sku: 'community_tip_mega', name: 'Mega Tip (500)', category: 'community_tip', price: 500, rarity: 'rare', description: 'Tip a trainer 500 credits' },

      { sku: 'community_bounty_create', name: 'Create Bounty', category: 'community_bounty', price: 50, rarity: 'common', description: 'Create a challenge bounty (min stake)' },
      { sku: 'community_challenge_entry', name: 'Challenge Entry', category: 'community_challenge', price: 25, rarity: 'common', description: 'Entry fee for competitive challenges' },
      { sku: 'community_boost_event', name: 'Event Boost', category: 'community_boost', price: 100, rarity: 'uncommon', description: 'Boost your event in feeds' },
      { sku: 'community_boost_premium', name: 'Premium Boost', category: 'community_boost', price: 500, rarity: 'rare', description: 'Premium event visibility' },
      { sku: 'community_shoutout', name: 'Shoutout Post', category: 'community_shoutout', price: 25, rarity: 'common', description: 'Highlighted community post' },
      { sku: 'community_gift_group', name: 'Group Gift', category: 'community_gift', price: 50, rarity: 'common', description: 'Bulk tips to workout groups' },

      // UTILITY UNLOCKS (4)
      { sku: 'utility_analytics_pro', name: 'Advanced Analytics', category: 'utility_analytics', price: 500, rarity: 'rare', description: 'Detailed muscle heatmaps and trends' },
      { sku: 'utility_export_data', name: 'Data Export', category: 'utility_export', price: 200, rarity: 'uncommon', description: 'Export workout history to CSV/JSON' },
      { sku: 'utility_support_priority', name: 'Priority Support', category: 'utility_support', price: 300, rarity: 'uncommon', description: 'Faster support response queue' },
      { sku: 'utility_beta_access', name: 'Early Access', category: 'utility_beta', price: 400, rarity: 'rare', description: 'Beta features before release' },

      // TRAINER-SPECIFIC (2)
      { sku: 'trainer_class_boost', name: 'Class Promotion', category: 'trainer_promotion', price: 100, rarity: 'common', description: 'Boost class visibility' },
      { sku: 'trainer_verified', name: 'Trainer Verification', category: 'trainer_verification', price: 1000, rarity: 'epic', description: 'Verified trainer badge (one-time)' },

      // STATUS & PRESTIGE (2)
      { sku: 'prestige_hall_of_fame', name: 'Hall of Fame Entry', category: 'prestige_hall_of_fame', price: 5000, rarity: 'legendary', description: 'Permanent category listing' },
      { sku: 'prestige_custom_title', name: 'Custom Title', category: 'prestige_title', price: 1000, rarity: 'epic', description: 'Custom display title (moderated)' },
    ];

    for (const item of storeItems) {
      await db.query(
        `INSERT INTO store_items (sku, name, description, category, price_credits, rarity)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (sku) DO NOTHING`,
        [item.sku, item.name, item.description || '', item.category, item.price, item.rarity]
      );
    }
  }

  // ============================================
  // USER INVENTORY
  // ============================================
  if (!(await tableExists('user_inventory'))) {
    log.info('Creating user_inventory table...');
    await db.query(`
      CREATE TABLE user_inventory (
        id TEXT PRIMARY KEY DEFAULT 'inv_' || replace(gen_random_uuid()::text, '-', ''),
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        sku TEXT NOT NULL REFERENCES store_items(sku) ON DELETE CASCADE,
        purchase_tx_id TEXT,
        quantity INTEGER DEFAULT 1,
        purchased_at TIMESTAMPTZ DEFAULT NOW(),
        expires_at TIMESTAMPTZ,
        metadata JSONB DEFAULT '{}',
        UNIQUE (user_id, sku)
      )
    `);

    await db.query('CREATE INDEX idx_inventory_user ON user_inventory(user_id)');
    await db.query('CREATE INDEX idx_inventory_sku ON user_inventory(sku)');
  }

  // ============================================
  // USER EQUIPPED COSMETICS
  // ============================================
  if (!(await tableExists('user_equipped_cosmetics'))) {
    log.info('Creating user_equipped_cosmetics table...');
    await db.query(`
      CREATE TABLE user_equipped_cosmetics (
        user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
        profile_frame TEXT REFERENCES store_items(sku),
        badge_effect TEXT REFERENCES store_items(sku),
        app_theme TEXT REFERENCES store_items(sku),
        map_trail TEXT REFERENCES store_items(sku),
        workout_card TEXT REFERENCES store_items(sku),
        leaderboard_flair TEXT REFERENCES store_items(sku),
        custom_title TEXT,
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
  }

  // ============================================
  // TRAINER PROFILES
  // ============================================
  if (!(await tableExists('trainer_profiles'))) {
    log.info('Creating trainer_profiles table...');
    await db.query(`
      CREATE TABLE trainer_profiles (
        user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
        display_name TEXT NOT NULL,
        bio TEXT,
        specialties JSONB DEFAULT '[]',
        certifications JSONB DEFAULT '[]',
        hourly_rate_credits INTEGER DEFAULT 100,
        per_class_rate_credits INTEGER DEFAULT 50,
        verified BOOLEAN DEFAULT FALSE,
        verified_at TIMESTAMPTZ,
        verified_by TEXT REFERENCES users(id),
        rating_avg NUMERIC(3, 2) DEFAULT 0,
        rating_count INTEGER DEFAULT 0,
        total_classes_taught INTEGER DEFAULT 0,
        total_students_trained INTEGER DEFAULT 0,
        total_credits_earned INTEGER DEFAULT 0,
        status TEXT DEFAULT 'active' CHECK (status IN ('active', 'paused', 'suspended')),
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    await db.query('CREATE INDEX idx_trainer_verified ON trainer_profiles(verified) WHERE verified = TRUE');
    await db.query('CREATE INDEX idx_trainer_rating ON trainer_profiles(rating_avg DESC) WHERE status = \'active\'');
  }

  // ============================================
  // TRAINER CLASSES
  // ============================================
  if (!(await tableExists('trainer_classes'))) {
    log.info('Creating trainer_classes table...');
    await db.query(`
      CREATE TABLE trainer_classes (
        id TEXT PRIMARY KEY DEFAULT 'class_' || replace(gen_random_uuid()::text, '-', ''),
        trainer_user_id TEXT NOT NULL REFERENCES trainer_profiles(user_id) ON DELETE CASCADE,
        title TEXT NOT NULL,
        description TEXT,
        category TEXT NOT NULL,
        difficulty TEXT CHECK (difficulty IN ('beginner', 'intermediate', 'advanced', 'all')),
        start_at TIMESTAMPTZ NOT NULL,
        duration_minutes INTEGER NOT NULL CHECK (duration_minutes > 0 AND duration_minutes <= 480),
        location_type TEXT NOT NULL CHECK (location_type IN ('in_person', 'virtual', 'hybrid')),
        location_details TEXT,
        hangout_id BIGINT REFERENCES hangouts(id),
        virtual_hangout_id BIGINT REFERENCES virtual_hangouts(id),
        capacity INTEGER NOT NULL CHECK (capacity > 0 AND capacity <= 1000),
        enrolled_count INTEGER DEFAULT 0,
        credits_per_student INTEGER NOT NULL CHECK (credits_per_student >= 0),
        trainer_wage_per_student INTEGER NOT NULL CHECK (trainer_wage_per_student >= 0),
        status TEXT DEFAULT 'scheduled' CHECK (status IN ('draft', 'scheduled', 'in_progress', 'completed', 'cancelled')),
        metadata JSONB DEFAULT '{}',
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    await db.query('CREATE INDEX idx_classes_trainer ON trainer_classes(trainer_user_id, status)');
    await db.query('CREATE INDEX idx_classes_start ON trainer_classes(start_at) WHERE status = \'scheduled\'');
    await db.query('CREATE INDEX idx_classes_hangout ON trainer_classes(hangout_id) WHERE hangout_id IS NOT NULL');
  }

  // ============================================
  // CLASS ENROLLMENTS
  // ============================================
  if (!(await tableExists('class_enrollments'))) {
    log.info('Creating class_enrollments table...');
    await db.query(`
      CREATE TABLE class_enrollments (
        id TEXT PRIMARY KEY DEFAULT 'enroll_' || replace(gen_random_uuid()::text, '-', ''),
        class_id TEXT NOT NULL REFERENCES trainer_classes(id) ON DELETE CASCADE,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        status TEXT DEFAULT 'enrolled' CHECK (status IN ('pending', 'enrolled', 'cancelled', 'refunded', 'completed')),
        payment_tx_id TEXT,
        credits_paid INTEGER DEFAULT 0,
        enrolled_at TIMESTAMPTZ DEFAULT NOW(),
        cancelled_at TIMESTAMPTZ,
        refund_tx_id TEXT,
        UNIQUE (class_id, user_id)
      )
    `);

    await db.query('CREATE INDEX idx_enrollments_class ON class_enrollments(class_id, status)');
    await db.query('CREATE INDEX idx_enrollments_user ON class_enrollments(user_id, enrolled_at DESC)');
  }

  // ============================================
  // CLASS ATTENDANCE
  // ============================================
  if (!(await tableExists('class_attendance'))) {
    log.info('Creating class_attendance table...');
    await db.query(`
      CREATE TABLE class_attendance (
        id TEXT PRIMARY KEY DEFAULT 'attend_' || replace(gen_random_uuid()::text, '-', ''),
        class_id TEXT NOT NULL REFERENCES trainer_classes(id) ON DELETE CASCADE,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        attended BOOLEAN DEFAULT FALSE,
        marked_by TEXT NOT NULL REFERENCES users(id),
        wage_tx_id TEXT,
        rating INTEGER CHECK (rating >= 1 AND rating <= 5),
        feedback TEXT,
        marked_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE (class_id, user_id)
      )
    `);

    await db.query('CREATE INDEX idx_attendance_class ON class_attendance(class_id)');
    await db.query('CREATE INDEX idx_attendance_user ON class_attendance(user_id)');
  }

  // ============================================
  // FRAUD FLAGS (enhanced)
  // ============================================
  if (!(await tableExists('economy_fraud_flags'))) {
    log.info('Creating economy_fraud_flags table...');
    await db.query(`
      CREATE TABLE economy_fraud_flags (
        id TEXT PRIMARY KEY DEFAULT 'fraud_' || replace(gen_random_uuid()::text, '-', ''),
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        flag_type TEXT NOT NULL CHECK (flag_type IN (
          'rapid_earning', 'bulk_transfers', 'transfer_loop', 'unusual_pattern',
          'impossible_value', 'geo_mismatch', 'time_anomaly', 'suspicious_referral',
          'excessive_tips', 'alt_account_suspected'
        )),
        severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
        details JSONB DEFAULT '{}',
        related_tx_ids JSONB DEFAULT '[]',
        status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'reviewing', 'dismissed', 'confirmed', 'actioned')),
        reviewed_by TEXT REFERENCES users(id),
        reviewed_at TIMESTAMPTZ,
        resolution TEXT,
        action_taken TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    await db.query('CREATE INDEX idx_fraud_pending ON economy_fraud_flags(status, severity DESC) WHERE status = \'pending\'');
    await db.query('CREATE INDEX idx_fraud_user ON economy_fraud_flags(user_id, created_at DESC)');
  }

  // ============================================
  // ADMIN AUDIT LOG
  // ============================================
  if (!(await tableExists('admin_credit_audit_log'))) {
    log.info('Creating admin_credit_audit_log table...');
    await db.query(`
      CREATE TABLE admin_credit_audit_log (
        id TEXT PRIMARY KEY DEFAULT 'audit_' || replace(gen_random_uuid()::text, '-', ''),
        admin_user_id TEXT NOT NULL REFERENCES users(id),
        action TEXT NOT NULL CHECK (action IN (
          'manual_credit', 'manual_debit', 'reverse_transaction', 'freeze_wallet',
          'unfreeze_wallet', 'review_fraud', 'dismiss_fraud', 'confirm_fraud',
          'ban_user', 'unban_user', 'adjust_balance', 'grant_item', 'revoke_item'
        )),
        target_user_id TEXT REFERENCES users(id),
        target_tx_id TEXT,
        amount INTEGER,
        reason TEXT NOT NULL,
        details JSONB DEFAULT '{}',
        ip_address TEXT,
        user_agent TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    await db.query('CREATE INDEX idx_audit_admin ON admin_credit_audit_log(admin_user_id, created_at DESC)');
    await db.query('CREATE INDEX idx_audit_target ON admin_credit_audit_log(target_user_id, created_at DESC)');
  }

  // ============================================
  // RATE LIMITS (economy-specific)
  // ============================================
  if (!(await tableExists('economy_rate_limits'))) {
    log.info('Creating economy_rate_limits table...');
    await db.query(`
      CREATE TABLE economy_rate_limits (
        user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
        transfers_today INTEGER DEFAULT 0,
        transfers_this_hour INTEGER DEFAULT 0,
        purchases_this_hour INTEGER DEFAULT 0,
        earnings_today INTEGER DEFAULT 0,
        last_transfer_at TIMESTAMPTZ,
        last_purchase_at TIMESTAMPTZ,
        last_earning_at TIMESTAMPTZ,
        daily_reset_at DATE DEFAULT CURRENT_DATE,
        hourly_reset_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
  }

  // ============================================
  // ADD BUDDY XP TO EXISTING USERS COLUMN
  // ============================================
  if (await tableExists('users')) {
    if (!(await columnExists('users', 'buddy_xp_total'))) {
      log.info('Adding buddy XP tracking to users table...');
      await db.query('ALTER TABLE users ADD COLUMN buddy_xp_total INTEGER DEFAULT 0');
    }
  }

  // ============================================
  // ANALYZE NEW TABLES
  // ============================================
  log.info('Analyzing new tables...');
  const newTables = [
    'credit_transfers',
    'earning_rules',
    'earning_awards',
    'training_buddies',
    'buddy_evolution_thresholds',
    'store_items',
    'user_inventory',
    'user_equipped_cosmetics',
    'trainer_profiles',
    'trainer_classes',
    'class_enrollments',
    'class_attendance',
    'economy_fraud_flags',
    'admin_credit_audit_log',
    'economy_rate_limits',
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

  log.info('Migration 041_credits_economy complete');
}

export async function down(): Promise<void> {
  log.info('Rolling back migration: 041_credits_economy');

  const tables = [
    'economy_rate_limits',
    'admin_credit_audit_log',
    'economy_fraud_flags',
    'class_attendance',
    'class_enrollments',
    'trainer_classes',
    'trainer_profiles',
    'user_equipped_cosmetics',
    'user_inventory',
    'store_items',
    'buddy_evolution_thresholds',
    'training_buddies',
    'earning_awards',
    'earning_rules',
    'credit_transfers',
  ];

  for (const table of tables) {
    await db.query(`DROP TABLE IF EXISTS ${table} CASCADE`);
  }

  // Remove columns added to existing tables
  if (await columnExists('credit_balances', 'total_transferred_out')) {
    await db.query('ALTER TABLE credit_balances DROP COLUMN total_transferred_out');
    await db.query('ALTER TABLE credit_balances DROP COLUMN total_transferred_in');
    await db.query('ALTER TABLE credit_balances DROP COLUMN status');
    await db.query('ALTER TABLE credit_balances DROP COLUMN frozen_at');
    await db.query('ALTER TABLE credit_balances DROP COLUMN frozen_reason');
  }

  if (await columnExists('users', 'buddy_xp_total')) {
    await db.query('ALTER TABLE users DROP COLUMN buddy_xp_total');
  }

  log.info('Rollback 041_credits_economy complete');
}

export const migrate = up;
