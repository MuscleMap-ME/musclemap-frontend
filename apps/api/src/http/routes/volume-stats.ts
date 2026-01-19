/**
 * Volume Stats Routes
 *
 * API endpoints for workout volume analytics:
 * - Daily, weekly, monthly volume trends
 * - Per-exercise volume history
 * - Muscle group volume breakdown
 * - 1RM progression charts
 */

import { FastifyPluginAsync } from 'fastify';
import { authenticate } from './auth';
import { db } from '../../db/client';

const volumeStatsRoutes: FastifyPluginAsync = async (fastify) => {
  // Get daily volume for last N days
  fastify.get(
    '/volume/daily',
    { preHandler: authenticate },
    async (request, reply) => {
      const userId = (request as any).userId;
      const { days = 30 } = request.query as { days?: number };

      // Validate and sanitize days parameter to prevent SQL injection
      const validatedDays = Math.max(1, Math.min(365, Math.floor(Number(days) || 30)));

      const data = await db.queryAll(
        `SELECT
          DATE(performed_at) as date,
          COALESCE(SUM(weight * reps), 0) as total_volume,
          COALESCE(SUM(reps), 0) as total_reps,
          COUNT(*) as total_sets,
          COUNT(DISTINCT exercise_id) as exercises
         FROM workout_sets
         WHERE user_id = $1 AND tag != 'warmup'
           AND performed_at >= CURRENT_DATE - INTERVAL '1 day' * $2
         GROUP BY DATE(performed_at)
         ORDER BY DATE(performed_at) ASC`,
        [userId, validatedDays]
      );

      return reply.send({ data });
    }
  );

  // Get weekly volume
  fastify.get(
    '/volume/weekly',
    { preHandler: authenticate },
    async (request, reply) => {
      const userId = (request as any).userId;
      const { weeks = 12 } = request.query as { weeks?: number };

      // Validate and sanitize weeks parameter to prevent SQL injection
      const validatedWeeks = Math.max(1, Math.min(52, Math.floor(Number(weeks) || 12)));

      const data = await db.queryAll(
        `SELECT
          DATE_TRUNC('week', performed_at) as week_start,
          COALESCE(SUM(weight * reps), 0) as total_volume,
          COALESCE(SUM(reps), 0) as total_reps,
          COUNT(*) as total_sets,
          COUNT(DISTINCT exercise_id) as exercises,
          COUNT(DISTINCT DATE(performed_at)) as workout_days
         FROM workout_sets
         WHERE user_id = $1 AND tag != 'warmup'
           AND performed_at >= CURRENT_DATE - INTERVAL '1 week' * $2
         GROUP BY DATE_TRUNC('week', performed_at)
         ORDER BY DATE_TRUNC('week', performed_at) ASC`,
        [userId, validatedWeeks]
      );

      return reply.send({ data });
    }
  );

  // Get volume by exercise
  fastify.get(
    '/volume/exercise/:exerciseId',
    { preHandler: authenticate },
    async (request, reply) => {
      const userId = (request as any).userId;
      const { exerciseId } = request.params as { exerciseId: string };
      const { days = 90 } = request.query as { days?: number };

      // Validate and sanitize days parameter to prevent SQL injection
      const validatedDays = Math.max(1, Math.min(365, Math.floor(Number(days) || 90)));

      const data = await db.queryAll(
        `SELECT
          DATE(performed_at) as date,
          COALESCE(SUM(weight * reps), 0) as total_volume,
          MAX(weight) as max_weight,
          MAX(estimated_1rm) as best_1rm,
          COALESCE(SUM(reps), 0) as total_reps,
          COUNT(*) as total_sets
         FROM workout_sets
         WHERE user_id = $1 AND exercise_id = $2 AND tag != 'warmup'
           AND performed_at >= CURRENT_DATE - INTERVAL '1 day' * $3
         GROUP BY DATE(performed_at)
         ORDER BY DATE(performed_at) ASC`,
        [userId, exerciseId, validatedDays]
      );

      // Get PRs for this exercise
      const prs = await db.queryOne(
        `SELECT * FROM exercise_personal_records
         WHERE user_id = $1 AND exercise_id = $2`,
        [userId, exerciseId]
      );

      return reply.send({ data, prs });
    }
  );

  // Get 1RM progression for an exercise
  fastify.get(
    '/volume/1rm/:exerciseId',
    { preHandler: authenticate },
    async (request, reply) => {
      const userId = (request as any).userId;
      const { exerciseId } = request.params as { exerciseId: string };
      const { days = 180 } = request.query as { days?: number };

      // Validate and sanitize days parameter to prevent SQL injection
      const validatedDays = Math.max(1, Math.min(365, Math.floor(Number(days) || 180)));

      const data = await db.queryAll<{ date: string; estimated_1rm: number; max_weight: number }>(
        `SELECT
          DATE(performed_at) as date,
          MAX(estimated_1rm) as estimated_1rm,
          MAX(weight) as max_weight
         FROM workout_sets
         WHERE user_id = $1 AND exercise_id = $2 AND tag != 'warmup'
           AND estimated_1rm IS NOT NULL
           AND performed_at >= CURRENT_DATE - INTERVAL '1 day' * $3
         GROUP BY DATE(performed_at)
         ORDER BY DATE(performed_at) ASC`,
        [userId, exerciseId, validatedDays]
      );

      // Calculate improvement
      if (data.length >= 2) {
        const first = data[0].estimated_1rm;
        const last = data[data.length - 1].estimated_1rm;
        const improvement = {
          absolute: last - first,
          percentage: ((last - first) / first * 100).toFixed(1),
        };
        return reply.send({ data, improvement });
      }

      return reply.send({ data, improvement: null });
    }
  );

  // Get volume by muscle group
  fastify.get(
    '/volume/muscles',
    { preHandler: authenticate },
    async (request, reply) => {
      const userId = (request as any).userId;
      const { days = 7 } = request.query as { days?: number };

      // Validate and sanitize days parameter to prevent SQL injection
      const validatedDays = Math.max(1, Math.min(365, Math.floor(Number(days) || 7)));

      const data = await db.queryAll(
        `SELECT
          e.primary_muscle as muscle,
          COALESCE(SUM(ws.weight * ws.reps), 0) as total_volume,
          COUNT(*) as total_sets
         FROM workout_sets ws
         JOIN exercises e ON ws.exercise_id = e.id
         WHERE ws.user_id = $1 AND ws.tag != 'warmup'
           AND ws.performed_at >= CURRENT_DATE - INTERVAL '1 day' * $2
         GROUP BY e.primary_muscle
         ORDER BY SUM(ws.weight * ws.reps) DESC`,
        [userId, validatedDays]
      );

      return reply.send({ data });
    }
  );

  // Get weekly muscle volume for balance analysis
  fastify.get(
    '/volume/muscles/weekly',
    { preHandler: authenticate },
    async (request, reply) => {
      const userId = (request as any).userId;
      const { weeks = 4 } = request.query as { weeks?: number };

      // Validate and sanitize weeks parameter to prevent SQL injection
      const validatedWeeks = Math.max(1, Math.min(52, Math.floor(Number(weeks) || 4)));

      const data = await db.queryAll(
        `SELECT
          DATE_TRUNC('week', ws.performed_at) as week_start,
          e.primary_muscle as muscle,
          COALESCE(SUM(ws.weight * ws.reps), 0) as total_volume,
          COUNT(*) as total_sets
         FROM workout_sets ws
         JOIN exercises e ON ws.exercise_id = e.id
         WHERE ws.user_id = $1 AND ws.tag != 'warmup'
           AND ws.performed_at >= CURRENT_DATE - INTERVAL '1 week' * $2
         GROUP BY DATE_TRUNC('week', ws.performed_at), e.primary_muscle
         ORDER BY DATE_TRUNC('week', ws.performed_at) ASC`,
        [userId, validatedWeeks]
      );

      return reply.send({ data });
    }
  );

  // Get PR summary for all exercises
  fastify.get(
    '/volume/prs',
    { preHandler: authenticate },
    async (request, reply) => {
      const userId = (request as any).userId;
      const { limit = 20 } = request.query as { limit?: number };

      // Get all PRs for user
      const prs = await db.queryAll(
        `SELECT
          pr.exercise_id,
          e.name as exercise_name,
          pr.record_type,
          pr.value,
          pr.achieved_at
         FROM exercise_personal_records pr
         JOIN exercises e ON pr.exercise_id = e.id
         WHERE pr.user_id = $1
         ORDER BY pr.achieved_at DESC
         LIMIT $2`,
        [userId, limit]
      );

      // Get recent PRs from this week
      const recentPrs = await db.queryAll(
        `SELECT
          exercise_id,
          MAX(weight) as max_weight,
          MAX(estimated_1rm) as best_1rm,
          MAX(weight * reps) as best_volume
         FROM workout_sets
         WHERE user_id = $1 AND tag != 'warmup'
           AND (is_pr_weight = true OR is_pr_1rm = true OR is_pr_volume = true)
           AND performed_at >= CURRENT_DATE - INTERVAL '7 days'
         GROUP BY exercise_id`,
        [userId]
      );

      return reply.send({
        allTimePrs: prs,
        recentPrs,
        recentPrCount: recentPrs.length,
      });
    }
  );

  // Get workout summary stats
  fastify.get(
    '/volume/summary',
    { preHandler: authenticate },
    async (request, reply) => {
      const userId = (request as any).userId;

      // All-time stats
      const allTime = await db.queryOne<{
        total_volume: number;
        total_reps: number;
        total_sets: number;
        unique_exercises: number;
        workout_days: number;
        max_weight_ever: number;
        best_1rm_ever: number;
      }>(
        `SELECT
          COALESCE(SUM(weight * reps), 0) as total_volume,
          COALESCE(SUM(reps), 0) as total_reps,
          COUNT(*) as total_sets,
          COUNT(DISTINCT exercise_id) as unique_exercises,
          COUNT(DISTINCT DATE(performed_at)) as workout_days,
          MAX(weight) as max_weight_ever,
          MAX(estimated_1rm) as best_1rm_ever
         FROM workout_sets
         WHERE user_id = $1 AND tag != 'warmup'`,
        [userId]
      );

      // This week
      const thisWeek = await db.queryOne<{
        total_volume: number;
        total_reps: number;
        total_sets: number;
      }>(
        `SELECT
          COALESCE(SUM(weight * reps), 0) as total_volume,
          COALESCE(SUM(reps), 0) as total_reps,
          COUNT(*) as total_sets
         FROM workout_sets
         WHERE user_id = $1 AND tag != 'warmup'
           AND performed_at >= DATE_TRUNC('week', CURRENT_DATE)`,
        [userId]
      );

      // Last week (for comparison)
      const lastWeek = await db.queryOne<{
        total_volume: number;
        total_reps: number;
        total_sets: number;
      }>(
        `SELECT
          COALESCE(SUM(weight * reps), 0) as total_volume,
          COALESCE(SUM(reps), 0) as total_reps,
          COUNT(*) as total_sets
         FROM workout_sets
         WHERE user_id = $1 AND tag != 'warmup'
           AND performed_at >= DATE_TRUNC('week', CURRENT_DATE) - INTERVAL '1 week'
           AND performed_at < DATE_TRUNC('week', CURRENT_DATE)`,
        [userId]
      );

      // Calculate week-over-week change
      const weekChange = lastWeek?.total_volume ? {
        volume: ((thisWeek?.total_volume || 0) - (lastWeek?.total_volume || 0)),
        volumePercent: (((thisWeek?.total_volume || 0) - (lastWeek?.total_volume || 0)) / lastWeek.total_volume * 100).toFixed(1),
      } : null;

      return reply.send({
        allTime,
        thisWeek,
        lastWeek,
        weekChange,
      });
    }
  );
};

export default volumeStatsRoutes;
