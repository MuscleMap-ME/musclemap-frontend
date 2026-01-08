/**
 * Mobile Haptic Feedback Utility
 *
 * Uses expo-haptics for native haptic feedback on iOS and Android.
 * Provides consistent haptic patterns across the app.
 */

import * as Haptics from 'expo-haptics';

export type HapticType =
  | 'light'
  | 'medium'
  | 'heavy'
  | 'success'
  | 'warning'
  | 'error'
  | 'selection';

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
export async function haptic(type: HapticType = 'light'): Promise<void> {
  try {
    switch (type) {
      case 'light':
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        break;
      case 'medium':
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        break;
      case 'heavy':
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
        break;
      case 'success':
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        break;
      case 'warning':
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        break;
      case 'error':
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        break;
      case 'selection':
        await Haptics.selectionAsync();
        break;
    }
  } catch {
    // Silently fail if haptics unavailable (e.g., simulator)
  }
}

/**
 * Check if haptic feedback is likely supported
 * Note: Expo doesn't have a direct API for this, so we assume true for native
 */
export function isHapticSupported(): boolean {
  return true; // Expo handles platform differences internally
}
