/**
 * Workout Session GraphQL Hook
 *
 * Provides a complete interface for the real-time workout session logging system.
 * Uses GraphQL mutations for server sync and integrates with the Zustand store
 * for local state management.
 */

import { useCallback, useMemo, useRef, useEffect } from 'react';
import { useMutation, useQuery, useLazyQuery } from '@apollo/client/react';
import {
  ACTIVE_WORKOUT_SESSION_QUERY,
  RECOVERABLE_SESSIONS_QUERY,
  EXERCISE_HISTORY_QUERY,
  EXERCISE_SUBSTITUTIONS_QUERY,
  START_WORKOUT_SESSION_MUTATION,
  LOG_SET_MUTATION,
  UPDATE_SET_MUTATION,
  DELETE_SET_MUTATION,
  PAUSE_WORKOUT_SESSION_MUTATION,
  RESUME_WORKOUT_SESSION_MUTATION,
  COMPLETE_WORKOUT_SESSION_MUTATION,
  ABANDON_WORKOUT_SESSION_MUTATION,
  RECOVER_WORKOUT_SESSION_MUTATION,
} from '../graphql';

// ============================================
// TYPES
// ============================================

export interface LoggedSet {
  id: string;
  exerciseId: string;
  exerciseName: string;
  setNumber: number;
  reps: number | null;
  weightKg: number | null;
  rpe: number | null;
  rir: number | null;
  durationSeconds: number | null;
  tu: number;
  muscleActivations: MuscleActivation[];
  isPRWeight: boolean;
  isPR1RM: boolean;
  isPRVolume: boolean;
  notes: string | null;
  performedAt: string;
}

export interface MuscleActivation {
  muscleId: string;
  muscleName: string;
  activationPercent: number;
  tu: number;
}

export interface MuscleActivationSummary {
  muscleId: string;
  muscleName: string;
  totalTU: number;
  setCount: number;
}

export interface SessionPR {
  exerciseId: string;
  exerciseName: string;
  prType: 'weight' | '1rm' | 'volume';
  value: number;
  previousValue: number | null;
}

export interface WorkoutSession {
  id: string;
  userId: string;
  startedAt: string;
  pausedAt: string | null;
  totalPausedTime: number;
  currentExerciseId: string | null;
  restTimerEndsAt: string | null;
  sets: LoggedSet[];
  totalVolume: number;
  totalTU: number;
  musclesWorked: MuscleActivationSummary[];
  sessionPRs: SessionPR[];
  estimatedCalories: number;
  exerciseCount: number;
}

export interface RecoverableSession {
  id: string;
  startedAt: string;
  lastActivityAt: string;
  exerciseCount: number;
  setCount: number;
  totalVolume: number;
}

export interface ExerciseSubstitution {
  exercise: {
    id: string;
    name: string;
    description: string;
    primaryMuscles: string[];
    secondaryMuscles: string[];
    equipment: string[];
    difficulty: string;
    imageUrl: string | null;
  };
  similarityScore: number;
  matchedMuscles: string[];
  missingMuscles: string[];
}

export interface ExerciseHistory {
  exerciseId: string;
  exerciseName: string;
  bestWeight: number | null;
  best1RM: number | null;
  bestVolume: number | null;
  lastPerformedAt: string | null;
  totalSessions: number;
}

export interface LogSetInput {
  sessionId: string;
  exerciseId: string;
  setNumber: number;
  reps?: number;
  weightKg?: number;
  rpe?: number;
  rir?: number;
  durationSeconds?: number;
  notes?: string;
  clientSetId?: string;
}

export interface SessionCompletionResult {
  success: boolean;
  workout: {
    id: string;
    totalTU: number;
  } | null;
  tuEarned: number;
  xpEarned: number;
  characterStats: {
    level: number;
    xp: number;
    xpToNextLevel: number;
    strength: number;
    endurance: number;
  } | null;
  levelUp: boolean;
  newLevel: number | null;
  achievements: Array<{
    id: string;
    name: string;
    description: string;
    icon: string;
    rarity: string;
  }>;
  sessionSummary: {
    duration: number;
    totalSets: number;
    totalVolume: number;
    totalTU: number;
    exerciseCount: number;
    musclesWorked: MuscleActivationSummary[];
    prs: SessionPR[];
  } | null;
  error: string | null;
}

// ============================================
// HOOK
// ============================================

