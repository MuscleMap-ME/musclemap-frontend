/**
 * Program Enrollment Service
 *
 * Handles user enrollment and progress tracking for training programs.
 */

import { query, queryOne, queryAll, transaction } from '../../db/client';
import { loggers } from '../../lib/logger';
import { ValidationError, NotFoundError, ForbiddenError } from '../../lib/errors';
import { ProgramsService } from './programs.service';
import type {
  ProgramEnrollment,
  EnrollmentStatus,
  TrainingProgram,
  EnrollmentProgress,
  ProgramDay,
} from './types';

const log = loggers.core.child({ service: 'enrollment' });

// Database row type
interface EnrollmentRow {
  id: string;
  user_id: string;
  program_id: string;
  current_week: number;
  current_day: number;
  status: string;
  started_at: Date;
  paused_at: Date | null;
  completed_at: Date | null;
  expected_end_date: Date | null;
  workouts_completed: number;
  total_workouts: number;
  streak_current: number;
  streak_longest: number;
  progress_data: Record<string, unknown>;
  user_rating: number | null;
  user_review: string | null;
  rated_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

function mapEnrollment(row: EnrollmentRow): ProgramEnrollment {
  return {
    id: row.id,
    userId: row.user_id,
    programId: row.program_id,
    currentWeek: row.current_week,
    currentDay: row.current_day,
    status: row.status as EnrollmentStatus,
    startedAt: row.started_at,
    pausedAt: row.paused_at ?? undefined,
    completedAt: row.completed_at ?? undefined,
    expectedEndDate: row.expected_end_date ?? undefined,
    workoutsCompleted: row.workouts_completed,
    totalWorkouts: row.total_workouts,
    streakCurrent: row.streak_current,
    streakLongest: row.streak_longest,
    progressData: row.progress_data,
    userRating: row.user_rating ?? undefined,
    userReview: row.user_review ?? undefined,
    ratedAt: row.rated_at ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export const EnrollmentService = {
  /**
   * Enroll user in a program
   */
  async enroll(userId: string, programId: string): Promise<ProgramEnrollment> {
    // Check program exists and is accessible
    const program = await ProgramsService.getById(programId, userId);

    // Check if user already has an active enrollment in this program
    const existing = await queryOne<{ id: string; status: string }>(
      'SELECT id, status FROM program_enrollments WHERE user_id = $1 AND program_id = $2',
      [userId, programId]
    );

    if (existing) {
      if (existing.status === 'active') {
        throw new ValidationError('You are already enrolled in this program');
      }
      if (existing.status === 'paused') {
        // Resume instead of creating new enrollment
        return this.resume(existing.id, userId);
      }
    }

    // Calculate total workouts
    const totalWorkouts = program.durationWeeks * program.daysPerWeek;

    // Calculate expected end date
    const expectedEndDate = new Date();
    expectedEndDate.setDate(expectedEndDate.getDate() + program.durationWeeks * 7);

    return await transaction(async (client) => {
      // Create enrollment
      const result = await client.query<EnrollmentRow>(
        `INSERT INTO program_enrollments (
          user_id, program_id, current_week, current_day, status,
          total_workouts, expected_end_date
        )
         VALUES ($1, $2, 1, 1, 'active', $3, $4)
         ON CONFLICT (user_id, program_id) DO UPDATE SET
           status = 'active',
           current_week = 1,
           current_day = 1,
           started_at = NOW(),
           paused_at = NULL,
           completed_at = NULL,
           workouts_completed = 0,
           streak_current = 0,
           expected_end_date = $4,
           updated_at = NOW()
         RETURNING *`,
        [userId, programId, totalWorkouts, expectedEndDate]
      );

      // Update program stats
      await client.query(
        `UPDATE training_programs SET
           total_enrollments = total_enrollments + 1,
           active_enrollments = active_enrollments + 1
         WHERE id = $1`,
        [programId]
      );

      log.info(`User ${userId} enrolled in program ${programId}`);

      return mapEnrollment(result.rows[0]);
    });
  },

  /**
   * Get user's active enrollment
   */
  async getActiveEnrollment(userId: string, programId?: string): Promise<ProgramEnrollment | null> {
    let sql = `SELECT * FROM program_enrollments WHERE user_id = $1 AND status = 'active'`;
    const params: unknown[] = [userId];

    if (programId) {
      sql += ' AND program_id = $2';
      params.push(programId);
    }

    sql += ' LIMIT 1';

    const row = await queryOne<EnrollmentRow>(sql, params);
    return row ? mapEnrollment(row) : null;
  },

  /**
   * Get all user enrollments
   */
  async getUserEnrollments(
    userId: string,
    options: { status?: EnrollmentStatus; limit?: number; offset?: number } = {}
  ): Promise<{ enrollments: ProgramEnrollment[]; total: number }> {
    const { status, limit = 20, offset = 0 } = options;

    let whereClause = 'WHERE e.user_id = $1';
    const params: unknown[] = [userId];
    let paramIndex = 2;

    if (status) {
      whereClause += ` AND e.status = $${paramIndex++}`;
      params.push(status);
    }

    params.push(limit, offset);

    const result = await queryAll<EnrollmentRow & {
      program_name: string;
      program_duration_weeks: number;
      program_days_per_week: number;
    }>(
      `SELECT e.*, p.name as program_name, p.duration_weeks as program_duration_weeks, p.days_per_week as program_days_per_week
       FROM program_enrollments e
       JOIN training_programs p ON p.id = e.program_id
       ${whereClause}
       ORDER BY e.status = 'active' DESC, e.updated_at DESC
       LIMIT $${paramIndex++} OFFSET $${paramIndex++}`,
      params
    );

    const countParams = status ? [userId, status] : [userId];
    const countResult = await queryOne<{ count: string }>(
      `SELECT COUNT(*) as count FROM program_enrollments e
       ${whereClause}`,
      countParams
    );

    return {
      enrollments: result.map(mapEnrollment),
      total: parseInt(countResult?.count || '0'),
    };
  },

  /**
   * Get enrollment by ID
   */
  async getById(enrollmentId: string, userId: string): Promise<ProgramEnrollment> {
    const row = await queryOne<EnrollmentRow>(
      'SELECT * FROM program_enrollments WHERE id = $1 AND user_id = $2',
      [enrollmentId, userId]
    );

    if (!row) {
      throw new NotFoundError('Enrollment not found');
    }

    return mapEnrollment(row);
  },

  /**
   * Get enrollment with program details
   */
  async getEnrollmentWithProgram(enrollmentId: string, userId: string): Promise<{
    enrollment: ProgramEnrollment;
    program: TrainingProgram;
    progress: EnrollmentProgress;
  }> {
    const enrollment = await this.getById(enrollmentId, userId);
    const program = await ProgramsService.getById(enrollment.programId, userId);
    const progress = this.calculateProgress(enrollment, program);

    return { enrollment, program, progress };
  },

  /**
   * Record workout completion
   */
  async recordWorkout(userId: string, programId: string): Promise<ProgramEnrollment> {
    const enrollment = await queryOne<EnrollmentRow>(
      'SELECT * FROM program_enrollments WHERE user_id = $1 AND program_id = $2 AND status = $3',
      [userId, programId, 'active']
    );

    if (!enrollment) {
      throw new NotFoundError('No active enrollment found for this program');
    }

    const program = await ProgramsService.getById(programId, userId);

    // Calculate next day/week
    let nextDay = enrollment.current_day + 1;
    let nextWeek = enrollment.current_week;
    let completed = false;

    if (nextDay > program.daysPerWeek) {
      nextDay = 1;
      nextWeek = enrollment.current_week + 1;
    }

    if (nextWeek > program.durationWeeks) {
      completed = true;
    }

    // Update streak
    const newStreak = enrollment.streak_current + 1;
    const longestStreak = Math.max(enrollment.streak_longest, newStreak);

    if (completed) {
      return await transaction(async (client) => {
        const result = await client.query<EnrollmentRow>(
          `UPDATE program_enrollments SET
             workouts_completed = workouts_completed + 1,
             streak_current = $3,
             streak_longest = $4,
             status = 'completed',
             completed_at = NOW(),
             updated_at = NOW()
           WHERE id = $1 AND user_id = $2
           RETURNING *`,
          [enrollment.id, userId, newStreak, longestStreak]
        );

        // Update program stats
        await client.query(
          `UPDATE training_programs SET
             active_enrollments = active_enrollments - 1,
             completion_rate = (
               SELECT (COUNT(*) FILTER (WHERE status = 'completed')::float /
                       NULLIF(COUNT(*), 0) * 100)
               FROM program_enrollments WHERE program_id = $1
             )
           WHERE id = $1`,
          [programId]
        );

        log.info(`User ${userId} completed program ${programId}`);

        return mapEnrollment(result.rows[0]);
      });
    }

    const result = await queryOne<EnrollmentRow>(
      `UPDATE program_enrollments SET
         current_week = $3,
         current_day = $4,
         workouts_completed = workouts_completed + 1,
         streak_current = $5,
         streak_longest = $6,
         updated_at = NOW()
       WHERE id = $1 AND user_id = $2
       RETURNING *`,
      [enrollment.id, userId, nextWeek, nextDay, newStreak, longestStreak]
    );

    log.info(`User ${userId} completed workout in program ${programId} (week ${nextWeek}, day ${nextDay})`);

    return mapEnrollment(result!);
  },

  /**
   * Pause enrollment
   */
  async pause(enrollmentId: string, userId: string): Promise<ProgramEnrollment> {
    const enrollment = await this.getById(enrollmentId, userId);

    if (enrollment.status !== 'active') {
      throw new ValidationError('Only active enrollments can be paused');
    }

    return await transaction(async (client) => {
      const result = await client.query<EnrollmentRow>(
        `UPDATE program_enrollments SET
           status = 'paused',
           paused_at = NOW(),
           streak_current = 0,
           updated_at = NOW()
         WHERE id = $1 AND user_id = $2
         RETURNING *`,
        [enrollmentId, userId]
      );

      // Update program stats
      await client.query(
        'UPDATE training_programs SET active_enrollments = active_enrollments - 1 WHERE id = $1',
        [enrollment.programId]
      );

      log.info(`User ${userId} paused enrollment ${enrollmentId}`);

      return mapEnrollment(result.rows[0]);
    });
  },

  /**
   * Resume enrollment
   */
  async resume(enrollmentId: string, userId: string): Promise<ProgramEnrollment> {
    const enrollment = await this.getById(enrollmentId, userId);

    if (enrollment.status !== 'paused') {
      throw new ValidationError('Only paused enrollments can be resumed');
    }

    return await transaction(async (client) => {
      // Recalculate expected end date
      const program = await ProgramsService.getById(enrollment.programId, userId);
      const remainingWeeks = program.durationWeeks - enrollment.currentWeek + 1;
      const expectedEndDate = new Date();
      expectedEndDate.setDate(expectedEndDate.getDate() + remainingWeeks * 7);

      const result = await client.query<EnrollmentRow>(
        `UPDATE program_enrollments SET
           status = 'active',
           paused_at = NULL,
           expected_end_date = $3,
           updated_at = NOW()
         WHERE id = $1 AND user_id = $2
         RETURNING *`,
        [enrollmentId, userId, expectedEndDate]
      );

      // Update program stats
      await client.query(
        'UPDATE training_programs SET active_enrollments = active_enrollments + 1 WHERE id = $1',
        [enrollment.programId]
      );

      log.info(`User ${userId} resumed enrollment ${enrollmentId}`);

      return mapEnrollment(result.rows[0]);
    });
  },

  /**
   * Drop/quit enrollment
   */
  async drop(enrollmentId: string, userId: string): Promise<ProgramEnrollment> {
    const enrollment = await this.getById(enrollmentId, userId);

    if (enrollment.status === 'completed') {
      throw new ValidationError('Cannot drop a completed program');
    }

    if (enrollment.status === 'dropped') {
      throw new ValidationError('Already dropped from this program');
    }

    return await transaction(async (client) => {
      const result = await client.query<EnrollmentRow>(
        `UPDATE program_enrollments SET
           status = 'dropped',
           streak_current = 0,
           updated_at = NOW()
         WHERE id = $1 AND user_id = $2
         RETURNING *`,
        [enrollmentId, userId]
      );

      // Update program stats if was active
      if (enrollment.status === 'active') {
        await client.query(
          'UPDATE training_programs SET active_enrollments = active_enrollments - 1 WHERE id = $1',
          [enrollment.programId]
        );
      }

      log.info(`User ${userId} dropped enrollment ${enrollmentId}`);

      return mapEnrollment(result.rows[0]);
    });
  },

  /**
   * Get today's workout for active enrollment
   */
  async getTodaysWorkout(userId: string, programId?: string): Promise<{
    enrollment: ProgramEnrollment;
    program: TrainingProgram;
    todaysWorkout: ProgramDay | null;
  } | null> {
    let enrollment: ProgramEnrollment | null;

    if (programId) {
      enrollment = await this.getActiveEnrollment(userId, programId);
    } else {
      enrollment = await this.getActiveEnrollment(userId);
    }

    if (!enrollment) {
      return null;
    }

    const program = await ProgramsService.getById(enrollment.programId, userId);

    // Find today's workout from schedule
    const todaysWorkout = program.schedule.find(
      (day) => day.day === enrollment!.currentDay
    ) ?? null;

    return { enrollment, program, todaysWorkout };
  },

  /**
   * Calculate enrollment progress
   */
  calculateProgress(enrollment: ProgramEnrollment, program: TrainingProgram): EnrollmentProgress {
    const totalWorkouts = program.durationWeeks * program.daysPerWeek;
    const weekProgress = (enrollment.currentDay / program.daysPerWeek) * 100;
    const totalProgress = (enrollment.workoutsCompleted / totalWorkouts) * 100;

    // Calculate days remaining
    const expectedEnd = enrollment.expectedEndDate ?? new Date();
    const now = new Date();
    const daysRemaining = Math.max(0, Math.ceil((expectedEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));

    // Check if on track (should have completed X workouts by now)
    const daysSinceStart = Math.ceil((now.getTime() - enrollment.startedAt.getTime()) / (1000 * 60 * 60 * 24));
    const expectedWorkouts = Math.floor((daysSinceStart / 7) * program.daysPerWeek);
    const onTrack = enrollment.workoutsCompleted >= expectedWorkouts * 0.8; // 80% threshold

    // Find next workout
    const nextWorkout = program.schedule.find((day) => day.day === enrollment.currentDay);

    return {
      weekProgress,
      totalProgress,
      daysRemaining,
      onTrack,
      nextWorkout: nextWorkout ? {
        day: nextWorkout.day,
        name: nextWorkout.name,
        exercises: nextWorkout.exercises,
      } : undefined,
    };
  },

  /**
   * Reset streak (called when user misses a workout)
   */
  async resetStreak(userId: string, programId: string): Promise<void> {
    await query(
      `UPDATE program_enrollments SET streak_current = 0, updated_at = NOW()
       WHERE user_id = $1 AND program_id = $2 AND status = 'active'`,
      [userId, programId]
    );
  },

  /**
   * Update progress data (for tracking weights, etc.)
   */
  async updateProgressData(
    enrollmentId: string,
    userId: string,
    exerciseId: string,
    data: { weight?: number; reps?: number; notes?: string }
  ): Promise<ProgramEnrollment> {
    const enrollment = await this.getById(enrollmentId, userId);

    const newProgressData = {
      ...enrollment.progressData,
      [exerciseId]: {
        ...(enrollment.progressData[exerciseId] as Record<string, unknown> || {}),
        ...data,
        lastUpdated: new Date().toISOString(),
      },
    };

    const result = await queryOne<EnrollmentRow>(
      `UPDATE program_enrollments SET
         progress_data = $3,
         updated_at = NOW()
       WHERE id = $1 AND user_id = $2
       RETURNING *`,
      [enrollmentId, userId, JSON.stringify(newProgressData)]
    );

    return mapEnrollment(result!);
  },
};

export default EnrollmentService;
