/**
 * BuildNet Core Types
 *
 * Type definitions for the distributed build system.
 */

// ============================================================================
// Configuration Types
// ============================================================================

export interface BuildNetConfig {
  version: string;
  controller: ControllerConfig;
  nodes: Record<string, NodeConfig>;
  bundlers: BundlersConfig;
  plugins: PluginsConfig;
  resilience: ResilienceConfig;
  tasks: Record<string, TaskConfig>;
  sync: SyncConfig;
  monitoring: MonitoringConfig;
  state: StateConfig;
  auditing: AuditConfig;
  logs: LogsConfig;
}

export interface ControllerConfig {
  id: string;
  listen: {
    grpc: string;
    http: string;
    websocket: string;
  };
  heartbeat?: {
    interval_ms: number;
    timeout_ms: number;
    max_missed: number;
  };
  scheduler?: SchedulerConfig;
}

export interface SchedulerConfig {
  process_interval_ms?: number;
  heartbeat_timeout_ms?: number;
  max_retries?: number;
}

export interface NodeConfig {
  host: string;
  port: number;
  ssh_port?: number;
  resources: NodeResources;
  constraints: NodeConstraints;
  capabilities: string[];
  preferred_for?: string[];
  sync?: NodeSyncConfig;
}

export interface NodeResources {
  cpu_cores: number;
  memory_gb: number;
  disk_gb?: number;
  normalization: {
    cpu_factor: number;
    memory_factor: number;
    io_factor: number;
  };
}

export interface NodeConstraints {
  pm2_safe_mode?: boolean;
  max_concurrent_builds: number;
  force_staged?: boolean;
  max_build_memory_gb?: number;
}

export interface NodeSyncConfig {
  method: 'rsync' | 'scp' | 'sftp';
  paths: string[];
}

// ============================================================================
// Bundler Types
// ============================================================================

export interface BundlersConfig {
  active: string;
  available: Record<string, BundlerConfig>;
  fallback_chain: string[];
  auto_select: {
    ci_environment?: string;
    development?: string;
    has_webpack_config?: string;
  };
}

export interface BundlerConfig {
  enabled: boolean;
  package: string;
  config?: string;
  priority?: number;
  requires?: string[];
}

export type BundlerName = 'vite-rolldown' | 'rspack' | 'turbopack' | 'esbuild' | 'webpack';

export interface BundlerAdapter {
  name: BundlerName;
  version: string;
  isAvailable(): Promise<boolean>;
  build(context: BuildContext): Promise<BuildResult>;
  watch?(context: BuildContext, onChange: () => void): Promise<() => void>;
  getConfig(): Promise<unknown>;
}

// ============================================================================
// Plugin Types
// ============================================================================

export interface PluginsConfig {
  core: Record<string, PluginConfig>;
  custom_dir?: string;
  remote?: RemotePluginConfig[];
}

export interface PluginConfig {
  enabled: boolean;
  hook: 'pre-build' | 'build' | 'post-build' | 'deploy';
  command?: string;
  fail_on_error?: boolean;
  config?: Record<string, unknown>;
}

export interface RemotePluginConfig {
  name: string;
  source: string;
  enabled: boolean;
}

export type PluginHook = 'pre-build' | 'build' | 'post-build' | 'deploy' | 'error';

export interface Plugin {
  name: string;
  version: string;
  hooks: Partial<Record<PluginHook, PluginHandler>>;
  configSchema?: unknown;
  dependencies?: string[];
  hotSwappable: boolean;
}

export type PluginHandler = (context: BuildContext, result?: BuildResult) => Promise<void>;

// ============================================================================
// Build Types
// ============================================================================

export interface TaskConfig {
  description?: string;
  command?: string;
  subtasks?: string[];
  estimated_duration_s?: number;
  memory_required_gb?: number;
  depends_on?: string[];
  parallelizable?: boolean;
  adaptive?: boolean;
}

export interface BuildTask {
  name: string;
  project?: string;
  branch?: string;
  commit?: string;
  requires_capabilities?: string[];
  memory_required_gb?: number;
  options?: {
    noCache?: boolean;
    staged?: boolean;
    node?: string;
    bundler?: string;
  };
}

