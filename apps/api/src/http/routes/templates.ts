/**
 * Workout Templates Routes (Fastify)
 *
 * Routes for managing workout templates:
 * - CRUD operations on templates
 * - Template discovery and search
 * - Rating and saving templates
 * - Template cloning/forking
 */

import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { authenticate, optionalAuth } from './auth';
import { WorkoutTemplatesService, TemplateCategory, TemplateDifficulty } from '../../services/workout-templates.service';
import { loggers } from '../../lib/logger';

const log = loggers.http;

// Schemas
const exerciseSchema = z.object({
  exerciseId: z.string().min(1),
  name: z.string().optional(),
  sets: z.number().int().min(1).max(20),
  reps: z.number().int().min(1).max(500).optional(),
  weight: z.number().min(0).max(2000).optional(),
  duration: z.number().int().min(0).optional(),
  restSeconds: z.number().int().min(0).max(600).optional(),
  notes: z.string().max(500).optional(),
});

const createTemplateSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(2000).optional(),
  exercises: z.array(exerciseSchema).min(1).max(50),
  difficulty: z.enum(['beginner', 'intermediate', 'advanced', 'elite']).optional(),
  durationMinutes: z.number().int().min(5).max(300).optional(),
  targetMuscles: z.array(z.string()).optional(),
  equipmentRequired: z.array(z.string()).optional(),
  category: z.enum(['strength', 'hypertrophy', 'endurance', 'cardio', 'mobility', 'full_body']).optional(),
  tags: z.array(z.string().max(30)).max(10).optional(),
  isPublic: z.boolean().optional(),
});

const updateTemplateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(2000).nullable().optional(),
  exercises: z.array(exerciseSchema).min(1).max(50).optional(),
  difficulty: z.enum(['beginner', 'intermediate', 'advanced', 'elite']).nullable().optional(),
  durationMinutes: z.number().int().min(5).max(300).nullable().optional(),
  targetMuscles: z.array(z.string()).optional(),
  equipmentRequired: z.array(z.string()).optional(),
  category: z.enum(['strength', 'hypertrophy', 'endurance', 'cardio', 'mobility', 'full_body']).nullable().optional(),
  tags: z.array(z.string().max(30)).max(10).optional(),
  isPublic: z.boolean().optional(),
});

const rateTemplateSchema = z.object({
  rating: z.number().int().min(1).max(5),
  review: z.string().max(1000).optional(),
});

const cloneTemplateSchema = z.object({
  newName: z.string().min(1).max(100).optional(),
});

const saveTemplateSchema = z.object({
  folder: z.string().max(50).optional(),
});

const validCategories: TemplateCategory[] = ['strength', 'hypertrophy', 'endurance', 'cardio', 'mobility', 'full_body'];
const validDifficulties: TemplateDifficulty[] = ['beginner', 'intermediate', 'advanced', 'elite'];

