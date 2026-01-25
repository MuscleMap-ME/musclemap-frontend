/**
 * Workout Session Store
 *
 * Manages the state of an active workout session:
 * - Current exercise
 * - Completed sets
 * - Rest timer
 * - Session duration
 * - Credits earned preview
 * - Spirit Animal mood
 */
import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import * as Haptics from 'expo-haptics';

// ============================================================================
// Types
// ============================================================================

export interface Exercise {
  id: string;
  name: string;
  muscleGroups: string[];
  equipment: string[];
  instructions?: string[];
  videoUrl?: string;
}

export interface PrescribedExercise {
  exercise: Exercise;
  sets: number;
  targetReps: number | { min: number; max: number };
  targetWeight?: number;
  restSeconds: number;
  notes?: string;
}

export interface CompletedSet {
  id: string;
  exerciseId: string;
  setNumber: number;
  weight: number;
  reps: number;
  rpe?: number; // Rate of Perceived Exertion (1-10)
  isPR: boolean;
  completedAt: Date;
}

export type SpiritAnimalMood =
  | 'idle'
  | 'encouraging'
  | 'cheering'
  | 'celebrating'
  | 'impressed'
  | 'concerned';

export interface WorkoutSession {
  id: string;
  prescribedExercises: PrescribedExercise[];
  startedAt: Date;
  estimatedDuration: number; // minutes
}

// ============================================================================
// Store
// ============================================================================

interface WorkoutSessionState {
  // Session state
  session: WorkoutSession | null;
  isActive: boolean;
  currentExerciseIndex: number;
  completedSets: CompletedSet[];
  sessionStartTime: Date | null;
  pausedAt: Date | null;

  // Rest timer
  restTimerSeconds: number;
  restTimerTarget: number;
  isRestTimerActive: boolean;
  restTimerIntervalId: NodeJS.Timeout | null;

  // Spirit Animal
  spiritAnimalMood: SpiritAnimalMood;

  // Computed values
  creditsEarnedPreview: number;
  totalVolume: number;
  prsThisSession: number;

  // Actions - Session
  startSession: (session: WorkoutSession) => void;
  endSession: () => { completedSets: CompletedSet[]; duration: number; creditsEarned: number };
  pauseSession: () => void;
  resumeSession: () => void;
  cancelSession: () => void;

  // Actions - Exercises
  goToNextExercise: () => void;
  goToPreviousExercise: () => void;
  goToExercise: (index: number) => void;
  skipExercise: () => void;

  // Actions - Sets
  logSet: (set: Omit<CompletedSet, 'id' | 'completedAt' | 'isPR'>) => void;
  removeSet: (setId: string) => void;
  editSet: (setId: string, updates: Partial<CompletedSet>) => void;

  // Actions - Rest Timer
  startRestTimer: (seconds?: number) => void;
  stopRestTimer: () => void;
  addRestTime: (seconds: number) => void;
  skipRest: () => void;

  // Internal
  _updateMood: () => void;
  _checkForPR: (exerciseId: string, weight: number, reps: number) => boolean;
}

let setIdCounter = 0;
const generateSetId = () => `set-${Date.now()}-${++setIdCounter}`;

