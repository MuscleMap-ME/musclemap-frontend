/**
 * Migration 149: Prescription Engine v3 Seed Data
 *
 * Seeds v3 metadata for existing exercises including:
 * - Movement patterns (v3 classification)
 * - Muscle activation data
 * - Effectiveness ratings
 * - Recovery profiles
 * - Equipment requirements
 *
 * // SQL-SAFE: All queries use parameterized placeholders ($1, $2, etc.) - no string interpolation
 */

import { db } from '../client';
import { loggers } from '../../lib/logger';

const log = loggers.db;

// Movement pattern mappings based on exercise type
const MOVEMENT_PATTERNS: Record<string, string> = {
  // Compound movements
  'bench-press': 'horizontal_push',
  'incline-bench-press': 'horizontal_push',
  'push-up': 'horizontal_push',
  'dumbbell-bench-press': 'horizontal_push',
  'cable-chest-fly': 'horizontal_push',

  'bent-over-row': 'horizontal_pull',
  'seated-cable-row': 'horizontal_pull',
  'dumbbell-row': 'horizontal_pull',
  't-bar-row': 'horizontal_pull',

  'pull-up': 'vertical_pull',
  'chin-up': 'vertical_pull',
  'lat-pulldown': 'vertical_pull',

  'overhead-press': 'vertical_push',
  'military-press': 'vertical_push',
  'dumbbell-shoulder-press': 'vertical_push',

  'squat': 'squat',
  'front-squat': 'squat',
  'goblet-squat': 'squat',
  'leg-press': 'squat',
  'hack-squat': 'squat',

  'deadlift': 'hip_hinge',
  'romanian-deadlift': 'hip_hinge',
  'good-morning': 'hip_hinge',
  'hip-thrust': 'hip_hinge',
  'kettlebell-swing': 'hip_hinge',

  // Isolation movements
  'bicep-curl': 'elbow_flexion',
  'hammer-curl': 'elbow_flexion',
  'preacher-curl': 'elbow_flexion',

  'tricep-extension': 'elbow_extension',
  'tricep-pushdown': 'elbow_extension',
  'skull-crusher': 'elbow_extension',

  'lateral-raise': 'shoulder_abduction',
  'front-raise': 'shoulder_flexion',
  'face-pull': 'shoulder_external_rotation',

  'leg-extension': 'knee_extension',
  'leg-curl': 'knee_flexion',
  'calf-raise': 'ankle_extension',

  // Core
  'plank': 'core_stability',
  'crunch': 'trunk_flexion',
  'russian-twist': 'trunk_rotation',
  'dead-bug': 'core_stability',
  'bird-dog': 'core_stability',

  // Lunge variations
  'lunge': 'lunge',
  'walking-lunge': 'lunge',
  'bulgarian-split-squat': 'lunge',
  'step-up': 'lunge',

  // Carries
  'farmers-walk': 'carry',
  'suitcase-carry': 'carry',
};

// Effectiveness ratings by exercise type
const EFFECTIVENESS_DEFAULTS: Record<string, { strength: number; hypertrophy: number; power: number; endurance: number; rehabilitation: number }> = {
  // Compound lifts - high effectiveness across the board
  horizontal_push: { strength: 8, hypertrophy: 9, power: 6, endurance: 5, rehabilitation: 3 },
  horizontal_pull: { strength: 8, hypertrophy: 9, power: 5, endurance: 5, rehabilitation: 4 },
  vertical_push: { strength: 7, hypertrophy: 8, power: 7, endurance: 5, rehabilitation: 3 },
  vertical_pull: { strength: 8, hypertrophy: 8, power: 5, endurance: 6, rehabilitation: 4 },
  squat: { strength: 9, hypertrophy: 9, power: 8, endurance: 6, rehabilitation: 4 },
  hip_hinge: { strength: 9, hypertrophy: 8, power: 8, endurance: 5, rehabilitation: 5 },

  // Isolation - high for hypertrophy, lower for strength
  elbow_flexion: { strength: 4, hypertrophy: 7, power: 2, endurance: 6, rehabilitation: 5 },
  elbow_extension: { strength: 4, hypertrophy: 7, power: 2, endurance: 6, rehabilitation: 5 },
  shoulder_abduction: { strength: 3, hypertrophy: 7, power: 2, endurance: 5, rehabilitation: 6 },
  shoulder_flexion: { strength: 3, hypertrophy: 6, power: 2, endurance: 5, rehabilitation: 6 },
  knee_extension: { strength: 4, hypertrophy: 6, power: 3, endurance: 7, rehabilitation: 7 },
  knee_flexion: { strength: 4, hypertrophy: 6, power: 3, endurance: 6, rehabilitation: 7 },

  // Core
  core_stability: { strength: 4, hypertrophy: 4, power: 3, endurance: 7, rehabilitation: 8 },
  trunk_flexion: { strength: 3, hypertrophy: 5, power: 2, endurance: 7, rehabilitation: 5 },
  trunk_rotation: { strength: 4, hypertrophy: 5, power: 4, endurance: 6, rehabilitation: 6 },

  // Functional
  lunge: { strength: 6, hypertrophy: 7, power: 5, endurance: 7, rehabilitation: 6 },
  carry: { strength: 7, hypertrophy: 5, power: 4, endurance: 8, rehabilitation: 5 },
};

