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

// =====================================================
// ADDITIONAL TYPES
// =====================================================

export interface CreditLoanOffer {
  available: boolean;
  maxAmount: number;
  interestRate: number;
  currentLoan: number;
  canBorrow: boolean;
  reason?: string;
}

export interface ExerciseAlternative {
  exerciseId: string;
  exerciseName: string;
  reason: string;
  similarityScore: number;
  equipment: string[];
  difficulty: string;
}

export interface CrewSuggestion {
  crewId: string;
  crewName: string;
  matchScore: number;
  matchReasons: string[];
  memberCount: number;
}

export interface GeneratedProgram {
  id: string;
  name: string;
  type: string;
  goal: string;
  durationWeeks: number;
  daysPerWeek: number;
  schedule: Record<string, unknown>;
  workouts: ProgramWorkout[];
  creditCost: number;
}

export interface ProgramWorkout {
  weekNumber: number;
  dayNumber: number;
  name: string;
  focusAreas: string[];
  exercises: ProgramExercise[];
  durationMinutes: number;
  isDeload: boolean;
}

export interface ProgramExercise {
  exerciseId: string;
  exerciseName: string;
  sets: number;
  reps: string;
  restSeconds: number;
  notes?: string;
}

export interface VolumeStats {
  muscleGroup: string;
  weeklyVolume: number;
  averageIntensity: number;
  frequency: number;
  trend: 'increasing' | 'stable' | 'decreasing';
  recommendation?: string;
}

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

  /**
   * Get credit loan offer for user (Stage 5+)
   */
  async getCreditLoanOffer(userId: string): Promise<CreditLoanOffer> {
    const stage = await this.getCompanionStage(userId);

    // Only stage 5+ can get loans
    if (stage < 5) {
      return {
        available: false,
        maxAmount: 0,
        interestRate: 0,
        currentLoan: 0,
        canBorrow: false,
        reason: 'Credit loans require Stage 5 companion',
      };
    }

    // Get loan config
    const config = await queryOne<{
      max_loan_amount: number;
      interest_rate: number;
    }>(`
      SELECT
        (config->>'max_loan_amount')::INTEGER as max_loan_amount,
        (config->>'interest_rate')::DECIMAL as interest_rate
      FROM mascot_credit_guardian_config
      WHERE feature_name = 'credit_loan' AND min_companion_stage <= $1
      ORDER BY min_companion_stage DESC
      LIMIT 1
    `, [stage]);

    // Check for existing loan
    const existingLoan = await queryOne<{
      amount: number;
      created_at: Date;
    }>(`
      SELECT amount, created_at FROM mascot_credit_loans
      WHERE user_id = $1 AND repaid = FALSE
      ORDER BY created_at DESC
      LIMIT 1
    `, [userId]);

    const maxAmount = config?.max_loan_amount || 500;
    const interestRate = Number(config?.interest_rate || 0);
    const currentLoan = existingLoan?.amount || 0;

    return {
      available: true,
      maxAmount,
      interestRate,
      currentLoan,
      canBorrow: currentLoan === 0,
      reason: currentLoan > 0 ? 'You have an outstanding loan to repay first' : undefined,
    };
  },

  /**
   * Take a credit loan from mascot (Stage 5+)
   */
  async takeCreditLoan(
    userId: string,
    amount: number
  ): Promise<{ success: boolean; error?: string; newBalance?: number }> {
    const offer = await this.getCreditLoanOffer(userId);

    if (!offer.available) {
      return { success: false, error: 'LOAN_NOT_AVAILABLE' };
    }

    if (!offer.canBorrow) {
      return { success: false, error: 'EXISTING_LOAN' };
    }

    if (amount > offer.maxAmount) {
      return { success: false, error: 'AMOUNT_EXCEEDS_MAX' };
    }

    if (amount <= 0) {
      return { success: false, error: 'INVALID_AMOUNT' };
    }

    // Create loan record
    await query(`
      INSERT INTO mascot_credit_loans (user_id, amount, interest_rate)
      VALUES ($1, $2, $3)
    `, [userId, amount, offer.interestRate]);

    // Add credits to user
    await economyService.addCredits(
      userId,
      amount,
      'mascot_credit_loan',
      { loanAmount: amount, interestRate: offer.interestRate }
    );

    const newBalance = await economyService.getBalance(userId);

    log.info({ userId, amount, interestRate: offer.interestRate }, 'Mascot credit loan taken');

    return { success: true, newBalance };
  },

  /**
   * Repay credit loan
   */
  async repayCreditLoan(
    userId: string,
    amount?: number
  ): Promise<{ success: boolean; error?: string; amountRepaid?: number; remainingDebt?: number }> {
    const loan = await queryOne<{
      id: string;
      amount: number;
      interest_rate: number;
      amount_repaid: number;
    }>(`
      SELECT id, amount, interest_rate, COALESCE(amount_repaid, 0) as amount_repaid
      FROM mascot_credit_loans
      WHERE user_id = $1 AND repaid = FALSE
      ORDER BY created_at DESC
      LIMIT 1
    `, [userId]);

    if (!loan) {
      return { success: false, error: 'NO_ACTIVE_LOAN' };
    }

    const totalOwed = loan.amount + Math.floor(loan.amount * loan.interest_rate);
    const remaining = totalOwed - loan.amount_repaid;
    const repayAmount = amount ? Math.min(amount, remaining) : remaining;

    // Check user balance
    const balance = await economyService.getBalance(userId);
    if (balance < repayAmount) {
      return { success: false, error: 'INSUFFICIENT_CREDITS' };
    }

    // Charge user
    const chargeResult = await economyService.charge({
      userId,
      action: 'mascot_loan_repayment',
      amount: repayAmount,
      metadata: { loanId: loan.id, repayAmount },
      idempotencyKey: `loan-repay-${userId}-${loan.id}-${Date.now()}`,
    });

    if (!chargeResult.success) {
      return { success: false, error: chargeResult.error || 'CHARGE_FAILED' };
    }

    const newRepaid = loan.amount_repaid + repayAmount;
    const fullyRepaid = newRepaid >= totalOwed;

    await query(`
      UPDATE mascot_credit_loans
      SET amount_repaid = $1, repaid = $2, repaid_at = $3
      WHERE id = $4
    `, [newRepaid, fullyRepaid, fullyRepaid ? new Date() : null, loan.id]);

    log.info({ userId, repayAmount, fullyRepaid }, 'Mascot loan repayment');

    return {
      success: true,
      amountRepaid: repayAmount,
      remainingDebt: fullyRepaid ? 0 : totalOwed - newRepaid,
    };
  },

  /**
   * Get negotiated workout rate (Stage 4+)
   * Returns a discount percentage for the next workout
   */
  async getNegotiatedRate(userId: string): Promise<{ discountPercent: number; available: boolean }> {
    const stage = await this.getCompanionStage(userId);

    if (stage < 4) {
      return { discountPercent: 0, available: false };
    }

    const config = await queryOne<{ discount_percent: number }>(`
      SELECT (config->>'discount_percent')::INTEGER as discount_percent
      FROM mascot_credit_guardian_config
      WHERE feature_name = 'negotiated_rate' AND min_companion_stage <= $1
      ORDER BY min_companion_stage DESC
      LIMIT 1
    `, [stage]);

    return {
      discountPercent: config?.discount_percent || 10,
      available: true,
    };
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
  // PHASE 3.5: FORM FINDER (Exercise Alternatives)
  // =====================================================

  /**
   * Get exercise alternatives based on muscle activation similarity
   */
  async getExerciseAlternatives(
    userId: string,
    exerciseId: string,
    reason?: 'equipment' | 'preference' | 'easier' | 'harder'
  ): Promise<ExerciseAlternative[]> {
    const stage = await this.getCompanionStage(userId);

    // Check if user's stage allows this feature
    const config = await queryOne<{
      can_suggest_alternatives: boolean;
      can_suggest_progressions: boolean;
      can_remember_equipment: boolean;
    }>(`
      SELECT can_suggest_alternatives, can_suggest_progressions, can_remember_equipment
      FROM mascot_form_finder_config
      WHERE min_companion_stage <= $1
      ORDER BY min_companion_stage DESC
      LIMIT 1
    `, [stage]);

    if (!config?.can_suggest_alternatives) {
      return [];
    }

    // Get user's equipment preferences if available
    const equipmentPrefs = await queryOne<{ equipment_available: string[] }>(`
      SELECT equipment_available FROM mascot_scheduler_prefs WHERE user_id = $1
    `, [userId]);

    const userEquipment = equipmentPrefs?.equipment_available || [];

    // Get the original exercise's muscle activations
    const originalActivations = await queryAll<{ muscle_id: string; activation: number }>(`
      SELECT muscle_id, activation FROM exercise_activations WHERE exercise_id = $1
    `, [exerciseId]);

    if (originalActivations.length === 0) {
      return [];
    }

    // Find similar exercises based on muscle activation
    const primaryMuscles = originalActivations
      .filter(a => a.activation >= 0.6)
      .map(a => a.muscle_id);

    if (primaryMuscles.length === 0) {
      return [];
    }

    const alternatives = await queryAll<{
      exercise_id: string;
      exercise_name: string;
      equipment: string[];
      difficulty: string;
      similarity_score: number;
    }>(`
      WITH original_activations AS (
        SELECT muscle_id, activation FROM exercise_activations WHERE exercise_id = $1
      ),
      candidate_exercises AS (
        SELECT DISTINCT e.id, e.name, e.equipment, e.difficulty
        FROM exercises e
        JOIN exercise_activations ea ON ea.exercise_id = e.id
        WHERE ea.muscle_id = ANY($2::TEXT[])
          AND e.id != $1
          AND e.status = 'active'
      ),
      scored_candidates AS (
        SELECT
          ce.id AS exercise_id,
          ce.name AS exercise_name,
          ce.equipment,
          ce.difficulty,
          (
            SELECT SUM(LEAST(ea.activation, oa.activation))
            FROM exercise_activations ea
            JOIN original_activations oa ON oa.muscle_id = ea.muscle_id
            WHERE ea.exercise_id = ce.id
          ) / NULLIF((SELECT SUM(activation) FROM original_activations), 0) AS similarity_score
        FROM candidate_exercises ce
      )
      SELECT
        exercise_id,
        exercise_name,
        equipment,
        difficulty,
        COALESCE(similarity_score, 0) AS similarity_score
      FROM scored_candidates
      WHERE similarity_score >= 0.5
      ORDER BY similarity_score DESC
      LIMIT 10
    `, [exerciseId, primaryMuscles]);

    // Filter by reason if provided
    let filteredAlternatives = alternatives;

    if (reason === 'equipment' && userEquipment.length > 0 && config.can_remember_equipment) {
      filteredAlternatives = alternatives.filter(a =>
        a.equipment.length === 0 || a.equipment.some(eq => userEquipment.includes(eq))
      );
    } else if (reason === 'easier' && config.can_suggest_progressions) {
      filteredAlternatives = alternatives.filter(a =>
        a.difficulty === 'beginner' || a.difficulty === 'intermediate'
      );
    } else if (reason === 'harder' && config.can_suggest_progressions) {
      filteredAlternatives = alternatives.filter(a =>
        a.difficulty === 'advanced' || a.difficulty === 'expert'
      );
    }

    // Log the suggestion
    if (filteredAlternatives.length > 0) {
      await query(`
        INSERT INTO mascot_exercise_suggestions
        (user_id, original_exercise_id, suggested_exercise_id, suggestion_reason, companion_stage)
        VALUES ($1, $2, $3, $4, $5)
      `, [userId, exerciseId, filteredAlternatives[0].exercise_id, reason || 'similar_activation', stage]);
    }

    return filteredAlternatives.map(a => ({
      exerciseId: a.exercise_id,
      exerciseName: a.exercise_name,
      reason: reason || 'similar_activation',
      similarityScore: Number(a.similarity_score),
      equipment: a.equipment || [],
      difficulty: a.difficulty,
    }));
  },

  /**
   * Record user's exercise avoidance/preference
   */
  async setExerciseAvoidance(
    userId: string,
    exerciseId: string,
    avoidanceType: 'favorite' | 'avoid' | 'injured' | 'no_equipment' | 'too_difficult' | 'too_easy',
    reason?: string
  ): Promise<void> {
    await query(`
      INSERT INTO mascot_exercise_avoidances (user_id, exercise_id, avoidance_type, reason)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (user_id, exercise_id) DO UPDATE SET
        avoidance_type = $3,
        reason = $4,
        created_at = NOW()
    `, [userId, exerciseId, avoidanceType, reason || null]);
  },

  /**
   * Get user's avoided exercises
   */
  async getExerciseAvoidances(userId: string): Promise<{
    exerciseId: string;
    avoidanceType: string;
    reason: string | null;
  }[]> {
    const results = await queryAll<{
      exercise_id: string;
      avoidance_type: string;
      reason: string | null;
    }>(`
      SELECT exercise_id, avoidance_type, reason
      FROM mascot_exercise_avoidances
      WHERE user_id = $1
    `, [userId]);

    return results.map(r => ({
      exerciseId: r.exercise_id,
      avoidanceType: r.avoidance_type,
      reason: r.reason,
    }));
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
  // PHASE 4.5: CREW HELPER
  // =====================================================

  /**
   * Get crew suggestions for user based on archetype and activity
   */
  async getCrewSuggestions(userId: string): Promise<CrewSuggestion[]> {
    const stage = await this.getCompanionStage(userId);

    const config = await queryOne<{
      can_suggest_crews: boolean;
    }>(`
      SELECT can_suggest_crews
      FROM mascot_crew_helper_config
      WHERE min_companion_stage <= $1
      ORDER BY min_companion_stage DESC
      LIMIT 1
    `, [stage]);

    if (!config?.can_suggest_crews) {
      return [];
    }

    // Check if user already has a crew
    const existingCrewship = await queryOne<{ crew_id: string }>(`
      SELECT crew_id FROM crew_members WHERE user_id = $1 AND status = 'active'
    `, [userId]);

    if (existingCrewship) {
      // User already in a crew, don't suggest
      return [];
    }

    // Get user's archetype
    const userProfile = await queryOne<{
      current_archetype: string;
    }>(`SELECT current_archetype FROM users WHERE id = $1`, [userId]);

    // Find matching crews
    const suggestions = await queryAll<{
      id: string;
      name: string;
      archetype_focus: string | null;
      member_count: number;
      activity_level: string;
    }>(`
      SELECT
        c.id,
        c.name,
        c.archetype_focus,
        COUNT(cm.user_id) as member_count,
        CASE
          WHEN COUNT(cm.user_id) FILTER (WHERE cm.last_activity_at > NOW() - INTERVAL '7 days') > COUNT(cm.user_id) * 0.5 THEN 'high'
          WHEN COUNT(cm.user_id) FILTER (WHERE cm.last_activity_at > NOW() - INTERVAL '14 days') > COUNT(cm.user_id) * 0.3 THEN 'medium'
          ELSE 'low'
        END as activity_level
      FROM crews c
      LEFT JOIN crew_members cm ON cm.crew_id = c.id AND cm.status = 'active'
      WHERE c.is_public = TRUE
        AND c.status = 'active'
      GROUP BY c.id, c.name, c.archetype_focus
      HAVING COUNT(cm.user_id) < 50
      ORDER BY
        CASE WHEN c.archetype_focus = $1 THEN 0 ELSE 1 END,
        COUNT(cm.user_id) DESC
      LIMIT 5
    `, [userProfile?.current_archetype || '']);

    // Calculate match scores and reasons
    const results: CrewSuggestion[] = suggestions.map(s => {
      const matchReasons: string[] = [];
      let matchScore = 50; // Base score

      if (s.archetype_focus === userProfile?.current_archetype) {
        matchReasons.push(`Focuses on ${s.archetype_focus} archetype like you`);
        matchScore += 30;
      }

      if (s.activity_level === 'high') {
        matchReasons.push('Very active community');
        matchScore += 15;
      } else if (s.activity_level === 'medium') {
        matchReasons.push('Moderately active');
        matchScore += 5;
      }

      if (s.member_count >= 10 && s.member_count <= 30) {
        matchReasons.push('Perfect sized team');
        matchScore += 10;
      }

      return {
        crewId: s.id,
        crewName: s.name,
        matchScore: Math.min(matchScore, 100),
        matchReasons,
        memberCount: s.member_count,
      };
    });

    // Record suggestions
    for (const suggestion of results) {
      await query(`
        INSERT INTO mascot_crew_suggestions
        (user_id, crew_id, crew_name, match_score, match_reasons, companion_stage)
        VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT DO NOTHING
      `, [userId, suggestion.crewId, suggestion.crewName, suggestion.matchScore, JSON.stringify(suggestion.matchReasons), stage]);
    }

    return results;
  },

  /**
   * Create crew coordination event (for workout scheduling)
   */
  async createCrewCoordination(
    userId: string,
    crewId: string,
    coordinationType: 'workout_reminder' | 'time_suggestion' | 'group_workout' | 'challenge_invite',
    proposedTime?: Date,
    workoutType?: string
  ): Promise<{ success: boolean; coordinationId?: string }> {
    const stage = await this.getCompanionStage(userId);

    const config = await queryOne<{
      can_coordinate_times: boolean;
    }>(`
      SELECT can_coordinate_times
      FROM mascot_crew_helper_config
      WHERE min_companion_stage <= $1
      ORDER BY min_companion_stage DESC
      LIMIT 1
    `, [stage]);

    if (!config?.can_coordinate_times && (coordinationType === 'time_suggestion' || coordinationType === 'group_workout')) {
      return { success: false };
    }

    const result = await queryOne<{ id: string }>(`
      INSERT INTO mascot_crew_coordination
      (user_id, crew_id, coordination_type, proposed_time, workout_type, companion_stage)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id
    `, [userId, crewId, coordinationType, proposedTime || null, workoutType || null, stage]);

    return { success: true, coordinationId: result?.id };
  },

  /**
   * Get rivalry alerts (notifications about rival activity)
   */
  async getRivalryAlerts(userId: string): Promise<{
    id: string;
    rivalUserId: string;
    rivalUsername: string;
    alertType: string;
    rivalAction: string | null;
    yourStanding: string | null;
    suggestion: string | null;
    createdAt: Date;
  }[]> {
    const results = await queryAll<{
      id: string;
      rival_user_id: string;
      username: string;
      alert_type: string;
      rival_action: string | null;
      your_standing: string | null;
      suggestion: string | null;
      created_at: Date;
    }>(`
      SELECT ra.id, ra.rival_user_id, u.username, ra.alert_type, ra.rival_action,
             ra.your_standing, ra.suggestion, ra.created_at
      FROM mascot_rivalry_alerts ra
      JOIN users u ON u.id = ra.rival_user_id
      WHERE ra.user_id = $1 AND ra.seen = FALSE
      ORDER BY ra.created_at DESC
      LIMIT 20
    `, [userId]);

    return results.map(r => ({
      id: r.id,
      rivalUserId: r.rival_user_id,
      rivalUsername: r.username,
      alertType: r.alert_type,
      rivalAction: r.rival_action,
      yourStanding: r.your_standing,
      suggestion: r.suggestion,
      createdAt: r.created_at,
    }));
  },

  /**
   * Mark rivalry alert as seen
   */
  async markRivalryAlertSeen(userId: string, alertId: string): Promise<void> {
    await query(`
      UPDATE mascot_rivalry_alerts
      SET seen = TRUE
      WHERE id = $1 AND user_id = $2
    `, [alertId, userId]);
  },

  /**
   * Create rivalry alert (used by workout completion hook)
   */
  async createRivalryAlert(
    userId: string,
    rivalryId: string,
    rivalUserId: string,
    alertType: string,
    rivalAction?: string,
    yourStanding?: string
  ): Promise<void> {
    const stage = await this.getCompanionStage(userId);

    // Generate suggestion based on alert type
    let suggestion: string | null = null;
    if (alertType === 'rival_workout') {
      suggestion = 'Time to match their effort! Start a workout now.';
    } else if (alertType === 'losing_ground') {
      suggestion = 'You\'re falling behind! A quick workout could close the gap.';
    } else if (alertType === 'gaining_lead') {
      suggestion = 'Keep the pressure on! Don\'t let them catch up.';
    }

    await query(`
      INSERT INTO mascot_rivalry_alerts
      (user_id, rivalry_id, rival_user_id, alert_type, rival_action, your_standing, suggestion, companion_stage)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    `, [userId, rivalryId, rivalUserId, alertType, rivalAction || null, yourStanding || null, suggestion, stage]);
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
  // PHASE 6.5: VOLUME TRACKING & INJURY PREVENTION
  // =====================================================

  /**
   * Get volume stats for all muscle groups over past weeks
   */
  async getVolumeStats(userId: string, weeks: number = 4): Promise<VolumeStats[]> {
    const stage = await this.getCompanionStage(userId);

    const config = await queryOne<{
      can_track_volume: boolean;
    }>(`
      SELECT can_track_volume
      FROM mascot_injury_prevention_config
      WHERE min_companion_stage <= $1
      ORDER BY min_companion_stage DESC
      LIMIT 1
    `, [stage]);

    if (!config?.can_track_volume) {
      return [];
    }

    const results = await queryAll<{
      muscle_group: string;
      total_volume: number;
      avg_intensity: number;
      frequency: number;
      prev_volume: number;
    }>(`
      WITH current_week AS (
        SELECT muscle_group, SUM(total_volume) as total_volume, AVG(average_intensity) as avg_intensity, SUM(frequency) as frequency
        FROM mascot_volume_tracking
        WHERE user_id = $1 AND week_start >= DATE_TRUNC('week', CURRENT_DATE) - ($2 || ' weeks')::INTERVAL
        GROUP BY muscle_group
      ),
      prev_week AS (
        SELECT muscle_group, SUM(total_volume) as total_volume
        FROM mascot_volume_tracking
        WHERE user_id = $1 AND week_start >= DATE_TRUNC('week', CURRENT_DATE) - (($2 * 2) || ' weeks')::INTERVAL
          AND week_start < DATE_TRUNC('week', CURRENT_DATE) - ($2 || ' weeks')::INTERVAL
        GROUP BY muscle_group
      )
      SELECT
        cw.muscle_group,
        COALESCE(cw.total_volume, 0) as total_volume,
        COALESCE(cw.avg_intensity, 0) as avg_intensity,
        COALESCE(cw.frequency, 0) as frequency,
        COALESCE(pw.total_volume, 0) as prev_volume
      FROM current_week cw
      LEFT JOIN prev_week pw ON pw.muscle_group = cw.muscle_group
      ORDER BY cw.total_volume DESC
    `, [userId, weeks]);

    return results.map(r => {
      const volumeChange = r.prev_volume > 0
        ? ((r.total_volume - r.prev_volume) / r.prev_volume) * 100
        : 0;

      let trend: 'increasing' | 'stable' | 'decreasing';
      if (volumeChange > 10) trend = 'increasing';
      else if (volumeChange < -10) trend = 'decreasing';
      else trend = 'stable';

      let recommendation: string | undefined;
      if (r.total_volume > 20000) {
        recommendation = 'Volume is very high. Consider a deload week.';
      } else if (r.frequency < 1) {
        recommendation = 'Train this muscle group more frequently for better results.';
      } else if (trend === 'increasing' && volumeChange > 25) {
        recommendation = 'Volume increasing rapidly. Monitor for fatigue.';
      }

      return {
        muscleGroup: r.muscle_group,
        weeklyVolume: Number(r.total_volume),
        averageIntensity: Number(r.avg_intensity),
        frequency: Number(r.frequency),
        trend,
        recommendation,
      };
    });
  },

  /**
   * Record volume after workout completion
   */
  async recordWorkoutVolume(
    userId: string,
    muscleVolumes: { muscleGroup: string; sets: number; reps: number; weight: number; intensity: number }[]
  ): Promise<void> {
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - weekStart.getDay()); // Start of week (Sunday)
    weekStart.setHours(0, 0, 0, 0);

    for (const mv of muscleVolumes) {
      const totalVolume = mv.sets * mv.reps * mv.weight;

      await query(`
        INSERT INTO mascot_volume_tracking
        (user_id, muscle_group, week_start, total_sets, total_reps, total_volume, average_intensity, frequency)
        VALUES ($1, $2, $3, $4, $5, $6, $7, 1)
        ON CONFLICT (user_id, muscle_group, week_start) DO UPDATE SET
          total_sets = mascot_volume_tracking.total_sets + $4,
          total_reps = mascot_volume_tracking.total_reps + $5,
          total_volume = mascot_volume_tracking.total_volume + $6,
          average_intensity = (mascot_volume_tracking.average_intensity + $7) / 2,
          frequency = mascot_volume_tracking.frequency + 1
      `, [userId, mv.muscleGroup, weekStart, mv.sets, mv.reps, totalVolume, mv.intensity]);
    }
  },

  /**
   * Check for overtraining and create alerts if needed
   */
  async checkOvertraining(userId: string): Promise<{
    alerts: { muscleGroup: string; riskLevel: string; recommendation: string }[];
  }> {
    const stage = await this.getCompanionStage(userId);

    const config = await queryOne<{
      can_warn_imbalance: boolean;
    }>(`
      SELECT can_warn_imbalance
      FROM mascot_injury_prevention_config
      WHERE min_companion_stage <= $1
      ORDER BY min_companion_stage DESC
      LIMIT 1
    `, [stage]);

    if (!config?.can_warn_imbalance) {
      return { alerts: [] };
    }

    const volumeStats = await this.getVolumeStats(userId, 2);
    const alerts: { muscleGroup: string; riskLevel: string; recommendation: string }[] = [];

    for (const stats of volumeStats) {
      if (stats.weeklyVolume > 25000 || (stats.trend === 'increasing' && stats.frequency > 4)) {
        const riskLevel = stats.weeklyVolume > 30000 ? 'high' : 'medium';
        const recommendation = stats.weeklyVolume > 30000
          ? `Take a deload week for ${stats.muscleGroup}. Volume is critically high.`
          : `Consider reducing ${stats.muscleGroup} volume next week.`;

        alerts.push({
          muscleGroup: stats.muscleGroup,
          riskLevel,
          recommendation,
        });

        // Create alert in database
        await query(`
          INSERT INTO mascot_overtraining_alerts
          (user_id, alert_type, affected_area, risk_level, current_volume, recommendation, companion_stage)
          VALUES ($1, 'high_volume', $2, $3, $4, $5, $6)
        `, [userId, stats.muscleGroup, riskLevel, stats.weeklyVolume, recommendation, stage]);
      }
    }

    return { alerts };
  },

  // =====================================================
  // PHASE 6.6: WORKOUT PROGRAM GENERATION
  // =====================================================

  /**
   * Generate a workout program (Stage 5+)
   */
  async generateProgram(
    userId: string,
    params: {
      programType: 'strength' | 'hypertrophy' | 'powerbuilding' | 'athletic' | 'custom';
      goal: 'build_muscle' | 'increase_strength' | 'lose_fat' | 'improve_endurance' | 'general_fitness';
      durationWeeks: number;
      daysPerWeek: number;
      equipment?: string[];
    }
  ): Promise<{ success: boolean; program?: GeneratedProgram; error?: string; creditCost?: number }> {
    const stage = await this.getCompanionStage(userId);

    const config = await queryOne<{
      can_generate_program: boolean;
      max_program_weeks: number;
      credit_cost_per_program: number;
    }>(`
      SELECT can_generate_program, max_program_weeks, credit_cost_per_program
      FROM mascot_generator_config
      WHERE min_companion_stage <= $1
      ORDER BY min_companion_stage DESC
      LIMIT 1
    `, [stage]);

    if (!config?.can_generate_program) {
      return { success: false, error: 'STAGE_5_REQUIRED' };
    }

    if (params.durationWeeks > config.max_program_weeks) {
      return { success: false, error: 'DURATION_EXCEEDS_MAX', creditCost: config.credit_cost_per_program };
    }

    // Check and charge credits
    const creditCost = config.credit_cost_per_program;
    if (creditCost > 0) {
      const balance = await economyService.getBalance(userId);
      if (balance < creditCost) {
        return { success: false, error: 'INSUFFICIENT_CREDITS', creditCost };
      }

      const chargeResult = await economyService.charge({
        userId,
        action: 'mascot_program_generation',
        amount: creditCost,
        metadata: { programType: params.programType, goal: params.goal },
        idempotencyKey: `program-gen-${userId}-${Date.now()}`,
      });

      if (!chargeResult.success) {
        return { success: false, error: chargeResult.error || 'CHARGE_FAILED', creditCost };
      }
    }

    // Generate the program
    const program = await this.buildProgram(userId, params, stage);

    // Store in database
    const result = await queryOne<{ id: string }>(`
      INSERT INTO mascot_generated_programs
      (user_id, program_name, program_type, duration_weeks, days_per_week, goal, schedule, workouts, equipment_required, companion_stage, credit_cost)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING id
    `, [
      userId,
      program.name,
      params.programType,
      params.durationWeeks,
      params.daysPerWeek,
      params.goal,
      JSON.stringify(program.schedule),
      JSON.stringify(program.workouts),
      JSON.stringify(params.equipment || []),
      stage,
      creditCost,
    ]);

    // Store individual workouts
    for (const workout of program.workouts) {
      await query(`
        INSERT INTO mascot_program_workouts
        (program_id, week_number, day_number, workout_name, focus_areas, exercises, target_duration_minutes, is_deload)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      `, [
        result?.id,
        workout.weekNumber,
        workout.dayNumber,
        workout.name,
        JSON.stringify(workout.focusAreas),
        JSON.stringify(workout.exercises),
        workout.durationMinutes,
        workout.isDeload,
      ]);
    }

    log.info({ userId, programType: params.programType, goal: params.goal, creditCost }, 'Workout program generated');

    return {
      success: true,
      program: {
        ...program,
        id: result?.id || '',
        creditCost,
      },
    };
  },

  /**
   * Build program logic (internal helper)
   */
  async buildProgram(
    userId: string,
    params: {
      programType: string;
      goal: string;
      durationWeeks: number;
      daysPerWeek: number;
      equipment?: string[];
    },
    stage: number
  ): Promise<Omit<GeneratedProgram, 'id' | 'creditCost'>> {
    // Get exercises filtered by equipment
    let exerciseQuery = `SELECT id, name, primary_muscle, difficulty FROM exercises WHERE status = 'active'`;
    const queryParams: unknown[] = [];

    if (params.equipment && params.equipment.length > 0) {
      exerciseQuery += ` AND (equipment IS NULL OR equipment && $1::TEXT[])`;
      queryParams.push(params.equipment);
    }

    const exercises = await queryAll<{
      id: string;
      name: string;
      primary_muscle: string;
      difficulty: string;
    }>(exerciseQuery, queryParams);

    // Group exercises by muscle
    const exercisesByMuscle: Record<string, typeof exercises> = {};
    for (const ex of exercises) {
      if (!exercisesByMuscle[ex.primary_muscle]) {
        exercisesByMuscle[ex.primary_muscle] = [];
      }
      exercisesByMuscle[ex.primary_muscle].push(ex);
    }

    // Define splits based on days per week
    const splits = this.getSplitForDays(params.daysPerWeek, params.programType);

    // Generate workouts
    const workouts: ProgramWorkout[] = [];
    const deloadWeek = params.durationWeeks >= 4 ? params.durationWeeks : null;

    for (let week = 1; week <= params.durationWeeks; week++) {
      const isDeload = week === deloadWeek;

      for (let day = 1; day <= params.daysPerWeek; day++) {
        const split = splits[(day - 1) % splits.length];
        const workoutExercises: ProgramExercise[] = [];

        for (const muscleGroup of split.muscles) {
          const muscleExercises = exercisesByMuscle[muscleGroup] || [];
          if (muscleExercises.length === 0) continue;

          // Pick 2-3 exercises per muscle group
          const numExercises = muscleGroup === split.primaryMuscle ? 3 : 2;
          const selected = muscleExercises.slice(0, numExercises);

          for (const ex of selected) {
            const baseReps = params.goal === 'increase_strength' ? '5' :
                            params.goal === 'build_muscle' ? '8-12' :
                            params.goal === 'improve_endurance' ? '15-20' : '10';
            const baseSets = params.goal === 'increase_strength' ? 5 : 4;

            workoutExercises.push({
              exerciseId: ex.id,
              exerciseName: ex.name,
              sets: isDeload ? Math.ceil(baseSets / 2) : baseSets,
              reps: isDeload ? '10' : baseReps,
              restSeconds: params.goal === 'increase_strength' ? 180 : 90,
              notes: isDeload ? 'Deload week - reduce intensity by 40%' : undefined,
            });
          }
        }

        workouts.push({
          weekNumber: week,
          dayNumber: day,
          name: `${split.name} - Week ${week}`,
          focusAreas: split.muscles,
          exercises: workoutExercises,
          durationMinutes: 45 + workoutExercises.length * 5,
          isDeload,
        });
      }
    }

    // Create schedule
    const schedule: Record<string, string> = {};
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    for (let i = 0; i < params.daysPerWeek; i++) {
      const dayIndex = i === 0 ? 1 : i === 1 ? 2 : i === 2 ? 4 : i === 3 ? 5 : i + 1;
      schedule[dayNames[dayIndex]] = splits[i % splits.length].name;
    }

    return {
      name: `${params.programType.charAt(0).toUpperCase() + params.programType.slice(1)} ${params.durationWeeks}-Week Program`,
      type: params.programType,
      goal: params.goal,
      durationWeeks: params.durationWeeks,
      daysPerWeek: params.daysPerWeek,
      schedule,
      workouts,
    };
  },

  /**
   * Get workout split based on days per week
   */
  getSplitForDays(daysPerWeek: number, programType: string): { name: string; muscles: string[]; primaryMuscle: string }[] {
    // PPL split for 6 days
    if (daysPerWeek >= 6) {
      return [
        { name: 'Push A', muscles: ['chest', 'shoulders', 'triceps'], primaryMuscle: 'chest' },
        { name: 'Pull A', muscles: ['back', 'biceps', 'rear_delts'], primaryMuscle: 'back' },
        { name: 'Legs A', muscles: ['quadriceps', 'hamstrings', 'glutes', 'calves'], primaryMuscle: 'quadriceps' },
        { name: 'Push B', muscles: ['shoulders', 'chest', 'triceps'], primaryMuscle: 'shoulders' },
        { name: 'Pull B', muscles: ['back', 'biceps', 'forearms'], primaryMuscle: 'back' },
        { name: 'Legs B', muscles: ['hamstrings', 'glutes', 'quadriceps', 'calves'], primaryMuscle: 'hamstrings' },
      ];
    }

    // Upper/Lower for 4-5 days
    if (daysPerWeek >= 4) {
      return [
        { name: 'Upper A', muscles: ['chest', 'back', 'shoulders', 'biceps', 'triceps'], primaryMuscle: 'chest' },
        { name: 'Lower A', muscles: ['quadriceps', 'hamstrings', 'glutes', 'calves'], primaryMuscle: 'quadriceps' },
        { name: 'Upper B', muscles: ['back', 'shoulders', 'chest', 'triceps', 'biceps'], primaryMuscle: 'back' },
        { name: 'Lower B', muscles: ['hamstrings', 'glutes', 'quadriceps', 'calves'], primaryMuscle: 'hamstrings' },
        { name: 'Full Body', muscles: ['chest', 'back', 'quadriceps', 'shoulders'], primaryMuscle: 'chest' },
      ];
    }

    // Full body for 3 days
    return [
      { name: 'Full Body A', muscles: ['chest', 'back', 'quadriceps', 'shoulders'], primaryMuscle: 'chest' },
      { name: 'Full Body B', muscles: ['back', 'hamstrings', 'chest', 'biceps'], primaryMuscle: 'back' },
      { name: 'Full Body C', muscles: ['legs', 'shoulders', 'triceps', 'core'], primaryMuscle: 'quadriceps' },
    ];
  },

  /**
   * Get a user's active program
   */
  async getActiveProgram(userId: string): Promise<GeneratedProgram | null> {
    const program = await queryOne<{
      id: string;
      program_name: string;
      program_type: string;
      goal: string;
      duration_weeks: number;
      days_per_week: number;
      schedule: Record<string, unknown>;
      credit_cost: number;
    }>(`
      SELECT id, program_name, program_type, goal, duration_weeks, days_per_week, schedule, credit_cost
      FROM mascot_generated_programs
      WHERE user_id = $1 AND status = 'active'
      ORDER BY created_at DESC
      LIMIT 1
    `, [userId]);

    if (!program) return null;

    const workouts = await queryAll<{
      week_number: number;
      day_number: number;
      workout_name: string;
      focus_areas: string[];
      exercises: ProgramExercise[];
      target_duration_minutes: number;
      is_deload: boolean;
    }>(`
      SELECT week_number, day_number, workout_name, focus_areas, exercises, target_duration_minutes, is_deload
      FROM mascot_program_workouts
      WHERE program_id = $1
      ORDER BY week_number, day_number
    `, [program.id]);

    return {
      id: program.id,
      name: program.program_name,
      type: program.program_type,
      goal: program.goal,
      durationWeeks: program.duration_weeks,
      daysPerWeek: program.days_per_week,
      schedule: program.schedule,
      creditCost: program.credit_cost,
      workouts: workouts.map(w => ({
        weekNumber: w.week_number,
        dayNumber: w.day_number,
        name: w.workout_name || '',
        focusAreas: w.focus_areas || [],
        exercises: w.exercises || [],
        durationMinutes: w.target_duration_minutes,
        isDeload: w.is_deload,
      })),
    };
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

  // =====================================================
  // GRAPHQL ENDPOINT IMPLEMENTATIONS
  // =====================================================

  /**
   * Get mascot assist state
   */
  async getAssistState(userId: string): Promise<{
    chargesRemaining: number;
    chargesMax: number;
    lastChargeReset: Date | null;
    lastAssistUsed: Date | null;
    totalAssistsUsed: number;
    exercisesAssistedToday: number;
    canUseAssist: boolean;
    cooldownEndsAt: Date | null;
    companionStage: number;
    userRankTier: number;
    ability: { id: string; name: string; maxExercises: number; dailyCharges: number; cooldownHours: number } | null;
  }> {
    const state = await queryOne<{
      charges_remaining: number;
      charges_max: number;
      last_charge_reset: Date;
      last_assist_used: Date;
      total_assists_used: number;
      exercises_assisted_today: number;
    }>(`SELECT * FROM user_mascot_assist_state WHERE user_id = $1`, [userId]);

    const stage = await this.getCompanionStage(userId);

    const ability = await queryOne<{
      id: string;
      name: string;
      max_exercises_per_workout: number;
      daily_charges: number;
      cooldown_hours: number;
    }>(`SELECT * FROM get_mascot_assist_ability($1)`, [userId]);

    const user = await queryOne<{ current_rank: string }>(`SELECT current_rank FROM users WHERE id = $1`, [userId]);
    const rankTier = await queryOne<{ tier: number }>(`
      SELECT tier FROM rank_definitions WHERE name = $1
    `, [user?.current_rank || 'Novice']);

    const cooldownEndsAt = state?.last_assist_used && ability?.cooldown_hours
      ? new Date(state.last_assist_used.getTime() + ability.cooldown_hours * 3600000)
      : null;

    const now = new Date();
    const canUseAssist = (state?.charges_remaining || 0) > 0 &&
      (cooldownEndsAt === null || cooldownEndsAt < now);

    return {
      chargesRemaining: state?.charges_remaining || 1,
      chargesMax: state?.charges_max || 1,
      lastChargeReset: state?.last_charge_reset || null,
      lastAssistUsed: state?.last_assist_used || null,
      totalAssistsUsed: state?.total_assists_used || 0,
      exercisesAssistedToday: state?.exercises_assisted_today || 0,
      canUseAssist,
      cooldownEndsAt,
      companionStage: stage,
      userRankTier: rankTier?.tier || 1,
      ability: ability ? {
        id: ability.id,
        name: ability.name,
        maxExercises: ability.max_exercises_per_workout,
        dailyCharges: ability.daily_charges,
        cooldownHours: ability.cooldown_hours,
      } : null,
    };
  },

  /**
   * Use mascot assist
   */
  async useMascotAssist(
    userId: string,
    workoutId: string,
    exerciseId: string,
    reason?: string
  ): Promise<{ success: boolean; error?: string; assistLogId?: string; tuAwarded?: number; chargesRemaining?: number; message?: string }> {
    const state = await this.getAssistState(userId);

    if (!state.canUseAssist) {
      return { success: false, error: 'No assist charges available or on cooldown' };
    }

    if (!state.ability) {
      return { success: false, error: 'No assist ability available' };
    }

    if (state.exercisesAssistedToday >= state.ability.maxExercises) {
      return { success: false, error: 'Maximum exercises assisted today reached' };
    }

    // Get exercise info
    const exercise = await queryOne<{ name: string }>(`SELECT name FROM exercises WHERE id = $1`, [exerciseId]);

    // Calculate TU to award (50% of normal)
    const tuAwarded = 5; // Base TU for mascot assist

    // Log the assist
    const assistLog = await queryOne<{ id: string }>(`
      INSERT INTO mascot_assist_log (user_id, workout_id, exercise_id, exercise_name, ability_id, companion_stage, user_rank_tier, sets_completed, tu_awarded, reason)
      VALUES ($1, $2, $3, $4, $5, $6, $7, 1, $8, $9)
      RETURNING id
    `, [userId, workoutId, exerciseId, exercise?.name || 'Unknown', state.ability.id, state.companionStage, state.userRankTier, tuAwarded, reason || 'tired']);

    // Update state
    await query(`
      UPDATE user_mascot_assist_state
      SET charges_remaining = charges_remaining - 1,
          last_assist_used = NOW(),
          total_assists_used = total_assists_used + 1,
          exercises_assisted_today = exercises_assisted_today + 1,
          updated_at = NOW()
      WHERE user_id = $1
    `, [userId]);

    // Add assisted exercise to workout
    await query(`
      UPDATE workouts
      SET mascot_assisted_exercises = array_append(mascot_assisted_exercises, $2)
      WHERE id = $1
    `, [workoutId, exerciseId]);

    return {
      success: true,
      assistLogId: assistLog?.id,
      tuAwarded,
      chargesRemaining: state.chargesRemaining - 1,
      message: `${state.ability.name} helped you complete ${exercise?.name || 'this exercise'}!`,
    };
  },

  /**
   * Request a credit loan
   */
  async requestCreditLoan(
    userId: string,
    amount: number
  ): Promise<{ success: boolean; error?: string; newBalance?: number; amountRepaid?: number; remainingDebt?: number }> {
    const offer = await this.getCreditLoanOffer(userId);

    if (!offer.canBorrow) {
      return { success: false, error: offer.reason || 'Cannot borrow at this time' };
    }

    if (amount > offer.maxAmount - offer.currentLoan) {
      return { success: false, error: `Maximum additional loan is ${offer.maxAmount - offer.currentLoan} credits` };
    }

    // Record the loan
    await query(`
      INSERT INTO mascot_credit_loans (user_id, amount_borrowed, amount_owed, interest_rate, companion_stage)
      VALUES ($1, $2, $2, $3, (SELECT stage FROM user_companion_state WHERE user_id = $1))
      ON CONFLICT (user_id) DO UPDATE SET
        amount_borrowed = mascot_credit_loans.amount_borrowed + $2,
        amount_owed = mascot_credit_loans.amount_owed + $2,
        last_borrow_at = NOW()
    `, [userId, amount, offer.interestRate]);

    // Credit the user
    const result = await economyService.addCredits(userId, amount, 'mascot_loan', { loanAmount: amount });

    return {
      success: true,
      newBalance: result.newBalance,
      remainingDebt: offer.currentLoan + amount,
    };
  },

  /**
   * Acknowledge overtraining alert
   */
  async acknowledgeOvertrainingAlert(userId: string, alertId: string): Promise<void> {
    await query(`
      UPDATE mascot_overtraining_alerts
      SET acknowledged = TRUE
      WHERE id = $1 AND user_id = $2
    `, [alertId, userId]);
  },

  /**
   * Accept workout suggestion
   */
  async acceptWorkoutSuggestion(userId: string, suggestionId: string): Promise<void> {
    await query(`
      UPDATE mascot_workout_suggestions
      SET accepted_at = NOW()
      WHERE id = $1 AND user_id = $2
    `, [suggestionId, userId]);
  },

  /**
   * Activate generated program
   */
  async activateGeneratedProgram(userId: string, programId: string): Promise<void> {
    // Deactivate any current programs
    await query(`
      UPDATE mascot_generated_programs
      SET status = 'paused'
      WHERE user_id = $1 AND status = 'active'
    `, [userId]);

    // Activate the specified program
    await query(`
      UPDATE mascot_generated_programs
      SET status = 'active', started_at = NOW()
      WHERE id = $1 AND user_id = $2
    `, [programId, userId]);
  },

  /**
   * Execute social action
   */
  async executeSocialAction(userId: string, actionId: string): Promise<void> {
    const action = await queryOne<{
      action_type: string;
      target_user_id: string;
      action_data: Record<string, unknown>;
    }>(`SELECT * FROM mascot_pending_social_actions WHERE id = $1 AND user_id = $2`, [actionId, userId]);

    if (!action) {
      throw new Error('Social action not found');
    }

    // Mark as executed
    await query(`
      UPDATE mascot_pending_social_actions
      SET executed_at = NOW()
      WHERE id = $1
    `, [actionId]);

    // Execute the action based on type
    switch (action.action_type) {
      case 'highfive':
        // Would trigger high-five to the target user
        log.info(`Executing mascot highfive from ${userId} to ${action.target_user_id}`);
        break;
      case 'message':
        // Would trigger message to the target user
        log.info(`Executing mascot message from ${userId} to ${action.target_user_id}`);
        break;
      default:
        log.warn(`Unknown social action type: ${action.action_type}`);
    }
  },

  /**
   * Remove exercise avoidance
   */
  async removeExerciseAvoidance(userId: string, exerciseId: string): Promise<void> {
    await query(`
      DELETE FROM user_exercise_avoidances
      WHERE user_id = $1 AND exercise_id = $2
    `, [userId, exerciseId]);
  },

  /**
   * Get multiple workout suggestions
   */
  async getWorkoutSuggestions(userId: string, limit: number = 7): Promise<WorkoutSuggestion[]> {
    const rows = await queryAll<{
      id: string;
      suggested_for: Date;
      suggestion_type: string;
      focus_muscles: string[];
      recommended_exercises: string[];
      duration_minutes: number;
      reason: string;
    }>(`
      SELECT id, suggested_for, suggestion_type, focus_muscles, recommended_exercises, duration_minutes, reason
      FROM mascot_workout_suggestions
      WHERE user_id = $1 AND accepted_at IS NULL AND suggested_for >= CURRENT_DATE
      ORDER BY suggested_for ASC
      LIMIT $2
    `, [userId, limit]);

    return rows.map(row => ({
      id: row.id,
      suggestedFor: row.suggested_for,
      suggestionType: row.suggestion_type,
      focusMuscles: row.focus_muscles || [],
      recommendedExercises: row.recommended_exercises || [],
      durationMinutes: row.duration_minutes,
      reason: row.reason,
    }));
  },

  /**
   * Get milestone progress
   */
  async getMilestoneProgress(userId: string): Promise<MilestoneProgress[]> {
    return this.getMilestones(userId);
  },

  /**
   * Get generated programs
   */
  async getGeneratedPrograms(userId: string, status?: string): Promise<{
    id: string;
    name: string;
    type: string;
    goal: string;
    durationWeeks: number;
    daysPerWeek: number;
    schedule: Record<string, unknown>;
    workouts: Array<{
      weekNumber: number;
      dayNumber: number;
      name: string;
      focusAreas: string[];
      exercises: Array<{
        exerciseId: string;
        exerciseName: string;
        sets: number;
        reps: string;
        restSeconds: number;
        notes: string | null;
      }>;
      durationMinutes: number;
      isDeload: boolean;
    }>;
    creditCost: number;
  }[]> {
    let whereClause = 'WHERE user_id = $1';
    const params: (string | undefined)[] = [userId];

    if (status) {
      whereClause += ' AND status = $2';
      params.push(status);
    }

    const programs = await queryAll<{
      id: string;
      program_name: string;
      program_type: string;
      goal: string;
      duration_weeks: number;
      days_per_week: number;
      schedule: Record<string, unknown>;
      workouts: unknown[];
      credit_cost: number;
    }>(`
      SELECT id, program_name, program_type, goal, duration_weeks, days_per_week, schedule, workouts, credit_cost
      FROM mascot_generated_programs
      ${whereClause}
      ORDER BY created_at DESC
    `, params.filter(Boolean) as string[]);

    return programs.map(p => ({
      id: p.id,
      name: p.program_name,
      type: p.program_type,
      goal: p.goal,
      durationWeeks: p.duration_weeks,
      daysPerWeek: p.days_per_week,
      schedule: p.schedule || {},
      workouts: (p.workouts || []).map((w: unknown) => {
        const workout = w as Record<string, unknown>;
        return {
          weekNumber: workout.weekNumber as number || 1,
          dayNumber: workout.dayNumber as number || 1,
          name: workout.name as string || '',
          focusAreas: workout.focusAreas as string[] || [],
          exercises: ((workout.exercises as unknown[]) || []).map((e: unknown) => {
            const ex = e as Record<string, unknown>;
            return {
              exerciseId: ex.exerciseId as string || '',
              exerciseName: ex.exerciseName as string || '',
              sets: ex.sets as number || 3,
              reps: ex.reps as string || '8-12',
              restSeconds: ex.restSeconds as number || 60,
              notes: ex.notes as string | null,
            };
          }),
          durationMinutes: workout.durationMinutes as number || 45,
          isDeload: workout.isDeload as boolean || false,
        };
      }),
      creditCost: p.credit_cost || 0,
    }));
  },

  /**
   * Get pending social actions
   */
  async getPendingSocialActions(userId: string): Promise<SocialAction[]> {
    const rows = await queryAll<{
      id: string;
      action_type: string;
      target_user_id: string;
      target_username: string;
      action_data: Record<string, unknown>;
      priority: number;
    }>(`
      SELECT psa.id, psa.action_type, psa.target_user_id,
             u.username as target_username, psa.action_data, psa.priority
      FROM mascot_pending_social_actions psa
      JOIN users u ON u.id = psa.target_user_id
      WHERE psa.user_id = $1 AND psa.executed_at IS NULL
      ORDER BY psa.priority DESC, psa.created_at ASC
      LIMIT 10
    `, [userId]);

    return rows.map(row => ({
      actionType: row.action_type,
      targetUserId: row.target_user_id,
      targetUsername: row.target_username,
      actionData: row.action_data || {},
      priority: row.priority || 5,
    }));
  },
};

export default mascotPowersService;
