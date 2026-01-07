/**
 * Personalization API Routes
 *
 * Endpoints for getting personalized workout recommendations
 * based on user's physical profile, goals, limitations, and activity data.
 */

import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { authenticate } from './auth';
import {
  getPersonalizationContext,
  generateRecommendations,
  generatePersonalizedPlan,
  getExerciseRecommendations
} from '../../services/personalization.service';
import { loggers } from '../../lib/logger';

const log = loggers.http.child({ module: 'personalization-routes' });

export async function registerPersonalizationRoutes(app: FastifyInstance) {

  /**
   * GET /personalization/context
   * Get the user's personalization context (profile, goals, limitations, activity)
   */
  app.get('/personalization/context', { preHandler: authenticate }, async (request, reply) => {
    try {
      const userId = request.user!.userId;
      const context = await getPersonalizationContext(userId);

      return {
        success: true,
        data: context
      };
    } catch (error) {
      log.error({ error }, 'Failed to get personalization context');
      return reply.status(500).send({ error: 'Failed to get personalization context' });
    }
  });

  /**
   * GET /personalization/recommendations
   * Get personalized workout recommendations
   */
  app.get('/personalization/recommendations', { preHandler: authenticate }, async (request, reply) => {
    try {
      const userId = request.user!.userId;
      const context = await getPersonalizationContext(userId);
      const recommendations = await generateRecommendations(context);

      return {
        success: true,
        data: {
          recommendations,
          count: recommendations.length,
          generatedAt: new Date().toISOString()
        }
      };
    } catch (error) {
      log.error({ error }, 'Failed to generate recommendations');
      return reply.status(500).send({ error: 'Failed to generate recommendations' });
    }
  });

  /**
   * GET /personalization/plan
   * Get a complete personalized weekly training plan
   */
  app.get('/personalization/plan', { preHandler: authenticate }, async (request, reply) => {
    try {
      const userId = request.user!.userId;
      const plan = await generatePersonalizedPlan(userId);

      return {
        success: true,
        data: plan
      };
    } catch (error) {
      log.error({ error }, 'Failed to generate personalized plan');
      return reply.status(500).send({ error: 'Failed to generate personalized plan' });
    }
  });

  /**
   * POST /personalization/exercise-check
   * Check exercises for personalized recommendations/modifications
   */
  const exerciseCheckSchema = z.object({
    exerciseIds: z.array(z.string()).min(1).max(50)
  });

  app.post('/personalization/exercise-check', { preHandler: authenticate }, async (request, reply) => {
    try {
      const userId = request.user!.userId;
      const body = exerciseCheckSchema.parse(request.body);

      const recommendations = await getExerciseRecommendations(userId, body.exerciseIds);

      // Convert Map to object for JSON serialization
      const result: Record<string, any[]> = {};
      recommendations.forEach((recs, exerciseId) => {
        result[exerciseId] = recs;
      });

      return {
        success: true,
        data: {
          exercises: result,
          checkedCount: body.exerciseIds.length,
          hasWarnings: Object.values(result).some(recs =>
            recs.some(r => r.type === 'warning')
          )
        }
      };
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({ error: 'Invalid request body', details: error.errors });
      }
      log.error({ error }, 'Failed to check exercises');
      return reply.status(500).send({ error: 'Failed to check exercises' });
    }
  });

  /**
   * GET /personalization/summary
   * Get a summary of personalization factors affecting the user
   */
  app.get('/personalization/summary', { preHandler: authenticate }, async (request, reply) => {
    try {
      const userId = request.user!.userId;
      const context = await getPersonalizationContext(userId);

      // Build summary
      const summary = {
        hasProfile: !!(context.profile.height_cm && context.profile.weight_kg),
        activeGoals: context.goals.length,
        activeLimitations: context.limitations.length,
        hasWearableData: !!(context.recentActivity.avgHeartRate || context.recentActivity.avgSleepHours),
        hasPTTestResults: !!context.ptTestPerformance,
        weeklyActivity: context.recentActivity.weeklyWorkouts,
        currentStreak: context.recentActivity.currentStreak,
        archetype: context.profile.archetype,
        personalizationFactors: [] as string[]
      };

      // List what's being used for personalization
      if (summary.hasProfile) summary.personalizationFactors.push('Physical Profile');
      if (summary.activeGoals > 0) summary.personalizationFactors.push(`${summary.activeGoals} Active Goal(s)`);
      if (summary.activeLimitations > 0) summary.personalizationFactors.push(`${summary.activeLimitations} Limitation(s)`);
      if (summary.hasWearableData) summary.personalizationFactors.push('Wearable Health Data');
      if (summary.hasPTTestResults) summary.personalizationFactors.push('PT Test Performance');
      if (summary.archetype) summary.personalizationFactors.push(`${summary.archetype} Archetype`);

      return {
        success: true,
        data: summary
      };
    } catch (error) {
      log.error({ error }, 'Failed to get personalization summary');
      return reply.status(500).send({ error: 'Failed to get personalization summary' });
    }
  });

  log.info('Personalization routes registered');
}
