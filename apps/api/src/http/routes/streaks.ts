/**
 * Streaks Routes
 *
 * Endpoints for streak tracking and milestones:
 * - Get all streaks
 * - Get specific streak
 * - Record activity
 * - Claim milestones
 * - Leaderboards
 */

import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { authenticate } from './auth';
import { streaksService, StreakType } from '../../modules/engagement';
import { loggers } from '../../lib/logger';

const log = loggers.http;

const validStreakTypes: StreakType[] = ['workout', 'nutrition', 'sleep', 'social', 'login'];

const _recordActivitySchema = z.object({
  streakType: z.enum(['workout', 'nutrition', 'sleep', 'social'] as const),
});

const claimMilestoneSchema = z.object({
  milestoneDays: z.number().int().positive(),
});

export async function registerStreakRoutes(app: FastifyInstance) {
  // Get all streaks for user
  app.get('/streaks', { preHandler: authenticate }, async (request, reply) => {
    const streaks = await streaksService.getAllStreaks(request.user!.userId);
    return reply.send({ data: streaks });
  });

  // Get specific streak type
  app.get('/streaks/:type', { preHandler: authenticate }, async (request, reply) => {
    const { type } = request.params as { type: string };

    if (!validStreakTypes.includes(type as StreakType)) {
      return reply.status(400).send({
        error: 'Invalid streak type',
        validTypes: validStreakTypes,
      });
    }

    const streak = await streaksService.getStreak(request.user!.userId, type as StreakType);
    return reply.send({ data: streak });
  });

  // Record activity for a streak
  app.post('/streaks/:type/record', { preHandler: authenticate }, async (request, reply) => {
    const { type } = request.params as { type: string };

    if (!['workout', 'nutrition', 'sleep', 'social'].includes(type)) {
      return reply.status(400).send({
        error: 'Invalid streak type',
        validTypes: ['workout', 'nutrition', 'sleep', 'social'],
      });
    }

    const result = await streaksService.recordActivity(request.user!.userId, type as StreakType);

    return reply.send({
      data: result,
      message: result.isNewRecord
        ? `New record! ${result.newStreak}-day ${type} streak!`
        : `${type} streak: ${result.newStreak} days`,
    });
  });

  // Claim a milestone reward
  app.post('/streaks/:type/claim', { preHandler: authenticate }, async (request, reply) => {
    const { type } = request.params as { type: string };

    if (!validStreakTypes.includes(type as StreakType)) {
      return reply.status(400).send({
        error: 'Invalid streak type',
        validTypes: validStreakTypes,
      });
    }

    const parsed = claimMilestoneSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({
        error: 'Invalid request body',
        details: parsed.error.errors,
      });
    }

    try {
      const result = await streaksService.claimMilestone(
        request.user!.userId,
        type as StreakType,
        parsed.data.milestoneDays
      );

      return reply.send({
        data: result,
        message: `Milestone claimed! ${result.credits} credits + ${result.xp} XP`,
      });
    } catch (error: any) {
      if (error.message?.includes('already claimed')) {
        return reply.status(409).send({ error: 'Milestone already claimed' });
      }
      if (error.message?.includes('not long enough')) {
        return reply.status(400).send({ error: error.message });
      }
      throw error;
    }
  });

  // Get streak leaderboard
  app.get('/streaks/:type/leaderboard', async (request, reply) => {
    const { type } = request.params as { type: string };
    const query = request.query as { limit?: string };
    const limit = Math.min(100, Math.max(10, parseInt(query.limit || '50', 10)));

    if (!validStreakTypes.includes(type as StreakType)) {
      return reply.status(400).send({
        error: 'Invalid streak type',
        validTypes: validStreakTypes,
      });
    }

    const leaderboard = await streaksService.getLeaderboard(type as StreakType, limit);
    return reply.send({ data: leaderboard });
  });

  // Get milestone definitions
  app.get('/streaks/:type/milestones', async (request, reply) => {
    const { type } = request.params as { type: string };

    if (!validStreakTypes.includes(type as StreakType)) {
      return reply.status(400).send({
        error: 'Invalid streak type',
        validTypes: validStreakTypes,
      });
    }

    const milestones = streaksService.getMilestoneDefinitions(type as StreakType);
    return reply.send({ data: milestones });
  });

  log.info('Streak routes registered');
}
