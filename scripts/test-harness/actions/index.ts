/**
 * Action Registry
 * Pre-built actions for common test scenarios
 */

import type { Action, TestContext } from '../types.js';
import {
  httpAction,
  graphqlQuery,
  graphqlMutation,
  setVar,
  extractToken,
  extractUserId,
} from '../executor.js';
import { assert } from '../assertions.js';

// ============================================================================
// Authentication Actions
// ============================================================================

export const auth = {
  /**
   * Register a new user
   */
  register: (email: string, password: string, username: string): Action[] => [
    httpAction('POST', '/auth/register', {
      body: { email, password, username },
      expectedStatus: [201, 200],
    }),
    setVar('token', (ctx: TestContext) => {
      const result = ctx.results[ctx.results.length - 1];
      return extractToken({ action: { type: 'http_request', name: '', params: {} }, success: true, data: result.metadata?.response, duration: 0 });
    }),
    setVar('userId', (ctx: TestContext) => {
      const result = ctx.results[ctx.results.length - 1];
      return extractUserId({ action: { type: 'http_request', name: '', params: {} }, success: true, data: result.metadata?.response, duration: 0 });
    }),
  ],

  /**
   * Login action
   */
  login: (email: string, password: string): Action =>
    httpAction('POST', '/auth/login', {
      body: { email, password },
      expectedStatus: [200],
    }),

  /**
   * Logout action
   */
  logout: (): Action =>
    httpAction('POST', '/auth/logout', {
      expectedStatus: [200, 204],
    }),

  /**
   * Refresh token action
   */
  refreshToken: (refreshToken: string): Action =>
    httpAction('POST', '/auth/refresh', {
      body: { refreshToken },
      expectedStatus: [200],
    }),

  /**
   * Get current user action
   */
  me: (): Action =>
    httpAction('GET', '/auth/me', {
      expectedStatus: [200],
    }),
};

// ============================================================================
// Profile Actions
// ============================================================================

export const profile = {
  /**
   * Get user profile
   */
  get: (userId?: string): Action =>
    httpAction('GET', userId ? `/users/${userId}/profile` : '/profile', {
      expectedStatus: [200],
    }),

  /**
   * Update profile
   */
  update: (data: Record<string, unknown>): Action =>
    httpAction('PUT', '/profile', {
      body: data,
      expectedStatus: [200],
    }),

  /**
   * Upload avatar
   */
  uploadAvatar: (imageUrl: string): Action =>
    httpAction('POST', '/profile/avatar', {
      body: { url: imageUrl },
      expectedStatus: [200],
    }),

  /**
   * Get stats
   */
  getStats: (): Action =>
    httpAction('GET', '/profile/stats', {
      expectedStatus: [200],
    }),
};

// ============================================================================
// Workout Actions
// ============================================================================

export const workouts = {
  /**
   * List workouts
   */
  list: (params?: { page?: number; limit?: number }): Action => {
    const query = new URLSearchParams();
    if (params?.page) query.set('page', String(params.page));
    if (params?.limit) query.set('limit', String(params.limit));
    const qs = query.toString();
    return httpAction('GET', `/workouts${qs ? `?${qs}` : ''}`, {
      expectedStatus: [200],
    });
  },

  /**
   * Get workout by ID
   */
  get: (workoutId: string): Action =>
    httpAction('GET', `/workouts/${workoutId}`, {
      expectedStatus: [200, 404],
    }),

  /**
   * Create workout
   */
  create: (data: Record<string, unknown>): Action =>
    httpAction('POST', '/workouts', {
      body: data,
      expectedStatus: [201, 200],
    }),

  /**
   * Complete workout
   */
  complete: (workoutId: string, data?: Record<string, unknown>): Action =>
    httpAction('POST', `/workouts/${workoutId}/complete`, {
      body: data || {},
      expectedStatus: [200],
    }),

  /**
   * Get prescription
   */
  getPrescription: (): Action =>
    httpAction('GET', '/workouts/prescription', {
      expectedStatus: [200],
    }),
};

// ============================================================================
// Exercise Actions
// ============================================================================

export const exercises = {
  /**
   * List exercises
   */
  list: (params?: { search?: string; muscleGroup?: string }): Action => {
    const query = new URLSearchParams();
    if (params?.search) query.set('search', params.search);
    if (params?.muscleGroup) query.set('muscleGroup', params.muscleGroup);
    const qs = query.toString();
    return httpAction('GET', `/exercises${qs ? `?${qs}` : ''}`, {
      expectedStatus: [200],
    });
  },

  /**
   * Get exercise by ID
   */
  get: (exerciseId: string): Action =>
    httpAction('GET', `/exercises/${exerciseId}`, {
      expectedStatus: [200, 404],
    }),

  /**
   * Get alternatives for an exercise
   */
  getAlternatives: (exerciseId: string): Action =>
    httpAction('GET', `/exercises/${exerciseId}/alternatives`, {
      expectedStatus: [200],
    }),

  /**
   * Search exercises
   */
  search: (query: string): Action =>
    httpAction('GET', `/exercises/search?q=${encodeURIComponent(query)}`, {
      expectedStatus: [200],
    }),
};

