/**
 * Redis Cluster Client
 *
 * Enhanced Redis client with:
 * - Cluster mode support
 * - Connection pooling
 * - Health checks
 * - Required in production (no optional flag)
 * - Automatic reconnection
 */

import Redis, { Cluster, ClusterOptions, RedisOptions } from 'ioredis';
import { config } from '../config';
import { loggers } from './logger';

const log = loggers.core;

// ============================================
// TYPES
// ============================================

export interface RedisClientConfig {
  /**
   * Redis URL or cluster nodes.
   */
  url?: string;
  clusterNodes?: string[];

  /**
   * Connection pool size for cluster mode.
   */
  poolSize?: number;

  /**
   * Enable TLS.
   */
  tls?: boolean;

  /**
   * Key prefix for all operations.
   */
  keyPrefix?: string;

  /**
   * Connection timeout in ms.
   */
  connectTimeout?: number;

  /**
   * Command timeout in ms.
   */
  commandTimeout?: number;

  /**
   * Max retries per request.
   */
  maxRetriesPerRequest?: number;

  /**
   * Health check interval in ms.
   */
  healthCheckInterval?: number;
}

export interface HealthCheckResult {
  status: 'healthy' | 'degraded' | 'unhealthy';
  latencyMs: number;
  connectedNodes?: number;
  totalNodes?: number;
  lastError?: string;
}

// ============================================
// REDIS CLIENT MANAGER
// ============================================

class RedisClientManager {
  private mainClient: Redis | Cluster | null = null;
  private subscriberClient: Redis | Cluster | null = null;
  private publisherClient: Redis | Cluster | null = null;
  private healthCheckTimer: NodeJS.Timeout | null = null;
  private lastHealthCheck: HealthCheckResult | null = null;
  private config: RedisClientConfig;
  private isClusterMode: boolean = false;

  constructor(clientConfig?: RedisClientConfig) {
    this.config = {
      url: clientConfig?.url || config.REDIS_URL,
      poolSize: clientConfig?.poolSize || 10,
      connectTimeout: clientConfig?.connectTimeout || 10000,
      commandTimeout: clientConfig?.commandTimeout || 5000,
      maxRetriesPerRequest: clientConfig?.maxRetriesPerRequest || 3,
      healthCheckInterval: clientConfig?.healthCheckInterval || 30000,
      keyPrefix: clientConfig?.keyPrefix || 'mm:',
      ...clientConfig,
    };

    this.isClusterMode = !!(this.config.clusterNodes && this.config.clusterNodes.length > 0);
  }

  /**
   * Initialize all Redis connections.
   */
  async initialize(): Promise<void> {
    log.info({ clusterMode: this.isClusterMode }, 'Initializing Redis client');

    try {
      this.mainClient = this.createClient('main');
      this.subscriberClient = this.createClient('subscriber');
      this.publisherClient = this.createClient('publisher');

      // Wait for all clients to be ready
      await Promise.all([
        this.waitForReady(this.mainClient, 'main'),
        this.waitForReady(this.subscriberClient, 'subscriber'),
        this.waitForReady(this.publisherClient, 'publisher'),
      ]);

      // Start health check
      this.startHealthCheck();

      log.info('Redis clients initialized successfully');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      log.error({ error: message }, 'Failed to initialize Redis');
      throw new Error(`Redis initialization failed: ${message}`);
    }
  }

  /**
   * Create a Redis client (single or cluster).
   */
  private createClient(name: string): Redis | Cluster {
    const baseOptions: RedisOptions = {
      maxRetriesPerRequest: this.config.maxRetriesPerRequest,
      connectTimeout: this.config.connectTimeout,
      commandTimeout: this.config.commandTimeout,
      keyPrefix: this.config.keyPrefix,
      enableReadyCheck: true,
      lazyConnect: false,
      retryStrategy: (times) => {
        if (times > 10) {
          log.error({ client: name, attempts: times }, 'Redis max retries exceeded');
          return null; // Stop retrying
        }
        const delay = Math.min(times * 100, 3000);
        return delay;
      },
    };

    let client: Redis | Cluster;

    if (this.isClusterMode && this.config.clusterNodes) {
      const clusterOptions: ClusterOptions = {
        clusterRetryStrategy: (times) => {
          if (times > 10) return null;
          return Math.min(times * 100, 3000);
        },
        redisOptions: baseOptions,
        scaleReads: 'slave', // Read from replicas when possible
        natMap: undefined, // For NAT environments
      };

      const nodes = this.config.clusterNodes.map((node) => {
        const [host, port] = node.split(':');
        return { host, port: parseInt(port, 10) || 6379 };
      });

      client = new Redis.Cluster(nodes, clusterOptions);
    } else {
      client = new Redis(this.config.url!, baseOptions);
    }

    // Set up event handlers
    this.setupEventHandlers(client, name);

    return client;
  }

  /**
   * Set up event handlers for a client.
   */
  private setupEventHandlers(client: Redis | Cluster, name: string): void {
    client.on('connect', () => {
      log.debug({ client: name }, 'Redis connecting');
    });

    client.on('ready', () => {
      log.info({ client: name }, 'Redis ready');
    });

    client.on('error', (err) => {
      log.error({ client: name, error: err.message }, 'Redis error');
    });

    client.on('close', () => {
      log.warn({ client: name }, 'Redis connection closed');
    });

    client.on('reconnecting', () => {
      log.info({ client: name }, 'Redis reconnecting');
    });

    if (client instanceof Cluster) {
      client.on('node error', (err, address) => {
        log.error({ client: name, address, error: err.message }, 'Redis cluster node error');
      });
    }
  }

