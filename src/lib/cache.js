/**
 * Multi-Layer Cache Service
 *
 * Implements the caching strategy from the scaling architecture plan:
 * - L1: Browser memory cache (instant, session-scoped)
 * - L2: LocalStorage/IndexedDB (persistent, device-scoped)
 * - L3: Service Worker cache (network-level caching)
 *
 * Features:
 * - Automatic TTL management
 * - Cache key namespacing
 * - Size limits and LRU eviction
 * - Serialization/deserialization
 * - Cache warming
 */

// ============================================
// CONFIGURATION
// ============================================

const CACHE_CONFIG = {
  // L1: Memory cache
  memory: {
    maxSize: 100,        // Max number of entries
    defaultTTL: 60000,   // 1 minute default
  },
  // L2: LocalStorage
  localStorage: {
    maxSize: 5 * 1024 * 1024,  // 5MB (typical localStorage limit)
    prefix: 'mm_cache_',
    defaultTTL: 300000,        // 5 minutes default
  },
  // L2: IndexedDB for larger data
  indexedDB: {
    dbName: 'musclemap-cache',
    storeName: 'cache',
    maxAge: 86400000,          // 24 hours max age
  },
};

// Per-key TTL configuration (in milliseconds)
const TTL_CONFIG = {
  // Static reference data (long cache)
  'ref:exercises': 3600000,     // 1 hour
  'ref:muscles': 3600000,       // 1 hour
  'ref:equipment': 3600000,     // 1 hour
  'ref:archetypes': 3600000,    // 1 hour

  // User data (medium cache)
  'user:profile': 300000,       // 5 minutes
  'user:stats': 300000,         // 5 minutes
  'user:achievements': 600000,  // 10 minutes
  'user:settings': 60000,       // 1 minute

  // Dynamic data (short cache)
  'workout:active': 10000,      // 10 seconds
  'feed:activity': 30000,       // 30 seconds
  'leaderboard': 60000,         // 1 minute

  // Real-time data (very short cache)
  'presence': 5000,             // 5 seconds
  'credits': 10000,             // 10 seconds
};

// ============================================
// L1: MEMORY CACHE
// ============================================

class MemoryCache {
  constructor(maxSize = CACHE_CONFIG.memory.maxSize) {
    this.cache = new Map();
    this.maxSize = maxSize;
  }

  get(key) {
    const entry = this.cache.get(key);
    if (!entry) return null;

    // Check expiration
    if (entry.expiresAt && Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    // Move to end for LRU
    this.cache.delete(key);
    this.cache.set(key, entry);

    return entry.value;
  }

  set(key, value, ttl) {
    // Evict oldest if at capacity
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }

    const entry = {
      value,
      createdAt: Date.now(),
      expiresAt: ttl ? Date.now() + ttl : null,
    };

    this.cache.set(key, entry);
  }

  delete(key) {
    return this.cache.delete(key);
  }

  clear() {
    this.cache.clear();
  }

  has(key) {
    const entry = this.cache.get(key);
    if (!entry) return false;

    if (entry.expiresAt && Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return false;
    }

    return true;
  }

  size() {
    return this.cache.size;
  }

  keys() {
    return Array.from(this.cache.keys());
  }
}

// ============================================
// L2: LOCALSTORAGE CACHE
// ============================================

class LocalStorageCache {
  constructor(prefix = CACHE_CONFIG.localStorage.prefix) {
    this.prefix = prefix;
  }

  _key(key) {
    return `${this.prefix}${key}`;
  }

  get(key) {
    try {
      const raw = localStorage.getItem(this._key(key));
      if (!raw) return null;

      const entry = JSON.parse(raw);

      // Check expiration
      if (entry.expiresAt && Date.now() > entry.expiresAt) {
        this.delete(key);
        return null;
      }

      return entry.value;
    } catch (e) {
      console.warn('[Cache] LocalStorage get error:', e);
      return null;
    }
  }

  set(key, value, ttl) {
    try {
      const entry = {
        value,
        createdAt: Date.now(),
        expiresAt: ttl ? Date.now() + ttl : null,
      };

      localStorage.setItem(this._key(key), JSON.stringify(entry));
      return true;
    } catch (e) {
      // Quota exceeded - try to make room
      if (e.name === 'QuotaExceededError') {
        this.evictOldest(10);
        try {
          const entry = {
            value,
            createdAt: Date.now(),
            expiresAt: ttl ? Date.now() + ttl : null,
          };
          localStorage.setItem(this._key(key), JSON.stringify(entry));
          return true;
        } catch {
          console.warn('[Cache] LocalStorage quota exceeded');
          return false;
        }
      }
      console.warn('[Cache] LocalStorage set error:', e);
      return false;
    }
  }

