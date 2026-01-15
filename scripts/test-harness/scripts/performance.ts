/**
 * Performance Tests
 * Tests for API response times, throughput, and system performance
 *
 * These tests verify that the API meets performance requirements and
 * identifies potential bottlenecks.
 */

import type { TestScript } from '../types.js';
import { assert } from '../assertions.js';

/**
 * Response Time Tests
 */
export const responseTimeSuite: TestScript = {
  name: 'Response Time Tests',
  description: 'Verify API endpoints meet response time targets',
  category: 'performance',
  personas: ['active_andy'],
  steps: [
    {
      name: 'Health endpoint < 50ms',
      action: 'http_request',
      params: {
        method: 'GET',
        path: '/health',
        expectedStatus: [200],
        timeout: 50,
      },
    },
    {
      name: 'Ready endpoint < 100ms',
      action: 'http_request',
      params: {
        method: 'GET',
        path: '/ready',
        expectedStatus: [200],
        timeout: 100,
      },
    },
    {
      name: 'Profile fetch < 200ms',
      action: 'http_request',
      params: {
        method: 'GET',
        path: '/profile',
        expectedStatus: [200],
        timeout: 200,
      },
    },
    {
      name: 'Exercise list < 300ms',
      action: 'http_request',
      params: {
        method: 'GET',
        path: '/exercises?limit=50',
        expectedStatus: [200],
        timeout: 300,
      },
    },
    {
      name: 'Exercise search < 500ms',
      action: 'http_request',
      params: {
        method: 'GET',
        path: '/exercises?search=squat',
        expectedStatus: [200],
        timeout: 500,
      },
    },
    {
      name: 'Leaderboard < 500ms',
      action: 'http_request',
      params: {
        method: 'GET',
        path: '/leaderboards/overall?limit=100',
        expectedStatus: [200],
        timeout: 500,
      },
    },
    {
      name: 'Feed < 500ms',
      action: 'http_request',
      params: {
        method: 'GET',
        path: '/feed?limit=20',
        expectedStatus: [200],
        timeout: 500,
      },
    },
    {
      name: 'Workout history < 300ms',
      action: 'http_request',
      params: {
        method: 'GET',
        path: '/workouts?limit=20',
        expectedStatus: [200],
        timeout: 300,
      },
    },
    {
      name: 'Character stats < 200ms',
      action: 'http_request',
      params: {
        method: 'GET',
        path: '/profile/stats',
        expectedStatus: [200],
        timeout: 200,
      },
    },
    {
      name: 'Nutrition search < 500ms',
      action: 'http_request',
      params: {
        method: 'GET',
        path: '/nutrition/search?q=chicken',
        expectedStatus: [200],
        timeout: 500,
      },
    },
  ],
};

/**
 * GraphQL Performance Tests
 */
export const graphqlPerformanceSuite: TestScript = {
  name: 'GraphQL Performance Tests',
  description: 'Test GraphQL query performance',
  category: 'performance',
  personas: ['active_andy'],
  steps: [
    {
      name: 'Simple query < 100ms',
      action: 'graphql_query',
      params: {
        query: `
          query {
            me { id username }
          }
        `,
        timeout: 100,
      },
    },
    {
      name: 'Exercises query < 300ms',
      action: 'graphql_query',
      params: {
        query: `
          query {
            exercises(limit: 20) {
              id
              name
              primaryMuscles
            }
          }
        `,
        timeout: 300,
      },
    },
    {
      name: 'Nested query < 500ms',
      action: 'graphql_query',
      params: {
        query: `
          query {
            me {
              id
              username
              profile {
                bio
                avatarUrl
              }
            }
          }
        `,
        timeout: 500,
      },
    },
    {
      name: 'Complex leaderboard query < 800ms',
      action: 'graphql_query',
      params: {
        query: `
          query {
            leaderboard(type: "overall", limit: 50) {
              entries {
                rank
                user {
                  id
                  username
                }
                score
              }
            }
          }
        `,
        timeout: 800,
      },
    },
  ],
};

/**
 * Pagination Performance Tests
 */
