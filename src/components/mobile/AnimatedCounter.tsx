/**
 * AnimatedCounter Component
 *
 * Animated number counter with various animation styles.
 * Perfect for stats, scores, and progress displays.
 */

import React, { useEffect, useRef, useState } from 'react';
import { motion, useSpring, useMotionValue, useTransform } from 'framer-motion';
import { useMotion } from '../../contexts/MotionContext';

interface AnimatedCounterProps {
  /** Target value to count to */
  value: number;
  /** Duration of the animation in seconds */
  duration?: number;
  /** Number of decimal places to show */
  decimals?: number;
  /** Prefix to show before the number */
  prefix?: string;
  /** Suffix to show after the number */
  suffix?: string;
  /** Whether to show thousand separators */
  separator?: boolean;
  /** Custom class name */
  className?: string;
  /** Animation style */
  style?: 'spring' | 'linear' | 'easeOut';
  /** Whether to animate on mount */
  animateOnMount?: boolean;
  /** Callback when animation completes */
  onComplete?: () => void;
}

export function AnimatedCounter({
  value,
  duration = 1,
  decimals = 0,
  prefix = '',
  suffix = '',
  separator = true,
  className = '',
  style = 'spring',
  animateOnMount = true,
  onComplete,
}: AnimatedCounterProps) {
  const { reducedMotion } = useMotion();
  const [displayValue, setDisplayValue] = useState(animateOnMount ? 0 : value);
  const prevValue = useRef(animateOnMount ? 0 : value);
  const animationRef = useRef<number>();

  useEffect(() => {
    if (reducedMotion) {
      setDisplayValue(value);
      onComplete?.();
      return;
    }

    const startValue = prevValue.current;
    const endValue = value;
    const startTime = performance.now();
    const durationMs = duration * 1000;

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / durationMs, 1);

      let easedProgress: number;
      switch (style) {
        case 'linear':
          easedProgress = progress;
          break;
        case 'easeOut':
          easedProgress = 1 - Math.pow(1 - progress, 3);
          break;
        case 'spring':
        default:
          // Spring-like easing
          easedProgress = 1 - Math.pow(1 - progress, 4) * Math.cos(progress * Math.PI * 0.5);
          break;
      }

      const currentValue = startValue + (endValue - startValue) * easedProgress;
      setDisplayValue(currentValue);

      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate);
      } else {
        setDisplayValue(endValue);
        onComplete?.();
      }
    };

    animationRef.current = requestAnimationFrame(animate);
    prevValue.current = value;

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [value, duration, style, reducedMotion, onComplete]);

  const formatNumber = (num: number): string => {
    const fixed = num.toFixed(decimals);
    if (!separator) return fixed;

    const [integer, decimal] = fixed.split('.');
    const formatted = integer.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return decimal ? `${formatted}.${decimal}` : formatted;
  };

  return (
    <span className={className}>
      {prefix}
      {formatNumber(displayValue)}
      {suffix}
    </span>
  );
}

// Animated number with spring physics (framer-motion based)
interface SpringCounterProps {
  value: number;
  decimals?: number;
  prefix?: string;
  suffix?: string;
  className?: string;
}

export function SpringCounter({
  value,
  decimals = 0,
  prefix = '',
  suffix = '',
  className = '',
}: SpringCounterProps) {
  const { reducedMotion } = useMotion();
  const motionValue = useMotionValue(0);
  const springValue = useSpring(motionValue, {
    damping: 30,
    stiffness: 100,
  });
  const display = useTransform(springValue, (v) => {
    const formatted = v.toFixed(decimals).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return `${prefix}${formatted}${suffix}`;
  });

  useEffect(() => {
    if (reducedMotion) {
      motionValue.set(value);
    } else {
      motionValue.set(value);
    }
  }, [value, motionValue, reducedMotion]);

  return <motion.span className={className}>{display}</motion.span>;
}

// Slot machine style counter
interface SlotCounterProps {
  value: number;
  className?: string;
}

export function SlotCounter({ value, className = '' }: SlotCounterProps) {
  const { reducedMotion } = useMotion();
  const digits = String(value).split('');

  return (
    <span className={`inline-flex ${className}`}>
      {digits.map((digit, index) => (
        <motion.span
          key={index}
          initial={reducedMotion ? false : { y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{
            type: reducedMotion ? 'tween' : 'spring',
            delay: reducedMotion ? 0 : index * 0.05,
            damping: 20,
            stiffness: 300,
          }}
          className="inline-block"
        >
          {digit}
        </motion.span>
      ))}
    </span>
  );
}

// Countdown timer display
interface CountdownDisplayProps {
  /** Time remaining in seconds */
  seconds: number;
  /** Whether to show hours */
  showHours?: boolean;
  /** Custom class name */
  className?: string;
}

export function CountdownDisplay({
  seconds,
  showHours = false,
  className = '',
}: CountdownDisplayProps) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  const pad = (n: number) => n.toString().padStart(2, '0');

  return (
    <span className={`font-mono ${className}`}>
      {showHours && <><SlotCounter value={hours} />:</>}
      <SlotCounter value={parseInt(pad(minutes))} />:
      <SlotCounter value={parseInt(pad(secs))} />
    </span>
  );
}

// Progress counter with percentage
interface ProgressCounterProps {
  current: number;
  total: number;
  showPercentage?: boolean;
  className?: string;
}

export function ProgressCounter({
  current,
  total,
  showPercentage = true,
  className = '',
}: ProgressCounterProps) {
  const percentage = total > 0 ? Math.round((current / total) * 100) : 0;

  return (
    <span className={className}>
      <AnimatedCounter value={current} duration={0.5} />
      {' / '}
      {total}
      {showPercentage && (
        <span className="text-gray-400 ml-2">
          (<AnimatedCounter value={percentage} duration={0.5} suffix="%" />)
        </span>
      )}
    </span>
  );
}

export default AnimatedCounter;
