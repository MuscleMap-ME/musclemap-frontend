/**
 * Email Service
 *
 * Handles all email sending via Resend
 * - Transactional emails
 * - Feedback digest emails
 * - Resolution notifications
 */

import { Resend } from 'resend';
import { loggers } from '../lib/logger';

const log = loggers.api;

// Initialize Resend client
const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

const FROM_EMAIL = process.env.FROM_EMAIL || 'MuscleMap <feedback@musclemap.me>';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@musclemap.me';

interface EmailResult {
  success: boolean;
  id?: string;
  error?: string;
}

interface FeedbackDigestItem {
  id: string;
  type: 'feature_request' | 'question' | 'general';
  title: string;
  description: string;
  username: string;
  createdAt: Date;
}

interface ResolutionNotificationData {
  feedbackId: string;
  feedbackType: string;
  title: string;
  status: string;
  resolutionMessage?: string;
  userEmail: string;
  username: string;
}

/**
 * Check if email service is configured
 */
export function isEmailConfigured(): boolean {
  return resend !== null;
}

/**
 * Send a generic email
 */
export async function sendEmail(params: {
  to: string;
  subject: string;
  html: string;
  text?: string;
}): Promise<EmailResult> {
  if (!resend) {
    log.warn('Email service not configured - RESEND_API_KEY not set');
    return { success: false, error: 'Email service not configured' };
  }

  try {
    const result = await resend.emails.send({
      from: FROM_EMAIL,
      to: params.to,
      subject: params.subject,
      html: params.html,
      text: params.text,
    });

    if (result.error) {
      log.error({ error: result.error }, 'Failed to send email');
      return { success: false, error: result.error.message };
    }

    log.info({ emailId: result.data?.id, to: params.to }, 'Email sent successfully');
    return { success: true, id: result.data?.id };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    log.error({ error }, 'Email send error');
    return { success: false, error: message };
  }
}

/**
 * Send hourly feedback digest to admin
 */
