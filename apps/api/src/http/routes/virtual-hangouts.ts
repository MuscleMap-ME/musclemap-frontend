/**
 * Virtual Hangouts Routes (Fastify)
 *
 * Themed virtual community spaces:
 * - List and browse hangouts by theme
 * - Join/leave hangouts
 * - View members and activity
 * - Share workouts
 */

import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { authenticate, optionalAuth } from './auth';
import {
  virtualHangoutsService,
  HangoutMemberRole,
} from '../../modules/community/virtual-hangouts.service';
import { bulletinService } from '../../modules/community/bulletin.service';
import { loggers } from '../../lib/logger';

const log = loggers.core;

// Schemas
const joinHangoutSchema = z.object({
  showInMemberList: z.boolean().optional(),
  receiveNotifications: z.boolean().optional(),
});

const updateMembershipSchema = z.object({
  showInMemberList: z.boolean().optional(),
  receiveNotifications: z.boolean().optional(),
});

const shareWorkoutSchema = z.object({
  workoutId: z.string(),
  message: z.string().max(500).optional(),
});

const createPostSchema = z.object({
  title: z.string().min(3).max(300),
  content: z.string().min(1).max(50000),
  postType: z.enum(['discussion', 'question', 'announcement', 'poll', 'workout_share', 'milestone']).optional(),
  mediaUrls: z.array(z.string().url()).max(10).optional(),
});

