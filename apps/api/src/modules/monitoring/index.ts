/**
 * Monitoring & Testing Module
 *
 * Comprehensive system health monitoring, API testing, user journey tracing,
 * and error tracking for the MuscleMap platform.
 */

import crypto from 'crypto';
import { query, queryOne, queryAll } from '../../db/client';
import { loggers } from '../../lib/logger';

const log = loggers.core;

// ============================================
// TYPES
// ============================================

export interface TestResult {
  id: string;
  name: string;
  category: string;
  status: 'pass' | 'fail' | 'skip' | 'error';
  duration: number;
  message?: string;
  details?: Record<string, unknown>;
  timestamp: Date;
}

export interface TestSuite {
  id: string;
  name: string;
  startedAt: Date;
  completedAt?: Date;
  totalTests: number;
  passed: number;
  failed: number;
  skipped: number;
  errors: number;
  results: TestResult[];
  environment: string;
}

export interface UserJourney {
  id: string;
  sessionId: string;
  userId?: string;
  startedAt: Date;
  endedAt?: Date;
  steps: JourneyStep[];
  errors: JourneyError[];
  metadata: Record<string, unknown>;
}

export interface JourneyStep {
  id: string;
  timestamp: Date;
  type: 'navigation' | 'action' | 'api_call' | 'render' | 'interaction';
  name: string;
  path?: string;
  duration?: number;
  details?: Record<string, unknown>;
  screenshot?: string;
}

export interface JourneyError {
  id: string;
  timestamp: Date;
  type: 'js_error' | 'api_error' | 'render_error' | 'network_error';
  message: string;
  stack?: string;
  componentStack?: string;
  context?: Record<string, unknown>;
}

export interface HealthCheck {
  name: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  latency?: number;
  message?: string;
  lastChecked: Date;
}

export interface SystemHealth {
  overall: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: Date;
  uptime: number;
  checks: HealthCheck[];
  metrics: {
    requestsPerMinute: number;
    averageResponseTime: number;
    errorRate: number;
    activeUsers: number;
  };
}

// ============================================
// API TEST DEFINITIONS
// ============================================

interface APITest {
  name: string;
  category: string;
  query: string;
  variables?: Record<string, unknown>;
  requiresAuth?: boolean;
  expectedFields?: string[];
  validator?: (data: unknown) => boolean;
}