export async function sendFeedbackDigest(items: FeedbackDigestItem[]): Promise<EmailResult> {
  if (items.length === 0) {
    return { success: true };
  }

  const featureRequests = items.filter((i) => i.type === 'feature_request');
  const questions = items.filter((i) => i.type === 'question');
  const general = items.filter((i) => i.type === 'general');

  const baseUrl = process.env.APP_URL || 'https://musclemap.me';

  const formatItem = (item: FeedbackDigestItem): string => `
    <tr>
      <td style="padding: 12px; border-bottom: 1px solid #eee;">
        <strong>${escapeHtml(item.title)}</strong><br>
        <span style="color: #666; font-size: 14px;">from @${escapeHtml(item.username)}</span>
      </td>
      <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: right;">
        <a href="${baseUrl}/empire?section=feedback&id=${item.id}"
           style="background: #0066FF; color: white; padding: 8px 16px; border-radius: 4px; text-decoration: none; font-size: 14px;">
          Review
        </a>
      </td>
    </tr>
  `;

  const formatSection = (title: string, items: FeedbackDigestItem[], emoji: string): string => {
    if (items.length === 0) return '';
    return `
      <h2 style="color: #333; margin: 24px 0 12px; font-size: 18px;">
        ${emoji} ${title} (${items.length})
      </h2>
      <table style="width: 100%; border-collapse: collapse;">
        ${items.map(formatItem).join('')}
      </table>
    `;
  };

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
            <h1 style="color: #0066FF; margin: 0; font-size: 24px;">
              MuscleMap Feedback Digest
            </h1>
            <p style="color: #666; margin: 8px 0 0;">
              ${items.length} new item${items.length === 1 ? '' : 's'} in the last hour
            </p>
          </div>

          ${formatSection('Feature Requests', featureRequests, '💡')}
          ${formatSection('Questions', questions, '❓')}
          ${formatSection('General Feedback', general, '💬')}

          <div style="margin-top: 32px; padding-top: 16px; border-top: 1px solid #eee; text-align: center;">
            <a href="${baseUrl}/empire?section=feedback"
               style="color: #0066FF; text-decoration: none; font-weight: 500;">
              View All Feedback →
            </a>
          </div>
        </div>

        <p style="color: #999; font-size: 12px; text-align: center; margin-top: 16px;">
          This is an automated digest from MuscleMap.
        </p>
      </div>
    </body>
    </html>
  `;

  const text = `
MuscleMap Feedback Digest
${items.length} new item${items.length === 1 ? '' : 's'} in the last hour

${featureRequests.length > 0 ? `FEATURE REQUESTS (${featureRequests.length})\n${featureRequests.map((i) => `• "${i.title}" - from @${i.username}\n  → Review: ${baseUrl}/empire?section=feedback&id=${i.id}`).join('\n')}\n\n` : ''}
${questions.length > 0 ? `QUESTIONS (${questions.length})\n${questions.map((i) => `• "${i.title}" - from @${i.username}\n  → Review: ${baseUrl}/empire?section=feedback&id=${i.id}`).join('\n')}\n\n` : ''}
${general.length > 0 ? `GENERAL FEEDBACK (${general.length})\n${general.map((i) => `• "${i.title}" - from @${i.username}\n  → Review: ${baseUrl}/empire?section=feedback&id=${i.id}`).join('\n')}\n\n` : ''}

View all feedback: ${baseUrl}/empire?section=feedback
  `;

  return sendEmail({
    to: ADMIN_EMAIL,
    subject: `MuscleMap Feedback Digest - ${items.length} new item${items.length === 1 ? '' : 's'}`,
    html,
    text,
  });
}

/**
 * Send resolution notification to user
 */
export async function sendResolutionNotification(data: ResolutionNotificationData): Promise<EmailResult> {
  const baseUrl = process.env.APP_URL || 'https://musclemap.me';

  const statusMessages: Record<string, { emoji: string; title: string; description: string }> = {
    resolved: {
      emoji: '✅',
      title: 'Your feedback has been resolved!',
      description: "We've addressed your feedback and the solution is now live.",
    },
    closed: {
      emoji: '📝',
      title: 'Your feedback has been reviewed',
      description: "We've reviewed your feedback and closed the ticket.",
    },
    wont_fix: {
      emoji: '📋',
      title: 'Your feedback has been reviewed',
      description: "After careful consideration, we've decided not to implement this change at this time.",
    },
  };

  const statusInfo = statusMessages[data.status] || statusMessages.closed;

  const typeLabel =
    {
      bug_report: 'Bug Report',
      feature_request: 'Feature Request',
      question: 'Question',
      general: 'Feedback',
    }[data.feedbackType] || 'Feedback';

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
            <div style="font-size: 48px; margin-bottom: 16px;">${statusInfo.emoji}</div>
            <h1 style="color: #333; margin: 0; font-size: 24px;">
              ${statusInfo.title}
            </h1>
            <p style="color: #666; margin: 8px 0 0;">
              ${statusInfo.description}
            </p>
          </div>

          <div style="background: #f9f9f9; border-radius: 8px; padding: 16px; margin: 24px 0;">
            <p style="margin: 0 0 8px; color: #999; font-size: 12px; text-transform: uppercase;">
              ${typeLabel}
            </p>
            <h2 style="margin: 0; color: #333; font-size: 18px;">
              ${escapeHtml(data.title)}
            </h2>
          </div>

          ${
            data.resolutionMessage
              ? `
          <div style="margin: 24px 0;">
            <p style="margin: 0 0 8px; color: #999; font-size: 12px; text-transform: uppercase;">
              Response from MuscleMap Team
            </p>
            <p style="margin: 0; color: #333; line-height: 1.6;">
              ${escapeHtml(data.resolutionMessage)}
            </p>
          </div>
          `
              : ''
          }

          <div style="text-align: center; margin-top: 32px;">
            <a href="${baseUrl}/feedback/${data.feedbackId}"
               style="background: #0066FF; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 500; display: inline-block;">
              View Details
            </a>
          </div>

          <p style="color: #666; font-size: 14px; text-align: center; margin-top: 24px;">
            Thank you for helping make MuscleMap better! 💪
          </p>
        </div>

        <p style="color: #999; font-size: 12px; text-align: center; margin-top: 16px;">
          You're receiving this because you submitted feedback on MuscleMap.<br>
          <a href="${baseUrl}/settings/notifications" style="color: #999;">Manage email preferences</a>
        </p>
      </div>
    </body>
    </html>
  `;

  const text = `
${statusInfo.emoji} ${statusInfo.title}

${statusInfo.description}

${typeLabel}: ${data.title}

${data.resolutionMessage ? `Response from MuscleMap Team:\n${data.resolutionMessage}\n\n` : ''}

View details: ${baseUrl}/feedback/${data.feedbackId}

Thank you for helping make MuscleMap better!

---
You're receiving this because you submitted feedback on MuscleMap.
Manage email preferences: ${baseUrl}/settings/notifications
  `;

  return sendEmail({
    to: data.userEmail,
    subject: `${statusInfo.emoji} ${statusInfo.title} - ${data.title}`,
    html,
    text,
  });
}

/**
 * Send bug fix completion notification to admin
 */
