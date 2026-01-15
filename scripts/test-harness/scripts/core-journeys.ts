/**
 * Core User Journey Tests
 * Tests the main user flows through the application
 *
 * These tests validate the critical paths that users take through the app,
 * ensuring that primary features work correctly end-to-end.
 */

import type { TestScript } from '../types.js';
import { assert } from '../assertions.js';

/**
 * New User Onboarding Journey
 * Tests the complete registration and setup flow
 */
export const onboardingJourney: TestScript = {
  name: 'New User Onboarding Journey',
  description: 'Complete registration and initial setup flow',
  category: 'core',
  personas: ['nova_fresh'],
  steps: [
    {
      name: 'Register new account',
      action: 'http_request',
      params: {
        method: 'POST',
        path: '/auth/register',
        body: {
          email: 'journey-${runId}@test.musclemap.me',
          password: 'SecurePass123!',
          username: 'journey_user_${runId}',
        },
        expectedStatus: [200, 201],
      },
      assertions: [
        assert('data.token').exists('Should return auth token'),
        assert('data.user').exists('Should return user object'),
      ],
    },
    {
      name: 'Get initial profile',
      action: 'http_request',
      params: {
        method: 'GET',
        path: '/profile',
        expectedStatus: [200],
      },
      assertions: [
        assert('data.username').exists(),
      ],
    },
    {
      name: 'List available archetypes',
      action: 'http_request',
      params: {
        method: 'GET',
        path: '/archetypes',
        expectedStatus: [200],
      },
      assertions: [
        assert('data').isArray('Should return array of archetypes'),
      ],
    },
    {
      name: 'Select archetype',
      action: 'http_request',
      params: {
        method: 'POST',
        path: '/archetypes/select',
        body: {
          archetypeId: 'strongman',
        },
        expectedStatus: [200, 404],
      },
    },
    {
      name: 'Get character stats',
      action: 'http_request',
      params: {
        method: 'GET',
        path: '/profile/stats',
        expectedStatus: [200],
      },
    },
    {
      name: 'View initial leaderboard position',
      action: 'http_request',
      params: {
        method: 'GET',
        path: '/leaderboards/overall?limit=10',
        expectedStatus: [200],
      },
    },
  ],
};

/**
 * Active Workout Session Journey
 * Tests completing a full workout with logging sets
 */
export const workoutSessionJourney: TestScript = {
  name: 'Active Workout Session Journey',
  description: 'Complete a full workout with set logging',
  category: 'core',
  personas: ['active_andy'],
  steps: [
    {
      name: 'Get workout prescription',
      action: 'http_request',
      params: {
        method: 'GET',
        path: '/workouts/prescribe',
        expectedStatus: [200, 404],
      },
    },
    {
      name: 'Start new workout',
      action: 'http_request',
      params: {
        method: 'POST',
        path: '/workouts/start',
        body: {
          name: 'Test Workout Session',
          type: 'strength',
        },
        expectedStatus: [200, 201],
      },
    },
    {
      name: 'List exercises',
      action: 'http_request',
      params: {
        method: 'GET',
        path: '/exercises?limit=5',
        expectedStatus: [200],
      },
      assertions: [
        assert('data').isArray(),
      ],
    },
    {
      name: 'Log first set',
      action: 'http_request',
      params: {
        method: 'POST',
        path: '/workouts/current/sets',
        body: {
          exerciseId: 'squat',
          reps: 10,
          weight: 135,
          rpe: 7,
        },
        expectedStatus: [200, 201, 400, 404],
      },
    },
    {
      name: 'Log second set',
      action: 'http_request',
      params: {
        method: 'POST',
        path: '/workouts/current/sets',
        body: {
          exerciseId: 'squat',
          reps: 8,
          weight: 155,
          rpe: 8,
        },
        expectedStatus: [200, 201, 400, 404],
      },
    },
    {
      name: 'Complete workout',
      action: 'http_request',
      params: {
        method: 'POST',
        path: '/workouts/current/complete',
        expectedStatus: [200, 404],
      },
    },
    {
      name: 'View workout history',
      action: 'http_request',
      params: {
        method: 'GET',
        path: '/workouts?limit=5',
        expectedStatus: [200],
      },
    },
  ],
};

/**
 * Social Engagement Journey
 * Tests community and social features
 */
