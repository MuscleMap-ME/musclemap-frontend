/**
 * Recovery Page
 *
 * Sleep tracking and recovery scoring system.
 * Displays current recovery score, sleep history, and recommendations.
 */

import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useQuery, useMutation } from '@apollo/client/react';
import { useAuth } from '../store';
import {
  RECOVERY_STATUS_QUERY,
  SLEEP_HISTORY_QUERY,
  RECOVERY_SCORE_QUERY,
} from '../graphql/queries';
import {
  LOG_SLEEP_MUTATION,
  ACKNOWLEDGE_RECOVERY_RECOMMENDATION_MUTATION,
} from '../graphql/mutations';
import {
  GlassSurface,
  GlassCard,
  GlassButton,
} from '../components/glass';
import { InsightCard } from '../components/analytics';
import { NearbyVenuesWidget } from '../components/dashboard';

// ============================================
// ICONS
// ============================================
const Icons = {
  Moon: ({ className = 'w-5 h-5' }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
    </svg>
  ),
  Bed: ({ className = 'w-5 h-5' }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
    </svg>
  ),
  Sun: ({ className = 'w-5 h-5' }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
    </svg>
  ),
  Star: ({ className = 'w-5 h-5' }) => (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
    </svg>
  ),
  Activity: ({ className = 'w-5 h-5' }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4.5 12h4l1.5-6 3 12 1.5-6h4.5" />
    </svg>
  ),
  Battery: ({ className = 'w-5 h-5' }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 12h2m14 0h2M5 8h14a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1V9a1 1 0 011-1z" />
    </svg>
  ),
  Plus: ({ className = 'w-5 h-5' }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4" />
    </svg>
  ),
  TrendUp: ({ className = 'w-5 h-5' }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
    </svg>
  ),
  TrendDown: ({ className = 'w-5 h-5' }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
    </svg>
  ),
  Check: ({ className = 'w-5 h-5' }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
  ),
  X: ({ className = 'w-5 h-5' }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  ),
  Refresh: ({ className = 'w-5 h-5' }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
    </svg>
  ),
  Lightning: ({ className = 'w-5 h-5' }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
    </svg>
  ),
};

// ============================================
// SCORE GAUGE COMPONENT
// ============================================
function RecoveryGauge({ score, classification }) {
  const getColor = () => {
    if (score >= 85) return { bg: 'bg-green-500', text: 'text-green-400', stroke: '#22c55e' };
    if (score >= 70) return { bg: 'bg-emerald-500', text: 'text-emerald-400', stroke: '#10b981' };
    if (score >= 50) return { bg: 'bg-yellow-500', text: 'text-yellow-400', stroke: '#eab308' };
    if (score >= 30) return { bg: 'bg-orange-500', text: 'text-orange-400', stroke: '#f97316' };
    return { bg: 'bg-red-500', text: 'text-red-400', stroke: '#ef4444' };
  };

  const color = getColor();
  const circumference = 2 * Math.PI * 45;
  const offset = circumference - (score / 100) * circumference;

  return (
    <div className="relative w-40 h-40 mx-auto">
      <svg className="w-40 h-40 transform -rotate-90" viewBox="0 0 100 100">
        <circle
          cx="50"
          cy="50"
          r="45"
          fill="none"
          stroke="rgba(255,255,255,0.1)"
          strokeWidth="8"
        />
        <circle
          cx="50"
          cy="50"
          r="45"
          fill="none"
          stroke={color.stroke}
          strokeWidth="8"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-1000 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <div className={`text-4xl font-bold ${color.text}`}>{score}</div>
        <div className="text-white/50 text-sm capitalize">{classification}</div>
      </div>
    </div>
  );
}

// ============================================
// QUALITY STARS COMPONENT
// ============================================
function QualityStars({ quality, editable, onChange }) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          onClick={() => editable && onChange?.(star)}
          disabled={!editable}
          className={`${editable ? 'cursor-pointer hover:scale-110' : 'cursor-default'} transition-transform`}
        >
          <Icons.Star
            className={`w-5 h-5 ${star <= quality ? 'text-yellow-400' : 'text-white/20'}`}
          />
        </button>
      ))}
    </div>
  );
}

