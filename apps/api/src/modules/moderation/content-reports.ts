/**
 * Content Reports Service
 *
 * Handles user reporting of inappropriate content:
 * - Report posts, comments, messages, users
 * - Track report status and resolution
 * - Automatic flagging for review
 * - Moderation history
 */

import crypto from 'crypto';
import { queryOne, queryAll, query, transaction } from '../../db/client';
import { loggers } from '../../lib/logger';

const log = loggers.core;

// ============================================
// TYPES
// ============================================

export type ContentType = 'post' | 'comment' | 'message' | 'user' | 'resource' | 'event' | 'hangout';
export type ReportReason =
  | 'spam'
  | 'harassment'
  | 'hate_speech'
  | 'violence'
  | 'nudity'
  | 'misinformation'
  | 'self_harm'
  | 'impersonation'
  | 'copyright'
  | 'other';
export type ReportStatus = 'pending' | 'reviewing' | 'resolved' | 'dismissed' | 'escalated';
export type ModerationAction =
  | 'warning'
  | 'content_removed'
  | 'content_hidden'
  | 'user_muted'
  | 'user_suspended'
  | 'user_banned'
  | 'no_action';

export interface ContentReport {
  id: string;
  reporterId: string;
  contentType: ContentType;
  contentId: string;
  reportedUserId: string;
  communityId?: number;
  reason: ReportReason;
  description?: string;
  status: ReportStatus;
  assignedTo?: string;
  resolvedAt?: Date;
  resolvedBy?: string;
  resolution?: string;
  actionTaken?: ModerationAction;
  createdAt: Date;
}

export interface ContentReportWithDetails extends ContentReport {
  reporterUsername: string;
  reportedUsername: string;
  communityName?: string;
  contentPreview?: string;
}

export interface UserModerationHistory {
  id: string;
  userId: string;
  action: ModerationAction;
  reason: string;
  contentReportId?: string;
  moderatorId: string;
  expiresAt?: Date;
  notes?: string;
  createdAt: Date;
}

export interface ModerationStats {
  pendingReports: number;
  resolvedToday: number;
  totalReports: number;
  byReason: Record<ReportReason, number>;
  byStatus: Record<ReportStatus, number>;
}

// ============================================
// SERVICE
// ============================================

