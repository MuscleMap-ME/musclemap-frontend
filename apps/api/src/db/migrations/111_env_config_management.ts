// DESTRUCTIVE: Schema modification for env config management - contains DROP/TRUNCATE operations
/**
 * Migration 108: Environment Config Management System
 *
 * Creates infrastructure for managing environment variable overrides via the admin dashboard:
 * 1. env_config table - stores env variable overrides per environment
 * 2. env_config_audit - audit trail of all config changes
 * 3. Indexes for efficient lookups
 *
 * This allows admins to manage configuration without server restarts or file access.
 */

import { query } from '../client';
import { loggers } from '../../lib/logger';

const log = loggers.db;

export async function up(): Promise<void> {
  log.info('Running migration: 108_env_config_management');

  // ============================================
  // 1. Environment Config Table
  // ============================================
  log.info('Creating env_config table...');

  await query(`
    CREATE TABLE IF NOT EXISTS env_config (
      id TEXT PRIMARY KEY DEFAULT 'env_' || substr(md5(random()::text), 1, 12),
      key TEXT NOT NULL,
      value TEXT NOT NULL,
      environment TEXT NOT NULL DEFAULT 'production',
      updated_by TEXT REFERENCES users(id),
      updated_at TIMESTAMPTZ DEFAULT NOW(),
      created_at TIMESTAMPTZ DEFAULT NOW(),

      -- Each key can only exist once per environment
      UNIQUE (key, environment)
    );
  `);

  await query(`
    COMMENT ON TABLE env_config IS 'Environment variable overrides stored in database';
    COMMENT ON COLUMN env_config.key IS 'Environment variable name (uppercase with underscores)';
    COMMENT ON COLUMN env_config.value IS 'Environment variable value (may be sensitive)';
    COMMENT ON COLUMN env_config.environment IS 'Target environment: development, staging, production';
    COMMENT ON COLUMN env_config.updated_by IS 'Admin user who last updated this config';
  `);

  // Index for looking up configs by environment
  await query(`
    CREATE INDEX IF NOT EXISTS idx_env_config_environment
    ON env_config(environment);
  `);

  // Index for looking up specific keys
  await query(`
    CREATE INDEX IF NOT EXISTS idx_env_config_key
    ON env_config(key);
  `);

  // ============================================
  // 2. Environment Config Audit Table
  // ============================================
  log.info('Creating env_config_audit table...');

  await query(`
    CREATE TABLE IF NOT EXISTS env_config_audit (
      id TEXT PRIMARY KEY DEFAULT 'envaudit_' || substr(md5(random()::text), 1, 12),
      config_id TEXT,
      key TEXT NOT NULL,
      old_value TEXT,
      new_value TEXT,
      environment TEXT NOT NULL,
      action TEXT NOT NULL,
      changed_by TEXT NOT NULL REFERENCES users(id),
      changed_at TIMESTAMPTZ DEFAULT NOW(),
      ip_address TEXT,
      user_agent TEXT
    );
  `);

  await query(`
    COMMENT ON TABLE env_config_audit IS 'Audit trail of all environment config changes';
    COMMENT ON COLUMN env_config_audit.config_id IS 'Reference to the env_config record (may be null if deleted)';
    COMMENT ON COLUMN env_config_audit.key IS 'Environment variable name';
    COMMENT ON COLUMN env_config_audit.old_value IS 'Previous value (null for creates)';
    COMMENT ON COLUMN env_config_audit.new_value IS 'New value (null for deletes)';
    COMMENT ON COLUMN env_config_audit.action IS 'Action type: create, update, delete';
    COMMENT ON COLUMN env_config_audit.ip_address IS 'IP address of the admin making the change';
    COMMENT ON COLUMN env_config_audit.user_agent IS 'Browser/client user agent';
  `);

  // Index for looking up audit by config
  await query(`
    CREATE INDEX IF NOT EXISTS idx_env_config_audit_config
    ON env_config_audit(config_id, changed_at DESC);
  `);

  // Index for keyset pagination on audit log
  await query(`
    CREATE INDEX IF NOT EXISTS idx_env_config_audit_keyset
    ON env_config_audit(changed_at DESC, id DESC);
  `);

  // Index for filtering by key
  await query(`
    CREATE INDEX IF NOT EXISTS idx_env_config_audit_key
    ON env_config_audit(key, changed_at DESC);
  `);

  // Index for filtering by environment
  await query(`
    CREATE INDEX IF NOT EXISTS idx_env_config_audit_env
    ON env_config_audit(environment, changed_at DESC);
  `);

  // ============================================
  // 3. Auto-update timestamp trigger
  // ============================================
  log.info('Creating auto-update trigger for env_config...');

  await query(`
    CREATE OR REPLACE FUNCTION update_env_config_timestamp()
    RETURNS TRIGGER AS $$
    BEGIN
      NEW.updated_at = NOW();
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;
  `);

  await query(`
    DROP TRIGGER IF EXISTS trg_update_env_config_timestamp ON env_config;
    CREATE TRIGGER trg_update_env_config_timestamp
    BEFORE UPDATE ON env_config
    FOR EACH ROW
    EXECUTE FUNCTION update_env_config_timestamp();
  `);

  // ============================================
  // 4. Data retention for audit logs
  // ============================================
  log.info('Creating audit log cleanup function...');

  await query(`
    CREATE OR REPLACE FUNCTION cleanup_old_env_audit_logs(retention_days INTEGER DEFAULT 365)
    RETURNS INTEGER AS $$
    DECLARE
      deleted_count INTEGER;
    BEGIN
      DELETE FROM env_config_audit
      WHERE changed_at < NOW() - (retention_days || ' days')::INTERVAL;

      GET DIAGNOSTICS deleted_count = ROW_COUNT;
      RETURN deleted_count;
    END;
    $$ LANGUAGE plpgsql;

    COMMENT ON FUNCTION cleanup_old_env_audit_logs IS 'Removes audit logs older than specified days (default 365)';
  `);

  log.info('Migration 108_env_config_management completed successfully');
}

export async function down(): Promise<void> {
  log.info('Rolling back migration: 108_env_config_management');

  // Drop functions
  await query(`DROP FUNCTION IF EXISTS cleanup_old_env_audit_logs CASCADE`);
  await query(`DROP FUNCTION IF EXISTS update_env_config_timestamp CASCADE`);

  // Drop triggers
  await query(`DROP TRIGGER IF EXISTS trg_update_env_config_timestamp ON env_config`);

  // Drop indexes
  await query(`DROP INDEX IF EXISTS idx_env_config_audit_env`);
  await query(`DROP INDEX IF EXISTS idx_env_config_audit_key`);
  await query(`DROP INDEX IF EXISTS idx_env_config_audit_keyset`);
  await query(`DROP INDEX IF EXISTS idx_env_config_audit_config`);
  await query(`DROP INDEX IF EXISTS idx_env_config_key`);
  await query(`DROP INDEX IF EXISTS idx_env_config_environment`);

  // Drop tables
  await query(`DROP TABLE IF EXISTS env_config_audit CASCADE`);
  await query(`DROP TABLE IF EXISTS env_config CASCADE`);

  log.info('Rollback of 108_env_config_management completed');
}
