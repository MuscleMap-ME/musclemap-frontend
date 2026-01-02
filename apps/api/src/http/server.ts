/**
 * Fastify Server (Phase 2)
 *
 * Fastify is the main server process.
 * For now, we mount the existing Express API stack under /api (compat mode),
 * so nothing breaks while we migrate modules route-by-route (Phase 3).
 */

import Fastify, { FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import sensible from '@fastify/sensible';
import swagger from '@fastify/swagger';
import swaggerUI from '@fastify/swagger-ui';
import fastifyExpress from '@fastify/express';

import express from 'express';
import corsExpress from 'cors';
import helmetExpress from 'helmet';

import { config, isProduction } from '../config';
import { logger } from '../lib/logger';

// Existing Express middleware + router (compat layer)
import { requestId, apiRateLimiter, errorHandler, notFoundHandler } from './middleware';
import { createApiRouter } from './router';

// WebSocket for community features
import { registerWebSocketRoutes } from '../modules/community/websocket';
import { registerMessagingWebSocket } from '../modules/messaging/websocket';
import { registerRivalsWebSocket } from '../modules/rivals/websocket';

export async function createServer(): Promise<FastifyInstance> {
  // Use your existing pino logger if it’s compatible; otherwise Fastify can manage its own.
  const app = Fastify({
    loggerInstance: logger as any,
    trustProxy: true,
  });

  // Fastify-native baseline (useful immediately for future migration)
  await app.register(cors, {
    origin: config.CORS_ORIGIN === '*' ? true : config.CORS_ORIGIN.split(','),
    credentials: true,
  });

  await app.register(helmet, {
    contentSecurityPolicy: isProduction,
  });

  await app.register(sensible);

  await app.register(rateLimit, {
    max: 500,
    timeWindow: '1 minute',
  });

  // Swagger shell (routes will appear as you migrate endpoints to Fastify)
  await app.register(swagger, {
    openapi: {
      info: {
        title: 'MuscleMap API',
        version: '2.0.0',
      },
    },
  });

  await app.register(swaggerUI, {
    routePrefix: '/docs',
    uiConfig: {
      docExpansion: 'list',
      deepLinking: false,
    },
  });

  // ---------------------------
  // Express compatibility mount
  // ---------------------------
  await app.register(fastifyExpress);

  // Build an Express app identical to your previous server.ts wiring,
  // then mount it into Fastify.
  const exp = express();

  exp.use(helmetExpress({ contentSecurityPolicy: isProduction }));
  exp.use(corsExpress({
    origin: config.CORS_ORIGIN === '*' ? true : config.CORS_ORIGIN.split(','),
    credentials: true,
  }));

  exp.use(express.json({ limit: '10mb' }));
  exp.use(express.urlencoded({ extended: true }));

  exp.use(requestId);
  exp.use('/api/', apiRateLimiter);

  exp.use('/api', createApiRouter());
  exp.use('/api', notFoundHandler);
  exp.use(errorHandler);

  // Mount the express app at root (it already uses /api prefix internally)
  app.use(exp);

  // Optional: tiny Fastify-native ping that bypasses express
  app.get('/__fastify', async () => ({ ok: true, ts: new Date().toISOString() }));

  // Register WebSocket routes for community features
  await registerWebSocketRoutes(app);

  // Register WebSocket routes for messaging
  await registerMessagingWebSocket(app);

  // Register WebSocket routes for rivals
  registerRivalsWebSocket(app);

  return app;
}

export async function startServer(app: FastifyInstance): Promise<void> {
  const shutdown = async (signal: string) => {
    try {
      app.log.info({ signal }, `${signal} received, shutting down gracefully...`);
      await app.close();
      process.exit(0);
    } catch (err) {
      app.log.error({ err }, 'Forced shutdown after error');
      process.exit(1);
    }
  };

  process.on('SIGTERM', () => void shutdown('SIGTERM'));
  process.on('SIGINT', () => void shutdown('SIGINT'));

  try {
    await app.listen({ port: Number(config.PORT), host: config.HOST });
    app.log.info(`Server running on http://${config.HOST}:${config.PORT}`);
    app.log.info(`Environment: ${config.NODE_ENV}`);
    app.log.info(`Docs: http://${config.HOST}:${config.PORT}/docs`);
  } catch (err) {
    app.log.fatal({ err }, 'Failed to start server');
    process.exit(1);
  }
}
