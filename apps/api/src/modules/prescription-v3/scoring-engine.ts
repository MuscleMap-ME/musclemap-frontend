/**
 * Prescription Engine v3.0 - Scoring Engine
 *
 * 16-factor scoring algorithm with:
 * - Biomechanical compatibility
 * - Exercise-specific recovery modeling
 * - Research-backed effectiveness ratings
 * - Adaptive user weights from learning system
 */

import type {
  ExerciseMetadataV3,
  UserContextV3,
  UserBiomechanics,
  UserExercisePerformance,
  UserHealthProfile,
  ScoringWeightsV3,
  ScoringBonus,
  ScoreBreakdownV3,
  Goal,
  MovementPattern,
  RecoveryScoreV3,
  TrainingPhase,
  AdaptiveUserWeights,
} from './types';

// ============================================
// DEFAULT SCORING WEIGHTS
// ============================================

const DEFAULT_WEIGHTS: ScoringWeightsV3 = {
  // Core Factors (50 points)
  equipmentMatch: 25,
  goalEffectiveness: 15,
  muscleTargetMatch: 10,

  // Personalization (25 points)
  biomechanicalFit: 8,
  skillAppropriate: 7,
  userPreference: 5,
  performanceHistory: 5,

  // Recovery & Safety (20 points)
  recoveryAppropriate: 8,
  injurySafe: 7,
  jointStressAcceptable: 5,

  // Periodization & Variety (10 points)
  periodizationAlignment: 4,
  varietyOptimization: 3,
  movementPatternBalance: 3,
};

// Goal-specific weight adjustments
const GOAL_WEIGHT_ADJUSTMENTS: Partial<Record<Goal, Partial<ScoringWeightsV3>>> = {
  strength: {
    goalEffectiveness: 20,
    skillAppropriate: 10,
    performanceHistory: 8,
  },
  hypertrophy: {
    goalEffectiveness: 18,
    varietyOptimization: 6,
    muscleTargetMatch: 12,
  },
  fat_loss: {
    recoveryAppropriate: 5,
    varietyOptimization: 5,
  },
  rehabilitation: {
    injurySafe: 15,
    jointStressAcceptable: 10,
    skillAppropriate: 3,
  },
  power: {
    goalEffectiveness: 18,
    skillAppropriate: 10,
    recoveryAppropriate: 10,
  },
};

// Effectiveness matrix by goal - only numeric effectiveness ratings
type NumericEffectivenessKey = 'forStrength' | 'forHypertrophy' | 'forPower' | 'forEndurance' | 'forRehabilitation';

const GOAL_EFFECTIVENESS_MAP: Record<Goal, NumericEffectivenessKey> = {
  strength: 'forStrength',
  hypertrophy: 'forHypertrophy',
  endurance: 'forEndurance',
  power: 'forPower',
  fat_loss: 'forEndurance', // Use endurance as proxy
  rehabilitation: 'forRehabilitation',
  flexibility: 'forRehabilitation',
  athletic: 'forPower',
};

// ============================================
// SCORING ENGINE
// ============================================

export class ScoringEngineV3 {
  private userWeightsCache = new Map<string, AdaptiveUserWeights>();

