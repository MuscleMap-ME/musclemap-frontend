/**
 * Offline IndexedDB Utilities
 *
 * Client-side utilities for interacting with the offline IndexedDB database.
 * This module provides a clean API for managing offline data including:
 * - Exercise database caching (30+ days)
 * - Pending workouts and sets
 * - Sync queue operations
 * - User data caching
 *
 * The service worker also manages this database, so this module provides
 * convenience methods for direct access from React components.
 */

// ============================================
// DATABASE CONFIGURATION
// ============================================

const DB_NAME = 'musclemap-offline';
const DB_VERSION = 3;

const STORES = {
  PENDING_REQUESTS: 'pending-requests',
  EXERCISES: 'exercises',
  PENDING_WORKOUTS: 'pending-workouts',
  PENDING_SETS: 'pending-sets',
  SYNC_QUEUE: 'sync-queue',
  USER_DATA: 'user-data',
  SYNC_METADATA: 'sync-metadata',
  CONFLICTS: 'conflicts',
};

// ============================================
// DATABASE CONNECTION
// ============================================

let dbInstance = null;

/**
 * Open the IndexedDB database
 * Creates stores if they don't exist
 * Returns null if IndexedDB is not available (Brave Shields, private browsing)
 */
export async function openDB() {
  if (dbInstance) {
    return dbInstance;
  }

  return new Promise((resolve, reject) => {
    // Check if IndexedDB is available (Brave Shields blocks it entirely)
    try {
      if (typeof indexedDB === 'undefined') {
        resolve(null);
        return;
      }
    } catch {
      // Brave Shields throws ReferenceError on indexedDB access
      resolve(null);
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      console.error('[OfflineDB] Failed to open database:', request.error);
      reject(request.error);
    };

    request.onsuccess = () => {
      dbInstance = request.result;

      // Handle connection close
      dbInstance.onclose = () => {
        dbInstance = null;
      };

      resolve(dbInstance);
    };

    request.onupgradeneeded = (event) => {
      const db = event.target.result;

      // Create all stores if they don't exist
      if (!db.objectStoreNames.contains(STORES.PENDING_REQUESTS)) {
        const store = db.createObjectStore(STORES.PENDING_REQUESTS, { keyPath: 'id', autoIncrement: true });
        store.createIndex('timestamp', 'timestamp', { unique: false });
        store.createIndex('url', 'url', { unique: false });
      }

      if (!db.objectStoreNames.contains(STORES.EXERCISES)) {
        const store = db.createObjectStore(STORES.EXERCISES, { keyPath: 'id' });
        store.createIndex('name', 'name', { unique: false });
        store.createIndex('primaryMuscle', 'primaryMuscle', { unique: false });
        store.createIndex('equipment', 'equipment', { unique: false });
        store.createIndex('category', 'category', { unique: false });
        store.createIndex('lastUpdated', 'lastUpdated', { unique: false });
      }

      if (!db.objectStoreNames.contains(STORES.PENDING_WORKOUTS)) {
        const store = db.createObjectStore(STORES.PENDING_WORKOUTS, { keyPath: 'localId' });
        store.createIndex('userId', 'userId', { unique: false });
        store.createIndex('createdAt', 'createdAt', { unique: false });
        store.createIndex('syncStatus', 'syncStatus', { unique: false });
      }

      if (!db.objectStoreNames.contains(STORES.PENDING_SETS)) {
        const store = db.createObjectStore(STORES.PENDING_SETS, { keyPath: 'localId' });
        store.createIndex('workoutLocalId', 'workoutLocalId', { unique: false });
        store.createIndex('exerciseId', 'exerciseId', { unique: false });
        store.createIndex('createdAt', 'createdAt', { unique: false });
        store.createIndex('syncStatus', 'syncStatus', { unique: false });
      }

      if (!db.objectStoreNames.contains(STORES.SYNC_QUEUE)) {
        const store = db.createObjectStore(STORES.SYNC_QUEUE, { keyPath: 'id', autoIncrement: true });
        store.createIndex('timestamp', 'timestamp', { unique: false });
        store.createIndex('operation', 'operation', { unique: false });
        store.createIndex('status', 'status', { unique: false });
        store.createIndex('priority', 'priority', { unique: false });
      }

      if (!db.objectStoreNames.contains(STORES.USER_DATA)) {
        const store = db.createObjectStore(STORES.USER_DATA, { keyPath: 'key' });
        store.createIndex('userId', 'userId', { unique: false });
        store.createIndex('type', 'type', { unique: false });
        store.createIndex('expiresAt', 'expiresAt', { unique: false });
      }

      if (!db.objectStoreNames.contains(STORES.SYNC_METADATA)) {
        db.createObjectStore(STORES.SYNC_METADATA, { keyPath: 'key' });
      }

      if (!db.objectStoreNames.contains(STORES.CONFLICTS)) {
        const store = db.createObjectStore(STORES.CONFLICTS, { keyPath: 'id', autoIncrement: true });
        store.createIndex('resourceType', 'resourceType', { unique: false });
        store.createIndex('resourceId', 'resourceId', { unique: false });
        store.createIndex('createdAt', 'createdAt', { unique: false });
        store.createIndex('resolved', 'resolved', { unique: false });
      }
    };
  });
}

