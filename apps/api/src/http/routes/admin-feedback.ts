/**
 * Admin Feedback Routes
 *
 * Handles admin management of user feedback:
 * - List/filter all feedback
 * - Update status, priority, assignment
 * - Confirm bugs for auto-fix
 * - Respond to users
 * - Get dashboard statistics
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { query as dbQuery, queryOne as dbQueryOne, queryAll as dbQueryAll } from '../../db/client';
import { authenticate, requireAdmin } from './auth';
import { loggers } from '../../lib/logger';
import { NotificationService } from '../../services/notification.service';
import { EmailService as _EmailService, sendResolutionNotification } from '../../services/email.service';
import { bugFixQueue } from '../../jobs/bug-fix.queue';

const log = loggers.api;

// Schemas
const listFeedbackSchema = z.object({
  type: z.enum(['bug_report', 'feature_request', 'question', 'general']).optional(),
  status: z.enum(['open', 'in_progress', 'confirmed', 'resolved', 'closed', 'wont_fix']).optional(),
  priority: z.enum(['low', 'medium', 'high', 'critical']).optional(),
  cursor: z.string().optional(),
  limit: z.coerce.number().min(1).max(100).default(50),
});

const updateFeedbackSchema = z.object({
  status: z.enum(['open', 'in_progress', 'confirmed', 'resolved', 'closed', 'wont_fix']).optional(),
  priority: z.enum(['low', 'medium', 'high', 'critical']).optional(),
  assigned_to: z.string().nullable().optional(),
  admin_notes: z.string().nullable().optional(),
});

const respondSchema = z.object({
  message: z.string().min(1).max(5000),
  is_internal: z.boolean().default(false),
});

interface FeedbackRow {
  id: string;
  user_id: string;
  type: string;
  status: string;
  priority: string;
  title: string;
  description: string;
  steps_to_reproduce: string | null;
  expected_behavior: string | null;
  actual_behavior: string | null;
  user_agent: string | null;
  screen_size: string | null;
  app_version: string | null;
  platform: string | null;
  category: string | null;
  attachments: unknown[];
  metadata: Record<string, unknown>;
  upvotes: number;
  admin_notes: string | null;
  assigned_to: string | null;
  confirmed_at: Date | null;
  confirmed_by: string | null;
  auto_fix_status: string | null;
  auto_fix_job_id: string | null;
  resolution_notified_at: Date | null;
  created_at: Date;
  updated_at: Date;
  resolved_at: Date | null;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  user_email: string;
}

interface FeedbackStats {
  total: number;
  by_type: Record<string, number>;
  by_status: Record<string, number>;
  by_priority: Record<string, number>;
  auto_fix_pending: number;
  auto_fix_in_progress: number;
  unresolved_bugs: number;
  pending_review: number;
}

export default async function adminFeedbackRoutes(app: FastifyInstance): Promise<void> {
  /**
   * GET /admin/feedback
   * List all feedback with filters
   */
  app.get(
    '/admin/feedback',
    { preHandler: [authenticate, requireAdmin] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const query = listFeedbackSchema.parse(request.query);

      let sql = `
        SELECT
          f.*,
          u.username,
          u.display_name,
          u.avatar_url,
          u.email as user_email
        FROM user_feedback f
        JOIN users u ON f.user_id = u.id
        WHERE 1=1
      `;
      const params: unknown[] = [];
      let paramIndex = 1;

      if (query.type) {
        sql += ` AND f.type = $${paramIndex++}`;
        params.push(query.type);
      }

      if (query.status) {
        sql += ` AND f.status = $${paramIndex++}`;
        params.push(query.status);
      }

      if (query.priority) {
        sql += ` AND f.priority = $${paramIndex++}`;
        params.push(query.priority);
      }

      // Keyset pagination
      if (query.cursor) {
        const [cursorDate, cursorId] = query.cursor.split('|');
        sql += ` AND (f.created_at < $${paramIndex++} OR (f.created_at = $${paramIndex - 1} AND f.id < $${paramIndex++}))`;
        params.push(cursorDate, cursorId);
      }

      sql += ` ORDER BY f.created_at DESC, f.id DESC LIMIT $${paramIndex}`;
      params.push(query.limit + 1);

      const rows = await dbQueryAll<FeedbackRow>(sql, params);
      const hasMore = rows.length > query.limit;
      const items = hasMore ? rows.slice(0, -1) : rows;

      const nextCursor = hasMore && items.length > 0
        ? `${items[items.length - 1].created_at.toISOString()}|${items[items.length - 1].id}`
        : null;

      return reply.send({
        items: items.map(formatFeedbackItem),
        nextCursor,
        hasMore,
      });
    }
  );

  /**
   * GET /admin/feedback/stats
   * Get dashboard statistics
   */
  app.get(
    '/admin/feedback/stats',
    { preHandler: [authenticate, requireAdmin] },
    async (_request: FastifyRequest, reply: FastifyReply) => {
      const [totals, byType, byStatus, byPriority, autoFixStats] = await Promise.all([
        dbQueryOne<{ count: string }>(`SELECT COUNT(*) as count FROM user_feedback`),
        dbQueryAll<{ type: string; count: string }>(`
          SELECT type, COUNT(*) as count FROM user_feedback GROUP BY type
        `),
        dbQueryAll<{ status: string; count: string }>(`
          SELECT status, COUNT(*) as count FROM user_feedback GROUP BY status
        `),
        dbQueryAll<{ priority: string; count: string }>(`
          SELECT priority, COUNT(*) as count FROM user_feedback WHERE type = 'bug_report' GROUP BY priority
        `),
        dbQueryOne<{ pending: string; in_progress: string }>(`
          SELECT
            COUNT(*) FILTER (WHERE auto_fix_status = 'pending') as pending,
            COUNT(*) FILTER (WHERE auto_fix_status = 'in_progress') as in_progress
          FROM user_feedback
        `),
      ]);

      // Calculate unresolved bugs and pending review
      const unresolvedBugs = await dbQueryOne<{ count: string }>(`
        SELECT COUNT(*) as count FROM user_feedback
        WHERE type = 'bug_report' AND status NOT IN ('resolved', 'closed', 'wont_fix')
      `);

      const pendingReview = await dbQueryOne<{ count: string }>(`
        SELECT COUNT(*) as count FROM user_feedback
        WHERE status = 'open' AND type != 'bug_report'
      `);

      const stats: FeedbackStats = {
        total: parseInt(totals?.count || '0'),
        by_type: Object.fromEntries(byType.map((r) => [r.type, parseInt(r.count)])),
        by_status: Object.fromEntries(byStatus.map((r) => [r.status, parseInt(r.count)])),
        by_priority: Object.fromEntries(byPriority.map((r) => [r.priority, parseInt(r.count)])),
        auto_fix_pending: parseInt(autoFixStats?.pending || '0'),
        auto_fix_in_progress: parseInt(autoFixStats?.in_progress || '0'),
        unresolved_bugs: parseInt(unresolvedBugs?.count || '0'),
        pending_review: parseInt(pendingReview?.count || '0'),
      };

      return reply.send(stats);
    }
  );

  /**
   * GET /admin/feedback/:id
   * Get single feedback with all details
   */
  app.get<{ Params: { id: string } }>(
    '/admin/feedback/:id',
    { preHandler: [authenticate, requireAdmin] },
    async (request, reply) => {
      const { id } = request.params;

      const feedback = await dbQueryOne<FeedbackRow>(`
        SELECT
          f.*,
          u.username,
          u.display_name,
          u.avatar_url,
          u.email as user_email
        FROM user_feedback f
        JOIN users u ON f.user_id = u.id
        WHERE f.id = $1
      `, [id]);

      if (!feedback) {
        return reply.status(404).send({
          error: { code: 'NOT_FOUND', message: 'Feedback not found', statusCode: 404 },
        });
      }

      // Get all responses including internal ones (admin view)
      const responses = await dbQueryAll<{
        id: string;
        responder_id: string | null;
        responder_type: string;
        message: string;
        is_internal: boolean;
        created_at: Date;
        responder_username: string | null;
      }>(`
        SELECT
          r.*,
          u.username as responder_username
        FROM feedback_responses r
        LEFT JOIN users u ON r.responder_id = u.id
        WHERE r.feedback_id = $1
        ORDER BY r.created_at ASC
      `, [id]);

      // Get agent job history if any
      const agentJobs = await dbQueryAll<{
        id: string;
        status: string;
        started_at: Date | null;
        completed_at: Date | null;
        agent_output: string | null;
        error_message: string | null;
        files_modified: string[];
        tests_passed: boolean | null;
        deployed: boolean;
        deploy_commit: string | null;
        created_at: Date;
      }>(`
        SELECT * FROM feedback_agent_jobs
        WHERE feedback_id = $1
        ORDER BY created_at DESC
      `, [id]);

      return reply.send({
        ...formatFeedbackItem(feedback),
        responses: responses.map((r) => ({
          id: r.id,
          responderId: r.responder_id,
          responderType: r.responder_type,
          responderUsername: r.responder_username,
          message: r.message,
          isInternal: r.is_internal,
          createdAt: r.created_at,
        })),
        agentJobs: agentJobs.map((j) => ({
          id: j.id,
          status: j.status,
          startedAt: j.started_at,
          completedAt: j.completed_at,
          agentOutput: j.agent_output,
          errorMessage: j.error_message,
          filesModified: j.files_modified,
          testsPassed: j.tests_passed,
          deployed: j.deployed,
          deployCommit: j.deploy_commit,
          createdAt: j.created_at,
        })),
      });
    }
  );

  /**
   * PATCH /admin/feedback/:id
   * Update feedback status, priority, assignment, notes
   */
  app.patch<{ Params: { id: string } }>(
    '/admin/feedback/:id',
    { preHandler: [authenticate, requireAdmin] },
    async (request, reply) => {
      const { id } = request.params;
      const user = request.user as { userId: string };
      const updates = updateFeedbackSchema.parse(request.body);

      // Check feedback exists
      const existing = await dbQueryOne<{ id: string; status: string; user_id: string; type: string; title: string }>(`
        SELECT id, status, user_id, type, title FROM user_feedback WHERE id = $1
      `, [id]);

      if (!existing) {
        return reply.status(404).send({
          error: { code: 'NOT_FOUND', message: 'Feedback not found', statusCode: 404 },
        });
      }

      // Build update query
      const setClauses: string[] = ['updated_at = NOW()'];
      const params: unknown[] = [];
      let paramIndex = 1;

      if (updates.status !== undefined) {
        setClauses.push(`status = $${paramIndex++}`);
        params.push(updates.status);

        // Set resolved_at if being resolved
        if (['resolved', 'closed', 'wont_fix'].includes(updates.status) && !['resolved', 'closed', 'wont_fix'].includes(existing.status)) {
          setClauses.push('resolved_at = NOW()');
        }
      }

      if (updates.priority !== undefined) {
        setClauses.push(`priority = $${paramIndex++}`);
        params.push(updates.priority);
      }

      if (updates.assigned_to !== undefined) {
        setClauses.push(`assigned_to = $${paramIndex++}`);
        params.push(updates.assigned_to);
      }

      if (updates.admin_notes !== undefined) {
        setClauses.push(`admin_notes = $${paramIndex++}`);
        params.push(updates.admin_notes);
      }

      params.push(id);

      await dbQuery(`
        UPDATE user_feedback SET ${setClauses.join(', ')} WHERE id = $${paramIndex}
      `, params);

      // If status changed to resolved/closed/wont_fix, notify user
      if (updates.status && ['resolved', 'closed', 'wont_fix'].includes(updates.status) && !['resolved', 'closed', 'wont_fix'].includes(existing.status)) {
        // Get user email for notification
        const userData = await dbQueryOne<{ email: string; username: string }>(`
          SELECT email, username FROM users WHERE id = $1
        `, [existing.user_id]);

        if (userData) {
          // Send in-app notification
          await NotificationService.create({
            userId: existing.user_id,
            type: 'SYSTEM_ANNOUNCEMENT',
            category: 'system',
            title: updates.status === 'resolved' ? 'Your feedback was resolved!' : 'Update on your feedback',
            body: `Your ${existing.type.replace('_', ' ')} "${existing.title}" has been ${updates.status === 'wont_fix' ? 'reviewed' : updates.status}.`,
            actionUrl: `/feedback/${id}`,
            actionLabel: 'View Details',
          });

          // Send email notification
          await sendResolutionNotification({
            feedbackId: id,
            feedbackType: existing.type,
            title: existing.title,
            status: updates.status,
            userEmail: userData.email,
            username: userData.username,
          });

          // Mark as notified
          await dbQuery(`UPDATE user_feedback SET resolution_notified_at = NOW() WHERE id = $1`, [id]);
        }
      }

      log.info({ feedbackId: id, updates, adminId: user.userId }, 'Feedback updated by admin');

      return reply.send({ success: true });
    }
  );

  /**
   * POST /admin/feedback/:id/confirm-bug
   * Confirm a bug for auto-fix processing
   */
  app.post<{ Params: { id: string } }>(
    '/admin/feedback/:id/confirm-bug',
    { preHandler: [authenticate, requireAdmin] },
    async (request, reply) => {
      const { id } = request.params;
      const user = request.user as { userId: string };

      const feedback = await dbQueryOne<{
        id: string;
        type: string;
        status: string;
        title: string;
        description: string;
        steps_to_reproduce: string | null;
        expected_behavior: string | null;
        actual_behavior: string | null;
        auto_fix_status: string | null;
      }>(`
        SELECT id, type, status, title, description, steps_to_reproduce, expected_behavior, actual_behavior, auto_fix_status
        FROM user_feedback WHERE id = $1
      `, [id]);

      if (!feedback) {
        return reply.status(404).send({
          error: { code: 'NOT_FOUND', message: 'Feedback not found', statusCode: 404 },
        });
      }

      if (feedback.type !== 'bug_report') {
        return reply.status(400).send({
          error: { code: 'INVALID_TYPE', message: 'Only bug reports can be confirmed', statusCode: 400 },
        });
      }

      if (feedback.auto_fix_status === 'in_progress') {
        return reply.status(400).send({
          error: { code: 'ALREADY_IN_PROGRESS', message: 'Auto-fix is already in progress', statusCode: 400 },
        });
      }

      // Update status to confirmed
      await dbQuery(`
        UPDATE user_feedback SET
          status = 'confirmed',
          confirmed_at = NOW(),
          confirmed_by = $1,
          auto_fix_status = 'pending',
          updated_at = NOW()
        WHERE id = $2
      `, [user.userId, id]);

      // Add job to bug fix queue
      const job = await bugFixQueue.add('fix-bug', {
        feedbackId: id,
        title: feedback.title,
        description: feedback.description,
        stepsToReproduce: feedback.steps_to_reproduce,
        expectedBehavior: feedback.expected_behavior,
        actualBehavior: feedback.actual_behavior,
      });

      // Store job ID
      await dbQuery(`UPDATE user_feedback SET auto_fix_job_id = $1 WHERE id = $2`, [job.id, id]);

      log.info({ feedbackId: id, jobId: job.id, adminId: user.userId }, 'Bug confirmed for auto-fix');

      return reply.send({
        success: true,
        jobId: job.id,
        message: 'Bug confirmed. Auto-fix job queued.',
      });
    }
  );

  /**
   * POST /admin/feedback/:id/cancel-autofix
   * Cancel an in-progress auto-fix
   */
  app.post<{ Params: { id: string } }>(
    '/admin/feedback/:id/cancel-autofix',
    { preHandler: [authenticate, requireAdmin] },
    async (request, reply) => {
      const { id } = request.params;
      const user = request.user as { userId: string };

      const feedback = await dbQueryOne<{ auto_fix_status: string | null; auto_fix_job_id: string | null }>(`
        SELECT auto_fix_status, auto_fix_job_id FROM user_feedback WHERE id = $1
      `, [id]);

      if (!feedback) {
        return reply.status(404).send({
          error: { code: 'NOT_FOUND', message: 'Feedback not found', statusCode: 404 },
        });
      }

      if (!feedback.auto_fix_status || !['pending', 'in_progress'].includes(feedback.auto_fix_status)) {
        return reply.status(400).send({
          error: { code: 'NO_ACTIVE_JOB', message: 'No active auto-fix job to cancel', statusCode: 400 },
        });
      }

      // Cancel the job if it exists
      if (feedback.auto_fix_job_id) {
        const job = await bugFixQueue.getJob(feedback.auto_fix_job_id);
        if (job) {
          await job.remove();
        }
      }

      // Update status
      await dbQuery(`
        UPDATE user_feedback SET
          auto_fix_status = 'cancelled',
          status = 'in_progress',
          updated_at = NOW()
        WHERE id = $1
      `, [id]);

      // Update agent job record
      await dbQuery(`
        UPDATE feedback_agent_jobs SET
          status = 'cancelled',
          completed_at = NOW(),
          updated_at = NOW()
        WHERE feedback_id = $1 AND status IN ('pending', 'running')
      `, [id]);

      log.info({ feedbackId: id, adminId: user.userId }, 'Auto-fix cancelled');

      return reply.send({ success: true });
    }
  );

  /**
   * POST /admin/feedback/:id/respond
   * Admin response to user
   */
  app.post<{ Params: { id: string } }>(
    '/admin/feedback/:id/respond',
    { preHandler: [authenticate, requireAdmin] },
    async (request, reply) => {
      const { id } = request.params;
      const user = request.user as { userId: string };
      const body = respondSchema.parse(request.body);

      const feedback = await dbQueryOne<{ id: string; user_id: string; status: string; title: string; type: string }>(`
        SELECT id, user_id, status, title, type FROM user_feedback WHERE id = $1
      `, [id]);

      if (!feedback) {
        return reply.status(404).send({
          error: { code: 'NOT_FOUND', message: 'Feedback not found', statusCode: 404 },
        });
      }

      // Insert response
      const response = await dbQueryOne<{ id: string }>(`
        INSERT INTO feedback_responses (feedback_id, responder_id, responder_type, message, is_internal)
        VALUES ($1, $2, 'admin', $3, $4)
        RETURNING id
      `, [id, user.userId, body.message, body.is_internal]);

      // Update feedback timestamp
      await dbQuery(`UPDATE user_feedback SET updated_at = NOW() WHERE id = $1`, [id]);

      // If not internal, notify user
      if (!body.is_internal) {
        await NotificationService.create({
          userId: feedback.user_id,
          type: 'SYSTEM_ANNOUNCEMENT',
          category: 'system',
          title: 'New response on your feedback',
          body: `The MuscleMap team responded to your ${feedback.type.replace('_', ' ')}: "${feedback.title}"`,
          actionUrl: `/feedback/${id}`,
          actionLabel: 'View Response',
        });
      }

      log.info({ feedbackId: id, responseId: response?.id, isInternal: body.is_internal, adminId: user.userId }, 'Admin responded to feedback');

      return reply.send({
        success: true,
        responseId: response?.id,
      });
    }
  );

  /**
   * GET /admin/feedback/recent-activity
   * Get recent activity for dashboard
   */
  app.get(
    '/admin/feedback/recent-activity',
    { preHandler: [authenticate, requireAdmin] },
    async (_request: FastifyRequest, reply: FastifyReply) => {
      // Get last 20 feedback items and responses
      const recentFeedback = await dbQueryAll<{
        id: string;
        type: string;
        title: string;
        username: string;
        created_at: Date;
      }>(`
        SELECT f.id, f.type, f.title, u.username, f.created_at
        FROM user_feedback f
        JOIN users u ON f.user_id = u.id
        ORDER BY f.created_at DESC
        LIMIT 10
      `);

      const recentResponses = await dbQueryAll<{
        feedback_id: string;
        feedback_title: string;
        responder_username: string;
        responder_type: string;
        is_internal: boolean;
        created_at: Date;
      }>(`
        SELECT
          r.feedback_id,
          f.title as feedback_title,
          u.username as responder_username,
          r.responder_type,
          r.is_internal,
          r.created_at
        FROM feedback_responses r
        JOIN user_feedback f ON r.feedback_id = f.id
        LEFT JOIN users u ON r.responder_id = u.id
        WHERE r.responder_type != 'system'
        ORDER BY r.created_at DESC
        LIMIT 10
      `);

      const recentAutoFixes = await dbQueryAll<{
        feedback_id: string;
        feedback_title: string;
        status: string;
        completed_at: Date | null;
        deployed: boolean;
      }>(`
        SELECT
          j.feedback_id,
          f.title as feedback_title,
          j.status,
          j.completed_at,
          j.deployed
        FROM feedback_agent_jobs j
        JOIN user_feedback f ON j.feedback_id = f.id
        ORDER BY j.created_at DESC
        LIMIT 10
      `);

      return reply.send({
        recentFeedback: recentFeedback.map((f) => ({
          id: f.id,
          type: f.type,
          title: f.title,
          username: f.username,
          createdAt: f.created_at,
        })),
        recentResponses: recentResponses.map((r) => ({
          feedbackId: r.feedback_id,
          feedbackTitle: r.feedback_title,
          responderUsername: r.responder_username,
          responderType: r.responder_type,
          isInternal: r.is_internal,
          createdAt: r.created_at,
        })),
        recentAutoFixes: recentAutoFixes.map((j) => ({
          feedbackId: j.feedback_id,
          feedbackTitle: j.feedback_title,
          status: j.status,
          completedAt: j.completed_at,
          deployed: j.deployed,
        })),
      });
    }
  );
}

/**
 * Format a feedback row for API response
 */
function formatFeedbackItem(row: FeedbackRow) {
  return {
    id: row.id,
    userId: row.user_id,
    type: row.type,
    status: row.status,
    priority: row.priority,
    title: row.title,
    description: row.description,
    stepsToReproduce: row.steps_to_reproduce,
    expectedBehavior: row.expected_behavior,
    actualBehavior: row.actual_behavior,
    userAgent: row.user_agent,
    screenSize: row.screen_size,
    appVersion: row.app_version,
    platform: row.platform,
    category: row.category,
    attachments: row.attachments,
    metadata: row.metadata,
    upvotes: row.upvotes,
    adminNotes: row.admin_notes,
    assignedTo: row.assigned_to,
    confirmedAt: row.confirmed_at,
    confirmedBy: row.confirmed_by,
    autoFixStatus: row.auto_fix_status,
    autoFixJobId: row.auto_fix_job_id,
    resolutionNotifiedAt: row.resolution_notified_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    resolvedAt: row.resolved_at,
    user: {
      username: row.username,
      displayName: row.display_name,
      avatarUrl: row.avatar_url,
    },
  };
}
