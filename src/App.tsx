import React, { useEffect, Suspense, lazy, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigationType, useNavigate } from 'react-router-dom';
import { ApolloProvider } from '@apollo/client/react';
import { AdaptiveAnimatePresence } from './components/transitions/AdaptiveAnimatePresence';
import { apolloClient } from './graphql';
import { UserProvider } from './contexts/UserContext';
import { useAuth } from './store/authStore';
import { ThemeProvider } from './contexts/ThemeContext';
import { LocaleProvider } from './contexts/LocaleContext';
import { MotionProvider } from './contexts/MotionContext';
import ErrorBoundary from './components/ErrorBoundary';
import { CompanionProvider } from './components/mascot';
const CompanionDock = lazy(() => import('./components/mascot/companion/CompanionDock'));
import { CommandPaletteProvider, useCommandPaletteContext } from './components/command';
const CommandPalette = lazy(() => import('./components/command/CommandPalette'));
import { usePrefetchRoutes } from './components/PrefetchLink';
import logger from './utils/logger';
import { trackPageView } from './lib/analytics';

// Plugin System
import { PluginProvider, PluginThemeProvider, usePluginRoutes } from './plugins';

// UI/UX Enhancement Components
import { ContextualTipProvider } from './components/tips';
const SpotlightTourRenderer = lazy(() => import('./components/tour/SpotlightTour').then(m => ({ default: m.SpotlightTourRenderer })));

// Transition System
import { TransitionProvider } from './components/transitions';

// Global Components - Lazy loaded for performance
const AICoach = lazy(() => import('./components/ai-coach/AICoach'));
const LootDrop = lazy(() => import('./components/loot/LootDrop'));
const FloatingRestTimer = lazy(() => import('./components/workout/FloatingRestTimer'));

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
const PersonalRecords = lazy(() => import('./pages/PersonalRecords'));
const ProgressPhotos = lazy(() => import('./pages/Progress-photos'));

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
const Trainers = lazy(() => import('./pages/Trainers'));

// Marketplace & Trading pages
const Marketplace = lazy(() => import('./pages/Marketplace'));
const Trading = lazy(() => import('./pages/Trading'));
const Collection = lazy(() => import('./pages/Collection'));
const MysteryBoxes = lazy(() => import('./pages/MysteryBoxes'));

// Health pages
const Health = lazy(() => import('./pages/Health'));
const Recovery = lazy(() => import('./pages/Recovery'));
const Goals = lazy(() => import('./pages/Goals'));
const Limitations = lazy(() => import('./pages/Limitations'));
const PTTests = lazy(() => import('./pages/PTTests'));
const CareerReadiness = lazy(() => import('./pages/CareerReadiness'));
const Leaderboard = lazy(() => import('./pages/Leaderboard'));

// Career pages
const CareerPage = lazy(() => import('./pages/CareerPage'));
const CareerGoalPage = lazy(() => import('./pages/CareerGoalPage'));
const CareerStandardPage = lazy(() => import('./pages/CareerStandardPage'));

// Public documentation pages
const DesignSystem = lazy(() => import('./pages/DesignSystem'));
const Features = lazy(() => import('./pages/Features'));

// UI Illustration Previews
const UIShowcase = lazy(() => import('./components/illustrations/MuscleMapUIShowcase'));
const Technology = lazy(() => import('./pages/Technology'));
const Science = lazy(() => import('./pages/Science'));
const Design = lazy(() => import('./pages/Design'));
const Docs = lazy(() => import('./pages/Docs'));
const Privacy = lazy(() => import('./pages/Privacy'));
const Skills = lazy(() => import('./pages/Skills'));
const MartialArts = lazy(() => import('./pages/MartialArts'));

// Achievement pages
const Achievements = lazy(() => import('./pages/Achievements'));
const AchievementVerification = lazy(() => import('./pages/AchievementVerification'));
const MyVerifications = lazy(() => import('./pages/MyVerifications'));
const WitnessAttestation = lazy(() => import('./pages/WitnessAttestation'));

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
const AdminMetrics = lazy(() => import('./pages/AdminMetrics'));
const AdminDisputes = lazy(() => import('./pages/AdminDisputes'));
const AdminFraud = lazy(() => import('./pages/AdminFraud'));
const EmpireControl = lazy(() => import('./pages/EmpireControl'));
const EmpireUserDetail = lazy(() => import('./pages/EmpireUserDetail'));
const TestScorecard = lazy(() => import('./pages/TestScorecard'));
const DeploymentControl = lazy(() => import('./pages/DeploymentControl'));
const CommandCenter = lazy(() => import('./pages/CommandCenter'));
const AdminExerciseImages = lazy(() => import('./pages/AdminExerciseImages'));

