/**
 * GlassButton - Interactive button with glass morphism
 *
 * Supports multiple variants with satisfying press animations
 * and luminous hover states.
 */

import React, { forwardRef } from 'react';
import clsx from 'clsx';
import { motion } from 'framer-motion';

const VARIANTS = {
  glass: 'btn-glass',
  primary: 'btn-glass btn-primary',
  pulse: 'btn-glass btn-pulse',
  ghost: 'btn-ghost',
};

const SIZES = {
  sm: 'px-3 py-1.5 text-xs',
  md: 'px-4 py-2.5 text-sm',
  lg: 'px-6 py-3 text-base',
  xl: 'px-8 py-4 text-lg',
};

const GlassButton = forwardRef(
  (
    {
      children,
      className,
      variant = 'glass',
      size = 'md',
      fullWidth = false,
      disabled = false,
      loading = false,
      leftIcon,
      rightIcon,
      as,
      ...props
    },
    ref
  ) => {
    // Use motion.button for built-in spring animations
    const Component = as || motion.button;
    const isMotion = !as || as === motion.button;

    const motionProps = isMotion
      ? {
          whileHover: disabled ? {} : { scale: 1.02, y: -1 },
          whileTap: disabled ? {} : { scale: 0.98 },
          transition: {
            type: 'spring',
            stiffness: 400,
            damping: 17,
          },
        }
      : {};

    return (
      <Component
        ref={ref}
        className={clsx(
          VARIANTS[variant],
          SIZES[size],
          fullWidth && 'w-full',
          disabled && 'opacity-50 cursor-not-allowed',
          loading && 'relative text-transparent',
          className
        )}
        disabled={disabled || loading}
        {...motionProps}
        {...props}
      >
        {leftIcon && !loading && (
          <span className="flex-shrink-0">{leftIcon}</span>
        )}
        {children}
        {rightIcon && !loading && (
          <span className="flex-shrink-0">{rightIcon}</span>
        )}
        {loading && (
          <span className="absolute inset-0 flex items-center justify-center">
            <LoadingSpinner size={size} />
          </span>
        )}
      </Component>
    );
  }
);

GlassButton.displayName = 'GlassButton';

export default GlassButton;

/**
 * Loading spinner with liquid animation
 */
const LoadingSpinner = ({ size }) => {
  const sizeMap = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-5 h-5',
    xl: 'w-6 h-6',
  };

  return (
    <svg
      className={clsx('animate-spin', sizeMap[size])}
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

/**
 * GlassIconButton - Circular icon button variant
 */
export const GlassIconButton = forwardRef(
  (
    { children, className, size = 'md', variant = 'glass', ...props },
    ref
  ) => {
    const sizeMap = {
      sm: 'w-8 h-8',
      md: 'w-10 h-10',
      lg: 'w-12 h-12',
      xl: 'w-14 h-14',
    };

    return (
      <motion.button
        ref={ref}
        className={clsx(
          VARIANTS[variant],
          sizeMap[size],
          'p-0 rounded-full flex items-center justify-center',
          className
        )}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        transition={{ type: 'spring', stiffness: 400, damping: 17 }}
        {...props}
      >
        {children}
      </motion.button>
    );
  }
);

GlassIconButton.displayName = 'GlassIconButton';