// CNS load and recovery by pattern
const RECOVERY_PROFILES: Record<string, { cns: number; soreness: number; minRecovery: number }> = {
  hip_hinge: { cns: 9, soreness: 72, minRecovery: 72 },
  squat: { cns: 8, soreness: 72, minRecovery: 72 },
  vertical_pull: { cns: 6, soreness: 48, minRecovery: 48 },
  horizontal_pull: { cns: 6, soreness: 48, minRecovery: 48 },
  horizontal_push: { cns: 5, soreness: 48, minRecovery: 48 },
  vertical_push: { cns: 5, soreness: 48, minRecovery: 48 },
  lunge: { cns: 6, soreness: 48, minRecovery: 48 },
  elbow_flexion: { cns: 2, soreness: 24, minRecovery: 24 },
  elbow_extension: { cns: 2, soreness: 24, minRecovery: 24 },
  shoulder_abduction: { cns: 2, soreness: 24, minRecovery: 24 },
  shoulder_flexion: { cns: 2, soreness: 24, minRecovery: 24 },
  knee_extension: { cns: 3, soreness: 24, minRecovery: 24 },
  knee_flexion: { cns: 3, soreness: 24, minRecovery: 24 },
  core_stability: { cns: 3, soreness: 24, minRecovery: 24 },
  trunk_flexion: { cns: 2, soreness: 24, minRecovery: 24 },
  trunk_rotation: { cns: 2, soreness: 24, minRecovery: 24 },
  carry: { cns: 5, soreness: 48, minRecovery: 48 },
};

