/**
 * Breadcrumb Routes Configuration
 *
 * Maps routes to their breadcrumb display information.
 * Supports static labels, dynamic segments, and icons.
 *
 * Dynamic segments use {variableName} syntax and are resolved
 * from route params or context data.
 */

// Lucide icon names for routes (lazy loaded)
export const ROUTE_ICONS = {
  home: 'Home',
  dashboard: 'LayoutDashboard',
  workout: 'Dumbbell',
  exercises: 'Activity',
  journey: 'Map',
  progression: 'TrendingUp',
  stats: 'BarChart3',
  community: 'Users',
  crews: 'Shield',
  rivals: 'Swords',
  competitions: 'Trophy',
  locations: 'MapPin',
  highfives: 'HandMetal',
  messages: 'MessageCircle',
  profile: 'User',
  settings: 'Settings',
  onboarding: 'Sparkles',
  credits: 'Coins',
  wallet: 'Wallet',
  skins: 'Palette',
  trainers: 'GraduationCap',
  health: 'Heart',
  goals: 'Target',
  limitations: 'AlertTriangle',
  'pt-tests': 'ClipboardCheck',
  'career-readiness': 'Briefcase',
  career: 'Briefcase',
  skills: 'Zap',
  'martial-arts': 'Sword',
  achievements: 'Award',
  verify: 'CheckCircle',
  'my-verifications': 'FileCheck',
  witness: 'Eye',
  issues: 'Bug',
  new: 'Plus',
  'my-issues': 'FileText',
  updates: 'Bell',
  roadmap: 'Route',
  nutrition: 'Apple',
  recipes: 'UtensilsCrossed',
  plans: 'Calendar',
  history: 'History',
  docs: 'Book',
  plugins: 'Puzzle',
  marketplace: 'Store',
  admin: 'ShieldCheck',
  'admin-control': 'ShieldCheck',
  monitoring: 'Activity',
  metrics: 'LineChart',
  disputes: 'Scale',
  empire: 'Crown',
  scorecard: 'ClipboardList',
  live: 'Radio',
  bulletin: 'MessageSquare',
  contribute: 'Lightbulb',
  privacy: 'Lock',
  features: 'Star',
  technology: 'Cpu',
  science: 'Beaker',
  design: 'PenTool',
  'design-system': 'Layers',
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
  // Root
  '/': {
    label: 'Home',
    icon: 'Home',
  },

  // Dashboard
  '/dashboard': {
    label: 'Dashboard',
    icon: 'LayoutDashboard',
  },

  // Core Workout Features
  '/workout': {
    label: 'Workout',
    icon: 'Dumbbell',
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

  // Profile & Settings
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
  '/settings': {
    label: 'Settings',
    icon: 'Settings',
  },
  '/onboarding': {
    label: 'Onboarding',
    icon: 'Sparkles',
  },

  // Community
  '/community': {
    label: 'Community',
    icon: 'Users',
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
  '/crews/:crewId': {
    label: '{crewName}',
    icon: 'Shield',
    dynamic: true,
    parent: '/crews',
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
  '/competitions/:competitionId': {
    label: '{competitionName}',
    icon: 'Trophy',
    dynamic: true,
    parent: '/competitions',
  },
  '/locations': {
    label: 'Locations',
    icon: 'MapPin',
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

  // Economy
  '/credits': {
    label: 'Credits',
    icon: 'Coins',
  },
  '/wallet': {
    label: 'Wallet',
    icon: 'Wallet',
  },
  '/skins': {
    label: 'Skins Store',
    icon: 'Palette',
  },
  '/trainers': {
    label: 'Trainers',
    icon: 'GraduationCap',
  },

  // Health
  '/health': {
    label: 'Health',
    icon: 'Heart',
  },
  '/goals': {
    label: 'Goals',
    icon: 'Target',
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
  '/career-readiness': {
    label: 'Career Readiness',
    icon: 'Briefcase',
  },

  // Career
  '/career': {
    label: 'Career',
    icon: 'Briefcase',
  },
  '/career/goals/:goalId': {
    label: '{goalName}',
    icon: 'Target',
    dynamic: true,
    parent: '/career',
  },
  '/career/standards/:standardId': {
    label: '{standardName}',
    icon: 'ClipboardCheck',
    dynamic: true,
    parent: '/career',
  },

  // Skills & Martial Arts
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

  // Achievements
  '/achievements': {
    label: 'Achievements',
    icon: 'Award',
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

  // Issues & Feedback
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

  // Nutrition
  '/nutrition': {
    label: 'Nutrition',
    icon: 'Apple',
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
  '/nutrition/history': {
    label: 'History',
    icon: 'History',
    parent: '/nutrition',
  },

  // Documentation
  '/docs': {
    label: 'Documentation',
    icon: 'Book',
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

  // Plugins
  '/plugins': {
    label: 'Plugins',
    icon: 'Puzzle',
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

  // Admin
  '/admin-control': {
    label: 'Admin Control',
    icon: 'ShieldCheck',
  },
  '/admin/issues': {
    label: 'Manage Issues',
    icon: 'Bug',
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
  '/empire': {
    label: 'Empire',
    icon: 'Crown',
  },
  '/empire/scorecard': {
    label: 'Scorecard',
    icon: 'ClipboardList',
    parent: '/empire',
  },

  // Live Activity
  '/live': {
    label: 'Live Activity',
    icon: 'Radio',
  },
};

/**
 * Routes that should not display breadcrumbs
 */
export const EXCLUDED_ROUTES = [
  '/',
  '/login',
  '/signup',
];

/**
 * Context key mappings for dynamic route segments
 * Maps route params to context keys for label resolution
 */
export const DYNAMIC_CONTEXT_KEYS = {
  exerciseId: 'exerciseName',
  crewId: 'crewName',
  rivalId: 'rivalName',
  competitionId: 'competitionName',
  conversationId: 'conversationName',
  goalId: 'goalName',
  standardId: 'standardName',
  treeId: 'skillTreeName',
  disciplineId: 'disciplineName',
  achievementId: 'achievementName',
  verificationId: 'verificationName',
  issueId: 'issueNumber',
  recipeId: 'recipeName',
  docId: 'docTitle',
  username: 'username',
};

/**
 * Fallback labels for dynamic segments when context is unavailable
 */
export const DYNAMIC_FALLBACK_LABELS = {
  exerciseId: 'Exercise',
  crewId: 'Crew',
  rivalId: 'Rival',
  competitionId: 'Competition',
  conversationId: 'Conversation',
  goalId: 'Goal',
  standardId: 'Standard',
  treeId: 'Skill Tree',
  disciplineId: 'Discipline',
  achievementId: 'Achievement',
  verificationId: 'Verification',
  issueId: 'Issue',
  recipeId: 'Recipe',
  docId: 'Document',
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
    // First try context
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

export default BREADCRUMB_ROUTES;
