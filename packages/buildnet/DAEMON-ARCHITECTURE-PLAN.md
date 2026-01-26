# BuildNet Daemon Architecture Plan

## Executive Summary

This document describes the architecture for an advanced distributed build daemon system featuring:
- **Master Daemon** with intelligent file watching and preemptive build preparation
- **Asymmetric Child Processes** that work in parallel without races
- **Double-Entry Ledger** for atomic, auditable tracking of every operation
- **Hot-Swappable Resources** allowing dynamic addition/removal of servers
- **Multi-User Session Management** with real-time activity monitoring
- **Orchestral Coordination** where the master directs child workers like a conductor

---

## 1. System Overview

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                           MASTER BUILD DAEMON                                    │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐ │
│  │ File Watcher│  │  Scheduler  │  │ Orchestrator│  │    Resource Manager     │ │
│  │  (chokidar) │  │  (cron-like)│  │  (director) │  │  (hot-swap registry)   │ │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘  └───────────┬─────────────┘ │
│         │                │                │                      │               │
│         └────────────────┴────────────────┴──────────────────────┘               │
│                                    │                                             │
│                          ┌─────────▼─────────┐                                   │
│                          │   Work Distributor │                                   │
│                          │  (chunk assigner)  │                                   │
│                          └─────────┬─────────┘                                   │
└────────────────────────────────────┼─────────────────────────────────────────────┘
                                     │
        ┌────────────────────────────┼────────────────────────────┐
        │                            │                            │
        ▼                            ▼                            ▼
┌───────────────┐          ┌───────────────┐          ┌───────────────┐
│ CHILD WORKER 1│◄────────►│ CHILD WORKER 2│◄────────►│ CHILD WORKER N│
│  (async)      │  gossip  │  (async)      │  gossip  │  (async)      │
│               │  proto   │               │  proto   │               │
│ ┌───────────┐ │          │ ┌───────────┐ │          │ ┌───────────┐ │
│ │Bundle Slot│ │          │ │Bundle Slot│ │          │ │Bundle Slot│ │
│ │  (micro)  │ │          │ │  (micro)  │ │          │ │  (micro)  │ │
│ └───────────┘ │          │ └───────────┘ │          │ └───────────┘ │
└───────┬───────┘          └───────┬───────┘          └───────┬───────┘
        │                          │                          │
        └──────────────────────────┼──────────────────────────┘
                                   │
                          ┌────────▼────────┐
                          │  DOUBLE-ENTRY   │
                          │     LEDGER      │
                          │ (DragonflyDB +  │
                          │  File Backup)   │
                          └─────────────────┘
```

---

## 2. Master Build Daemon

### 2.1 Core Responsibilities

The Master Daemon is the **orchestral conductor** of the build system:

```typescript
interface MasterDaemonConfig {
  // Identity
  daemon_id: string;
  cluster_name: string;

  // File Watching
  watch: {
    directories: string[];              // Directories to monitor
    include_patterns: string[];         // e.g., ["**/*.ts", "**/*.tsx"]
    exclude_patterns: string[];         // e.g., ["**/node_modules/**"]
    scan_interval_ms: number;           // Time between directory scans (default: 1000)
    debounce_ms: number;                // Debounce rapid changes (default: 300)
    preemptive_prepare: boolean;        // Start preparing before build requested
  };

  // Auto-Build Settings
  auto_build: {
    enabled: boolean;                   // Auto-build on file changes
    delay_ms: number;                   // Wait time after last change (default: 2000)
    max_concurrent_builds: number;      // Limit simultaneous builds
    priority_paths: string[];           // Build these first (e.g., ["packages/shared"])
  };

  // Child Process Management
  workers: {
    min_workers: number;                // Minimum worker pool size
    max_workers: number;                // Maximum worker pool size
    worker_timeout_ms: number;          // Kill unresponsive workers
    heartbeat_interval_ms: number;      // Worker health check frequency
    redundancy_factor: number;          // 1.5 = 50% redundant capacity
  };

  // Resource Allocation
  resources: {
    cpu_allocation: 'fair' | 'priority' | 'adaptive';
    memory_limit_mb: number;
    disk_cache_limit_mb: number;
  };

  // Networking
  network: {
    bind_address: string;               // e.g., "0.0.0.0:7890"
    advertise_address: string;          // External address for workers
    tls: TLSConfig | null;
  };

  // Audit & Logging
  audit: {
    ledger_backend: 'dragonfly' | 'file' | 'hybrid';
    log_level: 'debug' | 'info' | 'warn' | 'error';
    retention_days: number;
    real_time_streaming: boolean;
  };
}
```

### 2.2 File Watcher with Preemptive Preparation

```typescript
/**
 * Intelligent file watcher that:
 * 1. Monitors directories at configurable intervals
 * 2. Detects changes and categorizes them by impact
 * 3. Preemptively prepares build resources before build is requested
 * 4. Debounces rapid changes to avoid thrashing
 */
class FileWatcherService {
  private watcher: FSWatcher;
  private changeBuffer: Map<string, ChangeEvent>;
  private preparationCache: Map<string, PreparationResult>;

  // Change categories for intelligent preparation
  enum ChangeImpact {
    FULL_REBUILD,      // tsconfig.json, package.json changes
    PACKAGE_REBUILD,   // Changes within a package
    INCREMENTAL,       // Single file change
    ASSET_ONLY,        // Static assets, no TS compilation
    IGNORED            // Test files, docs (configurable)
  }

  async onFileChange(event: ChangeEvent): Promise<void> {
    // 1. Categorize the change
    const impact = this.categorizeChange(event);

    // 2. Add to debounce buffer
    this.changeBuffer.set(event.path, event);

    // 3. If preemptive_prepare enabled, start preparation
    if (this.config.watch.preemptive_prepare) {
      await this.preemptivePrepare(impact, event);
    }
  }

