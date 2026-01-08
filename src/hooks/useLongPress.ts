/**
 * useLongPress Hook
 *
 * Detects long press gestures for touch and mouse interactions.
 * Used for contextual menus and secondary actions.
 */

import { useCallback, useRef } from 'react';
import { haptic } from '../utils/haptics';

interface LongPressOptions {
  /** Callback when long press is detected */
  onLongPress: () => void;
  /** Callback for normal press (if long press not triggered) */
  onPress?: () => void;
  /** Duration in ms to trigger long press (default: 500) */
  threshold?: number;
  /** Enable haptic feedback on long press (default: true) */
  enableHaptic?: boolean;
}

interface LongPressResult {
  onMouseDown: () => void;
  onMouseUp: () => void;
  onMouseLeave: () => void;
  onTouchStart: () => void;
  onTouchEnd: () => void;
}

/**
 * Hook for detecting long press gestures
 *
 * @example
 * ```tsx
 * const longPressProps = useLongPress({
 *   onLongPress: () => showContextMenu(),
 *   onPress: () => selectItem(),
 *   threshold: 500,
 * });
 *
 * <div {...longPressProps}>
 *   Press and hold for options
 * </div>
 * ```
 */
export function useLongPress({
  onLongPress,
  onPress,
  threshold = 500,
  enableHaptic = true,
}: LongPressOptions): LongPressResult {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isLongPressRef = useRef(false);
  const isActiveRef = useRef(false);

  const start = useCallback(() => {
    isActiveRef.current = true;
    isLongPressRef.current = false;

    timerRef.current = setTimeout(() => {
      if (isActiveRef.current) {
        isLongPressRef.current = true;
        if (enableHaptic) {
          haptic('medium');
        }
        onLongPress();
      }
    }, threshold);
  }, [onLongPress, threshold, enableHaptic]);

  const stop = useCallback(
    (shouldTriggerPress: boolean = true) => {
      isActiveRef.current = false;

      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }

      if (shouldTriggerPress && !isLongPressRef.current && onPress) {
        onPress();
      }
    },
    [onPress]
  );

  const cancel = useCallback(() => {
    stop(false);
  }, [stop]);

  return {
    onMouseDown: start,
    onMouseUp: () => stop(true),
    onMouseLeave: cancel,
    onTouchStart: start,
    onTouchEnd: () => stop(true),
  };
}

export default useLongPress;
