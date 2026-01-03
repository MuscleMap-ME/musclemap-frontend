/**
 * MuscleActivationCard - Exercise card with glowing muscle indicators
 *
 * Shows which muscle groups are activated with bioluminescent glow effects.
 * Integrates with the muscle color system from design tokens.
 */

import React from 'react';
import { motion } from 'framer-motion';
import clsx from 'clsx';
import { GlassCard } from './GlassSurface';

/**
 * Muscle group color/glow mapping
 * These correspond to the CSS custom properties in design-tokens.css
 */
const MUSCLE_GROUPS = {
  chest: {
    color: 'var(--muscle-chest)',
    glow: 'var(--muscle-chest-glow)',
    label: 'Chest',
  },
  back: {
    color: 'var(--muscle-back)',
    glow: 'var(--muscle-back-glow)',
    label: 'Back',
  },
  shoulders: {
    color: 'var(--muscle-shoulders)',
    glow: 'var(--muscle-shoulders-glow)',
    label: 'Shoulders',
  },
  arms: {
    color: 'var(--muscle-arms)',
    glow: 'var(--muscle-arms-glow)',
    label: 'Arms',
  },
  legs: {
    color: 'var(--muscle-legs)',
    glow: 'var(--muscle-legs-glow)',
    label: 'Legs',
  },
  core: {
    color: 'var(--muscle-core)',
    glow: 'var(--muscle-core-glow)',
    label: 'Core',
  },
  cardio: {
    color: 'var(--muscle-cardio)',
    glow: 'var(--muscle-cardio-glow)',
    label: 'Cardio',
  },
};

/**
 * MuscleIndicator - Glowing dot showing muscle activation
 */
