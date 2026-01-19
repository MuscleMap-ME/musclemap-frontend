/**
 * Workout Sessions Routes (Fastify)
 *
 * Handles active workout session persistence for recovery after:
 * - Browser refresh/crash
 * - Server restart
 * - Device switching
 * - App crashes
 *
 * Sessions are stored server-side and synced periodically from the client.
 * Client also maintains IndexedDB copy for instant recovery.
 */

import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { authenticate } from './auth';
import { queryOne, queryAll, query } from '../../db/client';
import { loggers } from '../../lib/logger';

const log = loggers.api;

// ============================================
// SCHEMAS
// ============================================

const workoutSetSchema = z.object({
  id: z.string(),
  exerciseId: z.string(),
  exerciseName: z.string().optional(),
  weight: z.number().min(0).default(0),
  reps: z.number().int().min(0).default(0),
  rpe: z.number().int().min(1).max(10).nullable().optional(),
  rir: z.number().int().min(0).max(10).nullable().optional(),
  tag: z.enum(['warmup', 'working', 'failure', 'drop', 'cluster', 'amrap']).default('working'),
  notes: z.string().max(500).optional(),
  estimated1RM: z.number().nullable().optional(),
  timestamp: z.number(),
  isGroupSet: z.boolean().optional(),
  groupId: z.string().optional(),
  groupType: z.string().optional(),
});

const sessionPRSchema = z.object({
  type: z.enum(['weight', '1rm', 'volume']),
  exerciseId: z.string(),
  exerciseName: z.string().optional(),
  value: z.number(),
  previous: z.number(),
});

const exerciseGroupSchema = z.object({
  id: z.string(),
  groupType: z.enum(['superset', 'giant_set', 'circuit', 'drop_set', 'cluster']),
  exercises: z.array(z.object({
    exerciseId: z.string(),
    targetSets: z.number().optional(),
    targetReps: z.number().optional(),
  })),
  circuitRounds: z.number().optional(),
  restBetweenExercises: z.number().optional(),
  restBetweenRounds: z.number().optional(),
});

const saveSessionSchema = z.object({
  sessionId: z.string(),
  startedAt: z.number(), // Unix timestamp ms
  pausedAt: z.number().nullable().optional(),
  totalPausedTime: z.number().default(0),

  // Workout plan
  workoutPlan: z.object({
    exercises: z.array(z.object({
      id: z.string(),
      name: z.string(),
      primaryMuscles: z.array(z.string()).optional(),
      secondaryMuscles: z.array(z.string()).optional(),
    })).optional(),
  }).nullable().optional(),

  // Current position
  currentExerciseIndex: z.number().default(0),
  currentSetIndex: z.number().default(0),

  // Sets (the critical data)
  sets: z.array(workoutSetSchema).default([]),

  // Metrics
  totalVolume: z.number().default(0),
  totalReps: z.number().default(0),
  estimatedCalories: z.number().default(0),
  musclesWorked: z.array(z.string()).default([]),

  // PRs
  sessionPRs: z.array(sessionPRSchema).default([]),

  // Rest timer state
  restTimer: z.object({
    remaining: z.number().nullable().optional(),
    totalDuration: z.number().nullable().optional(),
    startedAt: z.number().nullable().optional(),
  }).nullable().optional(),

  // Exercise groups
  exerciseGroups: z.array(exerciseGroupSchema).default([]),
  activeGroup: exerciseGroupSchema.nullable().optional(),
  activeGroupExerciseIndex: z.number().default(0),
  activeGroupRound: z.number().default(1),
  groupSets: z.array(workoutSetSchema).default([]),

  // Client version for conflict resolution
  clientVersion: z.number().default(1),
});

const archiveSessionSchema = z.object({
  reason: z.enum(['completed', 'abandoned', 'replaced']),
  workoutId: z.string().optional(), // If completed, the resulting workout ID
});

// ============================================
// ROUTE TYPES
// ============================================

