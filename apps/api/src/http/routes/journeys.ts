/**
 * Journeys Routes (formerly Goals)
 *
 * Manages user fitness journeys with targets, progress tracking, and milestones.
 * Journeys represent transformational goals with measurable endpoints.
 *
 * Journey types include:
 * - Weight management (loss, gain, maintenance)
 * - Strength foundations (push-ups, pull-ups, squats)
 * - Cardiovascular (running, swimming, cycling)
 * - Mobility & flexibility
 * - Rehabilitation & recovery
 * - Accessibility & adaptive
 * - Life stage specific
 * - Return to activity
 */

import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { authenticate } from './auth';
import { db } from '../../db/client';
import { loggers } from '../../lib/logger';

const log = loggers.core;

// Journey type enum - expanded from original goals
const JOURNEY_TYPES = [
  // Original goal types
  'weight_loss', 'weight_gain', 'muscle_gain', 'strength',
  'endurance', 'flexibility', 'general_fitness', 'body_recomposition',
  'athletic_performance', 'rehabilitation', 'maintenance',
  // New journey types
  'skill_acquisition', 'competition_prep', 'recovery',
] as const;

// Journey categories for hierarchical navigation
const JOURNEY_CATEGORIES = [
  'weight_management',
  'strength_foundations',
  'cardiovascular',
  'mobility_flexibility',
  'rehabilitation_recovery',
  'accessibility_adaptive',
  'life_stage',
  'return_to_activity',
] as const;

// Create journey schema
const createJourneySchema = z.object({
  journeyType: z.enum(JOURNEY_TYPES),
  category: z.enum(JOURNEY_CATEGORIES).optional(),
  subcategory: z.string().optional(),
  templateId: z.string().optional(),
  targetValue: z.number().optional(),
  targetUnit: z.enum(['lbs', 'kg', 'percent', 'reps', 'minutes', 'days', 'seconds']).optional(),
  startingValue: z.number().optional(),
  targetDate: z.string().optional(), // ISO date string
  priority: z.number().min(1).max(5).optional(),
  isPrimary: z.boolean().optional(),
  weeklyTarget: z.number().optional(),
  reminderEnabled: z.boolean().optional(),
  reminderFrequency: z.enum(['daily', 'weekly', 'none']).optional(),
  notes: z.string().optional(),
  medicalDisclaimerAccepted: z.boolean().optional(),
});

