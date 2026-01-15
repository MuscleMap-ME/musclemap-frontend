/**
 * SupersetMode Component
 *
 * Enhanced workout mode for executing exercise groups (supersets, circuits, giant sets).
 * Features:
 * - Visual grouping with colored indicators
 * - Auto-advance between exercises in the group
 * - Rest timer only after completing full group
 * - Circuit mode with round tracking
 * - Timed circuit mode with countdown per exercise
 */

import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Layers,
  RotateCcw,
  ChevronRight,
  ChevronLeft,
  Zap,
  CheckCircle,
  SkipForward,
  Play,
  Pause,
} from 'lucide-react';
import { GlassSurface } from '../glass';
import { haptic } from '../../utils/haptics';

// Group type configurations (same as SupersetGroup)
const GROUP_TYPE_CONFIG = {
  superset: {
    label: 'Superset',
    color: '#3B82F6',
    bgClass: 'bg-blue-500/10',
    borderClass: 'border-blue-500/30',
    textClass: 'text-blue-400',
    icon: Layers,
  },
  giant_set: {
    label: 'Giant Set',
    color: '#8B5CF6',
    bgClass: 'bg-purple-500/10',
    borderClass: 'border-purple-500/30',
    textClass: 'text-purple-400',
    icon: Layers,
  },
  circuit: {
    label: 'Circuit',
    color: '#F97316',
    bgClass: 'bg-orange-500/10',
    borderClass: 'border-orange-500/30',
    textClass: 'text-orange-400',
    icon: RotateCcw,
  },
  drop_set: {
    label: 'Drop Set',
    color: '#EF4444',
    bgClass: 'bg-red-500/10',
    borderClass: 'border-red-500/30',
    textClass: 'text-red-400',
    icon: Zap,
  },
  cluster: {
    label: 'Cluster',
    color: '#10B981',
    bgClass: 'bg-green-500/10',
    borderClass: 'border-green-500/30',
    textClass: 'text-green-400',
    icon: Zap,
  },
};

/**
 * Progress indicator showing position within a superset group
 */
function GroupProgressIndicator({ exercises, currentIndex, currentRound, totalRounds, groupType }) {
  const config = GROUP_TYPE_CONFIG[groupType] || GROUP_TYPE_CONFIG.superset;

  return (
    <div className="flex flex-col items-center gap-2">
      {/* Round indicator for circuits */}
      {totalRounds > 1 && (
        <div className={`text-xs font-medium ${config.textClass}`}>
          Round {currentRound} of {totalRounds}
        </div>
      )}

      {/* Exercise dots */}
      <div className="flex items-center gap-1.5">
        {exercises.map((_, index) => (
          <motion.div
            key={index}
            animate={{
              scale: index === currentIndex ? 1.2 : 1,
              opacity: index === currentIndex ? 1 : index < currentIndex ? 0.5 : 0.3,
            }}
            className={`w-2.5 h-2.5 rounded-full transition-colors`}
            style={{
              backgroundColor: index <= currentIndex ? config.color : 'rgba(255,255,255,0.2)',
            }}
          />
        ))}
      </div>

      {/* Exercise counter */}
      <div className="text-xs text-gray-400">
        Exercise {currentIndex + 1} of {exercises.length}
      </div>
    </div>
  );
}

/**
 * Timed circuit countdown timer
 */
