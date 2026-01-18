/**
 * Error Reporting Routes (Fastify)
 *
 * API endpoints for the Cockatrice error reporting system:
 * - Report frontend errors
 * - Batch error reporting
 * - Error pattern detection
 * - Auto-healing trigger
 *
 * These routes power the automatic error tracking and self-healing features.
 */

import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { optionalAuth } from './auth';
import { db } from '../../db/client';
import { loggers } from '../../lib/logger';

const log = loggers.http;

// ============================================
// VALIDATION SCHEMAS
// ============================================

const errorReportSchema = z.object({
  type: z.string().max(50),
  message: z.string().max(5000),
  stack: z.string().max(20000).optional(),
  componentName: z.string().max(255).optional(),
  httpStatus: z.number().int().min(100).max(599).optional(),
  url: z.string().max(2000),
  userAgent: z.string().max(1000).optional(),
  timestamp: z.string().datetime(),
  context: z.record(z.unknown()).optional(),
});

const batchErrorReportSchema = z.object({
  errors: z.array(errorReportSchema).max(20),
});

// ============================================
// INTERFACES
// ============================================

interface FrontendError {
  id: string;
  user_id: string | null;
  error_type: string;
  message: string;
  stack: string | null;
  component_name: string | null;
  http_status: number | null;
  url: string;
  user_agent: string | null;
  context: Record<string, unknown>;
  severity: string;
  pattern_id: string | null;
  is_known_issue: boolean;
  status: string;
  error_at: Date;
  created_at: Date;
}

interface ErrorPattern {
  id: string;
  name: string;
  error_type: string;
  message_pattern: string;
  occurrence_count: number;
  severity: string;
  status: string;
  auto_healing_action_id: string | null;
}

