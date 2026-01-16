/**
 * Admin Log Analysis Routes
 *
 * Provides API endpoints for comprehensive log analysis from the Empire dashboard:
 * - Search logs with filters (level, time range, message pattern)
 * - Aggregate logs by level, endpoint, error type
 * - Group errors by type with count
 * - Detect common log patterns
 * - Export logs to JSON/CSV
 * - Get latest N log entries (tail)
 * - Real-time log streaming via WebSocket
 *
 * SECURITY: All routes require admin authentication
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { spawn, exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';
import { authenticate, requireAdmin, verifyToken } from './auth';
import { loggers } from '../../lib/logger';

const execAsync = promisify(exec);
const log = loggers.api.child({ module: 'admin-logs' });

// ============================================
// SCHEMAS
// ============================================

const LogLevelEnum = z.enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal']);

const SearchLogsSchema = z.object({
  level: LogLevelEnum.optional(),
  startTime: z.string().datetime().optional(),
  endTime: z.string().datetime().optional(),
  search: z.string().optional(), // Regex pattern
  endpoint: z.string().optional(),
  module: z.string().optional(),
  limit: z.coerce.number().min(1).max(10000).default(100),
  offset: z.coerce.number().min(0).default(0),
});

const AggregationsSchema = z.object({
  groupBy: z.enum(['level', 'endpoint', 'error_type', 'module', 'hour']).default('level'),
  startTime: z.string().datetime().optional(),
  endTime: z.string().datetime().optional(),
  level: LogLevelEnum.optional(),
});

const ErrorsSchema = z.object({
  startTime: z.string().datetime().optional(),
  endTime: z.string().datetime().optional(),
  limit: z.coerce.number().min(1).max(1000).default(100),
});

const PatternsSchema = z.object({
  startTime: z.string().datetime().optional(),
  endTime: z.string().datetime().optional(),
  minOccurrences: z.coerce.number().min(1).default(3),
});

const ExportSchema = z.object({
  format: z.enum(['json', 'csv']).default('json'),
  level: LogLevelEnum.optional(),
  startTime: z.string().datetime().optional(),
  endTime: z.string().datetime().optional(),
  search: z.string().optional(),
  limit: z.coerce.number().min(1).max(100000).default(10000),
});

const TailSchema = z.object({
  lines: z.coerce.number().min(1).max(1000).default(100),
  process: z.string().default('musclemap'),
  level: LogLevelEnum.optional(),
});

const StreamQuerySchema = z.object({
  token: z.string(),
  process: z.string().default('musclemap'),
  level: LogLevelEnum.optional(),
  search: z.string().optional(),
});

// ============================================
// TYPES
// ============================================

interface LogEntry {
  timestamp: string;
  level: string;
  module?: string;
  msg?: string;
  message?: string;
  endpoint?: string;
  method?: string;
  statusCode?: number;
  responseTime?: number;
  error?: string;
  stack?: string;
  requestId?: string;
  userId?: string;
  [key: string]: unknown;
}

interface LogAggregation {
  key: string;
  count: number;
  percentage: number;
}

interface ErrorGroup {
  errorType: string;
  message: string;
  count: number;
  lastOccurrence: string;
  firstOccurrence: string;
  examples: LogEntry[];
}

interface LogPattern {
  pattern: string;
  occurrences: number;
  examples: string[];
  firstSeen: string;
  lastSeen: string;
}

// ============================================
// HELPERS
// ============================================

const PROJECT_ROOT = process.env.PROJECT_ROOT || '/var/www/musclemap.me';
const PM2_HOME = process.env.PM2_HOME || path.join(process.env.HOME || '/root', '.pm2');

/**
 * Get PM2 log file paths for a process
 */
function getPM2LogPaths(processName: string): { out: string; error: string } {
  return {
    out: path.join(PM2_HOME, 'logs', `${processName}-out.log`),
    error: path.join(PM2_HOME, 'logs', `${processName}-error.log`),
  };
}

/**
 * Parse a log line into a structured LogEntry
 */
