/**
 * Engagement Summary Routes
 *
 * Provides unified engagement dashboard data and admin tools.
 */

import { FastifyInstance } from 'fastify';
import { authenticate } from './auth';
import { engagementSummaryService } from '../../modules/engagement';
import { loggers } from '../../lib/logger';

const log = loggers.http;

export async function registerEngagementSummaryRoutes(app: FastifyInstance): Promise<void> {
  /**
   * GET /engagement/summary
   *
   * Get comprehensive engagement summary for dashboard.
   * Includes daily login, streaks, challenges, events, and recovery.
   */
  app.get('/engagement/summary', { preHandler: authenticate }, async (request, reply) => {
    try {
      const userId = request.user!.userId;
      const summary = await engagementSummaryService.getSummary(userId);

      return reply.send({
        data: summary,
      });
    } catch (error) {
      log.error({ error, userId: request.user?.userId }, 'Failed to get engagement summary');
      return reply.status(500).send({
        error: { code: 'INTERNAL_ERROR', message: 'Failed to get engagement summary', statusCode: 500 },
      });
    }
  });

  /**
   * GET /engagement/stats
   *
   * Get engagement statistics for admin dashboard.
   * Requires admin role.
   */
  app.get('/engagement/stats', { preHandler: authenticate }, async (request, reply) => {
    try {
      const userRoles = request.user?.roles || [];
      if (!userRoles.includes('admin') && !userRoles.includes('owner')) {
        return reply.status(403).send({
          error: { code: 'FORBIDDEN', message: 'Admin access required', statusCode: 403 },
        });
      }

      const stats = await engagementSummaryService.getEngagementStats();

      return reply.send({
        data: stats,
      });
    } catch (error) {
      log.error({ error }, 'Failed to get engagement stats');
      return reply.status(500).send({
        error: { code: 'INTERNAL_ERROR', message: 'Failed to get engagement stats', statusCode: 500 },
      });
    }
  });

  /**
   * POST /engagement/seed-events
   *
   * Seed sample engagement events for testing.
   * Requires admin role.
   */
  app.post('/engagement/seed-events', { preHandler: authenticate }, async (request, reply) => {
    try {
      const userRoles = request.user?.roles || [];
      if (!userRoles.includes('admin') && !userRoles.includes('owner')) {
        return reply.status(403).send({
          error: { code: 'FORBIDDEN', message: 'Admin access required', statusCode: 403 },
        });
      }

      const created = await engagementSummaryService.seedSampleEvents();

      return reply.send({
        data: {
          message: `Created ${created} sample engagement events`,
          eventsCreated: created,
        },
      });
    } catch (error) {
      log.error({ error }, 'Failed to seed engagement events');
      return reply.status(500).send({
        error: { code: 'INTERNAL_ERROR', message: 'Failed to seed engagement events', statusCode: 500 },
      });
    }
  });
}

export default registerEngagementSummaryRoutes;