// Dev pages (development tools)
const AnatomyViewer = lazy(() => import('./pages/dev/AnatomyViewer'));

// Live activity monitoring
const LiveActivityMonitor = lazy(() => import('./pages/LiveActivityMonitor'));

// Adventure Map
const AdventureMapPage = lazy(() => import('./pages/AdventureMap'));
const _AdventureMapFullscreen = lazy(() => import('./components/adventure-map').then(m => ({ default: m.AdventureMapFullscreen })));

// Map Explore (Interactive Navigation)
const MapExplore = lazy(() => import('./pages/MapExplore'));

// Plugin pages
const PluginMarketplace = lazy(() => import('./pages/PluginMarketplace'));
const PluginSettings = lazy(() => import('./pages/PluginSettings'));

// Community & Developer pages
const CommunityBulletinBoard = lazy(() => import('./pages/CommunityBulletinBoard'));
const PluginGuide = lazy(() => import('./pages/PluginGuide'));
const ContributeIdeas = lazy(() => import('./pages/ContributeIdeas'));

// Nutrition pages
const Nutrition = lazy(() => import('./pages/Nutrition'));
const NutritionSettings = lazy(() => import('./pages/NutritionSettings'));
const Recipes = lazy(() => import('./pages/Recipes'));
const MealPlans = lazy(() => import('./pages/MealPlans'));
const ShoppingList = lazy(() => import('./pages/ShoppingList'));
const NutritionHistory = lazy(() => import('./pages/NutritionHistory'));

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

// Announces route changes to screen readers and tracks page views
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

    // Track page view in Google Analytics
    trackPageView(location.pathname, `${formattedName} | MuscleMap`);
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
  const { user, loading, hasHydrated } = useAuth();

  // Prefetch common next-page routes after auth check
  usePrefetchRoutes(user ? AUTHENTICATED_PREFETCH_ROUTES : []);

  useEffect(() => {
    if (!loading && user) {
      logger.debug('route_access', { route: name, userId: user.id });
    }
  }, [loading, user, name]);

  // Wait for auth store to fully hydrate before making auth decisions
  // This prevents race condition where token is null during initial load
  if (loading || !hasHydrated) return <LoadingSpinner />;
  if (!user) return <Navigate to="/login" replace />;

  return <ErrorBoundary name={name}>{children}</ErrorBoundary>;
};

// Admin Route - requires admin privileges
const AdminRoute = ({ children, name }) => {
  const { user, loading, hasHydrated } = useAuth();

  useEffect(() => {
    if (!loading) {
      logger.info('admin_route_access', { route: name, userId: user?.id, isAdmin: user?.is_admin });
    }
  }, [loading, user, name]);

  // Wait for auth store to fully hydrate before making auth decisions
  if (loading || !hasHydrated) return <LoadingSpinner />;
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

// Dynamic plugin route component
function PluginRouteWrapper({ route }) {
  const Component = route.component;

  if (!Component) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center text-white">
        <p>Plugin component not found</p>
      </div>
    );
  }

  return (
    <Suspense fallback={<PageSkeleton />}>
      {typeof Component === 'function' ? <Component /> : Component}
    </Suspense>
  );
}

