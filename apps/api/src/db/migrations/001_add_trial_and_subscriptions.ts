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

export function migrate(): void {
  log.info('Running migration: 001_add_trial_and_subscriptions');

  // Check if columns already exist
  const tableInfo = db.prepare("PRAGMA table_info(users)").all() as { name: string }[];
  const hasTrialStarted = tableInfo.some(col => col.name === 'trial_started_at');

  if (!hasTrialStarted) {
    log.info('Adding trial columns to users table...');

    // Add trial columns
    db.exec(`
      ALTER TABLE users ADD COLUMN trial_started_at TEXT;
      ALTER TABLE users ADD COLUMN trial_ends_at TEXT;
    `);

    // Set trial dates for existing users based on created_at
    // Give them 90 days from their account creation
    db.exec(`
      UPDATE users
      SET trial_started_at = created_at,
          trial_ends_at = datetime(created_at, '+90 days')
      WHERE trial_started_at IS NULL;
    `);

    log.info('Trial columns added and backfilled for existing users');
  } else {
    log.info('Trial columns already exist, skipping...');
  }

  // Check if subscriptions table exists
  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='subscriptions'").get();

  if (!tables) {
    log.info('Creating subscriptions table...');

    db.exec(`
      CREATE TABLE IF NOT EXISTS subscriptions (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        stripe_customer_id TEXT,
        stripe_subscription_id TEXT UNIQUE,
        status TEXT NOT NULL DEFAULT 'inactive',
        current_period_start TEXT,
        current_period_end TEXT,
        cancel_at_period_end INTEGER DEFAULT 0,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now'))
      );

      CREATE INDEX IF NOT EXISTS idx_subscriptions_user ON subscriptions(user_id);
      CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe ON subscriptions(stripe_subscription_id);
    `);

    log.info('Subscriptions table created');
  } else {
    log.info('Subscriptions table already exists, skipping...');
  }

  log.info('Migration 001_add_trial_and_subscriptions complete');
}
