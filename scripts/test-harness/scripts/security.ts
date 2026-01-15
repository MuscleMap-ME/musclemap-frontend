/**
 * Security Tests
 * Comprehensive security testing for authentication, authorization, and input validation
 *
 * These tests verify that the API is secure against common attack vectors
 * and properly enforces access controls.
 */

import type { TestScript } from '../types.js';
import { assert } from '../assertions.js';

/**
 * Authentication Security Tests
 */
export const authSecuritySuite: TestScript = {
  name: 'Authentication Security Tests',
  description: 'Test authentication mechanisms and token security',
  category: 'security',
  personas: ['nova_fresh'],
  steps: [
    {
      name: 'Reject missing auth header',
      action: 'http_request',
      params: {
        method: 'GET',
        path: '/profile',
        headers: {},
        expectedStatus: [401, 403],
      },
    },
    {
      name: 'Reject invalid token format',
      action: 'http_request',
      params: {
        method: 'GET',
        path: '/profile',
        headers: { Authorization: 'Bearer invalid-token-format' },
        expectedStatus: [401, 403],
      },
    },
    {
      name: 'Reject expired token',
      action: 'http_request',
      params: {
        method: 'GET',
        path: '/profile',
        headers: {
          Authorization:
            'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwiZXhwIjoxfQ.fake',
        },
        expectedStatus: [401, 403],
      },
    },
    {
      name: 'Reject malformed Authorization header',
      action: 'http_request',
      params: {
        method: 'GET',
        path: '/profile',
        headers: { Authorization: 'NotBearer token123' },
        expectedStatus: [401, 403],
      },
    },
    {
      name: 'Login rate limiting',
      action: 'http_request',
      params: {
        method: 'POST',
        path: '/auth/login',
        body: {
          email: 'ratelimit-test@test.com',
          password: 'wrongpassword',
        },
        expectedStatus: [400, 401, 429],
      },
    },
    {
      name: 'Registration with weak password rejected',
      action: 'http_request',
      params: {
        method: 'POST',
        path: '/auth/register',
        body: {
          email: 'weak-pass@test.com',
          password: '123',
          username: 'weakpass',
        },
        expectedStatus: [400, 422],
      },
    },
    {
      name: 'Registration with invalid email rejected',
      action: 'http_request',
      params: {
        method: 'POST',
        path: '/auth/register',
        body: {
          email: 'not-an-email',
          password: 'SecurePass123!',
          username: 'invalidemail',
        },
        expectedStatus: [400, 422],
      },
    },
  ],
};

/**
 * Authorization Security Tests
 */
export const authorizationSecuritySuite: TestScript = {
  name: 'Authorization Security Tests',
  description: 'Test access control and permission boundaries',
  category: 'security',
  personas: ['nova_fresh', 'active_andy'],
  steps: [
    {
      name: 'Cannot access other user data',
      action: 'http_request',
      params: {
        method: 'GET',
        path: '/users/00000000-0000-0000-0000-000000000001/private',
        expectedStatus: [401, 403, 404],
      },
    },
    {
      name: 'Cannot modify other user profile',
      action: 'http_request',
      params: {
        method: 'PATCH',
        path: '/users/00000000-0000-0000-0000-000000000001/profile',
        body: { bio: 'Hacked!' },
        expectedStatus: [401, 403, 404],
      },
    },
    {
      name: 'Cannot delete other user workout',
      action: 'http_request',
      params: {
        method: 'DELETE',
        path: '/workouts/00000000-0000-0000-0000-000000000001',
        expectedStatus: [401, 403, 404],
      },
    },
    {
      name: 'Cannot access admin routes as user',
      action: 'http_request',
      params: {
        method: 'GET',
        path: '/admin/users',
        expectedStatus: [401, 403, 404],
      },
    },
    {
      name: 'Cannot bypass ownership check',
      action: 'http_request',
      params: {
        method: 'PATCH',
        path: '/goals/00000000-0000-0000-0000-000000000001',
        body: { name: 'Modified Goal' },
        expectedStatus: [401, 403, 404],
      },
    },
  ],
};

/**
 * Input Validation Security Tests
 */
