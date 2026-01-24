/**
 * Recovery Score Card Component
 *
 * Displays the user's current recovery score with:
 * - Circular progress indicator (0-100)
 * - Color coding (Red <50, Yellow 50-75, Green >75)
 * - Trend arrow
 * - Breakdown on tap
 */

import React, { useState } from 'react';
import { useQuery } from '@apollo/client/react';
import { SafeMotion, SafeAnimatePresence } from '@/utils/safeMotion';
import {
  Activity,
  Moon,
  TrendingUp,
  TrendingDown,
  Minus,
  ChevronDown,
  Dumbbell,
  Heart,
  Zap,
  RefreshCw,
} from 'lucide-react';
import { RECOVERY_SCORE_QUERY } from '@/graphql/queries';

// Get color based on score
function getScoreColor(score: number): string {
  if (score >= 75) return '#4ADE80'; // Green
  if (score >= 50) return '#FACC15'; // Yellow
  return '#EF4444'; // Red
}

// Get classification label
function getClassificationLabel(classification: string): string {
  switch (classification) {
    case 'excellent': return 'Excellent';
    case 'good': return 'Good';
    case 'moderate': return 'Moderate';
    case 'fair': return 'Fair';
    case 'poor': return 'Poor';
    default: return classification;
  }
}

// Trend icon component
function TrendIcon({ trend }: { trend: string | null | undefined }) {
  if (trend === 'improving') {
    return <TrendingUp className="w-4 h-4 text-green-400" />;
  }
  if (trend === 'declining') {
    return <TrendingDown className="w-4 h-4 text-red-400" />;
  }
  return <Minus className="w-4 h-4 text-gray-400" />;
}

// Circular progress component
function CircularProgress({ score, size = 100, strokeWidth = 8 }: { score: number; size?: number; strokeWidth?: number }) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (score / 100) * circumference;
  const color = getScoreColor(score);

  return (
    <div className="relative" style={{ width: size, height: size }}>
      {/* Background circle */}
      <svg className="transform -rotate-90" width={size} height={size}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-gray-700"
        />
        {/* Progress circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-all duration-500"
        />
      </svg>
      {/* Score text */}
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-2xl font-bold" style={{ color }}>{score}</span>
      </div>
    </div>
  );
}

interface RecoveryScoreCardProps {
  compact?: boolean;
  onViewDetails?: () => void;
}

