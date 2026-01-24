/**
 * ReadinessDashboard - Main dashboard showing career readiness
 *
 * Displays:
 * - Overall readiness percentage (big circular progress)
 * - Days until target date
 * - Per-event breakdown (passed/failed/needs-work)
 * - Trend chart
 * - "Log Assessment" and "Get Workout" buttons
 */

import React, { useMemo } from 'react';
import { useQuery } from '@apollo/client/react';
import { motion } from 'framer-motion';
import clsx from 'clsx';
import { MY_CAREER_READINESS_QUERY, CAREER_EXERCISE_RECOMMENDATIONS_QUERY } from '../../graphql';
import { GlassSurface, GlassButton } from '../glass';
import { CATEGORY_META } from './CareerStandardCard';
import EventBreakdown from './EventBreakdown';

interface CareerGoal {
  id: string;
  testName?: string;
  institution?: string;
  agencyName?: string;
  category?: string;
  icon?: string;
  targetDate?: string;
  notes?: string;
}

interface EventBreakdownItem {
  eventId: string;
  eventName: string;
  passed: boolean;
  value?: string;
  status: string;
}

interface CareerReadiness {
  score: number | null;
  status: string;
  trend?: string;
  trendDelta?: number;
  eventBreakdown?: EventBreakdownItem[];
  weakEvents?: string[];
  lastAssessmentAt?: string;
  eventsPassed?: number;
  eventsTotal?: number;
}

interface ExerciseRecommendation {
  exerciseId: string;
  exerciseName: string;
  targetEvents?: string[];
}

/**
 * Status configuration for readiness levels
 */
const STATUS_CONFIG: Record<string, { bg: string; text: string; border: string; label: string; icon: string }> = {
  ready: {
    bg: 'bg-emerald-500/20',
    text: 'text-emerald-400',
    border: 'border-emerald-500/30',
    label: 'Ready',
    icon: '\u2705',
  },
  at_risk: {
    bg: 'bg-amber-500/20',
    text: 'text-amber-400',
    border: 'border-amber-500/30',
    label: 'At Risk',
    icon: '\u26A0\uFE0F',
  },
  not_ready: {
    bg: 'bg-red-500/20',
    text: 'text-red-400',
    border: 'border-red-500/30',
    label: 'Not Ready',
    icon: '\u274C',
  },
  no_data: {
    bg: 'bg-gray-500/20',
    text: 'text-gray-400',
    border: 'border-gray-500/30',
    label: 'No Data',
    icon: '\u2754',
  },
};

interface ReadinessDashboardProps {
  goal: CareerGoal | null;
  onRefresh?: (goalId: string) => void;
  onLogAssessment?: () => void;
  onGetWorkout?: () => void;
}

/**
 * ReadinessDashboard Component
 *
 * @param {Object} goal - The career goal object
 * @param {Function} onRefresh - Callback to refresh readiness
 * @param {Function} onLogAssessment - Callback to open assessment logger
 * @param {Function} onGetWorkout - Callback to get workout prescription
 */
