/**
 * Breadcrumb Routes Configuration
 *
 * Maps routes to their breadcrumb display information.
 * Supports static labels, dynamic segments, and icons.
 *
 * Dynamic segments use {variableName} syntax and are resolved
 * from route params or context data.
 *
 * Route hierarchy is automatically determined from parent paths.
 */

// Lucide icon names for routes (lazy loaded)
export const ROUTE_ICONS = {
  // Core
  home: 'Home',
  dashboard: 'LayoutDashboard',
  workout: 'Dumbbell',
  exercises: 'Activity',
  journey: 'Map',
  progression: 'TrendingUp',
  stats: 'BarChart3',

  // Community
  community: 'Users',
  crews: 'Shield',
  rivals: 'Swords',
  competitions: 'Trophy',
  locations: 'MapPin',
  highfives: 'HandMetal',
  messages: 'MessageCircle',
  live: 'Radio',
  bulletin: 'MessageSquare',

  // Profile & Settings
  profile: 'User',
  settings: 'Settings',
  onboarding: 'Sparkles',

  // Economy
  credits: 'Coins',
  wallet: 'Wallet',
  skins: 'Palette',
  trainers: 'GraduationCap',

  // Health
  health: 'Heart',
  goals: 'Target',
  limitations: 'AlertTriangle',
  'pt-tests': 'ClipboardCheck',
  'career-readiness': 'Briefcase',
  career: 'Briefcase',

  // Skills & Martial Arts
  skills: 'Zap',
  'martial-arts': 'Sword',

  // Achievements
  achievements: 'Award',
  verify: 'CheckCircle',
  'my-verifications': 'FileCheck',
  witness: 'Eye',

  // Issues & Feedback
  issues: 'Bug',
  new: 'Plus',
  'my-issues': 'FileText',
  updates: 'Bell',
  roadmap: 'Route',
  contribute: 'Lightbulb',

  // Nutrition
  nutrition: 'Apple',
  recipes: 'UtensilsCrossed',
  plans: 'Calendar',
  history: 'History',

  // Documentation
  docs: 'Book',
  plugins: 'Puzzle',
  marketplace: 'Store',
  features: 'Star',
  technology: 'Cpu',
  science: 'Beaker',
  design: 'PenTool',
  'design-system': 'Layers',
  privacy: 'Lock',

  // Admin
  admin: 'ShieldCheck',
  'admin-control': 'ShieldCheck',
  monitoring: 'Activity',
  metrics: 'LineChart',
  disputes: 'Scale',
  empire: 'Crown',
  scorecard: 'ClipboardList',

  // Workout Mode
  'workout-mode': 'Play',
  'rest-timer': 'Timer',
  'exercise-detail': 'Info',
};

/**
 * Breadcrumb route definitions
 *
 * Each route maps to:
 * - label: Display label (use {param} for dynamic segments)
 * - icon: Lucide icon name (optional)
 * - dynamic: True if label needs runtime resolution
 * - parent: Parent path for hierarchy building
 */
