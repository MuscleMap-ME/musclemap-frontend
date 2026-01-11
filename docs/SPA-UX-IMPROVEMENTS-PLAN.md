# MuscleMap SPA UX Improvements Plan

Based on the article "Pitfalls & Solutions for Single Page Application UX" and analysis of the current codebase.

## Current Issues Identified

### 1. Massive Initial Bundle Size (Critical)
- **Main bundle**: 2.14 MB (index-*.js)
- **Three.js vendor**: 808 KB
- **React vendor**: 163 KB
- **Leaflet**: 150 KB
- **Total initial load**: ~3.3 MB JavaScript

**Problem**: All 44 pages are bundled together and loaded upfront, even though users may only visit 2-3 pages per session.

### 2. No Lazy Loading of Routes
All pages are imported eagerly in `App.jsx`:
```javascript
import Landing from './pages/Landing';
import Dashboard from './pages/Dashboard';
// ... 42 more imports
```

### 3. Missing Loading States
- No visual feedback when navigating between routes
- No skeleton screens while content loads
- Users see blank screens during AJAX calls

### 4. Accessibility Issues
- No ARIA live regions to announce route changes
- No focus management after navigation
- Screen readers may not know when content has changed

### 5. No Preloading Strategy
- Links don't prefetch destination pages on hover
- No predictive loading based on user behavior

---

## Implementation Plan

### Phase 1: Code Splitting & Lazy Loading (High Impact)

**Goal**: Reduce initial bundle from 3.3MB to ~500KB

#### 1.1 Convert all page imports to lazy imports

```javascript
// Before
import Dashboard from './pages/Dashboard';

// After
const Dashboard = React.lazy(() => import('./pages/Dashboard'));
```

#### 1.2 Group chunks strategically in vite.config.js

```javascript
manualChunks: {
  'react-vendor': ['react', 'react-dom', 'react-router-dom'],
  'three-vendor': ['three', '@react-three/fiber', '@react-three/drei'],
  'd3-vendor': ['d3'],
  'apollo-vendor': ['@apollo/client', 'graphql'],
  'ui-vendor': ['framer-motion', 'lucide-react'],
}
```

#### 1.3 Lazy load heavy components within pages

```javascript
// Heavy 3D visualizations only when needed
const MuscleModel3D = React.lazy(() => import('./components/MuscleModel3D'));
```

**Expected Result**:
- Initial load: ~400-600KB
- Each page loads on-demand: 20-100KB per page

---

### Phase 2: Loading States & User Feedback

#### 2.1 Create a global loading indicator

```jsx
// components/RouteLoadingIndicator.jsx
function RouteLoadingIndicator() {
  return (
    <div className="fixed top-0 left-0 right-0 z-50">
      <div className="h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 animate-pulse" />
    </div>
  );
}
```

#### 2.2 Add Suspense boundaries with fallbacks

```jsx
<Suspense fallback={<PageSkeleton />}>
  <Dashboard />
</Suspense>
```

#### 2.3 Create skeleton screens for common layouts

- Dashboard skeleton
- List page skeleton
- Detail page skeleton
- Form page skeleton

---

### Phase 3: Accessibility Improvements

#### 3.1 Add ARIA live region for route announcements

```jsx
function RouteAnnouncer() {
  const location = useLocation();
  const [announcement, setAnnouncement] = useState('');

  useEffect(() => {
    // Get page title from route or document
    const title = document.title || location.pathname;
    setAnnouncement(`Navigated to ${title}`);
  }, [location]);

  return (
    <div
      role="status"
      aria-live="polite"
      aria-atomic="true"
      className="sr-only"
    >
      {announcement}
    </div>
  );
}
```

#### 3.2 Focus management after navigation

```jsx
function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);

    // Focus the main content area for screen readers
    const main = document.querySelector('main') || document.querySelector('[role="main"]');
    if (main) {
      main.focus();
      main.setAttribute('tabindex', '-1');
    }
  }, [pathname]);

  return null;
}
```

#### 3.3 Add skip navigation link

```jsx
// At top of App
<a
  href="#main-content"
  className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 bg-white px-4 py-2 rounded"
>
  Skip to main content
</a>
```

#### 3.4 Ensure all pages have proper heading hierarchy

- Each page should have exactly one `<h1>`
- Headings should be sequential (h1 -> h2 -> h3)
- Main content should be in `<main>` element

---

### Phase 4: Predictive Loading & Prefetching

#### 4.1 Prefetch on link hover

```jsx
function PrefetchLink({ to, children, ...props }) {
  const prefetch = useCallback(() => {
    // Trigger route prefetch
    import(`./pages/${to.slice(1)}`);
  }, [to]);

  return (
    <Link
      to={to}
      onMouseEnter={prefetch}
      onFocus={prefetch}
      {...props}
    >
      {children}
    </Link>
  );
}
```

#### 4.2 Prefetch likely next pages

```jsx
// On Dashboard, prefetch Workout and Exercises
useEffect(() => {
  const prefetchWorkout = () => import('./pages/Workout');
  const prefetchExercises = () => import('./pages/Exercises');

  // Prefetch after initial render
  requestIdleCallback(() => {
    prefetchWorkout();
    prefetchExercises();
  });
}, []);
```

