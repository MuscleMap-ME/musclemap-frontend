/**
 * Workout Session Store (Zustand)
 *
 * Manages real-time workout tracking state. Uses selector-based subscriptions
 * so timer updates don't re-render components that only display exercise info.
 *
 * @example
 * // Only re-renders when rest timer changes
 * const restTimer = useWorkoutSession((s) => s.restTimer);
 *
 * // Only re-renders when sets change
 * const sets = useWorkoutSession((s) => s.sets);
 */

import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';

/**
 * Workout Session Store
 * Handles active workout state with real-time updates
 */
export const useWorkoutSessionStore = create(
  subscribeWithSelector((set, get) => ({
    // ============================================
    // SESSION STATE
    // ============================================
    isActive: false,
    sessionId: null,
    startTime: null,
    pausedAt: null,
    totalPausedTime: 0,

    // ============================================
    // CURRENT EXERCISE
    // ============================================
    currentExercise: null,
    currentExerciseIndex: 0,
    exercises: [],

    // ============================================
    // SETS & REPS
    // ============================================
    sets: [],
    currentSetIndex: 0,
    targetSets: 3,
    targetReps: 10,

    // ============================================
    // REST TIMER
    // ============================================
    restTimer: 0,
    restTimerActive: false,
    defaultRestDuration: 90, // seconds
    restTimerInterval: null,

    // ============================================
    // WORKOUT METRICS
    // ============================================
    totalVolume: 0, // weight × reps summed
    totalReps: 0,
    estimatedCalories: 0,
    musclesWorked: new Set(),

    // ============================================
    // SESSION ACTIONS
    // ============================================
    startSession: (workoutPlan) => {
      const sessionId = `workout_${Date.now()}`;
      set({
        isActive: true,
        sessionId,
        startTime: Date.now(),
        pausedAt: null,
        totalPausedTime: 0,
        exercises: workoutPlan?.exercises || [],
        currentExercise: workoutPlan?.exercises?.[0] || null,
        currentExerciseIndex: 0,
        sets: [],
        currentSetIndex: 0,
        totalVolume: 0,
        totalReps: 0,
        estimatedCalories: 0,
        musclesWorked: new Set(),
      });
      return sessionId;
    },

    pauseSession: () => {
      if (!get().isActive || get().pausedAt) return;
      set({ pausedAt: Date.now() });
      get().stopRestTimer();
    },

    resumeSession: () => {
      const { pausedAt, totalPausedTime } = get();
      if (!pausedAt) return;
      const pauseDuration = Date.now() - pausedAt;
      set({
        pausedAt: null,
        totalPausedTime: totalPausedTime + pauseDuration,
      });
    },

    endSession: () => {
      get().stopRestTimer();
      const summary = get().getSessionSummary();
      set({
        isActive: false,
        sessionId: null,
        startTime: null,
        pausedAt: null,
        totalPausedTime: 0,
        currentExercise: null,
        currentExerciseIndex: 0,
        exercises: [],
        sets: [],
        currentSetIndex: 0,
        restTimer: 0,
        restTimerActive: false,
      });
      return summary;
    },

    // ============================================
    // EXERCISE ACTIONS
    // ============================================
    setCurrentExercise: (exercise, index) => {
      set({
        currentExercise: exercise,
        currentExerciseIndex: index,
        currentSetIndex: 0,
      });
    },

    nextExercise: () => {
      const { exercises, currentExerciseIndex } = get();
      const nextIndex = currentExerciseIndex + 1;
      if (nextIndex < exercises.length) {
        set({
          currentExercise: exercises[nextIndex],
          currentExerciseIndex: nextIndex,
          currentSetIndex: 0,
        });
        return true;
      }
      return false;
    },

    previousExercise: () => {
      const { exercises, currentExerciseIndex } = get();
      const prevIndex = currentExerciseIndex - 1;
      if (prevIndex >= 0) {
        set({
          currentExercise: exercises[prevIndex],
          currentExerciseIndex: prevIndex,
          currentSetIndex: 0,
        });
        return true;
      }
      return false;
    },

    // ============================================
    // SET LOGGING
    // ============================================
    logSet: ({ weight, reps, rpe, notes }) => {
      const { currentExercise, sets, totalVolume, totalReps, musclesWorked } = get();

      const newSet = {
        id: `set_${Date.now()}`,
        exerciseId: currentExercise?.id,
        exerciseName: currentExercise?.name,
        weight: weight || 0,
        reps: reps || 0,
        rpe: rpe || null,
        notes: notes || '',
        timestamp: Date.now(),
      };

      // Update metrics
      const setVolume = newSet.weight * newSet.reps;
      const newMusclesWorked = new Set(musclesWorked);
      if (currentExercise?.primaryMuscles) {
        currentExercise.primaryMuscles.forEach((m) => newMusclesWorked.add(m));
      }
      if (currentExercise?.secondaryMuscles) {
        currentExercise.secondaryMuscles.forEach((m) => newMusclesWorked.add(m));
      }

      set({
        sets: [...sets, newSet],
        currentSetIndex: sets.filter((s) => s.exerciseId === currentExercise?.id).length + 1,
        totalVolume: totalVolume + setVolume,
        totalReps: totalReps + newSet.reps,
        musclesWorked: newMusclesWorked,
        // Estimate calories: ~0.05 cal per pound lifted per rep (rough estimate)
        estimatedCalories: get().estimatedCalories + Math.round(setVolume * 0.002),
      });

      return newSet;
    },

    updateSet: (setId, updates) => {
      set((s) => ({
        sets: s.sets.map((set) => (set.id === setId ? { ...set, ...updates } : set)),
      }));
    },

    deleteSet: (setId) => {
      const setToDelete = get().sets.find((s) => s.id === setId);
      if (!setToDelete) return;

      const volumeToRemove = setToDelete.weight * setToDelete.reps;
      set((s) => ({
        sets: s.sets.filter((set) => set.id !== setId),
        totalVolume: s.totalVolume - volumeToRemove,
        totalReps: s.totalReps - setToDelete.reps,
      }));
    },

    // Get sets for current exercise
    getCurrentExerciseSets: () => {
      const { sets, currentExercise } = get();
      return sets.filter((s) => s.exerciseId === currentExercise?.id);
    },

    // ============================================
    // REST TIMER
    // ============================================
    startRestTimer: (duration) => {
      const { restTimerInterval, defaultRestDuration } = get();

      // Clear existing timer
      if (restTimerInterval) {
        clearInterval(restTimerInterval);
      }

      const timerDuration = duration || defaultRestDuration;
      set({ restTimer: timerDuration, restTimerActive: true });

      const interval = setInterval(() => {
        const current = get().restTimer;
        if (current <= 1) {
          clearInterval(interval);
          set({ restTimer: 0, restTimerActive: false, restTimerInterval: null });
          // Could trigger haptic/notification here
        } else {
          set({ restTimer: current - 1 });
        }
      }, 1000);

      set({ restTimerInterval: interval });
    },

    stopRestTimer: () => {
      const { restTimerInterval } = get();
      if (restTimerInterval) {
        clearInterval(restTimerInterval);
      }
      set({ restTimer: 0, restTimerActive: false, restTimerInterval: null });
    },

    adjustRestTimer: (delta) => {
      set((s) => ({
        restTimer: Math.max(0, s.restTimer + delta),
      }));
    },

    setDefaultRestDuration: (duration) => {
      set({ defaultRestDuration: duration });
    },

    // ============================================
    // COMPUTED VALUES
    // ============================================
    getSessionDuration: () => {
      const { startTime, pausedAt, totalPausedTime, isActive } = get();
      if (!startTime || !isActive) return 0;
      const now = pausedAt || Date.now();
      return now - startTime - totalPausedTime;
    },

    getSessionSummary: () => {
      const state = get();
      return {
        sessionId: state.sessionId,
        duration: state.getSessionDuration(),
        totalSets: state.sets.length,
        totalReps: state.totalReps,
        totalVolume: state.totalVolume,
        estimatedCalories: state.estimatedCalories,
        exercisesCompleted: new Set(state.sets.map((s) => s.exerciseId)).size,
        musclesWorked: Array.from(state.musclesWorked),
        sets: state.sets,
      };
    },

    getProgressForExercise: (exerciseId) => {
      const { sets, targetSets } = get();
      const exerciseSets = sets.filter((s) => s.exerciseId === exerciseId);
      return {
        completed: exerciseSets.length,
        target: targetSets,
        percentage: Math.min(100, (exerciseSets.length / targetSets) * 100),
      };
    },
  }))
);

