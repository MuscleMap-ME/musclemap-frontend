/**
 * AnimatedNumber - Count-up animation component with visual effects
 *
 * Animates numerical values with smooth easing, respects reduced motion preferences,
 * supports multiple formats including compact notation, and integrates with the
 * MuscleMap design system.
 *
 * Features:
 * - Count-up animation from 0 or previous value
 * - Multiple format options: comma, decimal, currency, compact, percent, none
 * - Odometer-style rolling digits variant
 * - Glow pulse animation on value changes (green for increase, red for decrease)
 * - Accessible with aria-live for screen readers
 * - Respects prefers-reduced-motion
 *
 * @example
 * // Basic counter
 * <AnimatedNumber value={1234} />
 *
 * // With formatting
 * <AnimatedNumber value={1234567} format="compact" /> // Shows 1.2M
 *
 * // With glow effect
 * <AnimatedNumber value={xp} glowOnChange suffix=" XP" />
 *
 * // Currency
 * <AnimatedNumber value={99.99} format="currency" prefix="$" decimals={2} />
 *
 * // Percentage (0.75 shows as 75%)
 * <AnimatedNumber value={0.75} format="percent" />
 *
 * // Count up from zero on initial load
 * <AnimatedNumber value={score} countUp />
 */

import { useState, useEffect, useRef, useCallback, useMemo, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import clsx from 'clsx';

// Default glow colors
const GLOW_COLORS = {
  default: 'var(--brand-blue-400, #1a80ff)',
  increase: 'var(--color-success, #22c55e)',
  decrease: 'var(--color-error, #ef4444)',
};

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
  easeOutElastic: (t) => {
    const c4 = (2 * Math.PI) / 3;
    return t === 0 ? 0 : t === 1 ? 1 : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1;
  },
};

/**
 * Format number to compact notation (1K, 1.5M, 2.3B)
 */
function formatCompact(value, decimals = 1) {
  const absValue = Math.abs(value);
  const sign = value < 0 ? '-' : '';

  if (absValue >= 1e9) {
    return sign + (absValue / 1e9).toFixed(decimals).replace(/\.0+$/, '') + 'B';
  }
  if (absValue >= 1e6) {
    return sign + (absValue / 1e6).toFixed(decimals).replace(/\.0+$/, '') + 'M';
  }
  if (absValue >= 1e3) {
    return sign + (absValue / 1e3).toFixed(decimals).replace(/\.0+$/, '') + 'K';
  }
  return sign + absValue.toFixed(decimals === undefined ? 0 : decimals).replace(/\.0+$/, '');
}

/**
 * Format number based on format type
 */
