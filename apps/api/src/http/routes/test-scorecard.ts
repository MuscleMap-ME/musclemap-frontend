/**
 * Test Scorecard Routes (Fastify)
 *
 * Admin endpoints for managing test scorecards that track
 * API test results across categories (core, edge, security, performance).
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { authenticate, requireAdmin } from './auth';
import { queryAll, queryOne, execute } from '../../db/client';
import { loggers } from '../../lib/logger';

const log = loggers.http;

// ============================================
// TYPES & SCHEMAS
// ============================================

export interface TestResult {
  name: string;
  category: 'core' | 'edge' | 'security' | 'performance';
  passed: boolean;
  duration: number;
  error?: string;
  details?: Record<string, unknown>;
}

export interface TestScorecard {
  id: string;
  score: number;
  grade: string;
  totalTests: number;
  passed: number;
  failed: number;
  skipped: number;
  categories: {
    core: { passed: number; failed: number; score: number };
    edge: { passed: number; failed: number; score: number };
    security: { passed: number; failed: number; score: number };
    performance: { passed: number; failed: number; score: number };
  };
  failedTests: TestResult[];
  recommendations: string[];
  targetUrl: string;
  environment: string;
  createdAt: string;
  duration: number;
}

const testResultSchema = z.object({
  name: z.string(),
  category: z.enum(['core', 'edge', 'security', 'performance']),
  passed: z.boolean(),
  duration: z.number(),
  error: z.string().optional(),
  details: z.record(z.unknown()).optional(),
});

const submitScorecardSchema = z.object({
  targetUrl: z.string().url(),
  environment: z.enum(['development', 'staging', 'production']).default('production'),
  results: z.array(testResultSchema),
  duration: z.number().optional(),
});

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Calculate grade from score
 */
function calculateGrade(score: number): string {
  if (score >= 97) return 'A+';
  if (score >= 93) return 'A';
  if (score >= 90) return 'A-';
  if (score >= 87) return 'B+';
  if (score >= 83) return 'B';
  if (score >= 80) return 'B-';
  if (score >= 77) return 'C+';
  if (score >= 73) return 'C';
  if (score >= 70) return 'C-';
  if (score >= 67) return 'D+';
  if (score >= 63) return 'D';
  if (score >= 60) return 'D-';
  return 'F';
}

/**
 * Generate recommendations based on failed tests
 */
function generateRecommendations(
  failedTests: TestResult[],
  categories: TestScorecard['categories']
): string[] {
  const recommendations: string[] = [];

  // Category-specific recommendations
  if (categories.core.failed > 0) {
    recommendations.push(
      `Fix ${categories.core.failed} failing core tests - these are critical for basic functionality.`
    );
  }

  if (categories.security.failed > 0) {
    recommendations.push(
      `URGENT: ${categories.security.failed} security tests are failing - review authentication and authorization.`
    );
  }

  if (categories.performance.failed > 0) {
    recommendations.push(
      `${categories.performance.failed} performance tests are failing - consider optimizing slow endpoints.`
    );
  }

  if (categories.edge.failed > 0) {
    recommendations.push(
      `${categories.edge.failed} edge case tests are failing - improve input validation and error handling.`
    );
  }

  // Specific test failure recommendations
  const authFailures = failedTests.filter(t => t.name.toLowerCase().includes('auth'));
  if (authFailures.length > 0) {
    recommendations.push('Review authentication flow - multiple auth-related tests are failing.');
  }

  const dbFailures = failedTests.filter(t =>
    t.error?.toLowerCase().includes('database') ||
    t.error?.toLowerCase().includes('connection')
  );
  if (dbFailures.length > 0) {
    recommendations.push('Check database connectivity and query performance.');
  }

  // General recommendations
  if (recommendations.length === 0) {
    recommendations.push('All tests passing! Consider adding more test coverage.');
  }

  return recommendations.slice(0, 5); // Limit to 5 recommendations
}

/**
 * Process test results into a scorecard
 */
