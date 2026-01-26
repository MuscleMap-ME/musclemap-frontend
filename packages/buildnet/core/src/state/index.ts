/**
 * State Backend Manager
 *
 * Manages state backend selection, connection, and fallback.
 * Supports multiple backends:
 * - SQLite (default, high-performance, configurable path)
 * - DragonflyDB (25x faster than Redis, recommended for distributed)
 * - MongoDB (flexible, good for existing MongoDB deployments)
 * - Redis (widely supported)
 * - File-based (simple, persistent)
 * - Memory (volatile, testing)
 */

import type { StateBackend, StateConfig, StateCapabilities, Lock, Logger } from '../types/index.js';
import { DragonflyBackend, type DragonflyConfig } from './dragonfly-backend.js';
import { FileBackend, type FileBackendConfig } from './file-backend.js';
import { MemoryBackend, type MemoryBackendConfig } from './memory-backend.js';
import { SQLiteBackend, type SQLiteBackendConfig } from './sqlite-backend.js';
import { MongoDBBackend, type MongoDBBackendConfig } from './mongodb-backend.js';

// Re-export types from types/index.js for convenience
export type { StateBackend, StateConfig, StateCapabilities, Lock };

export { DragonflyBackend, type DragonflyConfig } from './dragonfly-backend.js';
export { FileBackend, type FileBackendConfig } from './file-backend.js';
export { MemoryBackend, type MemoryBackendConfig } from './memory-backend.js';
export { SQLiteBackend, type SQLiteBackendConfig } from './sqlite-backend.js';
export { MongoDBBackend, type MongoDBBackendConfig } from './mongodb-backend.js';

export {
  BackendMetricsCollector,
  BackendBenchmarker,
  formatBenchmarkResult,
  formatBackendComparison,
  type BackendBenchmarkResult,
  type BackendMetricsSnapshot,
  type BackendComparison,
} from './backend-metrics.js';

/**
 * Extended state config to include all backends.
 */
export interface ExtendedStateConfig extends StateConfig {
  sqlite?: SQLiteBackendConfig;
  mongodb?: MongoDBBackendConfig;
}

/**
 * Create a state backend based on configuration.
 */
/**
 * Create a state backend based on type and configuration.
 * @alias createStateBackend
 */
export function createBackend(
  type: 'dragonfly' | 'redis' | 'file' | 'memory' | 'sqlite' | 'mongodb',
  config: StateConfig | ExtendedStateConfig,
): StateBackend {
  const extConfig = config as ExtendedStateConfig;

  switch (type) {
    case 'sqlite':
      return new SQLiteBackend(extConfig.sqlite ?? {});

    case 'mongodb':
      if (!extConfig.mongodb?.url) {
        throw new Error('MongoDB URL is required');
      }
      return new MongoDBBackend(extConfig.mongodb);

    case 'dragonfly':
    case 'redis':
      // DragonflyDB uses the same config as Redis (wire-compatible)
      const dragonflyConfig = config.dragonfly ?? config.redis;
      if (!dragonflyConfig?.url) {
        throw new Error(`${type} URL is required`);
      }
      return new DragonflyBackend(dragonflyConfig);

    case 'file':
      if (!config.file?.path) {
        throw new Error('File path is required for file backend');
      }
      return new FileBackend(config.file);

    case 'memory':
      return new MemoryBackend(config.memory ?? {});

    default:
      throw new Error(`Unknown backend type: ${type}`);
  }
}

/**
 * Alias for createBackend for backward compatibility.
 */
export const createStateBackend = createBackend;

/**
 * Auto-detect and connect to the best available backend.
 *
 * Priority order (configurable via fallback_chain):
 * 1. SQLite (default, high-performance local storage)
 * 2. DragonflyDB (recommended for distributed, 25x faster than Redis)
 * 3. MongoDB (flexible, good for existing deployments)
 * 4. Redis (widely supported)
 * 5. File-based (persistent but single-node)
 * 6. Memory (volatile, single-process)
 */
