/**
 * BuildNet Daemon Types
 *
 * Core type definitions for the distributed build daemon system.
 */

// ============================================================================
// Identity & Actor Types
// ============================================================================

export interface ActorIdentity {
  id: string;
  name: string;
  type: 'user' | 'agent' | 'service' | 'system';
  metadata: {
    email?: string;
    team?: string;
    agent_version?: string;
    service_name?: string;
    hostname?: string;
  };
}

export const SYSTEM_ACTOR: ActorIdentity = {
  id: 'system',
  name: 'BuildNet System',
  type: 'system',
  metadata: {},
};

// ============================================================================
// Configuration Types
// ============================================================================

export interface MasterDaemonConfig {
  daemon_id: string;
  cluster_name: string;

  watch: WatchConfig;
  auto_build: AutoBuildConfig;
  workers: WorkerPoolConfig;
  resources: ResourceLimitsConfig;
  network: NetworkConfig;
  audit: AuditConfig;
}

export interface WatchConfig {
  directories: string[];
  include_patterns: string[];
  exclude_patterns: string[];
  scan_interval_ms: number;
  debounce_ms: number;
  preemptive_prepare: boolean;
}

export interface AutoBuildConfig {
  enabled: boolean;
  delay_ms: number;
  max_concurrent_builds: number;
  priority_paths: string[];
}

export interface WorkerPoolConfig {
  min_workers: number;
  max_workers: number;
  worker_timeout_ms: number;
  heartbeat_interval_ms: number;
  redundancy_factor: number;
}

export interface ResourceLimitsConfig {
  cpu_allocation: 'fair' | 'priority' | 'adaptive';
  memory_limit_mb: number;
  disk_cache_limit_mb: number;
}

export interface NetworkConfig {
  bind_address: string;
  advertise_address: string;
  tls: TLSConfig | null;
}

export interface TLSConfig {
  enabled: boolean;
  cert_file: string;
  key_file: string;
  ca_file?: string;
}

export interface AuditConfig {
  ledger_backend: 'dragonfly' | 'file' | 'hybrid';
  log_level: 'debug' | 'info' | 'warn' | 'error';
  retention_days: number;
  real_time_streaming: boolean;
}

// ============================================================================
// Ledger Types (Double-Entry)
// ============================================================================

export type LedgerEntryType = 'DEBIT' | 'CREDIT';

export enum LedgerAccountType {
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

export interface LedgerEntry {
  entry_id: string;
  transaction_id: string;
  sequence_number: bigint;

  entry_type: LedgerEntryType;
  account_type: LedgerAccountType;

  entity_type: string;
  entity_id: string;

  previous_state: unknown;
  new_state: unknown;
  delta: unknown;

  timestamp: Date;
  actor: ActorIdentity;
  reason: string;
  correlation_id: string;

  checksum: string;
  previous_checksum: string;
  signature?: string;
}

export interface LedgerTransaction {
  transaction_id: string;
  entries: LedgerEntry[];
  timestamp: Date;
  actor: ActorIdentity;
  reason: string;
}

export interface IntegrityError {
  sequence: bigint;
  type: 'CHAIN_BREAK' | 'CHECKSUM_MISMATCH' | 'MISSING_ENTRY';
  expected: string;
  actual: string;
}

export interface IntegrityReport {
  verified: boolean;
  entries_checked: number;
  errors: IntegrityError[];
  last_verified_sequence: bigint;
}

// ============================================================================
// Resource Types
// ============================================================================

export interface ResourceDefinition {
  name: string;
  type: 'worker' | 'storage' | 'cache';
  address: string;
  cpu_cores?: number;
  memory_gb?: number;
  capabilities?: ResourceCapabilities;
  labels?: Record<string, string>;
}

export interface ResourceCapabilities {
  bundlers: ('vite' | 'rspack' | 'esbuild')[];
  node_version: string;
  native_modules: boolean;
  docker_available: boolean;
}

export interface Resource extends ResourceDefinition {
  id: string;
  status: ResourceStatus;
  added_at: Date;
  added_by: ActorIdentity;
  updated_at?: Date;
  health_history: HealthCheckResult[];
}

export type ResourceStatus = 'online' | 'offline' | 'draining' | 'unhealthy' | 'unknown';

export interface HealthCheckResult {
  timestamp: Date;
  healthy: boolean;
  latency_ms: number;
  reason?: string;
  details?: Record<string, unknown>;
}

// ============================================================================
// Worker Types
// ============================================================================

export interface WorkerState {
  worker_id: string;
  resource_id: string;
  status: 'idle' | 'busy' | 'draining' | 'offline';
  current_task: string | null;
  load_percentage: number;
  last_heartbeat: Date;
  available_slots: number;
  specializations: string[];
}

export interface WorkerCapabilities {
  worker_id: string;
  worker_type: 'general' | 'typescript' | 'bundler' | 'assets' | 'tests';
  resources: {
    cpu_cores: number;
    memory_mb: number;
    disk_speed: 'ssd' | 'hdd' | 'nvme';
    network_bandwidth_mbps: number;
  };
  capabilities: ResourceCapabilities;
  state: WorkerState;
  performance: WorkerPerformance;
}

export interface WorkerPerformance {
  avg_build_time_ms: number;
  success_rate: number;
  total_builds: number;
  specializations: string[];
}

// ============================================================================
// Session Types
// ============================================================================

export interface Session {
  session_id: string;
  actor: ActorIdentity;
  actor_type: 'user' | 'agent' | 'service' | 'system';

