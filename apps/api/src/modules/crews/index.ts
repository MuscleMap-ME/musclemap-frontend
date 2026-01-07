/**
 * Crews Router
 *
 * REST API endpoints for crews and Crew Wars.
 */
import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { authenticate } from '../../http/routes/auth';
import * as crewsService from './service';
import type { CrewWarStatus } from './types';

export function registerCrewsRoutes(fastify: FastifyInstance): void {
  // Get user's crew
  fastify.get('/api/crews/my', {
    preHandler: [authenticate],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = request.user!.userId;
    const result = await crewsService.getUserCrew(userId);

    if (!result) {
      return { data: null };
    }

    const [members, wars, stats] = await Promise.all([
      crewsService.getCrewMembers(result.crew.id),
      crewsService.getCrewWars(result.crew.id),
      crewsService.getCrewStats(result.crew.id),
    ]);

    return {
      data: {
        crew: result.crew,
        membership: result.membership,
        members,
        wars,
        stats,
      },
    };
  });

  // Get leaderboard (public route, before :id)
  fastify.get('/api/crews/leaderboard', async (request: FastifyRequest<{
    Querystring: { limit?: string };
  }>, reply: FastifyReply) => {
    const limit = parseInt(request.query.limit || '50', 10);
    const leaderboard = await crewsService.getCrewLeaderboard(limit);
    return { data: leaderboard };
  });

  // Search crews
  fastify.get('/api/crews/search', {
    preHandler: [authenticate],
  }, async (request: FastifyRequest<{
    Querystring: { q?: string; limit?: string };
  }>, reply: FastifyReply) => {
    const query = request.query.q || '';
    const limit = parseInt(request.query.limit || '20', 10);
    const crews = await crewsService.searchCrews(query, limit);
    return { data: crews };
  });

  // Leave crew
  fastify.post('/api/crews/leave', {
    preHandler: [authenticate],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = request.user!.userId;
    await crewsService.leaveCrew(userId);
    return { success: true };
  });

  // Create a new crew
  fastify.post<{
    Body: { name?: string; tag?: string; description?: string; color?: string };
  }>('/api/crews', {
    preHandler: [authenticate],
  }, async (request, reply) => {
    const userId = request.user!.userId;
    const { name, tag, description, color } = request.body;

    if (!name || !tag) {
      return reply.status(400).send({ error: 'Name and tag are required' });
    }

    const crew = await crewsService.createCrew(userId, name, tag, description, color);
    reply.status(201);
    return { data: crew };
  });

  // Get crew by ID
  fastify.get<{
    Params: { id: string };
  }>('/api/crews/:id', {
    preHandler: [authenticate],
  }, async (request, reply) => {
    const crew = await crewsService.getCrew(request.params.id);
    if (!crew) {
      return reply.status(404).send({ error: 'Crew not found' });
    }

    const [members, stats] = await Promise.all([
      crewsService.getCrewMembers(crew.id),
      crewsService.getCrewStats(crew.id),
    ]);

    return { data: { crew, members, stats } };
  });

  // Invite user to crew
  fastify.post<{
    Params: { id: string };
    Body: { inviteeId?: string };
  }>('/api/crews/:id/invite', {
    preHandler: [authenticate],
  }, async (request, reply) => {
    const userId = request.user!.userId;
    const { inviteeId } = request.body;

    if (!inviteeId) {
      return reply.status(400).send({ error: 'inviteeId is required' });
    }

    const invite = await crewsService.inviteToCrew(request.params.id, userId, inviteeId);
    reply.status(201);
    return { data: invite };
  });

  // Accept invite
  fastify.post<{
    Params: { id: string };
  }>('/api/crews/invites/:id/accept', {
    preHandler: [authenticate],
  }, async (request, reply) => {
    const userId = request.user!.userId;
    const member = await crewsService.acceptInvite(request.params.id, userId);
    return { data: member };
  });

  // Start crew war
  fastify.post<{
    Params: { id: string };
    Body: { defendingCrewId?: string; durationDays?: number };
  }>('/api/crews/:id/war', {
    preHandler: [authenticate],
  }, async (request, reply) => {
    const userId = request.user!.userId;
    const { defendingCrewId, durationDays } = request.body;

    // Verify user is owner/captain of the crew
    const userCrew = await crewsService.getUserCrew(userId);
    if (!userCrew || userCrew.crew.id !== request.params.id) {
      return reply.status(403).send({ error: 'You are not in this crew' });
    }

    if (userCrew.membership.role === 'member') {
      return reply.status(403).send({ error: 'Only owners and captains can start wars' });
    }

    if (!defendingCrewId) {
      return reply.status(400).send({ error: 'defendingCrewId is required' });
    }

    const war = await crewsService.startCrewWar(request.params.id, defendingCrewId, durationDays || 7);
    reply.status(201);
    return { data: war };
  });

  // Get crew wars
  fastify.get<{
    Params: { id: string };
  }>('/api/crews/:id/wars', {
    preHandler: [authenticate],
  }, async (request, reply) => {
    const wars = await crewsService.getCrewWars(request.params.id);
    return { data: wars };
  });
}

export * from './types';
export * from './service';