function AppRoutes() {
  const isNavigating = useNavigationState();
  const pluginRoutes = usePluginRoutes();
  const location = useLocation();

  return (
    <>
      <NavigationProgress isNavigating={isNavigating} />
      <SkipLink />
      <RouteAnnouncer />
      <ScrollToTop />
      <PageTracker />

      <Suspense fallback={<PageSkeleton />}>
        <AdaptiveAnimatePresence mode="wait" initial={false}>
        <Routes location={location} key={location.pathname}>
          {/* Public routes */}
          <Route path="/" element={<ErrorBoundary name="Landing"><Landing /></ErrorBoundary>} />
          <Route path="/login" element={<ErrorBoundary name="Login"><Login /></ErrorBoundary>} />
          <Route path="/signup" element={<ErrorBoundary name="Signup"><Signup /></ErrorBoundary>} />
          <Route path="/design-system" element={<ErrorBoundary name="DesignSystem"><DesignSystem /></ErrorBoundary>} />
          <Route path="/ui-showcase" element={<ErrorBoundary name="UIShowcase"><UIShowcase /></ErrorBoundary>} />
          <Route path="/features" element={<ErrorBoundary name="Features"><Features /></ErrorBoundary>} />
          <Route path="/technology" element={<ErrorBoundary name="Technology"><Technology /></ErrorBoundary>} />
          <Route path="/science" element={<ErrorBoundary name="Science"><Science /></ErrorBoundary>} />
          <Route path="/design" element={<ErrorBoundary name="Design"><Design /></ErrorBoundary>} />
          <Route path="/docs" element={<ErrorBoundary name="Docs"><Docs /></ErrorBoundary>} />
          <Route path="/docs/plugins" element={<ErrorBoundary name="PluginGuide"><PluginGuide /></ErrorBoundary>} />
          <Route path="/docs/:docId" element={<ErrorBoundary name="Docs"><Docs /></ErrorBoundary>} />
          <Route path="/docs/*" element={<ErrorBoundary name="Docs"><Docs /></ErrorBoundary>} />
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
          <Route path="/adventure-map" element={<ProtectedRoute name="AdventureMap"><AdventureMapPage /></ProtectedRoute>} />
          <Route path="/explore" element={<ProtectedRoute name="MapExplore"><MapExplore /></ProtectedRoute>} />
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
          <Route path="/trainers" element={<ProtectedRoute name="Trainers"><Trainers /></ProtectedRoute>} />

          {/* Marketplace & Trading routes */}
          <Route path="/marketplace" element={<ProtectedRoute name="Marketplace"><Marketplace /></ProtectedRoute>} />
          <Route path="/trading" element={<ProtectedRoute name="Trading"><Trading /></ProtectedRoute>} />
          <Route path="/collection" element={<ProtectedRoute name="Collection"><Collection /></ProtectedRoute>} />
          <Route path="/mystery-boxes" element={<ProtectedRoute name="MysteryBoxes"><MysteryBoxes /></ProtectedRoute>} />
          <Route path="/exercises" element={<ProtectedRoute name="Exercises"><Exercises /></ProtectedRoute>} />
          <Route path="/stats" element={<ProtectedRoute name="Stats"><Stats /></ProtectedRoute>} />
          <Route path="/personal-records" element={<ProtectedRoute name="PersonalRecords"><PersonalRecords /></ProtectedRoute>} />
          <Route path="/progress-photos" element={<ProtectedRoute name="ProgressPhotos"><ProgressPhotos /></ProtectedRoute>} />
          <Route path="/crews" element={<ProtectedRoute name="Crews"><Crews /></ProtectedRoute>} />
          <Route path="/rivals" element={<ProtectedRoute name="Rivals"><Rivals /></ProtectedRoute>} />
          <Route path="/health" element={<ProtectedRoute name="Health"><Health /></ProtectedRoute>} />
          <Route path="/wellness" element={<Navigate to="/health" replace />} /> {/* Legacy alias */}
          <Route path="/recovery" element={<ProtectedRoute name="Recovery"><Recovery /></ProtectedRoute>} />
          <Route path="/goals" element={<ProtectedRoute name="Goals"><Goals /></ProtectedRoute>} />
          <Route path="/limitations" element={<ProtectedRoute name="Limitations"><Limitations /></ProtectedRoute>} />
          <Route path="/pt-tests" element={<ProtectedRoute name="PTTests"><PTTests /></ProtectedRoute>} />
          <Route path="/career-readiness" element={<ProtectedRoute name="CareerReadiness"><CareerReadiness /></ProtectedRoute>} />
          <Route path="/leaderboard" element={<ProtectedRoute name="Leaderboard"><Leaderboard /></ProtectedRoute>} />

          {/* Career routes */}
          <Route path="/career" element={<ProtectedRoute name="CareerPage"><CareerPage /></ProtectedRoute>} />
          <Route path="/career/goals/:goalId" element={<ProtectedRoute name="CareerGoalPage"><CareerGoalPage /></ProtectedRoute>} />
          <Route path="/career/standards/:standardId" element={<ProtectedRoute name="CareerStandardPage"><CareerStandardPage /></ProtectedRoute>} />

          <Route path="/issues/new" element={<ProtectedRoute name="NewIssue"><NewIssue /></ProtectedRoute>} />
          <Route path="/my-issues" element={<ProtectedRoute name="MyIssues"><MyIssues /></ProtectedRoute>} />

          {/* Nutrition routes */}
          <Route path="/nutrition" element={<ProtectedRoute name="Nutrition"><Nutrition /></ProtectedRoute>} />
          <Route path="/nutrition/settings" element={<ProtectedRoute name="NutritionSettings"><NutritionSettings /></ProtectedRoute>} />
          <Route path="/nutrition/recipes" element={<ProtectedRoute name="Recipes"><Recipes /></ProtectedRoute>} />
          <Route path="/nutrition/recipes/:recipeId" element={<ProtectedRoute name="Recipes"><Recipes /></ProtectedRoute>} />
          <Route path="/nutrition/plans" element={<ProtectedRoute name="MealPlans"><MealPlans /></ProtectedRoute>} />
          <Route path="/nutrition/plans/:planId" element={<ProtectedRoute name="MealPlans"><MealPlans /></ProtectedRoute>} />
          <Route path="/nutrition/plans/:planId/shopping-list" element={<ProtectedRoute name="ShoppingList"><ShoppingList /></ProtectedRoute>} />
          <Route path="/nutrition/history" element={<ProtectedRoute name="NutritionHistory"><NutritionHistory /></ProtectedRoute>} />

          {/* Achievement routes */}
          <Route path="/milestones" element={<Navigate to="/achievements" replace />} /> {/* Alias for milestones */}
          <Route path="/achievements" element={<ProtectedRoute name="Achievements"><Achievements /></ProtectedRoute>} />
          <Route path="/achievements/verify/:achievementId" element={<ProtectedRoute name="AchievementVerification"><AchievementVerification /></ProtectedRoute>} />
          <Route path="/achievements/my-verifications" element={<ProtectedRoute name="MyVerifications"><MyVerifications /></ProtectedRoute>} />
          <Route path="/verifications/:verificationId/witness" element={<ProtectedRoute name="WitnessAttestation"><WitnessAttestation /></ProtectedRoute>} />

          {/* Admin routes */}
          <Route path="/admin" element={<Navigate to="/admin-control" replace />} /> {/* Shortcut */}
          <Route path="/admin-control" element={<AdminRoute name="AdminControl"><AdminControl /></AdminRoute>} />
          <Route path="/admin/issues" element={<AdminRoute name="AdminIssues"><AdminIssues /></AdminRoute>} />
          <Route path="/admin/monitoring" element={<AdminRoute name="AdminMonitoring"><AdminMonitoring /></AdminRoute>} />
          <Route path="/admin/metrics" element={<AdminRoute name="AdminMetrics"><AdminMetrics /></AdminRoute>} />
          <Route path="/admin/disputes" element={<AdminRoute name="AdminDisputes"><AdminDisputes /></AdminRoute>} />
          <Route path="/admin/fraud" element={<AdminRoute name="AdminFraud"><AdminFraud /></AdminRoute>} />
          <Route path="/empire" element={<AdminRoute name="EmpireControl"><EmpireControl /></AdminRoute>} />
          <Route path="/empire/user/:userId" element={<AdminRoute name="EmpireUserDetail"><EmpireUserDetail /></AdminRoute>} />
          <Route path="/empire/scorecard" element={<AdminRoute name="TestScorecard"><TestScorecard /></AdminRoute>} />
          <Route path="/empire/deploy" element={<AdminRoute name="DeploymentControl"><DeploymentControl /></AdminRoute>} />
          <Route path="/empire/commands" element={<AdminRoute name="CommandCenter"><CommandCenter /></AdminRoute>} />
          <Route path="/empire/exercise-images" element={<AdminRoute name="AdminExerciseImages"><AdminExerciseImages /></AdminRoute>} />

          {/* Live activity monitoring - public anonymous data */}
          <Route path="/live" element={<ErrorBoundary name="LiveActivityMonitor"><LiveActivityMonitor /></ErrorBoundary>} />

          {/* Plugin routes */}
          <Route path="/plugins" element={<ProtectedRoute name="PluginMarketplace"><PluginMarketplace /></ProtectedRoute>} />
          <Route path="/plugins/settings" element={<ProtectedRoute name="PluginSettings"><PluginSettings /></ProtectedRoute>} />

          {/* Community & Developer routes - Public */}
          <Route path="/community/bulletin" element={<ErrorBoundary name="CommunityBulletinBoard"><CommunityBulletinBoard /></ErrorBoundary>} />
          <Route path="/contribute" element={<ErrorBoundary name="ContributeIdeas"><ContributeIdeas /></ErrorBoundary>} />

          {/* Dev routes - Development tools */}
          <Route path="/dev/anatomy-viewer" element={<AdminRoute name="AnatomyViewer"><AnatomyViewer /></AdminRoute>} />

          {/* Dynamic plugin-contributed routes */}
          {pluginRoutes.map((route) => (
            <Route
              key={route.id}
              path={route.path}
              element={
                route.admin ? (
                  <AdminRoute name={`Plugin:${route.pluginId}`}>
                    <PluginRouteWrapper route={route} />
                  </AdminRoute>
                ) : route.protected !== false ? (
                  <ProtectedRoute name={`Plugin:${route.pluginId}`}>
                    <PluginRouteWrapper route={route} />
                  </ProtectedRoute>
                ) : (
                  <ErrorBoundary name={`Plugin:${route.pluginId}`}>
                    <PluginRouteWrapper route={route} />
                  </ErrorBoundary>
                )
              }
            />
          ))}

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
        </AdaptiveAnimatePresence>
      </Suspense>
    </>
  );
}

