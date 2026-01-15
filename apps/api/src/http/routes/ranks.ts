/**
 * Ranks Routes (Fastify)
 *
 * User ranking and XP system endpoints:
 * - Get rank definitions
 * - Get user rank info
 * - Get XP history
 * - XP-based leaderboards
 * - Veteran badge info
 */

import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { authenticate, optionalAuth } from './auth';
import { rankService, xpService, RankName } from '../../modules/ranks';
import { loggers } from '../../lib/logger';
import { queryOne } from '../../db/client';

const _log = loggers.economy;

// Schemas
const leaderboardQuerySchema = z.object({
  scope: z.enum(['global', 'country', 'state', 'city']).optional().default('global'),
  country: z.string().max(100).optional(),
  state: z.string().max(100).optional(),
  city: z.string().max(100).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional().default(50),
  offset: z.coerce.number().int().min(0).optional().default(0),
});

const xpHistoryQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).optional().default(50),
  offset: z.coerce.number().int().min(0).optional().default(0),
  sourceType: z.enum(['workout', 'goal', 'archetype', 'streak', 'achievement', 'special', 'backfill', 'admin']).optional(),
});

export async function registerRanksRoutes(app: FastifyInstance) {
  /**
   * GET /ranks/definitions
   * Get all rank tier definitions
   */
  app.get('/ranks/definitions', async (_request, reply) => {
    const ranks = await rankService.getRankDefinitions();

    return reply.send({
      data: ranks.map((r) => ({
        id: r.id,
        tier: r.tier,
        name: r.name,
        displayName: r.displayName,
        xpThreshold: r.xpThreshold,
        badgeIcon: r.badgeIcon,
        badgeColor: r.badgeColor,
        perks: r.perks,
      })),
    });
  });

  /**
   * GET /ranks/me
   * Get current user's rank info, XP, and progress
   */
  app.get('/ranks/me', { preHandler: authenticate }, async (request, reply) => {
    const userId = request.user!.userId;

    const rankInfo = await rankService.getUserRankInfo(userId);

    if (!rankInfo) {
      return reply.status(404).send({
        error: { code: 'NOT_FOUND', message: 'User not found', statusCode: 404 },
      });
    }

    // Get daily and weekly XP
    const [dailyXp, weeklyXp] = await Promise.all([
      xpService.getDailyXp(userId),
      xpService.getWeeklyXp(userId),
    ]);

    return reply.send({
      data: {
        userId: rankInfo.userId,
        currentRank: rankInfo.currentRank,
        currentTier: rankInfo.currentTier,
        displayName: rankInfo.currentRankDef.displayName,
        totalXp: rankInfo.totalXp,
        xpToNextRank: rankInfo.xpToNextRank,
        progressPercent: Math.round(rankInfo.progressPercent * 100) / 100,
        badgeIcon: rankInfo.currentRankDef.badgeIcon,
        badgeColor: rankInfo.currentRankDef.badgeColor,
        perks: rankInfo.currentRankDef.perks,
        nextRank: rankInfo.nextRank ? {
          name: rankInfo.nextRank.name,
          displayName: rankInfo.nextRank.displayName,
          xpThreshold: rankInfo.nextRank.xpThreshold,
          badgeIcon: rankInfo.nextRank.badgeIcon,
          badgeColor: rankInfo.nextRank.badgeColor,
        } : null,
        veteranTier: rankInfo.veteranTier,
        veteranLabel: rankInfo.veteranLabel,
        rankUpdatedAt: rankInfo.rankUpdatedAt,
        xpToday: dailyXp,
        xpThisWeek: weeklyXp,
      },
    });
  });

  /**
   * GET /ranks/user/:userId
   * Get another user's rank info (respects privacy)
   */
  app.get('/ranks/user/:userId', { preHandler: optionalAuth }, async (request, reply) => {
    const { userId } = request.params as { userId: string };
    const viewerId = request.user?.userId;

    const rankInfo = await rankService.getUserRankInfo(userId);

    if (!rankInfo) {
      return reply.status(404).send({
        error: { code: 'NOT_FOUND', message: 'User not found', statusCode: 404 },
      });
    }

    // Check if viewing own profile (always allowed)
    const isOwnProfile = viewerId === userId;

    // Check user_field_visibility.show_rank for privacy
    if (!isOwnProfile) {
      const visibility = await queryOne<{ show_rank: boolean }>(
        'SELECT show_rank FROM user_field_visibility WHERE user_id = $1',
        [userId]
      );
      // If visibility record exists and show_rank is false, hide rank info
      if (visibility && visibility.show_rank === false) {
        return reply.status(403).send({
          error: { code: 'PRIVATE', message: 'User rank information is private', statusCode: 403 },
        });
      }
    }

    return reply.send({
      data: {
        userId: rankInfo.userId,
        currentRank: rankInfo.currentRank,
        currentTier: rankInfo.currentTier,
        displayName: rankInfo.currentRankDef.displayName,
        totalXp: rankInfo.totalXp,
        progressPercent: Math.round(rankInfo.progressPercent * 100) / 100,
        badgeIcon: rankInfo.currentRankDef.badgeIcon,
        badgeColor: rankInfo.currentRankDef.badgeColor,
        veteranTier: rankInfo.veteranTier,
        veteranLabel: rankInfo.veteranLabel,
        // Only show detailed progress to self
        ...(isOwnProfile && {
          xpToNextRank: rankInfo.xpToNextRank,
          nextRank: rankInfo.nextRank ? {
            name: rankInfo.nextRank.name,
            displayName: rankInfo.nextRank.displayName,
            xpThreshold: rankInfo.nextRank.xpThreshold,
          } : null,
        }),
      },
    });
  });

  /**
   * GET /ranks/history
   * Get user's XP history (paginated)
   */
  app.get('/ranks/history', { preHandler: authenticate }, async (request, reply) => {
    const userId = request.user!.userId;
    const parsed = xpHistoryQuerySchema.safeParse(request.query);

    if (!parsed.success) {
      return reply.status(400).send({
        error: { code: 'VALIDATION_ERROR', message: parsed.error.message, statusCode: 400 },
      });
    }

    const { limit, offset, sourceType } = parsed.data;

    const history = await xpService.getHistory(userId, { limit, offset, sourceType });

    return reply.send({
      data: history.entries.map((e) => ({
        id: e.id,
        amount: e.amount,
        sourceType: e.sourceType,
        sourceId: e.sourceId,
        reason: e.reason,
        createdAt: e.createdAt,
      })),
      pagination: {
        total: history.total,
        limit,
        offset,
        hasMore: offset + history.entries.length < history.total,
      },
    });
  });

  /**
   * GET /ranks/leaderboard
   * Get XP-based leaderboard with location filtering
   */
  app.get('/ranks/leaderboard', { preHandler: optionalAuth }, async (request, reply) => {
    const parsed = leaderboardQuerySchema.safeParse(request.query);

    if (!parsed.success) {
      return reply.status(400).send({
        error: { code: 'VALIDATION_ERROR', message: parsed.error.message, statusCode: 400 },
      });
    }

    const { scope, country, state, city, limit, offset } = parsed.data;

    // Build location filter based on scope
    const locationFilter: { country?: string; state?: string; city?: string } = {};
    if (scope !== 'global') {
      if (country) locationFilter.country = country;
      if (scope === 'state' || scope === 'city') {
        if (state) locationFilter.state = state;
      }
      if (scope === 'city') {
        if (city) locationFilter.city = city;
      }
    }

    const leaderboard = await rankService.getXpLeaderboard({
      limit,
      offset,
      ...locationFilter,
    });

    // Find current user's rank if authenticated
    let userRank: number | null = null;
    if (request.user) {
      const userEntry = leaderboard.entries.find((e) => e.userId === request.user!.userId);
      if (userEntry) {
        userRank = userEntry.rank;
      }
    }

    return reply.send({
      data: {
        entries: leaderboard.entries.map((e) => ({
          rank: e.rank,
          userId: e.userId,
          username: e.username,
          displayName: e.displayName,
          avatarUrl: e.avatarUrl,
          totalXp: e.totalXp,
          currentRank: e.currentRank,
          badgeIcon: getBadgeIcon(e.currentRank),
          badgeColor: getBadgeColor(e.currentRank),
          veteranTier: e.veteranTier,
          country: e.country,
        })),
        userRank,
      },
      pagination: {
        total: leaderboard.total,
        limit,
        offset,
        hasMore: offset + leaderboard.entries.length < leaderboard.total,
      },
      meta: {
        scope,
        filters: locationFilter,
      },
    });
  });

  /**
   * GET /ranks/veteran-badge
   * Get current user's veteran badge info
   */
  app.get('/ranks/veteran-badge', { preHandler: authenticate }, async (request, reply) => {
    const userId = request.user!.userId;

    const badge = await rankService.getVeteranBadge(userId);

    if (!badge) {
      return reply.status(404).send({
        error: { code: 'NOT_FOUND', message: 'User not found', statusCode: 404 },
      });
    }

    return reply.send({
      data: {
        tier: badge.tier,
        label: badge.label,
        icon: badge.icon,
        color: badge.color,
        monthsActive: badge.monthsActive,
        nextTier: badge.tier < 3 ? {
          tier: badge.tier + 1,
          monthsRequired: badge.tier === 0 ? 6 : badge.tier === 1 ? 12 : 24,
          monthsRemaining: badge.tier === 0 ? 6 - badge.monthsActive :
            badge.tier === 1 ? 12 - badge.monthsActive :
            badge.tier === 2 ? 24 - badge.monthsActive : 0,
        } : null,
      },
    });
  });

  /**
   * POST /ranks/refresh
   * Manually refresh the XP leaderboard materialized view (admin only)
   */
  app.post('/ranks/refresh', { preHandler: authenticate }, async (request, reply) => {
    // Check for admin role
    if (!request.user?.roles?.includes('admin')) {
      return reply.status(403).send({
        error: { code: 'FORBIDDEN', message: 'Admin access required', statusCode: 403 },
      });
    }

    await rankService.refreshRankings();

    return reply.send({
      data: { message: 'XP rankings refreshed successfully' },
    });
  });

  /**
   * POST /ranks/update-veterans
   * Update veteran tiers for all users (admin only, typically run by cron)
   */
  app.post('/ranks/update-veterans', { preHandler: authenticate }, async (request, reply) => {
    // Check for admin role
    if (!request.user?.roles?.includes('admin')) {
      return reply.status(403).send({
        error: { code: 'FORBIDDEN', message: 'Admin access required', statusCode: 403 },
      });
    }

    const result = await rankService.updateAllVeteranTiers();

    return reply.send({
      data: {
        message: 'Veteran tiers updated',
        usersUpdated: result.updated,
      },
    });
  });
}

// Helper functions for badge info (fallback if not in cache)
function getBadgeIcon(rank: RankName): string {
  const icons: Record<RankName, string> = {
    novice: 'chevron-outline',
    trainee: 'chevron-1',
    apprentice: 'chevron-2',
    practitioner: 'chevron-3',
    journeyperson: 'star-bronze',
    expert: 'star-silver',
    master: 'star-gold',
    grandmaster: 'shield-diamond',
  };
  return icons[rank] || 'chevron-outline';
}

function getBadgeColor(rank: RankName): string {
  const colors: Record<RankName, string> = {
    novice: '#6B7280',
    trainee: '#22C55E',
    apprentice: '#3B82F6',
    practitioner: '#8B5CF6',
    journeyperson: '#EAB308',
    expert: '#F97316',
    master: '#EF4444',
    grandmaster: '#EC4899',
  };
  return colors[rank] || '#6B7280';
}

export default registerRanksRoutes;
