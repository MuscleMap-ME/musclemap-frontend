/**
 * Skeleton Component - Tier-Aware Loading Placeholder
 *
 * Knuth-inspired component that adapts to rendering tier:
 * - FULL: Animated shimmer effect
 * - REDUCED: Pulsing animation
 * - MINIMAL: Static gray placeholder
 * - TEXT_ONLY: Placeholder text "[Loading...]"
 *
 * The Troika: Maximum Flexibility, Maximum User Choice, Maximum Performance
 *
 * @example
 * <Skeleton width="200px" height="20px" />
 * <Skeleton variant="circular" width="48px" height="48px" />
 * <Skeleton variant="text" lines={3} />
 */

import React from 'react';
import { useRenderingTier, RenderingTier } from '@/hooks/useRenderingTier';

export type SkeletonVariant = 'rectangular' | 'circular' | 'text' | 'rounded';

export interface SkeletonProps {
  /** Shape variant */
  variant?: SkeletonVariant;
  /** Width (CSS value or number for px) */
  width?: string | number;
  /** Height (CSS value or number for px) */
  height?: string | number;
  /** Number of text lines (for text variant) */
  lines?: number;
  /** Animation enabled */
  animate?: boolean;
  /** Additional class name */
  className?: string;
  /** ARIA label */
  'aria-label'?: string;
}

export function Skeleton({
  variant = 'rectangular',
  width,
  height,
  lines = 1,
  animate = true,
  className = '',
  'aria-label': ariaLabel = 'Loading...',
}: SkeletonProps): React.ReactElement {
  const { tier } = useRenderingTier();

  // Convert numeric width/height to px strings
  const widthStyle = typeof width === 'number' ? `${width}px` : width;
  const heightStyle = typeof height === 'number' ? `${height}px` : height;

  // TEXT_ONLY tier: Placeholder text
  if (tier === RenderingTier.TEXT_ONLY) {
    if (variant === 'text' && lines > 1) {
      return (
        <div role="status" aria-label={ariaLabel}>
          {Array.from({ length: lines }).map((_, i) => (
            <div key={i}>[Loading...]</div>
          ))}
        </div>
      );
    }
    return <span role="status" aria-label={ariaLabel}>[Loading...]</span>;
  }

  // Get base styles based on variant
  const getVariantStyles = (): string => {
    switch (variant) {
      case 'circular':
        return 'rounded-full';
      case 'rounded':
        return 'rounded-lg';
      case 'text':
        return 'rounded';
      default:
        return 'rounded-md';
    }
  };

  // Get animation styles based on tier
  const getAnimationStyles = (): string => {
    if (!animate) return '';

    switch (tier) {
      case RenderingTier.MINIMAL:
        return ''; // No animation
      case RenderingTier.REDUCED:
        return 'animate-pulse';
      case RenderingTier.FULL:
      default:
        return 'skeleton-shimmer';
    }
  };

  // Get background styles based on tier
  const getBackgroundStyles = (): string => {
    switch (tier) {
      case RenderingTier.MINIMAL:
        return 'bg-gray-300 dark:bg-gray-700';
      case RenderingTier.REDUCED:
        return 'bg-neutral-200 dark:bg-neutral-700';
      case RenderingTier.FULL:
      default:
        return 'bg-neutral-200 dark:bg-neutral-700';
    }
  };

  // Text variant with multiple lines
  if (variant === 'text') {
    return (
      <div role="status" aria-label={ariaLabel} className={className}>
        {Array.from({ length: lines }).map((_, i) => (
          <div
            key={i}
            className={`
              ${getVariantStyles()}
              ${getBackgroundStyles()}
              ${getAnimationStyles()}
              h-4 mb-2 last:mb-0
              ${i === lines - 1 ? 'w-4/5' : 'w-full'}
            `}
            style={{
              width: i === lines - 1 && widthStyle ? `calc(${widthStyle} * 0.8)` : widthStyle,
              height: heightStyle || '16px',
            }}
          />
        ))}
        <span className="sr-only">{ariaLabel}</span>
      </div>
    );
  }

  // Single skeleton element
  return (
    <div
      role="status"
      aria-label={ariaLabel}
      className={`
        ${getVariantStyles()}
        ${getBackgroundStyles()}
        ${getAnimationStyles()}
        ${className}
      `}
      style={{
        width: widthStyle || '100%',
        height: heightStyle || '20px',
      }}
    >
      <span className="sr-only">{ariaLabel}</span>
    </div>
  );
}

// Preset skeleton components for common use cases
export function SkeletonText({ lines = 3, ...props }: Omit<SkeletonProps, 'variant'>) {
  return <Skeleton variant="text" lines={lines} {...props} />;
}

export function SkeletonAvatar({ size = 48, ...props }: Omit<SkeletonProps, 'variant' | 'width' | 'height'> & { size?: number }) {
  return <Skeleton variant="circular" width={size} height={size} {...props} />;
}

export function SkeletonCard({ ...props }: Omit<SkeletonProps, 'variant'>) {
  return (
    <div className="space-y-3" {...props}>
      <Skeleton variant="rounded" height={160} />
      <SkeletonText lines={2} />
    </div>
  );
}

export function SkeletonList({ count = 3, ...props }: Omit<SkeletonProps, 'variant'> & { count?: number }) {
  return (
    <div className="space-y-4" {...props}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex items-center gap-3">
          <SkeletonAvatar size={40} />
          <div className="flex-1">
            <SkeletonText lines={2} />
          </div>
        </div>
      ))}
    </div>
  );
}

export default Skeleton;
