/**
 * Prometheus Metrics Service
 *
 * Provides application metrics for monitoring and alerting.
 * Exports metrics in Prometheus text format at /metrics endpoint.
 *
 * Metrics include:
 * - HTTP request latency and throughput
 * - Database connection pool stats
 * - Redis connection status
 * - GraphQL query complexity
 * - Business metrics (workouts, users, etc.)
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { getPoolStats, healthCheck as dbHealthCheck } from '../db/client';
import { isRedisAvailable } from './redis';
import { getGraphQLCache } from '../graphql/cache';
import { loggers } from './logger';

const log = loggers.core;

// ============================================
// TYPES
// ============================================

interface MetricValue {
  value: number;
  labels?: Record<string, string>;
}

interface Metric {
  name: string;
  help: string;
  type: 'counter' | 'gauge' | 'histogram' | 'summary';
  values: MetricValue[];
}

interface RequestMetrics {
  totalRequests: number;
  totalErrors: number;
  requestDurations: number[];
  statusCodes: Record<string, number>;
  pathCounts: Record<string, number>;
}

// ============================================
// METRICS COLLECTOR
// ============================================

class MetricsCollector {
  private httpMetrics: RequestMetrics = {
    totalRequests: 0,
    totalErrors: 0,
    requestDurations: [],
    statusCodes: {},
    pathCounts: {},
  };

  private startTime = Date.now();
  private maxDurationsStored = 1000;

  /**
   * Record an HTTP request.
   */
  recordRequest(path: string, method: string, statusCode: number, durationMs: number): void {
    this.httpMetrics.totalRequests++;

    if (statusCode >= 400) {
      this.httpMetrics.totalErrors++;
    }

    // Record duration (keep last N for percentile calculation)
    this.httpMetrics.requestDurations.push(durationMs);
    if (this.httpMetrics.requestDurations.length > this.maxDurationsStored) {
      this.httpMetrics.requestDurations.shift();
    }

    // Record by status code
    const statusKey = `${Math.floor(statusCode / 100)}xx`;
    this.httpMetrics.statusCodes[statusKey] = (this.httpMetrics.statusCodes[statusKey] || 0) + 1;

    // Record by path (sanitized)
    const sanitizedPath = this.sanitizePath(path);
    this.httpMetrics.pathCounts[sanitizedPath] =
      (this.httpMetrics.pathCounts[sanitizedPath] || 0) + 1;
  }

  /**
   * Sanitize path to prevent high cardinality.
   */
  private sanitizePath(path: string): string {
    // Remove query string
    const basePath = path.split('?')[0];

    // Replace UUIDs and numeric IDs with placeholders
    return basePath
      .replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, ':id')
      .replace(/\/\d+/g, '/:id');
  }

  /**
   * Calculate percentile from sorted array.
   */
  private percentile(arr: number[], p: number): number {
    if (arr.length === 0) return 0;
    const sorted = [...arr].sort((a, b) => a - b);
    const index = Math.ceil((p / 100) * sorted.length) - 1;
    return sorted[Math.max(0, index)];
  }

  /**
   * Get all metrics in Prometheus format.
   */
  async getPrometheusMetrics(): Promise<string> {
    const metrics: Metric[] = [];

    // Uptime
    const uptimeSeconds = Math.floor((Date.now() - this.startTime) / 1000);
    metrics.push({
      name: 'musclemap_uptime_seconds',
      help: 'Time since server started',
      type: 'gauge',
      values: [{ value: uptimeSeconds }],
    });

    // HTTP metrics
    metrics.push({
      name: 'musclemap_http_requests_total',
      help: 'Total HTTP requests',
      type: 'counter',
      values: [{ value: this.httpMetrics.totalRequests }],
    });

    metrics.push({
      name: 'musclemap_http_errors_total',
      help: 'Total HTTP errors (4xx and 5xx)',
      type: 'counter',
      values: [{ value: this.httpMetrics.totalErrors }],
    });

    // Request duration percentiles
    const durations = this.httpMetrics.requestDurations;
    if (durations.length > 0) {
      metrics.push({
        name: 'musclemap_http_request_duration_ms',
        help: 'HTTP request duration in milliseconds',
        type: 'summary',
        values: [
          { value: this.percentile(durations, 50), labels: { quantile: '0.5' } },
          { value: this.percentile(durations, 90), labels: { quantile: '0.9' } },
          { value: this.percentile(durations, 95), labels: { quantile: '0.95' } },
          { value: this.percentile(durations, 99), labels: { quantile: '0.99' } },
        ],
      });
    }

    // Status code distribution
    const statusValues: MetricValue[] = Object.entries(this.httpMetrics.statusCodes).map(
      ([code, count]) => ({
        value: count,
        labels: { status: code },
      })
    );
    if (statusValues.length > 0) {
      metrics.push({
        name: 'musclemap_http_requests_by_status',
        help: 'HTTP requests by status code class',
        type: 'counter',
        values: statusValues,
      });
    }

    // Database metrics
    const poolStats = getPoolStats();
    const dbHealthy = await dbHealthCheck();

    metrics.push({
      name: 'musclemap_db_connections_total',
      help: 'Total database connections in pool',
      type: 'gauge',
      values: [{ value: poolStats.totalConnections }],
    });

    metrics.push({
      name: 'musclemap_db_connections_idle',
      help: 'Idle database connections',
      type: 'gauge',
      values: [{ value: poolStats.idleConnections }],
    });

    metrics.push({
      name: 'musclemap_db_connections_waiting',
      help: 'Waiting database connection requests',
      type: 'gauge',
      values: [{ value: poolStats.waitingClients }],
    });

    metrics.push({
      name: 'musclemap_db_healthy',
      help: 'Database health status (1=healthy, 0=unhealthy)',
      type: 'gauge',
      values: [{ value: dbHealthy ? 1 : 0 }],
    });

    // Redis metrics
    const redisConnected = isRedisAvailable();
    metrics.push({
      name: 'musclemap_redis_connected',
      help: 'Redis connection status (1=connected, 0=disconnected)',
      type: 'gauge',
      values: [{ value: redisConnected ? 1 : 0 }],
    });

    // GraphQL cache metrics
    const cacheStats = getGraphQLCache().getStats();
    metrics.push({
      name: 'musclemap_graphql_cache_hits_total',
      help: 'GraphQL cache hits',
      type: 'counter',
      values: [{ value: cacheStats.hits }],
    });

    metrics.push({
      name: 'musclemap_graphql_cache_misses_total',
      help: 'GraphQL cache misses',
      type: 'counter',
      values: [{ value: cacheStats.misses }],
    });

    metrics.push({
      name: 'musclemap_graphql_cache_hit_rate',
      help: 'GraphQL cache hit rate',
      type: 'gauge',
      values: [{ value: cacheStats.hitRate }],
    });

    // Memory usage
    const memUsage = process.memoryUsage();
    metrics.push({
      name: 'musclemap_memory_heap_used_bytes',
      help: 'Heap memory used',
      type: 'gauge',
      values: [{ value: memUsage.heapUsed }],
    });

    metrics.push({
      name: 'musclemap_memory_heap_total_bytes',
      help: 'Total heap memory',
      type: 'gauge',
      values: [{ value: memUsage.heapTotal }],
    });

    metrics.push({
      name: 'musclemap_memory_rss_bytes',
      help: 'Resident set size',
      type: 'gauge',
      values: [{ value: memUsage.rss }],
    });

    // Event loop lag (approximation)
    const eventLoopLag = await this.measureEventLoopLag();
    metrics.push({
      name: 'musclemap_event_loop_lag_ms',
      help: 'Event loop lag in milliseconds',
      type: 'gauge',
      values: [{ value: eventLoopLag }],
    });

    // Format as Prometheus text
    return this.formatPrometheus(metrics);
  }

  /**
   * Measure event loop lag.
   */
  private measureEventLoopLag(): Promise<number> {
    const start = process.hrtime.bigint();
    return new Promise((resolve) => {
      setImmediate(() => {
        const end = process.hrtime.bigint();
        const lagNs = Number(end - start);
        const lagMs = lagNs / 1_000_000;
        resolve(lagMs);
      });
    });
  }

  /**
   * Format metrics in Prometheus text format.
   */
  private formatPrometheus(metrics: Metric[]): string {
    const lines: string[] = [];

    for (const metric of metrics) {
      lines.push(`# HELP ${metric.name} ${metric.help}`);
      lines.push(`# TYPE ${metric.name} ${metric.type}`);

      for (const { value, labels } of metric.values) {
        if (labels && Object.keys(labels).length > 0) {
          const labelStr = Object.entries(labels)
            .map(([k, v]) => `${k}="${v}"`)
            .join(',');
          lines.push(`${metric.name}{${labelStr}} ${value}`);
        } else {
          lines.push(`${metric.name} ${value}`);
        }
      }
    }

    return lines.join('\n');
  }

  /**
   * Reset metrics (for testing).
   */
  reset(): void {
    this.httpMetrics = {
      totalRequests: 0,
      totalErrors: 0,
      requestDurations: [],
      statusCodes: {},
      pathCounts: {},
    };
    this.startTime = Date.now();
  }
}

// ============================================
// SINGLETON
// ============================================

export const metricsCollector = new MetricsCollector();

// ============================================
// FASTIFY PLUGIN
// ============================================

/**
 * Register metrics routes and hooks on Fastify instance.
 */
export async function registerMetricsRoutes(app: FastifyInstance): Promise<void> {
  // Add hook to record request metrics
  app.addHook('onResponse', async (request: FastifyRequest, reply: FastifyReply) => {
    const duration = reply.elapsedTime;
    metricsCollector.recordRequest(
      request.url,
      request.method,
      reply.statusCode,
      duration
    );
  });

  // Prometheus metrics endpoint
  app.get('/metrics', async (request: FastifyRequest, reply: FastifyReply) => {
    const metrics = await metricsCollector.getPrometheusMetrics();
    reply.header('Content-Type', 'text/plain; version=0.0.4');
    return metrics;
  });

  log.info('Metrics endpoint registered at /metrics');
}

// ============================================
// EXPORTS
// ============================================

export { MetricsCollector };