export interface BuildContext {
  buildId: string;
  task?: BuildTask;
  taskName?: string;
  nodeId?: string;
  config?: BuildNetConfig;
  bundler?: BundlerAdapter;
  node?: WorkerNode;
  cache?: CacheManager;
  logger: Logger;
  metrics: MetricsCollector;
  stateManager?: import('../state/index.js').StateManager;
  startedAt?: Date;
  workDir: string;
  env: Record<string, string>;
}

export interface BuildResult {
  success: boolean;
  buildId: string;
  duration_ms: number;
  artifacts: Artifact[];
  errors?: BuildError[];
  warnings?: string[];
  metrics: BuildMetrics;
}

export interface Artifact {
  path: string;
  size_bytes: number;
  hash: string;
  compressed?: {
    gzip_size: number;
    brotli_size: number;
  };
}

export interface BuildError {
  code: string;
  message: string;
  file?: string;
  line?: number;
  column?: number;
  stack?: string;
}

export interface BuildMetrics {
  queue_wait_ms: number;
  total_duration_ms: number;
  phases: {
    pre_build_ms: number;
    build_ms: number;
    post_build_ms: number;
    deploy_ms?: number;
  };
  cache: {
    files_checked: number;
    cache_hits: number;
    cache_misses: number;
    hit_ratio: number;
    time_saved_ms: number;
  };
  resources: {
    peak_memory_mb: number;
    avg_cpu_percent: number;
    io_read_mb: number;
    io_write_mb: number;
  };
}

// ============================================================================
// Worker/Node Types
// ============================================================================

export interface WorkerNode {
  id: string;
  host: string;
  port: number;
  status: NodeStatus;
  config?: NodeConfig;
  resources?: NodeResources;
  constraints?: NodeConstraints;
  normalization?: {
    cpu_factor: number;
    memory_factor: number;
    io_factor: number;
  };
  currentLoad?: NodeLoad;
  lastHeartbeat?: Date;
  registeredAt?: Date;
  capabilities?: string[];
  preferred_for?: string[];
  has_cached_dependencies?: boolean;
}

export type NodeStatus = 'healthy' | 'unhealthy' | 'degraded' | 'offline' | 'draining';

export interface NodeLoad {
  cpu_percent: number;
  memory_used_gb: number;
  memory_free_gb: number;
  io_percent: number;
  queue_depth: number;
  active_builds: number;
}

export interface WorkerRegistration {
  nodeId: string;
  host: string;
  port: number;
  config: NodeConfig;
  capabilities: string[];
}

export interface Heartbeat {
  nodeId: string;
  timestamp: Date;
  load: NodeLoad;
  activeBuildIds: string[];
}

// ============================================================================
// State Backend Types
// ============================================================================

export interface StateConfig {
  backend: 'dragonfly' | 'redis' | 'file' | 'memory' | 'sqlite' | 'mongodb' | 'auto';
  dragonfly?: {
    url: string;
    prefix?: string;
    connect_timeout_ms?: number;
  };
  redis?: {
    url: string;
    prefix?: string;
    connect_timeout_ms?: number;
  };
  file?: {
    path: string;
    lock_file?: string;
    sync_interval_ms?: number;
  };
  memory?: {
    max_entries?: number;
  };
  sqlite?: {
    /** Server identifier for path construction */
    server?: string;
    /** Node identifier for path construction */
    node?: string;
    /** Base directory for database */
    directory?: string;
    /** Database filename */
    filename?: string;
    /** Full path override */
    path?: string;
    /** Enable WAL mode (default: true) */
    wal_mode?: boolean;
    /** Busy timeout in ms */
    busy_timeout_ms?: number;
    /** Cache size in KB */
    cache_size_kb?: number;
    /** Synchronous mode */
    synchronous?: 'off' | 'normal' | 'full' | 'extra';
    /** Performance metrics */
    metrics?: {
      enabled?: boolean;
      sample_interval_ms?: number;
    };
  };
  mongodb?: {
    /** MongoDB connection URI */
    url: string;
    /** Database name */
    database?: string;
    /** Collection prefix */
    prefix?: string;
    /** Connection timeout in ms */
    connect_timeout_ms?: number;
    /** Server selection timeout in ms */
    server_selection_timeout_ms?: number;
    /** Max connection pool size */
    max_pool_size?: number;
    /** Min connection pool size */
    min_pool_size?: number;
    /** Read preference */
    read_preference?: 'primary' | 'primaryPreferred' | 'secondary' | 'secondaryPreferred' | 'nearest';
    /** Write concern */
    write_concern?: {
      w?: number | 'majority';
      j?: boolean;
      wtimeout?: number;
    };
    /** Performance metrics */
    metrics?: {
      enabled?: boolean;
      sample_interval_ms?: number;
    };
  };
  fallback_chain?: Array<'dragonfly' | 'redis' | 'file' | 'memory' | 'sqlite' | 'mongodb'>;
}