  delete(key) {
    try {
      localStorage.removeItem(this._key(key));
      return true;
    } catch (e) {
      return false;
    }
  }

  clear() {
    const keysToRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(this.prefix)) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach((key) => localStorage.removeItem(key));
  }

  evictOldest(count = 5) {
    const entries = [];

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(this.prefix)) {
        try {
          const raw = localStorage.getItem(key);
          if (raw) {
            const entry = JSON.parse(raw);
            entries.push({ key, createdAt: entry.createdAt || 0 });
          }
        } catch {
          entries.push({ key, createdAt: 0 });
        }
      }
    }

    // Sort by age (oldest first)
    entries.sort((a, b) => a.createdAt - b.createdAt);

    // Remove oldest entries
    entries.slice(0, count).forEach(({ key }) => {
      localStorage.removeItem(key);
    });
  }

  has(key) {
    return this.get(key) !== null;
  }

  keys() {
    const keys = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(this.prefix)) {
        keys.push(key.slice(this.prefix.length));
      }
    }
    return keys;
  }
}

// ============================================
// L2: INDEXEDDB CACHE (for larger data)
// ============================================

class IndexedDBCache {
  constructor() {
    this.dbName = CACHE_CONFIG.indexedDB.dbName;
    this.storeName = CACHE_CONFIG.indexedDB.storeName;
    this.db = null;
  }

  async open() {
    if (this.db) return this.db;

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, 1);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve(this.db);
      };

      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains(this.storeName)) {
          db.createObjectStore(this.storeName, { keyPath: 'key' });
        }
      };
    });
  }

  async get(key) {
    try {
      const db = await this.open();

      return new Promise((resolve) => {
        const transaction = db.transaction(this.storeName, 'readonly');
        const store = transaction.objectStore(this.storeName);
        const request = store.get(key);

        request.onsuccess = () => {
          const entry = request.result;
          if (!entry) {
            resolve(null);
            return;
          }

          // Check expiration
          if (entry.expiresAt && Date.now() > entry.expiresAt) {
            this.delete(key);
            resolve(null);
            return;
          }

          resolve(entry.value);
        };

        request.onerror = () => resolve(null);
      });
    } catch (e) {
      console.warn('[Cache] IndexedDB get error:', e);
      return null;
    }
  }

  async set(key, value, ttl) {
    try {
      const db = await this.open();

      return new Promise((resolve, reject) => {
        const transaction = db.transaction(this.storeName, 'readwrite');
        const store = transaction.objectStore(this.storeName);

        const entry = {
          key,
          value,
          createdAt: Date.now(),
          expiresAt: ttl ? Date.now() + ttl : null,
        };

        const request = store.put(entry);

        request.onsuccess = () => resolve(true);
        request.onerror = () => reject(request.error);
      });
    } catch (e) {
      console.warn('[Cache] IndexedDB set error:', e);
      return false;
    }
  }

  async delete(key) {
    try {
      const db = await this.open();

      return new Promise((resolve) => {
        const transaction = db.transaction(this.storeName, 'readwrite');
        const store = transaction.objectStore(this.storeName);
        const request = store.delete(key);

        request.onsuccess = () => resolve(true);
        request.onerror = () => resolve(false);
      });
    } catch (e) {
      return false;
    }
  }

  async clear() {
    try {
      const db = await this.open();

      return new Promise((resolve) => {
        const transaction = db.transaction(this.storeName, 'readwrite');
        const store = transaction.objectStore(this.storeName);
        const request = store.clear();

        request.onsuccess = () => resolve(true);
        request.onerror = () => resolve(false);
      });
    } catch (e) {
      return false;
    }
  }
}

// ============================================
// UNIFIED CACHE MANAGER
// ============================================

class CacheManager {
  constructor() {
    this.memory = new MemoryCache();
    this.localStorage = new LocalStorageCache();
    this.indexedDB = new IndexedDBCache();
  }

  /**
   * Get TTL for a cache key.
   */
  getTTL(key) {
    // Check for exact match
    if (TTL_CONFIG[key]) {
      return TTL_CONFIG[key];
    }

    // Check for prefix match
    for (const [prefix, ttl] of Object.entries(TTL_CONFIG)) {
      if (key.startsWith(prefix.split(':')[0] + ':')) {
        return ttl;
      }
    }

    // Default TTL
    return CACHE_CONFIG.memory.defaultTTL;
  }

