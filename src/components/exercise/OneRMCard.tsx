/**
 * 1RM Card Component
 *
 * Displays estimated and tested 1RM for an exercise with:
 * - Current estimated 1RM
 * - Tested 1RM (if available)
 * - Progress chart over time
 * - Percentage calculator
 */

import React, { useState, useMemo } from 'react';
import { useQuery } from '@apollo/client/react';
import { SafeMotion, SafeAnimatePresence } from '@/utils/safeMotion';
import {
  TrendingUp,
  Target,
  Award,
  ChevronDown,
  Calculator,
} from 'lucide-react';
import { gql } from '@apollo/client/core';

// 1RM Calculation Formulas
export function calculateEpley(weight: number, reps: number): number {
  if (reps === 1) return weight;
  return Math.round(weight * (1 + reps / 30));
}

export function calculateBrzycki(weight: number, reps: number): number {
  if (reps === 1) return weight;
  return Math.round(weight * (36 / (37 - reps)));
}

export function calculateEstimated1RM(weight: number, reps: number): number {
  if (reps > 15) return 0; // Too many reps for accurate estimation
  return Math.round((calculateEpley(weight, reps) + calculateBrzycki(weight, reps)) / 2);
}

// Common percentages
const COMMON_PERCENTAGES = [
  { percent: 100, label: '1RM', description: 'Max single' },
  { percent: 95, label: '95%', description: '~2 reps' },
  { percent: 90, label: '90%', description: '~3-4 reps' },
  { percent: 85, label: '85%', description: '~5-6 reps' },
  { percent: 80, label: '80%', description: '~7-8 reps' },
  { percent: 75, label: '75%', description: '~10 reps' },
  { percent: 70, label: '70%', description: '~12 reps' },
  { percent: 65, label: '65%', description: '~15+ reps' },
];

const EXERCISE_HISTORY_QUERY = gql`
  query ExerciseHistory($exerciseIds: [ID!]!) {
    exerciseHistory(exerciseIds: $exerciseIds) {
      exerciseId
      exerciseName
      bestWeight
      best1RM
      bestVolume
      lastPerformedAt
      totalSessions
    }
  }
`;

interface OneRMCardProps {
  exerciseId: string;
  exerciseName: string;
  currentWeight?: number;
  currentReps?: number;
  compact?: boolean;
  showCalculator?: boolean;
}

