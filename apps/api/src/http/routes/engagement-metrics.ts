/**
 * Engagement Metrics Routes
 *
 * Admin endpoints for engagement analytics and metrics.
 */

import { FastifyPluginAsync } from 'fastify';
import { engagementMetricsService } from '../../modules/engagement/engagement-metrics.service';
import { notificationTriggersService } from '../../modules/engagement/notification-triggers.service';

const engagementMetricsRoutes: FastifyPluginAsync = async (fastify) => {
  // All routes require authentication
  fastify.addHook('preHandler', async (request, reply) => {
    try {
      await (request as any).jwtVerify();
    } catch (_err) {
      return reply.status(401).send({ error: 'Unauthorized' });
    }
  });

  /**
   * GET /api/engagement/metrics/dashboard
   * Get dashboard summary metrics
   */
  fastify.get('/metrics/dashboard', async (request, reply) => {
    try {
      const summary = await engagementMetricsService.getDashboardSummary();
      return summary;
    } catch (error) {
      fastify.log.error({ error }, 'Failed to get dashboard metrics');
      return reply.status(500).send({ error: 'Failed to load metrics' });
    }
  });

  /**
   * GET /api/engagement/metrics/streaks
   * Get streak statistics
   */
  fastify.get<{
    Querystring: { type?: string };
  }>('/metrics/streaks', async (request, reply) => {
    try {
      const { type } = request.query;
      const stats = await engagementMetricsService.getStreakStats(type);
      return { stats };
    } catch (error) {
      fastify.log.error({ error }, 'Failed to get streak stats');
      return reply.status(500).send({ error: 'Failed to load streak stats' });
    }
  });

  /**
   * GET /api/engagement/metrics/challenges
   * Get challenge statistics
   */
  fastify.get<{
    Querystring: { days?: string };
  }>('/metrics/challenges', async (request, reply) => {
    try {
      const days = parseInt(request.query.days || '7', 10);
      const stats = await engagementMetricsService.getChallengeStats(days);
      return stats;
    } catch (error) {
      fastify.log.error({ error }, 'Failed to get challenge stats');
      return reply.status(500).send({ error: 'Failed to load challenge stats' });
    }
  });

  /**
   * GET /api/engagement/metrics/daily
   * Get daily metrics for a specific date
   */
  fastify.get<{
    Querystring: { date?: string };
  }>('/metrics/daily', async (request, reply) => {
    try {
      const date = request.query.date ? new Date(request.query.date) : new Date();
      const metrics = await engagementMetricsService.getDailyMetrics(date);
      return metrics;
    } catch (error) {
      fastify.log.error({ error }, 'Failed to get daily metrics');
      return reply.status(500).send({ error: 'Failed to load daily metrics' });
    }
  });

  /**
   * GET /api/engagement/metrics/retention
   * Get retention metrics for a cohort
   */
  fastify.get<{
    Querystring: { cohortDate?: string };
  }>('/metrics/retention', async (request, reply) => {
    try {
      // Default to 30 days ago
      const defaultDate = new Date();
      defaultDate.setDate(defaultDate.getDate() - 30);

      const cohortDate = request.query.cohortDate
        ? new Date(request.query.cohortDate)
        : defaultDate;

      const metrics = await engagementMetricsService.getRetentionMetrics(cohortDate);
      return { cohortDate: cohortDate.toISOString().split('T')[0], ...metrics };
    } catch (error) {
      fastify.log.error({ error }, 'Failed to get retention metrics');
      return reply.status(500).send({ error: 'Failed to load retention metrics' });
    }
  });

  /**
   * GET /api/engagement/metrics/notifications
   * Get notification effectiveness metrics
   */
  fastify.get<{
    Querystring: { days?: string };
  }>('/metrics/notifications', async (request, reply) => {
    try {
      const days = parseInt(request.query.days || '30', 10);
      const stats = await engagementMetricsService.getNotificationEffectiveness(days);
      return { notifications: stats };
    } catch (error) {
      fastify.log.error({ error }, 'Failed to get notification stats');
      return reply.status(500).send({ error: 'Failed to load notification stats' });
    }
  });

  /**
   * GET /api/engagement/metrics/user/:userId
   * Get engagement score for a specific user
   */
  fastify.get<{
    Params: { userId: string };
  }>('/metrics/user/:userId', async (request, reply) => {
    try {
      const { userId } = request.params;
      const score = await engagementMetricsService.getUserEngagementScore(userId);

      if (!score) {
        return reply.status(404).send({ error: 'User not found' });
      }

      return score;
    } catch (error) {
      fastify.log.error({ error }, 'Failed to get user engagement score');
      return reply.status(500).send({ error: 'Failed to load user score' });
    }
  });

  /**
   * GET /api/engagement/metrics/my-score
   * Get engagement score for current user
   */
  fastify.get('/metrics/my-score', async (request, reply) => {
    try {
      const userId = (request as any).user?.userId;
      if (!userId) {
        return reply.status(401).send({ error: 'Not authenticated' });
      }

      const score = await engagementMetricsService.getUserEngagementScore(userId);

      if (!score) {
        return reply.status(404).send({ error: 'User not found' });
      }

      return score;
    } catch (error) {
      fastify.log.error({ error }, 'Failed to get engagement score');
      return reply.status(500).send({ error: 'Failed to load score' });
    }
  });

  /**
   * POST /api/engagement/triggers/run
   * Run notification triggers (for cron job or manual trigger)
   * Admin only
   */
  fastify.post('/triggers/run', async (request, reply) => {
    try {
      const userId = (request as any).user?.userId;

      // Verify admin (basic check - should be enhanced)
      // In production, check user role
      if (!userId) {
        return reply.status(401).send({ error: 'Not authenticated' });
      }

      const results = await notificationTriggersService.runAllTriggers();

      return {
        success: true,
        results,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      fastify.log.error({ error }, 'Failed to run triggers');
      return reply.status(500).send({ error: 'Failed to run triggers' });
    }
  });

  /**
   * POST /api/engagement/triggers/streak-at-risk
   * Run streak-at-risk notifications specifically
   */
  fastify.post('/triggers/streak-at-risk', async (request, reply) => {
    try {
      const scheduled = await notificationTriggersService.scheduleStreakAtRiskNotifications();
      return { success: true, scheduled };
    } catch (error) {
      fastify.log.error({ error }, 'Failed to run streak-at-risk triggers');
      return reply.status(500).send({ error: 'Failed to run triggers' });
    }
  });

  /**
   * POST /api/engagement/triggers/challenge-expiring
   * Run challenge-expiring notifications specifically
   */
  fastify.post('/triggers/challenge-expiring', async (request, reply) => {
    try {
      const scheduled = await notificationTriggersService.scheduleChallengeExpiringNotifications();
      return { success: true, scheduled };
    } catch (error) {
      fastify.log.error({ error }, 'Failed to run challenge-expiring triggers');
      return reply.status(500).send({ error: 'Failed to run triggers' });
    }
  });

  /**
   * POST /api/engagement/triggers/process
   * Process pending notifications
   */
  fastify.post('/triggers/process', async (request, reply) => {
    try {
      const processed = await notificationTriggersService.processPendingNotifications();
      return { success: true, processed };
    } catch (error) {
      fastify.log.error({ error }, 'Failed to process notifications');
      return reply.status(500).send({ error: 'Failed to process notifications' });
    }
  });
};

export default engagementMetricsRoutes;