export async function registerTemplateRoutes(app: FastifyInstance) {
  // ============================================
  // TEMPLATE CRUD
  // ============================================

  // Create a new template
  app.post('/templates', { preHandler: authenticate }, async (request, reply) => {
    const parsed = createTemplateSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({
        error: 'Invalid request body',
        details: parsed.error.errors,
      });
    }

    const template = await WorkoutTemplatesService.create(request.user!.userId, {
      name: parsed.data.name,
      description: parsed.data.description,
      exercises: parsed.data.exercises.map((e) => ({
        exerciseId: e.exerciseId,
        name: e.name,
        sets: e.sets,
        reps: e.reps,
        weight: e.weight,
        duration: e.duration,
        restSeconds: e.restSeconds,
        notes: e.notes,
      })),
      difficulty: parsed.data.difficulty,
      durationMinutes: parsed.data.durationMinutes,
      targetMuscles: parsed.data.targetMuscles,
      equipmentRequired: parsed.data.equipmentRequired,
      category: parsed.data.category,
      tags: parsed.data.tags,
      isPublic: parsed.data.isPublic,
    });

    return reply.status(201).send({ data: template });
  });

  // Get a template by ID
  app.get('/templates/:id', { preHandler: optionalAuth }, async (request, reply) => {
    const { id } = request.params as { id: string };

    const template = await WorkoutTemplatesService.getById(id, request.user?.userId);

    return reply.send({ data: template });
  });

  // Update a template
  app.put('/templates/:id', { preHandler: authenticate }, async (request, reply) => {
    const { id } = request.params as { id: string };

    const parsed = updateTemplateSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({
        error: 'Invalid request body',
        details: parsed.error.errors,
      });
    }

    const updateInput: import('../../services/workout-templates.service').UpdateTemplateInput = {
      name: parsed.data.name,
      description: parsed.data.description ?? undefined,
      exercises: parsed.data.exercises?.map((e) => ({
        exerciseId: e.exerciseId!,
        name: e.name,
        sets: e.sets!,
        reps: e.reps,
        weight: e.weight,
        duration: e.duration,
        restSeconds: e.restSeconds,
        notes: e.notes,
      })),
      difficulty: parsed.data.difficulty ?? undefined,
      durationMinutes: parsed.data.durationMinutes ?? undefined,
      targetMuscles: parsed.data.targetMuscles,
      equipmentRequired: parsed.data.equipmentRequired,
      category: parsed.data.category ?? undefined,
      tags: parsed.data.tags,
      isPublic: parsed.data.isPublic,
    };

    const template = await WorkoutTemplatesService.update(id, request.user!.userId, updateInput);

    return reply.send({ data: template });
  });

  // Delete a template
  app.delete('/templates/:id', { preHandler: authenticate }, async (request, reply) => {
    const { id } = request.params as { id: string };

    await WorkoutTemplatesService.delete(id, request.user!.userId);

    return reply.send({ data: { deleted: true } });
  });

  // ============================================
  // USER'S TEMPLATES
  // ============================================

  // Get current user's templates
  app.get('/templates/me', { preHandler: authenticate }, async (request, reply) => {
    const query = request.query as { limit?: string; offset?: string };
    const limit = Math.min(parseInt(query.limit || '20'), 100);
    const offset = parseInt(query.offset || '0');

    const result = await WorkoutTemplatesService.getUserTemplates(request.user!.userId, {
      limit,
      offset,
    });

    return reply.send({
      data: result.templates,
      meta: { limit, offset, total: result.total },
    });
  });

  // ============================================
  // TEMPLATE DISCOVERY
  // ============================================

  // Search public templates
  app.get('/templates', { preHandler: optionalAuth }, async (request, reply) => {
    const query = request.query as {
      search?: string;
      category?: string;
      difficulty?: string;
      minRating?: string;
      targetMuscles?: string;
      equipment?: string;
      creator?: string;
      featured?: string;
      sortBy?: string;
      limit?: string;
      offset?: string;
    };

    // Validate category if provided
    if (query.category && !validCategories.includes(query.category as TemplateCategory)) {
      return reply.status(400).send({
        error: 'Invalid category',
        validCategories,
      });
    }

    // Validate difficulty if provided
    if (query.difficulty && !validDifficulties.includes(query.difficulty as TemplateDifficulty)) {
      return reply.status(400).send({
        error: 'Invalid difficulty',
        validDifficulties,
      });
    }

    const result = await WorkoutTemplatesService.search(
      {
        search: query.search,
        category: query.category as TemplateCategory,
        difficulty: query.difficulty as TemplateDifficulty,
        minRating: query.minRating ? parseFloat(query.minRating) : undefined,
        targetMuscles: query.targetMuscles ? query.targetMuscles.split(',') : undefined,
        equipment: query.equipment ? query.equipment.split(',') : undefined,
        creator: query.creator,
        featured: query.featured === 'true',
        sortBy: query.sortBy as 'popular' | 'rating' | 'recent' | 'name',
        limit: Math.min(parseInt(query.limit || '20'), 100),
        offset: parseInt(query.offset || '0'),
      },
      request.user?.userId
    );

    return reply.send({
      data: result.templates,
      meta: {
        limit: Math.min(parseInt(query.limit || '20'), 100),
        offset: parseInt(query.offset || '0'),
        total: result.total,
      },
    });
  });

  // Get featured templates
  app.get('/templates/featured', { preHandler: optionalAuth }, async (request, reply) => {
    const query = request.query as { limit?: string };
    const limit = Math.min(parseInt(query.limit || '10'), 50);

    const result = await WorkoutTemplatesService.search(
      { featured: true, limit },
      request.user?.userId
    );

    return reply.send({ data: result.templates });
  });

  // ============================================
  // TEMPLATE ACTIONS
  // ============================================

  // Clone (fork) a template
  app.post('/templates/:id/clone', { preHandler: authenticate }, async (request, reply) => {
    const { id } = request.params as { id: string };

    const parsed = cloneTemplateSchema.safeParse(request.body || {});
    if (!parsed.success) {
      return reply.status(400).send({
        error: 'Invalid request body',
        details: parsed.error.errors,
      });
    }

    const template = await WorkoutTemplatesService.clone(id, request.user!.userId, parsed.data.newName);

    return reply.status(201).send({ data: template });
  });

  // Rate a template
  app.post('/templates/:id/rate', { preHandler: authenticate }, async (request, reply) => {
    const { id } = request.params as { id: string };

    const parsed = rateTemplateSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({
        error: 'Invalid request body',
        details: parsed.error.errors,
      });
    }

    await WorkoutTemplatesService.rate(id, request.user!.userId, parsed.data.rating, parsed.data.review);

    return reply.send({ data: { success: true } });
  });

  // Save (bookmark) a template
  app.post('/templates/:id/save', { preHandler: authenticate }, async (request, reply) => {
    const { id } = request.params as { id: string };

    const parsed = saveTemplateSchema.safeParse(request.body || {});
    if (!parsed.success) {
      return reply.status(400).send({
        error: 'Invalid request body',
        details: parsed.error.errors,
      });
    }

    await WorkoutTemplatesService.save(id, request.user!.userId, parsed.data.folder);

    return reply.send({ data: { saved: true } });
  });

  // Unsave a template
  app.delete('/templates/:id/save', { preHandler: authenticate }, async (request, reply) => {
    const { id } = request.params as { id: string };

    await WorkoutTemplatesService.unsave(id, request.user!.userId);

    return reply.send({ data: { unsaved: true } });
  });

  // ============================================
  // SAVED TEMPLATES
  // ============================================

  // Get saved templates
  app.get('/templates/saved', { preHandler: authenticate }, async (request, reply) => {
    const query = request.query as { folder?: string; limit?: string; offset?: string };
    const limit = Math.min(parseInt(query.limit || '20'), 100);
    const offset = parseInt(query.offset || '0');

    const result = await WorkoutTemplatesService.getSavedTemplates(request.user!.userId, {
      folder: query.folder,
      limit,
      offset,
    });

    return reply.send({
      data: result.templates,
      meta: { limit, offset, total: result.total },
    });
  });

  log.info('Template routes registered');
}
