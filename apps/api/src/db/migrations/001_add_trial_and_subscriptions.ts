/**
 * Migration: Add trial dates and subscriptions table
 *
 * This migration:
 * 1. Adds trial_started_at and trial_ends_at columns to users table
 * 2. Creates the subscriptions table
 * 3. Sets trial dates for existing users based on their created_at
 */

import { db } from '../client';
import { loggers } from '../../lib/logger';

const log = loggers.db;

export async function migrate(): Promise<void> {
  log.info('Running migration: 001_add_trial_and_subscriptions');

  // Check if columns already exist using PostgreSQL information_schema
  const columnCheck = await db.queryOne<{ count: string }>(
    `SELECT COUNT(*) as count FROM information_schema.columns
     WHERE table_name = 'users' AND column_name = 'trial_started_at'`
  );
  const hasTrialStarted = parseInt(columnCheck?.count || '0') > 0;

  if (!hasTrialStarted) {
    log.info('Adding trial columns to users table...');

    // Add trial columns
    await db.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS trial_started_at TIMESTAMP`);
    await db.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMP`);

    // Set trial dates for existing users based on created_at
    // Give them 90 days from their account creation
    await db.query(`
      UPDATE users
      SET trial_started_at = created_at,
          trial_ends_at = created_at + INTERVAL '90 days'
      WHERE trial_started_at IS NULL
    `);

    log.info('Trial columns added and backfilled for existing users');
  } else {
    log.info('Trial columns already exist, skipping...');
  }

  // Check if subscriptions table exists
  const tableCheck = await db.queryOne<{ count: string }>(
    `SELECT COUNT(*) as count FROM information_schema.tables
     WHERE table_name = 'subscriptions'`
  );
  const hasTable = parseInt(tableCheck?.count || '0') > 0;

  if (!hasTable) {
    log.info('Creating subscriptions table...');

    await db.query(`
      CREATE TABLE IF NOT EXISTS subscriptions (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        stripe_customer_id TEXT,
        stripe_subscription_id TEXT UNIQUE,
        status TEXT NOT NULL DEFAULT 'inactive',
        current_period_start TIMESTAMP,
        current_period_end TIMESTAMP,
        cancel_at_period_end BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await db.query(`CREATE INDEX IF NOT EXISTS idx_subscriptions_user ON subscriptions(user_id)`);
    await db.query(`CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe ON subscriptions(stripe_subscription_id)`);

    log.info('Subscriptions table created');
  } else {
    log.info('Subscriptions table already exists, skipping...');
  }

  log.info('Migration 001_add_trial_and_subscriptions complete');
}
