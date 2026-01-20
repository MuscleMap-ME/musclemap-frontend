/**
 * Journey Routes (Fastify)
 *
 * Handles user progress tracking and journey stats.
 */

import { FastifyInstance } from 'fastify';
import { authenticate } from './auth';
import { queryOne, queryAll, query } from '../../db/client';

export async function registerJourneyRoutes(app: FastifyInstance) {
  // Get comprehensive journey overview - returns all data needed by Journey.tsx
  app.get('/journey', { preHandler: authenticate }, async (request, reply) => {
    const userId = request.user!.userId;

    // Get user's archetype, level, and join date
    const user = await queryOne<{
      current_identity_id: string;
      current_level: number;
      created_at: Date;
    }>(
      'SELECT current_identity_id, current_level, created_at FROM users WHERE id = $1',
      [userId]
    );

    // Calculate days since joined
    const daysSinceJoined = user?.created_at
      ? Math.floor((Date.now() - new Date(user.created_at).getTime()) / (1000 * 60 * 60 * 24))
      : 0;

    // Get total workout stats
    const totalStats = await queryOne<{
      total_workouts: string;
      total_tu: string;
    }>(
      `SELECT
         COUNT(*)::text as total_workouts,
         COALESCE(SUM(total_tu), 0)::text as total_tu
       FROM workouts WHERE user_id = $1`,
      [userId]
    );

    const totalWorkouts = parseInt(totalStats?.total_workouts || '0');
    const totalTU = parseFloat(totalStats?.total_tu || '0');

    // Calculate streak (consecutive days with workouts)
    const streakResult = await queryOne<{ streak: string }>(
      `WITH workout_dates AS (
        SELECT DISTINCT date::date as workout_date
        FROM workouts
        WHERE user_id = $1
        ORDER BY workout_date DESC
      ),
      date_series AS (
        SELECT workout_date,
               workout_date - (ROW_NUMBER() OVER (ORDER BY workout_date DESC))::int AS grp
        FROM workout_dates
      )
      SELECT COUNT(*)::text as streak
      FROM date_series
      WHERE grp = (SELECT grp FROM date_series WHERE workout_date = CURRENT_DATE OR workout_date = CURRENT_DATE - 1 LIMIT 1)`,
      [userId]
    );
    const streak = parseInt(streakResult?.streak || '0');

    // Get weekly stats
    const weeklyStats = await queryOne<{
      workouts: string;
      tu: string;
    }>(
      `SELECT
         COUNT(*)::text as workouts,
         COALESCE(SUM(total_tu), 0)::text as tu
       FROM workouts
       WHERE user_id = $1 AND date >= CURRENT_DATE - INTERVAL '7 days'`,
      [userId]
    );
    const weeklyWorkouts = parseInt(weeklyStats?.workouts || '0');
    const weeklyTU = parseFloat(weeklyStats?.tu || '0');

    // Get monthly stats
    const monthlyStats = await queryOne<{
      workouts: string;
      tu: string;
    }>(
      `SELECT
         COUNT(*)::text as workouts,
         COALESCE(SUM(total_tu), 0)::text as tu
       FROM workouts
       WHERE user_id = $1 AND date >= CURRENT_DATE - INTERVAL '30 days'`,
      [userId]
    );
    const monthlyWorkouts = parseInt(monthlyStats?.workouts || '0');
    const monthlyTU = parseFloat(monthlyStats?.tu || '0');

    // Get archetype info if set
    let currentArchetype = user?.current_identity_id || 'default';
    let currentLevelName = 'Beginner';
    let nextLevelTU = 1000;

    if (user?.current_identity_id) {
      const level = await queryOne<{ name: string; total_tu: number }>(
        'SELECT name, total_tu FROM archetype_levels WHERE archetype_id = $1 AND level = $2',
        [user.current_identity_id, user.current_level || 1]
      );
      if (level) {
        currentLevelName = level.name;
      }

      // Get next level TU requirement
      const nextLevel = await queryOne<{ total_tu: number }>(
        'SELECT total_tu FROM archetype_levels WHERE archetype_id = $1 AND level = $2',
        [user.current_identity_id, (user.current_level || 1) + 1]
      );
      if (nextLevel) {
        nextLevelTU = nextLevel.total_tu - totalTU;
      }
    }

    // Get 30-day workout history for chart
    const workoutHistory = await queryAll<{
      date: string;
      tu: string;
      count: string;
    }>(
      `WITH date_series AS (
        SELECT generate_series(
          CURRENT_DATE - INTERVAL '29 days',
          CURRENT_DATE,
          INTERVAL '1 day'
        )::date AS date
      )
      SELECT
        ds.date::text as date,
        COALESCE(SUM(w.total_tu), 0)::text as tu,
        COUNT(w.id)::text as count
      FROM date_series ds
      LEFT JOIN workouts w ON w.date = ds.date AND w.user_id = $1
      GROUP BY ds.date
      ORDER BY ds.date ASC`,
      [userId]
    );

    // Get top exercises
    const topExercises = await queryAll<{
      id: string;
      name: string;
      count: string;
    }>(
      `SELECT
         e.id,
         e.name,
         COUNT(*)::text as count
       FROM workouts w
       CROSS JOIN LATERAL jsonb_array_elements(w.exercise_data) AS ex
       JOIN exercises e ON e.id = (ex->>'exerciseId')
       WHERE w.user_id = $1
       GROUP BY e.id, e.name
       ORDER BY COUNT(*) DESC
       LIMIT 10`,
      [userId]
    );

    // Get all archetype levels for the current archetype
    const levels = user?.current_identity_id
      ? await queryAll<{
          level: number;
          name: string;
          total_tu: number;
        }>(
          'SELECT level, name, total_tu FROM archetype_levels WHERE archetype_id = $1 ORDER BY level',
          [user.current_identity_id]
        )
      : [];

    // Mark which levels are achieved
    const levelsWithAchieved = levels.map((l) => ({
      level: l.level,
      name: l.name,
      total_tu: l.total_tu,
      achieved: totalTU >= l.total_tu,
    }));

    // Get muscle group breakdown from recent workouts
    const muscleData = await queryAll<{
      muscle_activations: Record<string, number> | null;
    }>(
      `SELECT muscle_activations FROM workouts
       WHERE user_id = $1 AND muscle_activations IS NOT NULL`,
      [userId]
    );

    // Aggregate muscle activations by group
    const muscleGroups: Record<string, number> = {};
    const muscleBreakdown: Record<string, { name: string; group: string; total: number }> = {};

    for (const row of muscleData) {
      const activations = row.muscle_activations || {};
      for (const [muscleId, value] of Object.entries(activations)) {
        const numValue = typeof value === 'number' ? value : 0;
        // Map muscle IDs to groups (simplified)
        let group = 'Other';
        const muscleLower = muscleId.toLowerCase();
        if (muscleLower.includes('pec') || muscleLower.includes('chest')) group = 'Chest';
        else if (muscleLower.includes('lat') || muscleLower.includes('back') || muscleLower.includes('rhomb') || muscleLower.includes('trap')) group = 'Back';
        else if (muscleLower.includes('delt') || muscleLower.includes('shoulder')) group = 'Shoulders';
        else if (muscleLower.includes('bicep') || muscleLower.includes('tricep') || muscleLower.includes('forearm')) group = 'Arms';
        else if (muscleLower.includes('quad') || muscleLower.includes('hamstr') || muscleLower.includes('calf') || muscleLower.includes('glute')) group = 'Legs';
        else if (muscleLower.includes('abs') || muscleLower.includes('oblique') || muscleLower.includes('core')) group = 'Core';

        muscleGroups[group] = (muscleGroups[group] || 0) + numValue;

        if (!muscleBreakdown[muscleId]) {
          muscleBreakdown[muscleId] = { name: muscleId, group, total: 0 };
        }
        muscleBreakdown[muscleId].total += numValue;
      }
    }

    // Convert to arrays
    const muscleGroupsArray = Object.entries(muscleGroups)
      .map(([name, total]) => ({ name, total }))
      .sort((a, b) => b.total - a.total);

    const muscleBreakdownArray = Object.entries(muscleBreakdown)
      .map(([id, data]) => ({ id, name: data.name, group: data.group, totalActivation: data.total }))
      .sort((a, b) => b.totalActivation - a.totalActivation);

    // Get recent workouts
    const recentWorkouts = await queryAll<{
      id: string;
      date: string;
      total_tu: number;
      created_at: Date;
    }>(
      `SELECT id, date::text, total_tu, created_at
       FROM workouts
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT 10`,
      [userId]
    );

    // Get all archetypes for path switching
    const archetypes = await queryAll<{
      id: string;
      name: string;
      philosophy: string;
      focus_areas: string;
    }>('SELECT id, name, philosophy, focus_areas FROM archetypes');

    // Build paths array
    const paths = archetypes.map((a) => {
      // Parse focus areas
      let focusAreas: string[] = [];
      if (a.focus_areas) {
        try {
          const parsed = JSON.parse(a.focus_areas);
          focusAreas = Array.isArray(parsed) ? parsed : [a.focus_areas];
        } catch {
          focusAreas = a.focus_areas.split(',').map((s) => s.trim());
        }
      }

      // Calculate user's TU in this archetype (simplified - just use total for now)
      const userTU = a.id === currentArchetype ? totalTU : 0;
      const maxTU = 100000; // Max TU for any archetype
      const percentComplete = Math.min(100, (userTU / maxTU) * 100);

      return {
        archetype: a.id,
        name: a.name,
        philosophy: a.philosophy,
        focusAreas,
        isCurrent: a.id === currentArchetype,
        percentComplete,
      };
    });

    return reply.send({
      data: {
        // Core stats
        currentArchetype,
        totalTU,
        currentLevel: user?.current_level || 1,
        currentLevelName,
        daysSinceJoined,
        totalWorkouts,
        streak,
        nextLevelTU: Math.max(0, nextLevelTU),

        // Detailed stats
        stats: {
          weekly: {
            workouts: weeklyWorkouts,
            tu: weeklyTU,
            avgTuPerWorkout: weeklyWorkouts > 0 ? Math.round(weeklyTU / weeklyWorkouts) : 0,
          },
          monthly: {
            workouts: monthlyWorkouts,
            tu: monthlyTU,
            avgTuPerWorkout: monthlyWorkouts > 0 ? Math.round(monthlyTU / monthlyWorkouts) : 0,
          },
          allTime: {
            workouts: totalWorkouts,
            tu: totalTU,
            avgTuPerWorkout: totalWorkouts > 0 ? Math.round(totalTU / totalWorkouts) : 0,
          },
        },

        // Chart data
        workoutHistory: workoutHistory.map((h) => ({
          date: h.date,
          tu: parseFloat(h.tu),
          count: parseInt(h.count),
        })),

        // Top exercises
        topExercises: topExercises.map((e) => ({
          id: e.id,
          name: e.name,
          count: parseInt(e.count),
        })),

        // Level progression
        levels: levelsWithAchieved,

        // Muscle data
        muscleGroups: muscleGroupsArray,
        muscleBreakdown: muscleBreakdownArray,

        // Recent workouts
        recentWorkouts: recentWorkouts.map((w) => ({
          id: w.id,
          date: w.date,
          tu: w.total_tu,
          createdAt: w.created_at,
        })),

        // Archetype paths for switching
        paths,
      },
    });
  });

  // Get detailed progress
  app.get('/journey/progress', { preHandler: authenticate }, async (request, reply) => {
    const userId = request.user!.userId;

    // Get weekly progress
    const weeklyProgress = await queryAll<{ date: string; total_tu: number; workout_count: string }>(
      `SELECT
         date,
         COALESCE(SUM(total_tu), 0)::float as total_tu,
         COUNT(*)::int as workout_count
       FROM workouts
       WHERE user_id = $1 AND date >= CURRENT_DATE - INTERVAL '7 days'
       GROUP BY date
       ORDER BY date`,
      [userId]
    );

    // Get muscle balance
    const muscleActivations = await queryAll<{ muscle_activations: Record<string, number> | null }>(
      `SELECT muscle_activations FROM workouts
       WHERE user_id = $1 AND date >= CURRENT_DATE - INTERVAL '7 days'`,
      [userId]
    );

    const muscleBalance: Record<string, number> = {};
    for (const row of muscleActivations) {
      const activations = row.muscle_activations || {};
      for (const [muscleId, value] of Object.entries(activations)) {
        muscleBalance[muscleId] = (muscleBalance[muscleId] || 0) + (value as number);
      }
    }

    return reply.send({
      data: {
        weeklyProgress,
        muscleBalance,
      },
    });
  });

  // Switch archetype
  app.post('/journey/switch', { preHandler: authenticate }, async (request, reply) => {
    const { archetype } = request.body as { archetype: string };
    const userId = request.user!.userId;

    if (!archetype) {
      return reply.status(400).send({
        error: { code: 'VALIDATION', message: 'archetype required', statusCode: 400 },
      });
    }

    // Verify archetype exists
    const archetypeExists = await queryOne<{ id: string }>(
      'SELECT id FROM archetypes WHERE id = $1',
      [archetype]
    );

    if (!archetypeExists) {
      return reply.status(404).send({
        error: { code: 'NOT_FOUND', message: 'Archetype not found', statusCode: 404 },
      });
    }

    // Update user's archetype and reset level to 1
    await query(
      'UPDATE users SET current_identity_id = $1, current_level = 1, updated_at = NOW() WHERE id = $2',
      [archetype, userId]
    );

    return reply.send({ success: true, data: { archetype } });
  });

  // Get all archetypes - static reference data, cache aggressively
  app.get('/archetypes', async (request, reply) => {
    const archetypes = await queryAll<{
      id: string;
      name: string;
      philosophy: string;
      description: string;
      focus_areas: string;
      icon_url: string;
      image_url: string | null;
      category_id: string;
    }>('SELECT id, name, philosophy, description, focus_areas, icon_url, image_url, category_id FROM archetypes');

    // Cache for 1 hour at edge, 30 minutes in browser (archetypes rarely change)
    reply.header('Cache-Control', 'public, max-age=1800, s-maxage=3600, stale-while-revalidate=86400');
    reply.header('CDN-Cache-Control', 'public, max-age=3600');
    return reply.send({
      data: archetypes.map((a) => {
        // Handle both JSON array and comma-separated string formats
        let focusAreas: string[] = [];
        const raw = a.focus_areas;
        if (raw) {
          if (Array.isArray(raw)) {
            focusAreas = raw;
          } else if (typeof raw === 'string') {
            try {
              const parsed = JSON.parse(raw);
              focusAreas = Array.isArray(parsed) ? parsed : [raw];
            } catch {
              // If not valid JSON, treat as comma-separated string
              focusAreas = raw.split(',').map((s) => s.trim());
            }
          }
        }
        return {
          id: a.id,
          name: a.name,
          philosophy: a.philosophy,
          description: a.description,
          icon: a.icon_url,
          imageUrl: a.image_url || a.icon_url, // Use image_url first, fall back to icon_url
          focusAreas,
          categoryId: a.category_id || 'general',
        };
      }),
    });
  });

  // Get all archetype categories with archetype count
  app.get('/archetypes/categories', async (request, reply) => {
    const categories = await queryAll<{
      id: string;
      name: string;
      description: string | null;
      icon: string | null;
      archetype_count: string;
    }>(`
      SELECT
        ac.id,
        ac.name,
        ac.description,
        ac.icon,
        COUNT(a.id)::text as archetype_count
      FROM archetype_categories ac
      LEFT JOIN archetypes a ON a.category_id = ac.id
      GROUP BY ac.id, ac.name, ac.description, ac.icon, ac.display_order
      ORDER BY ac.display_order ASC
    `);

    return reply.send({
      data: categories.map((c) => ({
        id: c.id,
        name: c.name,
        description: c.description,
        icon: c.icon,
        imageUrl: null, // image_url column doesn't exist in categories table
        archetypeCount: parseInt(c.archetype_count || '0'),
      })),
    });
  });

  // Get archetypes by category
  app.get('/archetypes/by-category/:categoryId', async (request, reply) => {
    const { categoryId } = request.params as { categoryId: string };

    // First check if category exists
    const category = await queryOne<{ id: string }>(
      'SELECT id FROM archetype_categories WHERE id = $1',
      [categoryId]
    );

    if (!category) {
      return reply.status(404).send({
        error: { code: 'NOT_FOUND', message: 'Category not found', statusCode: 404 },
      });
    }

    const archetypes = await queryAll<{
      id: string;
      name: string;
      philosophy: string;
      description: string;
      focus_areas: string;
      icon_url: string;
      image_url: string;
      category_id: string;
    }>(
      `SELECT id, name, philosophy, description, focus_areas, icon_url, image_url, category_id
       FROM archetypes
       WHERE category_id = $1
       ORDER BY name ASC`,
      [categoryId]
    );

    return reply.send({
      data: archetypes.map((a) => {
        // Handle both JSON array and comma-separated string formats
        let focusAreas: string[] = [];
        const raw = a.focus_areas;
        if (raw) {
          if (Array.isArray(raw)) {
            focusAreas = raw;
          } else if (typeof raw === 'string') {
            try {
              const parsed = JSON.parse(raw);
              focusAreas = Array.isArray(parsed) ? parsed : [raw];
            } catch {
              // If not valid JSON, treat as comma-separated string
              focusAreas = raw.split(',').map((s) => s.trim());
            }
          }
        }
        return {
          id: a.id,
          name: a.name,
          description: a.description,
          philosophy: a.philosophy,
          icon: a.icon_url,
          imageUrl: a.image_url,
          color: null, // color column doesn't exist in archetypes table
          focusAreas,
          categoryId: a.category_id,
        };
      }),
    });
  });

  // Select archetype
  app.post('/archetypes/select', { preHandler: authenticate }, async (request, reply) => {
    const { archetypeId } = request.body as { archetypeId: string };
    const userId = request.user!.userId;

    if (!archetypeId) {
      return reply.status(400).send({
        error: { code: 'VALIDATION', message: 'archetypeId required', statusCode: 400 },
      });
    }

    // Verify archetype exists
    const archetype = await queryOne<{ id: string }>(
      'SELECT id FROM archetypes WHERE id = $1',
      [archetypeId]
    );

    if (!archetype) {
      return reply.status(404).send({
        error: { code: 'NOT_FOUND', message: 'Archetype not found', statusCode: 404 },
      });
    }

    await query(
      'UPDATE users SET current_identity_id = $1, current_level = 1, updated_at = NOW() WHERE id = $2',
      [archetypeId, userId]
    );

    return reply.send({ data: { selected: archetypeId } });
  });

  // Get archetype levels
  app.get('/archetypes/:id/levels', async (request, reply) => {
    const { id } = request.params as { id: string };

    const levels = await queryAll<{
      level: number;
      name: string;
      total_tu: number;
      description: string;
      muscle_targets: Record<string, unknown> | null;
    }>(
      'SELECT level, name, total_tu, description, muscle_targets FROM archetype_levels WHERE archetype_id = $1 ORDER BY level',
      [id]
    );

    return reply.send({
      data: levels.map((l) => ({
        ...l,
        muscleTargets: l.muscle_targets || {},
      })),
    });
  });
}
