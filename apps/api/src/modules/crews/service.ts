/**
 * Crews Service
 *
 * Business logic for crew management and Crew Wars.
 */
import { db } from '../../db';
import type {
  Crew,
  CrewMember,
  CrewRole,
  CrewInvite,
  CrewWar,
  CrewWarWithDetails,
  CrewLeaderboard,
  CrewStats,
} from './types';

/**
 * Initialize crews database tables
 */
export function initCrewsTables(): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS crews (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      tag TEXT NOT NULL UNIQUE,
      description TEXT,
      avatar TEXT,
      color TEXT DEFAULT '#3B82F6',
      owner_id TEXT NOT NULL,
      member_count INTEGER DEFAULT 1,
      total_tu INTEGER DEFAULT 0,
      weekly_tu INTEGER DEFAULT 0,
      wins INTEGER DEFAULT 0,
      losses INTEGER DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS crew_members (
      id TEXT PRIMARY KEY,
      crew_id TEXT NOT NULL,
      user_id TEXT NOT NULL UNIQUE,
      role TEXT DEFAULT 'member',
      joined_at TEXT DEFAULT CURRENT_TIMESTAMP,
      weekly_tu INTEGER DEFAULT 0,
      total_tu INTEGER DEFAULT 0,
      FOREIGN KEY (crew_id) REFERENCES crews(id)
    );

    CREATE TABLE IF NOT EXISTS crew_invites (
      id TEXT PRIMARY KEY,
      crew_id TEXT NOT NULL,
      inviter_id TEXT NOT NULL,
      invitee_id TEXT NOT NULL,
      status TEXT DEFAULT 'pending',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      expires_at TEXT NOT NULL,
      FOREIGN KEY (crew_id) REFERENCES crews(id)
    );

    CREATE TABLE IF NOT EXISTS crew_wars (
      id TEXT PRIMARY KEY,
      challenger_crew_id TEXT NOT NULL,
      defending_crew_id TEXT NOT NULL,
      status TEXT DEFAULT 'pending',
      start_date TEXT NOT NULL,
      end_date TEXT NOT NULL,
      challenger_tu INTEGER DEFAULT 0,
      defending_tu INTEGER DEFAULT 0,
      winner_id TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (challenger_crew_id) REFERENCES crews(id),
      FOREIGN KEY (defending_crew_id) REFERENCES crews(id)
    );

    CREATE INDEX IF NOT EXISTS idx_crew_members_crew ON crew_members(crew_id);
    CREATE INDEX IF NOT EXISTS idx_crew_members_user ON crew_members(user_id);
    CREATE INDEX IF NOT EXISTS idx_crew_wars_status ON crew_wars(status);
    CREATE INDEX IF NOT EXISTS idx_crews_weekly_tu ON crews(weekly_tu DESC);
  `);
}

// Helper to generate IDs
function genId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Create a new crew
 */
export function createCrew(
  ownerId: string,
  name: string,
  tag: string,
  description?: string,
  color?: string
): Crew {
  const id = genId('crew');
  const now = new Date().toISOString();

  // Validate tag (3-5 alphanumeric characters)
  const cleanTag = tag.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 5);
  if (cleanTag.length < 3) {
    throw new Error('Tag must be 3-5 alphanumeric characters');
  }

  // Check if user is already in a crew
  const existingMember = db
    .prepare('SELECT crew_id FROM crew_members WHERE user_id = ?')
    .get(ownerId);
  if (existingMember) {
    throw new Error('You are already in a crew');
  }

  db.prepare(
    `INSERT INTO crews (id, name, tag, description, color, owner_id, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).run(id, name, cleanTag, description || null, color || '#3B82F6', ownerId, now);

  // Add owner as member
  const memberId = genId('cm');
  db.prepare(
    `INSERT INTO crew_members (id, crew_id, user_id, role, joined_at)
     VALUES (?, ?, ?, 'owner', ?)`
  ).run(memberId, id, ownerId, now);

  return {
    id,
    name,
    tag: cleanTag,
    description: description || null,
    avatar: null,
    color: color || '#3B82F6',
    ownerId,
    memberCount: 1,
    totalTU: 0,
    weeklyTU: 0,
    wins: 0,
    losses: 0,
    createdAt: now,
  };
}

/**
 * Get a crew by ID
 */
