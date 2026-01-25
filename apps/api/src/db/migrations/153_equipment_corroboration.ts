/**
 * Migration: Equipment Corroboration System
 *
 * Adds tables and functionality for:
 * - Equipment suggestions (users can propose new equipment at venues)
 * - Equipment voting (corroboration system for suggestions)
 * - Condition voting (community consensus on equipment condition)
 * - Auto-approval when 3+ votes with <2 rejections
 */

import { query } from '../client';

export async function up(): Promise<void> {
  // 1. Create equipment_suggestions table
  await query(`
    CREATE TABLE IF NOT EXISTS equipment_suggestions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      venue_id UUID NOT NULL REFERENCES fitness_venues(id) ON DELETE CASCADE,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      equipment_type TEXT NOT NULL,
      quantity INTEGER DEFAULT 1,
      condition TEXT CHECK (condition IN ('excellent', 'good', 'fair', 'poor', 'broken')),
      notes TEXT,
      photo_url TEXT,
      latitude NUMERIC,
      longitude NUMERIC,
      distance_from_venue NUMERIC,
      location_verified BOOLEAN DEFAULT false,
      status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'contested')),
      support_count INTEGER DEFAULT 0,
      reject_count INTEGER DEFAULT 0,
      credits_awarded INTEGER DEFAULT 0,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW(),
      approved_at TIMESTAMPTZ,
      approved_by TEXT REFERENCES users(id),
      rejection_reason TEXT
    )
  `);

  // 2. Create equipment_suggestion_votes table
  await query(`
    CREATE TABLE IF NOT EXISTS equipment_suggestion_votes (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      suggestion_id UUID NOT NULL REFERENCES equipment_suggestions(id) ON DELETE CASCADE,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      vote_type TEXT NOT NULL CHECK (vote_type IN ('support', 'reject')),
      latitude NUMERIC,
      longitude NUMERIC,
      distance_from_venue NUMERIC,
      location_verified BOOLEAN DEFAULT false,
      notes TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(suggestion_id, user_id)
    )
  `);

  // 3. Create equipment_condition_votes table (for existing equipment)
  await query(`
    CREATE TABLE IF NOT EXISTS equipment_condition_votes (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      equipment_item_id UUID NOT NULL REFERENCES venue_equipment_items(id) ON DELETE CASCADE,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      vote_type TEXT NOT NULL CHECK (vote_type IN ('condition', 'exists', 'removed')),
      vote_value TEXT NOT NULL,
      latitude NUMERIC,
      longitude NUMERIC,
      distance_from_venue NUMERIC,
      location_verified BOOLEAN DEFAULT false,
      notes TEXT,
      credits_awarded INTEGER DEFAULT 0,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(equipment_item_id, user_id, vote_type)
    )
  `);

  // 4. Add consensus tracking to venue_equipment_items
  await query(`
    ALTER TABLE venue_equipment_items
    ADD COLUMN IF NOT EXISTS consensus_condition TEXT,
    ADD COLUMN IF NOT EXISTS condition_vote_count INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS exists_vote_count INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS removed_vote_count INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS confidence_level TEXT DEFAULT 'unverified'
      CHECK (confidence_level IN ('unverified', 'needs_verification', 'community_verified', 'highly_trusted'))
  `);

  // 5. Create indexes for performance
  await query(`
    CREATE INDEX IF NOT EXISTS idx_equipment_suggestions_venue
    ON equipment_suggestions(venue_id);

    CREATE INDEX IF NOT EXISTS idx_equipment_suggestions_user
    ON equipment_suggestions(user_id);

    CREATE INDEX IF NOT EXISTS idx_equipment_suggestions_status
    ON equipment_suggestions(status);

    CREATE INDEX IF NOT EXISTS idx_equipment_suggestions_pending
    ON equipment_suggestions(venue_id, status)
    WHERE status = 'pending';

    CREATE INDEX IF NOT EXISTS idx_suggestion_votes_suggestion
    ON equipment_suggestion_votes(suggestion_id);

    CREATE INDEX IF NOT EXISTS idx_suggestion_votes_user
    ON equipment_suggestion_votes(user_id);

    CREATE INDEX IF NOT EXISTS idx_condition_votes_equipment
    ON equipment_condition_votes(equipment_item_id);

    CREATE INDEX IF NOT EXISTS idx_condition_votes_user
    ON equipment_condition_votes(user_id);
  `);

  // 6. Create function to update suggestion vote counts
  await query(`
    CREATE OR REPLACE FUNCTION update_suggestion_vote_counts()
    RETURNS TRIGGER AS $$
    BEGIN
      IF TG_OP = 'INSERT' THEN
        IF NEW.vote_type = 'support' THEN
          UPDATE equipment_suggestions
          SET support_count = support_count + 1,
              updated_at = NOW()
          WHERE id = NEW.suggestion_id;
        ELSIF NEW.vote_type = 'reject' THEN
          UPDATE equipment_suggestions
          SET reject_count = reject_count + 1,
              updated_at = NOW()
          WHERE id = NEW.suggestion_id;
        END IF;
      ELSIF TG_OP = 'DELETE' THEN
        IF OLD.vote_type = 'support' THEN
          UPDATE equipment_suggestions
          SET support_count = GREATEST(support_count - 1, 0),
              updated_at = NOW()
          WHERE id = OLD.suggestion_id;
        ELSIF OLD.vote_type = 'reject' THEN
          UPDATE equipment_suggestions
          SET reject_count = GREATEST(reject_count - 1, 0),
              updated_at = NOW()
          WHERE id = OLD.suggestion_id;
        END IF;
      END IF;
      RETURN COALESCE(NEW, OLD);
    END;
    $$ LANGUAGE plpgsql
  `);

  // 7. Create trigger for vote count updates
  await query(`
    DROP TRIGGER IF EXISTS trigger_update_suggestion_votes ON equipment_suggestion_votes;
    CREATE TRIGGER trigger_update_suggestion_votes
    AFTER INSERT OR DELETE ON equipment_suggestion_votes
    FOR EACH ROW
    EXECUTE FUNCTION update_suggestion_vote_counts()
  `);

  // 8. Create function to auto-approve/reject suggestions
  await query(`
    CREATE OR REPLACE FUNCTION check_suggestion_auto_approval()
    RETURNS TRIGGER AS $$
    DECLARE
      suggestion_record equipment_suggestions%ROWTYPE;
    BEGIN
      SELECT * INTO suggestion_record
      FROM equipment_suggestions
      WHERE id = NEW.suggestion_id;

      -- Auto-approve: 3+ support AND <2 reject
      IF suggestion_record.support_count >= 3 AND suggestion_record.reject_count < 2 THEN
        UPDATE equipment_suggestions
        SET status = 'approved',
            approved_at = NOW(),
            updated_at = NOW()
        WHERE id = NEW.suggestion_id AND status = 'pending';

        -- Create the equipment item
        IF FOUND THEN
          INSERT INTO venue_equipment_items (
            venue_id, equipment_type, condition, quantity, notes, is_verified,
            verification_count, confidence_level
          )
          VALUES (
            suggestion_record.venue_id,
            suggestion_record.equipment_type,
            COALESCE(suggestion_record.condition, 'good'),
            COALESCE(suggestion_record.quantity, 1),
            suggestion_record.notes,
            true,
            suggestion_record.support_count,
            'community_verified'
          );

          -- Award bonus credits to suggester
          UPDATE users
          SET credit_balance = credit_balance + 30
          WHERE id = suggestion_record.user_id;

          UPDATE equipment_suggestions
          SET credits_awarded = credits_awarded + 30
          WHERE id = NEW.suggestion_id;
        END IF;

      -- Auto-reject: 3+ reject AND <2 support
      ELSIF suggestion_record.reject_count >= 3 AND suggestion_record.support_count < 2 THEN
        UPDATE equipment_suggestions
        SET status = 'rejected',
            rejection_reason = 'Community rejected',
            updated_at = NOW()
        WHERE id = NEW.suggestion_id AND status = 'pending';

      -- Contested: significant votes on both sides
      ELSIF suggestion_record.support_count >= 2 AND suggestion_record.reject_count >= 2 THEN
        UPDATE equipment_suggestions
        SET status = 'contested',
            updated_at = NOW()
        WHERE id = NEW.suggestion_id AND status = 'pending';
      END IF;

      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql
  `);

  // 9. Create trigger for auto-approval check
  await query(`
    DROP TRIGGER IF EXISTS trigger_check_auto_approval ON equipment_suggestion_votes;
    CREATE TRIGGER trigger_check_auto_approval
    AFTER INSERT ON equipment_suggestion_votes
    FOR EACH ROW
    EXECUTE FUNCTION check_suggestion_auto_approval()
  `);

  // 10. Create function to update equipment condition consensus
  await query(`
    CREATE OR REPLACE FUNCTION update_equipment_condition_consensus()
    RETURNS TRIGGER AS $$
    DECLARE
      condition_counts RECORD;
      total_votes INTEGER;
      top_condition TEXT;
      conf_level TEXT;
    BEGIN
      -- Count condition votes
      SELECT
        COUNT(*) FILTER (WHERE vote_type = 'condition') as condition_count,
        COUNT(*) FILTER (WHERE vote_type = 'exists') as exists_count,
        COUNT(*) FILTER (WHERE vote_type = 'removed') as removed_count,
        MODE() WITHIN GROUP (ORDER BY vote_value) FILTER (WHERE vote_type = 'condition') as mode_condition
      INTO condition_counts
      FROM equipment_condition_votes
      WHERE equipment_item_id = COALESCE(NEW.equipment_item_id, OLD.equipment_item_id);

      total_votes := COALESCE(condition_counts.condition_count, 0);
      top_condition := condition_counts.mode_condition;

      -- Determine confidence level
      IF total_votes >= 6 THEN
        conf_level := 'highly_trusted';
      ELSIF total_votes >= 3 THEN
        conf_level := 'community_verified';
      ELSIF total_votes >= 1 THEN
        conf_level := 'needs_verification';
      ELSE
        conf_level := 'unverified';
      END IF;

      -- Update equipment item
      UPDATE venue_equipment_items
      SET
        consensus_condition = COALESCE(top_condition, condition),
        condition_vote_count = COALESCE(condition_counts.condition_count, 0),
        exists_vote_count = COALESCE(condition_counts.exists_count, 0),
        removed_vote_count = COALESCE(condition_counts.removed_count, 0),
        confidence_level = conf_level,
        updated_at = NOW()
      WHERE id = COALESCE(NEW.equipment_item_id, OLD.equipment_item_id);

      RETURN COALESCE(NEW, OLD);
    END;
    $$ LANGUAGE plpgsql
  `);

  // 11. Create trigger for condition consensus updates
  await query(`
    DROP TRIGGER IF EXISTS trigger_update_condition_consensus ON equipment_condition_votes;
    CREATE TRIGGER trigger_update_condition_consensus
    AFTER INSERT OR DELETE ON equipment_condition_votes
    FOR EACH ROW
    EXECUTE FUNCTION update_equipment_condition_consensus()
  `);

  console.log('✅ Migration 153: Equipment corroboration system created');
}

