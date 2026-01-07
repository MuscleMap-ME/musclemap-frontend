/**
 * Monitoring & Testing Routes
 *
 * Admin-only routes for system monitoring, running tests,
 * viewing user journeys, and managing errors.
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { authenticate, requireAdmin } from './auth';
import { monitoringService } from '../../modules/monitoring';
import { loggers } from '../../lib/logger';

const log = loggers.http;

export async function registerMonitoringRoutes(app: FastifyInstance): Promise<void> {
  // ============================================
  // SYSTEM HEALTH
  // ============================================

  /**
   * GET /monitoring/health
   * Get detailed system health status
   */
  app.get('/monitoring/health', {
    preHandler: [authenticate, requireAdmin],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const health = await monitoringService.getSystemHealth();
    return reply.send({ data: health });
  });

  /**
   * GET /monitoring/dashboard
   * Get dashboard statistics
   */
  app.get('/monitoring/dashboard', {
    preHandler: [authenticate, requireAdmin],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const stats = await monitoringService.getDashboardStats();
    return reply.send({ data: stats });
  });

  // ============================================
  // TEST RUNNER
  // ============================================

  /**
   * POST /monitoring/tests/run
   * Run the API test suite against a target URL
   */
  app.post('/monitoring/tests/run', {
    preHandler: [authenticate, requireAdmin],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { targetUrl, authToken, categories, verbose } = request.body as {
      targetUrl?: string;
      authToken?: string;
      categories?: string[];
      verbose?: boolean;
    };

    // Default to production if not specified
    const baseUrl = targetUrl || 'https://musclemap.me';

    log.info({ baseUrl, categories }, 'Starting API test run');

    try {
      const results = await monitoringService.runAPITests({
        baseUrl,
        authToken,
        categories,
        verbose,
      });

      return reply.send({
        data: results,
        summary: {
          total: results.totalTests,
          passed: results.passed,
          failed: results.failed,
          skipped: results.skipped,
          errors: results.errors,
          duration: results.completedAt
            ? results.completedAt.getTime() - results.startedAt.getTime()
            : 0,
        },
      });
    } catch (error: any) {
      log.error({ error }, 'Test run failed');
      return reply.status(500).send({
        error: { code: 'TEST_RUN_FAILED', message: error.message },
      });
    }
  });

  /**
   * GET /monitoring/tests/history
   * Get test run history
   */
  app.get('/monitoring/tests/history', {
    preHandler: [authenticate, requireAdmin],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { limit } = request.query as { limit?: string };
    const history = await monitoringService.getTestHistory(parseInt(limit || '20'));
    return reply.send({ data: history });
  });

  /**
   * GET /monitoring/tests/definitions
   * Get all available test definitions
   */
  app.get('/monitoring/tests/definitions', {
    preHandler: [authenticate, requireAdmin],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const tests = monitoringService.API_TESTS.map((t) => ({
      name: t.name,
      category: t.category,
      requiresAuth: t.requiresAuth || false,
    }));

    const categories = [...new Set(tests.map((t) => t.category))];

    return reply.send({
      data: { tests, categories },
    });
  });

  // ============================================
  // USER JOURNEY TRACKING
  // ============================================

  /**
   * POST /monitoring/journey/start
   * Start tracking a user journey
   */
  app.post('/monitoring/journey/start', async (request: FastifyRequest, reply: FastifyReply) => {
    const { sessionId, userId, metadata } = request.body as {
      sessionId: string;
      userId?: string;
      metadata?: Record<string, unknown>;
    };

    if (!sessionId) {
      return reply.status(400).send({
        error: { code: 'BAD_REQUEST', message: 'sessionId is required' },
      });
    }

    const journey = monitoringService.startJourney(sessionId, userId, metadata);
    return reply.send({ data: { journeyId: journey.id } });
  });

  /**
   * POST /monitoring/journey/step
   * Add a step to a journey
   */
  app.post('/monitoring/journey/step', async (request: FastifyRequest, reply: FastifyReply) => {
    const { sessionId, type, name, path, duration, details } = request.body as {
      sessionId: string;
      type: 'navigation' | 'action' | 'api_call' | 'render' | 'interaction';
      name: string;
      path?: string;
      duration?: number;
      details?: Record<string, unknown>;
    };

    if (!sessionId || !type || !name) {
      return reply.status(400).send({
        error: { code: 'BAD_REQUEST', message: 'sessionId, type, and name are required' },
      });
    }

    const step = monitoringService.addJourneyStep(sessionId, { type, name, path, duration, details });

    if (!step) {
      return reply.status(404).send({
        error: { code: 'NOT_FOUND', message: 'Journey not found. Call /journey/start first.' },
      });
    }

    return reply.send({ data: { stepId: step.id } });
  });

  /**
   * POST /monitoring/journey/error
   * Record an error in a journey
   */
  app.post('/monitoring/journey/error', async (request: FastifyRequest, reply: FastifyReply) => {
    const { sessionId, type, message, stack, componentStack, context } = request.body as {
      sessionId: string;
      type: 'js_error' | 'api_error' | 'render_error' | 'network_error';
      message: string;
      stack?: string;
      componentStack?: string;
      context?: Record<string, unknown>;
    };

    if (!sessionId || !type || !message) {
      return reply.status(400).send({
        error: { code: 'BAD_REQUEST', message: 'sessionId, type, and message are required' },
      });
    }

    const error = monitoringService.addJourneyError(sessionId, {
      type,
      message,
      stack,
      componentStack,
      context,
    });

    if (!error) {
      return reply.status(404).send({
        error: { code: 'NOT_FOUND', message: 'Journey not found. Call /journey/start first.' },
      });
    }

    return reply.send({ data: { errorId: error.id } });
  });

  /**
   * POST /monitoring/journey/end
   * End a journey and persist it
   */
  app.post('/monitoring/journey/end', async (request: FastifyRequest, reply: FastifyReply) => {
    const { sessionId } = request.body as { sessionId: string };

    if (!sessionId) {
      return reply.status(400).send({
        error: { code: 'BAD_REQUEST', message: 'sessionId is required' },
      });
    }

    const journey = await monitoringService.endJourney(sessionId);

    if (!journey) {
      return reply.status(404).send({
        error: { code: 'NOT_FOUND', message: 'Journey not found.' },
      });
    }

    return reply.send({
      data: {
        journeyId: journey.id,
        stepsCount: journey.steps.length,
        errorsCount: journey.errors.length,
        duration: journey.endedAt
          ? journey.endedAt.getTime() - journey.startedAt.getTime()
          : 0,
      },
    });
  });

  /**
   * GET /monitoring/journeys
   * Get journey history (admin only)
   */
  app.get('/monitoring/journeys', {
    preHandler: [authenticate, requireAdmin],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { userId, limit, hasErrors } = request.query as {
      userId?: string;
      limit?: string;
      hasErrors?: string;
    };

    const journeys = await monitoringService.getJourneyHistory({
      userId,
      limit: parseInt(limit || '50'),
      hasErrors: hasErrors === 'true',
    });

    return reply.send({ data: journeys });
  });

  // ============================================
  // ERROR TRACKING
  // ============================================

  /**
   * POST /monitoring/errors/track
   * Track a frontend error
   */
  app.post('/monitoring/errors/track', async (request: FastifyRequest, reply: FastifyReply) => {
    const { type, message, stack, userId, sessionId, path, userAgent, context } = request.body as {
      type: string;
      message: string;
      stack?: string;
      userId?: string;
      sessionId?: string;
      path?: string;
      userAgent?: string;
      context?: Record<string, unknown>;
    };

    if (!type || !message) {
      return reply.status(400).send({
        error: { code: 'BAD_REQUEST', message: 'type and message are required' },
      });
    }

    const error = await monitoringService.trackError({
      type,
      message,
      stack,
      userId,
      sessionId,
      path,
      userAgent: userAgent || request.headers['user-agent'],
      context,
    });

    return reply.send({
      data: { errorId: error.id, occurrences: error.occurrences },
    });
  });

  /**
   * GET /monitoring/errors
   * Get tracked errors (admin only)
   */
  app.get('/monitoring/errors', {
    preHandler: [authenticate, requireAdmin],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { limit } = request.query as { limit?: string };
    const errors = await monitoringService.getRecentErrors(parseInt(limit || '50'));
    return reply.send({ data: errors });
  });

  /**
   * POST /monitoring/errors/:id/resolve
   * Mark an error as resolved (admin only)
   */
  app.post('/monitoring/errors/:id/resolve', {
    preHandler: [authenticate, requireAdmin],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const success = await monitoringService.resolveError(id);

    if (!success) {
      return reply.status(404).send({
        error: { code: 'NOT_FOUND', message: 'Error not found' },
      });
    }

    return reply.send({ data: { resolved: true } });
  });

  // ============================================
  // QUICK TEST ENDPOINTS
  // ============================================

  /**
   * GET /monitoring/ping
   * Quick health check for the monitoring endpoint itself
   */
  app.get('/monitoring/ping', async (request: FastifyRequest, reply: FastifyReply) => {
    return reply.send({
      status: 'ok',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
    });
  });

  log.info({ module: 'monitoring-routes' }, 'Monitoring routes registered');
}
