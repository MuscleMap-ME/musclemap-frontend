/**
 * Build Orchestrator
 *
 * The conductor of the build system - directs workers like
 * an orchestra conductor directs musicians.
 *
 * Responsibilities:
 * - Coordinate build execution across workers
 * - Assign work based on capabilities and load
 * - Manage dependencies between bundles
 * - Handle failures and retries
 * - Verify build results
 */

import { randomUUID } from 'node:crypto';
import { EventEmitter } from 'eventemitter3';
import type { DoubleEntryLedger } from '../ledger/index.js';
import type { ResourceRegistry } from '../resources/index.js';
import type { SessionManager } from '../sessions/index.js';
import {
  type ActorIdentity,
  type BuildRequest,
  type BuildResult,
  type BuildScore,
  type MicroBundle,
  type PartAssignment,
  type Resource,
  type BuildError,
  SYSTEM_ACTOR,
} from '../types.js';

// ============================================================================
// Interfaces
// ============================================================================

export interface OrchestratorConfig {
  max_retries: number;
  retry_delay_ms: number;
  verification_enabled: boolean;
  redundancy_factor: number;
}

export interface BundleResult {
  bundle_id: string;
  success: boolean;
  worker_id: string;
  duration_ms: number;
  artifacts?: string[];
  error?: BuildError;
}

// ============================================================================
// Build Orchestrator Implementation
// ============================================================================

export class BuildOrchestrator extends EventEmitter {
  private ledger: DoubleEntryLedger;
  private resources: ResourceRegistry;
  private sessions: SessionManager;
  private config: OrchestratorConfig;

  private activeBuilds: Map<string, BuildExecution> = new Map();
  private bundleResults: Map<string, Map<string, BundleResult>> = new Map();

  constructor(
    ledger: DoubleEntryLedger,
    resources: ResourceRegistry,
    sessions: SessionManager,
    config: Partial<OrchestratorConfig> = {}
  ) {
    super();
    this.ledger = ledger;
    this.resources = resources;
    this.sessions = sessions;
    this.config = {
      max_retries: config.max_retries ?? 3,
      retry_delay_ms: config.retry_delay_ms ?? 1000,
      verification_enabled: config.verification_enabled ?? true,
      redundancy_factor: config.redundancy_factor ?? 1.0,
    };
  }

