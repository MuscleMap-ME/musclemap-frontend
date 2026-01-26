/**
 * BuildNet Daemon Module
 *
 * Complete distributed build daemon system with:
 * - Master daemon with file watching and auto-build
 * - Asymmetric worker processes
 * - Double-entry ledger for atomic audit logging
 * - Hot-swappable resource management
 * - Multi-user session tracking
 * - Real-time activity dashboard
 * - HTTP API server
 */

// Types
export * from './types.js';

// Ledger
export {
  DoubleEntryLedger,
  createLedger,
  type LedgerConfig,
  type RecordChangeParams,
  type TransactionResult,
  type QueryOptions,
} from './ledger/index.js';

// Resources
export {
  ResourceRegistry,
  createResourceRegistry,
  type ResourceRegistryConfig,
  type ResourceEvent,
} from './resources/index.js';

// Sessions
export {
  SessionManager,
  createSessionManager,
  type SessionManagerConfig,
  type CreateSessionParams,
  type SessionEvent,
} from './sessions/index.js';

// Master Daemon
export {
  MasterDaemon,
  createMasterDaemon,
  type MasterDaemonOptions,
  FileWatcherService,
  createFileWatcher,
  type FileWatcherConfig,
  BuildOrchestrator,
  createOrchestrator,
  type OrchestratorConfig,
  type BundleResult,
} from './master/index.js';

// Worker
export {
  DaemonWorker,
  createDaemonWorker,
  type DaemonWorkerConfig,
  type WorkClaim,
  type WorkResult,
} from './worker/index.js';

// Dashboard
export {
  ActivityTracker,
  createActivityTracker,
  type ActivityTrackerConfig,
  type Subscriber,
  type SubscriptionFilters,
  type ActivityUpdate,
  type IncrementalUpdate,
} from './dashboard/index.js';

// API
export {
  HttpApiServer,
  createHttpServer,
  type HttpServerConfig,
} from './api/index.js';

// Extensions (CLI tools discovery and installation)
export {
  // Types
  type ExtensionCategory,
  type ExtensionDefinition,
  type DetectionCommand,
  type InstallationInfo,
  type BuildOperation,
  type DiscoveredExtension,
  type ExtensionBenchmark,
  type ExtensionCapabilities,
  type SystemInfo,
  type DegradedExtension,
  type RecommendedExtension,
  type ScannerConfig,
  type PackageManagerType,
  type PackageManager,
  type InstallationPlan,
  type PlannedInstallation,
  type ExpectedBenefit,
  type InstallationResult,
  // Scanner
  ExtensionScanner,
  createExtensionScanner,
  quickScan,
  fullScan,
  // Installer
  ExtensionInstaller,
  createExtensionInstaller,
  quickInstall,
  // Extension definitions
  ALL_EXTENSIONS,
  getExtensionsByCategory,
  getExtensionsForOperation,
  getRecommendedForOperation,
} from './extensions/index.js';

// ============================================================================
// Convenience Factory Functions
// ============================================================================

import { type StateBackend } from '../state/index.js';
import { MasterDaemon, createMasterDaemon } from './master/index.js';
import { ActivityTracker, createActivityTracker } from './dashboard/index.js';
import { HttpApiServer, createHttpServer } from './api/index.js';
import type { MasterDaemonConfig } from './types.js';

/**
 * Create a complete daemon system with all components.
 */
