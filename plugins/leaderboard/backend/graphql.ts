/**
 * Global Leaderboard Plugin - GraphQL Implementation
 *
 * Migrated from REST to GraphQL.
 */

import {
  defineGraphQLPlugin,
  type GraphQLPluginContext,
  type Resolvers,
} from '@musclemap/plugin-sdk';

// ============================================
// GRAPHQL SCHEMA
// ============================================

const typeDefs = `#graphql
  extend type Query {
    """
    Get the global leaderboard.
    """
    leaderboard(
      """Type of leaderboard to fetch."""
      type: LeaderboardType!
      """Time period for the leaderboard."""
      period: LeaderboardPeriod = ALL_TIME
      """Maximum number of entries to return (max 100)."""
      limit: Int = 25
      """Cursor for pagination."""
      after: String
    ): LeaderboardConnection!

    """
    Get the current user's rank on a leaderboard.
    """
    myLeaderboardRank(
      type: LeaderboardType!
      period: LeaderboardPeriod = ALL_TIME
    ): LeaderboardRank
  }

  enum LeaderboardType {
    """Training Units leaderboard."""
    TU
    """Workout count leaderboard."""
    WORKOUTS
    """Current streak leaderboard."""
    STREAK
  }

  enum LeaderboardPeriod {
    """All-time statistics."""
    ALL_TIME
    """Last 7 days."""
    WEEKLY
    """Last 30 days."""
    MONTHLY
  }

  type LeaderboardConnection {
    edges: [LeaderboardEdge!]!
    pageInfo: PageInfo!
    """Total number of users on this leaderboard."""
    totalCount: Int!
    """When this leaderboard was last updated."""
    updatedAt: DateTime!
  }

  type LeaderboardEdge {
    node: LeaderboardEntry!
    cursor: String!
  }

  type LeaderboardEntry {
    """Global rank on this leaderboard."""
    rank: Int!
    """The user."""
    user: User!
    """Total Training Units (for TU leaderboard)."""
    totalTU: Float!
    """Workout count (for WORKOUTS leaderboard)."""
    workoutCount: Int!
    """Current streak (for STREAK leaderboard)."""
    currentStreak: Int
    """Score used for ranking (depends on leaderboard type)."""
    score: Float!
  }

  type LeaderboardRank {
    """User's global rank."""
    rank: Int!
    """Total participants on this leaderboard."""
    totalParticipants: Int!
    """User's score."""
    score: Float!
    """Percentile (top X%)."""
    percentile: Float!
  }
`;

// ============================================
// RESOLVERS
// ============================================

interface LeaderboardRow {
  id: string;
  username: string;
  display_name: string | null;
  totalTU: number;
  workoutCount: number;
  currentStreak?: number;
}

