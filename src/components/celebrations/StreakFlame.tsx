/**
 * StreakFlame Component
 *
 * An animated SVG flame for displaying workout streaks or intensity levels.
 * Features flickering animation with intensity scaling and floating embers.
 * Works as a badge decoration or standalone indicator.
 *
 * @example
 * // Using intensity (1-10)
 * <StreakFlame intensity={7} size="md" />
 *
 * // Using streak count (auto-calculates intensity)
 * <StreakFlame streak={30} size="lg" animated />
 *
 * // As badge decoration
 * <div className="relative">
 *   <Avatar />
 *   <StreakFlame intensity={8} size="sm" className="absolute -top-2 -right-2" />
 * </div>
 */

import { useMemo } from 'react';
import { motion } from 'framer-motion';
import PropTypes from 'prop-types';
import { useReducedMotion } from '../glass/ButtonEffects';

// ============================================
// SIZE CONFIGURATIONS
// ============================================

const SIZES = {
  xs: { width: 16, height: 20, emberCount: 2 },
  sm: { width: 24, height: 30, emberCount: 3 },
  md: { width: 32, height: 40, emberCount: 4 },
  lg: { width: 48, height: 60, emberCount: 6 },
  xl: { width: 64, height: 80, emberCount: 8 },
};

// ============================================
// INTENSITY CALCULATIONS
// ============================================

/**
 * Calculate intensity level from streak count
 * Maps streak days to 1-10 intensity scale
 */
function getIntensityFromStreak(streak) {
  if (streak < 3) return 1;
  if (streak < 7) return 2;
  if (streak < 14) return 3;
  if (streak < 21) return 4;
  if (streak < 30) return 5;
  if (streak < 45) return 6;
  if (streak < 60) return 7;
  if (streak < 90) return 8;
  if (streak < 180) return 9;
  return 10;
}

/**
 * Get flame level name and multiplier from intensity
 */
function getFlameLevel(intensity) {
  const levels = [
    { name: 'ember', multiplier: 0.4 },      // 1
    { name: 'spark', multiplier: 0.5 },       // 2
    { name: 'kindle', multiplier: 0.6 },      // 3
    { name: 'low', multiplier: 0.7 },         // 4
    { name: 'medium', multiplier: 0.85 },     // 5
    { name: 'steady', multiplier: 1.0 },      // 6
    { name: 'high', multiplier: 1.15 },       // 7
    { name: 'blazing', multiplier: 1.3 },     // 8
    { name: 'inferno', multiplier: 1.5 },     // 9
    { name: 'supernova', multiplier: 1.7 },   // 10
  ];
  return levels[Math.min(Math.max(intensity - 1, 0), 9)];
}

// ============================================
// COLOR SCHEMES
// ============================================

const FLAME_COLORS = {
  ember: {
    outer: ['#854d0e', '#a16207', '#ca8a04'],
    inner: ['#fbbf24', '#f59e0b', '#d97706'],
    glow: 'rgba(251, 191, 36, 0.3)',
  },
  spark: {
    outer: ['#9a3412', '#c2410c', '#ea580c'],
    inner: ['#fb923c', '#fdba74', '#fed7aa'],
    glow: 'rgba(234, 88, 12, 0.4)',
  },
  kindle: {
    outer: ['#b91c1c', '#dc2626', '#ef4444'],
    inner: ['#f87171', '#fca5a5', '#fecaca'],
    glow: 'rgba(220, 38, 38, 0.4)',
  },
  low: {
    outer: ['#ea580c', '#f97316', '#fb923c'],
    inner: ['#fdba74', '#fed7aa', '#ffedd5'],
    glow: 'rgba(249, 115, 22, 0.5)',
  },
  medium: {
    outer: ['#dc2626', '#ef4444', '#f87171'],
    inner: ['#fca5a5', '#fecaca', '#fee2e2'],
    glow: 'rgba(239, 68, 68, 0.5)',
  },
  steady: {
    outer: ['#dc2626', '#f97316', '#facc15'],
    inner: ['#fde68a', '#fef08a', '#fefce8'],
    glow: 'rgba(250, 204, 21, 0.5)',
  },
  high: {
    outer: ['#dc2626', '#f97316', '#facc15'],
    inner: ['#fef08a', '#fefce8', '#ffffff'],
    glow: 'rgba(250, 204, 21, 0.6)',
  },
  blazing: {
    outer: ['#7c3aed', '#a855f7', '#c084fc'],
    inner: ['#e9d5ff', '#f3e8ff', '#ffffff'],
    glow: 'rgba(168, 85, 247, 0.6)',
  },
  inferno: {
    outer: ['#0ea5e9', '#06b6d4', '#22d3ee'],
    inner: ['#a5f3fc', '#cffafe', '#ffffff'],
    glow: 'rgba(6, 182, 212, 0.7)',
  },
  supernova: {
    outer: ['#ffffff', '#a5f3fc', '#22d3ee'],
    inner: ['#ffffff', '#ffffff', '#ecfeff'],
    glow: 'rgba(255, 255, 255, 0.8)',
  },
};