export const BREADCRUMB_ROUTES = {
  // ============================================
  // ROOT & DASHBOARD
  // ============================================
  '/': {
    label: 'Home',
    icon: 'Home',
  },
  '/dashboard': {
    label: 'Dashboard',
    icon: 'LayoutDashboard',
  },

  // ============================================
  // CORE WORKOUT FEATURES
  // ============================================
  '/workout': {
    label: 'Workout',
    icon: 'Dumbbell',
  },
  '/workout/active': {
    label: 'Active Workout',
    icon: 'Play',
    parent: '/workout',
  },
  '/workout/history': {
    label: 'Workout History',
    icon: 'History',
    parent: '/workout',
  },
  '/workout/:workoutId': {
    label: 'Workout Details',
    icon: 'Dumbbell',
    dynamic: true,
    parent: '/workout',
  },
  '/exercises': {
    label: 'Exercises',
    icon: 'Activity',
  },
  '/exercises/:exerciseId': {
    label: '{exerciseName}',
    icon: 'Activity',
    dynamic: true,
    parent: '/exercises',
  },
  '/exercises/:exerciseId/alternatives': {
    label: 'Alternatives',
    icon: 'RefreshCw',
    dynamic: true,
    parent: '/exercises/:exerciseId',
  },
  '/journey': {
    label: 'Journey',
    icon: 'Map',
  },
  '/progression': {
    label: 'Progression',
    icon: 'TrendingUp',
  },
  '/stats': {
    label: 'Stats',
    icon: 'BarChart3',
  },
  '/stats/weekly': {
    label: 'Weekly Stats',
    icon: 'Calendar',
    parent: '/stats',
  },
  '/stats/monthly': {
    label: 'Monthly Stats',
    icon: 'Calendar',
    parent: '/stats',
  },
  '/stats/yearly': {
    label: 'Yearly Stats',
    icon: 'Calendar',
    parent: '/stats',
  },

  // ============================================
  // PROFILE & SETTINGS
  // ============================================
  '/profile': {
    label: 'Profile',
    icon: 'User',
  },
  '/profile/:username': {
    label: '@{username}',
    icon: 'User',
    dynamic: true,
    parent: '/profile',
  },
  '/profile/:username/workouts': {
    label: 'Workouts',
    icon: 'Dumbbell',
    dynamic: true,
    parent: '/profile/:username',
  },
  '/profile/:username/achievements': {
    label: 'Achievements',
    icon: 'Award',
    dynamic: true,
    parent: '/profile/:username',
  },
  '/profile/:username/crews': {
    label: 'Crews',
    icon: 'Shield',
    dynamic: true,
    parent: '/profile/:username',
  },
  '/settings': {
    label: 'Settings',
    icon: 'Settings',
  },
  '/settings/account': {
    label: 'Account',
    icon: 'User',
    parent: '/settings',
  },
  '/settings/privacy': {
    label: 'Privacy',
    icon: 'Lock',
    parent: '/settings',
  },
  '/settings/notifications': {
    label: 'Notifications',
    icon: 'Bell',
    parent: '/settings',
  },
  '/settings/appearance': {
    label: 'Appearance',
    icon: 'Palette',
    parent: '/settings',
  },
  '/settings/motion': {
    label: 'Motion & Animations',
    icon: 'Sparkles',
    parent: '/settings',
  },
  '/onboarding': {
    label: 'Onboarding',
    icon: 'Sparkles',
  },

  // ============================================
  // COMMUNITY
  // ============================================
  '/community': {
    label: 'Community',
    icon: 'Users',
  },
  '/community/feed': {
    label: 'Activity Feed',
    icon: 'Activity',
    parent: '/community',
  },
  '/community/bulletin': {
    label: 'Bulletin Board',
    icon: 'MessageSquare',
    parent: '/community',
  },
  '/crews': {
    label: 'Crews',
    icon: 'Shield',
    parent: '/community',
  },
  '/crews/create': {
    label: 'Create Crew',
    icon: 'Plus',
    parent: '/crews',
  },
  '/crews/:crewId': {
    label: '{crewName}',
    icon: 'Shield',
    dynamic: true,
    parent: '/crews',
  },
  '/crews/:crewId/members': {
    label: 'Members',
    icon: 'Users',
    dynamic: true,
    parent: '/crews/:crewId',
  },
  '/crews/:crewId/settings': {
    label: 'Settings',
    icon: 'Settings',
    dynamic: true,
    parent: '/crews/:crewId',
  },
  '/rivals': {
    label: 'Rivals',
    icon: 'Swords',
    parent: '/community',
  },
  '/rivals/:rivalId': {
    label: '{rivalName}',
    icon: 'Swords',
    dynamic: true,
    parent: '/rivals',
  },
  '/competitions': {
    label: 'Competitions',
    icon: 'Trophy',
  },
  '/competitions/active': {
    label: 'Active Competitions',
    icon: 'Play',
    parent: '/competitions',
  },
  '/competitions/create': {
    label: 'Create Competition',
    icon: 'Plus',
    parent: '/competitions',
  },
  '/competitions/:competitionId': {
    label: '{competitionName}',
    icon: 'Trophy',
    dynamic: true,
    parent: '/competitions',
  },
  '/competitions/:competitionId/leaderboard': {
    label: 'Leaderboard',
    icon: 'Award',
    dynamic: true,
    parent: '/competitions/:competitionId',
  },
  '/locations': {
    label: 'Locations',
    icon: 'MapPin',
  },
  '/locations/:locationId': {
    label: '{locationName}',
    icon: 'MapPin',
    dynamic: true,
    parent: '/locations',
  },
  '/highfives': {
    label: 'High Fives',
    icon: 'HandMetal',
  },
  '/messages': {
    label: 'Messages',
    icon: 'MessageCircle',
  },
  '/messages/:conversationId': {
    label: '{conversationName}',
    icon: 'MessageCircle',
    dynamic: true,
    parent: '/messages',
  },

  // ============================================
  // ECONOMY
  // ============================================
  '/credits': {
    label: 'Credits',
    icon: 'Coins',
  },
  '/credits/earn': {
    label: 'Earn Credits',
    icon: 'TrendingUp',
    parent: '/credits',
  },
  '/credits/spend': {
    label: 'Spend Credits',
    icon: 'ShoppingCart',
    parent: '/credits',
  },
  '/wallet': {
    label: 'Wallet',
    icon: 'Wallet',
  },
  '/wallet/transactions': {
    label: 'Transactions',
    icon: 'List',
    parent: '/wallet',
  },
  '/skins': {
    label: 'Skins Store',
    icon: 'Palette',
  },
  '/skins/:skinId': {
    label: '{skinName}',
    icon: 'Palette',
    dynamic: true,
    parent: '/skins',
  },
  '/trainers': {
    label: 'Trainers',
    icon: 'GraduationCap',
  },
  '/trainers/:trainerId': {
    label: '{trainerName}',
    icon: 'GraduationCap',
    dynamic: true,
    parent: '/trainers',
  },

  // ============================================
  // HEALTH & GOALS
  // ============================================
  '/health': {
    label: 'Health',
    icon: 'Heart',
  },
  '/health/metrics': {
    label: 'Health Metrics',
    icon: 'Activity',
    parent: '/health',
  },
  '/goals': {
    label: 'Goals',
    icon: 'Target',
  },
  '/goals/create': {
    label: 'Create Goal',
    icon: 'Plus',
    parent: '/goals',
  },
  '/goals/:goalId': {
    label: '{goalName}',
    icon: 'Target',
    dynamic: true,
    parent: '/goals',
  },
  '/limitations': {
    label: 'Limitations',
    icon: 'AlertTriangle',
  },
  '/pt-tests': {
    label: 'PT Tests',
    icon: 'ClipboardCheck',
  },
  '/pt-tests/:testId': {
    label: '{testName}',
    icon: 'ClipboardCheck',
    dynamic: true,
    parent: '/pt-tests',
  },
  '/career-readiness': {
    label: 'Career Readiness',
    icon: 'Briefcase',
  },

  // ============================================
  // CAREER
  // ============================================
  '/career': {
    label: 'Career',
    icon: 'Briefcase',
  },
  '/career/goals': {
    label: 'Career Goals',
    icon: 'Target',
    parent: '/career',
  },
  '/career/goals/:goalId': {
    label: '{goalName}',
    icon: 'Target',
    dynamic: true,
    parent: '/career/goals',
  },
  '/career/standards': {
    label: 'Standards',
    icon: 'ClipboardCheck',
    parent: '/career',
  },
  '/career/standards/:standardId': {
    label: '{standardName}',
    icon: 'ClipboardCheck',
    dynamic: true,
    parent: '/career/standards',
  },

  // ============================================
  // SKILLS & MARTIAL ARTS
  // ============================================
  '/skills': {
    label: 'Skills',
    icon: 'Zap',
  },
  '/skills/:treeId': {
    label: '{skillTreeName}',
    icon: 'Zap',
    dynamic: true,
    parent: '/skills',
  },
  '/skills/:treeId/:skillId': {
    label: '{skillName}',
    icon: 'Star',
    dynamic: true,
    parent: '/skills/:treeId',
  },
  '/martial-arts': {
    label: 'Martial Arts',
    icon: 'Sword',
  },
  '/martial-arts/:disciplineId': {
    label: '{disciplineName}',
    icon: 'Sword',
    dynamic: true,
    parent: '/martial-arts',
  },
  '/martial-arts/:disciplineId/techniques': {
    label: 'Techniques',
    icon: 'List',
    dynamic: true,
    parent: '/martial-arts/:disciplineId',
  },

  // ============================================
  // ACHIEVEMENTS & VERIFICATION
  // ============================================
  '/achievements': {
    label: 'Achievements',
    icon: 'Award',
  },
  '/achievements/available': {
    label: 'Available',
    icon: 'Gift',
    parent: '/achievements',
  },
  '/achievements/earned': {
    label: 'Earned',
    icon: 'CheckCircle',
    parent: '/achievements',
  },
  '/achievements/:achievementId': {
    label: '{achievementName}',
    icon: 'Award',
    dynamic: true,
    parent: '/achievements',
  },
  '/achievements/verify/:achievementId': {
    label: 'Verify {achievementName}',
    icon: 'CheckCircle',
    dynamic: true,
    parent: '/achievements',
  },
  '/achievements/my-verifications': {
    label: 'My Verifications',
    icon: 'FileCheck',
    parent: '/achievements',
  },
  '/verifications/:verificationId/witness': {
    label: 'Witness Attestation',
    icon: 'Eye',
    dynamic: true,
  },

  // ============================================
  // ISSUES & FEEDBACK
  // ============================================
  '/issues': {
    label: 'Issues',
    icon: 'Bug',
  },
  '/issues/new': {
    label: 'New Issue',
    icon: 'Plus',
    parent: '/issues',
  },
  '/issues/:issueId': {
    label: 'Issue #{issueNumber}',
    icon: 'Bug',
    dynamic: true,
    parent: '/issues',
  },
  '/my-issues': {
    label: 'My Issues',
    icon: 'FileText',
    parent: '/issues',
  },
  '/updates': {
    label: 'Updates',
    icon: 'Bell',
  },
  '/roadmap': {
    label: 'Roadmap',
    icon: 'Route',
  },
  '/contribute': {
    label: 'Contribute Ideas',
    icon: 'Lightbulb',
  },

  // ============================================
  // NUTRITION
  // ============================================
  '/nutrition': {
    label: 'Nutrition',
    icon: 'Apple',
  },
  '/nutrition/log': {
    label: 'Food Log',
    icon: 'List',
    parent: '/nutrition',
  },
  '/nutrition/settings': {
    label: 'Settings',
    icon: 'Settings',
    parent: '/nutrition',
  },
  '/nutrition/recipes': {
    label: 'Recipes',
    icon: 'UtensilsCrossed',
    parent: '/nutrition',
  },
  '/nutrition/recipes/:recipeId': {
    label: '{recipeName}',
    icon: 'UtensilsCrossed',
    dynamic: true,
    parent: '/nutrition/recipes',
  },
  '/nutrition/plans': {
    label: 'Meal Plans',
    icon: 'Calendar',
    parent: '/nutrition',
  },
  '/nutrition/plans/:planId': {
    label: '{planName}',
    icon: 'Calendar',
    dynamic: true,
    parent: '/nutrition/plans',
  },
  '/nutrition/history': {
    label: 'History',
    icon: 'History',
    parent: '/nutrition',
  },

  // ============================================
  // DOCUMENTATION
  // ============================================
  '/docs': {
    label: 'Documentation',
    icon: 'Book',
  },
  '/docs/getting-started': {
    label: 'Getting Started',
    icon: 'PlayCircle',
    parent: '/docs',
  },
  '/docs/plugins': {
    label: 'Plugin Guide',
    icon: 'Puzzle',
    parent: '/docs',
  },
  '/docs/:docId': {
    label: '{docTitle}',
    icon: 'Book',
    dynamic: true,
    parent: '/docs',
  },
  '/features': {
    label: 'Features',
    icon: 'Star',
  },
  '/technology': {
    label: 'Technology',
    icon: 'Cpu',
  },
  '/science': {
    label: 'Science',
    icon: 'Beaker',
  },
  '/design': {
    label: 'Design',
    icon: 'PenTool',
  },
  '/design-system': {
    label: 'Design System',
    icon: 'Layers',
  },
  '/privacy': {
    label: 'Privacy',
    icon: 'Lock',
  },

  // ============================================
  // PLUGINS
  // ============================================
  '/plugins': {
    label: 'Plugins',
    icon: 'Puzzle',
  },
  '/plugins/installed': {
    label: 'Installed',
    icon: 'Package',
    parent: '/plugins',
  },
  '/plugins/settings': {
    label: 'Settings',
    icon: 'Settings',
    parent: '/plugins',
  },
  '/plugins/marketplace': {
    label: 'Marketplace',
    icon: 'Store',
    parent: '/plugins',
  },
  '/plugins/:pluginId': {
    label: '{pluginName}',
    icon: 'Puzzle',
    dynamic: true,
    parent: '/plugins',
  },

  // ============================================
  // ADMIN
  // ============================================
  '/admin-control': {
    label: 'Admin Control',
    icon: 'ShieldCheck',
  },
  '/admin/issues': {
    label: 'Manage Issues',
    icon: 'Bug',
    parent: '/admin-control',
  },
  '/admin/users': {
    label: 'Manage Users',
    icon: 'Users',
    parent: '/admin-control',
  },
  '/admin/monitoring': {
    label: 'Monitoring',
    icon: 'Activity',
    parent: '/admin-control',
  },
  '/admin/metrics': {
    label: 'Metrics',
    icon: 'LineChart',
    parent: '/admin-control',
  },
  '/admin/disputes': {
    label: 'Disputes',
    icon: 'Scale',
    parent: '/admin-control',
  },
  '/admin/logs': {
    label: 'System Logs',
    icon: 'FileText',
    parent: '/admin-control',
  },
  '/empire': {
    label: 'Empire',
    icon: 'Crown',
  },
  '/empire/scorecard': {
    label: 'Scorecard',
    icon: 'ClipboardList',
    parent: '/empire',
  },
  '/empire/analytics': {
    label: 'Analytics',
    icon: 'BarChart3',
    parent: '/empire',
  },

  // ============================================
  // LIVE ACTIVITY
  // ============================================
  '/live': {
    label: 'Live Activity',
    icon: 'Radio',
  },
  '/live/workouts': {
    label: 'Live Workouts',
    icon: 'Dumbbell',
    parent: '/live',
  },
  '/live/competitions': {
    label: 'Live Competitions',
    icon: 'Trophy',
    parent: '/live',
  },
};