const API_TESTS: APITest[] = [
  // Health & Status
  {
    name: 'Health Check',
    category: 'core',
    query: '{ health { status timestamp } }',
    expectedFields: ['health.status', 'health.timestamp'],
    validator: (data: any) => data?.health?.status === 'healthy',
  },

  // Exercises
  {
    name: 'List Exercises',
    category: 'exercises',
    query: '{ exercises(limit: 5) { id name type primaryMuscles difficulty } }',
    expectedFields: ['exercises'],
    validator: (data: any) => Array.isArray(data?.exercises) && data.exercises.length > 0,
  },
  {
    name: 'Search Exercises',
    category: 'exercises',
    query: '{ exercises(search: "push", limit: 5) { id name } }',
    expectedFields: ['exercises'],
    validator: (data: any) => Array.isArray(data?.exercises),
  },
  {
    name: 'Get Single Exercise',
    category: 'exercises',
    query: '{ exercise(id: "bw-pushup") { id name description primaryMuscles equipment } }',
    expectedFields: ['exercise.id', 'exercise.name'],
    validator: (data: any) => data?.exercise?.id === 'bw-pushup',
  },

  // Muscles
  {
    name: 'List Muscles',
    category: 'muscles',
    query: '{ muscles { id name group } }',
    expectedFields: ['muscles'],
    validator: (data: any) => Array.isArray(data?.muscles) && data.muscles.length > 20,
  },

  // Community Stats (Public)
  {
    name: 'Public Community Stats',
    category: 'community',
    query: '{ publicCommunityStats { totalUsers { value display } totalWorkouts { value display } activeNow { value display } } }',
    expectedFields: ['publicCommunityStats.totalUsers', 'publicCommunityStats.totalWorkouts'],
    validator: (data: any) => data?.publicCommunityStats?.totalUsers !== undefined,
  },

  // Archetypes
  {
    name: 'List Archetypes',
    category: 'archetypes',
    query: '{ archetypes { id name description icon color } }',
    expectedFields: ['archetypes'],
    validator: (data: any) => Array.isArray(data?.archetypes),
  },

  // Auth Required Tests
  {
    name: 'Get Current User',
    category: 'auth',
    query: '{ me { id email username level } }',
    requiresAuth: true,
    expectedFields: ['me.id', 'me.email'],
  },
  {
    name: 'User Capabilities',
    category: 'auth',
    query: '{ myCapabilities { canCreateWorkout canJoinHangouts isAdmin } }',
    requiresAuth: true,
    expectedFields: ['myCapabilities.canCreateWorkout'],
  },
  {
    name: 'User Workouts',
    category: 'workouts',
    query: '{ myWorkouts(limit: 5) { id exercises { exerciseId name } createdAt } }',
    requiresAuth: true,
    expectedFields: ['myWorkouts'],
  },
  {
    name: 'Workout Stats',
    category: 'workouts',
    query: '{ myWorkoutStats { totalWorkouts currentStreak longestStreak } }',
    requiresAuth: true,
    expectedFields: ['myWorkoutStats.totalWorkouts'],
  },
  {
    name: 'User Goals',
    category: 'goals',
    query: '{ goals { id title target current status } }',
    requiresAuth: true,
    expectedFields: ['goals'],
  },
  {
    name: 'User Journey',
    category: 'journey',
    query: '{ journey { currentLevel currentXP xpToNextLevel archetype { name } } }',
    requiresAuth: true,
    expectedFields: ['journey.currentLevel'],
  },
  {
    name: 'Character Stats',
    category: 'stats',
    query: '{ myStats { level xp strength endurance agility totalWorkouts currentStreak } }',
    requiresAuth: true,
    expectedFields: ['myStats.level'],
  },
  {
    name: 'Leaderboards',
    category: 'stats',
    query: '{ leaderboards(type: "xp") { rank userId username level xp } }',
    requiresAuth: true,
    expectedFields: ['leaderboards'],
  },
  {
    name: 'Credits Balance',
    category: 'economy',
    query: '{ creditsBalance { credits pending lifetime } }',
    requiresAuth: true,
    expectedFields: ['creditsBalance.credits'],
  },
  {
    name: 'Tips',
    category: 'tips',
    query: '{ tips(context: "dashboard") { id type title content } }',
    requiresAuth: true,
    expectedFields: ['tips'],
  },
];

// ============================================
// TEST RUNNER
// ============================================

export async function runAPITests(options: {
  baseUrl: string;
  authToken?: string;
  categories?: string[];
  verbose?: boolean;
}): Promise<TestSuite> {
  const { baseUrl, authToken, categories, verbose = false } = options;
  const suiteId = `suite_${crypto.randomBytes(8).toString('hex')}`;

  const suite: TestSuite = {
    id: suiteId,
    name: 'MuscleMap GraphQL API Tests',
    startedAt: new Date(),
    totalTests: 0,
    passed: 0,
    failed: 0,
    skipped: 0,
    errors: 0,
    results: [],
    environment: baseUrl.includes('localhost') ? 'development' : 'production',
  };

  const testsToRun = categories
    ? API_TESTS.filter((t) => categories.includes(t.category))
    : API_TESTS;

  for (const test of testsToRun) {
    suite.totalTests++;

    // Skip auth-required tests if no token
    if (test.requiresAuth && !authToken) {
      suite.skipped++;
      suite.results.push({
        id: `test_${crypto.randomBytes(6).toString('hex')}`,
        name: test.name,
        category: test.category,
        status: 'skip',
        duration: 0,
        message: 'Requires authentication',
        timestamp: new Date(),
      });
      continue;
    }

    const startTime = Date.now();
    let result: TestResult;

    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (test.requiresAuth && authToken) {
        headers['Authorization'] = `Bearer ${authToken}`;
      }

      const response = await fetch(`${baseUrl}/api/graphql`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          query: test.query,
          variables: test.variables,
        }),
      });

      const duration = Date.now() - startTime;
      const json = await response.json() as { data?: any; errors?: Array<{ message: string }> };

      if (json.errors && json.errors.length > 0) {
        // GraphQL errors
        suite.failed++;
        result = {
          id: `test_${crypto.randomBytes(6).toString('hex')}`,
          name: test.name,
          category: test.category,
          status: 'fail',
          duration,
          message: json.errors[0].message,
          details: { errors: json.errors },
          timestamp: new Date(),
        };
      } else if (test.validator && !test.validator(json.data)) {
        // Validation failed
        suite.failed++;
        result = {
          id: `test_${crypto.randomBytes(6).toString('hex')}`,
          name: test.name,
          category: test.category,
          status: 'fail',
          duration,
          message: 'Response validation failed',
          details: { data: json.data },
          timestamp: new Date(),
        };
      } else {
        // Success
        suite.passed++;
        result = {
          id: `test_${crypto.randomBytes(6).toString('hex')}`,
          name: test.name,
          category: test.category,
          status: 'pass',
          duration,
          details: verbose ? { data: json.data } : undefined,
          timestamp: new Date(),
        };
      }
    } catch (error: any) {
      const duration = Date.now() - startTime;
      suite.errors++;
      result = {
        id: `test_${crypto.randomBytes(6).toString('hex')}`,
        name: test.name,
        category: test.category,
        status: 'error',
        duration,
        message: error.message,
        details: { stack: error.stack },
        timestamp: new Date(),
      };
    }

    suite.results.push(result);

    if (verbose) {
      log.info({ test: test.name, status: result.status, duration: result.duration }, 'Test completed');
    }
  }

  suite.completedAt = new Date();

  // Store results in database
  await storeTestSuite(suite);

  return suite;
}

