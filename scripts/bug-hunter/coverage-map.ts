/**
 * Bug Hunter Coverage Map
 * Comprehensive mapping of all testable paths, interactions, and edge cases
 */

import type {
  CoverageMap,
  RouteDefinition,
  InteractionDefinition,
  FormDefinition,
  ApiEndpoint,
  GraphQLOperation,
  EdgeCase,
} from './types.js';

// ============================================================================
// FRONTEND ROUTES
// ============================================================================

export const ROUTES: RouteDefinition[] = [
  // Public routes
  { path: '/', name: 'Landing', requiresAuth: false, requiresAdmin: false, category: 'public' },
  { path: '/login', name: 'Login', requiresAuth: false, requiresAdmin: false, category: 'auth' },
  { path: '/signup', name: 'Signup', requiresAuth: false, requiresAdmin: false, category: 'auth' },
  { path: '/forgot-password', name: 'Forgot Password', requiresAuth: false, requiresAdmin: false, category: 'auth' },
  { path: '/privacy', name: 'Privacy Policy', requiresAuth: false, requiresAdmin: false, category: 'public' },
  { path: '/terms', name: 'Terms of Service', requiresAuth: false, requiresAdmin: false, category: 'public' },
  { path: '/docs', name: 'Documentation', requiresAuth: false, requiresAdmin: false, category: 'public' },
  { path: '/skills', name: 'Skills', requiresAuth: false, requiresAdmin: false, category: 'public' },
  { path: '/martial-arts', name: 'Martial Arts', requiresAuth: false, requiresAdmin: false, category: 'public' },

  // Core authenticated routes
  { path: '/dashboard', name: 'Dashboard', requiresAuth: true, requiresAdmin: false, category: 'core' },
  { path: '/dashboard/stats', name: 'Dashboard Stats', requiresAuth: true, requiresAdmin: false, category: 'core' },
  { path: '/dashboard/goals', name: 'Dashboard Goals', requiresAuth: true, requiresAdmin: false, category: 'core' },

  // Workout routes
  { path: '/workout', name: 'Workout', requiresAuth: true, requiresAdmin: false, category: 'workout' },
  { path: '/workout/new', name: 'New Workout', requiresAuth: true, requiresAdmin: false, category: 'workout' },
  { path: '/workout/history', name: 'Workout History', requiresAuth: true, requiresAdmin: false, category: 'workout' },
  { path: '/workout/templates', name: 'Workout Templates', requiresAuth: true, requiresAdmin: false, category: 'workout' },
  { path: '/workout/active', name: 'Active Workout', requiresAuth: true, requiresAdmin: false, category: 'workout' },

  // Exercise routes
  { path: '/exercises', name: 'Exercises', requiresAuth: true, requiresAdmin: false, category: 'exercises' },
  { path: '/exercises/search', name: 'Exercise Search', requiresAuth: true, requiresAdmin: false, category: 'exercises' },
  { path: '/exercises/:id', name: 'Exercise Detail', requiresAuth: true, requiresAdmin: false, params: ['id'], category: 'exercises' },

  // Journey routes
  { path: '/journey', name: 'Journey', requiresAuth: true, requiresAdmin: false, category: 'journey' },
  { path: '/journey/archetypes', name: 'Archetypes', requiresAuth: true, requiresAdmin: false, category: 'journey' },
  { path: '/journey/milestones', name: 'Milestones', requiresAuth: true, requiresAdmin: false, category: 'journey' },
  { path: '/journey/skills', name: 'Skills Progress', requiresAuth: true, requiresAdmin: false, category: 'journey' },

  // Profile routes
  { path: '/profile', name: 'Profile', requiresAuth: true, requiresAdmin: false, category: 'profile' },
  { path: '/profile/settings', name: 'Settings', requiresAuth: true, requiresAdmin: false, category: 'profile' },
  { path: '/profile/achievements', name: 'Achievements', requiresAuth: true, requiresAdmin: false, category: 'profile' },
  { path: '/profile/stats', name: 'Profile Stats', requiresAuth: true, requiresAdmin: false, category: 'profile' },
  { path: '/profile/:userId', name: 'User Profile', requiresAuth: true, requiresAdmin: false, params: ['userId'], category: 'profile' },

  // Stats routes
  { path: '/stats', name: 'Stats', requiresAuth: true, requiresAdmin: false, category: 'stats' },
  { path: '/stats/character', name: 'Character Stats', requiresAuth: true, requiresAdmin: false, category: 'stats' },
  { path: '/stats/progress', name: 'Progress', requiresAuth: true, requiresAdmin: false, category: 'stats' },

  // Social routes
  { path: '/community', name: 'Community', requiresAuth: true, requiresAdmin: false, category: 'social' },
  { path: '/community/feed', name: 'Community Feed', requiresAuth: true, requiresAdmin: false, category: 'social' },
  { path: '/leaderboard', name: 'Leaderboard', requiresAuth: true, requiresAdmin: false, category: 'social' },
  { path: '/high-fives', name: 'High Fives', requiresAuth: true, requiresAdmin: false, category: 'social' },
  { path: '/messages', name: 'Messages', requiresAuth: true, requiresAdmin: false, category: 'social' },
  { path: '/crews', name: 'Crews', requiresAuth: true, requiresAdmin: false, category: 'social' },
  { path: '/crews/:crewId', name: 'Crew Detail', requiresAuth: true, requiresAdmin: false, params: ['crewId'], category: 'social' },
  { path: '/rivals', name: 'Rivals', requiresAuth: true, requiresAdmin: false, category: 'social' },

  // Competitions
  { path: '/competitions', name: 'Competitions', requiresAuth: true, requiresAdmin: false, category: 'competitions' },
  { path: '/competitions/create', name: 'Create Competition', requiresAuth: true, requiresAdmin: false, category: 'competitions' },
  { path: '/competitions/:id', name: 'Competition Detail', requiresAuth: true, requiresAdmin: false, params: ['id'], category: 'competitions' },

  // Economy routes
  { path: '/credits', name: 'Credits', requiresAuth: true, requiresAdmin: false, category: 'economy' },
  { path: '/wallet', name: 'Wallet', requiresAuth: true, requiresAdmin: false, category: 'economy' },
  { path: '/store', name: 'Store', requiresAuth: true, requiresAdmin: false, category: 'economy' },
  { path: '/store/skins', name: 'Skins Store', requiresAuth: true, requiresAdmin: false, category: 'economy' },
  { path: '/marketplace', name: 'Marketplace', requiresAuth: true, requiresAdmin: false, category: 'economy' },
  { path: '/trading', name: 'Trading', requiresAuth: true, requiresAdmin: false, category: 'economy' },

  // Health routes
  { path: '/wellness', name: 'Wellness', requiresAuth: true, requiresAdmin: false, category: 'health' },
  { path: '/recovery', name: 'Recovery', requiresAuth: true, requiresAdmin: false, category: 'health' },
  { path: '/goals', name: 'Goals', requiresAuth: true, requiresAdmin: false, category: 'health' },
  { path: '/limitations', name: 'Limitations', requiresAuth: true, requiresAdmin: false, category: 'health' },

  // Career routes
  { path: '/pt-tests', name: 'PT Tests', requiresAuth: true, requiresAdmin: false, category: 'career' },
  { path: '/career-readiness', name: 'Career Readiness', requiresAuth: true, requiresAdmin: false, category: 'career' },

  // Mentorship
  { path: '/trainers', name: 'Trainers', requiresAuth: true, requiresAdmin: false, category: 'mentorship' },
  { path: '/mentorship', name: 'Mentorship', requiresAuth: true, requiresAdmin: false, category: 'mentorship' },

  // Admin routes
  { path: '/admin', name: 'Admin Dashboard', requiresAuth: true, requiresAdmin: true, category: 'admin' },
  { path: '/admin/metrics', name: 'Admin Metrics', requiresAuth: true, requiresAdmin: true, category: 'admin' },
  { path: '/admin/users', name: 'Admin Users', requiresAuth: true, requiresAdmin: true, category: 'admin' },
  { path: '/admin/logs', name: 'Admin Logs', requiresAuth: true, requiresAdmin: true, category: 'admin' },
  { path: '/empire', name: 'Empire Control', requiresAuth: true, requiresAdmin: true, category: 'admin' },
  { path: '/empire/scorecard', name: 'Test Scorecard', requiresAuth: true, requiresAdmin: true, category: 'admin' },

  // Developer routes
  { path: '/issues', name: 'Issues', requiresAuth: false, requiresAdmin: false, category: 'developer' },
  { path: '/roadmap', name: 'Roadmap', requiresAuth: false, requiresAdmin: false, category: 'developer' },
  { path: '/dev-updates', name: 'Dev Updates', requiresAuth: false, requiresAdmin: false, category: 'developer' },
];

