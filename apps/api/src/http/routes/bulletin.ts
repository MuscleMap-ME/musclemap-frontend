/**
 * Bulletin Board Routes (Fastify)
 *
 * Shared bulletin board routes for posts, comments, and voting
 */

import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { authenticate, optionalAuth } from './auth';
import { bulletinService } from '../../modules/community/bulletin.service';
import { loggers } from '../../lib/logger';

const _log = loggers.core;

// Schemas
const voteSchema = z.object({
  voteType: z.enum(['up', 'down']),
});

const addCommentSchema = z.object({
  content: z.string().min(1).max(10000),
  parentId: z.string().optional(),
});

export async function registerBulletinRoutes(app: FastifyInstance) {
  /**
   * GET /bulletin/posts/:postId
   * Get a single post by ID
   */
  app.get('/bulletin/posts/:postId', { preHandler: optionalAuth }, async (request, reply) => {
    const { postId } = request.params as { postId: string };
    const userId = request.user?.userId;

    const post = await bulletinService.getPostById(postId, userId);

    if (!post) {
      return reply.status(404).send({
        error: { code: 'NOT_FOUND', message: 'Post not found', statusCode: 404 },
      });
    }

    return reply.send({
      data: post,
    });
  });

  /**
   * POST /bulletin/posts/:postId/vote
   * Vote on a post (upvote or downvote)
   */
  app.post('/bulletin/posts/:postId/vote', { preHandler: authenticate }, async (request, reply) => {
    const { postId } = request.params as { postId: string };
    const userId = request.user!.userId;
    const body = voteSchema.parse(request.body);

    const result = await bulletinService.votePost(postId, userId, body.voteType);

    return reply.send({
      data: result,
    });
  });

  /**
   * GET /bulletin/posts/:postId/comments
   * Get comments for a post
   */
  app.get('/bulletin/posts/:postId/comments', { preHandler: optionalAuth }, async (request, reply) => {
    const { postId } = request.params as { postId: string };
    const userId = request.user?.userId;
    const query = request.query as { limit?: string; offset?: string };

    const { comments, total } = await bulletinService.getComments(postId, userId, {
      limit: query.limit ? parseInt(query.limit) : 50,
      offset: query.offset ? parseInt(query.offset) : 0,
    });

    return reply.send({
      data: comments,
      meta: { total },
    });
  });

  /**
   * POST /bulletin/posts/:postId/comments
   * Add a comment to a post
   */
  app.post('/bulletin/posts/:postId/comments', { preHandler: authenticate }, async (request, reply) => {
    const { postId } = request.params as { postId: string };
    const userId = request.user!.userId;
    const body = addCommentSchema.parse(request.body);

    const comment = await bulletinService.addComment(postId, userId, body.content, body.parentId);

    return reply.status(201).send({
      data: comment,
    });
  });

  /**
   * POST /bulletin/comments/:commentId/vote
   * Vote on a comment
   */
  app.post('/bulletin/comments/:commentId/vote', { preHandler: authenticate }, async (request, reply) => {
    const { commentId } = request.params as { commentId: string };
    const userId = request.user!.userId;
    const body = voteSchema.parse(request.body);

    const result = await bulletinService.voteComment(commentId, userId, body.voteType);

    return reply.send({
      data: result,
    });
  });

  /**
   * POST /bulletin/posts/:postId/pin
   * Pin a post (moderator action)
   */
  app.post('/bulletin/posts/:postId/pin', { preHandler: authenticate }, async (request, reply) => {
    const { postId } = request.params as { postId: string };
    const userId = request.user!.userId;

    await bulletinService.togglePinPost(postId, userId, true);

    return reply.send({
      data: { message: 'Post pinned' },
    });
  });

  /**
   * POST /bulletin/posts/:postId/unpin
   * Unpin a post (moderator action)
   */
  app.post('/bulletin/posts/:postId/unpin', { preHandler: authenticate }, async (request, reply) => {
    const { postId } = request.params as { postId: string };
    const userId = request.user!.userId;

    await bulletinService.togglePinPost(postId, userId, false);

    return reply.send({
      data: { message: 'Post unpinned' },
    });
  });

  /**
   * POST /bulletin/posts/:postId/hide
   * Hide a post (moderator action)
   */
  app.post('/bulletin/posts/:postId/hide', { preHandler: authenticate }, async (request, reply) => {
    const { postId } = request.params as { postId: string };
    const userId = request.user!.userId;

    await bulletinService.toggleHidePost(postId, userId, true);

    return reply.send({
      data: { message: 'Post hidden' },
    });
  });

  /**
   * POST /bulletin/posts/:postId/unhide
   * Unhide a post (moderator action)
   */
  app.post('/bulletin/posts/:postId/unhide', { preHandler: authenticate }, async (request, reply) => {
    const { postId } = request.params as { postId: string };
    const userId = request.user!.userId;

    await bulletinService.toggleHidePost(postId, userId, false);

    return reply.send({
      data: { message: 'Post unhidden' },
    });
  });
}
