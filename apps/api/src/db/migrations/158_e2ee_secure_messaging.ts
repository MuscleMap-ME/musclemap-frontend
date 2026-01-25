/**
 * Migration 158: End-to-End Encrypted Secure Messaging System
 *
 * Implements:
 * - E2EE key management (Signal Protocol compatible)
 * - Encrypted message storage (server cannot read content)
 * - External file attachment metadata (files stored on R2/IPFS)
 * - NSFW content moderation infrastructure
 * - Age verification and minor protection
 * - Granular privacy controls
 * - Trust scoring for anti-abuse
 *
 * DESTRUCTIVE: Down migration drops E2EE tables and columns - intentional for rollback capability
 */

import { query } from '../client';

export async function up(): Promise<void> {
  // ============================================
  // 1. USER ENCRYPTION KEYS (Signal Protocol)
  // ============================================

  // Main key bundle table - stores public keys only
  // Private keys NEVER leave the client device
  await query(`
    CREATE TABLE IF NOT EXISTS user_encryption_keys (
      id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      device_id TEXT NOT NULL,

      -- Identity key (long-term, Ed25519) - for signing
      identity_key_public TEXT NOT NULL,
      identity_key_fingerprint TEXT NOT NULL,

      -- Signed prekey (rotates monthly, X25519) - for key exchange
      signed_prekey_public TEXT NOT NULL,
      signed_prekey_signature TEXT NOT NULL,
      signed_prekey_id INTEGER NOT NULL,
      signed_prekey_created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

      -- Device metadata
      device_name TEXT,
      device_type TEXT,
      last_active_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

      UNIQUE(user_id, device_id)
    )
  `);

  await query(`CREATE INDEX IF NOT EXISTS idx_encryption_keys_user ON user_encryption_keys(user_id)`);
  await query(`CREATE INDEX IF NOT EXISTS idx_encryption_keys_fingerprint ON user_encryption_keys(identity_key_fingerprint)`);
  await query(`CREATE INDEX IF NOT EXISTS idx_encryption_keys_device ON user_encryption_keys(user_id, device_id)`);

  // One-time prekeys pool (consumed on first message to a new contact)
  await query(`
    CREATE TABLE IF NOT EXISTS user_onetime_prekeys (
      id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      device_id TEXT NOT NULL,
      prekey_id INTEGER NOT NULL,
      prekey_public TEXT NOT NULL,
      used BOOLEAN NOT NULL DEFAULT FALSE,
      used_at TIMESTAMPTZ,
      used_by_user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
      used_in_conversation_id TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

      UNIQUE(user_id, device_id, prekey_id)
    )
  `);

  await query(`CREATE INDEX IF NOT EXISTS idx_onetime_prekeys_available ON user_onetime_prekeys(user_id, device_id) WHERE used = FALSE`);
  await query(`CREATE INDEX IF NOT EXISTS idx_onetime_prekeys_cleanup ON user_onetime_prekeys(used, used_at) WHERE used = TRUE`);

  // ============================================
  // 2. ENCRYPTED MESSAGES
  // ============================================

  await query(`
    CREATE TABLE IF NOT EXISTS encrypted_messages (
      id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
      conversation_id TEXT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
      sender_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,

      -- Encryption protocol version (for future upgrades)
      protocol_version INTEGER NOT NULL DEFAULT 1,

      -- Sender identification (fingerprint, not user ID - for verification)
      sender_fingerprint TEXT NOT NULL,
      sender_device_id TEXT NOT NULL,

      -- Key exchange data (only for initial messages in a session)
      key_exchange_ephemeral TEXT,
      key_exchange_onetime_id INTEGER,

      -- Double Ratchet header
      ratchet_public_key TEXT NOT NULL,
      message_number INTEGER NOT NULL,
      previous_chain_length INTEGER NOT NULL DEFAULT 0,

      -- Encrypted content (XChaCha20-Poly1305)
      nonce TEXT NOT NULL,
      ciphertext TEXT NOT NULL,

      -- Metadata (unencrypted, for server operations)
      -- Server cannot read actual content
      has_file_attachment BOOLEAN NOT NULL DEFAULT FALSE,
      content_type TEXT NOT NULL DEFAULT 'text',

      -- NSFW metadata (client-reported scores)
      nsfw_score REAL DEFAULT 0,
      nsfw_category TEXT,
      user_marked_adult BOOLEAN NOT NULL DEFAULT FALSE,

      -- Timestamps
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      edited_at TIMESTAMPTZ,
      deleted_at TIMESTAMPTZ,
      expires_at TIMESTAMPTZ,

      -- Delivery tracking
      delivered_count INTEGER NOT NULL DEFAULT 0,
      read_count INTEGER NOT NULL DEFAULT 0
    )
  `);

  await query(`CREATE INDEX IF NOT EXISTS idx_enc_messages_conversation ON encrypted_messages(conversation_id, created_at DESC)`);
  await query(`CREATE INDEX IF NOT EXISTS idx_enc_messages_keyset ON encrypted_messages(conversation_id, created_at DESC, id DESC)`);
  await query(`CREATE INDEX IF NOT EXISTS idx_enc_messages_sender ON encrypted_messages(sender_id)`);
  await query(`CREATE INDEX IF NOT EXISTS idx_enc_messages_expires ON encrypted_messages(expires_at) WHERE expires_at IS NOT NULL`);
  await query(`CREATE INDEX IF NOT EXISTS idx_enc_messages_deleted ON encrypted_messages(deleted_at) WHERE deleted_at IS NULL`);

  // Message delivery receipts for encrypted messages
  await query(`
    CREATE TABLE IF NOT EXISTS encrypted_message_receipts (
      id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
      message_id TEXT NOT NULL REFERENCES encrypted_messages(id) ON DELETE CASCADE,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      device_id TEXT,
      delivered_at TIMESTAMPTZ,
      read_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

      UNIQUE(message_id, user_id, device_id)
    )
  `);

  await query(`CREATE INDEX IF NOT EXISTS idx_enc_receipts_message ON encrypted_message_receipts(message_id)`);
  await query(`CREATE INDEX IF NOT EXISTS idx_enc_receipts_user ON encrypted_message_receipts(user_id, read_at) WHERE read_at IS NULL`);

  // ============================================
  // 3. FILE ATTACHMENT METADATA (Zero Storage)
  // ============================================

  await query(`
    CREATE TABLE IF NOT EXISTS encrypted_file_metadata (
      id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
      message_id TEXT NOT NULL REFERENCES encrypted_messages(id) ON DELETE CASCADE,

      -- External storage reference (file content NOT on our server)
      storage_provider TEXT NOT NULL,
      content_id TEXT NOT NULL,

      -- File info (for UI, not content)
      file_name_encrypted TEXT,
      file_size_bytes BIGINT NOT NULL,
      mime_type TEXT NOT NULL,

      -- File encryption nonce (key is in encrypted message)
      file_nonce TEXT NOT NULL,

      -- NSFW metadata
      nsfw_score REAL DEFAULT 0,
      nsfw_category TEXT,
      user_marked_adult BOOLEAN NOT NULL DEFAULT FALSE,

      -- Thumbnail (encrypted, stored inline if small)
      thumbnail_data TEXT,
      thumbnail_width INTEGER,
      thumbnail_height INTEGER,

      -- Access tracking
      download_count INTEGER NOT NULL DEFAULT 0,
      last_downloaded_at TIMESTAMPTZ,

      -- Expiration (files auto-delete)
      expires_at TIMESTAMPTZ NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

      UNIQUE(storage_provider, content_id)
    )
  `);

  await query(`CREATE INDEX IF NOT EXISTS idx_file_meta_message ON encrypted_file_metadata(message_id)`);
  await query(`CREATE INDEX IF NOT EXISTS idx_file_meta_cid ON encrypted_file_metadata(storage_provider, content_id)`);
  await query(`CREATE INDEX IF NOT EXISTS idx_file_meta_expires ON encrypted_file_metadata(expires_at)`);

  // ============================================
  // 4. AGE VERIFICATION & CONTENT PREFERENCES
  // ============================================

  await query(`
    CREATE TABLE IF NOT EXISTS user_content_preferences (
      user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,

      -- Age verification (we store minimal data)
      is_minor BOOLEAN NOT NULL DEFAULT TRUE,
      age_verified BOOLEAN NOT NULL DEFAULT FALSE,
      age_verification_method TEXT,
      age_verified_at TIMESTAMPTZ,

      -- Adult content settings (LOCKED for minors)
      allow_adult_content BOOLEAN NOT NULL DEFAULT FALSE,
      show_adult_content_warning BOOLEAN NOT NULL DEFAULT TRUE,
      can_send_adult_content BOOLEAN NOT NULL DEFAULT FALSE,

      -- Display preferences
      display_age BOOLEAN NOT NULL DEFAULT FALSE,
      display_age_value INTEGER,

      -- Content filtering thresholds
      nsfw_block_threshold REAL NOT NULL DEFAULT 0.7,
      nsfw_blur_threshold REAL NOT NULL DEFAULT 0.3,

      -- Auto-moderation
      auto_block_nsfw BOOLEAN NOT NULL DEFAULT FALSE,
      auto_report_illegal BOOLEAN NOT NULL DEFAULT TRUE,

      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  // ============================================
  // 5. MESSAGING PRIVACY SETTINGS
  // ============================================

  await query(`
    CREATE TABLE IF NOT EXISTS user_messaging_privacy (
      user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,

      -- Who can contact this user?
      who_can_message TEXT NOT NULL DEFAULT 'everyone',
      who_can_send_files TEXT NOT NULL DEFAULT 'mutuals',
      who_can_see_online TEXT NOT NULL DEFAULT 'mutuals',
      who_can_see_read_receipts TEXT NOT NULL DEFAULT 'friends',
      who_can_see_typing TEXT NOT NULL DEFAULT 'friends',

      -- Message requests (new conversations need approval)
      require_message_request BOOLEAN NOT NULL DEFAULT FALSE,

      -- Disappearing messages default
      auto_delete_messages BOOLEAN NOT NULL DEFAULT FALSE,
      auto_delete_hours INTEGER NOT NULL DEFAULT 168,

      -- File settings
      allowed_file_types JSONB NOT NULL DEFAULT '{"images":true,"videos":true,"audio":true,"documents":true}',
      max_file_size_mb INTEGER NOT NULL DEFAULT 25,

      -- E2EE settings
      e2ee_required BOOLEAN NOT NULL DEFAULT FALSE,
      allow_non_e2ee_fallback BOOLEAN NOT NULL DEFAULT TRUE,

      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  // ============================================
  // 6. TRUST SCORES (Anti-Abuse)
  // ============================================

  await query(`
    CREATE TABLE IF NOT EXISTS user_trust_scores (
      user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,

      -- Overall trust score (0-100)
      trust_score INTEGER NOT NULL DEFAULT 50,

      -- Component scores
      account_age_score INTEGER NOT NULL DEFAULT 0,
      verification_score INTEGER NOT NULL DEFAULT 0,
      activity_score INTEGER NOT NULL DEFAULT 0,
      report_score INTEGER NOT NULL DEFAULT 50,

      -- Status flags
      is_trusted_sender BOOLEAN NOT NULL DEFAULT FALSE,
      is_restricted BOOLEAN NOT NULL DEFAULT FALSE,
      is_shadowbanned BOOLEAN NOT NULL DEFAULT FALSE,

      -- Messaging limits (can be adjusted per user)
      max_new_conversations_per_day INTEGER NOT NULL DEFAULT 20,
      max_messages_per_minute INTEGER NOT NULL DEFAULT 60,
      max_files_per_day INTEGER NOT NULL DEFAULT 50,

      -- History
      total_reports_received INTEGER NOT NULL DEFAULT 0,
      total_reports_upheld INTEGER NOT NULL DEFAULT 0,
      total_reports_dismissed INTEGER NOT NULL DEFAULT 0,

      -- Last calculation
      calculated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  await query(`CREATE INDEX IF NOT EXISTS idx_trust_scores_score ON user_trust_scores(trust_score)`);
  await query(`CREATE INDEX IF NOT EXISTS idx_trust_scores_restricted ON user_trust_scores(is_restricted) WHERE is_restricted = TRUE`);

  // ============================================
  // 7. CONTENT REPORTS (Enhanced for E2EE)
  // ============================================

  await query(`
    CREATE TABLE IF NOT EXISTS encrypted_content_reports (
      id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,

      reporter_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      reported_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,

      -- Reference to content
      message_id TEXT REFERENCES encrypted_messages(id) ON DELETE SET NULL,
      file_content_id TEXT,

      -- Report details
      reason TEXT NOT NULL,
      description TEXT,

      -- Evidence (reporter provides decrypted content hash)
      content_hash TEXT,
      screenshot_provided BOOLEAN NOT NULL DEFAULT FALSE,

      -- Status
      status TEXT NOT NULL DEFAULT 'pending',
      priority TEXT NOT NULL DEFAULT 'normal',
      reviewed_by TEXT REFERENCES users(id),
      reviewed_at TIMESTAMPTZ,
      resolution TEXT,
      action_taken TEXT,

      -- Auto-escalation tracking
      is_escalated BOOLEAN NOT NULL DEFAULT FALSE,
      escalated_at TIMESTAMPTZ,
      escalation_reason TEXT,

      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  await query(`CREATE INDEX IF NOT EXISTS idx_content_reports_status ON encrypted_content_reports(status) WHERE status = 'pending'`);
  await query(`CREATE INDEX IF NOT EXISTS idx_content_reports_reported ON encrypted_content_reports(reported_user_id)`);
  await query(`CREATE INDEX IF NOT EXISTS idx_content_reports_escalated ON encrypted_content_reports(is_escalated, created_at) WHERE is_escalated = TRUE`);

  // ============================================
  // 8. MESSAGE REQUESTS (Spam Prevention)
  // ============================================

  await query(`
    CREATE TABLE IF NOT EXISTS message_requests (
      id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
      conversation_id TEXT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
      requester_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      recipient_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,

      -- Request status
      status TEXT NOT NULL DEFAULT 'pending',
      responded_at TIMESTAMPTZ,

      -- Preview (first message, for recipient to decide)
      preview_message_id TEXT REFERENCES encrypted_messages(id),

      -- Auto-decisions
      auto_accepted BOOLEAN NOT NULL DEFAULT FALSE,
      auto_rejected BOOLEAN NOT NULL DEFAULT FALSE,
      rejection_reason TEXT,

      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

      UNIQUE(conversation_id, recipient_id)
    )
  `);

  await query(`CREATE INDEX IF NOT EXISTS idx_message_requests_recipient ON message_requests(recipient_id, status) WHERE status = 'pending'`);
  await query(`CREATE INDEX IF NOT EXISTS idx_message_requests_requester ON message_requests(requester_id)`);

  // ============================================
  // 9. E2EE SESSION METADATA
  // ============================================

  await query(`
    CREATE TABLE IF NOT EXISTS e2ee_sessions (
      id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
      conversation_id TEXT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      device_id TEXT NOT NULL,
      peer_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      peer_device_id TEXT NOT NULL,

      -- Session state (NOT the actual keys - those are client-side only)
      session_version INTEGER NOT NULL DEFAULT 1,
      established_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      last_message_at TIMESTAMPTZ,
      messages_sent INTEGER NOT NULL DEFAULT 0,
      messages_received INTEGER NOT NULL DEFAULT 0,

      -- Ratchet state tracking (for debugging, not actual keys)
      last_ratchet_at TIMESTAMPTZ,
      ratchet_count INTEGER NOT NULL DEFAULT 0,

      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

      UNIQUE(conversation_id, user_id, device_id, peer_user_id, peer_device_id)
    )
  `);

  await query(`CREATE INDEX IF NOT EXISTS idx_e2ee_sessions_user ON e2ee_sessions(user_id, device_id)`);
  await query(`CREATE INDEX IF NOT EXISTS idx_e2ee_sessions_conversation ON e2ee_sessions(conversation_id)`);

  // ============================================
  // 10. FILE UPLOAD TOKENS (Presigned URLs)
  // ============================================

  await query(`
    CREATE TABLE IF NOT EXISTS file_upload_tokens (
      id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      conversation_id TEXT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,

      -- Token details
      token_hash TEXT NOT NULL UNIQUE,
      content_id TEXT NOT NULL,

      -- File metadata (validated before upload allowed)
      file_size_bytes BIGINT NOT NULL,
      mime_type TEXT NOT NULL,
      nsfw_score REAL DEFAULT 0,
      user_marked_adult BOOLEAN NOT NULL DEFAULT FALSE,

      -- Storage destination
      storage_provider TEXT NOT NULL DEFAULT 'r2',
      upload_url TEXT,

      -- Status
      status TEXT NOT NULL DEFAULT 'pending',
      uploaded_at TIMESTAMPTZ,
      expires_at TIMESTAMPTZ NOT NULL,

      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  await query(`CREATE INDEX IF NOT EXISTS idx_upload_tokens_user ON file_upload_tokens(user_id, created_at DESC)`);
  await query(`CREATE INDEX IF NOT EXISTS idx_upload_tokens_token ON file_upload_tokens(token_hash)`);
  await query(`CREATE INDEX IF NOT EXISTS idx_upload_tokens_expires ON file_upload_tokens(expires_at) WHERE status = 'pending'`);

  // ============================================
  // 11. MODIFY EXISTING TABLES
  // ============================================

  // Add E2EE flag to conversations
  await query(`ALTER TABLE conversations ADD COLUMN IF NOT EXISTS is_e2ee BOOLEAN NOT NULL DEFAULT FALSE`);
  await query(`ALTER TABLE conversations ADD COLUMN IF NOT EXISTS e2ee_version INTEGER`);
  await query(`ALTER TABLE conversations ADD COLUMN IF NOT EXISTS e2ee_established_at TIMESTAMPTZ`);

  // Add encryption status to users
  await query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS e2ee_enabled BOOLEAN NOT NULL DEFAULT FALSE`);
  await query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS e2ee_setup_at TIMESTAMPTZ`);
  await query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS is_minor BOOLEAN NOT NULL DEFAULT TRUE`);

  // Create index for E2EE conversations
  await query(`CREATE INDEX IF NOT EXISTS idx_conversations_e2ee ON conversations(is_e2ee) WHERE is_e2ee = TRUE`);

  // ============================================
  // 12. FUNCTIONS & TRIGGERS
  // ============================================

  // Function to enforce minor restrictions
  await query(`
    CREATE OR REPLACE FUNCTION enforce_minor_content_restrictions()
    RETURNS TRIGGER AS $$
    BEGIN
      -- If user is a minor, force-disable adult content
      IF NEW.is_minor = TRUE THEN
        NEW.allow_adult_content := FALSE;
        NEW.can_send_adult_content := FALSE;
      END IF;

      -- Update timestamp
      NEW.updated_at := NOW();

      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql
  `);

  await query(`DROP TRIGGER IF EXISTS trigger_enforce_minor_restrictions ON user_content_preferences`);
  await query(`
    CREATE TRIGGER trigger_enforce_minor_restrictions
    BEFORE INSERT OR UPDATE ON user_content_preferences
    FOR EACH ROW EXECUTE FUNCTION enforce_minor_content_restrictions()
  `);

  // Function to update trust score on reports
  await query(`
    CREATE OR REPLACE FUNCTION update_trust_score_on_report()
    RETURNS TRIGGER AS $$
    BEGIN
      IF NEW.status = 'resolved' AND NEW.action_taken IS NOT NULL AND NEW.action_taken != 'no_action' THEN
        -- Decrease trust score for upheld reports
        UPDATE user_trust_scores
        SET
          total_reports_upheld = total_reports_upheld + 1,
          report_score = GREATEST(0, report_score - 10),
          trust_score = GREATEST(0, trust_score - 5),
          updated_at = NOW()
        WHERE user_id = NEW.reported_user_id;
      ELSIF NEW.status = 'dismissed' THEN
        -- Slight increase for dismissed reports
        UPDATE user_trust_scores
        SET
          total_reports_dismissed = total_reports_dismissed + 1,
          report_score = LEAST(100, report_score + 2),
          updated_at = NOW()
        WHERE user_id = NEW.reported_user_id;
      END IF;

      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql
  `);

  await query(`DROP TRIGGER IF EXISTS trigger_update_trust_on_report ON encrypted_content_reports`);
  await query(`
    CREATE TRIGGER trigger_update_trust_on_report
    AFTER UPDATE OF status ON encrypted_content_reports
    FOR EACH ROW
    WHEN (OLD.status = 'pending' AND NEW.status IN ('resolved', 'dismissed'))
    EXECUTE FUNCTION update_trust_score_on_report()
  `);

  // Function to auto-escalate reports
  await query(`
    CREATE OR REPLACE FUNCTION auto_escalate_reports()
    RETURNS TRIGGER AS $$
    DECLARE
      report_count INTEGER;
    BEGIN
      -- Count pending reports against this user
      SELECT COUNT(*) INTO report_count
      FROM encrypted_content_reports
      WHERE reported_user_id = NEW.reported_user_id
        AND status = 'pending'
        AND created_at > NOW() - INTERVAL '24 hours';

      -- Auto-escalate if 3+ reports in 24 hours
      IF report_count >= 3 THEN
        UPDATE encrypted_content_reports
        SET is_escalated = TRUE,
            escalated_at = NOW(),
            escalation_reason = 'Multiple reports in 24 hours',
            priority = 'high'
        WHERE reported_user_id = NEW.reported_user_id
          AND status = 'pending'
          AND is_escalated = FALSE;
      END IF;

      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql
  `);

  await query(`DROP TRIGGER IF EXISTS trigger_auto_escalate_reports ON encrypted_content_reports`);
  await query(`
    CREATE TRIGGER trigger_auto_escalate_reports
    AFTER INSERT ON encrypted_content_reports
    FOR EACH ROW EXECUTE FUNCTION auto_escalate_reports()
  `);

  // Function to expire messages
  await query(`
    CREATE OR REPLACE FUNCTION cleanup_expired_encrypted_messages()
    RETURNS INTEGER AS $$
    DECLARE
      deleted_count INTEGER;
    BEGIN
      -- Delete expired messages
      WITH deleted AS (
        DELETE FROM encrypted_messages
        WHERE expires_at IS NOT NULL AND expires_at < NOW()
        RETURNING id
      )
      SELECT COUNT(*) INTO deleted_count FROM deleted;

      RETURN deleted_count;
    END;
    $$ LANGUAGE plpgsql
  `);

  // Function to cleanup old file metadata
  await query(`
    CREATE OR REPLACE FUNCTION cleanup_expired_file_metadata()
    RETURNS INTEGER AS $$
    DECLARE
      deleted_count INTEGER;
    BEGIN
      WITH deleted AS (
        DELETE FROM encrypted_file_metadata
        WHERE expires_at < NOW()
        RETURNING id
      )
      SELECT COUNT(*) INTO deleted_count FROM deleted;

      RETURN deleted_count;
    END;
    $$ LANGUAGE plpgsql
  `);

  // Function to sync is_minor between users and content_preferences
  await query(`
    CREATE OR REPLACE FUNCTION sync_minor_status()
    RETURNS TRIGGER AS $$
    BEGIN
      -- Sync to users table
      UPDATE users SET is_minor = NEW.is_minor WHERE id = NEW.user_id;
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql
  `);

  await query(`DROP TRIGGER IF EXISTS trigger_sync_minor_status ON user_content_preferences`);
  await query(`
    CREATE TRIGGER trigger_sync_minor_status
    AFTER INSERT OR UPDATE OF is_minor ON user_content_preferences
    FOR EACH ROW EXECUTE FUNCTION sync_minor_status()
  `);

  // ============================================
  // 13. DEFAULT DATA FOR EXISTING USERS
  // ============================================

  // Create default content preferences for existing users
  await query(`
    INSERT INTO user_content_preferences (user_id)
    SELECT id FROM users
    WHERE id NOT IN (SELECT user_id FROM user_content_preferences)
    ON CONFLICT (user_id) DO NOTHING
  `);

  // Create default messaging privacy for existing users
  await query(`
    INSERT INTO user_messaging_privacy (user_id)
    SELECT id FROM users
    WHERE id NOT IN (SELECT user_id FROM user_messaging_privacy)
    ON CONFLICT (user_id) DO NOTHING
  `);

  // Create default trust scores for existing users
  await query(`
    INSERT INTO user_trust_scores (user_id, account_age_score, trust_score)
    SELECT
      id,
      LEAST(30, EXTRACT(EPOCH FROM (NOW() - created_at)) / 86400)::INTEGER,
      50 + LEAST(30, EXTRACT(EPOCH FROM (NOW() - created_at)) / 86400)::INTEGER
    FROM users
    WHERE id NOT IN (SELECT user_id FROM user_trust_scores)
    ON CONFLICT (user_id) DO NOTHING
  `);
}

export async function down(): Promise<void> {
  // Drop triggers first
  await query(`DROP TRIGGER IF EXISTS trigger_enforce_minor_restrictions ON user_content_preferences`);
  await query(`DROP TRIGGER IF EXISTS trigger_update_trust_on_report ON encrypted_content_reports`);
  await query(`DROP TRIGGER IF EXISTS trigger_auto_escalate_reports ON encrypted_content_reports`);
  await query(`DROP TRIGGER IF EXISTS trigger_sync_minor_status ON user_content_preferences`);

  // Drop functions
  await query(`DROP FUNCTION IF EXISTS enforce_minor_content_restrictions()`);
  await query(`DROP FUNCTION IF EXISTS update_trust_score_on_report()`);
  await query(`DROP FUNCTION IF EXISTS auto_escalate_reports()`);
  await query(`DROP FUNCTION IF EXISTS cleanup_expired_encrypted_messages()`);
  await query(`DROP FUNCTION IF EXISTS cleanup_expired_file_metadata()`);
  await query(`DROP FUNCTION IF EXISTS sync_minor_status()`);

  // Remove columns from existing tables
  await query(`ALTER TABLE conversations DROP COLUMN IF EXISTS is_e2ee`);
  await query(`ALTER TABLE conversations DROP COLUMN IF EXISTS e2ee_version`);
  await query(`ALTER TABLE conversations DROP COLUMN IF EXISTS e2ee_established_at`);
  await query(`ALTER TABLE users DROP COLUMN IF EXISTS e2ee_enabled`);
  await query(`ALTER TABLE users DROP COLUMN IF EXISTS e2ee_setup_at`);
  await query(`ALTER TABLE users DROP COLUMN IF EXISTS is_minor`);

  // Drop tables in reverse dependency order
  await query(`DROP TABLE IF EXISTS file_upload_tokens`);
  await query(`DROP TABLE IF EXISTS e2ee_sessions`);
  await query(`DROP TABLE IF EXISTS message_requests`);
  await query(`DROP TABLE IF EXISTS encrypted_content_reports`);
  await query(`DROP TABLE IF EXISTS user_trust_scores`);
  await query(`DROP TABLE IF EXISTS user_messaging_privacy`);
  await query(`DROP TABLE IF EXISTS user_content_preferences`);
  await query(`DROP TABLE IF EXISTS encrypted_file_metadata`);
  await query(`DROP TABLE IF EXISTS encrypted_message_receipts`);
  await query(`DROP TABLE IF EXISTS encrypted_messages`);
  await query(`DROP TABLE IF EXISTS user_onetime_prekeys`);
  await query(`DROP TABLE IF EXISTS user_encryption_keys`);
}
