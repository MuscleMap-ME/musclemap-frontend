import React, { useEffect, Suspense, lazy, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigationType } from 'react-router-dom';
import { ApolloProvider } from '@apollo/client/react';
import { apolloClient } from './graphql';
import { UserProvider, useUser } from './contexts/UserContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { LocaleProvider } from './contexts/LocaleContext';
import ErrorBoundary from './components/ErrorBoundary';
import { CompanionProvider, CompanionDock } from './components/mascot';
import { usePrefetchRoutes } from './components/PrefetchLink';
import logger from './utils/logger';

// ============================================
// LAZY LOADED PAGES - Code Splitting
// Each page loads only when needed, reducing initial bundle by ~85%
// ============================================

// Critical path pages (loaded with slightly higher priority)
const Landing = lazy(() => import('./pages/Landing'));
const Login = lazy(() => import('./pages/Login'));
const Signup = lazy(() => import('./pages/Signup'));
const Dashboard = lazy(() => import('./pages/Dashboard'));

// Core feature pages
const Onboarding = lazy(() => import('./pages/Onboarding'));
const Workout = lazy(() => import('./pages/Workout'));
const Journey = lazy(() => import('./pages/Journey'));
const Profile = lazy(() => import('./pages/Profile'));
const Settings = lazy(() => import('./pages/Settings'));
const Progression = lazy(() => import('./pages/Progression'));
const Exercises = lazy(() => import('./pages/Exercises'));
const Stats = lazy(() => import('./pages/Stats'));

// Community pages
const CommunityDashboard = lazy(() => import('./pages/CommunityDashboard'));
const Competitions = lazy(() => import('./pages/Competitions'));
const Locations = lazy(() => import('./pages/Locations'));
const HighFives = lazy(() => import('./pages/HighFives'));
const Messages = lazy(() => import('./pages/Messages'));
const Crews = lazy(() => import('./pages/Crews'));
const Rivals = lazy(() => import('./pages/Rivals'));

// Account & Economy pages
const Credits = lazy(() => import('./pages/Credits'));
const Wallet = lazy(() => import('./pages/Wallet'));
const SkinsStore = lazy(() => import('./pages/SkinsStore'));

// Health pages
const Health = lazy(() => import('./pages/Health'));
const Goals = lazy(() => import('./pages/Goals'));
const Limitations = lazy(() => import('./pages/Limitations'));
const PTTests = lazy(() => import('./pages/PTTests'));

// Public documentation pages
const DesignSystem = lazy(() => import('./pages/DesignSystem'));
const Features = lazy(() => import('./pages/Features'));
const Technology = lazy(() => import('./pages/Technology'));
const Science = lazy(() => import('./pages/Science'));
const Design = lazy(() => import('./pages/Design'));
const Docs = lazy(() => import('./pages/Docs'));
const Privacy = lazy(() => import('./pages/Privacy'));
const Skills = lazy(() => import('./pages/Skills'));
const MartialArts = lazy(() => import('./pages/MartialArts'));

// Issue tracker pages
const Issues = lazy(() => import('./pages/Issues'));
const IssueDetail = lazy(() => import('./pages/IssueDetail'));
const NewIssue = lazy(() => import('./pages/NewIssue'));
const MyIssues = lazy(() => import('./pages/MyIssues'));
const DevUpdates = lazy(() => import('./pages/DevUpdates'));
const Roadmap = lazy(() => import('./pages/Roadmap'));

// Admin pages (rarely accessed)
const AdminControl = lazy(() => import('./pages/AdminControl'));
const AdminIssues = lazy(() => import('./pages/AdminIssues'));
const AdminMonitoring = lazy(() => import('./pages/AdminMonitoring'));

// ============================================
// LOADING COMPONENTS
// ============================================

// Top navigation progress bar - shows during route transitions
function NavigationProgress({ isNavigating }) {
  if (!isNavigating) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-[9999] h-1 bg-black/20">
      <div
        className="h-full bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 animate-pulse"
        style={{
          animation: 'progress 1s ease-in-out infinite',
          width: '100%',
        }}
      />
      <style>{`
        @keyframes progress {
          0% { transform: translateX(-100%); }
          50% { transform: translateX(0%); }
          100% { transform: translateX(100%); }
        }
      `}</style>
    </div>
  );
}

