/**
 * Workouts Routes (Fastify)
 *
 * Handles workout creation, retrieval, and statistics.
 */

import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import crypto from 'crypto';
import { authenticate, optionalAuth } from './auth';
import { queryOne, queryAll, query, transaction } from '../../db/client';
import { economyService } from '../../modules/economy';
import { statsService } from '../../modules/stats';
import { loggers } from '../../lib/logger';

const log = loggers.db;

// Schemas
const workoutExerciseSchema = z.object({
  exerciseId: z.string(),
  sets: z.number().int().min(1).max(100),
  reps: z.number().int().min(1).max(1000).optional(),
  weight: z.number().min(0).max(10000).optional(),
  duration: z.number().int().min(0).max(86400).optional(),
  notes: z.string().max(500).optional(),
});

const createWorkoutSchema = z.object({
  exercises: z.array(workoutExerciseSchema).min(1).max(50),
  date: z.string().optional(),
  notes: z.string().max(2000).optional(),
  isPublic: z.boolean().optional(),
  idempotencyKey: z.string(),
});

interface WorkoutExercise {
  exerciseId: string;
  sets: number;
  reps?: number;
  weight?: number;
  duration?: number;
  notes?: string;
}

/**
 * Calculate total TU and muscle activations for a workout
 */
async function calculateTU(exercises: WorkoutExercise[]): Promise<{
  totalTU: number;
  muscleActivations: Record<string, number>;
}> {
  const muscleActivations: Record<string, number> = {};

  // Get all exercise activations in one query
  const exerciseIds = exercises.map((e) => e.exerciseId);
  const placeholders = exerciseIds.map((_, i) => `$${i + 1}`).join(',');

  const activations = await queryAll<{ exercise_id: string; muscle_id: string; activation: number }>(
    `SELECT exercise_id, muscle_id, activation FROM exercise_activations WHERE exercise_id IN (${placeholders})`,
    exerciseIds
  );

  // Build activation map
  const activationMap: Record<string, Record<string, number>> = {};
  for (const row of activations) {
    if (!activationMap[row.exercise_id]) {
      activationMap[row.exercise_id] = {};
    }
    activationMap[row.exercise_id][row.muscle_id] = row.activation;
  }

  // Calculate activations
  for (const exercise of exercises) {
    const exerciseActivations = activationMap[exercise.exerciseId] || {};
    for (const [muscleId, activation] of Object.entries(exerciseActivations)) {
      const contribution = exercise.sets * (activation / 100);
      muscleActivations[muscleId] = (muscleActivations[muscleId] || 0) + contribution;
    }
  }

  // Get muscles with bias weights
  const muscleIds = Object.keys(muscleActivations);
  if (muscleIds.length === 0) {
    return { totalTU: 0, muscleActivations: {} };
  }

  const musclePlaceholders = muscleIds.map((_, i) => `$${i + 1}`).join(',');
  const muscles = await queryAll<{ id: string; bias_weight: number }>(
    `SELECT id, bias_weight FROM muscles WHERE id IN (${musclePlaceholders})`,
    muscleIds
  );

  const biasMap = new Map(muscles.map((m) => [m.id, m.bias_weight]));

  let totalTU = 0;
  for (const [muscleId, rawActivation] of Object.entries(muscleActivations)) {
    const biasWeight = biasMap.get(muscleId) || 1;
    totalTU += rawActivation * biasWeight;
  }

  return { totalTU: Math.round(totalTU * 100) / 100, muscleActivations };
}

