/**
 * One Rep Max (1RM) Routes
 *
 * API endpoints for 1RM tracking and progression:
 * - Calculate 1RM from weight/reps
 * - Record 1RM entries
 * - Get 1RM history and progression
 * - Get compound totals (powerlifting total)
 * - Get 1RM leaderboards
 */

import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { authenticate } from './auth';
import { OneRepMaxService, OneRMFormulas, OneRMFormula } from '../../services/one-rep-max.service';
import { query } from '../../db/client';

// ============================================
// Validation Schemas
// ============================================

const calculateSchema = z.object({
  weight: z.number().positive().max(10000),
  reps: z.number().int().positive().max(100),
  formula: z.enum(['epley', 'brzycki', 'lombardi', 'oconner', 'average']).optional(),
});

const recordSchema = z.object({
  exerciseId: z.string().min(1),
  weight: z.number().positive().max(10000),
  reps: z.number().int().positive().max(100),
  rpe: z.number().int().min(1).max(10).optional(),
  workoutId: z.string().optional(),
  setId: z.string().optional(),
  bodyweightKg: z.number().positive().max(500).optional(),
  formula: z.enum(['epley', 'brzycki', 'lombardi', 'oconner', 'actual']).optional(),
});

// ============================================
// Routes
// ============================================

