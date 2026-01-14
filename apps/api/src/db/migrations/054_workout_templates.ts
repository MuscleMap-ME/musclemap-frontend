/**
 * Migration: Workout Templates System
 *
 * Adds workout templates for saving and sharing workout routines:
 * - Template definitions with exercise structures
 * - Template sharing and discovery
 * - Template ratings and usage tracking
 * - Template cloning/forking
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
  log.info('Running migration: 054_workout_templates');

  // ============================================
  // WORKOUT TEMPLATES TABLE
  // ============================================
  if (!(await tableExists('workout_templates'))) {
    log.info('Creating workout_templates table...');
    await db.query(`
      CREATE TABLE workout_templates (
        id TEXT PRIMARY KEY DEFAULT 'wt_' || replace(gen_random_uuid()::text, '-', ''),
        creator_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,

        -- Basic info
        name TEXT NOT NULL,
        description TEXT,

        -- Template structure (array of exercises with sets/reps/etc)
        exercises JSONB NOT NULL DEFAULT '[]',

        -- Metadata
        difficulty TEXT CHECK (difficulty IN ('beginner', 'intermediate', 'advanced', 'elite')),
        duration_minutes INTEGER, -- Estimated workout duration
        target_muscles JSONB DEFAULT '[]', -- Array of primary muscle groups targeted
        equipment_required JSONB DEFAULT '[]', -- Equipment needed for the template

        -- Categorization
        category TEXT, -- strength, hypertrophy, endurance, cardio, mobility, full_body
        tags JSONB DEFAULT '[]', -- Custom user tags

        -- Sharing and visibility
        is_public BOOLEAN DEFAULT FALSE,
        is_featured BOOLEAN DEFAULT FALSE, -- Staff-picked templates

        -- Forking/versioning
        forked_from_id TEXT REFERENCES workout_templates(id) ON DELETE SET NULL,
        version INTEGER DEFAULT 1,

        -- Stats (denormalized for performance)
        times_used INTEGER DEFAULT 0,
        times_cloned INTEGER DEFAULT 0,
        rating_sum INTEGER DEFAULT 0,
        rating_count INTEGER DEFAULT 0,

        -- Timestamps
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    // Indexes
    await db.query('CREATE INDEX idx_templates_creator ON workout_templates(creator_id)');
    await db.query('CREATE INDEX idx_templates_public ON workout_templates(is_public, created_at DESC) WHERE is_public = TRUE');
    await db.query('CREATE INDEX idx_templates_featured ON workout_templates(is_featured) WHERE is_featured = TRUE');
    await db.query('CREATE INDEX idx_templates_category ON workout_templates(category) WHERE is_public = TRUE');
    await db.query('CREATE INDEX idx_templates_difficulty ON workout_templates(difficulty) WHERE is_public = TRUE');
    await db.query('CREATE INDEX idx_templates_popular ON workout_templates(times_used DESC) WHERE is_public = TRUE');
    await db.query('CREATE INDEX idx_templates_rating ON workout_templates((rating_sum::float / NULLIF(rating_count, 0)) DESC) WHERE is_public = TRUE AND rating_count > 0');

    // Trigger for updated_at
    await db.query(`
      CREATE OR REPLACE FUNCTION update_template_timestamp()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = NOW();
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql
    `);

    await db.query(`
      CREATE TRIGGER trg_template_updated
      BEFORE UPDATE ON workout_templates
      FOR EACH ROW EXECUTE FUNCTION update_template_timestamp()
    `);

    log.info('workout_templates table created');
  }

  // ============================================
  // TEMPLATE RATINGS TABLE
  // ============================================
  if (!(await tableExists('template_ratings'))) {
    log.info('Creating template_ratings table...');
    await db.query(`
      CREATE TABLE template_ratings (
        id TEXT PRIMARY KEY DEFAULT 'tr_' || replace(gen_random_uuid()::text, '-', ''),
        template_id TEXT NOT NULL REFERENCES workout_templates(id) ON DELETE CASCADE,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,

        -- Rating (1-5 stars)
        rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),

        -- Optional review
        review TEXT,

        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),

        CONSTRAINT unique_user_template_rating UNIQUE (template_id, user_id)
      )
    `);

    await db.query('CREATE INDEX idx_ratings_template ON template_ratings(template_id)');
    await db.query('CREATE INDEX idx_ratings_user ON template_ratings(user_id)');

    log.info('template_ratings table created');
  }

  // ============================================
  // TEMPLATE USAGE TRACKING TABLE
  // ============================================
  if (!(await tableExists('template_usage'))) {
    log.info('Creating template_usage table...');
    await db.query(`
      CREATE TABLE template_usage (
        id TEXT PRIMARY KEY DEFAULT 'tu_' || replace(gen_random_uuid()::text, '-', ''),
        template_id TEXT NOT NULL REFERENCES workout_templates(id) ON DELETE CASCADE,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        workout_id TEXT REFERENCES workouts(id) ON DELETE SET NULL,

        -- Track usage type
        usage_type TEXT DEFAULT 'logged' CHECK (usage_type IN ('logged', 'cloned', 'viewed')),

        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    await db.query('CREATE INDEX idx_usage_template ON template_usage(template_id)');
    await db.query('CREATE INDEX idx_usage_user ON template_usage(user_id)');
    await db.query('CREATE INDEX idx_usage_date ON template_usage(created_at DESC)');

    log.info('template_usage table created');
  }

  // ============================================
  // USER SAVED TEMPLATES TABLE (Bookmarks)
  // ============================================
  if (!(await tableExists('user_saved_templates'))) {
    log.info('Creating user_saved_templates table...');
    await db.query(`
      CREATE TABLE user_saved_templates (
        id TEXT PRIMARY KEY DEFAULT 'ust_' || replace(gen_random_uuid()::text, '-', ''),
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        template_id TEXT NOT NULL REFERENCES workout_templates(id) ON DELETE CASCADE,

        -- Optional organization
        folder TEXT DEFAULT 'default',
        notes TEXT,

        created_at TIMESTAMPTZ DEFAULT NOW(),

        CONSTRAINT unique_user_saved_template UNIQUE (user_id, template_id)
      )
    `);

    await db.query('CREATE INDEX idx_saved_user ON user_saved_templates(user_id)');
    await db.query('CREATE INDEX idx_saved_template ON user_saved_templates(template_id)');
    await db.query('CREATE INDEX idx_saved_folder ON user_saved_templates(user_id, folder)');

    log.info('user_saved_templates table created');
  }

  log.info('Migration 054_workout_templates completed');
}

export async function down(): Promise<void> {
  log.info('Rolling back migration: 054_workout_templates');

  await db.query('DROP TABLE IF EXISTS user_saved_templates CASCADE');
  await db.query('DROP TABLE IF EXISTS template_usage CASCADE');
  await db.query('DROP TABLE IF EXISTS template_ratings CASCADE');
  await db.query('DROP TABLE IF EXISTS workout_templates CASCADE');

  await db.query('DROP FUNCTION IF EXISTS update_template_timestamp()');
  await db.query('DROP TRIGGER IF EXISTS trg_template_updated ON workout_templates');

  log.info('Rollback 054_workout_templates completed');
}
