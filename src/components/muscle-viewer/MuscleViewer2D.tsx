/**
 * MuscleViewer2D
 * SVG-based 2D muscle visualization (fallback for low-end devices)
 */

import React, { useMemo, useCallback, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import clsx from 'clsx';
import type { MuscleViewer2DProps } from './types';
import { useMotionAllowed } from '../../hooks/useReducedMotion';

// ============================================
// MUSCLE PATH DATA
// ============================================

/**
 * SVG paths for muscle regions (simplified body outline)
 * Viewbox is 100x200 for compact representation
 */
const MUSCLE_PATHS = {
  front: {
    chest: {
      path: 'M35 55 Q40 50 50 52 Q60 50 65 55 L63 70 Q50 75 37 70 Z',
      center: [50, 62],
    },
    abs: {
      path: 'M40 72 L60 72 L58 110 L42 110 Z',
      center: [50, 90],
    },
    obliques: {
      path: 'M35 70 L40 72 L42 110 L35 108 Z M60 72 L65 70 L65 108 L58 110 Z',
      center: [50, 90],
    },
    front_delts: {
      path: 'M30 52 L35 55 L35 65 L28 63 Z M65 55 L70 52 L72 63 L65 65 Z',
      center: [50, 58],
    },
    biceps: {
      path: 'M25 65 L30 63 L28 85 L22 83 Z M70 63 L75 65 L78 83 L72 85 Z',
      center: [50, 74],
    },
    forearms: {
      path: 'M22 85 L28 87 L25 115 L18 112 Z M72 87 L78 85 L82 112 L75 115 Z',
      center: [50, 100],
    },
    quads: {
      path: 'M38 115 L48 113 L47 160 L35 158 Z M52 113 L62 115 L65 158 L53 160 Z',
      center: [50, 136],
    },
    hip_flexors: {
      path: 'M42 110 L50 112 L58 110 L55 118 L50 120 L45 118 Z',
      center: [50, 115],
    },
    adductors: {
      path: 'M45 120 L50 118 L55 120 L53 145 L50 148 L47 145 Z',
      center: [50, 133],
    },
  },
  back: {
    upper_back: {
      path: 'M38 52 L50 50 L62 52 L60 70 L50 72 L40 70 Z',
      center: [50, 60],
    },
    lats: {
      path: 'M32 65 L40 70 L40 95 L35 90 Z M60 70 L68 65 L65 90 L60 95 Z',
      center: [50, 80],
    },
    lower_back: {
      path: 'M40 92 L60 92 L58 112 L42 112 Z',
      center: [50, 102],
    },
    rear_delts: {
      path: 'M28 52 L35 55 L35 62 L27 58 Z M65 55 L72 52 L73 58 L65 62 Z',
      center: [50, 56],
    },
    traps: {
      path: 'M40 42 L50 38 L60 42 L58 52 L50 50 L42 52 Z',
      center: [50, 46],
    },
    triceps: {
      path: 'M25 63 L32 65 L30 88 L23 85 Z M68 65 L75 63 L77 85 L70 88 Z',
      center: [50, 75],
    },
    glutes: {
      path: 'M38 110 L50 108 L62 110 L60 130 L50 132 L40 130 Z',
      center: [50, 120],
    },
    hamstrings: {
      path: 'M38 132 L48 130 L47 165 L35 163 Z M52 130 L62 132 L65 163 L53 165 Z',
      center: [50, 148],
    },
    calves: {
      path: 'M36 165 L45 163 L43 190 L34 188 Z M55 163 L64 165 L66 188 L57 190 Z',
      center: [50, 177],
    },
  },
};

/**
 * Get color from intensity using heatmap gradient
 */
function getIntensityColor(intensity: number): string {
  if (intensity <= 0) return 'rgba(100, 80, 80, 0.4)';

  // Blue -> Green -> Yellow -> Red
  if (intensity < 0.25) {
    const t = intensity * 4;
    return `rgba(${Math.round(50)}, ${Math.round(50 + t * 130)}, ${Math.round(200)}, 0.7)`;
  } else if (intensity < 0.5) {
    const t = (intensity - 0.25) * 4;
    return `rgba(${Math.round(t * 255)}, ${Math.round(180)}, ${Math.round(200 - t * 200)}, 0.8)`;
  } else if (intensity < 0.75) {
    const t = (intensity - 0.5) * 4;
    return `rgba(${Math.round(255)}, ${Math.round(180 - t * 80)}, ${Math.round(0)}, 0.85)`;
  } else {
    const t = (intensity - 0.75) * 4;
    return `rgba(${Math.round(255)}, ${Math.round(100 - t * 100)}, ${Math.round(0)}, 0.9)`;
  }
}

// ============================================
// MUSCLE REGION COMPONENT
// ============================================

interface MuscleRegionProps {
  muscleId: string;
  path: string;
  center: [number, number];
  intensity: number;
  isHovered: boolean;
  isSelected: boolean;
  showLabel: boolean;
  onClick: (id: string) => void;
  onHover: (id: string | null) => void;
}

function MuscleRegion({
  muscleId,
  path,
  center,
  intensity,
  isHovered,
  isSelected,
  showLabel,
  onClick,
  onHover,
}: MuscleRegionProps) {
  const motionAllowed = useMotionAllowed();
  const color = getIntensityColor(intensity);

  // Format muscle name for display
  const displayName = muscleId.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

  return (
    <g
      onClick={() => onClick(muscleId)}
      onMouseEnter={() => onHover(muscleId)}
      onMouseLeave={() => onHover(null)}
      style={{ cursor: 'pointer' }}
    >
      {/* Glow filter for high intensity */}
      {intensity > 0.5 && (
        <motion.path
          d={path}
          fill={color}
          filter="blur(4px)"
          opacity={intensity * 0.5}
          initial={false}
          animate={{ opacity: intensity * 0.5 }}
        />
      )}

      {/* Main muscle path */}
      <motion.path
        d={path}
        fill={color}
        stroke={isSelected ? '#0066ff' : isHovered ? '#88aaff' : 'rgba(255,255,255,0.2)'}
        strokeWidth={isSelected || isHovered ? 1.5 : 0.5}
        initial={false}
        animate={{
          fill: color,
          strokeWidth: isSelected || isHovered ? 1.5 : 0.5,
        }}
        transition={{ duration: motionAllowed ? 0.2 : 0 }}
      />

      {/* Label on hover */}
      {showLabel && isHovered && (
        <g>
          <rect
            x={center[0] - 20}
            y={center[1] - 8}
            width={40}
            height={12}
            rx={2}
            fill="rgba(0,0,0,0.8)"
          />
          <text
            x={center[0]}
            y={center[1] + 1}
            textAnchor="middle"
            fontSize="5"
            fill="white"
            fontFamily="Inter, system-ui, sans-serif"
          >
            {displayName}
          </text>
        </g>
      )}
    </g>
  );
}

// ============================================
// BODY OUTLINE COMPONENT
// ============================================

function BodyOutline({ view }: { view: 'front' | 'back' }) {
  const path = view === 'front'
    ? 'M50 15 Q35 20 30 35 L25 50 Q20 55 18 70 L20 90 Q22 100 25 115 L35 115 L35 160 Q33 175 34 190 L38 195 L45 195 L47 190 Q48 175 47 160 L50 155 L53 160 Q52 175 53 190 L55 195 L62 195 L66 190 Q67 175 65 160 L65 115 L75 115 Q78 100 80 90 L82 70 Q80 55 75 50 L70 35 Q65 20 50 15'
    : 'M50 15 Q35 20 30 35 L25 50 Q20 55 18 70 L20 90 Q22 100 25 115 L35 115 L35 160 Q33 175 34 190 L38 195 L45 195 L47 190 Q48 175 47 160 L50 155 L53 160 Q52 175 53 190 L55 195 L62 195 L66 190 Q67 175 65 160 L65 115 L75 115 Q78 100 80 90 L82 70 Q80 55 75 50 L70 35 Q65 20 50 15';

  return (
    <>
      {/* Faint body fill for visibility */}
      <path
        d={path}
        fill="rgba(71, 85, 105, 0.08)"
        stroke="none"
      />
      {/* Body outline */}
      <path
        d={path}
        fill="none"
        stroke="rgba(148, 163, 184, 0.25)"
        strokeWidth="0.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </>
  );
}

// ============================================
// MAIN COMPONENT
// ============================================

export function MuscleViewer2D({
  muscles,
  mode = 'card',
  interactive = true,
  showLabels = true,
  autoRotate: _autoRotate = false,
  initialView = 'front',
  colorScheme: _colorScheme = 'heatmap',
  onMuscleClick,
  onMuscleHover,
  className,
  style,
}: MuscleViewer2DProps): React.ReactElement {
  const motionAllowed = useMotionAllowed();
  const [currentView, setCurrentView] = useState<'front' | 'back'>(
    initialView === 'back' ? 'back' : 'front'
  );
  const [hoveredMuscle, setHoveredMuscle] = useState<string | null>(null);
  const [selectedMuscle, setSelectedMuscle] = useState<string | null>(null);

  // Build intensity map from muscles array
  const intensityMap = useMemo(() => {
    const map: Record<string, number> = {};
    muscles.forEach(({ id, intensity, isPrimary }) => {
      const adjustedIntensity = isPrimary !== false ? intensity : intensity * 0.5;
      map[id] = Math.max(map[id] || 0, adjustedIntensity);
    });
    return map;
  }, [muscles]);

  // Handle muscle click
  const handleMuscleClick = useCallback((muscleId: string) => {
    if (!interactive) return;
    setSelectedMuscle(prev => prev === muscleId ? null : muscleId);
    onMuscleClick?.(muscleId);
  }, [interactive, onMuscleClick]);

  // Handle muscle hover
  const handleMuscleHover = useCallback((muscleId: string | null) => {
    if (!interactive) return;
    setHoveredMuscle(muscleId);
    onMuscleHover?.(muscleId);
  }, [interactive, onMuscleHover]);

  // Mode-specific sizing
  const modeStyles: Record<string, React.CSSProperties> = {
    compact: { width: 120, height: 160 },
    card: { width: 200, height: 280 },
    fullscreen: { width: '100%', height: '100%', minHeight: 400 },
    inline: { width: 80, height: 100 },
  };

  const musclePaths = MUSCLE_PATHS[currentView];

  return (
    <div
      className={clsx(
        'relative rounded-xl overflow-hidden',
        'bg-gradient-to-b from-[var(--void-deep,#0a0f1a)] to-[var(--void-deeper,#050810)]',
        className
      )}
      style={{ ...modeStyles[mode], ...style }}
    >
      {/* View label */}
      <div className="absolute top-2 left-1/2 -translate-x-1/2 z-10">
        <span className="px-2 py-0.5 text-[10px] font-medium text-white/50 bg-white/5 rounded-full">
          {currentView === 'front' ? 'Front' : 'Back'}
        </span>
      </div>

      {/* SVG body */}
      <AnimatePresence mode="wait">
        <motion.svg
          key={currentView}
          viewBox="0 0 100 200"
          className="w-full h-full"
          preserveAspectRatio="xMidYMid meet"
          initial={motionAllowed ? { opacity: 0, x: currentView === 'front' ? -20 : 20 } : false}
          animate={{ opacity: 1, x: 0 }}
          exit={motionAllowed ? { opacity: 0, x: currentView === 'front' ? 20 : -20 } : undefined}
          transition={{ duration: 0.3 }}
        >
          {/* Glow filter definition */}
          <defs>
            <filter id="muscle-glow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="2" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* Body outline */}
          <BodyOutline view={currentView} />

          {/* Head */}
          <ellipse
            cx="50"
            cy="22"
            rx="10"
            ry="12"
            fill="rgba(71, 85, 105, 0.2)"
            stroke="rgba(148, 163, 184, 0.3)"
            strokeWidth="0.8"
          />

          {/* Muscle regions */}
          {Object.entries(musclePaths).map(([muscleId, { path, center }]) => (
            <MuscleRegion
              key={muscleId}
              muscleId={muscleId}
              path={path}
              center={center as [number, number]}
              intensity={intensityMap[muscleId] || 0}
              isHovered={hoveredMuscle === muscleId}
              isSelected={selectedMuscle === muscleId}
              showLabel={showLabels}
              onClick={handleMuscleClick}
              onHover={handleMuscleHover}
            />
          ))}
        </motion.svg>
      </AnimatePresence>

      {/* View toggle (for card and fullscreen modes) */}
      {(mode === 'card' || mode === 'fullscreen') && interactive && (
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
          <button
            onClick={() => setCurrentView('front')}
            className={clsx(
              'px-2 py-1 text-xs rounded transition-colors',
              currentView === 'front'
                ? 'bg-[var(--electric-blue,#0066ff)] text-white'
                : 'bg-white/10 text-white/70 hover:bg-white/20'
            )}
          >
            Front
          </button>
          <button
            onClick={() => setCurrentView('back')}
            className={clsx(
              'px-2 py-1 text-xs rounded transition-colors',
              currentView === 'back'
                ? 'bg-[var(--electric-blue,#0066ff)] text-white'
                : 'bg-white/10 text-white/70 hover:bg-white/20'
            )}
          >
            Back
          </button>
        </div>
      )}
    </div>
  );
}

export default MuscleViewer2D;
