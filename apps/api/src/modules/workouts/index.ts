/**
 * Workouts Module
 */

import { Router, Request, Response } from 'express';
import { db, transaction } from '../../db/client';
import { authenticateToken, optionalAuth } from '../auth';
import { asyncHandler, NotFoundError, ValidationError } from '../../lib/errors';
import { economyService } from '../economy';
import { muscleService } from '../muscles';
import { exerciseService } from '../exercises';
import { loggers } from '../../lib/logger';
import { z } from 'zod';
import crypto from 'crypto';

const log = loggers.db;

export interface WorkoutExercise {
  exerciseId: string;
  sets: number;
  reps?: number;
  weight?: number;
  duration?: number;
  notes?: string;
}

export interface Workout {
  id: string;
  userId: string;
  date: string;
  totalTU: number;
  creditsUsed: number;
  notes: string | null;
  isPublic: boolean;
  exerciseData: WorkoutExercise[];
  muscleActivations: Record<string, number>;
  createdAt: string;
}

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

export const workoutService = {
  async calculateTU(exercises: WorkoutExercise[]): Promise<{ totalTU: number; muscleActivations: Record<string, number> }> {
    const muscleActivations: Record<string, number> = {};

    for (const exercise of exercises) {
      const activationMap = await exerciseService.getActivationMap(exercise.exerciseId);
      for (const [muscleId, activation] of Object.entries(activationMap)) {
        const contribution = exercise.sets * (activation / 100);
        muscleActivations[muscleId] = (muscleActivations[muscleId] || 0) + contribution;
      }
    }

    const muscles = await muscleService.getAll();
    const muscleMap = new Map(muscles.map(m => [m.id, m]));

    let totalTU = 0;
    for (const [muscleId, rawActivation] of Object.entries(muscleActivations)) {
      const muscle = muscleMap.get(muscleId);
      if (muscle) {
        const normalized = muscleService.normalizeActivation(rawActivation, muscle.biasWeight);
        totalTU += normalized;
      }
    }

    return { totalTU: Math.round(totalTU * 100) / 100, muscleActivations };
  },

  async create(userId: string, data: z.infer<typeof createWorkoutSchema>): Promise<Workout> {
    return transaction(async (client) => {
      const existingResult = await client.query(
        'SELECT id FROM workouts WHERE id = $1',
        [data.idempotencyKey]
      );
      if (existingResult.rows[0]) {
        return (await this.getById(existingResult.rows[0].id))!;
      }

      const exercises = data.exercises as WorkoutExercise[];

      for (const ex of exercises) {
        const existsResult = await client.query(
          'SELECT 1 FROM exercises WHERE id = $1',
          [ex.exerciseId]
        );
        if (!existsResult.rows[0]) throw new ValidationError(`Exercise not found: ${ex.exerciseId}`);
      }

      const { totalTU, muscleActivations } = await this.calculateTU(exercises);

      const chargeResult = await economyService.charge({
        userId,
        action: 'workout.complete',
        idempotencyKey: `workout-${data.idempotencyKey}`,
        metadata: { totalTU, exerciseCount: exercises.length },
      });

      if (!chargeResult.success) {
        throw new ValidationError(chargeResult.error || 'Failed to charge credits');
      }

      const workoutId = `workout_${crypto.randomBytes(12).toString('hex')}`;
      const workoutDate = data.date || new Date().toISOString().split('T')[0];

      await client.query(
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
          JSON.stringify(exercises),
          JSON.stringify(muscleActivations),
        ]
      );

      log.info('Workout created', { workoutId, userId, totalTU });
      return (await this.getById(workoutId))!;
    });
  },

  async getById(id: string): Promise<Workout | null> {
    const row = await db.queryOne<{
      id: string;
      userid: string;
      date: string;
      totaltu: number;
      creditsused: number;
      notes: string | null;
      ispublic: boolean;
      exercise_data: WorkoutExercise[];
      muscle_activations: Record<string, number>;
      createdat: string;
    }>(
      `SELECT id, user_id as userId, date, total_tu as totalTU, credits_used as creditsUsed,
              notes, is_public as isPublic, exercise_data, muscle_activations, created_at as createdAt
       FROM workouts WHERE id = $1`,
      [id]
    );

    if (!row) return null;
    return {
      id: row.id,
      userId: row.userid,
      date: row.date,
      totalTU: row.totaltu,
      creditsUsed: row.creditsused,
      notes: row.notes,
      isPublic: row.ispublic,
      exerciseData: row.exercise_data || [],
      muscleActivations: row.muscle_activations || {},
      createdAt: row.createdat,
    };
  },

  async getByUser(userId: string, limit: number = 50, offset: number = 0): Promise<Workout[]> {
    const rows = await db.queryAll<{
      id: string;
      userid: string;
      date: string;
      totaltu: number;
      creditsused: number;
      notes: string | null;
      ispublic: boolean;
      exercise_data: WorkoutExercise[];
      muscle_activations: Record<string, number>;
      createdat: string;
    }>(
      `SELECT id, user_id as userId, date, total_tu as totalTU, credits_used as creditsUsed,
              notes, is_public as isPublic, exercise_data, muscle_activations, created_at as createdAt
       FROM workouts WHERE user_id = $1 ORDER BY date DESC, created_at DESC LIMIT $2 OFFSET $3`,
      [userId, limit, offset]
    );

    return rows.map(row => ({
      id: row.id,
      userId: row.userid,
      date: row.date,
      totalTU: row.totaltu,
      creditsUsed: row.creditsused,
      notes: row.notes,
      isPublic: row.ispublic,
      exerciseData: row.exercise_data || [],
      muscleActivations: row.muscle_activations || {},
      createdAt: row.createdat,
    }));
  },

  async getUserMuscleActivation(userId: string, days: number = 7): Promise<Record<string, number>> {
    const rows = await db.queryAll<{ muscle_activations: Record<string, number> }>(
      `SELECT muscle_activations FROM workouts
       WHERE user_id = $1 AND date >= CURRENT_DATE - INTERVAL '1 day' * $2`,
      [userId, days]
    );

    const totals: Record<string, number> = {};
    for (const row of rows) {
      const activations = row.muscle_activations || {};
      for (const [muscleId, value] of Object.entries(activations)) {
        totals[muscleId] = (totals[muscleId] || 0) + (value as number);
      }
    }
    return totals;
  },

  async getUserStats(userId: string) {
    const allTime = await db.queryOne<{ workoutcount: number; totaltu: number }>(
      `SELECT COUNT(*) as workoutCount, COALESCE(SUM(total_tu), 0) as totalTU
       FROM workouts WHERE user_id = $1`,
      [userId]
    );

    const thisWeek = await db.queryOne<{ workoutcount: number; totaltu: number }>(
      `SELECT COUNT(*) as workoutCount, COALESCE(SUM(total_tu), 0) as totalTU
       FROM workouts WHERE user_id = $1 AND date >= CURRENT_DATE - INTERVAL '7 days'`,
      [userId]
    );

    const thisMonth = await db.queryOne<{ workoutcount: number; totaltu: number }>(
      `SELECT COUNT(*) as workoutCount, COALESCE(SUM(total_tu), 0) as totalTU
       FROM workouts WHERE user_id = $1 AND date >= CURRENT_DATE - INTERVAL '30 days'`,
      [userId]
    );

    return {
      allTime: { workoutCount: Number(allTime?.workoutcount || 0), totalTU: Number(allTime?.totaltu || 0) },
      thisWeek: { workoutCount: Number(thisWeek?.workoutcount || 0), totalTU: Number(thisWeek?.totaltu || 0) },
      thisMonth: { workoutCount: Number(thisMonth?.workoutcount || 0), totalTU: Number(thisMonth?.totaltu || 0) },
    };
  },
};