/**
 * Routes that should not display breadcrumbs
 */
export const EXCLUDED_ROUTES = [
  '/',
  '/login',
  '/signup',
  '/forgot-password',
  '/reset-password',
  '/verify-email',
];

/**
 * Context key mappings for dynamic route segments
 * Maps route params to context keys for label resolution
 */
export const DYNAMIC_CONTEXT_KEYS = {
  exerciseId: 'exerciseName',
  workoutId: 'workoutName',
  crewId: 'crewName',
  rivalId: 'rivalName',
  competitionId: 'competitionName',
  conversationId: 'conversationName',
  locationId: 'locationName',
  goalId: 'goalName',
  standardId: 'standardName',
  testId: 'testName',
  treeId: 'skillTreeName',
  skillId: 'skillName',
  disciplineId: 'disciplineName',
  achievementId: 'achievementName',
  verificationId: 'verificationName',
  issueId: 'issueNumber',
  recipeId: 'recipeName',
  planId: 'planName',
  docId: 'docTitle',
  skinId: 'skinName',
  trainerId: 'trainerName',
  pluginId: 'pluginName',
  username: 'username',
};

/**
 * Fallback labels for dynamic segments when context is unavailable
 */
export const DYNAMIC_FALLBACK_LABELS = {
  exerciseId: 'Exercise',
  workoutId: 'Workout',
  crewId: 'Crew',
  rivalId: 'Rival',
  competitionId: 'Competition',
  conversationId: 'Conversation',
  locationId: 'Location',
  goalId: 'Goal',
  standardId: 'Standard',
  testId: 'Test',
  treeId: 'Skill Tree',
  skillId: 'Skill',
  disciplineId: 'Discipline',
  achievementId: 'Achievement',
  verificationId: 'Verification',
  issueId: 'Issue',
  recipeId: 'Recipe',
  planId: 'Plan',
  docId: 'Document',
  skinId: 'Skin',
  trainerId: 'Trainer',
  pluginId: 'Plugin',
  username: 'User',
};

