import React from 'react';
import { SafeMotion } from '@/utils/safeMotion';
import {
  TrendingUp,
  Star,
  Target,
  Trophy,
  Flame,
  Calendar
} from 'lucide-react';

interface ProgressionMilestone {
  id: string;
  type: 'pr' | 'milestone' | 'achievement' | 'streak' | 'target_reached';
  title: string;
  description: string;
  value?: number;
  unit?: string;
  date: string;
  exerciseName?: string;
}

interface ProgressionTimelineProps {
  milestones: ProgressionMilestone[];
  maxItems?: number;
}

export function ProgressionTimeline({ milestones, maxItems = 10 }: ProgressionTimelineProps) {
  const displayMilestones = milestones.slice(0, maxItems);

  const getTypeIcon = (type: ProgressionMilestone['type']) => {
    switch (type) {
      case 'pr':
        return <TrendingUp className="w-4 h-4" />;
      case 'milestone':
        return <Star className="w-4 h-4" />;
      case 'achievement':
        return <Trophy className="w-4 h-4" />;
      case 'streak':
        return <Flame className="w-4 h-4" />;
      case 'target_reached':
        return <Target className="w-4 h-4" />;
      default:
        return <Star className="w-4 h-4" />;
    }
  };

  const getTypeColor = (type: ProgressionMilestone['type']) => {
    switch (type) {
      case 'pr':
        return 'bg-purple-500/20 text-purple-400 border-purple-500/30';
      case 'milestone':
        return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      case 'achievement':
        return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
      case 'streak':
        return 'bg-orange-500/20 text-orange-400 border-orange-500/30';
      case 'target_reached':
        return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
      default:
        return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
  };

  if (displayMilestones.length === 0) {
    return (
      <div className="bg-gray-800 rounded-2xl p-6 text-center">
        <Calendar className="w-12 h-12 mx-auto text-gray-600 mb-3" />
        <h3 className="text-lg font-medium text-white mb-1">No Progress Yet</h3>
        <p className="text-sm text-gray-400">
          Complete workouts to start building your progression timeline
        </p>
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Timeline line */}
      <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-700" />

      <div className="space-y-4">
        {displayMilestones.map((milestone, index) => (
          <SafeMotion.div
            key={milestone.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.05 }}
            className="relative flex gap-4"
          >
            {/* Icon */}
            <div
              className={`relative z-10 w-8 h-8 rounded-full border flex items-center justify-center flex-shrink-0 ${getTypeColor(
                milestone.type
              )}`}
            >
              {getTypeIcon(milestone.type)}
            </div>

            {/* Content */}
            <div className="flex-1 bg-gray-800/50 rounded-xl p-3 pb-4">
              <div className="flex items-start justify-between gap-2 mb-1">
                <h4 className="font-medium text-white text-sm">{milestone.title}</h4>
                <span className="text-xs text-gray-500 flex-shrink-0">
                  {new Date(milestone.date).toLocaleDateString()}
                </span>
              </div>
              <p className="text-xs text-gray-400 mb-2">{milestone.description}</p>

              {milestone.value !== undefined && (
                <div className="inline-flex items-center gap-1 px-2 py-1 bg-gray-700/50 rounded-lg">
                  <span className="text-sm font-semibold text-white">
                    {milestone.value}
                  </span>
                  {milestone.unit && (
                    <span className="text-xs text-gray-400">{milestone.unit}</span>
                  )}
                </div>
              )}

              {milestone.exerciseName && (
                <div className="mt-2">
                  <span className="text-xs text-gray-500">{milestone.exerciseName}</span>
                </div>
              )}
            </div>
          </SafeMotion.div>
        ))}
      </div>

      {milestones.length > maxItems && (
        <div className="mt-4 text-center">
          <button className="text-sm text-purple-400 hover:text-purple-300 transition-colors">
            View all {milestones.length} milestones
          </button>
        </div>
      )}
    </div>
  );
}
