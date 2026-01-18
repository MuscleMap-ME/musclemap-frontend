/**
 * Admin Bug Management Routes
 *
 * Comprehensive bug tracking dashboard endpoints:
 * - Sync bug hunter reports to database
 * - List all bugs (open, closed, all)
 * - Bug metrics and analytics
 * - Bug history and timeline
 * - Duplicate detection
 * - Bulk operations
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { query as dbQuery, queryOne as dbQueryOne, queryAll as dbQueryAll } from '../../db/client';
import { authenticate, requireAdmin } from './auth';
import { loggers } from '../../lib/logger';
import { bugFixQueue, type BugFixJobData } from '../../jobs/bug-fix.queue';
import fs from 'fs/promises';
import path from 'path';

// Bug Hunter API key for automated syncing (allows sync without admin auth)
const BUG_HUNTER_API_KEY = process.env.BUG_HUNTER_API_KEY || 'bug-hunter-internal-key-12345';

/**
 * Middleware to allow either admin auth OR bug hunter API key
 */
async function authenticateBugHunterOrAdmin(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  const bugHunterKey = request.headers['x-bug-hunter-key'];

  if (bugHunterKey === BUG_HUNTER_API_KEY) {
    // Bug hunter key is valid, allow the request
    return;
  }

  // Fall back to normal admin authentication
  await authenticate(request, reply);
  await requireAdmin(request, reply);
}

const log = loggers.api;

// Bug hunter reports directory (relative to project root)
const BUG_HUNTER_REPORTS_DIR = path.join(process.cwd(), '..', '..', 'scripts', 'bug-hunter', 'reports', 'daily');

interface BugHunterReport {
  date: string;
  generatedAt: string;
  summary: { bugsFound: number; bugsFixed: number };
  bySeverity: Record<string, number>;
  byType: Record<string, number>;
  bugs: Array<{
    id: string;
    title: string;
    severity: string;
    status: string;
    url: string;
  }>;
}

// ============================================
// SCHEMAS
// ============================================

const syncBugReportSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string().optional(),
  severity: z.enum(['critical', 'high', 'medium', 'low']),
  url: z.string(),
  status: z.enum(['pending', 'fixing', 'fixed', 'failed', 'ignored']).default('pending'),
  category: z.enum(['crash', 'error', 'ui', 'network', 'performance', 'accessibility', 'security']).optional(),
  rootCause: z.object({
    type: z.enum(['frontend', 'backend', 'database', 'integration', 'unknown']).optional(),
    file: z.string().optional(),
    hypothesis: z.string().optional(),
    evidence: z.array(z.string()).optional(),
  }).optional(),
  suggestedFix: z.object({
    description: z.string().optional(),
    codeChanges: z.array(z.object({
      file: z.string(),
      description: z.string(),
    })).optional(),
  }).optional(),
  consoleErrors: z.array(z.string()).optional(),
  networkErrors: z.array(z.string()).optional(),
  hash: z.string().optional(),
});

const listBugsSchema = z.object({
  status: z.enum(['open', 'in_progress', 'confirmed', 'resolved', 'closed', 'wont_fix', 'all']).default('all'),
  source: z.enum(['user', 'bug_hunter', 'system', 'api_test', 'e2e_test', 'all']).default('all'),
  priority: z.enum(['low', 'medium', 'high', 'critical', 'all']).default('all'),
  category: z.enum(['crash', 'error', 'ui', 'network', 'performance', 'accessibility', 'security', 'all']).default('all'),
  sort: z.enum(['newest', 'oldest', 'priority', 'severity']).default('newest'),
  cursor: z.string().optional(),
  limit: z.coerce.number().min(1).max(100).default(50),
});

const updateBugSchema = z.object({
  status: z.enum(['open', 'in_progress', 'confirmed', 'resolved', 'closed', 'wont_fix']).optional(),
  priority: z.enum(['low', 'medium', 'high', 'critical']).optional(),
  assignedTo: z.string().nullable().optional(),
  resolutionType: z.enum(['auto_fix', 'manual_fix', 'duplicate', 'not_a_bug', 'wont_fix', 'cannot_reproduce']).optional(),
  resolutionNotes: z.string().optional(),
  fixCommit: z.string().optional(),
  fixPrUrl: z.string().optional(),
  duplicateOf: z.string().optional(),
  adminNotes: z.string().optional(),
});

const bulkUpdateSchema = z.object({
  ids: z.array(z.string()).min(1).max(100),
  updates: updateBugSchema,
});

// ============================================
// INTERFACES
// ============================================

