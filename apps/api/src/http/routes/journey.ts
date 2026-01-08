/**
 * Journey Routes (Fastify)
 *
 * Handles user progress tracking and journey stats.
 */

import { FastifyInstance } from 'fastify';
import { authenticate } from './auth';
import { queryOne, queryAll, query } from '../../db/client';

export async function registerJourneyRoutes(app: FastifyInstance) {
  // Get journey overview
  app.get('/journey', { preHandler: authenticate }, async (request, reply) => {
    const userId = request.user!.userId;

    // Get user's archetype and level
    const user = await queryOne<{
      current_identity_id: string;
      current_level: number;
    }>(
      'SELECT current_identity_id, current_level FROM users WHERE id = $1',
      [userId]
    );

    // Get workout stats
    const stats = await queryOne<{
      total_workouts: string;
      total_tu: number;
      streak_days: string;
    }>(
      `SELECT
         COUNT(*)::int as total_workouts,
         COALESCE(SUM(total_tu), 0)::float as total_tu,
         0 as streak_days
       FROM workouts WHERE user_id = $1`,
      [userId]
    );

    // Get archetype info if set
    let archetype = null;
    let level = null;
    if (user?.current_identity_id) {
      archetype = await queryOne<{ id: string; name: string; philosophy: string }>(
        'SELECT id, name, philosophy FROM archetypes WHERE id = $1',
        [user.current_identity_id]
      );

      level = await queryOne<{ name: string; total_tu: number; description: string }>(
        'SELECT name, total_tu, description FROM archetype_levels WHERE archetype_id = $1 AND level = $2',
        [user.current_identity_id, user.current_level || 1]
      );
    }

    // Get completed milestones
    const milestones = await queryAll<{ milestone_id: string; completed_at: Date }>(
      `SELECT milestone_id, completed_at FROM user_milestone_progress
       WHERE user_id = $1 AND completed_at IS NOT NULL
       ORDER BY completed_at DESC LIMIT 10`,
      [userId]
    );

    return reply.send({
      data: {
        archetype,
        level: level ? { ...level, number: user?.current_level || 1 } : null,
        stats: {
          totalWorkouts: parseInt(stats?.total_workouts || '0'),
          totalTU: stats?.total_tu || 0,
          streakDays: parseInt(stats?.streak_days || '0'),
        },
        recentMilestones: milestones,
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
    const muscleActivations = await queryAll<{ muscle_activations: string }>(
      `SELECT muscle_activations FROM workouts
       WHERE user_id = $1 AND date >= CURRENT_DATE - INTERVAL '7 days'`,
      [userId]
    );

    const muscleBalance: Record<string, number> = {};
    for (const row of muscleActivations) {
      const activations = JSON.parse(row.muscle_activations || '{}');
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

  // Get all archetypes
  app.get('/archetypes', async (request, reply) => {
    const archetypes = await queryAll<{
      id: string;
      name: string;
      philosophy: string;
      description: string;
      focus_areas: string;
      icon_url: string;
    }>('SELECT * FROM archetypes');

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
        return { ...a, focusAreas };
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
      muscle_targets: string;
    }>(
      'SELECT level, name, total_tu, description, muscle_targets FROM archetype_levels WHERE archetype_id = $1 ORDER BY level',
      [id]
    );

    return reply.send({
      data: levels.map((l) => ({
        ...l,
        muscleTargets: JSON.parse(l.muscle_targets || '{}'),
      })),
    });
  });
}
