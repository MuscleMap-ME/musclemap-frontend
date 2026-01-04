/**
 * Migration: Feature Expansion
 *
 * This migration adds:
 * 1. Hangouts (Location-Based Community Hubs) with PostGIS
 * 2. Enhanced Credits Economy with P2P transfers
 * 3. Video Assets and Exercise Demos
 * 4. i18n Content Translations
 * 5. Imported Activities (Apple Watch, etc.)
 * 6. Moderation Queue
 * 7. User Location Settings
 * 8. Workout Sessions and Rep Events
 */

import { db } from '../client';
import { loggers } from '../../lib/logger';

const log = loggers.db;

async function tableExists(tableName: string): Promise<boolean> {
  const result = await db.queryOne<{ count: string }>(
    `SELECT COUNT(*) as count FROM information_schema.tables WHERE table_schema = 'public' AND table_name = $1`,
    [tableName]
  );
  return parseInt(result?.count || '0') > 0;
}

async function columnExists(tableName: string, columnName: string): Promise<boolean> {
  const result = await db.queryOne<{ count: string }>(
    `SELECT COUNT(*) as count FROM information_schema.columns WHERE table_name = $1 AND column_name = $2`,
    [tableName, columnName]
  );
  return parseInt(result?.count || '0') > 0;
}

async function extensionExists(extName: string): Promise<boolean> {
  const result = await db.queryOne<{ count: string }>(
    `SELECT COUNT(*) as count FROM pg_extension WHERE extname = $1`,
    [extName]
  );
  return parseInt(result?.count || '0') > 0;
}

async function functionExists(funcName: string): Promise<boolean> {
  const result = await db.queryOne<{ count: string }>(
    `SELECT COUNT(*) as count FROM pg_proc WHERE proname = $1`,
    [funcName]
  );
  return parseInt(result?.count || '0') > 0;
}

