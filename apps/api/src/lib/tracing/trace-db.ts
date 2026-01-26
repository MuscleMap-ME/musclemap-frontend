/**
 * Trace Database (SQLite)
 *
 * Manages the SQLite database for storing distributed traces.
 * Uses WAL mode for concurrent writes and includes automatic cleanup.
 *
 * Database location: apps/api/data/traces.db
 */

import Database from 'better-sqlite3';
import path from 'path';
import { loggers } from '../logger';
import type {
  Trace,
  Span,
  TraceRecord,
  SpanRecord,
  TraceQueryOptions,
  TraceStats,
  OperationStats,
  UserTraceStats,
} from './types';

const log = loggers.core.child({ module: 'tracing' });

// Database file location
const DATA_DIR = process.env.DATA_DIR || path.join(process.cwd(), 'data');
const TRACE_DB_PATH = path.join(DATA_DIR, 'traces.db');

// Retention period in days
const RETENTION_DAYS = 7;

let db: Database.Database | null = null;

/**
 * Get or create the trace database connection.
 */
export function getTraceDb(): Database.Database {
  if (!db) {
    // Ensure data directory exists
    const fs = require('fs');
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }

    db = new Database(TRACE_DB_PATH);

    // Enable WAL mode for better concurrent write performance
    db.pragma('journal_mode = WAL');
    db.pragma('synchronous = NORMAL');

    // Initialize schema
    initializeSchema(db);

    log.info({ path: TRACE_DB_PATH }, 'Trace database initialized');
  }
  return db;
}

/**
 * Initialize the database schema.
 */
function initializeSchema(database: Database.Database): void {
  database.exec(`
    -- Main traces table
    CREATE TABLE IF NOT EXISTS traces (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      session_id TEXT,
      root_operation TEXT NOT NULL,
      started_at INTEGER NOT NULL,
      ended_at INTEGER,
      duration_ms INTEGER,
      status TEXT DEFAULT 'in_progress',
      error_message TEXT,
      error_stack TEXT,
      metadata TEXT,
      created_at INTEGER DEFAULT (strftime('%s','now') * 1000)
    );

    -- Individual spans within a trace
    CREATE TABLE IF NOT EXISTS spans (
      id TEXT PRIMARY KEY,
      trace_id TEXT NOT NULL,
      parent_span_id TEXT,
      operation_name TEXT NOT NULL,
      operation_type TEXT NOT NULL,
      service TEXT NOT NULL,
      started_at INTEGER NOT NULL,
      ended_at INTEGER,
      duration_ms INTEGER,
      status TEXT DEFAULT 'in_progress',
      error_message TEXT,
      attributes TEXT,
      events TEXT,
      FOREIGN KEY (trace_id) REFERENCES traces(id) ON DELETE CASCADE
    );

    -- Indexes for efficient querying
    CREATE INDEX IF NOT EXISTS idx_traces_user_id ON traces(user_id);
    CREATE INDEX IF NOT EXISTS idx_traces_started_at ON traces(started_at);
    CREATE INDEX IF NOT EXISTS idx_traces_status ON traces(status);
    CREATE INDEX IF NOT EXISTS idx_traces_root_operation ON traces(root_operation);
    CREATE INDEX IF NOT EXISTS idx_spans_trace_id ON spans(trace_id);
    CREATE INDEX IF NOT EXISTS idx_spans_parent_span_id ON spans(parent_span_id);
    CREATE INDEX IF NOT EXISTS idx_spans_operation_type ON spans(operation_type);
    CREATE INDEX IF NOT EXISTS idx_spans_started_at ON spans(started_at);
  `);
}

/**
 * Insert a new trace record.
 */
export function insertTrace(trace: {
  id: string;
  userId?: string;
  sessionId?: string;
  rootOperation: string;
  startedAt: number;
  metadata?: Record<string, unknown>;
}): void {
  const database = getTraceDb();
  database.prepare(`
    INSERT OR IGNORE INTO traces (id, user_id, session_id, root_operation, started_at, status, metadata)
    VALUES (?, ?, ?, ?, ?, 'in_progress', ?)
  `).run(
    trace.id,
    trace.userId || null,
    trace.sessionId || null,
    trace.rootOperation,
    trace.startedAt,
    JSON.stringify(trace.metadata || {})
  );
}

/**
 * Update a trace with completion info.
 */
