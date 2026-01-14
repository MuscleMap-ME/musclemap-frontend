/**
 * MuscleHeroAnimation Component
 *
 * A lightweight, SVG-based muscle visualization for the landing page.
 * Features bioluminescent glow effects, sequential muscle highlighting,
 * breathing idle animation, particle effects, and interactive hover/click.
 *
 * @example
 * // Auto-playing hero animation
 * <MuscleHeroAnimation
 *   autoPlay
 *   highlightSequence={['chest', 'shoulders', 'arms', 'abs', 'legs']}
 *   style="bioluminescent"
 *   size="lg"
 * />
 *
 * // Interactive version
 * <MuscleHeroAnimation
 *   interactive
 *   style="neon"
 *   onMuscleClick={(muscle) => console.log('Clicked:', muscle)}
 * />
 *
 * // Static with specific muscle highlighted
 * <MuscleHeroAnimation
 *   highlightSequence={['chest']}
 *   autoPlay={false}
 * />
 */

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MUSCLE_PATHS,
  VIEWBOX,
  DEFAULT_HIGHLIGHT_SEQUENCE,
  getMusclePathsForView,
} from './musclePathData';

// Size presets
const SIZE_PRESETS = {
  sm: { width: 180, height: 320 },
  md: { width: 280, height: 480 },
  lg: { width: 360, height: 600 },
  xl: { width: 440, height: 720 },
};

// Style presets with enhanced visual configurations
const STYLE_PRESETS = {
  bioluminescent: {
    baseColor: 'rgba(139, 92, 246, 0.15)', // violet base
    glowIntensity: 1.2,
    pulseSpeed: 3,
    breathingScale: 1.02,
    particleColor: 'rgba(167, 139, 250, 0.8)',
    particleCount: 12,
    gradientColors: ['#8b5cf6', '#6366f1', '#ec4899'],
  },
  neon: {
    baseColor: 'rgba(6, 182, 212, 0.2)', // cyan base
    glowIntensity: 1.5,
    pulseSpeed: 2,
    breathingScale: 1.01,
    particleColor: 'rgba(34, 211, 238, 0.8)',
    particleCount: 15,
    gradientColors: ['#06b6d4', '#0ea5e9', '#22d3ee'],
  },
  subtle: {
    baseColor: 'rgba(255, 255, 255, 0.08)',
    glowIntensity: 0.8,
    pulseSpeed: 4,
    breathingScale: 1.01,
    particleColor: 'rgba(255, 255, 255, 0.5)',
    particleCount: 6,
    gradientColors: ['#9ca3af', '#6b7280', '#d1d5db'],
  },
};

// Particle component for floating effect
const Particle = React.memo(function Particle({ color, delay, duration, startX, startY }) {
  return (
    <motion.circle
      cx={startX}
      cy={startY}
      r={Math.random() * 2 + 1}
      fill={color}
      initial={{ opacity: 0, cy: startY }}
      animate={{
        opacity: [0, 0.8, 0],
        cy: startY - 40 - Math.random() * 30,
        cx: startX + (Math.random() - 0.5) * 20,
      }}
      transition={{
        duration: duration,
        delay: delay,
        repeat: Infinity,
        ease: 'easeOut',
      }}
    />
  );
});

