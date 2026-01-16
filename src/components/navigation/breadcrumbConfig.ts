/**
 * Breadcrumb Configuration
 *
 * Maps routes to their display labels.
 * Dynamic segments (prefixed with :) are resolved at runtime.
 */

// Static route labels
export const ROUTE_LABELS = {
  // Root
  '': 'Home',

  // Core features
  'dashboard': 'Dashboard',
  'workout': 'Workout',
  'exercises': 'Exercises',
  'journey': 'Journey',
  'progression': 'Progression',
  'stats': 'Stats',

  // Profile & Settings
  'profile': 'Profile',
  'settings': 'Settings',
  'onboarding': 'Onboarding',

  // Community
  'community': 'Community',
  'competitions': 'Competitions',
  'crews': 'Crews',
  'rivals': 'Rivals',
  'highfives': 'High Fives',
  'messages': 'Messages',
  'locations': 'Locations',
  'live': 'Live Activity',

  // Economy
  'credits': 'Credits',
  'wallet': 'Wallet',
  'skins': 'Skins Store',
  'trainers': 'Trainers',

  // Health
  'health': 'Health',
  'goals': 'Goals',
  'limitations': 'Limitations',
  'pt-tests': 'PT Tests',
  'career-readiness': 'Career Readiness',

  // Skills & Arts
  'skills': 'Skills',
  'martial-arts': 'Martial Arts',

  // Achievements
  'achievements': 'Achievements',
  'verify': 'Verify',
  'my-verifications': 'My Verifications',
  'witness': 'Witness',

  // Issues & Updates
  'issues': 'Issues',
  'new': 'New Issue',
  'my-issues': 'My Issues',
  'updates': 'Updates',
  'roadmap': 'Roadmap',

  // Documentation
  'docs': 'Documentation',
  'plugins': 'Plugins',
  'design-system': 'Design System',
  'features': 'Features',
  'technology': 'Technology',
  'science': 'Science',
  'design': 'Design',
  'privacy': 'Privacy',
  'contribute': 'Contribute Ideas',

  // Admin
  'admin': 'Admin',
  'admin-control': 'Admin Control',
  'monitoring': 'Monitoring',
  'metrics': 'Metrics',
  'disputes': 'Disputes',
  'empire': 'Empire',
  'scorecard': 'Scorecard',

  // Auth
  'login': 'Login',
  'signup': 'Sign Up',

  // Plugins
  'marketplace': 'Marketplace',

  // Community
  'bulletin': 'Bulletin Board',

  // Verifications
  'verifications': 'Verifications',
};

// Route hierarchy for nested paths
// Maps a route to its parent route
export const ROUTE_HIERARCHY = {
  // Admin sub-routes
  'admin/issues': ['admin'],
  'admin/monitoring': ['admin'],
  'admin/metrics': ['admin'],
  'admin/disputes': ['admin'],

  // Empire sub-routes
  'empire/scorecard': ['empire'],

  // Achievement sub-routes
  'achievements/verify': ['achievements'],
  'achievements/my-verifications': ['achievements'],

  // Issue sub-routes
  'issues/new': ['issues'],

  // Docs sub-routes
  'docs/plugins': ['docs'],

  // Community sub-routes
  'community/bulletin': ['community'],

  // Plugin sub-routes
  'plugins/settings': ['plugins'],
  'plugins/marketplace': ['plugins'],

  // Skills sub-routes - dynamic segments
  // Handled in the hook with dynamic resolution

  // Martial arts sub-routes
  // Handled in the hook with dynamic resolution
};

// Segments that should be treated as IDs (will try to resolve to names)
export const DYNAMIC_SEGMENTS = [
  'exerciseId',
  'crewId',
  'userId',
  'achievementId',
  'verificationId',
  'issueId',
  'docId',
  'treeId',
  'disciplineId',
];

// Routes that should not show in breadcrumbs
export const EXCLUDED_ROUTES = [
  '/',
  '/login',
  '/signup',
];

// Icons for specific routes (optional)
export const ROUTE_ICONS = {
  'dashboard': 'LayoutDashboard',
  'workout': 'Dumbbell',
  'exercises': 'Activity',
  'community': 'Users',
  'profile': 'User',
  'settings': 'Settings',
  'achievements': 'Trophy',
  'credits': 'Coins',
  'stats': 'BarChart3',
  'health': 'Heart',
  'admin': 'Shield',
};

/**
 * Get the label for a route segment
 * @param {string} segment - The route segment
 * @returns {string} The display label
 */
export function getSegmentLabel(segment) {
  return ROUTE_LABELS[segment] || formatSegmentLabel(segment);
}

/**
 * Format a segment as a readable label
 * @param {string} segment - The route segment
 * @returns {string} The formatted label
 */
export function formatSegmentLabel(segment) {
  // Handle UUID-like strings (don't display as labels)
  if (isUUID(segment)) {
    return 'Details';
  }

  // Handle numeric IDs
  if (/^\d+$/.test(segment)) {
    return `#${segment}`;
  }

  // Convert kebab-case to Title Case
  return segment
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Check if a string is a UUID
 * @param {string} str - The string to check
 * @returns {boolean} Whether the string is a UUID
 */
export function isUUID(str) {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
}

/**
 * Check if a segment is a dynamic ID
 * @param {string} segment - The segment to check
 * @returns {boolean} Whether the segment is a dynamic ID
 */
export function isDynamicSegment(segment) {
  return isUUID(segment) || /^\d+$/.test(segment);
}