export async function autoDetectBackend(
  config: StateConfig | ExtendedStateConfig,
  logger?: Logger,
): Promise<StateBackend> {
  const log = logger ?? createConsoleLogger();
  const extConfig = config as ExtendedStateConfig;

  // If explicit backend specified (not 'auto'), use it directly
  if (config.backend !== 'auto') {
    const backend = createBackend(config.backend as any, config);
    try {
      await backend.connect();
      log.info(`Using ${backend.name} state backend`);
      return backend;
    } catch (error) {
      throw new Error(
        `Failed to connect to specified backend (${config.backend}): ${error instanceof Error ? error.message : error}`,
      );
    }
  }

  // Auto-detect: try backends in order
  // Default chain prioritizes SQLite as high-performance local option
  const fallbackChain = config.fallback_chain ?? ['sqlite', 'dragonfly', 'redis', 'mongodb', 'file', 'memory'];

  for (const backendType of fallbackChain) {
    try {
      // Check if config exists for this backend
      if (backendType === 'sqlite') {
        // SQLite is always available (will use defaults if no config)
        log.debug(`Trying sqlite backend`);
      } else if (backendType === 'mongodb' && !extConfig.mongodb?.url) {
        log.debug(`Skipping mongodb: no URL configured`);
        continue;
      } else if (backendType === 'dragonfly' && !config.dragonfly?.url) {
        log.debug(`Skipping dragonfly: no URL configured`);
        continue;
      } else if (backendType === 'redis' && !config.redis?.url && !config.dragonfly?.url) {
        log.debug(`Skipping redis: no URL configured`);
        continue;
      } else if (backendType === 'file' && !config.file?.path) {
        log.debug(`Skipping file: no path configured`);
        continue;
      }

      const backend = createBackend(backendType as any, config);
      const timeout = getConnectTimeout(backendType, config);

      await Promise.race([
        backend.connect(),
        sleep(timeout).then(() => {
          throw new Error(`${backendType} connection timeout after ${timeout}ms`);
        }),
      ]);

      log.info(`Using ${backend.name} state backend`, { capabilities: backend.capabilities });
      return backend;
    } catch (error) {
      log.warn(`${backendType} unavailable: ${error instanceof Error ? error.message : error}`);
      // Continue to next backend
    }
  }

  // Last resort: memory backend (always works)
  log.warn('All configured backends unavailable, using in-memory backend (data will not persist)');
  const memoryBackend = new MemoryBackend(config.memory ?? {});
  await memoryBackend.connect();
  return memoryBackend;
}

/**
 * Get connection timeout for a backend type.
 */
function getConnectTimeout(type: string, config: StateConfig | ExtendedStateConfig): number {
  const extConfig = config as ExtendedStateConfig;

  switch (type) {
    case 'sqlite':
      return 5000; // File system operations
    case 'mongodb':
      return extConfig.mongodb?.connect_timeout_ms ?? 10000;
    case 'dragonfly':
      return config.dragonfly?.connect_timeout_ms ?? 3000;
    case 'redis':
      return config.redis?.connect_timeout_ms ?? 3000;
    case 'file':
      return 5000;
    case 'memory':
      return 1000;
    default:
      return 3000;
  }
}

/**
 * Sleep utility.
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Create a simple console logger.
 */
function createConsoleLogger(): Logger {
  const createLogFn =
    (level: string) =>
    (message: string, data?: Record<string, unknown>): void => {
      const timestamp = new Date().toISOString();
      const dataStr = data ? ` ${JSON.stringify(data)}` : '';
      console.log(`[${timestamp}] [${level.toUpperCase()}] [state] ${message}${dataStr}`);
    };

  const logger: Logger = {
    debug: createLogFn('debug'),
    info: createLogFn('info'),
    warn: createLogFn('warn'),
    error: createLogFn('error'),
    fatal: createLogFn('fatal'),
    child: () => logger,
  };

  return logger;
}

// ============================================================================
// State Manager Class
// ============================================================================

/**
 * State Manager
 *
 * High-level wrapper around state backends with connection management,
 * health checks, and automatic reconnection.
 */
