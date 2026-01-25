/**
 * AI-Powered Exercise Prescription Engine v2
 *
 * Multi-factor scoring algorithm that considers:
 * - User fitness level and experience
 * - Equipment availability
 * - Time constraints
 * - Injury history and contraindications
 * - Muscle imbalance correction
 * - Recovery status from previous workouts
 * - Periodization phase
 * - Skill level requirements
 *
 * Based on research from NSCA, ACSM, and sports science literature.
 */

import { queryAll, queryOne } from '../../db/client';
import { loggers } from '../../lib/logger';
import { recoveryService } from '../recovery';
import type { RecoveryScore, WorkoutIntensity } from '../recovery/types';

const log = loggers.prescription || loggers.api;

// ============================================
// TYPES
// ============================================

export interface UserContext {
  userId: string;
  fitnessLevel: number; // 1-10
  experienceLevel: 'beginner' | 'intermediate' | 'advanced' | 'elite';
  equipment: string[];
  location: 'home' | 'gym' | 'outdoor' | 'travel';
  timeAvailable: number; // minutes
  goals: string[];
  archetypeId?: string;
}

export interface PrescriptionRequest {
  userContext: UserContext;
  targetMuscles?: string[];
  excludeMuscles?: string[];
  exerciseTypes?: string[];
  maxExercises?: number;
  includeWarmup?: boolean;
  includeCooldown?: boolean;
}

export interface ScoredExercise {
  exerciseId: string;
  name: string;
  type: string;
  score: number;
  scoreBreakdown: {
    equipmentMatch: number;
    goalAlignment: number;
    muscleNeed: number;
    recoveryAdjustment: number;
    skillAppropriate: number;
    periodizationFit: number;
    varietyBonus: number;
    injuryPenalty: number;
  };
  sets: number;
  reps: number;
  restSeconds: number;
  notes?: string;
  primaryMuscles: string[];
}

export interface PrescriptionResult {
  id: string;
  exercises: ScoredExercise[];
  warmup: ScoredExercise[];
  cooldown: ScoredExercise[];
  totalDuration: number;
  muscleCoverage: Record<string, number>;
  periodizationPhase?: string;
  difficulty: string;
  metadata: {
    algorithVersion: string;
    generatedAt: string;
    factorsConsidered: string[];
  };
}

interface Exercise {
  id: string;
  name: string;
  type: string;
  difficulty: number;
  primary_muscles: string[];
  equipment_required?: string[];
  equipment_optional?: string[];
  locations?: string[];
  movement_pattern?: string;
  skill_level?: string;
  source_methodology?: string;
  contraindicated_injuries?: string[];
  is_rehab_exercise?: boolean;
}

interface UserInjury {
  injury_profile_id: string;
  severity: string;
  status: string;
  contraindicated_movements: string[];
}

interface WorkoutHistory {
  exercise_id: string;
  last_performed: Date;
  times_performed: number;
  avg_rpe: number;
}

interface TrainingPhase {
  phase_type: string;
  volume_modifier: number;
  intensity_modifier: number;
  exercise_types: string[];
}

// ============================================
// SCORING WEIGHTS
// ============================================

const SCORING_WEIGHTS = {
  equipmentMatch: 25,      // Must have equipment
  goalAlignment: 20,       // Matches user goals
  muscleNeed: 20,          // Targets undermuscled areas
  recoveryAdjustment: 15,  // Based on recent training
  skillAppropriate: 10,    // Matches skill level
  periodizationFit: 5,     // Matches training phase
  varietyBonus: 5,         // Introduces new exercises
};

const SKILL_LEVEL_MAP: Record<string, number> = {
  'beginner': 1,
  'intermediate': 2,
  'advanced': 3,
  'elite': 4,
};

const DIFFICULTY_BY_EXPERIENCE: Record<string, { min: number; max: number }> = {
  'beginner': { min: 1, max: 2 },
  'intermediate': { min: 1, max: 3 },
  'advanced': { min: 2, max: 4 },
  'elite': { min: 3, max: 5 },
};

// ============================================
// PRESCRIPTION ENGINE
// ============================================

export class PrescriptionEngine {
  private readonly algorithmVersion = '2.0.0';

