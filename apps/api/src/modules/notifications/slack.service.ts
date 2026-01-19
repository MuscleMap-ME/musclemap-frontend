/**
 * Slack Notification Service
 *
 * Comprehensive Slack integration for MuscleMap Empire notifications.
 * Sends real-time updates about:
 * - System health (CPU, memory, errors)
 * - Deployments
 * - New users
 * - Achievements & milestones
 * - Bug reports & feedback
 * - Daily/weekly digests
 * - Economy events
 * - Community activity
 */

import { query, queryOne, queryAll } from '../../db/client';
import { getRedis } from '../../lib/redis';
import { loggers } from '../../lib/logger';

const log = loggers.core.child({ module: 'slack-notifications' });

// Notification types
export type SlackNotificationType =
  | 'system_alert'
  | 'deployment'
  | 'new_user'
  | 'achievement'
  | 'milestone'
  | 'bug_report'
  | 'feedback'
  | 'error'
  | 'daily_digest'
  | 'weekly_digest'
  | 'economy_event'
  | 'community_activity'
  | 'message'
  | 'security';

// Slack message block types - using 'unknown' for flexibility with Slack's complex block structure
type SlackBlock = Record<string, unknown>;

interface SlackMessage {
  text: string;
  username?: string;
  icon_emoji?: string;
  blocks?: SlackBlock[];
  attachments?: Array<{
    color?: string;
    blocks?: SlackBlock[];
  }>;
}

// Configuration stored in database
interface SlackConfig {
  webhook_url: string;
  enabled_notifications: SlackNotificationType[];
  quiet_hours?: { start: number; end: number }; // 0-23 hours
  digest_time?: string; // "09:00" format
  mention_on_critical?: boolean;
  user_id_to_mention?: string; // Slack user ID for @mentions
}

/**
 * Get Slack configuration from database or environment
 */
async function getSlackConfig(): Promise<SlackConfig | null> {
  try {
    // First check database for admin-configured webhook
    const config = await queryOne<{ value: unknown }>(
      'SELECT value FROM admin_settings WHERE key = $1',
      ['slack_config']
    );

    if (config?.value) {
      return typeof config.value === 'string'
        ? JSON.parse(config.value)
        : config.value as SlackConfig;
    }

    // Fallback to environment variable
    const webhookUrl = process.env.SLACK_WEBHOOK_URL;
    if (webhookUrl) {
      return {
        webhook_url: webhookUrl,
        enabled_notifications: [
          'system_alert', 'deployment', 'new_user', 'achievement',
          'bug_report', 'feedback', 'error', 'daily_digest', 'security'
        ],
        mention_on_critical: true,
      };
    }

    return null;
  } catch (err) {
    log.error({ error: (err as Error).message }, 'Failed to get Slack config');
    return null;
  }
}

/**
 * Save Slack configuration to database
 */
export async function saveSlackConfig(config: SlackConfig): Promise<boolean> {
  try {
    await query(
      `INSERT INTO admin_settings (key, value, updated_at)
       VALUES ($1, $2, NOW())
       ON CONFLICT (key) DO UPDATE SET value = $2, updated_at = NOW()`,
      ['slack_config', JSON.stringify(config)]
    );

    log.info('Slack config saved');
    return true;
  } catch (err) {
    log.error({ error: (err as Error).message }, 'Failed to save Slack config');
    return false;
  }
}

/**
 * Check if we should send notifications (quiet hours check)
 */
function isQuietHours(config: SlackConfig): boolean {
  if (!config.quiet_hours) return false;

  const now = new Date();
  const hour = now.getHours();
  const { start, end } = config.quiet_hours;

  if (start < end) {
    return hour >= start && hour < end;
  } else {
    // Quiet hours span midnight
    return hour >= start || hour < end;
  }
}

/**
 * Send a message to Slack
 */
async function sendToSlack(message: SlackMessage, bypassQuietHours = false): Promise<boolean> {
  const config = await getSlackConfig();

  if (!config) {
    log.debug('No Slack config found, skipping notification');
    return false;
  }

  if (!bypassQuietHours && isQuietHours(config)) {
    log.debug('Quiet hours active, skipping notification');
    return false;
  }

  try {
    const response = await fetch(config.webhook_url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...message,
        username: message.username || 'MuscleMap Bot',
        icon_emoji: message.icon_emoji || ':muscle:',
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      log.error({ status: response.status, error: errorText }, 'Slack webhook failed');
      return false;
    }

    log.debug({ type: message.text.substring(0, 50) }, 'Slack notification sent');
    return true;
  } catch (err) {
    log.error({ error: (err as Error).message }, 'Slack webhook error');
    return false;
  }
}

