/**
 * Skeleton Components
 *
 * Reusable loading state skeletons for various UI patterns.
 * Use these instead of showing blank screens during data loading.
 */

export { default as AtlasSkeleton } from './AtlasSkeleton';
export { default as ChartSkeleton } from './ChartSkeleton';
export { default as ProfileSkeleton } from './ProfileSkeleton';
export { default as JourneySkeleton } from './JourneySkeleton';
export { default as WorkoutSkeleton } from './WorkoutSkeleton';
export { default as CardSkeleton } from './CardSkeleton';
export { default as ListSkeleton } from './ListSkeleton';
export { default as TableSkeleton } from './TableSkeleton';

// Base skeleton pulse animation
export const pulseAnimation = `
  @keyframes skeleton-pulse {
    0%, 100% { opacity: 0.4; }
    50% { opacity: 0.8; }
  }
`;
