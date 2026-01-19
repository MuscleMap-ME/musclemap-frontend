/**
 * Workout Sets Routes
 *
 * API endpoints for logging and managing individual workout sets:
 * - Log individual sets with automatic 1RM calculation
 * - Get set history for an exercise
 * - Update and delete sets
 * - PR detection and achievement unlocking
 */

import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { authenticate } from './auth';
import { query, queryOne, queryAll } from '../../db/client';
import { OneRepMaxService, OneRMFormulas } from '../../services/one-rep-max.service';
import { loggers } from '../../lib/logger';

const log = loggers.core.child({ module: 'workout-sets' });

// ============================================
// Validation Schemas
// ============================================

const logSetSchema = z.object({
  workoutId: z.string().min(1),
  exerciseId: z.string().min(1),
  setNumber: z.number().int().positive().max(100),
  weight: z.number().min(0).max(10000).optional(),
  reps: z.number().int().positive().max(1000),
  durationSeconds: z.number().int().min(0).max(86400).optional(),
  distanceMeters: z.number().min(0).max(100000).optional(),
  tag: z.enum(['warmup', 'working', 'failure', 'drop', 'cluster', 'amrap']).default('working'),
  rpe: z.number().int().min(1).max(10).optional(),
  rir: z.number().int().min(0).max(10).optional(),
  tempo: z.string().max(20).optional(),
  notes: z.string().max(500).optional(),
  bodyweightKg: z.number().positive().max(500).optional(),
});

const logMultipleSetsSchema = z.object({
  workoutId: z.string().min(1),
  exerciseId: z.string().min(1),
  sets: z.array(z.object({
    setNumber: z.number().int().positive().max(100),
    weight: z.number().min(0).max(10000).optional(),
    reps: z.number().int().positive().max(1000),
    durationSeconds: z.number().int().min(0).max(86400).optional(),
    distanceMeters: z.number().min(0).max(100000).optional(),
    tag: z.enum(['warmup', 'working', 'failure', 'drop', 'cluster', 'amrap']).default('working'),
    rpe: z.number().int().min(1).max(10).optional(),
    rir: z.number().int().min(0).max(10).optional(),
    tempo: z.string().max(20).optional(),
    notes: z.string().max(500).optional(),
  })).min(1).max(50),
  bodyweightKg: z.number().positive().max(500).optional(),
});

// ============================================
// Helper Functions
// ============================================

async function checkAndUpdatePR(
  userId: string,
  exerciseId: string,
  setId: string,
  weight: number,
  reps: number,
  estimated1rm: number
): Promise<{
  isPrWeight: boolean;
  isPrReps: boolean;
  isPrVolume: boolean;
  isPr1rm: boolean;
}> {
  // Get current PRs for this exercise
  const currentPRs = await queryOne<{
    max_weight: string | null;
    max_reps: string | null;
    max_volume: string | null;
    max_1rm: string | null;
  }>(
    `SELECT
       MAX(weight) as max_weight,
       MAX(reps) as max_reps,
       MAX(weight * reps) as max_volume,
       MAX(estimated_1rm) as max_1rm
     FROM workout_sets
     WHERE user_id = $1 AND exercise_id = $2 AND tag != 'warmup' AND id != $3`,
    [userId, exerciseId, setId]
  );

  const setVolume = weight * reps;

  const isPrWeight = !currentPRs?.max_weight || weight > parseFloat(currentPRs.max_weight);
  const isPrReps = !currentPRs?.max_reps || reps > parseInt(currentPRs.max_reps);
  const isPrVolume = !currentPRs?.max_volume || setVolume > parseFloat(currentPRs.max_volume);
  const isPr1rm = !currentPRs?.max_1rm || estimated1rm > parseFloat(currentPRs.max_1rm);

  // Update the set with PR flags
  await query(
    `UPDATE workout_sets
     SET is_pr_weight = $1, is_pr_reps = $2, is_pr_volume = $3, is_pr_1rm = $4
     WHERE id = $5`,
    [isPrWeight, isPrReps, isPrVolume, isPr1rm, setId]
  );

  return { isPrWeight, isPrReps, isPrVolume, isPr1rm };
}

// ============================================
// Routes
// ============================================

