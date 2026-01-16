/**
 * WorkoutProgress Component - Progress Through Workout
 *
 * Displays workout progress in the header:
 * - Current exercise index / total exercises
 * - Total sets completed
 * - Workout duration
 * - Visual progress bar
 *
 * @example
 * <WorkoutProgress
 *   currentIndex={2}
 *   total={6}
 *   setsCompleted={8}
 *   duration={1200000}
 * />
 */

import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Clock, Dumbbell, Activity } from 'lucide-react';
import { useShouldReduceMotion } from '../../contexts/MotionContext';

/**
 * Format duration in milliseconds to MM:SS or H:MM:SS
 */
function formatDuration(ms) {
  if (!ms) return '0:00';

  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }

  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

/**
 * WorkoutProgress Component
 */
export function WorkoutProgress({
  currentIndex = 0,
  total = 0,
  setsCompleted = 0,
  duration = 0,
  compact = false,
}) {
  const shouldReduceMotion = useShouldReduceMotion();

  // Calculate progress percentage
  const progressPercent = useMemo(() => {
    if (total === 0) return 0;
    return Math.min(100, ((currentIndex + 1) / total) * 100);
  }, [currentIndex, total]);

  // Compact version for header
  if (compact) {
    return (
      <div className="flex items-center gap-4 text-sm">
        <span className="text-gray-400">
          <Activity className="w-4 h-4 inline mr-1" />
          {currentIndex + 1}/{total}
        </span>
        <span className="text-gray-400">
          <Dumbbell className="w-4 h-4 inline mr-1" />
          {setsCompleted}
        </span>
        <span className="text-white font-mono tabular-nums">
          <Clock className="w-4 h-4 inline mr-1" />
          {formatDuration(duration)}
        </span>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-2">
      {/* Progress Bar */}
      <div className="w-32 h-1.5 bg-white/10 rounded-full overflow-hidden">
        <motion.div
          className="h-full bg-blue-500 rounded-full"
          initial={{ width: 0 }}
          animate={{ width: `${progressPercent}%` }}
          transition={
            shouldReduceMotion
              ? { duration: 0 }
              : { type: 'spring', stiffness: 100, damping: 20 }
          }
        />
      </div>

      {/* Stats Row */}
      <div className="flex items-center gap-4 text-xs">
        {/* Exercise Progress */}
        <div className="flex items-center gap-1.5 text-gray-400">
          <Activity className="w-3.5 h-3.5" />
          <span>
            <span className="text-white font-semibold">{currentIndex + 1}</span>
            <span className="text-gray-500">/</span>
            <span>{total}</span>
          </span>
        </div>

        {/* Sets Completed */}
        <div className="flex items-center gap-1.5 text-gray-400">
          <Dumbbell className="w-3.5 h-3.5" />
          <span className="text-white font-semibold">{setsCompleted}</span>
          <span className="hidden sm:inline">sets</span>
        </div>

        {/* Duration */}
        <div className="flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5 text-gray-400" />
          <span className="text-white font-mono tabular-nums text-xs">
            {formatDuration(duration)}
          </span>
        </div>
      </div>
    </div>
  );
}

/**
 * WorkoutProgressDetailed - Expanded version with more stats
 */
export function WorkoutProgressDetailed({
  currentIndex = 0,
  total = 0,
  setsCompleted = 0,
  totalReps = 0,
  totalVolume = 0,
  estimatedCalories = 0,
  duration = 0,
}) {
  const shouldReduceMotion = useShouldReduceMotion();

  const progressPercent = useMemo(() => {
    if (total === 0) return 0;
    return Math.min(100, ((currentIndex + 1) / total) * 100);
  }, [currentIndex, total]);

  // Format volume (e.g., 1,234 lbs)
  const formattedVolume = useMemo(() => {
    if (totalVolume >= 1000) {
      return `${(totalVolume / 1000).toFixed(1)}k`;
    }
    return totalVolume.toLocaleString();
  }, [totalVolume]);

  return (
    <div className="bg-white/5 rounded-2xl p-4">
      {/* Progress Bar */}
      <div className="mb-4">
        <div className="flex items-center justify-between text-sm mb-2">
          <span className="text-gray-400">Workout Progress</span>
          <span className="text-white font-semibold">
            {Math.round(progressPercent)}%
          </span>
        </div>
        <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-blue-600 to-blue-400 rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${progressPercent}%` }}
            transition={
              shouldReduceMotion
                ? { duration: 0 }
                : { type: 'spring', stiffness: 100, damping: 20 }
            }
          />
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-3">
        {/* Duration */}
        <div className="bg-white/5 rounded-xl p-3">
          <div className="flex items-center gap-2 text-gray-400 text-xs mb-1">
            <Clock className="w-3.5 h-3.5" />
            Duration
          </div>
          <div className="text-xl font-bold text-white tabular-nums">
            {formatDuration(duration)}
          </div>
        </div>

        {/* Sets */}
        <div className="bg-white/5 rounded-xl p-3">
          <div className="flex items-center gap-2 text-gray-400 text-xs mb-1">
            <Dumbbell className="w-3.5 h-3.5" />
            Sets
          </div>
          <div className="text-xl font-bold text-white">
            {setsCompleted}
          </div>
        </div>

        {/* Volume */}
        <div className="bg-white/5 rounded-xl p-3">
          <div className="text-gray-400 text-xs mb-1">Volume</div>
          <div className="text-xl font-bold text-white">
            {formattedVolume}
            <span className="text-sm text-gray-400 ml-1">lbs</span>
          </div>
        </div>

        {/* Reps */}
        <div className="bg-white/5 rounded-xl p-3">
          <div className="text-gray-400 text-xs mb-1">Total Reps</div>
          <div className="text-xl font-bold text-white">
            {totalReps}
          </div>
        </div>
      </div>

      {/* Calories (if available) */}
      {estimatedCalories > 0 && (
        <div className="mt-3 flex items-center justify-center gap-2 text-sm text-orange-400">
          <span>~{estimatedCalories} cal burned</span>
        </div>
      )}
    </div>
  );
}

export default WorkoutProgress;
