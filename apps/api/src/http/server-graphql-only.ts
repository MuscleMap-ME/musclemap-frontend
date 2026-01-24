/**
 * Fastify Server - Pure GraphQL Architecture
 *
 * This server implements a pure GraphQL-first architecture where:
 * - ALL application data flows through /api/graphql
 * - REST endpoints are ONLY for infrastructure (health, metrics, webhooks, uploads)
 *
 * REST endpoints kept for infrastructure:
 * - /health, /ready - Load balancer probes
 * - /metrics - Prometheus scraping
 * - /api/vitals - Web Vitals beacon (unauthenticated)
 * - /api/client-error - Error reporting (unauthenticated)
 * - /api/deploy/* - Deployment management (SSH alternative)
 * - /api/errors/* - Frontend error collection
 * - /api/monitoring/* - System monitoring
 * - /api/exercise-images/* - File uploads (multipart)
 * - /api/progress-photos/* - File uploads (multipart)
 * - /api/admin/* - Admin control panel (operational safety)
 */

import Fastify, { FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import sensible from '@fastify/sensible';
import compress from '@fastify/compress';
import websocket from '@fastify/websocket';
import multipart from '@fastify/multipart';
import { ZodError } from 'zod';

import { config, isProduction } from '../config';
import { logger, loggers } from '../lib/logger';
import { closeDatabase, healthCheck as dbHealthCheck, getPoolStats } from '../db/client';
import { closeRedis, isRedisAvailable } from '../lib/redis';
import { initializePubSub, cleanupPubSub } from '../lib/pubsub';
import { trackError } from '../lib/error-tracker';

// GraphQL - THE primary data interface
import { registerGraphQLRoutes } from '../graphql/server';

// Infrastructure routes (MUST stay REST)
import { registerHealthRoutes } from './routes/health';
import { registerDeploymentRoutes } from './routes/deployment';
import { registerErrorRoutes } from './routes/errors';
import { registerMonitoringRoutes } from './routes/monitoring';
import { registerDocsPlainRoutes } from './routes/docs-plain';

// File upload routes (multipart/form-data - can't do over GraphQL)
import exerciseImagesRoutes from './routes/exercise-images';
import progressPhotosRoutes from './routes/progress-photos';

// Admin routes (kept for operational safety - emergency controls)
import { registerAdminControlRoutes, emergencyModeMiddleware } from './routes/admin-control';
import adminServerRoutes from './routes/admin-server';
import adminDeployRoutes from './routes/admin-deploy';
import adminCommandsRoutes from './routes/admin-commands';
import adminLogsRoutes from './routes/admin-logs';
import adminDatabaseRoutes from './routes/admin-database';
import adminMetricsRoutes, { registerMetricsHook } from './routes/admin-metrics';
import adminBackupRoutes from './routes/admin-backup';

// Billing webhooks (Stripe signature verification)
import { registerBillingRoutes } from './routes/billing';

// Security middleware
import { registerSecurityMiddleware } from '../middleware/security';

// Metrics endpoint
import { registerMetricsRoutes } from '../lib/metrics';

const log = loggers.http;

/**
 * JWT Payload type for authentication
 */
export interface JwtPayload {
  userId: string;
  email: string;
  roles: string[];
  role?: 'user' | 'moderator' | 'admin';
}

/**
 * Extend FastifyRequest with user property
 */
declare module 'fastify' {
  interface FastifyRequest {
    user?: JwtPayload;
  }
}

/**
 * Create and configure the Fastify server with pure GraphQL architecture
 */
export async function createServer(): Promise<FastifyInstance> {
  const app = Fastify({
    loggerInstance: logger,
    trustProxy: true,
    bodyLimit: 10 * 1024 * 1024, // 10MB
    genReqId: () => `req_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 9)}`,
    pluginTimeout: 120000, // 2 minutes
  });

  // ============================================
  // ERROR HANDLING
  // ============================================

  app.setErrorHandler(async (error: any, request, reply) => {
    // Handle Zod validation errors
    if (error instanceof ZodError) {
      const fieldErrors = error.flatten().fieldErrors;
      const issues = error.issues.map(issue => ({
        path: issue.path.join('.'),
        message: issue.message,
        code: issue.code,
      }));

      log.warn({
        requestId: request.id,
        url: request.url,
        method: request.method,
        validationErrors: fieldErrors,
      }, 'Validation error');

      return reply.status(400).send({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Request validation failed',
          statusCode: 400,
          details: fieldErrors,
          issues,
        },
      });
    }

    const statusCode = error?.statusCode || 500;

    let errorMessage = 'Unknown error';
    let errorStack: string | undefined;
    let errorType = 'unknown';

    if (error === undefined || error === null) {
      errorMessage = 'Error is undefined or null';
      errorType = 'null_error';
    } else if (typeof error === 'string') {
      errorMessage = error;
      errorType = 'string_error';
    } else if (error instanceof Error) {
      errorMessage = error.message || 'Error with no message';
      errorStack = error.stack;
      errorType = error.constructor?.name || 'Error';
    } else if (typeof error === 'object') {
      errorMessage = error.message || JSON.stringify(error).slice(0, 200);
      errorType = 'object_error';
    }

    log.error({
      requestId: request.id,
      errorMessage,
      errorCode: error?.code || 'UNKNOWN',
      errorName: error?.name,
      errorType,
      url: request.url,
      method: request.method,
      stack: statusCode >= 500 ? errorStack : undefined,
      statusCode,
    }, 'Request error');

    if (statusCode >= 400 && error instanceof Error) {
      trackError(error, request, {
        statusCode,
        errorType,
        requestId: request.id,
      });
    }

    const message = isProduction && statusCode >= 500
      ? 'Internal server error'
      : errorMessage;

    return reply.status(statusCode).send({
      error: {
        code: error?.code || 'ERROR',
        message,
        statusCode,
      },
    });
  });

  app.setNotFoundHandler(async (request, reply) => {
    return reply.status(404).send({
      error: {
        code: 'NOT_FOUND',
        message: `Route ${request.method} ${request.url} not found`,
        statusCode: 404,
      },
    });
  });

  // ============================================
  // PLUGINS
  // ============================================

  await app.register(compress, {
    encodings: ['gzip', 'deflate', 'br'],
    threshold: 1024,
  });

  await app.register(cors, {
    origin: config.CORS_ORIGIN === '*' ? true : config.CORS_ORIGIN.split(','),
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Request-ID',
      'X-Idempotency-Key',
      'X-CSRF-Token',
      'X-Signature',
      'X-Timestamp',
      'Accept-Language',
      'Apollo-Require-Preflight',
    ],
  });

  await app.register(helmet, {
    contentSecurityPolicy: isProduction ? {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:', 'https:'],
        connectSrc: ["'self'", 'wss:', 'https:'],
      },
    } : false,
    crossOriginEmbedderPolicy: false,
  });

  await app.register(sensible);

  await app.register(rateLimit, {
    max: config.RATE_LIMIT_MAX,
    timeWindow: config.RATE_LIMIT_WINDOW_MS,
    allowList: (request) => {
      const skipUrls = ['/api/vitals', '/api/client-error', '/health', '/ready', '/metrics', '/api/graphql'];
      return skipUrls.some(url => request.url.startsWith(url));
    },
    errorResponseBuilder: () => ({
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Too many requests, please try again later',
        statusCode: 429,
      },
    }),
  });

  await app.register(websocket, {
    options: {
      maxPayload: 1024 * 64,
      perMessageDeflate: true,
    },
  });

  await app.register(multipart, {
    limits: {
      fileSize: 10 * 1024 * 1024, // 10MB
      files: 5,
    },
  });

  // ============================================
  // INFRASTRUCTURE ROUTES (ROOT LEVEL)
  // These MUST be REST for load balancers/monitoring
  // ============================================

  // Health checks for load balancers
  registerHealthRoutes(app as unknown as FastifyInstance);

  // Prometheus metrics
  await registerMetricsRoutes(app as unknown as FastifyInstance);

  // Security middleware
  registerSecurityMiddleware(app as unknown as FastifyInstance);

  // Emergency mode middleware
  app.addHook('onRequest', async (request, reply) => {
    await emergencyModeMiddleware(request, reply);
  });

  // Metrics collection hook
  registerMetricsHook(app as unknown as FastifyInstance);

  // Initialize PubSub for GraphQL subscriptions
  await initializePubSub();

  // Web Vitals - unauthenticated beacon
  app.post('/api/vitals', async (request, reply) => {
    if (!isProduction) {
      log.debug({ vitals: request.body }, 'Web Vitals received');
    }
    return reply.status(204).send();
  });

  // Client Error - unauthenticated error collection
  app.post('/api/client-error', async (request, reply) => {
    const errorData = request.body as {
      type?: string;
      message?: string;
      source?: string;
      line?: number;
      col?: number;
      stack?: string;
      time?: string;
      extra?: Record<string, unknown>;
      phase?: string;
      msg?: string;
      error?: string;
    };

    const message = errorData.message ||
      (errorData.phase && errorData.msg ? `[${errorData.phase}] ${errorData.msg}` : 'No message');

    log.error({
      clientError: true,
      type: errorData.type || 'unknown',
      message: message,
      source: errorData.source || 'unknown',
      line: errorData.line || 0,
      col: errorData.col || 0,
      stack: errorData.stack || 'No stack trace',
      clientTime: errorData.time,
      userAgent: request.headers['user-agent'],
      ip: request.ip,
      extra: errorData.extra,
    }, `[Client Error] ${message}`);

    return reply.status(200).send({ received: true });
  });

  // ============================================
  // GRAPHQL - THE PRIMARY DATA INTERFACE
  // All application data flows through here
  // ============================================

  await app.register(async (gql) => {
    await registerGraphQLRoutes(gql);
  }, { prefix: '/api' });

  // ============================================
  // INFRASTRUCTURE REST ROUTES (under /api)
  // These are the ONLY REST endpoints for app use
  // ============================================

  await app.register(async (api) => {
    // Plain text docs for AI assistants
    registerDocsPlainRoutes(api as unknown as FastifyInstance);

    // Deployment management (for Claude Code remote deploys)
    await registerDeploymentRoutes(api);

    // Frontend error collection (Cockatrice system)
    await registerErrorRoutes(api);

    // System monitoring and health
    await registerMonitoringRoutes(api);

    // File uploads (multipart/form-data - can't do over GraphQL)
    await api.register(exerciseImagesRoutes);
    await api.register(progressPhotosRoutes);

    // Billing webhooks (Stripe signature verification)
    await registerBillingRoutes(api);

    // ============================================
    // ADMIN ROUTES (kept for operational safety)
    // Emergency controls, logs, database ops
    // ============================================

    await registerAdminControlRoutes(api);
    await api.register(adminServerRoutes);
    await api.register(adminDeployRoutes);
    await api.register(adminCommandsRoutes);
    await adminLogsRoutes(api);
    await api.register(adminDatabaseRoutes);
    await api.register(adminMetricsRoutes);
    await adminBackupRoutes(api);

  }, { prefix: '/api' });

  return app as unknown as FastifyInstance;
}

