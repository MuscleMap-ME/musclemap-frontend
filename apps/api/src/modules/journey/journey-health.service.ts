/**
 * Journey Health Service
 *
 * Provides health scoring and proactive monitoring for user journeys.
 * Detects stalled journeys and provides actionable recommendations.
 *
 * Health Score Components (0-100):
 * - Engagement (35%): Based on recency of activity
 * - Consistency (25%): Based on check-in frequency
 * - Momentum (40%): Based on progress vs expected rate
 *
 * Risk Levels:
 * - healthy: On track, regular activity
 * - at_risk: Slowing down, needs attention
 * - critical: Significantly behind, urgent action needed
 * - stalled: No activity for extended period
 */

import { query, queryOne, queryAll } from '../../db/client';
import { loggers } from '../../lib/logger';
import { withLock } from '../../lib/distributed-lock';
import { ValidationError, NotFoundError } from '../../lib/errors';

const log = loggers.core.child({ module: 'journey-health' });

// Risk level type
export type JourneyRiskLevel = 'healthy' | 'at_risk' | 'critical' | 'stalled';

// Alert types
export type JourneyAlertType =
  | 'stalled'
  | 'declining'
  | 'missed_milestone'
  | 'off_track'
  | 'no_activity'
  | 'consistency_drop'
  | 'risk_upgrade'
  | 'approaching_deadline';

// Recommendation types
export type RecommendationType =
  | 'increase_frequency'
  | 'set_reminder'
  | 'adjust_goal'
  | 'take_break'
  | 'celebrate_progress'
  | 'connect_buddy'
  | 'join_challenge'
  | 'simplify_goal'
  | 'change_approach'
  | 'seek_support'
  | 'restart_journey'
  | 'archive_journey';

// Interfaces
export interface JourneyHealthScore {
  id: string;
  userJourneyId: string;
  userId: string;
  healthScore: number;
  engagementScore: number;
  consistencyScore: number;
  momentumScore: number;
  progressRate: number;
  expectedDailyProgress: number;
  actualDailyProgress: number;
  deviationPercentage: number;
  riskLevel: JourneyRiskLevel;
  riskFactors: RiskFactor[];
  daysSinceLastProgress: number;
  totalActiveDays: number;
  streakCurrent: number;
  streakLongest: number;
  lastActivityAt: Date | null;
  milestonesTotal: number;
  milestonesCompleted: number;
  milestonesOnTrack: number;
  milestonesBehind: number;
  expectedCheckins: number;
  actualCheckins: number;
  checkinConsistency: number;
  scoreTrend: 'improving' | 'stable' | 'declining' | 'critical_decline';
  score7dChange: number;
  score30dChange: number;
  calculatedAt: Date;
}

export interface RiskFactor {
  factor: string;
  weight: number;
  days?: number;
  ratio?: number;
  progressGap?: number;
  completed?: number;
  total?: number;
}

export interface JourneyHealthAlert {
  id: string;
  userJourneyId: string;
  userId: string;
  alertType: JourneyAlertType;
  severity: 'info' | 'warning' | 'critical';
  title: string;
  message: string;
  triggerData: Record<string, unknown>;
  status: 'active' | 'acknowledged' | 'dismissed' | 'resolved';
  acknowledgedAt: Date | null;
  dismissedAt: Date | null;
  resolvedAt: Date | null;
  notificationSent: boolean;
  expiresAt: Date | null;
  createdAt: Date;
}

export interface JourneyRecommendation {
  id: string;
  userJourneyId: string;
  userId: string;
  recommendationType: RecommendationType;
  priority: number;
  title: string;
  description: string;
  actionText: string | null;
  actionUrl: string | null;
  reasoning: { factors: string[]; confidence: number };
  status: 'active' | 'viewed' | 'actioned' | 'dismissed' | 'expired';
  wasHelpful: boolean | null;
  feedbackText: string | null;
  expiresAt: Date | null;
  createdAt: Date;
}

export interface StalledJourney {
  userJourneyId: string;
  journeyName: string;
  daysSinceActivity: number;
  currentProgress: number;
  riskLevel: JourneyRiskLevel;
  healthScore: number;
}

