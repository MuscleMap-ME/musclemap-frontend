/**
 * PostgreSQL Database Client
 *
 * Optimized for high concurrency with:
 * - Connection pooling with tuned parameters
 * - Statement timeout protection
 * - Idle connection management
 * - Pool monitoring and metrics
 * - Transaction retry with exponential backoff
 * - Advisory locks for distributed locking
 */

import { Pool, PoolClient, PoolConfig } from 'pg';
import { config } from '../config';
import { loggers } from '../lib/logger';

const log = loggers.db;

let pool: Pool | null = null;

// Pool metrics for monitoring
export interface PoolMetrics {
  totalConnections: number;
  idleConnections: number;
  waitingClients: number;
}

function createPoolConfig(): PoolConfig {
  const baseConfig: PoolConfig = {
    // Connection limits
    min: config.PG_POOL_MIN,
    max: config.PG_POOL_MAX,

    // Timeout settings for high concurrency
    idleTimeoutMillis: config.PG_IDLE_TIMEOUT,
    connectionTimeoutMillis: config.PG_CONNECTION_TIMEOUT,

    // Statement timeout to prevent runaway queries
    statement_timeout: config.PG_STATEMENT_TIMEOUT,

    // Keep connections alive
    keepAlive: true,
    keepAliveInitialDelayMillis: 10000,

    // Allow exit even with open connections in development
    allowExitOnIdle: config.NODE_ENV !== 'production',
  };

  if (config.DATABASE_URL) {
    return {
      ...baseConfig,
      connectionString: config.DATABASE_URL,
      // SSL for production database URLs
      ssl: config.DATABASE_URL.includes('sslmode=require')
        ? { rejectUnauthorized: false }
        : undefined,
    };
  }

  return {
    ...baseConfig,
    host: config.PGHOST,
    port: config.PGPORT,
    database: config.PGDATABASE,
    user: config.PGUSER,
    password: config.PGPASSWORD,
  };
}

/**
 * Initialize the connection pool
 */
export async function initializePool(): Promise<void> {
  if (pool) {
    log.warn('Pool already initialized');
    return;
  }

  const poolConfig = createPoolConfig();
  pool = new Pool(poolConfig);

  // Connection event handlers
  pool.on('connect', (client) => {
    log.debug('New client connected to PostgreSQL pool');
    // Set session-level optimizations for each connection
    client.query('SET statement_timeout = $1', [config.PG_STATEMENT_TIMEOUT]).catch(() => {});
  });

  pool.on('remove', () => {
    log.debug('Client removed from pool');
  });

  pool.on('error', (err) => {
    log.error('Unexpected error on idle PostgreSQL client', { error: err.message });
  });

  // Verify connection
  try {
    const client = await pool.connect();
    const result = await client.query('SELECT version()');
    client.release();
    log.info('PostgreSQL pool initialized', {
      host: config.DATABASE_URL ? 'from DATABASE_URL' : config.PGHOST,
      database: config.DATABASE_URL ? 'from DATABASE_URL' : config.PGDATABASE,
      poolMin: config.PG_POOL_MIN,
      poolMax: config.PG_POOL_MAX,
      version: result.rows[0]?.version?.split(' ').slice(0, 2).join(' '),
    });
  } catch (error) {
    log.error('Failed to connect to PostgreSQL', { error });
    throw error;
  }
}

/**
 * Get pool metrics for monitoring
 */
export function getPoolMetrics(): PoolMetrics {
  if (!pool) {
    return { totalConnections: 0, idleConnections: 0, waitingClients: 0 };
  }
  return {
    totalConnections: pool.totalCount,
    idleConnections: pool.idleCount,
    waitingClients: pool.waitingCount,
  };
}

/**
 * Check if pool is healthy
 */
export async function isPoolHealthy(): Promise<boolean> {
  if (!pool) return false;
  try {
    const client = await pool.connect();
    await client.query('SELECT 1');
    client.release();
    return true;
  } catch {
    return false;
  }
}

export interface DbQueryResult<T = Record<string, unknown>> {
  rows: T[];
  rowCount: number | null;
}

let poolInitPromise: Promise<void> | null = null;

function getPool(): Pool {
  if (!pool) {
    // In test environment, throw a more helpful error
    if (process.env.NODE_ENV === 'test') {
      throw new Error(
        'Database pool not initialized. In tests, ensure initializePool() is awaited before any database operations. ' +
        'Check that test setup runs initializePool() before importing modules that use db.'
      );
    }
    throw new Error('Database pool not initialized. Call initializePool() first.');
  }
  return pool;
}

/**
 * Get a promise that resolves when pool is ready.
 * Useful for ensuring pool is initialized before use.
 */
export function ensurePoolReady(): Promise<void> {
  if (pool) return Promise.resolve();
  if (poolInitPromise) return poolInitPromise;
  poolInitPromise = initializePool();
  return poolInitPromise;
}

/**
 * Database interface that provides query methods
 */
