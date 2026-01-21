// DESTRUCTIVE: Schema modification for exercise library expansion - contains DROP/TRUNCATE operations
// SQL-SAFE: Template literals contain static SQL only, no external input
/**
 * Migration: Exercise Library Expansion
 *
 * Adds scientific categorization fields to exercises table
 * and new equipment types for specialized training methodologies
 * (climbing, gymnastics, olympic weightlifting, wrestling, circus, rehab)
 */

import { db } from '../client';
import { loggers } from '../../lib/logger';

const log = loggers.db;

async function columnExists(tableName: string, columnName: string): Promise<boolean> {
  const result = await db.queryOne<{ count: string }>(
    `SELECT COUNT(*) as count FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = $1 AND column_name = $2`,
    [tableName, columnName]
  );
  return parseInt(result?.count || '0') > 0;
}

export async function up(): Promise<void> {
  log.info('Running migration: 080_exercise_library_expansion');

  // ============================================
  // ADD SCIENTIFIC CATEGORIZATION COLUMNS TO EXERCISES
  // ============================================

  const newColumns = [
    { name: 'movement_pattern', type: 'TEXT' },
    { name: 'force_vector', type: 'TEXT' },
    { name: 'contraction_type', type: 'TEXT' },
    { name: 'joint_actions', type: 'JSONB' },
    { name: 'muscle_length_bias', type: 'TEXT' },
    { name: 'optimal_rep_range_low', type: 'INT' },
    { name: 'optimal_rep_range_high', type: 'INT' },
    { name: 'optimal_tempo', type: 'TEXT' },
    { name: 'typical_intensity_percent', type: 'FLOAT' },
    { name: 'prerequisite_exercises', type: 'TEXT[]' },
    { name: 'prerequisite_strength', type: 'JSONB' },
    { name: 'skill_level', type: "TEXT DEFAULT 'fundamental'" },
    { name: 'protocol_type', type: 'TEXT' },
    { name: 'rest_recommendation_seconds', type: 'INT' },
    { name: 'nervous_system_demand', type: 'TEXT' },
    { name: 'injury_risk_areas', type: 'TEXT[]' },
    { name: 'contraindications', type: 'TEXT[]' },
    { name: 'regression_exercise', type: 'TEXT' },
    { name: 'progression_exercise', type: 'TEXT' },
    { name: 'source_methodology', type: 'TEXT' },
    { name: 'evidence_level', type: 'TEXT' },
    { name: 'research_citations', type: 'TEXT[]' },
    { name: 'video_url', type: 'TEXT' },
    { name: 'animation_url', type: 'TEXT' },
  ];

  for (const col of newColumns) {
    if (!(await columnExists('exercises', col.name))) {
      log.info(`Adding column ${col.name} to exercises table...`);
      await db.query(`ALTER TABLE exercises ADD COLUMN IF NOT EXISTS ${col.name} ${col.type}`);
    }
  }

  // Add indexes for new columns
  await db.query(`CREATE INDEX IF NOT EXISTS idx_exercises_methodology ON exercises(source_methodology)`);
  await db.query(`CREATE INDEX IF NOT EXISTS idx_exercises_movement_pattern ON exercises(movement_pattern)`);
  await db.query(`CREATE INDEX IF NOT EXISTS idx_exercises_skill_level ON exercises(skill_level)`);
  await db.query(`CREATE INDEX IF NOT EXISTS idx_exercises_protocol_type ON exercises(protocol_type)`);

  // ============================================
  // ADD NEW EQUIPMENT TYPES
  // ============================================
  log.info('Adding new equipment types...');

  const newEquipment = [
    // Climbing
    { id: 'hangboard', name: 'Hangboard', category: 'climbing' },
    { id: 'campus_board', name: 'Campus Board', category: 'climbing' },
    { id: 'pinch_block', name: 'Pinch Block', category: 'climbing' },
    { id: 'climbing_rope', name: 'Climbing Rope', category: 'climbing' },
    { id: 'grip_trainer', name: 'Grip Trainer', category: 'climbing' },

    // Gymnastics
    { id: 'gymnastics_rings', name: 'Gymnastics Rings', category: 'gymnastics' },
    { id: 'parallettes', name: 'Parallettes', category: 'gymnastics' },
    { id: 'pommel_horse', name: 'Pommel Horse', category: 'gymnastics' },
    { id: 'p_bars', name: 'Parallel Bars', category: 'gymnastics' },
    { id: 'high_bar', name: 'High Bar', category: 'gymnastics' },
    { id: 'still_rings', name: 'Still Rings', category: 'gymnastics' },

    // Olympic Weightlifting
    { id: 'bumper_plates', name: 'Bumper Plates', category: 'olympic' },
    { id: 'weightlifting_platform', name: 'Weightlifting Platform', category: 'olympic' },
    { id: 'jerk_blocks', name: 'Jerk Blocks', category: 'olympic' },
    { id: 'lifting_straps', name: 'Lifting Straps', category: 'olympic' },
    { id: 'weightlifting_shoes', name: 'Weightlifting Shoes', category: 'olympic' },

    // Wrestling/Combat
    { id: 'wrestling_mat', name: 'Wrestling Mat', category: 'combat' },
    { id: 'heavy_bag', name: 'Heavy Bag', category: 'combat' },
    { id: 'grappling_dummy', name: 'Grappling Dummy', category: 'combat' },
    { id: 'battle_ropes', name: 'Battle Ropes', category: 'combat' },
    { id: 'slam_ball', name: 'Slam Ball', category: 'combat' },
    { id: 'tire', name: 'Tire', category: 'combat' },
    { id: 'sledgehammer', name: 'Sledgehammer', category: 'combat' },
    { id: 'neck_harness', name: 'Neck Harness', category: 'combat' },

    // Circus/Aerial
    { id: 'aerial_silks', name: 'Aerial Silks', category: 'circus' },
    { id: 'trapeze', name: 'Trapeze', category: 'circus' },
    { id: 'lyra', name: 'Lyra (Aerial Hoop)', category: 'circus' },
    { id: 'aerial_rope', name: 'Aerial Rope (Corde Lisse)', category: 'circus' },
    { id: 'handbalancing_canes', name: 'Handbalancing Canes', category: 'circus' },
    { id: 'handbalancing_blocks', name: 'Handbalancing Blocks', category: 'circus' },

    // Rehab
    { id: 'therapy_band_light', name: 'Therapy Band (Light)', category: 'rehab' },
    { id: 'therapy_band_medium', name: 'Therapy Band (Medium)', category: 'rehab' },
    { id: 'therapy_band_heavy', name: 'Therapy Band (Heavy)', category: 'rehab' },
    { id: 'foam_roller', name: 'Foam Roller', category: 'rehab' },
    { id: 'lacrosse_ball', name: 'Lacrosse Ball', category: 'rehab' },
    { id: 'balance_board', name: 'Balance Board', category: 'rehab' },
    { id: 'bosu_ball', name: 'BOSU Ball', category: 'rehab' },
    { id: 'wobble_cushion', name: 'Wobble Cushion', category: 'rehab' },
    { id: 'wrist_roller', name: 'Wrist Roller', category: 'rehab' },
    { id: 'tyler_twist_bar', name: 'Tyler Twist Bar', category: 'rehab' },
  ];

  for (const equip of newEquipment) {
    await db.query(
      `INSERT INTO equipment_types (id, name, category)
       VALUES ($1, $2, $3)
       ON CONFLICT (id) DO UPDATE SET name = $2, category = $3`,
      [equip.id, equip.name, equip.category]
    );
  }

  log.info('Migration 080_exercise_library_expansion completed');
}