export function OneRMCard({
  exerciseId,
  exerciseName,
  currentWeight,
  currentReps,
  compact = false,
  showCalculator: initialShowCalc = false,
}: OneRMCardProps) {
  const [showPercentages, setShowPercentages] = useState(initialShowCalc);
  const [customPercent, setCustomPercent] = useState(80);

  const { data, loading } = useQuery(EXERCISE_HISTORY_QUERY, {
    variables: { exerciseIds: [exerciseId] },
    skip: !exerciseId,
  });

  const history = data?.exerciseHistory?.[0];
  const best1RM = history?.best1RM || 0;
  const bestWeight = history?.bestWeight || 0;

  // Calculate current estimated 1RM
  const currentEstimate = useMemo(() => {
    if (currentWeight && currentReps && currentReps > 0 && currentReps <= 15) {
      return calculateEstimated1RM(currentWeight, currentReps);
    }
    return null;
  }, [currentWeight, currentReps]);

  // Check if current estimate would be a PR
  const wouldBePR = currentEstimate && currentEstimate > best1RM;

  // Calculate weight for percentage
  const getWeightForPercent = (percent: number) => {
    const oneRM = currentEstimate || best1RM;
    if (!oneRM) return 0;
    return Math.round(oneRM * (percent / 100));
  };

  if (loading && !data) {
    return (
      <div className={`bg-gray-800/50 rounded-xl border border-gray-700 ${compact ? 'p-4' : 'p-6'}`}>
        <div className="animate-pulse space-y-3">
          <div className="h-4 bg-gray-700 rounded w-20" />
          <div className="h-8 bg-gray-700 rounded w-24" />
        </div>
      </div>
    );
  }

  if (compact) {
    return (
      <div className="bg-gray-800/50 rounded-xl border border-gray-700 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-purple-500/10">
              <Award className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Est. 1RM</p>
              <p className="text-xl font-bold text-purple-400">
                {currentEstimate || best1RM || '-'} lbs
              </p>
            </div>
          </div>
          {wouldBePR && (
            <span className="px-2 py-1 bg-yellow-500/20 text-yellow-400 text-xs font-medium rounded">
              PR!
            </span>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-800/50 rounded-xl border border-gray-700 overflow-hidden">
      {/* Header */}
      <div className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Target className="w-5 h-5 text-purple-400" />
            <h3 className="font-semibold">1RM Tracking</h3>
          </div>
          <p className="text-sm text-gray-500 truncate max-w-32">{exerciseName}</p>
        </div>

        {/* Main 1RM Display */}
        <div className="flex items-center gap-6 mb-4">
          <div className={`p-4 rounded-xl ${wouldBePR ? 'bg-yellow-500/10' : 'bg-purple-500/10'}`}>
            <Award className={`w-8 h-8 ${wouldBePR ? 'text-yellow-400' : 'text-purple-400'}`} />
          </div>
          <div className="flex-1">
            <p className="text-sm text-gray-400 mb-1">
              {currentEstimate ? 'Current Estimated 1RM' : 'Best Estimated 1RM'}
            </p>
            <div className="flex items-baseline gap-2">
              <span className={`text-3xl font-bold ${wouldBePR ? 'text-yellow-400' : 'text-purple-400'}`}>
                {currentEstimate || best1RM || 'N/A'}
              </span>
              <span className="text-gray-500">lbs</span>
              {wouldBePR && (
                <span className="px-2 py-0.5 bg-yellow-500/20 text-yellow-400 text-xs font-medium rounded ml-2">
                  NEW PR!
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-3 gap-3">
          <div className="text-center p-3 bg-gray-800/50 rounded-lg">
            <p className="text-lg font-bold text-white">{bestWeight || '-'}</p>
            <p className="text-xs text-gray-500">Best Weight</p>
          </div>
          <div className="text-center p-3 bg-gray-800/50 rounded-lg">
            <p className="text-lg font-bold text-white">{best1RM || '-'}</p>
            <p className="text-xs text-gray-500">Best 1RM</p>
          </div>
          <div className="text-center p-3 bg-gray-800/50 rounded-lg">
            <p className="text-lg font-bold text-white">{history?.totalSessions || 0}</p>
            <p className="text-xs text-gray-500">Sessions</p>
          </div>
        </div>
      </div>

      {/* Percentage Calculator Toggle */}
      <button
        onClick={() => setShowPercentages(!showPercentages)}
        className="w-full px-6 py-3 border-t border-gray-700 flex items-center justify-between text-sm text-gray-400 hover:bg-gray-700/30 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Calculator className="w-4 h-4" />
          <span>Percentage Calculator</span>
        </div>
        <ChevronDown className={`w-4 h-4 transition-transform ${showPercentages ? 'rotate-180' : ''}`} />
      </button>

      {/* Percentage Calculator */}
      <SafeAnimatePresence>
        {showPercentages && (
          <SafeMotion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden border-t border-gray-700"
          >
            <div className="p-6 space-y-4">
              {/* Custom Percentage Slider */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm text-gray-400">Custom Percentage</label>
                  <span className="text-sm font-medium">{customPercent}%</span>
                </div>
                <input
                  type="range"
                  min="50"
                  max="100"
                  step="5"
                  value={customPercent}
                  onChange={(e) => setCustomPercent(parseInt(e.target.value))}
                  className="w-full accent-purple-500"
                />
                <div className="flex items-center justify-between text-lg">
                  <span className="text-gray-500">{customPercent}% of {currentEstimate || best1RM || 0}</span>
                  <span className="font-bold text-purple-400">{getWeightForPercent(customPercent)} lbs</span>
                </div>
              </div>

              {/* Common Percentages Grid */}
              <div className="space-y-2">
                <p className="text-sm text-gray-400">Quick Reference</p>
                <div className="grid grid-cols-4 gap-2">
                  {COMMON_PERCENTAGES.map((item) => (
                    <button
                      key={item.percent}
                      onClick={() => setCustomPercent(item.percent)}
                      className={`p-2 rounded-lg border text-center transition-all ${
                        customPercent === item.percent
                          ? 'bg-purple-500/20 border-purple-500/50 text-purple-400'
                          : 'bg-gray-800/50 border-gray-700 text-gray-400 hover:border-gray-600'
                      }`}
                    >
                      <p className="font-bold text-sm">{item.label}</p>
                      <p className="text-xs">{getWeightForPercent(item.percent)}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Training Zone Recommendations */}
              <div className="p-4 bg-gray-800/30 rounded-lg">
                <p className="text-sm font-medium mb-2">Training Zone Guide</p>
                <div className="space-y-1 text-xs text-gray-500">
                  <p><span className="text-red-400">90-100%</span> - Strength/Power (1-3 reps)</p>
                  <p><span className="text-orange-400">80-90%</span> - Strength (3-6 reps)</p>
                  <p><span className="text-yellow-400">70-80%</span> - Hypertrophy (8-12 reps)</p>
                  <p><span className="text-green-400">60-70%</span> - Endurance (15+ reps)</p>
                </div>
              </div>
            </div>
          </SafeMotion.div>
        )}
      </SafeAnimatePresence>
    </div>
  );
}

/**
 * Inline 1RM Calculator (for use during sets)
 */
export function OneRMCalculator({ weight, reps }: { weight: number; reps: number }) {
  const estimated = calculateEstimated1RM(weight, reps);

  if (!estimated) return null;

  return (
    <div className="flex items-center gap-2 text-sm">
      <TrendingUp className="w-4 h-4 text-purple-400" />
      <span className="text-gray-400">Est. 1RM:</span>
      <span className="font-medium text-purple-400">{estimated} lbs</span>
    </div>
  );
}

/**
 * Percentage Calculator (standalone)
 */
export function PercentageCalculator({ oneRM }: { oneRM: number }) {
  const [percent, setPercent] = useState(80);
  const weight = Math.round(oneRM * (percent / 100));

  return (
    <div className="space-y-4 p-4 bg-gray-800/50 rounded-xl border border-gray-700">
      <div className="flex items-center gap-2">
        <Calculator className="w-5 h-5 text-purple-400" />
        <h4 className="font-medium">% Calculator</h4>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-400">{percent}%</span>
          <span className="text-xl font-bold text-purple-400">{weight} lbs</span>
        </div>
        <input
          type="range"
          min="50"
          max="100"
          step="5"
          value={percent}
          onChange={(e) => setPercent(parseInt(e.target.value))}
          className="w-full accent-purple-500"
        />
      </div>

      <div className="flex gap-2 flex-wrap">
        {[60, 70, 80, 90, 95].map((p) => (
          <button
            key={p}
            onClick={() => setPercent(p)}
            className={`px-3 py-1.5 rounded text-sm transition-all ${
              percent === p
                ? 'bg-purple-500/20 text-purple-400'
                : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
            }`}
          >
            {p}%
          </button>
        ))}
      </div>
    </div>
  );
}

export default OneRMCard;
