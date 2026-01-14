/**
 * Skills Module
 *
 * Handles gymnastics/calisthenics skill progression tracking:
 * - Skill trees (handstands, planche, levers, etc.)
 * - Skill nodes with prerequisites and criteria
 * - User progress tracking and achievement
 * - Practice logging
 */

import crypto from 'crypto';
import { queryOne, queryAll, query, transaction } from '../../db/client';
import { loggers } from '../../lib/logger';
import { earningService } from '../economy/earning.service';
import cache, { CACHE_TTL, CACHE_PREFIX } from '../../lib/cache.service';

const log = loggers.core;

// Types
export interface SkillTree {
  id: string;
  name: string;
  description?: string;
  category: string;
  icon?: string;
  color?: string;
  orderIndex: number;
}

export interface SkillNode {
  id: string;
  treeId: string;
  name: string;
  description?: string;
  difficulty: number;
  prerequisites: string[];
  criteriaType: 'hold' | 'reps' | 'time' | 'form_check';
  criteriaValue?: number;
  criteriaDescription?: string;
  xpReward: number;
  creditReward: number;
  achievementId?: string;
  videoUrl?: string;
  thumbnailUrl?: string;
  tips: string[];
  commonMistakes: string[];
  tier: number;
  position: number;
}

export interface UserSkillProgress {
  id: string;
  userId: string;
  skillNodeId: string;
  status: 'locked' | 'available' | 'in_progress' | 'achieved';
  bestValue?: number;
  attemptCount: number;
  practiceMinutes: number;
  achievedAt?: Date;
  verified: boolean;
  verificationVideoUrl?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface SkillPracticeLog {
  id: string;
  userId: string;
  skillNodeId: string;
  practiceDate: Date;
  durationMinutes: number;
  valueAchieved?: number;
  notes?: string;
  createdAt: Date;
}

export interface SkillTreeWithNodes extends SkillTree {
  nodes: SkillNode[];
}

export interface SkillNodeWithProgress extends SkillNode {
  progress?: UserSkillProgress;
}

// Service
export const skillService = {
  /**
   * Get all skill trees (cached)
   */
  async getSkillTrees(): Promise<SkillTree[]> {
    return cache.getOrSet(
      CACHE_PREFIX.SKILL_TREES,
      CACHE_TTL.SKILL_TREES,
      async () => {
        const rows = await queryAll<{
          id: string;
          name: string;
          description: string | null;
          category: string;
          icon: string | null;
          color: string | null;
          order_index: number;
        }>(`SELECT * FROM skill_trees ORDER BY order_index`);

        return rows.map((r) => ({
          id: r.id,
          name: r.name,
          description: r.description ?? undefined,
          category: r.category,
          icon: r.icon ?? undefined,
          color: r.color ?? undefined,
          orderIndex: r.order_index,
        }));
      }
    );
  },

  /**
   * Get a skill tree by ID with all its nodes (cached)
   */
  async getSkillTree(treeId: string): Promise<SkillTreeWithNodes | null> {
    const cacheKey = `${CACHE_PREFIX.SKILL_TREE}${treeId}`;

    const cached = await cache.get<SkillTreeWithNodes | null>(cacheKey);
    if (cached !== null) {
      return cached;
    }

    const tree = await queryOne<{
      id: string;
      name: string;
      description: string | null;
      category: string;
      icon: string | null;
      color: string | null;
      order_index: number;
    }>(`SELECT * FROM skill_trees WHERE id = $1`, [treeId]);

    if (!tree) {
      await cache.set(cacheKey, null, 60);
      return null;
    }

    const nodes = await queryAll<{
      id: string;
      tree_id: string;
      name: string;
      description: string | null;
      difficulty: number;
      prerequisites: string[];
      criteria_type: string;
      criteria_value: number | null;
      criteria_description: string | null;
      xp_reward: number;
      credit_reward: number;
      achievement_id: string | null;
      video_url: string | null;
      thumbnail_url: string | null;
      tips: string[];
      common_mistakes: string[];
      tier: number;
      position: number;
    }>(`SELECT * FROM skill_nodes WHERE tree_id = $1 ORDER BY tier, position`, [treeId]);

    const result = {
      id: tree.id,
      name: tree.name,
      description: tree.description ?? undefined,
      category: tree.category,
      icon: tree.icon ?? undefined,
      color: tree.color ?? undefined,
      orderIndex: tree.order_index,
      nodes: nodes.map((n) => ({
        id: n.id,
        treeId: n.tree_id,
        name: n.name,
        description: n.description ?? undefined,
        difficulty: n.difficulty,
        prerequisites: n.prerequisites || [],
        criteriaType: n.criteria_type as SkillNode['criteriaType'],
        criteriaValue: n.criteria_value ?? undefined,
        criteriaDescription: n.criteria_description ?? undefined,
        xpReward: n.xp_reward,
        creditReward: n.credit_reward,
        achievementId: n.achievement_id ?? undefined,
        videoUrl: n.video_url ?? undefined,
        thumbnailUrl: n.thumbnail_url ?? undefined,
        tips: n.tips || [],
        commonMistakes: n.common_mistakes || [],
        tier: n.tier,
        position: n.position,
      })),
    };

    await cache.set(cacheKey, result, CACHE_TTL.SKILL_TREES);
    return result;
  },

  /**
   * Get a specific skill node
   */
  async getSkillNode(nodeId: string): Promise<SkillNode | null> {
    const n = await queryOne<{
      id: string;
      tree_id: string;
      name: string;
      description: string | null;
      difficulty: number;
      prerequisites: string[];
      criteria_type: string;
      criteria_value: number | null;
      criteria_description: string | null;
      xp_reward: number;
      credit_reward: number;
      achievement_id: string | null;
      video_url: string | null;
      thumbnail_url: string | null;
      tips: string[];
      common_mistakes: string[];
      tier: number;
      position: number;
    }>(`SELECT * FROM skill_nodes WHERE id = $1`, [nodeId]);

    if (!n) return null;

    return {
      id: n.id,
      treeId: n.tree_id,
      name: n.name,
      description: n.description ?? undefined,
      difficulty: n.difficulty,
      prerequisites: n.prerequisites || [],
      criteriaType: n.criteria_type as SkillNode['criteriaType'],
      criteriaValue: n.criteria_value ?? undefined,
      criteriaDescription: n.criteria_description ?? undefined,
      xpReward: n.xp_reward,
      creditReward: n.credit_reward,
      achievementId: n.achievement_id ?? undefined,
      videoUrl: n.video_url ?? undefined,
      thumbnailUrl: n.thumbnail_url ?? undefined,
      tips: n.tips || [],
      commonMistakes: n.common_mistakes || [],
      tier: n.tier,
      position: n.position,
    };
  },

  /**
   * Get user progress for a skill tree
   */
  async getUserTreeProgress(userId: string, treeId: string): Promise<SkillNodeWithProgress[]> {
    const tree = await this.getSkillTree(treeId);
    if (!tree) return [];

    // Get all user progress for this tree
    const progressRows = await queryAll<{
      id: string;
      user_id: string;
      skill_node_id: string;
      status: string;
      best_value: number | null;
      attempt_count: number;
      practice_minutes: number;
      achieved_at: Date | null;
      verified: boolean;
      verification_video_url: string | null;
      notes: string | null;
      created_at: Date;
      updated_at: Date;
    }>(
      `SELECT * FROM user_skill_progress
       WHERE user_id = $1 AND skill_node_id IN (
         SELECT id FROM skill_nodes WHERE tree_id = $2
       )`,
      [userId, treeId]
    );

    const progressMap = new Map<string, UserSkillProgress>();
    for (const p of progressRows) {
      progressMap.set(p.skill_node_id, {
        id: p.id,
        userId: p.user_id,
        skillNodeId: p.skill_node_id,
        status: p.status as UserSkillProgress['status'],
        bestValue: p.best_value ?? undefined,
        attemptCount: p.attempt_count,
        practiceMinutes: p.practice_minutes,
        achievedAt: p.achieved_at ?? undefined,
        verified: p.verified,
        verificationVideoUrl: p.verification_video_url ?? undefined,
        notes: p.notes ?? undefined,
        createdAt: p.created_at,
        updatedAt: p.updated_at,
      });
    }

    // For each node, calculate availability based on prerequisites
    const achievedSkills = new Set(
      progressRows.filter((p) => p.status === 'achieved').map((p) => p.skill_node_id)
    );

    return tree.nodes.map((node) => {
      const progress = progressMap.get(node.id);

      // Calculate if prerequisites are met
      const prerequisitesMet = node.prerequisites.every((prereq) => achievedSkills.has(prereq));

      // If no progress record exists, create a virtual one
      if (!progress) {
        return {
          ...node,
          progress: {
            id: '',
            userId,
            skillNodeId: node.id,
            status: prerequisitesMet ? 'available' : 'locked',
            attemptCount: 0,
            practiceMinutes: 0,
            verified: false,
            createdAt: new Date(),
            updatedAt: new Date(),
          } as UserSkillProgress,
        };
      }

      // Update status if prerequisites now met and was locked
      if (progress.status === 'locked' && prerequisitesMet) {
        progress.status = 'available';
      }

      return {
        ...node,
        progress,
      };
    });
  },

  /**
   * Get user's overall skill progress summary
   */
  async getUserSkillSummary(userId: string): Promise<{
    totalSkills: number;
    achievedSkills: number;
    inProgressSkills: number;
    availableSkills: number;
    totalPracticeMinutes: number;
    recentProgress: { skillName: string; achievedAt: Date }[];
  }> {
    // Get counts
    const counts = await queryOne<{
      total: string;
      achieved: string;
      in_progress: string;
      available: string;
      practice_minutes: string;
    }>(
      `SELECT
        (SELECT COUNT(*) FROM skill_nodes) as total,
        COUNT(*) FILTER (WHERE status = 'achieved') as achieved,
        COUNT(*) FILTER (WHERE status = 'in_progress') as in_progress,
        COUNT(*) FILTER (WHERE status = 'available') as available,
        COALESCE(SUM(practice_minutes), 0) as practice_minutes
       FROM user_skill_progress
       WHERE user_id = $1`,
      [userId]
    );

    // Get recent achievements
    const recent = await queryAll<{
      skill_name: string;
      achieved_at: Date;
    }>(
      `SELECT sn.name as skill_name, usp.achieved_at
       FROM user_skill_progress usp
       JOIN skill_nodes sn ON sn.id = usp.skill_node_id
       WHERE usp.user_id = $1 AND usp.status = 'achieved'
       ORDER BY usp.achieved_at DESC
       LIMIT 5`,
      [userId]
    );

    return {
      totalSkills: parseInt(counts?.total || '0'),
      achievedSkills: parseInt(counts?.achieved || '0'),
      inProgressSkills: parseInt(counts?.in_progress || '0'),
      availableSkills: parseInt(counts?.available || '0'),
      totalPracticeMinutes: parseInt(counts?.practice_minutes || '0'),
      recentProgress: recent.map((r) => ({
        skillName: r.skill_name,
        achievedAt: r.achieved_at,
      })),
    };
  },

  /**
   * Log a practice session for a skill
   */
  async logPractice(params: {
    userId: string;
    skillNodeId: string;
    durationMinutes: number;
    valueAchieved?: number;
    notes?: string;
  }): Promise<SkillPracticeLog> {
    const { userId, skillNodeId, durationMinutes, valueAchieved, notes } = params;

    const logId = `spl_${crypto.randomBytes(12).toString('hex')}`;

    await transaction(async (client) => {
      // Insert practice log
      await client.query(
        `INSERT INTO skill_practice_logs (id, user_id, skill_node_id, duration_minutes, value_achieved, notes)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [logId, userId, skillNodeId, durationMinutes, valueAchieved, notes]
      );

      // Update or insert user progress
      await client.query(
        `INSERT INTO user_skill_progress (user_id, skill_node_id, status, attempt_count, practice_minutes, best_value)
         VALUES ($1, $2, 'in_progress', 1, $3, $4)
         ON CONFLICT (user_id, skill_node_id) DO UPDATE SET
           status = CASE WHEN user_skill_progress.status = 'locked' THEN 'in_progress' ELSE user_skill_progress.status END,
           attempt_count = user_skill_progress.attempt_count + 1,
           practice_minutes = user_skill_progress.practice_minutes + EXCLUDED.practice_minutes,
           best_value = GREATEST(COALESCE(user_skill_progress.best_value, 0), COALESCE(EXCLUDED.best_value, 0)),
           updated_at = NOW()`,
        [userId, skillNodeId, durationMinutes, valueAchieved]
      );
    });

    log.info({ userId, skillNodeId, durationMinutes }, 'Skill practice logged');

    return {
      id: logId,
      userId,
      skillNodeId,
      practiceDate: new Date(),
      durationMinutes,
      valueAchieved,
      notes,
      createdAt: new Date(),
    };
  },

  /**
   * Mark a skill as achieved
   */
  async achieveSkill(params: {
    userId: string;
    skillNodeId: string;
    verificationVideoUrl?: string;
  }): Promise<{ success: boolean; creditsAwarded?: number; xpAwarded?: number; error?: string }> {
    const { userId, skillNodeId, verificationVideoUrl } = params;

    // Get skill node
    const skill = await this.getSkillNode(skillNodeId);
    if (!skill) {
      return { success: false, error: 'Skill not found' };
    }

    // Check prerequisites
    const progress = await this.getUserTreeProgress(userId, skill.treeId);
    const nodeProgress = progress.find((p) => p.id === skillNodeId);
    if (!nodeProgress) {
      return { success: false, error: 'Skill not found in tree' };
    }

    if (nodeProgress.progress?.status === 'locked') {
      return { success: false, error: 'Prerequisites not met' };
    }

    if (nodeProgress.progress?.status === 'achieved') {
      return { success: false, error: 'Skill already achieved' };
    }

    // Mark as achieved
    await query(
      `INSERT INTO user_skill_progress (user_id, skill_node_id, status, achieved_at, verification_video_url)
       VALUES ($1, $2, 'achieved', NOW(), $3)
       ON CONFLICT (user_id, skill_node_id) DO UPDATE SET
         status = 'achieved',
         achieved_at = NOW(),
         verification_video_url = COALESCE(EXCLUDED.verification_video_url, user_skill_progress.verification_video_url),
         updated_at = NOW()`,
      [userId, skillNodeId, verificationVideoUrl]
    );

    log.info({ userId, skillNodeId, skillName: skill.name }, 'Skill achieved');

    // Award credits and XP
    let creditsAwarded = 0;
    try {
      const result = await earningService.processEarning({
        userId,
        ruleCode: 'skill_unlock',
        sourceType: 'skill_achievement',
        sourceId: skillNodeId,
        metadata: {
          skillId: skill.id,
          skillName: skill.name,
          difficulty: skill.difficulty,
          treeId: skill.treeId,
        },
      });
      if (result.success) {
        creditsAwarded = result.creditsAwarded || skill.creditReward;
      }
    } catch (err) {
      log.error({ err, userId, skillNodeId }, 'Failed to award credits for skill achievement');
    }

    return {
      success: true,
      creditsAwarded: creditsAwarded || skill.creditReward,
      xpAwarded: skill.xpReward,
    };
  },

  /**
   * Get practice history for a user
   */
  async getPracticeHistory(
    userId: string,
    options: { limit?: number; offset?: number; skillNodeId?: string } = {}
  ): Promise<{ logs: (SkillPracticeLog & { skillName: string })[]; total: number }> {
    const { limit = 20, offset = 0, skillNodeId } = options;

    let whereClause = 'spl.user_id = $1';
    const params: unknown[] = [userId];

    if (skillNodeId) {
      whereClause += ` AND spl.skill_node_id = $${params.length + 1}`;
      params.push(skillNodeId);
    }

    const rows = await queryAll<{
      id: string;
      user_id: string;
      skill_node_id: string;
      skill_name: string;
      practice_date: Date;
      duration_minutes: number;
      value_achieved: number | null;
      notes: string | null;
      created_at: Date;
    }>(
      `SELECT spl.*, sn.name as skill_name
       FROM skill_practice_logs spl
       JOIN skill_nodes sn ON sn.id = spl.skill_node_id
       WHERE ${whereClause}
       ORDER BY spl.practice_date DESC
       LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, limit, offset]
    );

    const countResult = await queryOne<{ count: string }>(
      `SELECT COUNT(*) as count FROM skill_practice_logs spl WHERE ${whereClause}`,
      params
    );

    return {
      logs: rows.map((r) => ({
        id: r.id,
        userId: r.user_id,
        skillNodeId: r.skill_node_id,
        skillName: r.skill_name,
        practiceDate: r.practice_date,
        durationMinutes: r.duration_minutes,
        valueAchieved: r.value_achieved ?? undefined,
        notes: r.notes ?? undefined,
        createdAt: r.created_at,
      })),
      total: parseInt(countResult?.count || '0'),
    };
  },

  /**
   * Update user notes for a skill
   */
  async updateNotes(userId: string, skillNodeId: string, notes: string): Promise<void> {
    await query(
      `INSERT INTO user_skill_progress (user_id, skill_node_id, status, notes)
       VALUES ($1, $2, 'available', $3)
       ON CONFLICT (user_id, skill_node_id) DO UPDATE SET
         notes = EXCLUDED.notes,
         updated_at = NOW()`,
      [userId, skillNodeId, notes]
    );
  },

  /**
   * Get leaderboard for a specific skill
   */
  async getSkillLeaderboard(
    skillNodeId: string,
    options: { limit?: number } = {}
  ): Promise<{ userId: string; username: string; bestValue: number; achievedAt: Date }[]> {
    const { limit = 10 } = options;

    const rows = await queryAll<{
      user_id: string;
      username: string;
      best_value: number;
      achieved_at: Date;
    }>(
      `SELECT usp.user_id, u.username, usp.best_value, usp.achieved_at
       FROM user_skill_progress usp
       JOIN users u ON u.id = usp.user_id
       WHERE usp.skill_node_id = $1 AND usp.status = 'achieved'
       ORDER BY usp.best_value DESC, usp.achieved_at ASC
       LIMIT $2`,
      [skillNodeId, limit]
    );

    return rows.map((r) => ({
      userId: r.user_id,
      username: r.username,
      bestValue: r.best_value,
      achievedAt: r.achieved_at,
    }));
  },
};

export default skillService;
