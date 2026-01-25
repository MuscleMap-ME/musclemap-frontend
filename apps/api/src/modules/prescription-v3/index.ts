/**
 * Prescription Engine v3.0
 *
 * Comprehensive exercise prescription engine with:
 * - 16-factor scoring algorithm
 * - Biomechanical compatibility
 * - Exercise-specific recovery modeling
 * - Adaptive learning from feedback
 * - Multi-layer caching
 * - Research-backed effectiveness ratings
 */

import { queryAll, queryOne } from '../../db/client';
import { loggers } from '../../lib/logger';
import { recoveryService } from '../recovery';
import type { RecoveryScore } from '../recovery/types';

// Import components
import { ScoringEngineV3, scoringEngine } from './scoring-engine';
import { LoadCalculator, loadCalculator } from './load-calculator';
import { PrescriptionBuilder, prescriptionBuilder } from './prescription-builder';
import { PrescriptionCache, prescriptionCache } from './cache';
import { feedbackCollector, learningSystem, preferenceModeler } from './learning-system';

// Import types
import type {
  ExerciseMetadataV3,
  UserContextV3,
  UserBiomechanics,
  UserTrainingProfile,
  UserHealthProfile,
  UserExercisePerformance,
  PrescriptionRequestV3,
  PrescriptionResultV3,
  ScoredExerciseV3,
  ScoreBreakdownV3,
  Goal,
  MovementPattern,
  RecoveryScoreV3,
  TrainingPhase,
} from './types';

// Re-export types
export * from './types';

const log = loggers.prescription || loggers.api;

// ============================================
// MAIN ENGINE
// ============================================

export class PrescriptionEngineV3 {
  private readonly algorithmVersion = '3.0.0';

  private scoringEngine: ScoringEngineV3;
  private loadCalculator: LoadCalculator;
  private prescriptionBuilder: PrescriptionBuilder;
  private cache: PrescriptionCache;

  constructor() {
    this.scoringEngine = scoringEngine;
    this.loadCalculator = loadCalculator;
    this.prescriptionBuilder = prescriptionBuilder;
    this.cache = prescriptionCache;
  }

