/**
 * Command Actions - Predefined actions for the CommandPalette
 *
 * This file defines all the default commands available in the command palette,
 * organized by category. These are automatically registered when the module loads.
 *
 * Categories:
 * - Navigation: Routes to app pages (Dashboard, Workout, Exercises, etc.)
 * - Quick Actions: Immediate actions (Start Workout, Log Set, View Achievements)
 * - Settings: App configuration (Toggle theme, Change language)
 * - Help: Documentation and support (View docs, Report bug, Give feedback)
 * - Community: Social features (Crews, Rivals, Messages)
 * - Exercises: Exercise library (dynamic, loaded from API)
 */

import { CATEGORIES } from './commandRegistry';

// ============================================
// NAVIGATION ACTIONS
// ============================================

/**
 * Navigation commands - Routes to main app pages
 */
export const NAVIGATION_ACTIONS = [
  {
    id: 'nav-dashboard',
    title: 'Dashboard',
    description: 'Your fitness overview and daily summary',
    path: '/dashboard',
    icon: 'LayoutDashboard',
    category: CATEGORIES.PAGES,
    keywords: ['home', 'overview', 'main', 'summary'],
    shortcut: 'G D',
  },
  {
    id: 'nav-workout',
    title: 'Workout',
    description: 'Start or continue a workout session',
    path: '/workout',
    icon: 'Dumbbell',
    category: CATEGORIES.PAGES,
    keywords: ['exercise', 'training', 'gym', 'lift', 'session'],
    shortcut: 'G W',
  },
  {
    id: 'nav-exercises',
    title: 'Exercises',
    description: 'Browse the exercise library',
    path: '/exercises',
    icon: 'Activity',
    category: CATEGORIES.PAGES,
    keywords: ['movements', 'library', 'database', 'catalog'],
    shortcut: 'G E',
  },
  {
    id: 'nav-journey',
    title: 'Journey',
    description: 'Your fitness journey and progress timeline',
    path: '/journey',
    icon: 'Map',
    category: CATEGORIES.PAGES,
    keywords: ['progress', 'path', 'timeline', 'history', 'story'],
  },
  {
    id: 'nav-stats',
    title: 'Stats',
    description: 'View detailed statistics and analytics',
    path: '/stats',
    icon: 'BarChart3',
    category: CATEGORIES.PAGES,
    keywords: ['analytics', 'charts', 'data', 'numbers', 'metrics'],
    shortcut: 'G S',
  },
  {
    id: 'nav-progression',
    title: 'Progression',
    description: 'Track your strength and fitness gains',
    path: '/progression',
    icon: 'TrendingUp',
    category: CATEGORIES.PAGES,
    keywords: ['gains', 'improvement', 'growth', 'strength'],
  },
  {
    id: 'nav-goals',
    title: 'Goals',
    description: 'Set and manage your fitness goals',
    path: '/goals',
    icon: 'Target',
    category: CATEGORIES.PAGES,
    keywords: ['objectives', 'targets', 'milestones', 'aims'],
    shortcut: 'G G',
  },
  {
    id: 'nav-profile',
    title: 'Profile',
    description: 'View and edit your profile',
    path: '/profile',
    icon: 'User',
    category: CATEGORIES.PAGES,
    keywords: ['account', 'me', 'personal', 'info'],
    shortcut: 'G P',
  },
  {
    id: 'nav-achievements',
    title: 'Achievements',
    description: 'View earned badges and accomplishments',
    path: '/achievements',
    icon: 'Trophy',
    category: CATEGORIES.PAGES,
    keywords: ['badges', 'awards', 'accomplishments', 'rewards', 'trophies'],
  },
  {
    id: 'nav-credits',
    title: 'Credits',
    description: 'Manage your credit balance',
    path: '/credits',
    icon: 'Coins',
    category: CATEGORIES.PAGES,
    keywords: ['points', 'currency', 'balance', 'money', 'coins'],
  },
  {
    id: 'nav-wellness',
    title: 'Wellness',
    description: 'Wellness metrics and health tracking',
    path: '/wellness',
    icon: 'Heart',
    category: CATEGORIES.PAGES,
    keywords: ['health', 'vitals', 'body', 'metrics'],
  },
  {
    id: 'nav-nutrition',
    title: 'Nutrition',
    description: 'Track food, macros, and diet',
    path: '/nutrition',
    icon: 'Apple',
    category: CATEGORIES.PAGES,
    keywords: ['food', 'diet', 'macros', 'calories', 'eating', 'meals'],
  },
  {
    id: 'nav-skills',
    title: 'Skills',
    description: 'View and unlock skill trees',
    path: '/skills',
    icon: 'Sparkles',
    category: CATEGORIES.PAGES,
    keywords: ['abilities', 'talents', 'tree', 'unlock'],
  },
  {
    id: 'nav-career',
    title: 'Career Readiness',
    description: 'PT tests and career fitness standards',
    path: '/career',
    icon: 'Shield',
    category: CATEGORIES.PAGES,
    keywords: ['pt', 'test', 'military', 'police', 'firefighter', 'fitness test'],
  },
  {
    id: 'nav-martial-arts',
    title: 'Martial Arts',
    description: 'Martial arts disciplines and training',
    path: '/martial-arts',
    icon: 'Swords',
    category: CATEGORIES.PAGES,
    keywords: ['fighting', 'combat', 'mma', 'boxing', 'jiu-jitsu', 'karate'],
  },
  {
    id: 'nav-wallet',
    title: 'Wallet',
    description: 'Manage payments and transactions',
    path: '/wallet',
    icon: 'Wallet',
    category: CATEGORIES.PAGES,
    keywords: ['money', 'payment', 'transactions', 'billing'],
  },
  {
    id: 'nav-skins',
    title: 'Skins Store',
    description: 'Customize your avatar and profile',
    path: '/skins',
    icon: 'Palette',
    category: CATEGORIES.PAGES,
    keywords: ['customize', 'avatar', 'theme', 'appearance', 'cosmetics'],
  },
];

