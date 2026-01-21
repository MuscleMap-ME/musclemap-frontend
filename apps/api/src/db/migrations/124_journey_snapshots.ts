// DESTRUCTIVE: Schema modification for journey snapshots - contains DROP/TRUNCATE operations
/**
 * Migration 124: Journey Snapshots System
 *
 * Creates tables for user journey state preservation:
 * - journey_snapshots: Point-in-time captures of user progress
 * - Enables users to restore their journey to previous states
 * - Supports full reset functionality
 */

import { query } from '../client';
import { loggers } from '../../lib/logger';

const log = loggers.db;

export async function up(): Promise<void> {
  log.info('Running migration: 124_journey_snapshots');

  // ============================================
  // 1. Create journey_snapshots table
  // ============================================
  log.info('Creating journey_snapshots table...');

  await query(`
    CREATE TABLE IF NOT EXISTS journey_snapshots (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      description TEXT,
      snapshot_type TEXT NOT NULL DEFAULT 'manual' CHECK (snapshot_type IN ('manual', 'auto', 'milestone', 'archetype_change')),

      -- Core identity state
      archetype_id TEXT,
      archetype_level INTEGER,

      -- Stats snapshot
      total_tu NUMERIC(12,2) DEFAULT 0,
      total_workouts INTEGER DEFAULT 0,
      total_exercises INTEGER DEFAULT 0,

      -- Profile data (JSONB for flexibility)
      profile_data JSONB NOT NULL DEFAULT '{}',

      -- Equipment state
      equipment_data JSONB NOT NULL DEFAULT '[]',

      -- Journey progress (all active journeys)
      journey_data JSONB NOT NULL DEFAULT '[]',

      -- Goals state
      goals_data JSONB NOT NULL DEFAULT '[]',

      -- Achievements at time of snapshot
      achievements_data JSONB NOT NULL DEFAULT '[]',

      -- Workout history summary (recent 30 days)
      workout_summary JSONB NOT NULL DEFAULT '{}',

      -- Onboarding state
      onboarding_data JSONB NOT NULL DEFAULT '{}',

      -- Metadata
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      expires_at TIMESTAMPTZ, -- NULL means never expires
      is_restorable BOOLEAN NOT NULL DEFAULT TRUE,
      restored_count INTEGER NOT NULL DEFAULT 0,
      last_restored_at TIMESTAMPTZ
    )
  `);

  // ============================================
  // 2. Create indexes for journey_snapshots
  // ============================================
  log.info('Creating journey_snapshots indexes...');

  await query(`
    CREATE INDEX IF NOT EXISTS idx_journey_snapshots_user_created
      ON journey_snapshots(user_id, created_at DESC);

    CREATE INDEX IF NOT EXISTS idx_journey_snapshots_user_type
      ON journey_snapshots(user_id, snapshot_type);

    CREATE INDEX IF NOT EXISTS idx_journey_snapshots_keyset
      ON journey_snapshots(user_id, created_at DESC, id DESC);

    CREATE INDEX IF NOT EXISTS idx_journey_snapshots_expires
      ON journey_snapshots(expires_at)
      WHERE expires_at IS NOT NULL;
  `);

  // ============================================
  // 3. Create snapshot_restore_log table
  // ============================================
  log.info('Creating snapshot_restore_log table...');

  await query(`
    CREATE TABLE IF NOT EXISTS snapshot_restore_log (
      id SERIAL PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      snapshot_id TEXT REFERENCES journey_snapshots(id) ON DELETE SET NULL,
      restore_type TEXT NOT NULL CHECK (restore_type IN ('full', 'partial', 'fresh_start')),
      restored_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

      -- What was the state before restoration
      previous_archetype TEXT,
      previous_level INTEGER,
      previous_tu NUMERIC(12,2),

      -- What was restored
      restored_archetype TEXT,
      restored_level INTEGER,
      restored_tu NUMERIC(12,2),

      -- Details
      components_restored JSONB NOT NULL DEFAULT '[]', -- ['profile', 'equipment', 'goals', etc.]
      notes TEXT
    )
  `);

  await query(`
    CREATE INDEX IF NOT EXISTS idx_snapshot_restore_log_user
      ON snapshot_restore_log(user_id, restored_at DESC);
  `);

  // ============================================
  // 4. Add snapshot settings to user_profile_extended
  // ============================================
  log.info('Adding snapshot settings columns...');

  await query(`
    ALTER TABLE user_profile_extended
    ADD COLUMN IF NOT EXISTS auto_snapshot_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    ADD COLUMN IF NOT EXISTS snapshot_retention_days INTEGER NOT NULL DEFAULT 90,
    ADD COLUMN IF NOT EXISTS last_auto_snapshot_at TIMESTAMPTZ
  `);

  // ============================================
  // 5. Create function for auto-snapshots
  // ============================================
  log.info('Creating auto-snapshot trigger function...');

  await query(`
    CREATE OR REPLACE FUNCTION create_auto_snapshot_on_archetype_change()
    RETURNS TRIGGER AS $$
    DECLARE
      snapshot_id TEXT;
      profile_exists BOOLEAN;
      auto_enabled BOOLEAN;
    BEGIN
      -- Only create snapshot if archetype actually changed
      IF OLD.current_archetype_id IS DISTINCT FROM NEW.current_archetype_id THEN
        -- Check if auto snapshots are enabled for this user
        SELECT auto_snapshot_enabled INTO auto_enabled
        FROM user_profile_extended
        WHERE user_id = NEW.id;

        -- Default to true if no profile exists
        IF auto_enabled IS NULL OR auto_enabled = TRUE THEN
          snapshot_id := 'snap_' || encode(gen_random_bytes(12), 'hex');

          INSERT INTO journey_snapshots (
            id, user_id, name, description, snapshot_type,
            archetype_id, archetype_level,
            profile_data, created_at
          )
          VALUES (
            snapshot_id,
            NEW.id,
            'Before changing to ' || COALESCE(NEW.current_archetype_id, 'none'),
            'Automatic snapshot before archetype change from ' || COALESCE(OLD.current_archetype_id, 'none'),
            'archetype_change',
            OLD.current_archetype_id,
            OLD.current_level,
            jsonb_build_object(
              'previous_archetype', OLD.current_archetype_id,
              'new_archetype', NEW.current_archetype_id
            ),
            NOW()
          );
        END IF;
      END IF;

      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;
  `);

  // ============================================
  // 6. Create trigger for auto-snapshots
  // ============================================
  log.info('Creating auto-snapshot trigger...');

  await query(`
    DROP TRIGGER IF EXISTS trigger_auto_snapshot_archetype_change ON users;

    CREATE TRIGGER trigger_auto_snapshot_archetype_change
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION create_auto_snapshot_on_archetype_change();
  `);

  log.info('Migration 124_journey_snapshots completed successfully');
}

export async function down(): Promise<void> {
  log.info('Rolling back migration: 124_journey_snapshots');

  await query(`DROP TRIGGER IF EXISTS trigger_auto_snapshot_archetype_change ON users`);
  await query(`DROP FUNCTION IF EXISTS create_auto_snapshot_on_archetype_change()`);

  await query(`
    ALTER TABLE user_profile_extended
    DROP COLUMN IF EXISTS auto_snapshot_enabled,
    DROP COLUMN IF EXISTS snapshot_retention_days,
    DROP COLUMN IF EXISTS last_auto_snapshot_at
  `);

  await query(`DROP TABLE IF EXISTS snapshot_restore_log`);
  await query(`DROP TABLE IF EXISTS journey_snapshots`);

  log.info('Migration 124_journey_snapshots rolled back successfully');
}