  /**
   * Generate a personalized exercise prescription
   */
  async prescribe(request: PrescriptionRequest): Promise<PrescriptionResult> {
    const startTime = Date.now();
    const { userContext } = request;

    log.info({ userId: userContext.userId }, 'Generating prescription');

    // Gather all context data in parallel
    const [
      exercises,
      injuries,
      workoutHistory,
      trainingPhase,
      muscleStats,
      preferences,
      recoveryScore,
    ] = await Promise.all([
      this.getAvailableExercises(userContext),
      this.getUserInjuries(userContext.userId),
      this.getWorkoutHistory(userContext.userId),
      this.getCurrentTrainingPhase(userContext.userId),
      this.getMuscleStats(userContext.userId),
      this.getUserPreferences(userContext.userId),
      recoveryService.getRecoveryScore(userContext.userId).catch(() => null),
    ]);

    // Adjust prescription based on recovery state
    const intensityMultiplier = this.getIntensityMultiplier(recoveryScore);
    log.info({
      userId: userContext.userId,
      recoveryScore: recoveryScore?.score,
      recommendedIntensity: recoveryScore?.recommendedIntensity,
      intensityMultiplier,
    }, 'Prescription with recovery context');

    // Score all exercises
    const scoredExercises = await this.scoreExercises(
      exercises,
      userContext,
      injuries,
      workoutHistory,
      trainingPhase,
      muscleStats,
      preferences,
      request,
      recoveryScore
    );

    // Select optimal exercise set, adjusting for recovery
    const selectedExercises = this.selectExercises(
      scoredExercises,
      request,
      trainingPhase,
      recoveryScore
    );

    // Adjust sets/reps based on recovery
    const adjustedExercises = this.adjustForRecovery(selectedExercises, recoveryScore);

    // Generate warmup if requested
    const warmup = request.includeWarmup
      ? await this.generateWarmup(adjustedExercises, userContext)
      : [];

    // Generate cooldown if requested
    const cooldown = request.includeCooldown
      ? await this.generateCooldown(adjustedExercises, userContext)
      : [];

    // Calculate muscle coverage
    const muscleCoverage = this.calculateMuscleCoverage(adjustedExercises);

    // Estimate total duration
    const totalDuration = this.estimateDuration(adjustedExercises, warmup, cooldown);

    // Determine difficulty rating (adjusted for recovery)
    const difficulty = this.determineDifficulty(adjustedExercises, recoveryScore);

    const result: PrescriptionResult = {
      id: `rx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      exercises: adjustedExercises,
      warmup,
      cooldown,
      totalDuration,
      muscleCoverage,
      periodizationPhase: trainingPhase?.phase_type,
      difficulty,
      metadata: {
        algorithVersion: this.algorithmVersion,
        generatedAt: new Date().toISOString(),
        factorsConsidered: [...Object.keys(SCORING_WEIGHTS), 'recoveryScore'],
        recoveryScore: recoveryScore?.score,
        recoveryRecommendation: recoveryScore?.recommendedIntensity,
      } as any,
    };

    // Store prescription history for ML feedback
    await this.storePrescriptionHistory(userContext.userId, result);

    log.info({
      userId: userContext.userId,
      exerciseCount: adjustedExercises.length,
      duration: totalDuration,
      recoveryScore: recoveryScore?.score,
      timeMs: Date.now() - startTime,
    }, 'Prescription generated');

    return result;
  }

  /**
   * Get exercises available based on equipment and location
   */
  private async getAvailableExercises(context: UserContext): Promise<Exercise[]> {
    // Build query to filter by equipment and location
    // Note: equipment_required, equipment_optional, and locations are JSONB arrays
    const exercises = await queryAll<Exercise>(`
      SELECT
        id, name, type, difficulty, primary_muscles,
        equipment_required, equipment_optional, locations,
        movement_pattern, skill_level, source_methodology,
        contraindicated_injuries, is_rehab_exercise
      FROM exercises
      WHERE (
        equipment_required IS NULL
        OR equipment_required = '[]'::jsonb
        OR equipment_required <@ $1::jsonb
      )
      AND (
        locations IS NULL
        OR locations = '[]'::jsonb
        OR locations @> $2::jsonb
      )
      AND difficulty <= $3
    `, [
      JSON.stringify(context.equipment),
      JSON.stringify([context.location]),
      DIFFICULTY_BY_EXPERIENCE[context.experienceLevel]?.max || 5,
    ]);

    return exercises;
  }

  /**
   * Get user's active injuries
   */
  private async getUserInjuries(userId: string): Promise<UserInjury[]> {
    const injuries = await queryAll<UserInjury>(`
      SELECT
        ui.injury_profile_id,
        ui.severity,
        ui.status,
        ip.contraindicated_movements
      FROM user_injuries ui
      JOIN injury_profiles ip ON ip.id = ui.injury_profile_id
      WHERE ui.user_id = $1
      AND ui.status IN ('active', 'recovering')
    `, [userId]);

    return injuries;
  }

  /**
   * Get user's recent workout history
   */
  private async getWorkoutHistory(userId: string): Promise<WorkoutHistory[]> {
    // Use workout_sets table (not workout_exercises which doesn't exist)
    const history = await queryAll<WorkoutHistory>(`
      SELECT
        ws.exercise_id,
        MAX(w.created_at) as last_performed,
        COUNT(DISTINCT w.id) as times_performed,
        AVG(ws.rpe) as avg_rpe
      FROM workout_sets ws
      JOIN workouts w ON w.id = ws.workout_id
      WHERE ws.user_id = $1
      AND w.created_at > NOW() - INTERVAL '30 days'
      GROUP BY ws.exercise_id
    `, [userId]);

    return history;
  }

  /**
   * Get user's current periodization phase
   * Returns null if user has no active training cycle (most users won't)
   */
  private async getCurrentTrainingPhase(userId: string): Promise<TrainingPhase | null> {
    try {
      const phase = await queryOne<TrainingPhase>(`
        SELECT
          tp.phase_type,
          tp.volume_modifier,
          (tp.intensity_range_low + tp.intensity_range_high) / 2.0 as intensity_modifier,
          tp.focus_areas as exercise_types
        FROM training_weeks tw
        JOIN training_phases tp ON tp.id = tw.phase_id
        JOIN training_cycles tc ON tc.id = tp.cycle_id
        WHERE tc.user_id = $1
        AND tc.status = 'active'
        AND tw.week_number = (
          SELECT EXTRACT(WEEK FROM NOW()) - EXTRACT(WEEK FROM tc.start_date) + 1
        )
      `, [userId]);

      return phase ?? null;
    } catch {
      // Most users won't have training cycles set up, so return null gracefully
      return null;
    }
  }

  /**
   * Get muscle training stats for balance detection
   */
  private async getMuscleStats(userId: string): Promise<Record<string, number>> {
    // Use workout_sets table (not workout_exercises which doesn't exist)
    // Each row in workout_sets is a single set, so we count sets and sum reps*weight
    const stats = await queryAll<{ muscle_id: string; total_volume: number }>(`
      SELECT
        ea.muscle_id,
        SUM(ws.reps * COALESCE(ws.weight, 1) * (ea.activation / 100.0)) as total_volume
      FROM workout_sets ws
      JOIN workouts w ON w.id = ws.workout_id
      JOIN exercise_activations ea ON ea.exercise_id = ws.exercise_id
      WHERE ws.user_id = $1
      AND w.created_at > NOW() - INTERVAL '14 days'
      GROUP BY ea.muscle_id
    `, [userId]);

    const muscleMap: Record<string, number> = {};
    for (const stat of stats) {
      muscleMap[stat.muscle_id] = stat.total_volume;
    }

    return muscleMap;
  }

  /**
   * Get user exercise preferences
   * Maps preference_type to a numeric score:
   * - favorite: +20
   * - avoid/injured/no_equipment/too_difficult: -100 (effectively exclude)
   * - too_easy: -20 (mild penalty)
   */
  private async getUserPreferences(userId: string): Promise<Record<string, number>> {
    const prefs = await queryAll<{ exercise_id: string; preference_type: string }>(`
      SELECT exercise_id, preference_type
      FROM user_exercise_preferences
      WHERE user_id = $1
    `, [userId]);

    const prefMap: Record<string, number> = {};
    for (const pref of prefs) {
      // Map preference_type to a numeric score
      switch (pref.preference_type) {
        case 'favorite':
          prefMap[pref.exercise_id] = 20;
          break;
        case 'avoid':
        case 'injured':
        case 'no_equipment':
        case 'too_difficult':
          prefMap[pref.exercise_id] = -100;
          break;
        case 'too_easy':
          prefMap[pref.exercise_id] = -20;
          break;
        default:
          prefMap[pref.exercise_id] = 0;
      }
    }

    return prefMap;
  }

  /**
   * Score all available exercises (including recovery factor)
   */
  private async scoreExercises(
    exercises: Exercise[],
    context: UserContext,
    injuries: UserInjury[],
    history: WorkoutHistory[],
    phase: TrainingPhase | null,
    muscleStats: Record<string, number>,
    preferences: Record<string, number>,
    request: PrescriptionRequest,
    recoveryScore?: RecoveryScore | null
  ): Promise<ScoredExercise[]> {
    const historyMap = new Map(history.map(h => [h.exercise_id, h]));
    const contraindicatedMovements = new Set(
      injuries.flatMap(i => i.contraindicated_movements || [])
    );

    // Calculate average muscle volume for imbalance detection
    const muscleVolumes = Object.values(muscleStats);
    const avgVolume = muscleVolumes.length > 0
      ? muscleVolumes.reduce((a, b) => a + b, 0) / muscleVolumes.length
      : 0;

    const scored: ScoredExercise[] = [];

    for (const exercise of exercises) {
      const breakdown = {
        equipmentMatch: 0,
        goalAlignment: 0,
        muscleNeed: 0,
        recoveryAdjustment: 0,
        skillAppropriate: 0,
        periodizationFit: 0,
        varietyBonus: 0,
        injuryPenalty: 0,
      };

      // 1. Equipment Match (binary - must have equipment)
      const hasAllEquipment = !exercise.equipment_required?.length ||
        exercise.equipment_required.every(eq => context.equipment.includes(eq));
      if (!hasAllEquipment) continue; // Skip if missing required equipment
      breakdown.equipmentMatch = SCORING_WEIGHTS.equipmentMatch;

      // 2. Goal Alignment
      breakdown.goalAlignment = this.calculateGoalAlignment(exercise, context.goals);

      // 3. Muscle Need (prioritize undertrained muscles)
      breakdown.muscleNeed = this.calculateMuscleNeed(
        exercise,
        muscleStats,
        avgVolume,
        request.targetMuscles,
        request.excludeMuscles
      );

      // 4. Recovery Adjustment (avoid recently trained exercises)
      const exerciseHistory = historyMap.get(exercise.id);
      breakdown.recoveryAdjustment = this.calculateRecoveryScore(exerciseHistory);

      // 5. Skill Appropriate
      breakdown.skillAppropriate = this.calculateSkillScore(
        exercise,
        context.experienceLevel
      );

      // 6. Periodization Fit
      breakdown.periodizationFit = this.calculatePeriodizationFit(exercise, phase);

      // 7. Variety Bonus (favor exercises not done recently)
      breakdown.varietyBonus = this.calculateVarietyBonus(exerciseHistory);

      // 8. Injury Penalty
      breakdown.injuryPenalty = this.calculateInjuryPenalty(
        exercise,
        contraindicatedMovements,
        injuries
      );

      // 9. Recovery-based adjustment (favor low-intensity when recovery is poor)
      if (recoveryScore) {
        breakdown.recoveryAdjustment = this.applyRecoveryPenalty(
          exercise,
          recoveryScore,
          breakdown.recoveryAdjustment
        );
      }

      // Calculate total score
      const totalScore = Object.values(breakdown).reduce((a, b) => a + b, 0);

      // Apply user preference modifier
      const preferenceModifier = preferences[exercise.id] || 0;
      const finalScore = totalScore + (preferenceModifier * 5);

      if (finalScore > 0) {
        scored.push({
          exerciseId: exercise.id,
          name: exercise.name,
          type: exercise.type,
          score: finalScore,
          scoreBreakdown: breakdown,
          sets: this.recommendSets(exercise, phase, context),
          reps: this.recommendReps(exercise, phase, context),
          restSeconds: this.recommendRest(exercise, phase),
          primaryMuscles: exercise.primary_muscles || [],
        });
      }
    }

    // Sort by score descending
    return scored.sort((a, b) => b.score - a.score);
  }

  /**
   * Calculate goal alignment score
   */
  private calculateGoalAlignment(exercise: Exercise, goals: string[]): number {
    const goalExerciseMap: Record<string, string[]> = {
      'strength': ['powerlifting', 'olympic_weightlifting', 'strength'],
      'hypertrophy': ['bodybuilding', 'hypertrophy', 'freeweight'],
      'endurance': ['cardio', 'hiit', 'conditioning'],
      'flexibility': ['mobility', 'stretching', 'yoga'],
      'skill': ['climbing', 'gymnastics', 'calisthenics'],
      'weight_loss': ['hiit', 'cardio', 'metabolic'],
      'rehabilitation': ['rehab', 'corrective', 'mobility'],
      'athletic': ['sport_specific', 'plyometric', 'power'],
    };

    let alignmentScore = 0;
    for (const goal of goals) {
      const targetTypes = goalExerciseMap[goal] || [];
      if (targetTypes.includes(exercise.type) || targetTypes.includes(exercise.source_methodology || '')) {
        alignmentScore += SCORING_WEIGHTS.goalAlignment / goals.length;
      }
    }

    return alignmentScore;
  }

  /**
   * Calculate muscle need score (prioritize undertrained muscles)
   */
  private calculateMuscleNeed(
    exercise: Exercise,
    muscleStats: Record<string, number>,
    avgVolume: number,
    targetMuscles?: string[],
    excludeMuscles?: string[]
  ): number {
    const primaryMuscles = exercise.primary_muscles || [];

    // Check if exercise targets excluded muscles
    if (excludeMuscles?.some(m => primaryMuscles.includes(m))) {
      return -50; // Strong penalty
    }

    // Check if exercise targets requested muscles
    if (targetMuscles?.length) {
      const targetsRequested = primaryMuscles.some(m => targetMuscles.includes(m));
      if (!targetsRequested) return 0;
    }

    // Calculate imbalance score
    let imbalanceScore = 0;
    for (const muscle of primaryMuscles) {
      const muscleVolume = muscleStats[muscle] || 0;
      if (muscleVolume < avgVolume * 0.7) {
        // Muscle is undertrained - bonus
        imbalanceScore += SCORING_WEIGHTS.muscleNeed / primaryMuscles.length;
      } else if (muscleVolume > avgVolume * 1.3) {
        // Muscle is overtrained - slight penalty
        imbalanceScore -= 5;
      }
    }

    return Math.max(0, imbalanceScore);
  }

  /**
   * Calculate recovery score based on recent training
   */
  private calculateRecoveryScore(history?: WorkoutHistory): number {
    if (!history) return SCORING_WEIGHTS.recoveryAdjustment; // Never done = good

    const daysSinceLast = (Date.now() - new Date(history.last_performed).getTime()) / (1000 * 60 * 60 * 24);

    if (daysSinceLast < 1) return -20; // Too soon
    if (daysSinceLast < 2) return 0;   // Borderline
    if (daysSinceLast < 4) return SCORING_WEIGHTS.recoveryAdjustment * 0.5;
    return SCORING_WEIGHTS.recoveryAdjustment;
  }

  /**
   * Calculate skill appropriateness score
   */
  private calculateSkillScore(exercise: Exercise, experienceLevel: string): number {
    const userLevel = SKILL_LEVEL_MAP[experienceLevel] || 2;
    const exerciseLevel = SKILL_LEVEL_MAP[exercise.skill_level || 'intermediate'] || 2;

    const levelDiff = userLevel - exerciseLevel;

    if (levelDiff < -1) return -10; // Too advanced
    if (levelDiff < 0) return SCORING_WEIGHTS.skillAppropriate * 0.5; // Challenging
    if (levelDiff === 0) return SCORING_WEIGHTS.skillAppropriate; // Perfect match
    return SCORING_WEIGHTS.skillAppropriate * 0.7; // Slightly easy
  }

  /**
   * Calculate periodization fit score
   */
  private calculatePeriodizationFit(exercise: Exercise, phase: TrainingPhase | null): number {
    if (!phase) return SCORING_WEIGHTS.periodizationFit * 0.5;

    const phaseTypes = phase.exercise_types || [];
    if (phaseTypes.includes(exercise.type) || phaseTypes.includes(exercise.movement_pattern || '')) {
      return SCORING_WEIGHTS.periodizationFit;
    }

    return 0;
  }

  /**
   * Calculate variety bonus
   */
  private calculateVarietyBonus(history?: WorkoutHistory): number {
    if (!history) return SCORING_WEIGHTS.varietyBonus; // New exercise

    if (history.times_performed > 10) return 0; // Overused
    if (history.times_performed > 5) return SCORING_WEIGHTS.varietyBonus * 0.3;
    return SCORING_WEIGHTS.varietyBonus * 0.7;
  }

  /**
   * Calculate injury penalty
   */
  private calculateInjuryPenalty(
    exercise: Exercise,
    contraindicatedMovements: Set<string>,
    injuries: UserInjury[]
  ): number {
    // Check if exercise is contraindicated
    if (exercise.movement_pattern && contraindicatedMovements.has(exercise.movement_pattern)) {
      return -100; // Absolute contraindication
    }

    // Check specific contraindicated injuries
    if (exercise.contraindicated_injuries?.length) {
      for (const injury of injuries) {
        if (exercise.contraindicated_injuries.includes(injury.injury_profile_id)) {
          if (injury.severity === 'severe') return -100;
          if (injury.severity === 'moderate') return -50;
          return -25;
        }
      }
    }

    // Rehab exercises get bonus for recovering users
    if (exercise.is_rehab_exercise && injuries.length > 0) {
      return 10;
    }

    return 0;
  }

  /**
   * Apply recovery penalty based on exercise intensity and current recovery state
   * Penalizes high-intensity exercises when recovery is poor,
   * and favors low-intensity/mobility exercises
   */
  private applyRecoveryPenalty(
    exercise: Exercise,
    recoveryScore: RecoveryScore,
    baseRecoveryScore: number
  ): number {
    // High-intensity exercise types that should be penalized when recovery is poor
    const highIntensityTypes = new Set([
      'powerlifting', 'olympic_weightlifting', 'strength',
      'hiit', 'plyometric', 'power', 'metabolic'
    ]);

    // Low-intensity exercise types that should be favored when recovery is poor
    const lowIntensityTypes = new Set([
      'mobility', 'stretching', 'yoga', 'warmup', 'cooldown',
      'rehab', 'corrective', 'activation'
    ]);

    let adjustment = baseRecoveryScore;

    if (recoveryScore.classification === 'poor') {
      // Strong penalty for high-intensity when recovery is poor
      if (highIntensityTypes.has(exercise.type)) {
        adjustment -= 30;
      }
      // Strong bonus for low-intensity/mobility
      if (lowIntensityTypes.has(exercise.type)) {
        adjustment += 20;
      }
      // Penalty for high difficulty exercises
      if (exercise.difficulty >= 4) {
        adjustment -= 20;
      }
    } else if (recoveryScore.classification === 'fair') {
      // Moderate penalty for high-intensity
      if (highIntensityTypes.has(exercise.type)) {
        adjustment -= 15;
      }
      // Moderate bonus for low-intensity
      if (lowIntensityTypes.has(exercise.type)) {
        adjustment += 10;
      }
    } else if (recoveryScore.classification === 'excellent') {
      // Bonus for high-intensity when fully recovered
      if (highIntensityTypes.has(exercise.type)) {
        adjustment += 10;
      }
    }

    return adjustment;
  }

  /**
   * Recommend sets based on phase and context
   */
  private recommendSets(exercise: Exercise, phase: TrainingPhase | null, context: UserContext): number {
    let baseSets = 3;

    // Adjust for phase
    if (phase) {
      baseSets = Math.round(baseSets * phase.volume_modifier);
    }

    // Adjust for experience
    if (context.experienceLevel === 'beginner') baseSets = Math.min(baseSets, 3);
    if (context.experienceLevel === 'elite') baseSets = Math.max(baseSets, 4);

    // Adjust for time
    if (context.timeAvailable < 30) baseSets = 2;

    return Math.max(2, Math.min(5, baseSets));
  }

  /**
   * Recommend reps based on phase and exercise type
   */
  private recommendReps(exercise: Exercise, phase: TrainingPhase | null, _context: UserContext): number {
    // Base reps by exercise type
    const typeReps: Record<string, number> = {
      'strength': 5,
      'powerlifting': 3,
      'olympic_weightlifting': 3,
      'hypertrophy': 10,
      'bodybuilding': 12,
      'endurance': 15,
      'climbing': 6,
      'gymnastics': 5,
      'calisthenics': 8,
      'rehab': 12,
    };

    let baseReps = typeReps[exercise.type] || 10;

    // Adjust for phase
    if (phase) {
      if (phase.phase_type === 'accumulation') baseReps = Math.round(baseReps * 1.2);
      if (phase.phase_type === 'realization') baseReps = Math.round(baseReps * 0.7);
    }

    return Math.max(3, Math.min(20, baseReps));
  }

  /**
   * Recommend rest period
   */
  private recommendRest(exercise: Exercise, _phase: TrainingPhase | null): number {
    const typeRest: Record<string, number> = {
      'strength': 180,
      'powerlifting': 240,
      'olympic_weightlifting': 180,
      'hypertrophy': 90,
      'endurance': 45,
      'climbing': 180,
      'gymnastics': 120,
      'calisthenics': 90,
      'rehab': 60,
    };

    return typeRest[exercise.type] || 90;
  }

  /**
   * Select optimal set of exercises (adjusted for recovery)
   */
  private selectExercises(
    scored: ScoredExercise[],
    request: PrescriptionRequest,
    phase: TrainingPhase | null,
    recoveryScore?: RecoveryScore | null
  ): ScoredExercise[] {
    // Calculate base max exercises
    let maxExercises = request.maxExercises || this.calculateMaxExercises(
      request.userContext.timeAvailable,
      phase
    );

    // Reduce exercise count based on recovery
    if (recoveryScore) {
      if (recoveryScore.recommendedIntensity === 'rest') {
        return []; // Complete rest
      }
      if (recoveryScore.classification === 'poor') {
        maxExercises = Math.max(3, Math.floor(maxExercises * 0.5));
      } else if (recoveryScore.classification === 'fair') {
        maxExercises = Math.max(4, Math.floor(maxExercises * 0.7));
      }
    }

    const selected: ScoredExercise[] = [];
    const selectedMuscles = new Set<string>();
    // Note: selectedPatterns is defined for future movement pattern variety tracking
    const _selectedPatterns = new Set<string>();

    // For poor recovery, prefer lower-intensity exercises
    let sortedExercises = scored;
    if (recoveryScore && (recoveryScore.classification === 'poor' || recoveryScore.classification === 'fair')) {
      // Prioritize exercises with higher recovery adjustment scores
      sortedExercises = [...scored].sort((a, b) => {
        const aRecoveryScore = a.scoreBreakdown.recoveryAdjustment;
        const bRecoveryScore = b.scoreBreakdown.recoveryAdjustment;
        if (aRecoveryScore !== bRecoveryScore) {
          return bRecoveryScore - aRecoveryScore;
        }
        return b.score - a.score;
      });
    }

    for (const exercise of sortedExercises) {
      if (selected.length >= maxExercises) break;

      // Ensure variety in movement patterns
      const musclesTargeted = exercise.primaryMuscles.filter(m => !selectedMuscles.has(m));
      if (musclesTargeted.length === 0 && selected.length > 2) continue;

      selected.push(exercise);
      exercise.primaryMuscles.forEach(m => selectedMuscles.add(m));
    }

    return selected;
  }

  /**
   * Calculate max exercises based on time
   */
  private calculateMaxExercises(timeAvailable: number, phase: TrainingPhase | null): number {
    // Estimate ~5-7 minutes per exercise including rest
    const baseCount = Math.floor(timeAvailable / 6);

    if (phase?.phase_type === 'deload') {
      return Math.max(3, Math.floor(baseCount * 0.6));
    }

    return Math.max(4, Math.min(12, baseCount));
  }

  /**
   * Generate warmup exercises
   */
  private async generateWarmup(
    mainExercises: ScoredExercise[],
    _context: UserContext
  ): Promise<ScoredExercise[]> {
    // Get muscles being worked
    const targetMuscles = new Set(mainExercises.flatMap(e => e.primaryMuscles));

    // Find mobility/warmup exercises for those muscles
    const warmupExercises = await queryAll<Exercise>(`
      SELECT id, name, type, difficulty, primary_muscles, movement_pattern
      FROM exercises
      WHERE (type IN ('mobility', 'warmup', 'activation') OR movement_pattern = 'warmup')
      AND primary_muscles && $1::text[]
      LIMIT 4
    `, [Array.from(targetMuscles)]);

    return warmupExercises.map(e => ({
      exerciseId: e.id,
      name: e.name,
      type: e.type,
      score: 100,
      scoreBreakdown: {
        equipmentMatch: 25,
        goalAlignment: 20,
        muscleNeed: 20,
        recoveryAdjustment: 15,
        skillAppropriate: 10,
        periodizationFit: 5,
        varietyBonus: 5,
        injuryPenalty: 0,
      },
      sets: 1,
      reps: 10,
      restSeconds: 30,
      notes: 'Warmup - focus on controlled movement',
      primaryMuscles: e.primary_muscles || [],
    }));
  }

  /**
   * Generate cooldown exercises
   */
  private async generateCooldown(
    mainExercises: ScoredExercise[],
    _context: UserContext
  ): Promise<ScoredExercise[]> {
    const targetMuscles = new Set(mainExercises.flatMap(e => e.primaryMuscles));

    const cooldownExercises = await queryAll<Exercise>(`
      SELECT id, name, type, difficulty, primary_muscles, movement_pattern
      FROM exercises
      WHERE (type IN ('stretching', 'cooldown', 'mobility') OR movement_pattern = 'stretch')
      AND primary_muscles && $1::text[]
      LIMIT 3
    `, [Array.from(targetMuscles)]);

    return cooldownExercises.map(e => ({
      exerciseId: e.id,
      name: e.name,
      type: e.type,
      score: 100,
      scoreBreakdown: {
        equipmentMatch: 25,
        goalAlignment: 20,
        muscleNeed: 20,
        recoveryAdjustment: 15,
        skillAppropriate: 10,
        periodizationFit: 5,
        varietyBonus: 5,
        injuryPenalty: 0,
      },
      sets: 1,
      reps: 1,
      restSeconds: 0,
      notes: 'Hold for 30-60 seconds',
      primaryMuscles: e.primary_muscles || [],
    }));
  }

  /**
   * Calculate muscle coverage map
   */
  private calculateMuscleCoverage(exercises: ScoredExercise[]): Record<string, number> {
    const coverage: Record<string, number> = {};

    for (const exercise of exercises) {
      for (const muscle of exercise.primaryMuscles) {
        coverage[muscle] = (coverage[muscle] || 0) + (exercise.sets * exercise.reps);
      }
    }

    return coverage;
  }

  /**
   * Estimate total workout duration
   */
  private estimateDuration(
    exercises: ScoredExercise[],
    warmup: ScoredExercise[],
    cooldown: ScoredExercise[]
  ): number {
    let totalSeconds = 0;

    // Warmup: ~30s per exercise
    totalSeconds += warmup.length * 30;

    // Main exercises
    for (const exercise of exercises) {
      const setTime = 45; // Average time per set
      const totalSetTime = exercise.sets * setTime;
      const totalRestTime = (exercise.sets - 1) * exercise.restSeconds;
      totalSeconds += totalSetTime + totalRestTime;
    }

    // Cooldown: ~45s per stretch
    totalSeconds += cooldown.length * 45;

    return Math.round(totalSeconds / 60); // Return minutes
  }

  /**
   * Determine workout difficulty rating (adjusted for recovery)
   */
  private determineDifficulty(exercises: ScoredExercise[], recoveryScore?: RecoveryScore | null): string {
    if (exercises.length === 0) return 'easy';

    const avgScore = exercises.reduce((sum, e) => sum + e.score, 0) / exercises.length;
    const totalVolume = exercises.reduce((sum, e) => sum + (e.sets * e.reps), 0);

    // If recovery is poor, cap difficulty at moderate
    if (recoveryScore && recoveryScore.classification === 'poor') {
      if (totalVolume > 100 || avgScore > 60) return 'moderate';
      return 'easy';
    }

    // If recovery is fair, cap difficulty at moderate
    if (recoveryScore && recoveryScore.classification === 'fair') {
      if (totalVolume > 150 || avgScore > 80) return 'moderate';
      if (totalVolume > 100 || avgScore > 60) return 'moderate';
      return 'easy';
    }

    if (totalVolume > 150 || avgScore > 80) return 'intense';
    if (totalVolume > 100 || avgScore > 60) return 'moderate';
    return 'easy';
  }

  /**
   * Get intensity multiplier based on recovery score
   * Maps recovery classification to volume/intensity adjustments
   */
  private getIntensityMultiplier(recoveryScore: RecoveryScore | null): number {
    if (!recoveryScore) return 1.0; // No data = normal workout

    // Map recommended intensity to multiplier
    const intensityMultipliers: Record<WorkoutIntensity, number> = {
      'rest': 0.0,      // Complete rest recommended
      'light': 0.5,     // Half volume/intensity
      'moderate': 0.75, // Reduced volume/intensity
      'normal': 1.0,    // Normal workout
      'high': 1.1,      // Can push harder
    };

    return intensityMultipliers[recoveryScore.recommendedIntensity] || 1.0;
  }

  /**
   * Adjust exercises based on recovery state
   * Modifies sets, reps, and adds recovery-appropriate notes
   */
  private adjustForRecovery(
    exercises: ScoredExercise[],
    recoveryScore: RecoveryScore | null
  ): ScoredExercise[] {
    if (!recoveryScore) return exercises;

    const multiplier = this.getIntensityMultiplier(recoveryScore);

    // If rest is recommended, return empty workout with note
    if (recoveryScore.recommendedIntensity === 'rest') {
      log.info('Recovery score recommends complete rest, returning minimal workout');
      return [];
    }

    return exercises.map(exercise => {
      // Adjust sets and reps based on recovery
      const adjustedSets = Math.max(2, Math.round(exercise.sets * multiplier));
      const adjustedReps = Math.max(5, Math.round(exercise.reps * multiplier));

      // Add recovery-based notes
      let notes = exercise.notes || '';
      if (recoveryScore.classification === 'poor') {
        notes = `${notes} [Recovery: Poor - Focus on technique, reduce weight]`.trim();
      } else if (recoveryScore.classification === 'fair') {
        notes = `${notes} [Recovery: Fair - Moderate intensity, listen to your body]`.trim();
      } else if (recoveryScore.classification === 'excellent') {
        notes = `${notes} [Recovery: Excellent - Ready for peak performance]`.trim();
      }

      return {
        ...exercise,
        sets: adjustedSets,
        reps: adjustedReps,
        restSeconds: recoveryScore.classification === 'poor'
          ? Math.round(exercise.restSeconds * 1.3) // More rest when recovery is poor
          : recoveryScore.classification === 'excellent'
            ? Math.round(exercise.restSeconds * 0.9) // Less rest when fully recovered
            : exercise.restSeconds,
        notes,
      };
    });
  }

  /**
   * Store prescription for ML feedback
   */
  private async storePrescriptionHistory(userId: string, result: PrescriptionResult): Promise<void> {
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
        result.totalDuration,
        JSON.stringify(result.muscleCoverage),
        result.periodizationPhase || null,
        result.difficulty,
        this.algorithmVersion,
      ]);
    } catch (error) {
      log.warn({ error }, 'Failed to store prescription history');
    }
  }
}

// Export singleton instance
export const prescriptionEngine = new PrescriptionEngine();

// Export types
export type { Exercise, UserInjury, WorkoutHistory, TrainingPhase };
