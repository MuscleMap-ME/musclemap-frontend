/**
 * BuildNet Controller
 *
 * Central coordinator for the distributed build network.
 * Manages workers, scheduling, and build orchestration.
 */

import type {
  BuildContext,
  BuildResult,
  BuildTask,
  ControllerConfig,
  Logger,
  WorkerNode,
  BundlersConfig,
  PluginsConfig,
} from '../types/index.js';
import type { StateManager } from '../state/index.js';
import { Scheduler, TaskPriority, type QueuedTask } from './scheduler.js';
import { PluginLoader, PluginExecutor } from '../plugins/index.js';
import { BundlerManager } from '../bundlers/index.js';

/**
 * Build request from clients.
 */
export interface BuildRequest {
  task: string;
  project?: string;
  branch?: string;
  commit?: string;
  triggeredBy: string;
  priority?: TaskPriority;
  options?: {
    noCache?: boolean;
    staged?: boolean;
    node?: string;
    bundler?: string;
  };
}

/**
 * Build status update.
 */
export interface BuildStatus {
  buildId: string;
  status: 'queued' | 'running' | 'success' | 'failure' | 'cancelled';
  phase?: string;
  progress?: number;
  startedAt?: Date;
  completedAt?: Date;
  result?: BuildResult;
  error?: string;
}

/**
 * Controller event types.
 */
export type ControllerEvent =
  | { type: 'build_queued'; buildId: string; task: string }
  | { type: 'build_started'; buildId: string; node: string }
  | { type: 'build_completed'; buildId: string; result: BuildResult }
  | { type: 'build_failed'; buildId: string; error: string }
  | { type: 'node_registered'; nodeId: string }
  | { type: 'node_unregistered'; nodeId: string }
  | { type: 'node_unhealthy'; nodeId: string };

/**
 * Event listener callback.
 */
export type ControllerEventListener = (event: ControllerEvent) => void;

/**
 * Build Controller - Central coordinator.
 */
export class BuildController {
  private stateManager: StateManager;
  private scheduler: Scheduler;
  private pluginLoader: PluginLoader;
  private pluginExecutor: PluginExecutor;
  private bundlerManager: BundlerManager;
  private config: ControllerConfig;
  private logger: Logger;
  private builds = new Map<string, BuildStatus>();
  private eventListeners: ControllerEventListener[] = [];
  private isRunning = false;
  private heartbeatInterval?: NodeJS.Timeout;

  constructor(
    stateManager: StateManager,
    config: ControllerConfig,
    pluginsConfig: PluginsConfig,
    bundlersConfig: BundlersConfig,
    logger: Logger,
  ) {
    this.stateManager = stateManager;
    this.config = config;
    this.logger = logger;

    // Initialize scheduler
    this.scheduler = new Scheduler(
      stateManager,
      config.scheduler ?? {},
      logger,
    );

    // Initialize plugin system
    this.pluginLoader = new PluginLoader(pluginsConfig, logger);
    this.pluginExecutor = new PluginExecutor(this.pluginLoader, logger);

    // Initialize bundler manager
    this.bundlerManager = new BundlerManager(bundlersConfig, logger);
  }

  /**
   * Start the controller.
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      return;
    }

    this.logger.info('Starting build controller...');

    // Initialize components
    await this.pluginLoader.loadAll();
    await this.bundlerManager.initialize();
    await this.scheduler.start();

    // Start heartbeat monitoring
    this.heartbeatInterval = setInterval(
      () => this.checkNodeHealth(),
      this.config.heartbeat?.interval_ms ?? 5000,
    );

    // Subscribe to worker updates
    await this.subscribeToWorkerEvents();

    this.isRunning = true;
    this.logger.info('Build controller started', {
      plugins: this.pluginLoader.listEnabled().length,
      bundlers: this.bundlerManager.listAvailable().length,
    });
  }

  /**
   * Stop the controller.
   */
  async stop(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    this.logger.info('Stopping build controller...');

    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = undefined;
    }

    await this.scheduler.stop();
    this.isRunning = false;

