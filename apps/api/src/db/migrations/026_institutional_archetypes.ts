/**
 * Migration: Institutional & Occupational Archetypes
 *
 * This migration extends archetypes with:
 * 1. archetype_categories - Categories for organizing archetypes
 * 2. pt_tests - Physical fitness test definitions
 * 3. pt_test_standards - Scoring standards per age/gender
 * 4. user_pt_results - User's PT test results
 * 5. Extends archetypes table with category and PT test config
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
  log.info('Running migration: 026_institutional_archetypes');

  // Create archetype_categories table
  if (!(await tableExists('archetype_categories'))) {
    log.info('Creating archetype_categories table...');
    await db.query(`
      CREATE TABLE archetype_categories (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        icon TEXT,
        display_order INTEGER DEFAULT 0
      )
    `);

    // Seed categories
    await db.query(`
      INSERT INTO archetype_categories (id, name, description, icon, display_order) VALUES
      ('general', 'General Fitness', 'General fitness archetypes for everyday athletes', 'dumbbell', 1),
      ('first_responder', 'First Responders', 'Police, Fire, EMS, and emergency services', 'shield', 2),
      ('military', 'Military', 'Armed forces and defense personnel', 'star', 3),
      ('sports', 'Sports', 'Sport-specific training archetypes', 'trophy', 4),
      ('occupational', 'Occupational', 'Job-specific physical requirements', 'briefcase', 5),
      ('rehabilitation', 'Rehabilitation', 'Recovery and rehabilitation focused', 'heart', 6)
      ON CONFLICT (id) DO NOTHING
    `);
  }

  // Add category column to archetypes if it doesn't exist
  if (await tableExists('archetypes')) {
    if (!(await columnExists('archetypes', 'category_id'))) {
      log.info('Adding category_id to archetypes table...');
      await db.query(`ALTER TABLE archetypes ADD COLUMN category_id TEXT REFERENCES archetype_categories(id) DEFAULT 'general'`);
    }
    if (!(await columnExists('archetypes', 'pt_test_id'))) {
      log.info('Adding pt_test_id to archetypes table...');
      await db.query(`ALTER TABLE archetypes ADD COLUMN pt_test_id TEXT`);
    }
    if (!(await columnExists('archetypes', 'institution'))) {
      log.info('Adding institution to archetypes table...');
      await db.query(`ALTER TABLE archetypes ADD COLUMN institution TEXT`);
    }
    if (!(await columnExists('archetypes', 'recommended_equipment'))) {
      log.info('Adding recommended_equipment to archetypes table...');
      await db.query(`ALTER TABLE archetypes ADD COLUMN recommended_equipment JSONB DEFAULT '[]'`);
    }
  }

  // Create pt_tests table
  if (!(await tableExists('pt_tests'))) {
    log.info('Creating pt_tests table...');
    await db.query(`
      CREATE TABLE pt_tests (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        institution TEXT,

        -- Test Components (JSONB array)
        components JSONB NOT NULL DEFAULT '[]',
        -- Example: [
        --   {"id": "pushups", "name": "Push-ups", "type": "reps", "duration_seconds": 60},
        --   {"id": "situps", "name": "Sit-ups", "type": "reps", "duration_seconds": 60},
        --   {"id": "run_1_5_mile", "name": "1.5 Mile Run", "type": "time", "distance_miles": 1.5}
        -- ]

        -- Scoring
        scoring_method TEXT DEFAULT 'points' CHECK (scoring_method IN ('points', 'pass_fail', 'percentile', 'category')),
        max_score INTEGER,
        passing_score INTEGER,

        -- Frequency
        test_frequency TEXT DEFAULT 'biannual' CHECK (test_frequency IN ('monthly', 'quarterly', 'biannual', 'annual')),

        -- Source
        source_url TEXT,
        last_updated DATE,

        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
  }

  // Create pt_test_standards table
  if (!(await tableExists('pt_test_standards'))) {
    log.info('Creating pt_test_standards table...');
    await db.query(`
      CREATE TABLE pt_test_standards (
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
        pt_test_id TEXT NOT NULL REFERENCES pt_tests(id) ON DELETE CASCADE,
        component_id TEXT NOT NULL,

        -- Demographics
        gender TEXT CHECK (gender IN ('male', 'female', 'any')),
        age_min INTEGER,
        age_max INTEGER,

        -- Standards (JSONB for flexible scoring)
        standards JSONB NOT NULL,
        -- Example for points-based:
        -- {"max_points": 100, "ranges": [{"min": 67, "max": null, "points": 100}, {"min": 60, "max": 66, "points": 90}, ...]}
        -- Example for pass/fail:
        -- {"passing_value": 42, "unit": "reps"}

        created_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(pt_test_id, component_id, gender, age_min, age_max)
      )
    `);
    await db.query(`CREATE INDEX idx_pt_standards_test ON pt_test_standards(pt_test_id)`);
  }

  // Create user_pt_results table
  if (!(await tableExists('user_pt_results'))) {
    log.info('Creating user_pt_results table...');
    await db.query(`
      CREATE TABLE user_pt_results (
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        pt_test_id TEXT NOT NULL REFERENCES pt_tests(id),

        -- Test Date
        test_date DATE NOT NULL,

        -- Results (JSONB for component scores)
        component_results JSONB NOT NULL,
        -- Example: {
        --   "pushups": {"value": 65, "points": 95},
        --   "situps": {"value": 70, "points": 100},
        --   "run_1_5_mile": {"value": 660, "points": 90}
        -- }

        -- Overall Score
        total_score INTEGER,
        passed BOOLEAN,
        category TEXT, -- e.g., "Excellent", "Good", "Satisfactory", "Needs Improvement"

        -- Context
        official BOOLEAN DEFAULT FALSE,
        location TEXT,
        proctor TEXT,
        notes TEXT,

        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    await db.query(`CREATE INDEX idx_pt_results_user ON user_pt_results(user_id, test_date DESC)`);
    await db.query(`CREATE INDEX idx_pt_results_test ON user_pt_results(pt_test_id)`);
  }

  // Seed institutional archetypes and PT tests
  log.info('Seeding institutional archetypes and PT tests...');

  // Army APFT
  await db.query(`
    INSERT INTO pt_tests (id, name, description, institution, components, scoring_method, max_score, passing_score)
    VALUES (
      'army_apft',
      'Army Physical Fitness Test (APFT)',
      'The standard physical fitness test for the U.S. Army',
      'U.S. Army',
      '[
        {"id": "pushups", "name": "Push-ups", "type": "reps", "duration_seconds": 120, "description": "Maximum push-ups in 2 minutes"},
        {"id": "situps", "name": "Sit-ups", "type": "reps", "duration_seconds": 120, "description": "Maximum sit-ups in 2 minutes"},
        {"id": "run_2_mile", "name": "2-Mile Run", "type": "time", "distance_miles": 2, "description": "Timed 2-mile run"}
      ]'::JSONB,
      'points',
      300,
      180
    )
    ON CONFLICT (id) DO NOTHING
  `);

  // Army ACFT
  await db.query(`
    INSERT INTO pt_tests (id, name, description, institution, components, scoring_method, max_score, passing_score)
    VALUES (
      'army_acft',
      'Army Combat Fitness Test (ACFT)',
      'The current combat fitness test for the U.S. Army',
      'U.S. Army',
      '[
        {"id": "deadlift", "name": "3 Repetition Maximum Deadlift", "type": "weight", "reps": 3},
        {"id": "power_throw", "name": "Standing Power Throw", "type": "distance", "implement": "10lb medicine ball"},
        {"id": "pushups", "name": "Hand Release Push-ups", "type": "reps", "duration_seconds": 120},
        {"id": "sprint_drag_carry", "name": "Sprint-Drag-Carry", "type": "time"},
        {"id": "plank", "name": "Plank", "type": "time"},
        {"id": "run_2_mile", "name": "2-Mile Run", "type": "time", "distance_miles": 2}
      ]'::JSONB,
      'points',
      600,
      360
    )
    ON CONFLICT (id) DO NOTHING
  `);

  // Marine Corps PFT
  await db.query(`
    INSERT INTO pt_tests (id, name, description, institution, components, scoring_method, max_score, passing_score)
    VALUES (
      'usmc_pft',
      'Marine Corps Physical Fitness Test (PFT)',
      'Physical fitness test for the U.S. Marine Corps',
      'U.S. Marine Corps',
      '[
        {"id": "pullups", "name": "Pull-ups", "type": "reps", "alternative": {"id": "pushups", "name": "Push-ups", "type": "reps", "duration_seconds": 120}},
        {"id": "crunches", "name": "Crunches", "type": "reps", "duration_seconds": 120, "alternative": {"id": "plank", "name": "Plank", "type": "time"}},
        {"id": "run_3_mile", "name": "3-Mile Run", "type": "time", "distance_miles": 3}
      ]'::JSONB,
      'points',
      300,
      150
    )
    ON CONFLICT (id) DO NOTHING
  `);

  // Navy PRT
  await db.query(`
    INSERT INTO pt_tests (id, name, description, institution, components, scoring_method, max_score, passing_score)
    VALUES (
      'navy_prt',
      'Navy Physical Readiness Test (PRT)',
      'Physical readiness test for the U.S. Navy',
      'U.S. Navy',
      '[
        {"id": "pushups", "name": "Push-ups", "type": "reps", "duration_seconds": 120, "alternative": {"id": "plank", "name": "Forearm Plank", "type": "time"}},
        {"id": "situps", "name": "Sit-ups", "type": "reps", "duration_seconds": 120},
        {"id": "run_1_5_mile", "name": "1.5-Mile Run", "type": "time", "distance_miles": 1.5, "alternatives": [{"id": "swim_500m", "name": "500m Swim"}, {"id": "bike_12min", "name": "12-Min Stationary Bike"}]}
      ]'::JSONB,
      'category',
      NULL,
      NULL
    )
    ON CONFLICT (id) DO NOTHING
  `);

  // Air Force PT Test
  await db.query(`
    INSERT INTO pt_tests (id, name, description, institution, components, scoring_method, max_score, passing_score)
    VALUES (
      'usaf_pt',
      'Air Force Physical Fitness Assessment',
      'Physical fitness assessment for the U.S. Air Force',
      'U.S. Air Force',
      '[
        {"id": "pushups", "name": "Push-ups", "type": "reps", "duration_seconds": 60},
        {"id": "situps", "name": "Sit-ups", "type": "reps", "duration_seconds": 60},
        {"id": "run_1_5_mile", "name": "1.5-Mile Run", "type": "time", "distance_miles": 1.5}
      ]'::JSONB,
      'points',
      100,
      75
    )
    ON CONFLICT (id) DO NOTHING
  `);

  // FBI PFT
  await db.query(`
    INSERT INTO pt_tests (id, name, description, institution, components, scoring_method, max_score, passing_score)
    VALUES (
      'fbi_pft',
      'FBI Physical Fitness Test',
      'Physical fitness test for FBI Special Agents',
      'FBI',
      '[
        {"id": "situps", "name": "Sit-ups", "type": "reps", "duration_seconds": 60},
        {"id": "sprint_300m", "name": "300-Meter Sprint", "type": "time"},
        {"id": "pushups", "name": "Push-ups", "type": "reps", "max_continuous": true},
        {"id": "run_1_5_mile", "name": "1.5-Mile Run", "type": "time", "distance_miles": 1.5}
      ]'::JSONB,
      'points',
      40,
      12
    )
    ON CONFLICT (id) DO NOTHING
  `);

  // CPAT (Firefighter)
  await db.query(`
    INSERT INTO pt_tests (id, name, description, institution, components, scoring_method, max_score, passing_score)
    VALUES (
      'cpat',
      'Candidate Physical Ability Test (CPAT)',
      'Standard physical ability test for firefighter candidates',
      'Fire Service',
      '[
        {"id": "stair_climb", "name": "Stair Climb", "type": "task", "description": "3 min stair climb with 75lb vest and 25lb shoulder weights"},
        {"id": "hose_drag", "name": "Hose Drag", "type": "task", "description": "Drag charged hose line"},
        {"id": "equipment_carry", "name": "Equipment Carry", "type": "task", "description": "Carry equipment up/down stairs"},
        {"id": "ladder_raise", "name": "Ladder Raise and Extension", "type": "task"},
        {"id": "forcible_entry", "name": "Forcible Entry", "type": "task", "description": "Simulate forcible entry with sledgehammer"},
        {"id": "search", "name": "Search", "type": "task", "description": "Crawl through dark maze"},
        {"id": "rescue", "name": "Rescue", "type": "task", "description": "Drag 165lb mannequin"},
        {"id": "ceiling_breach", "name": "Ceiling Breach and Pull", "type": "task"}
      ]'::JSONB,
      'pass_fail',
      NULL,
      NULL
    )
    ON CONFLICT (id) DO NOTHING
  `);

  // Police POPAT
  await db.query(`
    INSERT INTO pt_tests (id, name, description, institution, components, scoring_method, max_score, passing_score)
    VALUES (
      'popat',
      'Police Officer Physical Abilities Test',
      'General police officer physical abilities test',
      'Law Enforcement',
      '[
        {"id": "pushups", "name": "Push-ups", "type": "reps", "duration_seconds": 60},
        {"id": "situps", "name": "Sit-ups", "type": "reps", "duration_seconds": 60},
        {"id": "run_1_5_mile", "name": "1.5-Mile Run", "type": "time", "distance_miles": 1.5},
        {"id": "obstacle_course", "name": "Obstacle Course", "type": "time", "description": "Timed obstacle course simulating pursuit"}
      ]'::JSONB,
      'pass_fail',
      NULL,
      NULL
    )
    ON CONFLICT (id) DO NOTHING
  `);

  // Insert institutional archetypes
  await db.query(`
    INSERT INTO archetypes (id, name, description, category_id, pt_test_id, institution, focus_areas, recommended_equipment)
    VALUES
    -- Military
    ('army_soldier', 'Army Soldier', 'Training program aligned with U.S. Army fitness standards and ACFT requirements', 'military', 'army_acft', 'U.S. Army',
     '["strength", "endurance", "functional_fitness", "combat_readiness"]'::JSONB,
     '["barbell", "kettlebell", "medicine_ball", "pull_up_bar"]'::JSONB),

    ('marine', 'Marine', 'Training program aligned with U.S. Marine Corps PFT and CFT requirements', 'military', 'usmc_pft', 'U.S. Marine Corps',
     '["pull_ups", "running", "combat_fitness", "endurance"]'::JSONB,
     '["pull_up_bar", "ammo_cans", "running_shoes"]'::JSONB),

    ('navy_sailor', 'Navy Sailor', 'Training program aligned with Navy PRT standards', 'military', 'navy_prt', 'U.S. Navy',
     '["swimming", "endurance", "functional_strength"]'::JSONB,
     '["swimming_pool", "pull_up_bar"]'::JSONB),

    ('air_force', 'Air Force Airman', 'Training program aligned with Air Force PT standards', 'military', 'usaf_pt', 'U.S. Air Force',
     '["cardio", "muscular_endurance", "core_strength"]'::JSONB,
     '["running_shoes", "exercise_mat"]'::JSONB),

    -- First Responders
    ('firefighter', 'Firefighter', 'Training program for firefighter physical demands and CPAT preparation', 'first_responder', 'cpat', 'Fire Service',
     '["functional_strength", "endurance", "heat_tolerance", "task_specific"]'::JSONB,
     '["stair_climber", "weighted_vest", "sledgehammer", "pull_up_bar"]'::JSONB),

    ('police_officer', 'Police Officer', 'Training program for law enforcement physical fitness', 'first_responder', 'popat', 'Law Enforcement',
     '["sprinting", "endurance", "functional_strength", "agility"]'::JSONB,
     '["running_shoes", "agility_ladder", "pull_up_bar"]'::JSONB),

    ('ems_paramedic', 'EMT/Paramedic', 'Training for EMS physical demands including patient handling', 'first_responder', NULL, 'EMS',
     '["functional_strength", "back_health", "endurance", "flexibility"]'::JSONB,
     '["resistance_bands", "medicine_ball", "foam_roller"]'::JSONB),

    ('fbi_agent', 'FBI Special Agent', 'Training program for FBI PFT requirements', 'first_responder', 'fbi_pft', 'FBI',
     '["sprinting", "muscular_endurance", "running", "overall_fitness"]'::JSONB,
     '["running_shoes", "pull_up_bar", "exercise_mat"]'::JSONB)

    ON CONFLICT (id) DO UPDATE SET
      category_id = EXCLUDED.category_id,
      pt_test_id = EXCLUDED.pt_test_id,
      institution = EXCLUDED.institution
  `);

  log.info('Migration 026_institutional_archetypes complete');
}

export async function down(): Promise<void> {
  log.info('Rolling back migration: 026_institutional_archetypes');

  // Remove institutional archetypes
  await db.query(`DELETE FROM archetypes WHERE category_id IN ('military', 'first_responder')`);

  // Drop tables
  await db.query(`DROP TABLE IF EXISTS user_pt_results`);
  await db.query(`DROP TABLE IF EXISTS pt_test_standards`);
  await db.query(`DROP TABLE IF EXISTS pt_tests`);

  // Remove columns from archetypes
  if (await columnExists('archetypes', 'category_id')) {
    await db.query(`ALTER TABLE archetypes DROP COLUMN category_id`);
  }
  if (await columnExists('archetypes', 'pt_test_id')) {
    await db.query(`ALTER TABLE archetypes DROP COLUMN pt_test_id`);
  }
  if (await columnExists('archetypes', 'institution')) {
    await db.query(`ALTER TABLE archetypes DROP COLUMN institution`);
  }

  await db.query(`DROP TABLE IF EXISTS archetype_categories`);

  log.info('Rollback 026_institutional_archetypes complete');
}

export const migrate = up;
