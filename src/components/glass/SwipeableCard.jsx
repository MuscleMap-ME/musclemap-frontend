/**
 * SwipeableCard - Card with swipe gestures for actions
 *
 * TOUCHSCREEN-FIRST: Enables swipe-to-complete and swipe-to-delete patterns.
 * - Swipe right: Primary action (complete, favorite, approve)
 * - Swipe left: Secondary/destructive action (delete, remove, reject)
 *
 * Replaces the pattern of: Tap card -> Tap button
 * With: Swipe card (action happens with undo toast)
 */

import React, { forwardRef, useState } from 'react';
import clsx from 'clsx';
import { motion, useMotionValue, useTransform, useAnimation } from 'framer-motion';
import { haptic } from '../../utils/haptics';

const SWIPE_THRESHOLD = 100;
const DRAG_LIMIT = 150;

const SwipeableCard = forwardRef(
  (
    {
      children,
      className,
      onSwipeRight,
      onSwipeLeft,
      rightAction = { icon: '✓', color: 'bg-green-500', label: 'Complete' },
      leftAction = { icon: '×', color: 'bg-red-500', label: 'Delete' },
      disabled = false,
      ...props
    },
    ref
  ) => {
    const x = useMotionValue(0);
    const controls = useAnimation();
    const [isDragging, setIsDragging] = useState(false);

    // Opacity transforms for action backgrounds
    const rightOpacity = useTransform(x, [0, SWIPE_THRESHOLD], [0, 1]);
    const leftOpacity = useTransform(x, [-SWIPE_THRESHOLD, 0], [1, 0]);

    // Scale transform for visual feedback
    const rightScale = useTransform(x, [0, SWIPE_THRESHOLD], [0.8, 1]);
    const leftScale = useTransform(x, [-SWIPE_THRESHOLD, 0], [1, 0.8]);

    const handleDragStart = () => {
      setIsDragging(true);
    };

    const handleDragEnd = (_, info) => {
      setIsDragging(false);

      if (disabled) {
        controls.start({ x: 0 });
        return;
      }

      const shouldTriggerRight = info.offset.x > SWIPE_THRESHOLD && onSwipeRight;
      const shouldTriggerLeft = info.offset.x < -SWIPE_THRESHOLD && onSwipeLeft;

      if (shouldTriggerRight) {
        haptic('success');
        // Animate out to the right, then reset
        controls.start({ x: 300, opacity: 0 }).then(() => {
          onSwipeRight();
          // Reset position (card might be removed by parent)
          controls.set({ x: 0, opacity: 1 });
        });
      } else if (shouldTriggerLeft) {
        haptic('warning');
        // Animate out to the left, then reset
        controls.start({ x: -300, opacity: 0 }).then(() => {
          onSwipeLeft();
          // Reset position (card might be removed by parent)
          controls.set({ x: 0, opacity: 1 });
        });
      } else {
        // Snap back to center
        controls.start({ x: 0 });
      }
    };

    return (
      <div ref={ref} className={clsx('relative overflow-hidden rounded-2xl', className)} {...props}>
        {/* Right swipe background (complete/positive action) */}
        {onSwipeRight && (
          <motion.div
            className={clsx(
              'absolute inset-y-0 left-0 w-24 flex items-center justify-center',
              rightAction.color
            )}
            style={{ opacity: rightOpacity, scale: rightScale }}
          >
            <span className="text-white text-2xl">{rightAction.icon}</span>
          </motion.div>
        )}

        {/* Left swipe background (delete/negative action) */}
        {onSwipeLeft && (
          <motion.div
            className={clsx(
              'absolute inset-y-0 right-0 w-24 flex items-center justify-center',
              leftAction.color
            )}
            style={{ opacity: leftOpacity, scale: leftScale }}
          >
            <span className="text-white text-2xl">{leftAction.icon}</span>
          </motion.div>
        )}

        {/* Card content */}
        <motion.div
          className={clsx(
            'glass p-4 rounded-2xl relative',
            'touch-action-pan-y',
            isDragging && 'cursor-grabbing',
            disabled && 'opacity-50'
          )}
          style={{ x }}
          drag={disabled ? false : 'x'}
          dragConstraints={{ left: -DRAG_LIMIT, right: DRAG_LIMIT }}
          dragElastic={0.1}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          animate={controls}
          whileTap={{ cursor: 'grabbing' }}
        >
          {children}
        </motion.div>
      </div>
    );
  }
);

SwipeableCard.displayName = 'SwipeableCard';

export default SwipeableCard;

/**
 * SwipeableCardContent - Standard content layout for swipeable cards
 */
export function SwipeableCardContent({
  title,
  subtitle,
  meta,
  children,
  completed = false,
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <h3
            className={clsx(
              'font-bold text-white',
              completed && 'line-through opacity-60'
            )}
          >
            {title}
          </h3>
          {subtitle && (
            <p className="text-sm text-gray-400 truncate">{subtitle}</p>
          )}
        </div>
        {meta && <div className="flex-shrink-0 text-sm text-gray-400">{meta}</div>}
      </div>
      {children}
    </div>
  );
}

/**
 * SwipeHint - Visual hint showing swipe actions
 */
export function SwipeHint({ leftLabel, rightLabel }) {
  return (
    <div className="flex justify-between text-xs text-gray-500 px-2 mt-1">
      {leftLabel && <span>← {leftLabel}</span>}
      {rightLabel && <span>{rightLabel} →</span>}
    </div>
  );
}
