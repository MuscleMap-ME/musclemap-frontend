/**
 * Migration 107: VIP Beta Tester System
 *
 * Creates infrastructure for managing VIP beta testers who help test the platform:
 * 1. Beta tester flags and permissions in users table
 * 2. Progress snapshots for backup/restoration
 * 3. Enhanced bug reporting with priority queuing
 * 4. Activity journal for tracking tester experiences
 * 5. Direct communication channel for testers
 *
 * Designed specifically for dedicated testers like Veronika Pokrovskaia
 * who provide invaluable feedback during development.
 */

import { query } from '../client';
import { loggers } from '../../lib/logger';

const log = loggers.db;

export async function up(): Promise<void> {
  log.info('Running migration: 107_vip_beta_tester_system');

  // ============================================
  // 1. Add beta tester flags to users table
  // ============================================
  log.info('Adding beta tester columns to users table...');

  await query(`
    ALTER TABLE users ADD COLUMN IF NOT EXISTS is_beta_tester BOOLEAN DEFAULT FALSE;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS beta_tester_since TIMESTAMPTZ;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS beta_tester_tier TEXT DEFAULT 'standard';
    ALTER TABLE users ADD COLUMN IF NOT EXISTS beta_tester_notes TEXT;
  `);

  await query(`
    COMMENT ON COLUMN users.is_beta_tester IS 'Flag indicating user is a VIP beta tester';
    COMMENT ON COLUMN users.beta_tester_since IS 'When the user became a beta tester';
    COMMENT ON COLUMN users.beta_tester_tier IS 'Beta tester tier: standard, vip, founding';
    COMMENT ON COLUMN users.beta_tester_notes IS 'Admin notes about this beta tester';
  `);

  // Index for finding beta testers
  await query(`
    CREATE INDEX IF NOT EXISTS idx_users_beta_tester
    ON users(is_beta_tester)
    WHERE is_beta_tester = TRUE;
  `);

  // ============================================
  // 2. Progress Snapshots Table
  // ============================================
  log.info('Creating beta tester progress snapshots table...');

  await query(`
    CREATE TABLE IF NOT EXISTS beta_tester_progress_snapshots (
      id TEXT PRIMARY KEY DEFAULT 'snap_' || substr(md5(random()::text), 1, 12),
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      snapshot_type TEXT NOT NULL DEFAULT 'automatic',
      snapshot_reason TEXT,

      -- Core progress data (denormalized for easy restoration)
      level INTEGER,
      xp INTEGER,
      credit_balance INTEGER,
      lifetime_earned INTEGER,
      lifetime_spent INTEGER,

      -- Character stats snapshot
      strength NUMERIC,
      constitution NUMERIC,
      dexterity NUMERIC,
      power NUMERIC,
      endurance NUMERIC,
      vitality NUMERIC,

      -- Workout summary
      total_workouts INTEGER,
      total_tu NUMERIC,

      -- Achievement IDs (for reference)
      achievement_ids TEXT[],
      achievement_count INTEGER,

      -- Journey progress
      current_archetype_id TEXT,
      journey_progress_snapshot JSONB,

      -- Full data backup (compressed JSON)
      full_data_backup JSONB,

      -- Metadata
      created_at TIMESTAMPTZ DEFAULT NOW(),
      expires_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '90 days',
      restored_at TIMESTAMPTZ,
      restored_by TEXT REFERENCES users(id)
    );
  `);

  await query(`
    COMMENT ON TABLE beta_tester_progress_snapshots IS 'Periodic snapshots of beta tester progress for backup/restoration';

    CREATE INDEX IF NOT EXISTS idx_beta_snapshots_user
    ON beta_tester_progress_snapshots(user_id, created_at DESC);

    CREATE INDEX IF NOT EXISTS idx_beta_snapshots_expires
    ON beta_tester_progress_snapshots(expires_at)
    WHERE restored_at IS NULL;
  `);

  // ============================================
  // 3. Beta Tester Activity Journal
  // ============================================
  log.info('Creating beta tester journal table...');

  await query(`
    CREATE TABLE IF NOT EXISTS beta_tester_journal (
      id TEXT PRIMARY KEY DEFAULT 'journal_' || substr(md5(random()::text), 1, 12),
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,

      -- Journal entry
      entry_type TEXT NOT NULL DEFAULT 'note',
      title TEXT,
      content TEXT NOT NULL,
      mood TEXT,
      tags TEXT[],

      -- Context
      page_url TEXT,
      session_id TEXT,
      device_info JSONB,

      -- Screenshots/attachments
      attachment_urls TEXT[],

      -- Admin response
      admin_response TEXT,
      admin_responded_at TIMESTAMPTZ,
      admin_responded_by TEXT REFERENCES users(id),

      -- Metadata
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW(),
      is_read BOOLEAN DEFAULT FALSE,
      is_starred BOOLEAN DEFAULT FALSE,
      is_actionable BOOLEAN DEFAULT FALSE
    );
  `);

  await query(`
    COMMENT ON TABLE beta_tester_journal IS 'Activity journal for beta testers to log experiences and feedback';
    COMMENT ON COLUMN beta_tester_journal.entry_type IS 'Type: note, frustration, suggestion, bug_encountered, praise, question';
    COMMENT ON COLUMN beta_tester_journal.mood IS 'Tester mood: happy, frustrated, confused, excited, neutral';

    CREATE INDEX IF NOT EXISTS idx_beta_journal_user
    ON beta_tester_journal(user_id, created_at DESC);

    CREATE INDEX IF NOT EXISTS idx_beta_journal_unread
    ON beta_tester_journal(is_read, created_at DESC)
    WHERE is_read = FALSE;

    CREATE INDEX IF NOT EXISTS idx_beta_journal_actionable
    ON beta_tester_journal(is_actionable, created_at DESC)
    WHERE is_actionable = TRUE;
  `);

  // ============================================
  // 4. Enhanced Bug Report Queue
  // ============================================
  log.info('Adding beta tester columns to user_feedback table...');

  await query(`
    ALTER TABLE user_feedback ADD COLUMN IF NOT EXISTS is_beta_tester_report BOOLEAN DEFAULT FALSE;
    ALTER TABLE user_feedback ADD COLUMN IF NOT EXISTS beta_tester_priority INTEGER DEFAULT 0;
    ALTER TABLE user_feedback ADD COLUMN IF NOT EXISTS auto_acknowledged_at TIMESTAMPTZ;
    ALTER TABLE user_feedback ADD COLUMN IF NOT EXISTS last_status_notification_at TIMESTAMPTZ;
  `);

  await query(`
    COMMENT ON COLUMN user_feedback.is_beta_tester_report IS 'Flag indicating this report came from a beta tester';
    COMMENT ON COLUMN user_feedback.beta_tester_priority IS 'Priority boost for beta tester reports (0-10)';
    COMMENT ON COLUMN user_feedback.auto_acknowledged_at IS 'When the system auto-acknowledged this report';
    COMMENT ON COLUMN user_feedback.last_status_notification_at IS 'When user was last notified of status change';

    CREATE INDEX IF NOT EXISTS idx_feedback_beta_priority
    ON user_feedback(is_beta_tester_report, beta_tester_priority DESC, created_at ASC)
    WHERE status = 'open' AND type = 'bug_report';
  `);

  // ============================================
  // 5. Bug Report Status History
  // ============================================
  log.info('Creating feedback status history table...');

  await query(`
    CREATE TABLE IF NOT EXISTS feedback_status_history (
      id TEXT PRIMARY KEY DEFAULT 'fsh_' || substr(md5(random()::text), 1, 12),
      feedback_id TEXT NOT NULL REFERENCES user_feedback(id) ON DELETE CASCADE,
      old_status TEXT,
      new_status TEXT NOT NULL,
      changed_by TEXT REFERENCES users(id),
      change_reason TEXT,
      is_system_change BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    COMMENT ON TABLE feedback_status_history IS 'History of all status changes for feedback items';

    CREATE INDEX IF NOT EXISTS idx_feedback_status_history
    ON feedback_status_history(feedback_id, created_at DESC);
  `);

  // ============================================
  // 6. Auto-snapshot function for beta testers
  // ============================================
  log.info('Creating beta tester snapshot functions...');

  await query(`
    CREATE OR REPLACE FUNCTION create_beta_tester_snapshot(
      p_user_id TEXT,
      p_reason TEXT DEFAULT 'automatic'
    ) RETURNS TEXT AS $$
    DECLARE
      v_snapshot_id TEXT;
      v_user RECORD;
      v_stats RECORD;
      v_credits RECORD;
      v_achievements TEXT[];
      v_journey JSONB;
    BEGIN
      -- Get user data
      SELECT * INTO v_user FROM users WHERE id = p_user_id;
      IF NOT FOUND THEN
        RETURN NULL;
      END IF;

      -- Get character stats
      SELECT * INTO v_stats FROM character_stats WHERE user_id = p_user_id;

      -- Get credit balance
      SELECT * INTO v_credits FROM credit_balances WHERE user_id = p_user_id;

      -- Get achievement IDs
      SELECT ARRAY_AGG(achievement_id) INTO v_achievements
      FROM achievement_events WHERE user_id = p_user_id;

      -- Get journey progress
      SELECT jsonb_agg(row_to_json(jp)) INTO v_journey
      FROM journey_progress jp WHERE user_id = p_user_id;

      -- Create snapshot
      INSERT INTO beta_tester_progress_snapshots (
        user_id,
        snapshot_type,
        snapshot_reason,
        level,
        xp,
        credit_balance,
        lifetime_earned,
        lifetime_spent,
        strength,
        constitution,
        dexterity,
        power,
        endurance,
        vitality,
        total_workouts,
        total_tu,
        achievement_ids,
        achievement_count,
        current_archetype_id,
        journey_progress_snapshot,
        full_data_backup
      ) VALUES (
        p_user_id,
        CASE WHEN p_reason = 'automatic' THEN 'automatic' ELSE 'manual' END,
        p_reason,
        COALESCE(v_user.level, 1),
        COALESCE(v_user.xp, 0),
        COALESCE(v_credits.balance, 0),
        COALESCE(v_credits.lifetime_earned, 0),
        COALESCE(v_credits.lifetime_spent, 0),
        v_stats.strength,
        v_stats.constitution,
        v_stats.dexterity,
        v_stats.power,
        v_stats.endurance,
        v_stats.vitality,
        (SELECT COUNT(*) FROM workouts WHERE user_id = p_user_id),
        (SELECT COALESCE(SUM(total_tu), 0) FROM workouts WHERE user_id = p_user_id),
        v_achievements,
        COALESCE(array_length(v_achievements, 1), 0),
        v_user.current_archetype_id,
        v_journey,
        jsonb_build_object(
          'user', row_to_json(v_user),
          'stats', row_to_json(v_stats),
          'credits', row_to_json(v_credits),
          'snapshot_time', NOW()
        )
      )
      RETURNING id INTO v_snapshot_id;

      RETURN v_snapshot_id;
    END;
    $$ LANGUAGE plpgsql;

    COMMENT ON FUNCTION create_beta_tester_snapshot IS 'Creates a progress snapshot for a beta tester';
  `);

  // ============================================
  // 7. Trigger to auto-flag beta tester feedback
  // ============================================
  log.info('Creating beta tester feedback trigger...');

  await query(`
    CREATE OR REPLACE FUNCTION flag_beta_tester_feedback()
    RETURNS TRIGGER AS $$
    DECLARE
      v_is_beta BOOLEAN;
      v_tier TEXT;
    BEGIN
      -- Check if user is a beta tester
      SELECT is_beta_tester, beta_tester_tier
      INTO v_is_beta, v_tier
      FROM users WHERE id = NEW.user_id;

      IF v_is_beta THEN
        NEW.is_beta_tester_report := TRUE;
        NEW.beta_tester_priority := CASE
          WHEN v_tier = 'founding' THEN 10
          WHEN v_tier = 'vip' THEN 7
          ELSE 5
        END;

        -- Auto-acknowledge immediately for beta testers
        NEW.auto_acknowledged_at := NOW();
      END IF;

      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;

    DROP TRIGGER IF EXISTS trg_flag_beta_tester_feedback ON user_feedback;
    CREATE TRIGGER trg_flag_beta_tester_feedback
    BEFORE INSERT ON user_feedback
    FOR EACH ROW
    EXECUTE FUNCTION flag_beta_tester_feedback();
  `);

  // ============================================
  // 8. Trigger to track feedback status changes
  // ============================================
  log.info('Creating feedback status tracking trigger...');

  await query(`
    CREATE OR REPLACE FUNCTION track_feedback_status_change()
    RETURNS TRIGGER AS $$
    BEGIN
      IF OLD.status IS DISTINCT FROM NEW.status THEN
        INSERT INTO feedback_status_history (
          feedback_id,
          old_status,
          new_status,
          is_system_change
        ) VALUES (
          NEW.id,
          OLD.status,
          NEW.status,
          TRUE
        );
      END IF;
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;

    DROP TRIGGER IF EXISTS trg_track_feedback_status ON user_feedback;
    CREATE TRIGGER trg_track_feedback_status
    AFTER UPDATE ON user_feedback
    FOR EACH ROW
    EXECUTE FUNCTION track_feedback_status_change();
  `);

  // ============================================
  // 9. Daily auto-snapshot for active beta testers
  // ============================================
  log.info('Creating daily snapshot function...');

  await query(`
    CREATE OR REPLACE FUNCTION run_daily_beta_snapshots()
    RETURNS TABLE(user_id TEXT, snapshot_id TEXT, success BOOLEAN) AS $$
    DECLARE
      v_user RECORD;
      v_snap_id TEXT;
    BEGIN
      FOR v_user IN
        SELECT u.id
        FROM users u
        WHERE u.is_beta_tester = TRUE
        AND EXISTS (
          SELECT 1 FROM activity_events ae
          WHERE ae.user_id = u.id
          AND ae.created_at > NOW() - INTERVAL '7 days'
        )
        AND NOT EXISTS (
          SELECT 1 FROM beta_tester_progress_snapshots s
          WHERE s.user_id = u.id
          AND s.created_at > CURRENT_DATE
        )
      LOOP
        BEGIN
          SELECT create_beta_tester_snapshot(v_user.id, 'daily_automatic')
          INTO v_snap_id;

          user_id := v_user.id;
          snapshot_id := v_snap_id;
          success := v_snap_id IS NOT NULL;
          RETURN NEXT;
        EXCEPTION WHEN OTHERS THEN
          user_id := v_user.id;
          snapshot_id := NULL;
          success := FALSE;
          RETURN NEXT;
        END;
      END LOOP;
    END;
    $$ LANGUAGE plpgsql;

    COMMENT ON FUNCTION run_daily_beta_snapshots IS 'Creates daily progress snapshots for all active beta testers';
  `);

  // ============================================
  // 10. Progress restoration function
  // ============================================
  log.info('Creating progress restoration function...');

  await query(`
    CREATE OR REPLACE FUNCTION restore_beta_tester_progress(
      p_snapshot_id TEXT,
      p_admin_user_id TEXT
    ) RETURNS JSONB AS $$
    DECLARE
      v_snapshot RECORD;
      v_result JSONB;
    BEGIN
      -- Get the snapshot
      SELECT * INTO v_snapshot
      FROM beta_tester_progress_snapshots
      WHERE id = p_snapshot_id;

      IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Snapshot not found');
      END IF;

      IF v_snapshot.restored_at IS NOT NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Snapshot already restored');
      END IF;

      -- Restore user level and XP
      UPDATE users SET
        level = COALESCE(v_snapshot.level, level),
        xp = COALESCE(v_snapshot.xp, xp),
        current_archetype_id = COALESCE(v_snapshot.current_archetype_id, current_archetype_id),
        updated_at = NOW()
      WHERE id = v_snapshot.user_id;

      -- Restore character stats
      UPDATE character_stats SET
        strength = COALESCE(v_snapshot.strength, strength),
        constitution = COALESCE(v_snapshot.constitution, constitution),
        dexterity = COALESCE(v_snapshot.dexterity, dexterity),
        power = COALESCE(v_snapshot.power, power),
        endurance = COALESCE(v_snapshot.endurance, endurance),
        vitality = COALESCE(v_snapshot.vitality, vitality),
        updated_at = NOW()
      WHERE user_id = v_snapshot.user_id;

      -- Restore credit balance
      UPDATE credit_balances SET
        balance = COALESCE(v_snapshot.credit_balance, balance),
        updated_at = NOW()
      WHERE user_id = v_snapshot.user_id;

      -- Mark snapshot as restored
      UPDATE beta_tester_progress_snapshots SET
        restored_at = NOW(),
        restored_by = p_admin_user_id
      WHERE id = p_snapshot_id;

      -- Log the restoration in admin audit
      INSERT INTO admin_credit_audit_log (
        id,
        admin_user_id,
        action,
        target_user_id,
        reason,
        details
      ) VALUES (
        'audit_' || substr(md5(random()::text), 1, 12),
        p_admin_user_id,
        'adjust_balance',
        v_snapshot.user_id,
        'Beta tester progress restoration from snapshot ' || p_snapshot_id,
        jsonb_build_object(
          'snapshot_id', p_snapshot_id,
          'snapshot_date', v_snapshot.created_at,
          'restored_level', v_snapshot.level,
          'restored_xp', v_snapshot.xp,
          'restored_credits', v_snapshot.credit_balance
        )
      );

      RETURN jsonb_build_object(
        'success', true,
        'restored', jsonb_build_object(
          'level', v_snapshot.level,
          'xp', v_snapshot.xp,
          'credits', v_snapshot.credit_balance,
          'stats', jsonb_build_object(
            'strength', v_snapshot.strength,
            'constitution', v_snapshot.constitution,
            'dexterity', v_snapshot.dexterity,
            'power', v_snapshot.power,
            'endurance', v_snapshot.endurance,
            'vitality', v_snapshot.vitality
          )
        )
      );
    END;
    $$ LANGUAGE plpgsql;

    COMMENT ON FUNCTION restore_beta_tester_progress IS 'Restores a beta tester progress from a snapshot';
  `);

  // ============================================
  // 11. View for admin to see beta tester status
  // ============================================
  log.info('Creating beta tester overview view...');

  await query(`
    CREATE OR REPLACE VIEW v_beta_tester_overview AS
    SELECT
      u.id,
      u.username,
      u.email,
      u.display_name,
      u.is_beta_tester,
      u.beta_tester_since,
      u.beta_tester_tier,
      u.beta_tester_notes,
      u.level,
      u.xp,
      cb.balance as credit_balance,
      (SELECT COUNT(*) FROM workouts w WHERE w.user_id = u.id) as total_workouts,
      (SELECT COUNT(*) FROM user_feedback uf WHERE uf.user_id = u.id) as feedback_count,
      (SELECT COUNT(*) FROM user_feedback uf WHERE uf.user_id = u.id AND uf.type = 'bug_report') as bug_reports,
      (SELECT COUNT(*) FROM beta_tester_journal j WHERE j.user_id = u.id) as journal_entries,
      (SELECT COUNT(*) FROM beta_tester_progress_snapshots s WHERE s.user_id = u.id) as snapshot_count,
      (SELECT MAX(created_at) FROM beta_tester_progress_snapshots s WHERE s.user_id = u.id) as last_snapshot,
      (SELECT MAX(created_at) FROM activity_events ae WHERE ae.user_id = u.id) as last_activity,
      u.created_at as account_created
    FROM users u
    LEFT JOIN credit_balances cb ON cb.user_id = u.id
    WHERE u.is_beta_tester = TRUE
    ORDER BY u.beta_tester_tier DESC NULLS LAST, u.beta_tester_since ASC;

    COMMENT ON VIEW v_beta_tester_overview IS 'Overview of all beta testers with their activity stats';
  `);

  // ============================================
  // 12. View for pending beta tester feedback
  // ============================================
  log.info('Creating pending beta tester feedback view...');

  await query(`
    CREATE OR REPLACE VIEW v_beta_tester_pending_feedback AS
    SELECT
      uf.id,
      uf.type,
      uf.title,
      uf.description,
      uf.status,
      uf.priority,
      uf.beta_tester_priority,
      uf.created_at,
      uf.auto_acknowledged_at,
      uf.last_status_notification_at,
      u.username,
      u.email,
      u.beta_tester_tier,
      (SELECT COUNT(*) FROM feedback_responses fr WHERE fr.feedback_id = uf.id) as response_count,
      (SELECT MAX(created_at) FROM feedback_status_history fsh WHERE fsh.feedback_id = uf.id) as last_status_change
    FROM user_feedback uf
    JOIN users u ON u.id = uf.user_id
    WHERE uf.is_beta_tester_report = TRUE
    AND uf.status NOT IN ('resolved', 'closed', 'wont_fix')
    ORDER BY uf.beta_tester_priority DESC, uf.created_at ASC;

    COMMENT ON VIEW v_beta_tester_pending_feedback IS 'Pending feedback from beta testers, prioritized';
  `);

  log.info('Migration 107_vip_beta_tester_system completed successfully');
}