export async function createDaemonSystem(options: {
  config: MasterDaemonConfig;
  state: StateBackend;
  root_dir: string;
  http_port?: number;
}): Promise<{
  daemon: MasterDaemon;
  tracker: ActivityTracker;
  server: HttpApiServer;
  start: () => Promise<void>;
  stop: () => Promise<void>;
}> {
  // Create components
  const daemon = createMasterDaemon({
    config: options.config,
    state: options.state,
    root_dir: options.root_dir,
  });

  const tracker = createActivityTracker();

  const server = createHttpServer(daemon, tracker, {
    port: options.http_port ?? 7890,
  });

  // Wire up event forwarding
  daemon.on('event', (event) => {
    tracker.recordEvent(event);
  });

  daemon.on('session:created', ({ session }) => {
    tracker.recordSessionChange('added', session);
  });

  daemon.on('session:ended', ({ session }) => {
    tracker.recordSessionChange('removed', session);
  });

  daemon.on('build:completed', (result) => {
    tracker.recordBuildChange('completed', result);
  });

  daemon.on('resource:added', ({ resource }) => {
    tracker.recordResourceChange('added', resource);
  });

  daemon.on('resource:removed', ({ resource }) => {
    tracker.recordResourceChange('removed', resource.id);
  });

  // Create start/stop functions
  const start = async () => {
    await daemon.start();
    tracker.start();
    await server.start();

    // Update tracker with initial state
    tracker.updateState(daemon.getDashboardState());

    // Periodically update dashboard state
    const updateInterval = setInterval(() => {
      tracker.updateState(daemon.getDashboardState());
    }, 1000);

    // Store for cleanup
    (daemon as any)._updateInterval = updateInterval;
  };

  const stop = async () => {
    const updateInterval = (daemon as any)._updateInterval;
    if (updateInterval) {
      clearInterval(updateInterval);
    }

    await server.stop();
    tracker.stop();
    await daemon.stop();
  };

  return { daemon, tracker, server, start, stop };
}

/**
 * Default daemon configuration.
 */
export function getDefaultDaemonConfig(
  overrides: Partial<MasterDaemonConfig> = {}
): MasterDaemonConfig {
  return {
    daemon_id: overrides.daemon_id ?? `daemon-${Date.now()}`,
    cluster_name: overrides.cluster_name ?? 'buildnet-cluster',

    watch: {
      directories: overrides.watch?.directories ?? ['./src', './packages', './apps'],
      include_patterns: overrides.watch?.include_patterns ?? [
        '**/*.ts',
        '**/*.tsx',
        '**/*.js',
        '**/*.jsx',
        '**/*.json',
      ],
      exclude_patterns: overrides.watch?.exclude_patterns ?? [
        '**/node_modules/**',
        '**/dist/**',
        '**/.git/**',
        '**/*.test.ts',
        '**/*.spec.ts',
      ],
      scan_interval_ms: overrides.watch?.scan_interval_ms ?? 1000,
      debounce_ms: overrides.watch?.debounce_ms ?? 300,
      preemptive_prepare: overrides.watch?.preemptive_prepare ?? true,
    },

    auto_build: {
      enabled: overrides.auto_build?.enabled ?? true,
      delay_ms: overrides.auto_build?.delay_ms ?? 2000,
      max_concurrent_builds: overrides.auto_build?.max_concurrent_builds ?? 3,
      priority_paths: overrides.auto_build?.priority_paths ?? [
        'packages/shared',
        'packages/core',
      ],
    },

    workers: {
      min_workers: overrides.workers?.min_workers ?? 2,
      max_workers: overrides.workers?.max_workers ?? 10,
      worker_timeout_ms: overrides.workers?.worker_timeout_ms ?? 300000,
      heartbeat_interval_ms: overrides.workers?.heartbeat_interval_ms ?? 5000,
      redundancy_factor: overrides.workers?.redundancy_factor ?? 1.2,
    },

    resources: {
      cpu_allocation: overrides.resources?.cpu_allocation ?? 'adaptive',
      memory_limit_mb: overrides.resources?.memory_limit_mb ?? 8192,
      disk_cache_limit_mb: overrides.resources?.disk_cache_limit_mb ?? 10240,
    },

    network: {
      bind_address: overrides.network?.bind_address ?? '0.0.0.0:7890',
      advertise_address: overrides.network?.advertise_address ?? 'localhost:7890',
      tls: overrides.network?.tls ?? null,
    },

    audit: {
      ledger_backend: overrides.audit?.ledger_backend ?? 'hybrid',
      log_level: overrides.audit?.log_level ?? 'info',
      retention_days: overrides.audit?.retention_days ?? 90,
      real_time_streaming: overrides.audit?.real_time_streaming ?? true,
    },
  };
}
