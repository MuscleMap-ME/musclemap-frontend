/**
 * Social Graph Service
 *
 * Handles social connections between users:
 * - Follows (one-way)
 * - Friendships (mutual)
 * - Buddy matching (workout partners)
 */

import crypto from 'crypto';
import { queryOne, queryAll, query, transaction } from '../../db/client';
import { loggers } from '../../lib/logger';

const _log = loggers.core;

// ============================================
// TYPES
// ============================================

export interface Follow {
  id: string;
  followerId: string;
  followingId: string;
  createdAt: Date;
}

export interface FollowWithUser extends Follow {
  username: string;
  displayName?: string;
  avatarUrl?: string;
}

export interface Friendship {
  id: string;
  userAId: string;
  userBId: string;
  status: 'pending' | 'accepted' | 'declined' | 'blocked';
  initiatedBy: string;
  metAtHangoutId?: number;
  metAtCommunityId?: number;
  createdAt: Date;
  acceptedAt?: Date;
}

export interface FriendWithUser extends Friendship {
  friendId: string;
  username: string;
  displayName?: string;
  avatarUrl?: string;
}

export interface BuddyPreferences {
  userId: string;
  seekingBuddy: boolean;
  preferredGoals: string[];
  preferredArchetypes: string[];
  preferredExperienceLevels: string[];
  preferredSchedule: string[];
  preferredWorkoutTypes: string[];
  maxDistanceKm: number;
  preferSameHangout: boolean;
  preferSameCommunity: boolean;
  matchGender: boolean;
  matchAgeRange: boolean;
  minAge?: number;
  maxAge?: number;
  buddyBio?: string;
  visibleInBuddySearch: boolean;
}

export interface BuddyRequest {
  id: string;
  senderId: string;
  receiverId: string;
  status: 'pending' | 'accepted' | 'declined' | 'expired';
  message?: string;
  matchScore?: number;
  createdAt: Date;
  respondedAt?: Date;
  expiresAt: Date;
}

export interface BuddyMatch {
  userId: string;
  username: string;
  displayName?: string;
  avatarUrl?: string;
  matchScore: number;
  sharedGoals: string[];
  sharedArchetypes: string[];
  distance?: number;
}

export interface BuddyPair {
  id: string;
  userAId: string;
  userBId: string;
  workoutsTogether: number;
  lastWorkoutTogether?: Date;
  streakDays: number;
  status: 'active' | 'paused' | 'ended';
  createdAt: Date;
}

// ============================================
// SERVICE
// ============================================