/**
 * Close database connection
 */
export function closeDB() {
  if (dbInstance) {
    dbInstance.close();
    dbInstance = null;
  }
}

// ============================================
// GENERIC STORE OPERATIONS
// ============================================

/**
 * Get all items from a store
 */
async function getAll(storeName) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readonly');
    const store = transaction.objectStore(storeName);
    const request = store.getAll();

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Get item by key
 */
async function getByKey(storeName, key) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readonly');
    const store = transaction.objectStore(storeName);
    const request = store.get(key);

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Get items by index
 */
async function getByIndex(storeName, indexName, value) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readonly');
    const store = transaction.objectStore(storeName);
    const index = store.index(indexName);
    const request = index.getAll(value);

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Put item in store
 */
async function put(storeName, item) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readwrite');
    const store = transaction.objectStore(storeName);
    const request = store.put(item);

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Add item to store
 */
async function add(storeName, item) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readwrite');
    const store = transaction.objectStore(storeName);
    const request = store.add(item);

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Delete item by key
 */
async function deleteByKey(storeName, key) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readwrite');
    const store = transaction.objectStore(storeName);
    const request = store.delete(key);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

/**
 * Clear all items from store
 */
async function clearStore(storeName) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readwrite');
    const store = transaction.objectStore(storeName);
    const request = store.clear();

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

/**
 * Count items in store
 */
async function countItems(storeName) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readonly');
    const store = transaction.objectStore(storeName);
    const request = store.count();

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// ============================================
// EXERCISE OPERATIONS
// ============================================

/**
 * Cache all exercises
 */
export async function cacheExercises(exercises) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORES.EXERCISES, 'readwrite');
    const store = transaction.objectStore(STORES.EXERCISES);

    let completed = 0;
    const total = exercises.length;

    if (total === 0) {
      resolve(0);
      return;
    }

    exercises.forEach((exercise) => {
      const item = {
        ...exercise,
        lastUpdated: Date.now(),
      };
      const request = store.put(item);

      request.onsuccess = () => {
        completed++;
        if (completed === total) {
          resolve(total);
        }
      };

      request.onerror = () => {
        completed++;
        if (completed === total) {
          resolve(completed);
        }
      };
    });

    transaction.onerror = () => reject(transaction.error);
  });
}

/**
 * Get all cached exercises
 */
export async function getCachedExercises() {
  return getAll(STORES.EXERCISES);
}

/**
 * Get exercise by ID
 */
export async function getExerciseById(id) {
  return getByKey(STORES.EXERCISES, id);
}

/**
 * Search exercises by name, muscle, or category
 */
