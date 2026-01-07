/**
 * Communities Routes (Fastify)
 *
 * Self-organized communities with:
 * - Create/manage communities
 * - Join/leave/membership management
 * - Events
 * - Bulletin boards
 */

import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { authenticate, optionalAuth } from './auth';
import {
  communitiesService,
  CommunityRole,
  CommunityType,
  GoalType,
  InstitutionType,
  CommunityPrivacy,
} from '../../modules/community/communities.service';
import { bulletinService } from '../../modules/community/bulletin.service';
import { loggers } from '../../lib/logger';

const log = loggers.core;

// Schemas
const createCommunitySchema = z.object({
  name: z.string().min(3).max(100),
  tagline: z.string().max(200).optional(),
  description: z.string().max(5000).optional(),
  communityType: z.enum(['goal', 'interest', 'institution', 'local', 'challenge']),
  goalType: z.enum(['weight_loss', 'muscle_gain', 'endurance', 'flexibility', 'strength', 'general_fitness']).optional(),
  institutionType: z.enum(['military', 'police', 'fire', 'medical', 'education', 'corporate']).optional(),
  archetypeId: z.number().int().positive().optional(),
  privacy: z.enum(['public', 'private', 'secret']).optional(),
  iconEmoji: z.string().max(10).optional(),
  accentColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  rules: z.string().max(10000).optional(),
  requiresApproval: z.boolean().optional(),
  allowMemberPosts: z.boolean().optional(),
});

const searchCommunitiesSchema = z.object({
  query: z.string().max(200).optional(),
  communityType: z.enum(['goal', 'interest', 'institution', 'local', 'challenge']).optional(),
  goalType: z.enum(['weight_loss', 'muscle_gain', 'endurance', 'flexibility', 'strength', 'general_fitness']).optional(),
  institutionType: z.enum(['military', 'police', 'fire', 'medical', 'education', 'corporate']).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  offset: z.coerce.number().int().min(0).optional(),
});

const createEventSchema = z.object({
  title: z.string().min(3).max(200),
  description: z.string().max(5000).optional(),
  eventType: z.enum(['meetup', 'challenge', 'workshop', 'competition', 'social']),
  startsAt: z.coerce.date(),
  endsAt: z.coerce.date().optional(),
  timezone: z.string().max(50).optional(),
  locationName: z.string().max(200).optional(),
  locationAddress: z.string().max(500).optional(),
  isVirtual: z.boolean().optional(),
  virtualUrl: z.string().url().optional(),
  maxParticipants: z.number().int().positive().optional(),
});

const updateMemberRoleSchema = z.object({
  role: z.enum(['member', 'moderator', 'admin', 'leader']),
});

const createPostSchema = z.object({
  title: z.string().min(3).max(300),
  content: z.string().min(1).max(50000),
  postType: z.enum(['discussion', 'question', 'announcement', 'poll', 'workout_share', 'milestone']).optional(),
  mediaUrls: z.array(z.string().url()).max(10).optional(),
});

// Role string to enum mapping
const roleStringToEnum: Record<string, CommunityRole> = {
  member: CommunityRole.MEMBER,
  moderator: CommunityRole.MODERATOR,
  admin: CommunityRole.ADMIN,
  leader: CommunityRole.LEADER,
};

