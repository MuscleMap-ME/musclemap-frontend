/**
 * Journey Module
 *
 * Provides comprehensive progress tracking and journey data for users.
 */

import { Router, Request, Response } from 'express';
import { db } from '../../db/client';
import { authenticateToken } from '../auth';
import { asyncHandler } from '../../lib/errors';
import { loggers } from '../../lib/logger';

const log = loggers.db;

interface WorkoutRow {
  id: string;
  date: string;
  total_tu: number;
  muscle_activations: string | null;
  exercise_data: string | null;
  created_at: string;
}

interface ArchetypeRow {
  id: string;
  name: string;
  philosophy: string;
  description: string;
  focus_areas: string;
  icon_url: string | null;
}

interface ArchetypeLevelRow {
  level: number;
  name: string;
  total_tu: number;
  description: string;
}

interface UserRow {
  current_archetype_id: string | null;
  current_level: number;
  created_at: string;
}

interface MuscleRow {
  id: string;
  name: string;
  muscle_group: string;
}

/**
 * Journey Service
 */
export const journeyService = {
  /**
   * Get comprehensive journey data for a user
   */
  getJourneyData(userId: string) {
    // Get user info
    const user = db.prepare(`
      SELECT current_archetype_id, current_level, created_at
      FROM users WHERE id = ?
    `).get(userId) as UserRow | undefined;

    if (!user) {
      return null;
    }

    // Get all workouts for this user
    const workouts = db.prepare(`
      SELECT id, date, total_tu, muscle_activations, exercise_data, created_at
      FROM workouts
      WHERE user_id = ?
      ORDER BY created_at DESC
    `).all(userId) as WorkoutRow[];

    // Calculate total TU
    const totalTU = workouts.reduce((sum, w) => sum + (w.total_tu || 0), 0);

    // Get all archetypes
    const archetypes = db.prepare(`
      SELECT id, name, philosophy, description, focus_areas, icon_url
      FROM archetypes
    `).all() as ArchetypeRow[];

    // Get levels for current archetype (or default to first archetype)
    const currentArchetypeId = user.current_archetype_id || archetypes[0]?.id;

    const levels = currentArchetypeId ? db.prepare(`
      SELECT level, name, total_tu, description
      FROM archetype_levels
      WHERE archetype_id = ?
      ORDER BY level ASC
    `).all(currentArchetypeId) as ArchetypeLevelRow[] : [];

    // Calculate current level based on total TU
    let currentLevel = 1;
    let currentLevelName = 'Beginner';
    let nextLevelTU = levels[0]?.total_tu || 100;
    let progressToNextLevel = 0;

    for (const level of levels) {
      if (totalTU >= level.total_tu) {
        currentLevel = level.level;
        currentLevelName = level.name;
        const nextLevel = levels.find(l => l.level === level.level + 1);
        if (nextLevel) {
          nextLevelTU = nextLevel.total_tu;
          progressToNextLevel = ((totalTU - level.total_tu) / (nextLevel.total_tu - level.total_tu)) * 100;
        } else {
          nextLevelTU = level.total_tu;
          progressToNextLevel = 100;
        }
      }
    }

    // Aggregate muscle activations
    const muscleActivations: Record<string, number> = {};
    for (const workout of workouts) {
      if (workout.muscle_activations) {
        try {
          const activations = JSON.parse(workout.muscle_activations);
          for (const [muscleId, value] of Object.entries(activations)) {
            muscleActivations[muscleId] = (muscleActivations[muscleId] || 0) + (value as number);
          }
        } catch {}
      }
    }

    // Get muscle names
    const muscles = db.prepare(`SELECT id, name, muscle_group FROM muscles`).all() as MuscleRow[];
    const muscleMap = new Map(muscles.map(m => [m.id, m]));

    // Build muscle breakdown
    const muscleBreakdown = Object.entries(muscleActivations)
      .map(([id, total]) => ({
        id,
        name: muscleMap.get(id)?.name || id,
        group: muscleMap.get(id)?.muscle_group || 'Other',
        totalActivation: total,
      }))
      .sort((a, b) => b.totalActivation - a.totalActivation);

    // Calculate weekly stats (last 7 days)
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const weeklyWorkouts = workouts.filter(w => new Date(w.created_at) >= weekAgo);
    const monthlyWorkouts = workouts.filter(w => new Date(w.created_at) >= monthAgo);

    const weeklyTU = weeklyWorkouts.reduce((sum, w) => sum + (w.total_tu || 0), 0);
    const monthlyTU = monthlyWorkouts.reduce((sum, w) => sum + (w.total_tu || 0), 0);

    // Calculate streak (consecutive days with workouts)
    const workoutDates = new Set(workouts.map(w => w.date));
    let streak = 0;
    const today = new Date().toISOString().split('T')[0];
    let checkDate = new Date();

    // Check if worked out today
    if (workoutDates.has(today)) {
      streak = 1;
      checkDate.setDate(checkDate.getDate() - 1);
    }

    while (workoutDates.has(checkDate.toISOString().split('T')[0])) {
      streak++;
      checkDate.setDate(checkDate.getDate() - 1);
    }

    // Build workout history for chart (last 30 days)
    const workoutHistory: { date: string; tu: number; count: number }[] = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const dayWorkouts = workouts.filter(w => w.date === dateStr);
      workoutHistory.push({
        date: dateStr,
        tu: dayWorkouts.reduce((sum, w) => sum + (w.total_tu || 0), 0),
        count: dayWorkouts.length,
      });
    }

    // Build paths (archetypes with progress)
    const paths = archetypes.map(arch => {
      const archLevels = db.prepare(`
        SELECT level, name, total_tu
        FROM archetype_levels
        WHERE archetype_id = ?
        ORDER BY level ASC
      `).all(arch.id) as ArchetypeLevelRow[];

      const maxTU = archLevels[archLevels.length - 1]?.total_tu || 1000;
      const percentComplete = Math.min(100, (totalTU / maxTU) * 100);

      return {
        archetype: arch.id,
        name: arch.name,
        philosophy: arch.philosophy,
        description: arch.description,
        focusAreas: arch.focus_areas?.split(',').map(s => s.trim()) || [],
        isCurrent: arch.id === currentArchetypeId,
        percentComplete,
        levels: archLevels,
      };
    });

    // Calculate days since joined
    const joinedDate = new Date(user.created_at);
    const daysSinceJoined = Math.floor((now.getTime() - joinedDate.getTime()) / (24 * 60 * 60 * 1000));

    // Get top exercises used
    const exerciseCounts: Record<string, { name: string; count: number }> = {};
    for (const workout of workouts) {
      if (workout.exercise_data) {
        try {
          const exercises = JSON.parse(workout.exercise_data);
          for (const ex of exercises) {
            const id = ex.exerciseId || ex.id;
            if (!exerciseCounts[id]) {
              exerciseCounts[id] = { name: ex.name || id, count: 0 };
            }
            exerciseCounts[id].count++;
          }
        } catch {}
      }
    }
    const topExercises = Object.entries(exerciseCounts)
      .map(([id, data]) => ({ id, ...data }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return {
      // Overview
      totalTU,
      totalWorkouts: workouts.length,
      currentLevel,
      currentLevelName,
      nextLevelTU,
      progressToNextLevel: Math.min(100, progressToNextLevel),
      currentArchetype: currentArchetypeId,
      daysSinceJoined,
      streak,

      // Time-based stats
      stats: {
        weekly: {
          workouts: weeklyWorkouts.length,
          tu: weeklyTU,
          avgTuPerWorkout: weeklyWorkouts.length > 0 ? Math.round(weeklyTU / weeklyWorkouts.length) : 0,
        },
        monthly: {
          workouts: monthlyWorkouts.length,
          tu: monthlyTU,
          avgTuPerWorkout: monthlyWorkouts.length > 0 ? Math.round(monthlyTU / monthlyWorkouts.length) : 0,
        },
        allTime: {
          workouts: workouts.length,
          tu: totalTU,
          avgTuPerWorkout: workouts.length > 0 ? Math.round(totalTU / workouts.length) : 0,
        },
      },

      // Charts data
      workoutHistory,

      // Muscle breakdown
      muscleBreakdown: muscleBreakdown.slice(0, 15),

      // Muscle groups summary
      muscleGroups: getMuscleGroupSummary(muscleBreakdown),

      // Available paths
      paths,

      // Levels for current archetype
      levels: levels.map(l => ({
        ...l,
        achieved: totalTU >= l.total_tu,
      })),

      // Top exercises
      topExercises,

      // Recent workouts
      recentWorkouts: workouts.slice(0, 5).map(w => ({
        id: w.id,
        date: w.date,
        tu: w.total_tu,
        createdAt: w.created_at,
      })),
    };
  },

  /**
   * Switch user's archetype
   */
  switchArchetype(userId: string, archetypeId: string) {
    // Verify archetype exists
    const archetype = db.prepare(`SELECT id, name FROM archetypes WHERE id = ?`).get(archetypeId);
    if (!archetype) {
      return { success: false, error: 'Archetype not found' };
    }

    // Update user
    db.prepare(`UPDATE users SET current_archetype_id = ? WHERE id = ?`).run(archetypeId, userId);

    log.info('User switched archetype', { userId, archetypeId });

    return { success: true, archetype: archetypeId };
  },
};

/**
 * Group muscle activations by muscle group
 */
function getMuscleGroupSummary(muscleBreakdown: { group: string; totalActivation: number }[]) {
  const groups: Record<string, number> = {};
  for (const m of muscleBreakdown) {
    groups[m.group] = (groups[m.group] || 0) + m.totalActivation;
  }
  return Object.entries(groups)
    .map(([name, total]) => ({ name, total }))
    .sort((a, b) => b.total - a.total);
}

/**
 * Router
 */
export const journeyRouter = Router();

// Get comprehensive journey data
journeyRouter.get(
  '/',
  authenticateToken,
  asyncHandler(async (req: Request, res: Response) => {
    const data = journeyService.getJourneyData(req.user!.userId);

    if (!data) {
      res.status(404).json({ error: { code: 'NOT_FOUND', message: 'User not found' } });
      return;
    }

    res.json({ data });
  })
);

// Get paths (archetypes with progress) - for compatibility
journeyRouter.get(
  '/paths',
  authenticateToken,
  asyncHandler(async (req: Request, res: Response) => {
    const data = journeyService.getJourneyData(req.user!.userId);

    if (!data) {
      res.json({ data: { paths: [] } });
      return;
    }

    res.json({ data: { paths: data.paths } });
  })
);

// Switch archetype
journeyRouter.post(
  '/switch',
  authenticateToken,
  asyncHandler(async (req: Request, res: Response) => {
    const { archetype } = req.body;

    if (!archetype) {
      res.status(400).json({ error: { code: 'VALIDATION', message: 'archetype required' } });
      return;
    }

    const result = journeyService.switchArchetype(req.user!.userId, archetype);

    if (!result.success) {
      res.status(400).json({ error: { code: 'INVALID_ARCHETYPE', message: result.error } });
      return;
    }

    res.json({ success: true, data: { archetype: result.archetype } });
  })
);
