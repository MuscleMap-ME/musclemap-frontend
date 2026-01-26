/**
 * Skeleton Components
 *
 * Enhanced loading state skeletons with shimmer animation effects.
 * Use these instead of showing blank screens during data loading.
 *
 * Features:
 * - Smooth left-to-right shimmer wave animation
 * - Multiple animation types: shimmer, wave, pulse, none
 * - Respects prefers-reduced-motion (static gray if reduced motion)
 * - Uses CSS variables from tokens.css for consistent styling
 * - All components include aria-hidden="true" for accessibility
 *
 * @example
 * // Base skeleton with new API
 * <Skeleton variant="text" width="60%" />
 * <Skeleton variant="circular" width={48} height={48} />
 * <Skeleton variant="rectangular" width={200} height={100} />
 * <Skeleton variant="rounded" width={200} height={100} />
 *
 * // Animation types
 * <Skeleton animation="shimmer" width={200} height={20} />
 * <Skeleton animation="pulse" width={200} height={20} />
 * <Skeleton animation="wave" width={200} height={20} />
 * <Skeleton animation="none" width={200} height={20} />
 *
 * // Specialized skeletons
 * <CardSkeleton />
 * <StatSkeleton count={4} />
 * <ListSkeleton rows={5} />
 * <ProfileSkeleton showBio showStats />
 *
 * // Legacy API (still supported)
 * <SkeletonBase width={200} height={20} />
 * <SkeletonText width="100%" size="md" />
 * <SkeletonAvatar size={48} />
 */

// Base primitives - new API
export { Skeleton } from './SkeletonBase';

// Base primitives - legacy API (still supported)
export {
  default as SkeletonBase,
  SkeletonText,
  SkeletonAvatar,
  SkeletonButton,
  SkeletonImage,
  SkeletonIcon,
  SkeletonBadge,
  SkeletonParagraph,
} from './SkeletonBase';

// Card skeletons
export {
  default as CardSkeleton,
  CardSkeletonGrid,
  StatSkeleton,
} from './CardSkeleton';

// Enhanced card exports from SkeletonCard.jsx
export {
  SkeletonCardGrid,
  SkeletonStatCard,
  SkeletonExerciseCard,
  SkeletonUserCard,
  SkeletonFeatureCard,
  SkeletonMiniCard,
} from './SkeletonCard';

// For legacy compatibility - alias SkeletonCard as well
export { default as SkeletonCard } from './CardSkeleton';

// Stats skeletons
export {
  default as SkeletonStats,
  SkeletonStatItem,
  SkeletonProgressStats,
  SkeletonDashboard,
  SkeletonLeaderboard,
  SkeletonCharacterStats,
  SkeletonMetricRow,
  SkeletonComparisonCard,
} from './SkeletonStats';

// List skeletons
export {
  default as ListSkeleton,
  SkeletonListItem,
  SkeletonNotificationList,
  SkeletonActivityFeed,
  SkeletonConversationList,
  SkeletonSearchResults,
  SkeletonMenuList,
  SkeletonCommentList,
  SkeletonGridList,
} from './ListSkeleton';

// For legacy compatibility - alias SkeletonList as well
export { default as SkeletonList } from './ListSkeleton';

// Profile skeletons
export {
  default as ProfileSkeleton,
  SkeletonProfileHeader,
  SkeletonProfileCard,
  SkeletonUserList,
  SkeletonFollowerCard,
  SkeletonProfileBanner,
  SkeletonCrewCard,
  SkeletonWealthIndicator,
} from './ProfileSkeleton';

// For legacy compatibility
export { default as SkeletonProfile } from './ProfileSkeleton';

// Workout skeletons
export {
  default as WorkoutSkeleton,
  SkeletonExerciseItem,
  SkeletonRestTimer,
  SkeletonSetInput,
  SkeletonWorkoutHistory,
  SkeletonWorkoutPlan,
  SkeletonWorkoutSummary,
  SkeletonMuscleIndicator,
} from './WorkoutSkeleton';

// For legacy compatibility
export { default as SkeletonWorkout } from './WorkoutSkeleton';

// Chart skeletons
export {
  default as ChartSkeleton,
  SkeletonChartCard,
  SkeletonSparkline,
} from './ChartSkeleton';

// Other specialized skeletons
export { default as AtlasSkeleton } from './AtlasSkeleton';
export { default as JourneySkeleton } from './JourneySkeleton';
export { default as TableSkeleton } from './TableSkeleton';
