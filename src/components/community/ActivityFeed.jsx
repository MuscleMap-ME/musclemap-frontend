/**
 * ActivityFeed Component
 *
 * Real-time activity feed showing community events.
 */

import React from 'react';
import { formatDistanceToNow } from 'date-fns';

const EVENT_ICONS = {
  'session.start': '🟢',
  'session.end': '🔴',
  'workout.started': '🏋️',
  'workout.completed': '💪',
  'exercise.selected': '📋',
  'exercise.completed': '✅',
  'stage.entered': '🚪',
  'stage.completed': '🏁',
  'level.up': '⬆️',
  'archetype.switched': '🔄',
  'achievement.unlocked': '🏆',
  'competition.joined': '🎯',
  'competition.completed': '🥇',
};

const EVENT_LABELS = {
  'session.start': 'Started a session',
  'session.end': 'Ended session',
  'workout.started': 'Started a workout',
  'workout.completed': 'Completed a workout',
  'exercise.selected': 'Selected an exercise',
  'exercise.completed': 'Completed an exercise',
  'stage.entered': 'Entered a new stage',
  'stage.completed': 'Completed a stage',
  'level.up': 'Leveled up',
  'archetype.switched': 'Switched archetype',
  'achievement.unlocked': 'Unlocked an achievement',
  'competition.joined': 'Joined a competition',
  'competition.completed': 'Finished a competition',
};

function ActivityCard({ event }) {
  const icon = EVENT_ICONS[event.type] || '📌';
  const label = EVENT_LABELS[event.type] || event.type;
  const time = formatDistanceToNow(new Date(event.ts), { addSuffix: true });

  return (
    <div className="bg-gray-800 rounded-xl p-4 flex items-start gap-3 hover:bg-gray-750 transition-colors">
      <div className="text-2xl flex-shrink-0">{icon}</div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-semibold text-white truncate">
            {event.displayName || 'Anonymous'}
          </span>
          {event.geoBucket && (
            <span className="text-xs bg-gray-700 px-2 py-0.5 rounded-full text-gray-300">
              {event.geoBucket}
            </span>
          )}
        </div>
        <p className="text-gray-300 text-sm mt-0.5">{label}</p>
        {event.payload?.exerciseName && (
          <p className="text-purple-400 text-sm mt-1">{event.payload.exerciseName}</p>
        )}
        {event.payload?.totalTu && (
          <p className="text-green-400 text-sm mt-1">
            +{Math.round(event.payload.totalTu)} TU
          </p>
        )}
        {event.payload?.newLevel && (
          <p className="text-yellow-400 text-sm mt-1">
            Level {event.payload.newLevel}
            {event.payload.archetypeName && ` - ${event.payload.archetypeName}`}
          </p>
        )}
      </div>
      <div className="text-xs text-gray-500 flex-shrink-0">{time}</div>
    </div>
  );
}

export default function ActivityFeed({ events = [], loading = false, connected = false }) {
  if (loading && events.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Connection Status */}
      <div className="flex items-center gap-2 text-sm">
        <div
          className={`w-2 h-2 rounded-full ${
            connected ? 'bg-green-500 animate-pulse' : 'bg-gray-500'
          }`}
        />
        <span className="text-gray-400">
          {connected ? 'Live updates active' : 'Connecting...'}
        </span>
      </div>

      {/* Events List */}
      {events.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <p className="text-4xl mb-3">🌟</p>
          <p>No activity yet. Be the first!</p>
        </div>
      ) : (
        <div className="space-y-2">
          {events.map((event, index) => (
            <ActivityCard key={event.id || index} event={event} />
          ))}
        </div>
      )}
    </div>
  );
}
