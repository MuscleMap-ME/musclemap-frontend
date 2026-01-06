/**
 * Fastify Server
 *
 * Pure Fastify implementation with PostgreSQL, compression, and optimized routing.
 * No Express dependencies - fully migrated to Fastify.
 */

import Fastify, { FastifyInstance, FastifyRequest, FastifyReply, FastifyError } from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import sensible from '@fastify/sensible';
import swagger from '@fastify/swagger';
import swaggerUI from '@fastify/swagger-ui';
import compress from '@fastify/compress';
import websocket from '@fastify/websocket';
import multipart from '@fastify/multipart';

import { config, isProduction } from '../config';
import { logger, loggers } from '../lib/logger';
import { closeDatabase, healthCheck as dbHealthCheck, getPoolStats } from '../db/client';
import { closeRedis, isRedisAvailable } from '../lib/redis';

// Route modules
import { registerAuthRoutes } from './routes/auth';
import { registerEconomyRoutes } from './routes/economy';
import { registerWorkoutRoutes } from './routes/workouts';
import { registerPrescriptionRoutes } from './routes/prescription';
import { registerCommunityRoutes } from './routes/community';
import { registerMessagingRoutes } from './routes/messaging';
import { registerJourneyRoutes } from './routes/journey';
import { registerTipsRoutes } from './routes/tips';
import { registerMiscRoutes } from './routes/misc';
import { registerStatsRoutes } from './routes/stats';
import { registerHangoutRoutes } from './routes/hangouts';

// Security middleware
import { registerSecurityMiddleware } from '../middleware/security';

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
 * Create and configure the Fastify server
 */
export async function createServer(): Promise<FastifyInstance> {
  const app = Fastify({
    loggerInstance: logger,
    trustProxy: true,
    // Increase payload limits
    bodyLimit: 10 * 1024 * 1024, // 10MB
    // Request ID generation
    genReqId: () => `req_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 9)}`,
  });

  // Error handler
  app.setErrorHandler(async (error: FastifyError, request, reply) => {
    const statusCode = error.statusCode || 500;

    log.error({
      requestId: request.id,
      error: error.message,
      stack: isProduction ? undefined : error.stack,
      statusCode,
    }, 'Request error');

    // Don't expose internal errors in production
    const message = isProduction && statusCode >= 500
      ? 'Internal server error'
      : error.message;

    return reply.status(statusCode).send({
      error: {
        code: (error as any).code || 'ERROR',
        message,
        statusCode,
      },
    });
  });

  // Not found handler
  app.setNotFoundHandler(async (request, reply) => {
    return reply.status(404).send({
      error: {
        code: 'NOT_FOUND',
        message: `Route ${request.method} ${request.url} not found`,
        statusCode: 404,
      },
    });
  });

  // Register plugins
  await app.register(compress, {
    encodings: ['gzip', 'deflate', 'br'],
    threshold: 1024, // Only compress responses > 1KB
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
      maxPayload: 1024 * 64, // 64KB max message
      perMessageDeflate: true,
    },
  });

  await app.register(multipart, {
    limits: {
      fileSize: 10 * 1024 * 1024, // 10MB
      files: 5,
    },
  });

  // Swagger documentation
  await app.register(swagger, {
    openapi: {
      info: {
        title: 'MuscleMap API',
        version: '2.0.0',
        description: 'Fitness tracking and workout management API',
      },
      servers: [
        { url: `http://localhost:${config.PORT}`, description: 'Development' },
      ],
      components: {
        securitySchemes: {
          bearerAuth: {
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'JWT',
          },
        },
      },
    },
  });

  await app.register(swaggerUI, {
    routePrefix: '/docs',
    uiConfig: {
      docExpansion: 'list',
      deepLinking: true,
    },
  });

  // Health check endpoints
  app.get('/health', async () => {
    const dbHealthy = await dbHealthCheck();
    const poolStats = getPoolStats();

    return {
      status: dbHealthy ? 'ok' : 'degraded',
      timestamp: new Date().toISOString(),
      version: '2.0.0',
      database: {
        connected: dbHealthy,
        pool: poolStats,
      },
      redis: {
        enabled: config.REDIS_ENABLED,
        connected: isRedisAvailable(),
      },
    };
  });

  app.get('/ready', async (request, reply) => {
    const dbHealthy = await dbHealthCheck();
    if (!dbHealthy) {
      return reply.status(503).send({ status: 'not ready', reason: 'database unavailable' });
    }
    return { status: 'ready' };
  });

  // Register security middleware
  registerSecurityMiddleware(app);

  // API routes (all under /api prefix)
  await app.register(async (api) => {
    // Register all route modules
    await registerAuthRoutes(api);
    await registerEconomyRoutes(api);
    await registerWorkoutRoutes(api);
    await registerPrescriptionRoutes(api);
    await registerCommunityRoutes(api);
    await registerMessagingRoutes(api);
    await registerJourneyRoutes(api);
    await registerTipsRoutes(api);
    await registerMiscRoutes(api);
    await registerStatsRoutes(api);
    await registerHangoutRoutes(api);
  }, { prefix: '/api' });

  return app;
}

/**
 * Start the server
 */
export async function startServer(app: FastifyInstance): Promise<void> {
  const shutdown = async (signal: string) => {
    try {
      log.info({ signal }, `${signal} received, shutting down gracefully...`);

      // Close server (stops accepting new connections)
      await app.close();

      // Close database connections
      await closeDatabase();

      // Close Redis connections
      await closeRedis();

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

    log.info(`Server running on http://${config.HOST}:${config.PORT}`);
    log.info(`Environment: ${config.NODE_ENV}`);
    log.info(`API Docs: http://${config.HOST}:${config.PORT}/docs`);

    if (config.REDIS_ENABLED) {
      log.info('Redis: enabled');
    }
  } catch (err) {
    log.fatal({ err }, 'Failed to start server');
    process.exit(1);
  }
}
