/**
 * Migration: Training Programs System
 *
 * Adds multi-week training programs with progression rules:
 * - Programs table with schedule and progression configuration
 * - Program enrollments for user participation tracking
 * - Program weeks for detailed scheduling
 * - Pre-made programs (PPL, 5x5, Upper/Lower, PHUL)
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
  log.info('Running migration: 093_training_programs');

  // ============================================
  // TRAINING PROGRAMS TABLE
  // ============================================
  if (!(await tableExists('training_programs'))) {
    log.info('Creating training_programs table...');
    await db.query(`
      CREATE TABLE training_programs (
        id TEXT PRIMARY KEY DEFAULT 'prog_' || replace(gen_random_uuid()::text, '-', ''),
        creator_id TEXT REFERENCES users(id) ON DELETE SET NULL,

        -- Basic info
        name TEXT NOT NULL,
        description TEXT,
        short_description TEXT,

        -- Program structure
        duration_weeks INTEGER NOT NULL DEFAULT 4,
        days_per_week INTEGER NOT NULL DEFAULT 4,
        schedule JSONB NOT NULL DEFAULT '[]',

        -- Progression rules
        progression_rules JSONB NOT NULL DEFAULT '{}',

        -- Metadata
        difficulty TEXT CHECK (difficulty IN ('beginner', 'intermediate', 'advanced', 'elite')),
        category TEXT, -- strength, hypertrophy, powerbuilding, general_fitness, athletic_performance
        goals JSONB DEFAULT '[]', -- muscle_gain, strength, fat_loss, endurance, etc.
        target_muscles JSONB DEFAULT '[]',
        equipment_required JSONB DEFAULT '[]',

        -- Visibility and sharing
        is_public BOOLEAN DEFAULT FALSE,
        is_official BOOLEAN DEFAULT FALSE, -- Staff-created/curated programs
        is_featured BOOLEAN DEFAULT FALSE,

        -- Stats (denormalized for performance)
        total_enrollments INTEGER DEFAULT 0,
        active_enrollments INTEGER DEFAULT 0,
        completion_rate NUMERIC(5,2) DEFAULT 0,
        average_rating NUMERIC(3,2) DEFAULT 0,
        rating_count INTEGER DEFAULT 0,

        -- Media
        image_url TEXT,
        thumbnail_url TEXT,

        -- Timestamps
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    // Indexes (with IF NOT EXISTS for idempotency)
    await db.query('CREATE INDEX IF NOT EXISTS idx_programs_creator ON training_programs(creator_id)');
    await db.query('CREATE INDEX IF NOT EXISTS idx_programs_public ON training_programs(is_public, created_at DESC) WHERE is_public = TRUE');
    await db.query('CREATE INDEX IF NOT EXISTS idx_programs_official ON training_programs(is_official) WHERE is_official = TRUE');
    await db.query('CREATE INDEX IF NOT EXISTS idx_programs_featured ON training_programs(is_featured) WHERE is_featured = TRUE');
    await db.query('CREATE INDEX IF NOT EXISTS idx_programs_category ON training_programs(category) WHERE is_public = TRUE');
    await db.query('CREATE INDEX IF NOT EXISTS idx_programs_difficulty ON training_programs(difficulty) WHERE is_public = TRUE');
    await db.query('CREATE INDEX IF NOT EXISTS idx_programs_popular ON training_programs(total_enrollments DESC) WHERE is_public = TRUE');

    // Trigger for updated_at
    await db.query(`
      CREATE OR REPLACE FUNCTION update_program_timestamp()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = NOW();
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql
    `);

    await db.query(`
      CREATE TRIGGER trg_program_updated
      BEFORE UPDATE ON training_programs
      FOR EACH ROW EXECUTE FUNCTION update_program_timestamp()
    `);

    log.info('training_programs table created');
  }

  // ============================================
  // PROGRAM ENROLLMENTS TABLE
  // ============================================
  if (!(await tableExists('program_enrollments'))) {
    log.info('Creating program_enrollments table...');
    await db.query(`
      CREATE TABLE program_enrollments (
        id TEXT PRIMARY KEY DEFAULT 'enroll_' || replace(gen_random_uuid()::text, '-', ''),
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        program_id TEXT NOT NULL REFERENCES training_programs(id) ON DELETE CASCADE,

        -- Progress tracking
        current_week INTEGER NOT NULL DEFAULT 1,
        current_day INTEGER NOT NULL DEFAULT 1,
        status TEXT DEFAULT 'active' CHECK (status IN ('active', 'paused', 'completed', 'dropped')),

        -- Dates
        started_at TIMESTAMPTZ DEFAULT NOW(),
        paused_at TIMESTAMPTZ,
        completed_at TIMESTAMPTZ,
        expected_end_date DATE,

        -- Session tracking
        workouts_completed INTEGER DEFAULT 0,
        total_workouts INTEGER, -- Pre-calculated total from program
        streak_current INTEGER DEFAULT 0,
        streak_longest INTEGER DEFAULT 0,

        -- Progress data
        progress_data JSONB DEFAULT '{}', -- Per-exercise progression data

        -- Rating (after completion)
        user_rating INTEGER CHECK (user_rating >= 1 AND user_rating <= 5),
        user_review TEXT,
        rated_at TIMESTAMPTZ,

        -- Timestamps
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),

        CONSTRAINT unique_active_enrollment UNIQUE (user_id, program_id)
      )
    `);

    // Indexes (with IF NOT EXISTS for idempotency)
    await db.query('CREATE INDEX IF NOT EXISTS idx_enrollments_user ON program_enrollments(user_id)');
    await db.query('CREATE INDEX IF NOT EXISTS idx_enrollments_program ON program_enrollments(program_id)');
    await db.query('CREATE INDEX IF NOT EXISTS idx_enrollments_active ON program_enrollments(user_id, status) WHERE status = \'active\'');
    await db.query('CREATE INDEX IF NOT EXISTS idx_enrollments_keyset ON program_enrollments(user_id, created_at DESC, id DESC)');

    // Trigger for updated_at
    await db.query(`
      CREATE TRIGGER trg_enrollment_updated
      BEFORE UPDATE ON program_enrollments
      FOR EACH ROW EXECUTE FUNCTION update_program_timestamp()
    `);

    log.info('program_enrollments table created');
  }

  // ============================================
  // PROGRAM RATINGS TABLE
  // ============================================
  if (!(await tableExists('program_ratings'))) {
    log.info('Creating program_ratings table...');
    await db.query(`
      CREATE TABLE program_ratings (
        id TEXT PRIMARY KEY DEFAULT 'prat_' || replace(gen_random_uuid()::text, '-', ''),
        program_id TEXT NOT NULL REFERENCES training_programs(id) ON DELETE CASCADE,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,

        rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
        review TEXT,
        completed_program BOOLEAN DEFAULT FALSE, -- Did they complete the full program?

        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),

        CONSTRAINT unique_program_rating UNIQUE (program_id, user_id)
      )
    `);

    await db.query('CREATE INDEX idx_program_ratings_program ON program_ratings(program_id)');
    await db.query('CREATE INDEX idx_program_ratings_user ON program_ratings(user_id)');

    log.info('program_ratings table created');
  }

  // ============================================
  // SEED OFFICIAL PROGRAMS
  // ============================================
  log.info('Seeding official training programs...');

  const programs = [
    {
      id: 'prog_ppl_classic',
      name: 'Push Pull Legs (PPL)',
      description: `The classic Push/Pull/Legs split is one of the most effective training programs for building muscle and strength. This 6-day program alternates between pushing movements (chest, shoulders, triceps), pulling movements (back, biceps), and leg exercises.

Each workout focuses on compound movements first, followed by isolation exercises to maximize muscle growth. Progressive overload is built into the program - aim to increase weight or reps each week.

This program is ideal for intermediate to advanced lifters who can commit to 6 days per week of training and want to maximize hypertrophy.`,
      short_description: 'Classic 6-day split targeting push, pull, and leg muscles separately for maximum hypertrophy.',
      duration_weeks: 8,
      days_per_week: 6,
      difficulty: 'intermediate',
      category: 'hypertrophy',
      goals: JSON.stringify(['muscle_gain', 'strength']),
      equipment_required: JSON.stringify(['barbell', 'dumbbells', 'cable_machine', 'pullup_bar']),
      schedule: JSON.stringify([
        {
          day: 1,
          name: 'Push A',
          focus: 'chest',
          exercises: [
            { exerciseId: 'bench_press', sets: 4, reps: '6-8', restSeconds: 180 },
            { exerciseId: 'incline_dumbbell_press', sets: 3, reps: '8-10', restSeconds: 120 },
            { exerciseId: 'overhead_press', sets: 3, reps: '8-10', restSeconds: 120 },
            { exerciseId: 'lateral_raise', sets: 3, reps: '12-15', restSeconds: 60 },
            { exerciseId: 'tricep_pushdown', sets: 3, reps: '10-12', restSeconds: 60 },
            { exerciseId: 'overhead_tricep_extension', sets: 3, reps: '10-12', restSeconds: 60 },
          ],
        },
        {
          day: 2,
          name: 'Pull A',
          focus: 'back',
          exercises: [
            { exerciseId: 'deadlift', sets: 3, reps: '5', restSeconds: 180 },
            { exerciseId: 'pullup', sets: 4, reps: '6-10', restSeconds: 120 },
            { exerciseId: 'barbell_row', sets: 3, reps: '8-10', restSeconds: 120 },
            { exerciseId: 'face_pull', sets: 3, reps: '15-20', restSeconds: 60 },
            { exerciseId: 'barbell_curl', sets: 3, reps: '10-12', restSeconds: 60 },
            { exerciseId: 'hammer_curl', sets: 3, reps: '10-12', restSeconds: 60 },
          ],
        },
        {
          day: 3,
          name: 'Legs A',
          focus: 'quads',
          exercises: [
            { exerciseId: 'squat', sets: 4, reps: '6-8', restSeconds: 180 },
            { exerciseId: 'leg_press', sets: 3, reps: '10-12', restSeconds: 120 },
            { exerciseId: 'romanian_deadlift', sets: 3, reps: '10-12', restSeconds: 120 },
            { exerciseId: 'leg_curl', sets: 3, reps: '10-12', restSeconds: 60 },
            { exerciseId: 'calf_raise', sets: 4, reps: '12-15', restSeconds: 60 },
          ],
        },
        {
          day: 4,
          name: 'Push B',
          focus: 'shoulders',
          exercises: [
            { exerciseId: 'overhead_press', sets: 4, reps: '6-8', restSeconds: 180 },
            { exerciseId: 'incline_bench_press', sets: 3, reps: '8-10', restSeconds: 120 },
            { exerciseId: 'dumbbell_bench_press', sets: 3, reps: '10-12', restSeconds: 120 },
            { exerciseId: 'cable_fly', sets: 3, reps: '12-15', restSeconds: 60 },
            { exerciseId: 'lateral_raise', sets: 4, reps: '12-15', restSeconds: 60 },
            { exerciseId: 'tricep_dip', sets: 3, reps: '8-12', restSeconds: 90 },
          ],
        },
        {
          day: 5,
          name: 'Pull B',
          focus: 'back_width',
          exercises: [
            { exerciseId: 'weighted_pullup', sets: 4, reps: '6-8', restSeconds: 180 },
            { exerciseId: 'cable_row', sets: 3, reps: '10-12', restSeconds: 120 },
            { exerciseId: 'lat_pulldown', sets: 3, reps: '10-12', restSeconds: 120 },
            { exerciseId: 'reverse_fly', sets: 3, reps: '12-15', restSeconds: 60 },
            { exerciseId: 'incline_curl', sets: 3, reps: '10-12', restSeconds: 60 },
            { exerciseId: 'preacher_curl', sets: 3, reps: '10-12', restSeconds: 60 },
          ],
        },
        {
          day: 6,
          name: 'Legs B',
          focus: 'hamstrings',
          exercises: [
            { exerciseId: 'romanian_deadlift', sets: 4, reps: '8-10', restSeconds: 180 },
            { exerciseId: 'front_squat', sets: 3, reps: '8-10', restSeconds: 120 },
            { exerciseId: 'leg_curl', sets: 4, reps: '10-12', restSeconds: 90 },
            { exerciseId: 'leg_extension', sets: 3, reps: '12-15', restSeconds: 60 },
            { exerciseId: 'walking_lunge', sets: 3, reps: '12 each', restSeconds: 90 },
            { exerciseId: 'seated_calf_raise', sets: 4, reps: '15-20', restSeconds: 60 },
          ],
        },
      ]),
      progression_rules: JSON.stringify({
        type: 'double_progression',
        rep_range_low: 6,
        rep_range_high: 12,
        weight_increment_upper: 2.5,
        weight_increment_lower: 5,
        deload_week: 4,
        deload_percentage: 0.6,
      }),
      is_official: true,
      is_public: true,
    },
    {
      id: 'prog_stronglifts_5x5',
      name: 'StrongLifts 5x5',
      description: `StrongLifts 5x5 is the simplest, most effective workout for beginners to get stronger—fast. The program focuses on just 5 compound exercises, performed 3 days per week with 5 sets of 5 reps.

You alternate between two workouts (A and B), adding 5 lbs to the bar each workout. This linear progression lets beginners add up to 200 lbs to their squat in the first year.

Key principles:
- Squat every workout
- Start light to master form
- Add weight every session
- Rest 3-5 minutes between sets
- Focus on compound movements

This program is ideal for complete beginners or those returning to lifting after a break.`,
      short_description: 'Simple but effective 3-day beginner program focusing on the big 5 compound lifts.',
      duration_weeks: 12,
      days_per_week: 3,
      difficulty: 'beginner',
      category: 'strength',
      goals: JSON.stringify(['strength', 'muscle_gain']),
      equipment_required: JSON.stringify(['barbell', 'squat_rack', 'bench']),
      schedule: JSON.stringify([
        {
          day: 1,
          name: 'Workout A',
          focus: 'squat',
          exercises: [
            { exerciseId: 'squat', sets: 5, reps: '5', restSeconds: 180 },
            { exerciseId: 'bench_press', sets: 5, reps: '5', restSeconds: 180 },
            { exerciseId: 'barbell_row', sets: 5, reps: '5', restSeconds: 180 },
          ],
        },
        {
          day: 2,
          name: 'Workout B',
          focus: 'squat',
          exercises: [
            { exerciseId: 'squat', sets: 5, reps: '5', restSeconds: 180 },
            { exerciseId: 'overhead_press', sets: 5, reps: '5', restSeconds: 180 },
            { exerciseId: 'deadlift', sets: 1, reps: '5', restSeconds: 180 },
          ],
        },
      ]),
      progression_rules: JSON.stringify({
        type: 'linear',
        weight_increment: 5,
        starting_weights: {
          squat: 45,
          bench_press: 45,
          barbell_row: 65,
          overhead_press: 45,
          deadlift: 95,
        },
        failure_protocol: 'deload_10_percent_after_3_failures',
      }),
      is_official: true,
      is_public: true,
    },
    {
      id: 'prog_upper_lower',
      name: 'Upper/Lower Split',
      description: `The Upper/Lower split divides your training into upper body and lower body days, typically performed 4 times per week. This balanced approach provides optimal frequency for muscle growth while allowing adequate recovery.

Each muscle group is trained twice per week with different rep ranges—one heavy day and one lighter day. This combination maximizes both strength and hypertrophy gains.

Benefits of Upper/Lower:
- Simple to follow and program
- Great balance of volume and recovery
- Flexible scheduling
- Suitable for intermediates
- Good strength and size gains

This program works for most lifters with at least 6 months of training experience.`,
      short_description: 'Balanced 4-day split training upper and lower body twice per week.',
      duration_weeks: 8,
      days_per_week: 4,
      difficulty: 'intermediate',
      category: 'powerbuilding',
      goals: JSON.stringify(['muscle_gain', 'strength']),
      equipment_required: JSON.stringify(['barbell', 'dumbbells', 'cable_machine', 'pullup_bar']),
      schedule: JSON.stringify([
        {
          day: 1,
          name: 'Upper A (Strength)',
          focus: 'upper_strength',
          exercises: [
            { exerciseId: 'bench_press', sets: 4, reps: '5', restSeconds: 180 },
            { exerciseId: 'barbell_row', sets: 4, reps: '5', restSeconds: 180 },
            { exerciseId: 'overhead_press', sets: 3, reps: '6-8', restSeconds: 120 },
            { exerciseId: 'pullup', sets: 3, reps: '6-8', restSeconds: 120 },
            { exerciseId: 'barbell_curl', sets: 2, reps: '8-10', restSeconds: 60 },
            { exerciseId: 'tricep_pushdown', sets: 2, reps: '8-10', restSeconds: 60 },
          ],
        },
        {
          day: 2,
          name: 'Lower A (Strength)',
          focus: 'lower_strength',
          exercises: [
            { exerciseId: 'squat', sets: 4, reps: '5', restSeconds: 180 },
            { exerciseId: 'romanian_deadlift', sets: 3, reps: '6-8', restSeconds: 150 },
            { exerciseId: 'leg_press', sets: 3, reps: '8-10', restSeconds: 120 },
            { exerciseId: 'leg_curl', sets: 3, reps: '8-10', restSeconds: 90 },
            { exerciseId: 'calf_raise', sets: 4, reps: '10-12', restSeconds: 60 },
          ],
        },
        {
          day: 3,
          name: 'Upper B (Hypertrophy)',
          focus: 'upper_hypertrophy',
          exercises: [
            { exerciseId: 'incline_dumbbell_press', sets: 3, reps: '10-12', restSeconds: 90 },
            { exerciseId: 'cable_row', sets: 3, reps: '10-12', restSeconds: 90 },
            { exerciseId: 'dumbbell_shoulder_press', sets: 3, reps: '10-12', restSeconds: 90 },
            { exerciseId: 'lat_pulldown', sets: 3, reps: '10-12', restSeconds: 90 },
            { exerciseId: 'lateral_raise', sets: 3, reps: '12-15', restSeconds: 60 },
            { exerciseId: 'face_pull', sets: 3, reps: '15-20', restSeconds: 60 },
            { exerciseId: 'incline_curl', sets: 2, reps: '12-15', restSeconds: 60 },
            { exerciseId: 'overhead_tricep_extension', sets: 2, reps: '12-15', restSeconds: 60 },
          ],
        },
        {
          day: 4,
          name: 'Lower B (Hypertrophy)',
          focus: 'lower_hypertrophy',
          exercises: [
            { exerciseId: 'leg_press', sets: 4, reps: '10-12', restSeconds: 90 },
            { exerciseId: 'dumbbell_romanian_deadlift', sets: 3, reps: '10-12', restSeconds: 90 },
            { exerciseId: 'leg_extension', sets: 3, reps: '12-15', restSeconds: 60 },
            { exerciseId: 'leg_curl', sets: 3, reps: '12-15', restSeconds: 60 },
            { exerciseId: 'walking_lunge', sets: 2, reps: '12 each', restSeconds: 90 },
            { exerciseId: 'seated_calf_raise', sets: 4, reps: '15-20', restSeconds: 60 },
          ],
        },
      ]),
      progression_rules: JSON.stringify({
        type: 'undulating',
        strength_days: {
          rep_target: 5,
          weight_increment: 5,
        },
        hypertrophy_days: {
          rep_target: 12,
          weight_increment: 2.5,
        },
        deload_week: 5,
      }),
      is_official: true,
      is_public: true,
    },
    {
      id: 'prog_phul',
      name: 'PHUL (Power Hypertrophy Upper Lower)',
      description: `PHUL combines the best of powerlifting and bodybuilding into one comprehensive 4-day program. Created by Brandon Campbell, this program dedicates two days to heavy power work and two days to hypertrophy-focused training.

Program structure:
- Day 1: Upper Power (heavy compounds)
- Day 2: Lower Power (heavy compounds)
- Day 3: Rest
- Day 4: Upper Hypertrophy (moderate weight, higher reps)
- Day 5: Lower Hypertrophy (moderate weight, higher reps)

This dual approach builds both strength AND size, making it ideal for intermediate lifters who want to get stronger while also improving their physique.`,
      short_description: 'Combines powerlifting and bodybuilding in a 4-day program for strength and size.',
      duration_weeks: 12,
      days_per_week: 4,
      difficulty: 'intermediate',
      category: 'powerbuilding',
      goals: JSON.stringify(['strength', 'muscle_gain']),
      equipment_required: JSON.stringify(['barbell', 'dumbbells', 'cable_machine', 'pullup_bar', 'squat_rack']),
      schedule: JSON.stringify([
        {
          day: 1,
          name: 'Upper Power',
          focus: 'upper_strength',
          exercises: [
            { exerciseId: 'bench_press', sets: 4, reps: '3-5', restSeconds: 180 },
            { exerciseId: 'incline_dumbbell_press', sets: 4, reps: '6-10', restSeconds: 120 },
            { exerciseId: 'barbell_row', sets: 4, reps: '3-5', restSeconds: 180 },
            { exerciseId: 'lat_pulldown', sets: 4, reps: '6-10', restSeconds: 120 },
            { exerciseId: 'overhead_press', sets: 3, reps: '5-8', restSeconds: 150 },
            { exerciseId: 'barbell_curl', sets: 3, reps: '6-10', restSeconds: 90 },
            { exerciseId: 'skullcrusher', sets: 3, reps: '6-10', restSeconds: 90 },
          ],
        },
        {
          day: 2,
          name: 'Lower Power',
          focus: 'lower_strength',
          exercises: [
            { exerciseId: 'squat', sets: 4, reps: '3-5', restSeconds: 180 },
            { exerciseId: 'deadlift', sets: 3, reps: '3-5', restSeconds: 180 },
            { exerciseId: 'leg_press', sets: 4, reps: '10-15', restSeconds: 120 },
            { exerciseId: 'leg_curl', sets: 4, reps: '6-10', restSeconds: 90 },
            { exerciseId: 'calf_raise', sets: 4, reps: '6-10', restSeconds: 60 },
          ],
        },
        {
          day: 3,
          name: 'Upper Hypertrophy',
          focus: 'upper_hypertrophy',
          exercises: [
            { exerciseId: 'incline_bench_press', sets: 4, reps: '8-12', restSeconds: 90 },
            { exerciseId: 'cable_fly', sets: 4, reps: '8-12', restSeconds: 60 },
            { exerciseId: 'cable_row', sets: 4, reps: '8-12', restSeconds: 90 },
            { exerciseId: 'dumbbell_row', sets: 4, reps: '8-12', restSeconds: 90 },
            { exerciseId: 'lateral_raise', sets: 4, reps: '8-12', restSeconds: 60 },
            { exerciseId: 'incline_curl', sets: 4, reps: '8-12', restSeconds: 60 },
            { exerciseId: 'tricep_pushdown', sets: 4, reps: '8-12', restSeconds: 60 },
          ],
        },
        {
          day: 4,
          name: 'Lower Hypertrophy',
          focus: 'lower_hypertrophy',
          exercises: [
            { exerciseId: 'front_squat', sets: 4, reps: '8-12', restSeconds: 120 },
            { exerciseId: 'dumbbell_lunge', sets: 4, reps: '8-12', restSeconds: 90 },
            { exerciseId: 'leg_extension', sets: 4, reps: '10-15', restSeconds: 60 },
            { exerciseId: 'leg_curl', sets: 4, reps: '10-15', restSeconds: 60 },
            { exerciseId: 'seated_calf_raise', sets: 4, reps: '8-12', restSeconds: 60 },
            { exerciseId: 'calf_raise', sets: 4, reps: '8-12', restSeconds: 60 },
          ],
        },
      ]),
      progression_rules: JSON.stringify({
        type: 'power_hypertrophy',
        power_progression: {
          add_weight_when: 'all_reps_completed',
          weight_increment: 5,
          failure_protocol: 'reduce_weight_10_percent',
        },
        hypertrophy_progression: {
          add_weight_when: 'top_of_rep_range_completed',
          weight_increment: 2.5,
        },
      }),
      is_official: true,
      is_public: true,
    },
  ];

  for (const program of programs) {
    await db.query(
      `INSERT INTO training_programs (
        id, name, description, short_description, duration_weeks, days_per_week,
        schedule, progression_rules, difficulty, category, goals,
        equipment_required, is_official, is_public
      )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
       ON CONFLICT (id) DO UPDATE SET
         name = EXCLUDED.name,
         description = EXCLUDED.description,
         short_description = EXCLUDED.short_description,
         schedule = EXCLUDED.schedule,
         progression_rules = EXCLUDED.progression_rules,
         updated_at = NOW()`,
      [
        program.id,
        program.name,
        program.description,
        program.short_description,
        program.duration_weeks,
        program.days_per_week,
        program.schedule,
        program.progression_rules,
        program.difficulty,
        program.category,
        program.goals,
        program.equipment_required,
        program.is_official,
        program.is_public,
      ]
    );
  }

  log.info(`Seeded ${programs.length} official training programs`);

  log.info('Migration 093_training_programs completed');
}

export async function down(): Promise<void> {
  log.info('Rolling back migration: 093_training_programs');

  await db.query('DROP TABLE IF EXISTS program_ratings CASCADE');
  await db.query('DROP TABLE IF EXISTS program_enrollments CASCADE');
  await db.query('DROP TABLE IF EXISTS training_programs CASCADE');

  await db.query('DROP FUNCTION IF EXISTS update_program_timestamp()');
  await db.query('DROP TRIGGER IF EXISTS trg_program_updated ON training_programs');
  await db.query('DROP TRIGGER IF EXISTS trg_enrollment_updated ON program_enrollments');

  log.info('Rollback 093_training_programs completed');
}
