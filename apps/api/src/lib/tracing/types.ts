/**
 * Distributed Tracing Type Definitions
 *
 * Core types for the tracing system that tracks user actions,
 * GraphQL operations, database queries, and frontend events.
 */

/**
 * Trace context propagated across service boundaries.
 * Passed via HTTP headers (X-Trace-ID, X-Span-ID, X-Session-ID).
 */
export interface TraceContext {
  /** Unique identifier for the entire trace (UUID) */
  traceId: string;
  /** Current span identifier */
  spanId: string;
  /** Parent span that initiated this operation */
  parentSpanId?: string;
  /** MuscleMap user ID (if authenticated) */
  userId?: string;
  /** Browser session identifier */
  sessionId?: string;
}

/**
 * Attributes attached to spans for debugging and analysis.
 */
export interface SpanAttributes {
  // GraphQL specific
  operationName?: string;
  operationType?: 'query' | 'mutation' | 'subscription';
  variables?: Record<string, unknown>;
  complexity?: number;
  fieldName?: string;
  parentType?: string;

  // Database specific
  sql?: string;
  params?: unknown[];
  rowCount?: number;
  tableName?: string;

  // HTTP specific
  method?: string;
  url?: string;
  statusCode?: number;
  requestBody?: unknown;
  responseBody?: unknown;

  // Cache specific
  cacheKey?: string;
  cacheHit?: boolean;

  // UI specific
  componentName?: string;
  eventType?: string;
  targetElement?: string;
  routePath?: string;

  // Generic extensible attributes
  [key: string]: unknown;
}

/**
 * Event logged within a span (for additional context).
 */
export interface SpanEvent {
  name: string;
  timestamp: number;
  attributes?: Record<string, unknown>;
}

/**
 * Types of operations being traced.
 */
export type OperationType = 'graphql' | 'db' | 'http' | 'cache' | 'ui' | 'service';

/**
 * Services where spans can originate.
 */
export type Service = 'frontend' | 'api' | 'database' | 'redis';

/**
 * Status of a span or trace.
 */
export type SpanStatus = 'in_progress' | 'completed' | 'error';

/**
 * Individual span within a trace.
 * Represents a single operation (e.g., a database query, a GraphQL field resolution).
 */
export interface Span {
  id: string;
  traceId: string;
  parentSpanId?: string;
  operationName: string;
  operationType: OperationType;
  service: Service;
  startedAt: number;
  endedAt?: number;
  durationMs?: number;
  status: SpanStatus;
  errorMessage?: string;
  attributes: SpanAttributes;
  events: SpanEvent[];
}

/**
 * Metadata about the client/environment where the trace originated.
 */
export interface TraceMetadata {
  browser?: string;
  browserVersion?: string;
  os?: string;
  device?: string;
  ip?: string;
  userAgent?: string;
  screenSize?: string;
  locale?: string;
}

/**
 * Top-level trace record that groups related spans.
 */
export interface Trace {
  id: string;
  userId?: string;
  sessionId?: string;
  rootOperation: string;
  startedAt: number;
  endedAt?: number;
  durationMs?: number;
  status: SpanStatus;
  errorMessage?: string;
  errorStack?: string;
  metadata: TraceMetadata;
  spans: Span[];
}

/**
 * Options for querying traces.
 */
export interface TraceQueryOptions {
  startTime?: number;       // Unix timestamp (ms)
  endTime?: number;         // Unix timestamp (ms)
  userId?: string;
  sessionId?: string;
  operationType?: string;   // 'query', 'mutation', 'ui', etc.
  operationName?: string;   // Partial match supported
  status?: SpanStatus;
  minDuration?: number;     // Filter slow operations (ms)
  limit?: number;           // Default 100
  offset?: number;          // Pagination
}

/**
 * Result of a trace query with pagination info.
 */
export interface TraceQueryResult {
  traces: Trace[];
  total: number;
  limit: number;
  offset: number;
}

/**
 * Aggregated trace statistics.
 */
export interface TraceStats {
  total: number;
  errors: number;
  avgDuration: number;
  maxDuration: number;
  minDuration: number;
}

/**
 * Breakdown of traces by operation.
 */
export interface OperationStats {
  rootOperation: string;
  count: number;
  avgDuration: number;
  errors: number;
}

/**
 * Breakdown of traces by user.
 */
export interface UserTraceStats {
  userId: string;
  count: number;
  avgDuration: number;
}

/**
 * Full statistics response.
 */
export interface TraceStatsResponse {
  stats: TraceStats;
  byOperation: OperationStats[];
  byUser: UserTraceStats[];
}

/**
 * Span record for database storage (JSON fields as strings).
 */
export interface SpanRecord {
  id: string;
  trace_id: string;
  parent_span_id: string | null;
  operation_name: string;
  operation_type: string;
  service: string;
  started_at: number;
  ended_at: number | null;
  duration_ms: number | null;
  status: string;
  error_message: string | null;
  attributes: string; // JSON string
  events: string;     // JSON string
}

/**
 * Trace record for database storage (JSON fields as strings).
 */
export interface TraceRecord {
  id: string;
  user_id: string | null;
  session_id: string | null;
  root_operation: string;
  started_at: number;
  ended_at: number | null;
  duration_ms: number | null;
  status: string;
  error_message: string | null;
  error_stack: string | null;
  metadata: string;   // JSON string
  created_at: number;
}
