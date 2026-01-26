/**
 * Notify Plugin
 *
 * Sends notifications after builds complete.
 */

import type { Plugin, BuildContext, BuildResult } from '../../types/index.js';

interface NotifyConfig {
  slack_webhook?: string;
  discord_webhook?: string;
  email?: string[];
  on_success?: boolean;
  on_failure?: boolean;
}

const notifyPlugin: Plugin = {
  name: 'notify',
  version: '1.0.0',
  hotSwappable: true,

  hooks: {
    'deploy': async (context: BuildContext, result?: BuildResult) => {
      if (!result) {
        return;
      }

      const config = (context.config?.plugins?.core?.notify?.config ?? {}) as NotifyConfig;
      const onSuccess = config.on_success ?? true;
      const onFailure = config.on_failure ?? true;

      // Check if we should notify
      if (result.success && !onSuccess) {
        return;
      }
      if (!result.success && !onFailure) {
        return;
      }

      context.logger.info('[notify] Sending build notifications...');
      const startTime = Date.now();

      const message = formatBuildMessage(context, result);

      try {
        // Send to Slack
        if (config.slack_webhook) {
          await sendSlackNotification(config.slack_webhook, message, result.success);
          context.logger.debug('[notify] Sent Slack notification');
        }

        // Send to Discord
        if (config.discord_webhook) {
          await sendDiscordNotification(config.discord_webhook, message, result.success);
          context.logger.debug('[notify] Sent Discord notification');
        }

        // Email notifications would require an SMTP setup
        // Skipping for now

        const duration = Date.now() - startTime;
        context.logger.info(`[notify] Completed in ${duration}ms`);

        context.metrics.timing('notify_duration_ms', duration);
        context.metrics.increment('notify_sent_total', {
          status: result.success ? 'success' : 'failure',
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        context.logger.warn(`[notify] Failed to send notifications: ${message}`);
        // Don't throw - notifications are optional
      }
    },

    'error': async (context: BuildContext, result?: BuildResult) => {
      const config = (context.config?.plugins?.core?.notify?.config ?? {}) as NotifyConfig;

      if (!config.on_failure) {
        return;
      }

      context.logger.info('[notify] Sending error notification...');

      const message = formatErrorMessage(context, result);

      try {
        if (config.slack_webhook) {
          await sendSlackNotification(config.slack_webhook, message, false);
        }
        if (config.discord_webhook) {
          await sendDiscordNotification(config.discord_webhook, message, false);
        }
      } catch (error) {
        context.logger.warn(`[notify] Failed to send error notification: ${error}`);
      }
    },
  },
};

function formatBuildMessage(context: BuildContext, result: BuildResult): string {
  const status = result.success ? '✅ SUCCESS' : '❌ FAILED';
  const duration = formatDuration(result.duration_ms);

  let message = `**Build ${status}**\n`;
  message += `• Task: ${context.taskName}\n`;
  message += `• Node: ${context.node?.id ?? 'unknown'}\n`;
  message += `• Duration: ${duration}\n`;
  message += `• Build ID: ${context.buildId}\n`;

  if (result.artifacts.length > 0) {
    const totalSize = result.artifacts.reduce((sum, a) => sum + a.size_bytes, 0);
    message += `• Artifacts: ${result.artifacts.length} (${formatBytes(totalSize)})\n`;
  }

  if (result.errors && result.errors.length > 0) {
    message += `• Errors: ${result.errors.length}\n`;
    for (const error of result.errors.slice(0, 3)) {
      message += `  - ${error.message}\n`;
    }
  }

  return message;
}

function formatErrorMessage(context: BuildContext, result?: BuildResult): string {
  let message = `**🚨 Build Error**\n`;
  message += `• Task: ${context.taskName}\n`;
  message += `• Node: ${context.node?.id ?? 'unknown'}\n`;
  message += `• Build ID: ${context.buildId}\n`;

  if (result?.errors && result.errors.length > 0) {
    message += `\n**Errors:**\n`;
    for (const error of result.errors.slice(0, 5)) {
      message += `\`\`\`\n${error.message}\n`;
      if (error.file) {
        message += `File: ${error.file}`;
        if (error.line) message += `:${error.line}`;
        if (error.column) message += `:${error.column}`;
        message += '\n';
      }
      message += `\`\`\`\n`;
    }
  }

  return message;
}

async function sendSlackNotification(
  webhookUrl: string,
  message: string,
  success: boolean,
): Promise<void> {
  const color = success ? '#36a64f' : '#ff0000';

  const payload = {
    attachments: [
      {
        color,
        text: message,
        mrkdwn_in: ['text'],
      },
    ],
  };

  const response = await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(`Slack webhook failed: ${response.status}`);
  }
}

async function sendDiscordNotification(
  webhookUrl: string,
  message: string,
  success: boolean,
): Promise<void> {
  const color = success ? 0x36a64f : 0xff0000;

  const payload = {
    embeds: [
      {
        description: message,
        color,
      },
    ],
  };

  const response = await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(`Discord webhook failed: ${response.status}`);
  }
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  const minutes = Math.floor(ms / 60000);
  const seconds = Math.round((ms % 60000) / 1000);
  return `${minutes}m ${seconds}s`;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

export default notifyPlugin;
