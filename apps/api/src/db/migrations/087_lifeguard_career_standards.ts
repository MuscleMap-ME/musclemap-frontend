/**
 * Migration 071: Lifeguard and Aquatic Safety Career Standards
 *
 * Adds career standards for lifeguard and aquatic safety certifications:
 * 1. American Red Cross Lifeguard (arc-lifeguard) - r.24 update effective Sept 2024
 * 2. YMCA Lifeguard Certification (ymca-lifeguard)
 * 3. USLA Open Water Lifeguard (usla-ocean)
 * 4. Generic Pool Lifeguard (pool-lifeguard-generic)
 *
 * These are primarily swim-based tests with components for:
 * - Distance swimming (various strokes)
 * - Treading water (some with hands above water)
 * - Surface diving and object retrieval
 * - Sprint swimming
 * - CPR/First Aid skills
 */

import { db } from '../client';
import { loggers } from '../../lib/logger';

const log = loggers.db;

async function _columnExists(tableName: string, columnName: string): Promise<boolean> {
  const result = await db.queryOne<{ count: string }>(
    `SELECT COUNT(*) as count FROM information_schema.columns
     WHERE table_name = $1 AND column_name = $2`,
    [tableName, columnName]
  );
  return parseInt(result?.count || '0') > 0;
}

