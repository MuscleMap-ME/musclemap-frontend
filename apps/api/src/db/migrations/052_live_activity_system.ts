/**
 * Migration: Live Activity System
 *
 * Creates tables for real-time activity monitoring:
 * - live_activity_events: Anonymous, ephemeral activity events (24h retention)
 * - geo_regions: Geographic hierarchy for drill-down navigation
 *
 * Privacy-First Architecture:
 * - NO user_id column - events are anonymous by design
 * - Privacy settings are checked BEFORE logging (gate at collection, not display)
 * - Events auto-expire after 24 hours
 * - No exact coordinates stored - only geo_bucket hashes
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
  log.info('Running migration: 052_live_activity_system');

  // ============================================
  // LIVE ACTIVITY EVENTS TABLE
  // Anonymous, ephemeral activity data for real-time monitoring
  // ============================================
  if (!(await tableExists('live_activity_events'))) {
    log.info('Creating live_activity_events table...');
    await db.query(`
      CREATE TABLE live_activity_events (
        id TEXT PRIMARY KEY DEFAULT 'lae_' || replace(gen_random_uuid()::text, '-', ''),
        event_type TEXT NOT NULL CHECK (event_type IN ('workout.completed', 'exercise.completed', 'achievement.earned')),

        -- Exercise/workout metadata (anonymous)
        exercise_id TEXT,
        exercise_name TEXT,
        muscle_group TEXT,

        -- Geographic data (optional, only if user allows)
        country_code TEXT,
        region TEXT,
        city TEXT,
        geo_bucket TEXT,  -- Hash for clustering (no exact coordinates)

        -- Timestamp
        created_at TIMESTAMPTZ DEFAULT NOW()

        -- NOTE: NO user_id column - events are anonymous by design
        -- NOTE: NO latitude/longitude - only geo_bucket for clustering
      )
    `);

    // Indexes for efficient querying
    await db.query('CREATE INDEX idx_live_activity_time ON live_activity_events(created_at DESC)');
    await db.query('CREATE INDEX idx_live_activity_geo ON live_activity_events(country_code, region, city)');
    await db.query('CREATE INDEX idx_live_activity_exercise ON live_activity_events(muscle_group, exercise_id)');
    await db.query('CREATE INDEX idx_live_activity_bucket ON live_activity_events(geo_bucket)');
    await db.query('CREATE INDEX idx_live_activity_type ON live_activity_events(event_type, created_at DESC)');

    log.info('live_activity_events table created');
  }

  // ============================================
  // GEO REGIONS TABLE
  // Geographic hierarchy for drill-down navigation
  // ============================================
  if (!(await tableExists('geo_regions'))) {
    log.info('Creating geo_regions table...');
    await db.query(`
      CREATE TABLE geo_regions (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        type TEXT NOT NULL CHECK (type IN ('continent', 'country', 'region', 'city')),
        parent_id TEXT REFERENCES geo_regions(id) ON DELETE CASCADE,
        bounds JSONB,
        center_lat REAL,
        center_lng REAL,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    await db.query('CREATE INDEX idx_geo_regions_parent ON geo_regions(parent_id)');
    await db.query('CREATE INDEX idx_geo_regions_type ON geo_regions(type)');

    // Seed some basic continent data
    log.info('Seeding geo_regions with continents...');
    const continents = [
      { id: 'continent_na', name: 'North America', lat: 40, lng: -100 },
      { id: 'continent_sa', name: 'South America', lat: -15, lng: -60 },
      { id: 'continent_eu', name: 'Europe', lat: 50, lng: 10 },
      { id: 'continent_af', name: 'Africa', lat: 0, lng: 20 },
      { id: 'continent_as', name: 'Asia', lat: 35, lng: 100 },
      { id: 'continent_oc', name: 'Oceania', lat: -25, lng: 135 },
    ];

    for (const continent of continents) {
      await db.query(
        `INSERT INTO geo_regions (id, name, type, center_lat, center_lng)
         VALUES ($1, $2, 'continent', $3, $4)
         ON CONFLICT (id) DO NOTHING`,
        [continent.id, continent.name, continent.lat, continent.lng]
      );
    }

    log.info('geo_regions table created and seeded');
  }

  log.info('Migration 052_live_activity_system completed');
}

export async function down(): Promise<void> {
  log.info('Rolling back migration: 052_live_activity_system');

  await db.query('DROP TABLE IF EXISTS live_activity_events CASCADE');
  await db.query('DROP TABLE IF EXISTS geo_regions CASCADE');

  log.info('Rollback 052_live_activity_system completed');
}

// For compatibility with migrate runner
export const migrate = up;
