/**
 * Mascot Routes (Fastify)
 *
 * Handles both Global Mascot and User Companion endpoints.
 *
 * Route structure:
 * - /mascot/global/* - Global site mascot (public)
 * - /mascot/companion/* - User companion (authenticated)
 */

import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { authenticate } from './auth';
import { queryOne, queryAll, query } from '../../db/client';
import { economyService } from '../../modules/economy';
import { companionEventsService, mascotAssistService, mascotPowersService, spiritWardrobeService } from '../../modules/mascot';
import { loggers } from '../../lib/logger';

const log = loggers.db;

// =====================================================
// SCHEMAS
// =====================================================

const settingsSchema = z.object({
  is_visible: z.boolean().optional(),
  is_minimized: z.boolean().optional(),
  sounds_enabled: z.boolean().optional(),
  tips_enabled: z.boolean().optional(),
});

const nicknameSchema = z.object({
  nickname: z.string().min(1).max(30),
});

const equipSchema = z.object({
  slot: z.enum(['aura', 'armor', 'wings', 'tools', 'badge']),
  upgradeId: z.string().nullable(),
});

const markReactedSchema = z.object({
  eventIds: z.array(z.string()).min(1),
});

const useAssistSchema = z.object({
  exerciseId: z.string().min(1),
  workoutId: z.string().optional(),
  sets: z.number().int().min(1).max(10).default(1),
  reps: z.number().int().min(0).max(1000).optional(),
  weight: z.number().min(0).max(10000).optional(),
  reason: z.enum(['tired', 'injury_recovery', 'time_constraint', 'other']).optional(),
});

// =====================================================
// REGISTRATION
// =====================================================