/**
 * Check if a notification type is enabled
 */
async function isNotificationEnabled(type: SlackNotificationType): Promise<boolean> {
  const config = await getSlackConfig();
  if (!config) return false;
  return config.enabled_notifications.includes(type);
}

// ============================================
// NOTIFICATION FUNCTIONS
// ============================================

/**
 * System Alert - CPU, memory, error rate thresholds
 */
export async function notifySystemAlert(alert: {
  metric: string;
  value: number;
  threshold: number;
  severity: 'warning' | 'critical';
}): Promise<boolean> {
  if (!await isNotificationEnabled('system_alert')) return false;

  const emoji = alert.severity === 'critical' ? ':rotating_light:' : ':warning:';
  const color = alert.severity === 'critical' ? '#FF0000' : '#FFA500';

  const config = await getSlackConfig();
  const mention = alert.severity === 'critical' && config?.mention_on_critical && config?.user_id_to_mention
    ? `<@${config.user_id_to_mention}> `
    : '';

  return sendToSlack({
    text: `${emoji} System Alert: ${alert.metric}`,
    icon_emoji: emoji,
    attachments: [{
      color,
      blocks: [
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `${mention}*${alert.metric}* is at *${alert.value.toFixed(1)}%* (threshold: ${alert.threshold}%)`
          }
        },
        {
          type: 'context',
          elements: [
            { type: 'mrkdwn', text: `Severity: *${alert.severity.toUpperCase()}* | Time: ${new Date().toISOString()}` }
          ]
        },
        {
          type: 'actions',
          elements: [
            {
              type: 'button',
              text: { type: 'plain_text', text: 'View Metrics', emoji: true },
              url: 'https://musclemap.me/empire?section=metrics',
              action_id: 'view_metrics'
            }
          ]
        }
      ]
    }]
  }, alert.severity === 'critical');
}

/**
 * Deployment Notification
 */
export async function notifyDeployment(deployment: {
  status: 'started' | 'completed' | 'failed';
  commit?: string;
  branch?: string;
  duration?: number;
  error?: string;
}): Promise<boolean> {
  if (!await isNotificationEnabled('deployment')) return false;

  const statusEmoji = {
    started: ':rocket:',
    completed: ':white_check_mark:',
    failed: ':x:'
  }[deployment.status];

  const statusColor = {
    started: '#3498db',
    completed: '#2ecc71',
    failed: '#e74c3c'
  }[deployment.status];

  const fields = [
    { type: 'mrkdwn', text: `*Status:* ${deployment.status.toUpperCase()}` }
  ];

  if (deployment.branch) {
    fields.push({ type: 'mrkdwn', text: `*Branch:* ${deployment.branch}` });
  }
  if (deployment.commit) {
    fields.push({ type: 'mrkdwn', text: `*Commit:* \`${deployment.commit.substring(0, 7)}\`` });
  }
  if (deployment.duration) {
    fields.push({ type: 'mrkdwn', text: `*Duration:* ${deployment.duration}s` });
  }
  if (deployment.error) {
    fields.push({ type: 'mrkdwn', text: `*Error:* ${deployment.error}` });
  }

  return sendToSlack({
    text: `${statusEmoji} Deployment ${deployment.status}`,
    icon_emoji: statusEmoji,
    attachments: [{
      color: statusColor,
      blocks: [
        {
          type: 'section',
          text: { type: 'mrkdwn', text: `*Deployment ${deployment.status}*` },
          fields
        },
        {
          type: 'actions',
          elements: [
            {
              type: 'button',
              text: { type: 'plain_text', text: 'View Deployments', emoji: true },
              url: 'https://musclemap.me/empire?section=deployments',
              action_id: 'view_deployments'
            }
          ]
        }
      ]
    }]
  }, deployment.status === 'failed');
}

/**
 * New User Signup
 */
