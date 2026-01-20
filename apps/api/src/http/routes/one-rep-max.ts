/**
 * One Rep Max (1RM) Routes
 *
 * API endpoints for comprehensive 1RM tracking and progression:
 *
 * CALCULATION ENDPOINTS:
 * - POST /1rm/calculate - Calculate estimated 1RM from weight/reps
 * - GET /1rm/rep-table - Generate rep-max table for training programming
 *
 * RECORDING ENDPOINTS:
 * - POST /1rm - Record a new 1RM entry
 * - DELETE /1rm/:entryId - Delete a 1RM entry
 *
 * HISTORY & PROGRESSION:
 * - GET /1rm/exercise/:exerciseId - Get 1RM history for an exercise
 * - GET /1rm/exercise/:exerciseId/pr - Get current PR for an exercise
 * - GET /1rm/progression/:exerciseId - Get progression data for charts
 * - GET /1rm/best - Get all best lifts
 * - GET /1rm/summary - Get 1RM summary statistics
 *
 * POWERLIFTING SPECIFIC:
 * - GET /1rm/compound-total - Get powerlifting total (Squat + Bench + Deadlift)
 * - POST /1rm/scores - Calculate Wilks/DOTS scores
 * - GET /1rm/classification - Get strength classification
 *
 * LEADERBOARDS:
 * - GET /1rm/leaderboard/:exerciseId - Get 1RM leaderboard for an exercise
 *
 * FORMULAS SUPPORTED:
 * - Epley: weight × (1 + reps/30) - Best for 6-10 rep ranges
 * - Brzycki: weight × 36 / (37 - reps) - Best for 1-6 rep ranges
 * - Lombardi: weight × reps^0.10 - Simple, consistent
 * - O'Conner: weight × (1 + reps/40) - Conservative estimate
 * - Average: Mean of all four formulas - Most reliable
 */

