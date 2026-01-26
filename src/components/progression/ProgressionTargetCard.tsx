import React from 'react';
import { SafeMotion } from '@/utils/safeMotion';
import { Target, TrendingUp, Calendar, Zap, CheckCircle, Clock } from 'lucide-react';
import { Link } from 'react-router-dom';

interface ProgressionTarget {
  id: string;
  exerciseId: string;
  exerciseName: string;
  targetType: 'weight' | 'reps' | 'volume' | 'frequency';
  currentValue: number;
  targetValue: number;
  unit: string;
  deadline?: string;
  progress: number;
  status: 'on_track' | 'at_risk' | 'achieved' | 'behind';
  projectedCompletion?: string;
  weeklyTrend: number;
}

interface ProgressionTargetCardProps {
  target: ProgressionTarget;
  onUpdate?: (targetId: string) => void;
}

export function ProgressionTargetCard({ target, onUpdate }: ProgressionTargetCardProps) {
  const {
    id,
    exerciseName,
    targetType,
    currentValue,
    targetValue,
    unit,
    deadline,
    progress,
    status,
    projectedCompletion,
    weeklyTrend,
  } = target;

  const getStatusColor = () => {
    switch (status) {
      case 'achieved':
        return 'border-emerald-500/50 bg-emerald-500/10';
      case 'on_track':
        return 'border-blue-500/30 bg-blue-500/5';
      case 'at_risk':
        return 'border-amber-500/30 bg-amber-500/5';
      case 'behind':
        return 'border-red-500/30 bg-red-500/5';
      default:
        return 'border-gray-700 bg-gray-800/50';
    }
  };

  const getStatusBadge = () => {
    const styles = {
      achieved: 'bg-emerald-500/20 text-emerald-400',
      on_track: 'bg-blue-500/20 text-blue-400',
      at_risk: 'bg-amber-500/20 text-amber-400',
      behind: 'bg-red-500/20 text-red-400',
    };
    const labels = {
      achieved: 'Achieved!',
      on_track: 'On Track',
      at_risk: 'At Risk',
      behind: 'Behind',
    };
    return (
      <span className={`px-2 py-0.5 rounded text-xs font-medium ${styles[status]}`}>
        {labels[status]}
      </span>
    );
  };

  const getTargetTypeIcon = () => {
    switch (targetType) {
      case 'weight':
        return <Zap className="w-4 h-4" />;
      case 'reps':
        return <Target className="w-4 h-4" />;
      case 'volume':
        return <TrendingUp className="w-4 h-4" />;
      case 'frequency':
        return <Calendar className="w-4 h-4" />;
      default:
        return <Target className="w-4 h-4" />;
    }
  };

  const getProgressColor = () => {
    if (status === 'achieved') return 'bg-emerald-500';
    if (progress >= 75) return 'bg-blue-500';
    if (progress >= 50) return 'bg-amber-500';
    return 'bg-red-500';
  };

  return (
    <SafeMotion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-xl border p-4 ${getStatusColor()}`}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-purple-500/20 flex items-center justify-center text-purple-400">
            {getTargetTypeIcon()}
          </div>
          <div>
            <h4 className="font-medium text-white text-sm">{exerciseName}</h4>
            <p className="text-xs text-gray-500 capitalize">{targetType} target</p>
          </div>
        </div>
        {getStatusBadge()}
      </div>

      {/* Progress display */}
      <div className="mb-3">
        <div className="flex items-end justify-between mb-1">
          <span className="text-2xl font-bold text-white">
            {currentValue}
            <span className="text-sm text-gray-400 ml-1">{unit}</span>
          </span>
          <span className="text-sm text-gray-400">
            / {targetValue} {unit}
          </span>
        </div>
        <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
          <SafeMotion.div
            initial={{ width: 0 }}
            animate={{ width: `${Math.min(progress, 100)}%` }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
            className={`h-full rounded-full ${getProgressColor()}`}
          />
        </div>
        <div className="flex items-center justify-between mt-1">
          <span className="text-xs text-gray-500">{progress.toFixed(0)}% complete</span>
          {weeklyTrend !== 0 && (
            <span
              className={`text-xs flex items-center gap-0.5 ${
                weeklyTrend > 0 ? 'text-emerald-400' : 'text-red-400'
              }`}
            >
              <TrendingUp
                className={`w-3 h-3 ${weeklyTrend < 0 ? 'rotate-180' : ''}`}
              />
              {weeklyTrend > 0 ? '+' : ''}{weeklyTrend.toFixed(1)}% this week
            </span>
          )}
        </div>
      </div>

      {/* Timeline info */}
      <div className="flex items-center justify-between text-xs">
        {deadline && (
          <div className="flex items-center gap-1 text-gray-400">
            <Calendar className="w-3 h-3" />
            <span>Due {new Date(deadline).toLocaleDateString()}</span>
          </div>
        )}
        {projectedCompletion && status !== 'achieved' && (
          <div className="flex items-center gap-1 text-gray-400">
            <Clock className="w-3 h-3" />
            <span>Est. {new Date(projectedCompletion).toLocaleDateString()}</span>
          </div>
        )}
        {status === 'achieved' && (
          <div className="flex items-center gap-1 text-emerald-400">
            <CheckCircle className="w-3 h-3" />
            <span>Target achieved!</span>
          </div>
        )}
      </div>

      {/* Action */}
      {onUpdate && status !== 'achieved' && (
        <button
          onClick={() => onUpdate(id)}
          className="mt-3 w-full px-3 py-2 bg-gray-700/50 hover:bg-gray-700 text-gray-300 text-sm rounded-lg transition-colors"
        >
          Update Progress
        </button>
      )}
    </SafeMotion.div>
  );
}