export const useWorkoutSessionStore = create<WorkoutSessionState>()(
  subscribeWithSelector((set, get) => ({
    // ========================================================================
    // Initial State
    // ========================================================================
    session: null,
    isActive: false,
    currentExerciseIndex: 0,
    completedSets: [],
    sessionStartTime: null,
    pausedAt: null,

    restTimerSeconds: 0,
    restTimerTarget: 0,
    isRestTimerActive: false,
    restTimerIntervalId: null,

    spiritAnimalMood: 'idle',
    creditsEarnedPreview: 0,
    totalVolume: 0,
    prsThisSession: 0,

    // ========================================================================
    // Session Actions
    // ========================================================================
    startSession: (session) => {
      set({
        session,
        isActive: true,
        currentExerciseIndex: 0,
        completedSets: [],
        sessionStartTime: new Date(),
        pausedAt: null,
        spiritAnimalMood: 'encouraging',
        creditsEarnedPreview: 10, // Base workout credit
        totalVolume: 0,
        prsThisSession: 0,
      });

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    },

    endSession: () => {
      const state = get();
      const duration = state.sessionStartTime
        ? Math.floor((Date.now() - state.sessionStartTime.getTime()) / 1000 / 60)
        : 0;

      // Calculate final credits
      const baseCredits = 10;
      const prBonus = state.prsThisSession * 25;
      const volumeBonus = Math.floor(state.totalVolume / 1000); // 1 credit per 1000 lbs
      const creditsEarned = baseCredits + prBonus + volumeBonus;

      const result = {
        completedSets: state.completedSets,
        duration,
        creditsEarned,
      };

      // Clear rest timer if active
      if (state.restTimerIntervalId) {
        clearInterval(state.restTimerIntervalId);
      }

      // Reset state
      set({
        session: null,
        isActive: false,
        currentExerciseIndex: 0,
        completedSets: [],
        sessionStartTime: null,
        pausedAt: null,
        restTimerSeconds: 0,
        restTimerTarget: 0,
        isRestTimerActive: false,
        restTimerIntervalId: null,
        spiritAnimalMood: 'celebrating',
        creditsEarnedPreview: 0,
        totalVolume: 0,
        prsThisSession: 0,
      });

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      return result;
    },

    pauseSession: () => {
      const { restTimerIntervalId } = get();
      if (restTimerIntervalId) {
        clearInterval(restTimerIntervalId);
      }
      set({
        pausedAt: new Date(),
        isRestTimerActive: false,
        restTimerIntervalId: null,
      });
    },

    resumeSession: () => {
      set({ pausedAt: null });
    },

    cancelSession: () => {
      const { restTimerIntervalId } = get();
      if (restTimerIntervalId) {
        clearInterval(restTimerIntervalId);
      }
      set({
        session: null,
        isActive: false,
        currentExerciseIndex: 0,
        completedSets: [],
        sessionStartTime: null,
        pausedAt: null,
        restTimerSeconds: 0,
        restTimerTarget: 0,
        isRestTimerActive: false,
        restTimerIntervalId: null,
        spiritAnimalMood: 'idle',
        creditsEarnedPreview: 0,
        totalVolume: 0,
        prsThisSession: 0,
      });
    },

    // ========================================================================
    // Exercise Navigation
    // ========================================================================
    goToNextExercise: () => {
      const { session, currentExerciseIndex } = get();
      if (session && currentExerciseIndex < session.prescribedExercises.length - 1) {
        set({ currentExerciseIndex: currentExerciseIndex + 1 });
        get()._updateMood();
      }
    },

    goToPreviousExercise: () => {
      const { currentExerciseIndex } = get();
      if (currentExerciseIndex > 0) {
        set({ currentExerciseIndex: currentExerciseIndex - 1 });
      }
    },

    goToExercise: (index) => {
      const { session } = get();
      if (session && index >= 0 && index < session.prescribedExercises.length) {
        set({ currentExerciseIndex: index });
      }
    },

    skipExercise: () => {
      get().goToNextExercise();
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    },

    // ========================================================================
    // Set Logging
    // ========================================================================
    logSet: (setData) => {
      const isPR = get()._checkForPR(setData.exerciseId, setData.weight, setData.reps);

      const newSet: CompletedSet = {
        ...setData,
        id: generateSetId(),
        isPR,
        completedAt: new Date(),
      };

      const volume = setData.weight * setData.reps;

      set((state) => ({
        completedSets: [...state.completedSets, newSet],
        totalVolume: state.totalVolume + volume,
        prsThisSession: isPR ? state.prsThisSession + 1 : state.prsThisSession,
        creditsEarnedPreview: state.creditsEarnedPreview + (isPR ? 25 : 0) + Math.floor(volume / 1000),
      }));

      // Trigger haptic and mood update
      if (isPR) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        set({ spiritAnimalMood: 'impressed' });
        setTimeout(() => get()._updateMood(), 3000);
      } else {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        get()._updateMood();
      }

      // Auto-start rest timer
      const { session, currentExerciseIndex } = get();
      if (session) {
        const currentExercise = session.prescribedExercises[currentExerciseIndex];
        if (currentExercise) {
          get().startRestTimer(currentExercise.restSeconds);
        }
      }
    },

    removeSet: (setId) => {
      set((state) => {
        const setToRemove = state.completedSets.find((s) => s.id === setId);
        if (!setToRemove) return state;

        const volume = setToRemove.weight * setToRemove.reps;
        return {
          completedSets: state.completedSets.filter((s) => s.id !== setId),
          totalVolume: state.totalVolume - volume,
          prsThisSession: setToRemove.isPR ? state.prsThisSession - 1 : state.prsThisSession,
        };
      });
    },

    editSet: (setId, updates) => {
      set((state) => ({
        completedSets: state.completedSets.map((s) =>
          s.id === setId ? { ...s, ...updates } : s,
        ),
      }));
    },

    // ========================================================================
    // Rest Timer
    // ========================================================================
    startRestTimer: (seconds) => {
      const { restTimerIntervalId, session, currentExerciseIndex } = get();

      // Clear existing timer
      if (restTimerIntervalId) {
        clearInterval(restTimerIntervalId);
      }

      // Determine target seconds
      const targetSeconds =
        seconds ??
        session?.prescribedExercises[currentExerciseIndex]?.restSeconds ??
        90;

      const intervalId = setInterval(() => {
        const { restTimerSeconds, isRestTimerActive } = get();
        if (!isRestTimerActive) return;

        if (restTimerSeconds >= get().restTimerTarget) {
          // Timer complete
          get().stopRestTimer();
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          set({ spiritAnimalMood: 'encouraging' });
        } else {
          set({ restTimerSeconds: restTimerSeconds + 1 });
        }
      }, 1000);

      set({
        restTimerSeconds: 0,
        restTimerTarget: targetSeconds,
        isRestTimerActive: true,
        restTimerIntervalId: intervalId,
        spiritAnimalMood: 'idle',
      });
    },

    stopRestTimer: () => {
      const { restTimerIntervalId } = get();
      if (restTimerIntervalId) {
        clearInterval(restTimerIntervalId);
      }
      set({
        isRestTimerActive: false,
        restTimerIntervalId: null,
      });
    },

    addRestTime: (seconds) => {
      set((state) => ({
        restTimerTarget: state.restTimerTarget + seconds,
      }));
    },

    skipRest: () => {
      get().stopRestTimer();
      set({ restTimerSeconds: 0, restTimerTarget: 0 });
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    },

    // ========================================================================
    // Internal Methods
    // ========================================================================
    _updateMood: () => {
      const { completedSets, session, currentExerciseIndex } = get();

      if (!session) {
        set({ spiritAnimalMood: 'idle' });
        return;
      }

      const currentExercise = session.prescribedExercises[currentExerciseIndex];
      if (!currentExercise) return;

      const setsForExercise = completedSets.filter(
        (s) => s.exerciseId === currentExercise.exercise.id,
      );

      // Determine mood based on progress
      if (setsForExercise.length >= currentExercise.sets) {
        set({ spiritAnimalMood: 'cheering' }); // Exercise complete!
      } else if (setsForExercise.length > 0) {
        set({ spiritAnimalMood: 'encouraging' }); // In progress
      } else {
        set({ spiritAnimalMood: 'idle' }); // Not started
      }
    },

    _checkForPR: (exerciseId, weight, reps) => {
      // TODO: Compare against historical data from Apollo cache
      // For now, always return false (will be implemented with Apollo integration)
      return false;
    },
  })),
);

