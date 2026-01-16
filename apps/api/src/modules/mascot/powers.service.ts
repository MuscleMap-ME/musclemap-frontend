/**
 * Mascot Powers Service
 *
 * Unified service for all mascot powers across all phases:
 * - Phase 2: Credit Guardian, Streak Saver, Bonus Multiplier
 * - Phase 3: Smart Scheduler, Form Finder, Progress Tracker
 * - Phase 4: Crew Helper, Rivalry Manager, High-Five Helper
 * - Phase 5: Settings Optimizer, Data Guardian, Subscription Assistant
 * - Phase 6: Workout Generator, Injury Prevention, Nutrition Hints
 */

import { queryOne, queryAll, query } from '../../db/client';
import { loggers } from '../../lib/logger';
import { economyService } from '../economy';

const log = loggers.economy;

// =====================================================
// TYPES
// =====================================================

export interface MascotEnergy {
  current: number;
  max: number;
  regenPerHour: number;
}

export interface BonusMultiplier {
  totalMultiplier: number;
  firstWorkoutBonus: number;
  consecutiveBonus: number;
  consecutiveDays: number;
  companionStage: number;
}

export interface StreakSaveConfig {
  weeklySaves: number;
  savesUsed: number;
  savesRemaining: number;
  creditCost: number;
  energyCost: number;
  canSaveAnyStreak: boolean;
}

export interface CreditAlert {
  id: string;
  alertType: string;
  message: string;
  currentBalance: number;
  workoutCost?: number;
  dismissed: boolean;
  createdAt: Date;
}

export interface WorkoutSuggestion {
  id: string;
  suggestedFor: Date;
  suggestionType: string;
  focusMuscles: string[];
  recommendedExercises: string[];
  durationMinutes: number;
  reason: string;
}

export interface MilestoneProgress {
  id: string;
  milestoneType: string;
  milestoneName: string;
  currentValue: number;
  targetValue: number;
  estimatedCompletion: Date | null;
  confidencePercent: number;
}

export interface SocialAction {
  actionType: string;
  targetUserId: string;
  targetUsername: string;
  actionData: Record<string, unknown>;
  priority: number;
}

export interface MascotPowersSummary {
  companionStage: number;
  energy: MascotEnergy;
  phase2: {
    bonusMultiplier: BonusMultiplier;
    streakSaver: StreakSaveConfig;
    creditGuardianFeatures: string[];
  };
  phase3: {
    schedulerLevel: string;
    canSuggestRecovery: boolean;
    canPredictMilestones: boolean;
  };
  phase4: {
    canAutoHighfive: boolean;
    canTrashTalk: boolean;
    canCoordinateCrews: boolean;
  };
  phase5: {
    canDetectAnomalies: boolean;
    canSuggestSettings: boolean;
  };
  phase6: {
    canGeneratePrograms: boolean;
    hasInjuryPrevention: boolean;
    hasNutritionHints: boolean;
  };
  masterAbilities: string[];
}

// =====================================================
// SERVICE
// =====================================================