// ============================================
// QUICK ACTIONS
// ============================================

/**
 * Quick action commands - Immediate actions
 */
export const QUICK_ACTIONS = [
  {
    id: 'action-start-workout',
    title: 'Start Workout',
    description: 'Begin a new workout session now',
    path: '/workout?action=start',
    icon: 'Play',
    category: CATEGORIES.ACTIONS,
    keywords: ['begin', 'new', 'exercise', 'train', 'start'],
    shortcut: 'S W',
  },
  {
    id: 'action-quick-log',
    title: 'Quick Log Set',
    description: 'Quickly log a set for any exercise',
    path: '/workout?action=quick-log',
    icon: 'Plus',
    category: CATEGORIES.ACTIONS,
    keywords: ['log', 'add', 'set', 'record', 'quick'],
    shortcut: 'L S',
  },
  {
    id: 'action-view-achievements',
    title: 'View Achievements',
    description: 'See your latest achievements and badges',
    path: '/achievements',
    icon: 'Trophy',
    category: CATEGORIES.ACTIONS,
    keywords: ['badges', 'awards', 'accomplishments', 'see'],
  },
  {
    id: 'action-log-food',
    title: 'Log Food',
    description: 'Quick log a meal or snack',
    path: '/nutrition?action=log',
    icon: 'Apple',
    category: CATEGORIES.ACTIONS,
    keywords: ['meal', 'eat', 'add', 'track', 'food'],
    shortcut: 'L F',
  },
  {
    id: 'action-send-highfive',
    title: 'Send High Five',
    description: 'Encourage a friend with a high five',
    path: '/highfives?action=send',
    icon: 'Hand',
    category: CATEGORIES.ACTIONS,
    keywords: ['kudos', 'support', 'cheer', 'encourage'],
  },
  {
    id: 'action-view-progress',
    title: 'View Progress',
    description: 'See your fitness gains and improvements',
    path: '/progression',
    icon: 'TrendingUp',
    category: CATEGORIES.ACTIONS,
    keywords: ['gains', 'growth', 'improvement', 'chart'],
  },
  {
    id: 'action-check-schedule',
    title: 'Check Schedule',
    description: 'View your upcoming workout schedule',
    path: '/journey?tab=schedule',
    icon: 'Calendar',
    category: CATEGORIES.ACTIONS,
    keywords: ['plan', 'calendar', 'upcoming', 'next'],
  },
  {
    id: 'action-find-gym',
    title: 'Find Gym',
    description: 'Locate nearby gyms and fitness centers',
    path: '/locations',
    icon: 'MapPin',
    category: CATEGORIES.ACTIONS,
    keywords: ['location', 'nearby', 'fitness center', 'map'],
  },
  {
    id: 'action-join-competition',
    title: 'Join Competition',
    description: 'Browse and join active challenges',
    path: '/competitions',
    icon: 'Trophy',
    category: CATEGORIES.ACTIONS,
    keywords: ['challenge', 'contest', 'compete', 'join'],
  },
  {
    id: 'action-create-goal',
    title: 'Create Goal',
    description: 'Set a new fitness goal',
    path: '/goals?action=create',
    icon: 'Target',
    category: CATEGORIES.ACTIONS,
    keywords: ['new', 'add', 'objective', 'set goal'],
  },
  {
    id: 'action-rest-timer',
    title: 'Start Rest Timer',
    description: 'Start a rest timer between sets',
    icon: 'Clock',
    category: CATEGORIES.ACTIONS,
    keywords: ['timer', 'rest', 'break', 'countdown'],
    action: () => {
      // Dispatch custom event for rest timer
      window.dispatchEvent(new CustomEvent('musclemap:rest-timer-start'));
    },
  },
  {
    id: 'action-take-progress-photo',
    title: 'Take Progress Photo',
    description: 'Capture a progress photo',
    path: '/profile?action=photo',
    icon: 'Camera',
    category: CATEGORIES.ACTIONS,
    keywords: ['photo', 'picture', 'selfie', 'progress'],
  },
];

