/**
 * Archetype Communities Routes
 *
 * Endpoints for archetype-based community management
 */

import { FastifyPluginAsync } from 'fastify';
import { archetypeCommunitiesService } from '../../modules/archetype-communities';
import { authenticate } from './auth';
import { loggers } from '../../lib/logger';

const log = loggers.http.child({ module: 'archetype-communities-routes' });

const archetypeCommunitiesRoutes: FastifyPluginAsync = async (fastify) => {
  // All routes require authentication
  fastify.addHook('preHandler', authenticate);

  // ===========================================
  // USER ENDPOINTS
  // ===========================================

  /**
   * Get suggested communities based on user's archetype
   */
  fastify.get('/archetype/suggested-communities', async (request, _reply) => {
    const userId = request.user!.userId;

    const communities = await archetypeCommunitiesService.getSuggestedCommunities(userId);
    return { success: true, data: communities };
  });

  /**
   * Handle archetype change and auto-join communities
   */
  fastify.post<{
    Body: {
      newArchetypeId: string;
      oldArchetypeId?: string;
      leaveOldCommunities?: boolean;
    };
  }>('/archetype/change', async (request, _reply) => {
    const userId = request.user!.userId;
    const { newArchetypeId, oldArchetypeId, leaveOldCommunities = false } = request.body;

    const result = await archetypeCommunitiesService.handleArchetypeChange(
      userId,
      oldArchetypeId || null,
      newArchetypeId,
      { leaveOldCommunities }
    );
    return { success: true, data: result };
  });

  // ===========================================
  // ADMIN ENDPOINTS
  // ===========================================

  /**
   * Get linked communities for an archetype
   */
  fastify.get<{ Params: { archetypeId: string } }>(
    '/archetypes/:archetypeId/communities',
    async (request, _reply) => {
      const { archetypeId } = request.params;

      const communities = await archetypeCommunitiesService.getLinkedCommunities(archetypeId);
      return { success: true, data: communities };
    }
  );

  /**
   * Get default (auto-join) communities for an archetype
   */
  fastify.get<{ Params: { archetypeId: string } }>(
    '/archetypes/:archetypeId/communities/default',
    async (request, _reply) => {
      const { archetypeId } = request.params;

      const communities = await archetypeCommunitiesService.getDefaultCommunities(archetypeId);
      return { success: true, data: communities };
    }
  );

  /**
   * Link a community to an archetype
   */
  fastify.post<{
    Params: { archetypeId: string };
    Body: {
      communityId: number;
      isDefault?: boolean;
      priority?: number;
    };
  }>('/archetypes/:archetypeId/communities', async (request, _reply) => {
    const { archetypeId } = request.params;
    const { communityId, isDefault, priority } = request.body;

    const link = await archetypeCommunitiesService.linkCommunity(archetypeId, communityId, {
      isDefault,
      priority,
    });
    return { success: true, data: link };
  });

  /**
   * Bulk link communities to an archetype
   */
  fastify.post<{
    Params: { archetypeId: string };
    Body: {
      links: Array<{ communityId: number; isDefault?: boolean; priority?: number }>;
    };
  }>('/archetypes/:archetypeId/communities/bulk', async (request, _reply) => {
    const { archetypeId } = request.params;
    const { links } = request.body;

    const count = await archetypeCommunitiesService.bulkLinkCommunities(archetypeId, links);
    return { success: true, data: { linked: count } };
  });

  /**
   * Unlink a community from an archetype
   */
  fastify.delete<{ Params: { archetypeId: string; communityId: string } }>(
    '/archetypes/:archetypeId/communities/:communityId',
    async (request, _reply) => {
      const { archetypeId, communityId } = request.params;

      await archetypeCommunitiesService.unlinkCommunity(archetypeId, parseInt(communityId));
      return { success: true };
    }
  );

  /**
   * Get all archetypes with their linked communities
   */
  fastify.get('/archetypes/communities', async (_request, _reply) => {
    const archetypes = await archetypeCommunitiesService.getAllArchetypesWithCommunities();
    return { success: true, data: archetypes };
  });

  log.info('Archetype communities routes registered');
};

export default archetypeCommunitiesRoutes;
