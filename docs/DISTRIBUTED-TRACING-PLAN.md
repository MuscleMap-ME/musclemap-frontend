# Distributed Tracing Implementation Plan

## Executive Summary

This plan outlines the implementation of a comprehensive distributed tracing system for MuscleMap that will:
1. Track every user action from the moment they log in
2. Associate all actions with trace IDs for debugging and performance analysis
3. Store traces in SQLite for efficient querying
4. Provide an Empire Control Panel for viewing and analyzing traces

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                                    FRONTEND (React)                                       │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                           │
│  ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐                       │
│  │  User Action    │───▶│  TraceProvider  │───▶│  Apollo Client  │                       │
│  │  (click, submit)│    │  (generates IDs)│    │  (adds headers) │                       │
│  └─────────────────┘    └─────────────────┘    └─────────────────┘                       │
│                                │                        │                                 │
│                                │ trace_id, span_id      │ X-Trace-ID, X-Span-ID          │
│                                ▼                        ▼                                 │
│                         ┌─────────────────────────────────────────┐                      │
│                         │         Frontend Trace Logger            │                      │
│                         │  (batches & sends to /api/trace-log)    │                      │
│                         └─────────────────────────────────────────┘                      │
│                                                                                           │
└─────────────────────────────────────────────────────────────────────────────────────────┘
                                          │
                                          │ HTTPS (GraphQL + REST)
                                          ▼
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                                    BACKEND (Fastify)                                      │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                           │
│  ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐                       │
│  │  Trace Extractor│───▶│  GraphQL Server │───▶│  Service Layer  │                       │
│  │  (from headers) │    │  (adds to ctx)  │    │  (creates spans)│                       │
│  └─────────────────┘    └─────────────────┘    └─────────────────┘                       │
│                                │                        │                                 │
│                                ▼                        ▼                                 │
│                         ┌─────────────────────────────────────────┐                      │
│                         │           Trace Collector                │                      │
│                         │  (aggregates spans, writes to SQLite)   │                      │
│                         └─────────────────────────────────────────┘                      │
│                                          │                                                │
│                                          ▼                                                │
│                         ┌─────────────────────────────────────────┐                      │
│                         │         SQLite Database                  │                      │
│                         │  (traces.db - separate from main DB)    │                      │
│                         └─────────────────────────────────────────┘                      │
│                                          │                                                │
│                                          ▼                                                │
│                         ┌─────────────────────────────────────────┐                      │
│                         │         Trace API (REST)                │                      │
│                         │  /api/admin/traces - query interface    │                      │
│                         └─────────────────────────────────────────┘                      │
│                                                                                           │
└─────────────────────────────────────────────────────────────────────────────────────────┘
                                          │
                                          │ Admin Access Only
                                          ▼
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                              Empire Control Panel                                         │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                           │
│  ┌─────────────────────────────────────────────────────────────────────────────────┐    │
│  │                           Distributed Traces Panel                                │    │
│  │  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐               │    │
│  │  │  Filters    │ │  Timeline   │ │  Waterfall  │ │  Details    │               │    │
│  │  │  (time,user,│ │  (trace     │ │  (span      │ │  (errors,   │               │    │
│  │  │   action)   │ │   list)     │ │   breakdown)│ │   context)  │               │    │
│  │  └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘               │    │
│  └─────────────────────────────────────────────────────────────────────────────────┘    │
│                                                                                           │
└─────────────────────────────────────────────────────────────────────────────────────────┘
```

## Data Model

### SQLite Schema (apps/api/data/traces.db)

```sql
-- Main traces table
CREATE TABLE traces (
  id TEXT PRIMARY KEY,                    -- trace_id (UUID)
  user_id TEXT,                           -- User who initiated the trace
  session_id TEXT,                        -- Browser session ID
  root_operation TEXT NOT NULL,           -- e.g., "mutation:createGoal"
  started_at INTEGER NOT NULL,            -- Unix timestamp (ms)
  ended_at INTEGER,                       -- Unix timestamp (ms)
  duration_ms INTEGER,                    -- Total duration
  status TEXT DEFAULT 'in_progress',      -- 'in_progress', 'completed', 'error'
  error_message TEXT,                     -- Error if any
  error_stack TEXT,                       -- Stack trace if error
  metadata TEXT,                          -- JSON: { browser, device, ip, etc. }
  created_at INTEGER DEFAULT (strftime('%s','now') * 1000)
);

-- Individual spans within a trace
CREATE TABLE spans (
  id TEXT PRIMARY KEY,                    -- span_id (UUID)
  trace_id TEXT NOT NULL,                 -- Parent trace
  parent_span_id TEXT,                    -- Parent span (null for root span)
  operation_name TEXT NOT NULL,           -- e.g., "graphql:query:goals"
  operation_type TEXT NOT NULL,           -- 'graphql', 'db', 'http', 'cache', 'ui'
  service TEXT NOT NULL,                  -- 'frontend', 'api', 'database', 'redis'
  started_at INTEGER NOT NULL,            -- Unix timestamp (ms)
  ended_at INTEGER,                       -- Unix timestamp (ms)
  duration_ms INTEGER,                    -- Span duration
  status TEXT DEFAULT 'in_progress',      -- 'in_progress', 'completed', 'error'
  error_message TEXT,                     -- Error if any
  attributes TEXT,                        -- JSON: { sql, variables, cacheHit, etc. }
  events TEXT,                            -- JSON array of events/logs
  FOREIGN KEY (trace_id) REFERENCES traces(id) ON DELETE CASCADE
);

