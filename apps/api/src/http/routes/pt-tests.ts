/**
 * PT Tests Routes (Fastify)
 *
 * Manages physical fitness tests for institutional/occupational archetypes.
 * Supports military, first responder, and other standardized PT tests.
 */

import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { authenticate } from './auth';
import { db } from '../../db/client';
import { loggers } from '../../lib/logger';

const log = loggers.core;

// PT test result component schema
const componentResultSchema = z.object({
  componentId: z.string(),
  value: z.number(),
  unit: z.string().optional(),
});

// Record PT test result schema
const recordResultSchema = z.object({
  ptTestId: z.string(),
  testDate: z.string(),
  componentResults: z.array(componentResultSchema),
  official: z.boolean().optional(),
  location: z.string().optional(),
  proctor: z.string().optional(),
  notes: z.string().optional(),
});

export interface PTTest {
  id: string;
  name: string;
  description: string | null;
  institution: string | null;
  components: PTTestComponent[];
  scoringMethod: string;
  maxScore: number | null;
  passingScore: number | null;
  testFrequency: string;
}

export interface PTTestComponent {
  id: string;
  name: string;
  type: string;
  durationSeconds?: number;
  distanceMiles?: number;
  description?: string;
  alternative?: PTTestComponent;
}

export interface PTTestResult {
  id: string;
  testDate: string;
  componentResults: Record<string, { value: number; points?: number }>;
  totalScore: number | null;
  passed: boolean | null;
  category: string | null;
  official: boolean;
}

