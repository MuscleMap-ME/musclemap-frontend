/**
 * Database Client
 *
 * Unified database interface for PostgreSQL.
 * Provides a similar API to the previous SQLite client for easy migration.
 */

import { PoolClient, QueryResultRow } from 'pg';
import {
  query,
  queryOne,
  queryAll,
  execute,
  transaction as pgTransaction,
  serializableTransaction,
  getPool,
  closePool,
  healthCheck,
  getPoolStats,
  sql,
  upsert,
  batchInsert,
} from './postgres';
import { loggers } from '../lib/logger';

const log = loggers.db;

/**
 * PreparedStatement-like interface for PostgreSQL
 * Converts SQLite-style ? placeholders to PostgreSQL $1, $2, etc.
 */
interface PreparedStatement {
  get<T = any>(...params: any[]): Promise<T | null>;
  all<T = any>(...params: any[]): Promise<T[]>;
  run(...params: any[]): Promise<{ changes: number }>;
}

/**
 * Database client with prepared statement-like interface
 *
 * Provides compatibility with the previous SQLite API while using PostgreSQL.
 */
export const db = {
  /**
   * Create a prepared statement-like object
   * Note: PostgreSQL caches execution plans automatically
   */
  prepare(text: string): PreparedStatement {
    // Convert SQLite-style ? placeholders to PostgreSQL $1, $2, etc.
    let paramIndex = 0;
    const pgText = text.replace(/\?/g, () => `$${++paramIndex}`);

    // Convert SQLite date functions to PostgreSQL
    const convertedText = pgText
      .replace(/datetime\('now'\)/gi, 'NOW()')
      .replace(/date\('now'\)/gi, 'CURRENT_DATE')
      .replace(/date\('now',\s*'([^']+)'\)/gi, "CURRENT_DATE + INTERVAL '$1'")
      .replace(/datetime\('now',\s*'([^']+)'\)/gi, "NOW() + INTERVAL '$1'");

    return {
      async get<T = any>(...params: any[]): Promise<T | null> {
        return queryOne<T & QueryResultRow>(convertedText, params);
      },

      async all<T = any>(...params: any[]): Promise<T[]> {
        return queryAll<T & QueryResultRow>(convertedText, params);
      },

      async run(...params: any[]): Promise<{ changes: number }> {
        const result = await query(convertedText, params);
        return { changes: result.rowCount || 0 };
      },
    };
  },

  /**
   * Execute raw SQL (for schema operations)
   */
  async exec(text: string) {
    return query(text);
  },

  /**
   * Close the database connection
   */
  close() {
    return closePool();
  },
};

/**
 * Transaction wrapper
 *
 * Usage:
 *   const result = await transaction(async (client) => {
 *     await client.query('INSERT INTO users ...');
 *     return { success: true };
 *   });
 */
export async function transaction<T>(
  fn: ((client: PoolClient) => Promise<T>) | (() => T | Promise<T>)
): Promise<T> {
  // Wrap in async transaction
  return pgTransaction(async (client) => {
    if (fn.length === 0) {
      // Legacy-style function without client parameter
      return (fn as () => T | Promise<T>)();
    }
    return (fn as (client: PoolClient) => Promise<T>)(client);
  });
}

/**
 * Serializable transaction for operations requiring strongest isolation
 */
export { serializableTransaction };

/**
 * Direct query functions for new code
 */
export { query, queryOne, queryAll, execute, sql, upsert, batchInsert };

/**
 * Pool management
 */
export { getPool, closePool as closeDatabase, healthCheck, getPoolStats };

// Initialize connection on import
log.info('PostgreSQL client initialized');

// Re-export for compatibility
export default db;
