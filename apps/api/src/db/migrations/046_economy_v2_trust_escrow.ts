// DESTRUCTIVE: Schema modification for economy v2 trust escrow - contains DROP/TRUNCATE operations
// SQL-SAFE: Template literals contain static SQL only, no external input
/**
 * Migration: Economy V2 - Trust Tiers, Transfer Controls, and Escrow
 *
 * Adds:
 * 1. Transfer opt-in settings and limits per user
 * 2. Trust tier system based on account age and activity
 * 3. Escrow holds for class bookings
 * 4. Dispute mechanism for classes
 * 5. Configurable economy settings table
 */

import { db } from '../client';
import { loggers } from '../../lib/logger';

const log = loggers.db;

async function tableExists(tableName: string): Promise<boolean> {
  const result = await db.queryOne<{ count: string }>(
    `SELECT COUNT(*) as count FROM information_schema.tables
     WHERE table_schema = 'public' AND table_name = $1`,
    [tableName]
  );
  return parseInt(result?.count || '0') > 0;
}

async function columnExists(tableName: string, columnName: string): Promise<boolean> {
  const result = await db.queryOne<{ count: string }>(
    `SELECT COUNT(*) as count FROM information_schema.columns
     WHERE table_name = $1 AND column_name = $2`,
    [tableName, columnName]
  );
  return parseInt(result?.count || '0') > 0;
}

