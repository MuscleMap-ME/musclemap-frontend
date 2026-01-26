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
  queryTracesByError,
  getRecentErrors,
  getErrorStats,
  getErrorContext,
  getTraceDb,
  getTracingConfig,
  updateTracingConfig,
  type TraceQueryOptions,
  type TraceRecord,
  type SpanRecord,
  type TracingConfig,
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

  // ============================================
  // ERROR DEBUGGING ENDPOINTS
  // ============================================

  /**
   * GET /api/admin/traces/errors/recent
   * Get recent error traces for quick debugging.
   */
  app.get('/admin/traces/errors/recent', async (request: FastifyRequest<{ Querystring: { limit?: string } }>, reply: FastifyReply) => {
    if (!requireAdmin(request, reply)) return;

    const limit = parseInt(request.query.limit || '20', 10);

    try {
      const errors = getRecentErrors(Math.min(limit, 100));
      return { errors };
    } catch (error) {
      log.error({ error }, 'Failed to get recent errors');
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Failed to get recent errors',
      });
    }
  });

  /**
   * GET /api/admin/traces/errors/stats
   * Get error statistics grouped by pattern.
   */
  app.get('/admin/traces/errors/stats', async (request: FastifyRequest<{ Querystring: { timeWindow?: string } }>, reply: FastifyReply) => {
    if (!requireAdmin(request, reply)) return;

    const timeWindow = parseInt(request.query.timeWindow || '86400000', 10); // Default 24 hours

    try {
      const stats = getErrorStats(timeWindow);
      return { errorPatterns: stats };
    } catch (error) {
      log.error({ error }, 'Failed to get error stats');
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Failed to get error statistics',
      });
    }
  });

  /**
   * GET /api/admin/traces/errors/search
   * Search traces by error message pattern.
   */
  app.get('/admin/traces/errors/search', async (request: FastifyRequest<{
    Querystring: {
      pattern: string;
      startTime?: string;
      endTime?: string;
      limit?: string;
      includeSpans?: string;
    }
  }>, reply: FastifyReply) => {
    if (!requireAdmin(request, reply)) return;

    const { pattern, startTime, endTime, limit, includeSpans } = request.query;

    if (!pattern) {
      return reply.status(400).send({
        error: 'Bad Request',
        message: 'pattern is required',
      });
    }

    try {
      const traces = queryTracesByError(pattern, {
        startTime: startTime ? new Date(startTime).getTime() : undefined,
        endTime: endTime ? new Date(endTime).getTime() : undefined,
        limit: parseInt(limit || '50', 10),
        includeSpans: includeSpans === 'true',
      });
      return { traces };
    } catch (error) {
      log.error({ error }, 'Failed to search traces by error');
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Failed to search traces',
      });
    }
  });

  /**
   * GET /api/admin/traces/:traceId/context
   * Get full error context including related traces.
   */
  app.get('/admin/traces/:traceId/context', async (request: FastifyRequest<{ Params: GetTraceParams }>, reply: FastifyReply) => {
    if (!requireAdmin(request, reply)) return;

    const { traceId } = request.params;

    try {
      const context = getErrorContext(traceId);
      if (!context) {
        return reply.status(404).send({
          error: 'Not Found',
          message: `Trace ${traceId} not found`,
        });
      }
      return context;
    } catch (error) {
      log.error({ error, traceId }, 'Failed to get trace context');
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Failed to get trace context',
      });
    }
  });

  // ============================================
  // SESSION REPLAY ENDPOINTS
  // ============================================

  /**
   * GET /api/admin/traces/session/:sessionId
   * Get all traces for a session (for session replay).
   */
  app.get('/admin/traces/session/:sessionId', async (request: FastifyRequest<{
    Params: { sessionId: string };
    Querystring: { limit?: string };
  }>, reply: FastifyReply) => {
    if (!requireAdmin(request, reply)) return;

    const { sessionId } = request.params;
    const limit = parseInt(request.query.limit || '100', 10);

    try {
      const database = getTraceDb();
      const traces = database.prepare(`
        SELECT * FROM traces
        WHERE session_id = ?
        ORDER BY started_at ASC
        LIMIT ?
      `).all(sessionId, Math.min(limit, 500)) as TraceRecord[];

      // Get all spans for these traces
      const traceIds = traces.map(t => t.id);
      if (traceIds.length === 0) {
        return { session: { id: sessionId, traces: [], totalDuration: 0 } };
      }

      const placeholders = traceIds.map(() => '?').join(',');
      const spans = database.prepare(`
        SELECT * FROM spans
        WHERE trace_id IN (${placeholders})
        ORDER BY started_at ASC
      `).all(...traceIds) as SpanRecord[];

      // Group spans by trace
      const spansByTrace = new Map<string, SpanRecord[]>();
      for (const span of spans) {
        const existing = spansByTrace.get(span.trace_id) || [];
        existing.push(span);
        spansByTrace.set(span.trace_id, existing);
      }

      const tracesWithSpans = traces.map(trace => ({
        ...trace,
        spans: spansByTrace.get(trace.id) || [],
      }));

      // Calculate session duration
      const firstTrace = traces[0];
      const lastTrace = traces[traces.length - 1];
      const totalDuration = lastTrace
        ? (lastTrace.ended_at || lastTrace.started_at) - firstTrace.started_at
        : 0;

      return {
        session: {
          id: sessionId,
          traces: tracesWithSpans,
          startedAt: firstTrace?.started_at,
          endedAt: lastTrace?.ended_at || lastTrace?.started_at,
          totalDuration,
          traceCount: traces.length,
          errorCount: traces.filter(t => t.status === 'error').length,
        },
      };
    } catch (error) {
      log.error({ error, sessionId }, 'Failed to get session traces');
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Failed to get session traces',
      });
    }
  });

  /**
   * GET /api/admin/traces/user/:userId/journey
   * Get user's journey across sessions.
   */
  app.get('/admin/traces/user/:userId/journey', async (request: FastifyRequest<{
    Params: { userId: string };
    Querystring: { startTime?: string; endTime?: string; limit?: string };
  }>, reply: FastifyReply) => {
    if (!requireAdmin(request, reply)) return;

    const { userId } = request.params;
    const { startTime, endTime, limit } = request.query;

    try {
      const database = getTraceDb();
      const conditions: string[] = ['user_id = ?'];
      const params: unknown[] = [userId];

      if (startTime) {
        conditions.push('started_at >= ?');
        params.push(new Date(startTime).getTime());
      }
      if (endTime) {
        conditions.push('started_at <= ?');
        params.push(new Date(endTime).getTime());
      }

      const traces = database.prepare(`
        SELECT * FROM traces
        WHERE ${conditions.join(' AND ')}
        ORDER BY started_at DESC
        LIMIT ?
      `).all(...params, parseInt(limit || '100', 10)) as TraceRecord[];

      // Group by session
      const sessions = new Map<string, TraceRecord[]>();
      for (const trace of traces) {
        const sessionId = trace.session_id || 'unknown';
        const existing = sessions.get(sessionId) || [];
        existing.push(trace);
        sessions.set(sessionId, existing);
      }

      const journey = Array.from(sessions.entries()).map(([sessionId, sessionTraces]) => ({
        sessionId,
        traceCount: sessionTraces.length,
        errorCount: sessionTraces.filter(t => t.status === 'error').length,
        startedAt: Math.min(...sessionTraces.map(t => t.started_at)),
        endedAt: Math.max(...sessionTraces.map(t => t.ended_at || t.started_at)),
        operations: [...new Set(sessionTraces.map(t => t.root_operation))],
      }));

      return {
        userId,
        sessions: journey,
        totalSessions: sessions.size,
        totalTraces: traces.length,
        totalErrors: traces.filter(t => t.status === 'error').length,
      };
    } catch (error) {
      log.error({ error, userId }, 'Failed to get user journey');
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Failed to get user journey',
      });
    }
  });

  // ============================================
  // PERFORMANCE ANALYSIS ENDPOINTS
  // ============================================

  /**
   * GET /api/admin/traces/performance/heatmap
   * Get performance heatmap data (operations by hour with avg duration).
   */
  app.get('/admin/traces/performance/heatmap', async (request: FastifyRequest<{
    Querystring: { startTime?: string; endTime?: string };
  }>, reply: FastifyReply) => {
    if (!requireAdmin(request, reply)) return;

    const startTime = request.query.startTime
      ? new Date(request.query.startTime).getTime()
      : Date.now() - 7 * 24 * 60 * 60 * 1000; // Default last 7 days
    const endTime = request.query.endTime
      ? new Date(request.query.endTime).getTime()
      : Date.now();

    try {
      const database = getTraceDb();

      // Get hourly aggregates
      const heatmapData = database.prepare(`
        SELECT
          strftime('%Y-%m-%d %H:00', started_at/1000, 'unixepoch') as hour,
          root_operation as operation,
          COUNT(*) as count,
          AVG(duration_ms) as avgDuration,
          MAX(duration_ms) as maxDuration,
          COUNT(CASE WHEN status = 'error' THEN 1 END) as errorCount
        FROM traces
        WHERE started_at >= ? AND started_at <= ?
          AND duration_ms IS NOT NULL
        GROUP BY hour, operation
        ORDER BY hour DESC, count DESC
      `).all(startTime, endTime) as Array<{
        hour: string;
        operation: string;
        count: number;
        avgDuration: number;
        maxDuration: number;
        errorCount: number;
      }>;

      // Group by hour for the heatmap
      const byHour = new Map<string, Array<{
        operation: string;
        count: number;
        avgDuration: number;
        maxDuration: number;
        errorCount: number;
      }>>();

      for (const row of heatmapData) {
        const existing = byHour.get(row.hour) || [];
        existing.push({
          operation: row.operation,
          count: row.count,
          avgDuration: row.avgDuration,
          maxDuration: row.maxDuration,
          errorCount: row.errorCount,
        });
        byHour.set(row.hour, existing);
      }

      return {
        heatmap: Array.from(byHour.entries()).map(([hour, operations]) => ({
          hour,
          operations,
          totalCount: operations.reduce((sum, op) => sum + op.count, 0),
          avgDuration: operations.reduce((sum, op) => sum + op.avgDuration * op.count, 0) /
            operations.reduce((sum, op) => sum + op.count, 0),
        })),
        startTime,
        endTime,
      };
    } catch (error) {
      log.error({ error }, 'Failed to get performance heatmap');
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Failed to get performance heatmap',
      });
    }
  });

  /**
   * GET /api/admin/traces/performance/slow
   * Get slowest traces for performance analysis.
   */
  app.get('/admin/traces/performance/slow', async (request: FastifyRequest<{
    Querystring: { minDuration?: string; limit?: string; startTime?: string };
  }>, reply: FastifyReply) => {
    if (!requireAdmin(request, reply)) return;

    const minDuration = parseInt(request.query.minDuration || '1000', 10);
    const limit = parseInt(request.query.limit || '20', 10);
    const startTime = request.query.startTime
      ? new Date(request.query.startTime).getTime()
      : Date.now() - 24 * 60 * 60 * 1000;

    try {
      const database = getTraceDb();

      const slowTraces = database.prepare(`
        SELECT * FROM traces
        WHERE duration_ms >= ?
          AND started_at >= ?
        ORDER BY duration_ms DESC
        LIMIT ?
      `).all(minDuration, startTime, Math.min(limit, 100)) as TraceRecord[];

      // Get spans for these traces
      const traceIds = slowTraces.map(t => t.id);
      if (traceIds.length === 0) {
        return { traces: [] };
      }

      const placeholders = traceIds.map(() => '?').join(',');
      const spans = database.prepare(`
        SELECT * FROM spans
        WHERE trace_id IN (${placeholders})
        ORDER BY duration_ms DESC
      `).all(...traceIds) as SpanRecord[];

      const spansByTrace = new Map<string, SpanRecord[]>();
      for (const span of spans) {
        const existing = spansByTrace.get(span.trace_id) || [];
        existing.push(span);
        spansByTrace.set(span.trace_id, existing);
      }

      return {
        traces: slowTraces.map(trace => ({
          ...trace,
          spans: spansByTrace.get(trace.id) || [],
          slowestSpan: (spansByTrace.get(trace.id) || [])[0], // Already sorted by duration
        })),
      };
    } catch (error) {
      log.error({ error }, 'Failed to get slow traces');
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Failed to get slow traces',
      });
    }
  });

  // ============================================
  // COMPARISON ENDPOINTS
  // ============================================

  /**
   * POST /api/admin/traces/compare
   * Compare two traces side by side.
   */
  app.post('/admin/traces/compare', async (request: FastifyRequest<{
    Body: { traceId1: string; traceId2: string };
  }>, reply: FastifyReply) => {
    if (!requireAdmin(request, reply)) return;

    const { traceId1, traceId2 } = request.body || {};

    if (!traceId1 || !traceId2) {
      return reply.status(400).send({
        error: 'Bad Request',
        message: 'Both traceId1 and traceId2 are required',
      });
    }

    try {
      const trace1 = getTraceWithSpans(traceId1);
      const trace2 = getTraceWithSpans(traceId2);

      if (!trace1 || !trace2) {
        return reply.status(404).send({
          error: 'Not Found',
          message: 'One or both traces not found',
        });
      }

      // Calculate comparison metrics
      const comparison = {
        trace1: {
          ...trace1,
          spanCount: trace1.spans?.length || 0,
          errorCount: trace1.spans?.filter(s => s.status === 'error').length || 0,
        },
        trace2: {
          ...trace2,
          spanCount: trace2.spans?.length || 0,
          errorCount: trace2.spans?.filter(s => s.status === 'error').length || 0,
        },
        diff: {
          durationDiff: (trace1.duration_ms || 0) - (trace2.duration_ms || 0),
          durationPct: trace2.duration_ms
            ? (((trace1.duration_ms || 0) - trace2.duration_ms) / trace2.duration_ms) * 100
            : 0,
          spanCountDiff: (trace1.spans?.length || 0) - (trace2.spans?.length || 0),
          sameOperation: trace1.root_operation === trace2.root_operation,
        },
      };

      return comparison;
    } catch (error) {
      log.error({ error }, 'Failed to compare traces');
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Failed to compare traces',
      });
    }
  });

  // ============================================
  // EXPORT ENDPOINTS
  // ============================================

  /**
   * GET /api/admin/traces/export
   * Export traces as JSON or CSV.
   */
  app.get('/admin/traces/export', async (request: FastifyRequest<{
    Querystring: {
      format?: 'json' | 'csv';
      startTime?: string;
      endTime?: string;
      status?: string;
      limit?: string;
    };
  }>, reply: FastifyReply) => {
    if (!requireAdmin(request, reply)) return;

    const { format = 'json', startTime, endTime, status, limit } = request.query;

    try {
      const options: TraceQueryOptions = {
        limit: parseInt(limit || '1000', 10),
        offset: 0,
      };

      if (startTime) options.startTime = new Date(startTime).getTime();
      if (endTime) options.endTime = new Date(endTime).getTime();
      if (status) options.status = status as any;

      const result = queryTraces(options);

      if (format === 'csv') {
        // Generate CSV
        const headers = ['id', 'user_id', 'session_id', 'root_operation', 'started_at', 'ended_at', 'duration_ms', 'status', 'error_message'];
        const rows = result.traces.map(t => [
          t.id,
          t.user_id || '',
          t.session_id || '',
          t.root_operation,
          new Date(t.started_at).toISOString(),
          t.ended_at ? new Date(t.ended_at).toISOString() : '',
          t.duration_ms?.toString() || '',
          t.status,
          (t.error_message || '').replace(/"/g, '""'),
        ]);

        const csv = [
          headers.join(','),
          ...rows.map(row => row.map(cell => `"${cell}"`).join(',')),
        ].join('\n');

        reply.header('Content-Type', 'text/csv');
        reply.header('Content-Disposition', `attachment; filename=traces-${Date.now()}.csv`);
        return csv;
      }

      // Return JSON
      reply.header('Content-Disposition', `attachment; filename=traces-${Date.now()}.json`);
      return {
        exportedAt: new Date().toISOString(),
        traceCount: result.traces.length,
        traces: result.traces,
      };
    } catch (error) {
      log.error({ error }, 'Failed to export traces');
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Failed to export traces',
      });
    }
  });

  // ============================================
  // ALERTING ENDPOINTS
  // ============================================

  /**
   * GET /api/admin/traces/alerts/check
   * Check for alert conditions (error rate spikes, slow performance).
   */
  app.get('/admin/traces/alerts/check', async (request: FastifyRequest<{
    Querystring: {
      errorRateThreshold?: string;
      slowThreshold?: string;
      windowMs?: string;
    };
  }>, reply: FastifyReply) => {
    if (!requireAdmin(request, reply)) return;

    const errorRateThreshold = parseFloat(request.query.errorRateThreshold || '0.1'); // 10%
    const slowThreshold = parseInt(request.query.slowThreshold || '2000', 10); // 2 seconds
    const windowMs = parseInt(request.query.windowMs || '300000', 10); // 5 minutes

    try {
      const database = getTraceDb();
      const cutoff = Date.now() - windowMs;

      // Get current window stats
      const currentStats = database.prepare(`
        SELECT
          COUNT(*) as total,
          COUNT(CASE WHEN status = 'error' THEN 1 END) as errors,
          AVG(duration_ms) as avgDuration,
          COUNT(CASE WHEN duration_ms > ? THEN 1 END) as slowCount
        FROM traces
        WHERE started_at >= ?
      `).get(slowThreshold, cutoff) as {
        total: number;
        errors: number;
        avgDuration: number;
        slowCount: number;
      };

      // Get previous window for comparison
      const prevStats = database.prepare(`
        SELECT
          COUNT(*) as total,
          COUNT(CASE WHEN status = 'error' THEN 1 END) as errors,
          AVG(duration_ms) as avgDuration
        FROM traces
        WHERE started_at >= ? AND started_at < ?
      `).get(cutoff - windowMs, cutoff) as {
        total: number;
        errors: number;
        avgDuration: number;
      };

      const errorRate = currentStats.total > 0 ? currentStats.errors / currentStats.total : 0;
      const prevErrorRate = prevStats.total > 0 ? prevStats.errors / prevStats.total : 0;

      const alerts: Array<{
        type: 'error_rate' | 'slow_performance' | 'error_spike';
        severity: 'warning' | 'critical';
        message: string;
        value: number;
        threshold: number;
      }> = [];

      // Check error rate
      if (errorRate > errorRateThreshold) {
        alerts.push({
          type: 'error_rate',
          severity: errorRate > errorRateThreshold * 2 ? 'critical' : 'warning',
          message: `Error rate is ${(errorRate * 100).toFixed(1)}% (threshold: ${(errorRateThreshold * 100).toFixed(1)}%)`,
          value: errorRate,
          threshold: errorRateThreshold,
        });
      }

      // Check for error spike (2x increase from previous window)
      if (prevErrorRate > 0 && errorRate > prevErrorRate * 2) {
        alerts.push({
          type: 'error_spike',
          severity: 'warning',
          message: `Error rate spiked ${((errorRate / prevErrorRate - 1) * 100).toFixed(0)}% from previous window`,
          value: errorRate / prevErrorRate,
          threshold: 2,
        });
      }

      // Check slow performance
      if (currentStats.slowCount > 0 && currentStats.total > 0) {
        const slowRate = currentStats.slowCount / currentStats.total;
        if (slowRate > 0.1) { // More than 10% of requests are slow
          alerts.push({
            type: 'slow_performance',
            severity: slowRate > 0.25 ? 'critical' : 'warning',
            message: `${(slowRate * 100).toFixed(1)}% of requests are slower than ${slowThreshold}ms`,
            value: slowRate,
            threshold: 0.1,
          });
        }
      }

      return {
        alerts,
        currentWindow: {
          windowMs,
          total: currentStats.total,
          errors: currentStats.errors,
          errorRate,
          avgDuration: currentStats.avgDuration,
          slowCount: currentStats.slowCount,
        },
        previousWindow: {
          total: prevStats.total,
          errors: prevStats.errors,
          errorRate: prevErrorRate,
          avgDuration: prevStats.avgDuration,
        },
        thresholds: {
          errorRateThreshold,
          slowThreshold,
        },
      };
    } catch (error) {
      log.error({ error }, 'Failed to check alerts');
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Failed to check alerts',
      });
    }
  });

  // ============================================
  // CONFIGURATION ENDPOINTS
  // ============================================

  /**
   * GET /api/admin/traces/config
   * Get tracing configuration.
   */
  app.get('/admin/traces/config', async (request: FastifyRequest, reply: FastifyReply) => {
    if (!requireAdmin(request, reply)) return;

    try {
      const config = getTracingConfig();
      return config;
    } catch (error) {
      log.error({ error }, 'Failed to get tracing config');
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Failed to get tracing config',
      });
    }
  });

  /**
   * PUT /api/admin/traces/config
   * Update tracing configuration.
   */
  app.put('/admin/traces/config', async (request: FastifyRequest<{
    Body: Partial<TracingConfig>;
  }>, reply: FastifyReply) => {
    if (!requireAdmin(request, reply)) return;

    try {
      const updates = request.body || {};
      const config = updateTracingConfig(updates);
      log.info({ config, updates }, 'Tracing config updated');
      return config;
    } catch (error) {
      log.error({ error }, 'Failed to update tracing config');
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Failed to update tracing config',
      });
    }
  });

  log.info('Trace query routes registered');
}
