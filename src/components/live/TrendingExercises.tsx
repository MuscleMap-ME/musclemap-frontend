/**
 * TrendingExercises Component
 *
 * Shows popular exercises based on anonymous activity data.
 */

import React from 'react';
import { TrendingUp, Dumbbell, Flame, ArrowUp } from 'lucide-react';

const MUSCLE_COLORS = {
  chest: 'from-red-500 to-orange-500',
  back: 'from-blue-500 to-cyan-500',
  shoulders: 'from-amber-500 to-yellow-500',
  arms: 'from-violet-500 to-purple-500',
  core: 'from-emerald-500 to-green-500',
  legs: 'from-pink-500 to-rose-500',
  default: 'from-gray-500 to-slate-500',
};

function TrendingExercises({ trending = [], timeWindow = '1h', className = '' }) {
  const timeLabels = {
    '5m': '5 min',
    '15m': '15 min',
    '1h': '1 hour',
    '24h': '24 hours',
  };

  const maxCount = trending[0]?.count || 1;

  return (
    <div className={`bg-black/20 rounded-xl border border-white/5 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-amber-400" />
          <span className="text-sm font-medium text-white/80">Trending Now</span>
        </div>
        <span className="text-xs text-white/40">Last {timeLabels[timeWindow]}</span>
      </div>

      {/* Trending list */}
      <div className="p-4">
        {trending.length === 0 ? (
          <div className="text-center py-8">
            <Flame className="w-8 h-8 text-white/20 mx-auto mb-2" />
            <p className="text-sm text-white/40">No trending exercises</p>
            <p className="text-xs text-white/30 mt-1">Data will appear as workouts are logged</p>
          </div>
        ) : (
          <div className="space-y-3">
            {trending.map((item, index) => {
              const colorClass = MUSCLE_COLORS[item.muscleGroup] || MUSCLE_COLORS.default;
              const percentage = (item.count / maxCount) * 100;
              const isTop3 = index < 3;

              return (
                <div key={item.exerciseId} className="relative">
                  {/* Rank badge */}
                  <div className={`absolute -left-1 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                    isTop3 ? 'bg-amber-500 text-black' : 'bg-white/10 text-white/50'
                  }`}>
                    {index + 1}
                  </div>

                  {/* Exercise card */}
                  <div className="ml-8 relative overflow-hidden rounded-lg bg-white/5 p-3">
                    {/* Background bar */}
                    <div
                      className={`absolute inset-0 bg-gradient-to-r ${colorClass} opacity-10`}
                      style={{ width: `${percentage}%` }}
                    />

                    {/* Content */}
                    <div className="relative flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Dumbbell className="w-4 h-4 text-white/50" />
                        <div>
                          <p className="text-sm text-white/80 font-medium">
                            {item.exerciseName || item.exerciseId}
                          </p>
                          {item.muscleGroup && (
                            <p className="text-xs text-white/40 capitalize">
                              {item.muscleGroup}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="text-sm font-bold text-white/80">{item.count}</span>
                        {isTop3 && (
                          <ArrowUp className="w-4 h-4 text-emerald-400" />
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-4 py-2 border-t border-white/5 bg-black/10">
        <p className="text-xs text-white/30 text-center">
          Based on {trending.reduce((sum, t) => sum + t.count, 0)} anonymous workout logs
        </p>
      </div>
    </div>
  );
}

export default TrendingExercises;
