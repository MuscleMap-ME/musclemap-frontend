/**
 * Migration 119: Active Workout Sessions
 *
 * Creates server-side storage for in-progress workout sessions.
 * This allows users to recover their workouts after:
 * - Browser refresh/crash
 * - Server restart
 * - Switching devices
 * - App crashes
 *
 * Sessions are automatically cleaned up after 24 hours of inactivity.
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

async function indexExists(indexName: string): Promise<boolean> {
  const result = await db.queryOne<{ count: string }>(
    `SELECT COUNT(*) as count FROM pg_indexes WHERE indexname = $1`,
    [indexName]
  );
  return parseInt(result?.count || '0') > 0;
}

export async function migrate(): Promise<void> {
  log.info('Running migration: 119_active_workout_sessions');

  // ============================================
  // ACTIVE WORKOUT SESSIONS TABLE
  // ============================================
  if (!(await tableExists('active_workout_sessions'))) {
    log.info('Creating active_workout_sessions table...');
    await db.query(`
      CREATE TABLE active_workout_sessions (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,

        -- Session metadata
        started_at TIMESTAMP NOT NULL,
        paused_at TIMESTAMP,
        total_paused_time INTEGER DEFAULT 0,
        last_activity_at TIMESTAMP NOT NULL DEFAULT NOW(),

        -- Workout plan (what exercises were planned)
        workout_plan JSONB,

        -- Current position in workout
        current_exercise_index INTEGER DEFAULT 0,
        current_set_index INTEGER DEFAULT 0,

        -- All logged sets (the critical data to preserve)
        sets JSONB DEFAULT '[]',

        -- Running metrics
        total_volume DECIMAL(14, 2) DEFAULT 0,
        total_reps INTEGER DEFAULT 0,
        estimated_calories INTEGER DEFAULT 0,
        muscles_worked JSONB DEFAULT '[]',

        -- PRs achieved in this session
        session_prs JSONB DEFAULT '[]',

        -- Rest timer state (so timer can be restored)
        rest_timer_remaining INTEGER,
        rest_timer_total_duration INTEGER,
        rest_timer_started_at TIMESTAMP,

        -- Exercise groups (supersets, circuits)
        exercise_groups JSONB DEFAULT '[]',
        active_group JSONB,
        active_group_exercise_index INTEGER DEFAULT 0,
        active_group_round INTEGER DEFAULT 1,
        group_sets JSONB DEFAULT '[]',

        -- Client sync tracking
        client_version INTEGER DEFAULT 1,
        server_version INTEGER DEFAULT 1,

        -- Timestamps
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Index for looking up user's active session (most common query)
    if (!(await indexExists('idx_active_sessions_user'))) {
      await db.query(`CREATE INDEX idx_active_sessions_user ON active_workout_sessions(user_id)`);
    }

    // Index for cleanup job (sessions older than 24h)
    if (!(await indexExists('idx_active_sessions_activity'))) {
      await db.query(`CREATE INDEX idx_active_sessions_activity ON active_workout_sessions(last_activity_at)`);
    }

    // Unique constraint: one active session per user
    if (!(await indexExists('idx_active_sessions_user_unique'))) {
      await db.query(`CREATE UNIQUE INDEX idx_active_sessions_user_unique ON active_workout_sessions(user_id)`);
    }

    log.info('active_workout_sessions table created');
  }

  // ============================================
  // ARCHIVED SESSIONS (for recovery history)
  // ============================================
  if (!(await tableExists('archived_workout_sessions'))) {
    log.info('Creating archived_workout_sessions table...');
    await db.query(`
      CREATE TABLE archived_workout_sessions (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        original_session_id TEXT NOT NULL,

        -- Session data snapshot
        session_data JSONB NOT NULL,

        -- Why it was archived
        archive_reason TEXT NOT NULL, -- 'completed', 'abandoned', 'expired', 'replaced'

        -- Timestamps
        started_at TIMESTAMP NOT NULL,
        archived_at TIMESTAMP DEFAULT NOW(),

        -- Whether it was recovered/converted to a real workout
        recovered BOOLEAN DEFAULT false,
        recovered_workout_id TEXT REFERENCES workouts(id)
      )
    `);

    if (!(await indexExists('idx_archived_sessions_user'))) {
      await db.query(`CREATE INDEX idx_archived_sessions_user ON archived_workout_sessions(user_id, archived_at DESC)`);
    }

    // Partial index for unrecovered sessions (for recovery UI)
    if (!(await indexExists('idx_archived_sessions_unrecovered'))) {
      await db.query(`
        CREATE INDEX idx_archived_sessions_unrecovered
        ON archived_workout_sessions(user_id, archived_at DESC)
        WHERE recovered = false
      `);
    }

    log.info('archived_workout_sessions table created');
  }

  // ============================================
  // FUNCTION: Auto-update last_activity_at
  // ============================================
  await db.query(`
    CREATE OR REPLACE FUNCTION update_session_activity()
    RETURNS TRIGGER AS $$
    BEGIN
      NEW.last_activity_at = NOW();
      NEW.updated_at = NOW();
      NEW.server_version = NEW.server_version + 1;
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;
  `);

  // Create trigger if not exists
  const triggerExists = await db.queryOne<{ count: string }>(
    `SELECT COUNT(*) as count FROM pg_trigger WHERE tgname = 'trigger_session_activity'`
  );

  if (parseInt(triggerExists?.count || '0') === 0) {
    await db.query(`
      CREATE TRIGGER trigger_session_activity
      BEFORE UPDATE ON active_workout_sessions
      FOR EACH ROW
      EXECUTE FUNCTION update_session_activity();
    `);
  }

  // ============================================
  // CLEANUP FUNCTION: Archive expired sessions
  // ============================================
  await db.query(`
    CREATE OR REPLACE FUNCTION cleanup_expired_sessions()
    RETURNS INTEGER AS $$
    DECLARE
      expired_count INTEGER;
    BEGIN
      -- Archive sessions inactive for more than 24 hours
      WITH expired AS (
        DELETE FROM active_workout_sessions
        WHERE last_activity_at < NOW() - INTERVAL '24 hours'
        RETURNING *
      )
      INSERT INTO archived_workout_sessions (
        id, user_id, original_session_id, session_data,
        archive_reason, started_at, archived_at
      )
      SELECT
        gen_random_uuid()::text,
        user_id,
        id,
        jsonb_build_object(
          'sets', sets,
          'total_volume', total_volume,
          'total_reps', total_reps,
          'estimated_calories', estimated_calories,
          'muscles_worked', muscles_worked,
          'session_prs', session_prs,
          'workout_plan', workout_plan,
          'current_exercise_index', current_exercise_index,
          'exercise_groups', exercise_groups
        ),
        'expired',
        started_at,
        NOW()
      FROM expired;

      GET DIAGNOSTICS expired_count = ROW_COUNT;
      RETURN expired_count;
    END;
    $$ LANGUAGE plpgsql;
  `);

  log.info('Migration 119_active_workout_sessions complete');
}
