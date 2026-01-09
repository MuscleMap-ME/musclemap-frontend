/**
 * Martial Arts Module
 *
 * Handles martial arts technique tracking:
 * - Disciplines (Boxing, BJJ, Wrestling, MCMAP, etc.)
 * - Techniques with progressions and prerequisites
 * - User progress and proficiency tracking
 * - Practice logging
 */

import crypto from 'crypto';
import { queryOne, queryAll, query, transaction } from '../../db/client';
import { loggers } from '../../lib/logger';
import { earningService } from '../economy/earning.service';

const log = loggers.core;

// Types
export interface MartialArtsDiscipline {
  id: string;
  name: string;
  description?: string;
  originCountry?: string;
  focusAreas: string[];
  icon?: string;
  color?: string;
  orderIndex: number;
  isMilitary: boolean;
}

export interface MartialArtsCategory {
  id: string;
  disciplineId: string;
  name: string;
  description?: string;
  orderIndex: number;
}

export interface MartialArtsTechnique {
  id: string;
  disciplineId: string;
  categoryId?: string;
  name: string;
  description?: string;
  category: string; // stance, strike, block, kick, submission, takedown, escape, sweep, throw
  difficulty: number;
  prerequisites: string[];
  keyPoints: string[];
  commonMistakes: string[];
  drillSuggestions: string[];
  videoUrl?: string;
  thumbnailUrl?: string;
  muscleGroups: string[];
  xpReward: number;
  creditReward: number;
  tier: number;
  position: number;
}

