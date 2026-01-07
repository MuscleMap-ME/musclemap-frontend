/**
 * Communities Service
 *
 * Manages self-organized communities with:
 * - Goal-based communities (weight loss, muscle gain)
 * - Interest-based communities (martial arts, running)
 * - Institution-based communities (military, police, fire)
 * - Leader hierarchy and moderation
 * - Events and meetups
 */

import crypto from 'crypto';
import { queryOne, queryAll, query } from '../../db/client';
import { ValidationError, NotFoundError, ForbiddenError } from '../../lib/errors';
import { loggers } from '../../lib/logger';

const log = loggers.core;

// Membership role levels
export enum CommunityRole {
  MEMBER = 0,
  MODERATOR = 1,
  ADMIN = 2,
  LEADER = 3,
}

// Community types
export type CommunityType = 'goal' | 'interest' | 'institution' | 'local' | 'challenge';

// Privacy levels
export type CommunityPrivacy = 'public' | 'private' | 'secret';

// Membership status
export type MembershipStatus = 'pending' | 'active' | 'suspended' | 'banned';

// Goal types
export type GoalType = 'weight_loss' | 'muscle_gain' | 'endurance' | 'flexibility' | 'strength' | 'general_fitness';

// Institution types
export type InstitutionType = 'military' | 'police' | 'fire' | 'medical' | 'education' | 'corporate';

// Interfaces
export interface Community {
  id: number;
  slug: string;
  name: string;
  tagline?: string;
  description?: string;
  communityType: CommunityType;
  goalType?: GoalType;
  institutionType?: InstitutionType;
  archetypeId?: number;
  privacy: CommunityPrivacy;
  iconEmoji: string;
  accentColor: string;
  bannerImageUrl?: string;
  logoImageUrl?: string;
  rules?: string;
  memberCount: number;
  postCount: number;
  isVerified: boolean;
  isActive: boolean;
  requiresApproval: boolean;
  allowMemberPosts: boolean;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  // User-specific fields
  isMember?: boolean;
  userRole?: CommunityRole;
  membershipStatus?: MembershipStatus;
}

export interface CommunityMember {
  userId: string;
  username: string;
  displayName?: string;
  avatarUrl?: string;
  role: CommunityRole;
  title?: string;
  status: MembershipStatus;
  joinedAt: Date;
  lastActiveAt?: Date;
  showInMemberList: boolean;
}

export interface CommunityInvite {
  id: string;
  communityId: number;
  inviterId: string;
  inviteeEmail?: string;
  inviteeUserId?: string;
  code: string;
  expiresAt: Date;
  usedAt?: Date;
  maxUses: number;
  useCount: number;
  createdAt: Date;
}

export interface CommunityEvent {
  id: string;
  communityId: number;
  virtualHangoutId?: number;
  creatorId: string;
  title: string;
  description?: string;
  eventType: 'meetup' | 'challenge' | 'workshop' | 'competition' | 'social';
  startsAt: Date;
  endsAt?: Date;
  timezone: string;
  locationName?: string;
  locationAddress?: string;
  isVirtual: boolean;
  virtualUrl?: string;
  maxParticipants?: number;
  participantCount: number;
  status: 'draft' | 'scheduled' | 'ongoing' | 'completed' | 'cancelled';
  createdAt: Date;
}

export interface CreateCommunityRequest {
  name: string;
  tagline?: string;
  description?: string;
  communityType: CommunityType;
  goalType?: GoalType;
  institutionType?: InstitutionType;
  archetypeId?: number;
  privacy?: CommunityPrivacy;
  iconEmoji?: string;
  accentColor?: string;
  rules?: string;
  requiresApproval?: boolean;
  allowMemberPosts?: boolean;
  createdBy: string;
}

// Generate URL-safe slug
function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 50);
}

