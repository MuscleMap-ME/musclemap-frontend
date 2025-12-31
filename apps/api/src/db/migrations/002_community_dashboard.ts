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

export function migrate(): void {
  log.info('Running migration: 002_community_dashboard');

  // User privacy settings
  const hasPrivacySettings = db.prepare(
    "SELECT name FROM sqlite_master WHERE type='table' AND name='user_privacy_settings'"
  ).get();

  if (!hasPrivacySettings) {
    log.info('Creating user_privacy_settings table...');
    db.exec(`
      CREATE TABLE user_privacy_settings (
        user_id TEXT PRIMARY KEY,
        share_location INTEGER DEFAULT 0,
        show_in_feed INTEGER DEFAULT 1,
        show_on_map INTEGER DEFAULT 1,
        show_workout_details INTEGER DEFAULT 0,
        public_profile INTEGER DEFAULT 1,
        public_display_name TEXT,
        updated_at TEXT DEFAULT (datetime('now'))
      );
    `);
    log.info('user_privacy_settings table created');
  }

  // Activity events (append-only log)
  const hasActivityEvents = db.prepare(
    "SELECT name FROM sqlite_master WHERE type='table' AND name='activity_events'"
  ).get();

  if (!hasActivityEvents) {
    log.info('Creating activity_events table...');
    db.exec(`
      CREATE TABLE activity_events (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        event_type TEXT NOT NULL,
        payload TEXT,
        geo_bucket TEXT,
        visibility_scope TEXT DEFAULT 'public_anon',
        created_at TEXT DEFAULT (datetime('now'))
      );

      CREATE INDEX idx_activity_events_user ON activity_events(user_id);
      CREATE INDEX idx_activity_events_type ON activity_events(event_type);
      CREATE INDEX idx_activity_events_created ON activity_events(created_at);
      CREATE INDEX idx_activity_events_geo ON activity_events(geo_bucket);
    `);
    log.info('activity_events table created');
  }

  // Journey progress tracking
  const hasJourneyProgress = db.prepare(
    "SELECT name FROM sqlite_master WHERE type='table' AND name='journey_progress'"
  ).get();

  if (!hasJourneyProgress) {
    log.info('Creating journey_progress table...');
    db.exec(`
      CREATE TABLE journey_progress (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        journey_id TEXT NOT NULL,
        stage_id TEXT NOT NULL,
        status TEXT DEFAULT 'active',
        started_at TEXT DEFAULT (datetime('now')),
        completed_at TEXT,
        metadata TEXT
      );

      CREATE INDEX idx_journey_progress_user ON journey_progress(user_id);
      CREATE INDEX idx_journey_progress_journey ON journey_progress(journey_id);
      CREATE UNIQUE INDEX idx_journey_progress_user_journey ON journey_progress(user_id, journey_id);
    `);
    log.info('journey_progress table created');
  }

  // Hourly metrics rollups
  const hasMetricsRollups = db.prepare(
    "SELECT name FROM sqlite_master WHERE type='table' AND name='metrics_rollups_hourly'"
  ).get();

  if (!hasMetricsRollups) {
    log.info('Creating metrics_rollups_hourly table...');
    db.exec(`
      CREATE TABLE metrics_rollups_hourly (
        id TEXT PRIMARY KEY,
        hour_bucket TEXT NOT NULL,
        metric_type TEXT NOT NULL,
        metric_key TEXT,
        value_count INTEGER DEFAULT 0,
        value_sum REAL DEFAULT 0,
        value_min REAL,
        value_max REAL,
        metadata TEXT,
        created_at TEXT DEFAULT (datetime('now'))
      );

      CREATE UNIQUE INDEX idx_metrics_rollups_bucket ON metrics_rollups_hourly(hour_bucket, metric_type, metric_key);
      CREATE INDEX idx_metrics_rollups_type ON metrics_rollups_hourly(metric_type);
    `);
    log.info('metrics_rollups_hourly table created');
  }

  // User locations (coarse only - city level)
  const hasUserLocations = db.prepare(
    "SELECT name FROM sqlite_master WHERE type='table' AND name='user_locations'"
  ).get();

  if (!hasUserLocations) {
    log.info('Creating user_locations table...');
    db.exec(`
      CREATE TABLE user_locations (
        user_id TEXT PRIMARY KEY,
        geo_bucket TEXT NOT NULL,
        city TEXT,
        region TEXT,
        country TEXT,
        country_code TEXT,
        timezone TEXT,
        updated_at TEXT DEFAULT (datetime('now'))
      );

      CREATE INDEX idx_user_locations_geo ON user_locations(geo_bucket);
      CREATE INDEX idx_user_locations_country ON user_locations(country_code);
    `);
    log.info('user_locations table created');
  }

  // Add role column to users if not exists (for moderator/admin)
  const usersTableInfo = db.prepare("PRAGMA table_info(users)").all() as { name: string }[];
  const hasRoleColumn = usersTableInfo.some(col => col.name === 'role');

  if (!hasRoleColumn) {
    log.info('Adding role column to users table...');
    db.exec(`
      ALTER TABLE users ADD COLUMN role TEXT DEFAULT 'user';
    `);

    // Update existing admins based on roles JSON
    db.exec(`
      UPDATE users
      SET role = 'admin'
      WHERE json_extract(roles, '$[0]') = 'admin'
         OR json_extract(flags, '$.isAdmin') = 1;
    `);
    log.info('role column added to users');
  }

  log.info('Migration 002_community_dashboard complete');
}
