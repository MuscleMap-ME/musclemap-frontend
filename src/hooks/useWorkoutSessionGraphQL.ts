/**
 * Workout Session GraphQL Hook
 *
 * Provides a complete interface for the real-time workout session logging system.
 * Uses GraphQL mutations for server sync and integrates with the Zustand store
 * for local state management.
 */

import { useCallback, useMemo, useRef } from 'react';
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
  restSeconds: number | null;
  tag: string | null;
  tu: number;
  muscleActivations: MuscleActivation[];
  isPRWeight: boolean;
  isPRReps: boolean;
  isPR1RM: boolean;
  notes: string | null;
  performedAt: string;
}

export interface MuscleActivation {
  muscleId: string;
  muscleName: string;
  activation: number;
  tu: number;
}

export interface MuscleActivationSummary {
  muscleId: string;
  muscleName: string;
  totalTU: number;
  setCount: number;
  percentageOfMax: number | null;
}

export interface SessionPR {
  exerciseId: string;
  exerciseName: string;
  prType: string;
  newValue: number;
  previousValue: number | null;
  improvementPercent: number | null;
  achievedAt: string;
}

export interface WorkoutSession {
  id: string;
  userId: string;
  startedAt: string;
  pausedAt: string | null;
  totalPausedTime: number;
  lastActivityAt: string;
  currentExerciseIndex: number;
  currentSetIndex: number;
  restTimerRemaining: number | null;
  restTimerTotalDuration: number | null;
  restTimerStartedAt: string | null;
  sets: LoggedSet[];
  totalVolume: number;
  totalReps: number;
  musclesWorked: MuscleActivationSummary[];
  sessionPRs: SessionPR[];
  estimatedCalories: number;
  clientVersion: number;
  serverVersion: number;
}

export interface RecoverableSession {
  id: string;
  startedAt: string;
  archivedAt: string;
  archiveReason: string;
  setsLogged: number;
  totalVolume: number;
  musclesWorked: string[];
  canRecover: boolean;
  // Computed fields for UI compatibility
  exerciseCount?: number;
  setCount?: number;
  lastActivityAt?: string;
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
  restSeconds?: number;
  tag?: string;
  notes?: string;
  clientSetId?: string;
}

