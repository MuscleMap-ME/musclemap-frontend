/**
 * Rivals Service
 *
 * Business logic for the rivalry system.
 */
import { randomUUID } from 'crypto';
import { queryOne, queryAll, execute } from '../../db/client';
import type {
  Rival,
  RivalWithUser,
  RivalStats,
  RivalStatus,
} from './types';

// DB row types
interface RivalRow {
  id: string;
  challenger_id: string;
  challenged_id: string;
  status: string;
  created_at: string;
  started_at: string | null;
  ended_at: string | null;
  challenger_tu: string;
  challenged_tu: string;
  last_challenger_workout: string | null;
  last_challenged_workout: string | null;
}

// Map DB rows to Rival type
function mapRival(row: RivalRow): Rival {
  return {
    id: row.id,
    challengerId: row.challenger_id,
    challengedId: row.challenged_id,
    status: row.status as RivalStatus,
    createdAt: new Date(row.created_at),
    startedAt: row.started_at ? new Date(row.started_at) : null,
    endedAt: row.ended_at ? new Date(row.ended_at) : null,
    challengerTU: parseFloat(row.challenger_tu) || 0,
    challengedTU: parseFloat(row.challenged_tu) || 0,
    lastChallengerWorkout: row.last_challenger_workout
      ? new Date(row.last_challenger_workout)
      : null,
    lastChallengedWorkout: row.last_challenged_workout
      ? new Date(row.last_challenged_workout)
      : null,
  };
}

// Enrich rival with opponent info
async function enrichRival(rival: Rival, userId: string): Promise<RivalWithUser> {
  const isChallenger = rival.challengerId === userId;
  const opponentId = isChallenger ? rival.challengedId : rival.challengerId;

  // Get opponent info
  const opponent = await queryOne<{
    id: string;
    username: string | null;
    avatar_url: string | null;
    archetype: string | null;
  }>(
    `SELECT id, username, avatar_url, archetype FROM users WHERE id = $1`,
    [opponentId]
  );

  // Get opponent's level from journey data
  const levelData = await queryOne<{ current_level: number }>(
    `SELECT current_level FROM user_journey WHERE user_id = $1`,
    [opponentId]
  );

  const myTU = isChallenger ? rival.challengerTU : rival.challengedTU;
  const opponentTU = isChallenger ? rival.challengedTU : rival.challengerTU;

  return {
    ...rival,
    opponent: {
      id: opponent?.id || opponentId,
      username: opponent?.username || 'Unknown',
      avatar: opponent?.avatar_url ?? undefined,
      archetype: opponent?.archetype ?? undefined,
      level: levelData?.current_level || 1,
    },
    isChallenger,
    myTU,
    opponentTU,
    myLastWorkout: isChallenger
      ? rival.lastChallengerWorkout
      : rival.lastChallengedWorkout,
    opponentLastWorkout: isChallenger
      ? rival.lastChallengedWorkout
      : rival.lastChallengerWorkout,
    tuDifference: myTU - opponentTU,
    isWinning: myTU > opponentTU,
  };
}

