/**
 * MilestoneProgress Component
 *
 * Displays user's milestone progress with progress bars.
 */

import React, { useEffect, useState } from 'react';
import { request } from '../../utils/httpClient';

const MILESTONE_ICONS = {
  first_workout: '🎉',
  workouts_10: '🔥',
  workouts_50: '⚡',
  workouts_100: '🏆',
  streak_7: '📅',
  streak_30: '🗓️',
  exercises_100: '💯',
  reps_1000: '🎯',
  reps_10000: '🚀',
  hours_10: '⏱️',
};

function MilestoneItem({ milestone }) {
  const isComplete = !!milestone.completed_at;
  const icon = MILESTONE_ICONS[milestone.id] || '🏅';

  return (
    <div className={`bg-gray-800 rounded-lg p-3 ${isComplete ? 'border border-yellow-500/30' : ''}`}>
      <div className="flex items-center gap-3">
        <div className={`text-2xl ${isComplete ? '' : 'grayscale opacity-50'}`}>
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1">
            <span className={`font-medium text-sm ${isComplete ? 'text-yellow-400' : 'text-gray-300'}`}>
              {milestone.name}
            </span>
            {isComplete && (
              <svg className="w-4 h-4 text-yellow-400 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            )}
          </div>

          {!isComplete && (
            <>
              <div className="h-1.5 bg-gray-700 rounded-full overflow-hidden mb-1">
                <div
                  className="h-full bg-purple-500 rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, milestone.progress)}%` }}
                />
              </div>
              <div className="text-xs text-gray-500">
                {milestone.current_value} / {milestone.threshold}
              </div>
            </>
          )}

          {isComplete && milestone.description && (
            <p className="text-xs text-gray-400 truncate">{milestone.description}</p>
          )}
        </div>
      </div>
    </div>
  );
}

export default function MilestoneProgress({ limit = 6 }) {
  const [milestones, setMilestones] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMilestones = async () => {
      try {
        const response = await request('/milestones');
        setMilestones(response?.data || []);
      } catch (error) {
        console.error('Failed to fetch milestones:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchMilestones();
  }, []);

  if (loading) {
    return (
      <div className="space-y-2">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="bg-gray-800 rounded-lg p-3 animate-pulse">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-gray-700 rounded-full" />
              <div className="flex-1">
                <div className="h-4 bg-gray-700 rounded w-1/2 mb-2" />
                <div className="h-1.5 bg-gray-700 rounded-full w-full" />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (milestones.length === 0) {
    return (
      <div className="text-center py-6 text-gray-400">
        <div className="text-3xl mb-2">🏅</div>
        <p className="text-sm">Complete workouts to earn milestones!</p>
      </div>
    );
  }

  // Sort: incomplete first (by progress desc), then complete (by completion date desc)
  const sorted = [...milestones].sort((a, b) => {
    if (a.completed_at && !b.completed_at) return 1;
    if (!a.completed_at && b.completed_at) return -1;
    if (a.completed_at && b.completed_at) {
      return new Date(b.completed_at) - new Date(a.completed_at);
    }
    return b.progress - a.progress;
  });

  const displayed = sorted.slice(0, limit);

  return (
    <div className="space-y-2">
      {displayed.map((milestone) => (
        <MilestoneItem key={milestone.id} milestone={milestone} />
      ))}

      {milestones.length > limit && (
        <div className="text-center">
          <span className="text-sm text-gray-500">
            +{milestones.length - limit} more milestones
          </span>
        </div>
      )}
    </div>
  );
}
