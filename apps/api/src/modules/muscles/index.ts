/**
 * Muscles Module
 */

import { Router, Request, Response } from 'express';
import { db } from '../../db/client';
import { asyncHandler, NotFoundError } from '../../lib/errors';
import { getColorTier } from '@musclemap/core';

export interface Muscle {
  id: string;
  name: string;
  anatomicalName: string | null;
  muscleGroup: string;
  biasWeight: number;
  optimalWeeklyVolume: number | null;
  recoveryTime: number | null;
}

export interface MuscleActivation {
  muscleId: string;
  muscleName: string;
  muscleGroup: string;
  rawActivation: number;
  biasWeight: number;
  normalizedActivation: number;
  colorTier: number;
}

export const muscleService = {
  getAll(): Muscle[] {
    return db.prepare(`
      SELECT id, name, anatomical_name as anatomicalName, muscle_group as muscleGroup, 
             bias_weight as biasWeight, optimal_weekly_volume as optimalWeeklyVolume,
             recovery_time as recoveryTime
      FROM muscles ORDER BY muscle_group, name
    `).all() as Muscle[];
  },

  getById(id: string): Muscle | null {
    const muscle = db.prepare(`
      SELECT id, name, anatomical_name as anatomicalName, muscle_group as muscleGroup,
             bias_weight as biasWeight, optimal_weekly_volume as optimalWeeklyVolume,
             recovery_time as recoveryTime
      FROM muscles WHERE id = ?
    `).get(id) as Muscle | undefined;
    return muscle || null;
  },

  getByGroup(group: string): Muscle[] {
    return db.prepare(`
      SELECT id, name, anatomical_name as anatomicalName, muscle_group as muscleGroup,
             bias_weight as biasWeight, optimal_weekly_volume as optimalWeeklyVolume,
             recovery_time as recoveryTime
      FROM muscles WHERE muscle_group = ? ORDER BY name
    `).all(group) as Muscle[];
  },

  getGroups(): string[] {
    const rows = db.prepare('SELECT DISTINCT muscle_group FROM muscles ORDER BY muscle_group').all() as any[];
    return rows.map(r => r.muscle_group);
  },

  normalizeActivation(rawActivation: number, biasWeight: number): number {
    if (biasWeight <= 0) return 0;
    return Math.min(100, (rawActivation / biasWeight) * 100);
  },

  calculateActivations(rawActivations: Record<string, number>): MuscleActivation[] {
    const muscles = this.getAll();
    const activations: MuscleActivation[] = [];

    for (const muscle of muscles) {
      const raw = rawActivations[muscle.id] || 0;
      if (raw > 0) {
        const normalized = this.normalizeActivation(raw, muscle.biasWeight);
        activations.push({
          muscleId: muscle.id,
          muscleName: muscle.name,
          muscleGroup: muscle.muscleGroup,
          rawActivation: raw,
          biasWeight: muscle.biasWeight,
          normalizedActivation: normalized,
          colorTier: getColorTier(normalized),
        });
      }
    }

    return activations.sort((a, b) => b.normalizedActivation - a.normalizedActivation);
  },
};

export const muscleRouter = Router();

muscleRouter.get('/', asyncHandler(async (req: Request, res: Response) => {
  const group = req.query.group as string | undefined;
  const muscles = group ? muscleService.getByGroup(group) : muscleService.getAll();
  res.json({ data: muscles });
}));

muscleRouter.get('/groups', asyncHandler(async (req: Request, res: Response) => {
  res.json({ data: muscleService.getGroups() });
}));

muscleRouter.get('/:id', asyncHandler(async (req: Request, res: Response) => {
  const muscle = muscleService.getById(req.params.id);
  if (!muscle) throw new NotFoundError('Muscle');
  res.json({ data: muscle });
}));
