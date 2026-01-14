/**
 * Migration: Add equipment, locations, and timing fields to exercises
 *
 * This migration adds the necessary columns for constraint-based workout prescription.
 */

import { db, ensurePoolReady } from '../client';
import { loggers } from '../../lib/logger';
import { seedEquipmentLocations } from '../seed-equipment-locations';

const log = loggers.db;

async function columnExists(tableName: string, columnName: string): Promise<boolean> {
  const result = await db.queryOne<{ count: string }>(
    `SELECT COUNT(*) as count FROM information_schema.columns
     WHERE table_name = $1 AND column_name = $2`,
    [tableName, columnName]
  );
  return parseInt(result?.count || '0') > 0;
}

async function tableExists(tableName: string): Promise<boolean> {
  const result = await db.queryOne<{ count: string }>(
    `SELECT COUNT(*) as count FROM information_schema.tables
     WHERE table_name = $1`,
    [tableName]
  );
  return parseInt(result?.count || '0') > 0;
}

export async function migrate(): Promise<void> {
  // Ensure pool is ready before any database operations
  await ensurePoolReady();

  log.info('Running migration: 004_exercise_equipment_locations');

  // Check if columns already exist
  const hasEquipmentRequired = await columnExists('exercises', 'equipment_required');

  if (!hasEquipmentRequired) {
    log.info('Adding equipment/location columns to exercises table...');

    // Add new columns to exercises table
    await db.query(`ALTER TABLE exercises ADD COLUMN IF NOT EXISTS equipment_required JSONB DEFAULT '[]'`);
    await db.query(`ALTER TABLE exercises ADD COLUMN IF NOT EXISTS equipment_optional JSONB DEFAULT '[]'`);
    await db.query(`ALTER TABLE exercises ADD COLUMN IF NOT EXISTS locations JSONB DEFAULT '["gym"]'`);
    await db.query(`ALTER TABLE exercises ADD COLUMN IF NOT EXISTS is_compound BOOLEAN DEFAULT FALSE`);
    await db.query(`ALTER TABLE exercises ADD COLUMN IF NOT EXISTS estimated_seconds INTEGER DEFAULT 45`);
    await db.query(`ALTER TABLE exercises ADD COLUMN IF NOT EXISTS rest_seconds INTEGER DEFAULT 60`);
    await db.query(`ALTER TABLE exercises ADD COLUMN IF NOT EXISTS movement_pattern TEXT`);

    log.info('Equipment/location columns added');

    // Seed exercise equipment/location mappings
    await seedEquipmentLocations();

    log.info('Equipment/location data seeded');
  } else {
    log.info('Equipment/location columns already exist, skipping...');
  }

  // Check if prescriptions table exists
  if (!(await tableExists('prescriptions'))) {
    log.info('Creating prescriptions table...');

    await db.query(`
      CREATE TABLE IF NOT EXISTS prescriptions (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        constraints JSONB NOT NULL,
        exercises JSONB NOT NULL,
        warmup JSONB,
        cooldown JSONB,
        substitutions JSONB,
        muscle_coverage JSONB NOT NULL,
        estimated_duration INTEGER NOT NULL,
        actual_duration INTEGER NOT NULL,
        credit_cost INTEGER NOT NULL DEFAULT 1,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await db.query(`CREATE INDEX IF NOT EXISTS idx_prescriptions_user ON prescriptions(user_id)`);

    log.info('Prescriptions table created');
  } else {
    log.info('Prescriptions table already exists, skipping...');
  }

  log.info('Migration 004_exercise_equipment_locations complete');
}
