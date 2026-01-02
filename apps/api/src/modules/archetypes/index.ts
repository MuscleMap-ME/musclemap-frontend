/**
 * Archetypes Module
 */

import { Router, Request, Response } from 'express';
import { db } from '../../db/client';
import { asyncHandler, NotFoundError, ValidationError } from '../../lib/errors';
import { authenticateToken } from '../auth';
import { z } from 'zod';

export interface Archetype {
  id: string;
  name: string;
  philosophy: string | null;
  description: string | null;
  focusAreas: string[];
  iconUrl: string | null;
}

export interface ArchetypeLevel {
  id: number;
  archetypeId: string;
  level: number;
  name: string;
  totalTU: number;
  description: string | null;
  muscleTargets: Record<string, number>;
}

export interface ArchetypeWithLevels extends Archetype {
  levels: ArchetypeLevel[];
}

function parseArchetype(row: any): Archetype {
  return {
    id: row.id,
    name: row.name,
    philosophy: row.philosophy,
    description: row.description,
    focusAreas: row.focus_areas ? (Array.isArray(row.focus_areas) ? row.focus_areas : row.focus_areas.split(',')) : [],
    iconUrl: row.icon_url,
  };
}

function parseLevel(row: any): ArchetypeLevel {
  return {
    id: row.id,
    archetypeId: row.archetype_id,
    level: row.level,
    name: row.name,
    totalTU: row.total_tu,
    description: row.description,
    muscleTargets: row.muscle_targets || {},
  };
}

export const archetypeService = {
  async getAll(): Promise<Archetype[]> {
    const rows = await db.queryAll(
      `SELECT id, name, philosophy, description, focus_areas, icon_url
       FROM archetypes ORDER BY name`
    );
    return rows.map(parseArchetype);
  },

  async getById(id: string): Promise<ArchetypeWithLevels | null> {
    const row = await db.queryOne(
      `SELECT id, name, philosophy, description, focus_areas, icon_url
       FROM archetypes WHERE id = $1`,
      [id]
    );

    if (!row) return null;

    const levelRows = await db.queryAll(
      `SELECT id, archetype_id, level, name, total_tu, description, muscle_targets
       FROM archetype_levels WHERE archetype_id = $1 ORDER BY level`,
      [id]
    );

    return { ...parseArchetype(row), levels: levelRows.map(parseLevel) };
  },

  async getLevels(archetypeId: string): Promise<ArchetypeLevel[]> {
    const rows = await db.queryAll(
      `SELECT id, archetype_id, level, name, total_tu, description, muscle_targets
       FROM archetype_levels WHERE archetype_id = $1 ORDER BY level`,
      [archetypeId]
    );
    return rows.map(parseLevel);
  },

  async getUserProgress(userId: string, archetypeId: string) {
    const archetype = await this.getById(archetypeId);
    if (!archetype) return null;

    const tuRow = await db.queryOne<{ total: number }>(
      `SELECT COALESCE(SUM(total_tu), 0) as total FROM workouts WHERE user_id = $1`,
      [userId]
    );

    const currentTU = tuRow?.total || 0;
    let currentLevel = 1;
    let currentLevelName = 'Beginner';
    let nextLevelTU: number | null = null;

    for (const level of archetype.levels) {
      if (currentTU >= level.totalTU) {
        currentLevel = level.level;
        currentLevelName = level.name;
      } else {
        nextLevelTU = level.totalTU;
        break;
      }
    }

    const prevLevelTU = currentLevel > 1
      ? (archetype.levels.find(l => l.level === currentLevel)?.totalTU || 0) : 0;

    const progressPercent = nextLevelTU
      ? Math.min(100, ((currentTU - prevLevelTU) / (nextLevelTU - prevLevelTU)) * 100) : 100;

    return {
      archetypeId,
      archetypeName: archetype.name,
      currentLevel,
      currentLevelName,
      currentTU,
      nextLevelTU,
      progressPercent,
    };
  },

  async setUserArchetype(userId: string, archetypeId: string): Promise<void> {
    const exists = await db.queryOne('SELECT 1 FROM archetypes WHERE id = $1', [archetypeId]);
    if (!exists) throw new ValidationError('Archetype not found');
    await db.query('UPDATE users SET current_archetype_id = $1 WHERE id = $2', [archetypeId, userId]);
  },
};

export const archetypeRouter = Router();

archetypeRouter.get('/', asyncHandler(async (req: Request, res: Response) => {
  res.json({ data: await archetypeService.getAll() });
}));

archetypeRouter.get('/:id', asyncHandler(async (req: Request, res: Response) => {
  const archetype = await archetypeService.getById(req.params.id);
  if (!archetype) throw new NotFoundError('Archetype');
  res.json({ data: archetype });
}));

archetypeRouter.get('/:id/levels', asyncHandler(async (req: Request, res: Response) => {
  res.json({ data: await archetypeService.getLevels(req.params.id) });
}));

archetypeRouter.get('/me/progress', authenticateToken, asyncHandler(async (req: Request, res: Response) => {
  const user = await db.queryOne<{ current_archetype_id: string | null }>(
    'SELECT current_archetype_id FROM users WHERE id = $1',
    [req.user!.userId]
  );
  if (!user?.current_archetype_id) {
    res.json({ data: null, message: 'No archetype selected' });
    return;
  }
  const progress = await archetypeService.getUserProgress(req.user!.userId, user.current_archetype_id);
  res.json({ data: progress });
}));

archetypeRouter.get('/me/progress/:archetypeId', authenticateToken, asyncHandler(async (req: Request, res: Response) => {
  const progress = await archetypeService.getUserProgress(req.user!.userId, req.params.archetypeId);
  if (!progress) throw new NotFoundError('Archetype');
  res.json({ data: progress });
}));

archetypeRouter.post('/me/select', authenticateToken, asyncHandler(async (req: Request, res: Response) => {
  const { archetypeId } = z.object({ archetypeId: z.string() }).parse(req.body);
  await archetypeService.setUserArchetype(req.user!.userId, archetypeId);
  res.json({ data: { success: true, archetypeId } });
}));
