/**
 * Migration: Mascot Timeline System
 *
 * Creates tables for:
 * 1. Timeline Events - Records of significant user events
 * 2. Timeline Reactions - Mascot reactions to events
 *
 * This enables:
 * - Recording workout/achievement events
 * - Generating contextual mascot reactions
 * - Building a personalized timeline feed
 * - Tracking which reactions have been shown to the user
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

export async function up(): Promise<void> {
  log.info('Running migration: 122_mascot_timeline_system');

  // =====================================================
  // MASCOT TIMELINE EVENTS
  // Records of significant user events that mascot can react to
  // =====================================================

  if (!(await tableExists('mascot_timeline_events'))) {
    log.info('Creating mascot_timeline_events table...');
    await db.query(`
      CREATE TABLE mascot_timeline_events (
        id TEXT PRIMARY KEY DEFAULT 'mte_' || replace(gen_random_uuid()::text, '-', ''),
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,

        -- Event details
        event_type TEXT NOT NULL,
        event_data JSONB DEFAULT '{}',
        importance TEXT DEFAULT 'low' CHECK (importance IN ('low', 'medium', 'high', 'epic')),

        -- Context (optional links to other entities)
        workout_id TEXT,
        achievement_id TEXT,
        goal_id TEXT,

        -- Timestamps
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    // Indexes for efficient querying
    await db.query(`CREATE INDEX idx_timeline_events_user_time ON mascot_timeline_events(user_id, created_at DESC)`);
    await db.query(`CREATE INDEX idx_timeline_events_type ON mascot_timeline_events(event_type)`);
    await db.query(`CREATE INDEX idx_timeline_events_importance ON mascot_timeline_events(importance)`);
    await db.query(`CREATE INDEX idx_timeline_events_keyset ON mascot_timeline_events(user_id, created_at DESC, id DESC)`);
  }

  // =====================================================
  // MASCOT TIMELINE REACTIONS
  // Mascot's reactions to timeline events
  // =====================================================

  if (!(await tableExists('mascot_timeline_reactions'))) {
    log.info('Creating mascot_timeline_reactions table...');
    await db.query(`
      CREATE TABLE mascot_timeline_reactions (
        id TEXT PRIMARY KEY DEFAULT 'mtr_' || replace(gen_random_uuid()::text, '-', ''),
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        event_id TEXT NOT NULL REFERENCES mascot_timeline_events(id) ON DELETE CASCADE,

        -- Reaction content
        event_type TEXT NOT NULL, -- Cached from event for faster lookups
        reaction_type TEXT NOT NULL, -- 'low', 'medium', 'high', 'epic'
        message TEXT NOT NULL,
        emote TEXT NOT NULL,
        animation TEXT NOT NULL,

        -- Animation parameters
        duration INTEGER NOT NULL DEFAULT 2000, -- milliseconds
        intensity NUMERIC(4, 2) DEFAULT 1.0,
        sound_effect TEXT,

        -- Display tracking
        shown BOOLEAN DEFAULT FALSE,
        shown_at TIMESTAMPTZ,

        -- Timestamps
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    // Indexes for efficient querying
    await db.query(`CREATE INDEX idx_timeline_reactions_user ON mascot_timeline_reactions(user_id, created_at DESC)`);
    await db.query(`CREATE INDEX idx_timeline_reactions_event ON mascot_timeline_reactions(event_id)`);
    await db.query(`CREATE INDEX idx_timeline_reactions_pending ON mascot_timeline_reactions(user_id, shown) WHERE shown = FALSE`);
    await db.query(`CREATE INDEX idx_timeline_reactions_type ON mascot_timeline_reactions(event_type, created_at DESC)`);
  }

  // =====================================================
  // ADD COLUMNS TO user_companion_state IF NOT EXISTS
  // For storing cached appearance traits
  // =====================================================

  if (await tableExists('user_companion_state')) {
    if (!(await columnExists('user_companion_state', 'appearance_seed'))) {
      log.info('Adding appearance columns to user_companion_state...');
      await db.query(`ALTER TABLE user_companion_state ADD COLUMN appearance_seed TEXT`);
      await db.query(`ALTER TABLE user_companion_state ADD COLUMN base_species TEXT`);
      await db.query(`ALTER TABLE user_companion_state ADD COLUMN base_colors JSONB DEFAULT '{}'`);
      await db.query(`ALTER TABLE user_companion_state ADD COLUMN personality_traits JSONB DEFAULT '{}'`);
    }
  }

  // =====================================================
  // FEATURE FLAG FOR MASCOT TIMELINE
  // =====================================================

  await db.query(`
    INSERT INTO feature_flags (id, name, description, enabled, rollout_percentage)
    VALUES (
      'mascot_timeline',
      'Mascot Timeline',
      'Enable mascot reactions on the timeline and 3D rendering',
      true,
      100
    )
    ON CONFLICT (id) DO UPDATE SET
      enabled = true,
      rollout_percentage = 100
  `);

  // =====================================================
  // CLEANUP: Remove duplicate reactions (safety measure)
  // =====================================================

  await db.query(`
    CREATE OR REPLACE FUNCTION cleanup_duplicate_reactions()
    RETURNS TRIGGER AS $$
    BEGIN
      -- Delete older duplicate reactions for the same event
      DELETE FROM mascot_timeline_reactions
      WHERE event_id = NEW.event_id
        AND id != NEW.id
        AND created_at < NEW.created_at;
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql
  `);

  await db.query(`DROP TRIGGER IF EXISTS trg_cleanup_duplicate_reactions ON mascot_timeline_reactions`);
  await db.query(`
    CREATE TRIGGER trg_cleanup_duplicate_reactions
    AFTER INSERT ON mascot_timeline_reactions
    FOR EACH ROW
    EXECUTE FUNCTION cleanup_duplicate_reactions()
  `);

  // =====================================================
  // ANALYZE TABLES
  // =====================================================

  log.info('Analyzing new tables...');
  await db.query('ANALYZE mascot_timeline_events');
  await db.query('ANALYZE mascot_timeline_reactions');

  log.info('Migration 122_mascot_timeline_system complete');
}

export async function down(): Promise<void> {
  log.info('Rolling back migration: 122_mascot_timeline_system');

  // Drop trigger
  await db.query('DROP TRIGGER IF EXISTS trg_cleanup_duplicate_reactions ON mascot_timeline_reactions');
  await db.query('DROP FUNCTION IF EXISTS cleanup_duplicate_reactions()');

  // Drop tables
  await db.query('DROP TABLE IF EXISTS mascot_timeline_reactions CASCADE');
  await db.query('DROP TABLE IF EXISTS mascot_timeline_events CASCADE');

  // Remove columns from user_companion_state
  await db.query('ALTER TABLE user_companion_state DROP COLUMN IF EXISTS appearance_seed');
  await db.query('ALTER TABLE user_companion_state DROP COLUMN IF EXISTS base_species');
  await db.query('ALTER TABLE user_companion_state DROP COLUMN IF EXISTS base_colors');
  await db.query('ALTER TABLE user_companion_state DROP COLUMN IF EXISTS personality_traits');

  // Remove feature flag
  await db.query(`DELETE FROM feature_flags WHERE id = 'mascot_timeline'`);

  log.info('Rollback 122_mascot_timeline_system complete');
}

export const migrate = up;
