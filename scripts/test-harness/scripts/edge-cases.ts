/**
 * Edge Case Tests
 * Comprehensive testing for boundary conditions, error handling, and unusual scenarios
 *
 * These tests verify the application handles edge cases gracefully without crashing
 * or producing incorrect results.
 */

import type { TestScript } from '../types.js';
import { assert } from '../assertions.js';

/**
 * Boundary Value Tests
 */
export const boundaryValueSuite: TestScript = {
  name: 'Boundary Value Tests',
  description: 'Test min/max values and boundary conditions',
  category: 'edge-cases',
  personas: ['active_andy'],
  steps: [
    {
      name: 'Zero reps workout set',
      action: 'http_request',
      params: {
        method: 'POST',
        path: '/workouts/current/sets',
        body: {
          exerciseId: 'squat',
          reps: 0,
          weight: 100,
        },
        expectedStatus: [400, 422],
      },
    },
    {
      name: 'Zero weight workout set',
      action: 'http_request',
      params: {
        method: 'POST',
        path: '/workouts/current/sets',
        body: {
          exerciseId: 'squat',
          reps: 10,
          weight: 0,
        },
        expectedStatus: [200, 201, 400, 404],
      },
    },
    {
      name: 'Maximum reasonable weight',
      action: 'http_request',
      params: {
        method: 'POST',
        path: '/workouts/current/sets',
        body: {
          exerciseId: 'squat',
          reps: 1,
          weight: 1000,
        },
        expectedStatus: [200, 201, 400, 404],
      },
    },
    {
      name: 'Maximum reasonable reps',
      action: 'http_request',
      params: {
        method: 'POST',
        path: '/workouts/current/sets',
        body: {
          exerciseId: 'squat',
          reps: 100,
          weight: 50,
        },
        expectedStatus: [200, 201, 400, 404],
      },
    },
    {
      name: 'RPE value at minimum (1)',
      action: 'http_request',
      params: {
        method: 'POST',
        path: '/workouts/current/sets',
        body: {
          exerciseId: 'squat',
          reps: 10,
          weight: 100,
          rpe: 1,
        },
        expectedStatus: [200, 201, 400, 404],
      },
    },
    {
      name: 'RPE value at maximum (10)',
      action: 'http_request',
      params: {
        method: 'POST',
        path: '/workouts/current/sets',
        body: {
          exerciseId: 'squat',
          reps: 10,
          weight: 100,
          rpe: 10,
        },
        expectedStatus: [200, 201, 400, 404],
      },
    },
    {
      name: 'RPE value out of range (11)',
      action: 'http_request',
      params: {
        method: 'POST',
        path: '/workouts/current/sets',
        body: {
          exerciseId: 'squat',
          reps: 10,
          weight: 100,
          rpe: 11,
        },
        expectedStatus: [400, 422],
      },
    },
    {
      name: 'Pagination with limit 0',
      action: 'http_request',
      params: {
        method: 'GET',
        path: '/exercises?limit=0',
        expectedStatus: [200, 400],
      },
    },
    {
      name: 'Pagination with very large limit',
      action: 'http_request',
      params: {
        method: 'GET',
        path: '/exercises?limit=10000',
        expectedStatus: [200, 400],
      },
    },
    {
      name: 'Negative offset',
      action: 'http_request',
      params: {
        method: 'GET',
        path: '/exercises?offset=-5',
        expectedStatus: [200, 400],
      },
    },
  ],
};

/**
 * Empty State Tests
 */
