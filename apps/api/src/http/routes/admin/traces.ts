/**
 * Trace Query API Routes
 *
 * REST endpoints for querying distributed traces.
 * All endpoints require admin authentication.
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import {
  queryTraces,
  getTraceWithSpans,
  getTraceStats,
  cleanupOldTraces,
  insertSpan,
  type TraceQueryOptions,
} from '../../../lib/tracing';
import { loggers } from '../../../lib/logger';

const log = loggers.core.child({ module: 'traces-api' });

// ============================================
// TYPES
// ============================================

interface ListTracesQuery {
  startTime?: string;
  endTime?: string;
  userId?: string;
  status?: string;
  operationType?: string;
  minDuration?: string;
  maxDuration?: string;
  hasError?: string;
  limit?: string;
  offset?: string;
}

interface GetTraceParams {
  traceId: string;
}

interface FrontendSpan {
  id: string;
  traceId: string;
  parentSpanId?: string;
  operationName: string;
  operationType: string;
  startedAt: number;
  endedAt?: number;
  durationMs?: number;
  status: string;
  errorMessage?: string;
  attributes?: Record<string, unknown>;
}

interface TraceLogBody {
  spans: FrontendSpan[];
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Check if user has admin role.
 */
function isAdmin(request: FastifyRequest): boolean {
  const user = (request as any).user;
  if (!user) return false;
  return user.roles?.includes('admin') || user.roles?.includes('superadmin');
}

/**
 * Require admin authentication.
 */
function requireAdmin(request: FastifyRequest, reply: FastifyReply): boolean {
  if (!isAdmin(request)) {
    reply.status(403).send({
      error: 'Forbidden',
      message: 'Admin access required',
    });
    return false;
  }
  return true;
}

// ============================================
// ROUTES
// ============================================

export async function registerTraceRoutes(app: FastifyInstance): Promise<void> {
  /**
   * GET /api/admin/traces
   * List traces with filtering and pagination.
   */
  app.get('/admin/traces', async (request: FastifyRequest<{ Querystring: ListTracesQuery }>, reply: FastifyReply) => {
    if (!requireAdmin(request, reply)) return;

    const {
      startTime,
      endTime,
      userId,
      status,
      operationType,
      minDuration,
      maxDuration,
      hasError,
      limit = '50',
      offset = '0',
    } = request.query;

    const options: TraceQueryOptions = {
      limit: Math.min(parseInt(limit, 10) || 50, 500),
      offset: parseInt(offset, 10) || 0,
    };

    if (startTime) options.startTime = new Date(startTime).getTime();
    if (endTime) options.endTime = new Date(endTime).getTime();
    if (userId) options.userId = userId;
    if (status) options.status = status as any;
    if (operationType) options.operationType = operationType as any;
    if (minDuration) options.minDuration = parseInt(minDuration, 10);
    // Note: maxDuration and hasError are not supported by TraceQueryOptions

    try {
      const result = queryTraces(options);
      return {
        traces: result.traces,
        pagination: {
          limit: options.limit,
          offset: options.offset,
          total: result.total,
        },
      };
    } catch (error) {
      log.error({ error }, 'Failed to query traces');
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Failed to query traces',
      });
    }
  });

  /**
   * GET /api/admin/traces/stats
   * Get trace statistics for the dashboard.
   */
  app.get('/admin/traces/stats', async (request: FastifyRequest, reply: FastifyReply) => {
    if (!requireAdmin(request, reply)) return;

    try {
      const stats = getTraceStats();
      return stats;
    } catch (error) {
      log.error({ error }, 'Failed to get trace stats');
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Failed to get trace statistics',
      });
    }
  });

  /**
   * GET /api/admin/traces/:traceId
   * Get a single trace with all its spans.
   */
  app.get('/admin/traces/:traceId', async (request: FastifyRequest<{ Params: GetTraceParams }>, reply: FastifyReply) => {
    if (!requireAdmin(request, reply)) return;

    const { traceId } = request.params;

    try {
      const result = getTraceWithSpans(traceId);
      if (!result) {
        return reply.status(404).send({
          error: 'Not Found',
          message: `Trace ${traceId} not found`,
        });
      }
      return result;
    } catch (error) {
      log.error({ error, traceId }, 'Failed to get trace');
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Failed to get trace',
      });
    }
  });

  /**
   * DELETE /api/admin/traces/cleanup
   * Delete traces older than specified days.
   */
  app.delete('/admin/traces/cleanup', async (request: FastifyRequest<{ Querystring: { days?: string } }>, reply: FastifyReply) => {
    if (!requireAdmin(request, reply)) return;

    const days = parseInt(request.query.days || '7', 10);
    if (days < 1) {
      return reply.status(400).send({
        error: 'Bad Request',
        message: 'Days must be at least 1',
      });
    }

    try {
      const deletedCount = cleanupOldTraces(days);
      log.info({ days, deletedCount }, 'Cleaned up old traces');
      return {
        success: true,
        deletedCount,
        message: `Deleted ${deletedCount} traces older than ${days} days`,
      };
    } catch (error) {
      log.error({ error }, 'Failed to cleanup traces');
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Failed to cleanup traces',
      });
    }
  });

  /**
   * POST /api/trace-log
   * Receive frontend spans (batched).
   * This endpoint does not require admin auth - it's for the frontend to submit traces.
   */
  app.post('/trace-log', async (request: FastifyRequest<{ Body: TraceLogBody }>, reply: FastifyReply) => {
    const { spans } = request.body || {};

    if (!spans || !Array.isArray(spans)) {
      return reply.status(400).send({
        error: 'Bad Request',
        message: 'spans array is required',
      });
    }

    // Get user from request if authenticated
    const user = (request as any).user;
    const userId = user?.userId;

    try {
      let insertedCount = 0;

      for (const span of spans) {
        // Basic validation
        if (!span.id || !span.traceId || !span.operationName) {
          continue;
        }

        insertSpan({
          id: span.id,
          traceId: span.traceId,
          parentSpanId: span.parentSpanId,
          operationName: span.operationName,
          operationType: (span.operationType || 'ui') as string,
          service: 'frontend',
          startedAt: typeof span.startedAt === 'number' ? span.startedAt : new Date(span.startedAt).getTime(),
          endedAt: span.endedAt ? (typeof span.endedAt === 'number' ? span.endedAt : new Date(span.endedAt).getTime()) : undefined,
          durationMs: span.durationMs,
          status: (span.status || 'completed') as string,
          errorMessage: span.errorMessage,
          attributes: span.attributes,
        });

        insertedCount++;
      }

      return {
        success: true,
        insertedCount,
      };
    } catch (error) {
      log.error({ error }, 'Failed to insert frontend spans');
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Failed to log spans',
      });
    }
  });

  log.info('Trace query routes registered');
}