export async function searchExercises(query) {
  const exercises = await getCachedExercises();
  const lowerQuery = query.toLowerCase();

  return exercises.filter((exercise) => {
    return (
      exercise.name?.toLowerCase().includes(lowerQuery) ||
      exercise.primaryMuscle?.toLowerCase().includes(lowerQuery) ||
      exercise.category?.toLowerCase().includes(lowerQuery) ||
      exercise.equipment?.toLowerCase().includes(lowerQuery)
    );
  });
}

/**
 * Get exercises by muscle group
 */
export async function getExercisesByMuscle(muscle) {
  return getByIndex(STORES.EXERCISES, 'primaryMuscle', muscle);
}

/**
 * Get exercises by equipment
 */
export async function getExercisesByEquipment(equipment) {
  return getByIndex(STORES.EXERCISES, 'equipment', equipment);
}

/**
 * Get exercises by category
 */
export async function getExercisesByCategory(category) {
  return getByIndex(STORES.EXERCISES, 'category', category);
}

/**
 * Get exercise cache count
 */
export async function getExerciseCacheCount() {
  return countItems(STORES.EXERCISES);
}

/**
 * Clear exercise cache
 */
export async function clearExerciseCache() {
  return clearStore(STORES.EXERCISES);
}

// ============================================
// PENDING WORKOUT OPERATIONS
// ============================================

/**
 * Save a pending workout
 */
export async function savePendingWorkout(workout) {
  const item = {
    ...workout,
    localId: workout.localId || `local_workout_${Date.now()}`,
    createdAt: Date.now(),
    syncStatus: 'pending',
  };

  await put(STORES.PENDING_WORKOUTS, item);
  return item;
}

/**
 * Get all pending workouts
 */
export async function getPendingWorkouts() {
  return getByIndex(STORES.PENDING_WORKOUTS, 'syncStatus', 'pending');
}

/**
 * Get pending workout by local ID
 */
export async function getPendingWorkoutById(localId) {
  return getByKey(STORES.PENDING_WORKOUTS, localId);
}

/**
 * Update pending workout status
 */
export async function updatePendingWorkoutStatus(localId, status, serverId = null) {
  const workout = await getPendingWorkoutById(localId);
  if (!workout) {
    throw new Error('Workout not found');
  }

  workout.syncStatus = status;
  if (serverId) workout.serverId = serverId;
  workout.syncedAt = Date.now();

  await put(STORES.PENDING_WORKOUTS, workout);
  return workout;
}

/**
 * Delete pending workout
 */
export async function deletePendingWorkout(localId) {
  return deleteByKey(STORES.PENDING_WORKOUTS, localId);
}

/**
 * Get all workouts (pending and synced)
 */
export async function getAllPendingWorkouts() {
  return getAll(STORES.PENDING_WORKOUTS);
}

// ============================================
// PENDING SET OPERATIONS
// ============================================

/**
 * Save a pending set
 */
export async function savePendingSet(set) {
  const item = {
    ...set,
    localId: set.localId || `local_set_${Date.now()}`,
    createdAt: Date.now(),
    syncStatus: 'pending',
  };

  await put(STORES.PENDING_SETS, item);
  return item;
}

/**
 * Get pending sets for a workout
 */
export async function getPendingSetsForWorkout(workoutLocalId) {
  return getByIndex(STORES.PENDING_SETS, 'workoutLocalId', workoutLocalId);
}

/**
 * Get pending set by local ID
 */
export async function getPendingSetById(localId) {
  return getByKey(STORES.PENDING_SETS, localId);
}

/**
 * Update pending set status
 */
export async function updatePendingSetStatus(localId, status, serverId = null) {
  const set = await getPendingSetById(localId);
  if (!set) {
    throw new Error('Set not found');
  }

  set.syncStatus = status;
  if (serverId) set.serverId = serverId;
  set.syncedAt = Date.now();

  await put(STORES.PENDING_SETS, set);
  return set;
}

/**
 * Delete pending set
 */
export async function deletePendingSet(localId) {
  return deleteByKey(STORES.PENDING_SETS, localId);
}

/**
 * Get all pending sets
 */
export async function getAllPendingSets() {
  return getByIndex(STORES.PENDING_SETS, 'syncStatus', 'pending');
}