export async function down(): Promise<void> {
  log.info('Rolling back migration: 080_exercise_library_expansion');

  // Remove new equipment types
  const equipmentIds = [
    'hangboard', 'campus_board', 'pinch_block', 'climbing_rope', 'grip_trainer',
    'gymnastics_rings', 'parallettes', 'pommel_horse', 'p_bars', 'high_bar', 'still_rings',
    'bumper_plates', 'weightlifting_platform', 'jerk_blocks', 'lifting_straps', 'weightlifting_shoes',
    'wrestling_mat', 'heavy_bag', 'grappling_dummy', 'battle_ropes', 'slam_ball', 'tire', 'sledgehammer', 'neck_harness',
    'aerial_silks', 'trapeze', 'lyra', 'aerial_rope', 'handbalancing_canes', 'handbalancing_blocks',
    'therapy_band_light', 'therapy_band_medium', 'therapy_band_heavy', 'foam_roller', 'lacrosse_ball',
    'balance_board', 'bosu_ball', 'wobble_cushion', 'wrist_roller', 'tyler_twist_bar',
  ];

  await db.query(`DELETE FROM equipment_types WHERE id = ANY($1)`, [equipmentIds]);

  // Drop indexes
  await db.query('DROP INDEX IF EXISTS idx_exercises_methodology');
  await db.query('DROP INDEX IF EXISTS idx_exercises_movement_pattern');
  await db.query('DROP INDEX IF EXISTS idx_exercises_skill_level');
  await db.query('DROP INDEX IF EXISTS idx_exercises_protocol_type');

  // Drop columns
  const columnsToRemove = [
    'movement_pattern', 'force_vector', 'contraction_type', 'joint_actions',
    'muscle_length_bias', 'optimal_rep_range_low', 'optimal_rep_range_high',
    'optimal_tempo', 'typical_intensity_percent', 'prerequisite_exercises',
    'prerequisite_strength', 'skill_level', 'protocol_type', 'rest_recommendation_seconds',
    'nervous_system_demand', 'injury_risk_areas', 'contraindications',
    'regression_exercise', 'progression_exercise', 'source_methodology',
    'evidence_level', 'research_citations', 'video_url', 'animation_url',
  ];

  for (const col of columnsToRemove) {
    await db.query(`ALTER TABLE exercises DROP COLUMN IF EXISTS ${col}`);
  }

  log.info('Migration 080_exercise_library_expansion rolled back');
}
