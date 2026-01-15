/**
 * useWorkoutMode Hook
 *
 * Manages fullscreen workout mode state including:
 * - Screen wake lock to prevent sleep
 * - Swipe navigation between exercises (left/right to change, up to log)
 * - Voice input state
 * - Auto-rest timer after set logging
 * - Fullscreen mode management
 * - Keyboard shortcuts
 * - Celebration triggers
 */

import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { haptic } from '../../utils/haptics';
import {
  useWorkoutSessionStore,
  useCurrentExercise,
  useRestTimer,
  useSetLogging,
  useWorkoutMetrics,
  useSessionPRs,
} from '../../store/workoutSessionStore';

// Swipe thresholds
const SWIPE_HORIZONTAL_THRESHOLD = 50;
const SWIPE_VERTICAL_THRESHOLD = 80;
const SWIPE_VELOCITY_THRESHOLD = 300;

/**
 * Hook for managing fullscreen workout mode
 *
 * @param {Object} options
 * @param {Object} options.workout - The workout data
 * @param {Function} options.onComplete - Callback when workout is completed
 * @param {Function} options.onClose - Callback when workout mode is closed
 * @returns {Object} Workout mode state and actions
 */
export function useWorkoutMode({ workout, onComplete, onClose }) {
  // Wake lock reference
  const wakeLockRef = useRef(null);

  // Voice input state
  const [isListening, setIsListening] = useState(false);
  const [voiceTranscript, setVoiceTranscript] = useState('');
  const [voiceError, setVoiceError] = useState(null);

  // Local UI state
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [restDuration, setRestDuration] = useState(90);
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Store hooks
  const startSession = useWorkoutSessionStore((s) => s.startSession);
  const endSession = useWorkoutSessionStore((s) => s.endSession);
  const completeWorkout = useWorkoutSessionStore((s) => s.completeWorkout);
  const isActive = useWorkoutSessionStore((s) => s.isActive);
  const pauseSession = useWorkoutSessionStore((s) => s.pauseSession);
  const resumeSession = useWorkoutSessionStore((s) => s.resumeSession);
  const pausedAt = useWorkoutSessionStore((s) => s.pausedAt);

  // Current exercise hooks
  const {
    exercise: currentExercise,
    index: currentExerciseIndex,
    total: totalExercises,
    hasNext,
    hasPrevious,
    next: goToNextExercise,
    previous: goToPreviousExercise,
    sets: currentExerciseSets,
  } = useCurrentExercise();

  // Rest timer hooks
  const restTimer = useRestTimer();

  // Set logging hooks
  const setLogging = useSetLogging();

  // Workout metrics hooks
  const metrics = useWorkoutMetrics();

  // PR tracking
  const { prs: sessionPRs, hasPRs } = useSessionPRs();

  // ============================================
  // WAKE LOCK MANAGEMENT
  // ============================================

  /**
   * Request wake lock to prevent screen sleep during workout
   */
  const requestWakeLock = useCallback(async () => {
    if ('wakeLock' in navigator) {
      try {
        wakeLockRef.current = await navigator.wakeLock.request('screen');
        wakeLockRef.current.addEventListener('release', () => {
          // Wake lock was released (e.g., tab became inactive)
        });
      } catch (err) {
        // Wake lock request failed (e.g., low battery)
        console.warn('Wake lock failed:', err.message);
      }
    }
  }, []);

  /**
   * Release wake lock
   */
  const releaseWakeLock = useCallback(async () => {
    if (wakeLockRef.current) {
      try {
        await wakeLockRef.current.release();
        wakeLockRef.current = null;
      } catch (err) {
        // Ignore errors on release
      }
    }
  }, []);

  // ============================================
  // SESSION MANAGEMENT
  // ============================================

  /**
   * Initialize workout session
   */
  const initializeSession = useCallback(() => {
    if (workout && !isActive) {
      startSession(workout);
      requestWakeLock();
      haptic('success');
    }
  }, [workout, isActive, startSession, requestWakeLock]);

  /**
   * Handle workout completion
   */
  const handleComplete = useCallback(() => {
    const completionData = completeWorkout();
    releaseWakeLock();
    haptic('success');
    onComplete?.(completionData);
  }, [completeWorkout, releaseWakeLock, onComplete]);

  /**
   * Handle workout exit (with confirmation)
   */
  const handleExit = useCallback(() => {
    if (metrics.totalSets > 0) {
      setShowExitConfirm(true);
    } else {
      handleConfirmExit();
    }
  }, [metrics.totalSets]);

  /**
   * Confirm exit and end session
   */
  const handleConfirmExit = useCallback(() => {
    endSession();
    releaseWakeLock();
    setShowExitConfirm(false);
    onClose?.();
  }, [endSession, releaseWakeLock, onClose]);

  /**
   * Cancel exit confirmation
   */
  const handleCancelExit = useCallback(() => {
    setShowExitConfirm(false);
  }, []);

  /**
   * Pause/resume session
   */
  const togglePause = useCallback(() => {
    if (pausedAt) {
      resumeSession();
      haptic('light');
    } else {
      pauseSession();
      haptic('light');
    }
  }, [pausedAt, resumeSession, pauseSession]);

  // ============================================
  // NAVIGATION
  // ============================================

  /**
   * Navigate to next exercise with haptic feedback
   */
  const nextExercise = useCallback(() => {
    if (hasNext) {
      goToNextExercise();
      haptic('medium');
      return true;
    }
    return false;
  }, [hasNext, goToNextExercise]);

  /**
   * Navigate to previous exercise with haptic feedback
   */
  const previousExercise = useCallback(() => {
    if (hasPrevious) {
      goToPreviousExercise();
      haptic('medium');
      return true;
    }
    return false;
  }, [hasPrevious, goToPreviousExercise]);

  // ============================================
  // SET LOGGING
  // ============================================

  /**
   * Log a set and auto-start rest timer
   */
  const logSet = useCallback(
    (setData) => {
      const result = setLogging.log(setData);
      haptic('success');

      // Auto-start rest timer
      if (soundEnabled) {
        restTimer.start(restDuration);
      }

      return result;
    },
    [setLogging, restTimer, restDuration, soundEnabled]
  );

  // ============================================
  // VOICE INPUT
  // ============================================

  /**
   * Parse voice command and execute action
   */
  const parseVoiceCommand = useCallback(
    (transcript) => {
      const text = transcript.toLowerCase().trim();

      // Pattern: "X reps at Y pounds" or "X reps Y pounds"
      const repsWeightMatch = text.match(/(\d+)\s*reps?\s*(?:at\s*)?(\d+)\s*(?:pounds?|lbs?)?/);
      if (repsWeightMatch) {
        const reps = parseInt(repsWeightMatch[1], 10);
        const weight = parseInt(repsWeightMatch[2], 10);
        logSet({ reps, weight });
        return { type: 'log_set', reps, weight };
      }

      // Pattern: "X reps" only
      const repsOnlyMatch = text.match(/(\d+)\s*reps?/);
      if (repsOnlyMatch) {
        const reps = parseInt(repsOnlyMatch[1], 10);
        return { type: 'partial', reps };
      }

      // Pattern: "add X pounds"
      const addWeightMatch = text.match(/add\s*(\d+)\s*(?:pounds?|lbs?)?/);
      if (addWeightMatch) {
        const delta = parseInt(addWeightMatch[1], 10);
        return { type: 'add_weight', delta };
      }

      // Navigation commands
      if (text.includes('next exercise') || text.includes('next')) {
        nextExercise();
        return { type: 'next_exercise' };
      }

      if (text.includes('previous exercise') || text.includes('previous') || text.includes('back')) {
        previousExercise();
        return { type: 'previous_exercise' };
      }

      // Timer commands
      if (text.includes('start timer') || text.includes('rest')) {
        restTimer.start(restDuration);
        return { type: 'start_timer' };
      }

      if (text.includes('stop timer') || text.includes('skip')) {
        restTimer.stop();
        return { type: 'stop_timer' };
      }

      // Finish command
      if (text.includes('finish workout') || text.includes('done') || text.includes('complete')) {
        handleComplete();
        return { type: 'finish' };
      }

      return { type: 'unknown', transcript: text };
    },
    [logSet, nextExercise, previousExercise, restTimer, restDuration, handleComplete]
  );

  /**
   * Start voice input
   */
  const startVoiceInput = useCallback(() => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      setVoiceError('Speech recognition not supported in this browser');
      return;
    }

    setIsListening(true);
    setVoiceTranscript('');
    setVoiceError(null);
    haptic('light');
  }, []);

  /**
   * Stop voice input
   */
  const stopVoiceInput = useCallback(() => {
    setIsListening(false);
    haptic('light');
  }, []);

  /**
   * Handle voice transcript result
   */
  const handleVoiceResult = useCallback(
    (transcript) => {
      setVoiceTranscript(transcript);
      const result = parseVoiceCommand(transcript);
      setIsListening(false);
      return result;
    },
    [parseVoiceCommand]
  );

  // ============================================
  // EFFECTS
  // ============================================

  // Handle visibility change to reacquire wake lock
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && isActive) {
        requestWakeLock();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isActive, requestWakeLock]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      releaseWakeLock();
    };
  }, [releaseWakeLock]);

  // ============================================
  // SWIPE GESTURE HANDLERS
  // ============================================

  /**
   * Handle horizontal swipe gesture
   * @param {number} offsetX - Horizontal offset
   * @param {number} velocityX - Horizontal velocity
   * @returns {string|null} Direction of swipe or null
   */
  const handleHorizontalSwipe = useCallback(
    (offsetX, velocityX) => {
      // Swipe left (next exercise)
      if (offsetX < -SWIPE_HORIZONTAL_THRESHOLD || velocityX < -SWIPE_VELOCITY_THRESHOLD) {
        if (hasNext) {
          nextExercise();
          return 'left';
        }
      }
      // Swipe right (previous exercise)
      else if (offsetX > SWIPE_HORIZONTAL_THRESHOLD || velocityX > SWIPE_VELOCITY_THRESHOLD) {
        if (hasPrevious) {
          previousExercise();
          return 'right';
        }
      }
      return null;
    },
    [hasNext, hasPrevious, nextExercise, previousExercise]
  );

  /**
   * Handle vertical swipe gesture (for set logging)
   * @param {number} offsetY - Vertical offset
   * @param {number} velocityY - Vertical velocity
   * @param {Object} pendingSet - Set data to log if swipe completes
   * @returns {boolean} Whether swipe triggered an action
   */
  const handleVerticalSwipe = useCallback(
    (offsetY, velocityY, pendingSet) => {
      // Swipe up to log set
      if (offsetY < -SWIPE_VERTICAL_THRESHOLD || velocityY < -SWIPE_VELOCITY_THRESHOLD) {
        if (pendingSet && pendingSet.weight > 0 && pendingSet.reps > 0) {
          logSet(pendingSet);
          return true;
        }
      }
      return false;
    },
    [logSet]
  );

  // ============================================
  // COMPUTED VALUES
  // ============================================

  /**
   * Get default values for set logger based on previous set
   */
  const getDefaultSetValues = useMemo(() => {
    const lastSet = currentExerciseSets[currentExerciseSets.length - 1];
    return {
      weight: lastSet?.weight || 0,
      reps: lastSet?.reps || 0,
    };
  }, [currentExerciseSets]);

  /**
   * Calculate workout intensity based on metrics
   */
  const workoutIntensity = useMemo(() => {
    if (!isActive) return 'none';
    const setsPerMinute = metrics.totalSets / (metrics.duration / 60000 || 1);
    if (setsPerMinute > 2) return 'high';
    if (setsPerMinute > 1) return 'moderate';
    return 'low';
  }, [isActive, metrics.totalSets, metrics.duration]);

  // ============================================
  // RETURN VALUE
  // ============================================

  return {
    // Session state
    isActive,
    isPaused: !!pausedAt,

    // Current exercise
    currentExercise,
    currentExerciseIndex,
    totalExercises,
    currentExerciseSets,
    hasNext,
    hasPrevious,

    // Metrics
    metrics,

    // PRs
    sessionPRs,
    hasPRs,

    // Rest timer
    restTimer,

    // Voice input
    isListening,
    voiceTranscript,
    voiceError,

    // UI state
    showExitConfirm,
    soundEnabled,
    restDuration,

    // Computed values
    getDefaultSetValues,
    workoutIntensity,

    // Actions
    initializeSession,
    handleComplete,
    handleExit,
    handleConfirmExit,
    handleCancelExit,
    togglePause,
    nextExercise,
    previousExercise,
    logSet,

    // Swipe gesture handlers
    handleHorizontalSwipe,
    handleVerticalSwipe,

    // Voice actions
    startVoiceInput,
    stopVoiceInput,
    handleVoiceResult,

    // Settings
    setSoundEnabled,
    setRestDuration,
  };
}

