/**
 * Custom Hooks
 *
 * Export all custom hooks for the application
 */

export { useLongPress } from './useLongPress';
export { useSwipeGesture } from './useSwipeGesture';

// Network and adaptive loading hooks
export {
  useNetworkStatus,
  useImageQuality,
  useShouldLoadHeavyContent,
  useAnimationSettings,
} from './useNetworkStatus';

export {
  useAdaptiveLoading,
  useAdaptiveImage,
  useVisualizationSettings,
  useAnimationConfig,
  useAdaptivePollingInterval,
  useLazyLoad,
} from './useAdaptiveLoading';
