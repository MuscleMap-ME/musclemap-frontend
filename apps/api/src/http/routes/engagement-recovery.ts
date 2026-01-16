/**
 * Engagement Recovery Routes
 *
 * Endpoints for engagement-specific recovery features:
 * - Muscle recovery tracking
 * - Rest day activities
 * - Recovery score (engagement version)
 */

import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { authenticate } from './auth';
import { recoveryService } from '../../modules/engagement';
import { loggers } from '../../lib/logger';

const log = loggers.http;

const logActivitySchema = z.object({
  activityType: z.string().min(1),
  metadata: z.record(z.unknown()).optional(),
});

export async function registerEngagementRecoveryRoutes(app: FastifyInstance) {
  // Get today's muscle-based recovery score
  app.get('/engagement/recovery/today', { preHandler: authenticate }, async (request, reply) => {
    const score = await recoveryService.getRecoveryScore(request.user!.userId);
    return reply.send({ data: score });
  });

  // Get detailed muscle recovery
  app.get('/engagement/recovery/muscles', { preHandler: authenticate }, async (request, reply) => {
    const muscles = await recoveryService.getMuscleRecoveryDetails(request.user!.userId);
    return reply.send({ data: muscles });
  });

  // Log a rest day activity
  app.post('/engagement/recovery/log-activity', { preHandler: authenticate }, async (request, reply) => {
    const parsed = logActivitySchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({
        error: 'Invalid request body',
        details: parsed.error.errors,
      });
    }

    try {
      const result = await recoveryService.logRestDayActivity(
        request.user!.userId,
        parsed.data.activityType,
        parsed.data.metadata
      );

      return reply.send({
        data: result,
        message: `+${result.credits} credits! (${result.dailyCount}/${result.dailyLimit} today)`,
      });
    } catch (error: any) {
      if (error.message?.includes('Invalid activity type')) {
        return reply.status(400).send({ error: error.message });
      }
      if (error.message?.includes('Daily limit')) {
        return reply.status(400).send({ error: error.message });
      }
      throw error;
    }
  });

  // Get today's rest day activity summary
  app.get('/engagement/recovery/activities', { preHandler: authenticate }, async (request, reply) => {
    const activities = await recoveryService.getRestDayActivities(request.user!.userId);
    return reply.send({ data: activities });
  });

  // Get available rest day activities
  app.get('/engagement/recovery/activity-types', async (request, reply) => {
    const types = recoveryService.getActivityDefinitions();
    return reply.send({ data: types });
  });

  // Get recovery score history
  app.get('/engagement/recovery/history', { preHandler: authenticate }, async (request, reply) => {
    const query = request.query as { days?: string };
    const days = Math.min(90, Math.max(7, parseInt(query.days || '14', 10)));

    const history = await recoveryService.getRecoveryHistory(request.user!.userId, days);
    return reply.send({ data: history });
  });

  log.info('Engagement recovery routes registered');
}