// Particle system for highlighted muscles
const ParticleSystem = React.memo(function ParticleSystem({
  muscle,
  view,
  stylePreset,
  isActive,
}) {
  if (!isActive || !muscle) return null;

  const paths = getMusclePathsForView(muscle, view);
  if (paths.length === 0) return null;

  // Calculate approximate center of muscle for particle origin
  const musclePositions = {
    chest: { x: 100, y: 125 },
    shoulders: { x: 100, y: 105 },
    arms: { x: 40, y: 165 },
    biceps: { x: 40, y: 165 },
    triceps: { x: 40, y: 165 },
    forearms: { x: 30, y: 220 },
    back: { x: 100, y: 155 },
    core: { x: 100, y: 180 },
    abs: { x: 100, y: 175 },
    obliques: { x: 75, y: 185 },
    legs: { x: 85, y: 290 },
    quads: { x: 85, y: 290 },
    hamstrings: { x: 85, y: 290 },
    calves: { x: 75, y: 380 },
    glutes: { x: 85, y: 240 },
  };

  const pos = musclePositions[muscle.id] || { x: 100, y: 200 };
  const particleCount = stylePreset.particleCount;

  return (
    <g className="particle-system">
      {Array.from({ length: particleCount }).map((_, i) => (
        <Particle
          key={`particle-${muscle.id}-${i}`}
          color={stylePreset.particleColor}
          delay={i * 0.15}
          duration={2 + Math.random()}
          startX={pos.x + (Math.random() - 0.5) * 30}
          startY={pos.y}
        />
      ))}
      {/* Mirror particles for right side of bilateral muscles */}
      {['arms', 'biceps', 'triceps', 'forearms', 'legs', 'quads', 'hamstrings', 'calves', 'shoulders'].includes(muscle.id) && (
        Array.from({ length: Math.floor(particleCount / 2) }).map((_, i) => (
          <Particle
            key={`particle-right-${muscle.id}-${i}`}
            color={stylePreset.particleColor}
            delay={i * 0.2 + 0.1}
            duration={2 + Math.random()}
            startX={200 - pos.x + (Math.random() - 0.5) * 30}
            startY={pos.y}
          />
        ))
      )}
    </g>
  );
});

// Body silhouette for front/back views
const BodySilhouette = React.memo(function BodySilhouette({ view, stylePreset }) {
  const isFront = view === 'front';

  return (
    <g className="body-silhouette" opacity="0.4">
      {/* Head */}
      <ellipse
        cx="100"
        cy="45"
        rx="22"
        ry="28"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        opacity="0.5"
      />

      {/* Neck */}
      <path
        d="M 92 70 L 92 85 M 108 70 L 108 85"
        stroke="currentColor"
        strokeWidth="1.5"
        opacity="0.4"
        fill="none"
      />

      {/* Torso */}
      <path
        d={isFront
          ? `M 55 95 Q 50 140, 55 190 Q 60 230, 75 250 L 75 220 Q 100 230, 125 220 L 125 250 Q 140 230, 145 190 Q 150 140, 145 95 Q 125 85, 100 85 Q 75 85, 55 95`
          : `M 55 95 Q 50 140, 55 190 Q 60 230, 75 250 L 75 220 Q 100 230, 125 220 L 125 250 Q 140 230, 145 190 Q 150 140, 145 95 Q 125 85, 100 85 Q 75 85, 55 95`
        }
        fill={stylePreset.baseColor}
        stroke="currentColor"
        strokeWidth="1"
        opacity="0.3"
      />

      {/* Arms */}
      <path
        d="M 55 100 Q 35 110, 28 140 Q 20 175, 25 200 Q 22 230, 25 260"
        stroke="currentColor"
        strokeWidth="8"
        strokeLinecap="round"
        fill="none"
        opacity="0.3"
      />
      <path
        d="M 145 100 Q 165 110, 172 140 Q 180 175, 175 200 Q 178 230, 175 260"
        stroke="currentColor"
        strokeWidth="8"
        strokeLinecap="round"
        fill="none"
        opacity="0.3"
      />

      {/* Legs */}
      <path
        d="M 78 248 Q 70 290, 68 340 Q 66 380, 70 420"
        stroke="currentColor"
        strokeWidth="12"
        strokeLinecap="round"
        fill="none"
        opacity="0.3"
      />
      <path
        d="M 122 248 Q 130 290, 132 340 Q 134 380, 130 420"
        stroke="currentColor"
        strokeWidth="12"
        strokeLinecap="round"
        fill="none"
        opacity="0.3"
      />
    </g>
  );
});

