/**
 * Daemon Worker Agent
 *
 * A child process that executes build work assigned by the master.
 * Features:
 * - Heartbeat communication with master
 * - Gossip protocol with peer workers
 * - Work claiming and execution
 * - Result verification
 */

import { randomUUID } from 'node:crypto';
import { EventEmitter } from 'eventemitter3';
import type { StateBackend } from '../../state/index.js';
import {
  type WorkerState,
  type WorkerCapabilities,
  type WorkerPerformance,
  type MicroBundle,
  type GossipMessage,
  type GossipMessageType,
  type ResourceCapabilities,
  SYSTEM_ACTOR,
} from '../types.js';

// ============================================================================
// Interfaces
// ============================================================================

export interface DaemonWorkerConfig {
  worker_id: string;
  master_address: string;
  capabilities: ResourceCapabilities;
  max_concurrent_bundles: number;
  heartbeat_interval_ms: number;
  gossip_interval_ms: number;
}

export interface WorkClaim {
  bundle_id: string;
  claimed_at: Date;
  timeout_at: Date;
}

export interface WorkResult {
  bundle_id: string;
  success: boolean;
  duration_ms: number;
  artifacts?: string[];
  error?: {
    message: string;
    stack?: string;
  };
}

// ============================================================================
// Daemon Worker Implementation
// ============================================================================

export class DaemonWorker extends EventEmitter {
  private config: DaemonWorkerConfig;
  private state: StateBackend;

  private workerState: WorkerState;
  private performance: WorkerPerformance;
  private activeClaims: Map<string, WorkClaim> = new Map();
  private peerStates: Map<string, WorkerState> = new Map();

  private heartbeatTimer: NodeJS.Timeout | null = null;
  private gossipTimer: NodeJS.Timeout | null = null;
  private started: boolean = false;

  constructor(state: StateBackend, config: DaemonWorkerConfig) {
    super();
    this.state = state;
    this.config = config;

    this.workerState = {
      worker_id: config.worker_id,
      resource_id: config.worker_id,
      status: 'idle',
      current_task: null,
      load_percentage: 0,
      last_heartbeat: new Date(),
      available_slots: config.max_concurrent_bundles,
      specializations: [],
    };

    this.performance = {
      avg_build_time_ms: 0,
      success_rate: 1.0,
      total_builds: 0,
      specializations: [],
    };
  }

  /**
   * Start the worker.
   */
  async start(): Promise<void> {
    if (this.started) return;

    // Register with master
    await this.registerWithMaster();

    // Start heartbeat
    this.heartbeatTimer = setInterval(() => {
      this.sendHeartbeat().catch(console.error);
    }, this.config.heartbeat_interval_ms);

    // Start gossip
    this.gossipTimer = setInterval(() => {
      this.gossip().catch(console.error);
    }, this.config.gossip_interval_ms);

    this.started = true;
    this.emit('started');
  }

  /**
   * Stop the worker gracefully.
   */
  async stop(): Promise<void> {
    if (!this.started) return;

    // Update status
    this.workerState.status = 'draining';
    await this.sendHeartbeat();

    // Wait for active work to complete
    while (this.activeClaims.size > 0) {
      await this.delay(1000);
    }

    // Stop timers
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }

    if (this.gossipTimer) {
      clearInterval(this.gossipTimer);
      this.gossipTimer = null;
    }

    // Deregister from master
    await this.deregisterFromMaster();

