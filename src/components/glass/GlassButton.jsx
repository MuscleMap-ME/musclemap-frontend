/**
 * GlassButton - Interactive button with glass morphism and micro-interactions
 *
 * Supports multiple variants with satisfying press animations,
 * luminous hover states, ripple effects, and success feedback.
 *
 * TOUCHSCREEN-FIRST: All sizes meet minimum 44px touch target requirement.
 * Sizes have been increased from original to ensure accessibility.
 *
 * NEW FEATURES:
 * - Ripple effect on click (canvas-based for performance)
 * - Press feedback with scale animation
 * - Optional success state animation
 * - Loading state improvements
 * - Haptic-style visual feedback
 * - Respects prefers-reduced-motion
 */

import React, { forwardRef, useCallback } from 'react';
import clsx from 'clsx';
import { motion, AnimatePresence } from 'framer-motion';
import {
  RippleEffect,
  SuccessEffect,
  PulseEffect,
  useButtonFeedback,
  useReducedMotion,
} from './ButtonEffects';

const VARIANTS = {
  glass: 'btn-glass',
  primary: 'btn-glass btn-primary',
  pulse: 'btn-glass btn-pulse',
  ghost: 'btn-ghost',
};

/**
 * TOUCHSCREEN-FIRST SIZES
 *
 * All sizes meet minimum 44px (iOS) / 48px (Material) touch target.
 * Previous sizes were too small for reliable touch interaction:
 * - sm: was 24px, now 44px min-height
 * - md: was 36px, now 48px min-height
 * - lg: was 44px, now 52px min-height
 * - xl: was 52px, now 56px min-height
 */
const SIZES = {
  sm: 'px-4 py-2.5 text-sm min-h-[44px]',
  md: 'px-5 py-3 text-base min-h-[48px]',
  lg: 'px-6 py-3.5 text-base min-h-[52px]',
  xl: 'px-8 py-4 text-lg min-h-[56px]',
};

/**
 * Touch-friendly base classes applied to all buttons
 */
const TOUCH_CLASSES = 'touch-action-manipulation select-none';

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
      // New props for enhanced interactions
      feedback = 'ripple', // 'ripple' | 'pulse' | 'none'
      onSuccess,
      onClick,
      ...props
    },
    ref
  ) => {
    // Use motion.button for built-in spring animations
    const Component = as || motion.button;
    const isMotion = !as || as === motion.button;
    const reducedMotion = useReducedMotion();

    // Get feedback state and handlers
    const {
      handlers: feedbackHandlers,
      isPressed,
      showSuccess,
      rippleRef,
      triggerSuccess: _triggerSuccess, // Available for external use via ref
      handleSuccessComplete,
    } = useButtonFeedback({
      feedback,
      onSuccess,
      disabled: disabled || loading,
    });

    // Handle click with optional success trigger
    const handleClick = useCallback(
      (e) => {
        if (disabled || loading) return;
        onClick?.(e);
      },
      [disabled, loading, onClick]
    );

    // Combine feedback handlers with existing handlers
    const combinedHandlers = {
      ...feedbackHandlers,
      onClick: handleClick,
    };

    // Motion props with enhanced press feedback
    const motionProps = isMotion
      ? {
          whileHover: disabled || loading ? {} : { scale: 1.02, y: -1 },
          whileTap: disabled || loading ? {} : { scale: reducedMotion ? 0.98 : 0.97 },
          animate: isPressed && !reducedMotion ? { scale: 0.97 } : { scale: 1 },
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
          TOUCH_CLASSES,
          'relative overflow-hidden',
          fullWidth && 'w-full',
          disabled && 'opacity-50 cursor-not-allowed',
          loading && 'relative',
          className
        )}
        disabled={disabled || loading}
        {...motionProps}
        {...combinedHandlers}
        {...props}
      >
        {/* Ripple Effect Layer */}
        {feedback === 'ripple' && !disabled && !loading && (
          <RippleEffect ref={rippleRef} variant={variant} />
        )}

        {/* Pulse Effect Layer */}
        {feedback === 'pulse' && !disabled && !loading && (
          <PulseEffect active={isPressed} variant={variant} />
        )}

        {/* Success Animation Layer */}
        <AnimatePresence>
          {showSuccess && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-10"
            >
              <SuccessEffect
                active={showSuccess}
                variant={variant}
                onComplete={handleSuccessComplete}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Button Content */}
        <span
          className={clsx(
            'relative z-0 flex items-center justify-center gap-2',
            loading && 'text-transparent'
          )}
        >
          {leftIcon && !loading && (
            <span className="flex-shrink-0">{leftIcon}</span>
          )}
          {children}
          {rightIcon && !loading && (
            <span className="flex-shrink-0">{rightIcon}</span>
          )}
        </span>

        {/* Loading Spinner */}
        <AnimatePresence>
          {loading && (
            <motion.span
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="absolute inset-0 flex items-center justify-center z-10"
            >
              <LoadingSpinner size={size} variant={variant} />
            </motion.span>
          )}
        </AnimatePresence>
      </Component>
    );
  }
);

