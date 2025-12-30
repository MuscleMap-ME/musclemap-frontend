/**
 * Database Schema
 */

import { db } from './client';
import { loggers } from '../lib/logger';

const log = loggers.db;

export function initializeSchema(): void {
  log.info('Initializing database schema...');

  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      username TEXT UNIQUE NOT NULL,
      display_name TEXT,
      password_hash TEXT NOT NULL,
      avatar_url TEXT,
      roles TEXT DEFAULT '["user"]',
      flags TEXT DEFAULT '{"verified":false,"banned":false,"suspended":false,"emailConfirmed":false}',
      current_archetype_id TEXT,
      current_level INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
    CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);

    CREATE TABLE IF NOT EXISTS groups (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      avatar_url TEXT,
      owner_id TEXT NOT NULL,
      settings TEXT DEFAULT '{}',
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS group_memberships (
      group_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'member',
      joined_at TEXT DEFAULT (datetime('now')),
      PRIMARY KEY (group_id, user_id)
    );

    CREATE TABLE IF NOT EXISTS credit_balances (
      user_id TEXT PRIMARY KEY,
      balance INTEGER NOT NULL DEFAULT 0,
      lifetime_earned INTEGER NOT NULL DEFAULT 0,
      lifetime_spent INTEGER NOT NULL DEFAULT 0,
      version INTEGER NOT NULL DEFAULT 0,
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS credit_ledger (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      action TEXT NOT NULL,
      amount INTEGER NOT NULL,
      balance_after INTEGER NOT NULL,
      metadata TEXT,
      idempotency_key TEXT UNIQUE,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_credit_ledger_user ON credit_ledger(user_id);
    CREATE INDEX IF NOT EXISTS idx_credit_ledger_idempotency ON credit_ledger(idempotency_key);

    CREATE TABLE IF NOT EXISTS credit_actions (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      default_cost INTEGER NOT NULL,
      plugin_id TEXT,
      enabled INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS purchases (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      tier_id TEXT NOT NULL,
      credits INTEGER NOT NULL,
      amount_cents INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      stripe_payment_id TEXT,
      stripe_session_id TEXT,
      metadata TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      completed_at TEXT
    );

    CREATE TABLE IF NOT EXISTS muscles (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      anatomical_name TEXT,
      muscle_group TEXT NOT NULL,
      bias_weight REAL NOT NULL,
      optimal_weekly_volume INTEGER,
      recovery_time INTEGER
    );

    CREATE TABLE IF NOT EXISTS exercises (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      difficulty INTEGER DEFAULT 2,
      description TEXT,
      cues TEXT,
      primary_muscles TEXT
    );

    CREATE TABLE IF NOT EXISTS exercise_activations (
      exercise_id TEXT NOT NULL,
      muscle_id TEXT NOT NULL,
      activation INTEGER NOT NULL,
      PRIMARY KEY (exercise_id, muscle_id)
    );

    CREATE TABLE IF NOT EXISTS archetypes (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      philosophy TEXT,
      description TEXT,
      focus_areas TEXT,
      icon_url TEXT
    );

    CREATE TABLE IF NOT EXISTS archetype_levels (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      archetype_id TEXT NOT NULL,
      level INTEGER NOT NULL,
      name TEXT NOT NULL,
      total_tu INTEGER NOT NULL,
      description TEXT,
      muscle_targets TEXT,
      UNIQUE(archetype_id, level)
    );

    CREATE TABLE IF NOT EXISTS workouts (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      date TEXT NOT NULL,
      total_tu REAL NOT NULL,
      credits_used INTEGER NOT NULL DEFAULT 25,
      notes TEXT,
      is_public INTEGER DEFAULT 1,
      exercise_data TEXT,
      muscle_activations TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_workouts_user ON workouts(user_id);

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
      rules TEXT,
      is_public INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS competition_participants (
      competition_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      score REAL NOT NULL DEFAULT 0,
      rank INTEGER,
      joined_at TEXT DEFAULT (datetime('now')),
      PRIMARY KEY (competition_id, user_id)
    );

    CREATE TABLE IF NOT EXISTS installed_plugins (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      version TEXT NOT NULL,
      display_name TEXT,
      description TEXT,
      enabled INTEGER DEFAULT 1,
      config TEXT,
      installed_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS refresh_tokens (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      token_hash TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      revoked_at TEXT
    );
  `);

  log.info('Database schema initialized');
}

export function seedCreditActions(): void {
  const actions = [
    { id: 'workout.complete', name: 'Complete Workout', cost: 25 },
    { id: 'ai.generate', name: 'AI Generation', cost: 50 },
    { id: 'competition.create', name: 'Create Competition', cost: 100 },
  ];

  const stmt = db.prepare(`
    INSERT OR IGNORE INTO credit_actions (id, name, default_cost)
    VALUES (?, ?, ?)
  `);

  for (const action of actions) {
    stmt.run(action.id, action.name, action.cost);
  }

  log.info('Credit actions seeded');
}
