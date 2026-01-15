/**
 * WorkoutMode Component - Immersive Fullscreen Workout UI
 *
 * A fullscreen overlay optimized for gym use with:
 * - Dark ambient background with animated gradient
 * - Large touch-friendly buttons (64px+ tap targets)
 * - Swipe gestures for navigation
 * - Current exercise with muscle visualization
 * - Rest timer with ambient effects
 * - Progress tracking
 *
 * @example
 * <WorkoutMode
 *   workout={workoutPlan}
 *   onComplete={handleComplete}
 *   onClose={handleClose}
 * />
 */

import React, { useEffect, useCallback, useState, useRef } from 'react';
import { motion, AnimatePresence, useMotionValue, useTransform } from 'framer-motion';
import { X, Pause, Play, ChevronLeft, ChevronRight } from 'lucide-react';
import { useWorkoutMode } from './useWorkoutMode';
import { ExerciseDisplay } from './ExerciseDisplay';
import { SetLogger } from './SetLogger';
import { RestTimer } from './RestTimer';
import { WorkoutProgress } from './WorkoutProgress';
import { QuickControls } from './QuickControls';
import { FloatingRestTimer } from '../workout/FloatingRestTimer';
import { GlassSurface } from '../glass';
import { useShouldReduceMotion } from '../../contexts/MotionContext';
import { haptic } from '../../utils/haptics';

// Swipe threshold for gesture navigation
const SWIPE_THRESHOLD = 50;
const SWIPE_VELOCITY_THRESHOLD = 300;

/**
 * Fullscreen Workout Mode Component
 */