  connected_at: Date;
  last_activity: Date;
  connection_type: 'cli' | 'web' | 'api' | 'grpc' | 'websocket';
  client_info: ClientInfo;

  permissions: Permission[];
  scopes: string[];

  current_activity: ActivityState | null;
  activity_history: ActivityEvent[];
  claimed_resources: string[];
}

export interface ClientInfo {
  ip_address: string;
  user_agent: string;
  hostname: string;
}

export interface Permission {
  resource: string;
  actions: string[];
  conditions?: Record<string, unknown>;
}

// ============================================================================
// Activity Types
// ============================================================================

export interface ActivityState {
  activity_id: string;
  activity_type: 'building' | 'configuring' | 'monitoring' | 'debugging' | 'idle';
  started_at: Date;

  targets: string[];
  resources: string[];

  progress: ActivityProgress;
  logs: LogEntry[];
  artifacts: string[];
}

export interface ActivityProgress {
  current_step: string;
  steps_completed: number;
  total_steps: number;
  percentage: number;
}

export interface ActivityEvent {
  event_id: string;
  activity_id: string;
  event_type: string;
  timestamp: Date;
  data: unknown;
}

export interface LogEntry {
  timestamp: Date;
  level: 'debug' | 'info' | 'warn' | 'error';
  message: string;
  metadata?: Record<string, unknown>;
}

// ============================================================================
// Build Types
// ============================================================================

export interface BuildRequest {
  request_id: string;
  actor: ActorIdentity;
  targets: string[];
  options: BuildOptions;
  priority: number;
  created_at: Date;
}

export interface BuildOptions {
  incremental: boolean;
  watch: boolean;
  clean: boolean;
  verbose: boolean;
  bundler?: 'vite' | 'rspack' | 'esbuild';
}

export interface MicroBundle {
  id: string;
  package: string;
  entry: string;
  chunk: ChunkInfo;
  dependencies: string[];
  estimated_size_kb: number;
  estimated_time_ms: number;
  priority: number;
}

export interface ChunkInfo {
  id: string;
  files: string[];
  is_entry: boolean;
  is_on_critical_path: boolean;
}

export interface BuildScore {
  id: string;
  bundles: MicroBundle[];
  assignments: PartAssignment[];
  dependency_graph: Map<string, string[]>;
  critical_path: string[];
  estimated_total_time_ms: number;
}

export interface PartAssignment {
  bundle: MicroBundle;
  worker_id: string;
  dependencies: string[];
  estimated_start: Date;
  estimated_duration_ms: number;
}

export interface BuildResult {
  build_id: string;
  request_id: string;
  status: 'success' | 'failed' | 'cancelled';
  started_at: Date;
  completed_at: Date;
  duration_ms: number;
  bundles_completed: number;
  bundles_failed: number;
  artifacts: string[];
  errors: BuildError[];
}

export interface BuildError {
  bundle_id: string;
  error_type: string;
  message: string;
  stack?: string;
  file?: string;
  line?: number;
  column?: number;
}

// ============================================================================
// Dashboard Types
// ============================================================================

export interface DashboardState {
  cluster: ClusterStatus;
  resources: ResourceSummary;
  builds: BuildSummary;
  sessions: SessionSummary;
  events: EventSummary;
  metrics: MetricsSummary;
}

export interface ClusterStatus {
  name: string;
  status: 'healthy' | 'degraded' | 'critical';
  uptime_seconds: number;
  version: string;
  master_id: string;
}

export interface ResourceSummary {
  total_workers: number;
  active_workers: number;
  idle_workers: number;
  draining_workers: number;
  offline_workers: number;
  total_cpu_cores: number;
  used_cpu_cores: number;
  total_memory_gb: number;
  used_memory_gb: number;
}

export interface BuildSummary {
  queued: number;
  in_progress: number;
  completed_last_hour: number;
  failed_last_hour: number;
  avg_build_time_ms: number;
}

export interface SessionSummary {
  users: SessionInfo[];
  agents: SessionInfo[];
  services: SessionInfo[];
}

export interface SessionInfo {
  session_id: string;
  actor_name: string;
  actor_type: string;
  connected_since: Date;
  current_activity: string | null;
  resources_claimed: number;
}

export interface EventSummary {
  recent: DaemonEvent[];
  alerts: Alert[];
}

export interface DaemonEvent {
  event_id: string;
  event_type: string;
  timestamp: Date;
  actor: ActorIdentity;
  message: string;
  severity: 'info' | 'warn' | 'error' | 'critical';
  metadata?: Record<string, unknown>;
}

export interface Alert {
  alert_id: string;
  alert_type: string;
  severity: 'warn' | 'error' | 'critical';
  message: string;
  created_at: Date;
  acknowledged: boolean;
  acknowledged_by?: ActorIdentity;
}

export interface MetricsSummary {
  builds_per_minute: number;
  avg_queue_time_ms: number;
  cache_hit_rate: number;
  error_rate: number;
}

// ============================================================================
// File Watcher Types
// ============================================================================

export interface FileChangeEvent {
  path: string;
  type: 'add' | 'change' | 'unlink';
  timestamp: Date;
  size?: number;
}

export enum ChangeImpact {
  FULL_REBUILD = 'full_rebuild',
  PACKAGE_REBUILD = 'package_rebuild',
  INCREMENTAL = 'incremental',
  ASSET_ONLY = 'asset_only',
  IGNORED = 'ignored',
}

export interface PreparationResult {
  affected_packages: string[];
  suggested_workers: number;
  cache_warmups: string[];
  estimated_build_time_ms: number;
  impact: ChangeImpact;
}

// ============================================================================
// Gossip Protocol Types
// ============================================================================

export interface GossipMessage {
  message_id: string;
  type: GossipMessageType;
  sender_id: string;
  timestamp: Date;
  ttl: number;
  payload: unknown;
}

export type GossipMessageType =
  | 'WORKER_STATE'
  | 'WORK_CLAIMED'
  | 'WORK_COMPLETED'
  | 'WORK_FAILED'
  | 'HEARTBEAT'
  | 'RESOURCE_ADDED'
  | 'RESOURCE_REMOVED';

// ============================================================================
// Verification Types
// ============================================================================

export interface VerificationResult {
  verified: boolean;
  method: 'full' | 'partial' | 'skipped';
  reason?: string;
  checks?: VerificationCheck[];
  failed_checks?: VerificationCheck[];
}

export interface VerificationCheck {
  check: string;
  passed: boolean;
  details?: string;
}

// ============================================================================
// API Types
// ============================================================================

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: ApiError;
  metadata?: {
    timestamp: Date;
    request_id: string;
    duration_ms: number;
  };
}

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

// ============================================================================
// Event Emitter Types
// ============================================================================

export interface DaemonEvents {
  'build:started': BuildRequest;
  'build:completed': BuildResult;
  'build:failed': BuildResult;
  'worker:added': WorkerState;
  'worker:removed': string;
  'worker:heartbeat': WorkerState;
  'session:created': Session;
  'session:ended': string;
  'activity:started': ActivityState;
  'activity:progress': ActivityProgress;
  'activity:completed': ActivityState;
  'resource:added': Resource;
  'resource:removed': string;
  'resource:updated': Resource;
  'ledger:transaction': LedgerTransaction;
  'alert:created': Alert;
  'file:changed': FileChangeEvent;
}