export async function registerWorkoutRoutes(app: FastifyInstance) {
  // Create workout
  app.post('/workouts', { preHandler: authenticate }, async (request, reply) => {
    let data;
    try {
      data = createWorkoutSchema.parse(request.body);
    } catch (error) {
      log.error({ error }, 'Invalid workout data');
      return reply.status(400).send({
        error: { code: 'VALIDATION', message: 'Invalid workout data', statusCode: 400 },
      });
    }

    const userId = request.user!.userId;

    try {
      // Check idempotency
      const existing = await queryOne<{ id: string }>(
        'SELECT id FROM workouts WHERE id = $1',
        [data.idempotencyKey]
      );

      if (existing) {
        const workout = await queryOne(
          `SELECT id, user_id as "userId", date, total_tu as "totalTU", credits_used as "creditsUsed",
                  notes, is_public as "isPublic", exercise_data, muscle_activations, created_at as "createdAt"
           FROM workouts WHERE id = $1`,
          [existing.id]
        );
        return reply.send({ data: workout });
      }

      // Validate exercises exist
      const exerciseIds = data.exercises.map((e) => e.exerciseId);
      const placeholders = exerciseIds.map((_, i) => `$${i + 1}`).join(',');
      const foundExercises = await queryAll<{ id: string }>(
        `SELECT id FROM exercises WHERE id IN (${placeholders})`,
        exerciseIds
      );

      if (foundExercises.length !== exerciseIds.length) {
        const foundIds = new Set(foundExercises.map((e) => e.id));
        const missing = exerciseIds.find((id) => !foundIds.has(id));
        return reply.status(400).send({
          error: { code: 'VALIDATION', message: `Exercise not found: ${missing}`, statusCode: 400 },
        });
      }

      const { totalTU, muscleActivations } = await calculateTU(data.exercises as WorkoutExercise[]);

      // Charge credits
      let chargeResult;
      try {
        chargeResult = await economyService.charge({
          userId,
          action: 'workout.complete',
          idempotencyKey: `workout-${data.idempotencyKey}`,
          metadata: { totalTU, exerciseCount: data.exercises.length },
        });
      } catch (chargeError) {
        log.error({ chargeError, userId }, 'Failed to charge credits');
        return reply.status(500).send({
          error: { code: 'CHARGE_FAILED', message: 'Failed to process payment. Please try again.', statusCode: 500 },
        });
      }

      if (!chargeResult.success) {
        return reply.status(402).send({
          error: { code: 'INSUFFICIENT_CREDITS', message: chargeResult.error || 'Failed to charge credits', statusCode: 402 },
        });
      }

      const workoutId = data.idempotencyKey.startsWith('workout_') ? data.idempotencyKey : `workout_${crypto.randomBytes(12).toString('hex')}`;
      const workoutDate = data.date || new Date().toISOString().split('T')[0];

      // Insert workout - if this fails after charging, the idempotency key prevents double-charging on retry
      try {
        await query(
          `INSERT INTO workouts (id, user_id, date, total_tu, credits_used, notes, is_public, exercise_data, muscle_activations)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
          [
            workoutId,
            userId,
            workoutDate,
            totalTU,
            25,
            data.notes || null,
            data.isPublic !== false,
            JSON.stringify(data.exercises),
            JSON.stringify(muscleActivations),
          ]
        );
      } catch (insertError: any) {
        // Check if it's a duplicate key error (workout already exists)
        if (insertError.code === '23505') {
          log.info({ workoutId, userId }, 'Workout already exists (duplicate insert)');
        } else {
          log.error({ insertError, workoutId, userId }, 'Failed to insert workout');
          // Refund the credits since we couldn't save the workout
          try {
            await economyService.refund({
              userId,
              action: 'workout.complete',
              idempotencyKey: `refund-${data.idempotencyKey}`,
              metadata: { reason: 'workout_insert_failed', originalTU: totalTU },
            });
          } catch (refundError) {
            log.error({ refundError, userId, workoutId }, 'Failed to refund credits after workout insert failure');
          }
          return reply.status(500).send({
            error: { code: 'SAVE_FAILED', message: 'Failed to save workout. Please try again.', statusCode: 500 },
          });
        }
      }

      log.info({ workoutId, userId, totalTU }, 'Workout created');

      // Update character stats - non-critical, log errors but don't fail the request
      let updatedStats = null;
      try {
        updatedStats = await statsService.updateStatsFromWorkout(userId, data.exercises as any);
      } catch (statsError) {
        log.error({ statsError, userId, workoutId }, 'Failed to update character stats');
      }

      // Create daily snapshot - non-critical
      try {
        await statsService.createDailySnapshot(userId);
      } catch (snapshotError) {
        log.error({ snapshotError, userId }, 'Failed to create daily snapshot');
      }

      const workout = await queryOne(
        `SELECT id, user_id as "userId", date, total_tu as "totalTU", credits_used as "creditsUsed",
                notes, is_public as "isPublic", exercise_data, muscle_activations, created_at as "createdAt"
         FROM workouts WHERE id = $1`,
        [workoutId]
      );

      // Safely parse JSON fields
      let exerciseData = [];
      let muscleActivationsData = {};
      try {
        exerciseData = JSON.parse((workout as any)?.exercise_data || '[]');
      } catch (parseError) {
        log.error({ parseError, workoutId }, 'Failed to parse exercise_data');
      }
      try {
        muscleActivationsData = JSON.parse((workout as any)?.muscle_activations || '{}');
      } catch (parseError) {
        log.error({ parseError, workoutId }, 'Failed to parse muscle_activations');
      }

      return reply.status(201).send({
        data: {
          ...workout,
          exerciseData,
          muscleActivations: muscleActivationsData,
          characterStats: updatedStats ? {
            strength: Number(updatedStats.strength),
            constitution: Number(updatedStats.constitution),
            dexterity: Number(updatedStats.dexterity),
            power: Number(updatedStats.power),
            endurance: Number(updatedStats.endurance),
            vitality: Number(updatedStats.vitality),
          } : undefined,
        },
      });
    } catch (error: any) {
      log.error({ error: error?.message || error, stack: error?.stack, userId }, 'Unexpected error during workout creation');
      return reply.status(500).send({
        error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred. Please try again.', statusCode: 500 },
      });
    }
  });

  // Get user's workouts (keyset pagination for scale)
  app.get('/workouts/me', { preHandler: authenticate }, async (request, reply) => {
    const query_params = request.query as { limit?: string; cursor?: string };
    const limit = Math.min(parseInt(query_params.limit || '50'), 100);

    // Parse cursor (format: "date:id" or empty for first page)
    let cursorDate: string | null = null;
    let cursorId: string | null = null;
    if (query_params.cursor) {
      const [date, id] = query_params.cursor.split(':');
      cursorDate = date;
      cursorId = id;
    }

    // Use keyset pagination: WHERE (date, id) < (cursor_date, cursor_id)
    // This is much faster than OFFSET at scale
    let sql: string;
    let params: unknown[];

    if (cursorDate && cursorId) {
      sql = `SELECT id, user_id as "userId", date, total_tu as "totalTU", credits_used as "creditsUsed",
                    notes, is_public as "isPublic", exercise_data, muscle_activations, created_at as "createdAt"
             FROM workouts
             WHERE user_id = $1 AND (date, id) < ($2, $3)
             ORDER BY date DESC, id DESC
             LIMIT $4`;
      params = [request.user!.userId, cursorDate, cursorId, limit];
    } else {
      sql = `SELECT id, user_id as "userId", date, total_tu as "totalTU", credits_used as "creditsUsed",
                    notes, is_public as "isPublic", exercise_data, muscle_activations, created_at as "createdAt"
             FROM workouts
             WHERE user_id = $1
             ORDER BY date DESC, id DESC
             LIMIT $2`;
      params = [request.user!.userId, limit];
    }

    const workouts = await queryAll(sql, params);

    // Generate next cursor from last item
    const lastWorkout = workouts[workouts.length - 1] as any;
    const nextCursor = lastWorkout ? `${lastWorkout.date}:${lastWorkout.id}` : null;

    return reply.send({
      data: workouts.map((w: any) => ({
        ...w,
        isPublic: Boolean(w.isPublic),
        exerciseData: JSON.parse(w.exercise_data || '[]'),
        muscleActivations: JSON.parse(w.muscle_activations || '{}'),
      })),
      meta: {
        limit,
        cursor: query_params.cursor || null,
        nextCursor,
        hasMore: workouts.length === limit,
      },
    });
  });

  // Get user stats
  app.get('/workouts/me/stats', { preHandler: authenticate }, async (request, reply) => {
    const userId = request.user!.userId;

    const [allTime, thisWeek, thisMonth] = await Promise.all([
      queryOne<{ workoutCount: number; totalTU: number }>(
        `SELECT COUNT(*)::int as "workoutCount", COALESCE(SUM(total_tu), 0)::float as "totalTU"
         FROM workouts WHERE user_id = $1`,
        [userId]
      ),
      queryOne<{ workoutCount: number; totalTU: number }>(
        `SELECT COUNT(*)::int as "workoutCount", COALESCE(SUM(total_tu), 0)::float as "totalTU"
         FROM workouts WHERE user_id = $1 AND date >= CURRENT_DATE - INTERVAL '7 days'`,
        [userId]
      ),
      queryOne<{ workoutCount: number; totalTU: number }>(
        `SELECT COUNT(*)::int as "workoutCount", COALESCE(SUM(total_tu), 0)::float as "totalTU"
         FROM workouts WHERE user_id = $1 AND date >= CURRENT_DATE - INTERVAL '30 days'`,
        [userId]
      ),
    ]);

    return reply.send({ data: { allTime, thisWeek, thisMonth } });
  });

  // Get user muscle activations
  app.get('/workouts/me/muscles', { preHandler: authenticate }, async (request, reply) => {
    const query_params = request.query as { days?: string };
    const days = Math.min(parseInt(query_params.days || '7'), 365);

    const workouts = await queryAll<{ muscle_activations: string }>(
      `SELECT muscle_activations FROM workouts
       WHERE user_id = $1 AND date >= CURRENT_DATE - INTERVAL '${days} days'`,
      [request.user!.userId]
    );

    const totals: Record<string, number> = {};
    for (const row of workouts) {
      const activations = JSON.parse(row.muscle_activations || '{}');
      for (const [muscleId, value] of Object.entries(activations)) {
        totals[muscleId] = (totals[muscleId] || 0) + (value as number);
      }
    }

    return reply.send({ data: totals, meta: { days } });
  });

  // Preview workout (calculate TU without saving)
  app.post('/workouts/preview', { preHandler: authenticate }, async (request, reply) => {
    const data = z.object({ exercises: z.array(workoutExerciseSchema) }).parse(request.body);
    const { totalTU, muscleActivations } = await calculateTU(data.exercises as WorkoutExercise[]);
    return reply.send({ data: { totalTU, activations: muscleActivations } });
  });

  // Get single workout
  app.get('/workouts/:id', { preHandler: optionalAuth }, async (request, reply) => {
    const { id } = request.params as { id: string };

    const workout = await queryOne(
      `SELECT id, user_id as "userId", date, total_tu as "totalTU", credits_used as "creditsUsed",
              notes, is_public as "isPublic", exercise_data, muscle_activations, created_at as "createdAt"
       FROM workouts WHERE id = $1`,
      [id]
    );

    if (!workout) {
      return reply.status(404).send({
        error: { code: 'NOT_FOUND', message: 'Workout not found', statusCode: 404 },
      });
    }

    const w = workout as any;
    if (!w.isPublic && w.userId !== request.user?.userId) {
      return reply.status(404).send({
        error: { code: 'NOT_FOUND', message: 'Workout not found', statusCode: 404 },
      });
    }

    return reply.send({
      data: {
        ...w,
        isPublic: Boolean(w.isPublic),
        exerciseData: JSON.parse(w.exercise_data || '[]'),
        muscleActivations: JSON.parse(w.muscle_activations || '{}'),
      },
    });
  });
}
