/**
 * QuickControls Component - Skip, Pause, Finish Buttons
 *
 * Quick action buttons at the bottom of workout mode:
 * - Previous exercise button
 * - Skip to next exercise
 * - Pause/Resume workout
 * - Finish workout early
 *
 * All buttons are 64px+ for easy touch targeting.
 *
 * @example
 * <QuickControls
 *   onSkipExercise={handleSkip}
 *   onFinishWorkout={handleFinish}
 *   onPreviousExercise={handlePrevious}
 *   hasNext={true}
 *   hasPrevious={true}
 *   isPaused={false}
 *   onTogglePause={handleTogglePause}
 * />
 */

import React from 'react';
import { motion } from 'framer-motion';
import {
  SkipForward,
  SkipBack,
  Pause,
  Play,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Flag,
} from 'lucide-react';
import { haptic } from '../../utils/haptics';
import { useShouldReduceMotion } from '../../contexts/MotionContext';

/**
 * QuickControls Component
 */
export function QuickControls({
  onSkipExercise,
  onFinishWorkout,
  onPreviousExercise,
  hasNext = true,
  hasPrevious = false,
  isPaused = false,
  onTogglePause,
}) {
  const _shouldReduceMotion = useShouldReduceMotion();

  // Handle button press with haptic feedback
  const handlePress = (callback) => () => {
    haptic('light');
    callback?.();
  };

  return (
    <div className="flex items-center justify-center gap-4">
      {/* Previous Exercise Button */}
      <motion.button
        whileTap={{ scale: 0.9 }}
        onClick={handlePress(onPreviousExercise)}
        disabled={!hasPrevious}
        className={`w-14 h-14 min-w-[56px] min-h-[56px] rounded-full flex items-center justify-center transition-colors touch-manipulation select-none ${
          hasPrevious
            ? 'bg-white/10 hover:bg-white/20 active:bg-white/30 text-white'
            : 'bg-white/5 text-gray-600 cursor-not-allowed'
        }`}
        aria-label="Previous exercise"
      >
        <ChevronLeft className="w-7 h-7" />
      </motion.button>

      {/* Pause/Play Button */}
      <motion.button
        whileTap={{ scale: 0.9 }}
        onClick={handlePress(onTogglePause)}
        className="w-16 h-16 min-w-[64px] min-h-[64px] rounded-full bg-white/10 hover:bg-white/20 active:bg-white/30 flex items-center justify-center transition-colors touch-manipulation select-none"
        aria-label={isPaused ? 'Resume workout' : 'Pause workout'}
      >
        {isPaused ? (
          <Play className="w-8 h-8 text-green-400 ml-1" />
        ) : (
          <Pause className="w-8 h-8 text-yellow-400" />
        )}
      </motion.button>

      {/* Next Exercise / Skip Button */}
      <motion.button
        whileTap={{ scale: 0.9 }}
        onClick={handlePress(onSkipExercise)}
        disabled={!hasNext}
        className={`w-14 h-14 min-w-[56px] min-h-[56px] rounded-full flex items-center justify-center transition-colors touch-manipulation select-none ${
          hasNext
            ? 'bg-white/10 hover:bg-white/20 active:bg-white/30 text-white'
            : 'bg-white/5 text-gray-600 cursor-not-allowed'
        }`}
        aria-label="Next exercise"
      >
        <ChevronRight className="w-7 h-7" />
      </motion.button>

      {/* Finish Workout Button */}
      <motion.button
        whileTap={{ scale: 0.9 }}
        onClick={handlePress(onFinishWorkout)}
        className="w-16 h-16 min-w-[64px] min-h-[64px] rounded-full bg-green-500/20 hover:bg-green-500/30 active:bg-green-500/40 flex items-center justify-center transition-colors touch-manipulation select-none"
        aria-label="Finish workout"
      >
        <Flag className="w-7 h-7 text-green-400" />
      </motion.button>
    </div>
  );
}

/**
 * QuickControlsExpanded - Labeled buttons for larger screens
 */
