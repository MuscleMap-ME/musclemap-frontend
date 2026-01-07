/**
 * Crews Service
 *
 * Business logic for crew management and Crew Wars.
 */
import { queryOne, queryAll, execute } from '../../db/client';
import type {
  Crew,
  CrewMember,
  CrewRole,
  CrewInvite,
  CrewWar,
  CrewWarStatus,
  CrewWarWithDetails,
  CrewLeaderboard,
  CrewStats,
} from './types';

// Helper to generate IDs
function genId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Create a new crew
 */
export async function createCrew(
  ownerId: string,
  name: string,
  tag: string,
  description?: string,
  color?: string
): Promise<Crew> {
  const id = genId('crew');
  const now = new Date().toISOString();

  // Validate tag (3-5 alphanumeric characters)
  const cleanTag = tag.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 5);
  if (cleanTag.length < 3) {
    throw new Error('Tag must be 3-5 alphanumeric characters');
  }

  // Check if user is already in a crew
  const existingMember = await queryOne<{ crew_id: string }>(
    'SELECT crew_id FROM crew_members WHERE user_id = $1',
    [ownerId]
  );
  if (existingMember) {
    throw new Error('You are already in a crew');
  }

  await execute(
    `INSERT INTO crews (id, name, tag, description, color, owner_id, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [id, name, cleanTag, description || null, color || '#3B82F6', ownerId, now]
  );

  // Add owner as member
  const memberId = genId('cm');
  await execute(
    `INSERT INTO crew_members (id, crew_id, user_id, role, joined_at)
     VALUES ($1, $2, $3, 'owner', $4)`,
    [memberId, id, ownerId, now]
  );

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
export async function getCrew(crewId: string): Promise<Crew | null> {
  const row = await queryOne<{
    id: string;
    name: string;
    tag: string;
    description: string | null;
    avatar: string | null;
    color: string;
    owner_id: string;
    member_count: number;
    total_tu: number;
    weekly_tu: number;
    wins: number;
    losses: number;
    created_at: string;
  }>('SELECT * FROM crews WHERE id = $1', [crewId]);

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
export async function getUserCrew(userId: string): Promise<{ crew: Crew; membership: CrewMember } | null> {
  const membership = await queryOne<{
    id: string;
    crew_id: string;
    user_id: string;
    role: string;
    joined_at: string;
    weekly_tu: number;
    total_tu: number;
    username: string | null;
    avatar: string | null;
    archetype: string | null;
  }>(
    `SELECT cm.*, u.username, u.avatar, u.archetype
     FROM crew_members cm
     LEFT JOIN users u ON u.id = cm.user_id
     WHERE cm.user_id = $1`,
    [userId]
  );

  if (!membership) return null;

  const crew = await getCrew(membership.crew_id);
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
      username: membership.username ?? undefined,
      avatar: membership.avatar ?? undefined,
      archetype: membership.archetype ?? undefined,
    },
  };
}

/**
 * Get crew members
 */
export async function getCrewMembers(crewId: string): Promise<CrewMember[]> {
  const rows = await queryAll<{
    id: string;
    crew_id: string;
    user_id: string;
    role: string;
    joined_at: string;
    weekly_tu: number;
    total_tu: number;
    username: string | null;
    avatar: string | null;
    archetype: string | null;
  }>(
    `SELECT cm.*, u.username, u.avatar, u.archetype
     FROM crew_members cm
     LEFT JOIN users u ON u.id = cm.user_id
     WHERE cm.crew_id = $1
     ORDER BY cm.weekly_tu DESC`,
    [crewId]
  );

  return rows.map((row) => ({
    id: row.id,
    crewId: row.crew_id,
    userId: row.user_id,
    role: row.role as CrewRole,
    joinedAt: row.joined_at,
    weeklyTU: row.weekly_tu,
    totalTU: row.total_tu,
    username: row.username ?? undefined,
    avatar: row.avatar ?? undefined,
    archetype: row.archetype ?? undefined,
  }));
}

/**
 * Invite user to crew
 */
export async function inviteToCrew(crewId: string, inviterId: string, inviteeId: string): Promise<CrewInvite> {
  const id = genId('inv');
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days

  // Check inviter has permission
  const inviterMember = await queryOne<{ role: string }>(
    'SELECT role FROM crew_members WHERE crew_id = $1 AND user_id = $2',
    [crewId, inviterId]
  );

  if (!inviterMember || inviterMember.role === 'member') {
    throw new Error('You do not have permission to invite members');
  }

  // Check invitee not in a crew
  const inviteeInCrew = await queryOne<{ crew_id: string }>(
    'SELECT crew_id FROM crew_members WHERE user_id = $1',
    [inviteeId]
  );

  if (inviteeInCrew) {
    throw new Error('User is already in a crew');
  }

  await execute(
    `INSERT INTO crew_invites (id, crew_id, inviter_id, invitee_id, created_at, expires_at)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [id, crewId, inviterId, inviteeId, now.toISOString(), expiresAt.toISOString()]
  );

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
export async function acceptInvite(inviteId: string, userId: string): Promise<CrewMember> {
  const invite = await queryOne<{
    id: string;
    crew_id: string;
    inviter_id: string;
    invitee_id: string;
    status: string;
    expires_at: string;
  }>(
    'SELECT * FROM crew_invites WHERE id = $1 AND invitee_id = $2 AND status = $3',
    [inviteId, userId, 'pending']
  );

  if (!invite) {
    throw new Error('Invite not found or already used');
  }

  if (new Date(invite.expires_at) < new Date()) {
    await execute('UPDATE crew_invites SET status = $1 WHERE id = $2', ['expired', inviteId]);
    throw new Error('Invite has expired');
  }

  const memberId = genId('cm');
  const now = new Date().toISOString();

  await execute(
    `INSERT INTO crew_members (id, crew_id, user_id, role, joined_at)
     VALUES ($1, $2, $3, 'member', $4)`,
    [memberId, invite.crew_id, userId, now]
  );

  await execute('UPDATE crew_invites SET status = $1 WHERE id = $2', ['accepted', inviteId]);
  await execute('UPDATE crews SET member_count = member_count + 1 WHERE id = $1', [invite.crew_id]);

  const user = await queryOne<{ username: string | null; avatar: string | null; archetype: string | null }>(
    'SELECT username, avatar, archetype FROM users WHERE id = $1',
    [userId]
  );

  return {
    id: memberId,
    crewId: invite.crew_id,
    userId,
    role: 'member',
    joinedAt: now,
    weeklyTU: 0,
    totalTU: 0,
    username: user?.username ?? undefined,
    avatar: user?.avatar ?? undefined,
    archetype: user?.archetype ?? undefined,
  };
}