  private async preemptivePrepare(impact: ChangeImpact, event: ChangeEvent): Promise<void> {
    // Pre-compute dependency graph
    // Pre-allocate workers
    // Pre-load affected modules into memory
    // Warm up bundler caches

    const preparation: PreparationResult = {
      affectedPackages: await this.computeAffectedPackages(event.path),
      suggestedWorkers: this.calculateOptimalWorkers(impact),
      cacheWarmups: this.identifyCacheWarmups(event.path),
      estimatedBuildTime: this.estimateBuildTime(impact),
    };

    this.preparationCache.set(event.path, preparation);

    // Notify orchestrator of impending build
    this.orchestrator.prepareForBuild(preparation);
  }
}
```

### 2.3 Scan Interval Configuration

```yaml
# build-daemon.yaml
master:
  watch:
    # Configurable scan interval - how often to check for changes
    scan_interval_ms: 1000  # Default: 1 second

    # For high-frequency development:
    # scan_interval_ms: 100  # 100ms for rapid feedback

    # For CI/production with less frequent changes:
    # scan_interval_ms: 5000  # 5 seconds to reduce CPU usage

    # Debounce prevents building during rapid saves
    debounce_ms: 300

    # Auto-build delay after changes settle
    auto_build:
      enabled: true
      delay_ms: 2000  # Wait 2s after last change before building
```

---

## 3. Asymmetric Child Workers

### 3.1 Worker Architecture

Child workers are **asymmetric** - they have different capabilities and can be assigned different types of work:

```typescript
interface WorkerCapabilities {
  worker_id: string;
  worker_type: 'general' | 'typescript' | 'bundler' | 'assets' | 'tests';

  // Hardware resources
  resources: {
    cpu_cores: number;
    memory_mb: number;
    disk_speed: 'ssd' | 'hdd' | 'nvme';
    network_bandwidth_mbps: number;
  };

  // Software capabilities
  capabilities: {
    bundlers: ('vite' | 'rspack' | 'esbuild')[];
    node_version: string;
    native_modules: boolean;
    docker_available: boolean;
  };

  // Current state
  state: {
    status: 'idle' | 'busy' | 'draining' | 'offline';
    current_task: string | null;
    load_percentage: number;
    last_heartbeat: Date;
  };

  // Performance history
  performance: {
    avg_build_time_ms: number;
    success_rate: number;
    specializations: string[];  // What this worker is best at
  };
}
```

### 3.2 Race-Free Coordination via Distributed Locks

```typescript
/**
 * Prevents race conditions using distributed locks and work claiming.
 * Workers claim work atomically - no two workers can claim the same bundle.
 */
class WorkCoordinator {
  // Atomic work claiming with DragonflyDB
  async claimWork(workerId: string, bundleId: string): Promise<ClaimResult> {
    // Use Redis SETNX (set if not exists) for atomic claiming
    const claimed = await this.state.atomicClaim(
      `work:${bundleId}:claimed`,
      workerId,
      { ttl: 300000 } // 5 minute claim timeout
    );

    if (!claimed) {
      return { success: false, claimedBy: await this.state.get(`work:${bundleId}:claimed`) };
    }

    // Record in ledger
    await this.ledger.record({
      type: 'WORK_CLAIMED',
      worker_id: workerId,
      bundle_id: bundleId,
      timestamp: new Date(),
    });

    return { success: true, claimedBy: workerId };
  }

  // Gossip protocol for worker communication
  async broadcastState(worker: WorkerState): Promise<void> {
    // Workers share their state with neighbors
    // Enables load balancing without central bottleneck
    await this.gossip.broadcast({
      type: 'WORKER_STATE',
      worker_id: worker.id,
      load: worker.load,
      available_slots: worker.availableSlots,
      specializations: worker.specializations,
    });
  }
}
```

### 3.3 Micro-Bundle Splitting

Bundles are split as small as possible for maximum parallelization:

```typescript
/**
 * Bundle Splitter - divides work into atomic units
 *
 * Goals:
 * 1. Smallest possible units for maximum parallelism
 * 2. Respect dependency ordering
 * 3. Balance work across workers
 */
class BundleSplitter {
  async splitIntoMicroBundles(buildRequest: BuildRequest): Promise<MicroBundle[]> {
    const dependencyGraph = await this.analyzeDependencies(buildRequest);
    const bundles: MicroBundle[] = [];

    // Level 1: Package-level splitting
    for (const pkg of dependencyGraph.packages) {
      // Level 2: Entry point splitting (multiple entry points per package)
      for (const entry of pkg.entryPoints) {
        // Level 3: Chunk splitting (code-split boundaries)
        const chunks = await this.identifyChunks(entry);

        for (const chunk of chunks) {
          bundles.push({
            id: `${pkg.name}:${entry.name}:${chunk.id}`,
            package: pkg.name,
            entry: entry.path,
            chunk: chunk,
            dependencies: chunk.dependencies,
            estimated_size_kb: chunk.estimatedSize,
            estimated_time_ms: chunk.estimatedBuildTime,
            priority: this.calculatePriority(pkg, entry, chunk),
          });
        }
      }
    }

    // Sort by dependency order (topological sort)
    return this.topologicalSort(bundles);
  }

