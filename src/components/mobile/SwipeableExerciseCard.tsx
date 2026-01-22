/**
 * SwipeableExerciseCard Component
 *
 * A card component that supports swipe gestures for exercise navigation.
 * Swipe left/right to navigate between exercises in a workout.
 */

import React, { useCallback } from 'react';
import { motion, PanInfo, useMotionValue, useTransform } from 'framer-motion';
import { ChevronLeft, ChevronRight, Check, SkipForward } from 'lucide-react';
import { haptic } from '../../utils/haptics';
import { useMotion } from '../../contexts/MotionContext';

interface SwipeableExerciseCardProps {
  /** Current exercise content */
  children: React.ReactNode;
  /** Callback when swiping to previous exercise */
  onPrevious?: () => void;
  /** Callback when swiping to next exercise */
  onNext?: () => void;
  /** Callback when swiping right (complete/check off) */
  onComplete?: () => void;
  /** Callback when swiping left (skip) */
  onSkip?: () => void;
  /** Whether there's a previous exercise */
  hasPrevious?: boolean;
  /** Whether there's a next exercise */
  hasNext?: boolean;
  /** Whether to show complete/skip actions on swipe */
  showActions?: boolean;
  /** Custom swipe threshold in pixels (default: 100) */
  threshold?: number;
  /** Custom class name */
  className?: string;
}

export function SwipeableExerciseCard({
  children,
  onPrevious,
  onNext,
  onComplete,
  onSkip,
  hasPrevious = true,
  hasNext = true,
  showActions = false,
  threshold = 100,
  className = '',
}: SwipeableExerciseCardProps) {
  const { reducedMotion } = useMotion();

  // Motion values for drag
  const x = useMotionValue(0);
  const opacity = useTransform(x, [-200, 0, 200], [0.5, 1, 0.5]);
  const scale = useTransform(x, [-200, 0, 200], [0.95, 1, 0.95]);

  // Background indicator transforms
  const leftIndicatorOpacity = useTransform(x, [-threshold, -threshold / 2, 0], [1, 0.5, 0]);
  const rightIndicatorOpacity = useTransform(x, [0, threshold / 2, threshold], [0, 0.5, 1]);
  const leftIndicatorScale = useTransform(x, [-threshold, -threshold / 2, 0], [1.2, 1, 0.8]);
  const rightIndicatorScale = useTransform(x, [0, threshold / 2, threshold], [0.8, 1, 1.2]);

  const handleDragEnd = useCallback(
    (_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
      const offset = info.offset.x;
      const velocity = info.velocity.x;

      // Fast swipe or past threshold
      if (velocity < -500 || offset < -threshold) {
        // Swiped left
        if (showActions && onSkip) {
          haptic('medium');
          onSkip();
        } else if (hasNext && onNext) {
          haptic('selection');
          onNext();
        }
      } else if (velocity > 500 || offset > threshold) {
        // Swiped right
        if (showActions && onComplete) {
          haptic('success');
          onComplete();
        } else if (hasPrevious && onPrevious) {
          haptic('selection');
          onPrevious();
        }
      }
    },
    [threshold, showActions, onSkip, onComplete, hasNext, hasPrevious, onNext, onPrevious]
  );

  return (
    <div className={`relative overflow-hidden ${className}`}>
      {/* Left background indicator (skip or previous) */}
      <motion.div
        className="absolute left-0 top-0 bottom-0 w-24 flex items-center justify-start pl-4"
        style={{
          opacity: leftIndicatorOpacity,
        }}
      >
        <motion.div
          className={`
            p-3 rounded-full
            ${showActions ? 'bg-yellow-500/30' : 'bg-white/10'}
          `}
          style={{ scale: leftIndicatorScale }}
        >
          {showActions ? (
            <SkipForward className="w-6 h-6 text-yellow-400" />
          ) : (
            <ChevronLeft className="w-6 h-6 text-white/60" />
          )}
        </motion.div>
      </motion.div>

      {/* Right background indicator (complete or next) */}
      <motion.div
        className="absolute right-0 top-0 bottom-0 w-24 flex items-center justify-end pr-4"
        style={{
          opacity: rightIndicatorOpacity,
        }}
      >
        <motion.div
          className={`
            p-3 rounded-full
            ${showActions ? 'bg-green-500/30' : 'bg-white/10'}
          `}
          style={{ scale: rightIndicatorScale }}
        >
          {showActions ? (
            <Check className="w-6 h-6 text-green-400" />
          ) : (
            <ChevronRight className="w-6 h-6 text-white/60" />
          )}
        </motion.div>
      </motion.div>

      {/* Swipeable card */}
      <motion.div
        drag="x"
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.5}
        onDragEnd={handleDragEnd}
        style={{ x, opacity, scale }}
        transition={{
          type: reducedMotion ? 'tween' : 'spring',
          damping: 30,
          stiffness: 300,
        }}
        className="relative z-10 touch-pan-y"
      >
        {children}
      </motion.div>

      {/* Edge indicators showing swipe availability */}
      {!showActions && (
        <>
          {hasPrevious && (
            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-12 bg-white/20 rounded-r-full" />
          )}
          {hasNext && (
            <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1 h-12 bg-white/20 rounded-l-full" />
          )}
        </>
      )}
    </div>
  );
}

export default SwipeableExerciseCard;
