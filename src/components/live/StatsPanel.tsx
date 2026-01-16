/**
 * StatsPanel Component
 *
 * Real-time aggregate statistics display.
 * Shows anonymous activity counts and trends.
 */

import React from 'react';
import { Activity, TrendingUp, Globe, Dumbbell, Zap } from 'lucide-react';

function StatCard({ icon: Icon, label, value, subValue, color = 'blue' }) {
  const colorClasses = {
    blue: 'from-blue-500/20 to-blue-600/10 border-blue-500/20 text-blue-400',
    violet: 'from-violet-500/20 to-violet-600/10 border-violet-500/20 text-violet-400',
    emerald: 'from-emerald-500/20 to-emerald-600/10 border-emerald-500/20 text-emerald-400',
    amber: 'from-amber-500/20 to-amber-600/10 border-amber-500/20 text-amber-400',
  };

  return (
    <div className={`relative overflow-hidden rounded-xl bg-gradient-to-br ${colorClasses[color]} border p-4`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-white/50 mb-1">{label}</p>
          <p className="text-2xl font-bold text-white">{value}</p>
          {subValue && (
            <p className="text-xs text-white/40 mt-1">{subValue}</p>
          )}
        </div>
        <Icon className={`w-8 h-8 opacity-50 ${colorClasses[color].split(' ').pop()}`} />
      </div>
    </div>
  );
}

function StatsPanel({ stats, activityByMuscle = [], timeWindow = '1h', connected = false, className = '' }) {
  const timeLabels = {
    '5m': 'last 5 minutes',
    '15m': 'last 15 minutes',
    '1h': 'last hour',
    '24h': 'last 24 hours',
  };

  const topMuscle = activityByMuscle[0];

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Connection status */}
      <div className="flex items-center gap-2 px-3 py-2 bg-black/20 rounded-lg border border-white/5">
        <div className={`w-2 h-2 rounded-full ${connected ? 'bg-emerald-400 animate-pulse' : 'bg-white/30'}`} />
        <span className="text-xs text-white/60">
          {connected ? 'Live updates active' : 'Polling mode'}
        </span>
      </div>

      {/* Main stats grid */}
      <div className="grid grid-cols-2 gap-3">
        <StatCard
          icon={Activity}
          label="Total Activity"
          value={stats?.total?.toLocaleString() || '0'}
          subValue={timeLabels[timeWindow]}
          color="blue"
        />
        <StatCard
          icon={Globe}
          label="Active Regions"
          value={Object.keys(stats?.byCountry || {}).length}
          subValue="countries"
          color="violet"
        />
        <StatCard
          icon={Dumbbell}
          label="Muscle Groups"
          value={Object.keys(stats?.byMuscle || {}).length}
          subValue={topMuscle ? `Top: ${topMuscle.muscle}` : ''}
          color="emerald"
        />
        <StatCard
          icon={Zap}
          label="Workouts"
          value={stats?.byType?.['workout.completed']?.toLocaleString() || '0'}
          subValue={timeLabels[timeWindow]}
          color="amber"
        />
      </div>

      {/* Muscle breakdown */}
      {activityByMuscle.length > 0 && (
        <div className="bg-black/20 rounded-xl border border-white/5 p-4">
          <h3 className="text-sm font-medium text-white/70 mb-3 flex items-center gap-2">
            <TrendingUp className="w-4 h-4" />
            Activity by Muscle
          </h3>
          <div className="space-y-2">
            {activityByMuscle.slice(0, 5).map((item) => {
              const maxCount = activityByMuscle[0]?.count || 1;
              const percentage = (item.count / maxCount) * 100;

              return (
                <div key={item.muscle} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-white/70 capitalize">{item.muscle}</span>
                    <span className="text-white/50">{item.count}</span>
                  </div>
                  <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-blue-500 to-violet-500 rounded-full transition-all duration-500"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Privacy notice */}
      <div className="px-3 py-2 bg-emerald-500/10 rounded-lg border border-emerald-500/20">
        <p className="text-xs text-emerald-400/80">
          All data is anonymous and aggregated. Individual user activity is never displayed.
        </p>
      </div>
    </div>
  );
}

export default StatsPanel;