/**
 * Get the route configuration for a path
 * Supports both exact matches and pattern matches
 *
 * @param {string} pathname - The current pathname
 * @returns {Object|null} Route configuration or null
 */
export function getRouteConfig(pathname) {
  // Try exact match first
  if (BREADCRUMB_ROUTES[pathname]) {
    return { ...BREADCRUMB_ROUTES[pathname], pattern: pathname };
  }

  // Try pattern matching for dynamic routes
  const segments = pathname.split('/').filter(Boolean);

  for (const [pattern, config] of Object.entries(BREADCRUMB_ROUTES)) {
    const patternSegments = pattern.split('/').filter(Boolean);

    if (patternSegments.length !== segments.length) continue;

    let isMatch = true;
    const params = {};

    for (let i = 0; i < patternSegments.length; i++) {
      const patternSeg = patternSegments[i];
      const actualSeg = segments[i];

      if (patternSeg.startsWith(':')) {
        // Dynamic segment - capture the value
        const paramName = patternSeg.slice(1);
        params[paramName] = actualSeg;
      } else if (patternSeg !== actualSeg) {
        isMatch = false;
        break;
      }
    }

    if (isMatch) {
      return { ...config, pattern, params };
    }
  }

  return null;
}

/**
 * Resolve a dynamic label by replacing {placeholders} with actual values
 *
 * @param {string} labelTemplate - Label with {placeholder} syntax
 * @param {Object} context - Context object with values
 * @param {Object} params - Route params
 * @returns {string} Resolved label
 */
