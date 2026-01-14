/**
 * Workout Session Store (Zustand)
 *
 * Manages real-time workout tracking state. Uses selector-based subscriptions
 * so timer updates don't re-render components that only display exercise info.
 *
 * Features:
 * - Set logging with RPE, RIR, and set tags (warmup, working, failure, drop)
 * - 1RM estimation using multiple formulas (Epley, Brzycki, Lombardi)
 * - Rest timer with customizable presets and per-exercise defaults
 * - PR detection and notifications
 * - Volume and metrics tracking
 *
 * @example
 * // Only re-renders when rest timer changes
 * const restTimer = useWorkoutSession((s) => s.restTimer);
 *
 * // Only re-renders when sets change
 * const sets = useWorkoutSession((s) => s.sets);
 */

import { create } from 'zustand';
import { subscribeWithSelector, persist } from 'zustand/middleware';

// ============================================
// 1RM ESTIMATION FORMULAS
// ============================================

/**
 * Calculate estimated 1RM using multiple formulas
 * Returns average of reliable formulas for accuracy
 */
export const calculate1RM = (weight, reps) => {
  if (!weight || !reps || reps < 1 || weight <= 0) return 0;
  if (reps === 1) return weight;
  if (reps > 15) return null; // Too many reps for accurate estimation

  // Epley formula: weight × (1 + reps/30)
  const epley = weight * (1 + reps / 30);

  // Brzycki formula: weight × (36 / (37 - reps))
  const brzycki = weight * (36 / (37 - reps));

  // Lombardi formula: weight × reps^0.10
  const lombardi = weight * Math.pow(reps, 0.10);

  // Average the formulas for more accuracy
  const average = (epley + brzycki + lombardi) / 3;

  return Math.round(average * 10) / 10; // Round to 1 decimal
};

/**
 * Calculate percentage of 1RM
 */
export const get1RMPercentage = (weight, estimated1RM) => {
  if (!estimated1RM || estimated1RM <= 0) return 0;
  return Math.round((weight / estimated1RM) * 100);
};

// ============================================
// SET TAG TYPES
// ============================================
export const SET_TAGS = {
  WARMUP: 'warmup',
  WORKING: 'working',
  FAILURE: 'failure',
  DROP: 'drop',
  CLUSTER: 'cluster',
  AMRAP: 'amrap',
};

// ============================================
// REST TIMER PRESETS
// ============================================
export const REST_PRESETS = [
  { label: '30s', seconds: 30, description: 'Short rest (endurance/circuits)' },
  { label: '60s', seconds: 60, description: 'Moderate rest (hypertrophy)' },
  { label: '90s', seconds: 90, description: 'Standard rest (general training)' },
  { label: '2m', seconds: 120, description: 'Extended rest (strength)' },
  { label: '3m', seconds: 180, description: 'Long rest (heavy compounds)' },
  { label: '5m', seconds: 300, description: 'Full recovery (max strength/powerlifting)' },
];

/**
 * Workout Session Store
 * Handles active workout state with real-time updates
 */
