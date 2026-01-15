/**
 * Migration: Trade and Construction Career Standards
 *
 * Adds physical ability tests for trade and construction careers:
 * 1. Laborers CPAT (LIUNA)
 * 2. Ironworkers PAT
 * 3. IBEW Electrician Apprentice
 * 4. UA Plumber/Pipefitter
 * 5. Carpenter Apprentice
 * 6. Utility Lineworker
 *
 * Note: OSHA 10/30 certification is often required alongside physical tests.
 */

import { db } from '../client';
import { loggers } from '../../lib/logger';

const log = loggers.db;

export async function up(): Promise<void> {
  log.info('Running migration: 074_trades_career_standards');

  // =============================================
  // ADD TRADES_CONSTRUCTION CATEGORY
  // =============================================

  // First, drop the existing check constraint and add a new one with trades_construction
  log.info('Updating pt_tests category constraint to include trades_construction...');

  // Check if the constraint exists and drop it
  const constraintResult = await db.queryOne<{ constraint_name: string }>(
    `SELECT constraint_name
     FROM information_schema.table_constraints
     WHERE table_name = 'pt_tests'
     AND constraint_type = 'CHECK'
     AND constraint_name LIKE '%category%'`
  );

  if (constraintResult?.constraint_name) {
    await db.query(`ALTER TABLE pt_tests DROP CONSTRAINT ${constraintResult.constraint_name}`);
  }

  // Add new constraint with all categories
  await db.query(`
    ALTER TABLE pt_tests
    ADD CONSTRAINT pt_tests_category_check
    CHECK (category IN ('military', 'firefighter', 'law_enforcement', 'special_operations', 'civil_service', 'general', 'corrections', 'ems_paramedic', 'trades_construction', 'lifeguard', 'public_service', 'park_ranger', 'transportation'))
  `);

  // =============================================
  // LABORERS CPAT (LIUNA)
  // =============================================

  log.info('Adding Laborers CPAT (LIUNA)...');
  await db.query(`
    INSERT INTO pt_tests (
      id, name, description, institution, category, components,
      scoring_method, icon, recertification_months, tips, exercise_mappings
    )
    VALUES (
      'laborers-cpat',
      'Laborers CPAT',
      'LIUNA (Laborers International Union) 5-day entry assessment including drug test, 3-day Candidate Physical Agility Test, and oral exit interview. Tests physical readiness for demanding construction labor.',
      'LIUNA (Laborers'' International Union)',
      'trades_construction',
      $1::JSONB,
      'pass_fail',
      'hard_hat',
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
      tips = EXCLUDED.tips,
      exercise_mappings = EXCLUDED.exercise_mappings
  `, [
    JSON.stringify([
      { id: 'heavy_lift_50', name: 'Heavy Lifting (50 lbs)', type: 'task', weight_lbs: 50, description: 'Lift and carry 50 lb load repeatedly' },
      { id: 'heavy_lift_100', name: 'Heavy Lifting (100 lbs)', type: 'task', weight_lbs: 100, description: 'Lift and move 100 lb load' },
      { id: 'carry_endurance', name: 'Carry Endurance', type: 'task', description: 'Sustained carrying over distance' },
      { id: 'digging_simulation', name: 'Digging Simulation', type: 'task', duration_minutes: 10, description: 'Simulated digging/excavation work' },
      { id: 'climbing', name: 'Climbing', type: 'task', description: 'Ladder and scaffolding climbing' },
      { id: 'balance_test', name: 'Balance Test', type: 'task', description: 'Balance on elevated surfaces' }
    ]),
    JSON.stringify([
      { event: 'heavy_lift_50', tip: 'Train deadlifts and farmers carries to build lifting capacity' },
      { event: 'heavy_lift_100', tip: 'Progress to heavy trap bar deadlifts and stone lifts' },
      { event: 'carry_endurance', tip: 'Build work capacity with loaded carries for distance' },
      { event: 'digging_simulation', tip: 'Train hip hinge movements and grip endurance' },
      { event: 'climbing', tip: 'Practice ladder climbing with weighted vest' },
      { event: 'balance_test', tip: 'Train single-leg balance and core stability' },
      { event: 'general', tip: 'OSHA 10/30 certification often required alongside physical testing' }
    ]),
    JSON.stringify({
      heavy_lift_50: ['deadlift', 'trap_bar_deadlift', 'farmers_carry', 'goblet_squat'],
      heavy_lift_100: ['deadlift', 'trap_bar_deadlift', 'stone_lifts', 'hip_thrusts'],
      carry_endurance: ['farmers_carry', 'sandbag_carry', 'yoke_walk', 'kettlebell_carry'],
      digging_simulation: ['deadlift', 'romanian_deadlift', 'kettlebell_swings', 'grip_training'],
      climbing: ['pull_ups', 'lat_pulldown', 'step_ups', 'lunges'],
      balance_test: ['single_leg_deadlift', 'balance_board', 'plank', 'bird_dog']
    })
  ]);

  // =============================================
  // IRONWORKERS PAT
  // =============================================

  log.info('Adding Ironworkers PAT...');
  await db.query(`
    INSERT INTO pt_tests (
      id, name, description, institution, category, components,
      scoring_method, icon, recertification_months, tips, exercise_mappings
    )
    VALUES (
      'ironworkers-pat',
      'Ironworkers Physical Ability Test',
      'Physical ability test for the International Association of Bridge, Structural, Ornamental and Reinforcing Iron Workers. Tests ability to work at heights with heavy materials.',
      'International Association of Bridge, Structural, Ornamental and Reinforcing Iron Workers',
      'trades_construction',
      $1::JSONB,
      'pass_fail',
      'beam',
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
      tips = EXCLUDED.tips,
      exercise_mappings = EXCLUDED.exercise_mappings
  `, [
    JSON.stringify([
      { id: 'ladder_climb_60ft', name: '60-Foot Ladder Climb with Tools', type: 'task', height_feet: 60, description: 'Climb 60-foot ladder while carrying tools' },
      { id: 'beam_carry', name: 'Beam Carry (50 lbs, 100 ft)', type: 'task', weight_lbs: 50, distance_feet: 100, description: 'Carry 50 lb beam 100 feet' },
      { id: 'balance_walk', name: 'Balance Walk (4-inch beam)', type: 'task', beam_width_inches: 4, description: 'Walk across 4-inch wide beam' },
      { id: 'grip_strength', name: 'Grip Strength Test', type: 'strength', description: 'Dynamometer grip strength assessment' },
      { id: 'endurance_circuit', name: '15-Minute Endurance Circuit', type: 'time', duration_minutes: 15, description: 'Complete work simulation circuit in 15 minutes' }
    ]),
    JSON.stringify([
      { event: 'ladder_climb_60ft', tip: 'Build climbing endurance with weighted stair climbs and pull-ups' },
      { event: 'beam_carry', tip: 'Train farmers carries and overhead carries for stability' },
      { event: 'balance_walk', tip: 'Practice balance beam work, start with wider surfaces' },
      { event: 'grip_strength', tip: 'Train grip with dead hangs, plate pinches, and towel pull-ups' },
      { event: 'endurance_circuit', tip: 'Build work capacity with circuit training and EMOM workouts' },
      { event: 'general', tip: 'Working at heights requires mental comfort - practice exposure gradually' }
    ]),
    JSON.stringify({
      ladder_climb_60ft: ['pull_ups', 'lat_pulldown', 'stair_climber', 'step_ups', 'lunges'],
      beam_carry: ['farmers_carry', 'trap_bar_deadlift', 'overhead_carry', 'core_stability'],
      balance_walk: ['single_leg_deadlift', 'balance_board', 'plank', 'bird_dog', 'lunges'],
      grip_strength: ['dead_hang', 'farmers_carry', 'plate_pinch', 'towel_pull_ups', 'wrist_curls'],
      endurance_circuit: ['burpees', 'kettlebell_swings', 'box_jumps', 'rowing', 'jump_rope']
    })
  ]);

  // =============================================
  // IBEW ELECTRICIAN APPRENTICE
  // =============================================

  log.info('Adding IBEW Electrician Apprentice PAT...');
  await db.query(`
    INSERT INTO pt_tests (
      id, name, description, institution, category, components,
      scoring_method, icon, recertification_months, tips, exercise_mappings
    )
    VALUES (
      'ibew-pat',
      'IBEW Electrician Apprentice Physical Ability Test',
      'Physical ability test for IBEW (International Brotherhood of Electrical Workers) apprenticeship programs. Tests ability to perform electrical work in various positions and conditions.',
      'IBEW (International Brotherhood of Electrical Workers)',
      'trades_construction',
      $1::JSONB,
      'pass_fail',
      'lightning',
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
      tips = EXCLUDED.tips,
      exercise_mappings = EXCLUDED.exercise_mappings
  `, [
    JSON.stringify([
      { id: 'ladder_climbing', name: 'Ladder Climbing', type: 'task', description: 'Repeated ladder climbing with tools' },
      { id: 'overhead_work', name: 'Overhead Work Simulation', type: 'task', duration_minutes: 15, description: 'Sustained overhead work position' },
      { id: 'tool_carrying', name: 'Tool Carrying', type: 'task', weight_lbs: 40, description: 'Carry tool bags up ladders and through spaces' },
      { id: 'cable_pulling', name: 'Cable Pulling', type: 'task', description: 'Pull electrical cable through conduit' }
    ]),
    JSON.stringify([
      { event: 'ladder_climbing', tip: 'Build leg endurance with step-ups and lunges' },
      { event: 'overhead_work', tip: 'Train shoulder endurance with overhead presses and carries' },
      { event: 'tool_carrying', tip: 'Practice carrying weight on ladders safely' },
      { event: 'cable_pulling', tip: 'Build pulling strength with rows and face pulls' },
      { event: 'general', tip: 'Electrical work requires fine motor skills - maintain grip strength without sacrificing dexterity' }
    ]),
    JSON.stringify({
      ladder_climbing: ['step_ups', 'lunges', 'stair_climber', 'calf_raises'],
      overhead_work: ['overhead_press', 'lateral_raises', 'face_pulls', 'plank'],
      tool_carrying: ['farmers_carry', 'goblet_squat', 'lunges', 'step_ups'],
      cable_pulling: ['cable_rows', 'lat_pulldown', 'face_pulls', 'bicep_curls']
    })
  ]);

  // =============================================
  // UA PLUMBER/PIPEFITTER
  // =============================================

  log.info('Adding UA Plumber/Pipefitter PAT...');
  await db.query(`
    INSERT INTO pt_tests (
      id, name, description, institution, category, components,
      scoring_method, icon, recertification_months, tips, exercise_mappings
    )
    VALUES (
      'ua-plumber-pat',
      'UA Plumber/Pipefitter Physical Ability Test',
      'Physical ability test for United Association of Plumbers and Pipefitters apprenticeship. Tests ability to work in confined spaces and handle heavy pipe materials.',
      'United Association of Plumbers and Pipefitters',
      'trades_construction',
      $1::JSONB,
      'pass_fail',
      'pipe',
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
      tips = EXCLUDED.tips,
      exercise_mappings = EXCLUDED.exercise_mappings
  `, [
    JSON.stringify([
      { id: 'pipe_carrying', name: 'Pipe Carrying', type: 'task', weight_lbs: 60, description: 'Carry pipe sections of various weights' },
      { id: 'crawl_spaces', name: 'Crawl Space Navigation', type: 'task', description: 'Navigate through confined spaces' },
      { id: 'tool_manipulation', name: 'Tool Manipulation', type: 'task', description: 'Use wrenches and tools in awkward positions' },
      { id: 'endurance_test', name: 'Work Endurance', type: 'task', duration_minutes: 20, description: 'Sustained physical work simulation' }
    ]),
    JSON.stringify([
      { event: 'pipe_carrying', tip: 'Build carrying strength with farmers carries and sandbag work' },
      { event: 'crawl_spaces', tip: 'Train bear crawls and low movement patterns' },
      { event: 'tool_manipulation', tip: 'Build grip endurance and wrist strength' },
      { event: 'endurance_test', tip: 'Build overall work capacity with circuit training' },
      { event: 'general', tip: 'Plumbing requires working in uncomfortable positions - train mobility alongside strength' }
    ]),
    JSON.stringify({
      pipe_carrying: ['farmers_carry', 'deadlift', 'shoulder_carry', 'goblet_squat'],
      crawl_spaces: ['bear_crawl', 'mountain_climbers', 'plank', 'hip_mobility'],
      tool_manipulation: ['wrist_curls', 'grip_training', 'farmers_carry', 'towel_pull_ups'],
      endurance_test: ['burpees', 'kettlebell_swings', 'rowing', 'circuit_training']
    })
  ]);

  // =============================================
  // CARPENTER APPRENTICE
  // =============================================

  log.info('Adding Carpenter Apprentice PAT...');
  await db.query(`
    INSERT INTO pt_tests (
      id, name, description, institution, category, components,
      scoring_method, icon, recertification_months, tips, exercise_mappings
    )
    VALUES (
      'carpenter-pat',
      'Carpenter Apprentice Physical Ability Test',
      'Physical ability test for United Brotherhood of Carpenters apprenticeship programs. Tests ability to handle building materials and work in various positions.',
      'United Brotherhood of Carpenters',
      'trades_construction',
      $1::JSONB,
      'pass_fail',
      'hammer',
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
      tips = EXCLUDED.tips,
      exercise_mappings = EXCLUDED.exercise_mappings
  `, [
    JSON.stringify([
      { id: 'material_lifting', name: 'Material Lifting', type: 'task', weight_lbs: 75, description: 'Lift lumber, plywood, and building materials' },
      { id: 'ladder_work', name: 'Ladder Work', type: 'task', description: 'Work safely from ladders and scaffolding' },
      { id: 'kneeling_endurance', name: 'Kneeling Endurance', type: 'task', duration_minutes: 15, description: 'Sustained work in kneeling position' },
      { id: 'tool_carrying', name: 'Tool Belt Carrying', type: 'task', weight_lbs: 25, description: 'Work while wearing loaded tool belt' }
    ]),
    JSON.stringify([
      { event: 'material_lifting', tip: 'Train deadlifts and squats for safe lifting mechanics' },
      { event: 'ladder_work', tip: 'Build stability and balance with single-leg exercises' },
      { event: 'kneeling_endurance', tip: 'Train knee and hip mobility for comfort in kneeling positions' },
      { event: 'tool_carrying', tip: 'Build core stability for working with weight on hips' },
      { event: 'general', tip: 'Carpentry is physically demanding - build general work capacity and mobility' }
    ]),
    JSON.stringify({
      material_lifting: ['deadlift', 'goblet_squat', 'farmers_carry', 'hip_thrusts'],
      ladder_work: ['step_ups', 'lunges', 'single_leg_deadlift', 'balance_board'],
      kneeling_endurance: ['hip_mobility', 'goblet_squat', 'lunges', 'ankle_mobility'],
      tool_carrying: ['farmers_carry', 'plank', 'dead_bug', 'pallof_press']
    })
  ]);

  // =============================================
  // UTILITY LINEWORKER
  // =============================================

  log.info('Adding Utility Lineworker PAT...');
  await db.query(`
    INSERT INTO pt_tests (
      id, name, description, institution, category, components,
      scoring_method, icon, recertification_months, tips, exercise_mappings
    )
    VALUES (
      'lineworker-pat',
      'Utility Lineworker Physical Ability Test',
      'Physical ability test for utility lineworkers. Tests ability to climb poles, work from bucket trucks, handle heavy equipment, and work in extreme weather conditions.',
      'Various Utilities',
      'trades_construction',
      $1::JSONB,
      'pass_fail',
      'utility_pole',
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
      tips = EXCLUDED.tips,
      exercise_mappings = EXCLUDED.exercise_mappings
  `, [
    JSON.stringify([
      { id: 'pole_climbing', name: 'Pole Climbing', type: 'task', height_feet: 40, description: 'Climb utility poles with climbing gear' },
      { id: 'bucket_truck_work', name: 'Bucket Truck Work', type: 'task', duration_minutes: 30, description: 'Extended work from aerial lift platform' },
      { id: 'heavy_equipment', name: 'Heavy Equipment Handling', type: 'task', weight_lbs: 80, description: 'Handle transformers, cables, and equipment' },
      { id: 'endurance_heat_cold', name: 'Environmental Endurance', type: 'task', description: 'Work capacity in heat and cold conditions' }
    ]),
    JSON.stringify([
      { event: 'pole_climbing', tip: 'Build leg strength and grip for climbing with spikes/gaffs' },
      { event: 'bucket_truck_work', tip: 'Train standing endurance and overhead work capacity' },
      { event: 'heavy_equipment', tip: 'Build full-body strength for handling awkward, heavy loads' },
      { event: 'endurance_heat_cold', tip: 'Train in varying conditions to build environmental tolerance' },
      { event: 'general', tip: 'Linework is one of the most physically demanding trades - build exceptional overall fitness' }
    ]),
    JSON.stringify({
      pole_climbing: ['pull_ups', 'grip_training', 'lunges', 'calf_raises', 'step_ups'],
      bucket_truck_work: ['overhead_press', 'standing_core_work', 'calf_raises', 'plank'],
      heavy_equipment: ['deadlift', 'farmers_carry', 'clean_and_press', 'sandbag_training'],
      endurance_heat_cold: ['running', 'rowing', 'circuit_training', 'kettlebell_swings']
    })
  ]);

  log.info('Migration 074_trades_career_standards complete');
}

