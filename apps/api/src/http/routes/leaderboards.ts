/**
 * Leaderboards Routes
 *
 * REST API for exercise-based leaderboards:
 * - Query leaderboards with cohort filtering
 * - Get user rankings
 * - Get available metrics for exercises
 * - Simple global stat leaderboards (workouts, volume, streak, credits)
 */

import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { authenticate, optionalAuth } from './auth';
import { leaderboardService, PeriodType } from '../../modules/leaderboards';
import { queryAll, queryOne } from '../../db/client';
import { loggers } from '../../lib/logger';

const _log = loggers.core;

// Schemas
const leaderboardQuerySchema = z.object({
  exerciseId: z.string().min(1),
  metricKey: z.string().min(1),
  periodType: z.enum(['daily', 'weekly', 'monthly', 'all_time']).default('all_time'),
  hangoutId: z.coerce.number().int().positive().optional(),
  virtualHangoutId: z.coerce.number().int().positive().optional(),
  genderCategory: z.string().optional(),
  ageBand: z.string().optional(),
  adaptiveCategory: z.string().optional(),
  verificationStatus: z.enum(['self_reported', 'pending_review', 'verified', 'rejected', 'all']).optional().default('all'),
  limit: z.coerce.number().int().min(1).max(100).optional().default(50),
  offset: z.coerce.number().int().min(0).optional().default(0),
});

const userRankQuerySchema = z.object({
  exerciseId: z.string().min(1),
  metricKey: z.string().min(1),
  periodType: z.enum(['daily', 'weekly', 'monthly', 'all_time']).default('all_time'),
  hangoutId: z.coerce.number().int().positive().optional(),
  virtualHangoutId: z.coerce.number().int().positive().optional(),
  genderCategory: z.string().optional(),
  ageBand: z.string().optional(),
  adaptiveCategory: z.string().optional(),
});

const availableMetricsQuerySchema = z.object({
  hangoutId: z.coerce.number().int().positive().optional(),
  virtualHangoutId: z.coerce.number().int().positive().optional(),
});

