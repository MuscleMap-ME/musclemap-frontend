/**
 * Community Resources Routes
 *
 * Endpoints for knowledge base and shared artifacts
 */

import { FastifyPluginAsync } from 'fastify';
import { communityResourcesService, CommunityResource } from '../../modules/community-resources';
import { authenticate } from './auth';
import { loggers } from '../../lib/logger';

const log = loggers.http.child({ module: 'community-resources-routes' });

const communityResourcesRoutes: FastifyPluginAsync = async (fastify) => {
  // All routes require authentication
  fastify.addHook('preHandler', authenticate);

  // ===========================================
  // RESOURCE CRUD
  // ===========================================

  fastify.get<{ Params: { communityId: string } }>(
    '/communities/:communityId/resources',
    async (request, reply) => {
      const { communityId } = request.params;
      const userId = request.user!.userId;
      const {
        resourceType,
        category,
        tags,
        isPinned,
        searchQuery,
        limit = '20',
        offset = '0',
        sortBy = 'newest',
      } = request.query as any;

      const result = await communityResourcesService.searchResources(
        {
          communityId: parseInt(communityId),
          resourceType,
          category,
          tags: tags ? tags.split(',') : undefined,
          isPinned: isPinned === 'true' ? true : isPinned === 'false' ? false : undefined,
          searchQuery,
          limit: parseInt(limit),
          offset: parseInt(offset),
          sortBy,
        },
        userId
      );
      return { success: true, data: result };
    }
  );

  fastify.get<{ Params: { communityId: string } }>(
    '/communities/:communityId/resources/pinned',
    async (request, reply) => {
      const { communityId } = request.params;
      const userId = request.user!.userId;

      const resources = await communityResourcesService.getPinnedResources(parseInt(communityId), userId);
      return { success: true, data: resources };
    }
  );

  fastify.get<{ Params: { communityId: string } }>(
    '/communities/:communityId/resources/categories',
    async (request, reply) => {
      const { communityId } = request.params;

      const categories = await communityResourcesService.getCategories(parseInt(communityId));
      return { success: true, data: categories };
    }
  );

  fastify.get<{ Params: { resourceId: string } }>('/resources/:resourceId', async (request, reply) => {
    const { resourceId } = request.params;
    const userId = request.user!.userId;

    const resource = await communityResourcesService.getResource(resourceId, userId);

    if (!resource) {
      return reply.status(404).send({ success: false, error: 'Resource not found' });
    }

    // Record view
    await communityResourcesService.recordView(resourceId);

    return { success: true, data: resource };
  });

  fastify.post<{
    Params: { communityId: string };
    Body: {
      title: string;
      description?: string;
      resourceType: CommunityResource['resourceType'];
      content?: string;
      url?: string;
      fileUrl?: string;
      fileType?: string;
      fileSizeBytes?: number;
      category?: string;
      tags?: string[];
      status?: CommunityResource['status'];
    };
  }>('/communities/:communityId/resources', async (request, reply) => {
    const { communityId } = request.params;
    const authorId = request.user!.userId;

    const resource = await communityResourcesService.createResource(
      parseInt(communityId),
      authorId,
      request.body
    );
    return { success: true, data: resource };
  });

  fastify.put<{
    Params: { resourceId: string };
    Body: {
      title?: string;
      description?: string;
      content?: string;
      url?: string;
      category?: string;
      tags?: string[];
      status?: CommunityResource['status'];
    };
  }>('/resources/:resourceId', async (request, reply) => {
    const { resourceId } = request.params;
    const authorId = request.user!.userId;

    await communityResourcesService.updateResource(resourceId, authorId, request.body);
    return { success: true };
  });

  fastify.delete<{ Params: { resourceId: string } }>('/resources/:resourceId', async (request, reply) => {
    const { resourceId } = request.params;
    const userId = request.user!.userId;

    // TODO: Check if user is admin for isAdmin flag
    await communityResourcesService.deleteResource(resourceId, userId, false);
    return { success: true };
  });

  // ===========================================
  // PINNING
  // ===========================================

  fastify.post<{ Params: { resourceId: string } }>('/resources/:resourceId/pin', async (request, reply) => {
    const { resourceId } = request.params;
    const userId = request.user!.userId;

    await communityResourcesService.pinResource(resourceId, userId);
    return { success: true };
  });

  fastify.delete<{ Params: { resourceId: string } }>('/resources/:resourceId/pin', async (request, reply) => {
    const { resourceId } = request.params;

    await communityResourcesService.unpinResource(resourceId);
    return { success: true };
  });

  // ===========================================
  // HELPFUL VOTES
  // ===========================================

  fastify.post<{ Params: { resourceId: string } }>('/resources/:resourceId/helpful', async (request, reply) => {
    const { resourceId } = request.params;
    const userId = request.user!.userId;

    await communityResourcesService.markHelpful(resourceId, userId);
    return { success: true };
  });

  fastify.delete<{ Params: { resourceId: string } }>('/resources/:resourceId/helpful', async (request, reply) => {
    const { resourceId } = request.params;
    const userId = request.user!.userId;

    await communityResourcesService.removeHelpful(resourceId, userId);
    return { success: true };
  });

  // ===========================================
  // POPULAR/TRENDING
  // ===========================================

  fastify.get('/resources/most-helpful', async (request, reply) => {
    const { limit = '10', communityIds } = request.query as any;

    const resources = await communityResourcesService.getMostHelpful({
      limit: parseInt(limit),
      communityIds: communityIds ? communityIds.split(',').map(Number) : undefined,
    });
    return { success: true, data: resources };
  });

  log.info('Community resources routes registered');
};

export default communityResourcesRoutes;
