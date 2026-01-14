/**
 * Migration: Periodization Engine
 *
 * Creates tables for training cycles, phases, weeks, and
 * user exercise preferences for AI-powered prescription learning.
 * Supports block, DUP, and linear periodization models.
 */

import { db } from '../client';
import { loggers } from '../../lib/logger';

const log = loggers.db;

async function tableExists(tableName: string): Promise<boolean> {
  const result = await db.queryOne<{ count: string }>(
    `SELECT COUNT(*) as count FROM information_schema.tables
     WHERE table_schema = 'public' AND table_name = $1`,
    [tableName]
  );
  return parseInt(result?.count || '0') > 0;
}

export async function up(): Promise<void> {
  log.info('Running migration: 083_periodization_engine');

  // ============================================
  // TRAINING CYCLES TABLE
  // ============================================
  if (!(await tableExists('training_cycles'))) {
    log.info('Creating training_cycles table...');
    await db.query(`
      CREATE TABLE training_cycles (
        id TEXT PRIMARY KEY DEFAULT 'tc_' || replace(gen_random_uuid()::text, '-', ''),
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        periodization_model TEXT NOT NULL CHECK (periodization_model IN ('block', 'dup', 'linear', 'conjugate', 'custom')),
        start_date DATE NOT NULL,
        end_date DATE,
        goal TEXT,
        status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'abandoned', 'paused')),
        notes TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    await db.query('CREATE INDEX idx_training_cycles_user ON training_cycles(user_id, status)');
    await db.query('CREATE INDEX idx_training_cycles_active ON training_cycles(user_id) WHERE status = \'active\'');

    log.info('training_cycles table created');
  }

  // ============================================
  // TRAINING PHASES TABLE
  // ============================================
  if (!(await tableExists('training_phases'))) {
    log.info('Creating training_phases table...');
    await db.query(`
      CREATE TABLE training_phases (
        id TEXT PRIMARY KEY DEFAULT 'tp_' || replace(gen_random_uuid()::text, '-', ''),
        cycle_id TEXT NOT NULL REFERENCES training_cycles(id) ON DELETE CASCADE,
        phase_type TEXT NOT NULL CHECK (phase_type IN (
          'accumulation', 'transmutation', 'realization', 'deload',
          'hypertrophy', 'strength', 'power', 'peaking', 'maintenance'
        )),
        phase_order INT NOT NULL,
        duration_weeks INT NOT NULL,
        start_date DATE,
        end_date DATE,
        volume_modifier FLOAT DEFAULT 1.0,
        intensity_range_low FLOAT,
        intensity_range_high FLOAT,
        rep_range_low INT,
        rep_range_high INT,
        focus_areas TEXT[],
        notes TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    await db.query('CREATE INDEX idx_training_phases_cycle ON training_phases(cycle_id, phase_order)');

    log.info('training_phases table created');
  }

  // ============================================
  // TRAINING WEEKS TABLE
  // ============================================
  if (!(await tableExists('training_weeks'))) {
    log.info('Creating training_weeks table...');
    await db.query(`
      CREATE TABLE training_weeks (
        id TEXT PRIMARY KEY DEFAULT 'tw_' || replace(gen_random_uuid()::text, '-', ''),
        phase_id TEXT NOT NULL REFERENCES training_phases(id) ON DELETE CASCADE,
        week_number INT NOT NULL,
        start_date DATE,
        end_date DATE,
        planned_sessions INT,
        actual_sessions INT DEFAULT 0,
        total_volume FLOAT DEFAULT 0,
        average_intensity FLOAT,
        fatigue_rating INT CHECK (fatigue_rating >= 1 AND fatigue_rating <= 10),
        readiness_rating INT CHECK (readiness_rating >= 1 AND readiness_rating <= 10),
        sleep_quality INT CHECK (sleep_quality >= 1 AND sleep_quality <= 10),
        stress_level INT CHECK (stress_level >= 1 AND stress_level <= 10),
        notes TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    await db.query('CREATE INDEX idx_training_weeks_phase ON training_weeks(phase_id, week_number)');

    log.info('training_weeks table created');
  }

  // ============================================
  // USER EXERCISE PREFERENCES TABLE (AI Learning)
  // ============================================
  if (!(await tableExists('user_exercise_preferences'))) {
    log.info('Creating user_exercise_preferences table...');
    await db.query(`
      CREATE TABLE user_exercise_preferences (
        id TEXT PRIMARY KEY DEFAULT 'uep_' || replace(gen_random_uuid()::text, '-', ''),
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        exercise_id TEXT NOT NULL,
        preference_score FLOAT DEFAULT 0,
        completion_rate FLOAT DEFAULT 0,
        times_prescribed INT DEFAULT 0,
        times_completed INT DEFAULT 0,
        times_skipped INT DEFAULT 0,
        times_swapped INT DEFAULT 0,
        average_rating FLOAT,
        average_rpe FLOAT,
        best_performance JSONB,
        last_performed_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(user_id, exercise_id)
      )
    `);

    await db.query('CREATE INDEX idx_user_exercise_prefs_user ON user_exercise_preferences(user_id)');
    await db.query('CREATE INDEX idx_user_exercise_prefs_score ON user_exercise_preferences(user_id, preference_score DESC)');

    log.info('user_exercise_preferences table created');
  }

  // ============================================
  // WORKOUT FEEDBACK TABLE (AI Learning)
  // ============================================
  if (!(await tableExists('workout_feedback'))) {
    log.info('Creating workout_feedback table...');
    await db.query(`
      CREATE TABLE workout_feedback (
        id TEXT PRIMARY KEY DEFAULT 'wf_' || replace(gen_random_uuid()::text, '-', ''),
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        workout_id TEXT,
        prescription_id TEXT,
        overall_rating INT CHECK (overall_rating >= 1 AND overall_rating <= 5),
        difficulty_rating INT CHECK (difficulty_rating >= 1 AND difficulty_rating <= 5),
        enjoyment_rating INT CHECK (enjoyment_rating >= 1 AND enjoyment_rating <= 5),
        energy_before INT CHECK (energy_before >= 1 AND energy_before <= 10),
        energy_after INT CHECK (energy_after >= 1 AND energy_after <= 10),
        completed_exercises TEXT[],
        skipped_exercises TEXT[],
        swapped_exercises JSONB DEFAULT '[]',
        muscle_soreness JSONB DEFAULT '{}',
        comments TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    await db.query('CREATE INDEX idx_workout_feedback_user ON workout_feedback(user_id, created_at DESC)');
    await db.query('CREATE INDEX idx_workout_feedback_workout ON workout_feedback(workout_id)');

    log.info('workout_feedback table created');
  }

  // ============================================
  // PRESCRIPTION HISTORY TABLE
  // ============================================
  if (!(await tableExists('prescription_history'))) {
    log.info('Creating prescription_history table...');
    await db.query(`
      CREATE TABLE prescription_history (
        id TEXT PRIMARY KEY DEFAULT 'ph_' || replace(gen_random_uuid()::text, '-', ''),
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        constraints_used JSONB NOT NULL,
        exercises_prescribed JSONB NOT NULL,
        ai_reasoning JSONB,
        muscle_coverage JSONB,
        estimated_duration INT,
        was_completed BOOLEAN DEFAULT false,
        completion_percentage FLOAT,
        feedback_id TEXT REFERENCES workout_feedback(id),
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    await db.query('CREATE INDEX idx_prescription_history_user ON prescription_history(user_id, created_at DESC)');

    log.info('prescription_history table created');
  }

  // ============================================
  // PERIODIZATION TEMPLATES
  // ============================================
  if (!(await tableExists('periodization_templates'))) {
    log.info('Creating periodization_templates table...');
    await db.query(`
      CREATE TABLE periodization_templates (
        id TEXT PRIMARY KEY DEFAULT 'pt_' || replace(gen_random_uuid()::text, '-', ''),
        name TEXT NOT NULL,
        description TEXT,
        periodization_model TEXT NOT NULL,
        total_weeks INT NOT NULL,
        goal_type TEXT,
        experience_level TEXT,
        phases JSONB NOT NULL,
        is_default BOOLEAN DEFAULT false,
        created_by TEXT REFERENCES users(id),
        times_used INT DEFAULT 0,
        average_rating FLOAT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    log.info('periodization_templates table created');
  }

  // ============================================
  // SEED PERIODIZATION TEMPLATES
  // ============================================
  log.info('Seeding periodization templates...');

  const templates = [
    {
      id: 'block_strength',
      name: 'Block Periodization - Strength Focus',
      description: '12-week block periodization for building maximal strength. Progresses from volume to intensity to peaking.',
      periodization_model: 'block',
      total_weeks: 12,
      goal_type: 'strength',
      experience_level: 'intermediate',
      phases: [
        {
          phase_type: 'accumulation',
          duration_weeks: 4,
          volume_modifier: 1.2,
          intensity_range: [65, 75],
          rep_range: [8, 12],
          focus_areas: ['hypertrophy', 'work_capacity', 'technique'],
        },
        {
          phase_type: 'transmutation',
          duration_weeks: 4,
          volume_modifier: 1.0,
          intensity_range: [75, 85],
          rep_range: [4, 8],
          focus_areas: ['strength', 'neural_adaptations'],
        },
        {
          phase_type: 'realization',
          duration_weeks: 3,
          volume_modifier: 0.7,
          intensity_range: [85, 95],
          rep_range: [1, 5],
          focus_areas: ['peaking', 'max_strength'],
        },
        {
          phase_type: 'deload',
          duration_weeks: 1,
          volume_modifier: 0.5,
          intensity_range: [50, 65],
          rep_range: [8, 12],
          focus_areas: ['recovery', 'active_rest'],
        },
      ],
      is_default: true,
    },
    {
      id: 'block_hypertrophy',
      name: 'Block Periodization - Hypertrophy Focus',
      description: '12-week program optimized for muscle growth with strategic intensity increases.',
      periodization_model: 'block',
      total_weeks: 12,
      goal_type: 'hypertrophy',
      experience_level: 'intermediate',
      phases: [
        {
          phase_type: 'accumulation',
          duration_weeks: 5,
          volume_modifier: 1.3,
          intensity_range: [60, 70],
          rep_range: [10, 15],
          focus_areas: ['volume', 'metabolic_stress', 'time_under_tension'],
        },
        {
          phase_type: 'transmutation',
          duration_weeks: 4,
          volume_modifier: 1.1,
          intensity_range: [70, 80],
          rep_range: [6, 10],
          focus_areas: ['mechanical_tension', 'progressive_overload'],
        },
        {
          phase_type: 'realization',
          duration_weeks: 2,
          volume_modifier: 0.8,
          intensity_range: [75, 85],
          rep_range: [4, 8],
          focus_areas: ['strength', 'consolidation'],
        },
        {
          phase_type: 'deload',
          duration_weeks: 1,
          volume_modifier: 0.5,
          intensity_range: [50, 60],
          rep_range: [12, 15],
          focus_areas: ['recovery', 'technique'],
        },
      ],
      is_default: true,
    },
    {
      id: 'dup_general',
      name: 'Daily Undulating Periodization',
      description: '8-week DUP program rotating between hypertrophy, strength, and power each training day.',
      periodization_model: 'dup',
      total_weeks: 8,
      goal_type: 'general_fitness',
      experience_level: 'intermediate',
      phases: [
        {
          phase_type: 'hypertrophy',
          duration_weeks: 8,
          volume_modifier: 1.0,
          intensity_range: [65, 75],
          rep_range: [8, 12],
          focus_areas: ['muscle_growth'],
          day_of_week: 1,
        },
        {
          phase_type: 'strength',
          duration_weeks: 8,
          volume_modifier: 0.8,
          intensity_range: [80, 90],
          rep_range: [3, 6],
          focus_areas: ['max_strength'],
          day_of_week: 3,
        },
        {
          phase_type: 'power',
          duration_weeks: 8,
          volume_modifier: 0.6,
          intensity_range: [70, 80],
          rep_range: [3, 5],
          focus_areas: ['explosiveness', 'speed'],
          day_of_week: 5,
        },
      ],
      is_default: true,
    },
    {
      id: 'linear_beginner',
      name: 'Linear Periodization - Beginner',
      description: '16-week linear progression for beginners. Steady increase in intensity with volume reduction.',
      periodization_model: 'linear',
      total_weeks: 16,
      goal_type: 'strength',
      experience_level: 'beginner',
      phases: [
        {
          phase_type: 'hypertrophy',
          duration_weeks: 4,
          volume_modifier: 1.2,
          intensity_range: [60, 65],
          rep_range: [12, 15],
          focus_areas: ['technique', 'work_capacity'],
        },
        {
          phase_type: 'hypertrophy',
          duration_weeks: 4,
          volume_modifier: 1.1,
          intensity_range: [65, 70],
          rep_range: [10, 12],
          focus_areas: ['muscle_growth', 'endurance'],
        },
        {
          phase_type: 'strength',
          duration_weeks: 4,
          volume_modifier: 1.0,
          intensity_range: [70, 80],
          rep_range: [6, 10],
          focus_areas: ['strength', 'progressive_overload'],
        },
        {
          phase_type: 'strength',
          duration_weeks: 3,
          volume_modifier: 0.8,
          intensity_range: [80, 85],
          rep_range: [4, 6],
          focus_areas: ['max_strength'],
        },
        {
          phase_type: 'deload',
          duration_weeks: 1,
          volume_modifier: 0.5,
          intensity_range: [50, 60],
          rep_range: [10, 12],
          focus_areas: ['recovery'],
        },
      ],
      is_default: true,
    },
    {
      id: 'olympic_weightlifting',
      name: 'Olympic Weightlifting Block',
      description: '12-week program for Olympic weightlifting competition prep.',
      periodization_model: 'block',
      total_weeks: 12,
      goal_type: 'olympic_weightlifting',
      experience_level: 'advanced',
      phases: [
        {
          phase_type: 'accumulation',
          duration_weeks: 4,
          volume_modifier: 1.3,
          intensity_range: [65, 75],
          rep_range: [3, 5],
          focus_areas: ['technique', 'positional_strength', 'pulls', 'squats'],
        },
        {
          phase_type: 'transmutation',
          duration_weeks: 4,
          volume_modifier: 1.0,
          intensity_range: [75, 85],
          rep_range: [2, 3],
          focus_areas: ['speed', 'classic_lifts', 'heavy_singles'],
        },
        {
          phase_type: 'realization',
          duration_weeks: 3,
          volume_modifier: 0.6,
          intensity_range: [90, 100],
          rep_range: [1, 2],
          focus_areas: ['peaking', 'competition_prep', 'max_attempts'],
        },
        {
          phase_type: 'deload',
          duration_weeks: 1,
          volume_modifier: 0.3,
          intensity_range: [60, 70],
          rep_range: [2, 3],
          focus_areas: ['recovery', 'technique_maintenance'],
        },
      ],
      is_default: true,
    },
  ];

  for (const template of templates) {
    await db.query(
      `INSERT INTO periodization_templates (id, name, description, periodization_model, total_weeks, goal_type, experience_level, phases, is_default)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       ON CONFLICT (id) DO UPDATE SET
         name = $2, description = $3, periodization_model = $4, total_weeks = $5,
         goal_type = $6, experience_level = $7, phases = $8, is_default = $9`,
      [
        template.id, template.name, template.description,
        template.periodization_model, template.total_weeks,
        template.goal_type, template.experience_level,
        JSON.stringify(template.phases), template.is_default,
      ]
    );
  }

  log.info('Migration 083_periodization_engine completed');
}

export async function down(): Promise<void> {
  log.info('Rolling back migration: 083_periodization_engine');

  await db.query('DROP TABLE IF EXISTS periodization_templates CASCADE');
  await db.query('DROP TABLE IF EXISTS prescription_history CASCADE');
  await db.query('DROP TABLE IF EXISTS workout_feedback CASCADE');
  await db.query('DROP TABLE IF EXISTS user_exercise_preferences CASCADE');
  await db.query('DROP TABLE IF EXISTS training_weeks CASCADE');
  await db.query('DROP TABLE IF EXISTS training_phases CASCADE');
  await db.query('DROP TABLE IF EXISTS training_cycles CASCADE');

  log.info('Migration 083_periodization_engine rolled back');
}
