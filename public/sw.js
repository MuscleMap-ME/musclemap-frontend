/**
 * MuscleMap Service Worker v4
 *
 * Advanced PWA functionality with:
 * - Multi-strategy caching (cache-first, network-first, stale-while-revalidate)
 * - Offline queue with Background Sync for mutations
 * - GraphQL request batching
 * - Adaptive caching based on connection type
 * - Precaching of critical assets
 * - Enhanced IndexedDB schema for extended offline support (30+ days)
 * - Exercise database caching
 * - Conflict resolution support
 */

const CACHE_VERSION = 'v5';
const STATIC_CACHE = `musclemap-static-${CACHE_VERSION}`;
const DYNAMIC_CACHE = `musclemap-dynamic-${CACHE_VERSION}`;
const API_CACHE = `musclemap-api-${CACHE_VERSION}`;
const OFFLINE_QUEUE = 'musclemap-offline-queue';

// Assets to precache on install
const PRECACHE_ASSETS = [
  '/',
  '/offline.html',
  '/manifest.json',
  '/logo.webp',
];

// Cache duration limits (in milliseconds)
const CACHE_DURATIONS = {
  static: 7 * 24 * 60 * 60 * 1000,    // 7 days
  api: 5 * 60 * 1000,                  // 5 minutes
  graphql: 60 * 1000,                  // 1 minute
  dynamic: 24 * 60 * 60 * 1000,        // 24 hours
  reference: 60 * 60 * 1000,           // 1 hour (exercises, muscles, etc.)
  exercises: 30 * 24 * 60 * 60 * 1000, // 30 days (exercise database)
  userData: 7 * 24 * 60 * 60 * 1000,   // 7 days (user-specific cached data)
};

// Sync configuration
const SYNC_CONFIG = {
  maxRetries: 5,
  baseDelay: 1000,       // 1 second
  maxDelay: 300000,      // 5 minutes
  backoffMultiplier: 2,
};

// ============================================
// URL PATTERN MATCHING
// ============================================

const isStaticAsset = (url) => {
  const staticExtensions = /\.(js|css|woff2?|ttf|eot|ico|png|jpg|jpeg|gif|svg|webp|avif)$/i;
  return staticExtensions.test(url.pathname);
};

const isApiRequest = (url) => {
  // Check for same-origin /api/ paths first (most common)
  if (url.pathname.startsWith('/api/')) return true;

  // Support both subdomain (api.musclemap.me) and same-origin patterns
  // This handles VPNs, proxies, and different deployment configurations
  const apiHosts = ['api.musclemap.me', 'musclemap.me', 'localhost'];
  const isKnownHost = apiHosts.some(host =>
    url.hostname === host || url.hostname.endsWith('.' + host)
  );

  return isKnownHost && (
    url.pathname.startsWith('/api/') ||
    url.pathname.startsWith('/graphql')
  );
};

const isGraphQLRequest = (url) => {
  // Support both same-origin and cross-origin GraphQL endpoints
  return url.pathname === '/api/graphql' ||
         url.pathname === '/graphql' ||
         url.pathname.endsWith('/graphql');
};

const isFontRequest = (url) => {
  return url.hostname === 'fonts.googleapis.com' ||
         url.hostname === 'fonts.gstatic.com';
};

const isNavigationRequest = (request) => {
  return request.mode === 'navigate';
};

const isMutationRequest = (request) => {
  return request.method === 'POST' || request.method === 'PUT' ||
         request.method === 'PATCH' || request.method === 'DELETE';
};

const isExerciseRequest = (url) => {
  return url.pathname.includes('/exercises') ||
         url.pathname.includes('/api/exercises');
};

// ============================================
// ENHANCED INDEXEDDB FOR OFFLINE SUPPORT
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

/**
 * Check if IndexedDB is available
 * Brave Shields makes indexedDB undefined (not a ReferenceError)
 */
