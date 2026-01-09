/**
 * Trainer Service
 *
 * Manages trainer profiles, classes, enrollments, and attendance.
 * Handles wage distribution for trainers based on class attendance.
 */

import crypto from 'crypto';
import { db, queryOne, queryAll, query, serializableTransaction } from '../../db/client';
import { loggers } from '../../lib/logger';
import { ValidationError, NotFoundError, ForbiddenError } from '../../lib/errors';
import { walletService } from './wallet.service';
import { earningService } from './earning.service';

const log = loggers.economy;

// Types
export interface TrainerProfile {
  userId: string;
  displayName: string;
  bio?: string;
  specialties: string[];
  certifications: string[];
  hourlyRateCredits: number;
  perClassRateCredits: number;
  verified: boolean;
  verifiedAt?: Date;
  ratingAvg: number;
  ratingCount: number;
  totalClassesTaught: number;
  totalStudentsTrained: number;
  totalCreditsEarned: number;
  status: 'active' | 'paused' | 'suspended';
  createdAt: Date;
}

export interface TrainerClass {
  id: string;
  trainerUserId: string;
  title: string;
  description?: string;
  category: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced' | 'all';
  startAt: Date;
  durationMinutes: number;
  locationType: 'in_person' | 'virtual' | 'hybrid';
  locationDetails?: string;
  hangoutId?: number;
  virtualHangoutId?: number;
  capacity: number;
  enrolledCount: number;
  creditsPerStudent: number;
  trainerWagePerStudent: number;
  status: 'draft' | 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
  metadata: Record<string, unknown>;
  createdAt: Date;
}

export interface ClassEnrollment {
  id: string;
  classId: string;
  userId: string;
  status: 'pending' | 'enrolled' | 'cancelled' | 'refunded' | 'completed';
  paymentTxId?: string;
  creditsPaid: number;
  enrolledAt: Date;
  cancelledAt?: Date;
  refundTxId?: string;
}

export interface ClassAttendance {
  id: string;
  classId: string;
  userId: string;
  attended: boolean;
  markedBy: string;
  wageTxId?: string;
  rating?: number;
  feedback?: string;
  markedAt: Date;
}

// Create trainer profile schema
export interface CreateTrainerProfileInput {
  displayName: string;
  bio?: string;
  specialties?: string[];
  certifications?: string[];
  hourlyRateCredits?: number;
  perClassRateCredits?: number;
}

// Create class schema
export interface CreateClassInput {
  title: string;
  description?: string;
  category: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced' | 'all';
  startAt: Date;
  durationMinutes: number;
  locationType: 'in_person' | 'virtual' | 'hybrid';
  locationDetails?: string;
  hangoutId?: number;
  virtualHangoutId?: number;
  capacity: number;
  creditsPerStudent: number;
  trainerWagePerStudent: number;
}

