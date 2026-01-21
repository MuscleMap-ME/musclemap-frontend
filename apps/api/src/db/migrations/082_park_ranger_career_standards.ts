// SQL-SAFE: Template literals contain static SQL only, no external input
/**
 * Migration 072: Park Ranger and Wildlife Officer Career Standards
 *
 * Adds PT test standards for:
 * 1. NPS Physical Efficiency Battery (National Park Service)
 * 2. Washington State Parks Ranger PAT
 * 3. California State Parks Cadet Assessment
 * 4. USFS Law Enforcement (US Forest Service)
 * 5. BLM Ranger (Bureau of Land Management)
 *
 * Also adds 'park_ranger' to the pt_tests category enum.
 */

import { db } from '../client';
import { loggers } from '../../lib/logger';

const log = loggers.db;

async function constraintExists(constraintName: string): Promise<boolean> {
  const result = await db.queryOne<{ count: string }>(
    `SELECT COUNT(*) as count FROM information_schema.constraint_column_usage
     WHERE constraint_name = $1`,
    [constraintName]
  );
  return parseInt(result?.count || '0') > 0;
}

export async function migrate(): Promise<void> {
  log.info('Running migration: 072_park_ranger_career_standards');

  // ============================================
  // ADD 'park_ranger' TO CATEGORY ENUM
  // ============================================
  log.info('Adding park_ranger to pt_tests category enum...');

  // Drop existing constraint and recreate with new category
  const constraintName = 'pt_tests_category_check';
  if (await constraintExists(constraintName)) {
    await db.query(`ALTER TABLE pt_tests DROP CONSTRAINT ${constraintName}`);
  }

  await db.query(`
    ALTER TABLE pt_tests
    ADD CONSTRAINT pt_tests_category_check
    CHECK (category IN ('military', 'firefighter', 'law_enforcement', 'special_operations', 'civil_service', 'general', 'corrections', 'ems_paramedic', 'trades_construction', 'lifeguard', 'public_service', 'park_ranger', 'transportation'))
  `);

  // ============================================
  // NPS PHYSICAL EFFICIENCY BATTERY (nps-peb)
  // ============================================
  log.info('Adding NPS Physical Efficiency Battery...');
  await db.query(`
    INSERT INTO pt_tests (id, name, description, institution, category, components, scoring_method, icon, recertification_months, exercise_mappings, tips)
    VALUES (
      'nps_peb',
      'NPS Physical Efficiency Battery',
      'Physical fitness test for National Park Service law enforcement rangers. Must score at or above 25th percentile in each component. Annual recertification required.',
      'National Park Service',
      'park_ranger',
      '[
        {"id": "run_1_5_mile", "name": "1.5-Mile Run", "type": "time", "distance_miles": 1.5, "description": "Measures aerobic endurance. Must achieve 25th percentile or higher based on age and gender."},
        {"id": "illinois_agility", "name": "Illinois Agility Run", "type": "time", "description": "Measures agility and change of direction. Timed run through cone course."},
        {"id": "bench_press_ratio", "name": "Bench Press", "type": "ratio", "description": "Upper body strength measured as percentage of body weight."},
        {"id": "sit_and_reach", "name": "Sit and Reach", "type": "distance", "unit": "inches", "description": "Flexibility test. Informational component, not scored for pass/fail."},
        {"id": "body_composition", "name": "Body Composition", "type": "percentage", "description": "Body fat percentage. Informational component, not scored for pass/fail."}
      ]'::JSONB,
      'percentile',
      'tree',
      12,
      $1::JSONB,
      $2::JSONB
    )
    ON CONFLICT (id) DO UPDATE SET
      name = EXCLUDED.name,
      description = EXCLUDED.description,
      components = EXCLUDED.components,
      exercise_mappings = EXCLUDED.exercise_mappings,
      tips = EXCLUDED.tips
  `, [
    JSON.stringify({
      run_1_5_mile: ['running', 'tempo_runs', 'interval_training', 'treadmill'],
      illinois_agility: ['agility_drills', 'lateral_shuffles', 'cone_drills', 'sprints'],
      bench_press_ratio: ['bench_press', 'push_ups', 'dips', 'chest_press', 'incline_bench_press'],
      sit_and_reach: ['hamstring_stretch', 'seated_forward_fold', 'toe_touches'],
      body_composition: ['running', 'hiit', 'cycling', 'rowing']
    }),
    JSON.stringify([
      { event: 'run_1_5_mile', tip: 'Build aerobic base with 3-4 runs per week, mixing long slow runs with tempo work' },
      { event: 'run_1_5_mile', tip: 'Target 20-30 minutes continuous running before adding speed work' },
      { event: 'illinois_agility', tip: 'Practice the exact course layout - memorize the pattern' },
      { event: 'illinois_agility', tip: 'Work on deceleration and sharp direction changes with cone drills' },
      { event: 'bench_press_ratio', tip: 'Focus on progressive overload - gradually increase weight over time' },
      { event: 'bench_press_ratio', tip: 'Train 2-3x per week with compound pushing movements' },
      { event: 'general', tip: 'NPS requires 25th percentile or higher - train to exceed minimums for safety margin' }
    ])
  ]);

  // ============================================
  // WASHINGTON STATE PARKS RANGER PAT
  // ============================================
  log.info('Adding Washington State Parks Ranger PAT...');
  await db.query(`
    INSERT INTO pt_tests (id, name, description, institution, category, components, scoring_method, icon, recertification_months, exercise_mappings, tips)
    VALUES (
      'wa_ranger_pat',
      'Washington State Parks Ranger PAT',
      'Physical ability test for Washington State Parks peace officer positions. Tests job-related physical abilities required for park law enforcement.',
      'Washington State Parks',
      'park_ranger',
      '[
        {"id": "run_1_5_mile", "name": "1.5-Mile Run", "type": "time", "distance_miles": 1.5, "description": "Cardiovascular endurance test"},
        {"id": "pushups", "name": "Push-ups", "type": "reps", "duration_seconds": 60, "description": "Maximum push-ups in one minute"},
        {"id": "situps", "name": "Sit-ups", "type": "reps", "duration_seconds": 60, "description": "Maximum sit-ups in one minute"},
        {"id": "agility_course", "name": "Agility Course", "type": "time", "description": "Timed obstacle course testing agility and coordination"},
        {"id": "fence_climb", "name": "Fence Climb", "type": "pass_fail", "description": "Scale a 6-foot chain-link fence"}
      ]'::JSONB,
      'pass_fail',
      'tree',
      12,
      $1::JSONB,
      $2::JSONB
    )
    ON CONFLICT (id) DO UPDATE SET
      name = EXCLUDED.name,
      description = EXCLUDED.description,
      components = EXCLUDED.components,
      exercise_mappings = EXCLUDED.exercise_mappings,
      tips = EXCLUDED.tips
  `, [
    JSON.stringify({
      run_1_5_mile: ['running', 'tempo_runs', 'interval_training', 'treadmill'],
      pushups: ['push_ups', 'bench_press', 'dips', 'incline_push_ups', 'diamond_push_ups'],
      situps: ['sit_ups', 'crunches', 'leg_raises', 'ab_wheel', 'plank'],
      agility_course: ['agility_drills', 'lateral_shuffles', 'box_jumps', 'burpees', 'bear_crawl'],
      fence_climb: ['pull_ups', 'chin_ups', 'lat_pulldown', 'box_jumps', 'muscle_ups']
    }),
    JSON.stringify([
      { event: 'run_1_5_mile', tip: 'Mix interval training (400m repeats) with steady-state cardio' },
      { event: 'pushups', tip: 'Practice timed sets - test yourself weekly under 60-second conditions' },
      { event: 'situps', tip: 'Hook your feet under something stable and practice hip flexor engagement' },
      { event: 'fence_climb', tip: 'Practice explosive pull-ups and box jumps to build climbing power' },
      { event: 'fence_climb', tip: 'Find a safe fence to practice on - technique matters as much as strength' }
    ])
  ]);

  // ============================================
  // CALIFORNIA STATE PARKS CADET ASSESSMENT
  // ============================================
  log.info('Adding California State Parks Cadet Assessment...');
  await db.query(`
    INSERT INTO pt_tests (id, name, description, institution, category, components, scoring_method, icon, exercise_mappings, tips)
    VALUES (
      'ca_ranger_pat',
      'California State Parks Cadet Assessment',
      '5-day entry assessment for California State Parks peace officer academy. Includes drug testing, 3-day CPAT-style physical test, and oral interview. Physical components mirror firefighter CPAT with outdoor ranger-specific elements.',
      'California State Parks',
      'park_ranger',
      '[
        {"id": "stair_climb", "name": "Stair Climb", "type": "time", "duration_seconds": 180, "description": "3-minute weighted stair climb simulating trail ascent"},
        {"id": "hose_drag", "name": "Hose/Rope Drag", "type": "pass_fail", "description": "Drag weighted line simulating rescue operations"},
        {"id": "equipment_carry", "name": "Equipment Carry", "type": "pass_fail", "description": "Carry heavy equipment over varied terrain"},
        {"id": "obstacle_course", "name": "Obstacle Course", "type": "time", "description": "Navigate natural and man-made obstacles"},
        {"id": "rescue_drag", "name": "Rescue Drag", "type": "pass_fail", "description": "Drag 165lb mannequin simulating victim rescue"},
        {"id": "run_1_5_mile", "name": "1.5-Mile Run", "type": "time", "distance_miles": 1.5, "description": "Timed run on mixed terrain"}
      ]'::JSONB,
      'pass_fail',
      'tree',
      $1::JSONB,
      $2::JSONB
    )
    ON CONFLICT (id) DO UPDATE SET
      name = EXCLUDED.name,
      description = EXCLUDED.description,
      components = EXCLUDED.components,
      exercise_mappings = EXCLUDED.exercise_mappings,
      tips = EXCLUDED.tips
  `, [
    JSON.stringify({
      stair_climb: ['stair_climber', 'step_ups', 'lunges', 'box_jumps', 'hiking'],
      hose_drag: ['sled_drag', 'cable_rows', 'deadlifts', 'farmers_carry', 'grip_training'],
      equipment_carry: ['farmers_carry', 'kettlebell_carry', 'goblet_squats', 'lunges', 'trap_bar_deadlift'],
      obstacle_course: ['burpees', 'box_jumps', 'bear_crawl', 'mountain_climbers', 'agility_drills'],
      rescue_drag: ['sled_drag', 'hip_thrusts', 'deadlifts', 'walking_lunges', 'goblet_squats'],
      run_1_5_mile: ['running', 'trail_running', 'tempo_runs', 'interval_training']
    }),
    JSON.stringify([
      { event: 'stair_climb', tip: 'Train with a weighted vest (25-50 lbs) on stair climber or stadium stairs' },
      { event: 'stair_climb', tip: 'Build to 20+ minutes continuous climbing at moderate pace' },
      { event: 'equipment_carry', tip: 'Practice farmers carries with progressively heavier weights' },
      { event: 'rescue_drag', tip: 'Train hip drive and leg strength with sled drags and deadlifts' },
      { event: 'obstacle_course', tip: 'Work on explosive movements and transitions between exercises' },
      { event: 'general', tip: 'California assessment is comprehensive - train all components consistently over 8-12 weeks' }
    ])
  ]);

  // ============================================
  // USFS LAW ENFORCEMENT (US FOREST SERVICE)
  // ============================================
  log.info('Adding USFS Law Enforcement test...');
  await db.query(`
    INSERT INTO pt_tests (id, name, description, institution, category, components, scoring_method, icon, recertification_months, exercise_mappings, tips)
    VALUES (
      'usfs_leo',
      'USFS Law Enforcement Physical Fitness Test',
      'Physical fitness test for U.S. Forest Service law enforcement officers. Tests cardiovascular endurance, muscular strength, and body composition.',
      'U.S. Forest Service',
      'park_ranger',
      '[
        {"id": "run_1_5_mile", "name": "1.5-Mile Run", "type": "time", "distance_miles": 1.5, "description": "Cardiovascular endurance test"},
        {"id": "pushups", "name": "Push-ups", "type": "reps", "duration_seconds": 60, "description": "Maximum push-ups in one minute"},
        {"id": "situps", "name": "Sit-ups", "type": "reps", "duration_seconds": 60, "description": "Maximum sit-ups in one minute"},
        {"id": "body_composition", "name": "Body Composition", "type": "percentage", "description": "Body fat percentage assessment"}
      ]'::JSONB,
      'pass_fail',
      'tree',
      12,
      $1::JSONB,
      $2::JSONB
    )
    ON CONFLICT (id) DO UPDATE SET
      name = EXCLUDED.name,
      description = EXCLUDED.description,
      components = EXCLUDED.components,
      exercise_mappings = EXCLUDED.exercise_mappings,
      tips = EXCLUDED.tips
  `, [
    JSON.stringify({
      run_1_5_mile: ['running', 'tempo_runs', 'interval_training', 'treadmill', 'trail_running'],
      pushups: ['push_ups', 'bench_press', 'dips', 'incline_push_ups', 'chest_press'],
      situps: ['sit_ups', 'crunches', 'leg_raises', 'ab_wheel', 'plank'],
      body_composition: ['running', 'hiit', 'cycling', 'rowing', 'swimming']
    }),
    JSON.stringify([
      { event: 'run_1_5_mile', tip: 'Forest Service positions often involve trail work - train on varied terrain when possible' },
      { event: 'pushups', tip: 'Build endurance with high-rep sets (20-30 reps) multiple times per week' },
      { event: 'situps', tip: 'Practice with feet anchored to simulate test conditions' },
      { event: 'body_composition', tip: 'Combine cardio with strength training for optimal body composition' }
    ])
  ]);

  // ============================================
  // BLM RANGER (BUREAU OF LAND MANAGEMENT)
  // ============================================
  log.info('Adding BLM Ranger test...');
  await db.query(`
    INSERT INTO pt_tests (id, name, description, institution, category, components, scoring_method, icon, recertification_months, exercise_mappings, tips)
    VALUES (
      'blm_ranger',
      'BLM Ranger Physical Efficiency Battery',
      'Physical fitness test for Bureau of Land Management law enforcement rangers. Based on the NPS Physical Efficiency Battery with similar percentile-based scoring.',
      'Bureau of Land Management',
      'park_ranger',
      '[
        {"id": "run_1_5_mile", "name": "1.5-Mile Run", "type": "time", "distance_miles": 1.5, "description": "Aerobic endurance test. Scored by age/gender percentile."},
        {"id": "illinois_agility", "name": "Illinois Agility Run", "type": "time", "description": "Agility and direction change test through cone course."},
        {"id": "bench_press_ratio", "name": "Bench Press", "type": "ratio", "description": "Upper body strength as percentage of body weight."},
        {"id": "sit_and_reach", "name": "Sit and Reach", "type": "distance", "unit": "inches", "description": "Flexibility assessment (informational)."},
        {"id": "body_composition", "name": "Body Composition", "type": "percentage", "description": "Body fat percentage (informational)."}
      ]'::JSONB,
      'percentile',
      'tree',
      12,
      $1::JSONB,
      $2::JSONB
    )
    ON CONFLICT (id) DO UPDATE SET
      name = EXCLUDED.name,
      description = EXCLUDED.description,
      components = EXCLUDED.components,
      exercise_mappings = EXCLUDED.exercise_mappings,
      tips = EXCLUDED.tips
  `, [
    JSON.stringify({
      run_1_5_mile: ['running', 'tempo_runs', 'interval_training', 'treadmill', 'trail_running'],
      illinois_agility: ['agility_drills', 'lateral_shuffles', 'cone_drills', 'sprints', 'shuttle_runs'],
      bench_press_ratio: ['bench_press', 'push_ups', 'dips', 'chest_press', 'incline_bench_press'],
      sit_and_reach: ['hamstring_stretch', 'seated_forward_fold', 'toe_touches', 'yoga'],
      body_composition: ['running', 'hiit', 'cycling', 'rowing', 'swimming']
    }),
    JSON.stringify([
      { event: 'run_1_5_mile', tip: 'BLM lands often involve high altitude - if possible, train at elevation' },
      { event: 'illinois_agility', tip: 'Set up the course at home and practice weekly - pattern recognition helps' },
      { event: 'illinois_agility', tip: 'Focus on low center of gravity and explosive direction changes' },
      { event: 'bench_press_ratio', tip: 'Know your body weight - test requirement is relative to your weight' },
      { event: 'bench_press_ratio', tip: 'Train 3x per week with progressive overload for strength gains' },
      { event: 'general', tip: 'BLM test mirrors NPS PEB - preparation for one prepares you for both' }
    ])
  ]);

  log.info('Migration 072_park_ranger_career_standards complete');
}

export async function down(): Promise<void> {
  log.info('Rolling back migration: 072_park_ranger_career_standards');

  // Remove park ranger PT tests
  await db.query(`
    DELETE FROM pt_tests WHERE id IN ('nps_peb', 'wa_ranger_pat', 'ca_ranger_pat', 'usfs_leo', 'blm_ranger')
  `);

  // Note: We don't remove 'park_ranger' from the enum as it may cause issues
  // with any user data that references this category

  log.info('Rollback 072_park_ranger_career_standards complete');
}

export const up = migrate;
