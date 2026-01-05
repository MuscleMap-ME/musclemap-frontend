/**
 * Issues Routes
 *
 * Bug and issue tracking API:
 * - Create and manage issues
 * - Comments and discussions
 * - Voting system
 * - Subscriptions
 * - Dev updates and roadmap
 * - Admin management
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { authenticate, optionalAuth } from './auth';
import {
  issuesService,
  IssueType,
  IssueStatus,
  IssuePriority,
  UpdateType,
  RoadmapStatus,
} from '../../services/issues.service';
import { loggers } from '../../lib/logger';

const log = loggers.core;

// Schemas
const createIssueSchema = z.object({
  title: z.string().min(5).max(200),
  description: z.string().min(20).max(10000),
  type: z.number().int().min(0).max(5),
  priority: z.number().int().min(0).max(3).optional(),
  labelIds: z.array(z.string()).max(5).optional(),
  browserInfo: z.record(z.any()).optional(),
  deviceInfo: z.record(z.any()).optional(),
  pageUrl: z.string().url().max(500).optional(),
  screenshotUrls: z.array(z.string().url()).max(5).optional(),
});

const updateIssueSchema = z.object({
  title: z.string().min(5).max(200).optional(),
  description: z.string().min(20).max(10000).optional(),
  type: z.number().int().min(0).max(5).optional(),
  status: z.number().int().min(0).max(6).optional(),
  priority: z.number().int().min(0).max(3).optional(),
  assigneeId: z.string().nullable().optional(),
  labelIds: z.array(z.string()).max(10).optional(),
  isPinned: z.boolean().optional(),
  isLocked: z.boolean().optional(),
  isPublic: z.boolean().optional(),
  resolutionNote: z.string().max(2000).optional(),
  duplicateOfId: z.string().optional(),
  relatedIssueIds: z.array(z.string()).max(10).optional(),
});

const listIssuesSchema = z.object({
  status: z.coerce.number().int().optional(),
  type: z.coerce.number().int().optional(),
  authorId: z.string().optional(),
  assigneeId: z.string().optional(),
  labelSlug: z.string().optional(),
  search: z.string().max(200).optional(),
  sortBy: z.enum(['newest', 'oldest', 'votes', 'comments', 'updated']).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
  offset: z.coerce.number().int().min(0).optional().default(0),
});

const createCommentSchema = z.object({
  content: z.string().min(1).max(10000),
  parentId: z.string().optional(),
});

const createDevUpdateSchema = z.object({
  title: z.string().min(5).max(200),
  content: z.string().min(20).max(50000),
  type: z.number().int().min(0).max(4),
  relatedIssueIds: z.array(z.string()).max(20).optional(),
  isPublished: z.boolean().optional(),
});

const createRoadmapItemSchema = z.object({
  title: z.string().min(5).max(200),
  description: z.string().max(5000).optional(),
  status: z.number().int().min(0).max(4).optional(),
  quarter: z.string().max(10).optional(),
  category: z.string().max(50).optional(),
  progress: z.number().int().min(0).max(100).optional(),
  relatedIssueIds: z.array(z.string()).max(20).optional(),
  displayOrder: z.number().int().min(0).optional(),
  isPublic: z.boolean().optional(),
});

const paginationSchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
  offset: z.coerce.number().int().min(0).optional().default(0),
});

// Helper to check admin role
function isAdmin(request: FastifyRequest): boolean {
  const roles = request.user?.roles || [];
  return roles.includes('admin') || request.user?.role === 'admin';
}

function isModerator(request: FastifyRequest): boolean {
  const roles = request.user?.roles || [];
  return roles.includes('moderator') || roles.includes('admin') ||
         request.user?.role === 'moderator' || request.user?.role === 'admin';
}

export async function registerIssuesRoutes(app: FastifyInstance) {
  // ============================================
  // LABELS
  // ============================================

  /**
   * Get all issue labels
   */
  app.get('/issues/labels', async (request, reply) => {
    const labels = await issuesService.getLabels();
    return reply.send({ data: labels });
  });

  // ============================================
  // ISSUES
  // ============================================

  /**
   * List issues
   */
  app.get('/issues', {
    preHandler: optionalAuth,
  }, async (request: FastifyRequest<{ Querystring: z.infer<typeof listIssuesSchema> }>, reply: FastifyReply) => {
    const query = listIssuesSchema.parse(request.query);

    const result = await issuesService.listIssues({
      ...query,
      userId: request.user?.userId,
    });

    return reply.send({
      data: result.issues,
      pagination: {
        total: result.total,
        limit: query.limit,
        offset: query.offset,
        hasMore: query.offset + result.issues.length < result.total,
      },
    });
  });

  /**
   * Get issue by ID or number
   */
  app.get('/issues/:id', {
    preHandler: optionalAuth,
  }, async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const issue = await issuesService.getIssueById(request.params.id, request.user?.userId);

    if (!issue) {
      return reply.status(404).send({
        error: { code: 'NOT_FOUND', message: 'Issue not found', statusCode: 404 },
      });
    }

    // Check access for private issues
    if (!issue.isPublic && !isAdmin(request) && issue.authorId !== request.user?.userId) {
      return reply.status(404).send({
        error: { code: 'NOT_FOUND', message: 'Issue not found', statusCode: 404 },
      });
    }

    // Increment view count (fire and forget)
    issuesService.incrementViewCount(issue.id).catch(() => {});

    return reply.send({ data: issue });
  });

  /**
   * Create a new issue
   */
  app.post('/issues', {
    preHandler: authenticate,
  }, async (request: FastifyRequest<{ Body: z.infer<typeof createIssueSchema> }>, reply: FastifyReply) => {
    try {
      const body = createIssueSchema.parse(request.body);
      const issue = await issuesService.createIssue(request.user!.userId, body);

      log.info({ issueId: issue.id, userId: request.user!.userId }, 'Issue created');

      return reply.status(201).send({ data: issue });
    } catch (error: any) {
      if (error.name === 'ValidationError') {
        return reply.status(400).send({
          error: { code: 'VALIDATION', message: error.message, statusCode: 400 },
        });
      }
      throw error;
    }
  });

  /**
   * Update an issue
   */
  app.patch('/issues/:id', {
    preHandler: authenticate,
  }, async (request: FastifyRequest<{
    Params: { id: string };
    Body: z.infer<typeof updateIssueSchema>;
  }>, reply: FastifyReply) => {
    try {
      const body = updateIssueSchema.parse(request.body);
      const issue = await issuesService.updateIssue(
        request.params.id,
        request.user!.userId,
        body,
        isAdmin(request)
      );

      return reply.send({ data: issue });
    } catch (error: any) {
      if (error.name === 'ValidationError') {
        return reply.status(400).send({
          error: { code: 'VALIDATION', message: error.message, statusCode: 400 },
        });
      }
      if (error.name === 'NotFoundError') {
        return reply.status(404).send({
          error: { code: 'NOT_FOUND', message: error.message, statusCode: 404 },
        });
      }
      if (error.name === 'ForbiddenError') {
        return reply.status(403).send({
          error: { code: 'FORBIDDEN', message: error.message, statusCode: 403 },
        });
      }
      throw error;
    }
  });

  // ============================================
  // VOTING
  // ============================================

  /**
   * Vote/unvote an issue
   */
  app.post('/issues/:id/vote', {
    preHandler: authenticate,
  }, async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    try {
      const result = await issuesService.vote(request.params.id, request.user!.userId);
      return reply.send({ data: result });
    } catch (error: any) {
      if (error.name === 'NotFoundError') {
        return reply.status(404).send({
          error: { code: 'NOT_FOUND', message: error.message, statusCode: 404 },
        });
      }
      throw error;
    }
  });

  // ============================================
  // SUBSCRIPTIONS
  // ============================================

  /**
   * Subscribe/unsubscribe to an issue
   */
  app.post('/issues/:id/subscribe', {
    preHandler: authenticate,
  }, async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    try {
      const result = await issuesService.subscribe(request.params.id, request.user!.userId);
      return reply.send({ data: result });
    } catch (error: any) {
      if (error.name === 'NotFoundError') {
        return reply.status(404).send({
          error: { code: 'NOT_FOUND', message: error.message, statusCode: 404 },
        });
      }
      throw error;
    }
  });

  // ============================================
  // COMMENTS
  // ============================================

  /**
   * Get comments for an issue
   */
  app.get('/issues/:id/comments', async (request: FastifyRequest<{
    Params: { id: string };
    Querystring: z.infer<typeof paginationSchema>;
  }>, reply: FastifyReply) => {
    const query = paginationSchema.parse(request.query);
    const result = await issuesService.getComments(request.params.id, query);

    return reply.send({
      data: result.comments,
      pagination: {
        total: result.total,
        limit: query.limit,
        offset: query.offset,
        hasMore: query.offset + result.comments.length < result.total,
      },
    });
  });

  /**
   * Add a comment to an issue
   */
  app.post('/issues/:id/comments', {
    preHandler: authenticate,
  }, async (request: FastifyRequest<{
    Params: { id: string };
    Body: z.infer<typeof createCommentSchema>;
  }>, reply: FastifyReply) => {
    try {
      const body = createCommentSchema.parse(request.body);
      const comment = await issuesService.createComment(
        request.params.id,
        request.user!.userId,
        body.content,
        body.parentId,
        isModerator(request)
      );

      return reply.status(201).send({ data: comment });
    } catch (error: any) {
      if (error.name === 'ValidationError') {
        return reply.status(400).send({
          error: { code: 'VALIDATION', message: error.message, statusCode: 400 },
        });
      }
      if (error.name === 'NotFoundError') {
        return reply.status(404).send({
          error: { code: 'NOT_FOUND', message: error.message, statusCode: 404 },
        });
      }
      if (error.name === 'ForbiddenError') {
        return reply.status(403).send({
          error: { code: 'FORBIDDEN', message: error.message, statusCode: 403 },
        });
      }
      throw error;
    }
  });

  /**
   * Mark a comment as solution (admin/moderator only)
   */
  app.post('/issues/:issueId/comments/:commentId/solution', {
    preHandler: authenticate,
  }, async (request: FastifyRequest<{
    Params: { issueId: string; commentId: string };
  }>, reply: FastifyReply) => {
    if (!isModerator(request)) {
      return reply.status(403).send({
        error: { code: 'FORBIDDEN', message: 'Only moderators can mark solutions', statusCode: 403 },
      });
    }

    await issuesService.markCommentAsSolution(
      request.params.commentId,
      request.params.issueId,
      request.user!.userId
    );

    return reply.send({ data: { success: true } });
  });

  // ============================================
  // DEV UPDATES
  // ============================================

  /**
   * List dev updates
   */
  app.get('/updates', async (request: FastifyRequest<{
    Querystring: { type?: string } & z.infer<typeof paginationSchema>;
  }>, reply: FastifyReply) => {
    const query = paginationSchema.parse(request.query);
    const type = request.query.type !== undefined ? parseInt(request.query.type, 10) : undefined;

    const result = await issuesService.listDevUpdates({
      type: type as UpdateType | undefined,
      limit: query.limit,
      offset: query.offset,
    });

    return reply.send({
      data: result.updates,
      pagination: {
        total: result.total,
        limit: query.limit,
        offset: query.offset,
        hasMore: query.offset + result.updates.length < result.total,
      },
    });
  });

  /**
   * Create a dev update (admin only)
   */
  app.post('/updates', {
    preHandler: authenticate,
  }, async (request: FastifyRequest<{ Body: z.infer<typeof createDevUpdateSchema> }>, reply: FastifyReply) => {
    if (!isAdmin(request)) {
      return reply.status(403).send({
        error: { code: 'FORBIDDEN', message: 'Only admins can create updates', statusCode: 403 },
      });
    }

    const body = createDevUpdateSchema.parse(request.body);
    const update = await issuesService.createDevUpdate(request.user!.userId, body);

    return reply.status(201).send({ data: update });
  });

  // ============================================
  // ROADMAP
  // ============================================

  /**
   * List roadmap items
   */
  app.get('/roadmap', {
    preHandler: optionalAuth,
  }, async (request: FastifyRequest<{
    Querystring: { status?: string; quarter?: string };
  }>, reply: FastifyReply) => {
    const status = request.query.status !== undefined
      ? parseInt(request.query.status, 10)
      : undefined;

    const items = await issuesService.listRoadmapItems({
      status: status as RoadmapStatus | undefined,
      quarter: request.query.quarter,
      userId: request.user?.userId,
    });

    return reply.send({ data: items });
  });

  /**
   * Create a roadmap item (admin only)
   */
  app.post('/roadmap', {
    preHandler: authenticate,
  }, async (request: FastifyRequest<{ Body: z.infer<typeof createRoadmapItemSchema> }>, reply: FastifyReply) => {
    if (!isAdmin(request)) {
      return reply.status(403).send({
        error: { code: 'FORBIDDEN', message: 'Only admins can create roadmap items', statusCode: 403 },
      });
    }

    const body = createRoadmapItemSchema.parse(request.body);

    // Create roadmap item directly
    const { queryOne } = await import('../../db/client');
    const crypto = await import('crypto');
    const itemId = `rm_${crypto.randomBytes(12).toString('hex')}`;

    const row = await queryOne<{ id: string; created_at: Date; updated_at: Date }>(
      `INSERT INTO roadmap_items (id, title, description, status, quarter, category, progress, related_issue_ids, display_order, is_public)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING id, created_at, updated_at`,
      [
        itemId,
        body.title,
        body.description,
        body.status || 0,
        body.quarter,
        body.category,
        body.progress || 0,
        body.relatedIssueIds || [],
        body.displayOrder || 0,
        body.isPublic !== false,
      ]
    );

    return reply.status(201).send({
      data: {
        id: row!.id,
        ...body,
        voteCount: 0,
        createdAt: row!.created_at,
        updatedAt: row!.updated_at,
      },
    });
  });

  /**
   * Vote on a roadmap item
   */
  app.post('/roadmap/:id/vote', {
    preHandler: authenticate,
  }, async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    try {
      const result = await issuesService.voteRoadmapItem(request.params.id, request.user!.userId);
      return reply.send({ data: result });
    } catch (error: any) {
      if (error.name === 'NotFoundError') {
        return reply.status(404).send({
          error: { code: 'NOT_FOUND', message: error.message, statusCode: 404 },
        });
      }
      throw error;
    }
  });

  // ============================================
  // STATISTICS
  // ============================================

  /**
   * Get issue statistics
   */
  app.get('/issues/stats', async (request, reply) => {
    const stats = await issuesService.getStats();
    return reply.send({ data: stats });
  });

  // ============================================
  // USER'S ISSUES
  // ============================================

  /**
   * Get current user's submitted issues
   */
  app.get('/me/issues', {
    preHandler: authenticate,
  }, async (request: FastifyRequest<{ Querystring: z.infer<typeof listIssuesSchema> }>, reply: FastifyReply) => {
    const query = listIssuesSchema.parse(request.query);

    const result = await issuesService.listIssues({
      ...query,
      authorId: request.user!.userId,
      userId: request.user!.userId,
    });

    return reply.send({
      data: result.issues,
      pagination: {
        total: result.total,
        limit: query.limit,
        offset: query.offset,
        hasMore: query.offset + result.issues.length < result.total,
      },
    });
  });

  // ============================================
  // ADMIN ROUTES
  // ============================================

  /**
   * Admin: Get all issues including private ones
   */
  app.get('/admin/issues', {
    preHandler: authenticate,
  }, async (request: FastifyRequest<{ Querystring: z.infer<typeof listIssuesSchema> }>, reply: FastifyReply) => {
    if (!isAdmin(request)) {
      return reply.status(403).send({
        error: { code: 'FORBIDDEN', message: 'Admin access required', statusCode: 403 },
      });
    }

    const query = listIssuesSchema.parse(request.query);
    const { queryAll, queryOne } = await import('../../db/client');

    // Build query with all issues (including private)
    const conditions: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    if (query.status !== undefined) {
      conditions.push(`status = $${paramIndex++}`);
      params.push(query.status);
    }

    if (query.type !== undefined) {
      conditions.push(`type = $${paramIndex++}`);
      params.push(query.type);
    }

    if (query.assigneeId) {
      conditions.push(`assignee_id = $${paramIndex++}`);
      params.push(query.assigneeId);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const countResult = await queryOne<{ count: string }>(
      `SELECT COUNT(*) as count FROM issues ${whereClause}`,
      params
    );
    const total = parseInt(countResult?.count || '0', 10);

    const rows = await queryAll<any>(
      `SELECT i.*, u.username as author_username, u.display_name as author_display_name
       FROM issues i
       LEFT JOIN users u ON u.id = i.author_id
       ${whereClause}
       ORDER BY i.created_at DESC
       LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      [...params, query.limit, query.offset]
    );

    return reply.send({
      data: rows,
      pagination: {
        total,
        limit: query.limit,
        offset: query.offset,
        hasMore: query.offset + rows.length < total,
      },
    });
  });

  /**
   * Admin: Bulk update issues
   */
  app.post('/admin/issues/bulk', {
    preHandler: authenticate,
  }, async (request: FastifyRequest<{
    Body: {
      issueIds: string[];
      update: { status?: number; priority?: number; assigneeId?: string; labelIds?: string[] };
    };
  }>, reply: FastifyReply) => {
    if (!isAdmin(request)) {
      return reply.status(403).send({
        error: { code: 'FORBIDDEN', message: 'Admin access required', statusCode: 403 },
      });
    }

    const { issueIds, update } = request.body;

    if (!issueIds || issueIds.length === 0) {
      return reply.status(400).send({
        error: { code: 'VALIDATION', message: 'No issues specified', statusCode: 400 },
      });
    }

    let updatedCount = 0;
    for (const issueId of issueIds) {
      try {
        await issuesService.updateIssue(issueId, request.user!.userId, update, true);
        updatedCount++;
      } catch {
        // Skip failed updates
      }
    }

    return reply.send({ data: { updatedCount } });
  });
}