// ============================================
// SETTINGS ACTIONS
// ============================================

/**
 * Settings commands - App configuration
 */
export const SETTINGS_ACTIONS = [
  {
    id: 'settings-main',
    title: 'Settings',
    description: 'App settings and preferences',
    path: '/settings',
    icon: 'Settings',
    category: CATEGORIES.SETTINGS,
    keywords: ['preferences', 'options', 'config', 'configure'],
    shortcut: 'G ,',
  },
  {
    id: 'settings-toggle-theme',
    title: 'Toggle Dark/Light Mode',
    description: 'Switch between dark and light theme',
    icon: 'Moon',
    category: CATEGORIES.SETTINGS,
    keywords: ['dark', 'light', 'mode', 'theme', 'appearance'],
    action: () => {
      window.dispatchEvent(new CustomEvent('musclemap:toggle-theme'));
    },
  },
  {
    id: 'settings-change-language',
    title: 'Change Language',
    description: 'Select your preferred language',
    path: '/settings?tab=language',
    icon: 'Globe',
    category: CATEGORIES.SETTINGS,
    keywords: ['language', 'locale', 'translation', 'i18n'],
  },
  {
    id: 'settings-profile',
    title: 'Edit Profile',
    description: 'Update your profile information',
    path: '/settings?tab=profile',
    icon: 'User',
    category: CATEGORIES.SETTINGS,
    keywords: ['account', 'personal', 'info', 'edit'],
  },
  {
    id: 'settings-notifications',
    title: 'Notifications',
    description: 'Manage notification preferences',
    path: '/settings?tab=notifications',
    icon: 'Bell',
    category: CATEGORIES.SETTINGS,
    keywords: ['alerts', 'push', 'email', 'notify'],
  },
  {
    id: 'settings-privacy',
    title: 'Privacy Settings',
    description: 'Control your privacy and data sharing',
    path: '/settings?tab=privacy',
    icon: 'Shield',
    category: CATEGORIES.SETTINGS,
    keywords: ['security', 'data', 'visibility', 'private'],
  },
  {
    id: 'settings-units',
    title: 'Units & Measurements',
    description: 'Change weight and distance units',
    path: '/settings?tab=units',
    icon: 'Ruler',
    category: CATEGORIES.SETTINGS,
    keywords: ['kg', 'lbs', 'metric', 'imperial', 'pounds', 'kilograms'],
  },
  {
    id: 'settings-account',
    title: 'Account Settings',
    description: 'Manage your account and subscription',
    path: '/settings?tab=account',
    icon: 'UserCog',
    category: CATEGORIES.SETTINGS,
    keywords: ['subscription', 'billing', 'delete', 'export'],
  },
  {
    id: 'settings-plugins',
    title: 'Plugin Settings',
    description: 'Manage installed plugins',
    path: '/plugins/settings',
    icon: 'Puzzle',
    category: CATEGORIES.SETTINGS,
    keywords: ['extensions', 'addons', 'plugins', 'integrations'],
  },
];

// ============================================
// COMMUNITY ACTIONS
// ============================================

/**
 * Community commands - Social features
 */
