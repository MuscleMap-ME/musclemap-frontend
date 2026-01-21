// SQL-SAFE: Template literals contain static SQL only, no external input
/**
 * Migration: Race Condition Fixes
 *
 * This migration addresses several race conditions identified in security audit:
 *
 * RC-002: Crews - Add unique constraint on user_id to prevent user joining multiple crews
 * RC-004: Rivals - Add bidirectional unique constraint to prevent duplicate rivalries
 *
 * Also creates advisory lock helper functions for RC-001 (credit transfers).
 */

import { db } from '../client';
import { loggers } from '../../lib/logger';

const log = loggers.db;

async function constraintExists(constraintName: string): Promise<boolean> {
  const result = await db.queryOne<{ count: string }>(
    `SELECT COUNT(*) as count FROM information_schema.table_constraints
     WHERE constraint_schema = 'public' AND constraint_name = $1`,
    [constraintName]
  );
  return parseInt(result?.count || '0') > 0;
}

async function indexExists(indexName: string): Promise<boolean> {
  const result = await db.queryOne<{ count: string }>(
    `SELECT COUNT(*) as count FROM pg_indexes
     WHERE schemaname = 'public' AND indexname = $1`,
    [indexName]
  );
  return parseInt(result?.count || '0') > 0;
}

async function functionExists(functionName: string): Promise<boolean> {
  const result = await db.queryOne<{ count: string }>(
    `SELECT COUNT(*) as count FROM pg_proc p
     JOIN pg_namespace n ON p.pronamespace = n.oid
     WHERE n.nspname = 'public' AND p.proname = $1`,
    [functionName]
  );
  return parseInt(result?.count || '0') > 0;
}

