/**
 * Prescription Engine v3.0 - Learning System
 *
 * Adaptive learning from user feedback:
 * - Post-workout feedback collection
 * - Preference modeling from behavior
 * - Weight adaptation using reinforcement learning
 * - A/B testing infrastructure
 */

import { queryAll, queryOne } from '../../db/client';
import { loggers } from '../../lib/logger';
import type {
  PrescriptionFeedback,
  AdaptiveUserWeights,
  ScoringWeightsV3,
  MovementPattern,
  UserExercisePerformance,
} from './types';
import { prescriptionCache } from './cache';

const log = loggers.prescription || loggers.api;

// ============================================
// FEEDBACK COLLECTOR
// ============================================

export class FeedbackCollector {
  /**
   * Store prescription feedback
   */
  async storeFeedback(feedback: PrescriptionFeedback): Promise<void> {
    await queryOne(`
      INSERT INTO prescription_feedback (
        id, user_id, prescription_id,
        exercises_prescribed, exercises_completed,
        exercises_skipped, exercises_substituted, substitutions,
        overall_difficulty_rating, estimated_time_minutes, actual_time_minutes,
        fatigue_at_end, soreness_next_day,
        overall_satisfaction, would_repeat, free_text_feedback,
        exercise_feedback
      ) VALUES (
        gen_random_uuid()::text, $1, $2,
        $3, $4, $5, $6, $7,
        $8, $9, $10, $11, $12,
        $13, $14, $15, $16
      )
    `, [
      feedback.userId,
      feedback.prescriptionId,
      feedback.exercisesPrescribed,
      feedback.exercisesCompleted,
      feedback.exercisesSkipped,
      feedback.exercisesSubstituted,
      JSON.stringify(feedback.substitutions),
      feedback.overallDifficultyRating,
      feedback.estimatedTimeMinutes,
      feedback.actualTimeMinutes,
      feedback.fatigueAtEnd,
      feedback.sorenessNextDay || null,
      feedback.overallSatisfaction,
      feedback.wouldRepeat,
      feedback.freeTextFeedback || null,
      JSON.stringify(feedback.exerciseFeedback),
    ]);

    // Invalidate user caches
    await prescriptionCache.invalidateOn('feedback_submitted', feedback.userId);

    // Trigger learning system update
    await this.triggerLearningUpdate(feedback.userId);
  }

  /**
   * Update user exercise performance from completed workout
   */
  async updateExercisePerformance(
    userId: string,
    exerciseId: string,
    performance: {
      weight?: number;
      reps?: number;
      sets?: number;
      rpe?: number;
      enjoymentRating?: number;
      perceivedDifficulty?: number;
      jointStressExperienced?: number;
      success: boolean;
    }
  ): Promise<void> {
    // Get existing performance record
    const existing = await queryOne<UserExercisePerformance>(`
      SELECT * FROM user_exercise_performance
      WHERE user_id = $1 AND exercise_id = $2
    `, [userId, exerciseId]);

    if (existing) {
      // Update existing record
      await queryOne(`
        UPDATE user_exercise_performance SET
          total_sessions = total_sessions + 1,
          last_performed_at = NOW(),
          consecutive_success_sessions = CASE WHEN $3 THEN consecutive_success_sessions + 1 ELSE 0 END,
          lifetime_total_reps = lifetime_total_reps + COALESCE($4, 0),
          lifetime_total_tonnage = lifetime_total_tonnage + (COALESCE($5, 0) * COALESCE($4, 0)),
          recent_max_weight = GREATEST(recent_max_weight, COALESCE($5, 0)),
          max_weight_ever = GREATEST(max_weight_ever, COALESCE($5, 0)),
          enjoyment_rating = COALESCE($6, enjoyment_rating),
          perceived_difficulty = COALESCE($7, perceived_difficulty),
          joint_stress_experienced = COALESCE($8, joint_stress_experienced),
          updated_at = NOW()
        WHERE user_id = $1 AND exercise_id = $2
      `, [
        userId,
        exerciseId,
        performance.success,
        performance.reps ? performance.reps * (performance.sets || 1) : null,
        performance.weight,
        performance.enjoymentRating,
        performance.perceivedDifficulty,
        performance.jointStressExperienced,
      ]);
    } else {
      // Create new record
      await queryOne(`
        INSERT INTO user_exercise_performance (
          id, user_id, exercise_id,
          first_performed_at, last_performed_at,
          total_sessions, consecutive_success_sessions,
          lifetime_total_reps, lifetime_total_tonnage,
          recent_max_weight, max_weight_ever,
          enjoyment_rating, perceived_difficulty, joint_stress_experienced,
          skill_progression
        ) VALUES (
          gen_random_uuid()::text, $1, $2,
          NOW(), NOW(),
          1, $3,
          COALESCE($4, 0), COALESCE($5, 0),
          COALESCE($6, 0), COALESCE($6, 0),
          $7, $8, $9,
          'learning'
        )
      `, [
        userId,
        exerciseId,
        performance.success ? 1 : 0,
        performance.reps ? performance.reps * (performance.sets || 1) : 0,
        (performance.weight || 0) * (performance.reps || 0) * (performance.sets || 1),
        performance.weight,
        performance.enjoymentRating,
        performance.perceivedDifficulty,
        performance.jointStressExperienced,
      ]);
    }

    // Invalidate cache
    await prescriptionCache.invalidateOn('workout_complete', userId);
  }