  /**
   * Generate a personalized exercise prescription
   */
  async prescribe(request: PrescriptionRequestV3): Promise<PrescriptionResultV3> {
    const startTime = Date.now();
    const { userContext } = request;

    log.info({ userId: userContext.userId }, 'Generating v3 prescription');

    try {
      // Phase 1: Gather data (with caching)
      const [
        exerciseMetadata,
        userPerformance,
        muscleStats,
        recentHistory,
        recoveryScore,
        userWeights,
      ] = await Promise.all([
        this.getExerciseMetadata(),
        this.getUserPerformance(userContext.userId),
        this.getMuscleStats(userContext.userId),
        this.getRecentExerciseHistory(userContext.userId),
        this.getRecoveryScore(userContext.userId),
        learningSystem.getUserWeights(userContext.userId),
      ]);

      // Enhance user context with recovery score
      const enhancedContext: UserContextV3 = {
        ...userContext,
        recoveryScore: this.mapRecoveryScore(recoveryScore),
      };

      // Load user weights into scoring engine
      if (userWeights) {
        await this.scoringEngine.loadUserWeights(userContext.userId, userWeights);
      }

      // Phase 2: Score all exercises
      const selectedPatterns = new Set<MovementPattern>();
      const scoredExercises: ScoredExerciseV3[] = [];

      for (const exercise of exerciseMetadata) {
        const score = this.scoringEngine.scoreExercise(
          exercise,
          enhancedContext,
          userPerformance.get(exercise.id) || null,
          recentHistory,
          muscleStats,
          request.targetMuscles,
          request.excludeMuscles,
          selectedPatterns
        );

        if (score) {
          // Calculate load recommendations
          const load = this.loadCalculator.calculateLoad(
            exercise,
            enhancedContext,
            userPerformance.get(exercise.id) || null
          );

          scoredExercises.push({
            exerciseId: exercise.id,
            name: exercise.name,
            type: exercise.category,
            movementPattern: exercise.movementPattern,
            score: score.totalScore,
            scoreBreakdown: score,
            sets: load.sets,
            reps: load.reps,
            rpe: load.rpe,
            percentOf1RM: load.percentOf1RM,
            restSeconds: load.restSeconds,
            tempo: load.tempo,
            primaryMuscles: exercise.muscleActivation.primary.map(m => m.muscleId),
            secondaryMuscles: exercise.muscleActivation.secondary.map(m => m.muscleId),
            notes: load.notes,
            substitutes: [],
            reasoning: this.generateReasoning(score, enhancedContext),
          });
        }
      }

      // Sort by score
      scoredExercises.sort((a, b) => b.score - a.score);

      // Phase 3: Build prescription
      const prescription = await this.prescriptionBuilder.buildPrescription(
        scoredExercises,
        enhancedContext,
        {
          maxExercises: request.maxExercises,
          includeWarmup: request.includeWarmup ?? true,
          includeCooldown: request.includeCooldown ?? true,
          includeSupersets: request.includeSupersets ?? true,
          preferredIntensity: request.preferredIntensity,
        },
        userPerformance,
        exerciseMetadata
      );

      // Add metadata
      const generationTimeMs = Date.now() - startTime;
      const cacheMetrics = this.cache.getMetrics();

      const result: PrescriptionResultV3 = {
        ...prescription,
        metadata: {
          algorithmVersion: this.algorithmVersion,
          generatedAt: new Date().toISOString(),
          factorsConsidered: [
            'equipmentMatch', 'goalEffectiveness', 'muscleTargetMatch',
            'biomechanicalFit', 'skillAppropriate', 'userPreference',
            'performanceHistory', 'recoveryAppropriate', 'injurySafe',
            'jointStressAcceptable', 'periodizationAlignment', 'varietyOptimization',
            'movementPatternBalance', 'progressionOpportunity', 'timeEfficiency',
            'equipmentOptimization',
          ],
          recoveryScore: enhancedContext.recoveryScore?.score,
          cacheHit: cacheMetrics.hitRate > 0.5,
          generationTimeMs,
        },
      };

      // Store for feedback collection
      await this.storePrescriptionHistory(userContext.userId, result);

      log.info({
        userId: userContext.userId,
        exerciseCount: result.exercises.length,
        duration: result.actualDuration,
        generationTimeMs,
        cacheHitRate: cacheMetrics.hitRate,
      }, 'V3 prescription generated');

      return result;
    } catch (error) {
      log.error({ error, userId: userContext.userId }, 'Prescription generation failed');
      throw error;
    }
  }

