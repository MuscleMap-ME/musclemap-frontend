/**
 * ChallengeReward Component
 *
 * Animated reward reveal with confetti, bouncy numbers,
 * and celebration effects.
 *
 * @example
 * <ChallengeReward
 *   xp={100}
 *   credits={25}
 *   isRevealing={true}
 *   onComplete={() => console.log('Animation done')}
 * />
 */

import React, { useState, useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import { motion, AnimatePresence } from 'framer-motion';
import clsx from 'clsx';

/**
 * Confetti particle for reward celebration
 */
function RewardParticle({ index, total }) {
  const angle = (index / total) * Math.PI * 2;
  const distance = 40 + Math.random() * 30;
  const colors = ['#ffd700', '#ff3366', '#0066ff', '#22c55e', '#8b5cf6'];
  const color = colors[index % colors.length];
  const size = 4 + Math.random() * 4;

  return (
    <motion.div
      className="absolute rounded-full"
      style={{
        backgroundColor: color,
        width: size,
        height: size,
        left: '50%',
        top: '50%',
        marginLeft: -size / 2,
        marginTop: -size / 2,
      }}
      initial={{
        x: 0,
        y: 0,
        opacity: 1,
        scale: 1,
      }}
      animate={{
        x: Math.cos(angle) * distance,
        y: Math.sin(angle) * distance - 10,
        opacity: 0,
        scale: 0.5,
        rotate: Math.random() * 360,
      }}
      transition={{
        duration: 0.8 + Math.random() * 0.4,
        ease: [0.25, 0.46, 0.45, 0.94],
      }}
    />
  );
}

RewardParticle.propTypes = {
  index: PropTypes.number.isRequired,
  total: PropTypes.number.isRequired,
};

/**
 * Animated number that bounces in
 */
function BouncyNumber({ value, prefix = '', suffix = '', delay = 0, color }) {
  const [displayValue, setDisplayValue] = useState(0);
  const animationRef = useRef(null);

  useEffect(() => {
    const startTime = performance.now();
    const duration = 600;

    const animate = (currentTime) => {
      const elapsed = currentTime - startTime - delay * 1000;
      if (elapsed < 0) {
        animationRef.current = requestAnimationFrame(animate);
        return;
      }

      const progress = Math.min(elapsed / duration, 1);
      // Ease out elastic
      const eased = progress === 1
        ? 1
        : Math.pow(2, -10 * progress) * Math.sin((progress * 10 - 0.75) * ((2 * Math.PI) / 3)) + 1;

      setDisplayValue(Math.floor(value * eased));

      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate);
      }
    };

    animationRef.current = requestAnimationFrame(animate);
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [value, delay]);

  return (
    <motion.span
      className="font-bold tabular-nums"
      style={{ color }}
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{
        type: 'spring',
        stiffness: 400,
        damping: 15,
        delay,
      }}
    >
      {prefix}
      {displayValue.toLocaleString()}
      {suffix}
    </motion.span>
  );
}

BouncyNumber.propTypes = {
  value: PropTypes.number.isRequired,
  prefix: PropTypes.string,
  suffix: PropTypes.string,
  delay: PropTypes.number,
  color: PropTypes.string,
};

/**
 * ChallengeReward Component
 */
