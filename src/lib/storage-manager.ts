/**
 * Storage Quota Management
 *
 * Monitors and manages IndexedDB/localStorage usage to prevent
 * storage errors on low-end devices with limited storage.
 *
 * Brave Shields Compatibility:
 * - Uses dynamic imports to avoid loading idb library when IndexedDB is blocked
 * - Checks for IndexedDB availability before any operations
 */

// NOTE: We do NOT import 'idb' at the top level because Brave Shields
// makes IDBDatabase/IDBFactory undefined, which causes the idb library
// to fail during module evaluation.

// Storage limits
const STORAGE_WARNING_THRESHOLD = 0.8; // 80%
const STORAGE_CRITICAL_THRESHOLD = 0.95; // 95%
const PRUNE_AGE_DAYS = 30;

/**
 * Check if IndexedDB is available
 * Must be called BEFORE any idb library imports
 */
function isIndexedDBAvailable(): boolean {
  try {
    if (typeof indexedDB === 'undefined' || indexedDB === null) {
      return false;
    }
    if (typeof IDBFactory === 'undefined') {
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

/**
 * Get current storage usage stats
 * Uses the Storage API when available, falls back to estimation
 */
export async function getStorageQuota() {
  try {
    if (navigator.storage?.estimate) {
      const { usage, quota } = await navigator.storage.estimate();
      return {
        usage,
        quota,
        usageMB: (usage! / (1024 * 1024)).toFixed(2),
        quotaMB: (quota! / (1024 * 1024)).toFixed(2),
        percentUsed: ((usage! / quota!) * 100).toFixed(1),
        isWarning: usage! / quota! > STORAGE_WARNING_THRESHOLD,
        isCritical: usage! / quota! > STORAGE_CRITICAL_THRESHOLD,
      };
    }
  } catch {
    // Failed to get storage quota
  }

  return null;
}

/**
 * Request persistent storage (prevents browser from evicting data)
 * Only works in secure contexts and may show a prompt to the user
 */
export async function requestPersistentStorage() {
  try {
    if (navigator.storage?.persist) {
      const isPersisted = await navigator.storage.persisted();
      if (isPersisted) {
        return true;
      }

      const result = await navigator.storage.persist();
      return result;
    }
  } catch {
    // Failed to request persistence
  }

  return false;
}

/**
 * Check storage and prune old data if needed
 * Call this periodically (e.g., on app start, after syncs)
 */
export async function checkAndPruneStorage() {
  // Skip if IndexedDB is not available
  if (!isIndexedDBAvailable()) {
    return { pruned: false, level: 'unavailable' };
  }

  const quota = await getStorageQuota();

  if (!quota) {
    return { pruned: false };
  }

  if (quota.isCritical) {
    await pruneAllStaleData(7); // 7 days for critical
    return { pruned: true, level: 'critical' };
  }

  if (quota.isWarning) {
    await pruneAllStaleData(PRUNE_AGE_DAYS);
    return { pruned: true, level: 'warning' };
  }

  return { pruned: false, level: 'ok' };
}

/**
 * Prune old data from all IndexedDB stores
 */
async function pruneAllStaleData(maxAgeDays: number) {
  if (!isIndexedDBAvailable()) return;

  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - maxAgeDays);

  try {
    // Prune offline queue
    await pruneOfflineQueue(cutoffDate);

    // Prune old workout cache
    await pruneWorkoutCache(maxAgeDays);

    // Prune old cache entries
    await pruneCacheEntries(cutoffDate);

    // Pruned data older than maxAgeDays days
  } catch {
    // Error during pruning
  }
}

/**
 * Safely open an IndexedDB database
 * Returns null if the database doesn't exist or can't be opened
 * This prevents iOS Safari from throwing on non-existent databases
 * Also handles Brave Shields which blocks IndexedDB
 */
async function safeOpenDB(dbName: string, version?: number) {
  if (!isIndexedDBAvailable()) {
    return null;
  }

  try {
    // Check if database exists before trying to open with version
    // This prevents iOS Safari issues with opening non-existent databases
    const databases = await indexedDB.databases?.() || [];
    const exists = databases.some(db => db.name === dbName);

    if (!exists) {
      return null;
    }

    // Dynamically import idb only when we know IndexedDB is available
    const { openDB } = await import('idb');
    return await openDB(dbName, version);
  } catch {
    // Database doesn't exist, can't be opened, or IndexedDB is blocked
    return null;
  }
}

/**
 * Prune old items from the offline sync queue
 */
async function pruneOfflineQueue(cutoffDate: Date) {
  try {
    const db = await safeOpenDB('musclemap-offline', 1);
    if (!db || !db.objectStoreNames.contains('queue')) return;

    const tx = db.transaction('queue', 'readwrite');
    const store = tx.objectStore('queue');
    const items = await store.getAll();

    let _prunedCount = 0;
    for (const item of items) {
      const itemDate = new Date(item.timestamp || item.createdAt);
      if (itemDate < cutoffDate) {
        await store.delete(item.id);
        _prunedCount++;
      }
    }

    await tx.done;
  } catch {
    // Database may not exist yet
  }
}

/**
 * Prune old workout data from cache
 * Keep only last N workouts
 */
async function pruneWorkoutCache(_maxAgeDays: number) {
  const MAX_CACHED_WORKOUTS = 100;

  try {
    const db = await safeOpenDB('musclemap-cache', 1);
    if (!db || !db.objectStoreNames.contains('workouts')) return;

    const tx = db.transaction('workouts', 'readwrite');
    const store = tx.objectStore('workouts');
    const items = await store.getAll();

    // Sort by date descending and delete old ones
    const sorted = items.sort((a, b) => {
      const dateA = new Date(a.completedAt || a.createdAt);
      const dateB = new Date(b.completedAt || b.createdAt);
      return dateB.getTime() - dateA.getTime();
    });

    if (sorted.length > MAX_CACHED_WORKOUTS) {
      const toDelete = sorted.slice(MAX_CACHED_WORKOUTS);
      for (const item of toDelete) {
        await store.delete(item.id);
      }
    }

    await tx.done;
  } catch {
    // Database may not exist yet
  }
}

/**
 * Prune old entries from the multi-layer cache
 */
async function pruneCacheEntries(cutoffDate: Date) {
  try {
    const db = await safeOpenDB('musclemap-multi-cache', 1);
    if (!db || !db.objectStoreNames.contains('entries')) return;

    const tx = db.transaction('entries', 'readwrite');
    const store = tx.objectStore('entries');
    const items = await store.getAll();

    let _prunedCount = 0;
    for (const item of items) {
      // Check if expired based on TTL or age
      const itemDate = new Date(item.timestamp || item.createdAt);
      const isExpired = item.expiresAt && new Date(item.expiresAt) < new Date();
      const isTooOld = itemDate < cutoffDate;

      if (isExpired || isTooOld) {
        await store.delete(item.key);
        _prunedCount++;
      }
    }

    await tx.done;
  } catch {
    // Database may not exist yet
  }
}

/**
 * Clear all cached data (for troubleshooting or user request)
 * Does NOT clear auth data or pending offline actions
 */
export async function clearAllCaches() {
  try {
    // Clear Apollo cache
    const apolloDb = await safeOpenDB('musclemap-apollo-cache', 1);
    if (apolloDb?.objectStoreNames.contains('cache')) {
      await apolloDb.clear('cache');
    }

    // Clear multi-layer cache
    const cacheDb = await safeOpenDB('musclemap-multi-cache', 1);
    if (cacheDb?.objectStoreNames.contains('entries')) {
      await cacheDb.clear('entries');
    }

    // Clear workout cache
    const workoutDb = await safeOpenDB('musclemap-cache', 1);
    if (workoutDb?.objectStoreNames.contains('workouts')) {
      await workoutDb.clear('workouts');
    }

    // Clear localStorage cache entries (keep auth)
    try {
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key?.startsWith('cache:') || key?.startsWith('mm-cache:')) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach((key) => localStorage.removeItem(key));
    } catch {
      // localStorage may not be available
    }

    return true;
  } catch {
    return false;
  }
}

/**
 * Get detailed storage breakdown by database
 */
export async function getStorageBreakdown() {
  const breakdown: Record<string, { itemCount: number; sizeBytes: number; sizeMB: string }> = {};

  // If IndexedDB is not available, return empty breakdown for IDB stores
  if (!isIndexedDBAvailable()) {
    const dbNames = [
      'musclemap-apollo-cache',
      'musclemap-offline',
      'musclemap-multi-cache',
      'musclemap-cache',
    ];
    for (const dbName of dbNames) {
      breakdown[dbName] = { itemCount: 0, sizeBytes: 0, sizeMB: '0' };
    }
  } else {
    const dbNames = [
      'musclemap-apollo-cache',
      'musclemap-offline',
      'musclemap-multi-cache',
      'musclemap-cache',
    ];

    for (const dbName of dbNames) {
      try {
        const db = await safeOpenDB(dbName, 1);
        if (!db) {
          breakdown[dbName] = { itemCount: 0, sizeBytes: 0, sizeMB: '0' };
          continue;
        }

        let totalSize = 0;
        let itemCount = 0;

        for (const storeName of db.objectStoreNames) {
          try {
            const items = await db.getAll(storeName);
            itemCount += items.length;
            for (const item of items) {
              totalSize += new Blob([JSON.stringify(item)]).size;
            }
          } catch {
            // Store may not exist
          }
        }

        breakdown[dbName] = {
          itemCount,
          sizeBytes: totalSize,
          sizeMB: (totalSize / (1024 * 1024)).toFixed(2),
        };
      } catch {
        // Database doesn't exist yet
        breakdown[dbName] = { itemCount: 0, sizeBytes: 0, sizeMB: '0' };
      }
    }
  }

  // LocalStorage
  try {
    let lsSize = 0;
    let lsCount = 0;
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      const value = localStorage.getItem(key!);
      lsSize += (key?.length || 0) + (value?.length || 0);
      lsCount++;
    }
    breakdown['localStorage'] = {
      itemCount: lsCount,
      sizeBytes: lsSize * 2, // UTF-16
      sizeMB: ((lsSize * 2) / (1024 * 1024)).toFixed(2),
    };
  } catch {
    // localStorage may not be available
    breakdown['localStorage'] = { itemCount: 0, sizeBytes: 0, sizeMB: '0' };
  }

  return breakdown;
}
