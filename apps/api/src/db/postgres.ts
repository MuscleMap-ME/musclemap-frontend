/**
 * PostgreSQL Database Client
 *
 * Provides connection pooling, transactions, and query utilities.
 * Uses pg with proper connection management for high performance.
 */

import { Pool, PoolClient, QueryResult, QueryResultRow } from 'pg';
import { config, isProduction } from '../config';
import { loggers } from '../lib/logger';

const log = loggers.db;

// Connection pool singleton
let pool: Pool | null = null;

/**
 * Get or create the connection pool
 */
export function getPool(): Pool {
  if (!pool) {
    pool = new Pool({
      connectionString: config.DATABASE_URL,
      min: config.DATABASE_POOL_MIN,
      max: config.DATABASE_POOL_MAX,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
      ssl: config.DATABASE_SSL ? { rejectUnauthorized: isProduction } : false,
      // Statement timeout for long-running queries (30 seconds)
      statement_timeout: 30000,
      // Application name for easier debugging
      application_name: 'musclemap-api',
    });

    // Pool event handlers
    pool.on('connect', (client) => {
      log.debug('New client connected to pool');
      // Set session parameters
      client.query('SET timezone = \'UTC\'');
    });

    pool.on('error', (err) => {
      log.error({ error: err.message }, 'Unexpected pool error');
    });

    pool.on('remove', () => {
      log.debug('Client removed from pool');
    });

    log.info({
      min: config.DATABASE_POOL_MIN,
      max: config.DATABASE_POOL_MAX,
    }, 'PostgreSQL connection pool initialized');
  }

  return pool;
}

/**
 * Execute a single query
 */
export async function query<T extends QueryResultRow = any>(
  text: string,
  params?: any[]
): Promise<QueryResult<T>> {
  const start = Date.now();
  const result = await getPool().query<T>(text, params);
  const duration = Date.now() - start;

  if (duration > 100) {
    log.warn({ duration, query: text.substring(0, 100) }, 'Slow query detected');
  }

  return result;
}

/**
 * Get a single row or null
 */
export async function queryOne<T extends QueryResultRow = any>(
  text: string,
  params?: any[]
): Promise<T | null> {
  const result = await query<T>(text, params);
  return result.rows[0] || null;
}

/**
 * Get all rows
 */
export async function queryAll<T extends QueryResultRow = any>(
  text: string,
  params?: any[]
): Promise<T[]> {
  const result = await query<T>(text, params);
  return result.rows;
}

/**
 * Execute a command (INSERT, UPDATE, DELETE) and return affected row count
 */
export async function execute(
  text: string,
  params?: any[]
): Promise<number> {
  const result = await query(text, params);
  return result.rowCount || 0;
}

/**
 * Transaction wrapper with automatic rollback on error
 */
export async function transaction<T>(
  fn: (client: PoolClient) => Promise<T>
): Promise<T> {
  const client = await getPool().connect();

  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Transaction with serializable isolation level (strongest consistency)
 */
export async function serializableTransaction<T>(
  fn: (client: PoolClient) => Promise<T>,
  maxRetries = 3
): Promise<T> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const client = await getPool().connect();

    try {
      await client.query('BEGIN ISOLATION LEVEL SERIALIZABLE');
      const result = await fn(client);
      await client.query('COMMIT');
      return result;
    } catch (error: any) {
      await client.query('ROLLBACK');

      // Check for serialization failure (code 40001) - can retry
      if (error.code === '40001' && attempt < maxRetries - 1) {
        lastError = error;
        // Exponential backoff
        await new Promise((r) => setTimeout(r, Math.pow(2, attempt) * 10));
        continue;
      }

      throw error;
    } finally {
      client.release();
    }
  }

  throw lastError || new Error('Transaction failed after retries');
}

/**
 * Batch insert with UNNEST for performance
 */
export async function batchInsert<T extends Record<string, any>>(
  table: string,
  columns: string[],
  rows: T[]
): Promise<number> {
  if (rows.length === 0) return 0;

  // Build arrays for each column
  const arrays: any[][] = columns.map(() => []);

  for (const row of rows) {
    columns.forEach((col, i) => {
      arrays[i].push(row[col]);
    });
  }

  // Build the UNNEST query
  const unnestParts = columns.map((_, i) => `$${i + 1}::text[]`);
  const columnList = columns.join(', ');

  const text = `
    INSERT INTO ${table} (${columnList})
    SELECT * FROM UNNEST(${unnestParts.join(', ')})
  `;

  const result = await query(text, arrays);
  return result.rowCount || 0;
}

/**
 * Upsert (INSERT ON CONFLICT)
 */
export async function upsert<T extends QueryResultRow = any>(
  table: string,
  data: Record<string, any>,
  conflictColumns: string[],
  updateColumns?: string[]
): Promise<T | null> {
  const columns = Object.keys(data);
  const values = Object.values(data);
  const placeholders = columns.map((_, i) => `$${i + 1}`);

  const conflictTarget = conflictColumns.join(', ');
  const updates = (updateColumns || columns.filter((c) => !conflictColumns.includes(c)))
    .map((c) => `${c} = EXCLUDED.${c}`)
    .join(', ');

  const text = `
    INSERT INTO ${table} (${columns.join(', ')})
    VALUES (${placeholders.join(', ')})
    ON CONFLICT (${conflictTarget})
    DO UPDATE SET ${updates}
    RETURNING *
  `;

  const result = await query<T>(text, values);
  return result.rows[0] || null;
}

/**
 * Health check
 */
export async function healthCheck(): Promise<boolean> {
  try {
    await query('SELECT 1');
    return true;
  } catch {
    return false;
  }
}

/**
 * Get pool statistics
 */
export function getPoolStats() {
  const p = getPool();
  return {
    totalCount: p.totalCount,
    idleCount: p.idleCount,
    waitingCount: p.waitingCount,
  };
}

/**
 * Close the connection pool
 */
export async function closePool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
    log.info('PostgreSQL connection pool closed');
  }
}

// Alias for closePool for consistency
export const closeDatabase = closePool;

/**
 * Initialize the database connection and verify it's working
 */
export async function initDatabase(): Promise<void> {
  const p = getPool();

  // Test connection
  try {
    await p.query('SELECT 1');
    log.info('Database connection verified');
  } catch (error: any) {
    log.error({ error: error.message }, 'Failed to connect to database');
    throw error;
  }
}

/**
 * SQL tagged template literal for safe queries
 *
 * Usage:
 *   const result = await sql`SELECT * FROM users WHERE id = ${userId}`;
 */
export function sql<T extends QueryResultRow = any>(
  strings: TemplateStringsArray,
  ...values: any[]
): Promise<QueryResult<T>> {
  let text = '';
  const params: any[] = [];

  strings.forEach((str, i) => {
    text += str;
    if (i < values.length) {
      params.push(values[i]);
      text += `$${params.length}`;
    }
  });

  return query<T>(text, params);
}