function isIndexedDBAvailable() {
  try {
    if (typeof indexedDB === 'undefined' || indexedDB === null) {
      return false;
    }
    // Also check if IDBFactory exists (Brave makes this undefined too)
    if (typeof IDBFactory === 'undefined') {
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

/**
 * Open the IndexedDB database with all stores
 * Returns null if IndexedDB is not available (Brave Shields, private browsing)
 */
function openDB() {
  return new Promise((resolve, reject) => {
    // Check if IndexedDB is available (Brave Shields blocks it entirely)
    if (!isIndexedDBAvailable()) {
      resolve(null);
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      const oldVersion = event.oldVersion;

      // Pending requests store (legacy support)
      if (!db.objectStoreNames.contains(STORES.PENDING_REQUESTS)) {
        const pendingStore = db.createObjectStore(STORES.PENDING_REQUESTS, { keyPath: 'id', autoIncrement: true });
        pendingStore.createIndex('timestamp', 'timestamp', { unique: false });
        pendingStore.createIndex('url', 'url', { unique: false });
      }

      // Exercises store - full exercise database cache
      if (!db.objectStoreNames.contains(STORES.EXERCISES)) {
        const exerciseStore = db.createObjectStore(STORES.EXERCISES, { keyPath: 'id' });
        exerciseStore.createIndex('name', 'name', { unique: false });
        exerciseStore.createIndex('primaryMuscle', 'primaryMuscle', { unique: false });
        exerciseStore.createIndex('equipment', 'equipment', { unique: false });
        exerciseStore.createIndex('category', 'category', { unique: false });
        exerciseStore.createIndex('lastUpdated', 'lastUpdated', { unique: false });
      }

      // Pending workouts - workouts logged offline
      if (!db.objectStoreNames.contains(STORES.PENDING_WORKOUTS)) {
        const workoutStore = db.createObjectStore(STORES.PENDING_WORKOUTS, { keyPath: 'localId' });
        workoutStore.createIndex('userId', 'userId', { unique: false });
        workoutStore.createIndex('createdAt', 'createdAt', { unique: false });
        workoutStore.createIndex('syncStatus', 'syncStatus', { unique: false });
      }

      // Pending sets - sets logged offline
      if (!db.objectStoreNames.contains(STORES.PENDING_SETS)) {
        const setStore = db.createObjectStore(STORES.PENDING_SETS, { keyPath: 'localId' });
        setStore.createIndex('workoutLocalId', 'workoutLocalId', { unique: false });
        setStore.createIndex('exerciseId', 'exerciseId', { unique: false });
        setStore.createIndex('createdAt', 'createdAt', { unique: false });
        setStore.createIndex('syncStatus', 'syncStatus', { unique: false });
      }

      // Sync queue - all pending mutations
      if (!db.objectStoreNames.contains(STORES.SYNC_QUEUE)) {
        const syncStore = db.createObjectStore(STORES.SYNC_QUEUE, { keyPath: 'id', autoIncrement: true });
        syncStore.createIndex('timestamp', 'timestamp', { unique: false });
        syncStore.createIndex('operation', 'operation', { unique: false });
        syncStore.createIndex('status', 'status', { unique: false });
        syncStore.createIndex('priority', 'priority', { unique: false });
        syncStore.createIndex('retryCount', 'retryCount', { unique: false });
      }

      // User data cache
      if (!db.objectStoreNames.contains(STORES.USER_DATA)) {
        const userStore = db.createObjectStore(STORES.USER_DATA, { keyPath: 'key' });
        userStore.createIndex('userId', 'userId', { unique: false });
        userStore.createIndex('type', 'type', { unique: false });
        userStore.createIndex('expiresAt', 'expiresAt', { unique: false });
      }

      // Sync metadata - track sync state
      if (!db.objectStoreNames.contains(STORES.SYNC_METADATA)) {
        db.createObjectStore(STORES.SYNC_METADATA, { keyPath: 'key' });
      }

      // Conflicts - track sync conflicts for resolution
      if (!db.objectStoreNames.contains(STORES.CONFLICTS)) {
        const conflictStore = db.createObjectStore(STORES.CONFLICTS, { keyPath: 'id', autoIncrement: true });
        conflictStore.createIndex('resourceType', 'resourceType', { unique: false });
        conflictStore.createIndex('resourceId', 'resourceId', { unique: false });
        conflictStore.createIndex('createdAt', 'createdAt', { unique: false });
        conflictStore.createIndex('resolved', 'resolved', { unique: false });
      }
    };
  });
}

// ============================================
// SYNC QUEUE OPERATIONS
// ============================================

/**
 * Add an operation to the sync queue
 */
async function addToSyncQueue(operation) {
  const db = await openDB();
  if (!db) return null; // IndexedDB not available
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORES.SYNC_QUEUE, 'readwrite');
    const store = transaction.objectStore(STORES.SYNC_QUEUE);

    const item = {
      ...operation,
      timestamp: Date.now(),
      retryCount: 0,
      status: 'pending',
      priority: operation.priority || 'normal',
      nextRetryAt: Date.now(),
    };

    const request = store.add(item);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Get all pending items from sync queue
 */
async function getSyncQueue(status = 'pending') {
  const db = await openDB();
  if (!db) return []; // IndexedDB not available
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORES.SYNC_QUEUE, 'readonly');
    const store = transaction.objectStore(STORES.SYNC_QUEUE);
    const index = store.index('status');
    const request = index.getAll(status);

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Update a sync queue item
 */
async function updateSyncQueueItem(id, updates) {
  const db = await openDB();
  if (!db) return null; // IndexedDB not available
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORES.SYNC_QUEUE, 'readwrite');
    const store = transaction.objectStore(STORES.SYNC_QUEUE);

    const getRequest = store.get(id);
    getRequest.onsuccess = () => {
      const item = getRequest.result;
      if (item) {
        const updated = { ...item, ...updates };
        const putRequest = store.put(updated);
        putRequest.onsuccess = () => resolve(updated);
        putRequest.onerror = () => reject(putRequest.error);
      } else {
        reject(new Error('Item not found'));
      }
    };
    getRequest.onerror = () => reject(getRequest.error);
  });
}