  /**
   * Trigger async learning update
   */
  private async triggerLearningUpdate(userId: string): Promise<void> {
    // In production, this would be a job queue
    // For now, run inline but don't wait
    learningSystem.updateUserWeights(userId).catch(err => {
      log.warn({ err, userId }, 'Learning update failed');
    });
  }
}

// ============================================
// ADAPTIVE LEARNING SYSTEM
// ============================================

export class AdaptiveLearningSystem {
  private readonly MINIMUM_SAMPLES = 5;
  private readonly LEARNING_RATE = 0.1;

  /**
   * Update user-specific scoring weights based on feedback patterns
   */
  async updateUserWeights(userId: string): Promise<void> {
    // Get prescription history with feedback
    const history = await this.getPrescriptionHistory(userId, 30); // Last 30 days

    if (history.length < this.MINIMUM_SAMPLES) {
      log.debug({ userId, samples: history.length }, 'Insufficient data for weight update');
      return;
    }

    // Analyze patterns
    const patterns = this.analyzePatterns(history);

    // Calculate weight adjustments
    const adjustments = this.calculateWeightAdjustments(patterns);

    if (Object.keys(adjustments).length === 0) {
      log.debug({ userId }, 'No weight adjustments needed');
      return;
    }

    // Store updated weights
    await this.storeUserWeights(userId, adjustments, patterns);

    // Invalidate cache
    await prescriptionCache.invalidateOn('weight_update', userId);

    log.info({ userId, adjustments }, 'User weights updated');
  }

  /**
   * Get prescription history with feedback
   */
  private async getPrescriptionHistory(
    userId: string,
    days: number
  ): Promise<FeedbackWithContext[]> {
    const history = await queryAll<FeedbackWithContext>(`
      SELECT
        pf.*,
        ph.exercises,
        ph.difficulty,
        ph.total_duration
      FROM prescription_feedback pf
      JOIN prescription_history ph ON ph.id = pf.prescription_id
      WHERE pf.user_id = $1
      AND pf.created_at > NOW() - INTERVAL '1 day' * $2
      ORDER BY pf.created_at DESC
    `, [userId, days]);

    return history;
  }

