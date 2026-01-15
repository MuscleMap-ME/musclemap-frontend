/**
 * Admin Beta Tester Routes
 *
 * Endpoints for managing VIP beta testers, including:
 * - Granting/revoking beta tester status
 * - Viewing beta tester overview
 * - Managing progress snapshots
 * - Restoring progress from snapshots
 * - Viewing beta tester journal entries
 */

import { FastifyInstance, FastifyRequest } from 'fastify';
import { db } from '../../db/client';
import { loggers } from '../../lib/logger';
import { NotificationService } from '../../services/notification.service';
import { EmailService } from '../../services/email.service';

const log = loggers.api;

interface BetaTesterParams {
  userId: string;
}

interface SnapshotParams {
  snapshotId: string;
}

interface GrantBetaTesterBody {
  tier?: 'standard' | 'vip' | 'founding';
  notes?: string;
}

interface JournalEntryBody {
  response: string;
}

export default async function adminBetaTesterRoutes(fastify: FastifyInstance): Promise<void> {
  // All routes require admin authentication
  fastify.addHook('preHandler', async (request) => {
    await (fastify as any).authenticate(request);
    const roles = (request as any).user?.roles || [];
    if (!roles.includes('admin') && !roles.includes('super_admin')) {
      throw { statusCode: 403, message: 'Admin access required' };
    }
  });

  /**
   * GET /admin/beta-testers
   * List all beta testers with their activity stats
   */
  fastify.get('/', async (request, reply) => {
    try {
      const testers = await db.queryAll<{
        id: string;
        username: string;
        email: string;
        display_name: string;
        is_beta_tester: boolean;
        beta_tester_since: Date;
        beta_tester_tier: string;
        beta_tester_notes: string;
        level: number;
        xp: number;
        credit_balance: number;
        total_workouts: number;
        feedback_count: number;
        bug_reports: number;
        journal_entries: number;
        snapshot_count: number;
        last_snapshot: Date;
        last_activity: Date;
        account_created: Date;
      }>(`SELECT * FROM v_beta_tester_overview`);

      return reply.send({
        success: true,
        testers,
        count: testers.length,
      });
    } catch (error) {
      log.error({ error }, 'Failed to list beta testers');
      return reply.status(500).send({
        success: false,
        error: 'Failed to list beta testers',
      });
    }
  });

  /**
   * GET /admin/beta-testers/pending-feedback
   * List pending feedback from beta testers, prioritized
   */
  fastify.get('/pending-feedback', async (request, reply) => {
    try {
      const feedback = await db.queryAll<{
        id: string;
        type: string;
        title: string;
        description: string;
        status: string;
        priority: string;
        beta_tester_priority: number;
        created_at: Date;
        auto_acknowledged_at: Date;
        last_status_notification_at: Date;
        username: string;
        email: string;
        beta_tester_tier: string;
        response_count: number;
        last_status_change: Date;
      }>(`SELECT * FROM v_beta_tester_pending_feedback`);

      return reply.send({
        success: true,
        feedback,
        count: feedback.length,
      });
    } catch (error) {
      log.error({ error }, 'Failed to list beta tester feedback');
      return reply.status(500).send({
        success: false,
        error: 'Failed to list beta tester feedback',
      });
    }
  });

  /**
   * POST /admin/beta-testers/:userId/grant
   * Grant beta tester status to a user
   */
  fastify.post<{ Params: BetaTesterParams; Body: GrantBetaTesterBody }>(
    '/:userId/grant',
    async (request, reply) => {
      const { userId } = request.params;
      const { tier = 'standard', notes } = request.body || {};
      const adminId = (request as any).user.id;

      try {
        // Check if user exists
        const user = await db.queryOne<{ id: string; username: string; email: string; is_beta_tester: boolean }>(
          `SELECT id, username, email, is_beta_tester FROM users WHERE id = $1`,
          [userId]
        );

        if (!user) {
          return reply.status(404).send({
            success: false,
            error: 'User not found',
          });
        }

        if (user.is_beta_tester) {
          // Update tier/notes if already a beta tester
          await db.query(
            `UPDATE users SET
              beta_tester_tier = $1,
              beta_tester_notes = COALESCE($2, beta_tester_notes),
              updated_at = NOW()
            WHERE id = $3`,
            [tier, notes, userId]
          );
        } else {
          // Grant beta tester status
          await db.query(
            `UPDATE users SET
              is_beta_tester = TRUE,
              beta_tester_since = NOW(),
              beta_tester_tier = $1,
              beta_tester_notes = $2,
              updated_at = NOW()
            WHERE id = $3`,
            [tier, notes, userId]
          );
        }

        // Create initial progress snapshot
        const snapshotId = await db.queryOne<{ create_beta_tester_snapshot: string }>(
          `SELECT create_beta_tester_snapshot($1, 'initial_grant')`,
          [userId]
        );

        // Send welcome notification
        await NotificationService.create({
          userId,
          type: 'SYSTEM_ANNOUNCEMENT',
          category: 'system',
          title: 'Welcome to the Beta Tester Program! 🎉',
          body: `You've been granted ${tier.toUpperCase()} beta tester status. Your feedback is invaluable! You now have access to priority bug reporting and your progress is automatically backed up daily.`,
          actionUrl: '/feedback',
          actionLabel: 'Report Feedback',
        });

        // Send welcome email
        await EmailService.send({
          to: user.email,
          subject: '🎉 Welcome to the MuscleMap Beta Tester Program!',
          html: `
            <!DOCTYPE html>
            <html>
            <head><meta charset="utf-8"></head>
            <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background: #f5f5f5;">
              <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                <div style="background: white; border-radius: 8px; padding: 24px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
                  <div style="text-align: center; margin-bottom: 24px;">
                    <div style="font-size: 48px; margin-bottom: 16px;">🎉</div>
                    <h1 style="color: #9333EA; margin: 0; font-size: 24px;">
                      Welcome to the Beta Tester Program!
                    </h1>
                    <p style="color: #666; margin: 8px 0 0;">
                      You've been granted <strong>${tier.toUpperCase()}</strong> beta tester status
                    </p>
                  </div>

                  <div style="background: #faf5ff; border-radius: 8px; padding: 16px; margin: 24px 0;">
                    <h2 style="margin: 0 0 12px; color: #9333EA; font-size: 16px;">Your VIP Benefits:</h2>
                    <ul style="margin: 0; padding-left: 20px; color: #333;">
                      <li style="margin: 8px 0;">⭐ Priority bug report processing</li>
                      <li style="margin: 8px 0;">💾 Daily automatic progress backups</li>
                      <li style="margin: 8px 0;">🔄 Progress restoration if issues occur</li>
                      <li style="margin: 8px 0;">📧 Direct communication with the dev team</li>
                      <li style="margin: 8px 0;">🏷️ Special beta tester badge on your profile</li>
                    </ul>
                  </div>

                  <p style="color: #666; line-height: 1.6;">
                    Your feedback is incredibly valuable to us. Please don't hesitate to report any bugs,
                    frustrations, or suggestions you encounter. We're committed to addressing your issues quickly.
                  </p>

                  <div style="text-align: center; margin-top: 32px;">
                    <a href="https://musclemap.me/feedback"
                       style="background: #9333EA; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 500; display: inline-block;">
                      Submit Feedback
                    </a>
                  </div>

                  <p style="color: #666; font-size: 14px; text-align: center; margin-top: 24px;">
                    Thank you for helping make MuscleMap better! 💪
                  </p>
                </div>
              </div>
            </body>
            </html>
          `,
          text: `Welcome to the MuscleMap Beta Tester Program!\n\nYou've been granted ${tier.toUpperCase()} beta tester status.\n\nYour VIP Benefits:\n- Priority bug report processing\n- Daily automatic progress backups\n- Progress restoration if issues occur\n- Direct communication with the dev team\n- Special beta tester badge on your profile\n\nYour feedback is incredibly valuable. Please report any bugs, frustrations, or suggestions at https://musclemap.me/feedback\n\nThank you for helping make MuscleMap better!`,
        });

        log.info({ userId, tier, adminId }, 'Beta tester status granted');

        return reply.send({
          success: true,
          message: `Beta tester status granted to ${user.username}`,
          snapshotId: snapshotId?.create_beta_tester_snapshot,
        });
      } catch (error) {
        log.error({ error, userId }, 'Failed to grant beta tester status');
        return reply.status(500).send({
          success: false,
          error: 'Failed to grant beta tester status',
        });
      }
    }
  );

  /**
   * POST /admin/beta-testers/:userId/revoke
   * Revoke beta tester status from a user
   */
  fastify.post<{ Params: BetaTesterParams }>(
    '/:userId/revoke',
    async (request, reply) => {
      const { userId } = request.params;
      const adminId = (request as any).user.id;

      try {
        const user = await db.queryOne<{ id: string; username: string; is_beta_tester: boolean }>(
          `SELECT id, username, is_beta_tester FROM users WHERE id = $1`,
          [userId]
        );

        if (!user) {
          return reply.status(404).send({
            success: false,
            error: 'User not found',
          });
        }

        if (!user.is_beta_tester) {
          return reply.status(400).send({
            success: false,
            error: 'User is not a beta tester',
          });
        }

        await db.query(
          `UPDATE users SET
            is_beta_tester = FALSE,
            updated_at = NOW()
          WHERE id = $1`,
          [userId]
        );

        log.info({ userId, adminId }, 'Beta tester status revoked');

        return reply.send({
          success: true,
          message: `Beta tester status revoked from ${user.username}`,
        });
      } catch (error) {
        log.error({ error, userId }, 'Failed to revoke beta tester status');
        return reply.status(500).send({
          success: false,
          error: 'Failed to revoke beta tester status',
        });
      }
    }
  );

  /**
   * GET /admin/beta-testers/:userId/snapshots
   * List progress snapshots for a beta tester
   */
  fastify.get<{ Params: BetaTesterParams }>(
    '/:userId/snapshots',
    async (request, reply) => {
      const { userId } = request.params;

      try {
        const snapshots = await db.queryAll<{
          id: string;
          snapshot_type: string;
          snapshot_reason: string;
          level: number;
          xp: number;
          credit_balance: number;
          strength: number;
          constitution: number;
          dexterity: number;
          power: number;
          endurance: number;
          vitality: number;
          total_workouts: number;
          total_tu: number;
          achievement_count: number;
          created_at: Date;
          expires_at: Date;
          restored_at: Date;
        }>(
          `SELECT
            id, snapshot_type, snapshot_reason,
            level, xp, credit_balance,
            strength, constitution, dexterity, power, endurance, vitality,
            total_workouts, total_tu, achievement_count,
            created_at, expires_at, restored_at
          FROM beta_tester_progress_snapshots
          WHERE user_id = $1
          ORDER BY created_at DESC
          LIMIT 50`,
          [userId]
        );

        return reply.send({
          success: true,
          snapshots,
          count: snapshots.length,
        });
      } catch (error) {
        log.error({ error, userId }, 'Failed to list snapshots');
        return reply.status(500).send({
          success: false,
          error: 'Failed to list snapshots',
        });
      }
    }
  );

  /**
   * POST /admin/beta-testers/:userId/snapshot
   * Create a manual progress snapshot for a beta tester
   */
  fastify.post<{ Params: BetaTesterParams; Body: { reason?: string } }>(
    '/:userId/snapshot',
    async (request, reply) => {
      const { userId } = request.params;
      const { reason = 'manual_admin' } = request.body || {};
      const adminId = (request as any).user.id;

      try {
        const result = await db.queryOne<{ create_beta_tester_snapshot: string }>(
          `SELECT create_beta_tester_snapshot($1, $2)`,
          [userId, reason]
        );

        if (!result?.create_beta_tester_snapshot) {
          return reply.status(400).send({
            success: false,
            error: 'Failed to create snapshot - user may not exist',
          });
        }

        log.info({ userId, snapshotId: result.create_beta_tester_snapshot, adminId }, 'Manual snapshot created');

        return reply.send({
          success: true,
          snapshotId: result.create_beta_tester_snapshot,
          message: 'Progress snapshot created successfully',
        });
      } catch (error) {
        log.error({ error, userId }, 'Failed to create snapshot');
        return reply.status(500).send({
          success: false,
          error: 'Failed to create snapshot',
        });
      }
    }
  );

  /**
   * POST /admin/beta-testers/snapshots/:snapshotId/restore
   * Restore a beta tester's progress from a snapshot
   */
  fastify.post<{ Params: SnapshotParams }>(
    '/snapshots/:snapshotId/restore',
    async (request, reply) => {
      const { snapshotId } = request.params;
      const adminId = (request as any).user.id;

      try {
        const result = await db.queryOne<{ restore_beta_tester_progress: { success: boolean; error?: string; restored?: object } }>(
          `SELECT restore_beta_tester_progress($1, $2)`,
          [snapshotId, adminId]
        );

        const restoreResult = result?.restore_beta_tester_progress;

        if (!restoreResult?.success) {
          return reply.status(400).send({
            success: false,
            error: restoreResult?.error || 'Restore failed',
          });
        }

        // Get user info for notification
        const snapshot = await db.queryOne<{ user_id: string }>(
          `SELECT user_id FROM beta_tester_progress_snapshots WHERE id = $1`,
          [snapshotId]
        );

        if (snapshot) {
          // Notify user of restoration
          await NotificationService.create({
            userId: snapshot.user_id,
            type: 'SYSTEM_ANNOUNCEMENT',
            category: 'system',
            title: 'Progress Restored! 🔄',
            body: 'Your progress has been restored from a backup snapshot. Sorry for any inconvenience caused by the earlier issue!',
            actionUrl: '/profile',
            actionLabel: 'View Profile',
          });
        }

        log.info({ snapshotId, adminId, restored: restoreResult.restored }, 'Progress restored from snapshot');

        return reply.send({
          success: true,
          restored: restoreResult.restored,
          message: 'Progress restored successfully',
        });
      } catch (error) {
        log.error({ error, snapshotId }, 'Failed to restore progress');
        return reply.status(500).send({
          success: false,
          error: 'Failed to restore progress',
        });
      }
    }
  );

  /**
   * GET /admin/beta-testers/:userId/journal
   * Get journal entries for a beta tester
   */
  fastify.get<{ Params: BetaTesterParams }>(
    '/:userId/journal',
    async (request, reply) => {
      const { userId } = request.params;

      try {
        const entries = await db.queryAll<{
          id: string;
          entry_type: string;
          title: string;
          content: string;
          mood: string;
          tags: string[];
          page_url: string;
          attachment_urls: string[];
          admin_response: string;
          admin_responded_at: Date;
          created_at: Date;
          is_read: boolean;
          is_starred: boolean;
          is_actionable: boolean;
        }>(
          `SELECT * FROM beta_tester_journal
          WHERE user_id = $1
          ORDER BY created_at DESC
          LIMIT 100`,
          [userId]
        );

        // Mark entries as read
        await db.query(
          `UPDATE beta_tester_journal SET is_read = TRUE WHERE user_id = $1 AND is_read = FALSE`,
          [userId]
        );

        return reply.send({
          success: true,
          entries,
          count: entries.length,
        });
      } catch (error) {
        log.error({ error, userId }, 'Failed to get journal entries');
        return reply.status(500).send({
          success: false,
          error: 'Failed to get journal entries',
        });
      }
    }
  );

  /**
   * POST /admin/beta-testers/journal/:entryId/respond
   * Respond to a journal entry
   */
  fastify.post<{ Params: { entryId: string }; Body: JournalEntryBody }>(
    '/journal/:entryId/respond',
    async (request, reply) => {
      const { entryId } = request.params;
      const { response } = request.body;
      const adminId = (request as any).user.id;

      if (!response || response.trim().length === 0) {
        return reply.status(400).send({
          success: false,
          error: 'Response is required',
        });
      }

      try {
        const entry = await db.queryOne<{ id: string; user_id: string; title: string }>(
          `SELECT id, user_id, title FROM beta_tester_journal WHERE id = $1`,
          [entryId]
        );

        if (!entry) {
          return reply.status(404).send({
            success: false,
            error: 'Journal entry not found',
          });
        }

        await db.query(
          `UPDATE beta_tester_journal SET
            admin_response = $1,
            admin_responded_at = NOW(),
            admin_responded_by = $2,
            updated_at = NOW()
          WHERE id = $3`,
          [response, adminId, entryId]
        );

        // Notify user
        await NotificationService.create({
          userId: entry.user_id,
          type: 'SYSTEM_ANNOUNCEMENT',
          category: 'system',
          title: 'Response to Your Journal Entry',
          body: `The team responded to your entry "${entry.title || 'Untitled'}": ${response.substring(0, 100)}${response.length > 100 ? '...' : ''}`,
          actionUrl: '/feedback/journal',
          actionLabel: 'View Response',
        });

        log.info({ entryId, adminId }, 'Journal entry response added');

        return reply.send({
          success: true,
          message: 'Response added successfully',
        });
      } catch (error) {
        log.error({ error, entryId }, 'Failed to respond to journal entry');
        return reply.status(500).send({
          success: false,
          error: 'Failed to respond to journal entry',
        });
      }
    }
  );

  /**
   * POST /admin/beta-testers/journal/:entryId/star
   * Toggle star on a journal entry
   */
  fastify.post<{ Params: { entryId: string } }>(
    '/journal/:entryId/star',
    async (request, reply) => {
      const { entryId } = request.params;

      try {
        await db.query(
          `UPDATE beta_tester_journal SET is_starred = NOT is_starred WHERE id = $1`,
          [entryId]
        );

        return reply.send({ success: true });
      } catch (error) {
        return reply.status(500).send({ success: false, error: 'Failed to toggle star' });
      }
    }
  );

  /**
   * POST /admin/beta-testers/journal/:entryId/actionable
   * Toggle actionable flag on a journal entry
   */
  fastify.post<{ Params: { entryId: string } }>(
    '/journal/:entryId/actionable',
    async (request, reply) => {
      const { entryId } = request.params;

      try {
        await db.query(
          `UPDATE beta_tester_journal SET is_actionable = NOT is_actionable WHERE id = $1`,
          [entryId]
        );

        return reply.send({ success: true });
      } catch (error) {
        return reply.status(500).send({ success: false, error: 'Failed to toggle actionable' });
      }
    }
  );

  /**
   * GET /admin/beta-testers/search
   * Search for users to grant beta tester status
   */
  fastify.get<{ Querystring: { q: string } }>(
    '/search',
    async (request, reply) => {
      const { q } = request.query;

      if (!q || q.length < 2) {
        return reply.status(400).send({
          success: false,
          error: 'Search query must be at least 2 characters',
        });
      }

      try {
        const users = await db.queryAll<{
          id: string;
          username: string;
          email: string;
          display_name: string;
          is_beta_tester: boolean;
          beta_tester_tier: string;
          created_at: Date;
        }>(
          `SELECT id, username, email, display_name, is_beta_tester, beta_tester_tier, created_at
          FROM users
          WHERE LOWER(username) LIKE $1
            OR LOWER(email) LIKE $1
            OR LOWER(display_name) LIKE $1
          ORDER BY is_beta_tester DESC, username ASC
          LIMIT 20`,
          [`%${q.toLowerCase()}%`]
        );

        return reply.send({
          success: true,
          users,
          count: users.length,
        });
      } catch (error) {
        log.error({ error, q }, 'Failed to search users');
        return reply.status(500).send({
          success: false,
          error: 'Search failed',
        });
      }
    }
  );
}
