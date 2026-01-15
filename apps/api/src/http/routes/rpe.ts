/**
 * RPE/RIR API Routes
 *
 * Endpoints for Rate of Perceived Exertion and Reps in Reserve tracking:
 * - GET /rpe/scale - Get RPE scale descriptions
 * - GET /rpe/trends/:exerciseId - Get RPE trends for an exercise
 * - GET /rpe/weekly/:exerciseId - Get weekly RPE trends
 * - GET /rpe/fatigue - Get current fatigue analysis
 * - POST /rpe/autoregulate - Get auto-regulation suggestions
 * - GET /rpe/target/:exerciseId - Get RPE target for exercise
 * - PUT /rpe/target/:exerciseId - Set RPE target for exercise
 * - GET /rpe/snapshots - Get historical RPE snapshots
 */

import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { authenticate } from './auth';
import rpeService from '../../modules/rpe';
import { loggers } from '../../lib/logger';

const log = loggers.core.child({ module: 'rpe-routes' });

// Validation schemas
const autoRegulateSchema = z.object({
  exerciseIds: z.array(z.string()).min(1).max(50),
  targetRpe: z.number().min(5).max(10).optional(),
});

const setTargetSchema = z.object({
  rpe: z.number().int().min(1).max(10).nullable().optional(),
  rir: z.number().int().min(0).max(10).nullable().optional(),
});