export function ChallengeReward({
  xp = 0,
  credits = 0,
  isRevealing = false,
  onComplete,
  size = 'md',
  showLabels = true,
  className,
}) {
  const [showParticles, setShowParticles] = useState(false);
  const completedRef = useRef(false);

  // Trigger particles on reveal
  useEffect(() => {
    if (isRevealing && !completedRef.current) {
      setShowParticles(true);
      const particleTimer = setTimeout(() => setShowParticles(false), 1000);
      const completeTimer = setTimeout(() => {
        completedRef.current = true;
        onComplete?.();
      }, 1200);
      return () => {
        clearTimeout(particleTimer);
        clearTimeout(completeTimer);
      };
    }
  }, [isRevealing, onComplete]);

  // Reset on new reveal
  useEffect(() => {
    if (!isRevealing) {
      completedRef.current = false;
    }
  }, [isRevealing]);

  const sizeStyles = {
    sm: {
      container: 'gap-2',
      icon: 'text-base',
      value: 'text-sm',
      label: 'text-[10px]',
    },
    md: {
      container: 'gap-3',
      icon: 'text-xl',
      value: 'text-lg',
      label: 'text-xs',
    },
    lg: {
      container: 'gap-4',
      icon: 'text-2xl',
      value: 'text-xl',
      label: 'text-sm',
    },
  };

  const styles = sizeStyles[size];

  return (
    <div className={clsx('relative', className)}>
      <AnimatePresence>
        {isRevealing && (
          <motion.div
            className={clsx(
              'flex items-center justify-center',
              styles.container
            )}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{
              type: 'spring',
              stiffness: 300,
              damping: 20,
            }}
          >
            {/* XP Reward */}
            {xp > 0 && (
              <motion.div
                className="relative flex flex-col items-center"
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.1 }}
              >
                <div className={clsx('flex items-center gap-1', styles.icon)}>
                  <span>&#x2B50;</span>
                  <BouncyNumber
                    value={xp}
                    suffix=""
                    delay={0.2}
                    color="var(--brand-pulse-400)"
                  />
                </div>
                {showLabels && (
                  <motion.span
                    className={clsx(
                      'text-[var(--text-tertiary)] uppercase tracking-wider',
                      styles.label
                    )}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.4 }}
                  >
                    XP
                  </motion.span>
                )}
              </motion.div>
            )}

            {/* Divider */}
            {xp > 0 && credits > 0 && (
              <motion.div
                className="h-8 w-px bg-[var(--border-default)]"
                initial={{ scaleY: 0, opacity: 0 }}
                animate={{ scaleY: 1, opacity: 1 }}
                transition={{ delay: 0.3 }}
              />
            )}

            {/* Credits Reward */}
            {credits > 0 && (
              <motion.div
                className="relative flex flex-col items-center"
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.2 }}
              >
                <div className={clsx('flex items-center gap-1', styles.icon)}>
                  <span>&#x1F4B0;</span>
                  <BouncyNumber
                    value={credits}
                    suffix=""
                    delay={0.3}
                    color="var(--brand-blue-400)"
                  />
                </div>
                {showLabels && (
                  <motion.span
                    className={clsx(
                      'text-[var(--text-tertiary)] uppercase tracking-wider',
                      styles.label
                    )}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.5 }}
                  >
                    Credits
                  </motion.span>
                )}
              </motion.div>
            )}

            {/* Confetti particles */}
            {showParticles && (
              <div className="absolute inset-0 pointer-events-none overflow-visible">
                {Array.from({ length: 20 }).map((_, i) => (
                  <RewardParticle key={i} index={i} total={20} />
                ))}
              </div>
            )}

            {/* Glow effect */}
            <motion.div
              className="absolute inset-0 -z-10 rounded-lg"
              style={{
                background: 'radial-gradient(circle, rgba(255,215,0,0.15) 0%, transparent 70%)',
              }}
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{
                opacity: [0, 0.8, 0.4],
                scale: [0.5, 1.2, 1],
              }}
              transition={{
                duration: 0.6,
                ease: 'easeOut',
              }}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

ChallengeReward.propTypes = {
  xp: PropTypes.number,
  credits: PropTypes.number,
  isRevealing: PropTypes.bool,
  onComplete: PropTypes.func,
  size: PropTypes.oneOf(['sm', 'md', 'lg']),
  showLabels: PropTypes.bool,
  className: PropTypes.string,
};

/**
 * Static reward display (not animated)
 */
export function RewardBadge({
  xp = 0,
  credits = 0,
  size = 'sm',
  className,
}) {
  const sizeStyles = {
    sm: 'text-xs gap-2',
    md: 'text-sm gap-3',
    lg: 'text-base gap-4',
  };

  return (
    <div
      className={clsx(
        'flex items-center',
        sizeStyles[size],
        className
      )}
    >
      {xp > 0 && (
        <span className="flex items-center gap-0.5 text-[var(--brand-pulse-400)]">
          <span>&#x2B50;</span>
          <span className="font-semibold">{xp}</span>
        </span>
      )}
      {credits > 0 && (
        <span className="flex items-center gap-0.5 text-[var(--brand-blue-400)]">
          <span>&#x1F4B0;</span>
          <span className="font-semibold">{credits}</span>
        </span>
      )}
    </div>
  );
}

RewardBadge.propTypes = {
  xp: PropTypes.number,
  credits: PropTypes.number,
  size: PropTypes.oneOf(['sm', 'md', 'lg']),
  className: PropTypes.string,
};

export default ChallengeReward;
