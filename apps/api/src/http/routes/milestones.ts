/**
 * Milestones Routes
 *
 * Elite bodyweight skill tracking with progression trees.
 * Track skills like planche, muscle-up, iron cross, etc.
 */

import { FastifyInstance } from 'fastify';
import { authenticate } from './auth';
import { db } from '../../db/client';
import { loggers } from '../../lib/logger';

const log = loggers.http.child({ module: 'milestones-routes' });

// Milestone categories
const MILESTONE_CATEGORIES = [
  { id: 'handstands_inversions', name: 'Handstands & Inversions', icon: 'hand-raised' },
  { id: 'straight_arm_strength', name: 'Straight-Arm Strength', icon: 'arm-flex' },
  { id: 'pulling_power', name: 'Pulling Power', icon: 'arrow-up' },
  { id: 'pushing_power', name: 'Pushing Power', icon: 'arrow-down' },
  { id: 'rings_skills', name: 'Rings Skills', icon: 'rings' },
  { id: 'flag_pole', name: 'Human Flag & Pole', icon: 'flag' },
  { id: 'dynamic_tumbling', name: 'Dynamic & Tumbling', icon: 'flip' },
  { id: 'grip_forearm', name: 'Grip & Forearm', icon: 'hand' },
];

export async function registerMilestonesRoutes(app: FastifyInstance) {
  /**
   * GET /milestones/categories
   * List all milestone categories
   */
  app.get('/milestones/categories', async (request, reply) => {
    // Get count per category
    const counts = await db.queryAll<{ category: string; count: string }>(
      `SELECT category, COUNT(*) as count FROM skill_milestones WHERE is_active = TRUE GROUP BY category`
    );

    const countMap = new Map(counts.map(c => [c.category, parseInt(c.count)]));

    const categories = MILESTONE_CATEGORIES.map(cat => ({
      ...cat,
      milestoneCount: countMap.get(cat.id) || 0,
    }));

    return reply.send({ data: { categories } });
  });

  /**
   * GET /milestones
   * List all milestones with optional filters
   */
  app.get('/milestones', async (request, reply) => {
    const { category, difficulty, apparatus, featured } = request.query as {
      category?: string;
      difficulty?: string;
      apparatus?: string;
      featured?: string;
    };

    let query = `
      SELECT id, name, description, category, subcategory, apparatus,
             difficulty_level, prerequisite_milestone_ids, hold_time_seconds,
             rep_count, achievement_criteria, xp_reward, video_url,
             thumbnail_url, icon, is_featured
      FROM skill_milestones
      WHERE is_active = TRUE
    `;
    const params: unknown[] = [];
    let paramIndex = 1;

    if (category) {
      query += ` AND category = $${paramIndex}`;
      params.push(category);
      paramIndex++;
    }

    if (difficulty) {
      query += ` AND difficulty_level = $${paramIndex}`;
      params.push(parseInt(difficulty));
      paramIndex++;
    }

    if (apparatus) {
      query += ` AND $${paramIndex} = ANY(apparatus)`;
      params.push(apparatus);
      paramIndex++;
    }

    if (featured === 'true') {
      query += ` AND is_featured = TRUE`;
    }

    query += ` ORDER BY difficulty_level ASC, display_order ASC, name ASC`;

    const rows = await db.queryAll<{
      id: string;
      name: string;
      description: string | null;
      category: string;
      subcategory: string | null;
      apparatus: string[];
      difficulty_level: number;
      prerequisite_milestone_ids: string[];
      hold_time_seconds: number | null;
      rep_count: number | null;
      achievement_criteria: string | null;
      xp_reward: number;
      video_url: string | null;
      thumbnail_url: string | null;
      icon: string | null;
      is_featured: boolean;
    }>(query, params);

    const milestones = rows.map(m => ({
      id: m.id,
      name: m.name,
      description: m.description,
      category: m.category,
      subcategory: m.subcategory,
      apparatus: m.apparatus,
      difficultyLevel: m.difficulty_level,
      prerequisiteIds: m.prerequisite_milestone_ids,
      holdTimeSeconds: m.hold_time_seconds,
      repCount: m.rep_count,
      achievementCriteria: m.achievement_criteria,
      xpReward: m.xp_reward,
      videoUrl: m.video_url,
      thumbnailUrl: m.thumbnail_url,
      icon: m.icon,
      isFeatured: m.is_featured,
    }));

    return reply.send({ data: { milestones } });
  });

  /**
   * GET /milestones/featured
   * Get featured milestones for showcase
   */
  app.get('/milestones/featured', async (request, reply) => {
    const rows = await db.queryAll<{
      id: string;
      name: string;
      description: string | null;
      category: string;
      difficulty_level: number;
      xp_reward: number;
      thumbnail_url: string | null;
    }>(
      `SELECT id, name, description, category, difficulty_level, xp_reward, thumbnail_url
       FROM skill_milestones
       WHERE is_active = TRUE AND is_featured = TRUE
       ORDER BY difficulty_level ASC
       LIMIT 8`
    );

    return reply.send({
      data: {
        featured: rows.map(m => ({
          id: m.id,
          name: m.name,
          description: m.description,
          category: m.category,
          difficultyLevel: m.difficulty_level,
          xpReward: m.xp_reward,
          thumbnailUrl: m.thumbnail_url,
        })),
      },
    });
  });

  /**
   * GET /milestones/:id
   * Get milestone details with progression tree
   */
  app.get('/milestones/:id', async (request, reply) => {
    const { id } = request.params as { id: string };

    const milestone = await db.queryOne<{
      id: string;
      name: string;
      description: string | null;
      category: string;
      subcategory: string | null;
      apparatus: string[];
      equipment_required: string[];
      difficulty_level: number;
      prerequisite_milestone_ids: string[];
      prerequisite_skills: string[];
      hold_time_seconds: number | null;
      rep_count: number | null;
      achievement_criteria: string | null;
      xp_reward: number;
      badge_id: string | null;
      video_url: string | null;
      thumbnail_url: string | null;
      demo_gif_url: string | null;
      icon: string | null;
      is_featured: boolean;
    }>(
      `SELECT * FROM skill_milestones WHERE id = $1 AND is_active = TRUE`,
      [id]
    );

    if (!milestone) {
      return reply.status(404).send({
        error: { code: 'NOT_FOUND', message: 'Milestone not found', statusCode: 404 },
      });
    }

    // Get progressions
    const progressions = await db.queryAll<{
      id: string;
      step_number: number;
      name: string;
      description: string | null;
      criteria_type: string;
      criteria_value: number | null;
      criteria_description: string | null;
      exercise_name: string | null;
      estimated_days_min: number | null;
      estimated_days_max: number | null;
      video_url: string | null;
      tips: string[];
    }>(
      `SELECT * FROM milestone_progressions WHERE milestone_id = $1 ORDER BY step_number ASC`,
      [id]
    );

    // Get prerequisite milestone names
    let prerequisites: { id: string; name: string }[] = [];
    if (milestone.prerequisite_milestone_ids?.length > 0) {
      prerequisites = await db.queryAll<{ id: string; name: string }>(
        `SELECT id, name FROM skill_milestones WHERE id = ANY($1)`,
        [milestone.prerequisite_milestone_ids]
      );
    }

    return reply.send({
      data: {
        milestone: {
          id: milestone.id,
          name: milestone.name,
          description: milestone.description,
          category: milestone.category,
          subcategory: milestone.subcategory,
          apparatus: milestone.apparatus,
          equipmentRequired: milestone.equipment_required,
          difficultyLevel: milestone.difficulty_level,
          prerequisites,
          prerequisiteSkills: milestone.prerequisite_skills,
          holdTimeSeconds: milestone.hold_time_seconds,
          repCount: milestone.rep_count,
          achievementCriteria: milestone.achievement_criteria,
          xpReward: milestone.xp_reward,
          badgeId: milestone.badge_id,
          videoUrl: milestone.video_url,
          thumbnailUrl: milestone.thumbnail_url,
          demoGifUrl: milestone.demo_gif_url,
          icon: milestone.icon,
          isFeatured: milestone.is_featured,
        },
        progressions: progressions.map(p => ({
          id: p.id,
          stepNumber: p.step_number,
          name: p.name,
          description: p.description,
          criteriaType: p.criteria_type,
          criteriaValue: p.criteria_value,
          criteriaDescription: p.criteria_description,
          exerciseName: p.exercise_name,
          estimatedDaysMin: p.estimated_days_min,
          estimatedDaysMax: p.estimated_days_max,
          videoUrl: p.video_url,
          tips: p.tips,
        })),
      },
    });
  });

  /**
   * GET /milestones/categories/:category
   * Get milestones in a specific category
   */
  app.get('/milestones/categories/:category', async (request, reply) => {
    const { category } = request.params as { category: string };

    const rows = await db.queryAll<{
      id: string;
      name: string;
      description: string | null;
      subcategory: string | null;
      difficulty_level: number;
      xp_reward: number;
      hold_time_seconds: number | null;
      rep_count: number | null;
    }>(
      `SELECT id, name, description, subcategory, difficulty_level, xp_reward, hold_time_seconds, rep_count
       FROM skill_milestones
       WHERE category = $1 AND is_active = TRUE
       ORDER BY difficulty_level ASC, display_order ASC`,
      [category]
    );

    // Group by subcategory
    const subcategories = new Map<string, typeof rows>();
    for (const m of rows) {
      const sub = m.subcategory || 'general';
      if (!subcategories.has(sub)) {
        subcategories.set(sub, []);
      }
      subcategories.get(sub)!.push(m);
    }

    const grouped = Array.from(subcategories.entries()).map(([subcategory, milestones]) => ({
      subcategory,
      milestones: milestones.map(m => ({
        id: m.id,
        name: m.name,
        description: m.description,
        difficultyLevel: m.difficulty_level,
        xpReward: m.xp_reward,
        holdTimeSeconds: m.hold_time_seconds,
        repCount: m.rep_count,
      })),
    }));

    const categoryInfo = MILESTONE_CATEGORIES.find(c => c.id === category);

    return reply.send({
      data: {
        category: categoryInfo || { id: category, name: category, icon: null },
        subcategories: grouped,
        totalCount: rows.length,
      },
    });
  });

  // ============================================
  // AUTHENTICATED ENDPOINTS
  // ============================================

  /**
   * GET /milestones/me
   * Get user's active milestones
   */
  app.get('/milestones/me', { preHandler: authenticate }, async (request, reply) => {
    const userId = request.user!.userId;

    const rows = await db.queryAll<{
      id: string;
      milestone_id: string;
      status: string;
      current_progression_step: number;
      started_at: string;
      achieved_at: string | null;
      best_hold_seconds: number | null;
      best_reps: number | null;
      best_attempt_date: string | null;
      milestone_name: string;
      milestone_category: string;
      difficulty_level: number;
      total_steps: string;
    }>(
      `SELECT um.id, um.milestone_id, um.status, um.current_progression_step,
              um.started_at, um.achieved_at, um.best_hold_seconds, um.best_reps, um.best_attempt_date,
              sm.name as milestone_name, sm.category as milestone_category, sm.difficulty_level,
              (SELECT COUNT(*) FROM milestone_progressions WHERE milestone_id = sm.id) as total_steps
       FROM user_skill_milestones um
       JOIN skill_milestones sm ON um.milestone_id = sm.id
       WHERE um.user_id = $1
       ORDER BY um.status ASC, um.updated_at DESC`,
      [userId]
    );

    const userMilestones = rows.map(m => ({
      id: m.id,
      milestoneId: m.milestone_id,
      milestoneName: m.milestone_name,
      milestoneCategory: m.milestone_category,
      difficultyLevel: m.difficulty_level,
      status: m.status,
      currentStep: m.current_progression_step,
      totalSteps: parseInt(m.total_steps),
      startedAt: m.started_at,
      achievedAt: m.achieved_at,
      bestHoldSeconds: m.best_hold_seconds,
      bestReps: m.best_reps,
      bestAttemptDate: m.best_attempt_date,
    }));

    return reply.send({ data: { milestones: userMilestones } });
  });

  /**
   * POST /milestones/start
   * Start pursuing a milestone
   */
  app.post('/milestones/start', { preHandler: authenticate }, async (request, reply) => {
    const userId = request.user!.userId;
    const { milestoneId } = request.body as { milestoneId: string };

    // Check milestone exists
    const milestone = await db.queryOne<{ id: string; name: string }>(
      `SELECT id, name FROM skill_milestones WHERE id = $1 AND is_active = TRUE`,
      [milestoneId]
    );

    if (!milestone) {
      return reply.status(404).send({
        error: { code: 'NOT_FOUND', message: 'Milestone not found', statusCode: 404 },
      });
    }

    // Check if already tracking
    const existing = await db.queryOne<{ id: string; status: string }>(
      `SELECT id, status FROM user_skill_milestones WHERE user_id = $1 AND milestone_id = $2`,
      [userId, milestoneId]
    );

    if (existing) {
      if (existing.status === 'active') {
        return reply.status(400).send({
          error: { code: 'ALREADY_TRACKING', message: 'Already tracking this milestone', statusCode: 400 },
        });
      }
      // Reactivate
      await db.query(
        `UPDATE user_skill_milestones SET status = 'active', paused_at = NULL, updated_at = NOW() WHERE id = $1`,
        [existing.id]
      );
      return reply.send({ data: { id: existing.id }, message: 'Milestone reactivated' });
    }

    // Create new tracking
    const result = await db.queryOne<{ id: string }>(
      `INSERT INTO user_skill_milestones (user_id, milestone_id) VALUES ($1, $2) RETURNING id`,
      [userId, milestoneId]
    );

    log.info({ userId, milestoneId }, 'User started milestone');

    return reply.status(201).send({
      data: { id: result?.id, milestoneName: milestone.name },
      message: 'Milestone tracking started',
    });
  });

  /**
   * POST /milestones/me/:userMilestoneId/log
   * Log an attempt for a milestone
   */
  app.post('/milestones/me/:userMilestoneId/log', { preHandler: authenticate }, async (request, reply) => {
    const userId = request.user!.userId;
    const { userMilestoneId } = request.params as { userMilestoneId: string };
    const { holdSeconds, repsCompleted, formRating, success, notes, videoUrl } = request.body as {
      holdSeconds?: number;
      repsCompleted?: number;
      formRating?: number;
      success?: boolean;
      notes?: string;
      videoUrl?: string;
    };

    // Verify ownership
    const userMilestone = await db.queryOne<{
      id: string;
      milestone_id: string;
      current_progression_step: number;
      best_hold_seconds: number | null;
      best_reps: number | null;
    }>(
      `SELECT id, milestone_id, current_progression_step, best_hold_seconds, best_reps
       FROM user_skill_milestones WHERE id = $1 AND user_id = $2 AND status = 'active'`,
      [userMilestoneId, userId]
    );

    if (!userMilestone) {
      return reply.status(404).send({
        error: { code: 'NOT_FOUND', message: 'Active milestone not found', statusCode: 404 },
      });
    }

    // Log the attempt
    await db.query(
      `INSERT INTO user_milestone_attempts (user_id, user_milestone_id, milestone_id, progression_step, hold_seconds, reps_completed, form_rating, success, notes, video_url)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [userId, userMilestoneId, userMilestone.milestone_id, userMilestone.current_progression_step, holdSeconds || null, repsCompleted || null, formRating || null, success || false, notes || null, videoUrl || null]
    );

    // Update best if applicable
    const updates: string[] = [];
    const updateValues: unknown[] = [];
    let updateIndex = 1;

    if (holdSeconds && (!userMilestone.best_hold_seconds || holdSeconds > userMilestone.best_hold_seconds)) {
      updates.push(`best_hold_seconds = $${updateIndex}`);
      updateValues.push(holdSeconds);
      updateIndex++;
    }

    if (repsCompleted && (!userMilestone.best_reps || repsCompleted > userMilestone.best_reps)) {
      updates.push(`best_reps = $${updateIndex}`);
      updateValues.push(repsCompleted);
      updateIndex++;
    }

    if (updates.length > 0) {
      updates.push(`best_attempt_date = CURRENT_DATE`);
      updates.push(`updated_at = NOW()`);
      updateValues.push(userMilestoneId);
      await db.query(
        `UPDATE user_skill_milestones SET ${updates.join(', ')} WHERE id = $${updateIndex}`,
        updateValues
      );
    }

    // Check if milestone achieved
    let achieved = false;
    if (success) {
      const milestone = await db.queryOne<{ hold_time_seconds: number | null; rep_count: number | null; xp_reward: number }>(
        `SELECT hold_time_seconds, rep_count, xp_reward FROM skill_milestones WHERE id = $1`,
        [userMilestone.milestone_id]
      );

      if (milestone) {
        const holdMet = !milestone.hold_time_seconds || (holdSeconds && holdSeconds >= milestone.hold_time_seconds);
        const repsMet = !milestone.rep_count || (repsCompleted && repsCompleted >= milestone.rep_count);

        if (holdMet && repsMet) {
          achieved = true;
          await db.query(
            `UPDATE user_skill_milestones SET status = 'achieved', achieved_at = NOW(), updated_at = NOW() WHERE id = $1`,
            [userMilestoneId]
          );
          // Award XP
          await db.query(
            `UPDATE users SET xp = COALESCE(xp, 0) + $1 WHERE id = $2`,
            [milestone.xp_reward, userId]
          );
          log.info({ userId, milestoneId: userMilestone.milestone_id, xp: milestone.xp_reward }, 'Milestone achieved');
        }
      }
    }

    return reply.send({
      data: {
        achieved,
        newPersonalBest: updates.length > 0,
      },
      message: achieved ? 'Milestone achieved!' : 'Attempt logged',
    });
  });

  /**
   * PUT /milestones/me/:userMilestoneId/progress
   * Update progression step
   */
  app.put('/milestones/me/:userMilestoneId/progress', { preHandler: authenticate }, async (request, reply) => {
    const userId = request.user!.userId;
    const { userMilestoneId } = request.params as { userMilestoneId: string };
    const { progressionStep } = request.body as { progressionStep: number };

    const result = await db.query(
      `UPDATE user_skill_milestones SET current_progression_step = $1, updated_at = NOW()
       WHERE id = $2 AND user_id = $3 AND status = 'active'`,
      [progressionStep, userMilestoneId, userId]
    );

    if (result.rowCount === 0) {
      return reply.status(404).send({
        error: { code: 'NOT_FOUND', message: 'Active milestone not found', statusCode: 404 },
      });
    }

    return reply.send({ message: 'Progress updated' });
  });

  /**
   * PUT /milestones/me/:userMilestoneId/pause
   * Pause a milestone
   */
  app.put('/milestones/me/:userMilestoneId/pause', { preHandler: authenticate }, async (request, reply) => {
    const userId = request.user!.userId;
    const { userMilestoneId } = request.params as { userMilestoneId: string };

    await db.query(
      `UPDATE user_skill_milestones SET status = 'paused', paused_at = NOW(), updated_at = NOW()
       WHERE id = $1 AND user_id = $2 AND status = 'active'`,
      [userMilestoneId, userId]
    );

    return reply.send({ message: 'Milestone paused' });
  });

  /**
   * DELETE /milestones/me/:userMilestoneId
   * Abandon a milestone
   */
  app.delete('/milestones/me/:userMilestoneId', { preHandler: authenticate }, async (request, reply) => {
    const userId = request.user!.userId;
    const { userMilestoneId } = request.params as { userMilestoneId: string };

    await db.query(
      `UPDATE user_skill_milestones SET status = 'abandoned', updated_at = NOW()
       WHERE id = $1 AND user_id = $2`,
      [userMilestoneId, userId]
    );

    return reply.send({ message: 'Milestone abandoned' });
  });

  /**
   * GET /milestones/me/:userMilestoneId/attempts
   * Get attempt history for a milestone
   */
  app.get('/milestones/me/:userMilestoneId/attempts', { preHandler: authenticate }, async (request, reply) => {
    const userId = request.user!.userId;
    const { userMilestoneId } = request.params as { userMilestoneId: string };

    // Verify ownership
    const exists = await db.queryOne<{ id: string }>(
      `SELECT id FROM user_skill_milestones WHERE id = $1 AND user_id = $2`,
      [userMilestoneId, userId]
    );

    if (!exists) {
      return reply.status(404).send({
        error: { code: 'NOT_FOUND', message: 'Milestone not found', statusCode: 404 },
      });
    }

    const attempts = await db.queryAll<{
      id: string;
      attempt_date: string;
      progression_step: number | null;
      hold_seconds: number | null;
      reps_completed: number | null;
      form_rating: number | null;
      success: boolean;
      notes: string | null;
      video_url: string | null;
    }>(
      `SELECT id, attempt_date, progression_step, hold_seconds, reps_completed, form_rating, success, notes, video_url
       FROM user_milestone_attempts
       WHERE user_milestone_id = $1
       ORDER BY attempt_date DESC, created_at DESC
       LIMIT 50`,
      [userMilestoneId]
    );

    return reply.send({
      data: {
        attempts: attempts.map(a => ({
          id: a.id,
          attemptDate: a.attempt_date,
          progressionStep: a.progression_step,
          holdSeconds: a.hold_seconds,
          repsCompleted: a.reps_completed,
          formRating: a.form_rating,
          success: a.success,
          notes: a.notes,
          videoUrl: a.video_url,
        })),
      },
    });
  });

  log.info('Milestones routes registered');
}
