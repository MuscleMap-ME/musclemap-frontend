/**
 * Workout Templates Service
 *
 * Handles CRUD operations for workout templates:
 * - Create, read, update, delete templates
 * - Template discovery and search
 * - Rating and usage tracking
 * - Template cloning/forking
 */

import { query, queryOne, transaction } from '../db/client';
import { loggers } from '../lib/logger';
import { ValidationError, NotFoundError, ForbiddenError } from '../lib/errors';

const log = loggers.core.child({ service: 'workout-templates' });

// ============================================
// Types
// ============================================

export interface TemplateExercise {
  exerciseId: string;
  name?: string;
  sets: number;
  reps?: number;
  weight?: number;
  duration?: number;
  restSeconds?: number;
  notes?: string;
}

export type TemplateDifficulty = 'beginner' | 'intermediate' | 'advanced' | 'elite';
export type TemplateCategory = 'strength' | 'hypertrophy' | 'endurance' | 'cardio' | 'mobility' | 'full_body';

export interface CreateTemplateInput {
  name: string;
  description?: string;
  exercises: TemplateExercise[];
  difficulty?: TemplateDifficulty;
  durationMinutes?: number;
  targetMuscles?: string[];
  equipmentRequired?: string[];
  category?: TemplateCategory;
  tags?: string[];
  isPublic?: boolean;
  forkedFromId?: string;
}

export interface UpdateTemplateInput {
  name?: string;
  description?: string;
  exercises?: TemplateExercise[];
  difficulty?: TemplateDifficulty;
  durationMinutes?: number;
  targetMuscles?: string[];
  equipmentRequired?: string[];
  category?: TemplateCategory;
  tags?: string[];
  isPublic?: boolean;
}

