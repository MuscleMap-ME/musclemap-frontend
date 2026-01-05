/**
 * Issues Service
 *
 * Comprehensive bug and issue tracking system:
 * - CRUD operations for issues
 * - Comments management
 * - Voting system
 * - Subscriptions
 * - Status management
 * - Search and filtering
 */

import crypto from 'crypto';
import { queryOne, queryAll, query, serializableTransaction } from '../db/client';
import { ValidationError, NotFoundError, ForbiddenError } from '../lib/errors';
import { loggers } from '../lib/logger';

const log = loggers.core;

// Enums
export enum IssueType {
  BUG = 0,
  FEATURE = 1,
  ENHANCEMENT = 2,
  ACCOUNT = 3,
  QUESTION = 4,
  OTHER = 5,
}

export enum IssueStatus {
  OPEN = 0,
  IN_PROGRESS = 1,
  UNDER_REVIEW = 2,
  RESOLVED = 3,
  CLOSED = 4,
  WONT_FIX = 5,
  DUPLICATE = 6,
}

export enum IssuePriority {
  LOW = 0,
  MEDIUM = 1,
  HIGH = 2,
  CRITICAL = 3,
}

export enum UpdateType {
  UPDATE = 0,
  RELEASE = 1,
  ANNOUNCEMENT = 2,
  BUGFIX = 3,
  MAINTENANCE = 4,
}

export enum RoadmapStatus {
  PLANNED = 0,
  IN_PROGRESS = 1,
  COMPLETED = 2,
  PAUSED = 3,
  CANCELLED = 4,
}

// Types
export interface IssueLabel {
  id: string;
  name: string;
  slug: string;
  description?: string;
  color: string;
  icon?: string;
  displayOrder: number;
  isSystem: boolean;
}

export interface Issue {
  id: string;
  issueNumber: number;
  title: string;
  description: string;
  type: IssueType;
  status: IssueStatus;
  priority: IssuePriority;
  authorId: string;
  authorUsername?: string;
  authorDisplayName?: string;
  authorAvatarUrl?: string;
  assigneeId?: string;
  assigneeUsername?: string;
  assigneeDisplayName?: string;
  labelIds: string[];
  labels?: IssueLabel[];
  voteCount: number;
  commentCount: number;
  subscriberCount: number;
  viewCount: number;
  isPinned: boolean;
  isLocked: boolean;
  isPublic: boolean;
  resolvedAt?: Date;
  resolvedBy?: string;
  resolutionNote?: string;
  browserInfo?: Record<string, any>;
  deviceInfo?: Record<string, any>;
  pageUrl?: string;
  screenshotUrls: string[];
  relatedIssueIds: string[];
  duplicateOfId?: string;
  createdAt: Date;
  updatedAt: Date;
  hasVoted?: boolean;
  isSubscribed?: boolean;
}

