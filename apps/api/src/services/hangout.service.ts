/**
 * Hangout Service
 *
 * Manages location-based community hubs:
 * - CRUD operations for hangouts
 * - Membership management
 * - Posts and discussions
 * - Activity feeds
 */

import crypto from 'crypto';
import { queryOne, queryAll, query, serializableTransaction } from '../db/client';
import { geoService } from './geo.service';
import { creditService, CreditReason, RefType } from '../modules/economy/credit.service';
import { ValidationError, NotFoundError, ForbiddenError } from '../lib/errors';
import { loggers } from '../lib/logger';

const log = loggers.core;

// Role levels
export enum HangoutRole {
  MEMBER = 0,
  MODERATOR = 1,
  ADMIN = 2,
  OWNER = 3,
}

interface CreateHangoutRequest {
  name: string;
  description?: string;
  typeId: number;
  lat: number;
  lng: number;
  address?: string;
  city?: string;
  countryCode?: string;
  radiusMeters?: number;
  coverImageUrl?: string;
  createdBy: string;
}

interface HangoutDetails {
  id: number;
  name: string;
  description?: string;
  typeId: number;
  typeName: string;
  typeSlug: string;
  location: { lat: number; lng: number };
  geohash: string;
  address?: string;
  city?: string;
  countryCode?: string;
  radiusMeters: number;
  coverImageUrl?: string;
  memberCount: number;
  postCount: number;
  isVerified: boolean;
  isActive: boolean;
  createdBy?: string;
  createdAt: Date;
  updatedAt: Date;
  userRole?: HangoutRole;
  isMember?: boolean;
}

interface CreatePostRequest {
  hangoutId: number;
  authorId: string;
  content: string;
  mediaUrls?: string[];
  contentLang?: string;
}

interface HangoutPost {
  id: string;
  hangoutId: number;
  authorId?: string;
  authorUsername?: string;
  authorDisplayName?: string;
  authorAvatarUrl?: string;
  content: string;
  contentLang: string;
  mediaUrls: string[];
  commentCount: number;
  likeCount: number;
  isPinned: boolean;
  isHidden: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export const hangoutService = {
  /**
   * Create a new hangout
   */
  async create(request: CreateHangoutRequest): Promise<HangoutDetails> {
    const {
      name,
      description,
      typeId,
      lat,
      lng,
      address,
      city,
      countryCode,
      radiusMeters = 500,
      coverImageUrl,
      createdBy,
    } = request;

    // Validate
    if (!name || name.length < 3 || name.length > 200) {
      throw new ValidationError('Name must be between 3 and 200 characters');
    }

    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      throw new ValidationError('Invalid coordinates');
    }

    // Verify type exists
    const hangoutType = await queryOne<{ id: number; name: string; slug: string }>(
      'SELECT id, name, slug FROM hangout_types WHERE id = $1',
      [typeId]
    );

    if (!hangoutType) {
      throw new ValidationError('Invalid hangout type');
    }

    // Generate geohash
    const geohash = geoService.encodeGeohash(lat, lng, 9);

    // Check if PostGIS is available
    const hasPostGIS = await queryOne<{ has: boolean }>(
      "SELECT EXISTS(SELECT 1 FROM pg_extension WHERE extname = 'postgis') as has"
    );

    let result: { id: number; created_at: Date; updated_at: Date };

    if (hasPostGIS?.has) {
      const row = await queryOne<{ id: number; created_at: Date; updated_at: Date }>(
        `INSERT INTO hangouts (
          name, description, type_id, location, geohash, address, city, country_code,
          radius_meters, cover_image_url, created_by
        ) VALUES (
          $1, $2, $3, ST_MakePoint($4, $5)::geography, $6, $7, $8, $9, $10, $11, $12
        ) RETURNING id, created_at, updated_at`,
        [name, description, typeId, lng, lat, geohash, address, city, countryCode, radiusMeters, coverImageUrl, createdBy]
      );
      result = row!;
    } else {
      const row = await queryOne<{ id: number; created_at: Date; updated_at: Date }>(
        `INSERT INTO hangouts (
          name, description, type_id, latitude, longitude, geohash, address, city, country_code,
          radius_meters, cover_image_url, created_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        RETURNING id, created_at, updated_at`,
        [name, description, typeId, lat, lng, geohash, address, city, countryCode, radiusMeters, coverImageUrl, createdBy]
      );
      result = row!;
    }

    // Auto-join creator as owner
    await query(
      'INSERT INTO hangout_memberships (hangout_id, user_id, role) VALUES ($1, $2, $3)',
      [result.id, createdBy, HangoutRole.OWNER]
    );

    log.info({ hangoutId: result.id, name, createdBy }, 'Hangout created');

    return {
      id: result.id,
      name,
      description,
      typeId,
      typeName: hangoutType.name,
      typeSlug: hangoutType.slug,
      location: { lat, lng },
      geohash,
      address,
      city,
      countryCode,
      radiusMeters,
      coverImageUrl,
      memberCount: 1,
      postCount: 0,
      isVerified: false,
      isActive: true,
      createdBy,
      createdAt: result.created_at,
      updatedAt: result.updated_at,
      userRole: HangoutRole.OWNER,
      isMember: true,
    };
  },