// Page loading skeleton - shown while lazy components load
function PageSkeleton() {
  return (
    <div className="min-h-screen bg-[#0a0a0f] p-6">
      {/* Header skeleton */}
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div className="h-10 w-32 bg-white/5 rounded-lg animate-pulse" />
          <div className="flex gap-4">
            <div className="h-10 w-24 bg-white/5 rounded-lg animate-pulse" />
            <div className="h-10 w-24 bg-white/5 rounded-lg animate-pulse" />
          </div>
        </div>

        {/* Content skeleton */}
        <div className="space-y-6">
          <div className="h-8 w-64 bg-white/5 rounded animate-pulse" />
          <div className="h-4 w-full max-w-md bg-white/5 rounded animate-pulse" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-40 bg-white/5 rounded-xl animate-pulse" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// Simple spinner for smaller loading states
const LoadingSpinner = () => (
  <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
    <div className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
  </div>
);

// ============================================
// ACCESSIBILITY COMPONENTS
// ============================================

// Skip to main content link for keyboard/screen reader users
function SkipLink() {
  return (
    <a
      href="#main-content"
      className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-[10000] focus:px-4 focus:py-2 focus:bg-violet-600 focus:text-white focus:rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-400"
    >
      Skip to main content
    </a>
  );
}

// Announces route changes to screen readers
function RouteAnnouncer() {
  const location = useLocation();
  const [announcement, setAnnouncement] = useState('');

  useEffect(() => {
    // Extract page name from pathname
    const pathParts = location.pathname.split('/').filter(Boolean);
    const pageName = pathParts.length > 0
      ? pathParts[pathParts.length - 1].replace(/-/g, ' ')
      : 'home';

    // Capitalize first letter
    const formattedName = pageName.charAt(0).toUpperCase() + pageName.slice(1);

    setAnnouncement(`Navigated to ${formattedName} page`);
  }, [location.pathname]);

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

// ============================================
// NAVIGATION UTILITIES
// ============================================

// Session storage key prefix for scroll positions
const SCROLL_KEY_PREFIX = 'musclemap_scroll_';

// Scroll management with restoration for back/forward navigation
function ScrollToTop() {
  const location = useLocation();
  const navigationType = useNavigationType();
  const prevLocationKey = React.useRef(null);

  useEffect(() => {
    // Save scroll position of previous page before navigating
    if (prevLocationKey.current && prevLocationKey.current !== location.key) {
      sessionStorage.setItem(
        `${SCROLL_KEY_PREFIX}${prevLocationKey.current}`,
        window.scrollY.toString()
      );
    }

    // Handle scroll based on navigation type
    if (navigationType === 'POP') {
      // Browser back/forward - restore saved position
      const savedPosition = sessionStorage.getItem(`${SCROLL_KEY_PREFIX}${location.key}`);
      if (savedPosition !== null) {
        requestAnimationFrame(() => {
          window.scrollTo(0, parseInt(savedPosition, 10));
        });
      }
    } else if (navigationType === 'PUSH') {
      // New navigation - scroll to top
      window.scrollTo(0, 0);
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0; // Safari

      // Focus management for accessibility
      // Focus the main content area so screen readers start from the top
      const main = document.getElementById('main-content') || document.querySelector('main');
      if (main) {
        main.setAttribute('tabindex', '-1');
        main.focus({ preventScroll: true });
      }
    }
    // For REPLACE, don't modify scroll position

    // Update ref for next navigation
    prevLocationKey.current = location.key;
  }, [location.key, location.pathname, navigationType]);

  // Clean up old scroll entries (keep last 50)
  useEffect(() => {
    const keys = Object.keys(sessionStorage)
      .filter(k => k.startsWith(SCROLL_KEY_PREFIX))
      .sort();

    if (keys.length > 50) {
      keys.slice(0, keys.length - 50).forEach(k => sessionStorage.removeItem(k));
    }
  }, [location.key]);

  return null;
}

// Track navigation state for progress indicator
function useNavigationState() {
  const [isNavigating, setIsNavigating] = useState(false);
  const location = useLocation();

  useEffect(() => {
    setIsNavigating(true);
    const timer = setTimeout(() => setIsNavigating(false), 300);
    return () => clearTimeout(timer);
  }, [location.pathname]);

  return isNavigating;
}

// Page view tracker for analytics
function PageTracker() {
  const location = useLocation();

  useEffect(() => {
    logger.pageView(location.pathname, { search: location.search });
  }, [location]);

  return null;
}

// ============================================
// ROUTE PROTECTION WRAPPERS
// ============================================

// Common routes to prefetch after authentication
const AUTHENTICATED_PREFETCH_ROUTES = [
  '/workout',
  '/exercises',
  '/journey',
  '/community',
  '/profile',
];

// Protected Route - requires authentication
const ProtectedRoute = ({ children, name }) => {
  const { user, loading } = useUser();

  // Prefetch common next-page routes after auth check
  usePrefetchRoutes(user ? AUTHENTICATED_PREFETCH_ROUTES : []);

  useEffect(() => {
    if (!loading && user) {
      logger.debug('route_access', { route: name, userId: user.id });
    }
  }, [loading, user, name]);

  if (loading) return <LoadingSpinner />;
  if (!user) return <Navigate to="/login" replace />;

  return <ErrorBoundary name={name}>{children}</ErrorBoundary>;
};

// Admin Route - requires admin privileges
const AdminRoute = ({ children, name }) => {
  const { user, loading } = useUser();

  useEffect(() => {
    if (!loading) {
      logger.info('admin_route_access', { route: name, userId: user?.id, isAdmin: user?.is_admin });
    }
  }, [loading, user, name]);

  if (loading) return <LoadingSpinner />;
  if (!user) return <Navigate to="/login" replace />;
  if (!user.is_admin) {
    logger.warn('admin_access_denied', { userId: user.id, route: name });
    return <Navigate to="/dashboard" replace />;
  }

  return <ErrorBoundary name={name}>{children}</ErrorBoundary>;
};

// ============================================
// MAIN APP ROUTES
// ============================================

function AppRoutes() {
  const isNavigating = useNavigationState();

  return (
    <>
      <NavigationProgress isNavigating={isNavigating} />
      <SkipLink />
      <RouteAnnouncer />
      <ScrollToTop />
      <PageTracker />

      <Suspense fallback={<PageSkeleton />}>
        <Routes>
          {/* Public routes */}
          <Route path="/" element={<ErrorBoundary name="Landing"><Landing /></ErrorBoundary>} />
          <Route path="/login" element={<ErrorBoundary name="Login"><Login /></ErrorBoundary>} />
          <Route path="/signup" element={<ErrorBoundary name="Signup"><Signup /></ErrorBoundary>} />
          <Route path="/design-system" element={<ErrorBoundary name="DesignSystem"><DesignSystem /></ErrorBoundary>} />
          <Route path="/features" element={<ErrorBoundary name="Features"><Features /></ErrorBoundary>} />
          <Route path="/technology" element={<ErrorBoundary name="Technology"><Technology /></ErrorBoundary>} />
          <Route path="/science" element={<ErrorBoundary name="Science"><Science /></ErrorBoundary>} />
          <Route path="/design" element={<ErrorBoundary name="Design"><Design /></ErrorBoundary>} />
          <Route path="/docs" element={<ErrorBoundary name="Docs"><Docs /></ErrorBoundary>} />
          <Route path="/docs/:docId" element={<ErrorBoundary name="Docs"><Docs /></ErrorBoundary>} />
          <Route path="/privacy" element={<ErrorBoundary name="Privacy"><Privacy /></ErrorBoundary>} />
          <Route path="/skills" element={<ErrorBoundary name="Skills"><Skills /></ErrorBoundary>} />
          <Route path="/skills/:treeId" element={<ErrorBoundary name="Skills"><Skills /></ErrorBoundary>} />
          <Route path="/martial-arts" element={<ErrorBoundary name="MartialArts"><MartialArts /></ErrorBoundary>} />
          <Route path="/martial-arts/:disciplineId" element={<ErrorBoundary name="MartialArts"><MartialArts /></ErrorBoundary>} />

          {/* Issue Tracker - Public */}
          <Route path="/issues" element={<ErrorBoundary name="Issues"><Issues /></ErrorBoundary>} />
          <Route path="/issues/:id" element={<ErrorBoundary name="IssueDetail"><IssueDetail /></ErrorBoundary>} />
          <Route path="/updates" element={<ErrorBoundary name="DevUpdates"><DevUpdates /></ErrorBoundary>} />
          <Route path="/roadmap" element={<ErrorBoundary name="Roadmap"><Roadmap /></ErrorBoundary>} />

          {/* Protected routes */}
          <Route path="/dashboard" element={<ProtectedRoute name="Dashboard"><Dashboard /></ProtectedRoute>} />
          <Route path="/onboarding" element={<ProtectedRoute name="Onboarding"><Onboarding /></ProtectedRoute>} />
          <Route path="/workout" element={<ProtectedRoute name="Workout"><Workout /></ProtectedRoute>} />
          <Route path="/journey" element={<ProtectedRoute name="Journey"><Journey /></ProtectedRoute>} />
          <Route path="/profile" element={<ProtectedRoute name="Profile"><Profile /></ProtectedRoute>} />
          <Route path="/settings" element={<ProtectedRoute name="Settings"><Settings /></ProtectedRoute>} />
          <Route path="/progression" element={<ProtectedRoute name="Progression"><Progression /></ProtectedRoute>} />
          <Route path="/community" element={<ProtectedRoute name="CommunityDashboard"><CommunityDashboard /></ProtectedRoute>} />
          <Route path="/competitions" element={<ProtectedRoute name="Competitions"><Competitions /></ProtectedRoute>} />
          <Route path="/locations" element={<ProtectedRoute name="Locations"><Locations /></ProtectedRoute>} />
          <Route path="/highfives" element={<ProtectedRoute name="HighFives"><HighFives /></ProtectedRoute>} />
          <Route path="/credits" element={<ProtectedRoute name="Credits"><Credits /></ProtectedRoute>} />
          <Route path="/messages" element={<ProtectedRoute name="Messages"><Messages /></ProtectedRoute>} />
          <Route path="/wallet" element={<ProtectedRoute name="Wallet"><Wallet /></ProtectedRoute>} />
          <Route path="/skins" element={<ProtectedRoute name="SkinsStore"><SkinsStore /></ProtectedRoute>} />
          <Route path="/exercises" element={<ProtectedRoute name="Exercises"><Exercises /></ProtectedRoute>} />
          <Route path="/stats" element={<ProtectedRoute name="Stats"><Stats /></ProtectedRoute>} />
          <Route path="/crews" element={<ProtectedRoute name="Crews"><Crews /></ProtectedRoute>} />
          <Route path="/rivals" element={<ProtectedRoute name="Rivals"><Rivals /></ProtectedRoute>} />
          <Route path="/health" element={<ProtectedRoute name="Health"><Health /></ProtectedRoute>} />
          <Route path="/goals" element={<ProtectedRoute name="Goals"><Goals /></ProtectedRoute>} />
          <Route path="/limitations" element={<ProtectedRoute name="Limitations"><Limitations /></ProtectedRoute>} />
          <Route path="/pt-tests" element={<ProtectedRoute name="PTTests"><PTTests /></ProtectedRoute>} />
          <Route path="/issues/new" element={<ProtectedRoute name="NewIssue"><NewIssue /></ProtectedRoute>} />
          <Route path="/my-issues" element={<ProtectedRoute name="MyIssues"><MyIssues /></ProtectedRoute>} />

          {/* Admin routes */}
          <Route path="/admin-control" element={<AdminRoute name="AdminControl"><AdminControl /></AdminRoute>} />
          <Route path="/admin/issues" element={<AdminRoute name="AdminIssues"><AdminIssues /></AdminRoute>} />
          <Route path="/admin/monitoring" element={<AdminRoute name="AdminMonitoring"><AdminMonitoring /></AdminRoute>} />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </Suspense>
    </>
  );
}

// ============================================
// ROOT APP COMPONENT
// ============================================

export default function App() {
  useEffect(() => {
    logger.info('app_initialized', {
      version: '1.0.0',
      env: process.env.NODE_ENV
    });

    // Log performance metrics
    if (window.performance) {
      const timing = window.performance.timing;
      window.addEventListener('load', () => {
        setTimeout(() => {
          const loadTime = timing.loadEventEnd - timing.navigationStart;
          const domReady = timing.domContentLoadedEventEnd - timing.navigationStart;
          logger.performance('page_load', loadTime, { domReady });
        }, 0);
      });
    }
  }, []);

  return (
    <ErrorBoundary name="App">
      <ApolloProvider client={apolloClient}>
        <ThemeProvider>
          <LocaleProvider>
            <BrowserRouter>
              <UserProvider>
                <CompanionProvider>
                  <div id="main-content" role="main">
                    <AppRoutes />
                  </div>
                  <CompanionDock />
                </CompanionProvider>
              </UserProvider>
            </BrowserRouter>
          </LocaleProvider>
        </ThemeProvider>
      </ApolloProvider>
    </ErrorBoundary>
  );
}
