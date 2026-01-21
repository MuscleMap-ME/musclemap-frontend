// DESTRUCTIVE: Schema modification for exercise images wger - contains DROP/TRUNCATE operations
/**
 * Migration: Exercise Images from wger.de
 *
 * Adds image_url and wger_id fields to exercises table to support
 * exercise illustrations from the wger.de open-source fitness database.
 *
 * wger.de provides CC-BY-SA licensed exercise images that we can use
 * to show animated GIF demonstrations for exercises.
 */

import { db } from '../client';
import { loggers } from '../../lib/logger';

const log = loggers.db;

async function columnExists(tableName: string, columnName: string): Promise<boolean> {
  const result = await db.queryOne<{ count: string }>(
    `SELECT COUNT(*) as count FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = $1 AND column_name = $2`,
    [tableName, columnName]
  );
  return parseInt(result?.count || '0') > 0;
}

export async function up(): Promise<void> {
  log.info('Running migration: 136_exercise_images_wger');

  // Add image_url column if it doesn't exist
  if (!(await columnExists('exercises', 'image_url'))) {
    log.info('Adding image_url column to exercises table...');
    await db.query(`ALTER TABLE exercises ADD COLUMN image_url TEXT`);
  }

  // Add wger_id column to track which wger exercise this maps to
  if (!(await columnExists('exercises', 'wger_id'))) {
    log.info('Adding wger_id column to exercises table...');
    await db.query(`ALTER TABLE exercises ADD COLUMN wger_id INTEGER`);
  }

  // Add wger_uuid for more stable mapping
  if (!(await columnExists('exercises', 'wger_uuid'))) {
    log.info('Adding wger_uuid column to exercises table...');
    await db.query(`ALTER TABLE exercises ADD COLUMN wger_uuid TEXT`);
  }

  // Add image_license to track licensing info
  if (!(await columnExists('exercises', 'image_license'))) {
    log.info('Adding image_license column to exercises table...');
    await db.query(`ALTER TABLE exercises ADD COLUMN image_license TEXT`);
  }

  // Add image_author for attribution
  if (!(await columnExists('exercises', 'image_author'))) {
    log.info('Adding image_author column to exercises table...');
    await db.query(`ALTER TABLE exercises ADD COLUMN image_author TEXT`);
  }

  // Create index for wger lookups
  await db.query(`CREATE INDEX IF NOT EXISTS idx_exercises_wger_id ON exercises(wger_id)`);
  await db.query(`CREATE INDEX IF NOT EXISTS idx_exercises_wger_uuid ON exercises(wger_uuid)`);

  log.info('Migration 136_exercise_images_wger completed successfully');
}

export async function down(): Promise<void> {
  log.info('Rolling back migration: 136_exercise_images_wger');

  // Drop indexes first
  await db.query(`DROP INDEX IF EXISTS idx_exercises_wger_id`);
  await db.query(`DROP INDEX IF EXISTS idx_exercises_wger_uuid`);

  // Drop columns
  if (await columnExists('exercises', 'image_url')) {
    await db.query(`ALTER TABLE exercises DROP COLUMN image_url`);
  }
  if (await columnExists('exercises', 'wger_id')) {
    await db.query(`ALTER TABLE exercises DROP COLUMN wger_id`);
  }
  if (await columnExists('exercises', 'wger_uuid')) {
    await db.query(`ALTER TABLE exercises DROP COLUMN wger_uuid`);
  }
  if (await columnExists('exercises', 'image_license')) {
    await db.query(`ALTER TABLE exercises DROP COLUMN image_license`);
  }
  if (await columnExists('exercises', 'image_author')) {
    await db.query(`ALTER TABLE exercises DROP COLUMN image_author`);
  }

  log.info('Rollback of 136_exercise_images_wger completed');
}