// ============================================
// SYNC QUEUE OPERATIONS
// ============================================

/**
 * Add operation to sync queue
 */
export async function addToSyncQueue(operation) {
  const item = {
    ...operation,
    timestamp: Date.now(),
    retryCount: 0,
    status: 'pending',
    priority: operation.priority || 'normal',
    nextRetryAt: Date.now(),
  };

  return add(STORES.SYNC_QUEUE, item);
}

/**
 * Get pending sync queue items
 */
export async function getPendingSyncQueue() {
  return getByIndex(STORES.SYNC_QUEUE, 'status', 'pending');
}

/**
 * Get failed sync queue items
 */
export async function getFailedSyncQueue() {
  return getByIndex(STORES.SYNC_QUEUE, 'status', 'failed');
}

/**
 * Get sync queue item by ID
 */
export async function getSyncQueueItem(id) {
  return getByKey(STORES.SYNC_QUEUE, id);
}

/**
 * Update sync queue item
 */
export async function updateSyncQueueItem(id, updates) {
  const item = await getSyncQueueItem(id);
  if (!item) {
    throw new Error('Sync queue item not found');
  }

  const updated = { ...item, ...updates };
  await put(STORES.SYNC_QUEUE, updated);
  return updated;
}

/**
 * Remove from sync queue
 */
export async function removeFromSyncQueue(id) {
  return deleteByKey(STORES.SYNC_QUEUE, id);
}

/**
 * Get sync queue count
 */
export async function getSyncQueueCount() {
  return countItems(STORES.SYNC_QUEUE);
}

/**
 * Clear sync queue
 */
export async function clearSyncQueue() {
  return clearStore(STORES.SYNC_QUEUE);
}

// ============================================
// USER DATA OPERATIONS
// ============================================

/**
 * Cache user data
 */
export async function cacheUserData(key, data, userId, type, ttl = 3600000) {
  const item = {
    key,
    data,
    userId,
    type,
    createdAt: Date.now(),
    expiresAt: Date.now() + ttl,
  };

  await put(STORES.USER_DATA, item);
  return item;
}

/**
 * Get cached user data
 */
export async function getCachedUserData(key) {
  const item = await getByKey(STORES.USER_DATA, key);

  if (!item) return null;

  // Check if expired
  if (item.expiresAt && Date.now() > item.expiresAt) {
    await deleteByKey(STORES.USER_DATA, key);
    return null;
  }

  return item.data;
}

/**
 * Get all cached user data for a user
 */
export async function getAllCachedUserData(userId) {
  return getByIndex(STORES.USER_DATA, 'userId', userId);
}

/**
 * Clear cached user data
 */
export async function clearCachedUserData(userId) {
  const items = await getAllCachedUserData(userId);
  for (const item of items) {
    await deleteByKey(STORES.USER_DATA, item.key);
  }
}

/**
 * Clear all expired user data
 */
export async function clearExpiredUserData() {
  const allData = await getAll(STORES.USER_DATA);
  const now = Date.now();

  for (const item of allData) {
    if (item.expiresAt && now > item.expiresAt) {
      await deleteByKey(STORES.USER_DATA, item.key);
    }
  }
}

// ============================================
// SYNC METADATA OPERATIONS
// ============================================

/**
 * Get sync metadata
 */
export async function getSyncMetadata(key) {
  const item = await getByKey(STORES.SYNC_METADATA, key);
  return item?.value;
}

/**
 * Set sync metadata
 */
export async function setSyncMetadata(key, value) {
  await put(STORES.SYNC_METADATA, { key, value, updatedAt: Date.now() });
}

/**
 * Get last sync time
 */
export async function getLastSyncTime() {
  return getSyncMetadata('lastSuccessfulSync');
}

/**
 * Set last sync time
 */
export async function setLastSyncTime(timestamp = Date.now()) {
  return setSyncMetadata('lastSuccessfulSync', timestamp);
}

// ============================================
// CONFLICT OPERATIONS
// ============================================

/**
 * Add a conflict
 */