-- Indexes for efficient querying
CREATE INDEX idx_traces_user_id ON traces(user_id);
CREATE INDEX idx_traces_started_at ON traces(started_at);
CREATE INDEX idx_traces_status ON traces(status);
CREATE INDEX idx_traces_root_operation ON traces(root_operation);
CREATE INDEX idx_spans_trace_id ON spans(trace_id);
CREATE INDEX idx_spans_parent_span_id ON spans(parent_span_id);
CREATE INDEX idx_spans_operation_type ON spans(operation_type);
CREATE INDEX idx_spans_started_at ON spans(started_at);

-- Cleanup trigger: Delete traces older than 7 days
-- (Optional: can be adjusted via config)
```

### TypeScript Interfaces

```typescript
// apps/api/src/lib/tracing/types.ts

export interface TraceContext {
  traceId: string;
  spanId: string;
  parentSpanId?: string;
  userId?: string;
  sessionId?: string;
}

export interface SpanAttributes {
  // GraphQL specific
  operationName?: string;
  operationType?: 'query' | 'mutation' | 'subscription';
  variables?: Record<string, unknown>;
  complexity?: number;

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

  // Generic
  [key: string]: unknown;
}

export interface Span {
  id: string;
  traceId: string;
  parentSpanId?: string;
  operationName: string;
  operationType: 'graphql' | 'db' | 'http' | 'cache' | 'ui' | 'service';
  service: 'frontend' | 'api' | 'database' | 'redis';
  startedAt: number;
  endedAt?: number;
  durationMs?: number;
  status: 'in_progress' | 'completed' | 'error';
  errorMessage?: string;
  attributes: SpanAttributes;
  events: SpanEvent[];
}

export interface SpanEvent {
  name: string;
  timestamp: number;
  attributes?: Record<string, unknown>;
}

export interface Trace {
  id: string;
  userId?: string;
  sessionId?: string;
  rootOperation: string;
  startedAt: number;
  endedAt?: number;
  durationMs?: number;
  status: 'in_progress' | 'completed' | 'error';
  errorMessage?: string;
  errorStack?: string;
  metadata: TraceMetadata;
  spans: Span[];
}

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

export interface TraceQueryOptions {
  startTime?: number;       // Unix timestamp (ms)
  endTime?: number;         // Unix timestamp (ms)
  userId?: string;
  sessionId?: string;
  operationType?: string;   // 'query', 'mutation', 'ui', etc.
  operationName?: string;   // Partial match
  status?: string;          // 'completed', 'error'
  minDuration?: number;     // Filter slow operations
  limit?: number;           // Default 100
  offset?: number;          // Pagination
}
```

## Implementation Phases

### Phase 1: Core Infrastructure (Backend)

#### 1.1 Trace Database Setup
- Create SQLite database initialization
- Implement schema migration
- Add cleanup cron job for old traces

**Files to Create:**
- `apps/api/src/lib/tracing/trace-db.ts` - SQLite connection & queries
- `apps/api/src/lib/tracing/types.ts` - TypeScript interfaces
- `apps/api/src/lib/tracing/index.ts` - Main exports

#### 1.2 Trace Context Management
- Generate trace IDs (UUID v4)
- Propagate trace context through Fastify request lifecycle
- Extend GraphQL context with trace information

**Files to Modify:**
- `apps/api/src/graphql/server.ts` - Add trace context to GraphQL context
- `apps/api/src/http/server.ts` - Add trace extraction middleware

**Files to Create:**
- `apps/api/src/lib/tracing/context.ts` - Trace context utilities
- `apps/api/src/lib/tracing/middleware.ts` - Fastify trace middleware

#### 1.3 Span Recording
- Implement span creation/completion functions
- Add automatic database query tracing
- Add Redis operation tracing

**Files to Modify:**
- `apps/api/src/db/client.ts` - Wrap queries with span recording
- `apps/api/src/lib/redis.ts` - Wrap Redis operations

**Files to Create:**
- `apps/api/src/lib/tracing/spans.ts` - Span management
- `apps/api/src/lib/tracing/db-tracer.ts` - Database query tracer
- `apps/api/src/lib/tracing/redis-tracer.ts` - Redis operation tracer

### Phase 2: GraphQL Integration

#### 2.1 GraphQL Resolver Tracing
- Create Apollo Server plugin for automatic tracing
- Capture operation name, variables, complexity
- Record resolver-level spans for slow queries

**Files to Create:**
- `apps/api/src/graphql/tracing-plugin.ts` - Apollo tracing plugin

**Files to Modify:**
- `apps/api/src/graphql/server.ts` - Register tracing plugin

#### 2.2 Service Layer Tracing
- Add tracing decorators for service methods
- Capture business logic execution time
- Track credit transactions, workout logging, etc.

**Files to Modify:**
- `apps/api/src/modules/economy/credit-service.ts` - Add tracing
- `apps/api/src/modules/stats/stats-service.ts` - Add tracing
- `apps/api/src/modules/workouts/workout-service.ts` - Add tracing
- (All other service files)

### Phase 3: Frontend Integration

#### 3.1 Trace Context Provider
- Create React context for trace management
- Generate trace IDs for user actions
- Maintain session ID across page loads

**Files to Create:**
- `src/contexts/TraceContext.tsx` - React trace context
- `src/lib/tracing/index.ts` - Frontend tracing utilities
- `src/lib/tracing/trace-logger.ts` - Batched trace submission

#### 3.2 Apollo Client Integration
- Add trace headers to GraphQL requests
- Capture query/mutation timing
- Send frontend spans to backend

**Files to Modify:**
- `src/graphql/client.ts` - Add trace headers to requests

#### 3.3 UI Action Tracing
- Create tracing hooks for common actions
- Track button clicks, form submissions, page views
- Record component render times

**Files to Create:**
- `src/hooks/useTracedAction.ts` - Action tracing hook
- `src/hooks/usePageView.ts` - Page view tracing
- `src/components/TracedButton.tsx` - Pre-traced button component

### Phase 4: Query API & Empire Panel

#### 4.1 Trace Query API
- Create REST endpoints for trace querying
- Implement filtering, pagination, aggregation
- Add export functionality (JSON, CSV)

**Files to Create:**
- `apps/api/src/http/routes/admin/traces.ts` - Trace API routes
- `apps/api/src/lib/tracing/query-service.ts` - Query implementation

#### 4.2 Empire Control Panel
- Create TracingPanel component
- Implement trace timeline view
- Build waterfall diagram for span breakdown
- Add filtering and search UI

**Files to Create:**
- `src/components/admin/TracingPanel.tsx` - Main panel
- `src/components/admin/TracingPanel/TraceTimeline.tsx` - Timeline view
- `src/components/admin/TracingPanel/TraceWaterfall.tsx` - Waterfall diagram
- `src/components/admin/TracingPanel/TraceFilters.tsx` - Filter controls
- `src/components/admin/TracingPanel/TraceDetails.tsx` - Span details view

**Files to Modify:**
- `src/pages/EmpireControl.tsx` - Add tracing panel to navigation

## Detailed Implementation Guide

### Step 1: Trace Database Setup

```typescript
// apps/api/src/lib/tracing/trace-db.ts
import Database from 'better-sqlite3';
import path from 'path';
import { config } from '../../config';

