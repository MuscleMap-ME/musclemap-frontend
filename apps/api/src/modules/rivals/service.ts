/**
 * Rivals Service
 *
 * Business logic for the rivalry system.
 */
import { db } from '../../db';
import type {
  Rival,
  RivalWithUser,
  RivalStats,
  RivalStatus,
} from './types';

// Map DB rows to Rival type
function mapRival(row: any): Rival {
  return {
    id: row.id,
    challengerId: row.challenger_id,
    challengedId: row.challenged_id,
    status: row.status,
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
  const opponent = await db.get<any>(
    `SELECT id, username, avatar, archetype FROM users WHERE id = ?`,
    [opponentId]
  );

  // Get opponent's level from journey data
  const levelData = await db.get<any>(
    `SELECT current_level FROM user_journey WHERE user_id = ?`,
    [opponentId]
  );

  const myTU = isChallenger ? rival.challengerTU : rival.challengedTU;
  const opponentTU = isChallenger ? rival.challengedTU : rival.challengerTU;

  return {
    ...rival,
    opponent: {
      id: opponent?.id || opponentId,
      username: opponent?.username || 'Unknown',
      avatar: opponent?.avatar,
      archetype: opponent?.archetype,
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
   * Initialize the rivals table
   */
  async initTable(): Promise<void> {
    await db.run(`
      CREATE TABLE IF NOT EXISTS rivals (
        id TEXT PRIMARY KEY,
        challenger_id TEXT NOT NULL,
        challenged_id TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending',
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        started_at TEXT,
        ended_at TEXT,
        challenger_tu REAL NOT NULL DEFAULT 0,
        challenged_tu REAL NOT NULL DEFAULT 0,
        last_challenger_workout TEXT,
        last_challenged_workout TEXT,
        FOREIGN KEY (challenger_id) REFERENCES users(id),
        FOREIGN KEY (challenged_id) REFERENCES users(id)
      )
    `);

    // Create indexes
    await db.run(
      `CREATE INDEX IF NOT EXISTS idx_rivals_challenger ON rivals(challenger_id, status)`
    );
    await db.run(
      `CREATE INDEX IF NOT EXISTS idx_rivals_challenged ON rivals(challenged_id, status)`
    );
  },

  /**
   * Create a new rivalry request
   */
  async createRivalry(
    challengerId: string,
    challengedId: string
  ): Promise<RivalWithUser> {
    // Check if rivalry already exists
    const existing = await db.get<any>(
      `SELECT * FROM rivals
       WHERE ((challenger_id = ? AND challenged_id = ?)
              OR (challenger_id = ? AND challenged_id = ?))
         AND status IN ('pending', 'active')`,
      [challengerId, challengedId, challengedId, challengerId]
    );

    if (existing) {
      throw new Error('Rivalry already exists');
    }

    // Check if users exist
    const challenged = await db.get<any>(
      `SELECT id FROM users WHERE id = ?`,
      [challengedId]
    );
    if (!challenged) {
      throw new Error('User not found');
    }

    const id = crypto.randomUUID();
    await db.run(
      `INSERT INTO rivals (id, challenger_id, challenged_id, status, created_at)
       VALUES (?, ?, ?, 'pending', datetime('now'))`,
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
    const row = await db.get<any>(`SELECT * FROM rivals WHERE id = ?`, [id]);
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

    await db.run(
      `UPDATE rivals SET status = 'active', started_at = datetime('now') WHERE id = ?`,
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

    await db.run(`UPDATE rivals SET status = 'declined' WHERE id = ?`, [id]);
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

    await db.run(
      `UPDATE rivals SET status = 'ended', ended_at = datetime('now') WHERE id = ?`,
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
    const statusFilter = status ? `AND status = ?` : `AND status != 'declined'`;
    const params = status
      ? [userId, userId, status]
      : [userId, userId];

    const rows = await db.all<any[]>(
      `SELECT * FROM rivals
       WHERE (challenger_id = ? OR challenged_id = ?) ${statusFilter}
       ORDER BY
         CASE status
           WHEN 'active' THEN 1
           WHEN 'pending' THEN 2
           ELSE 3
         END,
         created_at DESC`,
      params
    );

    return Promise.all(rows.map((row) => enrichRival(mapRival(row), userId)));
  },

  /**
   * Get pending rivalry requests for a user
   */
  async getPendingRequests(userId: string): Promise<RivalWithUser[]> {
    const rows = await db.all<any[]>(
      `SELECT * FROM rivals
       WHERE challenged_id = ? AND status = 'pending'
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
    const active = await db.get<any>(
      `SELECT COUNT(*) as count FROM rivals
       WHERE (challenger_id = ? OR challenged_id = ?) AND status = 'active'`,
      [userId, userId]
    );

    // Count wins/losses/ties
    const results = await db.all<any[]>(
      `SELECT
         CASE
           WHEN challenger_id = ? THEN
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
       WHERE (challenger_id = ? OR challenged_id = ?) AND status = 'ended'`,
      [userId, userId, userId]
    );

    const wins = results.filter((r) => r.result === 'win').length;
    const losses = results.filter((r) => r.result === 'loss').length;
    const ties = results.filter((r) => r.result === 'tie').length;

    // Total TU earned in rivalries
    const tuData = await db.get<any>(
      `SELECT
         SUM(CASE WHEN challenger_id = ? THEN challenger_tu ELSE challenged_tu END) as total_tu
       FROM rivals
       WHERE (challenger_id = ? OR challenged_id = ?) AND status IN ('active', 'ended')`,
      [userId, userId, userId]
    );

    // TODO: Calculate streaks from historical data
    const currentStreak = 0;
    const longestStreak = 0;

    return {
      activeRivals: active?.count || 0,
      wins,
      losses,
      ties,
      totalTUEarned: parseFloat(tuData?.total_tu) || 0,
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
    topMuscles: string[]
  ): Promise<RivalWithUser[]> {
    const isChallenger = `challenger_id = ?`;
    const isChallenged = `challenged_id = ?`;

    // Update all active rivalries where user is challenger
    await db.run(
      `UPDATE rivals
       SET challenger_tu = challenger_tu + ?,
           last_challenger_workout = datetime('now')
       WHERE ${isChallenger} AND status = 'active'`,
      [tuEarned, userId]
    );

    // Update all active rivalries where user is challenged
    await db.run(
      `UPDATE rivals
       SET challenged_tu = challenged_tu + ?,
           last_challenged_workout = datetime('now')
       WHERE ${isChallenged} AND status = 'active'`,
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
    const rows = await db.all<any[]>(
      `SELECT u.id, u.username, u.avatar, u.archetype
       FROM users u
       WHERE u.id != ?
         AND u.username LIKE ?
         AND u.id NOT IN (
           SELECT challenger_id FROM rivals
           WHERE challenged_id = ? AND status IN ('pending', 'active')
           UNION
           SELECT challenged_id FROM rivals
           WHERE challenger_id = ? AND status IN ('pending', 'active')
         )
       LIMIT ?`,
      [userId, `%${query}%`, userId, userId, limit]
    );

    return rows;
  },
};
