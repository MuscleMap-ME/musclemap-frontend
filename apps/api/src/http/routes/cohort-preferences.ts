/**
 * Cohort Preferences Routes
 *
 * REST API for user cohort preferences:
 * - Get/update gender, age band, adaptive category
 * - Control leaderboard visibility
 * - Manage achievement display settings
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { authenticate } from './auth';
import { queryOne, query } from '../../db/client';
import { loggers } from '../../lib/logger';

const log = loggers.core;

// Schemas
const updateCohortPreferencesSchema = z.object({
  genderCategory: z.enum(['open', 'women', 'men', 'non_binary', 'trans_women', 'trans_men', 'prefer_not_to_say']).optional(),
  genderVisible: z.boolean().optional(),
  ageBand: z.enum(['open', 'under_18', '18_29', '30_39', '40_49', '50_59', '60_69', '70_plus']).optional(),
  ageVisible: z.boolean().optional(),
  adaptiveCategory: z.enum(['open', 'adaptive', 'para', 'special_olympics']).optional(),
  adaptiveVisible: z.boolean().optional(),
  showOnLeaderboards: z.boolean().optional(),
  showAchievementsOnProfile: z.boolean().optional(),
});

// Types
interface CohortPreferences {
  userId: string;
  genderCategory?: string;
  genderVisible: boolean;
  ageBand?: string;
  ageVisible: boolean;
  adaptiveCategory?: string;
  adaptiveVisible: boolean;
  showOnLeaderboards: boolean;
  showAchievementsOnProfile: boolean;
  updatedAt: Date;
}

// Helper to get or create preferences
async function getOrCreatePreferences(userId: string): Promise<CohortPreferences> {
  let prefs = await queryOne<{
    user_id: string;
    gender_category: string | null;
    gender_visible: boolean;
    age_band: string | null;
    age_visible: boolean;
    adaptive_category: string | null;
    adaptive_visible: boolean;
    show_on_leaderboards: boolean;
    show_achievements_on_profile: boolean;
    updated_at: Date;
  }>(
    'SELECT * FROM user_cohort_preferences WHERE user_id = $1',
    [userId]
  );

  if (!prefs) {
    // Create default preferences
    await query(
      `INSERT INTO user_cohort_preferences (user_id) VALUES ($1) ON CONFLICT DO NOTHING`,
      [userId]
    );

    prefs = await queryOne<{
      user_id: string;
      gender_category: string | null;
      gender_visible: boolean;
      age_band: string | null;
      age_visible: boolean;
      adaptive_category: string | null;
      adaptive_visible: boolean;
      show_on_leaderboards: boolean;
      show_achievements_on_profile: boolean;
      updated_at: Date;
    }>(
      'SELECT * FROM user_cohort_preferences WHERE user_id = $1',
      [userId]
    );
  }

  return {
    userId: prefs!.user_id,
    genderCategory: prefs!.gender_category ?? undefined,
    genderVisible: prefs!.gender_visible,
    ageBand: prefs!.age_band ?? undefined,
    ageVisible: prefs!.age_visible,
    adaptiveCategory: prefs!.adaptive_category ?? undefined,
    adaptiveVisible: prefs!.adaptive_visible,
    showOnLeaderboards: prefs!.show_on_leaderboards,
    showAchievementsOnProfile: prefs!.show_achievements_on_profile,
    updatedAt: prefs!.updated_at,
  };
}

export async function registerCohortPreferencesRoutes(app: FastifyInstance) {
  // ============================================
  // COHORT PREFERENCES
  // ============================================

  /**
   * Get current user's cohort preferences
   * GET /me/cohort-preferences
   */
  app.get('/me/cohort-preferences', {
    preHandler: authenticate,
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const prefs = await getOrCreatePreferences(request.user!.userId);
    return reply.send({ data: prefs });
  });

  /**
   * Update current user's cohort preferences
   * PATCH /me/cohort-preferences
   */
  app.patch('/me/cohort-preferences', {
    preHandler: authenticate,
  }, async (request: FastifyRequest<{ Body: z.infer<typeof updateCohortPreferencesSchema> }>, reply: FastifyReply) => {
    const userId = request.user!.userId;
    const body = updateCohortPreferencesSchema.parse(request.body);

    // Ensure record exists
    await getOrCreatePreferences(userId);

    // Build update query
    const updates: string[] = ['updated_at = NOW()'];
    const params: unknown[] = [];
    let paramIndex = 1;

    if (body.genderCategory !== undefined) {
      updates.push(`gender_category = $${paramIndex++}`);
      params.push(body.genderCategory);
    }
    if (body.genderVisible !== undefined) {
      updates.push(`gender_visible = $${paramIndex++}`);
      params.push(body.genderVisible);
    }
    if (body.ageBand !== undefined) {
      updates.push(`age_band = $${paramIndex++}`);
      params.push(body.ageBand);
    }
    if (body.ageVisible !== undefined) {
      updates.push(`age_visible = $${paramIndex++}`);
      params.push(body.ageVisible);
    }
    if (body.adaptiveCategory !== undefined) {
      updates.push(`adaptive_category = $${paramIndex++}`);
      params.push(body.adaptiveCategory);
    }
    if (body.adaptiveVisible !== undefined) {
      updates.push(`adaptive_visible = $${paramIndex++}`);
      params.push(body.adaptiveVisible);
    }
    if (body.showOnLeaderboards !== undefined) {
      updates.push(`show_on_leaderboards = $${paramIndex++}`);
      params.push(body.showOnLeaderboards);
    }
    if (body.showAchievementsOnProfile !== undefined) {
      updates.push(`show_achievements_on_profile = $${paramIndex++}`);
      params.push(body.showAchievementsOnProfile);
    }

    if (params.length > 0) {
      params.push(userId);
      await query(
        `UPDATE user_cohort_preferences SET ${updates.join(', ')} WHERE user_id = $${paramIndex}`,
        params
      );

      log.info({ userId, updates: body }, 'Cohort preferences updated');
    }

    const prefs = await getOrCreatePreferences(userId);
    return reply.send({ data: prefs });
  });

  // ============================================
  // COHORT OPTIONS (for dropdowns)
  // ============================================

  /**
   * Get available cohort options
   * GET /cohort-options
   */
  app.get('/cohort-options', async (_request: FastifyRequest, reply: FastifyReply) => {
    const options = {
      genderCategories: [
        { value: 'open', label: 'Open (All)' },
        { value: 'women', label: 'Women' },
        { value: 'men', label: 'Men' },
        { value: 'non_binary', label: 'Non-Binary' },
        { value: 'trans_women', label: 'Trans Women' },
        { value: 'trans_men', label: 'Trans Men' },
        { value: 'prefer_not_to_say', label: 'Prefer Not to Say' },
      ],
      ageBands: [
        { value: 'open', label: 'Open (All Ages)' },
        { value: 'under_18', label: 'Under 18' },
        { value: '18_29', label: '18-29' },
        { value: '30_39', label: '30-39' },
        { value: '40_49', label: '40-49' },
        { value: '50_59', label: '50-59' },
        { value: '60_69', label: '60-69' },
        { value: '70_plus', label: '70+' },
      ],
      adaptiveCategories: [
        { value: 'open', label: 'Open (All)' },
        { value: 'adaptive', label: 'Adaptive Athletes' },
        { value: 'para', label: 'Para Athletes' },
        { value: 'special_olympics', label: 'Special Olympics' },
      ],
    };

    return reply.send({ data: options });
  });

  // ============================================
  // LEADERBOARD VISIBILITY
  // ============================================

  /**
   * Opt out of leaderboards
   * POST /me/leaderboard-opt-out
   */
  app.post('/me/leaderboard-opt-out', {
    preHandler: authenticate,
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = request.user!.userId;

    await getOrCreatePreferences(userId);
    await query(
      'UPDATE user_cohort_preferences SET show_on_leaderboards = FALSE, updated_at = NOW() WHERE user_id = $1',
      [userId]
    );

    log.info({ userId }, 'User opted out of leaderboards');

    return reply.send({ data: { success: true, message: 'Opted out of leaderboards' } });
  });

  /**
   * Opt into leaderboards
   * POST /me/leaderboard-opt-in
   */
  app.post('/me/leaderboard-opt-in', {
    preHandler: authenticate,
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = request.user!.userId;

    await getOrCreatePreferences(userId);
    await query(
      'UPDATE user_cohort_preferences SET show_on_leaderboards = TRUE, updated_at = NOW() WHERE user_id = $1',
      [userId]
    );

    log.info({ userId }, 'User opted into leaderboards');

    return reply.send({ data: { success: true, message: 'Opted into leaderboards' } });
  });
}