  /**
   * Analyze feedback patterns
   */
  private analyzePatterns(history: FeedbackWithContext[]): FeedbackPatterns {
    const patterns: FeedbackPatterns = {
      avgSatisfaction: 0,
      avgCompletionRate: 0,
      prefersVariety: false,
      consistentlyTooEasy: false,
      consistentlyTooHard: false,
      consistentlySkippedPatterns: [],
      preferredPatterns: [],
      typeAdherence: {},
      difficultyPreference: 'moderate',
    };

    if (history.length === 0) return patterns;

    // Calculate averages - use property names matching the PrescriptionFeedback type
    patterns.avgSatisfaction = history.reduce((sum, h) => sum + h.overallSatisfaction, 0) / history.length;
    patterns.avgCompletionRate = history.reduce((sum, h) =>
      sum + (h.exercisesCompleted / h.exercisesPrescribed), 0) / history.length;

    // Analyze exercise-level feedback
    const patternSkips: Record<string, number> = {};
    const patternCompletes: Record<string, number> = {};
    let tooEasyCount = 0;
    let tooHardCount = 0;

    for (const entry of history) {
      const exercises = entry.exercises as any[] || [];
      const feedback = entry.exerciseFeedback as any[] || [];

      for (const ex of exercises) {
        const pattern = ex.movementPattern as string;
        const fb = feedback.find((f: any) => f.exerciseId === ex.exerciseId);

        if (fb?.tooEasy) tooEasyCount++;
        if (fb?.tooHard) tooHardCount++;

        // Check if exercise was completed
        const wasCompleted = !entry.substitutions?.some(
          (s: any) => s.original === ex.exerciseId
        );

        if (wasCompleted) {
          patternCompletes[pattern] = (patternCompletes[pattern] || 0) + 1;
        } else {
          patternSkips[pattern] = (patternSkips[pattern] || 0) + 1;
        }
      }
    }

    // Determine if user prefers variety
    const uniqueExercises = new Set(
      history.flatMap(h => (h.exercises as any[] || []).map((e: any) => e.exerciseId))
    );
    patterns.prefersVariety = uniqueExercises.size > history.length * 5;

    // Determine difficulty preference
    patterns.consistentlyTooEasy = tooEasyCount > history.length * 0.3;
    patterns.consistentlyTooHard = tooHardCount > history.length * 0.3;

    if (patterns.consistentlyTooEasy) patterns.difficultyPreference = 'harder';
    if (patterns.consistentlyTooHard) patterns.difficultyPreference = 'easier';

    // Find consistently skipped patterns
    for (const [pattern, skipCount] of Object.entries(patternSkips)) {
      const completeCount = patternCompletes[pattern] || 0;
      const skipRate = skipCount / (skipCount + completeCount);
      if (skipRate > 0.4) {
        patterns.consistentlySkippedPatterns.push(pattern);
      }
    }

    // Find preferred patterns (high completion)
    for (const [pattern, completeCount] of Object.entries(patternCompletes)) {
      const skipCount = patternSkips[pattern] || 0;
      const completeRate = completeCount / (skipCount + completeCount);
      if (completeRate > 0.9) {
        patterns.preferredPatterns.push(pattern);
      }
      patterns.typeAdherence[pattern] = completeRate;
    }

    return patterns;
  }

  /**
   * Calculate weight adjustments based on patterns
   */
  private calculateWeightAdjustments(patterns: FeedbackPatterns): Partial<ScoringWeightsV3> {
    const adjustments: Partial<ScoringWeightsV3> = {};

    // Adjust variety weight
    if (patterns.prefersVariety) {
      adjustments.varietyOptimization = 6; // Up from default 3
    }

    // Adjust skill appropriateness based on difficulty feedback
    if (patterns.consistentlyTooEasy) {
      adjustments.skillAppropriate = 4; // Lower = allow harder exercises
    } else if (patterns.consistentlyTooHard) {
      adjustments.skillAppropriate = 10; // Higher = prefer easier exercises
    }

    // If user has high satisfaction with certain patterns, boost them
    // (This would be pattern-specific bonuses, stored differently)

    return adjustments;
  }

  /**
   * Store updated user weights
   */
  private async storeUserWeights(
    userId: string,
    adjustments: Partial<ScoringWeightsV3>,
    patterns: FeedbackPatterns
  ): Promise<void> {
    // Check if record exists
    const existing = await queryOne(`
      SELECT id FROM user_prescription_weights WHERE user_id = $1
    `, [userId]);

    if (existing) {
      await queryOne(`
        UPDATE user_prescription_weights SET
          weight_modifiers = $2,
          preferred_patterns = $3,
          avoided_patterns = $4,
          preferred_intensity_range = $5,
          samples_used = samples_used + 1,
          last_updated = NOW(),
          confidence = LEAST(1.0, confidence + 0.05)
        WHERE user_id = $1
      `, [
        userId,
        JSON.stringify(adjustments),
        JSON.stringify(patterns.preferredPatterns),
        JSON.stringify(patterns.consistentlySkippedPatterns),
        JSON.stringify({
          min: patterns.difficultyPreference === 'easier' ? 1 : 5,
          max: patterns.difficultyPreference === 'harder' ? 10 : 8,
        }),
      ]);
    } else {
      await queryOne(`
        INSERT INTO user_prescription_weights (
          id, user_id, weight_modifiers, preferred_patterns,
          avoided_patterns, preferred_intensity_range,
          samples_used, confidence
        ) VALUES (
          gen_random_uuid()::text, $1, $2, $3, $4, $5, 1, 0.1
        )
      `, [
        userId,
        JSON.stringify(adjustments),
        JSON.stringify(patterns.preferredPatterns),
        JSON.stringify(patterns.consistentlySkippedPatterns),
        JSON.stringify({
          min: patterns.difficultyPreference === 'easier' ? 1 : 5,
          max: patterns.difficultyPreference === 'harder' ? 10 : 8,
        }),
      ]);
    }
  }

