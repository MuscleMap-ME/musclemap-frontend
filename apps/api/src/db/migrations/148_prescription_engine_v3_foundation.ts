/**
 * Migration 148: Prescription Engine v3 Foundation
 *
 * Creates the core data infrastructure for the enhanced prescription engine:
 * - user_biomechanics: Physical attributes and mobility assessments
 * - user_exercise_performance: Per-exercise tracking for personalization
 * - prescription_feedback: Learning loop for adaptive recommendations
 * - exercise_effectiveness: Research-backed effectiveness ratings
 * - Enhanced exercises table with v3 metadata
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

async function columnExists(tableName: string, columnName: string): Promise<boolean> {
  const result = await db.queryOne<{ count: string }>(
    `SELECT COUNT(*) as count FROM information_schema.columns
     WHERE table_name = $1 AND column_name = $2`,
    [tableName, columnName]
  );
  return parseInt(result?.count || '0') > 0;
}

async function indexExists(indexName: string): Promise<boolean> {
  const result = await db.queryOne<{ count: string }>(
    `SELECT COUNT(*) as count FROM pg_indexes WHERE indexname = $1`,
    [indexName]
  );
  return parseInt(result?.count || '0') > 0;
}

export async function migrate(): Promise<void> {
  log.info('Running migration: 148_prescription_engine_v3_foundation');

  // ============================================
  // 1. USER BIOMECHANICS TABLE
  // ============================================
  if (!(await tableExists('user_biomechanics'))) {
    log.info('Creating user_biomechanics table...');
    await db.query(`
      CREATE TABLE user_biomechanics (
        user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,

        -- Physical Attributes
        height_cm DECIMAL(5, 2),
        weight_kg DECIMAL(5, 2),
        arm_span_cm DECIMAL(5, 2),
        femur_length_relative TEXT CHECK (femur_length_relative IN ('short', 'average', 'long')),
        torso_length_relative TEXT CHECK (torso_length_relative IN ('short', 'average', 'long')),

        -- Frame Classification
        frame_size TEXT CHECK (frame_size IN ('small', 'medium', 'large')),
        somatotype TEXT CHECK (somatotype IN ('ectomorph', 'mesomorph', 'endomorph', 'ecto-meso', 'meso-endo', 'ecto-endo')),

        -- Mobility Assessment (JSONB for flexibility)
        mobility_profile JSONB DEFAULT '{}',

        -- Strength Curve Anomalies (JSONB)
        strength_curve_anomalies JSONB DEFAULT '{}',

        -- Assessment tracking
        last_assessed_at TIMESTAMP,
        assessment_source TEXT CHECK (assessment_source IN ('self_reported', 'professional', 'ai_estimated')),

        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);
    log.info('Created user_biomechanics table');
  }

  // ============================================
  // 2. USER EXERCISE PERFORMANCE TABLE
  // ============================================
  if (!(await tableExists('user_exercise_performance'))) {
    log.info('Creating user_exercise_performance table...');
    await db.query(`
      CREATE TABLE user_exercise_performance (
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        exercise_id TEXT NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,

        -- Strength Metrics
        estimated_1rm DECIMAL(10, 2),
        recent_max_weight DECIMAL(10, 2),
        max_weight_ever DECIMAL(10, 2),
        best_rep_max JSONB DEFAULT '{}',

        -- Volume Metrics
        lifetime_total_reps INTEGER DEFAULT 0,
        lifetime_total_tonnage DECIMAL(14, 2) DEFAULT 0,
        monthly_volume_trend JSONB DEFAULT '[]',

        -- Technical Competency
        form_rating DECIMAL(2, 1) CHECK (form_rating >= 1 AND form_rating <= 5),
        skill_progression TEXT CHECK (skill_progression IN ('learning', 'competent', 'proficient', 'mastered')) DEFAULT 'learning',
        sessions_to_competency INTEGER,

        -- User Feedback
        enjoyment_rating DECIMAL(2, 1) CHECK (enjoyment_rating >= 1 AND enjoyment_rating <= 5),
        perceived_difficulty DECIMAL(2, 1) CHECK (perceived_difficulty >= 1 AND perceived_difficulty <= 5),
        joint_stress_experienced DECIMAL(2, 1) CHECK (joint_stress_experienced >= 1 AND joint_stress_experienced <= 5),

        -- Timeline
        first_performed_at TIMESTAMP,
        last_performed_at TIMESTAMP,
        total_sessions INTEGER DEFAULT 0,
        consecutive_success_sessions INTEGER DEFAULT 0,

        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),

        UNIQUE(user_id, exercise_id)
      )
    `);

    if (!(await indexExists('idx_user_exercise_perf_user'))) {
      await db.query(`CREATE INDEX idx_user_exercise_perf_user ON user_exercise_performance(user_id)`);
    }
    if (!(await indexExists('idx_user_exercise_perf_exercise'))) {
      await db.query(`CREATE INDEX idx_user_exercise_perf_exercise ON user_exercise_performance(exercise_id)`);
    }
    if (!(await indexExists('idx_user_exercise_perf_last_performed'))) {
      await db.query(`CREATE INDEX idx_user_exercise_perf_last_performed ON user_exercise_performance(user_id, last_performed_at DESC)`);
    }
    log.info('Created user_exercise_performance table');
  }

  // ============================================
  // 3. PRESCRIPTION FEEDBACK TABLE
  // ============================================
  if (!(await tableExists('prescription_feedback'))) {
    log.info('Creating prescription_feedback table...');
    await db.query(`
      CREATE TABLE prescription_feedback (
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
        prescription_id TEXT NOT NULL,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,

        -- Adherence
        exercises_prescribed INTEGER NOT NULL,
        exercises_completed INTEGER NOT NULL,
        exercises_skipped INTEGER DEFAULT 0,
        exercises_substituted INTEGER DEFAULT 0,
        substitutions JSONB DEFAULT '[]',

        -- Perceived Metrics
        overall_difficulty_rating INTEGER CHECK (overall_difficulty_rating >= 1 AND overall_difficulty_rating <= 5),
        estimated_time_minutes INTEGER,
        actual_time_minutes INTEGER,
        fatigue_at_end INTEGER CHECK (fatigue_at_end >= 1 AND fatigue_at_end <= 5),
        soreness_next_day INTEGER CHECK (soreness_next_day >= 1 AND soreness_next_day <= 5),

        -- Satisfaction
        overall_satisfaction INTEGER CHECK (overall_satisfaction >= 1 AND overall_satisfaction <= 5),
        would_repeat BOOLEAN,
        free_text_feedback TEXT,

        -- Per-Exercise Feedback (JSONB array)
        exercise_feedback JSONB DEFAULT '[]',

        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    if (!(await indexExists('idx_prescription_feedback_user'))) {
      await db.query(`CREATE INDEX idx_prescription_feedback_user ON prescription_feedback(user_id)`);
    }
    if (!(await indexExists('idx_prescription_feedback_created'))) {
      await db.query(`CREATE INDEX idx_prescription_feedback_created ON prescription_feedback(user_id, created_at DESC)`);
    }
    log.info('Created prescription_feedback table');
  }

  // ============================================
  // 4. PRESCRIPTION HISTORY TABLE
  // ============================================
  if (!(await tableExists('prescription_history'))) {
    log.info('Creating prescription_history table...');
    await db.query(`
      CREATE TABLE prescription_history (
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,

        -- Prescription content
        exercises JSONB NOT NULL,
        warmup JSONB,
        cooldown JSONB,
        total_duration INTEGER,
        muscle_coverage JSONB,
        periodization_phase TEXT,
        difficulty TEXT,

        -- Metadata
        algorithm_version TEXT,

        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    if (!(await indexExists('idx_prescription_history_user'))) {
      await db.query(`CREATE INDEX idx_prescription_history_user ON prescription_history(user_id, created_at DESC)`);
    }
    log.info('Created prescription_history table');
  }

  // ============================================
  // 5. EXERCISE EFFECTIVENESS TABLE
  // ============================================
  if (!(await tableExists('exercise_effectiveness'))) {
    log.info('Creating exercise_effectiveness table...');
    await db.query(`
      CREATE TABLE exercise_effectiveness (
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
        exercise_id TEXT NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,

        -- Research-backed ratings (1-10)
        for_strength DECIMAL(3, 1) CHECK (for_strength >= 1 AND for_strength <= 10),
        for_hypertrophy DECIMAL(3, 1) CHECK (for_hypertrophy >= 1 AND for_hypertrophy <= 10),
        for_power DECIMAL(3, 1) CHECK (for_power >= 1 AND for_power <= 10),
        for_endurance DECIMAL(3, 1) CHECK (for_endurance >= 1 AND for_endurance <= 10),
        for_rehabilitation DECIMAL(3, 1) CHECK (for_rehabilitation >= 1 AND for_rehabilitation <= 10),

        -- Evidence level
        evidence_level TEXT CHECK (evidence_level IN ('low', 'moderate', 'high')),
        research_citations JSONB DEFAULT '[]',

        -- User-derived ratings (calculated from feedback)
        user_avg_rating DECIMAL(3, 1),
        user_rating_count INTEGER DEFAULT 0,

        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),

        UNIQUE(exercise_id)
      )
    `);
    log.info('Created exercise_effectiveness table');
  }

  // ============================================
  // 6. ENHANCE EXERCISES TABLE WITH V3 COLUMNS
  // ============================================
  log.info('Adding v3 columns to exercises table...');

  // Movement pattern (v3 classification)
  if (!(await columnExists('exercises', 'movement_pattern_v3'))) {
    await db.query(`ALTER TABLE exercises ADD COLUMN movement_pattern_v3 TEXT`);
  }

  // Plane of motion
  if (!(await columnExists('exercises', 'plane'))) {
    await db.query(`ALTER TABLE exercises ADD COLUMN plane TEXT DEFAULT 'sagittal'`);
  }

  // Joint actions (JSONB array)
  if (!(await columnExists('exercises', 'joint_actions'))) {
    await db.query(`ALTER TABLE exercises ADD COLUMN joint_actions JSONB DEFAULT '[]'`);
  }

  // Muscle activation (JSONB)
  if (!(await columnExists('exercises', 'muscle_activation'))) {
    await db.query(`ALTER TABLE exercises ADD COLUMN muscle_activation JSONB`);
  }

  // Biomechanics (JSONB)
  if (!(await columnExists('exercises', 'biomechanics'))) {
    await db.query(`ALTER TABLE exercises ADD COLUMN biomechanics JSONB`);
  }

  // Performance metrics
  if (!(await columnExists('exercises', 'cns_load_factor'))) {
    await db.query(`ALTER TABLE exercises ADD COLUMN cns_load_factor INTEGER DEFAULT 5`);
  }
  if (!(await columnExists('exercises', 'metabolic_demand'))) {
    await db.query(`ALTER TABLE exercises ADD COLUMN metabolic_demand INTEGER DEFAULT 5`);
  }
  if (!(await columnExists('exercises', 'technical_complexity'))) {
    await db.query(`ALTER TABLE exercises ADD COLUMN technical_complexity INTEGER DEFAULT 5`);
  }
  if (!(await columnExists('exercises', 'skill_learning_curve'))) {
    await db.query(`ALTER TABLE exercises ADD COLUMN skill_learning_curve INTEGER DEFAULT 5`);
  }
  if (!(await columnExists('exercises', 'balance_requirement'))) {
    await db.query(`ALTER TABLE exercises ADD COLUMN balance_requirement INTEGER DEFAULT 5`);
  }

  // Recovery profile
  if (!(await columnExists('exercises', 'recovery_typical_soreness_hours'))) {
    await db.query(`ALTER TABLE exercises ADD COLUMN recovery_typical_soreness_hours INTEGER DEFAULT 48`);
  }
  if (!(await columnExists('exercises', 'recovery_minimum_hours'))) {
    await db.query(`ALTER TABLE exercises ADD COLUMN recovery_minimum_hours INTEGER DEFAULT 48`);
  }
  if (!(await columnExists('exercises', 'recovery_muscle_factor'))) {
    await db.query(`ALTER TABLE exercises ADD COLUMN recovery_muscle_factor JSONB DEFAULT '{}'`);
  }

  // Effectiveness ratings
  if (!(await columnExists('exercises', 'effectiveness_strength'))) {
    await db.query(`ALTER TABLE exercises ADD COLUMN effectiveness_strength INTEGER DEFAULT 5`);
  }
  if (!(await columnExists('exercises', 'effectiveness_hypertrophy'))) {
    await db.query(`ALTER TABLE exercises ADD COLUMN effectiveness_hypertrophy INTEGER DEFAULT 5`);
  }
  if (!(await columnExists('exercises', 'effectiveness_power'))) {
    await db.query(`ALTER TABLE exercises ADD COLUMN effectiveness_power INTEGER DEFAULT 5`);
  }
  if (!(await columnExists('exercises', 'effectiveness_endurance'))) {
    await db.query(`ALTER TABLE exercises ADD COLUMN effectiveness_endurance INTEGER DEFAULT 5`);
  }
  if (!(await columnExists('exercises', 'effectiveness_rehabilitation'))) {
    await db.query(`ALTER TABLE exercises ADD COLUMN effectiveness_rehabilitation INTEGER DEFAULT 5`);
  }
  if (!(await columnExists('exercises', 'evidence_level'))) {
    await db.query(`ALTER TABLE exercises ADD COLUMN evidence_level TEXT DEFAULT 'moderate'`);
  }

  // Requirements
  if (!(await columnExists('exercises', 'equipment_required'))) {
    await db.query(`ALTER TABLE exercises ADD COLUMN equipment_required JSONB DEFAULT '[]'`);
  }
  if (!(await columnExists('exercises', 'equipment_optional'))) {
    await db.query(`ALTER TABLE exercises ADD COLUMN equipment_optional JSONB DEFAULT '[]'`);
  }
  if (!(await columnExists('exercises', 'space_needed'))) {
    await db.query(`ALTER TABLE exercises ADD COLUMN space_needed TEXT DEFAULT 'moderate'`);
  }
  if (!(await columnExists('exercises', 'noise_level'))) {
    await db.query(`ALTER TABLE exercises ADD COLUMN noise_level TEXT DEFAULT 'moderate'`);
  }
  if (!(await columnExists('exercises', 'safe_for_home'))) {
    await db.query(`ALTER TABLE exercises ADD COLUMN safe_for_home BOOLEAN DEFAULT true`);
  }

  // Progression tree
  if (!(await columnExists('exercises', 'progression_regressions'))) {
    await db.query(`ALTER TABLE exercises ADD COLUMN progression_regressions JSONB DEFAULT '[]'`);
  }
  if (!(await columnExists('exercises', 'progression_progressions'))) {
    await db.query(`ALTER TABLE exercises ADD COLUMN progression_progressions JSONB DEFAULT '[]'`);
  }
  if (!(await columnExists('exercises', 'progression_lateral'))) {
    await db.query(`ALTER TABLE exercises ADD COLUMN progression_lateral JSONB DEFAULT '[]'`);
  }

  // Contraindications
  if (!(await columnExists('exercises', 'contraindicated_injuries'))) {
    await db.query(`ALTER TABLE exercises ADD COLUMN contraindicated_injuries JSONB DEFAULT '[]'`);
  }
  if (!(await columnExists('exercises', 'contraindicated_conditions'))) {
    await db.query(`ALTER TABLE exercises ADD COLUMN contraindicated_conditions JSONB DEFAULT '[]'`);
  }
  if (!(await columnExists('exercises', 'age_min'))) {
    await db.query(`ALTER TABLE exercises ADD COLUMN age_min INTEGER`);
  }
  if (!(await columnExists('exercises', 'age_max'))) {
    await db.query(`ALTER TABLE exercises ADD COLUMN age_max INTEGER`);
  }
  if (!(await columnExists('exercises', 'pregnancy_safe'))) {
    await db.query(`ALTER TABLE exercises ADD COLUMN pregnancy_safe BOOLEAN DEFAULT true`);
  }

  // ============================================
  // 7. ADAPTIVE USER WEIGHTS TABLE
  // ============================================
  if (!(await tableExists('adaptive_user_weights'))) {
    log.info('Creating adaptive_user_weights table...');
    await db.query(`
      CREATE TABLE adaptive_user_weights (
        user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,

        -- Weight modifiers (JSONB)
        weight_modifiers JSONB DEFAULT '{}',

        -- Learned preferences
        preferred_patterns JSONB DEFAULT '[]',
        avoided_patterns JSONB DEFAULT '[]',
        preferred_intensity_range JSONB DEFAULT '{"min": 60, "max": 80}',

        -- Model metadata
        samples_used INTEGER DEFAULT 0,
        confidence DECIMAL(3, 2) DEFAULT 0,

        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);
    log.info('Created adaptive_user_weights table');
  }

  log.info('Migration 148 completed');
}
