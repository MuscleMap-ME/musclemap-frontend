/**
 * Feature Definitions for Feature Discovery Component
 *
 * All discoverable features in MuscleMap with their metadata.
 * Used by FeatureDiscovery to show users features they haven't tried yet.
 */

/**
 * Feature categories for grouping and filtering
 */
export const FEATURE_CATEGORIES = {
  TRACKING: 'tracking',
  SOCIAL: 'social',
  COMPETITIVE: 'competitive',
  ECONOMY: 'economy',
  SKILLS: 'skills',
  CAREER: 'career',
  COMMUNITY: 'community',
  AI: 'ai',
  EXTENSIONS: 'extensions',
};

/**
 * All discoverable features
 *
 * Each feature has:
 * - id: Unique identifier (used for localStorage tracking)
 * - name: Display name
 * - description: Short description for the card
 * - icon: Emoji or Lucide icon name
 * - route: Navigation path (used for auto-tracking)
 * - category: Feature category
 * - priority: Higher = shown first (1-10)
 * - isNew: Boolean for "New!" badge
 * - isPopular: Boolean for "Popular!" badge
 * - color: Accent color for the card (optional)
 */
export const DISCOVERABLE_FEATURES = [
  // Core features from spec
  {
    id: 'muscle-map',
    name: 'Muscle Visualization',
    description: "See which muscles you've trained with our interactive body map",
    icon: '💪',
    route: '/stats',
    category: FEATURE_CATEGORIES.TRACKING,
    isNew: false,
    isPopular: true,
    priority: 10,
    color: '#0066FF',
  },
  {
    id: 'crew-battles',
    name: 'Crew Battles',
    description: 'Team up with friends and compete against other crews',
    icon: '⚔️',
    route: '/crews',
    category: FEATURE_CATEGORIES.SOCIAL,
    isNew: true,
    isPopular: false,
    priority: 9,
    color: '#8B5CF6',
  },
  {
    id: 'rivalries',
    name: 'Rivalries',
    description: 'Challenge others to head-to-head battles and track your record',
    icon: '🥊',
    route: '/rivals',
    category: FEATURE_CATEGORIES.COMPETITIVE,
    isNew: false,
    isPopular: true,
    priority: 8,
    color: '#EF4444',
  },
  {
    id: 'competitions',
    name: 'Competitions',
    description: 'Join community-wide challenges and climb the leaderboards',
    icon: '🏆',
    route: '/competitions',
    category: FEATURE_CATEGORIES.COMPETITIVE,
    isNew: false,
    isPopular: true,
    priority: 8,
    color: '#F59E0B',
  },
  {
    id: 'hangouts',
    name: 'Virtual Hangouts',
    description: 'Work out together with friends in real-time virtual sessions',
    icon: '🎮',
    route: '/hangouts',
    category: FEATURE_CATEGORIES.SOCIAL,
    isNew: true,
    isPopular: false,
    priority: 7,
    color: '#10B981',
  },
  {
    id: 'achievements',
    name: 'Achievements',
    description: 'Unlock badges and trophies as you hit fitness milestones',
    icon: '🏅',
    route: '/achievements',
    category: FEATURE_CATEGORIES.TRACKING,
    isNew: false,
    isPopular: true,
    priority: 7,
    color: '#FBBF24',
  },
  {
    id: 'skills',
    name: 'Skill Tree',
    description: 'Level up RPG-style abilities and unlock special powers',
    icon: '⚡',
    route: '/skills',
    category: FEATURE_CATEGORIES.SKILLS,
    isNew: false,
    isPopular: false,
    priority: 6,
    color: '#3B82F6',
  },
  {
    id: 'journey',
    name: 'Your Journey',
    description: 'Follow your personalized fitness path with guided progression',
    icon: '🗺️',
    route: '/journey',
    category: FEATURE_CATEGORIES.TRACKING,
    isNew: false,
    isPopular: false,
    priority: 6,
    color: '#06B6D4',
  },
  {
    id: 'ai-workouts',
    name: 'AI Workouts',
    description: 'Get personalized workout plans tailored to your goals',
    icon: '🤖',
    route: '/prescriptions',
    category: FEATURE_CATEGORIES.AI,
    isNew: true,
    isPopular: true,
    priority: 9,
    color: '#0066FF',
  },
  {
    id: 'exercise-library',
    name: 'Exercise Library',
    description: 'Browse 500+ exercises with video demos and muscle targets',
    icon: '📚',
    route: '/exercises',
    category: FEATURE_CATEGORIES.TRACKING,
    isNew: false,
    isPopular: false,
    priority: 5,
    color: '#64748B',
  },
  {
    id: 'credits',
    name: 'Credit Wallet',
    description: 'Earn credits from workouts and spend them on rewards',
    icon: '💰',
    route: '/wallet',
    category: FEATURE_CATEGORIES.ECONOMY,
    isNew: false,
    isPopular: false,
    priority: 5,
    color: '#22C55E',
  },
  {
    id: 'store',
    name: 'Reward Store',
    description: 'Spend credits on avatar skins, themes, and exclusive items',
    icon: '🛍️',
    route: '/store',
    category: FEATURE_CATEGORIES.ECONOMY,
    isNew: false,
    isPopular: false,
    priority: 4,
    color: '#EC4899',
  },
  {
    id: 'high-fives',
    name: 'High Fives',
    description: 'Send encouragement to friends and celebrate their wins',
    icon: '🙌',
    route: '/high-fives',
    category: FEATURE_CATEGORIES.SOCIAL,
    isNew: false,
    isPopular: false,
    priority: 4,
    color: '#F97316',
  },
  {
    id: 'goals',
    name: 'Goal Setting',
    description: 'Set targets and get personalized recommendations to reach them',
    icon: '🎯',
    route: '/goals',
    category: FEATURE_CATEGORIES.TRACKING,
    isNew: false,
    isPopular: true,
    priority: 8,
    color: '#06B6D4',
  },
  {
    id: 'milestones',
    name: 'Milestones',
    description: 'Track major achievements and celebrate your progress',
    icon: '🚀',
    route: '/milestones',
    category: FEATURE_CATEGORIES.TRACKING,
    isNew: false,
    isPopular: false,
    priority: 5,
    color: '#8B5CF6',
  },
  // Additional features
  {
    id: 'leaderboard',
    name: 'Leaderboard',
    description: 'See where you rank among friends, locally, or globally',
    icon: '📊',
    route: '/leaderboard',
    category: FEATURE_CATEGORIES.COMPETITIVE,
    isNew: false,
    isPopular: true,
    priority: 7,
    color: '#D97706',
  },
  {
    id: 'community-feed',
    name: 'Community Feed',
    description: 'See what others are accomplishing and share your progress',
    icon: '📱',
    route: '/community',
    category: FEATURE_CATEGORIES.COMMUNITY,
    isNew: false,
    isPopular: false,
    priority: 5,
    color: '#8B5CF6',
  },
  {
    id: 'messages',
    name: 'Messages',
    description: 'Chat with workout buddies and crew members',
    icon: '💬',
    route: '/messages',
    category: FEATURE_CATEGORIES.SOCIAL,
    isNew: false,
    isPopular: false,
    priority: 4,
    color: '#0EA5E9',
  },
  {
    id: 'career-readiness',
    name: 'Career Readiness',
    description: 'Prepare for military, police, or firefighter fitness tests',
    icon: '🎖️',
    route: '/career',
    category: FEATURE_CATEGORIES.CAREER,
    isNew: false,
    isPopular: false,
    priority: 6,
    color: '#6366F1',
  },
  {
    id: 'nutrition',
    name: 'Nutrition Tracking',
    description: 'Log meals, track macros, and fuel your gains properly',
    icon: '🥗',
    route: '/nutrition',
    category: FEATURE_CATEGORIES.TRACKING,
    isNew: true,
    isPopular: false,
    priority: 7,
    color: '#22C55E',
  },
];