export function resolveDynamicLabel(labelTemplate, context, params) {
  return labelTemplate.replace(/\{(\w+)\}/g, (match, key) => {
    // First try context directly
    if (context[key]) return context[key];

    // Then try to map from params via DYNAMIC_CONTEXT_KEYS
    for (const [paramKey, contextKey] of Object.entries(DYNAMIC_CONTEXT_KEYS)) {
      if (contextKey === key && params[paramKey]) {
        // Check if context has the resolved name
        if (context[contextKey]) return context[contextKey];
        // Otherwise use the raw param value (ID)
        return formatIdAsLabel(params[paramKey]);
      }
    }

    // Use fallback
    for (const [paramKey, fallback] of Object.entries(DYNAMIC_FALLBACK_LABELS)) {
      if (DYNAMIC_CONTEXT_KEYS[paramKey] === key) {
        return fallback;
      }
    }

    return match; // Keep placeholder if nothing matches
  });
}

/**
 * Format an ID (UUID or number) as a readable label
 *
 * @param {string} id - The ID to format
 * @returns {string} Formatted label
 */
function formatIdAsLabel(id) {
  // Short UUIDs (show first 8 chars)
  if (/^[0-9a-f]{8}-/.test(id)) {
    return id.substring(0, 8);
  }

  // Numeric IDs
  if (/^\d+$/.test(id)) {
    return `#${id}`;
  }

  // Kebab-case to Title Case
  return id
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Build parent chain for a route
 * Returns array of parent routes from root to immediate parent
 *
 * @param {string} pathname - Current pathname
 * @returns {Array<string>} Array of parent paths
 */
export function getParentChain(pathname) {
  const parents = [];
  let current = pathname;

  while (current) {
    const config = getRouteConfig(current);
    if (config?.parent) {
      parents.unshift(config.parent);
      current = config.parent;
    } else {
      break;
    }
  }

  return parents;
}

/**
 * Check if a route is a child of another route
 *
 * @param {string} childPath - Potential child path
 * @param {string} parentPath - Potential parent path
 * @returns {boolean}
 */
export function isChildOf(childPath, parentPath) {
  const parents = getParentChain(childPath);
  return parents.includes(parentPath);
}

export default BREADCRUMB_ROUTES;
