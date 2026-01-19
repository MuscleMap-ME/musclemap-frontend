/**
 * Migration 130: Mascot Credit Loans System
 *
 * Adds support for mascot credit loans feature (Stage 5+):
 * - Credit loan records
 * - Loan configuration
 * - Emergency grant tracking
 */

import { query } from '../client';
import { loggers } from '../../lib/logger';

const log = loggers.db;

export async function up(): Promise<void> {
  log.info('Running migration: 130_mascot_credit_loans');

  // =====================================================
  // CREDIT LOANS TABLE
  // =====================================================
  log.info('Creating mascot credit loans table...');

  await query(`
    CREATE TABLE IF NOT EXISTS mascot_credit_loans (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      amount INTEGER NOT NULL,
      interest_rate DECIMAL(4,3) DEFAULT 0.000,
      amount_repaid INTEGER DEFAULT 0,
      repaid BOOLEAN DEFAULT FALSE,
      repaid_at TIMESTAMPTZ,
      due_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '30 days'),
      companion_stage INTEGER DEFAULT 5,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      CONSTRAINT positive_loan_amount CHECK (amount > 0),
      CONSTRAINT valid_interest_rate CHECK (interest_rate >= 0 AND interest_rate < 1)
    )
  `);

  await query(`
    CREATE INDEX IF NOT EXISTS idx_credit_loans_user_active
    ON mascot_credit_loans(user_id, repaid, created_at DESC)
    WHERE repaid = FALSE
  `);

  await query(`
    CREATE INDEX IF NOT EXISTS idx_credit_loans_due
    ON mascot_credit_loans(due_at)
    WHERE repaid = FALSE
  `);

  // =====================================================
  // EMERGENCY GRANTS TABLE (Stage 6)
  // =====================================================
  log.info('Creating emergency grants table...');

  await query(`
    CREATE TABLE IF NOT EXISTS mascot_emergency_grants (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      amount INTEGER NOT NULL,
      occasion VARCHAR(50) NOT NULL,
      context_id TEXT,
      companion_stage INTEGER DEFAULT 6,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      CONSTRAINT positive_grant_amount CHECK (amount > 0),
      CONSTRAINT valid_occasion CHECK (occasion IN (
        'streak_save', 'workout_completion', 'goal_reached', 'rank_up', 'emergency'
      ))
    )
  `);

  await query(`
    CREATE INDEX IF NOT EXISTS idx_emergency_grants_user_day
    ON mascot_emergency_grants(user_id, created_at DESC)
  `);

  // =====================================================
  // HELPER FUNCTIONS
  // =====================================================
  log.info('Creating helper functions...');

  // Function to get user's total outstanding loan balance
  await query(`
    CREATE OR REPLACE FUNCTION get_user_loan_balance(p_user_id TEXT)
    RETURNS TABLE(
      total_borrowed INTEGER,
      total_owed INTEGER,
      total_repaid INTEGER,
      active_loans INTEGER
    ) AS $$
    BEGIN
      RETURN QUERY
      SELECT
        COALESCE(SUM(amount), 0)::INTEGER AS total_borrowed,
        COALESCE(SUM(amount + FLOOR(amount * interest_rate)::INTEGER - amount_repaid), 0)::INTEGER AS total_owed,
        COALESCE(SUM(amount_repaid), 0)::INTEGER AS total_repaid,
        COUNT(*)::INTEGER AS active_loans
      FROM mascot_credit_loans
      WHERE user_id = p_user_id AND repaid = FALSE;
    END;
    $$ LANGUAGE plpgsql
  `);

  // Function to get daily emergency grant usage
  await query(`
    CREATE OR REPLACE FUNCTION get_daily_grant_usage(p_user_id TEXT)
    RETURNS INTEGER AS $$
    DECLARE
      v_total INTEGER;
    BEGIN
      SELECT COALESCE(SUM(amount), 0) INTO v_total
      FROM mascot_emergency_grants
      WHERE user_id = p_user_id
        AND created_at >= CURRENT_DATE;
      RETURN v_total;
    END;
    $$ LANGUAGE plpgsql
  `);

  // Function to check if loan is overdue
  await query(`
    CREATE OR REPLACE FUNCTION check_overdue_loans()
    RETURNS TABLE(
      loan_id UUID,
      user_id TEXT,
      amount_owed INTEGER,
      days_overdue INTEGER
    ) AS $$
    BEGIN
      RETURN QUERY
      SELECT
        l.id AS loan_id,
        l.user_id,
        (l.amount + FLOOR(l.amount * l.interest_rate)::INTEGER - l.amount_repaid) AS amount_owed,
        EXTRACT(DAY FROM (NOW() - l.due_at))::INTEGER AS days_overdue
      FROM mascot_credit_loans l
      WHERE l.repaid = FALSE AND l.due_at < NOW()
      ORDER BY days_overdue DESC;
    END;
    $$ LANGUAGE plpgsql
  `);

  log.info('Migration 130_mascot_credit_loans complete');
}

export async function down(): Promise<void> {
  log.info('Rolling back migration: 130_mascot_credit_loans');

  await query(`DROP FUNCTION IF EXISTS check_overdue_loans()`);
  await query(`DROP FUNCTION IF EXISTS get_daily_grant_usage(TEXT)`);
  await query(`DROP FUNCTION IF EXISTS get_user_loan_balance(TEXT)`);
  await query(`DROP TABLE IF EXISTS mascot_emergency_grants`);
  await query(`DROP TABLE IF EXISTS mascot_credit_loans`);

  log.info('Rollback 130_mascot_credit_loans complete');
}
