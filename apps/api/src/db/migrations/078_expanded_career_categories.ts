// DESTRUCTIVE: Schema modification for expanded career categories - contains DROP/TRUNCATE operations
// SQL-SAFE: Template literals contain static SQL only, no external input
/**
 * Migration 078: Expanded Career Categories
 *
 * Updates the career standards category taxonomy to support all new profession types:
 * - Creates a reference table for category metadata (career_standard_categories)
 * - Expands the pt_tests.category CHECK constraint to include new categories
 * - Adds hierarchical support via parent_category
 *
 * New categories added:
 * - ems_paramedic - EMS and Paramedic roles
 * - corrections - Corrections officers
 * - park_ranger - Park rangers and wildlife officers
 * - lifeguard - Lifeguards and aquatic safety
 * - transportation - CDL drivers, TSA, transit operators
 * - trades_construction - Construction and trade workers
 * - public_service - Postal workers, sanitation, public works
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

export async function migrate(): Promise<void> {
  log.info('Running migration: 078_expanded_career_categories');

  // ============================================
  // CREATE CAREER STANDARD CATEGORIES TABLE
  // ============================================

  if (!(await tableExists('career_standard_categories'))) {
    log.info('Creating career_standard_categories table...');
    await db.query(`
      CREATE TABLE IF NOT EXISTS career_standard_categories (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        icon TEXT,
        color TEXT,
        sort_order INTEGER DEFAULT 0,
        parent_category TEXT REFERENCES career_standard_categories(id),
        active BOOLEAN DEFAULT true,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    // Index for active categories lookup
    await db.query(`CREATE INDEX IF NOT EXISTS idx_career_categories_active ON career_standard_categories(active, sort_order)`);
    await db.query(`CREATE INDEX IF NOT EXISTS idx_career_categories_parent ON career_standard_categories(parent_category)`);
  }

  // ============================================
  // INSERT ALL CATEGORY METADATA
  // ============================================

  log.info('Inserting career standard categories...');

  const categories = [
    {
      id: 'firefighter',
      name: 'Firefighter',
      description: 'Municipal, wildland, and structural firefighters',
      icon: 'flame',
      color: '#FF6B00',
      sort_order: 1
    },
    {
      id: 'ems_paramedic',
      name: 'EMS & Paramedic',
      description: 'Emergency Medical Services, paramedics, and EMTs',
      icon: 'ambulance',
      color: '#DC2626',
      sort_order: 2
    },
    {
      id: 'military',
      name: 'Military',
      description: 'Active duty, reserve, and guard service members across all branches',
      icon: 'star',
      color: '#16A34A',
      sort_order: 3
    },
    {
      id: 'law_enforcement',
      name: 'Law Enforcement',
      description: 'Police officers, federal agents, sheriffs, and state troopers',
      icon: 'badge',
      color: '#2563EB',
      sort_order: 4
    },
    {
      id: 'corrections',
      name: 'Corrections',
      description: 'Corrections officers, detention officers, and probation officers',
      icon: 'building',
      color: '#6B7280',
      sort_order: 5
    },
    {
      id: 'park_ranger',
      name: 'Park Ranger',
      description: 'Park rangers, wildlife officers, and conservation enforcement',
      icon: 'tree-pine',
      color: '#15803D',
      sort_order: 6
    },
    {
      id: 'lifeguard',
      name: 'Lifeguard',
      description: 'Lifeguards, ocean rescue, and aquatic safety personnel',
      icon: 'life-buoy',
      color: '#06B6D4',
      sort_order: 7
    },
    {
      id: 'special_operations',
      name: 'Special Operations',
      description: 'Special forces, tactical teams, and elite military units',
      icon: 'target',
      color: '#171717',
      sort_order: 8
    },
    {
      id: 'transportation',
      name: 'Transportation & DOT',
      description: 'CDL drivers, TSA agents, transit operators, and DOT personnel',
      icon: 'truck',
      color: '#EAB308',
      sort_order: 9
    },
    {
      id: 'trades_construction',
      name: 'Trades & Construction',
      description: 'Construction workers, electricians, plumbers, and skilled trades',
      icon: 'hard-hat',
      color: '#F97316',
      sort_order: 10
    },
    {
      id: 'public_service',
      name: 'Public Service',
      description: 'Postal workers, sanitation workers, and public works employees',
      icon: 'landmark',
      color: '#1E3A5F',
      sort_order: 11
    },
    {
      id: 'civil_service',
      name: 'Civil Service',
      description: 'General civil service fitness requirements',
      icon: 'briefcase',
      color: '#4B5563',
      sort_order: 12
    },
    {
      id: 'general',
      name: 'General Fitness',
      description: 'General fitness standards not tied to a specific profession',
      icon: 'activity',
      color: '#8B5CF6',
      sort_order: 99
    }
  ];

  for (const category of categories) {
    await db.query(`
      INSERT INTO career_standard_categories (id, name, description, icon, color, sort_order)
      VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        description = EXCLUDED.description,
        icon = EXCLUDED.icon,
        color = EXCLUDED.color,
        sort_order = EXCLUDED.sort_order,
        updated_at = NOW()
    `, [category.id, category.name, category.description, category.icon, category.color, category.sort_order]);
  }

  // ============================================
  // UPDATE PT_TESTS CATEGORY CONSTRAINT
  // ============================================

  if (await tableExists('pt_tests')) {
    log.info('Updating pt_tests category constraint...');

    // Find and drop the existing CHECK constraint on category column
    // PostgreSQL auto-generates constraint names, so we need to find it
    const constraintResult = await db.queryOne<{ constraint_name: string }>(`
      SELECT con.conname as constraint_name
      FROM pg_constraint con
      JOIN pg_class rel ON rel.oid = con.conrelid
      JOIN pg_attribute att ON att.attrelid = rel.oid AND att.attnum = ANY(con.conkey)
      WHERE rel.relname = 'pt_tests'
        AND att.attname = 'category'
        AND con.contype = 'c'
    `);

    if (constraintResult?.constraint_name) {
      log.info(`Dropping existing constraint: ${constraintResult.constraint_name}`);
      await db.query(`ALTER TABLE pt_tests DROP CONSTRAINT IF EXISTS "${constraintResult.constraint_name}"`);
    }

    // Add the new, expanded CHECK constraint
    log.info('Adding expanded category constraint...');
    await db.query(`
      ALTER TABLE pt_tests
      ADD CONSTRAINT pt_tests_category_check
      CHECK (category IN (
        'military',
        'firefighter',
        'law_enforcement',
        'special_operations',
        'civil_service',
        'general',
        'ems_paramedic',
        'corrections',
        'park_ranger',
        'lifeguard',
        'transportation',
        'trades_construction',
        'public_service'
      ))
    `);

    // Also add a foreign key to the categories table (optional, for data integrity)
    // Note: We don't enforce this as FK since some old tests might have NULL category
    log.info('Creating index for pt_tests category lookup...');
    await db.query(`CREATE INDEX IF NOT EXISTS idx_pt_tests_category ON pt_tests(category)`);
  }

  // ============================================
  // SEED SAMPLE PT TESTS FOR NEW CATEGORIES
  // ============================================

  log.info('Seeding sample PT tests for new categories...');

  // EMS/Paramedic Fitness Test
  await db.query(`
    INSERT INTO pt_tests (id, name, description, institution, category, components, scoring_method, icon, recertification_months, active)
    VALUES (
      'nremt_fitness',
      'NREMT Physical Fitness Standards',
      'Physical fitness standards for National Registry of Emergency Medical Technicians certification',
      'NREMT',
      'ems_paramedic',
      '[
        {"id": "stretcher_carry", "name": "Stretcher Carry (100ft)", "type": "pass_fail", "description": "Carry loaded stretcher with partner"},
        {"id": "stair_climb", "name": "Stair Climb (3 flights)", "type": "pass_fail", "description": "Climb stairs with equipment bag"},
        {"id": "patient_move", "name": "Patient Move", "type": "pass_fail", "description": "Move patient from bed to stretcher"},
        {"id": "cpr_stamina", "name": "CPR Stamina (2 min)", "type": "pass_fail", "duration_seconds": 120}
      ]'::JSONB,
      'pass_fail',
      'ambulance',
      24,
      true
    )
    ON CONFLICT (id) DO NOTHING
  `);

  // Corrections Officer Fitness Test
  await db.query(`
    INSERT INTO pt_tests (id, name, description, institution, category, components, scoring_method, icon, recertification_months, active)
    VALUES (
      'corrections_pft',
      'Corrections Officer Physical Fitness Test',
      'Standard physical fitness test for corrections and detention officers',
      'Various Departments',
      'corrections',
      '[
        {"id": "pushups", "name": "Push-ups (1 minute)", "type": "reps", "duration_seconds": 60},
        {"id": "situps", "name": "Sit-ups (1 minute)", "type": "reps", "duration_seconds": 60},
        {"id": "run_1_5_mile", "name": "1.5-Mile Run", "type": "time", "distance_miles": 1.5},
        {"id": "body_drag", "name": "Body Drag (75ft)", "type": "pass_fail", "description": "Drag 150lb dummy"}
      ]'::JSONB,
      'pass_fail',
      'building',
      12,
      true
    )
    ON CONFLICT (id) DO NOTHING
  `);

  // Park Ranger Fitness Test
  await db.query(`
    INSERT INTO pt_tests (id, name, description, institution, category, components, scoring_method, icon, recertification_months, active)
    VALUES (
      'nps_ranger_pft',
      'NPS Park Ranger Physical Fitness Test',
      'Physical fitness test for National Park Service law enforcement rangers',
      'National Park Service',
      'park_ranger',
      '[
        {"id": "pushups", "name": "Push-ups (1 minute)", "type": "reps", "duration_seconds": 60},
        {"id": "situps", "name": "Sit-ups (1 minute)", "type": "reps", "duration_seconds": 60},
        {"id": "run_1_5_mile", "name": "1.5-Mile Run", "type": "time", "distance_miles": 1.5},
        {"id": "hike_3_mile", "name": "3-Mile Hike (with pack)", "type": "time", "distance_miles": 3, "load_lbs": 25}
      ]'::JSONB,
      'points',
      'tree-pine',
      12,
      true
    )
    ON CONFLICT (id) DO NOTHING
  `);

  // Lifeguard Fitness Test
  await db.query(`
    INSERT INTO pt_tests (id, name, description, institution, category, components, scoring_method, icon, recertification_months, active)
    VALUES (
      'usla_lifeguard',
      'USLA Lifeguard Certification Test',
      'United States Lifesaving Association open water lifeguard fitness standards',
      'USLA',
      'lifeguard',
      '[
        {"id": "swim_500m", "name": "500-Meter Swim", "type": "time", "description": "Freestyle, under 10 minutes"},
        {"id": "run_swim_run", "name": "Run-Swim-Run", "type": "time", "description": "200m run, 400m swim, 200m run"},
        {"id": "rescue_swim", "name": "Rescue Swim (50m)", "type": "time", "description": "Approach stroke with rescue tube"},
        {"id": "treading", "name": "Treading Water (2 min)", "type": "pass_fail", "duration_seconds": 120, "description": "No hands"}
      ]'::JSONB,
      'pass_fail',
      'life-buoy',
      12,
      true
    )
    ON CONFLICT (id) DO NOTHING
  `);

  // CDL/Transportation Fitness
  await db.query(`
    INSERT INTO pt_tests (id, name, description, institution, category, components, scoring_method, icon, recertification_months, active)
    VALUES (
      'dot_physical',
      'DOT Physical Fitness Requirements',
      'Department of Transportation physical requirements for commercial drivers',
      'DOT',
      'transportation',
      '[
        {"id": "vision", "name": "Vision Test", "type": "pass_fail", "description": "20/40 acuity in each eye"},
        {"id": "hearing", "name": "Hearing Test", "type": "pass_fail", "description": "Forced whisper at 5 feet"},
        {"id": "blood_pressure", "name": "Blood Pressure", "type": "pass_fail", "description": "Below 140/90"},
        {"id": "flexibility", "name": "Range of Motion", "type": "pass_fail", "description": "Full range of motion in limbs"}
      ]'::JSONB,
      'pass_fail',
      'truck',
      24,
      true
    )
    ON CONFLICT (id) DO NOTHING
  `);

  // Construction/Trades Fitness
  await db.query(`
    INSERT INTO pt_tests (id, name, description, institution, category, components, scoring_method, icon, recertification_months, active)
    VALUES (
      'construction_fitness',
      'Construction Worker Fitness Assessment',
      'Physical fitness assessment for construction and skilled trades workers',
      'OSHA/Industry',
      'trades_construction',
      '[
        {"id": "lift_50", "name": "50lb Lift Test", "type": "pass_fail", "description": "Lift and carry 50lbs safely"},
        {"id": "ladder_climb", "name": "Ladder Climb", "type": "pass_fail", "description": "Climb 20ft ladder safely"},
        {"id": "kneeling_work", "name": "Kneeling Work (5 min)", "type": "pass_fail", "duration_seconds": 300},
        {"id": "overhead_work", "name": "Overhead Work (5 min)", "type": "pass_fail", "duration_seconds": 300}
      ]'::JSONB,
      'pass_fail',
      'hard-hat',
      12,
      true
    )
    ON CONFLICT (id) DO NOTHING
  `);

  // Public Service (USPS) Fitness
  await db.query(`
    INSERT INTO pt_tests (id, name, description, institution, category, components, scoring_method, icon, recertification_months, active)
    VALUES (
      'usps_carrier_fitness',
      'USPS Mail Carrier Physical Requirements',
      'Physical requirements for United States Postal Service letter carriers',
      'USPS',
      'public_service',
      '[
        {"id": "walking", "name": "Walking Stamina", "type": "pass_fail", "description": "Walk 4+ hours with breaks"},
        {"id": "lifting", "name": "Lifting (70lbs)", "type": "pass_fail", "description": "Lift up to 70lbs occasionally"},
        {"id": "carrying", "name": "Carrying (35lbs)", "type": "pass_fail", "description": "Carry 35lb satchel continuously"},
        {"id": "reaching", "name": "Reaching/Bending", "type": "pass_fail", "description": "Frequent reaching and bending"}
      ]'::JSONB,
      'pass_fail',
      'landmark',
      NULL,
      true
    )
    ON CONFLICT (id) DO NOTHING
  `);

  log.info('Migration 078_expanded_career_categories complete');
}

export async function down(): Promise<void> {
  log.info('Rolling back migration: 078_expanded_career_categories');

  // Remove the new PT tests
  await db.query(`
    DELETE FROM pt_tests WHERE id IN (
      'nremt_fitness',
      'corrections_pft',
      'nps_ranger_pft',
      'usla_lifeguard',
      'dot_physical',
      'construction_fitness',
      'usps_carrier_fitness'
    )
  `);

  // Restore original category constraint on pt_tests
  if (await tableExists('pt_tests')) {
    // Drop expanded constraint
    const constraintResult = await db.queryOne<{ constraint_name: string }>(`
      SELECT con.conname as constraint_name
      FROM pg_constraint con
      JOIN pg_class rel ON rel.oid = con.conrelid
      WHERE rel.relname = 'pt_tests'
        AND con.conname = 'pt_tests_category_check'
        AND con.contype = 'c'
    `);

    if (constraintResult?.constraint_name) {
      await db.query(`ALTER TABLE pt_tests DROP CONSTRAINT IF EXISTS pt_tests_category_check`);
    }

    // Restore original constraint
    await db.query(`
      ALTER TABLE pt_tests
      ADD CONSTRAINT pt_tests_category_check
      CHECK (category IN ('military', 'firefighter', 'law_enforcement', 'special_operations', 'civil_service', 'general'))
    `);

    await db.query(`DROP INDEX IF EXISTS idx_pt_tests_category`);
  }

  // Drop the categories table
  await db.query(`DROP TABLE IF EXISTS career_standard_categories`);

  log.info('Rollback 078_expanded_career_categories complete');
}

export const up = migrate;
