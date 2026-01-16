/**
 * Bulletin Board Service
 *
 * Manages community discussion boards with:
 * - Posts with upvote/downvote voting
 * - Comments and replies
 * - Pin and highlight by moderators
 * - Content moderation
 */

import crypto from 'crypto';
import { queryOne, queryAll, query } from '../../db/client';
import { ValidationError, NotFoundError, ForbiddenError } from '../../lib/errors';
import { loggers } from '../../lib/logger';
import { CommunityRole } from './communities.service';

const log = loggers.core;

// Post types
export type PostType = 'discussion' | 'question' | 'announcement' | 'poll' | 'workout_share' | 'milestone';

// Vote types
export type VoteType = 'up' | 'down';

// Interfaces
export interface BulletinPost {
  id: string;
  boardId: number;
  authorId?: string;
  authorUsername?: string;
  authorDisplayName?: string;
  authorAvatarUrl?: string;
  title: string;
  content: string;
  contentLang: string;
  postType: PostType;
  mediaUrls: string[];
  linkedWorkoutId?: string;
  linkedMilestoneId?: string;
  upvotes: number;
  downvotes: number;
  score: number;
  commentCount: number;
  viewCount: number;
  isPinned: boolean;
  isHighlighted: boolean;
  isHidden: boolean;
  createdAt: Date;
  updatedAt: Date;
  // User-specific fields
  userVote?: VoteType;
}

export interface BulletinComment {
  id: string;
  postId: string;
  parentId?: string;
  authorId?: string;
  authorUsername?: string;
  authorDisplayName?: string;
  authorAvatarUrl?: string;
  content: string;
  upvotes: number;
  downvotes: number;
  score: number;
  replyCount: number;
  isHidden: boolean;
  createdAt: Date;
  updatedAt: Date;
  // User-specific fields
  userVote?: VoteType;
  replies?: BulletinComment[];
}

export interface CreatePostRequest {
  boardId: number;
  authorId: string;
  title: string;
  content: string;
  postType?: PostType;
  contentLang?: string;
  mediaUrls?: string[];
  linkedWorkoutId?: string;
  linkedMilestoneId?: string;
}