  /**
   * Score a single exercise for a user context
   */
  scoreExercise(
    exercise: ExerciseMetadataV3,
    userContext: UserContextV3,
    userPerformance: UserExercisePerformance | null,
    recentHistory: Map<string, Date>,
    muscleStats: Record<string, number>,
    targetMuscles?: string[],
    excludeMuscles?: string[],
    selectedPatterns?: Set<MovementPattern>
  ): ScoreBreakdownV3 | null {
    // Get weights for this user (default + goal adjustments + learned)
    const weights = this.getWeightsForUser(userContext);

    const breakdown: Partial<ScoreBreakdownV3> = {};

    // =============================================
    // CORE FACTORS (50 points)
    // =============================================

    // 1. Equipment Match (binary - must have)
    const hasEquipment = this.checkEquipmentMatch(exercise, userContext.equipment);
    if (!hasEquipment) return null; // Skip exercise entirely
    breakdown.equipmentMatch = weights.equipmentMatch;

    // 2. Goal Effectiveness (0-15)
    breakdown.goalEffectiveness = this.calculateGoalEffectiveness(
      exercise,
      userContext.goals,
      weights.goalEffectiveness
    );

    // 3. Muscle Target Match (0-10)
    breakdown.muscleTargetMatch = this.calculateMuscleTargetMatch(
      exercise,
      targetMuscles,
      excludeMuscles,
      muscleStats,
      weights.muscleTargetMatch
    );

    // =============================================
    // PERSONALIZATION FACTORS (25 points)
    // =============================================

    // 4. Biomechanical Fit (0-8)
    breakdown.biomechanicalFit = this.calculateBiomechanicalFit(
      exercise,
      userContext.biomechanics,
      weights.biomechanicalFit
    );

    // 5. Skill Appropriate (0-7)
    breakdown.skillAppropriate = this.calculateSkillAppropriate(
      exercise,
      userContext.trainingProfile?.experienceLevel || 'intermediate',
      userContext.trainingProfile?.technicalProficiency || {},
      weights.skillAppropriate
    );

    // 6. User Preference (0-5)
    breakdown.userPreference = this.calculateUserPreference(
      exercise,
      userPerformance,
      weights.userPreference
    );

    // 7. Performance History (0-5)
    breakdown.performanceHistory = this.calculatePerformanceHistory(
      exercise,
      userPerformance,
      weights.performanceHistory
    );

    // =============================================
    // RECOVERY & SAFETY (20 points)
    // =============================================

    // 8. Recovery Appropriate (0-8)
    breakdown.recoveryAppropriate = this.calculateRecoveryAppropriate(
      exercise,
      userContext.recoveryScore,
      recentHistory.get(exercise.id),
      weights.recoveryAppropriate
    );

    // 9. Injury Safe (0-7 or -100)
    breakdown.injurySafe = this.calculateInjurySafe(
      exercise,
      userContext.healthProfile,
      weights.injurySafe
    );
    if (breakdown.injurySafe < -50) return null; // Absolute contraindication

    // 10. Joint Stress Acceptable (0-5)
    breakdown.jointStressAcceptable = this.calculateJointStressAcceptable(
      exercise,
      userContext.healthProfile,
      userPerformance,
      weights.jointStressAcceptable
    );

    // =============================================
    // PERIODIZATION & VARIETY (10 points)
    // =============================================

    // 11. Periodization Alignment (0-4)
    breakdown.periodizationAlignment = this.calculatePeriodizationAlignment(
      exercise,
      userContext.currentPhase,
      weights.periodizationAlignment
    );

    // 12. Variety Optimization (0-3)
    breakdown.varietyOptimization = this.calculateVarietyOptimization(
      exercise,
      userPerformance,
      recentHistory.get(exercise.id),
      weights.varietyOptimization
    );

    // 13. Movement Pattern Balance (0-3)
    breakdown.movementPatternBalance = this.calculateMovementPatternBalance(
      exercise,
      selectedPatterns,
      weights.movementPatternBalance
    );

    // =============================================
    // BONUS FACTORS (-10 to +10)
    // =============================================

    // 14. Progression Opportunity (-5 to +5)
    breakdown.progressionOpportunity = this.calculateProgressionOpportunity(
      exercise,
      userPerformance,
      userContext.goals
    );

    // 15. Time Efficiency (-3 to +3)
    breakdown.timeEfficiency = this.calculateTimeEfficiency(
      exercise,
      userContext.timeAvailable
    );

    // 16. Equipment Optimization (-2 to +2)
    breakdown.equipmentOptimization = this.calculateEquipmentOptimization(
      exercise,
      userContext.equipment
    );

    // Calculate total score
    const totalScore = Object.values(breakdown).reduce((sum, val) => sum + (val || 0), 0);

    return {
      ...breakdown as ScoreBreakdownV3,
      totalScore,
    };
  }

  /**
   * Get scoring weights for a user (defaults + goal adjustments + learned)
   */
  private getWeightsForUser(userContext: UserContextV3): ScoringWeightsV3 {
    let weights = { ...DEFAULT_WEIGHTS };

    // Apply goal-specific adjustments
    for (const goal of userContext.goals) {
      const adjustments = GOAL_WEIGHT_ADJUSTMENTS[goal];
      if (adjustments) {
        weights = { ...weights, ...adjustments };
      }
    }

    // Apply learned user weights if available
    const userWeights = this.userWeightsCache.get(userContext.userId);
    if (userWeights?.weightModifiers) {
      weights = { ...weights, ...userWeights.weightModifiers };
    }

    return weights;
  }