// ============================================
// USER JOURNEY TRACKING
// ============================================

const activeJourneys = new Map<string, UserJourney>();

export function startJourney(sessionId: string, userId?: string, metadata?: Record<string, unknown>): UserJourney {
  const journey: UserJourney = {
    id: `journey_${crypto.randomBytes(12).toString('hex')}`,
    sessionId,
    userId,
    startedAt: new Date(),
    steps: [],
    errors: [],
    metadata: metadata || {},
  };

  activeJourneys.set(sessionId, journey);
  return journey;
}

export function addJourneyStep(
  sessionId: string,
  step: Omit<JourneyStep, 'id' | 'timestamp'>
): JourneyStep | null {
  const journey = activeJourneys.get(sessionId);
  if (!journey) return null;

  const journeyStep: JourneyStep = {
    id: `step_${crypto.randomBytes(8).toString('hex')}`,
    timestamp: new Date(),
    ...step,
  };

  journey.steps.push(journeyStep);
  return journeyStep;
}

export function addJourneyError(
  sessionId: string,
  error: Omit<JourneyError, 'id' | 'timestamp'>
): JourneyError | null {
  const journey = activeJourneys.get(sessionId);
  if (!journey) return null;

  const journeyError: JourneyError = {
    id: `err_${crypto.randomBytes(8).toString('hex')}`,
    timestamp: new Date(),
    ...error,
  };

  journey.errors.push(journeyError);
  return journeyError;
}

export async function endJourney(sessionId: string): Promise<UserJourney | null> {
  const journey = activeJourneys.get(sessionId);
  if (!journey) return null;

  journey.endedAt = new Date();
  activeJourneys.delete(sessionId);

  // Store in database
  await storeJourney(journey);

  return journey;
}

export function getActiveJourney(sessionId: string): UserJourney | null {
  return activeJourneys.get(sessionId) || null;
}

// ============================================
// ERROR TRACKING
// ============================================

interface TrackedError {
  id: string;
  type: string;
  message: string;
  stack?: string;
  userId?: string;
  sessionId?: string;
  path?: string;
  userAgent?: string;
  timestamp: Date;
  context?: Record<string, unknown>;
  resolved: boolean;
  occurrences: number;
}