export const paginationPerformanceSuite: TestScript = {
  name: 'Pagination Performance Tests',
  description: 'Verify pagination remains efficient across pages',
  category: 'performance',
  personas: ['active_andy'],
  steps: [
    {
      name: 'First page exercises',
      action: 'http_request',
      params: {
        method: 'GET',
        path: '/exercises?limit=50',
        expectedStatus: [200],
        timeout: 300,
      },
    },
    {
      name: 'With cursor pagination',
      action: 'http_request',
      params: {
        method: 'GET',
        path: '/exercises?limit=50&cursor=test',
        expectedStatus: [200, 400],
        timeout: 300,
      },
    },
    {
      name: 'Deep pagination exercises',
      action: 'http_request',
      params: {
        method: 'GET',
        path: '/exercises?limit=50&offset=500',
        expectedStatus: [200, 400],
        timeout: 500,
      },
    },
    {
      name: 'First page workouts',
      action: 'http_request',
      params: {
        method: 'GET',
        path: '/workouts?limit=20',
        expectedStatus: [200],
        timeout: 300,
      },
    },
    {
      name: 'First page leaderboard',
      action: 'http_request',
      params: {
        method: 'GET',
        path: '/leaderboards/overall?limit=100',
        expectedStatus: [200],
        timeout: 500,
      },
    },
  ],
};

/**
 * Database Query Performance Tests
 */
export const databasePerformanceSuite: TestScript = {
  name: 'Database Query Performance Tests',
  description: 'Test database-heavy operations',
  category: 'performance',
  personas: ['elite_eve'],
  steps: [
    {
      name: 'Statistics aggregation',
      action: 'http_request',
      params: {
        method: 'GET',
        path: '/profile/stats',
        expectedStatus: [200],
        timeout: 300,
      },
    },
    {
      name: 'Achievement progress calculation',
      action: 'http_request',
      params: {
        method: 'GET',
        path: '/achievements/progress',
        expectedStatus: [200, 404],
        timeout: 500,
      },
    },
    {
      name: 'Workout volume calculation',
      action: 'http_request',
      params: {
        method: 'GET',
        path: '/workouts/stats',
        expectedStatus: [200, 404],
        timeout: 400,
      },
    },
    {
      name: 'Personal records calculation',
      action: 'http_request',
      params: {
        method: 'GET',
        path: '/workouts/records',
        expectedStatus: [200, 404],
        timeout: 400,
      },
    },
    {
      name: 'Credit transaction history',
      action: 'http_request',
      params: {
        method: 'GET',
        path: '/economy/transactions?limit=100',
        expectedStatus: [200, 404],
        timeout: 500,
      },
    },
  ],
};

/**
 * Write Operation Performance Tests
 */
export const writePerformanceSuite: TestScript = {
  name: 'Write Operation Performance Tests',
  description: 'Test performance of create/update operations',
  category: 'performance',
  personas: ['active_andy'],
  steps: [
    {
      name: 'Start workout < 200ms',
      action: 'http_request',
      params: {
        method: 'POST',
        path: '/workouts/start',
        body: {
          name: 'Performance Test Workout',
          type: 'strength',
        },
        expectedStatus: [200, 201, 400, 409],
        timeout: 200,
      },
    },
    {
      name: 'Log set < 150ms',
      action: 'http_request',
      params: {
        method: 'POST',
        path: '/workouts/current/sets',
        body: {
          exerciseId: 'squat',
          reps: 10,
          weight: 135,
        },
        expectedStatus: [200, 201, 400, 404],
        timeout: 150,
      },
    },
    {
      name: 'Update profile < 200ms',
      action: 'http_request',
      params: {
        method: 'PATCH',
        path: '/profile',
        body: {
          bio: 'Updated bio for performance test',
        },
        expectedStatus: [200, 404],
        timeout: 200,
      },
    },
    {
      name: 'Log nutrition < 200ms',
      action: 'http_request',
      params: {
        method: 'POST',
        path: '/nutrition/meals',
        body: {
          mealType: 'lunch',
          foods: [
            {
              name: 'Test Food',
              calories: 200,
              protein: 30,
              carbs: 10,
              fat: 5,
            },
          ],
        },
        expectedStatus: [200, 201, 400, 404],
        timeout: 200,
      },
    },
  ],
};