/**
 * Remove an item from sync queue
 */
async function removeFromSyncQueue(id) {
  const db = await openDB();
  if (!db) return; // IndexedDB not available
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORES.SYNC_QUEUE, 'readwrite');
    const store = transaction.objectStore(STORES.SYNC_QUEUE);
    const request = store.delete(id);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

/**
 * Calculate exponential backoff delay
 */
function calculateBackoffDelay(retryCount) {
  const delay = SYNC_CONFIG.baseDelay * Math.pow(SYNC_CONFIG.backoffMultiplier, retryCount);
  return Math.min(delay, SYNC_CONFIG.maxDelay);
}

// ============================================
// EXERCISE DATABASE OPERATIONS
// ============================================

/**
 * Cache exercises in IndexedDB
 */
async function cacheExercises(exercises) {
  const db = await openDB();
  if (!db) return 0; // IndexedDB not available
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
async function getCachedExercises() {
  const db = await openDB();
  if (!db) return []; // IndexedDB not available
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORES.EXERCISES, 'readonly');
    const store = transaction.objectStore(STORES.EXERCISES);
    const request = store.getAll();

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Search exercises in cache
 */
async function searchCachedExercises(query) {
  const exercises = await getCachedExercises();
  const lowerQuery = query.toLowerCase();

  return exercises.filter((exercise) => {
    return exercise.name.toLowerCase().includes(lowerQuery) ||
           (exercise.primaryMuscle && exercise.primaryMuscle.toLowerCase().includes(lowerQuery)) ||
           (exercise.category && exercise.category.toLowerCase().includes(lowerQuery));
  });
}

// ============================================
// PENDING WORKOUT OPERATIONS
// ============================================

/**
 * Save a pending workout
 */
async function savePendingWorkout(workout) {
  const db = await openDB();
  if (!db) return null; // IndexedDB not available
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORES.PENDING_WORKOUTS, 'readwrite');
    const store = transaction.objectStore(STORES.PENDING_WORKOUTS);

    const item = {
      ...workout,
      localId: workout.localId || `local_workout_${Date.now()}`,
      createdAt: Date.now(),
      syncStatus: 'pending',
    };

    const request = store.put(item);
    request.onsuccess = () => resolve(item);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Get all pending workouts
 */
async function getPendingWorkouts() {
  const db = await openDB();
  if (!db) return []; // IndexedDB not available
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORES.PENDING_WORKOUTS, 'readonly');
    const store = transaction.objectStore(STORES.PENDING_WORKOUTS);
    const index = store.index('syncStatus');
    const request = index.getAll('pending');

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Update pending workout sync status
 */
async function updatePendingWorkoutStatus(localId, status, serverId = null) {
  const db = await openDB();
  if (!db) return null; // IndexedDB not available
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORES.PENDING_WORKOUTS, 'readwrite');
    const store = transaction.objectStore(STORES.PENDING_WORKOUTS);
    const request = store.get(localId);

    request.onsuccess = () => {
      const workout = request.result;
      if (workout) {
        workout.syncStatus = status;
        if (serverId) workout.serverId = serverId;
        workout.syncedAt = Date.now();
        const putRequest = store.put(workout);
        putRequest.onsuccess = () => resolve(workout);
        putRequest.onerror = () => reject(putRequest.error);
      } else {
        reject(new Error('Workout not found'));
      }
    };
    request.onerror = () => reject(request.error);
  });
}

// ============================================
// PENDING SETS OPERATIONS
// ============================================

/**
 * Save a pending set
 */
async function savePendingSet(set) {
  const db = await openDB();
  if (!db) return null; // IndexedDB not available
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORES.PENDING_SETS, 'readwrite');
    const store = transaction.objectStore(STORES.PENDING_SETS);

    const item = {
      ...set,
      localId: set.localId || `local_set_${Date.now()}`,
      createdAt: Date.now(),
      syncStatus: 'pending',
    };

    const request = store.put(item);
    request.onsuccess = () => resolve(item);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Get pending sets for a workout
 */
async function getPendingSetsForWorkout(workoutLocalId) {
  const db = await openDB();
  if (!db) return []; // IndexedDB not available
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORES.PENDING_SETS, 'readonly');
    const store = transaction.objectStore(STORES.PENDING_SETS);
    const index = store.index('workoutLocalId');
    const request = index.getAll(workoutLocalId);

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// ============================================
// CONFLICT MANAGEMENT
// ============================================