    this.started = false;
    this.emit('stopped');
  }

  /**
   * Claim work from the queue.
   */
  async claimWork(bundleId: string): Promise<boolean> {
    if (this.workerState.available_slots <= 0) {
      return false;
    }

    // Attempt atomic claim
    const claimKey = `work:${bundleId}:claimed`;
    const claimed = await this.state.setIfNotExists(
      claimKey,
      JSON.stringify({
        worker_id: this.config.worker_id,
        claimed_at: new Date().toISOString(),
      }),
      300000 // 5 minute TTL
    );

    if (!claimed) {
      return false;
    }

    // Record claim
    const claim: WorkClaim = {
      bundle_id: bundleId,
      claimed_at: new Date(),
      timeout_at: new Date(Date.now() + 300000),
    };

    this.activeClaims.set(bundleId, claim);
    this.workerState.available_slots--;
    this.updateLoadPercentage();

    // Broadcast claim via gossip
    await this.broadcastGossip({
      message_id: randomUUID(),
      type: 'WORK_CLAIMED',
      sender_id: this.config.worker_id,
      timestamp: new Date(),
      ttl: 3,
      payload: { bundle_id: bundleId },
    });

    return true;
  }

  /**
   * Execute claimed work.
   */
  async executeWork(bundle: MicroBundle): Promise<WorkResult> {
    const startTime = Date.now();

    this.workerState.status = 'busy';
    this.workerState.current_task = bundle.id;

    this.emit('work:started', { bundle_id: bundle.id });

    try {
      // Execute the actual build
      const result = await this.buildBundle(bundle);

      // Record completion
      const duration = Date.now() - startTime;
      this.updatePerformance(true, duration);

      // Release claim
      await this.releaseClaim(bundle.id);

      // Broadcast completion
      await this.broadcastGossip({
        message_id: randomUUID(),
        type: 'WORK_COMPLETED',
        sender_id: this.config.worker_id,
        timestamp: new Date(),
        ttl: 3,
        payload: {
          bundle_id: bundle.id,
          duration_ms: duration,
          success: true,
        },
      });

      const workResult: WorkResult = {
        bundle_id: bundle.id,
        success: true,
        duration_ms: duration,
        artifacts: result.artifacts,
      };

      this.emit('work:completed', workResult);

      return workResult;
    } catch (error) {
      const duration = Date.now() - startTime;
      this.updatePerformance(false, duration);

      // Release claim
      await this.releaseClaim(bundle.id);

      // Broadcast failure
      await this.broadcastGossip({
        message_id: randomUUID(),
        type: 'WORK_FAILED',
        sender_id: this.config.worker_id,
        timestamp: new Date(),
        ttl: 3,
        payload: {
          bundle_id: bundle.id,
          duration_ms: duration,
          error: error instanceof Error ? error.message : 'Unknown error',
        },
      });

      const workResult: WorkResult = {
        bundle_id: bundle.id,
        success: false,
        duration_ms: duration,
        error: {
          message: error instanceof Error ? error.message : 'Unknown error',
          stack: error instanceof Error ? error.stack : undefined,
        },
      };

      this.emit('work:failed', workResult);

      return workResult;
    } finally {
      this.workerState.status = this.activeClaims.size > 0 ? 'busy' : 'idle';
      this.workerState.current_task = null;
    }
  }

  /**
   * Get current worker state.
   */
  getState(): WorkerState {
    return { ...this.workerState };
  }

  /**
   * Get worker capabilities.
   */
  getCapabilities(): WorkerCapabilities {
    return {
      worker_id: this.config.worker_id,
      worker_type: 'general',
      resources: {
        cpu_cores: 4, // Would be detected
        memory_mb: 8192, // Would be detected
        disk_speed: 'ssd',
        network_bandwidth_mbps: 1000,
      },
      capabilities: this.config.capabilities,
      state: this.workerState,
      performance: this.performance,
    };
  }

  /**
   * Get peer worker states (from gossip).
   */
  getPeerStates(): Map<string, WorkerState> {
    return new Map(this.peerStates);
  }

  // ==========================================================================
  // Private Methods
  // ==========================================================================

  private async registerWithMaster(): Promise<void> {
    const key = `workers:${this.config.worker_id}`;
    await this.state.set(
      key,
      JSON.stringify({
        ...this.workerState,
        capabilities: this.config.capabilities,
        registered_at: new Date().toISOString(),
      }),
      3600000 // 1 hour TTL
    );
  }

  private async deregisterFromMaster(): Promise<void> {
    const key = `workers:${this.config.worker_id}`;
    await this.state.delete(key);
  }

  private async sendHeartbeat(): Promise<void> {
    this.workerState.last_heartbeat = new Date();

    const key = `workers:${this.config.worker_id}`;
    await this.state.set(
      key,
      JSON.stringify({
        ...this.workerState,
        capabilities: this.config.capabilities,
      }),
      3600000 // 1 hour TTL
    );

    this.emit('heartbeat', this.workerState);
  }

  private async gossip(): Promise<void> {
    // Broadcast our state to peers
    await this.broadcastGossip({
      message_id: randomUUID(),
      type: 'WORKER_STATE',
      sender_id: this.config.worker_id,
      timestamp: new Date(),
      ttl: 2,
      payload: this.workerState,
    });

    // Read peer states
    const peerKeys = await this.state.keys('workers:*');
    for (const key of peerKeys) {
      const peerId = key.replace('workers:', '');
      if (peerId === this.config.worker_id) continue;

      const peerData = await this.state.get(key);
      if (peerData) {
        try {
          const peerState = JSON.parse(peerData) as WorkerState;
          this.peerStates.set(peerId, peerState);
        } catch {
          // Ignore invalid data
        }
      }
    }

    // Clean up stale peers
    const now = Date.now();
    for (const [peerId, peerState] of this.peerStates) {
      const lastSeen = new Date(peerState.last_heartbeat).getTime();
      if (now - lastSeen > 60000) {
        this.peerStates.delete(peerId);
      }
    }
  }

  private async broadcastGossip(message: GossipMessage): Promise<void> {
    // Store in gossip channel
    const channel = `gossip:${message.type}`;
    await this.state.publish(channel, JSON.stringify(message));
  }

  private async releaseClaim(bundleId: string): Promise<void> {
    this.activeClaims.delete(bundleId);
    this.workerState.available_slots++;
    this.updateLoadPercentage();

    // Delete claim key
    await this.state.delete(`work:${bundleId}:claimed`);
  }

  private updateLoadPercentage(): void {
    const usedSlots = this.config.max_concurrent_bundles - this.workerState.available_slots;
    this.workerState.load_percentage = Math.round(
      (usedSlots / this.config.max_concurrent_bundles) * 100
    );
  }

  private updatePerformance(success: boolean, duration: number): void {
    this.performance.total_builds++;

    // Update success rate (exponential moving average)
    const alpha = 0.1;
    this.performance.success_rate =
      alpha * (success ? 1 : 0) + (1 - alpha) * this.performance.success_rate;

    // Update average build time
    this.performance.avg_build_time_ms =
      alpha * duration + (1 - alpha) * this.performance.avg_build_time_ms;
  }

  private async buildBundle(bundle: MicroBundle): Promise<{ artifacts: string[] }> {
    // In real implementation, this would:
    // 1. Load the bundle files
    // 2. Run the appropriate bundler
    // 3. Write output files
    // 4. Return artifact paths

    // For now, simulate build
    const buildTime = bundle.estimated_time_ms * (0.1 + Math.random() * 0.4);
    await this.delay(Math.min(buildTime, 100));

    // Simulate occasional failure (5%)
    if (Math.random() < 0.05) {
      throw new Error('Simulated build failure');
    }

    return {
      artifacts: [`dist/${bundle.package}/${bundle.entry.replace('.ts', '.js')}`],
    };
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// ============================================================================
// Factory Function
// ============================================================================

export function createDaemonWorker(
  state: StateBackend,
  config: DaemonWorkerConfig
): DaemonWorker {
  return new DaemonWorker(state, config);
}
