/**
 * Social Feature Resolvers
 *
 * GraphQL resolvers for Phase 1-3 Community Engagement features:
 * - Activity Feed & Following (Phase 1)
 * - Workout Buddies (Phase 2)
 * - Crew Challenges (Phase 3)
 */

import { GraphQLError } from 'graphql';
import { queryAll, queryOne, query } from '../db/client';
import { loggers } from '../lib/logger';

const log = loggers.core;

// ============================================
// TYPES
// ============================================

interface Context {
  user?: {
    userId: string;
    email: string;
    roles: string[];
  };
}

interface UserSummary {
  id: string;
  username: string;
  displayName: string | null;
  avatar: string | null;
  level: number;
  archetypeName: string | null;
}

// ============================================
// AUTH HELPER
// ============================================

function requireAuth(context: Context): { userId: string; email: string; roles: string[]; isAdmin: boolean } {
  if (!context.user) {
    throw new GraphQLError('Authentication required', {
      extensions: { code: 'UNAUTHENTICATED' },
    });
  }
  return {
    ...context.user,
    isAdmin: context.user.roles?.includes('admin') || false,
  };
}

// ============================================
// HELPER FUNCTIONS
// ============================================

async function getUserSummary(userId: string): Promise<UserSummary | null> {
  const user = await queryOne<{
    id: string;
    username: string;
    display_name: string | null;
    avatar_url: string | null;
    level: number | null;
    archetype_name: string | null;
  }>(
    `SELECT id, username, display_name, avatar_url, level,
            (SELECT a.name FROM archetypes a WHERE a.id = u.active_archetype_id) as archetype_name
     FROM users u WHERE id = $1`,
    [userId]
  );
  if (!user) return null;
  return {
    id: user.id,
    username: user.username,
    displayName: user.display_name,
    avatar: user.avatar_url,
    level: user.level || 1,
    archetypeName: user.archetype_name,
  };
}

// ============================================
// PHASE 1: ACTIVITY FEED RESOLVERS
// ============================================

