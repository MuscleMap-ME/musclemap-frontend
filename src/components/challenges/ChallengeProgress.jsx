/**
 * ChallengeProgress Component
 *
 * Animated progress bar with milestone markers, glow effects,
 * and celebration particles when complete.
 *
 * @example
 * <ChallengeProgress
 *   current={3}
 *   target={5}
 *   isComplete={false}
 *   variant="brand"
 * />
 */

import React, { useMemo, useEffect, useState, useRef } from 'react';
import PropTypes from 'prop-types';
import { motion, AnimatePresence } from 'framer-motion';
import clsx from 'clsx';

/**
 * Generate milestone positions based on target
 * @param {number} target - Target value
 * @returns {Array} Array of milestone percentages
 */
function getMilestones(target) {
  if (target <= 3) return [];
  if (target <= 5) return [50];
  if (target <= 10) return [25, 50, 75];
  return [25, 50, 75];
}

/**
 * Particle component for completion celebration
 */
function CompletionParticle({ delay, color }) {
  return (
    <motion.div
      className="absolute w-1.5 h-1.5 rounded-full"
      style={{
        backgroundColor: color,
        left: '50%',
        top: '50%',
      }}
      initial={{
        x: 0,
        y: 0,
        opacity: 1,
        scale: 1,
      }}
      animate={{
        x: (Math.random() - 0.5) * 80,
        y: (Math.random() - 0.5) * 40 - 20,
        opacity: 0,
        scale: 0,
      }}
      transition={{
        duration: 0.8,
        delay,
        ease: 'easeOut',
      }}
    />
  );
}

CompletionParticle.propTypes = {
  delay: PropTypes.number.isRequired,
  color: PropTypes.string.isRequired,
};

/**
 * ChallengeProgress Component
 */
export function ChallengeProgress({
  current = 0,
  target = 100,
  isComplete = false,
  variant = 'brand',
  size = 'md',
  showMilestones = true,
  showLabel = false,
  className,
}) {
  const percentage = useMemo(
    () => Math.min(100, Math.max(0, (current / target) * 100)),
    [current, target]
  );

  const milestones = useMemo(
    () => (showMilestones ? getMilestones(target) : []),
    [target, showMilestones]
  );

  // Track if we just completed for particle animation
  const [showParticles, setShowParticles] = useState(false);
  const wasComplete = useRef(isComplete);

  useEffect(() => {
    if (isComplete && !wasComplete.current) {
      setShowParticles(true);
      const timer = setTimeout(() => setShowParticles(false), 1000);
      return () => clearTimeout(timer);
    }
    wasComplete.current = isComplete;
  }, [isComplete]);

  // Generate particle colors based on variant
  const particleColors = useMemo(() => {
    const colorMap = {
      brand: ['#0066ff', '#00aaff', '#1a80ff'],
      pulse: ['#ff3366', '#ff4d74', '#ff1a4c'],
      success: ['#22c55e', '#10b981', '#34d399'],
      gold: ['#ffd700', '#f59e0b', '#fbbf24'],
    };
    return colorMap[variant] || colorMap.brand;
  }, [variant]);

  const sizeStyles = {
    sm: 'h-1.5',
    md: 'h-2',
    lg: 'h-3',
    xl: 'h-4',
  };

  const variantGradients = {
    brand: 'from-[var(--brand-blue-500)] to-[var(--brand-blue-400)]',
    pulse: 'from-[var(--brand-pulse-500)] to-[var(--brand-pulse-400)]',
    success: 'from-emerald-500 to-emerald-400',
    gold: 'from-amber-500 to-yellow-400',
  };

  const variantGlows = {
    brand: 'shadow-[0_0_12px_rgba(0,102,255,0.5)]',
    pulse: 'shadow-[0_0_12px_rgba(255,51,102,0.5)]',
    success: 'shadow-[0_0_12px_rgba(34,197,94,0.5)]',
    gold: 'shadow-[0_0_12px_rgba(255,215,0,0.5)]',
  };

  return (
    <div className={clsx('relative w-full', className)}>
      {/* Label */}
      {showLabel && (
        <div className="flex justify-between items-center mb-1">
          <span className="text-xs text-[var(--text-tertiary)]">
            {current.toLocaleString()} / {target.toLocaleString()}
          </span>
          <span className="text-xs text-[var(--text-secondary)] font-medium">
            {Math.round(percentage)}%
          </span>
        </div>
      )}

      {/* Progress track */}
      <div
        className={clsx(
          'relative w-full overflow-hidden rounded-full',
          'bg-[var(--glass-white-5)] border border-[var(--border-subtle)]',
          sizeStyles[size]
        )}
      >
        {/* Milestone markers */}
        {milestones.map((pos) => (
          <div
            key={pos}
            className={clsx(
              'absolute top-0 bottom-0 w-px',
              percentage >= pos
                ? 'bg-white/30'
                : 'bg-[var(--glass-white-10)]'
            )}
            style={{ left: `${pos}%` }}
          />
        ))}

        {/* Progress fill */}
        <motion.div
          className={clsx(
            'absolute inset-y-0 left-0 rounded-full',
            'bg-gradient-to-r',
            variantGradients[variant],
            isComplete && variantGlows[variant]
          )}
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{
            type: 'spring',
            stiffness: 80,
            damping: 15,
            mass: 0.5,
          }}
        >
          {/* Shimmer effect */}
          <motion.div
            className="absolute inset-0 overflow-hidden rounded-full"
            initial={false}
          >
            <motion.div
              className="absolute inset-0"
              style={{
                background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.3) 50%, transparent 100%)',
              }}
              animate={{
                x: ['-100%', '200%'],
              }}
              transition={{
                repeat: Infinity,
                duration: 2,
                ease: 'linear',
                repeatDelay: 1,
              }}
            />
          </motion.div>

          {/* Glow pulse on complete */}
          <AnimatePresence>
            {isComplete && (
              <motion.div
                className={clsx(
                  'absolute inset-0 rounded-full',
                  variantGlows[variant]
                )}
                initial={{ opacity: 0 }}
                animate={{
                  opacity: [0.5, 1, 0.5],
                }}
                exit={{ opacity: 0 }}
                transition={{
                  duration: 1.5,
                  repeat: Infinity,
                  ease: 'easeInOut',
                }}
              />
            )}
          </AnimatePresence>
        </motion.div>

        {/* Completion particles */}
        <AnimatePresence>
          {showParticles && (
            <div className="absolute inset-0 overflow-visible pointer-events-none">
              {Array.from({ length: 12 }).map((_, i) => (
                <CompletionParticle
                  key={i}
                  delay={i * 0.05}
                  color={particleColors[i % particleColors.length]}
                />
              ))}
            </div>
          )}
        </AnimatePresence>
      </div>

      <style>{`
        @media (prefers-reduced-motion: reduce) {
          .challenge-progress-shimmer {
            animation: none;
          }
        }
      `}</style>
    </div>
  );
}

ChallengeProgress.propTypes = {
  current: PropTypes.number,
  target: PropTypes.number,
  isComplete: PropTypes.bool,
  variant: PropTypes.oneOf(['brand', 'pulse', 'success', 'gold']),
  size: PropTypes.oneOf(['sm', 'md', 'lg', 'xl']),
  showMilestones: PropTypes.bool,
  showLabel: PropTypes.bool,
  className: PropTypes.string,
};

export default ChallengeProgress;
