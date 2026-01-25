/**
 * Prescription Engine v3.0 - Load Calculator
 *
 * Calculates optimal sets, reps, RPE, and rest periods based on:
 * - User goals and training phase
 * - Exercise type and CNS load
 * - User's performance history
 * - Current recovery state
 * - Research-backed loading protocols
 */

import type {
  ExerciseMetadataV3,
  UserExercisePerformance,
  UserContextV3,
  Goal,
  TrainingPhase,
  RecoveryScoreV3,
} from './types';

// ============================================
// LOAD RECOMMENDATION TYPES
// ============================================

export interface LoadRecommendation {
  sets: number;
  reps: number | string; // Can be "8-12" for ranges
  rpe: number;
  percentOf1RM?: number;
  restSeconds: number;
  tempo?: string; // "3-1-2-0" (eccentric-pause-concentric-pause)
  notes: string[];
}

interface BaseLoadParams {
  sets: number;
  reps: number | string;
  rpe: number;
  rest: number;
}

// ============================================
// GOAL-BASED LOADING PARAMETERS
// ============================================

const GOAL_LOAD_PARAMS: Record<Goal, BaseLoadParams> = {
  strength: { sets: 4, reps: 5, rpe: 8, rest: 180 },
  hypertrophy: { sets: 3, reps: '8-12', rpe: 7.5, rest: 90 },
  endurance: { sets: 3, reps: '15-20', rpe: 7, rest: 45 },
  power: { sets: 5, reps: 3, rpe: 8, rest: 180 },
  fat_loss: { sets: 3, reps: '12-15', rpe: 7, rest: 30 },
  rehabilitation: { sets: 2, reps: '12-15', rpe: 5, rest: 60 },
  flexibility: { sets: 2, reps: '30s', rpe: 4, rest: 30 },
  athletic: { sets: 4, reps: 5, rpe: 8, rest: 120 },
};

// Phase modifiers
const PHASE_MODIFIERS: Record<TrainingPhase, {
  volumeMod: number;
  intensityMod: number;
  restMod: number;
}> = {
  accumulation: { volumeMod: 1.2, intensityMod: 0.9, restMod: 0.9 },
  intensification: { volumeMod: 0.9, intensityMod: 1.1, restMod: 1.1 },
  realization: { volumeMod: 0.6, intensityMod: 1.2, restMod: 1.2 },
  deload: { volumeMod: 0.5, intensityMod: 0.7, restMod: 1.0 },
  maintenance: { volumeMod: 0.8, intensityMod: 1.0, restMod: 1.0 },
};

// RPE to % of 1RM lookup (based on research)
const RPE_TO_PERCENT_1RM: Record<number, Record<number, number>> = {
  // reps: { rpe: percent }
  1: { 10: 100, 9.5: 97.8, 9: 95.5, 8.5: 93.9, 8: 92.2, 7.5: 90.7, 7: 89.2, 6.5: 87.6, 6: 86.3 },
  2: { 10: 95.5, 9.5: 93.9, 9: 92.2, 8.5: 90.7, 8: 89.2, 7.5: 87.6, 7: 86.3, 6.5: 85, 6: 83.7 },
  3: { 10: 92.2, 9.5: 90.7, 9: 89.2, 8.5: 87.6, 8: 86.3, 7.5: 85, 7: 83.7, 6.5: 82.4, 6: 81.1 },
  4: { 10: 89.2, 9.5: 87.6, 9: 86.3, 8.5: 85, 8: 83.7, 7.5: 82.4, 7: 81.1, 6.5: 79.9, 6: 78.6 },
  5: { 10: 86.3, 9.5: 85, 9: 83.7, 8.5: 82.4, 8: 81.1, 7.5: 79.9, 7: 78.6, 6.5: 77.4, 6: 76.2 },
  6: { 10: 83.7, 9.5: 82.4, 9: 81.1, 8.5: 79.9, 8: 78.6, 7.5: 77.4, 7: 76.2, 6.5: 75, 6: 73.9 },
  8: { 10: 78.6, 9.5: 77.4, 9: 76.2, 8.5: 75, 8: 73.9, 7.5: 72.3, 7: 70.7, 6.5: 69.4, 6: 68 },
  10: { 10: 73.9, 9.5: 72.3, 9: 70.7, 8.5: 69.4, 8: 68, 7.5: 66.7, 7: 65.3, 6.5: 64, 6: 62.6 },
  12: { 10: 70.7, 9.5: 69.4, 9: 68, 8.5: 66.7, 8: 65.3, 7.5: 64, 7: 62.6, 6.5: 61.3, 6: 60 },
  15: { 10: 65.3, 9.5: 64, 9: 62.6, 8.5: 61.3, 8: 60, 7.5: 58.6, 7: 57.4, 6.5: 56.1, 6: 55 },
};

