/**
 * MuscleModel - Interactive SVG-based anatomical body visualization
 *
 * A performant, touch-friendly muscle body model with:
 * - Smooth front/back view transitions
 * - Hover effects with glow
 * - Click selection with highlight ring
 * - Color mapping based on activation level (cold to hot gradient)
 * - Responsive sizing with larger hit areas on mobile
 *
 * @module MuscleModel
 */

import React, { useMemo, useCallback, useRef, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import clsx from 'clsx';
import {
  MUSCLE_DATA,
  VIEWBOX,
  BODY_OUTLINE,
  GLOW_FILTER_DEF,
  getMusclesForView,
  getMusclePathsForView,
  getActivationColor,
  ACTIVATION_COLORS,
} from './muscleData';
import { useMotionAllowed } from '../../hooks/useReducedMotion';

// ============================================
// CONSTANTS
// ============================================

/**
 * Touch-friendly hit area expansion (pixels)
 */
const TOUCH_HIT_AREA_EXPANSION = 8;

/**
 * Animation durations (ms)
 */
const ANIMATION_DURATION = {
  viewTransition: 0.4,
  hover: 0.2,
  select: 0.3,
};

// ============================================
// MUSCLE PATH COMPONENT
// ============================================

/**
 * MusclePath - Individual muscle path with interaction states
 */
const MusclePath = React.memo(({
  muscle,
  path,
  isSelected,
  isHovered,
  activation = 0,
  onHover,
  onSelect,
  motionAllowed,
  isTouchDevice,
}) => {
  const handleMouseEnter = useCallback(() => {
    if (!isTouchDevice) {
      onHover?.(muscle.id);
    }
  }, [muscle.id, onHover, isTouchDevice]);

  const handleMouseLeave = useCallback(() => {
    if (!isTouchDevice) {
      onHover?.(null);
    }
  }, [onHover, isTouchDevice]);

  const handleClick = useCallback((e) => {
    e.stopPropagation();
    onSelect?.(muscle.id);
  }, [muscle.id, onSelect]);

  // Calculate fill color based on activation level
  const fillColor = useMemo(() => {
    if (activation > 0) {
      return getActivationColor(activation);
    }
    return isSelected ? muscle.color : ACTIVATION_COLORS.none;
  }, [activation, isSelected, muscle.color]);

  // Calculate opacity based on state
  const fillOpacity = useMemo(() => {
    if (isSelected) return 0.95;
    if (isHovered) return 0.85;
    if (activation > 0) return Math.max(0.5, activation / 100);
    return 0.4;
  }, [isSelected, isHovered, activation]);

  // Determine filter for glow effect
  const filter = useMemo(() => {
    if (isSelected) return 'url(#muscle-glow-intense)';
    if (isHovered) return 'url(#muscle-hover)';
    if (activation > 75) return 'url(#muscle-glow)';
    return 'none';
  }, [isSelected, isHovered, activation]);

  // Touch-friendly stroke width for hit area
  const strokeWidth = isTouchDevice ? TOUCH_HIT_AREA_EXPANSION : 4;

  return (
    <motion.path
      d={path.d}
      fill={fillColor}
      fillOpacity={fillOpacity}
      stroke={isSelected ? muscle.glowColor : 'transparent'}
      strokeWidth={isSelected ? 3 : strokeWidth}
      strokeOpacity={isSelected ? 1 : 0}
      filter={filter}
      style={{
        cursor: 'pointer',
        pointerEvents: 'all',
      }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={handleClick}
      onTouchEnd={handleClick}
      initial={false}
      animate={{
        scale: isHovered && !isSelected ? 1.02 : 1,
      }}
      transition={{
        duration: motionAllowed ? ANIMATION_DURATION.hover : 0,
        ease: 'easeOut',
      }}
      whileTap={{ scale: 0.98 }}
    />
  );
});

MusclePath.displayName = 'MusclePath';

// ============================================
// BODY OUTLINE COMPONENT
// ============================================

/**
 * BodyOutline - The body silhouette outline
 */
const BodyOutline = React.memo(({ view }) => (
  <path
    d={BODY_OUTLINE[view]}
    fill="none"
    stroke="rgba(148, 163, 184, 0.3)"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
  />
));

BodyOutline.displayName = 'BodyOutline';

// ============================================
// HEAD COMPONENT
// ============================================

/**
 * Head - The head silhouette (non-interactive)
 */
const Head = React.memo(() => (
  <ellipse
    cx="100"
    cy="50"
    rx="25"
    ry="30"
    fill="rgba(71, 85, 105, 0.2)"
    stroke="rgba(148, 163, 184, 0.3)"
    strokeWidth="1"
  />
));

Head.displayName = 'Head';

// ============================================
// MAIN MUSCLE MODEL COMPONENT
// ============================================

/**
 * MuscleModel - Interactive SVG body visualization
 *
 * @param {Object} props
 * @param {string} props.view - Current view ('front' | 'back')
 * @param {string|null} props.selectedMuscle - Currently selected muscle ID
 * @param {string|null} props.hoveredMuscle - Currently hovered muscle ID
 * @param {Object} props.muscleActivations - Map of muscle IDs to activation levels (0-100)
 * @param {Function} props.onMuscleSelect - Callback when muscle is clicked
 * @param {Function} props.onMuscleHover - Callback when muscle is hovered
 * @param {number} props.rotation - Y-axis rotation for 3D-like effect (degrees)
 * @param {number} props.zoom - Zoom level (1 = normal)
 * @param {string} props.className - Additional CSS classes
 */
const MuscleModel = ({
  view = 'front',
  selectedMuscle = null,
  hoveredMuscle = null,
  muscleActivations = {},
  onMuscleSelect,
  onMuscleHover,
  rotation = 0,
  zoom = 1,
  className,
}) => {
  const containerRef = useRef(null);
  const [isTouchDevice, setIsTouchDevice] = useState(false);
  const motionAllowed = useMotionAllowed();

  // Detect touch device on mount
  useEffect(() => {
    setIsTouchDevice('ontouchstart' in window || navigator.maxTouchPoints > 0);
  }, []);

  // Get muscles visible in current view
  const visibleMuscles = useMemo(() => getMusclesForView(view), [view]);

  // Calculate transform for rotation effect
  const transformStyle = useMemo(() => {
    const rotationNormalized = rotation % 360;
    const scaleX = Math.cos((rotationNormalized * Math.PI) / 180);

    return {
      transform: `scale(${zoom}) scaleX(${Math.abs(scaleX) < 0.1 ? 0.1 : scaleX})`,
      transformOrigin: 'center center',
    };
  }, [rotation, zoom]);

  // Handle background click to clear selection
  const handleBackgroundClick = useCallback(() => {
    onMuscleSelect?.(null);
  }, [onMuscleSelect]);

  // Handle hover events
  const handleHover = useCallback((muscleId) => {
    onMuscleHover?.(muscleId);
  }, [onMuscleHover]);

  // Render muscle paths for a specific muscle
  const renderMusclePaths = useCallback((muscle) => {
    const paths = getMusclePathsForView(muscle, view);
    if (!paths.length) return null;

    return paths.map((path, index) => (
      <MusclePath
        key={`${muscle.id}-${path.side || index}`}
        muscle={muscle}
        path={path}
        isSelected={selectedMuscle === muscle.id}
        isHovered={hoveredMuscle === muscle.id}
        activation={muscleActivations[muscle.id] || 0}
        onHover={handleHover}
        onSelect={onMuscleSelect}
        motionAllowed={motionAllowed}
        isTouchDevice={isTouchDevice}
      />
    ));
  }, [
    view,
    selectedMuscle,
    hoveredMuscle,
    muscleActivations,
    handleHover,
    onMuscleSelect,
    motionAllowed,
    isTouchDevice,
  ]);

  return (
    <div
      ref={containerRef}
      className={clsx(
        'relative w-full h-full flex items-center justify-center',
        className
      )}
      onClick={handleBackgroundClick}
    >
      <AnimatePresence mode="wait">
        <motion.svg
          key={view}
          viewBox={VIEWBOX}
          className="w-full h-full max-w-full max-h-full"
          style={transformStyle}
          initial={motionAllowed ? { opacity: 0, x: view === 'front' ? -30 : 30 } : false}
          animate={{ opacity: 1, x: 0 }}
          exit={motionAllowed ? { opacity: 0, x: view === 'front' ? 30 : -30 } : undefined}
          transition={{ duration: motionAllowed ? ANIMATION_DURATION.viewTransition : 0 }}
          preserveAspectRatio="xMidYMid meet"
        >
          {/* Filter definitions */}
          <defs dangerouslySetInnerHTML={{ __html: GLOW_FILTER_DEF }} />

          {/* Background gradient */}
          <defs>
            <radialGradient id="bodyGradient" cx="50%" cy="40%" r="60%">
              <stop offset="0%" stopColor="rgba(15, 23, 42, 0.3)" />
              <stop offset="100%" stopColor="rgba(2, 6, 23, 0.5)" />
            </radialGradient>
          </defs>

          {/* Body glow background */}
          <ellipse
            cx="100"
            cy="220"
            rx="90"
            ry="180"
            fill="url(#bodyGradient)"
            opacity="0.5"
          />

          {/* Head */}
          <Head />

          {/* Body outline */}
          <BodyOutline view={view} />

          {/* Muscle groups - rendered in order for proper layering */}
          <g className="muscles">
            {visibleMuscles.map(renderMusclePaths)}
          </g>

          {/* Selection ring for selected muscle */}
          {selectedMuscle && (
            <motion.circle
              cx="100"
              cy="220"
              r="95"
              fill="none"
              stroke={MUSCLE_DATA[selectedMuscle]?.glowColor || '#0066ff'}
              strokeWidth="2"
              strokeDasharray="8 4"
              opacity="0.3"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 0.3 }}
              transition={{ duration: 0.3 }}
            />
          )}
        </motion.svg>
      </AnimatePresence>

      {/* Hover tooltip */}
      <AnimatePresence>
        {hoveredMuscle && MUSCLE_DATA[hoveredMuscle] && (
          <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 5 }}
            className="absolute top-4 left-1/2 -translate-x-1/2 px-3 py-2 rounded-lg z-10
                       bg-[var(--void-deep,#0f172a)] border border-[var(--border-subtle,#334155)]
                       shadow-lg pointer-events-none"
          >
            <div className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded-full"
                style={{
                  backgroundColor: muscleActivations[hoveredMuscle]
                    ? getActivationColor(muscleActivations[hoveredMuscle])
                    : MUSCLE_DATA[hoveredMuscle].color,
                }}
              />
              <div>
                <p className="text-sm font-medium text-[var(--text-primary,#f1f5f9)]">
                  {MUSCLE_DATA[hoveredMuscle].commonName}
                </p>
                <p className="text-xs text-[var(--text-tertiary,#94a3b8)]">
                  {muscleActivations[hoveredMuscle]
                    ? `${Math.round(muscleActivations[hoveredMuscle])}% activation`
                    : 'Click for details'}
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

MuscleModel.displayName = 'MuscleModel';

export default MuscleModel;
