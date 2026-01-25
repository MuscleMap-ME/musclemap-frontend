/**
 * Migration 156: Workout Buddies System Enhancements
 *
 * Phase 2 of the Community Engagement Master Plan
 * EXTENDS existing buddy infrastructure with:
 * - buddy_check_ins: Mutual accountability check-ins (NEW)
 * - buddy_messages: Direct messages between buddies (NEW)
 * - Additional columns on existing tables for enhanced features
 *
 * NOTE: This migration extends existing buddy_preferences and buddy_pairs tables
 * rather than recreating them.
 *
 * DESTRUCTIVE: down() drops new tables and removes added columns - acknowledged for rollback capability
 */

import { query } from '../client';

export async function up(): Promise<void> {
  // ============================================
  // ENHANCE BUDDY PREFERENCES TABLE
  // Add new columns for enhanced matching
  // ============================================

  // Add is_looking_for_buddy column if it doesn't exist (maps to seeking_buddy)
  await query(`
    ALTER TABLE buddy_preferences
    ADD COLUMN IF NOT EXISTS fitness_level TEXT DEFAULT 'intermediate'
      CHECK (fitness_level IS NULL OR fitness_level IN ('beginner', 'intermediate', 'advanced', 'elite'))
  `);

  await query(`
    ALTER TABLE buddy_preferences
    ADD COLUMN IF NOT EXISTS match_similar_level BOOLEAN DEFAULT true
  `);

  await query(`
    ALTER TABLE buddy_preferences
    ADD COLUMN IF NOT EXISTS wants_daily_checkins BOOLEAN DEFAULT true
  `);

  await query(`
    ALTER TABLE buddy_preferences
    ADD COLUMN IF NOT EXISTS wants_workout_reminders BOOLEAN DEFAULT true
  `);

  await query(`
    ALTER TABLE buddy_preferences
    ADD COLUMN IF NOT EXISTS open_to_virtual_workouts BOOLEAN DEFAULT true
  `);

  await query(`
    ALTER TABLE buddy_preferences
    ADD COLUMN IF NOT EXISTS open_to_in_person BOOLEAN DEFAULT false
  `);

  await query(`
    ALTER TABLE buddy_preferences
    ADD COLUMN IF NOT EXISTS city TEXT
  `);

  await query(`
    ALTER TABLE buddy_preferences
    ADD COLUMN IF NOT EXISTS timezone TEXT
  `);

  await query(`
    ALTER TABLE buddy_preferences
    ADD COLUMN IF NOT EXISTS latitude NUMERIC(10, 8)
  `);

  await query(`
    ALTER TABLE buddy_preferences
    ADD COLUMN IF NOT EXISTS longitude NUMERIC(11, 8)
  `);

  // Create indexes on new columns
  await query(`CREATE INDEX IF NOT EXISTS idx_buddy_prefs_seeking ON buddy_preferences(seeking_buddy)`);
  await query(`CREATE INDEX IF NOT EXISTS idx_buddy_prefs_level ON buddy_preferences(fitness_level)`);

  // ============================================
  // ENHANCE BUDDY PAIRS TABLE
  // Add new columns for tracking engagement
  // ============================================

  await query(`
    ALTER TABLE buddy_pairs
    ADD COLUMN IF NOT EXISTS compatibility_score NUMERIC(5, 2)
  `);

  await query(`
    ALTER TABLE buddy_pairs
    ADD COLUMN IF NOT EXISTS match_reasons JSONB DEFAULT '[]'
  `);

  await query(`
    ALTER TABLE buddy_pairs
    ADD COLUMN IF NOT EXISTS current_streak INTEGER DEFAULT 0
  `);

  await query(`
    ALTER TABLE buddy_pairs
    ADD COLUMN IF NOT EXISTS longest_streak INTEGER DEFAULT 0
  `);

  await query(`
    ALTER TABLE buddy_pairs
    ADD COLUMN IF NOT EXISTS last_mutual_activity TIMESTAMPTZ
  `);

  await query(`
    ALTER TABLE buddy_pairs
    ADD COLUMN IF NOT EXISTS total_check_ins INTEGER DEFAULT 0
  `);

  await query(`
    ALTER TABLE buddy_pairs
    ADD COLUMN IF NOT EXISTS high_fives_exchanged INTEGER DEFAULT 0
  `);

  // Create index on streak
  await query(`CREATE INDEX IF NOT EXISTS idx_buddy_pairs_streak ON buddy_pairs(current_streak DESC)`);

  // ============================================
  // BUDDY INVITES TABLE
  // Pending buddy requests with enhanced matching info
  // ============================================
  await query(`
    CREATE TABLE IF NOT EXISTS buddy_invites (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      sender_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      recipient_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      message TEXT,
      status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'expired')),
      compatibility_score NUMERIC(5, 2),
      match_reasons JSONB DEFAULT '[]',
      created_at TIMESTAMPTZ DEFAULT NOW(),
      responded_at TIMESTAMPTZ,
      expires_at TIMESTAMPTZ
    )
  `);

  await query(`CREATE INDEX IF NOT EXISTS idx_buddy_invites_sender ON buddy_invites(sender_id)`);
  await query(`CREATE INDEX IF NOT EXISTS idx_buddy_invites_recipient ON buddy_invites(recipient_id)`);
  await query(`CREATE INDEX IF NOT EXISTS idx_buddy_invites_status ON buddy_invites(status)`);
  await query(`CREATE INDEX IF NOT EXISTS idx_buddy_invites_expires ON buddy_invites(expires_at)`);

  // ============================================
  // BUDDY CHECK-INS TABLE
  // Daily accountability check-ins
  // ============================================
  await query(`
    CREATE TABLE IF NOT EXISTS buddy_check_ins (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      buddy_pair_id TEXT NOT NULL REFERENCES buddy_pairs(id) ON DELETE CASCADE,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      check_in_type TEXT NOT NULL CHECK (check_in_type IN (
        'daily_mood', 'workout_planned', 'workout_completed',
        'rest_day', 'encouragement', 'progress_share'
      )),
      message TEXT,
      mood_rating INTEGER CHECK (mood_rating >= 1 AND mood_rating <= 5),
      workout_id TEXT REFERENCES workouts(id) ON DELETE SET NULL,
      check_in_date DATE NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(buddy_pair_id, user_id, check_in_type, check_in_date)
    )
  `);

  await query(`CREATE INDEX IF NOT EXISTS idx_buddy_checkins_pair ON buddy_check_ins(buddy_pair_id)`);
  await query(`CREATE INDEX IF NOT EXISTS idx_buddy_checkins_user ON buddy_check_ins(user_id)`);
  await query(`CREATE INDEX IF NOT EXISTS idx_buddy_checkins_date ON buddy_check_ins(check_in_date)`);
  await query(`CREATE INDEX IF NOT EXISTS idx_buddy_checkins_pair_date ON buddy_check_ins(buddy_pair_id, check_in_date)`);

  // ============================================
  // BUDDY MESSAGES TABLE
  // Direct messages between buddies
  // ============================================
  await query(`
    CREATE TABLE IF NOT EXISTS buddy_messages (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      buddy_pair_id TEXT NOT NULL REFERENCES buddy_pairs(id) ON DELETE CASCADE,
      sender_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      content TEXT NOT NULL,
      message_type TEXT DEFAULT 'text' CHECK (message_type IN (
        'text', 'workout_share', 'achievement_share', 'sticker', 'voice_note'
      )),
      metadata JSONB DEFAULT '{}',
      is_read BOOLEAN DEFAULT false,
      read_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  await query(`CREATE INDEX IF NOT EXISTS idx_buddy_messages_pair ON buddy_messages(buddy_pair_id)`);
  await query(`CREATE INDEX IF NOT EXISTS idx_buddy_messages_sender ON buddy_messages(sender_id)`);
  await query(`CREATE INDEX IF NOT EXISTS idx_buddy_messages_pair_created ON buddy_messages(buddy_pair_id, created_at DESC)`);
  await query(`CREATE INDEX IF NOT EXISTS idx_buddy_messages_unread ON buddy_messages(buddy_pair_id, is_read) WHERE is_read = false`);

  // ============================================
  // TRIGGER: Update buddy_pairs streak on check-in
  // Uses existing user_a_id/user_b_id columns
  // ============================================
  await query(`
    CREATE OR REPLACE FUNCTION update_buddy_streak()
    RETURNS TRIGGER AS $$
    DECLARE
      v_other_checked_in BOOLEAN;
    BEGIN
      SELECT EXISTS (
        SELECT 1 FROM buddy_check_ins
        WHERE buddy_pair_id = NEW.buddy_pair_id
          AND check_in_date = NEW.check_in_date
          AND user_id != NEW.user_id
          AND check_in_type IN ('workout_completed', 'daily_mood')
      ) INTO v_other_checked_in;

      IF v_other_checked_in THEN
        UPDATE buddy_pairs
        SET
          current_streak = COALESCE(current_streak, 0) + 1,
          longest_streak = GREATEST(COALESCE(longest_streak, 0), COALESCE(current_streak, 0) + 1),
          last_mutual_activity = NOW(),
          total_check_ins = COALESCE(total_check_ins, 0) + 1
        WHERE id = NEW.buddy_pair_id;
      END IF;

      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql
  `);

  await query(`DROP TRIGGER IF EXISTS trg_update_buddy_streak ON buddy_check_ins`);
  await query(`
    CREATE TRIGGER trg_update_buddy_streak
    AFTER INSERT ON buddy_check_ins
    FOR EACH ROW
    WHEN (NEW.check_in_type IN ('workout_completed', 'daily_mood'))
    EXECUTE FUNCTION update_buddy_streak()
  `);

  // ============================================
  // TRIGGER: Create buddy_pair when invite accepted
  // Uses existing user_a_id/user_b_id columns
  // ============================================
  await query(`
    CREATE OR REPLACE FUNCTION create_buddy_pair_on_accept()
    RETURNS TRIGGER AS $$
    DECLARE
      v_user_a TEXT;
      v_user_b TEXT;
    BEGIN
      IF NEW.status = 'accepted' AND OLD.status = 'pending' THEN
        -- Existing buddy_pairs uses user_a_id/user_b_id with constraint user_a_id < user_b_id
        IF NEW.sender_id < NEW.recipient_id THEN
          v_user_a := NEW.sender_id;
          v_user_b := NEW.recipient_id;
        ELSE
          v_user_a := NEW.recipient_id;
          v_user_b := NEW.sender_id;
        END IF;

        INSERT INTO buddy_pairs (user_a_id, user_b_id, compatibility_score, match_reasons)
        VALUES (v_user_a, v_user_b, NEW.compatibility_score, NEW.match_reasons)
        ON CONFLICT (user_a_id, user_b_id) DO UPDATE
        SET status = 'active', ended_at = NULL;
      END IF;
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql
  `);

  await query(`DROP TRIGGER IF EXISTS trg_create_buddy_pair ON buddy_invites`);
  await query(`
    CREATE TRIGGER trg_create_buddy_pair
    AFTER UPDATE ON buddy_invites
    FOR EACH ROW EXECUTE FUNCTION create_buddy_pair_on_accept()
  `);

  // ============================================
  // VIEW: Potential buddy matches
  // Uses seeking_buddy (existing) and new columns
  // ============================================
  await query(`
    CREATE OR REPLACE VIEW v_potential_buddy_matches AS
    SELECT
      bp1.user_id AS user1_id,
      bp2.user_id AS user2_id,
      bp1.fitness_level = bp2.fitness_level AS same_level,
      bp1.fitness_level AS user1_level,
      bp2.fitness_level AS user2_level,
      bp1.preferred_workout_types && bp2.preferred_workout_types AS overlapping_workouts,
      -- preferred_times doesn't exist in original table, so check if column exists
      CASE WHEN bp1.preferred_schedule IS NOT NULL AND bp2.preferred_schedule IS NOT NULL
           THEN bp1.preferred_schedule && bp2.preferred_schedule
           ELSE false END AS overlapping_times,
      -- Use goals column if it exists, otherwise use preferred_goals
      COALESCE(bp1.preferred_goals, '{}') && COALESCE(bp2.preferred_goals, '{}') AS overlapping_goals,
      bp1.open_to_virtual_workouts AND bp2.open_to_virtual_workouts AS both_virtual_ok,
      CASE
        WHEN bp1.latitude IS NOT NULL AND bp2.latitude IS NOT NULL THEN
          6371 * acos(
            cos(radians(bp1.latitude)) * cos(radians(bp2.latitude)) *
            cos(radians(bp2.longitude) - radians(bp1.longitude)) +
            sin(radians(bp1.latitude)) * sin(radians(bp2.latitude))
          )
        ELSE NULL
      END AS distance_km
    FROM buddy_preferences bp1
    JOIN buddy_preferences bp2 ON bp1.user_id < bp2.user_id
    WHERE bp1.seeking_buddy = true
      AND bp2.seeking_buddy = true
      AND NOT EXISTS (
        SELECT 1 FROM buddy_pairs
        WHERE (user_a_id = bp1.user_id AND user_b_id = bp2.user_id)
           OR (user_a_id = bp2.user_id AND user_b_id = bp1.user_id)
      )
      AND NOT EXISTS (
        SELECT 1 FROM buddy_invites
        WHERE status = 'pending'
          AND ((sender_id = bp1.user_id AND recipient_id = bp2.user_id)
            OR (sender_id = bp2.user_id AND recipient_id = bp1.user_id))
      )
  `);
}

export async function down(): Promise<void> {
  await query(`DROP VIEW IF EXISTS v_potential_buddy_matches`);
  await query(`DROP TRIGGER IF EXISTS trg_create_buddy_pair ON buddy_invites`);
  await query(`DROP FUNCTION IF EXISTS create_buddy_pair_on_accept()`);
  await query(`DROP TRIGGER IF EXISTS trg_update_buddy_streak ON buddy_check_ins`);
  await query(`DROP FUNCTION IF EXISTS update_buddy_streak()`);
  await query(`DROP TABLE IF EXISTS buddy_messages`);
  await query(`DROP TABLE IF EXISTS buddy_check_ins`);
  await query(`DROP TABLE IF EXISTS buddy_invites`);

  // Remove added columns from buddy_pairs
  await query(`ALTER TABLE buddy_pairs DROP COLUMN IF EXISTS compatibility_score`);
  await query(`ALTER TABLE buddy_pairs DROP COLUMN IF EXISTS match_reasons`);
  await query(`ALTER TABLE buddy_pairs DROP COLUMN IF EXISTS current_streak`);
  await query(`ALTER TABLE buddy_pairs DROP COLUMN IF EXISTS longest_streak`);
  await query(`ALTER TABLE buddy_pairs DROP COLUMN IF EXISTS last_mutual_activity`);
  await query(`ALTER TABLE buddy_pairs DROP COLUMN IF EXISTS total_check_ins`);
  await query(`ALTER TABLE buddy_pairs DROP COLUMN IF EXISTS high_fives_exchanged`);

  // Remove added columns from buddy_preferences
  await query(`ALTER TABLE buddy_preferences DROP COLUMN IF EXISTS fitness_level`);
  await query(`ALTER TABLE buddy_preferences DROP COLUMN IF EXISTS match_similar_level`);
  await query(`ALTER TABLE buddy_preferences DROP COLUMN IF EXISTS wants_daily_checkins`);
  await query(`ALTER TABLE buddy_preferences DROP COLUMN IF EXISTS wants_workout_reminders`);
  await query(`ALTER TABLE buddy_preferences DROP COLUMN IF EXISTS open_to_virtual_workouts`);
  await query(`ALTER TABLE buddy_preferences DROP COLUMN IF EXISTS open_to_in_person`);
  await query(`ALTER TABLE buddy_preferences DROP COLUMN IF EXISTS city`);
  await query(`ALTER TABLE buddy_preferences DROP COLUMN IF EXISTS timezone`);
  await query(`ALTER TABLE buddy_preferences DROP COLUMN IF EXISTS latitude`);
  await query(`ALTER TABLE buddy_preferences DROP COLUMN IF EXISTS longitude`);
}
