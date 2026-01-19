/**
 * ProgressIndicator - Visual progress tracking for profile/feature completeness
 *
 * Shows completion percentage with animated ring, segments, or bar variants.
 * Used for profile completeness, achievement progress, feature adoption, etc.
 *
 * Features:
 * - Multiple variants: ring, segments, bar
 * - Animated fill with count-up percentage
 * - Customizable colors based on progress level
 * - Breakdown of individual items with completion state
 * - Glow effect when fully complete
 * - Accessible with proper ARIA attributes
 * - Respects prefers-reduced-motion
 *
 * @example
 * // Ring progress for profile completeness
 * <ProgressIndicator
 *   value={75}
 *   title="Profile Completeness"
 *   items={[
 *     { label: 'Add bio', complete: true, points: 10 },
 *     { label: 'Add photo', complete: true, points: 10 },
 *     { label: 'Connect social', complete: false, points: 10 },
 *     { label: 'Set goals', complete: false, points: 10 },
 *   ]}
 * />
 *
 * // Segment progress for achievement
 * <ProgressIndicator
 *   variant="segments"
 *   value={3}
 *   max={10}
 *   title="Week Warrior"
 *   subtitle="3 of 10 workouts"
 * />
 *
 * // Bar progress for XP
 * <ProgressIndicator
 *   variant="bar"
 *   value={750}
 *   max={1000}
 *   title="Level 5"
 *   subtitle="750 / 1,000 XP"
 * />
 */

