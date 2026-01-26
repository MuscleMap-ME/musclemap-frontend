/**
 * Database Query Tracing
 *
 * Wraps database queries with automatic span creation.
 * Captures SQL, parameters, duration, and row counts.
 */

import { startSpan, endSpan, setSpanAttributes, sanitizeSql, sanitizeParams, extractSqlOperation } from './spans';
import type { SpanAttributes } from './types';

/**
 * Wrap a database query with tracing.
 * Creates a span that records the query execution.
 */
export function wrapDbQuery<T>(
  sql: string,
  params: unknown[] | undefined,
  executor: () => Promise<T>
): Promise<T> {
  const operation = extractSqlOperation(sql);
  const spanId = startSpan(
    `db:${operation}`,
    'db',
    'database',
    {
      sql: sanitizeSql(sql),
      params: sanitizeParams(params),
    }
  );

  return executor()
    .then((result) => {
      // Add row count if result is an array
      if (Array.isArray(result)) {
        setSpanAttributes(spanId, { rowCount: result.length });
      } else if (result && typeof result === 'object' && 'rowCount' in result) {
        setSpanAttributes(spanId, { rowCount: (result as any).rowCount });
      }
      endSpan(spanId);
      return result;
    })
    .catch((error) => {
      endSpan(spanId, error);
      throw error;
    });
}

/**
 * Wrap a transaction with tracing.
 */
export async function wrapTransaction<T>(
  isolationLevel: string,
  executor: () => Promise<T>
): Promise<T> {
  const spanId = startSpan(
    'db:TRANSACTION',
    'db',
    'database',
    {
      isolationLevel,
    }
  );

  try {
    const result = await executor();
    endSpan(spanId);
    return result;
  } catch (error) {
    endSpan(spanId, error as Error);
    throw error;
  }
}

/**
 * Create traced versions of database query functions.
 * Returns wrapped functions that automatically create spans.
 */
export function createTracedDb<T extends {
  query: (sql: string, params?: unknown[]) => Promise<any>;
  queryOne: (sql: string, params?: unknown[]) => Promise<any>;
  queryAll: (sql: string, params?: unknown[]) => Promise<any>;
  execute: (sql: string, params?: unknown[]) => Promise<any>;
}>(db: T): T {
  return {
    ...db,
    query: (sql: string, params?: unknown[]) =>
      wrapDbQuery(sql, params, () => db.query(sql, params)),
    queryOne: (sql: string, params?: unknown[]) =>
      wrapDbQuery(sql, params, () => db.queryOne(sql, params)),
    queryAll: (sql: string, params?: unknown[]) =>
      wrapDbQuery(sql, params, () => db.queryAll(sql, params)),
    execute: (sql: string, params?: unknown[]) =>
      wrapDbQuery(sql, params, () => db.execute(sql, params)),
  };
}
