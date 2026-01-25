/**
 * Migration 151: Create wearable_data table
 *
 * This table stores aggregated wearable data for the wellness page.
 * It unifies data from various wearable sources into a single queryable table.
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

export async function migrate(): Promise<void> {
  log.info('Running migration: 151_wearable_data_table');

  // Create wearable_data table if it doesn't exist
  if (!(await tableExists('wearable_data'))) {
    log.info('Creating wearable_data table...');
    await db.query(`
      CREATE TABLE wearable_data (
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

        -- Activity metrics
        steps INTEGER DEFAULT 0,
        active_calories INTEGER DEFAULT 0,
        total_calories INTEGER DEFAULT 0,
        workout_minutes INTEGER DEFAULT 0,
        stand_hours INTEGER DEFAULT 0,
        distance_meters NUMERIC(10, 2) DEFAULT 0,

        -- Heart rate metrics
        heart_rate INTEGER,
        resting_heart_rate INTEGER,
        max_heart_rate INTEGER,
        min_heart_rate INTEGER,

        -- Source tracking
        source TEXT NOT NULL DEFAULT 'manual',
        raw_data JSONB,

        -- Timestamps
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    // Create indexes for common queries
    await db.query(`
      CREATE INDEX idx_wearable_data_user_recorded
      ON wearable_data(user_id, recorded_at DESC)
    `);

    await db.query(`
      CREATE INDEX idx_wearable_data_user_date
      ON wearable_data(user_id, DATE(recorded_at))
    `);

    // Unique constraint: one record per user per day per source
    await db.query(`
      CREATE UNIQUE INDEX idx_wearable_data_user_source_date
      ON wearable_data(user_id, source, DATE(recorded_at))
    `);

    log.info('Created wearable_data table with indexes');
  } else {
    log.info('wearable_data table already exists');
  }

  log.info('Migration 151 completed');
}