export function getCrew(crewId: string): Crew | null {
  const row = db.prepare('SELECT * FROM crews WHERE id = ?').get(crewId) as any;
  if (!row) return null;

  return {
    id: row.id,
    name: row.name,
    tag: row.tag,
    description: row.description,
    avatar: row.avatar,
    color: row.color,
    ownerId: row.owner_id,
    memberCount: row.member_count,
    totalTU: row.total_tu,
    weeklyTU: row.weekly_tu,
    wins: row.wins,
    losses: row.losses,
    createdAt: row.created_at,
  };
}

/**
 * Get user's crew
 */
export function getUserCrew(userId: string): { crew: Crew; membership: CrewMember } | null {
  const membership = db
    .prepare(
      `SELECT cm.*, u.username, u.avatar, u.archetype
       FROM crew_members cm
       LEFT JOIN users u ON u.id = cm.user_id
       WHERE cm.user_id = ?`
    )
    .get(userId) as any;

  if (!membership) return null;

  const crew = getCrew(membership.crew_id);
  if (!crew) return null;

  return {
    crew,
    membership: {
      id: membership.id,
      crewId: membership.crew_id,
      userId: membership.user_id,
      role: membership.role as CrewRole,
      joinedAt: membership.joined_at,
      weeklyTU: membership.weekly_tu,
      totalTU: membership.total_tu,
      username: membership.username,
      avatar: membership.avatar,
      archetype: membership.archetype,
    },
  };
}

/**
 * Get crew members
 */
export function getCrewMembers(crewId: string): CrewMember[] {
  const rows = db
    .prepare(
      `SELECT cm.*, u.username, u.avatar, u.archetype
       FROM crew_members cm
       LEFT JOIN users u ON u.id = cm.user_id
       WHERE cm.crew_id = ?
       ORDER BY cm.weekly_tu DESC`
    )
    .all(crewId) as any[];

  return rows.map((row) => ({
    id: row.id,
    crewId: row.crew_id,
    userId: row.user_id,
    role: row.role as CrewRole,
    joinedAt: row.joined_at,
    weeklyTU: row.weekly_tu,
    totalTU: row.total_tu,
    username: row.username,
    avatar: row.avatar,
    archetype: row.archetype,
  }));
}

/**
 * Invite user to crew
 */
export function inviteToCrew(crewId: string, inviterId: string, inviteeId: string): CrewInvite {
  const id = genId('inv');
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days

  // Check inviter has permission
  const inviterMember = db
    .prepare('SELECT role FROM crew_members WHERE crew_id = ? AND user_id = ?')
    .get(crewId, inviterId) as any;

  if (!inviterMember || inviterMember.role === 'member') {
    throw new Error('You do not have permission to invite members');
  }

  // Check invitee not in a crew
  const inviteeInCrew = db
    .prepare('SELECT crew_id FROM crew_members WHERE user_id = ?')
    .get(inviteeId);

  if (inviteeInCrew) {
    throw new Error('User is already in a crew');
  }

  db.prepare(
    `INSERT INTO crew_invites (id, crew_id, inviter_id, invitee_id, created_at, expires_at)
     VALUES (?, ?, ?, ?, ?, ?)`
  ).run(id, crewId, inviterId, inviteeId, now.toISOString(), expiresAt.toISOString());

  return {
    id,
    crewId,
    inviterId,
    inviteeId,
    status: 'pending',
    createdAt: now.toISOString(),
    expiresAt: expiresAt.toISOString(),
  };
}

/**
 * Accept crew invite
 */
export function acceptInvite(inviteId: string, userId: string): CrewMember {
  const invite = db
    .prepare('SELECT * FROM crew_invites WHERE id = ? AND invitee_id = ? AND status = ?')
    .get(inviteId, userId, 'pending') as any;

  if (!invite) {
    throw new Error('Invite not found or already used');
  }

  if (new Date(invite.expires_at) < new Date()) {
    db.prepare('UPDATE crew_invites SET status = ? WHERE id = ?').run('expired', inviteId);
    throw new Error('Invite has expired');
  }

  const memberId = genId('cm');
  const now = new Date().toISOString();

  db.prepare(
    `INSERT INTO crew_members (id, crew_id, user_id, role, joined_at)
     VALUES (?, ?, ?, 'member', ?)`
  ).run(memberId, invite.crew_id, userId, now);

  db.prepare('UPDATE crew_invites SET status = ? WHERE id = ?').run('accepted', inviteId);
  db.prepare('UPDATE crews SET member_count = member_count + 1 WHERE id = ?').run(invite.crew_id);

  const user = db.prepare('SELECT username, avatar, archetype FROM users WHERE id = ?').get(userId) as any || {};

  return {
    id: memberId,
    crewId: invite.crew_id,
    userId,
    role: 'member',
    joinedAt: now,
    weeklyTU: 0,
    totalTU: 0,
    username: user.username,
    avatar: user.avatar,
    archetype: user.archetype,
  };
}