export async function up(): Promise<void> {
  log.info('Running migration: 092_race_condition_fixes');

  // ============================================
  // RC-001: Advisory Lock Functions for Credit Transfers
  // These functions provide distributed locking for wallet operations
  // ============================================

  if (!(await functionExists('acquire_wallet_lock'))) {
    log.info('Creating advisory lock functions for wallet operations...');

    // Create a function to acquire an advisory lock on a wallet
    // Uses pg_advisory_xact_lock which automatically releases on transaction end
    await db.query(`
      CREATE OR REPLACE FUNCTION acquire_wallet_lock(wallet_user_id TEXT)
      RETURNS BOOLEAN AS $$
      DECLARE
        lock_id BIGINT;
      BEGIN
        -- Convert user_id to a numeric hash for advisory lock
        -- Using hashtext() which is built into PostgreSQL
        lock_id := hashtext(wallet_user_id)::BIGINT;

        -- Acquire transaction-level advisory lock (automatically released on commit/rollback)
        PERFORM pg_advisory_xact_lock(lock_id);

        RETURN TRUE;
      END;
      $$ LANGUAGE plpgsql;
    `);

    // Create a function to try acquiring lock without blocking
    await db.query(`
      CREATE OR REPLACE FUNCTION try_acquire_wallet_lock(wallet_user_id TEXT)
      RETURNS BOOLEAN AS $$
      DECLARE
        lock_id BIGINT;
      BEGIN
        lock_id := hashtext(wallet_user_id)::BIGINT;
        RETURN pg_try_advisory_xact_lock(lock_id);
      END;
      $$ LANGUAGE plpgsql;
    `);

    log.info('Advisory lock functions created');
  }

  // ============================================
  // RC-002: Crews - Unique constraint on user_id
  // A user can only be a member of ONE crew at a time
  // ============================================

  if (!(await constraintExists('unique_user_one_crew'))) {
    log.info('Adding unique constraint for one-crew-per-user...');

    // First, check if there are any users in multiple crews (data cleanup)
    const duplicates = await db.queryOne<{ count: string }>(
      `SELECT COUNT(*) as count FROM (
         SELECT user_id FROM crew_members GROUP BY user_id HAVING COUNT(*) > 1
       ) duplicates`
    );

    if (parseInt(duplicates?.count || '0') > 0) {
      log.warn(`Found ${duplicates?.count} users in multiple crews - keeping only earliest membership`);

      // Keep only the earliest membership for each user
      await db.query(`
        DELETE FROM crew_members cm1
        WHERE EXISTS (
          SELECT 1 FROM crew_members cm2
          WHERE cm2.user_id = cm1.user_id
            AND cm2.joined_at < cm1.joined_at
        )
      `);
    }

    // Now add the unique constraint
    await db.query(`
      ALTER TABLE crew_members
      ADD CONSTRAINT unique_user_one_crew UNIQUE (user_id)
    `);

    log.info('One-crew-per-user constraint added');
  }

  // ============================================
  // RC-004: Rivals - Bidirectional unique constraint
  // Prevent duplicate rivalries regardless of who challenged whom
  // ============================================

  // First, create a helper function that normalizes the user pair
  if (!(await functionExists('normalize_rivalry_pair'))) {
    log.info('Creating rivalry pair normalization function...');

    await db.query(`
      CREATE OR REPLACE FUNCTION normalize_rivalry_pair(user1 TEXT, user2 TEXT)
      RETURNS TEXT[] AS $$
      BEGIN
        -- Return users in consistent order (alphabetically)
        IF user1 < user2 THEN
          RETURN ARRAY[user1, user2];
        ELSE
          RETURN ARRAY[user2, user1];
        END IF;
      END;
      $$ LANGUAGE plpgsql IMMUTABLE;
    `);

    log.info('Rivalry pair normalization function created');
  }

  // Create a unique index that enforces bidirectional uniqueness
  // Only for non-declined/non-ended rivalries
  if (!(await indexExists('idx_rivalries_bidirectional_unique'))) {
    log.info('Creating bidirectional unique index for rivalries...');

    // First check for existing bidirectional duplicates
    const bidirectionalDuplicates = await db.queryOne<{ count: string }>(
      `SELECT COUNT(*) as count FROM (
         SELECT normalize_rivalry_pair(challenger_id, challenged_id) as pair
         FROM rivalries
         WHERE status IN ('pending', 'active')
         GROUP BY normalize_rivalry_pair(challenger_id, challenged_id)
         HAVING COUNT(*) > 1
       ) dups`
    );

    if (parseInt(bidirectionalDuplicates?.count || '0') > 0) {
      log.warn(`Found ${bidirectionalDuplicates?.count} bidirectional duplicate rivalries - keeping earliest`);

      // Keep only the earliest rivalry for each user pair
      await db.query(`
        DELETE FROM rivalries r1
        WHERE status IN ('pending', 'active')
          AND EXISTS (
            SELECT 1 FROM rivalries r2
            WHERE r2.status IN ('pending', 'active')
              AND r2.id != r1.id
              AND normalize_rivalry_pair(r2.challenger_id, r2.challenged_id) =
                  normalize_rivalry_pair(r1.challenger_id, r1.challenged_id)
              AND r2.created_at < r1.created_at
          )
      `);
    }

    // Create unique index using the normalized pair
    // This ensures (A challenges B) and (B challenges A) cannot both exist
    await db.query(`
      CREATE UNIQUE INDEX idx_rivalries_bidirectional_unique
      ON rivalries ((normalize_rivalry_pair(challenger_id, challenged_id)))
      WHERE status IN ('pending', 'active')
    `);

    log.info('Bidirectional unique index for rivalries created');
  }

  // ============================================
  // Additional index for rivalry lookup performance
  // ============================================

  if (!(await indexExists('idx_rivalries_both_users'))) {
    await db.query(`
      CREATE INDEX idx_rivalries_both_users
      ON rivalries (LEAST(challenger_id, challenged_id), GREATEST(challenger_id, challenged_id))
      WHERE status IN ('pending', 'active')
    `);
    log.info('Added rivalries lookup index');
  }

  log.info('Migration 092_race_condition_fixes completed');
}

export async function down(): Promise<void> {
  log.info('Rolling back migration: 092_race_condition_fixes');

  // Drop indexes
  await db.query('DROP INDEX IF EXISTS idx_rivalries_bidirectional_unique');
  await db.query('DROP INDEX IF EXISTS idx_rivalries_both_users');

  // Drop constraints
  await db.query('ALTER TABLE crew_members DROP CONSTRAINT IF EXISTS unique_user_one_crew');

  // Drop functions
  await db.query('DROP FUNCTION IF EXISTS acquire_wallet_lock(TEXT)');
  await db.query('DROP FUNCTION IF EXISTS try_acquire_wallet_lock(TEXT)');
  await db.query('DROP FUNCTION IF EXISTS normalize_rivalry_pair(TEXT, TEXT)');

  log.info('Rollback 092_race_condition_fixes completed');
}