  /**
   * Check if user has required equipment
   */
  private checkEquipmentMatch(exercise: ExerciseMetadataV3, userEquipment: string[]): boolean {
    const required = exercise.requirements.equipment || [];
    if (required.length === 0) return true;
    return required.every(eq => userEquipment.includes(eq));
  }

  /**
   * Calculate goal effectiveness score based on research-backed ratings
   */
  private calculateGoalEffectiveness(
    exercise: ExerciseMetadataV3,
    goals: Goal[],
    maxScore: number
  ): number {
    if (goals.length === 0) return maxScore * 0.5;

    let totalEffectiveness = 0;
    for (const goal of goals) {
      const effectivenessKey = GOAL_EFFECTIVENESS_MAP[goal];
      const rating = exercise.effectiveness[effectivenessKey] || 5;
      totalEffectiveness += rating;
    }

    const avgEffectiveness = totalEffectiveness / goals.length;
    return Math.round((avgEffectiveness / 10) * maxScore);
  }

  /**
   * Calculate muscle target match score
   */
  private calculateMuscleTargetMatch(
    exercise: ExerciseMetadataV3,
    targetMuscles: string[] | undefined,
    excludeMuscles: string[] | undefined,
    muscleStats: Record<string, number>,
    maxScore: number
  ): number {
    const primaryMuscles = exercise.muscleActivation.primary.map(m => m.muscleId);

    // Exclude penalty
    if (excludeMuscles?.some(m => primaryMuscles.includes(m))) {
      return -50;
    }

    // Target match bonus
    if (targetMuscles?.length) {
      const matches = primaryMuscles.filter(m => targetMuscles.includes(m)).length;
      if (matches === 0) return 0;
      return Math.round((matches / targetMuscles.length) * maxScore);
    }

    // Muscle imbalance correction
    const volumes = Object.values(muscleStats);
    if (volumes.length === 0) return maxScore * 0.5;

    const avgVolume = volumes.reduce((a, b) => a + b, 0) / volumes.length;
    let imbalanceBonus = 0;

    for (const muscle of primaryMuscles) {
      const volume = muscleStats[muscle] || 0;
      if (volume < avgVolume * 0.7) {
        imbalanceBonus += maxScore / primaryMuscles.length;
      } else if (volume > avgVolume * 1.3) {
        imbalanceBonus -= 2;
      }
    }

    return Math.max(0, Math.min(maxScore, Math.round(imbalanceBonus)));
  }

  /**
   * Calculate biomechanical fit score based on user proportions and mobility
   */
  private calculateBiomechanicalFit(
    exercise: ExerciseMetadataV3,
    biomechanics: UserBiomechanics | undefined,
    maxScore: number
  ): number {
    if (!biomechanics) return maxScore * 0.75; // Assume average fit

    let score = maxScore;

    // Femur length affects squat mechanics
    if (exercise.movementPattern === 'squat' && biomechanics.femurLengthRelative) {
      if (biomechanics.femurLengthRelative === 'long') {
        // Long femurs = harder squats, prefer variations
        if (exercise.name.toLowerCase().includes('high bar')) score -= 3;
        if (exercise.name.toLowerCase().includes('front squat')) score -= 4;
        if (exercise.name.toLowerCase().includes('low bar')) score += 2;
        if (exercise.name.toLowerCase().includes('box')) score += 3;
        if (exercise.name.toLowerCase().includes('hack')) score += 2;
      }
    }

    // Arm span affects pressing movements
    if (exercise.movementPattern === 'horizontal_push' && biomechanics.armSpanCm && biomechanics.heightCm) {
      const armSpanRatio = biomechanics.armSpanCm / biomechanics.heightCm;
      if (armSpanRatio > 1.05) { // Long arms
        if (exercise.name.toLowerCase().includes('bench press')) score -= 2;
        if (exercise.name.toLowerCase().includes('floor press')) score += 2;
        if (exercise.name.toLowerCase().includes('board')) score += 3;
      }
    }

    // Mobility affects overhead movements
    if (exercise.movementPattern === 'vertical_push' && biomechanics.mobilityProfile) {
      const shoulderFlexion = biomechanics.mobilityProfile.shoulderFlexion || 180;
      if (shoulderFlexion < 170) {
        score -= 4;
        if (exercise.name.toLowerCase().includes('landmine')) score += 3;
      }

      const thoracicExtension = biomechanics.mobilityProfile.thoracicExtension || 40;
      if (thoracicExtension < 30) {
        score -= 3;
      }
    }

    // Ankle mobility affects squats
    if (exercise.movementPattern === 'squat' && biomechanics.mobilityProfile) {
      const ankleDorsiflexion = biomechanics.mobilityProfile.ankleFlexion || 40;
      if (ankleDorsiflexion < 35) {
        if (exercise.requirements.equipment.includes('heeled_shoes')) score += 2;
        if (exercise.name.toLowerCase().includes('goblet')) score -= 2;
        if (exercise.name.toLowerCase().includes('box')) score += 2;
      }
    }

    return Math.max(0, Math.min(maxScore, score));
  }

