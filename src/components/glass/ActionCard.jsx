/**
 * ActionCard - Tappable card for direct actions
 *
 * TOUCHSCREEN-FIRST: The entire card is the touch target.
 * Tap executes the primary action immediately.
 * Long-press reveals secondary options.
 *
 * Replaces the pattern of: Tap card -> Navigate -> Tap button
 * With: Tap card (action happens with undo toast)
 */

import React, { forwardRef } from 'react';
import clsx from 'clsx';
import { motion } from 'framer-motion';
import { useLongPress } from '../../hooks/useLongPress';
import { haptic } from '../../utils/haptics';

const ActionCard = forwardRef(
  (
    {
      children,
      className,
      onTap,
      onLongPress,
      disabled = false,
      loading = false,
      variant = 'default',
      ...props
    },
    ref
  ) => {
    const longPressProps = useLongPress({
      onLongPress: () => {
        if (onLongPress && !disabled && !loading) {
          onLongPress();
        }
      },
      onPress: () => {
        if (onTap && !disabled && !loading) {
          haptic('light');
          onTap();
        }
      },
      threshold: 500,
      enableHaptic: true,
    });

    const variants = {
      default: 'glass',
      primary: 'glass border-blue-500/30',
      success: 'glass border-green-500/30',
      danger: 'glass border-red-500/30',
    };

    return (
      <motion.div
        ref={ref}
        className={clsx(
          variants[variant],
          'p-4 rounded-2xl cursor-pointer',
          'touch-action-manipulation select-none',
          'transition-colors',
          disabled && 'opacity-50 cursor-not-allowed',
          loading && 'pointer-events-none',
          className
        )}
        whileHover={disabled ? {} : { scale: 1.01 }}
        whileTap={disabled ? {} : { scale: 0.98 }}
        transition={{ type: 'spring', stiffness: 400, damping: 17 }}
        {...longPressProps}
        {...props}
      >
        {loading ? (
          <div className="flex items-center justify-center py-4">
            <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          </div>
        ) : (
          children
        )}
      </motion.div>
    );
  }
);

ActionCard.displayName = 'ActionCard';

export default ActionCard;

/**
 * ActionCardHeader - Header section with icon and title
 */
export function ActionCardHeader({ icon, title, subtitle, action }) {
  return (
    <div className="flex items-start justify-between gap-3">
      {icon && (
        <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center text-2xl">
          {icon}
        </div>
      )}
      <div className="flex-1 min-w-0">
        <h3 className="font-bold text-white truncate">{title}</h3>
        {subtitle && (
          <p className="text-sm text-gray-400 truncate">{subtitle}</p>
        )}
      </div>
      {action && <div className="flex-shrink-0">{action}</div>}
    </div>
  );
}

/**
 * ActionCardBody - Main content area
 */
export function ActionCardBody({ children, className }) {
  return <div className={clsx('mt-3', className)}>{children}</div>;
}

/**
 * ActionCardFooter - Footer with metadata or actions
 */
export function ActionCardFooter({ children, className }) {
  return (
    <div className={clsx('mt-3 pt-3 border-t border-white/10', className)}>
      {children}
    </div>
  );
}
