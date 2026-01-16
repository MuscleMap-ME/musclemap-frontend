/**
 * Career Goal Detail Page - MuscleMap
 *
 * Shows full readiness dashboard for a specific career goal.
 * Includes event breakdown, trend chart, weak events, and exercise recommendations.
 *
 * Route: /career/goals/:goalId
 */

import React, { useState, useEffect, useCallback, lazy, Suspense } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useUser } from '../contexts/UserContext';
import { api } from '../utils/api';
import {
  GlassSurface,
  GlassButton,
  GlassNav,
  GlassMobileNav,
  MeshBackground,
} from '../components/glass';
import { SkeletonCard, SkeletonStats } from '../components/skeletons';

// Lazy load chart component
const ReadinessTrendChart = lazy(() =>
  import('../components/career/ReadinessTrendChart').catch(() => ({ default: () => null }))
);

// ============================================
// ICONS
// ============================================

const Icons = {
  Target: ({ className = 'w-5 h-5' }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
    </svg>
  ),
  Trophy: ({ className = 'w-5 h-5' }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
    </svg>
  ),
  Calendar: ({ className = 'w-5 h-5' }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  ),
  Plus: ({ className = 'w-5 h-5' }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
    </svg>
  ),
  X: ({ className = 'w-5 h-5' }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  ),
  Check: ({ className = 'w-5 h-5' }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
  ),
  ChevronLeft: ({ className = 'w-5 h-5' }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
    </svg>
  ),
  ChevronRight: ({ className = 'w-5 h-5' }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
    </svg>
  ),
  TrendingUp: ({ className = 'w-5 h-5' }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
    </svg>
  ),
  TrendingDown: ({ className = 'w-5 h-5' }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
    </svg>
  ),
  AlertTriangle: ({ className = 'w-5 h-5' }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
    </svg>
  ),
  Dumbbell: ({ className = 'w-5 h-5' }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 7h16M4 17h16M6 12h12M7 7v10m10-10v10" />
    </svg>
  ),
  Refresh: ({ className = 'w-5 h-5' }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
    </svg>
  ),
  Trash: ({ className = 'w-5 h-5' }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    </svg>
  ),
  Edit: ({ className = 'w-5 h-5' }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
    </svg>
  ),
  Home: ({ className = 'w-5 h-5' }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
    </svg>
  ),
  Clipboard: ({ className = 'w-5 h-5' }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
    </svg>
  ),
  User: ({ className = 'w-5 h-5' }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
  ),
};

// ============================================
// CATEGORY METADATA
// ============================================

const CATEGORY_META = {
  military: { color: '#556B2F', icon: null, label: 'Military' },
  firefighter: { color: '#B22222', icon: null, label: 'Firefighter' },
  law_enforcement: { color: '#191970', icon: null, label: 'Law Enforcement' },
  special_operations: { color: '#4B0082', icon: null, label: 'Special Operations' },
  civil_service: { color: '#2F4F4F', icon: null, label: 'Civil Service' },
  general: { color: '#6366f1', icon: null, label: 'General Fitness' },
};

// Status colors
const STATUS_COLORS = {
  ready: { bg: 'bg-emerald-500/20', text: 'text-emerald-400', label: 'Ready', color: '#10b981' },
  at_risk: { bg: 'bg-amber-500/20', text: 'text-amber-400', label: 'At Risk', color: '#f59e0b' },
  not_ready: { bg: 'bg-red-500/20', text: 'text-red-400', label: 'Not Ready', color: '#ef4444' },
  no_data: { bg: 'bg-gray-500/20', text: 'text-gray-400', label: 'No Data', color: '#6b7280' },
};

// ============================================
// COMPONENTS
// ============================================

