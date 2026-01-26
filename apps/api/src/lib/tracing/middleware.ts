/**
 * Fastify Tracing Middleware
 *
 * Extracts trace context from incoming HTTP headers and makes it
 * available throughout the request lifecycle via AsyncLocalStorage.
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import {
  contextFromHeaders,
  runWithTraceContextAsync,
  setContextUserId,
  generateTraceId,
  generateSpanId,
  type TraceContext,
} from './index';
import { loggers } from '../logger';

const log = loggers.http.child({ module: 'tracing' });

/**
 * Register tracing middleware on a Fastify instance.
 * This extracts trace context from headers and runs the request
 * within that context using AsyncLocalStorage.
 */
export async function registerTracingMiddleware(app: FastifyInstance): Promise<void> {
  // Add trace context to every request
  app.addHook('preHandler', async (request: FastifyRequest, _reply: FastifyReply) => {
    // Extract trace context from headers
    const headers = {
      'x-trace-id': request.headers['x-trace-id'] as string | undefined,
      'x-span-id': request.headers['x-span-id'] as string | undefined,
      'x-parent-span-id': request.headers['x-parent-span-id'] as string | undefined,
      'x-session-id': request.headers['x-session-id'] as string | undefined,
    };

    const traceContext = contextFromHeaders(headers);

    // If user is authenticated, attach userId to context
    const user = (request as any).user;
    if (user?.userId) {
      traceContext.userId = user.userId;
    }

    // Attach trace context to request for later use
    (request as any).traceContext = traceContext;

    // Log incoming request with trace ID
    log.debug({
      traceId: traceContext.traceId,
      spanId: traceContext.spanId,
      parentSpanId: traceContext.parentSpanId,
      method: request.method,
      url: request.url,
      userId: traceContext.userId,
    }, 'Request started with trace context');
  });

  // Add trace ID to response headers
  app.addHook('onSend', async (request: FastifyRequest, reply: FastifyReply) => {
    const traceContext = (request as any).traceContext as TraceContext | undefined;
    if (traceContext) {
      reply.header('x-trace-id', traceContext.traceId);
    }
    return;
  });

  // Log completed requests with trace info
  app.addHook('onResponse', async (request: FastifyRequest, reply: FastifyReply) => {
    const traceContext = (request as any).traceContext as TraceContext | undefined;
    const responseTime = reply.elapsedTime;

    // Log slow requests
    if (responseTime > 1000) {
      log.warn({
        traceId: traceContext?.traceId,
        method: request.method,
        url: request.url,
        statusCode: reply.statusCode,
        responseTime: Math.round(responseTime),
        userId: traceContext?.userId,
      }, 'Slow request');
    }
  });

  log.info('Tracing middleware registered');
}

/**
 * Get trace context from a Fastify request.
 */
export function getTraceContextFromRequest(request: FastifyRequest): TraceContext | undefined {
  return (request as any).traceContext;
}

/**
 * Create a child span from a Fastify request's trace context.
 */
export function createRequestSpanId(request: FastifyRequest): string {
  return generateSpanId();
}