// ============================================
// EMBER PARTICLE
// ============================================

function Ember({ delay, x, size, colors }) {
  const reducedMotion = useReducedMotion();

  if (reducedMotion) return null;

  return (
    <motion.circle
      cx={x}
      cy={size.height * 0.3}
      r={1.5}
      fill={colors.inner[0]}
      initial={{ opacity: 0, y: 0 }}
      animate={{
        opacity: [0, 1, 1, 0],
        y: [-5, -15, -30, -45],
        x: [0, (Math.random() - 0.5) * 15, (Math.random() - 0.5) * 20],
      }}
      transition={{
        duration: 1.5,
        delay,
        repeat: Infinity,
        ease: 'easeOut',
      }}
    />
  );
}

Ember.propTypes = {
  delay: PropTypes.number.isRequired,
  x: PropTypes.number.isRequired,
  size: PropTypes.object.isRequired,
  colors: PropTypes.object.isRequired,
};

// ============================================
// ANIMATION VARIANTS
// ============================================

const flamePathVariants = {
  animate: (custom) => ({
    d: [
      custom.paths[0],
      custom.paths[1],
      custom.paths[2],
      custom.paths[1],
      custom.paths[0],
    ],
    transition: {
      duration: custom.duration,
      repeat: Infinity,
      ease: 'easeInOut',
    },
  }),
};

const outerFlameVariants = {
  animate: (multiplier) => ({
    scaleY: [1, 1.05 * multiplier, 1, 0.98, 1],
    scaleX: [1, 0.98, 1, 1.02, 1],
    transition: {
      duration: 0.6,
      repeat: Infinity,
      ease: 'easeInOut',
    },
  }),
};

const innerFlameVariants = {
  animate: (multiplier) => ({
    scaleY: [1, 1.1 * multiplier, 1, 0.95, 1],
    scaleX: [1, 0.95, 1, 1.05, 1],
    y: [0, -1, 0, 1, 0],
    transition: {
      duration: 0.4,
      repeat: Infinity,
      ease: 'easeInOut',
    },
  }),
};

const glowVariants = {
  animate: (multiplier) => ({
    opacity: [0.4, 0.7 * multiplier, 0.4, 0.5, 0.4],
    scale: [1, 1.1 * multiplier, 1, 1.05, 1],
    transition: {
      duration: 1.2,
      repeat: Infinity,
      ease: 'easeInOut',
    },
  }),
};

// ============================================
// MAIN COMPONENT
// ============================================

