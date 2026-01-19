/**
 * Workout Session Persistence Hook
 *
 * Wraps the workoutSessionStore with automatic persistence to:
 * 1. IndexedDB - For instant recovery on browser refresh
 * 2. Server - For cross-device recovery and backup
 *
 * Use this hook to initialize session persistence on app startup.
 */

import { useEffect, useRef, useCallback } from 'react';
import { useWorkoutSessionStore } from '../store/workoutSessionStore';
import {
  saveSessionToIndexedDB,
  syncSessionToServer,
  recoverSession,
  clearAllSessionPersistence,
  setupVisibilityHandlers,
  WorkoutSession,
} from '../lib/sessionPersistence';

// Debounce timer for auto-save
let autoSaveTimeout: NodeJS.Timeout | null = null;
const AUTO_SAVE_DEBOUNCE_MS = 1000; // Save after 1 second of no changes

/**
 * Extract session data from store state for persistence
 */
function extractSessionData(state: ReturnType<typeof useWorkoutSessionStore.getState>): WorkoutSession | null {
  if (!state.isActive || !state.sessionId) {
    return null;
  }

  return {
    sessionId: state.sessionId,
    isActive: state.isActive,
    startTime: state.startTime || Date.now(),
    pausedAt: state.pausedAt,
    totalPausedTime: state.totalPausedTime,
    workoutPlan: { exercises: state.exercises },
    currentExercise: state.currentExercise,
    currentExerciseIndex: state.currentExerciseIndex,
    currentSetIndex: state.currentSetIndex,
    exercises: state.exercises,
    sets: state.sets,
    totalVolume: state.totalVolume,
    totalReps: state.totalReps,
    estimatedCalories: state.estimatedCalories,
    musclesWorked: Array.from(state.musclesWorked || []),
    sessionPRs: state.sessionPRs,
    restTimer: state.restTimerActive
      ? {
          remaining: state.restTimer,
          totalDuration: state.restTimerTotalDuration,
          startedAt: state.restTimerStartedAt,
        }
      : undefined,
    exerciseGroups: state.exerciseGroups,
    activeGroup: state.activeGroup,
    activeGroupExerciseIndex: state.activeGroupExerciseIndex,
    activeGroupRound: state.activeGroupRound,
    groupSets: state.groupSets,
    clientVersion: (state as unknown as { clientVersion?: number }).clientVersion || 1,
  };
}

/**
 * Restore session data to store
 */
function restoreSessionToStore(session: WorkoutSession): void {
  const store = useWorkoutSessionStore.getState();

  // Use internal setState to restore all session data
  useWorkoutSessionStore.setState({
    isActive: true,
    sessionId: session.sessionId,
    startTime: session.startTime,
    pausedAt: session.pausedAt,
    totalPausedTime: session.totalPausedTime,
    exercises: session.exercises || [],
    currentExercise: session.currentExercise,
    currentExerciseIndex: session.currentExerciseIndex,
    currentSetIndex: session.currentSetIndex,
    sets: session.sets || [],
    totalVolume: session.totalVolume,
    totalReps: session.totalReps,
    estimatedCalories: session.estimatedCalories,
    musclesWorked: new Set(session.musclesWorked || []),
    sessionPRs: session.sessionPRs || [],
    exerciseGroups: session.exerciseGroups || [],
    activeGroup: session.activeGroup || null,
    activeGroupExerciseIndex: session.activeGroupExerciseIndex || 0,
    activeGroupRound: session.activeGroupRound || 1,
    groupSets: session.groupSets || [],
  });

  // Restore rest timer if it was active
  if (session.restTimer?.remaining && session.restTimer.remaining > 0) {
    // Calculate how much time has passed since the timer was saved
    const savedAt = session.restTimer.startedAt || Date.now();
    const elapsed = Math.floor((Date.now() - savedAt) / 1000);
    const remaining = Math.max(0, session.restTimer.remaining - elapsed);

    if (remaining > 0) {
      // Resume timer with adjusted time
      store.startRestTimer(remaining);
    }
  }
}

/**
 * Hook to manage workout session persistence
 *
 * Call this once at the app root level to enable automatic session recovery
 * and persistence.
 *
 * @returns Object with recovery status and manual control functions
 */
