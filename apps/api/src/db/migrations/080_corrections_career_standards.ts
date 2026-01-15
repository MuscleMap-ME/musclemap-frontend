/**
 * Migration 071: Corrections Officer Career Standards
 *
 * Adds physical fitness test standards for corrections officers:
 * 1. California CDCR PFT - California Department of Corrections and Rehabilitation
 * 2. Federal BOP PFT - Federal Bureau of Prisons
 * 3. NY DOCCS PAT - New York Department of Corrections and Community Supervision
 * 4. Hawaii COPAT - Hawaii Department of Corrections and Rehabilitation
 * 5. Generic COPAT - Various agencies standard corrections officer test
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

export async function migrate(): Promise<void> {
  log.info('Running migration: 071_corrections_career_standards');

  // =============================================
  // UPDATE CATEGORY CONSTRAINT TO INCLUDE CORRECTIONS
  // =============================================

  if (await columnExists('pt_tests', 'category')) {
    log.info('Updating pt_tests category constraint to include corrections...');

    // Drop existing constraint and add new one with corrections
    await db.query(`
      ALTER TABLE pt_tests
      DROP CONSTRAINT IF EXISTS pt_tests_category_check
    `);

    await db.query(`
      ALTER TABLE pt_tests
      ADD CONSTRAINT pt_tests_category_check
      CHECK (category IN ('military', 'firefighter', 'law_enforcement', 'special_operations', 'civil_service', 'general', 'corrections', 'ems_paramedic', 'trades_construction', 'lifeguard', 'public_service', 'park_ranger', 'transportation'))
    `);
  }

  // =============================================
  // CALIFORNIA CDCR PFT
  // =============================================

  log.info('Adding California CDCR PFT...');

  const cdcrComponents = [
    {
      id: 'course_run',
      name: '500-Yard Course Run',
      type: 'time',
      distance_yards: 500,
      metric_type: 'time_seconds',
      passing_threshold: 335, // 5:35 total time limit
      description: 'Run on varied surfaces including stairs'
    },
    {
      id: 'obstacle_course',
      name: 'Obstacle Course',
      type: 'pass_fail',
      metric_type: 'pass_fail',
      description: 'Navigate physical obstacles simulating facility environment'
    },
    {
      id: 'confrontation_sim',
      name: 'Physical Confrontation Simulation',
      type: 'pass_fail',
      metric_type: 'pass_fail',
      description: 'Defensive tactics and control simulation'
    },
    {
      id: 'emergency_response',
      name: 'Emergency Response Drill',
      type: 'pass_fail',
      metric_type: 'pass_fail',
      description: 'Respond to simulated emergency scenarios'
    },
    {
      id: 'equipment_carry',
      name: 'Equipment Carry',
      type: 'pass_fail',
      metric_type: 'pass_fail',
      description: 'Transport emergency equipment through facility'
    }
  ];

  const cdcrExerciseMappings = {
    course_run: ['running', 'sprints', 'stair_climber', 'box_jumps', 'interval_training'],
    obstacle_course: ['burpees', 'box_jumps', 'bear_crawl', 'mountain_climbers', 'agility_ladder'],
    confrontation_sim: ['medicine_ball_slams', 'battle_ropes', 'push_ups', 'core_exercises'],
    emergency_response: ['sprints', 'agility_drills', 'reaction_training'],
    equipment_carry: ['farmers_carry', 'kettlebell_carry', 'sandbag_carry', 'loaded_carries']
  };

  const cdcrTips = [
    { event: 'course_run', tip: 'Practice running on varied terrain and stair climbing to build versatility' },
    { event: 'course_run', tip: 'Incorporate interval training with bursts at 80-90% effort' },
    { event: 'obstacle_course', tip: 'Build explosive power with box jumps and burpees' },
    { event: 'obstacle_course', tip: 'Practice bear crawls and low crawling movements' },
    { event: 'confrontation_sim', tip: 'Develop core stability and pushing/pulling strength' },
    { event: 'emergency_response', tip: 'Train reaction time with agility drills and direction changes' },
    { event: 'equipment_carry', tip: 'Build grip endurance with farmers carries and kettlebell work' }
  ];

  await db.query(`
    INSERT INTO pt_tests (
      id, name, description, institution, category, components,
      scoring_method, icon, recertification_months, exercise_mappings, tips
    )
    VALUES (
      'cdcr_pft',
      'California CDCR Physical Fitness Test',
      'Physical fitness test for California Department of Corrections and Rehabilitation officers. Must complete all events within 5 minutes 35 seconds.',
      'California Department of Corrections and Rehabilitation',
      'corrections',
      $1::JSONB,
      'pass_fail',
      'shield',
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
      exercise_mappings = EXCLUDED.exercise_mappings,
      tips = EXCLUDED.tips
  `, [
    JSON.stringify(cdcrComponents),
    JSON.stringify(cdcrExerciseMappings),
    JSON.stringify(cdcrTips)
  ]);

  // =============================================
  // FEDERAL BOP PFT
  // =============================================

  log.info('Adding Federal BOP PFT...');

  const bopComponents = [
    {
      id: 'climb_test',
      name: 'Climb Test',
      type: 'time',
      metric_type: 'time_seconds',
      passing_threshold: 7,
      description: 'Complete climb within 7 seconds'
    },
    {
      id: 'pushups',
      name: 'Push-ups',
      type: 'reps',
      duration_seconds: 60,
      metric_type: 'reps',
      passing_threshold: 33, // Varies by age/gender, using baseline
      description: 'Maximum push-ups in one minute'
    },
    {
      id: 'situps',
      name: 'Sit-ups',
      type: 'reps',
      duration_seconds: 60,
      metric_type: 'reps',
      passing_threshold: 38, // Varies by age/gender, using baseline
      description: 'Maximum sit-ups in one minute'
    },
    {
      id: 'run_1_5_mile',
      name: '1.5-Mile Run',
      type: 'time',
      distance_miles: 1.5,
      metric_type: 'time_seconds',
      passing_threshold: 780, // 13:00 - varies by age/gender
      description: 'Complete 1.5-mile run'
    },
    {
      id: 'flexibility',
      name: 'Flexibility Test',
      type: 'distance',
      metric_type: 'distance_inches',
      passing_threshold: 0, // Reach past toes
      description: 'Sit and reach flexibility assessment'
    }
  ];

  const bopExerciseMappings = {
    climb_test: ['pull_ups', 'lat_pulldown', 'rope_climb', 'farmers_carry', 'dead_hang'],
    pushups: ['push_ups', 'bench_press', 'dips', 'incline_push_ups', 'diamond_push_ups'],
    situps: ['sit_ups', 'crunches', 'russian_twists', 'leg_raises', 'planks'],
    run_1_5_mile: ['running', 'tempo_runs', 'interval_training', 'treadmill'],
    flexibility: ['hamstring_stretch', 'hip_flexor_stretch', 'yoga', 'foam_rolling']
  };

  const bopTips = [
    { event: 'climb_test', tip: 'Build pulling strength with pull-ups and lat pulldowns' },
    { event: 'climb_test', tip: 'Practice grip strength with dead hangs and farmers carries' },
    { event: 'pushups', tip: 'Train multiple push-up variations to build endurance' },
    { event: 'pushups', tip: 'Practice pacing - start strong but save energy for the last 20 seconds' },
    { event: 'situps', tip: 'Focus on hip flexor strength alongside core work' },
    { event: 'situps', tip: 'Use a consistent rhythm to maximize reps' },
    { event: 'run_1_5_mile', tip: 'Build aerobic base with longer runs at moderate pace' },
    { event: 'run_1_5_mile', tip: 'Include tempo runs at target pace' },
    { event: 'flexibility', tip: 'Stretch daily, especially hamstrings and lower back' }
  ];

  await db.query(`
    INSERT INTO pt_tests (
      id, name, description, institution, category, components,
      scoring_method, icon, recertification_months, exercise_mappings, tips
    )
    VALUES (
      'bop_pft',
      'Federal Bureau of Prisons Physical Fitness Test',
      'Physical fitness test for Federal Bureau of Prisons correctional officers. Standards vary by age and gender.',
      'Federal Bureau of Prisons',
      'corrections',
      $1::JSONB,
      'pass_fail',
      'shield',
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
      exercise_mappings = EXCLUDED.exercise_mappings,
      tips = EXCLUDED.tips
  `, [
    JSON.stringify(bopComponents),
    JSON.stringify(bopExerciseMappings),
    JSON.stringify(bopTips)
  ]);

  // =============================================
  // NY DOCCS PAT
  // =============================================

  log.info('Adding NY DOCCS PAT...');

  const nyDoccsComponents = [
    {
      id: 'obstacle_course',
      name: 'Obstacle Course',
      type: 'pass_fail',
      metric_type: 'pass_fail',
      description: 'Navigate through facility simulation obstacles'
    },
    {
      id: 'dummy_drag',
      name: 'Dummy Drag',
      type: 'pass_fail',
      distance_feet: 50,
      weight_lbs: 150,
      metric_type: 'pass_fail',
      description: 'Drag 150-lb dummy 50 feet'
    },
    {
      id: 'stair_climb',
      name: 'Stair Climb',
      type: 'pass_fail',
      flights: 4,
      metric_type: 'pass_fail',
      description: 'Climb 4 flights of stairs'
    },
    {
      id: 'barrier_climb',
      name: 'Barrier Climb',
      type: 'pass_fail',
      height_feet: 6,
      metric_type: 'pass_fail',
      description: 'Scale 6-foot barrier'
    }
  ];

  // Total time limit: 2 minutes 15 seconds for all events in sequence
  const nyDoccsExerciseMappings = {
    obstacle_course: ['burpees', 'box_jumps', 'agility_ladder', 'cone_drills', 'bear_crawl'],
    dummy_drag: ['sled_drag', 'farmers_carry', 'deadlifts', 'hip_thrusts', 'lunges'],
    stair_climb: ['stair_climber', 'step_ups', 'lunges', 'box_jumps', 'calf_raises'],
    barrier_climb: ['pull_ups', 'muscle_ups', 'box_jumps', 'explosive_push_ups', 'vertical_jump']
  };

  const nyDoccsTips = [
    { event: 'obstacle_course', tip: 'Practice quick direction changes and agility movements' },
    { event: 'dummy_drag', tip: 'Build hip and leg drive with sled drags and deadlifts' },
    { event: 'dummy_drag', tip: 'Practice grip endurance to maintain hold during drag' },
    { event: 'stair_climb', tip: 'Build leg endurance with stair climber intervals' },
    { event: 'stair_climb', tip: 'Focus on quick, efficient steps rather than taking two at a time' },
    { event: 'barrier_climb', tip: 'Develop explosive pulling power with pull-ups' },
    { event: 'barrier_climb', tip: 'Practice wall climbs and muscle-up progressions' }
  ];

  await db.query(`
    INSERT INTO pt_tests (
      id, name, description, institution, category, components,
      scoring_method, icon, recertification_months, exercise_mappings, tips
    )
    VALUES (
      'ny_doccs_pat',
      'New York DOCCS Physical Ability Test',
      'Physical ability test for New York Department of Corrections and Community Supervision officers. All tasks must be completed in sequence within 2 minutes 15 seconds.',
      'New York Department of Corrections and Community Supervision',
      'corrections',
      $1::JSONB,
      'pass_fail',
      'shield',
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
      exercise_mappings = EXCLUDED.exercise_mappings,
      tips = EXCLUDED.tips
  `, [
    JSON.stringify(nyDoccsComponents),
    JSON.stringify(nyDoccsExerciseMappings),
    JSON.stringify(nyDoccsTips)
  ]);

  // =============================================
  // HAWAII COPAT
  // =============================================

  log.info('Adding Hawaii COPAT...');

  const hawaiiComponents = [
    {
      id: 'pushups',
      name: 'Push-ups',
      type: 'reps',
      duration_seconds: 60,
      metric_type: 'reps',
      passing_threshold: 25, // Varies by age/gender
      description: 'Maximum push-ups in one minute'
    },
    {
      id: 'situps',
      name: 'Sit-ups',
      type: 'reps',
      duration_seconds: 60,
      metric_type: 'reps',
      passing_threshold: 30, // Varies by age/gender
      description: 'Maximum sit-ups in one minute'
    },
    {
      id: 'run_1_5_mile',
      name: '1.5-Mile Run',
      type: 'time',
      distance_miles: 1.5,
      metric_type: 'time_seconds',
      passing_threshold: 840, // 14:00 - varies by age/gender
      description: 'Complete 1.5-mile run'
    },
    {
      id: 'flexibility',
      name: 'Flexibility Test',
      type: 'distance',
      metric_type: 'distance_inches',
      description: 'Sit and reach flexibility assessment'
    },
    {
      id: 'agility_run',
      name: 'Agility Run',
      type: 'time',
      metric_type: 'time_seconds',
      description: 'Timed agility course with direction changes'
    },
    {
      id: 'grip_strength',
      name: 'Grip Strength',
      type: 'force',
      metric_type: 'force_lbs',
      description: 'Dynamometer grip strength test'
    }
  ];

  const hawaiiExerciseMappings = {
    pushups: ['push_ups', 'bench_press', 'dips', 'incline_push_ups', 'close_grip_push_ups'],
    situps: ['sit_ups', 'crunches', 'leg_raises', 'russian_twists', 'v_ups'],
    run_1_5_mile: ['running', 'tempo_runs', 'interval_training', 'treadmill', 'track_running'],
    flexibility: ['hamstring_stretch', 'hip_flexor_stretch', 'yoga', 'foam_rolling', 'dynamic_stretching'],
    agility_run: ['agility_ladder', 'cone_drills', 'shuttle_runs', 'lateral_shuffles', 'sprints'],
    grip_strength: ['farmers_carry', 'dead_hang', 'plate_pinch', 'wrist_curls', 'grip_trainer']
  };

  const hawaiiTips = [
    { event: 'pushups', tip: 'Build endurance with high-rep push-up sets' },
    { event: 'pushups', tip: 'Practice strict form to ensure all reps count' },
    { event: 'situps', tip: 'Strengthen hip flexors alongside core muscles' },
    { event: 'run_1_5_mile', tip: 'Train at various paces - include tempo and interval work' },
    { event: 'run_1_5_mile', tip: 'Build aerobic base with longer easy runs' },
    { event: 'flexibility', tip: 'Stretch hamstrings and lower back daily' },
    { event: 'agility_run', tip: 'Practice quick direction changes and deceleration' },
    { event: 'agility_run', tip: 'Work on lateral movement patterns' },
    { event: 'grip_strength', tip: 'Use farmers carries and dead hangs to build grip' },
    { event: 'grip_strength', tip: 'Train both hands equally for balanced strength' }
  ];

  await db.query(`
    INSERT INTO pt_tests (
      id, name, description, institution, category, components,
      scoring_method, icon, recertification_months, exercise_mappings, tips
    )
    VALUES (
      'hawaii_copat',
      'Hawaii COPAT',
      'Corrections Officer Physical Ability Test for Hawaii Department of Corrections and Rehabilitation. Comprehensive fitness assessment including strength, endurance, agility, and flexibility.',
      'Hawaii Department of Corrections and Rehabilitation',
      'corrections',
      $1::JSONB,
      'pass_fail',
      'shield',
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
      exercise_mappings = EXCLUDED.exercise_mappings,
      tips = EXCLUDED.tips
  `, [
    JSON.stringify(hawaiiComponents),
    JSON.stringify(hawaiiExerciseMappings),
    JSON.stringify(hawaiiTips)
  ]);

  // =============================================
  // GENERIC COPAT
  // =============================================

  log.info('Adding Generic COPAT...');

  const genericComponents = [
    {
      id: 'pushups',
      name: 'Push-ups (1 minute)',
      type: 'reps',
      duration_seconds: 60,
      metric_type: 'reps',
      passing_threshold: 29, // Common standard
      description: 'Maximum push-ups in one minute with proper form'
    },
    {
      id: 'situps',
      name: 'Sit-ups (1 minute)',
      type: 'reps',
      duration_seconds: 60,
      metric_type: 'reps',
      passing_threshold: 33, // Common standard
      description: 'Maximum sit-ups in one minute with proper form'
    },
    {
      id: 'run_1_5_mile',
      name: '1.5-Mile Run',
      type: 'time',
      distance_miles: 1.5,
      metric_type: 'time_seconds',
      passing_threshold: 792, // 13:12 - common standard
      description: 'Complete 1.5-mile run on flat surface'
    },
    {
      id: 'agility_test',
      name: 'Agility Test',
      type: 'time',
      metric_type: 'time_seconds',
      description: 'Timed agility course testing quick direction changes'
    }
  ];

  const genericExerciseMappings = {
    pushups: ['push_ups', 'bench_press', 'dips', 'incline_push_ups', 'tricep_extensions'],
    situps: ['sit_ups', 'crunches', 'leg_raises', 'planks', 'bicycle_crunches'],
    run_1_5_mile: ['running', 'tempo_runs', 'interval_training', 'treadmill', 'hill_sprints'],
    agility_test: ['agility_ladder', 'cone_drills', 'shuttle_runs', 'lateral_bounds', 't_drill']
  };

  const genericTips = [
    { event: 'pushups', tip: 'Train push-up endurance with timed sets matching test duration' },
    { event: 'pushups', tip: 'Practice different hand positions to build overall strength' },
    { event: 'situps', tip: 'Anchor your feet and use hip flexors efficiently' },
    { event: 'situps', tip: 'Maintain consistent rhythm throughout the minute' },
    { event: 'run_1_5_mile', tip: 'Know your target pace - practice running at that speed' },
    { event: 'run_1_5_mile', tip: 'Build aerobic capacity with longer runs at conversational pace' },
    { event: 'run_1_5_mile', tip: 'Include interval training to improve speed endurance' },
    { event: 'agility_test', tip: 'Practice quick stops and explosive starts' },
    { event: 'agility_test', tip: 'Stay low in athletic stance during direction changes' }
  ];

  await db.query(`
    INSERT INTO pt_tests (
      id, name, description, institution, category, components,
      scoring_method, icon, recertification_months, exercise_mappings, tips
    )
    VALUES (
      'copat_generic',
      'Generic COPAT (Corrections Officer Physical Ability Test)',
      'Standard corrections officer physical ability test used by various agencies. Tests muscular endurance, cardiovascular fitness, and agility.',
      'Various',
      'corrections',
      $1::JSONB,
      'pass_fail',
      'shield',
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
      exercise_mappings = EXCLUDED.exercise_mappings,
      tips = EXCLUDED.tips
  `, [
    JSON.stringify(genericComponents),
    JSON.stringify(genericExerciseMappings),
    JSON.stringify(genericTips)
  ]);

  // =============================================
  // ADD INDEXES FOR CORRECTIONS CATEGORY QUERIES
  // =============================================

  log.info('Creating index for corrections category queries...');

  await db.query(`
    CREATE INDEX IF NOT EXISTS idx_pt_tests_corrections_category
    ON pt_tests(category)
    WHERE category = 'corrections'
  `);

  log.info('Migration 071_corrections_career_standards complete');
}

export async function down(): Promise<void> {
  log.info('Rolling back migration: 071_corrections_career_standards');

  // Remove corrections PT tests
  await db.query(`
    DELETE FROM pt_tests
    WHERE id IN ('cdcr_pft', 'bop_pft', 'ny_doccs_pat', 'hawaii_copat', 'copat_generic')
  `);

  // Remove partial index
  await db.query(`DROP INDEX IF EXISTS idx_pt_tests_corrections_category`);

  // Note: We don't remove 'corrections' from the category constraint
  // as it may cause issues if other migrations have added corrections tests

  log.info('Rollback 071_corrections_career_standards complete');
}

export { migrate as up };
