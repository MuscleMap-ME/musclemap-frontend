/**
 * Admin Analytics Routes
 *
 * User analytics endpoints for the Empire control panel:
 * - GET /admin/analytics/dashboard - Summary stats overview
 * - GET /admin/analytics/users/new - New user signups (paginated)
 * - GET /admin/analytics/users/:id - Individual user deep-dive
 * - GET /admin/analytics/users/:id/timeline - User activity timeline
 * - GET /admin/analytics/users/:id/features - User's feature usage
 * - GET /admin/analytics/features - Feature popularity rankings
 * - GET /admin/analytics/features/:id - Feature detail
 * - GET /admin/analytics/features/:id/users - Users of a feature
 * - GET /admin/analytics/segments - All segments with counts
 * - GET /admin/analytics/segments/:id - Segment detail
 * - GET /admin/analytics/segments/:id/members - Segment members
 * - GET /admin/analytics/cohorts - Cohort retention matrix
 * - GET /admin/analytics/cohorts/:date - Specific cohort detail
 * - POST /admin/analytics/recalculate - Trigger manual recalculation
 *
 * SECURITY: All routes require admin authentication
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { authenticate, requireAdmin } from './auth';
import { queryOne, queryAll } from '../../db/client';
import { featureTracker } from '../../services/feature-tracker.service';
import { analyticsAggregation } from '../../services/analytics-aggregation.service';
import { loggers } from '../../lib/logger';

const log = loggers.http;

// ============================================
// SCHEMAS
// ============================================

const TimeRangeSchema = z.object({
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  timeRange: z.enum(['24h', '7d', '30d', '90d', 'all']).default('30d'),
});

const PaginationSchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().min(1).max(100).default(50),
});

const SortSchema = z.object({
  sortBy: z.string().optional(),
  order: z.enum(['asc', 'desc']).default('desc'),
});

const NewUsersQuerySchema = TimeRangeSchema.merge(PaginationSchema);

const FeaturesQuerySchema = TimeRangeSchema.merge(SortSchema).extend({
  category: z.string().optional(),
});

const SegmentMembersQuerySchema = PaginationSchema.merge(SortSchema);

// ============================================
// HELPERS
// ============================================

function getTimeRangeFilter(timeRange: string, startDate?: string, endDate?: string): { start: Date; end: Date } {
  const now = new Date();
  let start: Date;
  let end = endDate ? new Date(endDate) : now;

  if (startDate) {
    start = new Date(startDate);
  } else {
    switch (timeRange) {
      case '24h':
        start = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case '7d':
        start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case '90d':
        start = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      case 'all':
        start = new Date('2020-01-01');
        break;
      default:
        start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }
  }

  return { start, end };
}

function decodeCursor(cursor: string): { createdAt: string; id: string } | null {
  try {
    const decoded = Buffer.from(cursor, 'base64').toString('utf-8');
    const [createdAt, id] = decoded.split('|');
    return { createdAt, id };
  } catch {
    return null;
  }
}

function encodeCursor(createdAt: string, id: string): string {
  return Buffer.from(`${createdAt}|${id}`).toString('base64');
}

// ============================================
// ROUTES
// ============================================

export default async function adminAnalyticsRoutes(fastify: FastifyInstance): Promise<void> {
  // All routes require admin
  fastify.addHook('preHandler', authenticate);
  fastify.addHook('preHandler', requireAdmin);

  // ========================================
  // DASHBOARD
  // ========================================

  fastify.get(
    '/admin/analytics/dashboard',
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        // Get summary stats in parallel
        const [totalUsers, newUsers24h, newUsers7d, activeUsers30d, topSegments, featureCount] = await Promise.all([
          queryOne<{ count: string }>('SELECT COUNT(*) as count FROM users', []),
          queryOne<{ count: string }>(
            "SELECT COUNT(*) as count FROM users WHERE created_at > NOW() - INTERVAL '24 hours'",
            []
          ),
          queryOne<{ count: string }>(
            "SELECT COUNT(*) as count FROM users WHERE created_at > NOW() - INTERVAL '7 days'",
            []
          ),
          queryOne<{ count: string }>(
            `SELECT COUNT(DISTINCT user_id) as count
             FROM feature_usage_events
             WHERE created_at > NOW() - INTERVAL '30 days'`,
            []
          ),
          queryAll<{ segment_name: string; member_count: string }>(
            `SELECT segment_name, member_count
             FROM mv_segment_counts
             ORDER BY member_count DESC
             LIMIT 5`,
            []
          ),
          queryOne<{ count: string }>('SELECT COUNT(*) as count FROM feature_definitions WHERE is_active = TRUE', []),
        ]);

        // Get signup trend (last 7 days)
        const signupTrend = await queryAll<{ signup_date: string; signup_count: string }>(
          `SELECT signup_date, signup_count
           FROM mv_new_users_daily
           ORDER BY signup_date DESC
           LIMIT 7`,
          []
        );

        return reply.send({
          success: true,
          data: {
            summary: {
              totalUsers: parseInt(totalUsers?.count || '0'),
              newUsers24h: parseInt(newUsers24h?.count || '0'),
              newUsers7d: parseInt(newUsers7d?.count || '0'),
              activeUsers30d: parseInt(activeUsers30d?.count || '0'),
              featureCount: parseInt(featureCount?.count || '0'),
            },
            topSegments: topSegments.map((s) => ({
              name: s.segment_name,
              memberCount: parseInt(s.member_count),
            })),
            signupTrend: signupTrend.map((s) => ({
              date: s.signup_date,
              count: parseInt(s.signup_count),
            })),
            generatedAt: new Date().toISOString(),
          },
        });
      } catch (error) {
        log.error('Error fetching analytics dashboard', { error });
        return reply.status(500).send({ success: false, error: 'Failed to fetch dashboard' });
      }
    }
  );

  // ========================================
  // NEW USERS
  // ========================================

  fastify.get(
    '/admin/analytics/users/new',
    async (request: FastifyRequest<{ Querystring: z.infer<typeof NewUsersQuerySchema> }>, reply: FastifyReply) => {
      try {
        const query = NewUsersQuerySchema.parse(request.query);
        const { start, end } = getTimeRangeFilter(query.timeRange, query.startDate, query.endDate);
        const cursor = query.cursor ? decodeCursor(query.cursor) : null;

        // Build query with keyset pagination
        let sql = `
          SELECT
            u.id,
            u.username,
            u.email,
            u.display_name,
            u.avatar_url,
            u.created_at,
            u.current_archetype_id,
            u.total_xp,
            u.current_rank,
            u.wealth_tier,
            COALESCE(uas.engagement_score, 0) as engagement_score,
            COALESCE(uas.workouts_30d, 0) as workouts_30d,
            COALESCE(uas.last_activity_at, u.created_at) as last_activity_at
          FROM users u
          LEFT JOIN user_activity_summaries uas ON uas.user_id = u.id
          WHERE u.created_at >= $1 AND u.created_at <= $2
        `;
        const params: unknown[] = [start.toISOString(), end.toISOString()];

        if (cursor) {
          sql += ` AND (u.created_at, u.id) < ($3, $4)`;
          params.push(cursor.createdAt, cursor.id);
        }

        sql += ` ORDER BY u.created_at DESC, u.id DESC LIMIT $${params.length + 1}`;
        params.push(query.limit + 1); // Fetch one extra to determine if there's a next page

        const users = await queryAll<{
          id: string;
          username: string;
          email: string;
          display_name: string | null;
          avatar_url: string | null;
          created_at: string;
          current_archetype_id: string | null;
          total_xp: number;
          current_rank: string;
          wealth_tier: number;
          engagement_score: number;
          workouts_30d: number;
          last_activity_at: string;
        }>(sql, params);

        // Check for next page
        const hasNextPage = users.length > query.limit;
        const resultUsers = hasNextPage ? users.slice(0, -1) : users;

        // Generate next cursor
        const nextCursor =
          hasNextPage && resultUsers.length > 0
            ? encodeCursor(
                resultUsers[resultUsers.length - 1].created_at,
                resultUsers[resultUsers.length - 1].id
              )
            : null;

        return reply.send({
          success: true,
          data: {
            users: resultUsers.map((u) => ({
              id: u.id,
              username: u.username,
              email: u.email,
              displayName: u.display_name,
              avatarUrl: u.avatar_url,
              createdAt: u.created_at,
              archetypeId: u.current_archetype_id,
              totalXp: u.total_xp,
              rank: u.current_rank,
              wealthTier: u.wealth_tier,
              engagementScore: u.engagement_score,
              workouts30d: u.workouts_30d,
              lastActivityAt: u.last_activity_at,
            })),
            pagination: {
              hasNextPage,
              nextCursor,
              limit: query.limit,
            },
            timeRange: {
              start: start.toISOString(),
              end: end.toISOString(),
            },
          },
        });
      } catch (error) {
        log.error('Error fetching new users', { error });
        return reply.status(500).send({ success: false, error: 'Failed to fetch new users' });
      }
    }
  );

  // ========================================
  // USER DETAIL
  // ========================================

  fastify.get(
    '/admin/analytics/users/:id',
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      try {
        const { id } = request.params;

        // Get user details
        const user = await queryOne<{
          id: string;
          username: string;
          email: string;
          display_name: string | null;
          avatar_url: string | null;
          created_at: string;
          current_archetype_id: string | null;
          total_xp: number;
          current_rank: string;
          wealth_tier: number;
          roles: string;
          flags: string;
        }>(
          `SELECT id, username, email, display_name, avatar_url, created_at,
                  current_archetype_id, total_xp, current_rank, wealth_tier,
                  roles::TEXT, flags::TEXT
           FROM users WHERE id = $1`,
          [id]
        );

        if (!user) {
          return reply.status(404).send({ success: false, error: 'User not found' });
        }

        // Get activity summary
        const summary = await queryOne<{
          total_sessions: number;
          sessions_30d: number;
          total_workouts: number;
          workouts_30d: number;
          total_feature_interactions: number;
          feature_interactions_30d: number;
          unique_features_used: number;
          first_activity_at: string | null;
          last_activity_at: string | null;
          days_active_total: number;
          days_active_30d: number;
          engagement_score: number;
          engagement_trend: string;
          current_segments: string[];
        }>(
          `SELECT * FROM user_activity_summaries WHERE user_id = $1`,
          [id]
        );

        // Get feature usage breakdown
        const featureUsage = await featureTracker.getUserFeatureUsage(id, 30);

        // Get segment memberships
        const segments = await queryAll<{
          segment_id: string;
          segment_name: string;
          score: number;
          joined_at: string;
        }>(
          `SELECT usm.segment_id, us.name as segment_name, usm.score, usm.joined_at
           FROM user_segment_memberships usm
           JOIN user_segments us ON us.id = usm.segment_id
           WHERE usm.user_id = $1
           ORDER BY us.priority DESC`,
          [id]
        );

        // Get credit balance
        const credits = await queryOne<{ balance: number; lifetime_earned: number; lifetime_spent: number }>(
          `SELECT balance, lifetime_earned, lifetime_spent FROM credit_balances WHERE user_id = $1`,
          [id]
        );

        // Get streak info
        const streaks = await queryAll<{
          streak_type: string;
          current_streak: number;
          longest_streak: number;
        }>(
          `SELECT streak_type, current_streak, longest_streak FROM user_streaks WHERE user_id = $1`,
          [id]
        );

        // Get signup cohort info
        const cohortDate = user.created_at.split('T')[0];
        const cohort = await queryOne<{
          cohort_size: number;
          retained_d7: number;
          retained_d30: number;
        }>(
          `SELECT cohort_size, retained_d7, retained_d30 FROM signup_cohorts WHERE cohort_date = $1`,
          [cohortDate]
        );

        return reply.send({
          success: true,
          data: {
            user: {
              id: user.id,
              username: user.username,
              email: user.email,
              displayName: user.display_name,
              avatarUrl: user.avatar_url,
              createdAt: user.created_at,
              archetypeId: user.current_archetype_id,
              totalXp: user.total_xp,
              rank: user.current_rank,
              wealthTier: user.wealth_tier,
              roles: JSON.parse(user.roles || '[]'),
              flags: JSON.parse(user.flags || '{}'),
            },
            activity: summary
              ? {
                  totalSessions: summary.total_sessions,
                  sessions30d: summary.sessions_30d,
                  totalWorkouts: summary.total_workouts,
                  workouts30d: summary.workouts_30d,
                  totalFeatureInteractions: summary.total_feature_interactions,
                  featureInteractions30d: summary.feature_interactions_30d,
                  uniqueFeaturesUsed: summary.unique_features_used,
                  firstActivityAt: summary.first_activity_at,
                  lastActivityAt: summary.last_activity_at,
                  daysActiveTotal: summary.days_active_total,
                  daysActive30d: summary.days_active_30d,
                  engagementScore: summary.engagement_score,
                  engagementTrend: summary.engagement_trend,
                }
              : null,
            featureUsage: featureUsage.slice(0, 10), // Top 10
            segments: segments.map((s) => ({
              id: s.segment_id,
              name: s.segment_name,
              score: s.score,
              joinedAt: s.joined_at,
            })),
            credits: credits || { balance: 0, lifetimeEarned: 0, lifetimeSpent: 0 },
            streaks: streaks.map((s) => ({
              type: s.streak_type,
              current: s.current_streak,
              longest: s.longest_streak,
            })),
            cohort: cohort
              ? {
                  date: cohortDate,
                  size: cohort.cohort_size,
                  retainedD7: cohort.retained_d7,
                  retainedD30: cohort.retained_d30,
                }
              : null,
          },
        });
      } catch (error) {
        log.error('Error fetching user detail', { error });
        return reply.status(500).send({ success: false, error: 'Failed to fetch user detail' });
      }
    }
  );

  // ========================================
  // USER TIMELINE
  // ========================================

  fastify.get(
    '/admin/analytics/users/:id/timeline',
    async (
      request: FastifyRequest<{
        Params: { id: string };
        Querystring: z.infer<typeof PaginationSchema>;
      }>,
      reply: FastifyReply
    ) => {
      try {
        const { id } = request.params;
        const query = PaginationSchema.parse(request.query);
        const cursor = query.cursor ? decodeCursor(query.cursor) : null;

        let sql = `
          SELECT
            id,
            feature_id,
            feature_category,
            action,
            metadata::TEXT,
            duration_ms,
            created_at
          FROM feature_usage_events
          WHERE user_id = $1
        `;
        const params: unknown[] = [id];

        if (cursor) {
          sql += ` AND (created_at, id) < ($2, $3)`;
          params.push(cursor.createdAt, cursor.id);
        }

        sql += ` ORDER BY created_at DESC, id DESC LIMIT $${params.length + 1}`;
        params.push(query.limit + 1);

        const events = await queryAll<{
          id: string;
          feature_id: string;
          feature_category: string;
          action: string;
          metadata: string;
          duration_ms: number | null;
          created_at: string;
        }>(sql, params);

        const hasNextPage = events.length > query.limit;
        const resultEvents = hasNextPage ? events.slice(0, -1) : events;

        const nextCursor =
          hasNextPage && resultEvents.length > 0
            ? encodeCursor(
                resultEvents[resultEvents.length - 1].created_at,
                resultEvents[resultEvents.length - 1].id
              )
            : null;

        return reply.send({
          success: true,
          data: {
            events: resultEvents.map((e) => ({
              id: e.id,
              featureId: e.feature_id,
              featureCategory: e.feature_category,
              action: e.action,
              metadata: JSON.parse(e.metadata || '{}'),
              durationMs: e.duration_ms,
              createdAt: e.created_at,
            })),
            pagination: {
              hasNextPage,
              nextCursor,
              limit: query.limit,
            },
          },
        });
      } catch (error) {
        log.error('Error fetching user timeline', { error });
        return reply.status(500).send({ success: false, error: 'Failed to fetch timeline' });
      }
    }
  );

  // ========================================
  // FEATURES
  // ========================================

  fastify.get(
    '/admin/analytics/features',
    async (request: FastifyRequest<{ Querystring: z.infer<typeof FeaturesQuerySchema> }>, reply: FastifyReply) => {
      try {
        const query = FeaturesQuerySchema.parse(request.query);

        // Use materialized view for fast feature popularity
        let sql = `
          SELECT
            feature_id,
            feature_category,
            feature_name,
            total_uses,
            unique_users,
            uses_24h,
            uses_7d,
            uses_30d,
            users_24h,
            users_7d,
            users_30d,
            avg_duration_ms
          FROM mv_feature_popularity
        `;

        const params: unknown[] = [];
        if (query.category) {
          sql += ` WHERE feature_category = $1`;
          params.push(query.category);
        }

        // Sort
        const sortColumn =
          {
            uses: 'uses_30d',
            users: 'users_30d',
            total: 'total_uses',
          }[query.sortBy || 'uses'] || 'uses_30d';

        sql += ` ORDER BY ${sortColumn} ${query.order.toUpperCase()}`;

        const features = await queryAll<{
          feature_id: string;
          feature_category: string;
          feature_name: string;
          total_uses: string;
          unique_users: string;
          uses_24h: string;
          uses_7d: string;
          uses_30d: string;
          users_24h: string;
          users_7d: string;
          users_30d: string;
          avg_duration_ms: string | null;
        }>(sql, params);

        // Get category breakdown
        const categories = await queryAll<{ category: string; count: string }>(
          `SELECT feature_category as category, SUM(uses_30d) as count
           FROM mv_feature_popularity
           GROUP BY feature_category
           ORDER BY count DESC`,
          []
        );

        return reply.send({
          success: true,
          data: {
            features: features.map((f) => ({
              id: f.feature_id,
              category: f.feature_category,
              name: f.feature_name,
              totalUses: parseInt(f.total_uses),
              uniqueUsers: parseInt(f.unique_users),
              uses24h: parseInt(f.uses_24h),
              uses7d: parseInt(f.uses_7d),
              uses30d: parseInt(f.uses_30d),
              users24h: parseInt(f.users_24h),
              users7d: parseInt(f.users_7d),
              users30d: parseInt(f.users_30d),
              avgDurationMs: f.avg_duration_ms ? parseFloat(f.avg_duration_ms) : null,
            })),
            categories: categories.map((c) => ({
              name: c.category,
              totalUses30d: parseInt(c.count),
            })),
          },
        });
      } catch (error) {
        log.error('Error fetching features', { error });
        return reply.status(500).send({ success: false, error: 'Failed to fetch features' });
      }
    }
  );

  // ========================================
  // SEGMENTS
  // ========================================

  fastify.get('/admin/analytics/segments', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const segments = await queryAll<{
        segment_id: string;
        segment_name: string;
        description: string | null;
        color: string | null;
        icon: string | null;
        priority: number;
        member_count: string;
      }>(
        `SELECT segment_id, segment_name, description, color, icon, priority, member_count
         FROM mv_segment_counts
         ORDER BY priority DESC`,
        []
      );

      return reply.send({
        success: true,
        data: {
          segments: segments.map((s) => ({
            id: s.segment_id,
            name: s.segment_name,
            description: s.description,
            color: s.color,
            icon: s.icon,
            priority: s.priority,
            memberCount: parseInt(s.member_count),
          })),
        },
      });
    } catch (error) {
      log.error('Error fetching segments', { error });
      return reply.status(500).send({ success: false, error: 'Failed to fetch segments' });
    }
  });

  fastify.get(
    '/admin/analytics/segments/:id/members',
    async (
      request: FastifyRequest<{
        Params: { id: string };
        Querystring: z.infer<typeof SegmentMembersQuerySchema>;
      }>,
      reply: FastifyReply
    ) => {
      try {
        const { id } = request.params;
        const query = SegmentMembersQuerySchema.parse(request.query);
        const cursor = query.cursor ? decodeCursor(query.cursor) : null;

        let sql = `
          SELECT
            u.id,
            u.username,
            u.display_name,
            u.avatar_url,
            u.created_at,
            u.total_xp,
            u.current_rank,
            usm.score,
            usm.joined_at,
            COALESCE(uas.engagement_score, 0) as engagement_score
          FROM user_segment_memberships usm
          JOIN users u ON u.id = usm.user_id
          LEFT JOIN user_activity_summaries uas ON uas.user_id = u.id
          WHERE usm.segment_id = $1
        `;
        const params: unknown[] = [id];

        if (cursor) {
          sql += ` AND (usm.joined_at, u.id) < ($2, $3)`;
          params.push(cursor.createdAt, cursor.id);
        }

        sql += ` ORDER BY usm.joined_at DESC, u.id DESC LIMIT $${params.length + 1}`;
        params.push(query.limit + 1);

        const members = await queryAll<{
          id: string;
          username: string;
          display_name: string | null;
          avatar_url: string | null;
          created_at: string;
          total_xp: number;
          current_rank: string;
          score: number;
          joined_at: string;
          engagement_score: number;
        }>(sql, params);

        const hasNextPage = members.length > query.limit;
        const resultMembers = hasNextPage ? members.slice(0, -1) : members;

        const nextCursor =
          hasNextPage && resultMembers.length > 0
            ? encodeCursor(
                resultMembers[resultMembers.length - 1].joined_at,
                resultMembers[resultMembers.length - 1].id
              )
            : null;

        return reply.send({
          success: true,
          data: {
            members: resultMembers.map((m) => ({
              id: m.id,
              username: m.username,
              displayName: m.display_name,
              avatarUrl: m.avatar_url,
              createdAt: m.created_at,
              totalXp: m.total_xp,
              rank: m.current_rank,
              score: m.score,
              joinedAt: m.joined_at,
              engagementScore: m.engagement_score,
            })),
            pagination: {
              hasNextPage,
              nextCursor,
              limit: query.limit,
            },
          },
        });
      } catch (error) {
        log.error('Error fetching segment members', { error });
        return reply.status(500).send({ success: false, error: 'Failed to fetch segment members' });
      }
    }
  );

  // ========================================
  // COHORTS
  // ========================================

  fastify.get('/admin/analytics/cohorts', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const cohorts = await queryAll<{
        cohort_date: string;
        cohort_size: number;
        retained_d1: number;
        retained_d3: number;
        retained_d7: number;
        retained_d14: number;
        retained_d30: number;
        retained_d60: number;
        retained_d90: number;
        adopted_workout: number;
        adopted_social: number;
        adopted_economy: number;
        avg_workouts_d7: number;
        avg_workouts_d30: number;
      }>(
        `SELECT
           cohort_date,
           cohort_size,
           retained_d1,
           retained_d3,
           retained_d7,
           retained_d14,
           retained_d30,
           retained_d60,
           retained_d90,
           adopted_workout,
           adopted_social,
           adopted_economy,
           avg_workouts_d7,
           avg_workouts_d30
         FROM signup_cohorts
         ORDER BY cohort_date DESC
         LIMIT 90`,
        []
      );

      return reply.send({
        success: true,
        data: {
          cohorts: cohorts.map((c) => ({
            date: c.cohort_date,
            size: c.cohort_size,
            retention: {
              d1: c.cohort_size > 0 ? Math.round((c.retained_d1 / c.cohort_size) * 100) : 0,
              d3: c.cohort_size > 0 ? Math.round((c.retained_d3 / c.cohort_size) * 100) : 0,
              d7: c.cohort_size > 0 ? Math.round((c.retained_d7 / c.cohort_size) * 100) : 0,
              d14: c.cohort_size > 0 ? Math.round((c.retained_d14 / c.cohort_size) * 100) : 0,
              d30: c.cohort_size > 0 ? Math.round((c.retained_d30 / c.cohort_size) * 100) : 0,
              d60: c.cohort_size > 0 ? Math.round((c.retained_d60 / c.cohort_size) * 100) : 0,
              d90: c.cohort_size > 0 ? Math.round((c.retained_d90 / c.cohort_size) * 100) : 0,
            },
            adoption: {
              workout: c.cohort_size > 0 ? Math.round((c.adopted_workout / c.cohort_size) * 100) : 0,
              social: c.cohort_size > 0 ? Math.round((c.adopted_social / c.cohort_size) * 100) : 0,
              economy: c.cohort_size > 0 ? Math.round((c.adopted_economy / c.cohort_size) * 100) : 0,
            },
            avgWorkoutsD7: c.avg_workouts_d7,
            avgWorkoutsD30: c.avg_workouts_d30,
          })),
        },
      });
    } catch (error) {
      log.error('Error fetching cohorts', { error });
      return reply.status(500).send({ success: false, error: 'Failed to fetch cohorts' });
    }
  });

  // ========================================
  // RECALCULATE (MANUAL TRIGGER)
  // ========================================

  fastify.post(
    '/admin/analytics/recalculate',
    async (
      request: FastifyRequest<{
        Body: { type: 'all' | 'summaries' | 'segments' | 'cohorts' | 'mvs' };
      }>,
      reply: FastifyReply
    ) => {
      try {
        const { type } = request.body || { type: 'all' };

        switch (type) {
          case 'summaries':
            await analyticsAggregation.updateUserSummaries();
            break;
          case 'segments':
            await analyticsAggregation.recalculateSegments();
            break;
          case 'cohorts':
            await analyticsAggregation.updateCohortRetention();
            break;
          case 'mvs':
            await analyticsAggregation.refreshMaterializedViews();
            break;
          case 'all':
          default:
            await analyticsAggregation.refreshMaterializedViews();
            await analyticsAggregation.updateUserSummaries();
            await analyticsAggregation.recalculateSegments();
            break;
        }

        return reply.send({
          success: true,
          message: `Recalculation completed for: ${type}`,
        });
      } catch (error) {
        log.error('Error in recalculation', { error });
        return reply.status(500).send({ success: false, error: 'Recalculation failed' });
      }
    }
  );
}
