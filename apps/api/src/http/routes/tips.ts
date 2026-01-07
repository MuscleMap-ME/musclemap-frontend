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
    sql += ` ORDER BY times_shown ASC, RANDOM() LIMIT $${paramIndex}`;
    queryParams.push(parseInt(params.limit || '5'));

    const tips = await queryAll<{
      id: string;
      trigger_type: string;
      trigger_value: string;
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
        timesShown: t.times_shown,
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

    const milestones = await queryAll<{
      id: string;
      name: string;
      description: string | null;
      metric: string;
      threshold: number;
      reward_type: string | null;
      reward_value: string | null;
    }>('SELECT * FROM milestones ORDER BY threshold');

    // Get user's progress
    const progress = await queryAll<{
      milestone_id: string;
      current_value: number;
      completed_at: Date | null;
      reward_claimed: boolean;
    }>(
      'SELECT * FROM user_milestones WHERE user_id = $1',
      [userId]
    );

    const progressMap = new Map(progress.map((p) => [p.milestone_id, p]));

    return reply.send({
      data: milestones.map((m) => {
        const userProgress = progressMap.get(m.id);
        const currentValue = userProgress?.current_value || 0;
        const progressPercent = Math.min(100, Math.round((currentValue / m.threshold) * 100));
        return {
          id: m.id,
          name: m.name,
          description: m.description,
          metric: m.metric,
          threshold: m.threshold,
          rewardType: m.reward_type,
          rewardValue: m.reward_value,
          currentValue,
          progress: progressPercent,
          completedAt: userProgress?.completed_at,
          rewardClaimed: userProgress?.reward_claimed || false,
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

    // Get milestone reward
    const milestone = await queryOne<{ reward_type: string | null; reward_value: string | null }>(
      'SELECT reward_type, reward_value FROM milestones WHERE id = $1',
      [id]
    );

    if (!milestone) {
      return reply.status(404).send({
        error: { code: 'NOT_FOUND', message: 'Milestone not found', statusCode: 404 },
      });
    }

    // Mark as claimed
    await query(
      'UPDATE user_milestones SET reward_claimed = TRUE WHERE user_id = $1 AND milestone_id = $2',
      [userId, id]
    );

    return reply.send({
      data: { rewardType: milestone.reward_type, rewardValue: milestone.reward_value },
    });
  });

  // Update milestone progress (internal use)
  app.post('/milestones/:id/progress', { preHandler: authenticate }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const { value } = request.body as { value: number };
    const userId = request.user!.userId;

    // Get milestone threshold
    const milestone = await queryOne<{ threshold: number }>(
      'SELECT threshold FROM milestones WHERE id = $1',
      [id]
    );

    if (!milestone) {
      return reply.status(404).send({
        error: { code: 'NOT_FOUND', message: 'Milestone not found', statusCode: 404 },
      });
    }

    const isComplete = value >= milestone.threshold;

    await query(
      `INSERT INTO user_milestones (user_id, milestone_id, current_value, completed_at)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (user_id, milestone_id)
       DO UPDATE SET
         current_value = GREATEST(user_milestones.current_value, EXCLUDED.current_value),
         completed_at = COALESCE(user_milestones.completed_at, EXCLUDED.completed_at)`,
      [userId, id, value, isComplete ? new Date() : null]
    );

    return reply.send({ data: { currentValue: value, isComplete } });
  });
}