function parseLogLine(line: string): LogEntry | null {
  try {
    // Try to parse as JSON (pino format)
    const parsed = JSON.parse(line);
    return {
      timestamp: parsed.time || parsed.timestamp || new Date().toISOString(),
      level: parsed.level || 'info',
      module: parsed.module,
      msg: parsed.msg || parsed.message,
      message: parsed.msg || parsed.message,
      endpoint: parsed.endpoint || parsed.url || parsed.req?.url,
      method: parsed.method || parsed.req?.method,
      statusCode: parsed.statusCode || parsed.res?.statusCode,
      responseTime: parsed.responseTime || parsed.elapsed,
      error: parsed.error || parsed.err?.message,
      stack: parsed.stack || parsed.err?.stack,
      requestId: parsed.requestId || parsed.reqId,
      userId: parsed.userId,
      ...parsed,
    };
  } catch {
    // Fall back to plain text parsing
    const timestampMatch = line.match(/^\[?(\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2}[^\]]*)\]?/);
    const levelMatch = line.match(/\b(trace|debug|info|warn|error|fatal)\b/i);

    return {
      timestamp: timestampMatch?.[1] || new Date().toISOString(),
      level: levelMatch?.[1]?.toLowerCase() || 'info',
      message: line,
      msg: line,
    };
  }
}

/**
 * Read and parse log file with filters
 */
async function readLogs(
  processName: string,
  options: {
    level?: string;
    startTime?: Date;
    endTime?: Date;
    search?: string;
    endpoint?: string;
    module?: string;
    limit?: number;
    offset?: number;
    includeError?: boolean;
  } = {}
): Promise<{ entries: LogEntry[]; total: number }> {
  const { out, error } = getPM2LogPaths(processName);
  const entries: LogEntry[] = [];
  const levelOrder = ['trace', 'debug', 'info', 'warn', 'error', 'fatal'];
  const minLevelIndex = options.level ? levelOrder.indexOf(options.level) : 0;

  const searchRegex = options.search ? new RegExp(options.search, 'i') : null;

  // Read both log files
  const logFiles = options.includeError !== false ? [out, error] : [out];

  for (const logFile of logFiles) {
    try {
      const content = await fs.readFile(logFile, 'utf-8');
      const lines = content.split('\n').filter(Boolean);

      for (const line of lines) {
        const entry = parseLogLine(line);
        if (!entry) continue;

        // Apply filters
        const entryLevel = entry.level?.toLowerCase() || 'info';
        const entryLevelIndex = levelOrder.indexOf(entryLevel);
        if (entryLevelIndex < minLevelIndex) continue;

        if (options.startTime && new Date(entry.timestamp) < options.startTime) continue;
        if (options.endTime && new Date(entry.timestamp) > options.endTime) continue;
        if (options.module && entry.module !== options.module) continue;
        if (options.endpoint && !entry.endpoint?.includes(options.endpoint)) continue;
        if (searchRegex) {
          const searchText = entry.msg || entry.message || JSON.stringify(entry);
          if (!searchRegex.test(searchText)) continue;
        }

        entries.push(entry);
      }
    } catch (err) {
      // File might not exist
      log.debug({ logFile, error: (err as Error).message }, 'Could not read log file');
    }
  }

  // Sort by timestamp descending (newest first)
  entries.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  const total = entries.length;
  const offset = options.offset || 0;
  const limit = options.limit || 100;

  return {
    entries: entries.slice(offset, offset + limit),
    total,
  };
}

/**
 * Get recent logs using PM2 logs command (more reliable for real-time)
 */
async function getPM2Logs(
  processName: string,
  lines: number,
  level?: string
): Promise<LogEntry[]> {
  try {
    const { stdout } = await execAsync(
      `pm2 logs ${processName} --lines ${lines} --nostream --raw 2>&1`,
      { maxBuffer: 50 * 1024 * 1024 }
    );

    const entries: LogEntry[] = [];
    const levelOrder = ['trace', 'debug', 'info', 'warn', 'error', 'fatal'];
    const minLevelIndex = level ? levelOrder.indexOf(level) : 0;

    const logLines = stdout.split('\n').filter(Boolean);
    for (const line of logLines) {
      const entry = parseLogLine(line);
      if (!entry) continue;

      const entryLevel = entry.level?.toLowerCase() || 'info';
      const entryLevelIndex = levelOrder.indexOf(entryLevel);
      if (entryLevelIndex >= minLevelIndex) {
        entries.push(entry);
      }
    }

    return entries;
  } catch (err) {
    log.error({ error: (err as Error).message }, 'Failed to get PM2 logs');
    return [];
  }
}

/**
 * Aggregate logs by a specific field
 */
