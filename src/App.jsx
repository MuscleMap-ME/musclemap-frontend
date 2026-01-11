import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { ApolloProvider } from '@apollo/client/react';
import { apolloClient } from './graphql';
import { UserProvider, useUser } from './contexts/UserContext';
import ErrorBoundary from './components/ErrorBoundary';
import { CompanionProvider, CompanionDock } from './components/mascot';
import logger from './utils/logger';

// Pages
import Landing from './pages/Landing';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Dashboard from './pages/Dashboard';
import Onboarding from './pages/Onboarding';
import Workout from './pages/Workout';
import Journey from './pages/Journey';
import Profile from './pages/Profile';
import Settings from './pages/Settings';
import Progression from './pages/Progression';
import CommunityDashboard from './pages/CommunityDashboard';
import Competitions from './pages/Competitions';
import Locations from './pages/Locations';
import HighFives from './pages/HighFives';
import Credits from './pages/Credits';
import Messages from './pages/Messages';
import Wallet from './pages/Wallet';
import SkinsStore from './pages/SkinsStore';
import AdminControl from './pages/AdminControl';
import Exercises from './pages/Exercises';
import DesignSystem from './pages/DesignSystem';
import Features from './pages/Features';
import Technology from './pages/Technology';
import Science from './pages/Science';
import Design from './pages/Design';
import Issues from './pages/Issues';
import IssueDetail from './pages/IssueDetail';
import NewIssue from './pages/NewIssue';
import MyIssues from './pages/MyIssues';
import DevUpdates from './pages/DevUpdates';
import Roadmap from './pages/Roadmap';
import AdminIssues from './pages/AdminIssues';
import AdminMonitoring from './pages/AdminMonitoring';
import Docs from './pages/Docs';
import Privacy from './pages/Privacy';
import Stats from './pages/Stats';
import Crews from './pages/Crews';
import Rivals from './pages/Rivals';
import Health from './pages/Health';
import Goals from './pages/Goals';
import Limitations from './pages/Limitations';
import PTTests from './pages/PTTests';
import Skills from './pages/Skills';
import MartialArts from './pages/MartialArts';

// Scroll to top on route change - ensures users always start at top of page
function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    // Scroll to top immediately on route change
    window.scrollTo(0, 0);

    // Also reset any scrollable containers and ensure focus is at top
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0; // For Safari
  }, [pathname]);

  return null;
}

// Page view tracker
function PageTracker() {
  const location = useLocation();

  useEffect(() => {
    logger.pageView(location.pathname, { search: location.search });
  }, [location]);

  return null;
}

// Loading spinner
const LoadingScreen = () => (
  <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
    <div className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin"></div>
  </div>
);

// Protected Route wrapper
const ProtectedRoute = ({ children, name }) => {
  const { user, loading } = useUser();
  
  useEffect(() => {
    if (!loading && user) {
      logger.debug('route_access', { route: name, userId: user.id });
    }
  }, [loading, user, name]);
  
  if (loading) return <LoadingScreen />;
  if (!user) return <Navigate to="/login" replace />;
  
  return <ErrorBoundary name={name}>{children}</ErrorBoundary>;
};

// Admin Route wrapper
const AdminRoute = ({ children, name }) => {
  const { user, loading } = useUser();
  
  useEffect(() => {
    if (!loading) {
      logger.info('admin_route_access', { route: name, userId: user?.id, isAdmin: user?.is_admin });
    }
  }, [loading, user, name]);
  
  if (loading) return <LoadingScreen />;
  if (!user) return <Navigate to="/login" replace />;
  if (!user.is_admin) {
    logger.warn('admin_access_denied', { userId: user.id, route: name });
    return <Navigate to="/dashboard" replace />;
  }
  
  return <ErrorBoundary name={name}>{children}</ErrorBoundary>;
};

function AppRoutes() {
  return (
    <>
      <ScrollToTop />
      <PageTracker />
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
    </>
  );
}

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
        <BrowserRouter>
          <UserProvider>
            <CompanionProvider>
              <AppRoutes />
              <CompanionDock />
            </CompanionProvider>
          </UserProvider>
        </BrowserRouter>
      </ApolloProvider>
    </ErrorBoundary>
  );
}
