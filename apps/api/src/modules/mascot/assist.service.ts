/**
 * Mascot Assist Service
 *
 * Handles the mascot's ability to complete exercises on behalf of the user.
 * This is a powerful early-game feature that helps new users maintain streaks
 * and earn full credit even when they can't complete all exercises.
 *
 * Key features:
 * - Check if user can use mascot assist
 * - Use assist to complete an exercise
 * - Track daily charge usage
 * - Calculate TU credit for assisted exercises
 */

import { queryOne, queryAll, query } from '../../db/client';
import { loggers } from '../../lib/logger';
import { rankService } from '../ranks';

const log = loggers.economy;

export interface MascotAssistAbility {
  abilityId: string;
  abilityName: string;
  maxExercises: number;
  dailyCharges: number;
  cooldownHours: number;
}

export interface MascotAssistState {
  chargesRemaining: number;
  chargesMax: number;
  lastChargeReset: Date;
  lastAssistUsed: Date | null;
  totalAssistsUsed: number;
  exercisesAssistedToday: number;
  currentAbility: MascotAssistAbility | null;
  canUseAssist: boolean;
  cooldownEndsAt: Date | null;
  companionStage: number;
  userRankTier: number;
}

export interface UseAssistResult {
  success: boolean;
  error?: string;
  assistLogId?: string;
  tuAwarded?: number;
  chargesRemaining?: number;
  message?: string;
}

export interface AssistLogEntry {
  id: string;
  workoutId: string | null;
  exerciseId: string;
  exerciseName: string | null;
  abilityId: string;
  companionStage: number;
  userRankTier: number;
  setsCompleted: number;
  repsCompleted: number;
  weightUsed: number;
  tuAwarded: number;
  reason: string | null;
  createdAt: Date;
}

