// SQL-SAFE: Template literals contain static SQL only, no external input
/**
 * Migration 075: Transportation Career Standards
 *
 * Adds DOT and Transportation career standards to MuscleMap:
 * 1. DOT Physical Exam (FMCSA) - Commercial driver certification
 * 2. TSA Transportation Security Officer - Airport security
 * 3. Federal Air Marshal (TSA/DHS) - Law enforcement fitness
 * 4. Transit Operator (Generic) - Public transit
 * 5. USPS Mail Carrier - Postal service physical requirements
 *
 * Note: Many transportation jobs focus on medical fitness rather than
 * athletic performance, so components may be medical evaluations
 * rather than timed fitness tests.
 */

import { db } from '../client';
import { loggers } from '../../lib/logger';

const log = loggers.db;

async function columnExists(tableName: string, columnName: string): Promise<boolean> {
  const result = await db.queryOne<{ count: string }>(
    `SELECT COUNT(*) as count FROM information_schema.columns
     WHERE table_name = $1 AND column_name = $2`,
    [tableName, columnName]
  );
  return parseInt(result?.count || '0') > 0;
}

async function _constraintExists(constraintName: string): Promise<boolean> {
  const result = await db.queryOne<{ count: string }>(
    `SELECT COUNT(*) as count FROM information_schema.table_constraints
     WHERE constraint_name = $1`,
    [constraintName]
  );
  return parseInt(result?.count || '0') > 0;
}

