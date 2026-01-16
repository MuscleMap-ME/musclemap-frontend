/**
 * PrefetchLink - Smart link that prefetches page on hover/focus
 *
 * Part of MuscleMap's SPA UX improvements.
 * Prefetches the destination page when user hovers or focuses,
 * reducing perceived load time when they click.
 */

import React, { useCallback } from 'react';
import { Link, NavLink } from 'react-router-dom';

// Map routes to their lazy import functions
const routePrefetchMap = {
  '/': () => import('../pages/Landing'),
  '/login': () => import('../pages/Login'),
  '/signup': () => import('../pages/Signup'),
  '/dashboard': () => import('../pages/Dashboard'),
  '/onboarding': () => import('../pages/Onboarding'),
  '/workout': () => import('../pages/Workout'),
  '/journey': () => import('../pages/Journey'),
  '/profile': () => import('../pages/Profile'),
  '/settings': () => import('../pages/Settings'),
  '/progression': () => import('../pages/Progression'),
  '/exercises': () => import('../pages/Exercises'),
  '/stats': () => import('../pages/Stats'),
  '/community': () => import('../pages/CommunityDashboard'),
  '/competitions': () => import('../pages/Competitions'),
  '/locations': () => import('../pages/Locations'),
  '/highfives': () => import('../pages/HighFives'),
  '/messages': () => import('../pages/Messages'),
  '/crews': () => import('../pages/Crews'),
  '/rivals': () => import('../pages/Rivals'),
  '/credits': () => import('../pages/Credits'),
  '/wallet': () => import('../pages/Wallet'),
  '/skins': () => import('../pages/SkinsStore'),
  '/health': () => import('../pages/Health'),
  '/goals': () => import('../pages/Goals'),
  '/limitations': () => import('../pages/Limitations'),
  '/pt-tests': () => import('../pages/PTTests'),
  '/design-system': () => import('../pages/DesignSystem'),
  '/features': () => import('../pages/Features'),
  '/technology': () => import('../pages/Technology'),
  '/science': () => import('../pages/Science'),
  '/design': () => import('../pages/Design'),
  '/docs': () => import('../pages/Docs'),
  '/privacy': () => import('../pages/Privacy'),
  '/skills': () => import('../pages/Skills'),
  '/martial-arts': () => import('../pages/MartialArts'),
  '/issues': () => import('../pages/Issues'),
  '/issues/new': () => import('../pages/NewIssue'),
  '/my-issues': () => import('../pages/MyIssues'),
  '/updates': () => import('../pages/DevUpdates'),
  '/roadmap': () => import('../pages/Roadmap'),
  '/admin-control': () => import('../pages/AdminControl'),
  '/admin/issues': () => import('../pages/AdminIssues'),
  '/admin/monitoring': () => import('../pages/AdminMonitoring'),
};

// Track which routes have been prefetched to avoid duplicate imports
const prefetchedRoutes = new Set();

/**
 * Prefetch a route's JavaScript bundle
 */
export function prefetchRoute(to) {
  // Normalize path (remove trailing slash, handle dynamic routes)
  const basePath = to.split('/').slice(0, 3).join('/');
  const normalizedPath = basePath === '' ? '/' : basePath.replace(/\/$/, '');

  // Skip if already prefetched
  if (prefetchedRoutes.has(normalizedPath)) {
    return;
  }

  // Find matching prefetch function
  const prefetchFn = routePrefetchMap[normalizedPath];

  if (prefetchFn) {
    prefetchedRoutes.add(normalizedPath);
    // Use requestIdleCallback for non-blocking prefetch
    if ('requestIdleCallback' in window) {
      requestIdleCallback(() => prefetchFn());
    } else {
      setTimeout(() => prefetchFn(), 100);
    }
  }
}

/**
 * PrefetchLink - A Link component that prefetches on hover/focus
 */
export function PrefetchLink({ to, children, prefetch = true, ...props }) {
  const handlePrefetch = useCallback(() => {
    if (prefetch && to) {
      prefetchRoute(to);
    }
  }, [to, prefetch]);

  return (
    <Link
      to={to}
      onMouseEnter={handlePrefetch}
      onFocus={handlePrefetch}
      onTouchStart={handlePrefetch}
      {...props}
    >
      {children}
    </Link>
  );
}

/**
 * PrefetchNavLink - A NavLink component that prefetches on hover/focus
 */
export function PrefetchNavLink({ to, children, prefetch = true, ...props }) {
  const handlePrefetch = useCallback(() => {
    if (prefetch && to) {
      prefetchRoute(to);
    }
  }, [to, prefetch]);

  return (
    <NavLink
      to={to}
      onMouseEnter={handlePrefetch}
      onFocus={handlePrefetch}
      onTouchStart={handlePrefetch}
      {...props}
    >
      {children}
    </NavLink>
  );
}

/**
 * Hook to prefetch multiple routes at once
 * Use this on pages where you know users are likely to navigate next
 */
export function usePrefetchRoutes(routes) {
  React.useEffect(() => {
    // Prefetch after initial render is complete
    const prefetchAll = () => {
      routes.forEach(route => prefetchRoute(route));
    };

    if ('requestIdleCallback' in window) {
      requestIdleCallback(prefetchAll);
    } else {
      setTimeout(prefetchAll, 1000);
    }
  }, [routes]);
}

export default PrefetchLink;