/**
 * Shorthand hooks for common workout operations
 */
export const useRestTimer = () => {
  const restTimer = useWorkoutSessionStore((s) => s.restTimer);
  const restTimerActive = useWorkoutSessionStore((s) => s.restTimerActive);
  const startRestTimer = useWorkoutSessionStore((s) => s.startRestTimer);
  const stopRestTimer = useWorkoutSessionStore((s) => s.stopRestTimer);
  const adjustRestTimer = useWorkoutSessionStore((s) => s.adjustRestTimer);

  return {
    time: restTimer,
    isActive: restTimerActive,
    start: startRestTimer,
    stop: stopRestTimer,
    adjust: adjustRestTimer,
    formatted: `${Math.floor(restTimer / 60)}:${(restTimer % 60).toString().padStart(2, '0')}`,
  };
};

export const useWorkoutMetrics = () => {
  const totalVolume = useWorkoutSessionStore((s) => s.totalVolume);
  const totalReps = useWorkoutSessionStore((s) => s.totalReps);
  const estimatedCalories = useWorkoutSessionStore((s) => s.estimatedCalories);
  const musclesWorked = useWorkoutSessionStore((s) => s.musclesWorked);
  const sets = useWorkoutSessionStore((s) => s.sets);
  const getSessionDuration = useWorkoutSessionStore((s) => s.getSessionDuration);

  return {
    totalVolume,
    totalReps,
    estimatedCalories,
    musclesWorked: Array.from(musclesWorked),
    totalSets: sets.length,
    duration: getSessionDuration(),
  };
};

export const useCurrentExercise = () => {
  const currentExercise = useWorkoutSessionStore((s) => s.currentExercise);
  const currentExerciseIndex = useWorkoutSessionStore((s) => s.currentExerciseIndex);
  const exercises = useWorkoutSessionStore((s) => s.exercises);
  const nextExercise = useWorkoutSessionStore((s) => s.nextExercise);
  const previousExercise = useWorkoutSessionStore((s) => s.previousExercise);
  const getCurrentExerciseSets = useWorkoutSessionStore((s) => s.getCurrentExerciseSets);

  return {
    exercise: currentExercise,
    index: currentExerciseIndex,
    total: exercises.length,
    hasNext: currentExerciseIndex < exercises.length - 1,
    hasPrevious: currentExerciseIndex > 0,
    next: nextExercise,
    previous: previousExercise,
    sets: getCurrentExerciseSets(),
  };
};

export default useWorkoutSessionStore;
