/**
 * Events Routes
 *
 * Endpoints for time-limited engagement events:
 * - Get active events
 * - Join events
 * - Track progress
 * - Event history
 */

import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { authenticate, optionalAuth } from './auth';
import { eventsService, EventType } from '../../modules/engagement';
import { loggers } from '../../lib/logger';

const log = loggers.http;

const createEventSchema = z.object({
  eventType: z.enum(['flash_sale', 'double_credits', 'challenge_bonus', 'seasonal', 'community_goal'] as const),
  name: z.string().min(1).max(100),
  description: z.string().optional(),
  config: z.object({
    creditMultiplier: z.number().optional(),
    xpMultiplier: z.number().optional(),
    challengeMultiplier: z.number().optional(),
    discountPercent: z.number().optional(),
    communityTarget: z.number().optional(),
  }).passthrough(),
  startsAt: z.string().datetime(),
  endsAt: z.string().datetime(),
});

const updateProgressSchema = z.object({
  progress: z.record(z.unknown()),
});

export async function registerEventRoutes(app: FastifyInstance) {
  // Get all currently active events
  app.get('/events/active', async (request, reply) => {
    const events = await eventsService.getActiveEvents();
    return reply.send({ data: events });
  });

  // Get upcoming events
  app.get('/events/upcoming', async (request, reply) => {
    const query = request.query as { limit?: string };
    const limit = Math.min(20, Math.max(1, parseInt(query.limit || '10', 10)));

    const events = await eventsService.getUpcomingEvents(limit);
    return reply.send({ data: events });
  });

  // Get specific event
  app.get('/events/:id', async (request, reply) => {
    const { id } = request.params as { id: string };

    const event = await eventsService.getEvent(id);
    if (!event) {
      return reply.status(404).send({ error: 'Event not found' });
    }

    return reply.send({ data: event });
  });

  // Join an event
  app.post('/events/:id/join', { preHandler: authenticate }, async (request, reply) => {
    const { id } = request.params as { id: string };

    try {
      const participation = await eventsService.joinEvent(request.user!.userId, id);
      return reply.send({
        data: participation,
        message: 'Successfully joined event!',
      });
    } catch (error: any) {
      if (error.message?.includes('not found')) {
        return reply.status(404).send({ error: 'Event not found' });
      }
      if (error.message?.includes('not currently active')) {
        return reply.status(400).send({ error: 'Event is not currently active' });
      }
      throw error;
    }
  });

  // Get user's participation in an event
  app.get('/events/:id/participation', { preHandler: authenticate }, async (request, reply) => {
    const { id } = request.params as { id: string };

    const participation = await eventsService.getParticipation(request.user!.userId, id);
    if (!participation) {
      return reply.status(404).send({ error: 'Not participating in this event' });
    }

    return reply.send({ data: participation });
  });

  // Update event progress
  app.post('/events/:id/progress', { preHandler: authenticate }, async (request, reply) => {
    const { id } = request.params as { id: string };

    const parsed = updateProgressSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({
        error: 'Invalid request body',
        details: parsed.error.errors,
      });
    }

    const participation = await eventsService.updateProgress(
      request.user!.userId,
      id,
      parsed.data.progress
    );

    return reply.send({ data: participation });
  });

  // Get user's event history
  app.get('/events/history', { preHandler: authenticate }, async (request, reply) => {
    const query = request.query as { limit?: string };
    const limit = Math.min(50, Math.max(5, parseInt(query.limit || '20', 10)));

    const history = await eventsService.getEventHistory(request.user!.userId, limit);
    return reply.send({ data: history });
  });

  // Get current multipliers (for displaying bonus indicators)
  app.get('/events/multipliers', async (request, reply) => {
    const creditMultiplier = await eventsService.getCreditMultiplier();
    const xpMultiplier = await eventsService.getXpMultiplier();

    return reply.send({
      data: {
        creditMultiplier,
        xpMultiplier,
        hasActiveBonus: creditMultiplier > 1 || xpMultiplier > 1,
      },
    });
  });

  // Admin: Create event (requires admin role)
  app.post('/events', { preHandler: authenticate }, async (request, reply) => {
    // Check admin role
    if (request.user?.role !== 'admin') {
      return reply.status(403).send({ error: 'Admin access required' });
    }

    const parsed = createEventSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({
        error: 'Invalid request body',
        details: parsed.error.errors,
      });
    }

    const event = await eventsService.createEvent({
      eventType: parsed.data.eventType,
      name: parsed.data.name,
      description: parsed.data.description,
      config: parsed.data.config,
      startsAt: new Date(parsed.data.startsAt),
      endsAt: new Date(parsed.data.endsAt),
    });

    return reply.status(201).send({
      data: event,
      message: 'Event created successfully',
    });
  });

  // Admin: Deactivate event
  app.delete('/events/:id', { preHandler: authenticate }, async (request, reply) => {
    if (request.user?.role !== 'admin') {
      return reply.status(403).send({ error: 'Admin access required' });
    }

    const { id } = request.params as { id: string };
    await eventsService.deactivateEvent(id);

    return reply.send({ message: 'Event deactivated' });
  });

  log.info('Event routes registered');
}
