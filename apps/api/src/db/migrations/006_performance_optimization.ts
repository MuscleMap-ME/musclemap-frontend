/**
 * Migration: Performance Optimization for High Concurrency
 *
 * This migration adds:
 * 1. Missing indexes for common query patterns
 * 2. Composite indexes for JOIN operations
 * 3. Partial indexes for filtered queries
 * 4. Time-series optimizations for activity_events
 * 5. Covering indexes to avoid table lookups
 * 6. Optimizations for credit balance concurrency
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

export async function migrate(): Promise<void> {
  log.info('Running migration: 006_performance_optimization');

  // ============================================
  // USERS TABLE OPTIMIZATIONS
  // ============================================

  // Covering index for login queries (avoid table lookup)
  await createIndexIfNotExists(
    'idx_users_email_login',
    `CREATE INDEX idx_users_email_login ON users(email)
     INCLUDE (id, password_hash, roles, role, username, display_name)`
  );

  // Index for trial expiration checks
  await createIndexIfNotExists(
    'idx_users_trial_ends',
    `CREATE INDEX idx_users_trial_ends ON users(trial_ends_at)
     WHERE trial_ends_at IS NOT NULL`
  );

  // Index for archetype queries
  await createIndexIfNotExists(
    'idx_users_archetype',
    `CREATE INDEX idx_users_archetype ON users(current_archetype_id)
     WHERE current_archetype_id IS NOT NULL`
  );

  // ============================================
  // CREDIT SYSTEM OPTIMIZATIONS
  // ============================================

  // Covering index for balance checks (most frequent query)
  await createIndexIfNotExists(
    'idx_credit_balances_lookup',
    `CREATE INDEX idx_credit_balances_lookup ON credit_balances(user_id)
     INCLUDE (balance, version)`
  );

  // Index for credit ledger history with created_at for pagination
  await createIndexIfNotExists(
    'idx_credit_ledger_user_created',
    `CREATE INDEX idx_credit_ledger_user_created ON credit_ledger(user_id, created_at DESC)`
  );

  // ============================================
  // WORKOUTS TABLE OPTIMIZATIONS
  // ============================================

  // Composite index for user workout queries (most common)
  await createIndexIfNotExists(
    'idx_workouts_user_created',
    `CREATE INDEX idx_workouts_user_created ON workouts(user_id, created_at DESC)`
  );

  // Index for date-based queries
  await createIndexIfNotExists(
    'idx_workouts_date',
    `CREATE INDEX idx_workouts_date ON workouts(date DESC)`
  );

  // Partial index for public workouts (community feed)
  await createIndexIfNotExists(
    'idx_workouts_public',
    `CREATE INDEX idx_workouts_public ON workouts(created_at DESC)
     WHERE is_public = TRUE`
  );

  // ============================================
  // ACTIVITY_EVENTS OPTIMIZATIONS (Time-series)
  // ============================================

  // BRIN index for time-series data (more efficient for append-only)
  await createIndexIfNotExists(
    'idx_activity_events_created_brin',
    `CREATE INDEX idx_activity_events_created_brin ON activity_events
     USING BRIN(created_at) WITH (pages_per_range = 128)`
  );

  // Composite index for feed queries with visibility
  await createIndexIfNotExists(
    'idx_activity_events_feed',
    `CREATE INDEX idx_activity_events_feed ON activity_events(visibility_scope, created_at DESC)`
  );

  // Covering index for user activity lookup
  await createIndexIfNotExists(
    'idx_activity_events_user_type',
    `CREATE INDEX idx_activity_events_user_type ON activity_events(user_id, event_type, created_at DESC)`
  );

  // Partial index for public feed (most common query)
  await createIndexIfNotExists(
    'idx_activity_events_public',
    `CREATE INDEX idx_activity_events_public ON activity_events(created_at DESC)
     WHERE visibility_scope IN ('public_anon', 'public_profile')`
  );

  // ============================================
  // SUBSCRIPTIONS OPTIMIZATIONS
  // ============================================

  // Index for active subscription checks
  await createIndexIfNotExists(
    'idx_subscriptions_user_status',
    `CREATE INDEX idx_subscriptions_user_status ON subscriptions(user_id, status)`
  );

  // Partial index for active subscriptions only
  await createIndexIfNotExists(
    'idx_subscriptions_active',
    `CREATE INDEX idx_subscriptions_active ON subscriptions(user_id)
     WHERE status = 'active'`
  );

  // ============================================
  // MESSAGES OPTIMIZATIONS
  // ============================================

  // Composite index for conversation message loading
  await createIndexIfNotExists(
    'idx_messages_conversation_created',
    `CREATE INDEX idx_messages_conversation_created ON messages(conversation_id, created_at DESC)`
  );

  // Partial index for non-deleted messages
  await createIndexIfNotExists(
    'idx_messages_active',
    `CREATE INDEX idx_messages_active ON messages(conversation_id, created_at DESC)
     WHERE deleted_at IS NULL`
  );

  // ============================================
  // CONVERSATION PARTICIPANTS OPTIMIZATIONS
  // ============================================

  // Index for user's conversations lookup
  await createIndexIfNotExists(
    'idx_participants_user_conv',
    `CREATE INDEX idx_participants_user_conv ON conversation_participants(user_id, conversation_id)`
  );

  // ============================================
  // COMPETITIONS OPTIMIZATIONS
  // ============================================

  // Index for active competitions
  await createIndexIfNotExists(
    'idx_competitions_status_dates',
    `CREATE INDEX idx_competitions_status_dates ON competitions(status, start_date, end_date)`
  );

  // Partial index for public competitions
  await createIndexIfNotExists(
    'idx_competitions_public',
    `CREATE INDEX idx_competitions_public ON competitions(start_date)
     WHERE is_public = TRUE AND status = 'active'`
  );

  // Composite index for leaderboard queries
  await createIndexIfNotExists(
    'idx_competition_participants_score',
    `CREATE INDEX idx_competition_participants_score ON competition_participants(competition_id, score DESC)`
  );

  // ============================================
  // TIPS AND MILESTONES OPTIMIZATIONS
  // ============================================

  // Index for tip selection queries
  await createIndexIfNotExists(
    'idx_tips_trigger_context',
    `CREATE INDEX idx_tips_trigger_context ON tips(trigger_type, trigger_value, display_context)`
  );

  // Index for user milestone progress
  await createIndexIfNotExists(
    'idx_user_milestones_uncompleted',
    `CREATE INDEX idx_user_milestones_uncompleted ON user_milestones(user_id)
     WHERE completed_at IS NULL`
  );

  // ============================================
  // JOURNEY PROGRESS OPTIMIZATIONS
  // ============================================

  // Index for active journeys
  await createIndexIfNotExists(
    'idx_journey_progress_active',
    `CREATE INDEX idx_journey_progress_active ON journey_progress(user_id, status)
     WHERE status = 'active'`
  );

  // ============================================
  // EXERCISES OPTIMIZATIONS
  // ============================================

  // Index for exercise type queries
  await createIndexIfNotExists(
    'idx_exercises_type',
    `CREATE INDEX idx_exercises_type ON exercises(type)`
  );

  // Index for location-based exercise selection
  await createIndexIfNotExists(
    'idx_exercises_locations',
    `CREATE INDEX idx_exercises_locations ON exercises USING GIN(locations)`
  );

  // Index for equipment-based exercise selection
  await createIndexIfNotExists(
    'idx_exercises_equipment',
    `CREATE INDEX idx_exercises_equipment ON exercises USING GIN(equipment_required)`
  );

  // ============================================
  // REFRESH TOKENS OPTIMIZATIONS
  // ============================================

  // Composite index for token validation
  await createIndexIfNotExists(
    'idx_refresh_tokens_user_expires',
    `CREATE INDEX idx_refresh_tokens_user_expires ON refresh_tokens(user_id, expires_at)
     WHERE revoked_at IS NULL`
  );

  // ============================================
  // USER LOCATIONS OPTIMIZATIONS
  // ============================================

  // Index for active presence queries
  await createIndexIfNotExists(
    'idx_user_locations_updated',
    `CREATE INDEX idx_user_locations_updated ON user_locations(updated_at DESC)`
  );

  // ============================================
  // METRICS ROLLUPS OPTIMIZATIONS
  // ============================================

  // Index for metric queries by hour bucket
  await createIndexIfNotExists(
    'idx_metrics_rollups_lookup',
    `CREATE INDEX idx_metrics_rollups_lookup ON metrics_rollups_hourly(metric_type, hour_bucket DESC)`
  );

  // ============================================
  // TABLE STATISTICS UPDATE
  // ============================================

  log.info('Updating table statistics for query planner...');

  // Update statistics for frequently queried tables
  const tablesToAnalyze = [
    'users',
    'credit_balances',
    'credit_ledger',
    'workouts',
    'activity_events',
    'subscriptions',
    'messages',
    'conversation_participants',
    'competitions',
    'competition_participants',
  ];

  for (const table of tablesToAnalyze) {
    try {
      await db.query(`ANALYZE ${table}`);
    } catch (e) {
      // Table might not exist yet, skip
      log.debug(`Could not analyze ${table}, may not exist`);
    }
  }

  log.info('Migration 006_performance_optimization complete');
}
