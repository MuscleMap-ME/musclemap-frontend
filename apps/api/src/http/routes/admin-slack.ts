/**
 * Admin Slack Integration Routes
 *
 * Manages Slack webhook configuration and notifications for the Empire dashboard.
 */

import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { authenticate } from './auth';
import { SlackNotifications, saveSlackConfig } from '../../modules/notifications/slack.service';
import { logger } from '../../lib/logger';

const log = logger.child({ module: 'admin-slack-routes' });

// Notification types schema
const notificationTypes = z.enum([
  'system_alert',
  'deployment',
  'new_user',
  'achievement',
  'milestone',
  'bug_report',
  'feedback',
  'error',
  'daily_digest',
  'weekly_digest',
  'economy_event',
  'community_activity',
  'message',
  'security'
]);

// Slack config schema
const slackConfigSchema = z.object({
  webhook_url: z.string().url().startsWith('https://hooks.slack.com/'),
  enabled_notifications: z.array(notificationTypes).default([
    'system_alert', 'deployment', 'new_user', 'achievement',
    'bug_report', 'feedback', 'error', 'daily_digest', 'security'
  ]),
  quiet_hours: z.object({
    start: z.number().min(0).max(23),
    end: z.number().min(0).max(23)
  }).optional(),
  digest_time: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  mention_on_critical: z.boolean().default(true),
  user_id_to_mention: z.string().optional()
});