export const MuscleIndicator = ({
  muscle,
  intensity = 1, // 0-1 activation level
  size = 'md',
  animated = true,
  showLabel = false,
}) => {
  const config = MUSCLE_GROUPS[muscle] || MUSCLE_GROUPS.chest;

  const sizeMap = {
    sm: { dot: 8, ring: 16 },
    md: { dot: 10, ring: 20 },
    lg: { dot: 14, ring: 28 },
  };

  const { dot, ring } = sizeMap[size] || sizeMap.md;

  return (
    <div className="flex items-center gap-2">
      <div
        className="relative flex items-center justify-center"
        style={{ width: ring, height: ring }}
      >
        {/* Outer glow ring */}
        <motion.div
          className="absolute inset-0 rounded-full"
          style={{
            background: `radial-gradient(circle, ${config.glow} 0%, transparent 70%)`,
          }}
          animate={
            animated
              ? {
                  scale: [1, 1.3, 1],
                  opacity: [0.5 * intensity, 0.8 * intensity, 0.5 * intensity],
                }
              : { opacity: 0.6 * intensity }
          }
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
        {/* Inner dot */}
        <motion.div
          className="rounded-full"
          style={{
            width: dot,
            height: dot,
            backgroundColor: config.color,
            boxShadow: `0 0 ${6 * intensity}px ${config.glow}`,
          }}
          animate={
            animated
              ? {
                  scale: [1, 1.1, 1],
                }
              : {}
          }
          transition={{
            duration: 1.5,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
      </div>
      {showLabel && (
        <span
          className="text-xs font-medium"
          style={{ color: config.color }}
        >
          {config.label}
        </span>
      )}
    </div>
  );
};

/**
 * MuscleActivationBar - Horizontal bar showing muscle group contribution
 */
export const MuscleActivationBar = ({
  muscles, // Array of { muscle: string, percentage: number }
  height = 4,
  className,
}) => {
  return (
    <div
      className={clsx('flex rounded-full overflow-hidden', className)}
      style={{ height }}
    >
      {muscles.map(({ muscle, percentage }, index) => {
        const config = MUSCLE_GROUPS[muscle] || MUSCLE_GROUPS.chest;
        return (
          <motion.div
            key={muscle}
            className="h-full"
            style={{
              backgroundColor: config.color,
              boxShadow: `0 0 8px ${config.glow}`,
            }}
            initial={{ width: 0 }}
            animate={{ width: `${percentage}%` }}
            transition={{
              type: 'spring',
              stiffness: 100,
              damping: 20,
              delay: index * 0.1,
            }}
          />
        );
      })}
    </div>
  );
};

/**
 * ExerciseGlassCard - Complete exercise card with muscle activation
 */
const MuscleActivationCard = ({
  name,
  category,
  muscles = [], // Array of muscle group strings
  primaryMuscle,
  equipment,
  difficulty,
  imageUrl,
  onClick,
  className,
}) => {
  // Calculate muscle percentages (primary gets more)
  const musclePercentages = muscles.map((muscle) => ({
    muscle,
    percentage: muscle === primaryMuscle ? 60 : 40 / (muscles.length - 1 || 1),
  }));

  return (
    <GlassCard
      className={clsx('group cursor-pointer', className)}
      onClick={onClick}
    >
      {/* Image section with glass overlay */}
      {imageUrl && (
        <div className="relative h-40 overflow-hidden rounded-t-xl">
          <img
            src={imageUrl}
            alt={name}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
          {/* Glass overlay on hover */}
          <div className="absolute inset-0 bg-gradient-to-t from-[var(--void-base)] via-transparent to-transparent" />

          {/* Muscle indicators floating on image */}
          <div className="absolute bottom-3 left-3 flex gap-1">
            {muscles.slice(0, 3).map((muscle) => (
              <MuscleIndicator
                key={muscle}
                muscle={muscle}
                intensity={muscle === primaryMuscle ? 1 : 0.6}
                size="sm"
              />
            ))}
          </div>
        </div>
      )}

      {/* Content section */}
      <div className="p-4">
        {/* Category & Difficulty */}
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium text-[var(--text-tertiary)] uppercase tracking-wide">
            {category}
          </span>
          {difficulty && (
            <DifficultyBadge level={difficulty} />
          )}
        </div>

        {/* Exercise name */}
        <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-2 group-hover:text-[var(--brand-blue-400)] transition-colors">
          {name}
        </h3>

        {/* Muscle activation bar */}
        {muscles.length > 0 && (
          <div className="mb-3">
            <MuscleActivationBar muscles={musclePercentages} />
          </div>
        )}

        {/* Muscle tags */}
        <div className="flex flex-wrap gap-1.5 mb-3">
          {muscles.map((muscle) => {
            const config = MUSCLE_GROUPS[muscle] || MUSCLE_GROUPS.chest;
            return (
              <span
                key={muscle}
                className="px-2 py-0.5 text-xs font-medium rounded-full bg-[var(--glass-white-5)] border border-[var(--border-subtle)]"
                style={{
                  color: config.color,
                  borderColor: `${config.color}33`,
                }}
              >
                {config.label}
              </span>
            );
          })}
        </div>

        {/* Equipment */}
        {equipment && (
          <div className="flex items-center gap-2 text-xs text-[var(--text-quaternary)]">
            <EquipmentIcon />
            <span>{equipment}</span>
          </div>
        )}
      </div>

      {/* Hover glow effect */}
      <motion.div
        className="absolute inset-0 rounded-xl pointer-events-none"
        initial={{ opacity: 0 }}
        whileHover={{ opacity: 1 }}
        style={{
          background: primaryMuscle
            ? `radial-gradient(ellipse at center, ${MUSCLE_GROUPS[primaryMuscle]?.glow || 'transparent'} 0%, transparent 70%)`
            : 'none',
        }}
      />
    </GlassCard>
  );
};

/**
 * DifficultyBadge - Shows exercise difficulty level
 */
const DifficultyBadge = ({ level }) => {
  const config = {
    beginner: {
      label: 'Beginner',
      color: 'var(--muscle-legs)', // Green
      bg: 'rgba(34, 197, 94, 0.1)',
    },
    intermediate: {
      label: 'Intermediate',
      color: 'var(--muscle-core)', // Yellow
      bg: 'rgba(234, 179, 8, 0.1)',
    },
    advanced: {
      label: 'Advanced',
      color: 'var(--muscle-chest)', // Red
      bg: 'rgba(239, 68, 68, 0.1)',
    },
  };

  const { label, color, bg } = config[level] || config.beginner;

  return (
    <span
      className="px-2 py-0.5 text-xs font-medium rounded-full"
      style={{ color, backgroundColor: bg }}
    >
      {label}
    </span>
  );
};

/**
 * Equipment icon
 */
const EquipmentIcon = () => (
  <svg
    className="w-3.5 h-3.5"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={1.5}
      d="M4 6h16M4 12h16m-7 6h7"
    />
  </svg>
);

/**
 * CompactMuscleCard - Smaller variant for lists
 */
export const CompactMuscleCard = ({
  name,
  muscles = [],
  primaryMuscle,
  onClick,
  className,
}) => {
  return (
    <motion.button
      className={clsx(
        'w-full flex items-center gap-3 p-3 rounded-xl',
        'glass-interactive text-left',
        className
      )}
      onClick={onClick}
      whileHover={{ x: 4 }}
      whileTap={{ scale: 0.98 }}
    >
      {/* Muscle indicators */}
      <div className="flex -space-x-1">
        {muscles.slice(0, 2).map((muscle) => (
          <MuscleIndicator
            key={muscle}
            muscle={muscle}
            intensity={muscle === primaryMuscle ? 1 : 0.5}
            size="sm"
            animated={false}
          />
        ))}
      </div>

      {/* Exercise name */}
      <span className="flex-1 text-sm font-medium text-[var(--text-primary)] truncate">
        {name}
      </span>

      {/* Arrow */}
      <svg
        className="w-4 h-4 text-[var(--text-quaternary)]"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M9 5l7 7-7 7"
        />
      </svg>
    </motion.button>
  );
};

export default MuscleActivationCard;
