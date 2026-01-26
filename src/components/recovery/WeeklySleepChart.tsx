import React from 'react';
import { SafeMotion } from '@/utils/safeMotion';

interface WeeklySleepStat {
  weekStart: string;
  avgDuration: number;
  avgQuality: number;
  consistency: number;
  daysLogged: number;
}

interface WeeklySleepChartProps {
  stats: WeeklySleepStat[];
  targetHours?: number;
}

export function WeeklySleepChart({ stats, targetHours = 8 }: WeeklySleepChartProps) {
  const maxDuration = Math.max(...stats.map((s) => s.avgDuration), targetHours);

  const getBarColor = (duration: number) => {
    const ratio = duration / targetHours;
    if (ratio >= 1) return 'bg-emerald-500';
    if (ratio >= 0.85) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const formatWeekLabel = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  if (stats.length === 0) {
    return (
      <div className="bg-gray-800 rounded-2xl p-6 text-center">
        <div className="text-4xl mb-3">😴</div>
        <p className="text-gray-400">No sleep data available yet</p>
        <p className="text-sm text-gray-500 mt-1">Start logging your sleep to see trends</p>
      </div>
    );
  }

  return (
    <div className="bg-gray-800 rounded-2xl p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm text-gray-400 uppercase">Weekly Sleep Trends</h3>
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <span className="w-2 h-2 rounded-full bg-emerald-500" />
          Goal Met
          <span className="w-2 h-2 rounded-full bg-yellow-500 ml-2" />
          Close
          <span className="w-2 h-2 rounded-full bg-red-500 ml-2" />
          Below
        </div>
      </div>

      {/* Chart */}
      <div className="flex items-end gap-2 h-40 mb-4">
        {stats.map((stat, index) => {
          const heightPercent = (stat.avgDuration / maxDuration) * 100;
          const targetHeightPercent = (targetHours / maxDuration) * 100;

          return (
            <div key={stat.weekStart} className="flex-1 flex flex-col items-center">
              {/* Bar container */}
              <div className="relative w-full h-full flex items-end justify-center">
                {/* Target line indicator */}
                <div
                  className="absolute w-full border-t border-dashed border-gray-600"
                  style={{ bottom: `${targetHeightPercent}%` }}
                />

                {/* Bar */}
                <SafeMotion.div
                  className={`w-full max-w-8 rounded-t-lg ${getBarColor(stat.avgDuration)}`}
                  initial={{ height: 0 }}
                  animate={{ height: `${heightPercent}%` }}
                  transition={{ delay: index * 0.1, duration: 0.5 }}
                />
              </div>

              {/* Label */}
              <div className="mt-2 text-center">
                <div className="text-xs text-gray-500">{formatWeekLabel(stat.weekStart)}</div>
                <div className="text-sm font-medium text-white">{stat.avgDuration.toFixed(1)}h</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-3 gap-4 pt-4 border-t border-gray-700">
        <div className="text-center">
          <div className="text-lg font-bold text-white">
            {stats.length > 0 ? stats[stats.length - 1].avgDuration.toFixed(1) : '—'}h
          </div>
          <div className="text-xs text-gray-400">This Week Avg</div>
        </div>
        <div className="text-center">
          <div className="text-lg font-bold text-white">
            {stats.length > 0 ? Math.round(stats[stats.length - 1].avgQuality) : '—'}%
          </div>
          <div className="text-xs text-gray-400">Quality Score</div>
        </div>
        <div className="text-center">
          <div className="text-lg font-bold text-white">
            {stats.length > 0 ? Math.round(stats[stats.length - 1].consistency) : '—'}%
          </div>
          <div className="text-xs text-gray-400">Consistency</div>
        </div>
      </div>

      {/* Target indicator */}
      <div className="mt-4 flex items-center justify-center gap-2 text-xs text-gray-500">
        <span className="border-t border-dashed border-gray-600 w-4" />
        Target: {targetHours}h per night
      </div>
    </div>
  );
}
