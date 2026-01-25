/**
 * Spinner Component - Tier-Aware Loading Indicator
 *
 * Knuth-inspired component that adapts to rendering tier:
 * - FULL: Animated gradient spinner with smooth rotation
 * - REDUCED: Simple rotating spinner
 * - MINIMAL: Static spinner icon
 * - TEXT_ONLY: Text "Loading..."
 *
 * The Troika: Maximum Flexibility, Maximum User Choice, Maximum Performance
 *
 * @example
 * <Spinner />
 * <Spinner size="lg" label="Loading data..." />
 */

import React from 'react';
import { useRenderingTier, RenderingTier } from '@/hooks/useRenderingTier';

export type SpinnerSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';
export type SpinnerVariant = 'default' | 'primary' | 'white';

export interface SpinnerProps {
  /** Size variant */
  size?: SpinnerSize;
  /** Color variant */
  variant?: SpinnerVariant;
  /** Accessible label */
  label?: string;
  /** Show label visually */
  showLabel?: boolean;
  /** Center in container */
  centered?: boolean;
  /** Additional class name */
  className?: string;
}

// Size configurations
const sizeConfig: Record<SpinnerSize, { spinner: string; text: string }> = {
  xs: { spinner: 'w-4 h-4', text: 'text-xs' },
  sm: { spinner: 'w-5 h-5', text: 'text-sm' },
  md: { spinner: 'w-8 h-8', text: 'text-base' },
  lg: { spinner: 'w-12 h-12', text: 'text-lg' },
  xl: { spinner: 'w-16 h-16', text: 'text-xl' },
};

// Color configurations
const variantConfig: Record<SpinnerVariant, { stroke: string; text: string }> = {
  default: { stroke: 'stroke-neutral-600 dark:stroke-neutral-400', text: 'text-neutral-600 dark:text-neutral-400' },
  primary: { stroke: 'stroke-blue-600', text: 'text-blue-600' },
  white: { stroke: 'stroke-white', text: 'text-white' },
};

export function Spinner({
  size = 'md',
  variant = 'default',
  label = 'Loading...',
  showLabel = false,
  centered = false,
  className = '',
}: SpinnerProps): React.ReactElement {
  const { tier } = useRenderingTier();
  const sizes = sizeConfig[size];
  const colors = variantConfig[variant];

  // Container styles
  const containerStyles = centered
    ? `flex flex-col items-center justify-center gap-2 ${className}`
    : `inline-flex items-center gap-2 ${className}`;

  // TEXT_ONLY tier: Just text
  if (tier === RenderingTier.TEXT_ONLY) {
    return (
      <div className={containerStyles} role="status" aria-label={label}>
        <span className={sizes.text}>{label}</span>
      </div>
    );
  }

  // MINIMAL tier: Static icon
  if (tier === RenderingTier.MINIMAL) {
    return (
      <div className={containerStyles} role="status" aria-label={label}>
        <svg className={`${sizes.spinner} ${colors.stroke}`} viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="10" strokeWidth="3" strokeOpacity="0.25" />
          <path
            d="M12 2a10 10 0 0 1 10 10"
            strokeWidth="3"
            strokeLinecap="round"
          />
        </svg>
        {showLabel && <span className={`${sizes.text} ${colors.text}`}>{label}</span>}
        <span className="sr-only">{label}</span>
      </div>
    );
  }

  // REDUCED tier: Simple rotation
  if (tier === RenderingTier.REDUCED) {
    return (
      <div className={containerStyles} role="status" aria-label={label}>
        <svg
          className={`${sizes.spinner} ${colors.stroke} animate-spin`}
          viewBox="0 0 24 24"
          fill="none"
        >
          <circle cx="12" cy="12" r="10" strokeWidth="3" strokeOpacity="0.25" />
          <path
            d="M12 2a10 10 0 0 1 10 10"
            strokeWidth="3"
            strokeLinecap="round"
          />
        </svg>
        {showLabel && <span className={`${sizes.text} ${colors.text}`}>{label}</span>}
        <span className="sr-only">{label}</span>
      </div>
    );
  }

  // FULL tier: Animated gradient spinner
  return (
    <div className={containerStyles} role="status" aria-label={label}>
      <div className={`${sizes.spinner} relative`}>
        {/* Background track */}
        <svg className="absolute inset-0 w-full h-full" viewBox="0 0 24 24" fill="none">
          <circle
            cx="12"
            cy="12"
            r="10"
            strokeWidth="3"
            className="stroke-neutral-200 dark:stroke-neutral-700"
          />
        </svg>
        {/* Animated gradient arc */}
        <svg
          className="absolute inset-0 w-full h-full animate-spin"
          viewBox="0 0 24 24"
          fill="none"
          style={{ animationDuration: '800ms' }}
        >
          <defs>
            <linearGradient id={`spinner-gradient-${variant}`} x1="0%" y1="0%" x2="100%" y2="100%">
              {variant === 'primary' ? (
                <>
                  <stop offset="0%" stopColor="#3B82F6" />
                  <stop offset="100%" stopColor="#8B5CF6" />
                </>
              ) : variant === 'white' ? (
                <>
                  <stop offset="0%" stopColor="#FFFFFF" />
                  <stop offset="100%" stopColor="#E5E7EB" />
                </>
              ) : (
                <>
                  <stop offset="0%" stopColor="#6B7280" />
                  <stop offset="100%" stopColor="#9CA3AF" />
                </>
              )}
            </linearGradient>
          </defs>
          <path
            d="M12 2a10 10 0 0 1 10 10"
            strokeWidth="3"
            strokeLinecap="round"
            stroke={`url(#spinner-gradient-${variant})`}
          />
        </svg>
      </div>
      {showLabel && (
        <span className={`${sizes.text} ${colors.text} animate-pulse`}>{label}</span>
      )}
      <span className="sr-only">{label}</span>
    </div>
  );
}

export default Spinner;