function CircuitTimer({ duration, onComplete, isPaused, color }) {
  const [timeLeft, setTimeLeft] = useState(duration);

  useEffect(() => {
    setTimeLeft(duration);
  }, [duration]);

  useEffect(() => {
    if (isPaused || timeLeft <= 0) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          onComplete?.();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isPaused, timeLeft, onComplete]);

  // Warning at 10 seconds
  const isWarning = timeLeft <= 10 && timeLeft > 0;

  // Format time
  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const timeDisplay = minutes > 0
    ? `${minutes}:${seconds.toString().padStart(2, '0')}`
    : `${seconds}`;

  // Progress
  const progress = ((duration - timeLeft) / duration) * 100;

  return (
    <div className="flex flex-col items-center">
      {/* Circular progress */}
      <div className="relative w-24 h-24">
        <svg className="w-full h-full transform -rotate-90">
          {/* Background circle */}
          <circle
            cx="48"
            cy="48"
            r="44"
            fill="none"
            stroke="rgba(255,255,255,0.1)"
            strokeWidth="6"
          />
          {/* Progress circle */}
          <motion.circle
            cx="48"
            cy="48"
            r="44"
            fill="none"
            stroke={isWarning ? '#EF4444' : color}
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray={`${2 * Math.PI * 44}`}
            strokeDashoffset={`${2 * Math.PI * 44 * (1 - progress / 100)}`}
            initial={false}
            animate={{ strokeDashoffset: `${2 * Math.PI * 44 * (1 - progress / 100)}` }}
            transition={{ duration: 0.5 }}
          />
        </svg>

        {/* Time display */}
        <div className="absolute inset-0 flex items-center justify-center">
          <motion.span
            animate={isWarning ? { scale: [1, 1.1, 1] } : {}}
            transition={{ duration: 0.5, repeat: isWarning ? Infinity : 0 }}
            className={`text-2xl font-bold ${isWarning ? 'text-red-400' : 'text-white'}`}
          >
            {timeDisplay}
          </motion.span>
        </div>
      </div>
    </div>
  );
}

/**
 * Current exercise display within a superset
 */
function SupersetExerciseDisplay({ exercise, exerciseIndex, isLast, groupType, onComplete: _onComplete }) {
  const config = GROUP_TYPE_CONFIG[groupType] || GROUP_TYPE_CONFIG.superset;

  return (
    <div className="flex-1 flex flex-col items-center justify-center px-4">
      {/* Group type badge */}
      <div className={`px-3 py-1 rounded-full ${config.bgClass} ${config.textClass} text-xs font-medium mb-4`}>
        {config.label} - Exercise {exerciseIndex + 1}
      </div>

      {/* Exercise name */}
      <h2 className="text-2xl font-bold text-white text-center mb-2">
        {exercise.name || exercise.exerciseId}
      </h2>

      {/* Set/rep info */}
      {(exercise.sets || exercise.reps) && (
        <p className="text-lg text-gray-400 mb-6">
          {exercise.sets && `${exercise.sets} sets`}
          {exercise.sets && exercise.reps && ' x '}
          {exercise.reps && `${exercise.reps} reps`}
        </p>
      )}

      {/* Next indicator */}
      {!isLast && (
        <motion.div
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="flex items-center gap-2 text-sm text-gray-500"
        >
          <span>Complete to continue</span>
          <ChevronRight className="w-4 h-4" />
        </motion.div>
      )}
    </div>
  );
}

/**
 * Main SupersetMode component for workout execution
 */
