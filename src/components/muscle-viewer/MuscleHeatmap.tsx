/**
 * MuscleHeatmap
 * Shows aggregate muscle activation over a time period
 *
 * Used in:
 * - Stats dashboard to show training distribution
 * - Progress pages to visualize muscle development
 * - Comparison views (this week vs last week)
 */

import React, { useMemo, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import clsx from 'clsx';
import type { MuscleHeatmapProps } from './types';
import { useMotionAllowed } from '../../hooks/useReducedMotion';

// ============================================
// MUSCLE PATH DATA (Higher detail for heatmap)
// ============================================

const HEATMAP_PATHS = {
  front: {
    // Upper body
    chest: {
      path: 'M35 60 Q40 55 50 57 Q60 55 65 60 Q67 72 65 80 Q55 85 50 83 Q45 85 35 80 Q33 72 35 60',
      label: 'Chest',
      center: [50, 70],
    },
    abs: {
      path: 'M42 85 Q50 83 58 85 L56 125 Q50 128 44 125 Z',
      label: 'Abs',
      center: [50, 105],
    },
    obliques: {
      path: 'M35 82 L42 85 L44 125 L38 122 Z M58 85 L65 82 L62 122 L56 125 Z',
      label: 'Obliques',
      center: [50, 103],
    },
    front_delts: {
      path: 'M28 58 Q32 52 38 56 L37 70 L30 68 Z M62 56 Q68 52 72 58 L70 68 L63 70 Z',
      label: 'Front Delts',
      center: [50, 62],
    },
    biceps: {
      path: 'M24 72 L30 70 L28 98 L20 95 Z M70 70 L76 72 L80 95 L72 98 Z',
      label: 'Biceps',
      center: [50, 84],
    },
    forearms: {
      path: 'M18 98 L26 100 L22 135 L12 130 Z M74 100 L82 98 L88 130 L78 135 Z',
      label: 'Forearms',
      center: [50, 117],
    },
    quads: {
      path: 'M38 130 L48 128 L46 178 L34 175 Z M52 128 L62 130 L66 175 L54 178 Z',
      label: 'Quads',
      center: [50, 153],
    },
    hip_flexors: {
      path: 'M44 125 L50 127 L56 125 L54 135 L50 138 L46 135 Z',
      label: 'Hip Flexors',
      center: [50, 131],
    },
    adductors: {
      path: 'M46 138 L50 136 L54 138 L52 165 L50 168 L48 165 Z',
      label: 'Adductors',
      center: [50, 152],
    },
  },
  back: {
    // Upper body
    upper_back: {
      path: 'M38 58 Q50 54 62 58 L60 80 Q50 84 40 80 Z',
      label: 'Upper Back',
      center: [50, 68],
    },
    lats: {
      path: 'M30 72 L40 78 L40 110 L32 105 Z M60 78 L70 72 L68 105 L60 110 Z',
      label: 'Lats',
      center: [50, 90],
    },
    lower_back: {
      path: 'M42 108 L58 108 L56 130 L44 130 Z',
      label: 'Lower Back',
      center: [50, 119],
    },
    rear_delts: {
      path: 'M26 56 Q32 50 38 55 L36 68 L28 65 Z M62 55 Q68 50 74 56 L72 65 L64 68 Z',
      label: 'Rear Delts',
      center: [50, 60],
    },
    traps: {
      path: 'M40 45 Q50 40 60 45 L58 58 Q50 54 42 58 Z',
      label: 'Traps',
      center: [50, 50],
    },
    triceps: {
      path: 'M22 68 L30 72 L28 100 L18 95 Z M70 72 L78 68 L82 95 L72 100 Z',
      label: 'Triceps',
      center: [50, 84],
    },
    glutes: {
      path: 'M38 128 Q50 124 62 128 L60 150 Q50 154 40 150 Z',
      label: 'Glutes',
      center: [50, 139],
    },
    hamstrings: {
      path: 'M38 152 L48 150 L46 195 L34 192 Z M52 150 L62 152 L66 192 L54 195 Z',
      label: 'Hamstrings',
      center: [50, 172],
    },
    calves: {
      path: 'M35 195 L44 193 L42 230 L33 228 Z M56 193 L65 195 L67 228 L58 230 Z',
      label: 'Calves',
      center: [50, 212],
    },
  },
};

/**
 * Get color from intensity using heatmap gradient
 */
function getHeatmapColor(intensity: number, isComparison: boolean = false): string {
  if (intensity <= 0) return 'rgba(50, 60, 80, 0.3)';

  if (isComparison) {
    // Green-based for comparison (improvement)
    if (intensity < 0) return 'rgba(255, 80, 80, 0.7)'; // Decrease (red)
    return `rgba(80, 200, 120, ${0.5 + intensity * 0.5})`; // Increase (green)
  }

  // Standard heatmap: Blue -> Cyan -> Green -> Yellow -> Orange -> Red
  if (intensity < 0.2) {
    return `rgba(60, 100, 200, ${0.4 + intensity * 2})`;
  } else if (intensity < 0.4) {
    const t = (intensity - 0.2) * 5;
    return `rgba(${60 - t * 20}, ${100 + t * 80}, ${200 - t * 80}, ${0.6 + intensity * 0.3})`;
  } else if (intensity < 0.6) {
    const t = (intensity - 0.4) * 5;
    return `rgba(${40 + t * 180}, ${180}, ${120 - t * 120}, ${0.7 + intensity * 0.2})`;
  } else if (intensity < 0.8) {
    const t = (intensity - 0.6) * 5;
    return `rgba(${220}, ${180 - t * 80}, ${0}, ${0.8 + intensity * 0.1})`;
  } else {
    const t = (intensity - 0.8) * 5;
    return `rgba(${220 + t * 35}, ${100 - t * 60}, ${0}, 0.95)`;
  }
}

// ============================================
// LEGEND COMPONENT
// ============================================

function HeatmapLegend({ className }: { className?: string }) {
  const stops = [0, 0.25, 0.5, 0.75, 1];

  return (
    <div className={clsx('flex items-center gap-2', className)}>
      <span className="text-[10px] text-[var(--text-quaternary,#64748b)]">Low</span>
      <div className="flex h-3 rounded overflow-hidden">
        {stops.map((stop, i) => (
          <div
            key={i}
            className="w-5 h-full"
            style={{ backgroundColor: getHeatmapColor(stop) }}
          />
        ))}
      </div>
      <span className="text-[10px] text-[var(--text-quaternary,#64748b)]">High</span>
    </div>
  );
}

// ============================================
// MUSCLE REGION COMPONENT
// ============================================

interface HeatmapRegionProps {
  muscleId: string;
  path: string;
  label: string;
  center: [number, number];
  intensity: number;
  previousIntensity?: number;
  showComparison: boolean;
  isHovered: boolean;
  onHover: (id: string | null) => void;
}

function HeatmapRegion({
  muscleId,
  path,
  label,
  center,
  intensity,
  previousIntensity,
  showComparison,
  isHovered,
  onHover,
}: HeatmapRegionProps) {
  const motionAllowed = useMotionAllowed();

  // Calculate comparison delta if showing comparison
  const delta = showComparison && previousIntensity !== undefined
    ? intensity - previousIntensity
    : 0;

  const color = showComparison && previousIntensity !== undefined
    ? getHeatmapColor(delta, true)
    : getHeatmapColor(intensity);

  return (
    <g
      onMouseEnter={() => onHover(muscleId)}
      onMouseLeave={() => onHover(null)}
      style={{ cursor: 'pointer' }}
    >
      {/* Glow for high activation */}
      {intensity > 0.6 && !showComparison && (
        <motion.path
          d={path}
          fill={color}
          filter="url(#heatmap-glow)"
          opacity={intensity * 0.4}
        />
      )}

      {/* Main region */}
      <motion.path
        d={path}
        fill={color}
        stroke={isHovered ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.1)'}
        strokeWidth={isHovered ? 1.5 : 0.5}
        initial={false}
        animate={{ fill: color }}
        transition={{ duration: motionAllowed ? 0.3 : 0 }}
      />

      {/* Hover tooltip */}
      {isHovered && (
        <g>
          <rect
            x={center[0] - 30}
            y={center[1] - 12}
            width={60}
            height={20}
            rx={3}
            fill="rgba(0,0,0,0.9)"
          />
          <text
            x={center[0]}
            y={center[1] - 2}
            textAnchor="middle"
            fontSize="6"
            fill="white"
            fontFamily="Inter, system-ui, sans-serif"
          >
            {label}
          </text>
          <text
            x={center[0]}
            y={center[1] + 6}
            textAnchor="middle"
            fontSize="5"
            fill={showComparison && delta !== 0
              ? delta > 0 ? '#4ade80' : '#f87171'
              : '#94a3b8'
            }
            fontFamily="Inter, system-ui, sans-serif"
          >
            {showComparison && previousIntensity !== undefined
              ? `${delta >= 0 ? '+' : ''}${Math.round(delta * 100)}%`
              : `${Math.round(intensity * 100)}%`
            }
          </text>
        </g>
      )}
    </g>
  );
}

// ============================================
// MAIN COMPONENT
// ============================================

export function MuscleHeatmap({
  muscles,
  timeRange = 'All Time',
  showComparison = false,
  previousMuscles,
  view = 'both',
  className,
}: MuscleHeatmapProps): React.ReactElement {
  const _motionAllowed = useMotionAllowed();
  const [hoveredMuscle, setHoveredMuscle] = useState<string | null>(null);

  // Build intensity maps
  const intensityMap = useMemo(() => {
    const map: Record<string, number> = {};
    muscles.forEach(({ id, intensity }) => {
      map[id] = Math.max(map[id] || 0, intensity);
    });
    return map;
  }, [muscles]);

  const previousIntensityMap = useMemo(() => {
    if (!previousMuscles) return {};
    const map: Record<string, number> = {};
    previousMuscles.forEach(({ id, intensity }) => {
      map[id] = Math.max(map[id] || 0, intensity);
    });
    return map;
  }, [previousMuscles]);

  // Handle hover
  const handleHover = useCallback((id: string | null) => {
    setHoveredMuscle(id);
  }, []);

  // Render a single view (front or back)
  const renderView = (viewType: 'front' | 'back') => {
    const paths = HEATMAP_PATHS[viewType];

    return (
      <svg
        viewBox="0 0 100 240"
        className="w-full h-full"
        preserveAspectRatio="xMidYMid meet"
      >
        {/* Filters */}
        <defs>
          <filter id="heatmap-glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* Body outline */}
        <ellipse
          cx="50"
          cy="30"
          rx="15"
          ry="18"
          fill="rgba(50, 60, 80, 0.15)"
          stroke="rgba(100, 116, 139, 0.1)"
          strokeWidth="0.5"
        />
        <path
          d="M50 48 Q30 55 25 75 L22 100 L20 130 L25 135 L35 135 L35 180 Q33 210 35 235 L40 240 L48 240 L50 230 L52 240 L60 240 L65 235 Q67 210 65 180 L65 135 L75 135 L80 130 L78 100 L75 75 Q70 55 50 48"
          fill="rgba(50, 60, 80, 0.15)"
          stroke="rgba(100, 116, 139, 0.1)"
          strokeWidth="0.5"
        />

        {/* Muscle regions */}
        {Object.entries(paths).map(([muscleId, { path, label, center }]) => (
          <HeatmapRegion
            key={muscleId}
            muscleId={muscleId}
            path={path}
            label={label}
            center={center as [number, number]}
            intensity={intensityMap[muscleId] || 0}
            previousIntensity={previousIntensityMap[muscleId]}
            showComparison={showComparison}
            isHovered={hoveredMuscle === muscleId}
            onHover={handleHover}
          />
        ))}

        {/* View label */}
        <text
          x="50"
          y="248"
          textAnchor="middle"
          fontSize="8"
          fill="rgba(148, 163, 184, 0.5)"
          fontFamily="Inter, system-ui, sans-serif"
        >
          {viewType === 'front' ? 'Front' : 'Back'}
        </text>
      </svg>
    );
  };

  return (
    <div
      className={clsx(
        'flex flex-col gap-3',
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-medium text-[var(--text-secondary,#e2e8f0)]">
            Muscle Activation
          </h3>
          <span className="text-xs text-[var(--text-quaternary,#64748b)]">
            {timeRange}
          </span>
        </div>
        <HeatmapLegend />
      </div>

      {/* Body views */}
      <div
        className={clsx(
          'flex gap-4',
          'bg-gradient-to-b from-[var(--void-deep,#0a0f1a)] to-[var(--void-deeper,#050810)]',
          'rounded-xl p-4',
          'border border-white/5'
        )}
      >
        {(view === 'front' || view === 'both') && (
          <div className="flex-1 min-h-[300px]">
            {renderView('front')}
          </div>
        )}
        {(view === 'back' || view === 'both') && (
          <div className="flex-1 min-h-[300px]">
            {renderView('back')}
          </div>
        )}
      </div>

      {/* Comparison legend */}
      {showComparison && (
        <div className="flex items-center justify-center gap-4 text-xs">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-sm bg-green-500/70" />
            <span className="text-[var(--text-quaternary,#64748b)]">Improved</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-sm bg-red-500/70" />
            <span className="text-[var(--text-quaternary,#64748b)]">Decreased</span>
          </div>
        </div>
      )}
    </div>
  );
}

export default MuscleHeatmap;
