/**
 * Automatic Persisted Queries (APQ)
 *
 * Reduces bandwidth by allowing clients to send a hash instead of the full query.
 * The server stores the query on first request and serves from cache on subsequent requests.
 *
 * Flow:
 * 1. Client sends hash only
 * 2. Server checks cache for hash
 * 3. If found, execute query
 * 4. If not found, return PersistedQueryNotFound error
 * 5. Client sends hash + full query
 * 6. Server caches and executes
 */

import { getRedisClient, isRedisHealthy } from '../lib/redis-cluster';
import { loggers } from '../lib/logger';

const log = loggers.core;

// ============================================
// TYPES
// ============================================

export interface APQRequest {
  query?: string;
  extensions?: {
    persistedQuery?: {
      version: number;
      sha256Hash: string;
    };
  };
}

export interface APQResult {
  query: string | null;
  hash: string | null;
  fromCache: boolean;
  error?: string;
}

// ============================================
// CONFIGURATION
// ============================================

const APQ_CONFIG = {
  /**
   * Redis key prefix for persisted queries.
   */
  keyPrefix: 'gql:apq:',

  /**
   * TTL for cached queries (24 hours).
   */
  ttl: 86400,

  /**
   * Maximum query size to cache (500KB).
   */
  maxQuerySize: 512 * 1024,

  /**
   * Enable/disable APQ.
   */
  enabled: true,
};

// ============================================
// APQ MANAGER
// ============================================

class PersistedQueryManager {
  private inMemoryCache = new Map<string, string>();
  private readonly maxInMemorySize = 1000;

  /**
   * Process an APQ request.
   */
  async process(request: APQRequest): Promise<APQResult> {
    // If no persisted query extension, just return the query
    if (!request.extensions?.persistedQuery) {
      return {
        query: request.query || null,
        hash: null,
        fromCache: false,
      };
    }

    const { sha256Hash, version } = request.extensions.persistedQuery;

    // Only support version 1
    if (version !== 1) {
      return {
        query: null,
        hash: sha256Hash,
        fromCache: false,
        error: 'PersistedQueryNotSupported',
      };
    }

    // If query is provided, cache it
    if (request.query) {
      await this.set(sha256Hash, request.query);
      return {
        query: request.query,
        hash: sha256Hash,
        fromCache: false,
      };
    }

    // Try to get query from cache
    const cachedQuery = await this.get(sha256Hash);

    if (cachedQuery) {
      return {
        query: cachedQuery,
        hash: sha256Hash,
        fromCache: true,
      };
    }

    // Query not found
    return {
      query: null,
      hash: sha256Hash,
      fromCache: false,
      error: 'PersistedQueryNotFound',
    };
  }

  /**
   * Get a cached query.
   */
  private async get(hash: string): Promise<string | null> {
    // Try in-memory first
    const inMemory = this.inMemoryCache.get(hash);
    if (inMemory) {
      return inMemory;
    }

    // Try Redis
    if (!APQ_CONFIG.enabled || !isRedisHealthy()) {
      return null;
    }

    try {
      const redis = getRedisClient();
      const query = await redis.get(`${APQ_CONFIG.keyPrefix}${hash}`);

      if (query) {
        // Populate in-memory cache
        this.setInMemory(hash, query);
      }

      return query;
    } catch (error) {
      log.warn({ error, hash }, 'APQ cache get failed');
      return null;
    }
  }

  /**
   * Cache a query.
   */
  private async set(hash: string, query: string): Promise<void> {
    // Validate query size
    if (query.length > APQ_CONFIG.maxQuerySize) {
      log.warn({ hash, size: query.length }, 'APQ query too large, skipping cache');
      return;
    }

    // Validate hash matches query
    const computedHash = await this.computeHash(query);
    if (computedHash !== hash) {
      log.warn({ provided: hash, computed: computedHash }, 'APQ hash mismatch');
      return;
    }

    // Set in-memory
    this.setInMemory(hash, query);

    // Set in Redis
    if (!APQ_CONFIG.enabled || !isRedisHealthy()) {
      return;
    }

    try {
      const redis = getRedisClient();
      await redis.setex(`${APQ_CONFIG.keyPrefix}${hash}`, APQ_CONFIG.ttl, query);
    } catch (error) {
      log.warn({ error, hash }, 'APQ cache set failed');
    }
  }

  /**
   * Set in in-memory cache with LRU eviction.
   */
  private setInMemory(hash: string, query: string): void {
    // Simple LRU: delete oldest if at capacity
    if (this.inMemoryCache.size >= this.maxInMemorySize) {
      const firstKey = this.inMemoryCache.keys().next().value;
      if (firstKey) {
        this.inMemoryCache.delete(firstKey);
      }
    }

    // Delete and re-add to maintain insertion order
    this.inMemoryCache.delete(hash);
    this.inMemoryCache.set(hash, query);
  }

  /**
   * Compute SHA-256 hash of a query.
   */
  private async computeHash(query: string): Promise<string> {
    // Use Web Crypto API
    const encoder = new TextEncoder();
    const data = encoder.encode(query);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  }

  /**
   * Clear all cached queries.
   */
  async clear(): Promise<void> {
    this.inMemoryCache.clear();

    if (isRedisHealthy()) {
      try {
        const redis = getRedisClient();
        let cursor = '0';
        do {
          const [nextCursor, keys] = await redis.scan(
            cursor,
            'MATCH',
            `${APQ_CONFIG.keyPrefix}*`,
            'COUNT',
            100
          );
          cursor = nextCursor;

          if (keys.length > 0) {
            const pipeline = redis.pipeline();
            keys.forEach((key) => pipeline.del(key));
            await pipeline.exec();
          }
        } while (cursor !== '0');
      } catch (error) {
        log.warn({ error }, 'APQ cache clear failed');
      }
    }
  }

  /**
   * Get cache stats.
   */
  getStats(): { inMemorySize: number } {
    return {
      inMemorySize: this.inMemoryCache.size,
    };
  }
}

// ============================================
// SINGLETON
// ============================================

export const apqManager = new PersistedQueryManager();

/**
 * Get APQ manager.
 */
export function getAPQManager(): PersistedQueryManager {
  return apqManager;
}