export function RecoveryScoreCard({ compact = false, onViewDetails }: RecoveryScoreCardProps) {
  const [showBreakdown, setShowBreakdown] = useState(false);

  const { data, loading, error, refetch } = useQuery(RECOVERY_SCORE_QUERY, {
    fetchPolicy: 'cache-and-network',
  });

  if (loading && !data) {
    return (
      <div className={`bg-gray-800/50 rounded-xl border border-gray-700 ${compact ? 'p-4' : 'p-6'}`}>
        <div className="animate-pulse flex items-center gap-4">
          <div className="w-20 h-20 bg-gray-700 rounded-full" />
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-gray-700 rounded w-24" />
            <div className="h-3 bg-gray-700 rounded w-32" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !data?.recoveryScore) {
    return (
      <div className={`bg-gray-800/50 rounded-xl border border-gray-700 ${compact ? 'p-4' : 'p-6'}`}>
        <div className="flex items-center gap-3 text-gray-400">
          <Activity className="w-5 h-5" />
          <div>
            <p className="font-medium">Recovery Score</p>
            <p className="text-sm text-gray-500">Log sleep to see your recovery</p>
          </div>
        </div>
      </div>
    );
  }

  const { recoveryScore } = data;
  const score = recoveryScore.score;
  const classification = recoveryScore.classification;
  const factors = recoveryScore.factors;
  const trend = recoveryScore.trend;

  if (compact) {
    return (
      <button
        onClick={onViewDetails}
        className="w-full bg-gray-800/50 rounded-xl border border-gray-700 p-4 hover:border-gray-600 transition-colors text-left"
      >
        <div className="flex items-center gap-4">
          <CircularProgress score={score} size={60} strokeWidth={6} />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-400">Recovery</span>
              <TrendIcon trend={trend} />
            </div>
            <p className="font-medium" style={{ color: getScoreColor(score) }}>
              {getClassificationLabel(classification)}
            </p>
          </div>
        </div>
      </button>
    );
  }

  return (
    <div className="bg-gray-800/50 rounded-xl border border-gray-700 overflow-hidden">
      {/* Header */}
      <div className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-blue-400" />
            <h3 className="font-semibold">Recovery Score</h3>
          </div>
          <button
            onClick={() => refetch({ forceRecalculate: true })}
            className="p-1.5 text-gray-400 hover:text-gray-300 hover:bg-gray-700/50 rounded-lg transition-colors"
            title="Refresh score"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        {/* Main Score Display */}
        <div className="flex items-center gap-6">
          <CircularProgress score={score} size={100} />
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span
                className="text-xl font-bold"
                style={{ color: getScoreColor(score) }}
              >
                {getClassificationLabel(classification)}
              </span>
              <TrendIcon trend={trend} />
            </div>
            <p className="text-sm text-gray-400 mb-3">
              {recoveryScore.recommendedIntensity === 'high' && 'Great day for a hard workout!'}
              {recoveryScore.recommendedIntensity === 'normal' && 'Normal training intensity recommended'}
              {recoveryScore.recommendedIntensity === 'moderate' && 'Consider a lighter workout'}
              {recoveryScore.recommendedIntensity === 'light' && 'Easy day recommended'}
              {recoveryScore.recommendedIntensity === 'rest' && 'Rest day recommended'}
            </p>

            {/* Quick Stats */}
            <div className="flex gap-4 text-xs">
              {factors.sleepDetails && (
                <div className="flex items-center gap-1.5 text-gray-400">
                  <Moon className="w-3.5 h-3.5" />
                  <span>{factors.sleepDetails.hoursSlept?.toFixed(1)}h sleep</span>
                </div>
              )}
              {factors.restDetails && (
                <div className="flex items-center gap-1.5 text-gray-400">
                  <Dumbbell className="w-3.5 h-3.5" />
                  <span>{factors.restDetails.daysSinceLastWorkout}d rest</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Breakdown Toggle */}
      <button
        onClick={() => setShowBreakdown(!showBreakdown)}
        className="w-full px-6 py-3 border-t border-gray-700 flex items-center justify-between text-sm text-gray-400 hover:bg-gray-700/30 transition-colors"
      >
        <span>Score Breakdown</span>
        <ChevronDown className={`w-4 h-4 transition-transform ${showBreakdown ? 'rotate-180' : ''}`} />
      </button>

      {/* Breakdown Details */}
      <SafeAnimatePresence>
        {showBreakdown && (
          <SafeMotion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden border-t border-gray-700"
          >
            <div className="p-6 space-y-4">
              {/* Sleep Duration */}
              <ScoreBreakdownItem
                icon={Moon}
                label="Sleep Duration"
                score={factors.sleepDurationScore}
                maxScore={40}
                detail={factors.sleepDetails ? `${factors.sleepDetails.hoursSlept?.toFixed(1)}h of ${factors.sleepDetails.targetHours}h target` : undefined}
              />

              {/* Sleep Quality */}
              <ScoreBreakdownItem
                icon={Zap}
                label="Sleep Quality"
                score={factors.sleepQualityScore}
                maxScore={30}
                detail={factors.sleepDetails ? `Rating: ${factors.sleepDetails.qualityRating}/5` : undefined}
              />

              {/* Rest Days */}
              <ScoreBreakdownItem
                icon={Dumbbell}
                label="Rest & Recovery"
                score={factors.restDaysScore}
                maxScore={20}
                detail={factors.restDetails ? `${factors.restDetails.workoutsThisWeek} workouts this week` : undefined}
              />

              {/* HRV Bonus */}
              {factors.hrvBonus !== undefined && factors.hrvBonus !== 0 && (
                <ScoreBreakdownItem
                  icon={Heart}
                  label="HRV Bonus"
                  score={factors.hrvBonus}
                  maxScore={10}
                  isBonus
                  detail={factors.hrvDetails ? `${factors.hrvDetails.percentOfBaseline}% of baseline` : undefined}
                />
              )}

              {/* Strain Penalty */}
              {factors.strainPenalty !== undefined && factors.strainPenalty < 0 && (
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-red-500/10">
                    <TrendingDown className="w-4 h-4 text-red-400" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Overtraining Penalty</span>
                      <span className="text-sm text-red-400">{factors.strainPenalty}</span>
                    </div>
                    <p className="text-xs text-gray-500">Consider adding rest days</p>
                  </div>
                </div>
              )}
            </div>
          </SafeMotion.div>
        )}
      </SafeAnimatePresence>
    </div>
  );
}

// Score breakdown item component
function ScoreBreakdownItem({
  icon: Icon,
  label,
  score,
  maxScore,
  detail,
  isBonus = false,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  score: number;
  maxScore: number;
  detail?: string;
  isBonus?: boolean;
}) {
  const percentage = Math.min(100, (score / maxScore) * 100);
  const color = percentage >= 75 ? '#4ADE80' : percentage >= 50 ? '#FACC15' : '#EF4444';

  return (
    <div className="flex items-center gap-3">
      <div className="p-2 rounded-lg bg-gray-700/50">
        <Icon className="w-4 h-4 text-gray-400" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
          <span className="text-sm">{label}</span>
          <span className="text-sm font-medium" style={{ color: isBonus ? '#4ADE80' : color }}>
            {isBonus && score > 0 && '+'}
            {score}/{maxScore}
          </span>
        </div>
        <div className="h-1.5 bg-gray-700 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${percentage}%`,
              backgroundColor: isBonus ? '#4ADE80' : color,
            }}
          />
        </div>
        {detail && (
          <p className="text-xs text-gray-500 mt-1">{detail}</p>
        )}
      </div>
    </div>
  );
}

export default RecoveryScoreCard;
