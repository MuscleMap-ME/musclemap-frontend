/**
 * Miscellaneous Routes (Fastify)
 *
 * Handles utility endpoints, settings, and legacy compatibility routes.
 */

import { FastifyInstance } from 'fastify';
import { authenticate, optionalAuth } from './auth';
import { queryAll, queryOne, query } from '../../db/client';
import { loggers } from '../../lib/logger';

const log = loggers.http;

export async function registerMiscRoutes(app: FastifyInstance) {
  // Muscles
  app.get('/muscles', async (request, reply) => {
    const muscles = await queryAll(
      'SELECT id, name, anatomical_name, muscle_group, bias_weight, optimal_weekly_volume, recovery_time FROM muscles'
    );
    return reply.send({ data: muscles });
  });

  // Exercises
  app.get('/exercises', async (request, reply) => {
    const params = request.query as { location?: string; equipment?: string };

    let sql = 'SELECT * FROM exercises WHERE 1=1';
    const queryParams: any[] = [];

    if (params.location) {
      queryParams.push(params.location);
      sql += ` AND $${queryParams.length} = ANY(locations::text[])`;
    }

    const exercises = await queryAll(sql, queryParams);

    return reply.send({
      data: exercises.map((e: any) => ({
        id: e.id,
        name: e.name,
        type: e.type,
        difficulty: e.difficulty,
        description: e.description,
        cues: e.cues,
        primaryMuscles: e.primary_muscles,
        equipmentRequired: e.equipment_required,
        equipmentOptional: e.equipment_optional,
        locations: e.locations,
        isCompound: e.is_compound,
        estimatedSeconds: e.estimated_seconds,
        restSeconds: e.rest_seconds,
        movementPattern: e.movement_pattern,
      })),
    });
  });

  // Exercise activations
  app.get('/exercises/:id/activations', async (request, reply) => {
    const { id } = request.params as { id: string };

    const activations = await queryAll<{ muscle_id: string; activation: number }>(
      'SELECT muscle_id, activation FROM exercise_activations WHERE exercise_id = $1',
      [id]
    );

    return reply.send({ data: activations });
  });

  // Settings
  app.get('/settings', { preHandler: authenticate }, async (request, reply) => {
    return reply.send({ data: { theme: 'dark' } });
  });

  app.get('/settings/themes', async (request, reply) => {
    return reply.send({ data: ['light', 'dark'] });
  });

  app.patch('/settings', { preHandler: authenticate }, async (request, reply) => {
    return reply.send({ data: request.body || {} });
  });

  // Progression (legacy)
  app.get('/progression/mastery-levels', async (request, reply) => {
    return reply.send({ data: [] });
  });

  app.get('/progression/leaderboard', async (request, reply) => {
    const leaderboard = await queryAll<{
      user_id: string;
      username: string;
      display_name: string;
      avatar_url: string;
      total_tu: number;
      workout_count: string;
      rank: string;
    }>(
      `SELECT
         u.id as user_id,
         u.username,
         u.display_name,
         u.avatar_url,
         COALESCE(SUM(w.total_tu), 0)::float as total_tu,
         COUNT(w.id)::int as workout_count,
         RANK() OVER (ORDER BY COALESCE(SUM(w.total_tu), 0) DESC)::int as rank
       FROM users u
       LEFT JOIN workouts w ON w.user_id = u.id AND w.is_public = TRUE
       WHERE (u.flags->>'banned')::boolean = false OR u.flags->>'banned' IS NULL
       GROUP BY u.id
       ORDER BY total_tu DESC
       LIMIT 100`
    );

    return reply.send({ data: leaderboard });
  });

  app.get('/progression/achievements', { preHandler: authenticate }, async (request, reply) => {
    return reply.send({ data: [] });
  });

  app.get('/progress/stats', { preHandler: authenticate }, async (request, reply) => {
    return reply.send({ data: {} });
  });

  // High fives
  app.get('/highfives/stats', { preHandler: authenticate }, async (request, reply) => {
    return reply.send({ data: {} });
  });

  app.get('/highfives/users', { preHandler: authenticate }, async (request, reply) => {
    return reply.send({ data: [] });
  });

  app.post('/highfives/send', { preHandler: authenticate }, async (request, reply) => {
    if (!request.body || Object.keys(request.body as object).length === 0) {
      return reply.status(400).send({
        error: { code: 'VALIDATION', message: 'Empty high five', statusCode: 400 },
      });
    }
    return reply.send({ data: { sent: true } });
  });

  // Locations
  app.get('/locations/nearby', async (request, reply) => {
    return reply.send({ data: [] });
  });

  // i18n
  app.get('/i18n/languages', async (request, reply) => {
    return reply.send({ data: ['en'] });
  });

  // Alternatives
  app.get('/alternatives/seated', async (request, reply) => {
    return reply.send({ data: [] });
  });

  app.get('/alternatives/low-impact', async (request, reply) => {
    return reply.send({ data: [] });
  });

  // Entitlements
  app.get('/entitlements', { preHandler: authenticate }, async (request, reply) => {
    const userId = request.user!.userId;

    // Check trial status
    const user = await queryOne<{ trial_ends_at: Date }>(
      'SELECT trial_ends_at FROM users WHERE id = $1',
      [userId]
    );

    // Check subscription
    const subscription = await queryOne<{ status: string; current_period_end: Date }>(
      "SELECT status, current_period_end FROM subscriptions WHERE user_id = $1 AND status = 'active'",
      [userId]
    );

    // Get credit balance
    const balance = await queryOne<{ balance: number }>(
      'SELECT balance FROM credit_balances WHERE user_id = $1',
      [userId]
    );

    const now = new Date();
    const trialActive = user?.trial_ends_at && new Date(user.trial_ends_at) > now;
    const subscriptionActive = subscription?.status === 'active';

    return reply.send({
      data: {
        unlimited: trialActive || subscriptionActive,
        reason: subscriptionActive ? 'subscription' : trialActive ? 'trial' : 'credits',
        trialEndsAt: user?.trial_ends_at,
        subscriptionEndsAt: subscription?.current_period_end,
        creditBalance: balance?.balance || 0,
      },
    });
  });

  app.get('/me/entitlements', { preHandler: authenticate }, async (request, reply) => {
    // Alias for /entitlements
    const userId = request.user!.userId;

    const user = await queryOne<{ trial_ends_at: Date }>(
      'SELECT trial_ends_at FROM users WHERE id = $1',
      [userId]
    );

    const subscription = await queryOne<{ status: string; current_period_end: Date }>(
      "SELECT status, current_period_end FROM subscriptions WHERE user_id = $1 AND status = 'active'",
      [userId]
    );

    const balance = await queryOne<{ balance: number }>(
      'SELECT balance FROM credit_balances WHERE user_id = $1',
      [userId]
    );

    const now = new Date();
    const trialActive = user?.trial_ends_at && new Date(user.trial_ends_at) > now;
    const subscriptionActive = subscription?.status === 'active';

    return reply.send({
      data: {
        unlimited: trialActive || subscriptionActive,
        reason: subscriptionActive ? 'subscription' : trialActive ? 'trial' : 'credits',
        trialEndsAt: user?.trial_ends_at,
        subscriptionEndsAt: subscription?.current_period_end,
        creditBalance: balance?.balance || 0,
      },
    });
  });

  // Competitions
  app.get('/competitions', { preHandler: optionalAuth }, async (request, reply) => {
    const competitions = await queryAll<{
      id: string;
      name: string;
      description: string;
      type: string;
      status: string;
      start_date: Date;
      end_date: Date;
      max_participants: number;
      is_public: boolean;
    }>(
      "SELECT * FROM competitions WHERE is_public = TRUE AND status != 'canceled' ORDER BY start_date DESC LIMIT 50"
    );

    return reply.send({ data: competitions });
  });

  app.get('/competitions/:id', { preHandler: optionalAuth }, async (request, reply) => {
    const { id } = request.params as { id: string };

    const competition = await queryOne(
      'SELECT * FROM competitions WHERE id = $1',
      [id]
    );

    if (!competition) {
      return reply.status(404).send({
        error: { code: 'NOT_FOUND', message: 'Competition not found', statusCode: 404 },
      });
    }

    // Get participants
    const participants = await queryAll<{
      user_id: string;
      score: number;
      rank: number;
      username: string;
      display_name: string;
    }>(
      `SELECT cp.*, u.username, u.display_name
       FROM competition_participants cp
       JOIN users u ON cp.user_id = u.id
       WHERE cp.competition_id = $1
       ORDER BY cp.score DESC`,
      [id]
    );

    return reply.send({
      data: {
        ...competition,
        participants,
      },
    });
  });

  // Trace/logging endpoint
  app.post('/trace/frontend-log', async (request, reply) => {
    const body = request.body as { entries?: any[] };
    // Log each frontend entry with full details for debugging
    if (body?.entries) {
      for (const entry of body.entries) {
        if (entry.level === 'error') {
          log.error({ requestId: request.id, frontendEntry: entry }, 'frontend-error');
        } else {
          log.info({ requestId: request.id, frontendEntry: entry }, 'frontend-log-entry');
        }
      }
    }
    log.info({
      requestId: request.id,
      count: body?.entries?.length,
    }, 'frontend-log');
    return reply.status(204).send();
  });

  // Debug routes
  app.get('/__routes', async (request, reply) => {
    const routes: string[] = [];

    function collectRoutes(routeTable: any[], prefix = '') {
      for (const route of routeTable) {
        if (route.method && route.url) {
          routes.push(`${route.method} ${prefix}${route.url}`);
        }
      }
    }

    // This is a simplified version - Fastify doesn't expose routes easily
    return reply.send({ routes: ['See /docs for API documentation'] });
  });
}
