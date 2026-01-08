/**
 * Migration: Taxonomy Rename (Journey System Overhaul - Phase 1)
 *
 * This migration renames the core taxonomy tables:
 * - archetypes → identities
 * - archetype_categories → identity_categories
 * - archetype_levels → identity_levels
 * - archetype_community_links → identity_community_links
 * - user_goals → user_journeys
 * - goal_progress → journey_progress
 * - goal_milestones → journey_milestones
 *
 * Also updates:
 * - users.current_archetype_id → users.current_identity_id
 * - Foreign key references
 * - Creates backward-compatible views for old table names
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

async function viewExists(viewName: string): Promise<boolean> {
  const result = await db.queryOne<{ count: string }>(
    `SELECT COUNT(*) as count FROM information_schema.views
     WHERE table_schema = 'public' AND table_name = $1`,
    [viewName]
  );
  return parseInt(result?.count || '0') > 0;
}

async function constraintExists(tableName: string, constraintName: string): Promise<boolean> {
  const result = await db.queryOne<{ count: string }>(
    `SELECT COUNT(*) as count FROM information_schema.table_constraints
     WHERE table_name = $1 AND constraint_name = $2`,
    [tableName, constraintName]
  );
  return parseInt(result?.count || '0') > 0;
}

export async function up(): Promise<void> {
  log.info('Running migration: 032_taxonomy_rename');

  // ============================================
  // PART 1: RENAME ARCHETYPE TABLES → IDENTITY
  // ============================================

  // 1a. Rename archetype_categories → identity_categories
  if (await tableExists('archetype_categories')) {
    if (!(await tableExists('identity_categories'))) {
      log.info('Renaming archetype_categories → identity_categories...');
      await db.query(`ALTER TABLE archetype_categories RENAME TO identity_categories`);
    }
  }

  // 1b. Rename archetypes → identities
  if (await tableExists('archetypes')) {
    if (!(await tableExists('identities'))) {
      log.info('Renaming archetypes → identities...');
      await db.query(`ALTER TABLE archetypes RENAME TO identities`);

      // Rename the category_id foreign key column reference
      if (await columnExists('identities', 'category_id')) {
        // Drop and recreate foreign key constraint with new table reference
        // First check if the constraint exists
        if (await constraintExists('identities', 'archetypes_category_id_fkey')) {
          await db.query(`ALTER TABLE identities DROP CONSTRAINT archetypes_category_id_fkey`);
          await db.query(`ALTER TABLE identities ADD CONSTRAINT identities_category_id_fkey
            FOREIGN KEY (category_id) REFERENCES identity_categories(id)`);
        }
      }
    }
  }

  // 1c. Rename archetype_levels → identity_levels
  if (await tableExists('archetype_levels')) {
    if (!(await tableExists('identity_levels'))) {
      log.info('Renaming archetype_levels → identity_levels...');
      await db.query(`ALTER TABLE archetype_levels RENAME TO identity_levels`);

      // Rename column archetype_id → identity_id
      if (await columnExists('identity_levels', 'archetype_id')) {
        await db.query(`ALTER TABLE identity_levels RENAME COLUMN archetype_id TO identity_id`);
      }

      // Update unique constraint
      // Check if old constraint exists and rename
      if (await constraintExists('identity_levels', 'archetype_levels_archetype_id_level_key')) {
        await db.query(`ALTER TABLE identity_levels DROP CONSTRAINT archetype_levels_archetype_id_level_key`);
        await db.query(`ALTER TABLE identity_levels ADD CONSTRAINT identity_levels_identity_id_level_key UNIQUE(identity_id, level)`);
      }
    }
  }

  // 1d. Rename archetype_community_links → identity_community_links
  if (await tableExists('archetype_community_links')) {
    if (!(await tableExists('identity_community_links'))) {
      log.info('Renaming archetype_community_links → identity_community_links...');
      await db.query(`ALTER TABLE archetype_community_links RENAME TO identity_community_links`);

      // Rename column archetype_id → identity_id
      if (await columnExists('identity_community_links', 'archetype_id')) {
        await db.query(`ALTER TABLE identity_community_links RENAME COLUMN archetype_id TO identity_id`);
      }

      // Update foreign key constraint
      if (await constraintExists('identity_community_links', 'archetype_community_links_archetype_id_fkey')) {
        await db.query(`ALTER TABLE identity_community_links DROP CONSTRAINT archetype_community_links_archetype_id_fkey`);
        await db.query(`ALTER TABLE identity_community_links ADD CONSTRAINT identity_community_links_identity_id_fkey
          FOREIGN KEY (identity_id) REFERENCES identities(id) ON DELETE CASCADE`);
      }

      // Rename index
      await db.query(`DROP INDEX IF EXISTS idx_archetype_community_links_archetype`);
      await db.query(`CREATE INDEX IF NOT EXISTS idx_identity_community_links_identity ON identity_community_links(identity_id)`);
    }
  }

  // 1e. Update users table: current_archetype_id → current_identity_id
  if (await tableExists('users')) {
    if (await columnExists('users', 'current_archetype_id')) {
      if (!(await columnExists('users', 'current_identity_id'))) {
        log.info('Renaming users.current_archetype_id → current_identity_id...');
        await db.query(`ALTER TABLE users RENAME COLUMN current_archetype_id TO current_identity_id`);
      }
    }
  }

  // ============================================
  // PART 2: RENAME GOAL TABLES → JOURNEY
  // ============================================

  // 2a. Rename user_goals → user_journeys
  if (await tableExists('user_goals')) {
    if (!(await tableExists('user_journeys'))) {
      log.info('Renaming user_goals → user_journeys...');
      await db.query(`ALTER TABLE user_goals RENAME TO user_journeys`);

      // Rename column goal_type → journey_type
      if (await columnExists('user_journeys', 'goal_type')) {
        await db.query(`ALTER TABLE user_journeys RENAME COLUMN goal_type TO journey_type`);
      }

      // Update check constraint for journey_type
      // Drop old constraint and add new one
      await db.query(`ALTER TABLE user_journeys DROP CONSTRAINT IF EXISTS user_goals_goal_type_check`);
      await db.query(`ALTER TABLE user_journeys ADD CONSTRAINT user_journeys_journey_type_check CHECK (journey_type IN (
        'weight_loss', 'weight_gain', 'muscle_gain', 'strength',
        'endurance', 'flexibility', 'general_fitness', 'body_recomposition',
        'athletic_performance', 'rehabilitation', 'maintenance',
        'skill_acquisition', 'competition_prep', 'recovery'
      ))`);

      // Rename indexes
      await db.query(`DROP INDEX IF EXISTS idx_user_goals_user`);
      await db.query(`DROP INDEX IF EXISTS idx_user_goals_active`);
      await db.query(`DROP INDEX IF EXISTS idx_user_goals_primary`);
      await db.query(`CREATE INDEX IF NOT EXISTS idx_user_journeys_user ON user_journeys(user_id)`);
      await db.query(`CREATE INDEX IF NOT EXISTS idx_user_journeys_active ON user_journeys(user_id, status) WHERE status = 'active'`);
      await db.query(`CREATE INDEX IF NOT EXISTS idx_user_journeys_primary ON user_journeys(user_id, is_primary) WHERE is_primary = TRUE`);
    }
  }

  // 2b. Rename goal_progress → journey_progress
  if (await tableExists('goal_progress')) {
    if (!(await tableExists('journey_progress'))) {
      log.info('Renaming goal_progress → journey_progress...');
      await db.query(`ALTER TABLE goal_progress RENAME TO journey_progress`);

      // Rename column goal_id → journey_id
      if (await columnExists('journey_progress', 'goal_id')) {
        await db.query(`ALTER TABLE journey_progress RENAME COLUMN goal_id TO journey_id`);
      }

      // Update foreign key
      if (await constraintExists('journey_progress', 'goal_progress_goal_id_fkey')) {
        await db.query(`ALTER TABLE journey_progress DROP CONSTRAINT goal_progress_goal_id_fkey`);
        await db.query(`ALTER TABLE journey_progress ADD CONSTRAINT journey_progress_journey_id_fkey
          FOREIGN KEY (journey_id) REFERENCES user_journeys(id) ON DELETE CASCADE`);
      }

      // Update unique constraint
      if (await constraintExists('journey_progress', 'goal_progress_goal_id_date_key')) {
        await db.query(`ALTER TABLE journey_progress DROP CONSTRAINT goal_progress_goal_id_date_key`);
        await db.query(`ALTER TABLE journey_progress ADD CONSTRAINT journey_progress_journey_id_date_key UNIQUE(journey_id, date)`);
      }

      // Rename indexes
      await db.query(`DROP INDEX IF EXISTS idx_goal_progress_goal`);
      await db.query(`DROP INDEX IF EXISTS idx_goal_progress_user`);
      await db.query(`CREATE INDEX IF NOT EXISTS idx_journey_progress_journey ON journey_progress(journey_id, date DESC)`);
      await db.query(`CREATE INDEX IF NOT EXISTS idx_journey_progress_user ON journey_progress(user_id, date DESC)`);
    }
  }

  // 2c. Rename goal_milestones → journey_milestones
  if (await tableExists('goal_milestones')) {
    if (!(await tableExists('journey_milestones'))) {
      log.info('Renaming goal_milestones → journey_milestones...');
      await db.query(`ALTER TABLE goal_milestones RENAME TO journey_milestones`);

      // Rename column goal_id → journey_id
      if (await columnExists('journey_milestones', 'goal_id')) {
        await db.query(`ALTER TABLE journey_milestones RENAME COLUMN goal_id TO journey_id`);
      }

      // Update foreign key
      if (await constraintExists('journey_milestones', 'goal_milestones_goal_id_fkey')) {
        await db.query(`ALTER TABLE journey_milestones DROP CONSTRAINT goal_milestones_goal_id_fkey`);
        await db.query(`ALTER TABLE journey_milestones ADD CONSTRAINT journey_milestones_journey_id_fkey
          FOREIGN KEY (journey_id) REFERENCES user_journeys(id) ON DELETE CASCADE`);
      }

      // Rename indexes
      await db.query(`DROP INDEX IF EXISTS idx_goal_milestones_goal`);
      await db.query(`DROP INDEX IF EXISTS idx_goal_milestones_achieved`);
      await db.query(`CREATE INDEX IF NOT EXISTS idx_journey_milestones_journey ON journey_milestones(journey_id)`);
      await db.query(`CREATE INDEX IF NOT EXISTS idx_journey_milestones_achieved ON journey_milestones(journey_id, is_achieved)`);
    }
  }

  // ============================================
  // PART 3: CREATE BACKWARD-COMPATIBLE VIEWS
  // These allow old code to still work during transition
  // ============================================

  log.info('Creating backward-compatible views...');

  // Views for archetype → identity
  if (!(await viewExists('archetypes'))) {
    if (await tableExists('identities')) {
      await db.query(`CREATE VIEW archetypes AS SELECT * FROM identities`);
    }
  }

  if (!(await viewExists('archetype_categories'))) {
    if (await tableExists('identity_categories')) {
      await db.query(`CREATE VIEW archetype_categories AS SELECT * FROM identity_categories`);
    }
  }

  if (!(await viewExists('archetype_levels'))) {
    if (await tableExists('identity_levels')) {
      await db.query(`CREATE VIEW archetype_levels AS
        SELECT id, identity_id AS archetype_id, level, name, total_tu, description, muscle_targets
        FROM identity_levels`);
    }
  }

  if (!(await viewExists('archetype_community_links'))) {
    if (await tableExists('identity_community_links')) {
      await db.query(`CREATE VIEW archetype_community_links AS
        SELECT id, identity_id AS archetype_id, community_id, virtual_hangout_id, auto_join, recommended, priority, created_at
        FROM identity_community_links`);
    }
  }

  // Views for goal → journey
  if (!(await viewExists('user_goals'))) {
    if (await tableExists('user_journeys')) {
      await db.query(`CREATE VIEW user_goals AS
        SELECT id, user_id, journey_type AS goal_type, target_value, target_unit, starting_value,
               current_value, target_date, started_at, completed_at, status, priority, is_primary,
               weekly_target, reminder_enabled, reminder_frequency, notes, created_at, updated_at
        FROM user_journeys`);
    }
  }

  if (!(await viewExists('goal_progress'))) {
    if (await tableExists('journey_progress')) {
      await db.query(`CREATE VIEW goal_progress AS
        SELECT id, journey_id AS goal_id, user_id, date, value, delta, source, notes, created_at
        FROM journey_progress`);
    }
  }

  if (!(await viewExists('goal_milestones'))) {
    if (await tableExists('journey_milestones')) {
      await db.query(`CREATE VIEW goal_milestones AS
        SELECT id, journey_id AS goal_id, user_id, title, description, target_value, percentage,
               achieved_at, is_achieved, xp_reward, badge_id, created_at
        FROM journey_milestones`);
    }
  }

  // ============================================
  // PART 4: ADD NEW JOURNEY FIELDS FOR HIERARCHY
  // ============================================

  log.info('Adding new journey hierarchy fields...');

  if (await tableExists('user_journeys')) {
    // Add template_id for journey templates
    if (!(await columnExists('user_journeys', 'template_id'))) {
      await db.query(`ALTER TABLE user_journeys ADD COLUMN template_id TEXT`);
    }

    // Add category for hierarchical navigation
    if (!(await columnExists('user_journeys', 'category'))) {
      await db.query(`ALTER TABLE user_journeys ADD COLUMN category TEXT`);
    }

    // Add subcategory
    if (!(await columnExists('user_journeys', 'subcategory'))) {
      await db.query(`ALTER TABLE user_journeys ADD COLUMN subcategory TEXT`);
    }

    // Add medical disclaimer acknowledgment
    if (!(await columnExists('user_journeys', 'medical_disclaimer_accepted'))) {
      await db.query(`ALTER TABLE user_journeys ADD COLUMN medical_disclaimer_accepted BOOLEAN DEFAULT FALSE`);
    }

    if (!(await columnExists('user_journeys', 'medical_disclaimer_accepted_at'))) {
      await db.query(`ALTER TABLE user_journeys ADD COLUMN medical_disclaimer_accepted_at TIMESTAMPTZ`);
    }
  }

  // ============================================
  // PART 5: ANALYZE RENAMED TABLES
  // ============================================

  log.info('Analyzing renamed tables...');
  const renamedTables = [
    'identities', 'identity_categories', 'identity_levels', 'identity_community_links',
    'user_journeys', 'journey_progress', 'journey_milestones'
  ];
  for (const table of renamedTables) {
    if (await tableExists(table)) {
      await db.query(`ANALYZE ${table}`);
    }
  }

  log.info('Migration 032_taxonomy_rename complete');
}

export async function down(): Promise<void> {
  log.info('Rolling back migration: 032_taxonomy_rename');

  // Drop backward-compatible views first
  await db.query(`DROP VIEW IF EXISTS goal_milestones`);
  await db.query(`DROP VIEW IF EXISTS goal_progress`);
  await db.query(`DROP VIEW IF EXISTS user_goals`);
  await db.query(`DROP VIEW IF EXISTS archetype_community_links`);
  await db.query(`DROP VIEW IF EXISTS archetype_levels`);
  await db.query(`DROP VIEW IF EXISTS archetype_categories`);
  await db.query(`DROP VIEW IF EXISTS archetypes`);

  // Remove new columns from user_journeys
  if (await tableExists('user_journeys')) {
    if (await columnExists('user_journeys', 'medical_disclaimer_accepted_at')) {
      await db.query(`ALTER TABLE user_journeys DROP COLUMN medical_disclaimer_accepted_at`);
    }
    if (await columnExists('user_journeys', 'medical_disclaimer_accepted')) {
      await db.query(`ALTER TABLE user_journeys DROP COLUMN medical_disclaimer_accepted`);
    }
    if (await columnExists('user_journeys', 'subcategory')) {
      await db.query(`ALTER TABLE user_journeys DROP COLUMN subcategory`);
    }
    if (await columnExists('user_journeys', 'category')) {
      await db.query(`ALTER TABLE user_journeys DROP COLUMN category`);
    }
    if (await columnExists('user_journeys', 'template_id')) {
      await db.query(`ALTER TABLE user_journeys DROP COLUMN template_id`);
    }
  }

  // Rename tables back (in reverse order)

  // Journey → Goal tables
  if (await tableExists('journey_milestones')) {
    await db.query(`ALTER TABLE journey_milestones RENAME TO goal_milestones`);
    await db.query(`ALTER TABLE goal_milestones RENAME COLUMN journey_id TO goal_id`);
  }

  if (await tableExists('journey_progress')) {
    await db.query(`ALTER TABLE journey_progress RENAME TO goal_progress`);
    await db.query(`ALTER TABLE goal_progress RENAME COLUMN journey_id TO goal_id`);
  }

  if (await tableExists('user_journeys')) {
    await db.query(`ALTER TABLE user_journeys RENAME TO user_goals`);
    await db.query(`ALTER TABLE user_goals RENAME COLUMN journey_type TO goal_type`);
  }

  // Identity → Archetype tables
  if (await tableExists('identity_community_links')) {
    await db.query(`ALTER TABLE identity_community_links RENAME TO archetype_community_links`);
    await db.query(`ALTER TABLE archetype_community_links RENAME COLUMN identity_id TO archetype_id`);
  }

  if (await tableExists('identity_levels')) {
    await db.query(`ALTER TABLE identity_levels RENAME TO archetype_levels`);
    await db.query(`ALTER TABLE archetype_levels RENAME COLUMN identity_id TO archetype_id`);
  }

  if (await tableExists('identities')) {
    await db.query(`ALTER TABLE identities RENAME TO archetypes`);
  }

  if (await tableExists('identity_categories')) {
    await db.query(`ALTER TABLE identity_categories RENAME TO archetype_categories`);
  }

  // Rename user column back
  if (await tableExists('users')) {
    if (await columnExists('users', 'current_identity_id')) {
      await db.query(`ALTER TABLE users RENAME COLUMN current_identity_id TO current_archetype_id`);
    }
  }

  log.info('Rollback 032_taxonomy_rename complete');
}

export const migrate = up;