export async function trackError(error: Omit<TrackedError, 'id' | 'timestamp' | 'resolved' | 'occurrences'>): Promise<TrackedError> {
  const errorId = `error_${crypto.randomBytes(12).toString('hex')}`;
  const trackedError: TrackedError = {
    id: errorId,
    timestamp: new Date(),
    resolved: false,
    occurrences: 1,
    ...error,
  };

  // Check for existing similar error
  const errorHash = hashError(error.type, error.message, error.stack);

  try {
    const existing = await queryOne<{ id: string; occurrences: number }>(
      `SELECT id, occurrences FROM tracked_errors WHERE error_hash = $1 AND resolved = false`,
      [errorHash]
    );

    if (existing) {
      // Increment occurrences
      await query(
        `UPDATE tracked_errors SET occurrences = occurrences + 1, last_seen_at = NOW() WHERE id = $1`,
        [existing.id]
      );
      trackedError.id = existing.id;
      trackedError.occurrences = existing.occurrences + 1;
    } else {
      // Insert new error
      await query(
        `INSERT INTO tracked_errors (id, error_hash, type, message, stack, user_id, session_id, path, user_agent, context, occurrences)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 1)`,
        [
          errorId,
          errorHash,
          error.type,
          error.message,
          error.stack,
          error.userId,
          error.sessionId,
          error.path,
          error.userAgent,
          JSON.stringify(error.context || {}),
        ]
      );
    }
  } catch (dbError) {
    log.error({ error: dbError }, 'Failed to store tracked error');
  }

  return trackedError;
}

function hashError(type: string, message: string, stack?: string): string {
  const content = `${type}:${message}:${stack?.split('\n')[0] || ''}`;
  return crypto.createHash('sha256').update(content).digest('hex').substring(0, 16);
}

export async function getRecentErrors(limit: number = 50): Promise<TrackedError[]> {
  try {
    const errors = await queryAll<any>(
      `SELECT id, type, message, stack, user_id as "userId", session_id as "sessionId",
              path, user_agent as "userAgent", context, resolved, occurrences,
              created_at as timestamp
       FROM tracked_errors
       ORDER BY created_at DESC
       LIMIT $1`,
      [limit]
    );

    return errors.map((e) => ({
      ...e,
      context: typeof e.context === 'string' ? JSON.parse(e.context) : e.context,
      timestamp: new Date(e.timestamp),
    }));
  } catch {
    return [];
  }
}

export async function resolveError(errorId: string): Promise<boolean> {
  try {
    await query(`UPDATE tracked_errors SET resolved = true, resolved_at = NOW() WHERE id = $1`, [errorId]);
    return true;
  } catch {
    return false;
  }
}

// ============================================
// SYSTEM HEALTH
// ============================================

export async function getSystemHealth(): Promise<SystemHealth> {
  const _startTime = process.hrtime();
  const checks: HealthCheck[] = [];

  // Database check
  const dbStart = Date.now();
  try {
    await queryOne('SELECT 1');
    checks.push({
      name: 'database',
      status: 'healthy',
      latency: Date.now() - dbStart,
      lastChecked: new Date(),
    });
  } catch (error: any) {
    checks.push({
      name: 'database',
      status: 'unhealthy',
      message: error.message,
      lastChecked: new Date(),
    });
  }

  // GraphQL endpoint check
  const gqlStart = Date.now();
  try {
    const response = await fetch(`http://localhost:${process.env.PORT || 3001}/api/graphql`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: '{ health { status } }' }),
    });
    const json = await response.json() as { data?: { health?: { status?: string } } };
    checks.push({
      name: 'graphql',
      status: json.data?.health?.status === 'healthy' ? 'healthy' : 'degraded',
      latency: Date.now() - gqlStart,
      lastChecked: new Date(),
    });
  } catch (error: any) {
    checks.push({
      name: 'graphql',
      status: 'unhealthy',
      message: error.message,
      lastChecked: new Date(),
    });
  }

  // Memory check
  const memUsage = process.memoryUsage();
  const memPercent = (memUsage.heapUsed / memUsage.heapTotal) * 100;
  checks.push({
    name: 'memory',
    status: memPercent > 90 ? 'unhealthy' : memPercent > 75 ? 'degraded' : 'healthy',
    message: `${Math.round(memPercent)}% heap used`,
    lastChecked: new Date(),
  });

  // Get metrics from database
  let metrics = {
    requestsPerMinute: 0,
    averageResponseTime: 0,
    errorRate: 0,
    activeUsers: 0,
  };

  try {
    const requestStats = await queryOne<{ count: string; avg_time: string }>(
      `SELECT COUNT(*)::int as count, AVG(response_time)::int as avg_time
       FROM request_logs WHERE created_at > NOW() - INTERVAL '1 minute'`
    );
    metrics.requestsPerMinute = parseInt(requestStats?.count || '0');
    metrics.averageResponseTime = parseInt(requestStats?.avg_time || '0');

    const errorStats = await queryOne<{ error_count: string; total_count: string }>(
      `SELECT
         COUNT(*) FILTER (WHERE status_code >= 500)::int as error_count,
         COUNT(*)::int as total_count
       FROM request_logs WHERE created_at > NOW() - INTERVAL '5 minutes'`
    );
    const errorCount = parseInt(errorStats?.error_count || '0');
    const totalCount = parseInt(errorStats?.total_count || '1');
    metrics.errorRate = (errorCount / totalCount) * 100;

    const activeUsers = await queryOne<{ count: string }>(
      `SELECT COUNT(DISTINCT user_id)::int as count
       FROM request_logs WHERE created_at > NOW() - INTERVAL '5 minutes' AND user_id IS NOT NULL`
    );
    metrics.activeUsers = parseInt(activeUsers?.count || '0');
  } catch {
    // Metrics tables may not exist yet
  }

  // Determine overall health
  const unhealthyCount = checks.filter((c) => c.status === 'unhealthy').length;
  const degradedCount = checks.filter((c) => c.status === 'degraded').length;
  const overall = unhealthyCount > 0 ? 'unhealthy' : degradedCount > 0 ? 'degraded' : 'healthy';

  return {
    overall,
    timestamp: new Date(),
    uptime: process.uptime(),
    checks,
    metrics,
  };
}

