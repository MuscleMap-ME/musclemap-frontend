/**
 * Input - Tier-Aware Input Component
 *
 * Knuth-inspired form input that adapts to rendering tier:
 * - FULL: Glass styling with focus effects and animations
 * - REDUCED: Solid styling, no animations
 * - MINIMAL: Basic input with border
 * - TEXT_ONLY: Plain native input
 *
 * The Troika: Maximum Flexibility, Maximum User Choice, Maximum Performance
 *
 * @example
 * import { Input } from '@/components/ui';
 *
 * // Basic usage
 * <Input placeholder="Enter your name" />
 *
 * // With label
 * <Input label="Email" type="email" />
 *
 * // With error state
 * <Input label="Password" error="Password is required" />
 *
 * // With helper text
 * <Input label="Username" helperText="3-20 characters" />
 *
 * // Sizes
 * <Input size="sm" />
 * <Input size="lg" />
 */

import React, { forwardRef, useId, useMemo } from 'react';
import clsx from 'clsx';
import { useRenderingTier, type RenderingTier } from '@/hooks/useRenderingTier';

// ============================================
// TYPES
// ============================================

export type InputSize = 'sm' | 'md' | 'lg';
export type InputVariant = 'default' | 'glass' | 'filled' | 'outlined';

export interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
  /**
   * Label text displayed above input
   */
  label?: string;

  /**
   * Error message (also sets error styling)
   */
  error?: string;

  /**
   * Helper text displayed below input
   */
  helperText?: string;

  /**
   * Size of the input (all sizes meet 44px minimum touch target)
   * @default 'md'
   */
  size?: InputSize;

  /**
   * Visual variant
   * @default 'default'
   */
  variant?: InputVariant;

  /**
   * Icon to show at the start of the input
   */
  leftIcon?: React.ReactNode;

  /**
   * Icon or element to show at the end of the input
   */
  rightElement?: React.ReactNode;

  /**
   * Make input take full width
   * @default true
   */
  fullWidth?: boolean;

  /**
   * Force a specific rendering tier (for testing)
   */
  forceTier?: RenderingTier;

  /**
   * Container className (for the wrapper div)
   */
  containerClassName?: string;
}

// ============================================
// STYLE DEFINITIONS
// ============================================

const BASE_STYLES = `
  w-full
  font-sans
  border rounded-lg
  transition-colors
  focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-0
  disabled:opacity-50 disabled:cursor-not-allowed
  placeholder:text-[var(--color-text-subtle)]
`;

/**
 * Variant styles by tier
 */
const VARIANT_STYLES: Record<InputVariant, Record<'full' | 'reduced', string>> = {
  default: {
    full: `
      bg-[var(--glass-white-5)]
      border-[var(--color-border)]
      text-[var(--color-text)]
      backdrop-blur-sm
      focus:border-[var(--color-primary)]
      focus-visible:ring-[var(--color-primary)]
      hover:border-[var(--color-border-hover)]
    `,
    reduced: `
      bg-[var(--color-bg-elevated)]
      border-[var(--color-border)]
      text-[var(--color-text)]
      focus:border-[var(--color-primary)]
      focus-visible:ring-[var(--color-primary)]
    `,
  },
  glass: {
    full: `
      bg-[var(--glass-white-8)]
      border-[var(--color-border)]
      text-[var(--color-text)]
      backdrop-blur-md
      shadow-[var(--inner-glow-subtle)]
      focus:border-[var(--color-primary)]
      focus:shadow-[var(--glow-brand-sm)]
      focus-visible:ring-[var(--color-primary)]
    `,
    reduced: `
      bg-[var(--color-bg-elevated)]
      border-[var(--color-border)]
      text-[var(--color-text)]
      focus:border-[var(--color-primary)]
      focus-visible:ring-[var(--color-primary)]
    `,
  },
  filled: {
    full: `
      bg-[var(--color-bg-elevated)]
      border-transparent
      text-[var(--color-text)]
      focus:border-[var(--color-primary)]
      focus-visible:ring-[var(--color-primary)]
    `,
    reduced: `
      bg-[var(--color-bg-elevated)]
      border-transparent
      text-[var(--color-text)]
      focus:border-[var(--color-primary)]
      focus-visible:ring-[var(--color-primary)]
    `,
  },
  outlined: {
    full: `
      bg-transparent
      border-[var(--color-border)]
      text-[var(--color-text)]
      focus:border-[var(--color-primary)]
      focus-visible:ring-[var(--color-primary)]
      hover:border-[var(--color-border-hover)]
    `,
    reduced: `
      bg-transparent
      border-[var(--color-border)]
      text-[var(--color-text)]
      focus:border-[var(--color-primary)]
      focus-visible:ring-[var(--color-primary)]
    `,
  },
};

/**
 * Error state styles
 */
const ERROR_STYLES = {
  full: `
    border-[var(--color-error)]
    focus:border-[var(--color-error)]
    focus-visible:ring-[var(--color-error)]
  `,
  reduced: `
    border-[var(--color-error)]
    focus:border-[var(--color-error)]
    focus-visible:ring-[var(--color-error)]
  `,
};

/**
 * Size styles (all meet minimum 44px touch target)
 */
const SIZE_STYLES: Record<InputSize, string> = {
  sm: 'px-3 py-2 text-sm min-h-[44px]',
  md: 'px-4 py-3 text-base min-h-[48px]',
  lg: 'px-5 py-4 text-lg min-h-[56px]',
};