interface AutoHealingAction {
  id: string;
  name: string;
  action_type: string;
  config: Record<string, unknown>;
  is_enabled: boolean;
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Determine error severity based on type and context
 */
function determineSeverity(
  errorType: string,
  httpStatus?: number,
  context?: Record<string, unknown>
): string {
  // Critical: auth failures, server errors
  if (errorType === 'auth' || (httpStatus && httpStatus >= 500)) {
    return 'high';
  }

  // High: runtime errors
  if (errorType === 'runtime') {
    return 'high';
  }

  // Medium: chunk loading, network issues
  if (errorType === 'chunk' || errorType === 'network') {
    return 'medium';
  }

  // Check retry count in context
  const retryCount = context?.retryCount as number | undefined;
  if (retryCount && retryCount >= 2) {
    return 'high';
  }

  return 'medium';
}

/**
 * Find matching error pattern
 */
async function findMatchingPattern(
  errorType: string,
  message: string
): Promise<ErrorPattern | null> {
  // Look for patterns that match this error message
  const patterns = await db.query<ErrorPattern>(
    `SELECT * FROM error_patterns
     WHERE error_type = $1
       AND status = 'active'
       AND $2 ILIKE '%' || message_pattern || '%'
     ORDER BY occurrence_count DESC
     LIMIT 1`,
    [errorType, message]
  );

  return patterns.rows[0] || null;
}

/**
 * Get auto-healing suggestion for an error
 */
async function getAutoHealingSuggestion(
  errorType: string,
  patternId?: string | null
): Promise<{ triggered: boolean; action?: string } | null> {
  // Check for pattern-specific action first
  if (patternId) {
    const patternAction = await db.queryOne<AutoHealingAction>(
      `SELECT a.* FROM auto_healing_actions a
       JOIN error_patterns p ON p.auto_healing_action_id = a.id
       WHERE p.id = $1 AND a.is_enabled = TRUE`,
      [patternId]
    );

    if (patternAction) {
      return {
        triggered: true,
        action: patternAction.name,
      };
    }
  }

  // Check for type-specific action
  const typeAction = await db.queryOne<AutoHealingAction>(
    `SELECT * FROM auto_healing_actions
     WHERE trigger_error_type = $1
       AND is_enabled = TRUE
     ORDER BY trigger_threshold ASC
     LIMIT 1`,
    [errorType]
  );

  if (typeAction) {
    return {
      triggered: true,
      action: typeAction.name,
    };
  }

  return null;
}

/**
 * Update pattern statistics
 */
async function updatePatternStats(
  patternId: string,
  userId?: string | null
): Promise<void> {
  await db.query(
    `UPDATE error_patterns
     SET occurrence_count = occurrence_count + 1,
         last_seen = NOW(),
         affected_users = CASE
           WHEN $2::uuid IS NOT NULL THEN (
             SELECT COUNT(DISTINCT user_id) FROM frontend_errors WHERE pattern_id = $1
           )
           ELSE affected_users
         END,
         updated_at = NOW()
     WHERE id = $1`,
    [patternId, userId]
  );
}

// ============================================
// ROUTES
// ============================================

export async function registerErrorRoutes(app: FastifyInstance) {
  // ============================================
  // REPORT SINGLE ERROR
  // ============================================
  app.post('/errors/report', { preHandler: optionalAuth }, async (request, reply) => {
    const parsed = errorReportSchema.safeParse(request.body);

    if (!parsed.success) {
      return reply.status(400).send({
        error: 'Invalid error report',
        details: parsed.error.errors,
      });
    }

    const data = parsed.data;
    const userId = request.user?.userId || null;

    try {
      // Determine severity
      const severity = determineSeverity(data.type, data.httpStatus, data.context);

      // Find matching pattern
      const pattern = await findMatchingPattern(data.type, data.message);

      // Insert error record
      const result = await db.queryOne<{ id: string }>(
        `INSERT INTO frontend_errors (
          user_id, error_type, message, stack, component_name,
          http_status, url, user_agent, context, severity,
          pattern_id, is_known_issue, error_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        RETURNING id`,
        [
          userId,
          data.type,
          data.message,
          data.stack || null,
          data.componentName || null,
          data.httpStatus || null,
          data.url,
          data.userAgent || null,
          JSON.stringify(data.context || {}),
          severity,
          pattern?.id || null,
          pattern ? true : false,
          data.timestamp,
        ]
      );

      // Update pattern stats if matched
      if (pattern) {
        await updatePatternStats(pattern.id, userId);
      }

      // Get auto-healing suggestion
      const autoHealing = await getAutoHealingSuggestion(data.type, pattern?.id);

      // Log for monitoring
      log.warn(
        {
          errorId: result!.id,
          type: data.type,
          severity,
          userId,
          patternMatched: !!pattern,
          url: data.url,
        },
        `Frontend error reported: ${data.message.slice(0, 100)}`
      );

      return reply.status(201).send({
        data: {
          id: result!.id,
          isKnownIssue: !!pattern,
          message: pattern
            ? 'This is a known issue - our team is working on it'
            : 'Error reported successfully',
          autoHealing,
        },
      });
    } catch (err) {
      log.error({ err, data }, 'Failed to record frontend error');

      // Don't fail the request - error reporting should be resilient
      return reply.status(200).send({
        data: {
          id: null,
          isKnownIssue: false,
          message: 'Error acknowledged',
        },
      });
    }
  });

  // ============================================
  // BATCH REPORT ERRORS
  // ============================================
  app.post('/errors/report/batch', { preHandler: optionalAuth }, async (request, reply) => {
    const parsed = batchErrorReportSchema.safeParse(request.body);

    if (!parsed.success) {
      return reply.status(400).send({
        error: 'Invalid batch error report',
        details: parsed.error.errors,
      });
    }

    const { errors } = parsed.data;
    const userId = request.user?.userId || null;
    const results: { id: string | null; type: string }[] = [];

    for (const data of errors) {
      try {
        const severity = determineSeverity(data.type, data.httpStatus, data.context);
        const pattern = await findMatchingPattern(data.type, data.message);

        const result = await db.queryOne<{ id: string }>(
          `INSERT INTO frontend_errors (
            user_id, error_type, message, stack, component_name,
            http_status, url, user_agent, context, severity,
            pattern_id, is_known_issue, error_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
          RETURNING id`,
          [
            userId,
            data.type,
            data.message,
            data.stack || null,
            data.componentName || null,
            data.httpStatus || null,
            data.url,
            data.userAgent || null,
            JSON.stringify(data.context || {}),
            severity,
            pattern?.id || null,
            pattern ? true : false,
            data.timestamp,
          ]
        );

        if (pattern) {
          await updatePatternStats(pattern.id, userId);
        }

        results.push({ id: result!.id, type: data.type });
      } catch (err) {
        log.error({ err, data }, 'Failed to record batch error');
        results.push({ id: null, type: data.type });
      }
    }

    log.info({ count: results.filter(r => r.id).length, total: errors.length }, 'Batch errors reported');

    return reply.status(201).send({
      data: {
        processed: results.length,
        successful: results.filter(r => r.id).length,
        results,
      },
    });
  });

  // ============================================
  // GET ERROR STATS (Admin)
  // ============================================
  app.get('/errors/stats', { preHandler: optionalAuth }, async (request, reply) => {
    // This could be admin-only in production
    const query = request.query as { hours?: string };
    const hours = Math.min(parseInt(query.hours || '24'), 168); // Max 1 week

    try {
      // Get error counts by type
      const byType = await db.query<{ error_type: string; count: string }>(
        `SELECT error_type, COUNT(*) as count
         FROM frontend_errors
         WHERE error_at > NOW() - INTERVAL '1 hour' * $1
         GROUP BY error_type
         ORDER BY count DESC`,
        [hours]
      );

      // Get error counts by severity
      const bySeverity = await db.query<{ severity: string; count: string }>(
        `SELECT severity, COUNT(*) as count
         FROM frontend_errors
         WHERE error_at > NOW() - INTERVAL '1 hour' * $1
         GROUP BY severity
         ORDER BY count DESC`,
        [hours]
      );

      // Get top error messages
      const topErrors = await db.query<{ message: string; count: string; error_type: string }>(
        `SELECT message, error_type, COUNT(*) as count
         FROM frontend_errors
         WHERE error_at > NOW() - INTERVAL '1 hour' * $1
         GROUP BY message, error_type
         ORDER BY count DESC
         LIMIT 10`,
        [hours]
      );

      // Get active patterns
      const activePatterns = await db.query<ErrorPattern>(
        `SELECT * FROM error_patterns
         WHERE status = 'active'
         ORDER BY impact_score DESC
         LIMIT 10`,
        []
      );

      return reply.send({
        data: {
          period: `${hours} hours`,
          byType: byType.rows.map(r => ({
            type: r.error_type,
            count: parseInt(r.count),
          })),
          bySeverity: bySeverity.rows.map(r => ({
            severity: r.severity,
            count: parseInt(r.count),
          })),
          topErrors: topErrors.rows.map(r => ({
            message: r.message.slice(0, 200),
            type: r.error_type,
            count: parseInt(r.count),
          })),
          activePatterns: activePatterns.rows.map(p => ({
            id: p.id,
            name: p.name,
            type: p.error_type,
            occurrences: p.occurrence_count,
            severity: p.severity,
          })),
        },
      });
    } catch (err) {
      log.error({ err }, 'Failed to get error stats');
      return reply.status(500).send({ error: 'Failed to retrieve error statistics' });
    }
  });

  // ============================================
  // RESOLVE ERROR (Admin)
  // ============================================
  app.post('/errors/:id/resolve', { preHandler: optionalAuth }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = request.body as { resolution_type?: string; notes?: string };

    // In production, this should be admin-only
    try {
      const result = await db.queryOne<FrontendError>(
        `UPDATE frontend_errors
         SET status = 'resolved',
             resolution_notes = $2,
             resolved_at = NOW(),
             updated_at = NOW()
         WHERE id = $1
         RETURNING *`,
        [id, body.notes || null]
      );

      if (!result) {
        return reply.status(404).send({ error: 'Error not found' });
      }

      // Record resolution
      await db.query(
        `INSERT INTO error_resolutions (error_id, pattern_id, resolution_type, description)
         VALUES ($1, $2, $3, $4)`,
        [id, result.pattern_id, body.resolution_type || 'manual_fix', body.notes || null]
      );

      return reply.send({
        data: { id, status: 'resolved', message: 'Error marked as resolved' },
      });
    } catch (err) {
      log.error({ err, id }, 'Failed to resolve error');
      return reply.status(500).send({ error: 'Failed to resolve error' });
    }
  });