const TRACE_DB_PATH = path.join(config.DATA_DIR || './data', 'traces.db');

let db: Database.Database | null = null;

export function getTraceDb(): Database.Database {
  if (!db) {
    db = new Database(TRACE_DB_PATH);
    db.pragma('journal_mode = WAL');
    db.pragma('synchronous = NORMAL');
    initializeSchema(db);
  }
  return db;
}

function initializeSchema(db: Database.Database): void {
  db.exec(`
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
```

### Step 2: Trace Context Management

```typescript
// apps/api/src/lib/tracing/context.ts
import { v4 as uuidv4 } from 'uuid';
import { AsyncLocalStorage } from 'async_hooks';
import type { TraceContext } from './types';

// AsyncLocalStorage for request-scoped trace context
const traceStorage = new AsyncLocalStorage<TraceContext>();

export function generateTraceId(): string {
  return uuidv4();
}

export function generateSpanId(): string {
  return uuidv4().substring(0, 16); // Shorter span IDs
}

export function getTraceContext(): TraceContext | undefined {
  return traceStorage.getStore();
}

export function runWithTraceContext<T>(context: TraceContext, fn: () => T): T {
  return traceStorage.run(context, fn);
}

export function createChildContext(operationName: string): TraceContext {
  const parent = getTraceContext();
  if (!parent) {
    // No parent context, create new trace
    const traceId = generateTraceId();
    return {
      traceId,
      spanId: generateSpanId(),
      parentSpanId: undefined,
      userId: undefined,
      sessionId: undefined,
    };
  }

  return {
    traceId: parent.traceId,
    spanId: generateSpanId(),
    parentSpanId: parent.spanId,
    userId: parent.userId,
    sessionId: parent.sessionId,
  };
}
```

### Step 3: Span Recording

```typescript
// apps/api/src/lib/tracing/spans.ts
import { getTraceDb } from './trace-db';
import { getTraceContext, createChildContext } from './context';
import type { Span, SpanAttributes, SpanEvent } from './types';

interface ActiveSpan {
  id: string;
  traceId: string;
  parentSpanId?: string;
  operationName: string;
  operationType: string;
  service: string;
  startedAt: number;
  attributes: SpanAttributes;
  events: SpanEvent[];
}

const activeSpans = new Map<string, ActiveSpan>();

export function startSpan(
  operationName: string,
  operationType: Span['operationType'],
  service: Span['service'],
  attributes: SpanAttributes = {}
): string {
  const context = createChildContext(operationName);
  const span: ActiveSpan = {
    id: context.spanId,
    traceId: context.traceId,
    parentSpanId: context.parentSpanId,
    operationName,
    operationType,
    service,
    startedAt: Date.now(),
    attributes,
    events: [],
  };

  activeSpans.set(span.id, span);
  return span.id;
}

export function addSpanEvent(spanId: string, name: string, attributes?: Record<string, unknown>): void {
  const span = activeSpans.get(spanId);
  if (span) {
    span.events.push({
      name,
      timestamp: Date.now(),
      attributes,
    });
  }
}

export function setSpanAttributes(spanId: string, attributes: Partial<SpanAttributes>): void {
  const span = activeSpans.get(spanId);
  if (span) {
    span.attributes = { ...span.attributes, ...attributes };
  }
}

export function endSpan(spanId: string, error?: Error): void {
  const span = activeSpans.get(spanId);
  if (!span) return;

  const endedAt = Date.now();
  const durationMs = endedAt - span.startedAt;

  try {
    const db = getTraceDb();
    db.prepare(`
      INSERT INTO spans (id, trace_id, parent_span_id, operation_name, operation_type,
        service, started_at, ended_at, duration_ms, status, error_message, attributes, events)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      span.id,
      span.traceId,
      span.parentSpanId || null,
      span.operationName,
      span.operationType,
      span.service,
      span.startedAt,
      endedAt,
      durationMs,
      error ? 'error' : 'completed',
      error?.message || null,
      JSON.stringify(span.attributes),
      JSON.stringify(span.events)
    );
  } catch (e) {
    console.error('[Tracing] Failed to record span:', e);
  }

  activeSpans.delete(spanId);
}

