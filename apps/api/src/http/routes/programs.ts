/**
 * Training Programs Routes (Fastify)
 *
 * Routes for managing multi-week training programs:
 * - CRUD operations on programs
 * - Program discovery and search
 * - Enrollment management
 * - Progress tracking
 */

import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { authenticate, optionalAuth } from './auth';
import { ProgramsService, EnrollmentService } from '../../modules/programs';
import type { ProgramCategory, ProgramDifficulty, CreateProgramInput, UpdateProgramInput } from '../../modules/programs/types';
import { loggers } from '../../lib/logger';

const log = loggers.http;

// Schemas
const programExerciseSchema = z.object({
  exerciseId: z.string().min(1),
  name: z.string().optional(),
  sets: z.number().int().min(1).max(20),
  reps: z.string().min(1).max(20),
  restSeconds: z.number().int().min(0).max(600),
  notes: z.string().max(500).optional(),
  weight: z.number().min(0).max(2000).optional(),
  rpe: z.number().min(1).max(10).optional(),
});

const programDaySchema = z.object({
  day: z.number().int().min(1).max(7),
  name: z.string().min(1).max(100),
  focus: z.string().max(50).optional(),
  exercises: z.array(programExerciseSchema).min(1).max(20),
  notes: z.string().max(1000).optional(),
});

const progressionRulesSchema = z.object({
  type: z.enum(['linear', 'double_progression', 'undulating', 'power_hypertrophy', 'custom']),
  weight_increment: z.number().optional(),
  weight_increment_upper: z.number().optional(),
  weight_increment_lower: z.number().optional(),
  rep_range_low: z.number().optional(),
  rep_range_high: z.number().optional(),
  deload_week: z.number().optional(),
  deload_percentage: z.number().optional(),
}).passthrough();

const createProgramSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(5000).optional(),
  shortDescription: z.string().max(200).optional(),
  durationWeeks: z.number().int().min(1).max(52),
  daysPerWeek: z.number().int().min(1).max(7),
  schedule: z.array(programDaySchema).min(1).max(7),
  progressionRules: progressionRulesSchema.optional(),
  difficulty: z.enum(['beginner', 'intermediate', 'advanced', 'elite']).optional(),
  category: z.enum(['strength', 'hypertrophy', 'powerbuilding', 'general_fitness', 'athletic_performance']).optional(),
  goals: z.array(z.string()).optional(),
  targetMuscles: z.array(z.string()).optional(),
  equipmentRequired: z.array(z.string()).optional(),
  isPublic: z.boolean().optional(),
  imageUrl: z.string().url().optional(),
});

const updateProgramSchema = createProgramSchema.partial();

const rateProgramSchema = z.object({
  rating: z.number().int().min(1).max(5),
  review: z.string().max(1000).optional(),
});

const duplicateProgramSchema = z.object({
  newName: z.string().min(1).max(100).optional(),
});

const updateProgressDataSchema = z.object({
  exerciseId: z.string().min(1),
  weight: z.number().min(0).max(2000).optional(),
  reps: z.number().int().min(1).max(500).optional(),
  notes: z.string().max(500).optional(),
});

const validCategories: ProgramCategory[] = ['strength', 'hypertrophy', 'powerbuilding', 'general_fitness', 'athletic_performance'];
const validDifficulties: ProgramDifficulty[] = ['beginner', 'intermediate', 'advanced', 'elite'];

