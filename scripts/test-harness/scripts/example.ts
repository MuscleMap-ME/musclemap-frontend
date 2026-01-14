/**
 * Example Test Scripts
 * Demonstrates how to create test scripts for the test harness
 */

import type { TestScript } from '../types.js';
import { assert } from '../assertions.js';

/**
 * Example: Exercises API Test Suite
 */
export const exercisesTestSuite: TestScript = {
  name: 'Exercises API Tests',
  description: 'Test exercise listing, search, and filtering',
  category: 'exercises',
  personas: ['active_andy', 'nova_fresh'],
  steps: [
    {
      name: 'List all exercises',
      action: 'http_request',
      params: {
        method: 'GET',
        path: '/exercises',
        expectedStatus: [200],
      },
      assertions: [
        assert('status').equals(200),
        assert('data').isArray('Response should be an array'),
      ],
    },
    {
      name: 'Search exercises by name',
      action: 'http_request',
      params: {
        method: 'GET',
        path: '/exercises?search=squat',
        expectedStatus: [200],
      },
      assertions: [
        assert('status').equals(200),
        assert('data').isArray(),
      ],
    },
    {
      name: 'Get exercise by ID',
      action: 'http_request',
      params: {
        method: 'GET',
        path: '/exercises/squat-barbell', // Assuming slug-based IDs
        expectedStatus: [200, 404],
      },
    },
    {
      name: 'Get exercise alternatives',
      action: 'http_request',
      params: {
        method: 'GET',
        path: '/exercises/squat-barbell/alternatives',
        expectedStatus: [200, 404],
      },
    },
  ],
};

/**
 * Example: Profile API Test Suite
 */
export const profileTestSuite: TestScript = {
  name: 'Profile API Tests',
  description: 'Test user profile operations',
  category: 'profile',
  personas: ['active_andy'],
  steps: [
    {
      name: 'Get current user profile',
      action: 'http_request',
      params: {
        method: 'GET',
        path: '/profile',
        expectedStatus: [200, 401],
      },
    },
    {
      name: 'Get user stats',
      action: 'http_request',
      params: {
        method: 'GET',
        path: '/profile/stats',
        expectedStatus: [200, 401],
      },
    },
  ],
};

/**
 * Example: GraphQL Test Suite
 */
export const graphqlTestSuite: TestScript = {
  name: 'GraphQL API Tests',
  description: 'Test GraphQL queries and mutations',
  category: 'graphql',
  personas: ['active_andy'],
  steps: [
    {
      name: 'Query exercises via GraphQL',
      action: 'graphql_query',
      params: {
        query: `
          query GetExercises {
            exercises(limit: 5) {
              id
              name
            }
          }
        `,
      },
      assertions: [
        assert('data.exercises').isArray(),
      ],
    },
    {
      name: 'Query user profile via GraphQL',
      action: 'graphql_query',
      params: {
        query: `
          query GetMe {
            me {
              id
              email
              username
            }
          }
        `,
      },
    },
  ],
};

/**
 * Example: Edge Cases Test Suite
 */
export const edgeCasesTestSuite: TestScript = {
  name: 'Edge Cases Tests',
  description: 'Test boundary conditions and error handling',
  category: 'edge-cases',
  personas: ['nova_fresh'],
  steps: [
    {
      name: 'Access protected route without auth',
      action: 'http_request',
      params: {
        method: 'GET',
        path: '/profile',
        headers: { Authorization: '' }, // Remove auth
        expectedStatus: [401, 403],
      },
    },
    {
      name: 'Request non-existent resource',
      action: 'http_request',
      params: {
        method: 'GET',
        path: '/exercises/definitely-not-a-real-exercise-id-12345',
        expectedStatus: [404],
      },
    },
    {
      name: 'Invalid request body',
      action: 'http_request',
      params: {
        method: 'POST',
        path: '/auth/login',
        body: {}, // Empty body
        expectedStatus: [400, 422],
      },
    },
    {
      name: 'Malformed JSON (simulated)',
      action: 'http_request',
      params: {
        method: 'POST',
        path: '/auth/login',
        body: { email: 'not-an-email', password: '' },
        expectedStatus: [400, 422],
      },
    },
  ],
};

/**
 * Export all test suites
 */
export default [
  exercisesTestSuite,
  profileTestSuite,
  graphqlTestSuite,
  edgeCasesTestSuite,
];
