/**
 * Hot-Swappable Resource Registry
 *
 * Manages resources (workers, storage, cache) with support for:
 * - Dynamic addition/removal at runtime
 * - Graceful draining before removal
 * - Health monitoring
 * - Real-time updates
 */

import { randomUUID } from 'node:crypto';
import { EventEmitter } from 'eventemitter3';
import type { StateBackend } from '../../state/index.js';
import type { DoubleEntryLedger } from '../ledger/index.js';
import {
  type ActorIdentity,
  type Resource,
  type ResourceDefinition,
  type ResourceStatus,
  type HealthCheckResult,
  type ResourceCapabilities,
  SYSTEM_ACTOR,
} from '../types.js';

// ============================================================================
// Interfaces
// ============================================================================

export interface ResourceRegistryConfig {
  health_check_interval_ms: number;
  health_check_timeout_ms: number;
  drain_timeout_ms: number;
  unhealthy_threshold: number;
  key_prefix: string;
}

export interface ResourceEvent {
  type: 'added' | 'removed' | 'updated' | 'health_changed' | 'status_changed';
  resource: Resource;
  changes?: Partial<ResourceDefinition>;
  previous_status?: ResourceStatus;
}

// ============================================================================
// Resource Registry Implementation
// ============================================================================

export class ResourceRegistry extends EventEmitter {
  private state: StateBackend;
  private ledger: DoubleEntryLedger;
  private config: ResourceRegistryConfig;
  private resources: Map<string, Resource> = new Map();
  private healthCheckTimers: Map<string, NodeJS.Timeout> = new Map();
  private drainPromises: Map<string, Promise<void>> = new Map();
  private initialized: boolean = false;

  constructor(
    state: StateBackend,
    ledger: DoubleEntryLedger,
    config: Partial<ResourceRegistryConfig> = {}
  ) {
    super();
    this.state = state;
    this.ledger = ledger;
    this.config = {
      health_check_interval_ms: config.health_check_interval_ms ?? 30000,
      health_check_timeout_ms: config.health_check_timeout_ms ?? 5000,
      drain_timeout_ms: config.drain_timeout_ms ?? 300000, // 5 minutes
      unhealthy_threshold: config.unhealthy_threshold ?? 3,
      key_prefix: config.key_prefix ?? 'resources:',
    };
  }

  /**
   * Initialize the registry, loading existing resources.
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    // Load existing resources from state
    const keys = await this.state.keys(this.key('*'));

    for (const key of keys) {
      if (key.includes(':health:') || key.includes(':status:')) continue;

      const resourceStr = await this.state.get(key);
      if (resourceStr) {
        const resource = JSON.parse(resourceStr) as Resource;
        resource.added_at = new Date(resource.added_at);
        if (resource.updated_at) {
          resource.updated_at = new Date(resource.updated_at);
        }
        this.resources.set(resource.id, resource);

        // Start health monitoring
        this.startHealthMonitoring(resource);
      }
    }

    this.initialized = true;

    await this.ledger.recordChange({
      entity_type: 'resource_registry',
      entity_id: 'system',
      previous_state: null,
      new_state: { initialized: true, resource_count: this.resources.size },
      actor: SYSTEM_ACTOR,
      reason: 'Resource registry initialized',
    });
  }

  /**
   * Add a resource dynamically.
   */
  async addResource(
    definition: ResourceDefinition,
    actor: ActorIdentity
  ): Promise<Resource> {
    // Validate resource
    this.validateResourceDefinition(definition);

    // Check for duplicate name
    for (const existing of this.resources.values()) {
      if (existing.name === definition.name) {
        throw new Error(`Resource with name "${definition.name}" already exists`);
      }
    }

    // Initial health check
    const health = await this.checkResourceHealth(definition);
    if (!health.healthy) {
      throw new Error(`Resource unhealthy: ${health.reason}`);
    }

    // Create resource instance
    const resource: Resource = {
      id: randomUUID(),
      ...definition,
      status: 'online',
      added_at: new Date(),
      added_by: actor,
      health_history: [health],
    };

    // Record in ledger
    await this.ledger.recordChange({
      entity_type: 'resource',
      entity_id: resource.id,
      previous_state: null,
      new_state: resource,
      actor,
      reason: `Added resource: ${definition.name}`,
    });

    // Persist to state
    await this.state.set(this.key(resource.id), JSON.stringify(resource));

    // Add to registry
    this.resources.set(resource.id, resource);

    // Start health monitoring
    this.startHealthMonitoring(resource);

    // Emit event
    this.emit('resource:added', { type: 'added', resource });

    return resource;
  }