// Individual muscle group component with glow effects
const MuscleGroup = React.memo(function MuscleGroup({
  muscle,
  view,
  isHighlighted,
  isHovered,
  onClick,
  onHover,
  stylePreset,
  interactive,
}) {
  const paths = getMusclePathsForView(muscle, view);

  if (paths.length === 0) return null;

  const baseOpacity = isHighlighted ? 0.9 : isHovered ? 0.7 : 0.25;
  const glowIntensity = stylePreset.glowIntensity;

  return (
    <g
      className={`muscle-group muscle-${muscle.id}`}
      onClick={() => onClick?.(muscle.id)}
      onMouseEnter={() => interactive && onHover?.(muscle.id)}
      onMouseLeave={() => interactive && onHover?.(null)}
      style={{ cursor: interactive ? 'pointer' : 'default' }}
    >
      {paths.map((path, index) => (
        <motion.path
          key={`${muscle.id}-${index}`}
          d={path.d}
          fill={muscle.color}
          stroke={isHighlighted || isHovered ? muscle.glowColor : muscle.color}
          strokeWidth={isHighlighted ? 2 : 1}
          initial={{ opacity: 0.15 }}
          animate={{
            opacity: baseOpacity,
            scale: isHighlighted ? 1.02 : 1,
            filter: isHighlighted
              ? `drop-shadow(0 0 ${8 * glowIntensity}px ${muscle.glowColor}) drop-shadow(0 0 ${16 * glowIntensity}px ${muscle.glowColor})`
              : isHovered
                ? `drop-shadow(0 0 ${4 * glowIntensity}px ${muscle.glowColor})`
                : 'none',
          }}
          transition={{
            opacity: { duration: 0.4, ease: 'easeInOut' },
            scale: { duration: 0.3, ease: 'easeOut' },
            filter: { duration: 0.3 },
          }}
          style={{
            transformOrigin: 'center',
          }}
        />
      ))}

      {/* Glow overlay for highlighted state */}
      <AnimatePresence>
        {isHighlighted && paths.map((path, index) => (
          <motion.path
            key={`glow-${muscle.id}-${index}`}
            d={path.d}
            fill="none"
            stroke={muscle.glowColor}
            strokeWidth={3}
            initial={{ opacity: 0 }}
            animate={{
              opacity: [0.3, 0.7, 0.3],
            }}
            exit={{ opacity: 0 }}
            transition={{
              opacity: {
                duration: stylePreset.pulseSpeed,
                repeat: Infinity,
                ease: 'easeInOut',
              },
            }}
            style={{
              filter: `blur(4px)`,
            }}
          />
        ))}
      </AnimatePresence>
    </g>
  );
});

// Muscle label tooltip
const MuscleLabel = React.memo(function MuscleLabel({ muscle, isVisible }) {
  if (!isVisible || !muscle) return null;

  // Approximate center positions for each muscle group
  const positions = {
    chest: { x: 100, y: 125 },
    shoulders: { x: 100, y: 105 },
    arms: { x: 100, y: 165 },
    biceps: { x: 100, y: 165 },
    triceps: { x: 100, y: 165 },
    forearms: { x: 100, y: 225 },
    back: { x: 100, y: 155 },
    core: { x: 100, y: 185 },
    abs: { x: 100, y: 175 },
    obliques: { x: 100, y: 185 },
    legs: { x: 100, y: 290 },
    quads: { x: 100, y: 290 },
    hamstrings: { x: 100, y: 290 },
    calves: { x: 100, y: 380 },
    glutes: { x: 100, y: 240 },
  };

  const pos = positions[muscle.id] || { x: 100, y: 200 };

  return (
    <motion.g
      initial={{ opacity: 0, y: 5 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 5 }}
      transition={{ duration: 0.2 }}
    >
      <rect
        x={pos.x - 35}
        y={pos.y - 14}
        width={70}
        height={28}
        rx={6}
        fill="rgba(0, 0, 0, 0.85)"
        stroke={muscle.glowColor}
        strokeWidth={1.5}
      />
      <text
        x={pos.x}
        y={pos.y + 5}
        textAnchor="middle"
        fill={muscle.glowColor}
        fontSize="11"
        fontWeight="600"
        fontFamily="Inter, sans-serif"
      >
        {muscle.name}
      </text>
    </motion.g>
  );
});