  /**
   * Calculate skill appropriateness score
   */
  private calculateSkillAppropriate(
    exercise: ExerciseMetadataV3,
    experienceLevel: string,
    proficiency: Partial<Record<MovementPattern, number>>,
    maxScore: number
  ): number {
    const levelMap: Record<string, number> = {
      beginner: 1,
      intermediate: 2,
      advanced: 3,
      elite: 4,
    };

    const userLevel = levelMap[experienceLevel] || 2;
    const exerciseComplexity = exercise.performanceMetrics.technicalComplexity;

    // Check pattern-specific proficiency
    const patternProficiency = proficiency[exercise.movementPattern] || 3;

    // Calculate complexity match
    const complexityDiff = (userLevel + patternProficiency) / 2 - (exerciseComplexity / 2);

    if (complexityDiff < -2) return -10; // Way too advanced
    if (complexityDiff < -1) return Math.round(maxScore * 0.3); // Challenging
    if (complexityDiff < 0) return Math.round(maxScore * 0.6); // Appropriate challenge
    if (complexityDiff === 0) return maxScore; // Perfect match
    return Math.round(maxScore * 0.8); // Slightly easy

  }

  /**
   * Calculate user preference score based on past feedback
   */
  private calculateUserPreference(
    exercise: ExerciseMetadataV3,
    performance: UserExercisePerformance | null,
    maxScore: number
  ): number {
    if (!performance) return maxScore * 0.5; // Neutral for new exercises

    const enjoyment = performance.enjoymentRating || 3;
    return Math.round(((enjoyment - 1) / 4) * maxScore);
  }

  /**
   * Calculate performance history score
   */
  private calculatePerformanceHistory(
    exercise: ExerciseMetadataV3,
    performance: UserExercisePerformance | null,
    maxScore: number
  ): number {
    if (!performance) return maxScore * 0.5;

    let score = maxScore * 0.5;

    // Bonus for mastered exercises
    if (performance.skillProgression === 'mastered') score += maxScore * 0.3;
    if (performance.skillProgression === 'proficient') score += maxScore * 0.2;

    // Bonus for high completion rate
    if (performance.consecutiveSuccessSessions >= 5) score += maxScore * 0.2;

    return Math.min(maxScore, score);
  }

  /**
   * Calculate recovery appropriateness score
   */
  private calculateRecoveryAppropriate(
    exercise: ExerciseMetadataV3,
    recoveryScore: RecoveryScoreV3 | undefined,
    lastPerformed: Date | undefined,
    maxScore: number
  ): number {
    let score = maxScore;

    // Check time since last performance
    if (lastPerformed) {
      const hoursSince = (Date.now() - lastPerformed.getTime()) / (1000 * 60 * 60);
      const minRecovery = exercise.recoveryProfile.minimumRecoveryHours;

      if (hoursSince < minRecovery * 0.5) {
        return 0; // Too soon
      } else if (hoursSince < minRecovery) {
        score = Math.round(maxScore * (hoursSince / minRecovery) * 0.5);
      }
    }

    // Adjust for global recovery state
    if (recoveryScore) {
      const cnsLoad = exercise.performanceMetrics.cnsLoadFactor;

      if (recoveryScore.classification === 'poor') {
        if (cnsLoad >= 8) score -= 6; // Heavy exercises bad when tired
        if (cnsLoad <= 3) score += 2; // Light exercises good
      } else if (recoveryScore.classification === 'fair') {
        if (cnsLoad >= 8) score -= 3;
      } else if (recoveryScore.classification === 'excellent') {
        if (cnsLoad >= 7) score += 2; // Ready for heavy work
      }
    }

    return Math.max(0, Math.min(maxScore, score));
  }

