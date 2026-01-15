/**
 * ExerciseDisplay Component - Current Exercise with Muscle Visualization
 *
 * Displays the current exercise prominently with:
 * - Large exercise name
 * - Muscle visualization showing targeted muscles
 * - Set progress indicator
 * - Exercise details (equipment, difficulty)
 *
 * @example
 * <ExerciseDisplay
 *   exercise={currentExercise}
 *   setNumber={2}
 *   totalSets={4}
 * />
 */

import React, { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Dumbbell, Target, Zap, Activity } from 'lucide-react';
import { useShouldReduceMotion } from '../../contexts/MotionContext';

// Muscle groups for visualization
const MUSCLE_POSITIONS = {
  chest: { x: 50, y: 25, size: 'lg' },
  back: { x: 50, y: 30, size: 'lg' },
  shoulders: { x: 30, y: 18, size: 'md', mirror: true },
  biceps: { x: 22, y: 35, size: 'sm', mirror: true },
  triceps: { x: 78, y: 35, size: 'sm' },
  forearms: { x: 20, y: 48, size: 'xs', mirror: true },
  abs: { x: 50, y: 42, size: 'md' },
  obliques: { x: 38, y: 40, size: 'sm', mirror: true },
  quads: { x: 42, y: 60, size: 'md', mirror: true },
  hamstrings: { x: 42, y: 65, size: 'md', mirror: true },
  glutes: { x: 50, y: 52, size: 'md' },
  calves: { x: 42, y: 80, size: 'sm', mirror: true },
  traps: { x: 50, y: 12, size: 'md' },
  lats: { x: 35, y: 32, size: 'md', mirror: true },
  lower_back: { x: 50, y: 45, size: 'md' },
  core: { x: 50, y: 40, size: 'md' },
};

const MUSCLE_SIZES = {
  lg: 24,
  md: 18,
  sm: 14,
  xs: 10,
};

/**
 * Simple muscle visualization using circles
 */
function MuscleVisualization({ primaryMuscles = [], secondaryMuscles = [] }) {
  const shouldReduceMotion = useShouldReduceMotion();

  // Create muscle dots with positions
  const muscleDots = useMemo(() => {
    const dots = [];

    // Add primary muscles (bright, larger)
    primaryMuscles.forEach((muscle) => {
      const pos = MUSCLE_POSITIONS[muscle.toLowerCase()];
      if (pos) {
        dots.push({
          id: muscle,
          x: pos.x,
          y: pos.y,
          size: MUSCLE_SIZES[pos.size] * 1.2,
          isPrimary: true,
        });
        // Add mirrored muscle if applicable
        if (pos.mirror) {
          dots.push({
            id: `${muscle}-mirror`,
            x: 100 - pos.x,
            y: pos.y,
            size: MUSCLE_SIZES[pos.size] * 1.2,
            isPrimary: true,
          });
        }
      }
    });

    // Add secondary muscles (dimmer, smaller)
    secondaryMuscles.forEach((muscle) => {
      const pos = MUSCLE_POSITIONS[muscle.toLowerCase()];
      if (pos) {
        dots.push({
          id: muscle,
          x: pos.x,
          y: pos.y,
          size: MUSCLE_SIZES[pos.size],
          isPrimary: false,
        });
        if (pos.mirror) {
          dots.push({
            id: `${muscle}-mirror`,
            x: 100 - pos.x,
            y: pos.y,
            size: MUSCLE_SIZES[pos.size],
            isPrimary: false,
          });
        }
      }
    });

    return dots;
  }, [primaryMuscles, secondaryMuscles]);

  if (muscleDots.length === 0) {
    return (
      <div className="w-full h-32 flex items-center justify-center">
        <Activity className="w-12 h-12 text-gray-600" />
      </div>
    );
  }

  return (
    <div className="relative w-full h-32">
      {/* Body outline - simplified */}
      <svg
        viewBox="0 0 100 100"
        className="absolute inset-0 w-full h-full"
        preserveAspectRatio="xMidYMid meet"
      >
        {/* Simple body silhouette */}
        <ellipse
          cx="50"
          cy="10"
          rx="8"
          ry="10"
          fill="none"
          stroke="rgba(255,255,255,0.1)"
          strokeWidth="1"
        />
        <path
          d="M 42 15 Q 30 20 28 35 L 20 55 L 25 55 L 32 38 Q 35 45 35 55 L 35 85 L 42 85 L 42 55 L 50 55 L 58 55 L 58 85 L 65 85 L 65 55 Q 65 45 68 38 L 75 55 L 80 55 L 72 35 Q 70 20 58 15"
          fill="none"
          stroke="rgba(255,255,255,0.1)"
          strokeWidth="1"
        />
      </svg>

      {/* Muscle activation dots */}
      <svg
        viewBox="0 0 100 100"
        className="absolute inset-0 w-full h-full"
        preserveAspectRatio="xMidYMid meet"
      >
        {muscleDots.map((dot, index) => (
          <motion.g key={dot.id}>
            {/* Glow effect */}
            <motion.circle
              cx={dot.x}
              cy={dot.y}
              r={dot.size * 1.5}
              fill={dot.isPrimary ? 'rgba(0, 102, 255, 0.3)' : 'rgba(0, 102, 255, 0.15)'}
              initial={{ opacity: 0, scale: 0 }}
              animate={{
                opacity: 1,
                scale: shouldReduceMotion ? 1 : [1, 1.2, 1],
              }}
              transition={
                shouldReduceMotion
                  ? { duration: 0 }
                  : {
                      delay: index * 0.05,
                      duration: 2,
                      repeat: Infinity,
                      ease: 'easeInOut',
                    }
              }
            />
            {/* Core dot */}
            <motion.circle
              cx={dot.x}
              cy={dot.y}
              r={dot.size / 2}
              fill={dot.isPrimary ? '#0066FF' : 'rgba(0, 102, 255, 0.6)'}
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={
                shouldReduceMotion
                  ? { duration: 0 }
                  : { delay: index * 0.05, type: 'spring', stiffness: 300 }
              }
            />
          </motion.g>
        ))}
      </svg>
    </div>
  );
}