    this.logger.info('Build controller stopped');
  }

  /**
   * Request a build.
   */
  async requestBuild(request: BuildRequest): Promise<string> {
    const buildId = `build_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    this.logger.info(`Build requested: ${buildId}`, {
      task: request.task,
      triggeredBy: request.triggeredBy,
      priority: request.priority,
    });

    // Create build task
    const task: BuildTask = {
      name: request.task,
      project: request.project,
      branch: request.branch,
      commit: request.commit,
      options: request.options,
    };

    // Initialize build status
    const status: BuildStatus = {
      buildId,
      status: 'queued',
      phase: 'queued',
    };
    this.builds.set(buildId, status);

    // Persist to state
    await this.stateManager.set(
      `build:${buildId}:status`,
      JSON.stringify(status),
    );

    // Queue the task
    await this.scheduler.queueTask(task, request.priority ?? TaskPriority.NORMAL);

    // Emit event
    this.emit({ type: 'build_queued', buildId, task: request.task });

    return buildId;
  }

  /**
   * Get build status.
   */
  async getBuildStatus(buildId: string): Promise<BuildStatus | null> {
    // Check in-memory cache first
    let status = this.builds.get(buildId);
    if (status) {
      return status;
    }

    // Check state backend
    const data = await this.stateManager.get(`build:${buildId}:status`);
    if (data) {
      status = JSON.parse(data) as BuildStatus;
      return status;
    }

    return null;
  }

  /**
   * Cancel a build.
   */
  async cancelBuild(buildId: string): Promise<boolean> {
    const status = this.builds.get(buildId);
    if (!status) {
      return false;
    }

    if (status.status === 'queued' || status.status === 'running') {
      // Cancel via scheduler
      await this.scheduler.cancelTask(buildId);
      status.status = 'cancelled';
      status.completedAt = new Date();

      await this.stateManager.set(
        `build:${buildId}:status`,
        JSON.stringify(status),
      );

      this.logger.info(`Build cancelled: ${buildId}`);
      return true;
    }

    return false;
  }

  /**
   * Register a worker node.
   */
  async registerNode(node: WorkerNode): Promise<void> {
    node.status = 'healthy';
    node.lastHeartbeat = new Date();

    this.scheduler.registerNode(node);

    // Persist node info
    await this.stateManager.set(
      `node:${node.id}`,
      JSON.stringify(node),
    );

    this.emit({ type: 'node_registered', nodeId: node.id });
    this.logger.info(`Node registered: ${node.id}`, {
      host: node.host,
      capabilities: node.capabilities,
    });
  }

  /**
   * Unregister a worker node.
   */
  async unregisterNode(nodeId: string): Promise<void> {
    this.scheduler.unregisterNode(nodeId);
    await this.stateManager.delete(`node:${nodeId}`);

    this.emit({ type: 'node_unregistered', nodeId });
    this.logger.info(`Node unregistered: ${nodeId}`);
  }

  /**
   * Handle worker heartbeat.
   */
  async handleHeartbeat(
    nodeId: string,
    metrics: {
      cpu_percent?: number;
      memory_used_gb?: number;
      active_builds?: number;
    },
  ): Promise<void> {
    this.scheduler.updateNodeStatus(nodeId, {
      lastHeartbeat: new Date(),
      currentLoad: {
        cpu_percent: metrics.cpu_percent ?? 0,
        memory_used_gb: metrics.memory_used_gb ?? 0,
        memory_free_gb: 0,
        io_percent: 0,
        queue_depth: 0,
        active_builds: metrics.active_builds ?? 0,
      },
    });
  }

  /**
   * Handle build started notification from worker.
   */
  async handleBuildStarted(
    buildId: string,
    nodeId: string,
  ): Promise<void> {
    const status = this.builds.get(buildId);
    if (status) {
      status.status = 'running';
      status.startedAt = new Date();

      await this.stateManager.set(
        `build:${buildId}:status`,
        JSON.stringify(status),
      );

      this.emit({ type: 'build_started', buildId, node: nodeId });
    }
  }

  /**
   * Handle build completed notification from worker.
   */
  async handleBuildCompleted(
    buildId: string,
    result: BuildResult,
  ): Promise<void> {
    const status = this.builds.get(buildId);
    if (status) {
      status.status = result.success ? 'success' : 'failure';
      status.completedAt = new Date();
      status.result = result;

      if (!result.success && result.errors?.length) {
        status.error = result.errors[0].message;
      }

      await this.stateManager.set(
        `build:${buildId}:status`,
        JSON.stringify(status),
      );

      // Notify scheduler
      await this.scheduler.taskCompleted(buildId, result.success, result);

      if (result.success) {
        this.emit({ type: 'build_completed', buildId, result });
      } else {
        this.emit({
          type: 'build_failed',
          buildId,
          error: status.error ?? 'Build failed',
        });
      }

      // Store in history
      await this.storeBuildHistory(buildId, status);
    }
  }

  /**
   * Handle build progress update.
   */
  async handleBuildProgress(
    buildId: string,
    phase: string,
    progress: number,
  ): Promise<void> {
    const status = this.builds.get(buildId);
    if (status) {
      status.phase = phase;
      status.progress = progress;

      // Publish for real-time subscribers
      await this.stateManager.publish(
        `build:${buildId}:progress`,
        JSON.stringify({ phase, progress }),
      );
    }
  }

  /**
   * Get controller status.
   */
  getStatus(): {
    isRunning: boolean;
    scheduler: ReturnType<Scheduler['getStatus']>;
    plugins: { name: string; enabled: boolean }[];
    bundlers: ReturnType<BundlerManager['getInfo']>;
  } {
    return {
      isRunning: this.isRunning,
      scheduler: this.scheduler.getStatus(),
      plugins: this.pluginLoader.getInfo().map((p) => ({
        name: p.name,
        enabled: p.enabled,
      })),
      bundlers: this.bundlerManager.getInfo(),
    };
  }

  /**
   * Get recent builds.
   */
  async getRecentBuilds(
    limit = 20,
  ): Promise<BuildStatus[]> {
    const keys = await this.stateManager.keys('build:*:status');
    const builds: BuildStatus[] = [];

    for (const key of keys.slice(-limit)) {
      const data = await this.stateManager.get(key);
      if (data) {
        builds.push(JSON.parse(data) as BuildStatus);
      }
    }

    // Sort by newest first
    builds.sort((a, b) => {
      const aTime = a.startedAt?.getTime() ?? 0;
      const bTime = b.startedAt?.getTime() ?? 0;
      return bTime - aTime;
    });

    return builds.slice(0, limit);
  }

  /**
   * Subscribe to controller events.
   */
  onEvent(listener: ControllerEventListener): () => void {
    this.eventListeners.push(listener);
    return () => {
      const index = this.eventListeners.indexOf(listener);
      if (index !== -1) {
        this.eventListeners.splice(index, 1);
      }
    };
  }

  /**
   * Get plugin loader for direct access.
   */
  getPluginLoader(): PluginLoader {
    return this.pluginLoader;
  }

  /**
   * Get bundler manager for direct access.
   */
  getBundlerManager(): BundlerManager {
    return this.bundlerManager;
  }

  /**
   * Create build context for a task.
   */
  async createBuildContext(
    task: BuildTask,
    nodeId: string,
  ): Promise<BuildContext> {
    const metrics = this.createMetricsCollector();

    return {
      buildId: `build_${Date.now()}`,
      task,
      nodeId,
      workDir: task.project ?? process.cwd(),
      env: {},
      logger: this.logger,
      metrics,
      stateManager: this.stateManager,
    };
  }

  /**
   * Emit an event to all listeners.
   */
  private emit(event: ControllerEvent): void {
    for (const listener of this.eventListeners) {
      try {
        listener(event);
      } catch (error) {
        this.logger.error('Event listener error', { error, event });
      }
    }
  }

  /**
   * Subscribe to worker events via pub/sub.
   */
  private async subscribeToWorkerEvents(): Promise<void> {
    // Subscribe to worker updates channel
    this.stateManager.subscribe('worker:updates', async (message) => {
      try {
        const event = JSON.parse(message);
        switch (event.type) {
          case 'heartbeat':
            await this.handleHeartbeat(event.nodeId, event.metrics);
            break;
          case 'build_started':
            await this.handleBuildStarted(event.buildId, event.nodeId);
            break;
          case 'build_completed':
            await this.handleBuildCompleted(event.buildId, event.result);
            break;
          case 'build_progress':
            await this.handleBuildProgress(
              event.buildId,
              event.phase,
              event.progress,
            );
            break;
        }
      } catch (error) {
        this.logger.error('Failed to process worker event', { error, message });
      }
    });
  }

  /**
   * Check node health periodically.
   */
  private checkNodeHealth(): void {
    const status = this.scheduler.getStatus();

    for (const node of status.nodes) {
      if (node.status === 'unhealthy') {
        this.emit({ type: 'node_unhealthy', nodeId: node.id });
      }
    }
  }

  /**
   * Store build in history.
   */
  private async storeBuildHistory(
    buildId: string,
    status: BuildStatus,
  ): Promise<void> {
    const historyKey = `history:${new Date().toISOString().slice(0, 10)}:${buildId}`;
    await this.stateManager.set(
      historyKey,
      JSON.stringify(status),
      86400000 * 30, // 30 days TTL
    );
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
        timings[`histogram_${name}`] = value;
      },
      getAll: () => ({ timings, gauges, counters }),
    };
  }
}
