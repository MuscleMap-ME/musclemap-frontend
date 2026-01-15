/**
 * Wearables Router
 *
 * REST API endpoints for wearable device integrations.
 * Supports Apple Health, Google Fit (Health Connect), Fitbit, Garmin, Whoop, and Oura.
 */
import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { authenticate } from '../../http/routes/auth';
import * as wearablesService from './service';
import type { WearableProvider, HealthSyncPayload, SyncOptions, ConflictResolutionStrategy } from './types';

export function registerWearablesRoutes(fastify: FastifyInstance): void {
  // Get wearable connections and health summary
  fastify.get('/wearables', {
    preHandler: [authenticate],
  }, async (request: FastifyRequest, _reply: FastifyReply) => {
    const userId = request.user!.userId;
    const summary = await wearablesService.getHealthSummary(userId);
    return { data: summary };
  });

  // Get sync status for all connected providers
  fastify.get('/wearables/status', {
    preHandler: [authenticate],
  }, async (request: FastifyRequest, _reply: FastifyReply) => {
    const userId = request.user!.userId;
    const syncStatus = await wearablesService.getSyncStatus(userId);
    return { data: { syncStatus } };
  });

  // Get sync status for a specific provider
  fastify.get<{
    Params: { provider: string };
  }>('/wearables/status/:provider', {
    preHandler: [authenticate],
  }, async (request, reply) => {
    const userId = request.user!.userId;
    const { provider } = request.params;

    const validProviders: WearableProvider[] = ['apple_health', 'fitbit', 'garmin', 'google_fit', 'whoop', 'oura'];
    if (!validProviders.includes(provider as WearableProvider)) {
      return reply.status(400).send({ error: { code: 'INVALID_PROVIDER', message: 'Invalid provider' } });
    }

    const status = await wearablesService.getProviderSyncStatus(userId, provider as WearableProvider);
    if (!status) {
      return reply.status(404).send({ error: { code: 'NOT_CONNECTED', message: 'Provider not connected' } });
    }

    return { data: status };
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
      return reply.status(400).send({ error: { code: 'MISSING_PROVIDER', message: 'Provider is required' } });
    }

    const validProviders: WearableProvider[] = ['apple_health', 'fitbit', 'garmin', 'google_fit', 'whoop', 'oura'];
    if (!validProviders.includes(provider)) {
      return reply.status(400).send({ error: { code: 'INVALID_PROVIDER', message: 'Invalid provider' } });
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
      return reply.status(400).send({ error: { code: 'MISSING_PROVIDER', message: 'Provider is required' } });
    }

    await wearablesService.disconnectProvider(userId, provider);
    return { success: true };
  });

  // Sync health data from a wearable with optional conflict resolution strategy
  fastify.post<{
    Body: {
      provider?: WearableProvider;
      data?: HealthSyncPayload;
      options?: {
        conflictStrategy?: ConflictResolutionStrategy;
        syncDirection?: 'upload' | 'download' | 'bidirectional';
        startDate?: string;
        endDate?: string;
      };
    };
  }>('/wearables/sync', {
    preHandler: [authenticate],
  }, async (request, reply) => {
    const userId = request.user!.userId;
    const { provider, data, options } = request.body;

    if (!provider || !data) {
      return reply.status(400).send({ error: { code: 'MISSING_PARAMS', message: 'Provider and data are required' } });
    }

    const syncOptions: SyncOptions = {
      conflictStrategy: options?.conflictStrategy || 'newest_wins',
      syncDirection: options?.syncDirection || 'upload',
      startDate: options?.startDate,
      endDate: options?.endDate,
    };

    try {
      const result = await wearablesService.syncHealthData(userId, provider, data, syncOptions);
      return { data: result };
    } catch (error) {
      return reply.status(500).send({
        error: {
          code: 'SYNC_FAILED',
          message: error instanceof Error ? error.message : 'Sync failed',
        },
      });
    }
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

  // Get workouts for export to wearable (bi-directional sync)
  fastify.get<{
    Querystring: { startDate?: string; endDate?: string; limit?: string };
  }>('/wearables/export', {
    preHandler: [authenticate],
  }, async (request, _reply) => {
    const userId = request.user!.userId;
    const { startDate, endDate, limit } = request.query;

    const workouts = await wearablesService.getWorkoutsForExport(userId, {
      startDate,
      endDate,
      limit: limit ? parseInt(limit, 10) : 50,
    });

    return { data: { workouts } };
  });
}

export * from './types';
export * from './service';
