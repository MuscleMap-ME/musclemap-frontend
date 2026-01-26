import React from 'react';
import { SafeMotion } from '@/utils/safeMotion';

interface HealthFactor {
  name: string;
  score: number;
  weight: number;
}

interface JourneyHealthScoreProps {
  score: number;
  trend: 'up' | 'down' | 'stable';
  factors: HealthFactor[];
  lastCalculated?: string;
}

export function JourneyHealthScore({ score, trend, factors, lastCalculated }: JourneyHealthScoreProps) {
  const getScoreColor = (s: number) => {
    if (s >= 80) return 'text-emerald-400';
    if (s >= 60) return 'text-yellow-400';
    if (s >= 40) return 'text-orange-400';
    return 'text-red-400';
  };

  const getScoreGradient = (s: number) => {
    if (s >= 80) return 'from-emerald-500 to-emerald-600';
    if (s >= 60) return 'from-yellow-500 to-yellow-600';
    if (s >= 40) return 'from-orange-500 to-orange-600';
    return 'from-red-500 to-red-600';
  };

  const getTrendIcon = () => {
    switch (trend) {
      case 'up': return '↑';
      case 'down': return '↓';
      default: return '→';
    }
  };

  const getTrendColor = () => {
    switch (trend) {
      case 'up': return 'text-emerald-400';
      case 'down': return 'text-red-400';
      default: return 'text-gray-400';
    }
  };

  // Calculate stroke dashoffset for the circular progress
  const circumference = 2 * Math.PI * 45; // radius = 45
  const strokeDashoffset = circumference - (score / 100) * circumference;

  return (
    <div className="bg-gray-800 rounded-2xl p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm text-gray-400 uppercase">Journey Health</h3>
        <span className={`flex items-center gap-1 text-sm ${getTrendColor()}`}>
          {getTrendIcon()} {trend}
        </span>
      </div>

      <div className="flex items-center justify-center mb-6">
        <div className="relative w-32 h-32">
          {/* Background circle */}
          <svg className="w-full h-full transform -rotate-90">
            <circle
              cx="64"
              cy="64"
              r="45"
              fill="none"
              stroke="currentColor"
              strokeWidth="8"
              className="text-gray-700"
            />
            {/* Progress circle */}
            <SafeMotion.circle
              cx="64"
              cy="64"
              r="45"
              fill="none"
              stroke="url(#scoreGradient)"
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={circumference}
              initial={{ strokeDashoffset: circumference }}
              animate={{ strokeDashoffset }}
              transition={{ duration: 1, ease: 'easeOut' }}
            />
            <defs>
              <linearGradient id="scoreGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" className={`stop-color-current ${getScoreGradient(score).split(' ')[0].replace('from-', 'text-')}`} />
                <stop offset="100%" className={`stop-color-current ${getScoreGradient(score).split(' ')[1].replace('to-', 'text-')}`} />
              </linearGradient>
            </defs>
          </svg>
          {/* Score display */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className={`text-4xl font-bold ${getScoreColor(score)}`}>{Math.round(score)}</span>
            <span className="text-xs text-gray-400">/ 100</span>
          </div>
        </div>
      </div>

      {/* Health Factors */}
      <div className="space-y-3">
        <h4 className="text-xs text-gray-500 uppercase">Contributing Factors</h4>
        {factors.map((factor) => (
          <div key={factor.name} className="space-y-1">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-300">{factor.name}</span>
              <span className={getScoreColor(factor.score)}>{factor.score}%</span>
            </div>
            <div className="h-1.5 bg-gray-700 rounded-full overflow-hidden">
              <SafeMotion.div
                className={`h-full rounded-full bg-gradient-to-r ${getScoreGradient(factor.score)}`}
                initial={{ width: 0 }}
                animate={{ width: `${factor.score}%` }}
                transition={{ duration: 0.5, delay: 0.1 }}
              />
            </div>
          </div>
        ))}
      </div>

      {lastCalculated && (
        <div className="mt-4 text-xs text-gray-500 text-center">
          Updated {new Date(lastCalculated).toLocaleDateString()}
        </div>
      )}
    </div>
  );
}
