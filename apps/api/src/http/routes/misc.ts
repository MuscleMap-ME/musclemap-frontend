/**
 * Miscellaneous Routes (Fastify)
 *
 * Handles utility endpoints, settings, and legacy compatibility routes.
 */

import { FastifyInstance } from 'fastify';
import { authenticate, optionalAuth } from './auth';
import { queryAll, queryOne } from '../../db/client';
import { loggers } from '../../lib/logger';
import {
  getExerciseIllustration,
  hasExerciseIllustration,
  getBodyIllustrationPath,
  MUSCLE_GROUP_COLORS,
  ACTIVATION_COLORS,
  getMuscleIllustrationIds,
} from '@musclemap/shared';

const log = loggers.http;

export async function registerMiscRoutes(app: FastifyInstance) {
  // Muscles - static reference data, cache aggressively
  app.get('/muscles', async (request, reply) => {
    const muscles = await queryAll(
      'SELECT id, name, anatomical_name, muscle_group, bias_weight, optimal_weekly_volume, recovery_time FROM muscles'
    );
    // Cache for 1 hour at edge, 15 minutes in browser
    reply.header('Cache-Control', 'public, max-age=900, s-maxage=3600, stale-while-revalidate=86400');
    reply.header('CDN-Cache-Control', 'public, max-age=3600');
    return reply.send({ data: muscles });
  });

  // Muscle activations for authenticated user - aggregates from recent workouts
  app.get('/muscles/activations', { preHandler: optionalAuth }, async (request, reply) => {
    const userId = (request as any).userId;

    // If not authenticated, return empty array (frontend will use fallback)
    if (!userId) {
      return reply.send({ data: [] });
    }

    // Get muscle activations from user's workouts in the last 30 days
    const workouts = await queryAll<{ muscle_activations: Record<string, number> | null }>(
      `SELECT muscle_activations FROM workouts
       WHERE user_id = $1 AND created_at > NOW() - INTERVAL '30 days'
       AND muscle_activations IS NOT NULL`,
      [userId]
    );

    // Aggregate muscle activations
    const muscleActivations: Record<string, number> = {};
    for (const row of workouts) {
      const activations = row.muscle_activations || {};
      for (const [muscleId, value] of Object.entries(activations)) {
        muscleActivations[muscleId] = (muscleActivations[muscleId] || 0) + (value as number);
      }
    }

    // Convert to array format expected by frontend
    const activationArray = Object.entries(muscleActivations)
      .map(([muscleId, activation]) => ({
        muscleId,
        activation: Math.min(100, Math.round(activation)), // Cap at 100
      }))
      .sort((a, b) => b.activation - a.activation);

    // Short cache since this is user-specific
    reply.header('Cache-Control', 'private, max-age=60');
    return reply.send({ data: activationArray });
  });

  // Exercises - reference data, cache at edge
  app.get('/exercises', async (request, reply) => {
    const params = request.query as { location?: string; equipment?: string; include_videos?: string };

    let sql = 'SELECT * FROM exercises WHERE 1=1';
    const queryParams: any[] = [];

    if (params.location) {
      queryParams.push(params.location);
      sql += ` AND $${queryParams.length} = ANY(locations::text[])`;
    }

    const exercises = await queryAll(sql, queryParams);

    // Cache for 30 minutes at edge, 10 minutes in browser (exercises change rarely)
    reply.header('Cache-Control', 'public, max-age=600, s-maxage=1800, stale-while-revalidate=86400');
    reply.header('CDN-Cache-Control', 'public, max-age=1800');
    return reply.send({
      data: exercises.map((e: any) => {
        const illustration = getExerciseIllustration(e.id);
        return {
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
          // Illustration data
          illustration: illustration ? {
            url: illustration.file,
            view: illustration.view,
            primaryMuscles: illustration.primaryMuscles,
            secondaryMuscles: illustration.secondaryMuscles,
          } : null,
          hasIllustration: hasExerciseIllustration(e.id),
          // Video data
          hasVideo: e.has_video || false,
          videoUrl: e.video_url || null,
          videoThumbnailUrl: e.video_thumbnail_url || null,
          videoDurationSeconds: e.video_duration_seconds || null,
          // wger.de image data
          imageUrl: e.image_url || null,
          imageLicense: e.image_license || null,
          imageAuthor: e.image_author || null,
          wgerId: e.wger_id || null,
        };
      }),
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

  // Exercise illustration with activation data
  app.get('/exercises/:id/illustration', async (request, reply) => {
    const { id } = request.params as { id: string };

    const exercise = await queryOne<{ id: string; name: string }>(
      'SELECT id, name FROM exercises WHERE id = $1',
      [id]
    );

    if (!exercise) {
      return reply.status(404).send({
        error: { code: 'NOT_FOUND', message: 'Exercise not found', statusCode: 404 },
      });
    }

    const illustration = getExerciseIllustration(id);
    if (!illustration) {
      return reply.status(404).send({
        error: { code: 'NOT_FOUND', message: 'No illustration available for this exercise', statusCode: 404 },
      });
    }

    // Get muscle activations for highlighting
    const activations = await queryAll<{ muscle_id: string; activation: number }>(
      'SELECT muscle_id, activation FROM exercise_activations WHERE exercise_id = $1 ORDER BY activation DESC',
      [id]
    );

    // Map database muscle IDs to illustration IDs
    const muscleHighlights = activations.map(a => ({
      dbMuscleId: a.muscle_id,
      illustrationIds: getMuscleIllustrationIds(a.muscle_id),
      activation: a.activation,
    }));

    return reply.send({
      data: {
        exerciseId: id,
        exerciseName: exercise.name,
        illustration: {
          url: illustration.file,
          view: illustration.view,
          primaryMuscles: illustration.primaryMuscles,
          secondaryMuscles: illustration.secondaryMuscles,
        },
        muscleHighlights,
        activationColors: ACTIVATION_COLORS,
      },
    });
  });

  // Body illustrations
  app.get('/illustrations/bodies', async (request, reply) => {
    const params = request.query as { type?: string; view?: string };

    const types = ['male', 'female', 'youth'] as const;
    const views = ['front', 'back', 'side'] as const;

    const illustrations: Array<{ type: string; view: string; url: string }> = [];

    for (const type of types) {
      if (params.type && params.type !== type) continue;
      for (const view of views) {
        if (params.view && params.view !== view) continue;
        illustrations.push({
          type,
          view,
          url: getBodyIllustrationPath(type, view),
        });
      }
    }

    return reply.send({ data: illustrations });
  });

  // Muscle detail with exercises targeting it
  app.get('/muscles/:id', async (request, reply) => {
    const { id } = request.params as { id: string };

    const muscle = await queryOne<{
      id: string;
      name: string;
      anatomical_name: string;
      muscle_group: string;
      bias_weight: number;
      optimal_weekly_volume: number;
      recovery_time: number;
    }>(
      'SELECT * FROM muscles WHERE id = $1',
      [id]
    );

    if (!muscle) {
      return reply.status(404).send({
        error: { code: 'NOT_FOUND', message: 'Muscle not found', statusCode: 404 },
      });
    }

    // Get exercises that target this muscle
    const exercises = await queryAll<{
      exercise_id: string;
      exercise_name: string;
      activation: number;
    }>(
      `SELECT ea.exercise_id, e.name as exercise_name, ea.activation
       FROM exercise_activations ea
       JOIN exercises e ON ea.exercise_id = e.id
       WHERE ea.muscle_id = $1
       ORDER BY ea.activation DESC
       LIMIT 20`,
      [id]
    );

    // Get color for muscle group
    const groupColor = MUSCLE_GROUP_COLORS[muscle.muscle_group] || { color: '#64748B', glow: 'rgba(100, 116, 139, 0.5)' };

    return reply.send({
      data: {
        id: muscle.id,
        name: muscle.name,
        anatomicalName: muscle.anatomical_name,
        muscleGroup: muscle.muscle_group,
        biasWeight: muscle.bias_weight,
        optimalWeeklyVolume: muscle.optimal_weekly_volume,
        recoveryTime: muscle.recovery_time,
        illustrationIds: getMuscleIllustrationIds(id),
        color: groupColor.color,
        glow: groupColor.glow,
        exercises: exercises.map(e => {
          const illustration = getExerciseIllustration(e.exercise_id);
          return {
            id: e.exercise_id,
            name: e.exercise_name,
            activation: e.activation,
            illustrationUrl: illustration?.file || null,
          };
        }),
      },
    });
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
    const userId = request.user!.userId;

    try {
      // Get user's XP, level, and rank data
      const user = await queryOne<{
        total_xp: number;
        current_level: number;
        current_rank: string;
      }>(
        `SELECT COALESCE(total_xp, 0) as total_xp,
                COALESCE(current_level, 1) as current_level,
                COALESCE(current_rank, 'novice') as current_rank
         FROM users WHERE id = $1`,
        [userId]
      );

      // Get workout count
      const workoutCount = await queryOne<{ count: string }>(
        `SELECT COUNT(*) as count FROM workouts WHERE user_id = $1`,
        [userId]
      );

      // Get streak data
      const streakData = await queryOne<{ streak: number; last_workout: string | null }>(
        `SELECT
           COALESCE(
             (SELECT COUNT(DISTINCT date)::int
              FROM (
                SELECT date, date - (ROW_NUMBER() OVER (ORDER BY date DESC))::int * INTERVAL '1 day' as grp
                FROM workouts
                WHERE user_id = $1 AND date >= CURRENT_DATE - INTERVAL '365 days'
                GROUP BY date
              ) t
              WHERE grp = (
                SELECT date - (ROW_NUMBER() OVER (ORDER BY date DESC))::int * INTERVAL '1 day'
                FROM workouts
                WHERE user_id = $1
                GROUP BY date
                ORDER BY date DESC
                LIMIT 1
              )
             ), 0
           ) as streak,
           (SELECT MAX(date)::text FROM workouts WHERE user_id = $1) as last_workout`,
        [userId]
      );

      // Calculate simple streak (consecutive days from today/yesterday)
      let streak = 0;
      if (streakData?.last_workout) {
        const lastWorkoutDate = new Date(streakData.last_workout);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        lastWorkoutDate.setHours(0, 0, 0, 0);

        // Check if last workout was today or yesterday (streak not broken)
        if (lastWorkoutDate >= yesterday) {
          // Count consecutive days backwards
          const workoutDates = await queryAll<{ date: string }>(
            `SELECT DISTINCT date::text as date
             FROM workouts
             WHERE user_id = $1
             ORDER BY date DESC
             LIMIT 365`,
            [userId]
          );

          if (workoutDates.length > 0) {
            let checkDate = new Date(workoutDates[0].date);
            checkDate.setHours(0, 0, 0, 0);

            // If last workout was today, start counting from today
            // If it was yesterday, still count it as part of streak
            for (const row of workoutDates) {
              const workoutDate = new Date(row.date);
              workoutDate.setHours(0, 0, 0, 0);

              if (workoutDate.getTime() === checkDate.getTime()) {
                streak++;
                checkDate.setDate(checkDate.getDate() - 1);
              } else if (workoutDate < checkDate) {
                break; // Gap in streak
              }
            }
          }
        }
      }

      // Level names based on current level
      const levelNames = [
        'Beginner', 'Novice', 'Apprentice', 'Journeyman', 'Adept',
        'Expert', 'Master', 'Grandmaster', 'Legend', 'Champion'
      ];
      const level = user?.current_level || 1;
      const levelName = levelNames[Math.min(level - 1, levelNames.length - 1)] || 'Beginner';

      return reply.send({
        data: {
          xp: user?.total_xp || 0,
          level: level,
          levelName: levelName,
          rank: user?.current_rank || 'novice',
          streak: streak,
          workouts: parseInt(workoutCount?.count || '0'),
          lastWorkoutDate: streakData?.last_workout || null,
        },
      });
    } catch (error) {
      log.error({ error, userId }, 'Failed to fetch progress stats');
      return reply.send({
        data: {
          xp: 0,
          level: 1,
          levelName: 'Beginner',
          rank: 'novice',
          streak: 0,
          workouts: 0,
          lastWorkoutDate: null,
        },
      });
    }
  });

  // High fives
  app.get('/highfives/stats', { preHandler: authenticate }, async (request, reply) => {
    // Return explicit zeroes to prevent client from interpreting as truthy unread count
    return reply.send({
      data: {
        sent: 0,
        received: 0,
        unread: 0,
      },
    });
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

  // Trace/logging endpoint - stores frontend spans in SQLite
  app.post('/trace/frontend-log', async (request, reply) => {
    const body = request.body as { spans?: any[]; entries?: any[] };

    // Handle spans from frontend tracing system
    if (body?.spans && body.spans.length > 0) {
      try {
        const { insertSpan } = await import('../../lib/tracing/trace-db');
        for (const span of body.spans) {
          insertSpan({
            id: span.id,
            traceId: span.traceId,
            parentSpanId: span.parentSpanId,
            operationName: span.operationName,
            operationType: span.operationType,
            service: 'frontend',
            startedAt: span.startedAt,
            endedAt: span.endedAt,
            durationMs: span.durationMs,
            status: span.status || 'completed',
            errorMessage: span.errorMessage,
            attributes: span.attributes,
            events: [],
          });
        }
        log.debug({ count: body.spans.length }, 'frontend-spans-stored');
      } catch (err) {
        log.error({ error: err }, 'frontend-spans-store-error');
      }
    }

    // Handle legacy log entries (backwards compatibility)
    if (body?.entries) {
      for (const entry of body.entries) {
        if (entry.level === 'error') {
          log.error({ requestId: request.id, frontendEntry: entry }, 'frontend-error');
        } else {
          log.debug({ requestId: request.id, frontendEntry: entry }, 'frontend-log-entry');
        }
      }
    }

    return reply.status(204).send();
  });

  // Debug routes
  app.get('/__routes', async (request, reply) => {
    const routes: string[] = [];

    function _collectRoutes(routeTable: any[], prefix = '') {
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
