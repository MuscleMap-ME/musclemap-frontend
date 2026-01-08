/**
 * Career Readiness Routes (Fastify)
 *
 * REST endpoints for career physical standards tracking, readiness scoring,
 * and team readiness dashboards.
 */

import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { authenticate } from './auth';
import { db } from '../../db/client';
import { loggers } from '../../lib/logger';
import {
  careerService,
  CareerGoal,
  CareerGoalWithTest,
  ReadinessScore,
  PTTestWithCareer,
  TeamReadinessSummary,
} from '../../modules/career';

const log = loggers.core;

// Validation schemas
const createGoalSchema = z.object({
  ptTestId: z.string().min(1),
  targetDate: z.string().optional(),
  priority: z.enum(['primary', 'secondary']).optional(),
  agencyName: z.string().optional(),
  notes: z.string().optional(),
});

const updateGoalSchema = z.object({
  targetDate: z.string().nullable().optional(),
  priority: z.enum(['primary', 'secondary']).optional(),
  status: z.enum(['active', 'achieved', 'abandoned']).optional(),
  agencyName: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
});

const enableTeamReadinessSchema = z.object({
  ptTestId: z.string().min(1),
  requireOptIn: z.boolean().optional(),
  visibleTo: z.array(z.string()).optional(),
  showIndividualScores: z.boolean().optional(),
});

const setOptInSchema = z.object({
  optIn: z.boolean(),
  shareScore: z.boolean().optional(),
  shareAssessmentDates: z.boolean().optional(),
  shareWeakEvents: z.boolean().optional(),
});

const setRecertificationSchema = z.object({
  goalId: z.string().min(1),
  lastCertifiedAt: z.string().optional(),
  nextDueAt: z.string().min(1),
  reminderDays: z.array(z.number()).optional(),
});

