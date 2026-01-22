/**
 * Mobile UX Components
 *
 * Touch-optimized components for iOS and Android browsers.
 * These components provide native-feeling interactions on mobile devices.
 */

// Bottom sheet modal (slides up from bottom)
export { BottomSheet } from './BottomSheet';
export type { default as BottomSheetProps } from './BottomSheet';

// Pull to refresh wrapper
export { PullToRefresh } from './PullToRefresh';
export type { default as PullToRefreshProps } from './PullToRefresh';

// Offline/connection indicator
export { OfflineIndicator } from './OfflineIndicator';
export type { default as OfflineIndicatorProps } from './OfflineIndicator';

// Button with haptic feedback
export { HapticButton } from './HapticButton';
export type { default as HapticButtonProps } from './HapticButton';

// Swipeable exercise card for workout navigation
export { SwipeableExerciseCard } from './SwipeableExerciseCard';
export type { default as SwipeableExerciseCardProps } from './SwipeableExerciseCard';

// Skeleton loading components
export {
  SkeletonLine,
  SkeletonCircle,
  SkeletonCard,
  SkeletonExerciseCard,
  SkeletonTemplateCard,
  SkeletonStatCard,
  SkeletonListItem,
  SkeletonDashboardWidget,
  SkeletonProfileHeader,
  SkeletonFeedPost,
  SkeletonGrid,
  SkeletonList,
  SkeletonPage,
} from './SkeletonLoader';

// Floating action button
export { FloatingActionButton } from './FloatingActionButton';

// Animated counters
export {
  AnimatedCounter,
  SpringCounter,
  SlotCounter,
  CountdownDisplay,
  ProgressCounter,
} from './AnimatedCounter';