/**
 * Start the server
 */
export async function startServer(app: FastifyInstance): Promise<void> {
  const shutdown = async (signal: string) => {
    try {
      log.info({ signal }, `${signal} received, shutting down gracefully...`);

      await app.close();
      await closeDatabase();
      await closeRedis();
      cleanupPubSub();

      log.info('Graceful shutdown completed');
      process.exit(0);
    } catch (err) {
      log.error({ err }, 'Error during shutdown');
      process.exit(1);
    }
  };

  process.on('SIGTERM', () => void shutdown('SIGTERM'));
  process.on('SIGINT', () => void shutdown('SIGINT'));

  try {
    await app.listen({ port: config.PORT, host: config.HOST });

    log.info(`🚀 Pure GraphQL Server running on http://${config.HOST}:${config.PORT}`);
    log.info(`📊 GraphQL Endpoint: http://${config.HOST}:${config.PORT}/api/graphql`);
    log.info(`🏥 Health Check: http://${config.HOST}:${config.PORT}/health`);
    log.info(`📈 Metrics: http://${config.HOST}:${config.PORT}/metrics`);
    log.info(`Environment: ${config.NODE_ENV}`);

    if (config.REDIS_ENABLED) {
      log.info('Redis: enabled');
    }
  } catch (err) {
    log.fatal({ err }, 'Failed to start server');
    process.exit(1);
  }
}
