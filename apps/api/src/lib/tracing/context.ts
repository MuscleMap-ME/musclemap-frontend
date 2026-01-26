/**
 * Trace Context Management
 *
 * Uses AsyncLocalStorage to maintain trace context across async operations.
 * This allows automatic propagation of trace IDs through the request lifecycle.
 */

import { AsyncLocalStorage } from 'async_hooks';
import { randomUUID } from 'crypto';
import type { TraceContext } from './types';

// AsyncLocalStorage for request-scoped trace context
const traceStorage = new AsyncLocalStorage<TraceContext>();

/**
 * Generate a new trace ID (UUID v4).
 */
export function generateTraceId(): string {
  return randomUUID();
}

/**
 * Generate a shorter span ID (16 characters).
 */
export function generateSpanId(): string {
  return randomUUID().replace(/-/g, '').substring(0, 16);
}

/**
 * Get the current trace context from AsyncLocalStorage.
 * Returns undefined if not in a traced context.
 */
export function getTraceContext(): TraceContext | undefined {
  return traceStorage.getStore();
}

/**
 * Run a function with a specific trace context.
 * All async operations within this function will have access to the context.
 */
export function runWithTraceContext<T>(context: TraceContext, fn: () => T): T {
  return traceStorage.run(context, fn);
}

/**
 * Run an async function with a specific trace context.
 */
export async function runWithTraceContextAsync<T>(
  context: TraceContext,
  fn: () => Promise<T>
): Promise<T> {
  return traceStorage.run(context, fn);
}

/**
 * Create a new root trace context (for starting a new trace).
 */
export function createRootContext(options?: {
  userId?: string;
  sessionId?: string;
}): TraceContext {
  return {
    traceId: generateTraceId(),
    spanId: generateSpanId(),
    parentSpanId: undefined,
    userId: options?.userId,
    sessionId: options?.sessionId,
  };
}

/**
 * Create a child context from the current context (for nested operations).
 * Inherits traceId, userId, and sessionId from parent.
 */
export function createChildContext(operationName?: string): TraceContext {
  const parent = getTraceContext();

  if (!parent) {
    // No parent context, create new trace
    return createRootContext();
  }

  return {
    traceId: parent.traceId,
    spanId: generateSpanId(),
    parentSpanId: parent.spanId,
    userId: parent.userId,
    sessionId: parent.sessionId,
  };
}

/**
 * Create a trace context from HTTP headers.
 * Used to continue a trace started in the frontend.
 */
export function contextFromHeaders(headers: {
  'x-trace-id'?: string;
  'x-span-id'?: string;
  'x-parent-span-id'?: string;
  'x-session-id'?: string;
}): TraceContext {
  const traceId = headers['x-trace-id'] || generateTraceId();
  const parentSpanId = headers['x-parent-span-id'] || headers['x-span-id'];
  const sessionId = headers['x-session-id'];

  return {
    traceId,
    spanId: generateSpanId(),
    parentSpanId,
    sessionId,
  };
}

/**
 * Convert trace context to HTTP headers for propagation.
 */
export function contextToHeaders(context: TraceContext): Record<string, string> {
  const headers: Record<string, string> = {
    'x-trace-id': context.traceId,
    'x-span-id': context.spanId,
  };

  if (context.parentSpanId) {
    headers['x-parent-span-id'] = context.parentSpanId;
  }

  if (context.sessionId) {
    headers['x-session-id'] = context.sessionId;
  }

  return headers;
}

/**
 * Attach user ID to the current trace context.
 * Called after authentication succeeds.
 */
export function setContextUserId(userId: string): void {
  const context = getTraceContext();
  if (context) {
    context.userId = userId;
  }
}

/**
 * Get the current trace ID (convenience function).
 */
export function getCurrentTraceId(): string | undefined {
  return getTraceContext()?.traceId;
}

/**
 * Get the current span ID (convenience function).
 */
export function getCurrentSpanId(): string | undefined {
  return getTraceContext()?.spanId;
}

/**
 * Check if we're currently in a traced context.
 */
export function isTracing(): boolean {
  return getTraceContext() !== undefined;
}
