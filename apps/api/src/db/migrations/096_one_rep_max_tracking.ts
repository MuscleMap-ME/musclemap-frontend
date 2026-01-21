// DESTRUCTIVE: Schema modification for one rep max tracking - contains DROP/TRUNCATE operations
/**
 * Migration 096: One Rep Max (1RM) Tracking System
 *
 * Adds comprehensive 1RM tracking features:
 * - Exercise 1RM history table for tracking progression over time
 * - Best 1RM fields in exercise_personal_records
 * - 1RM-based achievements (1000lb Club, etc.)
 * - Compound lift total tracking (Squat + Bench + Deadlift)
 * - Views for 1RM progression charts
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

export async function up(): Promise<void> {
  log.info('Running migration: 096_one_rep_max_tracking');

  // ============================================
  // EXERCISE 1RM HISTORY TABLE
  // ============================================
  if (!(await tableExists('exercise_1rm_history'))) {
    log.info('Creating exercise_1rm_history table...');
    await db.query(`
      CREATE TABLE exercise_1rm_history (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        exercise_id TEXT NOT NULL,

        -- 1RM values
        estimated_1rm DECIMAL(10, 2) NOT NULL,
        actual_1rm DECIMAL(10, 2), -- If user tested actual 1RM

        -- Source set info
        source_weight DECIMAL(10, 2) NOT NULL,
        source_reps INTEGER NOT NULL,
        source_rpe INTEGER,
        formula_used TEXT DEFAULT 'epley' CHECK (formula_used IN ('epley', 'brzycki', 'lombardi', 'oconner', 'actual')),

        -- Context
        workout_id TEXT REFERENCES workouts(id) ON DELETE SET NULL,
        set_id UUID,
        is_pr BOOLEAN DEFAULT FALSE,

        -- Metadata
        bodyweight_kg DECIMAL(5, 2),
        relative_strength DECIMAL(4, 2), -- 1RM / bodyweight

        recorded_at TIMESTAMPTZ DEFAULT NOW(),
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    // Indexes for common queries
    if (!(await indexExists('idx_1rm_history_user_exercise_time'))) {
      await db.query(`CREATE INDEX idx_1rm_history_user_exercise_time ON exercise_1rm_history(user_id, exercise_id, recorded_at DESC)`);
    }
    if (!(await indexExists('idx_1rm_history_user_time'))) {
      await db.query(`CREATE INDEX idx_1rm_history_user_time ON exercise_1rm_history(user_id, recorded_at DESC)`);
    }
    if (!(await indexExists('idx_1rm_history_pr'))) {
      await db.query(`CREATE INDEX idx_1rm_history_pr ON exercise_1rm_history(user_id, exercise_id, is_pr) WHERE is_pr = TRUE`);
    }
    if (!(await indexExists('idx_1rm_history_exercise_keyset'))) {
      await db.query(`CREATE INDEX idx_1rm_history_exercise_keyset ON exercise_1rm_history(user_id, exercise_id, recorded_at DESC, id DESC)`);
    }

    log.info('exercise_1rm_history table created');
  }

  // ============================================
  // USER COMPOUND TOTALS TABLE (Squat + Bench + Deadlift)
  // ============================================
  if (!(await tableExists('user_compound_totals'))) {
    log.info('Creating user_compound_totals table...');
    await db.query(`
      CREATE TABLE user_compound_totals (
        user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,

        -- Best 1RMs for the big three
        best_squat_1rm DECIMAL(10, 2),
        best_bench_1rm DECIMAL(10, 2),
        best_deadlift_1rm DECIMAL(10, 2),

        -- Compound total
        powerlifting_total DECIMAL(10, 2) GENERATED ALWAYS AS (
          COALESCE(best_squat_1rm, 0) + COALESCE(best_bench_1rm, 0) + COALESCE(best_deadlift_1rm, 0)
        ) STORED,

        -- Timestamps for each PR
        squat_pr_date TIMESTAMPTZ,
        bench_pr_date TIMESTAMPTZ,
        deadlift_pr_date TIMESTAMPTZ,

        -- Bodyweight for relative strength
        last_bodyweight_kg DECIMAL(5, 2),
        wilks_score DECIMAL(6, 2), -- Calculated Wilks score
        dots_score DECIMAL(6, 2), -- DOTS score (newer formula)

        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    if (!(await indexExists('idx_compound_totals_powerlifting'))) {
      await db.query(`CREATE INDEX idx_compound_totals_powerlifting ON user_compound_totals(powerlifting_total DESC)`);
    }

    log.info('user_compound_totals table created');
  }

  // ============================================
  // ADD BEST_1RM TO EXERCISE_PERSONAL_RECORDS
  // ============================================
  if (await tableExists('exercise_personal_records')) {
    if (!(await columnExists('exercise_personal_records', 'best_estimated_1rm'))) {
      log.info('Adding best_estimated_1rm column to exercise_personal_records...');
      await db.query(`ALTER TABLE exercise_personal_records ADD COLUMN best_estimated_1rm DECIMAL(10, 2)`);
    }
    if (!(await columnExists('exercise_personal_records', 'best_1rm_date'))) {
      await db.query(`ALTER TABLE exercise_personal_records ADD COLUMN best_1rm_date TIMESTAMPTZ`);
    }
    if (!(await columnExists('exercise_personal_records', 'best_1rm_source_weight'))) {
      await db.query(`ALTER TABLE exercise_personal_records ADD COLUMN best_1rm_source_weight DECIMAL(10, 2)`);
    }
    if (!(await columnExists('exercise_personal_records', 'best_1rm_source_reps'))) {
      await db.query(`ALTER TABLE exercise_personal_records ADD COLUMN best_1rm_source_reps INTEGER`);
    }
  }

  // ============================================
  // 1RM-BASED ACHIEVEMENT DEFINITIONS
  // ============================================
  log.info('Adding 1RM-based achievement definitions...');
  const achievements = [
    // Powerlifting total achievements (in lbs)
    { key: 'powerlifting_total_500', name: '500 Club', description: 'Combined squat, bench, and deadlift 1RM totals 500+ lbs', category: 'milestone', points: 100, rarity: 'common', icon: 'trophy' },
    { key: 'powerlifting_total_1000', name: '1000 Pound Club', description: 'Combined squat, bench, and deadlift 1RM totals 1000+ lbs', category: 'milestone', points: 500, rarity: 'rare', icon: 'trophy_gold' },
    { key: 'powerlifting_total_1200', name: '1200 Pound Club', description: 'Combined squat, bench, and deadlift 1RM totals 1200+ lbs', category: 'milestone', points: 750, rarity: 'epic', icon: 'trophy_diamond' },
    { key: 'powerlifting_total_1500', name: '1500 Pound Club', description: 'Combined squat, bench, and deadlift 1RM totals 1500+ lbs', category: 'milestone', points: 1000, rarity: 'legendary', icon: 'crown' },

    // Individual lift achievements
    { key: 'bench_225', name: 'Two Plates Bench', description: 'Bench press 1RM of 225+ lbs (2 plates)', category: 'milestone', points: 200, rarity: 'uncommon', icon: 'barbell' },
    { key: 'bench_315', name: 'Three Plates Bench', description: 'Bench press 1RM of 315+ lbs (3 plates)', category: 'milestone', points: 400, rarity: 'rare', icon: 'barbell_gold' },
    { key: 'bench_405', name: 'Four Plates Bench', description: 'Bench press 1RM of 405+ lbs (4 plates)', category: 'milestone', points: 800, rarity: 'legendary', icon: 'fire' },

    { key: 'squat_225', name: 'Two Plates Squat', description: 'Squat 1RM of 225+ lbs (2 plates)', category: 'milestone', points: 150, rarity: 'common', icon: 'leg' },
    { key: 'squat_315', name: 'Three Plates Squat', description: 'Squat 1RM of 315+ lbs (3 plates)', category: 'milestone', points: 300, rarity: 'uncommon', icon: 'leg_gold' },
    { key: 'squat_405', name: 'Four Plates Squat', description: 'Squat 1RM of 405+ lbs (4 plates)', category: 'milestone', points: 500, rarity: 'rare', icon: 'muscle' },
    { key: 'squat_495', name: 'Five Plates Squat', description: 'Squat 1RM of 495+ lbs (5 plates)', category: 'milestone', points: 750, rarity: 'epic', icon: 'muscle_gold' },

    { key: 'deadlift_315', name: 'Three Plates Deadlift', description: 'Deadlift 1RM of 315+ lbs (3 plates)', category: 'milestone', points: 200, rarity: 'common', icon: 'lightning' },
    { key: 'deadlift_405', name: 'Four Plates Deadlift', description: 'Deadlift 1RM of 405+ lbs (4 plates)', category: 'milestone', points: 350, rarity: 'uncommon', icon: 'lightning_gold' },
    { key: 'deadlift_495', name: 'Five Plates Deadlift', description: 'Deadlift 1RM of 495+ lbs (5 plates)', category: 'milestone', points: 500, rarity: 'rare', icon: 'star' },
    { key: 'deadlift_585', name: 'Six Plates Deadlift', description: 'Deadlift 1RM of 585+ lbs (6 plates)', category: 'milestone', points: 750, rarity: 'epic', icon: 'star_gold' },

    // Relative strength achievements
    { key: 'bodyweight_bench', name: 'Bodyweight Bench', description: 'Bench press your bodyweight for 1RM', category: 'milestone', points: 150, rarity: 'common', icon: 'scale' },
    { key: 'double_bodyweight_squat', name: '2x Bodyweight Squat', description: 'Squat 2x your bodyweight for 1RM', category: 'milestone', points: 400, rarity: 'rare', icon: 'scale_gold' },
    { key: 'double_bodyweight_deadlift', name: '2x Bodyweight Deadlift', description: 'Deadlift 2x your bodyweight for 1RM', category: 'milestone', points: 350, rarity: 'uncommon', icon: 'scale_silver' },
    { key: 'triple_bodyweight_deadlift', name: '3x Bodyweight Deadlift', description: 'Deadlift 3x your bodyweight for 1RM', category: 'milestone', points: 750, rarity: 'legendary', icon: 'crown' },

    // 1RM progression achievements
    { key: 'first_1rm_pr', name: 'First PR', description: 'Set your first estimated 1RM personal record', category: 'first_time', points: 25, rarity: 'common', icon: 'sparkle' },
    { key: '1rm_pr_streak_5', name: 'PR Machine', description: 'Set 5 different exercise 1RM PRs', category: 'milestone', points: 100, rarity: 'uncommon', icon: 'chart_up' },
    { key: '1rm_pr_streak_10', name: 'Unstoppable', description: 'Set 10 different exercise 1RM PRs', category: 'milestone', points: 250, rarity: 'rare', icon: 'rocket' },
    { key: '1rm_improved_10pct', name: '10% Stronger', description: 'Improve your 1RM by 10% on any exercise', category: 'milestone', points: 100, rarity: 'common', icon: 'trending_up' },
    { key: '1rm_improved_25pct', name: '25% Stronger', description: 'Improve your 1RM by 25% on any exercise', category: 'milestone', points: 200, rarity: 'uncommon', icon: 'trending_up_gold' },
    { key: '1rm_improved_50pct', name: 'Transformation', description: 'Improve your 1RM by 50% on any exercise', category: 'milestone', points: 400, rarity: 'rare', icon: 'butterfly' },
  ];

  for (const ach of achievements) {
    await db.query(
      `INSERT INTO achievement_definitions (key, name, description, category, points, rarity, icon)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (key) DO UPDATE SET
         name = EXCLUDED.name,
         description = EXCLUDED.description,
         points = EXCLUDED.points,
         rarity = EXCLUDED.rarity,
         icon = EXCLUDED.icon`,
      [ach.key, ach.name, ach.description, ach.category, ach.points, ach.rarity, ach.icon]
    );
  }

  // ============================================
  // VIEWS FOR 1RM PROGRESSION CHARTS
  // ============================================
  log.info('Creating/updating 1RM views...');

  // Weekly best 1RM per exercise
  await db.query(`
    CREATE OR REPLACE VIEW v_weekly_1rm AS
    SELECT
      user_id,
      exercise_id,
      DATE_TRUNC('week', recorded_at) as week_start,
      MAX(estimated_1rm) as best_1rm,
      MAX(CASE WHEN is_pr THEN estimated_1rm END) as pr_1rm,
      COUNT(*) as entries,
      MAX(bodyweight_kg) as bodyweight
    FROM exercise_1rm_history
    GROUP BY user_id, exercise_id, DATE_TRUNC('week', recorded_at)
    ORDER BY week_start DESC
  `);

  // Monthly best 1RM per exercise
  await db.query(`
    CREATE OR REPLACE VIEW v_monthly_1rm AS
    SELECT
      user_id,
      exercise_id,
      DATE_TRUNC('month', recorded_at) as month_start,
      MAX(estimated_1rm) as best_1rm,
      MAX(CASE WHEN is_pr THEN estimated_1rm END) as pr_1rm,
      COUNT(*) as entries,
      MAX(bodyweight_kg) as bodyweight
    FROM exercise_1rm_history
    GROUP BY user_id, exercise_id, DATE_TRUNC('month', recorded_at)
    ORDER BY month_start DESC
  `);

  // All-time best 1RM per exercise per user
  await db.query(`
    CREATE OR REPLACE VIEW v_best_1rm AS
    SELECT DISTINCT ON (user_id, exercise_id)
      user_id,
      exercise_id,
      estimated_1rm as best_1rm,
      source_weight,
      source_reps,
      bodyweight_kg,
      relative_strength,
      recorded_at
    FROM exercise_1rm_history
    ORDER BY user_id, exercise_id, estimated_1rm DESC
  `);

  // ============================================
  // TRIGGER TO UPDATE COMPOUND TOTALS
  // ============================================
  log.info('Creating compound totals trigger...');
  await db.query(`
    CREATE OR REPLACE FUNCTION update_compound_totals()
    RETURNS TRIGGER AS $$
    DECLARE
      v_squat_id TEXT := 'BB-SQUAT-BACK-SQUAT';
      v_bench_id TEXT := 'BB-PUSH-BENCH-PRESS';
      v_deadlift_id TEXT := 'BB-HINGE-DEADLIFT';
    BEGIN
      -- Only update if this is a PR for one of the big three
      IF NEW.is_pr AND NEW.exercise_id IN (v_squat_id, v_bench_id, v_deadlift_id) THEN
        INSERT INTO user_compound_totals (user_id, last_bodyweight_kg)
        VALUES (NEW.user_id, NEW.bodyweight_kg)
        ON CONFLICT (user_id) DO UPDATE SET
          last_bodyweight_kg = COALESCE(NEW.bodyweight_kg, user_compound_totals.last_bodyweight_kg),
          updated_at = NOW();

        -- Update specific lift
        IF NEW.exercise_id = v_squat_id THEN
          UPDATE user_compound_totals
          SET best_squat_1rm = NEW.estimated_1rm,
              squat_pr_date = NEW.recorded_at
          WHERE user_id = NEW.user_id AND (best_squat_1rm IS NULL OR best_squat_1rm < NEW.estimated_1rm);
        ELSIF NEW.exercise_id = v_bench_id THEN
          UPDATE user_compound_totals
          SET best_bench_1rm = NEW.estimated_1rm,
              bench_pr_date = NEW.recorded_at
          WHERE user_id = NEW.user_id AND (best_bench_1rm IS NULL OR best_bench_1rm < NEW.estimated_1rm);
        ELSIF NEW.exercise_id = v_deadlift_id THEN
          UPDATE user_compound_totals
          SET best_deadlift_1rm = NEW.estimated_1rm,
              deadlift_pr_date = NEW.recorded_at
          WHERE user_id = NEW.user_id AND (best_deadlift_1rm IS NULL OR best_deadlift_1rm < NEW.estimated_1rm);
        END IF;
      END IF;

      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql
  `);

  // Check if trigger exists before creating
  const triggerExists = await db.queryOne<{ count: string }>(
    `SELECT COUNT(*) as count FROM pg_trigger WHERE tgname = 'trg_update_compound_totals'`
  );

  if (parseInt(triggerExists?.count || '0') === 0) {
    await db.query(`
      CREATE TRIGGER trg_update_compound_totals
      AFTER INSERT ON exercise_1rm_history
      FOR EACH ROW EXECUTE FUNCTION update_compound_totals()
    `);
  }

  log.info('Migration 096_one_rep_max_tracking complete');
}

export async function down(): Promise<void> {
  log.info('Rolling back migration: 096_one_rep_max_tracking');

  // Drop trigger and function
  await db.query('DROP TRIGGER IF EXISTS trg_update_compound_totals ON exercise_1rm_history');
  await db.query('DROP FUNCTION IF EXISTS update_compound_totals CASCADE');

  // Drop views
  await db.query('DROP VIEW IF EXISTS v_best_1rm');
  await db.query('DROP VIEW IF EXISTS v_monthly_1rm');
  await db.query('DROP VIEW IF EXISTS v_weekly_1rm');

  // Drop tables
  await db.query('DROP TABLE IF EXISTS user_compound_totals CASCADE');
  await db.query('DROP TABLE IF EXISTS exercise_1rm_history CASCADE');

  // Remove columns from exercise_personal_records
  if (await columnExists('exercise_personal_records', 'best_estimated_1rm')) {
    await db.query('ALTER TABLE exercise_personal_records DROP COLUMN best_estimated_1rm');
  }
  if (await columnExists('exercise_personal_records', 'best_1rm_date')) {
    await db.query('ALTER TABLE exercise_personal_records DROP COLUMN best_1rm_date');
  }
  if (await columnExists('exercise_personal_records', 'best_1rm_source_weight')) {
    await db.query('ALTER TABLE exercise_personal_records DROP COLUMN best_1rm_source_weight');
  }
  if (await columnExists('exercise_personal_records', 'best_1rm_source_reps')) {
    await db.query('ALTER TABLE exercise_personal_records DROP COLUMN best_1rm_source_reps');
  }

  // Remove achievement definitions (optional - keep achievements if they've been earned)
  const achievementKeys = [
    'powerlifting_total_500', 'powerlifting_total_1000', 'powerlifting_total_1200', 'powerlifting_total_1500',
    'bench_225', 'bench_315', 'bench_405',
    'squat_225', 'squat_315', 'squat_405', 'squat_495',
    'deadlift_315', 'deadlift_405', 'deadlift_495', 'deadlift_585',
    'bodyweight_bench', 'double_bodyweight_squat', 'double_bodyweight_deadlift', 'triple_bodyweight_deadlift',
    'first_1rm_pr', '1rm_pr_streak_5', '1rm_pr_streak_10',
    '1rm_improved_10pct', '1rm_improved_25pct', '1rm_improved_50pct'
  ];

  for (const key of achievementKeys) {
    await db.query('DELETE FROM achievement_definitions WHERE key = $1', [key]);
  }

  log.info('Rollback 096_one_rep_max_tracking complete');
}

export const migrate = up;