function aggregateLogs(
  entries: LogEntry[],
  groupBy: string
): LogAggregation[] {
  const counts: Record<string, number> = {};
  const total = entries.length;

  for (const entry of entries) {
    let key: string;
    switch (groupBy) {
      case 'level':
        key = entry.level || 'unknown';
        break;
      case 'endpoint':
        key = entry.endpoint || 'unknown';
        break;
      case 'error_type':
        key = entry.error || entry.stack?.split('\n')[0] || 'unknown';
        break;
      case 'module':
        key = entry.module || 'unknown';
        break;
      case 'hour':
        key = new Date(entry.timestamp).toISOString().slice(0, 13) + ':00:00Z';
        break;
      default:
        key = 'unknown';
    }
    counts[key] = (counts[key] || 0) + 1;
  }

  return Object.entries(counts)
    .map(([key, count]) => ({
      key,
      count,
      percentage: total > 0 ? Math.round((count / total) * 10000) / 100 : 0,
    }))
    .sort((a, b) => b.count - a.count);
}

/**
 * Group errors by type
 */
function groupErrors(entries: LogEntry[]): ErrorGroup[] {
  const errorEntries = entries.filter(
    (e) => e.level === 'error' || e.level === 'fatal' || e.error
  );

  const groups: Record<string, ErrorGroup> = {};

  for (const entry of errorEntries) {
    const errorType = entry.error || entry.stack?.split('\n')[0] || entry.msg || 'Unknown Error';
    const key = errorType.slice(0, 100); // Truncate for grouping

    if (!groups[key]) {
      groups[key] = {
        errorType: key,
        message: entry.msg || entry.message || '',
        count: 0,
        lastOccurrence: entry.timestamp,
        firstOccurrence: entry.timestamp,
        examples: [],
      };
    }

    groups[key].count++;

    if (new Date(entry.timestamp) > new Date(groups[key].lastOccurrence)) {
      groups[key].lastOccurrence = entry.timestamp;
    }
    if (new Date(entry.timestamp) < new Date(groups[key].firstOccurrence)) {
      groups[key].firstOccurrence = entry.timestamp;
    }

    if (groups[key].examples.length < 3) {
      groups[key].examples.push(entry);
    }
  }

  return Object.values(groups).sort((a, b) => b.count - a.count);
}

/**
 * Detect common patterns in log messages
 */
function detectPatterns(entries: LogEntry[], minOccurrences: number): LogPattern[] {
  const patterns: Record<string, { count: number; examples: string[]; timestamps: string[] }> = {};

  for (const entry of entries) {
    const msg = entry.msg || entry.message || '';
    if (!msg) continue;

    // Normalize the message to create a pattern
    // Replace UUIDs, numbers, timestamps, etc. with placeholders
    const pattern = msg
      .replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, '<UUID>')
      .replace(/\b\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2}[^\s]*/g, '<TIMESTAMP>')
      .replace(/\b\d+(\.\d+)?\s*(ms|s|seconds?|minutes?)\b/gi, '<DURATION>')
      .replace(/\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/g, '<IP>')
      .replace(/\b\d+\b/g, '<NUM>')
      .replace(/:\d+/g, ':<PORT>')
      .replace(/\/\w{20,}/g, '/<ID>');

    if (!patterns[pattern]) {
      patterns[pattern] = { count: 0, examples: [], timestamps: [] };
    }

    patterns[pattern].count++;
    patterns[pattern].timestamps.push(entry.timestamp);
    if (patterns[pattern].examples.length < 3) {
      patterns[pattern].examples.push(msg);
    }
  }

  return Object.entries(patterns)
    .filter(([, data]) => data.count >= minOccurrences)
    .map(([pattern, data]) => ({
      pattern,
      occurrences: data.count,
      examples: data.examples,
      firstSeen: data.timestamps.sort()[0],
      lastSeen: data.timestamps.sort().reverse()[0],
    }))
    .sort((a, b) => b.occurrences - a.occurrences);
}

/**
 * Convert log entries to CSV format
 */
