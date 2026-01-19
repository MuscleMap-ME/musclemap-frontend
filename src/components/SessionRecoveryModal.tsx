/**
 * Session Recovery Modal
 *
 * Shows a prompt when a previous workout session is found that can be recovered.
 * Gives users the option to continue their workout or start fresh.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  recoverSession,
  clearAllSessionPersistence,
  WorkoutSession,
} from '../lib/sessionPersistence';
import { useWorkoutSessionStore } from '../store/workoutSessionStore';

interface SessionRecoveryModalProps {
  onRecovered?: (session: WorkoutSession) => void;
  onDismissed?: () => void;
}

export function SessionRecoveryModal({
  onRecovered,
  onDismissed,
}: SessionRecoveryModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [session, setSession] = useState<WorkoutSession | null>(null);
  const [source, setSource] = useState<'indexeddb' | 'server' | 'none'>('none');
  const [isRestoring, setIsRestoring] = useState(false);
  const [isDiscarding, setIsDiscarding] = useState(false);

  const currentIsActive = useWorkoutSessionStore((s) => s.isActive);

  // Check for recoverable session on mount
  useEffect(() => {
    // Don't check if already in a workout
    if (currentIsActive) return;

    const checkForRecovery = async () => {
      try {
        const result = await recoverSession();
        if (result.session && result.source !== 'none') {
          setSession(result.session);
          setSource(result.source);
          setIsOpen(true);
        }
      } catch (error) {
        console.error('Error checking for session recovery:', error);
      }
    };

    // Small delay to let the app initialize
    const timeout = setTimeout(checkForRecovery, 500);
    return () => clearTimeout(timeout);
  }, [currentIsActive]);

  // Restore the session
  const handleRestore = useCallback(async () => {
    if (!session) return;

    setIsRestoring(true);
    try {
      // Restore session to store
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

      setIsOpen(false);
      onRecovered?.(session);
    } finally {
      setIsRestoring(false);
    }
  }, [session, onRecovered]);

  // Discard the session
  const handleDiscard = useCallback(async () => {
    setIsDiscarding(true);
    try {
      await clearAllSessionPersistence('abandoned');
      setIsOpen(false);
      onDismissed?.();
    } finally {
      setIsDiscarding(false);
    }
  }, [onDismissed]);

  // Format duration
  const formatDuration = (ms: number) => {
    const minutes = Math.floor(ms / 60000);
    if (minutes < 60) return `${minutes} min`;
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return `${hours}h ${remainingMinutes}m`;
  };

  // Format time ago
  const formatTimeAgo = (timestamp: number) => {
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    if (seconds < 60) return 'just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes} min ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    const days = Math.floor(hours / 24);
    return `${days} day${days > 1 ? 's' : ''} ago`;
  };

  if (!session) return null;

  const sessionDuration = session.startTime
    ? Date.now() - session.startTime - (session.totalPausedTime || 0)
    : 0;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
            onClick={handleDiscard}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-md p-4"
          >
            <div className="bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl overflow-hidden">
              {/* Header */}
              <div className="bg-gradient-to-r from-blue-600 to-purple-600 px-6 py-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                    <svg
                      className="w-5 h-5 text-white"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                      />
                    </svg>
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-white">
                      Unfinished Workout Found
                    </h2>
                    <p className="text-sm text-white/70">
                      Recovered from {source === 'server' ? 'server backup' : 'local storage'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Content */}
              <div className="p-6 space-y-4">
                {/* Session Stats */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-white">
                      {session.sets?.length || 0}
                    </div>
                    <div className="text-xs text-gray-400">Sets Logged</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-white">
                      {Math.round(session.totalVolume || 0).toLocaleString()}
                    </div>
                    <div className="text-xs text-gray-400">Volume (lbs)</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-white">
                      {formatDuration(sessionDuration)}
                    </div>
                    <div className="text-xs text-gray-400">Duration</div>
                  </div>
                </div>

                {/* Session Info */}
                <div className="bg-gray-800/50 rounded-lg p-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Started</span>
                    <span className="text-white">
                      {session.startTime ? formatTimeAgo(session.startTime) : 'Unknown'}
                    </span>
                  </div>
                  {session.exercises && session.exercises.length > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">Exercises</span>
                      <span className="text-white">
                        {session.exercises.map(e => e.name).slice(0, 3).join(', ')}
                        {session.exercises.length > 3 && ` +${session.exercises.length - 3} more`}
                      </span>
                    </div>
                  )}
                  {session.sessionPRs && session.sessionPRs.length > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">PRs Set</span>
                      <span className="text-yellow-400 font-medium">
                        {session.sessionPRs.length} PR{session.sessionPRs.length > 1 ? 's' : ''}
                      </span>
                    </div>
                  )}
                </div>

                {/* Warning */}
                <p className="text-sm text-gray-400 text-center">
                  Would you like to continue this workout or start fresh?
                </p>
              </div>

              {/* Actions */}
              <div className="px-6 pb-6 flex gap-3">
                <button
                  onClick={handleDiscard}
                  disabled={isDiscarding || isRestoring}
                  className="flex-1 py-3 px-4 rounded-lg border border-gray-600 text-gray-300 font-medium hover:bg-gray-800 transition-colors disabled:opacity-50"
                >
                  {isDiscarding ? 'Discarding...' : 'Start Fresh'}
                </button>
                <button
                  onClick={handleRestore}
                  disabled={isDiscarding || isRestoring}
                  className="flex-1 py-3 px-4 rounded-lg bg-gradient-to-r from-blue-600 to-purple-600 text-white font-medium hover:from-blue-500 hover:to-purple-500 transition-colors disabled:opacity-50"
                >
                  {isRestoring ? 'Restoring...' : 'Continue Workout'}
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

export default SessionRecoveryModal;
