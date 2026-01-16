/**
 * Leaderboards Routes
 *
 * REST API for exercise-based leaderboards:
 * - Query leaderboards with cohort filtering
 * - Get user rankings
 * - Get available metrics for exercises
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { authenticate, optionalAuth } from './auth';
import { leaderboardService, PeriodType } from '../../modules/leaderboards';
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
   */
  app.get<{ Querystring: z.infer<typeof leaderboardQuerySchema> }>('/leaderboards', {
    preHandler: optionalAuth,
  }, async (request, reply) => {
    const query = leaderboardQuerySchema.parse(request.query);

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
   */
  app.get<{ Querystring: z.infer<typeof leaderboardQuerySchema> }>('/leaderboards/global', {
    preHandler: optionalAuth,
  }, async (request, reply) => {
    const query = leaderboardQuerySchema.parse(request.query);

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
}
