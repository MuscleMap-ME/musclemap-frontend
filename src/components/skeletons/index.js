/**
 * Skeleton Components
 *
 * Enhanced loading state skeletons with shimmer animation effects.
 * Use these instead of showing blank screens during data loading.
 *
 * Features:
 * - Smooth left-to-right shimmer wave animation
 * - Respects prefers-reduced-motion (static gray if reduced motion)
 * - Uses CSS variables from design-tokens.css for consistent styling
 * - All components include aria-hidden="true" for accessibility
 *
 * @example
 * // Simple usage
 * {loading ? <SkeletonCard hasHeader lines={3} /> : <ActualCard />}
 * {loading ? <SkeletonStats count={4} /> : <StatsGrid />}
 *
 * // Base components for custom skeletons
 * <SkeletonBase width={200} height={20} />
 * <SkeletonText width="100%" size="md" />
 * <SkeletonAvatar size={48} />
 */

// Base primitives
export {
  default as SkeletonBase,
  SkeletonText,
  SkeletonAvatar,
  SkeletonButton,
  SkeletonImage,
} from './SkeletonBase';

// Card skeletons
export {
  default as SkeletonCard,
  SkeletonCardGrid,
  SkeletonStatCard,
  SkeletonExerciseCard,
  SkeletonUserCard,
} from './SkeletonCard';

// Stats skeletons
export {
  default as SkeletonStats,
  SkeletonStatItem,
  SkeletonProgressStats,
  SkeletonDashboard,
  SkeletonLeaderboard,
} from './SkeletonStats';

// List skeletons
export {
  default as SkeletonList,
  SkeletonListItem,
  SkeletonNotificationList,
  SkeletonActivityFeed,
  SkeletonConversationList,
  SkeletonSearchResults,
} from './ListSkeleton';

// Profile skeletons
export {
  default as SkeletonProfile,
  SkeletonProfileHeader,
  SkeletonProfileCard,
  SkeletonUserList,
} from './ProfileSkeleton';

// Workout skeletons
export {
  default as SkeletonWorkout,
  SkeletonExerciseItem,
  SkeletonRestTimer,
  SkeletonSetInput,
  SkeletonWorkoutHistory,
  SkeletonWorkoutPlan,
  SkeletonWorkoutSummary,
} from './WorkoutSkeleton';

// Existing skeletons (legacy compatibility)
export { default as AtlasSkeleton } from './AtlasSkeleton';
export { default as ChartSkeleton } from './ChartSkeleton';
export { default as JourneySkeleton } from './JourneySkeleton';
export { default as CardSkeleton } from './CardSkeleton';
export { default as ListSkeleton } from './ListSkeleton';
export { default as TableSkeleton } from './TableSkeleton';

// Re-export old profile/workout skeletons for backwards compatibility
export { default as ProfileSkeleton } from './ProfileSkeleton';
export { default as WorkoutSkeleton } from './WorkoutSkeleton';