  /**
   * Get exercise metadata (cached)
   */
  private async getExerciseMetadata(): Promise<ExerciseMetadataV3[]> {
    // Check cache
    const cached = await this.cache.getExerciseMetadata();
    if (cached) return cached;

    // Query database with v3 columns
    const exercises = await queryAll<any>(`
      SELECT
        id, name, aliases, type as category,
        movement_pattern_v3 as movement_pattern,
        plane, joint_actions,
        muscle_activation,
        biomechanics,
        cns_load_factor, metabolic_demand, technical_complexity,
        skill_learning_curve, balance_requirement,
        recovery_typical_soreness_hours, recovery_minimum_hours,
        recovery_muscle_factor,
        effectiveness_strength, effectiveness_hypertrophy,
        effectiveness_power, effectiveness_endurance,
        effectiveness_rehabilitation, evidence_level,
        equipment_required, equipment_optional,
        space_needed, noise_level, safe_for_home,
        progression_regressions, progression_progressions,
        progression_lateral,
        contraindicated_injuries, contraindicated_conditions,
        age_min, age_max, pregnancy_safe
      FROM exercises
      WHERE movement_pattern_v3 IS NOT NULL
    `);

    const metadata: ExerciseMetadataV3[] = exercises.map(e => ({
      id: e.id,
      name: e.name,
      aliases: e.aliases || [],
      category: e.category,
      movementPattern: e.movement_pattern,
      plane: e.plane || 'sagittal',
      jointActions: e.joint_actions || [],
      muscleActivation: e.muscle_activation || { primary: [], secondary: [], stabilizers: [] },
      biomechanics: e.biomechanics || {
        loadingPattern: 'axial',
        resistanceCurve: 'flat',
        jointStressProfile: {},
      },
      performanceMetrics: {
        cnsLoadFactor: e.cns_load_factor || 5,
        metabolicDemand: e.metabolic_demand || 5,
        technicalComplexity: e.technical_complexity || 5,
        skillLearningCurve: e.skill_learning_curve || 5,
        balanceRequirement: e.balance_requirement || 5,
      },
      recoveryProfile: {
        typicalSorenessHours: e.recovery_typical_soreness_hours || 48,
        minimumRecoveryHours: e.recovery_minimum_hours || 48,
        muscleGroupRecoveryFactor: e.recovery_muscle_factor || {},
      },
      effectiveness: {
        forStrength: e.effectiveness_strength || 5,
        forHypertrophy: e.effectiveness_hypertrophy || 5,
        forPower: e.effectiveness_power || 5,
        forEndurance: e.effectiveness_endurance || 5,
        forRehabilitation: e.effectiveness_rehabilitation || 5,
        evidenceLevel: e.evidence_level || 'moderate',
        researchCitations: [],
      },
      requirements: {
        equipment: e.equipment_required || [],
        optionalEquipment: e.equipment_optional || [],
        spaceNeeded: e.space_needed || 'moderate',
        noiseLevel: e.noise_level || 'moderate',
        safeForHome: e.safe_for_home ?? true,
      },
      progressionTree: {
        regressions: e.progression_regressions || [],
        progressions: e.progression_progressions || [],
        lateralVariations: e.progression_lateral || [],
      },
      contraindications: {
        injuryTypes: e.contraindicated_injuries || [],
        conditionTypes: e.contraindicated_conditions || [],
        ageRestrictions: e.age_min || e.age_max ? { minAge: e.age_min, maxAge: e.age_max } : undefined,
        pregnancySafe: e.pregnancy_safe ?? true,
      },
    }));

    // Cache results
    await this.cache.setExerciseMetadata(metadata);

    return metadata;
  }

  /**
   * Get user exercise performance (cached)
   */
  private async getUserPerformance(userId: string): Promise<Map<string, UserExercisePerformance>> {
    // Check cache
    const cached = await this.cache.getUserPerformance(userId);
    if (cached) return cached;

    // Query database
    const performances = await queryAll<any>(`
      SELECT * FROM user_exercise_performance WHERE user_id = $1
    `, [userId]);

    const map = new Map<string, UserExercisePerformance>();
    for (const p of performances) {
      map.set(p.exercise_id, {
        userId: p.user_id,
        exerciseId: p.exercise_id,
        estimated1RM: p.estimated_1rm,
        recentMaxWeight: p.recent_max_weight,
        maxWeightEver: p.max_weight_ever,
        bestRepMax: p.best_rep_max || {},
        lifetimeTotalReps: p.lifetime_total_reps || 0,
        lifetimeTotalTonnage: p.lifetime_total_tonnage || 0,
        monthlyVolumeTrend: p.monthly_volume_trend || [],
        formRating: p.form_rating,
        skillProgression: p.skill_progression || 'learning',
        sessionsToCompetency: p.sessions_to_competency,
        enjoymentRating: p.enjoyment_rating,
        perceivedDifficulty: p.perceived_difficulty,
        jointStressExperienced: p.joint_stress_experienced,
        firstPerformedAt: p.first_performed_at,
        lastPerformedAt: p.last_performed_at,
        totalSessions: p.total_sessions || 0,
        consecutiveSuccessSessions: p.consecutive_success_sessions || 0,
      });
    }

    // Cache results
    await this.cache.setUserPerformance(userId, map);

    return map;
  }

  /**
   * Get muscle training stats (cached)
   */
  private async getMuscleStats(userId: string): Promise<Record<string, number>> {
    // Check cache
    const cached = await this.cache.getMuscleStats(userId);
    if (cached) return cached;

    // Query database
    const stats = await queryAll<{ muscle_id: string; total_volume: number }>(`
      SELECT
        ea.muscle_id,
        SUM(we.sets * we.reps * COALESCE(we.weight, 1) * (ea.activation / 100.0)) as total_volume
      FROM workout_exercises we
      JOIN workouts w ON w.id = we.workout_id
      JOIN exercise_activations ea ON ea.exercise_id = we.exercise_id
      WHERE w.user_id = $1
      AND w.created_at > NOW() - INTERVAL '14 days'
      GROUP BY ea.muscle_id
    `, [userId]);

    const muscleMap: Record<string, number> = {};
    for (const stat of stats) {
      muscleMap[stat.muscle_id] = stat.total_volume;
    }

    // Cache results
    await this.cache.setMuscleStats(userId, muscleMap);

    return muscleMap;
  }

