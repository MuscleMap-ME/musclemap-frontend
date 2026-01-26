/**
 * BuildNet Core
 *
 * Distributed build system with hot-swappable bundlers, plugins, and
 * DragonflyDB state management.
 *
 * @packageDocumentation
 */

// Types
export * from './types/index.js';

// State backends
export {
  createBackend,
  autoDetectBackend,
  StateManager,
  DragonflyBackend,
  FileBackend,
  MemoryBackend,
  type DragonflyConfig,
  type FileBackendConfig,
  type MemoryBackendConfig,
} from './state/index.js';

// Plugin system
export {
  PluginLoader,
  PluginExecutor,
  DEFAULT_PLUGINS_CONFIG,
  createCommandPlugin,
  definePlugin,
  type LoadedPlugin,
} from './plugins/index.js';

// Re-export core plugins
export {
  typecheckPlugin,
  lintPlugin,
  compressPlugin,
  cleanPlugin,
  notifyPlugin,
  sourcemapsPlugin,
} from './plugins/index.js';

// Bundler system
export {
  BundlerManager,
  BaseBundlerAdapter,
  ViteAdapter,
  RspackAdapter,
  EsbuildAdapter,
  createBundlerAdapter,
  DEFAULT_BUNDLERS_CONFIG,
  type ViteConfig,
  type RspackConfig,
  type EsbuildConfig,
} from './bundlers/index.js';

// Controller and scheduler
export {
  BuildController,
  Scheduler,
  TaskPriority,
  type BuildRequest,
  type BuildStatus,
  type ControllerEvent,
  type ControllerEventListener,
  type QueuedTask,
} from './controller/index.js';

// Worker agent
export {
  WorkerAgent,
  type WorkerAgentConfig,
} from './worker/index.js';

// Daemon system
export {
  // Types
  type ActorIdentity,
  type MasterDaemonConfig,
  type DashboardState,
  type LedgerEntry,
  type LedgerTransaction,
  type Session,
  type Resource,
  type WorkerState,
  ChangeImpact,
  LedgerAccountType,
  SYSTEM_ACTOR,

  // Ledger
  DoubleEntryLedger,
  createLedger,

  // Resources
  ResourceRegistry,
  createResourceRegistry,

  // Sessions
  SessionManager,
  createSessionManager,

  // Master Daemon
  MasterDaemon,
  createMasterDaemon,
  FileWatcherService,
  createFileWatcher,
  BuildOrchestrator,
  createOrchestrator,

  // Worker
  DaemonWorker,
  createDaemonWorker,

  // Dashboard
  ActivityTracker,
  createActivityTracker,

  // API
  HttpApiServer,
  createHttpServer,

  // Convenience functions
  createDaemonSystem,
  getDefaultDaemonConfig,
} from './daemon/index.js';