// Large Circular Progress Gauge
function ReadinessGauge({ score, status, size = 180 }) {
  const radius = (size - 16) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = score !== null ? (score / 100) * circumference : 0;
  const statusConfig = STATUS_COLORS[status] || STATUS_COLORS.no_data;

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg className="transform -rotate-90" width={size} height={size}>
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth="12"
          className="text-white/10"
        />
        {/* Progress circle */}
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={statusConfig.color}
          strokeWidth="12"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference - progress}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: circumference - progress }}
          transition={{ duration: 1, ease: 'easeOut' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-4xl font-black text-[var(--text-primary)]">
          {score !== null ? `${score}%` : '-'}
        </span>
        <span className={`text-sm font-semibold ${statusConfig.text}`}>
          {statusConfig.label}
        </span>
      </div>
    </div>
  );
}

// Event Progress Bar
function EventProgressBar({ event, percentage, isPassing }) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-sm">
        <span className="text-[var(--text-secondary)]">{event.name}</span>
        <span className={isPassing ? 'text-emerald-400' : 'text-red-400'}>
          {event.currentValue || '-'} / {event.passingValue} {event.unit}
        </span>
      </div>
      <div className="h-2 bg-[var(--glass-white-10)] rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${Math.min(percentage, 100)}%` }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className={`h-full rounded-full ${isPassing ? 'bg-emerald-500' : 'bg-red-500'}`}
        />
      </div>
    </div>
  );
}