export async function registerCareerRoutes(app: FastifyInstance) {
  // =============================================
  // CAREER STANDARDS (PT TESTS)
  // =============================================

  /**
   * GET /career/standards
   * List all career physical standards
   */
  app.get('/career/standards', { preHandler: authenticate }, async (request, reply) => {
    const { category, includeInactive } = request.query as {
      category?: string;
      includeInactive?: string;
    };

    const standards = await careerService.getCareerStandards({
      category,
      activeOnly: includeInactive !== 'true',
    });

    // Group by category
    const byCategory: Record<string, PTTestWithCareer[]> = {};
    for (const standard of standards) {
      const cat = standard.category || 'general';
      if (!byCategory[cat]) byCategory[cat] = [];
      byCategory[cat].push(standard);
    }

    return reply.send({
      data: {
        standards,
        byCategory,
        total: standards.length,
      },
    });
  });

  /**
   * GET /career/standards/categories
   * Get categories with counts
   */
  app.get('/career/standards/categories', { preHandler: authenticate }, async (request, reply) => {
    const categories = await careerService.getCareerCategories();

    const categoryLabels: Record<string, string> = {
      military: 'Military',
      firefighter: 'Firefighter',
      law_enforcement: 'Law Enforcement',
      special_operations: 'Special Operations',
      civil_service: 'Civil Service',
      general: 'General Fitness',
    };

    return reply.send({
      data: {
        categories: categories.map(c => ({
          ...c,
          label: categoryLabels[c.category] || c.category,
        })),
      },
    });
  });

  /**
   * GET /career/standards/:id
   * Get a specific career standard with details
   */
  app.get('/career/standards/:id', { preHandler: authenticate }, async (request, reply) => {
    const { id } = request.params as { id: string };

    const standard = await careerService.getCareerStandard(id);

    if (!standard) {
      return reply.status(404).send({
        error: { code: 'NOT_FOUND', message: 'Career standard not found', statusCode: 404 },
      });
    }

    return reply.send({ data: { standard } });
  });

  // =============================================
  // USER CAREER GOALS
  // =============================================

  /**
   * GET /career/goals
   * Get user's career goals
   */
  app.get('/career/goals', { preHandler: authenticate }, async (request, reply) => {
    const userId = request.user!.userId;

    const goals = await careerService.getUserCareerGoals(userId);

    return reply.send({
      data: {
        goals,
        total: goals.length,
        primary: goals.find(g => g.priority === 'primary' && g.status === 'active'),
      },
    });
  });

  /**
   * POST /career/goals
   * Create a new career goal
   */
  app.post('/career/goals', { preHandler: authenticate }, async (request, reply) => {
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

    try {
      const data = parsed.data as z.infer<typeof createGoalSchema>;
      const goal = await careerService.createCareerGoal(userId, {
        ptTestId: data.ptTestId,
        targetDate: data.targetDate,
        priority: data.priority,
        agencyName: data.agencyName,
        notes: data.notes,
      });

      log.info({ userId, goalId: goal.id, ptTestId: data.ptTestId }, 'Career goal created');

      return reply.status(201).send({
        data: { goal },
        message: 'Career goal created successfully',
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to create goal';
      return reply.status(400).send({
        error: { code: 'CREATE_FAILED', message, statusCode: 400 },
      });
    }
  });

  /**
   * PUT /career/goals/:id
   * Update a career goal
   */
  app.put('/career/goals/:id', { preHandler: authenticate }, async (request, reply) => {
    const userId = request.user!.userId;
    const { id } = request.params as { id: string };
    const parsed = updateGoalSchema.safeParse(request.body);

    if (!parsed.success) {
      return reply.status(400).send({
        error: {
          code: 'VALIDATION',
          message: 'Invalid update data',
          details: parsed.error.errors,
          statusCode: 400,
        },
      });
    }

    const goal = await careerService.updateCareerGoal(userId, id, parsed.data);

    if (!goal) {
      return reply.status(404).send({
        error: { code: 'NOT_FOUND', message: 'Career goal not found', statusCode: 404 },
      });
    }

    return reply.send({
      data: { goal },
      message: 'Career goal updated successfully',
    });
  });

  /**
   * DELETE /career/goals/:id
   * Delete a career goal
   */
  app.delete('/career/goals/:id', { preHandler: authenticate }, async (request, reply) => {
    const userId = request.user!.userId;
    const { id } = request.params as { id: string };

    const deleted = await careerService.deleteCareerGoal(userId, id);

    if (!deleted) {
      return reply.status(404).send({
        error: { code: 'NOT_FOUND', message: 'Career goal not found', statusCode: 404 },
      });
    }

    return reply.send({ message: 'Career goal deleted successfully' });
  });

  // =============================================
  // READINESS
  // =============================================

  /**
   * GET /career/readiness
   * Get readiness for all user goals
   */
  app.get('/career/readiness', { preHandler: authenticate }, async (request, reply) => {
    const userId = request.user!.userId;

    const readiness = await careerService.getAllReadiness(userId);

    // Calculate overall readiness
    const activeGoals = readiness.filter(r => r.goal.status === 'active');
    const primaryGoal = activeGoals.find(r => r.goal.priority === 'primary');

    return reply.send({
      data: {
        readiness,
        summary: {
          totalGoals: readiness.length,
          activeGoals: activeGoals.length,
          primaryReadiness: primaryGoal?.readinessScore ?? null,
          primaryStatus: primaryGoal?.status ?? 'no_data',
        },
      },
    });
  });

  /**
   * GET /career/readiness/:goalId
   * Get readiness for a specific goal
   */
  app.get('/career/readiness/:goalId', { preHandler: authenticate }, async (request, reply) => {
    const userId = request.user!.userId;
    const { goalId } = request.params as { goalId: string };

    const readiness = await careerService.getReadiness(userId, goalId);

    // Get days remaining if target date exists
    const goals = await careerService.getUserCareerGoals(userId);
    const goal = goals.find(g => g.id === goalId);

    let daysRemaining: number | null = null;
    if (goal?.targetDate) {
      const target = new Date(goal.targetDate);
      const now = new Date();
      daysRemaining = Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    }

    return reply.send({
      data: {
        readiness,
        goal,
        daysRemaining,
      },
    });
  });

  /**
   * POST /career/readiness/:goalId/refresh
   * Force recalculate readiness
   */
  app.post('/career/readiness/:goalId/refresh', { preHandler: authenticate }, async (request, reply) => {
    const userId = request.user!.userId;
    const { goalId } = request.params as { goalId: string };

    const readiness = await careerService.calculateReadiness(userId, goalId);

    return reply.send({
      data: { readiness },
      message: 'Readiness recalculated',
    });
  });

  // =============================================
  // EXERCISE RECOMMENDATIONS
  // =============================================

  /**
   * GET /career/goals/:goalId/exercises
   * Get exercise recommendations for weak events
   */
  app.get('/career/goals/:goalId/exercises', { preHandler: authenticate }, async (request, reply) => {
    const userId = request.user!.userId;
    const { goalId } = request.params as { goalId: string };

    const exercises = await careerService.getExercisesForWeakEvents(goalId, userId);

    return reply.send({
      data: {
        exercises,
        total: exercises.length,
      },
    });
  });

  // =============================================
  // TEAM READINESS
  // =============================================

  /**
   * GET /career/team/:hangoutId
   * Get team readiness for a hangout
   */
  app.get('/career/team/:hangoutId', { preHandler: authenticate }, async (request, reply) => {
    const userId = request.user!.userId;
    const { hangoutId } = request.params as { hangoutId: string };

    // Check user is member of hangout
    const membership = await db.queryOne<{ role: string }>(
      `SELECT role FROM hangout_members WHERE hangout_id = $1 AND user_id = $2`,
      [hangoutId, userId]
    );

    if (!membership) {
      return reply.status(403).send({
        error: { code: 'FORBIDDEN', message: 'Not a member of this hangout', statusCode: 403 },
      });
    }

    const config = await careerService.getTeamReadinessConfig(hangoutId);

    if (!config) {
      return reply.send({
        data: {
          enabled: false,
          message: 'Team readiness not configured for this hangout',
        },
      });
    }

    // Check visibility permissions
    const canView = config.visibleTo.includes('all') ||
      config.visibleTo.includes(membership.role) ||
      membership.role === 'admin' ||
      membership.role === 'owner';

    if (!canView) {
      return reply.status(403).send({
        error: { code: 'FORBIDDEN', message: 'Not authorized to view team readiness', statusCode: 403 },
      });
    }

    const teamReadiness = await careerService.getTeamReadiness(hangoutId);

    return reply.send({
      data: {
        config,
        readiness: teamReadiness,
      },
    });
  });

  /**
   * POST /career/team/:hangoutId/enable
   * Enable team readiness for a hangout (admin only)
   */
  app.post('/career/team/:hangoutId/enable', { preHandler: authenticate }, async (request, reply) => {
    const userId = request.user!.userId;
    const { hangoutId } = request.params as { hangoutId: string };
    const parsed = enableTeamReadinessSchema.safeParse(request.body);

    if (!parsed.success) {
      return reply.status(400).send({
        error: {
          code: 'VALIDATION',
          message: 'Invalid configuration',
          details: parsed.error.errors,
          statusCode: 400,
        },
      });
    }

    // Check user is admin/owner
    const membership = await db.queryOne<{ role: string }>(
      `SELECT role FROM hangout_members WHERE hangout_id = $1 AND user_id = $2`,
      [hangoutId, userId]
    );

    if (!membership || !['admin', 'owner'].includes(membership.role)) {
      return reply.status(403).send({
        error: { code: 'FORBIDDEN', message: 'Only admins can enable team readiness', statusCode: 403 },
      });
    }

    const config = await careerService.enableTeamReadiness(hangoutId, parsed.data.ptTestId, {
      requireOptIn: parsed.data.requireOptIn,
      visibleTo: parsed.data.visibleTo,
      showIndividualScores: parsed.data.showIndividualScores,
    });

    log.info({ userId, hangoutId, ptTestId: parsed.data.ptTestId }, 'Team readiness enabled');

    return reply.send({
      data: { config },
      message: 'Team readiness enabled successfully',
    });
  });

  /**
   * POST /career/team/:hangoutId/opt-in
   * Opt in/out of team readiness sharing
   */
  app.post('/career/team/:hangoutId/opt-in', { preHandler: authenticate }, async (request, reply) => {
    const userId = request.user!.userId;
    const { hangoutId } = request.params as { hangoutId: string };
    const parsed = setOptInSchema.safeParse(request.body);

    if (!parsed.success) {
      return reply.status(400).send({
        error: {
          code: 'VALIDATION',
          message: 'Invalid opt-in data',
          details: parsed.error.errors,
          statusCode: 400,
        },
      });
    }

    // Check user is member
    const membership = await db.queryOne<{ role: string }>(
      `SELECT role FROM hangout_members WHERE hangout_id = $1 AND user_id = $2`,
      [hangoutId, userId]
    );

    if (!membership) {
      return reply.status(403).send({
        error: { code: 'FORBIDDEN', message: 'Not a member of this hangout', statusCode: 403 },
      });
    }

    await careerService.setTeamReadinessOptIn(hangoutId, userId, parsed.data.optIn, {
      shareScore: parsed.data.shareScore,
      shareAssessmentDates: parsed.data.shareAssessmentDates,
      shareWeakEvents: parsed.data.shareWeakEvents,
    });

    const action = parsed.data.optIn ? 'opted in to' : 'opted out of';
    log.info({ userId, hangoutId, optIn: parsed.data.optIn }, `User ${action} team readiness`);

    return reply.send({
      message: `Successfully ${action} team readiness sharing`,
    });
  });

  // =============================================
  // RECERTIFICATION
  // =============================================

  /**
   * GET /career/recertifications
   * Get user's recertification schedules
   */
  app.get('/career/recertifications', { preHandler: authenticate }, async (request, reply) => {
    const userId = request.user!.userId;

    const schedules = await careerService.getRecertificationSchedules(userId);

    // Calculate days until due and add goal info
    const goals = await careerService.getUserCareerGoals(userId);
    const goalMap = new Map(goals.map(g => [g.id, g]));

    const enrichedSchedules = schedules.map(schedule => {
      const dueDate = new Date(schedule.nextDueAt);
      const now = new Date();
      const daysUntilDue = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

      return {
        ...schedule,
        goal: goalMap.get(schedule.goalId) || null,
        daysUntilDue,
        isOverdue: daysUntilDue < 0,
        needsReminder: schedule.reminderDays.some(d => daysUntilDue === d),
      };
    });

    return reply.send({
      data: {
        schedules: enrichedSchedules,
        upcoming: enrichedSchedules.filter(s => s.daysUntilDue <= 30 && s.daysUntilDue >= 0),
        overdue: enrichedSchedules.filter(s => s.isOverdue),
      },
    });
  });

  /**
   * POST /career/recertifications
   * Set recertification schedule
   */
  app.post('/career/recertifications', { preHandler: authenticate }, async (request, reply) => {
    const userId = request.user!.userId;
    const parsed = setRecertificationSchema.safeParse(request.body);

    if (!parsed.success) {
      return reply.status(400).send({
        error: {
          code: 'VALIDATION',
          message: 'Invalid recertification data',
          details: parsed.error.errors,
          statusCode: 400,
        },
      });
    }

    // Verify goal belongs to user
    const goal = await db.queryOne<{ id: string }>(
      `SELECT id FROM user_career_goals WHERE id = $1 AND user_id = $2`,
      [parsed.data.goalId, userId]
    );

    if (!goal) {
      return reply.status(404).send({
        error: { code: 'NOT_FOUND', message: 'Career goal not found', statusCode: 404 },
      });
    }

    const schedule = await careerService.setRecertificationSchedule(userId, parsed.data.goalId, {
      lastCertifiedAt: parsed.data.lastCertifiedAt,
      nextDueAt: parsed.data.nextDueAt,
      reminderDays: parsed.data.reminderDays,
    });

    return reply.send({
      data: { schedule },
      message: 'Recertification schedule set successfully',
    });
  });
}