  /**
   * Calculate injury safety score
   */
  private calculateInjurySafe(
    exercise: ExerciseMetadataV3,
    healthProfile: UserHealthProfile | undefined,
    maxScore: number
  ): number {
    if (!healthProfile) return maxScore;

    // Check contraindicated movements
    const contraindicated = new Set(healthProfile.contraindications || []);
    if (contraindicated.has(exercise.movementPattern)) {
      return -100; // Absolute contraindication
    }

    // Check specific injury contraindications
    for (const injury of healthProfile.activeInjuries) {
      if (exercise.contraindications.injuryTypes.includes(injury.injuryProfileId)) {
        if (injury.severity === 'severe') return -100;
        if (injury.severity === 'moderate') return -50;
        return Math.round(maxScore * 0.3);
      }

      // Check if movement is contraindicated for this injury
      if (injury.contraindicatedMovements.includes(exercise.movementPattern)) {
        if (injury.severity === 'severe') return -100;
        if (injury.severity === 'moderate') return -30;
      }
    }

    // Check age restrictions
    if (exercise.contraindications.ageRestrictions) {
      const age = healthProfile.age;
      const { minAge, maxAge } = exercise.contraindications.ageRestrictions;
      if ((minAge && age < minAge) || (maxAge && age > maxAge)) {
        return Math.round(maxScore * 0.3);
      }
    }

    // Rehab exercises bonus for injured users
    if (exercise.effectiveness.forRehabilitation >= 7 && healthProfile.activeInjuries.length > 0) {
      return maxScore + 5;
    }

    return maxScore;
  }

  /**
   * Calculate joint stress acceptability
   */
  private calculateJointStressAcceptable(
    exercise: ExerciseMetadataV3,
    healthProfile: UserHealthProfile | undefined,
    performance: UserExercisePerformance | null,
    maxScore: number
  ): number {
    let score = maxScore;

    // Check user's historical joint stress feedback
    if (performance?.jointStressExperienced) {
      if (performance.jointStressExperienced >= 4) {
        score -= maxScore * 0.5; // User has reported high stress
      } else if (performance.jointStressExperienced >= 3) {
        score -= maxScore * 0.2;
      }
    }

    // Check joint stress profile against active injuries
    if (healthProfile?.activeInjuries) {
      for (const injury of healthProfile.activeInjuries) {
        for (const joint of injury.affectedJoints) {
          const stressLevel = exercise.biomechanics.jointStressProfile[joint];
          if (stressLevel === 'high') {
            if (injury.severity === 'severe') return -50;
            if (injury.severity === 'moderate') score -= maxScore * 0.5;
          } else if (stressLevel === 'moderate') {
            if (injury.severity === 'severe') score -= maxScore * 0.4;
          }
        }
      }
    }

    return Math.max(0, score);
  }

  /**
   * Calculate periodization alignment score
   */
  private calculatePeriodizationAlignment(
    exercise: ExerciseMetadataV3,
    phase: TrainingPhase | undefined,
    maxScore: number
  ): number {
    if (!phase) return maxScore * 0.5;

    const cnsLoad = exercise.performanceMetrics.cnsLoadFactor;
    const complexity = exercise.performanceMetrics.technicalComplexity;

    switch (phase) {
      case 'accumulation':
        // High volume, moderate intensity - prefer moderate exercises
        if (cnsLoad >= 4 && cnsLoad <= 7) return maxScore;
        if (cnsLoad < 4) return Math.round(maxScore * 0.7);
        return Math.round(maxScore * 0.5);

      case 'intensification':
        // Moderate volume, high intensity - prefer heavy compounds
        if (cnsLoad >= 7) return maxScore;
        if (cnsLoad >= 5) return Math.round(maxScore * 0.7);
        return Math.round(maxScore * 0.3);

      case 'realization':
        // Low volume, peak intensity - heavy compounds only
        if (cnsLoad >= 8 && complexity >= 6) return maxScore;
        if (cnsLoad >= 7) return Math.round(maxScore * 0.5);
        return 0;

      case 'deload':
        // Low everything - prefer low-stress exercises
        if (cnsLoad <= 4) return maxScore;
        if (cnsLoad <= 6) return Math.round(maxScore * 0.5);
        return 0;

      case 'maintenance':
        // Balanced - slight preference for proven exercises
        return Math.round(maxScore * 0.7);

      default:
        return Math.round(maxScore * 0.5);
    }
  }