/**
 * Leave crew
 */
export function leaveCrew(userId: string): void {
  const member = db
    .prepare('SELECT crew_id, role FROM crew_members WHERE user_id = ?')
    .get(userId) as any;

  if (!member) {
    throw new Error('You are not in a crew');
  }

  if (member.role === 'owner') {
    throw new Error('Owners cannot leave. Transfer ownership first or disband the crew.');
  }

  db.prepare('DELETE FROM crew_members WHERE user_id = ?').run(userId);
  db.prepare('UPDATE crews SET member_count = member_count - 1 WHERE id = ?').run(member.crew_id);
}

/**
 * Challenge another crew to war
 */
export function startCrewWar(
  challengerCrewId: string,
  defendingCrewId: string,
  durationDays = 7
): CrewWar {
  const id = genId('war');
  const now = new Date();
  const endDate = new Date(now.getTime() + durationDays * 24 * 60 * 60 * 1000);

  // Check not already in active war with each other
  const existingWar = db
    .prepare(
      `SELECT id FROM crew_wars
       WHERE status = 'active'
       AND ((challenger_crew_id = ? AND defending_crew_id = ?)
            OR (challenger_crew_id = ? AND defending_crew_id = ?))`
    )
    .get(challengerCrewId, defendingCrewId, defendingCrewId, challengerCrewId);

  if (existingWar) {
    throw new Error('Already in an active war with this crew');
  }

  db.prepare(
    `INSERT INTO crew_wars (id, challenger_crew_id, defending_crew_id, status, start_date, end_date, created_at)
     VALUES (?, ?, ?, 'active', ?, ?, ?)`
  ).run(id, challengerCrewId, defendingCrewId, now.toISOString(), endDate.toISOString(), now.toISOString());

  return {
    id,
    challengerCrewId,
    defendingCrewId,
    status: 'active',
    startDate: now.toISOString(),
    endDate: endDate.toISOString(),
    challengerTU: 0,
    defendingTU: 0,
    winnerId: null,
    createdAt: now.toISOString(),
  };
}

/**
 * Record workout contribution to crew war
 */
export function recordCrewWorkout(userId: string, tu: number): void {
  const member = db
    .prepare('SELECT crew_id FROM crew_members WHERE user_id = ?')
    .get(userId) as any;

  if (!member) return;

  // Update member stats
  db.prepare(
    `UPDATE crew_members SET weekly_tu = weekly_tu + ?, total_tu = total_tu + ?
     WHERE user_id = ?`
  ).run(tu, tu, userId);

  // Update crew stats
  db.prepare(
    `UPDATE crews SET weekly_tu = weekly_tu + ?, total_tu = total_tu + ?
     WHERE id = ?`
  ).run(tu, tu, member.crew_id);

  // Update active wars
  db.prepare(
    `UPDATE crew_wars SET challenger_tu = challenger_tu + ?
     WHERE challenger_crew_id = ? AND status = 'active'`
  ).run(tu, member.crew_id);

  db.prepare(
    `UPDATE crew_wars SET defending_tu = defending_tu + ?
     WHERE defending_crew_id = ? AND status = 'active'`
  ).run(tu, member.crew_id);
}

/**
 * Get active crew wars for a crew
 */
