/**
 * Career Readiness Page - MuscleMap Liquid Glass Design
 *
 * Career physical standards tracking for military, first responders, and law enforcement.
 * Set career goals, track readiness scores, get exercise recommendations for weak events.
 */

import React, { useState, useEffect, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery, useMutation } from '@apollo/client/react';
import { useUser } from '../contexts/UserContext';
import {
  MY_CAREER_GOALS_QUERY,
  MY_CAREER_READINESS_QUERY,
  CAREER_STANDARDS_QUERY,
  CAREER_STANDARD_CATEGORIES_QUERY,
  CAREER_EXERCISE_RECOMMENDATIONS_QUERY,
} from '../graphql/queries';
import { CREATE_CAREER_GOAL_MUTATION } from '../graphql/mutations';
import {
  GlassSurface,
  GlassButton,
  GlassNav,
  AnimatedLogo,
  GlassMobileNav,
  MeshBackground,
} from '../components/glass';

// ============================================
// TYPES
// ============================================

interface CareerEvent {
  id: string;
  name: string;
  description?: string;
}

interface CareerStandard {
  id: string;
  name: string;
  fullName?: string;
  agency?: string;
  category: string;
  description?: string;
  icon?: string;
  eventCount: number;
  events?: CareerEvent[];
}

interface CareerReadinessData {
  goalId: string;
  score: number;
  status: string;
  eventsPassed: number;
  eventsTotal: number;
  lastAssessmentAt?: string;
  weakEvents?: string[];
  readinessScore?: number; // alias for score
}

interface CareerGoal {
  id: string;
  standardId: string;
  standard?: CareerStandard;
  ptTestId?: string;
  testName?: string;
  institution?: string;
  category?: string;
  icon?: string;
  targetDate?: string;
  priority: string;
  status: string;
  agencyName?: string;
  notes?: string;
  readiness?: CareerReadinessData;
  daysRemaining?: number;
}

interface CategoryInfo {
  category: string;
  label: string;
  count: number;
}