export async function down(): Promise<void> {
  log.info('Rolling back migration: 107_vip_beta_tester_system');

  // Drop views
  await query(`DROP VIEW IF EXISTS v_beta_tester_pending_feedback CASCADE`);
  await query(`DROP VIEW IF EXISTS v_beta_tester_overview CASCADE`);

  // Drop functions
  await query(`DROP FUNCTION IF EXISTS restore_beta_tester_progress CASCADE`);
  await query(`DROP FUNCTION IF EXISTS run_daily_beta_snapshots CASCADE`);
  await query(`DROP FUNCTION IF EXISTS create_beta_tester_snapshot CASCADE`);
  await query(`DROP FUNCTION IF EXISTS track_feedback_status_change CASCADE`);
  await query(`DROP FUNCTION IF EXISTS flag_beta_tester_feedback CASCADE`);

  // Drop triggers
  await query(`DROP TRIGGER IF EXISTS trg_track_feedback_status ON user_feedback`);
  await query(`DROP TRIGGER IF EXISTS trg_flag_beta_tester_feedback ON user_feedback`);

  // Drop tables
  await query(`DROP TABLE IF EXISTS feedback_status_history CASCADE`);
  await query(`DROP TABLE IF EXISTS beta_tester_journal CASCADE`);
  await query(`DROP TABLE IF EXISTS beta_tester_progress_snapshots CASCADE`);

  // Drop indexes
  await query(`DROP INDEX IF EXISTS idx_feedback_beta_priority`);
  await query(`DROP INDEX IF EXISTS idx_users_beta_tester`);

  // Remove columns from user_feedback
  await query(`
    ALTER TABLE user_feedback DROP COLUMN IF EXISTS is_beta_tester_report;
    ALTER TABLE user_feedback DROP COLUMN IF EXISTS beta_tester_priority;
    ALTER TABLE user_feedback DROP COLUMN IF EXISTS auto_acknowledged_at;
    ALTER TABLE user_feedback DROP COLUMN IF EXISTS last_status_notification_at;
  `);

  // Remove columns from users
  await query(`
    ALTER TABLE users DROP COLUMN IF EXISTS is_beta_tester;
    ALTER TABLE users DROP COLUMN IF EXISTS beta_tester_since;
    ALTER TABLE users DROP COLUMN IF EXISTS beta_tester_tier;
    ALTER TABLE users DROP COLUMN IF EXISTS beta_tester_notes;
  `);

  log.info('Rollback of 107_vip_beta_tester_system completed');
}