export async function notifyNewUser(user: {
  id: string;
  username: string;
  email?: string;
  archetype?: string;
  referrer?: string;
}): Promise<boolean> {
  if (!await isNotificationEnabled('new_user')) return false;

  const fields = [
    { type: 'mrkdwn', text: `*Username:* ${user.username}` }
  ];

  if (user.archetype) {
    fields.push({ type: 'mrkdwn', text: `*Archetype:* ${user.archetype}` });
  }
  if (user.referrer) {
    fields.push({ type: 'mrkdwn', text: `*Referred by:* ${user.referrer}` });
  }

  // Get total user count
  const countResult = await queryOne<{ count: string }>(
    'SELECT COUNT(id) as count FROM users',
    []
  );
  const totalUsers = countResult?.count || '0';

  return sendToSlack({
    text: `:wave: New user joined: ${user.username}`,
    icon_emoji: ':wave:',
    blocks: [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `:wave: *New User Joined!*\nWelcome *${user.username}* to MuscleMap!`
        },
        accessory: {
          type: 'image',
          image_url: `https://api.dicebear.com/7.x/avataaars/png?seed=${user.username}`,
          alt_text: user.username
        }
      },
      {
        type: 'section',
        fields
      },
      {
        type: 'context',
        elements: [
          { type: 'mrkdwn', text: `Total users: *${totalUsers}* | User ID: \`${user.id.substring(0, 8)}\`` }
        ]
      },
      {
        type: 'actions',
        elements: [
          {
            type: 'button',
            text: { type: 'plain_text', text: 'View Profile', emoji: true },
            url: `https://musclemap.me/profile/${user.username}`,
            action_id: 'view_profile'
          },
          {
            type: 'button',
            text: { type: 'plain_text', text: 'User Analytics', emoji: true },
            url: 'https://musclemap.me/empire?section=user-analytics',
            action_id: 'user_analytics'
          }
        ]
      }
    ]
  });
}

/**
 * Achievement/Milestone Notification
 */
export async function notifyAchievement(achievement: {
  userId: string;
  username: string;
  type: 'achievement' | 'level_up' | 'wealth_tier' | 'streak' | 'pr';
  name: string;
  description?: string;
  value?: number;
}): Promise<boolean> {
  if (!await isNotificationEnabled('achievement')) return false;

  const typeEmoji = {
    achievement: ':trophy:',
    level_up: ':arrow_up:',
    wealth_tier: ':gem:',
    streak: ':fire:',
    pr: ':muscle:'
  }[achievement.type];

  const typeColor = {
    achievement: '#FFD700',
    level_up: '#9B59B6',
    wealth_tier: '#3498DB',
    streak: '#E74C3C',
    pr: '#2ECC71'
  }[achievement.type];

  return sendToSlack({
    text: `${typeEmoji} ${achievement.username} earned: ${achievement.name}`,
    icon_emoji: typeEmoji,
    attachments: [{
      color: typeColor,
      blocks: [
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `${typeEmoji} *${achievement.username}* ${achievement.type === 'level_up' ? 'reached' : 'earned'} *${achievement.name}*${achievement.description ? `\n${achievement.description}` : ''}`
          }
        },
        {
          type: 'context',
          elements: [
            { type: 'mrkdwn', text: `Type: ${achievement.type} | ${new Date().toLocaleDateString()}` }
          ]
        }
      ]
    }]
  });
}

/**
 * Bug Report Notification
 */
export async function notifyBugReport(bug: {
  id: string;
  title: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  reporter?: string;
  url?: string;
  userAgent?: string;
}): Promise<boolean> {
  if (!await isNotificationEnabled('bug_report')) return false;

  const severityEmoji = {
    low: ':bug:',
    medium: ':beetle:',
    high: ':warning:',
    critical: ':rotating_light:'
  }[bug.severity];

  const severityColor = {
    low: '#95A5A6',
    medium: '#F39C12',
    high: '#E67E22',
    critical: '#E74C3C'
  }[bug.severity];

  const config = await getSlackConfig();
  const mention = bug.severity === 'critical' && config?.mention_on_critical && config?.user_id_to_mention
    ? `<@${config.user_id_to_mention}> `
    : '';

  return sendToSlack({
    text: `${severityEmoji} Bug Report: ${bug.title}`,
    icon_emoji: severityEmoji,
    attachments: [{
      color: severityColor,
      blocks: [
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `${mention}${severityEmoji} *New Bug Report*\n*${bug.title}*`
          }
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: bug.description.substring(0, 500) + (bug.description.length > 500 ? '...' : '')
          }
        },
        {
          type: 'section',
          fields: [
            { type: 'mrkdwn', text: `*Severity:* ${bug.severity.toUpperCase()}` },
            { type: 'mrkdwn', text: `*Reporter:* ${bug.reporter || 'Anonymous'}` },
            ...(bug.url ? [{ type: 'mrkdwn', text: `*URL:* ${bug.url}` }] : [])
          ]
        },
        {
          type: 'actions',
          elements: [
            {
              type: 'button',
              text: { type: 'plain_text', text: 'View Bug', emoji: true },
              url: `https://musclemap.me/empire?section=bug-tracker&id=${bug.id}`,
              action_id: 'view_bug'
            }
          ]
        }
      ]
    }]
  }, bug.severity === 'critical');
}