  /**
   * Remove a resource gracefully with draining.
   */
  async removeResource(
    resourceId: string,
    actor: ActorIdentity,
    force: boolean = false
  ): Promise<void> {
    const resource = this.resources.get(resourceId);
    if (!resource) {
      throw new Error(`Resource not found: ${resourceId}`);
    }

    const previousStatus = resource.status;

    if (!force) {
      // Mark as draining
      resource.status = 'draining';

      await this.ledger.recordChange({
        entity_type: 'resource',
        entity_id: resourceId,
        previous_state: { ...resource, status: previousStatus },
        new_state: { ...resource, status: 'draining' },
        actor,
        reason: 'Draining resource for removal',
      });

      await this.state.set(this.key(resourceId), JSON.stringify(resource));

      this.emit('resource:updated', {
        type: 'status_changed',
        resource,
        previous_status: previousStatus,
      });

      // Wait for drain to complete
      await this.waitForDrain(resourceId);
    }

    // Stop health monitoring
    this.stopHealthMonitoring(resourceId);

    // Record removal in ledger
    await this.ledger.recordChange({
      entity_type: 'resource',
      entity_id: resourceId,
      previous_state: resource,
      new_state: null,
      actor,
      reason: force ? `Force removed resource: ${resource.name}` : `Removed resource: ${resource.name}`,
    });

    // Remove from state
    await this.state.delete(this.key(resourceId));

    // Remove from registry
    this.resources.delete(resourceId);

    // Emit event
    this.emit('resource:removed', { type: 'removed', resource });
  }

  /**
   * Update resource configuration dynamically.
   */
  async updateResource(
    resourceId: string,
    updates: Partial<ResourceDefinition>,
    actor: ActorIdentity
  ): Promise<Resource> {
    const resource = this.resources.get(resourceId);
    if (!resource) {
      throw new Error(`Resource not found: ${resourceId}`);
    }

    const previousState = { ...resource };
    const newState: Resource = {
      ...resource,
      ...updates,
      updated_at: new Date(),
    };

    // Record in ledger
    await this.ledger.recordChange({
      entity_type: 'resource',
      entity_id: resourceId,
      previous_state: previousState,
      new_state: newState,
      actor,
      reason: `Updated resource: ${JSON.stringify(updates)}`,
    });

    // Persist to state
    await this.state.set(this.key(resourceId), JSON.stringify(newState));

    // Update in registry
    this.resources.set(resourceId, newState);

    // Emit event
    this.emit('resource:updated', {
      type: 'updated',
      resource: newState,
      changes: updates,
    });

    return newState;
  }

  /**
   * Get a resource by ID.
   */
  getResource(resourceId: string): Resource | undefined {
    return this.resources.get(resourceId);
  }

  /**
   * Get a resource by name.
   */
  getResourceByName(name: string): Resource | undefined {
    for (const resource of this.resources.values()) {
      if (resource.name === name) {
        return resource;
      }
    }
    return undefined;
  }

  /**
   * Get all resources.
   */
  getAllResources(): Resource[] {
    return Array.from(this.resources.values());
  }

  /**
   * Get resources by status.
   */
  getResourcesByStatus(status: ResourceStatus): Resource[] {
    return this.getAllResources().filter(r => r.status === status);
  }

  /**
   * Get resources by type.
   */
  getResourcesByType(type: 'worker' | 'storage' | 'cache'): Resource[] {
    return this.getAllResources().filter(r => r.type === type);
  }

  /**
   * Get available workers (online and not draining).
   */
  getAvailableWorkers(): Resource[] {
    return this.getAllResources().filter(
      r => r.type === 'worker' && r.status === 'online'
    );
  }