// ============================================
// LOG SLEEP MODAL
// ============================================
function LogSleepModal({ isOpen, onClose, onSubmit }) {
  const [bedTime, setBedTime] = useState('');
  const [wakeTime, setWakeTime] = useState('');
  const [quality, setQuality] = useState(3);
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    // Default to last night
    const now = new Date();
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(22, 0, 0, 0);
    now.setHours(6, 0, 0, 0);

    setBedTime(formatDateTimeLocal(yesterday));
    setWakeTime(formatDateTimeLocal(now));
  }, [isOpen]);

  const formatDateTimeLocal = (date) => {
    const pad = (n) => n.toString().padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await onSubmit({
        bedTime: new Date(bedTime).toISOString(),
        wakeTime: new Date(wakeTime).toISOString(),
        quality,
        notes: notes || undefined,
      });
      onClose();
    } catch {
      // Failed to log sleep
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="w-full max-w-md mx-4"
      >
        <GlassCard className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold text-white">Log Sleep</h3>
            <button onClick={onClose} className="text-white/50 hover:text-white">
              <Icons.X className="w-6 h-6" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-white/70 text-sm mb-1">Bed Time</label>
              <input
                type="datetime-local"
                value={bedTime}
                onChange={(e) => setBedTime(e.target.value)}
                className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-violet-500"
                required
              />
            </div>

            <div>
              <label className="block text-white/70 text-sm mb-1">Wake Time</label>
              <input
                type="datetime-local"
                value={wakeTime}
                onChange={(e) => setWakeTime(e.target.value)}
                className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-violet-500"
                required
              />
            </div>

            <div>
              <label className="block text-white/70 text-sm mb-1">Sleep Quality</label>
              <div className="flex items-center gap-4">
                <QualityStars quality={quality} editable onChange={setQuality} />
                <span className="text-white/50 text-sm">
                  {quality === 1 ? 'Terrible' :
                   quality === 2 ? 'Poor' :
                   quality === 3 ? 'Fair' :
                   quality === 4 ? 'Good' : 'Excellent'}
                </span>
              </div>
            </div>

            <div>
              <label className="block text-white/70 text-sm mb-1">Notes (optional)</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="How did you feel? Any factors that affected your sleep?"
                className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-violet-500 resize-none h-24"
              />
            </div>

            <div className="flex gap-3">
              <GlassButton
                type="button"
                onClick={onClose}
                className="flex-1"
                variant="secondary"
              >
                Cancel
              </GlassButton>
              <GlassButton
                type="submit"
                disabled={submitting}
                className="flex-1 bg-violet-600 hover:bg-violet-500"
              >
                {submitting ? 'Saving...' : 'Save Sleep'}
              </GlassButton>
            </div>
          </form>
        </GlassCard>
      </motion.div>
    </div>
  );
}

// ============================================
// RECOMMENDATION CARD
// ============================================
function RecommendationCard({ recommendation, onAcknowledge }) {
  const typeColors = {
    sleep: 'bg-purple-500/20 text-purple-400',
    rest: 'bg-blue-500/20 text-blue-400',
    workout: 'bg-green-500/20 text-green-400',
    nutrition: 'bg-orange-500/20 text-orange-400',
    lifestyle: 'bg-pink-500/20 text-pink-400',
  };

  return (
    <GlassCard className="p-4">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <span className={`text-xs px-2 py-1 rounded-full ${typeColors[recommendation.type] || 'bg-white/10 text-white/70'}`}>
              {recommendation.type}
            </span>
            {recommendation.priority === 1 && (
              <span className="text-xs px-2 py-1 rounded-full bg-red-500/20 text-red-400">
                High Priority
              </span>
            )}
          </div>
          <h4 className="text-white font-semibold mb-1">{recommendation.title}</h4>
          <p className="text-white/60 text-sm">{recommendation.description}</p>
          {recommendation.actionItems && recommendation.actionItems.length > 0 && (
            <ul className="mt-3 space-y-1">
              {recommendation.actionItems.map((item, idx) => (
                <li key={idx} className="flex items-center gap-2 text-white/50 text-sm">
                  <Icons.Check className="w-4 h-4 text-green-400 flex-shrink-0" />
                  {item.action}
                </li>
              ))}
            </ul>
          )}
        </div>
        <button
          onClick={() => onAcknowledge(recommendation.id)}
          className="text-white/30 hover:text-white/70 transition-colors"
          title="Dismiss"
        >
          <Icons.X className="w-5 h-5" />
        </button>
      </div>
    </GlassCard>
  );
}

