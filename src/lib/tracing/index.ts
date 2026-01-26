/**
 * Frontend Distributed Tracing
 *
 * Provides trace context management and automatic trace header injection
 * for Apollo Client requests. Traces are batched and sent to the backend
 * for storage and analysis.
 *
 * NOTE: Tracing is currently DISABLED due to backend database issues.
 * Set TRACING_ENABLED to true once the backend is fixed.
 */

// Disable tracing until backend SQLite issues are resolved
const TRACING_ENABLED = false;

// ============================================
// TYPES
// ============================================

export interface TraceContext {
  traceId: string;
  spanId: string;
  parentSpanId?: string;
  sessionId: string;
}

export interface FrontendSpan {
  id: string;
  traceId: string;
  parentSpanId?: string;
  operationName: string;
  operationType: 'graphql' | 'navigation' | 'interaction' | 'api';
  startedAt: number;
  endedAt?: number;
  durationMs?: number;
  status: 'in_progress' | 'success' | 'error';
  errorMessage?: string;
  attributes?: Record<string, unknown>;
}

// ============================================
// ID GENERATION
// ============================================

/**
 * Generate a trace ID using crypto.randomUUID.
 * Falls back to a timestamp-based ID if crypto is not available.
 */
export function generateTraceId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback for older browsers
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 11)}`;
}

/**
 * Generate a span ID (shorter than trace ID).
 */
export function generateSpanId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID().split('-')[0];
  }
  return Math.random().toString(36).slice(2, 10);
}

// ============================================
// SESSION MANAGEMENT
// ============================================

const SESSION_KEY = 'mm_trace_session';

/**
 * Get or create a session ID that persists across page reloads.
 * Sessions are stored in sessionStorage.
 */
export function getSessionId(): string {
  if (typeof sessionStorage === 'undefined') {
    return generateSpanId();
  }

  let sessionId = sessionStorage.getItem(SESSION_KEY);
  if (!sessionId) {
    sessionId = generateTraceId();
    sessionStorage.setItem(SESSION_KEY, sessionId);
  }
  return sessionId;
}

// ============================================
// TRACE CONTEXT MANAGEMENT
// ============================================

let currentTraceContext: TraceContext | null = null;

/**
 * Create a new root trace context.
 * Call this when starting a new user action (click, navigation, etc.).
 */
export function createRootTrace(): TraceContext {
  currentTraceContext = {
    traceId: generateTraceId(),
    spanId: generateSpanId(),
    sessionId: getSessionId(),
  };
  return currentTraceContext;
}

/**
 * Create a child span within the current trace.
 */
export function createChildSpan(): TraceContext {
  if (!currentTraceContext) {
    return createRootTrace();
  }

  return {
    traceId: currentTraceContext.traceId,
    spanId: generateSpanId(),
    parentSpanId: currentTraceContext.spanId,
    sessionId: currentTraceContext.sessionId,
  };
}

/**
 * Get the current trace context.
 */
export function getCurrentTrace(): TraceContext | null {
  return currentTraceContext;
}

/**
 * Set the current trace context (used when receiving context from parent).
 */
export function setCurrentTrace(context: TraceContext): void {
  currentTraceContext = context;
}

/**
 * Clear the current trace context.
 */
export function clearCurrentTrace(): void {
  currentTraceContext = null;
}

/**
 * Get headers to inject into HTTP requests for trace propagation.
 */
export function getTraceHeaders(): Record<string, string> {
  const context = currentTraceContext || createRootTrace();
  return {
    'X-Trace-ID': context.traceId,
    'X-Span-ID': context.spanId,
    'X-Session-ID': context.sessionId,
    ...(context.parentSpanId ? { 'X-Parent-Span-ID': context.parentSpanId } : {}),
  };
}

// ============================================
// SPAN RECORDING
// ============================================

const pendingSpans: FrontendSpan[] = [];
const BATCH_SIZE = 50;
const BATCH_INTERVAL = 5000; // 5 seconds
let batchTimer: ReturnType<typeof setTimeout> | null = null;

/**
 * Start a new span and return its ID.
 */
export function startSpan(
  operationName: string,
  operationType: FrontendSpan['operationType'],
  attributes?: Record<string, unknown>
): string {
  // Return early if tracing is disabled
  if (!TRACING_ENABLED) {
    return generateSpanId();
  }

  const context = currentTraceContext || createRootTrace();
  const span: FrontendSpan = {
    id: generateSpanId(),
    traceId: context.traceId,
    parentSpanId: context.parentSpanId,
    operationName,
    operationType,
    startedAt: Date.now(),
    status: 'in_progress',
    attributes,
  };

  pendingSpans.push(span);
  scheduleBatch();

  return span.id;
}

/**
 * End a span with success or error status.
 */
export function endSpan(spanId: string, error?: Error): void {
  const span = pendingSpans.find((s) => s.id === spanId);
  if (!span) return;

  span.endedAt = Date.now();
  span.durationMs = span.endedAt - span.startedAt;
  span.status = error ? 'error' : 'success';
  if (error) {
    span.errorMessage = error.message;
  }
}

/**
 * Add attributes to a span.
 */
export function addSpanAttributes(spanId: string, attributes: Record<string, unknown>): void {
  const span = pendingSpans.find((s) => s.id === spanId);
  if (!span) return;

  span.attributes = { ...span.attributes, ...attributes };
}

// ============================================
// BATCH SUBMISSION
// ============================================

function scheduleBatch(): void {
  if (batchTimer) return;

  batchTimer = setTimeout(() => {
    flushSpans();
    batchTimer = null;
  }, BATCH_INTERVAL);

  // Also flush if we have too many pending spans
  if (pendingSpans.length >= BATCH_SIZE) {
    flushSpans();
  }
}

/**
 * Flush pending spans to the backend.
 */
export async function flushSpans(): Promise<void> {
  // Skip if tracing is disabled
  if (!TRACING_ENABLED) return;

  if (pendingSpans.length === 0) return;

  // Take all completed spans
  const completedSpans = pendingSpans.filter((s) => s.status !== 'in_progress');
  if (completedSpans.length === 0) return;

  // Remove completed spans from pending
  const completedIds = new Set(completedSpans.map((s) => s.id));
  const remaining = pendingSpans.filter((s) => !completedIds.has(s.id));
  pendingSpans.length = 0;
  pendingSpans.push(...remaining);

  try {
    const response = await fetch('/api/trace/frontend-log', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getTraceHeaders(),
      },
      body: JSON.stringify({ spans: completedSpans }),
    });

    if (!response.ok) {
      // Silently fail - don't spam the console
    }
  } catch {
    // Silently fail - don't spam the console or retry
  }
}

// Flush on page unload (only if tracing is enabled)
if (typeof window !== 'undefined' && TRACING_ENABLED) {
  window.addEventListener('beforeunload', () => {
    // Use sendBeacon for reliable delivery on page unload
    const completedSpans = pendingSpans.filter((s) => s.status !== 'in_progress');
    if (completedSpans.length > 0 && navigator.sendBeacon) {
      navigator.sendBeacon(
        '/api/trace/frontend-log',
        JSON.stringify({ spans: completedSpans })
      );
    }
  });
}

// ============================================
// HIGH-LEVEL TRACING UTILITIES
// ============================================

/**
 * Trace an async operation.
 */
export async function traceAsync<T>(
  operationName: string,
  operationType: FrontendSpan['operationType'],
  fn: () => Promise<T>,
  attributes?: Record<string, unknown>
): Promise<T> {
  const spanId = startSpan(operationName, operationType, attributes);
  try {
    const result = await fn();
    endSpan(spanId);
    return result;
  } catch (error) {
    endSpan(spanId, error as Error);
    throw error;
  }
}

/**
 * Trace a navigation event.
 */
export function traceNavigation(path: string, attributes?: Record<string, unknown>): void {
  // Create a new root trace for each navigation
  createRootTrace();
  const spanId = startSpan(`navigation:${path}`, 'navigation', {
    path,
    ...attributes,
  });
  // End immediately since navigation is instantaneous from our perspective
  endSpan(spanId);
}

/**
 * Trace a user interaction.
 */
export function traceInteraction(
  action: string,
  target: string,
  attributes?: Record<string, unknown>
): string {
  return startSpan(`interaction:${action}:${target}`, 'interaction', {
    action,
    target,
    ...attributes,
  });
}