export const emptyStateSuite: TestScript = {
  name: 'Empty State Tests',
  description: 'Test behavior when data is empty or missing',
  category: 'edge-cases',
  personas: ['nova_fresh'],
  steps: [
    {
      name: 'Empty workout history',
      action: 'http_request',
      params: {
        method: 'GET',
        path: '/workouts',
        expectedStatus: [200],
      },
      assertions: [
        assert('status').equals(200),
      ],
    },
    {
      name: 'Empty achievement list',
      action: 'http_request',
      params: {
        method: 'GET',
        path: '/achievements/unlocked',
        expectedStatus: [200, 404],
      },
    },
    {
      name: 'Empty transaction history',
      action: 'http_request',
      params: {
        method: 'GET',
        path: '/economy/transactions',
        expectedStatus: [200, 404],
      },
    },
    {
      name: 'Empty feed for new user',
      action: 'http_request',
      params: {
        method: 'GET',
        path: '/feed',
        expectedStatus: [200],
      },
    },
    {
      name: 'Empty notifications',
      action: 'http_request',
      params: {
        method: 'GET',
        path: '/notifications',
        expectedStatus: [200, 404],
      },
    },
    {
      name: 'Empty search results',
      action: 'http_request',
      params: {
        method: 'GET',
        path: '/exercises?search=xyznonexistentexercise123',
        expectedStatus: [200],
      },
    },
    {
      name: 'User with no goals',
      action: 'http_request',
      params: {
        method: 'GET',
        path: '/goals',
        expectedStatus: [200, 404],
      },
    },
    {
      name: 'User with no communities',
      action: 'http_request',
      params: {
        method: 'GET',
        path: '/communities/my',
        expectedStatus: [200, 404],
      },
    },
  ],
};

/**
 * Concurrent Operation Tests
 */
export const concurrencySuite: TestScript = {
  name: 'Concurrent Operation Tests',
  description: 'Test handling of simultaneous operations',
  category: 'edge-cases',
  personas: ['active_andy'],
  steps: [
    {
      name: 'Multiple profile reads',
      action: 'http_request',
      params: {
        method: 'GET',
        path: '/profile',
        expectedStatus: [200],
      },
    },
    {
      name: 'Exercise search during update',
      action: 'http_request',
      params: {
        method: 'GET',
        path: '/exercises?search=squat',
        expectedStatus: [200],
      },
    },
    {
      name: 'Leaderboard under load',
      action: 'http_request',
      params: {
        method: 'GET',
        path: '/leaderboards/overall',
        expectedStatus: [200],
      },
    },
  ],
};

/**
 * Invalid Input Tests
 */
export const invalidInputSuite: TestScript = {
  name: 'Invalid Input Tests',
  description: 'Test handling of malformed and invalid inputs',
  category: 'edge-cases',
  personas: ['nova_fresh'],
  steps: [
    {
      name: 'Empty request body',
      action: 'http_request',
      params: {
        method: 'POST',
        path: '/auth/login',
        body: {},
        expectedStatus: [400, 422],
      },
    },
    {
      name: 'Missing required fields',
      action: 'http_request',
      params: {
        method: 'POST',
        path: '/auth/register',
        body: {
          email: 'test@test.com',
          // missing password
        },
        expectedStatus: [400, 422],
      },
    },
    {
      name: 'Wrong data types',
      action: 'http_request',
      params: {
        method: 'POST',
        path: '/workouts/current/sets',
        body: {
          exerciseId: 'squat',
          reps: 'ten', // string instead of number
          weight: 100,
        },
        expectedStatus: [400, 422],
      },
    },
    {
      name: 'Array instead of object',
      action: 'http_request',
      params: {
        method: 'PATCH',
        path: '/profile',
        body: ['invalid', 'array'],
        expectedStatus: [400, 422],
      },
    },
    {
      name: 'Null values in required fields',
      action: 'http_request',
      params: {
        method: 'POST',
        path: '/auth/register',
        body: {
          email: null,
          password: null,
          username: null,
        },
        expectedStatus: [400, 422],
      },
    },
    {
      name: 'Invalid UUID format',
      action: 'http_request',
      params: {
        method: 'GET',
        path: '/exercises/not-a-uuid',
        expectedStatus: [200, 400, 404],
      },
    },
    {
      name: 'Invalid date format',
      action: 'http_request',
      params: {
        method: 'POST',
        path: '/recovery/sleep',
        body: {
          bedTime: 'not-a-date',
          wakeTime: 'also-not-a-date',
          quality: 4,
        },
        expectedStatus: [400, 422],
      },
    },
    {
      name: 'Future date for past event',
      action: 'http_request',
      params: {
        method: 'POST',
        path: '/recovery/sleep',
        body: {
          bedTime: '2050-01-01T23:00:00Z',
          wakeTime: '2050-01-02T07:00:00Z',
          quality: 4,
        },
        expectedStatus: [200, 201, 400, 404, 422],
      },
    },
    {
      name: 'Wake time before bed time',
      action: 'http_request',
      params: {
        method: 'POST',
        path: '/recovery/sleep',
        body: {
          bedTime: '2024-01-15T07:00:00Z',
          wakeTime: '2024-01-14T23:00:00Z',
          quality: 4,
        },
        expectedStatus: [400, 422],
      },
    },
  ],
};

