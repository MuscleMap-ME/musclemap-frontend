/**
 * MuscleMap API Server
 *
 * Entry point for the API server.
 */

import { createServer, startServer } from './http';
import { db } from './db/client';
import { initializeSchema, seedCreditActions } from './db/schema';
import { loadAllPlugins, invokePluginHook } from './plugins/plugin-loader';
import { logger } from './lib/logger';

async function main(): Promise<void> {
  logger.info('🚀 Starting MuscleMap API server...');

  // Initialize database
  initializeSchema();
  seedCreditActions();
  logger.info('✅ Database initialized');

  // Load plugins
  await loadAllPlugins();
  logger.info('✅ Plugins loaded');

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
      db.close();
    } catch (error) {
      logger.error({ error }, 'Error closing database');
    }
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

main().catch((error) => {
  logger.fatal({ error }, 'Failed to start server');
  process.exit(1);
});