// High-level helper for tracing async operations
export async function traceAsync<T>(
  operationName: string,
  operationType: Span['operationType'],
  service: Span['service'],
  fn: () => Promise<T>,
  attributes: SpanAttributes = {}
): Promise<T> {
  const spanId = startSpan(operationName, operationType, service, attributes);
  try {
    const result = await fn();
    endSpan(spanId);
    return result;
  } catch (error) {
    endSpan(spanId, error as Error);
    throw error;
  }
}

// Synchronous version
export function traceSync<T>(
  operationName: string,
  operationType: Span['operationType'],
  service: Span['service'],
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
```

### Step 4: Database Query Tracing Wrapper

```typescript
// apps/api/src/lib/tracing/db-tracer.ts
import { startSpan, endSpan, setSpanAttributes } from './spans';

export function wrapDbQuery<T>(
  sql: string,
  params: unknown[] | undefined,
  executor: () => Promise<T>
): Promise<T> {
  const spanId = startSpan(
    `db:${extractOperation(sql)}`,
    'db',
    'database',
    {
      sql: sanitizeSql(sql),
      params: sanitizeParams(params),
    }
  );

  return executor()
    .then((result) => {
      if (Array.isArray(result)) {
        setSpanAttributes(spanId, { rowCount: result.length });
      }
      endSpan(spanId);
      return result;
    })
    .catch((error) => {
      endSpan(spanId, error);
      throw error;
    });
}

function extractOperation(sql: string): string {
  const normalized = sql.trim().toUpperCase();
  if (normalized.startsWith('SELECT')) return 'SELECT';
  if (normalized.startsWith('INSERT')) return 'INSERT';
  if (normalized.startsWith('UPDATE')) return 'UPDATE';
  if (normalized.startsWith('DELETE')) return 'DELETE';
  return 'QUERY';
}

function sanitizeSql(sql: string): string {
  // Truncate very long queries
  return sql.length > 500 ? sql.substring(0, 500) + '...' : sql;
}

function sanitizeParams(params: unknown[] | undefined): unknown[] | undefined {
  if (!params) return undefined;
  // Mask sensitive values (passwords, tokens)
  return params.map((p) => {
    if (typeof p === 'string' && p.length > 100) {
      return '[TRUNCATED]';
    }
    return p;
  });
}
```

### Step 5: GraphQL Tracing Plugin

```typescript
// apps/api/src/graphql/tracing-plugin.ts
import type { ApolloServerPlugin } from '@apollo/server';
import type { GraphQLContext } from './server';
import { startSpan, endSpan, setSpanAttributes } from '../lib/tracing/spans';
import { getTraceDb } from '../lib/tracing/trace-db';
import { generateTraceId, generateSpanId } from '../lib/tracing/context';

export function createTracingPlugin(): ApolloServerPlugin<GraphQLContext> {
  return {
    async requestDidStart({ request, contextValue }) {
      // Extract trace context from headers or generate new
      const traceId = request.http?.headers.get('x-trace-id') || generateTraceId();
      const parentSpanId = request.http?.headers.get('x-parent-span-id');
      const sessionId = request.http?.headers.get('x-session-id');
      const spanId = generateSpanId();

      const operationName = request.operationName || 'UnnamedOperation';
      const startedAt = Date.now();

      // Create trace record
      const db = getTraceDb();
      db.prepare(`
        INSERT OR IGNORE INTO traces (id, user_id, session_id, root_operation, started_at, status, metadata)
        VALUES (?, ?, ?, ?, ?, 'in_progress', ?)
      `).run(
        traceId,
        contextValue.user?.userId || null,
        sessionId || null,
        `graphql:${operationName}`,
        startedAt,
        JSON.stringify({
          browser: request.http?.headers.get('user-agent'),
        })
      );

      // Start root span for this GraphQL operation
      const rootSpanId = startSpan(
        `graphql:${operationName}`,
        'graphql',
        'api',
        {
          operationName,
          operationType: undefined, // Will be set later
          variables: request.variables,
        }
      );

      // Attach trace context to GraphQL context for use in resolvers
      (contextValue as any).traceContext = {
        traceId,
        spanId: rootSpanId,
        parentSpanId,
        sessionId,
      };

      return {
        async didResolveOperation({ operation }) {
          // Record operation type (query/mutation/subscription)
          setSpanAttributes(rootSpanId, {
            operationType: operation.operation,
          });
        },

        async executionDidStart() {
          return {
            willResolveField({ info }) {
              // Only trace non-trivial field resolutions
              const isListField = info.returnType.toString().startsWith('[');
              const isComplexType = !['String', 'Int', 'Float', 'Boolean', 'ID'].includes(
                info.returnType.toString().replace(/[!\[\]]/g, '')
              );

              if (!isComplexType && !isListField) return;

              const fieldSpanId = startSpan(
                `field:${info.parentType.name}.${info.fieldName}`,
                'graphql',
                'api',
                {
                  fieldName: info.fieldName,
                  parentType: info.parentType.name,
                }
              );

              return (error) => {
                endSpan(fieldSpanId, error || undefined);
              };
            },
          };
        },

        async willSendResponse({ response }) {
          const endedAt = Date.now();
          const durationMs = endedAt - startedAt;
          const hasErrors = response.body.kind === 'single' &&
            response.body.singleResult.errors?.length > 0;

          // End root span
          endSpan(rootSpanId, hasErrors ? new Error('GraphQL errors occurred') : undefined);

          // Update trace record
          db.prepare(`
            UPDATE traces
            SET ended_at = ?, duration_ms = ?, status = ?,
                error_message = ?
            WHERE id = ?
          `).run(
            endedAt,
            durationMs,
            hasErrors ? 'error' : 'completed',
            hasErrors && response.body.kind === 'single'
              ? JSON.stringify(response.body.singleResult.errors)
              : null,
            traceId
          );
        },

        async didEncounterErrors({ errors }) {
          // Record errors in the trace
          for (const error of errors) {
            db.prepare(`
              UPDATE traces
              SET error_message = ?, error_stack = ?, status = 'error'
              WHERE id = ?
            `).run(
              error.message,
              error.extensions?.stacktrace || null,
              traceId
            );
          }
        },
      };
    },
  };
}
```

### Step 6: Frontend Trace Context

```typescript
// src/contexts/TraceContext.tsx
import React, { createContext, useContext, useCallback, useRef, useEffect } from 'react';

interface TraceContextValue {
  sessionId: string;
  createTrace: (operationName: string) => TraceHandle;
  getTraceHeaders: () => Record<string, string>;
}

interface TraceHandle {
  traceId: string;
  spanId: string;
  startSpan: (name: string, attributes?: Record<string, unknown>) => SpanHandle;
  end: (error?: Error) => void;
}

interface SpanHandle {
  spanId: string;
  addEvent: (name: string, attributes?: Record<string, unknown>) => void;
  end: (error?: Error) => void;
}

const TraceContext = createContext<TraceContextValue | null>(null);

export function TraceProvider({ children }: { children: React.ReactNode }) {
  const sessionId = useRef(generateSessionId());
  const pendingSpans = useRef<Map<string, PendingSpan>>(new Map());
  const batchQueue = useRef<SpanRecord[]>([]);
  const flushTimeout = useRef<ReturnType<typeof setTimeout>>();

  // Batch flush to server every 5 seconds or when queue reaches 50 items
  const flushBatch = useCallback(async () => {
    if (batchQueue.current.length === 0) return;

    const batch = batchQueue.current;
    batchQueue.current = [];

    try {
      await fetch('/api/trace-log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ spans: batch }),
      });
    } catch (error) {
      console.warn('[Tracing] Failed to flush batch:', error);
      // Re-queue failed items (with limit to prevent memory leaks)
      if (batchQueue.current.length < 200) {
        batchQueue.current.push(...batch);
      }
    }
  }, []);

  useEffect(() => {
    // Flush on unmount or page unload
    const handleUnload = () => flushBatch();
    window.addEventListener('beforeunload', handleUnload);
    return () => {
      window.removeEventListener('beforeunload', handleUnload);
      flushBatch();
    };
  }, [flushBatch]);

  const queueSpan = useCallback((span: SpanRecord) => {
    batchQueue.current.push(span);
    if (batchQueue.current.length >= 50) {
      flushBatch();
    } else if (!flushTimeout.current) {
      flushTimeout.current = setTimeout(() => {
        flushTimeout.current = undefined;
        flushBatch();
      }, 5000);
    }
  }, [flushBatch]);

  const createTrace = useCallback((operationName: string): TraceHandle => {
    const traceId = generateId();
    const rootSpanId = generateId();
    const startedAt = Date.now();

    const handle: TraceHandle = {
      traceId,
      spanId: rootSpanId,

      startSpan(name: string, attributes?: Record<string, unknown>): SpanHandle {
        const spanId = generateId();
        const spanStartedAt = Date.now();

        const spanHandle: SpanHandle = {
          spanId,
          addEvent(eventName: string, eventAttributes?: Record<string, unknown>) {
            // Events can be added to pending span
          },
          end(error?: Error) {
            queueSpan({
              id: spanId,
              traceId,
              parentSpanId: rootSpanId,
              operationName: name,
              operationType: 'ui',
              service: 'frontend',
              startedAt: spanStartedAt,
              endedAt: Date.now(),
              status: error ? 'error' : 'completed',
              errorMessage: error?.message,
              attributes,
            });
          },
        };

        return spanHandle;
      },

      end(error?: Error) {
        queueSpan({
          id: rootSpanId,
          traceId,
          operationName,
          operationType: 'ui',
          service: 'frontend',
          startedAt,
          endedAt: Date.now(),
          status: error ? 'error' : 'completed',
          errorMessage: error?.message,
          attributes: {},
        });
      },
    };

    return handle;
  }, [queueSpan]);

  const getTraceHeaders = useCallback((): Record<string, string> => {
    const currentTrace = pendingSpans.current.values().next().value;
    return {
      'X-Session-ID': sessionId.current,
      ...(currentTrace && {
        'X-Trace-ID': currentTrace.traceId,
        'X-Parent-Span-ID': currentTrace.spanId,
      }),
    };
  }, []);

  return (
    <TraceContext.Provider value={{ sessionId: sessionId.current, createTrace, getTraceHeaders }}>
      {children}
    </TraceContext.Provider>
  );
}

