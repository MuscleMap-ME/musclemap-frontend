/**
 * Push Notifications Routes
 *
 * Endpoints for push notification management:
 * - Register/unregister tokens
 * - Get notification history
 * - Schedule notifications (admin)
 */

import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { authenticate } from './auth';
import { pushNotificationsService, Platform } from '../../modules/engagement';
import { loggers } from '../../lib/logger';

const log = loggers.http;

const registerTokenSchema = z.object({
  token: z.string().min(1),
  platform: z.enum(['ios', 'android', 'web'] as const),
});

const scheduleNotificationSchema = z.object({
  notificationType: z.enum([
    'streak_at_risk',
    'challenge_expiring',
    'rival_activity',
    'daily_reward',
    'event_starting',
    'workout_reminder',
    'weekly_digest',
    're_engagement',
  ] as const),
  scheduledFor: z.string().datetime(),
  payload: z.record(z.unknown()),
});

export async function registerPushNotificationRoutes(app: FastifyInstance) {
  // Register a push notification token
  app.post('/push/register', { preHandler: authenticate }, async (request, reply) => {
    const parsed = registerTokenSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({
        error: 'Invalid request body',
        details: parsed.error.errors,
      });
    }

    const token = await pushNotificationsService.registerToken(
      request.user!.userId,
      parsed.data.token,
      parsed.data.platform
    );

    return reply.send({
      data: token,
      message: 'Push notification token registered',
    });
  });

  // Unregister a push notification token
  app.delete('/push/unregister', { preHandler: authenticate }, async (request, reply) => {
    const body = request.body as { token?: string };

    if (!body?.token) {
      return reply.status(400).send({ error: 'Token is required' });
    }

    await pushNotificationsService.unregisterToken(request.user!.userId, body.token);
    return reply.send({ message: 'Push notification token unregistered' });
  });

  // Get user's active tokens
  app.get('/push/tokens', { preHandler: authenticate }, async (request, reply) => {
    const tokens = await pushNotificationsService.getActiveTokens(request.user!.userId);

    // Don't expose full tokens to client
    const safeTokens = tokens.map((t) => ({
      id: t.id,
      platform: t.platform,
      isActive: t.isActive,
      createdAt: t.createdAt,
      lastUsedAt: t.lastUsedAt,
      tokenPreview: t.token.slice(0, 8) + '...' + t.token.slice(-4),
    }));

    return reply.send({ data: safeTokens });
  });

  // Get notification history
  app.get('/push/history', { preHandler: authenticate }, async (request, reply) => {
    const query = request.query as { limit?: string };
    const limit = Math.min(100, Math.max(10, parseInt(query.limit || '50', 10)));

    const history = await pushNotificationsService.getNotificationHistory(
      request.user!.userId,
      limit
    );

    return reply.send({ data: history });
  });

  // Schedule a notification (self only)
  app.post('/push/schedule', { preHandler: authenticate }, async (request, reply) => {
    const parsed = scheduleNotificationSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({
        error: 'Invalid request body',
        details: parsed.error.errors,
      });
    }

    try {
      const notification = await pushNotificationsService.scheduleNotification(
        request.user!.userId,
        parsed.data.notificationType,
        new Date(parsed.data.scheduledFor),
        parsed.data.payload
      );

      return reply.send({
        data: notification,
        message: 'Notification scheduled',
      });
    } catch (error: any) {
      if (error.message?.includes('rate limit')) {
        return reply.status(429).send({ error: 'Too many notifications scheduled' });
      }
      throw error;
    }
  });

  // Cancel a scheduled notification
  app.delete('/push/schedule/:id', { preHandler: authenticate }, async (request, reply) => {
    const { id } = request.params as { id: string };

    await pushNotificationsService.cancelNotification(id);
    return reply.send({ message: 'Notification cancelled' });
  });

  // Admin: Get pending notifications ready to send
  app.get('/push/pending', { preHandler: authenticate }, async (request, reply) => {
    if (request.user?.role !== 'admin') {
      return reply.status(403).send({ error: 'Admin access required' });
    }

    const query = request.query as { limit?: string };
    const limit = Math.min(500, Math.max(10, parseInt(query.limit || '100', 10)));

    const pending = await pushNotificationsService.getPendingNotifications(limit);
    return reply.send({ data: pending });
  });

  // Admin: Mark notification as sent
  app.post('/push/mark-sent/:id', { preHandler: authenticate }, async (request, reply) => {
    if (request.user?.role !== 'admin') {
      return reply.status(403).send({ error: 'Admin access required' });
    }

    const { id } = request.params as { id: string };

    await pushNotificationsService.markAsSent(id);
    return reply.send({ message: 'Notification marked as sent' });
  });

  log.info('Push notification routes registered');
}