/**
 * Leave crew
 */
export async function leaveCrew(userId: string): Promise<void> {
  const member = await queryOne<{ crew_id: string; role: string }>(
    'SELECT crew_id, role FROM crew_members WHERE user_id = $1',
    [userId]
  );

  if (!member) {
    throw new Error('You are not in a crew');
  }

  if (member.role === 'owner') {
    throw new Error('Owners cannot leave. Transfer ownership first or disband the crew.');
  }

  await execute('DELETE FROM crew_members WHERE user_id = $1', [userId]);
  await execute('UPDATE crews SET member_count = member_count - 1 WHERE id = $1', [member.crew_id]);
}

/**
 * Challenge another crew to war
 */
export async function startCrewWar(
  challengerCrewId: string,
  defendingCrewId: string,
  durationDays = 7
): Promise<CrewWar> {
  const id = genId('war');
  const now = new Date();
  const endDate = new Date(now.getTime() + durationDays * 24 * 60 * 60 * 1000);

  // Check not already in active war with each other
  const existingWar = await queryOne<{ id: string }>(
    `SELECT id FROM crew_wars
     WHERE status = 'active'
     AND ((challenger_crew_id = $1 AND defending_crew_id = $2)
          OR (challenger_crew_id = $2 AND defending_crew_id = $1))`,
    [challengerCrewId, defendingCrewId]
  );

  if (existingWar) {
    throw new Error('Already in an active war with this crew');
  }

  await execute(
    `INSERT INTO crew_wars (id, challenger_crew_id, defending_crew_id, status, start_date, end_date, created_at)
     VALUES ($1, $2, $3, 'active', $4, $5, $6)`,
    [id, challengerCrewId, defendingCrewId, now.toISOString(), endDate.toISOString(), now.toISOString()]
  );

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
export async function recordCrewWorkout(userId: string, tu: number): Promise<void> {
  const member = await queryOne<{ crew_id: string }>(
    'SELECT crew_id FROM crew_members WHERE user_id = $1',
    [userId]
  );

  if (!member) return;

  // Update member stats
  await execute(
    `UPDATE crew_members SET weekly_tu = weekly_tu + $1, total_tu = total_tu + $1
     WHERE user_id = $2`,
    [tu, userId]
  );

  // Update crew stats
  await execute(
    `UPDATE crews SET weekly_tu = weekly_tu + $1, total_tu = total_tu + $1
     WHERE id = $2`,
    [tu, member.crew_id]
  );

  // Update active wars
  await execute(
    `UPDATE crew_wars SET challenger_tu = challenger_tu + $1
     WHERE challenger_crew_id = $2 AND status = 'active'`,
    [tu, member.crew_id]
  );

  await execute(
    `UPDATE crew_wars SET defending_tu = defending_tu + $1
     WHERE defending_crew_id = $2 AND status = 'active'`,
    [tu, member.crew_id]
  );
}

/**
 * Get active crew wars for a crew
 */
export async function getCrewWars(crewId: string): Promise<CrewWarWithDetails[]> {
  const rows = await queryAll<{
    id: string;
    challenger_crew_id: string;
    defending_crew_id: string;
    status: string;
    start_date: string;
    end_date: string;
    challenger_tu: number;
    defending_tu: number;
    winner_id: string | null;
    created_at: string;
    cc_id: string;
    cc_name: string;
    cc_tag: string;
    cc_avatar: string | null;
    cc_color: string;
    dc_id: string;
    dc_name: string;
    dc_tag: string;
    dc_avatar: string | null;
    dc_color: string;
  }>(
    `SELECT cw.*,
            cc.id as cc_id, cc.name as cc_name, cc.tag as cc_tag, cc.avatar as cc_avatar, cc.color as cc_color,
            dc.id as dc_id, dc.name as dc_name, dc.tag as dc_tag, dc.avatar as dc_avatar, dc.color as dc_color
     FROM crew_wars cw
     JOIN crews cc ON cc.id = cw.challenger_crew_id
     JOIN crews dc ON dc.id = cw.defending_crew_id
     WHERE (cw.challenger_crew_id = $1 OR cw.defending_crew_id = $1)
     AND cw.status = 'active'
     ORDER BY cw.end_date ASC`,
    [crewId]
  );

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
      status: row.status as CrewWarStatus,
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
export async function getCrewLeaderboard(limit = 50): Promise<CrewLeaderboard[]> {
  const rows = await queryAll<{
    id: string;
    name: string;
    tag: string;
    avatar: string | null;
    color: string;
    member_count: number;
    weekly_tu: number;
  }>(
    `SELECT id, name, tag, avatar, color, member_count, weekly_tu
     FROM crews
     ORDER BY weekly_tu DESC
     LIMIT $1`,
    [limit]
  );

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
export async function getCrewStats(crewId: string): Promise<CrewStats> {
  const crew = await getCrew(crewId);
  if (!crew) {
    throw new Error('Crew not found');
  }

  const topContributors = await queryAll<{
    user_id: string;
    weekly_tu: number;
    username: string | null;
    avatar: string | null;
  }>(
    `SELECT cm.user_id, cm.weekly_tu, u.username, u.avatar
     FROM crew_members cm
     LEFT JOIN users u ON u.id = cm.user_id
     WHERE cm.crew_id = $1
     ORDER BY cm.weekly_tu DESC
     LIMIT 5`,
    [crewId]
  );

  return {
    totalMembers: crew.memberCount,
    totalTU: crew.totalTU,
    weeklyTU: crew.weeklyTU,
    warsWon: crew.wins,
    warsLost: crew.losses,
    currentStreak: 0, // TODO: Calculate streak
    topContributors: topContributors.map((c) => ({
      userId: c.user_id,
      username: c.username ?? undefined,
      avatar: c.avatar ?? undefined,
      weeklyTU: c.weekly_tu,
    })),
  };
}

/**
 * Search crews
 */
export async function searchCrews(query: string, limit = 20): Promise<Crew[]> {
  const rows = await queryAll<{
    id: string;
    name: string;
    tag: string;
    description: string | null;
    avatar: string | null;
    color: string;
    owner_id: string;
    member_count: number;
    total_tu: number;
    weekly_tu: number;
    wins: number;
    losses: number;
    created_at: string;
  }>(
    `SELECT * FROM crews
     WHERE name ILIKE $1 OR tag ILIKE $2
     ORDER BY weekly_tu DESC
     LIMIT $3`,
    [`%${query}%`, `%${query.toUpperCase()}%`, limit]
  );

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
