# Low-Bandwidth & High-Latency Optimization Plan

**Goal**: Make MuscleMap snappy for users with spotty connections, low bandwidth, intermittent connectivity, and high latency.

## Current State Summary

### Already Optimized
- Route-based code splitting (60+ lazy-loaded pages)
- Strategic vendor chunking (React, Three, D3, Apollo separated)
- Service worker with intelligent caching strategies
- Apollo Client with retry logic and cache-first patterns
- Font preloading with non-blocking CSS
- Navigation progress indicators and skeleton loaders
- Route prefetching on hover/focus

### Critical Gaps
- No adaptive loading based on connection speed
- Images not optimized (no lazy loading, no responsive srcset)
- Heavy dependencies (Three.js 808KB, D3 148KB) load regardless of need
- No offline fallback page
- No request batching or deduplication

---

## Implementation Plan

### Phase 1: Quick Wins (High Impact, Low Effort)

#### 1.1 Native Image Lazy Loading
Add `loading="lazy"` to all images not in the viewport on initial load.

**Files to modify:**
- `src/components/Avatar.jsx`
- `src/pages/Exercises.jsx`
- `src/pages/Journey.jsx`
- All pages with images below the fold

```jsx
<img src={url} alt={alt} loading="lazy" decoding="async" />
```