export class StateManager {
  private backend: StateBackend | null = null;
  private config: StateConfig | null = null;
  private logger: Logger;
  private healthCheckInterval: NodeJS.Timeout | null = null;
  private reconnecting = false;

  /**
   * Create a state manager.
   *
   * @param backendOrConfig - Either a pre-connected StateBackend or a StateConfig for auto-detection
   * @param logger - Optional logger
   */
  constructor(backendOrConfig: StateBackend | StateConfig, logger?: Logger) {
    this.logger = logger ?? createConsoleLogger();

    // Check if it's a StateBackend (has 'name' property and methods)
    if ('name' in backendOrConfig && 'connect' in backendOrConfig) {
      this.backend = backendOrConfig as StateBackend;
      this.config = null;
    } else {
      this.config = backendOrConfig as StateConfig;
    }
  }

  /**
   * Initialize and connect to state backend.
   * Only needed if constructed with a StateConfig (not a pre-connected backend).
   */
  async initialize(): Promise<void> {
    if (!this.backend && this.config) {
      this.backend = await autoDetectBackend(this.config, this.logger);
    }

    // Start health check
    this.healthCheckInterval = setInterval(() => {
      this.healthCheck().catch((error) => {
        this.logger.error('Health check failed', { error: String(error) });
      });
    }, 30000);
  }

  /**
   * Get the underlying backend.
   */
  getBackend(): StateBackend {
    if (!this.backend) {
      throw new Error('State manager not initialized');
    }
    return this.backend;
  }

  /**
   * Perform health check and reconnect if needed.
   */
  private async healthCheck(): Promise<void> {
    if (!this.backend || this.reconnecting) return;

    if (!this.backend.isConnected()) {
      this.logger.warn('Backend disconnected, attempting reconnect...');
      this.reconnecting = true;

      try {
        await this.backend.connect();
        this.logger.info('Backend reconnected successfully');
      } catch (error) {
        this.logger.error('Reconnection failed', { error: String(error) });

        // Try fallback to another backend
        if (this.config) {
          try {
            this.backend = await autoDetectBackend(this.config, this.logger);
          } catch (fallbackError) {
            this.logger.error('Fallback failed', { error: String(fallbackError) });
          }
        }
      } finally {
        this.reconnecting = false;
      }
    }
  }

  /**
   * Shutdown the state manager.
   */
  async shutdown(): Promise<void> {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }

    if (this.backend) {
      await this.backend.disconnect();
      this.backend = null;
    }
  }

  // ============================================================================
  // Convenience methods that delegate to backend
  // ============================================================================

  async get(key: string): Promise<string | null> {
    return this.getBackend().get(key);
  }

  async set(key: string, value: string, ttlMs?: number): Promise<void> {
    return this.getBackend().set(key, value, ttlMs);
  }

  async del(key: string): Promise<void> {
    return this.getBackend().del(key);
  }

  /**
   * Alias for del() for API consistency.
   */
  async delete(key: string): Promise<void> {
    return this.del(key);
  }

  async keys(pattern: string): Promise<string[]> {
    return this.getBackend().keys(pattern);
  }

  async acquireLock(resource: string, ttlMs: number) {
    return this.getBackend().acquireLock(resource, ttlMs);
  }

  async releaseLock(lock: import('../types/index.js').Lock): Promise<void> {
    return this.getBackend().releaseLock(lock);
  }

  subscribe(channel: string, callback: (message: string) => void): void {
    this.getBackend().subscribe?.(channel, callback);
  }

  async publish(channel: string, message: string): Promise<void> {
    return this.getBackend().publish?.(channel, message);
  }

  /**
   * Get current backend info.
   */
  getInfo(): { name: string; connected: boolean; capabilities: import('../types/index.js').StateCapabilities } {
    const backend = this.backend;
    if (!backend) {
      return {
        name: 'none',
        connected: false,
        capabilities: {
          multiNode: false,
          persistent: false,
          distributedLocks: false,
          pubSub: false,
        },
      };
    }
    return {
      name: backend.name,
      connected: backend.isConnected(),
      capabilities: backend.capabilities,
    };
  }
}