// Delete Confirmation Modal
function DeleteConfirmModal({ isOpen, onClose, onConfirm, goalName, loading }) {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="w-full max-w-md bg-[var(--void-base)] border border-[var(--border-subtle)] rounded-2xl p-6"
          onClick={e => e.stopPropagation()}
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center">
              <Icons.Trash className="w-6 h-6 text-red-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-[var(--text-primary)]">Delete Goal?</h2>
              <p className="text-sm text-[var(--text-tertiary)]">This action cannot be undone</p>
            </div>
          </div>

          <p className="text-[var(--text-secondary)] mb-6">
            Are you sure you want to delete <span className="font-semibold">{goalName}</span>?
            All progress tracking data will be lost.
          </p>

          <div className="flex gap-3">
            <GlassButton variant="ghost" className="flex-1" onClick={onClose}>
              Cancel
            </GlassButton>
            <GlassButton
              variant="primary"
              className="flex-1 !bg-red-500 hover:!bg-red-600"
              onClick={onConfirm}
              disabled={loading}
            >
              {loading ? 'Deleting...' : 'Delete Goal'}
            </GlassButton>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

// ============================================
// MOBILE NAV CONFIG
// ============================================

const mobileNavItems = [
  { to: '/dashboard', icon: <Icons.Home className="w-5 h-5" />, label: 'Home' },
  { to: '/career', icon: <Icons.Target className="w-5 h-5" />, label: 'Career' },
  { to: '/pt-tests', icon: <Icons.Clipboard className="w-5 h-5" />, label: 'PT Tests' },
  { to: '/profile', icon: <Icons.User className="w-5 h-5" />, label: 'Profile' },
];

// ============================================
// MAIN PAGE COMPONENT
// ============================================

export default function CareerGoalPage() {
  const { goalId } = useParams();
  const navigate = useNavigate();
  const { user: _user } = useUser();

  // State
  const [goal, setGoal] = useState(null);
  const [readiness, setReadiness] = useState(null);
  const [exercises, setExercises] = useState([]);
  const [events, setEvents] = useState([]);
  const [trendData, setTrendData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Load data
  const loadGoal = useCallback(async () => {
    try {
      const response = await api.get(`/career/goals/${goalId}`);
      setGoal(response.data?.goal || null);
    } catch (error) {
      console.error('Failed to load goal:', error);
    }
  }, [goalId]);

  const loadReadiness = useCallback(async () => {
    try {
      const response = await api.get(`/career/readiness/${goalId}`);
      setReadiness(response.data?.readiness || null);
      setEvents(response.data?.events || []);
    } catch (error) {
      console.error('Failed to load readiness:', error);
    }
  }, [goalId]);

  const loadExercises = useCallback(async () => {
    try {
      const response = await api.get(`/career/goals/${goalId}/exercises`);
      setExercises(response.data?.exercises || []);
    } catch (error) {
      console.error('Failed to load exercises:', error);
    }
  }, [goalId]);

  const loadTrendData = useCallback(async () => {
    try {
      const response = await api.get(`/career/goals/${goalId}/trend`);
      setTrendData(response.data?.trend || []);
    } catch (error) {
      console.error('Failed to load trend data:', error);
    }
  }, [goalId]);

  useEffect(() => {
    const loadAll = async () => {
      setLoading(true);
      await Promise.all([loadGoal(), loadReadiness(), loadExercises(), loadTrendData()]);
      setLoading(false);
    };
    loadAll();
  }, [loadGoal, loadReadiness, loadExercises, loadTrendData]);

  // Handlers
  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await api.post(`/career/readiness/${goalId}/refresh`);
      await loadReadiness();
    } catch (error) {
      console.error('Failed to refresh readiness:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const handleDelete = async () => {
    setDeleteLoading(true);
    try {
      await api.delete(`/career/goals/${goalId}`);
      navigate('/career');
    } catch (error) {
      console.error('Failed to delete goal:', error);
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleLogResult = () => {
    navigate(`/pt-tests?test=${goal?.ptTestId}`);
  };

  // Computed values
  const categoryMeta = goal ? (CATEGORY_META[goal.category] || CATEGORY_META.general) : CATEGORY_META.general;
  const _statusConfig = readiness ? (STATUS_COLORS[readiness.status] || STATUS_COLORS.no_data) : STATUS_COLORS.no_data;
  const daysRemaining = goal?.targetDate
    ? Math.ceil((new Date(goal.targetDate) - new Date()) / (1000 * 60 * 60 * 24))
    : null;

  if (loading) {
    return (
      <div className="min-h-screen relative">
        <MeshBackground intensity="subtle" />
        <GlassNav
          brandSlot={
            <Link to="/dashboard" className="flex items-center gap-3">
              <img src="/logo.png" alt="MuscleMap" className="w-8 h-8 rounded-lg" />
              <span className="font-bold text-lg text-[var(--text-primary)] hidden sm:block">MuscleMap</span>
            </Link>
          }
        />
        <main className="pt-20 px-4 lg:px-8 pb-24 lg:pb-8 max-w-4xl mx-auto">
          <SkeletonStats count={4} />
          <div className="mt-8">
            <SkeletonCard hasHeader lines={5} />
          </div>
        </main>
        <GlassMobileNav items={mobileNavItems} />
      </div>
    );
  }

  if (!goal) {
    return (
      <div className="min-h-screen relative">
        <MeshBackground intensity="subtle" />
        <GlassNav
          brandSlot={
            <Link to="/dashboard" className="flex items-center gap-3">
              <img src="/logo.png" alt="MuscleMap" className="w-8 h-8 rounded-lg" />
              <span className="font-bold text-lg text-[var(--text-primary)] hidden sm:block">MuscleMap</span>
            </Link>
          }
        />
        <main className="pt-20 px-4 lg:px-8 pb-24 lg:pb-8 max-w-4xl mx-auto">
          <GlassSurface className="p-12 text-center" depth="medium">
            <Icons.Target className="w-16 h-16 mx-auto mb-4 text-[var(--text-quaternary)]" />
            <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-2">Goal Not Found</h2>
            <p className="text-[var(--text-tertiary)] mb-6">
              This career goal may have been deleted or doesn&apos;t exist.
            </p>
            <GlassButton variant="primary" onClick={() => navigate('/career')}>
              Back to Career
            </GlassButton>
          </GlassSurface>
        </main>
        <GlassMobileNav items={mobileNavItems} />
      </div>
    );
  }

  return (
    <div className="min-h-screen relative">
      <MeshBackground intensity="subtle" />

      <GlassNav
        brandSlot={
          <Link to="/dashboard" className="flex items-center gap-3">
            <img src="/logo.png" alt="MuscleMap" className="w-8 h-8 rounded-lg" />
            <span className="font-bold text-lg text-[var(--text-primary)] hidden sm:block">MuscleMap</span>
          </Link>
        }
      />

      <main className="pt-20 px-4 lg:px-8 pb-24 lg:pb-8 max-w-4xl mx-auto">
        {/* Back Button */}
        <Link
          to="/career"
          className="inline-flex items-center gap-2 text-[var(--text-tertiary)] hover:text-[var(--text-primary)] mb-6 transition-colors"
        >
          <Icons.ChevronLeft className="w-5 h-5" />
          Back to Career
        </Link>

        {/* Header Card */}
        <GlassSurface className="p-6 mb-6" depth="medium">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div className="flex items-start gap-4">
              <div
                className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl flex-shrink-0"
                style={{ backgroundColor: `${categoryMeta.color}20` }}
              >
                {goal.icon || (goal.category === 'military' ? '🎖️' : goal.category === 'firefighter' ? '🔥' : goal.category === 'law_enforcement' ? '🛡️' : '🏋️')}
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h1 className="text-2xl font-black text-[var(--text-primary)]">{goal.testName}</h1>
                  {goal.priority === 'primary' && (
                    <span className="px-2 py-0.5 rounded-full text-xs bg-[var(--brand-blue-500)]/20 text-[var(--brand-blue-400)]">
                      Primary
                    </span>
                  )}
                </div>
                <p className="text-[var(--text-secondary)]">{goal.institution || categoryMeta.label}</p>
                {goal.agencyName && (
                  <p className="text-sm text-[var(--text-tertiary)]">{goal.agencyName}</p>
                )}
              </div>
            </div>

            <div className="flex gap-2">
              <GlassButton
                variant="ghost"
                size="sm"
                onClick={handleRefresh}
                disabled={refreshing}
              >
                <Icons.Refresh className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
              </GlassButton>
              <GlassButton
                variant="ghost"
                size="sm"
                onClick={() => setShowDeleteModal(true)}
              >
                <Icons.Trash className="w-4 h-4 text-red-400" />
              </GlassButton>
              <GlassButton variant="primary" onClick={handleLogResult}>
                <Icons.Plus className="w-5 h-5 mr-2" />
                Log Result
              </GlassButton>
            </div>
          </div>
        </GlassSurface>

        {/* Main Content Grid */}
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Left Column - Readiness Gauge */}
          <div className="lg:col-span-1">
            <GlassSurface className="p-6" depth="subtle">
              <h2 className="text-lg font-bold text-[var(--text-primary)] mb-6 text-center">
                Readiness Score
              </h2>
              <div className="flex justify-center mb-6">
                <ReadinessGauge
                  score={readiness?.readinessScore}
                  status={readiness?.status || 'no_data'}
                  size={180}
                />
              </div>

              {/* Stats */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 rounded-xl bg-[var(--glass-white-5)] text-center">
                  <div className="text-xl font-bold text-[var(--text-primary)]">
                    {readiness?.eventsPassed || 0}/{readiness?.eventsTotal || 0}
                  </div>
                  <div className="text-xs text-[var(--text-tertiary)]">Events Passed</div>
                </div>
                <div className="p-3 rounded-xl bg-[var(--glass-white-5)] text-center">
                  <div className="text-xl font-bold text-[var(--text-primary)]">
                    {daysRemaining !== null ? (daysRemaining >= 0 ? daysRemaining : 0) : '-'}
                  </div>
                  <div className="text-xs text-[var(--text-tertiary)]">Days Left</div>
                </div>
              </div>

              {/* Last Assessment */}
              <div className="mt-4 p-3 rounded-xl bg-[var(--glass-white-5)]">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-[var(--text-tertiary)]">Last Assessment</span>
                  <span className="text-sm font-semibold text-[var(--text-primary)]">
                    {readiness?.lastAssessmentAt
                      ? new Date(readiness.lastAssessmentAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                      : 'None'}
                  </span>
                </div>
              </div>
            </GlassSurface>
          </div>

          {/* Right Column - Events & Details */}
          <div className="lg:col-span-2 space-y-6">
            {/* Event Breakdown */}
            <GlassSurface className="p-6" depth="subtle">
              <h2 className="text-lg font-bold text-[var(--text-primary)] mb-4">
                Event Breakdown
              </h2>
              {events.length > 0 ? (
                <div className="space-y-4">
                  {events.map(event => {
                    const percentage = event.passingValue
                      ? (event.currentValue / event.passingValue) * 100
                      : 0;
                    const isPassing = percentage >= 100;
                    return (
                      <EventProgressBar
                        key={event.id}
                        event={event}
                        percentage={percentage}
                        isPassing={isPassing}
                      />
                    );
                  })}
                </div>
              ) : (
                <p className="text-[var(--text-tertiary)] text-center py-4">
                  No event data available. Log a PT test result to see your progress.
                </p>
              )}
            </GlassSurface>

            {/* Weak Events */}
            {readiness?.weakEvents && readiness.weakEvents.length > 0 && (
              <GlassSurface className="p-6" depth="subtle">
                <div className="flex items-center gap-2 mb-4">
                  <Icons.AlertTriangle className="w-5 h-5 text-amber-400" />
                  <h2 className="text-lg font-bold text-[var(--text-primary)]">
                    Weak Events
                  </h2>
                </div>
                <div className="flex flex-wrap gap-2">
                  {readiness.weakEvents.map(event => (
                    <span
                      key={event}
                      className="px-3 py-1.5 rounded-lg text-sm bg-amber-500/20 text-amber-400"
                    >
                      {event}
                    </span>
                  ))}
                </div>
                <p className="text-sm text-[var(--text-tertiary)] mt-3">
                  Focus on these events to improve your overall readiness score.
                </p>
              </GlassSurface>
            )}

            {/* Trend Chart */}
            {trendData.length > 0 && (
              <GlassSurface className="p-6" depth="subtle">
                <h2 className="text-lg font-bold text-[var(--text-primary)] mb-4">
                  Progress Trend
                </h2>
                <Suspense fallback={
                  <div className="h-48 flex items-center justify-center">
                    <div className="w-8 h-8 border-2 border-[var(--brand-blue-500)] border-t-transparent rounded-full animate-spin" />
                  </div>
                }>
                  <ReadinessTrendChart data={trendData} />
                </Suspense>
              </GlassSurface>
            )}

            {/* Recommended Exercises */}
            {exercises.length > 0 && (
              <GlassSurface className="p-6" depth="subtle">
                <div className="flex items-center gap-2 mb-4">
                  <Icons.Dumbbell className="w-5 h-5 text-[var(--brand-blue-400)]" />
                  <h2 className="text-lg font-bold text-[var(--text-primary)]">
                    Recommended Exercises
                  </h2>
                </div>
                <div className="space-y-3">
                  {exercises.slice(0, 5).map(ex => (
                    <div
                      key={ex.exerciseId}
                      className="flex items-center justify-between p-3 rounded-lg bg-[var(--glass-white-5)]"
                    >
                      <div>
                        <div className="font-semibold text-[var(--text-primary)]">{ex.exerciseName}</div>
                        <div className="text-xs text-[var(--text-tertiary)]">
                          Targets: {ex.targetEvents?.join(', ') || 'General fitness'}
                        </div>
                      </div>
                      <Link
                        to={`/exercises?search=${encodeURIComponent(ex.exerciseName)}`}
                        className="text-[var(--brand-blue-400)] hover:underline text-sm"
                      >
                        View
                      </Link>
                    </div>
                  ))}
                </div>
              </GlassSurface>
            )}

            {/* Notes */}
            {goal.notes && (
              <GlassSurface className="p-6" depth="subtle">
                <h2 className="text-lg font-bold text-[var(--text-primary)] mb-3">
                  Notes
                </h2>
                <p className="text-[var(--text-secondary)]">{goal.notes}</p>
              </GlassSurface>
            )}
          </div>
        </div>
      </main>

      <GlassMobileNav items={mobileNavItems} />

      <DeleteConfirmModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDelete}
        goalName={goal.testName}
        loading={deleteLoading}
      />
    </div>
  );
}
