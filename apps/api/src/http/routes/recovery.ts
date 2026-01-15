/**
 * Recovery Routes (Fastify)
 *
 * REST API endpoints for sleep tracking and recovery scoring.
 */

import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { authenticate } from './auth';
import {
  sleepService,
  recoveryService,
} from '../../modules/recovery';
import { loggers } from '../../lib/logger';

const log = loggers.api;

// ============================================
// VALIDATION SCHEMAS
// ============================================

const createSleepLogSchema = z.object({
  bedTime: z.string().datetime(),
  wakeTime: z.string().datetime(),
  quality: z.number().int().min(1).max(5),
  sleepEnvironment: z.object({
    dark: z.boolean().optional(),
    quiet: z.boolean().optional(),
    temperature: z.enum(['cold', 'cool', 'comfortable', 'warm', 'hot']).optional(),
    screenBeforeBed: z.boolean().optional(),
    caffeineAfter6pm: z.boolean().optional(),
    alcoholConsumed: z.boolean().optional(),
  }).optional(),
  timeToFallAsleepMinutes: z.number().int().min(0).max(240).optional(),
  wakeCount: z.number().int().min(0).max(20).optional(),
  notes: z.string().max(1000).optional(),
  source: z.enum(['manual', 'apple_health', 'fitbit', 'garmin', 'google_fit', 'whoop', 'oura']).optional(),
  externalId: z.string().max(100).optional(),
  loggedAt: z.string().datetime().optional(),
});

const updateSleepLogSchema = z.object({
  quality: z.number().int().min(1).max(5).optional(),
  sleepEnvironment: z.object({
    dark: z.boolean().optional(),
    quiet: z.boolean().optional(),
    temperature: z.enum(['cold', 'cool', 'comfortable', 'warm', 'hot']).optional(),
    screenBeforeBed: z.boolean().optional(),
    caffeineAfter6pm: z.boolean().optional(),
    alcoholConsumed: z.boolean().optional(),
  }).optional(),
  timeToFallAsleepMinutes: z.number().int().min(0).max(240).optional(),
  wakeCount: z.number().int().min(0).max(20).optional(),
  notes: z.string().max(1000).optional(),
});

const sleepGoalSchema = z.object({
  targetHours: z.number().min(4).max(12),
  targetBedTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  targetWakeTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  targetQuality: z.number().int().min(1).max(5).optional(),
  consistencyTarget: z.number().int().min(1).max(7).optional(),
});

const recommendationFeedbackSchema = z.object({
  followed: z.boolean().optional(),
  feedback: z.string().max(500).optional(),
});

// ============================================
// ROUTE REGISTRATION
// ============================================