export async function down(): Promise<void> {
  log.info('Rolling back migration: 074_trades_career_standards');

  // Remove the trade career standards
  await db.query(`
    DELETE FROM pt_tests
    WHERE id IN (
      'laborers-cpat',
      'ironworkers-pat',
      'ibew-pat',
      'ua-plumber-pat',
      'carpenter-pat',
      'lineworker-pat'
    )
  `);

  // Restore original category constraint (without trades_construction)
  const constraintResult = await db.queryOne<{ constraint_name: string }>(
    `SELECT constraint_name
     FROM information_schema.table_constraints
     WHERE table_name = 'pt_tests'
     AND constraint_type = 'CHECK'
     AND constraint_name LIKE '%category%'`
  );

  if (constraintResult?.constraint_name) {
    await db.query(`ALTER TABLE pt_tests DROP CONSTRAINT ${constraintResult.constraint_name}`);
  }

  await db.query(`
    ALTER TABLE pt_tests
    ADD CONSTRAINT pt_tests_category_check
    CHECK (category IN ('military', 'firefighter', 'law_enforcement', 'special_operations', 'civil_service', 'general', 'corrections', 'ems_paramedic', 'trades_construction', 'lifeguard', 'public_service', 'park_ranger', 'transportation'))
  `);

  log.info('Rollback 074_trades_career_standards complete');
}

export const migrate = up;
