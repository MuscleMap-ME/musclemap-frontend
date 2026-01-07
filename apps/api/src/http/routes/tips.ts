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
    sql += ` ORDER BY priority DESC LIMIT $${paramIndex}`;
    queryParams.push(parseInt(params.limit || '5'));

    const tips = await queryAll<{
      id: string;
      trigger_type: string;
      trigger_value: string;
      category: string;
      title: string;
      content: string;
      priority: number;
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
        priority: t.priority,
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
      description: string;
      category: string;
      condition_type: string;
      condition_value: string;
      reward_credits: number;
      badge_icon: string;
    }>('SELECT * FROM milestones');

    // Get user's progress
    const progress = await queryAll<{
      milestone_id: string;
      progress: number;
      completed_at: Date;
      reward_claimed: boolean;
    }>(
      'SELECT * FROM user_milestone_progress WHERE user_id = $1',
      [userId]
    );

    const progressMap = new Map(progress.map((p) => [p.milestone_id, p]));

    return reply.send({
      data: milestones.map((m) => {
        const userProgress = progressMap.get(m.id);
        return {
          id: m.id,
          name: m.name,
          description: m.description,
          category: m.category,
          conditionType: m.condition_type,
          conditionValue: JSON.parse(m.condition_value || '{}'),
          rewardCredits: m.reward_credits,
          badgeIcon: m.badge_icon,
          progress: userProgress?.progress || 0,
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
    const progress = await queryOne<{
      completed_at: Date;
      reward_claimed: boolean;
    }>(
      'SELECT completed_at, reward_claimed FROM user_milestone_progress WHERE user_id = $1 AND milestone_id = $2',
      [userId, id]
    );

    if (!progress?.completed_at) {
      return reply.status(400).send({
        error: { code: 'NOT_COMPLETED', message: 'Milestone not yet completed', statusCode: 400 },
      });
    }

    if (progress.reward_claimed) {
      return reply.status(400).send({
        error: { code: 'ALREADY_CLAIMED', message: 'Reward already claimed', statusCode: 400 },
      });
    }

    // Get milestone reward
    const milestone = await queryOne<{ reward_credits: number }>(
      'SELECT reward_credits FROM milestones WHERE id = $1',
      [id]
    );

    if (!milestone) {
      return reply.status(404).send({
        error: { code: 'NOT_FOUND', message: 'Milestone not found', statusCode: 404 },
      });
    }

    // Add credits and mark as claimed
    const { economyService } = require('../../modules/economy');
    await economyService.addCredits(
      userId,
      milestone.reward_credits,
      'milestone.claim',
      { milestoneId: id },
      `milestone-${id}-${userId}`
    );

    await query(
      'UPDATE user_milestone_progress SET reward_claimed = TRUE WHERE user_id = $1 AND milestone_id = $2',
      [userId, id]
    );

    return reply.send({
      data: { credited: milestone.reward_credits },
    });
  });

  // Update milestone progress (internal use)
  app.post('/milestones/:id/progress', { preHandler: authenticate }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const { progress } = request.body as { progress: number };
    const userId = request.user!.userId;

    await query(
      `INSERT INTO user_milestone_progress (user_id, milestone_id, progress)
       VALUES ($1, $2, $3)
       ON CONFLICT (user_id, milestone_id)
       DO UPDATE SET progress = GREATEST(user_milestone_progress.progress, $3)`,
      [userId, id, progress]
    );

    // Check if milestone is now complete
    const milestone = await queryOne<{ condition_value: string }>(
      'SELECT condition_value FROM milestones WHERE id = $1',
      [id]
    );

    if (milestone) {
      const condition = JSON.parse(milestone.condition_value || '{}');
      if (progress >= (condition.target || 0)) {
        await query(
          `UPDATE user_milestone_progress
           SET completed_at = NOW()
           WHERE user_id = $1 AND milestone_id = $2 AND completed_at IS NULL`,
          [userId, id]
        );
      }
    }

    return reply.send({ data: { progress } });
  });
}
