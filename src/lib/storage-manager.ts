/**
 * Storage Quota Management
 *
 * Monitors and manages IndexedDB/localStorage usage to prevent
 * storage errors on low-end devices with limited storage.
 */

import { openDB } from 'idb';

// Storage limits
const STORAGE_WARNING_THRESHOLD = 0.8; // 80%
const STORAGE_CRITICAL_THRESHOLD = 0.95; // 95%
const PRUNE_AGE_DAYS = 30;

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
        usageMB: (usage / (1024 * 1024)).toFixed(2),
        quotaMB: (quota / (1024 * 1024)).toFixed(2),
        percentUsed: ((usage / quota) * 100).toFixed(1),
        isWarning: usage / quota > STORAGE_WARNING_THRESHOLD,
        isCritical: usage / quota > STORAGE_CRITICAL_THRESHOLD,
      };
    }
  } catch (error) {
    console.warn('[Storage] Failed to get quota:', error);
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
        console.info('[Storage] Already persisted');
        return true;
      }

      const result = await navigator.storage.persist();
      console.info('[Storage] Persistence requested:', result);
      return result;
    }
  } catch (error) {
    console.warn('[Storage] Failed to request persistence:', error);
  }

  return false;
}

/**
 * Check storage and prune old data if needed
 * Call this periodically (e.g., on app start, after syncs)
 */
export async function checkAndPruneStorage() {
  const quota = await getStorageQuota();

  if (!quota) {
    console.info('[Storage] Quota API not available');
    return { pruned: false };
  }

  console.info(`[Storage] Usage: ${quota.usageMB}MB / ${quota.quotaMB}MB (${quota.percentUsed}%)`);

  if (quota.isCritical) {
    console.warn('[Storage] Critical storage level, pruning aggressively');
    await pruneAllStaleData(7); // 7 days for critical
    return { pruned: true, level: 'critical' };
  }

  if (quota.isWarning) {
    console.warn('[Storage] Storage warning level, pruning old data');
    await pruneAllStaleData(PRUNE_AGE_DAYS);
    return { pruned: true, level: 'warning' };
  }

  return { pruned: false, level: 'ok' };
}

/**
 * Prune old data from all IndexedDB stores
 */
async function pruneAllStaleData(maxAgeDays) {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - maxAgeDays);

  try {
    // Prune offline queue
    await pruneOfflineQueue(cutoffDate);

    // Prune old workout cache
    await pruneWorkoutCache(maxAgeDays);

    // Prune old cache entries
    await pruneCacheEntries(cutoffDate);

    console.info(`[Storage] Pruned data older than ${maxAgeDays} days`);
  } catch (error) {
    console.warn('[Storage] Error during pruning:', error);
  }
}

/**
 * Prune old items from the offline sync queue
 */
async function pruneOfflineQueue(cutoffDate) {
  try {
    const db = await openDB('musclemap-offline', 1);
    if (!db.objectStoreNames.contains('queue')) return;

    const tx = db.transaction('queue', 'readwrite');
    const store = tx.objectStore('queue');
    const items = await store.getAll();

    let prunedCount = 0;
    for (const item of items) {
      const itemDate = new Date(item.timestamp || item.createdAt);
      if (itemDate < cutoffDate) {
        await store.delete(item.id);
        prunedCount++;
      }
    }

    await tx.done;
    if (prunedCount > 0) {
      console.info(`[Storage] Pruned ${prunedCount} old queue items`);
    }
  } catch (error) {
    // Database may not exist yet
    if (error.name !== 'InvalidStateError') {
      console.warn('[Storage] Failed to prune offline queue:', error);
    }
  }
}

/**
 * Prune old workout data from cache
 * Keep only last N workouts
 */
