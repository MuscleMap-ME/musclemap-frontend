/**
 * BuildNet CLI - Controller Command
 *
 * Start and manage the build controller.
 */

import {
  BuildController,
  createBackend,
  autoDetectBackend,
  StateManager,
  DEFAULT_PLUGINS_CONFIG,
  DEFAULT_BUNDLERS_CONFIG,
} from '@buildnet/core';
import type { ControllerConfig, StateConfig } from '@buildnet/core';

/**
 * Controller command options.
 */
export interface ControllerCommandOptions {
  config?: string;
  port?: number;
  host?: string;
  stateBackend?: 'dragonfly' | 'redis' | 'file' | 'memory' | 'auto';
  stateUrl?: string;
  verbose?: boolean;
}

/**
 * Create a logger.
 */
function createLogger(verbose: boolean) {
  const createLogFn =
    (level: string, enabled: boolean) =>
    (message: string, data?: Record<string, unknown>): void => {
      if (!enabled && level === 'debug') return;

      const timestamp = new Date().toISOString();
      const dataStr = data ? ` ${JSON.stringify(data)}` : '';
      console.log(`[${timestamp}] [${level.toUpperCase()}] ${message}${dataStr}`);
    };

  const logger = {
    debug: createLogFn('debug', verbose),
    info: createLogFn('info', true),
    warn: createLogFn('warn', true),
    error: createLogFn('error', true),
    fatal: createLogFn('fatal', true),
    child: () => logger,
  };

  return logger;
}

/**
 * Start the controller.
 */
export async function startControllerCommand(
  options: ControllerCommandOptions,
): Promise<void> {
  const logger = createLogger(options.verbose ?? false);

  console.log('\n🚀 Starting BuildNet Controller...\n');

  // Create state config
  const stateConfig: StateConfig = {
    backend: options.stateBackend ?? 'auto',
    dragonfly: options.stateUrl
      ? { url: options.stateUrl }
      : undefined,
    file: {
      path: '.buildnet-state/',
    },
  };

  // Initialize state backend
  let stateBackend;
  if (stateConfig.backend === 'auto') {
    stateBackend = await autoDetectBackend(stateConfig, logger);
  } else {
    stateBackend = createBackend(stateConfig.backend as 'dragonfly' | 'redis' | 'file' | 'memory' | 'sqlite' | 'mongodb', stateConfig);
  }

  await stateBackend.connect();
  logger.info(`State backend: ${stateBackend.name}`);

  // Create state manager
  const stateManager = new StateManager(stateBackend);

  // Create controller config
  const controllerConfig: ControllerConfig = {
    id: 'buildnet-controller',
    listen: {
      grpc: `${options.host ?? '0.0.0.0'}:9900`,
      http: `${options.host ?? '0.0.0.0'}:${options.port ?? 9901}`,
      websocket: `${options.host ?? '0.0.0.0'}:9902`,
    },
    heartbeat: {
      interval_ms: 5000,
      timeout_ms: 15000,
      max_missed: 3,
    },
    scheduler: {
      process_interval_ms: 1000,
      heartbeat_timeout_ms: 15000,
      max_retries: 3,
    },
  };

  // Create controller
  const controller = new BuildController(
    stateManager,
    controllerConfig,
    DEFAULT_PLUGINS_CONFIG as any,
    DEFAULT_BUNDLERS_CONFIG,
    logger,
  );

  // Handle shutdown
  let isShuttingDown = false;

  const shutdown = async () => {
    if (isShuttingDown) return;
    isShuttingDown = true;

    console.log('\n\n🛑 Shutting down controller...');
    await controller.stop();
    await stateBackend.disconnect();
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);

  // Start controller
  await controller.start();

  console.log('✅ Controller started');
  console.log(`   HTTP: http://${options.host ?? '0.0.0.0'}:${options.port ?? 9901}`);
  console.log('\n   Press Ctrl+C to stop\n');

  // Subscribe to events for logging
  controller.onEvent((event) => {
    switch (event.type) {
      case 'build_queued':
        logger.info(`Build queued: ${event.buildId}`);
        break;
      case 'build_started':
        logger.info(`Build started: ${event.buildId} on ${event.node}`);
        break;
      case 'build_completed':
        logger.info(`Build completed: ${event.buildId}`);
        break;
      case 'build_failed':
        logger.error(`Build failed: ${event.buildId} - ${event.error}`);
        break;
      case 'node_registered':
        logger.info(`Node registered: ${event.nodeId}`);
        break;
      case 'node_unregistered':
        logger.info(`Node unregistered: ${event.nodeId}`);
        break;
      case 'node_unhealthy':
        logger.warn(`Node unhealthy: ${event.nodeId}`);
        break;
    }
  });

  // Keep running
  await new Promise(() => {});
}

/**
 * Show controller status.
 */
export async function controllerStatusCommand(
  controller: BuildController,
): Promise<void> {
  const status = controller.getStatus();

  console.log('\n📊 Controller Status\n');
  console.log(`   Running: ${status.isRunning ? '✅ Yes' : '❌ No'}`);

  console.log('\n   Scheduler:');
  console.log(`     Queue length:   ${status.scheduler.queueLength}`);
  console.log(`     Running builds: ${status.scheduler.runningCount}`);
  console.log(`     Nodes:          ${status.scheduler.nodes.length}`);

  console.log('\n   Plugins:');
  const enabledPlugins = status.plugins.filter((p) => p.enabled);
  console.log(`     Loaded:  ${status.plugins.length}`);
  console.log(`     Enabled: ${enabledPlugins.length}`);

  console.log('\n   Bundlers:');
  const activeBundler = status.bundlers.find((b) => b.active);
  console.log(`     Active: ${activeBundler?.name ?? 'none'}`);
  console.log(`     Available: ${status.bundlers.filter((b) => b.available).length}`);

  console.log();
}