// Recommendation templates
const RECOMMENDATION_TEMPLATES: Record<
  RecommendationType,
  { title: string; description: string; actionText?: string }
> = {
  increase_frequency: {
    title: 'Increase Your Workout Frequency',
    description: 'Try adding one more session per week to build momentum.',
    actionText: 'Schedule a workout',
  },
  set_reminder: {
    title: 'Set Up Reminders',
    description: 'Daily reminders can help you stay consistent with your journey.',
    actionText: 'Set reminder',
  },
  adjust_goal: {
    title: 'Consider Adjusting Your Goal',
    description: "Your current pace suggests the goal might be ambitious. Let's make it more achievable.",
    actionText: 'Adjust goal',
  },
  take_break: {
    title: 'Take a Recovery Break',
    description: "Rest is part of progress. Consider a short break to come back stronger.",
    actionText: 'Learn more',
  },
  celebrate_progress: {
    title: 'Celebrate Your Progress!',
    description: "You're doing great! Take a moment to appreciate how far you've come.",
    actionText: 'View achievements',
  },
  connect_buddy: {
    title: 'Find a Workout Buddy',
    description: 'Working out with someone can boost motivation and accountability.',
    actionText: 'Find buddy',
  },
  join_challenge: {
    title: 'Join a Challenge',
    description: 'A community challenge could reignite your motivation.',
    actionText: 'Browse challenges',
  },
  simplify_goal: {
    title: 'Simplify Your Journey',
    description: 'Breaking your goal into smaller steps can make it more manageable.',
    actionText: 'Edit journey',
  },
  change_approach: {
    title: 'Try a Different Approach',
    description: "If your current routine isn't working, mixing it up might help.",
    actionText: 'Explore alternatives',
  },
  seek_support: {
    title: 'Get Support',
    description: 'Consider working with a trainer or joining a supportive community.',
    actionText: 'Find support',
  },
  restart_journey: {
    title: 'Fresh Start',
    description: "It's okay to restart. A fresh beginning with updated goals might be what you need.",
    actionText: 'Restart journey',
  },
  archive_journey: {
    title: 'Archive This Journey',
    description: "If this goal no longer serves you, it's okay to archive it and focus elsewhere.",
    actionText: 'Archive journey',
  },
};

