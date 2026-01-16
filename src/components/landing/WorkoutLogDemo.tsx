/**
 * WorkoutLogDemo Component
 *
 * Interactive demo showing workout logging functionality.
 * Features a mini workout card with set tracking and visual feedback.
 */

import React, { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';

// Demo workout data
const DEMO_WORKOUT = {
  name: 'Bench Press',
  weight: 135,
  unit: 'lbs',
  targetReps: 10,
  totalSets: 4,
};

// Muscle activation mini visualization
function MuscleActivation({ activeSets }) {
  const intensity = Math.min(activeSets / 4, 1);
  const glowIntensity = 4 + intensity * 8;

  return (
    <svg viewBox="0 0 60 80" className="w-12 h-16">
      {/* Simple torso outline */}
      <path
        d="M 30 10 Q 20 10, 15 15 Q 10 25, 10 35 Q 10 45, 15 55 L 15 70 L 20 70 L 22 55 Q 30 58, 38 55 L 40 70 L 45 70 L 45 55 Q 50 45, 50 35 Q 50 25, 45 15 Q 40 10, 30 10"
        fill="rgba(255,255,255,0.05)"
        stroke="rgba(255,255,255,0.2)"
        strokeWidth="0.5"
      />

      {/* Chest muscles - glow based on sets completed */}
      <motion.path
        d="M 18 22 Q 12 25, 12 32 Q 12 38, 18 42 Q 24 45, 28 40 Q 30 35, 28 28 Q 25 22, 18 22"
        fill="#ef4444"
        initial={{ opacity: 0.2 }}
        animate={{
          opacity: 0.2 + intensity * 0.6,
          filter: activeSets > 0 ? `drop-shadow(0 0 ${glowIntensity}px #ff6b6b)` : 'none',
        }}
      />
      <motion.path
        d="M 42 22 Q 48 25, 48 32 Q 48 38, 42 42 Q 36 45, 32 40 Q 30 35, 32 28 Q 35 22, 42 22"
        fill="#ef4444"
        initial={{ opacity: 0.2 }}
        animate={{
          opacity: 0.2 + intensity * 0.6,
          filter: activeSets > 0 ? `drop-shadow(0 0 ${glowIntensity}px #ff6b6b)` : 'none',
        }}
      />
    </svg>
  );
}

// Checkmark animation
function CheckmarkAnimation({ onComplete }) {
  useEffect(() => {
    const timer = setTimeout(onComplete, 600);
    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <motion.div
      className="absolute inset-0 flex items-center justify-center bg-green-500/20 rounded-lg"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.svg
        className="w-8 h-8 text-green-400"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={3}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <motion.path
          d="M5 12l5 5L20 7"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.3 }}
        />
      </motion.svg>
    </motion.div>
  );
}

// Set indicator dots
function SetIndicators({ currentSet, totalSets }) {
  return (
    <div className="flex items-center gap-1.5">
      {Array.from({ length: totalSets }, (_, i) => {
        const isCompleted = i < currentSet;
        const isCurrent = i === currentSet;

        return (
          <motion.div
            key={i}
            className="w-2 h-2 rounded-full"
            initial={{ scale: 0.8 }}
            animate={{
              scale: isCurrent ? 1.2 : 1,
              backgroundColor: isCompleted
                ? '#10b981'
                : isCurrent
                  ? '#3b82f6'
                  : 'rgba(255,255,255,0.2)',
              boxShadow: isCurrent ? '0 0 8px rgba(59, 130, 246, 0.5)' : 'none',
            }}
            transition={{ type: 'spring', damping: 15 }}
          />
        );
      })}
    </div>
  );
}

