/**
 * Training Programs Service
 *
 * Handles CRUD operations for multi-week training programs.
 */

import { query, queryOne, queryAll } from '../../db/client';
import { loggers } from '../../lib/logger';
import { ValidationError, NotFoundError, ForbiddenError } from '../../lib/errors';
import type {
  TrainingProgram,
  CreateProgramInput,
  UpdateProgramInput,
  ProgramSearchOptions,
  ProgramDifficulty,
  ProgramCategory,
  ProgramDay,
  ProgressionRules,
} from './types';

const log = loggers.core.child({ service: 'programs' });

// Database row type
interface ProgramRow {
  id: string;
  creator_id: string | null;
  name: string;
  description: string | null;
  short_description: string | null;
  duration_weeks: number;
  days_per_week: number;
  schedule: ProgramDay[];
  progression_rules: ProgressionRules;
  difficulty: string | null;
  category: string | null;
  goals: string[];
  target_muscles: string[];
  equipment_required: string[];
  is_public: boolean;
  is_official: boolean;
  is_featured: boolean;
  total_enrollments: number;
  active_enrollments: number;
  completion_rate: number;
  average_rating: number;
  rating_count: number;
  image_url: string | null;
  thumbnail_url: string | null;
  created_at: Date;
  updated_at: Date;
  creator_username?: string;
  creator_display_name?: string;
}