export default function ReadinessDashboard({
  goal,
  onRefresh,
  onLogAssessment,
  onGetWorkout,
}: ReadinessDashboardProps) {
  // Fetch readiness data via GraphQL
  const { data: readinessData, loading, refetch } = useQuery(MY_CAREER_READINESS_QUERY, {
    variables: { goalId: goal?.id },
    skip: !goal?.id,
    fetchPolicy: 'cache-and-network',
  });

  // Fetch exercise recommendations
  const { data: exercisesData } = useQuery(CAREER_EXERCISE_RECOMMENDATIONS_QUERY, {
    variables: { goalId: goal?.id },
    skip: !goal?.id,
    fetchPolicy: 'cache-and-network',
  });

  const readiness: CareerReadiness | null = useMemo(
    () => readinessData?.myCareerReadiness || null,
    [readinessData]
  );

  const exercises: ExerciseRecommendation[] = useMemo(
    () => exercisesData?.careerExerciseRecommendations || [],
    [exercisesData]
  );

  const categoryMeta = CATEGORY_META[goal?.category || 'general'] || CATEGORY_META.general;
  const statusConfig = STATUS_CONFIG[readiness?.status || 'no_data'] || STATUS_CONFIG.no_data;

  // Calculate days remaining
  const daysRemaining = goal?.targetDate
    ? Math.ceil((new Date(goal.targetDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
    : null;

  const handleRefresh = async () => {
    if (!goal?.id) return;
    await refetch();
    onRefresh?.(goal.id);
  };

  if (!goal) {
    return (
      <GlassSurface className="p-8 text-center" depth="medium">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-[var(--glass-white-10)] flex items-center justify-center">
          <TargetIcon className="w-8 h-8 text-[var(--text-quaternary)]" />
        </div>
        <h3 className="text-xl font-bold text-[var(--text-primary)] mb-2">
          Select a Goal
        </h3>
        <p className="text-[var(--text-tertiary)]">
          Choose a career goal to view your readiness dashboard
        </p>
      </GlassSurface>
    );
  }

  return (
    <GlassSurface className="p-6" depth="medium">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div className="flex items-center gap-4">
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl"
            style={{ backgroundColor: `${categoryMeta.color}30` }}
          >
            {goal.icon || categoryMeta.icon}
          </div>
          <div>
            <h2 className="text-xl font-black text-[var(--text-primary)]">
              {goal.testName}
            </h2>
            <p className="text-sm text-[var(--text-secondary)]">
              {goal.institution || categoryMeta.label}
            </p>
            {goal.agencyName && (
              <p className="text-xs text-[var(--text-tertiary)]">{goal.agencyName}</p>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          <motion.button
            onClick={handleRefresh}
            disabled={loading}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className={clsx(
              'w-10 h-10 rounded-xl flex items-center justify-center',
              'bg-[var(--glass-white-5)] hover:bg-[var(--glass-white-10)]',
              'text-[var(--text-tertiary)] hover:text-[var(--text-primary)]',
              'transition-colors',
              loading && 'animate-spin'
            )}
          >
            <RefreshIcon className="w-5 h-5" />
          </motion.button>
        </div>
      </div>

      {/* Main Readiness Display */}
      <div className="flex flex-col items-center mb-8">
        {/* Large Circular Progress */}
        <div className="relative mb-4">
          <ReadinessGauge
            score={readiness?.score ?? null}
            status={readiness?.status || 'no_data'}
            size={180}
          />
          {/* Status Badge */}
          <div
            className={clsx(
              'absolute -bottom-2 left-1/2 -translate-x-1/2',
              'px-4 py-1.5 rounded-full text-sm font-semibold',
              statusConfig.bg,
              statusConfig.text,
              'border',
              statusConfig.border
            )}
          >
            {statusConfig.icon} {statusConfig.label}
          </div>
        </div>

        {/* Quick Stats */}
        <div className="w-full grid grid-cols-3 gap-4 mt-4">
          <StatCard
            label="Events Passed"
            value={`${readiness?.eventsPassed || 0}/${readiness?.eventsTotal || 0}`}
            icon={<CheckIcon className="w-5 h-5" />}
            color="emerald"
          />
          <StatCard
            label="Days Left"
            value={daysRemaining !== null ? (daysRemaining >= 0 ? daysRemaining : 0) : '-'}
            icon={<CalendarIcon className="w-5 h-5" />}
            color={daysRemaining && daysRemaining < 14 ? 'amber' : 'blue'}
            subtitle={daysRemaining !== null && daysRemaining < 0 ? 'Overdue' : undefined}
          />
          <StatCard
            label="Last Test"
            value={
              readiness?.lastAssessmentAt
                ? new Date(readiness.lastAssessmentAt).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                  })
                : '-'
            }
            icon={<ClipboardIcon className="w-5 h-5" />}
            color="purple"
          />
        </div>
      </div>

      {/* Action Buttons */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <GlassButton
          variant="primary"
          fullWidth
          onClick={onLogAssessment}
          leftIcon={<PlusIcon className="w-5 h-5" />}
        >
          Log Assessment
        </GlassButton>
        <GlassButton
          variant="glass"
          fullWidth
          onClick={onGetWorkout}
          leftIcon={<DumbbellIcon className="w-5 h-5" />}
        >
          Get Workout
        </GlassButton>
      </div>

      {/* Event Breakdown */}
      {readiness?.eventBreakdown && readiness.eventBreakdown.length > 0 && (
        <div className="mb-6">
          <EventBreakdown events={readiness.eventBreakdown} />
        </div>
      )}

      {/* Weak Events Alert */}
      {readiness?.weakEvents && readiness.weakEvents.length > 0 && (
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <AlertIcon className="w-5 h-5 text-amber-400" />
            <h3 className="font-bold text-[var(--text-primary)]">Focus Areas</h3>
          </div>
          <div className="flex flex-wrap gap-2">
            {readiness.weakEvents.map((event) => (
              <motion.span
                key={event}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="px-3 py-1.5 rounded-lg text-sm bg-amber-500/20 text-amber-400 font-medium"
              >
                {event}
              </motion.span>
            ))}
          </div>
        </div>
      )}

      {/* Recommended Exercises */}
      {exercises && exercises.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <DumbbellIcon className="w-5 h-5 text-[var(--brand-blue-400)]" />
            <h3 className="font-bold text-[var(--text-primary)]">Recommended Exercises</h3>
          </div>
          <div className="space-y-2">
            {exercises.slice(0, 5).map((ex) => (
              <motion.div
                key={ex.exerciseId}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center justify-between p-3 rounded-xl bg-[var(--glass-white-5)] hover:bg-[var(--glass-white-10)] transition-colors cursor-pointer"
              >
                <div>
                  <div className="font-semibold text-[var(--text-primary)]">
                    {ex.exerciseName}
                  </div>
                  <div className="text-xs text-[var(--text-tertiary)]">
                    Targets: {ex.targetEvents?.join(', ') || 'General fitness'}
                  </div>
                </div>
                <ChevronRightIcon className="w-5 h-5 text-[var(--text-quaternary)]" />
              </motion.div>
            ))}
          </div>
          {exercises.length > 5 && (
            <button className="mt-3 text-sm text-[var(--brand-blue-400)] hover:underline">
              View all {exercises.length} exercises
            </button>
          )}
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

interface ReadinessGaugeProps {
  score: number | null;
  status: string;
  size?: number;
}

/**
 * ReadinessGauge - Large circular progress component
 */
function ReadinessGauge({ score, status: _status, size = 160 }: ReadinessGaugeProps) {
  const radius = (size - 16) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = score !== null ? (score / 100) * circumference : 0;

  // Determine color based on score
  const getColor = () => {
    if (score === null) return 'var(--text-quaternary)';
    if (score >= 80) return '#22c55e'; // green
    if (score >= 60) return '#f59e0b'; // amber
    return '#ef4444'; // red
  };

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg className="transform -rotate-90" width={size} height={size}>
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--glass-white-10)"
          strokeWidth="12"
        />
        {/* Progress circle */}
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={getColor()}
          strokeWidth="12"
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: circumference - progress }}
          transition={{ duration: 1, ease: 'easeOut' }}
          style={{
            filter: `drop-shadow(0 0 8px ${getColor()})`,
          }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <motion.span
          className="text-4xl font-black text-[var(--text-primary)]"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3 }}
        >
          {score !== null ? `${score}%` : '-'}
        </motion.span>
        <span className="text-sm text-[var(--text-tertiary)]">Readiness</span>
      </div>
    </div>
  );
}

interface StatCardProps {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  color?: 'blue' | 'emerald' | 'amber' | 'purple' | 'red';
  subtitle?: string;
}

/**
 * StatCard - Individual stat display
 */
function StatCard({ label, value, icon, color = 'blue', subtitle }: StatCardProps) {
  const colorClasses: Record<string, string> = {
    blue: 'bg-blue-500/20 text-blue-400',
    emerald: 'bg-emerald-500/20 text-emerald-400',
    amber: 'bg-amber-500/20 text-amber-400',
    purple: 'bg-purple-500/20 text-purple-400',
    red: 'bg-red-500/20 text-red-400',
  };

  return (
    <div className="p-4 rounded-xl bg-[var(--glass-white-5)] text-center">
      <div
        className={clsx(
          'w-10 h-10 mx-auto mb-2 rounded-xl flex items-center justify-center',
          colorClasses[color]
        )}
      >
        {icon}
      </div>
      <div className="text-xl font-bold text-[var(--text-primary)]">{value}</div>
      <div className="text-xs text-[var(--text-tertiary)]">{label}</div>
      {subtitle && (
        <div className="text-xs text-amber-400 mt-1">{subtitle}</div>
      )}
    </div>
  );
}

// Icon components
function TargetIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
    </svg>
  );
}

function RefreshIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
    </svg>
  );
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
  );
}

function CalendarIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  );
}

function ClipboardIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
    </svg>
  );
}

function PlusIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
    </svg>
  );
}

function DumbbellIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 7h16M4 17h16M6 12h12M7 7v10m10-10v10" />
    </svg>
  );
}

function AlertIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
    </svg>
  );
}

function ChevronRightIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
    </svg>
  );
}
