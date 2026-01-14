/**
 * Rivals Routes (Fastify)
 *
 * Routes for the 1v1 rivalry competition system:
 * - Create/accept/decline rivalries
 * - Search for potential rivals
 * - Get rivalry stats
 * - End rivalries
 */

import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { authenticate } from './auth';
import { rivalsService } from '../../modules/rivals/service';
import {
  broadcastRivalryStatusChange,
} from '../../modules/rivals/websocket';
import { loggers } from '../../lib/logger';

const log = loggers.http;

// Schemas
const createRivalrySchema = z.object({
  opponentId: z.string().min(1),
});

export async function registerRivalsRoutes(app: FastifyInstance) {
  // ============================================
  // GET RIVALRIES
  // ============================================

  // Get all rivalries for current user
  app.get('/rivals', { preHandler: authenticate }, async (request, reply) => {
    const query = request.query as { status?: string };

    const [rivals, stats] = await Promise.all([
      rivalsService.getUserRivalries(
        request.user!.userId,
        query.status as 'pending' | 'active' | 'ended' | undefined
      ),
      rivalsService.getUserStats(request.user!.userId),
    ]);

    return reply.send({ data: { rivals, stats } });
  });

  // Get pending rivalry requests
  app.get('/rivals/pending', { preHandler: authenticate }, async (request, reply) => {
    const pending = await rivalsService.getPendingRequests(request.user!.userId);
    return reply.send({ data: pending });
  });

  // Get rivalry stats
  app.get('/rivals/stats', { preHandler: authenticate }, async (request, reply) => {
    const stats = await rivalsService.getUserStats(request.user!.userId);
    return reply.send({ data: stats });
  });

  // Search for potential rivals
  app.get('/rivals/search', { preHandler: authenticate }, async (request, reply) => {
    const query = request.query as { q?: string; limit?: string };
    const searchQuery = query.q || '';
    const limit = parseInt(query.limit || '20');

    if (searchQuery.length < 2) {
      return reply.send({ data: [] });
    }

    const users = await rivalsService.searchPotentialRivals(
      request.user!.userId,
      searchQuery,
      limit
    );

    return reply.send({ data: users });
  });

  // Get a specific rivalry
  app.get('/rivals/:id', { preHandler: authenticate }, async (request, reply) => {
    const { id } = request.params as { id: string };

    const rival = await rivalsService.getRivalryWithUser(id, request.user!.userId);

    if (!rival) {
      return reply.status(404).send({ error: 'Rivalry not found' });
    }

    return reply.send({ data: rival });
  });

  // ============================================
  // CREATE/MANAGE RIVALRIES
  // ============================================

  // Challenge a user to a rivalry
  app.post('/rivals/challenge', { preHandler: authenticate }, async (request, reply) => {
    const parsed = createRivalrySchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({
        error: 'Invalid request body',
        details: parsed.error.errors,
      });
    }

    const { opponentId } = parsed.data;

    if (opponentId === request.user!.userId) {
      return reply.status(400).send({ error: 'Cannot challenge yourself' });
    }

    try {
      const rival = await rivalsService.createRivalry(request.user!.userId, opponentId);

      // Broadcast to challenged user
      broadcastRivalryStatusChange(
        rival.id,
        'rival.request',
        request.user!.userId,
        opponentId,
        { challengerUsername: request.user?.email?.split('@')[0] || 'Unknown' }
      );

      return reply.status(201).send({ data: rival });
    } catch (err) {
      return reply.status(400).send({
        error: err instanceof Error ? err.message : 'Failed to create rivalry',
      });
    }
  });

  // Accept a rivalry request
  app.post('/rivals/:id/accept', { preHandler: authenticate }, async (request, reply) => {
    const { id } = request.params as { id: string };

    try {
      const rival = await rivalsService.acceptRivalry(id, request.user!.userId);

      // Broadcast to challenger
      broadcastRivalryStatusChange(
        rival.id,
        'rival.accepted',
        rival.opponent.id,
        request.user!.userId,
        { acceptedByUsername: request.user?.email?.split('@')[0] || 'Unknown' }
      );

      return reply.send({ data: rival });
    } catch (err) {
      return reply.status(400).send({
        error: err instanceof Error ? err.message : 'Failed to accept rivalry',
      });
    }
  });

  // Decline a rivalry request
  app.post('/rivals/:id/decline', { preHandler: authenticate }, async (request, reply) => {
    const { id } = request.params as { id: string };

    try {
      const rival = await rivalsService.getRivalry(id);

      if (!rival) {
        return reply.status(404).send({ error: 'Rivalry not found' });
      }

      await rivalsService.declineRivalry(id, request.user!.userId);

      // Broadcast to challenger
      broadcastRivalryStatusChange(
        rival.id,
        'rival.declined',
        rival.challengerId,
        rival.challengedId
      );

      return reply.send({ success: true });
    } catch (err) {
      return reply.status(400).send({
        error: err instanceof Error ? err.message : 'Failed to decline rivalry',
      });
    }
  });

  // End an active rivalry
  app.post('/rivals/:id/end', { preHandler: authenticate }, async (request, reply) => {
    const { id } = request.params as { id: string };

    try {
      const rival = await rivalsService.getRivalry(id);

      if (!rival) {
        return reply.status(404).send({ error: 'Rivalry not found' });
      }

      await rivalsService.endRivalry(id, request.user!.userId);

      // Broadcast to both users
      broadcastRivalryStatusChange(
        rival.id,
        'rival.ended',
        rival.challengerId,
        rival.challengedId,
        {
          challengerTU: rival.challengerTU,
          challengedTU: rival.challengedTU,
        }
      );

      return reply.send({ success: true });
    } catch (err) {
      return reply.status(400).send({
        error: err instanceof Error ? err.message : 'Failed to end rivalry',
      });
    }
  });

  log.info('Rivals routes registered');
}
