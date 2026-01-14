/**
 * Migration: Social Features Composite Indexes
 *
 * Optimizes social feature queries:
 * 1. Friendships - accepted friends lookup
 * 2. Mentorships - mentee/mentor lookup with status
 * 3. Crew members - user membership lookup
 * 4. Buddy requests - pending requests
 * 5. User follows - follower/following counts
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
  log.info('Running migration: 060_social_composite_indexes');

  // ============================================
  // 1. FRIENDSHIPS INDEXES
  // ============================================
  if (await tableExists('friendships')) {
    // Accepted friends lookup for user_a
    await createIndexIfNotExists(
      'idx_friendships_user_a_accepted',
      `CREATE INDEX idx_friendships_user_a_accepted
       ON friendships(user_a_id, created_at DESC)
       WHERE status = 'accepted'`
    );

    // Accepted friends lookup for user_b (reverse direction)
    await createIndexIfNotExists(
      'idx_friendships_user_b_accepted',
      `CREATE INDEX idx_friendships_user_b_accepted
       ON friendships(user_b_id, created_at DESC)
       WHERE status = 'accepted'`
    );

    // Pending friend requests (for notifications)
    await createIndexIfNotExists(
      'idx_friendships_pending_requests',
      `CREATE INDEX idx_friendships_pending_requests
       ON friendships(user_b_id, created_at DESC)
       WHERE status = 'pending'`
    );

    // Blocked users lookup
    await createIndexIfNotExists(
      'idx_friendships_blocked',
      `CREATE INDEX idx_friendships_blocked
       ON friendships(user_a_id)
       WHERE status = 'blocked'`
    );
  }

  // ============================================
  // 2. MENTORSHIPS INDEXES
  // ============================================
  if (await tableExists('mentorships')) {
    // Mentee lookup with status (find my mentors)
    await createIndexIfNotExists(
      'idx_mentorships_mentee_status',
      `CREATE INDEX idx_mentorships_mentee_status
       ON mentorships(mentee_id, status, created_at DESC)`
    );

    // Mentor lookup with status (find my mentees)
    await createIndexIfNotExists(
      'idx_mentorships_mentor_status',
      `CREATE INDEX idx_mentorships_mentor_status
       ON mentorships(mentor_id, status, created_at DESC)`
    );

    // Active mentorships only (for dashboard)
    await createIndexIfNotExists(
      'idx_mentorships_active',
      `CREATE INDEX idx_mentorships_active
       ON mentorships(mentor_id, mentee_id)
       WHERE status = 'active'`
    );

    // Pending mentorship requests
    await createIndexIfNotExists(
      'idx_mentorships_pending',
      `CREATE INDEX idx_mentorships_pending
       ON mentorships(mentor_id, created_at DESC)
       WHERE status = 'pending'`
    );
  }

  // ============================================
  // 3. CREW MEMBERS INDEXES
  // ============================================
  if (await tableExists('crew_members')) {
    // User's crews lookup
    await createIndexIfNotExists(
      'idx_crew_members_user_crew',
      `CREATE INDEX idx_crew_members_user_crew
       ON crew_members(user_id, joined_at DESC)
       INCLUDE (crew_id, role)`
    );

    // Crew roster lookup
    await createIndexIfNotExists(
      'idx_crew_members_crew_roster',
      `CREATE INDEX idx_crew_members_crew_roster
       ON crew_members(crew_id, role, joined_at DESC)
       INCLUDE (user_id)`
    );

    // Active members only (exclude left/kicked)
    await createIndexIfNotExists(
      'idx_crew_members_active',
      `CREATE INDEX idx_crew_members_active
       ON crew_members(crew_id, user_id)
       WHERE left_at IS NULL`
    );
  }

  // ============================================
  // 4. CREW INVITES INDEXES
  // ============================================
  if (await tableExists('crew_invites')) {
    // Pending invites for user
    await createIndexIfNotExists(
      'idx_crew_invites_user_pending',
      `CREATE INDEX idx_crew_invites_user_pending
       ON crew_invites(user_id, created_at DESC)
       WHERE status = 'pending'`
    );

    // Pending invites for crew (admin view)
    await createIndexIfNotExists(
      'idx_crew_invites_crew_pending',
      `CREATE INDEX idx_crew_invites_crew_pending
       ON crew_invites(crew_id, created_at DESC)
       WHERE status = 'pending'`
    );
  }

  // ============================================
  // 5. BUDDY REQUESTS INDEXES
  // ============================================
  if (await tableExists('buddy_requests')) {
    // Pending buddy requests received
    await createIndexIfNotExists(
      'idx_buddy_requests_receiver_pending',
      `CREATE INDEX idx_buddy_requests_receiver_pending
       ON buddy_requests(receiver_id, created_at DESC)
       WHERE status = 'pending'`
    );

    // Pending buddy requests sent
    await createIndexIfNotExists(
      'idx_buddy_requests_sender_pending',
      `CREATE INDEX idx_buddy_requests_sender_pending
       ON buddy_requests(sender_id, created_at DESC)
       WHERE status = 'pending'`
    );
  }

  // ============================================
  // 6. USER FOLLOWS INDEXES
  // ============================================
  if (await tableExists('user_follows')) {
    // Who I follow (following list)
    await createIndexIfNotExists(
      'idx_user_follows_follower_list',
      `CREATE INDEX idx_user_follows_follower_list
       ON user_follows(follower_id, created_at DESC)
       INCLUDE (following_id)`
    );

    // Who follows me (followers list)
    await createIndexIfNotExists(
      'idx_user_follows_following_list',
      `CREATE INDEX idx_user_follows_following_list
       ON user_follows(following_id, created_at DESC)
       INCLUDE (follower_id)`
    );

    // Check if following (mutual check)
    await createIndexIfNotExists(
      'idx_user_follows_check',
      `CREATE INDEX idx_user_follows_check
       ON user_follows(follower_id, following_id)`
    );
  }

  // ============================================
  // 7. USER BLOCKS INDEXES
  // ============================================
  if (await tableExists('user_blocks')) {
    // My blocked users
    await createIndexIfNotExists(
      'idx_user_blocks_blocker',
      `CREATE INDEX idx_user_blocks_blocker
       ON user_blocks(blocker_id)
       INCLUDE (blocked_id, created_at)`
    );

    // Check if blocked (both directions for messaging)
    await createIndexIfNotExists(
      'idx_user_blocks_check',
      `CREATE INDEX idx_user_blocks_check
       ON user_blocks(blocker_id, blocked_id)`
    );
  }

  // ============================================
  // 8. HIGH FIVES INDEXES
  // ============================================
  if (await tableExists('high_fives')) {
    // High fives received (for profile stats)
    await createIndexIfNotExists(
      'idx_high_fives_receiver',
      `CREATE INDEX idx_high_fives_receiver
       ON high_fives(receiver_id, created_at DESC)
       INCLUDE (sender_id, workout_id)`
    );

    // High fives given (for profile stats)
    await createIndexIfNotExists(
      'idx_high_fives_sender',
      `CREATE INDEX idx_high_fives_sender
       ON high_fives(sender_id, created_at DESC)
       INCLUDE (receiver_id, workout_id)`
    );

    // Check if already high-fived (prevent duplicates)
    await createIndexIfNotExists(
      'idx_high_fives_unique_check',
      `CREATE INDEX idx_high_fives_unique_check
       ON high_fives(sender_id, workout_id)`
    );
  }

  // ============================================
  // ANALYZE TABLES
  // ============================================
  log.info('Analyzing social tables...');
  const tables = [
    'friendships',
    'mentorships',
    'crew_members',
    'crew_invites',
    'buddy_requests',
    'user_follows',
    'user_blocks',
    'high_fives',
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

  log.info('Migration 060_social_composite_indexes complete');
}

export async function down(): Promise<void> {
  log.info('Rolling back migration: 060_social_composite_indexes');

  const indexes = [
    // Friendships
    'idx_friendships_user_a_accepted',
    'idx_friendships_user_b_accepted',
    'idx_friendships_pending_requests',
    'idx_friendships_blocked',
    // Mentorships
    'idx_mentorships_mentee_status',
    'idx_mentorships_mentor_status',
    'idx_mentorships_active',
    'idx_mentorships_pending',
    // Crew members
    'idx_crew_members_user_crew',
    'idx_crew_members_crew_roster',
    'idx_crew_members_active',
    // Crew invites
    'idx_crew_invites_user_pending',
    'idx_crew_invites_crew_pending',
    // Buddy requests
    'idx_buddy_requests_receiver_pending',
    'idx_buddy_requests_sender_pending',
    // User follows
    'idx_user_follows_follower_list',
    'idx_user_follows_following_list',
    'idx_user_follows_check',
    // User blocks
    'idx_user_blocks_blocker',
    'idx_user_blocks_check',
    // High fives
    'idx_high_fives_receiver',
    'idx_high_fives_sender',
    'idx_high_fives_unique_check',
  ];

  for (const idx of indexes) {
    await db.query(`DROP INDEX IF EXISTS ${idx}`);
  }

  log.info('Rollback 060_social_composite_indexes complete');
}

export const migrate = up;