/**
 * Add a sync conflict
 */
async function addConflict(conflict) {
  const db = await openDB();
  if (!db) return null; // IndexedDB not available
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORES.CONFLICTS, 'readwrite');
    const store = transaction.objectStore(STORES.CONFLICTS);

    const item = {
      ...conflict,
      createdAt: Date.now(),
      resolved: false,
    };

    const request = store.add(item);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Get unresolved conflicts
 */
async function getUnresolvedConflicts() {
  const db = await openDB();
  if (!db) return []; // IndexedDB not available
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORES.CONFLICTS, 'readonly');
    const store = transaction.objectStore(STORES.CONFLICTS);
    const index = store.index('resolved');
    const request = index.getAll(false);

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Resolve a conflict
 */
async function resolveConflict(id, resolution) {
  const db = await openDB();
  if (!db) return null; // IndexedDB not available
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORES.CONFLICTS, 'readwrite');
    const store = transaction.objectStore(STORES.CONFLICTS);
    const request = store.get(id);

    request.onsuccess = () => {
      const conflict = request.result;
      if (conflict) {
        conflict.resolved = true;
        conflict.resolution = resolution;
        conflict.resolvedAt = Date.now();
        const putRequest = store.put(conflict);
        putRequest.onsuccess = () => resolve(conflict);
        putRequest.onerror = () => reject(putRequest.error);
      } else {
        reject(new Error('Conflict not found'));
      }
    };
    request.onerror = () => reject(request.error);
  });
}

// ============================================
// SYNC METADATA OPERATIONS
// ============================================

/**
 * Get sync metadata
 */
async function getSyncMetadata(key) {
  const db = await openDB();
  if (!db) return null; // IndexedDB not available
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORES.SYNC_METADATA, 'readonly');
    const store = transaction.objectStore(STORES.SYNC_METADATA);
    const request = store.get(key);

    request.onsuccess = () => resolve(request.result?.value);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Set sync metadata
 */
async function setSyncMetadata(key, value) {
  const db = await openDB();
  if (!db) return; // IndexedDB not available
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORES.SYNC_METADATA, 'readwrite');
    const store = transaction.objectStore(STORES.SYNC_METADATA);
    const request = store.put({ key, value, updatedAt: Date.now() });

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

// ============================================
// LEGACY SUPPORT - PENDING REQUESTS
// ============================================

async function addToQueue(requestData) {
  const db = await openDB();
  if (!db) return null; // IndexedDB not available
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORES.PENDING_REQUESTS, 'readwrite');
    const store = transaction.objectStore(STORES.PENDING_REQUESTS);

    const request = store.add({
      ...requestData,
      timestamp: Date.now(),
      retryCount: 0,
    });

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function getQueuedRequests() {
  const db = await openDB();
  if (!db) return []; // IndexedDB not available
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORES.PENDING_REQUESTS, 'readonly');
    const store = transaction.objectStore(STORES.PENDING_REQUESTS);
    const request = store.getAll();

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function removeFromQueue(id) {
  const db = await openDB();
  if (!db) return; // IndexedDB not available
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORES.PENDING_REQUESTS, 'readwrite');
    const store = transaction.objectStore(STORES.PENDING_REQUESTS);
    const request = store.delete(id);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

async function updateQueueItem(id, updates) {
  const db = await openDB();
  if (!db) return null; // IndexedDB not available
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORES.PENDING_REQUESTS, 'readwrite');
    const store = transaction.objectStore(STORES.PENDING_REQUESTS);

    const getRequest = store.get(id);
    getRequest.onsuccess = () => {
      const item = getRequest.result;
      if (item) {
        const updated = { ...item, ...updates };
        const putRequest = store.put(updated);
        putRequest.onsuccess = () => resolve(updated);
        putRequest.onerror = () => reject(putRequest.error);
      } else {
        reject(new Error('Item not found'));
      }
    };
    getRequest.onerror = () => reject(getRequest.error);
  });
}

// ============================================
// INSTALL EVENT
// ============================================

self.addEventListener('install', (event) => {
  console.log('[SW] Installing v3...');

  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => {
        console.log('[SW] Precaching essential assets');
        return cache.addAll(PRECACHE_ASSETS);
      })
      .then(() => self.skipWaiting())
  );
});

// ============================================
// ACTIVATE EVENT
// ============================================

self.addEventListener('activate', (event) => {
  console.log('[SW] Activating v3...');

  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((cacheName) => {
              return cacheName.startsWith('musclemap-') &&
                     ![STATIC_CACHE, DYNAMIC_CACHE, API_CACHE].includes(cacheName);
            })
            .map((cacheName) => {
              console.log('[SW] Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            })
        );
      })
      .then(() => self.clients.claim())
      .then(() => {
        // Process any pending offline requests
        return processOfflineQueue();
      })
  );
});

