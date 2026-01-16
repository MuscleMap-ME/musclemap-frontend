/**
 * Martial Arts Routes
 *
 * Endpoints for martial arts technique training:
 * - GET /martial-arts/disciplines - List all disciplines
 * - GET /martial-arts/disciplines/:id - Get discipline with categories
 * - GET /martial-arts/disciplines/:id/techniques - Get techniques for a discipline
 * - GET /martial-arts/disciplines/:id/progress - Get user progress for discipline
 * - GET /martial-arts/disciplines/:id/leaderboard - Get discipline leaderboard
 * - GET /martial-arts/techniques/:id - Get a specific technique
 * - GET /martial-arts/progress - Get user's overall progress summary
 * - POST /martial-arts/practice - Log a practice session
 * - POST /martial-arts/master - Mark a technique as mastered
 * - GET /martial-arts/history - Get practice history
 * - PUT /martial-arts/techniques/:id/notes - Update notes for a technique
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { martialArtsService } from '../../modules/martial-arts';
import { authenticate } from './auth';
import { loggers } from '../../lib/logger';

const log = loggers.http;

export async function registerMartialArtsRoutes(app: FastifyInstance): Promise<void> {
  // Get all disciplines
  app.get<{ Querystring: { military?: string } }>(
    '/martial-arts/disciplines',
    async (request, reply) => {
      try {
        const militaryOnly = request.query.military === 'true';
        const disciplines = await martialArtsService.getDisciplines({ militaryOnly });
        return { disciplines };
      } catch (err) {
        log.error({ err }, 'Error fetching martial arts disciplines');
        return reply.status(500).send({ error: 'Failed to fetch disciplines' });
      }
    }
  );

  // Get a specific discipline with categories
  app.get<{ Params: { disciplineId: string } }>(
    '/martial-arts/disciplines/:disciplineId',
    async (request, reply) => {
      try {
        const { disciplineId } = request.params;
        const discipline = await martialArtsService.getDiscipline(disciplineId);

        if (!discipline) {
          return reply.status(404).send({ error: 'Discipline not found' });
        }

        return { discipline };
      } catch (err) {
        log.error({ err }, 'Error fetching discipline');
        return reply.status(500).send({ error: 'Failed to fetch discipline' });
      }
    }
  );

  // Get techniques for a discipline
  app.get<{ Params: { disciplineId: string } }>(
    '/martial-arts/disciplines/:disciplineId/techniques',
    async (request, reply) => {
      try {
        const { disciplineId } = request.params;
        const techniques = await martialArtsService.getTechniques(disciplineId);
        return { techniques };
      } catch (err) {
        log.error({ err }, 'Error fetching techniques');
        return reply.status(500).send({ error: 'Failed to fetch techniques' });
      }
    }
  );

  // Get user progress for a discipline (requires auth)
  app.get<{ Params: { disciplineId: string } }>(
    '/martial-arts/disciplines/:disciplineId/progress',
    { preHandler: authenticate },
    async (request, reply) => {
      try {
        const { disciplineId } = request.params;
        const userId = request.user!.userId;

        const progress = await martialArtsService.getUserDisciplineProgress(userId, disciplineId);

        if (progress.length === 0) {
          // Check if discipline exists
          const discipline = await martialArtsService.getDiscipline(disciplineId);
          if (!discipline) {
            return reply.status(404).send({ error: 'Discipline not found' });
          }
        }

        return { techniques: progress };
      } catch (err) {
        log.error({ err }, 'Error fetching discipline progress');
        return reply.status(500).send({ error: 'Failed to fetch discipline progress' });
      }
    }
  );

  // Get discipline leaderboard
  app.get<{ Params: { disciplineId: string }; Querystring: { limit?: string } }>(
    '/martial-arts/disciplines/:disciplineId/leaderboard',
    async (request, reply) => {
      try {
        const { disciplineId } = request.params;
        const limit = parseInt(request.query.limit || '10');

        const leaderboard = await martialArtsService.getDisciplineLeaderboard(disciplineId, { limit });
        return { leaderboard };
      } catch (err) {
        log.error({ err }, 'Error fetching discipline leaderboard');
        return reply.status(500).send({ error: 'Failed to fetch leaderboard' });
      }
    }
  );

  // Get a specific technique
  app.get<{ Params: { techniqueId: string } }>(
    '/martial-arts/techniques/:techniqueId',
    async (request, reply) => {
      try {
        const { techniqueId } = request.params;
        const technique = await martialArtsService.getTechnique(techniqueId);

        if (!technique) {
          return reply.status(404).send({ error: 'Technique not found' });
        }

        return { technique };
      } catch (err) {
        log.error({ err }, 'Error fetching technique');
        return reply.status(500).send({ error: 'Failed to fetch technique' });
      }
    }
  );

  // Get user's overall progress summary (requires auth)
  app.get(
    '/martial-arts/progress',
    { preHandler: authenticate },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const userId = request.user!.userId;
        const summary = await martialArtsService.getUserSummary(userId);
        return summary;
      } catch (err) {
        log.error({ err }, 'Error fetching martial arts summary');
        return reply.status(500).send({ error: 'Failed to fetch progress summary' });
      }
    }
  );

  // Log a practice session (requires auth)
  app.post<{ Body: { techniqueId: string; durationMinutes: number; repsPerformed?: number; roundsPerformed?: number; partnerDrill?: boolean; notes?: string } }>(
    '/martial-arts/practice',
    { preHandler: authenticate },
    async (request, reply) => {
      try {
        const userId = request.user!.userId;
        const { techniqueId, durationMinutes, repsPerformed, roundsPerformed, partnerDrill, notes } = request.body;

        if (!techniqueId || !durationMinutes) {
          return reply.status(400).send({ error: 'techniqueId and durationMinutes are required' });
        }

        const practiceLog = await martialArtsService.logPractice({
          userId,
          techniqueId,
          durationMinutes,
          repsPerformed,
          roundsPerformed,
          partnerDrill,
          notes,
        });

        return { practiceLog };
      } catch (err) {
        log.error({ err }, 'Error logging practice');
        return reply.status(500).send({ error: 'Failed to log practice' });
      }
    }
  );

  // Mark a technique as mastered (requires auth)
  app.post<{ Body: { techniqueId: string } }>(
    '/martial-arts/master',
    { preHandler: authenticate },
    async (request, reply) => {
      try {
        const userId = request.user!.userId;
        const { techniqueId } = request.body;

        if (!techniqueId) {
          return reply.status(400).send({ error: 'techniqueId is required' });
        }

        const result = await martialArtsService.masterTechnique({
          userId,
          techniqueId,
        });

        if (!result.success) {
          return reply.status(400).send({ error: result.error });
        }

        return result;
      } catch (err) {
        log.error({ err }, 'Error mastering technique');
        return reply.status(500).send({ error: 'Failed to master technique' });
      }
    }
  );

  // Get practice history (requires auth)
  app.get<{ Querystring: { limit?: string; offset?: string; disciplineId?: string } }>(
    '/martial-arts/history',
    { preHandler: authenticate },
    async (request, reply) => {
      try {
        const userId = request.user!.userId;
        const limit = parseInt(request.query.limit || '20');
        const offset = parseInt(request.query.offset || '0');
        const disciplineId = request.query.disciplineId;

        const history = await martialArtsService.getPracticeHistory(userId, {
          limit,
          offset,
          disciplineId,
        });

        return history;
      } catch (err) {
        log.error({ err }, 'Error fetching practice history');
        return reply.status(500).send({ error: 'Failed to fetch practice history' });
      }
    }
  );

  // Update notes for a technique (requires auth)
  app.put<{ Params: { techniqueId: string }; Body: { notes: string } }>(
    '/martial-arts/techniques/:techniqueId/notes',
    { preHandler: authenticate },
    async (request, reply) => {
      try {
        const userId = request.user!.userId;
        const { techniqueId } = request.params;
        const { notes } = request.body;

        await martialArtsService.updateNotes(userId, techniqueId, notes);
        return { success: true };
      } catch (err) {
        log.error({ err }, 'Error updating notes');
        return reply.status(500).send({ error: 'Failed to update notes' });
      }
    }
  );
}
