/**
 * Goals Routes (Fastify)
 *
 * Manages user fitness goals with targets, progress tracking, and milestones.
 * Supports various goal types: weight loss, muscle gain, strength, endurance, etc.
 */

import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { authenticate } from './auth';
import { db } from '../../db/client';
import { loggers } from '../../lib/logger';

const log = loggers.core;

// Goal type enum
const GOAL_TYPES = [
  'weight_loss', 'weight_gain', 'muscle_gain', 'strength',
  'endurance', 'flexibility', 'general_fitness', 'body_recomposition',
  'athletic_performance', 'rehabilitation', 'maintenance'
] as const;

// Create goal schema
const createGoalSchema = z.object({
  goalType: z.enum(GOAL_TYPES),
  targetValue: z.number().optional(),
  targetUnit: z.enum(['lbs', 'kg', 'percent', 'reps', 'minutes', 'days']).optional(),
  startingValue: z.number().optional(),
  targetDate: z.string().optional(), // ISO date string
  priority: z.number().min(1).max(5).optional(),
  isPrimary: z.boolean().optional(),
  weeklyTarget: z.number().optional(),
  reminderEnabled: z.boolean().optional(),
  reminderFrequency: z.enum(['daily', 'weekly', 'none']).optional(),
  notes: z.string().optional(),
});

// Update goal schema
const updateGoalSchema = createGoalSchema.partial().extend({
  status: z.enum(['active', 'paused', 'completed', 'abandoned']).optional(),
  currentValue: z.number().optional(),
});

// Progress entry schema
const progressSchema = z.object({
  value: z.number(),
  notes: z.string().optional(),
  source: z.enum(['manual', 'workout', 'wearable', 'calculated']).optional(),
});

// Milestone schema
const milestoneSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  targetValue: z.number(),
  xpReward: z.number().optional(),
});

export interface Goal {
  id: string;
  userId: string;
  goalType: string;
  targetValue: number | null;
  targetUnit: string | null;
  startingValue: number | null;
  currentValue: number | null;
  targetDate: string | null;
  startedAt: string;
  completedAt: string | null;
  status: string;
  priority: number;
  isPrimary: boolean;
  weeklyTarget: number | null;
  reminderEnabled: boolean;
  reminderFrequency: string;
  notes: string | null;
  progress: number; // Calculated percentage
  daysRemaining: number | null;
}

