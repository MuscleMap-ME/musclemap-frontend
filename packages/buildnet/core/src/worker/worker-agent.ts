/**
 * BuildNet Worker Agent
 *
 * Executes build tasks on a worker node and reports
 * results back to the controller.
 */

import type {
  BuildContext,
  BuildResult,
  BuildTask,
  Logger,
  NodeConfig,
  NodeLoad,
  WorkerNode,
  BundlersConfig,
  PluginsConfig,
} from '../types/index.js';
import type { StateManager } from '../state/index.js';
import { PluginLoader, PluginExecutor } from '../plugins/index.js';
import { BundlerManager } from '../bundlers/index.js';

/**
 * Worker agent configuration.
 */
export interface WorkerAgentConfig {
  nodeId: string;
  host: string;
  port: number;
  controllerUrl: string;
  nodeConfig: NodeConfig;
  plugins: PluginsConfig;
  bundlers: BundlersConfig;
  heartbeat_interval_ms?: number;
  max_concurrent_builds?: number;
}

/**
 * Task assignment from controller.
 */
interface TaskAssignment {
  id: string;
  task: BuildTask;
  priority: number;
  queuedAt: Date;
}

/**
 * Worker Agent - Executes builds on a node.
 */
export class WorkerAgent {
  private config: WorkerAgentConfig;
  private stateManager: StateManager;
  private pluginLoader: PluginLoader;
  private pluginExecutor: PluginExecutor;
  private bundlerManager: BundlerManager;
  private logger: Logger;

  private isRunning = false;
  private activeBuildIds = new Set<string>();
  private heartbeatInterval?: NodeJS.Timeout;
  private resourceMonitorInterval?: NodeJS.Timeout;
  private currentLoad: NodeLoad = {
    cpu_percent: 0,
    memory_used_gb: 0,
    memory_free_gb: 0,
    io_percent: 0,
    queue_depth: 0,
    active_builds: 0,
  };

  constructor(
    config: WorkerAgentConfig,
    stateManager: StateManager,
    logger: Logger,
  ) {
    this.config = config;
    this.stateManager = stateManager;
    this.logger = logger;

    // Initialize plugin system
    this.pluginLoader = new PluginLoader(config.plugins, logger);
    this.pluginExecutor = new PluginExecutor(this.pluginLoader, logger);

    // Initialize bundler manager
    this.bundlerManager = new BundlerManager(config.bundlers, logger);
  }

  /**
   * Start the worker agent.
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      return;
    }

    this.logger.info('Starting worker agent...', {
      nodeId: this.config.nodeId,
      host: this.config.host,
      port: this.config.port,
    });

    // Initialize components
    await this.pluginLoader.loadAll();
    await this.bundlerManager.initialize();

    // Register with controller
    await this.registerWithController();

    // Start heartbeat
    this.heartbeatInterval = setInterval(
      () => this.sendHeartbeat(),
      this.config.heartbeat_interval_ms ?? 5000,
    );

    // Start resource monitoring
    this.resourceMonitorInterval = setInterval(
      () => this.updateResourceMetrics(),
      2000,
    );

    // Subscribe to task assignments
    await this.subscribeToTasks();

    this.isRunning = true;
    this.logger.info('Worker agent started');
  }

  /**
   * Stop the worker agent.
   */
  async stop(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    this.logger.info('Stopping worker agent...');

    // Stop heartbeat
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = undefined;
    }

    // Stop resource monitoring
    if (this.resourceMonitorInterval) {
      clearInterval(this.resourceMonitorInterval);
      this.resourceMonitorInterval = undefined;
    }

    // Wait for active builds to complete (with timeout)
    if (this.activeBuildIds.size > 0) {
      this.logger.info('Waiting for active builds to complete...');
      const timeout = 60000; // 1 minute
      const start = Date.now();

      while (this.activeBuildIds.size > 0 && Date.now() - start < timeout) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }

    // Unregister from controller
    await this.unregisterFromController();