// Service implementation
export const communitiesService = {
  /**
   * Create a new community
   */
  async create(request: CreateCommunityRequest): Promise<Community> {
    const {
      name,
      tagline,
      description,
      communityType,
      goalType,
      institutionType,
      archetypeId,
      privacy = 'public',
      iconEmoji = '👥',
      accentColor = '#3B82F6',
      rules,
      requiresApproval = false,
      allowMemberPosts = true,
      createdBy,
    } = request;

    // Validate name
    if (!name || name.length < 3 || name.length > 100) {
      throw new ValidationError('Community name must be between 3 and 100 characters');
    }

    // Generate unique slug
    let slug = generateSlug(name);
    let slugSuffix = 0;
    while (true) {
      const existing = await queryOne<{ id: number }>(
        'SELECT id FROM communities WHERE slug = $1',
        [slugSuffix > 0 ? `${slug}-${slugSuffix}` : slug]
      );
      if (!existing) {
        if (slugSuffix > 0) slug = `${slug}-${slugSuffix}`;
        break;
      }
      slugSuffix++;
      if (slugSuffix > 100) {
        throw new ValidationError('Unable to generate unique slug');
      }
    }

    // Create community
    const row = await queryOne<{
      id: number;
      created_at: Date;
      updated_at: Date;
    }>(
      `INSERT INTO communities (
        slug, name, tagline, description, community_type, goal_type, institution_type,
        archetype_id, privacy, icon_emoji, accent_color, rules,
        requires_approval, allow_member_posts, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
      RETURNING id, created_at, updated_at`,
      [
        slug, name, tagline, description, communityType, goalType, institutionType,
        archetypeId, privacy, iconEmoji, accentColor, rules,
        requiresApproval, allowMemberPosts, createdBy
      ]
    );

    // Auto-add creator as leader
    await query(
      `INSERT INTO community_memberships (community_id, user_id, role_level, status, title)
       VALUES ($1, $2, $3, 'active', 'Founder')`,
      [row!.id, createdBy, CommunityRole.LEADER]
    );

    log.info({ communityId: row!.id, name, createdBy }, 'Community created');

    return {
      id: row!.id,
      slug,
      name,
      tagline,
      description,
      communityType,
      goalType,
      institutionType,
      archetypeId,
      privacy,
      iconEmoji,
      accentColor,
      rules,
      memberCount: 1,
      postCount: 0,
      isVerified: false,
      isActive: true,
      requiresApproval,
      allowMemberPosts,
      createdBy,
      createdAt: row!.created_at,
      updatedAt: row!.updated_at,
      isMember: true,
      userRole: CommunityRole.LEADER,
      membershipStatus: 'active',
    };
  },

  /**
   * Get community by ID or slug
   */
  async getById(idOrSlug: number | string, userId?: string): Promise<Community | null> {
    const isNumeric = typeof idOrSlug === 'number' || /^\d+$/.test(String(idOrSlug));
    const whereClause = isNumeric ? 'c.id = $1' : 'c.slug = $1';

    const userJoin = userId
      ? `LEFT JOIN community_memberships cm ON cm.community_id = c.id AND cm.user_id = '${userId}'`
      : '';
    const userSelect = userId
      ? ', cm.role_level as user_role, (cm.user_id IS NOT NULL) as is_member, cm.status as membership_status'
      : ', NULL as user_role, NULL as is_member, NULL as membership_status';

    const row = await queryOne<{
      id: number;
      slug: string;
      name: string;
      tagline: string | null;
      description: string | null;
      community_type: string;
      goal_type: string | null;
      institution_type: string | null;
      archetype_id: number | null;
      privacy: string;
      icon_emoji: string;
      accent_color: string;
      banner_image_url: string | null;
      logo_image_url: string | null;
      rules: string | null;
      member_count: number;
      post_count: number;
      is_verified: boolean;
      is_active: boolean;
      requires_approval: boolean;
      allow_member_posts: boolean;
      created_by: string;
      created_at: Date;
      updated_at: Date;
      user_role: number | null;
      is_member: boolean | null;
      membership_status: string | null;
    }>(
      `SELECT
        c.id, c.slug, c.name, c.tagline, c.description, c.community_type,
        c.goal_type, c.institution_type, c.archetype_id, c.privacy,
        c.icon_emoji, c.accent_color, c.banner_image_url, c.logo_image_url,
        c.rules, c.member_count, c.post_count, c.is_verified, c.is_active,
        c.requires_approval, c.allow_member_posts, c.created_by,
        c.created_at, c.updated_at
        ${userSelect}
       FROM communities c
       ${userJoin}
       WHERE ${whereClause}`,
      [idOrSlug]
    );

    if (!row) return null;

    // Check visibility
    if (row.privacy === 'secret' && !row.is_member) {
      return null;
    }

    return {
      id: row.id,
      slug: row.slug,
      name: row.name,
      tagline: row.tagline ?? undefined,
      description: row.description ?? undefined,
      communityType: row.community_type as CommunityType,
      goalType: row.goal_type as GoalType | undefined,
      institutionType: row.institution_type as InstitutionType | undefined,
      archetypeId: row.archetype_id ?? undefined,
      privacy: row.privacy as CommunityPrivacy,
      iconEmoji: row.icon_emoji,
      accentColor: row.accent_color,
      bannerImageUrl: row.banner_image_url ?? undefined,
      logoImageUrl: row.logo_image_url ?? undefined,
      rules: row.rules ?? undefined,
      memberCount: row.member_count,
      postCount: row.post_count,
      isVerified: row.is_verified,
      isActive: row.is_active,
      requiresApproval: row.requires_approval,
      allowMemberPosts: row.allow_member_posts,
      createdBy: row.created_by,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      isMember: row.is_member ?? undefined,
      userRole: row.user_role as CommunityRole | undefined,
      membershipStatus: row.membership_status as MembershipStatus | undefined,
    };
  },

  /**
   * Search/list communities
   */
  async search(
    userId?: string,
    options: {
      query?: string;
      communityType?: CommunityType;
      goalType?: GoalType;
      institutionType?: InstitutionType;
      limit?: number;
      offset?: number;
    } = {}
  ): Promise<{ communities: Community[]; total: number }> {
    const { query: searchQuery, communityType, goalType, institutionType, limit = 20, offset = 0 } = options;

    const conditions: string[] = ['c.is_active = TRUE', "c.privacy != 'secret'"];
    const params: any[] = [];
    let paramIndex = 1;

    if (searchQuery) {
      conditions.push(`(c.name ILIKE $${paramIndex} OR c.tagline ILIKE $${paramIndex} OR c.description ILIKE $${paramIndex})`);
      params.push(`%${searchQuery}%`);
      paramIndex++;
    }

    if (communityType) {
      conditions.push(`c.community_type = $${paramIndex++}`);
      params.push(communityType);
    }

    if (goalType) {
      conditions.push(`c.goal_type = $${paramIndex++}`);
      params.push(goalType);
    }

    if (institutionType) {
      conditions.push(`c.institution_type = $${paramIndex++}`);
      params.push(institutionType);
    }

    const whereClause = conditions.join(' AND ');

    const userJoin = userId
      ? `LEFT JOIN community_memberships cm ON cm.community_id = c.id AND cm.user_id = '${userId}'`
      : '';
    const userSelect = userId
      ? ', cm.role_level as user_role, (cm.user_id IS NOT NULL) as is_member, cm.status as membership_status'
      : ', NULL as user_role, NULL as is_member, NULL as membership_status';

    const rows = await queryAll<{
      id: number;
      slug: string;
      name: string;
      tagline: string | null;
      description: string | null;
      community_type: string;
      goal_type: string | null;
      institution_type: string | null;
      archetype_id: number | null;
      privacy: string;
      icon_emoji: string;
      accent_color: string;
      banner_image_url: string | null;
      logo_image_url: string | null;
      member_count: number;
      post_count: number;
      is_verified: boolean;
      is_active: boolean;
      requires_approval: boolean;
      allow_member_posts: boolean;
      created_by: string;
      created_at: Date;
      updated_at: Date;
      user_role: number | null;
      is_member: boolean | null;
      membership_status: string | null;
    }>(
      `SELECT
        c.id, c.slug, c.name, c.tagline, c.description, c.community_type,
        c.goal_type, c.institution_type, c.archetype_id, c.privacy,
        c.icon_emoji, c.accent_color, c.banner_image_url, c.logo_image_url,
        c.member_count, c.post_count, c.is_verified, c.is_active,
        c.requires_approval, c.allow_member_posts, c.created_by,
        c.created_at, c.updated_at
        ${userSelect}
       FROM communities c
       ${userJoin}
       WHERE ${whereClause}
       ORDER BY c.member_count DESC, c.name
       LIMIT $${paramIndex++} OFFSET $${paramIndex++}`,
      [...params, limit, offset]
    );

    const countResult = await queryOne<{ count: string }>(
      `SELECT COUNT(*) as count FROM communities c WHERE ${whereClause}`,
      params
    );

    return {
      communities: rows.map(r => ({
        id: r.id,
        slug: r.slug,
        name: r.name,
        tagline: r.tagline ?? undefined,
        description: r.description ?? undefined,
        communityType: r.community_type as CommunityType,
        goalType: r.goal_type as GoalType | undefined,
        institutionType: r.institution_type as InstitutionType | undefined,
        archetypeId: r.archetype_id ?? undefined,
        privacy: r.privacy as CommunityPrivacy,
        iconEmoji: r.icon_emoji,
        accentColor: r.accent_color,
        bannerImageUrl: r.banner_image_url ?? undefined,
        logoImageUrl: r.logo_image_url ?? undefined,
        memberCount: r.member_count,
        postCount: r.post_count,
        isVerified: r.is_verified,
        isActive: r.is_active,
        requiresApproval: r.requires_approval,
        allowMemberPosts: r.allow_member_posts,
        createdBy: r.created_by,
        createdAt: r.created_at,
        updatedAt: r.updated_at,
        isMember: r.is_member ?? undefined,
        userRole: r.user_role as CommunityRole | undefined,
        membershipStatus: r.membership_status as MembershipStatus | undefined,
      })),
      total: parseInt(countResult?.count || '0', 10),
    };
  },

  /**
   * Join a community
   */
  async join(communityId: number, userId: string): Promise<{ status: MembershipStatus }> {
    const community = await queryOne<{
      id: number;
      privacy: string;
      requires_approval: boolean;
      is_active: boolean;
    }>(
      'SELECT id, privacy, requires_approval, is_active FROM communities WHERE id = $1',
      [communityId]
    );

    if (!community) {
      throw new NotFoundError('Community not found');
    }

    if (!community.is_active) {
      throw new ValidationError('Community is not active');
    }

    if (community.privacy === 'secret') {
      throw new ForbiddenError('Cannot join a secret community without invitation');
    }

    // Check existing membership
    const existing = await queryOne<{ status: string }>(
      'SELECT status FROM community_memberships WHERE community_id = $1 AND user_id = $2',
      [communityId, userId]
    );

    if (existing) {
      if (existing.status === 'active') {
        throw new ValidationError('Already a member of this community');
      }
      if (existing.status === 'banned') {
        throw new ForbiddenError('You are banned from this community');
      }
      if (existing.status === 'pending') {
        throw new ValidationError('Your membership is pending approval');
      }
    }

    const status: MembershipStatus = community.requires_approval || community.privacy === 'private'
      ? 'pending'
      : 'active';

    await query(
      `INSERT INTO community_memberships (community_id, user_id, role_level, status)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (community_id, user_id) DO UPDATE SET status = $4`,
      [communityId, userId, CommunityRole.MEMBER, status]
    );

    log.info({ communityId, userId, status }, 'User joined community');

    return { status };
  },

  /**
   * Leave a community
   */
  async leave(communityId: number, userId: string): Promise<void> {
    const membership = await queryOne<{ role_level: number }>(
      'SELECT role_level FROM community_memberships WHERE community_id = $1 AND user_id = $2',
      [communityId, userId]
    );

    if (!membership) {
      throw new NotFoundError('Not a member of this community');
    }

    if (membership.role_level === CommunityRole.LEADER) {
      // Check if there are other leaders
      const otherLeaders = await queryOne<{ count: string }>(
        `SELECT COUNT(*) as count FROM community_memberships
         WHERE community_id = $1 AND role_level = $2 AND user_id != $3`,
        [communityId, CommunityRole.LEADER, userId]
      );

      if (parseInt(otherLeaders?.count || '0', 10) === 0) {
        throw new ValidationError('Cannot leave as the only leader. Transfer leadership first.');
      }
    }

    await query(
      'DELETE FROM community_memberships WHERE community_id = $1 AND user_id = $2',
      [communityId, userId]
    );

    log.info({ communityId, userId }, 'User left community');
  },

  /**
   * Get community members
   */
  async getMembers(
    communityId: number,
    options: { limit?: number; offset?: number; status?: MembershipStatus; visibleOnly?: boolean } = {}
  ): Promise<{ members: CommunityMember[]; total: number }> {
    const { limit = 50, offset = 0, status = 'active', visibleOnly = true } = options;

    const conditions: string[] = ['cm.community_id = $1'];
    const params: any[] = [communityId];
    let paramIndex = 2;

    if (status) {
      conditions.push(`cm.status = $${paramIndex++}`);
      params.push(status);
    }

    if (visibleOnly) {
      conditions.push('cm.show_in_member_list = TRUE');
    }

    const whereClause = conditions.join(' AND ');

    const rows = await queryAll<{
      user_id: string;
      username: string;
      display_name: string | null;
      avatar_url: string | null;
      role_level: number;
      title: string | null;
      status: string;
      joined_at: Date;
      last_active_at: Date | null;
      show_in_member_list: boolean;
    }>(
      `SELECT
        cm.user_id, u.username, u.display_name, u.avatar_url,
        cm.role_level, cm.title, cm.status, cm.joined_at,
        cm.last_active_at, cm.show_in_member_list
       FROM community_memberships cm
       JOIN users u ON u.id = cm.user_id
       WHERE ${whereClause}
       ORDER BY cm.role_level DESC, cm.joined_at
       LIMIT $${paramIndex++} OFFSET $${paramIndex++}`,
      [...params, limit, offset]
    );

    const countResult = await queryOne<{ count: string }>(
      `SELECT COUNT(*) as count FROM community_memberships cm WHERE ${whereClause}`,
      params
    );

    return {
      members: rows.map(r => ({
        userId: r.user_id,
        username: r.username,
        displayName: r.display_name ?? undefined,
        avatarUrl: r.avatar_url ?? undefined,
        role: r.role_level as CommunityRole,
        title: r.title ?? undefined,
        status: r.status as MembershipStatus,
        joinedAt: r.joined_at,
        lastActiveAt: r.last_active_at ?? undefined,
        showInMemberList: r.show_in_member_list,
      })),
      total: parseInt(countResult?.count || '0', 10),
    };
  },

  /**
   * Get user's communities
   */
  async getUserCommunities(
    userId: string,
    options: { limit?: number; offset?: number } = {}
  ): Promise<{ communities: Community[]; total: number }> {
    const { limit = 50, offset = 0 } = options;

    const rows = await queryAll<{
      id: number;
      slug: string;
      name: string;
      tagline: string | null;
      community_type: string;
      icon_emoji: string;
      accent_color: string;
      member_count: number;
      is_verified: boolean;
      user_role: number;
      membership_status: string;
      created_at: Date;
    }>(
      `SELECT
        c.id, c.slug, c.name, c.tagline, c.community_type,
        c.icon_emoji, c.accent_color, c.member_count, c.is_verified,
        cm.role_level as user_role, cm.status as membership_status, c.created_at
       FROM community_memberships cm
       JOIN communities c ON c.id = cm.community_id
       WHERE cm.user_id = $1 AND c.is_active = TRUE
       ORDER BY cm.last_active_at DESC NULLS LAST
       LIMIT $2 OFFSET $3`,
      [userId, limit, offset]
    );

    const countResult = await queryOne<{ count: string }>(
      `SELECT COUNT(*) as count FROM community_memberships cm
       JOIN communities c ON c.id = cm.community_id
       WHERE cm.user_id = $1 AND c.is_active = TRUE`,
      [userId]
    );

    return {
      communities: rows.map(r => ({
        id: r.id,
        slug: r.slug,
        name: r.name,
        tagline: r.tagline ?? undefined,
        communityType: r.community_type as CommunityType,
        iconEmoji: r.icon_emoji,
        accentColor: r.accent_color,
        memberCount: r.member_count,
        isVerified: r.is_verified,
        isMember: true,
        userRole: r.user_role as CommunityRole,
        membershipStatus: r.membership_status as MembershipStatus,
        createdAt: r.created_at,
        // Minimal fields for list view
        privacy: 'public' as CommunityPrivacy,
        postCount: 0,
        isActive: true,
        requiresApproval: false,
        allowMemberPosts: true,
        createdBy: '',
        updatedAt: r.created_at,
      })),
      total: parseInt(countResult?.count || '0', 10),
    };
  },

  /**
   * Update member role (moderator actions)
   */
  async updateMemberRole(
    communityId: number,
    targetUserId: string,
    newRole: CommunityRole,
    actorUserId: string
  ): Promise<void> {
    // Check actor's role
    const actorMembership = await queryOne<{ role_level: number }>(
      'SELECT role_level FROM community_memberships WHERE community_id = $1 AND user_id = $2',
      [communityId, actorUserId]
    );

    if (!actorMembership || actorMembership.role_level < CommunityRole.ADMIN) {
      throw new ForbiddenError('Insufficient permissions');
    }

    // Cannot promote to leader or demote leader unless you're a leader
    if (newRole === CommunityRole.LEADER && actorMembership.role_level !== CommunityRole.LEADER) {
      throw new ForbiddenError('Only leaders can promote to leader');
    }

    const targetMembership = await queryOne<{ role_level: number }>(
      'SELECT role_level FROM community_memberships WHERE community_id = $1 AND user_id = $2',
      [communityId, targetUserId]
    );

    if (!targetMembership) {
      throw new NotFoundError('User is not a member');
    }

    if (targetMembership.role_level === CommunityRole.LEADER && actorMembership.role_level !== CommunityRole.LEADER) {
      throw new ForbiddenError('Cannot modify leader role');
    }

    await query(
      'UPDATE community_memberships SET role_level = $1 WHERE community_id = $2 AND user_id = $3',
      [newRole, communityId, targetUserId]
    );

    log.info({ communityId, targetUserId, newRole, actorUserId }, 'Member role updated');
  },

  /**
   * Approve/reject pending membership
   */
  async handleMembershipRequest(
    communityId: number,
    targetUserId: string,
    approve: boolean,
    actorUserId: string
  ): Promise<void> {
    // Check actor's role
    const actorMembership = await queryOne<{ role_level: number }>(
      'SELECT role_level FROM community_memberships WHERE community_id = $1 AND user_id = $2',
      [communityId, actorUserId]
    );

    if (!actorMembership || actorMembership.role_level < CommunityRole.MODERATOR) {
      throw new ForbiddenError('Insufficient permissions');
    }

    const targetMembership = await queryOne<{ status: string }>(
      'SELECT status FROM community_memberships WHERE community_id = $1 AND user_id = $2',
      [communityId, targetUserId]
    );

    if (!targetMembership || targetMembership.status !== 'pending') {
      throw new NotFoundError('No pending membership request found');
    }

    if (approve) {
      await query(
        'UPDATE community_memberships SET status = $1 WHERE community_id = $2 AND user_id = $3',
        ['active', communityId, targetUserId]
      );
    } else {
      await query(
        'DELETE FROM community_memberships WHERE community_id = $1 AND user_id = $2',
        [communityId, targetUserId]
      );
    }

    log.info({ communityId, targetUserId, approved: approve, actorUserId }, 'Membership request handled');
  },

  /**
   * Create a community event
   */
  async createEvent(
    communityId: number,
    creatorId: string,
    eventData: {
      title: string;
      description?: string;
      eventType: CommunityEvent['eventType'];
      startsAt: Date;
      endsAt?: Date;
      timezone?: string;
      locationName?: string;
      locationAddress?: string;
      isVirtual?: boolean;
      virtualUrl?: string;
      maxParticipants?: number;
    }
  ): Promise<CommunityEvent> {
    // Verify creator is a member with sufficient role
    const membership = await queryOne<{ role_level: number }>(
      'SELECT role_level FROM community_memberships WHERE community_id = $1 AND user_id = $2',
      [communityId, creatorId]
    );

    if (!membership || membership.role_level < CommunityRole.MODERATOR) {
      throw new ForbiddenError('Insufficient permissions to create events');
    }

    const eventId = `ce_${crypto.randomBytes(12).toString('hex')}`;

    const row = await queryOne<{
      created_at: Date;
    }>(
      `INSERT INTO community_events (
        id, community_id, creator_id, title, description, event_type,
        starts_at, ends_at, timezone, location_name, location_address,
        is_virtual, virtual_url, max_participants, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, 'scheduled')
      RETURNING created_at`,
      [
        eventId, communityId, creatorId, eventData.title, eventData.description,
        eventData.eventType, eventData.startsAt, eventData.endsAt,
        eventData.timezone || 'UTC', eventData.locationName, eventData.locationAddress,
        eventData.isVirtual ?? false, eventData.virtualUrl, eventData.maxParticipants
      ]
    );

    log.info({ eventId, communityId, creatorId }, 'Community event created');

    return {
      id: eventId,
      communityId,
      creatorId,
      title: eventData.title,
      description: eventData.description,
      eventType: eventData.eventType,
      startsAt: eventData.startsAt,
      endsAt: eventData.endsAt,
      timezone: eventData.timezone || 'UTC',
      locationName: eventData.locationName,
      locationAddress: eventData.locationAddress,
      isVirtual: eventData.isVirtual ?? false,
      virtualUrl: eventData.virtualUrl,
      maxParticipants: eventData.maxParticipants,
      participantCount: 0,
      status: 'scheduled',
      createdAt: row!.created_at,
    };
  },

  /**
   * Get community events
   */
  async getEvents(
    communityId: number,
    options: { upcoming?: boolean; limit?: number; offset?: number } = {}
  ): Promise<CommunityEvent[]> {
    const { upcoming = true, limit = 20, offset = 0 } = options;

    let whereClause = 'community_id = $1';
    if (upcoming) {
      whereClause += " AND starts_at > NOW() AND status = 'scheduled'";
    }

    const rows = await queryAll<{
      id: string;
      community_id: number;
      virtual_hangout_id: number | null;
      creator_id: string;
      title: string;
      description: string | null;
      event_type: string;
      starts_at: Date;
      ends_at: Date | null;
      timezone: string;
      location_name: string | null;
      location_address: string | null;
      is_virtual: boolean;
      virtual_url: string | null;
      max_participants: number | null;
      participant_count: number;
      status: string;
      created_at: Date;
    }>(
      `SELECT
        id, community_id, virtual_hangout_id, creator_id, title, description,
        event_type, starts_at, ends_at, timezone, location_name, location_address,
        is_virtual, virtual_url, max_participants, participant_count, status, created_at
       FROM community_events
       WHERE ${whereClause}
       ORDER BY starts_at ${upcoming ? 'ASC' : 'DESC'}
       LIMIT $2 OFFSET $3`,
      [communityId, limit, offset]
    );

    return rows.map(r => ({
      id: r.id,
      communityId: r.community_id,
      virtualHangoutId: r.virtual_hangout_id ?? undefined,
      creatorId: r.creator_id,
      title: r.title,
      description: r.description ?? undefined,
      eventType: r.event_type as CommunityEvent['eventType'],
      startsAt: r.starts_at,
      endsAt: r.ends_at ?? undefined,
      timezone: r.timezone,
      locationName: r.location_name ?? undefined,
      locationAddress: r.location_address ?? undefined,
      isVirtual: r.is_virtual,
      virtualUrl: r.virtual_url ?? undefined,
      maxParticipants: r.max_participants ?? undefined,
      participantCount: r.participant_count,
      status: r.status as CommunityEvent['status'],
      createdAt: r.created_at,
    }));
  },
};