  // ============================================
  // LIST FRONTEND ERRORS (Admin)
  // ============================================
  app.get('/errors/list', { preHandler: optionalAuth }, async (request, reply) => {
    const query = request.query as {
      status?: string;
      severity?: string;
      type?: string;
      hours?: string;
      limit?: string;
      cursor?: string;
    };

    const hours = Math.min(parseInt(query.hours || '168'), 720); // Default 7 days, max 30 days
    const limit = Math.min(parseInt(query.limit || '50'), 100);

    try {
      let sql = `
        SELECT
          fe.*,
          u.username as reporter_username,
          u.email as reporter_email
        FROM frontend_errors fe
        LEFT JOIN users u ON fe.user_id = u.id
        WHERE fe.error_at > NOW() - INTERVAL '1 hour' * $1
      `;
      const params: unknown[] = [hours];
      let paramIndex = 2;

      // Status filter
      if (query.status && query.status !== 'all') {
        sql += ` AND fe.status = $${paramIndex++}`;
        params.push(query.status);
      }

      // Severity filter
      if (query.severity && query.severity !== 'all') {
        sql += ` AND fe.severity = $${paramIndex++}`;
        params.push(query.severity);
      }

      // Type filter
      if (query.type && query.type !== 'all') {
        sql += ` AND fe.error_type = $${paramIndex++}`;
        params.push(query.type);
      }

      // Keyset pagination
      if (query.cursor) {
        const [cursorDate, cursorId] = query.cursor.split('|');
        sql += ` AND (fe.error_at < $${paramIndex++} OR (fe.error_at = $${paramIndex - 1} AND fe.id < $${paramIndex++}))`;
        params.push(cursorDate, cursorId);
      }

      sql += ` ORDER BY fe.error_at DESC, fe.id DESC LIMIT $${paramIndex}`;
      params.push(limit + 1);

      const rows = await db.query<{
        id: string;
        user_id: string | null;
        error_type: string;
        message: string;
        stack: string | null;
        component_name: string | null;
        http_status: number | null;
        url: string;
        user_agent: string | null;
        context: Record<string, unknown>;
        severity: string;
        pattern_id: string | null;
        is_known_issue: boolean;
        status: string;
        error_at: Date;
        created_at: Date;
        resolved_at: Date | null;
        reporter_username: string | null;
        reporter_email: string | null;
      }>(sql, params);

      const hasMore = rows.rows.length > limit;
      const items = hasMore ? rows.rows.slice(0, -1) : rows.rows;

      const nextCursor = hasMore && items.length > 0
        ? `${items[items.length - 1].error_at.toISOString()}|${items[items.length - 1].id}`
        : null;

      return reply.send({
        items: items.map(e => ({
          id: e.id,
          userId: e.user_id,
          username: e.reporter_username,
          email: e.reporter_email,
          type: e.error_type,
          message: e.message,
          stack: e.stack,
          componentName: e.component_name,
          httpStatus: e.http_status,
          url: e.url,
          userAgent: e.user_agent,
          context: e.context,
          severity: e.severity,
          isKnownIssue: e.is_known_issue,
          status: e.status,
          errorAt: e.error_at,
          createdAt: e.created_at,
          resolvedAt: e.resolved_at,
        })),
        nextCursor,
        hasMore,
      });
    } catch (err) {
      log.error({ err }, 'Failed to list frontend errors');
      return reply.status(500).send({ error: 'Failed to list errors' });
    }
  });