// ============================================
// FETCH EVENT
// ============================================

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Skip chrome-extension and other non-http(s) requests
  if (!url.protocol.startsWith('http')) {
    return;
  }

  // Skip Server-Sent Events (SSE) - they cannot be cached and are streaming responses
  if (url.pathname.endsWith('/events') || event.request.headers.get('Accept') === 'text/event-stream') {
    return;
  }

  // Skip BuildNet daemon requests - they have their own caching
  if (url.pathname.startsWith('/buildnet/')) {
    return;
  }

  // Handle mutations with offline queue
  if (isMutationRequest(event.request) && isApiRequest(url)) {
    event.respondWith(handleMutation(event.request));
    return;
  }

  // Skip non-GET requests that aren't handled above
  if (event.request.method !== 'GET') {
    return;
  }

  // Strategy: Cache-first for fonts
  if (isFontRequest(url)) {
    event.respondWith(cacheFirst(event.request, STATIC_CACHE));
    return;
  }

  // Strategy: Cache-first for static assets
  if (isStaticAsset(url)) {
    event.respondWith(cacheFirst(event.request, STATIC_CACHE));
    return;
  }

  // Strategy: Stale-while-revalidate for exercise data (with IndexedDB fallback)
  if (isExerciseRequest(url)) {
    event.respondWith(handleExerciseRequest(event.request));
    return;
  }

  // Strategy: Stale-while-revalidate for GraphQL queries
  if (isGraphQLRequest(url)) {
    event.respondWith(staleWhileRevalidate(event.request, API_CACHE, CACHE_DURATIONS.graphql));
    return;
  }

  // Strategy: Network-first for other API requests
  if (isApiRequest(url)) {
    event.respondWith(networkFirst(event.request, API_CACHE, CACHE_DURATIONS.api));
    return;
  }

  // Strategy: Network-first for navigation
  if (isNavigationRequest(event.request)) {
    event.respondWith(networkFirst(event.request, DYNAMIC_CACHE, CACHE_DURATIONS.dynamic));
    return;
  }

  // Default: Stale-while-revalidate
  event.respondWith(staleWhileRevalidate(event.request, DYNAMIC_CACHE, CACHE_DURATIONS.dynamic));
});

// ============================================
// CACHING STRATEGIES
// ============================================

/**
 * Cache-first strategy
 * Best for: Static assets that rarely change
 */
async function cacheFirst(request, cacheName) {
  const cachedResponse = await caches.match(request);

  if (cachedResponse) {
    // Update cache in background
    refreshCache(request, cacheName);
    return cachedResponse;
  }

  try {
    const networkResponse = await fetch(request);

    if (networkResponse.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, networkResponse.clone());
    }

    return networkResponse;
  } catch (error) {
    console.error('[SW] Cache-first fetch failed:', error);
    return caches.match('/offline.html');
  }
}

/**
 * Network-first strategy
 * Best for: API requests where freshness matters
 */
async function networkFirst(request, cacheName, maxAge) {
  try {
    const networkResponse = await fetch(request);

    if (networkResponse.ok) {
      const cache = await caches.open(cacheName);

      // Add timestamp for cache expiration
      const headers = new Headers(networkResponse.headers);
      headers.set('sw-cache-time', Date.now().toString());

      const body = await networkResponse.clone().blob();
      const cachedResponse = new Response(body, {
        status: networkResponse.status,
        statusText: networkResponse.statusText,
        headers: headers
      });

      cache.put(request, cachedResponse);
    }

    return networkResponse;
  } catch (error) {
    console.log('[SW] Network failed, trying cache:', request.url);

    const cachedResponse = await caches.match(request);

    if (cachedResponse) {
      return cachedResponse;
    }

    if (request.mode === 'navigate') {
      return caches.match('/offline.html');
    }

    throw error;
  }
}

/**
 * Stale-while-revalidate strategy
 * Best for: Content that can be slightly stale
 */
async function staleWhileRevalidate(request, cacheName, maxAge) {
  const cachedResponse = await caches.match(request);

  const fetchPromise = fetch(request).then(async (networkResponse) => {
    if (networkResponse.ok) {
      const cache = await caches.open(cacheName);

      const headers = new Headers(networkResponse.headers);
      headers.set('sw-cache-time', Date.now().toString());

      const body = await networkResponse.clone().blob();
      const responseToCache = new Response(body, {
        status: networkResponse.status,
        statusText: networkResponse.statusText,
        headers: headers
      });

      cache.put(request, responseToCache);
    }
    return networkResponse;
  }).catch((error) => {
    console.log('[SW] Network failed for stale-while-revalidate:', request.url);
    if (cachedResponse) {
      return cachedResponse;
    }
    throw error;
  });

  // Return cached response immediately, or wait for network
  return cachedResponse || fetchPromise;
}

/**
 * Handle exercise requests with IndexedDB fallback
 */