export async function registerRecoveryRoutes(app: FastifyInstance): Promise<void> {
  // ============================================
  // SLEEP LOG ENDPOINTS
  // ============================================

  /**
   * POST /api/sleep/log
   * Log a sleep session
   */
  app.post('/sleep/log', { preHandler: authenticate }, async (request, reply) => {
    const userId = request.user!.userId;

    let data;
    try {
      data = createSleepLogSchema.parse(request.body);
    } catch (error: any) {
      return reply.status(400).send({
        error: {
          code: 'VALIDATION',
          message: 'Invalid sleep data',
          details: error.errors,
          statusCode: 400,
        },
      });
    }

    try {
      const sleepLog = await sleepService.logSleep(userId, data);
      log.info({ userId, sleepId: sleepLog.id }, 'Sleep logged via API');

      return reply.status(201).send({ data: sleepLog });
    } catch (error: any) {
      log.error({ error: error.message, userId }, 'Failed to log sleep');
      return reply.status(400).send({
        error: {
          code: 'SLEEP_LOG_FAILED',
          message: error.message || 'Failed to log sleep',
          statusCode: 400,
        },
      });
    }
  });

  /**
   * GET /api/sleep/history
   * Get user's sleep history with pagination
   */
  app.get('/sleep/history', { preHandler: authenticate }, async (request, reply) => {
    const userId = request.user!.userId;
    const query = request.query as {
      limit?: string;
      cursor?: string;
      startDate?: string;
      endDate?: string;
    };

    const limit = query.limit ? parseInt(query.limit) : 30;
    let cursor: { bedTime: string; id: string } | undefined;

    if (query.cursor) {
      try {
        cursor = JSON.parse(Buffer.from(query.cursor, 'base64').toString());
      } catch {
        // Invalid cursor, start from beginning
      }
    }

    const result = await sleepService.getSleepHistory(userId, {
      limit,
      cursor,
      startDate: query.startDate,
      endDate: query.endDate,
    });

    const nextCursor = result.nextCursor
      ? Buffer.from(JSON.stringify(result.nextCursor)).toString('base64')
      : null;

    return reply.send({
      data: result.logs,
      meta: {
        limit,
        nextCursor,
        hasMore: result.nextCursor !== null,
      },
    });
  });

  /**
   * GET /api/sleep/:id
   * Get a single sleep log
   */
  app.get('/sleep/:id', { preHandler: authenticate }, async (request, reply) => {
    const userId = request.user!.userId;
    const { id } = request.params as { id: string };

    const sleepLog = await sleepService.getSleepLog(userId, id);

    if (!sleepLog) {
      return reply.status(404).send({
        error: {
          code: 'NOT_FOUND',
          message: 'Sleep log not found',
          statusCode: 404,
        },
      });
    }

    return reply.send({ data: sleepLog });
  });

  /**
   * PATCH /api/sleep/:id
   * Update a sleep log
   */
  app.patch('/sleep/:id', { preHandler: authenticate }, async (request, reply) => {
    const userId = request.user!.userId;
    const { id } = request.params as { id: string };

    let data;
    try {
      data = updateSleepLogSchema.parse(request.body);
    } catch (error: any) {
      return reply.status(400).send({
        error: {
          code: 'VALIDATION',
          message: 'Invalid update data',
          details: error.errors,
          statusCode: 400,
        },
      });
    }

    const sleepLog = await sleepService.updateSleepLog(userId, id, data);

    if (!sleepLog) {
      return reply.status(404).send({
        error: {
          code: 'NOT_FOUND',
          message: 'Sleep log not found',
          statusCode: 404,
        },
      });
    }

    return reply.send({ data: sleepLog });
  });

  /**
   * DELETE /api/sleep/:id
   * Delete a sleep log
   */
  app.delete('/sleep/:id', { preHandler: authenticate }, async (request, reply) => {
    const userId = request.user!.userId;
    const { id } = request.params as { id: string };

    const deleted = await sleepService.deleteSleepLog(userId, id);

    if (!deleted) {
      return reply.status(404).send({
        error: {
          code: 'NOT_FOUND',
          message: 'Sleep log not found',
          statusCode: 404,
        },
      });
    }

    return reply.status(204).send();
  });

  /**
   * GET /api/sleep/last
   * Get last night's sleep
   */
  app.get('/sleep/last', { preHandler: authenticate }, async (request, reply) => {
    const userId = request.user!.userId;

    const sleepLog = await sleepService.getLastSleep(userId);

    if (!sleepLog) {
      return reply.status(404).send({
        error: {
          code: 'NOT_FOUND',
          message: 'No sleep data found',
          statusCode: 404,
        },
      });
    }

    return reply.send({ data: sleepLog });
  });

  /**
   * GET /api/sleep/stats
   * Get sleep statistics
   */
  app.get('/sleep/stats', { preHandler: authenticate }, async (request, reply) => {
    const userId = request.user!.userId;
    const query = request.query as { period?: string };

    const period = (query.period || 'week') as 'week' | 'month' | 'all';
    const stats = await sleepService.getSleepStats(userId, period);

    return reply.send({ data: stats });
  });

  /**
   * GET /api/sleep/weekly-stats
   * Get weekly sleep statistics for trend analysis
   */
  app.get('/sleep/weekly-stats', { preHandler: authenticate }, async (request, reply) => {
    const userId = request.user!.userId;
    const query = request.query as { weeks?: string };

    const weeks = query.weeks ? parseInt(query.weeks) : 8;
    const stats = await sleepService.getWeeklySleepStats(userId, weeks);

    return reply.send({ data: stats });
  });

  // ============================================
  // SLEEP GOAL ENDPOINTS
  // ============================================

  /**
   * GET /api/sleep/goal
   * Get active sleep goal
   */
  app.get('/sleep/goal', { preHandler: authenticate }, async (request, reply) => {
    const userId = request.user!.userId;

    const goal = await sleepService.getActiveSleepGoal(userId);

    if (!goal) {
      return reply.status(404).send({
        error: {
          code: 'NOT_FOUND',
          message: 'No active sleep goal',
          statusCode: 404,
        },
      });
    }

    return reply.send({ data: goal });
  });

  /**
   * POST /api/sleep/goal
   * Create or update sleep goal
   */
  app.post('/sleep/goal', { preHandler: authenticate }, async (request, reply) => {
    const userId = request.user!.userId;

    let data;
    try {
      data = sleepGoalSchema.parse(request.body);
    } catch (error: any) {
      return reply.status(400).send({
        error: {
          code: 'VALIDATION',
          message: 'Invalid goal data',
          details: error.errors,
          statusCode: 400,
        },
      });
    }

    try {
      const goal = await sleepService.upsertSleepGoal(userId, data);
      return reply.status(201).send({ data: goal });
    } catch (error: any) {
      log.error({ error: error.message, userId }, 'Failed to create sleep goal');
      return reply.status(400).send({
        error: {
          code: 'GOAL_FAILED',
          message: error.message || 'Failed to create sleep goal',
          statusCode: 400,
        },
      });
    }
  });

  /**
   * DELETE /api/sleep/goal/:id
   * Delete a sleep goal
   */
  app.delete('/sleep/goal/:id', { preHandler: authenticate }, async (request, reply) => {
    const userId = request.user!.userId;
    const { id } = request.params as { id: string };

    const deleted = await sleepService.deleteSleepGoal(userId, id);

    if (!deleted) {
      return reply.status(404).send({
        error: {
          code: 'NOT_FOUND',
          message: 'Sleep goal not found',
          statusCode: 404,
        },
      });
    }

    return reply.status(204).send();
  });

  // ============================================
  // RECOVERY SCORE ENDPOINTS
  // ============================================

  /**
   * GET /api/recovery/score
   * Get current recovery score
   */
  app.get('/recovery/score', { preHandler: authenticate }, async (request, reply) => {
    const userId = request.user!.userId;
    const query = request.query as { recalculate?: string };

    const forceRecalculate = query.recalculate === 'true';

    try {
      const score = await recoveryService.getRecoveryScore(userId, { forceRecalculate });

      if (!score) {
        // No sleep data to calculate from - calculate with defaults
        const newScore = await recoveryService.calculateRecoveryScore(userId);
        return reply.send({ data: newScore });
      }

      return reply.send({ data: score });
    } catch (error: any) {
      log.error({ error: error.message, userId }, 'Failed to get recovery score');
      return reply.status(500).send({
        error: {
          code: 'RECOVERY_ERROR',
          message: 'Failed to calculate recovery score',
          statusCode: 500,
        },
      });
    }
  });

  /**
   * GET /api/recovery/status
   * Get comprehensive recovery status
   */
  app.get('/recovery/status', { preHandler: authenticate }, async (request, reply) => {
    const userId = request.user!.userId;

    try {
      const status = await recoveryService.getRecoveryStatus(userId);
      return reply.send({ data: status });
    } catch (error: any) {
      log.error({ error: error.message, userId }, 'Failed to get recovery status');
      return reply.status(500).send({
        error: {
          code: 'RECOVERY_ERROR',
          message: 'Failed to get recovery status',
          statusCode: 500,
        },
      });
    }
  });

  /**
   * GET /api/recovery/history
   * Get recovery score history
   */
  app.get('/recovery/history', { preHandler: authenticate }, async (request, reply) => {
    const userId = request.user!.userId;
    const query = request.query as { days?: string };

    const days = query.days ? parseInt(query.days) : 30;

    try {
      const history = await recoveryService.getRecoveryHistory(userId, days);
      return reply.send({ data: history });
    } catch (error: any) {
      log.error({ error: error.message, userId }, 'Failed to get recovery history');
      return reply.status(500).send({
        error: {
          code: 'RECOVERY_ERROR',
          message: 'Failed to get recovery history',
          statusCode: 500,
        },
      });
    }
  });

  // ============================================
  // RECOMMENDATION ENDPOINTS
  // ============================================

  /**
   * GET /api/recovery/recommendations
   * Get active recovery recommendations
   */
  app.get('/recovery/recommendations', { preHandler: authenticate }, async (request, reply) => {
    const userId = request.user!.userId;

    try {
      // First try to get existing recommendations
      let recommendations = await recoveryService.getActiveRecommendations(userId);

      // If no recommendations, generate new ones
      if (recommendations.length === 0) {
        recommendations = await recoveryService.generateRecommendations(userId);
      }

      return reply.send({ data: recommendations });
    } catch (error: any) {
      log.error({ error: error.message, userId }, 'Failed to get recommendations');
      return reply.status(500).send({
        error: {
          code: 'RECOMMENDATION_ERROR',
          message: 'Failed to get recommendations',
          statusCode: 500,
        },
      });
    }
  });

  /**
   * POST /api/recovery/recommendations/:id/acknowledge
   * Acknowledge a recommendation
   */
  app.post('/recovery/recommendations/:id/acknowledge', { preHandler: authenticate }, async (request, reply) => {
    const userId = request.user!.userId;
    const { id } = request.params as { id: string };

    let data = {};
    try {
      data = recommendationFeedbackSchema.parse(request.body || {});
    } catch (_error) {
      return reply.status(400).send({
        error: {
          code: 'VALIDATION',
          message: 'Invalid feedback data',
          statusCode: 400,
        },
      });
    }

    const { followed, feedback } = data as { followed?: boolean; feedback?: string };

    try {
      await recoveryService.acknowledgeRecommendation(userId, id, followed, feedback);
      return reply.status(204).send();
    } catch (_err: unknown) {
      const errorMessage = _err instanceof Error ? _err.message : 'Unknown error';
      log.error({ error: errorMessage, userId, recommendationId: id }, 'Failed to acknowledge recommendation');
      return reply.status(500).send({
        error: {
          code: 'ACKNOWLEDGE_ERROR',
          message: 'Failed to acknowledge recommendation',
          statusCode: 500,
        },
      });
    }
  });

  /**
   * POST /api/recovery/recommendations/generate
   * Force generate new recommendations
   */
  app.post('/recovery/recommendations/generate', { preHandler: authenticate }, async (request, reply) => {
    const userId = request.user!.userId;

    try {
      const recommendations = await recoveryService.generateRecommendations(userId);
      return reply.send({ data: recommendations });
    } catch (error: any) {
      log.error({ error: error.message, userId }, 'Failed to generate recommendations');
      return reply.status(500).send({
        error: {
          code: 'RECOMMENDATION_ERROR',
          message: 'Failed to generate recommendations',
          statusCode: 500,
        },
      });
    }
  });
}
