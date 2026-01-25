/**
 * ExerciseQuickPicker Component
 *
 * Fast exercise selection with:
 * - Search with fuzzy matching
 * - Recent exercises (quick pick)
 * - Browse by muscle group
 * - Full exercise list
 */

import React, { useState, useMemo, useCallback } from 'react';
import { useQuery } from '@apollo/client/react';
import {
  Search,
  Dumbbell,
  ChevronRight,
  Clock,
  Flame,
  Loader2,
  Plus,
  Minus,
} from 'lucide-react';
import { haptic } from '@/utils/haptics';
import { EXERCISES_QUERY } from '@/graphql/queries';

interface ExerciseQuickPickerProps {
  onSelect: (exercise: {
    id: string;
    name: string;
    weight?: number;
    reps?: number;
    sets?: number;
  }) => void;
  recentExercises?: Array<{
    exercise: { id: string; name: string; primaryMuscles?: string[] };
    lastWeight: number | null;
    lastReps: number | null;
    lastSets: number | null;
  }>;
}

// Muscle group filters
const MUSCLE_GROUPS = [
  { id: 'all', label: 'All', icon: '💪' },
  { id: 'chest', label: 'Chest', icon: '🫁' },
  { id: 'back', label: 'Back', icon: '🦴' },
  { id: 'shoulders', label: 'Shoulders', icon: '🔵' },
  { id: 'arms', label: 'Arms', icon: '💪' },
  { id: 'legs', label: 'Legs', icon: '🦵' },
  { id: 'core', label: 'Core', icon: '🎯' },
];

