/**
 * AnimatedNumber - Count-up animation component
 *
 * Animates numerical values with smooth easing, respects reduced motion preferences,
 * and integrates with the MuscleMap design system.
 */

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import clsx from 'clsx';

/**
 * Easing functions for animation
 */
const EASING = {
  linear: (t) => t,
  easeOut: (t) => 1 - Math.pow(1 - t, 3),
  easeIn: (t) => t * t * t,
  easeInOut: (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
  easeOutExpo: (t) => (t === 1 ? 1 : 1 - Math.pow(2, -10 * t)),
  easeOutBack: (t) => {
    const c1 = 1.70158;
    const c3 = c1 + 1;
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
  },
};

/**
 * Format number based on format type
 */
function formatValue(value, format, decimals) {
  const fixedValue = decimals !== undefined ? value.toFixed(decimals) : value;

  switch (format) {
    case 'comma':
      // Add thousand separators
      const parts = fixedValue.toString().split('.');
      parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
      return parts.join('.');
    case 'decimal':
      return fixedValue.toString();
    case 'none':
    default:
      return decimals !== undefined ? fixedValue : Math.round(value).toString();
  }
}

/**
 * Check if user prefers reduced motion
 */
function prefersReducedMotion() {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * AnimatedNumber Component
 *
 * @param {number} value - Target value to animate to
 * @param {number} duration - Animation duration in milliseconds (default: 1000)
 * @param {string} format - Number format: 'comma', 'decimal', or 'none' (default: 'none')
 * @param {number} decimals - Number of decimal places to display
 * @param {string} prefix - String to display before the number
 * @param {string} suffix - String to display after the number
 * @param {boolean} glowOnChange - Add glow effect when value changes
 * @param {string} easing - Easing function name (default: 'easeOut')
 * @param {string} className - Additional CSS classes
 * @param {boolean} startFromZero - Whether to always start from zero (default: false)
 */
export default function AnimatedNumber({
  value = 0,
  duration = 1000,
  format = 'none',
  decimals,
  prefix = '',
  suffix = '',
  glowOnChange = false,
  easing = 'easeOut',
  className,
  startFromZero = false,
  ...props
}) {
  const [displayValue, setDisplayValue] = useState(value);
  const [isGlowing, setIsGlowing] = useState(false);
  const previousValueRef = useRef(value);
  const animationFrameRef = useRef(null);
  const startTimeRef = useRef(null);
  const startValueRef = useRef(value);
  const displayValueRef = useRef(value);

  // Keep displayValueRef in sync with displayValue
  useEffect(() => {
    displayValueRef.current = displayValue;
  }, [displayValue]);

  // Memoize the easing function
  const easingFn = useMemo(() => EASING[easing] || EASING.easeOut, [easing]);

  // Trigger glow effect
  const triggerGlow = useCallback(() => {
    setIsGlowing(true);
    const timer = setTimeout(() => setIsGlowing(false), 600);
    return () => clearTimeout(timer);
  }, []);

  // Animation loop using requestAnimationFrame
  const animate = useCallback(
    (timestamp) => {
      if (!startTimeRef.current) {
        startTimeRef.current = timestamp;
      }

      const elapsed = timestamp - startTimeRef.current;
      const progress = Math.min(elapsed / duration, 1);
      const easedProgress = easingFn(progress);

      const currentValue =
        startValueRef.current + (value - startValueRef.current) * easedProgress;
      setDisplayValue(currentValue);

      if (progress < 1) {
        animationFrameRef.current = requestAnimationFrame(animate);
      } else {
        // Ensure we end exactly at the target value
        setDisplayValue(value);
        animationFrameRef.current = null;
      }
    },
    [value, duration, easingFn]
  );

  // Handle value changes
  useEffect(() => {
    // Check for reduced motion preference
    if (prefersReducedMotion()) {
      setDisplayValue(value);
      if (glowOnChange && value !== previousValueRef.current) {
        triggerGlow();
      }
      previousValueRef.current = value;
      return;
    }

    // Cancel any ongoing animation
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }

    // Determine start value
    if (startFromZero) {
      startValueRef.current = 0;
    } else {
      // Start from current display value for smooth mid-animation transitions
      // Use ref to get current value without adding displayValue to dependencies
      startValueRef.current = displayValueRef.current;
    }

    // Reset timing
    startTimeRef.current = null;

    // Trigger glow effect if enabled and value changed
    if (glowOnChange && value !== previousValueRef.current) {
      triggerGlow();
    }

    // Start animation
    animationFrameRef.current = requestAnimationFrame(animate);

    // Update previous value reference
    previousValueRef.current = value;

    // Cleanup on unmount or value change
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [value, animate, glowOnChange, startFromZero, triggerGlow]);

  // Format the display value
  const formattedValue = useMemo(
    () => formatValue(displayValue, format, decimals),
    [displayValue, format, decimals]
  );

  return (
    <span
      className={clsx(
        'animated-number inline-block tabular-nums',
        isGlowing && 'animated-number--glowing',
        className
      )}
      style={{
        '--glow-color': 'var(--brand-blue-400, #1a80ff)',
        '--glow-shadow': 'var(--glow-brand-sm, 0 0 10px rgba(0, 102, 255, 0.3))',
      }}
      {...props}
    >
      {prefix}
      {formattedValue}
      {suffix}
      <style>{`
        .animated-number {
          transition: text-shadow var(--duration-normal, 200ms) var(--ease-out, ease-out);
        }
        .animated-number--glowing {
          text-shadow: var(--glow-shadow);
          animation: number-glow 600ms var(--ease-out, ease-out);
        }
        @keyframes number-glow {
          0% {
            text-shadow: 0 0 0 transparent;
            transform: scale(1);
          }
          50% {
            text-shadow: 0 0 20px var(--glow-color), 0 0 40px var(--glow-color);
            transform: scale(1.05);
          }
          100% {
            text-shadow: var(--glow-shadow);
            transform: scale(1);
          }
        }
        @media (prefers-reduced-motion: reduce) {
          .animated-number--glowing {
            animation: none;
          }
        }
      `}</style>
    </span>
  );
}

/**
 * Presets for common use cases
 */

/**
 * AnimatedCurrency - Preset for currency values
 */
export function AnimatedCurrency({
  value,
  currency = '$',
  decimals = 2,
  ...props
}) {
  return (
    <AnimatedNumber
      value={value}
      prefix={currency}
      decimals={decimals}
      format="comma"
      {...props}
    />
  );
}

/**
 * AnimatedPercentage - Preset for percentage values
 */
export function AnimatedPercentage({ value, decimals = 1, ...props }) {
  return (
    <AnimatedNumber
      value={value}
      suffix="%"
      decimals={decimals}
      {...props}
    />
  );
}

/**
 * AnimatedCount - Preset for whole number counts
 */
export function AnimatedCount({ value, ...props }) {
  return (
    <AnimatedNumber
      value={value}
      format="comma"
      {...props}
    />
  );
}
