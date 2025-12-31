/**
 * WorkoutComplete Component
 *
 * Displays workout completion celebration with stats, milestones, and tips.
 */

import React, { useEffect, useState } from 'react';
import { request } from '../../utils/httpClient';
import TipCard from './TipCard';
import MilestoneCard from './MilestoneCard';

export default function WorkoutComplete({ workout, onClose }) {
  const [tip, setTip] = useState(null);
  const [milestone, setMilestone] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showMilestone, setShowMilestone] = useState(true);

  useEffect(() => {
    const fetchCompletionData = async () => {
      try {
        const response = await request('/tips/completion', {
          method: 'POST',
          body: { goals: workout?.goals || [] },
        });
        setTip(response?.data?.tip);
        setMilestone(response?.data?.milestone);
      } catch (error) {
        console.error('Failed to fetch completion tip:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchCompletionData();
  }, [workout?.goals]);

  const stats = [
    {
      icon: '⏱️',
      value: workout?.duration || '-',
      label: 'minutes',
      color: 'text-blue-400',
    },
    {
      icon: '🏋️',
      value: workout?.exerciseCount || workout?.exercises?.length || '-',
      label: 'exercises',
      color: 'text-yellow-400',
    },
    {
      icon: '🔥',
      value: workout?.totalSets || '-',
      label: 'sets',
      color: 'text-orange-400',
    },
    {
      icon: '💪',
      value: workout?.totalTU ? Math.round(workout.totalTU) : '-',
      label: 'TU earned',
      color: 'text-purple-400',
    },
  ];

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-gray-900 rounded-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Celebration Header */}
        <div className="relative pt-8 pb-4 px-6 text-center overflow-hidden">
          {/* Confetti effect background */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute top-0 left-1/4 w-2 h-2 bg-yellow-400 rounded-full animate-ping" style={{ animationDelay: '0s' }} />
            <div className="absolute top-4 right-1/4 w-2 h-2 bg-purple-400 rounded-full animate-ping" style={{ animationDelay: '0.2s' }} />
            <div className="absolute top-2 left-1/2 w-2 h-2 bg-pink-400 rounded-full animate-ping" style={{ animationDelay: '0.4s' }} />
          </div>

          <div className="text-6xl mb-3">🎉</div>
          <h2 className="text-2xl font-bold text-white">Workout Complete!</h2>
          <p className="text-gray-400 text-sm mt-1">Great job staying consistent</p>
        </div>

        {/* Stats Grid */}
        <div className="px-6 pb-4">
          <div className="grid grid-cols-4 gap-2">
            {stats.map((stat, index) => (
              <div key={index} className="bg-gray-800 rounded-lg p-3 text-center">
                <div className="text-lg mb-1">{stat.icon}</div>
                <div className={`text-lg font-bold ${stat.color}`}>{stat.value}</div>
                <div className="text-xs text-gray-500">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Milestone Achievement */}
        {milestone && showMilestone && (
          <div className="px-6 pb-4">
            <MilestoneCard
              milestone={milestone}
              onContinue={() => setShowMilestone(false)}
            />
          </div>
        )}

        {/* Reward Tip */}
        {!loading && tip && (!milestone || !showMilestone) && (
          <div className="px-6 pb-4">
            <TipCard tip={tip} />
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="px-6 pb-4">
            <div className="bg-gray-800 rounded-xl p-4 animate-pulse">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-gray-700 rounded-full" />
                <div className="flex-1">
                  <div className="h-4 bg-gray-700 rounded w-3/4 mb-2" />
                  <div className="h-4 bg-gray-700 rounded w-1/2" />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Close Button */}
        <div className="px-6 pb-6">
          <button
            onClick={onClose}
            className="w-full py-3 bg-purple-600 hover:bg-purple-500 text-white font-medium rounded-xl transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