export interface SessionCompletionResult {
  workout: {
    id: string;
    userId: string;
  };
  session: WorkoutSession;
  totalTU: number;
  totalVolume: number;
  totalSets: number;
  totalReps: number;
  duration: number;
  muscleBreakdown: MuscleActivationSummary[];
  prsAchieved: SessionPR[];
  creditsCharged: number;
  xpEarned: number;
  levelUp: boolean;
  achievements: Array<{
    id: string;
    name: string;
    description: string;
    icon: string;
    rarity: string;
    unlockedAt: string;
  }>;
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
    error: activeSessionError,
  } = useQuery(ACTIVE_WORKOUT_SESSION_QUERY, {
    fetchPolicy: 'network-only',
    notifyOnNetworkStatusChange: true,
    // Don't crash if query fails - just return null
    errorPolicy: 'all',
  });

  const {
    data: recoverableSessionsData,
    loading: loadingRecoverableSessions,
    refetch: refetchRecoverableSessions,
  } = useQuery(RECOVERABLE_SESSIONS_QUERY, {
    fetchPolicy: 'network-only',
    errorPolicy: 'all',
  });

  const [fetchExerciseHistory, { data: exerciseHistoryData, loading: loadingExerciseHistory }] =
    useLazyQuery(EXERCISE_HISTORY_QUERY, { errorPolicy: 'all' });

  const [fetchSubstitutions, { loading: loadingSubstitutions }] =
    useLazyQuery(EXERCISE_SUBSTITUTIONS_QUERY, { errorPolicy: 'all' });

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

  const recoverableSessions: RecoverableSession[] = useMemo(() => {
    const sessions = recoverableSessionsData?.recoverableSessions || [];
    // Map to add UI-compatible fields
    return sessions.map((s: any) => ({
      ...s,
      exerciseCount: s.musclesWorked?.length || 0,
      setCount: s.setsLogged,
      lastActivityAt: s.archivedAt,
    }));
  }, [recoverableSessionsData]);

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
    async (workoutPlan?: any, clientId?: string): Promise<{ success: boolean; sessionId?: string; error?: string }> => {
      try {
        const { data, errors } = await startSessionMutation({
          variables: {
            input: workoutPlan ? { workoutPlan, clientId } : undefined,
          },
        });

        if (errors?.length) {
          return {
            success: false,
            error: errors[0]?.message || 'Failed to start session',
          };
        }

        if (data?.startWorkoutSession?.session) {
          await refetchActiveSession();
          return {
            success: true,
            sessionId: data.startWorkoutSession.session.id,
          };
        }

        return {
          success: false,
          error: 'Failed to start session',
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
        const { data, errors } = await logSetMutation({
          variables: { input },
        });

        if (errors?.length) {
          return {
            success: false,
            error: errors[0]?.message || 'Failed to log set',
          };
        }

        if (data?.logSet) {
          const result = data.logSet;

          // Check for PRs and trigger callbacks
          const newPRs = result.prsAchieved || [];
          for (const pr of newPRs) {
            if (onPRAchievedRef.current) {
              onPRAchievedRef.current(pr);
            }
          }

          // Refetch to get updated session
          await refetchActiveSession();

          return {
            success: true,
            set: result.setLogged,
            prs: newPRs,
          };
        }

        return {
          success: false,
          error: 'Failed to log set',
        };
      } catch (error) {
        console.error('Failed to log set:', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        };
      }
    },
    [logSetMutation, refetchActiveSession]
  );

  /**
   * Update an existing set
   */
  const updateSet = useCallback(
    async (
      setId: string,
      updates: Partial<LogSetInput>
    ): Promise<{ success: boolean; set?: LoggedSet; error?: string }> => {
      try {
        const { data, errors } = await updateSetMutation({
          variables: {
            input: {
              setId,
              ...updates,
            },
          },
        });

        if (errors?.length) {
          return {
            success: false,
            error: errors[0]?.message || 'Failed to update set',
          };
        }

        if (data?.updateSet) {
          await refetchActiveSession();
          return {
            success: true,
            set: data.updateSet,
          };
        }

        return {
          success: false,
          error: 'Failed to update set',
        };
      } catch (error) {
        console.error('Failed to update set:', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        };
      }
    },
    [updateSetMutation, refetchActiveSession]
  );

  /**
   * Delete a set
   */
  const deleteSet = useCallback(
    async (setId: string): Promise<{ success: boolean; error?: string }> => {
      try {
        const { data, errors } = await deleteSetMutation({
          variables: { setId },
        });

        if (errors?.length) {
          return {
            success: false,
            error: errors[0]?.message || 'Failed to delete set',
          };
        }

        if (data?.deleteSet !== undefined) {
          await refetchActiveSession();
          return { success: true };
        }

        return {
          success: false,
          error: 'Failed to delete set',
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
      const { data, errors } = await pauseSessionMutation({
        variables: { sessionId: activeSession.id },
      });

      if (errors?.length) {
        return {
          success: false,
          error: errors[0]?.message || 'Failed to pause session',
        };
      }

      if (data?.pauseWorkoutSession) {
        await refetchActiveSession();
        return { success: true };
      }

      return {
        success: false,
        error: 'Failed to pause session',
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
      const { data, errors } = await resumeSessionMutation({
        variables: { sessionId: activeSession.id },
      });

      if (errors?.length) {
        return {
          success: false,
          error: errors[0]?.message || 'Failed to resume session',
        };
      }

      if (data?.resumeWorkoutSession) {
        await refetchActiveSession();
        return { success: true };
      }

      return {
        success: false,
        error: 'Failed to resume session',
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
    async (notes?: string, isPublic?: boolean): Promise<{ success: boolean; result?: SessionCompletionResult; error?: string }> => {
      if (!activeSession) {
        return {
          success: false,
          error: 'No active session',
        };
      }

      try {
        const { data, errors } = await completeSessionMutation({
          variables: {
            input: {
              sessionId: activeSession.id,
              notes,
              isPublic,
            },
          },
        });

        if (errors?.length) {
          return {
            success: false,
            error: errors[0]?.message || 'Failed to complete session',
          };
        }

        const result = data?.completeWorkoutSession;

        if (result) {
          // Trigger level up callback
          if (result.levelUp && onLevelUpRef.current) {
            // Calculate new level from XP (simplified)
            onLevelUpRef.current(Math.floor(result.xpEarned / 1000) + 1);
          }

          // Trigger completion callback
          if (onWorkoutCompleteRef.current) {
            onWorkoutCompleteRef.current(result);
          }

          // Clear active session
          await refetchActiveSession();

          return {
            success: true,
            result,
          };
        }

        return {
          success: false,
          error: 'Failed to complete session',
        };
      } catch (error) {
        console.error('Failed to complete session:', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        };
      }
    },
    [activeSession, completeSessionMutation, refetchActiveSession]
  );

  /**
   * Abandon the session without saving
   */
  const abandonSession = useCallback(async (reason?: string): Promise<{ success: boolean; error?: string }> => {
    if (!activeSession) {
      return { success: false, error: 'No active session' };
    }

    try {
      const { data, errors } = await abandonSessionMutation({
        variables: { sessionId: activeSession.id, reason },
      });

      if (errors?.length) {
        return {
          success: false,
          error: errors[0]?.message || 'Failed to abandon session',
        };
      }

      if (data?.abandonWorkoutSession !== undefined) {
        await refetchActiveSession();
        return { success: true };
      }

      return {
        success: false,
        error: 'Failed to abandon session',
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
    async (archivedSessionId: string): Promise<{ success: boolean; session?: WorkoutSession; error?: string }> => {
      try {
        const { data, errors } = await recoverSessionMutation({
          variables: { archivedSessionId },
        });

        if (errors?.length) {
          return {
            success: false,
            error: errors[0]?.message || 'Failed to recover session',
          };
        }

        if (data?.recoverWorkoutSession) {
          await refetchActiveSession();
          await refetchRecoverableSessions();
          return {
            success: true,
            session: data.recoverWorkoutSession,
          };
        }

        return {
          success: false,
          error: 'Failed to recover session',
        };
      } catch (error) {
        console.error('Failed to recover session:', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        };
      }
    },
    [recoverSessionMutation, refetchActiveSession, refetchRecoverableSessions]
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
      try {
        const { data } = await fetchSubstitutions({
          variables: {
            exerciseId,
            equipment,
            maxResults: maxResults || 5,
          },
        });

        return data?.exerciseSubstitutions || [];
      } catch (error) {
        console.error('Failed to find substitutes:', error);
        return [];
      }
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
    return Math.floor((elapsed - (activeSession.totalPausedTime * 1000)) / 1000);
  }, [activeSession]);

  const currentExerciseSets = useMemo(() => {
    if (!activeSession?.sets || activeSession.sets.length === 0) return [];
    // Get the last exercise that was logged
    const lastSet = activeSession.sets[activeSession.sets.length - 1];
    if (!lastSet) return [];
    return activeSession.sets.filter(
      (set) => set.exerciseId === lastSet.exerciseId
    );
  }, [activeSession]);

  /**
   * Get sets for a specific exercise (helper function)
   */
  const getSetsForExercise = useCallback(
    (exerciseId: string): LoggedSet[] => {
      if (!activeSession?.sets) return [];
      return activeSession.sets.filter((set) => set.exerciseId === exerciseId);
    },
    [activeSession]
  );

  const totalSets = activeSession?.sets?.length || 0;

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
    getSetsForExercise,
    totalSets,

    // Errors
    errors: {
      activeSession: activeSessionError,
    },

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