export function useWorkoutSessionGraphQL() {
  // Track callbacks for PR celebrations
  const onPRAchievedRef = useRef<((pr: SessionPR) => void) | null>(null);
  const onLevelUpRef = useRef<((newLevel: number) => void) | null>(null);
  const onWorkoutCompleteRef = useRef<((result: SessionCompletionResult) => void) | null>(null);

  // ============================================
  // QUERIES
  // ============================================

  const {
    data: activeSessionData,
    loading: loadingActiveSession,
    refetch: refetchActiveSession,
  } = useQuery(ACTIVE_WORKOUT_SESSION_QUERY, {
    fetchPolicy: 'network-only',
    notifyOnNetworkStatusChange: true,
  });

  const {
    data: recoverableSessionsData,
    loading: loadingRecoverableSessions,
    refetch: refetchRecoverableSessions,
  } = useQuery(RECOVERABLE_SESSIONS_QUERY, {
    fetchPolicy: 'network-only',
  });

  const [fetchExerciseHistory, { data: exerciseHistoryData, loading: loadingExerciseHistory }] =
    useLazyQuery(EXERCISE_HISTORY_QUERY);

  const [fetchSubstitutions, { data: substitutionsData, loading: loadingSubstitutions }] =
    useLazyQuery(EXERCISE_SUBSTITUTIONS_QUERY);

  // ============================================
  // MUTATIONS
  // ============================================

  const [startSessionMutation, { loading: startingSession }] = useMutation(
    START_WORKOUT_SESSION_MUTATION
  );

  const [logSetMutation, { loading: loggingSet }] = useMutation(LOG_SET_MUTATION);

  const [updateSetMutation, { loading: updatingSet }] = useMutation(UPDATE_SET_MUTATION);

  const [deleteSetMutation, { loading: deletingSet }] = useMutation(DELETE_SET_MUTATION);

  const [pauseSessionMutation, { loading: pausingSession }] = useMutation(
    PAUSE_WORKOUT_SESSION_MUTATION
  );

  const [resumeSessionMutation, { loading: resumingSession }] = useMutation(
    RESUME_WORKOUT_SESSION_MUTATION
  );

  const [completeSessionMutation, { loading: completingSession }] = useMutation(
    COMPLETE_WORKOUT_SESSION_MUTATION
  );

  const [abandonSessionMutation, { loading: abandoningSession }] = useMutation(
    ABANDON_WORKOUT_SESSION_MUTATION
  );

  const [recoverSessionMutation, { loading: recoveringSession }] = useMutation(
    RECOVER_WORKOUT_SESSION_MUTATION
  );

  // ============================================
  // DERIVED STATE
  // ============================================

  const activeSession: WorkoutSession | null = useMemo(
    () => activeSessionData?.activeWorkoutSession || null,
    [activeSessionData]
  );

  const recoverableSessions: RecoverableSession[] = useMemo(
    () => recoverableSessionsData?.recoverableSessions || [],
    [recoverableSessionsData]
  );

  const exerciseHistory: Record<string, ExerciseHistory> = useMemo(() => {
    const history: Record<string, ExerciseHistory> = {};
    if (exerciseHistoryData?.exerciseHistory) {
      for (const entry of exerciseHistoryData.exerciseHistory) {
        history[entry.exerciseId] = entry;
      }
    }
    return history;
  }, [exerciseHistoryData]);

  const isSessionActive = !!activeSession;
  const isPaused = !!activeSession?.pausedAt;

  // ============================================
  // ACTIONS
  // ============================================

  /**
   * Start a new workout session
   */
  const startSession = useCallback(
    async (prescriptionId?: string): Promise<{ success: boolean; sessionId?: string; error?: string }> => {
      try {
        const { data } = await startSessionMutation({
          variables: {
            input: { prescriptionId },
          },
        });

        if (data?.startWorkoutSession?.success) {
          await refetchActiveSession();
          return {
            success: true,
            sessionId: data.startWorkoutSession.session?.id,
          };
        }

        return {
          success: false,
          error: data?.startWorkoutSession?.error || 'Failed to start session',
        };
      } catch (error) {
        console.error('Failed to start workout session:', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        };
      }
    },
    [startSessionMutation, refetchActiveSession]
  );

  /**
   * Log a set during the workout
   */
  const logSet = useCallback(
    async (input: LogSetInput): Promise<{ success: boolean; set?: LoggedSet; prs?: SessionPR[]; error?: string }> => {
      try {
        const { data } = await logSetMutation({
          variables: { input },
          optimisticResponse: {
            logSet: {
              __typename: 'LogSetResult',
              success: true,
              set: {
                __typename: 'LoggedSet',
                id: input.clientSetId || `temp-${Date.now()}`,
                exerciseId: input.exerciseId,
                exerciseName: '',
                setNumber: input.setNumber,
                reps: input.reps || null,
                weightKg: input.weightKg || null,
                rpe: input.rpe || null,
                rir: input.rir || null,
                durationSeconds: input.durationSeconds || null,
                tu: 0,
                muscleActivations: [],
                isPRWeight: false,
                isPR1RM: false,
                isPRVolume: false,
                notes: input.notes || null,
                performedAt: new Date().toISOString(),
              },
              sessionUpdate: null,
              error: null,
            },
          },
        });

        if (data?.logSet?.success) {
          // Check for PRs and trigger callbacks
          const newPRs = data.logSet.sessionUpdate?.sessionPRs || [];
          for (const pr of newPRs) {
            if (onPRAchievedRef.current) {
              onPRAchievedRef.current(pr);
            }
          }

          return {
            success: true,
            set: data.logSet.set,
            prs: newPRs,
          };
        }

        return {
          success: false,
          error: data?.logSet?.error || 'Failed to log set',
        };
      } catch (error) {
        console.error('Failed to log set:', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        };
      }
    },
    [logSetMutation]
  );

  /**
   * Update an existing set
   */
  const updateSet = useCallback(
    async (
      sessionId: string,
      setId: string,
      updates: Partial<LogSetInput>
    ): Promise<{ success: boolean; set?: LoggedSet; error?: string }> => {
      try {
        const { data } = await updateSetMutation({
          variables: {
            input: {
              sessionId,
              setId,
              ...updates,
            },
          },
        });

        if (data?.updateSet?.success) {
          return {
            success: true,
            set: data.updateSet.set,
          };
        }

        return {
          success: false,
          error: data?.updateSet?.error || 'Failed to update set',
        };
      } catch (error) {
        console.error('Failed to update set:', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        };
      }
    },
    [updateSetMutation]
  );

  /**
   * Delete a set
   */
  const deleteSet = useCallback(
    async (sessionId: string, setId: string): Promise<{ success: boolean; error?: string }> => {
      try {
        const { data } = await deleteSetMutation({
          variables: { sessionId, setId },
        });

        if (data?.deleteSet?.success) {
          await refetchActiveSession();
          return { success: true };
        }

        return {
          success: false,
          error: data?.deleteSet?.error || 'Failed to delete set',
        };
      } catch (error) {
        console.error('Failed to delete set:', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        };
      }
    },
    [deleteSetMutation, refetchActiveSession]
  );

  /**
   * Pause the session
   */
  const pauseSession = useCallback(async (): Promise<{ success: boolean; error?: string }> => {
    if (!activeSession) {
      return { success: false, error: 'No active session' };
    }

    try {
      const { data } = await pauseSessionMutation({
        variables: { sessionId: activeSession.id },
      });

      if (data?.pauseWorkoutSession?.success) {
        await refetchActiveSession();
        return { success: true };
      }

      return {
        success: false,
        error: data?.pauseWorkoutSession?.error || 'Failed to pause session',
      };
    } catch (error) {
      console.error('Failed to pause session:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }, [activeSession, pauseSessionMutation, refetchActiveSession]);

  /**
   * Resume a paused session
   */
  const resumeSession = useCallback(async (): Promise<{ success: boolean; error?: string }> => {
    if (!activeSession) {
      return { success: false, error: 'No active session' };
    }

    try {
      const { data } = await resumeSessionMutation({
        variables: { sessionId: activeSession.id },
      });

      if (data?.resumeWorkoutSession?.success) {
        await refetchActiveSession();
        return { success: true };
      }

      return {
        success: false,
        error: data?.resumeWorkoutSession?.error || 'Failed to resume session',
      };
    } catch (error) {
      console.error('Failed to resume session:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }, [activeSession, resumeSessionMutation, refetchActiveSession]);

  /**
   * Complete the workout session
   */
  const completeSession = useCallback(
    async (notes?: string): Promise<SessionCompletionResult> => {
      if (!activeSession) {
        return {
          success: false,
          workout: null,
          tuEarned: 0,
          xpEarned: 0,
          characterStats: null,
          levelUp: false,
          newLevel: null,
          achievements: [],
          sessionSummary: null,
          error: 'No active session',
        };
      }

      try {
        const { data } = await completeSessionMutation({
          variables: {
            input: {
              sessionId: activeSession.id,
              notes,
            },
          },
        });

        const result = data?.completeWorkoutSession;

        if (result?.success) {
          // Trigger level up callback
          if (result.levelUp && result.newLevel && onLevelUpRef.current) {
            onLevelUpRef.current(result.newLevel);
          }

          // Trigger completion callback
          if (onWorkoutCompleteRef.current) {
            onWorkoutCompleteRef.current(result);
          }

          // Clear active session
          await refetchActiveSession();

          return result;
        }

        return {
          success: false,
          workout: null,
          tuEarned: 0,
          xpEarned: 0,
          characterStats: null,
          levelUp: false,
          newLevel: null,
          achievements: [],
          sessionSummary: null,
          error: result?.error || 'Failed to complete session',
        };
      } catch (error) {
        console.error('Failed to complete session:', error);
        return {
          success: false,
          workout: null,
          tuEarned: 0,
          xpEarned: 0,
          characterStats: null,
          levelUp: false,
          newLevel: null,
          achievements: [],
          sessionSummary: null,
          error: error instanceof Error ? error.message : 'Unknown error',
        };
      }
    },
    [activeSession, completeSessionMutation, refetchActiveSession]
  );

  /**
   * Abandon the session without saving
   */
  const abandonSession = useCallback(async (): Promise<{ success: boolean; error?: string }> => {
    if (!activeSession) {
      return { success: false, error: 'No active session' };
    }

    try {
      const { data } = await abandonSessionMutation({
        variables: { sessionId: activeSession.id },
      });

      if (data?.abandonWorkoutSession?.success) {
        await refetchActiveSession();
        return { success: true };
      }

      return {
        success: false,
        error: data?.abandonWorkoutSession?.error || 'Failed to abandon session',
      };
    } catch (error) {
      console.error('Failed to abandon session:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }, [activeSession, abandonSessionMutation, refetchActiveSession]);

  /**
   * Recover a previous session
   */
  const recoverSession = useCallback(
    async (sessionId: string): Promise<{ success: boolean; session?: WorkoutSession; error?: string }> => {
      try {
        const { data } = await recoverSessionMutation({
          variables: { sessionId },
        });

        if (data?.recoverWorkoutSession?.success) {
          await refetchActiveSession();
          return {
            success: true,
            session: data.recoverWorkoutSession.session,
          };
        }

        return {
          success: false,
          error: data?.recoverWorkoutSession?.error || 'Failed to recover session',
        };
      } catch (error) {
        console.error('Failed to recover session:', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        };
      }
    },
    [recoverSessionMutation, refetchActiveSession]
  );

  /**
   * Load exercise history for PR detection
   */
  const loadExerciseHistory = useCallback(
    async (exerciseIds: string[]): Promise<void> => {
      if (exerciseIds.length === 0) return;

      await fetchExerciseHistory({
        variables: { exerciseIds },
      });
    },
    [fetchExerciseHistory]
  );

  /**
   * Find substitute exercises
   */
  const findSubstitutes = useCallback(
    async (
      exerciseId: string,
      equipment?: string[],
      maxResults?: number
    ): Promise<ExerciseSubstitution[]> => {
      const { data } = await fetchSubstitutions({
        variables: {
          exerciseId,
          equipment,
          maxResults: maxResults || 5,
        },
      });

      return data?.exerciseSubstitutions || [];
    },
    [fetchSubstitutions]
  );

  /**
   * Register callbacks for session events
   */
  const registerCallbacks = useCallback(
    (callbacks: {
      onPRAchieved?: (pr: SessionPR) => void;
      onLevelUp?: (newLevel: number) => void;
      onWorkoutComplete?: (result: SessionCompletionResult) => void;
    }) => {
      if (callbacks.onPRAchieved) onPRAchievedRef.current = callbacks.onPRAchieved;
      if (callbacks.onLevelUp) onLevelUpRef.current = callbacks.onLevelUp;
      if (callbacks.onWorkoutComplete) onWorkoutCompleteRef.current = callbacks.onWorkoutComplete;
    },
    []
  );

  // ============================================
  // COMPUTED VALUES
  // ============================================

  const sessionDuration = useMemo(() => {
    if (!activeSession) return 0;
    const startTime = new Date(activeSession.startedAt).getTime();
    const now = Date.now();
    const elapsed = now - startTime;
    return Math.floor((elapsed - activeSession.totalPausedTime) / 1000);
  }, [activeSession]);

  const currentExerciseSets = useMemo(() => {
    if (!activeSession?.currentExerciseId) return [];
    return activeSession.sets.filter(
      (set) => set.exerciseId === activeSession.currentExerciseId
    );
  }, [activeSession]);

  const totalSets = activeSession?.sets.length || 0;

  // ============================================
  // RETURN
  // ============================================

  return {
    // State
    activeSession,
    isSessionActive,
    isPaused,
    recoverableSessions,
    exerciseHistory,
    sessionDuration,
    currentExerciseSets,
    totalSets,

    // Loading states
    loading: {
      activeSession: loadingActiveSession,
      recoverableSessions: loadingRecoverableSessions,
      exerciseHistory: loadingExerciseHistory,
      substitutions: loadingSubstitutions,
      startingSession,
      loggingSet,
      updatingSet,
      deletingSet,
      pausingSession,
      resumingSession,
      completingSession,
      abandoningSession,
      recoveringSession,
    },

    // Actions
    startSession,
    logSet,
    updateSet,
    deleteSet,
    pauseSession,
    resumeSession,
    completeSession,
    abandonSession,
    recoverSession,
    loadExerciseHistory,
    findSubstitutes,
    registerCallbacks,
    refetchActiveSession,
    refetchRecoverableSessions,
  };
}

export default useWorkoutSessionGraphQL;
