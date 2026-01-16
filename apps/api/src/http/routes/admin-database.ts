/**
 * Admin Database Management Routes
 *
 * Provides API endpoints for database administration from the Empire dashboard:
 * - View table statistics (sizes, row counts, index sizes)
 * - List all tables with metadata
 * - Execute read-only SQL queries (SELECT only)
 * - View slow query log
 * - Monitor connection pool stats
 * - View index usage statistics
 * - Trigger VACUUM ANALYZE operations
 * - View active locks
 *
 * SECURITY: All routes require admin authentication
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { db, getPoolMetrics } from '../../db/client';
import { loggers } from '../../lib/logger';

const log = loggers.api;

// ============================================
// SCHEMAS
// ============================================

const QuerySchema = z.object({
  sql: z.string().min(1).max(10000),
  params: z.array(z.unknown()).optional().default([]),
  limit: z.number().min(1).max(1000).optional().default(100),
});

const VacuumSchema = z.object({
  table: z.string().min(1).max(128).regex(/^[a-z_][a-z0-9_]*$/i, 'Invalid table name'),
  analyze: z.boolean().optional().default(true),
  full: z.boolean().optional().default(false),
});

const SlowQuerySchema = z.object({
  minDuration: z.coerce.number().min(0).optional().default(1000), // milliseconds
  limit: z.coerce.number().min(1).max(100).optional().default(20),
});

const IndexStatsSchema = z.object({
  minSize: z.coerce.number().min(0).optional().default(0), // bytes
  unusedOnly: z.coerce.boolean().optional().default(false),
});

// ============================================
// TYPES
// ============================================

interface TableStats {
  table_name: string;
  schema_name: string;
  row_count: number;
  total_size: string;
  table_size: string;
  index_size: string;
  toast_size: string;
  total_bytes: number;
}

interface TableInfo {
  table_name: string;
  schema_name: string;
  table_type: string;
  row_count: number;
  column_count: number;
  has_primary_key: boolean;
  has_indexes: boolean;
  created_at: Date | null;
}

interface IndexStats {
  schema_name: string;
  table_name: string;
  index_name: string;
  index_type: string;
  index_size: string;
  index_bytes: number;
  idx_scan: number;
  idx_tup_read: number;
  idx_tup_fetch: number;
  is_unique: boolean;
  is_primary: boolean;
  index_definition: string;
}

interface SlowQuery {
  query: string;
  calls: number;
  total_time: number;
  mean_time: number;
  min_time: number;
  max_time: number;
  rows: number;
  shared_blks_hit: number;
  shared_blks_read: number;
}

interface ActiveLock {
  pid: number;
  database: string;
  relation: string;
  lock_type: string;
  mode: string;
  granted: boolean;
  query: string;
  waiting_since: Date | null;
  state: string;
  application_name: string;
}

interface ConnectionStats {
  pool: {
    totalConnections: number;
    idleConnections: number;
    waitingClients: number;
  };
  database: {
    max_connections: number;
    current_connections: number;
    active_connections: number;
    idle_connections: number;
    idle_in_transaction: number;
    waiting_connections: number;
  };
  by_state: Record<string, number>;
  by_application: Record<string, number>;
}

// ============================================
// HELPERS
// ============================================

/**
 * Validate that a query is read-only (SELECT only)
 */
function isReadOnlyQuery(sql: string): boolean {
  // Normalize whitespace and convert to uppercase for checking
  const normalized = sql.trim().toUpperCase();

  // Must start with SELECT, WITH (for CTEs), or EXPLAIN
  const allowedStarts = ['SELECT', 'WITH', 'EXPLAIN'];
  const startsValid = allowedStarts.some(start => normalized.startsWith(start));

  if (!startsValid) {
    return false;
  }

  // Check for dangerous keywords that shouldn't appear in read-only queries
  const dangerousKeywords = [
    'INSERT',
    'UPDATE',
    'DELETE',
    'DROP',
    'CREATE',
    'ALTER',
    'TRUNCATE',
    'GRANT',
    'REVOKE',
    'COPY',
    'VACUUM',
    'REINDEX',
    'CLUSTER',
    'REFRESH',
    'LOCK',
    'SET ',  // Space to avoid matching OFFSET
    'RESET',
    'DISCARD',
    'COMMENT',
    'SECURITY',
    'OWNER',
  ];

  for (const keyword of dangerousKeywords) {
    // Check for keyword as a standalone word (not part of a string literal or identifier)
    const regex = new RegExp(`(^|[\\s(])${keyword}([\\s(]|$)`, 'i');
    if (regex.test(sql)) {
      return false;
    }
  }

  return true;
}

