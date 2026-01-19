/**
 * Admin Alerts Routes
 *
 * Handles alert configuration and management:
 * - CRUD operations for alert rules
 * - Alert firing history
 * - Test fire alerts
 * - Notification channel management (email, slack, webhook)
 *
 * All routes require admin authentication.
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { query, queryOne, queryAll } from '../../db/client';
import { authenticate, requireAdmin } from './auth';
import { loggers } from '../../lib/logger';
import crypto from 'crypto';
import { sendEmail, isEmailConfigured } from '../../services/email.service';

const log = loggers.api;

// ============================================
// SCHEMAS
// ============================================

const AlertCondition = z.enum(['gt', 'lt', 'eq', 'change_percent']);

const CreateAlertRuleSchema = z.object({
  name: z.string().min(1).max(255),
  metric: z.string().min(1).max(255),
  condition: AlertCondition,
  threshold: z.number(),
  channels: z.array(z.string()).min(1),
  enabled: z.boolean().default(true),
  cooldown_minutes: z.number().int().min(0).default(15),
});

const UpdateAlertRuleSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  metric: z.string().min(1).max(255).optional(),
  condition: AlertCondition.optional(),
  threshold: z.number().optional(),
  channels: z.array(z.string()).min(1).optional(),
  enabled: z.boolean().optional(),
  cooldown_minutes: z.number().int().min(0).optional(),
});

const ChannelType = z.enum(['email', 'slack', 'webhook']);

const ChannelConfigSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('email'),
    addresses: z.array(z.string().email()).min(1),
  }),
  z.object({
    type: z.literal('slack'),
    webhook_url: z.string().url(),
    channel: z.string().optional(),
  }),
  z.object({
    type: z.literal('webhook'),
    url: z.string().url(),
    headers: z.record(z.string()).optional(),
    method: z.enum(['POST', 'PUT']).default('POST'),
  }),
]);

const CreateChannelSchema = z.object({
  name: z.string().min(1).max(255),
  type: ChannelType,
  config: z.record(z.unknown()),
});

const AlertHistoryQuerySchema = z.object({
  rule_id: z.string().optional(),
  cursor: z.string().optional(),
  limit: z.coerce.number().min(1).max(100).default(50),
});

// ============================================
// TYPES
// ============================================

interface AlertRuleRow {
  id: string;
  name: string;
  metric: string;
  condition: string;
  threshold: number;
  channels: string[];
  enabled: boolean;
  cooldown_minutes: number;
  last_fired_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

interface AlertChannelRow {
  id: string;
  type: string;
  config: Record<string, unknown>;
  name: string;
  created_at: Date;
  updated_at: Date;
}

interface AlertHistoryRow {
  id: string;
  rule_id: string;
  rule_name: string;
  metric: string;
  condition: string;
  threshold: number;
  actual_value: number;
  channels_notified: string[];
  fired_at: Date;
  resolved_at: Date | null;
  metadata: Record<string, unknown> | null;
}

// ============================================
// HELPERS
// ============================================

function generateId(prefix: string): string {
  return `${prefix}_${crypto.randomBytes(12).toString('hex')}`;
}

function formatAlertRule(row: AlertRuleRow) {
  return {
    id: row.id,
    name: row.name,
    metric: row.metric,
    condition: row.condition,
    threshold: row.threshold,
    channels: row.channels,
    enabled: row.enabled,
    cooldownMinutes: row.cooldown_minutes,
    lastFiredAt: row.last_fired_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function formatAlertChannel(row: AlertChannelRow) {
  return {
    id: row.id,
    type: row.type,
    config: row.config,
    name: row.name,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function formatAlertHistory(row: AlertHistoryRow) {
  return {
    id: row.id,
    ruleId: row.rule_id,
    ruleName: row.rule_name,
    metric: row.metric,
    condition: row.condition,
    threshold: row.threshold,
    actualValue: row.actual_value,
    channelsNotified: row.channels_notified,
    firedAt: row.fired_at,
    resolvedAt: row.resolved_at,
    metadata: row.metadata,
  };
}

/**
 * Evaluate if an alert condition is met
 */
