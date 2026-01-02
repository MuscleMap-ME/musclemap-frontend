/**
 * Exercises Module
 */

import { Router, Request, Response } from 'express';
import { db } from '../../db/client';
import { asyncHandler, NotFoundError } from '../../lib/errors';

export interface Exercise {
  id: string;
  name: string;
  type: string;
  difficulty: number;
  description: string | null;
  cues: string | null;
  primaryMuscles: string[];
}

export interface ExerciseActivation {
  muscleId: string;
  muscleName: string;
  activation: number;
}

export interface ExerciseWithActivations extends Exercise {
  activations: ExerciseActivation[];
}

function parseExercise(row: any): Exercise {
  return {
    id: row.id,
    name: row.name,
    type: row.type,
    difficulty: row.difficulty,
    description: row.description,
    cues: row.cues,
    primaryMuscles: row.primarymuscles ? row.primarymuscles.split(',') : [],
  };
}

export const exerciseService = {
  async getAll(type?: string): Promise<Exercise[]> {
    let rows: any[];
    if (type) {
      rows = await db.queryAll(
        `SELECT id, name, type, difficulty, description, cues, primary_muscles as primaryMuscles
         FROM exercises WHERE type = $1 ORDER BY name`,
        [type]
      );
    } else {
      rows = await db.queryAll(
        `SELECT id, name, type, difficulty, description, cues, primary_muscles as primaryMuscles
         FROM exercises ORDER BY type, name`
      );
    }
    return rows.map(parseExercise);
  },

  async getById(id: string): Promise<ExerciseWithActivations | null> {
    const row = await db.queryOne(
      `SELECT id, name, type, difficulty, description, cues, primary_muscles as primaryMuscles
       FROM exercises WHERE id = $1`,
      [id]
    );

    if (!row) return null;

    const activations = await db.queryAll<ExerciseActivation>(
      `SELECT ea.muscle_id as "muscleId", m.name as "muscleName", ea.activation
       FROM exercise_activations ea
       JOIN muscles m ON m.id = ea.muscle_id
       WHERE ea.exercise_id = $1
       ORDER BY ea.activation DESC`,
      [id]
    );

    return { ...parseExercise(row), activations };
  },

  async getTypes(): Promise<string[]> {
    const rows = await db.queryAll<{ type: string }>(
      'SELECT DISTINCT type FROM exercises ORDER BY type'
    );
    return rows.map(r => r.type);
  },

  async search(query: string, limit: number = 20): Promise<Exercise[]> {
    const rows = await db.queryAll(
      `SELECT id, name, type, difficulty, description, cues, primary_muscles as primaryMuscles
       FROM exercises WHERE name ILIKE $1 ORDER BY name LIMIT $2`,
      [`%${query}%`, limit]
    );
    return rows.map(parseExercise);
  },

  async getActivationMap(exerciseId: string): Promise<Record<string, number>> {
    const rows = await db.queryAll<{ muscle_id: string; activation: number }>(
      `SELECT muscle_id, activation FROM exercise_activations WHERE exercise_id = $1`,
      [exerciseId]
    );

    const map: Record<string, number> = {};
    for (const row of rows) {
      map[row.muscle_id] = row.activation;
    }
    return map;
  },
};

export const exerciseRouter = Router();

exerciseRouter.get('/', asyncHandler(async (req: Request, res: Response) => {
  const type = req.query.type as string | undefined;
  res.json({ data: await exerciseService.getAll(type) });
}));

exerciseRouter.get('/types', asyncHandler(async (req: Request, res: Response) => {
  res.json({ data: await exerciseService.getTypes() });
}));

exerciseRouter.get('/search', asyncHandler(async (req: Request, res: Response) => {
  const query = req.query.q as string;
  if (!query || query.length < 2) {
    res.json({ data: [] });
    return;
  }
  res.json({ data: await exerciseService.search(query) });
}));

exerciseRouter.get('/:id', asyncHandler(async (req: Request, res: Response) => {
  const exercise = await exerciseService.getById(req.params.id);
  if (!exercise) throw new NotFoundError('Exercise');
  res.json({ data: exercise });
}));

exerciseRouter.get('/:id/activations', asyncHandler(async (req: Request, res: Response) => {
  const map = await exerciseService.getActivationMap(req.params.id);
  if (Object.keys(map).length === 0) {
    const exists = await db.queryOne('SELECT 1 FROM exercises WHERE id = $1', [req.params.id]);
    if (!exists) throw new NotFoundError('Exercise');
  }
  res.json({ data: map });
}));
