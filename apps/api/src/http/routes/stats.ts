/**
 * Character Stats Routes (Fastify)
 *
 * D&D-style character stats endpoints for:
 * - Getting current stats
 * - Stats history for progress charts
 * - Leaderboards with geographic filtering
 * - Extended profile management (gender, location)
 */

import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { authenticate, optionalAuth } from './auth';
import { statsService, StatType } from '../../modules/stats';
import { loggers } from '../../lib/logger';

const log = loggers.db;

// Schemas
const updateProfileSchema = z.object({
  gender: z.enum(['male', 'female', 'non_binary', 'prefer_not_to_say']).optional(),
  city: z.string().max(100).optional(),
  county: z.string().max(100).optional(),
  state: z.string().max(100).optional(),
  country: z.string().max(100).optional(),
  countryCode: z.string().max(3).optional(),
  leaderboardOptIn: z.boolean().optional(),
  profileVisibility: z.enum(['public', 'friends', 'private']).optional(),
});

const leaderboardQuerySchema = z.object({
  stat: z.enum(['strength', 'constitution', 'dexterity', 'power', 'endurance', 'vitality']).optional(),
  scope: z.enum(['global', 'country', 'state', 'city']).optional(),
  scopeValue: z.string().optional(),
  gender: z.enum(['male', 'female', 'non_binary']).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  offset: z.coerce.number().int().min(0).optional(),
});

