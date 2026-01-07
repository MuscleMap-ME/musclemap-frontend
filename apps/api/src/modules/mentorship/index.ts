/**
 * Mentorship Service
 *
 * Handles mentor/mentee relationships:
 * - Mentor profile management
 * - Mentorship matching and requests
 * - Check-in tracking
 * - Rating and feedback
 */

import crypto from 'crypto';
import { queryOne, queryAll, query, transaction } from '../../db/client';
import { loggers } from '../../lib/logger';

const log = loggers.core;

// ============================================
// TYPES
// ============================================

export interface MentorProfile {
  userId: string;
  isAvailable: boolean;
  maxMentees: number;
  currentMenteeCount: number;
  specialties: string[];
  experienceYears: number;
  bio?: string;
  hourlyRate?: number;
  isPro: boolean;
  rating: number;
  totalRatings: number;
  totalMentorships: number;
  successfulMentorships: number;
  verifiedAt?: Date;
  createdAt: Date;
}

export interface MentorProfileWithUser extends MentorProfile {
  username: string;
  displayName?: string;
  avatarUrl?: string;
}

export interface Mentorship {
  id: string;
  mentorId: string;
  menteeId: string;
  status: 'pending' | 'active' | 'completed' | 'cancelled';
  focusAreas: string[];
  goals?: string;
  startDate?: Date;
  expectedEndDate?: Date;
  actualEndDate?: Date;
  menteeRating?: number;
  menteeFeedback?: string;
  mentorRating?: number;
  mentorFeedback?: string;
  createdAt: Date;
}

export interface MentorshipWithUsers extends Mentorship {
  mentorUsername: string;
  mentorDisplayName?: string;
  mentorAvatarUrl?: string;
  menteeUsername: string;
  menteeDisplayName?: string;
  menteeAvatarUrl?: string;
}

export interface MentorshipCheckIn {
  id: string;
  mentorshipId: string;
  initiatedBy: string;
  notes?: string;
  mood?: 'great' | 'good' | 'okay' | 'struggling';
  progressUpdate?: string;
  nextSteps?: string;
  scheduledFor?: Date;
  completedAt?: Date;
  createdAt: Date;
}

export interface MentorSearchOptions {
  specialties?: string[];
  minRating?: number;
  isPro?: boolean;
  maxHourlyRate?: number;
  limit?: number;
  offset?: number;
}

// ============================================
// SERVICE
// ============================================