export function getCrewWars(crewId: string): CrewWarWithDetails[] {
  const rows = db
    .prepare(
      `SELECT cw.*,
              cc.id as cc_id, cc.name as cc_name, cc.tag as cc_tag, cc.avatar as cc_avatar, cc.color as cc_color,
              dc.id as dc_id, dc.name as dc_name, dc.tag as dc_tag, dc.avatar as dc_avatar, dc.color as dc_color
       FROM crew_wars cw
       JOIN crews cc ON cc.id = cw.challenger_crew_id
       JOIN crews dc ON dc.id = cw.defending_crew_id
       WHERE (cw.challenger_crew_id = ? OR cw.defending_crew_id = ?)
       AND cw.status = 'active'
       ORDER BY cw.end_date ASC`
    )
    .all(crewId, crewId) as any[];

  const now = new Date();

  return rows.map((row) => {
    const isChallenger = row.challenger_crew_id === crewId;
    const myTU = isChallenger ? row.challenger_tu : row.defending_tu;
    const oppTU = isChallenger ? row.defending_tu : row.challenger_tu;
    const daysRemaining = Math.max(
      0,
      Math.ceil((new Date(row.end_date).getTime() - now.getTime()) / (24 * 60 * 60 * 1000))
    );

    return {
      id: row.id,
      challengerCrewId: row.challenger_crew_id,
      defendingCrewId: row.defending_crew_id,
      status: row.status,
      startDate: row.start_date,
      endDate: row.end_date,
      challengerTU: row.challenger_tu,
      defendingTU: row.defending_tu,
      winnerId: row.winner_id,
      createdAt: row.created_at,
      challengerCrew: {
        id: row.cc_id,
        name: row.cc_name,
        tag: row.cc_tag,
        avatar: row.cc_avatar,
        color: row.cc_color,
      },
      defendingCrew: {
        id: row.dc_id,
        name: row.dc_name,
        tag: row.dc_tag,
        avatar: row.dc_avatar,
        color: row.dc_color,
      },
      isChallenger,
      myCrewTU: myTU,
      opponentCrewTU: oppTU,
      daysRemaining,
      isWinning: myTU > oppTU,
    };
  });
}

/**
 * Get crew leaderboard
 */
export function getCrewLeaderboard(limit = 50): CrewLeaderboard[] {
  const rows = db
    .prepare(
      `SELECT id, name, tag, avatar, color, member_count, weekly_tu
       FROM crews
       ORDER BY weekly_tu DESC
       LIMIT ?`
    )
    .all(limit) as any[];

  return rows.map((row, idx) => ({
    rank: idx + 1,
    crew: {
      id: row.id,
      name: row.name,
      tag: row.tag,
      avatar: row.avatar,
      color: row.color,
      memberCount: row.member_count,
      weeklyTU: row.weekly_tu,
    },
  }));
}

/**
 * Get crew stats
 */
export function getCrewStats(crewId: string): CrewStats {
  const crew = getCrew(crewId);
  if (!crew) {
    throw new Error('Crew not found');
  }

  const topContributors = db
    .prepare(
      `SELECT cm.user_id, cm.weekly_tu, u.username, u.avatar
       FROM crew_members cm
       LEFT JOIN users u ON u.id = cm.user_id
       WHERE cm.crew_id = ?
       ORDER BY cm.weekly_tu DESC
       LIMIT 5`
    )
    .all(crewId) as any[];

  return {
    totalMembers: crew.memberCount,
    totalTU: crew.totalTU,
    weeklyTU: crew.weeklyTU,
    warsWon: crew.wins,
    warsLost: crew.losses,
    currentStreak: 0, // TODO: Calculate streak
    topContributors: topContributors.map((c) => ({
      userId: c.user_id,
      username: c.username,
      avatar: c.avatar,
      weeklyTU: c.weekly_tu,
    })),
  };
}

/**
 * Search crews
 */
export function searchCrews(query: string, limit = 20): Crew[] {
  const rows = db
    .prepare(
      `SELECT * FROM crews
       WHERE name LIKE ? OR tag LIKE ?
       ORDER BY weekly_tu DESC
       LIMIT ?`
    )
    .all(`%${query}%`, `%${query.toUpperCase()}%`, limit) as any[];

  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    tag: row.tag,
    description: row.description,
    avatar: row.avatar,
    color: row.color,
    ownerId: row.owner_id,
    memberCount: row.member_count,
    totalTU: row.total_tu,
    weeklyTU: row.weekly_tu,
    wins: row.wins,
    losses: row.losses,
    createdAt: row.created_at,
  }));
}

// Initialize tables on module load
initCrewsTables();