export async function migrate(): Promise<void> {
  log.info('Running migration: 149_prescription_engine_v3_seed_data');

  // Get all exercises
  const exercises = await db.queryAll<{ id: string; name: string; type: string }>(`
    SELECT id, name, type FROM exercises
  `);

  log.info(`Found ${exercises.length} exercises to update with v3 metadata`);

  let updated = 0;
  for (const exercise of exercises) {
    // Normalize name for pattern lookup
    const normalizedName = exercise.name.toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '');

    // Try to find movement pattern
    let movementPattern = MOVEMENT_PATTERNS[normalizedName];

    // Fallback: guess from exercise type
    if (!movementPattern) {
      const type = exercise.type?.toLowerCase() || '';
      if (type.includes('push')) movementPattern = 'horizontal_push';
      else if (type.includes('pull')) movementPattern = 'horizontal_pull';
      else if (type.includes('squat') || type.includes('leg')) movementPattern = 'squat';
      else if (type.includes('hinge') || type.includes('deadlift')) movementPattern = 'hip_hinge';
      else if (type.includes('curl')) movementPattern = 'elbow_flexion';
      else if (type.includes('extension') || type.includes('tricep')) movementPattern = 'elbow_extension';
      else if (type.includes('press') && type.includes('overhead')) movementPattern = 'vertical_push';
      else if (type.includes('core') || type.includes('ab')) movementPattern = 'core_stability';
      else if (type.includes('lunge') || type.includes('step')) movementPattern = 'lunge';
      else movementPattern = 'compound'; // Default fallback
    }

    // Get effectiveness and recovery data
    const effectiveness = EFFECTIVENESS_DEFAULTS[movementPattern] || {
      strength: 5, hypertrophy: 5, power: 5, endurance: 5, rehabilitation: 5
    };
    const recovery = RECOVERY_PROFILES[movementPattern] || {
      cns: 5, soreness: 48, minRecovery: 48
    };

    // Update exercise
    try {
      await db.query(`
        UPDATE exercises SET
          movement_pattern_v3 = $2,
          effectiveness_strength = $3,
          effectiveness_hypertrophy = $4,
          effectiveness_power = $5,
          effectiveness_endurance = $6,
          effectiveness_rehabilitation = $7,
          cns_load_factor = $8,
          recovery_typical_soreness_hours = $9,
          recovery_minimum_hours = $10
        WHERE id = $1
      `, [
        exercise.id,
        movementPattern,
        effectiveness.strength,
        effectiveness.hypertrophy,
        effectiveness.power,
        effectiveness.endurance,
        effectiveness.rehabilitation,
        recovery.cns,
        recovery.soreness,
        recovery.minRecovery,
      ]);
      updated++;
    } catch (err) {
      log.warn({ err, exerciseId: exercise.id }, 'Failed to update exercise');
    }
  }

  log.info(`Updated ${updated}/${exercises.length} exercises with v3 metadata`);

  // Seed exercise effectiveness table for exercises with research-backed data
  log.info('Seeding exercise_effectiveness table with research-backed data...');

  const researchBackedExercises = [
    { name: 'squat', strength: 9.5, hypertrophy: 9.0, power: 8.5, endurance: 6.0, rehabilitation: 4.0, evidence: 'high' },
    { name: 'deadlift', strength: 9.5, hypertrophy: 8.5, power: 8.0, endurance: 5.0, rehabilitation: 5.0, evidence: 'high' },
    { name: 'bench-press', strength: 9.0, hypertrophy: 9.0, power: 6.0, endurance: 5.0, rehabilitation: 3.0, evidence: 'high' },
    { name: 'overhead-press', strength: 8.0, hypertrophy: 8.0, power: 7.0, endurance: 5.0, rehabilitation: 3.0, evidence: 'high' },
    { name: 'pull-up', strength: 8.5, hypertrophy: 8.5, power: 5.0, endurance: 7.0, rehabilitation: 4.0, evidence: 'high' },
    { name: 'bent-over-row', strength: 8.0, hypertrophy: 9.0, power: 5.0, endurance: 5.0, rehabilitation: 4.0, evidence: 'high' },
    { name: 'hip-thrust', strength: 7.0, hypertrophy: 8.0, power: 6.0, endurance: 5.0, rehabilitation: 7.0, evidence: 'moderate' },
    { name: 'leg-press', strength: 7.5, hypertrophy: 8.5, power: 5.0, endurance: 6.0, rehabilitation: 5.0, evidence: 'moderate' },
    { name: 'romanian-deadlift', strength: 7.5, hypertrophy: 8.0, power: 5.0, endurance: 5.0, rehabilitation: 6.0, evidence: 'moderate' },
  ];

  for (const data of researchBackedExercises) {
    const normalizedName = data.name.toLowerCase().replace(/\s+/g, '-');

    // Find exercise ID
    const exercise = await db.queryOne<{ id: string }>(`
      SELECT id FROM exercises WHERE LOWER(REPLACE(name, ' ', '-')) = $1 LIMIT 1
    `, [normalizedName]);

    if (exercise) {
      // Check if effectiveness record exists
      const existing = await db.queryOne<{ id: string }>(`
        SELECT id FROM exercise_effectiveness WHERE exercise_id = $1
      `, [exercise.id]);

      if (!existing) {
        await db.query(`
          INSERT INTO exercise_effectiveness (exercise_id, for_strength, for_hypertrophy, for_power, for_endurance, for_rehabilitation, evidence_level)
          VALUES ($1, $2, $3, $4, $5, $6, $7)
        `, [
          exercise.id,
          data.strength,
          data.hypertrophy,
          data.power,
          data.endurance,
          data.rehabilitation,
          data.evidence,
        ]);
      }
    }
  }

  log.info('Migration 149 completed');
}