export interface UserTechniqueProgress {
  id: string;
  userId: string;
  techniqueId: string;
  status: 'locked' | 'available' | 'learning' | 'proficient' | 'mastered';
  proficiency: number;
  practiceCount: number;
  totalPracticeMinutes: number;
  lastPracticed?: Date;
  masteredAt?: Date;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface TechniquePracticeLog {
  id: string;
  userId: string;
  techniqueId: string;
  practiceDate: Date;
  durationMinutes: number;
  repsPerformed?: number;
  roundsPerformed?: number;
  partnerDrill: boolean;
  notes?: string;
  createdAt: Date;
}

export interface DisciplineWithCategories extends MartialArtsDiscipline {
  categories: MartialArtsCategory[];
}

export interface TechniqueWithProgress extends MartialArtsTechnique {
  progress?: UserTechniqueProgress;
}

// Service
export const martialArtsService = {
  /**
   * Get all martial arts disciplines
   */
  async getDisciplines(options: { militaryOnly?: boolean } = {}): Promise<MartialArtsDiscipline[]> {
    let whereClause = '';
    const params: unknown[] = [];

    if (options.militaryOnly) {
      whereClause = 'WHERE is_military = true';
    }

    const rows = await queryAll<{
      id: string;
      name: string;
      description: string | null;
      origin_country: string | null;
      focus_areas: string[];
      icon: string | null;
      color: string | null;
      order_index: number;
      is_military: boolean;
    }>(`SELECT * FROM martial_arts_disciplines ${whereClause} ORDER BY order_index`, params);

    return rows.map((r) => ({
      id: r.id,
      name: r.name,
      description: r.description ?? undefined,
      originCountry: r.origin_country ?? undefined,
      focusAreas: r.focus_areas || [],
      icon: r.icon ?? undefined,
      color: r.color ?? undefined,
      orderIndex: r.order_index,
      isMilitary: r.is_military,
    }));
  },

  /**
   * Get a discipline by ID with its categories
   */
  async getDiscipline(disciplineId: string): Promise<DisciplineWithCategories | null> {
    const discipline = await queryOne<{
      id: string;
      name: string;
      description: string | null;
      origin_country: string | null;
      focus_areas: string[];
      icon: string | null;
      color: string | null;
      order_index: number;
      is_military: boolean;
    }>(`SELECT * FROM martial_arts_disciplines WHERE id = $1`, [disciplineId]);

    if (!discipline) return null;

    const categories = await queryAll<{
      id: string;
      discipline_id: string;
      name: string;
      description: string | null;
      order_index: number;
    }>(`SELECT * FROM martial_arts_categories WHERE discipline_id = $1 ORDER BY order_index`, [disciplineId]);

    return {
      id: discipline.id,
      name: discipline.name,
      description: discipline.description ?? undefined,
      originCountry: discipline.origin_country ?? undefined,
      focusAreas: discipline.focus_areas || [],
      icon: discipline.icon ?? undefined,
      color: discipline.color ?? undefined,
      orderIndex: discipline.order_index,
      isMilitary: discipline.is_military,
      categories: categories.map((c) => ({
        id: c.id,
        disciplineId: c.discipline_id,
        name: c.name,
        description: c.description ?? undefined,
        orderIndex: c.order_index,
      })),
    };
  },

  /**
   * Get all techniques for a discipline
   */
  async getTechniques(disciplineId: string): Promise<MartialArtsTechnique[]> {
    const rows = await queryAll<{
      id: string;
      discipline_id: string;
      category_id: string | null;
      name: string;
      description: string | null;
      category: string;
      difficulty: number;
      prerequisites: string[];
      key_points: string[];
      common_mistakes: string[];
      drill_suggestions: string[];
      video_url: string | null;
      thumbnail_url: string | null;
      muscle_groups: string[];
      xp_reward: number;
      credit_reward: number;
      tier: number;
      position: number;
    }>(`SELECT * FROM martial_arts_techniques WHERE discipline_id = $1 ORDER BY tier, position`, [disciplineId]);

    return rows.map((r) => ({
      id: r.id,
      disciplineId: r.discipline_id,
      categoryId: r.category_id ?? undefined,
      name: r.name,
      description: r.description ?? undefined,
      category: r.category,
      difficulty: r.difficulty,
      prerequisites: r.prerequisites || [],
      keyPoints: r.key_points || [],
      commonMistakes: r.common_mistakes || [],
      drillSuggestions: r.drill_suggestions || [],
      videoUrl: r.video_url ?? undefined,
      thumbnailUrl: r.thumbnail_url ?? undefined,
      muscleGroups: r.muscle_groups || [],
      xpReward: r.xp_reward,
      creditReward: r.credit_reward,
      tier: r.tier,
      position: r.position,
    }));
  },

  /**
   * Get a specific technique
   */
  async getTechnique(techniqueId: string): Promise<MartialArtsTechnique | null> {
    const r = await queryOne<{
      id: string;
      discipline_id: string;
      category_id: string | null;
      name: string;
      description: string | null;
      category: string;
      difficulty: number;
      prerequisites: string[];
      key_points: string[];
      common_mistakes: string[];
      drill_suggestions: string[];
      video_url: string | null;
      thumbnail_url: string | null;
      muscle_groups: string[];
      xp_reward: number;
      credit_reward: number;
      tier: number;
      position: number;
    }>(`SELECT * FROM martial_arts_techniques WHERE id = $1`, [techniqueId]);

    if (!r) return null;

    return {
      id: r.id,
      disciplineId: r.discipline_id,
      categoryId: r.category_id ?? undefined,
      name: r.name,
      description: r.description ?? undefined,
      category: r.category,
      difficulty: r.difficulty,
      prerequisites: r.prerequisites || [],
      keyPoints: r.key_points || [],
      commonMistakes: r.common_mistakes || [],
      drillSuggestions: r.drill_suggestions || [],
      videoUrl: r.video_url ?? undefined,
      thumbnailUrl: r.thumbnail_url ?? undefined,
      muscleGroups: r.muscle_groups || [],
      xpReward: r.xp_reward,
      creditReward: r.credit_reward,
      tier: r.tier,
      position: r.position,
    };
  },

  /**
   * Get user progress for a discipline's techniques
   */
  async getUserDisciplineProgress(userId: string, disciplineId: string): Promise<TechniqueWithProgress[]> {
    const techniques = await this.getTechniques(disciplineId);
    if (techniques.length === 0) return [];

    // Get user progress
    const progressRows = await queryAll<{
      id: string;
      user_id: string;
      technique_id: string;
      status: string;
      proficiency: number;
      practice_count: number;
      total_practice_minutes: number;
      last_practiced: Date | null;
      mastered_at: Date | null;
      notes: string | null;
      created_at: Date;
      updated_at: Date;
    }>(
      `SELECT * FROM user_technique_progress
       WHERE user_id = $1 AND technique_id IN (
         SELECT id FROM martial_arts_techniques WHERE discipline_id = $2
       )`,
      [userId, disciplineId]
    );

    const progressMap = new Map<string, UserTechniqueProgress>();
    for (const p of progressRows) {
      progressMap.set(p.technique_id, {
        id: p.id,
        userId: p.user_id,
        techniqueId: p.technique_id,
        status: p.status as UserTechniqueProgress['status'],
        proficiency: p.proficiency,
        practiceCount: p.practice_count,
        totalPracticeMinutes: p.total_practice_minutes,
        lastPracticed: p.last_practiced ?? undefined,
        masteredAt: p.mastered_at ?? undefined,
        notes: p.notes ?? undefined,
        createdAt: p.created_at,
        updatedAt: p.updated_at,
      });
    }

    // Calculate mastered techniques for prerequisite checking
    const masteredTechniques = new Set(
      progressRows.filter((p) => p.status === 'mastered').map((p) => p.technique_id)
    );

    return techniques.map((technique) => {
      const progress = progressMap.get(technique.id);

      // Check if prerequisites are met
      const prerequisitesMet = technique.prerequisites.every((prereq) => masteredTechniques.has(prereq));

      if (!progress) {
        return {
          ...technique,
          progress: {
            id: '',
            userId,
            techniqueId: technique.id,
            status: prerequisitesMet ? 'available' : 'locked',
            proficiency: 0,
            practiceCount: 0,
            totalPracticeMinutes: 0,
            createdAt: new Date(),
            updatedAt: new Date(),
          } as UserTechniqueProgress,
        };
      }

      // Update status if prerequisites now met and was locked
      if (progress.status === 'locked' && prerequisitesMet) {
        progress.status = 'available';
      }

      return {
        ...technique,
        progress,
      };
    });
  },

  /**
   * Get user's overall martial arts progress summary
   */
  async getUserSummary(userId: string): Promise<{
    totalTechniques: number;
    masteredTechniques: number;
    learningTechniques: number;
    availableTechniques: number;
    totalPracticeMinutes: number;
    disciplineProgress: { disciplineId: string; disciplineName: string; mastered: number; total: number }[];
  }> {
    // Get counts
    const counts = await queryOne<{
      total: string;
      mastered: string;
      learning: string;
      available: string;
      practice_minutes: string;
    }>(
      `SELECT
        (SELECT COUNT(*) FROM martial_arts_techniques) as total,
        COUNT(*) FILTER (WHERE status = 'mastered') as mastered,
        COUNT(*) FILTER (WHERE status IN ('learning', 'proficient')) as learning,
        COUNT(*) FILTER (WHERE status = 'available') as available,
        COALESCE(SUM(total_practice_minutes), 0) as practice_minutes
       FROM user_technique_progress
       WHERE user_id = $1`,
      [userId]
    );

    // Get per-discipline progress
    const disciplineProgress = await queryAll<{
      discipline_id: string;
      discipline_name: string;
      mastered: string;
      total: string;
    }>(
      `SELECT
        d.id as discipline_id,
        d.name as discipline_name,
        COUNT(utp.id) FILTER (WHERE utp.status = 'mastered') as mastered,
        COUNT(t.id) as total
       FROM martial_arts_disciplines d
       LEFT JOIN martial_arts_techniques t ON t.discipline_id = d.id
       LEFT JOIN user_technique_progress utp ON utp.technique_id = t.id AND utp.user_id = $1
       GROUP BY d.id, d.name
       ORDER BY d.order_index`,
      [userId]
    );

    return {
      totalTechniques: parseInt(counts?.total || '0'),
      masteredTechniques: parseInt(counts?.mastered || '0'),
      learningTechniques: parseInt(counts?.learning || '0'),
      availableTechniques: parseInt(counts?.available || '0'),
      totalPracticeMinutes: parseInt(counts?.practice_minutes || '0'),
      disciplineProgress: disciplineProgress.map((d) => ({
        disciplineId: d.discipline_id,
        disciplineName: d.discipline_name,
        mastered: parseInt(d.mastered),
        total: parseInt(d.total),
      })),
    };
  },

  /**
   * Log a practice session for a technique
   */
  async logPractice(params: {
    userId: string;
    techniqueId: string;
    durationMinutes: number;
    repsPerformed?: number;
    roundsPerformed?: number;
    partnerDrill?: boolean;
    notes?: string;
  }): Promise<TechniquePracticeLog> {
    const { userId, techniqueId, durationMinutes, repsPerformed, roundsPerformed, partnerDrill, notes } = params;

    const logId = crypto.randomUUID();

    await transaction(async (client) => {
      // Insert practice log
      await client.query(
        `INSERT INTO technique_practice_logs (id, user_id, technique_id, duration_minutes, reps_performed, rounds_performed, partner_drill, notes)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [logId, userId, techniqueId, durationMinutes, repsPerformed, roundsPerformed, partnerDrill || false, notes]
      );

      // Update or insert user progress
      // Proficiency increases with practice (diminishing returns)
      await client.query(
        `INSERT INTO user_technique_progress (user_id, technique_id, status, proficiency, practice_count, total_practice_minutes, last_practiced)
         VALUES ($1, $2, 'learning', LEAST(20, $3 / 2), 1, $3, NOW())
         ON CONFLICT (user_id, technique_id) DO UPDATE SET
           status = CASE
             WHEN user_technique_progress.status = 'locked' THEN 'learning'
             WHEN user_technique_progress.status = 'available' THEN 'learning'
             ELSE user_technique_progress.status
           END,
           practice_count = user_technique_progress.practice_count + 1,
           total_practice_minutes = user_technique_progress.total_practice_minutes + EXCLUDED.total_practice_minutes,
           proficiency = LEAST(100, user_technique_progress.proficiency + GREATEST(1, 10 - user_technique_progress.practice_count / 5)),
           last_practiced = NOW(),
           updated_at = NOW()`,
        [userId, techniqueId, durationMinutes]
      );

      // Check if proficiency hit thresholds for status updates
      await client.query(
        `UPDATE user_technique_progress SET
           status = CASE
             WHEN proficiency >= 80 AND status != 'mastered' THEN 'proficient'
             WHEN status = 'locked' OR status = 'available' THEN 'learning'
             ELSE status
           END,
           updated_at = NOW()
         WHERE user_id = $1 AND technique_id = $2`,
        [userId, techniqueId]
      );
    });

    log.info({ userId, techniqueId, durationMinutes }, 'Technique practice logged');

    return {
      id: logId,
      userId,
      techniqueId,
      practiceDate: new Date(),
      durationMinutes,
      repsPerformed,
      roundsPerformed,
      partnerDrill: partnerDrill || false,
      notes,
      createdAt: new Date(),
    };
  },

  /**
   * Mark a technique as mastered
   */
  async masterTechnique(params: {
    userId: string;
    techniqueId: string;
  }): Promise<{ success: boolean; creditsAwarded?: number; xpAwarded?: number; error?: string }> {
    const { userId, techniqueId } = params;

    // Get technique
    const technique = await this.getTechnique(techniqueId);
    if (!technique) {
      return { success: false, error: 'Technique not found' };
    }

    // Check current progress
    const progress = await queryOne<{ status: string; proficiency: number }>(
      `SELECT status, proficiency FROM user_technique_progress WHERE user_id = $1 AND technique_id = $2`,
      [userId, techniqueId]
    );

    if (progress?.status === 'mastered') {
      return { success: false, error: 'Technique already mastered' };
    }

    if (!progress || progress.proficiency < 80) {
      return { success: false, error: 'Must reach 80% proficiency before mastering. Keep practicing!' };
    }

    // Mark as mastered
    await query(
      `UPDATE user_technique_progress SET
         status = 'mastered',
         mastered_at = NOW(),
         updated_at = NOW()
       WHERE user_id = $1 AND technique_id = $2`,
      [userId, techniqueId]
    );

    log.info({ userId, techniqueId, techniqueName: technique.name }, 'Technique mastered');

    // Award credits and XP
    let creditsAwarded = 0;
    try {
      const result = await earningService.processEarning({
        userId,
        ruleCode: 'technique_master',
        sourceType: 'technique_mastery',
        sourceId: techniqueId,
        metadata: {
          techniqueId: technique.id,
          techniqueName: technique.name,
          difficulty: technique.difficulty,
          disciplineId: technique.disciplineId,
        },
      });
      if (result.success) {
        creditsAwarded = result.creditsAwarded || technique.creditReward;
      }
    } catch (err) {
      log.error({ err, userId, techniqueId }, 'Failed to award credits for technique mastery');
    }

    return {
      success: true,
      creditsAwarded: creditsAwarded || technique.creditReward,
      xpAwarded: technique.xpReward,
    };
  },

  /**
   * Get practice history for a user
   */
  async getPracticeHistory(
    userId: string,
    options: { limit?: number; offset?: number; disciplineId?: string } = {}
  ): Promise<{ logs: (TechniquePracticeLog & { techniqueName: string; disciplineName: string })[]; total: number }> {
    const { limit = 20, offset = 0, disciplineId } = options;

    let whereClause = 'tpl.user_id = $1';
    const params: unknown[] = [userId];

    if (disciplineId) {
      whereClause += ` AND t.discipline_id = $${params.length + 1}`;
      params.push(disciplineId);
    }

    const rows = await queryAll<{
      id: string;
      user_id: string;
      technique_id: string;
      technique_name: string;
      discipline_name: string;
      practice_date: Date;
      duration_minutes: number;
      reps_performed: number | null;
      rounds_performed: number | null;
      partner_drill: boolean;
      notes: string | null;
      created_at: Date;
    }>(
      `SELECT tpl.*, t.name as technique_name, d.name as discipline_name
       FROM technique_practice_logs tpl
       JOIN martial_arts_techniques t ON t.id = tpl.technique_id
       JOIN martial_arts_disciplines d ON d.id = t.discipline_id
       WHERE ${whereClause}
       ORDER BY tpl.practice_date DESC
       LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, limit, offset]
    );

    const countResult = await queryOne<{ count: string }>(
      `SELECT COUNT(*) as count
       FROM technique_practice_logs tpl
       JOIN martial_arts_techniques t ON t.id = tpl.technique_id
       WHERE ${whereClause}`,
      params
    );

    return {
      logs: rows.map((r) => ({
        id: r.id,
        userId: r.user_id,
        techniqueId: r.technique_id,
        techniqueName: r.technique_name,
        disciplineName: r.discipline_name,
        practiceDate: r.practice_date,
        durationMinutes: r.duration_minutes,
        repsPerformed: r.reps_performed ?? undefined,
        roundsPerformed: r.rounds_performed ?? undefined,
        partnerDrill: r.partner_drill,
        notes: r.notes ?? undefined,
        createdAt: r.created_at,
      })),
      total: parseInt(countResult?.count || '0'),
    };
  },

  /**
   * Update user notes for a technique
   */
  async updateNotes(userId: string, techniqueId: string, notes: string): Promise<void> {
    await query(
      `INSERT INTO user_technique_progress (user_id, technique_id, status, notes)
       VALUES ($1, $2, 'available', $3)
       ON CONFLICT (user_id, technique_id) DO UPDATE SET
         notes = EXCLUDED.notes,
         updated_at = NOW()`,
      [userId, techniqueId, notes]
    );
  },

  /**
   * Get leaderboard for a discipline
   */
  async getDisciplineLeaderboard(
    disciplineId: string,
    options: { limit?: number } = {}
  ): Promise<{ userId: string; username: string; masteredCount: number; totalPracticeMinutes: number }[]> {
    const { limit = 10 } = options;

    const rows = await queryAll<{
      user_id: string;
      username: string;
      mastered_count: string;
      total_practice_minutes: string;
    }>(
      `SELECT
        utp.user_id,
        u.username,
        COUNT(*) FILTER (WHERE utp.status = 'mastered') as mastered_count,
        COALESCE(SUM(utp.total_practice_minutes), 0) as total_practice_minutes
       FROM user_technique_progress utp
       JOIN users u ON u.id = utp.user_id
       JOIN martial_arts_techniques t ON t.id = utp.technique_id
       WHERE t.discipline_id = $1
       GROUP BY utp.user_id, u.username
       HAVING COUNT(*) FILTER (WHERE utp.status = 'mastered') > 0
       ORDER BY mastered_count DESC, total_practice_minutes DESC
       LIMIT $2`,
      [disciplineId, limit]
    );

    return rows.map((r) => ({
      userId: r.user_id,
      username: r.username,
      masteredCount: parseInt(r.mastered_count),
      totalPracticeMinutes: parseInt(r.total_practice_minutes),
    }));
  },
};

export default martialArtsService;
