/**
 * MuscleActivationBadge
 * Compact inline badge showing muscle activation
 *
 * Used in:
 * - Exercise cards in lists
 * - Activity feed items
 * - Leaderboard entries
 * - Quick muscle previews
 */

import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import clsx from 'clsx';
import type { MuscleActivationBadgeProps, MuscleActivation } from './types';
import { useMotionAllowed } from '../../hooks/useReducedMotion';

// ============================================
// MUSCLE ICON PATHS
// ============================================

/**
 * Simplified muscle group icons for badge display
 */
const MUSCLE_ICONS: Record<string, string> = {
  // Upper body - front
  chest: 'M8 6 Q10 5 12 6 L11.5 10 Q10 11 8.5 10 Z',
  abs: 'M9 8 L11 8 L10.8 14 L9.2 14 Z',
  front_delts: 'M6 6 L8 6 L7.5 9 L5.5 8 Z M12 6 L14 6 L14.5 8 L12.5 9 Z',
  biceps: 'M5 8 L7 7 L6.5 12 L4.5 11 Z M13 7 L15 8 L15.5 11 L13.5 12 Z',

  // Upper body - back
  upper_back: 'M8 5 L12 5 L11.5 9 L8.5 9 Z',
  lats: 'M7 7 L9 8 L8.5 12 L6.5 11 Z M11 8 L13 7 L13.5 11 L11.5 12 Z',
  traps: 'M9 4 L11 4 L11.5 6 L8.5 6 Z',
  rear_delts: 'M6 5 L8 5.5 L7.5 8 L5.5 7 Z M12 5.5 L14 5 L14.5 7 L12.5 8 Z',

  // Arms
  triceps: 'M5 7 L7 8 L6.8 12 L4.8 11 Z M13 8 L15 7 L15.2 11 L13.2 12 Z',
  forearms: 'M4 11 L6 10 L5.5 15 L3.5 14 Z M14 10 L16 11 L16.5 14 L14.5 15 Z',
  side_delts: 'M5 6 L7 5.5 L7 8 L5 8 Z M13 5.5 L15 6 L15 8 L13 8 Z',

  // Lower body
  quads: 'M8 12 L9.5 12 L9 18 L7.5 17.5 Z M10.5 12 L12 12 L12.5 17.5 L11 18 Z',
  hamstrings: 'M8 12 L9.5 12 L9.2 18 L7.8 17.5 Z M10.5 12 L12 12 L12.2 17.5 L10.8 18 Z',
  glutes: 'M8 11 L12 11 L11.5 14 L8.5 14 Z',
  calves: 'M7.5 16 L9 16 L8.8 19 L7.3 18.5 Z M11 16 L12.5 16 L12.7 18.5 L11.2 19 Z',
  hip_flexors: 'M9 11 L11 11 L10.8 13 L9.2 13 Z',
  adductors: 'M9.2 13 L10.8 13 L10.5 16 L9.5 16 Z',
  lower_back: 'M9 9 L11 9 L10.8 12 L9.2 12 Z',
  obliques: 'M7 8 L8.5 8.5 L8.2 12 L6.8 11.5 Z M11.5 8.5 L13 8 L13.2 11.5 L11.8 12 Z',
};

/**
 * Get color from intensity
 */
function getIntensityColor(intensity: number): string {
  if (intensity <= 0) return 'rgba(100, 100, 120, 0.5)';

  if (intensity < 0.25) {
    return 'rgba(60, 130, 220, 0.8)';
  } else if (intensity < 0.5) {
    return 'rgba(60, 180, 130, 0.85)';
  } else if (intensity < 0.75) {
    return 'rgba(220, 160, 40, 0.9)';
  } else {
    return 'rgba(220, 80, 50, 0.95)';
  }
}

/**
 * Get top N muscles by intensity
 */
function getTopMuscles(muscles: MuscleActivation[], count: number = 3): MuscleActivation[] {
  return [...muscles]
    .sort((a, b) => {
      // Primary muscles first, then by intensity
      if (a.isPrimary && !b.isPrimary) return -1;
      if (!a.isPrimary && b.isPrimary) return 1;
      return b.intensity - a.intensity;
    })
    .slice(0, count);
}

// ============================================
// MAIN COMPONENT
// ============================================

export function MuscleActivationBadge({
  muscles,
  size = 40,
  showGlow = true,
  tooltip,
  className,
  onClick,
}: MuscleActivationBadgeProps): React.ReactElement {
  const motionAllowed = useMotionAllowed();

  // Get top muscles to display
  const topMuscles = useMemo(() => getTopMuscles(muscles, 4), [muscles]);

  // Calculate average intensity for glow
  const avgIntensity = useMemo(() => {
    if (topMuscles.length === 0) return 0;
    return topMuscles.reduce((sum, m) => sum + m.intensity, 0) / topMuscles.length;
  }, [topMuscles]);

  // Format tooltip text
  const tooltipText = tooltip || topMuscles.map(m =>
    m.id.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
  ).join(', ');

  return (
    <motion.div
      className={clsx(
        'relative inline-flex items-center justify-center rounded-lg',
        'bg-gradient-to-br from-[var(--void-deep,#0a0f1a)] to-[var(--void-deeper,#050810)]',
        'border border-white/5',
        onClick && 'cursor-pointer hover:border-white/20 transition-colors',
        className
      )}
      style={{ width: size, height: size }}
      onClick={onClick}
      title={tooltipText}
      whileHover={onClick && motionAllowed ? { scale: 1.05 } : undefined}
      whileTap={onClick && motionAllowed ? { scale: 0.98 } : undefined}
    >
      {/* Glow effect for high activation */}
      {showGlow && avgIntensity > 0.5 && (
        <motion.div
          className="absolute inset-0 rounded-lg"
          style={{
            background: `radial-gradient(circle at center, ${getIntensityColor(avgIntensity)}, transparent 70%)`,
            opacity: avgIntensity * 0.4,
          }}
          animate={motionAllowed ? {
            opacity: [avgIntensity * 0.3, avgIntensity * 0.5, avgIntensity * 0.3],
          } : undefined}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
      )}

      {/* Muscle icons */}
      <svg
        viewBox="0 0 20 20"
        className="w-[75%] h-[75%]"
        style={{ overflow: 'visible' }}
      >
        {/* Body silhouette background */}
        <ellipse
          cx="10"
          cy="4"
          rx="3"
          ry="3.5"
          fill="rgba(71, 85, 105, 0.1)"
        />
        <path
          d="M10 7 Q6 8 5 12 L5 15 L7 18 L9 18 L10 15 L11 18 L13 18 L15 15 L15 12 Q14 8 10 7"
          fill="rgba(71, 85, 105, 0.1)"
        />

        {/* Highlighted muscles */}
        {topMuscles.map((muscle, index) => {
          const iconPath = MUSCLE_ICONS[muscle.id];
          if (!iconPath) return null;

          const color = getIntensityColor(muscle.intensity);

          return (
            <motion.path
              key={muscle.id}
              d={iconPath}
              fill={color}
              initial={false}
              animate={motionAllowed ? {
                opacity: [0.8, 1, 0.8],
              } : undefined}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                delay: index * 0.2,
              }}
            />
          );
        })}
      </svg>

      {/* Muscle count indicator */}
      {muscles.length > 4 && (
        <div
          className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-[var(--electric-blue,#0066ff)] text-white text-[8px] font-bold flex items-center justify-center"
        >
          +{muscles.length - 4}
        </div>
      )}
    </motion.div>
  );
}

export default MuscleActivationBadge;