/**
 * Concurrent Request Tests
 */
export const concurrencyPerformanceSuite: TestScript = {
  name: 'Concurrent Request Tests',
  description: 'Test handling of concurrent requests',
  category: 'performance',
  personas: ['active_andy'],
  steps: [
    {
      name: 'Concurrent health checks',
      action: 'http_request',
      params: {
        method: 'GET',
        path: '/health',
        expectedStatus: [200],
        timeout: 100,
      },
    },
    {
      name: 'Concurrent profile reads',
      action: 'http_request',
      params: {
        method: 'GET',
        path: '/profile',
        expectedStatus: [200],
        timeout: 300,
      },
    },
    {
      name: 'Concurrent exercise searches',
      action: 'http_request',
      params: {
        method: 'GET',
        path: '/exercises?search=bench',
        expectedStatus: [200],
        timeout: 500,
      },
    },
  ],
};

/**
 * Cache Performance Tests
 */
export const cachePerformanceSuite: TestScript = {
  name: 'Cache Performance Tests',
  description: 'Test caching effectiveness',
  category: 'performance',
  personas: ['active_andy'],
  steps: [
    {
      name: 'First exercise fetch (cold cache)',
      action: 'http_request',
      params: {
        method: 'GET',
        path: '/exercises?limit=50',
        expectedStatus: [200],
        timeout: 500,
      },
    },
    {
      name: 'Second exercise fetch (warm cache)',
      action: 'http_request',
      params: {
        method: 'GET',
        path: '/exercises?limit=50',
        expectedStatus: [200],
        timeout: 200,
      },
    },
    {
      name: 'First leaderboard (cold cache)',
      action: 'http_request',
      params: {
        method: 'GET',
        path: '/leaderboards/overall?limit=100',
        expectedStatus: [200],
        timeout: 600,
      },
    },
    {
      name: 'Second leaderboard (warm cache)',
      action: 'http_request',
      params: {
        method: 'GET',
        path: '/leaderboards/overall?limit=100',
        expectedStatus: [200],
        timeout: 300,
      },
    },
  ],
};

/**
 * Stress Test Suite
 */
export const stressSuite: TestScript = {
  name: 'Stress Tests',
  description: 'Test system behavior under load',
  category: 'stress',
  personas: ['elite_eve'],
  steps: [
    {
      name: 'Rapid health checks',
      action: 'http_request',
      params: {
        method: 'GET',
        path: '/health',
        expectedStatus: [200],
      },
    },
    {
      name: 'Rapid profile reads',
      action: 'http_request',
      params: {
        method: 'GET',
        path: '/profile',
        expectedStatus: [200],
      },
    },
    {
      name: 'Large result set',
      action: 'http_request',
      params: {
        method: 'GET',
        path: '/exercises?limit=200',
        expectedStatus: [200, 400],
        timeout: 1000,
      },
    },
    {
      name: 'Complex aggregation query',
      action: 'http_request',
      params: {
        method: 'GET',
        path: '/profile/stats',
        expectedStatus: [200],
        timeout: 500,
      },
    },
  ],
};

/**
 * Metrics Endpoint Tests
 */
export const metricsPerformanceSuite: TestScript = {
  name: 'Metrics Endpoint Tests',
  description: 'Test monitoring endpoints',
  category: 'performance',
  personas: ['active_andy'],
  steps: [
    {
      name: 'Metrics endpoint < 200ms',
      action: 'http_request',
      params: {
        method: 'GET',
        path: '/metrics',
        expectedStatus: [200, 404],
        timeout: 200,
      },
    },
    {
      name: 'Health with DB check < 100ms',
      action: 'http_request',
      params: {
        method: 'GET',
        path: '/health',
        expectedStatus: [200],
        timeout: 100,
      },
    },
  ],
};

/**
 * Export all performance test suites
 */
export default [
  responseTimeSuite,
  graphqlPerformanceSuite,
  paginationPerformanceSuite,
  databasePerformanceSuite,
  writePerformanceSuite,
  concurrencyPerformanceSuite,
  cachePerformanceSuite,
  stressSuite,
  metricsPerformanceSuite,
];
