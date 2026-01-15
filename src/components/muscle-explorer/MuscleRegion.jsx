/**
 * MuscleRegion - Clickable SVG muscle region component
 *
 * Renders an individual muscle as an SVG path with:
 * - Glow effect based on activation level
 * - Pulse animation when selected
 * - Hover highlight with tooltip
 * - Touch-friendly hit areas on mobile
 *
 * @module MuscleRegion
 */

import React, { useMemo, useCallback } from 'react';
import { motion } from 'framer-motion';
import clsx from 'clsx';
import { getActivationColor, ACTIVATION_COLORS, MUSCLE_DATA } from './muscleData';
import { useMotionAllowed } from '../../hooks/useReducedMotion';

// ============================================
// CONSTANTS
// ============================================

/**
 * Animation timing constants
 */
const ANIMATION = {
  hover: 0.15,
  select: 0.25,
  pulse: 1.5,
  glow: 2,
};

/**
 * Touch hit area expansion (pixels)
 */
const TOUCH_EXPANSION = 6;

// ============================================
// COLOR SCHEME DEFINITIONS
// ============================================

/**
 * Color schemes for muscle visualization
 */
export const COLOR_SCHEMES = {
  heat: {
    name: 'Heat',
    getColor: (activation) => {
      if (activation <= 0) return 'rgba(71, 85, 105, 0.3)';
      if (activation <= 25) return 'rgba(59, 130, 246, 0.6)'; // Blue - cold
      if (activation <= 50) return 'rgba(34, 197, 94, 0.7)';  // Green
      if (activation <= 75) return 'rgba(234, 179, 8, 0.8)';  // Yellow
      return 'rgba(239, 68, 68, 0.9)'; // Red - hot
    },
    getGlow: (activation) => {
      if (activation <= 25) return 'rgba(59, 130, 246, 0.4)';
      if (activation <= 50) return 'rgba(34, 197, 94, 0.4)';
      if (activation <= 75) return 'rgba(234, 179, 8, 0.5)';
      return 'rgba(239, 68, 68, 0.6)';
    },
  },
  bioluminescent: {
    name: 'Bioluminescent',
    getColor: (activation, muscleColor) => {
      if (activation <= 0) return 'rgba(71, 85, 105, 0.2)';
      const opacity = 0.4 + (activation / 100) * 0.6;
      if (!muscleColor) return `rgba(0, 255, 180, ${opacity})`;
      // Convert rgb to rgba with opacity
      const rgbaColor = muscleColor
        .replace(')', `, ${opacity})`)
        .replace('rgb', 'rgba');
      return rgbaColor;
    },
    getGlow: (activation, muscleColor) => {
      if (activation <= 0) return 'transparent';
      return muscleColor || 'rgba(0, 255, 180, 0.5)';
    },
  },
  monochrome: {
    name: 'Monochrome',
    getColor: (activation) => {
      if (activation <= 0) return 'rgba(71, 85, 105, 0.2)';
      const intensity = Math.round(150 + (activation / 100) * 105);
      return `rgba(${intensity}, ${intensity}, ${intensity}, ${0.4 + activation / 200})`;
    },
    getGlow: (activation) => {
      const intensity = Math.round(200 + (activation / 100) * 55);
      return `rgba(${intensity}, ${intensity}, ${intensity}, 0.3)`;
    },
  },
};

// ============================================
// MAIN MUSCLE REGION COMPONENT
// ============================================

/**
 * MuscleRegion - Individual clickable muscle path
 *
 * @param {Object} props
 * @param {string} props.muscleId - The muscle identifier
 * @param {string} props.path - SVG path data (d attribute)
 * @param {number} props.activation - Activation level 0-1 (or 0-100)
 * @param {boolean} props.isSelected - Whether this muscle is currently selected
 * @param {boolean} props.isHovered - Whether this muscle is currently hovered
 * @param {Function} props.onClick - Callback when clicked
 * @param {Function} props.onHover - Callback when hover state changes
 * @param {string} props.colorScheme - Color scheme ('heat' | 'bioluminescent' | 'monochrome')
 * @param {boolean} props.showLabel - Whether to show muscle label on hover
 * @param {string} props.className - Additional CSS classes
 */
