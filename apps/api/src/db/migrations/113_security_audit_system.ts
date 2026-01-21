// DESTRUCTIVE: Schema modification for security audit system - contains DROP/TRUNCATE operations
/**
 * Migration 108: Security Audit System
 *
 * Creates infrastructure for security monitoring and management:
 * 1. IP blocklist table
 * 2. Security audit log table
 * 3. Failed login attempts table
 * 4. User sessions table
 * 5. Rate limit configuration table
 * 6. Proper indexes for all tables
 */

import { query } from '../client';
import { loggers } from '../../lib/logger';

const log = loggers.db;

export async function up(): Promise<void> {
  log.info('Running migration: 108_security_audit_system');

  // ============================================
  // 1. IP Blocklist Table
  // ============================================
  log.info('Creating ip_blocklist table...');

  await query(`
    CREATE TABLE IF NOT EXISTS ip_blocklist (
      ip INET PRIMARY KEY,
      reason TEXT NOT NULL,
      blocked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      blocked_by TEXT REFERENCES users(id) ON DELETE SET NULL
    );
  `);

  await query(`
    COMMENT ON TABLE ip_blocklist IS 'List of blocked IP addresses';
    COMMENT ON COLUMN ip_blocklist.ip IS 'The blocked IP address (supports IPv4 and IPv6)';
    COMMENT ON COLUMN ip_blocklist.reason IS 'Reason for blocking this IP';
    COMMENT ON COLUMN ip_blocklist.blocked_at IS 'When the IP was blocked';
    COMMENT ON COLUMN ip_blocklist.blocked_by IS 'Admin who blocked this IP';
  `);

  // Index for looking up IPs quickly (useful for middleware checks)
  await query(`
    CREATE INDEX IF NOT EXISTS idx_ip_blocklist_blocked_at
    ON ip_blocklist(blocked_at DESC);
  `);

  // ============================================
  // 2. Security Audit Log Table
  // ============================================
  log.info('Creating security_audit_log table...');

  await query(`
    CREATE TABLE IF NOT EXISTS security_audit_log (
      id TEXT PRIMARY KEY DEFAULT 'sal_' || substr(md5(random()::text), 1, 12),
      event_type TEXT NOT NULL,
      details JSONB NOT NULL DEFAULT '{}',
      ip INET,
      user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await query(`
    COMMENT ON TABLE security_audit_log IS 'Audit log for security-related events';
    COMMENT ON COLUMN security_audit_log.event_type IS 'Type of security event (e.g., LOGIN_FAILED, IP_BLOCKED)';
    COMMENT ON COLUMN security_audit_log.details IS 'Additional event details as JSON';
    COMMENT ON COLUMN security_audit_log.ip IS 'IP address associated with the event';
    COMMENT ON COLUMN security_audit_log.user_id IS 'User associated with the event (if any)';
  `);

  // Indexes for efficient querying
  await query(`
    CREATE INDEX IF NOT EXISTS idx_security_audit_log_event_type
    ON security_audit_log(event_type);

    CREATE INDEX IF NOT EXISTS idx_security_audit_log_user_id
    ON security_audit_log(user_id)
    WHERE user_id IS NOT NULL;

    CREATE INDEX IF NOT EXISTS idx_security_audit_log_ip
    ON security_audit_log(ip)
    WHERE ip IS NOT NULL;

    CREATE INDEX IF NOT EXISTS idx_security_audit_log_created_at
    ON security_audit_log(created_at DESC);

    CREATE INDEX IF NOT EXISTS idx_security_audit_log_keyset
    ON security_audit_log(created_at DESC, id DESC);
  `);

  // ============================================
  // 3. Failed Login Attempts Table
  // ============================================
  log.info('Creating failed_login_attempts table...');

  await query(`
    CREATE TABLE IF NOT EXISTS failed_login_attempts (
      id TEXT PRIMARY KEY DEFAULT 'fla_' || substr(md5(random()::text), 1, 12),
      email TEXT NOT NULL,
      ip_address INET NOT NULL,
      user_agent TEXT,
      failure_reason TEXT NOT NULL DEFAULT 'invalid_credentials',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await query(`
    COMMENT ON TABLE failed_login_attempts IS 'Tracks failed login attempts for security monitoring';
    COMMENT ON COLUMN failed_login_attempts.email IS 'Email address used in the login attempt';
    COMMENT ON COLUMN failed_login_attempts.ip_address IS 'IP address of the request';
    COMMENT ON COLUMN failed_login_attempts.user_agent IS 'User agent string from the request';
    COMMENT ON COLUMN failed_login_attempts.failure_reason IS 'Reason for failure (invalid_credentials, account_locked, etc.)';
  `);

  // Indexes for efficient querying and brute force detection
  await query(`
    CREATE INDEX IF NOT EXISTS idx_failed_login_attempts_email
    ON failed_login_attempts(email);

    CREATE INDEX IF NOT EXISTS idx_failed_login_attempts_ip
    ON failed_login_attempts(ip_address);

    CREATE INDEX IF NOT EXISTS idx_failed_login_attempts_created_at
    ON failed_login_attempts(created_at DESC);

    CREATE INDEX IF NOT EXISTS idx_failed_login_attempts_keyset
    ON failed_login_attempts(created_at DESC, id DESC);

    -- Index for recent attempts lookup (useful for brute force detection)
    -- Note: Removed partial index with NOW() - INTERVAL as it's not immutable
    CREATE INDEX IF NOT EXISTS idx_failed_login_attempts_recent
    ON failed_login_attempts(ip_address, created_at DESC);
  `);

  // ============================================
  // 4. User Sessions Table
  // ============================================
  log.info('Creating user_sessions table...');

  await query(`
    CREATE TABLE IF NOT EXISTS user_sessions (
      id TEXT PRIMARY KEY DEFAULT 'ses_' || substr(md5(random()::text), 1, 12),
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      ip_address INET NOT NULL,
      user_agent TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      last_active_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      expires_at TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '7 days'
    );
  `);

  await query(`
    COMMENT ON TABLE user_sessions IS 'Active user sessions for session management';
    COMMENT ON COLUMN user_sessions.user_id IS 'User who owns this session';
    COMMENT ON COLUMN user_sessions.ip_address IS 'IP address when session was created';
    COMMENT ON COLUMN user_sessions.last_active_at IS 'Last time this session was active';
    COMMENT ON COLUMN user_sessions.expires_at IS 'When this session expires';
  `);

  // Indexes for session management
  await query(`
    CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id
    ON user_sessions(user_id);

    CREATE INDEX IF NOT EXISTS idx_user_sessions_expires_at
    ON user_sessions(expires_at);

    CREATE INDEX IF NOT EXISTS idx_user_sessions_ip_address
    ON user_sessions(ip_address);

    CREATE INDEX IF NOT EXISTS idx_user_sessions_keyset
    ON user_sessions(last_active_at DESC, id DESC);

    -- Index for active sessions lookup
    -- Note: Removed partial index with NOW() as it's not immutable
    CREATE INDEX IF NOT EXISTS idx_user_sessions_active
    ON user_sessions(user_id, expires_at DESC, last_active_at DESC);
  `);

  // ============================================
  // 5. Rate Limit Configuration Table
  // ============================================
  log.info('Creating rate_limit_config table...');

  await query(`
    CREATE TABLE IF NOT EXISTS rate_limit_config (
      id TEXT PRIMARY KEY DEFAULT 'rlc_' || substr(md5(random()::text), 1, 12),
      endpoint TEXT NOT NULL UNIQUE,
      requests_per_minute INTEGER NOT NULL DEFAULT 60,
      requests_per_hour INTEGER,
      burst_limit INTEGER,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_by TEXT REFERENCES users(id) ON DELETE SET NULL
    );
  `);

  await query(`
    COMMENT ON TABLE rate_limit_config IS 'Configuration for API rate limiting';
    COMMENT ON COLUMN rate_limit_config.endpoint IS 'API endpoint pattern (e.g., /auth/login, /api/*)';
    COMMENT ON COLUMN rate_limit_config.requests_per_minute IS 'Max requests per minute';
    COMMENT ON COLUMN rate_limit_config.requests_per_hour IS 'Max requests per hour (optional)';
    COMMENT ON COLUMN rate_limit_config.burst_limit IS 'Maximum burst size for token bucket';
  `);

  // Index for endpoint lookup
  await query(`
    CREATE INDEX IF NOT EXISTS idx_rate_limit_config_endpoint
    ON rate_limit_config(endpoint);
  `);

  // ============================================
  // 6. Insert Default Rate Limits
  // ============================================
  log.info('Inserting default rate limit configurations...');

  await query(`
    INSERT INTO rate_limit_config (endpoint, requests_per_minute, requests_per_hour, burst_limit)
    VALUES
      ('/auth/login', 10, 100, 5),
      ('/auth/register', 5, 20, 2),
      ('/auth/forgot-password', 5, 10, 2),
      ('/api/*', 100, 3000, 20),
      ('/graphql', 60, 1500, 15)
    ON CONFLICT (endpoint) DO NOTHING;
  `);

  // ============================================
  // 7. Add email_verified_at column if not exists
  // ============================================
  log.info('Adding email_verified_at column to users table...');

  await query(`
    ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified_at TIMESTAMPTZ;
  `);

  await query(`
    COMMENT ON COLUMN users.email_verified_at IS 'When the user verified their email address';
  `);

  log.info('Migration 108_security_audit_system completed successfully');
}

export async function down(): Promise<void> {
  log.info('Rolling back migration: 108_security_audit_system');

  await query(`DROP TABLE IF EXISTS rate_limit_config CASCADE;`);
  await query(`DROP TABLE IF EXISTS user_sessions CASCADE;`);
  await query(`DROP TABLE IF EXISTS failed_login_attempts CASCADE;`);
  await query(`DROP TABLE IF EXISTS security_audit_log CASCADE;`);
  await query(`DROP TABLE IF EXISTS ip_blocklist CASCADE;`);
  await query(`ALTER TABLE users DROP COLUMN IF EXISTS email_verified_at;`);

  log.info('Rollback 108_security_audit_system completed');
}