  private calculatePriority(pkg: Package, entry: Entry, chunk: Chunk): number {
    // Priority factors:
    // 1. Critical path (blocking other work)
    // 2. User-defined priority paths
    // 3. Change frequency (hot paths build first)
    // 4. Size (smaller = faster feedback)

    let priority = 0;

    if (this.config.auto_build.priority_paths.includes(pkg.path)) {
      priority += 1000;
    }

    if (chunk.isOnCriticalPath) {
      priority += 500;
    }

    // Smaller chunks get slight priority for faster feedback
    priority += Math.max(0, 100 - chunk.estimatedSize);

    return priority;
  }
}
```

---

## 4. Double-Entry Ledger System

### 4.1 Ledger Architecture

Every operation is recorded as a **binary, atomic transaction** with double-entry bookkeeping:

```typescript
/**
 * Double-Entry Ledger
 *
 * Every change creates TWO entries:
 * 1. DEBIT: What was taken/changed (old state)
 * 2. CREDIT: What was given/created (new state)
 *
 * This ensures:
 * - Complete audit trail
 * - Ability to reconstruct any point in time
 * - Detection of inconsistencies
 * - Rollback capability
 */
interface LedgerEntry {
  // Identity
  entry_id: string;          // UUID
  transaction_id: string;    // Groups related entries
  sequence_number: bigint;   // Global ordering

  // Classification
  entry_type: 'DEBIT' | 'CREDIT';
  account_type: LedgerAccountType;

  // Content
  entity_type: string;       // 'build', 'worker', 'resource', 'config', etc.
  entity_id: string;

  // State change
  previous_state: unknown;   // null for creates
  new_state: unknown;        // null for deletes
  delta: unknown;            // Computed difference

  // Metadata
  timestamp: Date;
  actor: ActorIdentity;      // Who/what made this change
  reason: string;            // Why this change was made
  correlation_id: string;    // Links related operations

  // Integrity
  checksum: string;          // SHA-256 of entry content
  previous_checksum: string; // Chain integrity
  signature: string;         // Cryptographic signature (optional)
}

enum LedgerAccountType {
  // Resource accounts
  WORKER_POOL = 'worker_pool',
  CPU_ALLOCATION = 'cpu_allocation',
  MEMORY_ALLOCATION = 'memory_allocation',

  // Work accounts
  BUILD_QUEUE = 'build_queue',
  WORK_IN_PROGRESS = 'work_in_progress',
  COMPLETED_BUILDS = 'completed_builds',
  FAILED_BUILDS = 'failed_builds',

  // Configuration accounts
  CONFIG_ACTIVE = 'config_active',
  CONFIG_HISTORY = 'config_history',

  // Session accounts
  USER_SESSIONS = 'user_sessions',
  AGENT_SESSIONS = 'agent_sessions',

  // Audit accounts
  SECURITY_EVENTS = 'security_events',
  SYSTEM_EVENTS = 'system_events',
}
```

### 4.2 Atomic Operations

```typescript
class DoublEntryLedger {
  /**
   * Record a state change atomically.
   * Both DEBIT and CREDIT entries are written in a single transaction.
   */
  async recordChange<T>(params: {
    entityType: string;
    entityId: string;
    previousState: T | null;
    newState: T | null;
    actor: ActorIdentity;
    reason: string;
  }): Promise<TransactionResult> {
    const transactionId = uuid();
    const timestamp = new Date();
    const sequenceNumber = await this.getNextSequence();

    // Calculate delta
    const delta = this.computeDelta(params.previousState, params.newState);

    // Determine account types
    const accountType = this.getAccountType(params.entityType);

    // Create entries
    const entries: LedgerEntry[] = [];

    if (params.previousState !== null) {
      // DEBIT: Record what we're removing/changing
      entries.push({
        entry_id: uuid(),
        transaction_id: transactionId,
        sequence_number: sequenceNumber,
        entry_type: 'DEBIT',
        account_type: accountType,
        entity_type: params.entityType,
        entity_id: params.entityId,
        previous_state: params.previousState,
        new_state: null,
        delta: { removed: params.previousState },
        timestamp,
        actor: params.actor,
        reason: params.reason,
        correlation_id: this.currentCorrelationId,
        checksum: '',  // Computed below
        previous_checksum: await this.getLastChecksum(),
        signature: '',
      });
    }

    if (params.newState !== null) {
      // CREDIT: Record what we're adding/creating
      entries.push({
        entry_id: uuid(),
        transaction_id: transactionId,
        sequence_number: sequenceNumber + 1n,
        entry_type: 'CREDIT',
        account_type: accountType,
        entity_type: params.entityType,
        entity_id: params.entityId,
        previous_state: null,
        new_state: params.newState,
        delta: { added: params.newState },
        timestamp,
        actor: params.actor,
        reason: params.reason,
        correlation_id: this.currentCorrelationId,
        checksum: '',
        previous_checksum: entries[0]?.checksum ?? await this.getLastChecksum(),
        signature: '',
      });
    }

    // Compute checksums (chain integrity)
    for (const entry of entries) {
      entry.checksum = this.computeChecksum(entry);
    }

    // Write atomically
    await this.state.transaction(async (tx) => {
      for (const entry of entries) {
        await tx.append(`ledger:entries`, JSON.stringify(entry));
        await tx.set(`ledger:latest:${entry.entity_type}:${entry.entity_id}`,
          JSON.stringify(entry.new_state ?? entry.previous_state));
      }
      await tx.set('ledger:sequence', sequenceNumber + BigInt(entries.length));
    });

    // Emit for real-time streaming
    this.emit('transaction', { transactionId, entries });

    return { transactionId, entries, success: true };
  }

  /**
   * Verify ledger integrity by checking the hash chain.
   */
  async verifyIntegrity(fromSequence?: bigint): Promise<IntegrityReport> {
    const entries = await this.getEntriesFrom(fromSequence ?? 0n);
    const errors: IntegrityError[] = [];

    let previousChecksum = '';
    for (const entry of entries) {
      // Verify chain link
      if (entry.previous_checksum !== previousChecksum) {
        errors.push({
          sequence: entry.sequence_number,
          type: 'CHAIN_BREAK',
          expected: previousChecksum,
          actual: entry.previous_checksum,
        });
      }

      // Verify entry checksum
      const computed = this.computeChecksum(entry);
      if (entry.checksum !== computed) {
        errors.push({
          sequence: entry.sequence_number,
          type: 'CHECKSUM_MISMATCH',
          expected: computed,
          actual: entry.checksum,
        });
      }

      previousChecksum = entry.checksum;
    }

    return {
      verified: errors.length === 0,
      entriesChecked: entries.length,
      errors,
    };
  }
}
```

---

## 5. Hot-Swappable Resource Management

### 5.1 Dynamic Resource Registry

```typescript
/**
 * Hot-swappable resource registry.
 * Resources can be added/removed at runtime without stopping the daemon.
 */
