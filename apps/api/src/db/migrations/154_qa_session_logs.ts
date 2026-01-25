/**
 * Migration: QA Session Logs
 *
 * Creates table for storing frontend QA session events for passive testing.
 * This allows comprehensive bug detection during user testing sessions.
 */

import { db, query } from '../client';
import { loggers } from '../../lib/logger';

const log = loggers.db;

export async function migrate(): Promise<void> {
  log.info('Running migration: 154_qa_session_logs');

  // Create the QA session logs table
  await query(`
    CREATE TABLE IF NOT EXISTS qa_session_logs (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      session_id TEXT NOT NULL,
      user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
      event_type TEXT NOT NULL,
      event_data JSONB NOT NULL DEFAULT '{}',
      url TEXT,
      user_agent TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  // Index for querying by session
  await query(`
    CREATE INDEX IF NOT EXISTS idx_qa_session_logs_session ON qa_session_logs(session_id)
  `);

  // Index for querying by event type
  await query(`
    CREATE INDEX IF NOT EXISTS idx_qa_session_logs_type ON qa_session_logs(event_type)
  `);

  // Index for querying recent logs
  await query(`
    CREATE INDEX IF NOT EXISTS idx_qa_session_logs_recent ON qa_session_logs(created_at DESC)
  `);

  // Partial index for errors only (most common query)
  await query(`
    CREATE INDEX IF NOT EXISTS idx_qa_session_logs_errors ON qa_session_logs(session_id, created_at)
    WHERE event_type IN ('js_error', 'promise_rejection', 'console_error', 'graphql_error', 'network_error')
  `);

  log.info('Migration 154_qa_session_logs completed');
}