const adminSlackRoutes: FastifyPluginAsync = async (fastify) => {
  // All routes require admin authentication
  fastify.addHook('preHandler', authenticate);

  /**
   * GET /api/admin/slack/config
   * Get current Slack configuration
   */
  fastify.get('/config', async (request, reply) => {
    try {
      const user = (request as any).user;
      if (!user?.isAdmin) {
        return reply.status(403).send({ error: 'Admin access required' });
      }

      const config = await SlackNotifications.getConfig();

      if (!config) {
        return reply.send({
          configured: false,
          config: null
        });
      }

      // Don't expose full webhook URL for security
      return reply.send({
        configured: true,
        config: {
          ...config,
          webhook_url: config.webhook_url.replace(/\/[^\/]+$/, '/****')
        }
      });
    } catch (err) {
      log.error({ error: (err as Error).message }, 'Failed to get Slack config');
      return reply.status(500).send({ error: 'Failed to get configuration' });
    }
  });

  /**
   * POST /api/admin/slack/config
   * Save Slack configuration
   */
  fastify.post('/config', async (request, reply) => {
    try {
      const user = (request as any).user;
      if (!user?.isAdmin) {
        return reply.status(403).send({ error: 'Admin access required' });
      }

      const body = slackConfigSchema.parse(request.body);

      const success = await saveSlackConfig(body);

      if (!success) {
        return reply.status(500).send({ error: 'Failed to save configuration' });
      }

      log.info({ userId: user.id }, 'Slack config updated');

      return reply.send({
        success: true,
        message: 'Slack configuration saved'
      });
    } catch (err) {
      if (err instanceof z.ZodError) {
        return reply.status(400).send({ error: 'Invalid configuration', details: err.errors });
      }
      log.error({ error: (err as Error).message }, 'Failed to save Slack config');
      return reply.status(500).send({ error: 'Failed to save configuration' });
    }
  });

  /**
   * POST /api/admin/slack/test
   * Test Slack connection
   */
  fastify.post('/test', async (request, reply) => {
    try {
      const user = (request as any).user;
      if (!user?.isAdmin) {
        return reply.status(403).send({ error: 'Admin access required' });
      }

      const body = z.object({
        webhook_url: z.string().url().optional()
      }).parse(request.body || {});

      const result = await SlackNotifications.testConnection(body.webhook_url);

      return reply.send(result);
    } catch (err) {
      log.error({ error: (err as Error).message }, 'Slack test failed');
      return reply.status(500).send({ error: 'Test failed', details: (err as Error).message });
    }
  });

  /**
   * POST /api/admin/slack/send-digest
   * Manually trigger a digest
   */
  fastify.post('/send-digest', async (request, reply) => {
    try {
      const user = (request as any).user;
      if (!user?.isAdmin) {
        return reply.status(403).send({ error: 'Admin access required' });
      }

      const body = z.object({
        type: z.enum(['daily', 'weekly'])
      }).parse(request.body);

      let success = false;
      if (body.type === 'daily') {
        success = await SlackNotifications.dailyDigest();
      } else {
        success = await SlackNotifications.weeklyDigest();
      }

      return reply.send({
        success,
        message: success ? `${body.type} digest sent` : 'Failed to send digest'
      });
    } catch (err) {
      log.error({ error: (err as Error).message }, 'Failed to send digest');
      return reply.status(500).send({ error: 'Failed to send digest' });
    }
  });

  /**
   * POST /api/admin/slack/notify
   * Send a custom notification (for testing)
   */
  fastify.post('/notify', async (request, reply) => {
    try {
      const user = (request as any).user;
      if (!user?.isAdmin) {
        return reply.status(403).send({ error: 'Admin access required' });
      }

      const body = z.object({
        type: notificationTypes,
        data: z.record(z.any())
      }).parse(request.body);

      let success = false;

      switch (body.type) {
        case 'system_alert':
          success = await SlackNotifications.systemAlert(body.data as any);
          break;
        case 'deployment':
          success = await SlackNotifications.deployment(body.data as any);
          break;
        case 'new_user':
          success = await SlackNotifications.newUser(body.data as any);
          break;
        case 'achievement':
          success = await SlackNotifications.achievement(body.data as any);
          break;
        case 'bug_report':
          success = await SlackNotifications.bugReport(body.data as any);
          break;
        case 'feedback':
          success = await SlackNotifications.feedback(body.data as any);
          break;
        case 'error':
          success = await SlackNotifications.error(body.data as any);
          break;
        case 'security':
          success = await SlackNotifications.security(body.data as any);
          break;
        case 'economy_event':
          success = await SlackNotifications.economy(body.data as any);
          break;
        case 'community_activity':
          success = await SlackNotifications.community(body.data as any);
          break;
        case 'message':
          success = await SlackNotifications.message(body.data as any);
          break;
        default:
          return reply.status(400).send({ error: 'Unknown notification type' });
      }

      return reply.send({ success });
    } catch (err) {
      log.error({ error: (err as Error).message }, 'Failed to send notification');
      return reply.status(500).send({ error: 'Failed to send notification' });
    }
  });

  /**
   * GET /api/admin/slack/notification-types
   * Get available notification types with descriptions
   */
  fastify.get('/notification-types', async (request, reply) => {
    const user = (request as any).user;
    if (!user?.isAdmin) {
      return reply.status(403).send({ error: 'Admin access required' });
    }

    return reply.send({
      types: [
        { id: 'system_alert', name: 'System Alerts', description: 'CPU, memory, and error rate threshold alerts', icon: '🚨' },
        { id: 'deployment', name: 'Deployments', description: 'Deployment start, completion, and failure notifications', icon: '🚀' },
        { id: 'new_user', name: 'New Users', description: 'Notifications when new users sign up', icon: '👋' },
        { id: 'achievement', name: 'Achievements', description: 'User achievements, level ups, and milestones', icon: '🏆' },
        { id: 'bug_report', name: 'Bug Reports', description: 'New bug reports from users', icon: '🐛' },
        { id: 'feedback', name: 'Feedback', description: 'User feedback and feature requests', icon: '💬' },
        { id: 'error', name: 'Application Errors', description: 'Uncaught errors and exceptions', icon: '❌' },
        { id: 'daily_digest', name: 'Daily Digest', description: 'Daily summary of metrics and activity', icon: '☀️' },
        { id: 'weekly_digest', name: 'Weekly Digest', description: 'Weekly summary with trends and top users', icon: '📅' },
        { id: 'economy_event', name: 'Economy Events', description: 'Large transactions and tier changes', icon: '💰' },
        { id: 'community_activity', name: 'Community Activity', description: 'Crew events and competitions', icon: '👥' },
        { id: 'message', name: 'Direct Messages', description: 'Messages sent to you', icon: '✉️' },
        { id: 'security', name: 'Security Alerts', description: 'Failed logins, suspicious activity, blocked IPs', icon: '🛡️' }
      ]
    });
  });
};

export default adminSlackRoutes;
