/**
 * Community Resources Service
 *
 * Handles community knowledge base and shared artifacts:
 * - Pinned resources (guides, FAQs, tutorials)
 * - File uploads and links
 * - Helpful vote tracking
 * - Resource categories
 */

import crypto from 'crypto';
import { queryOne, queryAll, query, transaction } from '../../db/client';
import { loggers } from '../../lib/logger';

const log = loggers.core;

// ============================================
// TYPES
// ============================================

export interface CommunityResource {
  id: string;
  communityId: number;
  authorId: string;
  title: string;
  description?: string;
  resourceType: 'guide' | 'faq' | 'link' | 'file' | 'video' | 'program' | 'template';
  content?: string;
  url?: string;
  fileUrl?: string;
  fileType?: string;
  fileSizeBytes?: number;
  category?: string;
  tags: string[];
  isPinned: boolean;
  pinnedAt?: Date;
  pinnedBy?: string;
  helpfulCount: number;
  viewCount: number;
  status: 'draft' | 'published' | 'archived';
  publishedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface ResourceWithAuthor extends CommunityResource {
  authorUsername: string;
  authorDisplayName?: string;
  authorAvatarUrl?: string;
  userVoted?: boolean;
}

export interface ResourceCategory {
  category: string;
  resourceCount: number;
}

export interface ResourceSearchOptions {
  communityId: number;
  resourceType?: CommunityResource['resourceType'];
  category?: string;
  tags?: string[];
  isPinned?: boolean;
  searchQuery?: string;
  status?: CommunityResource['status'];
  limit?: number;
  offset?: number;
  sortBy?: 'newest' | 'most_helpful' | 'most_viewed';
}

// ============================================
// SERVICE
// ============================================

export const communityResourcesService = {
  // ==========================================
  // RESOURCE CRUD
  // ==========================================

  /**
   * Create a new resource
   */
  async createResource(
    communityId: number,
    authorId: string,
    resource: {
      title: string;
      description?: string;
      resourceType: CommunityResource['resourceType'];
      content?: string;
      url?: string;
      fileUrl?: string;
      fileType?: string;
      fileSizeBytes?: number;
      category?: string;
      tags?: string[];
      status?: CommunityResource['status'];
    }
  ): Promise<CommunityResource> {
    const id = `cr_${crypto.randomBytes(12).toString('hex')}`;
    const status = resource.status || 'published';
    const publishedAt = status === 'published' ? new Date() : null;

    await query(
      `INSERT INTO community_resources (
        id, community_id, author_id, title, description, resource_type,
        content, url, file_url, file_type, file_size_bytes, category, tags, status, published_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)`,
      [
        id,
        communityId,
        authorId,
        resource.title,
        resource.description,
        resource.resourceType,
        resource.content,
        resource.url,
        resource.fileUrl,
        resource.fileType,
        resource.fileSizeBytes,
        resource.category,
        resource.tags || [],
        status,
        publishedAt,
      ]
    );

    return {
      id,
      communityId,
      authorId,
      title: resource.title,
      description: resource.description,
      resourceType: resource.resourceType,
      content: resource.content,
      url: resource.url,
      fileUrl: resource.fileUrl,
      fileType: resource.fileType,
      fileSizeBytes: resource.fileSizeBytes,
      category: resource.category,
      tags: resource.tags || [],
      isPinned: false,
      helpfulCount: 0,
      viewCount: 0,
      status,
      publishedAt: publishedAt || undefined,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  },

  /**
   * Get a resource by ID
   */
  async getResource(resourceId: string, viewerId?: string): Promise<ResourceWithAuthor | null> {
    const result = await queryOne<{
      id: string;
      community_id: number;
      author_id: string;
      title: string;
      description: string | null;
      resource_type: string;
      content: string | null;
      url: string | null;
      file_url: string | null;
      file_type: string | null;
      file_size_bytes: number | null;
      category: string | null;
      tags: string[];
      is_pinned: boolean;
      pinned_at: Date | null;
      pinned_by: string | null;
      helpful_count: number;
      view_count: number;
      status: string;
      published_at: Date | null;
      created_at: Date;
      updated_at: Date;
      username: string;
      display_name: string | null;
      avatar_url: string | null;
      user_voted: boolean;
    }>(
      `SELECT cr.*, u.username, u.display_name, u.avatar_url,
              EXISTS(SELECT 1 FROM resource_helpful_votes WHERE resource_id = cr.id AND user_id = $2) as user_voted
       FROM community_resources cr
       JOIN users u ON u.id = cr.author_id
       WHERE cr.id = $1`,
      [resourceId, viewerId]
    );

    if (!result) return null;

    return {
      id: result.id,
      communityId: result.community_id,
      authorId: result.author_id,
      title: result.title,
      description: result.description || undefined,
      resourceType: result.resource_type as CommunityResource['resourceType'],
      content: result.content || undefined,
      url: result.url || undefined,
      fileUrl: result.file_url || undefined,
      fileType: result.file_type || undefined,
      fileSizeBytes: result.file_size_bytes || undefined,
      category: result.category || undefined,
      tags: result.tags,
      isPinned: result.is_pinned,
      pinnedAt: result.pinned_at || undefined,
      pinnedBy: result.pinned_by || undefined,
      helpfulCount: result.helpful_count,
      viewCount: result.view_count,
      status: result.status as CommunityResource['status'],
      publishedAt: result.published_at || undefined,
      createdAt: result.created_at,
      updatedAt: result.updated_at,
      authorUsername: result.username,
      authorDisplayName: result.display_name || undefined,
      authorAvatarUrl: result.avatar_url || undefined,
      userVoted: result.user_voted,
    };
  },

  /**
   * Update a resource
   */
  async updateResource(
    resourceId: string,
    authorId: string,
    updates: Partial<{
      title: string;
      description: string;
      content: string;
      url: string;
      category: string;
      tags: string[];
      status: CommunityResource['status'];
    }>
  ): Promise<void> {
    const setters: string[] = ['updated_at = NOW()'];
    const params: any[] = [];
    let paramIndex = 1;

    if (updates.title !== undefined) {
      setters.push(`title = $${paramIndex}`);
      params.push(updates.title);
      paramIndex++;
    }
    if (updates.description !== undefined) {
      setters.push(`description = $${paramIndex}`);
      params.push(updates.description);
      paramIndex++;
    }
    if (updates.content !== undefined) {
      setters.push(`content = $${paramIndex}`);
      params.push(updates.content);
      paramIndex++;
    }
    if (updates.url !== undefined) {
      setters.push(`url = $${paramIndex}`);
      params.push(updates.url);
      paramIndex++;
    }
    if (updates.category !== undefined) {
      setters.push(`category = $${paramIndex}`);
      params.push(updates.category);
      paramIndex++;
    }
    if (updates.tags !== undefined) {
      setters.push(`tags = $${paramIndex}`);
      params.push(updates.tags);
      paramIndex++;
    }
    if (updates.status !== undefined) {
      setters.push(`status = $${paramIndex}`);
      params.push(updates.status);
      paramIndex++;
      if (updates.status === 'published') {
        setters.push(`published_at = COALESCE(published_at, NOW())`);
      }
    }

    params.push(resourceId, authorId);

    await query(
      `UPDATE community_resources SET ${setters.join(', ')}
       WHERE id = $${paramIndex} AND author_id = $${paramIndex + 1}`,
      params
    );
  },

  /**
   * Delete a resource
   */
  async deleteResource(resourceId: string, userId: string, isAdmin: boolean = false): Promise<void> {
    const condition = isAdmin ? '' : 'AND author_id = $2';
    const params = isAdmin ? [resourceId] : [resourceId, userId];

    await query(`DELETE FROM community_resources WHERE id = $1 ${condition}`, params);
  },

  /**
   * Search/list resources
   */
  async searchResources(
    options: ResourceSearchOptions,
    viewerId?: string
  ): Promise<{ resources: ResourceWithAuthor[]; total: number }> {
    const {
      communityId,
      resourceType,
      category,
      tags,
      isPinned,
      searchQuery,
      status = 'published',
      limit = 20,
      offset = 0,
      sortBy = 'newest',
    } = options;

    const conditions: string[] = ['cr.community_id = $1', 'cr.status = $2'];
    const params: any[] = [communityId, status];
    let paramIndex = 3;

    if (resourceType) {
      conditions.push(`cr.resource_type = $${paramIndex}`);
      params.push(resourceType);
      paramIndex++;
    }

    if (category) {
      conditions.push(`cr.category = $${paramIndex}`);
      params.push(category);
      paramIndex++;
    }

    if (tags && tags.length > 0) {
      conditions.push(`cr.tags && $${paramIndex}`);
      params.push(tags);
      paramIndex++;
    }

    if (isPinned !== undefined) {
      conditions.push(`cr.is_pinned = $${paramIndex}`);
      params.push(isPinned);
      paramIndex++;
    }

    if (searchQuery) {
      conditions.push(`(cr.title ILIKE $${paramIndex} OR cr.description ILIKE $${paramIndex} OR cr.content ILIKE $${paramIndex})`);
      params.push(`%${searchQuery}%`);
      paramIndex++;
    }

    let orderBy: string;
    switch (sortBy) {
      case 'most_helpful':
        orderBy = 'cr.helpful_count DESC, cr.created_at DESC';
        break;
      case 'most_viewed':
        orderBy = 'cr.view_count DESC, cr.created_at DESC';
        break;
      default:
        orderBy = 'cr.is_pinned DESC, cr.created_at DESC';
    }

    params.push(limit, offset);
    const viewerIdParam = viewerId || null;

    const [rows, countResult] = await Promise.all([
      queryAll<{
        id: string;
        community_id: number;
        author_id: string;
        title: string;
        description: string | null;
        resource_type: string;
        content: string | null;
        url: string | null;
        file_url: string | null;
        file_type: string | null;
        file_size_bytes: number | null;
        category: string | null;
        tags: string[];
        is_pinned: boolean;
        pinned_at: Date | null;
        pinned_by: string | null;
        helpful_count: number;
        view_count: number;
        status: string;
        published_at: Date | null;
        created_at: Date;
        updated_at: Date;
        username: string;
        display_name: string | null;
        avatar_url: string | null;
        user_voted: boolean;
      }>(
        `SELECT cr.*, u.username, u.display_name, u.avatar_url,
                EXISTS(SELECT 1 FROM resource_helpful_votes WHERE resource_id = cr.id AND user_id = $${paramIndex + 1}) as user_voted
         FROM community_resources cr
         JOIN users u ON u.id = cr.author_id
         WHERE ${conditions.join(' AND ')}
         ORDER BY ${orderBy}
         LIMIT $${paramIndex - 1} OFFSET $${paramIndex}`,
        [...params, viewerIdParam]
      ),
      queryOne<{ count: string }>(
        `SELECT COUNT(*) as count FROM community_resources cr WHERE ${conditions.join(' AND ')}`,
        params.slice(0, -2)
      ),
    ]);

    return {
      resources: rows.map((r) => ({
        id: r.id,
        communityId: r.community_id,
        authorId: r.author_id,
        title: r.title,
        description: r.description || undefined,
        resourceType: r.resource_type as CommunityResource['resourceType'],
        content: r.content || undefined,
        url: r.url || undefined,
        fileUrl: r.file_url || undefined,
        fileType: r.file_type || undefined,
        fileSizeBytes: r.file_size_bytes || undefined,
        category: r.category || undefined,
        tags: r.tags,
        isPinned: r.is_pinned,
        pinnedAt: r.pinned_at || undefined,
        pinnedBy: r.pinned_by || undefined,
        helpfulCount: r.helpful_count,
        viewCount: r.view_count,
        status: r.status as CommunityResource['status'],
        publishedAt: r.published_at || undefined,
        createdAt: r.created_at,
        updatedAt: r.updated_at,
        authorUsername: r.username,
        authorDisplayName: r.display_name || undefined,
        authorAvatarUrl: r.avatar_url || undefined,
        userVoted: r.user_voted,
      })),
      total: parseInt(countResult?.count || '0'),
    };
  },

  /**
   * Get pinned resources for a community
   */
  async getPinnedResources(communityId: number, viewerId?: string): Promise<ResourceWithAuthor[]> {
    const result = await this.searchResources({ communityId, isPinned: true, limit: 50 }, viewerId);
    return result.resources;
  },

  /**
   * Get resource categories for a community
   */
  async getCategories(communityId: number): Promise<ResourceCategory[]> {
    const rows = await queryAll<{ category: string; count: string }>(
      `SELECT category, COUNT(*) as count
       FROM community_resources
       WHERE community_id = $1 AND status = 'published' AND category IS NOT NULL
       GROUP BY category
       ORDER BY count DESC`,
      [communityId]
    );

    return rows.map((r) => ({
      category: r.category,
      resourceCount: parseInt(r.count),
    }));
  },

  // ==========================================
  // PINNING
  // ==========================================

  /**
   * Pin a resource (admin/mod action)
   */
  async pinResource(resourceId: string, pinnedBy: string): Promise<void> {
    await query(
      `UPDATE community_resources SET is_pinned = true, pinned_at = NOW(), pinned_by = $2 WHERE id = $1`,
      [resourceId, pinnedBy]
    );
  },

  /**
   * Unpin a resource
   */
  async unpinResource(resourceId: string): Promise<void> {
    await query(
      `UPDATE community_resources SET is_pinned = false, pinned_at = NULL, pinned_by = NULL WHERE id = $1`,
      [resourceId]
    );
  },

  // ==========================================
  // HELPFUL VOTES
  // ==========================================

  /**
   * Mark a resource as helpful
   */
  async markHelpful(resourceId: string, userId: string): Promise<void> {
    await transaction(async (client) => {
      const id = `rhv_${crypto.randomBytes(12).toString('hex')}`;

      const result = await client.query(
        `INSERT INTO resource_helpful_votes (id, resource_id, user_id)
         VALUES ($1, $2, $3)
         ON CONFLICT (resource_id, user_id) DO NOTHING
         RETURNING id`,
        [id, resourceId, userId]
      );

      if (result.rowCount && result.rowCount > 0) {
        await client.query(
          'UPDATE community_resources SET helpful_count = helpful_count + 1 WHERE id = $1',
          [resourceId]
        );
      }
    });
  },

  /**
   * Remove helpful vote
   */
  async removeHelpful(resourceId: string, userId: string): Promise<void> {
    await transaction(async (client) => {
      const result = await client.query(
        'DELETE FROM resource_helpful_votes WHERE resource_id = $1 AND user_id = $2 RETURNING id',
        [resourceId, userId]
      );

      if (result.rowCount && result.rowCount > 0) {
        await client.query(
          'UPDATE community_resources SET helpful_count = GREATEST(helpful_count - 1, 0) WHERE id = $1',
          [resourceId]
        );
      }
    });
  },

  // ==========================================
  // VIEW TRACKING
  // ==========================================

  /**
   * Increment view count
   */
  async recordView(resourceId: string): Promise<void> {
    await query('UPDATE community_resources SET view_count = view_count + 1 WHERE id = $1', [resourceId]);
  },

  // ==========================================
  // POPULAR/TRENDING
  // ==========================================

  /**
   * Get most helpful resources across communities
   */
  async getMostHelpful(options: { limit?: number; communityIds?: number[] } = {}): Promise<ResourceWithAuthor[]> {
    const { limit = 10, communityIds } = options;

    const conditions: string[] = [`cr.status = 'published'`];
    const params: any[] = [];
    let paramIndex = 1;

    if (communityIds && communityIds.length > 0) {
      conditions.push(`cr.community_id = ANY($${paramIndex})`);
      params.push(communityIds);
      paramIndex++;
    }

    params.push(limit);

    const rows = await queryAll<{
      id: string;
      community_id: number;
      author_id: string;
      title: string;
      description: string | null;
      resource_type: string;
      category: string | null;
      tags: string[];
      is_pinned: boolean;
      helpful_count: number;
      view_count: number;
      status: string;
      created_at: Date;
      updated_at: Date;
      username: string;
      display_name: string | null;
      avatar_url: string | null;
    }>(
      `SELECT cr.id, cr.community_id, cr.author_id, cr.title, cr.description, cr.resource_type,
              cr.category, cr.tags, cr.is_pinned, cr.helpful_count, cr.view_count, cr.status,
              cr.created_at, cr.updated_at, u.username, u.display_name, u.avatar_url
       FROM community_resources cr
       JOIN users u ON u.id = cr.author_id
       WHERE ${conditions.join(' AND ')}
       ORDER BY cr.helpful_count DESC, cr.view_count DESC
       LIMIT $${paramIndex}`,
      params
    );

    return rows.map((r) => ({
      id: r.id,
      communityId: r.community_id,
      authorId: r.author_id,
      title: r.title,
      description: r.description || undefined,
      resourceType: r.resource_type as CommunityResource['resourceType'],
      category: r.category || undefined,
      tags: r.tags,
      isPinned: r.is_pinned,
      helpfulCount: r.helpful_count,
      viewCount: r.view_count,
      status: r.status as CommunityResource['status'],
      createdAt: r.created_at,
      updatedAt: r.updated_at,
      authorUsername: r.username,
      authorDisplayName: r.display_name || undefined,
      authorAvatarUrl: r.avatar_url || undefined,
    }));
  },
};

export default communityResourcesService;