export const COMMUNITY_ACTIONS = [
  {
    id: 'community-dashboard',
    title: 'Community',
    description: 'Connect with other fitness enthusiasts',
    path: '/community',
    icon: 'Users',
    category: CATEGORIES.COMMUNITY,
    keywords: ['social', 'friends', 'people', 'network'],
    shortcut: 'G C',
  },
  {
    id: 'community-competitions',
    title: 'Competitions',
    description: 'Join fitness challenges and compete',
    path: '/competitions',
    icon: 'Trophy',
    category: CATEGORIES.COMMUNITY,
    keywords: ['challenges', 'contests', 'compete', 'leaderboard'],
  },
  {
    id: 'community-crews',
    title: 'Crews',
    description: 'Manage your workout crews and teams',
    path: '/crews',
    icon: 'Users',
    category: CATEGORIES.COMMUNITY,
    keywords: ['teams', 'groups', 'squad', 'friends'],
  },
  {
    id: 'community-rivals',
    title: 'Rivals',
    description: 'View and challenge your rivals',
    path: '/rivals',
    icon: 'Swords',
    category: CATEGORIES.COMMUNITY,
    keywords: ['opponents', 'competition', 'versus', 'challenge'],
  },
  {
    id: 'community-highfives',
    title: 'High Fives',
    description: 'Send and receive encouragement',
    path: '/highfives',
    icon: 'Hand',
    category: CATEGORIES.COMMUNITY,
    keywords: ['kudos', 'support', 'encourage', 'clap'],
  },
  {
    id: 'community-messages',
    title: 'Messages',
    description: 'Your conversations and chat',
    path: '/messages',
    icon: 'MessageCircle',
    category: CATEGORIES.COMMUNITY,
    keywords: ['chat', 'inbox', 'dms', 'conversations'],
    shortcut: 'G M',
  },
  {
    id: 'community-trainers',
    title: 'Trainers',
    description: 'Find personal trainers and coaches',
    path: '/trainers',
    icon: 'UserCheck',
    category: CATEGORIES.COMMUNITY,
    keywords: ['coaches', 'mentors', 'professionals', 'coaching'],
  },
  {
    id: 'community-live',
    title: 'Live Activity',
    description: 'View real-time community activity',
    path: '/live',
    icon: 'Radio',
    category: CATEGORIES.COMMUNITY,
    keywords: ['realtime', 'live', 'activity', 'now'],
  },
  {
    id: 'community-bulletin',
    title: 'Bulletin Board',
    description: 'Community announcements and posts',
    path: '/community/bulletin',
    icon: 'Newspaper',
    category: CATEGORIES.COMMUNITY,
    keywords: ['announcements', 'posts', 'news', 'updates'],
  },
];

// ============================================
// HELP ACTIONS
// ============================================

/**
 * Help commands - Documentation and support
 * Using 'Pages' category as there's no dedicated Help category
 */
export const HELP_ACTIONS = [
  {
    id: 'help-docs',
    title: 'View Documentation',
    description: 'Read the MuscleMap documentation',
    path: '/docs',
    icon: 'BookOpen',
    category: CATEGORIES.PAGES,
    keywords: ['help', 'guide', 'manual', 'documentation', 'how to'],
    shortcut: '?',
  },
  {
    id: 'help-plugin-guide',
    title: 'Plugin Developer Guide',
    description: 'Learn how to build plugins',
    path: '/docs/plugins',
    icon: 'Code',
    category: CATEGORIES.PAGES,
    keywords: ['developer', 'api', 'plugin', 'extension', 'sdk'],
  },
  {
    id: 'help-report-bug',
    title: 'Report Bug',
    description: 'Report an issue or bug',
    path: '/issues/new?type=bug',
    icon: 'Bug',
    category: CATEGORIES.PAGES,
    keywords: ['bug', 'issue', 'problem', 'error', 'report'],
  },
  {
    id: 'help-feature-request',
    title: 'Request Feature',
    description: 'Suggest a new feature',
    path: '/issues/new?type=feature',
    icon: 'Lightbulb',
    category: CATEGORIES.PAGES,
    keywords: ['feature', 'request', 'suggestion', 'idea', 'improvement'],
  },
  {
    id: 'help-feedback',
    title: 'Give Feedback',
    description: 'Share your feedback with us',
    path: '/contribute',
    icon: 'MessageSquare',
    category: CATEGORIES.PAGES,
    keywords: ['feedback', 'suggestion', 'opinion', 'review'],
  },
  {
    id: 'help-roadmap',
    title: 'View Roadmap',
    description: 'See what features are coming next',
    path: '/roadmap',
    icon: 'Map',
    category: CATEGORIES.PAGES,
    keywords: ['roadmap', 'upcoming', 'future', 'planned', 'features'],
  },
  {
    id: 'help-updates',
    title: 'Dev Updates',
    description: 'Latest development updates and changes',
    path: '/updates',
    icon: 'Newspaper',
    category: CATEGORIES.PAGES,
    keywords: ['updates', 'changelog', 'news', 'releases', 'whats new'],
  },
  {
    id: 'help-privacy-policy',
    title: 'Privacy Policy',
    description: 'Read our privacy policy',
    path: '/privacy',
    icon: 'Shield',
    category: CATEGORIES.PAGES,
    keywords: ['privacy', 'policy', 'data', 'legal'],
  },
];