export function QuickControlsExpanded({
  onSkipExercise,
  onFinishWorkout,
  onPreviousExercise,
  hasNext = true,
  hasPrevious = false,
  isPaused = false,
  onTogglePause,
}) {
  const _shouldReduceMotion = useShouldReduceMotion();

  const handlePress = (callback) => () => {
    haptic('light');
    callback?.();
  };

  return (
    <div className="flex flex-wrap items-center justify-center gap-3">
      {/* Previous Exercise */}
      <motion.button
        whileTap={{ scale: 0.95 }}
        onClick={handlePress(onPreviousExercise)}
        disabled={!hasPrevious}
        className={`flex items-center gap-2 px-4 py-3 min-h-[52px] rounded-xl transition-colors touch-manipulation select-none ${
          hasPrevious
            ? 'bg-white/10 hover:bg-white/20 active:bg-white/30 text-white'
            : 'bg-white/5 text-gray-600 cursor-not-allowed'
        }`}
      >
        <SkipBack className="w-5 h-5" />
        <span className="font-medium">Previous</span>
      </motion.button>

      {/* Pause/Resume */}
      <motion.button
        whileTap={{ scale: 0.95 }}
        onClick={handlePress(onTogglePause)}
        className={`flex items-center gap-2 px-4 py-3 min-h-[52px] rounded-xl transition-colors touch-manipulation select-none ${
          isPaused
            ? 'bg-green-500/20 hover:bg-green-500/30 active:bg-green-500/40 text-green-400'
            : 'bg-yellow-500/20 hover:bg-yellow-500/30 active:bg-yellow-500/40 text-yellow-400'
        }`}
      >
        {isPaused ? (
          <>
            <Play className="w-5 h-5" />
            <span className="font-medium">Resume</span>
          </>
        ) : (
          <>
            <Pause className="w-5 h-5" />
            <span className="font-medium">Pause</span>
          </>
        )}
      </motion.button>

      {/* Skip / Next Exercise */}
      <motion.button
        whileTap={{ scale: 0.95 }}
        onClick={handlePress(onSkipExercise)}
        disabled={!hasNext}
        className={`flex items-center gap-2 px-4 py-3 min-h-[52px] rounded-xl transition-colors touch-manipulation select-none ${
          hasNext
            ? 'bg-white/10 hover:bg-white/20 active:bg-white/30 text-white'
            : 'bg-white/5 text-gray-600 cursor-not-allowed'
        }`}
      >
        <span className="font-medium">Next</span>
        <SkipForward className="w-5 h-5" />
      </motion.button>

      {/* Finish Workout */}
      <motion.button
        whileTap={{ scale: 0.95 }}
        onClick={handlePress(onFinishWorkout)}
        className="flex items-center gap-2 px-5 py-3 min-h-[52px] rounded-xl bg-gradient-to-r from-green-600 to-green-500 hover:from-green-500 hover:to-green-400 active:from-green-400 active:to-green-300 text-white font-medium transition-colors touch-manipulation select-none shadow-lg shadow-green-500/20"
      >
        <CheckCircle2 className="w-5 h-5" />
        <span>Finish Workout</span>
      </motion.button>
    </div>
  );
}

/**
 * QuickControlsMinimal - Icon-only for very small screens
 */
export function QuickControlsMinimal({
  onSkipExercise,
  onFinishWorkout,
  isPaused = false,
  onTogglePause,
  hasNext = true,
}) {
  const handlePress = (callback) => () => {
    haptic('light');
    callback?.();
  };

  return (
    <div className="flex items-center justify-center gap-6">
      {/* Pause/Play */}
      <motion.button
        whileTap={{ scale: 0.85 }}
        onClick={handlePress(onTogglePause)}
        className="w-14 h-14 min-w-[56px] min-h-[56px] rounded-full bg-white/10 flex items-center justify-center touch-manipulation select-none"
        aria-label={isPaused ? 'Resume' : 'Pause'}
      >
        {isPaused ? (
          <Play className="w-7 h-7 text-green-400 ml-1" />
        ) : (
          <Pause className="w-7 h-7 text-white" />
        )}
      </motion.button>

      {/* Skip */}
      {hasNext && (
        <motion.button
          whileTap={{ scale: 0.85 }}
          onClick={handlePress(onSkipExercise)}
          className="w-14 h-14 min-w-[56px] min-h-[56px] rounded-full bg-white/10 flex items-center justify-center touch-manipulation select-none"
          aria-label="Skip exercise"
        >
          <SkipForward className="w-7 h-7 text-white" />
        </motion.button>
      )}

      {/* Finish */}
      <motion.button
        whileTap={{ scale: 0.85 }}
        onClick={handlePress(onFinishWorkout)}
        className="w-14 h-14 min-w-[56px] min-h-[56px] rounded-full bg-green-500/20 flex items-center justify-center touch-manipulation select-none"
        aria-label="Finish workout"
      >
        <Flag className="w-7 h-7 text-green-400" />
      </motion.button>
    </div>
  );
}

export default QuickControls;
