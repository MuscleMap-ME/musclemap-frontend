/**
 * Span Recording
 *
 * Functions for creating, updating, and completing spans.
 * Spans represent individual operations within a trace (e.g., database queries, HTTP calls).
 */

import { insertSpan } from './trace-db';
import {
  getTraceContext,
  createChildContext,
  generateSpanId,
  runWithTraceContextAsync,
} from './context';
import type {
  Span,
  SpanAttributes,
  SpanEvent,
  OperationType,
  Service,
  TraceContext,
} from './types';
import { loggers } from '../logger';

const log = loggers.core.child({ module: 'tracing' });

/**
 * Active spans being recorded (in memory until completed).
 */
interface ActiveSpan {
  id: string;
  traceId: string;
  parentSpanId?: string;
  operationName: string;
  operationType: OperationType;
  service: Service;
  startedAt: number;
  attributes: SpanAttributes;
  events: SpanEvent[];
}

const activeSpans = new Map<string, ActiveSpan>();

/**
 * Start a new span for an operation.
 * Returns the span ID which should be used to end the span.
 */
export function startSpan(
  operationName: string,
  operationType: OperationType,
  service: Service,
  attributes: SpanAttributes = {}
): string {
  const context = getTraceContext();

  // If no context, we're not in a traced request - still record the span
  // but generate a standalone trace ID
  const traceId = context?.traceId || generateSpanId() + generateSpanId();
  const spanId = generateSpanId();
  const parentSpanId = context?.spanId;

  const span: ActiveSpan = {
    id: spanId,
    traceId,
    parentSpanId,
    operationName,
    operationType,
    service,
    startedAt: Date.now(),
    attributes,
    events: [],
  };

  activeSpans.set(spanId, span);
  return spanId;
}

/**
 * Add an event to an active span.
 * Events provide additional context points during the span's lifetime.
 */
export function addSpanEvent(
  spanId: string,
  name: string,
  attributes?: Record<string, unknown>
): void {
  const span = activeSpans.get(spanId);
  if (span) {
    span.events.push({
      name,
      timestamp: Date.now(),
      attributes,
    });
  }
}

/**
 * Update attributes on an active span.
 */
export function setSpanAttributes(
  spanId: string,
  attributes: Partial<SpanAttributes>
): void {
  const span = activeSpans.get(spanId);
  if (span) {
    span.attributes = { ...span.attributes, ...attributes };
  }
}

/**
 * Set an error on an active span.
 */
export function setSpanError(spanId: string, error: Error): void {
  const span = activeSpans.get(spanId);
  if (span) {
    addSpanEvent(spanId, 'error', {
      message: error.message,
      stack: error.stack?.substring(0, 500),
    });
  }
}

/**
 * End a span and persist it to the database.
 */
export function endSpan(spanId: string, error?: Error): void {
  const span = activeSpans.get(spanId);
  if (!span) {
    log.debug({ spanId }, 'Attempted to end non-existent span');
    return;
  }

  const endedAt = Date.now();
  const durationMs = endedAt - span.startedAt;

  try {
    insertSpan({
      id: span.id,
      traceId: span.traceId,
      parentSpanId: span.parentSpanId,
      operationName: span.operationName,
      operationType: span.operationType,
      service: span.service,
      startedAt: span.startedAt,
      endedAt,
      durationMs,
      status: error ? 'error' : 'completed',
      errorMessage: error?.message,
      attributes: span.attributes,
      events: span.events,
    });
  } catch (e) {
    log.error({ error: e, spanId }, 'Failed to persist span');
  }

  activeSpans.delete(spanId);
}

/**
 * Trace an async operation automatically.
 * Creates a span, runs the function, and ends the span (with error handling).
 */
export async function traceAsync<T>(
  operationName: string,
  operationType: OperationType,
  service: Service,
  fn: () => Promise<T>,
  attributes: SpanAttributes = {}
): Promise<T> {
  const spanId = startSpan(operationName, operationType, service, attributes);

  // Run in a child context so nested calls can see the parent span
  const childContext = createChildContext(operationName);

  try {
    const result = await runWithTraceContextAsync(childContext, fn);
    endSpan(spanId);
    return result;
  } catch (error) {
    endSpan(spanId, error as Error);
    throw error;
  }
}

/**
 * Trace a synchronous operation.
 */
export function traceSync<T>(
  operationName: string,
  operationType: OperationType,
  service: Service,
  fn: () => T,
  attributes: SpanAttributes = {}
): T {
  const spanId = startSpan(operationName, operationType, service, attributes);

  try {
    const result = fn();
    endSpan(spanId);
    return result;
  } catch (error) {
    endSpan(spanId, error as Error);
    throw error;
  }
}

/**
 * Create a span that wraps a callback-based operation.
 * Returns a function to call when the operation completes.
 */
export function createSpanScope(
  operationName: string,
  operationType: OperationType,
  service: Service,
  attributes: SpanAttributes = {}
): {
  spanId: string;
  complete: (error?: Error) => void;
  setAttributes: (attrs: Partial<SpanAttributes>) => void;
  addEvent: (name: string, attrs?: Record<string, unknown>) => void;
} {
  const spanId = startSpan(operationName, operationType, service, attributes);

  return {
    spanId,
    complete: (error?: Error) => endSpan(spanId, error),
    setAttributes: (attrs) => setSpanAttributes(spanId, attrs),
    addEvent: (name, attrs) => addSpanEvent(spanId, name, attrs),
  };
}

/**
 * Get the number of currently active spans (for debugging).
 */
export function getActiveSpanCount(): number {
  return activeSpans.size;
}

/**
 * Clear all active spans (for cleanup/testing).
 */
export function clearActiveSpans(): void {
  activeSpans.clear();
}

/**
 * Decorator for tracing class methods (TypeScript decorator).
 */
export function Traced(
  operationType: OperationType = 'service',
  service: Service = 'api'
) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const operationName = `${target.constructor.name}.${propertyKey}`;
      return traceAsync(operationName, operationType, service, () =>
        originalMethod.apply(this, args)
      );
    };

    return descriptor;
  };
}

/**
 * Helper to sanitize SQL for logging (truncate and mask sensitive values).
 */
export function sanitizeSql(sql: string): string {
  // Truncate very long queries
  if (sql.length > 500) {
    return sql.substring(0, 500) + '... [truncated]';
  }
  return sql;
}

/**
 * Helper to sanitize parameters (mask passwords, tokens).
 */
export function sanitizeParams(params: unknown[] | undefined): unknown[] | undefined {
  if (!params) return undefined;

  return params.map((p) => {
    if (typeof p === 'string') {
      // Mask long strings that might be tokens/passwords
      if (p.length > 100) {
        return '[TRUNCATED:' + p.length + ' chars]';
      }
      // Mask anything that looks like a password or token
      if (p.match(/^(password|token|secret|key|bearer|jwt)$/i)) {
        return '[REDACTED]';
      }
    }
    return p;
  });
}

/**
 * Extract operation type from SQL query.
 */
export function extractSqlOperation(sql: string): string {
  const normalized = sql.trim().toUpperCase();
  if (normalized.startsWith('SELECT')) return 'SELECT';
  if (normalized.startsWith('INSERT')) return 'INSERT';
  if (normalized.startsWith('UPDATE')) return 'UPDATE';
  if (normalized.startsWith('DELETE')) return 'DELETE';
  if (normalized.startsWith('BEGIN')) return 'BEGIN';
  if (normalized.startsWith('COMMIT')) return 'COMMIT';
  if (normalized.startsWith('ROLLBACK')) return 'ROLLBACK';
  return 'QUERY';
}