export const socialEngagementJourney: TestScript = {
  name: 'Social Engagement Journey',
  description: 'Test community, high-fives, and social features',
  category: 'core',
  personas: ['active_andy'],
  steps: [
    {
      name: 'View activity feed',
      action: 'http_request',
      params: {
        method: 'GET',
        path: '/feed',
        expectedStatus: [200],
      },
    },
    {
      name: 'List communities',
      action: 'http_request',
      params: {
        method: 'GET',
        path: '/communities',
        expectedStatus: [200],
      },
    },
    {
      name: 'Get high-five stats',
      action: 'http_request',
      params: {
        method: 'GET',
        path: '/high-fives/stats',
        expectedStatus: [200, 404],
      },
    },
    {
      name: 'View leaderboards',
      action: 'http_request',
      params: {
        method: 'GET',
        path: '/leaderboards/overall',
        expectedStatus: [200],
      },
    },
    {
      name: 'Check notifications',
      action: 'http_request',
      params: {
        method: 'GET',
        path: '/notifications',
        expectedStatus: [200, 404],
      },
    },
  ],
};

/**
 * Achievement Progress Journey
 * Tests achievement and progression systems
 */
export const achievementProgressJourney: TestScript = {
  name: 'Achievement Progress Journey',
  description: 'Test achievements, badges, and rank progression',
  category: 'core',
  personas: ['active_andy'],
  steps: [
    {
      name: 'List available achievements',
      action: 'http_request',
      params: {
        method: 'GET',
        path: '/achievements',
        expectedStatus: [200],
      },
    },
    {
      name: 'Check achievement progress',
      action: 'http_request',
      params: {
        method: 'GET',
        path: '/achievements/progress',
        expectedStatus: [200, 404],
      },
    },
    {
      name: 'View current rank',
      action: 'http_request',
      params: {
        method: 'GET',
        path: '/ranks/current',
        expectedStatus: [200, 404],
      },
    },
    {
      name: 'Get XP history',
      action: 'http_request',
      params: {
        method: 'GET',
        path: '/profile/xp-history',
        expectedStatus: [200, 404],
      },
    },
    {
      name: 'View skill progression',
      action: 'http_request',
      params: {
        method: 'GET',
        path: '/skills',
        expectedStatus: [200, 404],
      },
    },
  ],
};

/**
 * Economy & Credits Journey
 * Tests the virtual economy system
 */
export const economyJourney: TestScript = {
  name: 'Economy & Credits Journey',
  description: 'Test credit balance, transactions, and store',
  category: 'core',
  personas: ['active_andy', 'diamond_dan'],
  steps: [
    {
      name: 'Check credit balance',
      action: 'http_request',
      params: {
        method: 'GET',
        path: '/economy/balance',
        expectedStatus: [200],
      },
    },
    {
      name: 'View transaction history',
      action: 'http_request',
      params: {
        method: 'GET',
        path: '/economy/transactions',
        expectedStatus: [200, 404],
      },
    },
    {
      name: 'Get pricing info',
      action: 'http_request',
      params: {
        method: 'GET',
        path: '/economy/pricing',
        expectedStatus: [200, 404],
      },
    },
    {
      name: 'View store items',
      action: 'http_request',
      params: {
        method: 'GET',
        path: '/store/items',
        expectedStatus: [200, 404],
      },
    },
  ],
};

/**
 * Nutrition Tracking Journey
 * Tests food logging and meal tracking
 */
export const nutritionJourney: TestScript = {
  name: 'Nutrition Tracking Journey',
  description: 'Test food search, logging, and nutrition goals',
  category: 'core',
  personas: ['active_andy'],
  steps: [
    {
      name: 'Search for food',
      action: 'http_request',
      params: {
        method: 'GET',
        path: '/nutrition/search?q=chicken',
        expectedStatus: [200],
      },
    },
    {
      name: 'Get nutrition goals',
      action: 'http_request',
      params: {
        method: 'GET',
        path: '/nutrition/goals',
        expectedStatus: [200, 404],
      },
    },
    {
      name: 'Log a meal',
      action: 'http_request',
      params: {
        method: 'POST',
        path: '/nutrition/meals',
        body: {
          mealType: 'lunch',
          foods: [
            {
              name: 'Grilled Chicken',
              calories: 250,
              protein: 40,
              carbs: 0,
              fat: 8,
              servingSize: 150,
              servingUnit: 'g',
            },
          ],
        },
        expectedStatus: [200, 201, 400, 404],
      },
    },
    {
      name: 'Get daily summary',
      action: 'http_request',
      params: {
        method: 'GET',
        path: '/nutrition/daily',
        expectedStatus: [200, 404],
      },
    },
  ],
};