  /**
   * Get hangout by ID
   */
  async getById(hangoutId: number, userId?: string): Promise<HangoutDetails | null> {
    const userJoin = userId
      ? `LEFT JOIN hangout_memberships hm ON hm.hangout_id = h.id AND hm.user_id = '${userId}'`
      : '';
    const userSelect = userId ? ', hm.role as user_role, (hm.user_id IS NOT NULL) as is_member' : ', NULL as user_role, NULL as is_member';

    const row = await queryOne<{
      id: number;
      name: string;
      description: string | null;
      type_id: number;
      type_name: string;
      type_slug: string;
      lat: number;
      lng: number;
      geohash: string;
      address: string | null;
      city: string | null;
      country_code: string | null;
      radius_meters: number;
      cover_image_url: string | null;
      member_count: number;
      post_count: number;
      is_verified: boolean;
      is_active: boolean;
      created_by: string | null;
      created_at: Date;
      updated_at: Date;
      user_role: number | null;
      is_member: boolean | null;
    }>(
      `SELECT
        h.id, h.name, h.description, h.type_id, ht.name as type_name, ht.slug as type_slug,
        COALESCE(ST_Y(h.location::geometry), h.latitude) as lat,
        COALESCE(ST_X(h.location::geometry), h.longitude) as lng,
        h.geohash, h.address, h.city, h.country_code, h.radius_meters, h.cover_image_url,
        h.member_count, h.post_count, h.is_verified, h.is_active, h.created_by,
        h.created_at, h.updated_at
        ${userSelect}
      FROM hangouts h
      JOIN hangout_types ht ON ht.id = h.type_id
      ${userJoin}
      WHERE h.id = $1`,
      [hangoutId]
    );

    if (!row) return null;

    return {
      id: row.id,
      name: row.name,
      description: row.description ?? undefined,
      typeId: row.type_id,
      typeName: row.type_name,
      typeSlug: row.type_slug,
      location: { lat: row.lat, lng: row.lng },
      geohash: row.geohash,
      address: row.address ?? undefined,
      city: row.city ?? undefined,
      countryCode: row.country_code ?? undefined,
      radiusMeters: row.radius_meters,
      coverImageUrl: row.cover_image_url ?? undefined,
      memberCount: row.member_count,
      postCount: row.post_count,
      isVerified: row.is_verified,
      isActive: row.is_active,
      createdBy: row.created_by ?? undefined,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      userRole: row.user_role as HangoutRole | undefined,
      isMember: row.is_member ?? undefined,
    };
  },

  /**
   * Join a hangout
   */
  async join(hangoutId: number, userId: string): Promise<void> {
    // Check if hangout exists and is active
    const hangout = await queryOne<{ id: number; is_active: boolean }>(
      'SELECT id, is_active FROM hangouts WHERE id = $1',
      [hangoutId]
    );

    if (!hangout) {
      throw new NotFoundError('Hangout not found');
    }

    if (!hangout.is_active) {
      throw new ValidationError('Hangout is not active');
    }

    // Check if already a member
    const existing = await queryOne<{ user_id: string }>(
      'SELECT user_id FROM hangout_memberships WHERE hangout_id = $1 AND user_id = $2',
      [hangoutId, userId]
    );

    if (existing) {
      throw new ValidationError('Already a member of this hangout');
    }

    // Join
    await query(
      'INSERT INTO hangout_memberships (hangout_id, user_id, role) VALUES ($1, $2, $3)',
      [hangoutId, userId, HangoutRole.MEMBER]
    );

    log.info({ hangoutId, userId }, 'User joined hangout');
  },

