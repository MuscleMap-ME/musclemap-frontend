/**
 * Watch Sync Routes (Fastify)
 *
 * API endpoints for Apple Watch companion app synchronization.
 * Handles workout state sync, rest timer state, and watch-specific data.
 */

import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { authenticate } from './auth';
import { queryOne, queryAll, query } from '../../db/client';
import { loggers } from '../../lib/logger';

const log = loggers.db;

// Schemas
const watchWorkoutSyncSchema = z.object({
  id: z.string(),
  startTime: z.number(), // Unix timestamp
  endTime: z.number(), // Unix timestamp
  exercises: z.array(
    z.object({
      exerciseId: z.string(),
      setNumber: z.number().int().min(1),
      reps: z.number().int().min(0),
      weight: z.number().min(0).optional(),
    })
  ),
  totalSets: z.number().int().min(0),
  totalReps: z.number().int().min(0),
  heartRateSamples: z.array(z.number()).optional(),
  caloriesBurned: z.number().min(0).optional(),
});

const watchStateUpdateSchema = z.object({
  isWorkoutActive: z.boolean().optional(),
  currentExerciseId: z.string().optional(),
  currentSet: z.number().int().min(1).optional(),
  restTimerActive: z.boolean().optional(),
  restTimerSeconds: z.number().int().min(0).optional(),
  todayTU: z.number().min(0).optional(),
  todayWorkouts: z.number().int().min(0).optional(),
});

interface WatchExercise {
  id: string;
  name: string;
  muscleGroup: string;
  usesWeight: boolean;
  defaultSets: number;
  defaultReps: number;
  defaultRestSeconds: number;
}

interface WatchWorkoutState {
  isActive: boolean;
  workoutId: string | null;
  currentExercise: WatchExercise | null;
  currentSet: number;
  targetSets: number;
  exercises: WatchExercise[];
  restTimer: {
    isActive: boolean;
    remainingSeconds: number;
    defaultSeconds: number;
  };
  stats: {
    todayTU: number;
    todayWorkouts: number;
    streakDays: number;
  };
}

