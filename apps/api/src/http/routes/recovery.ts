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
  sleepHygieneService,
} from '../../modules/recovery';
import { loggers } from '../../lib/logger';
import type { SleepHygieneTipCategory } from '../../modules/recovery/types';

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

  // ============================================
  // SLEEP HYGIENE ENDPOINTS
  // ============================================

  const sleepHygienePreferencesSchema = z.object({
    enabled: z.boolean().optional(),
    showOnDashboard: z.boolean().optional(),
    showTips: z.boolean().optional(),
    showAssessments: z.boolean().optional(),
    bedtimeReminderEnabled: z.boolean().optional(),
    bedtimeReminderMinutesBefore: z.number().int().min(5).max(120).optional(),
    morningCheckInEnabled: z.boolean().optional(),
    weeklyReportEnabled: z.boolean().optional(),
    earnCreditsEnabled: z.boolean().optional(),
  });

  const preSleepChecklistSchema = z.object({
    avoidedCaffeine: z.boolean().optional(),
    avoidedAlcohol: z.boolean().optional(),
    avoidedScreens1hr: z.boolean().optional(),
    coolRoom: z.boolean().optional(),
    darkRoom: z.boolean().optional(),
    windDownRoutine: z.boolean().optional(),
    consistentBedtime: z.boolean().optional(),
    lightDinner: z.boolean().optional(),
    noLateExercise: z.boolean().optional(),
    relaxationPractice: z.boolean().optional(),
  });

  const postSleepChecklistSchema = z.object({
    fellAsleepEasily: z.boolean().optional(),
    stayedAsleep: z.boolean().optional(),
    wokeRefreshed: z.boolean().optional(),
    noGrogginess: z.boolean().optional(),
    goodEnergy: z.boolean().optional(),
    noMidnightWaking: z.boolean().optional(),
  });

  const sleepHygieneAssessmentSchema = z.object({
    assessmentDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    preSleepChecklist: preSleepChecklistSchema.optional(),
    postSleepChecklist: postSleepChecklistSchema.optional(),
    notes: z.string().max(1000).optional(),
  });

  /**
   * GET /api/sleep-hygiene
   * Get sleep hygiene dashboard
   */
  app.get('/sleep-hygiene', { preHandler: authenticate }, async (request, reply) => {
    const userId = request.user!.userId;

    try {
      const dashboard = await sleepHygieneService.getDashboard(userId);
      return reply.send({ data: dashboard });
    } catch (error: any) {
      log.error({ error: error.message, userId }, 'Failed to get sleep hygiene dashboard');
      return reply.status(500).send({
        error: {
          code: 'SLEEP_HYGIENE_ERROR',
          message: 'Failed to get sleep hygiene dashboard',
          statusCode: 500,
        },
      });
    }
  });

  /**
   * GET /api/sleep-hygiene/preferences
   * Get sleep hygiene preferences
   */
  app.get('/sleep-hygiene/preferences', { preHandler: authenticate }, async (request, reply) => {
    const userId = request.user!.userId;

    try {
      const preferences = await sleepHygieneService.getOrCreatePreferences(userId);
      return reply.send({ data: preferences });
    } catch (error: any) {
      log.error({ error: error.message, userId }, 'Failed to get sleep hygiene preferences');
      return reply.status(500).send({
        error: {
          code: 'PREFERENCES_ERROR',
          message: 'Failed to get preferences',
          statusCode: 500,
        },
      });
    }
  });

  /**
   * PATCH /api/sleep-hygiene/preferences
   * Update sleep hygiene preferences
   */
  app.patch('/sleep-hygiene/preferences', { preHandler: authenticate }, async (request, reply) => {
    const userId = request.user!.userId;

    let data;
    try {
      data = sleepHygienePreferencesSchema.parse(request.body);
    } catch (error: any) {
      return reply.status(400).send({
        error: {
          code: 'VALIDATION',
          message: 'Invalid preferences data',
          details: error.errors,
          statusCode: 400,
        },
      });
    }

    try {
      const preferences = await sleepHygieneService.updatePreferences(userId, data);
      return reply.send({ data: preferences });
    } catch (error: any) {
      log.error({ error: error.message, userId }, 'Failed to update sleep hygiene preferences');
      return reply.status(500).send({
        error: {
          code: 'PREFERENCES_ERROR',
          message: 'Failed to update preferences',
          statusCode: 500,
        },
      });
    }
  });

  /**
   * POST /api/sleep-hygiene/enable
   * Enable sleep hygiene feature
   */
  app.post('/sleep-hygiene/enable', { preHandler: authenticate }, async (request, reply) => {
    const userId = request.user!.userId;

    try {
      const preferences = await sleepHygieneService.enableSleepHygiene(userId);
      return reply.send({ data: preferences });
    } catch (error: any) {
      log.error({ error: error.message, userId }, 'Failed to enable sleep hygiene');
      return reply.status(500).send({
        error: {
          code: 'ENABLE_ERROR',
          message: 'Failed to enable sleep hygiene',
          statusCode: 500,
        },
      });
    }
  });

  /**
   * POST /api/sleep-hygiene/disable
   * Disable sleep hygiene feature
   */
  app.post('/sleep-hygiene/disable', { preHandler: authenticate }, async (request, reply) => {
    const userId = request.user!.userId;

    try {
      const preferences = await sleepHygieneService.disableSleepHygiene(userId);
      return reply.send({ data: preferences });
    } catch (error: any) {
      log.error({ error: error.message, userId }, 'Failed to disable sleep hygiene');
      return reply.status(500).send({
        error: {
          code: 'DISABLE_ERROR',
          message: 'Failed to disable sleep hygiene',
          statusCode: 500,
        },
      });
    }
  });

  // ============================================
  // SLEEP HYGIENE TIPS ENDPOINTS
  // ============================================

  /**
   * GET /api/sleep-hygiene/tips
   * Get sleep hygiene tips for user
   */
  app.get('/sleep-hygiene/tips', { preHandler: authenticate }, async (request, reply) => {
    const userId = request.user!.userId;
    const query = request.query as { category?: string; limit?: string };

    try {
      const tips = await sleepHygieneService.getTipsForUser(userId, {
        category: query.category as SleepHygieneTipCategory | undefined,
        limit: query.limit ? parseInt(query.limit) : undefined,
      });
      return reply.send({ data: tips });
    } catch (error: any) {
      log.error({ error: error.message, userId }, 'Failed to get sleep hygiene tips');
      return reply.status(500).send({
        error: {
          code: 'TIPS_ERROR',
          message: 'Failed to get tips',
          statusCode: 500,
        },
      });
    }
  });

  /**
   * GET /api/sleep-hygiene/tips/bookmarked
   * Get bookmarked tips
   */
  app.get('/sleep-hygiene/tips/bookmarked', { preHandler: authenticate }, async (request, reply) => {
    const userId = request.user!.userId;

    try {
      const tips = await sleepHygieneService.getBookmarkedTips(userId);
      return reply.send({ data: tips });
    } catch (error: any) {
      log.error({ error: error.message, userId }, 'Failed to get bookmarked tips');
      return reply.status(500).send({
        error: {
          code: 'TIPS_ERROR',
          message: 'Failed to get bookmarked tips',
          statusCode: 500,
        },
      });
    }
  });

  /**
   * POST /api/sleep-hygiene/tips/:tipId/bookmark
   * Bookmark a tip
   */
  app.post('/sleep-hygiene/tips/:tipId/bookmark', { preHandler: authenticate }, async (request, reply) => {
    const userId = request.user!.userId;
    const { tipId } = request.params as { tipId: string };

    try {
      await sleepHygieneService.bookmarkTip(userId, tipId);
      return reply.status(204).send();
    } catch (error: any) {
      log.error({ error: error.message, userId, tipId }, 'Failed to bookmark tip');
      return reply.status(500).send({
        error: {
          code: 'BOOKMARK_ERROR',
          message: 'Failed to bookmark tip',
          statusCode: 500,
        },
      });
    }
  });

  /**
   * DELETE /api/sleep-hygiene/tips/:tipId/bookmark
   * Remove bookmark from tip
   */
  app.delete('/sleep-hygiene/tips/:tipId/bookmark', { preHandler: authenticate }, async (request, reply) => {
    const userId = request.user!.userId;
    const { tipId } = request.params as { tipId: string };

    try {
      await sleepHygieneService.unbookmarkTip(userId, tipId);
      return reply.status(204).send();
    } catch (error: any) {
      log.error({ error: error.message, userId, tipId }, 'Failed to unbookmark tip');
      return reply.status(500).send({
        error: {
          code: 'BOOKMARK_ERROR',
          message: 'Failed to unbookmark tip',
          statusCode: 500,
        },
      });
    }
  });

  /**
   * POST /api/sleep-hygiene/tips/:tipId/follow
   * Start following a tip
   */
  app.post('/sleep-hygiene/tips/:tipId/follow', { preHandler: authenticate }, async (request, reply) => {
    const userId = request.user!.userId;
    const { tipId } = request.params as { tipId: string };

    try {
      await sleepHygieneService.followTip(userId, tipId);
      return reply.status(204).send();
    } catch (error: any) {
      log.error({ error: error.message, userId, tipId }, 'Failed to follow tip');
      return reply.status(500).send({
        error: {
          code: 'FOLLOW_ERROR',
          message: 'Failed to follow tip',
          statusCode: 500,
        },
      });
    }
  });

  /**
   * DELETE /api/sleep-hygiene/tips/:tipId/follow
   * Stop following a tip
   */
  app.delete('/sleep-hygiene/tips/:tipId/follow', { preHandler: authenticate }, async (request, reply) => {
    const userId = request.user!.userId;
    const { tipId } = request.params as { tipId: string };

    try {
      await sleepHygieneService.unfollowTip(userId, tipId);
      return reply.status(204).send();
    } catch (error: any) {
      log.error({ error: error.message, userId, tipId }, 'Failed to unfollow tip');
      return reply.status(500).send({
        error: {
          code: 'FOLLOW_ERROR',
          message: 'Failed to unfollow tip',
          statusCode: 500,
        },
      });
    }
  });

  /**
   * POST /api/sleep-hygiene/tips/:tipId/helpful
   * Mark tip as helpful/not helpful
   */
  app.post('/sleep-hygiene/tips/:tipId/helpful', { preHandler: authenticate }, async (request, reply) => {
    const userId = request.user!.userId;
    const { tipId } = request.params as { tipId: string };
    const { helpful } = request.body as { helpful: boolean };

    try {
      await sleepHygieneService.markTipHelpful(userId, tipId, helpful);
      return reply.status(204).send();
    } catch (error: any) {
      log.error({ error: error.message, userId, tipId }, 'Failed to mark tip helpful');
      return reply.status(500).send({
        error: {
          code: 'HELPFUL_ERROR',
          message: 'Failed to mark tip',
          statusCode: 500,
        },
      });
    }
  });

  /**
   * POST /api/sleep-hygiene/tips/:tipId/dismiss
   * Dismiss a tip
   */
  app.post('/sleep-hygiene/tips/:tipId/dismiss', { preHandler: authenticate }, async (request, reply) => {
    const userId = request.user!.userId;
    const { tipId } = request.params as { tipId: string };

    try {
      await sleepHygieneService.dismissTip(userId, tipId);
      return reply.status(204).send();
    } catch (error: any) {
      log.error({ error: error.message, userId, tipId }, 'Failed to dismiss tip');
      return reply.status(500).send({
        error: {
          code: 'DISMISS_ERROR',
          message: 'Failed to dismiss tip',
          statusCode: 500,
        },
      });
    }
  });

  // ============================================
  // SLEEP HYGIENE ASSESSMENT ENDPOINTS
  // ============================================

  /**
   * GET /api/sleep-hygiene/assessments
   * Get assessment history
   */
  app.get('/sleep-hygiene/assessments', { preHandler: authenticate }, async (request, reply) => {
    const userId = request.user!.userId;
    const query = request.query as { limit?: string };

    try {
      const assessments = await sleepHygieneService.getAssessmentHistory(
        userId,
        query.limit ? parseInt(query.limit) : undefined
      );
      return reply.send({ data: assessments });
    } catch (error: any) {
      log.error({ error: error.message, userId }, 'Failed to get assessments');
      return reply.status(500).send({
        error: {
          code: 'ASSESSMENT_ERROR',
          message: 'Failed to get assessments',
          statusCode: 500,
        },
      });
    }
  });

  /**
   * GET /api/sleep-hygiene/assessments/today
   * Get today's assessment
   */
  app.get('/sleep-hygiene/assessments/today', { preHandler: authenticate }, async (request, reply) => {
    const userId = request.user!.userId;

    try {
      const assessment = await sleepHygieneService.getTodayAssessment(userId);
      if (!assessment) {
        return reply.status(404).send({
          error: {
            code: 'NOT_FOUND',
            message: 'No assessment for today',
            statusCode: 404,
          },
        });
      }
      return reply.send({ data: assessment });
    } catch (error: any) {
      log.error({ error: error.message, userId }, 'Failed to get today assessment');
      return reply.status(500).send({
        error: {
          code: 'ASSESSMENT_ERROR',
          message: 'Failed to get assessment',
          statusCode: 500,
        },
      });
    }
  });

  /**
   * POST /api/sleep-hygiene/assessments
   * Create or update sleep hygiene assessment
   */
  app.post('/sleep-hygiene/assessments', { preHandler: authenticate }, async (request, reply) => {
    const userId = request.user!.userId;

    let data;
    try {
      data = sleepHygieneAssessmentSchema.parse(request.body);
    } catch (error: any) {
      return reply.status(400).send({
        error: {
          code: 'VALIDATION',
          message: 'Invalid assessment data',
          details: error.errors,
          statusCode: 400,
        },
      });
    }

    try {
      const result = await sleepHygieneService.upsertAssessment(userId, data);
      log.info({ userId, creditsAwarded: result.creditsAwarded }, 'Sleep hygiene assessment created');
      return reply.status(201).send({
        data: result.assessment,
        meta: {
          creditsAwarded: result.creditsAwarded,
        },
      });
    } catch (error: any) {
      log.error({ error: error.message, userId }, 'Failed to create assessment');
      return reply.status(500).send({
        error: {
          code: 'ASSESSMENT_ERROR',
          message: 'Failed to create assessment',
          statusCode: 500,
        },
      });
    }
  });

  /**
   * PATCH /api/sleep-hygiene/assessments/:date
   * Update assessment for a specific date
   */
  app.patch('/sleep-hygiene/assessments/:date', { preHandler: authenticate }, async (request, reply) => {
    const userId = request.user!.userId;
    const { date } = request.params as { date: string };

    let data;
    try {
      data = sleepHygieneAssessmentSchema.parse(request.body);
    } catch (error: any) {
      return reply.status(400).send({
        error: {
          code: 'VALIDATION',
          message: 'Invalid assessment data',
          details: error.errors,
          statusCode: 400,
        },
      });
    }

    try {
      const assessment = await sleepHygieneService.updateAssessment(userId, date, data);
      if (!assessment) {
        return reply.status(404).send({
          error: {
            code: 'NOT_FOUND',
            message: 'Assessment not found',
            statusCode: 404,
          },
        });
      }
      return reply.send({ data: assessment });
    } catch (error: any) {
      log.error({ error: error.message, userId, date }, 'Failed to update assessment');
      return reply.status(500).send({
        error: {
          code: 'ASSESSMENT_ERROR',
          message: 'Failed to update assessment',
          statusCode: 500,
        },
      });
    }
  });

  // ============================================
  // SLEEP HYGIENE STREAKS ENDPOINTS
  // ============================================

  /**
   * GET /api/sleep-hygiene/streaks
   * Get all streaks for user
   */
  app.get('/sleep-hygiene/streaks', { preHandler: authenticate }, async (request, reply) => {
    const userId = request.user!.userId;

    try {
      const streaks = await sleepHygieneService.getStreaks(userId);
      return reply.send({ data: streaks });
    } catch (error: any) {
      log.error({ error: error.message, userId }, 'Failed to get streaks');
      return reply.status(500).send({
        error: {
          code: 'STREAKS_ERROR',
          message: 'Failed to get streaks',
          statusCode: 500,
        },
      });
    }
  });

  // ============================================
  // SLEEP HYGIENE CREDIT ENDPOINTS
  // ============================================

  /**
   * GET /api/sleep-hygiene/credits
   * Get credit awards history
   */
  app.get('/sleep-hygiene/credits', { preHandler: authenticate }, async (request, reply) => {
    const userId = request.user!.userId;
    const query = request.query as { limit?: string; startDate?: string; endDate?: string };

    try {
      const awards = await sleepHygieneService.getCreditAwards(userId, {
        limit: query.limit ? parseInt(query.limit) : undefined,
        startDate: query.startDate,
        endDate: query.endDate,
      });
      return reply.send({ data: awards });
    } catch (error: any) {
      log.error({ error: error.message, userId }, 'Failed to get credit awards');
      return reply.status(500).send({
        error: {
          code: 'CREDITS_ERROR',
          message: 'Failed to get credit awards',
          statusCode: 500,
        },
      });
    }
  });

  /**
   * GET /api/sleep-hygiene/credits/total
   * Get total credits earned from sleep hygiene
   */
  app.get('/sleep-hygiene/credits/total', { preHandler: authenticate }, async (request, reply) => {
    const userId = request.user!.userId;

    try {
      const [total, today] = await Promise.all([
        sleepHygieneService.getTotalCreditsEarned(userId),
        sleepHygieneService.getTodayCreditsEarned(userId),
      ]);
      return reply.send({
        data: {
          total,
          today,
        },
      });
    } catch (error: any) {
      log.error({ error: error.message, userId }, 'Failed to get credit totals');
      return reply.status(500).send({
        error: {
          code: 'CREDITS_ERROR',
          message: 'Failed to get credit totals',
          statusCode: 500,
        },
      });
    }
  });
}