class ResourceRegistry {
  private resources: Map<string, Resource> = new Map();
  private watchers: Set<ResourceWatcher> = new Set();

  /**
   * Add a resource dynamically.
   * Can be called by CLI, API, or other agents.
   */
  async addResource(resource: ResourceDefinition, actor: ActorIdentity): Promise<Resource> {
    // Validate resource
    await this.validateResource(resource);

    // Health check
    const health = await this.checkResourceHealth(resource);
    if (!health.healthy) {
      throw new Error(`Resource unhealthy: ${health.reason}`);
    }

    // Create resource instance
    const instance: Resource = {
      id: uuid(),
      ...resource,
      status: 'online',
      added_at: new Date(),
      added_by: actor,
      health_history: [health],
    };

    // Record in ledger
    await this.ledger.recordChange({
      entityType: 'resource',
      entityId: instance.id,
      previousState: null,
      newState: instance,
      actor,
      reason: `Added resource: ${resource.name}`,
    });

    // Add to registry
    this.resources.set(instance.id, instance);

    // Notify watchers
    this.notifyWatchers({ type: 'RESOURCE_ADDED', resource: instance });

    // Start health monitoring
    this.startHealthMonitoring(instance);

    return instance;
  }

  /**
   * Remove a resource gracefully.
   * Drains work before removal.
   */
  async removeResource(resourceId: string, actor: ActorIdentity): Promise<void> {
    const resource = this.resources.get(resourceId);
    if (!resource) {
      throw new Error(`Resource not found: ${resourceId}`);
    }

    // Mark as draining
    resource.status = 'draining';
    await this.ledger.recordChange({
      entityType: 'resource',
      entityId: resourceId,
      previousState: { ...resource, status: 'online' },
      newState: { ...resource, status: 'draining' },
      actor,
      reason: 'Draining resource for removal',
    });

    // Wait for active work to complete
    await this.waitForDrain(resourceId, { timeout: 300000 }); // 5 min timeout

    // Record removal
    await this.ledger.recordChange({
      entityType: 'resource',
      entityId: resourceId,
      previousState: resource,
      newState: null,
      actor,
      reason: `Removed resource: ${resource.name}`,
    });

    // Remove from registry
    this.resources.delete(resourceId);

    // Notify watchers
    this.notifyWatchers({ type: 'RESOURCE_REMOVED', resourceId });
  }

  /**
   * Update resource configuration hot.
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
    const newState = { ...resource, ...updates, updated_at: new Date() };

    // Record change
    await this.ledger.recordChange({
      entityType: 'resource',
      entityId: resourceId,
      previousState,
      newState,
      actor,
      reason: `Updated resource: ${JSON.stringify(updates)}`,
    });

    // Apply update
    this.resources.set(resourceId, newState);

    // Notify watchers
    this.notifyWatchers({ type: 'RESOURCE_UPDATED', resource: newState, changes: updates });

    return newState;
  }
}
```

### 5.2 Server Addition/Removal via CLI

```bash
# Add a new build server
buildnet server add \
  --name "build-server-3" \
  --address "192.168.1.103:7890" \
  --cpu-cores 8 \
  --memory-gb 32 \
  --capabilities "vite,rspack,typescript" \
  --labels "region=us-east,tier=standard"

# Remove a server (graceful drain)
buildnet server remove build-server-3

# Remove immediately (force)
buildnet server remove build-server-3 --force

# Update server configuration
buildnet server update build-server-3 \
  --cpu-cores 16 \
  --labels "tier=premium"

# List all servers
buildnet server list

# Show server details
buildnet server show build-server-3

# Drain a server (stop accepting new work)
buildnet server drain build-server-3

# Resume a drained server
buildnet server resume build-server-3
```

---

## 6. Multi-User Session Management

### 6.1 Session Architecture

```typescript
/**
 * Multi-user session management.
 * Tracks who is connected and what they're doing.
 */
interface Session {
  session_id: string;

  // Identity
  actor: ActorIdentity;
  actor_type: 'user' | 'agent' | 'service' | 'system';

  // Connection
  connected_at: Date;
  last_activity: Date;
  connection_type: 'cli' | 'web' | 'api' | 'grpc';
  client_info: {
    ip_address: string;
    user_agent: string;
    hostname: string;
  };

  // Permissions
  permissions: Permission[];
  scopes: string[];  // e.g., ['read', 'write', 'admin']

  // Activity
  current_activity: ActivityState | null;
  activity_history: ActivityEvent[];

  // Resources
  claimed_resources: string[];  // Resource IDs this session has claimed
}

interface ActorIdentity {
  id: string;
  name: string;
  type: 'user' | 'agent' | 'service';
  metadata: {
    email?: string;
    team?: string;
    agent_version?: string;
    service_name?: string;
  };
}

class SessionManager {
  private sessions: Map<string, Session> = new Map();

