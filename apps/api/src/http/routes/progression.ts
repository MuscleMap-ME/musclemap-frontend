/**
 * Progressive Overload Routes (Fastify)
 *
 * Routes for tracking and analyzing progressive overload:
 * - Personal records
 * - Progression recommendations
 * - Exercise stats and trends
 * - Progression targets
 */

import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { authenticate } from './auth';
import { ProgressionService, TargetType } from '../../services/progression.service';
import { loggers } from '../../lib/logger';

const log = loggers.http;

// Schemas
const createTargetSchema = z.object({
  exerciseId: z.string().optional(),
  targetType: z.enum(['weight', 'reps', 'volume', 'frequency']),
  currentValue: z.number().min(0),
  targetValue: z.number().min(0),
  incrementValue: z.number().min(0).optional(),
  incrementFrequency: z.enum(['session', 'week', 'milestone']).optional(),
  targetDate: z.string().datetime().optional(),
});

const updateTargetSchema = z.object({
  currentValue: z.number().min(0),
});

const _validTargetTypes: TargetType[] = ['weight', 'reps', 'volume', 'frequency'];

export async function registerProgressionRoutes(app: FastifyInstance) {
  // ============================================
  // PERSONAL RECORDS
  // ============================================

  // Get all personal records
  app.get('/progression/records', { preHandler: authenticate }, async (request, reply) => {
    const query = request.query as { limit?: string; recordType?: string };
    const limit = Math.min(parseInt(query.limit || '50'), 100);

    const records = await ProgressionService.getAllRecords(request.user!.userId, {
      limit,
      recordType: query.recordType as any,
    });

    return reply.send({ data: records });
  });

  // Get personal records for an exercise
  app.get('/progression/records/:exerciseId', { preHandler: authenticate }, async (request, reply) => {
    const { exerciseId } = request.params as { exerciseId: string };

    const records = await ProgressionService.getExerciseRecords(request.user!.userId, exerciseId);

    return reply.send({ data: records });
  });

  // ============================================
  // EXERCISE STATS
  // ============================================

  // Get exercise stats and history
  app.get('/progression/stats/:exerciseId', { preHandler: authenticate }, async (request, reply) => {
    const { exerciseId } = request.params as { exerciseId: string };

    const stats = await ProgressionService.getExerciseStats(request.user!.userId, exerciseId);

    if (!stats) {
      return reply.status(404).send({ error: 'Exercise not found' });
    }

    return reply.send({ data: stats });
  });

  // ============================================
  // RECOMMENDATIONS
  // ============================================

  // Get recommendations for all recently trained exercises
  app.get('/progression/recommendations', { preHandler: authenticate }, async (request, reply) => {
    const query = request.query as { limit?: string };
    const limit = Math.min(parseInt(query.limit || '10'), 20);

    const recommendations = await ProgressionService.getAllRecommendations(request.user!.userId, limit);

    return reply.send({ data: recommendations });
  });

  // Get recommendation for a specific exercise
  app.get('/progression/recommendations/:exerciseId', { preHandler: authenticate }, async (request, reply) => {
    const { exerciseId } = request.params as { exerciseId: string };

    const recommendation = await ProgressionService.getRecommendations(request.user!.userId, exerciseId);

    if (!recommendation) {
      return reply.status(404).send({
        error: 'Not enough data for recommendations',
        message: 'Complete at least 3 workouts with this exercise to get recommendations.',
      });
    }

    return reply.send({ data: recommendation });
  });

  // ============================================
  // PROGRESSION TARGETS
  // ============================================

  // Get all active targets
  app.get('/progression/targets', { preHandler: authenticate }, async (request, reply) => {
    const query = request.query as { exerciseId?: string; includeCompleted?: string };
    const activeOnly = query.includeCompleted !== 'true';

    const targets = await ProgressionService.getTargets(request.user!.userId, {
      exerciseId: query.exerciseId,
      activeOnly,
    });

    return reply.send({ data: targets });
  });

  // Create a new target
  app.post('/progression/targets', { preHandler: authenticate }, async (request, reply) => {
    const parsed = createTargetSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({
        error: 'Invalid request body',
        details: parsed.error.errors,
      });
    }

    const target = await ProgressionService.createTarget(request.user!.userId, {
      exerciseId: parsed.data.exerciseId,
      targetType: parsed.data.targetType,
      currentValue: parsed.data.currentValue,
      targetValue: parsed.data.targetValue,
      incrementValue: parsed.data.incrementValue,
      incrementFrequency: parsed.data.incrementFrequency,
      targetDate: parsed.data.targetDate ? new Date(parsed.data.targetDate) : undefined,
    });

    return reply.status(201).send({ data: target });
  });

  // Update target progress
  app.put('/progression/targets/:id', { preHandler: authenticate }, async (request, reply) => {
    const { id } = request.params as { id: string };

    const parsed = updateTargetSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({
        error: 'Invalid request body',
        details: parsed.error.errors,
      });
    }

    try {
      const target = await ProgressionService.updateTargetProgress(
        id,
        request.user!.userId,
        parsed.data.currentValue
      );

      return reply.send({ data: target });
    } catch (_err) {
      return reply.status(404).send({ error: 'Target not found' });
    }
  });

  log.info('Progression routes registered');
}