// ============================================================================
// INTERACTIVE ELEMENTS
// ============================================================================

export const INTERACTIONS: InteractionDefinition[] = [
  // Buttons
  { selector: 'button[type="submit"]', type: 'click', description: 'Submit buttons' },
  { selector: 'button:not([disabled])', type: 'click', description: 'Enabled buttons' },
  { selector: '[role="button"]', type: 'click', description: 'ARIA buttons' },

  // Links
  { selector: 'a[href]:not([href^="#"])', type: 'click', description: 'Navigation links' },

  // Forms
  { selector: 'input[type="text"]', type: 'click', description: 'Text inputs' },
  { selector: 'input[type="email"]', type: 'click', description: 'Email inputs' },
  { selector: 'input[type="password"]', type: 'click', description: 'Password inputs' },
  { selector: 'input[type="number"]', type: 'click', description: 'Number inputs' },
  { selector: 'textarea', type: 'click', description: 'Textareas' },
  { selector: 'select', type: 'click', description: 'Select dropdowns' },
  { selector: 'input[type="checkbox"]', type: 'click', description: 'Checkboxes' },
  { selector: 'input[type="radio"]', type: 'click', description: 'Radio buttons' },

  // Interactive components
  { selector: '[data-action]', type: 'click', description: 'Data action elements' },
  { selector: '.clickable', type: 'click', description: 'Clickable elements' },
  { selector: '[onclick]', type: 'click', description: 'Onclick handlers' },

  // Modals and dialogs
  { selector: '[role="dialog"]', type: 'click', description: 'Dialogs' },
  { selector: '.modal', type: 'click', description: 'Modals' },

  // Tabs and accordions
  { selector: '[role="tab"]', type: 'click', description: 'Tab buttons' },
  { selector: '[role="tabpanel"]', type: 'click', description: 'Tab panels' },
  { selector: '.accordion-header', type: 'click', description: 'Accordion headers' },

  // Cards and list items
  { selector: '.card', type: 'click', description: 'Cards' },
  { selector: '[role="listitem"]', type: 'click', description: 'List items' },

  // Hover interactions
  { selector: '[data-tooltip]', type: 'hover', description: 'Tooltips' },
  { selector: '.hover-trigger', type: 'hover', description: 'Hover triggers' },
];