  /**
   * Get resources by label.
   */
  getResourcesByLabel(key: string, value: string): Resource[] {
    return this.getAllResources().filter(
      r => r.labels?.[key] === value
    );
  }

  /**
   * Get resources with specific capability.
   */
  getResourcesWithCapability(
    capability: keyof ResourceCapabilities,
    value?: unknown
  ): Resource[] {
    return this.getAllResources().filter(r => {
      if (!r.capabilities) return false;
      const cap = r.capabilities[capability];
      if (value === undefined) return cap !== undefined;
      if (Array.isArray(cap)) {
        // Type-safe includes check for arrays
        return (cap as unknown[]).includes(value);
      }
      return cap === value;
    });
  }

  /**
   * Drain a resource (stop accepting new work).
   */
  async drainResource(resourceId: string, actor: ActorIdentity): Promise<void> {
    const resource = this.resources.get(resourceId);
    if (!resource) {
      throw new Error(`Resource not found: ${resourceId}`);
    }

    if (resource.status === 'draining') {
      return; // Already draining
    }

    const previousStatus = resource.status;
    resource.status = 'draining';

    await this.ledger.recordChange({
      entity_type: 'resource',
      entity_id: resourceId,
      previous_state: { ...resource, status: previousStatus },
      new_state: resource,
      actor,
      reason: 'Resource drained',
    });

    await this.state.set(this.key(resourceId), JSON.stringify(resource));

    this.emit('resource:updated', {
      type: 'status_changed',
      resource,
      previous_status: previousStatus,
    });
  }

  /**
   * Resume a drained resource.
   */
  async resumeResource(resourceId: string, actor: ActorIdentity): Promise<void> {
    const resource = this.resources.get(resourceId);
    if (!resource) {
      throw new Error(`Resource not found: ${resourceId}`);
    }

    if (resource.status !== 'draining') {
      throw new Error(`Resource is not draining: ${resource.status}`);
    }

    const previousStatus = resource.status;
    resource.status = 'online';

    await this.ledger.recordChange({
      entity_type: 'resource',
      entity_id: resourceId,
      previous_state: { ...resource, status: previousStatus },
      new_state: resource,
      actor,
      reason: 'Resource resumed',
    });

    await this.state.set(this.key(resourceId), JSON.stringify(resource));

    this.emit('resource:updated', {
      type: 'status_changed',
      resource,
      previous_status: previousStatus,
    });
  }

  /**
   * Get resource statistics.
   */
  getStats(): {
    total: number;
    by_type: Record<string, number>;
    by_status: Record<string, number>;
    total_cpu_cores: number;
    total_memory_gb: number;
  } {
    const by_type: Record<string, number> = {};
    const by_status: Record<string, number> = {};
    let total_cpu_cores = 0;
    let total_memory_gb = 0;

    for (const resource of this.resources.values()) {
      by_type[resource.type] = (by_type[resource.type] ?? 0) + 1;
      by_status[resource.status] = (by_status[resource.status] ?? 0) + 1;
      total_cpu_cores += resource.cpu_cores ?? 0;
      total_memory_gb += resource.memory_gb ?? 0;
    }

    return {
      total: this.resources.size,
      by_type,
      by_status,
      total_cpu_cores,
      total_memory_gb,
    };
  }

  /**
   * Stop the registry and cleanup.
   */
  async stop(): Promise<void> {
    // Stop all health check timers
    for (const [resourceId] of this.healthCheckTimers) {
      this.stopHealthMonitoring(resourceId);
    }
  }

  // ==========================================================================
  // Private Methods
  // ==========================================================================

  private key(suffix: string): string {
    return `${this.config.key_prefix}${suffix}`;
  }

  private validateResourceDefinition(definition: ResourceDefinition): void {
    if (!definition.name || definition.name.trim() === '') {
      throw new Error('Resource name is required');
    }

    if (!definition.type || !['worker', 'storage', 'cache'].includes(definition.type)) {
      throw new Error('Invalid resource type');
    }

    if (!definition.address || definition.address.trim() === '') {
      throw new Error('Resource address is required');
    }
  }