export async function down(): Promise<void> {
  // Drop triggers first
  await query(`DROP TRIGGER IF EXISTS trigger_update_condition_consensus ON equipment_condition_votes`);
  await query(`DROP TRIGGER IF EXISTS trigger_check_auto_approval ON equipment_suggestion_votes`);
  await query(`DROP TRIGGER IF EXISTS trigger_update_suggestion_votes ON equipment_suggestion_votes`);

  // Drop functions
  await query(`DROP FUNCTION IF EXISTS update_equipment_condition_consensus()`);
  await query(`DROP FUNCTION IF EXISTS check_suggestion_auto_approval()`);
  await query(`DROP FUNCTION IF EXISTS update_suggestion_vote_counts()`);

  // Drop columns from venue_equipment_items
  await query(`
    ALTER TABLE venue_equipment_items
    DROP COLUMN IF EXISTS consensus_condition,
    DROP COLUMN IF EXISTS condition_vote_count,
    DROP COLUMN IF EXISTS exists_vote_count,
    DROP COLUMN IF EXISTS removed_vote_count,
    DROP COLUMN IF EXISTS confidence_level
  `);

  // Drop tables
  await query(`DROP TABLE IF EXISTS equipment_condition_votes`);
  await query(`DROP TABLE IF EXISTS equipment_suggestion_votes`);
  await query(`DROP TABLE IF EXISTS equipment_suggestions`);

  console.log('✅ Migration 153: Equipment corroboration system removed');
}
