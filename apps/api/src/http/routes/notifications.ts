/**
 * Notifications Routes (Fastify)
 *
 * Routes for managing user notifications:
 * - List notifications (with filtering)
 * - Mark as read (single/bulk/all)
 * - Delete notifications
 * - Manage notification preferences
 */

import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { authenticate } from './auth';
import { NotificationService, NotificationCategory } from '../../services/notification.service';
import { loggers } from '../../lib/logger';

const log = loggers.http;

// Schemas
const markReadSchema = z.object({
  notificationIds: z.array(z.string().min(1)).min(1).max(100),
});

const updatePreferencesSchema = z.object({
  inAppEnabled: z.boolean().optional(),
  pushEnabled: z.boolean().optional(),
  emailEnabled: z.boolean().optional(),
  quietHoursStart: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  quietHoursEnd: z.string().regex(/^\d{2}:\d{2}$/).optional(),
});

const validCategories: NotificationCategory[] = [
  'verification',
  'social',
  'competition',
  'messaging',
  'achievements',
  'system',
];

export async function registerNotificationRoutes(app: FastifyInstance) {
  // ============================================
  // LIST NOTIFICATIONS
  // ============================================

  // Get notifications for current user
  app.get('/notifications', { preHandler: authenticate }, async (request, reply) => {
    const query = request.query as {
      limit?: string;
      offset?: string;
      category?: string;
      unreadOnly?: string;
    };

    const limit = Math.min(parseInt(query.limit || '50'), 100);
    const offset = parseInt(query.offset || '0');
    const unreadOnly = query.unreadOnly === 'true';

    // Validate category if provided
    let category: NotificationCategory | undefined;
    if (query.category) {
      if (!validCategories.includes(query.category as NotificationCategory)) {
        return reply.status(400).send({
          error: 'Invalid category',
          validCategories,
        });
      }
      category = query.category as NotificationCategory;
    }

    const result = await NotificationService.getForUser(request.user!.userId, {
      limit,
      offset,
      category,
      unreadOnly,
    });

    return reply.send({
      data: result.notifications,
      meta: {
        limit,
        offset,
        total: result.total,
        unreadCount: result.unreadCount,
      },
    });
  });

  // Get unread count
  app.get('/notifications/unread-count', { preHandler: authenticate }, async (request, reply) => {
    const count = await NotificationService.getUnreadCount(request.user!.userId);
    return reply.send({ data: { count } });
  });

  // ============================================
  // MARK AS READ
  // ============================================

  // Mark specific notifications as read
  app.post('/notifications/mark-read', { preHandler: authenticate }, async (request, reply) => {
    const parsed = markReadSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({
        error: 'Invalid request body',
        details: parsed.error.errors,
      });
    }

    const count = await NotificationService.markAsRead(
      request.user!.userId,
      parsed.data.notificationIds
    );

    return reply.send({
      data: { markedCount: count },
    });
  });

  // Mark all notifications as read
  app.post('/notifications/mark-all-read', { preHandler: authenticate }, async (request, reply) => {
    const query = request.query as { category?: string };

    // Validate category if provided
    let category: NotificationCategory | undefined;
    if (query.category) {
      if (!validCategories.includes(query.category as NotificationCategory)) {
        return reply.status(400).send({
          error: 'Invalid category',
          validCategories,
        });
      }
      category = query.category as NotificationCategory;
    }

    const count = await NotificationService.markAllAsRead(request.user!.userId, category);

    return reply.send({
      data: { markedCount: count },
    });
  });

  // ============================================
  // DELETE
  // ============================================

  // Delete a notification
  app.delete('/notifications/:id', { preHandler: authenticate }, async (request, reply) => {
    const { id } = request.params as { id: string };

    const deleted = await NotificationService.delete(request.user!.userId, id);

    if (!deleted) {
      return reply.status(404).send({
        error: 'Notification not found',
      });
    }

    return reply.send({
      data: { deleted: true },
    });
  });

  // ============================================
  // PREFERENCES
  // ============================================

  // Get preferences for a category
  app.get('/notifications/preferences/:category', { preHandler: authenticate }, async (request, reply) => {
    const { category } = request.params as { category: string };

    if (!validCategories.includes(category as NotificationCategory)) {
      return reply.status(400).send({
        error: 'Invalid category',
        validCategories,
      });
    }

    const prefs = await NotificationService.getPreferences(
      request.user!.userId,
      category as NotificationCategory
    );

    return reply.send({ data: prefs });
  });

  // Get all preferences
  app.get('/notifications/preferences', { preHandler: authenticate }, async (request, reply) => {
    const prefs = await Promise.all(
      validCategories.map((category) =>
        NotificationService.getPreferences(request.user!.userId, category)
      )
    );

    return reply.send({ data: prefs });
  });

  // Update preferences for a category
  app.put('/notifications/preferences/:category', { preHandler: authenticate }, async (request, reply) => {
    const { category } = request.params as { category: string };

    if (!validCategories.includes(category as NotificationCategory)) {
      return reply.status(400).send({
        error: 'Invalid category',
        validCategories,
      });
    }

    const parsed = updatePreferencesSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({
        error: 'Invalid request body',
        details: parsed.error.errors,
      });
    }

    const prefs = await NotificationService.updatePreferences(
      request.user!.userId,
      category as NotificationCategory,
      parsed.data
    );

    return reply.send({ data: prefs });
  });

  log.info('Notification routes registered');
}