  private async checkResourceHealth(
    definition: ResourceDefinition
  ): Promise<HealthCheckResult> {
    const startTime = Date.now();

    try {
      // For now, just check if the address looks valid
      // In a real implementation, this would ping the resource
      const [host, port] = definition.address.split(':');

      if (!host || !port) {
        return {
          timestamp: new Date(),
          healthy: false,
          latency_ms: Date.now() - startTime,
          reason: 'Invalid address format',
        };
      }

      // Simulate health check (would be actual network call in production)
      // For localhost, assume healthy
      if (host === 'localhost' || host === '127.0.0.1') {
        return {
          timestamp: new Date(),
          healthy: true,
          latency_ms: Date.now() - startTime,
        };
      }

      // For remote hosts, we'd do actual health check
      // For now, assume healthy if address is valid
      return {
        timestamp: new Date(),
        healthy: true,
        latency_ms: Date.now() - startTime,
      };
    } catch (error) {
      return {
        timestamp: new Date(),
        healthy: false,
        latency_ms: Date.now() - startTime,
        reason: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  private startHealthMonitoring(resource: Resource): void {
    // Clear any existing timer
    this.stopHealthMonitoring(resource.id);

    const timer = setInterval(async () => {
      try {
        const health = await this.checkResourceHealth(resource);
        await this.recordHealthCheck(resource.id, health);
      } catch (error) {
        // Log error but don't crash
        console.error(`Health check failed for ${resource.id}:`, error);
      }
    }, this.config.health_check_interval_ms);

    this.healthCheckTimers.set(resource.id, timer);
  }

  private stopHealthMonitoring(resourceId: string): void {
    const timer = this.healthCheckTimers.get(resourceId);
    if (timer) {
      clearInterval(timer);
      this.healthCheckTimers.delete(resourceId);
    }
  }

  private async recordHealthCheck(
    resourceId: string,
    health: HealthCheckResult
  ): Promise<void> {
    const resource = this.resources.get(resourceId);
    if (!resource) return;

    // Add to health history (keep last 100)
    resource.health_history.push(health);
    if (resource.health_history.length > 100) {
      resource.health_history.shift();
    }

    // Check if status should change
    const recentHealth = resource.health_history.slice(-this.config.unhealthy_threshold);
    const allUnhealthy = recentHealth.every(h => !h.healthy);
    const allHealthy = recentHealth.every(h => h.healthy);

    const previousStatus = resource.status;

    if (allUnhealthy && resource.status === 'online') {
      resource.status = 'unhealthy';
    } else if (allHealthy && resource.status === 'unhealthy') {
      resource.status = 'online';
    }

    if (previousStatus !== resource.status) {
      await this.ledger.recordChange({
        entity_type: 'resource',
        entity_id: resourceId,
        previous_state: { ...resource, status: previousStatus },
        new_state: resource,
        actor: SYSTEM_ACTOR,
        reason: `Health status changed: ${previousStatus} -> ${resource.status}`,
      });

      this.emit('resource:updated', {
        type: 'health_changed',
        resource,
        previous_status: previousStatus,
      });
    }

    // Persist updated resource
    await this.state.set(this.key(resourceId), JSON.stringify(resource));
  }

  private async waitForDrain(resourceId: string): Promise<void> {
    // Check if already waiting
    let drainPromise = this.drainPromises.get(resourceId);
    if (drainPromise) {
      return drainPromise;
    }

    // Create drain promise with timeout
    drainPromise = new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error(`Drain timeout for resource ${resourceId}`));
      }, this.config.drain_timeout_ms);

      // In a real implementation, we'd poll for active work
      // For now, just wait a short time to simulate drain
      setTimeout(() => {
        clearTimeout(timeout);
        resolve();
      }, 1000);
    });

    this.drainPromises.set(resourceId, drainPromise);

    try {
      await drainPromise;
    } finally {
      this.drainPromises.delete(resourceId);
    }
  }
}

// ============================================================================
// Factory Function
// ============================================================================

export function createResourceRegistry(
  state: StateBackend,
  ledger: DoubleEntryLedger,
  config?: Partial<ResourceRegistryConfig>
): ResourceRegistry {
  return new ResourceRegistry(state, ledger, config);
}
