// SQL-SAFE: Template literals contain static SQL only, no external input
/**
 * Migration: Performance Optimization Indexes
 *
 * Creates high-impact indexes for common query patterns:
 * 1. Covering index for leaderboard queries (major performance win)
 * 2. BRIN index for time-series activity events
 * 3. Index for workout keyset pagination
 * 4. Index for credit ledger queries (rate limiting)
 * 5. Index for community feed (reduce N+1)
 * 6. Index for rivalry lookups
 * 7. Index for crew member lookups
 * 8. Index for message pagination
 *
 * Note: BRIN indexes are ideal for time-series data where values correlate
 * with physical storage order (like created_at on append-only tables).
 *
 * See docs/DATABASE-OPTIMIZATION-PLAN.md for full optimization roadmap.
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

async function tableExists(tableName: string): Promise<boolean> {
  const result = await db.queryOne<{ count: string }>(
    `SELECT COUNT(*) as count FROM information_schema.tables
     WHERE table_schema = 'public' AND table_name = $1`,
    [tableName]
  );
  return parseInt(result?.count || '0') > 0;
}

async function createIndexIfNotExists(
  indexName: string,
  createStatement: string
): Promise<void> {
  if (await indexExists(indexName)) {
    log.debug(`Index ${indexName} already exists, skipping`);
    return;
  }
  log.info(`Creating index: ${indexName}`);
  await db.query(createStatement);
}

export async function up(): Promise<void> {
  log.info('Running migration: 065_performance_indexes');

  // ============================================
  // 1. COVERING INDEX FOR LEADERBOARD QUERIES
  // ============================================
  // Major performance win - avoids heap lookups for leaderboard display
  if (await tableExists('character_stats')) {
    await createIndexIfNotExists(
      'idx_character_stats_leaderboard_covering',
      `CREATE INDEX idx_character_stats_leaderboard_covering
       ON character_stats (vitality DESC, user_id)
       INCLUDE (strength, constitution, dexterity, power, endurance)`
    );
  }

  // ============================================
  // 2. BRIN INDEX FOR TIME-SERIES ACTIVITY EVENTS
  // ============================================
  // BRIN is ideal for append-only time-series data - much smaller than B-tree
  if (await tableExists('activity_events')) {
    await createIndexIfNotExists(
      'idx_activity_events_created_brin',
      `CREATE INDEX idx_activity_events_created_brin
       ON activity_events USING BRIN (created_at)`
    );
  }

  // ============================================
  // 3. INDEX FOR WORKOUT KEYSET PAGINATION
  // ============================================
  // Optimizes: "Get next page of workouts for user" with keyset pagination
  if (await tableExists('workouts')) {
    await createIndexIfNotExists(
      'idx_workouts_user_created_keyset',
      `CREATE INDEX idx_workouts_user_created_keyset
       ON workouts (user_id, created_at DESC, id DESC)`
    );
  }

  // ============================================
  // 4. INDEX FOR CREDIT LEDGER QUERIES
  // ============================================
  // Optimizes rate limiting checks and transaction history
  if (await tableExists('credit_ledger')) {
    await createIndexIfNotExists(
      'idx_credit_ledger_user_action_created',
      `CREATE INDEX idx_credit_ledger_user_action_created
       ON credit_ledger (user_id, action, created_at DESC)`
    );
  }

  // ============================================
  // 5. INDEX FOR COMMUNITY FEED (HANGOUT POSTS)
  // ============================================
  // Reduces N+1 queries when loading hangout feed
  if (await tableExists('hangout_posts')) {
    await createIndexIfNotExists(
      'idx_hangout_posts_hangout_time',
      `CREATE INDEX idx_hangout_posts_hangout_time
       ON hangout_posts (hangout_id, created_at DESC)
       WHERE is_hidden = false`
    );
  }

  // ============================================
  // 6. INDEX FOR RIVALRY LOOKUPS
  // ============================================
  // Optimizes: "Get active rivalries for user"
  if (await tableExists('rivalries')) {
    await createIndexIfNotExists(
      'idx_rivalries_active_users',
      `CREATE INDEX idx_rivalries_active_users
       ON rivalries (challenger_id, challenged_id)
       WHERE status = 'active'`
    );
  }

  // ============================================
  // 7. INDEX FOR CREW MEMBER LOOKUPS
  // ============================================
  // Optimizes: "Get all crews for user" and "Get all members for crew"
  if (await tableExists('crew_members')) {
    // Check if index already exists from 060_social_composite_indexes
    // This is a simpler version without INCLUDE for basic lookups
    if (!(await indexExists('idx_crew_members_user_crew'))) {
      await createIndexIfNotExists(
        'idx_crew_members_user_crew_simple',
        `CREATE INDEX idx_crew_members_user_crew_simple
         ON crew_members (user_id, crew_id)`
      );
    }
  }

  // ============================================
  // 8. INDEX FOR MESSAGE PAGINATION
  // ============================================
  // Optimizes: "Get messages in conversation" with keyset pagination
  if (await tableExists('messages')) {
    await createIndexIfNotExists(
      'idx_messages_conversation_keyset',
      `CREATE INDEX idx_messages_conversation_keyset
       ON messages (conversation_id, created_at DESC, id DESC)
       WHERE deleted_at IS NULL`
    );
  }

  // ============================================
  // ANALYZE TABLES
  // ============================================
  log.info('Analyzing tables...');
  const tables = [
    'character_stats',
    'activity_events',
    'workouts',
    'credit_ledger',
    'hangout_posts',
    'rivalries',
    'crew_members',
    'messages',
  ];

  for (const table of tables) {
    if (await tableExists(table)) {
      try {
        await db.query(`ANALYZE ${table}`);
        log.debug(`Analyzed table: ${table}`);
      } catch {
        log.debug(`Could not analyze ${table}`);
      }
    }
  }

  log.info('Migration 065_performance_indexes complete');
}

export async function down(): Promise<void> {
  log.info('Rolling back migration: 065_performance_indexes');

  const indexes = [
    'idx_character_stats_leaderboard_covering',
    'idx_activity_events_created_brin',
    'idx_workouts_user_created_keyset',
    'idx_credit_ledger_user_action_created',
    'idx_hangout_posts_hangout_time',
    'idx_rivalries_active_users',
    'idx_crew_members_user_crew_simple',
    'idx_messages_conversation_keyset',
  ];

  for (const idx of indexes) {
    await db.query(`DROP INDEX IF EXISTS ${idx}`);
  }

  log.info('Rollback 065_performance_indexes complete');
}

export const migrate = up;