export const socialQueryResolvers = {
  // Activity Feed
  activityFeed: async (
    _: unknown,
    args: { cursor?: string; limit?: number; filter?: { activityTypes?: string[]; userId?: string; followedOnly?: boolean } },
    context: Context
  ) => {
    const userId = context.user?.userId;
    const limit = Math.min(args.limit || 20, 50);
    const cursor = args.cursor;
    const filter = args.filter || {};

    let whereClause = `WHERE af.visibility = 'public'`;
    const params: (string | number | string[])[] = [];
    let paramIndex = 1;

    // If logged in and filtering by followed only
    if (userId && filter.followedOnly) {
      whereClause += ` AND (af.user_id = $${paramIndex} OR af.user_id IN (SELECT following_id FROM user_follows WHERE follower_id = $${paramIndex}))`;
      params.push(userId);
      paramIndex++;
    }

    // Filter by activity types
    if (filter.activityTypes && filter.activityTypes.length > 0) {
      whereClause += ` AND af.activity_type = ANY($${paramIndex}::text[])`;
      params.push(filter.activityTypes);
      paramIndex++;
    }

    // Filter by specific user
    if (filter.userId) {
      whereClause += ` AND af.user_id = $${paramIndex}`;
      params.push(filter.userId);
      paramIndex++;
    }

    // Cursor-based pagination
    if (cursor) {
      const [createdAt, id] = cursor.split('_');
      whereClause += ` AND (af.created_at, af.id) < ($${paramIndex}, $${paramIndex + 1})`;
      params.push(createdAt, id);
      paramIndex += 2;
    }

    params.push(limit + 1);

    const items = await queryAll<{
      id: string;
      user_id: string;
      activity_type: string;
      reference_id: string | null;
      reference_type: string | null;
      data: Record<string, unknown>;
      visibility: string;
      high_five_count: number;
      comment_count: number;
      created_at: Date;
      username: string;
      display_name: string | null;
      avatar_url: string | null;
      level: number | null;
    }>(
      `SELECT af.*, u.username, u.display_name, u.avatar_url, u.level
       FROM activity_feed af
       JOIN users u ON u.id = af.user_id
       ${whereClause}
       ORDER BY af.created_at DESC, af.id DESC
       LIMIT $${paramIndex}`,
      params
    );

    const hasMore = items.length > limit;
    const results = hasMore ? items.slice(0, limit) : items;
    const lastItem = results[results.length - 1];
    const nextCursor = lastItem ? `${lastItem.created_at.toISOString()}_${lastItem.id}` : null;

    return {
      items: results.map((item) => ({
        id: item.id,
        activityType: item.activity_type,
        referenceId: item.reference_id,
        referenceType: item.reference_type,
        data: item.data,
        highFiveCount: item.high_five_count || 0,
        commentCount: item.comment_count || 0,
        createdAt: item.created_at,
        user: {
          id: item.user_id,
          username: item.username,
          displayName: item.display_name,
          avatar: item.avatar_url,
          level: item.level || 1,
        },
      })),
      nextCursor,
      hasMore,
    };
  },

  // Following list
  following: async (
    _: unknown,
    args: { userId: string; cursor?: string; limit?: number },
    context: Context
  ) => {
    const limit = Math.min(args.limit || 20, 50);
    const params: (string | number)[] = [args.userId];
    let whereClause = 'WHERE uf.follower_id = $1';
    let paramIndex = 2;

    if (args.cursor) {
      whereClause += ` AND uf.created_at < $${paramIndex}`;
      params.push(args.cursor);
      paramIndex++;
    }

    params.push(limit + 1);

    const follows = await queryAll<{
      following_id: string;
      created_at: Date;
      username: string;
      display_name: string | null;
      avatar_url: string | null;
      level: number | null;
    }>(
      `SELECT uf.following_id, uf.created_at, u.username, u.display_name, u.avatar_url, u.level
       FROM user_follows uf
       JOIN users u ON u.id = uf.following_id
       ${whereClause}
       ORDER BY uf.created_at DESC
       LIMIT $${paramIndex}`,
      params
    );

    const hasMore = follows.length > limit;
    const results = hasMore ? follows.slice(0, limit) : follows;
    const lastItem = results[results.length - 1];

    return {
      users: results.map((f) => ({
        id: f.following_id,
        username: f.username,
        displayName: f.display_name,
        avatar: f.avatar_url,
        level: f.level || 1,
        followedAt: f.created_at,
      })),
      nextCursor: lastItem ? lastItem.created_at.toISOString() : null,
      hasMore,
    };
  },

  // Followers list
  followers: async (
    _: unknown,
    args: { userId: string; cursor?: string; limit?: number },
    context: Context
  ) => {
    const limit = Math.min(args.limit || 20, 50);
    const params: (string | number)[] = [args.userId];
    let whereClause = 'WHERE uf.following_id = $1';
    let paramIndex = 2;

    if (args.cursor) {
      whereClause += ` AND uf.created_at < $${paramIndex}`;
      params.push(args.cursor);
      paramIndex++;
    }

    params.push(limit + 1);

    const followers = await queryAll<{
      follower_id: string;
      created_at: Date;
      username: string;
      display_name: string | null;
      avatar_url: string | null;
      level: number | null;
    }>(
      `SELECT uf.follower_id, uf.created_at, u.username, u.display_name, u.avatar_url, u.level
       FROM user_follows uf
       JOIN users u ON u.id = uf.follower_id
       ${whereClause}
       ORDER BY uf.created_at DESC
       LIMIT $${paramIndex}`,
      params
    );

    const hasMore = followers.length > limit;
    const results = hasMore ? followers.slice(0, limit) : followers;
    const lastItem = results[results.length - 1];

    return {
      users: results.map((f) => ({
        id: f.follower_id,
        username: f.username,
        displayName: f.display_name,
        avatar: f.avatar_url,
        level: f.level || 1,
        followedAt: f.created_at,
      })),
      nextCursor: lastItem ? lastItem.created_at.toISOString() : null,
      hasMore,
    };
  },

  // Feed preferences
  feedPreferences: async (_: unknown, __: unknown, context: Context) => {
    const { userId } = requireAuth(context);

    const prefs = await queryOne<{
      show_workouts: boolean;
      show_prs: boolean;
      show_achievements: boolean;
      show_streaks: boolean;
      show_goals: boolean;
      show_challenges: boolean;
      show_level_ups: boolean;
      show_high_fives: boolean;
      notify_high_fives: boolean;
      notify_new_followers: boolean;
      notify_buddy_activity: boolean;
      notify_crew_activity: boolean;
      push_enabled: boolean;
    }>(
      `SELECT * FROM feed_preferences WHERE user_id = $1`,
      [userId]
    );

    if (!prefs) {
      // Return defaults
      return {
        showWorkouts: true,
        showPrs: true,
        showAchievements: true,
        showStreaks: true,
        showGoals: true,
        showChallenges: true,
        showLevelUps: true,
        showHighFives: true,
        notifyHighFives: true,
        notifyNewFollowers: true,
        notifyBuddyActivity: true,
        notifyCrewActivity: true,
        pushEnabled: true,
      };
    }

    return {
      showWorkouts: prefs.show_workouts,
      showPrs: prefs.show_prs,
      showAchievements: prefs.show_achievements,
      showStreaks: prefs.show_streaks,
      showGoals: prefs.show_goals,
      showChallenges: prefs.show_challenges,
      showLevelUps: prefs.show_level_ups,
      showHighFives: prefs.show_high_fives,
      notifyHighFives: prefs.notify_high_fives,
      notifyNewFollowers: prefs.notify_new_followers,
      notifyBuddyActivity: prefs.notify_buddy_activity,
      notifyCrewActivity: prefs.notify_crew_activity,
      pushEnabled: prefs.push_enabled,
    };
  },

  // Suggested users to follow
  suggestedFollows: async (_: unknown, args: { limit?: number }, context: Context) => {
    const { userId } = requireAuth(context);
    const limit = Math.min(args.limit || 10, 20);

    // Suggest users based on: mutual followers, same archetype, similar level
    const suggestions = await queryAll<{
      id: string;
      username: string;
      display_name: string | null;
      avatar_url: string | null;
      level: number | null;
      mutual_followers: number;
    }>(
      `SELECT u.id, u.username, u.display_name, u.avatar_url, u.level,
              (SELECT COUNT(*) FROM user_follows uf1
               JOIN user_follows uf2 ON uf1.following_id = uf2.follower_id
               WHERE uf1.follower_id = $1 AND uf2.following_id = u.id) as mutual_followers
       FROM users u
       WHERE u.id != $1
         AND u.id NOT IN (SELECT following_id FROM user_follows WHERE follower_id = $1)
         AND u.is_public = true
       ORDER BY mutual_followers DESC, u.level DESC
       LIMIT $2`,
      [userId, limit]
    );

    return suggestions.map((s) => ({
      id: s.id,
      username: s.username,
      displayName: s.display_name,
      avatar: s.avatar_url,
      level: s.level || 1,
      mutualFollowers: Number(s.mutual_followers) || 0,
      reason: Number(s.mutual_followers) > 0 ? 'Mutual followers' : 'Popular in your level range',
    }));
  },

  // Check if following a user
  isFollowing: async (_: unknown, args: { userId: string }, context: Context) => {
    const { userId } = requireAuth(context);

    const follow = await queryOne<{ id: string }>(
      `SELECT id FROM user_follows WHERE follower_id = $1 AND following_id = $2`,
      [userId, args.userId]
    );

    return !!follow;
  },

  // Activity comments
  activityComments: async (
    _: unknown,
    args: { activityId: string; cursor?: string; limit?: number },
    context: Context
  ) => {
    const limit = Math.min(args.limit || 20, 50);
    const params: (string | number)[] = [args.activityId];
    let whereClause = 'WHERE ac.activity_id = $1 AND ac.parent_id IS NULL';
    let paramIndex = 2;

    if (args.cursor) {
      whereClause += ` AND ac.created_at > $${paramIndex}`;
      params.push(args.cursor);
      paramIndex++;
    }

    params.push(limit + 1);

    const comments = await queryAll<{
      id: string;
      user_id: string;
      content: string;
      created_at: Date;
      username: string;
      display_name: string | null;
      avatar_url: string | null;
      reply_count: number;
    }>(
      `SELECT ac.id, ac.user_id, ac.content, ac.created_at,
              u.username, u.display_name, u.avatar_url,
              (SELECT COUNT(*) FROM activity_comments WHERE parent_id = ac.id) as reply_count
       FROM activity_comments ac
       JOIN users u ON u.id = ac.user_id
       ${whereClause}
       ORDER BY ac.created_at ASC
       LIMIT $${paramIndex}`,
      params
    );

    const hasMore = comments.length > limit;
    const results = hasMore ? comments.slice(0, limit) : comments;
    const lastItem = results[results.length - 1];

    return {
      comments: results.map((c) => ({
        id: c.id,
        content: c.content,
        createdAt: c.created_at,
        replyCount: Number(c.reply_count) || 0,
        user: {
          id: c.user_id,
          username: c.username,
          displayName: c.display_name,
          avatar: c.avatar_url,
        },
      })),
      nextCursor: lastItem ? lastItem.created_at.toISOString() : null,
      hasMore,
    };
  },

  // ============================================
  // PHASE 2: WORKOUT BUDDY RESOLVERS
  // ============================================

  buddyPreferences: async (_: unknown, __: unknown, context: Context) => {
    const { userId } = requireAuth(context);

    const prefs = await queryOne<{
      is_looking_for_buddy: boolean;
      preferred_workout_types: string[];
      preferred_times: string[];
      preferred_days: number[];
      fitness_level: string;
      match_similar_level: boolean;
      wants_daily_checkins: boolean;
      wants_workout_reminders: boolean;
      open_to_virtual_workouts: boolean;
      open_to_in_person: boolean;
      city: string | null;
      timezone: string | null;
      max_distance_km: number | null;
      goals: string[];
    }>(
      `SELECT * FROM buddy_preferences WHERE user_id = $1`,
      [userId]
    );

    if (!prefs) {
      return null;
    }

    return {
      isLookingForBuddy: prefs.is_looking_for_buddy,
      preferredWorkoutTypes: prefs.preferred_workout_types || [],
      preferredTimes: prefs.preferred_times || [],
      preferredDays: prefs.preferred_days || [],
      fitnessLevel: prefs.fitness_level,
      matchSimilarLevel: prefs.match_similar_level,
      wantsDailyCheckins: prefs.wants_daily_checkins,
      wantsWorkoutReminders: prefs.wants_workout_reminders,
      openToVirtualWorkouts: prefs.open_to_virtual_workouts,
      openToInPerson: prefs.open_to_in_person,
      city: prefs.city,
      timezone: prefs.timezone,
      maxDistanceKm: prefs.max_distance_km,
      goals: prefs.goals || [],
    };
  },

  myBuddies: async (_: unknown, __: unknown, context: Context) => {
    const { userId } = requireAuth(context);

    const pairs = await queryAll<{
      id: string;
      user1_id: string;
      user2_id: string;
      status: string;
      compatibility_score: number | null;
      match_reasons: string[];
      current_streak: number;
      longest_streak: number;
      total_workouts_together: number;
      total_check_ins: number;
      high_fives_exchanged: number;
      created_at: Date;
    }>(
      `SELECT * FROM buddy_pairs
       WHERE (user1_id = $1 OR user2_id = $1) AND status = 'active'
       ORDER BY created_at DESC`,
      [userId]
    );

    const result = [];
    for (const pair of pairs) {
      const buddyId = pair.user1_id === userId ? pair.user2_id : pair.user1_id;
      const buddy = await getUserSummary(buddyId);
      if (buddy) {
        result.push({
          id: pair.id,
          buddy,
          status: pair.status,
          compatibilityScore: pair.compatibility_score,
          matchReasons: pair.match_reasons || [],
          currentStreak: pair.current_streak,
          longestStreak: pair.longest_streak,
          totalWorkoutsTogether: pair.total_workouts_together,
          totalCheckIns: pair.total_check_ins,
          highFivesExchanged: pair.high_fives_exchanged,
          createdAt: pair.created_at,
        });
      }
    }

    return result;
  },

  potentialBuddyMatches: async (_: unknown, args: { limit?: number }, context: Context) => {
    const { userId } = requireAuth(context);
    const limit = Math.min(args.limit || 10, 20);

    const matches = await queryAll<{
      user2_id: string;
      same_level: boolean;
      overlapping_workouts: boolean;
      overlapping_times: boolean;
      overlapping_days: boolean;
      overlapping_goals: boolean;
      both_virtual_ok: boolean;
      distance_km: number | null;
    }>(
      `SELECT * FROM v_potential_buddy_matches
       WHERE user1_id = $1
       ORDER BY
         (CASE WHEN same_level THEN 1 ELSE 0 END +
          CASE WHEN overlapping_workouts THEN 1 ELSE 0 END +
          CASE WHEN overlapping_times THEN 1 ELSE 0 END +
          CASE WHEN overlapping_days THEN 1 ELSE 0 END +
          CASE WHEN overlapping_goals THEN 1 ELSE 0 END) DESC
       LIMIT $2`,
      [userId, limit]
    );

    const result = [];
    for (const match of matches) {
      const user = await getUserSummary(match.user2_id);
      if (user) {
        // Calculate compatibility score
        let score = 50;
        const reasons: string[] = [];

        if (match.same_level) {
          score += 15;
          reasons.push('Same fitness level');
        }
        if (match.overlapping_workouts) {
          score += 10;
          reasons.push('Similar workout preferences');
        }
        if (match.overlapping_times) {
          score += 10;
          reasons.push('Compatible schedules');
        }
        if (match.overlapping_goals) {
          score += 10;
          reasons.push('Shared fitness goals');
        }
        if (match.both_virtual_ok) {
          score += 5;
          reasons.push('Both open to virtual workouts');
        }

        result.push({
          user,
          compatibilityScore: Math.min(score, 100),
          matchReasons: reasons,
          distanceKm: match.distance_km,
        });
      }
    }

    return result;
  },

  buddyInvites: async (_: unknown, args: { status?: string }, context: Context) => {
    const { userId } = requireAuth(context);

    let whereClause = 'WHERE recipient_id = $1';
    const params: string[] = [userId];

    if (args.status) {
      whereClause += ' AND status = $2';
      params.push(args.status);
    }

    const invites = await queryAll<{
      id: string;
      sender_id: string;
      message: string | null;
      status: string;
      compatibility_score: number | null;
      match_reasons: string[];
      created_at: Date;
      expires_at: Date | null;
    }>(
      `SELECT * FROM buddy_invites ${whereClause} ORDER BY created_at DESC`,
      params
    );

    const result = [];
    for (const invite of invites) {
      const sender = await getUserSummary(invite.sender_id);
      if (sender) {
        result.push({
          id: invite.id,
          sender,
          message: invite.message,
          status: invite.status,
          compatibilityScore: invite.compatibility_score,
          matchReasons: invite.match_reasons || [],
          createdAt: invite.created_at,
          expiresAt: invite.expires_at,
        });
      }
    }

    return result;
  },

  buddyMessages: async (
    _: unknown,
    args: { buddyPairId: string; cursor?: string; limit?: number },
    context: Context
  ) => {
    const { userId } = requireAuth(context);
    const limit = Math.min(args.limit || 50, 100);

    // Verify user is part of this buddy pair
    const pair = await queryOne<{ id: string }>(
      `SELECT id FROM buddy_pairs WHERE id = $1 AND (user1_id = $2 OR user2_id = $2)`,
      [args.buddyPairId, userId]
    );

    if (!pair) {
      throw new GraphQLError('Not authorized to view these messages', {
        extensions: { code: 'FORBIDDEN' },
      });
    }

    const params: (string | number)[] = [args.buddyPairId];
    let whereClause = 'WHERE bm.buddy_pair_id = $1';
    let paramIndex = 2;

    if (args.cursor) {
      whereClause += ` AND bm.created_at < $${paramIndex}`;
      params.push(args.cursor);
      paramIndex++;
    }

    params.push(limit + 1);

    const messages = await queryAll<{
      id: string;
      sender_id: string;
      content: string;
      message_type: string;
      metadata: Record<string, unknown>;
      is_read: boolean;
      created_at: Date;
      username: string;
      display_name: string | null;
      avatar_url: string | null;
    }>(
      `SELECT bm.*, u.username, u.display_name, u.avatar_url
       FROM buddy_messages bm
       JOIN users u ON u.id = bm.sender_id
       ${whereClause}
       ORDER BY bm.created_at DESC
       LIMIT $${paramIndex}`,
      params
    );

    const hasMore = messages.length > limit;
    const results = hasMore ? messages.slice(0, limit) : messages;
    const lastItem = results[results.length - 1];

    return {
      messages: results.map((m) => ({
        id: m.id,
        content: m.content,
        messageType: m.message_type,
        metadata: m.metadata,
        isRead: m.is_read,
        createdAt: m.created_at,
        sender: {
          id: m.sender_id,
          username: m.username,
          displayName: m.display_name,
          avatar: m.avatar_url,
        },
        isMine: m.sender_id === userId,
      })),
      nextCursor: lastItem ? lastItem.created_at.toISOString() : null,
      hasMore,
    };
  },

  // ============================================
  // PHASE 3: CREW CHALLENGES RESOLVERS
  // ============================================

  crewChallenges: async (
    _: unknown,
    args: { crewId: string; status?: string },
    context: Context
  ) => {
    let whereClause = 'WHERE crew_id = $1';
    const params: string[] = [args.crewId];

    if (args.status) {
      whereClause += ' AND status = $2';
      params.push(args.status);
    }

    const challenges = await queryAll<{
      id: string;
      crew_id: string;
      created_by: string;
      challenge_type: string;
      opponent_crew_id: string | null;
      title: string;
      description: string | null;
      image_url: string | null;
      metric_type: string;
      goal_value: number | null;
      current_value: number;
      starts_at: Date;
      ends_at: Date;
      status: string;
      winner_crew_id: string | null;
      rewards: Record<string, unknown>;
      created_at: Date;
    }>(
      `SELECT * FROM crew_challenges ${whereClause} ORDER BY created_at DESC`,
      params
    );

    return challenges.map((c) => ({
      id: c.id,
      crewId: c.crew_id,
      createdBy: c.created_by,
      challengeType: c.challenge_type,
      opponentCrewId: c.opponent_crew_id,
      title: c.title,
      description: c.description,
      imageUrl: c.image_url,
      metricType: c.metric_type,
      goalValue: c.goal_value,
      currentValue: Number(c.current_value) || 0,
      startsAt: c.starts_at,
      endsAt: c.ends_at,
      status: c.status,
      winnerCrewId: c.winner_crew_id,
      rewards: c.rewards,
      createdAt: c.created_at,
      progressPercent: c.goal_value ? Math.min(100, (Number(c.current_value) / Number(c.goal_value)) * 100) : null,
    }));
  },

  crewLeaderboard: async (_: unknown, args: { limit?: number }, context: Context) => {
    const limit = Math.min(args.limit || 20, 50);

    const crews = await queryAll<{
      id: string;
      name: string;
      avatar_url: string | null;
      member_count: number;
      total_xp: number;
      level: number;
      challenges_won: number;
      xp_rank: number;
      challenges_rank: number;
    }>(
      `SELECT * FROM mv_crew_leaderboard ORDER BY xp_rank ASC LIMIT $1`,
      [limit]
    );

    return crews.map((c) => ({
      id: c.id,
      name: c.name,
      avatarUrl: c.avatar_url,
      memberCount: c.member_count,
      totalXp: Number(c.total_xp) || 0,
      level: c.level || 1,
      challengesWon: c.challenges_won || 0,
      xpRank: Number(c.xp_rank),
      challengesRank: Number(c.challenges_rank),
    }));
  },

  crewAchievements: async (_: unknown, args: { crewId: string }, context: Context) => {
    const achievements = await queryAll<{
      id: string;
      achievement_key: string;
      title: string;
      description: string | null;
      icon_url: string | null;
      rarity: string;
      target_value: number | null;
      achieved_value: number | null;
      earned_at: Date;
    }>(
      `SELECT * FROM crew_achievements WHERE crew_id = $1 ORDER BY earned_at DESC`,
      [args.crewId]
    );

    return achievements.map((a) => ({
      id: a.id,
      achievementKey: a.achievement_key,
      title: a.title,
      description: a.description,
      iconUrl: a.icon_url,
      rarity: a.rarity,
      targetValue: a.target_value,
      achievedValue: a.achieved_value,
      earnedAt: a.earned_at,
    }));
  },

  crewChatMessages: async (
    _: unknown,
    args: { crewId: string; cursor?: string; limit?: number },
    context: Context
  ) => {
    const { userId } = requireAuth(context);
    const limit = Math.min(args.limit || 50, 100);

    // Verify user is a member of this crew
    const membership = await queryOne<{ id: string }>(
      `SELECT id FROM crew_members WHERE crew_id = $1 AND user_id = $2 AND status = 'active'`,
      [args.crewId, userId]
    );

    if (!membership) {
      throw new GraphQLError('Not a member of this crew', {
        extensions: { code: 'FORBIDDEN' },
      });
    }

    const params: (string | number)[] = [args.crewId];
    let whereClause = 'WHERE cm.crew_id = $1 AND cm.is_deleted = false';
    let paramIndex = 2;

    if (args.cursor) {
      whereClause += ` AND cm.created_at < $${paramIndex}`;
      params.push(args.cursor);
      paramIndex++;
    }

    params.push(limit + 1);

    const messages = await queryAll<{
      id: string;
      user_id: string;
      content: string;
      message_type: string;
      metadata: Record<string, unknown>;
      reply_to_id: string | null;
      reactions: Record<string, unknown>;
      is_pinned: boolean;
      created_at: Date;
      edited_at: Date | null;
      username: string;
      display_name: string | null;
      avatar_url: string | null;
    }>(
      `SELECT cm.*, u.username, u.display_name, u.avatar_url
       FROM crew_chat_messages cm
       JOIN users u ON u.id = cm.user_id
       ${whereClause}
       ORDER BY cm.created_at DESC
       LIMIT $${paramIndex}`,
      params
    );

    const hasMore = messages.length > limit;
    const results = hasMore ? messages.slice(0, limit) : messages;
    const lastItem = results[results.length - 1];

    // Update read status
    await query(
      `INSERT INTO crew_chat_read_status (crew_id, user_id, last_read_at)
       VALUES ($1, $2, NOW())
       ON CONFLICT (crew_id, user_id) DO UPDATE SET last_read_at = NOW()`,
      [args.crewId, userId]
    );

    return {
      messages: results.map((m) => ({
        id: m.id,
        content: m.content,
        messageType: m.message_type,
        metadata: m.metadata,
        replyToId: m.reply_to_id,
        reactions: m.reactions,
        isPinned: m.is_pinned,
        createdAt: m.created_at,
        editedAt: m.edited_at,
        sender: {
          id: m.user_id,
          username: m.username,
          displayName: m.display_name,
          avatar: m.avatar_url,
        },
        isMine: m.user_id === userId,
      })),
      nextCursor: lastItem ? lastItem.created_at.toISOString() : null,
      hasMore,
    };
  },

  crewUnreadCount: async (_: unknown, args: { crewId: string }, context: Context) => {
    const { userId } = requireAuth(context);

    const result = await queryOne<{ count: number }>(
      `SELECT COUNT(*) as count
       FROM crew_chat_messages cm
       WHERE cm.crew_id = $1 AND cm.is_deleted = false
         AND cm.created_at > COALESCE(
           (SELECT last_read_at FROM crew_chat_read_status WHERE crew_id = $1 AND user_id = $2),
           '1970-01-01'
         )`,
      [args.crewId, userId]
    );

    return Number(result?.count) || 0;
  },
};