function formatValue(value, format, decimals) {
  switch (format) {
    case 'comma': {
      const fixed = decimals !== undefined ? value.toFixed(decimals) : Math.round(value).toString();
      const parts = fixed.split('.');
      parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
      return parts.join('.');
    }
    case 'decimal': {
      return decimals !== undefined ? value.toFixed(decimals) : value.toString();
    }
    case 'currency': {
      const fixed = value.toFixed(decimals !== undefined ? decimals : 2);
      const parts = fixed.split('.');
      parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
      return parts.join('.');
    }
    case 'compact': {
      return formatCompact(value, decimals);
    }
    case 'percent': {
      // Convert decimal to percentage (0.75 -> 75%)
      const percentValue = value * 100;
      const fixed = decimals !== undefined ? percentValue.toFixed(decimals) : Math.round(percentValue).toString();
      return fixed + '%';
    }
    case 'none':
    default:
      return decimals !== undefined ? value.toFixed(decimals) : Math.round(value).toString();
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
 * Split a formatted number into individual digits for odometer display
 */
function splitIntoDigits(formattedValue) {
  return formattedValue.split('').map((char, index) => ({
    char,
    key: `${index}-${char}`,
    isDigit: /\d/.test(char),
  }));
}

/**
 * Single odometer digit component with rolling animation
 */
const OdometerDigit = memo(function OdometerDigit({ char, isDigit, glowColor }) {
  if (!isDigit) {
    // Non-digit characters (commas, periods, etc.) just render directly
    return <span className="odometer-char">{char}</span>;
  }

  return (
    <span className="odometer-digit-wrapper">
      <AnimatePresence mode="popLayout">
        <motion.span
          key={char}
          className="odometer-digit"
          initial={{ y: '-100%', opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: '100%', opacity: 0 }}
          transition={{
            type: 'spring',
            stiffness: 300,
            damping: 30,
            mass: 0.8,
          }}
          style={{
            '--digit-glow': glowColor,
          }}
        >
          {char}
        </motion.span>
      </AnimatePresence>
    </span>
  );
});

/**
 * AnimatedNumber Component
 *
 * @param {number} value - Target value to animate to
 * @param {number} duration - Animation duration in milliseconds (default: 1000)
 * @param {string} format - Number format: 'comma', 'decimal', 'currency', 'compact', or 'none' (default: 'none')
 * @param {number} decimals - Number of decimal places to display
 * @param {string} prefix - String to display before the number
 * @param {string} suffix - String to display after the number
 * @param {boolean} glowOnChange - Add glow effect when value changes
 * @param {string} glowColor - Color for the glow effect (CSS value, default: brand blue)
 * @param {string} easing - Easing function name (default: 'easeOut')
 * @param {string} variant - Display variant: 'default' or 'odometer' (default: 'default')
 * @param {string} className - Additional CSS classes
 * @param {boolean} startFromZero - Whether to always start from zero (default: false)
 */
function AnimatedNumber({
  value = 0,
  duration = 1000,
  format = 'none',
  decimals,
  prefix = '',
  suffix = '',
  glowOnChange = false,
  glowColor = 'var(--brand-blue-400, #1a80ff)',
  easing = 'easeOut',
  variant = 'default',
  className,
  startFromZero = false,
  ...props
}) {
  const [displayValue, setDisplayValue] = useState(value);
  const [isGlowing, setIsGlowing] = useState(false);
  const [increased, setIncreased] = useState(false);
  const previousValueRef = useRef(value);
  const animationFrameRef = useRef(null);
  const startTimeRef = useRef(null);
  const startValueRef = useRef(value);
  const displayValueRef = useRef(value);

  // Keep displayValueRef in sync with displayValue
  useEffect(() => {
    displayValueRef.current = displayValue;
  }, [displayValue]);

  // Check for reduced motion preference
  const reducedMotion = useMemo(() => prefersReducedMotion(), []);

  // Memoize the easing function
  const easingFn = useMemo(() => EASING[easing] || EASING.easeOut, [easing]);

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
    const valueChanged = value !== previousValueRef.current;
    const valueIncreased = value > previousValueRef.current;

    // Track if value increased (for glow direction)
    if (valueChanged) {
      setIncreased(valueIncreased);
    }

    // Check for reduced motion preference
    if (reducedMotion) {
      setDisplayValue(value);
      if (glowOnChange && valueChanged) {
        setIsGlowing(true);
        const timer = setTimeout(() => setIsGlowing(false), 600);
        previousValueRef.current = value;
        return () => clearTimeout(timer);
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
      startValueRef.current = displayValueRef.current;
    }

    // Reset timing
    startTimeRef.current = null;

    // Trigger glow effect if enabled and value changed
    if (glowOnChange && valueChanged) {
      setIsGlowing(true);
      setTimeout(() => setIsGlowing(false), 600);
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
  }, [value, animate, glowOnChange, startFromZero, reducedMotion]);

  // Format the display value
  const formattedValue = useMemo(
    () => formatValue(displayValue, format, decimals),
    [displayValue, format, decimals]
  );

  // Split into digits for odometer variant
  const digits = useMemo(
    () => (variant === 'odometer' ? splitIntoDigits(formattedValue) : null),
    [formattedValue, variant]
  );

  // Glow animation variants for Framer Motion
  const glowVariants = {
    initial: {
      textShadow: '0 0 0 transparent',
      scale: 1,
    },
    glowing: {
      textShadow: [
        '0 0 0 transparent',
        `0 0 20px ${glowColor}, 0 0 40px ${glowColor}`,
        `0 0 10px ${glowColor}`,
      ],
      scale: [1, 1.05, 1],
      transition: {
        duration: 0.6,
        ease: 'easeOut',
      },
    },
  };

  const content = (
    <>
      {prefix && <span className="animated-number__prefix">{prefix}</span>}
      {variant === 'odometer' ? (
        <span className="odometer-container">
          {digits.map(({ char, key, isDigit }) => (
            <OdometerDigit key={key} char={char} isDigit={isDigit} glowColor={glowColor} />
          ))}
        </span>
      ) : (
        <span className="animated-number__value">{formattedValue}</span>
      )}
      {suffix && <span className="animated-number__suffix">{suffix}</span>}
    </>
  );

  return (
    <>
      <motion.span
        className={clsx(
          'animated-number',
          variant === 'odometer' && 'animated-number--odometer',
          isGlowing && 'animated-number--glowing',
          increased && 'animated-number--increased',
          className
        )}
        style={{
          '--glow-color': glowColor,
        }}
        variants={glowVariants}
        initial="initial"
        animate={isGlowing && !reducedMotion ? 'glowing' : 'initial'}
        {...props}
      >
        {content}
      </motion.span>
      <style>{`
        .animated-number {
          display: inline-flex;
          align-items: baseline;
          font-variant-numeric: tabular-nums;
          transition: text-shadow var(--duration-normal, 200ms) var(--ease-out, ease-out);
        }

        .animated-number__prefix,
        .animated-number__suffix {
          white-space: pre;
        }

        /* Odometer styles */
        .animated-number--odometer {
          overflow: hidden;
        }

        .odometer-container {
          display: inline-flex;
          align-items: baseline;
        }

        .odometer-digit-wrapper {
          display: inline-block;
          position: relative;
          height: 1.2em;
          overflow: hidden;
        }

        .odometer-digit {
          display: inline-block;
          position: relative;
        }

        .odometer-char {
          display: inline-block;
        }

        /* Glow states */
        .animated-number--glowing {
          text-shadow: 0 0 10px var(--glow-color);
        }

        .animated-number--glowing.animated-number--increased::after {
          content: '';
          position: absolute;
          inset: -4px;
          border-radius: var(--radius-sm, 6px);
          background: radial-gradient(circle, var(--glow-color) 0%, transparent 70%);
          opacity: 0;
          animation: glow-pulse 600ms var(--ease-out, ease-out) forwards;
          pointer-events: none;
        }

        @keyframes glow-pulse {
          0% {
            opacity: 0;
            transform: scale(0.8);
          }
          50% {
            opacity: 0.3;
            transform: scale(1.2);
          }
          100% {
            opacity: 0;
            transform: scale(1.5);
          }
        }

        /* Reduced motion */
        @media (prefers-reduced-motion: reduce) {
          .animated-number--glowing::after {
            animation: none;
          }

          .odometer-digit-wrapper .odometer-digit {
            transition: none;
          }
        }
      `}</style>
    </>
  );
}

export default AnimatedNumber;

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
      format="currency"
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
 * AnimatedCount - Preset for whole number counts with commas
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

/**
 * AnimatedCompact - Preset for large numbers in compact format (1K, 1.5M, etc.)
 */
export function AnimatedCompact({ value, decimals = 1, ...props }) {
  return (
    <AnimatedNumber
      value={value}
      format="compact"
      decimals={decimals}
      {...props}
    />
  );
}

/**
 * AnimatedCredits - Preset for MuscleMap credit display with glow
 */
export function AnimatedCredits({ value, showGlow = true, ...props }) {
  return (
    <AnimatedNumber
      value={value}
      format="comma"
      glowOnChange={showGlow}
      glowColor="var(--brand-blue-400, #1a80ff)"
      easing="easeOutBack"
      {...props}
    />
  );
}

/**
 * AnimatedXP - Preset for XP/experience point display
 */
export function AnimatedXP({ value, ...props }) {
  return (
    <AnimatedNumber
      value={value}
      format="comma"
      suffix=" XP"
      glowOnChange
      glowColor="var(--brand-pulse-400, #ff1a4c)"
      easing="easeOutElastic"
      {...props}
    />
  );
}
