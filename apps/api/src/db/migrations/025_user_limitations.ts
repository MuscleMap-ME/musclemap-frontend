/**
 * Migration: Disability & Physical Limitation Profiles
 *
 * This migration creates tables for:
 * 1. body_regions - Reference table for body parts/regions
 * 2. user_limitations - User's physical limitations and disabilities
 * 3. exercise_substitutions - Alternative exercises for limitations
 * 4. limitation_exercise_flags - Exercises flagged for specific limitations
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

export async function up(): Promise<void> {
  log.info('Running migration: 025_user_limitations');

  // Create body_regions reference table
  if (!(await tableExists('body_regions'))) {
    log.info('Creating body_regions table...');
    await db.query(`
      CREATE TABLE body_regions (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        parent_region TEXT REFERENCES body_regions(id),
        display_order INTEGER DEFAULT 0,
        icon TEXT
      )
    `);

    // Seed body regions
    await db.query(`
      INSERT INTO body_regions (id, name, parent_region, display_order, icon) VALUES
      -- Upper Body
      ('upper_body', 'Upper Body', NULL, 1, 'body-upper'),
      ('neck', 'Neck', 'upper_body', 10, 'neck'),
      ('shoulder_left', 'Left Shoulder', 'upper_body', 20, 'shoulder'),
      ('shoulder_right', 'Right Shoulder', 'upper_body', 21, 'shoulder'),
      ('chest', 'Chest', 'upper_body', 30, 'chest'),
      ('upper_back', 'Upper Back', 'upper_body', 40, 'back'),
      ('elbow_left', 'Left Elbow', 'upper_body', 50, 'elbow'),
      ('elbow_right', 'Right Elbow', 'upper_body', 51, 'elbow'),
      ('wrist_left', 'Left Wrist', 'upper_body', 60, 'wrist'),
      ('wrist_right', 'Right Wrist', 'upper_body', 61, 'wrist'),
      ('hand_left', 'Left Hand', 'upper_body', 70, 'hand'),
      ('hand_right', 'Right Hand', 'upper_body', 71, 'hand'),

      -- Core
      ('core', 'Core', NULL, 2, 'body-core'),
      ('lower_back', 'Lower Back', 'core', 10, 'back-lower'),
      ('abdomen', 'Abdomen', 'core', 20, 'abs'),
      ('spine', 'Spine', 'core', 30, 'spine'),

      -- Lower Body
      ('lower_body', 'Lower Body', NULL, 3, 'body-lower'),
      ('hip_left', 'Left Hip', 'lower_body', 10, 'hip'),
      ('hip_right', 'Right Hip', 'lower_body', 11, 'hip'),
      ('knee_left', 'Left Knee', 'lower_body', 20, 'knee'),
      ('knee_right', 'Right Knee', 'lower_body', 21, 'knee'),
      ('ankle_left', 'Left Ankle', 'lower_body', 30, 'ankle'),
      ('ankle_right', 'Right Ankle', 'lower_body', 31, 'ankle'),
      ('foot_left', 'Left Foot', 'lower_body', 40, 'foot'),
      ('foot_right', 'Right Foot', 'lower_body', 41, 'foot'),

      -- Systemic
      ('systemic', 'Systemic/General', NULL, 4, 'body-full'),
      ('cardiovascular', 'Cardiovascular', 'systemic', 10, 'heart'),
      ('respiratory', 'Respiratory', 'systemic', 20, 'lungs'),
      ('neurological', 'Neurological', 'systemic', 30, 'brain'),
      ('vestibular', 'Balance/Vestibular', 'systemic', 40, 'balance')
      ON CONFLICT (id) DO NOTHING
    `);
  }

  // Create user_limitations table
  if (!(await tableExists('user_limitations'))) {
    log.info('Creating user_limitations table...');
    await db.query(`
      CREATE TABLE user_limitations (
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,

        -- Limitation Details
        body_region_id TEXT REFERENCES body_regions(id),
        limitation_type TEXT NOT NULL CHECK (limitation_type IN (
          'injury', 'chronic_condition', 'disability', 'surgery_recovery',
          'mobility_restriction', 'pain', 'weakness', 'amputation',
          'prosthetic', 'age_related', 'pregnancy', 'other'
        )),

        -- Severity & Status
        severity TEXT DEFAULT 'moderate' CHECK (severity IN ('mild', 'moderate', 'severe', 'complete')),
        status TEXT DEFAULT 'active' CHECK (status IN ('active', 'recovering', 'resolved', 'permanent')),

        -- Description
        name TEXT NOT NULL,
        description TEXT,
        medical_notes TEXT,

        -- Movement Restrictions
        avoid_movements TEXT[], -- e.g., ['overhead_press', 'jumping', 'twisting']
        avoid_impact BOOLEAN DEFAULT FALSE,
        avoid_weight_bearing BOOLEAN DEFAULT FALSE,
        max_weight_lbs INTEGER,
        max_reps INTEGER,

        -- Range of Motion
        rom_flexion_percent INTEGER CHECK (rom_flexion_percent BETWEEN 0 AND 100),
        rom_extension_percent INTEGER CHECK (rom_extension_percent BETWEEN 0 AND 100),
        rom_rotation_percent INTEGER CHECK (rom_rotation_percent BETWEEN 0 AND 100),

        -- Timeline
        onset_date DATE,
        expected_recovery_date DATE,
        last_reviewed DATE,

        -- Professional Input
        diagnosed_by TEXT,
        pt_approved BOOLEAN DEFAULT FALSE,

        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    await db.query(`CREATE INDEX idx_user_limitations_user ON user_limitations(user_id)`);
    await db.query(`CREATE INDEX idx_user_limitations_active ON user_limitations(user_id, status) WHERE status IN ('active', 'recovering')`);
    await db.query(`CREATE INDEX idx_user_limitations_region ON user_limitations(body_region_id)`);
  }

  // Create exercise_substitutions table
  if (!(await tableExists('exercise_substitutions'))) {
    log.info('Creating exercise_substitutions table...');
    await db.query(`
      CREATE TABLE exercise_substitutions (
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,

        -- Original Exercise
        original_exercise_id TEXT NOT NULL,

        -- Substitute Exercise
        substitute_exercise_id TEXT NOT NULL,

        -- When to Use
        limitation_type TEXT,
        body_region_id TEXT REFERENCES body_regions(id),
        severity_min TEXT CHECK (severity_min IN ('mild', 'moderate', 'severe', 'complete')),

        -- Substitution Details
        reason TEXT,
        notes TEXT,
        similarity_score INTEGER CHECK (similarity_score BETWEEN 0 AND 100),

        -- Validation
        is_verified BOOLEAN DEFAULT FALSE,
        verified_by TEXT,

        created_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(original_exercise_id, substitute_exercise_id, limitation_type, body_region_id)
      )
    `);
    await db.query(`CREATE INDEX idx_exercise_substitutions_original ON exercise_substitutions(original_exercise_id)`);
    await db.query(`CREATE INDEX idx_exercise_substitutions_region ON exercise_substitutions(body_region_id)`);
  }

  // Create limitation_exercise_flags table
  if (!(await tableExists('limitation_exercise_flags'))) {
    log.info('Creating limitation_exercise_flags table...');
    await db.query(`
      CREATE TABLE limitation_exercise_flags (
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,

        exercise_id TEXT NOT NULL,
        body_region_id TEXT REFERENCES body_regions(id),
        limitation_type TEXT,

        -- Flag Details
        flag_type TEXT NOT NULL CHECK (flag_type IN ('avoid', 'caution', 'modify', 'reduce_weight', 'reduce_reps')),
        severity_threshold TEXT DEFAULT 'moderate' CHECK (severity_threshold IN ('mild', 'moderate', 'severe', 'complete')),

        -- Guidance
        warning_message TEXT,
        modification_instructions TEXT,

        created_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(exercise_id, body_region_id, limitation_type)
      )
    `);
    await db.query(`CREATE INDEX idx_limitation_flags_exercise ON limitation_exercise_flags(exercise_id)`);
    await db.query(`CREATE INDEX idx_limitation_flags_region ON limitation_exercise_flags(body_region_id)`);
  }

  log.info('Migration 025_user_limitations complete');
}

export async function down(): Promise<void> {
  log.info('Rolling back migration: 025_user_limitations');
  await db.query(`DROP TABLE IF EXISTS limitation_exercise_flags`);
  await db.query(`DROP TABLE IF EXISTS exercise_substitutions`);
  await db.query(`DROP TABLE IF EXISTS user_limitations`);
  await db.query(`DROP TABLE IF EXISTS body_regions`);
  log.info('Rollback 025_user_limitations complete');
}

export const migrate = up;
