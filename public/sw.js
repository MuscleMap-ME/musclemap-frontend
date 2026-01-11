/**
 * MuscleMap Service Worker
 * Implements intelligent caching strategies for PWA functionality
 *
 * Caching Strategies:
 * - Static assets: Cache-first (fonts, images, JS/CSS bundles)
 * - API requests: Network-first with cache fallback
 * - HTML pages: Network-first for freshness
 */

const CACHE_VERSION = 'v1';
const STATIC_CACHE = `musclemap-static-${CACHE_VERSION}`;
const DYNAMIC_CACHE = `musclemap-dynamic-${CACHE_VERSION}`;
const API_CACHE = `musclemap-api-${CACHE_VERSION}`;

// Assets to precache on install
const PRECACHE_ASSETS = [
  '/',
  '/manifest.json',
  '/logo.png',
];

// Cache duration limits (in milliseconds)
const CACHE_DURATIONS = {
  static: 7 * 24 * 60 * 60 * 1000,  // 7 days for static assets
  api: 5 * 60 * 1000,                // 5 minutes for API responses
  dynamic: 24 * 60 * 60 * 1000,      // 24 hours for dynamic content
};

// URL patterns for different cache strategies
const isStaticAsset = (url) => {
  const staticExtensions = /\.(js|css|woff2?|ttf|eot|ico|png|jpg|jpeg|gif|svg|webp|avif)$/i;
  return staticExtensions.test(url.pathname);
};

const isApiRequest = (url) => {
  return url.pathname.startsWith('/api/') ||
         url.hostname === 'api.musclemap.me';
};

const isFontRequest = (url) => {
  return url.hostname === 'fonts.googleapis.com' ||
         url.hostname === 'fonts.gstatic.com';
};

const isNavigationRequest = (request) => {
  return request.mode === 'navigate';
};

// Install event - precache essential assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => {
        console.log('[SW] Precaching essential assets');
        return cache.addAll(PRECACHE_ASSETS);
      })
      .then(() => self.skipWaiting())
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
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
  );
});

// Fetch event - implement caching strategies
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Skip non-GET requests
  if (event.request.method !== 'GET') {
    return;
  }

  // Skip chrome-extension and other non-http(s) requests
  if (!url.protocol.startsWith('http')) {
    return;
  }

  // Strategy: Cache-first for fonts (they rarely change)
  if (isFontRequest(url)) {
    event.respondWith(cacheFirst(event.request, STATIC_CACHE));
    return;
  }

  // Strategy: Cache-first for static assets (JS, CSS, images)
  if (isStaticAsset(url)) {
    event.respondWith(cacheFirst(event.request, STATIC_CACHE));
    return;
  }

  // Strategy: Network-first for API requests (freshness matters)
  if (isApiRequest(url)) {
    event.respondWith(networkFirst(event.request, API_CACHE, CACHE_DURATIONS.api));
    return;
  }

  // Strategy: Network-first for navigation (HTML pages)
  if (isNavigationRequest(event.request)) {
    event.respondWith(networkFirst(event.request, DYNAMIC_CACHE, CACHE_DURATIONS.dynamic));
    return;
  }

  // Default: Network-first for everything else
  event.respondWith(networkFirst(event.request, DYNAMIC_CACHE, CACHE_DURATIONS.dynamic));
});

/**
 * Cache-first strategy
 * Best for: Static assets that rarely change (fonts, bundled JS/CSS, images)
 */
async function cacheFirst(request, cacheName) {
  const cachedResponse = await caches.match(request);

  if (cachedResponse) {
    // Return cached response and update cache in background
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
    // Return offline fallback if available
    return caches.match('/offline.html');
  }
}

/**
 * Network-first strategy
 * Best for: API requests and dynamic content where freshness matters
 */
async function networkFirst(request, cacheName, maxAge) {
  try {
    const networkResponse = await fetch(request);

    if (networkResponse.ok) {
      const cache = await caches.open(cacheName);

      // Add timestamp for cache expiration
      const responseToCache = networkResponse.clone();
      const headers = new Headers(responseToCache.headers);
      headers.set('sw-cache-time', Date.now().toString());

      const body = await responseToCache.blob();
      const cachedResponse = new Response(body, {
        status: responseToCache.status,
        statusText: responseToCache.statusText,
        headers: headers
      });

      cache.put(request, cachedResponse);
    }

    return networkResponse;
  } catch (error) {
    console.log('[SW] Network request failed, trying cache:', request.url);

    const cachedResponse = await caches.match(request);

    if (cachedResponse) {
      // Check if cache is still valid
      const cacheTime = cachedResponse.headers.get('sw-cache-time');

      if (cacheTime && maxAge) {
        const age = Date.now() - parseInt(cacheTime, 10);
        if (age > maxAge) {
          console.log('[SW] Cached response expired');
          // Still return stale data, but it's marked as potentially outdated
        }
      }

      return cachedResponse;
    }

    // Return offline page for navigation requests
    if (request.mode === 'navigate') {
      const offlinePage = await caches.match('/offline.html');
      if (offlinePage) return offlinePage;
    }

    throw error;
  }
}

/**
 * Background cache refresh (stale-while-revalidate pattern)
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

// Handle messages from the main thread
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }

  if (event.data && event.data.type === 'CLEAR_CACHE') {
    event.waitUntil(
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((name) => name.startsWith('musclemap-'))
            .map((name) => caches.delete(name))
        );
      })
    );
  }
});