  /**
   * Get a value from cache (checks all layers).
   */
  async get(key, options = {}) {
    const { skipMemory = false, skipLocal = false, skipIndexedDB = false } = options;

    // L1: Memory cache (fastest)
    if (!skipMemory) {
      const memoryValue = this.memory.get(key);
      if (memoryValue !== null) {
        return memoryValue;
      }
    }

    // L2a: LocalStorage (for small data)
    if (!skipLocal) {
      const localValue = this.localStorage.get(key);
      if (localValue !== null) {
        // Promote to memory cache
        this.memory.set(key, localValue, this.getTTL(key));
        return localValue;
      }
    }

    // L2b: IndexedDB (for large data)
    if (!skipIndexedDB) {
      const idbValue = await this.indexedDB.get(key);
      if (idbValue !== null) {
        // Promote to memory cache
        this.memory.set(key, idbValue, this.getTTL(key));
        return idbValue;
      }
    }

    return null;
  }

  /**
   * Set a value in cache.
   */
  async set(key, value, options = {}) {
    const {
      ttl = this.getTTL(key),
      persist = true,          // Store in LocalStorage
      persistLarge = false,    // Store in IndexedDB instead
    } = options;

    // Always set in memory
    this.memory.set(key, value, ttl);

    // Persist to L2 if requested
    if (persist) {
      if (persistLarge) {
        await this.indexedDB.set(key, value, ttl);
      } else {
        this.localStorage.set(key, value, ttl);
      }
    }
  }

  /**
   * Delete a value from all cache layers.
   */
  async delete(key) {
    this.memory.delete(key);
    this.localStorage.delete(key);
    await this.indexedDB.delete(key);
  }

  /**
   * Clear all caches.
   */
  async clear() {
    this.memory.clear();
    this.localStorage.clear();
    await this.indexedDB.clear();
  }

  /**
   * Invalidate cache entries matching a pattern.
   */
  async invalidate(pattern) {
    const regex = new RegExp(pattern.replace('*', '.*'));

    // Memory cache
    for (const key of this.memory.keys()) {
      if (regex.test(key)) {
        this.memory.delete(key);
      }
    }

    // LocalStorage
    for (const key of this.localStorage.keys()) {
      if (regex.test(key)) {
        this.localStorage.delete(key);
      }
    }
  }

  /**
   * Warm cache with common data.
   */
  async warm(warmingFunctions) {
    const results = await Promise.allSettled(
      Object.entries(warmingFunctions).map(async ([key, fetchFn]) => {
        try {
          const value = await fetchFn();
          await this.set(key, value, { ttl: this.getTTL(key) });
          return { key, success: true };
        } catch (error) {
          return { key, success: false, error };
        }
      })
    );

    return results;
  }

  /**
   * Get cache statistics.
   */
  getStats() {
    return {
      memory: {
        size: this.memory.size(),
        keys: this.memory.keys(),
      },
      localStorage: {
        keys: this.localStorage.keys(),
      },
    };
  }
}

// ============================================
// SINGLETON INSTANCE
// ============================================

export const cache = new CacheManager();

// ============================================
// REACT HOOKS
// ============================================

import { useState, useEffect, useCallback } from 'react';

/**
 * Hook for cached data with automatic refresh.
 */
export function useCached(key, fetchFn, options = {}) {
  const {
    ttl,
    refreshInterval,
    staleWhileRevalidate = true,
  } = options;

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const refresh = useCallback(async () => {
    try {
      const freshData = await fetchFn();
      await cache.set(key, freshData, { ttl });
      setData(freshData);
      setError(null);
    } catch (e) {
      setError(e);
    }
  }, [key, fetchFn, ttl]);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      // Try cache first
      const cachedData = await cache.get(key);

      if (cachedData !== null) {
        if (mounted) {
          setData(cachedData);
          setLoading(false);
        }

        // Revalidate in background if stale-while-revalidate
        if (staleWhileRevalidate) {
          refresh();
        }
        return;
      }

      // Fetch fresh data
      try {
        const freshData = await fetchFn();
        await cache.set(key, freshData, { ttl });

        if (mounted) {
          setData(freshData);
          setLoading(false);
        }
      } catch (e) {
        if (mounted) {
          setError(e);
          setLoading(false);
        }
      }
    };

    load();

    // Set up refresh interval if specified
    let intervalId;
    if (refreshInterval) {
      intervalId = setInterval(refresh, refreshInterval);
    }

    return () => {
      mounted = false;
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [key, fetchFn, ttl, staleWhileRevalidate, refreshInterval, refresh]);

  return { data, loading, error, refresh };
}

/**
 * Hook for cache invalidation.
 */
export function useCacheInvalidation() {
  const invalidate = useCallback(async (pattern) => {
    await cache.invalidate(pattern);
  }, []);

  const clear = useCallback(async () => {
    await cache.clear();
  }, []);

  return { invalidate, clear };
}

// ============================================
// EXPORTS
// ============================================

export {
  MemoryCache,
  LocalStorageCache,
  IndexedDBCache,
  CacheManager,
  TTL_CONFIG,
};

export default cache;
