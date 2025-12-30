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
  calculateTU(exercises: WorkoutExercise[]): { totalTU: number; muscleActivations: Record<string, number> } {
    const muscleActivations: Record<string, number> = {};

    for (const exercise of exercises) {
      const activationMap = exerciseService.getActivationMap(exercise.exerciseId);
      for (const [muscleId, activation] of Object.entries(activationMap)) {
        const contribution = exercise.sets * (activation / 100);
        muscleActivations[muscleId] = (muscleActivations[muscleId] || 0) + contribution;
      }
    }

    const muscles = muscleService.getAll();
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

  create(userId: string, data: z.infer<typeof createWorkoutSchema>): Workout {
    return transaction(() => {
      const existing = db.prepare('SELECT id FROM workouts WHERE id = ?').get(data.idempotencyKey) as any;
      if (existing) {
        return this.getById(existing.id)!;
      }

      // Cast exercises to WorkoutExercise[] since Zod has validated them
      const exercises = data.exercises as WorkoutExercise[];

      for (const ex of exercises) {
        const exists = db.prepare('SELECT 1 FROM exercises WHERE id = ?').get(ex.exerciseId);
        if (!exists) throw new ValidationError(`Exercise not found: ${ex.exerciseId}`);
      }

      const { totalTU, muscleActivations } = this.calculateTU(exercises);

      const chargeResult = economyService.charge({
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

      db.prepare(`
        INSERT INTO workouts (id, user_id, date, total_tu, credits_used, notes, is_public, exercise_data, muscle_activations)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(workoutId, userId, workoutDate, totalTU, 25, data.notes || null, data.isPublic !== false ? 1 : 0, JSON.stringify(exercises), JSON.stringify(muscleActivations));

      log.info('Workout created', { workoutId, userId, totalTU });
      return this.getById(workoutId)!;
    });
  },

  getById(id: string): Workout | null {
    const row = db.prepare(`
      SELECT id, user_id as userId, date, total_tu as totalTU, credits_used as creditsUsed,
             notes, is_public as isPublic, exercise_data, muscle_activations, created_at as createdAt
      FROM workouts WHERE id = ?
    `).get(id) as any;

    if (!row) return null;
    return {
      ...row,
      isPublic: Boolean(row.isPublic),
      exerciseData: JSON.parse(row.exercise_data || '[]'),
      muscleActivations: JSON.parse(row.muscle_activations || '{}'),
    };
  },

  getByUser(userId: string, limit: number = 50, offset: number = 0): Workout[] {
    const rows = db.prepare(`
      SELECT id, user_id as userId, date, total_tu as totalTU, credits_used as creditsUsed,
             notes, is_public as isPublic, exercise_data, muscle_activations, created_at as createdAt
      FROM workouts WHERE user_id = ? ORDER BY date DESC, created_at DESC LIMIT ? OFFSET ?
    `).all(userId, limit, offset) as any[];

    return rows.map(row => ({
      ...row,
      isPublic: Boolean(row.isPublic),
      exerciseData: JSON.parse(row.exercise_data || '[]'),
      muscleActivations: JSON.parse(row.muscle_activations || '{}'),
    }));
  },

  getUserMuscleActivation(userId: string, days: number = 7): Record<string, number> {
    const rows = db.prepare(`
      SELECT muscle_activations FROM workouts
      WHERE user_id = ? AND date >= date('now', ?)
    `).all(userId, `-${days} days`) as any[];

    const totals: Record<string, number> = {};
    for (const row of rows) {
      const activations = JSON.parse(row.muscle_activations || '{}');
      for (const [muscleId, value] of Object.entries(activations)) {
        totals[muscleId] = (totals[muscleId] || 0) + (value as number);
      }
    }
    return totals;
  },

  getUserStats(userId: string) {
    const allTime = db.prepare(`
      SELECT COUNT(*) as workoutCount, COALESCE(SUM(total_tu), 0) as totalTU
      FROM workouts WHERE user_id = ?
    `).get(userId) as { workoutCount: number; totalTU: number };

    const thisWeek = db.prepare(`
      SELECT COUNT(*) as workoutCount, COALESCE(SUM(total_tu), 0) as totalTU
      FROM workouts WHERE user_id = ? AND date >= date('now', '-7 days')
    `).get(userId) as { workoutCount: number; totalTU: number };

    const thisMonth = db.prepare(`
      SELECT COUNT(*) as workoutCount, COALESCE(SUM(total_tu), 0) as totalTU
      FROM workouts WHERE user_id = ? AND date >= date('now', '-30 days')
    `).get(userId) as { workoutCount: number; totalTU: number };

    return { allTime, thisWeek, thisMonth };
  },
};

export const workoutRouter = Router();

workoutRouter.post('/', authenticateToken, asyncHandler(async (req: Request, res: Response) => {
  const data = createWorkoutSchema.parse(req.body);
  const workout = workoutService.create(req.user!.userId, data);
  res.status(201).json({ data: workout });
}));

workoutRouter.get('/me', authenticateToken, asyncHandler(async (req: Request, res: Response) => {
  const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
  const offset = parseInt(req.query.offset as string) || 0;
  res.json({ data: workoutService.getByUser(req.user!.userId, limit, offset), meta: { limit, offset } });
}));

workoutRouter.get('/me/stats', authenticateToken, asyncHandler(async (req: Request, res: Response) => {
  res.json({ data: workoutService.getUserStats(req.user!.userId) });
}));

workoutRouter.get('/me/muscles', authenticateToken, asyncHandler(async (req: Request, res: Response) => {
  const days = Math.min(parseInt(req.query.days as string) || 7, 365);
  const rawActivations = workoutService.getUserMuscleActivation(req.user!.userId, days);
  const activations = muscleService.calculateActivations(rawActivations);
  res.json({ data: activations, meta: { days } });
}));

workoutRouter.post('/preview', authenticateToken, asyncHandler(async (req: Request, res: Response) => {
  const parsed = z.object({ exercises: z.array(workoutExerciseSchema) }).parse(req.body);
  const exercises = parsed.exercises as WorkoutExercise[];
  const { totalTU, muscleActivations } = workoutService.calculateTU(exercises);
  const activations = muscleService.calculateActivations(muscleActivations);
  res.json({ data: { totalTU, activations } });
}));

workoutRouter.get('/:id', optionalAuth, asyncHandler(async (req: Request, res: Response) => {
  const workout = workoutService.getById(req.params.id);
  if (!workout) throw new NotFoundError('Workout');
  if (!workout.isPublic && workout.userId !== req.user?.userId) throw new NotFoundError('Workout');
  res.json({ data: workout });
}));