export async function sendBugFixNotification(params: {
  feedbackId: string;
  title: string;
  success: boolean;
  filesModified?: string[];
  deployCommit?: string;
  errorMessage?: string;
}): Promise<EmailResult> {
  const baseUrl = process.env.APP_URL || 'https://musclemap.me';

  const html = params.success
    ? `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background: #f5f5f5;">
      <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: white; border-radius: 8px; padding: 24px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
          <div style="text-align: center; margin-bottom: 24px;">
            <div style="font-size: 48px; margin-bottom: 16px;">🤖✅</div>
            <h1 style="color: #22c55e; margin: 0; font-size: 24px;">
              Bug Auto-Fixed & Deployed!
            </h1>
          </div>

          <div style="background: #f0fdf4; border-radius: 8px; padding: 16px; margin: 24px 0;">
            <h2 style="margin: 0 0 8px; color: #333; font-size: 18px;">
              ${escapeHtml(params.title)}
            </h2>
            <p style="margin: 0; color: #666; font-size: 14px;">
              ID: ${params.feedbackId}
            </p>
          </div>

          ${
            params.filesModified && params.filesModified.length > 0
              ? `
          <div style="margin: 24px 0;">
            <p style="margin: 0 0 8px; color: #999; font-size: 12px; text-transform: uppercase;">
              Files Modified
            </p>
            <ul style="margin: 0; padding-left: 20px; color: #333;">
              ${params.filesModified.map((f) => `<li style="margin: 4px 0;"><code>${escapeHtml(f)}</code></li>`).join('')}
            </ul>
          </div>
          `
              : ''
          }

          ${
            params.deployCommit
              ? `
          <div style="margin: 24px 0;">
            <p style="margin: 0 0 8px; color: #999; font-size: 12px; text-transform: uppercase;">
              Deploy Commit
            </p>
            <code style="background: #f5f5f5; padding: 4px 8px; border-radius: 4px;">
              ${escapeHtml(params.deployCommit)}
            </code>
          </div>
          `
              : ''
          }

          <div style="text-align: center; margin-top: 32px;">
            <a href="${baseUrl}/empire?section=feedback&id=${params.feedbackId}"
               style="background: #0066FF; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 500; display: inline-block;">
              View Details
            </a>
          </div>
        </div>
      </div>
    </body>
    </html>
  `
    : `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background: #f5f5f5;">
      <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: white; border-radius: 8px; padding: 24px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
          <div style="text-align: center; margin-bottom: 24px;">
            <div style="font-size: 48px; margin-bottom: 16px;">🤖❌</div>
            <h1 style="color: #ef4444; margin: 0; font-size: 24px;">
              Bug Auto-Fix Failed
            </h1>
          </div>

          <div style="background: #fef2f2; border-radius: 8px; padding: 16px; margin: 24px 0;">
            <h2 style="margin: 0 0 8px; color: #333; font-size: 18px;">
              ${escapeHtml(params.title)}
            </h2>
            <p style="margin: 0; color: #666; font-size: 14px;">
              ID: ${params.feedbackId}
            </p>
          </div>

          <div style="margin: 24px 0;">
            <p style="margin: 0 0 8px; color: #999; font-size: 12px; text-transform: uppercase;">
              Error
            </p>
            <pre style="background: #f5f5f5; padding: 12px; border-radius: 4px; overflow-x: auto; color: #ef4444;">
${escapeHtml(params.errorMessage || 'Unknown error')}
            </pre>
          </div>

          <p style="color: #666; text-align: center;">
            Manual intervention required.
          </p>

          <div style="text-align: center; margin-top: 32px;">
            <a href="${baseUrl}/empire?section=feedback&id=${params.feedbackId}"
               style="background: #0066FF; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 500; display: inline-block;">
              Review Bug Report
            </a>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;

  return sendEmail({
    to: ADMIN_EMAIL,
    subject: params.success
      ? `🤖✅ Bug Auto-Fixed: ${params.title}`
      : `🤖❌ Bug Auto-Fix Failed: ${params.title}`,
    html,
    text: params.success
      ? `Bug Auto-Fixed & Deployed!\n\n${params.title}\nID: ${params.feedbackId}\n\nFiles Modified:\n${params.filesModified?.join('\n') || 'None'}\n\nDeploy Commit: ${params.deployCommit || 'N/A'}`
      : `Bug Auto-Fix Failed\n\n${params.title}\nID: ${params.feedbackId}\n\nError:\n${params.errorMessage || 'Unknown error'}\n\nManual intervention required.`,
  });
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

export const EmailService = {
  isConfigured: isEmailConfigured,
  send: sendEmail,
  sendFeedbackDigest,
  sendResolutionNotification,
  sendBugFixNotification,
};