const rpeRoutes: FastifyPluginAsync = async (fastify) => {
  /**
   * GET /rpe/scale
   * Get RPE scale with descriptions (public endpoint)
   */
  fastify.get('/rpe/scale', async (_request, reply) => {
    const scale = rpeService.getRPEScaleInfo();

    // Format for frontend consumption
    const formatted = Object.entries(scale).map(([rpe, info]) => ({
      rpe: parseFloat(rpe),
      rir: rpeService.RPE_TO_RIR[parseFloat(rpe)] ?? null,
      description: info.description,
      intensity: info.intensity,
    }));

    return reply.send({
      data: {
        scale: formatted,
        descriptions: {
          rpe: 'Rate of Perceived Exertion (1-10 scale, with 10 being maximum effort)',
          rir: 'Reps in Reserve (how many more reps you could have done)',
        },
        guide: [
          { rpe: 10, rir: 0, label: 'Max effort', description: 'Could not do more reps' },
          { rpe: 9, rir: 1, label: 'Very hard', description: 'Could do 1 more rep' },
          { rpe: 8, rir: 2, label: 'Hard', description: 'Could do 2 more reps' },
          { rpe: 7, rir: 3, label: 'Moderate-hard', description: 'Could do 3 more reps' },
          { rpe: 6, rir: 4, label: 'Moderate', description: 'Could do 4+ more reps' },
          { rpe: 5, rir: 5, label: 'Light', description: 'Warm-up / light work' },
        ],
      },
    });
  });

  /**
   * GET /rpe/trends/:exerciseId
   * Get daily RPE trends for a specific exercise
   */
  fastify.get(
    '/rpe/trends/:exerciseId',
    { preHandler: authenticate },
    async (request, reply) => {
      const userId = request.user!.userId;
      const { exerciseId } = request.params as { exerciseId: string };
      const { days } = request.query as { days?: string };

      const daysNum = days ? Math.min(Math.max(parseInt(days), 7), 365) : 30;

      const trends = await rpeService.getRPETrends(userId, exerciseId, daysNum);

      // Calculate summary stats
      let avgRpe = 0;
      let totalSets = 0;
      let trend = 'stable' as 'increasing' | 'decreasing' | 'stable';

      if (trends.length > 0) {
        avgRpe = trends.reduce((sum, t) => sum + t.avgRpe, 0) / trends.length;
        totalSets = trends.reduce((sum, t) => sum + t.setCount, 0);

        if (trends.length >= 3) {
          const recent = trends.slice(0, 3);
          const oldest = recent[recent.length - 1].avgRpe;
          const newest = recent[0].avgRpe;
          const diff = newest - oldest;
          if (diff > 0.5) trend = 'increasing';
          else if (diff < -0.5) trend = 'decreasing';
        }
      }

      return reply.send({
        data: {
          exerciseId,
          exerciseName: trends[0]?.exerciseName,
          trends: trends.map((t) => ({
            date: t.date,
            avgRpe: t.avgRpe,
            avgRir: t.avgRir,
            setCount: t.setCount,
            avgWeight: t.avgWeight,
            maxWeight: t.maxWeight,
            avgReps: t.avgReps,
          })),
          summary: {
            avgRpe: Math.round(avgRpe * 10) / 10,
            totalSets,
            daysWithData: trends.length,
            trend,
          },
        },
        meta: { days: daysNum },
      });
    }
  );

  /**
   * GET /rpe/weekly/:exerciseId
   * Get weekly RPE trends for long-term analysis
   */
  fastify.get(
    '/rpe/weekly/:exerciseId',
    { preHandler: authenticate },
    async (request, reply) => {
      const userId = request.user!.userId;
      const { exerciseId } = request.params as { exerciseId: string };
      const { weeks } = request.query as { weeks?: string };

      const weeksNum = weeks ? Math.min(Math.max(parseInt(weeks), 4), 52) : 12;

      const trends = await rpeService.getWeeklyRPETrends(userId, exerciseId, weeksNum);

      return reply.send({
        data: {
          exerciseId,
          trends: trends.map((t) => ({
            weekStart: t.weekStart,
            avgRpe: t.avgRpe,
            avgRir: t.avgRir,
            totalSets: t.totalSets,
            rpeVariance: t.rpeVariance,
            minRpe: t.minRpe,
            maxRpe: t.maxRpe,
            avgWeight: t.avgWeight,
            totalVolume: t.totalVolume,
          })),
        },
        meta: { weeks: weeksNum },
      });
    }
  );

  /**
   * GET /rpe/fatigue
   * Get current fatigue analysis based on recent RPE data
   */
  fastify.get('/rpe/fatigue', { preHandler: authenticate }, async (request, reply) => {
    const userId = request.user!.userId;

    const analysis = await rpeService.analyzeFatigue(userId);

    return reply.send({
      data: {
        fatigueScore: analysis.fatigueScore,
        classification: analysis.classification,
        indicators: analysis.indicators,
        recommendation: analysis.recommendation,
        suggestedIntensity: analysis.suggestedIntensity,
        recentRpeTrend: analysis.recentRpeTrend,
      },
    });
  });

  /**
   * POST /rpe/autoregulate
   * Get auto-regulation suggestions for exercises based on fatigue and recent performance
   */
  fastify.post('/rpe/autoregulate', { preHandler: authenticate }, async (request, reply) => {
    const userId = request.user!.userId;
    const parsed = autoRegulateSchema.safeParse(request.body);

    if (!parsed.success) {
      return reply.status(400).send({
        error: { code: 'VALIDATION', message: 'Invalid request body', statusCode: 400 },
      });
    }

    const { exerciseIds, targetRpe = 8 } = parsed.data;

    const suggestions = await rpeService.getAutoRegulationSuggestions(
      userId,
      exerciseIds,
      targetRpe
    );

    // Also get current fatigue for context
    const fatigue = await rpeService.analyzeFatigue(userId);

    log.info(
      { userId, exerciseCount: exerciseIds.length, targetRpe },
      'Auto-regulation suggestions generated'
    );

    return reply.send({
      data: {
        suggestions: suggestions.map((s) => ({
          exerciseId: s.exerciseId,
          exerciseName: s.exerciseName,
          currentWeight: s.currentWeight,
          suggestedWeight: s.suggestedWeight,
          suggestedReps: s.suggestedReps,
          targetRpe: s.targetRpe,
          reasoning: s.reasoning,
          adjustmentPercent: s.adjustmentPercent,
          confidence: s.confidence,
        })),
        context: {
          fatigueLevel: fatigue.classification,
          fatigueScore: fatigue.fatigueScore,
          overallRecommendation: fatigue.recommendation,
        },
      },
    });
  });

  /**
   * GET /rpe/target/:exerciseId
   * Get user's default RPE/RIR target for an exercise
   */
  fastify.get(
    '/rpe/target/:exerciseId',
    { preHandler: authenticate },
    async (request, reply) => {
      const userId = request.user!.userId;
      const { exerciseId } = request.params as { exerciseId: string };

      const target = await rpeService.getExerciseRPETarget(userId, exerciseId);

      return reply.send({
        data: {
          exerciseId,
          rpe: target.rpe,
          rir: target.rir,
        },
      });
    }
  );

  /**
   * PUT /rpe/target/:exerciseId
   * Set user's default RPE/RIR target for an exercise
   */
  fastify.put(
    '/rpe/target/:exerciseId',
    { preHandler: authenticate },
    async (request, reply) => {
      const userId = request.user!.userId;
      const { exerciseId } = request.params as { exerciseId: string };
      const parsed = setTargetSchema.safeParse(request.body);

      if (!parsed.success) {
        return reply.status(400).send({
          error: { code: 'VALIDATION', message: 'Invalid request body', statusCode: 400 },
        });
      }

      const { rpe = null, rir = null } = parsed.data;

      await rpeService.setExerciseRPETarget(userId, exerciseId, rpe, rir);

      return reply.send({
        data: {
          exerciseId,
          rpe,
          rir,
          message: 'RPE target updated',
        },
      });
    }
  );

  /**
   * GET /rpe/snapshots
   * Get historical RPE snapshots
   */
  fastify.get('/rpe/snapshots', { preHandler: authenticate }, async (request, reply) => {
    const userId = request.user!.userId;
    const { days } = request.query as { days?: string };

    const daysNum = days ? Math.min(Math.max(parseInt(days), 7), 90) : 30;

    const snapshots = await rpeService.getRPESnapshots(userId, daysNum);

    return reply.send({
      data: {
        snapshots: snapshots.map((s) => ({
          date: s.snapshotDate,
          avgRpe: s.avgRpe,
          avgRir: s.avgRir,
          totalSets: s.totalSets,
          fatigueScore: s.fatigueScore,
          recoveryRecommendation: s.recoveryRecommendation,
        })),
      },
      meta: { days: daysNum },
    });
  });

  /**
   * POST /rpe/snapshot
   * Create/update today's RPE snapshot
   */
  fastify.post('/rpe/snapshot', { preHandler: authenticate }, async (request, reply) => {
    const userId = request.user!.userId;

    const snapshot = await rpeService.createRPESnapshot(userId);

    if (!snapshot) {
      return reply.status(404).send({
        error: {
          code: 'NO_DATA',
          message: 'No RPE data for today to create snapshot',
          statusCode: 404,
        },
      });
    }

    return reply.status(201).send({
      data: {
        date: snapshot.snapshotDate,
        avgRpe: snapshot.avgRpe,
        avgRir: snapshot.avgRir,
        totalSets: snapshot.totalSets,
        fatigueScore: snapshot.fatigueScore,
        recoveryRecommendation: snapshot.recoveryRecommendation,
      },
    });
  });
};

export default rpeRoutes;
