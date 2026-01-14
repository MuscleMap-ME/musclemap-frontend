/**
 * Mentorship Routes
 *
 * Endpoints for mentor/mentee relationships
 */

import { FastifyPluginAsync } from 'fastify';
import { mentorshipService } from '../../modules/mentorship';
import { authenticate } from './auth';
import { loggers } from '../../lib/logger';

const log = loggers.http.child({ module: 'mentorship-routes' });

const mentorshipRoutes: FastifyPluginAsync = async (fastify) => {
  // All routes require authentication
  fastify.addHook('preHandler', authenticate);

  // ===========================================
  // MENTOR PROFILES
  // ===========================================

  fastify.get('/mentors', async (request, _reply) => {
    const { specialties, minRating, isPro, maxHourlyRate, limit = '20', offset = '0' } = request.query as any;

    const result = await mentorshipService.searchMentors({
      specialties: specialties ? specialties.split(',') : undefined,
      minRating: minRating ? parseFloat(minRating) : undefined,
      isPro: isPro === 'true' ? true : isPro === 'false' ? false : undefined,
      maxHourlyRate: maxHourlyRate ? parseFloat(maxHourlyRate) : undefined,
      limit: parseInt(limit),
      offset: parseInt(offset),
    });
    return { success: true, data: result };
  });

  fastify.get<{ Params: { userId: string } }>('/mentors/:userId', async (request, reply) => {
    const { userId } = request.params;
    const profile = await mentorshipService.getMentorProfile(userId);

    if (!profile) {
      return reply.status(404).send({ success: false, error: 'Mentor profile not found' });
    }

    return { success: true, data: profile };
  });

  fastify.put('/mentor/profile', async (request, _reply) => {
    const userId = request.user!.userId;
    const profile = await mentorshipService.upsertMentorProfile(userId, request.body as any);
    return { success: true, data: profile };
  });

  // ===========================================
  // MENTORSHIPS
  // ===========================================

  fastify.post<{ Params: { mentorId: string }; Body: { focusAreas?: string[]; goals?: string } }>(
    '/mentors/:mentorId/request',
    async (request, _reply) => {
      const { mentorId } = request.params;
      const menteeId = request.user!.userId;
      const { focusAreas, goals } = request.body || {};

      const mentorship = await mentorshipService.requestMentorship(menteeId, mentorId, {
        focusAreas,
        goals,
      });
      return { success: true, data: mentorship };
    }
  );

  fastify.get('/mentorship/requests', async (request, _reply) => {
    const mentorId = request.user!.userId;
    const requests = await mentorshipService.getPendingRequests(mentorId);
    return { success: true, data: requests };
  });

  fastify.post<{ Params: { mentorshipId: string } }>(
    '/mentorships/:mentorshipId/accept',
    async (request, _reply) => {
      const { mentorshipId } = request.params;
      const mentorId = request.user!.userId;

      const mentorship = await mentorshipService.acceptMentorship(mentorId, mentorshipId);
      return { success: true, data: mentorship };
    }
  );

  fastify.post<{ Params: { mentorshipId: string } }>(
    '/mentorships/:mentorshipId/decline',
    async (request, _reply) => {
      const { mentorshipId } = request.params;
      const mentorId = request.user!.userId;

      await mentorshipService.declineMentorship(mentorId, mentorshipId);
      return { success: true };
    }
  );

  fastify.get('/mentorships/active', async (request, _reply) => {
    const userId = request.user!.userId;
    const mentorships = await mentorshipService.getActiveMentorships(userId);
    return { success: true, data: mentorships };
  });

  fastify.get('/mentorships/history', async (request, _reply) => {
    const userId = request.user!.userId;
    const { limit = '20', offset = '0' } = request.query as any;

    const result = await mentorshipService.getMentorshipHistory(userId, {
      limit: parseInt(limit),
      offset: parseInt(offset),
    });
    return { success: true, data: result };
  });

  fastify.post<{ Params: { mentorshipId: string }; Body: { rating: number; comment?: string } }>(
    '/mentorships/:mentorshipId/complete',
    async (request, _reply) => {
      const { mentorshipId } = request.params;
      const userId = request.user!.userId;
      const { rating, comment } = request.body;

      await mentorshipService.completeMentorship(userId, mentorshipId, { rating, comment });
      return { success: true };
    }
  );

  fastify.post<{ Params: { mentorshipId: string } }>(
    '/mentorships/:mentorshipId/cancel',
    async (request, _reply) => {
      const { mentorshipId } = request.params;
      const userId = request.user!.userId;

      await mentorshipService.cancelMentorship(userId, mentorshipId);
      return { success: true };
    }
  );

  // ===========================================
  // CHECK-INS
  // ===========================================

  fastify.post<{
    Params: { mentorshipId: string };
    Body: {
      notes?: string;
      mood?: 'great' | 'good' | 'okay' | 'struggling';
      progressUpdate?: string;
      nextSteps?: string;
      scheduledFor?: string;
    };
  }>('/mentorships/:mentorshipId/check-ins', async (request, _reply) => {
    const { mentorshipId } = request.params;
    const userId = request.user!.userId;
    const { notes, mood, progressUpdate, nextSteps, scheduledFor } = request.body || {};

    const checkIn = await mentorshipService.createCheckIn(userId, mentorshipId, {
      notes,
      mood,
      progressUpdate,
      nextSteps,
      scheduledFor: scheduledFor ? new Date(scheduledFor) : undefined,
    });
    return { success: true, data: checkIn };
  });

  fastify.get<{ Params: { mentorshipId: string } }>(
    '/mentorships/:mentorshipId/check-ins',
    async (request, _reply) => {
      const { mentorshipId } = request.params;
      const { limit = '20', offset = '0' } = request.query as any;

      const result = await mentorshipService.getCheckIns(mentorshipId, {
        limit: parseInt(limit),
        offset: parseInt(offset),
      });
      return { success: true, data: result };
    }
  );

  fastify.post<{ Params: { checkInId: string } }>(
    '/check-ins/:checkInId/complete',
    async (request, _reply) => {
      const { checkInId } = request.params;
      const userId = request.user!.userId;

      await mentorshipService.completeCheckIn(userId, checkInId);
      return { success: true };
    }
  );

  log.info('Mentorship routes registered');
};

export default mentorshipRoutes;