// ============================================
// LOAD CALCULATOR CLASS
// ============================================

export class LoadCalculator {
  /**
   * Calculate optimal load parameters for an exercise
   */
  calculateLoad(
    exercise: ExerciseMetadataV3,
    userContext: UserContextV3,
    userPerformance: UserExercisePerformance | null
  ): LoadRecommendation {
    // Get primary goal
    const primaryGoal = userContext.goals[0] || 'hypertrophy';

    // Get base parameters for goal
    const baseParams = { ...GOAL_LOAD_PARAMS[primaryGoal] };

    // Apply phase modifiers
    if (userContext.currentPhase) {
      const mods = PHASE_MODIFIERS[userContext.currentPhase];
      baseParams.sets = Math.round(baseParams.sets * mods.volumeMod);
      if (typeof baseParams.reps === 'number') {
        baseParams.reps = Math.round(baseParams.reps);
      }
      baseParams.rpe = Math.min(10, baseParams.rpe * mods.intensityMod);
      baseParams.rest = Math.round(baseParams.rest * mods.restMod);
    }

    // Apply recovery adjustments
    const recoveryAdjusted = this.adjustForRecovery(baseParams, userContext.recoveryScore);

    // Apply exercise-specific adjustments
    const exerciseAdjusted = this.adjustForExercise(recoveryAdjusted, exercise);

    // Apply experience adjustments
    const experienceAdjusted = this.adjustForExperience(
      exerciseAdjusted,
      userContext.trainingProfile?.experienceLevel || 'intermediate'
    );

    // Calculate %1RM if we have user data
    let percentOf1RM: number | undefined;
    if (userPerformance?.estimated1RM && typeof experienceAdjusted.reps === 'number') {
      percentOf1RM = this.calculatePercent1RM(
        experienceAdjusted.reps,
        experienceAdjusted.rpe
      );
    }

    // Build notes
    const notes = this.buildNotes(
      exercise,
      userContext,
      userPerformance,
      experienceAdjusted
    );

    // Calculate tempo for hypertrophy goals
    let tempo: string | undefined;
    if (userContext.goals.includes('hypertrophy')) {
      tempo = this.calculateTempo(exercise, primaryGoal);
    }

    return {
      sets: Math.max(1, Math.min(6, experienceAdjusted.sets)),
      reps: experienceAdjusted.reps,
      rpe: Math.max(5, Math.min(10, experienceAdjusted.rpe)),
      percentOf1RM,
      restSeconds: Math.max(30, Math.min(300, experienceAdjusted.rest)),
      tempo,
      notes,
    };
  }

  /**
   * Adjust load for recovery state
   */
  private adjustForRecovery(
    params: BaseLoadParams,
    recovery: RecoveryScoreV3 | undefined
  ): BaseLoadParams {
    if (!recovery) return params;

    const adjusted = { ...params };

    switch (recovery.classification) {
      case 'poor':
        adjusted.sets = Math.max(2, Math.round(adjusted.sets * 0.6));
        adjusted.rpe = Math.max(5, adjusted.rpe - 2);
        adjusted.rest = Math.round(adjusted.rest * 1.3);
        break;

      case 'fair':
        adjusted.sets = Math.max(2, Math.round(adjusted.sets * 0.8));
        adjusted.rpe = Math.max(6, adjusted.rpe - 1);
        adjusted.rest = Math.round(adjusted.rest * 1.15);
        break;

      case 'excellent':
        adjusted.rpe = Math.min(10, adjusted.rpe + 0.5);
        adjusted.rest = Math.round(adjusted.rest * 0.9);
        break;

      default:
        // 'good' - no adjustment
        break;
    }

    return adjusted;
  }

