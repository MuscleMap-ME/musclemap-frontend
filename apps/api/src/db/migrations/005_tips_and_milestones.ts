/**
 * Migration: Add tips, milestones, and user tracking tables
 *
 * This migration adds the contextual tips, insights, and rewards system.
 */

import { db } from '../client';
import { loggers } from '../../lib/logger';
import { seedTips, seedMilestones } from '../seed-tips';

const log = loggers.db;

async function tableExists(tableName: string): Promise<boolean> {
  const result = await db.queryOne<{ count: string }>(
    `SELECT COUNT(*) as count FROM information_schema.tables
     WHERE table_name = $1`,
    [tableName]
  );
  return parseInt(result?.count || '0') > 0;
}

export async function migrate(): Promise<void> {
  log.info('Running migration: 005_tips_and_milestones');

  // Check if tips table already exists
  if (!(await tableExists('tips'))) {
    log.info('Creating tips and milestones tables...');

    // Tips and insights library
    await db.query(`
      CREATE TABLE IF NOT EXISTS tips (
        id TEXT PRIMARY KEY,
        title TEXT,
        content TEXT NOT NULL,
        source TEXT,
        category TEXT NOT NULL,
        subcategory TEXT,
        trigger_type TEXT NOT NULL,
        trigger_value TEXT,
        display_context TEXT,
        times_shown INTEGER DEFAULT 0,
        times_liked INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await db.query(`CREATE INDEX IF NOT EXISTS idx_tips_trigger ON tips(trigger_type, trigger_value)`);
    await db.query(`CREATE INDEX IF NOT EXISTS idx_tips_category ON tips(category)`);
    await db.query(`CREATE INDEX IF NOT EXISTS idx_tips_display_context ON tips(display_context)`);

    // Track which tips user has seen (avoid repetition)
    await db.query(`
      CREATE TABLE IF NOT EXISTS user_tips_seen (
        user_id TEXT NOT NULL,
        tip_id TEXT NOT NULL,
        seen_at TIMESTAMP DEFAULT NOW(),
        liked BOOLEAN DEFAULT FALSE,
        PRIMARY KEY (user_id, tip_id)
      )
    `);

    await db.query(`CREATE INDEX IF NOT EXISTS idx_user_tips_seen_user ON user_tips_seen(user_id)`);

    // Milestone definitions for unlocking tips
    await db.query(`
      CREATE TABLE IF NOT EXISTS milestones (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        metric TEXT NOT NULL,
        threshold INTEGER NOT NULL,
        reward_type TEXT,
        reward_value TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // User milestone progress
    await db.query(`
      CREATE TABLE IF NOT EXISTS user_milestones (
        user_id TEXT NOT NULL,
        milestone_id TEXT NOT NULL,
        current_value INTEGER DEFAULT 0,
        completed_at TIMESTAMP,
        reward_claimed BOOLEAN DEFAULT FALSE,
        PRIMARY KEY (user_id, milestone_id)
      )
    `);

    await db.query(`CREATE INDEX IF NOT EXISTS idx_user_milestones_user ON user_milestones(user_id)`);

    log.info('Tips and milestones tables created');

    // Seed tips and milestones
    await seedTips();
    await seedMilestones();

    log.info('Tips and milestones data seeded');
  } else {
    log.info('Tips table already exists, skipping...');
  }

  log.info('Migration 005_tips_and_milestones complete');
}
