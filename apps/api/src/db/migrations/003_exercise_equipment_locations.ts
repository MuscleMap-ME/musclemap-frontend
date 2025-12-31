/**
 * Migration: Add equipment, locations, and timing fields to exercises
 *
 * This migration adds the necessary columns for constraint-based workout prescription.
 */

import { db } from '../client';
import { loggers } from '../../lib/logger';
import { seedEquipmentLocations } from '../seed-equipment-locations';

const log = loggers.db;

export function migrate(): void {
  log.info('Running migration: 003_exercise_equipment_locations');

  // Check if columns already exist
  const tableInfo = db.prepare("PRAGMA table_info(exercises)").all() as { name: string }[];
  const hasEquipmentRequired = tableInfo.some(col => col.name === 'equipment_required');

  if (!hasEquipmentRequired) {
    log.info('Adding equipment/location columns to exercises table...');

    // Add new columns to exercises table
    db.exec(`
      ALTER TABLE exercises ADD COLUMN equipment_required TEXT DEFAULT '[]';
      ALTER TABLE exercises ADD COLUMN equipment_optional TEXT DEFAULT '[]';
      ALTER TABLE exercises ADD COLUMN locations TEXT DEFAULT '["gym"]';
      ALTER TABLE exercises ADD COLUMN is_compound INTEGER DEFAULT 0;
      ALTER TABLE exercises ADD COLUMN estimated_seconds INTEGER DEFAULT 45;
      ALTER TABLE exercises ADD COLUMN rest_seconds INTEGER DEFAULT 60;
      ALTER TABLE exercises ADD COLUMN movement_pattern TEXT;
    `);

    log.info('Equipment/location columns added');

    // Seed exercise equipment/location mappings
    seedEquipmentLocations(db);

    log.info('Equipment/location data seeded');
  } else {
    log.info('Equipment/location columns already exist, skipping...');
  }

  // Check if prescriptions table exists
  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='prescriptions'").get();

  if (!tables) {
    log.info('Creating prescriptions table...');

    db.exec(`
      CREATE TABLE IF NOT EXISTS prescriptions (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        constraints TEXT NOT NULL,
        exercises TEXT NOT NULL,
        warmup TEXT,
        cooldown TEXT,
        substitutions TEXT,
        muscle_coverage TEXT NOT NULL,
        estimated_duration INTEGER NOT NULL,
        actual_duration INTEGER NOT NULL,
        credit_cost INTEGER NOT NULL DEFAULT 1,
        created_at TEXT DEFAULT (datetime('now'))
      );

      CREATE INDEX IF NOT EXISTS idx_prescriptions_user ON prescriptions(user_id);
    `);

    log.info('Prescriptions table created');
  } else {
    log.info('Prescriptions table already exists, skipping...');
  }

  log.info('Migration 003_exercise_equipment_locations complete');
}