const resolvers: Resolvers = {
  Query: {
    leaderboard: async (
      _parent,
      args: {
        type: 'TU' | 'WORKOUTS' | 'STREAK';
        period: 'ALL_TIME' | 'WEEKLY' | 'MONTHLY';
        limit: number;
        after?: string;
      },
      context: GraphQLPluginContext
    ) => {
      const limit = Math.min(args.limit || 25, 100);
      const offset = args.after ? parseInt(Buffer.from(args.after, 'base64').toString()) : 0;

      // Build date filter
      let dateFilter = '';
      if (args.period === 'WEEKLY') {
        dateFilter = "AND w.created_at >= datetime('now', '-7 days')";
      } else if (args.period === 'MONTHLY') {
        dateFilter = "AND w.created_at >= datetime('now', '-30 days')";
      }

      // Build order column
      const orderColumn = args.type === 'WORKOUTS' ? 'workoutCount' : 'totalTU';

      const sql = `
        SELECT u.id, u.username, u.display_name,
               COALESCE(SUM(w.total_tu), 0) as totalTU,
               COUNT(w.id) as workoutCount
        FROM users u
        LEFT JOIN workouts w ON w.user_id = u.id ${dateFilter}
        GROUP BY u.id
        HAVING ${orderColumn} > 0
        ORDER BY ${orderColumn} DESC
        LIMIT ? OFFSET ?
      `;

      const leaders = await context.db.query<LeaderboardRow>(sql, [limit + 1, offset]);

      // Get total count
      const countSql = `
        SELECT COUNT(DISTINCT u.id) as count
        FROM users u
        LEFT JOIN workouts w ON w.user_id = u.id ${dateFilter}
        GROUP BY u.id
        HAVING ${orderColumn} > 0
      `;
      const countResult = await context.db.query<{ count: number }>(countSql, []);
      const totalCount = countResult.length;

      const hasNextPage = leaders.length > limit;
      const edges = leaders.slice(0, limit).map((leader, index) => ({
        node: {
          rank: offset + index + 1,
          user: {
            id: leader.id,
            username: leader.username,
            displayName: leader.display_name,
          },
          totalTU: leader.totalTU,
          workoutCount: leader.workoutCount,
          currentStreak: leader.currentStreak,
          score: args.type === 'WORKOUTS' ? leader.workoutCount : leader.totalTU,
        },
        cursor: Buffer.from(String(offset + index + 1)).toString('base64'),
      }));

      return {
        edges,
        pageInfo: {
          hasNextPage,
          hasPreviousPage: offset > 0,
          startCursor: edges[0]?.cursor,
          endCursor: edges[edges.length - 1]?.cursor,
        },
        totalCount,
        updatedAt: new Date(),
      };
    },

    myLeaderboardRank: async (
      _parent,
      args: {
        type: 'TU' | 'WORKOUTS' | 'STREAK';
        period: 'ALL_TIME' | 'WEEKLY' | 'MONTHLY';
      },
      context: GraphQLPluginContext
    ) => {
      if (!context.user) {
        return null;
      }

      // Build date filter
      let dateFilter = '';
      if (args.period === 'WEEKLY') {
        dateFilter = "AND w.created_at >= datetime('now', '-7 days')";
      } else if (args.period === 'MONTHLY') {
        dateFilter = "AND w.created_at >= datetime('now', '-30 days')";
      }

      const orderColumn = args.type === 'WORKOUTS' ? 'workoutCount' : 'totalTU';

      // Get user's score
      const userScoreSql = `
        SELECT COALESCE(SUM(w.total_tu), 0) as totalTU,
               COUNT(w.id) as workoutCount
        FROM workouts w
        WHERE w.user_id = ? ${dateFilter.replace('AND', 'AND')}
      `;
      const userScoreResult = await context.db.query<{ totalTU: number; workoutCount: number }>(
        userScoreSql,
        [context.user.id]
      );
      const userScore = userScoreResult[0];
      const score = args.type === 'WORKOUTS' ? userScore?.workoutCount || 0 : userScore?.totalTU || 0;

      if (score === 0) {
        return null;
      }

      // Get rank
      const rankSql = `
        SELECT COUNT(*) + 1 as rank
        FROM (
          SELECT u.id,
                 COALESCE(SUM(w.total_tu), 0) as totalTU,
                 COUNT(w.id) as workoutCount
          FROM users u
          LEFT JOIN workouts w ON w.user_id = u.id ${dateFilter}
          GROUP BY u.id
          HAVING ${orderColumn} > ?
        )
      `;
      const rankResult = await context.db.query<{ rank: number }>(rankSql, [score]);
      const rank = rankResult[0]?.rank || 1;

      // Get total participants
      const totalSql = `
        SELECT COUNT(*) as total
        FROM (
          SELECT u.id,
                 COALESCE(SUM(w.total_tu), 0) as totalTU,
                 COUNT(w.id) as workoutCount
          FROM users u
          LEFT JOIN workouts w ON w.user_id = u.id ${dateFilter}
          GROUP BY u.id
          HAVING ${orderColumn} > 0
        )
      `;
      const totalResult = await context.db.query<{ total: number }>(totalSql, []);
      const totalParticipants = totalResult[0]?.total || 0;

      const percentile = totalParticipants > 0 ? ((totalParticipants - rank + 1) / totalParticipants) * 100 : 0;

      return {
        rank,
        totalParticipants,
        score,
        percentile: Math.round(percentile * 10) / 10,
      };
    },
  },
};

// ============================================
// PLUGIN EXPORT
// ============================================

export default defineGraphQLPlugin((ctx) => {
  ctx.logger.info('Leaderboard plugin loaded (GraphQL mode)');

  return {
    graphql: {
      schema: {
        name: 'leaderboard',
        typeDefs,
        resolvers,
      },
    },

    // Keep REST routes for backward compatibility
    rest: {
      registerRoutes: (router: any) => {
        router.get('/tu/all-time', async (req: any, res: any) => {
          res.json({
            message: 'Deprecated. Use GraphQL query: leaderboard(type: TU, period: ALL_TIME)',
            deprecated: true,
          });
        });
      },
    },

    hooks: {
      onServerStart: async () => {
        ctx.logger.info('Leaderboard plugin started');
      },
    },
  };
});
