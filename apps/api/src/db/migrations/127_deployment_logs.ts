/**
 * Migration 127: Deployment Logs System
 *
 * Creates tables for tracking deployment operations:
 * - deployment_logs: Audit log of all deployment commands
 *
 * Used by the deployment management API for Claude Code integration.
 */

import { query } from '../client';
import { loggers } from '../../lib/logger';

const log = loggers.db;

export async function up(): Promise<void> {
  log.info('Running migration 127: Deployment Logs System');

  // ============================================
  // DEPLOYMENT LOGS TABLE
  // ============================================
  await query(`
    CREATE TABLE IF NOT EXISTS deployment_logs (
      id VARCHAR(50) PRIMARY KEY,
      command_key VARCHAR(50),
      sequence_key VARCHAR(50),
      initiated_by VARCHAR(20) NOT NULL DEFAULT 'api' CHECK (initiated_by IN ('api', 'web', 'webhook')),
      initiator_ip VARCHAR(45) NOT NULL,
      initiator_user_id VARCHAR(50),
      status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'success', 'failed', 'timeout', 'cancelled')),
      output TEXT NOT NULL DEFAULT '',
      error TEXT,
      exit_code INTEGER,
      started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      completed_at TIMESTAMPTZ,
      duration_ms INTEGER,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `, []);

  log.info('Created deployment_logs table');

  // ============================================
  // INDEXES
  // ============================================
  await query(`CREATE INDEX IF NOT EXISTS idx_deployment_logs_started_at ON deployment_logs (started_at DESC)`, []);
  await query(`CREATE INDEX IF NOT EXISTS idx_deployment_logs_status ON deployment_logs (status)`, []);
  await query(`CREATE INDEX IF NOT EXISTS idx_deployment_logs_initiated_by ON deployment_logs (initiated_by)`, []);
  await query(`CREATE INDEX IF NOT EXISTS idx_deployment_logs_user ON deployment_logs (initiator_user_id)`, []);
  await query(`CREATE INDEX IF NOT EXISTS idx_deployment_logs_sequence ON deployment_logs (sequence_key, started_at DESC)`, []);
  await query(`CREATE INDEX IF NOT EXISTS idx_deployment_logs_keyset ON deployment_logs (started_at DESC, id DESC)`, []);

  log.info('Created indexes for deployment_logs');
  log.info('Migration 127 complete');
}

export async function down(): Promise<void> {
  log.info('Rolling back migration 127: Deployment Logs System');
  await query(`DROP TABLE IF EXISTS deployment_logs CASCADE`, []);
  log.info('Migration 127 rollback complete');
}