interface SessionRow {
  id: string;
  user_id: string;
  started_at: Date;
  paused_at: Date | null;
  total_paused_time: number;
  last_activity_at: Date;
  workout_plan: unknown;
  current_exercise_index: number;
  current_set_index: number;
  sets: unknown;
  total_volume: string;
  total_reps: number;
  estimated_calories: number;
  muscles_worked: string[];
  session_prs: unknown;
  rest_timer_remaining: number | null;
  rest_timer_total_duration: number | null;
  rest_timer_started_at: Date | null;
  exercise_groups: unknown;
  active_group: unknown;
  active_group_exercise_index: number;
  active_group_round: number;
  group_sets: unknown;
  client_version: number;
  server_version: number;
  created_at: Date;
  updated_at: Date;
}

interface ArchivedSessionRow {
  id: string;
  user_id: string;
  original_session_id: string;
  session_data: unknown;
  archive_reason: string;
  started_at: Date;
  archived_at: Date;
  recovered: boolean;
  recovered_workout_id: string | null;
}

// ============================================
// HELPER FUNCTIONS
// ============================================

function sessionRowToResponse(row: SessionRow) {
  return {
    sessionId: row.id,
    userId: row.user_id,
    startedAt: new Date(row.started_at).getTime(),
    pausedAt: row.paused_at ? new Date(row.paused_at).getTime() : null,
    totalPausedTime: row.total_paused_time,
    lastActivityAt: new Date(row.last_activity_at).getTime(),
    workoutPlan: row.workout_plan,
    currentExerciseIndex: row.current_exercise_index,
    currentSetIndex: row.current_set_index,
    sets: row.sets,
    totalVolume: parseFloat(row.total_volume || '0'),
    totalReps: row.total_reps,
    estimatedCalories: row.estimated_calories,
    musclesWorked: row.muscles_worked,
    sessionPRs: row.session_prs,
    restTimer: {
      remaining: row.rest_timer_remaining,
      totalDuration: row.rest_timer_total_duration,
      startedAt: row.rest_timer_started_at ? new Date(row.rest_timer_started_at).getTime() : null,
    },
    exerciseGroups: row.exercise_groups,
    activeGroup: row.active_group,
    activeGroupExerciseIndex: row.active_group_exercise_index,
    activeGroupRound: row.active_group_round,
    groupSets: row.group_sets,
    clientVersion: row.client_version,
    serverVersion: row.server_version,
  };
}

// ============================================
// ROUTES
// ============================================