export const workoutRouter = Router();

workoutRouter.post('/', authenticateToken, asyncHandler(async (req: Request, res: Response) => {
  const data = createWorkoutSchema.parse(req.body);
  const workout = await workoutService.create(req.user!.userId, data);
  res.status(201).json({ data: workout });
}));

workoutRouter.get('/me', authenticateToken, asyncHandler(async (req: Request, res: Response) => {
  const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
  const offset = parseInt(req.query.offset as string) || 0;
  res.json({ data: await workoutService.getByUser(req.user!.userId, limit, offset), meta: { limit, offset } });
}));

workoutRouter.get('/me/stats', authenticateToken, asyncHandler(async (req: Request, res: Response) => {
  res.json({ data: await workoutService.getUserStats(req.user!.userId) });
}));

workoutRouter.get('/me/muscles', authenticateToken, asyncHandler(async (req: Request, res: Response) => {
  const days = Math.min(parseInt(req.query.days as string) || 7, 365);
  const rawActivations = await workoutService.getUserMuscleActivation(req.user!.userId, days);
  const activations = await muscleService.calculateActivations(rawActivations);
  res.json({ data: activations, meta: { days } });
}));

workoutRouter.post('/preview', authenticateToken, asyncHandler(async (req: Request, res: Response) => {
  const parsed = z.object({ exercises: z.array(workoutExerciseSchema) }).parse(req.body);
  const exercises = parsed.exercises as WorkoutExercise[];
  const { totalTU, muscleActivations } = await workoutService.calculateTU(exercises);
  const activations = await muscleService.calculateActivations(muscleActivations);
  res.json({ data: { totalTU, activations } });
}));

workoutRouter.get('/:id', optionalAuth, asyncHandler(async (req: Request, res: Response) => {
  const workout = await workoutService.getById(req.params.id);
  if (!workout) throw new NotFoundError('Workout');
  if (!workout.isPublic && workout.userId !== req.user?.userId) throw new NotFoundError('Workout');
  res.json({ data: workout });
}));