export async function addConflict(conflict) {
  const item = {
    ...conflict,
    createdAt: Date.now(),
    resolved: false,
  };

  return add(STORES.CONFLICTS, item);
}

/**
 * Get unresolved conflicts
 */
export async function getUnresolvedConflicts() {
  return getByIndex(STORES.CONFLICTS, 'resolved', false);
}

/**
 * Get conflict by ID
 */
export async function getConflictById(id) {
  return getByKey(STORES.CONFLICTS, id);
}

/**
 * Resolve a conflict
 */
export async function resolveConflict(id, resolution) {
  const conflict = await getConflictById(id);
  if (!conflict) {
    throw new Error('Conflict not found');
  }

  conflict.resolved = true;
  conflict.resolution = resolution;
  conflict.resolvedAt = Date.now();

  await put(STORES.CONFLICTS, conflict);
  return conflict;
}

/**
 * Delete conflict
 */
export async function deleteConflict(id) {
  return deleteByKey(STORES.CONFLICTS, id);
}

/**
 * Get conflict count
 */
export async function getConflictCount() {
  return countItems(STORES.CONFLICTS);
}

/**
 * Clear all resolved conflicts
 */
export async function clearResolvedConflicts() {
  const conflicts = await getAll(STORES.CONFLICTS);
  for (const conflict of conflicts) {
    if (conflict.resolved) {
      await deleteByKey(STORES.CONFLICTS, conflict.id);
    }
  }
}

// ============================================
// DATABASE UTILITIES
// ============================================

/**
 * Get database statistics
 */
export async function getDatabaseStats() {
  const [
    exerciseCount,
    pendingWorkouts,
    pendingSets,
    syncQueueCount,
    conflictCount,
  ] = await Promise.all([
    getExerciseCacheCount(),
    countItems(STORES.PENDING_WORKOUTS),
    countItems(STORES.PENDING_SETS),
    getSyncQueueCount(),
    getConflictCount(),
  ]);

  return {
    exercises: exerciseCount,
    pendingWorkouts,
    pendingSets,
    syncQueue: syncQueueCount,
    conflicts: conflictCount,
  };
}

/**
 * Clear all offline data
 */
export async function clearAllOfflineData() {
  await Promise.all([
    clearStore(STORES.PENDING_REQUESTS),
    clearStore(STORES.EXERCISES),
    clearStore(STORES.PENDING_WORKOUTS),
    clearStore(STORES.PENDING_SETS),
    clearStore(STORES.SYNC_QUEUE),
    clearStore(STORES.USER_DATA),
    clearStore(STORES.SYNC_METADATA),
    clearStore(STORES.CONFLICTS),
  ]);
}

/**
 * Export database as JSON
 */
export async function exportDatabase() {
  const [
    exercises,
    pendingWorkouts,
    pendingSets,
    syncQueue,
    userData,
    conflicts,
  ] = await Promise.all([
    getAll(STORES.EXERCISES),
    getAll(STORES.PENDING_WORKOUTS),
    getAll(STORES.PENDING_SETS),
    getAll(STORES.SYNC_QUEUE),
    getAll(STORES.USER_DATA),
    getAll(STORES.CONFLICTS),
  ]);

  return {
    exportedAt: Date.now(),
    version: DB_VERSION,
    data: {
      exercises,
      pendingWorkouts,
      pendingSets,
      syncQueue,
      userData,
      conflicts,
    },
  };
}

/**
 * Import database from JSON
 */
export async function importDatabase(backup) {
  if (backup.version !== DB_VERSION) {
    console.warn('[OfflineDB] Version mismatch, some data may not import correctly');
  }

  const { data } = backup;

  if (data.exercises?.length) {
    await cacheExercises(data.exercises);
  }

  // Import other data stores
  for (const workout of data.pendingWorkouts || []) {
    await put(STORES.PENDING_WORKOUTS, workout);
  }

  for (const set of data.pendingSets || []) {
    await put(STORES.PENDING_SETS, set);
  }

  for (const item of data.userData || []) {
    await put(STORES.USER_DATA, item);
  }

  return true;
}

// Export store names for reference
export { STORES };