function mapProgram(row: ProgramRow): TrainingProgram {
  return {
    id: row.id,
    creatorId: row.creator_id,
    creatorUsername: row.creator_username,
    creatorDisplayName: row.creator_display_name ?? undefined,
    name: row.name,
    description: row.description ?? undefined,
    shortDescription: row.short_description ?? undefined,
    durationWeeks: row.duration_weeks,
    daysPerWeek: row.days_per_week,
    schedule: row.schedule,
    progressionRules: row.progression_rules,
    difficulty: row.difficulty as ProgramDifficulty | undefined,
    category: row.category as ProgramCategory | undefined,
    goals: row.goals ?? [],
    targetMuscles: row.target_muscles ?? [],
    equipmentRequired: row.equipment_required ?? [],
    isPublic: row.is_public,
    isOfficial: row.is_official,
    isFeatured: row.is_featured,
    totalEnrollments: row.total_enrollments,
    activeEnrollments: row.active_enrollments,
    completionRate: parseFloat(String(row.completion_rate)) || 0,
    averageRating: parseFloat(String(row.average_rating)) || 0,
    ratingCount: row.rating_count,
    imageUrl: row.image_url ?? undefined,
    thumbnailUrl: row.thumbnail_url ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export const ProgramsService = {
  /**
   * Create a new training program
   */
  async create(userId: string, input: CreateProgramInput): Promise<TrainingProgram> {
    if (!input.name?.trim()) {
      throw new ValidationError('Program name is required');
    }

    if (!input.schedule || input.schedule.length === 0) {
      throw new ValidationError('Program must have at least one workout day');
    }

    if (input.durationWeeks < 1 || input.durationWeeks > 52) {
      throw new ValidationError('Duration must be between 1 and 52 weeks');
    }

    if (input.daysPerWeek < 1 || input.daysPerWeek > 7) {
      throw new ValidationError('Days per week must be between 1 and 7');
    }

    // Validate schedule
    for (const day of input.schedule) {
      if (!day.exercises || day.exercises.length === 0) {
        throw new ValidationError(`Day ${day.day} (${day.name}) must have at least one exercise`);
      }
    }

    const row = await queryOne<ProgramRow>(
      `INSERT INTO training_programs (
        creator_id, name, description, short_description, duration_weeks, days_per_week,
        schedule, progression_rules, difficulty, category, goals,
        target_muscles, equipment_required, is_public, image_url
      )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
       RETURNING *`,
      [
        userId,
        input.name.trim(),
        input.description?.trim() ?? null,
        input.shortDescription?.trim() ?? null,
        input.durationWeeks,
        input.daysPerWeek,
        JSON.stringify(input.schedule),
        JSON.stringify(input.progressionRules ?? {}),
        input.difficulty ?? null,
        input.category ?? null,
        JSON.stringify(input.goals ?? []),
        JSON.stringify(input.targetMuscles ?? []),
        JSON.stringify(input.equipmentRequired ?? []),
        input.isPublic ?? false,
        input.imageUrl ?? null,
      ]
    );

    if (!row) {
      throw new Error('Failed to create program');
    }

    log.info(`Program ${row.id} created by user ${userId}`);

    return mapProgram(row);
  },

  /**
   * Get a program by ID
   */
  async getById(programId: string, userId?: string): Promise<TrainingProgram> {
    const row = await queryOne<ProgramRow & { creator_username: string; creator_display_name: string | null }>(
      `SELECT p.*, u.username as creator_username, u.display_name as creator_display_name
       FROM training_programs p
       LEFT JOIN users u ON u.id = p.creator_id
       WHERE p.id = $1`,
      [programId]
    );

    if (!row) {
      throw new NotFoundError('Program not found');
    }

    // Check visibility
    if (!row.is_public && !row.is_official && row.creator_id !== userId) {
      throw new ForbiddenError('Program is private');
    }

    const program = mapProgram(row);

    // Check if user is enrolled
    if (userId) {
      const enrollment = await queryOne<{ id: string; status: string }>(
        'SELECT id, status FROM program_enrollments WHERE program_id = $1 AND user_id = $2',
        [programId, userId]
      );
      program.isEnrolled = !!enrollment;

      const rating = await queryOne<{ rating: number }>(
        'SELECT rating FROM program_ratings WHERE program_id = $1 AND user_id = $2',
        [programId, userId]
      );
      program.userRating = rating?.rating;
    }

    return program;
  },

  /**
   * Update a program
   */
  async update(programId: string, userId: string, input: UpdateProgramInput): Promise<TrainingProgram> {
    const existing = await queryOne<{ creator_id: string; is_official: boolean }>(
      'SELECT creator_id, is_official FROM training_programs WHERE id = $1',
      [programId]
    );

    if (!existing) {
      throw new NotFoundError('Program not found');
    }

    if (existing.is_official) {
      throw new ForbiddenError('Cannot modify official programs');
    }

    if (existing.creator_id !== userId) {
      throw new ForbiddenError('You can only edit your own programs');
    }

    // Validate schedule if provided
    if (input.schedule) {
      for (const day of input.schedule) {
        if (!day.exercises || day.exercises.length === 0) {
          throw new ValidationError(`Day ${day.day} (${day.name}) must have at least one exercise`);
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
    if (input.shortDescription !== undefined) {
      updates.push(`short_description = $${paramIndex++}`);
      values.push(input.shortDescription?.trim() ?? null);
    }
    if (input.durationWeeks !== undefined) {
      updates.push(`duration_weeks = $${paramIndex++}`);
      values.push(input.durationWeeks);
    }
    if (input.daysPerWeek !== undefined) {
      updates.push(`days_per_week = $${paramIndex++}`);
      values.push(input.daysPerWeek);
    }
    if (input.schedule !== undefined) {
      updates.push(`schedule = $${paramIndex++}`);
      values.push(JSON.stringify(input.schedule));
    }
    if (input.progressionRules !== undefined) {
      updates.push(`progression_rules = $${paramIndex++}`);
      values.push(JSON.stringify(input.progressionRules));
    }
    if (input.difficulty !== undefined) {
      updates.push(`difficulty = $${paramIndex++}`);
      values.push(input.difficulty);
    }
    if (input.category !== undefined) {
      updates.push(`category = $${paramIndex++}`);
      values.push(input.category);
    }
    if (input.goals !== undefined) {
      updates.push(`goals = $${paramIndex++}`);
      values.push(JSON.stringify(input.goals));
    }
    if (input.targetMuscles !== undefined) {
      updates.push(`target_muscles = $${paramIndex++}`);
      values.push(JSON.stringify(input.targetMuscles));
    }
    if (input.equipmentRequired !== undefined) {
      updates.push(`equipment_required = $${paramIndex++}`);
      values.push(JSON.stringify(input.equipmentRequired));
    }
    if (input.isPublic !== undefined) {
      updates.push(`is_public = $${paramIndex++}`);
      values.push(input.isPublic);
    }
    if (input.imageUrl !== undefined) {
      updates.push(`image_url = $${paramIndex++}`);
      values.push(input.imageUrl);
    }

    if (updates.length === 0) {
      return this.getById(programId, userId);
    }

    values.push(programId);

    await query(
      `UPDATE training_programs SET ${updates.join(', ')} WHERE id = $${paramIndex}`,
      values
    );

    log.info(`Program ${programId} updated by user ${userId}`);

    return this.getById(programId, userId);
  },

  /**
   * Delete a program
   */
  async delete(programId: string, userId: string): Promise<void> {
    const existing = await queryOne<{ creator_id: string; is_official: boolean; active_enrollments: number }>(
      'SELECT creator_id, is_official, active_enrollments FROM training_programs WHERE id = $1',
      [programId]
    );

    if (!existing) {
      throw new NotFoundError('Program not found');
    }

    if (existing.is_official) {
      throw new ForbiddenError('Cannot delete official programs');
    }

    if (existing.creator_id !== userId) {
      throw new ForbiddenError('You can only delete your own programs');
    }

    if (existing.active_enrollments > 0) {
      throw new ValidationError('Cannot delete a program with active enrollments');
    }

    await query('DELETE FROM training_programs WHERE id = $1', [programId]);

    log.info(`Program ${programId} deleted by user ${userId}`);
  },

  /**
   * Get user's programs
   */
  async getUserPrograms(
    userId: string,
    options: { limit?: number; offset?: number } = {}
  ): Promise<{ programs: TrainingProgram[]; total: number }> {
    const { limit = 20, offset = 0 } = options;

    const result = await queryAll<ProgramRow>(
      `SELECT * FROM training_programs
       WHERE creator_id = $1
       ORDER BY updated_at DESC
       LIMIT $2 OFFSET $3`,
      [userId, limit, offset]
    );

    const countResult = await queryOne<{ count: string }>(
      'SELECT COUNT(*) as count FROM training_programs WHERE creator_id = $1',
      [userId]
    );

    return {
      programs: result.map(mapProgram),
      total: parseInt(countResult?.count || '0'),
    };
  },

  /**
   * Search public programs
   */
  async search(
    options: ProgramSearchOptions = {},
    userId?: string
  ): Promise<{ programs: TrainingProgram[]; total: number }> {
    const {
      search,
      category,
      difficulty,
      minRating,
      durationWeeks,
      daysPerWeek,
      official,
      featured,
      goals,
      equipment,
      creator,
      sortBy = 'popular',
      limit = 20,
      offset = 0,
    } = options;

    let whereClause = 'WHERE (p.is_public = TRUE OR p.is_official = TRUE)';
    const params: unknown[] = [];
    let paramIndex = 1;

    if (search) {
      whereClause += ` AND (p.name ILIKE $${paramIndex} OR p.description ILIKE $${paramIndex} OR p.short_description ILIKE $${paramIndex})`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    if (category) {
      whereClause += ` AND p.category = $${paramIndex++}`;
      params.push(category);
    }

    if (difficulty) {
      whereClause += ` AND p.difficulty = $${paramIndex++}`;
      params.push(difficulty);
    }

    if (minRating && minRating > 0) {
      whereClause += ` AND p.rating_count > 0 AND p.average_rating >= $${paramIndex++}`;
      params.push(minRating);
    }

    if (durationWeeks) {
      whereClause += ` AND p.duration_weeks = $${paramIndex++}`;
      params.push(durationWeeks);
    }

    if (daysPerWeek) {
      whereClause += ` AND p.days_per_week = $${paramIndex++}`;
      params.push(daysPerWeek);
    }

    if (official !== undefined) {
      whereClause += ` AND p.is_official = $${paramIndex++}`;
      params.push(official);
    }

    if (featured) {
      whereClause += ' AND p.is_featured = TRUE';
    }

    if (goals && goals.length > 0) {
      whereClause += ` AND p.goals ?| $${paramIndex++}`;
      params.push(goals);
    }

    if (equipment && equipment.length > 0) {
      whereClause += ` AND p.equipment_required <@ $${paramIndex++}`;
      params.push(JSON.stringify(equipment));
    }

    if (creator) {
      whereClause += ` AND p.creator_id = $${paramIndex++}`;
      params.push(creator);
    }

    let orderBy = '';
    switch (sortBy) {
      case 'popular':
        orderBy = 'ORDER BY p.total_enrollments DESC, p.created_at DESC';
        break;
      case 'rating':
        orderBy = 'ORDER BY p.average_rating DESC NULLS LAST, p.total_enrollments DESC';
        break;
      case 'recent':
        orderBy = 'ORDER BY p.created_at DESC';
        break;
      case 'name':
        orderBy = 'ORDER BY p.name ASC';
        break;
      case 'duration':
        orderBy = 'ORDER BY p.duration_weeks ASC, p.name ASC';
        break;
      default:
        orderBy = 'ORDER BY p.total_enrollments DESC';
    }

    params.push(limit, offset);

    const result = await queryAll<ProgramRow & { creator_username: string; creator_display_name: string | null }>(
      `SELECT p.*, u.username as creator_username, u.display_name as creator_display_name
       FROM training_programs p
       LEFT JOIN users u ON u.id = p.creator_id
       ${whereClause}
       ${orderBy}
       LIMIT $${paramIndex++} OFFSET $${paramIndex++}`,
      params
    );

    // Get total count
    const countResult = await queryAll<{ count: string }>(
      `SELECT COUNT(*) as count FROM training_programs p ${whereClause}`,
      params.slice(0, -2)
    );

    const programs = result.map(mapProgram);

    // If user provided, check enrollments
    if (userId && programs.length > 0) {
      const programIds = programs.map((p) => p.id);
      const enrollments = await queryAll<{ program_id: string }>(
        'SELECT program_id FROM program_enrollments WHERE user_id = $1 AND program_id = ANY($2)',
        [userId, programIds]
      );
      const enrolledIds = new Set(enrollments.map((e) => e.program_id));
      for (const program of programs) {
        program.isEnrolled = enrolledIds.has(program.id);
      }
    }

    return {
      programs,
      total: parseInt(countResult[0]?.count || '0'),
    };
  },

  /**
   * Get official programs
   */
  async getOfficialPrograms(userId?: string): Promise<TrainingProgram[]> {
    const result = await queryAll<ProgramRow>(
      `SELECT * FROM training_programs
       WHERE is_official = TRUE
       ORDER BY total_enrollments DESC, name ASC`
    );

    const programs = result.map(mapProgram);

    // If user provided, check enrollments
    if (userId && programs.length > 0) {
      const programIds = programs.map((p) => p.id);
      const enrollments = await queryAll<{ program_id: string }>(
        'SELECT program_id FROM program_enrollments WHERE user_id = $1 AND program_id = ANY($2)',
        [userId, programIds]
      );
      const enrolledIds = new Set(enrollments.map((e) => e.program_id));
      for (const program of programs) {
        program.isEnrolled = enrolledIds.has(program.id);
      }
    }

    return programs;
  },

  /**
   * Get featured programs
   */
  async getFeaturedPrograms(limit = 10, userId?: string): Promise<TrainingProgram[]> {
    const result = await queryAll<ProgramRow>(
      `SELECT * FROM training_programs
       WHERE is_featured = TRUE OR is_official = TRUE
       ORDER BY is_featured DESC, total_enrollments DESC
       LIMIT $1`,
      [limit]
    );

    const programs = result.map(mapProgram);

    if (userId && programs.length > 0) {
      const programIds = programs.map((p) => p.id);
      const enrollments = await queryAll<{ program_id: string }>(
        'SELECT program_id FROM program_enrollments WHERE user_id = $1 AND program_id = ANY($2)',
        [userId, programIds]
      );
      const enrolledIds = new Set(enrollments.map((e) => e.program_id));
      for (const program of programs) {
        program.isEnrolled = enrolledIds.has(program.id);
      }
    }

    return programs;
  },

  /**
   * Rate a program
   */
  async rate(programId: string, userId: string, rating: number, review?: string): Promise<void> {
    if (rating < 1 || rating > 5) {
      throw new ValidationError('Rating must be between 1 and 5');
    }

    const program = await queryOne<{ creator_id: string; is_public: boolean; is_official: boolean }>(
      'SELECT creator_id, is_public, is_official FROM training_programs WHERE id = $1',
      [programId]
    );

    if (!program) {
      throw new NotFoundError('Program not found');
    }

    if (!program.is_public && !program.is_official) {
      throw new ForbiddenError('Cannot rate private programs');
    }

    if (program.creator_id === userId) {
      throw new ValidationError('Cannot rate your own program');
    }

    // Check if user completed the program
    const enrollment = await queryOne<{ status: string }>(
      'SELECT status FROM program_enrollments WHERE program_id = $1 AND user_id = $2',
      [programId, userId]
    );
    const completedProgram = enrollment?.status === 'completed';

    // Upsert rating
    await query(
      `INSERT INTO program_ratings (program_id, user_id, rating, review, completed_program)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (program_id, user_id) DO UPDATE SET
         rating = $3,
         review = $4,
         completed_program = $5,
         updated_at = NOW()`,
      [programId, userId, rating, review ?? null, completedProgram]
    );

    // Update aggregate rating on program
    await query(
      `UPDATE training_programs SET
         average_rating = (SELECT AVG(rating) FROM program_ratings WHERE program_id = $1),
         rating_count = (SELECT COUNT(*) FROM program_ratings WHERE program_id = $1)
       WHERE id = $1`,
      [programId]
    );

    log.info(`User ${userId} rated program ${programId} with ${rating} stars`);
  },

  /**
   * Duplicate a program
   */
  async duplicate(programId: string, userId: string, newName?: string): Promise<TrainingProgram> {
    const original = await this.getById(programId, userId);

    return this.create(userId, {
      name: newName || `${original.name} (Copy)`,
      description: original.description,
      shortDescription: original.shortDescription,
      durationWeeks: original.durationWeeks,
      daysPerWeek: original.daysPerWeek,
      schedule: original.schedule,
      progressionRules: original.progressionRules,
      difficulty: original.difficulty,
      category: original.category,
      goals: original.goals,
      targetMuscles: original.targetMuscles,
      equipmentRequired: original.equipmentRequired,
      isPublic: false, // Copies start as private
    });
  },
};

export default ProgramsService;