/**
 * Get features by category
 * @param {string} category - Category from FEATURE_CATEGORIES
 * @returns {Array} Features in that category
 */
export function getFeaturesByCategory(category) {
  return DISCOVERABLE_FEATURES.filter((f) => f.category === category);
}

/**
 * Get features matching multiple categories
 * @param {Array<string>} categories - Array of categories
 * @returns {Array} Features in any of the categories
 */
export function getFeaturesByCategories(categories) {
  return DISCOVERABLE_FEATURES.filter((f) => categories.includes(f.category));
}

/**
 * Get features sorted by priority (highest first)
 * @param {Array} features - Array of features to sort
 * @returns {Array} Sorted features
 */
export function sortByPriority(features) {
  return [...features].sort((a, b) => b.priority - a.priority);
}

/**
 * Get feature by ID
 * @param {string} id - Feature ID
 * @returns {Object|undefined} Feature object or undefined
 */
export function getFeatureById(id) {
  return DISCOVERABLE_FEATURES.find((f) => f.id === id);
}

/**
 * Get only new features
 * @returns {Array} Features marked as new
 */
export function getNewFeatures() {
  return DISCOVERABLE_FEATURES.filter((f) => f.isNew);
}

/**
 * Get only popular features
 * @returns {Array} Features marked as popular
 */
export function getPopularFeatures() {
  return DISCOVERABLE_FEATURES.filter((f) => f.isPopular);
}

export default DISCOVERABLE_FEATURES;
