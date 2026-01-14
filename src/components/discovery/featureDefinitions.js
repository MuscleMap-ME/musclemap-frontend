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
  SOCIAL: 'social',
  COMPETITIVE: 'competitive',
  TRACKING: 'tracking',
  ECONOMY: 'economy',
  SKILLS: 'skills',
  CAREER: 'career',
  COMMUNITY: 'community',
};

/**
 * All discoverable features
 *
 * Each feature has:
 * - id: Unique identifier (used for localStorage tracking)
 * - title: Display name
 * - description: Short description for the card
 * - icon: Icon name from Lucide icons
 * - path: Navigation path
 * - category: Feature category
 * - priority: Higher = shown first (1-10)
 * - requirements: Optional array of required conditions (e.g., ['authenticated'])
 */
export const DISCOVERABLE_FEATURES = [
  // Social Features
  {
    id: 'crews',
    title: 'Crew Battles',
    description: 'Form a crew with friends and battle other teams in weekly challenges. Earn exclusive rewards.',
    icon: 'Users',
    path: '/crews',
    category: FEATURE_CATEGORIES.SOCIAL,
    priority: 9,
    requirements: ['authenticated'],
    color: '#8B5CF6', // Purple
  },
  {
    id: 'rivals',
    title: 'Rivalries',
    description: 'Challenge friends to head-to-head competitions. Track your rivalry record and bragging rights.',
    icon: 'Swords',
    path: '/rivals',
    category: FEATURE_CATEGORIES.COMPETITIVE,
    priority: 8,
    requirements: ['authenticated'],
    color: '#EF4444', // Red
  },
  {
    id: 'competitions',
    title: 'Competitions',
    description: 'Join community-wide competitions. Compete for leaderboard positions and exclusive prizes.',
    icon: 'Trophy',
    path: '/competitions',
    category: FEATURE_CATEGORIES.COMPETITIVE,
    priority: 8,
    requirements: ['authenticated'],
    color: '#F59E0B', // Amber
  },
  {
    id: 'martial-arts',
    title: 'Martial Arts',
    description: 'Track your martial arts journey. Log techniques, belt progression, and sparring sessions.',
    icon: 'Shield',
    path: '/martial-arts',
    category: FEATURE_CATEGORIES.TRACKING,
    priority: 7,
    requirements: ['authenticated'],
    color: '#10B981', // Emerald
  },

  // Skill & Progression
  {
    id: 'skills',
    title: 'Skills Tracking',
    description: 'Master specific exercises and movements. Track your skill levels and unlock advanced techniques.',
    icon: 'Zap',
    path: '/skills',
    category: FEATURE_CATEGORIES.SKILLS,
    priority: 7,
    requirements: ['authenticated'],
    color: '#3B82F6', // Blue
  },
  {
    id: 'pt-tests',
    title: 'PT Tests',
    description: 'Prepare for military, police, or firefighter fitness tests. Track your scores and progress.',
    icon: 'ClipboardCheck',
    path: '/pt-tests',
    category: FEATURE_CATEGORIES.CAREER,
    priority: 6,
    requirements: ['authenticated'],
    color: '#0066FF', // Brand blue
  },
  {
    id: 'career-readiness',
    title: 'Career Readiness',
    description: 'Get ready for physically demanding careers. Track requirements for military, fire, police, and more.',
    icon: 'Briefcase',
    path: '/career',
    category: FEATURE_CATEGORIES.CAREER,
    priority: 6,
    requirements: ['authenticated'],
    color: '#6366F1', // Indigo
  },

  // Locations & Gyms
  {
    id: 'locations',
    title: 'Gym Finder',
    description: 'Find gyms near you. Check-in to locations and see which MuscleMap members work out there.',
    icon: 'MapPin',
    path: '/locations',
    category: FEATURE_CATEGORIES.COMMUNITY,
    priority: 5,
    requirements: ['authenticated'],
    color: '#14B8A6', // Teal
  },

  // Economy
  {
    id: 'wallet',
    title: 'Wallet & Credits',
    description: 'Manage your MuscleMap credits. Earn from workouts, send to friends, unlock premium features.',
    icon: 'Wallet',
    path: '/wallet',
    category: FEATURE_CATEGORIES.ECONOMY,
    priority: 7,
    requirements: ['authenticated'],
    color: '#22C55E', // Green
  },
  {
    id: 'store',
    title: 'Store',
    description: 'Spend your credits on avatar skins, themes, and exclusive items.',
    icon: 'ShoppingBag',
    path: '/store',
    category: FEATURE_CATEGORIES.ECONOMY,
    priority: 5,
    requirements: ['authenticated'],
    color: '#EC4899', // Pink
  },

  // Achievements & Goals
  {
    id: 'achievements',
    title: 'Achievements',
    description: 'Unlock achievements as you progress. Show off your badges and earn bonus credits.',
    icon: 'Award',
    path: '/achievements',
    category: FEATURE_CATEGORIES.TRACKING,
    priority: 8,
    requirements: ['authenticated'],
    color: '#FBBF24', // Yellow
  },
  {
    id: 'goals',
    title: 'Goals',
    description: 'Set fitness goals and track your progress. Get personalized recommendations to reach them faster.',
    icon: 'Target',
    path: '/goals',
    category: FEATURE_CATEGORIES.TRACKING,
    priority: 9,
    requirements: ['authenticated'],
    color: '#06B6D4', // Cyan
  },

  // Community
  {
    id: 'community',
    title: 'Community Feed',
    description: 'See what others are accomplishing. Celebrate victories and share your progress.',
    icon: 'Rss',
    path: '/community',
    category: FEATURE_CATEGORIES.COMMUNITY,
    priority: 6,
    requirements: ['authenticated'],
    color: '#8B5CF6', // Purple
  },
  {
    id: 'messages',
    title: 'Messages',
    description: 'Chat with workout buddies and crew members. Coordinate training sessions.',
    icon: 'MessageCircle',
    path: '/messages',
    category: FEATURE_CATEGORIES.SOCIAL,
    priority: 5,
    requirements: ['authenticated'],
    color: '#0EA5E9', // Sky
  },
  {
    id: 'high-fives',
    title: 'High Fives',
    description: 'Send and receive high fives to celebrate accomplishments. Spread the motivation.',
    icon: 'Hand',
    path: '/high-fives',
    category: FEATURE_CATEGORIES.SOCIAL,
    priority: 4,
    requirements: ['authenticated'],
    color: '#F97316', // Orange
  },

  // Stats & Progress
  {
    id: 'stats',
    title: 'Stats Dashboard',
    description: 'Deep dive into your training statistics. Visualize your progress across all muscle groups.',
    icon: 'BarChart3',
    path: '/stats',
    category: FEATURE_CATEGORIES.TRACKING,
    priority: 7,
    requirements: ['authenticated'],
    color: '#3B82F6', // Blue
  },
  {
    id: 'leaderboard',
    title: 'Leaderboard',
    description: 'See where you rank among other athletes. Filter by friends, local, or global rankings.',
    icon: 'Medal',
    path: '/leaderboard',
    category: FEATURE_CATEGORIES.COMPETITIVE,
    priority: 6,
    requirements: ['authenticated'],
    color: '#D97706', // Amber darker
  },

  // Mentorship
  {
    id: 'trainers',
    title: 'Find a Trainer',
    description: 'Connect with certified trainers for personalized guidance and coaching.',
    icon: 'UserPlus',
    path: '/trainers',
    category: FEATURE_CATEGORIES.COMMUNITY,
    priority: 5,
    requirements: ['authenticated'],
    color: '#7C3AED', // Violet
  },
  {
    id: 'buddy',
    title: 'Workout Buddy',
    description: 'Find workout partners near you. Match based on schedule, goals, and training style.',
    icon: 'HeartHandshake',
    path: '/buddy',
    category: FEATURE_CATEGORIES.SOCIAL,
    priority: 6,
    requirements: ['authenticated'],
    color: '#F43F5E', // Rose
  },

  // Progress & Journey
  {
    id: 'journey',
    title: 'Your Journey',
    description: 'See your fitness journey visualized. Review milestones, patterns, and growth over time.',
    icon: 'Route',
    path: '/journey',
    category: FEATURE_CATEGORIES.TRACKING,
    priority: 7,
    requirements: ['authenticated'],
    color: '#0066FF', // Brand blue
  },
  {
    id: 'progression',
    title: 'Exercise Progression',
    description: 'View your progression on each exercise. See strength curves and predict future PRs.',
    icon: 'TrendingUp',
    path: '/progression',
    category: FEATURE_CATEGORIES.TRACKING,
    priority: 6,
    requirements: ['authenticated'],
    color: '#10B981', // Emerald
  },
];

/**
 * Get features by category
 * @param {string} category - Category from FEATURE_CATEGORIES
 * @returns {Array} Features in that category
 */
export function getFeaturesByCategory(category) {
  return DISCOVERABLE_FEATURES.filter(f => f.category === category);
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
  return DISCOVERABLE_FEATURES.find(f => f.id === id);
}

export default DISCOVERABLE_FEATURES;
