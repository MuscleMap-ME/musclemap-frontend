/**
 * Career Page - MuscleMap Career Readiness Hub
 *
 * Main landing page for career physical standards tracking.
 * Shows user's career goals, readiness scores, and access to browse standards.
 *
 * Routes:
 * - /career - This page (main career hub)
 * - /career/goals/:goalId - Individual goal detail
 * - /career/standards/:standardId - Individual standard detail
 *
 * ⚡ GraphQL-only implementation - no REST calls
 */

import React, { useState, useCallback, lazy } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@apollo/client/react';
import { motion, AnimatePresence } from 'framer-motion';
import { useUser } from '../contexts/UserContext';
import {
  GlassSurface,
  GlassButton,
  GlassNav,
  GlassSidebar,
  GlassSidebarSection,
  GlassSidebarItem,
  GlassMobileNav,
  MeshBackground,
} from '../components/glass';
import { SkeletonCard, SkeletonStats } from '../components/skeletons';
import {
  MY_CAREER_GOALS_QUERY,
  CAREER_STANDARDS_QUERY,
  CAREER_STANDARD_CATEGORIES_QUERY,
} from '../graphql/queries';
import { CREATE_CAREER_GOAL_MUTATION } from '../graphql/mutations';

// Lazy load heavy chart component
const _ReadinessTrendChart = lazy(() => import('../components/career/ReadinessTrendChart').catch(() => ({ default: () => null })));

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
  Clock: ({ className = 'w-5 h-5' }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
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
  Users: ({ className = 'w-5 h-5' }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
    </svg>
  ),
  Refresh: ({ className = 'w-5 h-5' }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
    </svg>
  ),
  History: ({ className = 'w-5 h-5' }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
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
  Settings: ({ className = 'w-5 h-5' }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
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
  ready: { bg: 'bg-emerald-500/20', text: 'text-emerald-400', label: 'Ready' },
  at_risk: { bg: 'bg-amber-500/20', text: 'text-amber-400', label: 'At Risk' },
  not_ready: { bg: 'bg-red-500/20', text: 'text-red-400', label: 'Not Ready' },
  no_data: { bg: 'bg-gray-500/20', text: 'text-gray-400', label: 'No Data' },
};

// ============================================
// TYPES
// ============================================

interface CareerStandard {
  id: string;
  name: string;
  fullName?: string;
  agency?: string;
  category: string;
  description?: string;
  icon?: string;
  eventCount: number;
  events?: Array<{
    id: string;
    name: string;
  }>;
}

interface CareerReadiness {
  score: number | null;
  status: string;
  eventsPassed: number;
  eventsTotal: number;
}

interface CareerGoal {
  id: string;
  standard: CareerStandard;
  standardId: string;
  targetDate?: string;
  priority: string;
  status: string;
  agencyName?: string;
  notes?: string;
  readiness?: CareerReadiness;
  daysRemaining?: number;
  createdAt: string;
}

interface CategoryInfo {
  category: string;
  count: number;
  icon: string;
}

// ============================================
// COMPONENTS
// ============================================

// Circular Progress Gauge
function ReadinessGauge({ score, status, size = 120 }: { score: number | null; status: string; size?: number }) {
  const radius = (size - 12) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = score !== null ? (score / 100) * circumference : 0;
  const statusConfig = STATUS_COLORS[status as keyof typeof STATUS_COLORS] || STATUS_COLORS.no_data;

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
          {score !== null ? `${score}%` : '-'}
        </span>
        <span className={`text-xs font-semibold ${statusConfig.text}`}>
          {statusConfig.label}
        </span>
      </div>
    </div>
  );
}

// Goal Card (compact list item)
function GoalCard({ goal, onClick }: { goal: CareerGoal; onClick: () => void }) {
  const categoryMeta = CATEGORY_META[goal.standard?.category as keyof typeof CATEGORY_META] || CATEGORY_META.general;
  const statusConfig = STATUS_COLORS[goal.readiness?.status as keyof typeof STATUS_COLORS] || STATUS_COLORS.no_data;
  const daysRemaining = goal.daysRemaining;

  return (
    <motion.button
      onClick={onClick}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.02 }}
      className="w-full p-4 rounded-xl text-left transition-all bg-[var(--glass-white-5)] border-[var(--border-subtle)] hover:bg-[var(--glass-white-10)] border"
    >
      <div className="flex items-start gap-4">
        <div
          className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl flex-shrink-0"
          style={{ backgroundColor: `${categoryMeta.color}20` }}
        >
          {goal.standard?.icon || (goal.standard?.category === 'military' ? '🎖️' : goal.standard?.category === 'firefighter' ? '🔥' : goal.standard?.category === 'law_enforcement' ? '🛡️' : '🏋️')}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-bold text-[var(--text-primary)] truncate">{goal.standard?.name}</h3>
            {goal.priority === 'primary' && (
              <span className="px-2 py-0.5 rounded-full text-xs bg-[var(--brand-blue-500)]/20 text-[var(--brand-blue-400)]">
                Primary
              </span>
            )}
          </div>
          <p className="text-sm text-[var(--text-tertiary)] mb-2">
            {goal.agencyName || goal.standard?.agency || categoryMeta.label}
          </p>
          <div className="flex items-center gap-4">
            {goal.readiness && (
              <div className="flex items-center gap-1.5">
                <div className={`w-2 h-2 rounded-full ${statusConfig.bg.replace('/20', '')}`} />
                <span className={`text-sm font-semibold ${statusConfig.text}`}>
                  {goal.readiness.score !== null ? `${goal.readiness.score}%` : 'No data'}
                </span>
              </div>
            )}
            {daysRemaining !== null && daysRemaining !== undefined && (
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
function StandardCard({ standard, onSelect, hasGoal }: { standard: CareerStandard; onSelect: (s: CareerStandard) => void; hasGoal: boolean }) {
  const categoryMeta = CATEGORY_META[standard.category as keyof typeof CATEGORY_META] || CATEGORY_META.general;

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
          {standard.icon || (standard.category === 'military' ? '🎖️' : standard.category === 'firefighter' ? '🔥' : standard.category === 'law_enforcement' ? '🛡️' : '🏋️')}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-[var(--text-primary)] truncate">{standard.name}</h3>
          <p className="text-sm text-[var(--text-tertiary)]">{standard.agency}</p>
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
          {standard.events.slice(0, 4).map(comp => (
            <span
              key={comp.id}
              className="px-2 py-0.5 rounded-full text-xs bg-[var(--glass-white-10)] text-[var(--text-quaternary)]"
            >
              {comp.name}
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

// Add Goal Modal
function AddGoalModal({ isOpen, onClose, standard, onSubmit }: {
  isOpen: boolean;
  onClose: () => void;
  standard: CareerStandard | null;
  onSubmit: (data: { standardId: string; targetDate?: string; priority: string; agencyName?: string; notes?: string }) => Promise<void>;
}) {
  const [formData, setFormData] = useState({
    targetDate: '',
    priority: 'primary',
    agencyName: '',
    notes: '',
  });
  const [loading, setLoading] = useState(false);

  React.useEffect(() => {
    if (isOpen) {
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
    setLoading(true);
    try {
      await onSubmit({
        standardId: standard.id,
        targetDate: formData.targetDate || undefined,
        priority: formData.priority,
        agencyName: formData.agencyName || undefined,
        notes: formData.notes || undefined,
      });
      onClose();
    } catch (error) {
      console.error('Failed to create goal:', error);
    } finally {
      setLoading(false);
    }
  };

  const categoryMeta = CATEGORY_META[standard.category as keyof typeof CATEGORY_META] || CATEGORY_META.general;

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
              <GlassButton type="submit" variant="primary" className="flex-1" disabled={loading}>
                {loading ? 'Creating...' : 'Create Goal'}
              </GlassButton>
            </div>
          </form>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

// ============================================
// NAVIGATION CONFIG
// ============================================

const navSections = [
  {
    title: 'Career',
    items: [
      { to: '/career', icon: <Icons.Target className="w-5 h-5" />, label: 'Overview', active: true },
      { to: '/career?tab=goals', icon: <Icons.Clipboard className="w-5 h-5" />, label: 'My Goals' },
      { to: '/career?tab=standards', icon: <Icons.Trophy className="w-5 h-5" />, label: 'Browse Standards' },
    ]
  },
  {
    title: 'Related',
    items: [
      { to: '/pt-tests', icon: <Icons.Clipboard className="w-5 h-5" />, label: 'PT Tests' },
      { to: '/goals', icon: <Icons.Target className="w-5 h-5" />, label: 'Fitness Goals' },
      { to: '/dashboard', icon: <Icons.Home className="w-5 h-5" />, label: 'Dashboard' },
    ]
  }
];

const mobileNavItems = [
  { to: '/dashboard', icon: <Icons.Home className="w-5 h-5" />, label: 'Home' },
  { to: '/career', icon: <Icons.Target className="w-5 h-5" />, label: 'Career', active: true },
  { to: '/pt-tests', icon: <Icons.Clipboard className="w-5 h-5" />, label: 'PT Tests' },
  { to: '/profile', icon: <Icons.User className="w-5 h-5" />, label: 'Profile' },
];

// ============================================
// MAIN PAGE COMPONENT
// ============================================

export default function CareerPage() {
  const { user: _user } = useUser();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'goals';

  // State
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

  // GraphQL Mutation
  const [createGoalMutation] = useMutation(CREATE_CAREER_GOAL_MUTATION, {
    onCompleted: () => {
      refetchGoals();
    },
  });

  // Extract data
  const goals: CareerGoal[] = goalsData?.myCareerGoals || [];
  const standards: CareerStandard[] = standardsData?.careerStandards || [];
  const categories: CategoryInfo[] = categoriesData?.careerStandardCategories || [];

  const loading = goalsLoading || standardsLoading || categoriesLoading;

  // Handlers
  const handleCreateGoal = useCallback(async (data: { standardId: string; targetDate?: string; priority: string; agencyName?: string; notes?: string }) => {
    await createGoalMutation({
      variables: { input: data },
    });
  }, [createGoalMutation]);

  // Filter standards by category
  const filteredStandards = selectedCategory === 'all'
    ? standards
    : standards.filter(s => s.category === selectedCategory);

  // Get goal IDs for checking if standard already has a goal
  const goalStandardIds = new Set(goals.map(g => g.standardId));

  // Summary stats
  const primaryGoal = goals.find(g => g.priority === 'primary' && g.status === 'active');
  const activeGoalsCount = goals.filter(g => g.status === 'active').length;
  const readyGoalsCount = goals.filter(g => g.readiness?.status === 'ready').length;

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

      <div className="flex pt-16">
        {/* Sidebar - Desktop */}
        <GlassSidebar className="hidden lg:flex">
          {navSections.map((section, i) => (
            <GlassSidebarSection key={i} title={section.title}>
              {section.items.map((item, j) => (
                <GlassSidebarItem
                  key={j}
                  to={item.to}
                  icon={item.icon}
                  label={item.label}
                  active={item.active}
                />
              ))}
            </GlassSidebarSection>
          ))}
        </GlassSidebar>

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

            {/* Summary Stats */}
            {!loading && (
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                <GlassSurface className="p-4" depth="subtle">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[var(--brand-blue-500)]/20 flex items-center justify-center">
                      <Icons.Target className="w-5 h-5 text-[var(--brand-blue-400)]" />
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-[var(--text-primary)]">{activeGoalsCount}</div>
                      <div className="text-sm text-[var(--text-tertiary)]">Active Goals</div>
                    </div>
                  </div>
                </GlassSurface>

                <GlassSurface className="p-4" depth="subtle">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center">
                      <Icons.Check className="w-5 h-5 text-emerald-400" />
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-[var(--text-primary)]">{readyGoalsCount}</div>
                      <div className="text-sm text-[var(--text-tertiary)]">Ready</div>
                    </div>
                  </div>
                </GlassSurface>

                <GlassSurface className="p-4" depth="subtle">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center">
                      <Icons.Trophy className="w-5 h-5 text-amber-400" />
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-[var(--text-primary)]">{standards.length}</div>
                      <div className="text-sm text-[var(--text-tertiary)]">Standards</div>
                    </div>
                  </div>
                </GlassSurface>

                <GlassSurface className="p-4" depth="subtle">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center">
                      <Icons.History className="w-5 h-5 text-purple-400" />
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-[var(--text-primary)]">{categories.length}</div>
                      <div className="text-sm text-[var(--text-tertiary)]">Categories</div>
                    </div>
                  </div>
                </GlassSurface>
              </div>
            )}

            {/* Primary Goal Banner */}
            {primaryGoal && (
              <GlassSurface className="p-4 mb-6" depth="medium">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <ReadinessGauge
                      score={primaryGoal.readiness?.score ?? null}
                      status={primaryGoal.readiness?.status || 'no_data'}
                      size={64}
                    />
                    <div>
                      <div className="text-sm text-[var(--text-tertiary)]">Primary Goal</div>
                      <div className="font-bold text-[var(--text-primary)]">{primaryGoal.standard?.name}</div>
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
                    onClick={() => navigate(`/career/goals/${primaryGoal.id}`)}
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
                  onClick={() => setSearchParams({ tab: tab.key })}
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
              <div className="space-y-4">
                <SkeletonStats count={4} />
                <SkeletonCard hasHeader lines={3} />
                <SkeletonCard hasHeader lines={3} />
              </div>
            ) : activeTab === 'goals' ? (
              /* Goals Tab */
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
                      onClick={() => navigate(`/career/goals/${goal.id}`)}
                    />
                  ))
                )}
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
                    const meta = CATEGORY_META[cat.category as keyof typeof CATEGORY_META] || CATEGORY_META.general;
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
                        <span>{cat.category === 'military' ? '🎖️' : cat.category === 'firefighter' ? '🔥' : cat.category === 'law_enforcement' ? '🛡️' : '🏋️'}</span>
                        {meta.label} ({cat.count})
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
                      onSelect={(s) => navigate(`/career/standards/${s.id}`)}
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

      <GlassMobileNav items={mobileNavItems} />

      <AddGoalModal
        isOpen={showAddModal}
        onClose={() => {
          setShowAddModal(false);
          setSelectedStandard(null);
        }}
        standard={selectedStandard}
        onSubmit={handleCreateGoal}
      />
    </div>
  );
}