function _evaluateCondition(
  condition: string,
  threshold: number,
  actualValue: number,
  previousValue?: number
): boolean {
  switch (condition) {
    case 'gt':
      return actualValue > threshold;
    case 'lt':
      return actualValue < threshold;
    case 'eq':
      return actualValue === threshold;
    case 'change_percent':
      if (previousValue === undefined || previousValue === 0) return false;
      const changePercent = Math.abs((actualValue - previousValue) / previousValue) * 100;
      return changePercent > threshold;
    default:
      return false;
  }
}

/**
 * Format alert condition for display
 */
function formatCondition(condition: string, threshold: number): string {
  switch (condition) {
    case 'gt':
      return `> ${threshold}`;
    case 'lt':
      return `< ${threshold}`;
    case 'eq':
      return `= ${threshold}`;
    case 'change_percent':
      return `changed by more than ${threshold}%`;
    default:
      return `${condition} ${threshold}`;
  }
}

/**
 * Send email alert notification
 */
async function sendEmailAlert(
  config: { addresses: string[] },
  alert: { name: string; metric: string; condition: string; threshold: number; actualValue: number }
): Promise<boolean> {
  if (!isEmailConfigured()) {
    log.warn('Email service not configured - RESEND_API_KEY not set, skipping email alert');
    return false;
  }

  const baseUrl = process.env.APP_URL || 'https://musclemap.me';
  const conditionText = formatCondition(alert.condition, alert.threshold);

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background: #f5f5f5;">
      <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: white; border-radius: 8px; padding: 24px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
          <div style="text-align: center; margin-bottom: 24px;">
            <div style="font-size: 48px; margin-bottom: 16px;">&#x1F6A8;</div>
            <h1 style="color: #ef4444; margin: 0; font-size: 24px;">
              Alert: ${escapeHtml(alert.name)}
            </h1>
          </div>

          <div style="background: #fef2f2; border-radius: 8px; padding: 16px; margin: 24px 0; border-left: 4px solid #ef4444;">
            <p style="margin: 0 0 8px; color: #666; font-size: 14px;">
              <strong>Metric:</strong> ${escapeHtml(alert.metric)}
            </p>
            <p style="margin: 0 0 8px; color: #666; font-size: 14px;">
              <strong>Condition:</strong> ${escapeHtml(conditionText)}
            </p>
            <p style="margin: 0; color: #ef4444; font-size: 18px; font-weight: bold;">
              <strong>Actual Value:</strong> ${alert.actualValue}
            </p>
          </div>

          <div style="text-align: center; margin-top: 32px;">
            <a href="${baseUrl}/empire/alerts"
               style="background: #0066FF; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 500; display: inline-block;">
              View Alert Dashboard
            </a>
          </div>

          <p style="color: #666; font-size: 12px; text-align: center; margin-top: 24px;">
            Triggered at ${new Date().toISOString()}
          </p>
        </div>

        <p style="color: #999; font-size: 12px; text-align: center; margin-top: 16px;">
          This is an automated alert from MuscleMap monitoring.
        </p>
      </div>
    </body>
    </html>
  `;

  const text = `
Alert: ${alert.name}

Metric: ${alert.metric}
Condition: ${conditionText}
Actual Value: ${alert.actualValue}

Triggered at: ${new Date().toISOString()}

View Alert Dashboard: ${baseUrl}/empire/alerts
  `;

  // Send to all configured addresses
  let allSuccess = true;
  for (const address of config.addresses) {
    const result = await sendEmail({
      to: address,
      subject: `[ALERT] ${alert.name} - ${alert.metric} ${conditionText}`,
      html,
      text,
    });

    if (!result.success) {
      log.error({ address, error: result.error }, 'Failed to send email alert');
      allSuccess = false;
    } else {
      log.info({ address, emailId: result.id }, 'Email alert sent successfully');
    }
  }

  return allSuccess;
}

/**
 * Send Slack webhook alert notification
 */
async function sendSlackAlert(
  config: { webhook_url: string; channel?: string },
  alert: { name: string; metric: string; condition: string; threshold: number; actualValue: number }
): Promise<boolean> {
  const conditionText = formatCondition(alert.condition, alert.threshold);
  const baseUrl = process.env.APP_URL || 'https://musclemap.me';

  // Slack Block Kit message format
  const payload = {
    ...(config.channel ? { channel: config.channel } : {}),
    blocks: [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: `\u{1F6A8} Alert: ${alert.name}`,
          emoji: true,
        },
      },
      {
        type: 'section',
        fields: [
          {
            type: 'mrkdwn',
            text: `*Metric:*\n${alert.metric}`,
          },
          {
            type: 'mrkdwn',
            text: `*Condition:*\n${conditionText}`,
          },
          {
            type: 'mrkdwn',
            text: `*Actual Value:*\n\`${alert.actualValue}\``,
          },
          {
            type: 'mrkdwn',
            text: `*Threshold:*\n\`${alert.threshold}\``,
          },
        ],
      },
      {
        type: 'context',
        elements: [
          {
            type: 'mrkdwn',
            text: `Triggered at ${new Date().toISOString()}`,
          },
        ],
      },
      {
        type: 'actions',
        elements: [
          {
            type: 'button',
            text: {
              type: 'plain_text',
              text: 'View Dashboard',
              emoji: true,
            },
            url: `${baseUrl}/empire/alerts`,
          },
        ],
      },
    ],
  };

  try {
    const response = await fetch(config.webhook_url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      log.error(
        { webhookUrl: config.webhook_url, status: response.status, error: errorText },
        'Failed to send Slack alert'
      );
      return false;
    }

    log.info({ webhookUrl: config.webhook_url }, 'Slack alert sent successfully');
    return true;
  } catch (err) {
    log.error({ webhookUrl: config.webhook_url, error: (err as Error).message }, 'Slack webhook error');
    return false;
  }
}