  /**
   * Wait for a client to be ready.
   */
  private waitForReady(client: Redis | Cluster, name: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error(`${name} client connection timeout`));
      }, this.config.connectTimeout!);

      if (client.status === 'ready') {
        clearTimeout(timeout);
        resolve();
        return;
      }

      client.once('ready', () => {
        clearTimeout(timeout);
        resolve();
      });

      client.once('error', (err) => {
        clearTimeout(timeout);
        reject(err);
      });
    });
  }

  /**
   * Start periodic health checks.
   */
  private startHealthCheck(): void {
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
    }

    this.healthCheckTimer = setInterval(async () => {
      this.lastHealthCheck = await this.performHealthCheck();
    }, this.config.healthCheckInterval!);

    // Run initial health check
    this.performHealthCheck().then((result) => {
      this.lastHealthCheck = result;
    });
  }

  /**
   * Perform a health check.
   */
  async performHealthCheck(): Promise<HealthCheckResult> {
    if (!this.mainClient) {
      return {
        status: 'unhealthy',
        latencyMs: -1,
        lastError: 'Client not initialized',
      };
    }

    try {
      const start = Date.now();
      await this.mainClient.ping();
      const latencyMs = Date.now() - start;

      let connectedNodes: number | undefined;
      let totalNodes: number | undefined;

      if (this.mainClient instanceof Cluster) {
        const nodes = this.mainClient.nodes('all');
        totalNodes = nodes.length;
        connectedNodes = nodes.filter((n) => n.status === 'ready').length;
      }

      const status = latencyMs < 100 ? 'healthy' : latencyMs < 500 ? 'degraded' : 'unhealthy';

      return {
        status,
        latencyMs,
        connectedNodes,
        totalNodes,
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        latencyMs: -1,
        lastError: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Get the main Redis client.
   */
  getClient(): Redis | Cluster {
    if (!this.mainClient) {
      throw new Error('Redis client not initialized. Call initialize() first.');
    }
    return this.mainClient;
  }

  /**
   * Get the subscriber client (for Pub/Sub).
   */
  getSubscriber(): Redis | Cluster {
    if (!this.subscriberClient) {
      throw new Error('Redis subscriber not initialized. Call initialize() first.');
    }
    return this.subscriberClient;
  }

  /**
   * Get the publisher client.
   */
  getPublisher(): Redis | Cluster {
    if (!this.publisherClient) {
      throw new Error('Redis publisher not initialized. Call initialize() first.');
    }
    return this.publisherClient;
  }

  /**
   * Get the last health check result.
   */
  getHealth(): HealthCheckResult | null {
    return this.lastHealthCheck;
  }

  /**
   * Check if Redis is available and healthy.
   */
  isHealthy(): boolean {
    return this.lastHealthCheck?.status === 'healthy' || this.lastHealthCheck?.status === 'degraded';
  }

  /**
   * Gracefully close all connections.
   */
  async close(): Promise<void> {
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
      this.healthCheckTimer = null;
    }

    const clients = [this.mainClient, this.subscriberClient, this.publisherClient].filter(
      Boolean
    ) as (Redis | Cluster)[];

    await Promise.all(
      clients.map((client) =>
        client.quit().catch((err) => {
          log.error({ error: err.message }, 'Error closing Redis client');
        })
      )
    );

    this.mainClient = null;
    this.subscriberClient = null;
    this.publisherClient = null;
    this.lastHealthCheck = null;

    log.info('All Redis connections closed');
  }
}

// ============================================
// SINGLETON INSTANCE
// ============================================

let manager: RedisClientManager | null = null;

/**
 * Get or create the Redis client manager.
 */
export function getRedisManager(clientConfig?: RedisClientConfig): RedisClientManager {
  if (!manager) {
    manager = new RedisClientManager(clientConfig);
  }
  return manager;
}

/**
 * Initialize Redis (call once at startup).
 */
export async function initializeRedis(clientConfig?: RedisClientConfig): Promise<void> {
  const mgr = getRedisManager(clientConfig);
  await mgr.initialize();
}

/**
 * Get the main Redis client.
 */
export function getRedisClient(): Redis | Cluster {
  return getRedisManager().getClient();
}

/**
 * Get the Redis subscriber client.
 */
export function getRedisSubscriber(): Redis | Cluster {
  return getRedisManager().getSubscriber();
}

/**
 * Get the Redis publisher client.
 */
export function getRedisPublisher(): Redis | Cluster {
  return getRedisManager().getPublisher();
}

/**
 * Check if Redis is healthy.
 */
export function isRedisHealthy(): boolean {
  return manager?.isHealthy() ?? false;
}

/**
 * Get Redis health status.
 */
export function getRedisHealth(): HealthCheckResult | null {
  return manager?.getHealth() ?? null;
}

/**
 * Close Redis connections.
 */
export async function closeRedisCluster(): Promise<void> {
  if (manager) {
    await manager.close();
    manager = null;
  }
}

// ============================================
// RE-EXPORT KEY CONSTANTS
// ============================================

export { REDIS_KEYS, TTL, getMinuteKey, getLastNMinuteKeys } from './redis';
