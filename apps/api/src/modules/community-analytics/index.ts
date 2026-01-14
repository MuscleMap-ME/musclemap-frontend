/**
 * Community Analytics Service
 *
 * Tracks and analyzes community health and engagement:
 * - Daily analytics aggregation
 * - Health scoring
 * - Growth trends
 * - Engagement metrics
 */

import { queryOne, queryAll, query } from '../../db/client';
import { loggers } from '../../lib/logger';

const _log = loggers.core;

// ============================================
// TYPES
// ============================================

export interface CommunityDailyAnalytics {
  communityId: number;
  date: Date;
  totalMembers: number;
  newMembers: number;
  activeMembers: number;
  posts: number;
  comments: number;
  reactions: number;
  events: number;
  eventAttendees: number;
  hangoutCheckIns: number;
  uniquePosters: number;
  avgResponseTimeMinutes?: number;
}

export interface CommunityHealthScore {
  communityId: number;
  calculatedAt: Date;
  overallScore: number;
  engagementScore: number;
  growthScore: number;
  retentionScore: number;
  contentQualityScore: number;
  moderationScore: number;
  trend: 'improving' | 'stable' | 'declining';
  insights: string[];
}

export interface CommunityGrowthTrend {
  period: string;
  memberCount: number;
  change: number;
  changePercent: number;
}

export interface EngagementBreakdown {
  posts: number;
  comments: number;
  reactions: number;
  events: number;
  checkIns: number;
  total: number;
}

export interface TopContributor {
  userId: string;
  username: string;
  displayName?: string;
  avatarUrl?: string;
  contributions: number;
  posts: number;
  comments: number;
  reactions: number;
}

// ============================================
// SERVICE
// ============================================

