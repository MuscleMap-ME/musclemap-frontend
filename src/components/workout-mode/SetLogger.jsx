/**
 * SetLogger Component - Fullscreen Workout Mode
 *
 * Large touch-friendly set logging interface:
 * - Big number displays for reps and weight
 * - Large +/- buttons (64px+ touch targets)
 * - Quick increment buttons (+5, +10 for weight)
 * - "Log Set" button with success animation
 * - Previous set display for reference
 * - Personal record indicator
 * - RPE selector (optional)
 * - Swipe up to complete set support
 */

import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence, useMotionValue, useTransform } from 'framer-motion';
import { Minus, Plus, Check, Trophy, TrendingUp, ChevronUp, ChevronDown, Flame } from 'lucide-react';
import { haptic } from '../../utils/haptics';
import { calculate1RM, SET_TAGS } from '../../store/workoutSessionStore';
import { useShouldReduceMotion } from '../../contexts/MotionContext';

// Quick weight increment buttons
const WEIGHT_INCREMENTS = [
  { label: '+2.5', value: 2.5 },
  { label: '+5', value: 5 },
  { label: '+10', value: 10 },
  { label: '+25', value: 25 },
];

// Quick rep buttons
const REP_PRESETS = [5, 8, 10, 12, 15];

// RPE scale descriptions
const RPE_SCALE = [
  { value: 6, label: '6', description: 'Very Light' },
  { value: 7, label: '7', description: 'Light' },
  { value: 8, label: '8', description: 'Moderate' },
  { value: 9, label: '9', description: 'Hard' },
  { value: 10, label: '10', description: 'Max Effort' },
];

