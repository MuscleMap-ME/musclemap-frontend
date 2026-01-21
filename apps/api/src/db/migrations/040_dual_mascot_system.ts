// DESTRUCTIVE: Schema modification for dual mascot system - contains DROP/TRUNCATE operations
/**
 * Migration: Dual Mascot System
 *
 * Creates tables for:
 * 1. Global Site Mascot (TЯIPTθMΞAN Spirit) - static, site-wide
 * 2. User Companion Creatures - per-user, evolving
 *
 * The two mascot types are distinct:
 * - Global Mascot: Abstract cosmic symbol, brand identity, non-evolving
 * - User Companion: Personal creature that grows with user progress
 */

import { db } from '../client';
import { loggers } from '../../lib/logger';

const log = loggers.db;

async function tableExists(tableName: string): Promise<boolean> {
  const result = await db.queryOne<{ count: string }>(
    `SELECT COUNT(*) as count FROM information_schema.tables
     WHERE table_name = $1`,
    [tableName]
  );
  return parseInt(result?.count || '0') > 0;
}

export async function up(): Promise<void> {
  log.info('Running migration: 040_dual_mascot_system');

  // =====================================================
  // GLOBAL MASCOT CONFIG (site-wide, static, not per-user)
  // =====================================================

  if (!(await tableExists('global_mascot_config'))) {
    log.info('Creating global_mascot_config table...');
    await db.query(`
      CREATE TABLE global_mascot_config (
        id TEXT PRIMARY KEY DEFAULT 'triptomean-spirit',
        name TEXT NOT NULL DEFAULT 'TЯIPTθMΞAN Spirit',
        tagline TEXT DEFAULT 'A Magnum Opus Sung as a Swan Song',
        description TEXT,
        ecosystem_url TEXT DEFAULT 'https://triptomean.com',
        ecosystem_about_url TEXT DEFAULT 'https://triptomean.com/ABOUT',
        ecosystem_sections JSONB DEFAULT '["SCIENCE","ART","POETRY","LINKS","Rχ","ABOUT"]',
        asset_3d_url TEXT,
        asset_2d_url TEXT DEFAULT '/mascot/global/ttm-spirit.svg',
        asset_static_url TEXT DEFAULT '/mascot/global/ttm-spirit.png',
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    // Insert default config
    await db.query(`
      INSERT INTO global_mascot_config (id)
      VALUES ('triptomean-spirit')
      ON CONFLICT (id) DO NOTHING
    `);
  }

  // =====================================================
  // GLOBAL MASCOT PLACEMENTS
  // =====================================================

  if (!(await tableExists('global_mascot_placements'))) {
    log.info('Creating global_mascot_placements table...');
    await db.query(`
      CREATE TABLE global_mascot_placements (
        id TEXT PRIMARY KEY,
        location TEXT NOT NULL,
        enabled BOOLEAN DEFAULT TRUE,
        animation_state TEXT DEFAULT 'idle',
        size TEXT DEFAULT 'medium',
        config JSONB DEFAULT '{}',
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    await db.query(`CREATE INDEX idx_global_mascot_placements_location ON global_mascot_placements(location)`);
    await db.query(`CREATE INDEX idx_global_mascot_placements_enabled ON global_mascot_placements(enabled)`);

    // Insert default placements
    await db.query(`
      INSERT INTO global_mascot_placements (id, location, size, animation_state) VALUES
        ('hero-main', 'hero', 'large', 'idle'),
        ('loading-global', 'loading', 'medium', 'loading'),
        ('onboarding-welcome', 'onboarding', 'large', 'greeting'),
        ('error-404', '404', 'medium', 'contemplating'),
        ('about-panel', 'about', 'small', 'idle')
      ON CONFLICT (id) DO NOTHING
    `);
  }

  // =====================================================
  // COMPANION TEMPLATES
  // =====================================================

  if (!(await tableExists('companion_templates'))) {
    log.info('Creating companion_templates table...');
    await db.query(`
      CREATE TABLE companion_templates (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        archetype TEXT,
        rive_asset_url TEXT,
        static_assets JSONB DEFAULT '{}',
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    // Insert default template
    await db.query(`
      INSERT INTO companion_templates (id, name, description, archetype)
      VALUES ('default', 'Training Spirit', 'Your personal companion that grows with your journey', 'general')
      ON CONFLICT (id) DO NOTHING
    `);
  }

  // =====================================================
  // USER COMPANION STATE (per-user, evolving)
  // =====================================================

  if (!(await tableExists('user_companion_state'))) {
    log.info('Creating user_companion_state table...');
    await db.query(`
      CREATE TABLE user_companion_state (
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
        user_id TEXT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
        template_id TEXT NOT NULL DEFAULT 'default' REFERENCES companion_templates(id),
        nickname TEXT,
        stage INTEGER DEFAULT 1 CHECK (stage >= 1 AND stage <= 6),
        xp INTEGER DEFAULT 0 CHECK (xp >= 0),
        unlocked_upgrades JSONB DEFAULT '[]',
        equipped_cosmetics JSONB DEFAULT '{}',
        abilities JSONB DEFAULT '[]',
        is_visible BOOLEAN DEFAULT TRUE,
        is_minimized BOOLEAN DEFAULT FALSE,
        sounds_enabled BOOLEAN DEFAULT TRUE,
        tips_enabled BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    await db.query(`CREATE INDEX idx_companion_state_user ON user_companion_state(user_id)`);
    await db.query(`CREATE INDEX idx_companion_state_stage ON user_companion_state(stage)`);
  }

  // =====================================================
  // COMPANION UPGRADES
  // =====================================================

  if (!(await tableExists('companion_upgrades'))) {
    log.info('Creating companion_upgrades table...');
    await db.query(`
      CREATE TABLE companion_upgrades (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        category TEXT NOT NULL CHECK (category IN ('aura', 'armor', 'wings', 'tools', 'badge', 'ability')),
        cost_units INTEGER NOT NULL DEFAULT 100,
        prerequisite_stage INTEGER DEFAULT 1,
        prerequisite_upgrades JSONB DEFAULT '[]',
        visual_asset_url TEXT,
        ability_flag TEXT,
        rarity TEXT DEFAULT 'common' CHECK (rarity IN ('common', 'rare', 'epic', 'legendary')),
        sort_order INTEGER DEFAULT 0,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    await db.query(`CREATE INDEX idx_companion_upgrades_category ON companion_upgrades(category)`);
    await db.query(`CREATE INDEX idx_companion_upgrades_rarity ON companion_upgrades(rarity)`);

    // Seed upgrades
    log.info('Seeding companion upgrades...');
    await db.query(`
      INSERT INTO companion_upgrades (id, name, description, category, cost_units, prerequisite_stage, rarity, sort_order, ability_flag) VALUES
        -- Auras
        ('aura-gold', 'Golden Radiance', 'Shimmering gold glow', 'aura', 50, 1, 'common', 1, NULL),
        ('aura-ember', 'Ember Pulse', 'Warm red-orange energy', 'aura', 75, 2, 'common', 2, NULL),
        ('aura-frost', 'Frost Shimmer', 'Cool crystalline particles', 'aura', 75, 2, 'common', 3, NULL),
        ('aura-shadow', 'Shadow Veil', 'Mysterious dark wisps', 'aura', 150, 3, 'rare', 4, NULL),
        ('aura-cosmic', 'Cosmic Halo', 'Orbiting stars and galaxies', 'aura', 500, 5, 'epic', 5, NULL),
        -- Armor
        ('armor-vest', 'Training Vest', 'Light athletic protection', 'armor', 100, 2, 'common', 10, NULL),
        ('armor-plate', 'Plate Mail', 'Heavy duty plating', 'armor', 300, 3, 'rare', 11, NULL),
        ('armor-crystal', 'Crystal Shell', 'Translucent crystalline armor', 'armor', 600, 4, 'epic', 12, NULL),
        ('armor-mythic', 'Mythic Aegis', 'Legendary ancient armor', 'armor', 1000, 5, 'legendary', 13, NULL),
        -- Wings
        ('wings-fledgling', 'Fledgling Wings', 'Small decorative wings', 'wings', 200, 3, 'rare', 20, NULL),
        ('wings-seraphim', 'Seraphim Plumes', 'Majestic feathered wings', 'wings', 500, 4, 'epic', 21, NULL),
        ('wings-dragon', 'Dragon Pinions', 'Powerful draconic wings', 'wings', 800, 5, 'epic', 22, NULL),
        ('wings-astral', 'Astral Wings', 'Ethereal star-dusted light', 'wings', 1500, 6, 'legendary', 23, NULL),
        -- Tools
        ('tool-slate', 'Stats Slate', 'Workout statistics overlay', 'tools', 150, 2, 'common', 30, NULL),
        ('tool-trophy', 'Trophy Case', 'Achievement display', 'tools', 200, 3, 'rare', 31, NULL),
        ('tool-orb', 'Focus Orb', 'Recovery insights', 'tools', 250, 3, 'rare', 32, NULL),
        -- Badges (awarded, cost 0)
        ('badge-streak-7', 'Week Warrior', '7-day streak badge', 'badge', 0, 1, 'common', 40, NULL),
        ('badge-streak-30', 'Monthly Master', '30-day streak badge', 'badge', 0, 2, 'rare', 41, NULL),
        ('badge-pr', 'Record Breaker', 'PR achievement badge', 'badge', 0, 2, 'rare', 42, NULL),
        -- Abilities
        ('ability-tips', 'Sage Wisdom', 'Unlocks training tips', 'ability', 300, 3, 'rare', 50, 'coach_tips'),
        ('ability-social', 'Community Link', 'Social introductions', 'ability', 500, 4, 'epic', 51, 'social_link'),
        ('ability-insight', 'Deep Sight', 'Advanced analytics', 'ability', 400, 4, 'epic', 52, 'deep_sight')
      ON CONFLICT (id) DO NOTHING
    `);
  }

  // =====================================================
  // COMPANION EVENTS
  // =====================================================

  if (!(await tableExists('companion_events'))) {
    log.info('Creating companion_events table...');
    await db.query(`
      CREATE TABLE companion_events (
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        event_type TEXT NOT NULL,
        event_data JSONB DEFAULT '{}',
        xp_awarded INTEGER DEFAULT 0,
        units_awarded INTEGER DEFAULT 0,
        reaction_shown BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    await db.query(`CREATE INDEX idx_companion_events_user ON companion_events(user_id, created_at DESC)`);
    await db.query(`CREATE INDEX idx_companion_events_unreacted ON companion_events(user_id, reaction_shown) WHERE reaction_shown = FALSE`);
  }

  // =====================================================
  // COMPANION TIPS LOG
  // =====================================================

  if (!(await tableExists('companion_tips_log'))) {
    log.info('Creating companion_tips_log table...');
    await db.query(`
      CREATE TABLE companion_tips_log (
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        tip_id TEXT NOT NULL,
        shown_at TIMESTAMPTZ DEFAULT NOW(),
        dismissed BOOLEAN DEFAULT FALSE
      )
    `);

    await db.query(`CREATE INDEX idx_companion_tips_user ON companion_tips_log(user_id)`);
    await db.query(`CREATE INDEX idx_companion_tips_tip ON companion_tips_log(tip_id)`);
  }

  log.info('Migration 040_dual_mascot_system complete');
}

export async function down(): Promise<void> {
  log.info('Rolling back migration: 040_dual_mascot_system');

  // Drop tables in reverse order of dependencies
  await db.query(`DROP TABLE IF EXISTS companion_tips_log`);
  await db.query(`DROP TABLE IF EXISTS companion_events`);
  await db.query(`DROP TABLE IF EXISTS user_companion_state`);
  await db.query(`DROP TABLE IF EXISTS companion_upgrades`);
  await db.query(`DROP TABLE IF EXISTS companion_templates`);
  await db.query(`DROP TABLE IF EXISTS global_mascot_placements`);
  await db.query(`DROP TABLE IF EXISTS global_mascot_config`);

  log.info('Rollback 040_dual_mascot_system complete');
}

export const migrate = up;