export async function registerCommunitiesRoutes(app: FastifyInstance) {
  /**
   * POST /communities
   * Create a new community
   */
  app.post('/communities', { preHandler: authenticate }, async (request, reply) => {
    const userId = request.user!.userId;
    const body = createCommunitySchema.parse(request.body);

    const community = await communitiesService.create({
      name: body.name,
      tagline: body.tagline,
      description: body.description,
      communityType: body.communityType as CommunityType,
      goalType: body.goalType as GoalType | undefined,
      institutionType: body.institutionType as InstitutionType | undefined,
      archetypeId: body.archetypeId,
      privacy: body.privacy as CommunityPrivacy | undefined,
      iconEmoji: body.iconEmoji,
      accentColor: body.accentColor,
      rules: body.rules,
      requiresApproval: body.requiresApproval,
      allowMemberPosts: body.allowMemberPosts,
      createdBy: userId,
    });

    return reply.status(201).send({
      data: community,
    });
  });

  /**
   * GET /communities
   * Search/list communities
   */
  app.get('/communities', { preHandler: optionalAuth }, async (request, reply) => {
    const userId = request.user?.userId;
    const query = searchCommunitiesSchema.parse(request.query);

    const { communities, total } = await communitiesService.search(userId, {
      query: query.query,
      communityType: query.communityType as CommunityType | undefined,
      goalType: query.goalType as GoalType | undefined,
      institutionType: query.institutionType as InstitutionType | undefined,
      limit: query.limit || 20,
      offset: query.offset || 0,
    });

    return reply.send({
      data: communities,
      meta: { total },
    });
  });

  /**
   * GET /communities/my
   * Get user's communities
   */
  app.get('/communities/my', { preHandler: authenticate }, async (request, reply) => {
    const userId = request.user!.userId;
    const query = request.query as { limit?: string; offset?: string };

    const { communities, total } = await communitiesService.getUserCommunities(userId, {
      limit: query.limit ? parseInt(query.limit) : 50,
      offset: query.offset ? parseInt(query.offset) : 0,
    });

    return reply.send({
      data: communities,
      meta: { total },
    });
  });

  /**
   * GET /communities/:idOrSlug
   * Get a single community by ID or slug
   */
  app.get('/communities/:idOrSlug', { preHandler: optionalAuth }, async (request, reply) => {
    const { idOrSlug } = request.params as { idOrSlug: string };
    const userId = request.user?.userId;

    const community = await communitiesService.getById(idOrSlug, userId);

    if (!community) {
      return reply.status(404).send({
        error: { code: 'NOT_FOUND', message: 'Community not found', statusCode: 404 },
      });
    }

    return reply.send({
      data: community,
    });
  });

  /**
   * POST /communities/:id/join
   * Join a community
   */
  app.post('/communities/:id/join', { preHandler: authenticate }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const userId = request.user!.userId;

    const result = await communitiesService.join(parseInt(id), userId);

    return reply.send({
      data: {
        message: result.status === 'pending'
          ? 'Membership request submitted, awaiting approval'
          : 'Successfully joined community',
        status: result.status,
      },
    });
  });

  /**
   * POST /communities/:id/leave
   * Leave a community
   */
  app.post('/communities/:id/leave', { preHandler: authenticate }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const userId = request.user!.userId;

    await communitiesService.leave(parseInt(id), userId);

    return reply.send({
      data: { message: 'Successfully left community' },
    });
  });

  /**
   * GET /communities/:id/members
   * Get community members
   */
  app.get('/communities/:id/members', { preHandler: optionalAuth }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const query = request.query as {
      limit?: string;
      offset?: string;
      status?: string;
    };

    const { members, total } = await communitiesService.getMembers(parseInt(id), {
      limit: query.limit ? parseInt(query.limit) : 50,
      offset: query.offset ? parseInt(query.offset) : 0,
      status: query.status as any,
    });

    return reply.send({
      data: members,
      meta: { total },
    });
  });

  /**
   * PATCH /communities/:id/members/:userId/role
   * Update member role (moderator action)
   */
  app.patch('/communities/:id/members/:userId/role', { preHandler: authenticate }, async (request, reply) => {
    const { id, userId: targetUserId } = request.params as { id: string; userId: string };
    const actorUserId = request.user!.userId;
    const body = updateMemberRoleSchema.parse(request.body);

    await communitiesService.updateMemberRole(
      parseInt(id),
      targetUserId,
      roleStringToEnum[body.role],
      actorUserId
    );

    return reply.send({
      data: { message: 'Member role updated' },
    });
  });

  /**
   * POST /communities/:id/members/:userId/approve
   * Approve pending membership (moderator action)
   */
  app.post('/communities/:id/members/:userId/approve', { preHandler: authenticate }, async (request, reply) => {
    const { id, userId: targetUserId } = request.params as { id: string; userId: string };
    const actorUserId = request.user!.userId;

    await communitiesService.handleMembershipRequest(parseInt(id), targetUserId, true, actorUserId);

    return reply.send({
      data: { message: 'Membership approved' },
    });
  });

  /**
   * POST /communities/:id/members/:userId/reject
   * Reject pending membership (moderator action)
   */
  app.post('/communities/:id/members/:userId/reject', { preHandler: authenticate }, async (request, reply) => {
    const { id, userId: targetUserId } = request.params as { id: string; userId: string };
    const actorUserId = request.user!.userId;

    await communitiesService.handleMembershipRequest(parseInt(id), targetUserId, false, actorUserId);

    return reply.send({
      data: { message: 'Membership rejected' },
    });
  });

  // ========== Events ==========

  /**
   * POST /communities/:id/events
   * Create a community event
   */
  app.post('/communities/:id/events', { preHandler: authenticate }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const userId = request.user!.userId;
    const body = createEventSchema.parse(request.body);

    const event = await communitiesService.createEvent(parseInt(id), userId, {
      title: body.title,
      description: body.description,
      eventType: body.eventType,
      startsAt: body.startsAt,
      endsAt: body.endsAt,
      timezone: body.timezone,
      locationName: body.locationName,
      locationAddress: body.locationAddress,
      isVirtual: body.isVirtual,
      virtualUrl: body.virtualUrl,
      maxParticipants: body.maxParticipants,
    });

    return reply.status(201).send({
      data: event,
    });
  });

  /**
   * GET /communities/:id/events
   * Get community events
   */
  app.get('/communities/:id/events', { preHandler: optionalAuth }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const query = request.query as {
      upcoming?: string;
      limit?: string;
      offset?: string;
    };

    const events = await communitiesService.getEvents(parseInt(id), {
      upcoming: query.upcoming !== 'false',
      limit: query.limit ? parseInt(query.limit) : 20,
      offset: query.offset ? parseInt(query.offset) : 0,
    });

    return reply.send({
      data: events,
    });
  });

  // ========== Bulletin Board ==========

  /**
   * GET /communities/:id/posts
   * Get posts from the community's bulletin board
   */
  app.get('/communities/:id/posts', { preHandler: optionalAuth }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const userId = request.user?.userId;
    const query = request.query as {
      limit?: string;
      offset?: string;
      sortBy?: string;
      postType?: string;
    };

    // Get or create the bulletin board for this community
    const board = await bulletinService.getOrCreateBoard('community', parseInt(id));

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
   * POST /communities/:id/posts
   * Create a post in the community's bulletin board
   */
  app.post('/communities/:id/posts', { preHandler: authenticate }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const userId = request.user!.userId;
    const body = createPostSchema.parse(request.body);

    // Get or create the bulletin board
    const board = await bulletinService.getOrCreateBoard('community', parseInt(id));

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
