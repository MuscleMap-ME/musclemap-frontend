/**
 * Challenges Routes
 *
 * Endpoints for daily and weekly challenges:
 * - Get daily challenges
 * - Claim challenge rewards
 * - Get weekly challenge
 * - Challenge history
 */

import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { authenticate } from './auth';
import { challengesService, CHALLENGE_TYPES as _CHALLENGE_TYPES } from '../../modules/engagement';
import { loggers } from '../../lib/logger';

const log = loggers.http;

const updateProgressSchema = z.object({
  trackingKey: z.string().min(1),
  increment: z.number().int().positive().default(1),
});

export async function registerChallengeRoutes(app: FastifyInstance) {
  // Get today's daily challenges
  app.get('/challenges/daily', { preHandler: authenticate }, async (request, reply) => {
    const challenges = await challengesService.getDailyChallenges(request.user!.userId);
    return reply.send({ data: challenges });
  });

  // Claim a daily challenge reward
  app.post('/challenges/daily/claim/:id', { preHandler: authenticate }, async (request, reply) => {
    const { id } = request.params as { id: string };

    try {
      const result = await challengesService.claimChallenge(request.user!.userId, id);
      return reply.send({
        data: result,
        message: `Challenge complete! +${result.credits} credits, +${result.xp} XP`,
      });
    } catch (error: any) {
      if (error.message?.includes('not found')) {
        return reply.status(404).send({ error: 'Challenge not found' });
      }
      if (error.message?.includes('not complete')) {
        return reply.status(400).send({ error: 'Challenge not complete yet' });
      }
      if (error.message?.includes('already claimed')) {
        return reply.status(409).send({ error: 'Challenge already claimed' });
      }
      throw error;
    }
  });

  // Get weekly challenge
  app.get('/challenges/weekly', { preHandler: authenticate }, async (request, reply) => {
    const challenge = await challengesService.getWeeklyChallenge(request.user!.userId);
    return reply.send({ data: challenge });
  });

  // Claim weekly challenge reward
  app.post('/challenges/weekly/claim', { preHandler: authenticate }, async (request, reply) => {
    try {
      const result = await challengesService.claimWeeklyChallenge(request.user!.userId);
      return reply.send({
        data: result,
        message: `Weekly challenge complete! +${result.credits} credits, +${result.xp} XP`,
      });
    } catch (error: any) {
      if (error.message?.includes('not found')) {
        return reply.status(404).send({ error: 'Weekly challenge not found' });
      }
      if (error.message?.includes('not complete')) {
        return reply.status(400).send({ error: 'Challenge not complete yet' });
      }
      if (error.message?.includes('already claimed')) {
        return reply.status(409).send({ error: 'Challenge already claimed' });
      }
      throw error;
    }
  });

  // Update challenge progress (internal use - called by workout/social events)
  app.post('/challenges/progress', { preHandler: authenticate }, async (request, reply) => {
    const parsed = updateProgressSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({
        error: 'Invalid request body',
        details: parsed.error.errors,
      });
    }

    const result = await challengesService.updateProgress(
      request.user!.userId,
      parsed.data.trackingKey,
      parsed.data.increment
    );

    return reply.send({
      data: result,
      message: result.updatedChallenges.some((c) => c.isComplete)
        ? 'Challenge completed!'
        : 'Progress updated',
    });
  });

  // Get challenge history
  app.get('/challenges/history', { preHandler: authenticate }, async (request, reply) => {
    const query = request.query as { limit?: string };
    const limit = Math.min(200, Math.max(10, parseInt(query.limit || '50', 10)));

    const history = await challengesService.getHistory(request.user!.userId, limit);
    return reply.send({ data: history });
  });

  // Get challenge type definitions
  app.get('/challenges/types', async (request, reply) => {
    const types = challengesService.getChallengeTypes();

    // Format for frontend consumption
    const formatted = Object.entries(types).map(([_key, def]) => ({
      id: def.id,
      title: def.title,
      description: def.description,
      icon: def.icon,
      category: def.category,
      targets: def.targets,
      rewards: def.rewards,
      trackingKey: def.trackingKey,
    }));

    return reply.send({ data: formatted });
  });

  log.info('Challenge routes registered');
}
