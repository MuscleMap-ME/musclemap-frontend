/**
 * Database Schema (PostgreSQL)
 */

import { db } from './client';
import { loggers } from '../lib/logger';

const log = loggers.db;

export async function initializeSchema(): Promise<void> {
  log.info('Initializing database schema...');

  await db.query(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      username TEXT UNIQUE NOT NULL,
      display_name TEXT,
      password_hash TEXT NOT NULL,
      avatar_url TEXT,
      roles JSONB DEFAULT '["user"]',
      flags JSONB DEFAULT '{"verified":false,"banned":false,"suspended":false,"emailConfirmed":false}',
      current_archetype_id TEXT,
      current_level INTEGER DEFAULT 1,
      trial_started_at TIMESTAMP,
      trial_ends_at TIMESTAMP,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    )
  `);

  await db.query(`CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)`);
  await db.query(`CREATE INDEX IF NOT EXISTS idx_users_username ON users(username)`);

  await db.query(`
    CREATE TABLE IF NOT EXISTS groups (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      avatar_url TEXT,
      owner_id TEXT NOT NULL,
      settings JSONB DEFAULT '{}',
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    )
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS group_memberships (
      group_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'member',
      joined_at TIMESTAMP DEFAULT NOW(),
      PRIMARY KEY (group_id, user_id)
    )
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS credit_balances (
      user_id TEXT PRIMARY KEY,
      balance INTEGER NOT NULL DEFAULT 0,
      lifetime_earned INTEGER NOT NULL DEFAULT 0,
      lifetime_spent INTEGER NOT NULL DEFAULT 0,
      version INTEGER NOT NULL DEFAULT 0,
      updated_at TIMESTAMP DEFAULT NOW()
    )
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS credit_ledger (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      action TEXT NOT NULL,
      amount INTEGER NOT NULL,
      balance_after INTEGER NOT NULL,
      metadata JSONB,
      idempotency_key TEXT UNIQUE,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `);

  await db.query(`CREATE INDEX IF NOT EXISTS idx_credit_ledger_user ON credit_ledger(user_id)`);
  await db.query(`CREATE INDEX IF NOT EXISTS idx_credit_ledger_idempotency ON credit_ledger(idempotency_key)`);

  await db.query(`
    CREATE TABLE IF NOT EXISTS credit_actions (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      default_cost INTEGER NOT NULL,
      plugin_id TEXT,
      enabled BOOLEAN DEFAULT TRUE,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS purchases (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      tier_id TEXT NOT NULL,
      credits INTEGER NOT NULL,
      amount_cents INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      stripe_payment_id TEXT,
      stripe_session_id TEXT,
      metadata JSONB,
      created_at TIMESTAMP DEFAULT NOW(),
      completed_at TIMESTAMP
    )
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS subscriptions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      stripe_customer_id TEXT,
      stripe_subscription_id TEXT UNIQUE,
      status TEXT NOT NULL DEFAULT 'inactive',
      current_period_start TIMESTAMP,
      current_period_end TIMESTAMP,
      cancel_at_period_end BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    )
  `);

  await db.query(`CREATE INDEX IF NOT EXISTS idx_subscriptions_user ON subscriptions(user_id)`);
  await db.query(`CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe ON subscriptions(stripe_subscription_id)`);

  await db.query(`
    CREATE TABLE IF NOT EXISTS muscles (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      anatomical_name TEXT,
      muscle_group TEXT NOT NULL,
      bias_weight NUMERIC NOT NULL,
      optimal_weekly_volume INTEGER,
      recovery_time INTEGER
    )
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS exercises (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      difficulty INTEGER DEFAULT 2,
      description TEXT,
      cues TEXT,
      primary_muscles TEXT,
      equipment_required JSONB DEFAULT '[]',
      equipment_optional JSONB DEFAULT '[]',
      locations JSONB DEFAULT '["gym"]',
      is_compound BOOLEAN DEFAULT FALSE,
      estimated_seconds INTEGER DEFAULT 45,
      rest_seconds INTEGER DEFAULT 60,
      movement_pattern TEXT
    )
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS prescriptions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      constraints JSONB NOT NULL,
      exercises JSONB NOT NULL,
      warmup JSONB,
      cooldown JSONB,
      substitutions JSONB,
      muscle_coverage JSONB NOT NULL,
      estimated_duration INTEGER NOT NULL,
      actual_duration INTEGER NOT NULL,
      credit_cost INTEGER NOT NULL DEFAULT 1,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `);

  await db.query(`CREATE INDEX IF NOT EXISTS idx_prescriptions_user ON prescriptions(user_id)`);

  await db.query(`
    CREATE TABLE IF NOT EXISTS exercise_activations (
      exercise_id TEXT NOT NULL,
      muscle_id TEXT NOT NULL,
      activation INTEGER NOT NULL,
      PRIMARY KEY (exercise_id, muscle_id)
    )
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS archetypes (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      philosophy TEXT,
      description TEXT,
      focus_areas JSONB,
      icon_url TEXT
    )
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS archetype_levels (
      id SERIAL PRIMARY KEY,
      archetype_id TEXT NOT NULL,
      level INTEGER NOT NULL,
      name TEXT NOT NULL,
      total_tu INTEGER NOT NULL,
      description TEXT,
      muscle_targets JSONB,
      UNIQUE(archetype_id, level)
    )
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS workouts (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      date TEXT NOT NULL,
      total_tu NUMERIC NOT NULL,
      credits_used INTEGER NOT NULL DEFAULT 25,
      notes TEXT,
      is_public BOOLEAN DEFAULT TRUE,
      exercise_data JSONB,
      muscle_activations JSONB,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `);

  await db.query(`CREATE INDEX IF NOT EXISTS idx_workouts_user ON workouts(user_id)`);

  await db.query(`
    CREATE TABLE IF NOT EXISTS competitions (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      creator_id TEXT NOT NULL,
      type TEXT NOT NULL DEFAULT 'total_tu',
      status TEXT NOT NULL DEFAULT 'draft',
      start_date TEXT NOT NULL,
      end_date TEXT NOT NULL,
      max_participants INTEGER,
      entry_fee INTEGER,
      prize_pool INTEGER,
      rules JSONB,
      is_public BOOLEAN DEFAULT TRUE,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS competition_participants (
      competition_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      score NUMERIC NOT NULL DEFAULT 0,
      rank INTEGER,
      joined_at TIMESTAMP DEFAULT NOW(),
      PRIMARY KEY (competition_id, user_id)
    )
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS installed_plugins (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      version TEXT NOT NULL,
      display_name TEXT,
      description TEXT,
      enabled BOOLEAN DEFAULT TRUE,
      config JSONB,
      installed_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    )
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS refresh_tokens (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      token_hash TEXT NOT NULL,
      expires_at TIMESTAMP NOT NULL,
      created_at TIMESTAMP DEFAULT NOW(),
      revoked_at TIMESTAMP
    )
  `);

  log.info('Database schema initialized');
}

export async function seedCreditActions(): Promise<void> {
  const actions = [
    { id: 'workout.complete', name: 'Complete Workout', cost: 25 },
    { id: 'ai.generate', name: 'AI Generation', cost: 50 },
    { id: 'competition.create', name: 'Create Competition', cost: 100 },
    { id: 'prescription.generate', name: 'Generate Prescription', cost: 1 },
  ];

  for (const action of actions) {
    await db.query(
      `INSERT INTO credit_actions (id, name, default_cost)
       VALUES ($1, $2, $3)
       ON CONFLICT (id) DO NOTHING`,
      [action.id, action.name, action.cost]
    );
  }

  log.info('Credit actions seeded');
}
