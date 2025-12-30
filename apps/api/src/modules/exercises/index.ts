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
    primaryMuscles: row.primaryMuscles ? row.primaryMuscles.split(',') : [],
  };
}

export const exerciseService = {
  getAll(type?: string): Exercise[] {
    let rows: any[];
    if (type) {
      rows = db.prepare(`
        SELECT id, name, type, difficulty, description, cues, primary_muscles as primaryMuscles
        FROM exercises WHERE type = ? ORDER BY name
      `).all(type);
    } else {
      rows = db.prepare(`
        SELECT id, name, type, difficulty, description, cues, primary_muscles as primaryMuscles
        FROM exercises ORDER BY type, name
      `).all();
    }
    return rows.map(parseExercise);
  },

  getById(id: string): ExerciseWithActivations | null {
    const row = db.prepare(`
      SELECT id, name, type, difficulty, description, cues, primary_muscles as primaryMuscles
      FROM exercises WHERE id = ?
    `).get(id) as any;

    if (!row) return null;

    const activations = db.prepare(`
      SELECT ea.muscle_id as muscleId, m.name as muscleName, ea.activation
      FROM exercise_activations ea
      JOIN muscles m ON m.id = ea.muscle_id
      WHERE ea.exercise_id = ?
      ORDER BY ea.activation DESC
    `).all(id) as ExerciseActivation[];

    return { ...parseExercise(row), activations };
  },

  getTypes(): string[] {
    const rows = db.prepare('SELECT DISTINCT type FROM exercises ORDER BY type').all() as any[];
    return rows.map(r => r.type);
  },

  search(query: string, limit: number = 20): Exercise[] {
    const rows = db.prepare(`
      SELECT id, name, type, difficulty, description, cues, primary_muscles as primaryMuscles
      FROM exercises WHERE name LIKE ? ORDER BY name LIMIT ?
    `).all(`%${query}%`, limit) as any[];
    return rows.map(parseExercise);
  },

  getActivationMap(exerciseId: string): Record<string, number> {
    const rows = db.prepare(`
      SELECT muscle_id, activation FROM exercise_activations WHERE exercise_id = ?
    `).all(exerciseId) as { muscle_id: string; activation: number }[];

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
  res.json({ data: exerciseService.getAll(type) });
}));

exerciseRouter.get('/types', asyncHandler(async (req: Request, res: Response) => {
  res.json({ data: exerciseService.getTypes() });
}));

exerciseRouter.get('/search', asyncHandler(async (req: Request, res: Response) => {
  const query = req.query.q as string;
  if (!query || query.length < 2) {
    res.json({ data: [] });
    return;
  }
  res.json({ data: exerciseService.search(query) });
}));

exerciseRouter.get('/:id', asyncHandler(async (req: Request, res: Response) => {
  const exercise = exerciseService.getById(req.params.id);
  if (!exercise) throw new NotFoundError('Exercise');
  res.json({ data: exercise });
}));

exerciseRouter.get('/:id/activations', asyncHandler(async (req: Request, res: Response) => {
  const map = exerciseService.getActivationMap(req.params.id);
  if (Object.keys(map).length === 0) {
    const exists = db.prepare('SELECT 1 FROM exercises WHERE id = ?').get(req.params.id);
    if (!exists) throw new NotFoundError('Exercise');
  }
  res.json({ data: map });
}));