// ============================================
// GLOBAL COMMAND PALETTE
// ============================================

function GlobalCommandPalette() {
  const { isOpen, close, handleSelect } = useCommandPaletteContext();
  const navigate = useNavigate();

  const onSelect = (item) => {
    if (item.action && typeof item.action === 'function') {
      item.action(navigate);
    } else if (item.path) {
      navigate(item.path);
    }
    handleSelect?.(item);
  };

  return (
    <CommandPalette
      isOpen={isOpen}
      onClose={close}
      onSelect={onSelect}
      placeholder="Search exercises, pages, actions..."
      recentSearches
      maxResults={6}
    />
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
    let loadHandler: (() => void) | null = null;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    if (window.performance) {
      const timing = window.performance.timing;
      loadHandler = () => {
        timeoutId = setTimeout(() => {
          const loadTime = timing.loadEventEnd - timing.navigationStart;
          const domReady = timing.domContentLoadedEventEnd - timing.navigationStart;
          logger.performance('page_load', loadTime, { domReady });
        }, 0);
      };
      window.addEventListener('load', loadHandler);
    }

    return () => {
      if (loadHandler) {
        window.removeEventListener('load', loadHandler);
      }
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, []);

  return (
    <ErrorBoundary name="App">
      <ApolloProvider client={apolloClient}>
        <ThemeProvider>
          <LocaleProvider>
            <MotionProvider>
              <BrowserRouter>
                <TransitionProvider showProgressBar>
                <UserProvider>
                  <PluginProvider>
                    <PluginThemeProvider>
                      <CommandPaletteProvider>
                        <CompanionProvider>
                          <ContextualTipProvider>
                            <div id="main-content" role="main">
                              <AppRoutes />
                            </div>
                            <CompanionDock />
                            <GlobalCommandPalette />
                            {/* Global Spotlight Tour Renderer */}
                            <SpotlightTourRenderer />
                            {/* Global AI Coach - Floating widget (bottom-right) */}
                            <Suspense fallback={null}>
                              <AICoach position="bottom-right" />
                            </Suspense>
                            {/* Global Loot Drop System */}
                            <Suspense fallback={null}>
                              <LootDrop />
                            </Suspense>
                            {/* Global Floating Rest Timer - Shows during active workouts */}
                            <Suspense fallback={null}>
                              <FloatingRestTimer enabled />
                            </Suspense>
                          </ContextualTipProvider>
                        </CompanionProvider>
                      </CommandPaletteProvider>
                    </PluginThemeProvider>
                  </PluginProvider>
                </UserProvider>
                </TransitionProvider>
              </BrowserRouter>
            </MotionProvider>
          </LocaleProvider>
        </ThemeProvider>
      </ApolloProvider>
    </ErrorBoundary>
  );
}