export const contentReportsService = {
  // ==========================================
  // REPORTING
  // ==========================================

  /**
   * Submit a content report
   */
  async submitReport(
    reporterId: string,
    report: {
      contentType: ContentType;
      contentId: string;
      reportedUserId: string;
      communityId?: number;
      reason: ReportReason;
      description?: string;
    }
  ): Promise<ContentReport> {
    // Check for duplicate recent report
    const existing = await queryOne<{ id: string }>(
      `SELECT id FROM content_reports
       WHERE reporter_id = $1 AND content_type = $2 AND content_id = $3
         AND created_at > NOW() - INTERVAL '24 hours'`,
      [reporterId, report.contentType, report.contentId]
    );

    if (existing) {
      throw new Error('You have already reported this content recently');
    }

    const id = `rpt_${crypto.randomBytes(12).toString('hex')}`;

    await query(
      `INSERT INTO content_reports (
        id, reporter_id, content_type, content_id, reported_user_id,
        community_id, reason, description
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        id,
        reporterId,
        report.contentType,
        report.contentId,
        report.reportedUserId,
        report.communityId,
        report.reason,
        report.description,
      ]
    );

    // Check if auto-escalation is needed (multiple reports)
    await this.checkAutoEscalation(report.contentType, report.contentId);

    log.info(
      { reportId: id, contentType: report.contentType, reason: report.reason },
      'Content report submitted'
    );

    return {
      id,
      reporterId,
      contentType: report.contentType,
      contentId: report.contentId,
      reportedUserId: report.reportedUserId,
      communityId: report.communityId,
      reason: report.reason,
      description: report.description,
      status: 'pending',
      createdAt: new Date(),
    };
  },

  /**
   * Check if content should be auto-escalated based on report volume
   */
  async checkAutoEscalation(contentType: ContentType, contentId: string): Promise<void> {
    const reportCount = await queryOne<{ count: string }>(
      `SELECT COUNT(*) as count FROM content_reports
       WHERE content_type = $1 AND content_id = $2 AND status = 'pending'`,
      [contentType, contentId]
    );

    const count = parseInt(reportCount?.count || '0');

    // Auto-escalate if 3+ reports on same content
    if (count >= 3) {
      await query(
        `UPDATE content_reports SET status = 'escalated'
         WHERE content_type = $1 AND content_id = $2 AND status = 'pending'`,
        [contentType, contentId]
      );

      log.warn({ contentType, contentId, reportCount: count }, 'Content auto-escalated due to multiple reports');
    }
  },

  /**
   * Get report by ID
   */
  async getReport(reportId: string): Promise<ContentReportWithDetails | null> {
    const result = await queryOne<{
      id: string;
      reporter_id: string;
      content_type: string;
      content_id: string;
      reported_user_id: string;
      community_id: number | null;
      reason: string;
      description: string | null;
      status: string;
      assigned_to: string | null;
      resolved_at: Date | null;
      resolved_by: string | null;
      resolution: string | null;
      action_taken: string | null;
      created_at: Date;
      reporter_username: string;
      reported_username: string;
      community_name: string | null;
    }>(
      `SELECT cr.*,
              ur.username as reporter_username,
              urd.username as reported_username,
              c.name as community_name
       FROM content_reports cr
       JOIN users ur ON ur.id = cr.reporter_id
       JOIN users urd ON urd.id = cr.reported_user_id
       LEFT JOIN communities c ON c.id = cr.community_id
       WHERE cr.id = $1`,
      [reportId]
    );

    if (!result) return null;

    return {
      id: result.id,
      reporterId: result.reporter_id,
      contentType: result.content_type as ContentType,
      contentId: result.content_id,
      reportedUserId: result.reported_user_id,
      communityId: result.community_id || undefined,
      reason: result.reason as ReportReason,
      description: result.description || undefined,
      status: result.status as ReportStatus,
      assignedTo: result.assigned_to || undefined,
      resolvedAt: result.resolved_at || undefined,
      resolvedBy: result.resolved_by || undefined,
      resolution: result.resolution || undefined,
      actionTaken: result.action_taken as ModerationAction | undefined,
      createdAt: result.created_at,
      reporterUsername: result.reporter_username,
      reportedUsername: result.reported_username,
      communityName: result.community_name || undefined,
    };
  },

  /**
   * Get pending reports (for moderators)
   */
  async getPendingReports(options: {
    communityId?: number;
    status?: ReportStatus | ReportStatus[];
    reason?: ReportReason;
    limit?: number;
    offset?: number;
  } = {}): Promise<{ reports: ContentReportWithDetails[]; total: number }> {
    const { communityId, status = ['pending', 'escalated'], reason, limit = 20, offset = 0 } = options;

    const conditions: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    const statuses = Array.isArray(status) ? status : [status];
    conditions.push(`cr.status = ANY($${paramIndex})`);
    params.push(statuses);
    paramIndex++;

    if (communityId) {
      conditions.push(`cr.community_id = $${paramIndex}`);
      params.push(communityId);
      paramIndex++;
    }

    if (reason) {
      conditions.push(`cr.reason = $${paramIndex}`);
      params.push(reason);
      paramIndex++;
    }

    params.push(limit, offset);

    const [rows, countResult] = await Promise.all([
      queryAll<{
        id: string;
        reporter_id: string;
        content_type: string;
        content_id: string;
        reported_user_id: string;
        community_id: number | null;
        reason: string;
        description: string | null;
        status: string;
        created_at: Date;
        reporter_username: string;
        reported_username: string;
        community_name: string | null;
      }>(
        `SELECT cr.id, cr.reporter_id, cr.content_type, cr.content_id, cr.reported_user_id,
                cr.community_id, cr.reason, cr.description, cr.status, cr.created_at,
                ur.username as reporter_username,
                urd.username as reported_username,
                c.name as community_name
         FROM content_reports cr
         JOIN users ur ON ur.id = cr.reporter_id
         JOIN users urd ON urd.id = cr.reported_user_id
         LEFT JOIN communities c ON c.id = cr.community_id
         WHERE ${conditions.join(' AND ')}
         ORDER BY
           CASE WHEN cr.status = 'escalated' THEN 0 ELSE 1 END,
           cr.created_at ASC
         LIMIT $${paramIndex - 1} OFFSET $${paramIndex}`,
        params
      ),
      queryOne<{ count: string }>(
        `SELECT COUNT(*) as count FROM content_reports cr WHERE ${conditions.join(' AND ')}`,
        params.slice(0, -2)
      ),
    ]);

    return {
      reports: rows.map((r) => ({
        id: r.id,
        reporterId: r.reporter_id,
        contentType: r.content_type as ContentType,
        contentId: r.content_id,
        reportedUserId: r.reported_user_id,
        communityId: r.community_id || undefined,
        reason: r.reason as ReportReason,
        description: r.description || undefined,
        status: r.status as ReportStatus,
        createdAt: r.created_at,
        reporterUsername: r.reporter_username,
        reportedUsername: r.reported_username,
        communityName: r.community_name || undefined,
      })),
      total: parseInt(countResult?.count || '0'),
    };
  },

  // ==========================================
  // RESOLUTION
  // ==========================================

  /**
   * Resolve a report
   */
  async resolveReport(
    reportId: string,
    moderatorId: string,
    resolution: {
      status: 'resolved' | 'dismissed';
      resolution: string;
      actionTaken: ModerationAction;
    }
  ): Promise<void> {
    await transaction(async (client) => {
      // Update report
      const result = await client.query(
        `UPDATE content_reports
         SET status = $2, resolved_at = NOW(), resolved_by = $3, resolution = $4, action_taken = $5
         WHERE id = $1 AND status IN ('pending', 'reviewing', 'escalated')
         RETURNING reported_user_id, reason`,
        [reportId, resolution.status, moderatorId, resolution.resolution, resolution.actionTaken]
      );

      if (result.rowCount === 0) {
        throw new Error('Report not found or already resolved');
      }

      const { reported_user_id, reason } = result.rows[0];

      // Record moderation action if any was taken
      if (resolution.actionTaken !== 'no_action') {
        const historyId = `mh_${crypto.randomBytes(12).toString('hex')}`;
        await client.query(
          `INSERT INTO user_moderation_history (id, user_id, action, reason, content_report_id, moderator_id, notes)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [historyId, reported_user_id, resolution.actionTaken, reason, reportId, moderatorId, resolution.resolution]
        );
      }

      log.info(
        { reportId, moderatorId, action: resolution.actionTaken },
        'Content report resolved'
      );
    });
  },

  /**
   * Assign report to moderator
   */
  async assignReport(reportId: string, moderatorId: string): Promise<void> {
    await query(
      `UPDATE content_reports SET assigned_to = $2, status = 'reviewing'
       WHERE id = $1 AND status IN ('pending', 'escalated')`,
      [reportId, moderatorId]
    );
  },

  // ==========================================
  // USER MODERATION
  // ==========================================

  /**
   * Get user's moderation history
   */
  async getUserModerationHistory(userId: string): Promise<UserModerationHistory[]> {
    const rows = await queryAll<{
      id: string;
      user_id: string;
      action: string;
      reason: string;
      content_report_id: string | null;
      moderator_id: string;
      expires_at: Date | null;
      notes: string | null;
      created_at: Date;
    }>(
      `SELECT * FROM user_moderation_history WHERE user_id = $1 ORDER BY created_at DESC`,
      [userId]
    );

    return rows.map((r) => ({
      id: r.id,
      userId: r.user_id,
      action: r.action as ModerationAction,
      reason: r.reason,
      contentReportId: r.content_report_id || undefined,
      moderatorId: r.moderator_id,
      expiresAt: r.expires_at || undefined,
      notes: r.notes || undefined,
      createdAt: r.created_at,
    }));
  },

  /**
   * Check if user is currently under moderation action
   */
  async getActiveModeration(userId: string): Promise<UserModerationHistory | null> {
    const result = await queryOne<{
      id: string;
      user_id: string;
      action: string;
      reason: string;
      moderator_id: string;
      expires_at: Date | null;
      created_at: Date;
    }>(
      `SELECT * FROM user_moderation_history
       WHERE user_id = $1
         AND action IN ('user_muted', 'user_suspended', 'user_banned')
         AND (expires_at IS NULL OR expires_at > NOW())
       ORDER BY
         CASE action
           WHEN 'user_banned' THEN 0
           WHEN 'user_suspended' THEN 1
           WHEN 'user_muted' THEN 2
           ELSE 3
         END
       LIMIT 1`,
      [userId]
    );

    if (!result) return null;

    return {
      id: result.id,
      userId: result.user_id,
      action: result.action as ModerationAction,
      reason: result.reason,
      moderatorId: result.moderator_id,
      expiresAt: result.expires_at || undefined,
      createdAt: result.created_at,
    };
  },

  /**
   * Apply moderation action to user
   */
  async applyModerationAction(
    userId: string,
    moderatorId: string,
    action: {
      action: ModerationAction;
      reason: string;
      durationHours?: number;
      notes?: string;
    }
  ): Promise<UserModerationHistory> {
    const id = `mh_${crypto.randomBytes(12).toString('hex')}`;
    const expiresAt = action.durationHours
      ? new Date(Date.now() + action.durationHours * 60 * 60 * 1000)
      : null;

    await query(
      `INSERT INTO user_moderation_history (id, user_id, action, reason, moderator_id, expires_at, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [id, userId, action.action, action.reason, moderatorId, expiresAt, action.notes]
    );

    log.warn(
      { userId, moderatorId, action: action.action, expiresAt },
      'Moderation action applied'
    );

    return {
      id,
      userId,
      action: action.action,
      reason: action.reason,
      moderatorId,
      expiresAt: expiresAt || undefined,
      notes: action.notes,
      createdAt: new Date(),
    };
  },

  // ==========================================
  // STATS
  // ==========================================

  /**
   * Get moderation statistics
   */
  async getStats(communityId?: number): Promise<ModerationStats> {
    const communityCondition = communityId ? 'AND community_id = $1' : '';
    const params = communityId ? [communityId] : [];

    const [pending, resolvedToday, total, byReason, byStatus] = await Promise.all([
      queryOne<{ count: string }>(
        `SELECT COUNT(*) as count FROM content_reports WHERE status IN ('pending', 'escalated') ${communityCondition}`,
        params
      ),
      queryOne<{ count: string }>(
        `SELECT COUNT(*) as count FROM content_reports WHERE resolved_at::date = CURRENT_DATE ${communityCondition}`,
        params
      ),
      queryOne<{ count: string }>(
        `SELECT COUNT(*) as count FROM content_reports WHERE 1=1 ${communityCondition}`,
        params
      ),
      queryAll<{ reason: string; count: string }>(
        `SELECT reason, COUNT(*) as count FROM content_reports WHERE 1=1 ${communityCondition} GROUP BY reason`,
        params
      ),
      queryAll<{ status: string; count: string }>(
        `SELECT status, COUNT(*) as count FROM content_reports WHERE 1=1 ${communityCondition} GROUP BY status`,
        params
      ),
    ]);

    const reasonCounts: Record<string, number> = {};
    for (const r of byReason) {
      reasonCounts[r.reason] = parseInt(r.count);
    }

    const statusCounts: Record<string, number> = {};
    for (const s of byStatus) {
      statusCounts[s.status] = parseInt(s.count);
    }

    return {
      pendingReports: parseInt(pending?.count || '0'),
      resolvedToday: parseInt(resolvedToday?.count || '0'),
      totalReports: parseInt(total?.count || '0'),
      byReason: reasonCounts as Record<ReportReason, number>,
      byStatus: statusCounts as Record<ReportStatus, number>,
    };
  },

  /**
   * Get reports for a specific user (as reporter or reported)
   */
  async getUserReports(
    userId: string,
    role: 'reporter' | 'reported'
  ): Promise<ContentReport[]> {
    const column = role === 'reporter' ? 'reporter_id' : 'reported_user_id';

    const rows = await queryAll<{
      id: string;
      reporter_id: string;
      content_type: string;
      content_id: string;
      reported_user_id: string;
      community_id: number | null;
      reason: string;
      description: string | null;
      status: string;
      action_taken: string | null;
      created_at: Date;
    }>(
      `SELECT id, reporter_id, content_type, content_id, reported_user_id,
              community_id, reason, description, status, action_taken, created_at
       FROM content_reports WHERE ${column} = $1 ORDER BY created_at DESC`,
      [userId]
    );

    return rows.map((r) => ({
      id: r.id,
      reporterId: r.reporter_id,
      contentType: r.content_type as ContentType,
      contentId: r.content_id,
      reportedUserId: r.reported_user_id,
      communityId: r.community_id || undefined,
      reason: r.reason as ReportReason,
      description: r.description || undefined,
      status: r.status as ReportStatus,
      actionTaken: r.action_taken as ModerationAction | undefined,
      createdAt: r.created_at,
    }));
  },
};

export default contentReportsService;
