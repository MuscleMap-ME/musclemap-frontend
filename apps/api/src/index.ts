/**
 * MuscleMap API Server
 *
 * Entry point for the API server.
 */

import { createServer, startServer } from './http';
import { initializePool, closePool } from './db/client';
import { initializeSchema, seedCreditActions } from './db/schema';
import { migrate as migrateTrialAndSubscriptions } from './db/migrations/001_add_trial_and_subscriptions';
import { migrate as migrateCommunityDashboard } from './db/migrations/002_community_dashboard';
import { migrate as migrateMessaging } from './db/migrations/003_messaging';
import { migrate as migrateExerciseEquipmentLocations } from './db/migrations/004_exercise_equipment_locations';
import { migrate as migrateTipsAndMilestones } from './db/migrations/005_tips_and_milestones';
import { migrate as migratePerformanceOptimization } from './db/migrations/006_performance_optimization';
import { migrate as migrateSkillProgressionTrees } from './db/migrations/043_skill_progression_trees';
import { loadAllPlugins, invokePluginHook } from './plugins/plugin-loader';
import { logger } from './lib/logger';
import { getRedis, closeRedis, isRedisAvailable } from './lib/redis';
import { config } from './config';
import { startScheduler, stopScheduler } from './lib/scheduler';
import { startBugFixWorker, stopBugFixWorker } from './jobs/bug-fix.queue';

async function main(): Promise<void> {
  logger.info('🚀 Starting MuscleMap API server...');

  // Initialize database pool
  await initializePool();

  // Initialize schema and run migrations
  await initializeSchema();
  await seedCreditActions();
  await migrateTrialAndSubscriptions();
  await migrateCommunityDashboard();
  await migrateMessaging();
  await migrateExerciseEquipmentLocations();
  await migrateTipsAndMilestones();
  await migratePerformanceOptimization();
  await migrateSkillProgressionTrees();
  logger.info('✅ Database initialized');

  // Initialize Redis if enabled
  if (config.REDIS_ENABLED) {
    getRedis();
    // Give Redis a moment to connect
    await new Promise((resolve) => setTimeout(resolve, 100));
    if (isRedisAvailable()) {
      logger.info('✅ Redis connected');
    } else {
      logger.warn('⚠️ Redis enabled but not yet connected');
    }
  } else {
    logger.info('ℹ️ Redis disabled (REDIS_ENABLED=false)');
  }

  // Load plugins
  await loadAllPlugins();
  logger.info('✅ Plugins loaded');

  // Create and start server
  const app = await createServer();
  await startServer(app);

  // Notify plugins
  await invokePluginHook('onServerStart');

  // Start scheduled jobs (leaderboard rewards, mute expiry, etc.)
  startScheduler();

  // Start bug fix worker (processes confirmed bug reports)
  startBugFixWorker();

  // Graceful shutdown
  const shutdown = async () => {
    logger.info('Shutting down...');

    // Stop scheduler first
    stopScheduler();

    // Stop bug fix worker
    await stopBugFixWorker();

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
      await closePool();
    } catch (error) {
      logger.error({ error }, 'Error closing database');
    }

    try {
      await closeRedis();
    } catch (error) {
      logger.error({ error }, 'Error closing Redis');
    }
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

main().catch((error) => {
  logger.fatal({ error }, 'Failed to start server');
  process.exit(1);
});