// ============================================================================
// FORMS
// ============================================================================

export const FORMS: FormDefinition[] = [
  {
    path: '/login',
    selector: 'form',
    submitButton: 'button[type="submit"]',
    fields: [
      {
        name: 'email',
        selector: 'input[type="email"], input[name="email"]',
        type: 'email',
        required: true,
        validValues: ['test@example.com', 'user@musclemap.me'],
        invalidValues: ['invalid', '', 'no-at-sign.com', '@nodomain'],
      },
      {
        name: 'password',
        selector: 'input[type="password"], input[name="password"]',
        type: 'password',
        required: true,
        validValues: ['ValidPass123!', 'SecurePassword456@'],
        invalidValues: ['', '123', 'short'],
      },
    ],
  },
  {
    path: '/signup',
    selector: 'form',
    submitButton: 'button[type="submit"]',
    fields: [
      {
        name: 'username',
        selector: 'input[name="username"]',
        type: 'text',
        required: true,
        validValues: ['testuser123', 'newuser456'],
        invalidValues: ['', 'ab', 'a'.repeat(100)],
      },
      {
        name: 'email',
        selector: 'input[type="email"]',
        type: 'email',
        required: true,
        validValues: ['new@example.com'],
        invalidValues: ['invalid', ''],
      },
      {
        name: 'password',
        selector: 'input[type="password"]',
        type: 'password',
        required: true,
        validValues: ['ValidPass123!'],
        invalidValues: ['', '123'],
      },
    ],
  },
  {
    path: '/profile/settings',
    selector: 'form',
    submitButton: 'button[type="submit"]',
    fields: [
      {
        name: 'displayName',
        selector: 'input[name="displayName"]',
        type: 'text',
        required: false,
        validValues: ['Test User', 'Updated Name'],
        invalidValues: ['', 'a'.repeat(200)],
      },
      {
        name: 'bio',
        selector: 'textarea[name="bio"]',
        type: 'textarea',
        required: false,
        validValues: ['My bio', 'Fitness enthusiast'],
        invalidValues: ['a'.repeat(1001)],
      },
    ],
  },
  {
    path: '/goals',
    selector: 'form',
    submitButton: 'button[type="submit"]',
    fields: [
      {
        name: 'goalType',
        selector: 'select[name="goalType"]',
        type: 'select',
        required: true,
        validValues: ['strength', 'endurance', 'weight_loss'],
        invalidValues: [],
      },
      {
        name: 'targetValue',
        selector: 'input[name="targetValue"]',
        type: 'number',
        required: true,
        validValues: ['100', '50', '200'],
        invalidValues: ['-1', '0', ''],
      },
    ],
  },
];