// ============================================
// DATABASE STORAGE
// ============================================

async function storeTestSuite(suite: TestSuite): Promise<void> {
  try {
    await query(
      `INSERT INTO test_suites (id, name, started_at, completed_at, total_tests, passed, failed, skipped, errors, results, environment)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
      [
        suite.id,
        suite.name,
        suite.startedAt,
        suite.completedAt,
        suite.totalTests,
        suite.passed,
        suite.failed,
        suite.skipped,
        suite.errors,
        JSON.stringify(suite.results),
        suite.environment,
      ]
    );
  } catch (error) {
    log.error({ error }, 'Failed to store test suite');
  }
}

async function storeJourney(journey: UserJourney): Promise<void> {
  try {
    await query(
      `INSERT INTO user_journeys (id, session_id, user_id, started_at, ended_at, steps, errors, metadata)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        journey.id,
        journey.sessionId,
        journey.userId,
        journey.startedAt,
        journey.endedAt,
        JSON.stringify(journey.steps),
        JSON.stringify(journey.errors),
        JSON.stringify(journey.metadata),
      ]
    );
  } catch (error) {
    log.error({ error }, 'Failed to store user journey');
  }
}

// ============================================
// REPORTS
// ============================================

export async function getTestHistory(limit: number = 20): Promise<TestSuite[]> {
  try {
    const suites = await queryAll<any>(
      `SELECT id, name, started_at as "startedAt", completed_at as "completedAt",
              total_tests as "totalTests", passed, failed, skipped, errors, results, environment
       FROM test_suites
       ORDER BY started_at DESC
       LIMIT $1`,
      [limit]
    );

    return suites.map((s) => ({
      ...s,
      startedAt: new Date(s.startedAt),
      completedAt: s.completedAt ? new Date(s.completedAt) : undefined,
      results: typeof s.results === 'string' ? JSON.parse(s.results) : s.results,
    }));
  } catch {
    return [];
  }
}

