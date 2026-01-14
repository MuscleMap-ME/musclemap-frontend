/**
 * Migration: Test Scorecards System
 *
 * Adds table for storing API test scorecard results,
 * used by the Empire Dashboard to track test health over time.
 */

import { db } from '../client';
import { loggers } from '../../lib/logger';

const log = loggers.db;

async function tableExists(tableName: string): Promise<boolean> {
  const result = await db.queryOne<{ count: string }>(
    `SELECT COUNT(*) as count FROM information_schema.tables
     WHERE table_schema = 'public' AND table_name = $1`,
    [tableName]
  );
  return parseInt(result?.count || '0') > 0;
}

export async function up(): Promise<void> {
  log.info('Running migration: 066_test_scorecards');

  // ============================================
  // TEST SCORECARDS TABLE
  // ============================================
  if (!(await tableExists('test_scorecards'))) {
    log.info('Creating test_scorecards table...');
    await db.query(`
      CREATE TABLE test_scorecards (
        id TEXT PRIMARY KEY,
        score INTEGER NOT NULL CHECK (score >= 0 AND score <= 100),
        grade TEXT NOT NULL CHECK (grade IN ('A+', 'A', 'A-', 'B+', 'B', 'B-', 'C+', 'C', 'C-', 'D+', 'D', 'D-', 'F')),
        total_tests INTEGER NOT NULL DEFAULT 0,
        passed INTEGER NOT NULL DEFAULT 0,
        failed INTEGER NOT NULL DEFAULT 0,
        skipped INTEGER NOT NULL DEFAULT 0,
        categories JSONB NOT NULL DEFAULT '{}',
        failed_tests JSONB NOT NULL DEFAULT '[]',
        recommendations JSONB NOT NULL DEFAULT '[]',
        target_url TEXT NOT NULL,
        environment TEXT NOT NULL CHECK (environment IN ('development', 'staging', 'production')),
        duration INTEGER NOT NULL DEFAULT 0, -- milliseconds
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    // Index for fetching latest scorecard
    await db.query('CREATE INDEX idx_test_scorecards_created ON test_scorecards(created_at DESC)');

    // Index for filtering by environment
    await db.query('CREATE INDEX idx_test_scorecards_env ON test_scorecards(environment)');

    // Index for filtering by grade
    await db.query('CREATE INDEX idx_test_scorecards_grade ON test_scorecards(grade)');

    log.info('test_scorecards table created');
  }

  log.info('Migration 066_test_scorecards completed');
}

export async function down(): Promise<void> {
  log.info('Rolling back migration: 066_test_scorecards');

  await db.query('DROP TABLE IF EXISTS test_scorecards CASCADE');

  log.info('Rollback 066_test_scorecards completed');
}
