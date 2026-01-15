/**
 * MusclePreview Component - Compact Muscle Activation Preview
 *
 * A small, compact muscle diagram optimized for workout mode:
 * - Shows target muscles with glow effect
 * - Minimal footprint for embedding in workout UI
 * - Supports both primary and secondary muscle highlighting
 * - Animated activation indicators
 *
 * @example
 * <MusclePreview
 *   exercise={{ primaryMuscles: ['chest'], secondaryMuscles: ['triceps'] }}
 *   intensity={0.8}
 * />
 */

import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { useShouldReduceMotion } from '../../contexts/MotionContext';

// Muscle group positions for simplified body map
const MUSCLE_POSITIONS = {
  // Upper body - front
  chest: { x: 50, y: 28, size: 22, glow: '#ef4444' },
  shoulders: { x: 25, y: 20, mirror: true, size: 14, glow: '#f97316' },
  biceps: { x: 18, y: 38, mirror: true, size: 10, glow: '#8b5cf6' },
  triceps: { x: 82, y: 38, size: 10, glow: '#8b5cf6' },
  forearms: { x: 15, y: 52, mirror: true, size: 8, glow: '#a855f7' },
  abs: { x: 50, y: 45, size: 18, glow: '#eab308' },
  obliques: { x: 38, y: 43, mirror: true, size: 10, glow: '#eab308' },
  core: { x: 50, y: 42, size: 20, glow: '#eab308' },

  // Upper body - back
  back: { x: 50, y: 32, size: 24, glow: '#3b82f6' },
  lats: { x: 35, y: 35, mirror: true, size: 16, glow: '#3b82f6' },
  traps: { x: 50, y: 15, size: 16, glow: '#3b82f6' },
  lower_back: { x: 50, y: 48, size: 14, glow: '#3b82f6' },
  rear_delts: { x: 28, y: 22, mirror: true, size: 10, glow: '#f97316' },

  // Lower body
  quads: { x: 42, y: 62, mirror: true, size: 14, glow: '#22c55e' },
  hamstrings: { x: 42, y: 68, mirror: true, size: 14, glow: '#22c55e' },
  glutes: { x: 50, y: 55, size: 18, glow: '#22c55e' },
  calves: { x: 42, y: 82, mirror: true, size: 10, glow: '#22c55e' },
  hip_flexors: { x: 45, y: 56, mirror: true, size: 8, glow: '#22c55e' },
  adductors: { x: 47, y: 65, mirror: true, size: 8, glow: '#22c55e' },
};

// Normalize muscle name to match our position map
function normalizeMuscle(muscle) {
  if (!muscle) return null;
  const normalized = muscle.toLowerCase().replace(/[-\s]+/g, '_');
  return MUSCLE_POSITIONS[normalized] ? normalized : null;
}

/**
 * Single muscle dot with glow animation
 */
function MuscleDot({ x, y, size, isPrimary, glowColor, intensity, delay, shouldReduceMotion }) {
  const baseOpacity = isPrimary ? 0.9 : 0.5;
  const adjustedSize = size * (isPrimary ? 1.2 : 0.9);

  return (
    <motion.g>
      {/* Outer glow */}
      <motion.circle
        cx={x}
        cy={y}
        r={adjustedSize * 1.8}
        fill={glowColor}
        initial={{ opacity: 0, scale: 0 }}
        animate={
          shouldReduceMotion
            ? { opacity: baseOpacity * 0.3 * intensity, scale: 1 }
            : {
                opacity: [baseOpacity * 0.2 * intensity, baseOpacity * 0.4 * intensity, baseOpacity * 0.2 * intensity],
                scale: [0.9, 1.1, 0.9],
              }
        }
        transition={
          shouldReduceMotion
            ? { duration: 0.3, delay }
            : {
                duration: 2,
                repeat: Infinity,
                ease: 'easeInOut',
                delay,
              }
        }
        style={{ filter: 'blur(4px)' }}
      />

      {/* Inner core */}
      <motion.circle
        cx={x}
        cy={y}
        r={adjustedSize / 2}
        fill={glowColor}
        initial={{ opacity: 0, scale: 0 }}
        animate={{ opacity: baseOpacity * intensity, scale: 1 }}
        transition={
          shouldReduceMotion
            ? { duration: 0.2, delay }
            : { type: 'spring', stiffness: 300, delay }
        }
      />
    </motion.g>
  );
}

/**
 * MusclePreview Component
 */