// ============================================================================
// API ENDPOINTS
// ============================================================================

export const API_ENDPOINTS: ApiEndpoint[] = [
  // Health
  { method: 'GET', path: '/health', requiresAuth: false, requiresAdmin: false, expectedStatus: [200] },
  { method: 'GET', path: '/ready', requiresAuth: false, requiresAdmin: false, expectedStatus: [200] },
  { method: 'GET', path: '/metrics', requiresAuth: false, requiresAdmin: false, expectedStatus: [200] },

  // Auth
  { method: 'POST', path: '/api/auth/register', requiresAuth: false, requiresAdmin: false, expectedStatus: [201, 400, 409] },
  { method: 'POST', path: '/api/auth/login', requiresAuth: false, requiresAdmin: false, expectedStatus: [200, 401] },
  { method: 'GET', path: '/api/auth/me', requiresAuth: true, requiresAdmin: false, expectedStatus: [200, 401] },
  { method: 'POST', path: '/api/auth/logout', requiresAuth: true, requiresAdmin: false, expectedStatus: [200] },
  { method: 'POST', path: '/api/auth/refresh', requiresAuth: true, requiresAdmin: false, expectedStatus: [200, 401] },

  // Profile
  { method: 'GET', path: '/api/profile', requiresAuth: true, requiresAdmin: false, expectedStatus: [200] },
  { method: 'PUT', path: '/api/profile', requiresAuth: true, requiresAdmin: false, expectedStatus: [200, 400] },
  { method: 'GET', path: '/api/profile/:userId', requiresAuth: true, requiresAdmin: false, expectedStatus: [200, 404] },

  // Exercises
  { method: 'GET', path: '/api/exercises', requiresAuth: true, requiresAdmin: false, expectedStatus: [200] },
  { method: 'GET', path: '/api/exercises/:id', requiresAuth: true, requiresAdmin: false, expectedStatus: [200, 404] },
  { method: 'GET', path: '/api/exercises/search', requiresAuth: true, requiresAdmin: false, expectedStatus: [200] },

  // Workouts
  { method: 'GET', path: '/api/workouts', requiresAuth: true, requiresAdmin: false, expectedStatus: [200] },
  { method: 'POST', path: '/api/workouts', requiresAuth: true, requiresAdmin: false, expectedStatus: [201, 400] },
  { method: 'GET', path: '/api/workouts/:id', requiresAuth: true, requiresAdmin: false, expectedStatus: [200, 404] },
  { method: 'PUT', path: '/api/workouts/:id', requiresAuth: true, requiresAdmin: false, expectedStatus: [200, 404] },
  { method: 'DELETE', path: '/api/workouts/:id', requiresAuth: true, requiresAdmin: false, expectedStatus: [200, 404] },

  // Stats
  { method: 'GET', path: '/api/stats', requiresAuth: true, requiresAdmin: false, expectedStatus: [200] },
  { method: 'GET', path: '/api/stats/character', requiresAuth: true, requiresAdmin: false, expectedStatus: [200] },
  { method: 'GET', path: '/api/stats/progress', requiresAuth: true, requiresAdmin: false, expectedStatus: [200] },

  // Journey
  { method: 'GET', path: '/api/journey', requiresAuth: true, requiresAdmin: false, expectedStatus: [200] },
  { method: 'GET', path: '/api/archetypes', requiresAuth: true, requiresAdmin: false, expectedStatus: [200] },
  { method: 'POST', path: '/api/archetypes/select', requiresAuth: true, requiresAdmin: false, expectedStatus: [200, 400] },

  // Economy
  { method: 'GET', path: '/api/economy/balance', requiresAuth: true, requiresAdmin: false, expectedStatus: [200] },
  { method: 'GET', path: '/api/economy/transactions', requiresAuth: true, requiresAdmin: false, expectedStatus: [200] },
  { method: 'GET', path: '/api/economy/pricing', requiresAuth: true, requiresAdmin: false, expectedStatus: [200] },

  // Social
  { method: 'GET', path: '/api/community/feed', requiresAuth: true, requiresAdmin: false, expectedStatus: [200] },
  { method: 'GET', path: '/api/leaderboard', requiresAuth: true, requiresAdmin: false, expectedStatus: [200] },
  { method: 'GET', path: '/api/high-fives/stats', requiresAuth: true, requiresAdmin: false, expectedStatus: [200] },

  // Goals
  { method: 'GET', path: '/api/goals', requiresAuth: true, requiresAdmin: false, expectedStatus: [200] },
  { method: 'POST', path: '/api/goals', requiresAuth: true, requiresAdmin: false, expectedStatus: [201, 400] },

  // Achievements
  { method: 'GET', path: '/api/achievements', requiresAuth: true, requiresAdmin: false, expectedStatus: [200] },

  // Settings
  { method: 'GET', path: '/api/settings', requiresAuth: true, requiresAdmin: false, expectedStatus: [200] },
  { method: 'PUT', path: '/api/settings', requiresAuth: true, requiresAdmin: false, expectedStatus: [200, 400] },
];

