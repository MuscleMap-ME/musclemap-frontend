/**
 * Migration 137: Exercise Image Contributions
 *
 * Creates a system for users to submit exercise photos:
 * - Track submissions with AI validation scores
 * - Support approval workflow with credits
 * - Allow community images to replace wger.de images
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

async function tableExists(tableName: string): Promise<boolean> {
  const result = await db.queryOne<{ count: string }>(
    `SELECT COUNT(*) as count FROM information_schema.tables
     WHERE table_schema = 'public' AND table_name = $1`,
    [tableName]
  );
  return parseInt(result?.count || '0') > 0;
}

export async function up(): Promise<void> {
  log.info('Running migration 137: Exercise Image Contributions');

  // ============================================
  // 1. Exercise Image Submissions Table
  // ============================================
  if (!(await tableExists('exercise_image_submissions'))) {
    await db.query(`
      CREATE TABLE exercise_image_submissions (
        id TEXT PRIMARY KEY DEFAULT 'eximg_' || replace(gen_random_uuid()::text, '-', ''),
        exercise_id TEXT NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,

        -- Image URLs
        original_url TEXT NOT NULL,
        processed_url TEXT,
        thumbnail_url TEXT,

        -- AI Validation results
        nsfw_score DECIMAL(4,3),
        exercise_match_score DECIMAL(4,3),
        ai_validation_passed BOOLEAN DEFAULT false,
        ai_validation_notes TEXT,

        -- Review workflow
        status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
        reviewed_by TEXT REFERENCES users(id) ON DELETE SET NULL,
        reviewed_at TIMESTAMP WITH TIME ZONE,
        rejection_reason TEXT,

        -- Credits
        credits_awarded INTEGER DEFAULT 0,
        credits_awarded_at TIMESTAMP WITH TIME ZONE,

        -- Timestamps
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);

    // Indexes for common queries
    await db.query(`CREATE INDEX idx_exercise_image_submissions_exercise ON exercise_image_submissions(exercise_id)`);
    await db.query(`CREATE INDEX idx_exercise_image_submissions_user ON exercise_image_submissions(user_id)`);
    await db.query(`CREATE INDEX idx_exercise_image_submissions_status ON exercise_image_submissions(status)`);
    await db.query(`CREATE INDEX idx_exercise_image_submissions_pending ON exercise_image_submissions(status, created_at) WHERE status = 'pending'`);

    log.info('Created exercise_image_submissions table');
  }

  // ============================================
  // 2. Add community image columns to exercises
  // ============================================
  if (!(await columnExists('exercises', 'community_image_id'))) {
    await db.query(`ALTER TABLE exercises ADD COLUMN community_image_id TEXT`);
    log.info('Added community_image_id column to exercises');
  }

  if (!(await columnExists('exercises', 'image_source'))) {
    await db.query(`ALTER TABLE exercises ADD COLUMN image_source TEXT DEFAULT 'wger'`);
    log.info('Added image_source column to exercises');
  }

  // Add foreign key constraint for community_image_id
  await db.query(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'fk_exercises_community_image'
      ) THEN
        ALTER TABLE exercises
        ADD CONSTRAINT fk_exercises_community_image
        FOREIGN KEY (community_image_id)
        REFERENCES exercise_image_submissions(id)
        ON DELETE SET NULL;
      END IF;
    END $$
  `);

  // ============================================
  // 3. User contribution stats view
  // ============================================
  await db.query(`
    CREATE OR REPLACE VIEW user_image_contribution_stats AS
    SELECT
      user_id,
      COUNT(*) FILTER (WHERE status = 'pending') as pending_count,
      COUNT(*) FILTER (WHERE status = 'approved') as approved_count,
      COUNT(*) FILTER (WHERE status = 'rejected') as rejected_count,
      COALESCE(SUM(credits_awarded), 0) as total_credits_earned,
      MAX(created_at) as last_submission_at
    FROM exercise_image_submissions
    GROUP BY user_id
  `);

  // ============================================
  // 4. Update trigger for updated_at
  // ============================================
  await db.query(`
    CREATE OR REPLACE FUNCTION update_exercise_image_submissions_updated_at()
    RETURNS TRIGGER AS $$
    BEGIN
      NEW.updated_at = NOW();
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql
  `);

  await db.query(`
    DROP TRIGGER IF EXISTS trigger_exercise_image_submissions_updated_at ON exercise_image_submissions;
    CREATE TRIGGER trigger_exercise_image_submissions_updated_at
      BEFORE UPDATE ON exercise_image_submissions
      FOR EACH ROW
      EXECUTE FUNCTION update_exercise_image_submissions_updated_at()
  `);

  // ============================================
  // 5. Add earning rule for exercise image contributions
  // ============================================
  await db.query(`
    INSERT INTO earning_rules (code, name, description, category, credits_base, xp_base, max_per_day, enabled)
    VALUES (
      'exercise_image_approved',
      'Exercise Image Contribution',
      'Earn credits when your submitted exercise image is approved',
      'special',
      25,
      50,
      4,
      TRUE
    )
    ON CONFLICT (code) DO NOTHING
  `);

  // Add bonus rule for first image on an exercise
  await db.query(`
    INSERT INTO earning_rules (code, name, description, category, credits_base, xp_base, max_per_day, enabled)
    VALUES (
      'exercise_image_first',
      'First Exercise Image Bonus',
      'Bonus for being the first to add an image to an exercise',
      'special',
      10,
      25,
      10,
      TRUE
    )
    ON CONFLICT (code) DO NOTHING
  `);

  log.info('Migration 137 complete: Exercise Image Contributions created');
}

export async function down(): Promise<void> {
  log.info('Rolling back migration 137: Exercise Image Contributions');

  // Drop trigger
  await db.query(`DROP TRIGGER IF EXISTS trigger_exercise_image_submissions_updated_at ON exercise_image_submissions`);
  await db.query(`DROP FUNCTION IF EXISTS update_exercise_image_submissions_updated_at()`);

  // Drop view
  await db.query(`DROP VIEW IF EXISTS user_image_contribution_stats`);

  // Remove columns from exercises (in reverse order of FK)
  await db.query(`ALTER TABLE exercises DROP CONSTRAINT IF EXISTS fk_exercises_community_image`);

  if (await columnExists('exercises', 'community_image_id')) {
    await db.query(`ALTER TABLE exercises DROP COLUMN community_image_id`);
  }
  if (await columnExists('exercises', 'image_source')) {
    await db.query(`ALTER TABLE exercises DROP COLUMN image_source`);
  }

  // Drop main table
  await db.query(`DROP TABLE IF EXISTS exercise_image_submissions CASCADE`);

  log.info('Migration 137 rolled back');
}