export interface StateBackend {
  name: string;
  capabilities: StateCapabilities;

  connect(): Promise<void>;
  disconnect(): Promise<void>;
  isConnected(): boolean;

  get(key: string): Promise<string | null>;
  set(key: string, value: string, ttlMs?: number): Promise<void>;
  del(key: string): Promise<void>;
  /** Alias for del() for API consistency */
  delete(key: string): Promise<void>;
  keys(pattern: string): Promise<string[]>;

  acquireLock(resource: string, ttlMs: number): Promise<Lock | null>;
  releaseLock(lock: Lock): Promise<void>;
  extendLock(lock: Lock, ttlMs: number): Promise<boolean>;

  subscribe?(channel: string, callback: (message: string) => void): void;
  publish?(channel: string, message: string): Promise<void>;
}

export interface StateCapabilities {
  multiNode: boolean;
  persistent: boolean;
  distributedLocks: boolean;
  pubSub: boolean;
}

export interface Lock {
  resource: string;
  token: string;
  expires: number;
}

// ============================================================================
// Resilience Types
// ============================================================================

export interface ResilienceConfig {
  failover: {
    enabled: boolean;
    detection_time_ms: number;
    recovery_time_ms: number;
  };
  degradation: {
    levels: DegradationLevel[];
    policies: Record<string, DegradationPolicy>;
  };
}

export interface DegradationLevel {
  name: string;
  description: string;
  min_nodes?: number;
  fallback_node?: string;
  actions?: string[];
}

export interface DegradationPolicy {
  action: string;
  retry_count?: number;
  retry_delay_ms?: number;
  then?: string;
  max_retries?: number;
  stale_threshold_ms?: number;
}

// ============================================================================
// Sync Types
// ============================================================================

export interface SyncConfig {
  method: 'rsync' | 'scp' | 'sftp';
  options: {
    compress?: boolean;
    delete?: boolean;
    exclude?: string[];
  };
  artifacts: Record<string, ArtifactSyncConfig>;
}

export interface ArtifactSyncConfig {
  source: string;
  destinations: string[];
}

// ============================================================================
// Monitoring Types
// ============================================================================

export interface MonitoringConfig {
  prometheus?: {
    enabled: boolean;
    port: number;
  };
  alerts?: {
    slack_webhook?: string;
    email?: string[];
  };
  metrics?: string[];
}

export interface MetricsCollector {
  timing(name: string, value: number, tags?: Record<string, string>): void;
  gauge(name: string, value: number, tags?: Record<string, string>): void;
  counter(name: string, value?: number, tags?: Record<string, string>): void;
  increment(name: string, tags?: Record<string, string>): void;
  histogram(name: string, value: number, tags?: Record<string, string>): void;
  getAll(): {
    timings: Record<string, number>;
    gauges: Record<string, number>;
    counters: Record<string, number>;
  };
}

// ============================================================================
// Audit Types
// ============================================================================

export interface AuditConfig {
  enabled: boolean;
  events: {
    builds?: string[];
    assets?: string[];
    config?: string[];
    security?: string[];
  };
  retention: {
    hot_storage: string;
    warm_storage: string;
    cold_storage: string;
  };
  destinations: AuditDestination[];
}