  /**
   * Adjust load for exercise characteristics
   */
  private adjustForExercise(
    params: BaseLoadParams,
    exercise: ExerciseMetadataV3
  ): BaseLoadParams {
    const adjusted = { ...params };

    // High CNS exercises need more rest
    if (exercise.performanceMetrics.cnsLoadFactor >= 8) {
      adjusted.rest = Math.max(adjusted.rest, 180);
      // Reduce volume for very heavy exercises
      if (exercise.performanceMetrics.cnsLoadFactor >= 9) {
        adjusted.sets = Math.min(adjusted.sets, 4);
      }
    }

    // Low CNS exercises can have shorter rest
    if (exercise.performanceMetrics.cnsLoadFactor <= 4) {
      adjusted.rest = Math.min(adjusted.rest, 90);
    }

    // Complex exercises (Olympic lifts) need lower reps
    if (exercise.performanceMetrics.technicalComplexity >= 8) {
      if (typeof adjusted.reps === 'number') {
        adjusted.reps = Math.min(adjusted.reps, 5);
      } else {
        adjusted.reps = '3-5';
      }
    }

    // Isolation exercises can use higher reps
    if (exercise.movementPattern === 'isolation_upper' || exercise.movementPattern === 'isolation_lower') {
      if (typeof adjusted.reps === 'number' && adjusted.reps < 8) {
        adjusted.reps = '8-12';
      }
    }

    // Mobility/stability exercises use different parameters
    if (exercise.movementPattern === 'mobility' || exercise.movementPattern === 'stability') {
      adjusted.sets = Math.min(adjusted.sets, 2);
      adjusted.reps = '30-60s';
      adjusted.rest = 30;
      adjusted.rpe = 5;
    }

    return adjusted;
  }

  /**
   * Adjust load for experience level
   */
  private adjustForExperience(
    params: BaseLoadParams,
    level: string
  ): BaseLoadParams {
    const adjusted = { ...params };

    switch (level) {
      case 'beginner':
        // Beginners: lower intensity, focus on form
        adjusted.sets = Math.min(adjusted.sets, 3);
        adjusted.rpe = Math.min(adjusted.rpe, 7);
        // Keep reps moderate for skill learning
        if (typeof adjusted.reps === 'number' && adjusted.reps < 6) {
          adjusted.reps = 8;
        }
        break;

      case 'intermediate':
        // No major adjustments for intermediate
        break;

      case 'advanced':
        // Can handle more volume and intensity
        adjusted.sets = Math.max(adjusted.sets, 3);
        break;

      case 'elite':
        // Elite can handle highest loads
        adjusted.sets = Math.max(adjusted.sets, 4);
        adjusted.rpe = Math.min(10, adjusted.rpe + 0.5);
        break;
    }

    return adjusted;
  }

  /**
   * Calculate percentage of 1RM from reps and RPE
   */
  private calculatePercent1RM(reps: number, rpe: number): number {
    // Find closest rep count in lookup table
    const repCounts = Object.keys(RPE_TO_PERCENT_1RM).map(Number);
    const closestReps = repCounts.reduce((prev, curr) =>
      Math.abs(curr - reps) < Math.abs(prev - reps) ? curr : prev
    );

    const rpeTable = RPE_TO_PERCENT_1RM[closestReps];
    if (!rpeTable) return 70; // Default fallback

    // Find closest RPE
    const rpes = Object.keys(rpeTable).map(Number);
    const closestRpe = rpes.reduce((prev, curr) =>
      Math.abs(curr - rpe) < Math.abs(prev - rpe) ? curr : prev
    );

    return rpeTable[closestRpe] || 70;
  }

  /**
   * Calculate tempo prescription
   */
  private calculateTempo(exercise: ExerciseMetadataV3, goal: Goal): string {
    // Tempo format: eccentric-pause at bottom-concentric-pause at top

    if (goal === 'hypertrophy') {
      // Slow eccentric for hypertrophy
      if (exercise.movementPattern.includes('push')) {
        return '3-1-1-0'; // 3s down, 1s pause, 1s up
      }
      if (exercise.movementPattern.includes('pull')) {
        return '2-1-2-1'; // Control on both phases
      }
      return '3-0-1-0'; // Default hypertrophy tempo
    }

    if (goal === 'strength') {
      return '2-1-X-0'; // Controlled down, explosive up
    }

    if (goal === 'power') {
      return '1-0-X-0'; // Fast eccentric, explosive concentric
    }

    return '2-0-1-0'; // Default controlled tempo
  }

