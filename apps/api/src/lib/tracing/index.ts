/**
 * Distributed Tracing Module
 *
 * Main exports for the tracing system. Import from this file:
 *
 * ```typescript
 * import { traceAsync, startSpan, endSpan, getTraceContext } from '../lib/tracing';
 * ```
 */

// Types
export type {
  TraceContext,
  SpanAttributes,
  SpanEvent,
  Span,
  Trace,
  TraceMetadata,
  TraceQueryOptions,
  TraceQueryResult,
  TraceStats,
  OperationStats,
  UserTraceStats,
  TraceStatsResponse,
  OperationType,
  Service,
  SpanStatus,
  SpanRecord,
  TraceRecord,
} from './types';

// Context management
export {
  generateTraceId,
  generateSpanId,
  getTraceContext,
  runWithTraceContext,
  runWithTraceContextAsync,
  createRootContext,
  createChildContext,
  contextFromHeaders,
  contextToHeaders,
  setContextUserId,
  getCurrentTraceId,
  getCurrentSpanId,
  isTracing,
} from './context';

// Span recording
export {
  startSpan,
  endSpan,
  addSpanEvent,
  setSpanAttributes,
  setSpanError,
  traceAsync,
  traceSync,
  createSpanScope,
  getActiveSpanCount,
  clearActiveSpans,
  Traced,
  sanitizeSql,
  sanitizeParams,
  extractSqlOperation,
} from './spans';

// Database operations
export {
  getTraceDb,
  insertTrace,
  updateTrace,
  insertSpan,
  queryTraces,
  getTraceWithSpans,
  getTraceStats,
  cleanupOldTraces,
  getDbStats,
  closeTraceDb,
  parseTraceRecord,
  parseSpanRecord,
  // Error debugging helpers
  queryTracesByError,
  getRecentErrors,
  getErrorStats,
  getErrorContext,
  // Configuration
  getTracingConfig,
  updateTracingConfig,
  type TracingConfig,
} from './trace-db';