export function MusclePreview({
  exercise,
  intensity = 1,
  size = 'md',
  className = '',
}) {
  const shouldReduceMotion = useShouldReduceMotion();

  // Size configurations
  const sizeConfig = {
    xs: { width: 48, height: 72 },
    sm: { width: 64, height: 96 },
    md: { width: 80, height: 120 },
    lg: { width: 100, height: 150 },
  };

  const dimensions = sizeConfig[size] || sizeConfig.md;

  // Get muscle lists from exercise
  const primaryMuscles = useMemo(() => {
    return (exercise?.primaryMuscles || exercise?.primary_muscles || [])
      .map(normalizeMuscle)
      .filter(Boolean);
  }, [exercise]);

  const secondaryMuscles = useMemo(() => {
    return (exercise?.secondaryMuscles || exercise?.secondary_muscles || [])
      .map(normalizeMuscle)
      .filter(Boolean);
  }, [exercise]);

  // Build muscle dots with positions
  const muscleDots = useMemo(() => {
    const dots = [];

    // Add primary muscles
    primaryMuscles.forEach((muscle, index) => {
      const pos = MUSCLE_POSITIONS[muscle];
      if (pos) {
        dots.push({
          id: `primary-${muscle}`,
          x: pos.x,
          y: pos.y,
          size: pos.size,
          isPrimary: true,
          glowColor: pos.glow,
          delay: index * 0.05,
        });

        // Add mirrored muscle if applicable
        if (pos.mirror) {
          dots.push({
            id: `primary-${muscle}-mirror`,
            x: 100 - pos.x,
            y: pos.y,
            size: pos.size,
            isPrimary: true,
            glowColor: pos.glow,
            delay: index * 0.05 + 0.02,
          });
        }
      }
    });

    // Add secondary muscles
    secondaryMuscles.forEach((muscle, index) => {
      const pos = MUSCLE_POSITIONS[muscle];
      if (pos) {
        dots.push({
          id: `secondary-${muscle}`,
          x: pos.x,
          y: pos.y,
          size: pos.size,
          isPrimary: false,
          glowColor: pos.glow,
          delay: (primaryMuscles.length + index) * 0.05,
        });

        if (pos.mirror) {
          dots.push({
            id: `secondary-${muscle}-mirror`,
            x: 100 - pos.x,
            y: pos.y,
            size: pos.size,
            isPrimary: false,
            glowColor: pos.glow,
            delay: (primaryMuscles.length + index) * 0.05 + 0.02,
          });
        }
      }
    });

    return dots;
  }, [primaryMuscles, secondaryMuscles]);

  // If no muscles, show placeholder
  if (muscleDots.length === 0) {
    return (
      <div
        className={`flex items-center justify-center bg-white/5 rounded-lg ${className}`}
        style={dimensions}
      >
        <div className="w-6 h-6 rounded-full bg-white/10" />
      </div>
    );
  }

  return (
    <div className={`relative ${className}`} style={dimensions}>
      <svg
        viewBox="0 0 100 100"
        className="w-full h-full"
        preserveAspectRatio="xMidYMid meet"
      >
        {/* Background body silhouette */}
        <g className="opacity-10">
          {/* Head */}
          <ellipse cx="50" cy="10" rx="7" ry="8" fill="white" />
          {/* Neck */}
          <rect x="46" y="16" width="8" height="6" fill="white" rx="2" />
          {/* Torso */}
          <path
            d="M 35 22 Q 30 25 28 35 L 26 55 L 35 55 L 35 85 L 42 85 L 42 55 L 50 52 L 58 55 L 58 85 L 65 85 L 65 55 L 74 55 L 72 35 Q 70 25 65 22 Z"
            fill="white"
          />
          {/* Left arm */}
          <path
            d="M 28 25 Q 22 28 18 40 L 14 55 L 18 56 L 25 42 L 28 35 Z"
            fill="white"
          />
          {/* Right arm */}
          <path
            d="M 72 25 Q 78 28 82 40 L 86 55 L 82 56 L 75 42 L 72 35 Z"
            fill="white"
          />
          {/* Legs */}
          <rect x="35" y="55" width="12" height="35" fill="white" rx="3" />
          <rect x="53" y="55" width="12" height="35" fill="white" rx="3" />
        </g>

        {/* Muscle activation dots */}
        {muscleDots.map((dot) => (
          <MuscleDot
            key={dot.id}
            x={dot.x}
            y={dot.y}
            size={dot.size}
            isPrimary={dot.isPrimary}
            glowColor={dot.glowColor}
            intensity={intensity}
            delay={dot.delay}
            shouldReduceMotion={shouldReduceMotion}
          />
        ))}
      </svg>
    </div>
  );
}

/**
 * MusclePreviewBadge - Ultra-compact inline badge version
 */
export function MusclePreviewBadge({ exercise, className = '' }) {
  const primaryMuscles = exercise?.primaryMuscles || exercise?.primary_muscles || [];

  if (primaryMuscles.length === 0) {
    return null;
  }

  // Get first muscle's color
  const firstMuscle = normalizeMuscle(primaryMuscles[0]);
  const glowColor = firstMuscle ? MUSCLE_POSITIONS[firstMuscle]?.glow : '#3b82f6';

  return (
    <div className={`flex items-center gap-1.5 ${className}`}>
      {/* Muscle indicator dot */}
      <div
        className="w-2.5 h-2.5 rounded-full animate-pulse"
        style={{
          backgroundColor: glowColor,
          boxShadow: `0 0 8px ${glowColor}`,
        }}
      />
      {/* Muscle count */}
      <span className="text-xs text-gray-400">
        {primaryMuscles.length} muscle{primaryMuscles.length !== 1 ? 's' : ''}
      </span>
    </div>
  );
}

export default MusclePreview;
