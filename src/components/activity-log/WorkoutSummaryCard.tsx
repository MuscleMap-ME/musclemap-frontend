/**
 * WorkoutSummaryCard Component
 *
 * Shows summary of logged exercises with:
 * - List of exercises with details
 * - Total stats (sets, volume)
 * - Remove individual exercises
 * - Complete workout button
 */

import React from 'react';
import {
  Dumbbell,
  CheckCircle2,
  Loader2,
  Flame,
  X,
} from 'lucide-react';
import { SafeMotion, SafeAnimatePresence } from '@/utils/safeMotion';
import { haptic } from '@/utils/haptics';

interface LoggedExercise {
  exerciseId: string;
  name: string;
  sets: number;
  reps: number;
  weight?: number;
  source: string;
}

interface WorkoutSummaryCardProps {
  exercises: LoggedExercise[];
  onComplete: () => void;
  onRemove: (index: number) => void;
  isLoading?: boolean;
}

export function WorkoutSummaryCard({
  exercises,
  onComplete,
  onRemove,
  isLoading = false,
}: WorkoutSummaryCardProps) {
  // Calculate totals
  const totalSets = exercises.reduce((sum, e) => sum + e.sets, 0);
  const totalReps = exercises.reduce((sum, e) => sum + (e.sets * e.reps), 0);
  const totalVolume = exercises.reduce((sum, e) => {
    const weightLbs = e.weight ? e.weight * 2.205 : 0;
    return sum + (weightLbs * e.sets * e.reps);
  }, 0);

  if (exercises.length === 0) {
    return null;
  }

  return (
    <div className="bg-gradient-to-br from-gray-800/80 to-gray-900/80 rounded-2xl border border-gray-700/50 overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-gray-700/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-green-500/20 p-2 rounded-lg">
              <Flame className="w-5 h-5 text-green-400" />
            </div>
            <div>
              <h3 className="font-medium">Today&apos;s Workout</h3>
              <p className="text-xs text-gray-400">
                {exercises.length} exercise{exercises.length !== 1 ? 's' : ''}
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-400">Volume</p>
            <p className="font-bold text-green-400">
              {totalVolume > 1000 ? `${(totalVolume / 1000).toFixed(1)}k` : Math.round(totalVolume)} lbs
            </p>
          </div>
        </div>
      </div>

      {/* Exercise List */}
      <div className="max-h-[200px] overflow-y-auto">
        <SafeAnimatePresence>
          {exercises.map((exercise, index) => (
            <SafeMotion.div
              key={`${exercise.exerciseId}-${index}`}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20, height: 0 }}
              transition={{ duration: 0.2 }}
              className="flex items-center justify-between p-3 border-b border-gray-700/30 last:border-b-0"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
                  <Dumbbell className="w-4 h-4 text-blue-400" />
                </div>
                <div>
                  <p className="font-medium text-sm">{exercise.name}</p>
                  <p className="text-xs text-gray-400">
                    {exercise.sets}×{exercise.reps}
                    {exercise.weight ? ` @ ${Math.round(exercise.weight * 2.205)} lbs` : ' (BW)'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  haptic('light');
                  onRemove(index);
                }}
                className="p-2 rounded-lg text-gray-500 hover:text-red-400 hover:bg-red-400/10 transition-colors"
                aria-label={`Remove ${exercise.name}`}
              >
                <X className="w-4 h-4" />
              </button>
            </SafeMotion.div>
          ))}
        </SafeAnimatePresence>
      </div>

      {/* Stats Bar */}
      <div className="p-3 bg-gray-900/50 border-t border-gray-700/30">
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-4">
            <div>
              <span className="text-gray-400">Sets: </span>
              <span className="font-medium">{totalSets}</span>
            </div>
            <div>
              <span className="text-gray-400">Reps: </span>
              <span className="font-medium">{totalReps}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Complete Button */}
      <div className="p-4 pt-0">
        <button
          onClick={onComplete}
          disabled={isLoading || exercises.length === 0}
          className={`
            w-full py-4 rounded-xl font-bold text-lg transition-all flex items-center justify-center gap-2
            ${isLoading || exercises.length === 0
              ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
              : 'bg-gradient-to-r from-green-600 to-emerald-500 hover:from-green-500 hover:to-emerald-400 text-white'
            }
          `}
        >
          {isLoading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Completing...
            </>
          ) : (
            <>
              <CheckCircle2 className="w-5 h-5" />
              Complete Workout
            </>
          )}
        </button>
      </div>
    </div>
  );
}

export default WorkoutSummaryCard;