export async function registerPTTestsRoutes(app: FastifyInstance) {
  /**
   * GET /pt-tests
   * Get all available PT tests
   */
  app.get('/pt-tests', { preHandler: authenticate }, async (request, reply) => {
    const { institution } = request.query as { institution?: string };

    let query = `
      SELECT id, name, description, institution, components,
             scoring_method, max_score, passing_score, test_frequency,
             source_url, last_updated
      FROM pt_tests
    `;
    const params: unknown[] = [];

    if (institution) {
      query += ` WHERE institution = $1`;
      params.push(institution);
    }

    query += ` ORDER BY institution, name`;

    const rows = await db.queryAll<{
      id: string;
      name: string;
      description: string | null;
      institution: string | null;
      components: PTTestComponent[];
      scoring_method: string;
      max_score: number | null;
      passing_score: number | null;
      test_frequency: string;
      source_url: string | null;
      last_updated: string | null;
    }>(query, params);

    const tests = rows.map(row => ({
      id: row.id,
      name: row.name,
      description: row.description,
      institution: row.institution,
      components: row.components,
      scoringMethod: row.scoring_method,
      maxScore: row.max_score,
      passingScore: row.passing_score,
      testFrequency: row.test_frequency,
      sourceUrl: row.source_url,
      lastUpdated: row.last_updated,
    }));

    // Group by institution
    const byInstitution: Record<string, typeof tests> = {};
    for (const test of tests) {
      const inst = test.institution || 'General';
      if (!byInstitution[inst]) byInstitution[inst] = [];
      byInstitution[inst].push(test);
    }

    return reply.send({ data: { tests, byInstitution } });
  });

  /**
   * GET /pt-tests/:id
   * Get a specific PT test with scoring standards
   */
  app.get('/pt-tests/:id', { preHandler: authenticate }, async (request, reply) => {
    const { id } = request.params as { id: string };

    const test = await db.queryOne<{
      id: string;
      name: string;
      description: string | null;
      institution: string | null;
      components: PTTestComponent[];
      scoring_method: string;
      max_score: number | null;
      passing_score: number | null;
      test_frequency: string;
      source_url: string | null;
    }>(
      `SELECT * FROM pt_tests WHERE id = $1`,
      [id]
    );

    if (!test) {
      return reply.status(404).send({
        error: { code: 'NOT_FOUND', message: 'PT test not found', statusCode: 404 },
      });
    }

    // Get scoring standards
    const standards = await db.query<{
      component_id: string;
      gender: string | null;
      age_min: number | null;
      age_max: number | null;
      standards: Record<string, unknown>;
    }>(
      `SELECT component_id, gender, age_min, age_max, standards
       FROM pt_test_standards
       WHERE pt_test_id = $1
       ORDER BY component_id, gender, age_min`,
      [id]
    );

    const standardsArray = standards?.rows || [];

    return reply.send({
      data: {
        test: {
          id: test.id,
          name: test.name,
          description: test.description,
          institution: test.institution,
          components: test.components,
          scoringMethod: test.scoring_method,
          maxScore: test.max_score,
          passingScore: test.passing_score,
          testFrequency: test.test_frequency,
          sourceUrl: test.source_url,
        },
        standards: standardsArray.map(s => ({
          componentId: s.component_id,
          gender: s.gender,
          ageMin: s.age_min,
          ageMax: s.age_max,
          standards: s.standards,
        })),
      },
    });
  });

  /**
   * GET /pt-tests/my-archetype
   * Get PT test for user's archetype
   */
  app.get('/pt-tests/my-archetype', { preHandler: authenticate }, async (request, reply) => {
    const userId = request.user!.userId;

    // Get user's archetype and associated PT test
    const user = await db.queryOne<{ archetype: string | null }>(
      `SELECT archetype FROM users WHERE id = $1`,
      [userId]
    );

    if (!user?.archetype) {
      return reply.send({
        data: {
          test: null,
          message: 'No archetype selected - choose an archetype to see your PT test',
        },
      });
    }

    const archetype = await db.queryOne<{
      pt_test_id: string | null;
      institution: string | null;
    }>(
      `SELECT pt_test_id, institution FROM archetypes WHERE id = $1`,
      [user.archetype]
    );

    if (!archetype?.pt_test_id) {
      return reply.send({
        data: {
          test: null,
          message: 'Your archetype does not have an associated PT test',
        },
      });
    }

    const test = await db.queryOne<{
      id: string;
      name: string;
      description: string | null;
      institution: string | null;
      components: PTTestComponent[];
      scoring_method: string;
      max_score: number | null;
      passing_score: number | null;
    }>(
      `SELECT * FROM pt_tests WHERE id = $1`,
      [archetype.pt_test_id]
    );

    return reply.send({
      data: {
        test: test ? {
          id: test.id,
          name: test.name,
          description: test.description,
          institution: test.institution,
          components: test.components,
          scoringMethod: test.scoring_method,
          maxScore: test.max_score,
          passingScore: test.passing_score,
        } : null,
      },
    });
  });

  /**
   * POST /pt-tests/results
   * Record a PT test result
   */
  app.post('/pt-tests/results', { preHandler: authenticate }, async (request, reply) => {
    const userId = request.user!.userId;
    const parsed = recordResultSchema.safeParse(request.body);

    if (!parsed.success) {
      return reply.status(400).send({
        error: {
          code: 'VALIDATION',
          message: 'Invalid result data',
          details: parsed.error.errors,
          statusCode: 400,
        },
      });
    }

    const data = parsed.data;

    // Get the test configuration
    const test = await db.queryOne<{
      scoring_method: string;
      max_score: number | null;
      passing_score: number | null;
    }>(
      `SELECT scoring_method, max_score, passing_score FROM pt_tests WHERE id = $1`,
      [data.ptTestId]
    );

    if (!test) {
      return reply.status(404).send({
        error: { code: 'NOT_FOUND', message: 'PT test not found', statusCode: 404 },
      });
    }

    // Get user profile for age/gender-based scoring
    const _profile = await db.queryOne<{
      date_of_birth: string | null;
      gender: string | null;
    }>(
      `SELECT pe.date_of_birth, u.gender
       FROM users u
       LEFT JOIN user_profile_extended pe ON u.id = pe.user_id
       WHERE u.id = $1`,
      [userId]
    );

    // Calculate scores based on standards (simplified - would be more complex in production)
    const componentResults: Record<string, { value: number; points?: number }> = {};
    let totalScore = 0;

    for (const result of data.componentResults) {
      componentResults[result.componentId] = {
        value: result.value,
        points: undefined, // Would calculate from standards
      };
    }

    // Determine pass/fail
    let passed: boolean | null = null;
    let category: string | null = null;

    if (test.scoring_method === 'pass_fail') {
      passed = true; // Simplified - would check against standards
    } else if (test.scoring_method === 'points' && test.passing_score !== null) {
      passed = totalScore >= test.passing_score;
    } else if (test.scoring_method === 'category') {
      // Assign category based on score
      if (totalScore >= 90) category = 'Excellent';
      else if (totalScore >= 75) category = 'Good';
      else if (totalScore >= 60) category = 'Satisfactory';
      else category = 'Needs Improvement';
    }

    const resultId = await db.queryOne<{ id: string }>(
      `INSERT INTO user_pt_results (
        user_id, pt_test_id, test_date, component_results,
        total_score, passed, category, official, location, proctor, notes
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING id`,
      [
        userId,
        data.ptTestId,
        data.testDate,
        JSON.stringify(componentResults),
        totalScore || null,
        passed,
        category,
        data.official ?? false,
        data.location ?? null,
        data.proctor ?? null,
        data.notes ?? null,
      ]
    );

    log.info({ userId, resultId: resultId?.id, testId: data.ptTestId, passed }, 'PT test result recorded');

    return reply.status(201).send({
      data: {
        id: resultId?.id,
        totalScore,
        passed,
        category,
      },
      message: 'PT test result recorded successfully',
    });
  });

  /**
   * GET /pt-tests/results
   * Get user's PT test results history
   */
  app.get('/pt-tests/results', { preHandler: authenticate }, async (request, reply) => {
    const userId = request.user!.userId;
    const { testId, limit } = request.query as { testId?: string; limit?: string };

    let query = `
      SELECT
        r.id, r.pt_test_id, r.test_date, r.component_results,
        r.total_score, r.passed, r.category, r.official,
        r.location, r.proctor, r.notes, r.created_at,
        t.name as test_name, t.institution
      FROM user_pt_results r
      JOIN pt_tests t ON r.pt_test_id = t.id
      WHERE r.user_id = $1
    `;
    const params: unknown[] = [userId];

    if (testId) {
      query += ` AND r.pt_test_id = $2`;
      params.push(testId);
    }

    query += ` ORDER BY r.test_date DESC`;

    if (limit) {
      query += ` LIMIT $${params.length + 1}`;
      params.push(parseInt(limit, 10));
    }

    const rows = await db.queryAll<{
      id: string;
      pt_test_id: string;
      test_date: string;
      component_results: Record<string, { value: number; points?: number }>;
      total_score: number | null;
      passed: boolean | null;
      category: string | null;
      official: boolean;
      location: string | null;
      proctor: string | null;
      notes: string | null;
      created_at: string;
      test_name: string;
      institution: string | null;
    }>(query, params);

    const results = rows.map(row => ({
      id: row.id,
      testId: row.pt_test_id,
      testName: row.test_name,
      institution: row.institution,
      testDate: row.test_date,
      componentResults: row.component_results,
      totalScore: row.total_score,
      passed: row.passed,
      category: row.category,
      official: row.official,
      location: row.location,
      proctor: row.proctor,
      notes: row.notes,
      recordedAt: row.created_at,
    }));

    return reply.send({ data: { results } });
  });

  /**
   * GET /pt-tests/results/:id
   * Get a specific PT test result with comparison to standards
   */
  app.get('/pt-tests/results/:id', { preHandler: authenticate }, async (request, reply) => {
    const userId = request.user!.userId;
    const { id } = request.params as { id: string };

    const result = await db.queryOne<{
      id: string;
      pt_test_id: string;
      test_date: string;
      component_results: Record<string, { value: number; points?: number }>;
      total_score: number | null;
      passed: boolean | null;
      category: string | null;
      official: boolean;
      location: string | null;
      proctor: string | null;
      notes: string | null;
    }>(
      `SELECT * FROM user_pt_results WHERE id = $1 AND user_id = $2`,
      [id, userId]
    );

    if (!result) {
      return reply.status(404).send({
        error: { code: 'NOT_FOUND', message: 'Result not found', statusCode: 404 },
      });
    }

    // Get the test details
    const test = await db.queryOne<{
      name: string;
      institution: string | null;
      components: PTTestComponent[];
      max_score: number | null;
      passing_score: number | null;
    }>(
      `SELECT name, institution, components, max_score, passing_score FROM pt_tests WHERE id = $1`,
      [result.pt_test_id]
    );

    // Get previous results for comparison
    const previousResults = await db.queryAll<{
      test_date: string;
      total_score: number | null;
      passed: boolean | null;
    }>(
      `SELECT test_date, total_score, passed
       FROM user_pt_results
       WHERE user_id = $1 AND pt_test_id = $2 AND test_date < $3
       ORDER BY test_date DESC
       LIMIT 5`,
      [userId, result.pt_test_id, result.test_date]
    );

    return reply.send({
      data: {
        result: {
          id: result.id,
          testId: result.pt_test_id,
          testName: test?.name,
          institution: test?.institution,
          testDate: result.test_date,
          componentResults: result.component_results,
          totalScore: result.total_score,
          maxScore: test?.max_score,
          passingScore: test?.passing_score,
          passed: result.passed,
          category: result.category,
          official: result.official,
          location: result.location,
          proctor: result.proctor,
          notes: result.notes,
        },
        components: test?.components || [],
        previousResults: previousResults.map(r => ({
          testDate: r.test_date,
          totalScore: r.total_score,
          passed: r.passed,
        })),
      },
    });
  });

  /**
   * GET /pt-tests/leaderboard/:testId
   * Get leaderboard for a specific PT test
   */
  app.get('/pt-tests/leaderboard/:testId', { preHandler: authenticate }, async (request, reply) => {
    const { testId } = request.params as { testId: string };
    const { limit, gender: _gender, ageGroup: _ageGroup } = request.query as {
      limit?: string;
      gender?: string;
      ageGroup?: string;
    };

    // Get top scores (best score per user)
    let query = `
      SELECT DISTINCT ON (r.user_id)
        r.user_id, r.total_score, r.test_date, r.passed, r.category,
        u.username, u.display_name
      FROM user_pt_results r
      JOIN users u ON r.user_id = u.id
      LEFT JOIN user_privacy_mode pm ON u.id = pm.user_id
      WHERE r.pt_test_id = $1
        AND r.total_score IS NOT NULL
        AND (pm.opt_out_leaderboards IS NULL OR pm.opt_out_leaderboards = FALSE)
        AND (pm.minimalist_mode IS NULL OR pm.minimalist_mode = FALSE)
      ORDER BY r.user_id, r.total_score DESC
    `;

    const topScores = await db.queryAll<{
      user_id: string;
      total_score: number;
      test_date: string;
      passed: boolean | null;
      category: string | null;
      username: string;
      display_name: string | null;
    }>(query, [testId]);

    // Sort by score and limit
    const sorted = topScores
      .sort((a, b) => (b.total_score || 0) - (a.total_score || 0))
      .slice(0, parseInt(limit || '20', 10));

    const leaderboard = sorted.map((row, index) => ({
      rank: index + 1,
      userId: row.user_id,
      username: row.username,
      displayName: row.display_name || row.username,
      score: row.total_score,
      testDate: row.test_date,
      passed: row.passed,
      category: row.category,
    }));

    return reply.send({ data: { leaderboard } });
  });

  // Note: GET /archetypes/categories is already defined in journey.ts
  // Note: GET /archetypes/by-category/:categoryId is already defined in journey.ts
}