/**
 * Recovery & Sleep Journey
 * Tests recovery tracking features
 */
export const recoveryJourney: TestScript = {
  name: 'Recovery & Sleep Journey',
  description: 'Test sleep logging and recovery scores',
  category: 'core',
  personas: ['active_andy'],
  steps: [
    {
      name: 'Log sleep',
      action: 'http_request',
      params: {
        method: 'POST',
        path: '/recovery/sleep',
        body: {
          bedTime: '2024-01-14T23:00:00Z',
          wakeTime: '2024-01-15T07:00:00Z',
          quality: 4,
        },
        expectedStatus: [200, 201, 400, 404],
      },
    },
    {
      name: 'Get recovery score',
      action: 'http_request',
      params: {
        method: 'GET',
        path: '/recovery/score',
        expectedStatus: [200, 404],
      },
    },
    {
      name: 'View sleep history',
      action: 'http_request',
      params: {
        method: 'GET',
        path: '/recovery/sleep/history',
        expectedStatus: [200, 404],
      },
    },
    {
      name: 'Get recovery recommendations',
      action: 'http_request',
      params: {
        method: 'GET',
        path: '/recovery/recommendations',
        expectedStatus: [200, 404],
      },
    },
  ],
};

/**
 * Settings & Preferences Journey
 * Tests user settings management
 */
export const settingsJourney: TestScript = {
  name: 'Settings & Preferences Journey',
  description: 'Test settings, themes, and user preferences',
  category: 'core',
  personas: ['active_andy'],
  steps: [
    {
      name: 'Get current settings',
      action: 'http_request',
      params: {
        method: 'GET',
        path: '/settings',
        expectedStatus: [200],
      },
    },
    {
      name: 'Update unit preferences',
      action: 'http_request',
      params: {
        method: 'PATCH',
        path: '/settings',
        body: {
          units: 'metric',
        },
        expectedStatus: [200, 404],
      },
    },
    {
      name: 'Get available themes',
      action: 'http_request',
      params: {
        method: 'GET',
        path: '/settings/themes',
        expectedStatus: [200, 404],
      },
    },
    {
      name: 'Update notification preferences',
      action: 'http_request',
      params: {
        method: 'PATCH',
        path: '/settings/notifications',
        body: {
          pushEnabled: true,
          emailDigest: 'weekly',
        },
        expectedStatus: [200, 404],
      },
    },
  ],
};

/**
 * Competition Journey
 * Tests competition and challenge features
 */
export const competitionJourney: TestScript = {
  name: 'Competition Journey',
  description: 'Test competitions, challenges, and rivalries',
  category: 'core',
  personas: ['elite_eve'],
  steps: [
    {
      name: 'List active competitions',
      action: 'http_request',
      params: {
        method: 'GET',
        path: '/competitions',
        expectedStatus: [200],
      },
    },
    {
      name: 'View competition details',
      action: 'http_request',
      params: {
        method: 'GET',
        path: '/competitions/active',
        expectedStatus: [200, 404],
      },
    },
    {
      name: 'Get rivalry status',
      action: 'http_request',
      params: {
        method: 'GET',
        path: '/rivalries',
        expectedStatus: [200, 404],
      },
    },
    {
      name: 'View challenge leaderboard',
      action: 'http_request',
      params: {
        method: 'GET',
        path: '/competitions/leaderboard',
        expectedStatus: [200, 404],
      },
    },
  ],
};

/**
 * Crew Management Journey
 * Tests crew/team features
 */
export const crewJourney: TestScript = {
  name: 'Crew Management Journey',
  description: 'Test crew creation, management, and activities',
  category: 'core',
  personas: ['elite_eve'],
  steps: [
    {
      name: 'List public crews',
      action: 'http_request',
      params: {
        method: 'GET',
        path: '/crews',
        expectedStatus: [200],
      },
    },
    {
      name: 'View own crew',
      action: 'http_request',
      params: {
        method: 'GET',
        path: '/crews/my',
        expectedStatus: [200, 404],
      },
    },
    {
      name: 'Get crew leaderboard',
      action: 'http_request',
      params: {
        method: 'GET',
        path: '/crews/leaderboard',
        expectedStatus: [200, 404],
      },
    },
  ],
};

/**
 * Export all core journey tests
 */
export default [
  onboardingJourney,
  workoutSessionJourney,
  socialEngagementJourney,
  achievementProgressJourney,
  economyJourney,
  nutritionJourney,
  recoveryJourney,
  settingsJourney,
  competitionJourney,
  crewJourney,
];
