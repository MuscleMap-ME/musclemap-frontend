/**
 * MilestoneCard Component
 *
 * Displays a milestone achievement celebration.
 */

import React from 'react';

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

export default function MilestoneCard({ milestone, onContinue }) {
  if (!milestone) return null;

  const icon = MILESTONE_ICONS[milestone.id] || '🏅';

  return (
    <div className="bg-gradient-to-b from-yellow-500/20 via-amber-500/10 to-transparent rounded-2xl p-6 border border-yellow-500/30 text-center">
      <div className="relative inline-block mb-4">
        <div className="text-6xl animate-bounce">{icon}</div>
        <div className="absolute -top-2 -right-2 w-8 h-8 bg-yellow-500 rounded-full flex items-center justify-center">
          <svg className="w-5 h-5 text-black" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
        </div>
      </div>

      <h3 className="text-xl font-bold text-yellow-400 mb-1">Milestone Achieved!</h3>
      <p className="text-2xl font-bold text-white mb-2">{milestone.name}</p>

      {milestone.description && (
        <p className="text-gray-300 text-sm mb-4">{milestone.description}</p>
      )}

      {onContinue && (
        <button
          onClick={onContinue}
          className="mt-4 px-6 py-2 bg-yellow-500 hover:bg-yellow-400 text-black font-medium rounded-lg transition-colors"
        >
          Awesome!
        </button>
      )}
    </div>
  );
}
