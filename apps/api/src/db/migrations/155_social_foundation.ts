/**
 * Migration 155: Social Foundation
 *
 * Phase 1 of the Community Engagement Master Plan
 * Creates core social infrastructure:
 * - activity_feed: Real-time social activity feed
 * - user_follows: Following system for users
 * - feed_preferences: User feed customization
 * - activity_comments: Comments on feed items
 *
 * DESTRUCTIVE: down() drops all Phase 1 social tables - acknowledged for rollback capability
 */

import { query } from '../client';

export async function up(): Promise<void> {
  // ============================================
  // USER FOLLOWS TABLE
  // Who follows whom for the activity feed
  // ============================================
  await query(`
    CREATE TABLE IF NOT EXISTS user_follows (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      follower_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      following_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(follower_id, following_id)
    )
  `);

  await query(`CREATE INDEX IF NOT EXISTS idx_user_follows_follower ON user_follows(follower_id)`);
  await query(`CREATE INDEX IF NOT EXISTS idx_user_follows_following ON user_follows(following_id)`);

  // ============================================
  // ACTIVITY FEED TABLE
  // Central feed of all social activity
  // ============================================
  await query(`
    CREATE TABLE IF NOT EXISTS activity_feed (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      activity_type TEXT NOT NULL CHECK (activity_type IN (
        'workout_completed', 'pr_achieved', 'achievement_unlocked', 'streak_milestone',
        'goal_completed', 'challenge_won', 'level_up', 'buddy_workout',
        'crew_joined', 'high_five_received', 'milestone_reached'
      )),
      reference_id TEXT,
      reference_type TEXT,
      data JSONB DEFAULT '{}',
      visibility TEXT DEFAULT 'public' CHECK (visibility IN ('public', 'followers', 'private')),
      high_five_count INTEGER DEFAULT 0,
      comment_count INTEGER DEFAULT 0,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  await query(`CREATE INDEX IF NOT EXISTS idx_activity_feed_user ON activity_feed(user_id)`);
  await query(`CREATE INDEX IF NOT EXISTS idx_activity_feed_type ON activity_feed(activity_type)`);
  await query(`CREATE INDEX IF NOT EXISTS idx_activity_feed_visibility ON activity_feed(visibility)`);
  await query(`CREATE INDEX IF NOT EXISTS idx_activity_feed_created ON activity_feed(created_at DESC)`);
  await query(`CREATE INDEX IF NOT EXISTS idx_activity_feed_keyset ON activity_feed(user_id, created_at DESC, id DESC)`);
  await query(`CREATE INDEX IF NOT EXISTS idx_activity_feed_ref ON activity_feed(reference_type, reference_id)`);

  // ============================================
  // FEED PREFERENCES TABLE
  // User customization of their feed
  // ============================================
  await query(`
    CREATE TABLE IF NOT EXISTS feed_preferences (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE UNIQUE,
      show_workouts BOOLEAN DEFAULT true,
      show_prs BOOLEAN DEFAULT true,
      show_achievements BOOLEAN DEFAULT true,
      show_streaks BOOLEAN DEFAULT true,
      show_goals BOOLEAN DEFAULT true,
      show_challenges BOOLEAN DEFAULT true,
      show_level_ups BOOLEAN DEFAULT true,
      show_high_fives BOOLEAN DEFAULT true,
      notify_high_fives BOOLEAN DEFAULT true,
      notify_new_followers BOOLEAN DEFAULT true,
      notify_buddy_activity BOOLEAN DEFAULT true,
      notify_crew_activity BOOLEAN DEFAULT true,
      push_enabled BOOLEAN DEFAULT true,
      push_high_fives BOOLEAN DEFAULT true,
      push_achievements BOOLEAN DEFAULT true,
      push_buddy_reminders BOOLEAN DEFAULT true,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  // ============================================
  // ACTIVITY COMMENTS TABLE
  // Comments on activity feed items
  // ============================================
  await query(`
    CREATE TABLE IF NOT EXISTS activity_comments (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      activity_id UUID NOT NULL REFERENCES activity_feed(id) ON DELETE CASCADE,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      content TEXT NOT NULL,
      parent_id UUID REFERENCES activity_comments(id) ON DELETE CASCADE,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  await query(`CREATE INDEX IF NOT EXISTS idx_activity_comments_activity ON activity_comments(activity_id)`);
  await query(`CREATE INDEX IF NOT EXISTS idx_activity_comments_user ON activity_comments(user_id)`);
  await query(`CREATE INDEX IF NOT EXISTS idx_activity_comments_parent ON activity_comments(parent_id)`);
  await query(`CREATE INDEX IF NOT EXISTS idx_activity_comments_keyset ON activity_comments(activity_id, created_at)`);

  // ============================================
  // MATERIALIZED VIEW FOR FEED PERFORMANCE
  // ============================================
  await query(`
    CREATE MATERIALIZED VIEW IF NOT EXISTS mv_user_feed AS
    SELECT
      af.id,
      af.user_id,
      af.activity_type,
      af.reference_id,
      af.reference_type,
      af.data,
      af.visibility,
      af.high_five_count,
      af.comment_count,
      af.created_at,
      u.username,
      u.display_name,
      u.avatar_url
    FROM activity_feed af
    JOIN users u ON u.id = af.user_id
    WHERE af.visibility IN ('public', 'followers')
    ORDER BY af.created_at DESC
  `);

  await query(`CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_user_feed_id ON mv_user_feed(id)`);
  await query(`CREATE INDEX IF NOT EXISTS idx_mv_user_feed_user ON mv_user_feed(user_id)`);
  await query(`CREATE INDEX IF NOT EXISTS idx_mv_user_feed_created ON mv_user_feed(created_at DESC)`);
  await query(`CREATE INDEX IF NOT EXISTS idx_mv_user_feed_keyset ON mv_user_feed(created_at DESC, id DESC)`);

  // ============================================
  // TRIGGERS: Update counts and follow counts
  // ============================================

  // Function to update activity_feed comment_count
  await query(`
    CREATE OR REPLACE FUNCTION update_activity_comment_count()
    RETURNS TRIGGER AS $$
    BEGIN
      IF TG_OP = 'INSERT' THEN
        UPDATE activity_feed
        SET comment_count = comment_count + 1
        WHERE id = NEW.activity_id;
      ELSIF TG_OP = 'DELETE' THEN
        UPDATE activity_feed
        SET comment_count = GREATEST(0, comment_count - 1)
        WHERE id = OLD.activity_id;
      END IF;
      RETURN NULL;
    END;
    $$ LANGUAGE plpgsql
  `);

  await query(`
    DROP TRIGGER IF EXISTS trg_update_comment_count ON activity_comments
  `);
  await query(`
    CREATE TRIGGER trg_update_comment_count
    AFTER INSERT OR DELETE ON activity_comments
    FOR EACH ROW EXECUTE FUNCTION update_activity_comment_count()
  `);

  // Add follow counts to users table
  await query(`
    ALTER TABLE users
    ADD COLUMN IF NOT EXISTS follower_count INTEGER DEFAULT 0
  `);
  await query(`
    ALTER TABLE users
    ADD COLUMN IF NOT EXISTS following_count INTEGER DEFAULT 0
  `);

  // Function to update follower/following counts
  await query(`
    CREATE OR REPLACE FUNCTION update_follow_counts()
    RETURNS TRIGGER AS $$
    BEGIN
      IF TG_OP = 'INSERT' THEN
        UPDATE users SET following_count = following_count + 1 WHERE id = NEW.follower_id;
        UPDATE users SET follower_count = follower_count + 1 WHERE id = NEW.following_id;
      ELSIF TG_OP = 'DELETE' THEN
        UPDATE users SET following_count = GREATEST(0, following_count - 1) WHERE id = OLD.follower_id;
        UPDATE users SET follower_count = GREATEST(0, follower_count - 1) WHERE id = OLD.following_id;
      END IF;
      RETURN NULL;
    END;
    $$ LANGUAGE plpgsql
  `);

  await query(`
    DROP TRIGGER IF EXISTS trg_update_follow_counts ON user_follows
  `);
  await query(`
    CREATE TRIGGER trg_update_follow_counts
    AFTER INSERT OR DELETE ON user_follows
    FOR EACH ROW EXECUTE FUNCTION update_follow_counts()
  `);
}

export async function down(): Promise<void> {
  // Drop triggers first
  await query(`DROP TRIGGER IF EXISTS trg_update_follow_counts ON user_follows`);
  await query(`DROP FUNCTION IF EXISTS update_follow_counts()`);
  await query(`DROP TRIGGER IF EXISTS trg_update_comment_count ON activity_comments`);
  await query(`DROP FUNCTION IF EXISTS update_activity_comment_count()`);

  // Drop materialized view
  await query(`DROP MATERIALIZED VIEW IF EXISTS mv_user_feed`);

  // Remove added columns from users
  await query(`ALTER TABLE users DROP COLUMN IF EXISTS follower_count`);
  await query(`ALTER TABLE users DROP COLUMN IF EXISTS following_count`);

  // Drop tables in reverse dependency order
  await query(`DROP TABLE IF EXISTS activity_comments`);
  await query(`DROP TABLE IF EXISTS feed_preferences`);
  await query(`DROP TABLE IF EXISTS activity_feed`);
  await query(`DROP TABLE IF EXISTS user_follows`);
}
