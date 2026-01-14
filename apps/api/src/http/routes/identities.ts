/**
 * Identities Routes (formerly Archetypes)
 *
 * Endpoints for identity-based user classification and community management.
 * Identities represent "who you want to become" - body types, athletic identities, etc.
 */

import { FastifyPluginAsync } from 'fastify';
import { identityCommunitiesService } from '../../modules/identity-communities';
import { authenticate } from './auth';
import { db } from '../../db/client';
import { loggers } from '../../lib/logger';

const log = loggers.http.child({ module: 'identities-routes' });

const identitiesRoutes: FastifyPluginAsync = async (fastify) => {
  // ===========================================
  // PUBLIC ENDPOINTS
  // ===========================================

  /**
   * GET /identities
   * Get all available identities
   */
  fastify.get('/identities', async (_request, _reply) => {
    const identities = await identityCommunitiesService.getAllIdentities();
    return { success: true, data: identities };
  });

  /**
   * GET /identities/categories
   * Get all identity categories
   */
  fastify.get('/identities/categories', async (_request, _reply) => {
    const rows = await db.queryAll<{
      id: string;
      name: string;
      description: string | null;
      icon: string | null;
      display_order: number;
    }>('SELECT * FROM identity_categories ORDER BY display_order ASC');

    const categories = rows.map((r) => ({
      id: r.id,
      name: r.name,
      description: r.description,
      icon: r.icon,
      displayOrder: r.display_order,
    }));

    return { success: true, data: categories };
  });

  /**
   * GET /identities/categories/:categoryId
   * Get identities in a specific category
   */
  fastify.get<{ Params: { categoryId: string } }>(
    '/identities/categories/:categoryId',
    async (request, _reply) => {
      const { categoryId } = request.params;
      const identities = await identityCommunitiesService.getIdentitiesByCategory(categoryId);
      return { success: true, data: identities };
    }
  );

  /**
   * GET /identities/:id
   * Get a specific identity by ID
   */
  fastify.get<{ Params: { id: string } }>('/identities/:id', async (request, reply) => {
    const { id } = request.params;
    const identity = await identityCommunitiesService.getIdentityById(id);

    if (!identity) {
      return reply.status(404).send({
        error: { code: 'NOT_FOUND', message: 'Identity not found', statusCode: 404 },
      });
    }

    return { success: true, data: identity };
  });

  // ===========================================
  // AUTHENTICATED ENDPOINTS
  // ===========================================

  /**
   * GET /identities/me
   * Get current user's identity
   */
  fastify.get('/identities/me', { preHandler: authenticate }, async (request, _reply) => {
    const userId = request.user!.userId;

    const user = await db.queryOne<{ current_identity_id: string | null }>(
      'SELECT current_identity_id FROM users WHERE id = $1',
      [userId]
    );

    if (!user?.current_identity_id) {
      return { success: true, data: null };
    }

    const identity = await identityCommunitiesService.getIdentityById(user.current_identity_id);
    return { success: true, data: identity };
  });

  /**
   * POST /identities/select
   * Select/change user's identity
   */
  fastify.post<{
    Body: {
      identityId: string;
      leaveOldCommunities?: boolean;
    };
  }>('/identities/select', { preHandler: authenticate }, async (request, reply) => {
    const userId = request.user!.userId;
    const { identityId, leaveOldCommunities = false } = request.body;

    // Verify identity exists
    const identity = await identityCommunitiesService.getIdentityById(identityId);
    if (!identity) {
      return reply.status(404).send({
        error: { code: 'NOT_FOUND', message: 'Identity not found', statusCode: 404 },
      });
    }

    // Get current identity
    const user = await db.queryOne<{ current_identity_id: string | null }>(
      'SELECT current_identity_id FROM users WHERE id = $1',
      [userId]
    );

    const oldIdentityId = user?.current_identity_id || null;

    // Handle identity change (updates user and manages communities)
    const result = await identityCommunitiesService.handleIdentityChange(
      userId,
      oldIdentityId,
      identityId,
      { leaveOldCommunities }
    );

    log.info({ userId, oldIdentityId, newIdentityId: identityId }, 'User changed identity');

    return {
      success: true,
      data: {
        identity,
        communitiesJoined: result.joined.length,
        communitiesLeft: result.left.length,
      },
    };
  });

  /**
   * GET /identities/suggested-communities
   * Get suggested communities based on user's identity
   */
  fastify.get(
    '/identities/suggested-communities',
    { preHandler: authenticate },
    async (request, _reply) => {
      const userId = request.user!.userId;
      const communities = await identityCommunitiesService.getSuggestedCommunities(userId);
      return { success: true, data: communities };
    }
  );

  // ===========================================
  // ADMIN ENDPOINTS
  // ===========================================

  /**
   * GET /identities/:identityId/communities
   * Get linked communities for an identity
   */
  fastify.get<{ Params: { identityId: string } }>(
    '/identities/:identityId/communities',
    async (request, _reply) => {
      const { identityId } = request.params;
      const communities = await identityCommunitiesService.getLinkedCommunities(identityId);
      return { success: true, data: communities };
    }
  );

  /**
   * GET /identities/:identityId/communities/default
   * Get default (auto-join) communities for an identity
   */
  fastify.get<{ Params: { identityId: string } }>(
    '/identities/:identityId/communities/default',
    async (request, _reply) => {
      const { identityId } = request.params;
      const communities = await identityCommunitiesService.getDefaultCommunities(identityId);
      return { success: true, data: communities };
    }
  );

  /**
   * POST /identities/:identityId/communities
   * Link a community to an identity (admin)
   */
  fastify.post<{
    Params: { identityId: string };
    Body: {
      communityId: number;
      isDefault?: boolean;
      priority?: number;
    };
  }>(
    '/identities/:identityId/communities',
    { preHandler: authenticate },
    async (request, _reply) => {
      const { identityId } = request.params;
      const { communityId, isDefault, priority } = request.body;

      const link = await identityCommunitiesService.linkCommunity(identityId, communityId, {
        isDefault,
        priority,
      });
      return { success: true, data: link };
    }
  );

  /**
   * POST /identities/:identityId/communities/bulk
   * Bulk link communities to an identity (admin)
   */
  fastify.post<{
    Params: { identityId: string };
    Body: {
      links: Array<{ communityId: number; isDefault?: boolean; priority?: number }>;
    };
  }>(
    '/identities/:identityId/communities/bulk',
    { preHandler: authenticate },
    async (request, _reply) => {
      const { identityId } = request.params;
      const { links } = request.body;

      const count = await identityCommunitiesService.bulkLinkCommunities(identityId, links);
      return { success: true, data: { linked: count } };
    }
  );

  /**
   * DELETE /identities/:identityId/communities/:communityId
   * Unlink a community from an identity (admin)
   */
  fastify.delete<{ Params: { identityId: string; communityId: string } }>(
    '/identities/:identityId/communities/:communityId',
    { preHandler: authenticate },
    async (request, _reply) => {
      const { identityId, communityId } = request.params;
      await identityCommunitiesService.unlinkCommunity(identityId, parseInt(communityId));
      return { success: true };
    }
  );

  /**
   * GET /identities/all-with-communities
   * Get all identities with their linked communities
   */
  fastify.get('/identities/all-with-communities', async (_request, _reply) => {
    const identities = await identityCommunitiesService.getAllIdentitiesWithCommunities();
    return { success: true, data: identities };
  });

  log.info('Identities routes registered');
};

export default identitiesRoutes;