export const rivalsService = {
  /**
   * Create a new rivalry request
   */
  async createRivalry(
    challengerId: string,
    challengedId: string
  ): Promise<RivalWithUser> {
    // Check if rivalry already exists
    const existing = await queryOne<RivalRow>(
      `SELECT * FROM rivals
       WHERE ((challenger_id = $1 AND challenged_id = $2)
              OR (challenger_id = $2 AND challenged_id = $1))
         AND status IN ('pending', 'active')`,
      [challengerId, challengedId]
    );

    if (existing) {
      throw new Error('Rivalry already exists');
    }

    // Check if users exist
    const challenged = await queryOne<{ id: string }>(
      `SELECT id FROM users WHERE id = $1`,
      [challengedId]
    );
    if (!challenged) {
      throw new Error('User not found');
    }

    const id = randomUUID();
    await execute(
      `INSERT INTO rivals (id, challenger_id, challenged_id, status, created_at)
       VALUES ($1, $2, $3, 'pending', NOW())`,
      [id, challengerId, challengedId]
    );

    const rival = await this.getRivalry(id);
    if (!rival) throw new Error('Failed to create rivalry');

    return enrichRival(rival, challengerId);
  },

  /**
   * Get a rivalry by ID
   */
  async getRivalry(id: string): Promise<Rival | null> {
    const row = await queryOne<RivalRow>(`SELECT * FROM rivals WHERE id = $1`, [id]);
    return row ? mapRival(row) : null;
  },

  /**
   * Get rivalry with user info
   */
  async getRivalryWithUser(
    id: string,
    userId: string
  ): Promise<RivalWithUser | null> {
    const rival = await this.getRivalry(id);
    if (!rival) return null;
    return enrichRival(rival, userId);
  },

  /**
   * Accept a rivalry request
   */
  async acceptRivalry(id: string, userId: string): Promise<RivalWithUser> {
    const rival = await this.getRivalry(id);
    if (!rival) throw new Error('Rivalry not found');
    if (rival.status !== 'pending') throw new Error('Rivalry is not pending');
    if (rival.challengedId !== userId)
      throw new Error('Only the challenged user can accept');

    await execute(
      `UPDATE rivals SET status = 'active', started_at = NOW() WHERE id = $1`,
      [id]
    );

    const updated = await this.getRivalry(id);
    return enrichRival(updated!, userId);
  },

  /**
   * Decline a rivalry request
   */
  async declineRivalry(id: string, userId: string): Promise<void> {
    const rival = await this.getRivalry(id);
    if (!rival) throw new Error('Rivalry not found');
    if (rival.status !== 'pending') throw new Error('Rivalry is not pending');
    if (rival.challengedId !== userId)
      throw new Error('Only the challenged user can decline');

    await execute(`UPDATE rivals SET status = 'declined' WHERE id = $1`, [id]);
  },

  /**
   * End an active rivalry
   */
  async endRivalry(id: string, userId: string): Promise<void> {
    const rival = await this.getRivalry(id);
    if (!rival) throw new Error('Rivalry not found');
    if (rival.status !== 'active') throw new Error('Rivalry is not active');
    if (rival.challengerId !== userId && rival.challengedId !== userId)
      throw new Error('Only participants can end rivalry');

    await execute(
      `UPDATE rivals SET status = 'ended', ended_at = NOW() WHERE id = $1`,
      [id]
    );
  },

  /**
   * Get all rivalries for a user
   */
  async getUserRivalries(
    userId: string,
    status?: RivalStatus
  ): Promise<RivalWithUser[]> {
    let rows: RivalRow[];

    if (status) {
      rows = await queryAll<RivalRow>(
        `SELECT * FROM rivals
         WHERE (challenger_id = $1 OR challenged_id = $1) AND status = $2
         ORDER BY
           CASE status
             WHEN 'active' THEN 1
             WHEN 'pending' THEN 2
             ELSE 3
           END,
           created_at DESC`,
        [userId, status]
      );
    } else {
      rows = await queryAll<RivalRow>(
        `SELECT * FROM rivals
         WHERE (challenger_id = $1 OR challenged_id = $1) AND status != 'declined'
         ORDER BY
           CASE status
             WHEN 'active' THEN 1
             WHEN 'pending' THEN 2
             ELSE 3
           END,
           created_at DESC`,
        [userId]
      );
    }

    return Promise.all(rows.map((row) => enrichRival(mapRival(row), userId)));
  },

  /**
   * Get pending rivalry requests for a user
   */
  async getPendingRequests(userId: string): Promise<RivalWithUser[]> {
    const rows = await queryAll<RivalRow>(
      `SELECT * FROM rivals
       WHERE challenged_id = $1 AND status = 'pending'
       ORDER BY created_at DESC`,
      [userId]
    );

    return Promise.all(rows.map((row) => enrichRival(mapRival(row), userId)));
  },

  /**
   * Get rivalry stats for a user
   */
  async getUserStats(userId: string): Promise<RivalStats> {
    // Count active rivalries
    const active = await queryOne<{ count: string }>(
      `SELECT COUNT(*) as count FROM rivals
       WHERE (challenger_id = $1 OR challenged_id = $1) AND status = 'active'`,
      [userId]
    );

    // Count wins/losses/ties - ordered by end date for streak calculation
    const results = await queryAll<{ result: string }>(
      `SELECT
         CASE
           WHEN challenger_id = $1 THEN
             CASE
               WHEN challenger_tu > challenged_tu THEN 'win'
               WHEN challenger_tu < challenged_tu THEN 'loss'
               ELSE 'tie'
             END
           ELSE
             CASE
               WHEN challenged_tu > challenger_tu THEN 'win'
               WHEN challenged_tu < challenger_tu THEN 'loss'
               ELSE 'tie'
             END
         END as result
       FROM rivals
       WHERE (challenger_id = $1 OR challenged_id = $1) AND status = 'ended'
       ORDER BY ended_at DESC NULLS LAST`,
      [userId]
    );

    const wins = results.filter((r) => r.result === 'win').length;
    const losses = results.filter((r) => r.result === 'loss').length;
    const ties = results.filter((r) => r.result === 'tie').length;

    // Total TU earned in rivalries
    const tuData = await queryOne<{ total_tu: string | null }>(
      `SELECT
         SUM(CASE WHEN challenger_id = $1 THEN challenger_tu ELSE challenged_tu END) as total_tu
       FROM rivals
       WHERE (challenger_id = $1 OR challenged_id = $1) AND status IN ('active', 'ended')`,
      [userId]
    );

    // Calculate streaks from historical data (ordered most recent first)
    let currentStreak = 0;
    let longestStreak = 0;
    let tempStreak = 0;

    for (const r of results) {
      if (r.result === 'win') {
        tempStreak++;
        // Current streak only counts from the most recent
        if (tempStreak === results.indexOf(r) + 1) {
          currentStreak = tempStreak;
        }
        longestStreak = Math.max(longestStreak, tempStreak);
      } else {
        tempStreak = 0;
      }
    }

    // Simpler current streak: count consecutive wins from start
    currentStreak = 0;
    for (const r of results) {
      if (r.result === 'win') {
        currentStreak++;
      } else {
        break;
      }
    }

    return {
      activeRivals: parseInt(active?.count || '0', 10),
      wins,
      losses,
      ties,
      totalTUEarned: parseFloat(tuData?.total_tu || '0'),
      currentStreak,
      longestStreak,
    };
  },

  /**
   * Record a workout for rivalry tracking
   */
  async recordWorkout(
    userId: string,
    workoutId: string,
    tuEarned: number,
    _topMuscles: string[]
  ): Promise<RivalWithUser[]> {
    // Update all active rivalries where user is challenger
    await execute(
      `UPDATE rivals
       SET challenger_tu = challenger_tu + $1,
           last_challenger_workout = NOW()
       WHERE challenger_id = $2 AND status = 'active'`,
      [tuEarned, userId]
    );

    // Update all active rivalries where user is challenged
    await execute(
      `UPDATE rivals
       SET challenged_tu = challenged_tu + $1,
           last_challenged_workout = NOW()
       WHERE challenged_id = $2 AND status = 'active'`,
      [tuEarned, userId]
    );

    // Return updated rivalries for notifications
    return this.getUserRivalries(userId, 'active');
  },

  /**
   * Search for potential rivals
   */
  async searchPotentialRivals(
    userId: string,
    query: string,
    limit = 20
  ): Promise<
    Array<{ id: string; username: string; avatar?: string; archetype?: string }>
  > {
    // Get users matching query, excluding self and existing rivals
    const rows = await queryAll<{
      id: string;
      username: string;
      avatar_url: string | null;
      archetype: string | null;
    }>(
      `SELECT u.id, u.username, u.avatar_url, u.current_identity_id as archetype
       FROM users u
       WHERE u.id != $1
         AND u.username ILIKE $2
         AND u.id NOT IN (
           SELECT challenger_id FROM rivals
           WHERE challenged_id = $1 AND status IN ('pending', 'active')
           UNION
           SELECT challenged_id FROM rivals
           WHERE challenger_id = $1 AND status IN ('pending', 'active')
         )
       LIMIT $3`,
      [userId, `%${query}%`, limit]
    );

    return rows.map((r) => ({
      id: r.id,
      username: r.username,
      avatar: r.avatar_url ?? undefined,
      archetype: r.archetype ?? undefined,
    }));
  },
};
