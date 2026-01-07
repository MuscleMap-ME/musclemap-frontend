/**
 * Hangouts Routes
 *
 * Location-based community hubs API:
 * - Discover nearby hangouts
 * - Join/leave hangouts
 * - Create and view posts
 * - Membership management
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { authenticate, optionalAuth } from './auth';
import { hangoutService, HangoutRole } from '../../services/hangout.service';
import { geoService } from '../../services/geo.service';
import { loggers } from '../../lib/logger';

const log = loggers.core;

// Schemas
const createHangoutSchema = z.object({
  name: z.string().min(3).max(200),
  description: z.string().max(2000).optional(),
  typeId: z.number().int().positive(),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  address: z.string().max(500).optional(),
  city: z.string().max(100).optional(),
  countryCode: z.string().length(2).optional(),
  radiusMeters: z.number().int().min(100).max(10000).optional(),
  coverImageUrl: z.string().url().max(500).optional(),
});

const nearbyQuerySchema = z.object({
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
  radius: z.coerce.number().min(100).max(100000).optional().default(5000),
  typeId: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
  cursor: z.string().optional(),
});

const createPostSchema = z.object({
  content: z.string().min(1).max(10000),
  mediaUrls: z.array(z.string().url()).max(10).optional(),
  contentLang: z.string().min(2).max(5).optional(),
});

const paginationSchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
  offset: z.coerce.number().int().min(0).optional().default(0),
  cursor: z.string().optional(),
});

export async function registerHangoutRoutes(app: FastifyInstance) {
  // ============================================
  // HANGOUT TYPES
  // ============================================

  /**
   * Get all hangout types
   */
  app.get('/hangouts/types', async (request, reply) => {
    const types = await geoService.getTypes();
    return reply.send({ data: types });
  });

  // ============================================
  // DISCOVERY
  // ============================================

  /**
   * Find nearby hangouts
   */
  app.get('/hangouts/nearby', {
    preHandler: optionalAuth,
  }, async (request: FastifyRequest<{ Querystring: z.infer<typeof nearbyQuerySchema> }>, reply: FastifyReply) => {
    const query = nearbyQuerySchema.parse(request.query);

    const result = await geoService.findNearby({
      lat: query.lat,
      lng: query.lng,
      radiusM: query.radius,
      typeId: query.typeId,
      limit: query.limit,
      cursor: query.cursor,
      userId: request.user?.userId,
    });

    return reply.send({
      data: result.hangouts,
      pagination: {
        nextCursor: result.nextCursor,
        hasMore: !!result.nextCursor,
      },
    });
  });

  /**
   * Get geo stats for a region
   */
  app.get('/hangouts/stats', async (request: FastifyRequest<{
    Querystring: { lat: string; lng: string; radius?: string };
  }>, reply: FastifyReply) => {
    const lat = parseFloat(request.query.lat);
    const lng = parseFloat(request.query.lng);
    const radius = parseFloat(request.query.radius || '5000');

    if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      return reply.status(400).send({
        error: { code: 'VALIDATION', message: 'Invalid coordinates', statusCode: 400 },
      });
    }

    const stats = await geoService.getStats(lat, lng, radius);
    return reply.send({ data: stats });
  });

  // ============================================
  // HANGOUT CRUD
  // ============================================

  /**
   * Create a new hangout
   */
  app.post('/hangouts', {
    preHandler: authenticate,
  }, async (request: FastifyRequest<{ Body: z.infer<typeof createHangoutSchema> }>, reply: FastifyReply) => {
    const body = createHangoutSchema.parse(request.body);

    const hangout = await hangoutService.create({
      name: body.name,
      description: body.description,
      typeId: body.typeId,
      lat: body.lat,
      lng: body.lng,
      address: body.address,
      city: body.city,
      countryCode: body.countryCode,
      radiusMeters: body.radiusMeters,
      coverImageUrl: body.coverImageUrl,
      createdBy: request.user!.userId,
    });

    log.info({ hangoutId: hangout.id, userId: request.user!.userId }, 'Hangout created');

    return reply.status(201).send({ data: hangout });
  });

  /**
   * Get hangout by ID
   */
  app.get('/hangouts/:id', {
    preHandler: optionalAuth,
  }, async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const hangoutId = parseInt(request.params.id, 10);

    if (isNaN(hangoutId)) {
      return reply.status(400).send({
        error: { code: 'VALIDATION', message: 'Invalid hangout ID', statusCode: 400 },
      });
    }

    const hangout = await hangoutService.getById(hangoutId, request.user?.userId);

    if (!hangout) {
      return reply.status(404).send({
        error: { code: 'NOT_FOUND', message: 'Hangout not found', statusCode: 404 },
      });
    }

    return reply.send({ data: hangout });
  });

  // ============================================
  // MEMBERSHIP
  // ============================================

  /**
   * Join a hangout
   */
  app.post('/hangouts/:id/join', {
    preHandler: authenticate,
  }, async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const hangoutId = parseInt(request.params.id, 10);

    if (isNaN(hangoutId)) {
      return reply.status(400).send({
        error: { code: 'VALIDATION', message: 'Invalid hangout ID', statusCode: 400 },
      });
    }

    try {
      await hangoutService.join(hangoutId, request.user!.userId);
      return reply.send({ data: { success: true, message: 'Joined hangout' } });
    } catch (error: any) {
      if (error.name === 'ValidationError') {
        return reply.status(400).send({
          error: { code: 'VALIDATION', message: error.message, statusCode: 400 },
        });
      }
      if (error.name === 'NotFoundError') {
        return reply.status(404).send({
          error: { code: 'NOT_FOUND', message: error.message, statusCode: 404 },
        });
      }
      throw error;
    }
  });

  /**
   * Leave a hangout
   */
  app.post('/hangouts/:id/leave', {
    preHandler: authenticate,
  }, async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const hangoutId = parseInt(request.params.id, 10);

    if (isNaN(hangoutId)) {
      return reply.status(400).send({
        error: { code: 'VALIDATION', message: 'Invalid hangout ID', statusCode: 400 },
      });
    }

    try {
      await hangoutService.leave(hangoutId, request.user!.userId);
      return reply.send({ data: { success: true, message: 'Left hangout' } });
    } catch (error: any) {
      if (error.name === 'ValidationError') {
        return reply.status(400).send({
          error: { code: 'VALIDATION', message: error.message, statusCode: 400 },
        });
      }
      if (error.name === 'NotFoundError') {
        return reply.status(404).send({
          error: { code: 'NOT_FOUND', message: error.message, statusCode: 404 },
        });
      }
      throw error;
    }
  });

  /**
   * Get hangout members
   */
  app.get('/hangouts/:id/members', async (request: FastifyRequest<{
    Params: { id: string };
    Querystring: z.infer<typeof paginationSchema>;
  }>, reply: FastifyReply) => {
    const hangoutId = parseInt(request.params.id, 10);

    if (isNaN(hangoutId)) {
      return reply.status(400).send({
        error: { code: 'VALIDATION', message: 'Invalid hangout ID', statusCode: 400 },
      });
    }

    const query = paginationSchema.parse(request.query);
    const result = await hangoutService.getMembers(hangoutId, query);

    return reply.send({
      data: result.members,
      pagination: {
        total: result.total,
        limit: query.limit,
        offset: query.offset,
        hasMore: query.offset + result.members.length < result.total,
      },
    });
  });

  // ============================================
  // POSTS
  // ============================================

  /**
   * Create a post in a hangout (costs 1 credit)
   */
  app.post('/hangouts/:id/posts', {
    preHandler: authenticate,
  }, async (request: FastifyRequest<{
    Params: { id: string };
    Body: z.infer<typeof createPostSchema>;
  }>, reply: FastifyReply) => {
    const hangoutId = parseInt(request.params.id, 10);

    if (isNaN(hangoutId)) {
      return reply.status(400).send({
        error: { code: 'VALIDATION', message: 'Invalid hangout ID', statusCode: 400 },
      });
    }

    const body = createPostSchema.parse(request.body);

    try {
      const post = await hangoutService.createPost({
        hangoutId,
        authorId: request.user!.userId,
        content: body.content,
        mediaUrls: body.mediaUrls,
        contentLang: body.contentLang,
      });

      return reply.status(201).send({ data: post });
    } catch (error: any) {
      if (error.name === 'ValidationError') {
        return reply.status(400).send({
          error: { code: 'VALIDATION', message: error.message, statusCode: 400 },
        });
      }
      if (error.name === 'ForbiddenError') {
        return reply.status(403).send({
          error: { code: 'FORBIDDEN', message: error.message, statusCode: 403 },
        });
      }
      throw error;
    }
  });

  /**
   * Get posts from a hangout
   */
  app.get('/hangouts/:id/posts', async (request: FastifyRequest<{
    Params: { id: string };
    Querystring: z.infer<typeof paginationSchema>;
  }>, reply: FastifyReply) => {
    const hangoutId = parseInt(request.params.id, 10);

    if (isNaN(hangoutId)) {
      return reply.status(400).send({
        error: { code: 'VALIDATION', message: 'Invalid hangout ID', statusCode: 400 },
      });
    }

    const query = paginationSchema.parse(request.query);
    const result = await hangoutService.getPosts(hangoutId, { limit: query.limit, cursor: query.cursor });

    return reply.send({
      data: result.posts,
      pagination: {
        nextCursor: result.nextCursor,
        hasMore: !!result.nextCursor,
      },
    });
  });

  // ============================================
  // USER HANGOUTS
  // ============================================

  /**
   * Get current user's hangout memberships
   */
  app.get('/me/hangouts', {
    preHandler: authenticate,
  }, async (request: FastifyRequest<{
    Querystring: z.infer<typeof paginationSchema>;
  }>, reply: FastifyReply) => {
    const query = paginationSchema.parse(request.query);
    const result = await hangoutService.getUserMemberships(request.user!.userId, query);

    return reply.send({
      data: result.hangouts,
      pagination: {
        total: result.total,
        limit: query.limit,
        offset: query.offset,
        hasMore: query.offset + result.hangouts.length < result.total,
      },
    });
  });
}
