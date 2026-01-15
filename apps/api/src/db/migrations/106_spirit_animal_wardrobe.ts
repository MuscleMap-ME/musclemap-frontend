/**
 * Migration 106: Spirit Animal Wardrobe System
 *
 * Implements the complete Spirit Animal cosmetic/wardrobe system:
 * - Cosmetic items catalog with rarity, seasons, and species locks
 * - User-owned cosmetics inventory
 * - Equipment loadout system
 * - Shop rotation for daily/featured items
 * - Purchase history for analytics
 * - Outfit presets for quick switching
 *
 * Spirit Animals (formerly "mascot companions") are a central part of
 * user identity and progression on MuscleMap.
 */

import { query } from '../client';
import { loggers } from '../../lib/logger';

const log = loggers.db;

export async function up(): Promise<void> {
  log.info('Running migration: 106_spirit_animal_wardrobe');

  // =====================================================
  // COSMETIC ITEMS CATALOG
  // =====================================================
  log.info('Creating spirit animal cosmetics catalog...');

  await query(`
    CREATE TABLE IF NOT EXISTS spirit_animal_cosmetics (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      item_key VARCHAR(100) UNIQUE NOT NULL,
      name VARCHAR(200) NOT NULL,
      description TEXT,
      category VARCHAR(50) NOT NULL,
      slot VARCHAR(50),
      rarity VARCHAR(20) NOT NULL DEFAULT 'common',
      base_price INTEGER NOT NULL DEFAULT 100,
      species_locked TEXT[],
      stage_required INTEGER DEFAULT 1,
      is_purchasable BOOLEAN DEFAULT TRUE,
      is_tradeable BOOLEAN DEFAULT FALSE,
      is_giftable BOOLEAN DEFAULT TRUE,
      achievement_required TEXT,
      season VARCHAR(50),
      release_date DATE DEFAULT CURRENT_DATE,
      retirement_date DATE,
      preview_url TEXT,
      asset_url TEXT,
      metadata JSONB DEFAULT '{}',
      created_at TIMESTAMPTZ DEFAULT NOW(),
      CONSTRAINT valid_category CHECK (category IN (
        'skin', 'eyes', 'outfit', 'headwear', 'footwear',
        'accessory', 'aura', 'emote', 'background', 'effect'
      )),
      CONSTRAINT valid_rarity CHECK (rarity IN (
        'common', 'uncommon', 'rare', 'epic', 'legendary'
      )),
      CONSTRAINT valid_stage CHECK (stage_required BETWEEN 1 AND 6)
    )
  `);

  await query(`
    CREATE INDEX IF NOT EXISTS idx_spirit_cosmetics_category
    ON spirit_animal_cosmetics(category, rarity)
  `);

  await query(`
    CREATE INDEX IF NOT EXISTS idx_spirit_cosmetics_species
    ON spirit_animal_cosmetics USING GIN(species_locked)
    WHERE species_locked IS NOT NULL
  `);

  await query(`
    CREATE INDEX IF NOT EXISTS idx_spirit_cosmetics_purchasable
    ON spirit_animal_cosmetics(is_purchasable, category)
    WHERE is_purchasable = TRUE
  `);

  await query(`
    CREATE INDEX IF NOT EXISTS idx_spirit_cosmetics_season
    ON spirit_animal_cosmetics(season, retirement_date)
    WHERE season IS NOT NULL
  `);

  // =====================================================
  // USER OWNED COSMETICS
  // =====================================================
  log.info('Creating user cosmetics inventory...');

  await query(`
    CREATE TABLE IF NOT EXISTS user_spirit_cosmetics (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      cosmetic_id UUID NOT NULL REFERENCES spirit_animal_cosmetics(id) ON DELETE CASCADE,
      acquired_at TIMESTAMPTZ DEFAULT NOW(),
      acquisition_method VARCHAR(50) NOT NULL DEFAULT 'purchase',
      credits_spent INTEGER DEFAULT 0,
      gifted_by TEXT REFERENCES users(id) ON DELETE SET NULL,
      is_favorite BOOLEAN DEFAULT FALSE,
      is_new BOOLEAN DEFAULT TRUE,
      UNIQUE(user_id, cosmetic_id),
      CONSTRAINT valid_acquisition CHECK (acquisition_method IN (
        'purchase', 'achievement', 'gift', 'event', 'starter', 'reward', 'competition'
      ))
    )
  `);

  await query(`
    CREATE INDEX IF NOT EXISTS idx_user_spirit_cosmetics_user
    ON user_spirit_cosmetics(user_id, acquired_at DESC)
  `);

  await query(`
    CREATE INDEX IF NOT EXISTS idx_user_spirit_cosmetics_favorites
    ON user_spirit_cosmetics(user_id)
    WHERE is_favorite = TRUE
  `);

  // =====================================================
  // EQUIPPED LOADOUT
  // =====================================================
  log.info('Creating spirit animal loadout system...');

  await query(`
    CREATE TABLE IF NOT EXISTS user_spirit_loadout (
      user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      skin_id UUID REFERENCES spirit_animal_cosmetics(id) ON DELETE SET NULL,
      eyes_id UUID REFERENCES spirit_animal_cosmetics(id) ON DELETE SET NULL,
      outfit_id UUID REFERENCES spirit_animal_cosmetics(id) ON DELETE SET NULL,
      headwear_id UUID REFERENCES spirit_animal_cosmetics(id) ON DELETE SET NULL,
      footwear_id UUID REFERENCES spirit_animal_cosmetics(id) ON DELETE SET NULL,
      accessory_1_id UUID REFERENCES spirit_animal_cosmetics(id) ON DELETE SET NULL,
      accessory_2_id UUID REFERENCES spirit_animal_cosmetics(id) ON DELETE SET NULL,
      accessory_3_id UUID REFERENCES spirit_animal_cosmetics(id) ON DELETE SET NULL,
      aura_id UUID REFERENCES spirit_animal_cosmetics(id) ON DELETE SET NULL,
      emote_victory_id UUID REFERENCES spirit_animal_cosmetics(id) ON DELETE SET NULL,
      emote_idle_id UUID REFERENCES spirit_animal_cosmetics(id) ON DELETE SET NULL,
      background_id UUID REFERENCES spirit_animal_cosmetics(id) ON DELETE SET NULL,
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  // =====================================================
  // SHOP ROTATION
  // =====================================================
  log.info('Creating shop rotation system...');

  await query(`
    CREATE TABLE IF NOT EXISTS spirit_shop_rotation (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      rotation_date DATE NOT NULL,
      slot_number INTEGER NOT NULL,
      cosmetic_id UUID NOT NULL REFERENCES spirit_animal_cosmetics(id) ON DELETE CASCADE,
      discount_percent INTEGER DEFAULT 0,
      is_featured BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(rotation_date, slot_number),
      CONSTRAINT valid_slot CHECK (slot_number BETWEEN 1 AND 12),
      CONSTRAINT valid_discount CHECK (discount_percent BETWEEN 0 AND 75)
    )
  `);

  await query(`
    CREATE INDEX IF NOT EXISTS idx_spirit_shop_date
    ON spirit_shop_rotation(rotation_date DESC)
  `);

  // =====================================================
  // PURCHASE HISTORY
  // =====================================================
  log.info('Creating purchase history tracking...');

  await query(`
    CREATE TABLE IF NOT EXISTS spirit_cosmetic_purchases (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      cosmetic_id UUID NOT NULL REFERENCES spirit_animal_cosmetics(id) ON DELETE CASCADE,
      credits_spent INTEGER NOT NULL,
      was_discounted BOOLEAN DEFAULT FALSE,
      discount_percent INTEGER DEFAULT 0,
      original_price INTEGER NOT NULL,
      purchased_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  await query(`
    CREATE INDEX IF NOT EXISTS idx_spirit_purchases_user
    ON spirit_cosmetic_purchases(user_id, purchased_at DESC)
  `);

  await query(`
    CREATE INDEX IF NOT EXISTS idx_spirit_purchases_cosmetic
    ON spirit_cosmetic_purchases(cosmetic_id, purchased_at DESC)
  `);

  // =====================================================
  // OUTFIT PRESETS
  // =====================================================
  log.info('Creating outfit presets...');

  await query(`
    CREATE TABLE IF NOT EXISTS user_spirit_presets (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      preset_name VARCHAR(50) NOT NULL,
      preset_icon VARCHAR(50) DEFAULT 'outfit',
      loadout JSONB NOT NULL DEFAULT '{}',
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(user_id, preset_name)
    )
  `);

  await query(`
    CREATE INDEX IF NOT EXISTS idx_spirit_presets_user
    ON user_spirit_presets(user_id)
  `);

  // =====================================================
  // GIFT HISTORY
  // =====================================================
  log.info('Creating gift history...');

  await query(`
    CREATE TABLE IF NOT EXISTS spirit_cosmetic_gifts (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      from_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      to_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      cosmetic_id UUID NOT NULL REFERENCES spirit_animal_cosmetics(id) ON DELETE CASCADE,
      credits_spent INTEGER NOT NULL,
      message TEXT,
      gifted_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  await query(`
    CREATE INDEX IF NOT EXISTS idx_spirit_gifts_from
    ON spirit_cosmetic_gifts(from_user_id, gifted_at DESC)
  `);

  await query(`
    CREATE INDEX IF NOT EXISTS idx_spirit_gifts_to
    ON spirit_cosmetic_gifts(to_user_id, gifted_at DESC)
  `);

  // =====================================================
  // SEED INITIAL COSMETICS
  // =====================================================
  log.info('Seeding initial cosmetics catalog...');

  // Starter skins (free for all)
  await query(`
    INSERT INTO spirit_animal_cosmetics (item_key, name, description, category, slot, rarity, base_price, is_purchasable) VALUES
    ('skin_default', 'Natural Coat', 'The default appearance for your Spirit Animal', 'skin', 'base', 'common', 0, FALSE),
    ('skin_midnight', 'Midnight Black', 'A sleek dark coat', 'skin', 'base', 'common', 50, TRUE),
    ('skin_snow', 'Snow White', 'Pure white fur', 'skin', 'base', 'common', 50, TRUE),
    ('skin_amber', 'Amber Gold', 'Warm golden tones', 'skin', 'base', 'uncommon', 100, TRUE),
    ('skin_storm', 'Storm Gray', 'Thunder cloud gray', 'skin', 'base', 'common', 50, TRUE),
    ('skin_forest', 'Forest Green', 'Deep emerald sheen', 'skin', 'base', 'uncommon', 100, TRUE),
    ('skin_crimson', 'Crimson Red', 'Bold scarlet tones', 'skin', 'base', 'uncommon', 100, TRUE),
    ('skin_royal_blue', 'Royal Blue', 'Deep sapphire coat', 'skin', 'base', 'uncommon', 100, TRUE),
    ('skin_sunset', 'Sunset Gradient', 'Orange to purple gradient', 'skin', 'base', 'rare', 250, TRUE),
    ('skin_galaxy', 'Galaxy Pattern', 'Starfield pattern with sparkles', 'skin', 'base', 'epic', 500, TRUE),
    ('skin_holographic', 'Holographic', 'Color-shifting iridescent', 'skin', 'base', 'legendary', 1000, TRUE)
    ON CONFLICT (item_key) DO NOTHING
  `);

  // Eye colors
  await query(`
    INSERT INTO spirit_animal_cosmetics (item_key, name, description, category, slot, rarity, base_price) VALUES
    ('eyes_amber', 'Amber Eyes', 'Warm golden eyes', 'eyes', 'color', 'common', 25),
    ('eyes_sapphire', 'Sapphire Eyes', 'Deep blue eyes', 'eyes', 'color', 'common', 25),
    ('eyes_emerald', 'Emerald Eyes', 'Vibrant green eyes', 'eyes', 'color', 'common', 25),
    ('eyes_ruby', 'Ruby Eyes', 'Intense red eyes', 'eyes', 'color', 'uncommon', 50),
    ('eyes_violet', 'Violet Eyes', 'Mysterious purple', 'eyes', 'color', 'uncommon', 50),
    ('eyes_heterochromia', 'Heterochromia', 'Two different colored eyes', 'eyes', 'color', 'rare', 150),
    ('eyes_glowing', 'Glowing Eyes', 'Softly glowing eyes', 'eyes', 'effect', 'epic', 300),
    ('eyes_starlight', 'Starlight Eyes', 'Eyes with twinkling stars', 'eyes', 'effect', 'legendary', 600)
    ON CONFLICT (item_key) DO NOTHING
  `);

  // Headwear
  await query(`
    INSERT INTO spirit_animal_cosmetics (item_key, name, description, category, slot, rarity, base_price, stage_required) VALUES
    ('head_baseball_cap', 'Baseball Cap', 'Classic sporty look', 'headwear', 'hat', 'common', 50, 1),
    ('head_beanie', 'Cozy Beanie', 'Warm knit beanie', 'headwear', 'hat', 'common', 50, 1),
    ('head_bandana', 'Warrior Bandana', 'Tied around the head', 'headwear', 'wrap', 'common', 75, 1),
    ('head_sweatband', 'Athletic Sweatband', 'Ready to work out', 'headwear', 'band', 'common', 40, 1),
    ('head_crown_bronze', 'Bronze Crown', 'Entry-level royalty', 'headwear', 'crown', 'uncommon', 150, 2),
    ('head_crown_silver', 'Silver Crown', 'Shining silver', 'headwear', 'crown', 'rare', 300, 3),
    ('head_crown_gold', 'Golden Crown', 'Fit for a champion', 'headwear', 'crown', 'epic', 600, 4),
    ('head_halo', 'Divine Halo', 'A glowing ring above', 'headwear', 'effect', 'epic', 500, 4),
    ('head_horns_small', 'Small Horns', 'Subtle but fierce', 'headwear', 'horns', 'uncommon', 125, 2),
    ('head_horns_demon', 'Demon Horns', 'Intimidating curved horns', 'headwear', 'horns', 'rare', 275, 3),
    ('head_antlers', 'Majestic Antlers', 'Branch-like antlers', 'headwear', 'horns', 'rare', 300, 3),
    ('head_crown_legendary', 'Legendary Crown', 'Ornate with gems', 'headwear', 'crown', 'legendary', 1200, 5)
    ON CONFLICT (item_key) DO NOTHING
  `);

  // Outfits
  await query(`
    INSERT INTO spirit_animal_cosmetics (item_key, name, description, category, slot, rarity, base_price, stage_required) VALUES
    ('outfit_athletic_basic', 'Basic Athletic Wear', 'Simple workout clothes', 'outfit', 'full', 'common', 100, 1),
    ('outfit_gym_tank', 'Gym Tank Top', 'Show off those gains', 'outfit', 'top', 'common', 60, 1),
    ('outfit_hoodie', 'Cozy Hoodie', 'Comfortable and warm', 'outfit', 'top', 'common', 80, 1),
    ('outfit_jersey', 'Sports Jersey', 'Team spirit wear', 'outfit', 'top', 'uncommon', 120, 1),
    ('outfit_leather_jacket', 'Leather Jacket', 'Cool and edgy', 'outfit', 'top', 'rare', 250, 2),
    ('outfit_armor_light', 'Light Armor', 'Fantasy warrior style', 'outfit', 'full', 'rare', 350, 3),
    ('outfit_armor_heavy', 'Heavy Plate Armor', 'Full knight armor', 'outfit', 'full', 'epic', 600, 4),
    ('outfit_robe_mystic', 'Mystic Robe', 'Flowing magical robes', 'outfit', 'full', 'rare', 300, 3),
    ('outfit_suit_formal', 'Formal Suit', 'Looking sharp', 'outfit', 'full', 'uncommon', 200, 2),
    ('outfit_tuxedo', 'Golden Tuxedo', 'Red carpet ready', 'outfit', 'full', 'epic', 500, 4),
    ('outfit_champion', 'Champion Regalia', 'For true champions only', 'outfit', 'full', 'legendary', 1500, 5)
    ON CONFLICT (item_key) DO NOTHING
  `);

  // Footwear
  await query(`
    INSERT INTO spirit_animal_cosmetics (item_key, name, description, category, slot, rarity, base_price) VALUES
    ('feet_sneakers_white', 'White Sneakers', 'Classic clean kicks', 'footwear', 'shoes', 'common', 50),
    ('feet_sneakers_red', 'Red High-Tops', 'Bold basketball style', 'footwear', 'shoes', 'common', 60),
    ('feet_boots_hiking', 'Hiking Boots', 'Ready for adventure', 'footwear', 'boots', 'uncommon', 100),
    ('feet_boots_combat', 'Combat Boots', 'Tough and ready', 'footwear', 'boots', 'uncommon', 120),
    ('feet_sandals_gold', 'Golden Sandals', 'Greek god aesthetic', 'footwear', 'sandals', 'rare', 200),
    ('feet_flame_trail', 'Flame Walkers', 'Leave fire in your wake', 'footwear', 'effect', 'epic', 400),
    ('feet_cloud_walkers', 'Cloud Walkers', 'Walk on clouds', 'footwear', 'effect', 'legendary', 800)
    ON CONFLICT (item_key) DO NOTHING
  `);

  // Accessories
  await query(`
    INSERT INTO spirit_animal_cosmetics (item_key, name, description, category, slot, rarity, base_price, stage_required) VALUES
    ('acc_collar_basic', 'Basic Collar', 'Simple accessory', 'accessory', 'neck', 'common', 25, 1),
    ('acc_collar_studded', 'Studded Collar', 'Punk rock style', 'accessory', 'neck', 'uncommon', 75, 1),
    ('acc_necklace_gold', 'Gold Chain', 'Bling bling', 'accessory', 'neck', 'rare', 200, 2),
    ('acc_medallion_champion', 'Champion Medallion', 'For competition winners', 'accessory', 'neck', 'epic', 0, 3),
    ('acc_belt_leather', 'Leather Belt', 'Classic accessory', 'accessory', 'belt', 'common', 40, 1),
    ('acc_belt_championship', 'Championship Belt', 'You earned it', 'accessory', 'belt', 'legendary', 0, 5),
    ('acc_cape_basic', 'Simple Cape', 'Flowing behind you', 'accessory', 'back', 'uncommon', 150, 2),
    ('acc_cape_royal', 'Royal Cape', 'Velvet with gold trim', 'accessory', 'back', 'epic', 400, 4),
    ('acc_wings_angel', 'Angel Wings', 'Pure white feathered wings', 'accessory', 'back', 'epic', 500, 4),
    ('acc_wings_demon', 'Demon Wings', 'Dark bat-like wings', 'accessory', 'back', 'epic', 500, 4),
    ('acc_wings_phoenix', 'Phoenix Wings', 'Flaming feathers', 'accessory', 'back', 'legendary', 1000, 5),
    ('acc_tattoo_tribal', 'Tribal Markings', 'Ancient patterns', 'accessory', 'body', 'uncommon', 100, 2),
    ('acc_tattoo_flames', 'Flame Tattoos', 'Fire patterns', 'accessory', 'body', 'rare', 175, 2),
    ('acc_scars_battle', 'Battle Scars', 'Show your experience', 'accessory', 'body', 'rare', 150, 3)
    ON CONFLICT (item_key) DO NOTHING
  `);

  // Auras
  await query(`
    INSERT INTO spirit_animal_cosmetics (item_key, name, description, category, slot, rarity, base_price, stage_required) VALUES
    ('aura_glow_soft', 'Soft Glow', 'Gentle ambient light', 'aura', 'effect', 'uncommon', 200, 2),
    ('aura_glow_gold', 'Golden Aura', 'Warm golden radiance', 'aura', 'effect', 'rare', 350, 3),
    ('aura_particles_sparkle', 'Sparkle Trail', 'Glittering particles', 'aura', 'effect', 'rare', 300, 3),
    ('aura_flames', 'Flame Aura', 'Surrounded by fire', 'aura', 'effect', 'epic', 500, 4),
    ('aura_lightning', 'Lightning Aura', 'Crackling electricity', 'aura', 'effect', 'epic', 550, 4),
    ('aura_frost', 'Frost Aura', 'Cold mist swirling', 'aura', 'effect', 'epic', 500, 4),
    ('aura_shadow', 'Shadow Aura', 'Dark tendrils', 'aura', 'effect', 'epic', 525, 4),
    ('aura_rainbow', 'Rainbow Aura', 'Prismatic light', 'aura', 'effect', 'legendary', 800, 5),
    ('aura_cosmic', 'Cosmic Aura', 'Stars and galaxies orbit you', 'aura', 'effect', 'legendary', 1200, 6)
    ON CONFLICT (item_key) DO NOTHING
  `);

  // Emotes
  await query(`
    INSERT INTO spirit_animal_cosmetics (item_key, name, description, category, slot, rarity, base_price) VALUES
    ('emote_wave', 'Friendly Wave', 'Say hello!', 'emote', 'greeting', 'common', 50),
    ('emote_flex', 'Muscle Flex', 'Show off those gains', 'emote', 'celebration', 'common', 50),
    ('emote_dance_basic', 'Basic Dance', 'Get moving!', 'emote', 'dance', 'common', 75),
    ('emote_dance_victory', 'Victory Dance', 'You earned this', 'emote', 'dance', 'uncommon', 150),
    ('emote_backflip', 'Backflip', 'Impressive acrobatics', 'emote', 'trick', 'rare', 250),
    ('emote_meditate', 'Meditation', 'Inner peace', 'emote', 'idle', 'uncommon', 100),
    ('emote_roar', 'Mighty Roar', 'Assert dominance', 'emote', 'expression', 'rare', 200),
    ('emote_fireworks', 'Fireworks', 'Celebration explosion', 'emote', 'celebration', 'epic', 400),
    ('emote_champion_pose', 'Champion Pose', 'Strike a winning pose', 'emote', 'celebration', 'legendary', 600)
    ON CONFLICT (item_key) DO NOTHING
  `);

  // Achievement-locked items (not purchasable)
  await query(`
    INSERT INTO spirit_animal_cosmetics (item_key, name, description, category, slot, rarity, base_price, is_purchasable, achievement_required) VALUES
    ('badge_1000_workouts', 'Thousand Warrior Badge', 'Completed 1000 workouts', 'accessory', 'badge', 'legendary', 0, FALSE, 'workouts_1000'),
    ('badge_perfect_month', 'Perfect Month Star', 'Worked out every day for a month', 'accessory', 'badge', 'epic', 0, FALSE, 'perfect_month'),
    ('badge_early_adopter', 'Early Adopter Badge', 'Joined during beta', 'accessory', 'badge', 'rare', 0, FALSE, 'early_adopter'),
    ('crown_competition_gold', 'Competition Gold Crown', 'First place in competition', 'headwear', 'crown', 'legendary', 0, FALSE, 'competition_1st'),
    ('crown_competition_silver', 'Competition Silver Crown', 'Second place in competition', 'headwear', 'crown', 'epic', 0, FALSE, 'competition_2nd'),
    ('crown_competition_bronze', 'Competition Bronze Crown', 'Third place in competition', 'headwear', 'crown', 'rare', 0, FALSE, 'competition_3rd')
    ON CONFLICT (item_key) DO NOTHING
  `);

  // =====================================================
  // HELPER FUNCTIONS
  // =====================================================
  log.info('Creating helper functions...');

  // Get user's full Spirit Animal appearance
  await query(`
    CREATE OR REPLACE FUNCTION get_spirit_animal_appearance(p_user_id TEXT)
    RETURNS JSONB AS $$
    DECLARE
      v_loadout RECORD;
      v_result JSONB;
    BEGIN
      SELECT * INTO v_loadout FROM user_spirit_loadout WHERE user_id = p_user_id;

      IF NOT FOUND THEN
        RETURN jsonb_build_object('equipped', jsonb_build_object());
      END IF;

      v_result := jsonb_build_object(
        'equipped', jsonb_build_object(
          'skin', (SELECT row_to_json(c) FROM spirit_animal_cosmetics c WHERE c.id = v_loadout.skin_id),
          'eyes', (SELECT row_to_json(c) FROM spirit_animal_cosmetics c WHERE c.id = v_loadout.eyes_id),
          'outfit', (SELECT row_to_json(c) FROM spirit_animal_cosmetics c WHERE c.id = v_loadout.outfit_id),
          'headwear', (SELECT row_to_json(c) FROM spirit_animal_cosmetics c WHERE c.id = v_loadout.headwear_id),
          'footwear', (SELECT row_to_json(c) FROM spirit_animal_cosmetics c WHERE c.id = v_loadout.footwear_id),
          'accessory_1', (SELECT row_to_json(c) FROM spirit_animal_cosmetics c WHERE c.id = v_loadout.accessory_1_id),
          'accessory_2', (SELECT row_to_json(c) FROM spirit_animal_cosmetics c WHERE c.id = v_loadout.accessory_2_id),
          'accessory_3', (SELECT row_to_json(c) FROM spirit_animal_cosmetics c WHERE c.id = v_loadout.accessory_3_id),
          'aura', (SELECT row_to_json(c) FROM spirit_animal_cosmetics c WHERE c.id = v_loadout.aura_id),
          'emote_victory', (SELECT row_to_json(c) FROM spirit_animal_cosmetics c WHERE c.id = v_loadout.emote_victory_id),
          'emote_idle', (SELECT row_to_json(c) FROM spirit_animal_cosmetics c WHERE c.id = v_loadout.emote_idle_id),
          'background', (SELECT row_to_json(c) FROM spirit_animal_cosmetics c WHERE c.id = v_loadout.background_id)
        ),
        'updated_at', v_loadout.updated_at
      );

      RETURN v_result;
    END;
    $$ LANGUAGE plpgsql
  `);

  // Get today's shop rotation
  await query(`
    CREATE OR REPLACE FUNCTION get_todays_spirit_shop()
    RETURNS TABLE(
      slot_number INTEGER,
      cosmetic_id UUID,
      item_key VARCHAR(100),
      name VARCHAR(200),
      description TEXT,
      category VARCHAR(50),
      rarity VARCHAR(20),
      base_price INTEGER,
      discount_percent INTEGER,
      final_price INTEGER,
      is_featured BOOLEAN
    ) AS $$
    BEGIN
      RETURN QUERY
      SELECT
        r.slot_number,
        r.cosmetic_id,
        c.item_key,
        c.name,
        c.description,
        c.category,
        c.rarity,
        c.base_price,
        r.discount_percent,
        (c.base_price * (100 - r.discount_percent) / 100)::INTEGER AS final_price,
        r.is_featured
      FROM spirit_shop_rotation r
      JOIN spirit_animal_cosmetics c ON c.id = r.cosmetic_id
      WHERE r.rotation_date = CURRENT_DATE
      ORDER BY r.is_featured DESC, r.slot_number ASC;
    END;
    $$ LANGUAGE plpgsql
  `);

  // Check if user owns a cosmetic
  await query(`
    CREATE OR REPLACE FUNCTION user_owns_cosmetic(p_user_id TEXT, p_cosmetic_id UUID)
    RETURNS BOOLEAN AS $$
    BEGIN
      RETURN EXISTS(
        SELECT 1 FROM user_spirit_cosmetics
        WHERE user_id = p_user_id AND cosmetic_id = p_cosmetic_id
      );
    END;
    $$ LANGUAGE plpgsql
  `);

  // Initialize loadout for new users (triggered when companion state is created)
  await query(`
    CREATE OR REPLACE FUNCTION init_spirit_loadout()
    RETURNS TRIGGER AS $$
    BEGIN
      INSERT INTO user_spirit_loadout (user_id)
      VALUES (NEW.user_id)
      ON CONFLICT (user_id) DO NOTHING;

      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql
  `);

  // Create trigger for auto-initializing loadout
  await query(`
    DROP TRIGGER IF EXISTS trg_init_spirit_loadout ON user_companion_state
  `);

  await query(`
    CREATE TRIGGER trg_init_spirit_loadout
    AFTER INSERT ON user_companion_state
    FOR EACH ROW
    EXECUTE FUNCTION init_spirit_loadout()
  `);

  log.info('Migration 106_spirit_animal_wardrobe complete');
}

export async function down(): Promise<void> {
  log.info('Rolling back migration: 106_spirit_animal_wardrobe');

  await query(`DROP TRIGGER IF EXISTS trg_init_spirit_loadout ON user_companion_state`);
  await query(`DROP FUNCTION IF EXISTS init_spirit_loadout()`);
  await query(`DROP FUNCTION IF EXISTS user_owns_cosmetic(TEXT, UUID)`);
  await query(`DROP FUNCTION IF EXISTS get_todays_spirit_shop()`);
  await query(`DROP FUNCTION IF EXISTS get_spirit_animal_appearance(TEXT)`);

  await query(`DROP TABLE IF EXISTS spirit_cosmetic_gifts`);
  await query(`DROP TABLE IF EXISTS user_spirit_presets`);
  await query(`DROP TABLE IF EXISTS spirit_cosmetic_purchases`);
  await query(`DROP TABLE IF EXISTS spirit_shop_rotation`);
  await query(`DROP TABLE IF EXISTS user_spirit_loadout`);
  await query(`DROP TABLE IF EXISTS user_spirit_cosmetics`);
  await query(`DROP TABLE IF EXISTS spirit_animal_cosmetics`);

  log.info('Rollback 106_spirit_animal_wardrobe complete');
}
