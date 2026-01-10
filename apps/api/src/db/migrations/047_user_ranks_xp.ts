/**
 * Migration: User Ranks and XP System
 *
 * Adds:
 * 1. XP columns to users table (total_xp, current_rank, rank_updated_at)
 * 2. rank_definitions table with 8 tiers (Novice → Grandmaster)
 * 3. xp_history table for auditing XP awards
 * 4. veteran_tier column to users for tenure badges
 *
 * Rank Tiers:
 * - Novice (0 XP) - Empty outline
 * - Trainee (100 XP) - 1 chevron
 * - Apprentice (500 XP) - 2 chevrons
 * - Practitioner (1,500 XP) - 3 chevrons
 * - Journeyperson (4,000 XP) - Bronze star
 * - Expert (10,000 XP) - Silver star
 * - Master (25,000 XP) - Gold star
 * - Grandmaster (60,000 XP) - Diamond shield
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

async function indexExists(indexName: string): Promise<boolean> {
  const result = await db.queryOne<{ count: string }>(
    `SELECT COUNT(*) as count FROM pg_indexes WHERE indexname = $1`,
    [indexName]
  );
  return parseInt(result?.count || '0') > 0;
}

export async function up(): Promise<void> {
  log.info('Running migration: 047_user_ranks_xp');

  // ============================================
  // ADD XP COLUMNS TO USERS TABLE
  // ============================================
  if (!(await columnExists('users', 'total_xp'))) {
    log.info('Adding total_xp column to users...');
    await db.query('ALTER TABLE users ADD COLUMN total_xp INTEGER NOT NULL DEFAULT 0');
  }

  if (!(await columnExists('users', 'current_rank'))) {
    log.info('Adding current_rank column to users...');
    await db.query("ALTER TABLE users ADD COLUMN current_rank TEXT NOT NULL DEFAULT 'novice'");
  }

  if (!(await columnExists('users', 'rank_updated_at'))) {
    log.info('Adding rank_updated_at column to users...');
    await db.query('ALTER TABLE users ADD COLUMN rank_updated_at TIMESTAMPTZ DEFAULT NOW()');
  }

  if (!(await columnExists('users', 'veteran_tier'))) {
    log.info('Adding veteran_tier column to users...');
    await db.query('ALTER TABLE users ADD COLUMN veteran_tier INTEGER DEFAULT 0');
  }

  // ============================================
  // CREATE RANK DEFINITIONS TABLE
  // ============================================
  if (!(await tableExists('rank_definitions'))) {
    log.info('Creating rank_definitions table...');
    await db.query(`
      CREATE TABLE rank_definitions (
        id TEXT PRIMARY KEY,
        tier INTEGER NOT NULL UNIQUE,
        name TEXT NOT NULL UNIQUE,
        display_name TEXT NOT NULL,
        xp_threshold INTEGER NOT NULL,
        badge_icon TEXT NOT NULL,
        badge_color TEXT NOT NULL,
        perks JSONB DEFAULT '[]',
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    // Seed rank definitions with military-inspired insignia
    const ranks = [
      {
        id: 'rank_novice',
        tier: 1,
        name: 'novice',
        displayName: 'Novice',
        xpThreshold: 0,
        badgeIcon: 'chevron-outline',
        badgeColor: '#6B7280',
        perks: ['Basic profile'],
      },
      {
        id: 'rank_trainee',
        tier: 2,
        name: 'trainee',
        displayName: 'Trainee',
        xpThreshold: 100,
        badgeIcon: 'chevron-1',
        badgeColor: '#22C55E',
        perks: ['Access to basic leaderboards'],
      },
      {
        id: 'rank_apprentice',
        tier: 3,
        name: 'apprentice',
        displayName: 'Apprentice',
        xpThreshold: 500,
        badgeIcon: 'chevron-2',
        badgeColor: '#3B82F6',
        perks: ['Custom profile bio'],
      },
      {
        id: 'rank_practitioner',
        tier: 4,
        name: 'practitioner',
        displayName: 'Practitioner',
        xpThreshold: 1500,
        badgeIcon: 'chevron-3',
        badgeColor: '#8B5CF6',
        perks: ['Extended workout history'],
      },
      {
        id: 'rank_journeyperson',
        tier: 5,
        name: 'journeyperson',
        displayName: 'Journeyperson',
        xpThreshold: 4000,
        badgeIcon: 'star-bronze',
        badgeColor: '#EAB308',
        perks: ['Create groups', 'Advanced analytics'],
      },
      {
        id: 'rank_expert',
        tier: 6,
        name: 'expert',
        displayName: 'Expert',
        xpThreshold: 10000,
        badgeIcon: 'star-silver',
        badgeColor: '#F97316',
        perks: ['Priority support', 'Beta features'],
      },
      {
        id: 'rank_master',
        tier: 7,
        name: 'master',
        displayName: 'Master',
        xpThreshold: 25000,
        badgeIcon: 'star-gold',
        badgeColor: '#EF4444',
        perks: ['Mentor status', 'Create classes'],
      },
      {
        id: 'rank_grandmaster',
        tier: 8,
        name: 'grandmaster',
        displayName: 'Grandmaster',
        xpThreshold: 60000,
        badgeIcon: 'shield-diamond',
        badgeColor: '#EC4899',
        perks: ['Elite badge', 'All perks', 'Direct dev access'],
      },
    ];

    for (const rank of ranks) {
      await db.query(
        `INSERT INTO rank_definitions (id, tier, name, display_name, xp_threshold, badge_icon, badge_color, perks)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         ON CONFLICT (id) DO NOTHING`,
        [
          rank.id,
          rank.tier,
          rank.name,
          rank.displayName,
          rank.xpThreshold,
          rank.badgeIcon,
          rank.badgeColor,
          JSON.stringify(rank.perks),
        ]
      );
    }

    log.info('Seeded 8 rank definitions');
  }

  // ============================================
  // CREATE XP HISTORY TABLE
  // ============================================
  if (!(await tableExists('xp_history'))) {
    log.info('Creating xp_history table...');
    await db.query(`
      CREATE TABLE xp_history (
        id TEXT PRIMARY KEY DEFAULT 'xp_' || replace(gen_random_uuid()::text, '-', ''),
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        amount INTEGER NOT NULL,
        source_type TEXT NOT NULL,
        source_id TEXT,
        reason TEXT,
        metadata JSONB DEFAULT '{}',
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    log.info('Created xp_history table');
  }

  // ============================================
  // CREATE INDEXES
  // ============================================
  if (!(await indexExists('idx_xp_history_user'))) {
    log.info('Creating idx_xp_history_user index...');
    await db.query('CREATE INDEX idx_xp_history_user ON xp_history(user_id, created_at DESC)');
  }

  if (!(await indexExists('idx_users_xp'))) {
    log.info('Creating idx_users_xp index...');
    await db.query('CREATE INDEX idx_users_xp ON users(total_xp DESC)');
  }

  if (!(await indexExists('idx_users_rank'))) {
    log.info('Creating idx_users_rank index...');
    await db.query('CREATE INDEX idx_users_rank ON users(current_rank)');
  }

  if (!(await indexExists('idx_users_veteran_tier'))) {
    log.info('Creating idx_users_veteran_tier index...');
    await db.query('CREATE INDEX idx_users_veteran_tier ON users(veteran_tier)');
  }

  // ============================================
  // ADD XP EARNING RULES TO EXISTING TABLE
  // ============================================
  if (await tableExists('earning_rules')) {
    log.info('Adding XP earning rules...');
    const xpRules = [
      { code: 'xp_workout_base', name: 'Workout XP', category: 'workout', credits: 0, xp: 25, desc: 'Base XP for completing a workout' },
      { code: 'xp_workout_duration', name: 'Duration Bonus XP', category: 'workout', credits: 0, xp: 5, desc: 'XP per 10 minutes of workout' },
      { code: 'xp_goal_complete', name: 'Goal Complete XP', category: 'goal', credits: 0, xp: 50, desc: 'XP for completing a personal goal' },
      { code: 'xp_archetype_level', name: 'Archetype Level XP', category: 'workout', credits: 0, xp: 100, desc: 'XP for leveling up in an archetype' },
      { code: 'xp_streak_daily', name: 'Daily Streak XP', category: 'streak', credits: 0, xp: 10, desc: 'XP for maintaining daily streak' },
      { code: 'xp_streak_7day', name: '7-Day Streak Bonus', category: 'streak', credits: 0, xp: 50, desc: 'Bonus XP for 7-day streak' },
      { code: 'xp_streak_30day', name: '30-Day Streak Bonus', category: 'streak', credits: 0, xp: 200, desc: 'Bonus XP for 30-day streak' },
      { code: 'xp_first_workout', name: 'First Workout XP', category: 'special', credits: 0, xp: 100, desc: 'One-time XP for first workout' },
      { code: 'xp_achievement_common', name: 'Common Achievement XP', category: 'special', credits: 0, xp: 25, desc: 'XP for common achievements' },
      { code: 'xp_achievement_rare', name: 'Rare Achievement XP', category: 'special', credits: 0, xp: 100, desc: 'XP for rare achievements' },
      { code: 'xp_achievement_legendary', name: 'Legendary Achievement XP', category: 'special', credits: 0, xp: 500, desc: 'XP for legendary achievements' },
    ];

    for (const rule of xpRules) {
      await db.query(
        `INSERT INTO earning_rules (code, name, category, credits_base, xp_base, description, enabled)
         VALUES ($1, $2, $3, $4, $5, $6, TRUE)
         ON CONFLICT (code) DO UPDATE SET xp_base = EXCLUDED.xp_base`,
        [rule.code, rule.name, rule.category, rule.credits, rule.xp, rule.desc]
      );
    }

    log.info('Added XP earning rules');
  }

  // ============================================
  // ANALYZE NEW TABLES
  // ============================================
  log.info('Analyzing tables...');
  const tables = ['rank_definitions', 'xp_history'];
  for (const table of tables) {
    if (await tableExists(table)) {
      try {
        await db.query(`ANALYZE ${table}`);
      } catch (e) {
        log.debug(`Could not analyze ${table}`);
      }
    }
  }

  log.info('Migration 047_user_ranks_xp complete');
}

export async function down(): Promise<void> {
  log.info('Rolling back migration: 047_user_ranks_xp');

  // Remove XP earning rules
  if (await tableExists('earning_rules')) {
    await db.query(`DELETE FROM earning_rules WHERE code LIKE 'xp_%'`);
  }

  // Drop indexes
  await db.query('DROP INDEX IF EXISTS idx_xp_history_user');
  await db.query('DROP INDEX IF EXISTS idx_users_xp');
  await db.query('DROP INDEX IF EXISTS idx_users_rank');
  await db.query('DROP INDEX IF EXISTS idx_users_veteran_tier');

  // Drop tables
  await db.query('DROP TABLE IF EXISTS xp_history CASCADE');
  await db.query('DROP TABLE IF EXISTS rank_definitions CASCADE');

  // Remove columns from users
  if (await columnExists('users', 'veteran_tier')) {
    await db.query('ALTER TABLE users DROP COLUMN veteran_tier');
  }
  if (await columnExists('users', 'rank_updated_at')) {
    await db.query('ALTER TABLE users DROP COLUMN rank_updated_at');
  }
  if (await columnExists('users', 'current_rank')) {
    await db.query('ALTER TABLE users DROP COLUMN current_rank');
  }
  if (await columnExists('users', 'total_xp')) {
    await db.query('ALTER TABLE users DROP COLUMN total_xp');
  }

  log.info('Rollback 047_user_ranks_xp complete');
}

export const migrate = up;