export async function registerLeaderboardRoutes(app: FastifyInstance) {
  // ============================================
  // LEADERBOARD QUERIES
  // ============================================

  /**
   * Get leaderboard entries
   * GET /leaderboards
   * Required query params: exerciseId, metricKey
   */
  app.get<{ Querystring: z.infer<typeof leaderboardQuerySchema> }>('/leaderboards', {
    preHandler: optionalAuth,
  }, async (request, reply) => {
    const parseResult = leaderboardQuerySchema.safeParse(request.query);
    if (!parseResult.success) {
      return reply.status(400).send({
        error: {
          code: 'VALIDATION',
          message: 'Missing required query parameters: exerciseId and metricKey are required',
          details: parseResult.error.flatten().fieldErrors,
          statusCode: 400,
        },
      });
    }
    const query = parseResult.data;

    const result = await leaderboardService.getLeaderboard({
      exerciseId: query.exerciseId,
      metricKey: query.metricKey,
      periodType: query.periodType as PeriodType,
      hangoutId: query.hangoutId,
      virtualHangoutId: query.virtualHangoutId,
      genderCategory: query.genderCategory,
      ageBand: query.ageBand,
      adaptiveCategory: query.adaptiveCategory,
      verificationStatus: query.verificationStatus === 'all' ? 'all' : query.verificationStatus,
      limit: query.limit,
      offset: query.offset,
    });

    return reply.send({
      data: result.entries,
      pagination: {
        total: result.total,
        limit: query.limit,
        offset: query.offset,
        hasMore: query.offset + result.entries.length < result.total,
      },
    });
  });

  /**
   * Get global leaderboard (no hangout filter)
   * GET /leaderboards/global
   * Required query params: exerciseId, metricKey
   */
  app.get<{ Querystring: z.infer<typeof leaderboardQuerySchema> }>('/leaderboards/global', {
    preHandler: optionalAuth,
  }, async (request, reply) => {
    const parseResult = leaderboardQuerySchema.safeParse(request.query);
    if (!parseResult.success) {
      return reply.status(400).send({
        error: {
          code: 'VALIDATION',
          message: 'Missing required query parameters: exerciseId and metricKey are required',
          details: parseResult.error.flatten().fieldErrors,
          statusCode: 400,
        },
      });
    }
    const query = parseResult.data;

    const result = await leaderboardService.getLeaderboard({
      exerciseId: query.exerciseId,
      metricKey: query.metricKey,
      periodType: query.periodType as PeriodType,
      // No hangout filter for global
      genderCategory: query.genderCategory,
      ageBand: query.ageBand,
      adaptiveCategory: query.adaptiveCategory,
      verificationStatus: query.verificationStatus === 'all' ? 'all' : query.verificationStatus,
      limit: query.limit,
      offset: query.offset,
    });

    return reply.send({
      data: result.entries,
      pagination: {
        total: result.total,
        limit: query.limit,
        offset: query.offset,
        hasMore: query.offset + result.entries.length < result.total,
      },
    });
  });

  /**
   * Get hangout-specific leaderboard
   * GET /hangouts/:id/leaderboard
   */
  app.get<{ Params: { id: string }; Querystring: Omit<z.infer<typeof leaderboardQuerySchema>, 'hangoutId'> }>('/hangouts/:id/leaderboard', {
    preHandler: optionalAuth,
  }, async (request, reply) => {
    const hangoutId = parseInt(request.params.id, 10);
    if (isNaN(hangoutId)) {
      return reply.status(400).send({
        error: { code: 'VALIDATION', message: 'Invalid hangout ID', statusCode: 400 },
      });
    }

    const query = leaderboardQuerySchema.omit({ hangoutId: true }).parse(request.query);

    const result = await leaderboardService.getLeaderboard({
      exerciseId: query.exerciseId,
      metricKey: query.metricKey,
      periodType: query.periodType as PeriodType,
      hangoutId,
      genderCategory: query.genderCategory,
      ageBand: query.ageBand,
      adaptiveCategory: query.adaptiveCategory,
      verificationStatus: query.verificationStatus === 'all' ? 'all' : query.verificationStatus,
      limit: query.limit,
      offset: query.offset,
    });

    return reply.send({
      data: result.entries,
      pagination: {
        total: result.total,
        limit: query.limit,
        offset: query.offset,
        hasMore: query.offset + result.entries.length < result.total,
      },
    });
  });

  /**
   * Get virtual hangout leaderboard
   * GET /virtual-hangouts/:id/leaderboard
   */
  app.get<{ Params: { id: string }; Querystring: Omit<z.infer<typeof leaderboardQuerySchema>, 'virtualHangoutId'> }>('/virtual-hangouts/:id/leaderboard', {
    preHandler: optionalAuth,
  }, async (request, reply) => {
    const virtualHangoutId = parseInt(request.params.id, 10);
    if (isNaN(virtualHangoutId)) {
      return reply.status(400).send({
        error: { code: 'VALIDATION', message: 'Invalid virtual hangout ID', statusCode: 400 },
      });
    }

    const query = leaderboardQuerySchema.omit({ virtualHangoutId: true }).parse(request.query);

    const result = await leaderboardService.getLeaderboard({
      exerciseId: query.exerciseId,
      metricKey: query.metricKey,
      periodType: query.periodType as PeriodType,
      virtualHangoutId,
      genderCategory: query.genderCategory,
      ageBand: query.ageBand,
      adaptiveCategory: query.adaptiveCategory,
      verificationStatus: query.verificationStatus === 'all' ? 'all' : query.verificationStatus,
      limit: query.limit,
      offset: query.offset,
    });

    return reply.send({
      data: result.entries,
      pagination: {
        total: result.total,
        limit: query.limit,
        offset: query.offset,
        hasMore: query.offset + result.entries.length < result.total,
      },
    });
  });

  // ============================================
  // USER RANKINGS
  // ============================================

  /**
   * Get current user's rank
   * GET /me/rank
   */
  app.get<{ Querystring: z.infer<typeof userRankQuerySchema> }>('/me/rank', {
    preHandler: authenticate,
  }, async (request, reply) => {
    const query = userRankQuerySchema.parse(request.query);

    const rank = await leaderboardService.getUserRank(request.user!.userId, {
      exerciseId: query.exerciseId,
      metricKey: query.metricKey,
      periodType: query.periodType as PeriodType,
      hangoutId: query.hangoutId,
      virtualHangoutId: query.virtualHangoutId,
      genderCategory: query.genderCategory,
      ageBand: query.ageBand,
      adaptiveCategory: query.adaptiveCategory,
    });

    if (!rank) {
      return reply.status(404).send({
        error: { code: 'NOT_FOUND', message: 'No entry found for this exercise/metric', statusCode: 404 },
      });
    }

    return reply.send({ data: rank });
  });

  /**
   * Get a user's rank
   * GET /users/:id/rank
   */
  app.get<{ Params: { id: string }; Querystring: z.infer<typeof userRankQuerySchema> }>('/users/:id/rank', {
    preHandler: optionalAuth,
  }, async (request, reply) => {
    const query = userRankQuerySchema.parse(request.query);

    const rank = await leaderboardService.getUserRank(request.params.id, {
      exerciseId: query.exerciseId,
      metricKey: query.metricKey,
      periodType: query.periodType as PeriodType,
      hangoutId: query.hangoutId,
      virtualHangoutId: query.virtualHangoutId,
      genderCategory: query.genderCategory,
      ageBand: query.ageBand,
      adaptiveCategory: query.adaptiveCategory,
    });

    if (!rank) {
      return reply.status(404).send({
        error: { code: 'NOT_FOUND', message: 'No entry found for this exercise/metric', statusCode: 404 },
      });
    }

    return reply.send({ data: rank });
  });

  // ============================================
  // AVAILABLE METRICS
  // ============================================

  /**
   * Get available exercise metrics for leaderboards
   * GET /leaderboards/metrics
   */
  app.get<{ Querystring: z.infer<typeof availableMetricsQuerySchema> }>('/leaderboards/metrics', async (request, reply) => {
    const query = availableMetricsQuerySchema.parse(request.query);

    const metrics = await leaderboardService.getAvailableMetrics(query.hangoutId, query.virtualHangoutId);

    return reply.send({ data: metrics });
  });

  /**
   * Get metrics for a specific exercise
   * GET /exercises/:id/metrics
   */
  app.get<{ Params: { id: string } }>('/exercises/:id/metrics', async (request, reply) => {
    const metrics = await leaderboardService.getMetricDefinitions(request.params.id);

    return reply.send({ data: metrics });
  });

  // ============================================
  // SIMPLE GLOBAL STAT LEADERBOARDS
  // These don't require exerciseId - they rank users by aggregate stats
  // ============================================

  const simpleLeaderboardSchema = z.object({
    metric: z.enum(['workout_count', 'total_volume', 'current_streak', 'credits_earned', 'buddy_level']).default('workout_count'),
    window: z.enum(['daily', 'weekly', 'monthly', 'all_time']).default('weekly'),
    limit: z.coerce.number().int().min(1).max(100).default(50),
  });

  /**
   * Get simple global stat leaderboard (no exercise required)
   * GET /leaderboards/global?metric=workout_count&window=weekly
   * Supports: workout_count, total_volume, current_streak, credits_earned, buddy_level
   */
  app.get('/leaderboards/simple', { preHandler: optionalAuth }, async (request, reply) => {
    const query = simpleLeaderboardSchema.parse(request.query);
    const { metric, window, limit } = query;

    // Build the date filter based on window
    let dateFilter = '';
    if (window === 'daily') {
      dateFilter = "AND w.date = CURRENT_DATE";
    } else if (window === 'weekly') {
      dateFilter = "AND w.date >= CURRENT_DATE - INTERVAL '7 days'";
    } else if (window === 'monthly') {
      dateFilter = "AND w.date >= CURRENT_DATE - INTERVAL '30 days'";
    }
    // all_time has no filter

    let sql: string;
    let params: unknown[] = [limit];

    switch (metric) {
      case 'workout_count':
        sql = `
          SELECT u.id, u.username, u.display_name, u.avatar_url, COUNT(w.id)::int as value,
                 ROW_NUMBER() OVER (ORDER BY COUNT(w.id) DESC) as rank
          FROM users u
          LEFT JOIN workouts w ON w.user_id = u.id ${dateFilter}
          GROUP BY u.id
          HAVING COUNT(w.id) > 0
          ORDER BY value DESC
          LIMIT $1
        `;
        break;

      case 'total_volume':
        sql = `
          SELECT u.id, u.username, u.display_name, u.avatar_url, COALESCE(SUM(w.total_tu), 0)::int as value,
                 ROW_NUMBER() OVER (ORDER BY COALESCE(SUM(w.total_tu), 0) DESC) as rank
          FROM users u
          LEFT JOIN workouts w ON w.user_id = u.id ${dateFilter}
          GROUP BY u.id
          HAVING COALESCE(SUM(w.total_tu), 0) > 0
          ORDER BY value DESC
          LIMIT $1
        `;
        break;

      case 'current_streak':
        // Streak is stored on the user directly
        sql = `
          SELECT u.id, u.username, u.display_name, u.avatar_url,
                 COALESCE(u.current_streak, 0)::int as value,
                 ROW_NUMBER() OVER (ORDER BY COALESCE(u.current_streak, 0) DESC) as rank
          FROM users u
          WHERE COALESCE(u.current_streak, 0) > 0
          ORDER BY value DESC
          LIMIT $1
        `;
        break;

      case 'credits_earned':
        sql = `
          SELECT u.id, u.username, u.display_name, u.avatar_url,
                 COALESCE(wl.balance, 0)::int as value,
                 ROW_NUMBER() OVER (ORDER BY COALESCE(wl.balance, 0) DESC) as rank
          FROM users u
          LEFT JOIN wallets wl ON wl.user_id = u.id
          WHERE COALESCE(wl.balance, 0) > 0
          ORDER BY value DESC
          LIMIT $1
        `;
        break;

      case 'buddy_level':
        sql = `
          SELECT u.id, u.username, u.display_name, u.avatar_url,
                 COALESCE(ub.level, 0)::int as value,
                 ROW_NUMBER() OVER (ORDER BY COALESCE(ub.level, 0) DESC) as rank
          FROM users u
          LEFT JOIN user_buddies ub ON ub.user_id = u.id
          WHERE COALESCE(ub.level, 0) > 0
          ORDER BY value DESC
          LIMIT $1
        `;
        break;

      default:
        return reply.status(400).send({
          error: { code: 'INVALID_METRIC', message: `Unknown metric: ${metric}`, statusCode: 400 },
        });
    }

    const entries = await queryAll<{
      id: string;
      username: string;
      display_name: string | null;
      avatar_url: string | null;
      value: number;
      rank: number;
    }>(sql, params);

    return reply.send({
      data: entries.map(e => ({
        userId: e.id,
        username: e.username,
        displayName: e.display_name,
        avatarUrl: e.avatar_url,
        value: e.value,
        rank: e.rank,
      })),
      meta: { metric, window, limit },
    });
  });

  /**
   * Get user's rank on a simple stat leaderboard
   * GET /leaderboards/user-rank?metric=workout_count&window=weekly
   */
  app.get('/leaderboards/user-rank', { preHandler: authenticate }, async (request, reply) => {
    const query = simpleLeaderboardSchema.parse(request.query);
    const { metric, window } = query;
    const userId = request.user!.userId;

    // Build the date filter based on window
    let dateFilter = '';
    if (window === 'daily') {
      dateFilter = "AND w.date = CURRENT_DATE";
    } else if (window === 'weekly') {
      dateFilter = "AND w.date >= CURRENT_DATE - INTERVAL '7 days'";
    } else if (window === 'monthly') {
      dateFilter = "AND w.date >= CURRENT_DATE - INTERVAL '30 days'";
    }

    let sql: string;
    let params: unknown[] = [userId];

    switch (metric) {
      case 'workout_count':
        sql = `
          WITH ranked AS (
            SELECT u.id, COUNT(w.id)::int as value,
                   RANK() OVER (ORDER BY COUNT(w.id) DESC) as rank
            FROM users u
            LEFT JOIN workouts w ON w.user_id = u.id ${dateFilter}
            GROUP BY u.id
          )
          SELECT rank, value FROM ranked WHERE id = $1
        `;
        break;

      case 'total_volume':
        sql = `
          WITH ranked AS (
            SELECT u.id, COALESCE(SUM(w.total_tu), 0)::int as value,
                   RANK() OVER (ORDER BY COALESCE(SUM(w.total_tu), 0) DESC) as rank
            FROM users u
            LEFT JOIN workouts w ON w.user_id = u.id ${dateFilter}
            GROUP BY u.id
          )
          SELECT rank, value FROM ranked WHERE id = $1
        `;
        break;

      case 'current_streak':
        sql = `
          WITH ranked AS (
            SELECT id, COALESCE(current_streak, 0)::int as value,
                   RANK() OVER (ORDER BY COALESCE(current_streak, 0) DESC) as rank
            FROM users
          )
          SELECT rank, value FROM ranked WHERE id = $1
        `;
        break;

      case 'credits_earned':
        sql = `
          WITH ranked AS (
            SELECT u.id, COALESCE(wl.balance, 0)::int as value,
                   RANK() OVER (ORDER BY COALESCE(wl.balance, 0) DESC) as rank
            FROM users u
            LEFT JOIN wallets wl ON wl.user_id = u.id
          )
          SELECT rank, value FROM ranked WHERE id = $1
        `;
        break;

      case 'buddy_level':
        sql = `
          WITH ranked AS (
            SELECT u.id, COALESCE(ub.level, 0)::int as value,
                   RANK() OVER (ORDER BY COALESCE(ub.level, 0) DESC) as rank
            FROM users u
            LEFT JOIN user_buddies ub ON ub.user_id = u.id
          )
          SELECT rank, value FROM ranked WHERE id = $1
        `;
        break;

      default:
        return reply.status(400).send({
          error: { code: 'INVALID_METRIC', message: `Unknown metric: ${metric}`, statusCode: 400 },
        });
    }

    const result = await queryOne<{ rank: number; value: number }>(sql, params);

    if (!result) {
      return reply.send({ data: { rank: null, value: 0 } });
    }

    return reply.send({ data: { rank: result.rank, value: result.value, metric, window } });
  });
}