export function StreakFlame({
  intensity,
  streak,
  size = 'md',
  animate = true,
  showCount = false,
  className = '',
}) {
  const reducedMotion = useReducedMotion();
  const shouldAnimate = animate && !reducedMotion;

  // Calculate intensity from streak if intensity not provided
  const effectiveIntensity = useMemo(() => {
    if (intensity !== undefined) return Math.min(Math.max(intensity, 1), 10);
    if (streak !== undefined) return getIntensityFromStreak(streak);
    return 5; // Default to medium
  }, [intensity, streak]);

  const sizeConfig = SIZES[size] || SIZES.md;
  const { width, height, emberCount } = sizeConfig;

  const { name: levelName, multiplier } = getFlameLevel(effectiveIntensity);
  const colors = FLAME_COLORS[levelName];

  // Flame path variations for animation
  const outerPaths = useMemo(() => [
    `M${width / 2} ${height * 0.1}
     C${width * 0.7} ${height * 0.25} ${width * 0.85} ${height * 0.5} ${width * 0.75} ${height * 0.7}
     C${width * 0.65} ${height * 0.85} ${width * 0.35} ${height * 0.85} ${width * 0.25} ${height * 0.7}
     C${width * 0.15} ${height * 0.5} ${width * 0.3} ${height * 0.25} ${width / 2} ${height * 0.1}Z`,
    `M${width / 2} ${height * 0.08}
     C${width * 0.75} ${height * 0.2} ${width * 0.9} ${height * 0.45} ${width * 0.78} ${height * 0.68}
     C${width * 0.68} ${height * 0.88} ${width * 0.32} ${height * 0.88} ${width * 0.22} ${height * 0.68}
     C${width * 0.1} ${height * 0.45} ${width * 0.25} ${height * 0.2} ${width / 2} ${height * 0.08}Z`,
    `M${width / 2} ${height * 0.12}
     C${width * 0.65} ${height * 0.28} ${width * 0.82} ${height * 0.52} ${width * 0.72} ${height * 0.72}
     C${width * 0.62} ${height * 0.82} ${width * 0.38} ${height * 0.82} ${width * 0.28} ${height * 0.72}
     C${width * 0.18} ${height * 0.52} ${width * 0.35} ${height * 0.28} ${width / 2} ${height * 0.12}Z`,
  ], [width, height]);

  const innerPaths = useMemo(() => [
    `M${width / 2} ${height * 0.25}
     C${width * 0.6} ${height * 0.35} ${width * 0.68} ${height * 0.5} ${width * 0.6} ${height * 0.65}
     C${width * 0.55} ${height * 0.75} ${width * 0.45} ${height * 0.75} ${width * 0.4} ${height * 0.65}
     C${width * 0.32} ${height * 0.5} ${width * 0.4} ${height * 0.35} ${width / 2} ${height * 0.25}Z`,
    `M${width / 2} ${height * 0.22}
     C${width * 0.62} ${height * 0.32} ${width * 0.7} ${height * 0.48} ${width * 0.62} ${height * 0.62}
     C${width * 0.56} ${height * 0.78} ${width * 0.44} ${height * 0.78} ${width * 0.38} ${height * 0.62}
     C${width * 0.3} ${height * 0.48} ${width * 0.38} ${height * 0.32} ${width / 2} ${height * 0.22}Z`,
    `M${width / 2} ${height * 0.28}
     C${width * 0.58} ${height * 0.38} ${width * 0.65} ${height * 0.52} ${width * 0.58} ${height * 0.68}
     C${width * 0.52} ${height * 0.72} ${width * 0.48} ${height * 0.72} ${width * 0.42} ${height * 0.68}
     C${width * 0.35} ${height * 0.52} ${width * 0.42} ${height * 0.38} ${width / 2} ${height * 0.28}Z`,
  ], [width, height]);

  // Generate gradient IDs (unique per instance)
  const gradientId = useMemo(() => `flame-${Math.random().toString(36).substr(2, 9)}`, []);
  const outerGradientId = `${gradientId}-outer`;
  const innerGradientId = `${gradientId}-inner`;
  const glowFilterId = `${gradientId}-glow`;

  // Generate embers based on intensity
  const embers = useMemo(() => {
    if (effectiveIntensity < 5) return [];
    const count = Math.min(emberCount, Math.floor((effectiveIntensity - 4) * 2));
    return Array.from({ length: count }).map((_, i) => ({
      delay: i * 0.3,
      x: width * (0.3 + Math.random() * 0.4),
    }));
  }, [effectiveIntensity, emberCount, width]);

  // Display value for showCount
  const displayValue = streak !== undefined ? streak : effectiveIntensity;

  return (
    <div className={`inline-flex flex-col items-center gap-1 ${className}`}>
      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        className="overflow-visible"
        role="img"
        aria-label={`Flame intensity ${effectiveIntensity} out of 10`}
      >
        {/* Definitions */}
        <defs>
          {/* Outer flame gradient */}
          <linearGradient id={outerGradientId} x1="0%" y1="100%" x2="0%" y2="0%">
            <stop offset="0%" stopColor={colors.outer[0]} />
            <stop offset="50%" stopColor={colors.outer[1]} />
            <stop offset="100%" stopColor={colors.outer[2]} />
          </linearGradient>

          {/* Inner flame gradient */}
          <linearGradient id={innerGradientId} x1="0%" y1="100%" x2="0%" y2="0%">
            <stop offset="0%" stopColor={colors.inner[0]} />
            <stop offset="50%" stopColor={colors.inner[1]} />
            <stop offset="100%" stopColor={colors.inner[2]} />
          </linearGradient>

          {/* Glow filter */}
          <filter id={glowFilterId} x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation={4 * multiplier} result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Glow effect */}
        {shouldAnimate && (
          <motion.ellipse
            cx={width / 2}
            cy={height * 0.6}
            rx={width * 0.6}
            ry={height * 0.4}
            fill={colors.glow}
            variants={glowVariants}
            animate="animate"
            custom={multiplier}
            style={{ filter: `blur(${8 * multiplier}px)` }}
          />
        )}

        {/* Outer flame */}
        <motion.g
          style={{ transformOrigin: `${width / 2}px ${height * 0.85}px` }}
          variants={shouldAnimate ? outerFlameVariants : undefined}
          animate={shouldAnimate ? 'animate' : undefined}
          custom={multiplier}
        >
          {shouldAnimate ? (
            <motion.path
              fill={`url(#${outerGradientId})`}
              filter={`url(#${glowFilterId})`}
              variants={flamePathVariants}
              animate="animate"
              custom={{ paths: outerPaths, duration: 0.8 / multiplier }}
            />
          ) : (
            <path
              d={outerPaths[0]}
              fill={`url(#${outerGradientId})`}
            />
          )}
        </motion.g>

        {/* Inner flame */}
        <motion.g
          style={{ transformOrigin: `${width / 2}px ${height * 0.75}px` }}
          variants={shouldAnimate ? innerFlameVariants : undefined}
          animate={shouldAnimate ? 'animate' : undefined}
          custom={multiplier}
        >
          {shouldAnimate ? (
            <motion.path
              fill={`url(#${innerGradientId})`}
              variants={flamePathVariants}
              animate="animate"
              custom={{ paths: innerPaths, duration: 0.5 / multiplier }}
            />
          ) : (
            <path
              d={innerPaths[0]}
              fill={`url(#${innerGradientId})`}
            />
          )}
        </motion.g>

        {/* Floating embers */}
        {embers.map((ember, i) => (
          <Ember
            key={i}
            delay={ember.delay}
            x={ember.x}
            size={sizeConfig}
            colors={colors}
          />
        ))}
      </svg>

      {/* Optional count display */}
      {showCount && displayValue > 0 && (
        <motion.span
          className="text-xs font-bold tabular-nums"
          style={{
            color: colors.outer[1],
            textShadow: `0 0 8px ${colors.glow}`,
          }}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: 'spring', stiffness: 200 }}
        >
          {displayValue}
        </motion.span>
      )}
    </div>
  );
}

StreakFlame.propTypes = {
  /** Intensity level (1-10). Takes precedence over streak. */
  intensity: PropTypes.number,
  /** Streak count. Auto-calculates intensity if intensity not provided. */
  streak: PropTypes.number,
  /** Size preset */
  size: PropTypes.oneOf(['xs', 'sm', 'md', 'lg', 'xl']),
  /** Enable/disable animation */
  animate: PropTypes.bool,
  /** Show streak/intensity count below flame */
  showCount: PropTypes.bool,
  /** Additional CSS classes */
  className: PropTypes.string,
};

// Export helper functions for external use
export { getIntensityFromStreak, getFlameLevel, FLAME_COLORS };

export default StreakFlame;