export async function registerProgramRoutes(app: FastifyInstance) {
  // ============================================
  // PROGRAM CRUD
  // ============================================

  // Create a new program
  app.post('/programs', { preHandler: authenticate }, async (request, reply) => {
    const parsed = createProgramSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({
        error: 'Invalid request body',
        details: parsed.error.errors,
      });
    }

    const program = await ProgramsService.create(request.user!.userId, parsed.data as CreateProgramInput);
    return reply.status(201).send({ data: program });
  });

  // Get a program by ID
  app.get('/programs/:id', { preHandler: optionalAuth }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const program = await ProgramsService.getById(id, request.user?.userId);
    return reply.send({ data: program });
  });

  // Update a program
  app.put('/programs/:id', { preHandler: authenticate }, async (request, reply) => {
    const { id } = request.params as { id: string };

    const parsed = updateProgramSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({
        error: 'Invalid request body',
        details: parsed.error.errors,
      });
    }

    const program = await ProgramsService.update(id, request.user!.userId, parsed.data as UpdateProgramInput);
    return reply.send({ data: program });
  });

  // Delete a program
  app.delete('/programs/:id', { preHandler: authenticate }, async (request, reply) => {
    const { id } = request.params as { id: string };
    await ProgramsService.delete(id, request.user!.userId);
    return reply.send({ data: { deleted: true } });
  });

  // ============================================
  // USER'S PROGRAMS
  // ============================================

  // Get current user's programs
  app.get('/programs/me', { preHandler: authenticate }, async (request, reply) => {
    const query = request.query as { limit?: string; offset?: string };
    const limit = Math.min(parseInt(query.limit || '20'), 100);
    const offset = parseInt(query.offset || '0');

    const result = await ProgramsService.getUserPrograms(request.user!.userId, { limit, offset });
    return reply.send({
      data: result.programs,
      meta: { limit, offset, total: result.total },
    });
  });

  // ============================================
  // PROGRAM DISCOVERY
  // ============================================

  // Search public programs
  app.get('/programs', { preHandler: optionalAuth }, async (request, reply) => {
    const query = request.query as {
      search?: string;
      category?: string;
      difficulty?: string;
      minRating?: string;
      durationWeeks?: string;
      daysPerWeek?: string;
      official?: string;
      featured?: string;
      goals?: string;
      equipment?: string;
      creator?: string;
      sortBy?: string;
      limit?: string;
      offset?: string;
    };

    // Validate category if provided
    if (query.category && !validCategories.includes(query.category as ProgramCategory)) {
      return reply.status(400).send({
        error: 'Invalid category',
        validCategories,
      });
    }

    // Validate difficulty if provided
    if (query.difficulty && !validDifficulties.includes(query.difficulty as ProgramDifficulty)) {
      return reply.status(400).send({
        error: 'Invalid difficulty',
        validDifficulties,
      });
    }

    const result = await ProgramsService.search(
      {
        search: query.search,
        category: query.category as ProgramCategory,
        difficulty: query.difficulty as ProgramDifficulty,
        minRating: query.minRating ? parseFloat(query.minRating) : undefined,
        durationWeeks: query.durationWeeks ? parseInt(query.durationWeeks) : undefined,
        daysPerWeek: query.daysPerWeek ? parseInt(query.daysPerWeek) : undefined,
        official: query.official === 'true' ? true : query.official === 'false' ? false : undefined,
        featured: query.featured === 'true',
        goals: query.goals ? query.goals.split(',') : undefined,
        equipment: query.equipment ? query.equipment.split(',') : undefined,
        creator: query.creator,
        sortBy: query.sortBy as 'popular' | 'rating' | 'recent' | 'name' | 'duration',
        limit: Math.min(parseInt(query.limit || '20'), 100),
        offset: parseInt(query.offset || '0'),
      },
      request.user?.userId
    );

    return reply.send({
      data: result.programs,
      meta: {
        limit: Math.min(parseInt(query.limit || '20'), 100),
        offset: parseInt(query.offset || '0'),
        total: result.total,
      },
    });
  });

  // Get official programs
  app.get('/programs/official', { preHandler: optionalAuth }, async (request, reply) => {
    const programs = await ProgramsService.getOfficialPrograms(request.user?.userId);
    return reply.send({ data: programs });
  });

  // Get featured programs
  app.get('/programs/featured', { preHandler: optionalAuth }, async (request, reply) => {
    const query = request.query as { limit?: string };
    const limit = Math.min(parseInt(query.limit || '10'), 50);

    const programs = await ProgramsService.getFeaturedPrograms(limit, request.user?.userId);
    return reply.send({ data: programs });
  });

  // ============================================
  // PROGRAM ACTIONS
  // ============================================

  // Duplicate a program
  app.post('/programs/:id/duplicate', { preHandler: authenticate }, async (request, reply) => {
    const { id } = request.params as { id: string };

    const parsed = duplicateProgramSchema.safeParse(request.body || {});
    if (!parsed.success) {
      return reply.status(400).send({
        error: 'Invalid request body',
        details: parsed.error.errors,
      });
    }

    const program = await ProgramsService.duplicate(id, request.user!.userId, parsed.data.newName);
    return reply.status(201).send({ data: program });
  });

  // Rate a program
  app.post('/programs/:id/rate', { preHandler: authenticate }, async (request, reply) => {
    const { id } = request.params as { id: string };

    const parsed = rateProgramSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({
        error: 'Invalid request body',
        details: parsed.error.errors,
      });
    }

    await ProgramsService.rate(id, request.user!.userId, parsed.data.rating, parsed.data.review);
    return reply.send({ data: { success: true } });
  });

  // ============================================
  // ENROLLMENT MANAGEMENT
  // ============================================

  // Enroll in a program
  app.post('/programs/:id/enroll', { preHandler: authenticate }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const enrollment = await EnrollmentService.enroll(request.user!.userId, id);
    return reply.status(201).send({ data: enrollment });
  });

  // Get user's enrollments
  app.get('/programs/my-enrollments', { preHandler: authenticate }, async (request, reply) => {
    const query = request.query as { status?: string; limit?: string; offset?: string };
    const limit = Math.min(parseInt(query.limit || '20'), 100);
    const offset = parseInt(query.offset || '0');

    const result = await EnrollmentService.getUserEnrollments(request.user!.userId, {
      status: query.status as 'active' | 'paused' | 'completed' | 'dropped',
      limit,
      offset,
    });

    return reply.send({
      data: result.enrollments,
      meta: { limit, offset, total: result.total },
    });
  });

  // Get active enrollment
  app.get('/programs/active-enrollment', { preHandler: authenticate }, async (request, reply) => {
    const query = request.query as { programId?: string };
    const enrollment = await EnrollmentService.getActiveEnrollment(
      request.user!.userId,
      query.programId
    );
    return reply.send({ data: enrollment });
  });

  // Get enrollment details
  app.get('/programs/enrollments/:enrollmentId', { preHandler: authenticate }, async (request, reply) => {
    const { enrollmentId } = request.params as { enrollmentId: string };
    const result = await EnrollmentService.getEnrollmentWithProgram(enrollmentId, request.user!.userId);
    return reply.send({ data: result });
  });

  // Get today's workout
  app.get('/programs/todays-workout', { preHandler: authenticate }, async (request, reply) => {
    const query = request.query as { programId?: string };
    const result = await EnrollmentService.getTodaysWorkout(
      request.user!.userId,
      query.programId
    );
    return reply.send({ data: result });
  });

  // Record workout completion
  app.post('/programs/:id/record-workout', { preHandler: authenticate }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const enrollment = await EnrollmentService.recordWorkout(request.user!.userId, id);
    return reply.send({ data: enrollment });
  });

  // Pause enrollment
  app.post('/programs/enrollments/:enrollmentId/pause', { preHandler: authenticate }, async (request, reply) => {
    const { enrollmentId } = request.params as { enrollmentId: string };
    const enrollment = await EnrollmentService.pause(enrollmentId, request.user!.userId);
    return reply.send({ data: enrollment });
  });

  // Resume enrollment
  app.post('/programs/enrollments/:enrollmentId/resume', { preHandler: authenticate }, async (request, reply) => {
    const { enrollmentId } = request.params as { enrollmentId: string };
    const enrollment = await EnrollmentService.resume(enrollmentId, request.user!.userId);
    return reply.send({ data: enrollment });
  });

  // Drop enrollment
  app.post('/programs/enrollments/:enrollmentId/drop', { preHandler: authenticate }, async (request, reply) => {
    const { enrollmentId } = request.params as { enrollmentId: string };
    const enrollment = await EnrollmentService.drop(enrollmentId, request.user!.userId);
    return reply.send({ data: enrollment });
  });

  // Update progress data
  app.post('/programs/enrollments/:enrollmentId/progress', { preHandler: authenticate }, async (request, reply) => {
    const { enrollmentId } = request.params as { enrollmentId: string };

    const parsed = updateProgressDataSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({
        error: 'Invalid request body',
        details: parsed.error.errors,
      });
    }

    const enrollment = await EnrollmentService.updateProgressData(
      enrollmentId,
      request.user!.userId,
      parsed.data.exerciseId,
      {
        weight: parsed.data.weight,
        reps: parsed.data.reps,
        notes: parsed.data.notes,
      }
    );

    return reply.send({ data: enrollment });
  });

  log.info('Program routes registered');
}