  /**
   * Create a new session.
   */
  async createSession(params: CreateSessionParams): Promise<Session> {
    const session: Session = {
      session_id: uuid(),
      actor: params.actor,
      actor_type: params.actorType,
      connected_at: new Date(),
      last_activity: new Date(),
      connection_type: params.connectionType,
      client_info: params.clientInfo,
      permissions: await this.resolvePermissions(params.actor),
      scopes: params.scopes,
      current_activity: null,
      activity_history: [],
      claimed_resources: [],
    };

    // Record in ledger
    await this.ledger.recordChange({
      entityType: 'session',
      entityId: session.session_id,
      previousState: null,
      newState: session,
      actor: session.actor,
      reason: 'Session created',
    });

    this.sessions.set(session.session_id, session);
    this.emit('session:created', session);

    return session;
  }

  /**
   * Get all active sessions.
   */
  getActiveSessions(): Session[] {
    return Array.from(this.sessions.values())
      .filter(s => this.isSessionActive(s));
  }

  /**
   * Get sessions by actor type.
   */
  getSessionsByType(type: 'user' | 'agent' | 'service'): Session[] {
    return this.getActiveSessions().filter(s => s.actor_type === type);
  }

  /**
   * Check who is currently working on what.
   */
  getCurrentActivities(): Map<string, ActivityState> {
    const activities = new Map<string, ActivityState>();
    for (const session of this.sessions.values()) {
      if (session.current_activity) {
        activities.set(session.session_id, session.current_activity);
      }
    }
    return activities;
  }
}
```

### 6.2 Activity Tracking

```typescript
interface ActivityState {
  activity_id: string;
  activity_type: 'building' | 'configuring' | 'monitoring' | 'debugging';
  started_at: Date;

  // What they're working on
  targets: string[];      // Package names, file paths, etc.
  resources: string[];    // Resource IDs being used

  // Progress
  progress: {
    current_step: string;
    steps_completed: number;
    total_steps: number;
    percentage: number;
  };

  // Output
  logs: LogEntry[];
  artifacts: string[];
}

class ActivityTracker {
  /**
   * Start tracking an activity.
   */
  async startActivity(
    sessionId: string,
    activity: Omit<ActivityState, 'activity_id' | 'started_at'>
  ): Promise<ActivityState> {
    const session = this.sessionManager.getSession(sessionId);

    const activityState: ActivityState = {
      activity_id: uuid(),
      started_at: new Date(),
      ...activity,
    };

    // Record in ledger
    await this.ledger.recordChange({
      entityType: 'activity',
      entityId: activityState.activity_id,
      previousState: null,
      newState: activityState,
      actor: session.actor,
      reason: `Started ${activity.activity_type}`,
    });

    // Update session
    session.current_activity = activityState;

    // Broadcast to activity screens
    this.broadcast({
      type: 'ACTIVITY_STARTED',
      session: session,
      activity: activityState,
    });

    return activityState;
  }

  /**
   * Update activity progress.
   */
  async updateProgress(
    activityId: string,
    progress: Partial<ActivityState['progress']>
  ): Promise<void> {
    const activity = await this.getActivity(activityId);
    const previousProgress = { ...activity.progress };

    activity.progress = { ...activity.progress, ...progress };

    // Record in ledger (but batch these to avoid spam)
    await this.ledger.recordChange({
      entityType: 'activity_progress',
      entityId: activityId,
      previousState: previousProgress,
      newState: activity.progress,
      actor: { id: 'system', name: 'Activity Tracker', type: 'service' },
      reason: 'Progress update',
    });

    // Broadcast
    this.broadcast({
      type: 'ACTIVITY_PROGRESS',
      activity_id: activityId,
      progress: activity.progress,
    });
  }
}
```

---

## 7. Master Activity Screens

### 7.1 Dashboard Data Model

```typescript
interface DashboardState {
  // Cluster overview
  cluster: {
    name: string;
    status: 'healthy' | 'degraded' | 'critical';
    uptime: number;
    version: string;
  };

  // Resource summary
  resources: {
    total_workers: number;
    active_workers: number;
    idle_workers: number;
    draining_workers: number;
    offline_workers: number;

    total_cpu_cores: number;
    used_cpu_cores: number;

    total_memory_gb: number;
    used_memory_gb: number;
  };

  // Build activity
  builds: {
    queued: number;
    in_progress: number;
    completed_last_hour: number;
    failed_last_hour: number;
    avg_build_time_ms: number;
  };

  // Active sessions
  sessions: {
    users: SessionSummary[];
    agents: SessionSummary[];
    services: SessionSummary[];
  };

  // Recent events
  events: {
    recent: Event[];
    alerts: Alert[];
  };

  // Performance metrics
  metrics: {
    builds_per_minute: number;
    avg_queue_time_ms: number;
    cache_hit_rate: number;
    error_rate: number;
  };
}

interface SessionSummary {
  session_id: string;
  actor_name: string;
  actor_type: string;
  connected_since: Date;
  current_activity: string | null;
  resources_claimed: number;
}
```

### 7.2 Real-Time Streaming

```typescript
/**
 * WebSocket-based real-time activity streaming.
 */
class ActivityBroadcaster {
  private subscribers: Map<string, WebSocket> = new Map();

  /**
   * Subscribe to activity updates.
   */
  subscribe(sessionId: string, ws: WebSocket, filters?: SubscriptionFilters): void {
    this.subscribers.set(sessionId, ws);

    // Send initial state
    ws.send(JSON.stringify({
      type: 'INITIAL_STATE',
      state: this.getDashboardState(),
    }));

    // Record subscription
    this.ledger.recordChange({
      entityType: 'subscription',
      entityId: sessionId,
      previousState: null,
      newState: { filters },
      actor: this.sessionManager.getSession(sessionId).actor,
      reason: 'Subscribed to activity stream',
    });
  }

  /**
   * Broadcast an event to all subscribers.
   */
  broadcast(event: BroadcastEvent): void {
    const message = JSON.stringify(event);

    for (const [sessionId, ws] of this.subscribers) {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(message);
      } else {
        this.subscribers.delete(sessionId);
      }
    }
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
      events: this.getRecentEvents(),
      metrics: this.getMetrics(),
    };
  }
}
```

### 7.3 CLI Dashboard

```bash
# Launch interactive dashboard
buildnet dashboard