const workoutSetsRoutes: FastifyPluginAsync = async (fastify) => {
  /**
   * Log a single workout set
   * POST /sets
   */
  fastify.post(
    '/sets',
    { preHandler: authenticate },
    async (request, reply) => {
      const userId = request.user!.userId;
      const body = logSetSchema.parse(request.body);

      // Calculate estimated 1RM if weight and reps provided
      let estimated1rm: number | null = null;
      if (body.weight && body.weight > 0 && body.reps > 0 && body.tag !== 'warmup') {
        estimated1rm = Math.round(OneRMFormulas.calculate(body.weight, body.reps) * 100) / 100;
      }

      // Insert the set
      const row = await queryOne<{
        id: string;
        workout_id: string;
        user_id: string;
        exercise_id: string;
        set_number: number;
        weight: string | null;
        reps: number;
        duration_seconds: number | null;
        distance_meters: string | null;
        tag: string;
        rpe: number | null;
        rir: number | null;
        estimated_1rm: string | null;
        tempo: string | null;
        notes: string | null;
        performed_at: Date;
      }>(
        `INSERT INTO workout_sets
          (workout_id, user_id, exercise_id, set_number, weight, reps,
           duration_seconds, distance_meters, tag, rpe, rir, estimated_1rm, tempo, notes)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
         RETURNING *`,
        [
          body.workoutId,
          userId,
          body.exerciseId,
          body.setNumber,
          body.weight ?? null,
          body.reps,
          body.durationSeconds ?? null,
          body.distanceMeters ?? null,
          body.tag,
          body.rpe ?? null,
          body.rir ?? null,
          estimated1rm,
          body.tempo ?? null,
          body.notes ?? null,
        ]
      );

      if (!row) {
        return reply.status(500).send({
          error: { code: 'INSERT_FAILED', message: 'Failed to log set', statusCode: 500 },
        });
      }

      // Check for PRs if this is a working set with weight
      let prResult = null;
      let oneRmResult = null;
      let achievements: string[] = [];

      if (body.weight && body.weight > 0 && body.tag !== 'warmup' && estimated1rm) {
        // Check PRs
        prResult = await checkAndUpdatePR(
          userId,
          body.exerciseId,
          row.id,
          body.weight,
          body.reps,
          estimated1rm
        );

        // Record 1RM and check for achievements
        if (prResult.isPr1rm) {
          oneRmResult = await OneRepMaxService.record({
            userId,
            exerciseId: body.exerciseId,
            weight: body.weight,
            reps: body.reps,
            rpe: body.rpe,
            workoutId: body.workoutId,
            setId: row.id,
            bodyweightKg: body.bodyweightKg,
          });
          achievements = oneRmResult.achievements;
        }
      }

      log.info({
        userId,
        workoutId: body.workoutId,
        exerciseId: body.exerciseId,
        setNumber: body.setNumber,
        weight: body.weight,
        reps: body.reps,
        estimated1rm,
        isPr: prResult?.isPr1rm || false,
      }, 'Set logged');

      return reply.status(201).send({
        data: {
          id: row.id,
          workoutId: row.workout_id,
          exerciseId: row.exercise_id,
          setNumber: row.set_number,
          weight: row.weight ? parseFloat(row.weight) : null,
          reps: row.reps,
          durationSeconds: row.duration_seconds,
          distanceMeters: row.distance_meters ? parseFloat(row.distance_meters) : null,
          tag: row.tag,
          rpe: row.rpe,
          rir: row.rir,
          estimated1rm: row.estimated_1rm ? parseFloat(row.estimated_1rm) : null,
          tempo: row.tempo,
          notes: row.notes,
          performedAt: row.performed_at,
          prs: prResult,
          achievements,
        },
      });
    }
  );

  /**
   * Log multiple sets at once
   * POST /sets/bulk
   */
  fastify.post(
    '/sets/bulk',
    { preHandler: authenticate },
    async (request, reply) => {
      const userId = request.user!.userId;
      const body = logMultipleSetsSchema.parse(request.body);

      const results = [];
      const allAchievements: string[] = [];

      for (const set of body.sets) {
        // Calculate estimated 1RM if weight and reps provided
        let estimated1rm: number | null = null;
        if (set.weight && set.weight > 0 && set.reps > 0 && set.tag !== 'warmup') {
          estimated1rm = Math.round(OneRMFormulas.calculate(set.weight, set.reps) * 100) / 100;
        }

        // Insert the set
        const row = await queryOne<{
          id: string;
          workout_id: string;
          exercise_id: string;
          set_number: number;
          weight: string | null;
          reps: number;
          estimated_1rm: string | null;
          tag: string;
        }>(
          `INSERT INTO workout_sets
            (workout_id, user_id, exercise_id, set_number, weight, reps,
             duration_seconds, distance_meters, tag, rpe, rir, estimated_1rm, tempo, notes)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
           RETURNING id, workout_id, exercise_id, set_number, weight, reps, estimated_1rm, tag`,
          [
            body.workoutId,
            userId,
            body.exerciseId,
            set.setNumber,
            set.weight ?? null,
            set.reps,
            set.durationSeconds ?? null,
            set.distanceMeters ?? null,
            set.tag,
            set.rpe ?? null,
            set.rir ?? null,
            estimated1rm,
            set.tempo ?? null,
            set.notes ?? null,
          ]
        );

        if (!row) continue;

        let prResult = null;

        // Check for PRs if this is a working set with weight
        if (set.weight && set.weight > 0 && set.tag !== 'warmup' && estimated1rm) {
          prResult = await checkAndUpdatePR(
            userId,
            body.exerciseId,
            row.id,
            set.weight,
            set.reps,
            estimated1rm
          );

          // Record 1RM if it's a PR
          if (prResult.isPr1rm) {
            const oneRmResult = await OneRepMaxService.record({
              userId,
              exerciseId: body.exerciseId,
              weight: set.weight,
              reps: set.reps,
              rpe: set.rpe,
              workoutId: body.workoutId,
              setId: row.id,
              bodyweightKg: body.bodyweightKg,
            });
            allAchievements.push(...oneRmResult.achievements);
          }
        }

        results.push({
          id: row.id,
          setNumber: row.set_number,
          weight: row.weight ? parseFloat(row.weight) : null,
          reps: row.reps,
          estimated1rm: row.estimated_1rm ? parseFloat(row.estimated_1rm) : null,
          tag: row.tag,
          prs: prResult,
        });
      }

      log.info({
        userId,
        workoutId: body.workoutId,
        exerciseId: body.exerciseId,
        setsLogged: results.length,
      }, 'Bulk sets logged');

      return reply.status(201).send({
        data: {
          workoutId: body.workoutId,
          exerciseId: body.exerciseId,
          sets: results,
          achievements: [...new Set(allAchievements)], // Dedupe
        },
      });
    }
  );

  /**
   * Get sets for a workout
   * GET /sets/workout/:workoutId
   */
  fastify.get(
    '/sets/workout/:workoutId',
    { preHandler: authenticate },
    async (request, reply) => {
      const userId = request.user!.userId;
      const { workoutId } = request.params as { workoutId: string };

      const sets = await queryAll<{
        id: string;
        workout_id: string;
        exercise_id: string;
        set_number: number;
        weight: string | null;
        reps: number;
        duration_seconds: number | null;
        distance_meters: string | null;
        tag: string;
        rpe: number | null;
        rir: number | null;
        estimated_1rm: string | null;
        tempo: string | null;
        notes: string | null;
        is_pr_weight: boolean;
        is_pr_reps: boolean;
        is_pr_volume: boolean;
        is_pr_1rm: boolean;
        performed_at: Date;
        exercise_name: string | null;
      }>(
        `SELECT ws.*, e.name as exercise_name
         FROM workout_sets ws
         LEFT JOIN exercises e ON e.id = ws.exercise_id
         WHERE ws.workout_id = $1 AND ws.user_id = $2
         ORDER BY ws.exercise_id, ws.set_number`,
        [workoutId, userId]
      );

      // Group sets by exercise
      const byExercise: Record<string, typeof sets> = {};
      for (const set of sets) {
        if (!byExercise[set.exercise_id]) {
          byExercise[set.exercise_id] = [];
        }
        byExercise[set.exercise_id].push(set);
      }

      return reply.send({
        data: {
          workoutId,
          totalSets: sets.length,
          exercises: Object.entries(byExercise).map(([exerciseId, exerciseSets]) => ({
            exerciseId,
            exerciseName: exerciseSets[0].exercise_name,
            sets: exerciseSets.map(s => ({
              id: s.id,
              setNumber: s.set_number,
              weight: s.weight ? parseFloat(s.weight) : null,
              reps: s.reps,
              durationSeconds: s.duration_seconds,
              distanceMeters: s.distance_meters ? parseFloat(s.distance_meters) : null,
              tag: s.tag,
              rpe: s.rpe,
              rir: s.rir,
              estimated1rm: s.estimated_1rm ? parseFloat(s.estimated_1rm) : null,
              tempo: s.tempo,
              notes: s.notes,
              isPrWeight: s.is_pr_weight,
              isPrReps: s.is_pr_reps,
              isPrVolume: s.is_pr_volume,
              isPr1rm: s.is_pr_1rm,
              performedAt: s.performed_at,
            })),
          })),
        },
      });
    }
  );

  /**
   * Get set history for an exercise
   * GET /sets/exercise/:exerciseId
   */
  fastify.get(
    '/sets/exercise/:exerciseId',
    { preHandler: authenticate },
    async (request, reply) => {
      const userId = request.user!.userId;
      const { exerciseId } = request.params as { exerciseId: string };
      const { limit, days } = request.query as { limit?: string; days?: string };

      // Validate days and limit parameters to prevent SQL injection
      const validatedDays = Math.max(1, Math.min(365, Math.floor(Number(days) || 90)));
      const validatedLimit = Math.max(1, Math.min(1000, Math.floor(Number(limit) || 200)));

      const sets = await queryAll<{
        id: string;
        workout_id: string;
        set_number: number;
        weight: string | null;
        reps: number;
        estimated_1rm: string | null;
        tag: string;
        rpe: number | null;
        is_pr_weight: boolean;
        is_pr_1rm: boolean;
        performed_at: Date;
      }>(
        `SELECT id, workout_id, set_number, weight, reps, estimated_1rm, tag, rpe,
                is_pr_weight, is_pr_1rm, performed_at
         FROM workout_sets
         WHERE user_id = $1 AND exercise_id = $2 AND tag != 'warmup'
           AND performed_at >= CURRENT_DATE - INTERVAL '1 day' * $3
         ORDER BY performed_at DESC, set_number
         LIMIT $4`,
        [userId, exerciseId, validatedDays, validatedLimit]
      );

      // Calculate stats
      let maxWeight = 0;
      let best1rm = 0;
      let totalSets = sets.length;
      let totalReps = 0;
      let totalVolume = 0;

      for (const set of sets) {
        const weight = set.weight ? parseFloat(set.weight) : 0;
        const e1rm = set.estimated_1rm ? parseFloat(set.estimated_1rm) : 0;
        if (weight > maxWeight) maxWeight = weight;
        if (e1rm > best1rm) best1rm = e1rm;
        totalReps += set.reps;
        totalVolume += weight * set.reps;
      }

      return reply.send({
        data: {
          exerciseId,
          sets: sets.map(s => ({
            id: s.id,
            workoutId: s.workout_id,
            setNumber: s.set_number,
            weight: s.weight ? parseFloat(s.weight) : null,
            reps: s.reps,
            estimated1rm: s.estimated_1rm ? parseFloat(s.estimated_1rm) : null,
            tag: s.tag,
            rpe: s.rpe,
            isPrWeight: s.is_pr_weight,
            isPr1rm: s.is_pr_1rm,
            performedAt: s.performed_at,
          })),
          stats: {
            totalSets,
            totalReps,
            totalVolume: Math.round(totalVolume),
            maxWeight,
            best1rm: Math.round(best1rm * 100) / 100,
          },
        },
      });
    }
  );

  /**
   * Delete a set
   * DELETE /sets/:setId
   */
  fastify.delete(
    '/sets/:setId',
    { preHandler: authenticate },
    async (request, reply) => {
      const userId = request.user!.userId;
      const { setId } = request.params as { setId: string };

      const result = await query(
        'DELETE FROM workout_sets WHERE id = $1 AND user_id = $2',
        [setId, userId]
      );

      if (result.rowCount === 0) {
        return reply.status(404).send({
          error: { code: 'NOT_FOUND', message: 'Set not found', statusCode: 404 },
        });
      }

      return reply.status(204).send();
    }
  );
};

export default workoutSetsRoutes;