import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { authenticate } from './auth';
import {
  OneRepMaxService,
  OneRMFormulas,
  OneRMFormula,
  PowerliftingScores,
  StrengthStandards as _StrengthStandards,
} from '../../services/one-rep-max.service';
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
   *
   * Returns estimated 1RM using the specified formula (or all formulas if 'average' is selected).
   * Also includes accuracy notes and formula explanations.
   *
   * Request body:
   * - weight: number (required) - Weight lifted
   * - reps: number (required) - Number of reps performed
   * - formula: string (optional) - 'epley' | 'brzycki' | 'lombardi' | 'oconner' | 'average'
   */
  fastify.post(
    '/1rm/calculate',
    { preHandler: authenticate },
    async (request, reply) => {
      const body = calculateSchema.parse(request.body);
      const { weight, reps, formula = 'epley' } = body;

      // Calculate all formulas for comprehensive response
      const allResults = OneRMFormulas.calculateAll(weight, reps);

      if (formula === 'average') {
        return reply.send({
          data: {
            estimated1rm: Math.round(allResults.average * 100) / 100,
            sourceWeight: weight,
            sourceReps: reps,
            formula: 'average',
            allFormulas: {
              epley: Math.round(allResults.epley * 100) / 100,
              brzycki: Math.round(allResults.brzycki * 100) / 100,
              lombardi: Math.round(allResults.lombardi * 100) / 100,
              oconner: Math.round(allResults.oconner * 100) / 100,
            },
            statistics: {
              min: Math.round(allResults.min * 100) / 100,
              max: Math.round(allResults.max * 100) / 100,
              range: Math.round(allResults.range * 100) / 100,
              rangePercentage: Math.round((allResults.range / allResults.average) * 10000) / 100,
            },
            accuracyNote: reps > 10
              ? 'Accuracy decreases significantly for reps >10. Consider using lower rep test sets.'
              : 'High accuracy range (1-10 reps)',
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
          formulaDescription: getFormulaDescription(formula),
          allFormulas: {
            epley: Math.round(allResults.epley * 100) / 100,
            brzycki: Math.round(allResults.brzycki * 100) / 100,
            lombardi: Math.round(allResults.lombardi * 100) / 100,
            oconner: Math.round(allResults.oconner * 100) / 100,
            average: Math.round(allResults.average * 100) / 100,
          },
        },
      });
    }
  );

  /**
   * Generate rep-max table for training programming
   * GET /1rm/rep-table
   *
   * Returns a table showing estimated weights for different rep ranges based on a 1RM.
   * Useful for programming: "What weight should I use for 5 sets of 5?"
   *
   * Query params:
   * - oneRepMax: number (required) - The user's 1RM
   * - formula: string (optional) - Formula to use
   */
  fastify.get(
    '/1rm/rep-table',
    { preHandler: authenticate },
    async (request, reply) => {
      const { oneRepMax, formula = 'epley' } = request.query as { oneRepMax?: string; formula?: string };

      if (!oneRepMax || isNaN(parseFloat(oneRepMax))) {
        return reply.status(400).send({
          error: 'Missing or invalid oneRepMax parameter',
        });
      }

      const orm = parseFloat(oneRepMax);
      const table = OneRMFormulas.generateRepMaxTable(orm, formula as OneRMFormula);

      return reply.send({
        data: {
          oneRepMax: orm,
          formula,
          repMaxTable: table,
          notes: {
            usage: 'Use these weights as starting points. Adjust based on how the set feels.',
            warmup: `Suggested warmup: ${Math.round(orm * 0.4)}lbs x 10, ${Math.round(orm * 0.6)}lbs x 5, ${Math.round(orm * 0.8)}lbs x 3`,
          },
        },
      });
    }
  );

  /**
   * Reverse calculate: Get weight for target reps
   * POST /1rm/reverse-calculate
   *
   * Given a target 1RM, calculate what weight to use for a given number of reps.
   *
   * Request body:
   * - target1rm: number (required) - Target 1RM value
   * - reps: number (required) - Number of reps to perform
   * - formula: string (optional) - Formula to use
   */
  fastify.post(
    '/1rm/reverse-calculate',
    { preHandler: authenticate },
    async (request, reply) => {
      const schema = z.object({
        target1rm: z.number().positive().max(10000),
        reps: z.number().int().positive().max(100),
        formula: z.enum(['epley', 'brzycki', 'lombardi', 'oconner']).optional(),
      });

      const body = schema.parse(request.body);
      const { target1rm, reps, formula = 'epley' } = body;

      const weight = OneRMFormulas.getWeightForReps(target1rm, reps, formula as OneRMFormula);

      return reply.send({
        data: {
          target1rm,
          reps,
          formula,
          calculatedWeight: Math.round(weight * 100) / 100,
          // Also show what common percentages would be
          percentages: {
            '95%': Math.round(OneRMFormulas.getWeightForReps(target1rm * 0.95, reps, formula as OneRMFormula) * 100) / 100,
            '90%': Math.round(OneRMFormulas.getWeightForReps(target1rm * 0.90, reps, formula as OneRMFormula) * 100) / 100,
            '85%': Math.round(OneRMFormulas.getWeightForReps(target1rm * 0.85, reps, formula as OneRMFormula) * 100) / 100,
            '80%': Math.round(OneRMFormulas.getWeightForReps(target1rm * 0.80, reps, formula as OneRMFormula) * 100) / 100,
            '75%': Math.round(OneRMFormulas.getWeightForReps(target1rm * 0.75, reps, formula as OneRMFormula) * 100) / 100,
            '70%': Math.round(OneRMFormulas.getWeightForReps(target1rm * 0.70, reps, formula as OneRMFormula) * 100) / 100,
          },
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
   *
   * Returns the history of 1RM entries for a specific exercise.
   *
   * Query params:
   * - limit: number (optional) - Max entries to return (default: 100)
   * - days: number (optional) - Look back period in days (default: 365)
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
   * Get current PR for a specific exercise
   * GET /1rm/exercise/:exerciseId/pr
   *
   * Returns the user's current personal record for the specified exercise.
   */
  fastify.get(
    '/1rm/exercise/:exerciseId/pr',
    { preHandler: authenticate },
    async (request, reply) => {
      const userId = request.user!.userId;
      const { exerciseId } = request.params as { exerciseId: string };

      const pr = await OneRepMaxService.getExercisePR(userId, exerciseId);

      if (!pr) {
        return reply.status(404).send({
          error: 'No PR found for this exercise',
          data: null,
        });
      }

      return reply.send({ data: pr });
    }
  );

  /**
   * Delete a 1RM entry
   * DELETE /1rm/:entryId
   *
   * Deletes a specific 1RM entry. If the entry was a PR, promotes the next best entry to PR status.
   */
  fastify.delete(
    '/1rm/:entryId',
    { preHandler: authenticate },
    async (request, reply) => {
      const userId = request.user!.userId;
      const { entryId } = request.params as { entryId: string };

      const result = await OneRepMaxService.deleteEntry(userId, entryId);

      if (!result.deleted) {
        return reply.status(404).send({
          error: result.message,
        });
      }

      return reply.send({
        data: { deleted: true, message: result.message },
      });
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

  /**
   * Calculate Wilks and DOTS powerlifting scores
   * POST /1rm/scores
   *
   * Calculates Wilks and DOTS scores based on the user's powerlifting total and bodyweight.
   * These scores allow comparison of lifting performance across different bodyweight classes.
   *
   * Request body:
   * - bodyweightKg: number (required) - Current bodyweight in kilograms
   * - isMale: boolean (optional) - Use male coefficients (default: true)
   */
  fastify.post(
    '/1rm/scores',
    { preHandler: authenticate },
    async (request, reply) => {
      const userId = request.user!.userId;

      const schema = z.object({
        bodyweightKg: z.number().positive().max(500),
        isMale: z.boolean().optional(),
      });

      const body = schema.parse(request.body);
      const { bodyweightKg, isMale = true } = body;

      const scores = await OneRepMaxService.updatePowerliftingScores(userId, bodyweightKg, isMale);

      if (scores.total === 0) {
        return reply.send({
          data: {
            hasData: false,
            message: 'No powerlifting total recorded. Log squat, bench, and deadlift sets to calculate scores.',
          },
        });
      }

      return reply.send({
        data: {
          hasData: true,
          bodyweightKg,
          powerliftingTotalLbs: scores.total,
          powerliftingTotalKg: Math.round(PowerliftingScores.lbsToKg(scores.total) * 100) / 100,
          wilksScore: scores.wilks,
          dotsScore: scores.dots,
          scoreExplanation: {
            wilks: 'Traditional powerlifting score (500 is world-class)',
            dots: 'Modern score formula, more accurate for extreme weights',
          },
          classification: getWilksClassification(scores.wilks || 0),
        },
      });
    }
  );

  /**
   * Get strength classification for user's lifts
   * GET /1rm/classification
   *
   * Classifies the user's lifts against standard strength benchmarks.
   * Returns level (untrained to elite) for each lift and overall.
   *
   * Query params:
   * - bodyweightLbs: number (required) - Current bodyweight in pounds
   * - isMale: boolean (optional) - Use male standards (default: true)
   */
  fastify.get(
    '/1rm/classification',
    { preHandler: authenticate },
    async (request, reply) => {
      const userId = request.user!.userId;
      const { bodyweightLbs, isMale } = request.query as { bodyweightLbs?: string; isMale?: string };

      if (!bodyweightLbs || isNaN(parseFloat(bodyweightLbs))) {
        return reply.status(400).send({
          error: 'Missing or invalid bodyweightLbs parameter',
        });
      }

      const bwLbs = parseFloat(bodyweightLbs);
      const male = isMale !== 'false';

      const classification = await OneRepMaxService.getStrengthClassification(userId, bwLbs, male);

      if (!classification.squat && !classification.bench && !classification.deadlift) {
        return reply.send({
          data: {
            hasData: false,
            message: 'No compound lift data recorded. Log squat, bench, and deadlift to see your classification.',
          },
        });
      }

      return reply.send({
        data: {
          hasData: true,
          bodyweightLbs: bwLbs,
          gender: male ? 'male' : 'female',
          ...classification,
          levelDescriptions: {
            untrained: 'Expected strength before any systematic training',
            beginner: '1-3 months of consistent training',
            novice: '3-6 months of consistent training',
            intermediate: '1-2 years of consistent training',
            advanced: '2-5 years of dedicated training',
            elite: 'Top 1% of lifters, typically competitive level',
          },
        },
      });
    }
  );

  /**
   * Get formula information and recommendations
   * GET /1rm/formulas
   *
   * Returns detailed information about each 1RM formula and recommendations for use.
   */
  fastify.get(
    '/1rm/formulas',
    { preHandler: authenticate },
    async (_request, reply) => {
      return reply.send({
        data: {
          formulas: [
            {
              name: 'epley',
              displayName: 'Epley',
              formula: '1RM = weight × (1 + reps/30)',
              description: 'Most widely used formula, developed by Boyd Epley',
              bestFor: '6-10 rep ranges',
              characteristics: 'Linear relationship, tends to overestimate at high reps',
            },
            {
              name: 'brzycki',
              displayName: 'Brzycki',
              formula: '1RM = weight × 36 / (37 - reps)',
              description: 'More conservative formula by Matt Brzycki',
              bestFor: '1-6 rep ranges',
              characteristics: 'Non-linear, more conservative estimates',
            },
            {
              name: 'lombardi',
              displayName: 'Lombardi',
              formula: '1RM = weight × reps^0.10',
              description: 'Simple power function formula',
              bestFor: 'Quick mental calculations',
              characteristics: 'Tends to underestimate slightly',
            },
            {
              name: 'oconner',
              displayName: "O'Conner",
              formula: '1RM = weight × (1 + reps/40)',
              description: 'Conservative variant of Epley formula',
              bestFor: 'General fitness populations',
              characteristics: 'Most conservative estimates',
            },
            {
              name: 'average',
              displayName: 'Average',
              formula: 'Mean of all four formulas',
              description: 'Averages all formulas for most reliable estimate',
              bestFor: 'General use when unsure which formula to use',
              characteristics: 'Best overall accuracy for most people',
            },
          ],
          recommendations: {
            powerlifters: 'Use Brzycki for low-rep training (1-6 reps)',
            bodybuilders: 'Use Epley for higher-rep training (8-12 reps)',
            general: 'Use Average for best overall accuracy',
          },
          accuracyNotes: [
            'All formulas are most accurate for 1-10 reps',
            'Accuracy decreases significantly above 10 reps',
            'Individual variation can cause 5-10% error',
            'Test your actual 1RM periodically to calibrate',
          ],
        },
      });
    }
  );
};

// Helper function to get formula descriptions
function getFormulaDescription(formula: string): string {
  const descriptions: Record<string, string> = {
    epley: 'Epley Formula: weight × (1 + reps/30). Best for 6-10 rep ranges.',
    brzycki: 'Brzycki Formula: weight × 36 / (37 - reps). Best for 1-6 rep ranges.',
    lombardi: 'Lombardi Formula: weight × reps^0.10. Simple and consistent.',
    oconner: "O'Conner Formula: weight × (1 + reps/40). Most conservative estimate.",
    average: 'Average of all formulas. Most reliable for general use.',
  };
  return descriptions[formula] || 'Unknown formula';
}

// Helper function to classify Wilks scores
function getWilksClassification(wilks: number): { level: string; description: string } {
  if (wilks >= 500) return { level: 'world_class', description: 'World-class level' };
  if (wilks >= 450) return { level: 'elite', description: 'Elite competitive level' };
  if (wilks >= 400) return { level: 'advanced', description: 'Advanced competitive level' };
  if (wilks >= 350) return { level: 'intermediate_advanced', description: 'Intermediate-advanced level' };
  if (wilks >= 300) return { level: 'intermediate', description: 'Intermediate level' };
  if (wilks >= 250) return { level: 'novice', description: 'Novice competitive level' };
  if (wilks >= 200) return { level: 'beginner', description: 'Beginner level' };
  return { level: 'untrained', description: 'Untrained level' };
}

export default oneRepMaxRoutes;
