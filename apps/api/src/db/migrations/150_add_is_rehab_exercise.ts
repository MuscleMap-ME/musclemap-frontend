/**
 * Migration 150: Add is_rehab_exercise column to exercises table
 *
 * This column was missing from the exercises table but referenced in the
 * prescription engine v3 code. It indicates whether an exercise is specifically
 * designed for rehabilitation purposes.
 */

import { db } from '../client';
import { loggers } from '../../lib/logger';

const log = loggers.db;

async function columnExists(tableName: string, columnName: string): Promise<boolean> {
  const result = await db.queryOne<{ count: string }>(
    `SELECT COUNT(*) as count FROM information_schema.columns
     WHERE table_name = $1 AND column_name = $2`,
    [tableName, columnName]
  );
  return parseInt(result?.count || '0') > 0;
}

export async function migrate(): Promise<void> {
  log.info('Running migration: 150_add_is_rehab_exercise');

  // Add is_rehab_exercise column if it doesn't exist
  if (!(await columnExists('exercises', 'is_rehab_exercise'))) {
    log.info('Adding is_rehab_exercise column to exercises table...');
    await db.query(`
      ALTER TABLE exercises
      ADD COLUMN is_rehab_exercise BOOLEAN DEFAULT false
    `);

    // Set is_rehab_exercise to true for exercises with high rehabilitation effectiveness
    // or that have "rehab", "therapy", "recovery", "mobility", or "corrective" in the name
    log.info('Marking rehabilitation exercises...');
    await db.query(`
      UPDATE exercises
      SET is_rehab_exercise = true
      WHERE
        LOWER(name) LIKE '%rehab%'
        OR LOWER(name) LIKE '%therapy%'
        OR LOWER(name) LIKE '%recovery%'
        OR LOWER(name) LIKE '%corrective%'
        OR LOWER(name) LIKE '%mobility%'
        OR LOWER(name) LIKE '%stretch%'
        OR LOWER(name) LIKE '%foam roll%'
        OR LOWER(name) LIKE '%band pull apart%'
        OR LOWER(name) LIKE '%face pull%'
        OR LOWER(name) LIKE '%external rotation%'
        OR LOWER(name) LIKE '%internal rotation%'
        OR LOWER(type) = 'mobility'
        OR LOWER(type) = 'stretching'
        OR LOWER(type) = 'flexibility'
        OR LOWER(type) = 'corrective'
        OR (effectiveness_rehabilitation IS NOT NULL AND effectiveness_rehabilitation >= 8)
    `);

    log.info('Added is_rehab_exercise column to exercises table');
  } else {
    log.info('is_rehab_exercise column already exists');
  }

  log.info('Migration 150 completed');
}