export const socialService = {
  // ==========================================
  // FOLLOWS
  // ==========================================

  /**
   * Follow a user
   */
  async follow(followerId: string, followingId: string): Promise<Follow> {
    if (followerId === followingId) {
      throw new Error('Cannot follow yourself');
    }

    const id = `uf_${crypto.randomBytes(12).toString('hex')}`;

    await transaction(async (client) => {
      // Create follow
      await client.query(
        `INSERT INTO user_follows (id, follower_id, following_id)
         VALUES ($1, $2, $3)
         ON CONFLICT (follower_id, following_id) DO NOTHING`,
        [id, followerId, followingId]
      );

      // Update counts
      await client.query(
        'UPDATE users SET following_count = COALESCE(following_count, 0) + 1 WHERE id = $1',
        [followerId]
      );
      await client.query(
        'UPDATE users SET follower_count = COALESCE(follower_count, 0) + 1 WHERE id = $1',
        [followingId]
      );
    });

    return {
      id,
      followerId,
      followingId,
      createdAt: new Date(),
    };
  },

  /**
   * Unfollow a user
   */
  async unfollow(followerId: string, followingId: string): Promise<void> {
    const result = await query(
      'DELETE FROM user_follows WHERE follower_id = $1 AND following_id = $2 RETURNING id',
      [followerId, followingId]
    );

    if (result.rowCount && result.rowCount > 0) {
      await query(
        'UPDATE users SET following_count = GREATEST(COALESCE(following_count, 0) - 1, 0) WHERE id = $1',
        [followerId]
      );
      await query(
        'UPDATE users SET follower_count = GREATEST(COALESCE(follower_count, 0) - 1, 0) WHERE id = $1',
        [followingId]
      );
    }
  },

  /**
   * Check if user follows another
   */
  async isFollowing(followerId: string, followingId: string): Promise<boolean> {
    const result = await queryOne<{ count: string }>(
      'SELECT COUNT(*) as count FROM user_follows WHERE follower_id = $1 AND following_id = $2',
      [followerId, followingId]
    );
    return parseInt(result?.count || '0') > 0;
  },

  /**
   * Get followers of a user
   */
  async getFollowers(
    userId: string,
    options: { limit?: number; offset?: number } = {}
  ): Promise<{ followers: FollowWithUser[]; total: number }> {
    const { limit = 50, offset = 0 } = options;

    const [rows, countResult] = await Promise.all([
      queryAll<{
        id: string;
        follower_id: string;
        following_id: string;
        created_at: Date;
        username: string;
        display_name: string | null;
        avatar_url: string | null;
      }>(
        `SELECT f.*, u.username, u.display_name, u.avatar_url
         FROM user_follows f
         JOIN users u ON u.id = f.follower_id
         WHERE f.following_id = $1
         ORDER BY f.created_at DESC
         LIMIT $2 OFFSET $3`,
        [userId, limit, offset]
      ),
      queryOne<{ count: string }>(
        'SELECT COUNT(*) as count FROM user_follows WHERE following_id = $1',
        [userId]
      ),
    ]);

    return {
      followers: rows.map((r) => ({
        id: r.id,
        followerId: r.follower_id,
        followingId: r.following_id,
        createdAt: r.created_at,
        username: r.username,
        displayName: r.display_name || undefined,
        avatarUrl: r.avatar_url || undefined,
      })),
      total: parseInt(countResult?.count || '0'),
    };
  },

  /**
   * Get users that a user follows
   */
  async getFollowing(
    userId: string,
    options: { limit?: number; offset?: number } = {}
  ): Promise<{ following: FollowWithUser[]; total: number }> {
    const { limit = 50, offset = 0 } = options;

    const [rows, countResult] = await Promise.all([
      queryAll<{
        id: string;
        follower_id: string;
        following_id: string;
        created_at: Date;
        username: string;
        display_name: string | null;
        avatar_url: string | null;
      }>(
        `SELECT f.*, u.username, u.display_name, u.avatar_url
         FROM user_follows f
         JOIN users u ON u.id = f.following_id
         WHERE f.follower_id = $1
         ORDER BY f.created_at DESC
         LIMIT $2 OFFSET $3`,
        [userId, limit, offset]
      ),
      queryOne<{ count: string }>(
        'SELECT COUNT(*) as count FROM user_follows WHERE follower_id = $1',
        [userId]
      ),
    ]);

    return {
      following: rows.map((r) => ({
        id: r.id,
        followerId: r.follower_id,
        followingId: r.following_id,
        createdAt: r.created_at,
        username: r.username,
        displayName: r.display_name || undefined,
        avatarUrl: r.avatar_url || undefined,
      })),
      total: parseInt(countResult?.count || '0'),
    };
  },

  // ==========================================
  // FRIENDSHIPS
  // ==========================================

  /**
   * Send friend request
   */
  async sendFriendRequest(
    fromUserId: string,
    toUserId: string,
    context?: { hangoutId?: number; communityId?: number }
  ): Promise<Friendship> {
    if (fromUserId === toUserId) {
      throw new Error('Cannot send friend request to yourself');
    }

    // Ensure ordered pair (user_a < user_b)
    const [userA, userB] = fromUserId < toUserId ? [fromUserId, toUserId] : [toUserId, fromUserId];

    const id = `fr_${crypto.randomBytes(12).toString('hex')}`;

    await query(
      `INSERT INTO friendships (id, user_a_id, user_b_id, initiated_by, met_at_hangout_id, met_at_community_id)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (user_a_id, user_b_id) DO UPDATE SET
         status = CASE
           WHEN friendships.status = 'declined' THEN 'pending'
           ELSE friendships.status
         END,
         initiated_by = CASE
           WHEN friendships.status = 'declined' THEN $4
           ELSE friendships.initiated_by
         END`,
      [id, userA, userB, fromUserId, context?.hangoutId, context?.communityId]
    );

    return {
      id,
      userAId: userA,
      userBId: userB,
      status: 'pending',
      initiatedBy: fromUserId,
      metAtHangoutId: context?.hangoutId,
      metAtCommunityId: context?.communityId,
      createdAt: new Date(),
    };
  },

  /**
   * Accept friend request
   */
  async acceptFriendRequest(userId: string, friendshipId: string): Promise<void> {
    await transaction(async (client) => {
      const result = await client.query(
        `UPDATE friendships
         SET status = 'accepted', accepted_at = NOW()
         WHERE id = $1 AND (user_a_id = $2 OR user_b_id = $2) AND initiated_by != $2 AND status = 'pending'
         RETURNING user_a_id, user_b_id`,
        [friendshipId, userId]
      );

      if (result.rowCount === 0) {
        throw new Error('Friend request not found or already processed');
      }

      const { user_a_id, user_b_id } = result.rows[0];

      // Update friend counts
      await client.query('UPDATE users SET friend_count = COALESCE(friend_count, 0) + 1 WHERE id IN ($1, $2)', [
        user_a_id,
        user_b_id,
      ]);
    });
  },

  /**
   * Decline friend request
   */
  async declineFriendRequest(userId: string, friendshipId: string): Promise<void> {
    await query(
      `UPDATE friendships
       SET status = 'declined'
       WHERE id = $1 AND (user_a_id = $2 OR user_b_id = $2) AND initiated_by != $2 AND status = 'pending'`,
      [friendshipId, userId]
    );
  },

  /**
   * Remove friend
   */
  async removeFriend(userId: string, friendId: string): Promise<void> {
    const [userA, userB] = userId < friendId ? [userId, friendId] : [friendId, userId];

    await transaction(async (client) => {
      const result = await client.query(
        `DELETE FROM friendships WHERE user_a_id = $1 AND user_b_id = $2 AND status = 'accepted' RETURNING id`,
        [userA, userB]
      );

      if (result.rowCount && result.rowCount > 0) {
        await client.query(
          'UPDATE users SET friend_count = GREATEST(COALESCE(friend_count, 0) - 1, 0) WHERE id IN ($1, $2)',
          [userA, userB]
        );
      }
    });
  },

  /**
   * Block user
   */
  async blockUser(userId: string, blockedUserId: string): Promise<void> {
    const [userA, userB] = userId < blockedUserId ? [userId, blockedUserId] : [blockedUserId, userId];

    await query(
      `INSERT INTO friendships (id, user_a_id, user_b_id, status, initiated_by)
       VALUES ($1, $2, $3, 'blocked', $4)
       ON CONFLICT (user_a_id, user_b_id) DO UPDATE SET status = 'blocked'`,
      [`fr_${crypto.randomBytes(12).toString('hex')}`, userA, userB, userId]
    );
  },

  /**
   * Get pending friend requests
   */
  async getPendingFriendRequests(userId: string): Promise<FriendWithUser[]> {
    const rows = await queryAll<{
      id: string;
      user_a_id: string;
      user_b_id: string;
      status: string;
      initiated_by: string;
      met_at_hangout_id: number | null;
      met_at_community_id: number | null;
      created_at: Date;
      friend_id: string;
      username: string;
      display_name: string | null;
      avatar_url: string | null;
    }>(
      `SELECT f.*,
              CASE WHEN f.user_a_id = $1 THEN f.user_b_id ELSE f.user_a_id END as friend_id,
              u.username, u.display_name, u.avatar_url
       FROM friendships f
       JOIN users u ON u.id = CASE WHEN f.user_a_id = $1 THEN f.user_b_id ELSE f.user_a_id END
       WHERE (f.user_a_id = $1 OR f.user_b_id = $1) AND f.status = 'pending' AND f.initiated_by != $1
       ORDER BY f.created_at DESC`,
      [userId]
    );

    return rows.map((r) => ({
      id: r.id,
      userAId: r.user_a_id,
      userBId: r.user_b_id,
      status: r.status as Friendship['status'],
      initiatedBy: r.initiated_by,
      metAtHangoutId: r.met_at_hangout_id || undefined,
      metAtCommunityId: r.met_at_community_id || undefined,
      createdAt: r.created_at,
      friendId: r.friend_id,
      username: r.username,
      displayName: r.display_name || undefined,
      avatarUrl: r.avatar_url || undefined,
    }));
  },

  /**
   * Get friends list
   */
  async getFriends(
    userId: string,
    options: { limit?: number; offset?: number } = {}
  ): Promise<{ friends: FriendWithUser[]; total: number }> {
    const { limit = 50, offset = 0 } = options;

    const [rows, countResult] = await Promise.all([
      queryAll<{
        id: string;
        user_a_id: string;
        user_b_id: string;
        status: string;
        initiated_by: string;
        created_at: Date;
        accepted_at: Date | null;
        friend_id: string;
        username: string;
        display_name: string | null;
        avatar_url: string | null;
      }>(
        `SELECT f.*,
                CASE WHEN f.user_a_id = $1 THEN f.user_b_id ELSE f.user_a_id END as friend_id,
                u.username, u.display_name, u.avatar_url
         FROM friendships f
         JOIN users u ON u.id = CASE WHEN f.user_a_id = $1 THEN f.user_b_id ELSE f.user_a_id END
         WHERE (f.user_a_id = $1 OR f.user_b_id = $1) AND f.status = 'accepted'
         ORDER BY f.accepted_at DESC
         LIMIT $2 OFFSET $3`,
        [userId, limit, offset]
      ),
      queryOne<{ count: string }>(
        `SELECT COUNT(*) as count FROM friendships WHERE (user_a_id = $1 OR user_b_id = $1) AND status = 'accepted'`,
        [userId]
      ),
    ]);

    return {
      friends: rows.map((r) => ({
        id: r.id,
        userAId: r.user_a_id,
        userBId: r.user_b_id,
        status: r.status as Friendship['status'],
        initiatedBy: r.initiated_by,
        createdAt: r.created_at,
        acceptedAt: r.accepted_at || undefined,
        friendId: r.friend_id,
        username: r.username,
        displayName: r.display_name || undefined,
        avatarUrl: r.avatar_url || undefined,
      })),
      total: parseInt(countResult?.count || '0'),
    };
  },

  // ==========================================
  // BUDDY MATCHING
  // ==========================================

  /**
   * Update buddy preferences
   */
  async updateBuddyPreferences(userId: string, prefs: Partial<BuddyPreferences>): Promise<BuddyPreferences> {
    const result = await queryOne<{
      user_id: string;
      seeking_buddy: boolean;
      preferred_goals: string[];
      preferred_archetypes: string[];
      preferred_experience_levels: string[];
      preferred_schedule: string[];
      preferred_workout_types: string[];
      max_distance_km: number;
      prefer_same_hangout: boolean;
      prefer_same_community: boolean;
      match_gender: boolean;
      match_age_range: boolean;
      min_age: number | null;
      max_age: number | null;
      buddy_bio: string | null;
      visible_in_buddy_search: boolean;
    }>(
      `INSERT INTO buddy_preferences (
        user_id, seeking_buddy, preferred_goals, preferred_archetypes,
        preferred_experience_levels, preferred_schedule, preferred_workout_types,
        max_distance_km, prefer_same_hangout, prefer_same_community,
        match_gender, match_age_range, min_age, max_age, buddy_bio, visible_in_buddy_search
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
      ON CONFLICT (user_id) DO UPDATE SET
        seeking_buddy = COALESCE($2, buddy_preferences.seeking_buddy),
        preferred_goals = COALESCE($3, buddy_preferences.preferred_goals),
        preferred_archetypes = COALESCE($4, buddy_preferences.preferred_archetypes),
        preferred_experience_levels = COALESCE($5, buddy_preferences.preferred_experience_levels),
        preferred_schedule = COALESCE($6, buddy_preferences.preferred_schedule),
        preferred_workout_types = COALESCE($7, buddy_preferences.preferred_workout_types),
        max_distance_km = COALESCE($8, buddy_preferences.max_distance_km),
        prefer_same_hangout = COALESCE($9, buddy_preferences.prefer_same_hangout),
        prefer_same_community = COALESCE($10, buddy_preferences.prefer_same_community),
        match_gender = COALESCE($11, buddy_preferences.match_gender),
        match_age_range = COALESCE($12, buddy_preferences.match_age_range),
        min_age = COALESCE($13, buddy_preferences.min_age),
        max_age = COALESCE($14, buddy_preferences.max_age),
        buddy_bio = COALESCE($15, buddy_preferences.buddy_bio),
        visible_in_buddy_search = COALESCE($16, buddy_preferences.visible_in_buddy_search),
        updated_at = NOW()
      RETURNING *`,
      [
        userId,
        prefs.seekingBuddy,
        prefs.preferredGoals,
        prefs.preferredArchetypes,
        prefs.preferredExperienceLevels,
        prefs.preferredSchedule,
        prefs.preferredWorkoutTypes,
        prefs.maxDistanceKm,
        prefs.preferSameHangout,
        prefs.preferSameCommunity,
        prefs.matchGender,
        prefs.matchAgeRange,
        prefs.minAge,
        prefs.maxAge,
        prefs.buddyBio,
        prefs.visibleInBuddySearch,
      ]
    );

    if (!result) {
      throw new Error('Failed to update buddy preferences');
    }

    return {
      userId: result.user_id,
      seekingBuddy: result.seeking_buddy,
      preferredGoals: result.preferred_goals,
      preferredArchetypes: result.preferred_archetypes,
      preferredExperienceLevels: result.preferred_experience_levels,
      preferredSchedule: result.preferred_schedule,
      preferredWorkoutTypes: result.preferred_workout_types,
      maxDistanceKm: result.max_distance_km,
      preferSameHangout: result.prefer_same_hangout,
      preferSameCommunity: result.prefer_same_community,
      matchGender: result.match_gender,
      matchAgeRange: result.match_age_range,
      minAge: result.min_age || undefined,
      maxAge: result.max_age || undefined,
      buddyBio: result.buddy_bio || undefined,
      visibleInBuddySearch: result.visible_in_buddy_search,
    };
  },

  /**
   * Get buddy preferences
   */
  async getBuddyPreferences(userId: string): Promise<BuddyPreferences | null> {
    const result = await queryOne<{
      user_id: string;
      seeking_buddy: boolean;
      preferred_goals: string[];
      preferred_archetypes: string[];
      preferred_experience_levels: string[];
      preferred_schedule: string[];
      preferred_workout_types: string[];
      max_distance_km: number;
      prefer_same_hangout: boolean;
      prefer_same_community: boolean;
      match_gender: boolean;
      match_age_range: boolean;
      min_age: number | null;
      max_age: number | null;
      buddy_bio: string | null;
      visible_in_buddy_search: boolean;
    }>('SELECT * FROM buddy_preferences WHERE user_id = $1', [userId]);

    if (!result) return null;

    return {
      userId: result.user_id,
      seekingBuddy: result.seeking_buddy,
      preferredGoals: result.preferred_goals,
      preferredArchetypes: result.preferred_archetypes,
      preferredExperienceLevels: result.preferred_experience_levels,
      preferredSchedule: result.preferred_schedule,
      preferredWorkoutTypes: result.preferred_workout_types,
      maxDistanceKm: result.max_distance_km,
      preferSameHangout: result.prefer_same_hangout,
      preferSameCommunity: result.prefer_same_community,
      matchGender: result.match_gender,
      matchAgeRange: result.match_age_range,
      minAge: result.min_age || undefined,
      maxAge: result.max_age || undefined,
      buddyBio: result.buddy_bio || undefined,
      visibleInBuddySearch: result.visible_in_buddy_search,
    };
  },

  /**
   * Find potential buddy matches
   */
  async findBuddyMatches(userId: string, options: { limit?: number } = {}): Promise<BuddyMatch[]> {
    const { limit = 20 } = options;

    // Get user's preferences
    const myPrefs = await this.getBuddyPreferences(userId);
    if (!myPrefs) {
      return [];
    }

    // Find potential matches
    const rows = await queryAll<{
      user_id: string;
      username: string;
      display_name: string | null;
      avatar_url: string | null;
      preferred_goals: string[];
      preferred_archetypes: string[];
    }>(
      `SELECT bp.user_id, u.username, u.display_name, u.avatar_url,
              bp.preferred_goals, bp.preferred_archetypes
       FROM buddy_preferences bp
       JOIN users u ON u.id = bp.user_id
       WHERE bp.user_id != $1
         AND bp.seeking_buddy = true
         AND bp.visible_in_buddy_search = true
         AND NOT EXISTS (
           SELECT 1 FROM buddy_pairs WHERE
             (user_a_id = $1 AND user_b_id = bp.user_id) OR
             (user_a_id = bp.user_id AND user_b_id = $1)
         )
         AND NOT EXISTS (
           SELECT 1 FROM buddy_requests WHERE
             sender_id = $1 AND receiver_id = bp.user_id AND status = 'pending'
         )
       LIMIT $2`,
      [userId, limit * 2] // Get extra to filter and score
    );

    // Calculate match scores
    const matches: BuddyMatch[] = rows
      .map((r) => {
        let score = 50; // Base score

        // Shared goals bonus
        const sharedGoals = myPrefs.preferredGoals.filter((g) => r.preferred_goals.includes(g));
        score += sharedGoals.length * 10;

        // Shared archetypes bonus
        const sharedArchetypes = myPrefs.preferredArchetypes.filter((a) => r.preferred_archetypes.includes(a));
        score += sharedArchetypes.length * 15;

        return {
          userId: r.user_id,
          username: r.username,
          displayName: r.display_name || undefined,
          avatarUrl: r.avatar_url || undefined,
          matchScore: Math.min(score, 100),
          sharedGoals,
          sharedArchetypes,
        };
      })
      .sort((a, b) => b.matchScore - a.matchScore)
      .slice(0, limit);

    return matches;
  },

  /**
   * Send buddy request
   */
  async sendBuddyRequest(senderId: string, receiverId: string, message?: string): Promise<BuddyRequest> {
    if (senderId === receiverId) {
      throw new Error('Cannot send buddy request to yourself');
    }

    const id = `br_${crypto.randomBytes(12).toString('hex')}`;

    await query(
      `INSERT INTO buddy_requests (id, sender_id, receiver_id, message)
       VALUES ($1, $2, $3, $4)`,
      [id, senderId, receiverId, message]
    );

    return {
      id,
      senderId,
      receiverId,
      status: 'pending',
      message,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    };
  },

  /**
   * Accept buddy request
   */
  async acceptBuddyRequest(userId: string, requestId: string): Promise<BuddyPair> {
    const request = await queryOne<{ sender_id: string; receiver_id: string }>(
      `UPDATE buddy_requests SET status = 'accepted', responded_at = NOW()
       WHERE id = $1 AND receiver_id = $2 AND status = 'pending'
       RETURNING sender_id, receiver_id`,
      [requestId, userId]
    );

    if (!request) {
      throw new Error('Buddy request not found or already processed');
    }

    // Create buddy pair
    const [userA, userB] =
      request.sender_id < request.receiver_id
        ? [request.sender_id, request.receiver_id]
        : [request.receiver_id, request.sender_id];

    const pairId = `bp_${crypto.randomBytes(12).toString('hex')}`;

    await query(
      `INSERT INTO buddy_pairs (id, user_a_id, user_b_id)
       VALUES ($1, $2, $3)
       ON CONFLICT (user_a_id, user_b_id) DO UPDATE SET status = 'active', ended_at = NULL`,
      [pairId, userA, userB]
    );

    return {
      id: pairId,
      userAId: userA,
      userBId: userB,
      workoutsTogether: 0,
      streakDays: 0,
      status: 'active',
      createdAt: new Date(),
    };
  },

  /**
   * Decline buddy request
   */
  async declineBuddyRequest(userId: string, requestId: string): Promise<void> {
    await query(
      `UPDATE buddy_requests SET status = 'declined', responded_at = NOW()
       WHERE id = $1 AND receiver_id = $2 AND status = 'pending'`,
      [requestId, userId]
    );
  },

  /**
   * Get pending buddy requests
   */
  async getPendingBuddyRequests(userId: string): Promise<(BuddyRequest & { senderUsername: string })[]> {
    const rows = await queryAll<{
      id: string;
      sender_id: string;
      receiver_id: string;
      status: string;
      message: string | null;
      match_score: string | null;
      created_at: Date;
      expires_at: Date;
      username: string;
    }>(
      `SELECT br.*, u.username
       FROM buddy_requests br
       JOIN users u ON u.id = br.sender_id
       WHERE br.receiver_id = $1 AND br.status = 'pending' AND br.expires_at > NOW()
       ORDER BY br.created_at DESC`,
      [userId]
    );

    return rows.map((r) => ({
      id: r.id,
      senderId: r.sender_id,
      receiverId: r.receiver_id,
      status: r.status as BuddyRequest['status'],
      message: r.message || undefined,
      matchScore: r.match_score ? parseFloat(r.match_score) : undefined,
      createdAt: r.created_at,
      expiresAt: r.expires_at,
      senderUsername: r.username,
    }));
  },

  /**
   * Get active buddy pairs
   */
  async getBuddyPairs(userId: string): Promise<(BuddyPair & { buddyUsername: string; buddyAvatarUrl?: string })[]> {
    const rows = await queryAll<{
      id: string;
      user_a_id: string;
      user_b_id: string;
      workouts_together: number;
      last_workout_together: Date | null;
      streak_days: number;
      status: string;
      created_at: Date;
      buddy_id: string;
      username: string;
      avatar_url: string | null;
    }>(
      `SELECT bp.*,
              CASE WHEN bp.user_a_id = $1 THEN bp.user_b_id ELSE bp.user_a_id END as buddy_id,
              u.username, u.avatar_url
       FROM buddy_pairs bp
       JOIN users u ON u.id = CASE WHEN bp.user_a_id = $1 THEN bp.user_b_id ELSE bp.user_a_id END
       WHERE (bp.user_a_id = $1 OR bp.user_b_id = $1) AND bp.status = 'active'
       ORDER BY bp.last_workout_together DESC NULLS LAST`,
      [userId]
    );

    return rows.map((r) => ({
      id: r.id,
      userAId: r.user_a_id,
      userBId: r.user_b_id,
      workoutsTogether: r.workouts_together,
      lastWorkoutTogether: r.last_workout_together || undefined,
      streakDays: r.streak_days,
      status: r.status as BuddyPair['status'],
      createdAt: r.created_at,
      buddyUsername: r.username,
      buddyAvatarUrl: r.avatar_url || undefined,
    }));
  },
};

export default socialService;
