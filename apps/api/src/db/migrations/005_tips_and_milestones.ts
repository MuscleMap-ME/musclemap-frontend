/**
 * Migration: Add tips, milestones, and user tracking tables
 *
 * This migration adds the contextual tips, insights, and rewards system.
 */

import { db } from '../client';
import { loggers } from '../../lib/logger';
import { seedTips, seedMilestones } from '../seed-tips';

const log = loggers.db;

export function migrate(): void {
  log.info('Running migration: 005_tips_and_milestones');

  // Check if tips table already exists
  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='tips'").get();

  if (!tables) {
    log.info('Creating tips and milestones tables...');

    db.exec(`
      -- Tips and insights library
      CREATE TABLE IF NOT EXISTS tips (
        id TEXT PRIMARY KEY,

        -- Content
        title TEXT,
        content TEXT NOT NULL,
        source TEXT,

        -- Categorization
        category TEXT NOT NULL,
        subcategory TEXT,

        -- Targeting
        trigger_type TEXT NOT NULL,
        trigger_value TEXT,

        -- Display context
        display_context TEXT,

        -- Engagement
        times_shown INTEGER DEFAULT 0,
        times_liked INTEGER DEFAULT 0,

        created_at TEXT DEFAULT (datetime('now'))
      );

      CREATE INDEX IF NOT EXISTS idx_tips_trigger ON tips(trigger_type, trigger_value);
      CREATE INDEX IF NOT EXISTS idx_tips_category ON tips(category);
      CREATE INDEX IF NOT EXISTS idx_tips_display_context ON tips(display_context);

      -- Track which tips user has seen (avoid repetition)
      CREATE TABLE IF NOT EXISTS user_tips_seen (
        user_id TEXT NOT NULL,
        tip_id TEXT NOT NULL,
        seen_at TEXT DEFAULT (datetime('now')),
        liked INTEGER DEFAULT 0,

        PRIMARY KEY (user_id, tip_id)
      );

      CREATE INDEX IF NOT EXISTS idx_user_tips_seen_user ON user_tips_seen(user_id);

      -- Milestone definitions for unlocking tips
      CREATE TABLE IF NOT EXISTS milestones (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,

        -- Trigger conditions
        metric TEXT NOT NULL,
        threshold INTEGER NOT NULL,

        -- Reward
        reward_type TEXT,
        reward_value TEXT,

        created_at TEXT DEFAULT (datetime('now'))
      );

      -- User milestone progress
      CREATE TABLE IF NOT EXISTS user_milestones (
        user_id TEXT NOT NULL,
        milestone_id TEXT NOT NULL,

        current_value INTEGER DEFAULT 0,
        completed_at TEXT,
        reward_claimed INTEGER DEFAULT 0,

        PRIMARY KEY (user_id, milestone_id)
      );

      CREATE INDEX IF NOT EXISTS idx_user_milestones_user ON user_milestones(user_id);
    `);

    log.info('Tips and milestones tables created');

    // Seed tips and milestones
    seedTips();
    seedMilestones();

    log.info('Tips and milestones data seeded');
  } else {
    log.info('Tips table already exists, skipping...');
  }

  log.info('Migration 005_tips_and_milestones complete');
}
