/**
 * Migration: User Onboarding & Location-Based Equipment Tracking
 *
 * This migration creates tables for:
 * 1. Physical profile extension (height, weight, DOB, units)
 * 2. Equipment types reference table
 * 3. Location equipment (crowd-sourced equipment at gyms/parks)
 * 4. Equipment reports (individual user reports)
 * 5. User home equipment (personal gym equipment)
 *
 * Trust Model:
 * - Equipment is verified when 3+ users report it as present
 * - Users can report equipment as present or absent
 * - Consensus drives verification status
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

async function columnExists(tableName: string, columnName: string): Promise<boolean> {
  const result = await db.queryOne<{ count: string }>(
    `SELECT COUNT(*) as count FROM information_schema.columns
     WHERE table_name = $1 AND column_name = $2`,
    [tableName, columnName]
  );
  return parseInt(result?.count || '0') > 0;
}

export async function up(): Promise<void> {
  log.info('Running migration: 022_onboarding_equipment');

  // =====================
  // 1. Extend user_profile_extended with physical profile fields
  // =====================
  if (await tableExists('user_profile_extended')) {
    // Add date_of_birth if not exists
    if (!(await columnExists('user_profile_extended', 'date_of_birth'))) {
      log.info('Adding date_of_birth column to user_profile_extended...');
      await db.query(`
        ALTER TABLE user_profile_extended
        ADD COLUMN date_of_birth DATE
      `);
    }

    // Add height fields (metric and imperial)
    if (!(await columnExists('user_profile_extended', 'height_cm'))) {
      log.info('Adding height columns to user_profile_extended...');
      await db.query(`
        ALTER TABLE user_profile_extended
        ADD COLUMN height_cm NUMERIC(5,1),
        ADD COLUMN height_ft INT,
        ADD COLUMN height_in NUMERIC(4,1)
      `);
    }

    // Add weight fields (metric and imperial)
    if (!(await columnExists('user_profile_extended', 'weight_kg'))) {
      log.info('Adding weight columns to user_profile_extended...');
      await db.query(`
        ALTER TABLE user_profile_extended
        ADD COLUMN weight_kg NUMERIC(5,1),
        ADD COLUMN weight_lbs NUMERIC(5,1)
      `);
    }

    // Add preferred_units if not exists
    if (!(await columnExists('user_profile_extended', 'preferred_units'))) {
      log.info('Adding preferred_units column to user_profile_extended...');
      await db.query(`
        ALTER TABLE user_profile_extended
        ADD COLUMN preferred_units TEXT DEFAULT 'metric'
        CHECK (preferred_units IN ('metric', 'imperial'))
      `);
    }

    // Add onboarding_completed_at if not exists
    if (!(await columnExists('user_profile_extended', 'onboarding_completed_at'))) {
      log.info('Adding onboarding_completed_at column to user_profile_extended...');
      await db.query(`
        ALTER TABLE user_profile_extended
        ADD COLUMN onboarding_completed_at TIMESTAMPTZ
      `);
    }
  } else {
    // Create user_profile_extended if it doesn't exist
    log.info('Creating user_profile_extended table with physical profile fields...');
    await db.query(`
      CREATE TABLE user_profile_extended (
        user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
        gender TEXT CHECK (gender IN ('male', 'female', 'non_binary', 'prefer_not_to_say')),
        date_of_birth DATE,
        height_cm NUMERIC(5,1),
        height_ft INT,
        height_in NUMERIC(4,1),
        weight_kg NUMERIC(5,1),
        weight_lbs NUMERIC(5,1),
        preferred_units TEXT DEFAULT 'metric' CHECK (preferred_units IN ('metric', 'imperial')),
        city TEXT,
        county TEXT,
        state TEXT,
        country TEXT,
        country_code TEXT,
        leaderboard_opt_in BOOLEAN DEFAULT TRUE,
        profile_visibility TEXT DEFAULT 'public' CHECK (profile_visibility IN ('public', 'friends', 'private')),
        onboarding_completed_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
  }

  // =====================
  // 2. Create equipment_types reference table
  // =====================
  if (!(await tableExists('equipment_types'))) {
    log.info('Creating equipment_types table...');
    await db.query(`
      CREATE TABLE equipment_types (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        category TEXT NOT NULL,
        description TEXT,
        icon_url TEXT,
        display_order INT DEFAULT 0,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    // Seed default equipment types
    log.info('Seeding equipment_types...');
    await db.query(`
      INSERT INTO equipment_types (id, name, category, description, display_order) VALUES
        -- Bars & Racks
        ('pullup_bar', 'Pull-up Bar', 'bars', 'Horizontal bar for pull-ups and chin-ups', 1),
        ('dip_bars', 'Dip Bars / Parallel Bars', 'bars', 'Parallel bars for dips and support exercises', 2),
        ('power_rack', 'Power Rack / Squat Rack', 'bars', 'Rack for squats, bench press, and barbell exercises', 3),
        ('smith_machine', 'Smith Machine', 'bars', 'Guided barbell machine for various exercises', 4),

        -- Free Weights
        ('dumbbells', 'Dumbbells', 'free_weights', 'Adjustable or fixed dumbbells', 10),
        ('barbells', 'Barbells', 'free_weights', 'Olympic or standard barbells', 11),
        ('kettlebells', 'Kettlebells', 'free_weights', 'Cast iron kettlebells', 12),
        ('weight_plates', 'Weight Plates', 'free_weights', 'Olympic or standard weight plates', 13),
        ('ez_curl_bar', 'EZ Curl Bar', 'free_weights', 'Curved barbell for bicep curls', 14),

        -- Benches
        ('flat_bench', 'Flat Bench', 'benches', 'Flat weight bench', 20),
        ('adjustable_bench', 'Adjustable Bench', 'benches', 'Incline/decline adjustable bench', 21),
        ('preacher_bench', 'Preacher Curl Bench', 'benches', 'Bench for isolated bicep curls', 22),

        -- Cardio
        ('treadmill', 'Treadmill', 'cardio', 'Running machine', 30),
        ('elliptical', 'Elliptical', 'cardio', 'Low-impact cardio machine', 31),
        ('stationary_bike', 'Stationary Bike', 'cardio', 'Indoor cycling bike', 32),
        ('rowing_machine', 'Rowing Machine', 'cardio', 'Indoor rower / erg', 33),
        ('stair_climber', 'Stair Climber', 'cardio', 'Stair stepping machine', 34),

        -- Cable & Machines
        ('cable_machine', 'Cable Machine', 'machines', 'Adjustable cable pulley system', 40),
        ('lat_pulldown', 'Lat Pulldown Machine', 'machines', 'Machine for lat pulldowns', 41),
        ('leg_press', 'Leg Press', 'machines', 'Machine for leg pressing', 42),
        ('leg_curl', 'Leg Curl Machine', 'machines', 'Machine for hamstring curls', 43),
        ('leg_extension', 'Leg Extension Machine', 'machines', 'Machine for quad extensions', 44),
        ('chest_press', 'Chest Press Machine', 'machines', 'Machine for chest pressing', 45),
        ('shoulder_press', 'Shoulder Press Machine', 'machines', 'Machine for shoulder pressing', 46),
        ('pec_deck', 'Pec Deck / Chest Fly', 'machines', 'Machine for chest flyes', 47),

        -- Bodyweight & Calisthenics
        ('gymnastics_rings', 'Gymnastics Rings', 'bodyweight', 'Suspended rings for calisthenics', 50),
        ('resistance_bands', 'Resistance Bands', 'bodyweight', 'Elastic bands for resistance training', 51),
        ('ab_wheel', 'Ab Wheel', 'bodyweight', 'Roller for core exercises', 52),
        ('yoga_mat', 'Yoga / Exercise Mat', 'bodyweight', 'Mat for floor exercises', 53),
        ('foam_roller', 'Foam Roller', 'bodyweight', 'Self-massage and mobility tool', 54),

        -- Outdoor / Park
        ('monkey_bars', 'Monkey Bars', 'outdoor', 'Horizontal ladder bars', 60),
        ('climbing_wall', 'Climbing Wall', 'outdoor', 'Rock climbing or bouldering wall', 61),
        ('outdoor_gym', 'Outdoor Gym Station', 'outdoor', 'Multi-station outdoor exercise equipment', 62),
        ('running_track', 'Running Track', 'outdoor', 'Dedicated running track', 63),

        -- Specialty
        ('battle_ropes', 'Battle Ropes', 'specialty', 'Heavy ropes for conditioning', 70),
        ('sled', 'Sled / Prowler', 'specialty', 'Pushing/pulling sled', 71),
        ('box_jump', 'Plyo Box', 'specialty', 'Box for jump training', 72),
        ('trx', 'TRX / Suspension Trainer', 'specialty', 'Suspension training system', 73),
        ('medicine_ball', 'Medicine Ball', 'specialty', 'Weighted ball for training', 74),
        ('sandbag', 'Sandbag', 'specialty', 'Weighted bag for functional training', 75)
      ON CONFLICT (id) DO NOTHING
    `);
  }

  // =====================
  // 3. Create location_equipment table (aggregated equipment per location)
  // =====================
  if (!(await tableExists('location_equipment'))) {
    log.info('Creating location_equipment table...');
    await db.query(`
      CREATE TABLE location_equipment (
        id SERIAL PRIMARY KEY,
        hangout_id TEXT NOT NULL REFERENCES hangouts(id) ON DELETE CASCADE,
        equipment_type_id TEXT NOT NULL REFERENCES equipment_types(id) ON DELETE CASCADE,
        confirmed_count INT DEFAULT 0,
        denied_count INT DEFAULT 0,
        is_verified BOOLEAN DEFAULT FALSE,
        first_reported_at TIMESTAMPTZ DEFAULT NOW(),
        last_reported_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE (hangout_id, equipment_type_id)
      )
    `);

    await db.query(`
      CREATE INDEX idx_location_equipment_hangout ON location_equipment(hangout_id);
      CREATE INDEX idx_location_equipment_verified ON location_equipment(is_verified) WHERE is_verified = TRUE;
    `);
  }

  // =====================
  // 4. Create equipment_reports table (individual user reports)
  // =====================
  if (!(await tableExists('equipment_reports'))) {
    log.info('Creating equipment_reports table...');
    await db.query(`
      CREATE TABLE equipment_reports (
        id SERIAL PRIMARY KEY,
        hangout_id TEXT NOT NULL REFERENCES hangouts(id) ON DELETE CASCADE,
        equipment_type_id TEXT NOT NULL REFERENCES equipment_types(id) ON DELETE CASCADE,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        report_type TEXT NOT NULL CHECK (report_type IN ('present', 'absent')),
        notes TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE (hangout_id, equipment_type_id, user_id)
      )
    `);

    await db.query(`
      CREATE INDEX idx_equipment_reports_hangout ON equipment_reports(hangout_id);
      CREATE INDEX idx_equipment_reports_user ON equipment_reports(user_id);
    `);
  }

  // =====================
  // 5. Create user_home_equipment table (home gym equipment)
  // =====================
  if (!(await tableExists('user_home_equipment'))) {
    log.info('Creating user_home_equipment table...');
    await db.query(`
      CREATE TABLE user_home_equipment (
        id SERIAL PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        equipment_type_id TEXT NOT NULL REFERENCES equipment_types(id) ON DELETE CASCADE,
        location_type TEXT DEFAULT 'home' CHECK (location_type IN ('home', 'work', 'other')),
        notes TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE (user_id, equipment_type_id, location_type)
      )
    `);

    await db.query(`
      CREATE INDEX idx_user_home_equipment_user ON user_home_equipment(user_id);
    `);
  }

  log.info('Migration 022_onboarding_equipment complete');
}

export async function down(): Promise<void> {
  log.info('Rolling back migration: 022_onboarding_equipment');

  // Drop tables in reverse order (respecting foreign keys)
  await db.query(`DROP TABLE IF EXISTS user_home_equipment`);
  await db.query(`DROP TABLE IF EXISTS equipment_reports`);
  await db.query(`DROP TABLE IF EXISTS location_equipment`);
  await db.query(`DROP TABLE IF EXISTS equipment_types`);

  // Remove added columns from user_profile_extended
  if (await tableExists('user_profile_extended')) {
    for (const col of [
      'date_of_birth',
      'height_cm',
      'height_ft',
      'height_in',
      'weight_kg',
      'weight_lbs',
      'preferred_units',
      'onboarding_completed_at',
    ]) {
      if (await columnExists('user_profile_extended', col)) {
        await db.query(`ALTER TABLE user_profile_extended DROP COLUMN ${col}`);
      }
    }
  }

  log.info('Rollback 022_onboarding_equipment complete');
}

// For compatibility with migrate runner
export const migrate = up;
