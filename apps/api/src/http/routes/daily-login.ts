/**
 * Daily Login Routes
 *
 * Endpoints for daily login rewards and streak management:
 * - Claim daily reward
 * - Get login status
 * - Get login calendar
 * - Manage streak freezes
 */

import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { authenticate } from './auth';
import { dailyLoginService, STREAK_FREEZE_COST } from '../../modules/engagement';
import { loggers } from '../../lib/logger';

const log = loggers.http;

export async function registerDailyLoginRoutes(app: FastifyInstance) {
  // Get login status and today's potential reward
  app.get('/daily-login/status', { preHandler: authenticate }, async (request, reply) => {
    const status = await dailyLoginService.getStatus(request.user!.userId);
    return reply.send({ data: status });
  });

  // Claim today's daily reward
  app.post('/daily-login/claim', { preHandler: authenticate }, async (request, reply) => {
    const body = request.body as { useFreeze?: boolean } | undefined;
    const useFreeze = body?.useFreeze || false;

    try {
      const result = await dailyLoginService.claimReward(request.user!.userId, useFreeze);
      return reply.send({
        data: result,
        message: result.isMilestone
          ? `Milestone reached! Day ${result.newStreak} - You earned ${result.credits} credits!`
          : `Day ${result.newStreak} - You earned ${result.credits} credits!`,
      });
    } catch (error: any) {
      if (error.message?.includes('already claimed')) {
        return reply.status(409).send({ error: 'Daily reward already claimed today' });
      }
      throw error;
    }
  });

  // Get login calendar (last N days)
  app.get('/daily-login/calendar', { preHandler: authenticate }, async (request, reply) => {
    const query = request.query as { days?: string };
    const days = Math.min(90, Math.max(7, parseInt(query.days || '30', 10)));

    const calendar = await dailyLoginService.getCalendar(request.user!.userId, days);
    return reply.send({ data: calendar });
  });

  // Use a streak freeze
  app.post('/daily-login/use-freeze', { preHandler: authenticate }, async (request, reply) => {
    try {
      const result = await dailyLoginService.useStreakFreeze(request.user!.userId);
      return reply.send({
        data: result,
        message: `Streak freeze used! ${result.freezesRemaining} remaining.`,
      });
    } catch (error: any) {
      if (error.message?.includes('No streak freezes')) {
        return reply.status(400).send({ error: 'No streak freezes available' });
      }
      throw error;
    }
  });

  // Purchase a streak freeze
  app.post('/daily-login/purchase-freeze', { preHandler: authenticate }, async (request, reply) => {
    try {
      const result = await dailyLoginService.purchaseStreakFreeze(request.user!.userId);
      return reply.send({
        data: result,
        message: `Streak freeze purchased for ${STREAK_FREEZE_COST} credits! You now have ${result.freezesOwned}.`,
      });
    } catch (error: any) {
      if (error.message?.includes('Insufficient')) {
        return reply.status(400).send({
          error: 'Insufficient credits',
          required: STREAK_FREEZE_COST,
        });
      }
      throw error;
    }
  });

  // Get reward schedule preview
  app.get('/daily-login/rewards', async (request, reply) => {
    const schedule = dailyLoginService.getRewardSchedule();
    return reply.send({
      data: {
        schedule,
        streakFreezeCost: STREAK_FREEZE_COST,
      },
    });
  });

  log.info('Daily login routes registered');
}
