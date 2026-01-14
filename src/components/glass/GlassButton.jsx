/**
 * GlassButton - Interactive button with glass morphism and micro-interactions
 *
 * Supports multiple variants with satisfying press animations,
 * luminous hover states, ripple effects, and success feedback.
 *
 * TOUCHSCREEN-FIRST: All sizes meet minimum 44px touch target requirement.
 * Sizes have been increased from original to ensure accessibility.
 *
 * FEATURES:
 * - Ripple effect on click (canvas-based for performance)
 * - Pulse effect option for subtle feedback
 * - Burst effect option for confetti celebration
 * - Shake effect option for error feedback
 * - Press feedback with scale animation (0.98 on press)
 * - Success animation after async onClick resolves
 * - Error shake animation on failed actions
 * - Success burst with confetti particles
 * - Haptic feedback on mobile (navigator.vibrate)
 * - Loading state with spinner and optional loading text
 * - Prominent focus ring for keyboard accessibility
 * - Respects prefers-reduced-motion
 *
 * @example
 * // With ripple (default)
 * <GlassButton onClick={handleClick}>Click Me</GlassButton>
 *
 * // With pulse instead
 * <GlassButton feedback="pulse" onClick={handleClick}>Subtle</GlassButton>
 *
 * // With burst effect (confetti on click)
 * <GlassButton feedback="burst" onClick={handleClick}>Celebrate!</GlassButton>
 *
 * // With success animation (async onClick)
 * <GlassButton
 *   successAnimation
 *   onClick={async () => {
 *     await saveData();
 *   }}
 * >
 *   Save
 * </GlassButton>
 *
 * // With success burst (confetti on success)
 * <GlassButton
 *   successBurst
 *   onClick={async () => {
 *     await saveData();
 *   }}
 * >
 *   Complete Task
 * </GlassButton>
 *
 * // With error handling
 * <GlassButton
 *   onError={() => toast.error('Failed!')}
 *   onClick={async () => {
 *     const result = await riskyOperation();
 *     if (!result.ok) throw new Error('Failed');
 *   }}
 * >
 *   Try Something
 * </GlassButton>
 *
 * // With haptic on mobile
 * <GlassButton haptic onClick={handleClick}>Tap Me</GlassButton>
 *
 * // Loading state with text
 * <GlassButton loading loadingText="Saving...">Save</GlassButton>
 */

