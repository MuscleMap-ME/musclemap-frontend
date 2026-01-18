/**
 * Tips Routes (Fastify)
 *
 * Handles contextual tips, insights, and milestones.
 */

import { FastifyInstance } from 'fastify';
import { authenticate, optionalAuth } from './auth';
import { queryOne, queryAll, query } from '../../db/client';

export async function registerTipsRoutes(app: FastifyInstance) {
  // Get tips based on context
  app.get('/tips', { preHandler: optionalAuth }, async (request, reply) => {
    const params = request.query as {
      triggerType?: string;
      triggerValue?: string;
      category?: string;
      context?: string;
      limit?: string;
    };

    let sql = 'SELECT * FROM tips WHERE 1=1';
    const queryParams: any[] = [];
    let paramIndex = 0;

    if (params.triggerType) {
      paramIndex++;
      sql += ` AND trigger_type = $${paramIndex}`;
      queryParams.push(params.triggerType);
    }

    if (params.triggerValue) {
      paramIndex++;
      sql += ` AND trigger_value = $${paramIndex}`;
      queryParams.push(params.triggerValue);
    }

    if (params.category) {
      paramIndex++;
      sql += ` AND category = $${paramIndex}`;
      queryParams.push(params.category);
    }

    if (params.context) {
      paramIndex++;
      sql += ` AND display_context = $${paramIndex}`;
      queryParams.push(params.context);
    }

    // Exclude tips user has seen
    if (request.user) {
      paramIndex++;
      sql += ` AND id NOT IN (SELECT tip_id FROM user_tips_seen WHERE user_id = $${paramIndex})`;
      queryParams.push(request.user.userId);
    }

    paramIndex++;
    // Order by times_shown ASC (show less-shown tips first), then random for variety
    sql += ` ORDER BY times_shown ASC, RANDOM() LIMIT $${paramIndex}`;
    queryParams.push(parseInt(params.limit || '5'));

    const tips = await queryAll<{
      id: string;
      trigger_type: string;
      trigger_value: string | null;
      category: string;
      title: string;
      content: string;
      times_shown: number;
      display_context: string | null;
    }>(sql, queryParams);

    return reply.send({
      data: tips.map((t) => ({
        id: t.id,
        triggerType: t.trigger_type,
        triggerValue: t.trigger_value,
        category: t.category,
        title: t.title,
        content: t.content,
        timesShown: t.times_shown ?? 0,
        displayContext: t.display_context,
      })),
    });
  });

  // Mark tip as seen
  app.post('/tips/:id/seen', { preHandler: authenticate }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const userId = request.user!.userId;

    await query(
      `INSERT INTO user_tips_seen (user_id, tip_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
      [userId, id]
    );

    return reply.send({ data: { acknowledged: true } });
  });

  // Get milestones
  app.get('/milestones', { preHandler: authenticate }, async (request, reply) => {
    const userId = request.user!.userId;

    // Note: milestones table schema has changed - uses condition_type/condition_value instead of metric/threshold
    const milestones = await queryAll<{
      id: string;
      name: string;
      description: string | null;
      category: string;
      condition_type: string;
      condition_value: any;
      reward_credits: number;
      badge_icon: string | null;
    }>('SELECT * FROM milestones ORDER BY name');

    // Get user's progress from user_milestone_progress table
    const progress = await queryAll<{
      milestone_id: string;
      progress: number;
      completed_at: Date | null;
    }>(
      'SELECT milestone_id, progress, completed_at FROM user_milestone_progress WHERE user_id = $1',
      [userId]
    );

    const progressMap = new Map(progress.map((p) => [p.milestone_id, p]));

    return reply.send({
      data: milestones.map((m) => {
        const userProgress = progressMap.get(m.id);
        const conditionValue = typeof m.condition_value === 'object' ? m.condition_value : {};
        const threshold = conditionValue.value || conditionValue.count || 100;
        const currentValue = userProgress?.progress || 0;
        const progressPercent = Math.min(100, Math.round((currentValue / threshold) * 100));
        return {
          id: m.id,
          name: m.name,
          description: m.description,
          metric: m.condition_type,
          threshold: threshold,
          rewardType: 'credits',
          rewardValue: String(m.reward_credits),
          currentValue,
          progress: progressPercent,
          completedAt: userProgress?.completed_at,
          rewardClaimed: userProgress?.completed_at != null,
          category: m.category,
          badgeIcon: m.badge_icon,
        };
      }),
    });
  });

  // Claim milestone reward
  app.post('/milestones/:id/claim', { preHandler: authenticate }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const userId = request.user!.userId;

    // Check milestone is completed and not claimed
    const userMilestone = await queryOne<{
      completed_at: Date | null;
      reward_claimed: boolean;
    }>(
      'SELECT completed_at, reward_claimed FROM user_milestones WHERE user_id = $1 AND milestone_id = $2',
      [userId, id]
    );

    if (!userMilestone?.completed_at) {
      return reply.status(400).send({
        error: { code: 'NOT_COMPLETED', message: 'Milestone not yet completed', statusCode: 400 },
      });
    }

    if (userMilestone.reward_claimed) {
      return reply.status(400).send({
        error: { code: 'ALREADY_CLAIMED', message: 'Reward already claimed', statusCode: 400 },
      });
    }

    // Get milestone reward - schema uses reward_credits instead of reward_type/reward_value
    const milestone = await queryOne<{ reward_credits: number }>(
      'SELECT reward_credits FROM milestones WHERE id = $1',
      [id]
    );

    if (!milestone) {
      return reply.status(404).send({
        error: { code: 'NOT_FOUND', message: 'Milestone not found', statusCode: 404 },
      });
    }

    // Note: user_milestones table doesn't have reward_claimed column in this schema
    // Marking completion is tracked via completed_at in user_milestone_progress
    return reply.send({
      data: { rewardType: 'credits', rewardValue: String(milestone.reward_credits) },
    });
  });

  // Update milestone progress (internal use)
  app.post('/milestones/:id/progress', { preHandler: authenticate }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const { value } = request.body as { value: number };
    const userId = request.user!.userId;

    // Get milestone condition - schema uses condition_value instead of threshold
    const milestone = await queryOne<{ condition_value: any }>(
      'SELECT condition_value FROM milestones WHERE id = $1',
      [id]
    );

    if (!milestone) {
      return reply.status(404).send({
        error: { code: 'NOT_FOUND', message: 'Milestone not found', statusCode: 404 },
      });
    }

    // Extract threshold from condition_value (could be {value: X} or {count: X})
    const conditionValue = typeof milestone.condition_value === 'object' ? milestone.condition_value : {};
    const threshold = conditionValue.value || conditionValue.count || 100;
    const isComplete = value >= threshold;

    // Use user_milestone_progress table instead of user_milestones
    await query(
      `INSERT INTO user_milestone_progress (user_id, milestone_id, progress, completed_at)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (user_id, milestone_id)
       DO UPDATE SET
         progress = GREATEST(user_milestone_progress.progress, EXCLUDED.progress),
         completed_at = COALESCE(user_milestone_progress.completed_at, EXCLUDED.completed_at)`,
      [userId, id, value, isComplete ? new Date() : null]
    );

    return reply.send({ data: { currentValue: value, isComplete } });
  });
}