/**
 * Format bytes to human readable string
 */
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

// ============================================
// ROUTES
// ============================================

export default async function adminDatabaseRoutes(fastify: FastifyInstance) {
  // All routes require admin authentication
  fastify.addHook('preHandler', async (request: FastifyRequest, reply: FastifyReply) => {
    // Check if user is authenticated and is admin
    const user = (request as { user?: { role?: string; roles?: string[] } }).user;
    const roles = user?.roles || [];
    const isAdmin = user?.role === 'admin' || roles.includes('admin') || roles.includes('super_admin');

    if (!user || !isAdmin) {
      return reply.status(403).send({ error: 'Admin access required' });
    }
  });

  // ----------------------------------------
  // GET /admin/database/stats
  // Get table sizes, row counts, index sizes
  // ----------------------------------------
  fastify.get('/admin/database/stats', async (_request, reply) => {
    try {
      const stats = await db.queryAll<TableStats>(`
        SELECT
          schemaname AS schema_name,
          relname AS table_name,
          n_live_tup AS row_count,
          pg_size_pretty(pg_total_relation_size(relid)) AS total_size,
          pg_size_pretty(pg_relation_size(relid)) AS table_size,
          pg_size_pretty(pg_indexes_size(relid)) AS index_size,
          pg_size_pretty(pg_total_relation_size(relid) - pg_relation_size(relid) - pg_indexes_size(relid)) AS toast_size,
          pg_total_relation_size(relid) AS total_bytes
        FROM pg_stat_user_tables
        ORDER BY pg_total_relation_size(relid) DESC
      `);

      // Get database size
      const dbSize = await db.queryOne<{ size: string; bytes: number }>(`
        SELECT
          pg_size_pretty(pg_database_size(current_database())) AS size,
          pg_database_size(current_database()) AS bytes
      `);

      // Get total rows
      const totalRows = stats.reduce((sum, t) => sum + (t.row_count || 0), 0);
      const totalBytes = stats.reduce((sum, t) => sum + (t.total_bytes || 0), 0);

      return reply.send({
        success: true,
        database: {
          name: await db.queryOne<{ current_database: string }>('SELECT current_database()').then(r => r?.current_database),
          size: dbSize?.size || 'Unknown',
          bytes: dbSize?.bytes || 0,
        },
        summary: {
          tableCount: stats.length,
          totalRows,
          totalSize: formatBytes(totalBytes),
          totalBytes,
        },
        tables: stats,
      });
    } catch (err) {
      log.error({ error: err }, 'Failed to get database stats');
      return reply.status(500).send({ error: (err as Error).message });
    }
  });

  // ----------------------------------------
  // GET /admin/database/tables
  // List all tables with metadata
  // ----------------------------------------
  fastify.get('/admin/database/tables', async (_request, reply) => {
    try {
      const tables = await db.queryAll<TableInfo>(`
        SELECT
          t.table_schema AS schema_name,
          t.table_name,
          t.table_type,
          COALESCE(s.n_live_tup, 0) AS row_count,
          (
            SELECT COUNT(*)::int
            FROM information_schema.columns c
            WHERE c.table_schema = t.table_schema
              AND c.table_name = t.table_name
          ) AS column_count,
          EXISTS (
            SELECT 1 FROM information_schema.table_constraints tc
            WHERE tc.table_schema = t.table_schema
              AND tc.table_name = t.table_name
              AND tc.constraint_type = 'PRIMARY KEY'
          ) AS has_primary_key,
          EXISTS (
            SELECT 1 FROM pg_indexes pi
            WHERE pi.schemaname = t.table_schema
              AND pi.tablename = t.table_name
          ) AS has_indexes,
          NULL::timestamp AS created_at
        FROM information_schema.tables t
        LEFT JOIN pg_stat_user_tables s
          ON s.schemaname = t.table_schema AND s.relname = t.table_name
        WHERE t.table_schema NOT IN ('pg_catalog', 'information_schema')
          AND t.table_type IN ('BASE TABLE', 'VIEW')
        ORDER BY t.table_schema, t.table_name
      `);

      // Get column details for each table
      const tableDetails = await Promise.all(
        tables.slice(0, 50).map(async (table) => {
          const columns = await db.queryAll<{
            column_name: string;
            data_type: string;
            is_nullable: string;
            column_default: string | null;
          }>(`
            SELECT column_name, data_type, is_nullable, column_default
            FROM information_schema.columns
            WHERE table_schema = $1 AND table_name = $2
            ORDER BY ordinal_position
          `, [table.schema_name, table.table_name]);

          return {
            ...table,
            columns: columns.slice(0, 20), // Limit columns per table
          };
        })
      );

      return reply.send({
        success: true,
        count: tables.length,
        tables: tableDetails,
      });
    } catch (err) {
      log.error({ error: err }, 'Failed to list tables');
      return reply.status(500).send({ error: (err as Error).message });
    }
  });

  // ----------------------------------------
  // POST /admin/database/query
  // Execute read-only SQL queries (SELECT only)
  // ----------------------------------------
  fastify.post('/admin/database/query', async (request, reply) => {
    try {
      const body = QuerySchema.parse(request.body);

      // Validate query is read-only
      if (!isReadOnlyQuery(body.sql)) {
        return reply.status(400).send({
          error: 'Only SELECT queries are allowed',
          hint: 'Use SELECT, WITH, or EXPLAIN statements only',
        });
      }

      // Add LIMIT if not present
      let sql = body.sql.trim();
      if (!sql.toUpperCase().includes('LIMIT') && !sql.toUpperCase().startsWith('EXPLAIN')) {
        sql = `${sql} LIMIT ${body.limit}`;
      }

      const startTime = Date.now();
      const result = await db.query(sql, body.params);
      const duration = Date.now() - startTime;

      log.info({
        query: sql.substring(0, 200),
        rows: result.rowCount,
        duration,
        userId: (request as unknown as { user?: { userId: string } }).user?.userId,
      }, 'Admin query executed');

      return reply.send({
        success: true,
        rows: result.rows,
        rowCount: result.rowCount,
        duration,
        query: sql,
      });
    } catch (err) {
      if (err instanceof z.ZodError) {
        return reply.status(400).send({ error: 'Invalid request', details: err.errors });
      }
      log.error({ error: err }, 'Query execution failed');
      return reply.status(500).send({ error: (err as Error).message });
    }
  });

  // ----------------------------------------
  // GET /admin/database/slow-queries
  // Get slow query log (requires pg_stat_statements extension)
  // ----------------------------------------
  fastify.get('/admin/database/slow-queries', async (request, reply) => {
    try {
      const query = SlowQuerySchema.parse(request.query);

      // Check if pg_stat_statements is available
      const hasExtension = await db.queryOne<{ exists: boolean }>(`
        SELECT EXISTS (
          SELECT 1 FROM pg_extension WHERE extname = 'pg_stat_statements'
        ) AS exists
      `);

      if (!hasExtension?.exists) {
        return reply.send({
          success: true,
          available: false,
          message: 'pg_stat_statements extension is not enabled',
          slowQueries: [],
        });
      }

      const slowQueries = await db.queryAll<SlowQuery>(`
        SELECT
          query,
          calls,
          total_exec_time AS total_time,
          mean_exec_time AS mean_time,
          min_exec_time AS min_time,
          max_exec_time AS max_time,
          rows,
          shared_blks_hit,
          shared_blks_read
        FROM pg_stat_statements
        WHERE mean_exec_time > $1
          AND query NOT LIKE '%pg_stat_statements%'
        ORDER BY mean_exec_time DESC
        LIMIT $2
      `, [query.minDuration, query.limit]);

      return reply.send({
        success: true,
        available: true,
        minDuration: query.minDuration,
        count: slowQueries.length,
        slowQueries: slowQueries.map(q => ({
          ...q,
          query: q.query.substring(0, 500), // Truncate long queries
          total_time_formatted: `${(q.total_time / 1000).toFixed(2)}s`,
          mean_time_formatted: `${q.mean_time.toFixed(2)}ms`,
        })),
      });
    } catch (err) {
      if (err instanceof z.ZodError) {
        return reply.status(400).send({ error: 'Invalid request', details: err.errors });
      }
      log.error({ error: err }, 'Failed to get slow queries');
      return reply.status(500).send({ error: (err as Error).message });
    }
  });

  // ----------------------------------------
  // GET /admin/database/connections
  // Connection pool stats
  // ----------------------------------------
  fastify.get('/admin/database/connections', async (_request, reply) => {
    try {
      // Get pool metrics
      const poolMetrics = getPoolMetrics();

      // Get database connection stats
      const dbStats = await db.queryOne<{
        max_connections: number;
        current_connections: number;
        active_connections: number;
        idle_connections: number;
        idle_in_transaction: number;
        waiting_connections: number;
      }>(`
        SELECT
          (SELECT setting::int FROM pg_settings WHERE name = 'max_connections') AS max_connections,
          (SELECT COUNT(*) FROM pg_stat_activity)::int AS current_connections,
          (SELECT COUNT(*) FROM pg_stat_activity WHERE state = 'active')::int AS active_connections,
          (SELECT COUNT(*) FROM pg_stat_activity WHERE state = 'idle')::int AS idle_connections,
          (SELECT COUNT(*) FROM pg_stat_activity WHERE state = 'idle in transaction')::int AS idle_in_transaction,
          (SELECT COUNT(*) FROM pg_stat_activity WHERE wait_event IS NOT NULL)::int AS waiting_connections
      `);

      // Get connections by state
      const byState = await db.queryAll<{ state: string; count: number }>(`
        SELECT COALESCE(state, 'null') AS state, COUNT(*)::int AS count
        FROM pg_stat_activity
        WHERE datname = current_database()
        GROUP BY state
        ORDER BY count DESC
      `);

      // Get connections by application
      const byApp = await db.queryAll<{ application_name: string; count: number }>(`
        SELECT COALESCE(application_name, 'unknown') AS application_name, COUNT(*)::int AS count
        FROM pg_stat_activity
        WHERE datname = current_database()
        GROUP BY application_name
        ORDER BY count DESC
        LIMIT 10
      `);

      const stats: ConnectionStats = {
        pool: poolMetrics,
        database: {
          max_connections: dbStats?.max_connections || 0,
          current_connections: dbStats?.current_connections || 0,
          active_connections: dbStats?.active_connections || 0,
          idle_connections: dbStats?.idle_connections || 0,
          idle_in_transaction: dbStats?.idle_in_transaction || 0,
          waiting_connections: dbStats?.waiting_connections || 0,
        },
        by_state: Object.fromEntries(byState.map(s => [s.state, s.count])),
        by_application: Object.fromEntries(byApp.map(a => [a.application_name, a.count])),
      };

      return reply.send({
        success: true,
        ...stats,
      });
    } catch (err) {
      log.error({ error: err }, 'Failed to get connection stats');
      return reply.status(500).send({ error: (err as Error).message });
    }
  });

  // ----------------------------------------
  // GET /admin/database/indexes
  // Index usage statistics
  // ----------------------------------------
  fastify.get('/admin/database/indexes', async (request, reply) => {
    try {
      const query = IndexStatsSchema.parse(request.query);

      let sql = `
        SELECT
          schemaname AS schema_name,
          relname AS table_name,
          indexrelname AS index_name,
          CASE
            WHEN idx.indisunique THEN 'UNIQUE'
            WHEN idx.indisprimary THEN 'PRIMARY'
            ELSE 'INDEX'
          END AS index_type,
          pg_size_pretty(pg_relation_size(indexrelid)) AS index_size,
          pg_relation_size(indexrelid) AS index_bytes,
          idx_scan,
          idx_tup_read,
          idx_tup_fetch,
          idx.indisunique AS is_unique,
          idx.indisprimary AS is_primary,
          pg_get_indexdef(indexrelid) AS index_definition
        FROM pg_stat_user_indexes psi
        JOIN pg_index idx ON idx.indexrelid = psi.indexrelid
        WHERE pg_relation_size(indexrelid) >= $1
      `;

      const params: unknown[] = [query.minSize];

      if (query.unusedOnly) {
        sql += ` AND idx_scan = 0`;
      }

      sql += ` ORDER BY pg_relation_size(indexrelid) DESC`;

      const indexes = await db.queryAll<IndexStats>(sql, params);

      // Calculate summary stats
      const totalBytes = indexes.reduce((sum, i) => sum + (i.index_bytes || 0), 0);
      const unusedCount = indexes.filter(i => i.idx_scan === 0).length;
      const unusedBytes = indexes.filter(i => i.idx_scan === 0).reduce((sum, i) => sum + (i.index_bytes || 0), 0);

      return reply.send({
        success: true,
        summary: {
          totalIndexes: indexes.length,
          totalSize: formatBytes(totalBytes),
          totalBytes,
          unusedIndexes: unusedCount,
          unusedSize: formatBytes(unusedBytes),
          unusedBytes,
        },
        indexes: indexes.map(i => ({
          ...i,
          index_definition: i.index_definition.substring(0, 300), // Truncate long definitions
        })),
      });
    } catch (err) {
      if (err instanceof z.ZodError) {
        return reply.status(400).send({ error: 'Invalid request', details: err.errors });
      }
      log.error({ error: err }, 'Failed to get index stats');
      return reply.status(500).send({ error: (err as Error).message });
    }
  });

  // ----------------------------------------
  // POST /admin/database/vacuum
  // Trigger VACUUM ANALYZE on a table
  // ----------------------------------------
  fastify.post('/admin/database/vacuum', async (request, reply) => {
    try {
      const body = VacuumSchema.parse(request.body);

      // Verify table exists
      const tableExists = await db.queryOne<{ exists: boolean }>(`
        SELECT EXISTS (
          SELECT 1 FROM information_schema.tables
          WHERE table_schema = 'public'
            AND table_name = $1
        ) AS exists
      `, [body.table]);

      if (!tableExists?.exists) {
        return reply.status(404).send({ error: `Table '${body.table}' not found` });
      }

      // Build VACUUM command
      const options: string[] = [];
      if (body.full) options.push('FULL');
      if (body.analyze) options.push('ANALYZE');

      const vacuumCmd = options.length > 0
        ? `VACUUM (${options.join(', ')}) ${body.table}`
        : `VACUUM ${body.table}`;

      const startTime = Date.now();

      // VACUUM cannot run in a transaction, so we use a raw query
      await db.query(vacuumCmd);

      const duration = Date.now() - startTime;

      log.info({
        table: body.table,
        full: body.full,
        analyze: body.analyze,
        duration,
        userId: (request as unknown as { user?: { userId: string } }).user?.userId,
      }, 'VACUUM executed');

      // Get updated table stats
      const stats = await db.queryOne<{
        n_live_tup: number;
        n_dead_tup: number;
        last_vacuum: Date;
        last_analyze: Date;
      }>(`
        SELECT n_live_tup, n_dead_tup, last_vacuum, last_analyze
        FROM pg_stat_user_tables
        WHERE relname = $1
      `, [body.table]);

      return reply.send({
        success: true,
        table: body.table,
        command: vacuumCmd,
        duration,
        stats: {
          liveRows: stats?.n_live_tup || 0,
          deadRows: stats?.n_dead_tup || 0,
          lastVacuum: stats?.last_vacuum,
          lastAnalyze: stats?.last_analyze,
        },
      });
    } catch (err) {
      if (err instanceof z.ZodError) {
        return reply.status(400).send({ error: 'Invalid request', details: err.errors });
      }
      log.error({ error: err }, 'VACUUM failed');
      return reply.status(500).send({ error: (err as Error).message });
    }
  });

  // ----------------------------------------
  // GET /admin/database/locks
  // View active locks
  // ----------------------------------------
  fastify.get('/admin/database/locks', async (_request, reply) => {
    try {
      const locks = await db.queryAll<ActiveLock>(`
        SELECT
          pg_locks.pid,
          pg_database.datname AS database,
          COALESCE(pg_class.relname, 'N/A') AS relation,
          pg_locks.locktype AS lock_type,
          pg_locks.mode,
          pg_locks.granted,
          pg_stat_activity.query,
          CASE
            WHEN pg_locks.granted = false THEN pg_stat_activity.query_start
            ELSE NULL
          END AS waiting_since,
          pg_stat_activity.state,
          pg_stat_activity.application_name
        FROM pg_locks
        LEFT JOIN pg_class ON pg_locks.relation = pg_class.oid
        LEFT JOIN pg_database ON pg_locks.database = pg_database.oid
        LEFT JOIN pg_stat_activity ON pg_locks.pid = pg_stat_activity.pid
        WHERE pg_database.datname = current_database()
          AND pg_locks.pid != pg_backend_pid()
        ORDER BY
          pg_locks.granted ASC,
          pg_stat_activity.query_start ASC
      `);

      // Summary
      const waiting = locks.filter(l => !l.granted);
      const byType = locks.reduce((acc, l) => {
        acc[l.lock_type] = (acc[l.lock_type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      const byMode = locks.reduce((acc, l) => {
        acc[l.mode] = (acc[l.mode] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      return reply.send({
        success: true,
        summary: {
          totalLocks: locks.length,
          waitingLocks: waiting.length,
          byType,
          byMode,
        },
        locks: locks.map(l => ({
          ...l,
          query: l.query?.substring(0, 200) || null, // Truncate long queries
        })),
      });
    } catch (err) {
      log.error({ error: err }, 'Failed to get locks');
      return reply.status(500).send({ error: (err as Error).message });
    }
  });

  // ----------------------------------------
  // GET /admin/database/health
  // Database health overview
  // ----------------------------------------
  fastify.get('/admin/database/health', async (_request, reply) => {
    try {
      // Check database uptime and version
      const info = await db.queryOne<{
        version: string;
        uptime: string;
        uptime_seconds: number;
      }>(`
        SELECT
          version() AS version,
          age(clock_timestamp(), pg_postmaster_start_time())::text AS uptime,
          EXTRACT(EPOCH FROM age(clock_timestamp(), pg_postmaster_start_time()))::int AS uptime_seconds
      `);

      // Check for bloated tables (dead tuples)
      const bloatedTables = await db.queryAll<{
        table_name: string;
        dead_tuples: number;
        live_tuples: number;
        bloat_ratio: number;
      }>(`
        SELECT
          relname AS table_name,
          n_dead_tup AS dead_tuples,
          n_live_tup AS live_tuples,
          CASE
            WHEN n_live_tup > 0 THEN ROUND(n_dead_tup::numeric / n_live_tup * 100, 2)
            ELSE 0
          END AS bloat_ratio
        FROM pg_stat_user_tables
        WHERE n_dead_tup > 1000
        ORDER BY n_dead_tup DESC
        LIMIT 10
      `);

      // Check for tables never vacuumed
      const neverVacuumed = await db.queryAll<{
        table_name: string;
        row_count: number;
      }>(`
        SELECT relname AS table_name, n_live_tup AS row_count
        FROM pg_stat_user_tables
        WHERE last_vacuum IS NULL
          AND last_autovacuum IS NULL
          AND n_live_tup > 100
        ORDER BY n_live_tup DESC
        LIMIT 10
      `);

      // Check cache hit ratio
      const cacheStats = await db.queryOne<{
        heap_hit_ratio: number;
        index_hit_ratio: number;
      }>(`
        SELECT
          ROUND(100.0 * SUM(heap_blks_hit) / NULLIF(SUM(heap_blks_hit) + SUM(heap_blks_read), 0), 2) AS heap_hit_ratio,
          ROUND(100.0 * SUM(idx_blks_hit) / NULLIF(SUM(idx_blks_hit) + SUM(idx_blks_read), 0), 2) AS index_hit_ratio
        FROM pg_statio_user_tables
      `);

      // Check transaction stats
      const txStats = await db.queryOne<{
        commits: number;
        rollbacks: number;
        conflicts: number;
      }>(`
        SELECT
          xact_commit AS commits,
          xact_rollback AS rollbacks,
          conflicts
        FROM pg_stat_database
        WHERE datname = current_database()
      `);

      const health = {
        status: 'healthy',
        issues: [] as string[],
      };

      // Evaluate health
      if ((cacheStats?.heap_hit_ratio || 0) < 95) {
        health.issues.push(`Low heap cache hit ratio: ${cacheStats?.heap_hit_ratio}%`);
      }
      if ((cacheStats?.index_hit_ratio || 0) < 95) {
        health.issues.push(`Low index cache hit ratio: ${cacheStats?.index_hit_ratio}%`);
      }
      if (bloatedTables.some(t => t.bloat_ratio > 20)) {
        health.issues.push('Some tables have high bloat ratio (>20%)');
      }
      if (neverVacuumed.length > 5) {
        health.issues.push(`${neverVacuumed.length} tables have never been vacuumed`);
      }

      if (health.issues.length > 0) {
        health.status = health.issues.length > 2 ? 'degraded' : 'warning';
      }

      return reply.send({
        success: true,
        health,
        database: {
          version: info?.version.split(' ').slice(0, 2).join(' '),
          uptime: info?.uptime,
          uptimeSeconds: info?.uptime_seconds,
        },
        cache: {
          heapHitRatio: cacheStats?.heap_hit_ratio || 0,
          indexHitRatio: cacheStats?.index_hit_ratio || 0,
        },
        transactions: txStats,
        bloatedTables,
        neverVacuumed,
      });
    } catch (err) {
      log.error({ error: err }, 'Failed to get database health');
      return reply.status(500).send({ error: (err as Error).message });
    }
  });
}
