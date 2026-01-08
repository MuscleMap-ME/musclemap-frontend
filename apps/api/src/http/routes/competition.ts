/**
 * Competition Routes
 *
 * Endpoints for bodybuilding/powerlifting competition tracking:
 * - Competition categories (federations/divisions)
 * - User competition profiles
 * - Show countdown and prep tracking
 * - Weak point assessment
 * - Weigh-in logging
 */

import { FastifyInstance } from 'fastify';
import { db } from '../../db/client';
import { loggers } from '../../lib/logger';
import { authenticate } from './auth';

const log = loggers.http.child({ module: 'competition-routes' });

export async function registerCompetitionRoutes(app: FastifyInstance) {
  // ============================================
  // PUBLIC ENDPOINTS
  // ============================================

  /**
   * GET /competition/categories
   * List all competition categories/divisions
   */
  app.get('/competition/categories', async (request, reply) => {
    const { sport, federation, tested } = request.query as {
      sport?: string;
      federation?: string;
      tested?: string;
    };

    let query = `
      SELECT id, name, description, federation, sport, gender, division,
             weight_class, height_class, is_tested, icon
      FROM competition_categories
      WHERE is_active = TRUE
    `;
    const params: unknown[] = [];
    let paramIndex = 1;

    if (sport) {
      query += ` AND sport = $${paramIndex}`;
      params.push(sport);
      paramIndex++;
    }

    if (federation) {
      query += ` AND federation = $${paramIndex}`;
      params.push(federation);
      paramIndex++;
    }

    if (tested === 'true') {
      query += ` AND is_tested = TRUE`;
    } else if (tested === 'false') {
      query += ` AND is_tested = FALSE`;
    }

    query += ` ORDER BY display_order ASC`;

    const rows = await db.queryAll<{
      id: string;
      name: string;
      description: string | null;
      federation: string | null;
      sport: string;
      gender: string | null;
      division: string | null;
      weight_class: string | null;
      height_class: string | null;
      is_tested: boolean;
      icon: string | null;
    }>(query, params);

    const categories = rows.map(c => ({
      id: c.id,
      name: c.name,
      description: c.description,
      federation: c.federation,
      sport: c.sport,
      gender: c.gender,
      division: c.division,
      weightClass: c.weight_class,
      heightClass: c.height_class,
      isTested: c.is_tested,
      icon: c.icon,
    }));

    return reply.send({ data: { categories } });
  });

  /**
   * GET /competition/categories/grouped
   * Get categories grouped by sport
   */
  app.get('/competition/categories/grouped', async (request, reply) => {
    const rows = await db.queryAll<{
      id: string;
      name: string;
      federation: string | null;
      sport: string;
      gender: string | null;
      is_tested: boolean;
    }>(
      `SELECT id, name, federation, sport, gender, is_tested
       FROM competition_categories
       WHERE is_active = TRUE
       ORDER BY display_order ASC`
    );

    // Group by sport
    const grouped: Record<string, typeof rows> = {};
    for (const row of rows) {
      if (!grouped[row.sport]) {
        grouped[row.sport] = [];
      }
      grouped[row.sport].push(row);
    }

    return reply.send({
      data: {
        sports: Object.keys(grouped).map(sport => ({
          sport,
          categories: grouped[sport].map(c => ({
            id: c.id,
            name: c.name,
            federation: c.federation,
            gender: c.gender,
            isTested: c.is_tested,
          })),
        })),
      },
    });
  });

  /**
   * GET /competition/categories/:id
   * Get a specific category with details
   */
  app.get('/competition/categories/:id', async (request, reply) => {
    const { id } = request.params as { id: string };

    const category = await db.queryOne<{
      id: string;
      name: string;
      description: string | null;
      federation: string | null;
      sport: string;
      gender: string | null;
      division: string | null;
      weight_class: string | null;
      height_class: string | null;
      is_tested: boolean;
      icon: string | null;
    }>(
      `SELECT * FROM competition_categories WHERE id = $1 AND is_active = TRUE`,
      [id]
    );

    if (!category) {
      return reply.status(404).send({
        error: { code: 'NOT_FOUND', message: 'Competition category not found', statusCode: 404 },
      });
    }

    // Get mandatory poses for this sport
    const poses = await db.queryAll<{
      pose_name: string;
      pose_order: number;
      description: string | null;
    }>(
      `SELECT pose_name, pose_order, description
       FROM competition_mandatory_poses
       WHERE sport = $1
       ORDER BY pose_order ASC`,
      [category.sport]
    );

    return reply.send({
      data: {
        category: {
          id: category.id,
          name: category.name,
          description: category.description,
          federation: category.federation,
          sport: category.sport,
          gender: category.gender,
          division: category.division,
          weightClass: category.weight_class,
          heightClass: category.height_class,
          isTested: category.is_tested,
          icon: category.icon,
          mandatoryPoses: poses.map(p => ({
            name: p.pose_name,
            order: p.pose_order,
            description: p.description,
          })),
        },
      },
    });
  });

  /**
   * GET /competition/weak-points
   * Get all weak point options
   */
  app.get('/competition/weak-points', async (request, reply) => {
    const rows = await db.queryAll<{
      id: string;
      body_part: string;
      display_name: string;
      muscle_group: string;
    }>(
      `SELECT id, body_part, display_name, muscle_group
       FROM weak_point_options
       ORDER BY display_order ASC`
    );

    // Group by muscle group
    const grouped: Record<string, Array<{ id: string; name: string }>> = {};
    for (const row of rows) {
      if (!grouped[row.muscle_group]) {
        grouped[row.muscle_group] = [];
      }
      grouped[row.muscle_group].push({
        id: row.id,
        name: row.display_name,
      });
    }

    return reply.send({
      data: {
        muscleGroups: Object.keys(grouped).map(group => ({
          group,
          weakPoints: grouped[group],
        })),
      },
    });
  });

  // ============================================
  // AUTHENTICATED ENDPOINTS
  // ============================================

  /**
   * GET /competition/me
   * Get user's competition profile
   */
  app.get('/competition/me', { preHandler: authenticate }, async (request, reply) => {
    const userId = request.user!.userId;

    const profile = await db.queryOne<{
      id: string;
      category_id: string | null;
      show_name: string | null;
      show_date: string | null;
      show_location: string | null;
      current_phase: string;
      phase_started_at: string;
      prep_start_date: string | null;
      prep_weeks: number | null;
      coach_name: string | null;
      starting_weight_kg: number | null;
      starting_body_fat_percent: number | null;
      goal_stage_weight_kg: number | null;
      current_weight_kg: number | null;
      current_body_fat_percent: number | null;
      last_weigh_in_date: string | null;
      weak_points: string[];
      previous_shows: unknown;
      best_placement: string | null;
      competition_goals: string | null;
      notes: string | null;
    }>(
      `SELECT * FROM user_competition_profiles
       WHERE user_id = $1 AND is_active = TRUE`,
      [userId]
    );

    if (!profile) {
      return reply.send({ data: { profile: null } });
    }

    // Calculate weeks out if show_date is set
    let weeksOut: number | null = null;
    let daysOut: number | null = null;
    if (profile.show_date) {
      const showDate = new Date(profile.show_date);
      const today = new Date();
      const diffMs = showDate.getTime() - today.getTime();
      daysOut = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
      weeksOut = Math.ceil(daysOut / 7);
    }

    // Get category details
    let categoryName = null;
    if (profile.category_id) {
      const cat = await db.queryOne<{ name: string }>(
        `SELECT name FROM competition_categories WHERE id = $1`,
        [profile.category_id]
      );
      categoryName = cat?.name;
    }

    return reply.send({
      data: {
        profile: {
          id: profile.id,
          categoryId: profile.category_id,
          categoryName,
          showName: profile.show_name,
          showDate: profile.show_date,
          showLocation: profile.show_location,
          currentPhase: profile.current_phase,
          phaseStartedAt: profile.phase_started_at,
          prepStartDate: profile.prep_start_date,
          prepWeeks: profile.prep_weeks,
          coachName: profile.coach_name,
          startingWeightKg: profile.starting_weight_kg,
          startingBodyFatPercent: profile.starting_body_fat_percent,
          goalStageWeightKg: profile.goal_stage_weight_kg,
          currentWeightKg: profile.current_weight_kg,
          currentBodyFatPercent: profile.current_body_fat_percent,
          lastWeighInDate: profile.last_weigh_in_date,
          weakPoints: profile.weak_points,
          previousShows: profile.previous_shows,
          bestPlacement: profile.best_placement,
          competitionGoals: profile.competition_goals,
          notes: profile.notes,
          // Countdown
          weeksOut,
          daysOut,
        },
      },
    });
  });

  /**
   * POST /competition/me
   * Create or update user's competition profile
   */
  app.post('/competition/me', { preHandler: authenticate }, async (request, reply) => {
    const userId = request.user!.userId;
    const body = request.body as {
      categoryId?: string;
      showName?: string;
      showDate?: string;
      showLocation?: string;
      currentPhase?: string;
      prepStartDate?: string;
      prepWeeks?: number;
      coachName?: string;
      coachContact?: string;
      startingWeightKg?: number;
      startingBodyFatPercent?: number;
      goalStageWeightKg?: number;
      weakPoints?: string[];
      competitionGoals?: string;
      notes?: string;
    };

    // Check if profile exists
    const existing = await db.queryOne<{ id: string }>(
      `SELECT id FROM user_competition_profiles WHERE user_id = $1 AND is_active = TRUE`,
      [userId]
    );

    if (existing) {
      // Update existing profile
      const updates: string[] = [];
      const params: unknown[] = [];
      let paramIndex = 1;

      const fields = [
        { key: 'categoryId', column: 'category_id' },
        { key: 'showName', column: 'show_name' },
        { key: 'showDate', column: 'show_date' },
        { key: 'showLocation', column: 'show_location' },
        { key: 'currentPhase', column: 'current_phase' },
        { key: 'prepStartDate', column: 'prep_start_date' },
        { key: 'prepWeeks', column: 'prep_weeks' },
        { key: 'coachName', column: 'coach_name' },
        { key: 'coachContact', column: 'coach_contact' },
        { key: 'startingWeightKg', column: 'starting_weight_kg' },
        { key: 'startingBodyFatPercent', column: 'starting_body_fat_percent' },
        { key: 'goalStageWeightKg', column: 'goal_stage_weight_kg' },
        { key: 'weakPoints', column: 'weak_points' },
        { key: 'competitionGoals', column: 'competition_goals' },
        { key: 'notes', column: 'notes' },
      ];

      for (const field of fields) {
        if (body[field.key as keyof typeof body] !== undefined) {
          const value = body[field.key as keyof typeof body];
          if (field.key === 'weakPoints') {
            updates.push(`${field.column} = $${paramIndex}::jsonb`);
            params.push(JSON.stringify(value));
          } else {
            updates.push(`${field.column} = $${paramIndex}`);
            params.push(value);
          }
          paramIndex++;
        }
      }

      if (body.currentPhase !== undefined) {
        updates.push(`phase_started_at = NOW()`);
      }

      updates.push(`updated_at = NOW()`);

      if (updates.length > 1) {
        params.push(existing.id);
        await db.query(
          `UPDATE user_competition_profiles SET ${updates.join(', ')} WHERE id = $${paramIndex}`,
          params
        );
      }

      log.info({ userId, profileId: existing.id }, 'Competition profile updated');
      return reply.send({ data: { id: existing.id }, message: 'Profile updated' });
    } else {
      // Create new profile
      const result = await db.queryOne<{ id: string }>(
        `INSERT INTO user_competition_profiles (
          user_id, category_id, show_name, show_date, show_location,
          current_phase, prep_start_date, prep_weeks,
          coach_name, coach_contact,
          starting_weight_kg, starting_body_fat_percent, goal_stage_weight_kg,
          weak_points, competition_goals, notes
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14::jsonb, $15, $16)
        RETURNING id`,
        [
          userId,
          body.categoryId ?? null,
          body.showName ?? null,
          body.showDate ?? null,
          body.showLocation ?? null,
          body.currentPhase ?? 'offseason',
          body.prepStartDate ?? null,
          body.prepWeeks ?? null,
          body.coachName ?? null,
          body.coachContact ?? null,
          body.startingWeightKg ?? null,
          body.startingBodyFatPercent ?? null,
          body.goalStageWeightKg ?? null,
          JSON.stringify(body.weakPoints ?? []),
          body.competitionGoals ?? null,
          body.notes ?? null,
        ]
      );

      log.info({ userId, profileId: result?.id }, 'Competition profile created');
      return reply.status(201).send({ data: { id: result?.id }, message: 'Profile created' });
    }
  });

  /**
   * PUT /competition/me/phase
   * Update competition phase
   */
  app.put('/competition/me/phase', { preHandler: authenticate }, async (request, reply) => {
    const userId = request.user!.userId;
    const { phase } = request.body as { phase: string };

    const validPhases = ['offseason', 'prep', 'peak_week', 'post_show', 'maintenance'];
    if (!validPhases.includes(phase)) {
      return reply.status(400).send({
        error: { code: 'INVALID_PHASE', message: `Phase must be one of: ${validPhases.join(', ')}`, statusCode: 400 },
      });
    }

    const result = await db.query(
      `UPDATE user_competition_profiles
       SET current_phase = $1, phase_started_at = NOW(), updated_at = NOW()
       WHERE user_id = $2 AND is_active = TRUE`,
      [phase, userId]
    );

    if (result.rowCount === 0) {
      return reply.status(404).send({
        error: { code: 'NOT_FOUND', message: 'No active competition profile found', statusCode: 404 },
      });
    }

    return reply.send({ message: `Phase updated to ${phase}` });
  });

  /**
   * POST /competition/me/weigh-in
   * Log a weigh-in
   */
  app.post('/competition/me/weigh-in', { preHandler: authenticate }, async (request, reply) => {
    const userId = request.user!.userId;
    const {
      weightKg,
      bodyFatPercent,
      waistCm,
      chestCm,
      armCm,
      thighCm,
      conditionRating,
      notes,
      photoUrl,
    } = request.body as {
      weightKg: number;
      bodyFatPercent?: number;
      waistCm?: number;
      chestCm?: number;
      armCm?: number;
      thighCm?: number;
      conditionRating?: number;
      notes?: string;
      photoUrl?: string;
    };

    // Get profile ID
    const profile = await db.queryOne<{ id: string }>(
      `SELECT id FROM user_competition_profiles WHERE user_id = $1 AND is_active = TRUE`,
      [userId]
    );

    // Insert weigh-in
    const result = await db.queryOne<{ id: string }>(
      `INSERT INTO competition_weigh_ins (
        user_id, profile_id, weigh_in_date, weight_kg, body_fat_percent,
        waist_cm, chest_cm, arm_cm, thigh_cm, condition_rating, notes, photo_url
      ) VALUES ($1, $2, CURRENT_DATE, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING id`,
      [
        userId,
        profile?.id ?? null,
        weightKg,
        bodyFatPercent ?? null,
        waistCm ?? null,
        chestCm ?? null,
        armCm ?? null,
        thighCm ?? null,
        conditionRating ?? null,
        notes ?? null,
        photoUrl ?? null,
      ]
    );

    // Update profile with current weight
    if (profile) {
      await db.query(
        `UPDATE user_competition_profiles
         SET current_weight_kg = $1, current_body_fat_percent = $2, last_weigh_in_date = CURRENT_DATE, updated_at = NOW()
         WHERE id = $3`,
        [weightKg, bodyFatPercent ?? null, profile.id]
      );
    }

    log.info({ userId, weightKg }, 'Weigh-in logged');
    return reply.status(201).send({ data: { id: result?.id }, message: 'Weigh-in logged' });
  });

  /**
   * GET /competition/me/weigh-ins
   * Get weigh-in history
   */
  app.get('/competition/me/weigh-ins', { preHandler: authenticate }, async (request, reply) => {
    const userId = request.user!.userId;
    const { limit = '30' } = request.query as { limit?: string };

    const rows = await db.queryAll<{
      id: string;
      weigh_in_date: string;
      weight_kg: number;
      body_fat_percent: number | null;
      waist_cm: number | null;
      condition_rating: number | null;
      notes: string | null;
    }>(
      `SELECT id, weigh_in_date, weight_kg, body_fat_percent, waist_cm, condition_rating, notes
       FROM competition_weigh_ins
       WHERE user_id = $1
       ORDER BY weigh_in_date DESC
       LIMIT $2`,
      [userId, parseInt(limit)]
    );

    const weighIns = rows.map(w => ({
      id: w.id,
      date: w.weigh_in_date,
      weightKg: w.weight_kg,
      bodyFatPercent: w.body_fat_percent,
      waistCm: w.waist_cm,
      conditionRating: w.condition_rating,
      notes: w.notes,
    }));

    return reply.send({ data: { weighIns } });
  });

  /**
   * GET /competition/me/countdown
   * Get countdown to show date
   */
  app.get('/competition/me/countdown', { preHandler: authenticate }, async (request, reply) => {
    const userId = request.user!.userId;

    const profile = await db.queryOne<{
      show_name: string | null;
      show_date: string | null;
      show_location: string | null;
      current_phase: string;
      prep_start_date: string | null;
      prep_weeks: number | null;
    }>(
      `SELECT show_name, show_date, show_location, current_phase, prep_start_date, prep_weeks
       FROM user_competition_profiles
       WHERE user_id = $1 AND is_active = TRUE`,
      [userId]
    );

    if (!profile || !profile.show_date) {
      return reply.send({
        data: {
          countdown: null,
          message: 'No show date set',
        },
      });
    }

    const showDate = new Date(profile.show_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    showDate.setHours(0, 0, 0, 0);

    const diffMs = showDate.getTime() - today.getTime();
    const daysOut = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    const weeksOut = Math.floor(daysOut / 7);
    const remainingDays = daysOut % 7;

    // Calculate prep week if prep has started
    let currentPrepWeek: number | null = null;
    if (profile.prep_start_date && profile.prep_weeks) {
      const prepStart = new Date(profile.prep_start_date);
      const weeksSincePrepStart = Math.floor((today.getTime() - prepStart.getTime()) / (1000 * 60 * 60 * 24 * 7));
      currentPrepWeek = weeksSincePrepStart + 1;
    }

    return reply.send({
      data: {
        countdown: {
          showName: profile.show_name,
          showDate: profile.show_date,
          showLocation: profile.show_location,
          daysOut,
          weeksOut,
          remainingDays,
          displayText: weeksOut > 0
            ? `${weeksOut} week${weeksOut !== 1 ? 's' : ''}${remainingDays > 0 ? `, ${remainingDays} day${remainingDays !== 1 ? 's' : ''}` : ''}`
            : `${daysOut} day${daysOut !== 1 ? 's' : ''}`,
          currentPhase: profile.current_phase,
          currentPrepWeek,
          totalPrepWeeks: profile.prep_weeks,
          isPastShow: daysOut < 0,
        },
      },
    });
  });

  /**
   * DELETE /competition/me
   * Deactivate competition profile
   */
  app.delete('/competition/me', { preHandler: authenticate }, async (request, reply) => {
    const userId = request.user!.userId;

    await db.query(
      `UPDATE user_competition_profiles SET is_active = FALSE, updated_at = NOW()
       WHERE user_id = $1 AND is_active = TRUE`,
      [userId]
    );

    return reply.send({ message: 'Competition profile deactivated' });
  });

  /**
   * POST /competition/me/show-complete
   * Mark show as complete and archive profile
   */
  app.post('/competition/me/show-complete', { preHandler: authenticate }, async (request, reply) => {
    const userId = request.user!.userId;
    const { placement, notes } = request.body as {
      placement?: string;
      notes?: string;
    };

    const profile = await db.queryOne<{
      id: string;
      show_name: string | null;
      show_date: string | null;
      previous_shows: unknown;
    }>(
      `SELECT id, show_name, show_date, previous_shows FROM user_competition_profiles
       WHERE user_id = $1 AND is_active = TRUE`,
      [userId]
    );

    if (!profile) {
      return reply.status(404).send({
        error: { code: 'NOT_FOUND', message: 'No active competition profile found', statusCode: 404 },
      });
    }

    // Add to previous shows
    const previousShows = Array.isArray(profile.previous_shows) ? profile.previous_shows : [];
    previousShows.push({
      name: profile.show_name,
      date: profile.show_date,
      placement,
      notes,
      completedAt: new Date().toISOString(),
    });

    // Update profile
    await db.query(
      `UPDATE user_competition_profiles
       SET previous_shows = $1::jsonb,
           best_placement = CASE WHEN $2 IS NOT NULL THEN $2 ELSE best_placement END,
           current_phase = 'post_show',
           phase_started_at = NOW(),
           show_name = NULL,
           show_date = NULL,
           updated_at = NOW()
       WHERE id = $3`,
      [JSON.stringify(previousShows), placement, profile.id]
    );

    log.info({ userId, placement }, 'Show marked as complete');
    return reply.send({ message: 'Show completed and archived' });
  });

  log.info('Competition routes registered');
}
