/**
 * Trainer & Classes Routes (Fastify)
 *
 * Routes for trainer profiles, class management, enrollment, and attendance.
 */

import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { authenticate, requireRole } from './auth';
import { trainerService } from '../../modules/economy/trainer.service';
import { loggers } from '../../lib/logger';

const _log = loggers.http;

// Schemas
const createProfileSchema = z.object({
  displayName: z.string().min(1).max(100),
  bio: z.string().max(1000).optional(),
  specialties: z.array(z.string()).max(10).optional(),
  certifications: z.array(z.string()).max(20).optional(),
  hourlyRateCredits: z.number().int().min(0).max(10000).optional(),
  perClassRateCredits: z.number().int().min(0).max(10000).optional(),
});

const createClassSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  category: z.string().min(1).max(50),
  difficulty: z.enum(['beginner', 'intermediate', 'advanced', 'all']),
  startAt: z.string().datetime(),
  durationMinutes: z.number().int().min(5).max(480),
  locationType: z.enum(['in_person', 'virtual', 'hybrid']),
  locationDetails: z.string().max(500).optional(),
  hangoutId: z.number().int().optional(),
  virtualHangoutId: z.number().int().optional(),
  capacity: z.number().int().min(1).max(1000),
  creditsPerStudent: z.number().int().min(0).max(10000),
  trainerWagePerStudent: z.number().int().min(0).max(10000),
});

const updateClassSchema = createClassSchema.partial();

const markAttendanceSchema = z.object({
  attendees: z.array(z.object({
    userId: z.string().min(1),
    attended: z.boolean(),
    rating: z.number().int().min(1).max(5).optional(),
    feedback: z.string().max(500).optional(),
  })),
});