export const db = {
  /**
   * Execute a query with parameters
   */
  async query<T = Record<string, unknown>>(
    sql: string,
    params?: unknown[]
  ): Promise<DbQueryResult<T>> {
    const result = await getPool().query(sql, params);
    return {
      rows: result.rows as T[],
      rowCount: result.rowCount,
    };
  },

  /**
   * Get a single row from query result
   */
  async queryOne<T = Record<string, unknown>>(
    sql: string,
    params?: unknown[]
  ): Promise<T | undefined> {
    const result = await getPool().query(sql, params);
    return result.rows[0] as T | undefined;
  },

  /**
   * Get all rows from query result
   */
  async queryAll<T = Record<string, unknown>>(
    sql: string,
    params?: unknown[]
  ): Promise<T[]> {
    const result = await getPool().query(sql, params);
    return result.rows as T[];
  },

  /**
   * Execute a statement (INSERT, UPDATE, DELETE) and return affected row count
   */
  async execute(sql: string, params?: unknown[]): Promise<number> {
    const result = await getPool().query(sql, params);
    return result.rowCount ?? 0;
  },

  /**
   * Get a client from the pool for transactions
   */
  async getClient(): Promise<PoolClient> {
    return getPool().connect();
  },

  /**
   * Get the underlying pool for advanced usage
   */
  getPool(): Pool {
    return getPool();
  },
};

/**
 * Calculate jittered exponential backoff delay
 * Base delay starts at 50-100ms and doubles with each retry
 */
function calculateBackoffDelay(attempt: number): number {
  const baseDelay = 50 + Math.random() * 50; // 50-100ms base
  const exponentialDelay = baseDelay * Math.pow(2, attempt - 1);
  const jitter = exponentialDelay * 0.1 * Math.random(); // 10% jitter
  return Math.min(exponentialDelay + jitter, 5000); // Cap at 5 seconds
}

/**
 * Execute a function within a transaction with automatic retry on serialization failure
 *
 * PgBouncer Compatibility:
 * - Uses a single client for all retry attempts (required for transaction mode)
 * - Releases the client only after all retries complete or succeed
 * - Uses jittered exponential backoff to reduce contention
 */
export async function transaction<T>(
  fn: (client: PoolClient) => Promise<T>,
  options?: { retries?: number; isolationLevel?: 'READ COMMITTED' | 'REPEATABLE READ' | 'SERIALIZABLE' }
): Promise<T> {
  const maxRetries = options?.retries ?? 3;
  const isolationLevel = options?.isolationLevel ?? 'READ COMMITTED';

  // Acquire a single client for all retry attempts (PgBouncer transaction mode compatible)
  const client = await getPool().connect();

  try {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        await client.query(`BEGIN ISOLATION LEVEL ${isolationLevel}`);
        const result = await fn(client);
        await client.query('COMMIT');
        return result;
      } catch (error: any) {
        await client.query('ROLLBACK').catch(() => {
          // Ignore rollback errors - connection may be in bad state
        });

        // Retry on serialization failure (code 40001) or deadlock (code 40P01)
        const isRetryable = error.code === '40001' || error.code === '40P01';
        if (isRetryable && attempt < maxRetries) {
          const delay = calculateBackoffDelay(attempt);
          log.warn({ attempt, maxRetries, code: error.code, delayMs: delay }, 'Transaction retry');
          await new Promise((resolve) => setTimeout(resolve, delay));
          continue;
        }
        throw error;
      }
    }

    throw new Error('Transaction failed after max retries');
  } finally {
    client.release();
  }
}

/**
 * Execute a function with advisory lock for distributed locking
 */
export async function withAdvisoryLock<T>(
  lockId: number,
  fn: () => Promise<T>,
  timeout?: number
): Promise<T> {
  const client = await getPool().connect();
  try {
    // Try to acquire lock with timeout
    if (timeout) {
      await client.query('SET lock_timeout = $1', [timeout]);
    }

    const lockResult = await client.query('SELECT pg_try_advisory_lock($1)', [lockId]);
    if (!lockResult.rows[0]?.pg_try_advisory_lock) {
      throw new Error(`Could not acquire advisory lock ${lockId}`);
    }

    try {
      return await fn();
    } finally {
      await client.query('SELECT pg_advisory_unlock($1)', [lockId]);
    }
  } finally {
    client.release();
  }
}

/**
 * Close the database pool
 */
export async function closePool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
    log.info('PostgreSQL pool closed');
  }
}

// Legacy alias for compatibility
export const closeDatabase = closePool;

// Standalone query function exports for convenience
export async function query<T = Record<string, unknown>>(
  sql: string,
  params?: unknown[]
): Promise<DbQueryResult<T>> {
  return db.query<T>(sql, params);
}

export async function queryOne<T = Record<string, unknown>>(
  sql: string,
  params?: unknown[]
): Promise<T | undefined> {
  return db.queryOne<T>(sql, params);
}

export async function queryAll<T = Record<string, unknown>>(
  sql: string,
  params?: unknown[]
): Promise<T[]> {
  return db.queryAll<T>(sql, params);
}

// Standalone execute function
export async function execute(sql: string, params?: unknown[]): Promise<number> {
  return db.execute(sql, params);
}

// Health check alias
export const healthCheck = isPoolHealthy;

// Pool stats alias
export const getPoolStats = getPoolMetrics;

/**
 * Execute a function within a SERIALIZABLE transaction with automatic retry
 */
export async function serializableTransaction<T>(
  fn: (client: PoolClient) => Promise<T>,
  options?: { retries?: number }
): Promise<T> {
  return transaction(fn, { ...options, isolationLevel: 'SERIALIZABLE' });
}