async function handleExerciseRequest(request) {
  try {
    const networkResponse = await fetch(request);

    if (networkResponse.ok) {
      // Clone response for caching
      const clone = networkResponse.clone();

      // Try to cache exercises in IndexedDB
      try {
        const data = await clone.json();
        if (data.exercises && Array.isArray(data.exercises)) {
          await cacheExercises(data.exercises);
          console.log(`[SW] Cached ${data.exercises.length} exercises to IndexedDB`);
        } else if (Array.isArray(data)) {
          await cacheExercises(data);
          console.log(`[SW] Cached ${data.length} exercises to IndexedDB`);
        }
      } catch (cacheError) {
        console.warn('[SW] Failed to cache exercises to IndexedDB:', cacheError);
      }

      // Also cache in standard cache
      const cache = await caches.open(API_CACHE);
      cache.put(request, networkResponse.clone());

      return networkResponse;
    }

    throw new Error(`Network response not ok: ${networkResponse.status}`);
  } catch (error) {
    console.log('[SW] Exercise request failed, trying IndexedDB:', error.message);

    // Try IndexedDB cache
    try {
      const exercises = await getCachedExercises();
      if (exercises && exercises.length > 0) {
        console.log(`[SW] Serving ${exercises.length} exercises from IndexedDB`);
        return new Response(JSON.stringify({ exercises, fromCache: true }), {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
            'X-Cache-Source': 'indexeddb',
          },
        });
      }
    } catch (idbError) {
      console.warn('[SW] IndexedDB fallback failed:', idbError);
    }

    // Try standard cache
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }

    throw error;
  }
}

/**
 * Background cache refresh
 */
async function refreshCache(request, cacheName) {
  try {
    const networkResponse = await fetch(request);

    if (networkResponse.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, networkResponse.clone());
    }
  } catch (error) {
    // Silently fail - we already have cached response
  }
}

// ============================================
// MUTATION HANDLING (OFFLINE QUEUE)
// ============================================

/**
 * Handle mutation requests with offline queue support
 */
async function handleMutation(request) {
  try {
    const response = await fetch(request.clone());
    return response;
  } catch (error) {
    console.log('[SW] Mutation failed, queuing for later:', request.url);

    // Clone request data for queuing
    const body = await request.clone().text();
    const headers = {};
    request.headers.forEach((value, key) => {
      headers[key] = value;
    });

    // Determine operation type from request
    let operationType = 'unknown';
    const url = new URL(request.url);
    if (url.pathname.includes('/workout')) operationType = 'workout';
    else if (url.pathname.includes('/set')) operationType = 'set';
    else if (url.pathname.includes('/graphql')) operationType = 'graphql';

    // Add to sync queue
    await addToSyncQueue({
      url: request.url,
      method: request.method,
      headers,
      body,
      operation: operationType,
      priority: operationType === 'workout' ? 'high' : 'normal',
    });

    // Also add to legacy queue for compatibility
    await addToQueue({
      url: request.url,
      method: request.method,
      headers,
      body,
    });

    // Register for background sync
    if ('sync' in self.registration) {
      try {
        await self.registration.sync.register('sync-pending-requests');
      } catch (e) {
        console.log('[SW] Background sync registration failed:', e);
      }
    }

    // Return a response indicating the request is queued
    return new Response(
      JSON.stringify({
        queued: true,
        message: 'Request queued for sync when online',
        timestamp: Date.now(),
      }),
      {
        status: 202,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}

// ============================================
// BACKGROUND SYNC
// ============================================

self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-pending-requests') {
    console.log('[SW] Background sync triggered');
    event.waitUntil(processOfflineQueue());
  }
});

/**
 * Process all queued offline requests with exponential backoff
 */
async function processOfflineQueue() {
  // Process new sync queue first
  await processSyncQueue();

  // Then process legacy queue for backwards compatibility
  const requests = await getQueuedRequests();
  console.log(`[SW] Processing ${requests.length} queued requests`);

  for (const item of requests) {
    try {
      const response = await fetch(item.url, {
        method: item.method,
        headers: item.headers,
        body: item.body,
      });

      if (response.ok) {
        await removeFromQueue(item.id);
        console.log('[SW] Successfully synced:', item.url);

        // Notify clients
        const clients = await self.clients.matchAll();
        clients.forEach((client) => {
          client.postMessage({
            type: 'SYNC_SUCCESS',
            url: item.url,
            method: item.method,
          });
        });
      } else if (response.status >= 400 && response.status < 500) {
        // Client error - don't retry
        await removeFromQueue(item.id);
        console.log('[SW] Client error, removed from queue:', item.url);
      } else {
        // Server error - increment retry count
        item.retryCount = (item.retryCount || 0) + 1;
        if (item.retryCount >= SYNC_CONFIG.maxRetries) {
          await removeFromQueue(item.id);
          console.log('[SW] Max retries reached, removed from queue:', item.url);

          // Notify client of failed sync
          const clients = await self.clients.matchAll();
          clients.forEach((client) => {
            client.postMessage({
              type: 'SYNC_FAILED',
              url: item.url,
              method: item.method,
              reason: 'max_retries_exceeded',
            });
          });
        } else {
          await updateQueueItem(item.id, { retryCount: item.retryCount });
        }
      }
    } catch (error) {
      console.log('[SW] Sync failed, will retry later:', item.url);
    }
  }
}

