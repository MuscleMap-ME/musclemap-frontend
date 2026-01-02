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
  async getAll(): Promise<Muscle[]> {
    const rows = await db.queryAll<{
      id: string;
      name: string;
      anatomicalname: string | null;
      musclegroup: string;
      biasweight: number;
      optimalweeklyvolume: number | null;
      recoverytime: number | null;
    }>(
      `SELECT id, name, anatomical_name as anatomicalName, muscle_group as muscleGroup,
              bias_weight as biasWeight, optimal_weekly_volume as optimalWeeklyVolume,
              recovery_time as recoveryTime
       FROM muscles ORDER BY muscle_group, name`
    );
    return rows.map(row => ({
      id: row.id,
      name: row.name,
      anatomicalName: row.anatomicalname,
      muscleGroup: row.musclegroup,
      biasWeight: row.biasweight,
      optimalWeeklyVolume: row.optimalweeklyvolume,
      recoveryTime: row.recoverytime,
    }));
  },

  async getById(id: string): Promise<Muscle | null> {
    const row = await db.queryOne<{
      id: string;
      name: string;
      anatomicalname: string | null;
      musclegroup: string;
      biasweight: number;
      optimalweeklyvolume: number | null;
      recoverytime: number | null;
    }>(
      `SELECT id, name, anatomical_name as anatomicalName, muscle_group as muscleGroup,
              bias_weight as biasWeight, optimal_weekly_volume as optimalWeeklyVolume,
              recovery_time as recoveryTime
       FROM muscles WHERE id = $1`,
      [id]
    );
    if (!row) return null;
    return {
      id: row.id,
      name: row.name,
      anatomicalName: row.anatomicalname,
      muscleGroup: row.musclegroup,
      biasWeight: row.biasweight,
      optimalWeeklyVolume: row.optimalweeklyvolume,
      recoveryTime: row.recoverytime,
    };
  },

  async getByGroup(group: string): Promise<Muscle[]> {
    const rows = await db.queryAll<{
      id: string;
      name: string;
      anatomicalname: string | null;
      musclegroup: string;
      biasweight: number;
      optimalweeklyvolume: number | null;
      recoverytime: number | null;
    }>(
      `SELECT id, name, anatomical_name as anatomicalName, muscle_group as muscleGroup,
              bias_weight as biasWeight, optimal_weekly_volume as optimalWeeklyVolume,
              recovery_time as recoveryTime
       FROM muscles WHERE muscle_group = $1 ORDER BY name`,
      [group]
    );
    return rows.map(row => ({
      id: row.id,
      name: row.name,
      anatomicalName: row.anatomicalname,
      muscleGroup: row.musclegroup,
      biasWeight: row.biasweight,
      optimalWeeklyVolume: row.optimalweeklyvolume,
      recoveryTime: row.recoverytime,
    }));
  },

  async getGroups(): Promise<string[]> {
    const rows = await db.queryAll<{ muscle_group: string }>(
      'SELECT DISTINCT muscle_group FROM muscles ORDER BY muscle_group'
    );
    return rows.map(r => r.muscle_group);
  },

  normalizeActivation(rawActivation: number, biasWeight: number): number {
    if (biasWeight <= 0) return 0;
    return Math.min(100, (rawActivation / biasWeight) * 100);
  },

  async calculateActivations(rawActivations: Record<string, number>): Promise<MuscleActivation[]> {
    const muscles = await this.getAll();
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
  const muscles = group ? await muscleService.getByGroup(group) : await muscleService.getAll();
  res.json({ data: muscles });
}));

muscleRouter.get('/groups', asyncHandler(async (req: Request, res: Response) => {
  res.json({ data: await muscleService.getGroups() });
}));

muscleRouter.get('/:id', asyncHandler(async (req: Request, res: Response) => {
  const muscle = await muscleService.getById(req.params.id);
  if (!muscle) throw new NotFoundError('Muscle');
  res.json({ data: muscle });
}));