export function updateTrace(traceId: string, updates: {
  endedAt?: number;
  durationMs?: number;
  status?: string;
  errorMessage?: string;
  errorStack?: string;
}): void {
  const database = getTraceDb();
  const setClauses: string[] = [];
  const params: unknown[] = [];

  if (updates.endedAt !== undefined) {
    setClauses.push('ended_at = ?');
    params.push(updates.endedAt);
  }
  if (updates.durationMs !== undefined) {
    setClauses.push('duration_ms = ?');
    params.push(updates.durationMs);
  }
  if (updates.status !== undefined) {
    setClauses.push('status = ?');
    params.push(updates.status);
  }
  if (updates.errorMessage !== undefined) {
    setClauses.push('error_message = ?');
    params.push(updates.errorMessage);
  }
  if (updates.errorStack !== undefined) {
    setClauses.push('error_stack = ?');
    params.push(updates.errorStack);
  }

  if (setClauses.length === 0) return;

  params.push(traceId);
  database.prepare(`UPDATE traces SET ${setClauses.join(', ')} WHERE id = ?`).run(...params);
}

/**
 * Insert a span record.
 */
export function insertSpan(span: {
  id: string;
  traceId: string;
  parentSpanId?: string;
  operationName: string;
  operationType: string;
  service: string;
  startedAt: number;
  endedAt?: number;
  durationMs?: number;
  status: string;
  errorMessage?: string;
  attributes?: Record<string, unknown>;
  events?: unknown[];
}): void {
  const database = getTraceDb();
  database.prepare(`
    INSERT OR IGNORE INTO spans
    (id, trace_id, parent_span_id, operation_name, operation_type, service,
     started_at, ended_at, duration_ms, status, error_message, attributes, events)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    span.id,
    span.traceId,
    span.parentSpanId || null,
    span.operationName,
    span.operationType,
    span.service,
    span.startedAt,
    span.endedAt || null,
    span.durationMs || null,
    span.status,
    span.errorMessage || null,
    JSON.stringify(span.attributes || {}),
    JSON.stringify(span.events || [])
  );
}

/**
 * Query traces with filtering and pagination.
 */
export function queryTraces(options: TraceQueryOptions): {
  traces: TraceRecord[];
  total: number;
} {
  const database = getTraceDb();
  const conditions: string[] = [];
  const params: unknown[] = [];

  if (options.startTime) {
    conditions.push('started_at >= ?');
    params.push(options.startTime);
  }
  if (options.endTime) {
    conditions.push('started_at <= ?');
    params.push(options.endTime);
  }
  if (options.userId) {
    conditions.push('user_id = ?');
    params.push(options.userId);
  }
  if (options.sessionId) {
    conditions.push('session_id = ?');
    params.push(options.sessionId);
  }
  if (options.status) {
    conditions.push('status = ?');
    params.push(options.status);
  }
  if (options.operationName) {
    conditions.push('root_operation LIKE ?');
    params.push(`%${options.operationName}%`);
  }
  if (options.minDuration) {
    conditions.push('duration_ms >= ?');
    params.push(options.minDuration);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const limit = options.limit || 100;
  const offset = options.offset || 0;

  const traces = database.prepare(`
    SELECT * FROM traces
    ${whereClause}
    ORDER BY started_at DESC
    LIMIT ? OFFSET ?
  `).all(...params, limit, offset) as TraceRecord[];

  const total = database.prepare(`
    SELECT COUNT(*) as count FROM traces ${whereClause}
  `).get(...params) as { count: number };

  return { traces, total: total.count };
}

/**
 * Get a single trace with all its spans.
 */
export function getTraceWithSpans(traceId: string): (TraceRecord & { spans: SpanRecord[] }) | null {
  const database = getTraceDb();

  const trace = database.prepare('SELECT * FROM traces WHERE id = ?').get(traceId) as TraceRecord | undefined;
  if (!trace) return null;

  const spans = database.prepare(`
    SELECT * FROM spans WHERE trace_id = ? ORDER BY started_at ASC
  `).all(traceId) as SpanRecord[];

  return { ...trace, spans };
}

/**
 * Get trace statistics.
 */
export function getTraceStats(startTime?: number, endTime?: number): {
  stats: TraceStats;
  byOperation: OperationStats[];
  byUser: UserTraceStats[];
} {
  const database = getTraceDb();
  const conditions: string[] = [];
  const params: unknown[] = [];

  if (startTime) {
    conditions.push('started_at >= ?');
    params.push(startTime);
  }
  if (endTime) {
    conditions.push('started_at <= ?');
    params.push(endTime);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const stats = database.prepare(`
    SELECT
      COUNT(*) as total,
      COUNT(CASE WHEN status = 'error' THEN 1 END) as errors,
      AVG(duration_ms) as avgDuration,
      MAX(duration_ms) as maxDuration,
      MIN(duration_ms) as minDuration
    FROM traces
    ${whereClause}
  `).get(...params) as TraceStats;

  const byOperation = database.prepare(`
    SELECT
      root_operation as rootOperation,
      COUNT(*) as count,
      AVG(duration_ms) as avgDuration,
      COUNT(CASE WHEN status = 'error' THEN 1 END) as errors
    FROM traces
    ${whereClause}
    GROUP BY root_operation
    ORDER BY count DESC
    LIMIT 20
  `).all(...params) as OperationStats[];

  const byUser = database.prepare(`
    SELECT
      user_id as userId,
      COUNT(*) as count,
      AVG(duration_ms) as avgDuration
    FROM traces
    ${whereClause}
    GROUP BY user_id
    ORDER BY count DESC
    LIMIT 20
  `).all(...params) as UserTraceStats[];

  return { stats, byOperation, byUser };
}

/**
 * Delete traces older than the retention period.
 */
export function cleanupOldTraces(olderThanDays: number = RETENTION_DAYS): number {
  const database = getTraceDb();
  const cutoff = Date.now() - olderThanDays * 24 * 60 * 60 * 1000;

  // Cascading delete will also remove associated spans
  const result = database.prepare('DELETE FROM traces WHERE started_at < ?').run(cutoff);

  if (result.changes > 0) {
    log.info({ deleted: result.changes, olderThanDays }, 'Cleaned up old traces');
  }

  return result.changes;
}

/**
 * Get database statistics for monitoring.
 */
export function getDbStats(): {
  traceCount: number;
  spanCount: number;
  dbSizeBytes: number;
  oldestTrace: number | null;
  newestTrace: number | null;
} {
  const database = getTraceDb();
  const fs = require('fs');

  const traceCount = (database.prepare('SELECT COUNT(*) as count FROM traces').get() as { count: number }).count;
  const spanCount = (database.prepare('SELECT COUNT(*) as count FROM spans').get() as { count: number }).count;

  const oldest = database.prepare('SELECT MIN(started_at) as ts FROM traces').get() as { ts: number | null };
  const newest = database.prepare('SELECT MAX(started_at) as ts FROM traces').get() as { ts: number | null };

  let dbSizeBytes = 0;
  try {
    const stat = fs.statSync(TRACE_DB_PATH);
    dbSizeBytes = stat.size;
  } catch {
    // File may not exist yet
  }

  return {
    traceCount,
    spanCount,
    dbSizeBytes,
    oldestTrace: oldest.ts,
    newestTrace: newest.ts,
  };
}

/**
 * Close the database connection.
 */
export function closeTraceDb(): void {
  if (db) {
    db.close();
    db = null;
    log.info('Trace database closed');
  }
}

/**
 * Convert a TraceRecord to a Trace (parse JSON fields).
 */
export function parseTraceRecord(record: TraceRecord & { spans?: SpanRecord[] }): Trace {
  return {
    id: record.id,
    userId: record.user_id || undefined,
    sessionId: record.session_id || undefined,
    rootOperation: record.root_operation,
    startedAt: record.started_at,
    endedAt: record.ended_at || undefined,
    durationMs: record.duration_ms || undefined,
    status: record.status as Trace['status'],
    errorMessage: record.error_message || undefined,
    errorStack: record.error_stack || undefined,
    metadata: JSON.parse(record.metadata || '{}'),
    spans: (record.spans || []).map(parseSpanRecord),
  };
}

/**
 * Convert a SpanRecord to a Span (parse JSON fields).
 */
export function parseSpanRecord(record: SpanRecord): Span {
  return {
    id: record.id,
    traceId: record.trace_id,
    parentSpanId: record.parent_span_id || undefined,
    operationName: record.operation_name,
    operationType: record.operation_type as Span['operationType'],
    service: record.service as Span['service'],
    startedAt: record.started_at,
    endedAt: record.ended_at || undefined,
    durationMs: record.duration_ms || undefined,
    status: record.status as Span['status'],
    errorMessage: record.error_message || undefined,
    attributes: JSON.parse(record.attributes || '{}'),
    events: JSON.parse(record.events || '[]'),
  };
}
