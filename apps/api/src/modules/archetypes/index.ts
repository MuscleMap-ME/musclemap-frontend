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
    focusAreas: row.focus_areas ? row.focus_areas.split(',') : [],
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
    muscleTargets: row.muscle_targets ? JSON.parse(row.muscle_targets) : {},
  };
}

export const archetypeService = {
  getAll(): Archetype[] {
    const rows = db.prepare(`
      SELECT id, name, philosophy, description, focus_areas, icon_url
      FROM archetypes ORDER BY name
    `).all() as any[];
    return rows.map(parseArchetype);
  },

  getById(id: string): ArchetypeWithLevels | null {
    const row = db.prepare(`
      SELECT id, name, philosophy, description, focus_areas, icon_url
      FROM archetypes WHERE id = ?
    `).get(id) as any;

    if (!row) return null;

    const levelRows = db.prepare(`
      SELECT id, archetype_id, level, name, total_tu, description, muscle_targets
      FROM archetype_levels WHERE archetype_id = ? ORDER BY level
    `).all(id) as any[];

    return { ...parseArchetype(row), levels: levelRows.map(parseLevel) };
  },

  getLevels(archetypeId: string): ArchetypeLevel[] {
    const rows = db.prepare(`
      SELECT id, archetype_id, level, name, total_tu, description, muscle_targets
      FROM archetype_levels WHERE archetype_id = ? ORDER BY level
    `).all(archetypeId) as any[];
    return rows.map(parseLevel);
  },

  getUserProgress(userId: string, archetypeId: string) {
    const archetype = this.getById(archetypeId);
    if (!archetype) return null;

    const tuRow = db.prepare(`
      SELECT COALESCE(SUM(total_tu), 0) as total FROM workouts WHERE user_id = ?
    `).get(userId) as { total: number };

    const currentTU = tuRow.total;
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

  setUserArchetype(userId: string, archetypeId: string): void {
    const exists = db.prepare('SELECT 1 FROM archetypes WHERE id = ?').get(archetypeId);
    if (!exists) throw new ValidationError('Archetype not found');
    db.prepare('UPDATE users SET current_archetype_id = ? WHERE id = ?').run(archetypeId, userId);
  },
};

export const archetypeRouter = Router();

archetypeRouter.get('/', asyncHandler(async (req: Request, res: Response) => {
  res.json({ data: archetypeService.getAll() });
}));

archetypeRouter.get('/:id', asyncHandler(async (req: Request, res: Response) => {
  const archetype = archetypeService.getById(req.params.id);
  if (!archetype) throw new NotFoundError('Archetype');
  res.json({ data: archetype });
}));

archetypeRouter.get('/:id/levels', asyncHandler(async (req: Request, res: Response) => {
  res.json({ data: archetypeService.getLevels(req.params.id) });
}));

archetypeRouter.get('/me/progress', authenticateToken, asyncHandler(async (req: Request, res: Response) => {
  const user = db.prepare('SELECT current_archetype_id FROM users WHERE id = ?').get(req.user!.userId) as any;
  if (!user?.current_archetype_id) {
    res.json({ data: null, message: 'No archetype selected' });
    return;
  }
  const progress = archetypeService.getUserProgress(req.user!.userId, user.current_archetype_id);
  res.json({ data: progress });
}));

archetypeRouter.get('/me/progress/:archetypeId', authenticateToken, asyncHandler(async (req: Request, res: Response) => {
  const progress = archetypeService.getUserProgress(req.user!.userId, req.params.archetypeId);
  if (!progress) throw new NotFoundError('Archetype');
  res.json({ data: progress });
}));

archetypeRouter.post('/me/select', authenticateToken, asyncHandler(async (req: Request, res: Response) => {
  const { archetypeId } = z.object({ archetypeId: z.string() }).parse(req.body);
  archetypeService.setUserArchetype(req.user!.userId, archetypeId);
  res.json({ data: { success: true, archetypeId } });
}));
