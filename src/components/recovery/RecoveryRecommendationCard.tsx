import React from 'react';
import { SafeMotion } from '@/utils/safeMotion';
import {
  Moon,
  Droplets,
  Footprints,
  Wind,
  Dumbbell,
  Heart,
  Sparkles,
  ChevronRight,
} from 'lucide-react';

interface RecoveryRecommendation {
  id: string;
  type: string;
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high';
  estimatedImpact: number;
}

interface RecoveryRecommendationCardProps {
  recommendation: RecoveryRecommendation;
  onAction?: (id: string) => void;
  index?: number;
}

export function RecoveryRecommendationCard({
  recommendation,
  onAction,
  index = 0,
}: RecoveryRecommendationCardProps) {
  const getTypeIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case 'sleep':
        return <Moon className="w-5 h-5" />;
      case 'hydration':
        return <Droplets className="w-5 h-5" />;
      case 'mobility':
        return <Footprints className="w-5 h-5" />;
      case 'breathing':
        return <Wind className="w-5 h-5" />;
      case 'deload':
        return <Dumbbell className="w-5 h-5" />;
      case 'stress':
        return <Heart className="w-5 h-5" />;
      default:
        return <Sparkles className="w-5 h-5" />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type.toLowerCase()) {
      case 'sleep':
        return 'bg-indigo-500/20 text-indigo-400';
      case 'hydration':
        return 'bg-cyan-500/20 text-cyan-400';
      case 'mobility':
        return 'bg-amber-500/20 text-amber-400';
      case 'breathing':
        return 'bg-teal-500/20 text-teal-400';
      case 'deload':
        return 'bg-purple-500/20 text-purple-400';
      case 'stress':
        return 'bg-pink-500/20 text-pink-400';
      default:
        return 'bg-gray-500/20 text-gray-400';
    }
  };

  const getPriorityBadge = (priority: RecoveryRecommendation['priority']) => {
    const styles = {
      high: 'bg-red-500/20 text-red-400 border-red-500/30',
      medium: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
      low: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    };
    return (
      <span className={`px-2 py-0.5 rounded text-xs font-medium border ${styles[priority]}`}>
        {priority}
      </span>
    );
  };

  const getImpactDisplay = (impact: number) => {
    const percentage = Math.min(100, Math.max(0, impact));
    const getColor = () => {
      if (percentage >= 70) return 'bg-emerald-500';
      if (percentage >= 40) return 'bg-amber-500';
      return 'bg-blue-500';
    };
    return (
      <div className="flex items-center gap-2">
        <div className="w-16 h-1.5 bg-gray-700 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full ${getColor()}`}
            style={{ width: `${percentage}%` }}
          />
        </div>
        <span className="text-xs text-gray-400">{percentage}%</span>
      </div>
    );
  };

  return (
    <SafeMotion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className="bg-gray-800 rounded-xl p-4 hover:bg-gray-750 transition-colors"
    >
      <div className="flex items-start gap-4">
        {/* Icon */}
        <div className={`flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center ${getTypeColor(recommendation.type)}`}>
          {getTypeIcon(recommendation.type)}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h4 className="font-medium text-white truncate">{recommendation.title}</h4>
            {getPriorityBadge(recommendation.priority)}
          </div>
          <p className="text-sm text-gray-400 mb-3 line-clamp-2">{recommendation.description}</p>

          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs text-gray-500">Expected Impact</span>
              {getImpactDisplay(recommendation.estimatedImpact)}
            </div>
            {onAction && (
              <button
                onClick={() => onAction(recommendation.id)}
                className="flex items-center gap-1 text-sm text-purple-400 hover:text-purple-300 transition-colors"
              >
                Start
                <ChevronRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    </SafeMotion.div>
  );
}
