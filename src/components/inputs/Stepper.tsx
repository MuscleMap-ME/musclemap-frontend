/**
 * Stepper Component
 *
 * TOUCHSCREEN-FIRST: Tap-friendly increment/decrement input.
 * Replaces keyboard number entry with large touch targets.
 *
 * Use cases:
 * - Sets, reps, weight in workout logging
 * - Quantity selection
 * - Any numeric input where precision isn't critical
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
import clsx from 'clsx';
import { motion } from 'framer-motion';
import { haptic } from '../../utils/haptics';

interface StepperProps {
  /** Current value */
  value: number;
  /** Called when value changes */
  onChange: (value: number) => void;
  /** Minimum allowed value */
  min?: number;
  /** Maximum allowed value */
  max?: number;
  /** Amount to increment/decrement per tap */
  step?: number;
  /** Label displayed above the stepper */
  label?: string;
  /** Unit displayed after the value (e.g., "lbs", "kg") */
  unit?: string;
  /** Disable the stepper */
  disabled?: boolean;
  /** Size variant */
  size?: 'sm' | 'md' | 'lg';
  /** Enable long-press for rapid increment/decrement */
  enableLongPress?: boolean;
}

const SIZES = {
  sm: {
    button: 'w-10 h-10 text-lg',
    display: 'w-14 h-10 text-lg',
    label: 'text-xs',
  },
  md: {
    button: 'w-12 h-12 text-xl',
    display: 'w-16 h-12 text-xl',
    label: 'text-sm',
  },
  lg: {
    button: 'w-14 h-14 text-2xl',
    display: 'w-20 h-14 text-2xl',
    label: 'text-base',
  },
};

export function Stepper({
  value,
  onChange,
  min = 0,
  max = 999,
  step = 1,
  label,
  unit,
  disabled = false,
  size = 'md',
  enableLongPress = true,
}: StepperProps) {
  const [isDecrementing, setIsDecrementing] = useState(false);
  const [isIncrementing, setIsIncrementing] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const sizeStyles = SIZES[size];

  // Long-press rapid increment/decrement
  useEffect(() => {
    if (!enableLongPress) return;

    if (isDecrementing && value > min) {
      intervalRef.current = setInterval(() => {
        onChange(Math.max(min, value - step));
        haptic('light');
      }, 100);
    } else if (isIncrementing && value < max) {
      intervalRef.current = setInterval(() => {
        onChange(Math.min(max, value + step));
        haptic('light');
      }, 100);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isDecrementing, isIncrementing, value, min, max, step, onChange, enableLongPress]);

  const decrement = useCallback(() => {
    if (value > min && !disabled) {
      haptic('light');
      onChange(Math.max(min, value - step));
    }
  }, [value, min, step, onChange, disabled]);

  const increment = useCallback(() => {
    if (value < max && !disabled) {
      haptic('light');
      onChange(Math.min(max, value + step));
    }
  }, [value, max, step, onChange, disabled]);

  const handleDecrementStart = () => {
    if (enableLongPress && !disabled) {
      setIsDecrementing(true);
    }
  };

  const handleDecrementEnd = () => {
    setIsDecrementing(false);
  };

  const handleIncrementStart = () => {
    if (enableLongPress && !disabled) {
      setIsIncrementing(true);
    }
  };

  const handleIncrementEnd = () => {
    setIsIncrementing(false);
  };

  const canDecrement = value > min && !disabled;
  const canIncrement = value < max && !disabled;

  return (
    <div className="flex flex-col gap-1">
      {label && (
        <span className={clsx('text-gray-400', sizeStyles.label)}>{label}</span>
      )}
      <div className="flex items-center gap-2">
        {/* Decrement button */}
        <motion.button
          className={clsx(
            'rounded-xl bg-gray-700 text-white font-bold',
            'flex items-center justify-center',
            'touch-action-manipulation select-none',
            sizeStyles.button,
            !canDecrement && 'opacity-40 cursor-not-allowed'
          )}
          whileTap={canDecrement ? { scale: 0.95 } : {}}
          onClick={decrement}
          onMouseDown={handleDecrementStart}
          onMouseUp={handleDecrementEnd}
          onMouseLeave={handleDecrementEnd}
          onTouchStart={handleDecrementStart}
          onTouchEnd={handleDecrementEnd}
          disabled={!canDecrement}
          aria-label={`Decrease ${label || 'value'}`}
        >
          −
        </motion.button>

        {/* Value display */}
        <div
          className={clsx(
            'rounded-xl bg-gray-800',
            'flex items-center justify-center gap-1',
            'font-bold text-white',
            sizeStyles.display
          )}
        >
          <span>{value}</span>
          {unit && <span className="text-gray-400 text-sm">{unit}</span>}
        </div>

        {/* Increment button */}
        <motion.button
          className={clsx(
            'rounded-xl bg-gray-700 text-white font-bold',
            'flex items-center justify-center',
            'touch-action-manipulation select-none',
            sizeStyles.button,
            !canIncrement && 'opacity-40 cursor-not-allowed'
          )}
          whileTap={canIncrement ? { scale: 0.95 } : {}}
          onClick={increment}
          onMouseDown={handleIncrementStart}
          onMouseUp={handleIncrementEnd}
          onMouseLeave={handleIncrementEnd}
          onTouchStart={handleIncrementStart}
          onTouchEnd={handleIncrementEnd}
          disabled={!canIncrement}
          aria-label={`Increase ${label || 'value'}`}
        >
          +
        </motion.button>
      </div>
    </div>
  );
}

export default Stepper;
