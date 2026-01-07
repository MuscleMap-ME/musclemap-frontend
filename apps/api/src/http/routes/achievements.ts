/**
 * Achievements Routes
 *
 * REST API for achievement system:
 * - Get achievement definitions
 * - Get user's achievements
 * - Get achievement feeds for hangouts
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { authenticate, optionalAuth } from './auth';
import { achievementService, AchievementCategory, ACHIEVEMENT_CATEGORIES } from '../../modules/achievements';
import { loggers } from '../../lib/logger';

const log = loggers.core;

// Schemas
const achievementsQuerySchema = z.object({
  category: z.enum(['record', 'streak', 'first_time', 'top_rank', 'milestone', 'social', 'special']).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional().default(50),
  offset: z.coerce.number().int().min(0).optional().default(0),
});

const hangoutFeedQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
  offset: z.coerce.number().int().min(0).optional().default(0),
});

export async function registerAchievementRoutes(app: FastifyInstance) {
  // ============================================
  // ACHIEVEMENT DEFINITIONS
  // ============================================

  /**
   * Get all achievement definitions
   * GET /achievements/definitions
   */
  app.get('/achievements/definitions', async (request: FastifyRequest<{
    Querystring: { category?: string };
  }>, reply: FastifyReply) => {
    const category = request.query.category as AchievementCategory | undefined;

    const definitions = await achievementService.getDefinitions({
      category,
      enabledOnly: true,
    });

    return reply.send({ data: definitions });
  });

  /**
   * Get a specific achievement definition
   * GET /achievements/definitions/:key
   */
  app.get('/achievements/definitions/:key', async (request: FastifyRequest<{
    Params: { key: string };
  }>, reply: FastifyReply) => {
    const definition = await achievementService.getDefinitionByKey(request.params.key);

    if (!definition) {
      return reply.status(404).send({
        error: { code: 'NOT_FOUND', message: 'Achievement not found', statusCode: 404 },
      });
    }

    return reply.send({ data: definition });
  });

  // ============================================
  // USER ACHIEVEMENTS
  // ============================================

  /**
   * Get current user's achievements
   * GET /me/achievements
   */
  app.get('/me/achievements', {
    preHandler: authenticate,
  }, async (request: FastifyRequest<{ Querystring: z.infer<typeof achievementsQuerySchema> }>, reply: FastifyReply) => {
    const query = achievementsQuerySchema.parse(request.query);

    const result = await achievementService.getUserAchievements(request.user!.userId, {
      limit: query.limit,
      offset: query.offset,
      category: query.category as AchievementCategory | undefined,
    });

    return reply.send({
      data: result.achievements,
      pagination: {
        total: result.total,
        limit: query.limit,
        offset: query.offset,
        hasMore: query.offset + result.achievements.length < result.total,
      },
    });
  });

  /**
   * Get current user's achievement summary
   * GET /me/achievements/summary
   */
  app.get('/me/achievements/summary', {
    preHandler: authenticate,
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const summary = await achievementService.getUserSummary(request.user!.userId);

    return reply.send({ data: summary });
  });

  /**
   * Get a user's achievements
   * GET /users/:id/achievements
   */
  app.get('/users/:id/achievements', {
    preHandler: optionalAuth,
  }, async (request: FastifyRequest<{
    Params: { id: string };
    Querystring: z.infer<typeof achievementsQuerySchema>;
  }>, reply: FastifyReply) => {
    const query = achievementsQuerySchema.parse(request.query);

    const result = await achievementService.getUserAchievements(request.params.id, {
      limit: query.limit,
      offset: query.offset,
      category: query.category as AchievementCategory | undefined,
    });

    return reply.send({
      data: result.achievements,
      pagination: {
        total: result.total,
        limit: query.limit,
        offset: query.offset,
        hasMore: query.offset + result.achievements.length < result.total,
      },
    });
  });

  /**
   * Get a user's achievement summary
   * GET /users/:id/achievements/summary
   */
  app.get('/users/:id/achievements/summary', {
    preHandler: optionalAuth,
  }, async (request: FastifyRequest<{
    Params: { id: string };
  }>, reply: FastifyReply) => {
    const summary = await achievementService.getUserSummary(request.params.id);

    return reply.send({ data: summary });
  });

  // ============================================
  // HANGOUT ACHIEVEMENT FEEDS
  // ============================================

  /**
   * Get achievement feed for a hangout
   * GET /hangouts/:id/achievements
   */
  app.get('/hangouts/:id/achievements', {
    preHandler: optionalAuth,
  }, async (request: FastifyRequest<{
    Params: { id: string };
    Querystring: z.infer<typeof hangoutFeedQuerySchema>;
  }>, reply: FastifyReply) => {
    const hangoutId = parseInt(request.params.id, 10);
    if (isNaN(hangoutId)) {
      return reply.status(400).send({
        error: { code: 'VALIDATION', message: 'Invalid hangout ID', statusCode: 400 },
      });
    }

    const query = hangoutFeedQuerySchema.parse(request.query);

    const result = await achievementService.getHangoutFeed(hangoutId, {
      limit: query.limit,
      offset: query.offset,
    });

    return reply.send({
      data: result.achievements,
      pagination: {
        total: result.total,
        limit: query.limit,
        offset: query.offset,
        hasMore: query.offset + result.achievements.length < result.total,
      },
    });
  });

  // ============================================
  // ACHIEVEMENT CATEGORIES
  // ============================================

  /**
   * Get all achievement categories
   * GET /achievements/categories
   */
  app.get('/achievements/categories', async (_request: FastifyRequest, reply: FastifyReply) => {
    const categories = Object.values(ACHIEVEMENT_CATEGORIES).map((category) => ({
      key: category,
      name: category.charAt(0).toUpperCase() + category.slice(1).replace(/_/g, ' '),
    }));

    return reply.send({ data: categories });
  });
}
