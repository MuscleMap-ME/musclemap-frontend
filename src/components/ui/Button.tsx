/**
 * Button - Tier-Aware Button Component
 *
 * Knuth-inspired button that adapts to rendering tier:
 * - FULL: Full animations, ripples, glows, haptics
 * - REDUCED: Styling but no animations (static feedback)
 * - MINIMAL: Basic button with simple hover
 * - TEXT_ONLY: Plain semantic button
 *
 * The Troika: Maximum Flexibility, Maximum User Choice, Maximum Performance
 *
 * @example
 * import { Button } from '@/components/ui';
 *
 * // Basic usage (adapts to current rendering tier)
 * <Button>Click me</Button>
 *
 * // Variants
 * <Button variant="primary">Primary</Button>
 * <Button variant="secondary">Secondary</Button>
 * <Button variant="ghost">Ghost</Button>
 * <Button variant="danger">Danger</Button>
 *
 * // Sizes
 * <Button size="sm">Small</Button>
 * <Button size="lg">Large</Button>
 *
 * // With icons
 * <Button leftIcon={<SaveIcon />}>Save</Button>
 * <Button rightIcon={<ArrowRight />}>Next</Button>
 *
 * // Loading state
 * <Button loading>Saving...</Button>
 */

import React, { forwardRef, useCallback, useState, useMemo } from 'react';
import clsx from 'clsx';
import { useRenderingTier, type RenderingTier } from '@/hooks/useRenderingTier';

// ============================================
// TYPES
// ============================================

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'glass' | 'pulse';
export type ButtonSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /**
   * Visual variant of the button
   * @default 'secondary'
   */
  variant?: ButtonVariant;

  /**
   * Size of the button (all sizes meet 44px minimum touch target)
   * @default 'md'
   */
  size?: ButtonSize;

  /**
   * Make button take full width of container
   */
  fullWidth?: boolean;

  /**
   * Show loading spinner and disable button
   */
  loading?: boolean;

  /**
   * Text to show while loading (replaces children)
   */
  loadingText?: string;

  /**
   * Icon to show before button text
   */
  leftIcon?: React.ReactNode;

  /**
   * Icon to show after button text
   */
  rightIcon?: React.ReactNode;

  /**
   * Render as a different element (e.g., 'a' for links)
   */
  as?: 'button' | 'a' | React.ComponentType<unknown>;

  /**
   * Enable haptic feedback on mobile (FULL tier only)
   */
  haptic?: boolean;

  /**
   * Force a specific rendering tier (for testing)
   */
  forceTier?: RenderingTier;
}

// ============================================
// STYLE DEFINITIONS
// ============================================

/**
 * Base styles applied to all buttons
 * Uses CSS custom properties from tokens.css
 */
const BASE_STYLES = `
  inline-flex items-center justify-center gap-2
  font-medium text-center
  border border-transparent
  rounded-lg
  transition-colors
  select-none touch-action-manipulation
  focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2
  disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none
`;

/**
 * Variant styles for each button type
 * FULL tier: Use glass effects with transitions
 * REDUCED/MINIMAL: Use solid colors, no effects
 */
const VARIANT_STYLES: Record<ButtonVariant, Record<'full' | 'reduced', string>> = {
  primary: {
    full: `
      bg-[var(--color-primary)] text-white
      hover:bg-[var(--color-primary-hover)]
      focus-visible:ring-[var(--color-primary)]
      shadow-sm hover:shadow-md
    `,
    reduced: `
      bg-[var(--color-primary)] text-white
      focus-visible:ring-[var(--color-primary)]
    `,
  },
  secondary: {
    full: `
      bg-[var(--glass-white-10)] text-[var(--color-text)]
      border-[var(--color-border)]
      hover:bg-[var(--glass-white-15)] hover:border-[var(--color-border-hover)]
      focus-visible:ring-[var(--color-text-muted)]
      backdrop-blur-sm
    `,
    reduced: `
      bg-[var(--color-bg-elevated)] text-[var(--color-text)]
      border-[var(--color-border)]
      focus-visible:ring-[var(--color-text-muted)]
    `,
  },
  ghost: {
    full: `
      bg-transparent text-[var(--color-text)]
      hover:bg-[var(--glass-white-8)]
      focus-visible:ring-[var(--color-text-muted)]
    `,
    reduced: `
      bg-transparent text-[var(--color-text)]
      focus-visible:ring-[var(--color-text-muted)]
    `,
  },
  danger: {
    full: `
      bg-[var(--color-error)] text-white
      hover:bg-[var(--color-error-hover,#dc2626)]
      focus-visible:ring-[var(--color-error)]
      shadow-sm hover:shadow-md
    `,
    reduced: `
      bg-[var(--color-error)] text-white
      focus-visible:ring-[var(--color-error)]
    `,
  },
  glass: {
    full: `
      bg-[var(--glass-white-5)] text-[var(--color-text)]
      border-[var(--color-border)]
      hover:bg-[var(--glass-white-10)] hover:border-[var(--color-border-hover)]
      focus-visible:ring-white/30
      backdrop-blur-md
      shadow-[var(--inner-glow-subtle),var(--shadow-glass-sm)]
      hover:shadow-[var(--inner-glow-light),var(--shadow-glass-md)]
    `,
    reduced: `
      bg-[var(--color-bg-elevated)] text-[var(--color-text)]
      border-[var(--color-border)]
      focus-visible:ring-white/30
    `,
  },
  pulse: {
    full: `
      bg-gradient-to-r from-[var(--brand-pulse-500)] to-[var(--brand-pulse-600)]
      text-white
      hover:from-[var(--brand-pulse-400)] hover:to-[var(--brand-pulse-500)]
      focus-visible:ring-[var(--brand-pulse-500)]
      shadow-[var(--glow-pulse-sm)]
      hover:shadow-[var(--glow-pulse-md)]
    `,
    reduced: `
      bg-[var(--brand-pulse-500)] text-white
      focus-visible:ring-[var(--brand-pulse-500)]
    `,
  },
};