// ============================================
// ALL DEFAULT ACTIONS
// ============================================

/**
 * All default actions combined
 */
export const DEFAULT_ACTIONS = [
  ...NAVIGATION_ACTIONS,
  ...QUICK_ACTIONS,
  ...SETTINGS_ACTIONS,
  ...COMMUNITY_ACTIONS,
  ...HELP_ACTIONS,
];

// ============================================
// ACTION CREATORS
// ============================================

/**
 * Create a navigation action
 *
 * @param {Object} config - Action configuration
 * @param {string} config.id - Unique identifier
 * @param {string} config.title - Display title
 * @param {string} config.path - Navigation path
 * @param {string} [config.description] - Description text
 * @param {string} [config.icon] - Lucide icon name
 * @param {string[]} [config.keywords] - Search keywords
 * @param {string} [config.shortcut] - Keyboard shortcut hint
 * @returns {Object} Navigation action object
 */
export function createNavigationAction(config) {
  return {
    category: CATEGORIES.PAGES,
    keywords: [],
    ...config,
  };
}

/**
 * Create a quick action
 *
 * @param {Object} config - Action configuration
 * @param {string} config.id - Unique identifier
 * @param {string} config.title - Display title
 * @param {Function} config.action - Action function to execute
 * @param {string} [config.description] - Description text
 * @param {string} [config.icon] - Lucide icon name
 * @param {string[]} [config.keywords] - Search keywords
 * @returns {Object} Quick action object
 */
export function createQuickAction(config) {
  return {
    category: CATEGORIES.ACTIONS,
    keywords: [],
    ...config,
  };
}

/**
 * Create a settings action
 *
 * @param {Object} config - Action configuration
 * @returns {Object} Settings action object
 */
export function createSettingsAction(config) {
  return {
    category: CATEGORIES.SETTINGS,
    keywords: [],
    ...config,
  };
}

/**
 * Create a community action
 *
 * @param {Object} config - Action configuration
 * @returns {Object} Community action object
 */
export function createCommunityAction(config) {
  return {
    category: CATEGORIES.COMMUNITY,
    keywords: [],
    ...config,
  };
}

// ============================================
// DYNAMIC ACTION LOADERS
// ============================================

/**
 * Load exercises from API as searchable actions
 * This should be called after authentication to populate exercise search
 *
 * @param {Function} fetchExercises - Function that returns exercises from API
 * @returns {Promise<Object[]>} Array of exercise actions
 */
export async function loadExerciseActions(fetchExercises) {
  try {
    const exercises = await fetchExercises();

    return exercises.map((exercise) => ({
      id: `exercise-${exercise.id}`,
      title: exercise.name,
      description: exercise.primary_muscles?.join(', ') || exercise.muscle_group,
      path: `/exercises?id=${exercise.id}`,
      icon: 'Dumbbell',
      category: CATEGORIES.EXERCISES,
      keywords: [
        exercise.muscle_group,
        exercise.equipment,
        ...(exercise.secondary_muscles || []),
        ...(exercise.tags || []),
      ].filter(Boolean),
      data: exercise,
    }));
  } catch (error) {
    console.error('Failed to load exercise actions:', error);
    return [];
  }
}

/**
 * Load user search results as actions
 * This enables searching for other users in the command palette
 *
 * @param {Function} searchUsers - Function that searches users
 * @param {string} query - Search query
 * @returns {Promise<Object[]>} Array of user actions
 */
export async function loadUserActions(searchUsers, query) {
  if (!query || query.length < 2) return [];

  try {
    const users = await searchUsers(query);

    return users.map((user) => ({
      id: `user-${user.id}`,
      title: user.username,
      description: user.display_name || user.archetype,
      path: `/profile/${user.username}`,
      icon: 'User',
      category: CATEGORIES.COMMUNITY,
      keywords: [user.archetype, user.display_name].filter(Boolean),
      data: user,
    }));
  } catch (error) {
    console.error('Failed to load user actions:', error);
    return [];
  }
}

export default {
  NAVIGATION_ACTIONS,
  QUICK_ACTIONS,
  SETTINGS_ACTIONS,
  COMMUNITY_ACTIONS,
  HELP_ACTIONS,
  DEFAULT_ACTIONS,
  createNavigationAction,
  createQuickAction,
  createSettingsAction,
  createCommunityAction,
  loadExerciseActions,
  loadUserActions,
};
