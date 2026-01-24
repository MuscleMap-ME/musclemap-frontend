/**
 * User Domain Resolvers
 *
 * Handles user-related queries and mutations:
 * - me (current user)
 * - profile (public profile)
 * - user (by ID)
 * - userByUsername
 *
 * Uses DataLoaders for batched queries.
 */

import { GraphQLError } from 'graphql';
import { queryOne, queryAll } from '../../db/client';
import { economyService } from '../../modules/economy';
import {
  WEALTH_TIERS_BY_LEVEL,
  calculateWealthTier,
  creditsToNextTier,
  wealthTierProgress,
  type WealthTierLevel,
} from '@musclemap/core';
import type { Context } from './types';

// ============================================
// HELPERS
// ============================================

function buildWealthTierResponse(credits: number) {
  const tier = calculateWealthTier(credits) as WealthTierLevel;
  const tierInfo = WEALTH_TIERS_BY_LEVEL[tier];
  return {
    tier,
    name: tierInfo?.name || 'Unknown',
    color: tierInfo?.color || '#888888',
    icon: tierInfo?.icon || 'circle',
    credits,
    toNextTier: creditsToNextTier(credits),
    progress: wealthTierProgress(credits),
  };
}

// ============================================
// QUERIES
// ============================================

export const userQueries = {
  /**
   * Get current authenticated user
   */
  me: async (_: unknown, __: unknown, context: Context) => {
    if (!context.user) return null;
    const { userId } = context.user;

    // Query user with all needed fields (DataLoader only has basic fields)
    const user = await queryOne<{
      id: string;
      email: string;
      username: string;
      display_name: string | null;
      avatar_url: string | null;
      bio: string | null;
      social_links: Record<string, string> | null;
      current_identity_id: string | null;
      level: number;
      xp: number;
      roles: string[];
      created_at: Date;
    }>(
      `SELECT id, email, username, display_name, avatar_url, bio, social_links, current_identity_id,
              COALESCE(current_level, 1) as level, COALESCE(total_xp, 0) as xp, roles, created_at
       FROM users WHERE id = $1`,
      [userId]
    );

    if (!user) return null;

    // Get credit balance for wealth tier calculation
    const credits = await economyService.getBalance(userId);

    return {
      id: user.id,
      email: user.email,
      username: user.username,
      displayName: user.display_name,
      avatar: user.avatar_url,
      bio: user.bio || null,
      socialLinks: user.social_links || null,
      identityId: user.current_identity_id || null,
      level: user.level || 1,
      xp: user.xp || 0,
      wealthTier: buildWealthTierResponse(credits),
      roles: user.roles || ['user'],
      createdAt: user.created_at,
    };
  },

  /**
   * Get user by ID (using DataLoader)
   */
  user: async (_: unknown, args: { id: string }, context: Context) => {
    // Use DataLoader for batched, cached lookup
    const user = await context.loaders.user.load(args.id);
    if (!user) return null;

    return {
      id: user.id,
      username: user.username,
      displayName: user.display_name,
      avatar: user.avatar_url,
      createdAt: user.created_at,
    };
  },

  /**
   * Get user by username (using DataLoader)
   */
  userByUsername: async (_: unknown, args: { username: string }, context: Context) => {
    const user = await context.loaders.userByUsername.load(args.username);
    if (!user) return null;

    return {
      id: user.id,
      username: user.username,
      displayName: user.display_name,
      avatar: user.avatar_url,
      createdAt: user.created_at,
    };
  },

  /**
   * Get public profile by username
   */
  profile: async (_: unknown, args: { username?: string }, context: Context) => {
    const username = args.username;

    // If no username provided, return current user's profile
    if (!username) {
      if (!context.user) {
        throw new GraphQLError('Authentication required', {
          extensions: { code: 'UNAUTHENTICATED' },
        });
      }
      const user = await context.loaders.user.load(context.user.userId);
      if (!user) return null;

      const credits = await economyService.getBalance(context.user.userId);
      return {
        id: user.id,
        username: user.username,
        displayName: user.display_name,
        avatar: user.avatar_url,
        level: 1, // Would need to fetch from users table
        xp: 0,
        wealthTier: buildWealthTierResponse(credits),
        createdAt: user.created_at,
      };
    }

    // Lookup by username
    const user = await context.loaders.userByUsername.load(username);
    if (!user) return null;

    const credits = await economyService.getBalance(user.id);
    return {
      id: user.id,
      username: user.username,
      displayName: user.display_name,
      avatar: user.avatar_url,
      level: 1,
      xp: 0,
      wealthTier: buildWealthTierResponse(credits),
      createdAt: user.created_at,
    };
  },

  /**
   * Search users by partial username/display name
   */
  searchUsers: async (_: unknown, args: { query: string; limit?: number }, context: Context) => {
    const limit = Math.min(args.limit || 20, 50);
    const searchTerm = `%${args.query}%`;

    const users = await queryAll<{
      id: string;
      username: string;
      display_name: string | null;
      avatar_url: string | null;
    }>(
      `SELECT id, username, display_name, avatar_url
       FROM users
       WHERE username ILIKE $1 OR display_name ILIKE $1
       ORDER BY username
       LIMIT $2`,
      [searchTerm, limit]
    );

    return users.map(u => ({
      id: u.id,
      username: u.username,
      displayName: u.display_name,
      avatar: u.avatar_url,
    }));
  },
};

// ============================================
// MUTATIONS
// ============================================

export const userMutations = {
  /**
   * Update current user's profile
   */
  updateProfile: async (
    _: unknown,
    args: {
      displayName?: string;
      bio?: string;
      avatar?: string;
    },
    context: Context
  ) => {
    if (!context.user) {
      throw new GraphQLError('Authentication required', {
        extensions: { code: 'UNAUTHENTICATED' },
      });
    }
    const { userId } = context.user;

    const updates: string[] = [];
    const values: (string | null)[] = [];
    let paramIndex = 1;

    if (args.displayName !== undefined) {
      updates.push(`display_name = $${paramIndex++}`);
      values.push(args.displayName);
    }
    if (args.bio !== undefined) {
      updates.push(`bio = $${paramIndex++}`);
      values.push(args.bio);
    }
    if (args.avatar !== undefined) {
      updates.push(`avatar_url = $${paramIndex++}`);
      values.push(args.avatar);
    }

    if (updates.length === 0) {
      // Return current user data if no updates
      return userQueries.me(_, {}, context);
    }

    values.push(userId);
    await queryOne(
      `UPDATE users SET ${updates.join(', ')}, updated_at = NOW() WHERE id = $${paramIndex}`,
      values
    );

    // Clear the loader cache for this user
    context.loaders.user.clear(userId);

    return userQueries.me(_, {}, context);
  },
};

// ============================================
// TYPE RESOLVERS
// ============================================

export const userTypeResolvers = {
  User: {
    // Resolve credit balance using DataLoader
    creditBalance: async (parent: { id: string }, _: unknown, context: Context) => {
      return context.loaders.creditBalance.load(parent.id);
    },

    // Resolve workout count using DataLoader
    workoutCount: async (parent: { id: string }, _: unknown, context: Context) => {
      return context.loaders.workoutCount.load(parent.id);
    },

    // Resolve total TU using DataLoader
    totalTu: async (parent: { id: string }, _: unknown, context: Context) => {
      return context.loaders.totalTU.load(parent.id);
    },
  },
};

export default {
  Query: userQueries,
  Mutation: userMutations,
  ...userTypeResolvers,
};
