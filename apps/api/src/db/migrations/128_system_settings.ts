/**
 * Migration 128: System Settings Table
 *
 * Creates a system_settings table to store application-wide settings
 * like maintenance mode, read-only mode, and other configuration.
 *
 * This provides database durability for emergency mode settings
 * when Redis is unavailable.
 */

import { query } from '../client';
import { loggers } from '../../lib/logger';

const log = loggers.db;

export async function up(): Promise<void> {
  log.info('Running migration 128: System Settings Table');

  // Create system_settings table for emergency modes and other global settings
  await query(`
    CREATE TABLE IF NOT EXISTS system_settings (
      key VARCHAR(255) PRIMARY KEY,
      value TEXT NOT NULL,
      description TEXT,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    )
  `);

  // Add index for quick lookups
  await query(`
    CREATE INDEX IF NOT EXISTS idx_system_settings_updated_at
    ON system_settings(updated_at DESC)
  `);

  // Add comment for documentation
  await query(`
    COMMENT ON TABLE system_settings IS 'Global system settings including emergency modes (maintenance, read-only)'
  `);

  // Insert default values for emergency modes
  await query(`
    INSERT INTO system_settings (key, value, description)
    VALUES
      ('maintenance_mode', 'false', 'When true, returns 503 for all non-admin requests'),
      ('read_only_mode', 'false', 'When true, blocks all POST/PUT/DELETE/PATCH for non-admins')
    ON CONFLICT (key) DO NOTHING
  `);

  log.info('Migration 128 complete: System Settings Table created');
}

export async function down(): Promise<void> {
  log.info('Rolling back migration 128: System Settings Table');

  await query('DROP TABLE IF EXISTS system_settings CASCADE');

  log.info('Migration 128 rolled back');
}
