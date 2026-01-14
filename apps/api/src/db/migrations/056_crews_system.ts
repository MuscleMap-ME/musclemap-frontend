/**
 * Migration: Crews & Crew Wars System
 *
 * Adds tables for crew management and crew wars:
 * - crews: Team/clan definitions
 * - crew_members: Membership tracking
 * - crew_invites: Invitation system
 * - crew_wars: War/competition tracking
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

export async function up(): Promise<void> {
  log.info('Running migration: 056_crews_system');

  // ============================================
  // CREWS TABLE
  // ============================================
  if (!(await tableExists('crews'))) {
    log.info('Creating crews table...');
    await db.query(`
      CREATE TABLE crews (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        tag TEXT NOT NULL UNIQUE, -- 3-5 character clan tag
        description TEXT,
        avatar TEXT,
        color TEXT DEFAULT '#3B82F6',
        owner_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        member_count INTEGER DEFAULT 1,
        total_tu INTEGER DEFAULT 0,
        weekly_tu INTEGER DEFAULT 0,
        wins INTEGER DEFAULT 0,
        losses INTEGER DEFAULT 0,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    await db.query('CREATE INDEX idx_crews_tag ON crews(tag)');
    await db.query('CREATE INDEX idx_crews_owner ON crews(owner_id)');
    await db.query('CREATE INDEX idx_crews_weekly_tu ON crews(weekly_tu DESC)');
    await db.query('CREATE INDEX idx_crews_total_tu ON crews(total_tu DESC)');

    log.info('crews table created');
  }

  // ============================================
  // CREW MEMBERS TABLE
  // ============================================
  if (!(await tableExists('crew_members'))) {
    log.info('Creating crew_members table...');
    await db.query(`
      CREATE TABLE crew_members (
        id TEXT PRIMARY KEY,
        crew_id TEXT NOT NULL REFERENCES crews(id) ON DELETE CASCADE,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'captain', 'member')),
        joined_at TIMESTAMPTZ DEFAULT NOW(),
        weekly_tu INTEGER DEFAULT 0,
        total_tu INTEGER DEFAULT 0,
        CONSTRAINT unique_crew_member UNIQUE (crew_id, user_id)
      )
    `);

    await db.query('CREATE INDEX idx_crew_members_crew ON crew_members(crew_id)');
    await db.query('CREATE INDEX idx_crew_members_user ON crew_members(user_id)');
    await db.query('CREATE INDEX idx_crew_members_role ON crew_members(crew_id, role)');

    log.info('crew_members table created');
  }

  // ============================================
  // CREW INVITES TABLE
  // ============================================
  if (!(await tableExists('crew_invites'))) {
    log.info('Creating crew_invites table...');
    await db.query(`
      CREATE TABLE crew_invites (
        id TEXT PRIMARY KEY,
        crew_id TEXT NOT NULL REFERENCES crews(id) ON DELETE CASCADE,
        inviter_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        invitee_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'expired')),
        created_at TIMESTAMPTZ DEFAULT NOW(),
        expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '7 days'),
        CONSTRAINT unique_pending_invite UNIQUE (crew_id, invitee_id)
      )
    `);

    await db.query('CREATE INDEX idx_crew_invites_invitee ON crew_invites(invitee_id, status)');
    await db.query('CREATE INDEX idx_crew_invites_crew ON crew_invites(crew_id, status)');
    await db.query('CREATE INDEX idx_crew_invites_expires ON crew_invites(expires_at) WHERE status = \'pending\'');

    log.info('crew_invites table created');
  }

  // ============================================
  // CREW WARS TABLE
  // ============================================
  if (!(await tableExists('crew_wars'))) {
    log.info('Creating crew_wars table...');
    await db.query(`
      CREATE TABLE crew_wars (
        id TEXT PRIMARY KEY,
        challenger_crew_id TEXT NOT NULL REFERENCES crews(id) ON DELETE CASCADE,
        defending_crew_id TEXT NOT NULL REFERENCES crews(id) ON DELETE CASCADE,
        status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'completed', 'cancelled')),
        start_date TIMESTAMPTZ,
        end_date TIMESTAMPTZ,
        challenger_tu INTEGER DEFAULT 0,
        defending_tu INTEGER DEFAULT 0,
        winner_id TEXT REFERENCES crews(id) ON DELETE SET NULL,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    await db.query('CREATE INDEX idx_crew_wars_challenger ON crew_wars(challenger_crew_id, status)');
    await db.query('CREATE INDEX idx_crew_wars_defending ON crew_wars(defending_crew_id, status)');
    await db.query('CREATE INDEX idx_crew_wars_status ON crew_wars(status)');
    await db.query('CREATE INDEX idx_crew_wars_active ON crew_wars(end_date) WHERE status = \'active\'');

    log.info('crew_wars table created');
  }

  log.info('Migration 056_crews_system completed');
}

export async function down(): Promise<void> {
  log.info('Rolling back migration: 056_crews_system');

  await db.query('DROP TABLE IF EXISTS crew_wars CASCADE');
  await db.query('DROP TABLE IF EXISTS crew_invites CASCADE');
  await db.query('DROP TABLE IF EXISTS crew_members CASCADE');
  await db.query('DROP TABLE IF EXISTS crews CASCADE');

  log.info('Rollback 056_crews_system completed');
}