#### 1.2 Create Offline Fallback Page
**File:** `public/offline.html`

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>MuscleMap - Offline</title>
  <style>
    body {
      font-family: Inter, system-ui, sans-serif;
      background: #0a0a0f;
      color: #e5e7eb;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      margin: 0;
      text-align: center;
      padding: 20px;
    }
    h1 { font-size: 2rem; margin-bottom: 1rem; }
    p { color: #9ca3af; max-width: 400px; }
    button {
      margin-top: 2rem;
      padding: 12px 24px;
      background: linear-gradient(135deg, #3b82f6, #8b5cf6);
      border: none;
      border-radius: 8px;
      color: white;
      font-weight: 600;
      cursor: pointer;
    }
    .icon { font-size: 4rem; margin-bottom: 1rem; }
  </style>
</head>
<body>
  <div class="icon">📡</div>
  <h1>You're Offline</h1>
  <p>MuscleMap needs an internet connection. Your workouts are saved locally and will sync when you're back online.</p>
  <button onclick="location.reload()">Try Again</button>
</body>
</html>
```

#### 1.3 Remove Three.js from manualChunks (Let Vite Auto-Split)
This prevents Three.js from being preloaded on pages that don't use it.

**File:** `vite.config.js`

```js
manualChunks: {
  'react-vendor': ['react', 'react-dom', 'react-router-dom'],
  // Remove three-vendor - let Vite auto-split based on actual usage
  'd3-vendor': ['d3'],
  'apollo-vendor': ['@apollo/client', 'graphql'],
  'animation-vendor': ['framer-motion'],
  'icons-vendor': ['lucide-react'],
},
```

---

### Phase 2: Adaptive Loading (Medium Effort, High Impact)

#### 2.1 Network Speed Detection Hook
**File:** `src/hooks/useNetworkStatus.js`

```jsx
import { useState, useEffect } from 'react';

export function useNetworkStatus() {
  const [status, setStatus] = useState({
    online: navigator.onLine,
    effectiveType: navigator.connection?.effectiveType || '4g',
    saveData: navigator.connection?.saveData || false,
    downlink: navigator.connection?.downlink || 10,
    rtt: navigator.connection?.rtt || 50,
  });

  useEffect(() => {
    const connection = navigator.connection;

    const updateStatus = () => {
      setStatus({
        online: navigator.onLine,
        effectiveType: connection?.effectiveType || '4g',
        saveData: connection?.saveData || false,
        downlink: connection?.downlink || 10,
        rtt: connection?.rtt || 50,
      });
    };

    window.addEventListener('online', updateStatus);
    window.addEventListener('offline', updateStatus);
    connection?.addEventListener('change', updateStatus);

    return () => {
      window.removeEventListener('online', updateStatus);
      window.removeEventListener('offline', updateStatus);
      connection?.removeEventListener('change', updateStatus);
    };
  }, []);

  // Derived states for easy consumption
  const isSlowConnection =
    status.effectiveType === '2g' ||
    status.effectiveType === 'slow-2g' ||
    status.saveData ||
    status.downlink < 1.5 ||
    status.rtt > 500;

  const isMediumConnection =
    status.effectiveType === '3g' ||
    status.downlink < 5 ||
    status.rtt > 200;

  return {
    ...status,
    isSlowConnection,
    isMediumConnection,
    isFastConnection: !isSlowConnection && !isMediumConnection,
  };
}
```

#### 2.2 Adaptive Image Component
**File:** `src/components/AdaptiveImage.jsx`

```jsx
import React, { useState, useRef, useEffect } from 'react';
import { useNetworkStatus } from '../hooks/useNetworkStatus';

export default function AdaptiveImage({
  src,
  alt,
  width,
  height,
  className = '',
  placeholder = null,
  lowQualitySrc = null, // Optional low-res version
  priority = false, // Skip lazy loading for above-fold images
}) {
  const { isSlowConnection, saveData } = useNetworkStatus();
  const [isLoaded, setIsLoaded] = useState(false);
  const [isInView, setIsInView] = useState(priority);
  const imgRef = useRef(null);

  // Intersection Observer for lazy loading
  useEffect(() => {
    if (priority || isInView) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      { rootMargin: '200px' }
    );

    if (imgRef.current) observer.observe(imgRef.current);
    return () => observer.disconnect();
  }, [priority, isInView]);

  // On slow connections or save-data mode, use low-quality version
  const imageSrc = (isSlowConnection || saveData) && lowQualitySrc
    ? lowQualitySrc
    : src;

  // Don't render actual image until in view
  if (!isInView) {
    return (
      <div
        ref={imgRef}
        className={`bg-white/5 animate-pulse ${className}`}
        style={{ width, height }}
        role="img"
        aria-label={alt}
      >
        {placeholder}
      </div>
    );
  }

  return (
    <div className={`relative ${className}`} style={{ width, height }}>
      {/* Blur placeholder while loading */}
      {!isLoaded && (
        <div className="absolute inset-0 bg-white/5 animate-pulse" />
      )}
      <img
        src={imageSrc}
        alt={alt}
        width={width}
        height={height}
        loading={priority ? 'eager' : 'lazy'}
        decoding="async"
        onLoad={() => setIsLoaded(true)}
        className={`transition-opacity duration-300 ${isLoaded ? 'opacity-100' : 'opacity-0'}`}
      />
    </div>
  );
}
```

#### 2.3 Conditional Feature Loading
**File:** `src/components/ConditionalFeature.jsx`

```jsx
import React, { Suspense, lazy } from 'react';
import { useNetworkStatus } from '../hooks/useNetworkStatus';

/**
 * Conditionally loads heavy features based on network conditions.
 * Shows a lightweight fallback on slow connections.
 */
export default function ConditionalFeature({
  component: Component,
  fallback: Fallback,
  loadingFallback = null,
  forceLoad = false,
}) {
  const { isSlowConnection, saveData } = useNetworkStatus();

  // On slow connections, show the lightweight fallback
  if ((isSlowConnection || saveData) && !forceLoad && Fallback) {
    return <Fallback />;
  }

  return (
    <Suspense fallback={loadingFallback}>
      <Component />
    </Suspense>
  );
}
```

#### 2.4 Update Landing Page to Use Adaptive Loading
**File:** `src/pages/Landing.jsx` (update muscle map section)

```jsx
import { useNetworkStatus } from '../hooks/useNetworkStatus';

// In component:
const { isSlowConnection, saveData } = useNetworkStatus();

// Replace the MuscleMapD3 section with:
{isMuscleMapInView ? (
  isSlowConnection || saveData ? (
    // Static image fallback for slow connections
    <div className="w-[300px] h-[450px] flex items-center justify-center bg-gradient-to-b from-red-500/10 to-orange-500/10 rounded-xl">
      <img
        src="/muscle-map-preview.png"
        alt="Muscle activation visualization"
        width={280}
        height={420}
        className="rounded-lg"
      />
    </div>
  ) : (
    <Suspense fallback={<MuscleMapSkeleton />}>
      <MuscleMapD3 ... />
    </Suspense>
  )
) : (
  <MuscleMapSkeleton />
)}
```

---

### Phase 3: Request Optimization (Medium Effort)

#### 3.1 Add GraphQL Request Batching
**File:** `src/graphql/client.js`

```js
import { BatchHttpLink } from '@apollo/client/link/batch-http';

// Replace HttpLink with BatchHttpLink
const httpLink = new BatchHttpLink({
  uri: API_URL,
  batchMax: 10, // Max queries per batch
  batchInterval: 20, // Wait 20ms to batch requests
  credentials: 'include',
});
```

#### 3.2 Add Request Debouncing Hook
**File:** `src/hooks/useDebouncedQuery.js`

```jsx
import { useState, useEffect, useRef } from 'react';
import { useLazyQuery } from '@apollo/client';

export function useDebouncedQuery(query, options = {}, delay = 300) {
  const [variables, setVariables] = useState(options.variables);
  const [execute, result] = useLazyQuery(query, { ...options, variables });
  const timeoutRef = useRef(null);

  const debouncedExecute = (newVariables) => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);

    setVariables(newVariables);
    timeoutRef.current = setTimeout(() => {
      execute({ variables: newVariables });
    }, delay);
  };

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  return [debouncedExecute, result];
}
```

#### 3.3 Add Stale-While-Revalidate Pattern to Apollo
**File:** `src/graphql/client.js` (update defaultOptions)

```js
defaultOptions: {
  watchQuery: {
    fetchPolicy: 'cache-and-network',
    nextFetchPolicy: 'cache-first',
    notifyOnNetworkStatusChange: true, // Show loading states on refetch
    returnPartialData: true, // Show cached data immediately
  },
  query: {
    fetchPolicy: 'cache-first',
    errorPolicy: 'all', // Return partial data even with errors
  },
},
```

---

### Phase 4: Offline Support (Higher Effort)

#### 4.1 Update Service Worker for Better Offline Support
**File:** `public/sw.js` (add to fetch handler)

```js
// Add navigation fallback
self.addEventListener('fetch', (event) => {
  const { request } = event;

  // For navigation requests, try network then cache, then offline page
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .catch(() => caches.match(request))
        .catch(() => caches.match('/offline.html'))
    );
    return;
  }

  // ... existing fetch handling
});
```

#### 4.2 Offline Mutation Queue
**File:** `src/utils/offlineQueue.js`

```js
const QUEUE_KEY = 'musclemap-offline-queue';