function logsToCSV(entries: LogEntry[]): string {
  const headers = ['timestamp', 'level', 'module', 'message', 'endpoint', 'method', 'statusCode', 'responseTime', 'error', 'userId', 'requestId'];
  const rows = entries.map((entry) =>
    headers.map((h) => {
      const value = entry[h];
      if (value === undefined || value === null) return '';
      const str = String(value);
      // Escape quotes and wrap in quotes if contains comma or newline
      if (str.includes(',') || str.includes('\n') || str.includes('"')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    }).join(',')
  );
  return [headers.join(','), ...rows].join('\n');
}

// ============================================
// ROUTES
// ============================================

export default async function adminLogsRoutes(fastify: FastifyInstance): Promise<void> {
  // ----------------------------------------
  // GET /admin/logs/search
  // Search logs with filters
  // ----------------------------------------
  fastify.get(
    '/admin/logs/search',
    { preHandler: [authenticate, requireAdmin] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const query = SearchLogsSchema.parse(request.query);

        const { entries, total } = await readLogs('musclemap', {
          level: query.level,
          startTime: query.startTime ? new Date(query.startTime) : undefined,
          endTime: query.endTime ? new Date(query.endTime) : undefined,
          search: query.search,
          endpoint: query.endpoint,
          module: query.module,
          limit: query.limit,
          offset: query.offset,
        });

        return reply.send({
          entries,
          total,
          limit: query.limit,
          offset: query.offset,
          hasMore: query.offset + entries.length < total,
        });
      } catch (err) {
        if (err instanceof z.ZodError) {
          return reply.status(400).send({ error: 'Invalid request', details: err.errors });
        }
        log.error({ error: (err as Error).message }, 'Log search failed');
        return reply.status(500).send({ error: (err as Error).message });
      }
    }
  );

  // ----------------------------------------
  // GET /admin/logs/aggregations
  // Aggregate logs by level, endpoint, error type
  // ----------------------------------------
  fastify.get(
    '/admin/logs/aggregations',
    { preHandler: [authenticate, requireAdmin] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const query = AggregationsSchema.parse(request.query);

        const { entries } = await readLogs('musclemap', {
          level: query.level,
          startTime: query.startTime ? new Date(query.startTime) : undefined,
          endTime: query.endTime ? new Date(query.endTime) : undefined,
          limit: 100000, // Get all for aggregation
        });

        const aggregations = aggregateLogs(entries, query.groupBy);

        return reply.send({
          groupBy: query.groupBy,
          total: entries.length,
          aggregations,
        });
      } catch (err) {
        if (err instanceof z.ZodError) {
          return reply.status(400).send({ error: 'Invalid request', details: err.errors });
        }
        log.error({ error: (err as Error).message }, 'Log aggregation failed');
        return reply.status(500).send({ error: (err as Error).message });
      }
    }
  );

  // ----------------------------------------
  // GET /admin/logs/errors
  // Group errors by type with count
  // ----------------------------------------
  fastify.get(
    '/admin/logs/errors',
    { preHandler: [authenticate, requireAdmin] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const query = ErrorsSchema.parse(request.query);

        const { entries } = await readLogs('musclemap', {
          level: 'error',
          startTime: query.startTime ? new Date(query.startTime) : undefined,
          endTime: query.endTime ? new Date(query.endTime) : undefined,
          limit: 100000,
          includeError: true,
        });

        const errorGroups = groupErrors(entries).slice(0, query.limit);

        return reply.send({
          total: errorGroups.reduce((sum, g) => sum + g.count, 0),
          groups: errorGroups,
        });
      } catch (err) {
        if (err instanceof z.ZodError) {
          return reply.status(400).send({ error: 'Invalid request', details: err.errors });
        }
        log.error({ error: (err as Error).message }, 'Error grouping failed');
        return reply.status(500).send({ error: (err as Error).message });
      }
    }
  );

  // ----------------------------------------
  // GET /admin/logs/patterns
  // Detect common log patterns
  // ----------------------------------------
  fastify.get(
    '/admin/logs/patterns',
    { preHandler: [authenticate, requireAdmin] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const query = PatternsSchema.parse(request.query);

        const { entries } = await readLogs('musclemap', {
          startTime: query.startTime ? new Date(query.startTime) : undefined,
          endTime: query.endTime ? new Date(query.endTime) : undefined,
          limit: 100000,
        });

        const patterns = detectPatterns(entries, query.minOccurrences);

        return reply.send({
          total: entries.length,
          patterns: patterns.slice(0, 100), // Top 100 patterns
        });
      } catch (err) {
        if (err instanceof z.ZodError) {
          return reply.status(400).send({ error: 'Invalid request', details: err.errors });
        }
        log.error({ error: (err as Error).message }, 'Pattern detection failed');
        return reply.status(500).send({ error: (err as Error).message });
      }
    }
  );

  // ----------------------------------------
  // POST /admin/logs/export
  // Export logs to JSON/CSV
  // ----------------------------------------
  fastify.post(
    '/admin/logs/export',
    { preHandler: [authenticate, requireAdmin] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const body = ExportSchema.parse(request.body);

        const { entries } = await readLogs('musclemap', {
          level: body.level,
          startTime: body.startTime ? new Date(body.startTime) : undefined,
          endTime: body.endTime ? new Date(body.endTime) : undefined,
          search: body.search,
          limit: body.limit,
        });

        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const filename = `musclemap-logs-${timestamp}.${body.format}`;

        if (body.format === 'csv') {
          const csv = logsToCSV(entries);
          return reply
            .header('Content-Type', 'text/csv')
            .header('Content-Disposition', `attachment; filename="${filename}"`)
            .send(csv);
        } else {
          return reply
            .header('Content-Type', 'application/json')
            .header('Content-Disposition', `attachment; filename="${filename}"`)
            .send(JSON.stringify({ entries, exportedAt: new Date().toISOString(), count: entries.length }, null, 2));
        }
      } catch (err) {
        if (err instanceof z.ZodError) {
          return reply.status(400).send({ error: 'Invalid request', details: err.errors });
        }
        log.error({ error: (err as Error).message }, 'Log export failed');
        return reply.status(500).send({ error: (err as Error).message });
      }
    }
  );

  // ----------------------------------------
  // GET /admin/logs/tail
  // Get latest N log entries
  // ----------------------------------------
  fastify.get(
    '/admin/logs/tail',
    { preHandler: [authenticate, requireAdmin] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const query = TailSchema.parse(request.query);

        const entries = await getPM2Logs(query.process, query.lines, query.level);

        return reply.send({
          entries,
          count: entries.length,
          process: query.process,
        });
      } catch (err) {
        if (err instanceof z.ZodError) {
          return reply.status(400).send({ error: 'Invalid request', details: err.errors });
        }
        log.error({ error: (err as Error).message }, 'Log tail failed');
        return reply.status(500).send({ error: (err as Error).message });
      }
    }
  );

  // ----------------------------------------
  // GET /admin/logs/stats
  // Get log statistics summary
  // ----------------------------------------
  fastify.get(
    '/admin/logs/stats',
    { preHandler: [authenticate, requireAdmin] },
    async (_request: FastifyRequest, reply: FastifyReply) => {
      try {
        const now = new Date();
        const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
        const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

        // Get logs from last hour and last day for comparison
        const [lastHour, lastDay] = await Promise.all([
          readLogs('musclemap', { startTime: oneHourAgo, limit: 100000 }),
          readLogs('musclemap', { startTime: oneDayAgo, limit: 100000 }),
        ]);

        const lastHourByLevel = aggregateLogs(lastHour.entries, 'level');
        const lastDayByLevel = aggregateLogs(lastDay.entries, 'level');

        const lastHourErrors = lastHour.entries.filter((e) => e.level === 'error' || e.level === 'fatal').length;
        const lastDayErrors = lastDay.entries.filter((e) => e.level === 'error' || e.level === 'fatal').length;

        return reply.send({
          lastHour: {
            total: lastHour.total,
            byLevel: lastHourByLevel,
            errors: lastHourErrors,
          },
          lastDay: {
            total: lastDay.total,
            byLevel: lastDayByLevel,
            errors: lastDayErrors,
          },
          errorRate: {
            lastHour: lastHour.total > 0 ? Math.round((lastHourErrors / lastHour.total) * 10000) / 100 : 0,
            lastDay: lastDay.total > 0 ? Math.round((lastDayErrors / lastDay.total) * 10000) / 100 : 0,
          },
        });
      } catch (err) {
        log.error({ error: (err as Error).message }, 'Log stats failed');
        return reply.status(500).send({ error: (err as Error).message });
      }
    }
  );

  // ----------------------------------------
  // WebSocket /admin/logs/stream
  // Real-time log streaming with filters
  // ----------------------------------------
  fastify.get('/admin/logs/stream', { websocket: true }, (socket, request) => {
    // Parse and validate query parameters
    let query: z.infer<typeof StreamQuerySchema>;
    try {
      query = StreamQuerySchema.parse(request.query);
    } catch {
      socket.send(JSON.stringify({ type: 'error', error: 'Invalid query parameters' }));
      socket.close(1008, 'Invalid parameters');
      return;
    }

    // Verify admin access via token
    try {
      const payload = verifyToken(query.token);
      if (payload.role !== 'admin' && !payload.roles?.includes('admin')) {
        socket.send(JSON.stringify({ type: 'error', error: 'Admin access required' }));
        socket.close(1008, 'Unauthorized');
        return;
      }
    } catch {
      socket.send(JSON.stringify({ type: 'error', error: 'Invalid or expired token' }));
      socket.close(1008, 'Unauthorized');
      return;
    }

    const processName = query.process;
    const levelFilter = query.level;
    const searchRegex = query.search ? new RegExp(query.search, 'i') : null;
    const levelOrder = ['trace', 'debug', 'info', 'warn', 'error', 'fatal'];
    const minLevelIndex = levelFilter ? levelOrder.indexOf(levelFilter) : 0;

    let logProcess: ReturnType<typeof spawn> | null = null;
    let isAlive = true;

    // Send connection confirmation
    socket.send(JSON.stringify({
      type: 'connected',
      message: `Connected to ${processName} log stream`,
      filters: { level: levelFilter, search: query.search },
      timestamp: new Date().toISOString(),
    }));

    // Start tailing logs
    const startLogStream = () => {
      logProcess = spawn('pm2', ['logs', processName, '--raw', '--lines', '50'], {
        shell: true,
      });

      const handleData = (data: Buffer, isError: boolean) => {
        if (!isAlive) return;

        const lines = data.toString().split('\n').filter(Boolean);
        for (const line of lines) {
          const entry = parseLogLine(line);
          if (!entry) continue;

          // Apply level filter
          const entryLevel = entry.level?.toLowerCase() || 'info';
          const entryLevelIndex = levelOrder.indexOf(entryLevel);
          if (entryLevelIndex < minLevelIndex) continue;

          // Apply search filter
          if (searchRegex) {
            const searchText = entry.msg || entry.message || JSON.stringify(entry);
            if (!searchRegex.test(searchText)) continue;
          }

          socket.send(JSON.stringify({
            type: isError ? 'error_log' : 'log',
            data: entry,
            raw: line,
            timestamp: new Date().toISOString(),
          }));
        }
      };

      logProcess.stdout?.on('data', (data: Buffer) => handleData(data, false));
      logProcess.stderr?.on('data', (data: Buffer) => handleData(data, true));

      logProcess.on('close', (code: number | null) => {
        if (isAlive) {
          socket.send(JSON.stringify({
            type: 'stream_closed',
            message: `Log stream closed with code ${code}`,
            timestamp: new Date().toISOString(),
          }));
        }
      });

      logProcess.on('error', (err: Error) => {
        if (isAlive) {
          socket.send(JSON.stringify({
            type: 'stream_error',
            error: err.message,
            timestamp: new Date().toISOString(),
          }));
        }
      });
    };

    startLogStream();

    // Handle incoming messages (commands)
    socket.on('message', (message: Buffer) => {
      try {
        const data = JSON.parse(message.toString());

        switch (data.type) {
          case 'ping':
            socket.send(JSON.stringify({ type: 'pong', timestamp: new Date().toISOString() }));
            break;

          case 'restart':
            if (logProcess) {
              logProcess.kill();
            }
            startLogStream();
            socket.send(JSON.stringify({
              type: 'restarted',
              message: 'Log stream restarted',
              timestamp: new Date().toISOString(),
            }));
            break;

          case 'update_filters':
            // Close current stream and reconnect with new filters
            socket.send(JSON.stringify({
              type: 'info',
              message: 'Reconnect with new query parameters to update filters',
              timestamp: new Date().toISOString(),
            }));
            break;
        }
      } catch {
        // Ignore invalid messages
      }
    });

    // Cleanup on close
    socket.on('close', () => {
      isAlive = false;
      if (logProcess) {
        logProcess.kill();
        logProcess = null;
      }
      log.debug('Log stream WebSocket closed');
    });

    socket.on('error', (err) => {
      isAlive = false;
      if (logProcess) {
        logProcess.kill();
        logProcess = null;
      }
      log.error({ error: (err as Error).message }, 'Log stream WebSocket error');
    });
  });
}