export function SetLogger({
  exercise,
  previousSet,
  bestWeight,
  best1RM,
  onLogSet,
  onStartTimer,
  defaultWeight = 0,
  defaultReps = 0,
  showRPE = true,
}) {
  const shouldReduceMotion = useShouldReduceMotion();

  // Local state
  const [weight, setWeight] = useState(defaultWeight);
  const [reps, setReps] = useState(defaultReps);
  const [rpe, setRpe] = useState(null);
  const [isLogging, setIsLogging] = useState(false);
  const [justLogged, setJustLogged] = useState(false);
  const [showRPESelector, setShowRPESelector] = useState(false);

  // Swipe up detection
  const containerRef = useRef(null);
  const dragY = useMotionValue(0);
  const dragOpacity = useTransform(dragY, [-100, 0], [0.5, 1]);
  const swipeIndicatorOpacity = useTransform(dragY, [-100, -30, 0], [1, 0.5, 0]);

  // Sync with defaults when they change (e.g., from previous set)
  useEffect(() => {
    if (defaultWeight > 0 && weight === 0) {
      setWeight(defaultWeight);
    }
  }, [defaultWeight]);

  // Handle swipe up to complete set
  const handleDragEnd = useCallback(
    (event, info) => {
      if (info.offset.y < -80 && weight > 0 && reps > 0 && !isLogging) {
        handleLogSet();
      }
    },
    [weight, reps, isLogging]
  );

  // Calculate estimated 1RM in real-time
  const estimated1RM = useMemo(() => {
    if (weight > 0 && reps > 0 && reps <= 15) {
      return calculate1RM(weight, reps);
    }
    return null;
  }, [weight, reps]);

  // Check if this would be a PR
  const wouldBePR = useMemo(() => {
    if (!estimated1RM) return false;
    return (best1RM && estimated1RM > best1RM) || (bestWeight && weight > bestWeight);
  }, [estimated1RM, best1RM, bestWeight, weight]);

  // Handle weight adjustment
  const adjustWeight = useCallback((delta) => {
    setWeight((prev) => Math.max(0, prev + delta));
    haptic('selection');
  }, []);

  // Handle reps adjustment
  const adjustReps = useCallback((delta) => {
    setReps((prev) => Math.max(0, prev + delta));
    haptic('selection');
  }, []);

  // Set specific rep count
  const setRepCount = useCallback((count) => {
    setReps(count);
    haptic('light');
  }, []);

  // Handle log set
  const handleLogSet = useCallback(async () => {
    if (weight <= 0 || reps <= 0) return;

    setIsLogging(true);
    haptic('success');

    const setData = {
      weight,
      reps,
      rpe: rpe || undefined,
      tag: SET_TAGS.WORKING,
    };

    try {
      await onLogSet?.(setData);
      setJustLogged(true);

      // Auto-start timer
      onStartTimer?.();

      // Reset after animation
      setTimeout(() => {
        setJustLogged(false);
        setReps(0);
        setRpe(null);
        setShowRPESelector(false);
        // Keep weight for next set
      }, 1500);
    } finally {
      setIsLogging(false);
    }
  }, [weight, reps, rpe, onLogSet, onStartTimer]);

  // Toggle RPE selector
  const toggleRPESelector = useCallback(() => {
    setShowRPESelector((prev) => !prev);
    haptic('light');
  }, []);

  // Select RPE value
  const selectRPE = useCallback((value) => {
    setRpe(value);
    haptic('selection');
  }, []);

  // Use previous set values
  const usePreviousSet = useCallback(() => {
    if (previousSet) {
      setWeight(previousSet.weight);
      setReps(previousSet.reps);
      haptic('light');
    }
  }, [previousSet]);

  return (
    <motion.div
      ref={containerRef}
      drag="y"
      dragConstraints={{ top: 0, bottom: 0 }}
      dragElastic={0.3}
      onDragEnd={handleDragEnd}
      style={{ y: dragY, opacity: dragOpacity }}
      className="flex flex-col items-center w-full max-w-md mx-auto relative"
    >
      {/* Swipe Up Indicator */}
      <motion.div
        style={{ opacity: swipeIndicatorOpacity }}
        className="absolute -top-16 left-1/2 -translate-x-1/2 flex flex-col items-center text-blue-400 pointer-events-none"
      >
        <ChevronUp className="w-8 h-8 animate-bounce" />
        <span className="text-sm font-medium">Swipe up to log</span>
      </motion.div>

      {/* PR Indicator */}
      <AnimatePresence>
        {wouldBePR && !justLogged && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={shouldReduceMotion ? { duration: 0 } : { type: 'spring' }}
            className="mb-4 px-4 py-2 rounded-full bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border border-yellow-500/30 flex items-center gap-2"
          >
            <Trophy className="w-5 h-5 text-yellow-400" />
            <span className="text-yellow-400 font-semibold">New PR!</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Previous Set Reference */}
      {previousSet && !justLogged && (
        <button
          onClick={usePreviousSet}
          className="mb-4 px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 transition-colors touch-manipulation"
        >
          <span className="text-gray-400 text-sm">Last set: </span>
          <span className="text-white font-semibold">
            {previousSet.weight} lbs x {previousSet.reps}
          </span>
          <span className="text-gray-500 text-sm ml-2">(tap to use)</span>
        </button>
      )}

      {/* Success Animation Overlay */}
      <AnimatePresence>
        {justLogged && (
          <motion.div
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.5 }}
            className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 z-10"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 300, damping: 20 }}
              className="w-24 h-24 rounded-full bg-green-500/20 border-2 border-green-500 flex items-center justify-center"
            >
              <Check className="w-12 h-12 text-green-400" />
            </motion.div>
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="mt-4 text-xl font-bold text-green-400"
            >
              Set Logged!
            </motion.p>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="text-gray-400"
            >
              {weight} lbs x {reps} reps
            </motion.p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Weight Input */}
      <div className="w-full mb-6">
        <label className="text-sm text-gray-400 mb-2 block text-center">WEIGHT (lbs)</label>
        <div className="flex items-center justify-center gap-4">
          {/* Decrease Button - 64px touch target */}
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => adjustWeight(-5)}
            className="w-16 h-16 min-w-[64px] min-h-[64px] rounded-2xl bg-white/10 hover:bg-white/20 active:bg-white/30 flex items-center justify-center transition-colors touch-manipulation select-none"
            aria-label="Decrease weight by 5"
          >
            <Minus className="w-8 h-8 text-white" />
          </motion.button>

          {/* Weight Display */}
          <div className="flex-1 max-w-[180px]">
            <motion.div
              key={weight}
              initial={shouldReduceMotion ? {} : { scale: 1.05 }}
              animate={{ scale: 1 }}
              transition={shouldReduceMotion ? { duration: 0 } : { type: 'spring', stiffness: 400 }}
              className={`text-6xl md:text-7xl font-bold text-center tabular-nums ${
                wouldBePR ? 'text-yellow-400' : 'text-white'
              }`}
            >
              {weight}
            </motion.div>
          </div>

          {/* Increase Button - 64px touch target */}
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => adjustWeight(5)}
            className="w-16 h-16 min-w-[64px] min-h-[64px] rounded-2xl bg-white/10 hover:bg-white/20 active:bg-white/30 flex items-center justify-center transition-colors touch-manipulation select-none"
            aria-label="Increase weight by 5"
          >
            <Plus className="w-8 h-8 text-white" />
          </motion.button>
        </div>

        {/* Quick Weight Increments */}
        <div className="flex justify-center gap-2 mt-3">
          {WEIGHT_INCREMENTS.map((inc) => (
            <motion.button
              key={inc.value}
              whileTap={{ scale: 0.95 }}
              onClick={() => adjustWeight(inc.value)}
              className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-sm font-medium transition-colors touch-manipulation"
            >
              {inc.label}
            </motion.button>
          ))}
        </div>
      </div>

      {/* Reps Input */}
      <div className="w-full mb-6">
        <label className="text-sm text-gray-400 mb-2 block text-center">REPS</label>
        <div className="flex items-center justify-center gap-4">
          {/* Decrease Button - 64px touch target */}
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => adjustReps(-1)}
            className="w-16 h-16 min-w-[64px] min-h-[64px] rounded-2xl bg-white/10 hover:bg-white/20 active:bg-white/30 flex items-center justify-center transition-colors touch-manipulation select-none"
            aria-label="Decrease reps"
          >
            <ChevronDown className="w-8 h-8 text-white" />
          </motion.button>

          {/* Reps Display */}
          <div className="flex-1 max-w-[180px]">
            <motion.div
              key={reps}
              initial={shouldReduceMotion ? {} : { scale: 1.05 }}
              animate={{ scale: 1 }}
              transition={shouldReduceMotion ? { duration: 0 } : { type: 'spring', stiffness: 400 }}
              className="text-6xl md:text-7xl font-bold text-center tabular-nums text-white"
            >
              {reps}
            </motion.div>
          </div>

          {/* Increase Button - 64px touch target */}
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => adjustReps(1)}
            className="w-16 h-16 min-w-[64px] min-h-[64px] rounded-2xl bg-white/10 hover:bg-white/20 active:bg-white/30 flex items-center justify-center transition-colors touch-manipulation select-none"
            aria-label="Increase reps"
          >
            <ChevronUp className="w-8 h-8 text-white" />
          </motion.button>
        </div>

        {/* Quick Rep Presets */}
        <div className="flex justify-center gap-2 mt-3">
          {REP_PRESETS.map((count) => (
            <motion.button
              key={count}
              whileTap={{ scale: 0.95 }}
              onClick={() => setRepCount(count)}
              className={`w-12 h-12 min-w-[48px] min-h-[48px] rounded-xl font-medium transition-colors touch-manipulation select-none ${
                reps === count
                  ? 'bg-blue-500/30 text-blue-400 border border-blue-500/40'
                  : 'bg-white/5 hover:bg-white/10 active:bg-white/20 text-gray-300'
              }`}
            >
              {count}
            </motion.button>
          ))}
        </div>
      </div>

      {/* RPE Selector (Optional) */}
      {showRPE && (
        <div className="w-full mb-6">
          <motion.button
            whileTap={{ scale: 0.98 }}
            onClick={toggleRPESelector}
            className={`w-full py-3 px-4 rounded-xl transition-colors touch-manipulation flex items-center justify-between ${
              rpe
                ? 'bg-orange-500/20 border border-orange-500/30'
                : 'bg-white/5 hover:bg-white/10'
            }`}
          >
            <div className="flex items-center gap-2">
              <Flame className={`w-5 h-5 ${rpe ? 'text-orange-400' : 'text-gray-400'}`} />
              <span className={rpe ? 'text-orange-400' : 'text-gray-400'}>
                {rpe ? `RPE ${rpe}` : 'Add RPE (optional)'}
              </span>
            </div>
            <ChevronDown
              className={`w-5 h-5 text-gray-400 transition-transform ${
                showRPESelector ? 'rotate-180' : ''
              }`}
            />
          </motion.button>

          <AnimatePresence>
            {showRPESelector && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={shouldReduceMotion ? { duration: 0 } : { duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="flex justify-center gap-2 mt-3">
                  {RPE_SCALE.map((item) => (
                    <motion.button
                      key={item.value}
                      whileTap={{ scale: 0.9 }}
                      onClick={() => selectRPE(item.value)}
                      className={`w-12 h-12 min-w-[48px] min-h-[48px] rounded-xl font-bold text-lg transition-colors touch-manipulation select-none ${
                        rpe === item.value
                          ? 'bg-orange-500/30 text-orange-400 border border-orange-500/40'
                          : 'bg-white/5 hover:bg-white/10 active:bg-white/20 text-gray-300'
                      }`}
                      title={item.description}
                    >
                      {item.label}
                    </motion.button>
                  ))}
                </div>
                {rpe && (
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-center text-sm text-orange-400/70 mt-2"
                  >
                    {RPE_SCALE.find((r) => r.value === rpe)?.description}
                  </motion.p>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* 1RM Estimate */}
      {estimated1RM && (
        <div className="w-full mb-6 px-4">
          <div
            className={`p-3 rounded-xl border ${
              wouldBePR
                ? 'bg-yellow-500/10 border-yellow-500/30'
                : 'bg-white/5 border-white/10'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TrendingUp className={`w-4 h-4 ${wouldBePR ? 'text-yellow-400' : 'text-gray-400'}`} />
                <span className="text-sm text-gray-400">Est. 1RM</span>
              </div>
              <span className={`font-bold ${wouldBePR ? 'text-yellow-400' : 'text-white'}`}>
                {estimated1RM} lbs
              </span>
            </div>
            {best1RM > 0 && (
              <div className="flex items-center justify-between mt-1">
                <span className="text-xs text-gray-500">Previous Best</span>
                <span className="text-xs text-gray-400">{best1RM} lbs</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Log Set Button - 64px height for easy tapping */}
      <motion.button
        whileTap={{ scale: 0.98 }}
        onClick={handleLogSet}
        disabled={weight <= 0 || reps <= 0 || isLogging}
        className={`w-full max-w-xs h-16 min-h-[64px] rounded-2xl font-bold text-xl transition-all touch-manipulation select-none ${
          weight > 0 && reps > 0
            ? wouldBePR
              ? 'bg-gradient-to-r from-yellow-600 to-orange-500 hover:from-yellow-500 hover:to-orange-400 active:from-yellow-400 active:to-orange-300 text-white shadow-lg shadow-yellow-500/20'
              : 'bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 active:from-blue-400 active:to-blue-300 text-white shadow-lg shadow-blue-500/20'
            : 'bg-white/10 text-gray-500 cursor-not-allowed'
        }`}
      >
        {isLogging ? (
          <div className="flex items-center justify-center gap-2">
            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            Logging...
          </div>
        ) : wouldBePR ? (
          <div className="flex items-center justify-center gap-2">
            <Trophy className="w-6 h-6" />
            Log PR Set
          </div>
        ) : (
          <div className="flex items-center justify-center gap-2">
            <Check className="w-6 h-6" />
            Log Set
          </div>
        )}
      </motion.button>

      {/* Swipe hint */}
      <p className="text-xs text-gray-500 mt-3 text-center">
        Swipe up to log set
      </p>
    </motion.div>
  );
}

export default SetLogger;