// ============================================
// TYPES
// ============================================
interface SleepLog {
  id: string;
  bedTime: string;
  wakeTime: string;
  sleepDurationMinutes: number;
  quality: number;
  notes?: string;
  createdAt: string;
}

interface RecoveryScore {
  id: string;
  score: number;
  classification: string;
  recommendedIntensity: string;
  trend: string;
  factors?: {
    sleepDurationScore: number;
    sleepQualityScore: number;
    restDaysScore: number;
    hrvBonus?: number;
    consistencyBonus?: number;
  };
}

interface Recommendation {
  id: string;
  type: string;
  priority: number;
  title: string;
  description: string;
  actionItems?: { action: string; completed: boolean }[];
}

interface SleepStats {
  avgDuration: number;
  avgQuality: number;
  totalNights: number;
  sleepDebt: number;
  consistency: number;
  nightsLogged?: number;
  avgDurationHours?: number;
  targetMet?: number;
}

interface SleepGoal {
  id: string;
  targetHours: number;
  targetBedTime?: string;
  targetWakeTime?: string;
  consistencyTarget?: number;
}

interface NextWorkoutSuggestion {
  intensity: string;
  types: string[];
  reason: string;
}

interface RecoveryStatusData {
  recoveryStatus: {
    currentScore: RecoveryScore;
    lastSleep: SleepLog;
    sleepStats: SleepStats;
    recommendations: Recommendation[];
    sleepGoal: SleepGoal;
    nextWorkoutSuggestion: NextWorkoutSuggestion;
  };
}

interface SleepHistoryData {
  sleepHistory: {
    logs: SleepLog[];
    nextCursor: string | null;
    hasMore: boolean;
  };
}

