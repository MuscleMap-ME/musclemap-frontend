/**
 * Migration: Wealth Tier System
 *
 * Adds wealth tier tracking to users based on credit balance:
 * - Tier 0: Broke (0-9 credits)
 * - Tier 1: Bronze (10-99 credits)
 * - Tier 2: Silver (100-999 credits)
 * - Tier 3: Gold (1,000-9,999 credits)
 * - Tier 4: Platinum (10,000-99,999 credits)
 * - Tier 5: Diamond (100,000-999,999 credits)
 * - Tier 6: Obsidian (1,000,000+ credits)
 *
 * Also adds bio, bio_rich_json, and social_links columns to users table.
 */

import { db } from '../client';
import { loggers } from '../../lib/logger';

const log = loggers.db;

async function columnExists(tableName: string, columnName: string): Promise<boolean> {
  const result = await db.queryOne<{ count: string }>(
    `SELECT COUNT(*) as count FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = $1 AND column_name = $2`,
    [tableName, columnName]
  );
  return parseInt(result?.count || '0') > 0;
}

async function functionExists(funcName: string): Promise<boolean> {
  const result = await db.queryOne<{ count: string }>(
    `SELECT COUNT(*) as count FROM pg_proc
     WHERE proname = $1`,
    [funcName]
  );
  return parseInt(result?.count || '0') > 0;
}

async function triggerExists(triggerName: string): Promise<boolean> {
  const result = await db.queryOne<{ count: string }>(
    `SELECT COUNT(*) as count FROM pg_trigger
     WHERE tgname = $1`,
    [triggerName]
  );
  return parseInt(result?.count || '0') > 0;
}

export async function up(): Promise<void> {
  log.info('Running migration: 065_wealth_tiers');

  // ============================================
  // ADD WEALTH TIER COLUMN TO USERS
  // ============================================
  if (!(await columnExists('users', 'wealth_tier'))) {
    log.info('Adding wealth_tier column to users table...');
    await db.query(`ALTER TABLE users ADD COLUMN wealth_tier INTEGER DEFAULT 0`);
  }

  if (!(await columnExists('users', 'wealth_tier_updated_at'))) {
    log.info('Adding wealth_tier_updated_at column to users table...');
    await db.query(`ALTER TABLE users ADD COLUMN wealth_tier_updated_at TIMESTAMPTZ`);
  }

  // ============================================
  // ADD BIO COLUMNS TO USERS
  // ============================================
  if (!(await columnExists('users', 'bio'))) {
    log.info('Adding bio column to users table...');
    await db.query(`ALTER TABLE users ADD COLUMN bio TEXT`);
  }

  if (!(await columnExists('users', 'bio_rich_json'))) {
    log.info('Adding bio_rich_json column to users table...');
    await db.query(`ALTER TABLE users ADD COLUMN bio_rich_json JSONB`);
  }

  // ============================================
  // ADD SOCIAL LINKS COLUMN TO USERS
  // ============================================
  if (!(await columnExists('users', 'social_links'))) {
    log.info('Adding social_links column to users table...');
    await db.query(`ALTER TABLE users ADD COLUMN social_links JSONB DEFAULT '{}'`);
  }

  // ============================================
  // CREATE WEALTH TIER CALCULATION FUNCTION
  // ============================================
  log.info('Creating calculate_wealth_tier function...');
  await db.query(`
    CREATE OR REPLACE FUNCTION calculate_wealth_tier(credits BIGINT) RETURNS INTEGER AS $$
    BEGIN
      IF credits >= 1000000 THEN RETURN 6; -- Obsidian
      ELSIF credits >= 100000 THEN RETURN 5; -- Diamond
      ELSIF credits >= 10000 THEN RETURN 4; -- Platinum
      ELSIF credits >= 1000 THEN RETURN 3; -- Gold
      ELSIF credits >= 100 THEN RETURN 2; -- Silver
      ELSIF credits >= 10 THEN RETURN 1; -- Bronze
      ELSE RETURN 0; -- Broke
      END IF;
    END;
    $$ LANGUAGE plpgsql IMMUTABLE
  `);

  // ============================================
  // CREATE TRIGGER FUNCTION FOR WEALTH TIER UPDATE
  // ============================================
  log.info('Creating update_wealth_tier trigger function...');
  await db.query(`
    CREATE OR REPLACE FUNCTION update_wealth_tier() RETURNS TRIGGER AS $$
    BEGIN
      UPDATE users
      SET wealth_tier = calculate_wealth_tier(NEW.balance),
          wealth_tier_updated_at = NOW()
      WHERE id = NEW.user_id;
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql
  `);

  // ============================================
  // CREATE TRIGGER ON CREDIT_BALANCES
  // ============================================
  if (await triggerExists('trigger_update_wealth_tier')) {
    log.info('Dropping existing trigger_update_wealth_tier...');
    await db.query('DROP TRIGGER trigger_update_wealth_tier ON credit_balances');
  }

  log.info('Creating trigger_update_wealth_tier on credit_balances...');
  await db.query(`
    CREATE TRIGGER trigger_update_wealth_tier
    AFTER INSERT OR UPDATE OF balance ON credit_balances
    FOR EACH ROW EXECUTE FUNCTION update_wealth_tier()
  `);

  // ============================================
  // BACKFILL EXISTING USER WEALTH TIERS
  // ============================================
  log.info('Backfilling existing user wealth tiers...');
  await db.query(`
    UPDATE users u
    SET wealth_tier = calculate_wealth_tier(COALESCE(cb.balance, 0)),
        wealth_tier_updated_at = NOW()
    FROM credit_balances cb
    WHERE u.id = cb.user_id
  `);

  // Also set default tier for users without credit balance records
  await db.query(`
    UPDATE users
    SET wealth_tier = 0,
        wealth_tier_updated_at = NOW()
    WHERE wealth_tier IS NULL
  `);

  // ============================================
  // CREATE INDEX FOR WEALTH TIER QUERIES
  // ============================================
  log.info('Creating index on users.wealth_tier...');
  await db.query(`
    CREATE INDEX IF NOT EXISTS idx_users_wealth_tier ON users(wealth_tier)
  `);

  log.info('Migration 065_wealth_tiers completed');
}

export async function down(): Promise<void> {
  log.info('Rolling back migration: 065_wealth_tiers');

  // Drop trigger
  await db.query('DROP TRIGGER IF EXISTS trigger_update_wealth_tier ON credit_balances');

  // Drop functions
  await db.query('DROP FUNCTION IF EXISTS update_wealth_tier()');
  await db.query('DROP FUNCTION IF EXISTS calculate_wealth_tier(BIGINT)');

  // Drop index
  await db.query('DROP INDEX IF EXISTS idx_users_wealth_tier');

  // Drop columns
  await db.query('ALTER TABLE users DROP COLUMN IF EXISTS wealth_tier');
  await db.query('ALTER TABLE users DROP COLUMN IF EXISTS wealth_tier_updated_at');
  await db.query('ALTER TABLE users DROP COLUMN IF EXISTS bio');
  await db.query('ALTER TABLE users DROP COLUMN IF EXISTS bio_rich_json');
  await db.query('ALTER TABLE users DROP COLUMN IF EXISTS social_links');

  log.info('Rollback 065_wealth_tiers completed');
}

export const migrate = up;