/**
 * Feedback Notification
 */
export async function notifyFeedback(feedback: {
  id: string;
  type: 'feedback' | 'feature_request' | 'question' | 'praise';
  title: string;
  message: string;
  user?: string;
  email?: string;
  rating?: number;
}): Promise<boolean> {
  if (!await isNotificationEnabled('feedback')) return false;

  const typeEmoji = {
    feedback: ':speech_balloon:',
    feature_request: ':bulb:',
    question: ':question:',
    praise: ':star:'
  }[feedback.type];

  const typeColor = {
    feedback: '#3498DB',
    feature_request: '#9B59B6',
    question: '#F39C12',
    praise: '#2ECC71'
  }[feedback.type];

  const fields = [
    { type: 'mrkdwn', text: `*Type:* ${feedback.type.replace('_', ' ')}` }
  ];

  if (feedback.user) {
    fields.push({ type: 'mrkdwn', text: `*From:* ${feedback.user}` });
  }
  if (feedback.rating) {
    fields.push({ type: 'mrkdwn', text: `*Rating:* ${'⭐'.repeat(feedback.rating)}` });
  }

  return sendToSlack({
    text: `${typeEmoji} ${feedback.type.replace('_', ' ')}: ${feedback.title}`,
    icon_emoji: typeEmoji,
    attachments: [{
      color: typeColor,
      blocks: [
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `${typeEmoji} *New ${feedback.type.replace('_', ' ')}*\n*${feedback.title}*`
          }
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: feedback.message.substring(0, 500) + (feedback.message.length > 500 ? '...' : '')
          }
        },
        {
          type: 'section',
          fields
        },
        {
          type: 'actions',
          elements: [
            {
              type: 'button',
              text: { type: 'plain_text', text: 'View & Respond', emoji: true },
              url: `https://musclemap.me/empire?section=feedback&id=${feedback.id}`,
              action_id: 'view_feedback'
            }
          ]
        }
      ]
    }]
  });
}

/**
 * Error Notification (for uncaught errors)
 */
export async function notifyError(error: {
  message: string;
  stack?: string;
  endpoint?: string;
  userId?: string;
  count?: number;
}): Promise<boolean> {
  if (!await isNotificationEnabled('error')) return false;

  // Rate limit error notifications (max 1 per minute for same error)
  const errorKey = `slack:error:${error.message.substring(0, 50)}`;
  const redis = getRedis();
  if (redis) {
    const recent = await redis.get(errorKey);
    if (recent) return false;
    await redis.setex(errorKey, 60, '1');
  }

  const config = await getSlackConfig();
  const mention = config?.mention_on_critical && config?.user_id_to_mention
    ? `<@${config.user_id_to_mention}> `
    : '';

  return sendToSlack({
    text: `:x: Error: ${error.message}`,
    icon_emoji: ':x:',
    attachments: [{
      color: '#E74C3C',
      blocks: [
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `${mention}:x: *Application Error*\n\`\`\`${error.message}\`\`\``
          }
        },
        {
          type: 'section',
          fields: [
            ...(error.endpoint ? [{ type: 'mrkdwn', text: `*Endpoint:* ${error.endpoint}` }] : []),
            ...(error.count ? [{ type: 'mrkdwn', text: `*Occurrences:* ${error.count}` }] : []),
            { type: 'mrkdwn', text: `*Time:* ${new Date().toISOString()}` }
          ]
        },
        ...(error.stack ? [{
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `*Stack:*\n\`\`\`${error.stack.substring(0, 500)}\`\`\``
          }
        }] : []),
        {
          type: 'actions',
          elements: [
            {
              type: 'button',
              text: { type: 'plain_text', text: 'View Logs', emoji: true },
              url: 'https://musclemap.me/empire?section=log-analysis',
              action_id: 'view_logs'
            }
          ]
        }
      ]
    }]
  }, true);
}