export const communityAnalyticsService = {
  // ==========================================
  // DAILY ANALYTICS
  // ==========================================

  /**
   * Record or update daily analytics for a community
   */
  async recordDailyAnalytics(communityId: number): Promise<CommunityDailyAnalytics> {
    const today = new Date().toISOString().split('T')[0];

    // Aggregate today's metrics
    const metrics = await queryOne<{
      total_members: string;
      new_members: string;
      active_members: string;
      posts: string;
      comments: string;
      reactions: string;
      events: string;
      event_attendees: string;
      hangout_check_ins: string;
      unique_posters: string;
    }>(
      `WITH daily_stats AS (
        SELECT
          (SELECT COUNT(*) FROM community_members WHERE community_id = $1 AND status = 'active') as total_members,
          (SELECT COUNT(*) FROM community_members WHERE community_id = $1 AND joined_at::date = $2::date) as new_members,
          (SELECT COUNT(DISTINCT user_id) FROM bulletin_posts WHERE community_id = $1 AND created_at::date = $2::date) as active_posters,
          (SELECT COUNT(*) FROM bulletin_posts WHERE community_id = $1 AND created_at::date = $2::date) as posts,
          (SELECT COUNT(*) FROM bulletin_comments bc JOIN bulletin_posts bp ON bp.id = bc.post_id WHERE bp.community_id = $1 AND bc.created_at::date = $2::date) as comments,
          (SELECT COUNT(*) FROM bulletin_reactions br JOIN bulletin_posts bp ON bp.id = br.post_id WHERE bp.community_id = $1 AND br.created_at::date = $2::date) as reactions,
          (SELECT COUNT(*) FROM community_events WHERE community_id = $1 AND created_at::date = $2::date) as events,
          (SELECT COUNT(*) FROM community_event_attendees cea JOIN community_events ce ON ce.id = cea.event_id WHERE ce.community_id = $1 AND cea.rsvp_at::date = $2::date) as event_attendees,
          (SELECT COUNT(*) FROM hangout_check_ins hci JOIN hangouts h ON h.id = hci.hangout_id WHERE h.community_id = $1 AND hci.checked_in_at::date = $2::date) as hangout_check_ins
      )
      SELECT
        total_members,
        new_members,
        (active_posters + COALESCE((SELECT COUNT(DISTINCT user_id) FROM bulletin_comments bc JOIN bulletin_posts bp ON bp.id = bc.post_id WHERE bp.community_id = $1 AND bc.created_at::date = $2::date), 0)) as active_members,
        posts,
        comments,
        reactions,
        events,
        event_attendees,
        hangout_check_ins,
        active_posters as unique_posters
      FROM daily_stats`,
      [communityId, today]
    );

    if (!metrics) {
      throw new Error('Failed to aggregate community metrics');
    }

    // Upsert daily analytics
    await query(
      `INSERT INTO community_analytics_daily (
        community_id, date, total_members, new_members, active_members,
        posts, comments, reactions, events, event_attendees, hangout_check_ins, unique_posters
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      ON CONFLICT (community_id, date) DO UPDATE SET
        total_members = EXCLUDED.total_members,
        new_members = EXCLUDED.new_members,
        active_members = EXCLUDED.active_members,
        posts = EXCLUDED.posts,
        comments = EXCLUDED.comments,
        reactions = EXCLUDED.reactions,
        events = EXCLUDED.events,
        event_attendees = EXCLUDED.event_attendees,
        hangout_check_ins = EXCLUDED.hangout_check_ins,
        unique_posters = EXCLUDED.unique_posters`,
      [
        communityId,
        today,
        parseInt(metrics.total_members),
        parseInt(metrics.new_members),
        parseInt(metrics.active_members),
        parseInt(metrics.posts),
        parseInt(metrics.comments),
        parseInt(metrics.reactions),
        parseInt(metrics.events),
        parseInt(metrics.event_attendees),
        parseInt(metrics.hangout_check_ins),
        parseInt(metrics.unique_posters),
      ]
    );

    return {
      communityId,
      date: new Date(today),
      totalMembers: parseInt(metrics.total_members),
      newMembers: parseInt(metrics.new_members),
      activeMembers: parseInt(metrics.active_members),
      posts: parseInt(metrics.posts),
      comments: parseInt(metrics.comments),
      reactions: parseInt(metrics.reactions),
      events: parseInt(metrics.events),
      eventAttendees: parseInt(metrics.event_attendees),
      hangoutCheckIns: parseInt(metrics.hangout_check_ins),
      uniquePosters: parseInt(metrics.unique_posters),
    };
  },

  /**
   * Get daily analytics for a date range
   */
  async getDailyAnalytics(
    communityId: number,
    options: { startDate?: Date; endDate?: Date; limit?: number } = {}
  ): Promise<CommunityDailyAnalytics[]> {
    const { startDate, endDate, limit = 30 } = options;

    const conditions: string[] = ['community_id = $1'];
    const params: any[] = [communityId];
    let paramIndex = 2;

    if (startDate) {
      conditions.push(`date >= $${paramIndex}`);
      params.push(startDate.toISOString().split('T')[0]);
      paramIndex++;
    }

    if (endDate) {
      conditions.push(`date <= $${paramIndex}`);
      params.push(endDate.toISOString().split('T')[0]);
      paramIndex++;
    }

    params.push(limit);

    const rows = await queryAll<{
      community_id: number;
      date: Date;
      total_members: number;
      new_members: number;
      active_members: number;
      posts: number;
      comments: number;
      reactions: number;
      events: number;
      event_attendees: number;
      hangout_check_ins: number;
      unique_posters: number;
      avg_response_time_minutes: number | null;
    }>(
      `SELECT * FROM community_analytics_daily
       WHERE ${conditions.join(' AND ')}
       ORDER BY date DESC
       LIMIT $${paramIndex}`,
      params
    );

    return rows.map((r) => ({
      communityId: r.community_id,
      date: r.date,
      totalMembers: r.total_members,
      newMembers: r.new_members,
      activeMembers: r.active_members,
      posts: r.posts,
      comments: r.comments,
      reactions: r.reactions,
      events: r.events,
      eventAttendees: r.event_attendees,
      hangoutCheckIns: r.hangout_check_ins,
      uniquePosters: r.unique_posters,
      avgResponseTimeMinutes: r.avg_response_time_minutes || undefined,
    }));
  },

  // ==========================================
  // HEALTH SCORES
  // ==========================================

  /**
   * Calculate and store community health score
   */
  async calculateHealthScore(communityId: number): Promise<CommunityHealthScore> {
    // Get recent analytics (last 30 days)
    const recentAnalytics = await this.getDailyAnalytics(communityId, { limit: 30 });

    if (recentAnalytics.length === 0) {
      // No data, return baseline score
      return {
        communityId,
        calculatedAt: new Date(),
        overallScore: 50,
        engagementScore: 50,
        growthScore: 50,
        retentionScore: 50,
        contentQualityScore: 50,
        moderationScore: 80,
        trend: 'stable',
        insights: ['Not enough data for detailed analysis'],
      };
    }

    const latest = recentAnalytics[0];
    const oldest = recentAnalytics[recentAnalytics.length - 1];

    // Calculate engagement score (0-100)
    const totalEngagements = latest.posts + latest.comments + latest.reactions + latest.hangoutCheckIns;
    const engagementRate = latest.totalMembers > 0 ? (latest.activeMembers / latest.totalMembers) * 100 : 0;
    const engagementScore = Math.min(100, engagementRate * 2 + Math.min(50, totalEngagements));

    // Calculate growth score (0-100)
    const memberGrowth = latest.totalMembers - oldest.totalMembers;
    const growthRate = oldest.totalMembers > 0 ? (memberGrowth / oldest.totalMembers) * 100 : 0;
    const growthScore = Math.min(100, Math.max(0, 50 + growthRate * 5));

    // Calculate retention score (based on active members trend)
    const avgActiveMembers = recentAnalytics.reduce((sum, a) => sum + a.activeMembers, 0) / recentAnalytics.length;
    const retentionRate = latest.totalMembers > 0 ? (avgActiveMembers / latest.totalMembers) * 100 : 0;
    const retentionScore = Math.min(100, retentionRate * 2);

    // Calculate content quality score (based on engagement per post)
    const avgPosts = recentAnalytics.reduce((sum, a) => sum + a.posts, 0) / recentAnalytics.length;
    const avgReactions = recentAnalytics.reduce((sum, a) => sum + a.reactions, 0) / recentAnalytics.length;
    const engagementPerPost = avgPosts > 0 ? avgReactions / avgPosts : 0;
    const contentQualityScore = Math.min(100, 50 + engagementPerPost * 10);

    // Moderation score (would need reports data, default to good)
    const moderationScore = 80;

    // Overall score
    const overallScore = Math.round(
      engagementScore * 0.25 +
        growthScore * 0.2 +
        retentionScore * 0.25 +
        contentQualityScore * 0.2 +
        moderationScore * 0.1
    );

    // Determine trend
    let trend: CommunityHealthScore['trend'] = 'stable';
    if (recentAnalytics.length >= 7) {
      const firstWeekAvg =
        recentAnalytics.slice(-7).reduce((sum, a) => sum + a.activeMembers, 0) / 7;
      const lastWeekAvg =
        recentAnalytics.slice(0, Math.min(7, recentAnalytics.length)).reduce((sum, a) => sum + a.activeMembers, 0) /
        Math.min(7, recentAnalytics.length);

      if (lastWeekAvg > firstWeekAvg * 1.1) trend = 'improving';
      else if (lastWeekAvg < firstWeekAvg * 0.9) trend = 'declining';
    }

    // Generate insights
    const insights: string[] = [];
    if (engagementRate < 10) insights.push('Low member engagement - consider more interactive content');
    if (growthRate < 0) insights.push('Membership is declining - focus on retention and outreach');
    if (engagementPerPost < 2) insights.push('Posts receive low engagement - try different content types');
    if (latest.events === 0) insights.push('No recent events - events boost engagement');
    if (engagementRate > 30) insights.push('Strong engagement from members');
    if (growthRate > 10) insights.push('Excellent growth rate');

    // Store the health score
    await query(
      `INSERT INTO community_health_scores (
        community_id, overall_score, engagement_score, growth_score,
        retention_score, content_quality_score, moderation_score, trend, insights
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        communityId,
        overallScore,
        Math.round(engagementScore),
        Math.round(growthScore),
        Math.round(retentionScore),
        Math.round(contentQualityScore),
        moderationScore,
        trend,
        insights,
      ]
    );

    return {
      communityId,
      calculatedAt: new Date(),
      overallScore,
      engagementScore: Math.round(engagementScore),
      growthScore: Math.round(growthScore),
      retentionScore: Math.round(retentionScore),
      contentQualityScore: Math.round(contentQualityScore),
      moderationScore,
      trend,
      insights,
    };
  },

  /**
   * Get latest health score for a community
   */
  async getLatestHealthScore(communityId: number): Promise<CommunityHealthScore | null> {
    const result = await queryOne<{
      community_id: number;
      calculated_at: Date;
      overall_score: number;
      engagement_score: number;
      growth_score: number;
      retention_score: number;
      content_quality_score: number;
      moderation_score: number;
      trend: string;
      insights: string[];
    }>(
      `SELECT * FROM community_health_scores
       WHERE community_id = $1
       ORDER BY calculated_at DESC
       LIMIT 1`,
      [communityId]
    );

    if (!result) return null;

    return {
      communityId: result.community_id,
      calculatedAt: result.calculated_at,
      overallScore: result.overall_score,
      engagementScore: result.engagement_score,
      growthScore: result.growth_score,
      retentionScore: result.retention_score,
      contentQualityScore: result.content_quality_score,
      moderationScore: result.moderation_score,
      trend: result.trend as CommunityHealthScore['trend'],
      insights: result.insights,
    };
  },

  /**
   * Get health score history
   */
  async getHealthScoreHistory(
    communityId: number,
    options: { limit?: number } = {}
  ): Promise<CommunityHealthScore[]> {
    const { limit = 30 } = options;

    const rows = await queryAll<{
      community_id: number;
      calculated_at: Date;
      overall_score: number;
      engagement_score: number;
      growth_score: number;
      retention_score: number;
      content_quality_score: number;
      moderation_score: number;
      trend: string;
      insights: string[];
    }>(
      `SELECT * FROM community_health_scores
       WHERE community_id = $1
       ORDER BY calculated_at DESC
       LIMIT $2`,
      [communityId, limit]
    );

    return rows.map((r) => ({
      communityId: r.community_id,
      calculatedAt: r.calculated_at,
      overallScore: r.overall_score,
      engagementScore: r.engagement_score,
      growthScore: r.growth_score,
      retentionScore: r.retention_score,
      contentQualityScore: r.content_quality_score,
      moderationScore: r.moderation_score,
      trend: r.trend as CommunityHealthScore['trend'],
      insights: r.insights,
    }));
  },

  // ==========================================
  // GROWTH & ENGAGEMENT
  // ==========================================

  /**
   * Get membership growth trends
   */
  async getGrowthTrends(
    communityId: number,
    period: 'daily' | 'weekly' | 'monthly' = 'daily',
    limit: number = 12
  ): Promise<CommunityGrowthTrend[]> {
    let groupBy: string;
    let dateFormat: string;

    switch (period) {
      case 'weekly':
        groupBy = "date_trunc('week', date)";
        dateFormat = 'YYYY-"W"IW';
        break;
      case 'monthly':
        groupBy = "date_trunc('month', date)";
        dateFormat = 'YYYY-MM';
        break;
      default:
        groupBy = 'date';
        dateFormat = 'YYYY-MM-DD';
    }

    const rows = await queryAll<{
      period: string;
      member_count: string;
    }>(
      `SELECT
        TO_CHAR(${groupBy}, '${dateFormat}') as period,
        MAX(total_members) as member_count
       FROM community_analytics_daily
       WHERE community_id = $1
       GROUP BY ${groupBy}
       ORDER BY ${groupBy} DESC
       LIMIT $2`,
      [communityId, limit]
    );

    const trends: CommunityGrowthTrend[] = [];
    for (let i = 0; i < rows.length; i++) {
      const current = parseInt(rows[i].member_count);
      const previous = i < rows.length - 1 ? parseInt(rows[i + 1].member_count) : current;
      const change = current - previous;
      const changePercent = previous > 0 ? (change / previous) * 100 : 0;

      trends.push({
        period: rows[i].period,
        memberCount: current,
        change,
        changePercent: Math.round(changePercent * 10) / 10,
      });
    }

    return trends.reverse();
  },

  /**
   * Get engagement breakdown for a period
   */
  async getEngagementBreakdown(
    communityId: number,
    options: { startDate?: Date; endDate?: Date } = {}
  ): Promise<EngagementBreakdown> {
    const { startDate, endDate } = options;

    const conditions: string[] = ['community_id = $1'];
    const params: any[] = [communityId];
    let paramIndex = 2;

    if (startDate) {
      conditions.push(`date >= $${paramIndex}`);
      params.push(startDate.toISOString().split('T')[0]);
      paramIndex++;
    }

    if (endDate) {
      conditions.push(`date <= $${paramIndex}`);
      params.push(endDate.toISOString().split('T')[0]);
    }

    const result = await queryOne<{
      posts: string;
      comments: string;
      reactions: string;
      events: string;
      check_ins: string;
    }>(
      `SELECT
        COALESCE(SUM(posts), 0) as posts,
        COALESCE(SUM(comments), 0) as comments,
        COALESCE(SUM(reactions), 0) as reactions,
        COALESCE(SUM(events), 0) as events,
        COALESCE(SUM(hangout_check_ins), 0) as check_ins
       FROM community_analytics_daily
       WHERE ${conditions.join(' AND ')}`,
      params
    );

    if (!result) {
      return { posts: 0, comments: 0, reactions: 0, events: 0, checkIns: 0, total: 0 };
    }

    const posts = parseInt(result.posts);
    const comments = parseInt(result.comments);
    const reactions = parseInt(result.reactions);
    const events = parseInt(result.events);
    const checkIns = parseInt(result.check_ins);

    return {
      posts,
      comments,
      reactions,
      events,
      checkIns,
      total: posts + comments + reactions + events + checkIns,
    };
  },

  /**
   * Get top contributors
   */
  async getTopContributors(
    communityId: number,
    options: { days?: number; limit?: number } = {}
  ): Promise<TopContributor[]> {
    const { days = 30, limit = 10 } = options;

    const rows = await queryAll<{
      user_id: string;
      username: string;
      display_name: string | null;
      avatar_url: string | null;
      posts: string;
      comments: string;
      reactions: string;
    }>(
      `WITH contributor_stats AS (
        SELECT
          u.id as user_id,
          u.username,
          u.display_name,
          u.avatar_url,
          COUNT(DISTINCT bp.id) as posts,
          COUNT(DISTINCT bc.id) as comments,
          COUNT(DISTINCT br.id) as reactions
        FROM users u
        JOIN community_members cm ON cm.user_id = u.id AND cm.community_id = $1
        LEFT JOIN bulletin_posts bp ON bp.author_id = u.id AND bp.community_id = $1 AND bp.created_at > NOW() - INTERVAL '${days} days'
        LEFT JOIN bulletin_comments bc ON bc.author_id = u.id AND EXISTS (SELECT 1 FROM bulletin_posts bp2 WHERE bp2.id = bc.post_id AND bp2.community_id = $1) AND bc.created_at > NOW() - INTERVAL '${days} days'
        LEFT JOIN bulletin_reactions br ON br.user_id = u.id AND EXISTS (SELECT 1 FROM bulletin_posts bp3 WHERE bp3.id = br.post_id AND bp3.community_id = $1) AND br.created_at > NOW() - INTERVAL '${days} days'
        WHERE cm.status = 'active'
        GROUP BY u.id, u.username, u.display_name, u.avatar_url
      )
      SELECT *
      FROM contributor_stats
      WHERE posts > 0 OR comments > 0 OR reactions > 0
      ORDER BY (posts * 3 + comments * 2 + reactions) DESC
      LIMIT $2`,
      [communityId, limit]
    );

    return rows.map((r) => ({
      userId: r.user_id,
      username: r.username,
      displayName: r.display_name || undefined,
      avatarUrl: r.avatar_url || undefined,
      posts: parseInt(r.posts),
      comments: parseInt(r.comments),
      reactions: parseInt(r.reactions),
      contributions: parseInt(r.posts) * 3 + parseInt(r.comments) * 2 + parseInt(r.reactions),
    }));
  },

  /**
   * Get community comparison (for admins/moderators)
   */
  async compareCommunities(communityIds: number[]): Promise<
    Array<{
      communityId: number;
      communityName: string;
      healthScore: number;
      memberCount: number;
      weeklyGrowth: number;
      weeklyEngagement: number;
    }>
  > {
    if (communityIds.length === 0) return [];

    const rows = await queryAll<{
      community_id: number;
      name: string;
      health_score: number | null;
      member_count: string;
      weekly_new: string;
      weekly_engagement: string;
    }>(
      `SELECT
        c.id as community_id,
        c.name,
        (SELECT overall_score FROM community_health_scores WHERE community_id = c.id ORDER BY calculated_at DESC LIMIT 1) as health_score,
        (SELECT COUNT(*) FROM community_members WHERE community_id = c.id AND status = 'active') as member_count,
        (SELECT COALESCE(SUM(new_members), 0) FROM community_analytics_daily WHERE community_id = c.id AND date > NOW() - INTERVAL '7 days') as weekly_new,
        (SELECT COALESCE(SUM(posts + comments + reactions), 0) FROM community_analytics_daily WHERE community_id = c.id AND date > NOW() - INTERVAL '7 days') as weekly_engagement
       FROM communities c
       WHERE c.id = ANY($1)`,
      [communityIds]
    );

    return rows.map((r) => ({
      communityId: r.community_id,
      communityName: r.name,
      healthScore: r.health_score || 50,
      memberCount: parseInt(r.member_count),
      weeklyGrowth: parseInt(r.weekly_new),
      weeklyEngagement: parseInt(r.weekly_engagement),
    }));
  },
};

export default communityAnalyticsService;
