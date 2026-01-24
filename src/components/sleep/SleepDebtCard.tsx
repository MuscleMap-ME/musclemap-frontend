/**
 * Sleep Debt Card Component
 *
 * Displays sleep debt tracking with:
 * - Current sleep debt in hours
 * - Weekly target vs actual
 * - 7-day trend visualization
 * - Recommendations for paying back debt
 */

import React from 'react';
import { useQuery } from '@apollo/client/react';
import { SafeMotion } from '@/utils/safeMotion';
import {
  Moon,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Check,
  Clock,
} from 'lucide-react';
import { SLEEP_STATS_QUERY, WEEKLY_SLEEP_STATS_QUERY } from '@/graphql/queries';

interface SleepDebtCardProps {
  compact?: boolean;
  onLogSleep?: () => void;
}

export function SleepDebtCard({ compact = false, onLogSleep }: SleepDebtCardProps) {
  const { data: statsData, loading: statsLoading } = useQuery(SLEEP_STATS_QUERY, {
    variables: { period: 'week' },
  });

  const { data: weeklyData, loading: weeklyLoading } = useQuery(WEEKLY_SLEEP_STATS_QUERY, {
    variables: { weeks: 4 },
  });

  const loading = statsLoading || weeklyLoading;

  if (loading && !statsData) {
    return (
      <div className={`bg-gray-800/50 rounded-xl border border-gray-700 ${compact ? 'p-4' : 'p-6'}`}>
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-gray-700 rounded w-24" />
          <div className="h-8 bg-gray-700 rounded w-32" />
          <div className="h-2 bg-gray-700 rounded w-full" />
        </div>
      </div>
    );
  }

  const stats = statsData?.sleepStats;
  const weeklyStats = weeklyData?.weeklySleepStats || [];

  if (!stats) {
    return (
      <div className={`bg-gray-800/50 rounded-xl border border-gray-700 ${compact ? 'p-4' : 'p-6'}`}>
        <div className="text-center py-4">
          <Moon className="w-8 h-8 text-gray-600 mx-auto mb-2" />
          <p className="text-gray-400">No sleep data yet</p>
          {onLogSleep && (
            <button
              onClick={onLogSleep}
              className="mt-3 text-sm text-blue-400 hover:text-blue-300"
            >
              Log your first night
            </button>
          )}
        </div>
      </div>
    );
  }

  const sleepDebt = stats.sleepDebt || 0;
  const avgDuration = stats.avgDuration || 0;
  const targetHours = 8;
  const debtColor = sleepDebt > 5 ? '#EF4444' : sleepDebt > 2 ? '#FACC15' : '#4ADE80';
  const isInDebt = sleepDebt > 0;

  if (compact) {
    return (
      <button
        onClick={onLogSleep}
        className="w-full bg-gray-800/50 rounded-xl border border-gray-700 p-4 hover:border-gray-600 transition-colors text-left"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${isInDebt ? 'bg-red-500/10' : 'bg-green-500/10'}`}>
              {isInDebt ? (
                <AlertTriangle className="w-5 h-5 text-red-400" />
              ) : (
                <Check className="w-5 h-5 text-green-400" />
              )}
            </div>
            <div>
              <p className="text-sm text-gray-400">Sleep Debt</p>
              <p className="font-bold" style={{ color: debtColor }}>
                {isInDebt ? `${sleepDebt.toFixed(1)}h behind` : 'On track'}
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-500">Avg sleep</p>
            <p className="text-sm font-medium">{avgDuration.toFixed(1)}h</p>
          </div>
        </div>
      </button>
    );
  }

  return (
    <div className="bg-gray-800/50 rounded-xl border border-gray-700 overflow-hidden">
      {/* Header */}
      <div className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Moon className="w-5 h-5 text-indigo-400" />
            <h3 className="font-semibold">Sleep Tracker</h3>
          </div>
          {onLogSleep && (
            <button
              onClick={onLogSleep}
              className="text-sm text-blue-400 hover:text-blue-300"
            >
              Log Sleep
            </button>
          )}
        </div>

        {/* Sleep Debt Display */}
        <div className="flex items-center gap-6 mb-6">
          <div className={`p-4 rounded-xl ${isInDebt ? 'bg-red-500/10' : 'bg-green-500/10'}`}>
            {isInDebt ? (
              <Clock className="w-8 h-8" style={{ color: debtColor }} />
            ) : (
              <Check className="w-8 h-8 text-green-400" />
            )}
          </div>
          <div>
            <p className="text-sm text-gray-400 mb-1">Sleep Debt This Week</p>
            <p className="text-3xl font-bold" style={{ color: debtColor }}>
              {isInDebt ? `${sleepDebt.toFixed(1)} hours` : 'None!'}
            </p>
            {isInDebt && (
              <p className="text-sm text-gray-500 mt-1">
                {sleepDebt > 5 && 'Consider catching up over the weekend'}
                {sleepDebt > 2 && sleepDebt <= 5 && 'Try adding 30 min extra tonight'}
                {sleepDebt <= 2 && "You're almost caught up!"}
              </p>
            )}
          </div>
        </div>

        {/* Weekly Stats */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="text-center p-3 bg-gray-800/50 rounded-lg">
            <p className="text-2xl font-bold">{avgDuration.toFixed(1)}h</p>
            <p className="text-xs text-gray-500">Avg Duration</p>
          </div>
          <div className="text-center p-3 bg-gray-800/50 rounded-lg">
            <p className="text-2xl font-bold">{stats.avgQuality?.toFixed(1) || '-'}</p>
            <p className="text-xs text-gray-500">Avg Quality</p>
          </div>
          <div className="text-center p-3 bg-gray-800/50 rounded-lg">
            <p className="text-2xl font-bold">{stats.totalNights || 0}</p>
            <p className="text-xs text-gray-500">Nights Logged</p>
          </div>
        </div>

        {/* Weekly Trend Chart */}
        {weeklyStats.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm text-gray-400">Weekly Average (Last 4 Weeks)</p>
            <div className="flex items-end gap-2 h-24">
              {weeklyStats.map((week: { avgDuration: number; weekStart: string }, index: number) => {
                const heightPercent = Math.min(100, (week.avgDuration / targetHours) * 100);
                const isGood = week.avgDuration >= targetHours;
                return (
                  <SafeMotion.div
                    key={week.weekStart}
                    initial={{ height: 0 }}
                    animate={{ height: `${heightPercent}%` }}
                    transition={{ delay: index * 0.1 }}
                    className={`flex-1 rounded-t-lg ${
                      isGood ? 'bg-green-500/50' : 'bg-orange-500/50'
                    }`}
                    title={`${week.avgDuration.toFixed(1)}h avg`}
                  />
                );
              })}
            </div>
            <div className="flex justify-between text-xs text-gray-500">
              <span>4 weeks ago</span>
              <span>This week</span>
            </div>
          </div>
        )}
      </div>

      {/* Recommendations */}
      {isInDebt && (
        <div className="px-6 py-4 border-t border-gray-700 bg-gray-900/30">
          <p className="text-sm font-medium text-gray-300 mb-2">Pay Back Your Sleep Debt</p>
          <div className="space-y-2 text-sm text-gray-400">
            <div className="flex items-start gap-2">
              <TrendingUp className="w-4 h-4 text-green-400 mt-0.5" />
              <span>Add {Math.min(1, sleepDebt / 7).toFixed(0)}-1 hour extra per night</span>
            </div>
            <div className="flex items-start gap-2">
              <Moon className="w-4 h-4 text-indigo-400 mt-0.5" />
              <span>Try going to bed 30 minutes earlier</span>
            </div>
            <div className="flex items-start gap-2">
              <TrendingDown className="w-4 h-4 text-orange-400 mt-0.5" />
              <span>Avoid screens 1 hour before bed</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default SleepDebtCard;
