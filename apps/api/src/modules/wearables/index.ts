/**
 * Wearables Router
 *
 * REST API endpoints for wearable device integrations.
 */
import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { authenticate } from '../../http/routes/auth';
import * as wearablesService from './service';
import type { WearableProvider, HealthSyncPayload } from './types';

export function registerWearablesRoutes(fastify: FastifyInstance): void {
  // Get wearable connections and health summary
  fastify.get('/wearables', {
    preHandler: [authenticate],
  }, async (request: FastifyRequest, _reply: FastifyReply) => {
    const userId = request.user!.userId;
    const summary = await wearablesService.getHealthSummary(userId);
    return { data: summary };
  });

  // Connect a wearable provider (for OAuth-based providers)
  fastify.post<{
    Body: {
      provider?: WearableProvider;
      providerUserId?: string;
      accessToken?: string;
      refreshToken?: string;
      tokenExpiresAt?: string;
    };
  }>('/wearables/connect', {
    preHandler: [authenticate],
  }, async (request, reply) => {
    const userId = request.user!.userId;
    const { provider, providerUserId, accessToken, refreshToken, tokenExpiresAt } = request.body;

    if (!provider) {
      return reply.status(400).send({ error: 'Provider is required' });
    }

    const validProviders: WearableProvider[] = ['apple_health', 'fitbit', 'garmin', 'google_fit', 'whoop', 'oura'];
    if (!validProviders.includes(provider)) {
      return reply.status(400).send({ error: 'Invalid provider' });
    }

    const connection = await wearablesService.upsertConnection(userId, provider, {
      providerUserId,
      accessToken,
      refreshToken,
      tokenExpiresAt,
    });

    return { data: connection };
  });

  // Disconnect a wearable provider
  fastify.post<{
    Body: { provider?: WearableProvider };
  }>('/wearables/disconnect', {
    preHandler: [authenticate],
  }, async (request, reply) => {
    const userId = request.user!.userId;
    const { provider } = request.body;

    if (!provider) {
      return reply.status(400).send({ error: 'Provider is required' });
    }

    await wearablesService.disconnectProvider(userId, provider);
    return { success: true };
  });

  // Sync health data from a wearable
  fastify.post<{
    Body: { provider?: WearableProvider; data?: HealthSyncPayload };
  }>('/wearables/sync', {
    preHandler: [authenticate],
  }, async (request, reply) => {
    const userId = request.user!.userId;
    const { provider, data } = request.body;

    if (!provider || !data) {
      return reply.status(400).send({ error: 'Provider and data are required' });
    }

    const result = await wearablesService.syncHealthData(userId, provider, data);
    return { data: result };
  });

  // Get recent workouts from wearables
  fastify.get<{
    Querystring: { limit?: string };
  }>('/wearables/workouts', {
    preHandler: [authenticate],
  }, async (request, _reply) => {
    const userId = request.user!.userId;
    const limit = parseInt(request.query.limit || '10', 10);
    const workouts = await wearablesService.getRecentWearableWorkouts(userId, limit);
    return { data: { workouts } };
  });
}

export * from './types';
export * from './service';