export const journeyHealthService = {
  /**
   * Calculate health score for a specific journey
   */
  async calculateHealthScore(journeyId: string): Promise<JourneyHealthScore | null> {
    log.info({ journeyId }, 'Calculating health score for journey');

    // Get journey details
    const journey = await queryOne<{
      id: string;
      user_id: string;
      template_id: string;
      started_at: Date;
      current_progress: number;
      last_progress_at: Date | null;
      total_progress_entries: number;
      status: string;
    }>(
      `SELECT id, user_id, template_id, started_at, current_progress,
              last_progress_at, total_progress_entries, status
       FROM user_journeys WHERE id = $1`,
      [journeyId]
    );

    if (!journey) {
      throw new NotFoundError('Journey not found');
    }

    // Get template details
    const template = await queryOne<{
      suggested_duration_days: number;
      default_milestones: unknown[];
    }>(
      `SELECT suggested_duration_days, default_milestones
       FROM journey_templates WHERE id = $1`,
      [journey.template_id]
    );

    const targetDays = template?.suggested_duration_days || 90;
    const totalMilestones = Array.isArray(template?.default_milestones)
      ? template.default_milestones.length
      : 0;

    // Count completed milestones
    const milestoneResult = await queryOne<{ count: string }>(
      `SELECT COUNT(*) as count FROM user_milestone_progress
       WHERE user_id = $1 AND completed_at IS NOT NULL`,
      [journey.user_id]
    );
    const completedMilestones = parseInt(milestoneResult?.count || '0', 10);

    // Calculate expected checkins (roughly one per day since start)
    const daysElapsed = Math.max(
      1,
      Math.floor((Date.now() - new Date(journey.started_at).getTime()) / (1000 * 60 * 60 * 24))
    );

    // Call the database function for calculation
    const result = await queryOne<{
      health_score: number;
      engagement_score: number;
      consistency_score: number;
      momentum_score: number;
      risk_level: JourneyRiskLevel;
      risk_factors: RiskFactor[];
      days_since_last: number;
    }>(
      `SELECT * FROM calculate_journey_health_score($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [
        journeyId,
        journey.user_id,
        journey.started_at,
        targetDays,
        journey.current_progress || 0,
        journey.last_progress_at,
        totalMilestones,
        completedMilestones,
        journey.total_progress_entries || 0,
        daysElapsed,
      ]
    );

    if (!result) {
      log.error({ journeyId }, 'Failed to calculate health score');
      return null;
    }

    // Upsert the health score
    const _upsertResult = await queryOne<{
      id: string;
      calculated_at: Date;
    }>(
      `INSERT INTO journey_health_scores (
        user_journey_id, user_id,
        health_score, engagement_score, consistency_score, momentum_score,
        risk_level, risk_factors,
        days_since_last_progress, last_activity_at,
        milestones_total, milestones_completed,
        actual_checkins, expected_checkins,
        calculated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, NOW())
      ON CONFLICT (user_journey_id) DO UPDATE SET
        health_score = EXCLUDED.health_score,
        engagement_score = EXCLUDED.engagement_score,
        consistency_score = EXCLUDED.consistency_score,
        momentum_score = EXCLUDED.momentum_score,
        risk_level = EXCLUDED.risk_level,
        risk_factors = EXCLUDED.risk_factors,
        days_since_last_progress = EXCLUDED.days_since_last_progress,
        last_activity_at = EXCLUDED.last_activity_at,
        milestones_total = EXCLUDED.milestones_total,
        milestones_completed = EXCLUDED.milestones_completed,
        actual_checkins = EXCLUDED.actual_checkins,
        expected_checkins = EXCLUDED.expected_checkins,
        calculated_at = NOW(),
        updated_at = NOW()
      RETURNING id, calculated_at`,
      [
        journeyId,
        journey.user_id,
        result.health_score,
        result.engagement_score,
        result.consistency_score,
        result.momentum_score,
        result.risk_level,
        JSON.stringify(result.risk_factors),
        result.days_since_last,
        journey.last_progress_at,
        totalMilestones,
        completedMilestones,
        journey.total_progress_entries || 0,
        daysElapsed,
      ]
    );

    // Update user_journeys timestamp
    await query(
      `UPDATE user_journeys SET health_score_last_calculated = NOW() WHERE id = $1`,
      [journeyId]
    );

    log.info(
      { journeyId, healthScore: result.health_score, riskLevel: result.risk_level },
      'Health score calculated'
    );

    // Return the full health score object
    return this.getJourneyHealth(journeyId);
  },

  /**
   * Get the current health score for a journey
   */
  async getJourneyHealth(journeyId: string): Promise<JourneyHealthScore | null> {
    const row = await queryOne<{
      id: string;
      user_journey_id: string;
      user_id: string;
      health_score: number;
      engagement_score: number;
      consistency_score: number;
      momentum_score: number;
      progress_rate: number;
      expected_daily_progress: number;
      actual_daily_progress: number;
      deviation_percentage: number;
      risk_level: JourneyRiskLevel;
      risk_factors: RiskFactor[];
      days_since_last_progress: number;
      total_active_days: number;
      streak_current: number;
      streak_longest: number;
      last_activity_at: Date | null;
      milestones_total: number;
      milestones_completed: number;
      milestones_on_track: number;
      milestones_behind: number;
      expected_checkins: number;
      actual_checkins: number;
      checkin_consistency: number;
      score_trend: 'improving' | 'stable' | 'declining' | 'critical_decline';
      score_7d_change: number;
      score_30d_change: number;
      calculated_at: Date;
    }>(
      `SELECT * FROM journey_health_scores WHERE user_journey_id = $1`,
      [journeyId]
    );

    if (!row) {
      return null;
    }

    return {
      id: row.id,
      userJourneyId: row.user_journey_id,
      userId: row.user_id,
      healthScore: row.health_score,
      engagementScore: row.engagement_score,
      consistencyScore: row.consistency_score,
      momentumScore: row.momentum_score,
      progressRate: Number(row.progress_rate),
      expectedDailyProgress: Number(row.expected_daily_progress),
      actualDailyProgress: Number(row.actual_daily_progress),
      deviationPercentage: Number(row.deviation_percentage),
      riskLevel: row.risk_level,
      riskFactors: row.risk_factors,
      daysSinceLastProgress: row.days_since_last_progress,
      totalActiveDays: row.total_active_days,
      streakCurrent: row.streak_current,
      streakLongest: row.streak_longest,
      lastActivityAt: row.last_activity_at,
      milestonesTotal: row.milestones_total,
      milestonesCompleted: row.milestones_completed,
      milestonesOnTrack: row.milestones_on_track,
      milestonesBehind: row.milestones_behind,
      expectedCheckins: row.expected_checkins,
      actualCheckins: row.actual_checkins,
      checkinConsistency: Number(row.checkin_consistency),
      scoreTrend: row.score_trend,
      score7dChange: row.score_7d_change,
      score30dChange: row.score_30d_change,
      calculatedAt: row.calculated_at,
    };
  },

  /**
   * Detect stalled journeys for a user
   */
  async detectStalledJourneys(
    userId: string,
    thresholdDays: number = 7
  ): Promise<StalledJourney[]> {
    log.info({ userId, thresholdDays }, 'Detecting stalled journeys');

    const rows = await queryAll<{
      user_journey_id: string;
      journey_name: string;
      days_since_activity: number;
      current_progress: number;
      risk_level: JourneyRiskLevel;
      health_score: number;
    }>(
      `SELECT
        uj.id AS user_journey_id,
        jt.name AS journey_name,
        COALESCE(
          EXTRACT(DAY FROM NOW() - uj.last_progress_at)::INTEGER,
          EXTRACT(DAY FROM NOW() - uj.started_at)::INTEGER
        ) AS days_since_activity,
        COALESCE(uj.current_progress, 0) AS current_progress,
        COALESCE(jhs.risk_level, 'at_risk') AS risk_level,
        COALESCE(jhs.health_score, 50) AS health_score
      FROM user_journeys uj
      LEFT JOIN journey_templates jt ON uj.template_id = jt.id
      LEFT JOIN journey_health_scores jhs ON uj.id = jhs.user_journey_id
      WHERE uj.user_id = $1
        AND uj.status = 'active'
        AND (
          uj.last_progress_at IS NULL
          OR uj.last_progress_at < NOW() - INTERVAL '1 day' * $2
        )
      ORDER BY days_since_activity DESC`,
      [userId, thresholdDays]
    );

    return rows.map((row) => ({
      userJourneyId: row.user_journey_id,
      journeyName: row.journey_name || 'Unnamed Journey',
      daysSinceActivity: row.days_since_activity,
      currentProgress: Number(row.current_progress),
      riskLevel: row.risk_level,
      healthScore: row.health_score,
    }));
  },

  /**
   * Get health alerts for a user
   */
  async getHealthAlerts(
    userId: string,
    options: {
      status?: 'active' | 'acknowledged' | 'dismissed' | 'resolved';
      limit?: number;
      journeyId?: string;
    } = {}
  ): Promise<JourneyHealthAlert[]> {
    const { status = 'active', limit = 20, journeyId } = options;

    let sql = `
      SELECT
        id, user_journey_id, user_id, alert_type, severity,
        title, message, trigger_data, status,
        acknowledged_at, dismissed_at, resolved_at,
        notification_sent, expires_at, created_at
      FROM journey_health_alerts
      WHERE user_id = $1
    `;
    const params: unknown[] = [userId];

    if (status) {
      params.push(status);
      sql += ` AND status = $${params.length}`;
    }

    if (journeyId) {
      params.push(journeyId);
      sql += ` AND user_journey_id = $${params.length}`;
    }

    // Filter out expired alerts
    sql += ` AND (expires_at IS NULL OR expires_at > NOW())`;

    sql += ` ORDER BY
      CASE severity WHEN 'critical' THEN 1 WHEN 'warning' THEN 2 ELSE 3 END,
      created_at DESC`;

    params.push(limit);
    sql += ` LIMIT $${params.length}`;

    const rows = await queryAll<{
      id: string;
      user_journey_id: string;
      user_id: string;
      alert_type: JourneyAlertType;
      severity: 'info' | 'warning' | 'critical';
      title: string;
      message: string;
      trigger_data: Record<string, unknown>;
      status: 'active' | 'acknowledged' | 'dismissed' | 'resolved';
      acknowledged_at: Date | null;
      dismissed_at: Date | null;
      resolved_at: Date | null;
      notification_sent: boolean;
      expires_at: Date | null;
      created_at: Date;
    }>(sql, params);

    return rows.map((row) => ({
      id: row.id,
      userJourneyId: row.user_journey_id,
      userId: row.user_id,
      alertType: row.alert_type,
      severity: row.severity,
      title: row.title,
      message: row.message,
      triggerData: row.trigger_data,
      status: row.status,
      acknowledgedAt: row.acknowledged_at,
      dismissedAt: row.dismissed_at,
      resolvedAt: row.resolved_at,
      notificationSent: row.notification_sent,
      expiresAt: row.expires_at,
      createdAt: row.created_at,
    }));
  },

  /**
   * Generate recommendations for a journey
   */
  async generateRecommendations(journeyId: string): Promise<JourneyRecommendation[]> {
    log.info({ journeyId }, 'Generating recommendations for journey');

    // Get health score
    let healthScore = await this.getJourneyHealth(journeyId);

    // Calculate if not exists
    if (!healthScore) {
      healthScore = await this.calculateHealthScore(journeyId);
    }

    if (!healthScore) {
      throw new NotFoundError('Could not calculate health score for journey');
    }

    const recommendations: Array<{
      type: RecommendationType;
      priority: number;
      factors: string[];
      confidence: number;
    }> = [];

    // Generate recommendations based on risk factors and scores
    const { riskLevel, riskFactors, engagementScore, consistencyScore, momentumScore } = healthScore;

    // Stalled journey recommendations
    if (riskLevel === 'stalled') {
      recommendations.push({
        type: 'restart_journey',
        priority: 90,
        factors: ['stalled', 'no_activity'],
        confidence: 0.9,
      });
      recommendations.push({
        type: 'archive_journey',
        priority: 70,
        factors: ['stalled', 'low_engagement'],
        confidence: 0.7,
      });
    }

    // Low engagement recommendations
    if (engagementScore < 50) {
      recommendations.push({
        type: 'set_reminder',
        priority: 80,
        factors: ['low_engagement'],
        confidence: 0.85,
      });
      recommendations.push({
        type: 'connect_buddy',
        priority: 60,
        factors: ['low_engagement'],
        confidence: 0.75,
      });
    }

    // Low consistency recommendations
    if (consistencyScore < 50) {
      recommendations.push({
        type: 'simplify_goal',
        priority: 75,
        factors: ['low_consistency'],
        confidence: 0.8,
      });
      recommendations.push({
        type: 'increase_frequency',
        priority: 65,
        factors: ['low_consistency'],
        confidence: 0.7,
      });
    }

    // Low momentum recommendations
    if (momentumScore < 50) {
      recommendations.push({
        type: 'adjust_goal',
        priority: 85,
        factors: ['behind_schedule'],
        confidence: 0.85,
      });
      recommendations.push({
        type: 'change_approach',
        priority: 55,
        factors: ['low_momentum'],
        confidence: 0.65,
      });
    }

    // Risk factor specific recommendations
    for (const factor of riskFactors) {
      if (factor.factor === 'inactivity' && (factor.days ?? 0) > 14) {
        recommendations.push({
          type: 'join_challenge',
          priority: 70,
          factors: ['inactivity'],
          confidence: 0.75,
        });
      }
      if (factor.factor === 'missed_milestones') {
        recommendations.push({
          type: 'seek_support',
          priority: 65,
          factors: ['missed_milestones'],
          confidence: 0.7,
        });
      }
    }

    // Positive recommendations for healthy journeys
    if (riskLevel === 'healthy' && healthScore.healthScore >= 80) {
      recommendations.push({
        type: 'celebrate_progress',
        priority: 50,
        factors: ['good_progress'],
        confidence: 0.9,
      });
    }

    // Deduplicate and sort by priority
    const uniqueTypes = new Set<RecommendationType>();
    const finalRecs = recommendations
      .filter((r) => {
        if (uniqueTypes.has(r.type)) return false;
        uniqueTypes.add(r.type);
        return true;
      })
      .sort((a, b) => b.priority - a.priority)
      .slice(0, 5); // Max 5 recommendations

    // Store recommendations in database
    const stored: JourneyRecommendation[] = [];
    for (const rec of finalRecs) {
      const template = RECOMMENDATION_TEMPLATES[rec.type];
      const result = await queryOne<{
        id: string;
        created_at: Date;
      }>(
        `INSERT INTO journey_recommendations (
          user_journey_id, user_id, health_score_id,
          recommendation_type, priority, title, description, action_text,
          reasoning, expires_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW() + INTERVAL '14 days')
        ON CONFLICT DO NOTHING
        RETURNING id, created_at`,
        [
          journeyId,
          healthScore.userId,
          healthScore.id,
          rec.type,
          rec.priority,
          template.title,
          template.description,
          template.actionText || null,
          JSON.stringify({ factors: rec.factors, confidence: rec.confidence }),
        ]
      );

      if (result) {
        stored.push({
          id: result.id,
          userJourneyId: journeyId,
          userId: healthScore.userId,
          recommendationType: rec.type,
          priority: rec.priority,
          title: template.title,
          description: template.description,
          actionText: template.actionText || null,
          actionUrl: null,
          reasoning: { factors: rec.factors, confidence: rec.confidence },
          status: 'active',
          wasHelpful: null,
          feedbackText: null,
          expiresAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
          createdAt: result.created_at,
        });
      }
    }

    log.info(
      { journeyId, recommendationCount: stored.length },
      'Recommendations generated'
    );

    return stored;
  },

  /**
   * Get recommendations for a journey
   */
  async getRecommendations(
    journeyId: string,
    options: { status?: string; limit?: number } = {}
  ): Promise<JourneyRecommendation[]> {
    const { status = 'active', limit = 10 } = options;

    const rows = await queryAll<{
      id: string;
      user_journey_id: string;
      user_id: string;
      recommendation_type: RecommendationType;
      priority: number;
      title: string;
      description: string;
      action_text: string | null;
      action_url: string | null;
      reasoning: { factors: string[]; confidence: number };
      status: 'active' | 'viewed' | 'actioned' | 'dismissed' | 'expired';
      was_helpful: boolean | null;
      feedback_text: string | null;
      expires_at: Date | null;
      created_at: Date;
    }>(
      `SELECT * FROM journey_recommendations
       WHERE user_journey_id = $1
         AND ($2::TEXT IS NULL OR status = $2)
         AND (expires_at IS NULL OR expires_at > NOW())
       ORDER BY priority DESC, created_at DESC
       LIMIT $3`,
      [journeyId, status, limit]
    );

    return rows.map((row) => ({
      id: row.id,
      userJourneyId: row.user_journey_id,
      userId: row.user_id,
      recommendationType: row.recommendation_type,
      priority: row.priority,
      title: row.title,
      description: row.description,
      actionText: row.action_text,
      actionUrl: row.action_url,
      reasoning: row.reasoning,
      status: row.status,
      wasHelpful: row.was_helpful,
      feedbackText: row.feedback_text,
      expiresAt: row.expires_at,
      createdAt: row.created_at,
    }));
  },

  /**
   * Acknowledge an alert
   */
  async acknowledgeAlert(
    alertId: string,
    userId: string
  ): Promise<JourneyHealthAlert | null> {
    const result = await queryOne<{ id: string }>(
      `UPDATE journey_health_alerts
       SET status = 'acknowledged', acknowledged_at = NOW(), updated_at = NOW()
       WHERE id = $1 AND user_id = $2 AND status = 'active'
       RETURNING id`,
      [alertId, userId]
    );

    if (!result) {
      throw new ValidationError('Alert not found or already acknowledged');
    }

    log.info({ alertId, userId }, 'Alert acknowledged');

    // Return updated alert
    const row = await queryOne<{
      id: string;
      user_journey_id: string;
      user_id: string;
      alert_type: JourneyAlertType;
      severity: 'info' | 'warning' | 'critical';
      title: string;
      message: string;
      trigger_data: Record<string, unknown>;
      status: 'active' | 'acknowledged' | 'dismissed' | 'resolved';
      acknowledged_at: Date | null;
      dismissed_at: Date | null;
      resolved_at: Date | null;
      notification_sent: boolean;
      expires_at: Date | null;
      created_at: Date;
    }>(`SELECT * FROM journey_health_alerts WHERE id = $1`, [alertId]);

    if (!row) return null;

    return {
      id: row.id,
      userJourneyId: row.user_journey_id,
      userId: row.user_id,
      alertType: row.alert_type,
      severity: row.severity,
      title: row.title,
      message: row.message,
      triggerData: row.trigger_data,
      status: row.status,
      acknowledgedAt: row.acknowledged_at,
      dismissedAt: row.dismissed_at,
      resolvedAt: row.resolved_at,
      notificationSent: row.notification_sent,
      expiresAt: row.expires_at,
      createdAt: row.created_at,
    };
  },

  /**
   * Dismiss an alert
   */
  async dismissAlert(alertId: string, userId: string): Promise<boolean> {
    const result = await query(
      `UPDATE journey_health_alerts
       SET status = 'dismissed', dismissed_at = NOW(), updated_at = NOW()
       WHERE id = $1 AND user_id = $2 AND status IN ('active', 'acknowledged')`,
      [alertId, userId]
    );

    const rowCount = (result as { rowCount?: number })?.rowCount || 0;
    if (rowCount === 0) {
      throw new ValidationError('Alert not found or already dismissed');
    }

    log.info({ alertId, userId }, 'Alert dismissed');
    return true;
  },

  /**
   * Get risk level for a journey
   */
  async getJourneyRiskLevel(journeyId: string): Promise<JourneyRiskLevel> {
    const row = await queryOne<{ risk_level: JourneyRiskLevel }>(
      `SELECT risk_level FROM journey_health_scores WHERE user_journey_id = $1`,
      [journeyId]
    );

    if (!row) {
      // Calculate if not exists
      const health = await this.calculateHealthScore(journeyId);
      return health?.riskLevel || 'at_risk';
    }

    return row.risk_level;
  },

  /**
   * Mark recommendation as viewed
   */
  async markRecommendationViewed(recommendationId: string, userId: string): Promise<void> {
    await query(
      `UPDATE journey_recommendations
       SET status = 'viewed', viewed_at = NOW(), updated_at = NOW()
       WHERE id = $1 AND user_id = $2 AND status = 'active'`,
      [recommendationId, userId]
    );
  },

  /**
   * Mark recommendation as actioned
   */
  async markRecommendationActioned(recommendationId: string, userId: string): Promise<void> {
    await query(
      `UPDATE journey_recommendations
       SET status = 'actioned', actioned_at = NOW(), updated_at = NOW()
       WHERE id = $1 AND user_id = $2 AND status IN ('active', 'viewed')`,
      [recommendationId, userId]
    );
  },

  /**
   * Provide feedback on a recommendation
   */
  async provideFeedback(
    recommendationId: string,
    userId: string,
    wasHelpful: boolean,
    feedbackText?: string
  ): Promise<void> {
    await query(
      `UPDATE journey_recommendations
       SET was_helpful = $3, feedback_text = $4, feedback_at = NOW(), updated_at = NOW()
       WHERE id = $1 AND user_id = $2`,
      [recommendationId, userId, wasHelpful, feedbackText || null]
    );

    log.info({ recommendationId, wasHelpful }, 'Recommendation feedback received');
  },

  /**
   * Recalculate health scores for all active journeys (batch operation)
   */
  async recalculateAllHealthScores(): Promise<{
    journeysProcessed: number;
    alertsCreated: number;
    durationMs: number;
  }> {
    log.info('Starting batch health score recalculation');

    try {
      const result = await withLock(
        'journey-health:recalculate-all',
        async () => {
          const row = await queryOne<{
            journeys_processed: number;
            alerts_created: number;
            duration_ms: number;
          }>('SELECT * FROM recalculate_all_journey_health_scores()');

          return row || { journeys_processed: 0, alerts_created: 0, duration_ms: 0 };
        },
        { ttl: 600000 } // 10 minute lock
      );

      log.info(
        {
          journeysProcessed: result.journeys_processed,
          alertsCreated: result.alerts_created,
          durationMs: result.duration_ms,
        },
        'Batch health score recalculation complete'
      );

      return {
        journeysProcessed: result.journeys_processed,
        alertsCreated: result.alerts_created,
        durationMs: result.duration_ms,
      };
    } catch (err) {
      if ((err as Error).message?.includes('Failed to acquire lock')) {
        log.debug('Another instance is already recalculating health scores');
        return { journeysProcessed: 0, alertsCreated: 0, durationMs: 0 };
      }
      throw err;
    }
  },

  /**
   * Get health score history for trend analysis
   */
  async getHealthHistory(
    journeyId: string,
    days: number = 30
  ): Promise<
    Array<{
      date: string;
      healthScore: number;
      engagementScore: number;
      consistencyScore: number;
      momentumScore: number;
      riskLevel: JourneyRiskLevel;
    }>
  > {
    const rows = await queryAll<{
      recorded_date: Date;
      health_score: number;
      engagement_score: number;
      consistency_score: number;
      momentum_score: number;
      risk_level: JourneyRiskLevel;
    }>(
      `SELECT recorded_date, health_score, engagement_score, consistency_score, momentum_score, risk_level
       FROM journey_health_history
       WHERE user_journey_id = $1
         AND recorded_date >= CURRENT_DATE - INTERVAL '1 day' * $2
       ORDER BY recorded_date ASC`,
      [journeyId, days]
    );

    return rows.map((row) => ({
      date: row.recorded_date.toISOString().split('T')[0],
      healthScore: row.health_score,
      engagementScore: row.engagement_score,
      consistencyScore: row.consistency_score,
      momentumScore: row.momentum_score,
      riskLevel: row.risk_level,
    }));
  },

  /**
   * Create a custom alert
   */
  async createAlert(
    journeyId: string,
    userId: string,
    alertType: JourneyAlertType,
    severity: 'info' | 'warning' | 'critical',
    title: string,
    message: string,
    triggerData: Record<string, unknown> = {},
    expiresInDays: number = 7
  ): Promise<JourneyHealthAlert> {
    const result = await queryOne<{
      id: string;
      user_journey_id: string;
      user_id: string;
      alert_type: JourneyAlertType;
      severity: 'info' | 'warning' | 'critical';
      title: string;
      message: string;
      trigger_data: Record<string, unknown>;
      status: 'active' | 'acknowledged' | 'dismissed' | 'resolved';
      acknowledged_at: Date | null;
      dismissed_at: Date | null;
      resolved_at: Date | null;
      notification_sent: boolean;
      expires_at: Date | null;
      created_at: Date;
    }>(
      `INSERT INTO journey_health_alerts (
        user_journey_id, user_id, alert_type, severity, title, message,
        trigger_data, expires_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, NOW() + INTERVAL '1 day' * $8)
      RETURNING *`,
      [journeyId, userId, alertType, severity, title, message, JSON.stringify(triggerData), expiresInDays]
    );

    if (!result) {
      throw new Error('Failed to create alert');
    }

    log.info({ journeyId, alertType, severity }, 'Custom alert created');

    return {
      id: result.id,
      userJourneyId: result.user_journey_id,
      userId: result.user_id,
      alertType: result.alert_type,
      severity: result.severity,
      title: result.title,
      message: result.message,
      triggerData: result.trigger_data,
      status: result.status,
      acknowledgedAt: result.acknowledged_at,
      dismissedAt: result.dismissed_at,
      resolvedAt: result.resolved_at,
      notificationSent: result.notification_sent,
      expiresAt: result.expires_at,
      createdAt: result.created_at,
    };
  },
};

export default journeyHealthService;