export async function migrate(): Promise<void> {
  log.info('Running migration: 007_feature_expansion');

  // ============================================
  // EXTENSIONS
  // ============================================
  log.info('Checking required extensions...');

  // PostGIS for location-based features
  if (!(await extensionExists('postgis'))) {
    log.info('Creating PostGIS extension...');
    try {
      await db.query('CREATE EXTENSION IF NOT EXISTS postgis');
    } catch (e: any) {
      log.warn('PostGIS extension not available - geo features will be limited', { error: e.message });
    }
  }

  // ============================================
  // HANGOUT TYPES
  // ============================================
  if (!(await tableExists('hangout_types'))) {
    log.info('Creating hangout_types table...');
    await db.query(`
      CREATE TABLE hangout_types (
        id SMALLSERIAL PRIMARY KEY,
        slug VARCHAR(50) UNIQUE NOT NULL,
        name VARCHAR(100) NOT NULL,
        description TEXT,
        icon_url VARCHAR(500),
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    // Seed hangout types
    const hangoutTypes = [
      ['bjj-academy', 'BJJ Academy', 'Brazilian Jiu-Jitsu training facilities'],
      ['karate-dojo', 'Karate Dojo', 'Traditional karate training halls'],
      ['mma-club', 'MMA Club', 'Mixed martial arts training centers'],
      ['weight-gym', 'Weight Training Gym', 'Strength and conditioning facilities'],
      ['parkour-zone', 'Parkour Zone', 'Urban movement training areas'],
      ['beach-workout', 'Beach Workout', 'Outdoor beach fitness locations'],
      ['yoga-center', 'Yoga Center', 'Yoga and mindfulness studios'],
      ['running-campus', 'Running Campus', 'Running tracks and trails'],
      ['hiking-trail', 'Hiking Trail', 'Nature hiking and trekking routes'],
      ['ski-lodge', 'Ski Lodge', 'Winter sports facilities'],
      ['climbing-spot', 'Climbing Spot', 'Rock climbing and bouldering areas'],
      ['calisthenics-park', 'Calisthenics Park', 'Outdoor bodyweight training parks'],
    ];

    for (const [slug, name, description] of hangoutTypes) {
      await db.query(
        'INSERT INTO hangout_types (slug, name, description) VALUES ($1, $2, $3) ON CONFLICT (slug) DO NOTHING',
        [slug, name, description]
      );
    }
    log.info('Hangout types seeded');
  }

  // ============================================
  // HANGOUTS
  // ============================================
  if (!(await tableExists('hangouts'))) {
    log.info('Creating hangouts table...');

    // Check if PostGIS is available
    const hasPostGIS = await extensionExists('postgis');

    if (hasPostGIS) {
      await db.query(`
        CREATE TABLE hangouts (
          id BIGSERIAL PRIMARY KEY,
          type_id SMALLINT NOT NULL REFERENCES hangout_types(id),
          name VARCHAR(200) NOT NULL,
          description TEXT,
          location GEOGRAPHY(POINT, 4326) NOT NULL,
          geohash VARCHAR(12),
          radius_meters SMALLINT DEFAULT 500,
          address TEXT,
          city VARCHAR(100),
          country_code CHAR(2),
          cover_image_url VARCHAR(500),
          member_count INTEGER NOT NULL DEFAULT 0,
          post_count INTEGER NOT NULL DEFAULT 0,
          is_verified BOOLEAN DEFAULT FALSE,
          is_active BOOLEAN DEFAULT TRUE,
          settings JSONB DEFAULT '{}',
          created_by TEXT REFERENCES users(id) ON DELETE SET NULL,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
        )
      `);

      await db.query('CREATE INDEX idx_hangouts_location ON hangouts USING GIST (location)');
      await db.query("CREATE INDEX idx_hangouts_geohash ON hangouts (geohash varchar_pattern_ops) WHERE is_active = TRUE");
    } else {
      // Fallback without PostGIS
      await db.query(`
        CREATE TABLE hangouts (
          id BIGSERIAL PRIMARY KEY,
          type_id SMALLINT NOT NULL REFERENCES hangout_types(id),
          name VARCHAR(200) NOT NULL,
          description TEXT,
          latitude DOUBLE PRECISION NOT NULL,
          longitude DOUBLE PRECISION NOT NULL,
          geohash VARCHAR(12),
          radius_meters SMALLINT DEFAULT 500,
          address TEXT,
          city VARCHAR(100),
          country_code CHAR(2),
          cover_image_url VARCHAR(500),
          member_count INTEGER NOT NULL DEFAULT 0,
          post_count INTEGER NOT NULL DEFAULT 0,
          is_verified BOOLEAN DEFAULT FALSE,
          is_active BOOLEAN DEFAULT TRUE,
          settings JSONB DEFAULT '{}',
          created_by TEXT REFERENCES users(id) ON DELETE SET NULL,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
        )
      `);

      await db.query('CREATE INDEX idx_hangouts_lat_lng ON hangouts (latitude, longitude)');
      await db.query("CREATE INDEX idx_hangouts_geohash ON hangouts (geohash varchar_pattern_ops) WHERE is_active = TRUE");
    }

    await db.query('CREATE INDEX idx_hangouts_type ON hangouts (type_id)');
    await db.query('CREATE INDEX idx_hangouts_city ON hangouts (city) WHERE city IS NOT NULL');
    await db.query('CREATE INDEX idx_hangouts_country ON hangouts (country_code) WHERE country_code IS NOT NULL');
  }

  // ============================================
  // HANGOUT MEMBERSHIPS
  // ============================================
  if (!(await tableExists('hangout_memberships'))) {
    log.info('Creating hangout_memberships table...');
    await db.query(`
      CREATE TABLE hangout_memberships (
        hangout_id BIGINT NOT NULL REFERENCES hangouts(id) ON DELETE CASCADE,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        role SMALLINT DEFAULT 0,
        notifications_enabled BOOLEAN DEFAULT TRUE,
        joined_at TIMESTAMPTZ DEFAULT NOW(),
        PRIMARY KEY (hangout_id, user_id)
      )
    `);

    await db.query('CREATE INDEX idx_memberships_user ON hangout_memberships (user_id)');
    await db.query('CREATE INDEX idx_memberships_hangout ON hangout_memberships (hangout_id)');

    // Member count trigger
    await db.query(`
      CREATE OR REPLACE FUNCTION update_hangout_member_count()
      RETURNS TRIGGER AS $$
      BEGIN
        IF TG_OP = 'INSERT' THEN
          UPDATE hangouts SET member_count = member_count + 1, updated_at = NOW() WHERE id = NEW.hangout_id;
        ELSIF TG_OP = 'DELETE' THEN
          UPDATE hangouts SET member_count = GREATEST(member_count - 1, 0), updated_at = NOW() WHERE id = OLD.hangout_id;
        END IF;
        RETURN NULL;
      END;
      $$ LANGUAGE plpgsql
    `);

    await db.query(`
      CREATE TRIGGER trg_membership_count
      AFTER INSERT OR DELETE ON hangout_memberships
      FOR EACH ROW EXECUTE FUNCTION update_hangout_member_count()
    `);
  }

  // ============================================
  // HANGOUT POSTS
  // ============================================
  if (!(await tableExists('hangout_posts'))) {
    log.info('Creating hangout_posts table...');
    await db.query(`
      CREATE TABLE hangout_posts (
        id TEXT PRIMARY KEY DEFAULT 'hp_' || replace(uuid_generate_v4()::text, '-', ''),
        hangout_id BIGINT NOT NULL REFERENCES hangouts(id) ON DELETE CASCADE,
        author_id TEXT REFERENCES users(id) ON DELETE SET NULL,
        content TEXT NOT NULL,
        content_lang CHAR(5) DEFAULT 'en',
        media_urls JSONB DEFAULT '[]',
        comment_count SMALLINT DEFAULT 0,
        like_count SMALLINT DEFAULT 0,
        credit_entry_id TEXT,
        is_pinned BOOLEAN DEFAULT FALSE,
        is_hidden BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    await db.query('CREATE INDEX idx_posts_hangout_time ON hangout_posts (hangout_id, created_at DESC)');
    await db.query('CREATE INDEX idx_posts_author ON hangout_posts (author_id) WHERE author_id IS NOT NULL');

    // Post count trigger
    await db.query(`
      CREATE OR REPLACE FUNCTION update_hangout_post_count()
      RETURNS TRIGGER AS $$
      BEGIN
        IF TG_OP = 'INSERT' THEN
          UPDATE hangouts SET post_count = post_count + 1, updated_at = NOW() WHERE id = NEW.hangout_id;
        ELSIF TG_OP = 'DELETE' THEN
          UPDATE hangouts SET post_count = GREATEST(post_count - 1, 0), updated_at = NOW() WHERE id = OLD.hangout_id;
        END IF;
        RETURN NULL;
      END;
      $$ LANGUAGE plpgsql
    `);

    await db.query(`
      CREATE TRIGGER trg_post_count
      AFTER INSERT OR DELETE ON hangout_posts
      FOR EACH ROW EXECUTE FUNCTION update_hangout_post_count()
    `);
  }

  // ============================================
  // ENHANCED CREDIT SYSTEM
  // ============================================

  // Add new columns to credit_balances if they don't exist
  if (await tableExists('credit_balances')) {
    if (!(await columnExists('credit_balances', 'total_earned'))) {
      log.info('Adding total_earned column to credit_balances...');
      await db.query('ALTER TABLE credit_balances ADD COLUMN total_earned BIGINT NOT NULL DEFAULT 0');
      await db.query('UPDATE credit_balances SET total_earned = lifetime_earned');
    }

    if (!(await columnExists('credit_balances', 'total_spent'))) {
      log.info('Adding total_spent column to credit_balances...');
      await db.query('ALTER TABLE credit_balances ADD COLUMN total_spent BIGINT NOT NULL DEFAULT 0');
      await db.query('UPDATE credit_balances SET total_spent = lifetime_spent');
    }

    if (!(await columnExists('credit_balances', 'last_entry_id'))) {
      log.info('Adding last_entry_id column to credit_balances...');
      await db.query('ALTER TABLE credit_balances ADD COLUMN last_entry_id TEXT');
    }
  }

  // Add new columns to credit_ledger if they don't exist
  if (await tableExists('credit_ledger')) {
    if (!(await columnExists('credit_ledger', 'reason'))) {
      log.info('Adding reason column to credit_ledger...');
      await db.query('ALTER TABLE credit_ledger ADD COLUMN reason SMALLINT');
    }

    if (!(await columnExists('credit_ledger', 'ref_type'))) {
      log.info('Adding ref_type column to credit_ledger...');
      await db.query('ALTER TABLE credit_ledger ADD COLUMN ref_type SMALLINT');
    }

    if (!(await columnExists('credit_ledger', 'ref_id'))) {
      log.info('Adding ref_id column to credit_ledger...');
      await db.query('ALTER TABLE credit_ledger ADD COLUMN ref_id TEXT');
    }

    if (!(await columnExists('credit_ledger', 'ip_address'))) {
      log.info('Adding ip_address column to credit_ledger...');
      await db.query('ALTER TABLE credit_ledger ADD COLUMN ip_address INET');
    }

    if (!(await columnExists('credit_ledger', 'user_agent_hash'))) {
      log.info('Adding user_agent_hash column to credit_ledger...');
      await db.query('ALTER TABLE credit_ledger ADD COLUMN user_agent_hash BYTEA');
    }
  }

  // Create credit transaction function
  if (!(await functionExists('credit_transaction'))) {
    log.info('Creating credit_transaction function...');
    await db.query(`
      CREATE OR REPLACE FUNCTION credit_transaction(
        p_user_id TEXT,
        p_delta INTEGER,
        p_reason SMALLINT,
        p_ref_type SMALLINT,
        p_ref_id TEXT,
        p_idempotency_key TEXT,
        p_ip INET DEFAULT NULL,
        p_ua_hash BYTEA DEFAULT NULL
      ) RETURNS TABLE(entry_id TEXT, new_balance BIGINT, was_duplicate BOOLEAN, version INTEGER)
      LANGUAGE plpgsql AS $$
      DECLARE
        v_current BIGINT;
        v_version INTEGER;
        v_new BIGINT;
        v_entry_id TEXT;
        v_existing_id TEXT;
        v_existing_balance BIGINT;
      BEGIN
        -- Advisory lock on user to prevent concurrent modifications
        PERFORM pg_advisory_xact_lock(hashtext('credit_tx'), hashtext(p_user_id));

        -- Check for existing idempotent transaction
        SELECT l.id, l.balance_after INTO v_existing_id, v_existing_balance
        FROM credit_ledger l WHERE l.user_id = p_user_id AND l.idempotency_key = p_idempotency_key;

        IF v_existing_id IS NOT NULL THEN
          RETURN QUERY SELECT v_existing_id, v_existing_balance, TRUE,
            (SELECT cb.version FROM credit_balances cb WHERE cb.user_id = p_user_id);
          RETURN;
        END IF;

        -- Get current balance with row-level lock
        SELECT balance, version INTO v_current, v_version FROM credit_balances WHERE user_id = p_user_id FOR UPDATE;

        IF NOT FOUND THEN
          -- Create account if it doesn't exist
          INSERT INTO credit_balances (user_id, balance, version, last_entry_id, total_earned, total_spent)
          VALUES (p_user_id, 0, 0, NULL, 0, 0)
          ON CONFLICT (user_id) DO NOTHING;

          SELECT balance, version INTO v_current, v_version FROM credit_balances WHERE user_id = p_user_id FOR UPDATE;
          v_current := COALESCE(v_current, 0);
          v_version := COALESCE(v_version, 0);
        END IF;

        v_new := v_current + p_delta;

        IF v_new < 0 THEN
          RAISE EXCEPTION 'INSUFFICIENT_CREDITS: have=%, need=%', v_current, ABS(p_delta);
        END IF;

        -- Generate entry ID
        v_entry_id := 'txn_' || replace(uuid_generate_v4()::text, '-', '');

        -- Insert ledger entry
        INSERT INTO credit_ledger (id, user_id, action, amount, balance_after, reason, ref_type, ref_id, idempotency_key, ip_address, user_agent_hash)
        VALUES (v_entry_id, p_user_id, 'credit_transaction', p_delta, v_new, p_reason, p_ref_type, p_ref_id, p_idempotency_key, p_ip, p_ua_hash);

        -- Update balance
        UPDATE credit_balances SET
          balance = v_new,
          total_earned = CASE WHEN p_delta > 0 THEN total_earned + p_delta ELSE total_earned END,
          total_spent = CASE WHEN p_delta < 0 THEN total_spent + ABS(p_delta) ELSE total_spent END,
          version = version + 1,
          last_entry_id = v_entry_id,
          updated_at = NOW()
        WHERE user_id = p_user_id;

        RETURN QUERY SELECT v_entry_id, v_new, FALSE, v_version + 1;
      END;
      $$
    `);
  }

  // Create P2P transfer function
  if (!(await functionExists('credit_transfer'))) {
    log.info('Creating credit_transfer function...');
    await db.query(`
      CREATE OR REPLACE FUNCTION credit_transfer(
        p_sender_id TEXT,
        p_recipient_id TEXT,
        p_amount INTEGER,
        p_transfer_id TEXT DEFAULT NULL
      ) RETURNS TABLE(transfer_id TEXT, sender_new_balance BIGINT, recipient_new_balance BIGINT)
      LANGUAGE plpgsql AS $$
      DECLARE
        v_sender BIGINT;
        v_recipient BIGINT;
        v_transfer_id TEXT;
      BEGIN
        IF p_sender_id = p_recipient_id THEN
          RAISE EXCEPTION 'SELF_TRANSFER: Cannot transfer to yourself';
        END IF;

        IF p_amount <= 0 OR p_amount > 1000000 THEN
          RAISE EXCEPTION 'INVALID_AMOUNT: Amount must be between 1 and 1000000';
        END IF;

        v_transfer_id := COALESCE(p_transfer_id, 'xfer_' || replace(uuid_generate_v4()::text, '-', ''));

        -- Lock users in consistent order to prevent deadlocks
        IF p_sender_id < p_recipient_id THEN
          PERFORM pg_advisory_xact_lock(hashtext('credit_tx'), hashtext(p_sender_id));
          PERFORM pg_advisory_xact_lock(hashtext('credit_tx'), hashtext(p_recipient_id));
        ELSE
          PERFORM pg_advisory_xact_lock(hashtext('credit_tx'), hashtext(p_recipient_id));
          PERFORM pg_advisory_xact_lock(hashtext('credit_tx'), hashtext(p_sender_id));
        END IF;

        -- Debit sender
        SELECT ct.new_balance INTO v_sender FROM credit_transaction(
          p_sender_id, -p_amount, 6::SMALLINT, 6::SMALLINT, p_recipient_id,
          v_transfer_id || ':sender', NULL, NULL
        ) ct;

        -- Credit recipient
        SELECT ct.new_balance INTO v_recipient FROM credit_transaction(
          p_recipient_id, p_amount, 7::SMALLINT, 6::SMALLINT, p_sender_id,
          v_transfer_id || ':recipient', NULL, NULL
        ) ct;

        RETURN QUERY SELECT v_transfer_id, v_sender, v_recipient;
      END;
      $$
    `);
  }

  // ============================================
  // WORKOUT SESSIONS
  // ============================================
  if (!(await tableExists('workout_sessions'))) {
    log.info('Creating workout_sessions table...');
    await db.query(`
      CREATE TABLE workout_sessions (
        id TEXT PRIMARY KEY DEFAULT 'sess_' || replace(uuid_generate_v4()::text, '-', ''),
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        ended_at TIMESTAMPTZ,
        source SMALLINT DEFAULT 0,
        source_ref VARCHAR(200),
        total_reps INTEGER DEFAULT 0,
        total_sets SMALLINT DEFAULT 0,
        total_volume_kg NUMERIC(10,2) DEFAULT 0,
        total_duration_seconds INTEGER,
        notes TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    await db.query('CREATE INDEX idx_sessions_user ON workout_sessions (user_id, started_at DESC)');
    await db.query('CREATE INDEX idx_sessions_source ON workout_sessions (source) WHERE source > 0');
  }

  // ============================================
  // REP EVENTS
  // ============================================
  if (!(await tableExists('rep_events'))) {
    log.info('Creating rep_events table...');
    await db.query(`
      CREATE TABLE rep_events (
        id TEXT PRIMARY KEY DEFAULT 'rep_' || replace(uuid_generate_v4()::text, '-', ''),
        session_id TEXT NOT NULL REFERENCES workout_sessions(id) ON DELETE CASCADE,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        exercise_id TEXT NOT NULL REFERENCES exercises(id),
        set_number SMALLINT NOT NULL,
        rep_count SMALLINT NOT NULL CHECK (rep_count BETWEEN 1 AND 500),
        weight_kg NUMERIC(6,2),
        duration_seconds SMALLINT,
        distance_meters NUMERIC(10,2),
        credited BOOLEAN DEFAULT FALSE,
        credit_entry_id TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    await db.query('CREATE INDEX idx_reps_session ON rep_events (session_id)');
    await db.query('CREATE INDEX idx_reps_user ON rep_events (user_id, created_at DESC)');
    await db.query('CREATE INDEX idx_reps_uncredited ON rep_events (user_id) WHERE credited = FALSE');
    await db.query('CREATE INDEX idx_reps_exercise ON rep_events (exercise_id)');
  }

  // ============================================
  // VIDEO ASSETS
  // ============================================
  if (!(await tableExists('video_assets'))) {
    log.info('Creating video_assets table...');
    await db.query(`
      CREATE TABLE video_assets (
        id TEXT PRIMARY KEY DEFAULT 'vid_' || replace(uuid_generate_v4()::text, '-', ''),
        uploader_id TEXT REFERENCES users(id) ON DELETE SET NULL,
        storage_key VARCHAR(500) NOT NULL,
        original_filename VARCHAR(255),
        file_size_bytes BIGINT,
        duration_ms INTEGER,
        width SMALLINT,
        height SMALLINT,
        status SMALLINT DEFAULT 0,
        content_hash BYTEA,
        renditions JSONB DEFAULT '{}',
        processing_locked_at TIMESTAMPTZ,
        processing_worker VARCHAR(100),
        error_message TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    await db.query('CREATE INDEX idx_videos_hash ON video_assets (content_hash) WHERE content_hash IS NOT NULL');
    await db.query('CREATE INDEX idx_videos_pending ON video_assets (created_at) WHERE status = 0');
    await db.query('CREATE INDEX idx_videos_uploader ON video_assets (uploader_id) WHERE uploader_id IS NOT NULL');
  }

  // ============================================
  // EXERCISE DEMOS
  // ============================================
  if (!(await tableExists('exercise_demos'))) {
    log.info('Creating exercise_demos table...');
    await db.query(`
      CREATE TABLE exercise_demos (
        id TEXT PRIMARY KEY DEFAULT 'demo_' || replace(uuid_generate_v4()::text, '-', ''),
        exercise_id TEXT NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,
        variant SMALLINT DEFAULT 0,
        video_asset_id TEXT NOT NULL REFERENCES video_assets(id) ON DELETE CASCADE,
        is_primary BOOLEAN DEFAULT FALSE,
        display_order SMALLINT DEFAULT 0,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE (exercise_id, variant, video_asset_id)
      )
    `);

    await db.query('CREATE UNIQUE INDEX idx_demos_primary ON exercise_demos (exercise_id, variant) WHERE is_primary = TRUE');
    await db.query('CREATE INDEX idx_demos_exercise ON exercise_demos (exercise_id)');
  }

  // ============================================
  // USER VIDEO CLIPS
  // ============================================
  if (!(await tableExists('user_video_clips'))) {
    log.info('Creating user_video_clips table...');
    await db.query(`
      CREATE TABLE user_video_clips (
        id TEXT PRIMARY KEY DEFAULT 'clip_' || replace(uuid_generate_v4()::text, '-', ''),
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        video_asset_id TEXT NOT NULL REFERENCES video_assets(id) ON DELETE CASCADE,
        exercise_id TEXT REFERENCES exercises(id),
        hangout_id BIGINT REFERENCES hangouts(id) ON DELETE SET NULL,
        title VARCHAR(200),
        description TEXT,
        tags JSONB DEFAULT '[]',
        moderation_status SMALLINT DEFAULT 0,
        view_count INTEGER DEFAULT 0,
        like_count INTEGER DEFAULT 0,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    await db.query('CREATE INDEX idx_clips_user ON user_video_clips (user_id, created_at DESC)');
    await db.query('CREATE INDEX idx_clips_moderation ON user_video_clips (moderation_status, created_at) WHERE moderation_status = 0');
    await db.query('CREATE INDEX idx_clips_exercise ON user_video_clips (exercise_id) WHERE exercise_id IS NOT NULL');
    await db.query('CREATE INDEX idx_clips_hangout ON user_video_clips (hangout_id) WHERE hangout_id IS NOT NULL');
  }

  // ============================================
  // CONTENT TRANSLATIONS (i18n)
  // ============================================
  if (!(await tableExists('content_translations'))) {
    log.info('Creating content_translations table...');
    await db.query(`
      CREATE TABLE content_translations (
        id TEXT PRIMARY KEY DEFAULT 'tr_' || replace(uuid_generate_v4()::text, '-', ''),
        content_type VARCHAR(50) NOT NULL,
        content_id TEXT NOT NULL,
        field_name VARCHAR(50) NOT NULL,
        source_lang CHAR(7) NOT NULL,
        target_lang CHAR(7) NOT NULL,
        original_text TEXT NOT NULL,
        translated_text TEXT NOT NULL,
        translation_provider VARCHAR(50),
        is_machine_translated BOOLEAN DEFAULT TRUE,
        is_human_corrected BOOLEAN DEFAULT FALSE,
        confidence_score REAL,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE (content_type, content_id, field_name, target_lang)
      )
    `);

    await db.query('CREATE INDEX idx_translations_lookup ON content_translations (content_type, content_id, target_lang)');
    await db.query('CREATE INDEX idx_translations_lang ON content_translations (target_lang)');
  }

  // ============================================
  // SUPPORTED LANGUAGES
  // ============================================
  if (!(await tableExists('supported_languages'))) {
    log.info('Creating supported_languages table...');
    await db.query(`
      CREATE TABLE supported_languages (
        code CHAR(7) PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        native_name VARCHAR(100) NOT NULL,
        rtl BOOLEAN DEFAULT FALSE,
        enabled BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    // Seed supported languages (26 languages as specified)
    const languages = [
      ['en', 'English', 'English', false],
      ['es', 'Spanish', 'Espa\u00f1ol', false],
      ['fr', 'French', 'Fran\u00e7ais', false],
      ['de', 'German', 'Deutsch', false],
      ['it', 'Italian', 'Italiano', false],
      ['pt-BR', 'Portuguese (Brazil)', 'Portugu\u00eas (Brasil)', false],
      ['nl', 'Dutch', 'Nederlands', false],
      ['sv', 'Swedish', 'Svenska', false],
      ['da', 'Danish', 'Dansk', false],
      ['fi', 'Finnish', 'Suomi', false],
      ['pl', 'Polish', 'Polski', false],
      ['cs', 'Czech', '\u010ce\u0161tina', false],
      ['ro', 'Romanian', 'Rom\u00e2n\u0103', false],
      ['hu', 'Hungarian', 'Magyar', false],
      ['tr', 'Turkish', 'T\u00fcrk\u00e7e', false],
      ['el', 'Greek', '\u0395\u03bb\u03bb\u03b7\u03bd\u03b9\u03ba\u03ac', false],
      ['ru', 'Russian', '\u0420\u0443\u0441\u0441\u043a\u0438\u0439', false],
      ['uk', 'Ukrainian', '\u0423\u043a\u0440\u0430\u0457\u043d\u0441\u044c\u043a\u0430', false],
      ['he', 'Hebrew', '\u05e2\u05d1\u05e8\u05d9\u05ea', true],
      ['ar', 'Arabic', '\u0627\u0644\u0639\u0631\u0628\u064a\u0629', true],
      ['hi', 'Hindi', '\u0939\u093f\u0928\u094d\u0926\u0940', false],
      ['th', 'Thai', '\u0e44\u0e17\u0e22', false],
      ['vi', 'Vietnamese', 'Ti\u1ebfng Vi\u1ec7t', false],
      ['ja', 'Japanese', '\u65e5\u672c\u8a9e', false],
      ['ko', 'Korean', '\ud55c\uad6d\uc5b4', false],
      ['zh-Hans', 'Chinese (Simplified)', '\u7b80\u4f53\u4e2d\u6587', false],
    ];

    for (const [code, name, nativeName, rtl] of languages) {
      await db.query(
        'INSERT INTO supported_languages (code, name, native_name, rtl) VALUES ($1, $2, $3, $4) ON CONFLICT (code) DO NOTHING',
        [code, name, nativeName, rtl]
      );
    }
    log.info('Supported languages seeded');
  }

  // ============================================
  // USER LANGUAGE PREFERENCES
  // ============================================
  if (!(await columnExists('users', 'preferred_language'))) {
    log.info('Adding preferred_language column to users...');
    await db.query("ALTER TABLE users ADD COLUMN preferred_language CHAR(7) DEFAULT 'en'");
  }

  // ============================================
  // IMPORTED ACTIVITIES (Apple Watch, etc.)
  // ============================================
  if (!(await tableExists('imported_activities'))) {
    log.info('Creating imported_activities table...');
    await db.query(`
      CREATE TABLE imported_activities (
        id TEXT PRIMARY KEY DEFAULT 'imp_' || replace(uuid_generate_v4()::text, '-', ''),
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        source VARCHAR(50) NOT NULL,
        source_id VARCHAR(200),
        activity_type VARCHAR(50) NOT NULL,
        started_at TIMESTAMPTZ NOT NULL,
        ended_at TIMESTAMPTZ,
        duration_seconds INTEGER,
        distance_meters NUMERIC(10,2),
        calories_burned INTEGER,
        heart_rate_avg SMALLINT,
        heart_rate_max SMALLINT,
        steps_count INTEGER,
        elevation_gain_meters NUMERIC(8,2),
        raw_data JSONB,
        processed BOOLEAN DEFAULT FALSE,
        session_id TEXT REFERENCES workout_sessions(id) ON DELETE SET NULL,
        error_message TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    await db.query('CREATE UNIQUE INDEX idx_imported_source ON imported_activities (source, source_id) WHERE source_id IS NOT NULL');
    await db.query('CREATE INDEX idx_imported_user ON imported_activities (user_id, started_at DESC)');
    await db.query('CREATE INDEX idx_imported_unprocessed ON imported_activities (created_at) WHERE processed = FALSE');
  }

  // ============================================
  // MODERATION QUEUE
  // ============================================
  if (!(await tableExists('moderation_queue'))) {
    log.info('Creating moderation_queue table...');
    await db.query(`
      CREATE TABLE moderation_queue (
        id TEXT PRIMARY KEY DEFAULT 'mod_' || replace(uuid_generate_v4()::text, '-', ''),
        content_type VARCHAR(50) NOT NULL,
        content_id TEXT NOT NULL,
        reason VARCHAR(100) NOT NULL,
        severity SMALLINT DEFAULT 1,
        status SMALLINT DEFAULT 0,
        reporter_id TEXT REFERENCES users(id) ON DELETE SET NULL,
        assignee_id TEXT REFERENCES users(id) ON DELETE SET NULL,
        notes TEXT,
        auto_flagged BOOLEAN DEFAULT FALSE,
        ai_confidence REAL,
        action_taken VARCHAR(50),
        reviewed_at TIMESTAMPTZ,
        reviewed_by TEXT REFERENCES users(id) ON DELETE SET NULL,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    await db.query('CREATE INDEX idx_modqueue_pending ON moderation_queue (severity DESC, created_at) WHERE status = 0');
    await db.query('CREATE INDEX idx_modqueue_assignee ON moderation_queue (assignee_id) WHERE status = 0 AND assignee_id IS NOT NULL');
    await db.query('CREATE INDEX idx_modqueue_content ON moderation_queue (content_type, content_id)');
  }

  // ============================================
  // USER LOCATION SETTINGS
  // ============================================
  if (!(await tableExists('user_location_settings'))) {
    log.info('Creating user_location_settings table...');

    const hasPostGIS = await extensionExists('postgis');

    if (hasPostGIS) {
      await db.query(`
        CREATE TABLE user_location_settings (
          user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
          sharing_level SMALLINT DEFAULT 1,
          home_location GEOGRAPHY(POINT, 4326),
          home_geohash VARCHAR(12),
          city VARCHAR(100),
          country_code CHAR(2),
          timezone VARCHAR(50),
          updated_at TIMESTAMPTZ DEFAULT NOW()
        )
      `);
    } else {
      await db.query(`
        CREATE TABLE user_location_settings (
          user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
          sharing_level SMALLINT DEFAULT 1,
          home_latitude DOUBLE PRECISION,
          home_longitude DOUBLE PRECISION,
          home_geohash VARCHAR(12),
          city VARCHAR(100),
          country_code CHAR(2),
          timezone VARCHAR(50),
          updated_at TIMESTAMPTZ DEFAULT NOW()
        )
      `);
    }

    await db.query('CREATE INDEX idx_user_location_country ON user_location_settings (country_code) WHERE country_code IS NOT NULL');
    await db.query('CREATE INDEX idx_user_location_city ON user_location_settings (city) WHERE city IS NOT NULL');
  }

  // ============================================
  // FEATURE FLAGS
  // ============================================
  if (!(await tableExists('feature_flags'))) {
    log.info('Creating feature_flags table...');
    await db.query(`
      CREATE TABLE feature_flags (
        id VARCHAR(100) PRIMARY KEY,
        name VARCHAR(200) NOT NULL,
        description TEXT,
        enabled BOOLEAN DEFAULT FALSE,
        rollout_percentage SMALLINT DEFAULT 0 CHECK (rollout_percentage BETWEEN 0 AND 100),
        user_allowlist TEXT[] DEFAULT '{}',
        user_blocklist TEXT[] DEFAULT '{}',
        conditions JSONB DEFAULT '{}',
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    // Seed XR mode feature flag
    await db.query(`
      INSERT INTO feature_flags (id, name, description, enabled, rollout_percentage)
      VALUES ('xr_mode', 'XR/VR Mode', 'WebXR-based VR mode for immersive hangout and exercise browsing', FALSE, 0)
      ON CONFLICT (id) DO NOTHING
    `);
  }

  // ============================================
  // NEW CREDIT ACTIONS
  // ============================================
  log.info('Adding new credit actions...');
  const newActions = [
    { id: 'dm.send', name: 'Send Direct Message', cost: 1 },
    { id: 'ai.query', name: 'AI Query', cost: 1 },
    { id: 'post.create', name: 'Create Post', cost: 1 },
    { id: 'ad.post', name: 'Post Advertisement', cost: 1 },
    { id: 'rep.completed', name: 'Rep Completed (Award)', cost: -1 },
  ];

  for (const action of newActions) {
    await db.query(
      `INSERT INTO credit_actions (id, name, default_cost)
       VALUES ($1, $2, $3)
       ON CONFLICT (id) DO NOTHING`,
      [action.id, action.name, action.cost]
    );
  }

  // ============================================
  // UPDATE TRIGGERS
  // ============================================
  log.info('Setting up updated_at triggers...');

  const tablesWithTimestamps = [
    'hangouts',
    'hangout_posts',
    'video_assets',
    'user_video_clips',
    'content_translations',
    'feature_flags',
  ];

  for (const table of tablesWithTimestamps) {
    if (await tableExists(table)) {
      try {
        await db.query(`DROP TRIGGER IF EXISTS update_${table}_updated_at ON ${table}`);
        await db.query(`
          CREATE TRIGGER update_${table}_updated_at
          BEFORE UPDATE ON ${table}
          FOR EACH ROW EXECUTE FUNCTION update_updated_at()
        `);
      } catch (e) {
        log.debug(`Could not create trigger for ${table}`, { error: e });
      }
    }
  }

  // ============================================
  // ANALYZE TABLES
  // ============================================
  log.info('Analyzing new tables...');
  const newTables = [
    'hangout_types',
    'hangouts',
    'hangout_memberships',
    'hangout_posts',
    'workout_sessions',
    'rep_events',
    'video_assets',
    'exercise_demos',
    'user_video_clips',
    'content_translations',
    'supported_languages',
    'imported_activities',
    'moderation_queue',
    'user_location_settings',
    'feature_flags',
  ];

  for (const table of newTables) {
    if (await tableExists(table)) {
      try {
        await db.query(`ANALYZE ${table}`);
      } catch (e) {
        log.debug(`Could not analyze ${table}`);
      }
    }
  }

  log.info('Migration 007_feature_expansion complete');
}

// Alias for compatibility
export const up = migrate;
