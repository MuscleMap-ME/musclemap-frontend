/**
 * WorkoutCreditsCounter - Real-time credit counter during workouts
 *
 * Shows running total of credits earned during the current workout.
 * Updates with each rep/set completion.
 * Displays breakdown of earnings by category.
 */

import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Coins, ChevronDown, Zap, Trophy, Flame, Target } from 'lucide-react';

// Category icons
const CATEGORY_ICONS = {
  reps: Coins,
  sets: Coins,
  workout: Zap,
  pr: Trophy,
  bonus: Flame,
  volume: Target,
};

export function WorkoutCreditsCounter({
  totalCredits = 0,
  breakdown = {},
  potentialBonus = 0,
  showDetails = false,
  onToggleDetails,
  className = '',
}) {
  const [previousTotal, setPreviousTotal] = useState(totalCredits);
  const [isAnimating, setIsAnimating] = useState(false);

  // Animate on credit change
  useEffect(() => {
    if (totalCredits > previousTotal) {
      setIsAnimating(true);
      const timer = setTimeout(() => setIsAnimating(false), 500);
      return () => clearTimeout(timer);
    }
    setPreviousTotal(totalCredits);
  }, [totalCredits, previousTotal]);

  // Calculate breakdown totals
  const breakdownItems = useMemo(() => {
    return Object.entries(breakdown).map(([key, value]) => ({
      key,
      label: key.charAt(0).toUpperCase() + key.slice(1),
      value: typeof value === 'number' ? value : value.amount || 0,
      Icon: CATEGORY_ICONS[key] || Coins,
    })).filter(item => item.value > 0);
  }, [breakdown]);

  return (
    <motion.div
      className={`
        bg-gradient-to-br from-amber-500/10 to-yellow-500/10
        border border-amber-400/30 rounded-xl overflow-hidden
        ${className}
      `}
      layout
    >
      {/* Main counter */}
      <button
        className="w-full px-4 py-3 flex items-center justify-between"
        onClick={onToggleDetails}
      >
        <div className="flex items-center gap-3">
          <motion.div
            className={`
              p-2 rounded-lg
              ${isAnimating
                ? 'bg-gradient-to-br from-amber-400 to-yellow-500'
                : 'bg-amber-500/20'
              }
            `}
            animate={isAnimating ? { scale: [1, 1.2, 1] } : {}}
          >
            <Coins className="w-5 h-5 text-amber-400" />
          </motion.div>

          <div className="text-left">
            <div className="text-xs text-amber-300/70 uppercase tracking-wide">
              Credits Earned
            </div>
            <motion.div
              className="text-2xl font-bold text-amber-300"
              animate={isAnimating ? { scale: [1, 1.1, 1] } : {}}
            >
              <AnimatePresence mode="wait">
                <motion.span
                  key={totalCredits}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                >
                  +{totalCredits}
                </motion.span>
              </AnimatePresence>
            </motion.div>
          </div>
        </div>

        {/* Potential bonus indicator */}
        {potentialBonus > 0 && (
          <div className="text-right mr-2">
            <div className="text-xs text-white/50">+ at completion</div>
            <div className="text-sm font-medium text-amber-400">
              +{potentialBonus}
            </div>
          </div>
        )}

        {/* Expand/collapse */}
        {breakdownItems.length > 0 && (
          <motion.div
            animate={{ rotate: showDetails ? 180 : 0 }}
            className="text-white/50"
          >
            <ChevronDown className="w-5 h-5" />
          </motion.div>
        )}
      </button>

      {/* Breakdown details */}
      <AnimatePresence>
        {showDetails && breakdownItems.length > 0 && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-t border-amber-400/20"
          >
            <div className="px-4 py-3 space-y-2">
              {breakdownItems.map((item, index) => (
                <motion.div
                  key={item.key}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="flex items-center justify-between"
                >
                  <div className="flex items-center gap-2">
                    <item.Icon className="w-4 h-4 text-amber-400/70" />
                    <span className="text-sm text-white/70">{item.label}</span>
                  </div>
                  <span className="text-sm font-medium text-amber-300">
                    +{item.value}
                  </span>
                </motion.div>
              ))}

              {/* PR hint */}
              {!breakdown.pr && (
                <div className="pt-2 border-t border-amber-400/10">
                  <div className="flex items-center gap-2 text-xs text-white/40">
                    <Trophy className="w-3 h-3" />
                    <span>Hit a PR for +100 bonus!</span>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating +credits animation */}
      <AnimatePresence>
        {isAnimating && totalCredits > previousTotal && (
          <motion.div
            className="absolute -top-2 right-4 text-amber-300 font-bold pointer-events-none"
            initial={{ opacity: 1, y: 0 }}
            animate={{ opacity: 0, y: -30 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8 }}
          >
            +{totalCredits - previousTotal}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default WorkoutCreditsCounter;
