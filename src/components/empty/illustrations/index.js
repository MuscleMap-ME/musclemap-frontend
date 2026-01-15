/**
 * EmptyState Illustrations
 *
 * Minimal SVG illustrations for empty states with subtle animations.
 * All illustrations:
 * - Use ~200x150px viewBox
 * - Use CSS variables for easy theming
 * - Have subtle float/pulse/sparkle animations
 * - Match MuscleMap's liquid glass / bioluminescent aesthetic
 *
 * @example Individual usage
 * import { WorkoutIllustration } from '@/components/empty/illustrations';
 *
 * <WorkoutIllustration />
 *
 * @example Get by type key
 * import { getIllustration, ILLUSTRATIONS } from '@/components/empty/illustrations';
 *
 * const IllustrationComponent = ILLUSTRATIONS['workout'];
 * // or
 * const illustration = getIllustration('workout');
 */

import React from 'react';

// Individual illustration components
export { WorkoutIllustration } from './WorkoutIllustration';
export { AchievementIllustration } from './AchievementIllustration';
export { CommunityIllustration } from './CommunityIllustration';
export { StatsIllustration } from './StatsIllustration';
export { GoalsIllustration } from './GoalsIllustration';
export { MessagesIllustration } from './MessagesIllustration';
export { SearchIllustration } from './SearchIllustration';
export { ErrorIllustration } from './ErrorIllustration';
export { SuccessIllustration } from './SuccessIllustration';
export { GenericIllustration } from './GenericIllustration';
export { ExercisesIllustration } from './ExercisesIllustration';
export { DataIllustration } from './DataIllustration';

// Shared utilities
export { IllustrationWrapper, Float, Pulse, Sparkle, Rotate, Fade, Bounce } from './shared';

// Import for mapping
import { WorkoutIllustration } from './WorkoutIllustration';
import { AchievementIllustration } from './AchievementIllustration';
import { CommunityIllustration } from './CommunityIllustration';
import { StatsIllustration } from './StatsIllustration';
import { GoalsIllustration } from './GoalsIllustration';
import { MessagesIllustration } from './MessagesIllustration';
import { SearchIllustration } from './SearchIllustration';
import { ErrorIllustration } from './ErrorIllustration';
import { SuccessIllustration } from './SuccessIllustration';
import { GenericIllustration } from './GenericIllustration';
import { ExercisesIllustration } from './ExercisesIllustration';
import { DataIllustration } from './DataIllustration';

/**
 * Map of illustration type keys to components
 * Supports multiple aliases for convenience
 */
export const ILLUSTRATIONS = {
  // Workout variations
  workout: WorkoutIllustration,
  workouts: WorkoutIllustration,
  history: WorkoutIllustration,

  // Achievement variations
  achievement: AchievementIllustration,
  achievements: AchievementIllustration,
  trophy: AchievementIllustration,
  competition: AchievementIllustration,
  competitions: AchievementIllustration,

  // Community variations
  community: CommunityIllustration,
  friends: CommunityIllustration,
  crew: CommunityIllustration,
  crews: CommunityIllustration,
  feed: CommunityIllustration,

  // Stats variations
  stats: StatsIllustration,
  chart: StatsIllustration,
  analytics: StatsIllustration,

  // Goals variations
  goals: GoalsIllustration,
  goal: GoalsIllustration,
  target: GoalsIllustration,

  // Messages variations
  messages: MessagesIllustration,
  message: MessagesIllustration,
  chat: MessagesIllustration,
  notifications: MessagesIllustration,

  // Search variations
  search: SearchIllustration,
  results: SearchIllustration,

  // Error variations
  error: ErrorIllustration,
  warning: ErrorIllustration,
  offline: ErrorIllustration,
  maintenance: ErrorIllustration,

  // Success variations
  success: SuccessIllustration,
  completed: SuccessIllustration,
  done: SuccessIllustration,
  check: SuccessIllustration,

  // Generic variations
  generic: GenericIllustration,
  empty: GenericIllustration,
  default: GenericIllustration,
  'coming-soon': GenericIllustration,
  favorites: GenericIllustration,

  // Exercises variations
  exercises: ExercisesIllustration,
  exercise: ExercisesIllustration,

  // Data variations
  data: DataIllustration,
  'no-data': DataIllustration,
};

/**
 * Get illustration component by type key
 *
 * @param {string} type - The illustration type key
 * @returns {React.Component} The illustration component
 */
export function getIllustration(type) {
  const IllustrationComponent = ILLUSTRATIONS[type] || GenericIllustration;
  return <IllustrationComponent />;
}

/**
 * Check if an illustration type exists
 *
 * @param {string} type - The illustration type key
 * @returns {boolean} Whether the type exists
 */
export function hasIllustration(type) {
  return type in ILLUSTRATIONS;
}

/**
 * Get all available illustration type keys
 *
 * @returns {string[]} Array of type keys
 */
export function getIllustrationKeys() {
  return Object.keys(ILLUSTRATIONS);
}

export default ILLUSTRATIONS;
