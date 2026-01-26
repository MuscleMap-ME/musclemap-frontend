/**
 * BuildNet Types
 *
 * Type definitions for the BuildNet build orchestration system.
 */

/** Build tier for intelligent caching */
export enum BuildTier {
  /** No changes, skip entirely */
  InstantSkip = 0,
  /** Restore from cache */
  CacheRestore = 1,
  /** Small change, quick incremental */
  MicroIncremental = 2,
  /** Moderate changes */
  SmartIncremental = 3,
  /** Full rebuild needed */
  FullBuild = 4,
}

/** Build status */
export type BuildStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cached';

/** Build result for a single package */
export interface BuildResult {
  /** Package name */
  package: string;
  /** Build tier used */
  tier: keyof typeof BuildTier;
  /** Final status */
  status: BuildStatus;
  /** Duration in milliseconds */
  duration_ms: number;
  /** Source files hash */
  source_hash: string;
  /** Output files hash (if cached) */
  output_hash: string | null;
  /** Error message (if failed) */
  error: string | null;
}

/** Build response from build_all */
export interface BuildResponse {
  /** Whether all builds succeeded */
  success: boolean;
  /** Individual build results */
  results: BuildResult[];
  /** Total duration in milliseconds */
  total_duration_ms: number;
}

/** Health check response */
export interface HealthResponse {
  /** Status ("ok") */
  status: string;
  /** BuildNet version */
  version: string;
  /** Uptime in seconds */
  uptime_secs: number;
}

/** Status response */
export interface StatusResponse {
  /** Status ("running") */
  status: string;
  /** BuildNet version */
  version: string;
  /** Project root path */
  project_root: string;
  /** List of package names */
  packages: string[];
  /** State statistics */
  state_stats: StateStats;
}

/** State statistics */
export interface StateStats {
  /** Total number of builds */
  total_builds: number;
  /** Number of cached builds */
  cached_builds: number;
  /** Number of failed builds */
  failed_builds: number;
  /** Number of cached files */
  cached_files: number;
  /** Number of artifacts */
  artifacts: number;
}

/** Cache statistics */
export interface CacheStats {
  /** Total size in bytes */
  total_size: number;
  /** Number of artifacts */
  artifact_count: number;
  /** Oldest artifact timestamp */
  oldest_artifact: string | null;
  /** Newest artifact timestamp */
  newest_artifact: string | null;
}

/** Build state record */
export interface BuildState {
  /** Build ID */
  id: string;
  /** Package name */
  package: string;
  /** Source hash */
  source_hash: string;
  /** Output hash (if completed) */
  output_hash: string | null;
  /** Build status */
  status: BuildStatus;
  /** Start timestamp */
  started_at: string;
  /** Completion timestamp */
  completed_at: string | null;
  /** Duration in milliseconds */
  duration_ms: number | null;
  /** Error message (if failed) */
  error: string | null;
}

/** Package configuration */
export interface PackageConfig {
  /** Package name */
  name: string;
  /** Path relative to project root */
  path: string;
  /** Build command */
  build_cmd: string;
  /** Dependencies (other package names) */
  dependencies: string[];
  /** Source patterns to watch */
  sources: string[];
  /** Output directory */
  output_dir: string;
}

/** BuildNet configuration */
export interface Config {
  /** Project root path */
  project_root: string;
  /** State database path */
  db_path: string;
  /** Cache directory path */
  cache_path: string;
  /** HTTP server port */
  http_port: number;
  /** Unix socket path */
  socket_path: string;
  /** Maximum concurrent builds */
  max_concurrent_builds: number;
  /** Watch debounce interval in ms */
  watch_debounce_ms: number;
  /** Build timeout in seconds */
  build_timeout_secs: number;
  /** Verbose logging */
  verbose: boolean;
  /** Package configurations */
  packages: PackageConfig[];
}

/** Build event for SSE streaming */
export interface BuildEvent {
  /** Event type */
  event_type: 'build_start' | 'build_complete' | 'build_error' | 'package_start' | 'package_complete';
  /** Package name (if applicable) */
  package: string | null;
  /** Event message */
  message: string;
  /** Timestamp */
  timestamp: string;
}

/** Client options */
export interface BuildNetClientOptions {
  /** Base URL for the BuildNet API */
  baseUrl: string;
  /** Request timeout in milliseconds */
  timeout?: number;
  /** Custom fetch implementation */
  fetch?: typeof fetch;
  /** Authentication token */
  token?: string;
}

/** Build options */
export interface BuildOptions {
  /** Force rebuild even if cached */
  force?: boolean;
}

/** Cache clear options */
export interface CacheClearOptions {
  /** Maximum cache size in MB (clears oldest until under this size) */
  max_size_mb?: number;
}

/** Cache clear response */
export interface CacheClearResponse {
  /** Number of artifacts removed */
  removed: number;
}