export async function registerWatchRoutes(app: FastifyInstance) {
  /**
   * POST /watch/sync
   *
   * Sync a completed workout from the Apple Watch.
   * Creates a workout record and updates user stats.
   */
  app.post('/watch/sync', { preHandler: authenticate }, async (request, reply) => {
    let data;
    try {
      data = watchWorkoutSyncSchema.parse(request.body);
    } catch (_error) {
      return reply.status(400).send({
        error: { code: 'VALIDATION', message: 'Invalid watch sync data', statusCode: 400 },
      });
    }

    const userId = request.user!.userId;

    try {
      // Check if workout already synced (idempotency)
      const existing = await queryOne<{ id: string }>(
        'SELECT id FROM workouts WHERE id = $1',
        [`watch_${data.id}`]
      );

      if (existing) {
        log.info({ workoutId: data.id, userId }, 'Watch workout already synced');
        return reply.send({
          data: { synced: true, duplicate: true, workoutId: existing.id },
        });
      }

      // Get exercise details for TU calculation
      const exerciseIds = Array.from(new Set(data.exercises.map((e) => e.exerciseId)));
      const placeholders = exerciseIds.map((_, i) => `$${i + 1}`).join(',');

      const exerciseDetails = await queryAll<{
        id: string;
        name: string;
        primary_muscle_id: string;
      }>(
        `SELECT id, name, primary_muscle_id FROM exercises WHERE id IN (${placeholders})`,
        exerciseIds
      );

      const exerciseMap = new Map(exerciseDetails.map((e) => [e.id, e]));

      // Calculate basic TU (simplified for watch sync)
      // Full TU calculation happens in the main workout creation endpoint
      const totalTU = data.exercises.reduce((sum, set) => {
        return sum + set.reps * 0.5; // Simplified TU estimate
      }, 0);

      // Build exercise data for storage
      const exerciseData = data.exercises.map((set) => ({
        exerciseId: set.exerciseId,
        exerciseName: exerciseMap.get(set.exerciseId)?.name || 'Unknown',
        sets: 1, // Each entry is one set
        reps: set.reps,
        weight: set.weight,
      }));

      // Group by exercise for muscle activations (simplified)
      const muscleActivations: Record<string, number> = {};
      for (const set of data.exercises) {
        const exercise = exerciseMap.get(set.exerciseId);
        if (exercise?.primary_muscle_id) {
          muscleActivations[exercise.primary_muscle_id] =
            (muscleActivations[exercise.primary_muscle_id] || 0) + set.reps * 0.5;
        }
      }

      // Create workout record
      const workoutId = `watch_${data.id}`;
      const workoutDate = new Date(data.startTime).toISOString().split('T')[0];

      await query(
        `INSERT INTO workouts (id, user_id, date, total_tu, credits_used, notes, is_public, exercise_data, muscle_activations)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [
          workoutId,
          userId,
          workoutDate,
          totalTU,
          0, // Watch workouts are free to sync
          'Synced from Apple Watch',
          false, // Private by default
          JSON.stringify(exerciseData),
          JSON.stringify(muscleActivations),
        ]
      );

      log.info(
        {
          workoutId,
          userId,
          totalTU,
          sets: data.totalSets,
          reps: data.totalReps,
          calories: data.caloriesBurned,
        },
        'Watch workout synced'
      );

      // Store heart rate data if available
      if (data.heartRateSamples && data.heartRateSamples.length > 0) {
        const avgHeartRate =
          data.heartRateSamples.reduce((a, b) => a + b, 0) / data.heartRateSamples.length;
        const maxHeartRate = Math.max(...data.heartRateSamples);
        const minHeartRate = Math.min(...data.heartRateSamples);

        // Store in wearable_health_data table if exists
        try {
          await query(
            `INSERT INTO wearable_health_data (id, user_id, provider, data_type, value, recorded_at)
             VALUES ($1, $2, 'apple_watch', 'heart_rate_workout', $3, $4)`,
            [
              `hr_${workoutId}`,
              userId,
              JSON.stringify({
                avg: avgHeartRate,
                max: maxHeartRate,
                min: minHeartRate,
                samples: data.heartRateSamples.length,
              }),
              new Date(data.startTime),
            ]
          );
        } catch (hrError) {
          // Non-critical, log and continue
          log.warn({ hrError, workoutId }, 'Failed to store heart rate data');
        }
      }

      return reply.status(201).send({
        data: {
          synced: true,
          workoutId,
          totalTU,
          exerciseCount: data.exercises.length,
          setCount: data.totalSets,
          repCount: data.totalReps,
        },
      });
    } catch (error: any) {
      log.error({ error: error?.message, userId }, 'Watch sync error');
      return reply.status(500).send({
        error: { code: 'SYNC_FAILED', message: 'Failed to sync workout from watch', statusCode: 500 },
      });
    }
  });

  /**
   * GET /watch/workout-state
   *
   * Get the current workout state for the watch app.
   * Returns prescribed exercises, current progress, and user stats.
   */
  app.get('/watch/workout-state', { preHandler: authenticate }, async (request, reply) => {
    const userId = request.user!.userId;

    try {
      // Get user's current journey data for stats
      const [_journeyData, todayWorkouts, exercises] = await Promise.all([
        // Get user's total TU and streak
        queryOne<{ total_tu: number; streak: number }>(
          `SELECT
             COALESCE(SUM(total_tu), 0) as total_tu,
             0 as streak
           FROM workouts
           WHERE user_id = $1 AND date >= CURRENT_DATE - INTERVAL '7 days'`,
          [userId]
        ),

        // Get today's workout count
        queryOne<{ count: number }>(
          `SELECT COUNT(*)::int as count
           FROM workouts
           WHERE user_id = $1 AND date = CURRENT_DATE`,
          [userId]
        ),

        // Get recent/favorite exercises for quick start
        queryAll<{
          id: string;
          name: string;
          muscle_group: string;
          equipment: string;
          primary_muscle_id: string;
        }>(
          `SELECT DISTINCT ON (e.id)
             e.id, e.name, e.muscle_group, e.equipment, e.primary_muscle_id
           FROM exercises e
           INNER JOIN workout_exercises we ON we.exercise_id = e.id
           INNER JOIN workouts w ON w.id = we.workout_id
           WHERE w.user_id = $1
           ORDER BY e.id, w.created_at DESC
           LIMIT 10`,
          [userId]
        ).catch(() => []), // Handle case where workout_exercises doesn't exist
      ]);

      // Get default exercises if user has no history
      let watchExercises: WatchExercise[] = exercises.map((e) => ({
        id: e.id,
        name: e.name,
        muscleGroup: e.muscle_group,
        usesWeight: e.equipment !== 'bodyweight',
        defaultSets: 3,
        defaultReps: 10,
        defaultRestSeconds: 90,
      }));

      // If no exercises found, get popular ones
      if (watchExercises.length === 0) {
        const popularExercises = await queryAll<{
          id: string;
          name: string;
          muscle_group: string;
          equipment: string;
        }>(
          `SELECT id, name, muscle_group, equipment
           FROM exercises
           WHERE muscle_group IN ('chest', 'back', 'legs', 'shoulders', 'arms')
           ORDER BY RANDOM()
           LIMIT 10`
        );

        watchExercises = popularExercises.map((e) => ({
          id: e.id,
          name: e.name,
          muscleGroup: e.muscle_group,
          usesWeight: e.equipment !== 'bodyweight',
          defaultSets: 3,
          defaultReps: 10,
          defaultRestSeconds: 90,
        }));
      }

      // Calculate today's TU
      const todayTUResult = await queryOne<{ total_tu: number }>(
        `SELECT COALESCE(SUM(total_tu), 0) as total_tu
         FROM workouts
         WHERE user_id = $1 AND date = CURRENT_DATE`,
        [userId]
      );

      // Calculate streak
      const streakResult = await queryOne<{ streak: number }>(
        `WITH workout_days AS (
           SELECT DISTINCT date
           FROM workouts
           WHERE user_id = $1 AND date <= CURRENT_DATE
           ORDER BY date DESC
         ),
         streak_calc AS (
           SELECT date,
             date - (ROW_NUMBER() OVER (ORDER BY date DESC))::int * INTERVAL '1 day' as grp
           FROM workout_days
         )
         SELECT COUNT(*)::int as streak
         FROM streak_calc
         WHERE grp = (SELECT grp FROM streak_calc WHERE date = CURRENT_DATE)`,
        [userId]
      ).catch(() => ({ streak: 0 }));

      const state: WatchWorkoutState = {
        isActive: false,
        workoutId: null,
        currentExercise: watchExercises[0] || null,
        currentSet: 1,
        targetSets: 3,
        exercises: watchExercises,
        restTimer: {
          isActive: false,
          remainingSeconds: 90,
          defaultSeconds: 90,
        },
        stats: {
          todayTU: todayTUResult?.total_tu || 0,
          todayWorkouts: todayWorkouts?.count || 0,
          streakDays: streakResult?.streak || 0,
        },
      };

      return reply.send({ data: state });
    } catch (error: any) {
      log.error({ error: error?.message, userId }, 'Failed to get watch workout state');
      return reply.status(500).send({
        error: { code: 'FETCH_FAILED', message: 'Failed to get workout state', statusCode: 500 },
      });
    }
  });

  /**
   * POST /watch/state
   *
   * Update watch state (for bidirectional sync).
   * Phone app can push state updates to be reflected on watch.
   */
  app.post('/watch/state', { preHandler: authenticate }, async (request, reply) => {
    let data;
    try {
      data = watchStateUpdateSchema.parse(request.body);
    } catch (_error) {
      return reply.status(400).send({
        error: { code: 'VALIDATION', message: 'Invalid state update data', statusCode: 400 },
      });
    }

    const userId = request.user!.userId;

    // Store state in Redis or database for watch to poll
    // For now, we just acknowledge the update
    log.info({ userId, state: data }, 'Watch state update received');

    return reply.send({
      data: { updated: true, timestamp: Date.now() },
    });
  });

  /**
   * GET /watch/exercises
   *
   * Get exercises optimized for watch display.
   * Returns a lightweight list suitable for small screens.
   */
  app.get('/watch/exercises', { preHandler: authenticate }, async (request, reply) => {
    const query_params = request.query as { muscleGroup?: string; limit?: string };
    const limit = Math.min(parseInt(query_params.limit || '20'), 50);

    try {
      let sql = `
        SELECT id, name, muscle_group, equipment
        FROM exercises
        WHERE 1=1
      `;
      const params: unknown[] = [];
      let paramIndex = 1;

      if (query_params.muscleGroup) {
        sql += ` AND muscle_group = $${paramIndex}`;
        params.push(query_params.muscleGroup);
        paramIndex++;
      }

      sql += ` ORDER BY name LIMIT $${paramIndex}`;
      params.push(limit);

      const exercises = await queryAll<{
        id: string;
        name: string;
        muscle_group: string;
        equipment: string;
      }>(sql, params);

      const watchExercises: WatchExercise[] = exercises.map((e) => ({
        id: e.id,
        name: e.name,
        muscleGroup: e.muscle_group,
        usesWeight: e.equipment !== 'bodyweight',
        defaultSets: 3,
        defaultReps: 10,
        defaultRestSeconds: 90,
      }));

      return reply.send({ data: watchExercises });
    } catch (error: any) {
      log.error({ error: error?.message }, 'Failed to get watch exercises');
      return reply.status(500).send({
        error: { code: 'FETCH_FAILED', message: 'Failed to get exercises', statusCode: 500 },
      });
    }
  });

  /**
   * GET /watch/quick-start
   *
   * Get a quick-start workout based on user preferences and history.
   * Returns a curated set of exercises for immediate workout start.
   */
  app.get('/watch/quick-start', { preHandler: authenticate }, async (request, reply) => {
    const userId = request.user!.userId;

    try {
      // Get user's archetype for personalized recommendations
      const _archetype = await queryOne<{ archetype_id: string }>(
        `SELECT archetype_id FROM users WHERE id = $1`,
        [userId]
      );

      // Get exercises based on archetype or default to balanced routine
      let exercises: WatchExercise[] = [];

      // Try to get user's recent exercises first
      const recentExercises = await queryAll<{
        exercise_id: string;
        name: string;
        muscle_group: string;
        equipment: string;
        usage_count: number;
      }>(
        `WITH exercise_usage AS (
           SELECT
             e.id as exercise_id,
             e.name,
             e.muscle_group,
             e.equipment,
             COUNT(*) as usage_count
           FROM workouts w
           CROSS JOIN LATERAL jsonb_array_elements(w.exercise_data::jsonb) as ed
           JOIN exercises e ON e.id = ed->>'exerciseId'
           WHERE w.user_id = $1
           GROUP BY e.id, e.name, e.muscle_group, e.equipment
         )
         SELECT * FROM exercise_usage
         ORDER BY usage_count DESC
         LIMIT 8`,
        [userId]
      ).catch(() => []);

      if (recentExercises.length >= 4) {
        exercises = recentExercises.map((e) => ({
          id: e.exercise_id,
          name: e.name,
          muscleGroup: e.muscle_group,
          usesWeight: e.equipment !== 'bodyweight',
          defaultSets: 3,
          defaultReps: 10,
          defaultRestSeconds: 90,
        }));
      } else {
        // Fall back to a balanced default routine
        const defaultExercises = await queryAll<{
          id: string;
          name: string;
          muscle_group: string;
          equipment: string;
        }>(
          `SELECT DISTINCT ON (muscle_group)
             id, name, muscle_group, equipment
           FROM exercises
           WHERE muscle_group IN ('chest', 'back', 'legs', 'shoulders', 'arms', 'core')
             AND equipment IN ('barbell', 'dumbbell', 'machine', 'bodyweight')
           ORDER BY muscle_group, RANDOM()`
        );

        exercises = defaultExercises.map((e) => ({
          id: e.id,
          name: e.name,
          muscleGroup: e.muscle_group,
          usesWeight: e.equipment !== 'bodyweight',
          defaultSets: 3,
          defaultReps: 10,
          defaultRestSeconds: 90,
        }));
      }

      return reply.send({
        data: {
          name: 'Quick Start Workout',
          exercises,
          estimatedDuration: exercises.length * 5, // ~5 min per exercise
          targetTU: exercises.length * 15, // Estimated TU
        },
      });
    } catch (error: any) {
      log.error({ error: error?.message, userId }, 'Failed to get quick start workout');
      return reply.status(500).send({
        error: { code: 'FETCH_FAILED', message: 'Failed to get quick start workout', statusCode: 500 },
      });
    }
  });
}
