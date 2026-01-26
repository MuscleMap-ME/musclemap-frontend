/**
 * Master Build Daemon
 *
 * The central controller of the BuildNet system.
 * Coordinates file watching, build orchestration, resource management,
 * and session handling.
 */

import { randomUUID } from 'node:crypto';
import { EventEmitter } from 'eventemitter3';
import { resolve } from 'node:path';
import type { StateBackend } from '../../state/index.js';
import { DoubleEntryLedger, createLedger } from '../ledger/index.js';
import { ResourceRegistry, createResourceRegistry } from '../resources/index.js';
import { SessionManager, createSessionManager } from '../sessions/index.js';
import { FileWatcherService, createFileWatcher } from './file-watcher.js';
import { BuildOrchestrator, createOrchestrator } from './orchestrator.js';
import {
  type MasterDaemonConfig,
  type ActorIdentity,
  type BuildRequest,
  type BuildResult,
  type DashboardState,
  type ClusterStatus,
  type ResourceSummary,
  type BuildSummary,
  type SessionSummary,
  type EventSummary,
  type MetricsSummary,
  type DaemonEvent,
  type PreparationResult,
  SYSTEM_ACTOR,
  ChangeImpact,
} from '../types.js';

// ============================================================================
// Interfaces
// ============================================================================

export interface MasterDaemonOptions {
  config: MasterDaemonConfig;
  state: StateBackend;
  root_dir: string;
}

// ============================================================================
// Master Daemon Implementation
// ============================================================================

export class MasterDaemon extends EventEmitter {
  private config: MasterDaemonConfig;
  private state: StateBackend;
  private rootDir: string;

  // Core components
  private ledger: DoubleEntryLedger;
  private resources: ResourceRegistry;
  private sessions: SessionManager;
  private fileWatcher: FileWatcherService;
  private orchestrator: BuildOrchestrator;

  // State
  private startTime: Date | null = null;
  private buildQueue: BuildRequest[] = [];
  private recentBuilds: BuildResult[] = [];
  private recentEvents: DaemonEvent[] = [];
  private autoBuildTimer: NodeJS.Timeout | null = null;
  private pendingChanges: Map<string, PreparationResult> = new Map();

  private started: boolean = false;

  constructor(options: MasterDaemonOptions) {
    super();
    this.config = options.config;
    this.state = options.state;
    this.rootDir = options.root_dir;

    // Initialize components
    this.ledger = createLedger(this.state, {
      key_prefix: 'buildnet:ledger:',
      retention_days: this.config.audit.retention_days,
    });

    this.resources = createResourceRegistry(this.state, this.ledger, {
      key_prefix: 'buildnet:resources:',
    });

    this.sessions = createSessionManager(this.state, this.ledger, {
      key_prefix: 'buildnet:sessions:',
    });

    this.fileWatcher = createFileWatcher({
      root_dir: this.rootDir,
      ...this.config.watch,
    });

    this.orchestrator = createOrchestrator(
      this.ledger,
      this.resources,
      this.sessions
    );
  }

  /**
   * Start the master daemon.
   */
  async start(): Promise<void> {
    if (this.started) return;

    this.startTime = new Date();

    // Initialize all components
    await this.ledger.initialize();
    await this.resources.initialize();
    await this.sessions.initialize();

    // Set up event handlers
    this.setupEventHandlers();

    // Start file watcher
    await this.fileWatcher.start();

    // Record daemon start
    await this.ledger.recordChange({
      entity_type: 'daemon',
      entity_id: this.config.daemon_id,
      previous_state: null,
      new_state: {
        status: 'running',
        config: this.config,
        started_at: this.startTime,
      },
      actor: SYSTEM_ACTOR,
      reason: 'Master daemon started',
    });

    this.recordEvent('daemon:started', 'info', 'Master daemon started');

    this.started = true;
    this.emit('started');
  }

  /**
   * Stop the master daemon gracefully.
   */
  async stop(): Promise<void> {
    if (!this.started) return;

    // Cancel any pending auto-build
    if (this.autoBuildTimer) {
      clearTimeout(this.autoBuildTimer);
      this.autoBuildTimer = null;
    }

    // Stop file watcher
    await this.fileWatcher.stop();

    // Stop session manager
    await this.sessions.stop();

    // Stop resource registry
    await this.resources.stop();

    // Record daemon stop
    await this.ledger.recordChange({
      entity_type: 'daemon',
      entity_id: this.config.daemon_id,
      previous_state: { status: 'running' },
      new_state: { status: 'stopped', stopped_at: new Date() },
      actor: SYSTEM_ACTOR,
      reason: 'Master daemon stopped',
    });

    this.recordEvent('daemon:stopped', 'info', 'Master daemon stopped');

    this.started = false;
    this.emit('stopped');
  }