/**
 * Hook for swipe gesture detection with thresholds
 * Can be used standalone for custom swipe implementations
 */
export function useSwipeGestures({
  onSwipeLeft,
  onSwipeRight,
  onSwipeUp,
  onSwipeDown,
  horizontalThreshold = SWIPE_HORIZONTAL_THRESHOLD,
  verticalThreshold = SWIPE_VERTICAL_THRESHOLD,
  velocityThreshold = SWIPE_VELOCITY_THRESHOLD,
}) {
  const handleDragEnd = useCallback(
    (event, info) => {
      const { offset, velocity } = info;

      // Check horizontal swipes
      if (Math.abs(offset.x) > Math.abs(offset.y)) {
        if (offset.x < -horizontalThreshold || velocity.x < -velocityThreshold) {
          onSwipeLeft?.();
          return 'left';
        }
        if (offset.x > horizontalThreshold || velocity.x > velocityThreshold) {
          onSwipeRight?.();
          return 'right';
        }
      }
      // Check vertical swipes
      else {
        if (offset.y < -verticalThreshold || velocity.y < -velocityThreshold) {
          onSwipeUp?.();
          return 'up';
        }
        if (offset.y > verticalThreshold || velocity.y > velocityThreshold) {
          onSwipeDown?.();
          return 'down';
        }
      }

      return null;
    },
    [
      onSwipeLeft,
      onSwipeRight,
      onSwipeUp,
      onSwipeDown,
      horizontalThreshold,
      verticalThreshold,
      velocityThreshold,
    ]
  );

  return {
    handleDragEnd,
    thresholds: {
      horizontal: horizontalThreshold,
      vertical: verticalThreshold,
      velocity: velocityThreshold,
    },
  };
}

export default useWorkoutMode;