export function ExerciseQuickPicker({
  onSelect,
  recentExercises = [],
}: ExerciseQuickPickerProps) {
  const [search, setSearch] = useState('');
  const [selectedMuscle, setSelectedMuscle] = useState('all');
  const [selectedExercise, setSelectedExercise] = useState<{
    id: string;
    name: string;
    lastWeight?: number;
    lastReps?: number;
  } | null>(null);
  const [weight, setWeight] = useState(0);
  const [reps, setReps] = useState(10);
  const [sets, setSets] = useState(3);

  // Fetch all exercises
  const { data: exercisesData, loading } = useQuery(EXERCISES_QUERY, {
    variables: { limit: 200 },
    fetchPolicy: 'cache-first',
  });

  // Filter exercises
  const filteredExercises = useMemo(() => {
    if (!exercisesData?.exercises) return [];

    return exercisesData.exercises.filter((ex: {
      id: string;
      name: string;
      primaryMuscles?: string | string[];
    }) => {
      // Search filter
      if (search && !ex.name.toLowerCase().includes(search.toLowerCase())) {
        return false;
      }

      // Muscle group filter
      if (selectedMuscle !== 'all') {
        const muscles = typeof ex.primaryMuscles === 'string'
          ? ex.primaryMuscles.toLowerCase()
          : (ex.primaryMuscles || []).join(' ').toLowerCase();

        if (!muscles.includes(selectedMuscle)) {
          return false;
        }
      }

      return true;
    }).slice(0, 50);
  }, [exercisesData, search, selectedMuscle]);

  // Handle exercise tap
  const handleExerciseTap = useCallback((exercise: {
    id: string;
    name: string;
    lastWeight?: number;
    lastReps?: number;
  }) => {
    haptic('light');

    // Set up the exercise with defaults
    setSelectedExercise(exercise);
    setWeight(exercise.lastWeight ? Math.round(exercise.lastWeight * 2.205) : 0);
    setReps(exercise.lastReps || 10);
    setSets(3);
  }, []);

  // Confirm selection
  const handleConfirm = useCallback(() => {
    if (!selectedExercise) return;

    haptic('medium');
    onSelect({
      id: selectedExercise.id,
      name: selectedExercise.name,
      weight: weight > 0 ? weight / 2.205 : undefined, // Convert to kg
      reps,
      sets,
    });
    setSelectedExercise(null);
  }, [selectedExercise, weight, reps, sets, onSelect]);

  // Quick adjustment buttons
  const adjustWeight = (delta: number) => {
    setWeight(Math.max(0, weight + delta));
    haptic('selection');
  };

  const adjustReps = (delta: number) => {
    setReps(Math.max(1, reps + delta));
    haptic('selection');
  };

  const adjustSets = (delta: number) => {
    setSets(Math.max(1, sets + delta));
    haptic('selection');
  };

  // If exercise is selected, show the set entry UI
  if (selectedExercise) {
    return (
      <div className="space-y-4">
        {/* Selected Exercise Header */}
        <div className="flex items-center gap-3 pb-3 border-b border-gray-700">
          <div className="bg-blue-500/20 p-2 rounded-lg">
            <Dumbbell className="w-5 h-5 text-blue-400" />
          </div>
          <div className="flex-1">
            <h3 className="font-medium text-lg">{selectedExercise.name}</h3>
            <p className="text-xs text-gray-400">Enter your set details</p>
          </div>
          <button
            onClick={() => setSelectedExercise(null)}
            className="text-gray-400 hover:text-white text-sm"
          >
            Change
          </button>
        </div>

        {/* Weight Input */}
        <div className="bg-gray-800/50 rounded-xl p-4">
          <label className="text-sm text-gray-400 mb-2 block">Weight (lbs)</label>
          <div className="flex items-center justify-center gap-4">
            <button
              onClick={() => adjustWeight(-5)}
              className="w-12 h-12 rounded-full bg-gray-700 hover:bg-gray-600 flex items-center justify-center transition-colors"
            >
              <Minus className="w-5 h-5" />
            </button>
            <input
              type="number"
              value={weight}
              onChange={(e) => setWeight(Math.max(0, parseInt(e.target.value) || 0))}
              className="w-24 text-center text-3xl font-bold bg-transparent border-none focus:outline-none"
            />
            <button
              onClick={() => adjustWeight(5)}
              className="w-12 h-12 rounded-full bg-gray-700 hover:bg-gray-600 flex items-center justify-center transition-colors"
            >
              <Plus className="w-5 h-5" />
            </button>
          </div>
          {weight === 0 && (
            <p className="text-xs text-gray-500 text-center mt-2">0 = Bodyweight</p>
          )}
        </div>

        {/* Reps and Sets */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-gray-800/50 rounded-xl p-4">
            <label className="text-sm text-gray-400 mb-2 block">Reps</label>
            <div className="flex items-center justify-center gap-3">
              <button
                onClick={() => adjustReps(-1)}
                className="w-10 h-10 rounded-full bg-gray-700 hover:bg-gray-600 flex items-center justify-center"
              >
                <Minus className="w-4 h-4" />
              </button>
              <span className="text-2xl font-bold w-12 text-center">{reps}</span>
              <button
                onClick={() => adjustReps(1)}
                className="w-10 h-10 rounded-full bg-gray-700 hover:bg-gray-600 flex items-center justify-center"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="bg-gray-800/50 rounded-xl p-4">
            <label className="text-sm text-gray-400 mb-2 block">Sets</label>
            <div className="flex items-center justify-center gap-3">
              <button
                onClick={() => adjustSets(-1)}
                className="w-10 h-10 rounded-full bg-gray-700 hover:bg-gray-600 flex items-center justify-center"
              >
                <Minus className="w-4 h-4" />
              </button>
              <span className="text-2xl font-bold w-12 text-center">{sets}</span>
              <button
                onClick={() => adjustSets(1)}
                className="w-10 h-10 rounded-full bg-gray-700 hover:bg-gray-600 flex items-center justify-center"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Confirm Button */}
        <button
          onClick={handleConfirm}
          className="w-full bg-gradient-to-r from-green-600 to-emerald-500 hover:from-green-500 hover:to-emerald-400 py-4 rounded-xl font-bold text-lg transition-all"
        >
          Log {sets} × {reps} @ {weight > 0 ? `${weight} lbs` : 'Bodyweight'}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search exercises..."
          className="w-full bg-gray-800/50 border border-gray-700 rounded-xl pl-10 pr-4 py-3 text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none"
        />
      </div>

      {/* Muscle Group Filter */}
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide -mx-1 px-1">
        {MUSCLE_GROUPS.map((group) => (
          <button
            key={group.id}
            onClick={() => {
              setSelectedMuscle(group.id);
              haptic('selection');
            }}
            className={`
              flex items-center gap-1.5 px-3 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors
              ${selectedMuscle === group.id
                ? 'bg-blue-600 text-white'
                : 'bg-gray-800/50 text-gray-300 hover:bg-gray-700'
              }
            `}
          >
            <span>{group.icon}</span>
            <span>{group.label}</span>
          </button>
        ))}
      </div>

      {/* Recent Exercises (if no search) */}
      {!search && recentExercises.length > 0 && (
        <section>
          <h3 className="text-xs text-gray-500 uppercase tracking-wide mb-2 flex items-center gap-1">
            <Clock className="w-3 h-3" />
            Recent
          </h3>
          <div className="space-y-1">
            {recentExercises.slice(0, 5).map((item) => (
              <button
                key={item.exercise.id}
                onClick={() => handleExerciseTap({
                  id: item.exercise.id,
                  name: item.exercise.name,
                  lastWeight: item.lastWeight || undefined,
                  lastReps: item.lastReps || undefined,
                })}
                className="w-full flex items-center justify-between p-3 rounded-lg bg-gray-800/30 hover:bg-gray-800/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <Flame className="w-4 h-4 text-orange-400" />
                  <div className="text-left">
                    <p className="font-medium text-sm">{item.exercise.name}</p>
                    <p className="text-xs text-gray-500">
                      {item.lastWeight ? `${Math.round(item.lastWeight * 2.205)} lbs` : 'BW'} × {item.lastReps || 10}
                    </p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-500" />
              </button>
            ))}
          </div>
        </section>
      )}

      {/* Exercise List */}
      <section>
        <h3 className="text-xs text-gray-500 uppercase tracking-wide mb-2 flex items-center gap-1">
          <Dumbbell className="w-3 h-3" />
          {search ? `Results for "${search}"` : 'All Exercises'}
        </h3>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
          </div>
        ) : filteredExercises.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            <Dumbbell className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p>No exercises found</p>
            <p className="text-sm text-gray-500">Try a different search</p>
          </div>
        ) : (
          <div className="space-y-1 max-h-[300px] overflow-y-auto pr-1">
            {filteredExercises.map((exercise: { id: string; name: string; primaryMuscles?: string | string[] }) => (
              <button
                key={exercise.id}
                onClick={() => handleExerciseTap({ id: exercise.id, name: exercise.name })}
                className="w-full flex items-center justify-between p-3 rounded-lg bg-gray-800/30 hover:bg-gray-800/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center">
                    <Dumbbell className="w-4 h-4 text-blue-400" />
                  </div>
                  <div className="text-left">
                    <p className="font-medium text-sm">{exercise.name}</p>
                    <p className="text-xs text-gray-500">
                      {typeof exercise.primaryMuscles === 'string'
                        ? exercise.primaryMuscles.split(',')[0]
                        : exercise.primaryMuscles?.[0] || 'General'
                      }
                    </p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-500" />
              </button>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

export default ExerciseQuickPicker;
