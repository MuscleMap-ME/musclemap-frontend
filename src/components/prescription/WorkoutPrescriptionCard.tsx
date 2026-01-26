import React from 'react';
import { SafeMotion } from '@/utils/safeMotion';
import { Link } from 'react-router-dom';
import {
  Dumbbell,
  Clock,
  Flame,
  Target,
  ChevronRight,
  Sparkles,
  RefreshCw,
  TrendingUp,
  AlertTriangle,
} from 'lucide-react';

interface PrescribedExercise {
  id: string;
  name: string;
  sets: number;
  reps: string;
  weight?: number;
  weightUnit?: string;
  restSeconds: number;
  muscleGroups: string[];
  notes?: string;
}

interface WorkoutPrescription {
  id: string;
  name: string;
  type: 'strength' | 'hypertrophy' | 'endurance' | 'power' | 'recovery';
  estimatedMinutes: number;
  exercises: PrescribedExercise[];
  totalVolume: number;
  caloriesBurn: number;
  difficulty: 1 | 2 | 3 | 4 | 5;
  aiConfidence: number;
  reason: string;
  warnings?: string[];
  expiresAt?: string;
}

interface WorkoutPrescriptionCardProps {
  prescription: WorkoutPrescription;
  onStart?: () => void;
  onRefresh?: () => void;
  isRefreshing?: boolean;
  expanded?: boolean;
}

export function WorkoutPrescriptionCard({
  prescription,
  onStart,
  onRefresh,
  isRefreshing,
  expanded = false,
}: WorkoutPrescriptionCardProps) {
  const {
    id,
    name,
    type,
    estimatedMinutes,
    exercises,
    totalVolume,
    caloriesBurn,
    difficulty,
    aiConfidence,
    reason,
    warnings,
    expiresAt,
  } = prescription;

  const getTypeColor = () => {
    switch (type) {
      case 'strength':
        return 'from-red-500 to-orange-500';
      case 'hypertrophy':
        return 'from-purple-500 to-pink-500';
      case 'endurance':
        return 'from-blue-500 to-cyan-500';
      case 'power':
        return 'from-amber-500 to-yellow-500';
      case 'recovery':
        return 'from-emerald-500 to-teal-500';
      default:
        return 'from-gray-500 to-gray-600';
    }
  };

  const getTypeLabel = () => {
    return type.charAt(0).toUpperCase() + type.slice(1);
  };

  const getDifficultyStars = () => {
    return Array(5)
      .fill(0)
      .map((_, i) => (
        <div
          key={i}
          className={`w-2 h-2 rounded-full ${
            i < difficulty ? 'bg-amber-400' : 'bg-gray-700'
          }`}
        />
      ));
  };

  const isExpired = expiresAt && new Date(expiresAt) < new Date();

  return (
    <SafeMotion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-2xl border border-gray-800 overflow-hidden ${
        isExpired ? 'opacity-60' : ''
      }`}
    >
      {/* Header with gradient */}
      <div className={`p-4 bg-gradient-to-r ${getTypeColor()} bg-opacity-20`}>
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2 py-0.5 text-xs font-medium rounded bg-white/20 text-white">
                {getTypeLabel()}
              </span>
              <div className="flex items-center gap-1 px-2 py-0.5 text-xs rounded bg-white/20 text-white">
                <Sparkles className="w-3 h-3" />
                {aiConfidence}% match
              </div>
            </div>
            <h3 className="text-lg font-bold text-white">{name}</h3>
          </div>
          {onRefresh && (
            <button
              onClick={onRefresh}
              disabled={isRefreshing}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              title="Get new prescription"
            >
              <RefreshCw
                className={`w-5 h-5 text-white ${isRefreshing ? 'animate-spin' : ''}`}
              />
            </button>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="p-4 bg-gray-900">
        <div className="grid grid-cols-4 gap-3 mb-4">
          <div className="text-center">
            <Clock className="w-5 h-5 text-blue-400 mx-auto mb-1" />
            <p className="text-sm font-semibold text-white">{estimatedMinutes}m</p>
            <p className="text-xs text-gray-500">Duration</p>
          </div>
          <div className="text-center">
            <Dumbbell className="w-5 h-5 text-purple-400 mx-auto mb-1" />
            <p className="text-sm font-semibold text-white">{exercises.length}</p>
            <p className="text-xs text-gray-500">Exercises</p>
          </div>
          <div className="text-center">
            <TrendingUp className="w-5 h-5 text-emerald-400 mx-auto mb-1" />
            <p className="text-sm font-semibold text-white">
              {(totalVolume / 1000).toFixed(1)}k
            </p>
            <p className="text-xs text-gray-500">Volume</p>
          </div>
          <div className="text-center">
            <Flame className="w-5 h-5 text-orange-400 mx-auto mb-1" />
            <p className="text-sm font-semibold text-white">{caloriesBurn}</p>
            <p className="text-xs text-gray-500">Calories</p>
          </div>
        </div>

        {/* Difficulty */}
        <div className="flex items-center justify-between mb-4">
          <span className="text-sm text-gray-400">Difficulty</span>
          <div className="flex items-center gap-1">{getDifficultyStars()}</div>
        </div>

        {/* AI Reason */}
        <div className="p-3 bg-gray-800/50 rounded-lg mb-4">
          <p className="text-sm text-gray-300">{reason}</p>
        </div>

        {/* Warnings */}
        {warnings && warnings.length > 0 && (
          <div className="mb-4 space-y-2">
            {warnings.map((warning, i) => (
              <div
                key={i}
                className="flex items-start gap-2 p-2 bg-amber-500/10 rounded-lg border border-amber-500/20"
              >
                <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-amber-300">{warning}</p>
              </div>
            ))}
          </div>
        )}

        {/* Exercises preview */}
        {expanded && (
          <div className="space-y-2 mb-4">
            <h4 className="text-sm font-medium text-gray-400">Exercises</h4>
            {exercises.slice(0, 5).map((exercise, index) => (
              <div
                key={exercise.id}
                className="flex items-center justify-between p-3 bg-gray-800/50 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <span className="w-6 h-6 rounded bg-gray-700 flex items-center justify-center text-xs text-gray-400">
                    {index + 1}
                  </span>
                  <div>
                    <p className="text-sm font-medium text-white">{exercise.name}</p>
                    <p className="text-xs text-gray-500">
                      {exercise.sets}×{exercise.reps}
                      {exercise.weight && ` @ ${exercise.weight}${exercise.weightUnit || 'lbs'}`}
                    </p>
                  </div>
                </div>
                <div className="text-xs text-gray-500">
                  {exercise.restSeconds}s rest
                </div>
              </div>
            ))}
            {exercises.length > 5 && (
              <p className="text-xs text-gray-500 text-center">
                +{exercises.length - 5} more exercises
              </p>
            )}
          </div>
        )}

        {/* Action button */}
        {onStart && !isExpired && (
          <button
            onClick={onStart}
            className="w-full flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-semibold rounded-xl transition-all"
          >
            <Target className="w-5 h-5" />
            Start Workout
            <ChevronRight className="w-5 h-5" />
          </button>
        )}

        {isExpired && (
          <div className="text-center py-3 text-sm text-amber-400">
            This prescription has expired
          </div>
        )}
      </div>
    </SafeMotion.div>
  );
}