  /**
   * Build contextual notes for the exercise
   */
  private buildNotes(
    exercise: ExerciseMetadataV3,
    context: UserContextV3,
    performance: UserExercisePerformance | null,
    params: BaseLoadParams
  ): string[] {
    const notes: string[] = [];

    // Recovery-based notes
    if (context.recoveryScore) {
      switch (context.recoveryScore.classification) {
        case 'poor':
          notes.push('Focus on technique, reduce weight from usual');
          break;
        case 'fair':
          notes.push('Moderate intensity, listen to your body');
          break;
        case 'excellent':
          notes.push('Ready for peak performance');
          break;
      }
    }

    // Phase-based notes
    if (context.currentPhase) {
      switch (context.currentPhase) {
        case 'deload':
          notes.push('Deload week - prioritize recovery');
          break;
        case 'realization':
          notes.push('Peak week - aim for PRs');
          break;
        case 'accumulation':
          notes.push('Volume phase - focus on total work');
          break;
      }
    }

    // Exercise-specific notes
    if (exercise.performanceMetrics.technicalComplexity >= 8) {
      notes.push('High skill exercise - prioritize form over load');
    }

    if (exercise.performanceMetrics.cnsLoadFactor >= 9) {
      notes.push('CNS-demanding - ensure full rest between sets');
    }

    // Progression notes
    if (performance) {
      if (performance.consecutiveSuccessSessions >= 3) {
        notes.push('Consider increasing weight or progressing to harder variation');
      }

      if (performance.skillProgression === 'learning') {
        notes.push('Focus on form mastery before adding load');
      }

      if (performance.estimated1RM && typeof params.reps === 'number') {
        const targetWeight = Math.round(
          performance.estimated1RM * (this.calculatePercent1RM(params.reps, params.rpe) / 100)
        );
        notes.push(`Target: ~${targetWeight}kg based on your 1RM`);
      }
    }

    // Safety notes from exercise metadata
    if (exercise.biomechanics.jointStressProfile) {
      const highStressJoints = Object.entries(exercise.biomechanics.jointStressProfile)
        .filter(([, level]) => level === 'high')
        .map(([joint]) => joint);

      if (highStressJoints.length > 0) {
        notes.push(`High stress on ${highStressJoints.join(', ')} - warm up thoroughly`);
      }
    }

    return notes;
  }

  /**
   * Calculate rest period between superset exercises
   */
  calculateSupersetRest(
    exercise1: ExerciseMetadataV3,
    exercise2: ExerciseMetadataV3
  ): { restBetween: number; restAfter: number } {
    // Agonist-antagonist supersets need minimal rest between
    const patterns = [exercise1.movementPattern, exercise2.movementPattern];

    const isAgonistAntagonist =
      (patterns.includes('horizontal_push') && patterns.includes('horizontal_pull')) ||
      (patterns.includes('vertical_push') && patterns.includes('vertical_pull')) ||
      (patterns.includes('squat') && patterns.includes('hip_hinge'));

    if (isAgonistAntagonist) {
      return {
        restBetween: 30, // Short rest between exercises
        restAfter: 120,  // Full rest after the pair
      };
    }

    // Same muscle group supersets need more rest
    const muscles1 = new Set(exercise1.muscleActivation.primary.map(m => m.muscleId));
    const muscles2 = new Set(exercise2.muscleActivation.primary.map(m => m.muscleId));
    const overlap = [...muscles1].filter(m => muscles2.has(m)).length;

    if (overlap > 0) {
      return {
        restBetween: 60, // More rest if same muscles
        restAfter: 150,
      };
    }

    return {
      restBetween: 45,
      restAfter: 90,
    };
  }

  /**
   * Calculate progressive overload suggestion
   */
  getProgressionSuggestion(
    exercise: ExerciseMetadataV3,
    performance: UserExercisePerformance | null,
    goal: Goal
  ): string | null {
    if (!performance || performance.totalSessions < 3) {
      return null; // Not enough data
    }

    // Check if user is progressing
    const trend = performance.monthlyVolumeTrend;
    if (trend.length < 2) return null;

    const lastTwo = trend.slice(-2);
    const isProgressing = lastTwo[1].volume > lastTwo[0].volume;
    const isStagnant = lastTwo[1].volume === lastTwo[0].volume;
    const isRegressing = lastTwo[1].volume < lastTwo[0].volume * 0.9;

    if (isProgressing) {
      return 'Great progress! Continue current loading strategy';
    }

    if (isStagnant) {
      // Suggest progression based on goal
      if (goal === 'strength') {
        return 'Plateau detected: Try adding 2.5kg or doing 1 more rep';
      }
      if (goal === 'hypertrophy') {
        return 'Plateau detected: Try adding 1 set or slow down the eccentric';
      }
      return 'Plateau detected: Consider varying the exercise or rep scheme';
    }

    if (isRegressing) {
      // Check for fatigue
      if (performance.consecutiveSuccessSessions < 2) {
        return 'Recovery issue suspected: Consider a deload week';
      }
      // Suggest regression
      const regressions = exercise.progressionTree.regressions;
      if (regressions.length > 0) {
        return `Consider regressing to ${regressions[0]} to rebuild momentum`;
      }
    }

    return null;
  }
}

// Export singleton
export const loadCalculator = new LoadCalculator();