// Main component
export default function MuscleHeroAnimation({
  autoPlay = true,
  highlightSequence = DEFAULT_HIGHLIGHT_SEQUENCE,
  speed = 2000,
  style = 'bioluminescent',
  view = 'front',
  interactive = false,
  showLabels = true,
  showParticles = true,
  size = 'md',
  onMuscleClick,
  className = '',
}) {
  const [highlightedMuscle, setHighlightedMuscle] = useState(null);
  const [hoveredMuscle, setHoveredMuscle] = useState(null);
  const [sequenceIndex, setSequenceIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(autoPlay);
  const containerRef = useRef(null);

  // Get style preset
  const stylePreset = useMemo(() => {
    return STYLE_PRESETS[style] || STYLE_PRESETS.bioluminescent;
  }, [style]);

  // Get size dimensions
  const dimensions = useMemo(() => {
    if (typeof size === 'object') {
      // Responsive object: { base: 'sm', md: 'md', lg: 'lg' }
      return SIZE_PRESETS.md; // Default, actual responsive handled by CSS
    }
    return SIZE_PRESETS[size] || SIZE_PRESETS.md;
  }, [size]);

  // Generate responsive class names for size
  const responsiveSizeClasses = useMemo(() => {
    if (typeof size === 'object') {
      const classes = [];
      if (size.base) classes.push(`w-[${SIZE_PRESETS[size.base]?.width}px]`);
      if (size.sm) classes.push(`sm:w-[${SIZE_PRESETS[size.sm]?.width}px]`);
      if (size.md) classes.push(`md:w-[${SIZE_PRESETS[size.md]?.width}px]`);
      if (size.lg) classes.push(`lg:w-[${SIZE_PRESETS[size.lg]?.width}px]`);
      return classes.join(' ');
    }
    return '';
  }, [size]);

  // Auto-play sequence
  useEffect(() => {
    if (!isPlaying || highlightSequence.length === 0) {
      return;
    }

    const interval = setInterval(() => {
      setSequenceIndex((prev) => (prev + 1) % highlightSequence.length);
    }, speed);

    return () => clearInterval(interval);
  }, [isPlaying, highlightSequence, speed]);

  // Update highlighted muscle based on sequence
  useEffect(() => {
    if (isPlaying && highlightSequence.length > 0) {
      setHighlightedMuscle(highlightSequence[sequenceIndex]);
    }
  }, [isPlaying, sequenceIndex, highlightSequence]);

  // Handle muscle click
  const handleMuscleClick = useCallback((muscleId) => {
    if (interactive) {
      setIsPlaying(false);
      setHighlightedMuscle(muscleId);
    }
    onMuscleClick?.(muscleId);
  }, [interactive, onMuscleClick]);

  // Handle muscle hover
  const handleMuscleHover = useCallback((muscleId) => {
    if (interactive) {
      setHoveredMuscle(muscleId);
    }
  }, [interactive]);

  // Resume autoplay when clicking elsewhere
  const handleBackgroundClick = useCallback((e) => {
    // Only handle clicks on the background, not on muscles
    if (e.target === e.currentTarget || e.target.tagName === 'svg') {
      if (autoPlay && !isPlaying && interactive) {
        setIsPlaying(true);
        setHighlightedMuscle(null);
      }
    }
  }, [autoPlay, isPlaying, interactive]);

  // Get visible muscles for current view
  const visibleMuscles = useMemo(() => {
    return Object.values(MUSCLE_PATHS).filter(muscle => {
      const paths = getMusclePathsForView(muscle, view);
      return paths.length > 0;
    });
  }, [view]);

  // Get currently highlighted muscle data
  const highlightedMuscleData = useMemo(() => {
    return highlightedMuscle ? MUSCLE_PATHS[highlightedMuscle] : null;
  }, [highlightedMuscle]);

  const hoveredMuscleData = useMemo(() => {
    return hoveredMuscle ? MUSCLE_PATHS[hoveredMuscle] : null;
  }, [hoveredMuscle]);

  // Active muscle for particles
  const activeMuscleData = hoveredMuscleData || highlightedMuscleData;

  return (
    <div
      ref={containerRef}
      className={`muscle-hero-animation relative ${responsiveSizeClasses} ${className}`}
      onClick={handleBackgroundClick}
      style={{
        width: typeof size === 'string' ? dimensions.width : undefined,
        maxWidth: '100%',
      }}
    >
      {/* Gradient background glow */}
      <div
        className="absolute inset-0 pointer-events-none rounded-2xl"
        style={{
          background: `radial-gradient(ellipse at center, ${highlightedMuscleData?.glowColor || stylePreset.gradientColors[0]}20 0%, transparent 70%)`,
          transition: 'background 0.5s ease-in-out',
        }}
      />

      <motion.svg
        viewBox={VIEWBOX}
        className="w-full h-auto"
        style={{
          maxWidth: dimensions.width,
          margin: '0 auto',
          display: 'block',
          color: 'rgba(255, 255, 255, 0.6)',
        }}
        // Breathing animation when idle
        animate={{
          scale: isPlaying
            ? [1, stylePreset.breathingScale, 1]
            : 1,
        }}
        transition={{
          scale: {
            duration: 4,
            repeat: Infinity,
            ease: 'easeInOut',
          },
        }}
      >
        {/* SVG Filters */}
        <defs>
          <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>

          <filter id="glow-intense" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="6" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>

          {/* Gradient for body outline */}
          <linearGradient id="bodyGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={stylePreset.gradientColors[0]} stopOpacity="0.3" />
            <stop offset="50%" stopColor={stylePreset.gradientColors[1]} stopOpacity="0.2" />
            <stop offset="100%" stopColor={stylePreset.gradientColors[2]} stopOpacity="0.3" />
          </linearGradient>

          {/* Radial gradient for glow effect */}
          <radialGradient id="muscleGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={activeMuscleData?.glowColor || '#8b5cf6'} stopOpacity="0.6" />
            <stop offset="100%" stopColor={activeMuscleData?.glowColor || '#8b5cf6'} stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Body silhouette */}
        <BodySilhouette view={view} stylePreset={stylePreset} />

        {/* Muscle groups */}
        {visibleMuscles.map((muscle) => (
          <MuscleGroup
            key={muscle.id}
            muscle={muscle}
            view={view}
            isHighlighted={highlightedMuscle === muscle.id}
            isHovered={hoveredMuscle === muscle.id}
            onClick={handleMuscleClick}
            onHover={handleMuscleHover}
            stylePreset={stylePreset}
            interactive={interactive}
          />
        ))}

        {/* Particle effects */}
        {showParticles && (
          <ParticleSystem
            muscle={activeMuscleData}
            view={view}
            stylePreset={stylePreset}
            isActive={!!(highlightedMuscle || hoveredMuscle)}
          />
        )}

        {/* Labels */}
        {showLabels && (
          <AnimatePresence>
            <MuscleLabel
              muscle={hoveredMuscleData || highlightedMuscleData}
              isVisible={!!(hoveredMuscle || highlightedMuscle)}
            />
          </AnimatePresence>
        )}
      </motion.svg>

      {/* Progress indicator for autoplay */}
      {isPlaying && highlightSequence.length > 1 && (
        <div className="flex justify-center gap-1.5 mt-4">
          {highlightSequence.map((muscleId, index) => (
            <motion.div
              key={muscleId}
              className="w-2 h-2 rounded-full"
              style={{
                backgroundColor: index === sequenceIndex
                  ? MUSCLE_PATHS[muscleId]?.glowColor || '#8b5cf6'
                  : 'rgba(255, 255, 255, 0.2)',
              }}
              animate={{
                scale: index === sequenceIndex ? 1.2 : 1,
              }}
              transition={{ duration: 0.2 }}
            />
          ))}
        </div>
      )}

      {/* View label */}
      <div className="text-center mt-2">
        <span className="text-xs text-gray-500 uppercase tracking-wider">
          {view} view
        </span>
      </div>

      {/* Interactive hint */}
      {interactive && isPlaying && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 2 }}
          className="text-center mt-2"
        >
          <span className="text-xs text-gray-600">
            Click a muscle to highlight
          </span>
        </motion.div>
      )}
    </div>
  );
}

// Named exports for convenience
export { MuscleHeroAnimation };
export { SIZE_PRESETS, STYLE_PRESETS };