/**
 * Send generic webhook alert notification
 */
async function sendWebhookAlert(
  config: { url: string; headers?: Record<string, string>; method?: 'POST' | 'PUT' },
  alert: { name: string; metric: string; condition: string; threshold: number; actualValue: number }
): Promise<boolean> {
  const payload = {
    alert: {
      name: alert.name,
      metric: alert.metric,
      condition: alert.condition,
      threshold: alert.threshold,
      actualValue: alert.actualValue,
      conditionMet: true,
    },
    timestamp: new Date().toISOString(),
    source: 'musclemap',
    environment: process.env.NODE_ENV || 'development',
  };

  try {
    const response = await fetch(config.url, {
      method: config.method || 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'MuscleMap-Alert-System/1.0',
        ...(config.headers || {}),
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      log.error({ url: config.url, status: response.status, error: errorText }, 'Failed to send webhook alert');
      return false;
    }

    log.info({ url: config.url, status: response.status }, 'Webhook alert sent successfully');
    return true;
  } catch (err) {
    log.error({ url: config.url, error: (err as Error).message }, 'Webhook error');
    return false;
  }
}

/**
 * Escape HTML special characters
 */
function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  };
  return text.replace(/[&<>"']/g, (m) => map[m]);
}

/**
 * Send notifications to channels
 */
async function notifyChannels(
  channelIds: string[],
  alert: { name: string; metric: string; condition: string; threshold: number; actualValue: number }
): Promise<string[]> {
  const notifiedChannels: string[] = [];

  for (const channelId of channelIds) {
    const channel = await queryOne<AlertChannelRow>(
      'SELECT * FROM alert_channels WHERE id = $1',
      [channelId]
    );

    if (!channel) continue;

    try {
      let success = false;

      switch (channel.type) {
        case 'email': {
          const emailConfig = channel.config as { addresses: string[] };
          if (!emailConfig.addresses || emailConfig.addresses.length === 0) {
            log.warn({ channelId }, 'Email channel has no configured addresses');
            break;
          }
          success = await sendEmailAlert(emailConfig, alert);
          break;
        }

        case 'slack': {
          const slackConfig = channel.config as { webhook_url: string; channel?: string };
          if (!slackConfig.webhook_url) {
            log.warn({ channelId }, 'Slack channel has no configured webhook URL');
            break;
          }
          success = await sendSlackAlert(slackConfig, alert);
          break;
        }

        case 'webhook': {
          const webhookConfig = channel.config as {
            url: string;
            headers?: Record<string, string>;
            method?: 'POST' | 'PUT';
          };
          if (!webhookConfig.url) {
            log.warn({ channelId }, 'Webhook channel has no configured URL');
            break;
          }
          success = await sendWebhookAlert(webhookConfig, alert);
          break;
        }

        default:
          log.warn({ channelId, type: channel.type }, 'Unknown channel type');
      }

      if (success) {
        notifiedChannels.push(channelId);
      }
    } catch (err) {
      log.error({ channelId, error: (err as Error).message }, 'Failed to notify channel');
    }
  }

  return notifiedChannels;
}

// ============================================
// ROUTES
// ============================================

export default async function adminAlertsRoutes(app: FastifyInstance): Promise<void> {
  /**
   * GET /admin/alerts/rules
   * List all alert rules
   */
  app.get(
    '/admin/alerts/rules',
    { preHandler: [authenticate, requireAdmin] },
    async (_request: FastifyRequest, reply: FastifyReply) => {
      const rules = await queryAll<AlertRuleRow>(`
        SELECT * FROM alert_rules
        ORDER BY created_at DESC
      `);

      return reply.send({
        items: rules.map(formatAlertRule),
        total: rules.length,
      });
    }
  );

  /**
   * POST /admin/alerts/rules
   * Create a new alert rule
   */
  app.post(
    '/admin/alerts/rules',
    { preHandler: [authenticate, requireAdmin] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const body = CreateAlertRuleSchema.parse(request.body);
      const user = request.user as { userId: string };
      const id = generateId('alert_rule');

      // Validate that all channel IDs exist
      if (body.channels.length > 0) {
        const existingChannels = await queryAll<{ id: string }>(
          'SELECT id FROM alert_channels WHERE id = ANY($1)',
          [body.channels]
        );

        if (existingChannels.length !== body.channels.length) {
          return reply.status(400).send({
            error: {
              code: 'INVALID_CHANNELS',
              message: 'One or more channel IDs do not exist',
              statusCode: 400,
            },
          });
        }
      }

      await query(
        `INSERT INTO alert_rules (id, name, metric, condition, threshold, channels, enabled, cooldown_minutes)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [id, body.name, body.metric, body.condition, body.threshold, body.channels, body.enabled, body.cooldown_minutes]
      );

      const rule = await queryOne<AlertRuleRow>('SELECT * FROM alert_rules WHERE id = $1', [id]);

      log.info({ ruleId: id, adminId: user.userId }, 'Alert rule created');

      return reply.status(201).send({
        data: rule ? formatAlertRule(rule) : null,
      });
    }
  );

  /**
   * PUT /admin/alerts/rules/:id
   * Update an alert rule
   */
  app.put<{ Params: { id: string } }>(
    '/admin/alerts/rules/:id',
    { preHandler: [authenticate, requireAdmin] },
    async (request, reply) => {
      const { id } = request.params;
      const body = UpdateAlertRuleSchema.parse(request.body);
      const user = request.user as { userId: string };

      // Check if rule exists
      const existing = await queryOne<{ id: string }>('SELECT id FROM alert_rules WHERE id = $1', [id]);

      if (!existing) {
        return reply.status(404).send({
          error: { code: 'NOT_FOUND', message: 'Alert rule not found', statusCode: 404 },
        });
      }

      // Validate channel IDs if updating channels
      if (body.channels && body.channels.length > 0) {
        const existingChannels = await queryAll<{ id: string }>(
          'SELECT id FROM alert_channels WHERE id = ANY($1)',
          [body.channels]
        );

        if (existingChannels.length !== body.channels.length) {
          return reply.status(400).send({
            error: {
              code: 'INVALID_CHANNELS',
              message: 'One or more channel IDs do not exist',
              statusCode: 400,
            },
          });
        }
      }

      // Build update query
      const setClauses: string[] = ['updated_at = NOW()'];
      const params: unknown[] = [];
      let paramIndex = 1;

      if (body.name !== undefined) {
        setClauses.push(`name = $${paramIndex++}`);
        params.push(body.name);
      }

      if (body.metric !== undefined) {
        setClauses.push(`metric = $${paramIndex++}`);
        params.push(body.metric);
      }

      if (body.condition !== undefined) {
        setClauses.push(`condition = $${paramIndex++}`);
        params.push(body.condition);
      }

      if (body.threshold !== undefined) {
        setClauses.push(`threshold = $${paramIndex++}`);
        params.push(body.threshold);
      }

      if (body.channels !== undefined) {
        setClauses.push(`channels = $${paramIndex++}`);
        params.push(body.channels);
      }

      if (body.enabled !== undefined) {
        setClauses.push(`enabled = $${paramIndex++}`);
        params.push(body.enabled);
      }

      if (body.cooldown_minutes !== undefined) {
        setClauses.push(`cooldown_minutes = $${paramIndex++}`);
        params.push(body.cooldown_minutes);
      }

      params.push(id);

      await query(`UPDATE alert_rules SET ${setClauses.join(', ')} WHERE id = $${paramIndex}`, params);

      const rule = await queryOne<AlertRuleRow>('SELECT * FROM alert_rules WHERE id = $1', [id]);

      log.info({ ruleId: id, adminId: user.userId, updates: body }, 'Alert rule updated');

      return reply.send({
        data: rule ? formatAlertRule(rule) : null,
      });
    }
  );

  /**
   * DELETE /admin/alerts/rules/:id
   * Delete an alert rule
   */
  app.delete<{ Params: { id: string } }>(
    '/admin/alerts/rules/:id',
    { preHandler: [authenticate, requireAdmin] },
    async (request, reply) => {
      const { id } = request.params;
      const user = request.user as { userId: string };

      // Check if rule exists
      const existing = await queryOne<{ id: string }>('SELECT id FROM alert_rules WHERE id = $1', [id]);

      if (!existing) {
        return reply.status(404).send({
          error: { code: 'NOT_FOUND', message: 'Alert rule not found', statusCode: 404 },
        });
      }

      await query('DELETE FROM alert_rules WHERE id = $1', [id]);

      log.info({ ruleId: id, adminId: user.userId }, 'Alert rule deleted');

      return reply.send({ success: true });
    }
  );

  /**
   * GET /admin/alerts/history
   * Get alert firing history
   */
  app.get(
    '/admin/alerts/history',
    { preHandler: [authenticate, requireAdmin] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const queryParams = AlertHistoryQuerySchema.parse(request.query);

      let sql = `
        SELECT
          h.*,
          r.name as rule_name
        FROM alert_history h
        LEFT JOIN alert_rules r ON h.rule_id = r.id
        WHERE 1=1
      `;
      const params: unknown[] = [];
      let paramIndex = 1;

      if (queryParams.rule_id) {
        sql += ` AND h.rule_id = $${paramIndex++}`;
        params.push(queryParams.rule_id);
      }

      // Keyset pagination
      if (queryParams.cursor) {
        const [cursorDate, cursorId] = queryParams.cursor.split('|');
        sql += ` AND (h.fired_at < $${paramIndex++} OR (h.fired_at = $${paramIndex - 1} AND h.id < $${paramIndex++}))`;
        params.push(cursorDate, cursorId);
      }

      sql += ` ORDER BY h.fired_at DESC, h.id DESC LIMIT $${paramIndex}`;
      params.push(queryParams.limit + 1);

      const rows = await queryAll<AlertHistoryRow>(sql, params);
      const hasMore = rows.length > queryParams.limit;
      const items = hasMore ? rows.slice(0, -1) : rows;

      const nextCursor =
        hasMore && items.length > 0
          ? `${items[items.length - 1].fired_at.toISOString()}|${items[items.length - 1].id}`
          : null;

      return reply.send({
        items: items.map(formatAlertHistory),
        nextCursor,
        hasMore,
      });
    }
  );

  /**
   * POST /admin/alerts/test/:id
   * Test fire an alert (doesn't respect cooldown, for testing only)
   */
  app.post<{ Params: { id: string } }>(
    '/admin/alerts/test/:id',
    { preHandler: [authenticate, requireAdmin] },
    async (request, reply) => {
      const { id } = request.params;
      const user = request.user as { userId: string };

      // Get the rule
      const rule = await queryOne<AlertRuleRow>('SELECT * FROM alert_rules WHERE id = $1', [id]);

      if (!rule) {
        return reply.status(404).send({
          error: { code: 'NOT_FOUND', message: 'Alert rule not found', statusCode: 404 },
        });
      }

      // Generate test values
      const testActualValue = rule.threshold + (rule.condition === 'gt' ? 10 : -10);

      // Notify channels
      const notifiedChannels = await notifyChannels(rule.channels, {
        name: rule.name,
        metric: rule.metric,
        condition: rule.condition,
        threshold: rule.threshold,
        actualValue: testActualValue,
      });

      // Record in history
      const historyId = generateId('alert_hist');
      await query(
        `INSERT INTO alert_history (id, rule_id, metric, condition, threshold, actual_value, channels_notified, metadata)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          historyId,
          id,
          rule.metric,
          rule.condition,
          rule.threshold,
          testActualValue,
          notifiedChannels,
          { test_fire: true, triggered_by: user.userId },
        ]
      );

      log.info({ ruleId: id, historyId, adminId: user.userId }, 'Alert test fired');

      return reply.send({
        success: true,
        historyId,
        notifiedChannels,
        message: 'Test alert fired successfully',
      });
    }
  );

  /**
   * GET /admin/alerts/channels
   * List all notification channels
   */
  app.get(
    '/admin/alerts/channels',
    { preHandler: [authenticate, requireAdmin] },
    async (_request: FastifyRequest, reply: FastifyReply) => {
      const channels = await queryAll<AlertChannelRow>(`
        SELECT * FROM alert_channels
        ORDER BY created_at DESC
      `);

      return reply.send({
        items: channels.map(formatAlertChannel),
        total: channels.length,
      });
    }
  );

  /**
   * POST /admin/alerts/channels
   * Add a new notification channel
   */
  app.post(
    '/admin/alerts/channels',
    { preHandler: [authenticate, requireAdmin] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const body = CreateChannelSchema.parse(request.body);
      const user = request.user as { userId: string };
      const id = generateId('alert_chan');

      // Validate config based on type
      try {
        ChannelConfigSchema.parse({ type: body.type, ...body.config });
      } catch (err) {
        return reply.status(400).send({
          error: {
            code: 'INVALID_CONFIG',
            message: 'Invalid channel configuration for the specified type',
            statusCode: 400,
            details: err instanceof z.ZodError ? err.errors : undefined,
          },
        });
      }

      await query(
        `INSERT INTO alert_channels (id, type, config, name)
         VALUES ($1, $2, $3, $4)`,
        [id, body.type, body.config, body.name]
      );

      const channel = await queryOne<AlertChannelRow>('SELECT * FROM alert_channels WHERE id = $1', [id]);

      log.info({ channelId: id, type: body.type, adminId: user.userId }, 'Alert channel created');

      return reply.status(201).send({
        data: channel ? formatAlertChannel(channel) : null,
      });
    }
  );

  /**
   * DELETE /admin/alerts/channels/:id
   * Delete a notification channel
   */
  app.delete<{ Params: { id: string } }>(
    '/admin/alerts/channels/:id',
    { preHandler: [authenticate, requireAdmin] },
    async (request, reply) => {
      const { id } = request.params;
      const user = request.user as { userId: string };

      // Check if channel exists
      const existing = await queryOne<{ id: string }>('SELECT id FROM alert_channels WHERE id = $1', [id]);

      if (!existing) {
        return reply.status(404).send({
          error: { code: 'NOT_FOUND', message: 'Alert channel not found', statusCode: 404 },
        });
      }

      // Check if channel is used by any rules
      const usedByRules = await queryAll<{ id: string; name: string }>(
        `SELECT id, name FROM alert_rules WHERE $1 = ANY(channels)`,
        [id]
      );

      if (usedByRules.length > 0) {
        return reply.status(400).send({
          error: {
            code: 'CHANNEL_IN_USE',
            message: 'Channel is used by alert rules and cannot be deleted',
            statusCode: 400,
            rulesUsingChannel: usedByRules.map((r) => ({ id: r.id, name: r.name })),
          },
        });
      }

      await query('DELETE FROM alert_channels WHERE id = $1', [id]);

      log.info({ channelId: id, adminId: user.userId }, 'Alert channel deleted');

      return reply.send({ success: true });
    }
  );
}