# Output:
# ┌─────────────────────────────────────────────────────────────────────────┐
# │  BUILDNET CLUSTER: musclemap-builds                    Status: HEALTHY  │
# │  Uptime: 14d 3h 27m    Version: 1.0.0                                   │
# ├─────────────────────────────────────────────────────────────────────────┤
# │  RESOURCES                          │  BUILDS                           │
# │  ─────────────────────────────────  │  ────────────────────────────     │
# │  Workers: 8/10 active               │  Queued:      3                   │
# │  CPU:     24/32 cores (75%)         │  In Progress: 5                   │
# │  Memory:  48/64 GB (75%)            │  Completed:   127 (last hour)     │
# │  Cache:   2.4 GB / 10 GB            │  Failed:      2 (last hour)       │
# │                                     │  Avg Time:    12.3s               │
# ├─────────────────────────────────────────────────────────────────────────┤
# │  ACTIVE SESSIONS                                                        │
# │  ─────────────────────────────────────────────────────────────────────  │
# │  👤 alice@dev       CLI   Building packages/shared      2m ago         │
# │  👤 bob@dev         Web   Monitoring                    5m ago         │
# │  🤖 claude-agent-1  API   Building packages/api         1m ago         │
# │  🤖 claude-agent-2  API   Idle                          3m ago         │
# │  ⚙️  ci-service      gRPC  Building (full)               0m ago         │
# ├─────────────────────────────────────────────────────────────────────────┤
# │  RECENT EVENTS                                                          │
# │  ─────────────────────────────────────────────────────────────────────  │
# │  14:32:15  ✅ Build completed: packages/shared (8.2s)                   │
# │  14:32:10  🔨 Build started: packages/api by claude-agent-1             │
# │  14:31:55  ➕ Server added: build-server-5 by alice@dev                 │
# │  14:31:42  ⚠️  Worker unhealthy: build-server-2 (high memory)           │
# │  14:31:30  ✅ Build completed: packages/core (12.1s)                    │
# └─────────────────────────────────────────────────────────────────────────┘
#
# [q] Quit  [b] Builds  [w] Workers  [s] Sessions  [l] Logs  [?] Help
```

---

## 8. Orchestral Coordination

### 8.1 The Conductor Pattern

```typescript
/**
 * The Orchestrator directs workers like a conductor directs musicians.
 *
 * Key principles:
 * 1. Each worker has a "part" (specialization)
 * 2. The conductor ensures harmony (no conflicts)
 * 3. Timing is coordinated (dependencies respected)
 * 4. The whole is greater than the parts (parallel efficiency)
 */
class BuildOrchestrator {
  /**
   * Conduct a build - the main entry point.
   */
  async conductBuild(request: BuildRequest): Promise<BuildResult> {
    const buildId = uuid();
    const actor = request.actor;

    // Record in ledger: Build started
    await this.ledger.recordChange({
      entityType: 'build',
      entityId: buildId,
      previousState: null,
      newState: { status: 'started', request },
      actor,
      reason: 'Build started',
    });

    try {
      // 1. PREPARATION PHASE - "Tuning"
      const preparation = await this.prepare(request);

      // 2. SCORING PHASE - "Writing the score"
      const score = await this.createScore(preparation);

      // 3. REHEARSAL PHASE - "Dry run"
      await this.rehearse(score);

      // 4. PERFORMANCE PHASE - "The actual build"
      const result = await this.perform(score);

      // 5. REVIEW PHASE - "Post-performance analysis"
      await this.review(result);

      return result;

    } catch (error) {
      await this.handleBuildFailure(buildId, error, actor);
      throw error;
    }
  }

  /**
   * Create the "score" - the build plan with all parts assigned.
   */
  private async createScore(preparation: BuildPreparation): Promise<BuildScore> {
    // Split into micro-bundles
    const bundles = await this.bundleSplitter.splitIntoMicroBundles(preparation.request);

    // Assign parts to workers based on capabilities
    const assignments: PartAssignment[] = [];
    const availableWorkers = await this.resourceRegistry.getAvailableWorkers();

    for (const bundle of bundles) {
      // Find best worker for this bundle
      const worker = this.findBestWorker(bundle, availableWorkers);

      assignments.push({
        bundle,
        worker,
        dependencies: bundle.dependencies,
        estimated_start: this.estimateStartTime(bundle, assignments),
        estimated_duration: bundle.estimated_time_ms,
      });
    }

    return {
      id: uuid(),
      bundles,
      assignments,
      dependency_graph: this.buildDependencyGraph(bundles),
      critical_path: this.findCriticalPath(bundles),
      estimated_total_time: this.estimateTotalTime(assignments),
    };
  }

  /**
   * Perform the build - execute all parts in coordination.
   */
  private async perform(score: BuildScore): Promise<BuildResult> {
    const executor = new ScoreExecutor(score, this);

    // Start all ready bundles (those with no dependencies)
    const readyBundles = score.bundles.filter(b => b.dependencies.length === 0);

    for (const bundle of readyBundles) {
      executor.startBundle(bundle);
    }

    // Wait for completion, starting new bundles as dependencies complete
    return executor.waitForCompletion();
  }

  /**
   * Find the best worker for a bundle based on:
   * 1. Capabilities (can it do this work?)
   * 2. Load (is it busy?)
   * 3. Specialization (is it good at this?)
   * 4. Locality (is the data nearby?)
   */
  private findBestWorker(bundle: MicroBundle, workers: Worker[]): Worker {
    const candidates = workers.filter(w => this.canHandle(w, bundle));

    if (candidates.length === 0) {
      throw new Error(`No worker can handle bundle: ${bundle.id}`);
    }

    // Score each candidate
    const scored = candidates.map(w => ({
      worker: w,
      score: this.scoreWorkerForBundle(w, bundle),
    }));

    // Sort by score (highest first)
    scored.sort((a, b) => b.score - a.score);

    return scored[0].worker;
  }