export const trainerService = {
  // ==========================================
  // TRAINER PROFILE MANAGEMENT
  // ==========================================

  /**
   * Get trainer profile by user ID
   */
  async getProfile(userId: string): Promise<TrainerProfile | null> {
    const row = await queryOne<{
      user_id: string;
      display_name: string;
      bio: string | null;
      specialties: string | null;
      certifications: string | null;
      hourly_rate_credits: number;
      per_class_rate_credits: number;
      verified: boolean;
      verified_at: Date | null;
      rating_avg: number;
      rating_count: number;
      total_classes_taught: number;
      total_students_trained: number;
      total_credits_earned: number;
      status: string;
      created_at: Date;
    }>(
      `SELECT * FROM trainer_profiles WHERE user_id = $1`,
      [userId]
    );

    if (!row) return null;

    return {
      userId: row.user_id,
      displayName: row.display_name,
      bio: row.bio ?? undefined,
      specialties: row.specialties ? JSON.parse(row.specialties) : [],
      certifications: row.certifications ? JSON.parse(row.certifications) : [],
      hourlyRateCredits: row.hourly_rate_credits,
      perClassRateCredits: row.per_class_rate_credits,
      verified: row.verified,
      verifiedAt: row.verified_at ?? undefined,
      ratingAvg: parseFloat(String(row.rating_avg)) || 0,
      ratingCount: row.rating_count,
      totalClassesTaught: row.total_classes_taught,
      totalStudentsTrained: row.total_students_trained,
      totalCreditsEarned: row.total_credits_earned,
      status: row.status as 'active' | 'paused' | 'suspended',
      createdAt: row.created_at,
    };
  },

  /**
   * Create or update trainer profile
   */
  async upsertProfile(userId: string, input: CreateTrainerProfileInput): Promise<TrainerProfile> {
    const existing = await this.getProfile(userId);

    if (existing) {
      // Update
      await query(
        `UPDATE trainer_profiles SET
          display_name = $2,
          bio = $3,
          specialties = $4,
          certifications = $5,
          hourly_rate_credits = COALESCE($6, hourly_rate_credits),
          per_class_rate_credits = COALESCE($7, per_class_rate_credits),
          updated_at = NOW()
         WHERE user_id = $1`,
        [
          userId,
          input.displayName,
          input.bio || null,
          JSON.stringify(input.specialties || []),
          JSON.stringify(input.certifications || []),
          input.hourlyRateCredits ?? null,
          input.perClassRateCredits ?? null,
        ]
      );
    } else {
      // Create
      await query(
        `INSERT INTO trainer_profiles (user_id, display_name, bio, specialties, certifications, hourly_rate_credits, per_class_rate_credits)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          userId,
          input.displayName,
          input.bio || null,
          JSON.stringify(input.specialties || []),
          JSON.stringify(input.certifications || []),
          input.hourlyRateCredits ?? 100,
          input.perClassRateCredits ?? 50,
        ]
      );
    }

    log.info({ userId }, 'Trainer profile upserted');
    return (await this.getProfile(userId))!;
  },

  /**
   * List trainer profiles with optional filters
   */
  async listProfiles(options: {
    verified?: boolean;
    specialty?: string;
    status?: string;
    limit?: number;
    offset?: number;
  } = {}): Promise<{ trainers: TrainerProfile[]; total: number }> {
    const { verified, specialty, status = 'active', limit = 50, offset = 0 } = options;

    let whereClause = 'status = $1';
    const params: unknown[] = [status];
    let paramIndex = 2;

    if (verified !== undefined) {
      whereClause += ` AND verified = $${paramIndex++}`;
      params.push(verified);
    }

    if (specialty) {
      whereClause += ` AND specialties::text ILIKE $${paramIndex++}`;
      params.push(`%${specialty}%`);
    }

    params.push(limit, offset);

    const rows = await queryAll<{
      user_id: string;
      display_name: string;
      bio: string | null;
      specialties: string | null;
      certifications: string | null;
      hourly_rate_credits: number;
      per_class_rate_credits: number;
      verified: boolean;
      verified_at: Date | null;
      rating_avg: number;
      rating_count: number;
      total_classes_taught: number;
      total_students_trained: number;
      total_credits_earned: number;
      status: string;
      created_at: Date;
    }>(
      `SELECT * FROM trainer_profiles
       WHERE ${whereClause}
       ORDER BY rating_avg DESC, total_classes_taught DESC
       LIMIT $${paramIndex++} OFFSET $${paramIndex++}`,
      params
    );

    const countResult = await queryOne<{ count: string }>(
      `SELECT COUNT(*) as count FROM trainer_profiles WHERE ${whereClause}`,
      params.slice(0, -2)
    );

    return {
      trainers: rows.map((row) => ({
        userId: row.user_id,
        displayName: row.display_name,
        bio: row.bio ?? undefined,
        specialties: row.specialties ? JSON.parse(row.specialties) : [],
        certifications: row.certifications ? JSON.parse(row.certifications) : [],
        hourlyRateCredits: row.hourly_rate_credits,
        perClassRateCredits: row.per_class_rate_credits,
        verified: row.verified,
        verifiedAt: row.verified_at ?? undefined,
        ratingAvg: parseFloat(String(row.rating_avg)) || 0,
        ratingCount: row.rating_count,
        totalClassesTaught: row.total_classes_taught,
        totalStudentsTrained: row.total_students_trained,
        totalCreditsEarned: row.total_credits_earned,
        status: row.status as 'active' | 'paused' | 'suspended',
        createdAt: row.created_at,
      })),
      total: parseInt(countResult?.count || '0', 10),
    };
  },

  /**
   * Update trainer status
   */
  async updateStatus(userId: string, status: 'active' | 'paused' | 'suspended'): Promise<void> {
    await query(
      `UPDATE trainer_profiles SET status = $2, updated_at = NOW() WHERE user_id = $1`,
      [userId, status]
    );
    log.info({ userId, status }, 'Trainer status updated');
  },

  // ==========================================
  // CLASS MANAGEMENT
  // ==========================================

  /**
   * Create a new class
   */
  async createClass(trainerUserId: string, input: CreateClassInput): Promise<TrainerClass> {
    // Verify trainer exists and is active
    const profile = await this.getProfile(trainerUserId);
    if (!profile) {
      throw new NotFoundError('Trainer profile not found. Please create a profile first.');
    }
    if (profile.status !== 'active') {
      throw new ForbiddenError('Trainer profile is not active');
    }

    // Validate start time is in the future
    if (new Date(input.startAt) <= new Date()) {
      throw new ValidationError('Class start time must be in the future');
    }

    const classId = `class_${crypto.randomBytes(12).toString('hex')}`;

    await query(
      `INSERT INTO trainer_classes (
        id, trainer_user_id, title, description, category, difficulty,
        start_at, duration_minutes, location_type, location_details,
        hangout_id, virtual_hangout_id, capacity, credits_per_student, trainer_wage_per_student
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)`,
      [
        classId,
        trainerUserId,
        input.title,
        input.description || null,
        input.category,
        input.difficulty,
        input.startAt,
        input.durationMinutes,
        input.locationType,
        input.locationDetails || null,
        input.hangoutId || null,
        input.virtualHangoutId || null,
        input.capacity,
        input.creditsPerStudent,
        input.trainerWagePerStudent,
      ]
    );

    log.info({ classId, trainerUserId }, 'Class created');
    return (await this.getClass(classId))!;
  },

  /**
   * Get class by ID
   */
  async getClass(classId: string): Promise<TrainerClass | null> {
    const row = await queryOne<{
      id: string;
      trainer_user_id: string;
      title: string;
      description: string | null;
      category: string;
      difficulty: string;
      start_at: Date;
      duration_minutes: number;
      location_type: string;
      location_details: string | null;
      hangout_id: number | null;
      virtual_hangout_id: number | null;
      capacity: number;
      enrolled_count: number;
      credits_per_student: number;
      trainer_wage_per_student: number;
      status: string;
      metadata: string | null;
      created_at: Date;
    }>(
      `SELECT * FROM trainer_classes WHERE id = $1`,
      [classId]
    );

    if (!row) return null;

    return {
      id: row.id,
      trainerUserId: row.trainer_user_id,
      title: row.title,
      description: row.description ?? undefined,
      category: row.category,
      difficulty: row.difficulty as 'beginner' | 'intermediate' | 'advanced' | 'all',
      startAt: row.start_at,
      durationMinutes: row.duration_minutes,
      locationType: row.location_type as 'in_person' | 'virtual' | 'hybrid',
      locationDetails: row.location_details ?? undefined,
      hangoutId: row.hangout_id ?? undefined,
      virtualHangoutId: row.virtual_hangout_id ?? undefined,
      capacity: row.capacity,
      enrolledCount: row.enrolled_count,
      creditsPerStudent: row.credits_per_student,
      trainerWagePerStudent: row.trainer_wage_per_student,
      status: row.status as 'draft' | 'scheduled' | 'in_progress' | 'completed' | 'cancelled',
      metadata: row.metadata ? JSON.parse(row.metadata) : {},
      createdAt: row.created_at,
    };
  },

  /**
   * List classes with filters
   */
  async listClasses(options: {
    trainerUserId?: string;
    status?: string;
    category?: string;
    upcoming?: boolean;
    limit?: number;
    offset?: number;
  } = {}): Promise<{ classes: TrainerClass[]; total: number }> {
    const { trainerUserId, status, category, upcoming, limit = 50, offset = 0 } = options;

    let whereClause = '1=1';
    const params: unknown[] = [];
    let paramIndex = 1;

    if (trainerUserId) {
      whereClause += ` AND trainer_user_id = $${paramIndex++}`;
      params.push(trainerUserId);
    }

    if (status) {
      whereClause += ` AND status = $${paramIndex++}`;
      params.push(status);
    }

    if (category) {
      whereClause += ` AND category = $${paramIndex++}`;
      params.push(category);
    }

    if (upcoming) {
      whereClause += ` AND start_at > NOW() AND status = 'scheduled'`;
    }

    params.push(limit, offset);

    const rows = await queryAll<{
      id: string;
      trainer_user_id: string;
      title: string;
      description: string | null;
      category: string;
      difficulty: string;
      start_at: Date;
      duration_minutes: number;
      location_type: string;
      location_details: string | null;
      hangout_id: number | null;
      virtual_hangout_id: number | null;
      capacity: number;
      enrolled_count: number;
      credits_per_student: number;
      trainer_wage_per_student: number;
      status: string;
      metadata: string | null;
      created_at: Date;
    }>(
      `SELECT * FROM trainer_classes
       WHERE ${whereClause}
       ORDER BY start_at ASC
       LIMIT $${paramIndex++} OFFSET $${paramIndex++}`,
      params
    );

    const countResult = await queryOne<{ count: string }>(
      `SELECT COUNT(*) as count FROM trainer_classes WHERE ${whereClause}`,
      params.slice(0, -2)
    );

    return {
      classes: rows.map((row) => ({
        id: row.id,
        trainerUserId: row.trainer_user_id,
        title: row.title,
        description: row.description ?? undefined,
        category: row.category,
        difficulty: row.difficulty as 'beginner' | 'intermediate' | 'advanced' | 'all',
        startAt: row.start_at,
        durationMinutes: row.duration_minutes,
        locationType: row.location_type as 'in_person' | 'virtual' | 'hybrid',
        locationDetails: row.location_details ?? undefined,
        hangoutId: row.hangout_id ?? undefined,
        virtualHangoutId: row.virtual_hangout_id ?? undefined,
        capacity: row.capacity,
        enrolledCount: row.enrolled_count,
        creditsPerStudent: row.credits_per_student,
        trainerWagePerStudent: row.trainer_wage_per_student,
        status: row.status as 'draft' | 'scheduled' | 'in_progress' | 'completed' | 'cancelled',
        metadata: row.metadata ? JSON.parse(row.metadata) : {},
        createdAt: row.created_at,
      })),
      total: parseInt(countResult?.count || '0', 10),
    };
  },

  /**
   * Update class
   */
  async updateClass(classId: string, updates: Partial<CreateClassInput>): Promise<TrainerClass> {
    const classData = await this.getClass(classId);
    if (!classData) {
      throw new NotFoundError('Class not found');
    }

    if (classData.status !== 'draft' && classData.status !== 'scheduled') {
      throw new ValidationError('Cannot update a class that has started or completed');
    }

    const setClauses: string[] = [];
    const params: unknown[] = [];
    let paramIndex = 1;

    if (updates.title !== undefined) {
      setClauses.push(`title = $${paramIndex++}`);
      params.push(updates.title);
    }
    if (updates.description !== undefined) {
      setClauses.push(`description = $${paramIndex++}`);
      params.push(updates.description);
    }
    if (updates.category !== undefined) {
      setClauses.push(`category = $${paramIndex++}`);
      params.push(updates.category);
    }
    if (updates.difficulty !== undefined) {
      setClauses.push(`difficulty = $${paramIndex++}`);
      params.push(updates.difficulty);
    }
    if (updates.startAt !== undefined) {
      setClauses.push(`start_at = $${paramIndex++}`);
      params.push(updates.startAt);
    }
    if (updates.durationMinutes !== undefined) {
      setClauses.push(`duration_minutes = $${paramIndex++}`);
      params.push(updates.durationMinutes);
    }
    if (updates.locationType !== undefined) {
      setClauses.push(`location_type = $${paramIndex++}`);
      params.push(updates.locationType);
    }
    if (updates.locationDetails !== undefined) {
      setClauses.push(`location_details = $${paramIndex++}`);
      params.push(updates.locationDetails);
    }
    if (updates.capacity !== undefined) {
      setClauses.push(`capacity = $${paramIndex++}`);
      params.push(updates.capacity);
    }
    if (updates.creditsPerStudent !== undefined) {
      setClauses.push(`credits_per_student = $${paramIndex++}`);
      params.push(updates.creditsPerStudent);
    }
    if (updates.trainerWagePerStudent !== undefined) {
      setClauses.push(`trainer_wage_per_student = $${paramIndex++}`);
      params.push(updates.trainerWagePerStudent);
    }

    if (setClauses.length > 0) {
      setClauses.push('updated_at = NOW()');
      params.push(classId);

      await query(
        `UPDATE trainer_classes SET ${setClauses.join(', ')} WHERE id = $${paramIndex}`,
        params
      );
    }

    return (await this.getClass(classId))!;
  },

  /**
   * Cancel a class
   */
  async cancelClass(classId: string, reason?: string): Promise<void> {
    const classData = await this.getClass(classId);
    if (!classData) {
      throw new NotFoundError('Class not found');
    }

    if (classData.status === 'completed' || classData.status === 'cancelled') {
      throw new ValidationError('Class is already completed or cancelled');
    }

    // Refund all enrolled students
    const enrollments = await queryAll<{
      id: string;
      user_id: string;
      credits_paid: number;
      status: string;
    }>(
      `SELECT id, user_id, credits_paid, status FROM class_enrollments WHERE class_id = $1 AND status = 'enrolled'`,
      [classId]
    );

    for (const enrollment of enrollments) {
      if (enrollment.credits_paid > 0) {
        const refundResult = await walletService.adminAdjust({
          userId: enrollment.user_id,
          amount: enrollment.credits_paid,
          adminUserId: 'system',
          reason: `Refund for cancelled class: ${classData.title}`,
        });

        await query(
          `UPDATE class_enrollments SET status = 'refunded', cancelled_at = NOW(), refund_tx_id = $1 WHERE id = $2`,
          [refundResult.entryId, enrollment.id]
        );
      }
    }

    await query(
      `UPDATE trainer_classes SET status = 'cancelled', metadata = jsonb_set(COALESCE(metadata, '{}'), '{cancelReason}', $1::jsonb), updated_at = NOW() WHERE id = $2`,
      [JSON.stringify(reason || 'Cancelled by trainer'), classId]
    );

    log.info({ classId, reason }, 'Class cancelled');
  },

  // ==========================================
  // ENROLLMENT MANAGEMENT
  // ==========================================

  /**
   * Enroll in a class
   */
  async enroll(userId: string, classId: string): Promise<ClassEnrollment> {
    const classData = await this.getClass(classId);
    if (!classData) {
      throw new NotFoundError('Class not found');
    }

    if (classData.status !== 'scheduled') {
      throw new ValidationError('Class is not available for enrollment');
    }

    if (classData.enrolledCount >= classData.capacity) {
      throw new ValidationError('Class is full');
    }

    // Check if user is the trainer
    if (userId === classData.trainerUserId) {
      throw new ValidationError('Trainers cannot enroll in their own classes');
    }

    // Check if already enrolled
    const existing = await queryOne<{ id: string }>(
      `SELECT id FROM class_enrollments WHERE class_id = $1 AND user_id = $2 AND status = 'enrolled'`,
      [classId, userId]
    );

    if (existing) {
      throw new ValidationError('Already enrolled in this class');
    }

    const enrollmentId = `enroll_${crypto.randomBytes(12).toString('hex')}`;
    let paymentTxId: string | undefined;

    // Charge credits if needed
    if (classData.creditsPerStudent > 0) {
      const balance = await walletService.getBalance(userId);
      if (balance < classData.creditsPerStudent) {
        throw new ValidationError('Insufficient credits to enroll');
      }

      const chargeResult = await walletService.charge({
        userId,
        amount: classData.creditsPerStudent,
        reasonCode: 'class_enrollment',
        description: `Enrollment: ${classData.title}`,
      });

      paymentTxId = chargeResult.transactionId;
    }

    await serializableTransaction(async (client) => {
      await client.query(
        `INSERT INTO class_enrollments (id, class_id, user_id, status, payment_tx_id, credits_paid)
         VALUES ($1, $2, $3, 'enrolled', $4, $5)`,
        [enrollmentId, classId, userId, paymentTxId, classData.creditsPerStudent]
      );

      await client.query(
        `UPDATE trainer_classes SET enrolled_count = enrolled_count + 1, updated_at = NOW() WHERE id = $1`,
        [classId]
      );
    });

    log.info({ enrollmentId, classId, userId }, 'User enrolled in class');
    return (await this.getEnrollment(enrollmentId))!;
  },

  /**
   * Get enrollment by ID
   */
  async getEnrollment(enrollmentId: string): Promise<ClassEnrollment | null> {
    const row = await queryOne<{
      id: string;
      class_id: string;
      user_id: string;
      status: string;
      payment_tx_id: string | null;
      credits_paid: number;
      enrolled_at: Date;
      cancelled_at: Date | null;
      refund_tx_id: string | null;
    }>(
      `SELECT * FROM class_enrollments WHERE id = $1`,
      [enrollmentId]
    );

    if (!row) return null;

    return {
      id: row.id,
      classId: row.class_id,
      userId: row.user_id,
      status: row.status as 'pending' | 'enrolled' | 'cancelled' | 'refunded' | 'completed',
      paymentTxId: row.payment_tx_id ?? undefined,
      creditsPaid: row.credits_paid,
      enrolledAt: row.enrolled_at,
      cancelledAt: row.cancelled_at ?? undefined,
      refundTxId: row.refund_tx_id ?? undefined,
    };
  },

  /**
   * Get enrollments for a class
   */
  async getClassEnrollments(classId: string): Promise<ClassEnrollment[]> {
    const rows = await queryAll<{
      id: string;
      class_id: string;
      user_id: string;
      status: string;
      payment_tx_id: string | null;
      credits_paid: number;
      enrolled_at: Date;
      cancelled_at: Date | null;
      refund_tx_id: string | null;
    }>(
      `SELECT * FROM class_enrollments WHERE class_id = $1 ORDER BY enrolled_at ASC`,
      [classId]
    );

    return rows.map((row) => ({
      id: row.id,
      classId: row.class_id,
      userId: row.user_id,
      status: row.status as 'pending' | 'enrolled' | 'cancelled' | 'refunded' | 'completed',
      paymentTxId: row.payment_tx_id ?? undefined,
      creditsPaid: row.credits_paid,
      enrolledAt: row.enrolled_at,
      cancelledAt: row.cancelled_at ?? undefined,
      refundTxId: row.refund_tx_id ?? undefined,
    }));
  },

  /**
   * Get user's enrollments
   */
  async getUserEnrollments(userId: string, options: {
    status?: string;
    limit?: number;
    offset?: number;
  } = {}): Promise<{ enrollments: (ClassEnrollment & { class: TrainerClass })[]; total: number }> {
    const { status, limit = 50, offset = 0 } = options;

    let whereClause = 'e.user_id = $1';
    const params: unknown[] = [userId];
    let paramIndex = 2;

    if (status) {
      whereClause += ` AND e.status = $${paramIndex++}`;
      params.push(status);
    }

    params.push(limit, offset);

    const rows = await queryAll<{
      id: string;
      class_id: string;
      user_id: string;
      status: string;
      payment_tx_id: string | null;
      credits_paid: number;
      enrolled_at: Date;
      cancelled_at: Date | null;
      refund_tx_id: string | null;
      c_id: string;
      c_trainer_user_id: string;
      c_title: string;
      c_description: string | null;
      c_category: string;
      c_difficulty: string;
      c_start_at: Date;
      c_duration_minutes: number;
      c_location_type: string;
      c_location_details: string | null;
      c_capacity: number;
      c_enrolled_count: number;
      c_credits_per_student: number;
      c_trainer_wage_per_student: number;
      c_status: string;
      c_metadata: string | null;
      c_created_at: Date;
    }>(
      `SELECT e.*, c.id as c_id, c.trainer_user_id as c_trainer_user_id, c.title as c_title,
              c.description as c_description, c.category as c_category, c.difficulty as c_difficulty,
              c.start_at as c_start_at, c.duration_minutes as c_duration_minutes,
              c.location_type as c_location_type, c.location_details as c_location_details,
              c.capacity as c_capacity, c.enrolled_count as c_enrolled_count,
              c.credits_per_student as c_credits_per_student, c.trainer_wage_per_student as c_trainer_wage_per_student,
              c.status as c_status, c.metadata as c_metadata, c.created_at as c_created_at
       FROM class_enrollments e
       JOIN trainer_classes c ON e.class_id = c.id
       WHERE ${whereClause}
       ORDER BY c.start_at DESC
       LIMIT $${paramIndex++} OFFSET $${paramIndex++}`,
      params
    );

    const countResult = await queryOne<{ count: string }>(
      `SELECT COUNT(*) as count FROM class_enrollments e WHERE ${whereClause}`,
      params.slice(0, -2)
    );

    return {
      enrollments: rows.map((row) => ({
        id: row.id,
        classId: row.class_id,
        userId: row.user_id,
        status: row.status as 'pending' | 'enrolled' | 'cancelled' | 'refunded' | 'completed',
        paymentTxId: row.payment_tx_id ?? undefined,
        creditsPaid: row.credits_paid,
        enrolledAt: row.enrolled_at,
        cancelledAt: row.cancelled_at ?? undefined,
        refundTxId: row.refund_tx_id ?? undefined,
        class: {
          id: row.c_id,
          trainerUserId: row.c_trainer_user_id,
          title: row.c_title,
          description: row.c_description ?? undefined,
          category: row.c_category,
          difficulty: row.c_difficulty as 'beginner' | 'intermediate' | 'advanced' | 'all',
          startAt: row.c_start_at,
          durationMinutes: row.c_duration_minutes,
          locationType: row.c_location_type as 'in_person' | 'virtual' | 'hybrid',
          locationDetails: row.c_location_details ?? undefined,
          capacity: row.c_capacity,
          enrolledCount: row.c_enrolled_count,
          creditsPerStudent: row.c_credits_per_student,
          trainerWagePerStudent: row.c_trainer_wage_per_student,
          status: row.c_status as 'draft' | 'scheduled' | 'in_progress' | 'completed' | 'cancelled',
          metadata: row.c_metadata ? JSON.parse(row.c_metadata) : {},
          createdAt: row.c_created_at,
        },
      })),
      total: parseInt(countResult?.count || '0', 10),
    };
  },

  /**
   * Cancel enrollment
   */
  async cancelEnrollment(userId: string, classId: string): Promise<void> {
    const enrollment = await queryOne<{
      id: string;
      credits_paid: number;
      status: string;
    }>(
      `SELECT id, credits_paid, status FROM class_enrollments WHERE class_id = $1 AND user_id = $2`,
      [classId, userId]
    );

    if (!enrollment) {
      throw new NotFoundError('Enrollment not found');
    }

    if (enrollment.status !== 'enrolled') {
      throw new ValidationError('Enrollment is not active');
    }

    const classData = await this.getClass(classId);
    if (!classData) {
      throw new NotFoundError('Class not found');
    }

    // Check if class hasn't started yet
    if (new Date(classData.startAt) <= new Date()) {
      throw new ValidationError('Cannot cancel enrollment after class has started');
    }

    // Refund credits
    let refundTxId: string | undefined;
    if (enrollment.credits_paid > 0) {
      const refundResult = await walletService.adminAdjust({
        userId,
        amount: enrollment.credits_paid,
        adminUserId: 'system',
        reason: `Enrollment cancellation refund: ${classData.title}`,
      });
      refundTxId = refundResult.entryId;
    }

    await serializableTransaction(async (client) => {
      await client.query(
        `UPDATE class_enrollments SET status = 'cancelled', cancelled_at = NOW(), refund_tx_id = $1 WHERE id = $2`,
        [refundTxId, enrollment.id]
      );

      await client.query(
        `UPDATE trainer_classes SET enrolled_count = enrolled_count - 1, updated_at = NOW() WHERE id = $1`,
        [classId]
      );
    });

    log.info({ classId, userId }, 'Enrollment cancelled');
  },

  // ==========================================
  // ATTENDANCE MANAGEMENT
  // ==========================================

  /**
   * Mark attendance for a class
   */
  async markAttendance(
    trainerId: string,
    classId: string,
    attendees: Array<{ userId: string; attended: boolean; rating?: number; feedback?: string }>
  ): Promise<{ attendeeCount: number; wageEarned: number }> {
    const classData = await this.getClass(classId);
    if (!classData) {
      throw new NotFoundError('Class not found');
    }

    // Verify trainer owns this class
    if (classData.trainerUserId !== trainerId) {
      throw new ForbiddenError('Only the class trainer can mark attendance');
    }

    // Verify class status
    if (classData.status !== 'scheduled' && classData.status !== 'in_progress') {
      throw new ValidationError('Cannot mark attendance for this class');
    }

    let attendeeCount = 0;
    let totalWage = 0;

    for (const attendee of attendees) {
      // Verify user was enrolled
      const enrollment = await queryOne<{ id: string }>(
        `SELECT id FROM class_enrollments WHERE class_id = $1 AND user_id = $2 AND status = 'enrolled'`,
        [classId, attendee.userId]
      );

      if (!enrollment) {
        log.warn({ classId, userId: attendee.userId }, 'Attempted to mark attendance for unenrolled user');
        continue;
      }

      const attendanceId = `attend_${crypto.randomBytes(12).toString('hex')}`;
      let wageTxId: string | undefined;

      if (attendee.attended) {
        attendeeCount++;

        // Pay trainer wage for this attendee
        if (classData.trainerWagePerStudent > 0) {
          const wageResult = await walletService.adminAdjust({
            userId: trainerId,
            amount: classData.trainerWagePerStudent,
            adminUserId: 'system',
            reason: `Class wage: ${classData.title} (attendee: ${attendee.userId})`,
          });
          wageTxId = wageResult.entryId;
          totalWage += classData.trainerWagePerStudent;
        }

        // Update enrollment status
        await query(
          `UPDATE class_enrollments SET status = 'completed' WHERE class_id = $1 AND user_id = $2`,
          [classId, attendee.userId]
        );

        // Award XP to student
        await earningService.processEarning({
          userId: attendee.userId,
          ruleCode: 'first_hangout_join', // Reusing this for class attendance
          sourceType: 'class_attendance',
          sourceId: classId,
        }).catch(() => {}); // Ignore if already awarded
      }

      // Record attendance
      await query(
        `INSERT INTO class_attendance (id, class_id, user_id, attended, marked_by, wage_tx_id, rating, feedback)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         ON CONFLICT (class_id, user_id) DO UPDATE SET
           attended = $4, marked_by = $5, wage_tx_id = COALESCE($6, class_attendance.wage_tx_id),
           rating = COALESCE($7, class_attendance.rating), feedback = COALESCE($8, class_attendance.feedback),
           marked_at = NOW()`,
        [attendanceId, classId, attendee.userId, attendee.attended, trainerId, wageTxId, attendee.rating || null, attendee.feedback || null]
      );
    }

    // Update class status to completed
    await query(
      `UPDATE trainer_classes SET status = 'completed', updated_at = NOW() WHERE id = $1`,
      [classId]
    );

    // Update trainer stats
    await query(
      `UPDATE trainer_profiles SET
        total_classes_taught = total_classes_taught + 1,
        total_students_trained = total_students_trained + $1,
        total_credits_earned = total_credits_earned + $2,
        updated_at = NOW()
       WHERE user_id = $3`,
      [attendeeCount, totalWage, trainerId]
    );

    // Update rating if provided
    const ratings = attendees.filter(a => a.rating).map(a => a.rating!);
    if (ratings.length > 0) {
      const avgRating = ratings.reduce((a, b) => a + b, 0) / ratings.length;
      await query(
        `UPDATE trainer_profiles SET
          rating_avg = ((rating_avg * rating_count) + $1) / (rating_count + $2),
          rating_count = rating_count + $2,
          updated_at = NOW()
         WHERE user_id = $3`,
        [ratings.reduce((a, b) => a + b, 0), ratings.length, trainerId]
      );
    }

    log.info({ classId, trainerId, attendeeCount, wageEarned: totalWage }, 'Attendance marked');

    return { attendeeCount, wageEarned: totalWage };
  },

  /**
   * Get attendance for a class
   */
  async getClassAttendance(classId: string): Promise<ClassAttendance[]> {
    const rows = await queryAll<{
      id: string;
      class_id: string;
      user_id: string;
      attended: boolean;
      marked_by: string;
      wage_tx_id: string | null;
      rating: number | null;
      feedback: string | null;
      marked_at: Date;
    }>(
      `SELECT * FROM class_attendance WHERE class_id = $1`,
      [classId]
    );

    return rows.map((row) => ({
      id: row.id,
      classId: row.class_id,
      userId: row.user_id,
      attended: row.attended,
      markedBy: row.marked_by,
      wageTxId: row.wage_tx_id ?? undefined,
      rating: row.rating ?? undefined,
      feedback: row.feedback ?? undefined,
      markedAt: row.marked_at,
    }));
  },
};

export default trainerService;