  /**
   * Get learned weights for a user
   */
  async getUserWeights(userId: string): Promise<AdaptiveUserWeights | null> {
    // Check cache first
    const cached = await prescriptionCache.getUserWeights(userId);
    if (cached) return cached;

    // Query database
    const result = await queryOne<{
      weight_modifiers: ScoringWeightsV3;
      preferred_patterns: string[];
      avoided_patterns: string[];
      preferred_intensity_range: { min: number; max: number };
      samples_used: number;
      last_updated: Date;
      confidence: number;
    }>(`
      SELECT weight_modifiers, preferred_patterns, avoided_patterns,
             preferred_intensity_range, samples_used, last_updated, confidence
      FROM user_prescription_weights
      WHERE user_id = $1
    `, [userId]);

    if (!result) return null;

    const weights: AdaptiveUserWeights = {
      userId,
      weightModifiers: result.weight_modifiers,
      preferredPatterns: result.preferred_patterns as MovementPattern[],
      avoidedPatterns: result.avoided_patterns as MovementPattern[],
      preferredIntensityRange: result.preferred_intensity_range,
      samplesUsed: result.samples_used,
      lastUpdated: result.last_updated,
      confidence: result.confidence,
    };

    // Cache for future use
    await prescriptionCache.setUserWeights(userId, weights);

    return weights;
  }
}

// ============================================
// PREFERENCE MODELER
// ============================================

export class PreferenceModeler {
  /**
   * Infer user preferences from behavior
   */
  async buildPreferenceModel(userId: string): Promise<UserPreferences> {
    const [explicit, implicit, performanceData] = await Promise.all([
      this.getExplicitPreferences(userId),
      this.getImplicitPreferences(userId),
      this.getPerformanceData(userId),
    ]);

    return {
      explicit,
      implicit,
      exerciseScores: this.computeExerciseScores(explicit, implicit, performanceData),
    };
  }

  private async getExplicitPreferences(userId: string): Promise<ExplicitPreferences> {
    const result = await queryOne<any>(`
      SELECT
        favorite_exercises,
        disliked_exercises,
        preferred_equipment,
        avoided_equipment,
        preferred_session_duration
      FROM user_preferences
      WHERE user_id = $1
    `, [userId]);

    return {
      favoriteExercises: result?.favorite_exercises || [],
      dislikedExercises: result?.disliked_exercises || [],
      preferredEquipment: result?.preferred_equipment || [],
      avoidedEquipment: result?.avoided_equipment || [],
      preferredSessionDuration: result?.preferred_session_duration || 45,
    };
  }

  private async getImplicitPreferences(userId: string): Promise<ImplicitPreferences> {
    // Get exercises with high completion and good ratings
    const enjoyed = await queryAll<{ exercise_id: string }>(`
      SELECT DISTINCT uep.exercise_id
      FROM user_exercise_performance uep
      WHERE uep.user_id = $1
      AND uep.enjoyment_rating >= 4
      AND uep.total_sessions >= 3
    `, [userId]);

    // Get exercises with low completion or bad ratings
    const disliked = await queryAll<{ exercise_id: string }>(`
      SELECT DISTINCT uep.exercise_id
      FROM user_exercise_performance uep
      WHERE uep.user_id = $1
      AND (uep.enjoyment_rating <= 2 OR uep.consecutive_success_sessions = 0)
      AND uep.total_sessions >= 2
    `, [userId]);

    // Infer preferred rep range from history
    const repData = await queryOne<{ avg_reps: number, min_reps: number, max_reps: number }>(`
      SELECT
        AVG(we.reps) as avg_reps,
        MIN(we.reps) as min_reps,
        MAX(we.reps) as max_reps
      FROM workout_exercises we
      JOIN workouts w ON w.id = we.workout_id
      WHERE w.user_id = $1
      AND w.created_at > NOW() - INTERVAL '90 days'
    `, [userId]);

    return {
      actuallyEnjoyedExercises: enjoyed.map(e => e.exercise_id),
      actuallyDislikedExercises: disliked.map(e => e.exercise_id),
      optimalRepRange: {
        min: Math.round(repData?.min_reps || 6),
        max: Math.round(repData?.max_reps || 12),
      },
    };
  }