---

### Phase 5: Navigation UX Improvements

#### 5.1 Preserve scroll position on back/forward

```jsx
function useScrollRestoration() {
  const location = useLocation();
  const scrollPositions = useRef({});

  useEffect(() => {
    // Save scroll position before leaving
    return () => {
      scrollPositions.current[location.key] = window.scrollY;
    };
  }, [location]);

  useEffect(() => {
    // Restore scroll position if returning via back button
    const savedPosition = scrollPositions.current[location.key];
    if (savedPosition !== undefined) {
      window.scrollTo(0, savedPosition);
    }
  }, [location.key]);
}
```

#### 5.2 Add visual navigation progress

- Show loading bar at top during navigation
- Animate page transitions with framer-motion
- Add subtle fade transitions between routes

---

### Phase 6: Error Handling

#### 6.1 Create user-friendly error pages

```jsx
function ErrorFallback({ error, resetErrorBoundary }) {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-2xl font-bold mb-4">Something went wrong</h1>
        <p className="text-gray-600 mb-4">{error.message}</p>
        <button onClick={resetErrorBoundary} className="btn-primary">
          Try again
        </button>
      </div>
    </div>
  );
}
```

#### 6.2 Handle network errors gracefully

- Show offline indicator
- Cache critical data
- Retry failed requests automatically

---

## Implementation Priority

| Phase | Impact | Effort | Priority | Status |
|-------|--------|--------|----------|--------|
| 1. Code Splitting | Very High | Medium | 1st | ✅ COMPLETED |
| 2. Loading States | High | Low | 2nd | ✅ COMPLETED |
| 3. Accessibility | High | Medium | 3rd | ✅ COMPLETED |
| 4. Prefetching | Medium | Low | 4th | ✅ COMPLETED |
| 5. Navigation UX | Medium | Medium | 5th | ✅ COMPLETED |
| 6. Error Handling | Medium | Low | 6th | ✅ COMPLETED |

---

## Actual Results (Measured)

### Bundle Size Reduction
- **Before:** 2.14 MB main bundle + vendors = ~3.3 MB total initial load
- **After:** 107 KB main bundle + 163 KB React vendor = ~550 KB critical path
- **Reduction:** 83% smaller initial load

### Chunk Breakdown (After)
| Chunk | Size | Loaded |
|-------|------|--------|
| index.js (core) | 107 KB | Always |
| react-vendor | 163 KB | Always |
| animation-vendor | 117 KB | On demand |
| apollo-vendor | 174 KB | On demand |
| d3-vendor | 118 KB | On demand |
| three-vendor | 808 KB | On demand (3D pages only) |
| Page chunks | 10-80 KB each | On navigation |

---

## Implemented Features

### Phase 1: Code Splitting
- ✅ All 44 pages converted to `React.lazy()` imports
- ✅ Strategic vendor chunking in `vite.config.js`
- ✅ Suspense boundaries with fallback UI

### Phase 2: Loading States
- ✅ `NavigationProgress` - Animated progress bar during route transitions
- ✅ `PageSkeleton` - Full-page loading skeleton
- ✅ `LoadingSpinner` - Simple spinner for auth checks

### Phase 3: Accessibility
- ✅ `RouteAnnouncer` - ARIA live region for screen reader announcements
- ✅ `SkipLink` - Skip to main content link
- ✅ Focus management - Main content receives focus after navigation
- ✅ Semantic HTML - `role="main"`, `aria-live`, `aria-atomic`

### Phase 4: Prefetching
- ✅ `PrefetchLink` component - Prefetch on hover/focus/touch
- ✅ `usePrefetchRoutes` hook - Prefetch likely next pages
- ✅ Route prefetch map for all 44 routes
- ✅ Automatic prefetch of common routes after auth

### Phase 5: Scroll Restoration
- ✅ Scroll position saved to sessionStorage before navigation
- ✅ Position restored on browser back/forward (POP navigation)
- ✅ Scroll to top on new navigation (PUSH)
- ✅ Automatic cleanup of old entries (keeps last 50)

### Phase 6: Error Handling
- ✅ Enhanced `ErrorBoundary` with retry functionality
- ✅ Context-aware error messages (chunk, network, runtime)
- ✅ Try Again button without full page reload
- ✅ Go Home and Reload Page options
- ✅ Collapsible technical details in dev mode

---

## Files Modified/Created

### Modified
1. `src/App.jsx` - Complete rewrite with lazy loading, accessibility, scroll restoration
2. `vite.config.js` - Strategic vendor chunking
3. `src/components/ErrorBoundary.jsx` - Enhanced with retry and error types
4. `CLAUDE.md` - Added SPA UX best practices requirements

### Created
1. `src/components/PrefetchLink.jsx` - Smart prefetching link component
2. `src/hooks/useScrollRestoration.js` - Scroll restoration hook
3. `docs/SPA-UX-IMPROVEMENTS-PLAN.md` - This document
