/**
 * Admin Metrics Routes
 *
 * Real-time metrics for the admin dashboard:
 * - GET /admin/metrics/realtime - Current metrics snapshot
 * - GET /admin/metrics/history - Historical metrics with time range
 * - GET /admin/metrics/endpoints - Per-endpoint statistics
 * - GET /admin/metrics/users - Active user count, sessions
 * - GET /admin/metrics/websockets - WebSocket connection count
 * - WebSocket /admin/metrics/stream - Real-time metrics streaming
 *
 * SECURITY: All routes require admin authentication
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { authenticate, requireAdmin, verifyToken } from './auth';

// ============================================
// SCHEMAS
// ============================================

const HistoryQuerySchema = z.object({
  startTime: z.coerce.number().optional(), // Unix timestamp (ms)
  endTime: z.coerce.number().optional(), // Unix timestamp (ms)
  resolution: z.enum(['1s', '5s', '30s', '1m', '5m']).default('1m'),
  limit: z.coerce.number().min(1).max(1000).default(60),
});

const EndpointsQuerySchema = z.object({
  sortBy: z.enum(['requests', 'errors', 'latency', 'p99']).default('requests'),
  order: z.enum(['asc', 'desc']).default('desc'),
  limit: z.coerce.number().min(1).max(100).default(50),
});

// ============================================
// TYPES
// ============================================

interface MetricsSnapshot {
  timestamp: number;
  requests: {
    total: number;
    perSecond: number;
    perMinute: number;
  };
  errors: {
    total: number;
    perSecond: number;
    rate: number; // percentage
  };
  latency: {
    avg: number;
    p50: number;
    p95: number;
    p99: number;
    min: number;
    max: number;
  };
  statusCodes: Record<string, number>;
}

interface EndpointStats {
  endpoint: string;
  method: string;
  requests: number;
  errors: number;
  errorRate: number;
  latency: {
    avg: number;
    p50: number;
    p95: number;
    p99: number;
  };
  lastCalled: number;
}

interface UserMetrics {
  activeUsers: {
    last1m: number;
    last5m: number;
    last15m: number;
    last1h: number;
  };
  sessions: {
    total: number;
    authenticated: number;
    anonymous: number;
  };
  newUsers: {
    last1h: number;
    last24h: number;
  };
}

interface WebSocketMetrics {
  connections: {
    total: number;
    active: number;
    authenticated: number;
  };
  byEndpoint: Record<string, number>;
  messageRate: {
    inbound: number;
    outbound: number;
  };
}

interface DataPoint {
  timestamp: number;
  requestsPerSecond: number;
  errorsPerSecond: number;
  avgLatency: number;
  p99Latency: number;
  activeConnections: number;
}

// ============================================
// RING BUFFER FOR METRICS STORAGE
// ============================================

class RingBuffer<T> {
  private buffer: (T | null)[];
  private head: number = 0;
  private tail: number = 0;
  private count: number = 0;

  constructor(private capacity: number) {
    this.buffer = new Array(capacity).fill(null);
  }

  push(item: T): void {
    this.buffer[this.tail] = item;
    this.tail = (this.tail + 1) % this.capacity;
    if (this.count < this.capacity) {
      this.count++;
    } else {
      this.head = (this.head + 1) % this.capacity;
    }
  }

  getAll(): T[] {
    const result: T[] = [];
    let current = this.head;
    for (let i = 0; i < this.count; i++) {
      const item = this.buffer[current];
      if (item !== null) {
        result.push(item);
      }
      current = (current + 1) % this.capacity;
    }
    return result;
  }

  getRange(startTime: number, endTime: number, timestampKey: keyof T): T[] {
    return this.getAll().filter((item) => {
      const ts = item[timestampKey] as unknown as number;
      return ts >= startTime && ts <= endTime;
    });
  }

  clear(): void {
    this.buffer = new Array(this.capacity).fill(null);
    this.head = 0;
    this.tail = 0;
    this.count = 0;
  }

  get size(): number {
    return this.count;
  }
}

// ============================================
// METRICS COLLECTOR
// ============================================

// Store 1 hour of data at 1-second resolution (3600 points)
const metricsHistory = new RingBuffer<DataPoint>(3600);

// Per-endpoint stats
const endpointStats = new Map<string, {
  method: string;
  requests: number;
  errors: number;
  latencies: number[];
  lastCalled: number;
}>();

// Request tracking for current second/minute
let currentSecondRequests = 0;
let currentSecondErrors = 0;
let currentSecondLatencies: number[] = [];
let lastSecondTimestamp = Math.floor(Date.now() / 1000);

// Total counters
let totalRequests = 0;
let totalErrors = 0;
let allLatencies: number[] = []; // Keep last 10000 for percentile calculations
const MAX_LATENCIES = 10000;

// Active users tracking (userId -> lastSeen timestamp)
const activeUsers = new Map<string, number>();
const activeSessions = new Map<string, { authenticated: boolean; lastSeen: number }>();

// WebSocket connections
let wsConnectionCount = 0;
const wsConnectionsByEndpoint = new Map<string, number>();
let wsInboundMessages = 0;
let wsOutboundMessages = 0;

// Status code tracking
const statusCodeCounts = new Map<number, number>();

// ============================================
// PERCENTILE CALCULATION
// ============================================

function calculatePercentile(sortedArray: number[], percentile: number): number {
  if (sortedArray.length === 0) return 0;
  const index = Math.ceil((percentile / 100) * sortedArray.length) - 1;
  return sortedArray[Math.max(0, index)];
}

function calculateLatencyStats(latencies: number[]): { avg: number; p50: number; p95: number; p99: number; min: number; max: number } {
  if (latencies.length === 0) {
    return { avg: 0, p50: 0, p95: 0, p99: 0, min: 0, max: 0 };
  }

  const sorted = [...latencies].sort((a, b) => a - b);
  const sum = sorted.reduce((acc, val) => acc + val, 0);

  return {
    avg: Math.round(sum / sorted.length),
    p50: calculatePercentile(sorted, 50),
    p95: calculatePercentile(sorted, 95),
    p99: calculatePercentile(sorted, 99),
    min: sorted[0],
    max: sorted[sorted.length - 1],
  };
}

// ============================================
// METRICS RECORDING FUNCTIONS
// ============================================

export function recordRequest(
  method: string,
  path: string,
  statusCode: number,
  latencyMs: number,
  userId?: string
): void {
  const now = Date.now();
  const currentSecond = Math.floor(now / 1000);

  // Roll over to new second if needed
  if (currentSecond > lastSecondTimestamp) {
    // Save previous second's data
    const dataPoint: DataPoint = {
      timestamp: lastSecondTimestamp * 1000,
      requestsPerSecond: currentSecondRequests,
      errorsPerSecond: currentSecondErrors,
      avgLatency: currentSecondLatencies.length > 0
        ? currentSecondLatencies.reduce((a, b) => a + b, 0) / currentSecondLatencies.length
        : 0,
      p99Latency: currentSecondLatencies.length > 0
        ? calculatePercentile([...currentSecondLatencies].sort((a, b) => a - b), 99)
        : 0,
      activeConnections: wsConnectionCount,
    };
    metricsHistory.push(dataPoint);

    // Reset counters
    currentSecondRequests = 0;
    currentSecondErrors = 0;
    currentSecondLatencies = [];
    lastSecondTimestamp = currentSecond;
  }

  // Update current second
  currentSecondRequests++;
  currentSecondLatencies.push(latencyMs);

  // Update totals
  totalRequests++;
  allLatencies.push(latencyMs);
  if (allLatencies.length > MAX_LATENCIES) {
    allLatencies = allLatencies.slice(-MAX_LATENCIES);
  }

  // Track errors
  const isError = statusCode >= 400;
  if (isError) {
    currentSecondErrors++;
    totalErrors++;
  }

  // Track status codes
  statusCodeCounts.set(statusCode, (statusCodeCounts.get(statusCode) || 0) + 1);

  // Track endpoint stats
  const endpointKey = `${method}:${path}`;
  const existing = endpointStats.get(endpointKey);
  if (existing) {
    existing.requests++;
    if (isError) existing.errors++;
    existing.latencies.push(latencyMs);
    if (existing.latencies.length > 1000) {
      existing.latencies = existing.latencies.slice(-1000);
    }
    existing.lastCalled = now;
  } else {
    endpointStats.set(endpointKey, {
      method,
      requests: 1,
      errors: isError ? 1 : 0,
      latencies: [latencyMs],
      lastCalled: now,
    });
  }

  // Track active users
  if (userId) {
    activeUsers.set(userId, now);
  }
}

export function recordSession(sessionId: string, authenticated: boolean): void {
  activeSessions.set(sessionId, {
    authenticated,
    lastSeen: Date.now(),
  });
}

export function recordWebSocketConnect(endpoint: string): void {
  wsConnectionCount++;
  wsConnectionsByEndpoint.set(endpoint, (wsConnectionsByEndpoint.get(endpoint) || 0) + 1);
}

export function recordWebSocketDisconnect(endpoint: string): void {
  wsConnectionCount = Math.max(0, wsConnectionCount - 1);
  const current = wsConnectionsByEndpoint.get(endpoint) || 0;
  wsConnectionsByEndpoint.set(endpoint, Math.max(0, current - 1));
}

export function recordWebSocketMessage(direction: 'inbound' | 'outbound'): void {
  if (direction === 'inbound') {
    wsInboundMessages++;
  } else {
    wsOutboundMessages++;
  }
}

// ============================================
// METRICS RETRIEVAL FUNCTIONS
// ============================================

function getRealtimeMetrics(): MetricsSnapshot {
  const now = Date.now();
  const oneMinuteAgo = now - 60000;

  // Get history for last minute
  const recentHistory = metricsHistory.getRange(oneMinuteAgo, now, 'timestamp');

  // Calculate requests per minute
  const requestsPerMinute = recentHistory.reduce((sum, dp) => sum + dp.requestsPerSecond, 0);

  // Current second stats
  const latencyStats = calculateLatencyStats(allLatencies);

  // Status codes as object
  const statusCodes: Record<string, number> = {};
  statusCodeCounts.forEach((count, code) => {
    statusCodes[code.toString()] = count;
  });

  return {
    timestamp: now,
    requests: {
      total: totalRequests,
      perSecond: currentSecondRequests,
      perMinute: requestsPerMinute,
    },
    errors: {
      total: totalErrors,
      perSecond: currentSecondErrors,
      rate: totalRequests > 0 ? (totalErrors / totalRequests) * 100 : 0,
    },
    latency: latencyStats,
    statusCodes,
  };
}

function getHistoricalMetrics(
  startTime: number,
  endTime: number,
  resolution: string,
  limit: number
): DataPoint[] {
  // Get raw data points
  let dataPoints = metricsHistory.getRange(startTime, endTime, 'timestamp');

  // Aggregate based on resolution
  const resolutionMs = {
    '1s': 1000,
    '5s': 5000,
    '30s': 30000,
    '1m': 60000,
    '5m': 300000,
  }[resolution] || 60000;

  if (resolutionMs > 1000) {
    // Aggregate data points
    const buckets = new Map<number, DataPoint[]>();

    dataPoints.forEach((dp) => {
      const bucketKey = Math.floor(dp.timestamp / resolutionMs) * resolutionMs;
      const bucket = buckets.get(bucketKey) || [];
      bucket.push(dp);
      buckets.set(bucketKey, bucket);
    });

    dataPoints = Array.from(buckets.entries())
      .sort(([a], [b]) => a - b)
      .map(([timestamp, points]): DataPoint => ({
        timestamp,
        requestsPerSecond: points.reduce((sum, p) => sum + p.requestsPerSecond, 0) / points.length,
        errorsPerSecond: points.reduce((sum, p) => sum + p.errorsPerSecond, 0) / points.length,
        avgLatency: points.reduce((sum, p) => sum + p.avgLatency, 0) / points.length,
        p99Latency: Math.max(...points.map((p) => p.p99Latency)),
        activeConnections: points[points.length - 1].activeConnections,
      }));
  }

  // Apply limit
  return dataPoints.slice(-limit);
}

function getEndpointMetrics(sortBy: string, order: string, limit: number): EndpointStats[] {
  const stats: EndpointStats[] = [];

  endpointStats.forEach((data, key) => {
    const [method, ...pathParts] = key.split(':');
    const endpoint = pathParts.join(':');
    const latencyStats = calculateLatencyStats(data.latencies);

    stats.push({
      endpoint,
      method,
      requests: data.requests,
      errors: data.errors,
      errorRate: data.requests > 0 ? (data.errors / data.requests) * 100 : 0,
      latency: {
        avg: latencyStats.avg,
        p50: latencyStats.p50,
        p95: latencyStats.p95,
        p99: latencyStats.p99,
      },
      lastCalled: data.lastCalled,
    });
  });

  // Sort
  stats.sort((a, b) => {
    let aVal: number, bVal: number;
    switch (sortBy) {
      case 'requests':
        aVal = a.requests;
        bVal = b.requests;
        break;
      case 'errors':
        aVal = a.errors;
        bVal = b.errors;
        break;
      case 'latency':
        aVal = a.latency.avg;
        bVal = b.latency.avg;
        break;
      case 'p99':
        aVal = a.latency.p99;
        bVal = b.latency.p99;
        break;
      default:
        aVal = a.requests;
        bVal = b.requests;
    }
    return order === 'desc' ? bVal - aVal : aVal - bVal;
  });

  return stats.slice(0, limit);
}

function getUserMetrics(): UserMetrics {
  const now = Date.now();

  // Count active users by time window
  const windows = {
    last1m: now - 60000,
    last5m: now - 300000,
    last15m: now - 900000,
    last1h: now - 3600000,
  };

  const activeUserCounts = {
    last1m: 0,
    last5m: 0,
    last15m: 0,
    last1h: 0,
  };

  activeUsers.forEach((lastSeen) => {
    if (lastSeen >= windows.last1m) activeUserCounts.last1m++;
    if (lastSeen >= windows.last5m) activeUserCounts.last5m++;
    if (lastSeen >= windows.last15m) activeUserCounts.last15m++;
    if (lastSeen >= windows.last1h) activeUserCounts.last1h++;
  });

  // Clean up old entries
  activeUsers.forEach((lastSeen, id) => {
    if (lastSeen < windows.last1h) {
      activeUsers.delete(id);
    }
  });

  // Session counts
  let authenticatedSessions = 0;
  let anonymousSessions = 0;

  activeSessions.forEach((session, id) => {
    if (session.lastSeen < windows.last15m) {
      activeSessions.delete(id);
    } else {
      if (session.authenticated) {
        authenticatedSessions++;
      } else {
        anonymousSessions++;
      }
    }
  });

  return {
    activeUsers: activeUserCounts,
    sessions: {
      total: authenticatedSessions + anonymousSessions,
      authenticated: authenticatedSessions,
      anonymous: anonymousSessions,
    },
    newUsers: {
      last1h: 0, // Would need to query database for this
      last24h: 0,
    },
  };
}

function getWebSocketMetrics(): WebSocketMetrics {
  const byEndpoint: Record<string, number> = {};
  wsConnectionsByEndpoint.forEach((count, endpoint) => {
    byEndpoint[endpoint] = count;
  });

  return {
    connections: {
      total: wsConnectionCount,
      active: wsConnectionCount, // All connections are active
      authenticated: wsConnectionCount, // Assuming all are authenticated (admin)
    },
    byEndpoint,
    messageRate: {
      inbound: wsInboundMessages,
      outbound: wsOutboundMessages,
    },
  };
}

// ============================================
// FASTIFY HOOK FOR AUTOMATIC TRACKING
// ============================================

export function registerMetricsHook(fastify: FastifyInstance): void {
  fastify.addHook('onResponse', (request, reply, done) => {
    const latency = reply.elapsedTime || 0;
    const user = (request as { user?: { userId?: string } }).user;

    recordRequest(
      request.method,
      request.routeOptions?.url || request.url,
      reply.statusCode,
      Math.round(latency),
      user?.userId
    );

    done();
  });
}

// ============================================
// ROUTES
// ============================================

export default async function adminMetricsRoutes(fastify: FastifyInstance): Promise<void> {
  // Register metrics collection hook on the root instance
  // Note: This should be called once at server setup, not in route registration
  // registerMetricsHook(fastify.server || fastify);

  /**
   * GET /admin/metrics/realtime
   * Current metrics snapshot (requests/sec, errors, latency percentiles)
   */
  fastify.get(
    '/admin/metrics/realtime',
    { preHandler: [authenticate, requireAdmin] },
    async (_request: FastifyRequest, reply: FastifyReply) => {
      const metrics = getRealtimeMetrics();
      return reply.send(metrics);
    }
  );

  /**
   * GET /admin/metrics/history
   * Historical metrics with time range query params
   */
  fastify.get(
    '/admin/metrics/history',
    { preHandler: [authenticate, requireAdmin] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const query = HistoryQuerySchema.parse(request.query);

      const now = Date.now();
      const startTime = query.startTime || now - 3600000; // Default: last hour
      const endTime = query.endTime || now;

      const dataPoints = getHistoricalMetrics(
        startTime,
        endTime,
        query.resolution,
        query.limit
      );

      return reply.send({
        startTime,
        endTime,
        resolution: query.resolution,
        dataPoints,
        count: dataPoints.length,
      });
    }
  );

  /**
   * GET /admin/metrics/endpoints
   * Per-endpoint statistics
   */
  fastify.get(
    '/admin/metrics/endpoints',
    { preHandler: [authenticate, requireAdmin] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const query = EndpointsQuerySchema.parse(request.query);

      const endpoints = getEndpointMetrics(
        query.sortBy,
        query.order,
        query.limit
      );

      return reply.send({
        endpoints,
        count: endpoints.length,
        totalEndpoints: endpointStats.size,
      });
    }
  );

  /**
   * GET /admin/metrics/users
   * Active user count, sessions
   */
  fastify.get(
    '/admin/metrics/users',
    { preHandler: [authenticate, requireAdmin] },
    async (_request: FastifyRequest, reply: FastifyReply) => {
      const metrics = getUserMetrics();
      return reply.send(metrics);
    }
  );

  /**
   * GET /admin/metrics/websockets
   * WebSocket connection count and stats
   */
  fastify.get(
    '/admin/metrics/websockets',
    { preHandler: [authenticate, requireAdmin] },
    async (_request: FastifyRequest, reply: FastifyReply) => {
      const metrics = getWebSocketMetrics();
      return reply.send(metrics);
    }
  );

  /**
   * WebSocket /admin/metrics/stream
   * Real-time metrics streaming (push every 5 seconds)
   */
  fastify.get(
    '/admin/metrics/stream',
    { websocket: true },
    (socket, request) => {
      // Verify admin access via token in query string
      const token = (request.query as { token?: string }).token;
      if (!token) {
        socket.send(JSON.stringify({ error: 'Authentication required', type: 'error' }));
        socket.close();
        return;
      }

      // Validate JWT token and check admin role
      let user: { userId: string; roles?: string[]; role?: string } | null = null;
      try {
        user = verifyToken(token);
      } catch (_err) {
        socket.send(JSON.stringify({ error: 'Invalid or expired token', type: 'error' }));
        socket.close();
        return;
      }

      // Check admin access
      const isAdmin = user?.roles?.includes('admin') || user?.role === 'admin';
      if (!isAdmin) {
        socket.send(JSON.stringify({ error: 'Admin access required', type: 'error' }));
        socket.close();
        return;
      }

      // Track this WebSocket connection
      recordWebSocketConnect('/admin/metrics/stream');

      let isAlive = true;
      let intervalId: NodeJS.Timeout | null = null;

      // Send initial connection message
      socket.send(JSON.stringify({
        type: 'connected',
        message: 'Connected to metrics stream',
        timestamp: Date.now(),
      }));

      // Push metrics every 5 seconds
      const pushMetrics = () => {
        if (!isAlive) return;

        const metrics = getRealtimeMetrics();
        const wsMetrics = getWebSocketMetrics();
        const userMetrics = getUserMetrics();

        socket.send(JSON.stringify({
          type: 'metrics',
          timestamp: Date.now(),
          data: {
            realtime: metrics,
            websockets: wsMetrics,
            users: userMetrics,
          },
        }));

        recordWebSocketMessage('outbound');
      };

      // Send initial metrics immediately
      pushMetrics();

      // Start interval
      intervalId = setInterval(pushMetrics, 5000);

      // Handle incoming messages
      socket.on('message', (message) => {
        recordWebSocketMessage('inbound');

        try {
          const data = JSON.parse(message.toString());

          switch (data.type) {
            case 'ping':
              socket.send(JSON.stringify({
                type: 'pong',
                timestamp: Date.now(),
              }));
              recordWebSocketMessage('outbound');
              break;

            case 'subscribe':
              // Could implement selective subscriptions here
              socket.send(JSON.stringify({
                type: 'subscribed',
                channel: data.channel,
                timestamp: Date.now(),
              }));
              recordWebSocketMessage('outbound');
              break;

            case 'getHistory':
              // On-demand history fetch via WebSocket
              const history = getHistoricalMetrics(
                data.startTime || Date.now() - 300000,
                data.endTime || Date.now(),
                data.resolution || '5s',
                data.limit || 60
              );
              socket.send(JSON.stringify({
                type: 'history',
                requestId: data.requestId,
                data: history,
                timestamp: Date.now(),
              }));
              recordWebSocketMessage('outbound');
              break;
          }
        } catch {
          // Ignore invalid messages
        }
      });

      // Cleanup on close
      const cleanup = () => {
        isAlive = false;
        if (intervalId) {
          clearInterval(intervalId);
          intervalId = null;
        }
        recordWebSocketDisconnect('/admin/metrics/stream');
      };

      socket.on('close', cleanup);
      socket.on('error', cleanup);
    }
  );

  /**
   * POST /admin/metrics/reset
   * Reset all metrics (for testing/debugging)
   */
  fastify.post(
    '/admin/metrics/reset',
    { preHandler: [authenticate, requireAdmin] },
    async (_request: FastifyRequest, reply: FastifyReply) => {
      // Reset all counters and storage
      metricsHistory.clear();
      endpointStats.clear();
      statusCodeCounts.clear();
      activeUsers.clear();
      activeSessions.clear();

      currentSecondRequests = 0;
      currentSecondErrors = 0;
      currentSecondLatencies = [];
      totalRequests = 0;
      totalErrors = 0;
      allLatencies = [];
      wsInboundMessages = 0;
      wsOutboundMessages = 0;

      return reply.send({
        success: true,
        message: 'All metrics have been reset',
        timestamp: Date.now(),
      });
    }
  );
}