// Service implementation
export const bulletinService = {
  /**
   * Create a new post
   */
  async createPost(request: CreatePostRequest): Promise<BulletinPost> {
    const {
      boardId,
      authorId,
      title,
      content,
      postType = 'discussion',
      contentLang = 'en',
      mediaUrls = [],
      linkedWorkoutId,
      linkedMilestoneId,
    } = request;

    // Validate
    if (!title || title.length < 3 || title.length > 300) {
      throw new ValidationError('Title must be between 3 and 300 characters');
    }

    if (!content || content.length < 1 || content.length > 50000) {
      throw new ValidationError('Content must be between 1 and 50,000 characters');
    }

    // Verify board exists and get context
    const board = await queryOne<{
      id: number;
      community_id: number | null;
      virtual_hangout_id: number | null;
    }>(
      'SELECT id, community_id, virtual_hangout_id FROM bulletin_boards WHERE id = $1 AND is_active = TRUE',
      [boardId]
    );

    if (!board) {
      throw new NotFoundError('Bulletin board not found');
    }

    // Verify author is a member of the community/hangout
    if (board.community_id) {
      const membership = await queryOne<{ status: string }>(
        'SELECT status FROM community_memberships WHERE community_id = $1 AND user_id = $2',
        [board.community_id, authorId]
      );
      if (!membership || membership.status !== 'active') {
        throw new ForbiddenError('Must be an active community member to post');
      }
    } else if (board.virtual_hangout_id) {
      const membership = await queryOne<{ user_id: string }>(
        'SELECT user_id FROM virtual_hangout_memberships WHERE hangout_id = $1 AND user_id = $2',
        [board.virtual_hangout_id, authorId]
      );
      if (!membership) {
        throw new ForbiddenError('Must be a hangout member to post');
      }
    }

    const postId = `bp_${crypto.randomBytes(12).toString('hex')}`;

    const row = await queryOne<{
      created_at: Date;
      updated_at: Date;
    }>(
      `INSERT INTO bulletin_posts (
        id, board_id, author_id, title, content, content_lang, post_type,
        media_urls, linked_workout_id, linked_milestone_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING created_at, updated_at`,
      [
        postId, boardId, authorId, title, content, contentLang, postType,
        JSON.stringify(mediaUrls), linkedWorkoutId, linkedMilestoneId
      ]
    );

    // Get author info
    const author = await queryOne<{
      username: string;
      display_name: string | null;
      avatar_url: string | null;
    }>('SELECT username, display_name, avatar_url FROM users WHERE id = $1', [authorId]);

    log.info({ postId, boardId, authorId }, 'Bulletin post created');

    return {
      id: postId,
      boardId,
      authorId,
      authorUsername: author?.username,
      authorDisplayName: author?.display_name ?? undefined,
      authorAvatarUrl: author?.avatar_url ?? undefined,
      title,
      content,
      contentLang,
      postType,
      mediaUrls,
      linkedWorkoutId,
      linkedMilestoneId,
      upvotes: 0,
      downvotes: 0,
      score: 0,
      commentCount: 0,
      viewCount: 0,
      isPinned: false,
      isHighlighted: false,
      isHidden: false,
      createdAt: row!.created_at,
      updatedAt: row!.updated_at,
    };
  },

  /**
   * Get posts from a bulletin board
   */
  async getPosts(
    boardId: number,
    userId?: string,
    options: {
      limit?: number;
      offset?: number;
      sortBy?: 'hot' | 'new' | 'top';
      postType?: PostType;
    } = {}
  ): Promise<{ posts: BulletinPost[]; total: number }> {
    const { limit = 20, offset = 0, sortBy = 'hot', postType } = options;

    const conditions: string[] = ['bp.board_id = $1', 'bp.is_hidden = FALSE'];
    const params: any[] = [boardId];
    let paramIndex = 2;

    if (postType) {
      conditions.push(`bp.post_type = $${paramIndex++}`);
      params.push(postType);
    }

    const whereClause = conditions.join(' AND ');

    // User vote join
    const userJoin = userId
      ? `LEFT JOIN bulletin_votes bv ON bv.post_id = bp.id AND bv.user_id = '${userId}'`
      : '';
    const userSelect = userId ? ', bv.vote_type as user_vote' : ', NULL as user_vote';

    // Sort order
    let orderBy: string;
    switch (sortBy) {
      case 'new':
        orderBy = 'bp.created_at DESC';
        break;
      case 'top':
        orderBy = 'bp.score DESC, bp.created_at DESC';
        break;
      case 'hot':
      default:
        // Hot = score weighted by recency
        orderBy = `(bp.score + 1) / POWER(EXTRACT(EPOCH FROM (NOW() - bp.created_at)) / 3600 + 2, 1.8) DESC`;
        break;
    }

    const rows = await queryAll<{
      id: string;
      board_id: number;
      author_id: string | null;
      username: string | null;
      display_name: string | null;
      avatar_url: string | null;
      title: string;
      content: string;
      content_lang: string;
      post_type: string;
      media_urls: string[] | null;
      linked_workout_id: string | null;
      linked_milestone_id: string | null;
      upvotes: number;
      downvotes: number;
      score: number;
      comment_count: number;
      view_count: number;
      is_pinned: boolean;
      is_highlighted: boolean;
      is_hidden: boolean;
      created_at: Date;
      updated_at: Date;
      user_vote: string | null;
    }>(
      `SELECT
        bp.id, bp.board_id, bp.author_id, u.username, u.display_name, u.avatar_url,
        bp.title, bp.content, bp.content_lang, bp.post_type, bp.media_urls,
        bp.linked_workout_id, bp.linked_milestone_id,
        bp.upvotes, bp.downvotes, bp.score, bp.comment_count, bp.view_count,
        bp.is_pinned, bp.is_highlighted, bp.is_hidden, bp.created_at, bp.updated_at
        ${userSelect}
       FROM bulletin_posts bp
       LEFT JOIN users u ON u.id = bp.author_id
       ${userJoin}
       WHERE ${whereClause}
       ORDER BY bp.is_pinned DESC, ${orderBy}
       LIMIT $${paramIndex++} OFFSET $${paramIndex++}`,
      [...params, limit, offset]
    );

    const countResult = await queryOne<{ count: string }>(
      `SELECT COUNT(*) as count FROM bulletin_posts bp WHERE ${whereClause}`,
      params
    );

    return {
      posts: rows.map(r => ({
        id: r.id,
        boardId: r.board_id,
        authorId: r.author_id ?? undefined,
        authorUsername: r.username ?? undefined,
        authorDisplayName: r.display_name ?? undefined,
        authorAvatarUrl: r.avatar_url ?? undefined,
        title: r.title,
        content: r.content,
        contentLang: r.content_lang,
        postType: r.post_type as PostType,
        mediaUrls: r.media_urls || [],
        linkedWorkoutId: r.linked_workout_id ?? undefined,
        linkedMilestoneId: r.linked_milestone_id ?? undefined,
        upvotes: r.upvotes,
        downvotes: r.downvotes,
        score: r.score,
        commentCount: r.comment_count,
        viewCount: r.view_count,
        isPinned: r.is_pinned,
        isHighlighted: r.is_highlighted,
        isHidden: r.is_hidden,
        createdAt: r.created_at,
        updatedAt: r.updated_at,
        userVote: r.user_vote as VoteType | undefined,
      })),
      total: parseInt(countResult?.count || '0', 10),
    };
  },

  /**
   * Get a single post by ID
   */
  async getPostById(postId: string, userId?: string): Promise<BulletinPost | null> {
    const userJoin = userId
      ? `LEFT JOIN bulletin_votes bv ON bv.post_id = bp.id AND bv.user_id = '${userId}'`
      : '';
    const userSelect = userId ? ', bv.vote_type as user_vote' : ', NULL as user_vote';

    const row = await queryOne<{
      id: string;
      board_id: number;
      author_id: string | null;
      username: string | null;
      display_name: string | null;
      avatar_url: string | null;
      title: string;
      content: string;
      content_lang: string;
      post_type: string;
      media_urls: string[] | null;
      linked_workout_id: string | null;
      linked_milestone_id: string | null;
      upvotes: number;
      downvotes: number;
      score: number;
      comment_count: number;
      view_count: number;
      is_pinned: boolean;
      is_highlighted: boolean;
      is_hidden: boolean;
      created_at: Date;
      updated_at: Date;
      user_vote: string | null;
    }>(
      `SELECT
        bp.id, bp.board_id, bp.author_id, u.username, u.display_name, u.avatar_url,
        bp.title, bp.content, bp.content_lang, bp.post_type, bp.media_urls,
        bp.linked_workout_id, bp.linked_milestone_id,
        bp.upvotes, bp.downvotes, bp.score, bp.comment_count, bp.view_count,
        bp.is_pinned, bp.is_highlighted, bp.is_hidden, bp.created_at, bp.updated_at
        ${userSelect}
       FROM bulletin_posts bp
       LEFT JOIN users u ON u.id = bp.author_id
       ${userJoin}
       WHERE bp.id = $1`,
      [postId]
    );

    if (!row) return null;

    // Increment view count
    await query('UPDATE bulletin_posts SET view_count = view_count + 1 WHERE id = $1', [postId]);

    return {
      id: row.id,
      boardId: row.board_id,
      authorId: row.author_id ?? undefined,
      authorUsername: row.username ?? undefined,
      authorDisplayName: row.display_name ?? undefined,
      authorAvatarUrl: row.avatar_url ?? undefined,
      title: row.title,
      content: row.content,
      contentLang: row.content_lang,
      postType: row.post_type as PostType,
      mediaUrls: row.media_urls || [],
      linkedWorkoutId: row.linked_workout_id ?? undefined,
      linkedMilestoneId: row.linked_milestone_id ?? undefined,
      upvotes: row.upvotes,
      downvotes: row.downvotes,
      score: row.score,
      commentCount: row.comment_count,
      viewCount: row.view_count + 1,
      isPinned: row.is_pinned,
      isHighlighted: row.is_highlighted,
      isHidden: row.is_hidden,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      userVote: row.user_vote as VoteType | undefined,
    };
  },

  /**
   * Vote on a post
   */
  async votePost(postId: string, userId: string, voteType: VoteType): Promise<{ upvotes: number; downvotes: number; score: number }> {
    // Verify post exists
    const post = await queryOne<{ id: string; board_id: number }>(
      'SELECT id, board_id FROM bulletin_posts WHERE id = $1 AND is_hidden = FALSE',
      [postId]
    );

    if (!post) {
      throw new NotFoundError('Post not found');
    }

    // Check existing vote
    const existingVote = await queryOne<{ vote_type: string }>(
      'SELECT vote_type FROM bulletin_votes WHERE post_id = $1 AND user_id = $2',
      [postId, userId]
    );

    if (existingVote) {
      if (existingVote.vote_type === voteType) {
        // Remove vote (toggle off)
        await query('DELETE FROM bulletin_votes WHERE post_id = $1 AND user_id = $2', [postId, userId]);
      } else {
        // Change vote
        await query(
          'UPDATE bulletin_votes SET vote_type = $1, updated_at = NOW() WHERE post_id = $2 AND user_id = $3',
          [voteType, postId, userId]
        );
      }
    } else {
      // New vote
      await query(
        'INSERT INTO bulletin_votes (post_id, user_id, vote_type) VALUES ($1, $2, $3)',
        [postId, userId, voteType]
      );
    }

    // Get updated counts
    const counts = await queryOne<{ upvotes: number; downvotes: number; score: number }>(
      'SELECT upvotes, downvotes, score FROM bulletin_posts WHERE id = $1',
      [postId]
    );

    return {
      upvotes: counts?.upvotes || 0,
      downvotes: counts?.downvotes || 0,
      score: counts?.score || 0,
    };
  },

  /**
   * Add a comment to a post
   */
  async addComment(
    postId: string,
    authorId: string,
    content: string,
    parentId?: string
  ): Promise<BulletinComment> {
    if (!content || content.length < 1 || content.length > 10000) {
      throw new ValidationError('Comment must be between 1 and 10,000 characters');
    }

    // Verify post exists
    const post = await queryOne<{ id: string; board_id: number }>(
      'SELECT id, board_id FROM bulletin_posts WHERE id = $1 AND is_hidden = FALSE',
      [postId]
    );

    if (!post) {
      throw new NotFoundError('Post not found');
    }

    // Verify parent comment if provided
    if (parentId) {
      const parent = await queryOne<{ id: string }>(
        'SELECT id FROM bulletin_comments WHERE id = $1 AND post_id = $2 AND is_hidden = FALSE',
        [parentId, postId]
      );
      if (!parent) {
        throw new NotFoundError('Parent comment not found');
      }
    }

    const commentId = `bc_${crypto.randomBytes(12).toString('hex')}`;

    const row = await queryOne<{
      created_at: Date;
      updated_at: Date;
    }>(
      `INSERT INTO bulletin_comments (id, post_id, parent_id, author_id, content)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING created_at, updated_at`,
      [commentId, postId, parentId, authorId, content]
    );

    // Get author info
    const author = await queryOne<{
      username: string;
      display_name: string | null;
      avatar_url: string | null;
    }>('SELECT username, display_name, avatar_url FROM users WHERE id = $1', [authorId]);

    log.info({ commentId, postId, authorId, parentId }, 'Comment added');

    return {
      id: commentId,
      postId,
      parentId,
      authorId,
      authorUsername: author?.username,
      authorDisplayName: author?.display_name ?? undefined,
      authorAvatarUrl: author?.avatar_url ?? undefined,
      content,
      upvotes: 0,
      downvotes: 0,
      score: 0,
      replyCount: 0,
      isHidden: false,
      createdAt: row!.created_at,
      updatedAt: row!.updated_at,
    };
  },

  /**
   * Get comments for a post
   */
  async getComments(
    postId: string,
    userId?: string,
    options: { limit?: number; offset?: number } = {}
  ): Promise<{ comments: BulletinComment[]; total: number }> {
    const { limit = 50, offset = 0 } = options;

    const userJoin = userId
      ? `LEFT JOIN bulletin_votes bcv ON bcv.comment_id = bc.id AND bcv.user_id = '${userId}'`
      : '';
    const userSelect = userId ? ', bcv.vote_type as user_vote' : ', NULL as user_vote';

    // Get top-level comments
    const rows = await queryAll<{
      id: string;
      post_id: string;
      parent_id: string | null;
      author_id: string | null;
      username: string | null;
      display_name: string | null;
      avatar_url: string | null;
      content: string;
      upvotes: number;
      downvotes: number;
      score: number;
      reply_count: number;
      is_hidden: boolean;
      created_at: Date;
      updated_at: Date;
      user_vote: string | null;
    }>(
      `SELECT
        bc.id, bc.post_id, bc.parent_id, bc.author_id,
        u.username, u.display_name, u.avatar_url,
        bc.content, bc.upvotes, bc.downvotes, bc.score, bc.reply_count,
        bc.is_hidden, bc.created_at, bc.updated_at
        ${userSelect}
       FROM bulletin_comments bc
       LEFT JOIN users u ON u.id = bc.author_id
       ${userJoin}
       WHERE bc.post_id = $1 AND bc.parent_id IS NULL AND bc.is_hidden = FALSE
       ORDER BY bc.score DESC, bc.created_at
       LIMIT $2 OFFSET $3`,
      [postId, limit, offset]
    );

    const countResult = await queryOne<{ count: string }>(
      'SELECT COUNT(*) as count FROM bulletin_comments WHERE post_id = $1 AND parent_id IS NULL AND is_hidden = FALSE',
      [postId]
    );

    // Get replies for each comment (limited to 3)
    const comments: BulletinComment[] = await Promise.all(
      rows.map(async (r) => {
        const replies = await queryAll<{
          id: string;
          post_id: string;
          parent_id: string | null;
          author_id: string | null;
          username: string | null;
          display_name: string | null;
          avatar_url: string | null;
          content: string;
          upvotes: number;
          downvotes: number;
          score: number;
          reply_count: number;
          is_hidden: boolean;
          created_at: Date;
          updated_at: Date;
        }>(
          `SELECT
            bc.id, bc.post_id, bc.parent_id, bc.author_id,
            u.username, u.display_name, u.avatar_url,
            bc.content, bc.upvotes, bc.downvotes, bc.score, bc.reply_count,
            bc.is_hidden, bc.created_at, bc.updated_at
           FROM bulletin_comments bc
           LEFT JOIN users u ON u.id = bc.author_id
           WHERE bc.parent_id = $1 AND bc.is_hidden = FALSE
           ORDER BY bc.created_at
           LIMIT 3`,
          [r.id]
        );

        return {
          id: r.id,
          postId: r.post_id,
          parentId: r.parent_id ?? undefined,
          authorId: r.author_id ?? undefined,
          authorUsername: r.username ?? undefined,
          authorDisplayName: r.display_name ?? undefined,
          authorAvatarUrl: r.avatar_url ?? undefined,
          content: r.content,
          upvotes: r.upvotes,
          downvotes: r.downvotes,
          score: r.score,
          replyCount: r.reply_count,
          isHidden: r.is_hidden,
          createdAt: r.created_at,
          updatedAt: r.updated_at,
          userVote: r.user_vote as VoteType | undefined,
          replies: replies.map(reply => ({
            id: reply.id,
            postId: reply.post_id,
            parentId: reply.parent_id ?? undefined,
            authorId: reply.author_id ?? undefined,
            authorUsername: reply.username ?? undefined,
            authorDisplayName: reply.display_name ?? undefined,
            authorAvatarUrl: reply.avatar_url ?? undefined,
            content: reply.content,
            upvotes: reply.upvotes,
            downvotes: reply.downvotes,
            score: reply.score,
            replyCount: reply.reply_count,
            isHidden: reply.is_hidden,
            createdAt: reply.created_at,
            updatedAt: reply.updated_at,
          })),
        };
      })
    );

    return {
      comments,
      total: parseInt(countResult?.count || '0', 10),
    };
  },

  /**
   * Vote on a comment
   */
  async voteComment(commentId: string, userId: string, voteType: VoteType): Promise<{ upvotes: number; downvotes: number; score: number }> {
    // Verify comment exists
    const comment = await queryOne<{ id: string }>(
      'SELECT id FROM bulletin_comments WHERE id = $1 AND is_hidden = FALSE',
      [commentId]
    );

    if (!comment) {
      throw new NotFoundError('Comment not found');
    }

    // Check existing vote
    const existingVote = await queryOne<{ vote_type: string }>(
      'SELECT vote_type FROM bulletin_votes WHERE comment_id = $1 AND user_id = $2',
      [commentId, userId]
    );

    if (existingVote) {
      if (existingVote.vote_type === voteType) {
        await query('DELETE FROM bulletin_votes WHERE comment_id = $1 AND user_id = $2', [commentId, userId]);
      } else {
        await query(
          'UPDATE bulletin_votes SET vote_type = $1, updated_at = NOW() WHERE comment_id = $2 AND user_id = $3',
          [voteType, commentId, userId]
        );
      }
    } else {
      await query(
        'INSERT INTO bulletin_votes (comment_id, user_id, vote_type) VALUES ($1, $2, $3)',
        [commentId, userId, voteType]
      );
    }

    // Get updated counts
    const counts = await queryOne<{ upvotes: number; downvotes: number; score: number }>(
      'SELECT upvotes, downvotes, score FROM bulletin_comments WHERE id = $1',
      [commentId]
    );

    return {
      upvotes: counts?.upvotes || 0,
      downvotes: counts?.downvotes || 0,
      score: counts?.score || 0,
    };
  },

  /**
   * Moderator: Pin/unpin a post
   */
  async togglePinPost(postId: string, actorUserId: string, pin: boolean): Promise<void> {
    const post = await queryOne<{ id: string; board_id: number }>(
      'SELECT id, board_id FROM bulletin_posts WHERE id = $1',
      [postId]
    );

    if (!post) {
      throw new NotFoundError('Post not found');
    }

    // Get board context and verify moderator permissions
    const board = await queryOne<{ community_id: number | null; virtual_hangout_id: number | null }>(
      'SELECT community_id, virtual_hangout_id FROM bulletin_boards WHERE id = $1',
      [post.board_id]
    );

    if (board?.community_id) {
      const membership = await queryOne<{ role_level: number }>(
        'SELECT role_level FROM community_memberships WHERE community_id = $1 AND user_id = $2',
        [board.community_id, actorUserId]
      );
      if (!membership || membership.role_level < CommunityRole.MODERATOR) {
        throw new ForbiddenError('Insufficient permissions');
      }
    } else if (board?.virtual_hangout_id) {
      const membership = await queryOne<{ role: number }>(
        'SELECT role FROM virtual_hangout_memberships WHERE hangout_id = $1 AND user_id = $2',
        [board.virtual_hangout_id, actorUserId]
      );
      if (!membership || membership.role < 1) { // HangoutMemberRole.MODERATOR
        throw new ForbiddenError('Insufficient permissions');
      }
    }

    await query('UPDATE bulletin_posts SET is_pinned = $1 WHERE id = $2', [pin, postId]);
    log.info({ postId, pin, actorUserId }, 'Post pin status updated');
  },

  /**
   * Moderator: Hide/unhide a post
   */
  async toggleHidePost(postId: string, actorUserId: string, hide: boolean): Promise<void> {
    const post = await queryOne<{ id: string; board_id: number }>(
      'SELECT id, board_id FROM bulletin_posts WHERE id = $1',
      [postId]
    );

    if (!post) {
      throw new NotFoundError('Post not found');
    }

    // Get board context and verify moderator permissions
    const board = await queryOne<{ community_id: number | null; virtual_hangout_id: number | null }>(
      'SELECT community_id, virtual_hangout_id FROM bulletin_boards WHERE id = $1',
      [post.board_id]
    );

    if (board?.community_id) {
      const membership = await queryOne<{ role_level: number }>(
        'SELECT role_level FROM community_memberships WHERE community_id = $1 AND user_id = $2',
        [board.community_id, actorUserId]
      );
      if (!membership || membership.role_level < CommunityRole.MODERATOR) {
        throw new ForbiddenError('Insufficient permissions');
      }
    } else if (board?.virtual_hangout_id) {
      const membership = await queryOne<{ role: number }>(
        'SELECT role FROM virtual_hangout_memberships WHERE hangout_id = $1 AND user_id = $2',
        [board.virtual_hangout_id, actorUserId]
      );
      if (!membership || membership.role < 1) {
        throw new ForbiddenError('Insufficient permissions');
      }
    }

    await query('UPDATE bulletin_posts SET is_hidden = $1 WHERE id = $2', [hide, postId]);
    log.info({ postId, hide, actorUserId }, 'Post hidden status updated');
  },

  /**
   * Get or create a bulletin board for a community/hangout
   */
  async getOrCreateBoard(
    type: 'community' | 'hangout',
    entityId: number
  ): Promise<{ id: number; name: string }> {
    const column = type === 'community' ? 'community_id' : 'virtual_hangout_id';

    // Check if board exists
    let board = await queryOne<{ id: number; name: string }>(
      `SELECT id, name FROM bulletin_boards WHERE ${column} = $1 AND is_active = TRUE`,
      [entityId]
    );

    if (board) {
      return board;
    }

    // Get entity name
    let entityName = 'Discussion';
    if (type === 'community') {
      const community = await queryOne<{ name: string }>('SELECT name FROM communities WHERE id = $1', [entityId]);
      entityName = community?.name || 'Community';
    } else {
      const hangout = await queryOne<{ name: string }>('SELECT name FROM virtual_hangouts WHERE id = $1', [entityId]);
      entityName = hangout?.name || 'Hangout';
    }

    // Create board
    const row = await queryOne<{ id: number }>(
      `INSERT INTO bulletin_boards (${column}, name, description, board_type)
       VALUES ($1, $2, $3, 'general')
       RETURNING id`,
      [entityId, `${entityName} Bulletin Board`, `Discussion board for ${entityName}`]
    );

    return {
      id: row!.id,
      name: `${entityName} Bulletin Board`,
    };
  },
};