export const offlineQueue = {
  add(mutation) {
    const queue = this.getAll();
    queue.push({
      id: Date.now(),
      mutation,
      timestamp: new Date().toISOString(),
    });
    localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
  },

  getAll() {
    try {
      return JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]');
    } catch {
      return [];
    }
  },

  remove(id) {
    const queue = this.getAll().filter(item => item.id !== id);
    localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
  },

  clear() {
    localStorage.removeItem(QUEUE_KEY);
  },

  async processQueue(apolloClient) {
    const queue = this.getAll();
    for (const item of queue) {
      try {
        await apolloClient.mutate(item.mutation);
        this.remove(item.id);
      } catch (error) {
        console.error('Failed to process queued mutation:', error);
        // Keep in queue for retry
      }
    }
  },
};

// Process queue when coming back online
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    // Dispatch event for React to handle
    window.dispatchEvent(new CustomEvent('process-offline-queue'));
  });
}
```

#### 4.3 Offline-Aware Mutation Hook
**File:** `src/hooks/useOfflineMutation.js`

```jsx
import { useMutation } from '@apollo/client';
import { useNetworkStatus } from './useNetworkStatus';
import { offlineQueue } from '../utils/offlineQueue';

export function useOfflineMutation(mutation, options = {}) {
  const { online } = useNetworkStatus();
  const [mutate, result] = useMutation(mutation, options);

  const offlineAwareMutate = async (mutationOptions) => {
    if (!online) {
      // Queue for later
      offlineQueue.add({ mutation, ...mutationOptions });

      // Optimistically update cache if optimisticResponse provided
      if (options.optimisticResponse) {
        // Return fake success for UI
        return { data: options.optimisticResponse };
      }

      throw new Error('You are offline. Your changes will sync when you reconnect.');
    }

    return mutate(mutationOptions);
  };

  return [offlineAwareMutate, { ...result, isOffline: !online }];
}
```

---

### Phase 5: Asset Optimization

#### 5.1 Add Brotli Compression Plugin
**File:** `vite.config.js`

```js
import viteCompression from 'vite-plugin-compression';