// ============================================
// MUTATION RESOLVERS
// ============================================

export const socialMutationResolvers = {
  // ============================================
  // PHASE 1: FOLLOW MUTATIONS
  // ============================================

  followUser: async (_: unknown, args: { userId: string }, context: Context) => {
    const { userId } = requireAuth(context);

    if (userId === args.userId) {
      throw new GraphQLError('Cannot follow yourself', {
        extensions: { code: 'BAD_USER_INPUT' },
      });
    }

    // Check if already following
    const existing = await queryOne<{ id: string }>(
      `SELECT id FROM user_follows WHERE follower_id = $1 AND following_id = $2`,
      [userId, args.userId]
    );

    if (existing) {
      return { success: true, message: 'Already following this user' };
    }

    await query(
      `INSERT INTO user_follows (follower_id, following_id) VALUES ($1, $2)`,
      [userId, args.userId]
    );

    return { success: true, message: 'Now following user' };
  },

  unfollowUser: async (_: unknown, args: { userId: string }, context: Context) => {
    const { userId } = requireAuth(context);

    await query(
      `DELETE FROM user_follows WHERE follower_id = $1 AND following_id = $2`,
      [userId, args.userId]
    );

    return { success: true, message: 'Unfollowed user' };
  },

  updateFeedPreferences: async (
    _: unknown,
    args: {
      input: {
        showWorkouts?: boolean;
        showPrs?: boolean;
        showAchievements?: boolean;
        showStreaks?: boolean;
        showGoals?: boolean;
        showChallenges?: boolean;
        showLevelUps?: boolean;
        showHighFives?: boolean;
        notifyHighFives?: boolean;
        notifyNewFollowers?: boolean;
        notifyBuddyActivity?: boolean;
        notifyCrewActivity?: boolean;
        pushEnabled?: boolean;
      };
    },
    context: Context
  ) => {
    const { userId } = requireAuth(context);
    const input = args.input;

    const result = await queryOne<{
      show_workouts: boolean;
      show_prs: boolean;
      show_achievements: boolean;
      show_streaks: boolean;
      show_goals: boolean;
      show_challenges: boolean;
      show_level_ups: boolean;
      show_high_fives: boolean;
      notify_high_fives: boolean;
      notify_new_followers: boolean;
      notify_buddy_activity: boolean;
      notify_crew_activity: boolean;
      push_enabled: boolean;
    }>(
      `INSERT INTO feed_preferences (
        user_id, show_workouts, show_prs, show_achievements, show_streaks,
        show_goals, show_challenges, show_level_ups, show_high_fives,
        notify_high_fives, notify_new_followers, notify_buddy_activity,
        notify_crew_activity, push_enabled
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      ON CONFLICT (user_id) DO UPDATE SET
        show_workouts = COALESCE($2, feed_preferences.show_workouts),
        show_prs = COALESCE($3, feed_preferences.show_prs),
        show_achievements = COALESCE($4, feed_preferences.show_achievements),
        show_streaks = COALESCE($5, feed_preferences.show_streaks),
        show_goals = COALESCE($6, feed_preferences.show_goals),
        show_challenges = COALESCE($7, feed_preferences.show_challenges),
        show_level_ups = COALESCE($8, feed_preferences.show_level_ups),
        show_high_fives = COALESCE($9, feed_preferences.show_high_fives),
        notify_high_fives = COALESCE($10, feed_preferences.notify_high_fives),
        notify_new_followers = COALESCE($11, feed_preferences.notify_new_followers),
        notify_buddy_activity = COALESCE($12, feed_preferences.notify_buddy_activity),
        notify_crew_activity = COALESCE($13, feed_preferences.notify_crew_activity),
        push_enabled = COALESCE($14, feed_preferences.push_enabled),
        updated_at = NOW()
      RETURNING *`,
      [
        userId,
        input.showWorkouts,
        input.showPrs,
        input.showAchievements,
        input.showStreaks,
        input.showGoals,
        input.showChallenges,
        input.showLevelUps,
        input.showHighFives,
        input.notifyHighFives,
        input.notifyNewFollowers,
        input.notifyBuddyActivity,
        input.notifyCrewActivity,
        input.pushEnabled,
      ]
    );

    if (!result) {
      throw new GraphQLError('Failed to update preferences', {
        extensions: { code: 'INTERNAL_SERVER_ERROR' },
      });
    }

    return {
      showWorkouts: result.show_workouts,
      showPrs: result.show_prs,
      showAchievements: result.show_achievements,
      showStreaks: result.show_streaks,
      showGoals: result.show_goals,
      showChallenges: result.show_challenges,
      showLevelUps: result.show_level_ups,
      showHighFives: result.show_high_fives,
      notifyHighFives: result.notify_high_fives,
      notifyNewFollowers: result.notify_new_followers,
      notifyBuddyActivity: result.notify_buddy_activity,
      notifyCrewActivity: result.notify_crew_activity,
      pushEnabled: result.push_enabled,
    };
  },

  postActivityComment: async (
    _: unknown,
    args: { activityId: string; content: string; parentId?: string },
    context: Context
  ) => {
    const { userId } = requireAuth(context);

    const result = await queryOne<{
      id: string;
      content: string;
      created_at: Date;
    }>(
      `INSERT INTO activity_comments (activity_id, user_id, content, parent_id)
       VALUES ($1, $2, $3, $4)
       RETURNING id, content, created_at`,
      [args.activityId, userId, args.content, args.parentId || null]
    );

    if (!result) {
      throw new GraphQLError('Failed to post comment', {
        extensions: { code: 'INTERNAL_SERVER_ERROR' },
      });
    }

    const user = await getUserSummary(userId);

    return {
      id: result.id,
      content: result.content,
      createdAt: result.created_at,
      user,
    };
  },

  deleteActivityComment: async (_: unknown, args: { commentId: string }, context: Context) => {
    const { userId, isAdmin } = requireAuth(context);

    const comment = await queryOne<{ user_id: string }>(
      `SELECT user_id FROM activity_comments WHERE id = $1`,
      [args.commentId]
    );

    if (!comment) {
      throw new GraphQLError('Comment not found', {
        extensions: { code: 'NOT_FOUND' },
      });
    }

    if (comment.user_id !== userId && !isAdmin) {
      throw new GraphQLError('Not authorized to delete this comment', {
        extensions: { code: 'FORBIDDEN' },
      });
    }

    await query(`DELETE FROM activity_comments WHERE id = $1`, [args.commentId]);

    return { success: true };
  },

  // ============================================
  // PHASE 2: BUDDY MUTATIONS
  // ============================================

  updateBuddyPreferences: async (
    _: unknown,
    args: {
      input: {
        isLookingForBuddy?: boolean;
        preferredWorkoutTypes?: string[];
        preferredTimes?: string[];
        preferredDays?: number[];
        fitnessLevel?: string;
        matchSimilarLevel?: boolean;
        wantsDailyCheckins?: boolean;
        wantsWorkoutReminders?: boolean;
        openToVirtualWorkouts?: boolean;
        openToInPerson?: boolean;
        city?: string;
        timezone?: string;
        maxDistanceKm?: number;
        goals?: string[];
      };
    },
    context: Context
  ) => {
    const { userId } = requireAuth(context);
    const input = args.input;

    const result = await queryOne<{
      is_looking_for_buddy: boolean;
      preferred_workout_types: string[];
      preferred_times: string[];
      preferred_days: number[];
      fitness_level: string;
      match_similar_level: boolean;
      wants_daily_checkins: boolean;
      wants_workout_reminders: boolean;
      open_to_virtual_workouts: boolean;
      open_to_in_person: boolean;
      city: string | null;
      timezone: string | null;
      max_distance_km: number | null;
      goals: string[];
    }>(
      `INSERT INTO buddy_preferences (
        user_id, is_looking_for_buddy, preferred_workout_types, preferred_times,
        preferred_days, fitness_level, match_similar_level, wants_daily_checkins,
        wants_workout_reminders, open_to_virtual_workouts, open_to_in_person,
        city, timezone, max_distance_km, goals
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
      ON CONFLICT (user_id) DO UPDATE SET
        is_looking_for_buddy = COALESCE($2, buddy_preferences.is_looking_for_buddy),
        preferred_workout_types = COALESCE($3, buddy_preferences.preferred_workout_types),
        preferred_times = COALESCE($4, buddy_preferences.preferred_times),
        preferred_days = COALESCE($5, buddy_preferences.preferred_days),
        fitness_level = COALESCE($6, buddy_preferences.fitness_level),
        match_similar_level = COALESCE($7, buddy_preferences.match_similar_level),
        wants_daily_checkins = COALESCE($8, buddy_preferences.wants_daily_checkins),
        wants_workout_reminders = COALESCE($9, buddy_preferences.wants_workout_reminders),
        open_to_virtual_workouts = COALESCE($10, buddy_preferences.open_to_virtual_workouts),
        open_to_in_person = COALESCE($11, buddy_preferences.open_to_in_person),
        city = COALESCE($12, buddy_preferences.city),
        timezone = COALESCE($13, buddy_preferences.timezone),
        max_distance_km = COALESCE($14, buddy_preferences.max_distance_km),
        goals = COALESCE($15, buddy_preferences.goals),
        updated_at = NOW()
      RETURNING *`,
      [
        userId,
        input.isLookingForBuddy,
        input.preferredWorkoutTypes,
        input.preferredTimes,
        input.preferredDays,
        input.fitnessLevel,
        input.matchSimilarLevel,
        input.wantsDailyCheckins,
        input.wantsWorkoutReminders,
        input.openToVirtualWorkouts,
        input.openToInPerson,
        input.city,
        input.timezone,
        input.maxDistanceKm,
        input.goals,
      ]
    );

    if (!result) {
      throw new GraphQLError('Failed to update buddy preferences', {
        extensions: { code: 'INTERNAL_SERVER_ERROR' },
      });
    }

    return {
      isLookingForBuddy: result.is_looking_for_buddy,
      preferredWorkoutTypes: result.preferred_workout_types,
      preferredTimes: result.preferred_times,
      preferredDays: result.preferred_days,
      fitnessLevel: result.fitness_level,
      matchSimilarLevel: result.match_similar_level,
      wantsDailyCheckins: result.wants_daily_checkins,
      wantsWorkoutReminders: result.wants_workout_reminders,
      openToVirtualWorkouts: result.open_to_virtual_workouts,
      openToInPerson: result.open_to_in_person,
      city: result.city,
      timezone: result.timezone,
      maxDistanceKm: result.max_distance_km,
      goals: result.goals,
    };
  },

  sendBuddyInvite: async (
    _: unknown,
    args: { recipientId: string; message?: string },
    context: Context
  ) => {
    const { userId } = requireAuth(context);

    if (userId === args.recipientId) {
      throw new GraphQLError('Cannot send buddy invite to yourself', {
        extensions: { code: 'BAD_USER_INPUT' },
      });
    }

    // Check for existing pending invite
    const existingInvite = await queryOne<{ id: string }>(
      `SELECT id FROM buddy_invites
       WHERE sender_id = $1 AND recipient_id = $2 AND status = 'pending'`,
      [userId, args.recipientId]
    );

    if (existingInvite) {
      throw new GraphQLError('You already have a pending invite to this user', {
        extensions: { code: 'CONFLICT' },
      });
    }

    // Check for existing buddy pair
    const existingPair = await queryOne<{ id: string }>(
      `SELECT id FROM buddy_pairs
       WHERE ((user1_id = $1 AND user2_id = $2) OR (user1_id = $2 AND user2_id = $1))
         AND status = 'active'`,
      [userId, args.recipientId]
    );

    if (existingPair) {
      throw new GraphQLError('You are already buddies with this user', {
        extensions: { code: 'CONFLICT' },
      });
    }

    const result = await queryOne<{
      id: string;
      sender_id: string;
      recipient_id: string;
      message: string | null;
      status: string;
      created_at: Date;
      expires_at: Date;
    }>(
      `INSERT INTO buddy_invites (sender_id, recipient_id, message, expires_at)
       VALUES ($1, $2, $3, NOW() + INTERVAL '7 days')
       RETURNING *`,
      [userId, args.recipientId, args.message || null]
    );

    if (!result) {
      throw new GraphQLError('Failed to send buddy invite', {
        extensions: { code: 'INTERNAL_SERVER_ERROR' },
      });
    }

    return {
      id: result.id,
      senderId: result.sender_id,
      recipientId: result.recipient_id,
      message: result.message,
      status: result.status,
      createdAt: result.created_at,
      expiresAt: result.expires_at,
    };
  },

  respondToBuddyInvite: async (
    _: unknown,
    args: { inviteId: string; accept: boolean },
    context: Context
  ) => {
    const { userId } = requireAuth(context);

    const invite = await queryOne<{
      id: string;
      sender_id: string;
      recipient_id: string;
    }>(
      `SELECT id, sender_id, recipient_id FROM buddy_invites
       WHERE id = $1 AND recipient_id = $2 AND status = 'pending'`,
      [args.inviteId, userId]
    );

    if (!invite) {
      throw new GraphQLError('Invite not found or already responded', {
        extensions: { code: 'NOT_FOUND' },
      });
    }

    const newStatus = args.accept ? 'accepted' : 'declined';

    await query(
      `UPDATE buddy_invites SET status = $1, responded_at = NOW() WHERE id = $2`,
      [newStatus, args.inviteId]
    );

    if (args.accept) {
      // Buddy pair is created via trigger when invite is accepted
      const pair = await queryOne<{
        id: string;
        user1_id: string;
        user2_id: string;
        status: string;
        created_at: Date;
      }>(
        `SELECT * FROM buddy_pairs
         WHERE (user1_id = $1 AND user2_id = $2) OR (user1_id = $2 AND user2_id = $1)`,
        [invite.sender_id, invite.recipient_id]
      );

      if (pair) {
        const buddyId = pair.user1_id === userId ? pair.user2_id : pair.user1_id;
        const buddy = await getUserSummary(buddyId);

        return {
          success: true,
          buddyPair: {
            id: pair.id,
            buddy,
            status: pair.status,
            createdAt: pair.created_at,
          },
        };
      }
    }

    return { success: true, buddyPair: null };
  },

  sendBuddyMessage: async (
    _: unknown,
    args: { buddyPairId: string; content: string; messageType?: string },
    context: Context
  ) => {
    const { userId } = requireAuth(context);

    // Verify user is part of this buddy pair
    const pair = await queryOne<{ id: string }>(
      `SELECT id FROM buddy_pairs WHERE id = $1 AND (user1_id = $2 OR user2_id = $2)`,
      [args.buddyPairId, userId]
    );

    if (!pair) {
      throw new GraphQLError('Not authorized to send messages in this chat', {
        extensions: { code: 'FORBIDDEN' },
      });
    }

    const result = await queryOne<{
      id: string;
      content: string;
      message_type: string;
      created_at: Date;
    }>(
      `INSERT INTO buddy_messages (buddy_pair_id, sender_id, content, message_type)
       VALUES ($1, $2, $3, $4)
       RETURNING id, content, message_type, created_at`,
      [args.buddyPairId, userId, args.content, args.messageType || 'text']
    );

    if (!result) {
      throw new GraphQLError('Failed to send message', {
        extensions: { code: 'INTERNAL_SERVER_ERROR' },
      });
    }

    const user = await getUserSummary(userId);

    return {
      id: result.id,
      content: result.content,
      messageType: result.message_type,
      createdAt: result.created_at,
      sender: user,
      isMine: true,
    };
  },

  sendBuddyCheckIn: async (
    _: unknown,
    args: { buddyPairId: string; checkInType: string; message?: string; moodRating?: number },
    context: Context
  ) => {
    const { userId } = requireAuth(context);

    // Verify user is part of this buddy pair
    const pair = await queryOne<{ id: string }>(
      `SELECT id FROM buddy_pairs WHERE id = $1 AND (user1_id = $2 OR user2_id = $2)`,
      [args.buddyPairId, userId]
    );

    if (!pair) {
      throw new GraphQLError('Not authorized to check in for this buddy pair', {
        extensions: { code: 'FORBIDDEN' },
      });
    }

    const result = await queryOne<{
      id: string;
      check_in_type: string;
      message: string | null;
      mood_rating: number | null;
      check_in_date: Date;
      created_at: Date;
    }>(
      `INSERT INTO buddy_check_ins (buddy_pair_id, user_id, check_in_type, message, mood_rating, check_in_date)
       VALUES ($1, $2, $3, $4, $5, CURRENT_DATE)
       RETURNING id, check_in_type, message, mood_rating, check_in_date, created_at`,
      [args.buddyPairId, userId, args.checkInType, args.message || null, args.moodRating || null]
    );

    if (!result) {
      throw new GraphQLError('Failed to send check-in', {
        extensions: { code: 'INTERNAL_SERVER_ERROR' },
      });
    }

    return {
      id: result.id,
      checkInType: result.check_in_type,
      message: result.message,
      moodRating: result.mood_rating,
      checkInDate: result.check_in_date,
      createdAt: result.created_at,
    };
  },

  endBuddyPair: async (_: unknown, args: { buddyPairId: string }, context: Context) => {
    const { userId } = requireAuth(context);

    const pair = await queryOne<{ id: string }>(
      `SELECT id FROM buddy_pairs WHERE id = $1 AND (user1_id = $2 OR user2_id = $2)`,
      [args.buddyPairId, userId]
    );

    if (!pair) {
      throw new GraphQLError('Buddy pair not found', {
        extensions: { code: 'NOT_FOUND' },
      });
    }

    await query(
      `UPDATE buddy_pairs SET status = 'ended', ended_at = NOW() WHERE id = $1`,
      [args.buddyPairId]
    );

    return { success: true };
  },

  // ============================================
  // PHASE 3: CREW CHALLENGE MUTATIONS
  // ============================================

  createCrewChallenge: async (
    _: unknown,
    args: {
      input: {
        crewId: string;
        challengeType: string;
        opponentCrewId?: string;
        title: string;
        description?: string;
        metricType: string;
        goalValue?: number;
        startsAt: string;
        endsAt: string;
        rewards?: Record<string, unknown>;
      };
    },
    context: Context
  ) => {
    const { userId } = requireAuth(context);
    const input = args.input;

    // Verify user is leader or officer of the crew
    const membership = await queryOne<{ role: string }>(
      `SELECT role FROM crew_members WHERE crew_id = $1 AND user_id = $2 AND status = 'active'`,
      [input.crewId, userId]
    );

    if (!membership || !['leader', 'officer'].includes(membership.role)) {
      throw new GraphQLError('Only crew leaders and officers can create challenges', {
        extensions: { code: 'FORBIDDEN' },
      });
    }

    const result = await queryOne<{
      id: string;
      crew_id: string;
      challenge_type: string;
      opponent_crew_id: string | null;
      title: string;
      description: string | null;
      metric_type: string;
      goal_value: number | null;
      current_value: number;
      starts_at: Date;
      ends_at: Date;
      status: string;
      rewards: Record<string, unknown>;
      created_at: Date;
    }>(
      `INSERT INTO crew_challenges (
        crew_id, created_by, challenge_type, opponent_crew_id, title, description,
        metric_type, goal_value, starts_at, ends_at, rewards
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *`,
      [
        input.crewId,
        userId,
        input.challengeType,
        input.opponentCrewId || null,
        input.title,
        input.description || null,
        input.metricType,
        input.goalValue || null,
        input.startsAt,
        input.endsAt,
        JSON.stringify(input.rewards || {}),
      ]
    );

    if (!result) {
      throw new GraphQLError('Failed to create challenge', {
        extensions: { code: 'INTERNAL_SERVER_ERROR' },
      });
    }

    return {
      id: result.id,
      crewId: result.crew_id,
      challengeType: result.challenge_type,
      opponentCrewId: result.opponent_crew_id,
      title: result.title,
      description: result.description,
      metricType: result.metric_type,
      goalValue: result.goal_value,
      currentValue: Number(result.current_value) || 0,
      startsAt: result.starts_at,
      endsAt: result.ends_at,
      status: result.status,
      rewards: result.rewards,
      createdAt: result.created_at,
    };
  },

  contributeToChallenge: async (
    _: unknown,
    args: { challengeId: string; value: number; workoutId?: string },
    context: Context
  ) => {
    const { userId } = requireAuth(context);

    // Get challenge and verify it's active
    const challenge = await queryOne<{
      id: string;
      crew_id: string;
      status: string;
    }>(
      `SELECT id, crew_id, status FROM crew_challenges WHERE id = $1`,
      [args.challengeId]
    );

    if (!challenge) {
      throw new GraphQLError('Challenge not found', {
        extensions: { code: 'NOT_FOUND' },
      });
    }

    if (challenge.status !== 'active') {
      throw new GraphQLError('Challenge is not active', {
        extensions: { code: 'BAD_USER_INPUT' },
      });
    }

    // Verify user is a member of the crew
    const membership = await queryOne<{ id: string }>(
      `SELECT id FROM crew_members WHERE crew_id = $1 AND user_id = $2 AND status = 'active'`,
      [challenge.crew_id, userId]
    );

    if (!membership) {
      throw new GraphQLError('You are not a member of this crew', {
        extensions: { code: 'FORBIDDEN' },
      });
    }

    const result = await queryOne<{
      id: string;
      contribution_value: number;
      created_at: Date;
    }>(
      `INSERT INTO challenge_contributions (challenge_id, user_id, crew_id, workout_id, contribution_value)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, contribution_value, created_at`,
      [args.challengeId, userId, challenge.crew_id, args.workoutId || null, args.value]
    );

    if (!result) {
      throw new GraphQLError('Failed to record contribution', {
        extensions: { code: 'INTERNAL_SERVER_ERROR' },
      });
    }

    return {
      id: result.id,
      value: Number(result.contribution_value),
      createdAt: result.created_at,
    };
  },

  sendCrewChatMessage: async (
    _: unknown,
    args: { crewId: string; content: string; messageType?: string; replyToId?: string },
    context: Context
  ) => {
    const { userId } = requireAuth(context);

    // Verify user is a member of this crew
    const membership = await queryOne<{ id: string }>(
      `SELECT id FROM crew_members WHERE crew_id = $1 AND user_id = $2 AND status = 'active'`,
      [args.crewId, userId]
    );

    if (!membership) {
      throw new GraphQLError('Not a member of this crew', {
        extensions: { code: 'FORBIDDEN' },
      });
    }

    const result = await queryOne<{
      id: string;
      content: string;
      message_type: string;
      reply_to_id: string | null;
      created_at: Date;
    }>(
      `INSERT INTO crew_chat_messages (crew_id, user_id, content, message_type, reply_to_id)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, content, message_type, reply_to_id, created_at`,
      [args.crewId, userId, args.content, args.messageType || 'text', args.replyToId || null]
    );

    if (!result) {
      throw new GraphQLError('Failed to send message', {
        extensions: { code: 'INTERNAL_SERVER_ERROR' },
      });
    }

    const user = await getUserSummary(userId);

    return {
      id: result.id,
      content: result.content,
      messageType: result.message_type,
      replyToId: result.reply_to_id,
      createdAt: result.created_at,
      sender: user,
      isMine: true,
    };
  },

  reactToCrewMessage: async (
    _: unknown,
    args: { messageId: string; emoji: string },
    context: Context
  ) => {
    const { userId } = requireAuth(context);

    // Get message and verify user is in the crew
    const message = await queryOne<{
      id: string;
      crew_id: string;
      reactions: Record<string, string[]>;
    }>(
      `SELECT id, crew_id, reactions FROM crew_chat_messages WHERE id = $1`,
      [args.messageId]
    );

    if (!message) {
      throw new GraphQLError('Message not found', {
        extensions: { code: 'NOT_FOUND' },
      });
    }

    const membership = await queryOne<{ id: string }>(
      `SELECT id FROM crew_members WHERE crew_id = $1 AND user_id = $2 AND status = 'active'`,
      [message.crew_id, userId]
    );

    if (!membership) {
      throw new GraphQLError('Not a member of this crew', {
        extensions: { code: 'FORBIDDEN' },
      });
    }

    // Update reactions
    const reactions = message.reactions || {};
    if (!reactions[args.emoji]) {
      reactions[args.emoji] = [];
    }

    const userIndex = reactions[args.emoji].indexOf(userId);
    if (userIndex === -1) {
      reactions[args.emoji].push(userId);
    } else {
      reactions[args.emoji].splice(userIndex, 1);
      if (reactions[args.emoji].length === 0) {
        delete reactions[args.emoji];
      }
    }

    await query(
      `UPDATE crew_chat_messages SET reactions = $1 WHERE id = $2`,
      [JSON.stringify(reactions), args.messageId]
    );

    return { success: true, reactions };
  },

  pinCrewMessage: async (_: unknown, args: { messageId: string }, context: Context) => {
    const { userId } = requireAuth(context);

    // Get message and verify user is leader/officer
    const message = await queryOne<{
      id: string;
      crew_id: string;
      is_pinned: boolean;
    }>(
      `SELECT id, crew_id, is_pinned FROM crew_chat_messages WHERE id = $1`,
      [args.messageId]
    );

    if (!message) {
      throw new GraphQLError('Message not found', {
        extensions: { code: 'NOT_FOUND' },
      });
    }

    const membership = await queryOne<{ role: string }>(
      `SELECT role FROM crew_members WHERE crew_id = $1 AND user_id = $2 AND status = 'active'`,
      [message.crew_id, userId]
    );

    if (!membership || !['leader', 'officer'].includes(membership.role)) {
      throw new GraphQLError('Only leaders and officers can pin messages', {
        extensions: { code: 'FORBIDDEN' },
      });
    }

    await query(
      `UPDATE crew_chat_messages SET is_pinned = $1 WHERE id = $2`,
      [!message.is_pinned, args.messageId]
    );

    return { success: true, isPinned: !message.is_pinned };
  },

  deleteCrewMessage: async (_: unknown, args: { messageId: string }, context: Context) => {
    const { userId, isAdmin } = requireAuth(context);

    const message = await queryOne<{
      id: string;
      user_id: string;
      crew_id: string;
    }>(
      `SELECT id, user_id, crew_id FROM crew_chat_messages WHERE id = $1`,
      [args.messageId]
    );

    if (!message) {
      throw new GraphQLError('Message not found', {
        extensions: { code: 'NOT_FOUND' },
      });
    }

    // Check if user owns the message or is leader/officer
    if (message.user_id !== userId && !isAdmin) {
      const membership = await queryOne<{ role: string }>(
        `SELECT role FROM crew_members WHERE crew_id = $1 AND user_id = $2 AND status = 'active'`,
        [message.crew_id, userId]
      );

      if (!membership || !['leader', 'officer'].includes(membership.role)) {
        throw new GraphQLError('Not authorized to delete this message', {
          extensions: { code: 'FORBIDDEN' },
        });
      }
    }

    await query(
      `UPDATE crew_chat_messages SET is_deleted = true, deleted_by = $1 WHERE id = $2`,
      [userId, args.messageId]
    );

    return { success: true };
  },
};