  // ============================================
  // GET FRONTEND ERROR STATS FOR ADMIN (comprehensive)
  // ============================================
  app.get('/errors/admin-stats', { preHandler: optionalAuth }, async (request, reply) => {
    try {
      const [totals, byType, bySeverity, byStatus, recentActivity] = await Promise.all([
        // Total counts
        db.queryOne<{
          total: string;
          unresolved: string;
          resolved: string;
          today: string;
          this_week: string;
          unique_users: string;
        }>(`
          SELECT
            COUNT(*) as total,
            COUNT(*) FILTER (WHERE status NOT IN ('resolved')) as unresolved,
            COUNT(*) FILTER (WHERE status = 'resolved') as resolved,
            COUNT(*) FILTER (WHERE error_at > NOW() - INTERVAL '1 day') as today,
            COUNT(*) FILTER (WHERE error_at > NOW() - INTERVAL '7 days') as this_week,
            COUNT(DISTINCT user_id) FILTER (WHERE error_at > NOW() - INTERVAL '7 days') as unique_users
          FROM frontend_errors
        `, []),

        // By type
        db.query<{ error_type: string; count: string }>(`
          SELECT error_type, COUNT(*) as count FROM frontend_errors
          WHERE error_at > NOW() - INTERVAL '7 days'
          GROUP BY error_type ORDER BY count DESC
        `, []),

        // By severity
        db.query<{ severity: string; count: string }>(`
          SELECT severity, COUNT(*) as count FROM frontend_errors
          WHERE error_at > NOW() - INTERVAL '7 days'
          GROUP BY severity ORDER BY count DESC
        `, []),

        // By status
        db.query<{ status: string; count: string }>(`
          SELECT status, COUNT(*) as count FROM frontend_errors
          WHERE error_at > NOW() - INTERVAL '7 days'
          GROUP BY status ORDER BY count DESC
        `, []),

        // Recent activity by day
        db.query<{ date: Date; count: string; unique_users: string }>(`
          SELECT
            DATE_TRUNC('day', error_at) as date,
            COUNT(*) as count,
            COUNT(DISTINCT user_id) as unique_users
          FROM frontend_errors
          WHERE error_at > NOW() - INTERVAL '7 days'
          GROUP BY DATE_TRUNC('day', error_at)
          ORDER BY date DESC
        `, []),
      ]);

      return reply.send({
        totals: {
          total: parseInt(totals?.total || '0'),
          unresolved: parseInt(totals?.unresolved || '0'),
          resolved: parseInt(totals?.resolved || '0'),
          today: parseInt(totals?.today || '0'),
          thisWeek: parseInt(totals?.this_week || '0'),
          uniqueUsersThisWeek: parseInt(totals?.unique_users || '0'),
        },
        byType: Object.fromEntries(byType.rows.map(r => [r.error_type, parseInt(r.count)])),
        bySeverity: Object.fromEntries(bySeverity.rows.map(r => [r.severity, parseInt(r.count)])),
        byStatus: Object.fromEntries(byStatus.rows.map(r => [r.status, parseInt(r.count)])),
        recentActivity: recentActivity.rows.map(r => ({
          date: r.date,
          count: parseInt(r.count),
          uniqueUsers: parseInt(r.unique_users),
        })),
      });
    } catch (err) {
      log.error({ err }, 'Failed to get admin error stats');
      return reply.status(500).send({ error: 'Failed to retrieve error statistics' });
    }
  });