export function SupersetMode({
  group,
  exerciseDetails = [], // Full exercise objects with names
  onComplete, // Called when group is fully completed
  onSetLogged, // Called when a set is logged
  onExit: _onExit, // Called to exit superset mode (reserved for future use)
  restTimerProps: _restTimerProps, // Rest timer configuration (reserved for future use)
}) {
  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0);
  const [currentRound, setCurrentRound] = useState(1);
  const [completedSets, setCompletedSets] = useState([]);
  const [isPaused, setIsPaused] = useState(false);
  const [showTransition, setShowTransition] = useState(false);
  const [transitionType, setTransitionType] = useState(null); // 'next', 'round', 'complete'

  const config = GROUP_TYPE_CONFIG[group.groupType] || GROUP_TYPE_CONFIG.superset;
  const exercises = group.exercises || [];
  const totalRounds = group.circuitRounds || 1;
  const isTimedCircuit = group.groupType === 'circuit' && group.circuitTimed;
  const timePerExercise = group.circuitTimePerExercise || 30;
  const transitionTime = group.circuitTransitionTime || 10;

  const currentExercise = useMemo(() => {
    const exerciseConfig = exercises[currentExerciseIndex];
    if (!exerciseConfig) return null;

    const details = exerciseDetails.find(e =>
      e.id === exerciseConfig.exerciseId || e.exerciseId === exerciseConfig.exerciseId
    );

    return {
      ...exerciseConfig,
      ...(details || {}),
      name: details?.name || exerciseConfig.exerciseId,
    };
  }, [exercises, exerciseDetails, currentExerciseIndex]);

  const isLastExercise = currentExerciseIndex === exercises.length - 1;
  const isLastRound = currentRound === totalRounds;

  // Handle advancing to next exercise
  const advanceToNextExercise = useCallback(() => {
    if (isLastExercise) {
      if (isLastRound) {
        // Complete the entire group
        setTransitionType('complete');
        setShowTransition(true);
        haptic('success');

        setTimeout(() => {
          onComplete?.({
            completedSets,
            totalRounds: currentRound,
          });
        }, 1500);
      } else {
        // Start next round
        setTransitionType('round');
        setShowTransition(true);
        haptic('medium');

        setTimeout(() => {
          setShowTransition(false);
          setCurrentExerciseIndex(0);
          setCurrentRound(prev => prev + 1);
        }, transitionTime * 1000);
      }
    } else {
      // Move to next exercise in current round
      setTransitionType('next');
      setShowTransition(true);
      haptic('light');

      setTimeout(() => {
        setShowTransition(false);
        setCurrentExerciseIndex(prev => prev + 1);
      }, group.restBetweenExercises * 1000 || 500);
    }
  }, [
    isLastExercise, isLastRound, completedSets, currentRound,
    transitionTime, group.restBetweenExercises, onComplete
  ]);

  // Handle set completion
  const handleSetCompleted = useCallback((setData) => {
    const loggedSet = {
      ...setData,
      exerciseId: currentExercise?.exerciseId,
      round: currentRound,
      exerciseIndex: currentExerciseIndex,
      timestamp: Date.now(),
    };

    setCompletedSets(prev => [...prev, loggedSet]);
    onSetLogged?.(loggedSet);

    // Auto-advance for certain group types
    if (['superset', 'giant_set', 'circuit'].includes(group.groupType)) {
      advanceToNextExercise();
    }
  }, [currentExercise, currentRound, currentExerciseIndex, group.groupType, onSetLogged, advanceToNextExercise]);

  // Handle timed circuit completion
  const handleTimerComplete = useCallback(() => {
    advanceToNextExercise();
  }, [advanceToNextExercise]);

  // Navigation
  const goToPreviousExercise = useCallback(() => {
    if (currentExerciseIndex > 0) {
      setCurrentExerciseIndex(prev => prev - 1);
      haptic('light');
    }
  }, [currentExerciseIndex]);

  const goToNextExercise = useCallback(() => {
    if (!isLastExercise) {
      setCurrentExerciseIndex(prev => prev + 1);
      haptic('light');
    }
  }, [isLastExercise]);

  // Skip current exercise
  const skipExercise = useCallback(() => {
    setCompletedSets(prev => [...prev, {
      exerciseId: currentExercise?.exerciseId,
      round: currentRound,
      exerciseIndex: currentExerciseIndex,
      skipped: true,
      timestamp: Date.now(),
    }]);
    advanceToNextExercise();
  }, [currentExercise, currentRound, currentExerciseIndex, advanceToNextExercise]);

  // Calculate progress
  const totalSetsExpected = exercises.length * totalRounds;
  const completedCount = completedSets.filter(s => !s.skipped).length;
  const progress = (completedCount / totalSetsExpected) * 100;

  if (!currentExercise) {
    return null;
  }

  return (
    <div className="relative flex-1 flex flex-col">
      {/* Group header with progress */}
      <div className={`px-4 py-3 ${config.bgClass} border-b ${config.borderClass}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <config.icon className={`w-5 h-5 ${config.textClass}`} />
            <span className={`font-semibold ${config.textClass}`}>
              {exercises.length}x {config.label}
            </span>
            {group.name && (
              <span className="text-sm text-gray-400">- {group.name}</span>
            )}
          </div>

          {/* Progress bar */}
          <div className="flex items-center gap-2">
            <div className="w-20 h-1.5 bg-white/10 rounded-full overflow-hidden">
              <motion.div
                className="h-full rounded-full"
                style={{ backgroundColor: config.color }}
                animate={{ width: `${progress}%` }}
              />
            </div>
            <span className="text-xs text-gray-400">
              {completedCount}/{totalSetsExpected}
            </span>
          </div>
        </div>
      </div>

      {/* Progress indicator */}
      <div className="py-4">
        <GroupProgressIndicator
          exercises={exercises}
          currentIndex={currentExerciseIndex}
          currentRound={currentRound}
          totalRounds={totalRounds}
          groupType={group.groupType}
        />
      </div>

      {/* Main content area */}
      <AnimatePresence mode="wait">
        {showTransition ? (
          // Transition overlay
          <motion.div
            key="transition"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex-1 flex items-center justify-center"
          >
            <GlassSurface depth="medium" className="p-8 text-center">
              {transitionType === 'complete' && (
                <>
                  <CheckCircle className={`w-16 h-16 mx-auto mb-4 ${config.textClass}`} />
                  <h3 className="text-xl font-bold text-white mb-2">
                    {config.label} Complete!
                  </h3>
                  <p className="text-gray-400">
                    {completedCount} sets completed across {totalRounds} round{totalRounds > 1 ? 's' : ''}
                  </p>
                </>
              )}

              {transitionType === 'round' && (
                <>
                  <RotateCcw className={`w-12 h-12 mx-auto mb-4 ${config.textClass} animate-spin`} />
                  <h3 className="text-lg font-bold text-white mb-1">
                    Round {currentRound} Complete
                  </h3>
                  <p className="text-gray-400">
                    Starting Round {currentRound + 1} in {transitionTime}s
                  </p>
                </>
              )}

              {transitionType === 'next' && (
                <>
                  <ChevronRight className={`w-12 h-12 mx-auto mb-4 ${config.textClass}`} />
                  <h3 className="text-lg font-bold text-white">
                    Next Exercise
                  </h3>
                  {group.restBetweenExercises > 0 && (
                    <p className="text-gray-400">
                      Rest {group.restBetweenExercises}s
                    </p>
                  )}
                </>
              )}
            </GlassSurface>
          </motion.div>
        ) : (
          // Exercise display
          <motion.div
            key={`exercise-${currentExerciseIndex}-${currentRound}`}
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            className="flex-1 flex flex-col"
          >
            {/* Timed circuit timer */}
            {isTimedCircuit && !showTransition && (
              <div className="py-4 flex justify-center">
                <CircuitTimer
                  duration={timePerExercise}
                  onComplete={handleTimerComplete}
                  isPaused={isPaused}
                  color={config.color}
                />
              </div>
            )}

            {/* Exercise display */}
            <SupersetExerciseDisplay
              exercise={currentExercise}
              exerciseIndex={currentExerciseIndex}
              isLast={isLastExercise && isLastRound}
              groupType={group.groupType}
              onComplete={handleSetCompleted}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bottom controls */}
      <div className={`px-4 py-4 border-t ${config.borderClass}`}>
        <div className="flex items-center justify-between">
          {/* Navigation */}
          <div className="flex items-center gap-2">
            <button
              onClick={goToPreviousExercise}
              disabled={currentExerciseIndex === 0}
              className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>

            <button
              onClick={goToNextExercise}
              disabled={isLastExercise}
              className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center transition-colors"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

          {/* Pause/play for timed circuits */}
          {isTimedCircuit && (
            <button
              onClick={() => setIsPaused(!isPaused)}
              className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-colors ${
                isPaused
                  ? 'bg-green-500/20 text-green-400'
                  : 'bg-yellow-500/20 text-yellow-400'
              }`}
            >
              {isPaused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
              {isPaused ? 'Resume' : 'Pause'}
            </button>
          )}

          {/* Complete/Skip buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={skipExercise}
              className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-gray-300 text-sm font-medium transition-colors flex items-center gap-1"
            >
              <SkipForward className="w-4 h-4" />
              Skip
            </button>

            {!isTimedCircuit && (
              <button
                onClick={() => handleSetCompleted({ reps: currentExercise.reps || 10 })}
                className={`px-4 py-2 rounded-lg ${config.bgClass} ${config.textClass} font-semibold text-sm hover:opacity-80 transition-opacity flex items-center gap-1`}
              >
                <CheckCircle className="w-4 h-4" />
                Done
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default SupersetMode;
