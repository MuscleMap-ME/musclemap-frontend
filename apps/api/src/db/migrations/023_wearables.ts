/**
 * Migration: Wearables & Health Data Tables
 *
 * This migration creates tables for:
 * 1. wearable_connections - OAuth connections to health platforms
 * 2. health_heart_rate - Heart rate data points
 * 3. health_workouts - Workout sessions from wearables
 * 4. health_activity - Daily activity summaries
 * 5. health_sleep - Sleep tracking data
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

export async function up(): Promise<void> {
  log.info('Running migration: 023_wearables');

  // Create wearable_connections table
  if (!(await tableExists('wearable_connections'))) {
    log.info('Creating wearable_connections table...');
    await db.query(`
      CREATE TABLE wearable_connections (
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        provider TEXT NOT NULL CHECK (provider IN ('apple_health', 'fitbit', 'garmin', 'google_fit', 'whoop', 'oura')),
        provider_user_id TEXT,
        access_token TEXT,
        refresh_token TEXT,
        token_expires_at TIMESTAMPTZ,
        is_active BOOLEAN DEFAULT TRUE,
        last_sync_at TIMESTAMPTZ,
        sync_error TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(user_id, provider)
      )
    `);
    await db.query(`CREATE INDEX idx_wearable_connections_user ON wearable_connections(user_id)`);
    await db.query(`CREATE INDEX idx_wearable_connections_active ON wearable_connections(user_id, is_active) WHERE is_active = TRUE`);
  }

  // Create health_heart_rate table (time-series)
  if (!(await tableExists('health_heart_rate'))) {
    log.info('Creating health_heart_rate table...');
    await db.query(`
      CREATE TABLE health_heart_rate (
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        timestamp TIMESTAMPTZ NOT NULL,
        bpm INTEGER NOT NULL CHECK (bpm > 0 AND bpm < 300),
        context TEXT CHECK (context IN ('resting', 'active', 'workout', 'sleep')),
        source TEXT NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    await db.query(`CREATE INDEX idx_health_heart_rate_user_time ON health_heart_rate(user_id, timestamp DESC)`);
  }

  // Create health_workouts table
  if (!(await tableExists('health_workouts'))) {
    log.info('Creating health_workouts table...');
    await db.query(`
      CREATE TABLE health_workouts (
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        external_id TEXT,
        workout_type TEXT NOT NULL,
        start_time TIMESTAMPTZ NOT NULL,
        end_time TIMESTAMPTZ NOT NULL,
        duration_minutes INTEGER GENERATED ALWAYS AS (EXTRACT(EPOCH FROM (end_time - start_time)) / 60) STORED,
        calories_burned INTEGER,
        distance_meters NUMERIC(10, 2),
        avg_heart_rate INTEGER,
        max_heart_rate INTEGER,
        min_heart_rate INTEGER,
        steps INTEGER,
        elevation_gain_meters NUMERIC(8, 2),
        source TEXT NOT NULL,
        raw_data JSONB,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(user_id, external_id, source)
      )
    `);
    await db.query(`CREATE INDEX idx_health_workouts_user_time ON health_workouts(user_id, start_time DESC)`);
    await db.query(`CREATE INDEX idx_health_workouts_type ON health_workouts(user_id, workout_type)`);
  }

  // Create health_activity table (daily summaries)
  if (!(await tableExists('health_activity'))) {
    log.info('Creating health_activity table...');
    await db.query(`
      CREATE TABLE health_activity (
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        date DATE NOT NULL,
        steps INTEGER DEFAULT 0,
        active_calories INTEGER DEFAULT 0,
        total_calories INTEGER DEFAULT 0,
        move_minutes INTEGER DEFAULT 0,
        exercise_minutes INTEGER DEFAULT 0,
        stand_hours INTEGER DEFAULT 0,
        distance_meters NUMERIC(10, 2) DEFAULT 0,
        floors_climbed INTEGER DEFAULT 0,
        source TEXT NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(user_id, date, source)
      )
    `);
    await db.query(`CREATE INDEX idx_health_activity_user_date ON health_activity(user_id, date DESC)`);
  }

  // Create health_sleep table
  if (!(await tableExists('health_sleep'))) {
    log.info('Creating health_sleep table...');
    await db.query(`
      CREATE TABLE health_sleep (
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        date DATE NOT NULL,
        start_time TIMESTAMPTZ NOT NULL,
        end_time TIMESTAMPTZ NOT NULL,
        total_minutes INTEGER GENERATED ALWAYS AS (EXTRACT(EPOCH FROM (end_time - start_time)) / 60) STORED,
        awake_minutes INTEGER DEFAULT 0,
        light_minutes INTEGER DEFAULT 0,
        deep_minutes INTEGER DEFAULT 0,
        rem_minutes INTEGER DEFAULT 0,
        sleep_score INTEGER,
        source TEXT NOT NULL,
        raw_data JSONB,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(user_id, date, source)
      )
    `);
    await db.query(`CREATE INDEX idx_health_sleep_user_date ON health_sleep(user_id, date DESC)`);
  }

  log.info('Migration 023_wearables complete');
}

export async function down(): Promise<void> {
  log.info('Rolling back migration: 023_wearables');
  await db.query(`DROP TABLE IF EXISTS health_sleep`);
  await db.query(`DROP TABLE IF EXISTS health_activity`);
  await db.query(`DROP TABLE IF EXISTS health_workouts`);
  await db.query(`DROP TABLE IF EXISTS health_heart_rate`);
  await db.query(`DROP TABLE IF EXISTS wearable_connections`);
  log.info('Rollback 023_wearables complete');
}

export const migrate = up;