  private async getPerformanceData(userId: string): Promise<Map<string, UserExercisePerformance>> {
    const data = await queryAll<any>(`
      SELECT * FROM user_exercise_performance WHERE user_id = $1
    `, [userId]);

    return new Map(data.map(d => [d.exercise_id, {
      userId: d.user_id,
      exerciseId: d.exercise_id,
      estimated1RM: d.estimated_1rm,
      recentMaxWeight: d.recent_max_weight,
      maxWeightEver: d.max_weight_ever,
      bestRepMax: d.best_rep_max || {},
      lifetimeTotalReps: d.lifetime_total_reps,
      lifetimeTotalTonnage: d.lifetime_total_tonnage,
      monthlyVolumeTrend: d.monthly_volume_trend || [],
      formRating: d.form_rating,
      skillProgression: d.skill_progression,
      sessionsToCompetency: d.sessions_to_competency,
      enjoymentRating: d.enjoyment_rating,
      perceivedDifficulty: d.perceived_difficulty,
      jointStressExperienced: d.joint_stress_experienced,
      firstPerformedAt: d.first_performed_at,
      lastPerformedAt: d.last_performed_at,
      totalSessions: d.total_sessions,
      consecutiveSuccessSessions: d.consecutive_success_sessions,
    }]));
  }

  private computeExerciseScores(
    explicit: ExplicitPreferences,
    implicit: ImplicitPreferences,
    performance: Map<string, UserExercisePerformance>
  ): Map<string, number> {
    const scores = new Map<string, number>();

    // Explicit preferences
    for (const id of explicit.favoriteExercises) {
      scores.set(id, 10);
    }
    for (const id of explicit.dislikedExercises) {
      scores.set(id, -10);
    }

    // Implicit preferences (blend with explicit)
    for (const id of implicit.actuallyEnjoyedExercises) {
      const current = scores.get(id) || 0;
      scores.set(id, Math.min(10, current + 5));
    }
    for (const id of implicit.actuallyDislikedExercises) {
      const current = scores.get(id) || 0;
      scores.set(id, Math.max(-10, current - 5));
    }

    // Performance-based adjustments
    for (const [id, perf] of performance) {
      const current = scores.get(id) || 0;
      let adjustment = 0;

      // High enjoyment
      if (perf.enjoymentRating && perf.enjoymentRating >= 4) adjustment += 3;
      if (perf.enjoymentRating && perf.enjoymentRating <= 2) adjustment -= 3;

      // Success rate
      if (perf.consecutiveSuccessSessions >= 5) adjustment += 2;
      if (perf.consecutiveSuccessSessions === 0 && perf.totalSessions >= 3) adjustment -= 2;

      // Mastery
      if (perf.skillProgression === 'mastered') adjustment += 2;
      if (perf.skillProgression === 'learning' && perf.totalSessions > 10) adjustment -= 1;

      scores.set(id, Math.max(-10, Math.min(10, current + adjustment)));
    }

    return scores;
  }
}

// ============================================
// TYPES
// ============================================

interface FeedbackWithContext extends PrescriptionFeedback {
  exercises: any;
  difficulty: string;
  total_duration: number;
}

interface FeedbackPatterns {
  avgSatisfaction: number;
  avgCompletionRate: number;
  prefersVariety: boolean;
  consistentlyTooEasy: boolean;
  consistentlyTooHard: boolean;
  consistentlySkippedPatterns: string[];
  preferredPatterns: string[];
  typeAdherence: Record<string, number>;
  difficultyPreference: 'easier' | 'moderate' | 'harder';
}

interface ExplicitPreferences {
  favoriteExercises: string[];
  dislikedExercises: string[];
  preferredEquipment: string[];
  avoidedEquipment: string[];
  preferredSessionDuration: number;
}

interface ImplicitPreferences {
  actuallyEnjoyedExercises: string[];
  actuallyDislikedExercises: string[];
  optimalRepRange: { min: number; max: number };
}

interface UserPreferences {
  explicit: ExplicitPreferences;
  implicit: ImplicitPreferences;
  exerciseScores: Map<string, number>;
}

// ============================================
// EXPORTS
// ============================================

export const feedbackCollector = new FeedbackCollector();
export const learningSystem = new AdaptiveLearningSystem();
export const preferenceModeler = new PreferenceModeler();
