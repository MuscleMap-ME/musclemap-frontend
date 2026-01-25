/**
 * Migration 156: Workout Buddies System
 *
 * Phase 2 of the Community Engagement Master Plan
 * Creates workout buddy infrastructure:
 * - buddy_preferences: Matching preferences
 * - buddy_pairs: Matched workout partners
 * - buddy_invites: Pending buddy requests
 * - buddy_check_ins: Mutual accountability check-ins
 * - buddy_messages: Direct messages between buddies
 *
 * DESTRUCTIVE: down() drops all Phase 2 buddy tables - acknowledged for rollback capability
 */

import { query } from '../client';

export async function up(): Promise<void> {
  // ============================================
  // BUDDY PREFERENCES TABLE
  // What users are looking for in a workout buddy
  // ============================================
  await query(`
    CREATE TABLE IF NOT EXISTS buddy_preferences (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE UNIQUE,
      is_looking_for_buddy BOOLEAN DEFAULT false,
      preferred_workout_types TEXT[] DEFAULT '{}',
      preferred_times TEXT[] DEFAULT '{}',
      preferred_days INTEGER[] DEFAULT '{}',
      fitness_level TEXT DEFAULT 'intermediate' CHECK (fitness_level IN ('beginner', 'intermediate', 'advanced', 'elite')),
      match_similar_level BOOLEAN DEFAULT true,
      wants_daily_checkins BOOLEAN DEFAULT true,
      wants_workout_reminders BOOLEAN DEFAULT true,
      open_to_virtual_workouts BOOLEAN DEFAULT true,
      open_to_in_person BOOLEAN DEFAULT false,
      city TEXT,
      timezone TEXT,
      latitude NUMERIC(10, 8),
      longitude NUMERIC(11, 8),
      max_distance_km INTEGER DEFAULT 50,
      goals TEXT[] DEFAULT '{}',
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  await query(`CREATE INDEX IF NOT EXISTS idx_buddy_prefs_looking ON buddy_preferences(is_looking_for_buddy)`);
  await query(`CREATE INDEX IF NOT EXISTS idx_buddy_prefs_level ON buddy_preferences(fitness_level)`);

  // ============================================
  // BUDDY PAIRS TABLE
  // Active buddy partnerships
  // ============================================
  await query(`
    CREATE TABLE IF NOT EXISTS buddy_pairs (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user1_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      user2_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      status TEXT DEFAULT 'active' CHECK (status IN ('active', 'paused', 'ended')),
      compatibility_score NUMERIC(5, 2),
      match_reasons JSONB DEFAULT '[]',
      current_streak INTEGER DEFAULT 0,
      longest_streak INTEGER DEFAULT 0,
      last_mutual_activity TIMESTAMPTZ,
      total_workouts_together INTEGER DEFAULT 0,
      total_check_ins INTEGER DEFAULT 0,
      high_fives_exchanged INTEGER DEFAULT 0,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      ended_at TIMESTAMPTZ,
      UNIQUE(user1_id, user2_id)
    )
  `);

  await query(`CREATE INDEX IF NOT EXISTS idx_buddy_pairs_user1 ON buddy_pairs(user1_id)`);
  await query(`CREATE INDEX IF NOT EXISTS idx_buddy_pairs_user2 ON buddy_pairs(user2_id)`);
  await query(`CREATE INDEX IF NOT EXISTS idx_buddy_pairs_status ON buddy_pairs(status)`);
  await query(`CREATE INDEX IF NOT EXISTS idx_buddy_pairs_streak ON buddy_pairs(current_streak DESC)`);

  // ============================================
  // BUDDY INVITES TABLE
  // Pending buddy requests
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
      buddy_pair_id UUID NOT NULL REFERENCES buddy_pairs(id) ON DELETE CASCADE,
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
      buddy_pair_id UUID NOT NULL REFERENCES buddy_pairs(id) ON DELETE CASCADE,
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
          current_streak = current_streak + 1,
          longest_streak = GREATEST(longest_streak, current_streak + 1),
          last_mutual_activity = NOW(),
          total_check_ins = total_check_ins + 1
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
  // ============================================
  await query(`
    CREATE OR REPLACE FUNCTION create_buddy_pair_on_accept()
    RETURNS TRIGGER AS $$
    DECLARE
      v_user1 TEXT;
      v_user2 TEXT;
    BEGIN
      IF NEW.status = 'accepted' AND OLD.status = 'pending' THEN
        IF NEW.sender_id < NEW.recipient_id THEN
          v_user1 := NEW.sender_id;
          v_user2 := NEW.recipient_id;
        ELSE
          v_user1 := NEW.recipient_id;
          v_user2 := NEW.sender_id;
        END IF;

        INSERT INTO buddy_pairs (user1_id, user2_id, compatibility_score, match_reasons)
        VALUES (v_user1, v_user2, NEW.compatibility_score, NEW.match_reasons)
        ON CONFLICT (user1_id, user2_id) DO UPDATE
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
      bp1.preferred_times && bp2.preferred_times AS overlapping_times,
      bp1.preferred_days && bp2.preferred_days AS overlapping_days,
      bp1.goals && bp2.goals AS overlapping_goals,
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
    WHERE bp1.is_looking_for_buddy = true
      AND bp2.is_looking_for_buddy = true
      AND NOT EXISTS (
        SELECT 1 FROM buddy_pairs
        WHERE (user1_id = bp1.user_id AND user2_id = bp2.user_id)
           OR (user1_id = bp2.user_id AND user2_id = bp1.user_id)
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
  await query(`DROP TABLE IF EXISTS buddy_pairs`);
  await query(`DROP TABLE IF EXISTS buddy_preferences`);
}