  /**
   * Conduct a build - main entry point.
   */
  async conductBuild(request: BuildRequest): Promise<BuildResult> {
    const buildId = randomUUID();
    const startTime = Date.now();

    // Record build start
    await this.ledger.recordChange({
      entity_type: 'build',
      entity_id: buildId,
      previous_state: null,
      new_state: { status: 'started', request },
      actor: request.actor,
      reason: 'Build started',
    });

    this.emit('build:started', { buildId, request });

    try {
      // Phase 1: Preparation
      const bundles = await this.prepare(request);

      // Phase 2: Create the score (build plan)
      const score = await this.createScore(bundles, request);

      // Phase 3: Perform the build
      const results = await this.perform(buildId, score, request.actor);

      // Phase 4: Verify results
      if (this.config.verification_enabled) {
        await this.verify(results);
      }

      // Calculate result
      const completedBundles = results.filter(r => r.success).length;
      const failedBundles = results.filter(r => !r.success).length;

      const buildResult: BuildResult = {
        build_id: buildId,
        request_id: request.request_id,
        status: failedBundles === 0 ? 'success' : 'failed',
        started_at: new Date(startTime),
        completed_at: new Date(),
        duration_ms: Date.now() - startTime,
        bundles_completed: completedBundles,
        bundles_failed: failedBundles,
        artifacts: results.flatMap(r => r.artifacts ?? []),
        errors: results.filter(r => r.error).map(r => r.error!),
      };

      // Record build completion
      await this.ledger.recordChange({
        entity_type: 'build',
        entity_id: buildId,
        previous_state: { status: 'in_progress' },
        new_state: { status: buildResult.status, result: buildResult },
        actor: request.actor,
        reason: `Build ${buildResult.status}`,
      });

      this.emit('build:completed', buildResult);

      return buildResult;
    } catch (error) {
      const buildResult: BuildResult = {
        build_id: buildId,
        request_id: request.request_id,
        status: 'failed',
        started_at: new Date(startTime),
        completed_at: new Date(),
        duration_ms: Date.now() - startTime,
        bundles_completed: 0,
        bundles_failed: 0,
        artifacts: [],
        errors: [{
          bundle_id: 'orchestrator',
          error_type: 'ORCHESTRATION_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error',
          stack: error instanceof Error ? error.stack : undefined,
        }],
      };

      await this.ledger.recordChange({
        entity_type: 'build',
        entity_id: buildId,
        previous_state: { status: 'in_progress' },
        new_state: { status: 'failed', error },
        actor: request.actor,
        reason: `Build failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      });

      this.emit('build:failed', buildResult);

      return buildResult;
    }
  }

  /**
   * Cancel an active build.
   */
  async cancelBuild(buildId: string, actor: ActorIdentity): Promise<boolean> {
    const execution = this.activeBuilds.get(buildId);
    if (!execution) return false;

    execution.cancelled = true;

    await this.ledger.recordChange({
      entity_type: 'build',
      entity_id: buildId,
      previous_state: { status: 'in_progress' },
      new_state: { status: 'cancelled' },
      actor,
      reason: 'Build cancelled by user',
    });

    this.emit('build:cancelled', { buildId });

    return true;
  }

  /**
   * Get status of an active build.
   */
  getBuildStatus(buildId: string): BuildExecution | undefined {
    return this.activeBuilds.get(buildId);
  }

  // ==========================================================================
  // Private Methods - Build Phases
  // ==========================================================================

  /**
   * Phase 1: Prepare - split work into micro-bundles.
   */
  private async prepare(request: BuildRequest): Promise<MicroBundle[]> {
    const bundles: MicroBundle[] = [];

    // For each target, create micro-bundles
    for (const target of request.targets) {
      // Determine package and entry points
      const packageBundles = this.splitPackageIntoBundles(target);
      bundles.push(...packageBundles);
    }

    // Sort by priority (highest first)
    bundles.sort((a, b) => b.priority - a.priority);

    return bundles;
  }

  /**
   * Phase 2: Create the score - assign parts to workers.
   */
  private async createScore(
    bundles: MicroBundle[],
    request: BuildRequest
  ): Promise<BuildScore> {
    const availableWorkers = this.resources.getAvailableWorkers();

    if (availableWorkers.length === 0) {
      throw new Error('No available workers');
    }

    const assignments: PartAssignment[] = [];
    const workerLoads = new Map<string, number>();

    // Initialize worker loads
    for (const worker of availableWorkers) {
      workerLoads.set(worker.id, 0);
    }

    // Build dependency graph
    const dependencyGraph = this.buildDependencyGraph(bundles);

    // Find critical path
    const criticalPath = this.findCriticalPath(bundles, dependencyGraph);

    // Assign bundles to workers
    for (const bundle of bundles) {
      const worker = this.findBestWorker(bundle, availableWorkers, workerLoads);

      const currentLoad = workerLoads.get(worker.id) ?? 0;
      const estimatedStart = new Date(Date.now() + currentLoad);

      assignments.push({
        bundle,
        worker_id: worker.id,
        dependencies: bundle.dependencies,
        estimated_start: estimatedStart,
        estimated_duration_ms: bundle.estimated_time_ms,
      });

      // Update worker load
      workerLoads.set(worker.id, currentLoad + bundle.estimated_time_ms);
    }

    const totalTime = Math.max(...Array.from(workerLoads.values()));

    return {
      id: randomUUID(),
      bundles,
      assignments,
      dependency_graph: dependencyGraph,
      critical_path: criticalPath,
      estimated_total_time_ms: totalTime,
    };
  }

  /**
   * Phase 3: Perform - execute the build.
   */
  private async perform(
    buildId: string,
    score: BuildScore,
    actor: ActorIdentity
  ): Promise<BundleResult[]> {
    const execution: BuildExecution = {
      buildId,
      score,
      startTime: Date.now(),
      completedBundles: new Set(),
      failedBundles: new Set(),
      cancelled: false,
    };

    this.activeBuilds.set(buildId, execution);
    this.bundleResults.set(buildId, new Map());

    try {
      const results: BundleResult[] = [];

      // Group assignments by worker for parallel execution
      const workerAssignments = new Map<string, PartAssignment[]>();
      for (const assignment of score.assignments) {
        const existing = workerAssignments.get(assignment.worker_id) ?? [];
        existing.push(assignment);
        workerAssignments.set(assignment.worker_id, existing);
      }

      // Execute bundles respecting dependencies
      const pendingBundles = new Set(score.bundles.map(b => b.id));
      const completedBundles = new Set<string>();

      while (pendingBundles.size > 0 && !execution.cancelled) {
        // Find bundles that are ready (all dependencies complete)
        const readyBundles = score.bundles.filter(bundle =>
          pendingBundles.has(bundle.id) &&
          bundle.dependencies.every(dep => completedBundles.has(dep))
        );

        if (readyBundles.length === 0) {
          // Deadlock or all bundles waiting
          if (pendingBundles.size > 0) {
            throw new Error('Deadlock detected in bundle dependencies');
          }
          break;
        }

        // Execute ready bundles in parallel
        const bundlePromises = readyBundles.map(async bundle => {
          const assignment = score.assignments.find(a => a.bundle.id === bundle.id);
          if (!assignment) {
            throw new Error(`No assignment for bundle ${bundle.id}`);
          }

          return this.executeBundleWithRetry(
            buildId,
            bundle,
            assignment.worker_id,
            actor
          );
        });

        const bundleResults = await Promise.all(bundlePromises);

        for (const result of bundleResults) {
          pendingBundles.delete(result.bundle_id);

          if (result.success) {
            completedBundles.add(result.bundle_id);
            execution.completedBundles.add(result.bundle_id);
          } else {
            execution.failedBundles.add(result.bundle_id);
          }

          results.push(result);
          this.bundleResults.get(buildId)?.set(result.bundle_id, result);

          this.emit('bundle:completed', result);
        }
      }

      return results;
    } finally {
      this.activeBuilds.delete(buildId);
    }
  }

  /**
   * Phase 4: Verify - check build results.
   */
  private async verify(results: BundleResult[]): Promise<void> {
    // Basic verification - ensure all bundles have artifacts or errors
    for (const result of results) {
      if (result.success && (!result.artifacts || result.artifacts.length === 0)) {
        // Log warning but don't fail
        this.emit('verification:warning', {
          bundle_id: result.bundle_id,
          message: 'Successful build with no artifacts',
        });
      }
    }

    // In a full implementation, we'd do:
    // - Checksum verification
    // - Type checking
    // - Sample execution
  }

  // ==========================================================================
  // Private Methods - Helpers
  // ==========================================================================

  private splitPackageIntoBundles(target: string): MicroBundle[] {
    // Simplified splitting - in real implementation would analyze entry points
    const bundles: MicroBundle[] = [];

    // Create a single bundle for the target
    bundles.push({
      id: `${target}:main`,
      package: target,
      entry: 'index.ts',
      chunk: {
        id: 'main',
        files: ['**/*.ts', '**/*.tsx'],
        is_entry: true,
        is_on_critical_path: true,
      },
      dependencies: [],
      estimated_size_kb: 100,
      estimated_time_ms: 10000,
      priority: this.calculatePriority(target),
    });

    return bundles;
  }

  private calculatePriority(target: string): number {
    // Higher priority for shared packages
    const priorities: Record<string, number> = {
      'shared': 1000,
      'core': 900,
      'client': 800,
      'ui': 700,
      'api': 600,
      'frontend': 500,
    };

    return priorities[target] ?? 100;
  }

  private buildDependencyGraph(bundles: MicroBundle[]): Map<string, string[]> {
    const graph = new Map<string, string[]>();

    for (const bundle of bundles) {
      graph.set(bundle.id, bundle.dependencies);
    }

    return graph;
  }

  private findCriticalPath(
    bundles: MicroBundle[],
    graph: Map<string, string[]>
  ): string[] {
    // Simple critical path - longest chain
    const criticalPath: string[] = [];
    const visited = new Set<string>();

    const findLongestPath = (bundleId: string): string[] => {
      if (visited.has(bundleId)) return [];
      visited.add(bundleId);

      const bundle = bundles.find(b => b.id === bundleId);
      if (!bundle) return [];

      const deps = graph.get(bundleId) ?? [];
      if (deps.length === 0) return [bundleId];

      let longestDepPath: string[] = [];
      for (const dep of deps) {
        const depPath = findLongestPath(dep);
        if (depPath.length > longestDepPath.length) {
          longestDepPath = depPath;
        }
      }

      return [...longestDepPath, bundleId];
    };

    for (const bundle of bundles) {
      visited.clear();
      const path = findLongestPath(bundle.id);
      if (path.length > criticalPath.length) {
        criticalPath.length = 0;
        criticalPath.push(...path);
      }
    }

    return criticalPath;
  }

  private findBestWorker(
    bundle: MicroBundle,
    workers: Resource[],
    loads: Map<string, number>
  ): Resource {
    let bestWorker = workers[0];
    let bestScore = -Infinity;

    for (const worker of workers) {
      const score = this.scoreWorkerForBundle(worker, bundle, loads);
      if (score > bestScore) {
        bestScore = score;
        bestWorker = worker;
      }
    }

    return bestWorker;
  }

  private scoreWorkerForBundle(
    worker: Resource,
    bundle: MicroBundle,
    loads: Map<string, number>
  ): number {
    let score = 0;

    // Load factor (prefer less loaded workers)
    const load = loads.get(worker.id) ?? 0;
    const maxLoad = 100000; // 100 seconds
    score += (1 - load / maxLoad) * 50;

    // Capability match
    if (worker.capabilities?.bundlers?.includes('vite' as never)) {
      score += 20;
    }

    // CPU cores (more = better for parallel work)
    score += (worker.cpu_cores ?? 1) * 5;

    // Memory (more = better for large bundles)
    score += (worker.memory_gb ?? 1) * 2;

    return score;
  }

  private async executeBundleWithRetry(
    buildId: string,
    bundle: MicroBundle,
    workerId: string,
    actor: ActorIdentity
  ): Promise<BundleResult> {
    let lastError: BuildError | undefined;

    for (let attempt = 0; attempt < this.config.max_retries; attempt++) {
      try {
        const result = await this.executeBundle(buildId, bundle, workerId);

        if (result.success) {
          return result;
        }

        lastError = result.error;

        // Wait before retry
        if (attempt < this.config.max_retries - 1) {
          await this.delay(this.config.retry_delay_ms * (attempt + 1));
        }
      } catch (error) {
        lastError = {
          bundle_id: bundle.id,
          error_type: 'EXECUTION_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error',
          stack: error instanceof Error ? error.stack : undefined,
        };
      }
    }

    return {
      bundle_id: bundle.id,
      success: false,
      worker_id: workerId,
      duration_ms: 0,
      error: lastError,
    };
  }

  private async executeBundle(
    buildId: string,
    bundle: MicroBundle,
    workerId: string
  ): Promise<BundleResult> {
    const startTime = Date.now();

    // In real implementation, this would send work to the worker
    // For now, simulate execution

    // Simulate build time (10-50% of estimated)
    const buildTime = bundle.estimated_time_ms * (0.1 + Math.random() * 0.4);
    await this.delay(Math.min(buildTime, 100)); // Cap at 100ms for testing

    // Simulate success (95% success rate)
    const success = Math.random() > 0.05;

    return {
      bundle_id: bundle.id,
      success,
      worker_id: workerId,
      duration_ms: Date.now() - startTime,
      artifacts: success ? [`dist/${bundle.package}/index.js`] : undefined,
      error: success ? undefined : {
        bundle_id: bundle.id,
        error_type: 'BUILD_ERROR',
        message: 'Simulated build failure',
      },
    };
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// ============================================================================
// Types
// ============================================================================

interface BuildExecution {
  buildId: string;
  score: BuildScore;
  startTime: number;
  completedBundles: Set<string>;
  failedBundles: Set<string>;
  cancelled: boolean;
}

// ============================================================================
// Factory Function
// ============================================================================

export function createOrchestrator(
  ledger: DoubleEntryLedger,
  resources: ResourceRegistry,
  sessions: SessionManager,
  config?: Partial<OrchestratorConfig>
): BuildOrchestrator {
  return new BuildOrchestrator(ledger, resources, sessions, config);
}