  /**
   * Request a build.
   */
  async requestBuild(
    targets: string[],
    actor: ActorIdentity,
    options: Partial<BuildRequest['options']> = {}
  ): Promise<BuildResult> {
    const request: BuildRequest = {
      request_id: randomUUID(),
      actor,
      targets,
      options: {
        incremental: options.incremental ?? true,
        watch: options.watch ?? false,
        clean: options.clean ?? false,
        verbose: options.verbose ?? false,
        bundler: options.bundler,
      },
      priority: this.calculateBuildPriority(targets),
      created_at: new Date(),
    };

    // Check concurrent build limit
    const activeBuilds = this.buildQueue.filter(b => b.created_at > new Date(Date.now() - 60000));
    if (activeBuilds.length >= this.config.auto_build.max_concurrent_builds) {
      // Queue the build
      this.buildQueue.push(request);
      this.recordEvent('build:queued', 'info', `Build queued: ${targets.join(', ')}`);

      // Wait for slot
      return new Promise((resolve, reject) => {
        const checkQueue = setInterval(async () => {
          const currentActive = this.buildQueue.filter(
            b => b.created_at > new Date(Date.now() - 60000)
          );

          if (currentActive.length < this.config.auto_build.max_concurrent_builds) {
            clearInterval(checkQueue);
            try {
              const result = await this.executeBuild(request);
              resolve(result);
            } catch (error) {
              reject(error);
            }
          }
        }, 1000);
      });
    }

    return this.executeBuild(request);
  }

  /**
   * Get current dashboard state.
   */
  getDashboardState(): DashboardState {
    return {
      cluster: this.getClusterStatus(),
      resources: this.getResourceSummary(),
      builds: this.getBuildSummary(),
      sessions: this.getSessionSummary(),
      events: this.getEventSummary(),
      metrics: this.getMetricsSummary(),
    };
  }

  /**
   * Get ledger instance for direct access.
   */
  getLedger(): DoubleEntryLedger {
    return this.ledger;
  }

  /**
   * Get resource registry for direct access.
   */
  getResources(): ResourceRegistry {
    return this.resources;
  }

  /**
   * Get session manager for direct access.
   */
  getSessions(): SessionManager {
    return this.sessions;
  }

  /**
   * Get orchestrator for direct access.
   */
  getOrchestrator(): BuildOrchestrator {
    return this.orchestrator;
  }

  // ==========================================================================
  // Private Methods
  // ==========================================================================

  private setupEventHandlers(): void {
    // File watcher events
    this.fileWatcher.on('file:changed', (event) => {
      this.recordEvent('file:changed', 'info', `File changed: ${event.path}`);
    });

    this.fileWatcher.on('changes:batched', async (batch) => {
      this.recordEvent(
        'changes:batched',
        'info',
        `${batch.events.length} files changed (impact: ${batch.impact})`
      );

      // Handle auto-build if enabled
      if (this.config.auto_build.enabled && batch.impact !== ChangeImpact.IGNORED) {
        await this.scheduleAutoBuild(batch);
      }
    });

    this.fileWatcher.on('preparation:ready', (preparation) => {
      this.pendingChanges.set(randomUUID(), preparation);
      this.emit('preparation:ready', preparation);
    });

    // Orchestrator events
    this.orchestrator.on('build:started', (data) => {
      this.recordEvent('build:started', 'info', `Build started: ${data.buildId}`);
      this.emit('build:started', data);
    });

    this.orchestrator.on('build:completed', (result) => {
      this.recentBuilds.unshift(result);
      if (this.recentBuilds.length > 100) {
        this.recentBuilds.pop();
      }

      const severity = result.status === 'success' ? 'info' : 'error';
      this.recordEvent('build:completed', severity, `Build ${result.status}: ${result.build_id}`);
      this.emit('build:completed', result);
    });

    this.orchestrator.on('bundle:completed', (result) => {
      this.emit('bundle:completed', result);
    });

    // Resource events
    this.resources.on('resource:added', (event) => {
      this.recordEvent('resource:added', 'info', `Resource added: ${event.resource.name}`);
      this.emit('resource:added', event);
    });

    this.resources.on('resource:removed', (event) => {
      this.recordEvent('resource:removed', 'info', `Resource removed: ${event.resource.name}`);
      this.emit('resource:removed', event);
    });

    this.resources.on('resource:updated', (event) => {
      if (event.type === 'health_changed') {
        const severity = event.resource.status === 'unhealthy' ? 'warn' : 'info';
        this.recordEvent(
          'resource:health_changed',
          severity,
          `Resource ${event.resource.name} is now ${event.resource.status}`
        );
      }
      this.emit('resource:updated', event);
    });

    // Session events
    this.sessions.on('session:created', (event) => {
      this.recordEvent(
        'session:created',
        'info',
        `Session created: ${event.session.actor.name} (${event.session.connection_type})`
      );
      this.emit('session:created', event);
    });

    this.sessions.on('session:ended', (event) => {
      this.recordEvent('session:ended', 'info', `Session ended: ${event.session.actor.name}`);
      this.emit('session:ended', event);
    });
  }