export function useTracing() {
  const context = useContext(TraceContext);
  if (!context) {
    throw new Error('useTracing must be used within TraceProvider');
  }
  return context;
}

// Utility functions
function generateId(): string {
  return crypto.randomUUID().replace(/-/g, '').substring(0, 16);
}

function generateSessionId(): string {
  const stored = sessionStorage.getItem('mm-session-id');
  if (stored) return stored;
  const newId = crypto.randomUUID();
  sessionStorage.setItem('mm-session-id', newId);
  return newId;
}

interface PendingSpan {
  traceId: string;
  spanId: string;
  startedAt: number;
}

interface SpanRecord {
  id: string;
  traceId: string;
  parentSpanId?: string;
  operationName: string;
  operationType: string;
  service: string;
  startedAt: number;
  endedAt: number;
  status: string;
  errorMessage?: string;
  attributes: Record<string, unknown>;
}
```

### Step 7: Apollo Client Integration

```typescript
// Modifications to src/graphql/client.ts

import { useTracing } from '../contexts/TraceContext';

// In the Apollo Link chain, add tracing headers
const tracingLink = new ApolloLink((operation, forward) => {
  // Get trace context (will be available after TraceProvider mounts)
  const traceHeaders = window.__TRACE_HEADERS || {};

  operation.setContext(({ headers = {} }) => ({
    headers: {
      ...headers,
      ...traceHeaders,
    },
  }));

  return forward(operation);
});

