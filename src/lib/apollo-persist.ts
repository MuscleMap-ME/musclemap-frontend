/**
 * Apollo Cache Persistence
 *
 * Persists Apollo cache to IndexedDB for instant app loads on repeat visits.
 * This is critical for low-end devices and poor network conditions.
 *
 * iOS Safari Compatibility:
 * - Handles IndexedDB restrictions in private browsing
 * - Gracefully degrades when IndexedDB is unavailable
 * - Works around iOS storage pressure issues
 */

import { persistCache } from 'apollo3-cache-persist';
import { openDB, IDBPDatabase } from 'idb';

// Database name and store
const DB_NAME = 'musclemap-apollo-cache';
const STORE_NAME = 'cache';
const MAX_CACHE_SIZE = 5 * 1024 * 1024; // 5MB limit

/**
 * Check if IndexedDB is available and working
 * iOS Safari in private mode throws on IDB operations
 * Brave Shields throws ReferenceError when accessing indexedDB
 */
async function isIndexedDBAvailable(): Promise<boolean> {
  try {
    // Brave Shields throws ReferenceError when accessing indexedDB at all
    // This check must be in a try-catch to handle that case
    if (typeof indexedDB === 'undefined') {
      return false;
    }

    // Test if we can actually use IndexedDB
    const testDb = await openDB('__idb_test__', 1, {
      upgrade(db) {
        db.createObjectStore('test');
      },
    });
    testDb.close();
    // Clean up test database
    await indexedDB.deleteDatabase('__idb_test__');
    return true;
  } catch {
    // IndexedDB not available (Brave Shields, private browsing, etc.)
    return false;
  }
}

/**
 * IndexedDB storage adapter for Apollo cache persistence
 * Implements the AsyncStorageWrapper interface
 */
class IndexedDBStorage {
  private db: IDBPDatabase;

  constructor(db: IDBPDatabase) {
    this.db = db;
  }

  async getItem(key: string): Promise<string | null> {
    try {
      return await this.db.get(STORE_NAME, key);
    } catch {
      return null;
    }
  }

  async setItem(key: string, value: string): Promise<void> {
    try {
      await this.db.put(STORE_NAME, value, key);
    } catch (error: unknown) {
      // If storage is full, try to clear and retry
      if ((error as {name: string})?.name === 'QuotaExceededError') {
        await this.clearOldData();
        try {
          await this.db.put(STORE_NAME, value, key);
        } catch {
          // Give up if still failing
        }
      }
    }
  }

  async removeItem(key: string): Promise<void> {
    try {
      await this.db.delete(STORE_NAME, key);
    } catch {
      // Failed to remove cache
    }
  }

  async clearOldData(): Promise<void> {
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
 * @param cache - Apollo InMemoryCache instance
 * @returns Promise that resolves to true if persistence was initialized
 */
export async function initializeCachePersistence(cache: unknown): Promise<boolean> {
  try {
    // Check if IndexedDB is available (fails in iOS private browsing)
    const idbAvailable = await isIndexedDBAvailable();
    if (!idbAvailable) {
      // IndexedDB not available - app will work without cache persistence
      return false;
    }

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
export async function clearPersistedCache(): Promise<void> {
  try {
    const idbAvailable = await isIndexedDBAvailable();
    if (!idbAvailable) return;

    const db = await openDB(DB_NAME, 1);
    if (db.objectStoreNames.contains(STORE_NAME)) {
      await db.clear(STORE_NAME);
    }
  } catch {
    // Failed to clear persisted cache
  }
}

/**
 * Get cache storage stats
 */
export async function getCacheStats(): Promise<{
  entries: number;
  sizeBytes: number;
  sizeMB: string;
  maxSizeMB: string;
  percentUsed: string;
} | null> {
  try {
    const idbAvailable = await isIndexedDBAvailable();
    if (!idbAvailable) return null;

    const db = await openDB(DB_NAME, 1);
    if (!db.objectStoreNames.contains(STORE_NAME)) {
      return null;
    }

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
