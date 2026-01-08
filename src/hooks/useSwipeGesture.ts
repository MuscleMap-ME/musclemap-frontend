/**
 * useSwipeGesture Hook
 *
 * Detects swipe gestures on touch devices.
 * Used for swipe-to-complete, swipe-to-delete, and navigation.
 */

import { useRef, TouchEvent, MouseEvent as ReactMouseEvent } from 'react';
import { haptic } from '../utils/haptics';

interface SwipeHandlers {
  /** Callback for swipe left */
  onSwipeLeft?: () => void;
  /** Callback for swipe right */
  onSwipeRight?: () => void;
  /** Callback for swipe up */
  onSwipeUp?: () => void;
  /** Callback for swipe down */
  onSwipeDown?: () => void;
  /** Minimum distance in pixels to trigger swipe (default: 50) */
  threshold?: number;
  /** Enable haptic feedback on swipe (default: true) */
  enableHaptic?: boolean;
  /** Prevent default touch behavior */
  preventDefault?: boolean;
}

interface SwipeResult {
  onTouchStart: (e: TouchEvent) => void;
  onTouchMove: (e: TouchEvent) => void;
  onTouchEnd: (e: TouchEvent) => void;
  onMouseDown: (e: ReactMouseEvent) => void;
  onMouseMove: (e: ReactMouseEvent) => void;
  onMouseUp: (e: ReactMouseEvent) => void;
}

interface TouchPoint {
  x: number;
  y: number;
  time: number;
}

/**
 * Hook for detecting swipe gestures
 *
 * @example
 * ```tsx
 * const swipeProps = useSwipeGesture({
 *   onSwipeRight: () => markComplete(),
 *   onSwipeLeft: () => deleteItem(),
 *   threshold: 100,
 * });
 *
 * <div {...swipeProps}>
 *   Swipe me
 * </div>
 * ```
 */
export function useSwipeGesture({
  onSwipeLeft,
  onSwipeRight,
  onSwipeUp,
  onSwipeDown,
  threshold = 50,
  enableHaptic = true,
  preventDefault = false,
}: SwipeHandlers): SwipeResult {
  const touchStart = useRef<TouchPoint | null>(null);
  const isMouseDown = useRef(false);

  const handleStart = (x: number, y: number) => {
    touchStart.current = { x, y, time: Date.now() };
  };

  const handleEnd = (x: number, y: number) => {
    if (!touchStart.current) return;

    const deltaX = x - touchStart.current.x;
    const deltaY = y - touchStart.current.y;
    const deltaTime = Date.now() - touchStart.current.time;

    // Calculate velocity (pixels per ms)
    const velocity = Math.sqrt(deltaX * deltaX + deltaY * deltaY) / deltaTime;

    // Only register swipe if velocity is reasonable (not too slow)
    const minVelocity = 0.2;
    if (velocity < minVelocity && Math.abs(deltaX) < threshold * 2 && Math.abs(deltaY) < threshold * 2) {
      touchStart.current = null;
      return;
    }

    // Determine swipe direction
    const absX = Math.abs(deltaX);
    const absY = Math.abs(deltaY);

    if (absX > absY) {
      // Horizontal swipe
      if (deltaX > threshold && onSwipeRight) {
        if (enableHaptic) haptic('medium');
        onSwipeRight();
      } else if (deltaX < -threshold && onSwipeLeft) {
        if (enableHaptic) haptic('medium');
        onSwipeLeft();
      }
    } else {
      // Vertical swipe
      if (deltaY > threshold && onSwipeDown) {
        if (enableHaptic) haptic('medium');
        onSwipeDown();
      } else if (deltaY < -threshold && onSwipeUp) {
        if (enableHaptic) haptic('medium');
        onSwipeUp();
      }
    }

    touchStart.current = null;
  };

  // Touch event handlers
  const onTouchStart = (e: TouchEvent) => {
    if (preventDefault) e.preventDefault();
    handleStart(e.touches[0].clientX, e.touches[0].clientY);
  };

  const onTouchMove = (e: TouchEvent) => {
    if (preventDefault) e.preventDefault();
    // Could add progress feedback here
  };

  const onTouchEnd = (e: TouchEvent) => {
    if (preventDefault) e.preventDefault();
    handleEnd(e.changedTouches[0].clientX, e.changedTouches[0].clientY);
  };

  // Mouse event handlers (for testing on desktop)
  const onMouseDown = (e: ReactMouseEvent) => {
    isMouseDown.current = true;
    handleStart(e.clientX, e.clientY);
  };

  const onMouseMove = (_e: ReactMouseEvent) => {
    // Could add progress feedback here
  };

  const onMouseUp = (e: ReactMouseEvent) => {
    if (isMouseDown.current) {
      handleEnd(e.clientX, e.clientY);
      isMouseDown.current = false;
    }
  };

  return {
    onTouchStart,
    onTouchMove,
    onTouchEnd,
    onMouseDown,
    onMouseMove,
    onMouseUp,
  };
}

export default useSwipeGesture;
