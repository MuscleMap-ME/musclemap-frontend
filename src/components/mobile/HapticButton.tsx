/**
 * HapticButton Component
 *
 * A button with built-in haptic feedback for mobile devices.
 * Extends the standard button with touch-optimized features.
 */

import React, { forwardRef, useCallback } from 'react';
import { motion, HTMLMotionProps } from 'framer-motion';
import { haptic, HapticType } from '../../utils/haptics';
import { useMotion } from '../../contexts/MotionContext';

interface HapticButtonProps extends Omit<HTMLMotionProps<'button'>, 'onTap'> {
  /** Haptic feedback type (default: 'light') */
  hapticType?: HapticType;
  /** Whether haptic feedback is enabled (default: true) */
  hapticEnabled?: boolean;
  /** Visual feedback scale on press (default: 0.97) */
  pressScale?: number;
  /** Children content */
  children: React.ReactNode;
  /** Button variant for styling */
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  /** Button size */
  size?: 'sm' | 'md' | 'lg';
  /** Whether button is in loading state */
  loading?: boolean;
  /** Full width button */
  fullWidth?: boolean;
}

const variantStyles = {
  primary: 'bg-blue-600 hover:bg-blue-700 text-white border-transparent',
  secondary: 'bg-white/10 hover:bg-white/20 text-white border-white/20',
  ghost: 'bg-transparent hover:bg-white/10 text-gray-300 border-transparent',
  danger: 'bg-red-600/90 hover:bg-red-700 text-white border-transparent',
};

const sizeStyles = {
  sm: 'px-3 py-1.5 text-sm min-h-[36px]',
  md: 'px-4 py-2.5 text-base min-h-[44px]',
  lg: 'px-6 py-3 text-lg min-h-[52px]',
};

export const HapticButton = forwardRef<HTMLButtonElement, HapticButtonProps>(
  (
    {
      hapticType = 'light',
      hapticEnabled = true,
      pressScale = 0.97,
      children,
      variant = 'primary',
      size = 'md',
      loading = false,
      fullWidth = false,
      className = '',
      onClick,
      disabled,
      ...props
    },
    ref
  ) => {
    const { shouldAnimate } = useMotion();

    const handleClick = useCallback(
      (e: React.MouseEvent<HTMLButtonElement>) => {
        if (hapticEnabled && !disabled && !loading) {
          haptic(hapticType);
        }
        onClick?.(e);
      },
      [hapticEnabled, hapticType, disabled, loading, onClick]
    );

    const handleTouchStart = useCallback(() => {
      if (hapticEnabled && !disabled && !loading) {
        haptic('selection');
      }
    }, [hapticEnabled, disabled, loading]);

    return (
      <motion.button
        ref={ref}
        onClick={handleClick}
        onTouchStart={handleTouchStart}
        disabled={disabled || loading}
        whileTap={
          shouldAnimate && !disabled && !loading
            ? { scale: pressScale }
            : undefined
        }
        transition={{
          type: 'spring',
          stiffness: 400,
          damping: 25,
        }}
        className={`
          relative inline-flex items-center justify-center
          font-medium rounded-xl border
          transition-colors duration-150
          touch-action-manipulation
          -webkit-tap-highlight-color-transparent
          disabled:opacity-50 disabled:cursor-not-allowed
          ${variantStyles[variant]}
          ${sizeStyles[size]}
          ${fullWidth ? 'w-full' : ''}
          ${className}
        `}
        {...props}
      >
        {loading ? (
          <>
            <motion.span
              className="absolute inset-0 flex items-center justify-center"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <svg
                className="animate-spin h-5 w-5"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
            </motion.span>
            <span className="invisible">{children}</span>
          </>
        ) : (
          children
        )}
      </motion.button>
    );
  }
);

HapticButton.displayName = 'HapticButton';

export default HapticButton;