export async function registerVirtualHangoutsRoutes(app: FastifyInstance) {
  /**
   * GET /hangouts/themes
   * Get all available hangout themes
   */
  app.get('/hangouts/themes', async (request, reply) => {
    const themes = await virtualHangoutsService.getThemes();

    return reply.send({
      data: themes,
    });
  });

  /**
   * GET /hangouts
   * List all virtual hangouts (optionally filtered by theme)
   */
  app.get('/hangouts', { preHandler: optionalAuth }, async (request, reply) => {
    const query = request.query as {
      themeId?: string;
      limit?: string;
      offset?: string;
    };

    const userId = request.user?.userId;
    const { hangouts, total } = await virtualHangoutsService.getHangouts(userId, {
      themeId: query.themeId ? parseInt(query.themeId) : undefined,
      limit: query.limit ? parseInt(query.limit) : 50,
      offset: query.offset ? parseInt(query.offset) : 0,
    });

    return reply.send({
      data: hangouts,
      meta: { total },
    });
  });

  /**
   * GET /hangouts/recommended
   * Get recommended hangouts based on user's archetype/goals
   */
  app.get('/hangouts/recommended', { preHandler: authenticate }, async (request, reply) => {
    const userId = request.user!.userId;
    const query = request.query as { limit?: string };

    const hangouts = await virtualHangoutsService.getRecommendedHangouts(userId, {
      limit: query.limit ? parseInt(query.limit) : 5,
    });

    return reply.send({
      data: hangouts,
    });
  });

  /**
   * GET /hangouts/my
   * Get user's hangout memberships
   */
  app.get('/hangouts/my', { preHandler: authenticate }, async (request, reply) => {
    const userId = request.user!.userId;
    const query = request.query as { limit?: string; offset?: string };

    const { hangouts, total } = await virtualHangoutsService.getUserHangouts(userId, {
      limit: query.limit ? parseInt(query.limit) : 50,
      offset: query.offset ? parseInt(query.offset) : 0,
    });

    return reply.send({
      data: hangouts,
      meta: { total },
    });
  });

  /**
   * GET /hangouts/:id
   * Get a single hangout by ID
   */
  app.get('/hangouts/:id', { preHandler: optionalAuth }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const userId = request.user?.userId;

    const hangout = await virtualHangoutsService.getHangoutById(parseInt(id), userId);

    if (!hangout) {
      return reply.status(404).send({
        error: { code: 'NOT_FOUND', message: 'Hangout not found', statusCode: 404 },
      });
    }

    return reply.send({
      data: hangout,
    });
  });

  /**
   * POST /hangouts/:id/join
   * Join a virtual hangout
   */
  app.post('/hangouts/:id/join', { preHandler: authenticate }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const userId = request.user!.userId;
    const body = joinHangoutSchema.parse(request.body);

    await virtualHangoutsService.joinHangout(parseInt(id), userId, body);

    return reply.send({
      data: { message: 'Successfully joined hangout' },
    });
  });

  /**
   * POST /hangouts/:id/leave
   * Leave a virtual hangout
   */
  app.post('/hangouts/:id/leave', { preHandler: authenticate }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const userId = request.user!.userId;

    await virtualHangoutsService.leaveHangout(parseInt(id), userId);

    return reply.send({
      data: { message: 'Successfully left hangout' },
    });
  });

  /**
   * PATCH /hangouts/:id/membership
   * Update membership settings
   */
  app.patch('/hangouts/:id/membership', { preHandler: authenticate }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const userId = request.user!.userId;
    const body = updateMembershipSchema.parse(request.body);

    await virtualHangoutsService.updateMembershipSettings(parseInt(id), userId, body);

    return reply.send({
      data: { message: 'Membership settings updated' },
    });
  });

  /**
   * GET /hangouts/:id/members
   * Get hangout members
   */
  app.get('/hangouts/:id/members', { preHandler: optionalAuth }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const query = request.query as { limit?: string; offset?: string };

    const { members, total } = await virtualHangoutsService.getMembers(parseInt(id), {
      limit: query.limit ? parseInt(query.limit) : 50,
      offset: query.offset ? parseInt(query.offset) : 0,
    });

    return reply.send({
      data: members,
      meta: { total },
    });
  });

  /**
   * GET /hangouts/:id/activity
   * Get recent activity in a hangout
   */
  app.get('/hangouts/:id/activity', { preHandler: optionalAuth }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const query = request.query as { limit?: string; offset?: string };

    const activity = await virtualHangoutsService.getActivity(parseInt(id), {
      limit: query.limit ? parseInt(query.limit) : 50,
      offset: query.offset ? parseInt(query.offset) : 0,
    });

    return reply.send({
      data: activity,
    });
  });

  /**
   * POST /hangouts/:id/share-workout
   * Share a workout to a hangout
   */
  app.post('/hangouts/:id/share-workout', { preHandler: authenticate }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const userId = request.user!.userId;
    const body = shareWorkoutSchema.parse(request.body);

    await virtualHangoutsService.shareWorkout(parseInt(id), userId, body.workoutId, body.message);

    return reply.send({
      data: { message: 'Workout shared successfully' },
    });
  });

  /**
   * POST /hangouts/:id/heartbeat
   * Update last active time (call periodically while viewing hangout)
   */
  app.post('/hangouts/:id/heartbeat', { preHandler: authenticate }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const userId = request.user!.userId;

    await virtualHangoutsService.updateLastActive(parseInt(id), userId);

    return reply.send({
      data: { acknowledged: true },
    });
  });

  // ========== Bulletin Board Routes ==========

  /**
   * GET /hangouts/:id/posts
   * Get posts from the hangout's bulletin board
   */
  app.get('/hangouts/:id/posts', { preHandler: optionalAuth }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const userId = request.user?.userId;
    const query = request.query as {
      limit?: string;
      offset?: string;
      sortBy?: string;
      postType?: string;
    };

    // Get or create the bulletin board for this hangout
    const board = await bulletinService.getOrCreateBoard('hangout', parseInt(id));

    const { posts, total } = await bulletinService.getPosts(board.id, userId, {
      limit: query.limit ? parseInt(query.limit) : 20,
      offset: query.offset ? parseInt(query.offset) : 0,
      sortBy: (query.sortBy as 'hot' | 'new' | 'top') || 'hot',
      postType: query.postType as any,
    });

    return reply.send({
      data: posts,
      meta: { total, boardId: board.id },
    });
  });

  /**
   * POST /hangouts/:id/posts
   * Create a post in the hangout's bulletin board
   */
  app.post('/hangouts/:id/posts', { preHandler: authenticate }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const userId = request.user!.userId;
    const body = createPostSchema.parse(request.body);

    // Get or create the bulletin board
    const board = await bulletinService.getOrCreateBoard('hangout', parseInt(id));

    const post = await bulletinService.createPost({
      boardId: board.id,
      authorId: userId,
      title: body.title,
      content: body.content,
      postType: body.postType,
      mediaUrls: body.mediaUrls,
    });

    return reply.status(201).send({
      data: post,
    });
  });
}