  /**
   * Get recent exercise history
   */
  private async getRecentExerciseHistory(userId: string): Promise<Map<string, Date>> {
    const history = await queryAll<{ exercise_id: string; last_performed: Date }>(`
      SELECT
        we.exercise_id,
        MAX(w.created_at) as last_performed
      FROM workout_exercises we
      JOIN workouts w ON w.id = we.workout_id
      WHERE w.user_id = $1
      AND w.created_at > NOW() - INTERVAL '30 days'
      GROUP BY we.exercise_id
    `, [userId]);

    return new Map(history.map(h => [h.exercise_id, h.last_performed]));
  }

  /**
   * Get recovery score from recovery service
   */
  private async getRecoveryScore(userId: string): Promise<RecoveryScore | null> {
    try {
      return await recoveryService.getRecoveryScore(userId);
    } catch {
      return null;
    }
  }

  /**
   * Map recovery service score to v3 format
   */
  private mapRecoveryScore(score: RecoveryScore | null): RecoveryScoreV3 | undefined {
    if (!score) return undefined;

    return {
      score: score.score,
      classification: score.classification as any,
      recommendedIntensity: score.recommendedIntensity,
      factors: {
        sleepQuality: 0,
        muscleReadiness: 0,
        stressLevel: 0,
        previousWorkoutIntensity: 0,
      },
    };
  }

  /**
   * Generate human-readable reasoning for exercise selection
   */
  private generateReasoning(score: ScoreBreakdownV3, context: UserContextV3): string {
    const reasons: string[] = [];

    if (score.goalEffectiveness >= 12) {
      reasons.push(`Highly effective for ${context.goals[0]}`);
    }

    if (score.biomechanicalFit >= 7) {
      reasons.push('Well-suited to your body proportions');
    }

    if (score.recoveryAppropriate >= 7) {
      reasons.push('Recovery-appropriate timing');
    }

    if (score.progressionOpportunity > 3) {
      reasons.push('Good opportunity for progression');
    }

    if (score.varietyOptimization >= 2) {
      reasons.push('Adds beneficial variety');
    }

    return reasons.join('. ') || 'Balanced selection';
  }

  /**
   * Store prescription for feedback collection
   */
  private async storePrescriptionHistory(
    userId: string,
    result: PrescriptionResultV3
  ): Promise<void> {
    try {
      await queryOne(`
        INSERT INTO prescription_history (
          id, user_id, exercises, warmup, cooldown,
          total_duration, muscle_coverage, periodization_phase,
          difficulty, algorithm_version
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      `, [
        result.id,
        userId,
        JSON.stringify(result.exercises),
        JSON.stringify(result.warmup),
        JSON.stringify(result.cooldown),
        result.actualDuration,
        JSON.stringify(result.muscleCoverage),
        result.periodizationPhase || null,
        result.difficulty,
        this.algorithmVersion,
      ]);
    } catch (error) {
      log.warn({ error }, 'Failed to store prescription history');
    }
  }

  /**
   * Get cache metrics for monitoring
   */
  getCacheMetrics() {
    return this.cache.getMetrics();
  }

  /**
   * Invalidate caches on event
   */
  async invalidateOnEvent(event: string, userId?: string) {
    await this.cache.invalidateOn(event, userId);
  }
}

// ============================================
// EXPORTS
// ============================================

// Export singleton engine
export const prescriptionEngineV3 = new PrescriptionEngineV3();

// Export components
export {
  scoringEngine,
  loadCalculator,
  prescriptionBuilder,
  prescriptionCache,
  feedbackCollector,
  learningSystem,
  preferenceModeler,
};

// Export classes for extension
export {
  ScoringEngineV3,
  LoadCalculator,
  PrescriptionBuilder,
  PrescriptionCache,
};
