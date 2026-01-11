/**
 * Health Check Routes
 *
 * Provides endpoints for load balancer health checks and monitoring:
 * - /health - Simple liveness check (always returns 200 if app is running)
 * - /health/ready - Readiness check (verifies all dependencies are available)
 * - /health/live - Alias for liveness check
 * - /health/detailed - Detailed health information (authenticated)
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { isPoolHealthy, getPoolMetrics } from '../../db/client';
import { isRedisAvailable, getRedis } from '../../lib/redis';
import { getConnectionStats } from '../../modules/rivals/websocket';
import { getNativeStatus } from '@musclemap/native';
import { loggers } from '../../lib/logger';
import { getCacheStats } from '../../lib/cache.service';
import { cacheManager } from '../../graphql/cache';

const log = loggers.core;

// ============================================
// TYPES
// ============================================

interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  uptime: number;
  version: string;
  instance: string;
}

interface ReadinessStatus extends HealthStatus {
  checks: {
    database: CheckResult;
    redis: CheckResult;
  };
}

interface DetailedHealthStatus extends ReadinessStatus {
  metrics: {
    database: {
      totalConnections: number;
      idleConnections: number;
      waitingClients: number;
    };
    redis?: {
      latencyMs: number;
      connected: boolean;
    };
    cache: {
      hits: number;
      misses: number;
      hitRate: number;
      sets: number;
      deletes: number;
      errors: number;
    };
    graphqlCache: {
      hits: number;
      misses: number;
      hitRate: number;
      size: number;
      evictions: number;
    };
    websocket: {
      users: number;
      connections: number;
      instanceId: string;
    };
    memory: {
      heapUsed: number;
      heapTotal: number;
      external: number;
      rss: number;
    };
    native: {
      geo: boolean;
      ratelimit: boolean;
      ffi: boolean;
    };
  };
}

interface CheckResult {
  status: 'pass' | 'fail';
  latencyMs?: number;
  message?: string;
}

// ============================================
// HELPERS
// ============================================

const startTime = Date.now();

function getUptime(): number {
  return Math.floor((Date.now() - startTime) / 1000);
}

function getVersion(): string {
  try {
    // Try to read from package.json
    const pkg = require('../../../../../package.json');
    return pkg.version || '0.0.0';
  } catch {
    return process.env.npm_package_version || '0.0.0';
  }
}

function getInstanceId(): string {
  return process.env.pm_id || process.env.INSTANCE_ID || process.pid.toString();
}

async function checkDatabase(): Promise<CheckResult> {
  const start = Date.now();
  try {
    const healthy = await isPoolHealthy();
    const latencyMs = Date.now() - start;
    return {
      status: healthy ? 'pass' : 'fail',
      latencyMs,
      message: healthy ? 'Connection pool healthy' : 'Database connection failed',
    };
  } catch (error) {
    return {
      status: 'fail',
      latencyMs: Date.now() - start,
      message: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

async function checkRedis(): Promise<CheckResult> {
  if (!isRedisAvailable()) {
    return {
      status: 'pass',
      message: 'Redis not configured (optional)',
    };
  }

  const start = Date.now();
  try {
    const redis = getRedis();
    if (!redis) {
      return {
        status: 'pass',
        message: 'Redis not available',
      };
    }

    await redis.ping();
    const latencyMs = Date.now() - start;
    return {
      status: 'pass',
      latencyMs,
      message: 'Redis connected',
    };
  } catch (error) {
    return {
      status: 'fail',
      latencyMs: Date.now() - start,
      message: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

function determineOverallStatus(checks: { database: CheckResult; redis: CheckResult }): 'healthy' | 'degraded' | 'unhealthy' {
  // Database is required
  if (checks.database.status === 'fail') {
    return 'unhealthy';
  }

  // Redis failure is degraded (not critical)
  if (checks.redis.status === 'fail' && isRedisAvailable()) {
    return 'degraded';
  }

  return 'healthy';
}

// ============================================
// ROUTES
// ============================================

export function registerHealthRoutes(fastify: FastifyInstance): void {
  /**
   * Liveness probe - always returns 200 if the process is running
   * Used by Kubernetes/load balancers to check if the container is alive
   */
  fastify.get('/health', async (request: FastifyRequest, reply: FastifyReply) => {
    const status: HealthStatus = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: getUptime(),
      version: getVersion(),
      instance: getInstanceId(),
    };

    return reply.status(200).send(status);
  });

  /**
   * Alias for liveness probe
   */
  fastify.get('/health/live', async (request: FastifyRequest, reply: FastifyReply) => {
    const status: HealthStatus = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: getUptime(),
      version: getVersion(),
      instance: getInstanceId(),
    };

    return reply.status(200).send(status);
  });

  /**
   * Readiness probe - checks if the app is ready to receive traffic
   * Used by Kubernetes/load balancers to determine if traffic should be routed
   */
  fastify.get('/health/ready', async (request: FastifyRequest, reply: FastifyReply) => {
    const [database, redis] = await Promise.all([checkDatabase(), checkRedis()]);

    const checks = { database, redis };
    const overallStatus = determineOverallStatus(checks);

    const status: ReadinessStatus = {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      uptime: getUptime(),
      version: getVersion(),
      instance: getInstanceId(),
      checks,
    };

    // Return 503 if unhealthy (load balancer should stop sending traffic)
    const httpStatus = overallStatus === 'unhealthy' ? 503 : 200;

    return reply.status(httpStatus).send(status);
  });

  /**
   * Detailed health information - includes metrics
   * Protected - only available with valid authentication or from internal network
   */
  fastify.get('/health/detailed', async (request: FastifyRequest, reply: FastifyReply) => {
    // Allow internal requests (from load balancer) or authenticated admins
    const isInternal =
      request.ip === '127.0.0.1' ||
      request.ip === '::1' ||
      request.headers['x-internal-request'] === 'true';

    const isAdmin = (request.user as any)?.roles?.includes('admin');

    if (!isInternal && !isAdmin) {
      return reply.status(401).send({
        error: {
          code: 'UNAUTHORIZED',
          message: 'Admin access required',
          statusCode: 401,
        },
      });
    }

    const [database, redis] = await Promise.all([checkDatabase(), checkRedis()]);

    const checks = { database, redis };
    const overallStatus = determineOverallStatus(checks);

    // Gather metrics
    const poolMetrics = getPoolMetrics();
    const wsStats = getConnectionStats();
    const memoryUsage = process.memoryUsage();
    const nativeStatus = getNativeStatus();

    // Check Redis latency
    let redisMetrics: { latencyMs: number; connected: boolean } | undefined;
    if (isRedisAvailable()) {
      const start = Date.now();
      try {
        const redisClient = getRedis();
        if (redisClient) {
          await redisClient.ping();
          redisMetrics = {
            latencyMs: Date.now() - start,
            connected: true,
          };
        }
      } catch {
        redisMetrics = {
          latencyMs: Date.now() - start,
          connected: false,
        };
      }
    }

    // Get cache statistics
    const serviceCacheStats = getCacheStats();
    const gqlCacheStats = cacheManager.getStats();

    const status: DetailedHealthStatus = {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      uptime: getUptime(),
      version: getVersion(),
      instance: getInstanceId(),
      checks,
      metrics: {
        database: poolMetrics,
        redis: redisMetrics,
        cache: {
          hits: serviceCacheStats.hits,
          misses: serviceCacheStats.misses,
          hitRate: Math.round(serviceCacheStats.hitRate * 100 * 10) / 10,
          sets: serviceCacheStats.sets,
          deletes: serviceCacheStats.deletes,
          errors: serviceCacheStats.errors,
        },
        graphqlCache: {
          hits: gqlCacheStats.hits,
          misses: gqlCacheStats.misses,
          hitRate: Math.round(gqlCacheStats.hitRate * 100 * 10) / 10,
          size: gqlCacheStats.size,
          evictions: gqlCacheStats.evictions,
        },
        websocket: wsStats,
        memory: {
          heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024),
          heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024),
          external: Math.round(memoryUsage.external / 1024 / 1024),
          rss: Math.round(memoryUsage.rss / 1024 / 1024),
        },
        native: nativeStatus,
      },
    };

    return reply.status(200).send(status);
  });

  /**
   * Signal that the app is ready (for PM2 cluster mode)
   * This is called during startup to signal PM2 that the app is ready to receive traffic
   */
  fastify.addHook('onReady', async () => {
    // Signal PM2 that the process is ready
    if (process.send) {
      process.send('ready');
      log.info('Sent ready signal to PM2');
    }
  });

  /**
   * Handle graceful shutdown
   */
  const gracefulShutdown = async (signal: string) => {
    log.info({ signal }, 'Received shutdown signal, closing connections...');

    try {
      // Give time for load balancer to stop sending traffic
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Close the server
      await fastify.close();
      log.info('Server closed gracefully');

      process.exit(0);
    } catch (error) {
      log.error({ error }, 'Error during graceful shutdown');
      process.exit(1);
    }
  };

  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));
}