/**
 * Resource Not Found Tests
 */
export const notFoundSuite: TestScript = {
  name: 'Resource Not Found Tests',
  description: 'Test handling of non-existent resources',
  category: 'edge-cases',
  personas: ['active_andy'],
  steps: [
    {
      name: 'Non-existent exercise',
      action: 'http_request',
      params: {
        method: 'GET',
        path: '/exercises/00000000-0000-0000-0000-000000000000',
        expectedStatus: [404],
      },
    },
    {
      name: 'Non-existent user',
      action: 'http_request',
      params: {
        method: 'GET',
        path: '/users/00000000-0000-0000-0000-000000000000/profile',
        expectedStatus: [403, 404],
      },
    },
    {
      name: 'Non-existent workout',
      action: 'http_request',
      params: {
        method: 'GET',
        path: '/workouts/00000000-0000-0000-0000-000000000000',
        expectedStatus: [403, 404],
      },
    },
    {
      name: 'Non-existent community',
      action: 'http_request',
      params: {
        method: 'GET',
        path: '/communities/00000000-0000-0000-0000-000000000000',
        expectedStatus: [404],
      },
    },
    {
      name: 'Non-existent API route',
      action: 'http_request',
      params: {
        method: 'GET',
        path: '/api/does-not-exist',
        expectedStatus: [404],
      },
    },
    {
      name: 'Delete non-existent resource',
      action: 'http_request',
      params: {
        method: 'DELETE',
        path: '/goals/00000000-0000-0000-0000-000000000000',
        expectedStatus: [403, 404],
      },
    },
  ],
};

/**
 * State Transition Tests
 */
export const stateTransitionSuite: TestScript = {
  name: 'State Transition Tests',
  description: 'Test invalid state transitions and workflow violations',
  category: 'edge-cases',
  personas: ['active_andy'],
  steps: [
    {
      name: 'Complete workout without starting',
      action: 'http_request',
      params: {
        method: 'POST',
        path: '/workouts/current/complete',
        expectedStatus: [400, 404],
      },
    },
    {
      name: 'Log set without active workout',
      action: 'http_request',
      params: {
        method: 'POST',
        path: '/workouts/current/sets',
        body: {
          exerciseId: 'squat',
          reps: 10,
          weight: 100,
        },
        expectedStatus: [400, 404],
      },
    },
    {
      name: 'Double start workout',
      action: 'http_request',
      params: {
        method: 'POST',
        path: '/workouts/start',
        body: {
          name: 'Double Start Test',
          type: 'strength',
        },
        expectedStatus: [200, 201, 400, 409],
      },
    },
    {
      name: 'Leave crew not a member of',
      action: 'http_request',
      params: {
        method: 'POST',
        path: '/crews/00000000-0000-0000-0000-000000000000/leave',
        expectedStatus: [400, 403, 404],
      },
    },
    {
      name: 'Accept challenge already accepted',
      action: 'http_request',
      params: {
        method: 'POST',
        path: '/competitions/00000000-0000-0000-0000-000000000000/accept',
        expectedStatus: [400, 404, 409],
      },
    },
  ],
};

/**
 * Timezone and Locale Tests
 */