export interface AuditDestination {
  type: 'database' | 'file' | 'siem' | 's3';
  table?: string;
  path?: string;
  rotate?: string;
  url?: string;
  bucket?: string;
  prefix?: string;
}

export interface AuditEvent {
  id: string;
  timestamp: Date;
  event_type: 'build' | 'asset' | 'config' | 'security';
  event_name: string;
  severity: 'info' | 'warning' | 'error' | 'critical';
  actor_type?: string;
  actor_id?: string;
  actor_ip?: string;
  session_id?: string;
  resource_type?: string;
  resource_id?: string;
  resource_name?: string;
  action: string;
  status: 'success' | 'failure' | 'pending';
  details?: Record<string, unknown>;
  duration_ms?: number;
  queue_time_ms?: number;
  build_id?: string;
  node_id?: string;
  request_id?: string;
  error_code?: string;
  error_message?: string;
  stack_trace?: string;
}

// ============================================================================
// Logs Types
// ============================================================================

export interface LogsConfig {
  format: 'json' | 'jsonl' | 'pretty';
  levels: {
    default: LogLevel;
    production?: LogLevel;
    debug?: LogLevel;
  };
  outputs: {
    console?: ConsoleLogOutput;
    file?: FileLogOutput;
    elasticsearch?: ElasticsearchLogOutput;
    cloudwatch?: CloudwatchLogOutput;
  };
  retention: {
    hot: LogRetention;
    warm: LogRetention;
    cold: LogRetention;
    archive?: LogRetention;
  };
  privacy?: {
    redact_patterns?: string[];
    anonymize_ips?: boolean;
    audit_retention?: string;
  };
}

export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'fatal';

export interface ConsoleLogOutput {
  enabled: boolean;
  level?: LogLevel;
  format?: 'pretty' | 'json';
}

export interface FileLogOutput {
  enabled: boolean;
  path: string;
  max_size?: string;
  max_files?: number;
  compress?: boolean;
}

export interface ElasticsearchLogOutput {
  enabled: boolean;
  url: string;
  index: string;
}

export interface CloudwatchLogOutput {
  enabled: boolean;
  group: string;
  stream: string;
}

export interface LogRetention {
  duration: string;
  storage: string;
  compression?: string;
  immutable?: boolean;
}

// ============================================================================
// Utility Types
// ============================================================================

export interface Logger {
  debug(message: string, data?: Record<string, unknown>): void;
  info(message: string, data?: Record<string, unknown>): void;
  warn(message: string, data?: Record<string, unknown>): void;
  error(message: string, data?: Record<string, unknown>): void;
  fatal(message: string, data?: Record<string, unknown>): void;
  child(bindings: Record<string, unknown>): Logger;
}

export interface CacheManager {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, ttlMs?: number): Promise<void>;
  has(key: string): Promise<boolean>;
  delete(key: string): Promise<void>;
  clear(): Promise<void>;
  getStats(): CacheStats;
}

export interface CacheStats {
  hits: number;
  misses: number;
  size: number;
  maxSize: number;
}

// ============================================================================
// Event Types
// ============================================================================

export type BuildNetEvent =
  | { type: 'build:requested'; buildId: string; task: string; triggeredBy: string }
  | { type: 'build:queued'; buildId: string; position: number }
  | { type: 'build:started'; buildId: string; nodeId: string }
  | { type: 'build:progress'; buildId: string; phase: string; progress: number }
  | { type: 'build:completed'; buildId: string; result: BuildResult }
  | { type: 'build:failed'; buildId: string; error: BuildError }
  | { type: 'node:registered'; nodeId: string }
  | { type: 'node:heartbeat'; nodeId: string; load: NodeLoad }
  | { type: 'node:offline'; nodeId: string }
  | { type: 'node:failover'; fromNodeId: string; toNodeId: string; buildId: string }
  | { type: 'bundler:switched'; from: string; to: string }
  | { type: 'plugin:enabled'; name: string }
  | { type: 'plugin:disabled'; name: string }
  | { type: 'config:reloaded' }
  | { type: 'degradation:level_changed'; from: string; to: string };

export type EventHandler<T extends BuildNetEvent> = (event: T) => void | Promise<void>;