// ============================================================================
// Goal Actions
// ============================================================================

export const goals = {
  /**
   * List goals
   */
  list: (): Action =>
    httpAction('GET', '/goals', {
      expectedStatus: [200],
    }),

  /**
   * Create goal
   */
  create: (data: Record<string, unknown>): Action =>
    httpAction('POST', '/goals', {
      body: data,
      expectedStatus: [201, 200],
    }),

  /**
   * Update goal
   */
  update: (goalId: string, data: Record<string, unknown>): Action =>
    httpAction('PUT', `/goals/${goalId}`, {
      body: data,
      expectedStatus: [200],
    }),

  /**
   * Delete goal
   */
  delete: (goalId: string): Action =>
    httpAction('DELETE', `/goals/${goalId}`, {
      expectedStatus: [200, 204],
    }),

  /**
   * Get suggestions
   */
  getSuggestions: (): Action =>
    httpAction('GET', '/goals/suggestions', {
      expectedStatus: [200],
    }),
};

// ============================================================================
// Social Actions
// ============================================================================

export const social = {
  /**
   * Get feed
   */
  getFeed: (params?: { page?: number }): Action => {
    const query = params?.page ? `?page=${params.page}` : '';
    return httpAction('GET', `/feed${query}`, {
      expectedStatus: [200],
    });
  },

  /**
   * Send high five
   */
  highFive: (userId: string): Action =>
    httpAction('POST', `/users/${userId}/high-five`, {
      expectedStatus: [200, 201],
    }),

  /**
   * Follow user
   */
  follow: (userId: string): Action =>
    httpAction('POST', `/users/${userId}/follow`, {
      expectedStatus: [200, 201],
    }),

  /**
   * Unfollow user
   */
  unfollow: (userId: string): Action =>
    httpAction('DELETE', `/users/${userId}/follow`, {
      expectedStatus: [200, 204],
    }),

  /**
   * Block user
   */
  block: (userId: string): Action =>
    httpAction('POST', `/users/${userId}/block`, {
      expectedStatus: [200, 201],
    }),

  /**
   * Get communities
   */
  getCommunities: (): Action =>
    httpAction('GET', '/communities', {
      expectedStatus: [200],
    }),

  /**
   * Join community
   */
  joinCommunity: (communityId: string): Action =>
    httpAction('POST', `/communities/${communityId}/join`, {
      expectedStatus: [200, 201],
    }),
};

// ============================================================================
// Competition Actions
// ============================================================================

export const competitions = {
  /**
   * List competitions
   */
  list: (): Action =>
    httpAction('GET', '/competitions', {
      expectedStatus: [200],
    }),

  /**
   * Create competition
   */
  create: (data: Record<string, unknown>): Action =>
    httpAction('POST', '/competitions', {
      body: data,
      expectedStatus: [201, 200],
    }),

  /**
   * Join competition
   */
  join: (competitionId: string): Action =>
    httpAction('POST', `/competitions/${competitionId}/join`, {
      expectedStatus: [200, 201],
    }),

  /**
   * Get leaderboard
   */
  getLeaderboard: (competitionId: string): Action =>
    httpAction('GET', `/competitions/${competitionId}/leaderboard`, {
      expectedStatus: [200],
    }),
};

// ============================================================================
// Economy Actions
// ============================================================================

export const economy = {
  /**
   * Get balance
   */
  getBalance: (): Action =>
    httpAction('GET', '/economy/balance', {
      expectedStatus: [200],
    }),

  /**
   * Get pricing
   */
  getPricing: (): Action =>
    httpAction('GET', '/economy/pricing', {
      expectedStatus: [200],
    }),

  /**
   * Get transactions
   */
  getTransactions: (): Action =>
    httpAction('GET', '/economy/transactions', {
      expectedStatus: [200],
    }),

  /**
   * Purchase item
   */
  purchase: (itemId: string): Action =>
    httpAction('POST', '/economy/purchase', {
      body: { itemId },
      expectedStatus: [200, 201],
    }),
};

// ============================================================================
// Achievement Actions
// ============================================================================

export const achievements = {
  /**
   * List achievements
   */
  list: (): Action =>
    httpAction('GET', '/achievements', {
      expectedStatus: [200],
    }),

  /**
   * Get user achievements
   */
  getUserAchievements: (): Action =>
    httpAction('GET', '/achievements/me', {
      expectedStatus: [200],
    }),

  /**
   * Claim achievement
   */
  claim: (achievementId: string): Action =>
    httpAction('POST', `/achievements/${achievementId}/claim`, {
      expectedStatus: [200, 201],
    }),
};

// ============================================================================
// GraphQL Actions
// ============================================================================

