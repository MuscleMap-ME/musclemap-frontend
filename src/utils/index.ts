/**
 * Utility Functions
 *
 * Export all utility functions for the application
 */

export { haptic, isHapticSupported, cancelHaptic } from './haptics';
export type { HapticType } from './haptics';

export {
  executeOptimistic,
  createDebouncedSave,
  createUndoableAction,
} from './optimistic';
export type { OptimisticAction } from './optimistic';