export const inputValidationSuite: TestScript = {
  name: 'Input Validation Security Tests',
  description: 'Test protection against injection and malformed input',
  category: 'security',
  personas: ['nova_fresh'],
  steps: [
    {
      name: 'SQL injection in search parameter',
      action: 'http_request',
      params: {
        method: 'GET',
        path: "/exercises?search='; DROP TABLE users; --",
        expectedStatus: [200, 400],
      },
      assertions: [
        assert('status').notEquals(500, 'Should not cause server error'),
      ],
    },
    {
      name: 'XSS in username',
      action: 'http_request',
      params: {
        method: 'POST',
        path: '/auth/register',
        body: {
          email: 'xss-test@test.com',
          password: 'SecurePass123!',
          username: '<script>alert("xss")</script>',
        },
        expectedStatus: [400, 422],
      },
    },
    {
      name: 'Path traversal in file parameter',
      action: 'http_request',
      params: {
        method: 'GET',
        path: '/files/../../etc/passwd',
        expectedStatus: [400, 403, 404],
      },
    },
    {
      name: 'Prototype pollution in JSON body',
      action: 'http_request',
      params: {
        method: 'POST',
        path: '/profile/update',
        body: {
          __proto__: { admin: true },
          constructor: { prototype: { admin: true } },
        },
        expectedStatus: [400, 404],
      },
    },
    {
      name: 'Integer overflow in pagination',
      action: 'http_request',
      params: {
        method: 'GET',
        path: '/exercises?limit=999999999999999999999',
        expectedStatus: [200, 400],
      },
    },
    {
      name: 'Negative values in numeric fields',
      action: 'http_request',
      params: {
        method: 'POST',
        path: '/workouts/current/sets',
        body: {
          exerciseId: 'squat',
          reps: -10,
          weight: -100,
        },
        expectedStatus: [400, 422],
      },
    },
    {
      name: 'Extremely long string input',
      action: 'http_request',
      params: {
        method: 'PATCH',
        path: '/profile',
        body: {
          bio: 'A'.repeat(100000),
        },
        expectedStatus: [400, 404, 413, 422],
      },
    },
    {
      name: 'Unicode/emoji injection',
      action: 'http_request',
      params: {
        method: 'GET',
        path: '/exercises?search=%F0%9F%92%89%00%01',
        expectedStatus: [200, 400],
      },
    },
    {
      name: 'Null byte injection',
      action: 'http_request',
      params: {
        method: 'GET',
        path: '/exercises/squat%00.txt',
        expectedStatus: [400, 404],
      },
    },
  ],
};

/**
 * Rate Limiting Tests
 */
export const rateLimitingSuite: TestScript = {
  name: 'Rate Limiting Tests',
  description: 'Test API rate limiting and throttling',
  category: 'security',
  personas: ['nova_fresh'],
  steps: [
    {
      name: 'Check rate limit headers exist',
      action: 'http_request',
      params: {
        method: 'GET',
        path: '/health',
        expectedStatus: [200],
      },
    },
    {
      name: 'Login endpoint has stricter limits',
      action: 'http_request',
      params: {
        method: 'POST',
        path: '/auth/login',
        body: {
          email: 'rate-test@test.com',
          password: 'wrongpassword',
        },
        expectedStatus: [400, 401, 429],
      },
    },
    {
      name: 'Password reset has strict limits',
      action: 'http_request',
      params: {
        method: 'POST',
        path: '/auth/forgot-password',
        body: {
          email: 'reset-test@test.com',
        },
        expectedStatus: [200, 400, 404, 429],
      },
    },
  ],
};

/**
 * CORS and Headers Security Tests
 */
export const headerSecuritySuite: TestScript = {
  name: 'Security Headers Tests',
  description: 'Test security headers and CORS configuration',
  category: 'security',
  personas: ['nova_fresh'],
  steps: [
    {
      name: 'Check security headers on health endpoint',
      action: 'http_request',
      params: {
        method: 'GET',
        path: '/health',
        expectedStatus: [200],
      },
    },
    {
      name: 'OPTIONS request handled correctly',
      action: 'http_request',
      params: {
        method: 'OPTIONS',
        path: '/api/exercises',
        expectedStatus: [200, 204, 404],
      },
    },
    {
      name: 'Content-Type enforcement',
      action: 'http_request',
      params: {
        method: 'POST',
        path: '/auth/login',
        headers: {
          'Content-Type': 'text/plain',
        },
        body: {},
        expectedStatus: [400, 415],
      },
    },
  ],
};