/**
 * ExerciseDisplay Component
 */
export function ExerciseDisplay({
  exercise,
  setNumber = 1,
  totalSets = 3,
}) {
  const shouldReduceMotion = useShouldReduceMotion();

  if (!exercise) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-400">No exercise selected</p>
      </div>
    );
  }

  const primaryMuscles = exercise.primaryMuscles || exercise.primary_muscles || [];
  const secondaryMuscles = exercise.secondaryMuscles || exercise.secondary_muscles || [];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={shouldReduceMotion ? { duration: 0 } : { duration: 0.3 }}
      className="text-center"
    >
      {/* Exercise Name */}
      <AnimatePresence mode="wait">
        <motion.h1
          key={exercise.id || exercise.name}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={shouldReduceMotion ? { duration: 0 } : { duration: 0.2 }}
          className="text-2xl md:text-3xl font-bold text-white mb-2"
        >
          {exercise.name}
        </motion.h1>
      </AnimatePresence>

      {/* Set Progress */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={shouldReduceMotion ? { duration: 0 } : { delay: 0.1 }}
        className="flex items-center justify-center gap-2 mb-4"
      >
        <span className="text-blue-400 font-semibold">
          Set {setNumber}
        </span>
        <span className="text-gray-500">/</span>
        <span className="text-gray-400">{totalSets}</span>

        {/* Set progress dots */}
        <div className="flex gap-1.5 ml-3">
          {Array.from({ length: totalSets }).map((_, i) => (
            <motion.div
              key={i}
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={
                shouldReduceMotion
                  ? { duration: 0 }
                  : { delay: 0.15 + i * 0.05, type: 'spring' }
              }
              className={`w-2.5 h-2.5 rounded-full transition-colors ${
                i < setNumber - 1
                  ? 'bg-green-500'
                  : i === setNumber - 1
                  ? 'bg-blue-500'
                  : 'bg-gray-600'
              }`}
            />
          ))}
        </div>
      </motion.div>

      {/* Muscle Visualization */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={shouldReduceMotion ? { duration: 0 } : { delay: 0.2 }}
        className="mb-4"
      >
        <MuscleVisualization
          primaryMuscles={primaryMuscles}
          secondaryMuscles={secondaryMuscles}
        />
      </motion.div>

      {/* Muscle Tags */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={shouldReduceMotion ? { duration: 0 } : { delay: 0.3 }}
        className="flex flex-wrap justify-center gap-2"
      >
        {/* Primary muscles */}
        {primaryMuscles.map((muscle) => (
          <span
            key={muscle}
            className="px-3 py-1 rounded-full bg-blue-500/20 text-blue-400 text-sm font-medium"
          >
            <Target className="w-3 h-3 inline mr-1" />
            {muscle}
          </span>
        ))}

        {/* Secondary muscles */}
        {secondaryMuscles.slice(0, 2).map((muscle) => (
          <span
            key={muscle}
            className="px-3 py-1 rounded-full bg-gray-500/20 text-gray-400 text-sm"
          >
            {muscle}
          </span>
        ))}
        {secondaryMuscles.length > 2 && (
          <span className="px-3 py-1 rounded-full bg-gray-500/20 text-gray-400 text-sm">
            +{secondaryMuscles.length - 2} more
          </span>
        )}
      </motion.div>

      {/* Exercise Details */}
      {(exercise.equipment || exercise.difficulty) && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={shouldReduceMotion ? { duration: 0 } : { delay: 0.4 }}
          className="flex items-center justify-center gap-4 mt-3 text-gray-500 text-sm"
        >
          {exercise.equipment && (
            <span className="flex items-center gap-1">
              <Dumbbell className="w-4 h-4" />
              {exercise.equipment}
            </span>
          )}
          {exercise.difficulty && (
            <span className="flex items-center gap-1">
              <Zap className="w-4 h-4" />
              {exercise.difficulty}
            </span>
          )}
        </motion.div>
      )}
    </motion.div>
  );
}

export default ExerciseDisplay;
