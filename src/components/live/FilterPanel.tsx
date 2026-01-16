/**
 * FilterPanel Component
 *
 * Controls for filtering live activity data.
 * Time window, muscle group, and event type filters.
 */

import React, { useState } from 'react';
import { Clock, Filter, Dumbbell, Zap, ChevronDown } from 'lucide-react';

const TIME_WINDOWS = [
  { value: '5m', label: '5 min' },
  { value: '15m', label: '15 min' },
  { value: '1h', label: '1 hour' },
  { value: '24h', label: '24 hours' },
];

const MUSCLE_GROUPS = [
  { value: 'all', label: 'All muscles' },
  { value: 'chest', label: 'Chest' },
  { value: 'back', label: 'Back' },
  { value: 'shoulders', label: 'Shoulders' },
  { value: 'arms', label: 'Arms' },
  { value: 'core', label: 'Core' },
  { value: 'legs', label: 'Legs' },
];

const EVENT_TYPES = [
  { value: 'all', label: 'All activity' },
  { value: 'workout.completed', label: 'Workouts' },
  { value: 'exercise.completed', label: 'Exercises' },
  { value: 'achievement.earned', label: 'Achievements' },
];

function FilterPanel({
  timeWindow = '1h',
  muscleGroup = 'all',
  eventType = 'all',
  onTimeWindowChange,
  onMuscleGroupChange,
  onEventTypeChange,
  className = '',
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className={`bg-black/20 rounded-xl border border-white/5 ${className}`}>
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-4 py-3"
      >
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-blue-400" />
          <span className="text-sm font-medium text-white/80">Filters</span>
        </div>
        <ChevronDown
          className={`w-4 h-4 text-white/50 transition-transform ${
            expanded ? 'rotate-180' : ''
          }`}
        />
      </button>

      {/* Quick time selector (always visible) */}
      <div className="px-4 pb-4">
        <div className="flex items-center gap-2 mb-2">
          <Clock className="w-4 h-4 text-white/50" />
          <span className="text-xs text-white/50">Time window</span>
        </div>
        <div className="flex gap-2">
          {TIME_WINDOWS.map((tw) => (
            <button
              key={tw.value}
              onClick={() => onTimeWindowChange?.(tw.value)}
              className={`px-3 py-1.5 text-xs rounded-lg transition-colors ${
                timeWindow === tw.value
                  ? 'bg-blue-500 text-white'
                  : 'bg-white/5 text-white/60 hover:bg-white/10 hover:text-white'
              }`}
            >
              {tw.label}
            </button>
          ))}
        </div>
      </div>

      {/* Expanded filters */}
      {expanded && (
        <div className="px-4 pb-4 space-y-4 border-t border-white/5 pt-4">
          {/* Muscle group filter */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Dumbbell className="w-4 h-4 text-white/50" />
              <span className="text-xs text-white/50">Muscle group</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {MUSCLE_GROUPS.map((mg) => (
                <button
                  key={mg.value}
                  onClick={() => onMuscleGroupChange?.(mg.value)}
                  className={`px-3 py-1.5 text-xs rounded-lg transition-colors ${
                    muscleGroup === mg.value
                      ? 'bg-violet-500 text-white'
                      : 'bg-white/5 text-white/60 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  {mg.label}
                </button>
              ))}
            </div>
          </div>

          {/* Event type filter */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Zap className="w-4 h-4 text-white/50" />
              <span className="text-xs text-white/50">Activity type</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {EVENT_TYPES.map((et) => (
                <button
                  key={et.value}
                  onClick={() => onEventTypeChange?.(et.value)}
                  className={`px-3 py-1.5 text-xs rounded-lg transition-colors ${
                    eventType === et.value
                      ? 'bg-emerald-500 text-white'
                      : 'bg-white/5 text-white/60 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  {et.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default FilterPanel;