function processResults(
  results: TestResult[],
  targetUrl: string,
  environment: string,
  duration: number
): Omit<TestScorecard, 'id' | 'createdAt'> {
  const categories = {
    core: { passed: 0, failed: 0, score: 0 },
    edge: { passed: 0, failed: 0, score: 0 },
    security: { passed: 0, failed: 0, score: 0 },
    performance: { passed: 0, failed: 0, score: 0 },
  };

  const failedTests: TestResult[] = [];
  let totalPassed = 0;
  let totalFailed = 0;

  // Process each result
  for (const result of results) {
    const cat = categories[result.category];
    if (result.passed) {
      cat.passed++;
      totalPassed++;
    } else {
      cat.failed++;
      totalFailed++;
      failedTests.push(result);
    }
  }

  // Calculate category scores
  for (const key of Object.keys(categories) as Array<keyof typeof categories>) {
    const cat = categories[key];
    const total = cat.passed + cat.failed;
    cat.score = total > 0 ? Math.round((cat.passed / total) * 100) : 100;
  }

  // Calculate overall score with weighted categories
  // Security is weighted more heavily
  const weights = { core: 0.35, security: 0.30, performance: 0.20, edge: 0.15 };
  let weightedScore = 0;
  let totalWeight = 0;

  for (const key of Object.keys(categories) as Array<keyof typeof categories>) {
    const cat = categories[key];
    const total = cat.passed + cat.failed;
    if (total > 0) {
      weightedScore += cat.score * weights[key];
      totalWeight += weights[key];
    }
  }

  const score = totalWeight > 0 ? Math.round(weightedScore / totalWeight) : 100;
  const grade = calculateGrade(score);

  return {
    score,
    grade,
    totalTests: results.length,
    passed: totalPassed,
    failed: totalFailed,
    skipped: 0,
    categories,
    failedTests,
    recommendations: generateRecommendations(failedTests, categories),
    targetUrl,
    environment,
    duration,
  };
}

// ============================================
// ROUTES
// ============================================

