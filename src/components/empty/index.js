/**
 * Empty State Components
 *
 * Provides empty state UI for various scenarios in the app.
 * Each empty state includes an animated illustration, helpful text,
 * and optional action buttons with tips.
 *
 * @example Basic usage with type
 * import { EmptyState } from '@/components/empty';
 *
 * <EmptyState
 *   type="workouts"
 *   title="No Workouts Yet"
 *   description="This is where your training history will appear."
 *   action={{ label: "Start First Workout", to: "/workout" }}
 *   tips={["Log sets during your workout", "Track progress over time"]}
 * />
 *
 * @example With custom illustration
 * import { EmptyState } from '@/components/empty';
 *
 * <EmptyState
 *   type="generic"
 *   title="Nothing Here"
 *   description="Check back later!"
 *   illustration={<CustomIllustration />}
 * />
 *
 * @example Card variant
 * import { EmptyStateCard } from '@/components/empty';
 *
 * <EmptyStateCard
 *   type="achievements"
 *   action={{ label: "View Challenges", to: "/challenges" }}
 * />
 *
 * @example Full page empty state
 * import { EmptyStatePage } from '@/components/empty';
 *
 * <EmptyStatePage
 *   type="community"
 *   action={{ label: "Find Friends", to: "/discover" }}
 *   secondaryAction={{ label: "Browse Leaderboard", to: "/leaderboard" }}
 * />
 *
 * Available types:
 * - 'workouts' - Dumbbell with sparkles
 * - 'achievements' - Trophy outline
 * - 'goals' - Target/bullseye
 * - 'community' - Group of people silhouettes
 * - 'messages' - Chat bubbles
 * - 'exercises' - Figure in motion
 * - 'stats' - Chart/graph
 * - 'generic' - Empty box with question mark
 */

// Main component and variants
export {
  default as EmptyState,
  EmptyStateCard,
  EmptyStatePage,
  EmptyStateInline,
  EMPTY_STATE_TYPES,
} from './EmptyState';

// Illustrations (for custom composition)
export {
  default as EMPTY_STATE_ILLUSTRATIONS,
  getIllustrationByType,
  WorkoutsIllustration,
  AchievementsIllustration,
  GoalsIllustration,
  CommunityIllustration,
  MessagesIllustration,
  ExercisesIllustration,
  StatsIllustration,
  GenericIllustration,
} from './illustrations';