  /**
   * Calculate variety optimization score
   */
  private calculateVarietyOptimization(
    exercise: ExerciseMetadataV3,
    performance: UserExercisePerformance | null,
    lastPerformed: Date | undefined,
    maxScore: number
  ): number {
    // New exercise bonus
    if (!performance) return maxScore;

    // Check staleness
    const totalSessions = performance.totalSessions || 0;
    if (totalSessions > 20) return 0; // Overused
    if (totalSessions > 10) return Math.round(maxScore * 0.3);
    if (totalSessions > 5) return Math.round(maxScore * 0.6);

    // Recent use penalty
    if (lastPerformed) {
      const daysSince = (Date.now() - lastPerformed.getTime()) / (1000 * 60 * 60 * 24);
      if (daysSince < 3) return Math.round(maxScore * 0.3);
      if (daysSince < 7) return Math.round(maxScore * 0.5);
    }

    return Math.round(maxScore * 0.8);
  }

  /**
   * Calculate movement pattern balance score
   */
  private calculateMovementPatternBalance(
    exercise: ExerciseMetadataV3,
    selectedPatterns: Set<MovementPattern> | undefined,
    maxScore: number
  ): number {
    if (!selectedPatterns || selectedPatterns.size === 0) return maxScore;

    // Bonus for introducing new pattern
    if (!selectedPatterns.has(exercise.movementPattern)) {
      return maxScore;
    }

    // Penalty for overusing pattern
    const patternCount = Array.from(selectedPatterns).filter(p => p === exercise.movementPattern).length;
    if (patternCount >= 2) return 0;
    return Math.round(maxScore * 0.5);
  }

  /**
   * Calculate progression opportunity score
   */
  private calculateProgressionOpportunity(
    exercise: ExerciseMetadataV3,
    performance: UserExercisePerformance | null,
    goals: Goal[]
  ): number {
    if (!performance) return 0; // Neutral for new exercises

    // Check if user has been stuck
    if (performance.consecutiveSuccessSessions >= 5) {
      // Consider switching to a variation
      return -2;
    }

    // Check strength progression for strength goals
    if (goals.includes('strength') && performance.estimated1RM) {
      const volumeTrend = performance.monthlyVolumeTrend;
      if (volumeTrend.length >= 2) {
        const lastTwo = volumeTrend.slice(-2);
        if (lastTwo[1].volume > lastTwo[0].volume) {
          return 5; // Progressing well
        }
        if (lastTwo[1].volume < lastTwo[0].volume * 0.9) {
          return -3; // Regressing
        }
      }
    }

    // Enjoyment factor
    if (performance.enjoymentRating && performance.enjoymentRating >= 4) return 3;
    if (performance.enjoymentRating && performance.enjoymentRating <= 2) return -2;

    return 0;
  }

  /**
   * Calculate time efficiency score (superset potential, setup time)
   */
  private calculateTimeEfficiency(
    exercise: ExerciseMetadataV3,
    timeAvailable: number
  ): number {
    const setupComplexity = exercise.performanceMetrics.technicalComplexity;

    if (timeAvailable < 30) {
      // Short sessions - penalize complex setup
      if (setupComplexity >= 8) return -3;
      if (setupComplexity <= 3) return 3;
    }

    // Superset potential (low CNS load = good for supersets)
    if (exercise.performanceMetrics.cnsLoadFactor <= 4) {
      return 2;
    }

    return 0;
  }

  /**
   * Calculate equipment optimization score
   */
  private calculateEquipmentOptimization(
    exercise: ExerciseMetadataV3,
    userEquipment: string[]
  ): number {
    const required = exercise.requirements.equipment;
    const optional = exercise.requirements.optionalEquipment || [];

    // Bonus for using available optional equipment
    const usedOptional = optional.filter(eq => userEquipment.includes(eq)).length;
    if (usedOptional > 0) return 2;

    // Slight bonus for minimal equipment (less switching)
    if (required.length <= 1) return 1;

    return 0;
  }

  /**
   * Load user adaptive weights from cache or database
   */
  async loadUserWeights(userId: string, weights: AdaptiveUserWeights | null): Promise<void> {
    if (weights) {
      this.userWeightsCache.set(userId, weights);
    }
  }

  /**
   * Clear user weights from cache
   */
  clearUserWeights(userId: string): void {
    this.userWeightsCache.delete(userId);
  }
}

// Export singleton
export const scoringEngine = new ScoringEngineV3();
