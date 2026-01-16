/**
 * Apollo Cache Persistence
 *
 * Persists Apollo cache to IndexedDB for instant app loads on repeat visits.
 * This is critical for low-end devices and poor network conditions.
 */

import { persistCache } from 'apollo3-cache-persist';
import { openDB } from 'idb';

// Database name and store
const DB_NAME = 'musclemap-apollo-cache';
const STORE_NAME = 'cache';
const MAX_CACHE_SIZE = 5 * 1024 * 1024; // 5MB limit

/**
 * IndexedDB storage adapter for Apollo cache persistence
 * Implements the AsyncStorageWrapper interface
 */
class IndexedDBStorage {
  constructor(db) {
    this.db = db;
  }

  async getItem(key) {
    try {
      return await this.db.get(STORE_NAME, key);
    } catch {
      return null;
    }
  }

  async setItem(key, value) {
    try {
      await this.db.put(STORE_NAME, value, key);
    } catch (error: unknown) {
      // If storage is full, try to clear and retry
      if ((error as {name: string})?.name === 'QuotaExceededError') {
        await this.clearOldData();
        await this.db.put(STORE_NAME, value, key);
      }
    }
  }

  async removeItem(key) {
    try {
      await this.db.delete(STORE_NAME, key);
    } catch {
      // Failed to remove cache
    }
  }

  async clearOldData() {
    try {
      await this.db.clear(STORE_NAME);
    } catch {
      // Failed to clear old data
    }
  }
}

/**
 * Initialize cache persistence for Apollo Client
 *
 * @param {InMemoryCache} cache - Apollo InMemoryCache instance
 * @returns {Promise<void>}
 */
export async function initializeCachePersistence(cache) {
  try {
    // Open IndexedDB
    const db = await openDB(DB_NAME, 1, {
      upgrade(db) {
        // Create object store if it doesn't exist
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME);
        }
      },
    });

    const storage = new IndexedDBStorage(db);

    // Initialize persistence
    await persistCache({
      cache,
      storage,
      maxSize: MAX_CACHE_SIZE,
      trigger: 'write', // Persist on every write
      debounce: 1000, // Debounce writes by 1 second
      debug: process.env.NODE_ENV !== 'production',
    });

    return true;
  } catch {
    // Don't block app startup if persistence fails
    return false;
  }
}

/**
 * Clear the persisted cache
 * Useful when user logs out or cache becomes corrupted
 */
export async function clearPersistedCache() {
  try {
    const db = await openDB(DB_NAME, 1);
    await db.clear(STORE_NAME);
  } catch {
    // Failed to clear persisted cache
  }
}

/**
 * Get cache storage stats
 */
export async function getCacheStats() {
  try {
    const db = await openDB(DB_NAME, 1);
    const keys = await db.getAllKeys(STORE_NAME);
    const values = await db.getAll(STORE_NAME);

    let totalSize = 0;
    for (const value of values) {
      totalSize += new Blob([JSON.stringify(value)]).size;
    }

    return {
      entries: keys.length,
      sizeBytes: totalSize,
      sizeMB: (totalSize / (1024 * 1024)).toFixed(2),
      maxSizeMB: (MAX_CACHE_SIZE / (1024 * 1024)).toFixed(2),
      percentUsed: ((totalSize / MAX_CACHE_SIZE) * 100).toFixed(1),
    };
  } catch {
    return null;
  }
}