// ============================================
// MAIN RECOVERY PAGE
// ============================================
export default function Recovery() {
  const { isAuthenticated } = useAuth();
  const [showLogModal, setShowLogModal] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  // GraphQL queries
  const {
    data: statusData,
    loading: statusLoading,
    error: statusError,
    refetch: refetchStatus,
  } = useQuery<RecoveryStatusData>(RECOVERY_STATUS_QUERY, {
    skip: !isAuthenticated,
    fetchPolicy: 'cache-and-network',
  });

  const {
    data: historyData,
    loading: historyLoading,
    refetch: refetchHistory,
  } = useQuery<SleepHistoryData>(SLEEP_HISTORY_QUERY, {
    variables: { limit: 7 },
    skip: !isAuthenticated,
    fetchPolicy: 'cache-and-network',
  });

  const { refetch: recalculateScore } = useQuery(RECOVERY_SCORE_QUERY, {
    variables: { forceRecalculate: true },
    skip: true, // Only run on demand
    fetchPolicy: 'network-only',
  });

  // GraphQL mutations
  const [logSleep] = useMutation(LOG_SLEEP_MUTATION, {
    onCompleted: () => {
      refetchStatus();
      refetchHistory();
    },
    onError: (err) => {
      setLocalError(err.message || 'Failed to log sleep');
    },
  });

  const [acknowledgeRecommendation] = useMutation(ACKNOWLEDGE_RECOVERY_RECOMMENDATION_MUTATION, {
    onCompleted: () => {
      refetchStatus();
    },
    onError: (err) => {
      console.error('Failed to acknowledge recommendation:', err);
    },
  });

  // Extract data with memoization
  const recoveryStatus = useMemo(
    () => statusData?.recoveryStatus || null,
    [statusData?.recoveryStatus]
  );

  const sleepHistory = useMemo<SleepLog[]>(
    () => historyData?.sleepHistory?.logs || [],
    [historyData?.sleepHistory?.logs]
  );

  // Compute derived sleepStats with expected properties
  const computedSleepStats = useMemo(() => {
    const stats = statusData?.recoveryStatus?.sleepStats;
    if (!stats) return null;
    return {
      ...stats,
      // Convert avgDuration (minutes) to hours
      avgDurationHours: Math.round((stats.avgDuration / 60) * 10) / 10,
      // Use totalNights as nightsLogged
      nightsLogged: stats.totalNights,
      // targetMet is not in the GraphQL response, calculate or default
      targetMet: stats.totalNights, // Assume all logged nights for now
    };
  }, [statusData?.recoveryStatus?.sleepStats]);

  const loading = statusLoading || historyLoading;
  const error = localError || statusError?.message || null;

  const [recalculating, setRecalculating] = useState(false);

  const handleLogSleep = async (sleepData: { bedTime: string; wakeTime: string; quality: number; notes?: string }) => {
    await logSleep({
      variables: {
        input: {
          bedTime: sleepData.bedTime,
          wakeTime: sleepData.wakeTime,
          quality: sleepData.quality,
          notes: sleepData.notes,
        },
      },
    });
  };

  const handleRecalculate = async () => {
    setRecalculating(true);
    setLocalError(null);
    try {
      await recalculateScore();
      await refetchStatus();
    } catch (err: unknown) {
      setLocalError(err instanceof Error ? err.message : 'Failed to recalculate');
    } finally {
      setRecalculating(false);
    }
  };

  const handleAcknowledge = async (recommendationId: string) => {
    await acknowledgeRecommendation({
      variables: { recommendationId },
      optimisticResponse: {
        acknowledgeRecoveryRecommendation: true,
      },
    });
  };

  const formatDuration = (minutes: number): string => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  const formatDate = (dateStr: string): string => {
    const date = new Date(dateStr);
    return date.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
  };

  const formatTime = (dateStr: string): string => {
    const date = new Date(dateStr);
    return date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  };

  if (loading) {
    return (
      <GlassSurface className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-2 border-violet-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-white/60">Loading recovery data...</p>
        </div>
      </GlassSurface>
    );
  }

  const { currentScore, recommendations, sleepGoal, nextWorkoutSuggestion } = recoveryStatus || {};
  const sleepStats = computedSleepStats;

  return (
    <GlassSurface className="min-h-screen p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-white">Recovery</h1>
            <p className="text-white/60">Sleep tracking and recovery scoring</p>
          </div>
          <div className="flex gap-3">
            <GlassButton
              onClick={handleRecalculate}
              disabled={recalculating}
              className="flex items-center gap-2"
            >
              <Icons.Refresh className={`w-4 h-4 ${recalculating ? 'animate-spin' : ''}`} />
              Recalculate
            </GlassButton>
            <GlassButton
              onClick={() => setShowLogModal(true)}
              className="flex items-center gap-2 bg-violet-600 hover:bg-violet-500"
            >
              <Icons.Plus className="w-4 h-4" />
              Log Sleep
            </GlassButton>
          </div>
        </div>

        {error && (
          <div className="bg-red-500/20 border border-red-500/50 rounded-xl p-4 text-red-400">
            {error}
          </div>
        )}

        {/* Recovery Score */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="lg:col-span-1"
          >
            <GlassCard className="p-6 text-center">
              <h3 className="text-lg font-semibold text-white/70 mb-4">Recovery Score</h3>
              {currentScore ? (
                <>
                  <RecoveryGauge
                    score={currentScore.score}
                    classification={currentScore.classification}
                  />
                  <div className="mt-4 flex items-center justify-center gap-2">
                    {currentScore.trend === 'improving' && (
                      <>
                        <Icons.TrendUp className="w-5 h-5 text-green-400" />
                        <span className="text-green-400 text-sm">Improving</span>
                      </>
                    )}
                    {currentScore.trend === 'declining' && (
                      <>
                        <Icons.TrendDown className="w-5 h-5 text-red-400" />
                        <span className="text-red-400 text-sm">Declining</span>
                      </>
                    )}
                    {currentScore.trend === 'stable' && (
                      <span className="text-white/50 text-sm">Stable</span>
                    )}
                  </div>
                </>
              ) : (
                <div className="py-8 text-white/50">
                  <Icons.Moon className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>Log your first sleep to get a recovery score</p>
                </div>
              )}
            </GlassCard>
          </motion.div>

          {/* Workout Suggestion */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="lg:col-span-2"
          >
            <GlassCard className="p-6 h-full">
              <div className="flex items-center gap-3 mb-4">
                <Icons.Lightning className="w-6 h-6 text-yellow-400" />
                <h3 className="text-lg font-semibold text-white">Today&apos;s Workout Recommendation</h3>
              </div>
              {nextWorkoutSuggestion && (
                <div className="space-y-4">
                  <div className="flex items-center gap-4">
                    <span className={`text-2xl font-bold capitalize ${
                      nextWorkoutSuggestion.intensity === 'high' ? 'text-green-400' :
                      nextWorkoutSuggestion.intensity === 'normal' ? 'text-blue-400' :
                      nextWorkoutSuggestion.intensity === 'moderate' ? 'text-yellow-400' :
                      nextWorkoutSuggestion.intensity === 'light' ? 'text-orange-400' :
                      'text-red-400'
                    }`}>
                      {nextWorkoutSuggestion.intensity} Intensity
                    </span>
                  </div>
                  <p className="text-white/60">{nextWorkoutSuggestion.reason}</p>
                  <div className="flex flex-wrap gap-2">
                    {nextWorkoutSuggestion.types.map((type, idx) => (
                      <span
                        key={idx}
                        className="text-xs px-3 py-1 rounded-full bg-white/10 text-white/70 capitalize"
                      >
                        {type.replace('_', ' ')}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </GlassCard>
          </motion.div>
        </div>

        {/* Score Breakdown */}
        {currentScore?.factors && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <GlassCard className="p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Score Breakdown</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-4 bg-white/5 rounded-lg">
                  <Icons.Moon className="w-6 h-6 mx-auto mb-2 text-purple-400" />
                  <div className="text-2xl font-bold text-white">{currentScore.factors.sleepDurationScore}</div>
                  <div className="text-white/50 text-sm">Sleep Duration</div>
                  <div className="text-white/30 text-xs mt-1">/ 40 max</div>
                </div>
                <div className="text-center p-4 bg-white/5 rounded-lg">
                  <Icons.Star className="w-6 h-6 mx-auto mb-2 text-yellow-400" />
                  <div className="text-2xl font-bold text-white">{currentScore.factors.sleepQualityScore}</div>
                  <div className="text-white/50 text-sm">Sleep Quality</div>
                  <div className="text-white/30 text-xs mt-1">/ 30 max</div>
                </div>
                <div className="text-center p-4 bg-white/5 rounded-lg">
                  <Icons.Battery className="w-6 h-6 mx-auto mb-2 text-blue-400" />
                  <div className="text-2xl font-bold text-white">{currentScore.factors.restDaysScore}</div>
                  <div className="text-white/50 text-sm">Rest Days</div>
                  <div className="text-white/30 text-xs mt-1">/ 20 max</div>
                </div>
                <div className="text-center p-4 bg-white/5 rounded-lg">
                  <Icons.Activity className="w-6 h-6 mx-auto mb-2 text-green-400" />
                  <div className="text-2xl font-bold text-white">
                    {(currentScore.factors.hrvBonus || 0) + (currentScore.factors.consistencyBonus || 0)}
                  </div>
                  <div className="text-white/50 text-sm">Bonuses</div>
                  <div className="text-white/30 text-xs mt-1">/ 15 max</div>
                </div>
              </div>
            </GlassCard>
          </motion.div>
        )}

        {/* Recovery Insights */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="grid grid-cols-1 md:grid-cols-3 gap-4"
        >
          <InsightCard
            type={currentScore?.score >= 70 ? 'positive' : currentScore?.score >= 50 ? 'info' : 'warning'}
            title={currentScore?.score >= 70 ? 'Well Rested!' : currentScore?.score >= 50 ? 'Moderate Recovery' : 'Need More Rest'}
            message={currentScore?.score >= 70
              ? 'You\'re fully recovered and ready for an intense workout'
              : currentScore?.score >= 50
                ? 'Consider a moderate workout today'
                : 'Take it easy or consider a rest day'}
            icon={currentScore?.score >= 70 ? '💪' : currentScore?.score >= 50 ? '😊' : '😴'}
          />
          <InsightCard
            type={sleepStats?.avgDurationHours >= 7 ? 'positive' : 'warning'}
            title="Sleep Duration"
            message={sleepStats?.avgDurationHours >= 7
              ? `Averaging ${sleepStats.avgDurationHours}h per night - great!`
              : `Averaging ${sleepStats?.avgDurationHours || 0}h per night - try for 7-9h`}
            icon="🌙"
          />
          <InsightCard
            type={sleepStats?.consistency >= 80 ? 'positive' : 'info'}
            title="Sleep Consistency"
            message={sleepStats?.consistency >= 80
              ? 'Excellent sleep schedule consistency!'
              : 'Try to maintain a more consistent sleep schedule'}
            icon="📊"
          />
        </motion.div>

        {/* Sleep Stats & History */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Weekly Stats */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <GlassCard className="p-6">
              <h3 className="text-lg font-semibold text-white mb-4">This Week</h3>
              {sleepStats ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between py-3 border-b border-white/10">
                    <span className="text-white/70">Nights Logged</span>
                    <span className="text-white font-semibold">{sleepStats.nightsLogged}</span>
                  </div>
                  <div className="flex items-center justify-between py-3 border-b border-white/10">
                    <span className="text-white/70">Avg Duration</span>
                    <span className="text-white font-semibold">{sleepStats.avgDurationHours}h</span>
                  </div>
                  <div className="flex items-center justify-between py-3 border-b border-white/10">
                    <span className="text-white/70">Avg Quality</span>
                    <QualityStars quality={Math.round(sleepStats.avgQuality)} />
                  </div>
                  <div className="flex items-center justify-between py-3 border-b border-white/10">
                    <span className="text-white/70">Consistency</span>
                    <span className="text-white font-semibold">{sleepStats.consistency}%</span>
                  </div>
                  <div className="flex items-center justify-between py-3">
                    <span className="text-white/70">Target Met</span>
                    <span className="text-white font-semibold">{sleepStats.targetMet} nights</span>
                  </div>
                </div>
              ) : (
                <p className="text-white/50 text-center py-8">No sleep data yet</p>
              )}
            </GlassCard>
          </motion.div>

          {/* Recent Sleep */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <GlassCard className="p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Recent Sleep</h3>
              {sleepHistory.length > 0 ? (
                <div className="space-y-3">
                  {sleepHistory.map((sleep) => (
                    <div
                      key={sleep.id}
                      className="flex items-center justify-between p-3 bg-white/5 rounded-lg"
                    >
                      <div>
                        <div className="text-white font-medium">{formatDate(sleep.bedTime)}</div>
                        <div className="text-white/50 text-sm">
                          {formatTime(sleep.bedTime)} - {formatTime(sleep.wakeTime)}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-white font-semibold">
                          {formatDuration(sleep.sleepDurationMinutes)}
                        </div>
                        <QualityStars quality={sleep.quality} />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Icons.Moon className="w-12 h-12 mx-auto mb-3 text-white/30" />
                  <p className="text-white/50">No sleep logged yet</p>
                  <GlassButton
                    onClick={() => setShowLogModal(true)}
                    className="mt-4"
                  >
                    Log Your First Night
                  </GlassButton>
                </div>
              )}
            </GlassCard>
          </motion.div>
        </div>

        {/* Recommendations */}
        {recommendations && recommendations.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
          >
            <h3 className="text-lg font-semibold text-white mb-4">Recommendations</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {recommendations.map((rec) => (
                <RecommendationCard
                  key={rec.id}
                  recommendation={rec}
                  onAcknowledge={handleAcknowledge}
                />
              ))}
            </div>
          </motion.div>
        )}

        {/* Active Recovery - Outdoor Spots */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.55 }}
        >
          <GlassCard className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                  <span>🌳</span>
                  Active Recovery Spots
                </h3>
                <p className="text-white/50 text-sm mt-1">
                  Light outdoor exercise can help speed up recovery
                </p>
              </div>
              <Link
                to="/discover"
                className="text-sm text-green-400 hover:text-green-300 transition-colors"
              >
                Explore Map →
              </Link>
            </div>
            <NearbyVenuesWidget limit={3} compact showHeader={false} />
          </GlassCard>
        </motion.div>

        {/* Sleep Goal */}
        {sleepGoal && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
          >
            <GlassCard className="p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Sleep Goal</h3>
              <div className="flex flex-wrap gap-6">
                <div>
                  <div className="text-white/50 text-sm">Target Duration</div>
                  <div className="text-white font-semibold">{sleepGoal.targetHours} hours</div>
                </div>
                {sleepGoal.targetBedTime && (
                  <div>
                    <div className="text-white/50 text-sm">Target Bed Time</div>
                    <div className="text-white font-semibold">{sleepGoal.targetBedTime}</div>
                  </div>
                )}
                {sleepGoal.targetWakeTime && (
                  <div>
                    <div className="text-white/50 text-sm">Target Wake Time</div>
                    <div className="text-white font-semibold">{sleepGoal.targetWakeTime}</div>
                  </div>
                )}
                <div>
                  <div className="text-white/50 text-sm">Consistency Target</div>
                  <div className="text-white font-semibold">{sleepGoal.consistencyTarget} nights/week</div>
                </div>
              </div>
            </GlassCard>
          </motion.div>
        )}
      </div>

      {/* Log Sleep Modal */}
      <LogSleepModal
        isOpen={showLogModal}
        onClose={() => setShowLogModal(false)}
        onSubmit={handleLogSleep}
      />
    </GlassSurface>
  );
}
