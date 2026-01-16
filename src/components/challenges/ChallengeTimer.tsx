/**
 * ChallengeTimer Component
 *
 * Countdown timer showing time until daily challenge refresh.
 * Features animated digits, pulsing effect when low on time,
 * and glass styling.
 *
 * @example
 * <ChallengeTimer hours={5} minutes={30} seconds={15} />
 */

import { useMemo } from 'react';
import PropTypes from 'prop-types';
import { motion, AnimatePresence } from 'framer-motion';
import clsx from 'clsx';
import { useReducedMotion } from '../glass/ButtonEffects';

// ============================================
// ANIMATED DIGIT
// ============================================

function AnimatedDigit({ value, label }) {
  const reducedMotion = useReducedMotion();
  const paddedValue = String(value).padStart(2, '0');

  return (
    <div className="flex flex-col items-center">
      <div
        className={clsx(
          'relative px-2 py-1 rounded-lg',
          'bg-[var(--glass-white-5)]',
          'border border-[var(--border-subtle)]',
          'min-w-[2.5rem] text-center'
        )}
      >
        <AnimatePresence mode="wait">
          <motion.span
            key={paddedValue}
            className="block text-lg font-mono font-bold text-[var(--text-primary)]"
            initial={reducedMotion ? false : { y: -10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={reducedMotion ? false : { y: 10, opacity: 0 }}
            transition={{ duration: 0.15 }}
          >
            {paddedValue}
          </motion.span>
        </AnimatePresence>
      </div>
      <span className="text-[10px] text-[var(--text-quaternary)] uppercase tracking-wider mt-1">
        {label}
      </span>
    </div>
  );
}

AnimatedDigit.propTypes = {
  value: PropTypes.number.isRequired,
  label: PropTypes.string.isRequired,
};

// ============================================
// SEPARATOR
// ============================================

function TimerSeparator() {
  const reducedMotion = useReducedMotion();

  return (
    <motion.span
      className="text-lg font-bold text-[var(--text-tertiary)] mx-0.5 self-start mt-1"
      animate={!reducedMotion ? {
        opacity: [1, 0.3, 1],
      } : undefined}
      transition={{
        duration: 1,
        repeat: Infinity,
        ease: 'easeInOut',
      }}
    >
      :
    </motion.span>
  );
}

// ============================================
// MAIN COMPONENT
// ============================================

export function ChallengeTimer({
  hours = 0,
  minutes = 0,
  seconds = 0,
  label = 'Resets in',
  showSeconds = true,
  className = '',
}) {
  const reducedMotion = useReducedMotion();

  // Determine urgency level
  const totalMinutes = hours * 60 + minutes;
  const isUrgent = totalMinutes < 60; // Less than 1 hour
  const isCritical = totalMinutes < 15; // Less than 15 minutes

  // Background glow for urgency
  const urgencyGlow = useMemo(() => {
    if (isCritical) return 'shadow-red-500/20';
    if (isUrgent) return 'shadow-amber-500/15';
    return '';
  }, [isCritical, isUrgent]);

  return (
    <div
      className={clsx(
        'relative flex flex-col items-center gap-1',
        className
      )}
    >
      {/* Label */}
      <span className="text-xs text-[var(--text-tertiary)] flex items-center gap-1">
        <span>&#x23F0;</span>
        {label}
      </span>

      {/* Timer container */}
      <motion.div
        className={clsx(
          'relative flex items-center gap-0.5 px-3 py-2 rounded-xl',
          'bg-[var(--glass-white-5)]',
          'border',
          isCritical
            ? 'border-red-500/30'
            : isUrgent
              ? 'border-amber-500/20'
              : 'border-[var(--border-subtle)]',
          urgencyGlow && `shadow-lg ${urgencyGlow}`
        )}
        animate={!reducedMotion && isCritical ? {
          scale: [1, 1.02, 1],
        } : undefined}
        transition={{
          duration: 1,
          repeat: Infinity,
        }}
      >
        {/* Urgent pulse effect */}
        <AnimatePresence>
          {isUrgent && !reducedMotion && (
            <motion.div
              className={clsx(
                'absolute inset-0 rounded-xl',
                isCritical
                  ? 'bg-gradient-to-r from-red-500/10 to-red-600/10'
                  : 'bg-gradient-to-r from-amber-500/5 to-amber-600/5'
              )}
              initial={{ opacity: 0 }}
              animate={{ opacity: [0.3, 0.6, 0.3] }}
              exit={{ opacity: 0 }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
            />
          )}
        </AnimatePresence>

        {/* Time display */}
        <div className="relative z-10 flex items-center">
          <AnimatedDigit value={hours} label="hrs" />
          <TimerSeparator />
          <AnimatedDigit value={minutes} label="min" />
          {showSeconds && (
            <>
              <TimerSeparator />
              <AnimatedDigit value={seconds} label="sec" />
            </>
          )}
        </div>
      </motion.div>
    </div>
  );
}

ChallengeTimer.propTypes = {
  /** Hours remaining */
  hours: PropTypes.number,
  /** Minutes remaining */
  minutes: PropTypes.number,
  /** Seconds remaining */
  seconds: PropTypes.number,
  /** Label text */
  label: PropTypes.string,
  /** Whether to show seconds */
  showSeconds: PropTypes.bool,
  /** Additional CSS classes */
  className: PropTypes.string,
};

/**
 * Compact timer variant for inline use
 */
export function ChallengeTimerCompact({
  hours = 0,
  minutes = 0,
  seconds = 0,
  className = '',
}) {
  const reducedMotion = useReducedMotion();
  const totalMinutes = hours * 60 + minutes;
  const isUrgent = totalMinutes < 60;

  const formatTime = () => {
    const h = String(hours).padStart(2, '0');
    const m = String(minutes).padStart(2, '0');
    const s = String(seconds).padStart(2, '0');
    return `${h}:${m}:${s}`;
  };

  return (
    <motion.span
      className={clsx(
        'inline-flex items-center gap-1.5 px-2 py-1 rounded-lg',
        'text-sm font-mono font-medium',
        isUrgent
          ? 'text-amber-400 bg-amber-500/10'
          : 'text-[var(--text-secondary)] bg-[var(--glass-white-5)]',
        className
      )}
      animate={!reducedMotion && isUrgent ? {
        opacity: [1, 0.7, 1],
      } : undefined}
      transition={{
        duration: 1,
        repeat: Infinity,
      }}
    >
      <span>&#x23F0;</span>
      {formatTime()}
    </motion.span>
  );
}

ChallengeTimerCompact.propTypes = {
  hours: PropTypes.number,
  minutes: PropTypes.number,
  seconds: PropTypes.number,
  className: PropTypes.string,
};

export default ChallengeTimer;