export const mascotPowersService = {
  // =====================================================
  // ENERGY MANAGEMENT
  // =====================================================

  /**
   * Get current mascot energy (with regeneration applied)
   */
  async getEnergy(userId: string): Promise<MascotEnergy> {
    const result = await queryOne<{ energy: number }>(`
      SELECT regenerate_mascot_energy($1) AS energy
    `, [userId]);

    const state = await queryOne<{
      energy: number;
      max_energy: number;
      energy_regen_rate: number;
      stage: number;
    }>(`
      SELECT energy, max_energy, energy_regen_rate, stage
      FROM user_companion_state
      WHERE user_id = $1
    `, [userId]);

    if (!state) {
      return { current: 100, max: 100, regenPerHour: 10 };
    }

    return {
      current: result?.energy || state.energy,
      max: state.max_energy,
      regenPerHour: state.energy_regen_rate,
    };
  },

  /**
   * Spend mascot energy
   */
  async spendEnergy(userId: string, amount: number): Promise<{ success: boolean; remaining: number }> {
    const energy = await this.getEnergy(userId);

    if (energy.current < amount) {
      return { success: false, remaining: energy.current };
    }

    await query(`
      UPDATE user_companion_state
      SET energy = energy - $1, last_energy_update = NOW()
      WHERE user_id = $2
    `, [amount, userId]);

    return { success: true, remaining: energy.current - amount };
  },

  // =====================================================
  // PHASE 2: CREDIT & ECONOMY
  // =====================================================

  /**
   * Get current bonus multiplier for user
   */
  async getBonusMultiplier(userId: string): Promise<BonusMultiplier> {
    const result = await queryOne<{
      total_multiplier: number;
      first_workout_bonus: number;
      consecutive_bonus: number;
      consecutive_days: number;
      companion_stage: number;
    }>(`SELECT * FROM get_user_bonus_multiplier($1)`, [userId]);

    if (!result) {
      return {
        totalMultiplier: 1.0,
        firstWorkoutBonus: 1.0,
        consecutiveBonus: 0,
        consecutiveDays: 0,
        companionStage: 1,
      };
    }

    return {
      totalMultiplier: Number(result.total_multiplier),
      firstWorkoutBonus: Number(result.first_workout_bonus),
      consecutiveBonus: Number(result.consecutive_bonus),
      consecutiveDays: result.consecutive_days,
      companionStage: result.companion_stage,
    };
  },

  /**
   * Apply bonus to workout TU
   */
  async applyBonus(userId: string, workoutId: string, baseTU: number): Promise<{ bonusTU: number; totalTU: number }> {
    const bonus = await this.getBonusMultiplier(userId);
    const bonusTU = Math.floor(baseTU * (bonus.totalMultiplier - 1));

    if (bonusTU > 0) {
      await query(`
        INSERT INTO mascot_bonus_log
        (user_id, workout_id, bonus_type, base_tu, multiplier, bonus_tu, companion_stage, consecutive_days)
        VALUES ($1, $2, 'first_workout_of_day', $3, $4, $5, $6, $7)
      `, [userId, workoutId, baseTU, bonus.totalMultiplier, bonusTU, bonus.companionStage, bonus.consecutiveDays]);
    }

    // Update streak state
    await query(`
      INSERT INTO user_workout_streak_state (user_id, consecutive_days, last_workout_date, current_multiplier)
      VALUES ($1, 1, CURRENT_DATE, $2)
      ON CONFLICT (user_id) DO UPDATE SET
        consecutive_days = CASE
          WHEN user_workout_streak_state.last_workout_date = CURRENT_DATE - 1
          THEN user_workout_streak_state.consecutive_days + 1
          WHEN user_workout_streak_state.last_workout_date = CURRENT_DATE
          THEN user_workout_streak_state.consecutive_days
          ELSE 1
        END,
        last_workout_date = CURRENT_DATE,
        current_multiplier = $2,
        updated_at = NOW()
    `, [userId, bonus.totalMultiplier]);

    return { bonusTU, totalTU: baseTU + bonusTU };
  },

  /**
   * Get streak saver configuration and usage
   */
  async getStreakSaverStatus(userId: string): Promise<StreakSaveConfig> {
    const stage = await this.getCompanionStage(userId);

    const config = await queryOne<{
      weekly_saves: number;
      credit_cost: number;
      energy_cost: number;
      can_save_any_streak: boolean;
    }>(`
      SELECT * FROM mascot_streak_saver_config
      WHERE min_companion_stage <= $1
      ORDER BY min_companion_stage DESC
      LIMIT 1
    `, [stage]);

    const usage = await queryOne<{
      saves_used_this_week: number;
    }>(`
      SELECT saves_used_this_week FROM user_streak_save_usage
      WHERE user_id = $1
    `, [userId]);

    const savesUsed = usage?.saves_used_this_week || 0;

    return {
      weeklySaves: config?.weekly_saves || 0,
      savesUsed,
      savesRemaining: Math.max(0, (config?.weekly_saves || 0) - savesUsed),
      creditCost: config?.credit_cost || 50,
      energyCost: config?.energy_cost || 10,
      canSaveAnyStreak: config?.can_save_any_streak || false,
    };
  },

  /**
   * Save a streak using mascot power
   */
  async saveStreak(
    userId: string,
    streakType: 'workout_streak' | 'login_streak' | 'goal_streak' | 'challenge_streak',
    streakValue: number
  ): Promise<{ success: boolean; error?: string; saveId?: string }> {
    const config = await this.getStreakSaverStatus(userId);

    if (config.savesRemaining <= 0) {
      return { success: false, error: 'NO_SAVES_REMAINING' };
    }

    if (!config.canSaveAnyStreak && streakType !== 'workout_streak') {
      return { success: false, error: 'CANNOT_SAVE_THIS_STREAK_TYPE' };
    }

    // Check energy
    const energy = await this.getEnergy(userId);
    if (energy.current < config.energyCost) {
      return { success: false, error: 'INSUFFICIENT_ENERGY' };
    }

    const stage = await this.getCompanionStage(userId);

    // Insert streak save record
    const result = await queryOne<{ id: string }>(`
      INSERT INTO mascot_streak_saves
      (user_id, streak_type, streak_value, credits_spent, mascot_energy_used, companion_stage)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id
    `, [userId, streakType, streakValue, config.creditCost, config.energyCost, stage]);

    // Update usage count
    await query(`
      INSERT INTO user_streak_save_usage (user_id, saves_used_this_week)
      VALUES ($1, 1)
      ON CONFLICT (user_id) DO UPDATE SET
        saves_used_this_week = user_streak_save_usage.saves_used_this_week + 1,
        updated_at = NOW()
    `, [userId]);

    // Spend energy
    await this.spendEnergy(userId, config.energyCost);

    log.info({ userId, streakType, streakValue }, 'Streak saved by mascot');

    return { success: true, saveId: result?.id };
  },

  /**
   * Get active credit alerts for user
   */
  async getCreditAlerts(userId: string): Promise<CreditAlert[]> {
    const alerts = await queryAll<{
      id: string;
      alert_type: string;
      message: string;
      current_balance: number;
      workout_cost: number;
      dismissed: boolean;
      created_at: Date;
    }>(`
      SELECT * FROM mascot_credit_alerts
      WHERE user_id = $1 AND dismissed = FALSE
      ORDER BY created_at DESC
      LIMIT 10
    `, [userId]);

    return alerts.map(a => ({
      id: a.id,
      alertType: a.alert_type,
      message: a.message || '',
      currentBalance: a.current_balance,
      workoutCost: a.workout_cost,
      dismissed: a.dismissed,
      createdAt: a.created_at,
    }));
  },

  /**
   * Create a credit alert
   */
  async createCreditAlert(
    userId: string,
    alertType: string,
    currentBalance: number,
    workoutCost?: number,
    message?: string
  ): Promise<void> {
    await query(`
      INSERT INTO mascot_credit_alerts
      (user_id, alert_type, current_balance, workout_cost, message)
      VALUES ($1, $2, $3, $4, $5)
    `, [userId, alertType, currentBalance, workoutCost || null, message || null]);
  },

  /**
   * Dismiss a credit alert
   */
  async dismissCreditAlert(userId: string, alertId: string): Promise<void> {
    await query(`
      UPDATE mascot_credit_alerts
      SET dismissed = TRUE, dismissed_at = NOW()
      WHERE id = $1 AND user_id = $2
    `, [alertId, userId]);
  },

  // =====================================================
  // PHASE 3: JOURNEY & PROGRESS
  // =====================================================

  /**
   * Get today's workout suggestion
   */
  async getWorkoutSuggestion(userId: string): Promise<WorkoutSuggestion | null> {
    const result = await queryOne<{
      suggestion_id: string;
      suggested_for: Date;
      focus_muscles: string[];
      exercises: string[];
      duration_minutes: number;
      reason: string;
    }>(`SELECT * FROM get_mascot_workout_suggestion($1)`, [userId]);

    if (!result || !result.suggestion_id) {
      return null;
    }

    return {
      id: result.suggestion_id,
      suggestedFor: result.suggested_for,
      suggestionType: 'recovery_based',
      focusMuscles: result.focus_muscles || [],
      recommendedExercises: result.exercises || [],
      durationMinutes: result.duration_minutes,
      reason: result.reason,
    };
  },

  /**
   * Get recovered muscle groups
   */
  async getRecoveredMuscles(userId: string): Promise<{ muscleGroup: string; hoursSinceRecovery: number }[]> {
    const results = await queryAll<{
      muscle_group: string;
      hours_since_recovery: number;
    }>(`SELECT * FROM get_recovered_muscles($1)`, [userId]);

    return results.map(r => ({
      muscleGroup: r.muscle_group,
      hoursSinceRecovery: Number(r.hours_since_recovery),
    }));
  },

  /**
   * Update muscle recovery after workout
   */
  async updateMuscleRecovery(
    userId: string,
    muscleGroup: string,
    volume: number,
    intensity: number
  ): Promise<void> {
    await query(`SELECT update_muscle_recovery($1, $2, $3, $4)`, [userId, muscleGroup, volume, intensity]);
  },

  /**
   * Get active milestone predictions
   */
  async getMilestones(userId: string): Promise<MilestoneProgress[]> {
    const results = await queryAll<{
      id: string;
      milestone_type: string;
      milestone_name: string;
      current_value: number;
      target_value: number;
      estimated_completion: Date | null;
      confidence_percent: number;
    }>(`
      SELECT * FROM mascot_milestone_predictions
      WHERE user_id = $1 AND achieved = FALSE
      ORDER BY estimated_completion ASC NULLS LAST
      LIMIT 10
    `, [userId]);

    return results.map(r => ({
      id: r.id,
      milestoneType: r.milestone_type,
      milestoneName: r.milestone_name,
      currentValue: Number(r.current_value),
      targetValue: Number(r.target_value),
      estimatedCompletion: r.estimated_completion,
      confidencePercent: r.confidence_percent,
    }));
  },

  /**
   * Record a celebration
   */
  async recordCelebration(
    userId: string,
    celebrationType: string,
    title: string,
    valueAchieved?: number,
    previousValue?: number
  ): Promise<string> {
    const stage = await this.getCompanionStage(userId);

    const result = await queryOne<{ id: string }>(`
      INSERT INTO mascot_celebrations
      (user_id, celebration_type, title, value_achieved, previous_value, companion_stage)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id
    `, [userId, celebrationType, title, valueAchieved, previousValue, stage]);

    return result?.id || '';
  },

  // =====================================================
  // PHASE 4: SOCIAL & COMMUNITY
  // =====================================================

  /**
   * Get pending social actions
   */
  async getSocialActions(userId: string): Promise<SocialAction[]> {
    const results = await queryAll<{
      action_type: string;
      target_user_id: string;
      target_username: string;
      action_data: Record<string, unknown>;
      priority: number;
    }>(`SELECT * FROM get_mascot_social_actions($1)`, [userId]);

    return results.map(r => ({
      actionType: r.action_type,
      targetUserId: r.target_user_id,
      targetUsername: r.target_username,
      actionData: r.action_data,
      priority: r.priority,
    }));
  },

  /**
   * Get auto-highfive preferences
   */
  async getHighfivePrefs(userId: string): Promise<{
    enabled: boolean;
    closeFriends: boolean;
    crew: boolean;
    allFollowing: boolean;
    dailyLimit: number;
    usedToday: number;
  }> {
    const prefs = await queryOne<{
      auto_highfive_enabled: boolean;
      auto_highfive_close_friends: boolean;
      auto_highfive_crew: boolean;
      auto_highfive_all_following: boolean;
      daily_limit: number;
    }>(`
      SELECT * FROM mascot_highfive_prefs WHERE user_id = $1
    `, [userId]);

    const usedToday = await queryOne<{ count: number }>(`
      SELECT count_auto_highfives_today($1) AS count
    `, [userId]);

    return {
      enabled: prefs?.auto_highfive_enabled || false,
      closeFriends: prefs?.auto_highfive_close_friends || true,
      crew: prefs?.auto_highfive_crew || true,
      allFollowing: prefs?.auto_highfive_all_following || false,
      dailyLimit: prefs?.daily_limit || 50,
      usedToday: usedToday?.count || 0,
    };
  },

  /**
   * Update auto-highfive preferences
   */
  async updateHighfivePrefs(userId: string, prefs: {
    enabled?: boolean;
    closeFriends?: boolean;
    crew?: boolean;
    allFollowing?: boolean;
    dailyLimit?: number;
  }): Promise<void> {
    await query(`
      INSERT INTO mascot_highfive_prefs (user_id, auto_highfive_enabled, auto_highfive_close_friends, auto_highfive_crew, auto_highfive_all_following, daily_limit)
      VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (user_id) DO UPDATE SET
        auto_highfive_enabled = COALESCE($2, mascot_highfive_prefs.auto_highfive_enabled),
        auto_highfive_close_friends = COALESCE($3, mascot_highfive_prefs.auto_highfive_close_friends),
        auto_highfive_crew = COALESCE($4, mascot_highfive_prefs.auto_highfive_crew),
        auto_highfive_all_following = COALESCE($5, mascot_highfive_prefs.auto_highfive_all_following),
        daily_limit = COALESCE($6, mascot_highfive_prefs.daily_limit),
        updated_at = NOW()
    `, [userId, prefs.enabled, prefs.closeFriends, prefs.crew, prefs.allFollowing, prefs.dailyLimit]);
  },

  /**
   * Get trash talk message for rivalry
   */
  async getTrashTalk(context: string, variables: Record<string, string | number>): Promise<string | null> {
    const template = await queryOne<{ message_template: string }>(`
      SELECT message_template FROM mascot_trash_talk
      WHERE context = $1 AND enabled = TRUE
      ORDER BY RANDOM()
      LIMIT 1
    `, [context]);

    if (!template) return null;

    let message = template.message_template;
    for (const [key, value] of Object.entries(variables)) {
      message = message.replace(`{${key}}`, String(value));
    }

    return message;
  },

  // =====================================================
  // PHASE 5: ACCOUNT & META
  // =====================================================

  /**
   * Get tutorial status
   */
  async getTutorialStatus(userId: string): Promise<{
    complete: boolean;
    currentStep: string;
    completedCount: number;
    nextHint: string | null;
  }> {
    const result = await queryOne<{
      onboarding_complete: boolean;
      current_step: string;
      completed_count: number;
      next_hint: string | null;
    }>(`SELECT * FROM get_tutorial_status($1)`, [userId]);

    return {
      complete: result?.onboarding_complete || false,
      currentStep: result?.current_step || 'welcome',
      completedCount: result?.completed_count || 0,
      nextHint: result?.next_hint || null,
    };
  },

  /**
   * Check if backup reminder should be shown
   */
  async shouldRemindBackup(userId: string): Promise<boolean> {
    const result = await queryOne<{ should_remind_backup: boolean }>(`
      SELECT should_remind_backup($1) AS should_remind_backup
    `, [userId]);

    return result?.should_remind_backup || false;
  },

  /**
   * Get data alerts
   */
  async getDataAlerts(userId: string): Promise<{
    id: string;
    alertType: string;
    severity: string;
    title: string;
    description: string | null;
    suggestedAction: string | null;
  }[]> {
    const results = await queryAll<{
      id: string;
      alert_type: string;
      severity: string;
      title: string;
      description: string | null;
      suggested_action: string | null;
    }>(`
      SELECT * FROM mascot_data_alerts
      WHERE user_id = $1 AND resolved = FALSE
      ORDER BY
        CASE severity WHEN 'critical' THEN 0 WHEN 'warning' THEN 1 ELSE 2 END,
        created_at DESC
      LIMIT 10
    `, [userId]);

    return results.map(r => ({
      id: r.id,
      alertType: r.alert_type,
      severity: r.severity,
      title: r.title,
      description: r.description,
      suggestedAction: r.suggested_action,
    }));
  },

  // =====================================================
  // PHASE 6: ADVANCED AI
  // =====================================================

  /**
   * Get generated programs
   */
  async getPrograms(userId: string): Promise<{
    id: string;
    name: string;
    type: string;
    durationWeeks: number;
    status: string;
    startedAt: Date | null;
  }[]> {
    const results = await queryAll<{
      id: string;
      program_name: string;
      program_type: string;
      duration_weeks: number;
      status: string;
      started_at: Date | null;
    }>(`
      SELECT id, program_name, program_type, duration_weeks, status, started_at
      FROM mascot_generated_programs
      WHERE user_id = $1
      ORDER BY created_at DESC
      LIMIT 10
    `, [userId]);

    return results.map(r => ({
      id: r.id,
      name: r.program_name,
      type: r.program_type,
      durationWeeks: r.duration_weeks,
      status: r.status,
      startedAt: r.started_at,
    }));
  },

  /**
   * Get overtraining alerts
   */
  async getOvertrainingAlerts(userId: string): Promise<{
    id: string;
    alertType: string;
    affectedArea: string;
    riskLevel: string;
    recommendation: string | null;
  }[]> {
    const results = await queryAll<{
      id: string;
      alert_type: string;
      affected_area: string;
      risk_level: string;
      recommendation: string | null;
    }>(`
      SELECT * FROM mascot_overtraining_alerts
      WHERE user_id = $1 AND acknowledged = FALSE
      ORDER BY
        CASE risk_level WHEN 'critical' THEN 0 WHEN 'high' THEN 1 WHEN 'medium' THEN 2 ELSE 3 END,
        created_at DESC
      LIMIT 5
    `, [userId]);

    return results.map(r => ({
      id: r.id,
      alertType: r.alert_type,
      affectedArea: r.affected_area || '',
      riskLevel: r.risk_level,
      recommendation: r.recommendation,
    }));
  },

  /**
   * Get nutrition hint
   */
  async getNutritionHint(userId: string, timing: string): Promise<string | null> {
    const stage = await this.getCompanionStage(userId);

    const template = await queryOne<{ template: string }>(`
      SELECT template FROM mascot_nutrition_templates
      WHERE timing = $1 AND min_companion_stage <= $2 AND enabled = TRUE
      ORDER BY RANDOM()
      LIMIT 1
    `, [timing, stage]);

    return template?.template || null;
  },

  // =====================================================
  // MASTER ABILITIES (Stage 6)
  // =====================================================

  /**
   * Get master abilities for user
   */
  async getMasterAbilities(userId: string): Promise<{
    abilityKey: string;
    abilityName: string;
    description: string;
    category: string;
    unlocked: boolean;
    creditCost: number;
  }[]> {
    const results = await queryAll<{
      ability_key: string;
      ability_name: string;
      description: string;
      category: string;
      credit_cost: number;
      unlocked: boolean;
    }>(`
      SELECT
        mma.ability_key,
        mma.ability_name,
        mma.description,
        mma.category,
        mma.credit_cost,
        uma.id IS NOT NULL AS unlocked
      FROM mascot_master_abilities mma
      LEFT JOIN user_master_abilities uma ON uma.ability_id = mma.id AND uma.user_id = $1
      WHERE mma.enabled = TRUE
      ORDER BY mma.category, mma.ability_name
    `, [userId]);

    return results.map(r => ({
      abilityKey: r.ability_key,
      abilityName: r.ability_name,
      description: r.description || '',
      category: r.category,
      creditCost: r.credit_cost,
      unlocked: r.unlocked,
    }));
  },

  /**
   * Unlock a master ability
   */
  async unlockMasterAbility(userId: string, abilityKey: string): Promise<{ success: boolean; error?: string }> {
    const stage = await this.getCompanionStage(userId);
    if (stage < 6) {
      return { success: false, error: 'STAGE_6_REQUIRED' };
    }

    const ability = await queryOne<{ id: string; credit_cost: number }>(`
      SELECT id, credit_cost FROM mascot_master_abilities
      WHERE ability_key = $1 AND enabled = TRUE
    `, [abilityKey]);

    if (!ability) {
      return { success: false, error: 'ABILITY_NOT_FOUND' };
    }

    // Check if already unlocked
    const existing = await queryOne<{ id: string }>(`
      SELECT id FROM user_master_abilities
      WHERE user_id = $1 AND ability_id = $2
    `, [userId, ability.id]);

    if (existing) {
      return { success: false, error: 'ALREADY_UNLOCKED' };
    }

    // Check balance and deduct credits
    const balance = await economyService.getBalance(userId);
    if (balance < ability.credit_cost) {
      return { success: false, error: 'INSUFFICIENT_CREDITS' };
    }

    const chargeResult = await economyService.charge({
      userId,
      action: 'master_ability_unlock',
      amount: ability.credit_cost,
      metadata: {
        abilityKey,
        abilityId: ability.id,
      },
      idempotencyKey: `master-ability-${userId}-${ability.id}-${Date.now()}`,
    });

    if (!chargeResult.success) {
      return { success: false, error: chargeResult.error || 'CHARGE_FAILED' };
    }

    await query(`
      INSERT INTO user_master_abilities (user_id, ability_id, credits_spent)
      VALUES ($1, $2, $3)
    `, [userId, ability.id, ability.credit_cost]);

    log.info({ userId, abilityKey, creditCost: ability.credit_cost }, 'Master ability unlocked');

    return { success: true };
  },

  // =====================================================
  // UNIFIED SUMMARY
  // =====================================================

  /**
   * Get all mascot powers for a user (using DB function)
   */
  async getAllPowers(userId: string): Promise<Record<string, unknown>> {
    const result = await queryOne<{ get_all_mascot_powers: Record<string, unknown> }>(`
      SELECT get_all_mascot_powers($1)
    `, [userId]);

    return result?.get_all_mascot_powers || {};
  },

  /**
   * Get comprehensive mascot powers summary
   */
  async getPowersSummary(userId: string): Promise<MascotPowersSummary> {
    const stage = await this.getCompanionStage(userId);
    const energy = await this.getEnergy(userId);
    const bonus = await this.getBonusMultiplier(userId);
    const streakSaver = await this.getStreakSaverStatus(userId);
    const masterAbilities = await this.getMasterAbilities(userId);

    // Get credit guardian features
    const guardianFeatures = await queryAll<{ feature_name: string }>(`
      SELECT feature_name FROM mascot_credit_guardian_config
      WHERE min_companion_stage <= $1
    `, [stage]);

    // Get scheduler config
    const scheduler = await queryOne<{
      feature_level: string;
      can_use_recovery_data: boolean;
    }>(`
      SELECT feature_level, can_use_recovery_data FROM mascot_scheduler_config
      WHERE min_companion_stage <= $1
      ORDER BY min_companion_stage DESC LIMIT 1
    `, [stage]);

    // Get progress config
    const progress = await queryOne<{ can_predict_milestones: boolean }>(`
      SELECT can_predict_milestones FROM mascot_progress_config
      WHERE min_companion_stage <= $1
      ORDER BY min_companion_stage DESC LIMIT 1
    `, [stage]);

    // Get social configs
    const highfive = await queryOne<{ can_auto_highfive: boolean }>(`
      SELECT can_auto_highfive FROM mascot_highfive_config
      WHERE min_companion_stage <= $1
      ORDER BY min_companion_stage DESC LIMIT 1
    `, [stage]);

    const rivalry = await queryOne<{ can_trash_talk: boolean }>(`
      SELECT can_trash_talk FROM mascot_rivalry_config
      WHERE min_companion_stage <= $1
      ORDER BY min_companion_stage DESC LIMIT 1
    `, [stage]);

    const crew = await queryOne<{ can_coordinate_times: boolean }>(`
      SELECT can_coordinate_times FROM mascot_crew_helper_config
      WHERE min_companion_stage <= $1
      ORDER BY min_companion_stage DESC LIMIT 1
    `, [stage]);

    // Get meta configs
    const dataGuardian = await queryOne<{ can_detect_anomalies: boolean }>(`
      SELECT can_detect_anomalies FROM mascot_data_guardian_config
      WHERE min_companion_stage <= $1
      ORDER BY min_companion_stage DESC LIMIT 1
    `, [stage]);

    const settings = await queryOne<{ can_suggest_notifications: boolean }>(`
      SELECT can_suggest_notifications FROM mascot_settings_config
      WHERE min_companion_stage <= $1
      ORDER BY min_companion_stage DESC LIMIT 1
    `, [stage]);

    // Get advanced configs
    const generator = await queryOne<{ can_generate_program: boolean }>(`
      SELECT can_generate_program FROM mascot_generator_config
      WHERE min_companion_stage <= $1
      ORDER BY min_companion_stage DESC LIMIT 1
    `, [stage]);

    const injury = await queryOne<{ can_full_monitoring: boolean }>(`
      SELECT can_full_monitoring FROM mascot_injury_prevention_config
      WHERE min_companion_stage <= $1
      ORDER BY min_companion_stage DESC LIMIT 1
    `, [stage]);

    const nutrition = await queryOne<{ can_hint_protein: boolean }>(`
      SELECT can_hint_protein FROM mascot_nutrition_config
      WHERE min_companion_stage <= $1
      ORDER BY min_companion_stage DESC LIMIT 1
    `, [stage]);

    return {
      companionStage: stage,
      energy,
      phase2: {
        bonusMultiplier: bonus,
        streakSaver,
        creditGuardianFeatures: guardianFeatures.map(f => f.feature_name),
      },
      phase3: {
        schedulerLevel: scheduler?.feature_level || 'basic',
        canSuggestRecovery: scheduler?.can_use_recovery_data || false,
        canPredictMilestones: progress?.can_predict_milestones || false,
      },
      phase4: {
        canAutoHighfive: highfive?.can_auto_highfive || false,
        canTrashTalk: rivalry?.can_trash_talk || false,
        canCoordinateCrews: crew?.can_coordinate_times || false,
      },
      phase5: {
        canDetectAnomalies: dataGuardian?.can_detect_anomalies || false,
        canSuggestSettings: settings?.can_suggest_notifications || false,
      },
      phase6: {
        canGeneratePrograms: generator?.can_generate_program || false,
        hasInjuryPrevention: injury?.can_full_monitoring || false,
        hasNutritionHints: nutrition?.can_hint_protein || false,
      },
      masterAbilities: masterAbilities.filter(a => a.unlocked).map(a => a.abilityKey),
    };
  },

  // =====================================================
  // HELPERS
  // =====================================================

  /**
   * Get user's companion stage
   */
  async getCompanionStage(userId: string): Promise<number> {
    const result = await queryOne<{ stage: number }>(`
      SELECT stage FROM user_companion_state WHERE user_id = $1
    `, [userId]);

    return result?.stage || 1;
  },
};

export default mascotPowersService;