plugins: [
  react(),
  viteCompression({ algorithm: 'brotliCompress' }),
  viteCompression({ algorithm: 'gzip' }),
],
```

#### 5.2 Create Static Preview Image for D3 Visualization
Generate a static PNG preview of the muscle map for slow connections.

**File:** `public/muscle-map-preview.png` (generate from existing D3 component)

#### 5.3 Add Resource Hints to index.html
**File:** `index.html` (add to head)

```html
<!-- Prefetch likely next pages -->
<link rel="prefetch" href="/assets/Dashboard-*.js" as="script">
<link rel="prefetch" href="/assets/Workout-*.js" as="script">

<!-- Preload critical images -->
<link rel="preload" href="/logo.webp" as="image" type="image/webp">
```

---

### Phase 6: Monitoring & Testing

#### 6.1 Add Network Simulation to Dev Mode
**File:** `src/main.jsx` (development only)

```jsx
// Simulate slow network in development
if (import.meta.env.DEV && new URLSearchParams(location.search).has('slow')) {
  const originalFetch = window.fetch;
  window.fetch = async (...args) => {
    await new Promise(r => setTimeout(r, 2000)); // 2s delay
    return originalFetch(...args);
  };
}
```

#### 6.2 Add Performance Budget Check
**File:** `package.json` (add script)

```json
{
  "scripts": {
    "perf:check": "bundlesize",
    "perf:analyze": "ANALYZE=true vite build && open dist/stats.html"
  }
}
```

**File:** `bundlesize.config.json`

```json
{
  "files": [
    { "path": "dist/assets/index-*.js", "maxSize": "80 kB" },
    { "path": "dist/assets/react-vendor-*.js", "maxSize": "60 kB" },
    { "path": "dist/assets/Landing-*.js", "maxSize": "60 kB" }
  ]
}
```

---

## Implementation Priority

### Immediate (Do First)
1. Create `public/offline.html`
2. Add `loading="lazy"` to images
3. Create `useNetworkStatus` hook
4. Update Landing page to skip D3 on slow connections

### Short Term (This Week)
5. Create `AdaptiveImage` component
6. Add GraphQL batch link
7. Update vite.config.js (remove Three from manual chunks, add compression)
8. Create static muscle map preview image

### Medium Term (Next Sprint)
9. Create `useOfflineMutation` hook
10. Add offline queue system
11. Update service worker for better fallbacks
12. Add performance monitoring

### Long Term (Backlog)
13. Implement proper image CDN with responsive variants
14. Add server-side rendering for critical pages
15. Implement edge caching strategy
16. Add predictive prefetching based on user patterns

---

## Expected Impact

| Metric | Current | Target | Impact |
|--------|---------|--------|--------|
| LCP (3G) | 5.7s | <3s | 47% faster |
| TTI (3G) | 5.7s | <4s | 30% faster |
| Bundle (slow conn) | 800KB+ | <200KB | 75% smaller |
| Offline UX | Broken | Graceful | Major improvement |
| Data usage | Full | 50-70% | Save data mode |

---

## Testing Checklist

- [ ] Test on Chrome DevTools "Slow 3G" preset
- [ ] Test on Chrome DevTools "Offline" mode
- [ ] Test with `?slow` query param in dev mode
- [ ] Test save-data header (Chrome: chrome://flags/#enable-save-data-header)
- [ ] Test on actual slow connection (throttle router)
- [ ] Test with intermittent connectivity (toggle WiFi)
- [ ] Test service worker update flow
- [ ] Test offline mutation queue

---

## Files Changed Summary

### New Files
- `public/offline.html`
- `public/muscle-map-preview.png`
- `src/hooks/useNetworkStatus.js`
- `src/hooks/useDebouncedQuery.js`
- `src/hooks/useOfflineMutation.js`
- `src/components/AdaptiveImage.jsx`
- `src/components/ConditionalFeature.jsx`
- `src/utils/offlineQueue.js`
- `bundlesize.config.json`

### Modified Files
- `vite.config.js` - Remove Three.js manual chunk, add compression
- `src/graphql/client.js` - Add batch link, update fetch policies
- `src/pages/Landing.jsx` - Add adaptive D3 loading
- `public/sw.js` - Add offline fallback routing
- `index.html` - Add resource hints
- `package.json` - Add perf scripts