export const mascotAssistService = {
  /**
   * Get the current mascot assist ability for a user based on their companion stage and rank
   */
  async getAbilityForUser(userId: string): Promise<MascotAssistAbility | null> {
    const result = await queryOne<{
      ability_id: string;
      ability_name: string;
      max_exercises: number;
      daily_charges: number;
      cooldown_hours: number;
    }>(
      `SELECT * FROM get_mascot_assist_ability($1)`,
      [userId]
    );

    if (!result || !result.ability_id) {
      return null;
    }

    return {
      abilityId: result.ability_id,
      abilityName: result.ability_name,
      maxExercises: result.max_exercises,
      dailyCharges: result.daily_charges,
      cooldownHours: result.cooldown_hours,
    };
  },

  /**
   * Get or create the mascot assist state for a user
   */
  async getOrCreateState(userId: string): Promise<MascotAssistState> {
    // Get current ability
    const ability = await this.getAbilityForUser(userId);

    // Get or create state
    let state = await queryOne<{
      charges_remaining: number;
      charges_max: number;
      last_charge_reset: Date;
      last_assist_used: Date | null;
      total_assists_used: number;
      exercises_assisted_today: number;
    }>(
      `SELECT * FROM user_mascot_assist_state WHERE user_id = $1`,
      [userId]
    );

    if (!state) {
      // Create initial state
      const dailyCharges = ability?.dailyCharges || 1;
      await query(
        `INSERT INTO user_mascot_assist_state
         (user_id, charges_remaining, charges_max)
         VALUES ($1, $2, $2)
         ON CONFLICT (user_id) DO NOTHING`,
        [userId, dailyCharges]
      );

      state = await queryOne(
        `SELECT * FROM user_mascot_assist_state WHERE user_id = $1`,
        [userId]
      );
    }

    if (!state) {
      throw new Error(`Failed to create mascot assist state for user ${userId}`);
    }

    // Check if charges need to be reset (24 hours since last reset)
    const now = new Date();
    const hoursSinceReset = (now.getTime() - new Date(state.last_charge_reset).getTime()) / (1000 * 60 * 60);

    if (hoursSinceReset >= 24 && ability) {
      // Reset charges
      await query(
        `UPDATE user_mascot_assist_state
         SET charges_remaining = $1, charges_max = $1, exercises_assisted_today = 0,
             last_charge_reset = NOW(), updated_at = NOW()
         WHERE user_id = $2`,
        [ability.dailyCharges, userId]
      );

      state.charges_remaining = ability.dailyCharges;
      state.charges_max = ability.dailyCharges;
      state.exercises_assisted_today = 0;
      state.last_charge_reset = now;
    }

    // Get companion stage and user rank
    const companionData = await queryOne<{ stage: number }>(
      `SELECT stage FROM user_companion_state WHERE user_id = $1`,
      [userId]
    );
    const companionStage = companionData?.stage || 1;

    const userData = await queryOne<{ current_rank: string }>(
      `SELECT current_rank FROM users WHERE id = $1`,
      [userId]
    );

    // Map rank name to tier
    const rankInfo = await rankService.getRankByName(userData?.current_rank as any || 'novice');
    const userRankTier = rankInfo?.tier || 1;

    // Calculate cooldown end time
    let cooldownEndsAt: Date | null = null;
    let canUseAssist = state.charges_remaining > 0;

    if (ability && ability.cooldownHours > 0 && state.last_assist_used) {
      const cooldownEnd = new Date(state.last_assist_used);
      cooldownEnd.setHours(cooldownEnd.getHours() + ability.cooldownHours);

      if (now < cooldownEnd) {
        cooldownEndsAt = cooldownEnd;
        canUseAssist = false;
      }
    }

    // Also check if max exercises for today reached
    if (ability && state.exercises_assisted_today >= ability.maxExercises) {
      canUseAssist = false;
    }

    return {
      chargesRemaining: state.charges_remaining,
      chargesMax: state.charges_max,
      lastChargeReset: state.last_charge_reset,
      lastAssistUsed: state.last_assist_used,
      totalAssistsUsed: state.total_assists_used,
      exercisesAssistedToday: state.exercises_assisted_today,
      currentAbility: ability,
      canUseAssist,
      cooldownEndsAt,
      companionStage,
      userRankTier,
    };
  },

  /**
   * Use mascot assist to complete an exercise
   */
  async useAssist(
    userId: string,
    exerciseId: string,
    options: {
      workoutId?: string;
      sets?: number;
      reps?: number;
      weight?: number;
      reason?: string;
    } = {}
  ): Promise<UseAssistResult> {
    const state = await this.getOrCreateState(userId);

    // Check if user can use assist
    if (!state.currentAbility) {
      return {
        success: false,
        error: 'NO_ABILITY',
        message: 'Your companion cannot assist with exercises yet. Keep training together!',
      };
    }

    if (state.chargesRemaining <= 0) {
      return {
        success: false,
        error: 'NO_CHARGES',
        message: 'Your companion is tired and needs to rest. Charges reset daily.',
      };
    }

    if (state.cooldownEndsAt) {
      const minutesRemaining = Math.ceil((state.cooldownEndsAt.getTime() - Date.now()) / (1000 * 60));
      return {
        success: false,
        error: 'COOLDOWN',
        message: `Your companion needs ${minutesRemaining} more minutes to recover.`,
      };
    }

    if (state.exercisesAssistedToday >= state.currentAbility.maxExercises) {
      return {
        success: false,
        error: 'MAX_EXERCISES',
        message: `Your companion can only assist with ${state.currentAbility.maxExercises} exercise(s) per workout.`,
      };
    }

    // Get exercise details for name and TU calculation
    const exercise = await queryOne<{ id: string; name: string }>(
      `SELECT id, name FROM exercises WHERE id = $1`,
      [exerciseId]
    );

    if (!exercise) {
      return {
        success: false,
        error: 'EXERCISE_NOT_FOUND',
        message: 'Exercise not found.',
      };
    }

    // Calculate TU for the assisted exercise
    // Get exercise activations
    const activations = await queryAll<{ muscle_id: string; activation: number }>(
      `SELECT muscle_id, activation FROM exercise_activations WHERE exercise_id = $1`,
      [exerciseId]
    );

    // Simple TU calculation: sum of activations * sets
    const sets = options.sets || 1;
    const baseTU = activations.reduce((sum, a) => sum + a.activation, 0);
    const tuAwarded = baseTU * sets;

    // Insert assist log
    const logResult = await queryOne<{ id: string }>(
      `INSERT INTO mascot_assist_log
       (user_id, workout_id, exercise_id, exercise_name, ability_id,
        companion_stage, user_rank_tier, sets_completed, reps_completed,
        weight_used, tu_awarded, reason)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
       RETURNING id`,
      [
        userId,
        options.workoutId || null,
        exerciseId,
        exercise.name,
        state.currentAbility.abilityId,
        state.companionStage,
        state.userRankTier,
        sets,
        options.reps || 0,
        options.weight || 0,
        tuAwarded,
        options.reason || null,
      ]
    );

    // Update user state
    await query(
      `UPDATE user_mascot_assist_state
       SET charges_remaining = charges_remaining - 1,
           last_assist_used = NOW(),
           total_assists_used = total_assists_used + 1,
           exercises_assisted_today = exercises_assisted_today + 1,
           updated_at = NOW()
       WHERE user_id = $1`,
      [userId]
    );

    log.info({
      userId,
      exerciseId,
      exerciseName: exercise.name,
      tuAwarded,
      sets,
      ability: state.currentAbility.abilityName,
    }, 'Mascot assist used');

    return {
      success: true,
      assistLogId: logResult?.id,
      tuAwarded,
      chargesRemaining: state.chargesRemaining - 1,
      message: `Your ${getCompanionName(state.companionStage)} completed ${sets} set(s) of ${exercise.name} for you!`,
    };
  },

  /**
   * Get assist history for a user
   */
  async getAssistHistory(
    userId: string,
    options: { limit?: number; cursor?: string } = {}
  ): Promise<{ entries: AssistLogEntry[]; nextCursor: string | null }> {
    const limit = Math.min(options.limit || 50, 100);

    let sql: string;
    let params: unknown[];

    if (options.cursor) {
      const [createdAt, id] = options.cursor.split(':');
      sql = `SELECT * FROM mascot_assist_log
             WHERE user_id = $1 AND (created_at, id) < ($2, $3)
             ORDER BY created_at DESC, id DESC
             LIMIT $4`;
      params = [userId, createdAt, id, limit];
    } else {
      sql = `SELECT * FROM mascot_assist_log
             WHERE user_id = $1
             ORDER BY created_at DESC, id DESC
             LIMIT $2`;
      params = [userId, limit];
    }

    const rows = await queryAll<{
      id: string;
      workout_id: string | null;
      exercise_id: string;
      exercise_name: string | null;
      ability_id: string;
      companion_stage: number;
      user_rank_tier: number;
      sets_completed: number;
      reps_completed: number;
      weight_used: number;
      tu_awarded: number;
      reason: string | null;
      created_at: Date;
    }>(sql, params);

    const entries: AssistLogEntry[] = rows.map((r) => ({
      id: r.id,
      workoutId: r.workout_id,
      exerciseId: r.exercise_id,
      exerciseName: r.exercise_name,
      abilityId: r.ability_id,
      companionStage: r.companion_stage,
      userRankTier: r.user_rank_tier,
      setsCompleted: r.sets_completed,
      repsCompleted: r.reps_completed,
      weightUsed: Number(r.weight_used),
      tuAwarded: Number(r.tu_awarded),
      reason: r.reason,
      createdAt: r.created_at,
    }));

    const lastEntry = entries[entries.length - 1];
    const nextCursor = lastEntry
      ? `${lastEntry.createdAt.toISOString()}:${lastEntry.id}`
      : null;

    return { entries, nextCursor };
  },

  /**
   * Check if a specific exercise in a workout was assisted
   */
  async wasExerciseAssisted(
    userId: string,
    workoutId: string,
    exerciseId: string
  ): Promise<boolean> {
    const result = await queryOne<{ count: string }>(
      `SELECT COUNT(*) as count FROM mascot_assist_log
       WHERE user_id = $1 AND workout_id = $2 AND exercise_id = $3`,
      [userId, workoutId, exerciseId]
    );

    return parseInt(result?.count || '0') > 0;
  },

  /**
   * Get all assisted exercises for a workout
   */
  async getAssistedExercises(workoutId: string): Promise<string[]> {
    const rows = await queryAll<{ exercise_id: string }>(
      `SELECT exercise_id FROM mascot_assist_log WHERE workout_id = $1`,
      [workoutId]
    );

    return rows.map((r) => r.exercise_id);
  },

  /**
   * Reset daily charges for all users (called by cron job)
   */
  async resetDailyCharges(): Promise<{ updated: number }> {
    const result = await queryOne<{ updated: number }>(
      `SELECT reset_mascot_daily_charges() as updated`
    );

    const updated = result?.updated || 0;
    log.info({ updated }, 'Daily mascot charges reset');
    return { updated };
  },
};

/**
 * Get a friendly name for the companion based on stage
 */
function getCompanionName(stage: number): string {
  const names: Record<number, string> = {
    1: 'companion',
    2: 'training buddy',
    3: 'dedicated spotter',
    4: 'power partner',
    5: 'elite ally',
    6: 'perfect partner',
  };
  return names[stage] || 'companion';
}

export default mascotAssistService;