export interface IssueComment {
  id: string;
  issueId: string;
  authorId: string;
  authorUsername?: string;
  authorDisplayName?: string;
  authorAvatarUrl?: string;
  authorRoles?: string[];
  parentId?: string;
  content: string;
  isStaffReply: boolean;
  isSolution: boolean;
  isHidden: boolean;
  editCount: number;
  lastEditedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface DevUpdate {
  id: string;
  title: string;
  content: string;
  type: UpdateType;
  authorId: string;
  authorUsername?: string;
  authorDisplayName?: string;
  relatedIssueIds: string[];
  isPublished: boolean;
  publishedAt?: Date;
  viewCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface RoadmapItem {
  id: string;
  title: string;
  description?: string;
  status: RoadmapStatus;
  quarter?: string;
  category?: string;
  progress: number;
  relatedIssueIds: string[];
  voteCount: number;
  displayOrder: number;
  isPublic: boolean;
  startedAt?: Date;
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  hasVoted?: boolean;
}

// Request types
interface CreateIssueRequest {
  title: string;
  description: string;
  type: IssueType;
  priority?: IssuePriority;
  labelIds?: string[];
  browserInfo?: Record<string, any>;
  deviceInfo?: Record<string, any>;
  pageUrl?: string;
  screenshotUrls?: string[];
}

interface UpdateIssueRequest {
  title?: string;
  description?: string;
  type?: IssueType;
  status?: IssueStatus;
  priority?: IssuePriority;
  assigneeId?: string | null;
  labelIds?: string[];
  isPinned?: boolean;
  isLocked?: boolean;
  isPublic?: boolean;
  resolutionNote?: string;
  duplicateOfId?: string;
  relatedIssueIds?: string[];
}

interface ListIssuesOptions {
  status?: IssueStatus | IssueStatus[];
  type?: IssueType;
  authorId?: string;
  assigneeId?: string;
  labelSlug?: string;
  search?: string;
  sortBy?: 'newest' | 'oldest' | 'votes' | 'comments' | 'updated';
  limit?: number;
  offset?: number;
  userId?: string; // For checking user's vote/subscription status
}

// Service
export const issuesService = {
  // ============================================
  // LABELS
  // ============================================

  async getLabels(): Promise<IssueLabel[]> {
    const rows = await queryAll<{
      id: string;
      name: string;
      slug: string;
      description: string | null;
      color: string;
      icon: string | null;
      display_order: number;
      is_system: boolean;
    }>('SELECT * FROM issue_labels ORDER BY display_order, name');

    return rows.map((r) => ({
      id: r.id,
      name: r.name,
      slug: r.slug,
      description: r.description ?? undefined,
      color: r.color,
      icon: r.icon ?? undefined,
      displayOrder: r.display_order,
      isSystem: r.is_system,
    }));
  },

  // ============================================
  // ISSUES CRUD
  // ============================================

  async createIssue(authorId: string, request: CreateIssueRequest): Promise<Issue> {
    const {
      title,
      description,
      type,
      priority = IssuePriority.MEDIUM,
      labelIds = [],
      browserInfo,
      deviceInfo,
      pageUrl,
      screenshotUrls = [],
    } = request;

    // Validate
    if (!title || title.length < 5 || title.length > 200) {
      throw new ValidationError('Title must be between 5 and 200 characters');
    }

    if (!description || description.length < 20 || description.length > 10000) {
      throw new ValidationError('Description must be between 20 and 10,000 characters');
    }

    if (type < 0 || type > 5) {
      throw new ValidationError('Invalid issue type');
    }

    const issueId = `iss_${crypto.randomBytes(12).toString('hex')}`;

    const row = await queryOne<{
      id: string;
      issue_number: number;
      created_at: Date;
      updated_at: Date;
    }>(
      `INSERT INTO issues (
        id, title, description, type, priority, author_id, label_ids,
        browser_info, device_info, page_url, screenshot_urls
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING id, issue_number, created_at, updated_at`,
      [
        issueId,
        title,
        description,
        type,
        priority,
        authorId,
        labelIds,
        browserInfo ? JSON.stringify(browserInfo) : null,
        deviceInfo ? JSON.stringify(deviceInfo) : null,
        pageUrl,
        screenshotUrls,
      ]
    );

    // Auto-subscribe author
    await query(
      'INSERT INTO issue_subscribers (issue_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
      [issueId, authorId]
    );

    // Log status history
    await query(
      `INSERT INTO issue_status_history (issue_id, actor_id, action, new_value)
       VALUES ($1, $2, 'created', $3)`,
      [issueId, authorId, 'open']
    );

    log.info({ issueId, issueNumber: row!.issue_number, authorId, type }, 'Issue created');

    // Fetch author info
    const author = await queryOne<{
      username: string;
      display_name: string | null;
      avatar_url: string | null;
    }>('SELECT username, display_name, avatar_url FROM users WHERE id = $1', [authorId]);

    return {
      id: row!.id,
      issueNumber: row!.issue_number,
      title,
      description,
      type,
      status: IssueStatus.OPEN,
      priority,
      authorId,
      authorUsername: author?.username,
      authorDisplayName: author?.display_name ?? undefined,
      authorAvatarUrl: author?.avatar_url ?? undefined,
      labelIds,
      voteCount: 0,
      commentCount: 0,
      subscriberCount: 1,
      viewCount: 0,
      isPinned: false,
      isLocked: false,
      isPublic: true,
      screenshotUrls,
      relatedIssueIds: [],
      createdAt: row!.created_at,
      updatedAt: row!.updated_at,
      hasVoted: false,
      isSubscribed: true,
    };
  },

  async getIssueById(issueId: string, userId?: string): Promise<Issue | null> {
    const isNumber = /^\d+$/.test(issueId);
    const whereClause = isNumber ? 'i.issue_number = $1' : 'i.id = $1';

    const userJoins = userId
      ? `LEFT JOIN issue_votes iv ON iv.issue_id = i.id AND iv.user_id = '${userId}'
         LEFT JOIN issue_subscribers isub ON isub.issue_id = i.id AND isub.user_id = '${userId}'`
      : '';
    const userSelects = userId
      ? ', (iv.user_id IS NOT NULL) as has_voted, (isub.user_id IS NOT NULL) as is_subscribed'
      : ', NULL as has_voted, NULL as is_subscribed';

    const row = await queryOne<{
      id: string;
      issue_number: number;
      title: string;
      description: string;
      type: number;
      status: number;
      priority: number;
      author_id: string;
      author_username: string;
      author_display_name: string | null;
      author_avatar_url: string | null;
      assignee_id: string | null;
      assignee_username: string | null;
      assignee_display_name: string | null;
      label_ids: string[];
      vote_count: number;
      comment_count: number;
      subscriber_count: number;
      view_count: number;
      is_pinned: boolean;
      is_locked: boolean;
      is_public: boolean;
      resolved_at: Date | null;
      resolved_by: string | null;
      resolution_note: string | null;
      browser_info: string | null;
      device_info: string | null;
      page_url: string | null;
      screenshot_urls: string[];
      related_issue_ids: string[];
      duplicate_of_id: string | null;
      created_at: Date;
      updated_at: Date;
      has_voted: boolean | null;
      is_subscribed: boolean | null;
    }>(
      `SELECT i.*,
        ua.username as author_username, ua.display_name as author_display_name, ua.avatar_url as author_avatar_url,
        uas.username as assignee_username, uas.display_name as assignee_display_name
        ${userSelects}
      FROM issues i
      LEFT JOIN users ua ON ua.id = i.author_id
      LEFT JOIN users uas ON uas.id = i.assignee_id
      ${userJoins}
      WHERE ${whereClause}`,
      [isNumber ? parseInt(issueId, 10) : issueId]
    );

    if (!row) return null;

    // Get labels
    let labels: IssueLabel[] = [];
    if (row.label_ids && row.label_ids.length > 0) {
      labels = await this.getLabelsByIds(row.label_ids);
    }

    return {
      id: row.id,
      issueNumber: row.issue_number,
      title: row.title,
      description: row.description,
      type: row.type as IssueType,
      status: row.status as IssueStatus,
      priority: row.priority as IssuePriority,
      authorId: row.author_id,
      authorUsername: row.author_username,
      authorDisplayName: row.author_display_name ?? undefined,
      authorAvatarUrl: row.author_avatar_url ?? undefined,
      assigneeId: row.assignee_id ?? undefined,
      assigneeUsername: row.assignee_username ?? undefined,
      assigneeDisplayName: row.assignee_display_name ?? undefined,
      labelIds: row.label_ids || [],
      labels,
      voteCount: row.vote_count,
      commentCount: row.comment_count,
      subscriberCount: row.subscriber_count,
      viewCount: row.view_count,
      isPinned: row.is_pinned,
      isLocked: row.is_locked,
      isPublic: row.is_public,
      resolvedAt: row.resolved_at ?? undefined,
      resolvedBy: row.resolved_by ?? undefined,
      resolutionNote: row.resolution_note ?? undefined,
      browserInfo: row.browser_info ? JSON.parse(row.browser_info) : undefined,
      deviceInfo: row.device_info ? JSON.parse(row.device_info) : undefined,
      pageUrl: row.page_url ?? undefined,
      screenshotUrls: row.screenshot_urls || [],
      relatedIssueIds: row.related_issue_ids || [],
      duplicateOfId: row.duplicate_of_id ?? undefined,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      hasVoted: row.has_voted ?? undefined,
      isSubscribed: row.is_subscribed ?? undefined,
    };
  },

  async getLabelsByIds(ids: string[]): Promise<IssueLabel[]> {
    if (!ids.length) return [];

    const rows = await queryAll<{
      id: string;
      name: string;
      slug: string;
      description: string | null;
      color: string;
      icon: string | null;
      display_order: number;
      is_system: boolean;
    }>(
      `SELECT * FROM issue_labels WHERE id = ANY($1) ORDER BY display_order`,
      [ids]
    );

    return rows.map((r) => ({
      id: r.id,
      name: r.name,
      slug: r.slug,
      description: r.description ?? undefined,
      color: r.color,
      icon: r.icon ?? undefined,
      displayOrder: r.display_order,
      isSystem: r.is_system,
    }));
  },

  async listIssues(options: ListIssuesOptions = {}): Promise<{ issues: Issue[]; total: number }> {
    const {
      status,
      type,
      authorId,
      assigneeId,
      labelSlug,
      search,
      sortBy = 'newest',
      limit = 20,
      offset = 0,
      userId,
    } = options;

    const conditions: string[] = ['i.is_public = TRUE'];
    const params: any[] = [];
    let paramIndex = 1;

    if (status !== undefined) {
      if (Array.isArray(status)) {
        conditions.push(`i.status = ANY($${paramIndex++})`);
        params.push(status);
      } else {
        conditions.push(`i.status = $${paramIndex++}`);
        params.push(status);
      }
    }

    if (type !== undefined) {
      conditions.push(`i.type = $${paramIndex++}`);
      params.push(type);
    }

    if (authorId) {
      conditions.push(`i.author_id = $${paramIndex++}`);
      params.push(authorId);
    }

    if (assigneeId) {
      conditions.push(`i.assignee_id = $${paramIndex++}`);
      params.push(assigneeId);
    }

    if (labelSlug) {
      conditions.push(`EXISTS (
        SELECT 1 FROM issue_labels il
        WHERE il.id = ANY(i.label_ids) AND il.slug = $${paramIndex++}
      )`);
      params.push(labelSlug);
    }

    if (search) {
      conditions.push(`(
        i.title ILIKE $${paramIndex} OR i.description ILIKE $${paramIndex}
        OR to_tsvector('english', i.title || ' ' || i.description) @@ plainto_tsquery('english', $${paramIndex + 1})
      )`);
      params.push(`%${search}%`, search);
      paramIndex += 2;
    }

    const whereClause = conditions.join(' AND ');

    let orderBy = 'i.created_at DESC';
    switch (sortBy) {
      case 'oldest':
        orderBy = 'i.created_at ASC';
        break;
      case 'votes':
        orderBy = 'i.vote_count DESC, i.created_at DESC';
        break;
      case 'comments':
        orderBy = 'i.comment_count DESC, i.created_at DESC';
        break;
      case 'updated':
        orderBy = 'i.updated_at DESC';
        break;
    }

    const userJoins = userId
      ? `LEFT JOIN issue_votes iv ON iv.issue_id = i.id AND iv.user_id = '${userId}'`
      : '';
    const userSelects = userId ? ', (iv.user_id IS NOT NULL) as has_voted' : ', NULL as has_voted';

    // Get total count
    const countResult = await queryOne<{ count: string }>(
      `SELECT COUNT(*) as count FROM issues i WHERE ${whereClause}`,
      params
    );
    const total = parseInt(countResult?.count || '0', 10);

    // Get issues
    const rows = await queryAll<{
      id: string;
      issue_number: number;
      title: string;
      description: string;
      type: number;
      status: number;
      priority: number;
      author_id: string;
      author_username: string;
      author_display_name: string | null;
      author_avatar_url: string | null;
      label_ids: string[];
      vote_count: number;
      comment_count: number;
      subscriber_count: number;
      view_count: number;
      is_pinned: boolean;
      is_locked: boolean;
      created_at: Date;
      updated_at: Date;
      has_voted: boolean | null;
    }>(
      `SELECT i.id, i.issue_number, i.title, i.description, i.type, i.status, i.priority,
        i.author_id, u.username as author_username, u.display_name as author_display_name,
        u.avatar_url as author_avatar_url, i.label_ids, i.vote_count, i.comment_count,
        i.subscriber_count, i.view_count, i.is_pinned, i.is_locked, i.created_at, i.updated_at
        ${userSelects}
      FROM issues i
      LEFT JOIN users u ON u.id = i.author_id
      ${userJoins}
      WHERE ${whereClause}
      ORDER BY i.is_pinned DESC, ${orderBy}
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      [...params, limit, offset]
    );

    // Get all label IDs for batch fetch
    const allLabelIds = [...new Set(rows.flatMap((r) => r.label_ids || []))];
    const labelsMap = new Map<string, IssueLabel>();
    if (allLabelIds.length > 0) {
      const labels = await this.getLabelsByIds(allLabelIds);
      labels.forEach((l) => labelsMap.set(l.id, l));
    }

    const issues: Issue[] = rows.map((r) => ({
      id: r.id,
      issueNumber: r.issue_number,
      title: r.title,
      description: r.description.substring(0, 300) + (r.description.length > 300 ? '...' : ''),
      type: r.type as IssueType,
      status: r.status as IssueStatus,
      priority: r.priority as IssuePriority,
      authorId: r.author_id,
      authorUsername: r.author_username,
      authorDisplayName: r.author_display_name ?? undefined,
      authorAvatarUrl: r.author_avatar_url ?? undefined,
      labelIds: r.label_ids || [],
      labels: (r.label_ids || []).map((id) => labelsMap.get(id)).filter(Boolean) as IssueLabel[],
      voteCount: r.vote_count,
      commentCount: r.comment_count,
      subscriberCount: r.subscriber_count,
      viewCount: r.view_count,
      isPinned: r.is_pinned,
      isLocked: r.is_locked,
      isPublic: true,
      screenshotUrls: [],
      relatedIssueIds: [],
      createdAt: r.created_at,
      updatedAt: r.updated_at,
      hasVoted: r.has_voted ?? undefined,
    }));

    return { issues, total };
  },

  async updateIssue(
    issueId: string,
    actorId: string,
    request: UpdateIssueRequest,
    isAdmin: boolean = false
  ): Promise<Issue> {
    const issue = await this.getIssueById(issueId);
    if (!issue) {
      throw new NotFoundError('Issue not found');
    }

    // Check permissions
    const isAuthor = issue.authorId === actorId;
    if (!isAuthor && !isAdmin) {
      throw new ForbiddenError('Only the author or admins can update this issue');
    }

    // Build update query
    const updates: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    const trackChanges: Array<{ action: string; oldValue: string; newValue: string }> = [];

    if (request.title !== undefined && request.title !== issue.title) {
      updates.push(`title = $${paramIndex++}`);
      params.push(request.title);
    }

    if (request.description !== undefined && request.description !== issue.description) {
      updates.push(`description = $${paramIndex++}`);
      params.push(request.description);
    }

    if (request.type !== undefined && request.type !== issue.type) {
      updates.push(`type = $${paramIndex++}`);
      params.push(request.type);
      trackChanges.push({
        action: 'type_changed',
        oldValue: IssueType[issue.type],
        newValue: IssueType[request.type],
      });
    }

    if (request.status !== undefined && request.status !== issue.status) {
      if (!isAdmin && request.status !== IssueStatus.CLOSED) {
        throw new ForbiddenError('Only admins can change status');
      }
      updates.push(`status = $${paramIndex++}`);
      params.push(request.status);
      trackChanges.push({
        action: 'status_changed',
        oldValue: IssueStatus[issue.status],
        newValue: IssueStatus[request.status],
      });

      // Handle resolved status
      if (request.status === IssueStatus.RESOLVED || request.status === IssueStatus.CLOSED) {
        updates.push(`resolved_at = NOW(), resolved_by = $${paramIndex++}`);
        params.push(actorId);
      }
    }

    if (request.priority !== undefined && request.priority !== issue.priority && isAdmin) {
      updates.push(`priority = $${paramIndex++}`);
      params.push(request.priority);
      trackChanges.push({
        action: 'priority_changed',
        oldValue: IssuePriority[issue.priority],
        newValue: IssuePriority[request.priority],
      });
    }

    if (request.assigneeId !== undefined && isAdmin) {
      updates.push(`assignee_id = $${paramIndex++}`);
      params.push(request.assigneeId);
      trackChanges.push({
        action: 'assignee_changed',
        oldValue: issue.assigneeId || 'none',
        newValue: request.assigneeId || 'none',
      });
    }

    if (request.labelIds !== undefined && isAdmin) {
      updates.push(`label_ids = $${paramIndex++}`);
      params.push(request.labelIds);
    }

    if (request.isPinned !== undefined && isAdmin) {
      updates.push(`is_pinned = $${paramIndex++}`);
      params.push(request.isPinned);
    }

    if (request.isLocked !== undefined && isAdmin) {
      updates.push(`is_locked = $${paramIndex++}`);
      params.push(request.isLocked);
    }

    if (request.isPublic !== undefined && isAdmin) {
      updates.push(`is_public = $${paramIndex++}`);
      params.push(request.isPublic);
    }

    if (request.resolutionNote !== undefined && isAdmin) {
      updates.push(`resolution_note = $${paramIndex++}`);
      params.push(request.resolutionNote);
    }

    if (request.duplicateOfId !== undefined && isAdmin) {
      updates.push(`duplicate_of_id = $${paramIndex++}, status = $${paramIndex++}`);
      params.push(request.duplicateOfId, IssueStatus.DUPLICATE);
      trackChanges.push({
        action: 'marked_duplicate',
        oldValue: '',
        newValue: request.duplicateOfId,
      });
    }

    if (request.relatedIssueIds !== undefined) {
      updates.push(`related_issue_ids = $${paramIndex++}`);
      params.push(request.relatedIssueIds);
    }

    if (updates.length === 0) {
      return issue;
    }

    updates.push('updated_at = NOW()');
    params.push(issue.id);

    await query(
      `UPDATE issues SET ${updates.join(', ')} WHERE id = $${paramIndex}`,
      params
    );

    // Log status changes
    for (const change of trackChanges) {
      await query(
        `INSERT INTO issue_status_history (issue_id, actor_id, action, old_value, new_value)
         VALUES ($1, $2, $3, $4, $5)`,
        [issue.id, actorId, change.action, change.oldValue, change.newValue]
      );
    }

    log.info({ issueId: issue.id, actorId, changes: trackChanges }, 'Issue updated');

    return (await this.getIssueById(issue.id))!;
  },

  async incrementViewCount(issueId: string): Promise<void> {
    await query('UPDATE issues SET view_count = view_count + 1 WHERE id = $1', [issueId]);
  },

  // ============================================
  // VOTING
  // ============================================

  async vote(issueId: string, userId: string): Promise<{ voted: boolean; voteCount: number }> {
    const issue = await queryOne<{ id: string; vote_count: number }>(
      'SELECT id, vote_count FROM issues WHERE id = $1',
      [issueId]
    );

    if (!issue) {
      throw new NotFoundError('Issue not found');
    }

    // Check if already voted
    const existing = await queryOne<{ user_id: string }>(
      'SELECT user_id FROM issue_votes WHERE issue_id = $1 AND user_id = $2',
      [issueId, userId]
    );

    if (existing) {
      // Remove vote
      await query('DELETE FROM issue_votes WHERE issue_id = $1 AND user_id = $2', [issueId, userId]);
      return { voted: false, voteCount: issue.vote_count - 1 };
    } else {
      // Add vote
      await query('INSERT INTO issue_votes (issue_id, user_id) VALUES ($1, $2)', [issueId, userId]);
      return { voted: true, voteCount: issue.vote_count + 1 };
    }
  },

  // ============================================
  // SUBSCRIPTIONS
  // ============================================

  async subscribe(
    issueId: string,
    userId: string
  ): Promise<{ subscribed: boolean; subscriberCount: number }> {
    const issue = await queryOne<{ id: string; subscriber_count: number }>(
      'SELECT id, subscriber_count FROM issues WHERE id = $1',
      [issueId]
    );

    if (!issue) {
      throw new NotFoundError('Issue not found');
    }

    const existing = await queryOne<{ user_id: string }>(
      'SELECT user_id FROM issue_subscribers WHERE issue_id = $1 AND user_id = $2',
      [issueId, userId]
    );

    if (existing) {
      // Unsubscribe
      await query('DELETE FROM issue_subscribers WHERE issue_id = $1 AND user_id = $2', [
        issueId,
        userId,
      ]);
      return { subscribed: false, subscriberCount: issue.subscriber_count - 1 };
    } else {
      // Subscribe
      await query('INSERT INTO issue_subscribers (issue_id, user_id) VALUES ($1, $2)', [
        issueId,
        userId,
      ]);
      return { subscribed: true, subscriberCount: issue.subscriber_count + 1 };
    }
  },

  // ============================================
  // COMMENTS
  // ============================================

  async createComment(
    issueId: string,
    authorId: string,
    content: string,
    parentId?: string,
    isStaff: boolean = false
  ): Promise<IssueComment> {
    const issue = await queryOne<{ id: string; is_locked: boolean }>(
      'SELECT id, is_locked FROM issues WHERE id = $1',
      [issueId]
    );

    if (!issue) {
      throw new NotFoundError('Issue not found');
    }

    if (issue.is_locked && !isStaff) {
      throw new ForbiddenError('This issue is locked');
    }

    if (!content || content.length < 1 || content.length > 10000) {
      throw new ValidationError('Comment must be between 1 and 10,000 characters');
    }

    if (parentId) {
      const parent = await queryOne<{ id: string }>(
        'SELECT id FROM issue_comments WHERE id = $1 AND issue_id = $2',
        [parentId, issueId]
      );
      if (!parent) {
        throw new NotFoundError('Parent comment not found');
      }
    }

    const commentId = `cmt_${crypto.randomBytes(12).toString('hex')}`;

    const row = await queryOne<{ id: string; created_at: Date; updated_at: Date }>(
      `INSERT INTO issue_comments (id, issue_id, author_id, parent_id, content, is_staff_reply)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, created_at, updated_at`,
      [commentId, issueId, authorId, parentId, content, isStaff]
    );

    // Get author info
    const author = await queryOne<{
      username: string;
      display_name: string | null;
      avatar_url: string | null;
      roles: string | null;
    }>('SELECT username, display_name, avatar_url, roles FROM users WHERE id = $1', [authorId]);

    log.info({ issueId, commentId, authorId }, 'Comment created');

    return {
      id: row!.id,
      issueId,
      authorId,
      authorUsername: author?.username,
      authorDisplayName: author?.display_name ?? undefined,
      authorAvatarUrl: author?.avatar_url ?? undefined,
      authorRoles: author?.roles ? JSON.parse(author.roles) : undefined,
      parentId,
      content,
      isStaffReply: isStaff,
      isSolution: false,
      isHidden: false,
      editCount: 0,
      createdAt: row!.created_at,
      updatedAt: row!.updated_at,
    };
  },

  async getComments(
    issueId: string,
    options: { limit?: number; offset?: number } = {}
  ): Promise<{ comments: IssueComment[]; total: number }> {
    const { limit = 50, offset = 0 } = options;

    const countResult = await queryOne<{ count: string }>(
      'SELECT COUNT(*) as count FROM issue_comments WHERE issue_id = $1 AND is_hidden = FALSE',
      [issueId]
    );
    const total = parseInt(countResult?.count || '0', 10);

    const rows = await queryAll<{
      id: string;
      issue_id: string;
      author_id: string;
      username: string;
      display_name: string | null;
      avatar_url: string | null;
      roles: string | null;
      parent_id: string | null;
      content: string;
      is_staff_reply: boolean;
      is_solution: boolean;
      is_hidden: boolean;
      edit_count: number;
      last_edited_at: Date | null;
      created_at: Date;
      updated_at: Date;
    }>(
      `SELECT c.*, u.username, u.display_name, u.avatar_url, u.roles
       FROM issue_comments c
       LEFT JOIN users u ON u.id = c.author_id
       WHERE c.issue_id = $1 AND c.is_hidden = FALSE
       ORDER BY c.is_solution DESC, c.created_at ASC
       LIMIT $2 OFFSET $3`,
      [issueId, limit, offset]
    );

    const comments: IssueComment[] = rows.map((r) => ({
      id: r.id,
      issueId: r.issue_id,
      authorId: r.author_id,
      authorUsername: r.username,
      authorDisplayName: r.display_name ?? undefined,
      authorAvatarUrl: r.avatar_url ?? undefined,
      authorRoles: r.roles ? JSON.parse(r.roles) : undefined,
      parentId: r.parent_id ?? undefined,
      content: r.content,
      isStaffReply: r.is_staff_reply,
      isSolution: r.is_solution,
      isHidden: r.is_hidden,
      editCount: r.edit_count,
      lastEditedAt: r.last_edited_at ?? undefined,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    }));

    return { comments, total };
  },

  async markCommentAsSolution(commentId: string, issueId: string, actorId: string): Promise<void> {
    // Clear existing solution
    await query('UPDATE issue_comments SET is_solution = FALSE WHERE issue_id = $1', [issueId]);

    // Set new solution
    await query('UPDATE issue_comments SET is_solution = TRUE WHERE id = $1', [commentId]);

    await query(
      `INSERT INTO issue_status_history (issue_id, actor_id, action, new_value)
       VALUES ($1, $2, 'solution_marked', $3)`,
      [issueId, actorId, commentId]
    );
  },

  // ============================================
  // DEV UPDATES
  // ============================================

  async createDevUpdate(
    authorId: string,
    request: {
      title: string;
      content: string;
      type: UpdateType;
      relatedIssueIds?: string[];
      isPublished?: boolean;
    }
  ): Promise<DevUpdate> {
    const { title, content, type, relatedIssueIds = [], isPublished = false } = request;

    const updateId = `upd_${crypto.randomBytes(12).toString('hex')}`;

    const row = await queryOne<{
      id: string;
      published_at: Date | null;
      created_at: Date;
      updated_at: Date;
    }>(
      `INSERT INTO dev_updates (id, title, content, type, author_id, related_issue_ids, is_published, published_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id, published_at, created_at, updated_at`,
      [updateId, title, content, type, authorId, relatedIssueIds, isPublished, isPublished ? new Date() : null]
    );

    const author = await queryOne<{ username: string; display_name: string | null }>(
      'SELECT username, display_name FROM users WHERE id = $1',
      [authorId]
    );

    return {
      id: row!.id,
      title,
      content,
      type,
      authorId,
      authorUsername: author?.username,
      authorDisplayName: author?.display_name ?? undefined,
      relatedIssueIds,
      isPublished,
      publishedAt: row!.published_at ?? undefined,
      viewCount: 0,
      createdAt: row!.created_at,
      updatedAt: row!.updated_at,
    };
  },

  async listDevUpdates(
    options: { type?: UpdateType; limit?: number; offset?: number } = {}
  ): Promise<{ updates: DevUpdate[]; total: number }> {
    const { type, limit = 20, offset = 0 } = options;

    const conditions = ['is_published = TRUE'];
    const params: any[] = [];
    let paramIndex = 1;

    if (type !== undefined) {
      conditions.push(`type = $${paramIndex++}`);
      params.push(type);
    }

    const whereClause = conditions.join(' AND ');

    const countResult = await queryOne<{ count: string }>(
      `SELECT COUNT(*) as count FROM dev_updates WHERE ${whereClause}`,
      params
    );
    const total = parseInt(countResult?.count || '0', 10);

    const rows = await queryAll<{
      id: string;
      title: string;
      content: string;
      type: number;
      author_id: string;
      username: string;
      display_name: string | null;
      related_issue_ids: string[];
      is_published: boolean;
      published_at: Date | null;
      view_count: number;
      created_at: Date;
      updated_at: Date;
    }>(
      `SELECT d.*, u.username, u.display_name
       FROM dev_updates d
       LEFT JOIN users u ON u.id = d.author_id
       WHERE ${whereClause}
       ORDER BY d.published_at DESC
       LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      [...params, limit, offset]
    );

    const updates: DevUpdate[] = rows.map((r) => ({
      id: r.id,
      title: r.title,
      content: r.content,
      type: r.type as UpdateType,
      authorId: r.author_id,
      authorUsername: r.username,
      authorDisplayName: r.display_name ?? undefined,
      relatedIssueIds: r.related_issue_ids || [],
      isPublished: r.is_published,
      publishedAt: r.published_at ?? undefined,
      viewCount: r.view_count,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    }));

    return { updates, total };
  },

  // ============================================
  // ROADMAP
  // ============================================

  async listRoadmapItems(
    options: { status?: RoadmapStatus; quarter?: string; userId?: string } = {}
  ): Promise<RoadmapItem[]> {
    const { status, quarter, userId } = options;

    const conditions = ['is_public = TRUE'];
    const params: any[] = [];
    let paramIndex = 1;

    if (status !== undefined) {
      conditions.push(`status = $${paramIndex++}`);
      params.push(status);
    }

    if (quarter) {
      conditions.push(`quarter = $${paramIndex++}`);
      params.push(quarter);
    }

    const userJoins = userId
      ? `LEFT JOIN roadmap_votes rv ON rv.roadmap_id = r.id AND rv.user_id = '${userId}'`
      : '';
    const userSelects = userId ? ', (rv.user_id IS NOT NULL) as has_voted' : ', NULL as has_voted';

    const rows = await queryAll<{
      id: string;
      title: string;
      description: string | null;
      status: number;
      quarter: string | null;
      category: string | null;
      progress: number;
      related_issue_ids: string[];
      vote_count: number;
      display_order: number;
      is_public: boolean;
      started_at: Date | null;
      completed_at: Date | null;
      created_at: Date;
      updated_at: Date;
      has_voted: boolean | null;
    }>(
      `SELECT r.* ${userSelects}
       FROM roadmap_items r
       ${userJoins}
       WHERE ${conditions.join(' AND ')}
       ORDER BY r.display_order, r.created_at`,
      params
    );

    return rows.map((r) => ({
      id: r.id,
      title: r.title,
      description: r.description ?? undefined,
      status: r.status as RoadmapStatus,
      quarter: r.quarter ?? undefined,
      category: r.category ?? undefined,
      progress: r.progress,
      relatedIssueIds: r.related_issue_ids || [],
      voteCount: r.vote_count,
      displayOrder: r.display_order,
      isPublic: r.is_public,
      startedAt: r.started_at ?? undefined,
      completedAt: r.completed_at ?? undefined,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
      hasVoted: r.has_voted ?? undefined,
    }));
  },

  async voteRoadmapItem(
    roadmapId: string,
    userId: string
  ): Promise<{ voted: boolean; voteCount: number }> {
    const item = await queryOne<{ id: string; vote_count: number }>(
      'SELECT id, vote_count FROM roadmap_items WHERE id = $1',
      [roadmapId]
    );

    if (!item) {
      throw new NotFoundError('Roadmap item not found');
    }

    const existing = await queryOne<{ user_id: string }>(
      'SELECT user_id FROM roadmap_votes WHERE roadmap_id = $1 AND user_id = $2',
      [roadmapId, userId]
    );

    if (existing) {
      await query('DELETE FROM roadmap_votes WHERE roadmap_id = $1 AND user_id = $2', [
        roadmapId,
        userId,
      ]);
      return { voted: false, voteCount: item.vote_count - 1 };
    } else {
      await query('INSERT INTO roadmap_votes (roadmap_id, user_id) VALUES ($1, $2)', [
        roadmapId,
        userId,
      ]);
      return { voted: true, voteCount: item.vote_count + 1 };
    }
  },

  // ============================================
  // STATISTICS
  // ============================================

  async getStats(): Promise<{
    totalIssues: number;
    openIssues: number;
    resolvedIssues: number;
    totalVotes: number;
    issuesByType: Record<string, number>;
    issuesByStatus: Record<string, number>;
  }> {
    const stats = await queryOne<{
      total: string;
      open: string;
      resolved: string;
    }>(
      `SELECT
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE status = 0) as open,
        COUNT(*) FILTER (WHERE status IN (3, 4)) as resolved
       FROM issues WHERE is_public = TRUE`
    );

    const voteCount = await queryOne<{ count: string }>('SELECT COUNT(*) as count FROM issue_votes');

    const byType = await queryAll<{ type: number; count: string }>(
      `SELECT type, COUNT(*) as count FROM issues WHERE is_public = TRUE GROUP BY type`
    );

    const byStatus = await queryAll<{ status: number; count: string }>(
      `SELECT status, COUNT(*) as count FROM issues WHERE is_public = TRUE GROUP BY status`
    );

    const typeMap: Record<string, number> = {};
    byType.forEach((r) => {
      typeMap[IssueType[r.type]] = parseInt(r.count, 10);
    });

    const statusMap: Record<string, number> = {};
    byStatus.forEach((r) => {
      statusMap[IssueStatus[r.status]] = parseInt(r.count, 10);
    });

    return {
      totalIssues: parseInt(stats?.total || '0', 10),
      openIssues: parseInt(stats?.open || '0', 10),
      resolvedIssues: parseInt(stats?.resolved || '0', 10),
      totalVotes: parseInt(voteCount?.count || '0', 10),
      issuesByType: typeMap,
      issuesByStatus: statusMap,
    };
  },
};