/**
 * Process sync queue with exponential backoff
 */
async function processSyncQueue() {
  const pending = await getSyncQueue('pending');
  const now = Date.now();

  // Sort by priority and timestamp
  pending.sort((a, b) => {
    if (a.priority === 'high' && b.priority !== 'high') return -1;
    if (b.priority === 'high' && a.priority !== 'high') return 1;
    return a.timestamp - b.timestamp;
  });

  console.log(`[SW] Processing ${pending.length} sync queue items`);

  for (const item of pending) {
    // Skip if not ready for retry
    if (item.nextRetryAt > now) {
      continue;
    }

    try {
      const response = await fetch(item.url, {
        method: item.method,
        headers: item.headers,
        body: item.body,
      });

      if (response.ok) {
        // Check for conflicts in response (if JSON response)
        let data = null;
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          try {
            data = await response.clone().json();
          } catch (e) {
            // Response is not valid JSON, treat as success
            console.log('[SW] Response not parseable as JSON, treating as success:', item.url);
          }
        }

        if (data && data.conflict) {
          await addConflict({
            resourceType: item.operation,
            resourceId: data.resourceId,
            localData: JSON.parse(item.body),
            serverData: data.serverData,
            conflictType: data.conflictType,
          });

          await updateSyncQueueItem(item.id, { status: 'conflict' });

          // Notify client
          notifyClients({
            type: 'SYNC_CONFLICT',
            operation: item.operation,
            resourceId: data.resourceId,
          });
        } else {
          await removeFromSyncQueue(item.id);
          console.log('[SW] Sync queue item completed:', item.url);

          notifyClients({
            type: 'SYNC_SUCCESS',
            operation: item.operation,
            url: item.url,
          });
        }
      } else if (response.status === 409) {
        // Conflict response
        let data = {};
        try {
          data = await response.json();
        } catch (e) {
          console.log('[SW] Could not parse 409 conflict response as JSON');
        }
        await addConflict({
          resourceType: item.operation,
          resourceId: data.resourceId || item.id,
          localData: JSON.parse(item.body),
          serverData: data.serverData,
          conflictType: 'server_modified',
        });

        await updateSyncQueueItem(item.id, { status: 'conflict' });

        notifyClients({
          type: 'SYNC_CONFLICT',
          operation: item.operation,
        });
      } else if (response.status >= 400 && response.status < 500) {
        // Client error - don't retry
        await updateSyncQueueItem(item.id, { status: 'failed', error: response.statusText });
        console.log('[SW] Client error in sync queue:', item.url);
      } else {
        // Server error - retry with backoff
        const newRetryCount = item.retryCount + 1;
        if (newRetryCount >= SYNC_CONFIG.maxRetries) {
          await updateSyncQueueItem(item.id, { status: 'failed', error: 'max_retries' });
          notifyClients({
            type: 'SYNC_FAILED',
            operation: item.operation,
            reason: 'max_retries_exceeded',
          });
        } else {
          const backoffDelay = calculateBackoffDelay(newRetryCount);
          await updateSyncQueueItem(item.id, {
            retryCount: newRetryCount,
            nextRetryAt: now + backoffDelay,
          });
          console.log(`[SW] Retry ${newRetryCount}/${SYNC_CONFIG.maxRetries} for:`, item.url);
        }
      }
    } catch (error) {
      console.log('[SW] Network error processing sync queue:', error.message);
      // Will retry on next sync
    }
  }

  // Update last sync time
  await setSyncMetadata('lastSyncAttempt', now);
}

/**
 * Notify all clients with a message
 */
async function notifyClients(message) {
  const clients = await self.clients.matchAll();
  clients.forEach((client) => {
    client.postMessage(message);
  });
}

// ============================================
// MESSAGE HANDLING
// ============================================

