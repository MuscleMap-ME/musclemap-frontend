/**
 * Social Graph Routes
 *
 * Endpoints for follows, friendships, and buddy matching
 */

import { FastifyPluginAsync } from 'fastify';
import { socialService } from '../../modules/social';
import { authenticate } from './auth';
import { loggers } from '../../lib/logger';

const log = loggers.http.child({ module: 'social-routes' });

const socialRoutes: FastifyPluginAsync = async (fastify) => {
  // All routes require authentication
  fastify.addHook('preHandler', authenticate);

  // ===========================================
  // FOLLOWS
  // ===========================================

  fastify.post<{ Params: { userId: string } }>('/users/:userId/follow', async (request, _reply) => {
    const { userId: targetUserId } = request.params;
    const followerId = request.user!.userId;

    const follow = await socialService.follow(followerId, targetUserId);
    return { success: true, data: follow };
  });

  fastify.delete<{ Params: { userId: string } }>('/users/:userId/follow', async (request, _reply) => {
    const { userId: targetUserId } = request.params;
    const followerId = request.user!.userId;

    await socialService.unfollow(followerId, targetUserId);
    return { success: true };
  });

  fastify.get<{ Params: { userId: string } }>('/users/:userId/followers', async (request, _reply) => {
    const { userId } = request.params;
    const { limit = '50', offset = '0' } = request.query as any;

    const result = await socialService.getFollowers(userId, {
      limit: parseInt(limit),
      offset: parseInt(offset),
    });
    return { success: true, data: result };
  });

  fastify.get<{ Params: { userId: string } }>('/users/:userId/following', async (request, _reply) => {
    const { userId } = request.params;
    const { limit = '50', offset = '0' } = request.query as any;

    const result = await socialService.getFollowing(userId, {
      limit: parseInt(limit),
      offset: parseInt(offset),
    });
    return { success: true, data: result };
  });

  fastify.get<{ Params: { userId: string } }>('/users/:userId/is-following', async (request, _reply) => {
    const { userId: targetUserId } = request.params;
    const followerId = request.user!.userId;

    const isFollowing = await socialService.isFollowing(followerId, targetUserId);
    return { success: true, data: { isFollowing } };
  });

  // ===========================================
  // FRIENDSHIPS
  // ===========================================

  fastify.post<{ Params: { userId: string }; Body: { hangoutId?: number; communityId?: number } }>(
    '/users/:userId/friend-request',
    async (request, _reply) => {
      const { userId: toUserId } = request.params;
      const fromUserId = request.user!.userId;
      const { hangoutId, communityId } = request.body || {};

      const friendship = await socialService.sendFriendRequest(fromUserId, toUserId, {
        hangoutId,
        communityId,
      });
      return { success: true, data: friendship };
    }
  );

  fastify.post<{ Params: { friendshipId: string } }>(
    '/friend-requests/:friendshipId/accept',
    async (request, _reply) => {
      const { friendshipId } = request.params;
      const userId = request.user!.userId;

      await socialService.acceptFriendRequest(userId, friendshipId);
      return { success: true };
    }
  );

  fastify.post<{ Params: { friendshipId: string } }>(
    '/friend-requests/:friendshipId/decline',
    async (request, _reply) => {
      const { friendshipId } = request.params;
      const userId = request.user!.userId;

      await socialService.declineFriendRequest(userId, friendshipId);
      return { success: true };
    }
  );

  fastify.get('/friend-requests', async (request, _reply) => {
    const userId = request.user!.userId;
    const requests = await socialService.getPendingFriendRequests(userId);
    return { success: true, data: requests };
  });

  fastify.get('/friends', async (request, _reply) => {
    const userId = request.user!.userId;
    const { limit = '50', offset = '0' } = request.query as any;

    const result = await socialService.getFriends(userId, {
      limit: parseInt(limit),
      offset: parseInt(offset),
    });
    return { success: true, data: result };
  });

  fastify.delete<{ Params: { friendId: string } }>('/friends/:friendId', async (request, _reply) => {
    const { friendId } = request.params;
    const userId = request.user!.userId;

    await socialService.removeFriend(userId, friendId);
    return { success: true };
  });

  fastify.post<{ Params: { userId: string } }>('/users/:userId/block', async (request, _reply) => {
    const { userId: blockedUserId } = request.params;
    const userId = request.user!.userId;

    await socialService.blockUser(userId, blockedUserId);
    return { success: true };
  });

  // ===========================================
  // BUDDY MATCHING
  // ===========================================

  fastify.get('/buddy/preferences', async (request, _reply) => {
    const userId = request.user!.userId;
    const prefs = await socialService.getBuddyPreferences(userId);
    return { success: true, data: prefs };
  });

  fastify.put('/buddy/preferences', async (request, _reply) => {
    const userId = request.user!.userId;
    const prefs = await socialService.updateBuddyPreferences(userId, request.body as any);
    return { success: true, data: prefs };
  });

  fastify.get('/buddy/matches', async (request, _reply) => {
    const userId = request.user!.userId;
    const { limit = '20' } = request.query as any;

    const matches = await socialService.findBuddyMatches(userId, { limit: parseInt(limit) });
    return { success: true, data: matches };
  });

  fastify.post<{ Params: { userId: string }; Body: { message?: string } }>(
    '/users/:userId/buddy-request',
    async (request, _reply) => {
      const { userId: receiverId } = request.params;
      const senderId = request.user!.userId;
      const { message } = request.body || {};

      const buddyRequest = await socialService.sendBuddyRequest(senderId, receiverId, message);
      return { success: true, data: buddyRequest };
    }
  );

  fastify.get('/buddy/requests', async (request, _reply) => {
    const userId = request.user!.userId;
    const requests = await socialService.getPendingBuddyRequests(userId);
    return { success: true, data: requests };
  });

  fastify.post<{ Params: { requestId: string } }>(
    '/buddy/requests/:requestId/accept',
    async (request, _reply) => {
      const { requestId } = request.params;
      const userId = request.user!.userId;

      const pair = await socialService.acceptBuddyRequest(userId, requestId);
      return { success: true, data: pair };
    }
  );

  fastify.post<{ Params: { requestId: string } }>(
    '/buddy/requests/:requestId/decline',
    async (request, _reply) => {
      const { requestId } = request.params;
      const userId = request.user!.userId;

      await socialService.declineBuddyRequest(userId, requestId);
      return { success: true };
    }
  );

  fastify.get('/buddy/pairs', async (request, _reply) => {
    const userId = request.user!.userId;
    const pairs = await socialService.getBuddyPairs(userId);
    return { success: true, data: pairs };
  });

  log.info('Social routes registered');
};

export default socialRoutes;