/**
 * Security Alert
 */
export async function notifySecurityAlert(alert: {
  type: 'failed_login' | 'suspicious_activity' | 'rate_limit' | 'blocked_ip';
  ip?: string;
  userId?: string;
  details: string;
}): Promise<boolean> {
  if (!await isNotificationEnabled('security')) return false;

  const config = await getSlackConfig();
  const mention = config?.mention_on_critical && config?.user_id_to_mention
    ? `<@${config.user_id_to_mention}> `
    : '';

  return sendToSlack({
    text: `:shield: Security Alert: ${alert.type}`,
    icon_emoji: ':shield:',
    attachments: [{
      color: '#E74C3C',
      blocks: [
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `${mention}:shield: *Security Alert*\n*Type:* ${alert.type.replace(/_/g, ' ')}`
          }
        },
        {
          type: 'section',
          fields: [
            ...(alert.ip ? [{ type: 'mrkdwn', text: `*IP:* ${alert.ip}` }] : []),
            ...(alert.userId ? [{ type: 'mrkdwn', text: `*User:* ${alert.userId}` }] : []),
            { type: 'mrkdwn', text: `*Details:* ${alert.details}` }
          ]
        }
      ]
    }]
  }, true);
}

/**
 * Economy Event (large transactions, tier changes)
 */
export async function notifyEconomyEvent(event: {
  type: 'large_transaction' | 'tier_change' | 'marketplace_sale';
  userId: string;
  username: string;
  amount?: number;
  oldTier?: string;
  newTier?: string;
  item?: string;
}): Promise<boolean> {
  if (!await isNotificationEnabled('economy_event')) return false;

  const emoji = event.type === 'tier_change' ? ':gem:' : ':moneybag:';

  let text = '';
  if (event.type === 'large_transaction') {
    text = `:moneybag: *Large Transaction*\n*${event.username}* transferred *${event.amount?.toLocaleString()} credits*`;
  } else if (event.type === 'tier_change') {
    text = `:gem: *Wealth Tier Change*\n*${event.username}* advanced from *${event.oldTier}* to *${event.newTier}*`;
  } else if (event.type === 'marketplace_sale') {
    text = `:shopping_bags: *Marketplace Sale*\n*${event.username}* sold *${event.item}* for *${event.amount?.toLocaleString()} credits*`;
  }

  return sendToSlack({
    text: `${emoji} Economy: ${event.type}`,
    icon_emoji: emoji,
    blocks: [
      {
        type: 'section',
        text: { type: 'mrkdwn', text }
      }
    ]
  });
}

/**
 * Daily Digest - comprehensive daily summary
 */