export function useWorkoutSessionPersistence() {
  const isRecovering = useRef(false);
  const hasRecovered = useRef(false);
  const cleanupRef = useRef<(() => void) | null>(null);

  // Subscribe to store changes for auto-save
  useEffect(() => {
    // Don't set up persistence during recovery
    if (isRecovering.current) return;

    const unsubscribe = useWorkoutSessionStore.subscribe(
      (state) => ({
        isActive: state.isActive,
        sets: state.sets,
        currentExerciseIndex: state.currentExerciseIndex,
        totalVolume: state.totalVolume,
        pausedAt: state.pausedAt,
      }),
      (current, previous) => {
        // Only save if session is active and something meaningful changed
        if (!current.isActive) return;

        // Skip if nothing important changed
        if (
          current.sets === previous.sets &&
          current.currentExerciseIndex === previous.currentExerciseIndex &&
          current.totalVolume === previous.totalVolume &&
          current.pausedAt === previous.pausedAt
        ) {
          return;
        }

        // Debounced auto-save
        if (autoSaveTimeout) {
          clearTimeout(autoSaveTimeout);
        }

        autoSaveTimeout = setTimeout(async () => {
          const session = extractSessionData(useWorkoutSessionStore.getState());
          if (session) {
            // Save to IndexedDB immediately
            await saveSessionToIndexedDB(session);
            // Sync to server (debounced internally)
            await syncSessionToServer(session);
          }
        }, AUTO_SAVE_DEBOUNCE_MS);
      },
      { equalityFn: (a, b) => JSON.stringify(a) === JSON.stringify(b) }
    );

    // Setup visibility handlers for page leave
    cleanupRef.current = setupVisibilityHandlers(() => {
      return extractSessionData(useWorkoutSessionStore.getState());
    });

    return () => {
      unsubscribe();
      if (autoSaveTimeout) {
        clearTimeout(autoSaveTimeout);
      }
      if (cleanupRef.current) {
        cleanupRef.current();
      }
    };
  }, []);

  // Recovery function
  const attemptRecovery = useCallback(async (): Promise<{
    recovered: boolean;
    source: 'indexeddb' | 'server' | 'none';
    session: WorkoutSession | null;
  }> => {
    if (isRecovering.current || hasRecovered.current) {
      return { recovered: false, source: 'none', session: null };
    }

    isRecovering.current = true;

    try {
      const result = await recoverSession();

      if (result.session) {
        restoreSessionToStore(result.session);
        hasRecovered.current = true;
        return {
          recovered: true,
          source: result.source,
          session: result.session,
        };
      }

      return { recovered: false, source: 'none', session: null };
    } finally {
      isRecovering.current = false;
    }
  }, []);

  // Manual save function
  const saveNow = useCallback(async (): Promise<void> => {
    const session = extractSessionData(useWorkoutSessionStore.getState());
    if (session) {
      await saveSessionToIndexedDB(session);
      await syncSessionToServer(session, true); // Force immediate sync
    }
  }, []);

  // Clear persistence (call when workout is completed or abandoned)
  const clearPersistence = useCallback(
    async (reason: 'completed' | 'abandoned' = 'completed', workoutId?: string): Promise<void> => {
      hasRecovered.current = false;
      await clearAllSessionPersistence(reason, workoutId);
    },
    []
  );

  return {
    attemptRecovery,
    saveNow,
    clearPersistence,
    isRecovering: isRecovering.current,
  };
}

/**
 * Hook to check for recoverable session on app startup
 * Returns the recovered session info if found
 */
export function useSessionRecoveryCheck() {
  const checkPerformed = useRef(false);
  const { attemptRecovery } = useWorkoutSessionPersistence();

  useEffect(() => {
    if (checkPerformed.current) return;
    checkPerformed.current = true;

    // Check for recoverable session on mount
    attemptRecovery().then((result) => {
      if (result.recovered) {
        console.log(`Workout session recovered from ${result.source}`);
        // You could dispatch a toast notification here
      }
    });
  }, [attemptRecovery]);
}

export default useWorkoutSessionPersistence;
