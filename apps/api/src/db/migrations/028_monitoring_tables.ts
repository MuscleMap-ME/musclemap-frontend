/**
 * Migration 028: Monitoring & Testing Tables
 *
 * Creates tables for:
 * - Test suite results
 * - User journey tracking
 * - Error tracking
 * - Request logging
 */

import { db } from '../client';
import { loggers } from '../../lib/logger';

const log = loggers.db;

export async function migrate(): Promise<void> {
  log.info('Creating monitoring tables...');

  // Test suites table
  await db.query(`
    CREATE TABLE IF NOT EXISTS test_suites (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      completed_at TIMESTAMPTZ,
      total_tests INT NOT NULL DEFAULT 0,
      passed INT NOT NULL DEFAULT 0,
      failed INT NOT NULL DEFAULT 0,
      skipped INT NOT NULL DEFAULT 0,
      errors INT NOT NULL DEFAULT 0,
      results JSONB NOT NULL DEFAULT '[]'::jsonb,
      environment TEXT NOT NULL DEFAULT 'development',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  await db.query(`
    CREATE INDEX IF NOT EXISTS idx_test_suites_started_at ON test_suites(started_at DESC)
  `);

  // User journeys table
  await db.query(`
    CREATE TABLE IF NOT EXISTS user_journeys (
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL,
      user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
      started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      ended_at TIMESTAMPTZ,
      steps JSONB NOT NULL DEFAULT '[]'::jsonb,
      errors JSONB NOT NULL DEFAULT '[]'::jsonb,
      metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  await db.query(`
    CREATE INDEX IF NOT EXISTS idx_user_journeys_session_id ON user_journeys(session_id)
  `);
  await db.query(`
    CREATE INDEX IF NOT EXISTS idx_user_journeys_user_id ON user_journeys(user_id)
  `);
  await db.query(`
    CREATE INDEX IF NOT EXISTS idx_user_journeys_started_at ON user_journeys(started_at DESC)
  `);

  // Tracked errors table
  await db.query(`
    CREATE TABLE IF NOT EXISTS tracked_errors (
      id TEXT PRIMARY KEY,
      error_hash TEXT NOT NULL,
      type TEXT NOT NULL,
      message TEXT NOT NULL,
      stack TEXT,
      user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
      session_id TEXT,
      path TEXT,
      user_agent TEXT,
      context JSONB NOT NULL DEFAULT '{}'::jsonb,
      resolved BOOLEAN NOT NULL DEFAULT FALSE,
      resolved_at TIMESTAMPTZ,
      occurrences INT NOT NULL DEFAULT 1,
      last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  await db.query(`
    CREATE INDEX IF NOT EXISTS idx_tracked_errors_error_hash ON tracked_errors(error_hash)
  `);
  await db.query(`
    CREATE INDEX IF NOT EXISTS idx_tracked_errors_resolved ON tracked_errors(resolved)
  `);
  await db.query(`
    CREATE INDEX IF NOT EXISTS idx_tracked_errors_created_at ON tracked_errors(created_at DESC)
  `);

  // Request logs table (for metrics)
  await db.query(`
    CREATE TABLE IF NOT EXISTS request_logs (
      id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
      user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
      method TEXT NOT NULL,
      path TEXT NOT NULL,
      status_code INT NOT NULL,
      response_time INT NOT NULL,
      ip_address TEXT,
      user_agent TEXT,
      error_message TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  await db.query(`
    CREATE INDEX IF NOT EXISTS idx_request_logs_created_at ON request_logs(created_at DESC)
  `);
  await db.query(`
    CREATE INDEX IF NOT EXISTS idx_request_logs_user_id ON request_logs(user_id)
  `);
  await db.query(`
    CREATE INDEX IF NOT EXISTS idx_request_logs_status_code ON request_logs(status_code)
  `);

  // Cleanup old logs function (keeps last 7 days)
  await db.query(`
    CREATE OR REPLACE FUNCTION cleanup_old_logs()
    RETURNS void AS $$
    BEGIN
      DELETE FROM request_logs WHERE created_at < NOW() - INTERVAL '7 days';
      DELETE FROM test_suites WHERE created_at < NOW() - INTERVAL '30 days';
    END;
    $$ LANGUAGE plpgsql
  `);

  log.info('Monitoring tables created successfully');
}

export async function down(): Promise<void> {
  log.info('Dropping monitoring tables...');

  await db.query('DROP FUNCTION IF EXISTS cleanup_old_logs()');
  await db.query('DROP TABLE IF EXISTS request_logs');
  await db.query('DROP TABLE IF EXISTS tracked_errors');
  await db.query('DROP TABLE IF EXISTS user_journeys');
  await db.query('DROP TABLE IF EXISTS test_suites');

  log.info('Monitoring tables dropped');
}