export default async function workoutSessionsRoutes(fastify: FastifyInstance): Promise<void> {
  // ----------------------------------------
  // GET /sessions/active - Get user's active session (if any)
  // ----------------------------------------
  fastify.get('/sessions/active', {
    preHandler: [authenticate],
    handler: async (request, reply) => {
      const userId = (request as unknown as { userId: string }).userId;

      const session = await queryOne<SessionRow>(
        `SELECT * FROM active_workout_sessions WHERE user_id = $1`,
        [userId]
      );

      if (!session) {
        return reply.status(404).send({
          error: 'No active session',
          message: 'No active workout session found',
        });
      }

      return reply.send({
        data: sessionRowToResponse(session),
      });
    },
  });

  // ----------------------------------------
  // POST /sessions - Save/update active session
  // ----------------------------------------
  fastify.post('/sessions', {
    preHandler: [authenticate],
    handler: async (request, reply) => {
      const userId = (request as unknown as { userId: string }).userId;
      const body = saveSessionSchema.parse(request.body);

      // Check for existing session
      const existing = await queryOne<{ id: string; server_version: number }>(
        `SELECT id, server_version FROM active_workout_sessions WHERE user_id = $1`,
        [userId]
      );

      // If existing session with different ID, archive the old one first
      if (existing && existing.id !== body.sessionId) {
        log.info(`Archiving old session ${existing.id} for user ${userId}, replacing with ${body.sessionId}`);

        // Archive old session
        await query(
          `INSERT INTO archived_workout_sessions (
            id, user_id, original_session_id, session_data, archive_reason, started_at
          )
          SELECT
            gen_random_uuid()::text,
            user_id,
            id,
            jsonb_build_object(
              'sets', sets,
              'total_volume', total_volume,
              'total_reps', total_reps,
              'estimated_calories', estimated_calories,
              'muscles_worked', muscles_worked,
              'session_prs', session_prs,
              'workout_plan', workout_plan
            ),
            'replaced',
            started_at
          FROM active_workout_sessions
          WHERE id = $1`,
          [existing.id]
        );

        // Delete old session
        await query(`DELETE FROM active_workout_sessions WHERE id = $1`, [existing.id]);
      }

      // Upsert session
      await query(
        `INSERT INTO active_workout_sessions (
          id, user_id, started_at, paused_at, total_paused_time,
          workout_plan, current_exercise_index, current_set_index,
          sets, total_volume, total_reps, estimated_calories, muscles_worked,
          session_prs, rest_timer_remaining, rest_timer_total_duration, rest_timer_started_at,
          exercise_groups, active_group, active_group_exercise_index, active_group_round, group_sets,
          client_version
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23)
        ON CONFLICT (user_id) DO UPDATE SET
          paused_at = EXCLUDED.paused_at,
          total_paused_time = EXCLUDED.total_paused_time,
          workout_plan = EXCLUDED.workout_plan,
          current_exercise_index = EXCLUDED.current_exercise_index,
          current_set_index = EXCLUDED.current_set_index,
          sets = EXCLUDED.sets,
          total_volume = EXCLUDED.total_volume,
          total_reps = EXCLUDED.total_reps,
          estimated_calories = EXCLUDED.estimated_calories,
          muscles_worked = EXCLUDED.muscles_worked,
          session_prs = EXCLUDED.session_prs,
          rest_timer_remaining = EXCLUDED.rest_timer_remaining,
          rest_timer_total_duration = EXCLUDED.rest_timer_total_duration,
          rest_timer_started_at = EXCLUDED.rest_timer_started_at,
          exercise_groups = EXCLUDED.exercise_groups,
          active_group = EXCLUDED.active_group,
          active_group_exercise_index = EXCLUDED.active_group_exercise_index,
          active_group_round = EXCLUDED.active_group_round,
          group_sets = EXCLUDED.group_sets,
          client_version = EXCLUDED.client_version`,
        [
          body.sessionId,
          userId,
          new Date(body.startedAt),
          body.pausedAt ? new Date(body.pausedAt) : null,
          body.totalPausedTime,
          JSON.stringify(body.workoutPlan),
          body.currentExerciseIndex,
          body.currentSetIndex,
          JSON.stringify(body.sets),
          body.totalVolume,
          body.totalReps,
          body.estimatedCalories,
          JSON.stringify(body.musclesWorked),
          JSON.stringify(body.sessionPRs),
          body.restTimer?.remaining ?? null,
          body.restTimer?.totalDuration ?? null,
          body.restTimer?.startedAt ? new Date(body.restTimer.startedAt) : null,
          JSON.stringify(body.exerciseGroups),
          body.activeGroup ? JSON.stringify(body.activeGroup) : null,
          body.activeGroupExerciseIndex,
          body.activeGroupRound,
          JSON.stringify(body.groupSets),
          body.clientVersion,
        ]
      );

      // Get updated session
      const session = await queryOne<SessionRow>(
        `SELECT * FROM active_workout_sessions WHERE user_id = $1`,
        [userId]
      );

      return reply.send({
        data: session ? sessionRowToResponse(session) : null,
        message: 'Session saved',
      });
    },
  });

  // ----------------------------------------
  // DELETE /sessions/active - Archive and delete active session
  // ----------------------------------------
  fastify.delete('/sessions/active', {
    preHandler: [authenticate],
    handler: async (request, reply) => {
      const userId = (request as unknown as { userId: string }).userId;
      const body = archiveSessionSchema.parse(request.body || { reason: 'abandoned' });

      // Get current session
      const session = await queryOne<SessionRow>(
        `SELECT * FROM active_workout_sessions WHERE user_id = $1`,
        [userId]
      );

      if (!session) {
        return reply.status(404).send({
          error: 'No active session',
          message: 'No active workout session to delete',
        });
      }

      // Archive the session
      await query(
        `INSERT INTO archived_workout_sessions (
          id, user_id, original_session_id, session_data,
          archive_reason, started_at, recovered, recovered_workout_id
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          `archived_${Date.now()}`,
          userId,
          session.id,
          JSON.stringify({
            sets: session.sets,
            totalVolume: session.total_volume,
            totalReps: session.total_reps,
            estimatedCalories: session.estimated_calories,
            musclesWorked: session.muscles_worked,
            sessionPRs: session.session_prs,
            workoutPlan: session.workout_plan,
          }),
          body.reason,
          session.started_at,
          body.reason === 'completed',
          body.workoutId || null,
        ]
      );

      // Delete the active session
      await query(`DELETE FROM active_workout_sessions WHERE user_id = $1`, [userId]);

      return reply.send({
        message: 'Session archived',
        data: {
          archived: true,
          reason: body.reason,
          sessionId: session.id,
        },
      });
    },
  });

  // ----------------------------------------
  // GET /sessions/archived - Get user's archived sessions (for recovery)
  // ----------------------------------------
  fastify.get('/sessions/archived', {
    preHandler: [authenticate],
    handler: async (request, reply) => {
      const userId = (request as unknown as { userId: string }).userId;
      const { recoverable } = request.query as { recoverable?: string };

      let sessions: ArchivedSessionRow[];

      if (recoverable === 'true') {
        // Only get unrecovered sessions from last 7 days
        sessions = await queryAll<ArchivedSessionRow>(
          `SELECT * FROM archived_workout_sessions
           WHERE user_id = $1
             AND recovered = false
             AND archived_at > NOW() - INTERVAL '7 days'
           ORDER BY archived_at DESC
           LIMIT 10`,
          [userId]
        );
      } else {
        // Get all archived sessions
        sessions = await queryAll<ArchivedSessionRow>(
          `SELECT * FROM archived_workout_sessions
           WHERE user_id = $1
           ORDER BY archived_at DESC
           LIMIT 50`,
          [userId]
        );
      }

      return reply.send({
        data: sessions.map(s => ({
          id: s.id,
          originalSessionId: s.original_session_id,
          sessionData: s.session_data,
          archiveReason: s.archive_reason,
          startedAt: new Date(s.started_at).getTime(),
          archivedAt: new Date(s.archived_at).getTime(),
          recovered: s.recovered,
          recoveredWorkoutId: s.recovered_workout_id,
        })),
      });
    },
  });

  // ----------------------------------------
  // POST /sessions/archived/:id/recover - Mark archived session as recovered
  // ----------------------------------------
  fastify.post('/sessions/archived/:id/recover', {
    preHandler: [authenticate],
    handler: async (request, reply) => {
      const userId = (request as unknown as { userId: string }).userId;
      const { id } = request.params as { id: string };
      const { workoutId } = request.body as { workoutId?: string };

      const result = await query(
        `UPDATE archived_workout_sessions
         SET recovered = true, recovered_workout_id = $1
         WHERE id = $2 AND user_id = $3 AND recovered = false`,
        [workoutId || null, id, userId]
      );

      if (result.rowCount === 0) {
        return reply.status(404).send({
          error: 'Not found',
          message: 'Archived session not found or already recovered',
        });
      }

      return reply.send({
        message: 'Session marked as recovered',
        data: { recovered: true },
      });
    },
  });

  // ----------------------------------------
  // GET /sessions/status - Quick check if user has active session
  // ----------------------------------------
  fastify.get('/sessions/status', {
    preHandler: [authenticate],
    handler: async (request, reply) => {
      const userId = (request as unknown as { userId: string }).userId;

      const session = await queryOne<{ id: string; started_at: Date; sets: unknown[] }>(
        `SELECT id, started_at, sets FROM active_workout_sessions WHERE user_id = $1`,
        [userId]
      );

      if (!session) {
        return reply.send({
          data: {
            hasActiveSession: false,
          },
        });
      }

      const sets = Array.isArray(session.sets) ? session.sets : [];

      return reply.send({
        data: {
          hasActiveSession: true,
          sessionId: session.id,
          startedAt: new Date(session.started_at).getTime(),
          setsCount: sets.length,
        },
      });
    },
  });
}
