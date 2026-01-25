/**
 * Badge Component - Tier-Aware Status Badge
 *
 * Knuth-inspired component that adapts to rendering tier:
 * - FULL: Gradient backgrounds, subtle animations
 * - REDUCED: Solid colors, no animations
 * - MINIMAL: Basic bordered style
 * - TEXT_ONLY: Bracketed text
 *
 * The Troika: Maximum Flexibility, Maximum User Choice, Maximum Performance
 *
 * @example
 * <Badge variant="success">Active</Badge>
 * <Badge variant="warning" size="lg">Pending</Badge>
 * <Badge variant="info" dot>3 new</Badge>
 */

import React from 'react';
import { useRenderingTier, RenderingTier } from '@/hooks/useRenderingTier';

export type BadgeVariant = 'default' | 'primary' | 'success' | 'warning' | 'danger' | 'info';
export type BadgeSize = 'sm' | 'md' | 'lg';

export interface BadgeProps {
  /** Badge content */
  children: React.ReactNode;
  /** Color variant */
  variant?: BadgeVariant;
  /** Size variant */
  size?: BadgeSize;
  /** Show dot indicator */
  dot?: boolean;
  /** Pill shape (more rounded) */
  pill?: boolean;
  /** Outlined style */
  outlined?: boolean;
  /** Additional class name */
  className?: string;
  /** onClick handler (makes badge interactive) */
  onClick?: () => void;
  /** Removable badge */
  onRemove?: () => void;
}

// Size configurations
const sizeConfig: Record<BadgeSize, { text: string; padding: string; dot: string }> = {
  sm: { text: 'text-xs', padding: 'px-2 py-0.5', dot: 'w-1.5 h-1.5' },
  md: { text: 'text-sm', padding: 'px-2.5 py-1', dot: 'w-2 h-2' },
  lg: { text: 'text-base', padding: 'px-3 py-1.5', dot: 'w-2.5 h-2.5' },
};

// Color configurations per tier
const colorConfig: Record<BadgeVariant, { full: string; reduced: string; minimal: string; text: string }> = {
  default: {
    full: 'bg-neutral-100/80 dark:bg-neutral-800/80 text-neutral-700 dark:text-neutral-300',
    reduced: 'bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300',
    minimal: 'border border-neutral-300 text-neutral-700',
    text: '',
  },
  primary: {
    full: 'bg-gradient-to-r from-blue-500/20 to-blue-600/20 text-blue-700 dark:text-blue-300',
    reduced: 'bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300',
    minimal: 'border border-blue-500 text-blue-700',
    text: '[blue]',
  },
  success: {
    full: 'bg-gradient-to-r from-green-500/20 to-emerald-500/20 text-green-700 dark:text-green-300',
    reduced: 'bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300',
    minimal: 'border border-green-500 text-green-700',
    text: '[success]',
  },
  warning: {
    full: 'bg-gradient-to-r from-amber-400/20 to-orange-500/20 text-amber-700 dark:text-amber-300',
    reduced: 'bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300',
    minimal: 'border border-amber-500 text-amber-700',
    text: '[warning]',
  },
  danger: {
    full: 'bg-gradient-to-r from-red-500/20 to-rose-500/20 text-red-700 dark:text-red-300',
    reduced: 'bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300',
    minimal: 'border border-red-500 text-red-700',
    text: '[error]',
  },
  info: {
    full: 'bg-gradient-to-r from-cyan-500/20 to-blue-500/20 text-cyan-700 dark:text-cyan-300',
    reduced: 'bg-cyan-100 dark:bg-cyan-900/50 text-cyan-700 dark:text-cyan-300',
    minimal: 'border border-cyan-500 text-cyan-700',
    text: '[info]',
  },
};

// Dot color configurations
const dotColorConfig: Record<BadgeVariant, string> = {
  default: 'bg-neutral-500',
  primary: 'bg-blue-500',
  success: 'bg-green-500',
  warning: 'bg-amber-500',
  danger: 'bg-red-500',
  info: 'bg-cyan-500',
};

export function Badge({
  children,
  variant = 'default',
  size = 'md',
  dot = false,
  pill = false,
  outlined = false,
  className = '',
  onClick,
  onRemove,
}: BadgeProps): React.ReactElement {
  const { tier } = useRenderingTier();
  const sizes = sizeConfig[size];
  const colors = colorConfig[variant];

  // TEXT_ONLY tier: Plain bracketed text
  if (tier === RenderingTier.TEXT_ONLY) {
    const prefix = colors.text || '';
    return (
      <span className={className}>
        {prefix}
        [{children}]
        {onRemove && (
          <button onClick={onRemove} className="ml-1" aria-label="Remove">
            ×
          </button>
        )}
      </span>
    );
  }

  // Get color styles based on tier
  const getColorStyles = (): string => {
    if (outlined) {
      return `border ${
        variant === 'default'
          ? 'border-neutral-300 dark:border-neutral-600'
          : `border-current`
      } bg-transparent`;
    }

    switch (tier) {
      case RenderingTier.MINIMAL:
        return colors.minimal;
      case RenderingTier.REDUCED:
        return colors.reduced;
      case RenderingTier.FULL:
      default:
        return colors.full;
    }
  };

  // Base styles
  const baseStyles = `
    ${sizes.text} ${sizes.padding}
    inline-flex items-center gap-1.5
    font-medium
    ${pill ? 'rounded-full' : 'rounded-md'}
    ${onClick ? 'cursor-pointer hover:opacity-80' : ''}
    ${tier === RenderingTier.FULL ? 'transition-opacity duration-150' : ''}
  `;

  const Element = onClick ? 'button' : 'span';

  return (
    <Element
      className={`${baseStyles} ${getColorStyles()} ${className}`}
      onClick={onClick}
      type={onClick ? 'button' : undefined}
    >
      {dot && (
        <span
          className={`
            ${sizes.dot} rounded-full ${dotColorConfig[variant]}
            ${tier === RenderingTier.FULL ? 'animate-pulse' : ''}
          `}
        />
      )}
      {children}
      {onRemove && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className={`
            ml-1 -mr-1 p-0.5 rounded-full
            hover:bg-black/10 dark:hover:bg-white/10
            ${tier === RenderingTier.FULL ? 'transition-colors duration-150' : ''}
          `}
          aria-label="Remove"
        >
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
    </Element>
  );
}

export default Badge;
