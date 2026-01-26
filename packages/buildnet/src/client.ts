/**
 * BuildNet HTTP Client
 *
 * TypeScript client for interacting with the BuildNet daemon via HTTP API.
 */

import type {
  BuildNetClientOptions,
  BuildOptions,
  BuildResponse,
  BuildResult,
  BuildState,
  CacheClearOptions,
  CacheClearResponse,
  CacheStats,
  Config,
  HealthResponse,
  StatusResponse,
  BuildEvent,
} from './types';

/** Default client options */
const DEFAULT_OPTIONS: Partial<BuildNetClientOptions> = {
  timeout: 300000, // 5 minutes for builds
};

/**
 * BuildNet HTTP Client
 *
 * @example
 * ```typescript
 * import { BuildNetClient } from '@musclemap.me/buildnet';
 *
 * const client = new BuildNetClient({ baseUrl: 'http://localhost:9876' });
 *
 * // Check health
 * const health = await client.health();
 * console.log(`BuildNet v${health.version} - uptime: ${health.uptime_secs}s`);
 *
 * // Trigger a build
 * const result = await client.buildAll();
 * console.log(`Build ${result.success ? 'succeeded' : 'failed'} in ${result.total_duration_ms}ms`);
 *
 * // Stream build events
 * for await (const event of client.events()) {
 *   console.log(`[${event.event_type}] ${event.message}`);
 * }
 * ```
 */
export class BuildNetClient {
  private readonly baseUrl: string;
  private readonly timeout: number;
  private readonly fetchFn: typeof fetch;
  private readonly token?: string;

  constructor(options: BuildNetClientOptions) {
    const opts = { ...DEFAULT_OPTIONS, ...options };
    this.baseUrl = opts.baseUrl.replace(/\/$/, ''); // Remove trailing slash
    this.timeout = opts.timeout ?? 300000;
    this.fetchFn = opts.fetch ?? globalThis.fetch;
    this.token = opts.token;
  }

  /**
   * Make an HTTP request to the BuildNet API
   */
  private async request<T>(
    method: 'GET' | 'POST',
    path: string,
    body?: unknown
  ): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await this.fetchFn(url, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });

      if (!response.ok) {
        const errorBody = await response.json().catch(() => ({ error: response.statusText })) as { error?: string };
        throw new BuildNetError(
          errorBody.error || `HTTP ${response.status}`,
          response.status
        );
      }

      return await response.json() as T;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  // ============================================================================
  // Health & Status
  // ============================================================================

  /**
   * Check if the BuildNet daemon is healthy
   */
  async health(): Promise<HealthResponse> {
    return this.request('GET', '/health');
  }

  /**
   * Get detailed status including packages and stats
   */
  async status(): Promise<StatusResponse> {
    return this.request('GET', '/status');
  }

  /**
   * Get state statistics
   */
  async stats(): Promise<StatusResponse['state_stats']> {
    return this.request('GET', '/stats');
  }

  // ============================================================================
  // Build Operations
  // ============================================================================

  /**
   * Build all packages in dependency order
   */
  async buildAll(options: BuildOptions = {}): Promise<BuildResponse> {
    return this.request('POST', '/build', options);
  }

  /**
   * Build a single package
   */
  async buildPackage(
    packageName: string,
    options: BuildOptions = {}
  ): Promise<BuildResult> {
    return this.request('POST', `/build/${encodeURIComponent(packageName)}`, options);
  }

  // ============================================================================
  // Build History
  // ============================================================================

  /**
   * List recent builds
   */
  async listBuilds(): Promise<BuildState[]> {
    return this.request('GET', '/builds');
  }

  /**
   * Get a specific build by ID
   */
  async getBuild(id: string): Promise<BuildState> {
    return this.request('GET', `/builds/${encodeURIComponent(id)}`);
  }

  // ============================================================================
  // Cache Operations
  // ============================================================================

  /**
   * Get cache statistics
   */
  async cacheStats(): Promise<CacheStats> {
    return this.request('GET', '/cache/stats');
  }

  /**
   * Clear the cache
   */
  async cacheClear(options: CacheClearOptions = {}): Promise<CacheClearResponse> {
    return this.request('POST', '/cache/clear', options);
  }

  // ============================================================================
  // Configuration
  // ============================================================================

  /**
   * Get the current configuration
   */
  async getConfig(): Promise<Config> {
    return this.request('GET', '/config');
  }

  // ============================================================================
  // Events (SSE)
  // ============================================================================

  /**
   * Stream build events using Server-Sent Events
   *
   * @example
   * ```typescript
   * for await (const event of client.events()) {
   *   console.log(`[${event.event_type}] ${event.message}`);
   *   if (event.event_type === 'build_complete') break;
   * }
   * ```
   */
  async *events(): AsyncGenerator<BuildEvent, void, unknown> {
    const url = `${this.baseUrl}/events`;
    const headers: Record<string, string> = {};

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const response = await this.fetchFn(url, { headers });

    if (!response.ok) {
      throw new BuildNetError(`Failed to connect to events stream`, response.status);
    }

    if (!response.body) {
      throw new BuildNetError('Response body is null', 500);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              yield data as BuildEvent;
            } catch {
              // Skip malformed JSON
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }

  // ============================================================================
  // Shutdown
  // ============================================================================

  /**
   * Request daemon shutdown (use with caution!)
   */
  async shutdown(): Promise<{ status: string }> {
    return this.request('POST', '/shutdown');
  }
}

/**
 * BuildNet API Error
 */
export class BuildNetError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number
  ) {
    super(message);
    this.name = 'BuildNetError';
  }
}