export interface WorkoutTemplate {
  id: string;
  creatorId: string;
  creatorUsername?: string;
  creatorDisplayName?: string;
  name: string;
  description?: string;
  exercises: TemplateExercise[];
  difficulty?: TemplateDifficulty;
  durationMinutes?: number;
  targetMuscles: string[];
  equipmentRequired: string[];
  category?: TemplateCategory;
  tags: string[];
  isPublic: boolean;
  isFeatured: boolean;
  forkedFromId?: string;
  version: number;
  timesUsed: number;
  timesCloned: number;
  averageRating?: number;
  ratingCount: number;
  userRating?: number;
  isSaved?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface TemplateSearchOptions {
  search?: string;
  category?: TemplateCategory;
  difficulty?: TemplateDifficulty;
  minRating?: number;
  targetMuscles?: string[];
  equipment?: string[];
  creator?: string;
  featured?: boolean;
  sortBy?: 'popular' | 'rating' | 'recent' | 'name';
  limit?: number;
  offset?: number;
}

// ============================================
// Workout Templates Service
// ============================================

export const WorkoutTemplatesService = {
  /**
   * Create a new workout template
   */
  async create(userId: string, input: CreateTemplateInput): Promise<WorkoutTemplate> {
    if (!input.name?.trim()) {
      throw new ValidationError('Template name is required');
    }

    if (!input.exercises || input.exercises.length === 0) {
      throw new ValidationError('Template must have at least one exercise');
    }

    if (input.exercises.length > 50) {
      throw new ValidationError('Template cannot have more than 50 exercises');
    }

    // Validate exercises
    for (const ex of input.exercises) {
      if (!ex.exerciseId) {
        throw new ValidationError('Each exercise must have an exerciseId');
      }
      if (!ex.sets || ex.sets < 1 || ex.sets > 20) {
        throw new ValidationError('Sets must be between 1 and 20');
      }
    }

    const row = await queryOne<{
      id: string;
      creator_id: string;
      name: string;
      description: string | null;
      exercises: TemplateExercise[];
      difficulty: string | null;
      duration_minutes: number | null;
      target_muscles: string[];
      equipment_required: string[];
      category: string | null;
      tags: string[];
      is_public: boolean;
      is_featured: boolean;
      forked_from_id: string | null;
      version: number;
      times_used: number;
      times_cloned: number;
      rating_sum: number;
      rating_count: number;
      created_at: Date;
      updated_at: Date;
    }>(
      `INSERT INTO workout_templates
        (creator_id, name, description, exercises, difficulty, duration_minutes,
         target_muscles, equipment_required, category, tags, is_public, forked_from_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
       RETURNING *`,
      [
        userId,
        input.name.trim(),
        input.description?.trim() ?? null,
        JSON.stringify(input.exercises),
        input.difficulty ?? null,
        input.durationMinutes ?? null,
        JSON.stringify(input.targetMuscles ?? []),
        JSON.stringify(input.equipmentRequired ?? []),
        input.category ?? null,
        JSON.stringify(input.tags ?? []),
        input.isPublic ?? false,
        input.forkedFromId ?? null,
      ]
    );

    if (!row) {
      throw new Error('Failed to create template');
    }

    // If forked, increment clone count on source
    if (input.forkedFromId) {
      await query(
        'UPDATE workout_templates SET times_cloned = times_cloned + 1 WHERE id = $1',
        [input.forkedFromId]
      );
    }

    log.info(`Template ${row.id} created by user ${userId}`);

    return this.mapTemplate(row);
  },

  /**
   * Get a template by ID
   */
  async getById(templateId: string, userId?: string): Promise<WorkoutTemplate> {
    const row = await queryOne<{
      id: string;
      creator_id: string;
      name: string;
      description: string | null;
      exercises: TemplateExercise[];
      difficulty: string | null;
      duration_minutes: number | null;
      target_muscles: string[];
      equipment_required: string[];
      category: string | null;
      tags: string[];
      is_public: boolean;
      is_featured: boolean;
      forked_from_id: string | null;
      version: number;
      times_used: number;
      times_cloned: number;
      rating_sum: number;
      rating_count: number;
      created_at: Date;
      updated_at: Date;
      creator_username: string;
      creator_display_name: string | null;
    }>(
      `SELECT t.*, u.username as creator_username, u.display_name as creator_display_name
       FROM workout_templates t
       JOIN users u ON u.id = t.creator_id
       WHERE t.id = $1`,
      [templateId]
    );

    if (!row) {
      throw new NotFoundError('Template not found');
    }

    // Check visibility
    if (!row.is_public && row.creator_id !== userId) {
      throw new ForbiddenError('Template is private');
    }

    const template = this.mapTemplate(row);
    template.creatorUsername = row.creator_username;
    template.creatorDisplayName = row.creator_display_name ?? undefined;

    // Get user's rating if logged in
    if (userId) {
      const ratingRow = await queryOne<{ rating: number }>(
        'SELECT rating FROM template_ratings WHERE template_id = $1 AND user_id = $2',
        [templateId, userId]
      );
      template.userRating = ratingRow?.rating;

      const savedRow = await queryOne<{ id: string }>(
        'SELECT id FROM user_saved_templates WHERE template_id = $1 AND user_id = $2',
        [templateId, userId]
      );
      template.isSaved = !!savedRow;
    }

    return template;
  },

  /**
   * Update a template
   */
  async update(templateId: string, userId: string, input: UpdateTemplateInput): Promise<WorkoutTemplate> {
    const existing = await queryOne<{ creator_id: string }>(
      'SELECT creator_id FROM workout_templates WHERE id = $1',
      [templateId]
    );

    if (!existing) {
      throw new NotFoundError('Template not found');
    }

    if (existing.creator_id !== userId) {
      throw new ForbiddenError('You can only edit your own templates');
    }

    // Validate exercises if provided
    if (input.exercises) {
      if (input.exercises.length === 0) {
        throw new ValidationError('Template must have at least one exercise');
      }
      if (input.exercises.length > 50) {
        throw new ValidationError('Template cannot have more than 50 exercises');
      }
      for (const ex of input.exercises) {
        if (!ex.exerciseId) {
          throw new ValidationError('Each exercise must have an exerciseId');
        }
        if (!ex.sets || ex.sets < 1 || ex.sets > 20) {
          throw new ValidationError('Sets must be between 1 and 20');
        }
      }
    }

    // Build update query dynamically
    const updates: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    if (input.name !== undefined) {
      updates.push(`name = $${paramIndex++}`);
      values.push(input.name.trim());
    }
    if (input.description !== undefined) {
      updates.push(`description = $${paramIndex++}`);
      values.push(input.description?.trim() ?? null);
    }
    if (input.exercises !== undefined) {
      updates.push(`exercises = $${paramIndex++}`);
      values.push(JSON.stringify(input.exercises));
    }
    if (input.difficulty !== undefined) {
      updates.push(`difficulty = $${paramIndex++}`);
      values.push(input.difficulty);
    }
    if (input.durationMinutes !== undefined) {
      updates.push(`duration_minutes = $${paramIndex++}`);
      values.push(input.durationMinutes);
    }
    if (input.targetMuscles !== undefined) {
      updates.push(`target_muscles = $${paramIndex++}`);
      values.push(JSON.stringify(input.targetMuscles));
    }
    if (input.equipmentRequired !== undefined) {
      updates.push(`equipment_required = $${paramIndex++}`);
      values.push(JSON.stringify(input.equipmentRequired));
    }
    if (input.category !== undefined) {
      updates.push(`category = $${paramIndex++}`);
      values.push(input.category);
    }
    if (input.tags !== undefined) {
      updates.push(`tags = $${paramIndex++}`);
      values.push(JSON.stringify(input.tags));
    }
    if (input.isPublic !== undefined) {
      updates.push(`is_public = $${paramIndex++}`);
      values.push(input.isPublic);
    }

    if (updates.length === 0) {
      return this.getById(templateId, userId);
    }

    // Increment version
    updates.push(`version = version + 1`);

    values.push(templateId);

    await query(
      `UPDATE workout_templates SET ${updates.join(', ')} WHERE id = $${paramIndex}`,
      values
    );

    log.info(`Template ${templateId} updated by user ${userId}`);

    return this.getById(templateId, userId);
  },

  /**
   * Delete a template
   */
  async delete(templateId: string, userId: string): Promise<void> {
    const existing = await queryOne<{ creator_id: string }>(
      'SELECT creator_id FROM workout_templates WHERE id = $1',
      [templateId]
    );

    if (!existing) {
      throw new NotFoundError('Template not found');
    }

    if (existing.creator_id !== userId) {
      throw new ForbiddenError('You can only delete your own templates');
    }

    await query('DELETE FROM workout_templates WHERE id = $1', [templateId]);

    log.info(`Template ${templateId} deleted by user ${userId}`);
  },

  /**
   * Get user's templates
   */
  async getUserTemplates(
    userId: string,
    options: { limit?: number; offset?: number } = {}
  ): Promise<{ templates: WorkoutTemplate[]; total: number }> {
    const { limit = 20, offset = 0 } = options;

    const result = await query<{
      id: string;
      creator_id: string;
      name: string;
      description: string | null;
      exercises: TemplateExercise[];
      difficulty: string | null;
      duration_minutes: number | null;
      target_muscles: string[];
      equipment_required: string[];
      category: string | null;
      tags: string[];
      is_public: boolean;
      is_featured: boolean;
      forked_from_id: string | null;
      version: number;
      times_used: number;
      times_cloned: number;
      rating_sum: number;
      rating_count: number;
      created_at: Date;
      updated_at: Date;
    }>(
      `SELECT * FROM workout_templates
       WHERE creator_id = $1
       ORDER BY updated_at DESC
       LIMIT $2 OFFSET $3`,
      [userId, limit, offset]
    );

    const countResult = await queryOne<{ count: string }>(
      'SELECT COUNT(*) as count FROM workout_templates WHERE creator_id = $1',
      [userId]
    );

    return {
      templates: result.rows.map((row) => this.mapTemplate(row)),
      total: parseInt(countResult?.count || '0'),
    };
  },

  /**
   * Search public templates
   */
  async search(
    options: TemplateSearchOptions = {},
    userId?: string
  ): Promise<{ templates: WorkoutTemplate[]; total: number }> {
    const {
      search,
      category,
      difficulty,
      minRating,
      targetMuscles,
      equipment,
      creator,
      featured,
      sortBy = 'popular',
      limit = 20,
      offset = 0,
    } = options;

    let whereClause = 'WHERE t.is_public = TRUE';
    const params: unknown[] = [];
    let paramIndex = 1;

    if (search) {
      whereClause += ` AND (t.name ILIKE $${paramIndex} OR t.description ILIKE $${paramIndex})`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    if (category) {
      whereClause += ` AND t.category = $${paramIndex++}`;
      params.push(category);
    }

    if (difficulty) {
      whereClause += ` AND t.difficulty = $${paramIndex++}`;
      params.push(difficulty);
    }

    if (minRating && minRating > 0) {
      whereClause += ` AND t.rating_count > 0 AND (t.rating_sum::float / t.rating_count) >= $${paramIndex++}`;
      params.push(minRating);
    }

    if (targetMuscles && targetMuscles.length > 0) {
      whereClause += ` AND t.target_muscles ?| $${paramIndex++}`;
      params.push(targetMuscles);
    }

    if (equipment && equipment.length > 0) {
      whereClause += ` AND t.equipment_required <@ $${paramIndex++}`;
      params.push(JSON.stringify(equipment));
    }

    if (creator) {
      whereClause += ` AND t.creator_id = $${paramIndex++}`;
      params.push(creator);
    }

    if (featured) {
      whereClause += ' AND t.is_featured = TRUE';
    }

    let orderBy = '';
    switch (sortBy) {
      case 'popular':
        orderBy = 'ORDER BY t.times_used DESC, t.created_at DESC';
        break;
      case 'rating':
        orderBy = 'ORDER BY (t.rating_sum::float / NULLIF(t.rating_count, 0)) DESC NULLS LAST, t.times_used DESC';
        break;
      case 'recent':
        orderBy = 'ORDER BY t.created_at DESC';
        break;
      case 'name':
        orderBy = 'ORDER BY t.name ASC';
        break;
      default:
        orderBy = 'ORDER BY t.times_used DESC';
    }

    params.push(limit, offset);

    const result = await query<{
      id: string;
      creator_id: string;
      name: string;
      description: string | null;
      exercises: TemplateExercise[];
      difficulty: string | null;
      duration_minutes: number | null;
      target_muscles: string[];
      equipment_required: string[];
      category: string | null;
      tags: string[];
      is_public: boolean;
      is_featured: boolean;
      forked_from_id: string | null;
      version: number;
      times_used: number;
      times_cloned: number;
      rating_sum: number;
      rating_count: number;
      created_at: Date;
      updated_at: Date;
      creator_username: string;
      creator_display_name: string | null;
    }>(
      `SELECT t.*, u.username as creator_username, u.display_name as creator_display_name
       FROM workout_templates t
       JOIN users u ON u.id = t.creator_id
       ${whereClause}
       ${orderBy}
       LIMIT $${paramIndex++} OFFSET $${paramIndex++}`,
      params
    );

    // Get total count
    const countResult = await query<{ count: string }>(
      `SELECT COUNT(*) as count FROM workout_templates t ${whereClause}`,
      params.slice(0, -2) // Remove limit and offset
    );

    const templates = result.rows.map((row) => {
      const t = this.mapTemplate(row);
      t.creatorUsername = row.creator_username;
      t.creatorDisplayName = row.creator_display_name ?? undefined;
      return t;
    });

    return {
      templates,
      total: parseInt(countResult.rows[0]?.count || '0'),
    };
  },

  /**
   * Clone (fork) a template
   */
  async clone(templateId: string, userId: string, newName?: string): Promise<WorkoutTemplate> {
    const original = await this.getById(templateId, userId);

    return this.create(userId, {
      name: newName || `${original.name} (Copy)`,
      description: original.description,
      exercises: original.exercises,
      difficulty: original.difficulty,
      durationMinutes: original.durationMinutes,
      targetMuscles: original.targetMuscles,
      equipmentRequired: original.equipmentRequired,
      category: original.category,
      tags: original.tags,
      isPublic: false, // Clones start as private
      forkedFromId: templateId,
    });
  },

  /**
   * Rate a template
   */
  async rate(templateId: string, userId: string, rating: number, review?: string): Promise<void> {
    if (rating < 1 || rating > 5) {
      throw new ValidationError('Rating must be between 1 and 5');
    }

    const template = await queryOne<{ creator_id: string; is_public: boolean }>(
      'SELECT creator_id, is_public FROM workout_templates WHERE id = $1',
      [templateId]
    );

    if (!template) {
      throw new NotFoundError('Template not found');
    }

    if (!template.is_public) {
      throw new ForbiddenError('Cannot rate private templates');
    }

    if (template.creator_id === userId) {
      throw new ValidationError('Cannot rate your own template');
    }

    await transaction(async (client) => {
      // Check existing rating
      const existing = await client.query(
        'SELECT rating FROM template_ratings WHERE template_id = $1 AND user_id = $2',
        [templateId, userId]
      );

      if (existing.rows.length > 0) {
        const oldRating = existing.rows[0].rating;
        // Update rating
        await client.query(
          `UPDATE template_ratings SET rating = $1, review = $2, updated_at = NOW()
           WHERE template_id = $3 AND user_id = $4`,
          [rating, review ?? null, templateId, userId]
        );
        // Update template aggregate
        await client.query(
          `UPDATE workout_templates SET rating_sum = rating_sum - $1 + $2
           WHERE id = $3`,
          [oldRating, rating, templateId]
        );
      } else {
        // Insert new rating
        await client.query(
          `INSERT INTO template_ratings (template_id, user_id, rating, review)
           VALUES ($1, $2, $3, $4)`,
          [templateId, userId, rating, review ?? null]
        );
        // Update template aggregate
        await client.query(
          `UPDATE workout_templates SET rating_sum = rating_sum + $1, rating_count = rating_count + 1
           WHERE id = $2`,
          [rating, templateId]
        );
      }
    });

    log.info(`User ${userId} rated template ${templateId} with ${rating} stars`);
  },

  /**
   * Save a template (bookmark)
   */
  async save(templateId: string, userId: string, folder?: string): Promise<void> {
    await queryOne(
      `INSERT INTO user_saved_templates (user_id, template_id, folder)
       VALUES ($1, $2, $3)
       ON CONFLICT (user_id, template_id) DO UPDATE SET folder = $3`,
      [userId, templateId, folder ?? 'default']
    );
  },

  /**
   * Unsave a template
   */
  async unsave(templateId: string, userId: string): Promise<void> {
    await query(
      'DELETE FROM user_saved_templates WHERE user_id = $1 AND template_id = $2',
      [userId, templateId]
    );
  },

  /**
   * Get user's saved templates
   */
  async getSavedTemplates(
    userId: string,
    options: { folder?: string; limit?: number; offset?: number } = {}
  ): Promise<{ templates: WorkoutTemplate[]; total: number }> {
    const { folder, limit = 20, offset = 0 } = options;

    let whereClause = 'WHERE s.user_id = $1';
    const params: unknown[] = [userId];
    let paramIndex = 2;

    if (folder) {
      whereClause += ` AND s.folder = $${paramIndex++}`;
      params.push(folder);
    }

    params.push(limit, offset);

    const result = await query<{
      id: string;
      creator_id: string;
      name: string;
      description: string | null;
      exercises: TemplateExercise[];
      difficulty: string | null;
      duration_minutes: number | null;
      target_muscles: string[];
      equipment_required: string[];
      category: string | null;
      tags: string[];
      is_public: boolean;
      is_featured: boolean;
      forked_from_id: string | null;
      version: number;
      times_used: number;
      times_cloned: number;
      rating_sum: number;
      rating_count: number;
      created_at: Date;
      updated_at: Date;
      creator_username: string;
      creator_display_name: string | null;
    }>(
      `SELECT t.*, u.username as creator_username, u.display_name as creator_display_name
       FROM workout_templates t
       JOIN user_saved_templates s ON s.template_id = t.id
       JOIN users u ON u.id = t.creator_id
       ${whereClause}
       ORDER BY s.created_at DESC
       LIMIT $${paramIndex++} OFFSET $${paramIndex++}`,
      params
    );

    const countParams = folder ? [userId, folder] : [userId];
    const countResult = await queryOne<{ count: string }>(
      `SELECT COUNT(*) as count FROM user_saved_templates s
       ${whereClause}`,
      countParams
    );

    const templates = result.rows.map((row) => {
      const t = this.mapTemplate(row);
      t.creatorUsername = row.creator_username;
      t.creatorDisplayName = row.creator_display_name ?? undefined;
      t.isSaved = true;
      return t;
    });

    return {
      templates,
      total: parseInt(countResult?.count || '0'),
    };
  },

  /**
   * Record template usage
   */
  async recordUsage(
    templateId: string,
    userId: string,
    usageType: 'logged' | 'cloned' | 'viewed',
    workoutId?: string
  ): Promise<void> {
    await query(
      `INSERT INTO template_usage (template_id, user_id, usage_type, workout_id)
       VALUES ($1, $2, $3, $4)`,
      [templateId, userId, usageType, workoutId ?? null]
    );

    if (usageType === 'logged') {
      await query(
        'UPDATE workout_templates SET times_used = times_used + 1 WHERE id = $1',
        [templateId]
      );
    }
  },

  /**
   * Map database row to template object
   */
  mapTemplate(row: {
    id: string;
    creator_id: string;
    name: string;
    description: string | null;
    exercises: TemplateExercise[];
    difficulty: string | null;
    duration_minutes: number | null;
    target_muscles: string[];
    equipment_required: string[];
    category: string | null;
    tags: string[];
    is_public: boolean;
    is_featured: boolean;
    forked_from_id: string | null;
    version: number;
    times_used: number;
    times_cloned: number;
    rating_sum: number;
    rating_count: number;
    created_at: Date;
    updated_at: Date;
  }): WorkoutTemplate {
    return {
      id: row.id,
      creatorId: row.creator_id,
      name: row.name,
      description: row.description ?? undefined,
      exercises: row.exercises,
      difficulty: row.difficulty as TemplateDifficulty ?? undefined,
      durationMinutes: row.duration_minutes ?? undefined,
      targetMuscles: row.target_muscles ?? [],
      equipmentRequired: row.equipment_required ?? [],
      category: row.category as TemplateCategory ?? undefined,
      tags: row.tags ?? [],
      isPublic: row.is_public,
      isFeatured: row.is_featured,
      forkedFromId: row.forked_from_id ?? undefined,
      version: row.version,
      timesUsed: row.times_used,
      timesCloned: row.times_cloned,
      averageRating: row.rating_count > 0 ? row.rating_sum / row.rating_count : undefined,
      ratingCount: row.rating_count,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  },
};

export default WorkoutTemplatesService;
