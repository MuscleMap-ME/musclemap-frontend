/**
 * Migration 126: Text Search Indexes (PERF-003)
 *
 * Add trigram indexes for efficient ILIKE text search on:
 * - communities (name, tagline, description)
 * - users (username, display_name)
 *
 * This enables ~100-1000x faster text searches by avoiding sequential scans.
 */

import { db } from '../client';
import { loggers } from '../../lib/logger';

const log = loggers.db;

async function indexExists(indexName: string): Promise<boolean> {
  const result = await db.queryOne<{ count: string }>(
    `SELECT COUNT(*) as count FROM pg_indexes WHERE indexname = $1`,
    [indexName]
  );
  return parseInt(result?.count || '0') > 0;
}

export async function up(): Promise<void> {
  log.info('Creating text search indexes (Migration 126)...');

  // Enable pg_trgm extension if not already enabled
  await db.query(`CREATE EXTENSION IF NOT EXISTS pg_trgm`);

  // Add trigram indexes for community search
  // These support efficient ILIKE '%search%' queries
  if (!(await indexExists('idx_communities_name_trgm'))) {
    await db.query(`
      CREATE INDEX idx_communities_name_trgm
      ON communities USING gin(name gin_trgm_ops)
    `);
    log.info('  Created idx_communities_name_trgm');
  }

  if (!(await indexExists('idx_communities_tagline_trgm'))) {
    await db.query(`
      CREATE INDEX idx_communities_tagline_trgm
      ON communities USING gin(tagline gin_trgm_ops)
      WHERE tagline IS NOT NULL
    `);
    log.info('  Created idx_communities_tagline_trgm');
  }

  if (!(await indexExists('idx_communities_description_trgm'))) {
    await db.query(`
      CREATE INDEX idx_communities_description_trgm
      ON communities USING gin(description gin_trgm_ops)
      WHERE description IS NOT NULL
    `);
    log.info('  Created idx_communities_description_trgm');
  }

  // Add trigram indexes for user search
  if (!(await indexExists('idx_users_username_trgm'))) {
    await db.query(`
      CREATE INDEX idx_users_username_trgm
      ON users USING gin(username gin_trgm_ops)
    `);
    log.info('  Created idx_users_username_trgm');
  }

  if (!(await indexExists('idx_users_display_name_trgm'))) {
    await db.query(`
      CREATE INDEX idx_users_display_name_trgm
      ON users USING gin(display_name gin_trgm_ops)
      WHERE display_name IS NOT NULL
    `);
    log.info('  Created idx_users_display_name_trgm');
  }

  // Add trigram index for exercise search
  if (!(await indexExists('idx_exercises_name_trgm'))) {
    await db.query(`
      CREATE INDEX idx_exercises_name_trgm
      ON exercises USING gin(name gin_trgm_ops)
    `);
    log.info('  Created idx_exercises_name_trgm');
  }

  // Add keyset pagination indexes for community members (PERF-004 partial fix)
  if (!(await indexExists('idx_community_memberships_keyset'))) {
    await db.query(`
      CREATE INDEX idx_community_memberships_keyset
      ON community_memberships(community_id, joined_at DESC, user_id DESC)
    `);
    log.info('  Created idx_community_memberships_keyset');
  }

  // Add keyset pagination index for credit ledger (PERF-004 partial fix)
  if (!(await indexExists('idx_credit_ledger_user_keyset'))) {
    await db.query(`
      CREATE INDEX idx_credit_ledger_user_keyset
      ON credit_ledger(user_id, created_at DESC, id DESC)
    `);
    log.info('  Created idx_credit_ledger_user_keyset');
  }

  log.info('✅ Migration 126 complete: Text search indexes created');
}

export async function down(): Promise<void> {
  log.info('Rolling back text search indexes (Migration 126)...');

  // Drop trigram indexes
  await db.query('DROP INDEX IF EXISTS idx_communities_name_trgm');
  await db.query('DROP INDEX IF EXISTS idx_communities_tagline_trgm');
  await db.query('DROP INDEX IF EXISTS idx_communities_description_trgm');
  await db.query('DROP INDEX IF EXISTS idx_users_username_trgm');
  await db.query('DROP INDEX IF EXISTS idx_users_display_name_trgm');
  await db.query('DROP INDEX IF EXISTS idx_exercises_name_trgm');

  // Drop keyset pagination indexes
  await db.query('DROP INDEX IF EXISTS idx_community_memberships_keyset');
  await db.query('DROP INDEX IF EXISTS idx_credit_ledger_user_keyset');

  // Note: We don't drop pg_trgm extension as other things might depend on it

  log.info('✅ Migration 126 rollback complete');
}