const oneRepMaxRoutes: FastifyPluginAsync = async (fastify) => {
  /**
   * Calculate 1RM without recording
   * POST /1rm/calculate
   */
  fastify.post(
    '/1rm/calculate',
    { preHandler: authenticate },
    async (request, reply) => {
      const body = calculateSchema.parse(request.body);
      const { weight, reps, formula = 'epley' } = body;

      if (formula === 'average') {
        const estimated1rm = OneRMFormulas.average(weight, reps);
        return reply.send({
          data: {
            estimated1rm: Math.round(estimated1rm * 100) / 100,
            sourceWeight: weight,
            sourceReps: reps,
            formula: 'average',
            allFormulas: {
              epley: Math.round(OneRMFormulas.epley(weight, reps) * 100) / 100,
              brzycki: Math.round(OneRMFormulas.brzycki(weight, reps) * 100) / 100,
              lombardi: Math.round(OneRMFormulas.lombardi(weight, reps) * 100) / 100,
              oconner: Math.round(OneRMFormulas.oconner(weight, reps) * 100) / 100,
            },
          },
        });
      }

      const estimated1rm = OneRMFormulas.calculate(weight, reps, formula as OneRMFormula);

      return reply.send({
        data: {
          estimated1rm: Math.round(estimated1rm * 100) / 100,
          sourceWeight: weight,
          sourceReps: reps,
          formula,
        },
      });
    }
  );

  /**
   * Record a new 1RM entry
   * POST /1rm
   */
  fastify.post(
    '/1rm',
    { preHandler: authenticate },
    async (request, reply) => {
      const userId = request.user!.userId;
      const body = recordSchema.parse(request.body);

      const result = await OneRepMaxService.record({
        userId,
        exerciseId: body.exerciseId,
        weight: body.weight,
        reps: body.reps,
        rpe: body.rpe,
        workoutId: body.workoutId,
        setId: body.setId,
        bodyweightKg: body.bodyweightKg,
        formula: body.formula as OneRMFormula,
      });

      return reply.status(201).send({
        data: {
          entry: result.entry,
          isPr: result.isPr,
          previousPr: result.previousPr,
          improvement: result.isPr && result.previousPr
            ? {
                absolute: Math.round((result.entry.estimated1rm - result.previousPr) * 100) / 100,
                percentage: Math.round(((result.entry.estimated1rm - result.previousPr) / result.previousPr) * 10000) / 100,
              }
            : null,
          achievements: result.achievements,
        },
      });
    }
  );

  /**
   * Get 1RM history for an exercise
   * GET /1rm/exercise/:exerciseId
   */
  fastify.get(
    '/1rm/exercise/:exerciseId',
    { preHandler: authenticate },
    async (request, reply) => {
      const userId = request.user!.userId;
      const { exerciseId } = request.params as { exerciseId: string };
      const { limit, days } = request.query as { limit?: string; days?: string };

      const history = await OneRepMaxService.getExerciseHistory(userId, exerciseId, {
        limit: limit ? parseInt(limit) : 100,
        days: days ? parseInt(days) : 365,
      });

      return reply.send({ data: history });
    }
  );

  /**
   * Get 1RM progression data for charts
   * GET /1rm/progression/:exerciseId
   */
  fastify.get(
    '/1rm/progression/:exerciseId',
    { preHandler: authenticate },
    async (request, reply) => {
      const userId = request.user!.userId;
      const { exerciseId } = request.params as { exerciseId: string };
      const { period, days } = request.query as { period?: 'daily' | 'weekly' | 'monthly'; days?: string };

      const progression = await OneRepMaxService.getProgression(userId, exerciseId, {
        period: period || 'daily',
        days: days ? parseInt(days) : 180,
      });

      return reply.send({ data: progression });
    }
  );

  /**
   * Get user's compound total (powerlifting total)
   * GET /1rm/compound-total
   */
  fastify.get(
    '/1rm/compound-total',
    { preHandler: authenticate },
    async (request, reply) => {
      const userId = request.user!.userId;

      const total = await OneRepMaxService.getCompoundTotal(userId);

      if (!total) {
        return reply.send({
          data: {
            hasData: false,
            message: 'No compound lift data recorded yet. Log squat, bench, and deadlift sets to see your powerlifting total.',
          },
        });
      }

      return reply.send({
        data: {
          hasData: true,
          ...total,
          // Add formatted display values
          display: {
            squat: total.bestSquat1rm ? `${total.bestSquat1rm} lbs` : 'Not recorded',
            bench: total.bestBench1rm ? `${total.bestBench1rm} lbs` : 'Not recorded',
            deadlift: total.bestDeadlift1rm ? `${total.bestDeadlift1rm} lbs` : 'Not recorded',
            total: `${total.powerliftingTotal} lbs`,
          },
        },
      });
    }
  );

  /**
   * Get user's best 1RM for all exercises
   * GET /1rm/best
   */
  fastify.get(
    '/1rm/best',
    { preHandler: authenticate },
    async (request, reply) => {
      const userId = request.user!.userId;

      const bestLifts = await OneRepMaxService.getAllBestLifts(userId);

      return reply.send({
        data: bestLifts,
        meta: {
          totalExercises: bestLifts.length,
        },
      });
    }
  );

  /**
   * Get 1RM leaderboard for an exercise
   * GET /1rm/leaderboard/:exerciseId
   */
  fastify.get(
    '/1rm/leaderboard/:exerciseId',
    { preHandler: authenticate },
    async (request, reply) => {
      const { exerciseId } = request.params as { exerciseId: string };
      const { limit, offset } = request.query as { limit?: string; offset?: string };

      const leaderboard = await OneRepMaxService.getLeaderboard(exerciseId, {
        limit: limit ? parseInt(limit) : 50,
        offset: offset ? parseInt(offset) : 0,
      });

      return reply.send({
        data: leaderboard,
        meta: {
          exerciseId,
          limit: limit ? parseInt(limit) : 50,
          offset: offset ? parseInt(offset) : 0,
        },
      });
    }
  );

  /**
   * Get 1RM summary statistics
   * GET /1rm/summary
   */
  fastify.get(
    '/1rm/summary',
    { preHandler: authenticate },
    async (request, reply) => {
      const userId = request.user!.userId;

      // Get best lifts
      const bestLifts = await OneRepMaxService.getAllBestLifts(userId);

      // Get compound total
      const compoundTotal = await OneRepMaxService.getCompoundTotal(userId);

      // Count PRs
      const prCountResult = await query<{ total_prs: string; recent_prs: string }>(
        `SELECT COUNT(DISTINCT exercise_id) as total_prs,
                COUNT(*) FILTER (WHERE recorded_at >= CURRENT_DATE - INTERVAL '30 days') as recent_prs
         FROM exercise_1rm_history
         WHERE user_id = $1 AND is_pr = TRUE`,
        [userId]
      );

      const prCounts = prCountResult.rows[0] || { total_prs: '0', recent_prs: '0' };

      return reply.send({
        data: {
          totalExercisesTracked: bestLifts.length,
          totalPrs: parseInt(prCounts.total_prs),
          prsLast30Days: parseInt(prCounts.recent_prs),
          compoundTotal: compoundTotal?.powerliftingTotal || 0,
          topLifts: bestLifts.slice(0, 5),
          bigThree: compoundTotal ? {
            squat: compoundTotal.bestSquat1rm,
            bench: compoundTotal.bestBench1rm,
            deadlift: compoundTotal.bestDeadlift1rm,
          } : null,
        },
      });
    }
  );
};

export default oneRepMaxRoutes;
