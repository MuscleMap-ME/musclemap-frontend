/**
 * Career Standard Detail Page - MuscleMap
 *
 * Shows detailed information about a specific physical fitness standard.
 * Includes all events, passing requirements, exercise mappings, and option to set as goal.
 *
 * Route: /career/standards/:standardId
 *
 * Converted to GraphQL for improved performance via Apollo caching.
 */

import React, { useState, useMemo, useCallback } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery, useMutation } from '@apollo/client/react';
import { useAuth } from '../store';
import {
  CAREER_STANDARD_QUERY,
  MY_CAREER_GOALS_QUERY,
  CAREER_EXERCISE_RECOMMENDATIONS_QUERY,
  CREATE_CAREER_GOAL_MUTATION,
} from '../graphql';
import {
  GlassSurface,
  GlassButton,
  GlassNav,
  GlassMobileNav,
  MeshBackground,
} from '../components/glass';
import { SkeletonCard, SkeletonStats } from '../components/skeletons';

// ============================================
// TYPES
// ============================================

interface CareerStandardEvent {
  id: string;
  name: string;
  description: string;
  metricType: string;
  metricUnit: string;
  direction: string;
  passingThreshold: number;
  exerciseMappings?: string[];
  tips?: string[];
  orderIndex: number;
}

interface CareerStandard {
  id: string;
  name: string;
  fullName?: string;
  agency?: string;
  category: string;
  description?: string;
  officialUrl?: string;
  scoringType: string;
  recertificationPeriodMonths?: number;
  events: CareerStandardEvent[];
  eventCount: number;
  icon?: string;
  maxScore?: number;
  passingScore?: number;
}

interface CareerGoal {
  id: string;
  standardId: string;
}

interface ExerciseRecommendation {
  exerciseId: string;
  exerciseName: string;
  targetEvents?: string[];
}

// ============================================
// ICONS
// ============================================