export default function WorkoutLogDemo({ className = '' }) {
  const [currentSet, setCurrentSet] = useState(1);
  const [showCheckmark, setShowCheckmark] = useState(false);
  const [isLogging, setIsLogging] = useState(false);
  const [workoutComplete, setWorkoutComplete] = useState(false);
  const prefersReducedMotion = useReducedMotion();

  // Handle log set
  const handleLogSet = useCallback(() => {
    if (isLogging || workoutComplete) return;

    setIsLogging(true);
    setShowCheckmark(true);
  }, [isLogging, workoutComplete]);

  // Handle checkmark animation complete
  const handleCheckmarkComplete = useCallback(() => {
    setShowCheckmark(false);
    setIsLogging(false);

    if (currentSet >= DEMO_WORKOUT.totalSets) {
      setWorkoutComplete(true);
      // Reset after showing completion
      setTimeout(() => {
        setWorkoutComplete(false);
        setCurrentSet(1);
      }, 2000);
    } else {
      setCurrentSet((prev) => prev + 1);
    }
  }, [currentSet]);

  return (
    <div className={`workout-log-demo ${className}`}>
      {/* Demo container with glass styling */}
      <div className="rounded-xl border border-white/10 bg-white/5 backdrop-blur-sm p-4 max-w-[280px] mx-auto">
        {/* Header */}
        <div className="text-center mb-3">
          <h3 className="text-sm font-semibold text-white mb-1">Workout Logging</h3>
          <p className="text-xs text-gray-400">Track sets with one tap</p>
        </div>

        {/* Workout Card */}
        <div className="rounded-lg border border-white/10 bg-white/5 p-3 mb-3 relative overflow-hidden">
          {/* Checkmark overlay */}
          <AnimatePresence>
            {showCheckmark && !prefersReducedMotion && (
              <CheckmarkAnimation onComplete={handleCheckmarkComplete} />
            )}
          </AnimatePresence>

          <div className="flex items-center gap-3">
            {/* Muscle visualization */}
            <div className="flex-shrink-0">
              <MuscleActivation activeSets={currentSet - 1} />
            </div>

            {/* Exercise info */}
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-white text-sm mb-1">
                {DEMO_WORKOUT.name}
              </div>
              <div className="text-xs text-gray-400 mb-2">
                {DEMO_WORKOUT.weight} {DEMO_WORKOUT.unit} x {DEMO_WORKOUT.targetReps} reps
              </div>

              {/* Set indicators */}
              <SetIndicators currentSet={currentSet - 1} totalSets={DEMO_WORKOUT.totalSets} />
            </div>
          </div>
        </div>

        {/* Set counter */}
        <div className="text-center mb-3">
          <AnimatePresence mode="wait">
            {workoutComplete ? (
              <motion.div
                key="complete"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="text-green-400 font-semibold"
              >
                Exercise Complete!
              </motion.div>
            ) : (
              <motion.div
                key={currentSet}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="text-gray-300"
              >
                <span className="text-xl font-bold text-white">{currentSet}</span>
                <span className="text-gray-500"> / {DEMO_WORKOUT.totalSets} sets</span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Log Set Button */}
        <motion.button
          onClick={handleLogSet}
          disabled={isLogging || workoutComplete}
          className="w-full py-2.5 px-4 rounded-lg font-semibold text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          style={{
            background: workoutComplete
              ? 'linear-gradient(135deg, #10b981, #059669)'
              : isLogging
                ? 'rgba(75, 85, 99, 0.5)'
                : 'linear-gradient(135deg, #3b82f6, #2563eb)',
            boxShadow: isLogging || workoutComplete
              ? 'none'
              : '0 4px 15px rgba(59, 130, 246, 0.3)',
          }}
          whileHover={!isLogging && !workoutComplete ? { scale: 1.02 } : {}}
          whileTap={!isLogging && !workoutComplete ? { scale: 0.98 } : {}}
        >
          <span className="flex items-center justify-center gap-2">
            {workoutComplete ? (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Done!
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                Log Set {currentSet}
              </>
            )}
          </span>
        </motion.button>

        {/* Rest timer hint */}
        <div className="mt-3 pt-3 border-t border-white/10">
          <div className="flex items-center justify-between text-xs text-gray-500">
            <span>Rest timer</span>
            <span className="font-mono text-gray-400">1:30</span>
          </div>
        </div>
      </div>
    </div>
  );
}
