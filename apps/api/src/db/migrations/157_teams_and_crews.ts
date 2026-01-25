/**
 * Migration 157: Enhanced Teams and Crews System
 *
 * Phase 3 of the Community Engagement Master Plan
 * Extends existing crew infrastructure with:
 * - crew_challenges: Team-based challenges
 * - challenge_contributions: Individual contributions to challenges
 * - crew_achievements: Shared accomplishments
 * - crew_chat_messages: Team communication
 * - crew_chat_read_status: Track last read message per user
 *
 * DESTRUCTIVE: down() drops all Phase 3 crew enhancement tables - acknowledged for rollback capability
 */

import { query } from '../client';

export async function up(): Promise<void> {
  // ============================================
  // CREW CHALLENGES TABLE
  // Team-based challenges and competitions
  // ============================================
  await query(`
    CREATE TABLE IF NOT EXISTS crew_challenges (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      crew_id TEXT NOT NULL REFERENCES crews(id) ON DELETE CASCADE,
      created_by TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      challenge_type TEXT NOT NULL CHECK (challenge_type IN (
        'internal', 'crew_vs_crew', 'global', 'time_attack',
        'volume', 'streak', 'participation'
      )),
      opponent_crew_id TEXT REFERENCES crews(id) ON DELETE SET NULL,
      title TEXT NOT NULL,
      description TEXT,
      image_url TEXT,
      metric_type TEXT NOT NULL CHECK (metric_type IN (
        'total_workouts', 'total_weight_lifted', 'total_reps', 'total_duration_minutes',
        'total_distance_km', 'avg_workouts_per_member', 'participation_rate',
        'streak_days', 'xp_earned'
      )),
      goal_value NUMERIC(12, 2),
      current_value NUMERIC(12, 2) DEFAULT 0,
      starts_at TIMESTAMPTZ NOT NULL,
      ends_at TIMESTAMPTZ NOT NULL,
      status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'completed', 'cancelled')),
      winner_crew_id TEXT REFERENCES crews(id) ON DELETE SET NULL,
      rewards JSONB DEFAULT '{}',
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  await query(`CREATE INDEX IF NOT EXISTS idx_crew_challenges_crew ON crew_challenges(crew_id)`);
  await query(`CREATE INDEX IF NOT EXISTS idx_crew_challenges_opponent ON crew_challenges(opponent_crew_id)`);
  await query(`CREATE INDEX IF NOT EXISTS idx_crew_challenges_type ON crew_challenges(challenge_type)`);
  await query(`CREATE INDEX IF NOT EXISTS idx_crew_challenges_status ON crew_challenges(status)`);
  await query(`CREATE INDEX IF NOT EXISTS idx_crew_challenges_dates ON crew_challenges(starts_at, ends_at)`);

  // ============================================
  // CHALLENGE CONTRIBUTIONS TABLE
  // Individual contributions to challenges
  // ============================================
  await query(`
    CREATE TABLE IF NOT EXISTS challenge_contributions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      challenge_id UUID NOT NULL REFERENCES crew_challenges(id) ON DELETE CASCADE,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      crew_id TEXT NOT NULL REFERENCES crews(id) ON DELETE CASCADE,
      workout_id TEXT REFERENCES workouts(id) ON DELETE SET NULL,
      contribution_value NUMERIC(12, 2) NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  await query(`CREATE INDEX IF NOT EXISTS idx_challenge_contribs_challenge ON challenge_contributions(challenge_id)`);
  await query(`CREATE INDEX IF NOT EXISTS idx_challenge_contribs_user ON challenge_contributions(user_id)`);
  await query(`CREATE INDEX IF NOT EXISTS idx_challenge_contribs_crew ON challenge_contributions(crew_id)`);
  await query(`CREATE INDEX IF NOT EXISTS idx_challenge_contribs_agg_crew ON challenge_contributions(challenge_id, crew_id)`);
  await query(`CREATE INDEX IF NOT EXISTS idx_challenge_contribs_agg_user ON challenge_contributions(challenge_id, user_id)`);

  // ============================================
  // CREW ACHIEVEMENTS TABLE
  // Shared accomplishments and milestones
  // ============================================
  await query(`
    CREATE TABLE IF NOT EXISTS crew_achievements (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      crew_id TEXT NOT NULL REFERENCES crews(id) ON DELETE CASCADE,
      achievement_key TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      icon_url TEXT,
      rarity TEXT DEFAULT 'common' CHECK (rarity IN ('common', 'uncommon', 'rare', 'epic', 'legendary')),
      target_value NUMERIC(12, 2),
      achieved_value NUMERIC(12, 2),
      earned_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(crew_id, achievement_key)
    )
  `);

  await query(`CREATE INDEX IF NOT EXISTS idx_crew_achievements_crew ON crew_achievements(crew_id)`);
  await query(`CREATE INDEX IF NOT EXISTS idx_crew_achievements_key ON crew_achievements(achievement_key)`);
  await query(`CREATE INDEX IF NOT EXISTS idx_crew_achievements_rarity ON crew_achievements(rarity)`);

  // ============================================
  // CREW CHAT MESSAGES TABLE
  // Team communication
  // ============================================
  await query(`
    CREATE TABLE IF NOT EXISTS crew_chat_messages (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      crew_id TEXT NOT NULL REFERENCES crews(id) ON DELETE CASCADE,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      content TEXT NOT NULL,
      message_type TEXT DEFAULT 'text' CHECK (message_type IN (
        'text', 'workout_share', 'achievement_share', 'challenge_update',
        'system', 'sticker', 'poll'
      )),
      metadata JSONB DEFAULT '{}',
      reply_to_id UUID REFERENCES crew_chat_messages(id) ON DELETE SET NULL,
      reactions JSONB DEFAULT '{}',
      is_pinned BOOLEAN DEFAULT false,
      is_deleted BOOLEAN DEFAULT false,
      deleted_by TEXT REFERENCES users(id) ON DELETE SET NULL,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      edited_at TIMESTAMPTZ
    )
  `);

  await query(`CREATE INDEX IF NOT EXISTS idx_crew_chat_crew ON crew_chat_messages(crew_id)`);
  await query(`CREATE INDEX IF NOT EXISTS idx_crew_chat_user ON crew_chat_messages(user_id)`);
  await query(`CREATE INDEX IF NOT EXISTS idx_crew_chat_keyset ON crew_chat_messages(crew_id, created_at DESC)`);
  await query(`CREATE INDEX IF NOT EXISTS idx_crew_chat_pinned ON crew_chat_messages(crew_id, is_pinned) WHERE is_pinned = true`);

  // ============================================
  // CREW CHAT READ STATUS
  // Track last read message per user
  // ============================================
  await query(`
    CREATE TABLE IF NOT EXISTS crew_chat_read_status (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      crew_id TEXT NOT NULL REFERENCES crews(id) ON DELETE CASCADE,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      last_read_message_id UUID REFERENCES crew_chat_messages(id) ON DELETE SET NULL,
      last_read_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(crew_id, user_id)
    )
  `);

  await query(`CREATE INDEX IF NOT EXISTS idx_crew_chat_read_crew ON crew_chat_read_status(crew_id)`);
  await query(`CREATE INDEX IF NOT EXISTS idx_crew_chat_read_user ON crew_chat_read_status(user_id)`);

  // ============================================
  // TRIGGER: Update challenge progress
  // ============================================
  await query(`
    CREATE OR REPLACE FUNCTION update_challenge_progress()
    RETURNS TRIGGER AS $$
    BEGIN
      UPDATE crew_challenges
      SET current_value = (
        SELECT COALESCE(SUM(contribution_value), 0)
        FROM challenge_contributions
        WHERE challenge_id = NEW.challenge_id
          AND crew_id = (SELECT crew_id FROM crew_challenges WHERE id = NEW.challenge_id)
      ),
      updated_at = NOW()
      WHERE id = NEW.challenge_id;
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql
  `);

  await query(`DROP TRIGGER IF EXISTS trg_update_challenge_progress ON challenge_contributions`);
  await query(`
    CREATE TRIGGER trg_update_challenge_progress
    AFTER INSERT ON challenge_contributions
    FOR EACH ROW EXECUTE FUNCTION update_challenge_progress()
  `);

  // ============================================
  // Add challenge stats to crews table
  // ============================================
  await query(`
    ALTER TABLE crews
    ADD COLUMN IF NOT EXISTS challenges_participated INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS challenges_won INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS current_challenge_id TEXT REFERENCES crew_challenges(id) ON DELETE SET NULL
  `);

  // ============================================
  // MATERIALIZED VIEW: Crew Leaderboard
  // ============================================
  await query(`
    CREATE MATERIALIZED VIEW IF NOT EXISTS mv_crew_leaderboard AS
    SELECT
      c.id,
      c.name,
      c.avatar_url,
      c.member_count,
      c.total_xp,
      c.level,
      c.challenges_won,
      RANK() OVER (ORDER BY c.total_xp DESC) AS xp_rank,
      RANK() OVER (ORDER BY c.challenges_won DESC) AS challenges_rank
    FROM crews c
    WHERE c.visibility = 'public'
      AND c.member_count > 0
    ORDER BY c.total_xp DESC
  `);

  await query(`CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_crew_leaderboard_id ON mv_crew_leaderboard(id)`);
  await query(`CREATE INDEX IF NOT EXISTS idx_mv_crew_leaderboard_xp_rank ON mv_crew_leaderboard(xp_rank)`);
  await query(`CREATE INDEX IF NOT EXISTS idx_mv_crew_leaderboard_challenges_rank ON mv_crew_leaderboard(challenges_rank)`);
}

export async function down(): Promise<void> {
  // Drop materialized view
  await query(`DROP MATERIALIZED VIEW IF EXISTS mv_crew_leaderboard`);

  // Drop triggers
  await query(`DROP TRIGGER IF EXISTS trg_update_challenge_progress ON challenge_contributions`);
  await query(`DROP FUNCTION IF EXISTS update_challenge_progress()`);

  // Remove added columns from crews
  await query(`ALTER TABLE crews DROP COLUMN IF EXISTS challenges_participated`);
  await query(`ALTER TABLE crews DROP COLUMN IF EXISTS challenges_won`);
  await query(`ALTER TABLE crews DROP COLUMN IF EXISTS current_challenge_id`);

  // Drop tables in reverse order
  await query(`DROP TABLE IF EXISTS crew_chat_read_status`);
  await query(`DROP TABLE IF EXISTS crew_chat_messages`);
  await query(`DROP TABLE IF EXISTS crew_achievements`);
  await query(`DROP TABLE IF EXISTS challenge_contributions`);
  await query(`DROP TABLE IF EXISTS crew_challenges`);
}