import React, { useMemo, useEffect, useState, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import clsx from 'clsx';

// ============================================
// TYPES & CONSTANTS
// ============================================

interface ProgressItem {
  label: string;
  complete: boolean;
  points?: number;
  icon?: React.ReactNode;
}

interface ProgressIndicatorProps {
  /** Current value (0-100 for percentage, or absolute value with max) */
  value: number;
  /** Maximum value (if not percentage-based) */
  max?: number;
  /** Variant style: ring, segments, or bar */
  variant?: 'ring' | 'segments' | 'bar';
  /** Size variant */
  size?: 'sm' | 'md' | 'lg';
  /** Title text above progress */
  title?: string;
  /** Subtitle text below progress */
  subtitle?: string;
  /** Individual progress items to show */
  items?: ProgressItem[];
  /** Show percentage text */
  showPercentage?: boolean;
  /** Show value text (e.g., "3/10") */
  showValue?: boolean;
  /** Enable glow effect when complete */
  glowOnComplete?: boolean;
  /** Color scheme: default, success, brand, custom */
  colorScheme?: 'default' | 'success' | 'brand' | 'warning';
  /** Custom progress color */
  progressColor?: string;
  /** Custom track color */
  trackColor?: string;
  /** Additional class names */
  className?: string;
  /** Animate the progress on mount */
  animate?: boolean;
  /** Compact display mode */
  compact?: boolean;
  /** Show item checklist */
  showItems?: boolean;
  /** ARIA label for accessibility */
  'aria-label'?: string;
}

// Color schemes
const COLOR_SCHEMES = {
  default: {
    progress: 'var(--brand-blue-500)',
    track: 'var(--glass-white-10)',
    glow: 'rgba(0, 102, 255, 0.4)',
    text: 'var(--brand-blue-400)',
  },
  success: {
    progress: 'var(--color-success)',
    track: 'var(--glass-white-10)',
    glow: 'rgba(34, 197, 94, 0.4)',
    text: 'var(--color-success)',
  },
  brand: {
    progress: 'var(--brand-pulse-500)',
    track: 'var(--glass-white-10)',
    glow: 'rgba(255, 51, 102, 0.4)',
    text: 'var(--brand-pulse-400)',
  },
  warning: {
    progress: 'var(--color-warning)',
    track: 'var(--glass-white-10)',
    glow: 'rgba(245, 158, 11, 0.4)',
    text: 'var(--color-warning)',
  },
};

// Size configurations
const SIZE_CONFIG = {
  sm: {
    ring: { size: 64, stroke: 4, fontSize: 14 },
    bar: { height: 6, fontSize: 12 },
    segments: { height: 8, gap: 2 },
  },
  md: {
    ring: { size: 96, stroke: 6, fontSize: 18 },
    bar: { height: 8, fontSize: 14 },
    segments: { height: 10, gap: 3 },
  },
  lg: {
    ring: { size: 128, stroke: 8, fontSize: 24 },
    bar: { height: 12, fontSize: 16 },
    segments: { height: 14, gap: 4 },
  },
};

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Check if user prefers reduced motion
 */
function useReducedMotion(): boolean {
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReducedMotion(mediaQuery.matches);

    const handler = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

  return reducedMotion;
}

/**
 * Calculate percentage from value and max
 */
function calculatePercentage(value: number, max?: number): number {
  if (max !== undefined && max > 0) {
    return Math.min((value / max) * 100, 100);
  }
  return Math.min(Math.max(value, 0), 100);
}

/**
 * Get dynamic color based on progress percentage
 */
function getProgressColor(percentage: number, colorScheme: string): string {
  if (colorScheme !== 'default') {
    return COLOR_SCHEMES[colorScheme as keyof typeof COLOR_SCHEMES]?.progress || COLOR_SCHEMES.default.progress;
  }

  // Dynamic color based on completion
  if (percentage >= 100) return 'var(--color-success)';
  if (percentage >= 75) return 'var(--brand-blue-500)';
  if (percentage >= 50) return 'var(--color-warning)';
  return 'var(--brand-blue-400)';
}

// ============================================
// RING PROGRESS COMPONENT
// ============================================

interface RingProgressProps {
  percentage: number;
  config: typeof SIZE_CONFIG.md.ring;
  colors: typeof COLOR_SCHEMES.default;
  animate: boolean;
  reducedMotion: boolean;
  showPercentage: boolean;
  isComplete: boolean;
  glowOnComplete: boolean;
}

const RingProgress = memo(function RingProgress({
  percentage,
  config,
  colors,
  animate,
  reducedMotion,
  showPercentage,
  isComplete,
  glowOnComplete,
}: RingProgressProps) {
  const { size, stroke, fontSize } = config;
  const radius = (size - stroke) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (percentage / 100) * circumference;

  const [displayPercent, setDisplayPercent] = useState(animate && !reducedMotion ? 0 : percentage);

  // Animate percentage count-up
  useEffect(() => {
    if (!animate || reducedMotion) {
      setDisplayPercent(percentage);
      return;
    }

    const duration = 1000;
    const startTime = performance.now();
    const startValue = 0;

    const animateValue = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3); // Ease out cubic
      const current = startValue + (percentage - startValue) * eased;
      setDisplayPercent(Math.round(current));

      if (progress < 1) {
        requestAnimationFrame(animateValue);
      }
    };

    requestAnimationFrame(animateValue);
  }, [percentage, animate, reducedMotion]);

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="transform -rotate-90"
      >
        {/* Track circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={colors.track}
          strokeWidth={stroke}
        />
        {/* Progress circle */}
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={colors.progress}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={animate && !reducedMotion ? { strokeDashoffset: circumference } : { strokeDashoffset: offset }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: reducedMotion ? 0 : 1, ease: 'easeOut' }}
          style={{
            filter: isComplete && glowOnComplete ? `drop-shadow(0 0 8px ${colors.glow})` : undefined,
          }}
        />
      </svg>

      {/* Center content */}
      {showPercentage && (
        <div
          className="absolute inset-0 flex items-center justify-center"
          style={{ fontSize }}
        >
          <span className="font-bold" style={{ color: colors.text }}>
            {displayPercent}%
          </span>
        </div>
      )}

      {/* Completion glow overlay */}
      <AnimatePresence>
        {isComplete && glowOnComplete && !reducedMotion && (
          <motion.div
            className="absolute inset-0 rounded-full pointer-events-none"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            style={{
              boxShadow: `0 0 20px 4px ${colors.glow}, 0 0 40px 8px ${colors.glow}`,
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
});

// ============================================
// BAR PROGRESS COMPONENT
// ============================================

interface BarProgressProps {
  percentage: number;
  config: typeof SIZE_CONFIG.md.bar;
  colors: typeof COLOR_SCHEMES.default;
  animate: boolean;
  reducedMotion: boolean;
  isComplete: boolean;
  glowOnComplete: boolean;
}

const BarProgress = memo(function BarProgress({
  percentage,
  config,
  colors,
  animate,
  reducedMotion,
  isComplete,
  glowOnComplete,
}: BarProgressProps) {
  const { height } = config;

  return (
    <div
      className="relative w-full rounded-full overflow-hidden"
      style={{
        height,
        backgroundColor: colors.track,
      }}
    >
      <motion.div
        className="absolute inset-y-0 left-0 rounded-full"
        style={{
          backgroundColor: colors.progress,
          boxShadow: isComplete && glowOnComplete ? `0 0 12px 2px ${colors.glow}` : undefined,
        }}
        initial={animate && !reducedMotion ? { width: 0 } : { width: `${percentage}%` }}
        animate={{ width: `${percentage}%` }}
        transition={{ duration: reducedMotion ? 0 : 0.8, ease: 'easeOut' }}
      />

      {/* Shimmer effect for active progress */}
      {!isComplete && percentage > 0 && percentage < 100 && !reducedMotion && (
        <motion.div
          className="absolute inset-y-0 w-12 opacity-30"
          style={{
            background: 'linear-gradient(90deg, transparent, white, transparent)',
          }}
          animate={{
            left: ['0%', '100%'],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: 'linear',
          }}
        />
      )}
    </div>
  );
});

// ============================================
// SEGMENTS PROGRESS COMPONENT
// ============================================

interface SegmentsProgressProps {
  percentage: number;
  segmentCount: number;
  config: typeof SIZE_CONFIG.md.segments;
  colors: typeof COLOR_SCHEMES.default;
  animate: boolean;
  reducedMotion: boolean;
  isComplete: boolean;
  glowOnComplete: boolean;
}

const SegmentsProgress = memo(function SegmentsProgress({
  percentage,
  segmentCount,
  config,
  colors,
  animate,
  reducedMotion,
  isComplete,
  glowOnComplete,
}: SegmentsProgressProps) {
  const { height, gap } = config;
  const filledSegments = Math.round((percentage / 100) * segmentCount);

  return (
    <div className="flex w-full" style={{ gap }}>
      {Array.from({ length: segmentCount }).map((_, index) => {
        const isFilled = index < filledSegments;
        const isLast = index === filledSegments - 1 && !isComplete;

        return (
          <motion.div
            key={index}
            className="flex-1 rounded-sm"
            style={{
              height,
              backgroundColor: isFilled ? colors.progress : colors.track,
              boxShadow:
                isFilled && isComplete && glowOnComplete
                  ? `0 0 8px 2px ${colors.glow}`
                  : isLast && !reducedMotion
                    ? `0 0 6px 1px ${colors.glow}`
                    : undefined,
            }}
            initial={animate && !reducedMotion ? { opacity: 0, scaleY: 0.5 } : undefined}
            animate={{ opacity: 1, scaleY: 1 }}
            transition={{
              delay: animate && !reducedMotion ? index * 0.05 : 0,
              duration: reducedMotion ? 0 : 0.3,
            }}
          />
        );
      })}
    </div>
  );
});

// ============================================
// ITEMS CHECKLIST COMPONENT
// ============================================

interface ItemsChecklistProps {
  items: ProgressItem[];
  animate: boolean;
  reducedMotion: boolean;
}

const ItemsChecklist = memo(function ItemsChecklist({
  items,
  animate,
  reducedMotion,
}: ItemsChecklistProps) {
  return (
    <ul className="space-y-2 mt-4">
      {items.map((item, index) => (
        <motion.li
          key={item.label}
          className="flex items-center gap-3"
          initial={animate && !reducedMotion ? { opacity: 0, x: -10 } : undefined}
          animate={{ opacity: 1, x: 0 }}
          transition={{
            delay: animate && !reducedMotion ? 0.3 + index * 0.1 : 0,
            duration: reducedMotion ? 0 : 0.3,
          }}
        >
          {/* Checkbox */}
          <div
            className={clsx(
              'w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0',
              'border-2 transition-colors duration-200',
              item.complete
                ? 'bg-[var(--color-success)] border-[var(--color-success)]'
                : 'border-[var(--border-medium)] bg-transparent'
            )}
          >
            {item.complete && (
              <svg
                width="12"
                height="12"
                viewBox="0 0 12 12"
                fill="none"
                className="text-white"
              >
                <path
                  d="M2.5 6L5 8.5L9.5 4"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            )}
          </div>

          {/* Label */}
          <span
            className={clsx(
              'text-sm flex-1',
              item.complete
                ? 'text-[var(--text-secondary)] line-through'
                : 'text-[var(--text-primary)]'
            )}
          >
            {item.label}
          </span>

          {/* Points badge */}
          {item.points !== undefined && (
            <span
              className={clsx(
                'text-xs px-2 py-0.5 rounded-full',
                item.complete
                  ? 'bg-[var(--color-success)]/20 text-[var(--color-success)]'
                  : 'bg-[var(--glass-white-10)] text-[var(--text-tertiary)]'
              )}
            >
              +{item.points}
            </span>
          )}
        </motion.li>
      ))}
    </ul>
  );
});

// ============================================
// MAIN COMPONENT
// ============================================

export function ProgressIndicator({
  value,
  max,
  variant = 'ring',
  size = 'md',
  title,
  subtitle,
  items,
  showPercentage = true,
  showValue = false,
  glowOnComplete = true,
  colorScheme = 'default',
  progressColor,
  trackColor,
  className,
  animate = true,
  compact = false,
  showItems = true,
  'aria-label': ariaLabel,
}: ProgressIndicatorProps) {
  const reducedMotion = useReducedMotion();
  const percentage = calculatePercentage(value, max);
  const isComplete = percentage >= 100;
  const sizeConfig = SIZE_CONFIG[size];

  // Resolve colors
  const colors = useMemo(() => {
    const scheme = COLOR_SCHEMES[colorScheme] || COLOR_SCHEMES.default;
    return {
      progress: progressColor || getProgressColor(percentage, colorScheme),
      track: trackColor || scheme.track,
      glow: scheme.glow,
      text: scheme.text,
    };
  }, [colorScheme, progressColor, trackColor, percentage]);

  // Calculate segment count for segments variant
  const segmentCount = max || 10;

  // Format value display
  const valueDisplay = useMemo(() => {
    if (showValue && max !== undefined) {
      return `${value} / ${max}`;
    }
    return null;
  }, [showValue, value, max]);

  return (
    <div
      className={clsx('flex flex-col', compact ? 'gap-2' : 'gap-3', className)}
      role="progressbar"
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={max || 100}
      aria-label={ariaLabel || title || 'Progress'}
    >
      {/* Header */}
      {(title || subtitle) && !compact && (
        <div className="space-y-1">
          {title && (
            <h4 className="text-sm font-semibold text-[var(--text-primary)]">
              {title}
            </h4>
          )}
          {subtitle && (
            <p className="text-xs text-[var(--text-tertiary)]">{subtitle}</p>
          )}
        </div>
      )}

      {/* Progress visualization */}
      <div
        className={clsx(
          'flex items-center',
          variant === 'ring' ? 'justify-center' : 'w-full',
          compact && 'gap-3'
        )}
      >
        {/* Compact title */}
        {compact && title && (
          <span className="text-sm font-medium text-[var(--text-primary)] flex-shrink-0">
            {title}
          </span>
        )}

        {/* Ring variant */}
        {variant === 'ring' && (
          <RingProgress
            percentage={percentage}
            config={sizeConfig.ring}
            colors={colors}
            animate={animate}
            reducedMotion={reducedMotion}
            showPercentage={showPercentage}
            isComplete={isComplete}
            glowOnComplete={glowOnComplete}
          />
        )}

        {/* Bar variant */}
        {variant === 'bar' && (
          <div className="flex-1">
            <BarProgress
              percentage={percentage}
              config={sizeConfig.bar}
              colors={colors}
              animate={animate}
              reducedMotion={reducedMotion}
              isComplete={isComplete}
              glowOnComplete={glowOnComplete}
            />
          </div>
        )}

        {/* Segments variant */}
        {variant === 'segments' && (
          <div className="flex-1">
            <SegmentsProgress
              percentage={percentage}
              segmentCount={segmentCount}
              config={sizeConfig.segments}
              colors={colors}
              animate={animate}
              reducedMotion={reducedMotion}
              isComplete={isComplete}
              glowOnComplete={glowOnComplete}
            />
          </div>
        )}

        {/* Value display */}
        {(valueDisplay || (showPercentage && variant !== 'ring')) && (
          <span
            className={clsx(
              'text-sm font-medium flex-shrink-0',
              compact ? 'ml-2' : 'ml-3'
            )}
            style={{ color: colors.text }}
          >
            {valueDisplay || `${Math.round(percentage)}%`}
          </span>
        )}
      </div>

      {/* Items checklist */}
      {items && items.length > 0 && showItems && !compact && (
        <ItemsChecklist
          items={items}
          animate={animate}
          reducedMotion={reducedMotion}
        />
      )}
    </div>
  );
}

// ============================================
// PRESETS
// ============================================

/**
 * ProfileCompleteness - Preset for profile progress
 */
export function ProfileCompleteness({
  items,
  className,
}: {
  items: ProgressItem[];
  className?: string;
}) {
  const completedCount = items.filter((i) => i.complete).length;
  const percentage = (completedCount / items.length) * 100;

  return (
    <ProgressIndicator
      value={percentage}
      variant="ring"
      size="lg"
      title="Profile Completeness"
      subtitle={`${completedCount} of ${items.length} completed`}
      items={items}
      glowOnComplete
      className={className}
    />
  );
}

/**
 * AchievementProgress - Preset for achievement tracking
 */
export function AchievementProgress({
  current,
  total,
  title,
  className,
}: {
  current: number;
  total: number;
  title: string;
  className?: string;
}) {
  return (
    <ProgressIndicator
      value={current}
      max={total}
      variant="segments"
      size="sm"
      title={title}
      subtitle={`${current} of ${total}`}
      showValue
      showPercentage={false}
      className={className}
    />
  );
}

/**
 * XPProgress - Preset for experience progress
 */
export function XPProgress({
  current,
  nextLevel,
  level,
  className,
}: {
  current: number;
  nextLevel: number;
  level: number;
  className?: string;
}) {
  return (
    <ProgressIndicator
      value={current}
      max={nextLevel}
      variant="bar"
      size="md"
      title={`Level ${level}`}
      subtitle={`${current.toLocaleString()} / ${nextLevel.toLocaleString()} XP`}
      colorScheme="brand"
      className={className}
    />
  );
}

/**
 * CompactProgress - Inline progress indicator
 */
export function CompactProgress({
  value,
  max,
  label,
  className,
}: {
  value: number;
  max?: number;
  label: string;
  className?: string;
}) {
  return (
    <ProgressIndicator
      value={value}
      max={max}
      variant="bar"
      size="sm"
      title={label}
      compact
      showPercentage={false}
      showValue={!!max}
      className={className}
    />
  );
}

export default ProgressIndicator;