  private scoreWorkerForBundle(worker: Worker, bundle: MicroBundle): number {
    let score = 0;

    // Capability match (required)
    if (!this.canHandle(worker, bundle)) return -Infinity;

    // Load factor (prefer less loaded workers)
    score += (100 - worker.state.load_percentage);

    // Specialization bonus
    if (worker.performance.specializations.includes(bundle.package)) {
      score += 50;
    }

    // Historical performance
    score += worker.performance.success_rate * 20;

    // Locality bonus (if worker has cached this package before)
    if (this.hasCached(worker, bundle)) {
      score += 30;
    }

    return score;
  }
}
```

### 8.2 Redundancy and Verification

```typescript
/**
 * Workers check each other's work for reliability.
 */
class WorkVerifier {
  /**
   * Verify a build result by spot-checking on another worker.
   */
  async verifyBuild(
    result: BundleBuildResult,
    originalWorker: Worker
  ): Promise<VerificationResult> {
    // Find a different worker for verification
    const verifier = await this.findVerifierWorker(originalWorker);

    if (!verifier) {
      // No redundant worker available - log warning but continue
      return { verified: true, method: 'skipped', reason: 'no_verifier_available' };
    }

    // Run verification checks
    const checks: VerificationCheck[] = [
      await this.verifyChecksum(result, verifier),
      await this.verifyTypecheck(result, verifier),
      await this.verifySampleExecution(result, verifier),
    ];

    const failed = checks.filter(c => !c.passed);

    if (failed.length > 0) {
      // Record verification failure
      await this.ledger.recordChange({
        entityType: 'verification_failure',
        entityId: result.bundle_id,
        previousState: null,
        newState: { result, failed },
        actor: { id: 'system', name: 'Work Verifier', type: 'service' },
        reason: `Verification failed: ${failed.map(f => f.check).join(', ')}`,
      });

      return { verified: false, method: 'full', failed_checks: failed };
    }

    return { verified: true, method: 'full', checks };
  }

  /**
   * Fallback to backup result if primary fails.
   */
  async handleFailure(
    bundle: MicroBundle,
    primaryResult: BundleBuildResult,
    error: Error
  ): Promise<BundleBuildResult> {
    // Check if we have a backup result from redundant execution
    const backupResult = await this.getBackupResult(bundle.id);

    if (backupResult && backupResult.success) {
      await this.ledger.recordChange({
        entityType: 'failover',
        entityId: bundle.id,
        previousState: { primary: primaryResult },
        newState: { backup: backupResult },
        actor: { id: 'system', name: 'Work Verifier', type: 'service' },
        reason: `Failover to backup: ${error.message}`,
      });

      return backupResult;
    }

    // No backup - need to rebuild
    return this.requestRebuild(bundle, error);
  }
}
```

---

## 9. Configuration Files

### 9.1 Master Daemon Config

```yaml
# /etc/buildnet/daemon.yaml or ./build-daemon.yaml

# Master daemon configuration
master:
  daemon_id: "master-1"
  cluster_name: "musclemap-builds"

  # File watching configuration
  watch:
    directories:
      - "./src"
      - "./packages"
      - "./apps"
    include_patterns:
      - "**/*.ts"
      - "**/*.tsx"
      - "**/*.js"
      - "**/*.jsx"
      - "**/*.json"
      - "**/*.yaml"
      - "**/*.css"
      - "**/*.scss"
    exclude_patterns:
      - "**/node_modules/**"
      - "**/dist/**"
      - "**/build/**"
      - "**/.git/**"
      - "**/*.test.ts"
      - "**/*.spec.ts"

    # How often to scan for changes (milliseconds)
    scan_interval_ms: 1000

    # Debounce rapid changes
    debounce_ms: 300

    # Start preparing before build is requested
    preemptive_prepare: true

  # Auto-build on file changes
  auto_build:
    enabled: true
    delay_ms: 2000  # Wait 2s after last change
    max_concurrent_builds: 3
    priority_paths:
      - "packages/shared"
      - "packages/core"

  # Worker pool configuration
  workers:
    min_workers: 2
    max_workers: 10
    worker_timeout_ms: 300000  # 5 minutes
    heartbeat_interval_ms: 5000
    redundancy_factor: 1.2  # 20% extra capacity

  # Resource limits
  resources:
    cpu_allocation: adaptive
    memory_limit_mb: 8192
    disk_cache_limit_mb: 10240

  # Networking
  network:
    bind_address: "0.0.0.0:7890"
    advertise_address: "192.168.1.100:7890"
    tls:
      enabled: true
      cert_file: "/etc/buildnet/certs/server.crt"
      key_file: "/etc/buildnet/certs/server.key"

  # Audit and logging
  audit:
    ledger_backend: hybrid  # dragonfly + file backup
    log_level: info
    retention_days: 90
    real_time_streaming: true

# State backend configuration
state:
  backend: dragonfly
  dragonfly:
    host: "localhost"
    port: 6379
    password: "${DRAGONFLY_PASSWORD}"
    database: 0
    key_prefix: "buildnet:"

  # File-based backup
  file_backup:
    enabled: true
    path: "/var/lib/buildnet/ledger"
    sync_interval_ms: 5000

# Initial resources (can be modified at runtime)
resources:
  - name: "local-worker-1"
    type: worker
    address: "localhost:7891"
    cpu_cores: 4
    memory_gb: 8
    capabilities:
      bundlers: [vite, esbuild]
      node_version: "20"
    labels:
      tier: local

  - name: "build-server-1"
    type: worker
    address: "192.168.1.101:7890"
    cpu_cores: 16
    memory_gb: 64
    capabilities:
      bundlers: [vite, rspack, esbuild]
      node_version: "20"
      native_modules: true
    labels:
      tier: premium
      region: us-east