export async function registerTrainerRoutes(app: FastifyInstance) {
  // ============================================
  // TRAINER PROFILE ROUTES
  // ============================================

  // Get current user's trainer profile
  app.get('/trainers/me', { preHandler: authenticate }, async (request, reply) => {
    const profile = await trainerService.getProfile(request.user!.userId);
    return reply.send({ data: profile });
  });

  // Create or update trainer profile
  app.post('/trainers/profile', { preHandler: authenticate }, async (request, reply) => {
    const data = createProfileSchema.parse(request.body);

    const profile = await trainerService.upsertProfile(request.user!.userId, {
      displayName: data.displayName,
      bio: data.bio,
      specialties: data.specialties,
      certifications: data.certifications,
      hourlyRateCredits: data.hourlyRateCredits,
      perClassRateCredits: data.perClassRateCredits,
    });

    return reply.send({ data: profile });
  });

  // Get trainer profile by user ID
  app.get('/trainers/:userId', async (request, reply) => {
    const { userId } = request.params as { userId: string };
    const profile = await trainerService.getProfile(userId);

    if (!profile) {
      return reply.status(404).send({
        error: { code: 'NOT_FOUND', message: 'Trainer profile not found', statusCode: 404 },
      });
    }

    return reply.send({ data: profile });
  });

  // List trainers
  app.get('/trainers', async (request, reply) => {
    const query = request.query as {
      verified?: string;
      specialty?: string;
      status?: string;
      limit?: string;
      offset?: string;
    };

    const limit = Math.min(parseInt(query.limit || '50'), 100);
    const offset = parseInt(query.offset || '0');

    const result = await trainerService.listProfiles({
      verified: query.verified ? query.verified === 'true' : undefined,
      specialty: query.specialty,
      status: query.status || 'active',
      limit,
      offset,
    });

    return reply.send({
      data: result.trainers,
      meta: { limit, offset, total: result.total },
    });
  });

  // Update trainer status (self)
  app.put('/trainers/me/status', { preHandler: authenticate }, async (request, reply) => {
    const data = z.object({
      status: z.enum(['active', 'paused']),
    }).parse(request.body);

    await trainerService.updateStatus(request.user!.userId, data.status);

    return reply.send({ data: { success: true } });
  });

  // Admin: Update any trainer status
  app.put('/admin/trainers/:userId/status', { preHandler: [authenticate, requireRole('admin')] }, async (request, reply) => {
    const { userId } = request.params as { userId: string };
    const data = z.object({
      status: z.enum(['active', 'paused', 'suspended']),
    }).parse(request.body);

    await trainerService.updateStatus(userId, data.status);

    return reply.send({ data: { success: true } });
  });

  // ============================================
  // CLASS ROUTES
  // ============================================

  // Create a class
  app.post('/classes', { preHandler: authenticate }, async (request, reply) => {
    const data = createClassSchema.parse(request.body);

    const classData = await trainerService.createClass(request.user!.userId, {
      title: data.title,
      description: data.description,
      category: data.category,
      difficulty: data.difficulty,
      startAt: new Date(data.startAt),
      durationMinutes: data.durationMinutes,
      locationType: data.locationType,
      locationDetails: data.locationDetails,
      hangoutId: data.hangoutId,
      virtualHangoutId: data.virtualHangoutId,
      capacity: data.capacity,
      creditsPerStudent: data.creditsPerStudent,
      trainerWagePerStudent: data.trainerWagePerStudent,
    });

    return reply.status(201).send({ data: classData });
  });

  // Get class by ID
  app.get('/classes/:classId', async (request, reply) => {
    const { classId } = request.params as { classId: string };
    const classData = await trainerService.getClass(classId);

    if (!classData) {
      return reply.status(404).send({
        error: { code: 'NOT_FOUND', message: 'Class not found', statusCode: 404 },
      });
    }

    return reply.send({ data: classData });
  });

  // List classes
  app.get('/classes', async (request, reply) => {
    const query = request.query as {
      trainerId?: string;
      status?: string;
      category?: string;
      upcoming?: string;
      limit?: string;
      offset?: string;
    };

    const limit = Math.min(parseInt(query.limit || '50'), 100);
    const offset = parseInt(query.offset || '0');

    const result = await trainerService.listClasses({
      trainerUserId: query.trainerId,
      status: query.status,
      category: query.category,
      upcoming: query.upcoming === 'true',
      limit,
      offset,
    });

    return reply.send({
      data: result.classes,
      meta: { limit, offset, total: result.total },
    });
  });

  // Get trainer's classes
  app.get('/trainers/me/classes', { preHandler: authenticate }, async (request, reply) => {
    const query = request.query as {
      status?: string;
      limit?: string;
      offset?: string;
    };

    const limit = Math.min(parseInt(query.limit || '50'), 100);
    const offset = parseInt(query.offset || '0');

    const result = await trainerService.listClasses({
      trainerUserId: request.user!.userId,
      status: query.status,
      limit,
      offset,
    });

    return reply.send({
      data: result.classes,
      meta: { limit, offset, total: result.total },
    });
  });

  // Update a class
  app.put('/classes/:classId', { preHandler: authenticate }, async (request, reply) => {
    const { classId } = request.params as { classId: string };
    const data = updateClassSchema.parse(request.body);

    // Verify ownership
    const classData = await trainerService.getClass(classId);
    if (!classData) {
      return reply.status(404).send({
        error: { code: 'NOT_FOUND', message: 'Class not found', statusCode: 404 },
      });
    }

    if (classData.trainerUserId !== request.user!.userId) {
      return reply.status(403).send({
        error: { code: 'FORBIDDEN', message: 'Not authorized to update this class', statusCode: 403 },
      });
    }

    const updated = await trainerService.updateClass(classId, {
      ...data,
      startAt: data.startAt ? new Date(data.startAt) : undefined,
    });

    return reply.send({ data: updated });
  });

  // Cancel a class
  app.post('/classes/:classId/cancel', { preHandler: authenticate }, async (request, reply) => {
    const { classId } = request.params as { classId: string };
    const data = z.object({
      reason: z.string().max(500).optional(),
    }).parse(request.body || {});

    // Verify ownership
    const classData = await trainerService.getClass(classId);
    if (!classData) {
      return reply.status(404).send({
        error: { code: 'NOT_FOUND', message: 'Class not found', statusCode: 404 },
      });
    }

    if (classData.trainerUserId !== request.user!.userId) {
      return reply.status(403).send({
        error: { code: 'FORBIDDEN', message: 'Not authorized to cancel this class', statusCode: 403 },
      });
    }

    await trainerService.cancelClass(classId, data.reason);

    return reply.send({ data: { success: true } });
  });

  // ============================================
  // ENROLLMENT ROUTES
  // ============================================

  // Enroll in a class
  app.post('/classes/:classId/enroll', { preHandler: authenticate }, async (request, reply) => {
    const { classId } = request.params as { classId: string };

    const enrollment = await trainerService.enroll(request.user!.userId, classId);

    return reply.status(201).send({ data: enrollment });
  });

  // Cancel enrollment
  app.post('/classes/:classId/unenroll', { preHandler: authenticate }, async (request, reply) => {
    const { classId } = request.params as { classId: string };

    await trainerService.cancelEnrollment(request.user!.userId, classId);

    return reply.send({ data: { success: true } });
  });

  // Get class enrollments (trainer only)
  app.get('/classes/:classId/enrollments', { preHandler: authenticate }, async (request, reply) => {
    const { classId } = request.params as { classId: string };

    // Verify ownership
    const classData = await trainerService.getClass(classId);
    if (!classData) {
      return reply.status(404).send({
        error: { code: 'NOT_FOUND', message: 'Class not found', statusCode: 404 },
      });
    }

    if (classData.trainerUserId !== request.user!.userId) {
      return reply.status(403).send({
        error: { code: 'FORBIDDEN', message: 'Not authorized to view enrollments', statusCode: 403 },
      });
    }

    const enrollments = await trainerService.getClassEnrollments(classId);

    return reply.send({ data: enrollments });
  });

  // Get user's enrollments
  app.get('/me/enrollments', { preHandler: authenticate }, async (request, reply) => {
    const query = request.query as {
      status?: string;
      limit?: string;
      offset?: string;
    };

    const limit = Math.min(parseInt(query.limit || '50'), 100);
    const offset = parseInt(query.offset || '0');

    const result = await trainerService.getUserEnrollments(request.user!.userId, {
      status: query.status,
      limit,
      offset,
    });

    return reply.send({
      data: result.enrollments,
      meta: { limit, offset, total: result.total },
    });
  });

  // ============================================
  // ATTENDANCE ROUTES
  // ============================================

  // Mark attendance
  app.post('/classes/:classId/attendance', { preHandler: authenticate }, async (request, reply) => {
    const { classId } = request.params as { classId: string };
    const data = markAttendanceSchema.parse(request.body);

    const result = await trainerService.markAttendance(
      request.user!.userId,
      classId,
      data.attendees.map(a => ({
        userId: a.userId,
        attended: a.attended,
        rating: a.rating,
        feedback: a.feedback,
      }))
    );

    return reply.send({ data: result });
  });

  // Get class attendance
  app.get('/classes/:classId/attendance', { preHandler: authenticate }, async (request, reply) => {
    const { classId } = request.params as { classId: string };

    // Verify ownership
    const classData = await trainerService.getClass(classId);
    if (!classData) {
      return reply.status(404).send({
        error: { code: 'NOT_FOUND', message: 'Class not found', statusCode: 404 },
      });
    }

    if (classData.trainerUserId !== request.user!.userId) {
      return reply.status(403).send({
        error: { code: 'FORBIDDEN', message: 'Not authorized to view attendance', statusCode: 403 },
      });
    }

    const attendance = await trainerService.getClassAttendance(classId);

    return reply.send({ data: attendance });
  });
}