export const graphql = {
  /**
   * Get user profile via GraphQL
   */
  getProfile: (): Action =>
    graphqlQuery(`
      query GetProfile {
        me {
          id
          email
          username
          level
          experience
          credits
        }
      }
    `),

  /**
   * Get exercises via GraphQL
   */
  getExercises: (limit = 10): Action =>
    graphqlQuery(
      `
      query GetExercises($limit: Int!) {
        exercises(limit: $limit) {
          id
          name
          muscleGroups
          equipment
        }
      }
    `,
      { limit }
    ),

  /**
   * Get workouts via GraphQL
   */
  getWorkouts: (limit = 10): Action =>
    graphqlQuery(
      `
      query GetWorkouts($limit: Int!) {
        workouts(limit: $limit) {
          id
          createdAt
          exercises {
            name
            sets
            reps
          }
        }
      }
    `,
      { limit }
    ),

  /**
   * Create workout via GraphQL
   */
  createWorkout: (exercises: Array<{ exerciseId: string; sets: number; reps: number }>): Action =>
    graphqlMutation(
      `
      mutation CreateWorkout($exercises: [ExerciseInput!]!) {
        createWorkout(exercises: $exercises) {
          id
          createdAt
        }
      }
    `,
      { exercises }
    ),

  /**
   * Update profile via GraphQL
   */
  updateProfile: (data: Record<string, unknown>): Action =>
    graphqlMutation(
      `
      mutation UpdateProfile($data: ProfileInput!) {
        updateProfile(data: $data) {
          id
          username
          bio
        }
      }
    `,
      { data }
    ),
};

// ============================================================================
// Settings Actions
// ============================================================================

export const settings = {
  /**
   * Get settings
   */
  get: (): Action =>
    httpAction('GET', '/settings', {
      expectedStatus: [200],
    }),

  /**
   * Update settings
   */
  update: (data: Record<string, unknown>): Action =>
    httpAction('PUT', '/settings', {
      body: data,
      expectedStatus: [200],
    }),

  /**
   * Get themes
   */
  getThemes: (): Action =>
    httpAction('GET', '/settings/themes', {
      expectedStatus: [200],
    }),

  /**
   * Set theme
   */
  setTheme: (themeId: string): Action =>
    httpAction('PUT', '/settings/theme', {
      body: { themeId },
      expectedStatus: [200],
    }),
};

// ============================================================================
// Health Actions
// ============================================================================

export const health = {
  /**
   * Health check
   */
  check: (): Action =>
    httpAction('GET', '/health', {
      expectedStatus: [200],
    }),

  /**
   * Ready check
   */
  ready: (): Action =>
    httpAction('GET', '/ready', {
      expectedStatus: [200],
    }),

  /**
   * Get metrics
   */
  metrics: (): Action =>
    httpAction('GET', '/metrics', {
      expectedStatus: [200],
    }),
};

// ============================================================================
// Common Assertions
// ============================================================================

export const assertions = {
  /**
   * Response is successful
   */
  isSuccess: () => [
    assert('status').equals(200, 'Response should be successful'),
  ],

  /**
   * Response has data
   */
  hasData: () => [
    assert('data').exists('Response should have data'),
  ],

  /**
   * Response is array
   */
  isArray: (path = 'data') => [
    assert(path).isArray('Response should be an array'),
  ],

  /**
   * Response has items
   */
  hasItems: (path = 'data') => [
    assert(path).isArray(),
    assert(path).custom(
      (v) => Array.isArray(v) && v.length > 0,
      'Response should have items'
    ),
  ],

  /**
   * User is authenticated
   */
  isAuthenticated: () => [
    assert('data.id').exists('User should have ID'),
    assert('data.email').exists('User should have email'),
  ],

  /**
   * Has token
   */
  hasToken: () => [
    assert('data.token').exists('Response should have token'),
  ],
};

// ============================================================================
// Action Sequences (Common Flows)
// ============================================================================

export const flows = {
  /**
   * Complete authentication flow
   */
  authenticate: (email: string, password: string): Action[] => [
    auth.login(email, password),
    setVar('token', (ctx: TestContext) => {
      const lastResult = ctx.results[ctx.results.length - 1];
      const data = lastResult.metadata?.response as { data?: { token?: string }; token?: string };
      return data?.data?.token || data?.token;
    }),
  ],

  /**
   * Create and complete workout flow
   */
  completeWorkout: (workoutData: Record<string, unknown>): Action[] => [
    workouts.create(workoutData),
    setVar('workoutId', (ctx: TestContext) => {
      const lastResult = ctx.results[ctx.results.length - 1];
      const data = lastResult.metadata?.response as { data?: { id?: string }; id?: string };
      return data?.data?.id || data?.id;
    }),
    {
      type: 'http_request',
      name: 'Complete workout',
      params: {
        method: 'POST',
        path: '/workouts/${workoutId}/complete',
        expectedStatus: [200],
      },
    } as Action,
  ],
};

// ============================================================================
// Export All
// ============================================================================

export default {
  auth,
  profile,
  workouts,
  exercises,
  goals,
  social,
  competitions,
  economy,
  achievements,
  graphql,
  settings,
  health,
  assertions,
  flows,
};