export async function migrate(): Promise<void> {
  log.info('Running migration: 071_lifeguard_career_standards');

  // ============================================
  // ADD 'lifeguard' TO CATEGORY CHECK CONSTRAINT
  // ============================================

  // First, check if the category constraint needs updating
  const constraintCheck = await db.queryOne<{ constraint_name: string }>(
    `SELECT constraint_name FROM information_schema.check_constraints
     WHERE constraint_name LIKE '%pt_tests_category%'`
  );

  if (constraintCheck) {
    log.info('Updating category constraint to include lifeguard...');
    await db.query(`ALTER TABLE pt_tests DROP CONSTRAINT IF EXISTS pt_tests_category_check`);
    await db.query(`
      ALTER TABLE pt_tests ADD CONSTRAINT pt_tests_category_check
      CHECK (category IN ('military', 'firefighter', 'law_enforcement', 'special_operations', 'civil_service', 'general', 'corrections', 'ems_paramedic', 'trades_construction', 'lifeguard', 'public_service', 'park_ranger', 'transportation'))
    `);
  }

  // ============================================
  // AMERICAN RED CROSS LIFEGUARD (r.24 - Sept 2024)
  // ============================================

  log.info('Adding American Red Cross Lifeguard certification...');
  await db.query(`
    INSERT INTO pt_tests (
      id,
      name,
      description,
      institution,
      category,
      components,
      scoring_method,
      icon,
      recertification_months,
      exercise_mappings,
      tips
    )
    VALUES (
      'arc-lifeguard',
      'American Red Cross Lifeguard',
      'Lifeguard certification from the American Red Cross (r.24 update effective September 2024). Prerequisites include a 200-yard swim sequence and timed brick retrieval. Certification valid for 2 years. Minimum age: 15+. Written exams require 80%+ passing score.',
      'American Red Cross',
      'lifeguard',
      $1::JSONB,
      'pass_fail',
      'lifesaver',
      24,
      $2::JSONB,
      $3::JSONB
    )
    ON CONFLICT (id) DO UPDATE SET
      name = EXCLUDED.name,
      description = EXCLUDED.description,
      components = EXCLUDED.components,
      recertification_months = EXCLUDED.recertification_months,
      exercise_mappings = EXCLUDED.exercise_mappings,
      tips = EXCLUDED.tips
  `, [
    // Components
    JSON.stringify([
      {
        id: 'swim_150yd_crawl_breast',
        name: '150-Yard Swim (Front Crawl/Breaststroke)',
        type: 'time',
        distance_yards: 150,
        description: 'Continuous swim using front crawl and/or breaststroke. No time limit but must be continuous.',
        required: true
      },
      {
        id: 'tread_2min_hands_up',
        name: '2-Minute Tread (Hands Above Water)',
        type: 'time',
        duration_seconds: 120,
        description: 'Tread water for 2 minutes with hands held above water level. Tests leg-only treading ability.',
        required: true
      },
      {
        id: 'swim_50yd_backstroke',
        name: '50-Yard Backstroke',
        type: 'time',
        distance_yards: 50,
        description: 'Swim 50 yards using elementary backstroke. Completes the 200-yard swim sequence.',
        required: true
      },
      {
        id: 'brick_retrieval_timed',
        name: 'Timed Brick Retrieval',
        type: 'time',
        time_limit_seconds: 100,
        description: 'Swim 20 yards, surface dive to 7-10 feet, retrieve 10-lb object, swim 20 yards on back holding object. Must complete within 1:40.',
        required: true,
        sub_components: [
          { id: 'swim_to_brick', name: 'Swim 20 yards', distance_yards: 20 },
          { id: 'surface_dive', name: 'Surface dive to 7-10 feet', depth_feet_min: 7, depth_feet_max: 10 },
          { id: 'retrieve_object', name: 'Retrieve 10-lb brick/object', weight_lbs: 10 },
          { id: 'swim_back', name: 'Swim 20 yards on back with object', distance_yards: 20 }
        ]
      },
      {
        id: 'written_exam',
        name: 'Written Examination',
        type: 'score',
        passing_score: 80,
        max_score: 100,
        description: 'Written exams on lifeguarding skills, first aid, CPR/AED. Must score 80% or higher.',
        required: true
      }
    ]),
    // Exercise mappings
    JSON.stringify({
      swim_150yd_crawl_breast: ['swimming', 'front_crawl', 'breaststroke', 'freestyle_swimming'],
      tread_2min_hands_up: ['treading_water', 'eggbeater_kick', 'scissor_kick', 'flutter_kick'],
      swim_50yd_backstroke: ['swimming', 'backstroke', 'elementary_backstroke'],
      brick_retrieval_timed: ['swimming', 'diving', 'surface_dive', 'underwater_swimming', 'treading_water'],
      general: ['swimming', 'treading_water', 'diving', 'push_ups']
    }),
    // Tips
    JSON.stringify([
      { event: 'swim_150yd_crawl_breast', tip: 'Practice breathing bilaterally to build endurance and efficiency' },
      { event: 'swim_150yd_crawl_breast', tip: 'Focus on stroke technique over speed - the goal is continuous swimming' },
      { event: 'tread_2min_hands_up', tip: 'Master the eggbeater kick - it is the most efficient for hands-up treading' },
      { event: 'tread_2min_hands_up', tip: 'Practice treading with progressively heavier objects held above water' },
      { event: 'swim_50yd_backstroke', tip: 'Keep hips high and maintain a steady kick rhythm' },
      { event: 'brick_retrieval_timed', tip: 'Practice surface dives to build comfort with depth and pressure' },
      { event: 'brick_retrieval_timed', tip: 'When swimming back with object, keep it on your chest and use strong kicks' },
      { event: 'brick_retrieval_timed', tip: 'Time yourself regularly - you need to complete within 1:40' },
      { event: 'general', tip: 'Build overall swim endurance with interval training: 100m repeats with 15-30 second rest' }
    ])
  ]);

  // ============================================
  // YMCA LIFEGUARD CERTIFICATION
  // ============================================

  log.info('Adding YMCA Lifeguard certification...');
  await db.query(`
    INSERT INTO pt_tests (
      id,
      name,
      description,
      institution,
      category,
      components,
      scoring_method,
      icon,
      recertification_months,
      exercise_mappings,
      tips
    )
    VALUES (
      'ymca-lifeguard',
      'YMCA Lifeguard Certification',
      'Lifeguard certification from the YMCA. Three-phase prerequisite assessment plus 45-hour training course (9hr e-learning, 20hr classroom, 16hr water skills). Minimum age: 16+.',
      'YMCA',
      'lifeguard',
      $1::JSONB,
      'pass_fail',
      'lifesaver',
      24,
      $2::JSONB,
      $3::JSONB
    )
    ON CONFLICT (id) DO UPDATE SET
      name = EXCLUDED.name,
      description = EXCLUDED.description,
      components = EXCLUDED.components,
      recertification_months = EXCLUDED.recertification_months,
      exercise_mappings = EXCLUDED.exercise_mappings,
      tips = EXCLUDED.tips
  `, [
    // Components
    JSON.stringify([
      // Phase 1
      {
        id: 'phase1_tread_2min',
        name: 'Phase 1: Tread Water 2 Minutes',
        type: 'time',
        duration_seconds: 120,
        phase: 1,
        description: 'Tread water for 2 minutes without using hands on the wall or lane line.',
        required: true
      },
      {
        id: 'phase1_swim_100yd_crawl',
        name: 'Phase 1: 100-Yard Front Crawl',
        type: 'time',
        distance_yards: 100,
        phase: 1,
        description: 'Swim 100 yards using front crawl with rhythmic breathing.',
        required: true
      },
      // Phase 2
      {
        id: 'phase2_elementary_backstroke',
        name: 'Phase 2: Elementary Backstroke',
        type: 'pass_fail',
        phase: 2,
        description: 'Demonstrate proficiency in elementary backstroke.',
        required: true
      },
      {
        id: 'phase2_surface_dive',
        name: 'Phase 2: Feet-First Surface Dive (8-10 ft)',
        type: 'pass_fail',
        phase: 2,
        depth_feet_min: 8,
        depth_feet_max: 10,
        description: 'Perform a feet-first surface dive to a depth of 8-10 feet.',
        required: true
      },
      {
        id: 'phase2_underwater_swim',
        name: 'Phase 2: Swim Underwater 15 Feet',
        type: 'distance',
        distance_feet: 15,
        phase: 2,
        description: 'Swim underwater for 15 feet.',
        required: true
      },
      // Phase 3
      {
        id: 'phase3_sprint_60ft',
        name: 'Phase 3: 60-Foot Sprint',
        type: 'time',
        distance_feet: 60,
        phase: 3,
        description: 'Sprint swim 60 feet.',
        required: true
      },
      {
        id: 'phase3_surface_dive_retrieve',
        name: 'Phase 3: Surface Dive and Retrieve Object',
        type: 'pass_fail',
        phase: 3,
        description: 'Perform a surface dive and retrieve an object from the bottom.',
        required: true
      },
      {
        id: 'phase3_swim_back_with_object',
        name: 'Phase 3: Swim on Back Holding Object',
        type: 'pass_fail',
        phase: 3,
        description: 'Swim on back while holding the retrieved object.',
        required: true
      },
      // CPR Assessment
      {
        id: 'cpr_compressions',
        name: 'CPR Compressions on Manikin',
        type: 'pass_fail',
        description: 'Demonstrate proper CPR compressions on a training manikin.',
        required: true
      },
      // Course Requirements
      {
        id: 'course_elearning',
        name: 'E-Learning Module',
        type: 'completion',
        duration_hours: 9,
        description: '9 hours of online e-learning coursework.',
        required: true
      },
      {
        id: 'course_classroom',
        name: 'Classroom Training',
        type: 'completion',
        duration_hours: 20,
        description: '20 hours of in-person classroom instruction.',
        required: true
      },
      {
        id: 'course_water_skills',
        name: 'Water Skills Training',
        type: 'completion',
        duration_hours: 16,
        description: '16 hours of in-water skills training.',
        required: true
      }
    ]),
    // Exercise mappings
    JSON.stringify({
      phase1_tread_2min: ['treading_water', 'eggbeater_kick', 'scissor_kick'],
      phase1_swim_100yd_crawl: ['swimming', 'front_crawl', 'freestyle_swimming'],
      phase2_elementary_backstroke: ['swimming', 'backstroke', 'elementary_backstroke'],
      phase2_surface_dive: ['diving', 'surface_dive', 'treading_water'],
      phase2_underwater_swim: ['swimming', 'underwater_swimming', 'breath_hold'],
      phase3_sprint_60ft: ['swimming', 'sprint_swimming', 'front_crawl'],
      phase3_surface_dive_retrieve: ['diving', 'surface_dive', 'underwater_swimming'],
      cpr_compressions: ['push_ups', 'chest_compressions'],
      general: ['swimming', 'treading_water', 'diving', 'running', 'push_ups']
    }),
    // Tips
    JSON.stringify([
      { event: 'phase1_tread_2min', tip: 'Practice treading with different kicks: eggbeater, scissor, and flutter' },
      { event: 'phase1_swim_100yd_crawl', tip: 'Focus on bilateral breathing and relaxed, efficient strokes' },
      { event: 'phase2_surface_dive', tip: 'Tuck your body tight and use a strong downward push to reach depth' },
      { event: 'phase2_underwater_swim', tip: 'Practice breath-holding exercises to build comfort underwater' },
      { event: 'phase3_sprint_60ft', tip: 'Explosive push-off from the wall and maintain fast turnover' },
      { event: 'cpr_compressions', tip: 'Build upper body endurance - CPR is physically demanding for extended periods' },
      { event: 'general', tip: 'The 45-hour course is intensive - arrive well-rested and physically prepared' }
    ])
  ]);

  // ============================================
  // USLA OPEN WATER LIFEGUARD
  // ============================================

  log.info('Adding USLA Open Water Lifeguard certification...');
  await db.query(`
    INSERT INTO pt_tests (
      id,
      name,
      description,
      institution,
      category,
      components,
      scoring_method,
      icon,
      recertification_months,
      exercise_mappings,
      tips
    )
    VALUES (
      'usla-ocean',
      'USLA Open Water Lifeguard',
      'United States Lifesaving Association Open Water Lifeguard certification for beach and ocean environments. Includes ocean swimming, run-swim-run events, rescue board paddling, victim extraction, and first aid. Requires stronger swimming abilities than pool certifications.',
      'U.S. Lifesaving Association',
      'lifeguard',
      $1::JSONB,
      'pass_fail',
      'ocean',
      12,
      $2::JSONB,
      $3::JSONB
    )
    ON CONFLICT (id) DO UPDATE SET
      name = EXCLUDED.name,
      description = EXCLUDED.description,
      components = EXCLUDED.components,
      recertification_months = EXCLUDED.recertification_months,
      exercise_mappings = EXCLUDED.exercise_mappings,
      tips = EXCLUDED.tips
  `, [
    // Components
    JSON.stringify([
      {
        id: 'ocean_swim_500m',
        name: '500-Meter Ocean Swim',
        type: 'time',
        distance_meters: 500,
        time_limit_minutes: 10,
        description: 'Swim 500 meters in open water (ocean/surf conditions) within 10 minutes.',
        required: true,
        environment: 'open_water'
      },
      {
        id: 'run_swim_run',
        name: 'Run-Swim-Run',
        type: 'time',
        description: 'Beach run, ocean swim through surf, beach run. Tests transition skills and surf navigation.',
        required: true,
        sub_components: [
          { id: 'beach_run_1', name: 'Beach run (soft sand)', distance_meters: 200 },
          { id: 'ocean_swim', name: 'Ocean swim through surf', distance_meters: 200 },
          { id: 'beach_run_2', name: 'Beach run (soft sand)', distance_meters: 200 }
        ]
      },
      {
        id: 'rescue_board_paddle',
        name: 'Rescue Board Paddling',
        type: 'time',
        description: 'Paddle rescue board through surf zone and back. Tests board control and paddling endurance.',
        required: true,
        equipment: 'rescue_board'
      },
      {
        id: 'victim_extraction',
        name: 'Victim Extraction',
        type: 'pass_fail',
        description: 'Demonstrate proper technique for extracting a victim from the water, including spinal immobilization scenarios.',
        required: true
      },
      {
        id: 'first_aid_cpr',
        name: 'First Aid and CPR',
        type: 'pass_fail',
        description: 'Demonstrate first aid, CPR, and AED use per USLA standards.',
        required: true
      },
      {
        id: 'written_exam',
        name: 'Written Examination',
        type: 'score',
        passing_score: 70,
        max_score: 100,
        description: 'Written exam covering ocean safety, rip currents, marine life, and rescue procedures.',
        required: true
      }
    ]),
    // Exercise mappings
    JSON.stringify({
      ocean_swim_500m: ['swimming', 'front_crawl', 'open_water_swimming', 'freestyle_swimming', 'treading_water'],
      run_swim_run: ['running', 'soft_sand_running', 'swimming', 'sprint_swimming'],
      rescue_board_paddle: ['paddling', 'prone_paddling', 'swimming', 'core_exercises', 'shoulder_exercises'],
      victim_extraction: ['deadlift', 'farmers_carry', 'core_exercises', 'squat'],
      first_aid_cpr: ['push_ups', 'chest_compressions'],
      general: ['swimming', 'running', 'treading_water', 'diving', 'push_ups']
    }),
    // Tips
    JSON.stringify([
      { event: 'ocean_swim_500m', tip: 'Train in open water regularly - ocean conditions are very different from pools' },
      { event: 'ocean_swim_500m', tip: 'Practice sighting every 6-8 strokes to maintain a straight line' },
      { event: 'ocean_swim_500m', tip: 'Learn to read rip currents and use them to your advantage when appropriate' },
      { event: 'run_swim_run', tip: 'Soft sand running requires higher knees and more quad engagement' },
      { event: 'run_swim_run', tip: 'Practice diving through waves - timing your entry is crucial' },
      { event: 'rescue_board_paddle', tip: 'Build shoulder endurance with prone paddling drills' },
      { event: 'rescue_board_paddle', tip: 'Learn to punch through waves on the board vs. going over them' },
      { event: 'victim_extraction', tip: 'Build functional strength with carries and drags' },
      { event: 'general', tip: 'Ocean lifeguarding is more physically demanding - maintain year-round fitness' }
    ])
  ]);

  // ============================================
  // GENERIC POOL LIFEGUARD
  // ============================================

  log.info('Adding Generic Pool Lifeguard standard...');
  await db.query(`
    INSERT INTO pt_tests (
      id,
      name,
      description,
      institution,
      category,
      components,
      scoring_method,
      icon,
      recertification_months,
      exercise_mappings,
      tips
    )
    VALUES (
      'pool-lifeguard-generic',
      'Pool Lifeguard (Generic Standard)',
      'Generic pool lifeguard certification standard. Requirements vary by certifying body but typically include a 300-yard swim, brick retrieval, treading water, and CPR/First Aid certification. Use this for general preparation.',
      'Various',
      'lifeguard',
      $1::JSONB,
      'pass_fail',
      'lifesaver',
      24,
      $2::JSONB,
      $3::JSONB
    )
    ON CONFLICT (id) DO UPDATE SET
      name = EXCLUDED.name,
      description = EXCLUDED.description,
      components = EXCLUDED.components,
      recertification_months = EXCLUDED.recertification_months,
      exercise_mappings = EXCLUDED.exercise_mappings,
      tips = EXCLUDED.tips
  `, [
    // Components
    JSON.stringify([
      {
        id: 'swim_300yd',
        name: '300-Yard Continuous Swim',
        type: 'time',
        distance_yards: 300,
        description: 'Swim 300 yards continuously using front crawl, breaststroke, or combination. No time limit but must be continuous.',
        required: true
      },
      {
        id: 'brick_retrieval',
        name: 'Brick Retrieval',
        type: 'pass_fail',
        description: 'Starting in the water, swim 20 yards, surface dive to depth (7-10 feet), retrieve a 10-lb brick, and return to the start while keeping the brick above water.',
        required: true,
        time_limit_seconds: 100
      },
      {
        id: 'tread_water_2min',
        name: 'Tread Water 2 Minutes',
        type: 'time',
        duration_seconds: 120,
        description: 'Tread water for 2 minutes without support. Some certifications require hands out of water.',
        required: true
      },
      {
        id: 'cpr_first_aid',
        name: 'CPR/AED and First Aid',
        type: 'pass_fail',
        description: 'Demonstrate proficiency in CPR, AED use, and basic first aid according to certifying body standards.',
        required: true
      }
    ]),
    // Exercise mappings
    JSON.stringify({
      swim_300yd: ['swimming', 'front_crawl', 'breaststroke', 'freestyle_swimming'],
      brick_retrieval: ['swimming', 'diving', 'surface_dive', 'underwater_swimming', 'treading_water'],
      tread_water_2min: ['treading_water', 'eggbeater_kick', 'scissor_kick', 'flutter_kick'],
      cpr_first_aid: ['push_ups', 'chest_compressions'],
      general: ['swimming', 'treading_water', 'diving', 'push_ups']
    }),
    // Tips
    JSON.stringify([
      { event: 'swim_300yd', tip: 'Build endurance with longer swims at moderate pace - aim for 500+ yards in training' },
      { event: 'swim_300yd', tip: 'Practice efficient breathing patterns to maintain rhythm over distance' },
      { event: 'brick_retrieval', tip: 'Practice surface dives regularly to build comfort with depth' },
      { event: 'brick_retrieval', tip: 'When retrieving, secure the brick against your chest before surfacing' },
      { event: 'tread_water_2min', tip: 'Conserve energy with slow, controlled movements - do not thrash' },
      { event: 'tread_water_2min', tip: 'The eggbeater kick is most efficient for extended treading' },
      { event: 'cpr_first_aid', tip: 'Push-up endurance helps with sustained chest compressions' },
      { event: 'general', tip: 'Check specific requirements with your certifying body - standards vary' }
    ])
  ]);

  // ============================================
  // UPDATE USER CAREER GOALS TABLE (if needed)
  // ============================================

  // Ensure the pt_test_id foreign key allows for our new lifeguard tests
  // This should work automatically since we're inserting into pt_tests

  log.info('Migration 071_lifeguard_career_standards complete');
}

export async function down(): Promise<void> {
  log.info('Rolling back migration: 071_lifeguard_career_standards');

  // Remove the lifeguard tests
  await db.query(`
    DELETE FROM pt_tests
    WHERE id IN ('arc-lifeguard', 'ymca-lifeguard', 'usla-ocean', 'pool-lifeguard-generic')
  `);

  // Note: We don't remove 'lifeguard' from the category constraint
  // as it doesn't hurt to have it available for future use

  log.info('Rollback 071_lifeguard_career_standards complete');
}

// Export for migration runner
export const up = migrate;
