/**
 * Migration: Scale Indexes for Keyset Pagination
 *
 * Optimizations for horizontal scaling:
 * 1. Keyset pagination indexes (created_at, id) for cursor-based queries
 * 2. BRIN indexes for large time-series tables
 * 3. Covering indexes to eliminate table lookups
 * 4. Optimized composite indexes for common query patterns
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

async function tableExists(tableName: string): Promise<boolean> {
  const result = await db.queryOne<{ count: string }>(
    `SELECT COUNT(*) as count FROM information_schema.tables WHERE table_name = $1`,
    [tableName]
  );
  return parseInt(result?.count || '0') > 0;
}

export async function migrate(): Promise<void> {
  log.info('Running migration: 020_scale_indexes');

  // ============================================
  // KEYSET PAGINATION INDEXES
  // ============================================
  // These indexes support cursor-based pagination using (created_at, id) tuples
  // ORDER BY created_at DESC, id DESC LIMIT n WHERE (created_at, id) < (cursor_date, cursor_id)

  // Workouts keyset pagination (for user workout history)
  await createIndexIfNotExists(
    'idx_workouts_keyset',
    `CREATE INDEX idx_workouts_keyset ON workouts(user_id, created_at DESC, id DESC)`
  );

  // Activity events keyset pagination (for feeds)
  await createIndexIfNotExists(
    'idx_activity_events_keyset',
    `CREATE INDEX idx_activity_events_keyset ON activity_events(created_at DESC, id DESC)`
  );

  // Activity events by user keyset pagination
  await createIndexIfNotExists(
    'idx_activity_events_user_keyset',
    `CREATE INDEX idx_activity_events_user_keyset ON activity_events(user_id, created_at DESC, id DESC)`
  );

  // Messages keyset pagination (for conversation history)
  if (await tableExists('messages')) {
    await createIndexIfNotExists(
      'idx_messages_keyset',
      `CREATE INDEX idx_messages_keyset ON messages(conversation_id, created_at DESC, id DESC)`
    );
  }

  // Credit ledger keyset pagination (for transaction history)
  if (await tableExists('credit_ledger')) {
    await createIndexIfNotExists(
      'idx_credit_ledger_keyset',
      `CREATE INDEX idx_credit_ledger_keyset ON credit_ledger(user_id, created_at DESC, id DESC)`
    );
  }

  // ============================================
  // BRIN INDEXES FOR TIME-SERIES DATA
  // ============================================
  // BRIN indexes are extremely space-efficient for naturally ordered data
  // Ideal for append-only time-series tables

  // Workouts BRIN (workouts are naturally time-ordered)
  await createIndexIfNotExists(
    'idx_workouts_created_brin',
    `CREATE INDEX idx_workouts_created_brin ON workouts
     USING BRIN(created_at) WITH (pages_per_range = 64)`
  );

  // ============================================
  // COVERING INDEXES FOR READ-HEAVY QUERIES
  // ============================================
  // Include commonly needed columns to avoid table lookups

  // User profile lookups (avoid table scan for profile data)
  await createIndexIfNotExists(
    'idx_users_profile_covering',
    `CREATE INDEX idx_users_profile_covering ON users(id)
     INCLUDE (username, display_name, avatar_url, current_archetype_id)`
  );

  // Username lookups with profile data
  await createIndexIfNotExists(
    'idx_users_username_covering',
    `CREATE INDEX idx_users_username_covering ON users(LOWER(username))
     INCLUDE (id, display_name, avatar_url)`
  );

  // Workout summary for user dashboards
  await createIndexIfNotExists(
    'idx_workouts_summary_covering',
    `CREATE INDEX idx_workouts_summary_covering ON workouts(user_id, date DESC)
     INCLUDE (id, total_tu, created_at)`
  );

  // ============================================
  // COMPOSITE INDEXES FOR COMMON JOINS
  // ============================================

  // Exercise muscles join (for TU calculations)
  if (await tableExists('exercise_muscles')) {
    await createIndexIfNotExists(
      'idx_exercise_muscles_composite',
      `CREATE INDEX idx_exercise_muscles_composite ON exercise_muscles(exercise_id, muscle_id)
       INCLUDE (activation)`
    );
  }

  // Workout exercises with ordering
  if (await tableExists('workout_exercises')) {
    await createIndexIfNotExists(
      'idx_workout_exercises_ordered',
      `CREATE INDEX idx_workout_exercises_ordered ON workout_exercises(workout_id, "order")
       INCLUDE (exercise_id, sets_data)`
    );
  }

  // ============================================
  // RIVALRY SYSTEM INDEXES
  // ============================================

  if (await tableExists('rivalries')) {
    // Active rivalries by user
    await createIndexIfNotExists(
      'idx_rivalries_challenger_active',
      `CREATE INDEX idx_rivalries_challenger_active ON rivalries(challenger_id, status)
       WHERE status = 'active'`
    );

    await createIndexIfNotExists(
      'idx_rivalries_challenged_active',
      `CREATE INDEX idx_rivalries_challenged_active ON rivalries(challenged_id, status)
       WHERE status = 'active'`
    );

    // Pending requests
    await createIndexIfNotExists(
      'idx_rivalries_pending',
      `CREATE INDEX idx_rivalries_pending ON rivalries(challenged_id, created_at DESC)
       WHERE status = 'pending'`
    );
  }

  // ============================================
  // LEADERBOARD / STATS INDEXES
  // ============================================

  if (await tableExists('character_stats')) {
    // Leaderboard queries (ordering by total stats)
    await createIndexIfNotExists(
      'idx_character_stats_leaderboard',
      `CREATE INDEX idx_character_stats_leaderboard ON character_stats(strength DESC, endurance DESC)
       INCLUDE (user_id, constitution, dexterity)`
    );

    // User stats lookup
    await createIndexIfNotExists(
      'idx_character_stats_user',
      `CREATE INDEX idx_character_stats_user ON character_stats(user_id)
       INCLUDE (strength, endurance, constitution, dexterity, power, vitality)`
    );
  }

  // ============================================
  // COMMUNITY FEATURES INDEXES
  // ============================================

  // Followers/following queries
  if (await tableExists('follows')) {
    await createIndexIfNotExists(
      'idx_follows_follower',
      `CREATE INDEX idx_follows_follower ON follows(follower_id, created_at DESC)`
    );

    await createIndexIfNotExists(
      'idx_follows_following',
      `CREATE INDEX idx_follows_following ON follows(following_id, created_at DESC)`
    );
  }

  // Likes with keyset pagination
  if (await tableExists('likes')) {
    await createIndexIfNotExists(
      'idx_likes_target_keyset',
      `CREATE INDEX idx_likes_target_keyset ON likes(target_type, target_id, created_at DESC, id DESC)`
    );
  }

  // Comments with keyset pagination
  if (await tableExists('comments')) {
    await createIndexIfNotExists(
      'idx_comments_target_keyset',
      `CREATE INDEX idx_comments_target_keyset ON comments(target_type, target_id, created_at DESC, id DESC)`
    );
  }

  // ============================================
  // OPTIMIZE TABLE STORAGE
  // ============================================

  log.info('Updating table statistics...');

  const tablesToAnalyze = [
    'users',
    'workouts',
    'workout_exercises',
    'exercises',
    'exercise_muscles',
    'muscles',
    'activity_events',
    'credit_balances',
    'credit_ledger',
    'rivalries',
    'character_stats',
  ];

  for (const table of tablesToAnalyze) {
    if (await tableExists(table)) {
      try {
        await db.query(`ANALYZE ${table}`);
        log.debug(`Analyzed table: ${table}`);
      } catch (_e) {
        log.debug(`Could not analyze ${table}`);
      }
    }
  }

  log.info('Migration 020_scale_indexes complete');
}
