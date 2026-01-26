/**
 * BuildNet Client for TypeScript/JavaScript
 *
 * Provides a client for the BuildNet native daemon via HTTP API.
 * Works with Node.js, Bun, and Deno.
 */

export interface BuildNetConfig {
  /** Host of the BuildNet daemon (default: 127.0.0.1) */
  host?: string;
  /** Port of the BuildNet daemon (default: 9876) */
  port?: number;
  /** Request timeout in milliseconds (default: 600000 = 10 minutes) */
  timeout?: number;
}

export interface HealthResponse {
  status: string;
  version: string;
  uptime_secs: number;
}

export interface StatusResponse {
  status: string;
  version: string;
  project_root: string;
  packages: string[];
  state_stats: StateStats;
}

export interface StateStats {
  total_builds: number;
  cached_builds: number;
  failed_builds: number;
  cached_files: number;
  artifacts: number;
}

export interface CacheStats {
  cache_dir: string;
  total_size: number;
  artifact_count: number;
}

export type BuildStatus =
  | 'pending'
  | 'running'
  | 'completed'
  | 'failed'
  | 'cached'
  | 'skipped';

export type BuildTier =
  | 'INSTANT_SKIP'
  | 'CACHE_RESTORE'
  | 'MICRO_INCREMENTAL'
  | 'SMART_INCREMENTAL'
  | 'FULL_BUILD';

export interface BuildResult {
  package: string;
  tier: BuildTier;
  status: BuildStatus;
  duration_ms: number;
  source_hash: string;
  output_hash: string | null;
  error: string | null;
}

export interface BuildResponse {
  success: boolean;
  results: BuildResult[];
  total_duration_ms: number;
}

export interface BuildState {
  id: string;
  package: string;
  source_hash: string;
  output_hash: string | null;
  status: BuildStatus;
  started_at: string;
  completed_at: string | null;
  duration_ms: number | null;
  error: string | null;
}

export interface BuildEvent {
  event_type: string;
  package: string | null;
  message: string;
  timestamp: string;
}

/**
 * BuildNet Client
 *
 * @example
 * ```typescript
 * import { BuildNetClient } from '@musclemap.me/buildnet-client';
 *
 * const client = new BuildNetClient({ port: 9876 });
 *
 * // Check if daemon is running
 * const health = await client.health();
 * console.log(`BuildNet ${health.version} is running`);
 *
 * // Build all packages
 * const result = await client.buildAll();
 * console.log(`Built ${result.results.length} packages in ${result.total_duration_ms}ms`);
 *
 * // Subscribe to build events
 * for await (const event of client.events()) {
 *   console.log(`[${event.event_type}] ${event.message}`);
 * }
 * ```
 */
export class BuildNetClient {
  private baseUrl: string;
  private timeout: number;

  constructor(config: BuildNetConfig = {}) {
    const host = config.host ?? '127.0.0.1';
    const port = config.port ?? 9876;
    this.baseUrl = `http://${host}:${port}`;
    this.timeout = config.timeout ?? 600000;
  }

  /**
   * Check daemon health
   */
  async health(): Promise<HealthResponse> {
    return this.request<HealthResponse>('GET', '/health');
  }

  /**
   * Get daemon status
   */
  async status(): Promise<StatusResponse> {
    return this.request<StatusResponse>('GET', '/status');
  }

  /**
   * Get state statistics
   */
  async stats(): Promise<StateStats> {
    return this.request<StateStats>('GET', '/stats');
  }

  /**
   * Build all packages
   */
  async buildAll(options?: { force?: boolean }): Promise<BuildResponse> {
    return this.request<BuildResponse>('POST', '/build', options ?? {});
  }

  /**
   * Build a specific package
   */
  async buildPackage(
    packageName: string,
    options?: { force?: boolean }
  ): Promise<BuildResult> {
    return this.request<BuildResult>(
      'POST',
      `/build/${packageName}`,
      options ?? {}
    );
  }

  /**
   * List recent builds
   */
  async listBuilds(): Promise<BuildState[]> {
    return this.request<BuildState[]>('GET', '/builds');
  }

  /**
   * Get a specific build
   */
  async getBuild(id: string): Promise<BuildState> {
    return this.request<BuildState>('GET', `/builds/${id}`);
  }

  /**
   * Get cache statistics
   */
  async cacheStats(): Promise<CacheStats> {
    return this.request<CacheStats>('GET', '/cache/stats');
  }

  /**
   * Clear cache
   */
  async clearCache(options?: { max_size_mb?: number }): Promise<{ removed: number }> {
    return this.request<{ removed: number }>('POST', '/cache/clear', options ?? {});
  }

  /**
   * Get current configuration
   */
  async getConfig(): Promise<Record<string, unknown>> {
    return this.request<Record<string, unknown>>('GET', '/config');
  }

  /**
   * Shut down the daemon
   */
  async shutdown(): Promise<{ status: string }> {
    return this.request<{ status: string }>('POST', '/shutdown');
  }

  /**
   * Subscribe to build events via SSE
   *
   * @example
   * ```typescript
   * for await (const event of client.events()) {
   *   console.log(`[${event.event_type}] ${event.message}`);
   * }
   * ```
   */
  async *events(): AsyncGenerator<BuildEvent> {
    const response = await fetch(`${this.baseUrl}/events`, {
      headers: {
        Accept: 'text/event-stream',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('No response body');
    }

    const decoder = new TextDecoder();
    let buffer = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          if (line.startsWith('data:')) {
            try {
              const data = JSON.parse(line.slice(5).trim());
              yield data as BuildEvent;
            } catch {
              // Ignore parse errors
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }

  /**
   * Check if daemon is running
   */
  async isRunning(): Promise<boolean> {
    try {
      await this.health();
      return true;
    } catch {
      return false;
    }
  }

  private async request<T>(
    method: 'GET' | 'POST',
    path: string,
    body?: unknown
  ): Promise<T> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(`${this.baseUrl}${path}`, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(
          error.error || `HTTP ${response.status}: ${response.statusText}`
        );
      }

      return response.json();
    } finally {
      clearTimeout(timeoutId);
    }
  }
}

/**
 * Create a BuildNet client with default configuration
 */
export function createClient(config?: BuildNetConfig): BuildNetClient {
  return new BuildNetClient(config);
}

export default BuildNetClient;