// ============================================================================
// Convenience Hooks
// ============================================================================

/**
 * Hook for rest timer state and controls
 */
export function useRestTimer() {
  const seconds = useWorkoutSessionStore((s) => s.restTimerSeconds);
  const target = useWorkoutSessionStore((s) => s.restTimerTarget);
  const isActive = useWorkoutSessionStore((s) => s.isRestTimerActive);
  const start = useWorkoutSessionStore((s) => s.startRestTimer);
  const stop = useWorkoutSessionStore((s) => s.stopRestTimer);
  const addTime = useWorkoutSessionStore((s) => s.addRestTime);
  const skip = useWorkoutSessionStore((s) => s.skipRest);

  return {
    seconds,
    target,
    remaining: Math.max(0, target - seconds),
    progress: target > 0 ? seconds / target : 0,
    isActive,
    isComplete: seconds >= target && target > 0,
    start,
    stop,
    addTime,
    skip,
  };
}

/**
 * Hook for current exercise state
 */
export function useCurrentExercise() {
  const session = useWorkoutSessionStore((s) => s.session);
  const currentIndex = useWorkoutSessionStore((s) => s.currentExerciseIndex);
  const completedSets = useWorkoutSessionStore((s) => s.completedSets);
  const goToNext = useWorkoutSessionStore((s) => s.goToNextExercise);
  const goToPrevious = useWorkoutSessionStore((s) => s.goToPreviousExercise);
  const skip = useWorkoutSessionStore((s) => s.skipExercise);

  const currentExercise = session?.prescribedExercises[currentIndex] ?? null;
  const setsCompleted = currentExercise
    ? completedSets.filter((s) => s.exerciseId === currentExercise.exercise.id).length
    : 0;

  return {
    exercise: currentExercise,
    index: currentIndex,
    total: session?.prescribedExercises.length ?? 0,
    setsCompleted,
    setsRemaining: currentExercise ? currentExercise.sets - setsCompleted : 0,
    isComplete: currentExercise ? setsCompleted >= currentExercise.sets : false,
    goToNext,
    goToPrevious,
    skip,
  };
}

/**
 * Hook for workout session metrics
 */
export function useWorkoutMetrics() {
  const totalVolume = useWorkoutSessionStore((s) => s.totalVolume);
  const prsThisSession = useWorkoutSessionStore((s) => s.prsThisSession);
  const creditsPreview = useWorkoutSessionStore((s) => s.creditsEarnedPreview);
  const sessionStartTime = useWorkoutSessionStore((s) => s.sessionStartTime);
  const completedSets = useWorkoutSessionStore((s) => s.completedSets);
  const session = useWorkoutSessionStore((s) => s.session);

  const totalSets = session?.prescribedExercises.reduce((sum, e) => sum + e.sets, 0) ?? 0;
  const completedSetsCount = completedSets.length;

  return {
    totalVolume,
    prsThisSession,
    creditsPreview,
    duration: sessionStartTime
      ? Math.floor((Date.now() - sessionStartTime.getTime()) / 1000 / 60)
      : 0,
    progress: totalSets > 0 ? completedSetsCount / totalSets : 0,
    setsCompleted: completedSetsCount,
    setsTotal: totalSets,
  };
}
