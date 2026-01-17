/**
 * MuscleViewerSkeleton
 * Loading skeleton for the MuscleViewer component
 */

import React from 'react';
import clsx from 'clsx';
import type { MuscleViewerSkeletonProps } from './types';

/**
 * Size configurations for different modes
 */
const MODE_SIZES = {
  compact: { width: 120, height: 160 },
  card: { width: 200, height: 280 },
  fullscreen: { width: '100%', height: '100%' },
  inline: { width: 80, height: 100 },
};

/**
 * Animated skeleton for muscle viewer loading state
 */
export function MuscleViewerSkeleton({
  mode = 'card',
  className,
}: MuscleViewerSkeletonProps): React.ReactElement {
  const size = MODE_SIZES[mode];
  const isFullscreen = mode === 'fullscreen';

  return (
    <div
      className={clsx(
        'relative overflow-hidden rounded-xl',
        'bg-gradient-to-b from-[var(--void-deep,#0a0f1a)] to-[var(--void-deeper,#050810)]',
        isFullscreen && 'w-full h-full min-h-[400px]',
        className
      )}
      style={{
        width: isFullscreen ? '100%' : size.width,
        height: isFullscreen ? '100%' : size.height,
      }}
    >
      {/* Animated shimmer overlay */}
      <div
        className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite]"
        style={{
          background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.04), transparent)',
        }}
      />

      {/* Body silhouette */}
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <svg
          viewBox="0 0 100 200"
          className="w-full h-full max-w-[60%] max-h-[80%] opacity-20"
          preserveAspectRatio="xMidYMid meet"
        >
          {/* Head */}
          <ellipse
            cx="50"
            cy="20"
            rx="12"
            ry="15"
            fill="currentColor"
            className="text-[var(--text-quaternary,#475569)]"
          />

          {/* Neck */}
          <rect
            x="45"
            y="33"
            width="10"
            height="8"
            rx="2"
            fill="currentColor"
            className="text-[var(--text-quaternary,#475569)]"
          />

          {/* Torso */}
          <path
            d="M30 45 L70 45 L68 120 L32 120 Z"
            fill="currentColor"
            className="text-[var(--text-quaternary,#475569)]"
          />

          {/* Left arm */}
          <path
            d="M30 45 L20 48 L15 90 L20 92 L28 55"
            fill="currentColor"
            className="text-[var(--text-quaternary,#475569)]"
          />

          {/* Right arm */}
          <path
            d="M70 45 L80 48 L85 90 L80 92 L72 55"
            fill="currentColor"
            className="text-[var(--text-quaternary,#475569)]"
          />

          {/* Left leg */}
          <path
            d="M35 120 L30 180 L38 182 L45 125"
            fill="currentColor"
            className="text-[var(--text-quaternary,#475569)]"
          />

          {/* Right leg */}
          <path
            d="M65 120 L70 180 L62 182 L55 125"
            fill="currentColor"
            className="text-[var(--text-quaternary,#475569)]"
          />
        </svg>
      </div>

      {/* Loading indicator */}
      {mode !== 'inline' && (
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-[var(--electric-blue,#0066ff)] animate-pulse" />
          <div className="w-1.5 h-1.5 rounded-full bg-[var(--electric-blue,#0066ff)] animate-pulse animation-delay-150" />
          <div className="w-1.5 h-1.5 rounded-full bg-[var(--electric-blue,#0066ff)] animate-pulse animation-delay-300" />
        </div>
      )}
    </div>
  );
}

export default MuscleViewerSkeleton;