export function WorkoutMode({ workout, onComplete, onClose }) {
  const shouldReduceMotion = useShouldReduceMotion();
  const containerRef = useRef(null);
  const [_dragDirection, _setDragDirection] = useState(null);

  // Workout mode hook
  const {
    isActive,
    isPaused,
    currentExercise,
    currentExerciseIndex,
    totalExercises,
    currentExerciseSets,
    hasNext,
    hasPrevious,
    metrics,
    restTimer,
    showExitConfirm,
    soundEnabled,
    restDuration: _restDuration,
    initializeSession,
    handleComplete,
    handleExit,
    handleConfirmExit,
    handleCancelExit,
    togglePause,
    nextExercise,
    previousExercise,
    logSet,
    setSoundEnabled,
    setRestDuration: _setRestDuration,
    getExerciseHistory,
    restTimerSettings,
  } = useWorkoutMode({ workout, onComplete, onClose });

  // Get exercise history for current exercise
  const exerciseHistory = currentExercise?.id ? getExerciseHistory(currentExercise.id) : null;

  // Motion values for swipe gestures
  const dragX = useMotionValue(0);
  const dragOpacity = useTransform(dragX, [-200, 0, 200], [0.5, 1, 0.5]);

  // Initialize session on mount
  useEffect(() => {
    initializeSession();
  }, [initializeSession]);

  // Prevent scroll on body when workout mode is active
  useEffect(() => {
    const originalStyle = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = originalStyle;
    };
  }, []);

  // Handle swipe gesture completion
  const handleDragEnd = useCallback(
    (event, info) => {
      const { offset, velocity } = info;

      // Swipe left (next exercise)
      if (
        offset.x < -SWIPE_THRESHOLD ||
        velocity.x < -SWIPE_VELOCITY_THRESHOLD
      ) {
        if (hasNext) {
          nextExercise();
          setDragDirection('left');
        }
      }
      // Swipe right (previous exercise)
      else if (
        offset.x > SWIPE_THRESHOLD ||
        velocity.x > SWIPE_VELOCITY_THRESHOLD
      ) {
        if (hasPrevious) {
          previousExercise();
          setDragDirection('right');
        }
      }

      // Reset drag direction after animation
      setTimeout(() => setDragDirection(null), 300);
    },
    [hasNext, hasPrevious, nextExercise, previousExercise]
  );

  // Handle swipe up (complete set)
  const _handleSwipeUp = useCallback(() => {
    // This is handled by SetLogger directly
    haptic('medium');
  }, []);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e) => {
      switch (e.key) {
        case 'Escape':
          handleExit();
          break;
        case 'ArrowLeft':
          previousExercise();
          break;
        case 'ArrowRight':
          nextExercise();
          break;
        case ' ':
          e.preventDefault();
          togglePause();
          break;
        default:
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleExit, previousExercise, nextExercise, togglePause]);

  // Get the last set for the current exercise (for reference)
  const previousSet = currentExerciseSets.length > 0
    ? currentExerciseSets[currentExerciseSets.length - 1]
    : null;

  return (
    <AnimatePresence>
      {isActive && (
        <motion.div
          ref={containerRef}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: shouldReduceMotion ? 0 : 0.3 }}
          className="fixed inset-0 z-50 flex flex-col"
        >
          {/* Animated Background */}
          <div className="absolute inset-0 bg-black">
            {/* Gradient overlay */}
            <motion.div
              className="absolute inset-0"
              animate={
                shouldReduceMotion
                  ? {}
                  : {
                      background: [
                        'radial-gradient(circle at 30% 30%, rgba(0, 102, 255, 0.15) 0%, transparent 50%)',
                        'radial-gradient(circle at 70% 70%, rgba(0, 102, 255, 0.15) 0%, transparent 50%)',
                        'radial-gradient(circle at 30% 70%, rgba(0, 102, 255, 0.15) 0%, transparent 50%)',
                        'radial-gradient(circle at 70% 30%, rgba(0, 102, 255, 0.15) 0%, transparent 50%)',
                        'radial-gradient(circle at 30% 30%, rgba(0, 102, 255, 0.15) 0%, transparent 50%)',
                      ],
                    }
              }
              transition={
                shouldReduceMotion
                  ? { duration: 0 }
                  : { duration: 20, repeat: Infinity, ease: 'linear' }
              }
              style={{
                background: 'radial-gradient(circle at 30% 30%, rgba(0, 102, 255, 0.15) 0%, transparent 50%)',
              }}
            />

            {/* Subtle noise texture */}
            <div
              className="absolute inset-0 opacity-[0.02]"
              style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
              }}
            />
          </div>

          {/* Header */}
          <div className="relative z-10 flex items-center justify-between px-4 py-3 safe-top">
            {/* Exit Button */}
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={handleExit}
              className="w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors touch-manipulation"
              aria-label="Exit workout mode"
            >
              <X className="w-6 h-6 text-white" />
            </motion.button>

            {/* Progress Indicator */}
            <WorkoutProgress
              currentIndex={currentExerciseIndex}
              total={totalExercises}
              setsCompleted={metrics.totalSets}
              duration={metrics.duration}
            />

            {/* Pause/Play Button */}
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={togglePause}
              className="w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors touch-manipulation"
              aria-label={isPaused ? 'Resume workout' : 'Pause workout'}
            >
              {isPaused ? (
                <Play className="w-6 h-6 text-white" />
              ) : (
                <Pause className="w-6 h-6 text-white" />
              )}
            </motion.button>
          </div>

          {/* Main Content - Swipeable */}
          <motion.div
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.2}
            onDragEnd={handleDragEnd}
            style={{ x: dragX, opacity: dragOpacity }}
            className="relative z-10 flex-1 flex flex-col overflow-hidden"
          >
            {/* Navigation Hints */}
            <div className="absolute inset-y-0 left-0 w-16 flex items-center justify-center pointer-events-none">
              <AnimatePresence>
                {hasPrevious && (
                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 0.3, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="text-white"
                  >
                    <ChevronLeft className="w-8 h-8" />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            <div className="absolute inset-y-0 right-0 w-16 flex items-center justify-center pointer-events-none">
              <AnimatePresence>
                {hasNext && (
                  <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 0.3, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    className="text-white"
                  >
                    <ChevronRight className="w-8 h-8" />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Exercise Display */}
            <div className="flex-shrink-0 px-4 py-2">
              <ExerciseDisplay
                exercise={currentExercise}
                setNumber={currentExerciseSets.length + 1}
                totalSets={workout?.exercises?.[currentExerciseIndex]?.sets || 3}
              />
            </div>

            {/* Rest Timer (fullscreen overlay when active) */}
            <AnimatePresence>
              {restTimer.isActive && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 z-20 flex items-center justify-center bg-black/90"
                >
                  <RestTimer
                    time={restTimer.time}
                    isActive={restTimer.isActive}
                    totalDuration={restDuration}
                    onStart={restTimer.start}
                    onStop={restTimer.stop}
                    onAdjust={restTimer.adjust}
                    soundEnabled={soundEnabled}
                    onSoundToggle={setSoundEnabled}
                    fullscreen
                  />
                </motion.div>
              )}
            </AnimatePresence>

            {/* Set Logger */}
            <div className="flex-1 flex flex-col justify-center px-4 pb-4">
              <SetLogger
                exercise={currentExercise}
                previousSet={previousSet}
                bestWeight={exerciseHistory?.bestWeight || 0}
                best1RM={exerciseHistory?.best1RM || 0}
                onLogSet={logSet}
                onStartTimer={() => restTimer.start(restDuration)}
                defaultWeight={previousSet?.weight || 0}
                defaultReps={previousSet?.reps || 0}
              />
            </div>
          </motion.div>

          {/* Quick Controls */}
          <div className="relative z-10 px-4 pb-4 safe-bottom">
            <QuickControls
              onSkipExercise={nextExercise}
              onFinishWorkout={handleComplete}
              onPreviousExercise={previousExercise}
              hasNext={hasNext}
              hasPrevious={hasPrevious}
              isPaused={isPaused}
              onTogglePause={togglePause}
            />
          </div>

          {/* Exit Confirmation Modal */}
          <AnimatePresence>
            {showExitConfirm && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 z-50 flex items-center justify-center bg-black/80"
                onClick={handleCancelExit}
              >
                <motion.div
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.9, opacity: 0 }}
                  onClick={(e) => e.stopPropagation()}
                  className="mx-4"
                >
                  <GlassSurface
                    depth="medium"
                    className="max-w-sm p-6 text-center"
                  >
                    <h3 className="text-xl font-bold text-white mb-2">
                      End Workout?
                    </h3>
                    <p className="text-gray-400 mb-6">
                      You have logged {metrics.totalSets} sets. Are you sure you want to end this workout?
                    </p>
                    <div className="flex gap-3">
                      <motion.button
                        whileTap={{ scale: 0.95 }}
                        onClick={handleCancelExit}
                        className="flex-1 py-3 px-4 rounded-xl bg-white/10 hover:bg-white/20 text-white font-medium transition-colors touch-manipulation"
                      >
                        Continue
                      </motion.button>
                      <motion.button
                        whileTap={{ scale: 0.95 }}
                        onClick={handleConfirmExit}
                        className="flex-1 py-3 px-4 rounded-xl bg-red-500/20 hover:bg-red-500/30 text-red-400 font-medium transition-colors touch-manipulation"
                      >
                        End Workout
                      </motion.button>
                    </div>
                  </GlassSurface>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Paused Overlay */}
          <AnimatePresence>
            {isPaused && !showExitConfirm && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 z-30 flex items-center justify-center bg-black/70"
                onClick={togglePause}
              >
                <motion.div
                  initial={{ scale: 0.8 }}
                  animate={{ scale: 1 }}
                  exit={{ scale: 0.8 }}
                  className="text-center"
                >
                  <motion.div
                    animate={shouldReduceMotion ? {} : { scale: [1, 1.05, 1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                    className="w-24 h-24 mx-auto mb-4 rounded-full bg-white/10 flex items-center justify-center"
                  >
                    <Play className="w-12 h-12 text-white ml-1" />
                  </motion.div>
                  <p className="text-xl font-bold text-white">Paused</p>
                  <p className="text-gray-400 mt-1">Tap anywhere to resume</p>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Floating Rest Timer - visible when timer is active but user is browsing */}
          <FloatingRestTimer
            enabled={restTimerSettings?.showFloatingTimer}
            onTimerEnd={() => haptic('success')}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default WorkoutMode;