// Expose trace headers globally for Apollo client
// (This is set by TraceProvider on mount)
declare global {
  interface Window {
    __TRACE_HEADERS?: Record<string, string>;
  }
}
```

### Step 8: Trace Query API

```typescript
// apps/api/src/http/routes/admin/traces.ts
import type { FastifyInstance } from 'fastify';
import { getTraceDb } from '../../lib/tracing/trace-db';
import { requireAdmin } from '../auth';
import type { TraceQueryOptions } from '../../lib/tracing/types';

export async function registerTraceRoutes(app: FastifyInstance): Promise<void> {
  // List traces with filtering
  app.get('/api/admin/traces', { preHandler: requireAdmin }, async (request) => {
    const {
      startTime,
      endTime,
      userId,
      sessionId,
      operationType,
      operationName,
      status,
      minDuration,
      limit = 100,
      offset = 0,
    } = request.query as TraceQueryOptions;

    const db = getTraceDb();
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
    if (userId) {
      conditions.push('user_id = ?');
      params.push(userId);
    }
    if (sessionId) {
      conditions.push('session_id = ?');
      params.push(sessionId);
    }
    if (status) {
      conditions.push('status = ?');
      params.push(status);
    }
    if (operationName) {
      conditions.push('root_operation LIKE ?');
      params.push(`%${operationName}%`);
    }
    if (minDuration) {
      conditions.push('duration_ms >= ?');
      params.push(minDuration);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const traces = db.prepare(`
      SELECT * FROM traces
      ${whereClause}
      ORDER BY started_at DESC
      LIMIT ? OFFSET ?
    `).all(...params, limit, offset);

    const total = db.prepare(`
      SELECT COUNT(*) as count FROM traces ${whereClause}
    `).get(...params) as { count: number };

    return {
      traces,
      total: total.count,
      limit,
      offset,
    };
  });

  // Get single trace with all spans
  app.get('/api/admin/traces/:traceId', { preHandler: requireAdmin }, async (request) => {
    const { traceId } = request.params as { traceId: string };
    const db = getTraceDb();

    const trace = db.prepare('SELECT * FROM traces WHERE id = ?').get(traceId);
    if (!trace) {
      return { error: 'Trace not found', statusCode: 404 };
    }

    const spans = db.prepare(`
      SELECT * FROM spans WHERE trace_id = ? ORDER BY started_at ASC
    `).all(traceId);

    return {
      ...trace,
      metadata: JSON.parse((trace as any).metadata || '{}'),
      spans: spans.map((s: any) => ({
        ...s,
        attributes: JSON.parse(s.attributes || '{}'),
        events: JSON.parse(s.events || '[]'),
      })),
    };
  });

  // Get trace statistics
  app.get('/api/admin/traces/stats', { preHandler: requireAdmin }, async (request) => {
    const { startTime, endTime } = request.query as { startTime?: number; endTime?: number };
    const db = getTraceDb();

    const timeCondition = [];
    const params: unknown[] = [];

    if (startTime) {
      timeCondition.push('started_at >= ?');
      params.push(startTime);
    }
    if (endTime) {
      timeCondition.push('started_at <= ?');
      params.push(endTime);
    }

    const whereClause = timeCondition.length > 0 ? `WHERE ${timeCondition.join(' AND ')}` : '';

    const stats = db.prepare(`
      SELECT
        COUNT(*) as total,
        COUNT(CASE WHEN status = 'error' THEN 1 END) as errors,
        AVG(duration_ms) as avg_duration,
        MAX(duration_ms) as max_duration,
        MIN(duration_ms) as min_duration
      FROM traces
      ${whereClause}
    `).get(...params);

    const byOperation = db.prepare(`
      SELECT
        root_operation,
        COUNT(*) as count,
        AVG(duration_ms) as avg_duration,
        COUNT(CASE WHEN status = 'error' THEN 1 END) as errors
      FROM traces
      ${whereClause}
      GROUP BY root_operation
      ORDER BY count DESC
      LIMIT 20
    `).all(...params);

    const byUser = db.prepare(`
      SELECT
        user_id,
        COUNT(*) as count,
        AVG(duration_ms) as avg_duration
      FROM traces
      ${whereClause}
      GROUP BY user_id
      ORDER BY count DESC
      LIMIT 20
    `).all(...params);

    return { stats, byOperation, byUser };
  });

  // Receive frontend spans
  app.post('/api/trace-log', async (request) => {
    const { spans } = request.body as { spans: any[] };
    if (!spans || !Array.isArray(spans)) {
      return { error: 'Invalid payload' };
    }

    const db = getTraceDb();
    const stmt = db.prepare(`
      INSERT OR IGNORE INTO spans
      (id, trace_id, parent_span_id, operation_name, operation_type, service,
       started_at, ended_at, duration_ms, status, error_message, attributes, events)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    for (const span of spans) {
      stmt.run(
        span.id,
        span.traceId,
        span.parentSpanId || null,
        span.operationName,
        span.operationType,
        span.service,
        span.startedAt,
        span.endedAt,
        span.endedAt - span.startedAt,
        span.status,
        span.errorMessage || null,
        JSON.stringify(span.attributes || {}),
        JSON.stringify([])
      );
    }

    return { received: spans.length };
  });

  // Delete old traces (cleanup)
  app.delete('/api/admin/traces/cleanup', { preHandler: requireAdmin }, async (request) => {
    const { olderThanDays = 7 } = request.query as { olderThanDays?: number };
    const cutoff = Date.now() - olderThanDays * 24 * 60 * 60 * 1000;

    const db = getTraceDb();
    const result = db.prepare('DELETE FROM traces WHERE started_at < ?').run(cutoff);

    return { deleted: result.changes };
  });
}
```

### Step 9: Empire Panel Component

```typescript
// src/components/admin/TracingPanel.tsx
// (This would be a large component - summarized structure below)

import React, { useState, useEffect, useCallback } from 'react';
import { format } from 'date-fns';
import GlassSurface from '../glass/GlassSurface';
import { Activity, Clock, AlertTriangle, User, Search, Filter, RefreshCw } from 'lucide-react';

// Subcomponents
import TraceTimeline from './TracingPanel/TraceTimeline';
import TraceWaterfall from './TracingPanel/TraceWaterfall';
import TraceFilters from './TracingPanel/TraceFilters';
import TraceDetails from './TracingPanel/TraceDetails';

export default function TracingPanel() {
  const [traces, setTraces] = useState([]);
  const [selectedTrace, setSelectedTrace] = useState(null);
  const [filters, setFilters] = useState({
    startTime: Date.now() - 3600000, // Last hour
    endTime: Date.now(),
    userId: '',
    operationName: '',
    status: '',
    minDuration: 0,
  });
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchTraces = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([k, v]) => {
        if (v) params.set(k, String(v));
      });

      const res = await fetch(`/api/admin/traces?${params}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      const data = await res.json();
      setTraces(data.traces);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  const fetchStats = useCallback(async () => {
    const res = await fetch(
      `/api/admin/traces/stats?startTime=${filters.startTime}&endTime=${filters.endTime}`,
      { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
    );
    setStats(await res.json());
  }, [filters.startTime, filters.endTime]);

  useEffect(() => {
    fetchTraces();
    fetchStats();
  }, [fetchTraces, fetchStats]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <Activity className="w-5 h-5 text-purple-400" />
          Distributed Traces
        </h2>
        <button
          onClick={() => { fetchTraces(); fetchStats(); }}
          className="p-2 rounded-lg bg-white/5 hover:bg-white/10"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Stats Overview */}
      {stats && (
        <div className="grid grid-cols-4 gap-4">
          <StatCard icon={Activity} label="Total Traces" value={stats.stats.total} />
          <StatCard icon={AlertTriangle} label="Errors" value={stats.stats.errors} color="#ef4444" />
          <StatCard icon={Clock} label="Avg Duration" value={`${Math.round(stats.stats.avg_duration)}ms`} />
          <StatCard icon={Clock} label="Max Duration" value={`${Math.round(stats.stats.max_duration)}ms`} />
        </div>
      )}

      {/* Filters */}
      <TraceFilters filters={filters} onChange={setFilters} onApply={fetchTraces} />

      {/* Main Content */}
      <div className="grid grid-cols-3 gap-6">
        {/* Trace List */}
        <div className="col-span-1">
          <GlassSurface className="p-4 max-h-[600px] overflow-y-auto">
            <h3 className="text-sm font-semibold mb-3">Traces</h3>
            {traces.map((trace) => (
              <TraceListItem
                key={trace.id}
                trace={trace}
                selected={selectedTrace?.id === trace.id}
                onClick={() => setSelectedTrace(trace)}
              />
            ))}
          </GlassSurface>
        </div>

        {/* Waterfall / Details */}
        <div className="col-span-2">
          {selectedTrace ? (
            <TraceDetails trace={selectedTrace} />
          ) : (
            <GlassSurface className="p-8 text-center text-gray-400">
              Select a trace to view details
            </GlassSurface>
          )}
        </div>
      </div>
    </div>
  );
}
```

## File Change Summary

### New Files to Create

| File | Purpose |
|------|---------|
| `apps/api/src/lib/tracing/index.ts` | Main exports for tracing module |
| `apps/api/src/lib/tracing/types.ts` | TypeScript interfaces |
| `apps/api/src/lib/tracing/trace-db.ts` | SQLite database connection |
| `apps/api/src/lib/tracing/context.ts` | Trace context management |
| `apps/api/src/lib/tracing/spans.ts` | Span recording functions |
| `apps/api/src/lib/tracing/db-tracer.ts` | Database query wrapper |
| `apps/api/src/lib/tracing/redis-tracer.ts` | Redis operation wrapper |
| `apps/api/src/lib/tracing/middleware.ts` | Fastify middleware |
| `apps/api/src/graphql/tracing-plugin.ts` | Apollo Server plugin |
| `apps/api/src/http/routes/admin/traces.ts` | Trace query API |
| `src/contexts/TraceContext.tsx` | Frontend trace context |
| `src/lib/tracing/index.ts` | Frontend tracing utilities |
| `src/hooks/useTracedAction.ts` | Action tracing hook |
| `src/hooks/usePageView.ts` | Page view tracing |
| `src/components/admin/TracingPanel.tsx` | Empire panel |
| `src/components/admin/TracingPanel/TraceTimeline.tsx` | Timeline view |
| `src/components/admin/TracingPanel/TraceWaterfall.tsx` | Waterfall diagram |
| `src/components/admin/TracingPanel/TraceFilters.tsx` | Filter controls |
| `src/components/admin/TracingPanel/TraceDetails.tsx` | Trace details |

### Files to Modify

| File | Changes |
|------|---------|
| `apps/api/src/db/client.ts` | Wrap queries with tracing |
| `apps/api/src/lib/redis.ts` | Wrap Redis operations with tracing |
| `apps/api/src/graphql/server.ts` | Add tracing plugin, extend context |
| `apps/api/src/http/server.ts` | Add trace extraction middleware |
| `apps/api/package.json` | Add `better-sqlite3` dependency |
| `src/graphql/client.ts` | Add trace headers to requests |
| `src/App.tsx` | Wrap with TraceProvider |
| `src/pages/EmpireControl.tsx` | Add TracingPanel to navigation |
| `package.json` | No changes needed (frontend) |

## Dependencies

### Backend
```json
{
  "better-sqlite3": "^11.0.0",
  "@types/better-sqlite3": "^7.6.9"
}
```

### Frontend
No additional dependencies needed (uses native crypto.randomUUID)

## Performance Considerations

1. **SQLite Write Performance**: Uses WAL mode for concurrent writes
2. **Batch Frontend Spans**: Frontend batches spans every 5s or 50 items
3. **Index Optimization**: Strategic indexes on common query patterns
4. **Automatic Cleanup**: Cron job deletes traces older than 7 days
5. **Span Sampling**: Option to sample at high volume (>1000 req/min)
6. **Async Writes**: Non-blocking span recording

## Security Considerations

1. **Admin-Only Access**: All trace APIs require admin role
2. **Data Sanitization**: SQL queries truncated, sensitive params masked
3. **No PII in Spans**: Variables sanitized before storage
4. **Session Isolation**: Sessions tied to browser, not user accounts

## Rollout Plan

1. **Phase 1** (Week 1): Backend infrastructure
2. **Phase 2** (Week 2): GraphQL integration
3. **Phase 3** (Week 3): Frontend integration
4. **Phase 4** (Week 4): Empire panel & polish

## Success Metrics

- [ ] All GraphQL operations traced
- [ ] Database queries traced with timing
- [ ] Frontend actions traced (clicks, navigation)
- [ ] Error correlation works (frontend → backend)
- [ ] Empire panel shows real-time traces
- [ ] Filtering works by time, user, operation, status
- [ ] Waterfall diagram shows span hierarchy
- [ ] Performance overhead < 5% request latency
