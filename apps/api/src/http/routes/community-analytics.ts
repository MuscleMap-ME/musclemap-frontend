/**
 * Community Analytics Routes
 *
 * Endpoints for community health and engagement metrics
 */

import { FastifyPluginAsync } from 'fastify';
import { communityAnalyticsService } from '../../modules/community-analytics';
import { authenticate } from './auth';
import { loggers } from '../../lib/logger';

const log = loggers.http.child({ module: 'community-analytics-routes' });

const communityAnalyticsRoutes: FastifyPluginAsync = async (fastify) => {
  // All routes require authentication
  fastify.addHook('preHandler', authenticate);

  // ===========================================
  // DAILY ANALYTICS
  // ===========================================

  fastify.get<{ Params: { communityId: string } }>(
    '/communities/:communityId/analytics/daily',
    async (request, _reply) => {
      const { communityId } = request.params;
      const { startDate, endDate, limit = '30' } = request.query as any;

      const analytics = await communityAnalyticsService.getDailyAnalytics(parseInt(communityId), {
        startDate: startDate ? new Date(startDate) : undefined,
        endDate: endDate ? new Date(endDate) : undefined,
        limit: parseInt(limit),
      });
      return { success: true, data: analytics };
    }
  );

  fastify.post<{ Params: { communityId: string } }>(
    '/communities/:communityId/analytics/refresh',
    async (request, _reply) => {
      const { communityId } = request.params;

      const analytics = await communityAnalyticsService.recordDailyAnalytics(parseInt(communityId));
      return { success: true, data: analytics };
    }
  );

  // ===========================================
  // HEALTH SCORES
  // ===========================================

  fastify.get<{ Params: { communityId: string } }>(
    '/communities/:communityId/health',
    async (request, _reply) => {
      const { communityId } = request.params;

      let healthScore = await communityAnalyticsService.getLatestHealthScore(parseInt(communityId));

      // Calculate if no recent score exists
      if (!healthScore) {
        healthScore = await communityAnalyticsService.calculateHealthScore(parseInt(communityId));
      }

      return { success: true, data: healthScore };
    }
  );

  fastify.post<{ Params: { communityId: string } }>(
    '/communities/:communityId/health/calculate',
    async (request, _reply) => {
      const { communityId } = request.params;

      const healthScore = await communityAnalyticsService.calculateHealthScore(parseInt(communityId));
      return { success: true, data: healthScore };
    }
  );

  fastify.get<{ Params: { communityId: string } }>(
    '/communities/:communityId/health/history',
    async (request, _reply) => {
      const { communityId } = request.params;
      const { limit = '30' } = request.query as any;

      const history = await communityAnalyticsService.getHealthScoreHistory(parseInt(communityId), {
        limit: parseInt(limit),
      });
      return { success: true, data: history };
    }
  );

  // ===========================================
  // GROWTH & ENGAGEMENT
  // ===========================================

  fastify.get<{ Params: { communityId: string } }>(
    '/communities/:communityId/analytics/growth',
    async (request, _reply) => {
      const { communityId } = request.params;
      const { period = 'daily', limit = '12' } = request.query as any;

      const trends = await communityAnalyticsService.getGrowthTrends(
        parseInt(communityId),
        period as 'daily' | 'weekly' | 'monthly',
        parseInt(limit)
      );
      return { success: true, data: trends };
    }
  );

  fastify.get<{ Params: { communityId: string } }>(
    '/communities/:communityId/analytics/engagement',
    async (request, _reply) => {
      const { communityId } = request.params;
      const { startDate, endDate } = request.query as any;

      const breakdown = await communityAnalyticsService.getEngagementBreakdown(parseInt(communityId), {
        startDate: startDate ? new Date(startDate) : undefined,
        endDate: endDate ? new Date(endDate) : undefined,
      });
      return { success: true, data: breakdown };
    }
  );

  fastify.get<{ Params: { communityId: string } }>(
    '/communities/:communityId/analytics/top-contributors',
    async (request, _reply) => {
      const { communityId } = request.params;
      const { days = '30', limit = '10' } = request.query as any;

      const contributors = await communityAnalyticsService.getTopContributors(parseInt(communityId), {
        days: parseInt(days),
        limit: parseInt(limit),
      });
      return { success: true, data: contributors };
    }
  );

  // ===========================================
  // COMPARISON (Admin)
  // ===========================================

  fastify.post<{ Body: { communityIds: number[] } }>(
    '/analytics/compare',
    async (request, _reply) => {
      const { communityIds } = request.body;

      const comparison = await communityAnalyticsService.compareCommunities(communityIds);
      return { success: true, data: comparison };
    }
  );

  log.info('Community analytics routes registered');
};

export default communityAnalyticsRoutes;