const Icons = {
  Target: ({ className = 'w-5 h-5' }: { className?: string }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
    </svg>
  ),
  Trophy: ({ className = 'w-5 h-5' }: { className?: string }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
    </svg>
  ),
  Plus: ({ className = 'w-5 h-5' }: { className?: string }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
    </svg>
  ),
  X: ({ className = 'w-5 h-5' }: { className?: string }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  ),
  Check: ({ className = 'w-5 h-5' }: { className?: string }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
  ),
  ChevronLeft: ({ className = 'w-5 h-5' }: { className?: string }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
    </svg>
  ),
  ChevronRight: ({ className = 'w-5 h-5' }: { className?: string }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
    </svg>
  ),
  Dumbbell: ({ className = 'w-5 h-5' }: { className?: string }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 7h16M4 17h16M6 12h12M7 7v10m10-10v10" />
    </svg>
  ),
  Info: ({ className = 'w-5 h-5' }: { className?: string }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  ExternalLink: ({ className = 'w-5 h-5' }: { className?: string }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
    </svg>
  ),
  Home: ({ className = 'w-5 h-5' }: { className?: string }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
    </svg>
  ),
  Clipboard: ({ className = 'w-5 h-5' }: { className?: string }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
    </svg>
  ),
  User: ({ className = 'w-5 h-5' }: { className?: string }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
  ),
};

// ============================================
// CATEGORY METADATA
// ============================================

const CATEGORY_META: Record<string, { color: string; label: string }> = {
  military: { color: '#556B2F', label: 'Military' },
  firefighter: { color: '#B22222', label: 'Firefighter' },
  law_enforcement: { color: '#191970', label: 'Law Enforcement' },
  special_operations: { color: '#4B0082', label: 'Special Operations' },
  civil_service: { color: '#2F4F4F', label: 'Civil Service' },
  general: { color: '#6366f1', label: 'General Fitness' },
};

// ============================================
// COMPONENTS
// ============================================

// Event Type Badge
function EventTypeBadge({ type }: { type: string }) {
  const typeConfig: Record<string, { bg: string; text: string; label: string }> = {
    timed: { bg: 'bg-blue-500/20', text: 'text-blue-400', label: 'Timed' },
    reps: { bg: 'bg-emerald-500/20', text: 'text-emerald-400', label: 'Reps' },
    distance: { bg: 'bg-purple-500/20', text: 'text-purple-400', label: 'Distance' },
    pass_fail: { bg: 'bg-amber-500/20', text: 'text-amber-400', label: 'Pass/Fail' },
  };

  const config = typeConfig[type] || { bg: 'bg-gray-500/20', text: 'text-gray-400', label: type };

  return (
    <span className={`px-2 py-0.5 rounded-full text-xs ${config.bg} ${config.text}`}>
      {config.label}
    </span>
  );
}

// Event Card
function EventCard({ event, index }: { event: CareerStandardEvent; index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className="p-4 rounded-xl bg-[var(--glass-white-5)] border border-[var(--border-subtle)]"
    >
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="font-bold text-[var(--text-primary)]">{event.name}</h3>
          <p className="text-sm text-[var(--text-tertiary)]">{event.description}</p>
        </div>
        <EventTypeBadge type={event.metricType} />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="p-3 rounded-lg bg-[var(--glass-white-5)]">
          <div className="text-xs text-[var(--text-tertiary)] mb-1">Passing Standard</div>
          <div className="font-bold text-[var(--text-primary)]">
            {event.passingThreshold} {event.metricUnit}
          </div>
        </div>
      </div>

      {event.tips && event.tips.length > 0 && (
        <div className="mt-3 flex items-center gap-2 text-xs text-amber-400">
          <Icons.Info className="w-4 h-4" />
          {event.tips[0]}
        </div>
      )}
    </motion.div>
  );
}

// Add Goal Modal
function AddGoalModal({
  isOpen,
  onClose,
  standard,
  onSubmit,
  isSubmitting,
}: {
  isOpen: boolean;
  onClose: () => void;
  standard: CareerStandard | null;
  onSubmit: (data: {
    standardId: string;
    targetDate?: string;
    priority: string;
    agencyName?: string;
    notes?: string;
  }) => void;
  isSubmitting: boolean;
}) {
  const [formData, setFormData] = useState({
    targetDate: '',
    priority: 'primary',
    agencyName: '',
    notes: '',
  });

  if (!isOpen || !standard) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      standardId: standard.id,
      targetDate: formData.targetDate || undefined,
      priority: formData.priority,
      agencyName: formData.agencyName || undefined,
      notes: formData.notes || undefined,
    });
  };

  const categoryMeta = CATEGORY_META[standard.category] || CATEGORY_META.general;

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
          <div className="flex justify-between items-start mb-6">
            <div className="flex items-center gap-3">
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl"
                style={{ backgroundColor: `${categoryMeta.color}20` }}
              >
                {standard.icon || (standard.category === 'military' ? '🎖️' : standard.category === 'firefighter' ? '🔥' : '🏋️')}
              </div>
              <div>
                <h2 className="text-xl font-bold text-[var(--text-primary)]">Set as Goal</h2>
                <p className="text-sm text-[var(--text-tertiary)]">{standard.name}</p>
              </div>
            </div>
            <button onClick={onClose} className="text-[var(--text-tertiary)] hover:text-[var(--text-primary)]">
              <Icons.X className="w-6 h-6" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                Target Date (Optional)
              </label>
              <input
                type="date"
                value={formData.targetDate}
                onChange={e => setFormData({ ...formData, targetDate: e.target.value })}
                className="w-full px-3 py-2 rounded-lg bg-[var(--glass-white-5)] border border-[var(--border-subtle)] text-[var(--text-primary)]"
              />
              <p className="text-xs text-[var(--text-tertiary)] mt-1">
                When do you need to pass this test?
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                Priority
              </label>
              <div className="flex gap-2">
                {['primary', 'secondary'].map(p => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setFormData({ ...formData, priority: p })}
                    className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      formData.priority === p
                        ? 'bg-[var(--brand-blue-500)] text-white'
                        : 'bg-[var(--glass-white-5)] text-[var(--text-secondary)] hover:bg-[var(--glass-white-10)]'
                    }`}
                  >
                    {p.charAt(0).toUpperCase() + p.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                Agency/Unit Name (Optional)
              </label>
              <input
                type="text"
                value={formData.agencyName}
                onChange={e => setFormData({ ...formData, agencyName: e.target.value })}
                className="w-full px-3 py-2 rounded-lg bg-[var(--glass-white-5)] border border-[var(--border-subtle)] text-[var(--text-primary)]"
                placeholder="e.g., FDNY, Fort Bragg, LAPD"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
                Notes (Optional)
              </label>
              <textarea
                value={formData.notes}
                onChange={e => setFormData({ ...formData, notes: e.target.value })}
                rows={2}
                className="w-full px-3 py-2 rounded-lg bg-[var(--glass-white-5)] border border-[var(--border-subtle)] text-[var(--text-primary)]"
                placeholder="Any additional notes..."
              />
            </div>

            <div className="flex gap-3 pt-4">
              <GlassButton type="button" variant="ghost" className="flex-1" onClick={onClose}>
                Cancel
              </GlassButton>
              <GlassButton type="submit" variant="primary" className="flex-1" disabled={isSubmitting}>
                {isSubmitting ? 'Creating...' : 'Set as Goal'}
              </GlassButton>
            </div>
          </form>
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

export default function CareerStandardPage() {
  const { standardId } = useParams<{ standardId: string }>();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  // State
  const [showAddModal, setShowAddModal] = useState(false);

  // GraphQL Queries
  const { data: standardData, loading: standardLoading } = useQuery(CAREER_STANDARD_QUERY, {
    variables: { id: standardId },
    skip: !isAuthenticated || !standardId,
    fetchPolicy: 'cache-and-network',
  });

  const { data: goalsData } = useQuery(MY_CAREER_GOALS_QUERY, {
    skip: !isAuthenticated,
    fetchPolicy: 'cache-and-network',
  });

  const { data: exercisesData } = useQuery(CAREER_EXERCISE_RECOMMENDATIONS_QUERY, {
    variables: { goalId: standardId },
    skip: !isAuthenticated || !standardId,
    fetchPolicy: 'cache-and-network',
  });

  // GraphQL Mutation
  const [createGoal, { loading: isCreating }] = useMutation(CREATE_CAREER_GOAL_MUTATION, {
    onCompleted: () => {
      setShowAddModal(false);
      navigate('/career?tab=goals');
    },
    onError: (err) => {
      console.error('Failed to create goal:', err);
    },
    refetchQueries: [{ query: MY_CAREER_GOALS_QUERY }],
  });

  // Memoized data extraction
  const standard: CareerStandard | null = useMemo(() => {
    return standardData?.careerStandard || null;
  }, [standardData]);

  const events: CareerStandardEvent[] = useMemo(() => {
    return standard?.events || [];
  }, [standard]);

  const exercises: ExerciseRecommendation[] = useMemo(() => {
    return exercisesData?.careerExerciseRecommendations || [];
  }, [exercisesData]);

  const hasGoal: boolean = useMemo(() => {
    const goals: CareerGoal[] = goalsData?.myCareerGoals || [];
    return goals.some(g => g.standardId === standardId);
  }, [goalsData, standardId]);

  // Handlers
  const handleCreateGoal = useCallback(
    (data: {
      standardId: string;
      targetDate?: string;
      priority: string;
      agencyName?: string;
      notes?: string;
    }) => {
      createGoal({
        variables: {
          input: data,
        },
      });
    },
    [createGoal]
  );

  const handleOpenModal = useCallback(() => {
    setShowAddModal(true);
  }, []);

  const handleCloseModal = useCallback(() => {
    setShowAddModal(false);
  }, []);

  // Computed values
  const categoryMeta = standard ? (CATEGORY_META[standard.category] || CATEGORY_META.general) : CATEGORY_META.general;

  if (standardLoading) {
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
          <SkeletonStats count={3} />
          <div className="mt-8 space-y-4">
            <SkeletonCard hasHeader lines={4} />
            <SkeletonCard hasHeader lines={4} />
          </div>
        </main>
        <GlassMobileNav items={mobileNavItems} />
      </div>
    );
  }

  if (!standard) {
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
            <Icons.Trophy className="w-16 h-16 mx-auto mb-4 text-[var(--text-quaternary)]" />
            <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-2">Standard Not Found</h2>
            <p className="text-[var(--text-tertiary)] mb-6">
              This physical standard may not exist or has been removed.
            </p>
            <GlassButton variant="primary" onClick={() => navigate('/career?tab=standards')}>
              Browse Standards
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
          to="/career?tab=standards"
          className="inline-flex items-center gap-2 text-[var(--text-tertiary)] hover:text-[var(--text-primary)] mb-6 transition-colors"
        >
          <Icons.ChevronLeft className="w-5 h-5" />
          Back to Standards
        </Link>

        {/* Header Card */}
        <GlassSurface className="p-6 mb-6" depth="medium">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div className="flex items-start gap-4">
              <div
                className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl flex-shrink-0"
                style={{ backgroundColor: `${categoryMeta.color}20` }}
              >
                {standard.icon || (standard.category === 'military' ? '🎖️' : standard.category === 'firefighter' ? '🔥' : standard.category === 'law_enforcement' ? '🛡️' : '🏋️')}
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h1 className="text-2xl font-black text-[var(--text-primary)]">{standard.name}</h1>
                </div>
                <p className="text-[var(--text-secondary)]">{standard.agency}</p>
                <div className="flex items-center gap-3 mt-2">
                  <span
                    className="px-3 py-1 rounded-full text-sm"
                    style={{ backgroundColor: `${categoryMeta.color}20`, color: categoryMeta.color }}
                  >
                    {categoryMeta.label}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex gap-2">
              {hasGoal ? (
                <GlassButton
                  variant="secondary"
                  onClick={() => navigate('/career?tab=goals')}
                >
                  <Icons.Check className="w-5 h-5 mr-2 text-emerald-400" />
                  Active Goal
                </GlassButton>
              ) : (
                <GlassButton
                  variant="primary"
                  onClick={handleOpenModal}
                >
                  <Icons.Plus className="w-5 h-5 mr-2" />
                  Set as Goal
                </GlassButton>
              )}
            </div>
          </div>
        </GlassSurface>

        {/* Description */}
        {standard.description && (
          <GlassSurface className="p-6 mb-6" depth="subtle">
            <h2 className="text-lg font-bold text-[var(--text-primary)] mb-3">
              About This Standard
            </h2>
            <p className="text-[var(--text-secondary)]">{standard.description}</p>
            {standard.officialUrl && (
              <a
                href={standard.officialUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 mt-4 text-[var(--brand-blue-400)] hover:underline"
              >
                Official Documentation
                <Icons.ExternalLink className="w-4 h-4" />
              </a>
            )}
          </GlassSurface>
        )}

        {/* Summary Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <GlassSurface className="p-4" depth="subtle">
            <div className="text-2xl font-bold text-[var(--text-primary)]">{events.length}</div>
            <div className="text-sm text-[var(--text-tertiary)]">Events</div>
          </GlassSurface>

          <GlassSurface className="p-4" depth="subtle">
            <div className="text-2xl font-bold text-[var(--text-primary)]">
              {standard.recertificationPeriodMonths ? `${standard.recertificationPeriodMonths}mo` : '-'}
            </div>
            <div className="text-sm text-[var(--text-tertiary)]">Recert Period</div>
          </GlassSurface>

          <GlassSurface className="p-4" depth="subtle">
            <div className="text-2xl font-bold text-[var(--text-primary)]">
              {standard.passingScore || '100'}%
            </div>
            <div className="text-sm text-[var(--text-tertiary)]">Pass Rate</div>
          </GlassSurface>

          <GlassSurface className="p-4" depth="subtle">
            <div className="text-2xl font-bold text-[var(--text-primary)]">
              {exercises.length}
            </div>
            <div className="text-sm text-[var(--text-tertiary)]">Exercises Mapped</div>
          </GlassSurface>
        </div>

        {/* Events Section */}
        <GlassSurface className="p-6 mb-6" depth="subtle">
          <h2 className="text-lg font-bold text-[var(--text-primary)] mb-4">
            Test Events
          </h2>
          {events.length > 0 ? (
            <div className="grid md:grid-cols-2 gap-4">
              {events.map((event, index) => (
                <EventCard key={event.id} event={event} index={index} />
              ))}
            </div>
          ) : (
            <p className="text-[var(--text-tertiary)] text-center py-8">
              No event details available for this standard.
            </p>
          )}
        </GlassSurface>

        {/* Exercise Mappings */}
        {exercises.length > 0 && (
          <GlassSurface className="p-6" depth="subtle">
            <div className="flex items-center gap-2 mb-4">
              <Icons.Dumbbell className="w-5 h-5 text-[var(--brand-blue-400)]" />
              <h2 className="text-lg font-bold text-[var(--text-primary)]">
                Recommended Training Exercises
              </h2>
            </div>
            <div className="space-y-3">
              {exercises.map(ex => (
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
                    className="text-[var(--brand-blue-400)] hover:underline text-sm flex items-center gap-1"
                  >
                    View
                    <Icons.ChevronRight className="w-4 h-4" />
                  </Link>
                </div>
              ))}
            </div>
          </GlassSurface>
        )}
      </main>

      <GlassMobileNav items={mobileNavItems} />

      <AddGoalModal
        isOpen={showAddModal}
        onClose={handleCloseModal}
        standard={standard}
        onSubmit={handleCreateGoal}
        isSubmitting={isCreating}
      />
    </div>
  );
}
