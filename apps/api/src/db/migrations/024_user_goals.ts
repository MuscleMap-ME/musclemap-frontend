/**
 * Migration: Goal-Based Training System
 *
 * This migration creates tables for:
 * 1. user_goals - User's fitness goals with targets
 * 2. goal_progress - Daily progress tracking towards goals
 * 3. goal_milestones - Achievement milestones within goals
 */

import { db } from '../client';
import { loggers } from '../../lib/logger';

const log = loggers.db;

async function tableExists(tableName: string): Promise<boolean> {
  const result = await db.queryOne<{ count: string }>(
    `SELECT COUNT(*) as count FROM information_schema.tables
     WHERE table_name = $1`,
    [tableName]
  );
  return parseInt(result?.count || '0') > 0;
}

export async function up(): Promise<void> {
  log.info('Running migration: 024_user_goals');

  // Create user_goals table
  if (!(await tableExists('user_goals'))) {
    log.info('Creating user_goals table...');
    await db.query(`
      CREATE TABLE user_goals (
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,

        -- Goal Type
        goal_type TEXT NOT NULL CHECK (goal_type IN (
          'weight_loss', 'weight_gain', 'muscle_gain', 'strength',
          'endurance', 'flexibility', 'general_fitness', 'body_recomposition',
          'athletic_performance', 'rehabilitation', 'maintenance'
        )),

        -- Target Metrics
        target_value NUMERIC(10, 2),
        target_unit TEXT CHECK (target_unit IN ('lbs', 'kg', 'percent', 'reps', 'minutes', 'days')),
        starting_value NUMERIC(10, 2),
        current_value NUMERIC(10, 2),

        -- Timeline
        target_date DATE,
        started_at TIMESTAMPTZ DEFAULT NOW(),
        completed_at TIMESTAMPTZ,

        -- Status
        status TEXT DEFAULT 'active' CHECK (status IN ('active', 'paused', 'completed', 'abandoned')),
        priority INTEGER DEFAULT 1 CHECK (priority BETWEEN 1 AND 5),
        is_primary BOOLEAN DEFAULT FALSE,

        -- Configuration
        weekly_target NUMERIC(10, 2),
        reminder_enabled BOOLEAN DEFAULT TRUE,
        reminder_frequency TEXT DEFAULT 'daily' CHECK (reminder_frequency IN ('daily', 'weekly', 'none')),

        -- Notes
        notes TEXT,

        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    await db.query(`CREATE INDEX idx_user_goals_user ON user_goals(user_id)`);
    await db.query(`CREATE INDEX idx_user_goals_active ON user_goals(user_id, status) WHERE status = 'active'`);
    await db.query(`CREATE INDEX idx_user_goals_primary ON user_goals(user_id, is_primary) WHERE is_primary = TRUE`);
  }

  // Create goal_progress table (daily tracking)
  if (!(await tableExists('goal_progress'))) {
    log.info('Creating goal_progress table...');
    await db.query(`
      CREATE TABLE goal_progress (
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
        goal_id TEXT NOT NULL REFERENCES user_goals(id) ON DELETE CASCADE,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,

        -- Progress Data
        date DATE NOT NULL,
        value NUMERIC(10, 2) NOT NULL,
        delta NUMERIC(10, 2),

        -- Context
        source TEXT DEFAULT 'manual' CHECK (source IN ('manual', 'workout', 'wearable', 'calculated')),
        notes TEXT,

        created_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(goal_id, date)
      )
    `);
    await db.query(`CREATE INDEX idx_goal_progress_goal ON goal_progress(goal_id, date DESC)`);
    await db.query(`CREATE INDEX idx_goal_progress_user ON goal_progress(user_id, date DESC)`);
  }

  // Create goal_milestones table
  if (!(await tableExists('goal_milestones'))) {
    log.info('Creating goal_milestones table...');
    await db.query(`
      CREATE TABLE goal_milestones (
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
        goal_id TEXT NOT NULL REFERENCES user_goals(id) ON DELETE CASCADE,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,

        -- Milestone Definition
        title TEXT NOT NULL,
        description TEXT,
        target_value NUMERIC(10, 2) NOT NULL,
        percentage INTEGER GENERATED ALWAYS AS (
          CASE WHEN target_value > 0 THEN
            LEAST(100, GREATEST(0, (target_value * 100)::INTEGER))
          ELSE 0 END
        ) STORED,

        -- Status
        achieved_at TIMESTAMPTZ,
        is_achieved BOOLEAN DEFAULT FALSE,

        -- Rewards
        xp_reward INTEGER DEFAULT 0,
        badge_id TEXT,

        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    await db.query(`CREATE INDEX idx_goal_milestones_goal ON goal_milestones(goal_id)`);
    await db.query(`CREATE INDEX idx_goal_milestones_achieved ON goal_milestones(goal_id, is_achieved)`);
  }

  log.info('Migration 024_user_goals complete');
}

export async function down(): Promise<void> {
  log.info('Rolling back migration: 024_user_goals');
  await db.query(`DROP TABLE IF EXISTS goal_milestones`);
  await db.query(`DROP TABLE IF EXISTS goal_progress`);
  await db.query(`DROP TABLE IF EXISTS user_goals`);
  log.info('Rollback 024_user_goals complete');
}

export const migrate = up;
