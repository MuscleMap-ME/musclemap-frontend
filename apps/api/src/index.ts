/**
 * MuscleMap API Server
 *
 * Entry point for the API server.
 * Uses PostgreSQL for the database and Fastify for the HTTP server.
 */

import { createServer, startServer } from './http';
import { initDatabase, closeDatabase } from './db/postgres';
import { loadAllPlugins, invokePluginHook } from './plugins/plugin-loader';
import { logger } from './lib/logger';
import { getRedis, closeRedis, isRedisAvailable } from './lib/redis';
import { config } from './config';

async function main(): Promise<void> {
  logger.info('Starting MuscleMap API server...');

  // Initialize PostgreSQL connection pool
  await initDatabase();
  logger.info('Database connected');

  // Initialize Redis if enabled
  if (config.REDIS_ENABLED) {
    getRedis();
    // Give Redis a moment to connect
    await new Promise((resolve) => setTimeout(resolve, 100));
    if (isRedisAvailable()) {
      logger.info('Redis connected');
    } else {
      logger.warn('Redis enabled but not yet connected');
    }
  } else {
    logger.info('Redis disabled (REDIS_ENABLED=false)');
  }

  // Load plugins
  await loadAllPlugins();
  logger.info('Plugins loaded');

  // Create and start server
  const app = await createServer();
  await startServer(app);

  // Notify plugins
  await invokePluginHook('onServerStart');

  // Graceful shutdown
  const shutdown = async () => {
    logger.info('Shutting down...');

    try {
      await invokePluginHook('onShutdown');
    } catch (error) {
      logger.error({ error }, 'Error during onShutdown hook');
    }

    try {
      await app.close();
    } catch (error) {
      logger.error({ error }, 'Error closing Fastify server');
    }

    try {
      await closeDatabase();
    } catch (error) {
      logger.error({ error }, 'Error closing database');
    }

    try {
      await closeRedis();
    } catch (error) {
      logger.error({ error }, 'Error closing Redis');
    }

    process.exit(0);
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

main().catch((error) => {
  logger.fatal({ error }, 'Failed to start server');
  process.exit(1);
});