/**
 * Size styles (all meet minimum 44px touch target)
 */
const SIZE_STYLES: Record<ButtonSize, string> = {
  xs: 'px-3 py-2 text-xs min-h-[44px]',
  sm: 'px-4 py-2.5 text-sm min-h-[44px]',
  md: 'px-5 py-3 text-base min-h-[48px]',
  lg: 'px-6 py-3.5 text-base min-h-[52px]',
  xl: 'px-8 py-4 text-lg min-h-[56px]',
};

// ============================================
// LOADING SPINNER
// ============================================

const LoadingSpinner: React.FC<{ size: ButtonSize; className?: string }> = ({ size, className }) => {
  const sizeMap: Record<ButtonSize, string> = {
    xs: 'w-3 h-3',
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6',
    xl: 'w-7 h-7',
  };

  return (
    <svg
      className={clsx('animate-spin', sizeMap[size], className)}
      viewBox="0 0 24 24"
      fill="none"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="3"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );
};

// ============================================
// BUTTON COMPONENT
// ============================================

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      children,
      className,
      variant = 'secondary',
      size = 'md',
      fullWidth = false,
      loading = false,
      loadingText,
      leftIcon,
      rightIcon,
      disabled = false,
      haptic = false,
      forceTier,
      as: Component = 'button',
      onClick,
      ...props
    },
    ref
  ) => {
    // Get current rendering tier
    const { tier } = useRenderingTier({ forceTier });
    const [isPressed, setIsPressed] = useState(false);

    // Determine if we're in a reduced capability mode
    const isReduced = tier === 'reduced' || tier === 'minimal' || tier === 'text-only';

    // Get appropriate variant styles based on tier
    const variantClass = useMemo(() => {
      const tierKey = isReduced ? 'reduced' : 'full';
      return VARIANT_STYLES[variant]?.[tierKey] || VARIANT_STYLES.secondary[tierKey];
    }, [variant, isReduced]);

    // Handle click with optional haptic feedback
    const handleClick = useCallback(
      (e: React.MouseEvent<HTMLButtonElement>) => {
        if (disabled || loading) return;

        // Haptic feedback on mobile (FULL tier only)
        if (haptic && !isReduced && typeof navigator !== 'undefined' && 'vibrate' in navigator) {
          try {
            navigator.vibrate(10);
          } catch {
            // Ignore if vibrate fails
          }
        }

        onClick?.(e);
      },
      [disabled, loading, haptic, isReduced, onClick]
    );

    // Handle press states for visual feedback
    const handlePointerDown = useCallback(() => {
      if (!disabled && !loading && !isReduced) {
        setIsPressed(true);
      }
    }, [disabled, loading, isReduced]);

    const handlePointerUp = useCallback(() => {
      setIsPressed(false);
    }, []);

    // For text-only tier, render a completely plain button
    if (tier === 'text-only') {
      return (
        <Component
          ref={ref as React.Ref<HTMLButtonElement>}
          className={clsx(
            'inline-flex items-center justify-center gap-2',
            'px-4 py-2 underline',
            fullWidth && 'w-full',
            className
          )}
          disabled={disabled || loading}
          onClick={handleClick}
          {...props}
        >
          {loading && loadingText ? loadingText : children}
          {loading && !loadingText && ' (Loading...)'}
        </Component>
      );
    }

    return (
      <Component
        ref={ref as React.Ref<HTMLButtonElement>}
        className={clsx(
          BASE_STYLES,
          variantClass,
          SIZE_STYLES[size],
          fullWidth && 'w-full',
          loading && 'cursor-wait',
          // Press feedback for FULL tier
          !isReduced && isPressed && 'scale-[0.98] transition-transform duration-75',
          !isReduced && 'transition-all duration-200',
          className
        )}
        disabled={disabled || loading}
        onClick={handleClick}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
        {...props}
      >
        {/* Loading spinner - shows on left when loadingText present */}
        {loading && loadingText && (
          <LoadingSpinner size={size} className="flex-shrink-0" />
        )}

        {/* Left icon */}
        {!loading && leftIcon && (
          <span className="flex-shrink-0">{leftIcon}</span>
        )}

        {/* Button content */}
        <span className={clsx(loading && !loadingText && 'invisible')}>
          {loading && loadingText ? loadingText : children}
        </span>

        {/* Right icon */}
        {!loading && rightIcon && (
          <span className="flex-shrink-0">{rightIcon}</span>
        )}

        {/* Centered spinner when no loadingText */}
        {loading && !loadingText && (
          <span className="absolute inset-0 flex items-center justify-center">
            <LoadingSpinner size={size} />
          </span>
        )}
      </Component>
    );
  }
);

Button.displayName = 'Button';

export default Button;