export async function migrate(): Promise<void> {
  log.info('Running migration: 075_transportation_career_standards');

  // ============================================
  // UPDATE CATEGORY CONSTRAINT TO INCLUDE TRANSPORTATION
  // ============================================

  // First check if category column exists and has a constraint
  if (await columnExists('pt_tests', 'category')) {
    log.info('Updating pt_tests category constraint to include transportation...');

    // Drop existing check constraint and add new one with transportation
    // PostgreSQL check constraints are named automatically, find and drop it
    const constraintResult = await db.queryOne<{ constraint_name: string }>(
      `SELECT constraint_name FROM information_schema.check_constraints
       WHERE constraint_name LIKE '%category%' AND constraint_catalog = current_database()
       LIMIT 1`
    );

    if (constraintResult?.constraint_name) {
      await db.query(`ALTER TABLE pt_tests DROP CONSTRAINT IF EXISTS "${constraintResult.constraint_name}"`);
    }

    // Also try the common auto-generated name pattern
    await db.query(`ALTER TABLE pt_tests DROP CONSTRAINT IF EXISTS pt_tests_category_check`);

    // Add new constraint with all categories
    await db.query(`
      ALTER TABLE pt_tests
      ADD CONSTRAINT pt_tests_category_check
      CHECK (category IN ('military', 'firefighter', 'law_enforcement', 'special_operations', 'civil_service', 'general', 'corrections', 'ems_paramedic', 'trades_construction', 'lifeguard', 'public_service', 'park_ranger', 'transportation'))
    `);
  }

  // ============================================
  // ADD TRANSPORTATION TO ARCHETYPE CATEGORIES
  // ============================================

  log.info('Adding transportation archetype category...');
  await db.query(`
    INSERT INTO archetype_categories (id, name, description, icon, display_order)
    VALUES ('transportation', 'Transportation', 'Commercial drivers, transit operators, and transportation security personnel', 'truck', 7)
    ON CONFLICT (id) DO UPDATE SET
      name = EXCLUDED.name,
      description = EXCLUDED.description,
      icon = EXCLUDED.icon,
      display_order = EXCLUDED.display_order
  `);

  // ============================================
  // DOT PHYSICAL EXAM (FMCSA)
  // ============================================

  log.info('Adding DOT Physical Exam standard...');
  await db.query(`
    INSERT INTO pt_tests (
      id, name, description, institution, category, components,
      scoring_method, icon, recertification_months, tips, exercise_mappings
    )
    VALUES (
      'dot-physical',
      'DOT Physical Examination',
      'Federal Motor Carrier Safety Administration (FMCSA) medical examination for commercial motor vehicle operators. Certificate validity ranges from 3 months to 24 months based on health conditions. As of June 2025, results must be submitted electronically to the National Registry.',
      'FMCSA',
      'transportation',
      $1::JSONB,
      'pass_fail',
      'truck',
      24,
      $2::JSONB,
      $3::JSONB
    )
    ON CONFLICT (id) DO UPDATE SET
      name = EXCLUDED.name,
      description = EXCLUDED.description,
      institution = EXCLUDED.institution,
      category = EXCLUDED.category,
      components = EXCLUDED.components,
      scoring_method = EXCLUDED.scoring_method,
      icon = EXCLUDED.icon,
      recertification_months = EXCLUDED.recertification_months,
      tips = EXCLUDED.tips,
      exercise_mappings = EXCLUDED.exercise_mappings
  `, [
    // Components
    JSON.stringify([
      {
        id: 'vision_acuity',
        name: 'Vision Acuity',
        type: 'medical_eval',
        description: '20/40 in each eye with or without corrective lenses',
        passing_criteria: { acuity: '20/40', per_eye: true }
      },
      {
        id: 'vision_peripheral',
        name: 'Peripheral Vision',
        type: 'medical_eval',
        description: 'Minimum 70 degrees field of vision in horizontal meridian in each eye',
        passing_criteria: { horizontal_degrees: 70, per_eye: true }
      },
      {
        id: 'color_vision',
        name: 'Color Vision',
        type: 'medical_eval',
        description: 'Ability to recognize traffic signal colors (red, green, amber)',
        passing_criteria: { colors: ['red', 'green', 'amber'] }
      },
      {
        id: 'hearing',
        name: 'Hearing Test',
        type: 'medical_eval',
        description: 'Perceive forced whisper at 5 feet OR audiometric test showing no more than 40 decibel loss at 500Hz, 1000Hz, and 2000Hz with or without hearing aids',
        passing_criteria: { whisper_distance_feet: 5, max_decibel_loss: 40 }
      },
      {
        id: 'blood_pressure',
        name: 'Blood Pressure',
        type: 'medical_eval',
        description: 'Below 140/90 for 2-year certification. 140-159/90-99 for 1-year. 160-179/100-109 for one-time 1-year with annual recertification.',
        passing_criteria: {
          two_year_max: { systolic: 140, diastolic: 90 },
          one_year_max: { systolic: 159, diastolic: 99 },
          conditional_max: { systolic: 179, diastolic: 109 }
        }
      },
      {
        id: 'physical_exam',
        name: 'Physical Examination',
        type: 'medical_eval',
        description: 'Hernia check, reflexes, balance, gait assessment, and general physical condition',
        components: ['hernia', 'reflexes', 'balance', 'gait', 'general_condition']
      },
      {
        id: 'urinalysis',
        name: 'Urinalysis',
        type: 'medical_eval',
        description: 'Screen for diabetes indicators (glucose, protein)',
        tests: ['glucose', 'protein']
      },
      {
        id: 'sleep_apnea_screening',
        name: 'Sleep Apnea Screening',
        type: 'medical_eval',
        description: 'Assessment for obstructive sleep apnea risk factors',
        risk_factors: ['BMI', 'neck_circumference', 'history', 'symptoms']
      }
    ]),
    // Tips
    JSON.stringify([
      { tip: 'Maintain healthy blood pressure through regular cardiovascular exercise and diet management' },
      { tip: 'Get regular eye exams and update corrective lenses as needed' },
      { tip: 'If you have sleep apnea, ensure CPAP compliance documentation is current' },
      { tip: 'Manage diabetes through diet, exercise, and medication compliance' },
      { tip: 'Keep a log of your blood pressure readings for 30 days before your exam' },
      { tip: 'Avoid caffeine and stimulants 24 hours before your blood pressure check' }
    ]),
    // Exercise mappings (general health recommendations)
    JSON.stringify({
      blood_pressure: ['walking', 'cycling', 'swimming', 'elliptical'],
      general_health: ['stretching', 'yoga', 'walking', 'light_resistance_training'],
      sleep_quality: ['yoga', 'stretching', 'meditation'],
      balance: ['yoga', 'single_leg_stands', 'balance_board_exercises']
    })
  ]);

  // ============================================
  // TSA TRANSPORTATION SECURITY OFFICER
  // ============================================

  log.info('Adding TSA Transportation Security Officer standard...');
  await db.query(`
    INSERT INTO pt_tests (
      id, name, description, institution, category, components,
      scoring_method, icon, recertification_months, tips, exercise_mappings
    )
    VALUES (
      'tsa-tso',
      'TSA Transportation Security Officer Medical Evaluation',
      'Physical requirements for TSA Transportation Security Officers. This is a medical evaluation rather than a timed fitness test. Officers must be able to perform essential job functions including lifting, standing, and visual screening tasks.',
      'TSA / Department of Homeland Security',
      'transportation',
      $1::JSONB,
      'pass_fail',
      'shield-check',
      12,
      $2::JSONB,
      $3::JSONB
    )
    ON CONFLICT (id) DO UPDATE SET
      name = EXCLUDED.name,
      description = EXCLUDED.description,
      institution = EXCLUDED.institution,
      category = EXCLUDED.category,
      components = EXCLUDED.components,
      scoring_method = EXCLUDED.scoring_method,
      icon = EXCLUDED.icon,
      recertification_months = EXCLUDED.recertification_months,
      tips = EXCLUDED.tips,
      exercise_mappings = EXCLUDED.exercise_mappings
  `, [
    // Components
    JSON.stringify([
      {
        id: 'lifting_capacity',
        name: 'Lifting Capacity',
        type: 'strength_eval',
        description: 'Ability to lift and carry up to 50 pounds repeatedly without assistance',
        requirement: { weight_lbs: 50, frequency: 'repeated', assistance: false }
      },
      {
        id: 'standing_endurance',
        name: 'Standing Endurance',
        type: 'endurance_eval',
        description: 'Ability to stand and walk continuously for 4+ hours without a break',
        requirement: { duration_hours: 4, continuous: true }
      },
      {
        id: 'color_vision',
        name: 'Color Vision Test',
        type: 'medical_eval',
        description: 'Ability to distinguish colors for X-ray screen interpretation',
        passing_criteria: { ishihara_plates: true }
      },
      {
        id: 'distance_vision',
        name: 'Distance Vision Test',
        type: 'medical_eval',
        description: 'Correctable to 20/30 or better in best eye',
        passing_criteria: { acuity: '20/30', correctable: true }
      },
      {
        id: 'hearing_test',
        name: 'Hearing Examination',
        type: 'medical_eval',
        description: 'Ability to hear and respond to verbal communications in noisy environment',
        requirement: { environment: 'noisy', verbal_communication: true }
      },
      {
        id: 'mobility',
        name: 'Physical Mobility',
        type: 'functional_eval',
        description: 'Ability to bend, stoop, squat, reach, and perform repetitive motions',
        movements: ['bending', 'stooping', 'squatting', 'reaching', 'repetitive_motion']
      }
    ]),
    // Tips
    JSON.stringify([
      { tip: 'Build standing endurance with gradual increases in time spent on your feet' },
      { tip: 'Practice lifting 50lb objects with proper form - use legs, not back' },
      { tip: 'Strengthen your core and lower back to support prolonged standing' },
      { tip: 'Wear compression socks during long standing periods to improve circulation' },
      { tip: 'Do hip flexor stretches to reduce lower back strain from standing' }
    ]),
    // Exercise mappings
    JSON.stringify({
      lifting_capacity: ['deadlift', 'goblet_squat', 'farmers_carry', 'kettlebell_swings'],
      standing_endurance: ['walking', 'elliptical', 'stair_climber', 'stationary_bike'],
      mobility: ['yoga', 'dynamic_stretching', 'hip_circles', 'bodyweight_squats'],
      core_strength: ['plank', 'bird_dog', 'dead_bug', 'pallof_press']
    })
  ]);

  // ============================================
  // FEDERAL AIR MARSHAL
  // ============================================

  log.info('Adding Federal Air Marshal standard...');
  await db.query(`
    INSERT INTO pt_tests (
      id, name, description, institution, category, components,
      scoring_method, icon, recertification_months, tips, exercise_mappings
    )
    VALUES (
      'tsa-fam',
      'Federal Air Marshal Physical Fitness Test',
      'Law enforcement fitness test for Federal Air Marshals. Similar structure to FBI PFT with emphasis on functional fitness for close-quarters protection duties.',
      'TSA / Department of Homeland Security',
      'transportation',
      $1::JSONB,
      'points',
      'plane',
      6,
      $2::JSONB,
      $3::JSONB
    )
    ON CONFLICT (id) DO UPDATE SET
      name = EXCLUDED.name,
      description = EXCLUDED.description,
      institution = EXCLUDED.institution,
      category = EXCLUDED.category,
      components = EXCLUDED.components,
      scoring_method = EXCLUDED.scoring_method,
      icon = EXCLUDED.icon,
      recertification_months = EXCLUDED.recertification_months,
      tips = EXCLUDED.tips,
      exercise_mappings = EXCLUDED.exercise_mappings
  `, [
    // Components
    JSON.stringify([
      {
        id: 'situps',
        name: 'Sit-ups (1 minute)',
        type: 'reps',
        duration_seconds: 60,
        description: 'Maximum sit-ups in one minute'
      },
      {
        id: 'sprint_300m',
        name: '300-Meter Sprint',
        type: 'time',
        distance_meters: 300,
        description: 'Timed 300-meter sprint'
      },
      {
        id: 'pushups',
        name: 'Push-ups (Maximum)',
        type: 'reps',
        max_continuous: true,
        description: 'Maximum continuous push-ups without rest'
      },
      {
        id: 'run_1_5_mile',
        name: '1.5-Mile Run',
        type: 'time',
        distance_miles: 1.5,
        description: 'Timed 1.5-mile run'
      },
      {
        id: 'pullups',
        name: 'Pull-ups',
        type: 'reps',
        description: 'Maximum pull-ups'
      }
    ]),
    // Tips
    JSON.stringify([
      { event: 'situps', tip: 'Train core endurance with timed sets, building up to 70+ reps per minute' },
      { event: 'sprint_300m', tip: 'Include interval training: 200m repeats at 90% effort with short rest' },
      { event: 'pushups', tip: 'Train muscular endurance with high-rep sets and vary hand positions' },
      { event: 'run_1_5_mile', tip: 'Mix tempo runs (sustained pace) with interval training for cardio base' },
      { event: 'pullups', tip: 'Use greasing the groove technique: multiple low-rep sets throughout the day' }
    ]),
    // Exercise mappings
    JSON.stringify({
      situps: ['crunches', 'sit_ups', 'hanging_leg_raises', 'v_ups', 'cable_crunches'],
      sprint_300m: ['sprints', 'interval_training', 'hill_sprints', 'prowler_pushes'],
      pushups: ['push_ups', 'bench_press', 'dips', 'diamond_push_ups', 'archer_push_ups'],
      run_1_5_mile: ['running', 'tempo_runs', 'interval_training', 'fartlek_runs'],
      pullups: ['pull_ups', 'lat_pulldown', 'assisted_pull_ups', 'negative_pull_ups', 'chin_ups']
    })
  ]);

  // ============================================
  // TRANSIT OPERATOR (GENERIC)
  // ============================================

  log.info('Adding Transit Operator standard...');
  await db.query(`
    INSERT INTO pt_tests (
      id, name, description, institution, category, components,
      scoring_method, icon, recertification_months, tips, exercise_mappings
    )
    VALUES (
      'transit-operator-generic',
      'Transit Operator Physical Requirements',
      'General physical requirements for public transit operators (bus, rail, light rail). Most transit authorities require DOT physical compliance, with some adding agility or cognitive tests. Requirements vary by agency.',
      'Various Transit Authorities',
      'transportation',
      $1::JSONB,
      'pass_fail',
      'bus',
      24,
      $2::JSONB,
      $3::JSONB
    )
    ON CONFLICT (id) DO UPDATE SET
      name = EXCLUDED.name,
      description = EXCLUDED.description,
      institution = EXCLUDED.institution,
      category = EXCLUDED.category,
      components = EXCLUDED.components,
      scoring_method = EXCLUDED.scoring_method,
      icon = EXCLUDED.icon,
      recertification_months = EXCLUDED.recertification_months,
      tips = EXCLUDED.tips,
      exercise_mappings = EXCLUDED.exercise_mappings
  `, [
    // Components
    JSON.stringify([
      {
        id: 'dot_physical',
        name: 'DOT Physical Compliance',
        type: 'medical_eval',
        description: 'Must pass standard DOT physical examination',
        reference: 'dot-physical'
      },
      {
        id: 'vision_requirements',
        name: 'Enhanced Vision Requirements',
        type: 'medical_eval',
        description: 'Vision correctable to 20/40 in each eye, peripheral vision, color recognition',
        passing_criteria: { acuity: '20/40', color_vision: true, peripheral: true }
      },
      {
        id: 'sitting_tolerance',
        name: 'Prolonged Sitting Tolerance',
        type: 'functional_eval',
        description: 'Ability to sit for extended periods (4-10 hours) while maintaining alertness',
        duration_hours: { min: 4, max: 10 }
      },
      {
        id: 'emergency_evacuation',
        name: 'Emergency Evacuation Capability',
        type: 'functional_eval',
        description: 'Ability to assist passengers during emergency evacuation, including operating emergency equipment',
        requirements: ['emergency_exit_operation', 'passenger_assistance', 'evacuation_mobility']
      },
      {
        id: 'agility_assessment',
        name: 'Agility Assessment (Agency-Specific)',
        type: 'functional_eval',
        description: 'Some agencies require demonstrations of entering/exiting vehicle, accessing fare boxes, etc.',
        optional: true
      }
    ]),
    // Tips
    JSON.stringify([
      { tip: 'Practice good posture to prevent back issues from prolonged sitting' },
      { tip: 'Do regular stretches for hip flexors and lower back' },
      { tip: 'Maintain cardiovascular fitness for emergency response capability' },
      { tip: 'Keep blood pressure and blood sugar under control for DOT compliance' },
      { tip: 'Schedule regular eye exams to ensure vision requirements are met' }
    ]),
    // Exercise mappings
    JSON.stringify({
      sitting_tolerance: ['hip_flexor_stretches', 'glute_bridges', 'cat_cow_stretches', 'seated_twists'],
      emergency_capability: ['walking', 'stair_climbing', 'bodyweight_squats', 'lunges'],
      general_health: ['walking', 'swimming', 'cycling', 'yoga'],
      posture: ['planks', 'rows', 'face_pulls', 'thoracic_extensions']
    })
  ]);

  // ============================================
  // USPS MAIL CARRIER
  // ============================================

  log.info('Adding USPS Mail Carrier standard...');
  await db.query(`
    INSERT INTO pt_tests (
      id, name, description, institution, category, components,
      scoring_method, icon, recertification_months, tips, exercise_mappings
    )
    VALUES (
      'usps-carrier',
      'USPS Mail Carrier Physical Requirements',
      'Physical requirements for United States Postal Service letter carriers and mail handlers. Involves significant walking, carrying, and vehicle operation. Not a timed fitness test but requires sustained physical capability.',
      'United States Postal Service',
      'transportation',
      $1::JSONB,
      'pass_fail',
      'mail',
      NULL,
      $2::JSONB,
      $3::JSONB
    )
    ON CONFLICT (id) DO UPDATE SET
      name = EXCLUDED.name,
      description = EXCLUDED.description,
      institution = EXCLUDED.institution,
      category = EXCLUDED.category,
      components = EXCLUDED.components,
      scoring_method = EXCLUDED.scoring_method,
      icon = EXCLUDED.icon,
      recertification_months = EXCLUDED.recertification_months,
      tips = EXCLUDED.tips,
      exercise_mappings = EXCLUDED.exercise_mappings
  `, [
    // Components
    JSON.stringify([
      {
        id: 'carrying_capacity',
        name: 'Carrying Capacity',
        type: 'strength_eval',
        description: 'Ability to carry mail satchel and packages up to 70 pounds',
        requirement: { weight_lbs: 70, sustained: true }
      },
      {
        id: 'walking_endurance',
        name: 'Walking Endurance',
        type: 'endurance_eval',
        description: 'Walk 8+ miles daily on foot routes, often in varied weather conditions',
        requirement: { miles_per_day: 8, terrain: 'varied', weather: 'all_conditions' }
      },
      {
        id: 'repetitive_motion',
        name: 'Repetitive Motion Tolerance',
        type: 'functional_eval',
        description: 'Continuous reaching, bending, and lifting throughout shift',
        movements: ['reaching', 'bending', 'lifting', 'sorting']
      },
      {
        id: 'vehicle_operation',
        name: 'Vehicle Operation',
        type: 'functional_eval',
        description: 'Safe operation of postal vehicles (LLV, Metris, ProMaster)',
        requirements: ['valid_drivers_license', 'safe_driving_record', 'vehicle_maneuvering']
      },
      {
        id: 'standing_tolerance',
        name: 'Standing/Walking Tolerance',
        type: 'endurance_eval',
        description: 'Stand and walk for 6-8+ hours per shift',
        duration_hours: { min: 6, max: 8 }
      },
      {
        id: 'stair_climbing',
        name: 'Stair Climbing',
        type: 'endurance_eval',
        description: 'Frequent stair climbing on residential and commercial routes',
        frequency: 'frequent'
      }
    ]),
    // Tips
    JSON.stringify([
      { tip: 'Build walking endurance gradually - start with 3-5 miles and increase weekly' },
      { tip: 'Train with a weighted backpack (start light, build to 35+ lbs)' },
      { tip: 'Invest in quality footwear with good arch support and cushioning' },
      { tip: 'Strengthen shoulders and upper back for sustained carrying' },
      { tip: 'Practice proper lifting mechanics - lift with legs, keep load close to body' },
      { tip: 'Do hip and ankle mobility work to handle varied terrain' },
      { tip: 'Train in varied weather conditions to acclimate to outdoor work' }
    ]),
    // Exercise mappings
    JSON.stringify({
      carrying_capacity: ['farmers_carry', 'overhead_carry', 'rucking', 'trap_bar_deadlift', 'shrugs'],
      walking_endurance: ['walking', 'hiking', 'rucking', 'stair_climber', 'incline_treadmill'],
      stair_climbing: ['stair_climber', 'step_ups', 'lunges', 'box_jumps', 'hill_walking'],
      repetitive_motion: ['shoulder_press', 'rows', 'deadlifts', 'squats', 'dynamic_stretching'],
      standing_tolerance: ['calf_raises', 'single_leg_balance', 'hip_circles', 'ankle_mobility'],
      general_conditioning: ['walking', 'cycling', 'swimming', 'elliptical']
    })
  ]);

  // ============================================
  // ADD TRANSPORTATION ARCHETYPES
  // ============================================

  log.info('Adding transportation archetypes...');
  await db.query(`
    INSERT INTO archetypes (id, name, description, category_id, pt_test_id, institution, focus_areas, recommended_equipment)
    VALUES
    ('cdl_driver', 'Commercial Driver', 'Training program for commercial truck drivers focused on maintaining DOT physical certification and managing health risks associated with sedentary driving.', 'transportation', 'dot-physical', 'FMCSA',
     '["cardiovascular_health", "blood_pressure_management", "flexibility", "core_stability"]'::JSONB,
     '["resistance_bands", "yoga_mat", "foam_roller", "blood_pressure_monitor"]'::JSONB),

    ('tso_officer', 'TSA Security Officer', 'Training program for TSA Transportation Security Officers emphasizing standing endurance, lifting capacity, and occupational fitness.', 'transportation', 'tsa-tso', 'TSA',
     '["standing_endurance", "lifting_capacity", "functional_strength", "core_stability"]'::JSONB,
     '["kettlebell", "dumbbells", "resistance_bands", "foam_roller"]'::JSONB),

    ('air_marshal', 'Federal Air Marshal', 'Training program for Federal Air Marshals combining law enforcement fitness with close-quarters readiness.', 'transportation', 'tsa-fam', 'TSA',
     '["running", "muscular_endurance", "strength", "agility"]'::JSONB,
     '["pull_up_bar", "running_shoes", "exercise_mat", "kettlebell"]'::JSONB),

    ('transit_operator', 'Transit Operator', 'Training program for bus, rail, and transit operators focused on maintaining DOT compliance and managing sedentary occupation health.', 'transportation', 'transit-operator-generic', 'Transit Authorities',
     '["cardiovascular_health", "flexibility", "posture", "alertness"]'::JSONB,
     '["yoga_mat", "foam_roller", "resistance_bands", "stability_ball"]'::JSONB),

    ('mail_carrier', 'Postal Carrier', 'Training program for USPS letter carriers emphasizing walking endurance, carrying capacity, and weather resilience.', 'transportation', 'usps-carrier', 'USPS',
     '["walking_endurance", "carrying_capacity", "lower_body_strength", "weather_resilience"]'::JSONB,
     '["weighted_vest", "backpack", "hiking_shoes", "resistance_bands"]'::JSONB)

    ON CONFLICT (id) DO UPDATE SET
      name = EXCLUDED.name,
      description = EXCLUDED.description,
      category_id = EXCLUDED.category_id,
      pt_test_id = EXCLUDED.pt_test_id,
      institution = EXCLUDED.institution,
      focus_areas = EXCLUDED.focus_areas,
      recommended_equipment = EXCLUDED.recommended_equipment
  `);

  // ============================================
  // ADD INDEX FOR TRANSPORTATION CATEGORY
  // ============================================

  log.info('Adding index for transportation category queries...');
  await db.query(`
    CREATE INDEX IF NOT EXISTS idx_pt_tests_transportation
    ON pt_tests(category)
    WHERE category = 'transportation'
  `);

  log.info('Migration 075_transportation_career_standards complete');
}

export async function down(): Promise<void> {
  log.info('Rolling back migration: 075_transportation_career_standards');

  // Remove transportation archetypes
  await db.query(`
    DELETE FROM archetypes
    WHERE id IN ('cdl_driver', 'tso_officer', 'air_marshal', 'transit_operator', 'mail_carrier')
  `);

  // Remove transportation PT tests
  await db.query(`
    DELETE FROM pt_tests
    WHERE id IN ('dot-physical', 'tsa-tso', 'tsa-fam', 'transit-operator-generic', 'usps-carrier')
  `);

  // Remove transportation category from archetype_categories
  await db.query(`DELETE FROM archetype_categories WHERE id = 'transportation'`);

  // Drop the partial index
  await db.query(`DROP INDEX IF EXISTS idx_pt_tests_transportation`);

  // Note: We don't remove 'transportation' from the category CHECK constraint
  // as it's safer to leave the constraint inclusive rather than risk breaking
  // any data that might reference it

  log.info('Rollback 075_transportation_career_standards complete');
}

export const up = migrate;