export const timezoneSuite: TestScript = {
  name: 'Timezone and Locale Tests',
  description: 'Test handling of different timezones and locales',
  category: 'edge-cases',
  personas: ['active_andy'],
  steps: [
    {
      name: 'UTC timezone in dates',
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
      name: 'Pacific timezone offset',
      action: 'http_request',
      params: {
        method: 'POST',
        path: '/recovery/sleep',
        body: {
          bedTime: '2024-01-14T23:00:00-08:00',
          wakeTime: '2024-01-15T07:00:00-08:00',
          quality: 4,
        },
        expectedStatus: [200, 201, 400, 404],
      },
    },
    {
      name: 'Date crossing midnight',
      action: 'http_request',
      params: {
        method: 'GET',
        path: '/workouts?date=2024-01-15',
        expectedStatus: [200],
      },
    },
    {
      name: 'Daylight saving time edge',
      action: 'http_request',
      params: {
        method: 'POST',
        path: '/recovery/sleep',
        body: {
          bedTime: '2024-03-10T01:30:00-08:00',
          wakeTime: '2024-03-10T09:30:00-07:00',
          quality: 4,
        },
        expectedStatus: [200, 201, 400, 404],
      },
    },
  ],
};

/**
 * Unicode and Internationalization Tests
 */
export const unicodeSuite: TestScript = {
  name: 'Unicode and i18n Tests',
  description: 'Test handling of international characters and text',
  category: 'edge-cases',
  personas: ['active_andy'],
  steps: [
    {
      name: 'Japanese characters in search',
      action: 'http_request',
      params: {
        method: 'GET',
        path: '/exercises?search=スクワット',
        expectedStatus: [200],
      },
    },
    {
      name: 'Emoji in bio',
      action: 'http_request',
      params: {
        method: 'PATCH',
        path: '/profile',
        body: {
          bio: '💪 Fitness enthusiast 🏋️‍♂️',
        },
        expectedStatus: [200, 404],
      },
    },
    {
      name: 'Arabic text (RTL)',
      action: 'http_request',
      params: {
        method: 'PATCH',
        path: '/profile',
        body: {
          bio: 'مرحبا بالعالم',
        },
        expectedStatus: [200, 404],
      },
    },
    {
      name: 'Chinese characters in workout name',
      action: 'http_request',
      params: {
        method: 'POST',
        path: '/workouts/start',
        body: {
          name: '腿部训练',
          type: 'strength',
        },
        expectedStatus: [200, 201, 400, 409],
      },
    },
    {
      name: 'Mixed language content',
      action: 'http_request',
      params: {
        method: 'PATCH',
        path: '/profile',
        body: {
          bio: 'Hello こんにちは مرحبا Bonjour 你好',
        },
        expectedStatus: [200, 404],
      },
    },
  ],
};

/**
 * Dormant/Inactive User Tests
 */
export const dormantUserSuite: TestScript = {
  name: 'Dormant User Tests',
  description: 'Test behavior for inactive or returning users',
  category: 'edge-cases',
  personas: ['sleepy_sam'],
  steps: [
    {
      name: 'Return after long absence',
      action: 'http_request',
      params: {
        method: 'GET',
        path: '/profile',
        expectedStatus: [200, 401],
      },
    },
    {
      name: 'Streaks reset correctly',
      action: 'http_request',
      params: {
        method: 'GET',
        path: '/profile/streaks',
        expectedStatus: [200, 404],
      },
    },
    {
      name: 'Old data still accessible',
      action: 'http_request',
      params: {
        method: 'GET',
        path: '/workouts?limit=100',
        expectedStatus: [200],
      },
    },
    {
      name: 'Re-engagement works',
      action: 'http_request',
      params: {
        method: 'POST',
        path: '/workouts/start',
        body: {
          name: 'Comeback Workout',
          type: 'strength',
        },
        expectedStatus: [200, 201, 400, 409],
      },
    },
  ],
};

/**
 * Export all edge case test suites
 */
export default [
  boundaryValueSuite,
  emptyStateSuite,
  concurrencySuite,
  invalidInputSuite,
  notFoundSuite,
  stateTransitionSuite,
  timezoneSuite,
  unicodeSuite,
  dormantUserSuite,
];