export async function registerMascotRoutes(app: FastifyInstance): Promise<void> {
  // =====================================================
  // GLOBAL MASCOT ROUTES (Public)
  // =====================================================

  /**
   * GET /mascot/global/config
   * Get global mascot configuration
   */
  app.get('/mascot/global/config', async (request, reply) => {
    const config = await queryOne<{
      id: string;
      name: string;
      tagline: string;
      description: string | null;
      ecosystem_url: string;
      ecosystem_about_url: string;
      ecosystem_sections: string;
      asset_3d_url: string | null;
      asset_2d_url: string;
      asset_static_url: string;
      created_at: Date;
    }>(`SELECT * FROM global_mascot_config WHERE id = 'triptomean-spirit'`);

    if (!config) {
      return reply.status(404).send({
        error: { code: 'NOT_FOUND', message: 'Global mascot config not found', statusCode: 404 },
      });
    }

    // ecosystem_sections is a JSONB column, so it comes back as an array already
    return reply.send({
      data: {
        ...config,
        ecosystem_sections: config.ecosystem_sections || [],
      },
    });
  });

  /**
   * GET /mascot/global/placements
   * Get global mascot placements
   */
  app.get('/mascot/global/placements', async (request, reply) => {
    const { location } = request.query as { location?: string };

    // config column is JSONB, no need to parse
    let queryStr = `SELECT * FROM global_mascot_placements WHERE enabled = TRUE`;
    const params: string[] = [];

    if (location) {
      queryStr += ` AND location = $1`;
      params.push(location);
    }

    const placements = await queryAll<{
      id: string;
      location: string;
      enabled: boolean;
      animation_state: string;
      size: string;
      config: Record<string, unknown>;
      created_at: Date;
    }>(queryStr, params);

    // config is JSONB, no need to parse
    return reply.send({
      data: placements.map((p) => ({
        ...p,
        config: p.config || {},
      })),
    });
  });

  // =====================================================
  // USER COMPANION ROUTES (Authenticated)
  // =====================================================

  /**
   * GET /mascot/companion/state
   * Get current companion state for authenticated user
   */
  app.get('/mascot/companion/state', { preHandler: authenticate }, async (request, reply) => {
    const userId = request.user!.userId;

    const state = await companionEventsService.getOrCreateState(userId);
    const progression = companionEventsService.calculateProgression(state.xp, state.stage);

    return reply.send({
      data: {
        ...state,
        progression,
      },
    });
  });

  /**
   * PATCH /mascot/companion/settings
   * Update companion settings
   */
  app.patch('/mascot/companion/settings', { preHandler: authenticate }, async (request, reply) => {
    const userId = request.user!.userId;

    let data;
    try {
      data = settingsSchema.parse(request.body);
    } catch {
      return reply.status(400).send({
        error: { code: 'VALIDATION', message: 'Invalid settings data', statusCode: 400 },
      });
    }

    const updates: string[] = [];
    const values: (boolean | string)[] = [];
    let paramIndex = 1;

    if (typeof data.is_visible === 'boolean') {
      updates.push(`is_visible = $${paramIndex++}`);
      values.push(data.is_visible);
    }
    if (typeof data.is_minimized === 'boolean') {
      updates.push(`is_minimized = $${paramIndex++}`);
      values.push(data.is_minimized);
    }
    if (typeof data.sounds_enabled === 'boolean') {
      updates.push(`sounds_enabled = $${paramIndex++}`);
      values.push(data.sounds_enabled);
    }
    if (typeof data.tips_enabled === 'boolean') {
      updates.push(`tips_enabled = $${paramIndex++}`);
      values.push(data.tips_enabled);
    }

    if (updates.length === 0) {
      return reply.status(400).send({
        error: { code: 'VALIDATION', message: 'No settings provided', statusCode: 400 },
      });
    }

    updates.push(`updated_at = NOW()`);
    values.push(userId);

    await query(
      `UPDATE user_companion_state SET ${updates.join(', ')} WHERE user_id = $${paramIndex}`,
      values
    );

    return reply.send({ data: { success: true } });
  });

  /**
   * PATCH /mascot/companion/nickname
   * Set companion nickname
   */
  app.patch('/mascot/companion/nickname', { preHandler: authenticate }, async (request, reply) => {
    const userId = request.user!.userId;

    let data;
    try {
      data = nicknameSchema.parse(request.body);
    } catch {
      return reply.status(400).send({
        error: { code: 'VALIDATION', message: 'Nickname must be 1-30 characters', statusCode: 400 },
      });
    }

    // Sanitize nickname
    const nickname = data.nickname.trim().replace(/[<>]/g, '');

    await query(
      `UPDATE user_companion_state SET nickname = $1, updated_at = NOW() WHERE user_id = $2`,
      [nickname, userId]
    );

    return reply.send({ data: { success: true, nickname } });
  });

  /**
   * GET /mascot/companion/upgrades
   * Get available upgrades with purchase status
   */
  app.get('/mascot/companion/upgrades', { preHandler: authenticate }, async (request, reply) => {
    const userId = request.user!.userId;

    const state = await companionEventsService.getOrCreateState(userId);
    const balance = await economyService.getBalance(userId);

    const upgrades = await queryAll<{
      id: string;
      name: string;
      description: string | null;
      category: string;
      cost_units: number;
      prerequisite_stage: number;
      prerequisite_upgrades: string;
      visual_asset_url: string | null;
      ability_flag: string | null;
      rarity: string;
      sort_order: number;
      created_at: Date;
    }>(`SELECT * FROM companion_upgrades ORDER BY category, sort_order`);

    return reply.send({
      data: {
        balance,
        upgrades: upgrades.map((u) => {
          const prereqs = JSON.parse(u.prerequisite_upgrades || '[]') as string[];
          const isUnlocked = state.unlocked_upgrades.includes(u.id);
          const meetsStage = state.stage >= u.prerequisite_stage;
          const meetsPrereqs = prereqs.every((r) => state.unlocked_upgrades.includes(r));
          const canAfford = balance >= u.cost_units;

          let lockReason: string | null = null;
          if (isUnlocked) {
            lockReason = null;
          } else if (!meetsStage) {
            lockReason = `Requires Stage ${u.prerequisite_stage}`;
          } else if (!meetsPrereqs) {
            lockReason = 'Missing prerequisites';
          } else if (!canAfford) {
            lockReason = 'Insufficient units';
          }

          return {
            ...u,
            prerequisite_upgrades: prereqs,
            isUnlocked,
            canPurchase: !isUnlocked && meetsStage && meetsPrereqs && canAfford,
            lockReason,
          };
        }),
      },
    });
  });

  /**
   * POST /mascot/companion/upgrades/:upgradeId/purchase
   * Purchase an upgrade
   */
  app.post('/mascot/companion/upgrades/:upgradeId/purchase', { preHandler: authenticate }, async (request, reply) => {
    const userId = request.user!.userId;
    const { upgradeId } = request.params as { upgradeId: string };

    // Get upgrade
    const upgrade = await queryOne<{
      id: string;
      name: string;
      cost_units: number;
      prerequisite_stage: number;
      prerequisite_upgrades: string;
      ability_flag: string | null;
    }>(`SELECT * FROM companion_upgrades WHERE id = $1`, [upgradeId]);

    if (!upgrade) {
      return reply.status(404).send({
        error: { code: 'NOT_FOUND', message: 'Upgrade not found', statusCode: 404 },
      });
    }

    const state = await companionEventsService.getOrCreateState(userId);

    // Check if already unlocked
    if (state.unlocked_upgrades.includes(upgradeId)) {
      return reply.status(400).send({
        error: { code: 'ALREADY_UNLOCKED', message: 'Already unlocked', statusCode: 400 },
      });
    }

    // Check stage requirement
    if (state.stage < upgrade.prerequisite_stage) {
      return reply.status(400).send({
        error: { code: 'STAGE_REQUIRED', message: `Requires Stage ${upgrade.prerequisite_stage}`, statusCode: 400 },
      });
    }

    // Check prerequisites
    const prereqs = JSON.parse(upgrade.prerequisite_upgrades || '[]') as string[];
    if (!prereqs.every((r) => state.unlocked_upgrades.includes(r))) {
      return reply.status(400).send({
        error: { code: 'PREREQ_REQUIRED', message: 'Missing prerequisites', statusCode: 400 },
      });
    }

    // Check balance
    const balance = await economyService.getBalance(userId);
    if (balance < upgrade.cost_units) {
      return reply.status(402).send({
        error: {
          code: 'INSUFFICIENT_CREDITS',
          message: 'Insufficient units',
          statusCode: 402,
          required: upgrade.cost_units,
          available: balance,
        },
      });
    }

    // Charge credits
    const chargeResult = await economyService.charge({
      userId,
      action: `companion_upgrade:${upgradeId}`,
      amount: upgrade.cost_units,
      metadata: { upgradeId, upgradeName: upgrade.name },
      idempotencyKey: `companion-upgrade-${userId}-${upgradeId}-${Date.now()}`,
    });

    if (!chargeResult.success) {
      return reply.status(400).send({
        error: { code: 'CHARGE_FAILED', message: chargeResult.error || 'Charge failed', statusCode: 400 },
      });
    }

    // Update state
    const unlocked = [...state.unlocked_upgrades, upgradeId];
    const abilities = [...state.abilities];

    if (upgrade.ability_flag && !abilities.includes(upgrade.ability_flag)) {
      abilities.push(upgrade.ability_flag);
    }

    await query(
      `UPDATE user_companion_state
       SET unlocked_upgrades = $1, abilities = $2, updated_at = NOW()
       WHERE user_id = $3`,
      [JSON.stringify(unlocked), JSON.stringify(abilities), userId]
    );

    // Emit event for reaction
    await companionEventsService.emit(userId, 'upgrade_purchased', {
      upgradeId,
      name: upgrade.name,
    });

    log.info('Companion upgrade purchased', { userId, upgradeId, cost: upgrade.cost_units });

    return reply.send({
      data: {
        success: true,
        upgrade,
        newBalance: chargeResult.newBalance,
      },
    });
  });

  /**
   * POST /mascot/companion/cosmetics/equip
   * Equip or unequip a cosmetic
   */
  app.post('/mascot/companion/cosmetics/equip', { preHandler: authenticate }, async (request, reply) => {
    const userId = request.user!.userId;

    let data;
    try {
      data = equipSchema.parse(request.body);
    } catch {
      return reply.status(400).send({
        error: { code: 'VALIDATION', message: 'Invalid equip data', statusCode: 400 },
      });
    }

    const state = await companionEventsService.getOrCreateState(userId);

    // Validate upgrade is unlocked (if equipping)
    if (data.upgradeId && !state.unlocked_upgrades.includes(data.upgradeId)) {
      return reply.status(400).send({
        error: { code: 'NOT_UNLOCKED', message: 'Upgrade not unlocked', statusCode: 400 },
      });
    }

    const equipped = { ...state.equipped_cosmetics };

    if (data.upgradeId) {
      equipped[data.slot] = data.upgradeId;
    } else {
      delete equipped[data.slot];
    }

    await query(
      `UPDATE user_companion_state SET equipped_cosmetics = $1, updated_at = NOW() WHERE user_id = $2`,
      [JSON.stringify(equipped), userId]
    );

    return reply.send({ data: { success: true, equipped } });
  });

  /**
   * GET /mascot/companion/events/recent
   * Get recent companion events
   */
  app.get('/mascot/companion/events/recent', { preHandler: authenticate }, async (request, reply) => {
    const userId = request.user!.userId;
    const { limit = '10', unreacted_only = 'false' } = request.query as {
      limit?: string;
      unreacted_only?: string;
    };

    const maxLimit = Math.min(parseInt(limit, 10) || 10, 50);

    let queryStr = `SELECT * FROM companion_events WHERE user_id = $1`;
    if (unreacted_only === 'true') {
      queryStr += ` AND reaction_shown = FALSE`;
    }
    queryStr += ` ORDER BY created_at DESC LIMIT $2`;

    const events = await queryAll<{
      id: string;
      user_id: string;
      event_type: string;
      event_data: string;
      xp_awarded: number;
      units_awarded: number;
      reaction_shown: boolean;
      created_at: Date;
    }>(queryStr, [userId, maxLimit]);

    return reply.send({
      data: events.map((e) => ({
        ...e,
        event_data: JSON.parse(e.event_data || '{}'),
      })),
    });
  });

  /**
   * POST /mascot/companion/events/mark-reacted
   * Mark events as having shown reaction
   */
  app.post('/mascot/companion/events/mark-reacted', { preHandler: authenticate }, async (request, reply) => {
    const userId = request.user!.userId;

    let data;
    try {
      data = markReactedSchema.parse(request.body);
    } catch {
      return reply.status(400).send({
        error: { code: 'VALIDATION', message: 'eventIds required', statusCode: 400 },
      });
    }

    const placeholders = data.eventIds.map((_, i) => `$${i + 2}`).join(',');

    await query(
      `UPDATE companion_events SET reaction_shown = TRUE WHERE user_id = $1 AND id IN (${placeholders})`,
      [userId, ...data.eventIds]
    );

    return reply.send({ data: { success: true } });
  });

  /**
   * GET /mascot/companion/tips/next
   * Get next tip for the companion to show
   */
  app.get('/mascot/companion/tips/next', { preHandler: authenticate }, async (request, reply) => {
    const userId = request.user!.userId;

    const state = await companionEventsService.getOrCreateState(userId);

    // Check if tips are enabled
    if (!state.tips_enabled) {
      return reply.send({ data: { tip: null, reason: 'disabled' } });
    }

    // Check if user has the coach_tips ability
    if (!state.abilities.includes('coach_tips')) {
      return reply.send({ data: { tip: null, reason: 'ability_locked' } });
    }

    // Simple rule-based tips (can be expanded later)
    const tips = [
      { id: 'hydrate', text: 'Stay hydrated! Water improves performance and recovery.' },
      { id: 'warmup', text: 'Never skip your warm-up — it prevents injury and improves performance.' },
      { id: 'rest', text: 'Rest days are when muscles grow. Take breaks to get stronger!' },
      { id: 'protein', text: 'Aim for 0.8-1g of protein per pound of bodyweight for muscle growth.' },
      { id: 'sleep', text: 'Sleep is crucial for recovery. Aim for 7-9 hours per night.' },
      { id: 'progressive', text: 'Progressive overload is key — gradually increase weight, reps, or volume.' },
      { id: 'form', text: 'Perfect form prevents injuries. Quality over quantity always.' },
      { id: 'consistency', text: 'Consistency beats intensity. Small daily efforts add up.' },
    ];

    // Get recently shown tips
    const recentTips = await queryAll<{ tip_id: string }>(
      `SELECT tip_id FROM companion_tips_log WHERE user_id = $1 ORDER BY shown_at DESC LIMIT 5`,
      [userId]
    );
    const recentIds = new Set(recentTips.map((t) => t.tip_id));

    // Find a tip not recently shown
    const availableTips = tips.filter((t) => !recentIds.has(t.id));
    const tip = availableTips.length > 0
      ? availableTips[Math.floor(Math.random() * availableTips.length)]
      : tips[Math.floor(Math.random() * tips.length)];

    // Log the tip
    await query(
      `INSERT INTO companion_tips_log (user_id, tip_id) VALUES ($1, $2)`,
      [userId, tip.id]
    );

    return reply.send({ data: { tip } });
  });

  // =====================================================
  // MASCOT ASSIST ROUTES (Authenticated)
  // =====================================================

  /**
   * GET /mascot/companion/assist/state
   * Get current mascot assist state (charges, cooldown, ability)
   */
  app.get('/mascot/companion/assist/state', { preHandler: authenticate }, async (request, reply) => {
    const userId = request.user!.userId;

    try {
      const state = await mascotAssistService.getOrCreateState(userId);

      return reply.send({
        data: {
          chargesRemaining: state.chargesRemaining,
          chargesMax: state.chargesMax,
          lastChargeReset: state.lastChargeReset,
          lastAssistUsed: state.lastAssistUsed,
          totalAssistsUsed: state.totalAssistsUsed,
          exercisesAssistedToday: state.exercisesAssistedToday,
          canUseAssist: state.canUseAssist,
          cooldownEndsAt: state.cooldownEndsAt,
          companionStage: state.companionStage,
          userRankTier: state.userRankTier,
          ability: state.currentAbility ? {
            id: state.currentAbility.abilityId,
            name: state.currentAbility.abilityName,
            maxExercises: state.currentAbility.maxExercises,
            dailyCharges: state.currentAbility.dailyCharges,
            cooldownHours: state.currentAbility.cooldownHours,
          } : null,
        },
      });
    } catch (error) {
      log.error({ error, userId }, 'Failed to get mascot assist state');
      return reply.status(500).send({
        error: { code: 'INTERNAL_ERROR', message: 'Failed to get assist state', statusCode: 500 },
      });
    }
  });

  /**
   * POST /mascot/companion/assist/use
   * Use mascot assist to complete an exercise
   */
  app.post('/mascot/companion/assist/use', { preHandler: authenticate }, async (request, reply) => {
    const userId = request.user!.userId;

    let data;
    try {
      data = useAssistSchema.parse(request.body);
    } catch {
      return reply.status(400).send({
        error: { code: 'VALIDATION', message: 'Invalid assist request', statusCode: 400 },
      });
    }

    try {
      const result = await mascotAssistService.useAssist(userId, data.exerciseId, {
        workoutId: data.workoutId,
        sets: data.sets,
        reps: data.reps,
        weight: data.weight,
        reason: data.reason,
      });

      if (!result.success) {
        const statusCode = result.error === 'NO_CHARGES' ? 429 :
                          result.error === 'COOLDOWN' ? 429 :
                          result.error === 'MAX_EXERCISES' ? 429 :
                          result.error === 'NO_ABILITY' ? 403 :
                          result.error === 'EXERCISE_NOT_FOUND' ? 404 : 400;

        return reply.status(statusCode).send({
          error: {
            code: result.error,
            message: result.message,
            statusCode,
          },
        });
      }

      // Emit companion event for the assist
      await companionEventsService.emit(userId, 'workout_logged', {
        assisted: true,
        exerciseId: data.exerciseId,
        sets: data.sets,
      });

      return reply.send({
        data: {
          success: true,
          assistLogId: result.assistLogId,
          tuAwarded: result.tuAwarded,
          chargesRemaining: result.chargesRemaining,
          message: result.message,
        },
      });
    } catch (error) {
      log.error({ error, userId, exerciseId: data.exerciseId }, 'Failed to use mascot assist');
      return reply.status(500).send({
        error: { code: 'INTERNAL_ERROR', message: 'Failed to use assist', statusCode: 500 },
      });
    }
  });

  /**
   * GET /mascot/companion/assist/history
   * Get mascot assist history
   */
  app.get('/mascot/companion/assist/history', { preHandler: authenticate }, async (request, reply) => {
    const userId = request.user!.userId;
    const { limit, cursor } = request.query as { limit?: string; cursor?: string };

    try {
      const result = await mascotAssistService.getAssistHistory(userId, {
        limit: limit ? parseInt(limit, 10) : undefined,
        cursor,
      });

      return reply.send({
        data: result.entries,
        meta: {
          nextCursor: result.nextCursor,
          hasMore: result.nextCursor !== null,
        },
      });
    } catch (error) {
      log.error({ error, userId }, 'Failed to get assist history');
      return reply.status(500).send({
        error: { code: 'INTERNAL_ERROR', message: 'Failed to get assist history', statusCode: 500 },
      });
    }
  });

  /**
   * GET /mascot/companion/assist/abilities
   * Get all mascot assist abilities and which one user qualifies for
   */
  app.get('/mascot/companion/assist/abilities', { preHandler: authenticate }, async (request, reply) => {
    const userId = request.user!.userId;

    try {
      const state = await mascotAssistService.getOrCreateState(userId);

      const abilities = await queryAll<{
        id: string;
        name: string;
        description: string;
        min_companion_stage: number;
        max_user_rank_tier: number | null;
        max_exercises_per_workout: number;
        daily_charges: number;
        cooldown_hours: number;
        enabled: boolean;
      }>(`SELECT * FROM mascot_assist_abilities WHERE enabled = TRUE ORDER BY min_companion_stage ASC`);

      return reply.send({
        data: {
          currentAbility: state.currentAbility,
          companionStage: state.companionStage,
          userRankTier: state.userRankTier,
          abilities: abilities.map((a) => ({
            id: a.id,
            name: a.name,
            description: a.description,
            minCompanionStage: a.min_companion_stage,
            maxUserRankTier: a.max_user_rank_tier,
            maxExercises: a.max_exercises_per_workout,
            dailyCharges: a.daily_charges,
            cooldownHours: a.cooldown_hours,
            isActive: state.currentAbility?.abilityId === a.id,
            isUnlocked: state.companionStage >= a.min_companion_stage &&
                        (a.max_user_rank_tier === null || state.userRankTier <= a.max_user_rank_tier),
          })),
        },
      });
    } catch (error) {
      log.error({ error, userId }, 'Failed to get assist abilities');
      return reply.status(500).send({
        error: { code: 'INTERNAL_ERROR', message: 'Failed to get abilities', statusCode: 500 },
      });
    }
  });

  // =====================================================
  // MASCOT POWERS ROUTES (Phases 2-6)
  // =====================================================

  /**
   * GET /mascot/companion/powers
   * Get comprehensive mascot powers summary for user
   */
  app.get('/mascot/companion/powers', { preHandler: authenticate }, async (request, reply) => {
    const userId = request.user!.userId;

    try {
      const summary = await mascotPowersService.getPowersSummary(userId);
      return reply.send({ data: summary });
    } catch (error) {
      log.error({ error, userId }, 'Failed to get mascot powers summary');
      return reply.status(500).send({
        error: { code: 'INTERNAL_ERROR', message: 'Failed to get powers', statusCode: 500 },
      });
    }
  });

  /**
   * GET /mascot/companion/powers/all
   * Get all mascot powers (raw from DB function)
   */
  app.get('/mascot/companion/powers/all', { preHandler: authenticate }, async (request, reply) => {
    const userId = request.user!.userId;

    try {
      const powers = await mascotPowersService.getAllPowers(userId);
      return reply.send({ data: powers });
    } catch (error) {
      log.error({ error, userId }, 'Failed to get all mascot powers');
      return reply.status(500).send({
        error: { code: 'INTERNAL_ERROR', message: 'Failed to get powers', statusCode: 500 },
      });
    }
  });

  /**
   * GET /mascot/companion/energy
   * Get current mascot energy
   */
  app.get('/mascot/companion/energy', { preHandler: authenticate }, async (request, reply) => {
    const userId = request.user!.userId;

    try {
      const energy = await mascotPowersService.getEnergy(userId);
      return reply.send({ data: energy });
    } catch (error) {
      log.error({ error, userId }, 'Failed to get mascot energy');
      return reply.status(500).send({
        error: { code: 'INTERNAL_ERROR', message: 'Failed to get energy', statusCode: 500 },
      });
    }
  });

  // =====================================================
  // PHASE 2: CREDIT & ECONOMY ROUTES
  // =====================================================

  /**
   * GET /mascot/companion/bonus
   * Get current bonus multiplier status
   */
  app.get('/mascot/companion/bonus', { preHandler: authenticate }, async (request, reply) => {
    const userId = request.user!.userId;

    try {
      const bonus = await mascotPowersService.getBonusMultiplier(userId);
      return reply.send({ data: bonus });
    } catch (error) {
      log.error({ error, userId }, 'Failed to get bonus multiplier');
      return reply.status(500).send({
        error: { code: 'INTERNAL_ERROR', message: 'Failed to get bonus', statusCode: 500 },
      });
    }
  });

  /**
   * GET /mascot/companion/streak-saver
   * Get streak saver configuration and usage
   */
  app.get('/mascot/companion/streak-saver', { preHandler: authenticate }, async (request, reply) => {
    const userId = request.user!.userId;

    try {
      const streakSaver = await mascotPowersService.getStreakSaverStatus(userId);
      return reply.send({ data: streakSaver });
    } catch (error) {
      log.error({ error, userId }, 'Failed to get streak saver status');
      return reply.status(500).send({
        error: { code: 'INTERNAL_ERROR', message: 'Failed to get streak saver', statusCode: 500 },
      });
    }
  });

  /**
   * POST /mascot/companion/streak-saver/use
   * Use streak saver to protect a streak
   */
  app.post('/mascot/companion/streak-saver/use', { preHandler: authenticate }, async (request, reply) => {
    const userId = request.user!.userId;
    const { streakType, streakValue } = request.body as { streakType: string; streakValue: number };

    if (!streakType || typeof streakValue !== 'number') {
      return reply.status(400).send({
        error: { code: 'VALIDATION', message: 'streakType and streakValue required', statusCode: 400 },
      });
    }

    try {
      const result = await mascotPowersService.saveStreak(
        userId,
        streakType as 'workout_streak' | 'login_streak' | 'goal_streak' | 'challenge_streak',
        streakValue
      );

      if (!result.success) {
        return reply.status(400).send({
          error: { code: result.error, message: 'Failed to save streak', statusCode: 400 },
        });
      }

      return reply.send({ data: { success: true, saveId: result.saveId } });
    } catch (error) {
      log.error({ error, userId }, 'Failed to use streak saver');
      return reply.status(500).send({
        error: { code: 'INTERNAL_ERROR', message: 'Failed to save streak', statusCode: 500 },
      });
    }
  });

  /**
   * GET /mascot/companion/credit-alerts
   * Get active credit alerts
   */
  app.get('/mascot/companion/credit-alerts', { preHandler: authenticate }, async (request, reply) => {
    const userId = request.user!.userId;

    try {
      const alerts = await mascotPowersService.getCreditAlerts(userId);
      return reply.send({ data: alerts });
    } catch (error) {
      log.error({ error, userId }, 'Failed to get credit alerts');
      return reply.status(500).send({
        error: { code: 'INTERNAL_ERROR', message: 'Failed to get alerts', statusCode: 500 },
      });
    }
  });

  /**
   * POST /mascot/companion/credit-alerts/:alertId/dismiss
   * Dismiss a credit alert
   */
  app.post('/mascot/companion/credit-alerts/:alertId/dismiss', { preHandler: authenticate }, async (request, reply) => {
    const userId = request.user!.userId;
    const { alertId } = request.params as { alertId: string };

    try {
      await mascotPowersService.dismissCreditAlert(userId, alertId);
      return reply.send({ data: { success: true } });
    } catch (error) {
      log.error({ error, userId, alertId }, 'Failed to dismiss credit alert');
      return reply.status(500).send({
        error: { code: 'INTERNAL_ERROR', message: 'Failed to dismiss alert', statusCode: 500 },
      });
    }
  });

  // =====================================================
  // PHASE 3: JOURNEY & PROGRESS ROUTES
  // =====================================================

  /**
   * GET /mascot/companion/workout-suggestion
   * Get today's workout suggestion
   */
  app.get('/mascot/companion/workout-suggestion', { preHandler: authenticate }, async (request, reply) => {
    const userId = request.user!.userId;

    try {
      const suggestion = await mascotPowersService.getWorkoutSuggestion(userId);
      return reply.send({ data: suggestion });
    } catch (error) {
      log.error({ error, userId }, 'Failed to get workout suggestion');
      return reply.status(500).send({
        error: { code: 'INTERNAL_ERROR', message: 'Failed to get suggestion', statusCode: 500 },
      });
    }
  });

  /**
   * GET /mascot/companion/recovered-muscles
   * Get recovered muscle groups ready to train
   */
  app.get('/mascot/companion/recovered-muscles', { preHandler: authenticate }, async (request, reply) => {
    const userId = request.user!.userId;

    try {
      const muscles = await mascotPowersService.getRecoveredMuscles(userId);
      return reply.send({ data: muscles });
    } catch (error) {
      log.error({ error, userId }, 'Failed to get recovered muscles');
      return reply.status(500).send({
        error: { code: 'INTERNAL_ERROR', message: 'Failed to get recovery status', statusCode: 500 },
      });
    }
  });

  /**
   * GET /mascot/companion/milestones
   * Get active milestone predictions
   */
  app.get('/mascot/companion/milestones', { preHandler: authenticate }, async (request, reply) => {
    const userId = request.user!.userId;

    try {
      const milestones = await mascotPowersService.getMilestones(userId);
      return reply.send({ data: milestones });
    } catch (error) {
      log.error({ error, userId }, 'Failed to get milestones');
      return reply.status(500).send({
        error: { code: 'INTERNAL_ERROR', message: 'Failed to get milestones', statusCode: 500 },
      });
    }
  });

  // =====================================================
  // PHASE 4: SOCIAL & COMMUNITY ROUTES
  // =====================================================

  /**
   * GET /mascot/companion/social-actions
   * Get pending social actions for mascot to perform
   */
  app.get('/mascot/companion/social-actions', { preHandler: authenticate }, async (request, reply) => {
    const userId = request.user!.userId;

    try {
      const actions = await mascotPowersService.getSocialActions(userId);
      return reply.send({ data: actions });
    } catch (error) {
      log.error({ error, userId }, 'Failed to get social actions');
      return reply.status(500).send({
        error: { code: 'INTERNAL_ERROR', message: 'Failed to get social actions', statusCode: 500 },
      });
    }
  });

  /**
   * GET /mascot/companion/highfive-prefs
   * Get auto-highfive preferences
   */
  app.get('/mascot/companion/highfive-prefs', { preHandler: authenticate }, async (request, reply) => {
    const userId = request.user!.userId;

    try {
      const prefs = await mascotPowersService.getHighfivePrefs(userId);
      return reply.send({ data: prefs });
    } catch (error) {
      log.error({ error, userId }, 'Failed to get highfive prefs');
      return reply.status(500).send({
        error: { code: 'INTERNAL_ERROR', message: 'Failed to get preferences', statusCode: 500 },
      });
    }
  });

  /**
   * PUT /mascot/companion/highfive-prefs
   * Update auto-highfive preferences
   */
  app.put('/mascot/companion/highfive-prefs', { preHandler: authenticate }, async (request, reply) => {
    const userId = request.user!.userId;
    const prefs = request.body as {
      enabled?: boolean;
      closeFriends?: boolean;
      crew?: boolean;
      allFollowing?: boolean;
      dailyLimit?: number;
    };

    try {
      await mascotPowersService.updateHighfivePrefs(userId, prefs);
      const updated = await mascotPowersService.getHighfivePrefs(userId);
      return reply.send({ data: updated });
    } catch (error) {
      log.error({ error, userId }, 'Failed to update highfive prefs');
      return reply.status(500).send({
        error: { code: 'INTERNAL_ERROR', message: 'Failed to update preferences', statusCode: 500 },
      });
    }
  });

  // =====================================================
  // PHASE 5: ACCOUNT & META ROUTES
  // =====================================================

  /**
   * GET /mascot/companion/tutorial
   * Get tutorial progress
   */
  app.get('/mascot/companion/tutorial', { preHandler: authenticate }, async (request, reply) => {
    const userId = request.user!.userId;

    try {
      const status = await mascotPowersService.getTutorialStatus(userId);
      return reply.send({ data: status });
    } catch (error) {
      log.error({ error, userId }, 'Failed to get tutorial status');
      return reply.status(500).send({
        error: { code: 'INTERNAL_ERROR', message: 'Failed to get tutorial', statusCode: 500 },
      });
    }
  });

  /**
   * GET /mascot/companion/data-alerts
   * Get data integrity alerts
   */
  app.get('/mascot/companion/data-alerts', { preHandler: authenticate }, async (request, reply) => {
    const userId = request.user!.userId;

    try {
      const alerts = await mascotPowersService.getDataAlerts(userId);
      const shouldRemindBackup = await mascotPowersService.shouldRemindBackup(userId);
      return reply.send({ data: { alerts, shouldRemindBackup } });
    } catch (error) {
      log.error({ error, userId }, 'Failed to get data alerts');
      return reply.status(500).send({
        error: { code: 'INTERNAL_ERROR', message: 'Failed to get alerts', statusCode: 500 },
      });
    }
  });

  // =====================================================
  // PHASE 6: ADVANCED AI ROUTES
  // =====================================================

  /**
   * GET /mascot/companion/programs
   * Get generated workout programs
   */
  app.get('/mascot/companion/programs', { preHandler: authenticate }, async (request, reply) => {
    const userId = request.user!.userId;

    try {
      const programs = await mascotPowersService.getPrograms(userId);
      return reply.send({ data: programs });
    } catch (error) {
      log.error({ error, userId }, 'Failed to get programs');
      return reply.status(500).send({
        error: { code: 'INTERNAL_ERROR', message: 'Failed to get programs', statusCode: 500 },
      });
    }
  });

  /**
   * GET /mascot/companion/overtraining-alerts
   * Get overtraining/injury prevention alerts
   */
  app.get('/mascot/companion/overtraining-alerts', { preHandler: authenticate }, async (request, reply) => {
    const userId = request.user!.userId;

    try {
      const alerts = await mascotPowersService.getOvertrainingAlerts(userId);
      return reply.send({ data: alerts });
    } catch (error) {
      log.error({ error, userId }, 'Failed to get overtraining alerts');
      return reply.status(500).send({
        error: { code: 'INTERNAL_ERROR', message: 'Failed to get alerts', statusCode: 500 },
      });
    }
  });

  /**
   * GET /mascot/companion/nutrition-hint
   * Get a nutrition hint
   */
  app.get('/mascot/companion/nutrition-hint', { preHandler: authenticate }, async (request, reply) => {
    const userId = request.user!.userId;
    const { timing } = request.query as { timing?: string };

    try {
      const hint = await mascotPowersService.getNutritionHint(userId, timing || 'anytime');
      return reply.send({ data: { hint } });
    } catch (error) {
      log.error({ error, userId }, 'Failed to get nutrition hint');
      return reply.status(500).send({
        error: { code: 'INTERNAL_ERROR', message: 'Failed to get hint', statusCode: 500 },
      });
    }
  });

  // =====================================================
  // MASTER ABILITIES ROUTES
  // =====================================================

  /**
   * GET /mascot/companion/master-abilities
   * Get available master abilities (stage 6 only)
   */
  app.get('/mascot/companion/master-abilities', { preHandler: authenticate }, async (request, reply) => {
    const userId = request.user!.userId;

    try {
      const abilities = await mascotPowersService.getMasterAbilities(userId);
      return reply.send({ data: abilities });
    } catch (error) {
      log.error({ error, userId }, 'Failed to get master abilities');
      return reply.status(500).send({
        error: { code: 'INTERNAL_ERROR', message: 'Failed to get abilities', statusCode: 500 },
      });
    }
  });

  /**
   * POST /mascot/companion/master-abilities/:abilityKey/unlock
   * Unlock a master ability
   */
  app.post('/mascot/companion/master-abilities/:abilityKey/unlock', { preHandler: authenticate }, async (request, reply) => {
    const userId = request.user!.userId;
    const { abilityKey } = request.params as { abilityKey: string };

    try {
      const result = await mascotPowersService.unlockMasterAbility(userId, abilityKey);

      if (!result.success) {
        const statusCode = result.error === 'STAGE_6_REQUIRED' ? 403 :
                          result.error === 'ALREADY_UNLOCKED' ? 409 :
                          result.error === 'ABILITY_NOT_FOUND' ? 404 : 400;
        return reply.status(statusCode).send({
          error: { code: result.error, message: 'Failed to unlock ability', statusCode },
        });
      }

      return reply.send({ data: { success: true } });
    } catch (error) {
      log.error({ error, userId, abilityKey }, 'Failed to unlock master ability');
      return reply.status(500).send({
        error: { code: 'INTERNAL_ERROR', message: 'Failed to unlock ability', statusCode: 500 },
      });
    }
  });

  // =====================================================
  // SPIRIT ANIMAL WARDROBE ROUTES
  // =====================================================

  /**
   * GET /mascot/companion/wardrobe/catalog
   * Browse available cosmetics
   */
  app.get('/mascot/companion/wardrobe/catalog', { preHandler: authenticate }, async (request, reply) => {
    const { category, rarity, maxPrice, purchasableOnly, season } = request.query as {
      category?: string;
      rarity?: string;
      maxPrice?: string;
      purchasableOnly?: string;
      season?: string;
    };

    try {
      const cosmetics = await spiritWardrobeService.getCatalog({
        category,
        rarity,
        maxPrice: maxPrice ? parseInt(maxPrice, 10) : undefined,
        purchasableOnly: purchasableOnly === 'true',
        season,
      });

      return reply.send({ data: cosmetics });
    } catch (error) {
      log.error({ error }, 'Failed to get wardrobe catalog');
      return reply.status(500).send({
        error: { code: 'INTERNAL_ERROR', message: 'Failed to get catalog', statusCode: 500 },
      });
    }
  });

  /**
   * GET /mascot/companion/wardrobe/cosmetic/:idOrKey
   * Get specific cosmetic details
   */
  app.get('/mascot/companion/wardrobe/cosmetic/:idOrKey', { preHandler: authenticate }, async (request, reply) => {
    const { idOrKey } = request.params as { idOrKey: string };

    try {
      const cosmetic = await spiritWardrobeService.getCosmetic(idOrKey);

      if (!cosmetic) {
        return reply.status(404).send({
          error: { code: 'NOT_FOUND', message: 'Cosmetic not found', statusCode: 404 },
        });
      }

      return reply.send({ data: cosmetic });
    } catch (error) {
      log.error({ error, idOrKey }, 'Failed to get cosmetic');
      return reply.status(500).send({
        error: { code: 'INTERNAL_ERROR', message: 'Failed to get cosmetic', statusCode: 500 },
      });
    }
  });

  /**
   * GET /mascot/companion/wardrobe/collection
   * Get user's owned cosmetics
   */
  app.get('/mascot/companion/wardrobe/collection', { preHandler: authenticate }, async (request, reply) => {
    const userId = request.user!.userId;
    const { category } = request.query as { category?: string };

    try {
      const collection = await spiritWardrobeService.getUserCollection(userId, category);
      return reply.send({ data: collection });
    } catch (error) {
      log.error({ error, userId }, 'Failed to get wardrobe collection');
      return reply.status(500).send({
        error: { code: 'INTERNAL_ERROR', message: 'Failed to get collection', statusCode: 500 },
      });
    }
  });

  /**
   * POST /mascot/companion/wardrobe/purchase/:cosmeticId
   * Purchase a cosmetic
   */
  app.post('/mascot/companion/wardrobe/purchase/:cosmeticId', { preHandler: authenticate }, async (request, reply) => {
    const userId = request.user!.userId;
    const { cosmeticId } = request.params as { cosmeticId: string };
    const { discountPercent = 0 } = request.body as { discountPercent?: number };

    try {
      const result = await spiritWardrobeService.purchaseCosmetic(userId, cosmeticId, discountPercent);

      if (!result.success) {
        const statusCode = result.error === 'Insufficient credits' ? 402 :
                          result.error === 'Cosmetic not found' ? 404 : 400;
        return reply.status(statusCode).send({
          error: { code: 'PURCHASE_FAILED', message: result.error, statusCode },
        });
      }

      return reply.send({
        data: {
          success: true,
          cosmetic: result.cosmetic,
          creditsSpent: result.creditsSpent,
          newBalance: result.newBalance,
        },
      });
    } catch (error) {
      log.error({ error, userId, cosmeticId }, 'Failed to purchase cosmetic');
      return reply.status(500).send({
        error: { code: 'INTERNAL_ERROR', message: 'Failed to purchase', statusCode: 500 },
      });
    }
  });

  /**
   * POST /mascot/companion/wardrobe/gift
   * Gift a cosmetic to another user
   */
  app.post('/mascot/companion/wardrobe/gift', { preHandler: authenticate }, async (request, reply) => {
    const userId = request.user!.userId;
    const { toUserId, cosmeticId, message } = request.body as {
      toUserId: string;
      cosmeticId: string;
      message?: string;
    };

    if (!toUserId || !cosmeticId) {
      return reply.status(400).send({
        error: { code: 'VALIDATION', message: 'toUserId and cosmeticId required', statusCode: 400 },
      });
    }

    try {
      const result = await spiritWardrobeService.giftCosmetic(userId, toUserId, cosmeticId, message);

      if (!result.success) {
        const statusCode = result.error === 'Insufficient credits' ? 402 :
                          result.error === 'Cosmetic not found' ? 404 : 400;
        return reply.status(statusCode).send({
          error: { code: 'GIFT_FAILED', message: result.error, statusCode },
        });
      }

      return reply.send({
        data: {
          success: true,
          giftId: result.giftId,
          creditsSpent: result.creditsSpent,
        },
      });
    } catch (error) {
      log.error({ error, userId, toUserId, cosmeticId }, 'Failed to gift cosmetic');
      return reply.status(500).send({
        error: { code: 'INTERNAL_ERROR', message: 'Failed to gift', statusCode: 500 },
      });
    }
  });

  /**
   * GET /mascot/companion/wardrobe/loadout
   * Get user's current equipped loadout
   */
  app.get('/mascot/companion/wardrobe/loadout', { preHandler: authenticate }, async (request, reply) => {
    const userId = request.user!.userId;

    try {
      const loadout = await spiritWardrobeService.getLoadout(userId);
      return reply.send({ data: loadout });
    } catch (error) {
      log.error({ error, userId }, 'Failed to get loadout');
      return reply.status(500).send({
        error: { code: 'INTERNAL_ERROR', message: 'Failed to get loadout', statusCode: 500 },
      });
    }
  });

  /**
   * PUT /mascot/companion/wardrobe/loadout
   * Update user's equipped loadout
   */
  app.put('/mascot/companion/wardrobe/loadout', { preHandler: authenticate }, async (request, reply) => {
    const userId = request.user!.userId;
    const updates = request.body as {
      skinId?: string | null;
      eyesId?: string | null;
      outfitId?: string | null;
      headwearId?: string | null;
      footwearId?: string | null;
      accessory1Id?: string | null;
      accessory2Id?: string | null;
      accessory3Id?: string | null;
      auraId?: string | null;
      emoteVictoryId?: string | null;
      emoteIdleId?: string | null;
      backgroundId?: string | null;
    };

    try {
      const result = await spiritWardrobeService.updateLoadout(userId, updates);

      if (!result.success) {
        return reply.status(400).send({
          error: { code: 'LOADOUT_ERROR', message: result.error, statusCode: 400 },
        });
      }

      const loadout = await spiritWardrobeService.getLoadout(userId);
      return reply.send({ data: loadout });
    } catch (error) {
      log.error({ error, userId }, 'Failed to update loadout');
      return reply.status(500).send({
        error: { code: 'INTERNAL_ERROR', message: 'Failed to update loadout', statusCode: 500 },
      });
    }
  });

  /**
   * GET /mascot/companion/wardrobe/shop
   * Get today's shop rotation
   */
  app.get('/mascot/companion/wardrobe/shop', { preHandler: authenticate }, async (request, reply) => {
    const userId = request.user!.userId;

    try {
      const shop = await spiritWardrobeService.getTodaysShop(userId);
      return reply.send({ data: shop });
    } catch (error) {
      log.error({ error, userId }, 'Failed to get shop');
      return reply.status(500).send({
        error: { code: 'INTERNAL_ERROR', message: 'Failed to get shop', statusCode: 500 },
      });
    }
  });

  /**
   * POST /mascot/companion/wardrobe/favorite/:cosmeticId
   * Toggle favorite status on a cosmetic
   */
  app.post('/mascot/companion/wardrobe/favorite/:cosmeticId', { preHandler: authenticate }, async (request, reply) => {
    const userId = request.user!.userId;
    const { cosmeticId } = request.params as { cosmeticId: string };

    try {
      const isFavorite = await spiritWardrobeService.toggleFavorite(userId, cosmeticId);
      return reply.send({ data: { isFavorite } });
    } catch (error) {
      log.error({ error, userId, cosmeticId }, 'Failed to toggle favorite');
      return reply.status(500).send({
        error: { code: 'INTERNAL_ERROR', message: 'Failed to toggle favorite', statusCode: 500 },
      });
    }
  });

  /**
   * POST /mascot/companion/wardrobe/mark-seen
   * Mark cosmetics as seen (removes "new" indicator)
   */
  app.post('/mascot/companion/wardrobe/mark-seen', { preHandler: authenticate }, async (request, reply) => {
    const userId = request.user!.userId;
    const { cosmeticIds } = request.body as { cosmeticIds: string[] };

    if (!cosmeticIds || !Array.isArray(cosmeticIds) || cosmeticIds.length === 0) {
      return reply.status(400).send({
        error: { code: 'VALIDATION', message: 'cosmeticIds array required', statusCode: 400 },
      });
    }

    try {
      await spiritWardrobeService.markAsSeen(userId, cosmeticIds);
      return reply.send({ data: { success: true } });
    } catch (error) {
      log.error({ error, userId }, 'Failed to mark cosmetics as seen');
      return reply.status(500).send({
        error: { code: 'INTERNAL_ERROR', message: 'Failed to mark as seen', statusCode: 500 },
      });
    }
  });

  /**
   * GET /mascot/companion/wardrobe/appearance
   * Get full Spirit Animal appearance (uses DB function)
   */
  app.get('/mascot/companion/wardrobe/appearance', { preHandler: authenticate }, async (request, reply) => {
    const userId = request.user!.userId;

    try {
      const result = await queryOne<{ appearance: Record<string, unknown> }>(
        `SELECT get_spirit_animal_appearance($1) as appearance`,
        [userId]
      );

      return reply.send({ data: result?.appearance || { equipped: {} } });
    } catch (error) {
      log.error({ error, userId }, 'Failed to get Spirit Animal appearance');
      return reply.status(500).send({
        error: { code: 'INTERNAL_ERROR', message: 'Failed to get appearance', statusCode: 500 },
      });
    }
  });

  // =====================================================
  // SPIRIT ANIMAL PRESET ROUTES
  // =====================================================

  /**
   * GET /mascot/companion/wardrobe/presets
   * Get all user's saved presets
   */
  app.get('/mascot/companion/wardrobe/presets', { preHandler: authenticate }, async (request, reply) => {
    const userId = request.user!.userId;

    try {
      const presets = await spiritWardrobeService.getPresets(userId);
      return reply.send({ data: presets });
    } catch (error) {
      log.error({ error, userId }, 'Failed to get presets');
      return reply.status(500).send({
        error: { code: 'INTERNAL_ERROR', message: 'Failed to get presets', statusCode: 500 },
      });
    }
  });

  /**
   * POST /mascot/companion/wardrobe/presets
   * Save current loadout as a preset
   */
  app.post('/mascot/companion/wardrobe/presets', { preHandler: authenticate }, async (request, reply) => {
    const userId = request.user!.userId;
    const { name, icon } = request.body as { name: string; icon?: string };

    if (!name) {
      return reply.status(400).send({
        error: { code: 'VALIDATION', message: 'Preset name required', statusCode: 400 },
      });
    }

    try {
      const result = await spiritWardrobeService.savePreset(userId, name, icon);

      if (!result.success) {
        return reply.status(400).send({
          error: { code: 'SAVE_FAILED', message: result.error, statusCode: 400 },
        });
      }

      return reply.send({ data: { success: true, presetId: result.presetId } });
    } catch (error) {
      log.error({ error, userId }, 'Failed to save preset');
      return reply.status(500).send({
        error: { code: 'INTERNAL_ERROR', message: 'Failed to save preset', statusCode: 500 },
      });
    }
  });

  /**
   * POST /mascot/companion/wardrobe/presets/:presetId/load
   * Load a preset into current loadout
   */
  app.post('/mascot/companion/wardrobe/presets/:presetId/load', { preHandler: authenticate }, async (request, reply) => {
    const userId = request.user!.userId;
    const { presetId } = request.params as { presetId: string };

    try {
      const result = await spiritWardrobeService.loadPreset(userId, presetId);

      if (!result.success) {
        return reply.status(404).send({
          error: { code: 'LOAD_FAILED', message: result.error, statusCode: 404 },
        });
      }

      const loadout = await spiritWardrobeService.getLoadout(userId);
      return reply.send({ data: loadout });
    } catch (error) {
      log.error({ error, userId, presetId }, 'Failed to load preset');
      return reply.status(500).send({
        error: { code: 'INTERNAL_ERROR', message: 'Failed to load preset', statusCode: 500 },
      });
    }
  });

  /**
   * PATCH /mascot/companion/wardrobe/presets/:presetId
   * Rename a preset
   */
  app.patch('/mascot/companion/wardrobe/presets/:presetId', { preHandler: authenticate }, async (request, reply) => {
    const userId = request.user!.userId;
    const { presetId } = request.params as { presetId: string };
    const { name } = request.body as { name: string };

    if (!name) {
      return reply.status(400).send({
        error: { code: 'VALIDATION', message: 'New name required', statusCode: 400 },
      });
    }

    try {
      const result = await spiritWardrobeService.renamePreset(userId, presetId, name);

      if (!result.success) {
        return reply.status(404).send({
          error: { code: 'RENAME_FAILED', message: result.error, statusCode: 404 },
        });
      }

      return reply.send({ data: { success: true } });
    } catch (error) {
      log.error({ error, userId, presetId }, 'Failed to rename preset');
      return reply.status(500).send({
        error: { code: 'INTERNAL_ERROR', message: 'Failed to rename preset', statusCode: 500 },
      });
    }
  });

  /**
   * DELETE /mascot/companion/wardrobe/presets/:presetId
   * Delete a preset
   */
  app.delete('/mascot/companion/wardrobe/presets/:presetId', { preHandler: authenticate }, async (request, reply) => {
    const userId = request.user!.userId;
    const { presetId } = request.params as { presetId: string };

    try {
      const result = await spiritWardrobeService.deletePreset(userId, presetId);

      if (!result.success) {
        return reply.status(404).send({
          error: { code: 'DELETE_FAILED', message: result.error, statusCode: 404 },
        });
      }

      return reply.send({ data: { success: true } });
    } catch (error) {
      log.error({ error, userId, presetId }, 'Failed to delete preset');
      return reply.status(500).send({
        error: { code: 'INTERNAL_ERROR', message: 'Failed to delete preset', statusCode: 500 },
      });
    }
  });
}