interface BugRow {
  id: string;
  user_id: string | null;
  type: string;
  status: string;
  priority: string;
  title: string;
  description: string;
  source: string;
  bug_hunter_id: string | null;
  bug_hunter_hash: string | null;
  page_url: string | null;
  error_category: string | null;
  root_cause_type: string | null;
  root_cause_file: string | null;
  root_cause_hypothesis: string | null;
  suggested_fix: unknown;
  console_errors: unknown;
  network_errors: unknown;
  resolved_by: string | null;
  resolution_type: string | null;
  resolution_notes: string | null;
  fix_commit: string | null;
  fix_pr_url: string | null;
  files_changed: unknown;
  verified_fixed_at: Date | null;
  duplicate_of: string | null;
  admin_notes: string | null;
  assigned_to: string | null;
  auto_fix_status: string | null;
  created_at: Date;
  updated_at: Date;
  resolved_at: Date | null;
  confirmed_at: Date | null;
  // Joined fields
  reporter_username: string | null;
  resolver_username: string | null;
  assignee_username: string | null;
}

// ============================================
// ROUTES
// ============================================

export default async function adminBugsRoutes(app: FastifyInstance): Promise<void> {
  /**
   * POST /admin/bugs/sync
   * Sync bug hunter reports to database
   * If empty array passed, reads from local bug hunter reports directory
   * Accepts either admin auth OR bug hunter API key
   */
  app.post(
    '/admin/bugs/sync',
    { preHandler: [authenticateBugHunterOrAdmin] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      let bugs = z.array(syncBugReportSchema).parse(request.body);

      const results = {
        created: 0,
        updated: 0,
        skipped: 0,
        errors: [] as string[],
        source: 'request',
      };

      // If no bugs provided, try to read from local bug hunter reports
      if (bugs.length === 0) {
        try {
          results.source = 'local_files';
          const files = await fs.readdir(BUG_HUNTER_REPORTS_DIR);
          const jsonFiles = files.filter(f => f.endsWith('.json')).sort().reverse();

          // Read the most recent report
          if (jsonFiles.length > 0) {
            const latestFile = path.join(BUG_HUNTER_REPORTS_DIR, jsonFiles[0]);
            const content = await fs.readFile(latestFile, 'utf-8');
            const report = JSON.parse(content) as BugHunterReport;

            // Convert report bugs to our format
            bugs = report.bugs.map(b => ({
              id: b.id,
              title: b.title,
              severity: b.severity as 'critical' | 'high' | 'medium' | 'low',
              url: b.url,
              status: b.status as 'pending' | 'fixing' | 'fixed' | 'failed' | 'ignored',
            }));

            log.info({ file: jsonFiles[0], bugCount: bugs.length }, 'Loaded bugs from local file');
          } else {
            log.info('No bug hunter reports found');
            return reply.send({
              ...results,
              message: 'No bug hunter reports found in local directory',
            });
          }
        } catch (error) {
          log.error({ error }, 'Failed to read local bug hunter reports');
          results.errors.push(`Failed to read local reports: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }

      for (const bug of bugs) {
        try {
          // Check if bug already exists by bug_hunter_id or hash
          const existing = await dbQueryOne<{ id: string }>(`
            SELECT id FROM user_feedback
            WHERE bug_hunter_id = $1 OR (bug_hunter_hash = $2 AND bug_hunter_hash IS NOT NULL)
          `, [bug.id, bug.hash]);

          const mapStatus = (status: string): string => {
            switch (status) {
              case 'pending': return 'open';
              case 'fixing': return 'in_progress';
              case 'fixed': return 'resolved';
              case 'failed': return 'open';
              case 'ignored': return 'wont_fix';
              default: return 'open';
            }
          };

          const mapPriority = (severity: string): string => {
            return severity; // Already matches our enum
          };

          if (existing) {
            // Update existing bug (only if status changed)
            await dbQuery(`
              UPDATE user_feedback SET
                title = $1,
                description = COALESCE($2, description),
                priority = $3,
                page_url = $4,
                error_category = $5,
                root_cause_type = $6,
                root_cause_file = $7,
                root_cause_hypothesis = $8,
                suggested_fix = $9,
                console_errors = $10,
                network_errors = $11,
                updated_at = NOW()
              WHERE id = $12
            `, [
              bug.title,
              bug.description,
              mapPriority(bug.severity),
              bug.url,
              bug.category || null,
              bug.rootCause?.type || null,
              bug.rootCause?.file || null,
              bug.rootCause?.hypothesis || null,
              JSON.stringify(bug.suggestedFix || null),
              JSON.stringify(bug.consoleErrors || []),
              JSON.stringify(bug.networkErrors || []),
              existing.id,
            ]);
            results.updated++;
          } else {
            // Create new bug
            const newBug = await dbQueryOne<{ id: string }>(`
              INSERT INTO user_feedback (
                type, status, priority, title, description,
                source, bug_hunter_id, bug_hunter_hash, page_url,
                error_category, root_cause_type, root_cause_file, root_cause_hypothesis,
                suggested_fix, console_errors, network_errors
              ) VALUES (
                'bug_report', $1, $2, $3, $4,
                'bug_hunter', $5, $6, $7,
                $8, $9, $10, $11,
                $12, $13, $14
              )
              RETURNING id
            `, [
              mapStatus(bug.status),
              mapPriority(bug.severity),
              bug.title,
              bug.description || `Auto-discovered bug at ${bug.url}`,
              bug.id,
              bug.hash || null,
              bug.url,
              bug.category || null,
              bug.rootCause?.type || null,
              bug.rootCause?.file || null,
              bug.rootCause?.hypothesis || null,
              JSON.stringify(bug.suggestedFix || null),
              JSON.stringify(bug.consoleErrors || []),
              JSON.stringify(bug.networkErrors || []),
            ]);

            // Add history entry
            if (newBug) {
              await dbQuery(`
                INSERT INTO bug_history (feedback_id, actor_type, action, details)
                VALUES ($1, 'bug_hunter', 'created', $2)
              `, [newBug.id, JSON.stringify({ url: bug.url, severity: bug.severity })]);
            }

            results.created++;
          }
        } catch (error) {
          results.errors.push(`Failed to sync bug ${bug.id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }

      // Refresh materialized view
      try {
        await dbQuery('REFRESH MATERIALIZED VIEW CONCURRENTLY mv_bug_metrics');
      } catch {
        // View might not exist yet, ignore
      }

      log.info({ ...results, total: bugs.length }, 'Bug sync completed');

      return reply.send(results);
    }
  );

  /**
   * GET /admin/bugs
   * List all bugs with comprehensive filtering
   */
  app.get(
    '/admin/bugs',
    { preHandler: [authenticate, requireAdmin] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const query = listBugsSchema.parse(request.query);

      let sql = `
        SELECT
          f.*,
          u1.username as reporter_username,
          u2.username as resolver_username,
          u3.username as assignee_username
        FROM user_feedback f
        LEFT JOIN users u1 ON f.user_id = u1.id
        LEFT JOIN users u2 ON f.resolved_by = u2.id
        LEFT JOIN users u3 ON f.assigned_to = u3.id
        WHERE f.type = 'bug_report'
      `;
      const params: unknown[] = [];
      let paramIndex = 1;

      // Status filter
      if (query.status !== 'all') {
        sql += ` AND f.status = $${paramIndex++}`;
        params.push(query.status);
      }

      // Source filter
      if (query.source !== 'all') {
        sql += ` AND f.source = $${paramIndex++}`;
        params.push(query.source);
      }

      // Priority filter
      if (query.priority !== 'all') {
        sql += ` AND f.priority = $${paramIndex++}`;
        params.push(query.priority);
      }

      // Category filter
      if (query.category !== 'all') {
        sql += ` AND f.error_category = $${paramIndex++}`;
        params.push(query.category);
      }

      // Sorting
      const sortMap: Record<string, string> = {
        newest: 'f.created_at DESC, f.id DESC',
        oldest: 'f.created_at ASC, f.id ASC',
        priority: `CASE f.priority
          WHEN 'critical' THEN 1
          WHEN 'high' THEN 2
          WHEN 'medium' THEN 3
          WHEN 'low' THEN 4
        END ASC, f.created_at DESC`,
        severity: `CASE f.priority
          WHEN 'critical' THEN 1
          WHEN 'high' THEN 2
          WHEN 'medium' THEN 3
          WHEN 'low' THEN 4
        END ASC, f.created_at DESC`,
      };

      // Keyset pagination (for newest sort)
      if (query.cursor && query.sort === 'newest') {
        const [cursorDate, cursorId] = query.cursor.split('|');
        sql += ` AND (f.created_at < $${paramIndex++} OR (f.created_at = $${paramIndex - 1} AND f.id < $${paramIndex++}))`;
        params.push(cursorDate, cursorId);
      }

      sql += ` ORDER BY ${sortMap[query.sort]} LIMIT $${paramIndex}`;
      params.push(query.limit + 1);

      const rows = await dbQueryAll<BugRow>(sql, params);
      const hasMore = rows.length > query.limit;
      const items = hasMore ? rows.slice(0, -1) : rows;

      const nextCursor = hasMore && items.length > 0 && query.sort === 'newest'
        ? `${items[items.length - 1].created_at.toISOString()}|${items[items.length - 1].id}`
        : null;

      return reply.send({
        items: items.map(formatBugItem),
        nextCursor,
        hasMore,
      });
    }
  );

  /**
   * GET /admin/bugs/stats
   * Comprehensive bug statistics
   */
  app.get(
    '/admin/bugs/stats',
    { preHandler: [authenticate, requireAdmin] },
    async (_request: FastifyRequest, reply: FastifyReply) => {
      const [
        totals,
        byStatus,
        byPriority,
        bySource,
        byCategory,
        autoFixStats,
        recentActivity,
        avgResolutionTime,
      ] = await Promise.all([
        // Total counts
        dbQueryOne<{
          total: string;
          open: string;
          resolved: string;
          today: string;
          this_week: string;
        }>(`
          SELECT
            COUNT(*) as total,
            COUNT(*) FILTER (WHERE status NOT IN ('resolved', 'closed', 'wont_fix')) as open,
            COUNT(*) FILTER (WHERE status IN ('resolved', 'closed')) as resolved,
            COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '1 day') as today,
            COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '7 days') as this_week
          FROM user_feedback WHERE type = 'bug_report'
        `),

        // By status
        dbQueryAll<{ status: string; count: string }>(`
          SELECT status, COUNT(*) as count FROM user_feedback
          WHERE type = 'bug_report' GROUP BY status
        `),

        // By priority
        dbQueryAll<{ priority: string; count: string }>(`
          SELECT priority, COUNT(*) as count FROM user_feedback
          WHERE type = 'bug_report' GROUP BY priority
        `),

        // By source
        dbQueryAll<{ source: string; count: string }>(`
          SELECT COALESCE(source, 'user') as source, COUNT(*) as count FROM user_feedback
          WHERE type = 'bug_report' GROUP BY source
        `),

        // By category
        dbQueryAll<{ category: string; count: string }>(`
          SELECT COALESCE(error_category, 'unknown') as category, COUNT(*) as count FROM user_feedback
          WHERE type = 'bug_report' AND error_category IS NOT NULL GROUP BY error_category
        `),

        // Auto-fix stats
        dbQueryOne<{
          pending: string;
          in_progress: string;
          completed: string;
          failed: string;
        }>(`
          SELECT
            COUNT(*) FILTER (WHERE auto_fix_status = 'pending') as pending,
            COUNT(*) FILTER (WHERE auto_fix_status = 'in_progress') as in_progress,
            COUNT(*) FILTER (WHERE auto_fix_status = 'completed') as completed,
            COUNT(*) FILTER (WHERE auto_fix_status = 'failed') as failed
          FROM user_feedback WHERE type = 'bug_report'
        `),

        // Recent activity (last 7 days)
        dbQueryAll<{ date: Date; created: string; resolved: string }>(`
          SELECT
            DATE_TRUNC('day', created_at) as date,
            COUNT(*) as created,
            COUNT(*) FILTER (WHERE resolved_at::date = created_at::date) as resolved
          FROM user_feedback
          WHERE type = 'bug_report' AND created_at > NOW() - INTERVAL '7 days'
          GROUP BY DATE_TRUNC('day', created_at)
          ORDER BY date DESC
        `),

        // Average resolution time
        dbQueryOne<{ avg_hours: string }>(`
          SELECT AVG(EXTRACT(EPOCH FROM (resolved_at - created_at))/3600) as avg_hours
          FROM user_feedback
          WHERE type = 'bug_report' AND resolved_at IS NOT NULL
          AND resolved_at > NOW() - INTERVAL '30 days'
        `),
      ]);

      return reply.send({
        totals: {
          total: parseInt(totals?.total || '0'),
          open: parseInt(totals?.open || '0'),
          resolved: parseInt(totals?.resolved || '0'),
          today: parseInt(totals?.today || '0'),
          thisWeek: parseInt(totals?.this_week || '0'),
        },
        byStatus: Object.fromEntries(byStatus.map(r => [r.status, parseInt(r.count)])),
        byPriority: Object.fromEntries(byPriority.map(r => [r.priority, parseInt(r.count)])),
        bySource: Object.fromEntries(bySource.map(r => [r.source, parseInt(r.count)])),
        byCategory: Object.fromEntries(byCategory.map(r => [r.category, parseInt(r.count)])),
        autoFix: {
          pending: parseInt(autoFixStats?.pending || '0'),
          inProgress: parseInt(autoFixStats?.in_progress || '0'),
          completed: parseInt(autoFixStats?.completed || '0'),
          failed: parseInt(autoFixStats?.failed || '0'),
        },
        recentActivity: recentActivity.map(r => ({
          date: r.date,
          created: parseInt(r.created),
          resolved: parseInt(r.resolved),
        })),
        avgResolutionTimeHours: parseFloat(avgResolutionTime?.avg_hours || '0'),
      });
    }
  );

  /**
   * GET /admin/bugs/:id
   * Get single bug with full history
   */
  app.get<{ Params: { id: string } }>(
    '/admin/bugs/:id',
    { preHandler: [authenticate, requireAdmin] },
    async (request, reply) => {
      const { id } = request.params;

      const bug = await dbQueryOne<BugRow>(`
        SELECT
          f.*,
          u1.username as reporter_username,
          u2.username as resolver_username,
          u3.username as assignee_username
        FROM user_feedback f
        LEFT JOIN users u1 ON f.user_id = u1.id
        LEFT JOIN users u2 ON f.resolved_by = u2.id
        LEFT JOIN users u3 ON f.assigned_to = u3.id
        WHERE f.id = $1 AND f.type = 'bug_report'
      `, [id]);

      if (!bug) {
        return reply.status(404).send({
          error: { code: 'NOT_FOUND', message: 'Bug not found', statusCode: 404 },
        });
      }

      // Get history
      const history = await dbQueryAll<{
        id: string;
        actor_id: string | null;
        actor_type: string;
        action: string;
        previous_value: string | null;
        new_value: string | null;
        details: unknown;
        created_at: Date;
        actor_username: string | null;
      }>(`
        SELECT
          h.*,
          u.username as actor_username
        FROM bug_history h
        LEFT JOIN users u ON h.actor_id = u.id
        WHERE h.feedback_id = $1
        ORDER BY h.created_at DESC
        LIMIT 100
      `, [id]);

      // Get related bugs (same page_url or hash)
      const relatedBugs = await dbQueryAll<{ id: string; title: string; status: string; created_at: Date }>(`
        SELECT id, title, status, created_at FROM user_feedback
        WHERE type = 'bug_report' AND id != $1
        AND (page_url = $2 OR bug_hunter_hash = $3)
        ORDER BY created_at DESC
        LIMIT 10
      `, [id, bug.page_url, bug.bug_hunter_hash]);

      // Get agent jobs if any
      const agentJobs = await dbQueryAll<{
        id: string;
        status: string;
        started_at: Date | null;
        completed_at: Date | null;
        agent_output: string | null;
        error_message: string | null;
        files_modified: unknown;
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
        ...formatBugItem(bug),
        history: history.map(h => ({
          id: h.id,
          actorId: h.actor_id,
          actorType: h.actor_type,
          actorUsername: h.actor_username,
          action: h.action,
          previousValue: h.previous_value,
          newValue: h.new_value,
          details: h.details,
          createdAt: h.created_at,
        })),
        relatedBugs: relatedBugs.map(r => ({
          id: r.id,
          title: r.title,
          status: r.status,
          createdAt: r.created_at,
        })),
        agentJobs: agentJobs.map(j => ({
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
   * PATCH /admin/bugs/:id
   * Update bug status, priority, resolution, etc.
   */
  app.patch<{ Params: { id: string } }>(
    '/admin/bugs/:id',
    { preHandler: [authenticate, requireAdmin] },
    async (request, reply) => {
      const { id } = request.params;
      const user = request.user as { userId: string };
      const updates = updateBugSchema.parse(request.body);

      // Get current bug
      const existing = await dbQueryOne<{ id: string; status: string; priority: string }>(`
        SELECT id, status, priority FROM user_feedback WHERE id = $1 AND type = 'bug_report'
      `, [id]);

      if (!existing) {
        return reply.status(404).send({
          error: { code: 'NOT_FOUND', message: 'Bug not found', statusCode: 404 },
        });
      }

      // Build update query
      const setClauses: string[] = ['updated_at = NOW()'];
      const params: unknown[] = [];
      let paramIndex = 1;

      // Track changes for history
      const changes: Array<{ action: string; previous: string | null; new: string | null; details?: unknown }> = [];

      if (updates.status !== undefined && updates.status !== existing.status) {
        setClauses.push(`status = $${paramIndex++}`);
        params.push(updates.status);
        changes.push({ action: 'status_changed', previous: existing.status, new: updates.status });

        // Set resolved_at and resolved_by if resolving
        if (['resolved', 'closed', 'wont_fix'].includes(updates.status) && !['resolved', 'closed', 'wont_fix'].includes(existing.status)) {
          setClauses.push('resolved_at = NOW()');
          setClauses.push(`resolved_by = $${paramIndex++}`);
          params.push(user.userId);
          changes.push({ action: 'resolved', previous: null, new: updates.status });
        }

        // Clear resolved_at if reopening
        if (!['resolved', 'closed', 'wont_fix'].includes(updates.status) && ['resolved', 'closed', 'wont_fix'].includes(existing.status)) {
          setClauses.push('resolved_at = NULL');
          setClauses.push('resolved_by = NULL');
          changes.push({ action: 'reopened', previous: existing.status, new: updates.status });
        }
      }

      if (updates.priority !== undefined && updates.priority !== existing.priority) {
        setClauses.push(`priority = $${paramIndex++}`);
        params.push(updates.priority);
        changes.push({ action: 'priority_changed', previous: existing.priority, new: updates.priority });
      }

      if (updates.assignedTo !== undefined) {
        setClauses.push(`assigned_to = $${paramIndex++}`);
        params.push(updates.assignedTo);
        changes.push({ action: 'assigned', previous: null, new: updates.assignedTo });
      }

      if (updates.resolutionType !== undefined) {
        setClauses.push(`resolution_type = $${paramIndex++}`);
        params.push(updates.resolutionType);
      }

      if (updates.resolutionNotes !== undefined) {
        setClauses.push(`resolution_notes = $${paramIndex++}`);
        params.push(updates.resolutionNotes);
      }

      if (updates.fixCommit !== undefined) {
        setClauses.push(`fix_commit = $${paramIndex++}`);
        params.push(updates.fixCommit);
      }

      if (updates.fixPrUrl !== undefined) {
        setClauses.push(`fix_pr_url = $${paramIndex++}`);
        params.push(updates.fixPrUrl);
      }

      if (updates.duplicateOf !== undefined) {
        setClauses.push(`duplicate_of = $${paramIndex++}`);
        params.push(updates.duplicateOf);
        changes.push({ action: 'marked_duplicate', previous: null, new: updates.duplicateOf });
      }

      if (updates.adminNotes !== undefined) {
        setClauses.push(`admin_notes = $${paramIndex++}`);
        params.push(updates.adminNotes);
      }

      params.push(id);

      await dbQuery(`
        UPDATE user_feedback SET ${setClauses.join(', ')} WHERE id = $${paramIndex}
      `, params);

      // Add history entries
      for (const change of changes) {
        await dbQuery(`
          INSERT INTO bug_history (feedback_id, actor_id, actor_type, action, previous_value, new_value, details)
          VALUES ($1, $2, 'admin', $3, $4, $5, $6)
        `, [id, user.userId, change.action, change.previous, change.new, change.details ? JSON.stringify(change.details) : null]);
      }

      log.info({ bugId: id, updates, adminId: user.userId }, 'Bug updated');

      return reply.send({ success: true });
    }
  );

  /**
   * POST /admin/bugs/bulk
   * Bulk update multiple bugs
   */
  app.post(
    '/admin/bugs/bulk',
    { preHandler: [authenticate, requireAdmin] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { ids, updates } = bulkUpdateSchema.parse(request.body);
      const user = request.user as { userId: string };

      let updated = 0;
      const errors: string[] = [];

      for (const id of ids) {
        try {
          const setClauses: string[] = ['updated_at = NOW()'];
          const params: unknown[] = [];
          let paramIndex = 1;

          if (updates.status !== undefined) {
            setClauses.push(`status = $${paramIndex++}`);
            params.push(updates.status);

            if (['resolved', 'closed', 'wont_fix'].includes(updates.status)) {
              setClauses.push('resolved_at = COALESCE(resolved_at, NOW())');
              setClauses.push(`resolved_by = COALESCE(resolved_by, $${paramIndex++})`);
              params.push(user.userId);
            }
          }

          if (updates.priority !== undefined) {
            setClauses.push(`priority = $${paramIndex++}`);
            params.push(updates.priority);
          }

          if (updates.assignedTo !== undefined) {
            setClauses.push(`assigned_to = $${paramIndex++}`);
            params.push(updates.assignedTo);
          }

          params.push(id);

          const result = await dbQuery(`
            UPDATE user_feedback SET ${setClauses.join(', ')}
            WHERE id = $${paramIndex} AND type = 'bug_report'
          `, params);

          if (result.rowCount && result.rowCount > 0) {
            updated++;

            // Add history
            await dbQuery(`
              INSERT INTO bug_history (feedback_id, actor_id, actor_type, action, details)
              VALUES ($1, $2, 'admin', 'status_changed', $3)
            `, [id, user.userId, JSON.stringify({ bulk: true, updates })]);
          }
        } catch (error) {
          errors.push(`Failed to update ${id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }

      log.info({ requested: ids.length, updated, errors: errors.length, adminId: user.userId }, 'Bulk bug update completed');

      return reply.send({ updated, errors });
    }
  );

  /**
   * GET /admin/bugs/timeline
   * Get bug activity timeline
   */
  app.get(
    '/admin/bugs/timeline',
    { preHandler: [authenticate, requireAdmin] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { limit = 50 } = request.query as { limit?: number };

      const timeline = await dbQueryAll<{
        id: string;
        feedback_id: string;
        bug_title: string;
        actor_type: string;
        actor_username: string | null;
        action: string;
        previous_value: string | null;
        new_value: string | null;
        details: unknown;
        created_at: Date;
      }>(`
        SELECT
          h.id,
          h.feedback_id,
          f.title as bug_title,
          h.actor_type,
          u.username as actor_username,
          h.action,
          h.previous_value,
          h.new_value,
          h.details,
          h.created_at
        FROM bug_history h
        JOIN user_feedback f ON h.feedback_id = f.id
        LEFT JOIN users u ON h.actor_id = u.id
        ORDER BY h.created_at DESC
        LIMIT $1
      `, [Math.min(limit, 200)]);

      return reply.send({
        items: timeline.map(t => ({
          id: t.id,
          feedbackId: t.feedback_id,
          bugTitle: t.bug_title,
          actorType: t.actor_type,
          actorUsername: t.actor_username,
          action: t.action,
          previousValue: t.previous_value,
          newValue: t.new_value,
          details: t.details,
          createdAt: t.created_at,
        })),
      });
    }
  );

  /**
   * POST /admin/bugs/auto-fix
   * Automatically confirm and queue high-confidence bugs for auto-fix
   * This is the key endpoint that enables the automation pipeline
   */
  app.post(
    '/admin/bugs/auto-fix',
    { preHandler: [authenticateBugHunterOrAdmin] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const schema = z.object({
        bugIds: z.array(z.string()).optional(), // If provided, only process these bugs
        autoConfirmThreshold: z.number().min(0).max(1).default(0.7), // Min confidence for auto-confirm
        priorityFilter: z.array(z.enum(['critical', 'high', 'medium', 'low'])).default(['critical', 'high']),
        maxBugs: z.number().min(1).max(50).default(10), // Max bugs to process per call
        dryRun: z.boolean().default(false), // If true, don't actually queue jobs
      });

      const params = schema.parse(request.body || {});
      const results = {
        confirmed: 0,
        queued: 0,
        skipped: 0,
        errors: [] as string[],
        bugIds: [] as string[],
      };

      try {
        // Find bugs that are eligible for auto-fix
        let sql = `
          SELECT
            f.id,
            f.title,
            f.description,
            f.priority,
            f.status,
            f.root_cause_hypothesis,
            f.suggested_fix,
            f.auto_fix_status
          FROM user_feedback f
          WHERE f.type = 'bug_report'
            AND f.status IN ('open', 'confirmed')
            AND (f.auto_fix_status IS NULL OR f.auto_fix_status NOT IN ('in_progress', 'completed'))
        `;
        const queryParams: unknown[] = [];
        let paramIndex = 1;

        // Filter by specific bug IDs if provided
        if (params.bugIds && params.bugIds.length > 0) {
          sql += ` AND f.id = ANY($${paramIndex++})`;
          queryParams.push(params.bugIds);
        }

        // Filter by priority
        if (params.priorityFilter.length > 0 && params.priorityFilter.length < 4) {
          sql += ` AND f.priority = ANY($${paramIndex++})`;
          queryParams.push(params.priorityFilter);
        }

        sql += ` ORDER BY
          CASE f.priority
            WHEN 'critical' THEN 1
            WHEN 'high' THEN 2
            WHEN 'medium' THEN 3
            WHEN 'low' THEN 4
          END ASC,
          f.created_at ASC
        LIMIT $${paramIndex}`;
        queryParams.push(params.maxBugs);

        const bugs = await dbQueryAll<{
          id: string;
          title: string;
          description: string;
          priority: string;
          status: string;
          root_cause_hypothesis: string | null;
          suggested_fix: unknown;
          auto_fix_status: string | null;
        }>(sql, queryParams);

        log.info({ bugCount: bugs.length, params }, 'Processing bugs for auto-fix');

        for (const bug of bugs) {
          try {
            // Skip if already being processed
            if (bug.auto_fix_status === 'in_progress') {
              results.skipped++;
              continue;
            }

            // Auto-confirm if not already confirmed
            if (bug.status === 'open') {
              if (!params.dryRun) {
                await dbQuery(`
                  UPDATE user_feedback SET
                    status = 'confirmed',
                    confirmed_at = NOW(),
                    updated_at = NOW()
                  WHERE id = $1
                `, [bug.id]);

                // Add history entry
                await dbQuery(`
                  INSERT INTO bug_history (feedback_id, actor_type, action, previous_value, new_value, details)
                  VALUES ($1, 'bug_hunter', 'auto_confirmed', 'open', 'confirmed', $2)
                `, [bug.id, JSON.stringify({ reason: 'Auto-confirmed for auto-fix processing' })]);
              }
              results.confirmed++;
            }

            // Queue for auto-fix
            if (!params.dryRun) {
              const jobData: BugFixJobData = {
                feedbackId: bug.id,
                title: bug.title,
                description: bug.description || '',
                stepsToReproduce: null,
                expectedBehavior: null,
                actualBehavior: bug.root_cause_hypothesis || bug.description,
              };

              await bugFixQueue.add(`fix-${bug.id}`, jobData, {
                jobId: `bug-fix-${bug.id}`,
                priority: bug.priority === 'critical' ? 1 : bug.priority === 'high' ? 2 : 3,
              });

              // Update status to pending
              await dbQuery(`
                UPDATE user_feedback SET
                  auto_fix_status = 'pending',
                  updated_at = NOW()
                WHERE id = $1
              `, [bug.id]);

              // Add history entry
              await dbQuery(`
                INSERT INTO bug_history (feedback_id, actor_type, action, details)
                VALUES ($1, 'bug_hunter', 'queued_for_auto_fix', $2)
              `, [bug.id, JSON.stringify({ priority: bug.priority })]);
            }

            results.queued++;
            results.bugIds.push(bug.id);

          } catch (error) {
            results.errors.push(`Failed to process bug ${bug.id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
          }
        }

        log.info(results, 'Auto-fix processing completed');

        return reply.send({
          success: true,
          dryRun: params.dryRun,
          ...results,
        });

      } catch (error) {
        log.error({ error }, 'Auto-fix processing failed');
        return reply.status(500).send({
          error: { code: 'AUTO_FIX_ERROR', message: error instanceof Error ? error.message : 'Unknown error', statusCode: 500 },
        });
      }
    }
  );

  /**
   * POST /admin/bugs/:id/auto-fix
   * Trigger auto-fix for a single bug
   */
  app.post<{ Params: { id: string } }>(
    '/admin/bugs/:id/auto-fix',
    { preHandler: [authenticateBugHunterOrAdmin] },
    async (request, reply) => {
      const { id } = request.params;

      const bug = await dbQueryOne<{
        id: string;
        title: string;
        description: string;
        status: string;
        priority: string;
        root_cause_hypothesis: string | null;
        auto_fix_status: string | null;
      }>(`
        SELECT id, title, description, status, priority, root_cause_hypothesis, auto_fix_status
        FROM user_feedback
        WHERE id = $1 AND type = 'bug_report'
      `, [id]);

      if (!bug) {
        return reply.status(404).send({
          error: { code: 'NOT_FOUND', message: 'Bug not found', statusCode: 404 },
        });
      }

      if (bug.auto_fix_status === 'in_progress') {
        return reply.status(400).send({
          error: { code: 'ALREADY_IN_PROGRESS', message: 'Bug is already being processed', statusCode: 400 },
        });
      }

      // Update status
      await dbQuery(`
        UPDATE user_feedback SET
          status = 'confirmed',
          confirmed_at = COALESCE(confirmed_at, NOW()),
          auto_fix_status = 'pending',
          updated_at = NOW()
        WHERE id = $1
      `, [id]);

      // Queue for auto-fix
      const jobData: BugFixJobData = {
        feedbackId: bug.id,
        title: bug.title,
        description: bug.description || '',
        stepsToReproduce: null,
        expectedBehavior: null,
        actualBehavior: bug.root_cause_hypothesis || bug.description,
      };

      await bugFixQueue.add(`fix-${bug.id}`, jobData, {
        jobId: `bug-fix-${bug.id}`,
        priority: bug.priority === 'critical' ? 1 : bug.priority === 'high' ? 2 : 3,
      });

      // Add history entry
      await dbQuery(`
        INSERT INTO bug_history (feedback_id, actor_type, action, details)
        VALUES ($1, 'admin', 'queued_for_auto_fix', $2)
      `, [id, JSON.stringify({ triggeredManually: true })]);

      log.info({ bugId: id }, 'Bug queued for auto-fix');

      return reply.send({ success: true, bugId: id, status: 'queued' });
    }
  );

  /**
   * GET /admin/bugs/queue-status
   * Get the current status of the auto-fix queue
   */
  app.get(
    '/admin/bugs/queue-status',
    { preHandler: [authenticateBugHunterOrAdmin] },
    async (_request: FastifyRequest, reply: FastifyReply) => {
      try {
        const [waiting, active, completed, failed] = await Promise.all([
          bugFixQueue.getWaitingCount(),
          bugFixQueue.getActiveCount(),
          bugFixQueue.getCompletedCount(),
          bugFixQueue.getFailedCount(),
        ]);

        // Get recent jobs
        const [waitingJobs, activeJobs, completedJobs, failedJobs] = await Promise.all([
          bugFixQueue.getWaiting(0, 10),
          bugFixQueue.getActive(0, 10),
          bugFixQueue.getCompleted(0, 10),
          bugFixQueue.getFailed(0, 10),
        ]);

        return reply.send({
          counts: { waiting, active, completed, failed },
          jobs: {
            waiting: waitingJobs.map(j => ({ id: j.id, feedbackId: j.data.feedbackId, title: j.data.title })),
            active: activeJobs.map(j => ({ id: j.id, feedbackId: j.data.feedbackId, title: j.data.title })),
            completed: completedJobs.map(j => ({ id: j.id, feedbackId: j.data.feedbackId, title: j.data.title, result: j.returnvalue })),
            failed: failedJobs.map(j => ({ id: j.id, feedbackId: j.data.feedbackId, title: j.data.title, error: j.failedReason })),
          },
        });
      } catch (error) {
        log.error({ error }, 'Failed to get queue status');
        return reply.status(500).send({
          error: { code: 'QUEUE_ERROR', message: error instanceof Error ? error.message : 'Unknown error', statusCode: 500 },
        });
      }
    }
  );
}

/**
 * Format a bug row for API response
 */
function formatBugItem(row: BugRow) {
  return {
    id: row.id,
    type: row.type,
    status: row.status,
    priority: row.priority,
    title: row.title,
    description: row.description,
    source: row.source || 'user',
    pageUrl: row.page_url,
    errorCategory: row.error_category,
    rootCause: row.root_cause_type ? {
      type: row.root_cause_type,
      file: row.root_cause_file,
      hypothesis: row.root_cause_hypothesis,
    } : null,
    suggestedFix: row.suggested_fix,
    consoleErrors: row.console_errors,
    networkErrors: row.network_errors,
    bugHunterId: row.bug_hunter_id,
    duplicateOf: row.duplicate_of,
    resolution: row.resolved_at ? {
      resolvedAt: row.resolved_at,
      resolvedBy: row.resolver_username,
      type: row.resolution_type,
      notes: row.resolution_notes,
      commit: row.fix_commit,
      prUrl: row.fix_pr_url,
      filesChanged: row.files_changed,
      verifiedAt: row.verified_fixed_at,
    } : null,
    assignedTo: row.assignee_username,
    adminNotes: row.admin_notes,
    autoFixStatus: row.auto_fix_status,
    reporter: row.user_id ? {
      username: row.reporter_username,
    } : null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    confirmedAt: row.confirmed_at,
  };
}
