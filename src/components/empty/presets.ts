/**
 * EmptyState Presets - Pre-configured empty states for common scenarios
 *
 * Each preset defines:
 * - type: Illustration type to use
 * - title: Main heading text
 * - description: Explanatory subtext
 * - action: Optional primary action button config
 * - secondaryAction: Optional secondary action
 * - tips: Optional array of helpful tips
 *
 * Usage:
 * <EmptyState preset="no-workouts" />
 * <EmptyState preset="error" action={{ label: "Retry", onClick: handleRetry }} />
 */

/**
 * Preset configurations for common empty state scenarios
 */
export const EMPTY_STATE_PRESETS = {
  // Workouts
  'no-workouts': {
    type: 'workouts',
    title: 'No Workouts Yet',
    description: 'Your fitness journey starts here. Log your first workout to begin tracking your progress and see your muscles light up.',
    action: {
      label: 'Start Workout',
      to: '/workout',
      variant: 'primary',
    },
    tips: [
      'Track sets, reps, and weight in real-time',
      'See which muscles you activated',
      'Build consistency with streak tracking',
    ],
  },

  // Achievements
  'no-achievements': {
    type: 'achievements',
    title: 'No Achievements Yet',
    description: 'Complete workouts, hit milestones, and crush challenges to unlock achievements and earn credits.',
    action: {
      label: 'View Challenges',
      to: '/challenges',
      variant: 'primary',
    },
    secondaryAction: {
      label: 'Start Workout',
      to: '/workout',
      variant: 'glass',
    },
    tips: [
      'First workout unlocks your first badge',
      'Achievements earn you credits',
      'Some badges are rare and time-limited',
    ],
  },

  // Messages
  'no-messages': {
    type: 'messages',
    title: 'No Messages',
    description: 'Your conversations will appear here. Connect with training partners and share your fitness journey.',
    action: {
      label: 'Find Athletes',
      to: '/discover',
      variant: 'primary',
    },
    tips: [
      'Message workout partners to stay motivated',
      'Share tips and celebrate wins together',
    ],
  },

  // Search results
  'no-results': {
    type: 'search',
    title: 'No Results Found',
    description: 'We could not find anything matching your search. Try different keywords or browse our categories.',
    tips: [
      'Check your spelling',
      'Try more general terms',
      'Use fewer filters',
    ],
  },

  // Community / Feed
  'empty-feed': {
    type: 'community',
    title: 'Your Feed is Empty',
    description: 'Follow athletes, join communities, and complete workouts to see activity here.',
    action: {
      label: 'Discover Athletes',
      to: '/discover',
      variant: 'primary',
    },
    secondaryAction: {
      label: 'Browse Communities',
      to: '/communities',
      variant: 'glass',
    },
    tips: [
      'Follow athletes with similar goals',
      'Join communities to see group activity',
      'Your workouts will show up here too',
    ],
  },

  // Error state
  'error': {
    type: 'error',
    title: 'Something Went Wrong',
    description: 'We encountered an unexpected error. Please try again or contact support if the problem persists.',
    action: {
      label: 'Try Again',
      variant: 'primary',
    },
    tips: [
      'Check your internet connection',
      'Try refreshing the page',
      'Clear your browser cache',
    ],
  },

  // No data / stats
  'no-data': {
    type: 'data',
    title: 'No Data Available',
    description: 'Complete workouts to generate insights and track your progress over time.',
    action: {
      label: 'Log Workout',
      to: '/workout',
      variant: 'primary',
    },
  },

  // Goals
  'no-goals': {
    type: 'goals',
    title: 'No Goals Set',
    description: 'Set fitness goals to stay motivated and track your progress toward success.',
    action: {
      label: 'Create Goal',
      to: '/goals/new',
      variant: 'primary',
    },
    tips: [
      'Start with achievable short-term goals',
      'Break big goals into milestones',
      'Celebrate when you reach them',
    ],
  },

  // Exercises
  'no-exercises': {
    type: 'exercises',
    title: 'No Exercises Found',
    description: 'We could not find exercises matching your criteria. Try adjusting your filters.',
    action: {
      label: 'Browse All Exercises',
      to: '/exercises',
      variant: 'glass',
    },
  },

  // Stats / Analytics
  'no-stats': {
    type: 'stats',
    title: 'No Stats Available',
    description: 'Complete workouts to generate insights about your training performance.',
    action: {
      label: 'Start First Workout',
      to: '/workout',
      variant: 'primary',
    },
  },

  // Notifications
  'no-notifications': {
    type: 'messages',
    title: 'No Notifications',
    description: 'You are all caught up! New notifications will appear here.',
  },

  // Favorites / Saved
  'no-favorites': {
    type: 'generic',
    title: 'No Favorites Yet',
    description: 'Save exercises, workouts, and routines here for quick access.',
    action: {
      label: 'Browse Exercises',
      to: '/exercises',
      variant: 'glass',
    },
    tips: [
      'Tap the heart icon to save favorites',
      'Create custom workout routines',
    ],
  },

  // History
  'no-history': {
    type: 'workouts',
    title: 'No History Yet',
    description: 'Your completed workouts and activities will be logged here.',
    action: {
      label: 'Start Workout',
      to: '/workout',
      variant: 'primary',
    },
  },

  // Crews / Teams
  'no-crews': {
    type: 'community',
    title: 'No Crews Yet',
    description: 'Join or create a crew to train with friends and compete together.',
    action: {
      label: 'Find Crews',
      to: '/crews',
      variant: 'primary',
    },
    secondaryAction: {
      label: 'Create Crew',
      to: '/crews/new',
      variant: 'glass',
    },
  },

  // Competitions
  'no-competitions': {
    type: 'achievements',
    title: 'No Competitions',
    description: 'Join competitions to challenge yourself and earn rewards.',
    action: {
      label: 'Browse Competitions',
      to: '/competitions',
      variant: 'primary',
    },
  },

  // Offline state
  'offline': {
    type: 'error',
    title: 'You\'re Offline',
    description: 'Check your internet connection and try again.',
    tips: [
      'Some features are available offline',
      'Your data will sync when you reconnect',
    ],
  },

  // Coming soon
  'coming-soon': {
    type: 'generic',
    title: 'Coming Soon',
    description: 'This feature is under development. Check back soon!',
  },

  // Maintenance
  'maintenance': {
    type: 'error',
    title: 'Under Maintenance',
    description: 'We are performing scheduled maintenance. Please check back shortly.',
  },

  // Success / Completed
  'success': {
    type: 'success',
    title: 'All Done!',
    description: 'You have successfully completed this task.',
  },

  // Completed workout
  'workout-complete': {
    type: 'success',
    title: 'Workout Complete!',
    description: 'Great job finishing your workout. Your progress has been saved.',
    tips: [
      'Review your stats to see your performance',
      'Share your achievement with friends',
      'Plan your next workout',
    ],
  },

  // Empty leaderboard
  'no-leaderboard': {
    type: 'achievements',
    title: 'Leaderboard Empty',
    description: 'Be the first to climb the ranks! Complete workouts to appear on the leaderboard.',
    action: {
      label: 'Start Workout',
      to: '/workout',
      variant: 'primary',
    },
  },

  // No followers/following
  'no-followers': {
    type: 'community',
    title: 'No Followers Yet',
    description: 'Share your profile to gain followers and grow your fitness community.',
    tips: [
      'Complete workouts to attract followers',
      'Engage with other athletes',
    ],
  },

  // Empty challenges
  'no-challenges': {
    type: 'goals',
    title: 'No Active Challenges',
    description: 'Join or create a challenge to compete with others and push your limits.',
    action: {
      label: 'Browse Challenges',
      to: '/challenges',
      variant: 'primary',
    },
    secondaryAction: {
      label: 'Create Challenge',
      to: '/challenges/new',
      variant: 'glass',
    },
  },
};

/**
 * Get preset configuration by key
 * @param {string} presetKey - The preset identifier
 * @returns {Object|null} The preset configuration or null if not found
 */
export function getPreset(presetKey) {
  return EMPTY_STATE_PRESETS[presetKey] || null;
}

/**
 * Get all available preset keys
 * @returns {string[]} Array of preset keys
 */
export function getPresetKeys() {
  return Object.keys(EMPTY_STATE_PRESETS);
}

/**
 * Check if a preset exists
 * @param {string} presetKey - The preset identifier
 * @returns {boolean} Whether the preset exists
 */
export function hasPreset(presetKey) {
  return presetKey in EMPTY_STATE_PRESETS;
}

export default EMPTY_STATE_PRESETS;