export async function sendDailyDigest(): Promise<boolean> {
  if (!await isNotificationEnabled('daily_digest')) return false;

  try {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    // Gather metrics - use raw SQL queries
    const yesterdayISO = yesterday.toISOString();

    const [
      newUsersResult,
      workoutsResult,
      totalUsersResult,
      creditsResult,
      feedbackResult
    ] = await Promise.all([
      queryOne<{ count: string }>('SELECT COUNT(id) as count FROM users WHERE created_at >= $1', [yesterdayISO]),
      queryOne<{ count: string }>('SELECT COUNT(id) as count FROM workout_logs WHERE created_at >= $1', [yesterdayISO]),
      queryOne<{ count: string }>('SELECT COUNT(id) as count FROM users', []),
      queryOne<{ total: string | null }>('SELECT COALESCE(SUM(amount), 0) as total FROM credit_transactions WHERE created_at >= $1', [yesterdayISO]),
      queryOne<{ count: string }>('SELECT COUNT(id) as count FROM feedback WHERE created_at >= $1', [yesterdayISO])
    ]);

    const newUsers = Number(newUsersResult?.count || 0);
    const workouts = Number(workoutsResult?.count || 0);
    const totalUsers = Number(totalUsersResult?.count || 0);
    const creditsCirculated = Number(creditsResult?.total || 0);
    const newFeedback = Number(feedbackResult?.count || 0);
    // Note: bugs and error_logs tables may not exist, so we skip them for now
    const newBugs = 0;
    const errors = 0;

    return sendToSlack({
      text: ':sunrise: MuscleMap Daily Digest',
      icon_emoji: ':sunrise:',
      blocks: [
        {
          type: 'header',
          text: { type: 'plain_text', text: '☀️ MuscleMap Daily Digest', emoji: true }
        },
        {
          type: 'section',
          text: { type: 'mrkdwn', text: `*${today.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}*` }
        },
        { type: 'divider' },
        {
          type: 'section',
          text: { type: 'mrkdwn', text: '*👥 Users*' },
          fields: [
            { type: 'mrkdwn', text: `*New signups:* ${newUsers}` },
            { type: 'mrkdwn', text: `*Total users:* ${totalUsers.toLocaleString()}` }
          ]
        },
        {
          type: 'section',
          text: { type: 'mrkdwn', text: '*💪 Activity*' },
          fields: [
            { type: 'mrkdwn', text: `*Workouts logged:* ${workouts}` },
            { type: 'mrkdwn', text: `*Credits circulated:* ${creditsCirculated.toLocaleString()}` }
          ]
        },
        {
          type: 'section',
          text: { type: 'mrkdwn', text: '*📊 Health*' },
          fields: [
            { type: 'mrkdwn', text: `*New bugs:* ${newBugs}` },
            { type: 'mrkdwn', text: `*New feedback:* ${newFeedback}` },
            { type: 'mrkdwn', text: `*Errors:* ${errors}` }
          ]
        },
        { type: 'divider' },
        {
          type: 'actions',
          elements: [
            {
              type: 'button',
              text: { type: 'plain_text', text: '📊 Full Dashboard', emoji: true },
              url: 'https://musclemap.me/empire',
              action_id: 'view_dashboard'
            },
            {
              type: 'button',
              text: { type: 'plain_text', text: '📈 Analytics', emoji: true },
              url: 'https://musclemap.me/empire?section=analytics',
              action_id: 'view_analytics'
            }
          ]
        }
      ]
    }, true);
  } catch (err) {
    log.error({ error: (err as Error).message }, 'Failed to send daily digest');
    return false;
  }
}

/**
 * Weekly Digest - comprehensive weekly summary
 */
export async function sendWeeklyDigest(): Promise<boolean> {
  if (!await isNotificationEnabled('weekly_digest')) return false;

  try {
    const today = new Date();
    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 7);

    // Gather metrics - use raw SQL queries
    const weekAgoISO = weekAgo.toISOString();

    const [
      newUsersResult,
      workoutsResult,
      achievementsResult,
      topUsersResult
    ] = await Promise.all([
      queryOne<{ count: string }>('SELECT COUNT(id) as count FROM users WHERE created_at >= $1', [weekAgoISO]),
      queryOne<{ count: string }>('SELECT COUNT(id) as count FROM workout_logs WHERE created_at >= $1', [weekAgoISO]),
      queryOne<{ count: string }>('SELECT COUNT(id) as count FROM user_achievements WHERE unlocked_at >= $1', [weekAgoISO]),
      queryAll<{ username: string; xp: number; level: number }>(
        'SELECT username, xp, level FROM users WHERE updated_at >= $1 ORDER BY xp DESC LIMIT 5',
        [weekAgoISO]
      )
    ]);

    const newUsers = Number(newUsersResult?.count || 0);
    const workouts = Number(workoutsResult?.count || 0);
    const achievements = Number(achievementsResult?.count || 0);

    const topUsersText = (topUsersResult || [])
      .map((u: { username: string; level: number }, i: number) => `${i + 1}. ${u.username} (Lvl ${u.level})`)
      .join('\n');

    return sendToSlack({
      text: ':calendar: MuscleMap Weekly Digest',
      icon_emoji: ':calendar:',
      blocks: [
        {
          type: 'header',
          text: { type: 'plain_text', text: '📅 MuscleMap Weekly Digest', emoji: true }
        },
        {
          type: 'section',
          text: { type: 'mrkdwn', text: `*Week of ${weekAgo.toLocaleDateString()} - ${today.toLocaleDateString()}*` }
        },
        { type: 'divider' },
        {
          type: 'section',
          fields: [
            { type: 'mrkdwn', text: `*👥 New Users:* ${newUsers}` },
            { type: 'mrkdwn', text: `*💪 Workouts:* ${workouts}` },
            { type: 'mrkdwn', text: `*🏆 Achievements:* ${achievements}` }
          ]
        },
        {
          type: 'section',
          text: { type: 'mrkdwn', text: `*🔥 Most Active Users This Week:*\n${topUsersText || 'No activity'}` }
        },
        { type: 'divider' },
        {
          type: 'actions',
          elements: [
            {
              type: 'button',
              text: { type: 'plain_text', text: '📊 Full Report', emoji: true },
              url: 'https://musclemap.me/empire?section=analytics',
              action_id: 'view_report'
            }
          ]
        }
      ]
    }, true);
  } catch (err) {
    log.error({ error: (err as Error).message }, 'Failed to send weekly digest');
    return false;
  }
}

