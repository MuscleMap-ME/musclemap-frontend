/**
 * Migration: Community Dashboard Tables
 *
 * This migration creates tables for:
 * 1. user_privacy_settings - Privacy preferences for community features
 * 2. activity_events - Append-only log for activity feed
 * 3. journey_progress - Tracks user progress through journeys
 * 4. metrics_rollups_hourly - Cached hourly statistics
 * 5. user_locations - Coarse location data for map view
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

async function columnExists(tableName: string, columnName: string): Promise<boolean> {
  const result = await db.queryOne<{ count: string }>(
    `SELECT COUNT(*) as count FROM information_schema.columns
     WHERE table_name = $1 AND column_name = $2`,
    [tableName, columnName]
  );
  return parseInt(result?.count || '0') > 0;
}

export async function migrate(): Promise<void> {
  log.info('Running migration: 002_community_dashboard');

  // User privacy settings
  if (!(await tableExists('user_privacy_settings'))) {
    log.info('Creating user_privacy_settings table...');
    await db.query(`
      CREATE TABLE user_privacy_settings (
        user_id TEXT PRIMARY KEY,
        share_location BOOLEAN DEFAULT FALSE,
        show_in_feed BOOLEAN DEFAULT TRUE,
        show_on_map BOOLEAN DEFAULT TRUE,
        show_workout_details BOOLEAN DEFAULT FALSE,
        public_profile BOOLEAN DEFAULT TRUE,
        public_display_name TEXT,
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);
    log.info('user_privacy_settings table created');
  }

  // Activity events (append-only log)
  if (!(await tableExists('activity_events'))) {
    log.info('Creating activity_events table...');
    await db.query(`
      CREATE TABLE activity_events (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        event_type TEXT NOT NULL,
        payload JSONB,
        geo_bucket TEXT,
        visibility_scope TEXT DEFAULT 'public_anon',
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await db.query(`CREATE INDEX idx_activity_events_user ON activity_events(user_id)`);
    await db.query(`CREATE INDEX idx_activity_events_type ON activity_events(event_type)`);
    await db.query(`CREATE INDEX idx_activity_events_created ON activity_events(created_at)`);
    await db.query(`CREATE INDEX idx_activity_events_geo ON activity_events(geo_bucket)`);
    log.info('activity_events table created');
  }

  // Journey progress tracking
  if (!(await tableExists('journey_progress'))) {
    log.info('Creating journey_progress table...');
    await db.query(`
      CREATE TABLE journey_progress (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        journey_id TEXT NOT NULL,
        stage_id TEXT NOT NULL,
        status TEXT DEFAULT 'active',
        started_at TIMESTAMP DEFAULT NOW(),
        completed_at TIMESTAMP,
        metadata JSONB
      )
    `);

    await db.query(`CREATE INDEX idx_journey_progress_user ON journey_progress(user_id)`);
    await db.query(`CREATE INDEX idx_journey_progress_journey ON journey_progress(journey_id)`);
    await db.query(`CREATE UNIQUE INDEX idx_journey_progress_user_journey ON journey_progress(user_id, journey_id)`);
    log.info('journey_progress table created');
  }

  // Hourly metrics rollups
  if (!(await tableExists('metrics_rollups_hourly'))) {
    log.info('Creating metrics_rollups_hourly table...');
    await db.query(`
      CREATE TABLE metrics_rollups_hourly (
        id TEXT PRIMARY KEY,
        hour_bucket TEXT NOT NULL,
        metric_type TEXT NOT NULL,
        metric_key TEXT,
        value_count INTEGER DEFAULT 0,
        value_sum NUMERIC DEFAULT 0,
        value_min NUMERIC,
        value_max NUMERIC,
        metadata JSONB,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await db.query(`CREATE UNIQUE INDEX idx_metrics_rollups_bucket ON metrics_rollups_hourly(hour_bucket, metric_type, metric_key)`);
    await db.query(`CREATE INDEX idx_metrics_rollups_type ON metrics_rollups_hourly(metric_type)`);
    log.info('metrics_rollups_hourly table created');
  }

  // User locations (coarse only - city level)
  if (!(await tableExists('user_locations'))) {
    log.info('Creating user_locations table...');
    await db.query(`
      CREATE TABLE user_locations (
        user_id TEXT PRIMARY KEY,
        geo_bucket TEXT NOT NULL,
        city TEXT,
        region TEXT,
        country TEXT,
        country_code TEXT,
        timezone TEXT,
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await db.query(`CREATE INDEX idx_user_locations_geo ON user_locations(geo_bucket)`);
    await db.query(`CREATE INDEX idx_user_locations_country ON user_locations(country_code)`);
    log.info('user_locations table created');
  }

  // Add role column to users if not exists (for moderator/admin)
  if (!(await columnExists('users', 'role'))) {
    log.info('Adding role column to users table...');
    await db.query(`ALTER TABLE users ADD COLUMN role TEXT DEFAULT 'user'`);

    // Update existing admins based on roles JSONB
    await db.query(`
      UPDATE users
      SET role = 'admin'
      WHERE roles->0 = '"admin"'
         OR (flags->>'isAdmin')::boolean = true
    `);
    log.info('role column added to users');
  }

  log.info('Migration 002_community_dashboard complete');
}
