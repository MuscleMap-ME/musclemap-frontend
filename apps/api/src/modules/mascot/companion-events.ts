/**
 * Companion Events Service
 *
 * Handles companion XP/stage progression and event emission.
 * Integrates with the economy service for training unit rewards.
 */

import { queryOne, query } from '../../db/client';
import { economyService } from '../economy';
import { loggers } from '../../lib/logger';

const log = loggers.db;

// Stage XP thresholds (cumulative)
export const STAGE_THRESHOLDS = [0, 100, 500, 1500, 4000, 10000];

// XP rewards by event type
export const XP_REWARDS: Record<string, number> = {
  workout_logged: 10,
  streak_hit: 25,
  pr_set: 50,
  goal_progress: 15,
  group_joined: 20,
  contribution: 30,
  stage_evolved: 0, // No XP for evolution itself
  upgrade_purchased: 5,
};

// Training unit rewards by event type
export const UNIT_REWARDS: Record<string, number> = {
  workout_logged: 5,
  streak_hit: 15,
  pr_set: 25,
  goal_progress: 10,
  group_joined: 10,
  contribution: 20,
  stage_evolved: 50, // Bonus units on evolution
  upgrade_purchased: 0,
};

/**
 * Calculate stage from XP
 */
function calculateStage(xp: number): number {
  let stage = 1;
  for (let i = 1; i < STAGE_THRESHOLDS.length; i++) {
    if (xp >= STAGE_THRESHOLDS[i]) {
      stage = i + 1;
    } else {
      break;
    }
  }
  return Math.min(stage, 6);
}

export const companionEventsService = {
  /**
   * Emit a companion event and handle XP/unit rewards
   */
  async emit(
    userId: string,
    eventType: string,
    eventData: Record<string, unknown> = {}
  ): Promise<{ xp: number; units: number; newStage?: number; evolved?: boolean }> {
    const xp = XP_REWARDS[eventType] || 0;
    const units = UNIT_REWARDS[eventType] || 0;

    // Insert the event
    await query(
      `INSERT INTO companion_events (user_id, event_type, event_data, xp_awarded, units_awarded)
       VALUES ($1, $2, $3, $4, $5)`,
      [userId, eventType, JSON.stringify(eventData), xp, units]
    );

    let newStage: number | undefined;
    let evolved = false;

    // Award XP if applicable
    if (xp > 0) {
      const state = await queryOne<{ xp: number; stage: number }>(
        `SELECT xp, stage FROM user_companion_state WHERE user_id = $1`,
        [userId]
      );

      if (state) {
        const newXp = state.xp + xp;
        const calculatedStage = calculateStage(newXp);

        await query(
          `UPDATE user_companion_state
           SET xp = $1, stage = $2, updated_at = NOW()
           WHERE user_id = $3`,
          [newXp, calculatedStage, userId]
        );

        // Check for stage evolution
        if (calculatedStage > state.stage) {
          newStage = calculatedStage;
          evolved = true;

          log.info('Companion evolved', {
            userId,
            fromStage: state.stage,
            toStage: calculatedStage,
            xp: newXp,
          });

          // Emit evolution event (recursive, but with no XP to prevent loops)
          await this.emit(userId, 'stage_evolved', {
            from: state.stage,
            to: calculatedStage,
          });
        }
      }
    }

    // Award training units if applicable
    if (units > 0) {
      await economyService.addCredits(
        userId,
        units,
        `companion_${eventType}`,
        { eventType, ...eventData }
      );
    }

    return { xp, units, newStage, evolved };
  },

  /**
   * Get or initialize companion state for a user
   */
  async getOrCreateState(userId: string): Promise<{
    id: string;
    user_id: string;
    template_id: string;
    nickname: string | null;
    stage: number;
    xp: number;
    unlocked_upgrades: string[];
    equipped_cosmetics: Record<string, string>;
    abilities: string[];
    is_visible: boolean;
    is_minimized: boolean;
    sounds_enabled: boolean;
    tips_enabled: boolean;
    created_at: Date;
    updated_at: Date;
  }> {
    let state = await queryOne<{
      id: string;
      user_id: string;
      template_id: string;
      nickname: string | null;
      stage: number;
      xp: number;
      unlocked_upgrades: string;
      equipped_cosmetics: string;
      abilities: string;
      is_visible: boolean;
      is_minimized: boolean;
      sounds_enabled: boolean;
      tips_enabled: boolean;
      created_at: Date;
      updated_at: Date;
    }>(`SELECT * FROM user_companion_state WHERE user_id = $1`, [userId]);

    if (!state) {
      // Create initial state
      await query(
        `INSERT INTO user_companion_state (user_id) VALUES ($1)
         ON CONFLICT (user_id) DO NOTHING`,
        [userId]
      );

      state = await queryOne(`SELECT * FROM user_companion_state WHERE user_id = $1`, [userId]);
    }

    if (!state) {
      throw new Error(`Failed to create companion state for user ${userId}`);
    }

    // Note: PostgreSQL returns JSONB columns as already-parsed objects
    // so we don't need JSON.parse here - just ensure defaults
    return {
      ...state,
      unlocked_upgrades: (state.unlocked_upgrades as unknown as string[]) || [],
      equipped_cosmetics: (state.equipped_cosmetics as unknown as Record<string, string>) || {},
      abilities: (state.abilities as unknown as string[]) || [],
    };
  },

  /**
   * Calculate progression info for a companion
   */
  calculateProgression(xp: number, stage: number): {
    currentXp: number;
    prevStageXp: number;
    nextStageXp: number;
    progressPercent: number;
    isMaxStage: boolean;
  } {
    const prevXp = STAGE_THRESHOLDS[stage - 1] || 0;
    const nextXp = STAGE_THRESHOLDS[stage] || Infinity;
    const isMaxStage = stage >= 6;

    const progressPercent = isMaxStage
      ? 100
      : ((xp - prevXp) / (nextXp - prevXp)) * 100;

    return {
      currentXp: xp,
      prevStageXp: prevXp,
      nextStageXp: nextXp === Infinity ? prevXp : nextXp,
      progressPercent: Math.min(100, Math.max(0, progressPercent)),
      isMaxStage,
    };
  },

  /**
   * Award a badge upgrade to a user (for achievements)
   */
  async awardBadge(userId: string, badgeId: string): Promise<boolean> {
    const state = await this.getOrCreateState(userId);

    if (state.unlocked_upgrades.includes(badgeId)) {
      return false; // Already has badge
    }

    const unlocked = [...state.unlocked_upgrades, badgeId];

    await query(
      `UPDATE user_companion_state
       SET unlocked_upgrades = $1, updated_at = NOW()
       WHERE user_id = $2`,
      [JSON.stringify(unlocked), userId]
    );

    // Emit event for reaction
    await this.emit(userId, 'badge_awarded', { badgeId });

    return true;
  },
};