// ============================================================================
// GRAPHQL OPERATIONS
// ============================================================================

export const GRAPHQL_OPERATIONS: GraphQLOperation[] = [
  // Queries
  { name: 'GetCurrentUser', type: 'query', requiresAuth: true },
  { name: 'GetProfile', type: 'query', requiresAuth: true, variables: { userId: 'string' } },
  { name: 'GetExercises', type: 'query', requiresAuth: true, variables: { limit: 20 } },
  { name: 'GetExerciseById', type: 'query', requiresAuth: true, variables: { id: 'string' } },
  { name: 'GetWorkouts', type: 'query', requiresAuth: true, variables: { limit: 20 } },
  { name: 'GetWorkoutById', type: 'query', requiresAuth: true, variables: { id: 'string' } },
  { name: 'GetStats', type: 'query', requiresAuth: true },
  { name: 'GetCharacterStats', type: 'query', requiresAuth: true },
  { name: 'GetJourney', type: 'query', requiresAuth: true },
  { name: 'GetArchetypes', type: 'query', requiresAuth: true },
  { name: 'GetCreditBalance', type: 'query', requiresAuth: true },
  { name: 'GetLeaderboard', type: 'query', requiresAuth: true, variables: { type: 'string', limit: 10 } },
  { name: 'GetFeed', type: 'query', requiresAuth: true, variables: { limit: 20 } },
  { name: 'GetAchievements', type: 'query', requiresAuth: true },
  { name: 'GetGoals', type: 'query', requiresAuth: true },
  { name: 'GetSettings', type: 'query', requiresAuth: true },

  // Mutations
  { name: 'UpdateProfile', type: 'mutation', requiresAuth: true, variables: { input: 'object' } },
  { name: 'CreateWorkout', type: 'mutation', requiresAuth: true, variables: { input: 'object' } },
  { name: 'CompleteWorkout', type: 'mutation', requiresAuth: true, variables: { id: 'string' } },
  { name: 'SelectArchetype', type: 'mutation', requiresAuth: true, variables: { archetypeId: 'string' } },
  { name: 'CreateGoal', type: 'mutation', requiresAuth: true, variables: { input: 'object' } },
  { name: 'UpdateSettings', type: 'mutation', requiresAuth: true, variables: { input: 'object' } },
  { name: 'SendHighFive', type: 'mutation', requiresAuth: true, variables: { userId: 'string' } },
];