self.addEventListener('message', (event) => {
  const { type, payload } = event.data || {};

  switch (type) {
    case 'SKIP_WAITING':
      self.skipWaiting();
      break;

    case 'CLEAR_CACHE':
      event.waitUntil(
        caches.keys().then((cacheNames) => {
          return Promise.all(
            cacheNames
              .filter((name) => name.startsWith('musclemap-'))
              .map((name) => caches.delete(name))
          );
        })
      );
      break;

    case 'GET_QUEUE_STATUS':
      event.waitUntil(
        Promise.all([
          getQueuedRequests(),
          getSyncQueue('pending'),
          getUnresolvedConflicts(),
        ]).then(([legacyRequests, syncQueue, conflicts]) => {
          event.source.postMessage({
            type: 'QUEUE_STATUS',
            count: legacyRequests.length + syncQueue.length,
            pendingRequests: legacyRequests.length,
            syncQueueCount: syncQueue.length,
            conflictCount: conflicts.length,
            requests: legacyRequests.map((r) => ({
              url: r.url,
              method: r.method,
              timestamp: r.timestamp,
            })),
            syncQueue: syncQueue.map((r) => ({
              id: r.id,
              operation: r.operation,
              status: r.status,
              priority: r.priority,
              retryCount: r.retryCount,
              timestamp: r.timestamp,
            })),
            conflicts: conflicts.map((c) => ({
              id: c.id,
              resourceType: c.resourceType,
              resourceId: c.resourceId,
              createdAt: c.createdAt,
            })),
          });
        })
      );
      break;

    case 'FORCE_SYNC':
      event.waitUntil(processOfflineQueue());
      break;

    case 'CACHE_URLS':
      if (payload && Array.isArray(payload.urls)) {
        event.waitUntil(
          caches.open(STATIC_CACHE).then((cache) => {
            return cache.addAll(payload.urls);
          })
        );
      }
      break;

    case 'CACHE_EXERCISES':
      if (payload && Array.isArray(payload.exercises)) {
        event.waitUntil(
          cacheExercises(payload.exercises).then((count) => {
            event.source.postMessage({
              type: 'EXERCISES_CACHED',
              count,
            });
          })
        );
      }
      break;

    case 'GET_CACHED_EXERCISES':
      event.waitUntil(
        getCachedExercises().then((exercises) => {
          event.source.postMessage({
            type: 'CACHED_EXERCISES',
            exercises,
            count: exercises.length,
          });
        })
      );
      break;

    case 'SEARCH_EXERCISES':
      if (payload && payload.query) {
        event.waitUntil(
          searchCachedExercises(payload.query).then((results) => {
            event.source.postMessage({
              type: 'EXERCISE_SEARCH_RESULTS',
              results,
              query: payload.query,
            });
          })
        );
      }
      break;

    case 'SAVE_PENDING_WORKOUT':
      if (payload) {
        event.waitUntil(
          savePendingWorkout(payload).then((workout) => {
            event.source.postMessage({
              type: 'WORKOUT_SAVED',
              workout,
            });
          })
        );
      }
      break;

    case 'GET_PENDING_WORKOUTS':
      event.waitUntil(
        getPendingWorkouts().then((workouts) => {
          event.source.postMessage({
            type: 'PENDING_WORKOUTS',
            workouts,
          });
        })
      );
      break;

    case 'RESOLVE_CONFLICT':
      if (payload && payload.id && payload.resolution) {
        event.waitUntil(
          resolveConflict(payload.id, payload.resolution).then((conflict) => {
            event.source.postMessage({
              type: 'CONFLICT_RESOLVED',
              conflict,
            });
          })
        );
      }
      break;

    case 'GET_SYNC_STATUS':
      event.waitUntil(
        Promise.all([
          getSyncQueue('pending'),
          getSyncQueue('failed'),
          getUnresolvedConflicts(),
          getSyncMetadata('lastSyncAttempt'),
          getSyncMetadata('lastSuccessfulSync'),
        ]).then(([pending, failed, conflicts, lastAttempt, lastSuccess]) => {
          event.source.postMessage({
            type: 'SYNC_STATUS',
            pending: pending.length,
            failed: failed.length,
            conflicts: conflicts.length,
            lastAttempt,
            lastSuccess,
            isOnline: navigator.onLine,
          });
        })
      );
      break;
  }
});

// ============================================
// PERIODIC BACKGROUND SYNC
// ============================================

self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'sync-pending-requests') {
    event.waitUntil(processOfflineQueue());
  }
});

// ============================================
// PUSH NOTIFICATIONS
// ============================================

self.addEventListener('push', (event) => {
  if (!event.data) return;

  try {
    const data = event.data.json();

    const options = {
      body: data.body || 'New notification from MuscleMap',
      icon: '/logo.webp',
      badge: '/logo.webp',
      vibrate: [100, 50, 100],
      data: {
        url: data.url || '/',
      },
      actions: data.actions || [],
    };

    event.waitUntil(
      self.registration.showNotification(data.title || 'MuscleMap', options)
    );
  } catch (error) {
    console.error('[SW] Push notification error:', error);
  }
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const url = event.notification.data?.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Try to focus an existing window
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.navigate(url);
          return client.focus();
        }
      }
      // Open a new window if none exists
      return clients.openWindow(url);
    })
  );
});

console.log('[SW] Service Worker v3 loaded');