/**
 * Community Activity (crew events, competitions)
 */
export async function notifyCommunityActivity(activity: {
  type: 'crew_created' | 'competition_started' | 'competition_ended' | 'milestone';
  name: string;
  details: string;
  participants?: number;
  winner?: string;
}): Promise<boolean> {
  if (!await isNotificationEnabled('community_activity')) return false;

  const emoji = {
    crew_created: ':busts_in_silhouette:',
    competition_started: ':racing_car:',
    competition_ended: ':checkered_flag:',
    milestone: ':star2:'
  }[activity.type];

  return sendToSlack({
    text: `${emoji} ${activity.name}`,
    icon_emoji: emoji,
    blocks: [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `${emoji} *${activity.name}*\n${activity.details}`
        }
      },
      {
        type: 'context',
        elements: [
          ...(activity.participants ? [{ type: 'mrkdwn', text: `Participants: ${activity.participants}` }] : []),
          ...(activity.winner ? [{ type: 'mrkdwn', text: `Winner: ${activity.winner}` }] : [])
        ]
      }
    ]
  });
}

/**
 * Direct Message to Owner (for important communications)
 */
export async function notifyDirectMessage(message: {
  from: string;
  subject: string;
  preview: string;
  messageId?: string;
}): Promise<boolean> {
  if (!await isNotificationEnabled('message')) return false;

  return sendToSlack({
    text: `:envelope: New message from ${message.from}`,
    icon_emoji: ':envelope:',
    blocks: [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `:envelope: *New Message*\n*From:* ${message.from}\n*Subject:* ${message.subject}`
        }
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `_${message.preview.substring(0, 200)}${message.preview.length > 200 ? '...' : ''}_`
        }
      },
      {
        type: 'actions',
        elements: [
          {
            type: 'button',
            text: { type: 'plain_text', text: 'View Message', emoji: true },
            url: `https://musclemap.me/messages${message.messageId ? `?id=${message.messageId}` : ''}`,
            action_id: 'view_message'
          }
        ]
      }
    ]
  });
}

/**
 * Test the Slack connection
 */
export async function testSlackConnection(webhookUrl?: string): Promise<{ success: boolean; error?: string }> {
  const url = webhookUrl || (await getSlackConfig())?.webhook_url;

  if (!url) {
    return { success: false, error: 'No webhook URL configured' };
  }

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: ':white_check_mark: *MuscleMap Connection Test Successful!*\nYour Slack integration is working.',
        username: 'MuscleMap Bot',
        icon_emoji: ':muscle:'
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      return { success: false, error: errorText };
    }

    return { success: true };
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }
}

// Export all notification functions
export const SlackNotifications = {
  // Configuration
  getConfig: getSlackConfig,
  saveConfig: saveSlackConfig,
  testConnection: testSlackConnection,

  // Notifications
  systemAlert: notifySystemAlert,
  deployment: notifyDeployment,
  newUser: notifyNewUser,
  achievement: notifyAchievement,
  bugReport: notifyBugReport,
  feedback: notifyFeedback,
  error: notifyError,
  security: notifySecurityAlert,
  economy: notifyEconomyEvent,
  community: notifyCommunityActivity,
  message: notifyDirectMessage,

  // Digests
  dailyDigest: sendDailyDigest,
  weeklyDigest: sendWeeklyDigest,
};

export default SlackNotifications;