  private async scheduleAutoBuild(batch: {
    events: { path: string; type: string; timestamp: Date }[];
    impact: ChangeImpact;
  }): Promise<void> {
    // Cancel any pending auto-build
    if (this.autoBuildTimer) {
      clearTimeout(this.autoBuildTimer);
    }

    // Schedule new auto-build after delay
    this.autoBuildTimer = setTimeout(async () => {
      this.autoBuildTimer = null;

      // Determine targets from changed files
      const targets = this.determineTargetsFromChanges(batch.events);

      if (targets.length > 0) {
        this.recordEvent('auto_build:triggered', 'info', `Auto-build triggered for: ${targets.join(', ')}`);

        try {
          await this.requestBuild(targets, SYSTEM_ACTOR, { incremental: true });
        } catch (error) {
          this.recordEvent(
            'auto_build:failed',
            'error',
            `Auto-build failed: ${error instanceof Error ? error.message : 'Unknown error'}`
          );
        }
      }
    }, this.config.auto_build.delay_ms);
  }

  private determineTargetsFromChanges(events: { path: string }[]): string[] {
    const targets = new Set<string>();

    for (const event of events) {
      const path = event.path;

      // Determine which package the file belongs to
      if (path.includes('/packages/')) {
        const match = path.match(/\/packages\/([^/]+)\//);
        if (match) {
          targets.add(match[1]);
        }
      } else if (path.includes('/apps/')) {
        const match = path.match(/\/apps\/([^/]+)\//);
        if (match) {
          targets.add(match[1]);
        }
      } else if (path.includes('/src/')) {
        targets.add('frontend');
      }
    }

    // Sort by priority
    const priorityOrder = ['shared', 'core', 'client', 'ui', 'plugin-sdk', 'api', 'frontend'];
    return Array.from(targets).sort((a, b) => {
      const aIndex = priorityOrder.indexOf(a);
      const bIndex = priorityOrder.indexOf(b);
      return (aIndex === -1 ? 999 : aIndex) - (bIndex === -1 ? 999 : bIndex);
    });
  }

  private async executeBuild(request: BuildRequest): Promise<BuildResult> {
    // Remove from queue if present
    const queueIndex = this.buildQueue.findIndex(b => b.request_id === request.request_id);
    if (queueIndex !== -1) {
      this.buildQueue.splice(queueIndex, 1);
    }

    return this.orchestrator.conductBuild(request);
  }

  private calculateBuildPriority(targets: string[]): number {
    let priority = 0;

    for (const target of targets) {
      if (this.config.auto_build.priority_paths.some(p => target.includes(p))) {
        priority += 100;
      }
    }

    return priority;
  }

  private recordEvent(
    type: string,
    severity: 'info' | 'warn' | 'error' | 'critical',
    message: string
  ): void {
    const event: DaemonEvent = {
      event_id: randomUUID(),
      event_type: type,
      timestamp: new Date(),
      actor: SYSTEM_ACTOR,
      message,
      severity,
    };

    this.recentEvents.unshift(event);
    if (this.recentEvents.length > 1000) {
      this.recentEvents.pop();
    }

    this.emit('event', event);
  }

  // ==========================================================================
  // Dashboard Data Methods
  // ==========================================================================

  private getClusterStatus(): ClusterStatus {
    const resourceStats = this.resources.getStats();
    const unhealthyCount = resourceStats.by_status['unhealthy'] ?? 0;
    const offlineCount = resourceStats.by_status['offline'] ?? 0;

    let status: 'healthy' | 'degraded' | 'critical' = 'healthy';
    if (offlineCount > 0 || unhealthyCount > resourceStats.total / 2) {
      status = 'critical';
    } else if (unhealthyCount > 0) {
      status = 'degraded';
    }

    return {
      name: this.config.cluster_name,
      status,
      uptime_seconds: this.startTime
        ? Math.floor((Date.now() - this.startTime.getTime()) / 1000)
        : 0,
      version: '1.0.0',
      master_id: this.config.daemon_id,
    };
  }

  private getResourceSummary(): ResourceSummary {
    const stats = this.resources.getStats();

    return {
      total_workers: stats.by_type['worker'] ?? 0,
      active_workers: stats.by_status['online'] ?? 0,
      idle_workers: 0, // Would need to track active work
      draining_workers: stats.by_status['draining'] ?? 0,
      offline_workers: stats.by_status['offline'] ?? 0,
      total_cpu_cores: stats.total_cpu_cores,
      used_cpu_cores: 0, // Would need to track active work
      total_memory_gb: stats.total_memory_gb,
      used_memory_gb: 0, // Would need to track active work
    };
  }

  private getBuildSummary(): BuildSummary {
    const oneHourAgo = Date.now() - 3600000;
    const recentBuilds = this.recentBuilds.filter(
      b => b.completed_at.getTime() > oneHourAgo
    );

    const completed = recentBuilds.filter(b => b.status === 'success').length;
    const failed = recentBuilds.filter(b => b.status === 'failed').length;
    const avgTime = recentBuilds.length > 0
      ? recentBuilds.reduce((sum, b) => sum + b.duration_ms, 0) / recentBuilds.length
      : 0;

    return {
      queued: this.buildQueue.length,
      in_progress: 0, // Would need to track
      completed_last_hour: completed,
      failed_last_hour: failed,
      avg_build_time_ms: Math.round(avgTime),
    };
  }

  private getSessionSummary(): SessionSummary {
    const sessions = this.sessions.getActiveSessions();

    return {
      users: sessions
        .filter(s => s.actor_type === 'user')
        .map(s => ({
          session_id: s.session_id,
          actor_name: s.actor.name,
          actor_type: s.actor_type,
          connected_since: s.connected_at,
          current_activity: s.current_activity?.activity_type ?? null,
          resources_claimed: s.claimed_resources.length,
        })),
      agents: sessions
        .filter(s => s.actor_type === 'agent')
        .map(s => ({
          session_id: s.session_id,
          actor_name: s.actor.name,
          actor_type: s.actor_type,
          connected_since: s.connected_at,
          current_activity: s.current_activity?.activity_type ?? null,
          resources_claimed: s.claimed_resources.length,
        })),
      services: sessions
        .filter(s => s.actor_type === 'service')
        .map(s => ({
          session_id: s.session_id,
          actor_name: s.actor.name,
          actor_type: s.actor_type,
          connected_since: s.connected_at,
          current_activity: s.current_activity?.activity_type ?? null,
          resources_claimed: s.claimed_resources.length,
        })),
    };
  }

  private getEventSummary(): EventSummary {
    return {
      recent: this.recentEvents.slice(0, 50),
      alerts: this.recentEvents
        .filter(e => e.severity === 'error' || e.severity === 'critical')
        .slice(0, 10)
        .map(e => ({
          alert_id: e.event_id,
          alert_type: e.event_type,
          severity: e.severity as 'warn' | 'error' | 'critical',
          message: e.message,
          created_at: e.timestamp,
          acknowledged: false,
        })),
    };
  }

  private getMetricsSummary(): MetricsSummary {
    const oneMinuteAgo = Date.now() - 60000;
    const recentBuilds = this.recentBuilds.filter(
      b => b.completed_at.getTime() > oneMinuteAgo
    );

    const buildsPerMinute = recentBuilds.length;
    const failedBuilds = recentBuilds.filter(b => b.status === 'failed').length;
    const errorRate = recentBuilds.length > 0 ? failedBuilds / recentBuilds.length : 0;

    return {
      builds_per_minute: buildsPerMinute,
      avg_queue_time_ms: 0, // Would need to track
      cache_hit_rate: 0.85, // Would need to track
      error_rate: errorRate,
    };
  }
}

// ============================================================================
// Factory Function
// ============================================================================

export function createMasterDaemon(options: MasterDaemonOptions): MasterDaemon {
  return new MasterDaemon(options);
}