  /**
   * Leave a hangout
   */
  async leave(hangoutId: number, userId: string): Promise<void> {
    // Check membership
    const membership = await queryOne<{ role: number }>(
      'SELECT role FROM hangout_memberships WHERE hangout_id = $1 AND user_id = $2',
      [hangoutId, userId]
    );

    if (!membership) {
      throw new NotFoundError('Not a member of this hangout');
    }

    if (membership.role === HangoutRole.OWNER) {
      throw new ValidationError('Owner cannot leave. Transfer ownership first.');
    }

    await query(
      'DELETE FROM hangout_memberships WHERE hangout_id = $1 AND user_id = $2',
      [hangoutId, userId]
    );

    log.info({ hangoutId, userId }, 'User left hangout');
  },

  /**
   * Get hangout members
   */
  async getMembers(
    hangoutId: number,
    options: { limit?: number; offset?: number } = {}
  ): Promise<{
    members: Array<{
      userId: string;
      username: string;
      displayName?: string;
      avatarUrl?: string;
      role: HangoutRole;
      joinedAt: Date;
    }>;
    total: number;
  }> {
    const { limit = 50, offset = 0 } = options;

    const members = await queryAll<{
      user_id: string;
      username: string;
      display_name: string | null;
      avatar_url: string | null;
      role: number;
      joined_at: Date;
    }>(
      `SELECT
        hm.user_id, u.username, u.display_name, u.avatar_url, hm.role, hm.joined_at
      FROM hangout_memberships hm
      JOIN users u ON u.id = hm.user_id
      WHERE hm.hangout_id = $1
      ORDER BY hm.role DESC, hm.joined_at
      LIMIT $2 OFFSET $3`,
      [hangoutId, limit, offset]
    );

    const countResult = await queryOne<{ count: string }>(
      'SELECT COUNT(*) as count FROM hangout_memberships WHERE hangout_id = $1',
      [hangoutId]
    );

    return {
      members: members.map((m) => ({
        userId: m.user_id,
        username: m.username,
        displayName: m.display_name ?? undefined,
        avatarUrl: m.avatar_url ?? undefined,
        role: m.role as HangoutRole,
        joinedAt: m.joined_at,
      })),
      total: parseInt(countResult?.count || '0', 10),
    };
  },

  /**
   * Create a post in a hangout
   * Costs 1 credit
   */
  async createPost(request: CreatePostRequest): Promise<HangoutPost> {
    const { hangoutId, authorId, content, mediaUrls = [], contentLang = 'en' } = request;

    if (!content || content.length < 1 || content.length > 10000) {
      throw new ValidationError('Content must be between 1 and 10,000 characters');
    }

    // Verify membership
    const membership = await queryOne<{ role: number }>(
      'SELECT role FROM hangout_memberships WHERE hangout_id = $1 AND user_id = $2',
      [hangoutId, authorId]
    );

    if (!membership) {
      throw new ForbiddenError('Must be a member to post');
    }

    // Charge 1 credit
    const postId = `hp_${crypto.randomBytes(12).toString('hex')}`;

    try {
      await creditService.spend(authorId, 1, CreditReason.POST_CREATED, RefType.POST, postId, `post:${postId}`);
    } catch (error: any) {
      if (error.message?.includes('Insufficient')) {
        throw new ValidationError('Insufficient credits to create post');
      }
      throw error;
    }

    // Create post
    const row = await queryOne<{
      id: string;
      created_at: Date;
      updated_at: Date;
    }>(
      `INSERT INTO hangout_posts (id, hangout_id, author_id, content, content_lang, media_urls, credit_entry_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, created_at, updated_at`,
      [postId, hangoutId, authorId, content, contentLang, JSON.stringify(mediaUrls), postId]
    );

    // Get author info
    const author = await queryOne<{
      username: string;
      display_name: string | null;
      avatar_url: string | null;
    }>('SELECT username, display_name, avatar_url FROM users WHERE id = $1', [authorId]);

    log.info({ hangoutId, postId, authorId }, 'Hangout post created');

    return {
      id: row!.id,
      hangoutId,
      authorId,
      authorUsername: author?.username,
      authorDisplayName: author?.display_name ?? undefined,
      authorAvatarUrl: author?.avatar_url ?? undefined,
      content,
      contentLang,
      mediaUrls,
      commentCount: 0,
      likeCount: 0,
      isPinned: false,
      isHidden: false,
      createdAt: row!.created_at,
      updatedAt: row!.updated_at,
    };
  },