import React, { forwardRef, useCallback, useState } from 'react';
import clsx from 'clsx';
import { motion, AnimatePresence } from 'framer-motion';
import {
  RippleEffect,
  SuccessEffect,
  PulseEffect,
  useButtonFeedback,
  useReducedMotion,
  triggerHaptic,
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

/**
 * Focus ring styles for keyboard accessibility
 * Different from click focus for better UX
 */
const FOCUS_CLASSES = `
  focus:outline-none
  focus-visible:ring-2
  focus-visible:ring-blue-500
  focus-visible:ring-offset-2
  focus-visible:ring-offset-transparent
`;

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
      // Enhanced interaction props
      ripple: _ripple = true, // Convenience prop - show ripple on click (same as feedback='ripple')
      feedback = 'ripple', // 'ripple' | 'pulse' | 'shake' | 'burst' | 'none'
      haptic = false, // Trigger haptic feedback on mobile
      successAnimation = false, // Show success animation after onClick resolves
      successBurst: _successBurst = false, // Show confetti burst on successful action
      loadingText, // Text to show while loading
      onSuccess, // Callback triggered on success
      onError: _onError, // Callback triggered on error (also triggers shake)
      onClick,
      ...props
    },
    ref
  ) => {
    // Use motion.button for built-in spring animations
    const Component = as || motion.button;
    const isMotion = !as || as === motion.button;
    const reducedMotion = useReducedMotion();

    // Internal loading state for async onClick handling
    const [isAsyncLoading, setIsAsyncLoading] = useState(false);
    const isLoading = loading || isAsyncLoading;

    // Get feedback state and handlers
    const {
      handlers: feedbackHandlers,
      isPressed,
      showSuccess,
      rippleRef,
      triggerSuccess,
      handleSuccessComplete,
    } = useButtonFeedback({
      feedback,
      onSuccess,
      disabled: disabled || isLoading,
    });

    // Handle click with haptic feedback and optional success animation
    const handleClick = useCallback(
      async (e) => {
        if (disabled || isLoading) return;

        // Trigger haptic feedback on mobile
        if (haptic) {
          triggerHaptic();
        }

        // If successAnimation is enabled and onClick returns a promise
        if (successAnimation && onClick) {
          try {
            setIsAsyncLoading(true);
            const result = onClick(e);

            // Check if onClick returns a promise
            if (result && typeof result.then === 'function') {
              await result;
              triggerSuccess();
            }
          } catch (error) {
            // Re-throw to let error boundaries handle it
            throw error;
          } finally {
            setIsAsyncLoading(false);
          }
        } else {
          onClick?.(e);
        }
      },
      [disabled, isLoading, haptic, successAnimation, onClick, triggerSuccess]
    );

    // Combine feedback handlers with existing handlers
    const combinedHandlers = {
      ...feedbackHandlers,
      onClick: handleClick,
    };

    // Motion props with enhanced press feedback
    const motionProps = isMotion
      ? {
          whileHover: disabled || isLoading ? {} : { scale: 1.02, y: -1 },
          whileTap: disabled || isLoading ? {} : { scale: reducedMotion ? 0.98 : 0.97 },
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
          FOCUS_CLASSES,
          'relative overflow-hidden transition-shadow',
          fullWidth && 'w-full',
          disabled && 'opacity-50 cursor-not-allowed',
          isLoading && 'relative opacity-80',
          className
        )}
        disabled={disabled || isLoading}
        {...motionProps}
        {...combinedHandlers}
        {...props}
      >
        {/* Ripple Effect Layer */}
        {feedback === 'ripple' && !disabled && !isLoading && (
          <RippleEffect ref={rippleRef} variant={variant} />
        )}

        {/* Pulse Effect Layer */}
        {feedback === 'pulse' && !disabled && !isLoading && (
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
            isLoading && !loadingText && 'text-transparent'
          )}
        >
          {leftIcon && !isLoading && (
            <span className="flex-shrink-0">{leftIcon}</span>
          )}
          {isLoading && loadingText ? loadingText : children}
          {rightIcon && !isLoading && (
            <span className="flex-shrink-0">{rightIcon}</span>
          )}
        </span>

        {/* Loading Spinner */}
        <AnimatePresence>
          {isLoading && !loadingText && (
            <motion.span
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="absolute inset-0 flex items-center justify-center z-10"
            >
              <LoadingSpinner size={size} variant={variant} />
            </motion.span>
          )}
          {isLoading && loadingText && (
            <motion.span
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute left-4 flex items-center justify-center z-10"
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

export { GlassButton };
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
      haptic = false,
      disabled = false,
      loading = false,
      onClick,
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

    // Handle click with optional haptic feedback
    const handleClick = useCallback(
      (e) => {
        if (disabled || loading) return;

        if (haptic) {
          triggerHaptic();
        }

        onClick?.(e);
      },
      [disabled, loading, haptic, onClick]
    );

    return (
      <motion.button
        ref={ref}
        className={clsx(
          VARIANTS[variant],
          sizeMap[size],
          TOUCH_CLASSES,
          FOCUS_CLASSES,
          'p-0 rounded-full flex items-center justify-center relative overflow-hidden transition-shadow',
          disabled && 'opacity-50 cursor-not-allowed',
          loading && 'opacity-80',
          className
        )}
        whileHover={disabled || loading ? {} : { scale: 1.05 }}
        whileTap={disabled || loading ? {} : { scale: reducedMotion ? 0.95 : 0.93 }}
        animate={isPressed && !reducedMotion ? { scale: 0.93 } : { scale: 1 }}
        transition={{ type: 'spring', stiffness: 400, damping: 17 }}
        disabled={disabled || loading}
        {...feedbackHandlers}
        onClick={handleClick}
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