const MuscleRegion = ({
  muscleId,
  path,
  activation = 0,
  isSelected = false,
  isHovered = false,
  onClick,
  onHover,
  colorScheme = 'heat',
  showLabel = true,
  className,
}) => {
  const motionAllowed = useMotionAllowed();
  const muscle = MUSCLE_DATA[muscleId];

  // Normalize activation to 0-100 range
  const normalizedActivation = useMemo(() => {
    if (activation <= 1 && activation > 0) {
      return activation * 100;
    }
    return activation;
  }, [activation]);

  // Get color scheme functions
  const scheme = COLOR_SCHEMES[colorScheme] || COLOR_SCHEMES.heat;

  // Calculate fill color
  const fillColor = useMemo(() => {
    if (colorScheme === 'bioluminescent' && muscle) {
      return scheme.getColor(normalizedActivation, muscle.color);
    }
    return scheme.getColor(normalizedActivation);
  }, [normalizedActivation, colorScheme, scheme, muscle]);

  // Calculate glow color
  const glowColor = useMemo(() => {
    if (colorScheme === 'bioluminescent' && muscle) {
      return scheme.getGlow(normalizedActivation, muscle.glowColor || muscle.color);
    }
    return scheme.getGlow(normalizedActivation);
  }, [normalizedActivation, colorScheme, scheme, muscle]);

  // Calculate stroke for selection
  const strokeColor = useMemo(() => {
    if (isSelected) {
      return muscle?.glowColor || 'rgba(0, 102, 255, 0.8)';
    }
    if (isHovered) {
      return 'rgba(255, 255, 255, 0.4)';
    }
    return 'transparent';
  }, [isSelected, isHovered, muscle]);

  // Calculate opacity based on state
  const fillOpacity = useMemo(() => {
    if (isSelected) return 1;
    if (isHovered) return 0.9;
    if (normalizedActivation > 0) return 0.7 + (normalizedActivation / 100) * 0.3;
    return 0.4;
  }, [isSelected, isHovered, normalizedActivation]);

  // Glow filter intensity
  const glowIntensity = useMemo(() => {
    if (isSelected) return 12;
    if (isHovered) return 8;
    if (normalizedActivation > 75) return 6;
    if (normalizedActivation > 50) return 4;
    return 0;
  }, [isSelected, isHovered, normalizedActivation]);

  // Event handlers
  const handleClick = useCallback((e) => {
    e.stopPropagation();
    onClick?.(muscleId);
  }, [muscleId, onClick]);

  const handleMouseEnter = useCallback(() => {
    onHover?.(muscleId);
  }, [muscleId, onHover]);

  const handleMouseLeave = useCallback(() => {
    onHover?.(null);
  }, [onHover]);

  // Detect touch device for larger hit areas
  const isTouchDevice = typeof window !== 'undefined' &&
    ('ontouchstart' in window || navigator.maxTouchPoints > 0);

  // Animation variants
  const pathVariants = {
    initial: { scale: 1 },
    hover: { scale: motionAllowed ? 1.02 : 1 },
    selected: { scale: 1 },
    tap: { scale: 0.98 },
  };

  // Pulse animation for selected state
  const pulseVariants = {
    selected: {
      opacity: [0.6, 1, 0.6],
      scale: [1, 1.02, 1],
    },
  };

  return (
    <g className={clsx('muscle-region', className)}>
      {/* Glow effect layer (behind the main path) */}
      {glowIntensity > 0 && motionAllowed && (
        <motion.path
          d={path}
          fill={glowColor}
          fillOpacity={0.4}
          filter={`blur(${glowIntensity}px)`}
          style={{ pointerEvents: 'none' }}
          initial={{ opacity: 0 }}
          animate={{ opacity: isSelected ? 0.8 : 0.5 }}
          transition={{ duration: ANIMATION.hover }}
        />
      )}

      {/* Main muscle path */}
      <motion.path
        d={path}
        fill={fillColor}
        fillOpacity={fillOpacity}
        stroke={strokeColor}
        strokeWidth={isSelected ? 2 : isTouchDevice ? TOUCH_EXPANSION : 1}
        strokeOpacity={isSelected || isHovered ? 1 : 0}
        style={{
          cursor: 'pointer',
          pointerEvents: 'all',
        }}
        variants={pathVariants}
        initial="initial"
        animate={isSelected ? 'selected' : isHovered ? 'hover' : 'initial'}
        whileTap="tap"
        onClick={handleClick}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onTouchEnd={handleClick}
        transition={{
          duration: motionAllowed ? ANIMATION.hover : 0,
          ease: 'easeOut',
        }}
      />

      {/* Selection pulse ring */}
      {isSelected && motionAllowed && (
        <motion.path
          d={path}
          fill="none"
          stroke={muscle?.glowColor || glowColor}
          strokeWidth={3}
          strokeDasharray="6 3"
          strokeOpacity={0.6}
          style={{ pointerEvents: 'none' }}
          animate={pulseVariants.selected}
          transition={{
            duration: ANIMATION.pulse,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
      )}
    </g>
  );
};

MuscleRegion.displayName = 'MuscleRegion';

// ============================================
// MUSCLE REGION GROUP (for muscles with multiple paths)
// ============================================

/**
 * MuscleRegionGroup - Renders multiple paths for a single muscle
 *
 * Some muscles have multiple SVG paths (e.g., left/right sides).
 * This component groups them and handles selection/hover as one unit.
 */
export const MuscleRegionGroup = ({
  muscleId,
  paths = [],
  activation = 0,
  isSelected = false,
  isHovered = false,
  onClick,
  onHover,
  colorScheme = 'heat',
  showLabel = true,
  className,
}) => {
  if (!paths.length) return null;

  return (
    <g className={clsx('muscle-region-group', className)}>
      {paths.map((pathData, index) => (
        <MuscleRegion
          key={`${muscleId}-${pathData.side || index}`}
          muscleId={muscleId}
          path={pathData.d}
          activation={activation}
          isSelected={isSelected}
          isHovered={isHovered}
          onClick={onClick}
          onHover={onHover}
          colorScheme={colorScheme}
          showLabel={showLabel && index === 0}
        />
      ))}
    </g>
  );
};

MuscleRegionGroup.displayName = 'MuscleRegionGroup';

export default MuscleRegion;