  /**
   * Get posts from a hangout
   */
  async getPosts(
    hangoutId: number,
    options: { limit?: number; cursor?: string } = {}
  ): Promise<{ posts: HangoutPost[]; nextCursor?: string }> {
    const { limit = 20, cursor } = options;

    let createdBefore = new Date();
    let lastId = '';

    if (cursor) {
      try {
        const decoded = Buffer.from(cursor, 'base64url').toString();
        const [ts, id] = decoded.split(':');
        createdBefore = new Date(ts);
        lastId = id;
      } catch {
        // Invalid cursor
      }
    }

    const rows = await queryAll<{
      id: string;
      hangout_id: number;
      author_id: string | null;
      username: string | null;
      display_name: string | null;
      avatar_url: string | null;
      content: string;
      content_lang: string;
      media_urls: string;
      comment_count: number;
      like_count: number;
      is_pinned: boolean;
      is_hidden: boolean;
      created_at: Date;
      updated_at: Date;
    }>(
      `SELECT
        hp.id, hp.hangout_id, hp.author_id, u.username, u.display_name, u.avatar_url,
        hp.content, hp.content_lang, hp.media_urls, hp.comment_count, hp.like_count,
        hp.is_pinned, hp.is_hidden, hp.created_at, hp.updated_at
      FROM hangout_posts hp
      LEFT JOIN users u ON u.id = hp.author_id
      WHERE hp.hangout_id = $1 AND hp.is_hidden = FALSE
        AND (hp.created_at < $2 OR (hp.created_at = $2 AND hp.id < $3))
      ORDER BY hp.is_pinned DESC, hp.created_at DESC, hp.id DESC
      LIMIT $4`,
      [hangoutId, createdBefore.toISOString(), lastId || 'z', limit + 1]
    );

    const hasMore = rows.length > limit;
    const resultRows = hasMore ? rows.slice(0, limit) : rows;

    const posts: HangoutPost[] = resultRows.map((r) => ({
      id: r.id,
      hangoutId: r.hangout_id,
      authorId: r.author_id ?? undefined,
      authorUsername: r.username ?? undefined,
      authorDisplayName: r.display_name ?? undefined,
      authorAvatarUrl: r.avatar_url ?? undefined,
      content: r.content,
      contentLang: r.content_lang,
      mediaUrls: JSON.parse(r.media_urls || '[]'),
      commentCount: r.comment_count,
      likeCount: r.like_count,
      isPinned: r.is_pinned,
      isHidden: r.is_hidden,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    }));

    let nextCursor: string | undefined;
    if (hasMore && resultRows.length > 0) {
      const last = resultRows[resultRows.length - 1];
      nextCursor = Buffer.from(`${last.created_at.toISOString()}:${last.id}`).toString('base64url');
    }

    return { posts, nextCursor };
  },

  /**
   * Get user's hangout memberships
   */
  async getUserMemberships(
    userId: string,
    options: { limit?: number; offset?: number } = {}
  ): Promise<{
    hangouts: Array<{
      id: number;
      name: string;
      typeSlug: string;
      typeName: string;
      memberCount: number;
      role: HangoutRole;
      joinedAt: Date;
      coverImageUrl?: string;
    }>;
    total: number;
  }> {
    const { limit = 50, offset = 0 } = options;

    const rows = await queryAll<{
      id: number;
      name: string;
      type_slug: string;
      type_name: string;
      member_count: number;
      role: number;
      joined_at: Date;
      cover_image_url: string | null;
    }>(
      `SELECT
        h.id, h.name, ht.slug as type_slug, ht.name as type_name,
        h.member_count, hm.role, hm.joined_at, h.cover_image_url
      FROM hangout_memberships hm
      JOIN hangouts h ON h.id = hm.hangout_id
      JOIN hangout_types ht ON ht.id = h.type_id
      WHERE hm.user_id = $1 AND h.is_active = TRUE
      ORDER BY hm.joined_at DESC
      LIMIT $2 OFFSET $3`,
      [userId, limit, offset]
    );

    const countResult = await queryOne<{ count: string }>(
      `SELECT COUNT(*) as count FROM hangout_memberships hm
       JOIN hangouts h ON h.id = hm.hangout_id
       WHERE hm.user_id = $1 AND h.is_active = TRUE`,
      [userId]
    );

    return {
      hangouts: rows.map((r) => ({
        id: r.id,
        name: r.name,
        typeSlug: r.type_slug,
        typeName: r.type_name,
        memberCount: r.member_count,
        role: r.role as HangoutRole,
        joinedAt: r.joined_at,
        coverImageUrl: r.cover_image_url ?? undefined,
      })),
      total: parseInt(countResult?.count || '0', 10),
    };
  },
};
