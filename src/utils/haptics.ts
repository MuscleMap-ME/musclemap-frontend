/**
 * Haptic Feedback Utility
 *
 * Cross-platform haptic feedback for touchscreen interactions.
 * Uses the Web Vibration API for browsers that support it.
 */

export type HapticType =
  | 'light'
  | 'medium'
  | 'heavy'
  | 'success'
  | 'warning'
  | 'error'
  | 'selection';

const VIBRATION_PATTERNS: Record<HapticType, number[]> = {
  light: [10],
  medium: [20],
  heavy: [40],
  success: [10, 50, 10],
  warning: [20, 30, 20],
  error: [50, 30, 50],
  selection: [5],
};

/**
 * Trigger haptic feedback
 *
 * @param type - The type of haptic feedback to trigger
 *
 * Usage:
 * - 'light': Button taps, toggle changes
 * - 'medium': Swipe actions, long press triggers
 * - 'heavy': Major state changes
 * - 'success': Workout complete, item added
 * - 'warning': Destructive action (delete, leave)
 * - 'error': Validation errors, API failures
 * - 'selection': List item selection
 */
export function haptic(type: HapticType = 'light'): void {
  // Check if Vibration API is available
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    try {
      navigator.vibrate(VIBRATION_PATTERNS[type]);
    } catch {
      // Silently fail if vibration not available
    }
  }
}

/**
 * Check if haptic feedback is supported
 */
export function isHapticSupported(): boolean {
  return typeof navigator !== 'undefined' && 'vibrate' in navigator;
}

/**
 * Cancel any ongoing vibration
 */
export function cancelHaptic(): void {
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    navigator.vibrate(0);
  }
}