async function pruneWorkoutCache(maxAgeDays) {
  const MAX_CACHED_WORKOUTS = 100;

  try {
    const db = await openDB('musclemap-cache', 1);
    if (!db.objectStoreNames.contains('workouts')) return;

    const tx = db.transaction('workouts', 'readwrite');
    const store = tx.objectStore('workouts');
    const items = await store.getAll();

    // Sort by date descending and delete old ones
    const sorted = items.sort((a, b) => {
      const dateA = new Date(a.completedAt || a.createdAt);
      const dateB = new Date(b.completedAt || b.createdAt);
      return dateB - dateA;
    });

    if (sorted.length > MAX_CACHED_WORKOUTS) {
      const toDelete = sorted.slice(MAX_CACHED_WORKOUTS);
      for (const item of toDelete) {
        await store.delete(item.id);
      }
      console.info(`[Storage] Pruned ${toDelete.length} old cached workouts`);
    }

    await tx.done;
  } catch (error) {
    if (error.name !== 'InvalidStateError') {
      console.warn('[Storage] Failed to prune workout cache:', error);
    }
  }
}

/**
 * Prune old entries from the multi-layer cache
 */
async function pruneCacheEntries(cutoffDate) {
  try {
    const db = await openDB('musclemap-multi-cache', 1);
    if (!db.objectStoreNames.contains('entries')) return;

    const tx = db.transaction('entries', 'readwrite');
    const store = tx.objectStore('entries');
    const items = await store.getAll();

    let prunedCount = 0;
    for (const item of items) {
      // Check if expired based on TTL or age
      const itemDate = new Date(item.timestamp || item.createdAt);
      const isExpired = item.expiresAt && new Date(item.expiresAt) < new Date();
      const isTooOld = itemDate < cutoffDate;

      if (isExpired || isTooOld) {
        await store.delete(item.key);
        prunedCount++;
      }
    }

    await tx.done;
    if (prunedCount > 0) {
      console.info(`[Storage] Pruned ${prunedCount} expired cache entries`);
    }
  } catch (error) {
    if (error.name !== 'InvalidStateError') {
      console.warn('[Storage] Failed to prune cache entries:', error);
    }
  }
}

/**
 * Clear all cached data (for troubleshooting or user request)
 * Does NOT clear auth data or pending offline actions
 */
export async function clearAllCaches() {
  try {
    // Clear Apollo cache
    const apolloDb = await openDB('musclemap-apollo-cache', 1);
    if (apolloDb.objectStoreNames.contains('cache')) {
      await apolloDb.clear('cache');
    }

    // Clear multi-layer cache
    const cacheDb = await openDB('musclemap-multi-cache', 1);
    if (cacheDb.objectStoreNames.contains('entries')) {
      await cacheDb.clear('entries');
    }

    // Clear workout cache
    const workoutDb = await openDB('musclemap-cache', 1);
    if (workoutDb.objectStoreNames.contains('workouts')) {
      await workoutDb.clear('workouts');
    }

    // Clear localStorage cache entries (keep auth)
    const keysToRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith('cache:') || key?.startsWith('mm-cache:')) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach((key) => localStorage.removeItem(key));

    console.info('[Storage] All caches cleared');
    return true;
  } catch (error) {
    console.error('[Storage] Failed to clear caches:', error);
    return false;
  }
}

/**
 * Get detailed storage breakdown by database
 */
export async function getStorageBreakdown() {
  const breakdown = {};

  const dbNames = [
    'musclemap-apollo-cache',
    'musclemap-offline',
    'musclemap-multi-cache',
    'musclemap-cache',
  ];

  for (const dbName of dbNames) {
    try {
      const db = await openDB(dbName, 1);
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

  // LocalStorage
  let lsSize = 0;
  let lsCount = 0;
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    const value = localStorage.getItem(key);
    lsSize += (key?.length || 0) + (value?.length || 0);
    lsCount++;
  }
  breakdown['localStorage'] = {
    itemCount: lsCount,
    sizeBytes: lsSize * 2, // UTF-16
    sizeMB: ((lsSize * 2) / (1024 * 1024)).toFixed(2),
  };

  return breakdown;
}
