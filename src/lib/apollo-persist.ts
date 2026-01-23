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
 *
 * Brave Shields Compatibility:
 * - Uses dynamic imports to avoid loading idb library when IndexedDB is blocked
 * - Checks for IndexedDB availability before any operations
 */

// NOTE: We do NOT import 'idb' at the top level because Brave Shields
// makes IDBDatabase/IDBFactory undefined, which causes the idb library
// to fail during module evaluation. Instead, we dynamically import it
// only after confirming IndexedDB is available.

// Database name and store
const DB_NAME = 'musclemap-apollo-cache';
const STORE_NAME = 'cache';
const MAX_CACHE_SIZE = 5 * 1024 * 1024; // 5MB limit

/**
 * Check if IndexedDB is available and working
 * Must be called BEFORE any idb library imports
 */
function isIndexedDBAvailable(): boolean {
  try {
    // Check if the global indexedDB exists
    if (typeof indexedDB === 'undefined' || indexedDB === null) {
      return false;
    }
    // Also check if IDBFactory exists (Brave makes this undefined)
    if (typeof IDBFactory === 'undefined') {
      return false;
    }
    return true;
  } catch {
    // Any error means IndexedDB is not available
    return false;
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
    // Check if IndexedDB is available BEFORE importing idb
    if (!isIndexedDBAvailable()) {
      // IndexedDB not available - app will work without cache persistence
      return false;
    }

    // Dynamically import idb library only when we know IndexedDB is available
    const { openDB } = await import('idb');
    const { persistCache } = await import('apollo3-cache-persist');

    // Test that we can actually open a database
    try {
      const testDb = await openDB('__idb_test__', 1, {
        upgrade(db) {
          db.createObjectStore('test');
        },
      });
      testDb.close();
      await indexedDB.deleteDatabase('__idb_test__');
    } catch {
      // Can't actually use IndexedDB
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

    // Create storage adapter
    const storage = {
      async getItem(key: string): Promise<string | null> {
        try {
          return await db.get(STORE_NAME, key);
        } catch {
          return null;
        }
      },

      async setItem(key: string, value: string): Promise<void> {
        try {
          await db.put(STORE_NAME, value, key);
        } catch (error: unknown) {
          // If storage is full, try to clear and retry
          if ((error as { name: string })?.name === 'QuotaExceededError') {
            try {
              await db.clear(STORE_NAME);
              await db.put(STORE_NAME, value, key);
            } catch {
              // Give up if still failing
            }
          }
        }
      },

      async removeItem(key: string): Promise<void> {
        try {
          await db.delete(STORE_NAME, key);
        } catch {
          // Failed to remove cache
        }
      },
    };

    // Initialize persistence
    await persistCache({
      cache,
      storage,
      maxSize: MAX_CACHE_SIZE,
      trigger: 'write', // Persist on every write
      debounce: 1000, // Debounce writes by 1 second
      debug: false,
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
    if (!isIndexedDBAvailable()) return;

    const { openDB } = await import('idb');
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
    if (!isIndexedDBAvailable()) return null;

    const { openDB } = await import('idb');
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