    this.isRunning = false;
    this.logger.info('Worker agent stopped');
  }

  /**
   * Get node info for registration.
   */
  getNodeInfo(): WorkerNode {
    return {
      id: this.config.nodeId,
      host: this.config.host,
      port: this.config.port,
      status: 'healthy',
      config: this.config.nodeConfig,
      resources: this.config.nodeConfig.resources,
      constraints: this.config.nodeConfig.constraints,
      normalization: this.config.nodeConfig.resources.normalization,
      capabilities: this.config.nodeConfig.capabilities,
      preferred_for: this.config.nodeConfig.preferred_for,
      currentLoad: this.currentLoad,
    };
  }

  /**
   * Execute a build task.
   */
  async executeBuild(assignment: TaskAssignment): Promise<BuildResult> {
    const { id: buildId, task } = assignment;
    const startTime = Date.now();

    this.logger.info(`Build started: ${buildId}`, {
      task: task.name,
      nodeId: this.config.nodeId,
    });

    this.activeBuildIds.add(buildId);
    this.currentLoad.active_builds = this.activeBuildIds.size;

    // Notify controller
    await this.notifyBuildStarted(buildId);

    // Create build context
    const context = await this.createBuildContext(buildId, task);

    try {
      // Phase 1: Pre-build plugins
      await this.notifyProgress(buildId, 'pre-build', 10);
      await this.pluginExecutor.executeHook('pre-build', context);

      // Phase 2: Build with bundler
      await this.notifyProgress(buildId, 'build', 30);
      const bundler = this.bundlerManager.getActive();
      const result = await bundler.build(context);

      if (!result.success) {
        throw new Error(result.errors?.[0]?.message ?? 'Build failed');
      }

      // Phase 3: Post-build plugins
      await this.notifyProgress(buildId, 'post-build', 80);
      await this.pluginExecutor.executeHook('post-build', context, result);

      // Phase 4: Deploy plugins (if applicable)
      await this.notifyProgress(buildId, 'deploy', 95);
      await this.pluginExecutor.executeHook('deploy', context, result);

      // Complete
      await this.notifyProgress(buildId, 'complete', 100);

      const finalResult: BuildResult = {
        ...result,
        duration_ms: Date.now() - startTime,
        metrics: {
          ...result.metrics,
          total_duration_ms: Date.now() - startTime,
          queue_wait_ms: startTime - assignment.queuedAt.getTime(),
        },
      };

      this.logger.info(`Build completed: ${buildId}`, {
        duration_ms: finalResult.duration_ms,
        artifacts: finalResult.artifacts?.length ?? 0,
      });

      // Notify controller
      await this.notifyBuildCompleted(buildId, finalResult);

      return finalResult;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const stack = error instanceof Error ? error.stack : undefined;

      this.logger.error(`Build failed: ${buildId}`, {
        error: errorMessage,
        stack,
      });

      // Execute error hook
      try {
        await this.pluginExecutor.executeHook('error', context);
      } catch (pluginError) {
        this.logger.warn('Error plugin failed', { error: pluginError });
      }

      const failedResult: BuildResult = {
        success: false,
        buildId,
        duration_ms: Date.now() - startTime,
        artifacts: [],
        errors: [
          {
            code: 'BUILD_FAILED',
            message: errorMessage,
            stack,
          },
        ],
        metrics: {
          queue_wait_ms: startTime - assignment.queuedAt.getTime(),
          total_duration_ms: Date.now() - startTime,
          phases: {
            pre_build_ms: 0,
            build_ms: 0,
            post_build_ms: 0,
          },
          cache: {
            files_checked: 0,
            cache_hits: 0,
            cache_misses: 0,
            hit_ratio: 0,
            time_saved_ms: 0,
          },
          resources: {
            peak_memory_mb: 0,
            avg_cpu_percent: 0,
            io_read_mb: 0,
            io_write_mb: 0,
          },
        },
      };

      // Notify controller
      await this.notifyBuildCompleted(buildId, failedResult);

      return failedResult;
    } finally {
      this.activeBuildIds.delete(buildId);
      this.currentLoad.active_builds = this.activeBuildIds.size;
    }
  }

  /**
   * Check if agent can accept more builds.
   */
  canAcceptBuild(): boolean {
    const maxConcurrent =
      this.config.max_concurrent_builds ??
      this.config.nodeConfig.constraints.max_concurrent_builds;

    return this.activeBuildIds.size < maxConcurrent;
  }

  /**
   * Get current status.
   */
  getStatus(): {
    nodeId: string;
    isRunning: boolean;
    activeBuilds: number;
    maxConcurrent: number;
    currentLoad: NodeLoad;
    bundler: string;
    plugins: number;
  } {
    return {
      nodeId: this.config.nodeId,
      isRunning: this.isRunning,
      activeBuilds: this.activeBuildIds.size,
      maxConcurrent:
        this.config.max_concurrent_builds ??
        this.config.nodeConfig.constraints.max_concurrent_builds,
      currentLoad: this.currentLoad,
      bundler: this.bundlerManager.getActive()?.name ?? 'none',
      plugins: this.pluginLoader.listEnabled().length,
    };
  }

  /**
   * Register with the controller.
   */
  private async registerWithController(): Promise<void> {
    const nodeInfo = this.getNodeInfo();

    // Publish registration via state manager
    await this.stateManager.publish(
      'worker:updates',
      JSON.stringify({
        type: 'register',
        node: nodeInfo,
      }),
    );

    // Store node info
    await this.stateManager.set(
      `node:${this.config.nodeId}`,
      JSON.stringify(nodeInfo),
    );

    this.logger.info('Registered with controller');
  }

  /**
   * Unregister from the controller.
   */
  private async unregisterFromController(): Promise<void> {
    await this.stateManager.publish(
      'worker:updates',
      JSON.stringify({
        type: 'unregister',
        nodeId: this.config.nodeId,
      }),
    );

    await this.stateManager.delete(`node:${this.config.nodeId}`);

    this.logger.info('Unregistered from controller');
  }

  /**
   * Subscribe to task assignments.
   */
  private async subscribeToTasks(): Promise<void> {
    const channel = `node:${this.config.nodeId}:tasks`;

    this.stateManager.subscribe(channel, async (message) => {
      try {
        const event = JSON.parse(message);

        if (event.type === 'task_assigned') {
          const assignment = event.task as TaskAssignment;
          assignment.queuedAt = new Date(assignment.queuedAt);

          // Check if we can accept the build
          if (!this.canAcceptBuild()) {
            this.logger.warn(`Cannot accept build: ${assignment.id} (at capacity)`);
            // Notify controller to reassign
            await this.stateManager.publish(
              'worker:updates',
              JSON.stringify({
                type: 'task_rejected',
                taskId: assignment.id,
                nodeId: this.config.nodeId,
                reason: 'at_capacity',
              }),
            );
            return;
          }

          // Execute the build (non-blocking)
          this.executeBuild(assignment).catch((error) => {
            this.logger.error(`Build execution error: ${assignment.id}`, { error });
          });
        }
      } catch (error) {
        this.logger.error('Failed to process task message', { error, message });
      }
    });

    this.logger.debug(`Subscribed to ${channel}`);
  }

  /**
   * Send heartbeat to controller.
   */
  private async sendHeartbeat(): Promise<void> {
    try {
      await this.stateManager.publish(
        'worker:updates',
        JSON.stringify({
          type: 'heartbeat',
          nodeId: this.config.nodeId,
          metrics: {
            cpu_percent: this.currentLoad.cpu_percent,
            memory_used_gb: this.currentLoad.memory_used_gb,
            active_builds: this.activeBuildIds.size,
          },
          activeBuildIds: Array.from(this.activeBuildIds),
        }),
      );
    } catch (error) {
      this.logger.warn('Failed to send heartbeat', { error });
    }
  }

  /**
   * Update resource metrics.
   */
  private async updateResourceMetrics(): Promise<void> {
    try {
      const os = await import('node:os');

      // CPU usage (average across cores)
      const cpus = os.cpus();
      let totalIdle = 0;
      let totalTick = 0;

      for (const cpu of cpus) {
        for (const type of Object.keys(cpu.times) as Array<keyof typeof cpu.times>) {
          totalTick += cpu.times[type];
        }
        totalIdle += cpu.times.idle;
      }

      this.currentLoad.cpu_percent = 100 - (totalIdle / totalTick) * 100;

      // Memory usage
      const totalMemory = os.totalmem() / (1024 * 1024 * 1024);
      const freeMemory = os.freemem() / (1024 * 1024 * 1024);
      this.currentLoad.memory_used_gb = totalMemory - freeMemory;
      this.currentLoad.memory_free_gb = freeMemory;

      // Active builds
      this.currentLoad.active_builds = this.activeBuildIds.size;
    } catch (error) {
      this.logger.warn('Failed to update resource metrics', { error });
    }
  }

  /**
   * Notify controller that build started.
   */
  private async notifyBuildStarted(buildId: string): Promise<void> {
    await this.stateManager.publish(
      'worker:updates',
      JSON.stringify({
        type: 'build_started',
        buildId,
        nodeId: this.config.nodeId,
      }),
    );
  }

  /**
   * Notify controller of build progress.
   */
  private async notifyProgress(
    buildId: string,
    phase: string,
    progress: number,
  ): Promise<void> {
    await this.stateManager.publish(
      'worker:updates',
      JSON.stringify({
        type: 'build_progress',
        buildId,
        phase,
        progress,
      }),
    );
  }

  /**
   * Notify controller that build completed.
   */
  private async notifyBuildCompleted(
    buildId: string,
    result: BuildResult,
  ): Promise<void> {
    await this.stateManager.publish(
      'worker:updates',
      JSON.stringify({
        type: 'build_completed',
        buildId,
        result,
      }),
    );
  }

  /**
   * Create build context for a task.
   */
  private async createBuildContext(
    buildId: string,
    task: BuildTask,
  ): Promise<BuildContext> {
    const workDir = task.project ?? process.cwd();

    return {
      buildId,
      task,
      taskName: task.name,
      nodeId: this.config.nodeId,
      workDir,
      env: {
        ...process.env as Record<string, string>,
        NODE_ENV: process.env.NODE_ENV ?? 'production',
        BUILDNET_BUILD_ID: buildId,
        BUILDNET_NODE_ID: this.config.nodeId,
      },
      logger: this.logger,
      metrics: this.createMetricsCollector(),
      stateManager: this.stateManager,
    };
  }

  /**
   * Create a metrics collector.
   */
  private createMetricsCollector(): import('../types/index.js').MetricsCollector {
    const timings: Record<string, number> = {};
    const gauges: Record<string, number> = {};
    const counters: Record<string, number> = {};

    return {
      timing: (name: string, value: number) => {
        timings[name] = value;
      },
      gauge: (name: string, value: number) => {
        gauges[name] = value;
      },
      counter: (name: string, value = 1) => {
        counters[name] = (counters[name] ?? 0) + value;
      },
      increment: (name: string) => {
        counters[name] = (counters[name] ?? 0) + 1;
      },
      histogram: (name: string, value: number) => {
        // Simple histogram as timing
        timings[`histogram_${name}`] = value;
      },
      getAll: () => ({ timings, gauges, counters }),
    };
  }
}