export async function registerGoalsRoutes(app: FastifyInstance) {
  /**
   * GET /goals
   * Get all goals for the current user
   */
  app.get('/goals', { preHandler: authenticate }, async (request, reply) => {
    const userId = request.user!.userId;
    const { status } = request.query as { status?: string };

    let query = `
      SELECT
        id, user_id, goal_type, target_value, target_unit,
        starting_value, current_value, target_date,
        started_at, completed_at, status, priority, is_primary,
        weekly_target, reminder_enabled, reminder_frequency, notes,
        created_at, updated_at
      FROM user_goals
      WHERE user_id = $1
    `;
    const params: unknown[] = [userId];

    if (status) {
      query += ` AND status = $2`;
      params.push(status);
    }

    query += ` ORDER BY is_primary DESC, priority ASC, created_at DESC`;

    const rows = await db.queryAll<{
      id: string;
      user_id: string;
      goal_type: string;
      target_value: number | null;
      target_unit: string | null;
      starting_value: number | null;
      current_value: number | null;
      target_date: string | null;
      started_at: string;
      completed_at: string | null;
      status: string;
      priority: number;
      is_primary: boolean;
      weekly_target: number | null;
      reminder_enabled: boolean;
      reminder_frequency: string;
      notes: string | null;
    }>(query, params);

    const goals = rows.map(row => {
      // Calculate progress percentage
      let progress = 0;
      if (row.starting_value !== null && row.target_value !== null && row.current_value !== null) {
        const total = Math.abs(row.target_value - row.starting_value);
        const achieved = Math.abs(row.current_value - row.starting_value);
        progress = total > 0 ? Math.min(100, Math.round((achieved / total) * 100)) : 0;
      }

      // Calculate days remaining
      let daysRemaining: number | null = null;
      if (row.target_date) {
        const targetDate = new Date(row.target_date);
        const today = new Date();
        daysRemaining = Math.max(0, Math.ceil((targetDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)));
      }

      return {
        id: row.id,
        userId: row.user_id,
        goalType: row.goal_type,
        targetValue: row.target_value,
        targetUnit: row.target_unit,
        startingValue: row.starting_value,
        currentValue: row.current_value,
        targetDate: row.target_date,
        startedAt: row.started_at,
        completedAt: row.completed_at,
        status: row.status,
        priority: row.priority,
        isPrimary: row.is_primary,
        weeklyTarget: row.weekly_target,
        reminderEnabled: row.reminder_enabled,
        reminderFrequency: row.reminder_frequency,
        notes: row.notes,
        progress,
        daysRemaining,
      };
    });

    return reply.send({ data: { goals } });
  });

  /**
   * POST /goals
   * Create a new goal
   */
  app.post('/goals', { preHandler: authenticate }, async (request, reply) => {
    const userId = request.user!.userId;
    const parsed = createGoalSchema.safeParse(request.body);

    if (!parsed.success) {
      return reply.status(400).send({
        error: {
          code: 'VALIDATION',
          message: 'Invalid goal data',
          details: parsed.error.errors,
          statusCode: 400,
        },
      });
    }

    const data = parsed.data;

    // If this is marked as primary, unset other primary goals
    if (data.isPrimary) {
      await db.query(`UPDATE user_goals SET is_primary = FALSE WHERE user_id = $1`, [userId]);
    }

    const result = await db.queryOne<{ id: string }>(
      `INSERT INTO user_goals (
        user_id, goal_type, target_value, target_unit,
        starting_value, current_value, target_date,
        priority, is_primary, weekly_target,
        reminder_enabled, reminder_frequency, notes
      ) VALUES ($1, $2, $3, $4, $5, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING id`,
      [
        userId,
        data.goalType,
        data.targetValue ?? null,
        data.targetUnit ?? null,
        data.startingValue ?? null,
        data.targetDate ?? null,
        data.priority ?? 1,
        data.isPrimary ?? false,
        data.weeklyTarget ?? null,
        data.reminderEnabled ?? true,
        data.reminderFrequency ?? 'daily',
        data.notes ?? null,
      ]
    );

    log.info({ userId, goalId: result?.id, goalType: data.goalType }, 'Goal created');

    return reply.status(201).send({
      data: { id: result?.id },
      message: 'Goal created successfully',
    });
  });

  /**
   * GET /goals/:id
   * Get a specific goal with progress history
   */
  app.get('/goals/:id', { preHandler: authenticate }, async (request, reply) => {
    const userId = request.user!.userId;
    const { id } = request.params as { id: string };

    const goal = await db.queryOne<{
      id: string;
      user_id: string;
      goal_type: string;
      target_value: number | null;
      target_unit: string | null;
      starting_value: number | null;
      current_value: number | null;
      target_date: string | null;
      started_at: string;
      completed_at: string | null;
      status: string;
      priority: number;
      is_primary: boolean;
      weekly_target: number | null;
      reminder_enabled: boolean;
      reminder_frequency: string;
      notes: string | null;
    }>(
      `SELECT * FROM user_goals WHERE id = $1 AND user_id = $2`,
      [id, userId]
    );

    if (!goal) {
      return reply.status(404).send({
        error: { code: 'NOT_FOUND', message: 'Goal not found', statusCode: 404 },
      });
    }

    // Get progress history
    const progressHistory = await db.queryAll<{
      id: string;
      date: string;
      value: number;
      delta: number | null;
      source: string;
      notes: string | null;
    }>(
      `SELECT id, date, value, delta, source, notes
       FROM goal_progress
       WHERE goal_id = $1
       ORDER BY date DESC
       LIMIT 30`,
      [id]
    );

    // Get milestones
    const milestones = await db.queryAll<{
      id: string;
      title: string;
      description: string | null;
      target_value: number;
      is_achieved: boolean;
      achieved_at: string | null;
      xp_reward: number;
    }>(
      `SELECT id, title, description, target_value, is_achieved, achieved_at, xp_reward
       FROM goal_milestones
       WHERE goal_id = $1
       ORDER BY target_value ASC`,
      [id]
    );

    return reply.send({
      data: {
        goal: {
          id: goal.id,
          goalType: goal.goal_type,
          targetValue: goal.target_value,
          targetUnit: goal.target_unit,
          startingValue: goal.starting_value,
          currentValue: goal.current_value,
          targetDate: goal.target_date,
          startedAt: goal.started_at,
          completedAt: goal.completed_at,
          status: goal.status,
          priority: goal.priority,
          isPrimary: goal.is_primary,
          weeklyTarget: goal.weekly_target,
          reminderEnabled: goal.reminder_enabled,
          reminderFrequency: goal.reminder_frequency,
          notes: goal.notes,
        },
        progressHistory: progressHistory.map(p => ({
          id: p.id,
          date: p.date,
          value: p.value,
          delta: p.delta,
          source: p.source,
          notes: p.notes,
        })),
        milestones: milestones.map(m => ({
          id: m.id,
          title: m.title,
          description: m.description,
          targetValue: m.target_value,
          isAchieved: m.is_achieved,
          achievedAt: m.achieved_at,
          xpReward: m.xp_reward,
        })),
      },
    });
  });

  /**
   * PUT /goals/:id
   * Update a goal
   */
  app.put('/goals/:id', { preHandler: authenticate }, async (request, reply) => {
    const userId = request.user!.userId;
    const { id } = request.params as { id: string };
    const parsed = updateGoalSchema.safeParse(request.body);

    if (!parsed.success) {
      return reply.status(400).send({
        error: {
          code: 'VALIDATION',
          message: 'Invalid goal data',
          details: parsed.error.errors,
          statusCode: 400,
        },
      });
    }

    // Verify ownership
    const existing = await db.queryOne<{ id: string }>(
      `SELECT id FROM user_goals WHERE id = $1 AND user_id = $2`,
      [id, userId]
    );

    if (!existing) {
      return reply.status(404).send({
        error: { code: 'NOT_FOUND', message: 'Goal not found', statusCode: 404 },
      });
    }

    const data = parsed.data;

    // If marking as primary, unset others
    if (data.isPrimary) {
      await db.query(`UPDATE user_goals SET is_primary = FALSE WHERE user_id = $1 AND id != $2`, [userId, id]);
    }

    // Build update query dynamically
    const updates: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    const fieldMappings: Record<string, string> = {
      goalType: 'goal_type',
      targetValue: 'target_value',
      targetUnit: 'target_unit',
      startingValue: 'starting_value',
      currentValue: 'current_value',
      targetDate: 'target_date',
      status: 'status',
      priority: 'priority',
      isPrimary: 'is_primary',
      weeklyTarget: 'weekly_target',
      reminderEnabled: 'reminder_enabled',
      reminderFrequency: 'reminder_frequency',
      notes: 'notes',
    };

    for (const [key, dbColumn] of Object.entries(fieldMappings)) {
      const value = (data as Record<string, unknown>)[key];
      if (value !== undefined) {
        updates.push(`${dbColumn} = $${paramIndex}`);
        values.push(value);
        paramIndex++;
      }
    }

    // Handle completion
    if (data.status === 'completed') {
      updates.push(`completed_at = NOW()`);
    }

    updates.push('updated_at = NOW()');

    if (updates.length > 0) {
      values.push(id, userId);
      await db.query(
        `UPDATE user_goals SET ${updates.join(', ')} WHERE id = $${paramIndex} AND user_id = $${paramIndex + 1}`,
        values
      );
    }

    log.info({ userId, goalId: id }, 'Goal updated');

    return reply.send({ message: 'Goal updated successfully' });
  });

  /**
   * DELETE /goals/:id
   * Delete a goal
   */
  app.delete('/goals/:id', { preHandler: authenticate }, async (request, reply) => {
    const userId = request.user!.userId;
    const { id } = request.params as { id: string };

    const _result = await db.query(
      `DELETE FROM user_goals WHERE id = $1 AND user_id = $2`,
      [id, userId]
    );

    log.info({ userId, goalId: id }, 'Goal deleted');

    return reply.send({ message: 'Goal deleted successfully' });
  });

  /**
   * POST /goals/:id/progress
   * Add progress entry for a goal
   */
  app.post('/goals/:id/progress', { preHandler: authenticate }, async (request, reply) => {
    const userId = request.user!.userId;
    const { id } = request.params as { id: string };
    const parsed = progressSchema.safeParse(request.body);

    if (!parsed.success) {
      return reply.status(400).send({
        error: {
          code: 'VALIDATION',
          message: 'Invalid progress data',
          details: parsed.error.errors,
          statusCode: 400,
        },
      });
    }

    // Verify goal ownership and get current value
    const goal = await db.queryOne<{ current_value: number | null }>(
      `SELECT current_value FROM user_goals WHERE id = $1 AND user_id = $2`,
      [id, userId]
    );

    if (!goal) {
      return reply.status(404).send({
        error: { code: 'NOT_FOUND', message: 'Goal not found', statusCode: 404 },
      });
    }

    const data = parsed.data;
    const delta = goal.current_value !== null ? data.value - goal.current_value : null;
    const today = new Date().toISOString().split('T')[0];

    // Upsert progress for today
    await db.query(
      `INSERT INTO goal_progress (goal_id, user_id, date, value, delta, source, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (goal_id, date)
       DO UPDATE SET value = $4, delta = $5, source = $6, notes = $7`,
      [id, userId, today, data.value, delta, data.source ?? 'manual', data.notes ?? null]
    );

    // Update goal's current value
    await db.query(
      `UPDATE user_goals SET current_value = $1, updated_at = NOW() WHERE id = $2`,
      [data.value, id]
    );

    // Check and update milestones
    const unachievedMilestones = await db.queryAll<{ id: string; target_value: number; xp_reward: number }>(
      `SELECT id, target_value, xp_reward FROM goal_milestones
       WHERE goal_id = $1 AND is_achieved = FALSE AND target_value <= $2`,
      [id, data.value]
    );

    let xpEarned = 0;
    for (const milestone of unachievedMilestones) {
      await db.query(
        `UPDATE goal_milestones SET is_achieved = TRUE, achieved_at = NOW() WHERE id = $1`,
        [milestone.id]
      );
      xpEarned += milestone.xp_reward;
    }

    // Award XP if any milestones achieved
    if (xpEarned > 0) {
      await db.query(
        `UPDATE users SET xp = xp + $1 WHERE id = $2`,
        [xpEarned, userId]
      );
    }

    log.info({ userId, goalId: id, value: data.value, milestonesAchieved: unachievedMilestones.length }, 'Goal progress recorded');

    return reply.send({
      data: {
        delta,
        milestonesAchieved: unachievedMilestones.length,
        xpEarned,
      },
      message: 'Progress recorded successfully',
    });
  });

  /**
   * POST /goals/:id/milestones
   * Add a milestone to a goal
   */
  app.post('/goals/:id/milestones', { preHandler: authenticate }, async (request, reply) => {
    const userId = request.user!.userId;
    const { id } = request.params as { id: string };
    const parsed = milestoneSchema.safeParse(request.body);

    if (!parsed.success) {
      return reply.status(400).send({
        error: {
          code: 'VALIDATION',
          message: 'Invalid milestone data',
          details: parsed.error.errors,
          statusCode: 400,
        },
      });
    }

    // Verify goal ownership
    const goal = await db.queryOne<{ id: string }>(
      `SELECT id FROM user_goals WHERE id = $1 AND user_id = $2`,
      [id, userId]
    );

    if (!goal) {
      return reply.status(404).send({
        error: { code: 'NOT_FOUND', message: 'Goal not found', statusCode: 404 },
      });
    }

    const data = parsed.data;

    const result = await db.queryOne<{ id: string }>(
      `INSERT INTO goal_milestones (goal_id, user_id, title, description, target_value, xp_reward)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id`,
      [id, userId, data.title, data.description ?? null, data.targetValue, data.xpReward ?? 50]
    );

    return reply.status(201).send({
      data: { id: result?.id },
      message: 'Milestone added successfully',
    });
  });

  /**
   * GET /goals/suggestions
   * Get goal suggestions based on user profile
   */
  app.get('/goals/suggestions', { preHandler: authenticate }, async (request, reply) => {
    const userId = request.user!.userId;

    // Get user profile for personalized suggestions
    const _profile = await db.queryOne<{
      archetype: string | null;
      weight_lbs: number | null;
      height_cm: number | null;
    }>(
      `SELECT u.archetype, pe.weight_lbs, pe.height_cm
       FROM users u
       LEFT JOIN user_profile_extended pe ON u.id = pe.user_id
       WHERE u.id = $1`,
      [userId]
    );

    // Basic suggestions based on common fitness goals
    const suggestions = [
      {
        goalType: 'weight_loss',
        title: 'Lose Weight',
        description: 'Shed pounds through consistent training and nutrition',
        suggestedTargetUnit: 'lbs',
        suggestedWeeklyTarget: 1.5,
      },
      {
        goalType: 'muscle_gain',
        title: 'Build Muscle',
        description: 'Increase lean muscle mass through progressive overload',
        suggestedTargetUnit: 'lbs',
        suggestedWeeklyTarget: 0.5,
      },
      {
        goalType: 'strength',
        title: 'Get Stronger',
        description: 'Increase your one-rep max on key lifts',
        suggestedTargetUnit: 'lbs',
      },
      {
        goalType: 'endurance',
        title: 'Improve Endurance',
        description: 'Build cardiovascular fitness and stamina',
        suggestedTargetUnit: 'minutes',
      },
      {
        goalType: 'general_fitness',
        title: 'Overall Fitness',
        description: 'Improve general health and fitness levels',
        suggestedTargetUnit: 'days',
        suggestedWeeklyTarget: 4, // workouts per week
      },
      {
        goalType: 'flexibility',
        title: 'Increase Flexibility',
        description: 'Improve range of motion and mobility',
        suggestedTargetUnit: 'percent',
      },
    ];

    return reply.send({ data: { suggestions } });
  });
}