# Plugins
plugins:
  core:
    notify:
      enabled: true
      channels: [console, slack]
    typecheck:
      enabled: true
      incremental: true
    sourcemaps:
      enabled: true
      upload: false
```

### 9.2 Worker Config

```yaml
# Worker-specific configuration
worker:
  worker_id: "worker-1"
  master_address: "192.168.1.100:7890"

  # Local resources
  resources:
    cpu_cores: 8
    memory_mb: 16384
    disk_speed: nvme

  # Capabilities
  capabilities:
    bundlers:
      - vite
      - rspack
      - esbuild
    node_version: "20.10.0"
    native_modules: true
    docker_available: false

  # Performance tuning
  performance:
    max_concurrent_bundles: 4
    cache_size_mb: 4096

  # Heartbeat
  heartbeat:
    interval_ms: 5000
    timeout_ms: 15000
```

---

## 10. Implementation Phases

### Phase 1: Core Infrastructure (2-3 weeks)
- [ ] Master Daemon process with file watching
- [ ] Basic child worker spawning
- [ ] DragonflyDB state backend integration
- [ ] Simple work distribution (round-robin)
- [ ] Basic CLI commands

### Phase 2: Double-Entry Ledger (1-2 weeks)
- [ ] Ledger data model and storage
- [ ] Atomic transaction recording
- [ ] Checksum chain verification
- [ ] File backup synchronization
- [ ] Query interface for audit

### Phase 3: Intelligent Orchestration (2-3 weeks)
- [ ] Micro-bundle splitting
- [ ] Dependency graph analysis
- [ ] Worker capability matching
- [ ] Critical path optimization
- [ ] Gossip protocol for worker communication

### Phase 4: Hot-Swap & Multi-User (2 weeks)
- [ ] Resource registry with hot-swap
- [ ] Session management
- [ ] Permission system
- [ ] Activity tracking
- [ ] Real-time event streaming

### Phase 5: Dashboards & Monitoring (1-2 weeks)
- [ ] CLI dashboard (ncurses-style)
- [ ] Web dashboard (React)
- [ ] WebSocket streaming
- [ ] Alert system
- [ ] Performance metrics

### Phase 6: Redundancy & Verification (1 week)
- [ ] Work verification system
- [ ] Redundant execution
- [ ] Failover handling
- [ ] Self-healing mechanisms

---

## 11. API Reference

### CLI Commands

```bash
# Daemon management
buildnet daemon start [--config path]
buildnet daemon stop [--graceful]
buildnet daemon status
buildnet daemon restart

# Build commands
buildnet build [targets...]
buildnet build --watch
buildnet build --dry-run

# Server/resource management
buildnet server add --name <name> --address <addr> [options]
buildnet server remove <name> [--force]
buildnet server list
buildnet server show <name>
buildnet server drain <name>
buildnet server resume <name>
buildnet server update <name> [options]

# Session management
buildnet session list
buildnet session show <session-id>
buildnet session kick <session-id>

# Monitoring
buildnet dashboard
buildnet logs [--follow] [--filter <pattern>]
buildnet metrics
buildnet events [--since <time>]

# Audit
buildnet audit query [--from <time>] [--to <time>] [--entity <type>]
buildnet audit verify [--from <sequence>]
buildnet audit export [--format json|csv]

# Configuration
buildnet config show
buildnet config set <key> <value>
buildnet config validate <path>
```

### gRPC API

```protobuf
service BuildNet {
  // Build operations
  rpc Build(BuildRequest) returns (stream BuildEvent);
  rpc CancelBuild(CancelBuildRequest) returns (CancelBuildResponse);
  rpc GetBuildStatus(GetBuildStatusRequest) returns (BuildStatus);

  // Resource management
  rpc AddResource(AddResourceRequest) returns (Resource);
  rpc RemoveResource(RemoveResourceRequest) returns (Empty);
  rpc UpdateResource(UpdateResourceRequest) returns (Resource);
  rpc ListResources(ListResourcesRequest) returns (ListResourcesResponse);

  // Session management
  rpc CreateSession(CreateSessionRequest) returns (Session);
  rpc EndSession(EndSessionRequest) returns (Empty);
  rpc ListSessions(ListSessionsRequest) returns (ListSessionsResponse);

  // Monitoring
  rpc SubscribeEvents(SubscribeEventsRequest) returns (stream Event);
  rpc GetDashboardState(Empty) returns (DashboardState);
  rpc GetMetrics(GetMetricsRequest) returns (Metrics);

  // Audit
  rpc QueryLedger(QueryLedgerRequest) returns (stream LedgerEntry);
  rpc VerifyLedger(VerifyLedgerRequest) returns (VerifyLedgerResponse);
}
```

---

## 12. Security Considerations

### Authentication
- mTLS for worker-to-master communication
- JWT tokens for API access
- Session-based authentication for CLI/Web

### Authorization
- Role-based access control (RBAC)
- Resource-level permissions
- Audit logging for all privileged operations

### Data Protection
- Encryption at rest for ledger data
- Encryption in transit (TLS 1.3)
- Cryptographic signatures for ledger entries (optional)

---

## 13. Scalability Notes

### Horizontal Scaling
- Add more workers dynamically
- Master can be replicated with leader election
- State backend (DragonflyDB) can be clustered

### Performance Targets
- Support 100+ concurrent workers
- Handle 1000+ builds per hour
- Sub-second build queue latency
- Real-time dashboard updates (<100ms)

---

*Document Version: 1.0*
*Last Updated: 2025-01-25*