/**
 * Size styles for inputs with left icon
 */
const SIZE_WITH_LEFT_ICON: Record<InputSize, string> = {
  sm: 'pl-10',
  md: 'pl-12',
  lg: 'pl-14',
};

/**
 * Size styles for inputs with right element
 */
const SIZE_WITH_RIGHT_ELEMENT: Record<InputSize, string> = {
  sm: 'pr-10',
  md: 'pr-12',
  lg: 'pr-14',
};

/**
 * Icon position styles
 */
const ICON_SIZE_STYLES: Record<InputSize, { wrapper: string; icon: string }> = {
  sm: { wrapper: 'left-3', icon: 'w-4 h-4' },
  md: { wrapper: 'left-4', icon: 'w-5 h-5' },
  lg: { wrapper: 'left-5', icon: 'w-6 h-6' },
};

const RIGHT_ELEMENT_STYLES: Record<InputSize, string> = {
  sm: 'right-3',
  md: 'right-4',
  lg: 'right-5',
};

// ============================================
// HELPER: Get tier key for styles
// ============================================

function getTierKey(tier: RenderingTier): 'full' | 'reduced' {
  return tier === 'full' ? 'full' : 'reduced';
}

// ============================================
// INPUT COMPONENT
// ============================================

export const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      label,
      error,
      helperText,
      size = 'md',
      variant = 'default',
      leftIcon,
      rightElement,
      fullWidth = true,
      forceTier,
      className,
      containerClassName,
      id: providedId,
      disabled,
      ...props
    },
    ref
  ) => {
    // Get current rendering tier
    const { tier } = useRenderingTier({ forceTier });
    const tierKey = getTierKey(tier);

    // Generate unique ID for label association
    const generatedId = useId();
    const inputId = providedId || generatedId;
    const errorId = error ? `${inputId}-error` : undefined;
    const helperId = helperText ? `${inputId}-helper` : undefined;

    // Get styles based on tier
    const variantClass = useMemo(() => {
      return VARIANT_STYLES[variant]?.[tierKey] || VARIANT_STYLES.default[tierKey];
    }, [variant, tierKey]);

    const errorClass = useMemo(() => {
      return error ? ERROR_STYLES[tierKey] : '';
    }, [error, tierKey]);

    // For text-only tier, render basic input
    if (tier === 'text-only') {
      return (
        <div className={clsx(fullWidth && 'w-full', containerClassName)}>
          {label && (
            <label htmlFor={inputId} className="block mb-1">
              {label}:
            </label>
          )}
          <input
            ref={ref}
            id={inputId}
            className={clsx('border p-2', fullWidth && 'w-full', className)}
            disabled={disabled}
            aria-invalid={error ? 'true' : undefined}
            aria-describedby={
              [errorId, helperId].filter(Boolean).join(' ') || undefined
            }
            {...props}
          />
          {error && (
            <div id={errorId} className="text-red-600 mt-1" role="alert">
              {error}
            </div>
          )}
          {helperText && !error && (
            <div id={helperId} className="mt-1 opacity-75">
              {helperText}
            </div>
          )}
        </div>
      );
    }

    return (
      <div className={clsx(fullWidth && 'w-full', containerClassName)}>
        {/* Label */}
        {label && (
          <label
            htmlFor={inputId}
            className={clsx(
              'block mb-1.5 text-sm font-medium',
              'text-[var(--color-text)]',
              disabled && 'opacity-50'
            )}
          >
            {label}
          </label>
        )}

        {/* Input wrapper for icons */}
        <div className="relative">
          {/* Left icon */}
          {leftIcon && (
            <div
              className={clsx(
                'absolute top-1/2 -translate-y-1/2',
                'text-[var(--color-text-muted)]',
                'pointer-events-none',
                ICON_SIZE_STYLES[size].wrapper
              )}
            >
              <span className={ICON_SIZE_STYLES[size].icon}>{leftIcon}</span>
            </div>
          )}

          {/* Input element */}
          <input
            ref={ref}
            id={inputId}
            className={clsx(
              BASE_STYLES,
              variantClass,
              SIZE_STYLES[size],
              leftIcon && SIZE_WITH_LEFT_ICON[size],
              rightElement && SIZE_WITH_RIGHT_ELEMENT[size],
              errorClass,
              tier === 'full' && 'transition-all duration-200',
              className
            )}
            disabled={disabled}
            aria-invalid={error ? 'true' : undefined}
            aria-describedby={
              [errorId, helperId].filter(Boolean).join(' ') || undefined
            }
            {...props}
          />

          {/* Right element */}
          {rightElement && (
            <div
              className={clsx(
                'absolute top-1/2 -translate-y-1/2',
                'text-[var(--color-text-muted)]',
                RIGHT_ELEMENT_STYLES[size]
              )}
            >
              {rightElement}
            </div>
          )}
        </div>

        {/* Error message */}
        {error && (
          <div
            id={errorId}
            className="mt-1.5 text-sm text-[var(--color-error)]"
            role="alert"
          >
            {error}
          </div>
        )}

        {/* Helper text */}
        {helperText && !error && (
          <div
            id={helperId}
            className="mt-1.5 text-sm text-[var(--color-text-muted)]"
          >
            {helperText}
          </div>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

export default Input;