// ============================================================================
// EDGE CASES
// ============================================================================

export const EDGE_CASES: EdgeCase[] = [
  {
    name: 'empty_state',
    description: 'Test pages with no data',
    category: 'empty_state',
    action: async () => {
      // Create fresh user with no data
    },
  },
  {
    name: 'max_data',
    description: 'Test pages with maximum data',
    category: 'max_data',
    action: async () => {
      // Create user with lots of data
    },
  },
  {
    name: 'rapid_clicks',
    description: 'Click same button 10 times rapidly',
    category: 'rapid_action',
    action: async () => {
      // Rapid click test
    },
  },
  {
    name: 'back_button',
    description: 'Navigate forward then back',
    category: 'navigation',
    action: async () => {
      // Back button test
    },
  },
  {
    name: 'refresh_mid_action',
    description: 'Refresh during form submission',
    category: 'navigation',
    action: async () => {
      // Refresh test
    },
  },
  {
    name: 'offline_mode',
    description: 'Test actions while offline',
    category: 'network',
    action: async () => {
      // Offline test
    },
  },
  {
    name: 'slow_network',
    description: 'Test with 3G throttling',
    category: 'network',
    action: async () => {
      // Slow network test
    },
  },
  {
    name: 'invalid_token',
    description: 'Test with corrupted auth token',
    category: 'auth',
    action: async () => {
      // Invalid token test
    },
  },
  {
    name: 'expired_token',
    description: 'Test with expired auth token',
    category: 'auth',
    action: async () => {
      // Expired token test
    },
  },
  {
    name: 'concurrent_tabs',
    description: 'Same user in multiple tabs',
    category: 'concurrent',
    action: async () => {
      // Multi-tab test
    },
  },
  {
    name: 'concurrent_requests',
    description: 'Multiple API requests at once',
    category: 'concurrent',
    action: async () => {
      // Concurrent API test
    },
  },
];

// ============================================================================
// COVERAGE MAP EXPORT
// ============================================================================

export const COVERAGE_MAP: CoverageMap = {
  routes: ROUTES,
  interactions: INTERACTIONS,
  forms: FORMS,
  apiEndpoints: API_ENDPOINTS,
  graphqlOperations: GRAPHQL_OPERATIONS,
  edgeCases: EDGE_CASES,
};

// Helper functions
export function getRoutesByCategory(category: string): RouteDefinition[] {
  return ROUTES.filter(r => r.category === category);
}

export function getAuthenticatedRoutes(): RouteDefinition[] {
  return ROUTES.filter(r => r.requiresAuth);
}

export function getPublicRoutes(): RouteDefinition[] {
  return ROUTES.filter(r => !r.requiresAuth);
}

export function getAdminRoutes(): RouteDefinition[] {
  return ROUTES.filter(r => r.requiresAdmin);
}

export function getRouteCategories(): string[] {
  return [...new Set(ROUTES.map(r => r.category))];
}

// Summary
export function getCoverageSummary(): Record<string, number> {
  return {
    routes: ROUTES.length,
    authenticatedRoutes: getAuthenticatedRoutes().length,
    publicRoutes: getPublicRoutes().length,
    adminRoutes: getAdminRoutes().length,
    interactions: INTERACTIONS.length,
    forms: FORMS.length,
    apiEndpoints: API_ENDPOINTS.length,
    graphqlOperations: GRAPHQL_OPERATIONS.length,
    edgeCases: EDGE_CASES.length,
    categories: getRouteCategories().length,
  };
}
