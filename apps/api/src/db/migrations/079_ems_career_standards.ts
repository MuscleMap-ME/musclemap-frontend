/**
 * Migration: EMS/Paramedic Career Standards
 *
 * Adds EMS-specific physical ability tests:
 * 1. Medic Mile (National Testing Network)
 * 2. SF Fire EMS PAT (San Francisco Fire Department)
 * 3. Chicago EMS PAT (Chicago Fire Department)
 * 4. Generic EMS PAT (Various departments)
 *
 * These standards support the career readiness feature for
 * EMTs, paramedics, and ambulance personnel.
 */

import { db } from '../client';
import { loggers } from '../../lib/logger';

const log = loggers.db;

export async function migrate(): Promise<void> {
  log.info('Running migration: 070_ems_career_standards');

  // =============================================
  // 1. MEDIC MILE (National Testing Network)
  // =============================================

  log.info('Adding Medic Mile standard...');

  await db.query(`
    INSERT INTO pt_tests (
      id, name, description, institution, category, components,
      scoring_method, icon, active, recertification_months,
      exercise_mappings, tips
    ) VALUES (
      'medic-mile',
      'Medic Mile',
      'The Medic Mile is a comprehensive physical ability test designed by the National Testing Network for EMS candidates. It evaluates strength, endurance, and task-specific abilities required for emergency medical services. The test simulates real-world paramedic duties including patient handling, equipment transport, and sustained physical effort.',
      'National Testing Network',
      'ems_paramedic',
      $1::JSONB,
      'pass_fail',
      'ambulance',
      true,
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
      active = EXCLUDED.active,
      recertification_months = EXCLUDED.recertification_months,
      exercise_mappings = EXCLUDED.exercise_mappings,
      tips = EXCLUDED.tips
  `, [
    // Components (events)
    JSON.stringify([
      {
        id: 'stair_climb_equipment',
        name: 'Stair Climb with Equipment',
        type: 'task',
        description: 'Climb stairs while carrying 70 lbs of EMS equipment (jump bag, AED, oxygen). Simulates accessing patients in multi-story buildings.',
        metric_type: 'pass_fail',
        direction: 'pass_fail',
        equipment_required: ['stairs', 'weighted_bag'],
        load_lbs: 70,
        exercise_mappings: ['stair_climber', 'step_ups', 'lunges', 'farmers_carry'],
        tips: [
          'Train with weighted vest progressively increasing from 40 to 70 lbs',
          'Practice steady breathing during stair climbs',
          'Build leg endurance with high-rep step-ups'
        ]
      },
      {
        id: 'patient_drag',
        name: 'Patient Drag',
        type: 'task',
        description: 'Drag a 165-lb mannequin 50 feet, simulating moving an unconscious patient to safety.',
        metric_type: 'pass_fail',
        direction: 'pass_fail',
        weight_lbs: 165,
        distance_ft: 50,
        exercise_mappings: ['sled_drag', 'deadlift', 'hip_thrusts', 'farmers_carry'],
        tips: [
          'Keep low and drive with your legs',
          'Build hip and glute strength with deadlifts and hip thrusts',
          'Practice dragging technique - grab under armpits'
        ]
      },
      {
        id: 'gurney_operations',
        name: 'Gurney Operations',
        type: 'task',
        description: 'Load, maneuver, and unload a 200-lb patient on a gurney. Includes lifting gurney in and out of ambulance.',
        metric_type: 'pass_fail',
        direction: 'pass_fail',
        exercise_mappings: ['deadlift', 'goblet_squat', 'rows', 'core_rotation'],
        tips: [
          'Focus on proper lifting mechanics - bend at knees, not waist',
          'Build core stability for controlled movements',
          'Train grip endurance for sustained holds'
        ]
      },
      {
        id: 'equipment_carry',
        name: 'Equipment Carry',
        type: 'task',
        description: 'Carry medical equipment (jump bag, cardiac monitor, drug box) 80 feet over varied terrain.',
        metric_type: 'pass_fail',
        direction: 'pass_fail',
        distance_ft: 80,
        exercise_mappings: ['farmers_carry', 'kettlebell_carry', 'lunges', 'suitcase_carry'],
        tips: [
          'Train grip endurance with heavy carries',
          'Practice single-arm carries for imbalanced loads',
          'Build shoulder stability for awkward carrying positions'
        ]
      },
      {
        id: 'cpr_simulation',
        name: 'CPR Simulation',
        type: 'task',
        description: 'Perform continuous CPR compressions for 2 minutes at proper depth (2-2.4 inches) and rate (100-120/min).',
        metric_type: 'time',
        metric_unit: 'seconds',
        duration_seconds: 120,
        direction: 'pass_fail',
        passing_threshold: 120,
        exercise_mappings: ['push_ups', 'bench_press', 'tricep_dips', 'plank'],
        tips: [
          'Build pushing endurance with high-rep push-ups',
          'Practice CPR technique to minimize fatigue',
          'Strengthen core for sustained body positioning'
        ]
      },
      {
        id: 'balance_coordination',
        name: 'Balance/Coordination Test',
        type: 'task',
        description: 'Navigate obstacles while carrying equipment, testing balance and coordination under load.',
        metric_type: 'pass_fail',
        direction: 'pass_fail',
        exercise_mappings: ['single_leg_deadlift', 'bosu_ball_squats', 'lunges', 'balance_board'],
        tips: [
          'Train single-leg stability exercises',
          'Practice carrying loads on unstable surfaces',
          'Build proprioception with balance board work'
        ]
      }
    ]),
    // Exercise mappings (overall test)
    JSON.stringify({
      stair_climb_equipment: ['stair_climber', 'step_ups', 'lunges', 'farmers_carry'],
      patient_drag: ['sled_drag', 'deadlift', 'hip_thrusts', 'farmers_carry'],
      gurney_operations: ['deadlift', 'goblet_squat', 'rows', 'core_rotation'],
      equipment_carry: ['farmers_carry', 'kettlebell_carry', 'lunges', 'suitcase_carry'],
      cpr_simulation: ['push_ups', 'bench_press', 'tricep_dips', 'plank'],
      balance_coordination: ['single_leg_deadlift', 'bosu_ball_squats', 'lunges', 'balance_board']
    }),
    // Tips (overall test)
    JSON.stringify([
      { event: 'general', tip: 'Build a strong aerobic base - EMS work requires sustained effort over long shifts' },
      { event: 'general', tip: 'Focus on functional movements that translate to patient handling' },
      { event: 'stair_climb_equipment', tip: 'Practice stair climbs with progressively heavier loads' },
      { event: 'patient_drag', tip: 'Train posterior chain with deadlifts and sled work' },
      { event: 'gurney_operations', tip: 'Perfect your lifting mechanics to protect your back' },
      { event: 'equipment_carry', tip: 'Build grip endurance - you will carry equipment constantly' },
      { event: 'cpr_simulation', tip: 'High-rep push-ups build the endurance needed for prolonged CPR' },
      { event: 'balance_coordination', tip: 'Single-leg exercises improve stability when navigating obstacles' }
    ])
  ]);

  // =============================================
  // 2. SF FIRE EMS PAT (San Francisco Fire Department)
  // =============================================

  log.info('Adding SF Fire EMS PAT standard...');

  await db.query(`
    INSERT INTO pt_tests (
      id, name, description, institution, category, components,
      scoring_method, max_score, passing_score, icon, active,
      recertification_months, exercise_mappings, tips
    ) VALUES (
      'sf-ems-pat',
      'SF Fire EMS PAT',
      'San Francisco Fire Department EMS Physical Ability Test. A continuous timed test that must be completed in 4 minutes 30 seconds or less. Tests the physical demands specific to San Francisco EMS operations, including high-rise building access and ambulance operations.',
      'San Francisco Fire Department',
      'ems_paramedic',
      $1::JSONB,
      'pass_fail',
      270,
      270,
      'ambulance',
      true,
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
      max_score = EXCLUDED.max_score,
      passing_score = EXCLUDED.passing_score,
      icon = EXCLUDED.icon,
      active = EXCLUDED.active,
      recertification_months = EXCLUDED.recertification_months,
      exercise_mappings = EXCLUDED.exercise_mappings,
      tips = EXCLUDED.tips
  `, [
    // Components (events) - must complete all in sequence within 4:30
    JSON.stringify([
      {
        id: 'sf_stair_climb_bags',
        name: 'Stair Climb with Medical Bags',
        type: 'task',
        description: 'Carry 3 medical bags (total 70 lbs) up 6 flights of stairs. Simulates high-rise medical response in San Francisco buildings.',
        metric_type: 'pass_fail',
        direction: 'pass_fail',
        load_lbs: 70,
        flights: 6,
        exercise_mappings: ['stair_climber', 'farmers_carry', 'step_ups', 'lunges'],
        tips: [
          'SF has many hills and high-rises - train stair endurance extensively',
          'Practice carrying awkward loads (bags of different sizes)',
          'Build leg and grip endurance together'
        ]
      },
      {
        id: 'sf_mannequin_drag',
        name: 'Mannequin Drag',
        type: 'task',
        description: 'Drag a 165-lb mannequin 15 feet to simulate moving a patient from a confined space.',
        metric_type: 'pass_fail',
        direction: 'pass_fail',
        weight_lbs: 165,
        distance_ft: 15,
        exercise_mappings: ['sled_drag', 'deadlift', 'hip_thrusts', 'goblet_squat'],
        tips: [
          'Short but heavy - focus on explosive power',
          'Keep low center of gravity',
          'Practice quick transitions between events'
        ]
      },
      {
        id: 'sf_stair_descent_bags',
        name: 'Stair Descent with Bags',
        type: 'task',
        description: 'Return down 6 flights of stairs carrying all 3 medical bags. Tests controlled descent under load.',
        metric_type: 'pass_fail',
        direction: 'pass_fail',
        load_lbs: 70,
        flights: 6,
        exercise_mappings: ['step_downs', 'reverse_lunges', 'eccentric_squats', 'calf_raises'],
        tips: [
          'Control your descent - do not rush and risk falling',
          'Train eccentric leg strength for controlled lowering',
          'Practice turning on stair landings while loaded'
        ]
      },
      {
        id: 'sf_gurney_pull',
        name: 'Loaded Gurney Pull',
        type: 'task',
        description: 'Pull a fully loaded gurney (165-lb patient weight) from the ambulance, simulating patient transport.',
        metric_type: 'pass_fail',
        direction: 'pass_fail',
        weight_lbs: 165,
        exercise_mappings: ['sled_drag', 'rows', 'deadlift', 'grip_work'],
        tips: [
          'Focus on pulling mechanics and body positioning',
          'Build back and grip strength for sustained pulls',
          'Practice smooth, controlled gurney manipulation'
        ]
      }
    ]),
    // Exercise mappings
    JSON.stringify({
      sf_stair_climb_bags: ['stair_climber', 'farmers_carry', 'step_ups', 'lunges'],
      sf_mannequin_drag: ['sled_drag', 'deadlift', 'hip_thrusts', 'goblet_squat'],
      sf_stair_descent_bags: ['step_downs', 'reverse_lunges', 'eccentric_squats', 'calf_raises'],
      sf_gurney_pull: ['sled_drag', 'rows', 'deadlift', 'grip_work']
    }),
    // Tips
    JSON.stringify([
      { event: 'general', tip: 'This is a continuous test - pace yourself but keep moving' },
      { event: 'general', tip: 'Time limit is strict at 4:30 - practice the full sequence' },
      { event: 'sf_stair_climb_bags', tip: 'San Francisco terrain requires exceptional stair fitness' },
      { event: 'sf_mannequin_drag', tip: 'Quick transition from stairs to drag is key' },
      { event: 'sf_stair_descent_bags', tip: 'Controlled descent prevents injury and time loss' },
      { event: 'sf_gurney_pull', tip: 'Finish strong - do not lose time on the final event' }
    ])
  ]);

  // =============================================
  // 3. CHICAGO EMS PAT (Chicago Fire Department)
  // =============================================

  log.info('Adding Chicago EMS PAT standard...');

  await db.query(`
    INSERT INTO pt_tests (
      id, name, description, institution, category, components,
      scoring_method, icon, active, recertification_months,
      exercise_mappings, tips
    ) VALUES (
      'chicago-ems-pat',
      'Chicago EMS PAT',
      'Chicago Fire Department EMS Physical Ability Test. Evaluates candidates for the physical demands of emergency medical services in the Chicago metro area. Tests include stair climbing, patient handling, equipment transport, and endurance components.',
      'Chicago Fire Department',
      'ems_paramedic',
      $1::JSONB,
      'pass_fail',
      'ambulance',
      true,
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
      active = EXCLUDED.active,
      recertification_months = EXCLUDED.recertification_months,
      exercise_mappings = EXCLUDED.exercise_mappings,
      tips = EXCLUDED.tips
  `, [
    // Components (events)
    JSON.stringify([
      {
        id: 'chi_stair_climb_gear',
        name: 'Stair Climb with Gear',
        type: 'task',
        description: 'Climb 4 flights of stairs while wearing/carrying EMS gear (approximately 50 lbs). Return to ground level.',
        metric_type: 'pass_fail',
        direction: 'pass_fail',
        load_lbs: 50,
        flights: 4,
        exercise_mappings: ['stair_climber', 'step_ups', 'weighted_vest_walks', 'lunges'],
        tips: [
          'Build stair endurance with regular training',
          'Practice with weighted vest to simulate gear weight',
          'Maintain steady pace - do not burn out on first flight'
        ]
      },
      {
        id: 'chi_patient_lift_carry',
        name: 'Patient Lift and Carry',
        type: 'task',
        description: 'Lift and carry a patient simulation (using weighted mannequin or partner) demonstrating proper body mechanics.',
        metric_type: 'pass_fail',
        direction: 'pass_fail',
        exercise_mappings: ['deadlift', 'goblet_squat', 'farmers_carry', 'zercher_squat'],
        tips: [
          'Perfect lifting mechanics to protect your spine',
          'Train full-body strength with compound movements',
          'Practice lifting from various positions and heights'
        ]
      },
      {
        id: 'chi_equipment_transport',
        name: 'Equipment Transport',
        type: 'task',
        description: 'Transport multiple pieces of EMS equipment across a measured distance, simulating scene setup.',
        metric_type: 'pass_fail',
        direction: 'pass_fail',
        exercise_mappings: ['farmers_carry', 'suitcase_carry', 'kettlebell_carry', 'loaded_carries'],
        tips: [
          'Train carrying different sized/weighted objects',
          'Build grip endurance for sustained holds',
          'Practice efficient movement patterns'
        ]
      },
      {
        id: 'chi_endurance_circuit',
        name: 'Endurance Circuit',
        type: 'task',
        description: 'Complete a circuit of job-related tasks demonstrating sustained work capacity over time.',
        metric_type: 'pass_fail',
        direction: 'pass_fail',
        exercise_mappings: ['burpees', 'rowing', 'battle_ropes', 'box_jumps', 'kettlebell_swings'],
        tips: [
          'Build aerobic base for sustained effort',
          'Train high-intensity intervals to improve work capacity',
          'Practice transitioning quickly between different movements'
        ]
      }
    ]),
    // Exercise mappings
    JSON.stringify({
      chi_stair_climb_gear: ['stair_climber', 'step_ups', 'weighted_vest_walks', 'lunges'],
      chi_patient_lift_carry: ['deadlift', 'goblet_squat', 'farmers_carry', 'zercher_squat'],
      chi_equipment_transport: ['farmers_carry', 'suitcase_carry', 'kettlebell_carry', 'loaded_carries'],
      chi_endurance_circuit: ['burpees', 'rowing', 'battle_ropes', 'box_jumps', 'kettlebell_swings']
    }),
    // Tips
    JSON.stringify([
      { event: 'general', tip: 'Chicago EMS operates in all weather - train in varied conditions' },
      { event: 'general', tip: 'Focus on both strength and endurance - the job requires both' },
      { event: 'chi_stair_climb_gear', tip: 'Many Chicago buildings lack elevators - stair fitness is critical' },
      { event: 'chi_patient_lift_carry', tip: 'Back injuries are common in EMS - prioritize proper form' },
      { event: 'chi_equipment_transport', tip: 'Train grip endurance - you will carry equipment on every call' },
      { event: 'chi_endurance_circuit', tip: 'EMS shifts are long - build work capacity for 12-24 hour shifts' }
    ])
  ]);

  // =============================================
  // 4. GENERIC EMS PAT (Various Departments)
  // =============================================

  log.info('Adding Generic EMS PAT standard...');

  await db.query(`
    INSERT INTO pt_tests (
      id, name, description, institution, category, components,
      scoring_method, icon, active, recertification_months,
      exercise_mappings, tips
    ) VALUES (
      'ems-generic',
      'EMS Physical Ability Test',
      'A generalized EMS Physical Ability Test covering core competencies required by most EMS agencies. This standard represents common physical requirements across various departments and can serve as preparation for agency-specific tests.',
      'Various',
      'ems_paramedic',
      $1::JSONB,
      'pass_fail',
      'ambulance',
      true,
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
      active = EXCLUDED.active,
      recertification_months = EXCLUDED.recertification_months,
      exercise_mappings = EXCLUDED.exercise_mappings,
      tips = EXCLUDED.tips
  `, [
    // Components (events)
    JSON.stringify([
      {
        id: 'ems_lift_100',
        name: 'Lift 100 lbs',
        type: 'weight',
        description: 'Demonstrate ability to lift 100 lbs from floor to waist height using proper body mechanics. Simulates lifting heavy patients and equipment.',
        metric_type: 'weight',
        metric_unit: 'lbs',
        direction: 'pass_fail',
        passing_threshold: 100,
        exercise_mappings: ['deadlift', 'trap_bar_deadlift', 'goblet_squat', 'romanian_deadlift'],
        tips: [
          'Build to 100+ lbs deadlift with proper form',
          'Practice lifting from various heights',
          'Focus on hip hinge mechanics to protect your back'
        ]
      },
      {
        id: 'ems_stair_climb',
        name: 'Stair Climb with Equipment',
        type: 'task',
        description: 'Climb minimum of 3 flights of stairs while carrying EMS equipment (40-50 lbs).',
        metric_type: 'pass_fail',
        direction: 'pass_fail',
        load_lbs: 50,
        flights: 3,
        exercise_mappings: ['stair_climber', 'step_ups', 'lunges', 'weighted_vest_climbs'],
        tips: [
          'Train stair climber with weighted vest',
          'Build leg endurance with high-rep step-ups',
          'Practice maintaining steady breathing under load'
        ]
      },
      {
        id: 'ems_patient_drag_generic',
        name: 'Patient Drag',
        type: 'task',
        description: 'Drag a weighted mannequin (150-175 lbs) a specified distance, demonstrating ability to move patients in emergencies.',
        metric_type: 'pass_fail',
        direction: 'pass_fail',
        weight_lbs: 165,
        exercise_mappings: ['sled_drag', 'deadlift', 'hip_thrusts', 'farmers_carry'],
        tips: [
          'Train sled drags for specificity',
          'Build posterior chain strength with deadlifts',
          'Practice proper body positioning for dragging'
        ]
      },
      {
        id: 'ems_cpr_endurance',
        name: 'CPR Endurance',
        type: 'task',
        description: 'Perform continuous chest compressions for 2+ minutes at proper depth and rate, demonstrating endurance for prolonged resuscitation.',
        metric_type: 'time',
        metric_unit: 'seconds',
        direction: 'pass_fail',
        passing_threshold: 120,
        exercise_mappings: ['push_ups', 'bench_press', 'tricep_dips', 'plank', 'med_ball_slams'],
        tips: [
          'Build pushing endurance with high-rep push-up sets',
          'Train for sustained output over 2+ minutes',
          'Practice actual CPR technique to optimize efficiency'
        ]
      }
    ]),
    // Exercise mappings
    JSON.stringify({
      ems_lift_100: ['deadlift', 'trap_bar_deadlift', 'goblet_squat', 'romanian_deadlift'],
      ems_stair_climb: ['stair_climber', 'step_ups', 'lunges', 'weighted_vest_climbs'],
      ems_patient_drag_generic: ['sled_drag', 'deadlift', 'hip_thrusts', 'farmers_carry'],
      ems_cpr_endurance: ['push_ups', 'bench_press', 'tricep_dips', 'plank', 'med_ball_slams']
    }),
    // Tips
    JSON.stringify([
      { event: 'general', tip: 'EMS work is physically demanding - build a strong fitness foundation' },
      { event: 'general', tip: 'Back health is critical - always prioritize proper lifting form' },
      { event: 'general', tip: 'Endurance matters - EMS shifts can be 12-24 hours with multiple calls' },
      { event: 'ems_lift_100', tip: 'Deadlift with perfect form - back injuries end EMS careers' },
      { event: 'ems_stair_climb', tip: 'Stair fitness translates directly to the job' },
      { event: 'ems_patient_drag_generic', tip: 'Sled drags are the best specific training for patient movement' },
      { event: 'ems_cpr_endurance', tip: 'CPR is exhausting - train pushing endurance specifically' }
    ])
  ]);

  // =============================================
  // UPDATE CATEGORY CONSTRAINT TO INCLUDE EMS
  // =============================================

  log.info('Ensuring ems_paramedic category is allowed...');

  // Check if we need to update the category constraint
  // The category column was added in migration 039 with a CHECK constraint
  // We may need to add 'ems_paramedic' to the allowed values

  try {
    // Try to update an existing constraint or add ems_paramedic to allowed categories
    // First, drop the old constraint if it exists
    await db.query(`
      DO $$
      BEGIN
        -- Try to drop the old constraint
        ALTER TABLE pt_tests DROP CONSTRAINT IF EXISTS pt_tests_category_check;
      EXCEPTION
        WHEN undefined_object THEN
          -- Constraint doesn't exist, that's fine
          NULL;
      END $$;
    `);

    // Add updated constraint that includes ems_paramedic
    await db.query(`
      DO $$
      BEGIN
        -- Add the updated constraint
        ALTER TABLE pt_tests ADD CONSTRAINT pt_tests_category_check
          CHECK (category IN ('military', 'firefighter', 'law_enforcement', 'special_operations', 'civil_service', 'general', 'ems_paramedic'));
      EXCEPTION
        WHEN duplicate_object THEN
          -- Constraint already exists, that's fine
          NULL;
      END $$;
    `);
  } catch {
    // If constraint manipulation fails, log but continue
    // The inserts above may still work if category column allows these values
    log.info('Note: Could not update category constraint, but inserts may still succeed');
  }

  // =============================================
  // UPDATE EMS ARCHETYPE TO LINK TO GENERIC TEST
  // =============================================

  log.info('Linking ems_paramedic archetype to generic EMS PAT...');

  await db.query(`
    UPDATE identities
    SET pt_test_id = 'ems-generic'
    WHERE id = 'ems_paramedic' AND (pt_test_id IS NULL OR pt_test_id = '')
  `);

  log.info('Migration 070_ems_career_standards complete');
}

export async function rollback(): Promise<void> {
  log.info('Rolling back migration: 070_ems_career_standards');

  // Remove EMS career standards
  await db.query(`
    DELETE FROM pt_tests WHERE id IN (
      'medic-mile',
      'sf-ems-pat',
      'chicago-ems-pat',
      'ems-generic'
    )
  `);

  // Unlink the ems_paramedic archetype
  await db.query(`
    UPDATE identities
    SET pt_test_id = NULL
    WHERE id = 'ems_paramedic'
  `);

  log.info('Rollback 070_ems_career_standards complete');
}

// Export for compatibility with different migration runners
export const up = migrate;
export const down = rollback;
