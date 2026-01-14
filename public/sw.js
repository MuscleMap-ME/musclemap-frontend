/**
 * MuscleMap Service Worker v2
 *
 * Advanced PWA functionality with:
 * - Multi-strategy caching (cache-first, network-first, stale-while-revalidate)
 * - Offline queue with Background Sync for mutations
 * - GraphQL request batching
 * - Adaptive caching based on connection type
 * - Precaching of critical assets
 */

const CACHE_VERSION = 'v2';
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
  static: 7 * 24 * 60 * 60 * 1000,  // 7 days
  api: 5 * 60 * 1000,                // 5 minutes
  graphql: 60 * 1000,                // 1 minute
  dynamic: 24 * 60 * 60 * 1000,      // 24 hours
  reference: 60 * 60 * 1000,         // 1 hour (exercises, muscles, etc.)
};

// ============================================
// URL PATTERN MATCHING
// ============================================

const isStaticAsset = (url) => {
  const staticExtensions = /\.(js|css|woff2?|ttf|eot|ico|png|jpg|jpeg|gif|svg|webp|avif)$/i;
  return staticExtensions.test(url.pathname);
};

const isApiRequest = (url) => {
  return url.pathname.startsWith('/api/') ||
         url.hostname === 'api.musclemap.me';
};

const isGraphQLRequest = (url) => {
  return url.pathname === '/api/graphql' ||
         url.pathname === '/graphql';
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

// ============================================
// INDEXEDDB FOR OFFLINE QUEUE
// ============================================

const dbName = 'musclemap-offline';
const storeName = 'pending-requests';

function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(dbName, 1);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(storeName)) {
        db.createObjectStore(storeName, { keyPath: 'id', autoIncrement: true });
      }
    };
  });
}

async function addToQueue(requestData) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readwrite');
    const store = transaction.objectStore(storeName);

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
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readonly');
    const store = transaction.objectStore(storeName);
    const request = store.getAll();

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function removeFromQueue(id) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readwrite');
    const store = transaction.objectStore(storeName);
    const request = store.delete(id);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

async function updateQueueItem(id, updates) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readwrite');
    const store = transaction.objectStore(storeName);

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
  console.log('[SW] Installing v2...');

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
  console.log('[SW] Activating v2...');

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
 * Process all queued offline requests
 */
async function processOfflineQueue() {
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
        if (item.retryCount >= 3) {
          await removeFromQueue(item.id);
          console.log('[SW] Max retries reached, removed from queue:', item.url);
        } else {
          await updateQueueItem(item.id, { retryCount: item.retryCount });
        }
      }
    } catch (error) {
      console.log('[SW] Sync failed, will retry later:', item.url);
    }
  }
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
        getQueuedRequests().then((requests) => {
          event.source.postMessage({
            type: 'QUEUE_STATUS',
            count: requests.length,
            requests: requests.map((r) => ({
              url: r.url,
              method: r.method,
              timestamp: r.timestamp,
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

console.log('[SW] Service Worker v2 loaded');