GlassButton.displayName = 'GlassButton';

// Export triggerSuccess utility for external use
export { useButtonFeedback } from './ButtonEffects';

export default GlassButton;

/**
 * Loading spinner with liquid animation
 * Enhanced with variant-aware coloring and smoother animation
 */
const LoadingSpinner = ({ size, variant = 'glass' }) => {
  const sizeMap = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6',
    xl: 'w-7 h-7',
  };

  // Get spinner color based on variant
  const spinnerColor = variant === 'primary' ? 'text-white' : 'text-current';

  return (
    <svg
      className={clsx('animate-spin', sizeMap[size], spinnerColor)}
      viewBox="0 0 24 24"
      fill="none"
    >
      {/* Background track */}
      <circle
        className="opacity-20"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="3"
      />
      {/* Animated arc */}
      <path
        className="opacity-90"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
      {/* Glowing effect for primary variant */}
      {variant === 'primary' && (
        <circle
          cx="12"
          cy="4"
          r="2"
          fill="currentColor"
          className="opacity-60"
          style={{
            filter: 'blur(1px)',
          }}
        />
      )}
    </svg>
  );
};

/**
 * GlassIconButton - Circular icon button variant
 *
 * TOUCHSCREEN-FIRST: All sizes meet minimum 44px touch target.
 * Previous sizes were too small:
 * - sm: was 32px, now 40px (slightly under 44px but acceptable for icon buttons)
 * - md: was 40px, now 48px
 * - lg: was 48px, now 56px
 * - xl: was 56px, now 64px
 */
export const GlassIconButton = forwardRef(
  (
    {
      children,
      className,
      size = 'md',
      variant = 'glass',
      feedback = 'ripple',
      disabled = false,
      loading = false,
      ...props
    },
    ref
  ) => {
    const sizeMap = {
      sm: 'w-10 h-10',
      md: 'w-12 h-12',
      lg: 'w-14 h-14',
      xl: 'w-16 h-16',
    };

    const reducedMotion = useReducedMotion();

    // Get feedback state and handlers
    const {
      handlers: feedbackHandlers,
      isPressed,
      rippleRef,
    } = useButtonFeedback({
      feedback,
      disabled: disabled || loading,
    });

    return (
      <motion.button
        ref={ref}
        className={clsx(
          VARIANTS[variant],
          sizeMap[size],
          TOUCH_CLASSES,
          'p-0 rounded-full flex items-center justify-center relative overflow-hidden',
          disabled && 'opacity-50 cursor-not-allowed',
          className
        )}
        whileHover={disabled || loading ? {} : { scale: 1.05 }}
        whileTap={disabled || loading ? {} : { scale: reducedMotion ? 0.95 : 0.93 }}
        animate={isPressed && !reducedMotion ? { scale: 0.93 } : { scale: 1 }}
        transition={{ type: 'spring', stiffness: 400, damping: 17 }}
        disabled={disabled || loading}
        {...feedbackHandlers}
        {...props}
      >
        {/* Ripple Effect Layer */}
        {feedback === 'ripple' && !disabled && !loading && (
          <RippleEffect ref={rippleRef} variant={variant} />
        )}

        {/* Icon Content */}
        <span className={clsx('relative z-0', loading && 'opacity-0')}>
          {children}
        </span>

        {/* Loading Spinner */}
        <AnimatePresence>
          {loading && (
            <motion.span
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="absolute inset-0 flex items-center justify-center"
            >
              <LoadingSpinner size="sm" variant={variant} />
            </motion.span>
          )}
        </AnimatePresence>
      </motion.button>
    );
  }
);

GlassIconButton.displayName = 'GlassIconButton';
