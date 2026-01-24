/**
 * Migration 140: User Classification System
 *
 * Adds user_category column for better analytics and filtering:
 * - owner: Site owner
 * - team: Internal team/developers
 * - beta_tester: Beta testers
 * - friends_family: Friends and family early users
 * - public: Regular public users
 * - test: Test/automated accounts (excluded from stats)
 *
 * DESTRUCTIVE: Down migration drops user_category column, indexes, and trigger
 */

import { query, queryOne } from '../client';
import { loggers } from '../../lib/logger';

const log = loggers.db;

export async function up(): Promise<void> {
  log.info('Running migration: 140_user_categories');

  // 1. Add user_category column with CHECK constraint
  await query(`
    ALTER TABLE users
    ADD COLUMN IF NOT EXISTS user_category TEXT DEFAULT 'public'
    CHECK (user_category IN ('owner', 'team', 'beta_tester', 'friends_family', 'public', 'test'))
  `);

  // 2. Add index for category-based filtering
  await query(`
    CREATE INDEX IF NOT EXISTS idx_users_category ON users(user_category)
  `);

  // 3. Add partial index for real users (excludes test)
  await query(`
    CREATE INDEX IF NOT EXISTS idx_users_real ON users(created_at DESC)
    WHERE user_category != 'test'
  `);

  // 4. Classify existing users

  // Owner
  await query(`
    UPDATE users SET user_category = 'owner'
    WHERE username = 'jeanpaulniko'
  `);

  // Test users by email pattern
  await query(`
    UPDATE users SET user_category = 'test'
    WHERE user_category = 'public'
      AND (
        email LIKE '%@test.com'
        OR email LIKE '%@test.local'
        OR email LIKE '%@example.com'
        OR username LIKE 'test\\_%'
        OR username LIKE 'debug%'
        OR username LIKE 'apitest%'
        OR username LIKE 'filetest%'
      )
  `);

  // Check if is_beta_tester column exists
  const hasBetaTester = await queryOne<{ column_name: string }>(`
    SELECT column_name FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'is_beta_tester'
  `);

  if (hasBetaTester) {
    await query(`
      UPDATE users SET user_category = 'beta_tester'
      WHERE is_beta_tester = TRUE
        AND user_category = 'public'
    `);
  }

  // Friends & family (known emails)
  await query(`
    UPDATE users SET user_category = 'friends_family'
    WHERE email IN (
      'remipann@gmail.com',
      'tianduriejd@gmail.com',
      'nmiehlke@gmail.com'
    ) AND user_category = 'public'
  `);

  // Veronika is beta_tester (override friends_family if needed)
  await query(`
    UPDATE users SET user_category = 'beta_tester'
    WHERE email = 'vpokrovskaia@gmail.com'
  `);

  // 5. Create trigger to auto-classify test users on INSERT
  await query(`
    CREATE OR REPLACE FUNCTION auto_classify_user_category()
    RETURNS TRIGGER AS $$
    BEGIN
      -- Auto-detect test users by email/username pattern
      IF NEW.user_category = 'public' OR NEW.user_category IS NULL THEN
        IF NEW.email LIKE '%@test.com'
           OR NEW.email LIKE '%@test.local'
           OR NEW.email LIKE '%@example.com'
           OR NEW.username LIKE 'test\\_%'
           OR NEW.username LIKE 'debug%'
           OR NEW.username LIKE 'apitest%'
           OR NEW.username LIKE 'filetest%'
           OR NEW.username LIKE 'e2e\\_%' THEN
          NEW.user_category := 'test';
        END IF;
      END IF;

      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql
  `);

  await query(`
    DROP TRIGGER IF EXISTS trg_auto_classify_user_category ON users
  `);

  await query(`
    CREATE TRIGGER trg_auto_classify_user_category
      BEFORE INSERT ON users
      FOR EACH ROW
      EXECUTE FUNCTION auto_classify_user_category()
  `);

  log.info('Migration 140_user_categories completed');
}

export async function down(): Promise<void> {
  log.info('Reverting migration: 140_user_categories');

  // Drop trigger and function
  await query(`DROP TRIGGER IF EXISTS trg_auto_classify_user_category ON users`);
  await query(`DROP FUNCTION IF EXISTS auto_classify_user_category()`);

  // Drop indexes
  await query(`DROP INDEX IF EXISTS idx_users_real`);
  await query(`DROP INDEX IF EXISTS idx_users_category`);

  // Drop column
  await query(`ALTER TABLE users DROP COLUMN IF EXISTS user_category`);

  log.info('Migration 140_user_categories reverted');
}