// Update journey schema
const updateJourneySchema = createJourneySchema.partial().extend({
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

export interface Journey {
  id: string;
  userId: string;
  journeyType: string;
  category?: string;
  subcategory?: string;
  templateId?: string;
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
  medicalDisclaimerAccepted: boolean;
  progress: number; // Calculated percentage
  daysRemaining: number | null;
}

export async function registerJourneysRoutes(app: FastifyInstance) {
  /**
   * GET /journeys/categories
   * Get all journey categories from database
   */
  app.get('/journeys/categories', async (request, reply) => {
    // Get top-level categories
    const topLevel = await db.queryAll<{
      id: string;
      name: string;
      description: string | null;
      icon: string | null;
      display_order: number;
      requires_medical_disclaimer: boolean;
    }>(
      `SELECT id, name, description, icon, display_order, requires_medical_disclaimer
       FROM journey_categories
       WHERE parent_category_id IS NULL AND is_active = TRUE
       ORDER BY display_order ASC`
    );

    // Get all subcategories
    const subcats = await db.queryAll<{
      id: string;
      name: string;
      parent_category_id: string;
      display_order: number;
      requires_medical_disclaimer: boolean;
    }>(
      `SELECT id, name, parent_category_id, display_order, requires_medical_disclaimer
       FROM journey_categories
       WHERE parent_category_id IS NOT NULL AND is_active = TRUE
       ORDER BY display_order ASC`
    );

    // Build category tree
    const categories = topLevel.map(cat => ({
      id: cat.id,
      name: cat.name,
      description: cat.description,
      icon: cat.icon,
      requiresMedicalDisclaimer: cat.requires_medical_disclaimer,
      subcategories: subcats
        .filter(s => s.parent_category_id === cat.id)
        .map(s => ({
          id: s.id,
          name: s.name,
          requiresMedicalDisclaimer: s.requires_medical_disclaimer,
        })),
    }));

    return reply.send({ data: { categories } });
  });

  /**
   * GET /journeys/categories/:categoryId
   * Get subcategories for a category
   */
  app.get('/journeys/categories/:categoryId', async (request, reply) => {
    const { categoryId } = request.params as { categoryId: string };

    const subcategories = await db.queryAll<{
      id: string;
      name: string;
      description: string | null;
      display_order: number;
      requires_medical_disclaimer: boolean;
    }>(
      `SELECT id, name, description, display_order, requires_medical_disclaimer
       FROM journey_categories
       WHERE parent_category_id = $1 AND is_active = TRUE
       ORDER BY display_order ASC`,
      [categoryId]
    );

    return reply.send({
      data: {
        subcategories: subcategories.map(s => ({
          id: s.id,
          name: s.name,
          description: s.description,
          requiresMedicalDisclaimer: s.requires_medical_disclaimer,
        })),
      },
    });
  });

  /**
   * GET /journeys/templates
   * Get all journey templates, optionally filtered
   */
  app.get('/journeys/templates', async (request, reply) => {
    const { category, subcategory, featured } = request.query as {
      category?: string;
      subcategory?: string;
      featured?: string;
    };

    let query = `
      SELECT
        t.id, t.name, t.description, t.category_id, t.subcategory, t.journey_type,
        t.default_target_value, t.default_target_unit, t.suggested_duration_days,
        t.suggested_weekly_target, t.requires_medical_disclaimer,
        t.requires_professional_supervision, t.difficulty_level, t.icon,
        t.is_featured, t.default_milestones,
        c.name as category_name
      FROM journey_templates t
      LEFT JOIN journey_categories c ON t.category_id = c.id
      WHERE t.is_active = TRUE
    `;
    const params: unknown[] = [];
    let paramIndex = 1;

    if (category) {
      query += ` AND t.category_id = $${paramIndex}`;
      params.push(category);
      paramIndex++;
    }

    if (subcategory) {
      query += ` AND t.subcategory = $${paramIndex}`;
      params.push(subcategory);
      paramIndex++;
    }

    if (featured === 'true') {
      query += ` AND t.is_featured = TRUE`;
    }

    query += ` ORDER BY t.display_order ASC, t.name ASC`;

    const rows = await db.queryAll<{
      id: string;
      name: string;
      description: string | null;
      category_id: string;
      subcategory: string | null;
      journey_type: string;
      default_target_value: number | null;
      default_target_unit: string | null;
      suggested_duration_days: number | null;
      suggested_weekly_target: number | null;
      requires_medical_disclaimer: boolean;
      requires_professional_supervision: boolean;
      difficulty_level: number;
      icon: string | null;
      is_featured: boolean;
      default_milestones: unknown;
      category_name: string | null;
    }>(query, params);

    const templates = rows.map(t => ({
      id: t.id,
      name: t.name,
      description: t.description,
      categoryId: t.category_id,
      categoryName: t.category_name,
      subcategory: t.subcategory,
      journeyType: t.journey_type,
      defaultTargetValue: t.default_target_value,
      defaultTargetUnit: t.default_target_unit,
      suggestedDurationDays: t.suggested_duration_days,
      suggestedWeeklyTarget: t.suggested_weekly_target,
      requiresMedicalDisclaimer: t.requires_medical_disclaimer,
      requiresProfessionalSupervision: t.requires_professional_supervision,
      difficultyLevel: t.difficulty_level,
      icon: t.icon,
      isFeatured: t.is_featured,
      defaultMilestones: t.default_milestones,
    }));

    return reply.send({ data: { templates } });
  });

  /**
   * GET /journeys/templates/:templateId
   * Get a specific journey template with full details
   */
  app.get('/journeys/templates/:templateId', async (request, reply) => {
    const { templateId } = request.params as { templateId: string };

    const template = await db.queryOne<{
      id: string;
      name: string;
      description: string | null;
      category_id: string;
      subcategory: string | null;
      journey_type: string;
      default_target_value: number | null;
      default_target_unit: string | null;
      suggested_duration_days: number | null;
      suggested_weekly_target: number | null;
      requires_medical_disclaimer: boolean;
      requires_professional_supervision: boolean;
      contraindications: string[] | null;
      precautions: string[] | null;
      medical_disclaimer_text: string | null;
      exercise_filter: unknown;
      difficulty_level: number;
      prerequisite_template_ids: string[] | null;
      icon: string | null;
      color: string | null;
      is_featured: boolean;
      default_milestones: unknown;
    }>(
      `SELECT * FROM journey_templates WHERE id = $1 AND is_active = TRUE`,
      [templateId]
    );

    if (!template) {
      return reply.status(404).send({
        error: { code: 'NOT_FOUND', message: 'Journey template not found', statusCode: 404 },
      });
    }

    return reply.send({
      data: {
        template: {
          id: template.id,
          name: template.name,
          description: template.description,
          categoryId: template.category_id,
          subcategory: template.subcategory,
          journeyType: template.journey_type,
          defaultTargetValue: template.default_target_value,
          defaultTargetUnit: template.default_target_unit,
          suggestedDurationDays: template.suggested_duration_days,
          suggestedWeeklyTarget: template.suggested_weekly_target,
          requiresMedicalDisclaimer: template.requires_medical_disclaimer,
          requiresProfessionalSupervision: template.requires_professional_supervision,
          contraindications: template.contraindications,
          precautions: template.precautions,
          medicalDisclaimerText: template.medical_disclaimer_text,
          exerciseFilter: template.exercise_filter,
          difficultyLevel: template.difficulty_level,
          prerequisiteTemplateIds: template.prerequisite_template_ids,
          icon: template.icon,
          color: template.color,
          isFeatured: template.is_featured,
          defaultMilestones: template.default_milestones,
        },
      },
    });
  });

  /**
   * POST /journeys/start
   * Start a new journey from a template
   */
  app.post('/journeys/start', { preHandler: authenticate }, async (request, reply) => {
    const userId = request.user!.userId;
    const { templateId, customizations } = request.body as {
      templateId: string;
      customizations?: {
        targetValue?: number;
        targetDate?: string;
        isPrimary?: boolean;
        notes?: string;
      };
    };

    // Get template
    const template = await db.queryOne<{
      id: string;
      name: string;
      category_id: string;
      subcategory: string | null;
      journey_type: string;
      default_target_value: number | null;
      default_target_unit: string | null;
      suggested_duration_days: number | null;
      suggested_weekly_target: number | null;
      requires_medical_disclaimer: boolean;
      default_milestones: unknown;
    }>(
      `SELECT * FROM journey_templates WHERE id = $1 AND is_active = TRUE`,
      [templateId]
    );

    if (!template) {
      return reply.status(404).send({
        error: { code: 'NOT_FOUND', message: 'Journey template not found', statusCode: 404 },
      });
    }

    // Check medical disclaimer if required
    if (template.requires_medical_disclaimer) {
      const { medicalDisclaimerAccepted } = request.body as { medicalDisclaimerAccepted?: boolean };
      if (!medicalDisclaimerAccepted) {
        return reply.status(400).send({
          error: {
            code: 'DISCLAIMER_REQUIRED',
            message: 'Medical disclaimer acknowledgment is required for this journey',
            statusCode: 400,
          },
        });
      }
    }

    // Calculate target date if not provided
    let targetDate = customizations?.targetDate;
    if (!targetDate && template.suggested_duration_days) {
      const date = new Date();
      date.setDate(date.getDate() + template.suggested_duration_days);
      targetDate = date.toISOString().split('T')[0];
    }

    // If marking as primary, unset other primary journeys
    if (customizations?.isPrimary) {
      await db.query(`UPDATE user_journeys SET is_primary = FALSE WHERE user_id = $1`, [userId]);
    }

    // Create the journey
    const result = await db.queryOne<{ id: string }>(
      `INSERT INTO user_journeys (
        user_id, journey_type, category, subcategory, template_id,
        target_value, target_unit, starting_value, current_value, target_date,
        priority, is_primary, weekly_target,
        reminder_enabled, reminder_frequency, notes,
        medical_disclaimer_accepted, medical_disclaimer_accepted_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
      RETURNING id`,
      [
        userId,
        template.journey_type,
        template.category_id,
        template.subcategory,
        template.id,
        customizations?.targetValue ?? template.default_target_value,
        template.default_target_unit,
        null, // starting_value - can be set by user
        targetDate,
        1, // priority
        customizations?.isPrimary ?? false,
        template.suggested_weekly_target,
        true, // reminder_enabled
        'daily',
        customizations?.notes ?? null,
        template.requires_medical_disclaimer,
        template.requires_medical_disclaimer ? new Date().toISOString() : null,
      ]
    );

    const journeyId = result?.id;

    // Create default milestones from template
    if (template.default_milestones && Array.isArray(template.default_milestones)) {
      for (const milestone of template.default_milestones as Array<{
        title: string;
        description?: string;
        target_value: number;
        xp_reward?: number;
      }>) {
        await db.query(
          `INSERT INTO journey_milestones (journey_id, user_id, title, description, target_value, xp_reward)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [
            journeyId,
            userId,
            milestone.title,
            milestone.description ?? null,
            milestone.target_value,
            milestone.xp_reward ?? 50,
          ]
        );
      }
    }

    log.info({ userId, journeyId, templateId }, 'Journey started from template');

    return reply.status(201).send({
      data: { id: journeyId, templateName: template.name },
      message: 'Journey started successfully',
    });
  });

  /**
   * GET /journeys/featured
   * Get featured journey templates
   */
  app.get('/journeys/featured', async (request, reply) => {
    const templates = await db.queryAll<{
      id: string;
      name: string;
      description: string | null;
      category_id: string;
      journey_type: string;
      difficulty_level: number;
      suggested_duration_days: number | null;
    }>(
      `SELECT id, name, description, category_id, journey_type, difficulty_level, suggested_duration_days
       FROM journey_templates
       WHERE is_featured = TRUE AND is_active = TRUE
       ORDER BY display_order ASC
       LIMIT 6`
    );

    return reply.send({
      data: {
        featured: templates.map(t => ({
          id: t.id,
          name: t.name,
          description: t.description,
          categoryId: t.category_id,
          journeyType: t.journey_type,
          difficultyLevel: t.difficulty_level,
          suggestedDurationDays: t.suggested_duration_days,
        })),
      },
    });
  });

  /**
   * GET /journeys
   * Get all journeys for the current user
   */
  app.get('/journeys', { preHandler: authenticate }, async (request, reply) => {
    const userId = request.user!.userId;
    const { status, category } = request.query as { status?: string; category?: string };

    let query = `
      SELECT
        id, user_id, journey_type, category, subcategory, template_id,
        target_value, target_unit, starting_value, current_value, target_date,
        started_at, completed_at, status, priority, is_primary,
        weekly_target, reminder_enabled, reminder_frequency, notes,
        medical_disclaimer_accepted, created_at, updated_at
      FROM user_journeys
      WHERE user_id = $1
    `;
    const params: unknown[] = [userId];
    let paramIndex = 2;

    if (status) {
      query += ` AND status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }

    if (category) {
      query += ` AND category = $${paramIndex}`;
      params.push(category);
      paramIndex++;
    }

    query += ` ORDER BY is_primary DESC, priority ASC, created_at DESC`;

    const rows = await db.queryAll<{
      id: string;
      user_id: string;
      journey_type: string;
      category: string | null;
      subcategory: string | null;
      template_id: string | null;
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
      medical_disclaimer_accepted: boolean;
    }>(query, params);

    const journeys = rows.map(row => {
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
        journeyType: row.journey_type,
        category: row.category,
        subcategory: row.subcategory,
        templateId: row.template_id,
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
        medicalDisclaimerAccepted: row.medical_disclaimer_accepted || false,
        progress,
        daysRemaining,
      };
    });

    return reply.send({ data: { journeys } });
  });

  /**
   * POST /journeys
   * Create a new journey
   */
  app.post('/journeys', { preHandler: authenticate }, async (request, reply) => {
    const userId = request.user!.userId;
    const parsed = createJourneySchema.safeParse(request.body);

    if (!parsed.success) {
      return reply.status(400).send({
        error: {
          code: 'VALIDATION',
          message: 'Invalid journey data',
          details: parsed.error.errors,
          statusCode: 400,
        },
      });
    }

    const data = parsed.data;

    // Check if medical disclaimer is required but not accepted
    const requiresDisclaimer = ['rehabilitation_recovery', 'accessibility_adaptive', 'life_stage'].includes(data.category || '');
    if (requiresDisclaimer && !data.medicalDisclaimerAccepted) {
      return reply.status(400).send({
        error: {
          code: 'DISCLAIMER_REQUIRED',
          message: 'Medical disclaimer acknowledgment is required for this journey type',
          statusCode: 400,
        },
      });
    }

    // If this is marked as primary, unset other primary journeys
    if (data.isPrimary) {
      await db.query(`UPDATE user_journeys SET is_primary = FALSE WHERE user_id = $1`, [userId]);
    }

    const result = await db.queryOne<{ id: string }>(
      `INSERT INTO user_journeys (
        user_id, journey_type, category, subcategory, template_id,
        target_value, target_unit, starting_value, current_value, target_date,
        priority, is_primary, weekly_target,
        reminder_enabled, reminder_frequency, notes,
        medical_disclaimer_accepted, medical_disclaimer_accepted_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
      RETURNING id`,
      [
        userId,
        data.journeyType,
        data.category ?? null,
        data.subcategory ?? null,
        data.templateId ?? null,
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
        data.medicalDisclaimerAccepted ?? false,
        data.medicalDisclaimerAccepted ? new Date().toISOString() : null,
      ]
    );

    log.info({ userId, journeyId: result?.id, journeyType: data.journeyType }, 'Journey created');

    return reply.status(201).send({
      data: { id: result?.id },
      message: 'Journey created successfully',
    });
  });

  /**
   * GET /journeys/:id
   * Get a specific journey with progress history
   */
  app.get('/journeys/:id', { preHandler: authenticate }, async (request, reply) => {
    const userId = request.user!.userId;
    const { id } = request.params as { id: string };

    const journey = await db.queryOne<{
      id: string;
      user_id: string;
      journey_type: string;
      category: string | null;
      subcategory: string | null;
      template_id: string | null;
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
      medical_disclaimer_accepted: boolean;
    }>(
      `SELECT * FROM user_journeys WHERE id = $1 AND user_id = $2`,
      [id, userId]
    );

    if (!journey) {
      return reply.status(404).send({
        error: { code: 'NOT_FOUND', message: 'Journey not found', statusCode: 404 },
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
       FROM journey_progress
       WHERE journey_id = $1
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
       FROM journey_milestones
       WHERE journey_id = $1
       ORDER BY target_value ASC`,
      [id]
    );

    return reply.send({
      data: {
        journey: {
          id: journey.id,
          journeyType: journey.journey_type,
          category: journey.category,
          subcategory: journey.subcategory,
          templateId: journey.template_id,
          targetValue: journey.target_value,
          targetUnit: journey.target_unit,
          startingValue: journey.starting_value,
          currentValue: journey.current_value,
          targetDate: journey.target_date,
          startedAt: journey.started_at,
          completedAt: journey.completed_at,
          status: journey.status,
          priority: journey.priority,
          isPrimary: journey.is_primary,
          weeklyTarget: journey.weekly_target,
          reminderEnabled: journey.reminder_enabled,
          reminderFrequency: journey.reminder_frequency,
          notes: journey.notes,
          medicalDisclaimerAccepted: journey.medical_disclaimer_accepted || false,
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
   * PUT /journeys/:id
   * Update a journey
   */
  app.put('/journeys/:id', { preHandler: authenticate }, async (request, reply) => {
    const userId = request.user!.userId;
    const { id } = request.params as { id: string };
    const parsed = updateJourneySchema.safeParse(request.body);

    if (!parsed.success) {
      return reply.status(400).send({
        error: {
          code: 'VALIDATION',
          message: 'Invalid journey data',
          details: parsed.error.errors,
          statusCode: 400,
        },
      });
    }

    // Verify ownership
    const existing = await db.queryOne<{ id: string }>(
      `SELECT id FROM user_journeys WHERE id = $1 AND user_id = $2`,
      [id, userId]
    );

    if (!existing) {
      return reply.status(404).send({
        error: { code: 'NOT_FOUND', message: 'Journey not found', statusCode: 404 },
      });
    }

    const data = parsed.data;

    // If marking as primary, unset others
    if (data.isPrimary) {
      await db.query(`UPDATE user_journeys SET is_primary = FALSE WHERE user_id = $1 AND id != $2`, [userId, id]);
    }

    // Build update query dynamically
    const updates: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    const fieldMappings: Record<string, string> = {
      journeyType: 'journey_type',
      category: 'category',
      subcategory: 'subcategory',
      templateId: 'template_id',
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
        `UPDATE user_journeys SET ${updates.join(', ')} WHERE id = $${paramIndex} AND user_id = $${paramIndex + 1}`,
        values
      );
    }

    log.info({ userId, journeyId: id }, 'Journey updated');

    return reply.send({ message: 'Journey updated successfully' });
  });

  /**
   * DELETE /journeys/:id
   * Delete a journey
   */
  app.delete('/journeys/:id', { preHandler: authenticate }, async (request, reply) => {
    const userId = request.user!.userId;
    const { id } = request.params as { id: string };

    await db.query(
      `DELETE FROM user_journeys WHERE id = $1 AND user_id = $2`,
      [id, userId]
    );

    log.info({ userId, journeyId: id }, 'Journey deleted');

    return reply.send({ message: 'Journey deleted successfully' });
  });

  /**
   * POST /journeys/:id/progress
   * Add progress entry for a journey
   */
  app.post('/journeys/:id/progress', { preHandler: authenticate }, async (request, reply) => {
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

    // Verify journey ownership and get current value
    const journey = await db.queryOne<{ current_value: number | null }>(
      `SELECT current_value FROM user_journeys WHERE id = $1 AND user_id = $2`,
      [id, userId]
    );

    if (!journey) {
      return reply.status(404).send({
        error: { code: 'NOT_FOUND', message: 'Journey not found', statusCode: 404 },
      });
    }

    const data = parsed.data;
    const delta = journey.current_value !== null ? data.value - journey.current_value : null;
    const today = new Date().toISOString().split('T')[0];

    // Upsert progress for today
    await db.query(
      `INSERT INTO journey_progress (journey_id, user_id, date, value, delta, source, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (journey_id, date)
       DO UPDATE SET value = $4, delta = $5, source = $6, notes = $7`,
      [id, userId, today, data.value, delta, data.source ?? 'manual', data.notes ?? null]
    );

    // Update journey's current value
    await db.query(
      `UPDATE user_journeys SET current_value = $1, updated_at = NOW() WHERE id = $2`,
      [data.value, id]
    );

    // Check and update milestones
    const unachievedMilestones = await db.queryAll<{ id: string; target_value: number; xp_reward: number }>(
      `SELECT id, target_value, xp_reward FROM journey_milestones
       WHERE journey_id = $1 AND is_achieved = FALSE AND target_value <= $2`,
      [id, data.value]
    );

    let xpEarned = 0;
    for (const milestone of unachievedMilestones) {
      await db.query(
        `UPDATE journey_milestones SET is_achieved = TRUE, achieved_at = NOW() WHERE id = $1`,
        [milestone.id]
      );
      xpEarned += milestone.xp_reward;
    }

    // Award XP if any milestones achieved
    if (xpEarned > 0) {
      await db.query(
        `UPDATE users SET xp = COALESCE(xp, 0) + $1 WHERE id = $2`,
        [xpEarned, userId]
      );
    }

    log.info({ userId, journeyId: id, value: data.value, milestonesAchieved: unachievedMilestones.length }, 'Journey progress recorded');

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
   * POST /journeys/:id/milestones
   * Add a milestone to a journey
   */
  app.post('/journeys/:id/milestones', { preHandler: authenticate }, async (request, reply) => {
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

    // Verify journey ownership
    const journey = await db.queryOne<{ id: string }>(
      `SELECT id FROM user_journeys WHERE id = $1 AND user_id = $2`,
      [id, userId]
    );

    if (!journey) {
      return reply.status(404).send({
        error: { code: 'NOT_FOUND', message: 'Journey not found', statusCode: 404 },
      });
    }

    const data = parsed.data;

    const result = await db.queryOne<{ id: string }>(
      `INSERT INTO journey_milestones (journey_id, user_id, title, description, target_value, xp_reward)
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
   * GET /journeys/suggestions
   * Get journey suggestions based on user profile
   */
  app.get('/journeys/suggestions', { preHandler: authenticate }, async (request, reply) => {
    const userId = request.user!.userId;

    // Get user profile for personalized suggestions
    const profile = await db.queryOne<{
      current_identity_id: string | null;
      weight_lbs: number | null;
      height_cm: number | null;
    }>(
      `SELECT u.current_identity_id, pe.weight_lbs, pe.height_cm
       FROM users u
       LEFT JOIN user_profile_extended pe ON u.id = pe.user_id
       WHERE u.id = $1`,
      [userId]
    );

    // Basic suggestions based on common fitness journeys
    const suggestions = [
      {
        journeyType: 'weight_loss',
        category: 'weight_management',
        title: 'Lose Weight',
        description: 'Shed pounds through consistent training and nutrition',
        suggestedTargetUnit: 'lbs',
        suggestedWeeklyTarget: 1.5,
      },
      {
        journeyType: 'muscle_gain',
        category: 'weight_management',
        title: 'Build Muscle',
        description: 'Increase lean muscle mass through progressive overload',
        suggestedTargetUnit: 'lbs',
        suggestedWeeklyTarget: 0.5,
      },
      {
        journeyType: 'strength',
        category: 'strength_foundations',
        title: 'Get Stronger',
        description: 'Increase your strength in key movements',
        suggestedTargetUnit: 'reps',
      },
      {
        journeyType: 'endurance',
        category: 'cardiovascular',
        title: 'Improve Endurance',
        description: 'Build cardiovascular fitness and stamina',
        suggestedTargetUnit: 'minutes',
      },
      {
        journeyType: 'general_fitness',
        category: 'return_to_activity',
        title: 'Overall Fitness',
        description: 'Improve general health and fitness levels',
        suggestedTargetUnit: 'days',
        suggestedWeeklyTarget: 4, // workouts per week
      },
      {
        journeyType: 'flexibility',
        category: 'mobility_flexibility',
        title: 'Increase Flexibility',
        description: 'Improve range of motion and mobility',
        suggestedTargetUnit: 'percent',
      },
      {
        journeyType: 'skill_acquisition',
        category: 'strength_foundations',
        title: 'Learn a New Skill',
        description: 'Master a bodyweight skill like pull-ups or handstands',
        suggestedTargetUnit: 'reps',
      },
      {
        journeyType: 'rehabilitation',
        category: 'rehabilitation_recovery',
        title: 'Recover from Injury',
        description: 'Guided rehabilitation program for injury recovery',
        suggestedTargetUnit: 'days',
        requiresMedicalDisclaimer: true,
      },
    ];

    return reply.send({ data: { suggestions } });
  });
}