export async function registerTestScorecardRoutes(app: FastifyInstance): Promise<void> {
  /**
   * GET /admin/test-scorecard
   * Get the latest test scorecard
   */
  app.get('/admin/test-scorecard', {
    preHandler: [authenticate, requireAdmin],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const scorecard = await queryOne<{
        id: string;
        score: number;
        grade: string;
        total_tests: number;
        passed: number;
        failed: number;
        skipped: number;
        categories: string;
        failed_tests: string;
        recommendations: string;
        target_url: string;
        environment: string;
        duration: number;
        created_at: string;
      }>(`
        SELECT * FROM test_scorecards
        ORDER BY created_at DESC
        LIMIT 1
      `);

      if (!scorecard) {
        return reply.status(404).send({
          error: {
            code: 'NOT_FOUND',
            message: 'No test scorecards found. Run the test suite first.',
            statusCode: 404,
          },
        });
      }

      return reply.send({
        data: {
          id: scorecard.id,
          score: scorecard.score,
          grade: scorecard.grade,
          totalTests: scorecard.total_tests,
          passed: scorecard.passed,
          failed: scorecard.failed,
          skipped: scorecard.skipped,
          categories: JSON.parse(scorecard.categories),
          failedTests: JSON.parse(scorecard.failed_tests),
          recommendations: JSON.parse(scorecard.recommendations),
          targetUrl: scorecard.target_url,
          environment: scorecard.environment,
          duration: scorecard.duration,
          createdAt: scorecard.created_at,
        },
      });
    } catch (error: any) {
      // Table might not exist yet
      if (error.message?.includes('does not exist')) {
        return reply.status(404).send({
          error: {
            code: 'NOT_FOUND',
            message: 'Test scorecard table not initialized. Run migrations first.',
            statusCode: 404,
          },
        });
      }
      throw error;
    }
  });

  /**
   * GET /admin/test-scorecard/history
   * Get historical scorecards for trend analysis
   */
  app.get('/admin/test-scorecard/history', {
    preHandler: [authenticate, requireAdmin],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { limit = '30' } = request.query as { limit?: string };
    const parsedLimit = Math.min(parseInt(limit, 10) || 30, 100);

    try {
      const scorecards = await queryAll<{
        id: string;
        score: number;
        grade: string;
        total_tests: number;
        passed: number;
        failed: number;
        environment: string;
        duration: number;
        created_at: string;
      }>(`
        SELECT id, score, grade, total_tests, passed, failed,
               environment, duration, created_at
        FROM test_scorecards
        ORDER BY created_at DESC
        LIMIT $1
      `, [parsedLimit]);

      return reply.send({
        data: scorecards.map(sc => ({
          id: sc.id,
          score: sc.score,
          grade: sc.grade,
          totalTests: sc.total_tests,
          passed: sc.passed,
          failed: sc.failed,
          environment: sc.environment,
          duration: sc.duration,
          createdAt: sc.created_at,
        })),
        meta: { limit: parsedLimit, count: scorecards.length },
      });
    } catch (error: any) {
      if (error.message?.includes('does not exist')) {
        return reply.send({ data: [], meta: { limit: parsedLimit, count: 0 } });
      }
      throw error;
    }
  });

  /**
   * POST /admin/test-scorecard
   * Submit new test results and generate a scorecard
   */
  app.post('/admin/test-scorecard', {
    preHandler: [authenticate, requireAdmin],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const body = submitScorecardSchema.parse(request.body);
    const { targetUrl, environment, results, duration = 0 } = body;

    // Process results into a scorecard
    const scorecard = processResults(results, targetUrl, environment, duration);

    // Save to database
    const id = `sc_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 8)}`;

    try {
      await execute(`
        INSERT INTO test_scorecards (
          id, score, grade, total_tests, passed, failed, skipped,
          categories, failed_tests, recommendations,
          target_url, environment, duration, created_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW()
        )
      `, [
        id,
        scorecard.score,
        scorecard.grade,
        scorecard.totalTests,
        scorecard.passed,
        scorecard.failed,
        scorecard.skipped,
        JSON.stringify(scorecard.categories),
        JSON.stringify(scorecard.failedTests),
        JSON.stringify(scorecard.recommendations),
        scorecard.targetUrl,
        scorecard.environment,
        scorecard.duration,
      ]);

      log.info({
        scorecardId: id,
        score: scorecard.score,
        grade: scorecard.grade,
        passed: scorecard.passed,
        failed: scorecard.failed,
      }, 'Test scorecard submitted');

      return reply.status(201).send({
        data: {
          id,
          ...scorecard,
          createdAt: new Date().toISOString(),
        },
      });
    } catch (error: any) {
      // If table doesn't exist, return the scorecard without persisting
      if (error.message?.includes('does not exist')) {
        log.warn('Test scorecards table does not exist - returning computed scorecard without persistence');
        return reply.status(201).send({
          data: {
            id: 'temp_' + id,
            ...scorecard,
            createdAt: new Date().toISOString(),
            _warning: 'Scorecard not persisted - run migrations to enable persistence',
          },
        });
      }
      throw error;
    }
  });

  /**
   * DELETE /admin/test-scorecard/:id
   * Delete a specific scorecard
   */
  app.delete('/admin/test-scorecard/:id', {
    preHandler: [authenticate, requireAdmin],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };

    try {
      const result = await execute(
        'DELETE FROM test_scorecards WHERE id = $1',
        [id]
      );

      if (result.rowCount === 0) {
        return reply.status(404).send({
          error: {
            code: 'NOT_FOUND',
            message: 'Scorecard not found',
            statusCode: 404,
          },
        });
      }

      return reply.send({ data: { deleted: true, id } });
    } catch (error: any) {
      if (error.message?.includes('does not exist')) {
        return reply.status(404).send({
          error: {
            code: 'NOT_FOUND',
            message: 'Test scorecard table not initialized',
            statusCode: 404,
          },
        });
      }
      throw error;
    }
  });

  log.info({ module: 'test-scorecard-routes' }, 'Test scorecard routes registered');
}