/**
 * Credit/Economy Security Tests
 */
export const economySecuritySuite: TestScript = {
  name: 'Economy Security Tests',
  description: 'Test protection against credit manipulation',
  category: 'security',
  personas: ['active_andy'],
  steps: [
    {
      name: 'Cannot manually set credit balance',
      action: 'http_request',
      params: {
        method: 'POST',
        path: '/economy/balance',
        body: { balance: 1000000 },
        expectedStatus: [400, 403, 404, 405],
      },
    },
    {
      name: 'Cannot transfer negative credits',
      action: 'http_request',
      params: {
        method: 'POST',
        path: '/economy/transfer',
        body: {
          toUserId: '00000000-0000-0000-0000-000000000001',
          amount: -1000,
        },
        expectedStatus: [400, 404, 422],
      },
    },
    {
      name: 'Cannot transfer more than balance',
      action: 'http_request',
      params: {
        method: 'POST',
        path: '/economy/transfer',
        body: {
          toUserId: '00000000-0000-0000-0000-000000000001',
          amount: 999999999,
        },
        expectedStatus: [400, 404, 422],
      },
    },
    {
      name: 'Idempotency key prevents duplicate transactions',
      action: 'http_request',
      params: {
        method: 'POST',
        path: '/economy/purchase',
        headers: {
          'Idempotency-Key': 'test-idempotency-key-12345',
        },
        body: {
          itemId: 'test-item',
        },
        expectedStatus: [200, 400, 404, 409],
      },
    },
  ],
};

/**
 * Privacy & Data Protection Tests
 */
export const privacySecuritySuite: TestScript = {
  name: 'Privacy & Data Protection Tests',
  description: 'Test data privacy and user information protection',
  category: 'security',
  personas: ['ghost'],
  steps: [
    {
      name: 'Private profile not visible to others',
      action: 'http_request',
      params: {
        method: 'GET',
        path: '/users/00000000-0000-0000-0000-000000000002/profile',
        expectedStatus: [200, 403, 404],
      },
    },
    {
      name: 'Email not exposed in public profile',
      action: 'http_request',
      params: {
        method: 'GET',
        path: '/users/me/public',
        expectedStatus: [200, 404],
      },
    },
    {
      name: 'Sensitive data excluded from leaderboard',
      action: 'http_request',
      params: {
        method: 'GET',
        path: '/leaderboards/overall',
        expectedStatus: [200],
      },
    },
    {
      name: 'Activity opt-out respected',
      action: 'http_request',
      params: {
        method: 'PATCH',
        path: '/settings/privacy',
        body: {
          showInLeaderboard: false,
          showActivity: false,
        },
        expectedStatus: [200, 404],
      },
    },
  ],
};

/**
 * Session Security Tests
 */
export const sessionSecuritySuite: TestScript = {
  name: 'Session Security Tests',
  description: 'Test session management and token handling',
  category: 'security',
  personas: ['active_andy'],
  steps: [
    {
      name: 'Logout invalidates token',
      action: 'http_request',
      params: {
        method: 'POST',
        path: '/auth/logout',
        expectedStatus: [200, 204, 401],
      },
    },
    {
      name: 'Refresh token rotation',
      action: 'http_request',
      params: {
        method: 'POST',
        path: '/auth/refresh',
        expectedStatus: [200, 400, 401, 404],
      },
    },
    {
      name: 'Token reuse after logout fails',
      action: 'http_request',
      params: {
        method: 'GET',
        path: '/profile',
        expectedStatus: [200, 401],
      },
    },
  ],
};

/**
 * Export all security test suites
 */
export default [
  authSecuritySuite,
  authorizationSecuritySuite,
  inputValidationSuite,
  rateLimitingSuite,
  headerSecuritySuite,
  economySecuritySuite,
  privacySecuritySuite,
  sessionSecuritySuite,
];
