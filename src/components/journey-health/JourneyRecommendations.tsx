import React from 'react';
import { Link } from 'react-router-dom';
import { SafeMotion } from '@/utils/safeMotion';
import {
  Target,
  Dumbbell,
  Moon,
  TrendingUp,
  Users,
  Zap,
  ChevronRight
} from 'lucide-react';

interface JourneyRecommendation {
  id: string;
  type: string;
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high';
  actionLabel?: string;
  actionUrl?: string;
}

interface JourneyRecommendationsProps {
  recommendations: JourneyRecommendation[];
  onAction?: (recommendationId: string) => void;
}

export function JourneyRecommendations({ recommendations, onAction }: JourneyRecommendationsProps) {
  const getTypeIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case 'workout': return <Dumbbell className="w-5 h-5" />;
      case 'recovery': return <Moon className="w-5 h-5" />;
      case 'goal': return <Target className="w-5 h-5" />;
      case 'progression': return <TrendingUp className="w-5 h-5" />;
      case 'social': return <Users className="w-5 h-5" />;
      default: return <Zap className="w-5 h-5" />;
    }
  };

  const getPriorityStyles = (priority: JourneyRecommendation['priority']) => {
    switch (priority) {
      case 'high':
        return 'border-l-4 border-l-red-500';
      case 'medium':
        return 'border-l-4 border-l-amber-500';
      default:
        return 'border-l-4 border-l-blue-500';
    }
  };

  const getPriorityBadge = (priority: JourneyRecommendation['priority']) => {
    const styles = {
      high: 'bg-red-500/20 text-red-400',
      medium: 'bg-amber-500/20 text-amber-400',
      low: 'bg-blue-500/20 text-blue-400',
    };
    return (
      <span className={`px-2 py-0.5 rounded text-xs font-medium ${styles[priority]}`}>
        {priority}
      </span>
    );
  };

  if (recommendations.length === 0) {
    return (
      <div className="bg-gray-800 rounded-2xl p-6 text-center">
        <Zap className="w-12 h-12 mx-auto text-purple-400 mb-3" />
        <h3 className="text-lg font-medium text-white mb-1">You&apos;re on Track!</h3>
        <p className="text-sm text-gray-400">No recommendations at this time</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {recommendations.map((rec, index) => (
        <SafeMotion.div
          key={rec.id}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: index * 0.05 }}
          className={`bg-gray-800 rounded-xl overflow-hidden ${getPriorityStyles(rec.priority)}`}
        >
          <div className="p-4">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-gray-700 flex items-center justify-center text-purple-400">
                {getTypeIcon(rec.type)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="text-sm font-medium text-white truncate">{rec.title}</h4>
                  {getPriorityBadge(rec.priority)}
                </div>
                <p className="text-xs text-gray-400 line-clamp-2">{rec.description}</p>
              </div>
            </div>

            {(rec.actionUrl || rec.actionLabel) && (
              <div className="mt-3 pt-3 border-t border-gray-700">
                {rec.actionUrl ? (
                  <Link
                    to={rec.actionUrl}
                    className="flex items-center justify-between text-sm text-purple-400 hover:text-purple-300 transition-colors"
                  >
                    <span>{rec.actionLabel || 'Take Action'}</span>
                    <ChevronRight className="w-4 h-4" />
                  </Link>
                ) : (
                  <button
                    onClick={() => onAction?.(rec.id)}
                    className="flex items-center justify-between w-full text-sm text-purple-400 hover:text-purple-300 transition-colors"
                  >
                    <span>{rec.actionLabel || 'Take Action'}</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                )}
              </div>
            )}
          </div>
        </SafeMotion.div>
      ))}
    </div>
  );
}