  // ============================================
  // CONVERT FRONTEND ERROR TO BUG REPORT
  // ============================================
  app.post('/errors/:id/convert-to-bug', { preHandler: optionalAuth }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = request.body as { priority?: string; notes?: string };

    try {
      // Get the frontend error
      const error = await db.queryOne<FrontendError>(
        `SELECT * FROM frontend_errors WHERE id = $1`,
        [id]
      );

      if (!error) {
        return reply.status(404).send({ error: 'Error not found' });
      }

      // Check if already converted
      const existing = await db.queryOne<{ id: string }>(
        `SELECT id FROM user_feedback WHERE bug_hunter_hash = $1`,
        [`fe_${id}`]
      );

      if (existing) {
        return reply.send({
          data: { id: existing.id, message: 'Bug report already exists', converted: false },
        });
      }

      // Map severity to priority
      const priorityMap: Record<string, string> = {
        critical: 'critical',
        high: 'high',
        medium: 'medium',
        low: 'low',
      };

      // Map frontend error types to user_feedback error_category enum values
      const errorCategoryMap: Record<string, string | null> = {
        runtime: 'error',
        network: 'network',
        auth: 'security',
        api: 'error',
        chunk: 'performance',
        unknown: null,
      };
      const errorCategory = errorCategoryMap[error.error_type] ?? null;

      // Create bug report
      const bugReport = await db.queryOne<{ id: string }>(
        `INSERT INTO user_feedback (
          user_id, type, status, priority, title, description,
          source, bug_hunter_hash, page_url, error_category,
          console_errors, admin_notes
        ) VALUES ($1, 'bug_report', 'open', $2, $3, $4, 'system', $5, $6, $7, $8, $9)
        RETURNING id`,
        [
          error.user_id,
          body.priority || priorityMap[error.severity] || 'medium',
          `[${error.error_type.toUpperCase()}] ${error.message.slice(0, 200)}`,
          `Auto-captured frontend error:\n\nMessage: ${error.message}\n\nComponent: ${error.component_name || 'Unknown'}\n\nStack:\n${error.stack || 'No stack trace'}\n\nContext: ${JSON.stringify(error.context, null, 2)}`,
          `fe_${id}`,
          error.url,
          errorCategory,
          JSON.stringify([error.message]),
          body.notes || `Converted from frontend error ${id}`,
        ]
      );

      // Mark frontend error as processed
      await db.query(
        `UPDATE frontend_errors SET status = 'converted', updated_at = NOW() WHERE id = $1`,
        [id]
      );

      // Add bug history
      if (bugReport) {
        await db.query(
          `INSERT INTO bug_history (feedback_id, actor_type, action, details)
           VALUES ($1, 'system', 'created', $2)`,
          [bugReport.id, JSON.stringify({ convertedFromError: id, errorType: error.error_type })]
        );
      }

      log.info({ errorId: id, bugId: bugReport?.id }, 'Converted frontend error to bug report');

      return reply.send({
        data: { id: bugReport?.id, message: 'Bug report created', converted: true },
      });
    } catch (err) {
      log.error({ err, id }, 'Failed to convert error to bug');
      return reply.status(500).send({ error: 'Failed to convert error' });
    }
  });

  // ============================================
  // BULK CONVERT HIGH-SEVERITY ERRORS TO BUGS
  // ============================================
  app.post('/errors/sync-to-bugs', { preHandler: optionalAuth }, async (request, reply) => {
    const body = request.body as { severity?: string; hours?: number; limit?: number };
    const severity = body.severity || 'high';
    const hours = Math.min(body.hours || 24, 168);
    const maxLimit = Math.min(body.limit || 50, 100);

    try {
      // Find unprocessed high-severity errors
      const errors = await db.query<FrontendError>(
        `SELECT * FROM frontend_errors
         WHERE severity IN ($1, 'critical')
           AND status NOT IN ('resolved', 'converted')
           AND error_at > NOW() - INTERVAL '1 hour' * $2
           AND id NOT IN (
             SELECT REPLACE(bug_hunter_hash, 'fe_', '') FROM user_feedback
             WHERE bug_hunter_hash LIKE 'fe_%'
           )
         ORDER BY error_at DESC
         LIMIT $3`,
        [severity, hours, maxLimit]
      );

      const results = {
        created: 0,
        skipped: 0,
        errors: [] as string[],
      };

      // Map frontend error types to user_feedback error_category enum values
      const errorCategoryMap: Record<string, string | null> = {
        runtime: 'error',
        network: 'network',
        auth: 'security',
        api: 'error',
        chunk: 'performance',
        unknown: null,
      };

      for (const error of errors.rows) {
        try {
          // Create bug report
          const priorityMap: Record<string, string> = {
            critical: 'critical',
            high: 'high',
            medium: 'medium',
            low: 'low',
          };

          const errorCategory = errorCategoryMap[error.error_type] ?? null;

          const bugReport = await db.queryOne<{ id: string }>(
            `INSERT INTO user_feedback (
              user_id, type, status, priority, title, description,
              source, bug_hunter_hash, page_url, error_category,
              console_errors
            ) VALUES ($1, 'bug_report', 'open', $2, $3, $4, 'system', $5, $6, $7, $8)
            RETURNING id`,
            [
              error.user_id,
              priorityMap[error.severity] || 'medium',
              `[${error.error_type.toUpperCase()}] ${error.message.slice(0, 200)}`,
              `Auto-captured frontend error:\n\nMessage: ${error.message}\n\nComponent: ${error.component_name || 'Unknown'}\n\nStack:\n${error.stack || 'No stack trace'}`,
              `fe_${error.id}`,
              error.url,
              errorCategory,
              JSON.stringify([error.message]),
            ]
          );

          if (bugReport) {
            await db.query(
              `UPDATE frontend_errors SET status = 'converted', updated_at = NOW() WHERE id = $1`,
              [error.id]
            );

            await db.query(
              `INSERT INTO bug_history (feedback_id, actor_type, action, details)
               VALUES ($1, 'system', 'created', $2)`,
              [bugReport.id, JSON.stringify({ convertedFromError: error.id, severity: error.severity })]
            );

            results.created++;
          }
        } catch (err) {
          results.errors.push(`Failed to convert ${error.id}: ${err instanceof Error ? err.message : 'Unknown'}`);
          results.skipped++;
        }
      }

      log.info({ ...results, total: errors.rows.length }, 'Synced frontend errors to bugs');

      return reply.send({
        data: results,
        message: `Synced ${results.created} errors to bug reports`,
      });
    } catch (err) {
      log.error({ err }, 'Failed to sync errors to bugs');
      return reply.status(500).send({ error: 'Failed to sync errors' });
    }
  });

  log.info('Error reporting routes registered');
}