export async function getJourneyHistory(options: {
  userId?: string;
  limit?: number;
  hasErrors?: boolean;
}): Promise<UserJourney[]> {
  const { userId, limit = 50, hasErrors } = options;

  try {
    let sql = `SELECT id, session_id as "sessionId", user_id as "userId",
                      started_at as "startedAt", ended_at as "endedAt",
                      steps, errors, metadata
               FROM user_journeys WHERE 1=1`;
    const params: unknown[] = [];
    let paramIndex = 1;

    if (userId) {
      sql += ` AND user_id = $${paramIndex}`;
      params.push(userId);
      paramIndex++;
    }

    if (hasErrors) {
      sql += ` AND jsonb_array_length(errors::jsonb) > 0`;
    }

    sql += ` ORDER BY started_at DESC LIMIT $${paramIndex}`;
    params.push(limit);

    const journeys = await queryAll<any>(sql, params);

    return journeys.map((j) => ({
      ...j,
      startedAt: new Date(j.startedAt),
      endedAt: j.endedAt ? new Date(j.endedAt) : undefined,
      steps: typeof j.steps === 'string' ? JSON.parse(j.steps) : j.steps,
      errors: typeof j.errors === 'string' ? JSON.parse(j.errors) : j.errors,
      metadata: typeof j.metadata === 'string' ? JSON.parse(j.metadata) : j.metadata,
    }));
  } catch {
    return [];
  }
}

export async function getDashboardStats(): Promise<{
  testsRun24h: number;
  testPassRate: number;
  journeysTracked24h: number;
  journeysWithErrors: number;
  unresolvedErrors: number;
  topErrors: Array<{ message: string; occurrences: number }>;
  recentFailedTests: TestResult[];
}> {
  try {
    // Test stats
    const testStats = await queryOne<{ total: string; passed: string }>(
      `SELECT SUM(total_tests)::int as total, SUM(passed)::int as passed
       FROM test_suites WHERE started_at > NOW() - INTERVAL '24 hours'`
    );
    const testsRun24h = parseInt(testStats?.total || '0');
    const testsPassed = parseInt(testStats?.passed || '0');
    const testPassRate = testsRun24h > 0 ? (testsPassed / testsRun24h) * 100 : 100;

    // Journey stats
    const journeyStats = await queryOne<{ total: string; with_errors: string }>(
      `SELECT
         COUNT(*)::int as total,
         COUNT(*) FILTER (WHERE jsonb_array_length(errors::jsonb) > 0)::int as with_errors
       FROM user_journeys WHERE started_at > NOW() - INTERVAL '24 hours'`
    );
    const journeysTracked24h = parseInt(journeyStats?.total || '0');
    const journeysWithErrors = parseInt(journeyStats?.with_errors || '0');

    // Error stats
    const errorStats = await queryOne<{ count: string }>(
      `SELECT COUNT(*)::int as count FROM tracked_errors WHERE resolved = false`
    );
    const unresolvedErrors = parseInt(errorStats?.count || '0');

    // Top errors
    const topErrors = await queryAll<{ message: string; occurrences: number }>(
      `SELECT message, occurrences FROM tracked_errors
       WHERE resolved = false ORDER BY occurrences DESC LIMIT 5`
    );

    // Recent failed tests
    const recentSuites = await queryAll<{ results: string }>(
      `SELECT results FROM test_suites ORDER BY started_at DESC LIMIT 5`
    );
    const recentFailedTests: TestResult[] = [];
    for (const suite of recentSuites) {
      const results = typeof suite.results === 'string' ? JSON.parse(suite.results) : suite.results;
      for (const result of results) {
        if (result.status === 'fail' || result.status === 'error') {
          recentFailedTests.push(result);
          if (recentFailedTests.length >= 10) break;
        }
      }
      if (recentFailedTests.length >= 10) break;
    }

    return {
      testsRun24h,
      testPassRate: Math.round(testPassRate * 10) / 10,
      journeysTracked24h,
      journeysWithErrors,
      unresolvedErrors,
      topErrors,
      recentFailedTests,
    };
  } catch {
    return {
      testsRun24h: 0,
      testPassRate: 100,
      journeysTracked24h: 0,
      journeysWithErrors: 0,
      unresolvedErrors: 0,
      topErrors: [],
      recentFailedTests: [],
    };
  }
}

// ============================================
// EXPORTS
// ============================================

export const monitoringService = {
  // Test runner
  runAPITests,
  getTestHistory,
  API_TESTS,

  // Journey tracking
  startJourney,
  addJourneyStep,
  addJourneyError,
  endJourney,
  getActiveJourney,
  getJourneyHistory,

  // Error tracking
  trackError,
  getRecentErrors,
  resolveError,

  // Health & stats
  getSystemHealth,
  getDashboardStats,
};

export default monitoringService;