export async function registerStatsRoutes(app: FastifyInstance) {
  /**
   * GET /stats/me
   * Get current user's character stats and rankings
   */
  app.get('/stats/me', { preHandler: authenticate }, async (request, reply) => {
    const userId = request.user!.userId;

    const [stats, rankings] = await Promise.all([
      statsService.getUserStats(userId),
      statsService.getUserRankings(userId),
    ]);

    return reply.send({
      data: {
        stats: {
          strength: Number(stats.strength),
          constitution: Number(stats.constitution),
          dexterity: Number(stats.dexterity),
          power: Number(stats.power),
          endurance: Number(stats.endurance),
          vitality: Number(stats.vitality),
          lastCalculatedAt: stats.lastCalculatedAt,
        },
        rankings,
      },
    });
  });

  /**
   * GET /stats/user/:userId
   * Get another user's stats (if profile is public)
   */
  app.get('/stats/user/:userId', { preHandler: optionalAuth }, async (request, reply) => {
    const { userId } = request.params as { userId: string };

    const profile = await statsService.getExtendedProfile(userId);

    if (profile.profileVisibility !== 'public' && request.user?.userId !== userId) {
      return reply.status(403).send({
        error: { code: 'FORBIDDEN', message: 'This profile is private', statusCode: 403 },
      });
    }

    const stats = await statsService.getUserStats(userId);

    return reply.send({
      data: {
        userId,
        stats: {
          strength: Number(stats.strength),
          constitution: Number(stats.constitution),
          dexterity: Number(stats.dexterity),
          power: Number(stats.power),
          endurance: Number(stats.endurance),
          vitality: Number(stats.vitality),
        },
      },
    });
  });

  /**
   * GET /stats/history
   * Get user's stats history for progress charts
   */
  app.get('/stats/history', { preHandler: authenticate }, async (request, reply) => {
    const query = request.query as { days?: string };
    const days = Math.min(parseInt(query.days || '30'), 365);
    const userId = request.user!.userId;

    const history = await statsService.getStatsHistory(userId, days);

    return reply.send({
      data: history,
      meta: { days },
    });
  });

  /**
   * POST /stats/recalculate
   * Force recalculate all stats from workout history
   */
  app.post('/stats/recalculate', { preHandler: authenticate }, async (request, reply) => {
    const userId = request.user!.userId;

    log.info({ userId }, 'Recalculating user stats');

    const stats = await statsService.recalculateAllStats(userId);

    return reply.send({
      data: {
        stats: {
          strength: Number(stats.strength),
          constitution: Number(stats.constitution),
          dexterity: Number(stats.dexterity),
          power: Number(stats.power),
          endurance: Number(stats.endurance),
          vitality: Number(stats.vitality),
        },
        message: 'Stats recalculated from workout history',
      },
    });
  });

  /**
   * GET /stats/leaderboards
   * Get leaderboard rankings with filtering
   */
  app.get('/stats/leaderboards', { preHandler: optionalAuth }, async (request, reply) => {
    const parsed = leaderboardQuerySchema.safeParse(request.query);

    if (!parsed.success) {
      return reply.status(400).send({
        error: { code: 'VALIDATION', message: 'Invalid query parameters', statusCode: 400 },
      });
    }

    const { stat, scope, scopeValue, gender, limit, offset } = parsed.data;

    const leaderboard = await statsService.getLeaderboard({
      statType: (stat as StatType) || 'vitality',
      scope: scope || 'global',
      scopeValue,
      gender,
      limit: limit || 50,
      offset: offset || 0,
    });

    return reply.send({
      data: leaderboard,
      meta: {
        stat: stat || 'vitality',
        scope: scope || 'global',
        scopeValue,
        gender,
        limit: limit || 50,
        offset: offset || 0,
      },
    });
  });

  /**
   * GET /stats/leaderboards/me
   * Get current user's rankings across all scopes
   */
  app.get('/stats/leaderboards/me', { preHandler: authenticate }, async (request, reply) => {
    const userId = request.user!.userId;

    const [rankings, profile] = await Promise.all([
      statsService.getUserRankings(userId),
      statsService.getExtendedProfile(userId),
    ]);

    return reply.send({
      data: {
        rankings,
        profile: {
          gender: profile.gender,
          city: profile.city,
          state: profile.state,
          country: profile.country,
        },
      },
    });
  });

  /**
   * GET /stats/profile/extended
   * Get user's extended profile (gender, location)
   */
  app.get('/stats/profile/extended', { preHandler: authenticate }, async (request, reply) => {
    const userId = request.user!.userId;

    const profile = await statsService.getExtendedProfile(userId);

    return reply.send({
      data: {
        gender: profile.gender,
        city: profile.city,
        county: profile.county,
        state: profile.state,
        country: profile.country,
        countryCode: profile.countryCode,
        leaderboardOptIn: profile.leaderboardOptIn,
        profileVisibility: profile.profileVisibility,
      },
    });
  });

  /**
   * PUT /stats/profile/extended
   * Update user's extended profile
   */
  app.put('/stats/profile/extended', { preHandler: authenticate }, async (request, reply) => {
    const userId = request.user!.userId;
    const parsed = updateProfileSchema.safeParse(request.body);

    if (!parsed.success) {
      return reply.status(400).send({
        error: { code: 'VALIDATION', message: 'Invalid request body', statusCode: 400 },
      });
    }

    const profile = await statsService.updateExtendedProfile(userId, parsed.data);

    return reply.send({
      data: {
        gender: profile.gender,
        city: profile.city,
        county: profile.county,
        state: profile.state,
        country: profile.country,
        countryCode: profile.countryCode,
        leaderboardOptIn: profile.leaderboardOptIn,
        profileVisibility: profile.profileVisibility,
      },
    });
  });

  /**
   * GET /stats/info
   * Get information about the stats system (public endpoint)
   */
  app.get('/stats/info', async (_request, reply) => {
    return reply.send({
      data: {
        stats: [
          {
            id: 'strength',
            name: 'Strength',
            abbr: 'STR',
            description: 'Raw lifting power from heavy compound lifts',
            color: '#FF3366',
          },
          {
            id: 'constitution',
            name: 'Constitution',
            abbr: 'CON',
            description: 'Recovery & resilience from workout consistency',
            color: '#00CC66',
          },
          {
            id: 'dexterity',
            name: 'Dexterity',
            abbr: 'DEX',
            description: 'Movement skill from bodyweight exercises',
            color: '#FFB800',
          },
          {
            id: 'power',
            name: 'Power',
            abbr: 'PWR',
            description: 'Explosive force from dynamic movements',
            color: '#FF6B00',
          },
          {
            id: 'endurance',
            name: 'Endurance',
            abbr: 'END',
            description: 'Stamina from high-rep sets and conditioning',
            color: '#0066FF',
          },
          {
            id: 'vitality',
            name: 'Vitality',
            abbr: 'VIT',
            description: 'Overall health - average of all stats',
            color: '#9333EA',
          },
        ],
      },
    });
  });
}