export async function up(): Promise<void> {
  log.info('Running migration: 046_economy_v2_trust_escrow');

  // ============================================
  // ECONOMY SETTINGS (Configurable parameters)
  // ============================================
  if (!(await tableExists('economy_settings'))) {
    log.info('Creating economy_settings table...');
    await db.query(`
      CREATE TABLE economy_settings (
        key TEXT PRIMARY KEY,
        value JSONB NOT NULL,
        description TEXT,
        updated_by TEXT REFERENCES users(id),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    // Seed default settings
    const settings = [
      { key: 'transfer_fee_percent', value: 2, description: 'Transfer fee percentage (burned)' },
      { key: 'transfer_fee_min', value: 1, description: 'Minimum transfer fee in credits' },
      { key: 'transfer_fee_max', value: 100, description: 'Maximum transfer fee in credits' },
      { key: 'daily_issuance_cap', value: 500, description: 'Max credits a user can earn per day' },
      { key: 'transfer_cooldown_seconds', value: 60, description: 'Cooldown between transfers' },
      { key: 'new_account_lockout_days', value: 7, description: 'Days before new accounts can transfer' },
      { key: 'escrow_hold_hours', value: 48, description: 'Hours to hold escrow after class' },
      { key: 'dispute_window_hours', value: 48, description: 'Hours to file a dispute after class' },
    ];

    for (const s of settings) {
      await db.query(
        `INSERT INTO economy_settings (key, value, description)
         VALUES ($1, $2, $3)
         ON CONFLICT (key) DO NOTHING`,
        [s.key, JSON.stringify(s.value), s.description]
      );
    }
  }

  // ============================================
  // USER TRANSFER SETTINGS
  // ============================================
  if (!(await tableExists('user_transfer_settings'))) {
    log.info('Creating user_transfer_settings table...');
    await db.query(`
      CREATE TABLE user_transfer_settings (
        user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
        transfers_enabled BOOLEAN DEFAULT FALSE,
        receive_enabled BOOLEAN DEFAULT TRUE,
        daily_send_limit INTEGER DEFAULT 1000,
        daily_receive_limit INTEGER DEFAULT 5000,
        single_transfer_limit INTEGER DEFAULT 500,
        require_confirmation_above INTEGER DEFAULT 100,
        blocked_users JSONB DEFAULT '[]',
        trusted_users JSONB DEFAULT '[]',
        last_transfer_at TIMESTAMPTZ,
        total_sent_lifetime INTEGER DEFAULT 0,
        total_received_lifetime INTEGER DEFAULT 0,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
  }

  // ============================================
  // TRUST TIERS
  // ============================================
  if (!(await tableExists('trust_tiers'))) {
    log.info('Creating trust_tiers table...');
    await db.query(`
      CREATE TABLE trust_tiers (
        tier INTEGER PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        min_account_age_days INTEGER NOT NULL DEFAULT 0,
        min_workouts INTEGER NOT NULL DEFAULT 0,
        min_credits_earned INTEGER NOT NULL DEFAULT 0,
        requires_email_verified BOOLEAN DEFAULT FALSE,
        requires_phone_verified BOOLEAN DEFAULT FALSE,
        daily_transfer_limit INTEGER NOT NULL DEFAULT 100,
        single_transfer_limit INTEGER NOT NULL DEFAULT 50,
        can_receive_transfers BOOLEAN DEFAULT TRUE,
        can_send_transfers BOOLEAN DEFAULT FALSE,
        can_create_classes BOOLEAN DEFAULT FALSE,
        can_host_hangouts BOOLEAN DEFAULT FALSE
      )
    `);

    // Seed trust tiers
    const tiers = [
      { tier: 0, name: 'New', desc: 'New accounts', age: 0, workouts: 0, earned: 0, emailReq: false, dailyLimit: 0, singleLimit: 0, canSend: false, canReceive: true, canClass: false, canHost: false },
      { tier: 1, name: 'Basic', desc: 'Verified email', age: 7, workouts: 3, earned: 100, emailReq: true, dailyLimit: 100, singleLimit: 50, canSend: true, canReceive: true, canClass: false, canHost: false },
      { tier: 2, name: 'Regular', desc: 'Active user', age: 30, workouts: 20, earned: 500, emailReq: true, dailyLimit: 500, singleLimit: 200, canSend: true, canReceive: true, canClass: true, canHost: true },
      { tier: 3, name: 'Trusted', desc: 'Established user', age: 90, workouts: 100, earned: 2000, emailReq: true, dailyLimit: 2000, singleLimit: 1000, canSend: true, canReceive: true, canClass: true, canHost: true },
      { tier: 4, name: 'Veteran', desc: 'Long-term active', age: 180, workouts: 300, earned: 10000, emailReq: true, dailyLimit: 10000, singleLimit: 5000, canSend: true, canReceive: true, canClass: true, canHost: true },
      { tier: 5, name: 'Elite', desc: 'Top contributor', age: 365, workouts: 500, earned: 50000, emailReq: true, dailyLimit: 50000, singleLimit: 25000, canSend: true, canReceive: true, canClass: true, canHost: true },
    ];

    for (const t of tiers) {
      await db.query(
        `INSERT INTO trust_tiers (tier, name, description, min_account_age_days, min_workouts, min_credits_earned,
          requires_email_verified, daily_transfer_limit, single_transfer_limit, can_send_transfers, can_receive_transfers,
          can_create_classes, can_host_hangouts)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
         ON CONFLICT (tier) DO NOTHING`,
        [t.tier, t.name, t.desc, t.age, t.workouts, t.earned, t.emailReq, t.dailyLimit, t.singleLimit, t.canSend, t.canReceive, t.canClass, t.canHost]
      );
    }
  }

  // ============================================
  // USER TRUST TIER CACHE
  // ============================================
  if (!(await tableExists('user_trust_tiers'))) {
    log.info('Creating user_trust_tiers table...');
    await db.query(`
      CREATE TABLE user_trust_tiers (
        user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
        current_tier INTEGER NOT NULL DEFAULT 0 REFERENCES trust_tiers(tier),
        account_age_days INTEGER DEFAULT 0,
        workout_count INTEGER DEFAULT 0,
        credits_earned INTEGER DEFAULT 0,
        email_verified BOOLEAN DEFAULT FALSE,
        phone_verified BOOLEAN DEFAULT FALSE,
        manual_override_tier INTEGER,
        override_reason TEXT,
        override_by TEXT REFERENCES users(id),
        override_at TIMESTAMPTZ,
        calculated_at TIMESTAMPTZ DEFAULT NOW(),
        next_tier_progress JSONB DEFAULT '{}'
      )
    `);

    await db.query('CREATE INDEX idx_user_trust_tier ON user_trust_tiers(current_tier)');
  }

  // ============================================
  // ESCROW HOLDS
  // ============================================
  if (!(await tableExists('escrow_holds'))) {
    log.info('Creating escrow_holds table...');
    await db.query(`
      CREATE TABLE escrow_holds (
        id TEXT PRIMARY KEY DEFAULT 'escrow_' || replace(gen_random_uuid()::text, '-', ''),
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        amount INTEGER NOT NULL CHECK (amount > 0),
        hold_type TEXT NOT NULL CHECK (hold_type IN ('class_booking', 'challenge_stake', 'marketplace', 'other')),
        reference_type TEXT NOT NULL,
        reference_id TEXT NOT NULL,
        status TEXT DEFAULT 'held' CHECK (status IN ('held', 'released', 'refunded', 'disputed', 'forfeited')),
        release_to TEXT REFERENCES users(id),
        release_amount INTEGER,
        fee_amount INTEGER DEFAULT 0,
        ledger_entry_id TEXT,
        release_ledger_id TEXT,
        hold_until TIMESTAMPTZ,
        auto_release BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        released_at TIMESTAMPTZ,
        released_by TEXT REFERENCES users(id),
        release_reason TEXT
      )
    `);

    await db.query('CREATE INDEX idx_escrow_user ON escrow_holds(user_id, status)');
    await db.query('CREATE INDEX idx_escrow_reference ON escrow_holds(reference_type, reference_id)');
    await db.query('CREATE INDEX idx_escrow_release ON escrow_holds(status, hold_until) WHERE status = \'held\' AND auto_release = TRUE');
  }

  // ============================================
  // DISPUTES
  // ============================================
  if (!(await tableExists('economy_disputes'))) {
    log.info('Creating economy_disputes table...');
    await db.query(`
      CREATE TABLE economy_disputes (
        id TEXT PRIMARY KEY DEFAULT 'dispute_' || replace(gen_random_uuid()::text, '-', ''),
        reporter_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        respondent_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        dispute_type TEXT NOT NULL CHECK (dispute_type IN ('class_noshow', 'class_quality', 'transfer_fraud', 'refund_request', 'other')),
        reference_type TEXT NOT NULL,
        reference_id TEXT NOT NULL,
        amount_disputed INTEGER,
        escrow_id TEXT REFERENCES escrow_holds(id),
        description TEXT NOT NULL,
        evidence JSONB DEFAULT '[]',
        status TEXT DEFAULT 'open' CHECK (status IN ('open', 'investigating', 'pending_response', 'resolved_reporter', 'resolved_respondent', 'resolved_split', 'dismissed', 'escalated')),
        resolution TEXT,
        resolution_amount INTEGER,
        resolved_by TEXT REFERENCES users(id),
        resolved_at TIMESTAMPTZ,
        deadline TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    await db.query('CREATE INDEX idx_disputes_reporter ON economy_disputes(reporter_id, status)');
    await db.query('CREATE INDEX idx_disputes_respondent ON economy_disputes(respondent_id, status)');
    await db.query('CREATE INDEX idx_disputes_status ON economy_disputes(status, deadline)');
  }

  // ============================================
  // DISPUTE MESSAGES
  // ============================================
  if (!(await tableExists('dispute_messages'))) {
    log.info('Creating dispute_messages table...');
    await db.query(`
      CREATE TABLE dispute_messages (
        id TEXT PRIMARY KEY DEFAULT 'dmsg_' || replace(gen_random_uuid()::text, '-', ''),
        dispute_id TEXT NOT NULL REFERENCES economy_disputes(id) ON DELETE CASCADE,
        sender_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        is_admin BOOLEAN DEFAULT FALSE,
        message TEXT NOT NULL,
        attachments JSONB DEFAULT '[]',
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    await db.query('CREATE INDEX idx_dispute_messages ON dispute_messages(dispute_id, created_at)');
  }

  // ============================================
  // UPDATE CREDIT_TRANSFERS FOR FEES
  // ============================================
  if (await tableExists('credit_transfers')) {
    if (!(await columnExists('credit_transfers', 'fee_amount'))) {
      log.info('Adding fee columns to credit_transfers...');
      await db.query('ALTER TABLE credit_transfers ADD COLUMN fee_amount INTEGER DEFAULT 0');
      await db.query('ALTER TABLE credit_transfers ADD COLUMN fee_burned BOOLEAN DEFAULT TRUE');
      await db.query('ALTER TABLE credit_transfers ADD COLUMN sender_trust_tier INTEGER');
      await db.query('ALTER TABLE credit_transfers ADD COLUMN recipient_trust_tier INTEGER');
    }
  }

  // ============================================
  // UPDATE CLASS_ENROLLMENTS FOR ESCROW
  // ============================================
  if (await tableExists('class_enrollments')) {
    if (!(await columnExists('class_enrollments', 'escrow_id'))) {
      log.info('Adding escrow columns to class_enrollments...');
      await db.query('ALTER TABLE class_enrollments ADD COLUMN escrow_id TEXT REFERENCES escrow_holds(id)');
      await db.query('ALTER TABLE class_enrollments ADD COLUMN dispute_id TEXT REFERENCES economy_disputes(id)');
    }
  }

  // ============================================
  // ANALYZE NEW TABLES
  // ============================================
  log.info('Analyzing new tables...');
  const newTables = [
    'economy_settings',
    'user_transfer_settings',
    'trust_tiers',
    'user_trust_tiers',
    'escrow_holds',
    'economy_disputes',
    'dispute_messages',
  ];

  for (const table of newTables) {
    if (await tableExists(table)) {
      try {
        await db.query(`ANALYZE ${table}`);
      } catch (_e) {
        log.debug(`Could not analyze ${table}`);
      }
    }
  }

  log.info('Migration 046_economy_v2_trust_escrow complete');
}

export async function down(): Promise<void> {
  log.info('Rolling back migration: 046_economy_v2_trust_escrow');

  // Remove columns from existing tables first
  if (await columnExists('class_enrollments', 'escrow_id')) {
    await db.query('ALTER TABLE class_enrollments DROP COLUMN escrow_id');
    await db.query('ALTER TABLE class_enrollments DROP COLUMN dispute_id');
  }

  if (await columnExists('credit_transfers', 'fee_amount')) {
    await db.query('ALTER TABLE credit_transfers DROP COLUMN fee_amount');
    await db.query('ALTER TABLE credit_transfers DROP COLUMN fee_burned');
    await db.query('ALTER TABLE credit_transfers DROP COLUMN sender_trust_tier');
    await db.query('ALTER TABLE credit_transfers DROP COLUMN recipient_trust_tier');
  }

  // Drop tables in reverse order
  const tables = [
    'dispute_messages',
    'economy_disputes',
    'escrow_holds',
    'user_trust_tiers',
    'trust_tiers',
    'user_transfer_settings',
    'economy_settings',
  ];

  for (const table of tables) {
    await db.query(`DROP TABLE IF EXISTS ${table} CASCADE`);
  }

  log.info('Rollback 046_economy_v2_trust_escrow complete');
}

export const migrate = up;
