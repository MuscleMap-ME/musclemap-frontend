/**
 * Empty State Components
 *
 * Provides empty state UI for various scenarios in the app.
 * Each empty state includes an animated illustration, helpful text,
 * and optional action buttons with tips.
 *
 * @example Using preset (simplest approach)
 * import { EmptyState } from '@/components/empty';
 *
 * <EmptyState preset="no-workouts" />
 *
 * @example Custom with illustration string key
 * import { EmptyState } from '@/components/empty';
 *
 * <EmptyState
 *   illustration="workout"
 *   title="Start Your Journey"
 *   description="Log your first workout to begin tracking progress"
 *   action={{ label: "Start Workout", to: "/workout" }}
 *   tips={["Track sets and reps", "See muscle activation in real-time"]}
 * />
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
 * Available types/illustrations:
 * - 'workouts' / 'workout' - Dumbbell with sparkles
 * - 'achievements' / 'achievement' - Trophy outline
 * - 'goals' - Target/bullseye
 * - 'community' - Group of people silhouettes
 * - 'messages' / 'message' - Chat bubbles
 * - 'exercises' - Figure in motion
 * - 'stats' - Chart/graph
 * - 'search' - Magnifying glass with question mark
 * - 'error' - Warning/error symbol
 * - 'data' - Chart with no data points
 * - 'generic' - Empty box with question mark
 *
 * Available presets:
 * - 'no-workouts' - No workouts logged yet
 * - 'no-achievements' - No achievements earned
 * - 'no-messages' - No messages
 * - 'no-results' - Search returned no results
 * - 'empty-feed' - Activity feed is empty
 * - 'error' - Something went wrong
 * - 'no-data' - No data available
 * - 'no-goals' - No goals set
 * - 'no-exercises' - No exercises found
 * - 'no-stats' - No stats available
 * - 'no-notifications' - No notifications
 * - 'no-favorites' - No favorites saved
 * - 'no-history' - No history yet
 * - 'no-crews' - No crews joined
 * - 'no-competitions' - No competitions
 * - 'offline' - User is offline
 * - 'coming-soon' - Feature coming soon
 * - 'maintenance' - Under maintenance
 */

// Main component and variants
export {
  default as EmptyState,
  EmptyStateCard,
  EmptyStatePage,
  EmptyStateInline,
  EMPTY_STATE_TYPES,
} from './EmptyState';

// Presets for common scenarios
export {
  default as EMPTY_STATE_PRESETS,
  getPreset,
  getPresetKeys,
  hasPreset,
} from './presets';

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
  SearchIllustration,
  ErrorIllustration,
  DataIllustration,
  GenericIllustration,
} from './illustrations';