export const mentorshipService = {
  // ==========================================
  // MENTOR PROFILES
  // ==========================================

  /**
   * Create or update mentor profile
   */
  async upsertMentorProfile(
    userId: string,
    profile: Partial<Omit<MentorProfile, 'userId' | 'createdAt' | 'rating' | 'totalRatings' | 'currentMenteeCount'>>
  ): Promise<MentorProfile> {
    const result = await queryOne<{
      user_id: string;
      is_available: boolean;
      max_mentees: number;
      current_mentee_count: number;
      specialties: string[];
      experience_years: number;
      bio: string | null;
      hourly_rate: string | null;
      is_pro: boolean;
      rating: string;
      total_ratings: number;
      total_mentorships: number;
      successful_mentorships: number;
      verified_at: Date | null;
      created_at: Date;
    }>(
      `INSERT INTO mentor_profiles (
        user_id, is_available, max_mentees, specialties, experience_years,
        bio, hourly_rate, is_pro
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      ON CONFLICT (user_id) DO UPDATE SET
        is_available = COALESCE($2, mentor_profiles.is_available),
        max_mentees = COALESCE($3, mentor_profiles.max_mentees),
        specialties = COALESCE($4, mentor_profiles.specialties),
        experience_years = COALESCE($5, mentor_profiles.experience_years),
        bio = COALESCE($6, mentor_profiles.bio),
        hourly_rate = COALESCE($7, mentor_profiles.hourly_rate),
        is_pro = COALESCE($8, mentor_profiles.is_pro),
        updated_at = NOW()
      RETURNING *`,
      [
        userId,
        profile.isAvailable ?? true,
        profile.maxMentees ?? 3,
        profile.specialties ?? [],
        profile.experienceYears ?? 1,
        profile.bio,
        profile.hourlyRate,
        profile.isPro ?? false,
      ]
    );

    if (!result) {
      throw new Error('Failed to create mentor profile');
    }

    return {
      userId: result.user_id,
      isAvailable: result.is_available,
      maxMentees: result.max_mentees,
      currentMenteeCount: result.current_mentee_count,
      specialties: result.specialties,
      experienceYears: result.experience_years,
      bio: result.bio || undefined,
      hourlyRate: result.hourly_rate ? parseFloat(result.hourly_rate) : undefined,
      isPro: result.is_pro,
      rating: parseFloat(result.rating),
      totalRatings: result.total_ratings,
      totalMentorships: result.total_mentorships,
      successfulMentorships: result.successful_mentorships,
      verifiedAt: result.verified_at || undefined,
      createdAt: result.created_at,
    };
  },

  /**
   * Get mentor profile
   */
  async getMentorProfile(userId: string): Promise<MentorProfileWithUser | null> {
    const result = await queryOne<{
      user_id: string;
      is_available: boolean;
      max_mentees: number;
      current_mentee_count: number;
      specialties: string[];
      experience_years: number;
      bio: string | null;
      hourly_rate: string | null;
      is_pro: boolean;
      rating: string;
      total_ratings: number;
      total_mentorships: number;
      successful_mentorships: number;
      verified_at: Date | null;
      created_at: Date;
      username: string;
      display_name: string | null;
      avatar_url: string | null;
    }>(
      `SELECT mp.*, u.username, u.display_name, u.avatar_url
       FROM mentor_profiles mp
       JOIN users u ON u.id = mp.user_id
       WHERE mp.user_id = $1`,
      [userId]
    );

    if (!result) return null;

    return {
      userId: result.user_id,
      isAvailable: result.is_available,
      maxMentees: result.max_mentees,
      currentMenteeCount: result.current_mentee_count,
      specialties: result.specialties,
      experienceYears: result.experience_years,
      bio: result.bio || undefined,
      hourlyRate: result.hourly_rate ? parseFloat(result.hourly_rate) : undefined,
      isPro: result.is_pro,
      rating: parseFloat(result.rating),
      totalRatings: result.total_ratings,
      totalMentorships: result.total_mentorships,
      successfulMentorships: result.successful_mentorships,
      verifiedAt: result.verified_at || undefined,
      createdAt: result.created_at,
      username: result.username,
      displayName: result.display_name || undefined,
      avatarUrl: result.avatar_url || undefined,
    };
  },

  /**
   * Search for available mentors
   */
  async searchMentors(options: MentorSearchOptions = {}): Promise<{ mentors: MentorProfileWithUser[]; total: number }> {
    const { specialties, minRating, isPro, maxHourlyRate, limit = 20, offset = 0 } = options;

    const conditions: string[] = ['mp.is_available = true', 'mp.current_mentee_count < mp.max_mentees'];
    const params: any[] = [];
    let paramIndex = 1;

    if (specialties && specialties.length > 0) {
      conditions.push(`mp.specialties && $${paramIndex}`);
      params.push(specialties);
      paramIndex++;
    }

    if (minRating !== undefined) {
      conditions.push(`mp.rating >= $${paramIndex}`);
      params.push(minRating);
      paramIndex++;
    }

    if (isPro !== undefined) {
      conditions.push(`mp.is_pro = $${paramIndex}`);
      params.push(isPro);
      paramIndex++;
    }

    if (maxHourlyRate !== undefined) {
      conditions.push(`(mp.hourly_rate IS NULL OR mp.hourly_rate <= $${paramIndex})`);
      params.push(maxHourlyRate);
      paramIndex++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const [rows, countResult] = await Promise.all([
      queryAll<{
        user_id: string;
        is_available: boolean;
        max_mentees: number;
        current_mentee_count: number;
        specialties: string[];
        experience_years: number;
        bio: string | null;
        hourly_rate: string | null;
        is_pro: boolean;
        rating: string;
        total_ratings: number;
        total_mentorships: number;
        successful_mentorships: number;
        verified_at: Date | null;
        created_at: Date;
        username: string;
        display_name: string | null;
        avatar_url: string | null;
      }>(
        `SELECT mp.*, u.username, u.display_name, u.avatar_url
         FROM mentor_profiles mp
         JOIN users u ON u.id = mp.user_id
         ${whereClause}
         ORDER BY mp.rating DESC, mp.total_mentorships DESC
         LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
        [...params, limit, offset]
      ),
      queryOne<{ count: string }>(
        `SELECT COUNT(*) as count FROM mentor_profiles mp ${whereClause}`,
        params
      ),
    ]);

    return {
      mentors: rows.map((r) => ({
        userId: r.user_id,
        isAvailable: r.is_available,
        maxMentees: r.max_mentees,
        currentMenteeCount: r.current_mentee_count,
        specialties: r.specialties,
        experienceYears: r.experience_years,
        bio: r.bio || undefined,
        hourlyRate: r.hourly_rate ? parseFloat(r.hourly_rate) : undefined,
        isPro: r.is_pro,
        rating: parseFloat(r.rating),
        totalRatings: r.total_ratings,
        totalMentorships: r.total_mentorships,
        successfulMentorships: r.successful_mentorships,
        verifiedAt: r.verified_at || undefined,
        createdAt: r.created_at,
        username: r.username,
        displayName: r.display_name || undefined,
        avatarUrl: r.avatar_url || undefined,
      })),
      total: parseInt(countResult?.count || '0'),
    };
  },

  // ==========================================
  // MENTORSHIPS
  // ==========================================

  /**
   * Request a mentorship
   */
  async requestMentorship(
    menteeId: string,
    mentorId: string,
    options: { focusAreas?: string[]; goals?: string } = {}
  ): Promise<Mentorship> {
    if (menteeId === mentorId) {
      throw new Error('Cannot request mentorship with yourself');
    }

    // Check mentor availability
    const mentor = await this.getMentorProfile(mentorId);
    if (!mentor) {
      throw new Error('Mentor profile not found');
    }
    if (!mentor.isAvailable) {
      throw new Error('Mentor is not currently available');
    }
    if (mentor.currentMenteeCount >= mentor.maxMentees) {
      throw new Error('Mentor has reached maximum mentees');
    }

    // Check for existing active mentorship
    const existing = await queryOne<{ id: string }>(
      `SELECT id FROM mentorships
       WHERE mentor_id = $1 AND mentee_id = $2 AND status IN ('pending', 'active')`,
      [mentorId, menteeId]
    );

    if (existing) {
      throw new Error('Mentorship already exists with this mentor');
    }

    const id = `ms_${crypto.randomBytes(12).toString('hex')}`;

    await query(
      `INSERT INTO mentorships (id, mentor_id, mentee_id, focus_areas, goals)
       VALUES ($1, $2, $3, $4, $5)`,
      [id, mentorId, menteeId, options.focusAreas || [], options.goals]
    );

    return {
      id,
      mentorId,
      menteeId,
      status: 'pending',
      focusAreas: options.focusAreas || [],
      goals: options.goals,
      createdAt: new Date(),
    };
  },

  /**
   * Accept mentorship request (mentor action)
   */
  async acceptMentorship(mentorId: string, mentorshipId: string): Promise<Mentorship> {
    return await transaction(async (client) => {
      const result = await client.query(
        `UPDATE mentorships
         SET status = 'active', start_date = NOW()
         WHERE id = $1 AND mentor_id = $2 AND status = 'pending'
         RETURNING *`,
        [mentorshipId, mentorId]
      );

      if (result.rowCount === 0) {
        throw new Error('Mentorship request not found or already processed');
      }

      const row = result.rows[0];

      // Increment mentor's current mentee count
      await client.query(
        'UPDATE mentor_profiles SET current_mentee_count = current_mentee_count + 1 WHERE user_id = $1',
        [mentorId]
      );

      return {
        id: row.id,
        mentorId: row.mentor_id,
        menteeId: row.mentee_id,
        status: row.status,
        focusAreas: row.focus_areas,
        goals: row.goals,
        startDate: row.start_date,
        expectedEndDate: row.expected_end_date,
        createdAt: row.created_at,
      };
    });
  },

  /**
   * Decline mentorship request (mentor action)
   */
  async declineMentorship(mentorId: string, mentorshipId: string): Promise<void> {
    await query(
      `UPDATE mentorships SET status = 'cancelled'
       WHERE id = $1 AND mentor_id = $2 AND status = 'pending'`,
      [mentorshipId, mentorId]
    );
  },

  /**
   * Complete mentorship
   */
  async completeMentorship(
    userId: string,
    mentorshipId: string,
    feedback: { rating: number; comment?: string }
  ): Promise<void> {
    await transaction(async (client) => {
      // Get mentorship details
      const mentorship = await client.query(
        'SELECT * FROM mentorships WHERE id = $1 AND status = $2',
        [mentorshipId, 'active']
      );

      if (mentorship.rowCount === 0) {
        throw new Error('Active mentorship not found');
      }

      const row = mentorship.rows[0];
      const isMentor = row.mentor_id === userId;
      const isMentee = row.mentee_id === userId;

      if (!isMentor && !isMentee) {
        throw new Error('User is not part of this mentorship');
      }

      // Update mentorship with feedback
      if (isMentee) {
        await client.query(
          `UPDATE mentorships
           SET mentee_rating = $1, mentee_feedback = $2
           WHERE id = $3`,
          [feedback.rating, feedback.comment, mentorshipId]
        );

        // Update mentor's rating
        await client.query(
          `UPDATE mentor_profiles
           SET rating = ((rating * total_ratings) + $1) / (total_ratings + 1),
               total_ratings = total_ratings + 1
           WHERE user_id = $2`,
          [feedback.rating, row.mentor_id]
        );
      } else {
        await client.query(
          `UPDATE mentorships
           SET mentor_rating = $1, mentor_feedback = $2
           WHERE id = $3`,
          [feedback.rating, feedback.comment, mentorshipId]
        );
      }

      // Check if both parties have provided feedback
      const updated = await client.query('SELECT * FROM mentorships WHERE id = $1', [mentorshipId]);
      const updatedRow = updated.rows[0];

      if (updatedRow.mentee_rating && updatedRow.mentor_rating) {
        // Both rated, complete the mentorship
        await client.query(
          `UPDATE mentorships
           SET status = 'completed', actual_end_date = NOW()
           WHERE id = $1`,
          [mentorshipId]
        );

        // Update mentor stats
        await client.query(
          `UPDATE mentor_profiles
           SET current_mentee_count = GREATEST(current_mentee_count - 1, 0),
               total_mentorships = total_mentorships + 1,
               successful_mentorships = successful_mentorships + 1
           WHERE user_id = $1`,
          [row.mentor_id]
        );
      }
    });
  },

  /**
   * Cancel mentorship
   */
  async cancelMentorship(userId: string, mentorshipId: string): Promise<void> {
    await transaction(async (client) => {
      const result = await client.query(
        `UPDATE mentorships
         SET status = 'cancelled', actual_end_date = NOW()
         WHERE id = $1 AND (mentor_id = $2 OR mentee_id = $2) AND status IN ('pending', 'active')
         RETURNING mentor_id, status`,
        [mentorshipId, userId]
      );

      if (result.rowCount === 0) {
        throw new Error('Mentorship not found or already ended');
      }

      const row = result.rows[0];

      // If was active, decrement mentor's count
      if (row.status === 'active') {
        await client.query(
          'UPDATE mentor_profiles SET current_mentee_count = GREATEST(current_mentee_count - 1, 0) WHERE user_id = $1',
          [row.mentor_id]
        );
      }
    });
  },

  /**
   * Get pending mentorship requests (for mentor)
   */
  async getPendingRequests(mentorId: string): Promise<MentorshipWithUsers[]> {
    const rows = await queryAll<{
      id: string;
      mentor_id: string;
      mentee_id: string;
      status: string;
      focus_areas: string[];
      goals: string | null;
      created_at: Date;
      mentor_username: string;
      mentor_display_name: string | null;
      mentor_avatar_url: string | null;
      mentee_username: string;
      mentee_display_name: string | null;
      mentee_avatar_url: string | null;
    }>(
      `SELECT m.*,
              um.username as mentor_username, um.display_name as mentor_display_name, um.avatar_url as mentor_avatar_url,
              ue.username as mentee_username, ue.display_name as mentee_display_name, ue.avatar_url as mentee_avatar_url
       FROM mentorships m
       JOIN users um ON um.id = m.mentor_id
       JOIN users ue ON ue.id = m.mentee_id
       WHERE m.mentor_id = $1 AND m.status = 'pending'
       ORDER BY m.created_at DESC`,
      [mentorId]
    );

    return rows.map((r) => ({
      id: r.id,
      mentorId: r.mentor_id,
      menteeId: r.mentee_id,
      status: r.status as Mentorship['status'],
      focusAreas: r.focus_areas,
      goals: r.goals || undefined,
      createdAt: r.created_at,
      mentorUsername: r.mentor_username,
      mentorDisplayName: r.mentor_display_name || undefined,
      mentorAvatarUrl: r.mentor_avatar_url || undefined,
      menteeUsername: r.mentee_username,
      menteeDisplayName: r.mentee_display_name || undefined,
      menteeAvatarUrl: r.mentee_avatar_url || undefined,
    }));
  },

  /**
   * Get active mentorships
   */
  async getActiveMentorships(userId: string): Promise<MentorshipWithUsers[]> {
    const rows = await queryAll<{
      id: string;
      mentor_id: string;
      mentee_id: string;
      status: string;
      focus_areas: string[];
      goals: string | null;
      start_date: Date | null;
      expected_end_date: Date | null;
      created_at: Date;
      mentor_username: string;
      mentor_display_name: string | null;
      mentor_avatar_url: string | null;
      mentee_username: string;
      mentee_display_name: string | null;
      mentee_avatar_url: string | null;
    }>(
      `SELECT m.*,
              um.username as mentor_username, um.display_name as mentor_display_name, um.avatar_url as mentor_avatar_url,
              ue.username as mentee_username, ue.display_name as mentee_display_name, ue.avatar_url as mentee_avatar_url
       FROM mentorships m
       JOIN users um ON um.id = m.mentor_id
       JOIN users ue ON ue.id = m.mentee_id
       WHERE (m.mentor_id = $1 OR m.mentee_id = $1) AND m.status = 'active'
       ORDER BY m.start_date DESC`,
      [userId]
    );

    return rows.map((r) => ({
      id: r.id,
      mentorId: r.mentor_id,
      menteeId: r.mentee_id,
      status: r.status as Mentorship['status'],
      focusAreas: r.focus_areas,
      goals: r.goals || undefined,
      startDate: r.start_date || undefined,
      expectedEndDate: r.expected_end_date || undefined,
      createdAt: r.created_at,
      mentorUsername: r.mentor_username,
      mentorDisplayName: r.mentor_display_name || undefined,
      mentorAvatarUrl: r.mentor_avatar_url || undefined,
      menteeUsername: r.mentee_username,
      menteeDisplayName: r.mentee_display_name || undefined,
      menteeAvatarUrl: r.mentee_avatar_url || undefined,
    }));
  },

  /**
   * Get mentorship history
   */
  async getMentorshipHistory(
    userId: string,
    options: { limit?: number; offset?: number } = {}
  ): Promise<{ mentorships: MentorshipWithUsers[]; total: number }> {
    const { limit = 20, offset = 0 } = options;

    const [rows, countResult] = await Promise.all([
      queryAll<{
        id: string;
        mentor_id: string;
        mentee_id: string;
        status: string;
        focus_areas: string[];
        goals: string | null;
        start_date: Date | null;
        actual_end_date: Date | null;
        mentee_rating: number | null;
        mentor_rating: number | null;
        created_at: Date;
        mentor_username: string;
        mentor_display_name: string | null;
        mentor_avatar_url: string | null;
        mentee_username: string;
        mentee_display_name: string | null;
        mentee_avatar_url: string | null;
      }>(
        `SELECT m.*,
                um.username as mentor_username, um.display_name as mentor_display_name, um.avatar_url as mentor_avatar_url,
                ue.username as mentee_username, ue.display_name as mentee_display_name, ue.avatar_url as mentee_avatar_url
         FROM mentorships m
         JOIN users um ON um.id = m.mentor_id
         JOIN users ue ON ue.id = m.mentee_id
         WHERE (m.mentor_id = $1 OR m.mentee_id = $1) AND m.status IN ('completed', 'cancelled')
         ORDER BY m.actual_end_date DESC NULLS LAST
         LIMIT $2 OFFSET $3`,
        [userId, limit, offset]
      ),
      queryOne<{ count: string }>(
        `SELECT COUNT(*) as count FROM mentorships
         WHERE (mentor_id = $1 OR mentee_id = $1) AND status IN ('completed', 'cancelled')`,
        [userId]
      ),
    ]);

    return {
      mentorships: rows.map((r) => ({
        id: r.id,
        mentorId: r.mentor_id,
        menteeId: r.mentee_id,
        status: r.status as Mentorship['status'],
        focusAreas: r.focus_areas,
        goals: r.goals || undefined,
        startDate: r.start_date || undefined,
        actualEndDate: r.actual_end_date || undefined,
        menteeRating: r.mentee_rating || undefined,
        mentorRating: r.mentor_rating || undefined,
        createdAt: r.created_at,
        mentorUsername: r.mentor_username,
        mentorDisplayName: r.mentor_display_name || undefined,
        mentorAvatarUrl: r.mentor_avatar_url || undefined,
        menteeUsername: r.mentee_username,
        menteeDisplayName: r.mentee_display_name || undefined,
        menteeAvatarUrl: r.mentee_avatar_url || undefined,
      })),
      total: parseInt(countResult?.count || '0'),
    };
  },

  // ==========================================
  // CHECK-INS
  // ==========================================

  /**
   * Create a check-in
   */
  async createCheckIn(
    userId: string,
    mentorshipId: string,
    checkIn: {
      notes?: string;
      mood?: MentorshipCheckIn['mood'];
      progressUpdate?: string;
      nextSteps?: string;
      scheduledFor?: Date;
    }
  ): Promise<MentorshipCheckIn> {
    // Verify user is part of mentorship
    const mentorship = await queryOne<{ mentor_id: string; mentee_id: string }>(
      'SELECT mentor_id, mentee_id FROM mentorships WHERE id = $1 AND status = $2',
      [mentorshipId, 'active']
    );

    if (!mentorship) {
      throw new Error('Active mentorship not found');
    }

    if (mentorship.mentor_id !== userId && mentorship.mentee_id !== userId) {
      throw new Error('User is not part of this mentorship');
    }

    const id = `mci_${crypto.randomBytes(12).toString('hex')}`;

    await query(
      `INSERT INTO mentorship_check_ins (id, mentorship_id, initiated_by, notes, mood, progress_update, next_steps, scheduled_for)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        id,
        mentorshipId,
        userId,
        checkIn.notes,
        checkIn.mood,
        checkIn.progressUpdate,
        checkIn.nextSteps,
        checkIn.scheduledFor,
      ]
    );

    return {
      id,
      mentorshipId,
      initiatedBy: userId,
      notes: checkIn.notes,
      mood: checkIn.mood,
      progressUpdate: checkIn.progressUpdate,
      nextSteps: checkIn.nextSteps,
      scheduledFor: checkIn.scheduledFor,
      createdAt: new Date(),
    };
  },

  /**
   * Complete a check-in
   */
  async completeCheckIn(userId: string, checkInId: string): Promise<void> {
    await query(
      `UPDATE mentorship_check_ins
       SET completed_at = NOW()
       WHERE id = $1 AND EXISTS (
         SELECT 1 FROM mentorships m
         WHERE m.id = mentorship_check_ins.mentorship_id
           AND (m.mentor_id = $2 OR m.mentee_id = $2)
       )`,
      [checkInId, userId]
    );
  },

  /**
   * Get check-ins for a mentorship
   */
  async getCheckIns(
    mentorshipId: string,
    options: { limit?: number; offset?: number } = {}
  ): Promise<{ checkIns: MentorshipCheckIn[]; total: number }> {
    const { limit = 20, offset = 0 } = options;

    const [rows, countResult] = await Promise.all([
      queryAll<{
        id: string;
        mentorship_id: string;
        initiated_by: string;
        notes: string | null;
        mood: string | null;
        progress_update: string | null;
        next_steps: string | null;
        scheduled_for: Date | null;
        completed_at: Date | null;
        created_at: Date;
      }>(
        `SELECT * FROM mentorship_check_ins
         WHERE mentorship_id = $1
         ORDER BY created_at DESC
         LIMIT $2 OFFSET $3`,
        [mentorshipId, limit, offset]
      ),
      queryOne<{ count: string }>(
        'SELECT COUNT(*) as count FROM mentorship_check_ins WHERE mentorship_id = $1',
        [mentorshipId]
      ),
    ]);

    return {
      checkIns: rows.map((r) => ({
        id: r.id,
        mentorshipId: r.mentorship_id,
        initiatedBy: r.initiated_by,
        notes: r.notes || undefined,
        mood: r.mood as MentorshipCheckIn['mood'],
        progressUpdate: r.progress_update || undefined,
        nextSteps: r.next_steps || undefined,
        scheduledFor: r.scheduled_for || undefined,
        completedAt: r.completed_at || undefined,
        createdAt: r.created_at,
      })),
      total: parseInt(countResult?.count || '0'),
    };
  },
};

export default mentorshipService;