export const useWorkoutSessionStore = create(
  subscribeWithSelector(
    persist(
      (set, get) => ({
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
    exerciseRestDefaults: {}, // { exerciseId: seconds }

    // ============================================
    // WORKOUT METRICS
    // ============================================
    totalVolume: 0, // weight × reps summed
    totalReps: 0,
    estimatedCalories: 0,
    musclesWorked: new Set(),

    // ============================================
    // PERSONAL RECORDS (in-session tracking)
    // ============================================
    sessionPRs: [], // PRs achieved during this session
    exerciseHistory: {}, // { exerciseId: { best1RM, bestWeight, bestVolume } }

    // ============================================
    // WORKOUT COMPLETION CALLBACKS
    // ============================================
    // Callback fired when workout is completed (for celebrations, tips, etc.)
    onWorkoutComplete: null,
    // Callback fired when a PR is achieved (for instant celebration)
    onPRAchieved: null,
    // Callback fired when user levels up (from XP gained in workout)
    onLevelUp: null,

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

    /**
     * Complete workout and trigger celebration callbacks
     * Use this instead of endSession when workout is successfully finished
     * @param {Object} options - Additional data like xpEarned, leveledUp, etc.
     */
    completeWorkout: (options = {}) => {
      const summary = get().getSessionSummary();
      const { onWorkoutComplete, onLevelUp } = get();

      // Build completion data
      const completionData = {
        ...summary,
        xpEarned: options.xpEarned || Math.round(summary.totalVolume * 0.01),
        duration: summary.duration,
        exerciseCount: summary.exercisesCompleted,
        totalSets: summary.totalSets,
        totalVolume: summary.totalVolume,
        prsAchieved: summary.sessionPRs.length,
        musclesWorked: summary.musclesWorked,
        completedAt: Date.now(),
      };

      // Fire workout complete callback (for celebrations, tips)
      if (onWorkoutComplete) {
        try {
          onWorkoutComplete(completionData);
        } catch (err) {
          console.error('Error in onWorkoutComplete callback:', err);
        }
      }

      // Fire level up callback if applicable
      if (options.leveledUp && onLevelUp) {
        try {
          onLevelUp({
            newLevel: options.newLevel,
            xpEarned: completionData.xpEarned,
          });
        } catch (err) {
          console.error('Error in onLevelUp callback:', err);
        }
      }

      // End the session
      get().endSession();

      return completionData;
    },

    // ============================================
    // CALLBACK SETTERS
    // ============================================
    setOnWorkoutComplete: (callback) => set({ onWorkoutComplete: callback }),
    setOnPRAchieved: (callback) => set({ onPRAchieved: callback }),
    setOnLevelUp: (callback) => set({ onLevelUp: callback }),

    /**
     * Register all celebration callbacks at once
     * Useful for Dashboard/App initialization
     */
    registerCelebrationCallbacks: ({ onComplete, onPR, onLevelUp }) => {
      set({
        onWorkoutComplete: onComplete || null,
        onPRAchieved: onPR || null,
        onLevelUp: onLevelUp || null,
      });
    },

    /**
     * Clear all celebration callbacks (for cleanup)
     */
    clearCelebrationCallbacks: () => {
      set({
        onWorkoutComplete: null,
        onPRAchieved: null,
        onLevelUp: null,
      });
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
    // SET LOGGING (Enhanced with tags, RIR, 1RM, PR detection)
    // ============================================
    logSet: ({ weight, reps, rpe, rir, tag, notes }) => {
      const { currentExercise, sets, totalVolume, totalReps, musclesWorked, sessionPRs, exerciseHistory } = get();

      // Calculate estimated 1RM for this set
      const estimated1RM = calculate1RM(weight, reps);

      const newSet = {
        id: `set_${Date.now()}`,
        exerciseId: currentExercise?.id,
        exerciseName: currentExercise?.name,
        weight: weight || 0,
        reps: reps || 0,
        rpe: rpe || null, // Rate of Perceived Exertion (1-10)
        rir: rir !== undefined ? rir : null, // Reps in Reserve (0-5+)
        tag: tag || SET_TAGS.WORKING, // Set type tag
        notes: notes || '',
        estimated1RM: estimated1RM,
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

      // PR Detection - check if this set beats previous bests
      const exerciseId = currentExercise?.id;
      const prevHistory = exerciseHistory[exerciseId] || { best1RM: 0, bestWeight: 0, bestVolume: 0 };
      const newPRs = [];
      const updatedHistory = { ...prevHistory };

      // Check for weight PR (only for working sets, not warmups)
      if (tag !== SET_TAGS.WARMUP && weight > prevHistory.bestWeight) {
        newPRs.push({ type: 'weight', exerciseId, exerciseName: currentExercise?.name, value: weight, previous: prevHistory.bestWeight });
        updatedHistory.bestWeight = weight;
      }

      // Check for 1RM PR
      if (estimated1RM && estimated1RM > prevHistory.best1RM) {
        newPRs.push({ type: '1rm', exerciseId, exerciseName: currentExercise?.name, value: estimated1RM, previous: prevHistory.best1RM });
        updatedHistory.best1RM = estimated1RM;
      }

      // Check for volume PR (single set)
      if (tag !== SET_TAGS.WARMUP && setVolume > prevHistory.bestVolume) {
        newPRs.push({ type: 'volume', exerciseId, exerciseName: currentExercise?.name, value: setVolume, previous: prevHistory.bestVolume });
        updatedHistory.bestVolume = setVolume;
      }

      set({
        sets: [...sets, newSet],
        currentSetIndex: sets.filter((s) => s.exerciseId === currentExercise?.id).length + 1,
        totalVolume: totalVolume + setVolume,
        totalReps: totalReps + newSet.reps,
        musclesWorked: newMusclesWorked,
        estimatedCalories: get().estimatedCalories + Math.round(setVolume * 0.002),
        sessionPRs: [...sessionPRs, ...newPRs],
        exerciseHistory: {
          ...exerciseHistory,
          [exerciseId]: updatedHistory,
        },
      });

      // Fire PR callback if any PRs were achieved
      if (newPRs.length > 0) {
        const { onPRAchieved } = get();
        if (onPRAchieved) {
          try {
            onPRAchieved({
              prs: newPRs,
              exerciseName: currentExercise?.name,
              set: newSet,
            });
          } catch (err) {
            console.error('Error in onPRAchieved callback:', err);
          }
        }
      }

      return { set: newSet, prs: newPRs };
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
    // REST TIMER (Enhanced with presets and per-exercise defaults)
    // ============================================
    startRestTimer: (duration) => {
      const { restTimerInterval, defaultRestDuration, exerciseRestDefaults, currentExercise } = get();

      // Clear existing timer
      if (restTimerInterval) {
        clearInterval(restTimerInterval);
      }

      // Priority: explicit duration > exercise default > global default
      const exerciseDefault = currentExercise?.id ? exerciseRestDefaults[currentExercise.id] : null;
      const timerDuration = duration || exerciseDefault || defaultRestDuration;
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

    // Start timer with a preset
    startRestTimerWithPreset: (presetIndex) => {
      const preset = REST_PRESETS[presetIndex];
      if (preset) {
        get().startRestTimer(preset.seconds);
      }
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

    // Set per-exercise rest duration default
    setExerciseRestDefault: (exerciseId, duration) => {
      set((s) => ({
        exerciseRestDefaults: {
          ...s.exerciseRestDefaults,
          [exerciseId]: duration,
        },
      }));
    },

    // Get rest duration for an exercise (uses exercise default or global default)
    getRestDurationForExercise: (exerciseId) => {
      const { exerciseRestDefaults, defaultRestDuration } = get();
      return exerciseRestDefaults[exerciseId] || defaultRestDuration;
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
      // Calculate best estimated 1RM per exercise
      const exerciseBest1RMs = {};
      state.sets.forEach((s) => {
        if (s.estimated1RM && (!exerciseBest1RMs[s.exerciseId] || s.estimated1RM > exerciseBest1RMs[s.exerciseId])) {
          exerciseBest1RMs[s.exerciseId] = s.estimated1RM;
        }
      });
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
        sessionPRs: state.sessionPRs,
        exerciseBest1RMs,
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

    // Get all PRs achieved in this session
    getSessionPRs: () => {
      return get().sessionPRs;
    },

    // Get exercise history (best lifts)
    getExerciseHistory: (exerciseId) => {
      return get().exerciseHistory[exerciseId] || { best1RM: 0, bestWeight: 0, bestVolume: 0 };
    },

    // Load exercise history from server (call on session start)
    loadExerciseHistory: (history) => {
      set({ exerciseHistory: history });
    },
  }),
  {
    name: 'musclemap-workout-session',
    partialize: (state) => ({
      // Only persist user preferences, not session state
      defaultRestDuration: state.defaultRestDuration,
      exerciseRestDefaults: state.exerciseRestDefaults,
      exerciseHistory: state.exerciseHistory,
    }),
  }
)
)
);

/**
 * Shorthand hooks for common workout operations
 */
export const useRestTimer = () => {
  const restTimer = useWorkoutSessionStore((s) => s.restTimer);
  const restTimerActive = useWorkoutSessionStore((s) => s.restTimerActive);
  const defaultRestDuration = useWorkoutSessionStore((s) => s.defaultRestDuration);
  const startRestTimer = useWorkoutSessionStore((s) => s.startRestTimer);
  const startRestTimerWithPreset = useWorkoutSessionStore((s) => s.startRestTimerWithPreset);
  const stopRestTimer = useWorkoutSessionStore((s) => s.stopRestTimer);
  const adjustRestTimer = useWorkoutSessionStore((s) => s.adjustRestTimer);
  const setDefaultRestDuration = useWorkoutSessionStore((s) => s.setDefaultRestDuration);
  const setExerciseRestDefault = useWorkoutSessionStore((s) => s.setExerciseRestDefault);

  return {
    time: restTimer,
    isActive: restTimerActive,
    defaultDuration: defaultRestDuration,
    presets: REST_PRESETS,
    start: startRestTimer,
    startWithPreset: startRestTimerWithPreset,
    stop: stopRestTimer,
    adjust: adjustRestTimer,
    setDefault: setDefaultRestDuration,
    setExerciseDefault: setExerciseRestDefault,
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

/**
 * Hook for accessing session PRs and exercise history
 */
export const useSessionPRs = () => {
  const sessionPRs = useWorkoutSessionStore((s) => s.sessionPRs);
  const getSessionPRs = useWorkoutSessionStore((s) => s.getSessionPRs);
  const getExerciseHistory = useWorkoutSessionStore((s) => s.getExerciseHistory);
  const loadExerciseHistory = useWorkoutSessionStore((s) => s.loadExerciseHistory);

  return {
    prs: sessionPRs,
    hasPRs: sessionPRs.length > 0,
    prCount: sessionPRs.length,
    getAll: getSessionPRs,
    getExerciseHistory,
    loadHistory: loadExerciseHistory,
  };
};

/**
 * Hook for 1RM calculations and percentage-based training
 */
export const use1RM = () => {
  const exerciseHistory = useWorkoutSessionStore((s) => s.exerciseHistory);

  return {
    calculate: calculate1RM,
    getPercentage: get1RMPercentage,
    getBestForExercise: (exerciseId) => exerciseHistory[exerciseId]?.best1RM || 0,
    // Get suggested weight for target reps based on 1RM
    getSuggestedWeight: (exerciseId, targetReps, targetPercentage = null) => {
      const best1RM = exerciseHistory[exerciseId]?.best1RM;
      if (!best1RM) return null;

      if (targetPercentage) {
        // User wants specific percentage of 1RM
        return Math.round(best1RM * (targetPercentage / 100));
      }

      // Calculate based on rep range (rough percentages)
      // 1 rep = 100%, 5 reps = 87%, 8 reps = 80%, 10 reps = 75%, 12 reps = 70%
      const repPercentages = { 1: 100, 2: 95, 3: 93, 4: 90, 5: 87, 6: 85, 8: 80, 10: 75, 12: 70, 15: 65 };
      const percentage = repPercentages[targetReps] || (100 - (targetReps * 2.5));
      return Math.round(best1RM * (percentage / 100));
    },
  };
};

/**
 * Hook for set logging with tags
 */
export const useSetLogging = () => {
  const logSet = useWorkoutSessionStore((s) => s.logSet);
  const updateSet = useWorkoutSessionStore((s) => s.updateSet);
  const deleteSet = useWorkoutSessionStore((s) => s.deleteSet);
  const sets = useWorkoutSessionStore((s) => s.sets);

  return {
    log: logSet,
    update: updateSet,
    remove: deleteSet,
    sets,
    tags: SET_TAGS,
    // Count sets by tag for current exercise
    getTagCounts: (exerciseId) => {
      const exerciseSets = sets.filter((s) => s.exerciseId === exerciseId);
      return {
        warmup: exerciseSets.filter((s) => s.tag === SET_TAGS.WARMUP).length,
        working: exerciseSets.filter((s) => s.tag === SET_TAGS.WORKING).length,
        failure: exerciseSets.filter((s) => s.tag === SET_TAGS.FAILURE).length,
        drop: exerciseSets.filter((s) => s.tag === SET_TAGS.DROP).length,
        total: exerciseSets.length,
      };
    },
  };
};

/**
 * Hook for registering celebration callbacks
 * Use this in Dashboard or App to connect UI celebrations to workout events
 *
 * @example
 * const { register, clear } = useCelebrationCallbacks();
 *
 * useEffect(() => {
 *   register({
 *     onComplete: (data) => {
 *       showTip('workout_complete');
 *       triggerConfetti();
 *     },
 *     onPR: (data) => showSuccessBurst('New PR!'),
 *     onLevelUp: (data) => showLevelUpCelebration(data.newLevel),
 *   });
 *   return () => clear();
 * }, []);
 */
export const useCelebrationCallbacks = () => {
  const registerCelebrationCallbacks = useWorkoutSessionStore((s) => s.registerCelebrationCallbacks);
  const clearCelebrationCallbacks = useWorkoutSessionStore((s) => s.clearCelebrationCallbacks);
  const setOnWorkoutComplete = useWorkoutSessionStore((s) => s.setOnWorkoutComplete);
  const setOnPRAchieved = useWorkoutSessionStore((s) => s.setOnPRAchieved);
  const setOnLevelUp = useWorkoutSessionStore((s) => s.setOnLevelUp);

  return {
    register: registerCelebrationCallbacks,
    clear: clearCelebrationCallbacks,
    setOnComplete: setOnWorkoutComplete,
    setOnPR: setOnPRAchieved,
    setOnLevelUp: setOnLevelUp,
  };
};

/**
 * Hook for completing workouts with celebration support
 * Wraps the completeWorkout action with convenient helpers
 *
 * @example
 * const { complete, isActive } = useWorkoutCompletion();
 *
 * const handleFinish = async () => {
 *   const result = await complete({ xpEarned: 150, leveledUp: true, newLevel: 5 });
 *   // Callbacks already fired - result contains summary
 * };
 */
export const useWorkoutCompletion = () => {
  const isActive = useWorkoutSessionStore((s) => s.isActive);
  const completeWorkout = useWorkoutSessionStore((s) => s.completeWorkout);
  const endSession = useWorkoutSessionStore((s) => s.endSession);
  const getSessionSummary = useWorkoutSessionStore((s) => s.getSessionSummary);

  return {
    isActive,
    complete: completeWorkout,
    cancel: endSession,
    getSummary: getSessionSummary,
  };
};

/**
 * Hook to check if workout is ready to trigger celebrations
 * Useful for conditional rendering of celebration UI
 */
export const useWorkoutCelebrationState = () => {
  const sessionPRs = useWorkoutSessionStore((s) => s.sessionPRs);
  const isActive = useWorkoutSessionStore((s) => s.isActive);
  const sets = useWorkoutSessionStore((s) => s.sets);

  return {
    hasPendingPRs: sessionPRs.length > 0,
    prCount: sessionPRs.length,
    latestPR: sessionPRs[sessionPRs.length - 1] || null,
    isWorkoutActive: isActive,
    hasCompletedSets: sets.length > 0,
    // Ready to celebrate when workout is active and has completed sets
    readyToCelebrate: isActive && sets.length > 0,
  };
};

export default useWorkoutSessionStore;