interface ExerciseRecommendation {
  exerciseId: string;
  exerciseName: string;
  targetEvents: string[];
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
  Clock: ({ className = 'w-5 h-5' }: { className?: string }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  Calendar: ({ className = 'w-5 h-5' }: { className?: string }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
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
  ChevronRight: ({ className = 'w-5 h-5' }: { className?: string }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
    </svg>
  ),
  TrendingUp: ({ className = 'w-5 h-5' }: { className?: string }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
    </svg>
  ),
  TrendingDown: ({ className = 'w-5 h-5' }: { className?: string }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
    </svg>
  ),
  AlertTriangle: ({ className = 'w-5 h-5' }: { className?: string }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
    </svg>
  ),
  Dumbbell: ({ className = 'w-5 h-5' }: { className?: string }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 7h16M4 17h16M6 12h12M7 7v10m10-10v10" />
    </svg>
  ),
  Users: ({ className = 'w-5 h-5' }: { className?: string }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
    </svg>
  ),
  Refresh: ({ className = 'w-5 h-5' }: { className?: string }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
    </svg>
  ),
};

// Category metadata
const CATEGORY_META: Record<string, { color: string; icon: string; label: string }> = {
  military: { color: '#556B2F', icon: '🎖️', label: 'Military' },
  firefighter: { color: '#B22222', icon: '🔥', label: 'Firefighter' },
  law_enforcement: { color: '#191970', icon: '🛡️', label: 'Law Enforcement' },
  special_operations: { color: '#4B0082', icon: '⚡', label: 'Special Operations' },
  civil_service: { color: '#2F4F4F', icon: '🏛️', label: 'Civil Service' },
  general: { color: '#6366f1', icon: '🏋️', label: 'General Fitness' },
};

// Status colors
const STATUS_COLORS: Record<string, { bg: string; text: string; label: string }> = {
  ready: { bg: 'bg-emerald-500/20', text: 'text-emerald-400', label: 'Ready' },
  at_risk: { bg: 'bg-amber-500/20', text: 'text-amber-400', label: 'At Risk' },
  not_ready: { bg: 'bg-red-500/20', text: 'text-red-400', label: 'Not Ready' },
  no_data: { bg: 'bg-gray-500/20', text: 'text-gray-400', label: 'No Data' },
};

// ============================================
// COMPONENTS
// ============================================

// Circular Progress Gauge
function ReadinessGauge({ score, status, size = 120 }: { score: number | null; status: string; size?: number }) {
  const radius = (size - 12) / 2;
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
          strokeWidth="8"
          className="text-white/10"
        />
        {/* Progress circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference - progress}
          className={statusConfig.text}
          style={{ transition: 'stroke-dashoffset 0.5s ease-out' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-black text-[var(--text-primary)]">
          {score !== null ? `${score}%` : '—'}
        </span>
        <span className={`text-xs font-semibold ${statusConfig.text}`}>
          {statusConfig.label}
        </span>
      </div>
    </div>
  );
}

// Goal Card
function GoalCard({ goal, readiness, onClick, isSelected }: {
  goal: CareerGoal;
  readiness?: CareerReadinessData;
  onClick: () => void;
  isSelected: boolean;
}) {
  const category = goal.category || goal.standard?.category || 'general';
  const categoryMeta = CATEGORY_META[category] || CATEGORY_META.general;
  const statusConfig = STATUS_COLORS[readiness?.status || 'no_data'] || STATUS_COLORS.no_data;
  const daysRemaining = goal.targetDate
    ? Math.ceil((new Date(goal.targetDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
    : null;

  const testName = goal.testName || goal.standard?.name || 'Unknown Test';
  const institution = goal.institution || goal.standard?.agency || categoryMeta.label;
  const icon = goal.icon || goal.standard?.icon || categoryMeta.icon;
  const readinessScore = readiness?.readinessScore ?? readiness?.score ?? null;

  return (
    <motion.button
      onClick={onClick}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.02 }}
      className={`w-full p-4 rounded-xl text-left transition-all ${
        isSelected
          ? 'bg-[var(--brand-blue-500)]/20 border-[var(--brand-blue-500)]'
          : 'bg-[var(--glass-white-5)] border-[var(--border-subtle)] hover:bg-[var(--glass-white-10)]'
      } border`}
    >
      <div className="flex items-start gap-4">
        <div
          className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl flex-shrink-0"
          style={{ backgroundColor: `${categoryMeta.color}20` }}
        >
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-bold text-[var(--text-primary)] truncate">{testName}</h3>
            {goal.priority === 'primary' && (
              <span className="px-2 py-0.5 rounded-full text-xs bg-[var(--brand-blue-500)]/20 text-[var(--brand-blue-400)]">
                Primary
              </span>
            )}
          </div>
          <p className="text-sm text-[var(--text-tertiary)] mb-2">
            {institution}
          </p>
          <div className="flex items-center gap-4">
            {readiness && (
              <div className="flex items-center gap-1.5">
                <div className={`w-2 h-2 rounded-full ${statusConfig.bg.replace('/20', '')}`} />
                <span className={`text-sm font-semibold ${statusConfig.text}`}>
                  {readinessScore !== null ? `${readinessScore}%` : 'No data'}
                </span>
              </div>
            )}
            {daysRemaining !== null && (
              <div className="flex items-center gap-1.5 text-sm text-[var(--text-tertiary)]">
                <Icons.Calendar className="w-4 h-4" />
                <span>
                  {daysRemaining > 0
                    ? `${daysRemaining} days`
                    : daysRemaining === 0
                    ? 'Today!'
                    : `${Math.abs(daysRemaining)} days ago`}
                </span>
              </div>
            )}
          </div>
        </div>
        <Icons.ChevronRight className="w-5 h-5 text-[var(--text-quaternary)] flex-shrink-0" />
      </div>
    </motion.button>
  );
}

// Standard Card (for browsing)
function StandardCard({ standard, onSelect, hasGoal }: {
  standard: CareerStandard;
  onSelect: (s: CareerStandard) => void;
  hasGoal: boolean;
}) {
  const categoryMeta = CATEGORY_META[standard.category] || CATEGORY_META.general;

  return (
    <motion.button
      onClick={() => onSelect(standard)}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.02 }}
      disabled={hasGoal}
      className={`w-full p-4 rounded-xl text-left transition-all ${
        hasGoal
          ? 'bg-[var(--glass-white-5)] border-[var(--border-subtle)] opacity-60 cursor-not-allowed'
          : 'bg-[var(--glass-white-5)] border-[var(--border-subtle)] hover:bg-[var(--glass-white-10)]'
      } border`}
    >
      <div className="flex items-center gap-3">
        <div
          className="w-10 h-10 rounded-lg flex items-center justify-center text-xl flex-shrink-0"
          style={{ backgroundColor: `${categoryMeta.color}20` }}
        >
          {standard.icon || categoryMeta.icon}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-[var(--text-primary)] truncate">{standard.name}</h3>
          <p className="text-sm text-[var(--text-tertiary)]">{standard.agency || standard.fullName}</p>
        </div>
        {hasGoal ? (
          <span className="px-2 py-1 rounded-full text-xs bg-emerald-500/20 text-emerald-400">
            Active Goal
          </span>
        ) : (
          <Icons.Plus className="w-5 h-5 text-[var(--brand-blue-400)]" />
        )}
      </div>
      {standard.events && standard.events.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {standard.events.slice(0, 4).map(event => (
            <span
              key={event.id}
              className="px-2 py-0.5 rounded-full text-xs bg-[var(--glass-white-10)] text-[var(--text-quaternary)]"
            >
              {event.name}
            </span>
          ))}
          {standard.events.length > 4 && (
            <span className="px-2 py-0.5 rounded-full text-xs bg-[var(--glass-white-10)] text-[var(--text-quaternary)]">
              +{standard.events.length - 4}
            </span>
          )}
        </div>
      )}
    </motion.button>
  );
}

// Goal Detail Panel
function GoalDetailPanel({ goal, readiness, exercises, onRefresh, onLogResult }: {
  goal: CareerGoal;
  readiness?: CareerReadinessData;
  exercises: ExerciseRecommendation[];
  onRefresh: () => void;
  onLogResult: () => void;
}) {
  const category = goal.category || goal.standard?.category || 'general';
  const categoryMeta = CATEGORY_META[category] || CATEGORY_META.general;
  const daysRemaining = goal.targetDate
    ? Math.ceil((new Date(goal.targetDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
    : null;

  const testName = goal.testName || goal.standard?.name || 'Unknown Test';
  const institution = goal.institution || goal.standard?.agency || categoryMeta.label;
  const icon = goal.icon || goal.standard?.icon || categoryMeta.icon;
  const readinessScore = readiness?.readinessScore ?? readiness?.score ?? null;

  return (
    <GlassSurface className="p-6" depth="medium">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div className="flex items-center gap-4">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl"
            style={{ backgroundColor: `${categoryMeta.color}20` }}
          >
            {icon}
          </div>
          <div>
            <h2 className="text-2xl font-black text-[var(--text-primary)]">{testName}</h2>
            <p className="text-[var(--text-secondary)]">{institution}</p>
            {goal.agencyName && (
              <p className="text-sm text-[var(--text-tertiary)]">{goal.agencyName}</p>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          <GlassButton variant="ghost" size="sm" onClick={onRefresh}>
            <Icons.Refresh className="w-4 h-4" />
          </GlassButton>
          <GlassButton variant="primary" onClick={onLogResult}>
            <Icons.Plus className="w-5 h-5 mr-2" />
            Log Result
          </GlassButton>
        </div>
      </div>

      {/* Readiness Gauge */}
      <div className="flex items-center justify-center mb-6">
        <ReadinessGauge
          score={readinessScore}
          status={readiness?.status || 'no_data'}
          size={160}
        />
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="p-4 rounded-xl bg-[var(--glass-white-5)] text-center">
          <div className="text-2xl font-bold text-[var(--text-primary)]">
            {readiness?.eventsPassed || 0}/{readiness?.eventsTotal || 0}
          </div>
          <div className="text-sm text-[var(--text-tertiary)]">Events Passed</div>
        </div>
        <div className="p-4 rounded-xl bg-[var(--glass-white-5)] text-center">
          <div className="text-2xl font-bold text-[var(--text-primary)]">
            {daysRemaining !== null ? (daysRemaining >= 0 ? daysRemaining : 0) : '—'}
          </div>
          <div className="text-sm text-[var(--text-tertiary)]">Days Left</div>
        </div>
        <div className="p-4 rounded-xl bg-[var(--glass-white-5)] text-center">
          <div className="text-2xl font-bold text-[var(--text-primary)]">
            {readiness?.lastAssessmentAt
              ? new Date(readiness.lastAssessmentAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
              : '—'}
          </div>
          <div className="text-sm text-[var(--text-tertiary)]">Last Test</div>
        </div>
      </div>

      {/* Weak Events */}
      {readiness?.weakEvents && readiness.weakEvents.length > 0 && (
        <div className="mb-6">
          <h3 className="text-lg font-bold text-[var(--text-primary)] mb-3 flex items-center gap-2">
            <Icons.AlertTriangle className="w-5 h-5 text-amber-400" />
            Weak Events
          </h3>
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
        </div>
      )}

      {/* Recommended Exercises */}
      {exercises && exercises.length > 0 && (
        <div>
          <h3 className="text-lg font-bold text-[var(--text-primary)] mb-3 flex items-center gap-2">
            <Icons.Dumbbell className="w-5 h-5 text-[var(--brand-blue-400)]" />
            Recommended Exercises
          </h3>
          <div className="space-y-2">
            {exercises.slice(0, 5).map(ex => (
              <div
                key={ex.exerciseId}
                className="flex items-center justify-between p-3 rounded-lg bg-[var(--glass-white-5)]"
              >
                <div>
                  <div className="font-semibold text-[var(--text-primary)]">{ex.exerciseName}</div>
                  <div className="text-xs text-[var(--text-tertiary)]">
                    Targets: {ex.targetEvents.join(', ')}
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
        </div>
      )}

      {/* Notes */}
      {goal.notes && (
        <div className="mt-6 p-4 rounded-xl bg-[var(--glass-white-5)]">
          <div className="text-sm text-[var(--text-tertiary)] mb-1">Notes</div>
          <div className="text-[var(--text-secondary)]">{goal.notes}</div>
        </div>
      )}
    </GlassSurface>
  );
}

// Add Goal Modal
function AddGoalModal({ isOpen, onClose, standard, onSubmit, loading: submitLoading }: {
  isOpen: boolean;
  onClose: () => void;
  standard: CareerStandard | null;
  onSubmit: (data: { standardId: string; targetDate?: string; priority: string; agencyName?: string; notes?: string }) => void;
  loading: boolean;
}) {
  const [formData, setFormData] = useState({
    targetDate: '',
    priority: 'primary',
    agencyName: '',
    notes: '',
  });

  useEffect(() => {
    if (isOpen) {
      // Reset form when modal opens
      setFormData({
        targetDate: '',
        priority: 'primary',
        agencyName: '',
        notes: '',
      });
    }
  }, [isOpen, standard]);

  if (!isOpen || !standard) return null;

  const handleSubmit = async (e: React.FormEvent) => {
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
                {standard.icon || categoryMeta.icon}
              </div>
              <div>
                <h2 className="text-xl font-bold text-[var(--text-primary)]">Set Career Goal</h2>
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
              <GlassButton type="submit" variant="primary" className="flex-1" disabled={submitLoading}>
                {submitLoading ? 'Creating...' : 'Create Goal'}
              </GlassButton>
            </div>
          </form>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

// ============================================
// MAIN PAGE
// ============================================

export default function CareerReadiness() {
  const { user: _user } = useUser();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'goals';

  // State
  const [selectedGoal, setSelectedGoal] = useState<CareerGoal | null>(null);
  const [selectedCategory, setSelectedCategory] = useState('all');

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedStandard, setSelectedStandard] = useState<CareerStandard | null>(null);

  // GraphQL Queries
  const {
    data: goalsData,
    loading: goalsLoading,
    refetch: refetchGoals,
  } = useQuery(MY_CAREER_GOALS_QUERY, {
    fetchPolicy: 'cache-and-network',
  });

  const {
    data: readinessData,
    loading: readinessLoading,
    refetch: refetchReadiness,
  } = useQuery(MY_CAREER_READINESS_QUERY, {
    fetchPolicy: 'cache-and-network',
  });

  const {
    data: standardsData,
    loading: standardsLoading,
  } = useQuery(CAREER_STANDARDS_QUERY, {
    fetchPolicy: 'cache-and-network',
  });

  const {
    data: categoriesData,
    loading: categoriesLoading,
  } = useQuery(CAREER_STANDARD_CATEGORIES_QUERY, {
    fetchPolicy: 'cache-and-network',
  });

  const {
    data: exercisesData,
  } = useQuery(CAREER_EXERCISE_RECOMMENDATIONS_QUERY, {
    variables: { goalId: selectedGoal?.id },
    skip: !selectedGoal?.id,
    fetchPolicy: 'cache-and-network',
  });

  // GraphQL Mutations
  const [createCareerGoal, { loading: createGoalLoading }] = useMutation(CREATE_CAREER_GOAL_MUTATION, {
    onCompleted: () => {
      refetchGoals();
      refetchReadiness();
      setShowAddModal(false);
      setSelectedStandard(null);
    },
    onError: (error) => {
      console.error('Failed to create goal:', error);
    },
  });

  // Extract data with useMemo
  const goals = useMemo<CareerGoal[]>(
    () => goalsData?.myCareerGoals || [],
    [goalsData?.myCareerGoals]
  );

  const readinessMap = useMemo<Map<string, CareerReadinessData>>(() => {
    const readinessList = readinessData?.myCareerReadiness || [];
    const map = new Map<string, CareerReadinessData>();
    readinessList.forEach((r: CareerReadinessData) => {
      map.set(r.goalId, r);
    });
    return map;
  }, [readinessData?.myCareerReadiness]);

  const standards = useMemo<CareerStandard[]>(
    () => standardsData?.careerStandards || [],
    [standardsData?.careerStandards]
  );

  const categories = useMemo<CategoryInfo[]>(
    () => categoriesData?.careerStandardCategories || [],
    [categoriesData?.careerStandardCategories]
  );

  const selectedGoalExercises = useMemo<ExerciseRecommendation[]>(
    () => exercisesData?.careerExerciseRecommendations || [],
    [exercisesData?.careerExerciseRecommendations]
  );

  const loading = goalsLoading || readinessLoading || standardsLoading || categoriesLoading;

  // Handlers
  const handleCreateGoal = (data: { standardId: string; targetDate?: string; priority: string; agencyName?: string; notes?: string }) => {
    createCareerGoal({
      variables: {
        input: {
          standardId: data.standardId,
          targetDate: data.targetDate,
          priority: data.priority,
          agencyName: data.agencyName,
          notes: data.notes,
        },
      },
    });
  };

  const handleRefreshReadiness = async () => {
    await refetchReadiness();
  };

  // Get readiness for a specific goal
  const getGoalReadiness = (goalId: string): CareerReadinessData | undefined => {
    return readinessMap.get(goalId);
  };

  // Filter standards by category
  const filteredStandards = selectedCategory === 'all'
    ? standards
    : standards.filter(s => s.category === selectedCategory);

  // Get goal IDs for checking if standard already has a goal
  const goalStandardIds = new Set(goals.map(g => g.standardId || g.standard?.id));

  // Summary stats
  const primaryGoal = goals.find(g => g.priority === 'primary' && g.status === 'active');
  const primaryReadiness = primaryGoal ? getGoalReadiness(primaryGoal.id) : undefined;
  const activeGoalsCount = goals.filter(g => g.status === 'active').length;

  return (
    <div className="min-h-screen relative">
      <MeshBackground intensity="subtle" />

      <GlassNav
        brandSlot={
          <Link to="/dashboard" className="flex items-center gap-3">
            <AnimatedLogo size={32} breathing />
            <span className="font-bold text-lg text-[var(--text-primary)] hidden sm:block">MuscleMap</span>
          </Link>
        }
      />

      <div className="flex pt-16">
        <main className="flex-1 lg:ml-64 p-4 lg:p-8 pb-24 lg:pb-8">
          <div className="max-w-6xl mx-auto">
            {/* Header */}
            <div className="mb-8">
              <h1 className="text-3xl font-black text-[var(--text-primary)] tracking-tight">
                Career Readiness
              </h1>
              <p className="text-[var(--text-secondary)]">
                Track your physical standards for military, fire, and law enforcement careers
              </p>
            </div>

            {/* Primary Goal Banner */}
            {primaryGoal && (
              <GlassSurface className="p-4 mb-6" depth="subtle">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <ReadinessGauge
                      score={primaryReadiness?.readinessScore ?? primaryReadiness?.score ?? null}
                      status={primaryReadiness?.status || 'no_data'}
                      size={64}
                    />
                    <div>
                      <div className="text-sm text-[var(--text-tertiary)]">Primary Goal</div>
                      <div className="font-bold text-[var(--text-primary)]">
                        {primaryGoal.testName || primaryGoal.standard?.name}
                      </div>
                      {primaryGoal.targetDate && (
                        <div className="text-sm text-[var(--text-tertiary)]">
                          Target: {new Date(primaryGoal.targetDate).toLocaleDateString()}
                        </div>
                      )}
                    </div>
                  </div>
                  <GlassButton
                    variant="primary"
                    size="sm"
                    onClick={() => {
                      setSelectedGoal(primaryGoal);
                      setSearchParams({ tab: 'goals' });
                    }}
                  >
                    View Details
                  </GlassButton>
                </div>
              </GlassSurface>
            )}

            {/* Tabs */}
            <div className="flex gap-2 mb-6">
              {[
                { key: 'goals', label: 'My Goals', icon: Icons.Target, count: activeGoalsCount },
                { key: 'standards', label: 'Browse Standards', icon: Icons.Trophy },
              ].map(tab => (
                <button
                  key={tab.key}
                  onClick={() => {
                    setSearchParams({ tab: tab.key });
                    setSelectedGoal(null);
                  }}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    activeTab === tab.key
                      ? 'bg-[var(--brand-blue-500)] text-white'
                      : 'bg-[var(--glass-white-5)] text-[var(--text-secondary)] hover:bg-[var(--glass-white-10)]'
                  }`}
                >
                  <tab.icon className="w-4 h-4" />
                  {tab.label}
                  {tab.count !== undefined && tab.count > 0 && (
                    <span className={`ml-1 px-1.5 py-0.5 rounded-full text-xs ${
                      activeTab === tab.key
                        ? 'bg-white/20'
                        : 'bg-[var(--glass-white-10)]'
                    }`}>
                      {tab.count}
                    </span>
                  )}
                </button>
              ))}
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="w-8 h-8 border-2 border-[var(--brand-blue-500)] border-t-transparent rounded-full animate-spin" />
              </div>
            ) : activeTab === 'goals' ? (
              /* Goals Tab */
              <div className="grid lg:grid-cols-2 gap-6">
                {/* Goals List */}
                <div className="space-y-4">
                  {goals.length === 0 ? (
                    <GlassSurface className="p-8 text-center" depth="subtle">
                      <Icons.Target className="w-16 h-16 mx-auto mb-4 text-[var(--text-quaternary)]" />
                      <h3 className="text-xl font-bold text-[var(--text-primary)] mb-2">
                        No Career Goals Yet
                      </h3>
                      <p className="text-[var(--text-tertiary)] mb-6">
                        Set a career goal to start tracking your readiness for physical standards
                      </p>
                      <GlassButton
                        variant="primary"
                        onClick={() => setSearchParams({ tab: 'standards' })}
                      >
                        Browse Standards
                      </GlassButton>
                    </GlassSurface>
                  ) : (
                    goals.map(goal => (
                      <GoalCard
                        key={goal.id}
                        goal={goal}
                        readiness={getGoalReadiness(goal.id)}
                        onClick={() => setSelectedGoal(goal)}
                        isSelected={selectedGoal?.id === goal.id}
                      />
                    ))
                  )}
                </div>

                {/* Goal Detail */}
                <div className="lg:sticky lg:top-24 lg:h-fit">
                  {selectedGoal ? (
                    <GoalDetailPanel
                      goal={selectedGoal}
                      readiness={getGoalReadiness(selectedGoal.id)}
                      exercises={selectedGoalExercises}
                      onRefresh={handleRefreshReadiness}
                      onLogResult={() => {
                        // Navigate to PT Tests page for result logging
                        const testId = selectedGoal.standardId || selectedGoal.standard?.id;
                        window.location.href = `/pt-tests?test=${testId}`;
                      }}
                    />
                  ) : goals.length > 0 ? (
                    <GlassSurface className="p-12 text-center" depth="subtle">
                      <Icons.Target className="w-16 h-16 mx-auto mb-4 text-[var(--text-quaternary)]" />
                      <h3 className="text-xl font-bold text-[var(--text-primary)] mb-2">
                        Select a Goal
                      </h3>
                      <p className="text-[var(--text-tertiary)]">
                        Choose a goal to view readiness details and exercise recommendations
                      </p>
                    </GlassSurface>
                  ) : null}
                </div>
              </div>
            ) : (
              /* Standards Tab */
              <div>
                {/* Category Filter */}
                <div className="flex flex-wrap gap-2 mb-6">
                  <button
                    onClick={() => setSelectedCategory('all')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      selectedCategory === 'all'
                        ? 'bg-[var(--brand-blue-500)] text-white'
                        : 'bg-[var(--glass-white-5)] text-[var(--text-secondary)] hover:bg-[var(--glass-white-10)]'
                    }`}
                  >
                    All ({standards.length})
                  </button>
                  {categories.map(cat => {
                    const meta = CATEGORY_META[cat.category] || CATEGORY_META.general;
                    return (
                      <button
                        key={cat.category}
                        onClick={() => setSelectedCategory(cat.category)}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
                          selectedCategory === cat.category
                            ? 'bg-[var(--brand-blue-500)] text-white'
                            : 'bg-[var(--glass-white-5)] text-[var(--text-secondary)] hover:bg-[var(--glass-white-10)]'
                        }`}
                      >
                        <span>{meta.icon}</span>
                        {cat.label || meta.label} ({cat.count})
                      </button>
                    );
                  })}
                </div>

                {/* Standards Grid */}
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredStandards.map(standard => (
                    <StandardCard
                      key={standard.id}
                      standard={standard}
                      onSelect={(s) => {
                        setSelectedStandard(s);
                        setShowAddModal(true);
                      }}
                      hasGoal={goalStandardIds.has(standard.id)}
                    />
                  ))}
                </div>

                {filteredStandards.length === 0 && (
                  <GlassSurface className="p-12 text-center" depth="subtle">
                    <Icons.Trophy className="w-16 h-16 mx-auto mb-4 text-[var(--text-quaternary)]" />
                    <h3 className="text-xl font-bold text-[var(--text-primary)] mb-2">
                      No Standards Found
                    </h3>
                    <p className="text-[var(--text-tertiary)]">
                      Try selecting a different category
                    </p>
                  </GlassSurface>
                )}
              </div>
            )}
          </div>
        </main>
      </div>

      <GlassMobileNav items={[
        { to: '/dashboard', icon: Icons.Target, label: 'Home' },
        { to: '/career-readiness', icon: Icons.Target, label: 'Career', active: true },
        { to: '/pt-tests', icon: Icons.Trophy, label: 'PT Tests' },
        { to: '/profile', icon: Icons.Users, label: 'Profile' },
      ]} />

      <AddGoalModal
        isOpen={showAddModal}
        onClose={() => {
          setShowAddModal(false);
          setSelectedStandard(null);
        }}
        standard={selectedStandard}
        onSubmit={handleCreateGoal}
        loading={createGoalLoading}
      />
    </div>
  );
}
